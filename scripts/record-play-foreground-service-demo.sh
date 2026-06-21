#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

APP_ID="${APP_ID:-com.jeygroups.manas}"
BUILD_MODE="${BUILD_MODE:-release}"
SKIP_BUILD="${SKIP_BUILD:-false}"
RESET_APP="${RESET_APP:-false}"
GRANT_PERMISSIONS="${GRANT_PERMISSIONS:-false}"
DEMO_SECONDS="${DEMO_SECONDS:-120}"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/dist/play-store}"
EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://manas-api-dlj7.onrender.com}"
DEVICE_VIDEO="/sdcard/manas-play-fgs-demo.mp4"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
VIDEO_NAME="${VIDEO_NAME:-manas-foreground-service-demo-$TIMESTAMP.mp4}"
LOGCAT_NAME="manas-play-demo-logcat-$TIMESTAMP.txt"
DEVICE_INFO_NAME="manas-play-demo-device-$TIMESTAMP.txt"
LOGCAT_PID=""
RECORD_PID=""
DEVICE_ID=""
APK_TO_INSTALL=""

export EXPO_PUBLIC_API_URL

usage() {
  cat <<EOF
Usage:
  BUILD_MODE=release DEMO_SECONDS=120 $0
  BUILD_MODE=debug DEMO_SECONDS=120 $0
  APK_PATH=dist/manas-release.apk BUILD_MODE=none DEMO_SECONDS=120 $0

Environment:
  APP_ID                 Android application id. Default: com.jeygroups.manas
  ANDROID_SERIAL         adb serial to use when multiple devices are connected.
  APK_PATH               Existing APK to install. Skips build selection.
  BUILD_MODE             release, debug, or none. Default: release
  SKIP_BUILD             true or false. Default: false
  RESET_APP              true or false. Default: false
  GRANT_PERMISSIONS      true or false. Default: false
  DEMO_SECONDS           screenrecord duration in seconds. Default: 120
  OUTPUT_DIR             output directory. Default: dist/play-store
  VIDEO_NAME             output MP4 filename. Default includes timestamp.
  EXPO_PUBLIC_API_URL    backend URL for builds. Default: production Render API.
EOF
}

error() {
  echo "ERROR: $*" >&2
  exit 1
}

require_command() {
  local command_name="$1"
  local install_hint="$2"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $command_name" >&2
    echo "$install_hint" >&2
    exit 1
  fi
}

validate_bool() {
  local name="$1"
  local value="$2"
  if [[ "$value" != "true" && "$value" != "false" ]]; then
    error "$name must be true or false. Current value: $value"
  fi
}

resolve_path() {
  local path_value="$1"
  if [[ "$path_value" = /* ]]; then
    printf '%s\n' "$path_value"
  else
    printf '%s\n' "$ROOT_DIR/$path_value"
  fi
}

find_android_sdk() {
  local candidates=()
  [[ -n "${ANDROID_SDK_ROOT:-}" ]] && candidates+=("$ANDROID_SDK_ROOT")
  [[ -n "${ANDROID_HOME:-}" ]] && candidates+=("$ANDROID_HOME")
  candidates+=("$HOME/Library/Android/sdk" "$HOME/Android/Sdk")

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -d "$candidate/platform-tools" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

ensure_adb() {
  if command -v adb >/dev/null 2>&1; then
    return 0
  fi

  local android_sdk
  android_sdk="$(find_android_sdk || true)"
  if [[ -n "$android_sdk" ]]; then
    export ANDROID_SDK_ROOT="$android_sdk"
    export ANDROID_HOME="$android_sdk"
    export PATH="$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH"
  fi

  require_command adb "Install Android platform-tools or set ANDROID_SDK_ROOT/ANDROID_HOME to your Android SDK."
}

adb_cmd() {
  adb -s "$DEVICE_ID" "$@"
}

connected_devices() {
  adb devices | awk 'NR > 1 && $2 == "device" { print $1 }'
}

select_device() {
  local devices=()
  local device

  while IFS= read -r device; do
    [[ -n "$device" ]] && devices+=("$device")
  done < <(connected_devices)

  if [[ ${#devices[@]} -eq 0 ]]; then
    cat >&2 <<'EOF'
ERROR: No connected adb device or emulator is in the "device" state.

Start an Android emulator, or connect a physical device with USB debugging enabled,
then verify it appears in:
  adb devices -l
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

    echo "Connected adb devices:" >&2
    adb devices -l >&2
    error "ANDROID_SERIAL is set to $ANDROID_SERIAL, but that device is not connected and ready."
  fi

  if [[ ${#devices[@]} -gt 1 ]]; then
    echo "Multiple adb devices detected; using ${devices[0]}." >&2
    echo "Set ANDROID_SERIAL to choose a specific device." >&2
  fi

  printf '%s\n' "${devices[0]}"
}

build_or_select_apk() {
  local apk_to_install=""

  if [[ -n "${APK_PATH:-}" ]]; then
    apk_to_install="$(resolve_path "$APK_PATH")"
    [[ -f "$apk_to_install" ]] || error "APK_PATH was provided but no APK exists at $apk_to_install"
    APK_TO_INSTALL="$apk_to_install"
    return 0
  fi

  case "$BUILD_MODE" in
    release)
      apk_to_install="$ROOT_DIR/dist/manas-release.apk"
      if [[ "$SKIP_BUILD" == "true" ]]; then
        [[ -f "$apk_to_install" ]] || error "SKIP_BUILD=true but release APK was not found at $apk_to_install"
      else
        ./scripts/build-android_release-apk.sh
      fi
      ;;
    debug)
      apk_to_install="$ROOT_DIR/dist/manas-debug.apk"
      if [[ "$SKIP_BUILD" == "true" ]]; then
        [[ -f "$apk_to_install" ]] || error "SKIP_BUILD=true but debug APK was not found at $apk_to_install"
      else
        ./scripts/build-android-apk.sh
      fi
      ;;
    none)
      error "BUILD_MODE=none requires APK_PATH to be provided."
      ;;
    *)
      error "BUILD_MODE must be release, debug, or none. Current value: $BUILD_MODE"
      ;;
  esac

  [[ -f "$apk_to_install" ]] || error "Expected APK was not found at $apk_to_install"
  APK_TO_INSTALL="$apk_to_install"
}

stop_logcat() {
  if [[ -n "$LOGCAT_PID" ]] && ps -p "$LOGCAT_PID" >/dev/null 2>&1; then
    kill "$LOGCAT_PID" >/dev/null 2>&1 || true
    wait "$LOGCAT_PID" >/dev/null 2>&1 || true
  fi
}

cleanup() {
  stop_logcat
  if [[ -n "$RECORD_PID" ]] && ps -p "$RECORD_PID" >/dev/null 2>&1; then
    kill "$RECORD_PID" >/dev/null 2>&1 || true
    wait "$RECORD_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

grant_permission() {
  local permission="$1"
  if adb_cmd shell pm grant "$APP_ID" "$permission" >/dev/null 2>&1; then
    echo "Granted $permission"
  else
    echo "WARNING: Could not grant $permission. It may be unavailable on this Android version or not requested by the installed build." >&2
  fi
}

capture_device_info() {
  local path="$1"
  {
    echo "Timestamp: $TIMESTAMP"
    echo "App ID: $APP_ID"
    echo "Device serial: $DEVICE_ID"
    echo "Build mode: $BUILD_MODE"
    echo "APK: $APK_TO_INSTALL"
    echo "API URL: $EXPO_PUBLIC_API_URL"
    echo
    echo "adb devices -l:"
    adb devices -l || true
    echo
    echo "Device properties:"
    adb_cmd shell getprop ro.product.manufacturer || true
    adb_cmd shell getprop ro.product.model || true
    adb_cmd shell getprop ro.build.version.release || true
    adb_cmd shell getprop ro.build.version.sdk || true
    echo
    echo "Display:"
    adb_cmd shell wm size || true
    adb_cmd shell wm density || true
    echo
    echo "Installed package:"
    adb_cmd shell pm path "$APP_ID" || true
    adb_cmd shell dumpsys package "$APP_ID" | sed -n '1,140p' || true
  } > "$path"
}

append_focus_snapshot() {
  local path="$1"
  {
    echo
    echo "Window focus after recording:"
    adb_cmd shell dumpsys window | grep -E "mCurrentFocus|topResumedActivity|mFocusedApp" || true
  } >> "$path"
}

launch_app() {
  local start_output=""

  echo "Launching $APP_ID."
  adb_cmd shell am force-stop "$APP_ID" >/dev/null 2>&1 || true

  if start_output="$(adb_cmd shell am start -W \
    -n "$APP_ID/.MainActivity" \
    -a android.intent.action.MAIN \
    -c android.intent.category.LAUNCHER 2>&1)"; then
    printf '%s\n' "$start_output"
    return 0
  fi

  echo "Direct MainActivity launch failed; falling back to monkey launcher." >&2
  printf '%s\n' "$start_output" >&2
  adb_cmd shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1
}

compress_video_if_possible() {
  local input_path="$1"
  local output_path="${input_path%.mp4}-compressed.mp4"

  if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "ffmpeg not found; skipping compressed copy."
    return 0
  fi

  echo "Creating compressed web-compatible MP4:"
  echo "$output_path"
  if ffmpeg -y -i "$input_path" \
    -map 0:v:0 -map 0:a? \
    -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p \
    -c:a aac -b:a 128k \
    -movflags +faststart \
    "$output_path"; then
    echo "Compressed MP4: $output_path"
  else
    echo "WARNING: ffmpeg compression failed; keeping original MP4 only." >&2
    rm -f "$output_path"
  fi
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

validate_bool "SKIP_BUILD" "$SKIP_BUILD"
validate_bool "RESET_APP" "$RESET_APP"
validate_bool "GRANT_PERMISSIONS" "$GRANT_PERMISSIONS"

if [[ ! "$DEMO_SECONDS" =~ ^[0-9]+$ || "$DEMO_SECONDS" -lt 1 ]]; then
  error "DEMO_SECONDS must be a positive integer. Current value: $DEMO_SECONDS"
fi

if [[ "$VIDEO_NAME" != *.mp4 ]]; then
  VIDEO_NAME="$VIDEO_NAME.mp4"
fi

OUTPUT_DIR="$(resolve_path "$OUTPUT_DIR")"
OUTPUT_VIDEO="$OUTPUT_DIR/$VIDEO_NAME"
LOGCAT_PATH="$OUTPUT_DIR/$LOGCAT_NAME"
DEVICE_INFO_PATH="$OUTPUT_DIR/$DEVICE_INFO_NAME"

cat <<'BANNER'
=====================================================
 MANAS Google Play foreground service demo recording
=====================================================
BANNER

[[ -d "$ROOT_DIR/mobile" ]] || error "mobile/ directory not found. This script must be run from the MANAS repo."
[[ -x "$ROOT_DIR/scripts/build-android_release-apk.sh" ]] || error "Missing executable scripts/build-android_release-apk.sh"
[[ -x "$ROOT_DIR/scripts/build-android-apk.sh" ]] || error "Missing executable scripts/build-android-apk.sh"

ensure_adb

echo "Connected adb devices:"
adb devices -l
echo

DEVICE_ID="$(select_device)"
mkdir -p "$OUTPUT_DIR"

echo "Repo: $ROOT_DIR"
echo "Device: $DEVICE_ID"
echo "App ID: $APP_ID"
echo "Build mode: $BUILD_MODE"
echo "API URL: $EXPO_PUBLIC_API_URL"
echo "Output video: $OUTPUT_VIDEO"
echo "Logcat: $LOGCAT_PATH"
echo "Device info: $DEVICE_INFO_PATH"
echo

build_or_select_apk

echo
echo "Installing APK:"
echo "$APK_TO_INSTALL"
adb_cmd install -r "$APK_TO_INSTALL"

if [[ "$RESET_APP" == "true" ]]; then
  echo "RESET_APP=true; clearing $APP_ID app data."
  adb_cmd shell pm clear "$APP_ID"
else
  echo "RESET_APP=false; preserving app data."
fi

if [[ "$GRANT_PERMISSIONS" == "true" ]]; then
  echo "GRANT_PERMISSIONS=true; granting runtime permissions before recording."
  grant_permission android.permission.CAMERA
  grant_permission android.permission.RECORD_AUDIO
  grant_permission android.permission.POST_NOTIFICATIONS
else
  echo "GRANT_PERMISSIONS=false; permissions will use the normal in-app Android prompts."
fi

capture_device_info "$DEVICE_INFO_PATH"

echo "Clearing old device recording and logcat."
adb_cmd shell rm -f "$DEVICE_VIDEO" >/dev/null 2>&1 || true
adb_cmd logcat -c || true

echo "Starting screenrecord for ${DEMO_SECONDS}s on device."
adb_cmd shell screenrecord --time-limit "$DEMO_SECONDS" "$DEVICE_VIDEO" &
RECORD_PID="$!"
sleep 1

echo "Starting logcat capture."
adb_cmd logcat -v time > "$LOGCAT_PATH" &
LOGCAT_PID="$!"

launch_app

cat <<EOF

Recording is running. Complete this flow on the Android device:

STEP 1: Sign in with the Google Play reviewer test account.
STEP 2: Open the dashboard/session area.
STEP 3: Open or join an audio/video session.
STEP 4: Allow camera and microphone permissions if prompted.
STEP 5: Keep the active audio/video session visible for a few seconds.
STEP 6: Leave/end the session.
STEP 7: Wait for recording to finish.

The script will wait for screenrecord to finish, then pull the MP4 locally.
EOF

wait "$RECORD_PID"
RECORD_PID=""
stop_logcat
append_focus_snapshot "$DEVICE_INFO_PATH"

echo
echo "Pulling recording from device."
adb_cmd pull "$DEVICE_VIDEO" "$OUTPUT_VIDEO"
adb_cmd shell rm -f "$DEVICE_VIDEO" >/dev/null 2>&1 || true

compress_video_if_possible "$OUTPUT_VIDEO"

cat <<EOF

=====================================================
 Recording complete
=====================================================
MP4:
$OUTPUT_VIDEO

Logcat:
$LOGCAT_PATH

Device info:
$DEVICE_INFO_PATH

Upload the MP4 to YouTube as Unlisted or to Google Drive with anyone-with-link
access, then paste the shareable URL into Google Play Console.
EOF
