#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

PERMISSION_DEMO="${PERMISSION_DEMO:-}"
DEMO_SECONDS="${DEMO_SECONDS:-120}"
APP_ID="${APP_ID:-com.jeygroups.manas}"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/dist/play-store}"
RESET_APP="${RESET_APP:-false}"
START_EMULATOR="${START_EMULATOR:-true}"
ALLOW_HEADLESS_EMULATOR="${ALLOW_HEADLESS_EMULATOR:-false}"
FGS_SKIP_PREP="${FGS_SKIP_PREP:-false}"
EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://manas-api-dlj7.onrender.com}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

export EXPO_PUBLIC_API_URL

LOGCAT_PID=""
RECORD_PID=""
DEVICE_ID=""
DEMO_SLUG=""
DEMO_LABEL=""
PLAY_FIELD=""
DESCRIPTION=""
VIDEO_NAME=""
DEVICE_VIDEO=""
OUTPUT_VIDEO=""
LOGCAT_PATH=""
DEVICE_INFO_PATH=""

usage() {
  cat <<'EOF'
Usage:
  PERMISSION_DEMO=camera ./scripts/record-play-fgs-permission-video.sh
  PERMISSION_DEMO=media-playback ./scripts/record-play-fgs-permission-video.sh
  PERMISSION_DEMO=microphone ./scripts/record-play-fgs-permission-video.sh

Environment:
  PERMISSION_DEMO            camera, media-playback, or microphone. Required.
  DEMO_SECONDS               Max recording duration. Default: 120
  APP_ID                     Android package. Default: com.jeygroups.manas
  OUTPUT_DIR                 Output directory. Default: dist/play-store
  RESET_APP                  true or false. Default: false
  START_EMULATOR             true or false. Default: true
  AVD_NAME                   Optional Android Virtual Device name.
  ANDROID_SERIAL             Optional adb device serial.
  ALLOW_HEADLESS_EMULATOR    true or false. Default: false
  EXPO_PUBLIC_API_URL        Backend URL. Default: production Render API.
EOF
}

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
    if [[ -x "$candidate/platform-tools/adb" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

ensure_adb_path() {
  if command -v adb >/dev/null 2>&1; then
    return 0
  fi

  local android_sdk
  android_sdk="$(find_android_sdk || true)"
  if [[ -n "$android_sdk" ]]; then
    export ANDROID_SDK_ROOT="$android_sdk"
    export ANDROID_HOME="$android_sdk"
    export PATH="$android_sdk/platform-tools:$android_sdk/emulator:$PATH"
  fi

  command -v adb >/dev/null 2>&1 || error "adb was not found. Install Android platform-tools or set ANDROID_SDK_ROOT/ANDROID_HOME."
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
    error "No adb device or emulator is connected in the device state."
  fi

  if [[ -n "${ANDROID_SERIAL:-}" ]]; then
    for device in "${devices[@]}"; do
      if [[ "$device" == "$ANDROID_SERIAL" ]]; then
        printf '%s\n' "$ANDROID_SERIAL"
        return 0
      fi
    done
    error "ANDROID_SERIAL is set to $ANDROID_SERIAL, but that device is not connected."
  fi

  if [[ ${#devices[@]} -gt 1 ]]; then
    echo "Multiple adb devices detected; using ${devices[0]}." >&2
    echo "Set ANDROID_SERIAL to choose a specific device." >&2
  fi

  printf '%s\n' "${devices[0]}"
}

headless_emulator_detected() {
  ps ax -o args= | awk '
    /qemu-system|\/emulator/ && /-no-window|-qt-hide-window/ { found = 1 }
    END { exit found ? 0 : 1 }
  '
}

require_visible_emulator() {
  [[ "$ALLOW_HEADLESS_EMULATOR" == "true" ]] && return 0
  [[ "$DEVICE_ID" == emulator-* ]] || return 0

  if headless_emulator_detected; then
    cat >&2 <<EOF
ERROR: $DEVICE_ID appears to be a hidden/headless emulator.

Play Console demo recording needs a visible, interactive emulator window.
Close the hidden emulator and start a visible AVD from Android Studio Device
Manager, or rerun only for non-interactive verification with:
  ALLOW_HEADLESS_EMULATOR=true PERMISSION_DEMO=$PERMISSION_DEMO ./scripts/record-play-fgs-permission-video.sh
EOF
    exit 2
  fi
}

configure_demo() {
  case "$PERMISSION_DEMO" in
    camera)
      DEMO_SLUG="camera"
      DEMO_LABEL="Camera"
      PLAY_FIELD="Camera video field"
      DESCRIPTION="MANAS uses the camera only during user-initiated video coaching/session calls. The camera starts only when the user joins an in-app session/call and is not used for hidden recording or surveillance."
      ;;
    media-playback)
      DEMO_SLUG="media-playback"
      DEMO_LABEL="Media playback"
      PLAY_FIELD="Media playback video field"
      DESCRIPTION="MANAS uses media playback foreground service support only during user-initiated audio/video coaching sessions so session audio/video can continue reliably while the active session is visible to the user."
      ;;
    microphone)
      DEMO_SLUG="microphone"
      DEMO_LABEL="Microphone"
      PLAY_FIELD="Microphone video field"
      DESCRIPTION="MANAS uses the microphone only during user-initiated audio/video coaching/session calls. This allows the user to participate in an active session. MANAS does not record calls in the background or listen without the user starting a session."
      ;;
    *)
      usage >&2
      error "PERMISSION_DEMO must be camera, media-playback, or microphone."
      ;;
  esac

  VIDEO_NAME="manas-fgs-$DEMO_SLUG-demo-$TIMESTAMP.mp4"
  DEVICE_VIDEO="/sdcard/manas-fgs-$DEMO_SLUG-demo.mp4"
  OUTPUT_DIR="$(resolve_path "$OUTPUT_DIR")"
  OUTPUT_VIDEO="$OUTPUT_DIR/$VIDEO_NAME"
  LOGCAT_PATH="$OUTPUT_DIR/manas-fgs-$DEMO_SLUG-demo-logcat-$TIMESTAMP.txt"
  DEVICE_INFO_PATH="$OUTPUT_DIR/manas-fgs-$DEMO_SLUG-demo-device-$TIMESTAMP.txt"
}

print_demo_steps() {
  case "$PERMISSION_DEMO" in
    camera)
      cat <<'EOF'
CAMERA DEMO STEPS:

1. Open MANAS.
2. Sign in using the Google Play reviewer test account if needed.
3. Navigate to the session/call area.
4. Start or join a video session.
5. Allow camera permission if prompted.
6. Show the active video session screen where camera use is user-initiated.
7. End or leave the session.
EOF
      ;;
    media-playback)
      cat <<'EOF'
MEDIA PLAYBACK DEMO STEPS:

1. Open MANAS.
2. Sign in using the Google Play reviewer test account if needed.
3. Navigate to a session/call or video/content area that uses audio/video playback.
4. Start the user-initiated session or media playback.
5. Show that playback/session media is visible and controlled by the user.
6. Pause/leave/end the session.
EOF
      ;;
    microphone)
      cat <<'EOF'
MICROPHONE DEMO STEPS:

1. Open MANAS.

2. Sign in using the Google Play reviewer test account if needed.

3. Navigate to the session/call area.

4. Start or join an audio/video session.

5. Allow microphone permission if prompted.

6. Show the active session screen where microphone use is user-initiated.

7. End or leave the session.
EOF
      ;;
  esac
}

capture_device_info() {
  {
    echo "Timestamp: $TIMESTAMP"
    echo "Permission demo: $PERMISSION_DEMO"
    echo "Play Console field: $PLAY_FIELD"
    echo "App ID: $APP_ID"
    echo "Device serial: $DEVICE_ID"
    echo "Output video: $OUTPUT_VIDEO"
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
  } > "$DEVICE_INFO_PATH"
}

append_focus_snapshot() {
  {
    echo
    echo "Window focus after recording:"
    adb_cmd shell dumpsys window | grep -E "mCurrentFocus|topResumedActivity|mFocusedApp" || true
  } >> "$DEVICE_INFO_PATH"
}

stop_logcat() {
  if [[ -n "$LOGCAT_PID" ]] && ps -p "$LOGCAT_PID" >/dev/null 2>&1; then
    kill "$LOGCAT_PID" >/dev/null 2>&1 || true
    wait "$LOGCAT_PID" >/dev/null 2>&1 || true
  fi
}

stop_screenrecord() {
  echo "Stopping screenrecord."
  adb_cmd shell pkill -INT screenrecord >/dev/null 2>&1 || true
  sleep 2

  if [[ -n "$RECORD_PID" ]] && ps -p "$RECORD_PID" >/dev/null 2>&1; then
    kill "$RECORD_PID" >/dev/null 2>&1 || true
    wait "$RECORD_PID" >/dev/null 2>&1 || true
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

launch_app() {
  local start_output=""

  echo "Launching $APP_ID."
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

  if [[ ! -f "$input_path" ]]; then
    return 0
  fi

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

prepare_debug_app() {
  if [[ "$FGS_SKIP_PREP" == "true" ]]; then
    return 0
  fi

  "$SCRIPT_DIR/android-adb-doctor.sh"
  START_EMULATOR="$START_EMULATOR" "$SCRIPT_DIR/start-android-emulator-if-needed.sh"

  DEVICE_ID="$(select_device)"
  require_visible_emulator

  RESET_APP="$RESET_APP" "$SCRIPT_DIR/launch-debug_apk.sh"
}

wait_for_recording() {
  if [[ -t 0 ]]; then
    echo
    echo "Press Enter when this demo is finished. If you do nothing, recording stops after ${DEMO_SECONDS}s."
    while ps -p "$RECORD_PID" >/dev/null 2>&1; do
      if IFS= read -r -t 1 _; then
        stop_screenrecord
        return 0
      fi
    done
  else
    echo "No interactive stdin is available; waiting for screenrecord time limit."
  fi

  wait "$RECORD_PID" >/dev/null 2>&1 || true
}

pull_video_if_present() {
  echo
  echo "Pulling recording from device if present."
  if adb_cmd shell "ls $DEVICE_VIDEO >/dev/null 2>&1"; then
    adb_cmd pull "$DEVICE_VIDEO" "$OUTPUT_VIDEO"
    adb_cmd shell rm -f "$DEVICE_VIDEO" >/dev/null 2>&1 || true
  else
    echo "WARNING: Device recording was not found at $DEVICE_VIDEO" >&2
  fi
}

print_completion() {
  cat <<EOF

=====================================================
 $DEMO_LABEL demo recording complete
=====================================================
Play Console field:
$PLAY_FIELD

MP4:
$OUTPUT_VIDEO

Compressed MP4, if ffmpeg succeeded:
${OUTPUT_VIDEO%.mp4}-compressed.mp4

Logcat:
$LOGCAT_PATH

Device info:
$DEVICE_INFO_PATH

Description to paste into Play Console:
$DESCRIPTION

Upload the MP4 to YouTube as Unlisted or to Google Drive with anyone-with-link
viewer access, then paste that shareable URL into the $PLAY_FIELD.
Do not paste the local dist/play-store path into Play Console.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

validate_bool "RESET_APP" "$RESET_APP"
validate_bool "START_EMULATOR" "$START_EMULATOR"
validate_bool "ALLOW_HEADLESS_EMULATOR" "$ALLOW_HEADLESS_EMULATOR"
validate_bool "FGS_SKIP_PREP" "$FGS_SKIP_PREP"
[[ "$DEMO_SECONDS" =~ ^[0-9]+$ && "$DEMO_SECONDS" -gt 0 ]] || error "DEMO_SECONDS must be a positive integer."

configure_demo
ensure_adb_path
mkdir -p "$OUTPUT_DIR"

cat <<EOF
=====================================================
 MANAS $DEMO_LABEL foreground service demo recording
=====================================================
App ID: $APP_ID
Permission demo: $PERMISSION_DEMO
Max seconds: $DEMO_SECONDS
API URL: $EXPO_PUBLIC_API_URL
Output: $OUTPUT_VIDEO
Play Console field: $PLAY_FIELD

This uses the debug APK for local permission demo recording only.
The Play Console uploadable app bundle remains dist/manas-release.aab.
EOF

prepare_debug_app

DEVICE_ID="$(select_device)"
require_visible_emulator

echo "Selected device: $DEVICE_ID"
echo "Force-stopping $APP_ID before recording."
adb_cmd shell am force-stop "$APP_ID" >/dev/null 2>&1 || true

capture_device_info

echo "Clearing old device recording and logcat."
adb_cmd shell rm -f "$DEVICE_VIDEO" >/dev/null 2>&1 || true
adb_cmd logcat -c || true

echo "Starting screenrecord for up to ${DEMO_SECONDS}s."
adb_cmd shell screenrecord --time-limit "$DEMO_SECONDS" "$DEVICE_VIDEO" &
RECORD_PID="$!"
sleep 1

echo "Starting logcat capture."
adb_cmd logcat -v time > "$LOGCAT_PATH" &
LOGCAT_PID="$!"

launch_app

echo
print_demo_steps
wait_for_recording
RECORD_PID=""
stop_logcat
append_focus_snapshot
pull_video_if_present
compress_video_if_possible "$OUTPUT_VIDEO"
print_completion
