#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="MANAS"
APP_ID="com.jeygroups.manas"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/mobile"
DIST_DIR="$ROOT_DIR/dist"
APK_PATH="${APK_PATH:-$DIST_DIR/manas-debug.apk}"
LOG_PATH="${LOG_PATH:-$DIST_DIR/android-launch-logcat.txt}"
FILTERED_LOG_PATH="${FILTERED_LOG_PATH:-$DIST_DIR/android-launch-logcat-filtered.txt}"
METRO_LOG_PATH="${METRO_LOG_PATH:-$DIST_DIR/android-launch-metro.txt}"
FOCUS_PATH="${FOCUS_PATH:-$DIST_DIR/android-launch-focus.txt}"
METRO_PORT="${METRO_PORT:-8081}"
API_PORT="${API_PORT:-4000}"
EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-http://localhost:$API_PORT}"
export EXPO_PUBLIC_API_URL
LAUNCH_WAIT_SECONDS="${LAUNCH_WAIT_SECONDS:-20}"
START_METRO="${START_METRO:-true}"
SKIP_BUILD="${SKIP_BUILD:-false}"
KEEP_METRO="${KEEP_METRO:-false}"

FILTER_REGEX="AndroidRuntime|FATAL EXCEPTION|ReactNativeJS|Invariant Violation|main has not been registered|Reanimated|SplashScreen|expo|MANAS|com\\.jeygroups\\.manas"
CRASH_REGEX="FATAL EXCEPTION|Invariant Violation|main has not been registered|has not been registered|com\\.facebook\\.react\\.common\\.JavascriptException|ReactNativeJS.*(TypeError|ReferenceError|SyntaxError|RangeError|Error:)|Unable to load script|Could not connect to development server"

METRO_PID=""

cleanup() {
  if [[ "$KEEP_METRO" == "true" ]]; then
    return 0
  fi

  if [[ -n "$METRO_PID" ]] && ps -p "$METRO_PID" >/dev/null 2>&1; then
    kill "$METRO_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

require_command() {
  local command_name="$1"
  local install_hint="$2"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $command_name" >&2
    echo "$install_hint" >&2
    exit 1
  fi
}

adb_devices() {
  adb devices | awk 'NR > 1 && $2 == "device" { print $1 }'
}

select_device() {
  local devices=()
  local device
  while IFS= read -r device; do
    [[ -n "$device" ]] && devices+=("$device")
  done < <(adb_devices)

  if [[ ${#devices[@]} -eq 0 ]]; then
    cat >&2 <<'EOF'
ERROR: No adb device or emulator is connected.

Connect an Android device with USB debugging enabled, or start an emulator, then rerun this script.
EOF
    exit 2
  fi

  if [[ -n "${ANDROID_SERIAL:-}" ]]; then
    for device in "${devices[@]}"; do
      if [[ "$device" == "$ANDROID_SERIAL" ]]; then
        printf '%s\n' "$ANDROID_SERIAL"
        return 0
      fi
    done

    echo "ERROR: ANDROID_SERIAL is set to $ANDROID_SERIAL, but that device is not connected." >&2
    echo "Connected devices: ${devices[*]}" >&2
    exit 2
  fi

  if [[ ${#devices[@]} -gt 1 ]]; then
    echo "Multiple adb devices detected; using ${devices[0]}." >&2
    echo "Set ANDROID_SERIAL to choose a specific device." >&2
  fi

  printf '%s\n' "${devices[0]}"
}

adb_cmd() {
  adb -s "$DEVICE_ID" "$@"
}

metro_is_running() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "http://127.0.0.1:$METRO_PORT/status" 2>/dev/null | grep -q "packager-status:running"
    return $?
  fi

  node - "$METRO_PORT" <<'NODE'
const port = process.argv[2];
fetch(`http://127.0.0.1:${port}/status`)
  .then((response) => response.text())
  .then((text) => process.exit(text.includes('packager-status:running') ? 0 : 1))
  .catch(() => process.exit(1));
NODE
}

wait_for_metro() {
  local deadline=$((SECONDS + 60))

  until metro_is_running; do
    if [[ "$SECONDS" -ge "$deadline" ]]; then
      echo "ERROR: Metro did not become ready on port $METRO_PORT within 60 seconds." >&2
      echo "Metro log: $METRO_LOG_PATH" >&2
      exit 1
    fi
    sleep 2
  done
}

start_metro_if_needed() {
  if [[ "$START_METRO" != "true" ]]; then
    echo "START_METRO=$START_METRO; not starting Metro."
    return 0
  fi

  if metro_is_running; then
    echo "Using existing Metro server on port $METRO_PORT."
  else
    echo "Starting Expo Metro on port $METRO_PORT."
    : > "$METRO_LOG_PATH"
    if [[ "$KEEP_METRO" == "true" ]]; then
      (
        cd "$MOBILE_DIR"
        nohup npx expo start --port "$METRO_PORT" > "$METRO_LOG_PATH" 2>&1 < /dev/null &
        echo "$!" > "$DIST_DIR/android-launch-metro.pid"
      )
      METRO_PID="$(cat "$DIST_DIR/android-launch-metro.pid")"
    else
      (
        cd "$MOBILE_DIR"
        CI=1 npx expo start --port "$METRO_PORT"
      ) > "$METRO_LOG_PATH" 2>&1 &
      METRO_PID="$!"
    fi
    wait_for_metro
  fi

  if adb_cmd reverse "tcp:$METRO_PORT" "tcp:$METRO_PORT" >/dev/null 2>&1; then
    echo "Configured adb reverse tcp:$METRO_PORT -> tcp:$METRO_PORT."
  else
    echo "WARNING: adb reverse failed. Physical devices may not reach Metro unless networking is configured manually."
  fi

  if adb_cmd reverse "tcp:$API_PORT" "tcp:$API_PORT" >/dev/null 2>&1; then
    echo "Configured adb reverse tcp:$API_PORT -> tcp:$API_PORT."
  else
    echo "WARNING: adb reverse for backend port $API_PORT failed. Physical devices may not reach the local API unless networking is configured manually."
  fi
}

cat <<'BANNER'
========================================
 MANAS Android Debug APK Launch Test
========================================
BANNER

mkdir -p "$DIST_DIR"

require_command adb "Install Android platform-tools and ensure adb is on PATH."
require_command node "Install Node.js."
require_command npm "Install npm with Node.js."
require_command npx "Install npm/npx with Node.js."

if [[ "$SKIP_BUILD" != "true" ]]; then
  "$SCRIPT_DIR/build-android-apk.sh"
elif [[ ! -f "$APK_PATH" ]]; then
  echo "ERROR: SKIP_BUILD=true but APK was not found at $APK_PATH" >&2
  exit 1
fi

DEVICE_ID="$(select_device)"

echo
echo "Device: $DEVICE_ID"
echo "APK: $APK_PATH"
echo "Package: $APP_ID"
echo "API URL: $EXPO_PUBLIC_API_URL"
echo "Logcat: $LOG_PATH"
echo

start_metro_if_needed

echo "Installing debug APK."
adb_cmd install -r "$APK_PATH"

echo "Clearing logcat."
adb_cmd logcat -c || true

echo "Launching $APP_ID."
adb_cmd shell am force-stop "$APP_ID" || true
if ! adb_cmd shell am start -W \
  -n "$APP_ID/.MainActivity" \
  -a android.intent.action.MAIN \
  -c android.intent.category.LAUNCHER; then
  echo "ERROR: Failed to start $APP_ID/.MainActivity" >&2
  exit 1
fi

echo "Waiting ${LAUNCH_WAIT_SECONDS}s for startup logs."
sleep "$LAUNCH_WAIT_SECONDS"

adb_cmd shell dumpsys window | grep -E "mCurrentFocus|topResumedActivity|mFocusedApp" > "$FOCUS_PATH" || true
adb_cmd logcat -d -v time > "$LOG_PATH" || true
grep -iE "$FILTER_REGEX" "$LOG_PATH" > "$FILTERED_LOG_PATH" || true

rm -f "$DIST_DIR/android-launch-fatal.txt"
if ! grep -Fq "$APP_ID" "$FOCUS_PATH"; then
  cat <<EOF >&2
ERROR: $APP_ID is not the focused Android app after launch.

Focus snapshot:
$(cat "$FOCUS_PATH")
EOF
  exit 1
fi

if grep -iE "$CRASH_REGEX" "$LOG_PATH" > "$DIST_DIR/android-launch-fatal.txt"; then
  cat <<EOF >&2
ERROR: Fatal Android/React Native startup log found.

Fatal log excerpt:
$(tail -n 80 "$DIST_DIR/android-launch-fatal.txt")

Full log:
$LOG_PATH

Filtered log:
$FILTERED_LOG_PATH
EOF
  exit 1
fi
rm -f "$DIST_DIR/android-launch-fatal.txt"

cat <<EOF

========================================
 MANAS Android launch passed
========================================
Installed and launched:
$APP_ID

Full log:
$LOG_PATH

Filtered log:
$FILTERED_LOG_PATH
EOF
