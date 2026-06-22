#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

START_EMULATOR="${START_EMULATOR:-true}"
EMULATOR_BOOT_TIMEOUT_SECONDS="${EMULATOR_BOOT_TIMEOUT_SECONDS:-180}"
ADB_SERVER_PORT="${ADB_SERVER_PORT:-5037}"

export ADB_SERVER_PORT
export ADB_MDNS_AUTO_CONNECT=0
export ADB_MDNS_OPENSCREEN=0

error() {
  echo "ERROR: $*" >&2
  exit 1
}

validate_bool() {
  local name="$1"
  local value="$2"
  if [[ "$value" != "true" && "$value" != "false" ]]; then
    error "$name must be true or false. Current value: $value"
  fi
}

run_with_timeout() {
  local seconds="$1"
  shift
  local command_pid timer_pid status

  "$@" &
  command_pid="$!"

  (
    sleep "$seconds"
    if kill -0 "$command_pid" >/dev/null 2>&1; then
      kill "$command_pid" >/dev/null 2>&1 || true
    fi
  ) &
  timer_pid="$!"

  set +e
  wait "$command_pid"
  status="$?"
  set -e

  kill "$timer_pid" >/dev/null 2>&1 || true
  wait "$timer_pid" >/dev/null 2>&1 || true

  if [[ "$status" -eq 130 || "$status" -eq 137 || "$status" -eq 143 ]]; then
    return 124
  fi

  return "$status"
}

find_android_sdk() {
  local candidates=()
  [[ -n "${ANDROID_SDK_ROOT:-}" ]] && candidates+=("$ANDROID_SDK_ROOT")
  [[ -n "${ANDROID_HOME:-}" ]] && candidates+=("$ANDROID_HOME")
  candidates+=("$HOME/Library/Android/sdk" "$HOME/Android/Sdk")

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate/platform-tools/adb" || -x "$candidate/emulator/emulator" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

ensure_android_tools() {
  local sdk_dir
  sdk_dir="$(find_android_sdk || true)"
  if [[ -n "$sdk_dir" ]]; then
    export ANDROID_SDK_ROOT="$sdk_dir"
    export ANDROID_HOME="$sdk_dir"
    export PATH="$sdk_dir/platform-tools:$sdk_dir/emulator:$PATH"
  fi

  command -v adb >/dev/null 2>&1 || error "adb was not found. Install Android platform-tools or set ANDROID_SDK_ROOT/ANDROID_HOME."
  command -v emulator >/dev/null 2>&1 || error "Android emulator binary was not found. Install Android Studio emulator tools."
}

adb_cmd() {
  if [[ -n "${ANDROID_SERIAL:-}" ]]; then
    adb -s "$ANDROID_SERIAL" "$@"
  else
    adb "$@"
  fi
}

first_ready_device() {
  local devices_output serial state rest
  local tmp_file
  tmp_file="$(mktemp "${TMPDIR:-/tmp}/manas-adb-devices.XXXXXX")"

  if ! run_with_timeout 20 adb devices > "$tmp_file" 2>&1; then
    cat "$tmp_file" >&2 || true
    rm -f "$tmp_file"
    return 1
  fi

  while read -r serial state rest; do
    [[ -n "${serial:-}" ]] || continue
    [[ "$serial" == "List" ]] && continue
    [[ "$state" == "device" ]] || continue

    if [[ -n "${ANDROID_SERIAL:-}" && "$serial" != "$ANDROID_SERIAL" ]]; then
      continue
    fi

    printf '%s\n' "$serial"
    rm -f "$tmp_file"
    return 0
  done < "$tmp_file"

  rm -f "$tmp_file"
  return 1
}

warn_if_hidden_emulator() {
  local serial="$1"

  [[ "$serial" == emulator-* ]] || return 0
  if ps ax -o args= | grep -E 'qemu-system|emulator' | grep -E -- '-no-window|-qt-hide-window' >/dev/null 2>&1; then
    cat >&2 <<'EOF'
WARNING: An existing emulator appears to be running in a hidden/headless mode.
For the Play demo recording, use a visible emulator window so you can manually
sign in and join the session. Close the hidden emulator and rerun this script,
or start a visible AVD from Android Studio Device Manager.
EOF
  fi
}

wait_for_boot() {
  local deadline booted serial
  deadline=$((SECONDS + EMULATOR_BOOT_TIMEOUT_SECONDS))

  echo "Waiting for emulator/device boot completion, timeout ${EMULATOR_BOOT_TIMEOUT_SECONDS}s."
  if ! run_with_timeout "$EMULATOR_BOOT_TIMEOUT_SECONDS" adb_cmd wait-for-device; then
    error "Timed out waiting for adb device."
  fi

  while [[ "$SECONDS" -lt "$deadline" ]]; do
    serial="$(first_ready_device || true)"
    if [[ -n "$serial" ]]; then
      booted="$(adb_cmd shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
      if [[ "$booted" == "1" ]]; then
        echo "Android device is booted: $serial"
        return 0
      fi
    fi
    sleep 2
  done

  error "Timed out after ${EMULATOR_BOOT_TIMEOUT_SECONDS}s waiting for Android boot completion."
}

choose_avd() {
  local avd line

  if [[ -n "${AVD_NAME:-}" ]]; then
    printf '%s\n' "$AVD_NAME"
    return 0
  fi

  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    avd="$line"
    break
  done < <(emulator -list-avds)

  [[ -n "${avd:-}" ]] || return 1
  printf '%s\n' "$avd"
}

validate_bool "START_EMULATOR" "$START_EMULATOR"
[[ "$EMULATOR_BOOT_TIMEOUT_SECONDS" =~ ^[0-9]+$ && "$EMULATOR_BOOT_TIMEOUT_SECONDS" -gt 0 ]] || error "EMULATOR_BOOT_TIMEOUT_SECONDS must be a positive integer."

"$SCRIPT_DIR/android-adb-doctor.sh"
ensure_android_tools

existing_device="$(first_ready_device || true)"
if [[ -n "$existing_device" ]]; then
  echo "Using existing adb device: $existing_device"
  warn_if_hidden_emulator "$existing_device"
  exit 0
fi

if [[ "$START_EMULATOR" != "true" ]]; then
  cat >&2 <<'EOF'
ERROR: No adb device is in the "device" state and START_EMULATOR=false.

Start an emulator from Android Studio Device Manager, or connect a physical
device with USB debugging enabled, then rerun the script.
EOF
  exit 2
fi

selected_avd="$(choose_avd || true)"
if [[ -z "$selected_avd" ]]; then
  cat >&2 <<'EOF'
ERROR: No Android Virtual Devices were found.

Create one in Android Studio:
  Android Studio -> Tools -> Device Manager -> Create device

Then start it from Device Manager, or rerun with:
  START_EMULATOR=true AVD_NAME="YOUR_AVD_NAME" ./scripts/start-android-emulator-if-needed.sh
EOF
  exit 2
fi

echo "Starting visible Android emulator: $selected_avd"
echo "Use AVD_NAME to choose a different emulator."
EMULATOR_LOG="${TMPDIR:-/tmp}/manas-emulator-$selected_avd.log"
emulator -avd "$selected_avd" > "$EMULATOR_LOG" 2>&1 &
echo "Emulator process pid: $!"
echo "Emulator log: $EMULATOR_LOG"

wait_for_boot

ready_device="$(first_ready_device || true)"
[[ -n "$ready_device" ]] || error "Emulator booted but no adb device is ready."
warn_if_hidden_emulator "$ready_device"
echo "Ready adb device: $ready_device"
