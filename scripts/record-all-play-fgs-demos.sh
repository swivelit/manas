#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

APP_ID="${APP_ID:-com.jeygroups.manas}"
RESET_APP="${RESET_APP:-false}"
START_EMULATOR="${START_EMULATOR:-true}"
ALLOW_HEADLESS_EMULATOR="${ALLOW_HEADLESS_EMULATOR:-false}"
EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://manas-api-dlj7.onrender.com}"

export EXPO_PUBLIC_API_URL

validate_bool() {
  local name="$1"
  local value="$2"
  if [[ "$value" != "true" && "$value" != "false" ]]; then
    echo "ERROR: $name must be true or false. Current value: $value" >&2
    exit 1
  fi
}

select_device() {
  local devices=()
  local device

  while IFS= read -r device; do
    [[ -n "$device" ]] && devices+=("$device")
  done < <(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')

  if [[ ${#devices[@]} -eq 0 ]]; then
    echo "ERROR: No adb device or emulator is connected in the device state." >&2
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
    exit 2
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
  local device_id="$1"

  [[ "$ALLOW_HEADLESS_EMULATOR" == "true" ]] && return 0
  [[ "$device_id" == emulator-* ]] || return 0

  if headless_emulator_detected; then
    cat >&2 <<'EOF'
ERROR: The selected emulator appears to be hidden/headless.

Play Console demo recording needs a visible, interactive emulator window.
Close the hidden emulator and start a visible AVD from Android Studio Device
Manager. For non-interactive verification only, set ALLOW_HEADLESS_EMULATOR=true.
EOF
    exit 2
  fi
}

pause_before_demo() {
  local label="$1"
  local field="$2"

  cat <<EOF

=====================================================
 Ready to record: $label
 Play Console field: $field
=====================================================
Make sure the visible emulator is ready. Press Enter to start this recording.
EOF
  IFS= read -r _
}

run_demo() {
  local demo="$1"
  local label="$2"
  local field="$3"

  pause_before_demo "$label" "$field"
  PERMISSION_DEMO="$demo" \
    FGS_SKIP_PREP=true \
    RESET_APP="$RESET_APP" \
    START_EMULATOR="$START_EMULATOR" \
    ALLOW_HEADLESS_EMULATOR="$ALLOW_HEADLESS_EMULATOR" \
    "$SCRIPT_DIR/record-play-fgs-permission-video.sh"
}

validate_bool "RESET_APP" "$RESET_APP"
validate_bool "START_EMULATOR" "$START_EMULATOR"
validate_bool "ALLOW_HEADLESS_EMULATOR" "$ALLOW_HEADLESS_EMULATOR"

cat <<EOF
=====================================================
 MANAS three-video Play foreground service recording
=====================================================
This uses the debug APK for local permission demo recording only.
The Play Console uploadable app bundle remains dist/manas-release.aab.
App ID: $APP_ID
RESET_APP: $RESET_APP
API URL: $EXPO_PUBLIC_API_URL
EOF

"$SCRIPT_DIR/android-adb-doctor.sh"
START_EMULATOR="$START_EMULATOR" "$SCRIPT_DIR/start-android-emulator-if-needed.sh"

DEVICE_ID="$(select_device)"
require_visible_emulator "$DEVICE_ID"

RESET_APP="$RESET_APP" "$SCRIPT_DIR/launch-debug_apk.sh"

run_demo camera "Camera demo" "Camera video field"
run_demo media-playback "Media playback demo" "Media playback video field"
run_demo microphone "Microphone demo" "Microphone video field"

cat <<'EOF'

=====================================================
 All three foreground service demo recordings finished
=====================================================
Upload each MP4 from dist/play-store to YouTube as Unlisted or to Google Drive
with anyone-with-link viewer access.

Paste the camera video URL into the Camera video field.
Paste the media playback video URL into the Media playback video field.
Paste the microphone video URL into the Microphone video field.
Do not paste local dist/play-store file paths into Play Console.
EOF
