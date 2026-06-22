#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

START_EMULATOR="${START_EMULATOR:-true}"
RESTART_HEADLESS_EMULATOR="${RESTART_HEADLESS_EMULATOR:-true}"
ALLOW_HEADLESS_EMULATOR="${ALLOW_HEADLESS_EMULATOR:-false}"
FORCE_VISIBLE_EMULATOR="${FORCE_VISIBLE_EMULATOR:-true}"
INTERACTIVE_CONFIRM="${INTERACTIVE_CONFIRM:-false}"
EMULATOR_BOOT_TIMEOUT_SECONDS="${EMULATOR_BOOT_TIMEOUT_SECONDS:-240}"
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

adb_for_serial() {
  local serial="$1"
  shift
  adb -s "$serial" "$@"
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

device_connected() {
  local wanted="$1"
  adb devices | awk -v wanted="$wanted" 'NR > 1 && $1 == wanted && $2 == "device" { found = 1 } END { exit found ? 0 : 1 }'
}

avd_name_for_serial() {
  local serial="$1"
  local line

  while IFS= read -r line; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" == "OK" ]] && continue
    printf '%s\n' "$line"
    return 0
  done < <(adb_for_serial "$serial" emu avd name 2>/dev/null || true)

  return 1
}

hard_headless_flag_regex='(^|[[:space:]])(-no-window|-headless|-display[[:space:]]+none|-display=none)([[:space:]]|$)'
qt_hide_flag_regex='(^|[[:space:]])-qt-hide-window([[:space:]]|$)'

matching_emulator_pids() {
  local serial="$1"
  local avd_name="${2:-}"
  local port="${serial#emulator-}"

  ps ax -o pid= -o args= | while read -r pid args; do
    [[ -n "${pid:-}" && -n "${args:-}" ]] || continue
    [[ "$args" == *qemu-system* || "$args" == *"/emulator"* || "$args" == emulator* ]] || continue

    if [[ -n "$avd_name" && "$args" == *"$avd_name"* ]]; then
      printf '%s\n' "$pid"
      continue
    fi

    if [[ "$serial" == emulator-* && "$args" == *"$port"* ]]; then
      printf '%s\n' "$pid"
    fi
  done | sort -u
}

scan_emulator_processes_for_regex() {
  local regex="$1"
  local serial="${2:-}"
  local avd_name="${3:-}"
  local pids=()
  local pid args

  if [[ -n "$serial" ]]; then
    while IFS= read -r pid; do
      [[ -n "$pid" ]] && pids+=("$pid")
    done < <(matching_emulator_pids "$serial" "$avd_name")
  fi

  if [[ ${#pids[@]} -gt 0 ]]; then
    for pid in "${pids[@]}"; do
      args="$(ps -p "$pid" -o args= 2>/dev/null || true)"
      if [[ "$args" =~ $regex ]]; then
        return 0
      fi
    done
    return 1
  fi

  while read -r pid args; do
    [[ -n "${pid:-}" && -n "${args:-}" ]] || continue
    [[ "$args" == *qemu-system* || "$args" == *"/emulator"* || "$args" == emulator* ]] || continue
    if [[ "$args" =~ $regex ]]; then
      return 0
    fi
  done < <(ps ax -o pid= -o args=)

  return 1
}

has_hard_headless_flags_for_serial() {
  local serial="$1"
  local avd_name="${2:-}"
  scan_emulator_processes_for_regex "$hard_headless_flag_regex" "$serial" "$avd_name"
}

has_qt_hide_flag_for_serial() {
  local serial="$1"
  local avd_name="${2:-}"
  scan_emulator_processes_for_regex "$qt_hide_flag_regex" "$serial" "$avd_name"
}

macos_emulator_visible() {
  [[ "$(uname -s)" == "Darwin" ]] || return 1
  command -v osascript >/dev/null 2>&1 || return 1

  osascript <<'OSA' >/dev/null 2>&1
tell application "System Events"
  repeat with processName in {"Emulator", "Android Emulator", "qemu-system-x86_64", "qemu-system-aarch64"}
    if exists process processName then
      repeat with p in (every process whose name is processName)
        if visible of p is true then return "visible"
      end repeat
    end if
  end repeat
end tell
error "No visible Android emulator process"
OSA
}

emulator_visibility_status() {
  local serial="$1"
  local avd_name="${2:-}"

  [[ "$serial" == emulator-* ]] || {
    printf '%s\n' "visible"
    return 0
  }

  if has_hard_headless_flags_for_serial "$serial" "$avd_name"; then
    printf '%s\n' "headless"
    return 0
  fi

  if macos_emulator_visible; then
    printf '%s\n' "visible"
    return 0
  fi

  if has_qt_hide_flag_for_serial "$serial" "$avd_name"; then
    printf '%s\n' "uncertain"
    return 0
  fi

  printf '%s\n' "uncertain"
}

wait_until_disconnected() {
  local serial="$1"
  local deadline=$((SECONDS + 45))

  while [[ "$SECONDS" -lt "$deadline" ]]; do
    if ! device_connected "$serial"; then
      echo "Emulator $serial is no longer connected."
      return 0
    fi
    sleep 2
  done

  return 1
}

kill_matching_emulator_processes() {
  local serial="$1"
  local avd_name="${2:-}"
  local pid args

  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    args="$(ps -p "$pid" -o args= 2>/dev/null || true)"
    [[ -n "$args" ]] || continue
    echo "Killing matching emulator process $pid: $args"
    kill "$pid" >/dev/null 2>&1 || true
    sleep 1
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "Emulator process $pid did not exit after TERM; sending KILL."
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
  done < <(matching_emulator_pids "$serial" "$avd_name")
}

stop_emulator() {
  local serial="$1"
  local avd_name="${2:-}"

  echo "Stopping hidden/headless emulator: $serial"
  if adb_for_serial "$serial" emu kill >/dev/null 2>&1; then
    echo "Sent adb emu kill to $serial."
  else
    echo "adb emu kill failed for $serial; trying matching emulator/qemu process fallback." >&2
  fi

  if wait_until_disconnected "$serial"; then
    return 0
  fi

  kill_matching_emulator_processes "$serial" "$avd_name"
  if wait_until_disconnected "$serial"; then
    return 0
  fi

  error "Could not stop emulator $serial. Close it manually, then rerun this script."
}

wait_for_boot() {
  local serial="$1"
  local deadline booted
  deadline=$((SECONDS + EMULATOR_BOOT_TIMEOUT_SECONDS))

  echo "Waiting for Android boot completion on $serial, timeout ${EMULATOR_BOOT_TIMEOUT_SECONDS}s."
  if ! run_with_timeout "$EMULATOR_BOOT_TIMEOUT_SECONDS" adb_for_serial "$serial" wait-for-device; then
    error "Timed out waiting for adb device $serial."
  fi

  while [[ "$SECONDS" -lt "$deadline" ]]; do
    booted="$(adb_for_serial "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
    if [[ "$booted" == "1" ]]; then
      echo "Android device is booted: $serial"
      return 0
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

start_visible_emulator() {
  local selected_avd ready_device deadline

  if [[ "$START_EMULATOR" != "true" ]]; then
    cat >&2 <<'EOF'
ERROR: No usable visible adb device is ready and START_EMULATOR=false.

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
  echo "No headless flags will be passed. Use AVD_NAME to choose a different emulator."
  EMULATOR_LOG="${TMPDIR:-/tmp}/manas-emulator-$selected_avd.log"
  emulator -avd "$selected_avd" > "$EMULATOR_LOG" 2>&1 &
  echo "Emulator process pid: $!"
  echo "Emulator log: $EMULATOR_LOG"

  deadline=$((SECONDS + EMULATOR_BOOT_TIMEOUT_SECONDS))
  ready_device=""
  while [[ "$SECONDS" -lt "$deadline" ]]; do
    ready_device="$(first_ready_device || true)"
    if [[ -n "$ready_device" ]]; then
      break
    fi
    sleep 2
  done

  [[ -n "$ready_device" ]] || error "Timed out waiting for a visible emulator adb device."
  wait_for_boot "$ready_device"
  echo "Selected emulator serial: $ready_device"
  echo "Ready adb device: $ready_device"
}

handle_existing_device() {
  local serial="$1"
  local avd_name status answer

  [[ "$serial" == emulator-* ]] || {
    echo "Using existing physical adb device: $serial"
    return 0
  }

  avd_name="$(avd_name_for_serial "$serial" || true)"
  status="$(emulator_visibility_status "$serial" "$avd_name")"

  case "$status" in
    visible)
      echo "Using existing visible emulator: $serial"
      [[ -n "$avd_name" ]] && echo "AVD: $avd_name"
      return 0
      ;;
    headless)
      echo "Existing emulator $serial appears hidden/headless."
      if [[ "$ALLOW_HEADLESS_EMULATOR" == "true" ]]; then
        echo "ALLOW_HEADLESS_EMULATOR=true; continuing with headless emulator."
        return 0
      fi
      if [[ "$RESTART_HEADLESS_EMULATOR" == "true" ]]; then
        stop_emulator "$serial" "$avd_name"
        start_visible_emulator
        return 0
      fi
      cat >&2 <<EOF
ERROR: Existing emulator $serial is hidden/headless.

Set RESTART_HEADLESS_EMULATOR=true FORCE_VISIBLE_EMULATOR=true to restart it
automatically, or close it and start a visible AVD from Android Studio.
EOF
      exit 2
      ;;
    uncertain)
      echo "Unable to confirm emulator visibility for $serial."
      if [[ "$ALLOW_HEADLESS_EMULATOR" == "true" ]]; then
        echo "ALLOW_HEADLESS_EMULATOR=true; continuing despite uncertain visibility."
        return 0
      fi
      if [[ "$INTERACTIVE_CONFIRM" == "true" && -t 0 ]]; then
        printf 'Continue with %s? Type yes to continue, anything else to restart visible: ' "$serial"
        IFS= read -r answer
        if [[ "$answer" == "yes" ]]; then
          return 0
        fi
      fi
      if [[ "$FORCE_VISIBLE_EMULATOR" == "true" ]]; then
        echo "FORCE_VISIBLE_EMULATOR=true; restarting as a visible emulator."
        if [[ "$RESTART_HEADLESS_EMULATOR" == "true" ]]; then
          stop_emulator "$serial" "$avd_name"
        fi
        start_visible_emulator
        return 0
      fi
      cat >&2 <<EOF
ERROR: Unable to confirm emulator visibility for $serial.

Set FORCE_VISIBLE_EMULATOR=true to restart a visible emulator, or set
INTERACTIVE_CONFIRM=true to choose manually.
EOF
      exit 2
      ;;
    *)
      error "Unexpected emulator visibility status: $status"
      ;;
  esac
}

validate_bool "START_EMULATOR" "$START_EMULATOR"
validate_bool "RESTART_HEADLESS_EMULATOR" "$RESTART_HEADLESS_EMULATOR"
validate_bool "ALLOW_HEADLESS_EMULATOR" "$ALLOW_HEADLESS_EMULATOR"
validate_bool "FORCE_VISIBLE_EMULATOR" "$FORCE_VISIBLE_EMULATOR"
validate_bool "INTERACTIVE_CONFIRM" "$INTERACTIVE_CONFIRM"
[[ "$EMULATOR_BOOT_TIMEOUT_SECONDS" =~ ^[0-9]+$ && "$EMULATOR_BOOT_TIMEOUT_SECONDS" -gt 0 ]] || error "EMULATOR_BOOT_TIMEOUT_SECONDS must be a positive integer."

"$SCRIPT_DIR/android-adb-doctor.sh"
ensure_android_tools

existing_device="$(first_ready_device || true)"
if [[ -n "$existing_device" ]]; then
  handle_existing_device "$existing_device"
  exit 0
fi

start_visible_emulator
