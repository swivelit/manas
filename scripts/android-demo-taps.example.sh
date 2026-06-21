#!/usr/bin/env bash
set -Eeuo pipefail

# Example only. This is not used by record-play-foreground-service-demo.sh.
# Coordinates vary by emulator/device size, density, keyboard, and app state.
# Manual recording is safer for Play Console review videos.

ADB="${ADB:-adb}"
APP_ID="${APP_ID:-com.jeygroups.manas}"
DEVICE_ARGS=()

if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  DEVICE_ARGS=(-s "$ANDROID_SERIAL")
fi

echo "ADB automation examples for $APP_ID"
echo "Uncomment and adjust coordinates/text before using."
echo

# Launch the app.
# "$ADB" "${DEVICE_ARGS[@]}" shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1

# Tap examples. Replace x/y for your emulator or device.
# "$ADB" "${DEVICE_ARGS[@]}" shell input tap 540 1780
# "$ADB" "${DEVICE_ARGS[@]}" shell input tap 510 920

# Text input examples. Spaces need %s with adb shell input text.
# "$ADB" "${DEVICE_ARGS[@]}" shell input text "reviewer@example.com"
# "$ADB" "${DEVICE_ARGS[@]}" shell input text "123456"
# "$ADB" "${DEVICE_ARGS[@]}" shell input text "first%slast"

# Keyboard/navigation examples.
# "$ADB" "${DEVICE_ARGS[@]}" shell input keyevent KEYCODE_TAB
# "$ADB" "${DEVICE_ARGS[@]}" shell input keyevent KEYCODE_ENTER
# "$ADB" "${DEVICE_ARGS[@]}" shell input keyevent KEYCODE_BACK
# "$ADB" "${DEVICE_ARGS[@]}" shell input keyevent KEYCODE_HOME
