#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="MANAS"
APP_ID="com.jeygroups.manas"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/mobile"
APK_PATH="$ROOT_DIR/dist/manas-release.apk"

MIN_NODE_VERSION="${MIN_NODE_VERSION:-22.13.1}"

require_command() {
  local command_name="$1"
  local install_hint="$2"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $command_name" >&2
    echo "$install_hint" >&2
    exit 1
  fi
}

require_node_version() {
  node - "$MIN_NODE_VERSION" <<'NODE'
const minimum = process.argv[2].split('.').map(Number);
const current = process.versions.node.split('.').map(Number);
const ok = current[0] > minimum[0] ||
  (current[0] === minimum[0] && (
    current[1] > minimum[1] ||
    (current[1] === minimum[1] && current[2] >= minimum[2])
  ));

if (!ok) {
  console.error(`ERROR: Node ${minimum.join('.')} or newer is required. Current: ${process.versions.node}`);
  console.error(`Run: nvm install ${minimum.join('.')} && nvm use ${minimum.join('.')}`);
  process.exit(1);
}
NODE
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

validate_expo_identity() {
  node - "$MOBILE_DIR/app.json" "$APP_NAME" "$APP_ID" <<'NODE'
const fs = require('fs');
const [appJsonPath, expectedName, expectedPackage] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(appJsonPath, 'utf8')).expo || {};
const androidPackage = config.android && config.android.package;

if (config.name !== expectedName || androidPackage !== expectedPackage) {
  console.error('ERROR: mobile/app.json does not match the MANAS Android identity.');
  console.error(`Expected name=${expectedName}, android.package=${expectedPackage}`);
  console.error(`Found name=${config.name || '(missing)'}, android.package=${androidPackage || '(missing)'}`);
  process.exit(1);
}
NODE
}

find_apksigner() {
  if command -v apksigner >/dev/null 2>&1; then
    command -v apksigner
    return 0
  fi

  local sdk_dir="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
  if [[ -n "$sdk_dir" && -d "$sdk_dir/build-tools" ]]; then
    find "$sdk_dir/build-tools" -name apksigner -type f | sort | tail -n 1
  fi
}

cat <<'BANNER'
========================================
 MANAS Android Release APK Build
========================================
BANNER

if [[ ! -d "$MOBILE_DIR" ]]; then
  echo "ERROR: mobile/ directory not found at $MOBILE_DIR" >&2
  echo "Run this script from the MANAS repository root." >&2
  exit 1
fi

if [[ ! -f "$MOBILE_DIR/app.json" ]]; then
  echo "ERROR: Expo config not found at mobile/app.json" >&2
  exit 1
fi

if [[ ! -x "$ROOT_DIR/build-apk.sh" ]]; then
  echo "ERROR: build-apk.sh is missing or is not executable." >&2
  echo "Run: chmod +x build-apk.sh" >&2
  exit 1
fi

require_command node "Install Node.js, then use: nvm install $MIN_NODE_VERSION && nvm use $MIN_NODE_VERSION"
require_command npm "Install npm with Node.js."
require_command npx "Install npm/npx with Node.js."
require_command java "Install JDK 17 or newer, then rerun this script."
require_node_version
validate_expo_identity

ANDROID_SDK="$(find_android_sdk || true)"
if [[ -z "$ANDROID_SDK" ]]; then
  cat >&2 <<'EOF'
ERROR: Android SDK not found.

Install Android Studio or set ANDROID_SDK_ROOT/ANDROID_HOME to your Android SDK.
Expected SDK contents include platform-tools and build-tools.
EOF
  exit 1
fi

export ANDROID_SDK_ROOT="$ANDROID_SDK"
export ANDROID_HOME="$ANDROID_SDK"
export PATH="$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH"

cat <<EOF
App: $APP_NAME
Android package: $APP_ID
Mobile directory: $MOBILE_DIR
Android SDK: $ANDROID_SDK_ROOT
Output APK: $APK_PATH

This creates a local release APK for QA installs.
For the Google Play AAB, run:
  cd mobile && eas build --platform android --profile production

EOF

BUILD_TYPE=release "$ROOT_DIR/build-apk.sh"

if [[ ! -f "$APK_PATH" ]]; then
  echo "ERROR: Expected release APK was not created at $APK_PATH" >&2
  exit 1
fi

APK_SIGNER="$(find_apksigner || true)"
if [[ -n "$APK_SIGNER" ]]; then
  echo
  echo "Verifying APK signature with $APK_SIGNER"
  "$APK_SIGNER" verify --verbose "$APK_PATH"
else
  echo
  echo "WARNING: apksigner was not found; APK signature verification was skipped."
fi

cat <<EOF

========================================
 MANAS release APK ready
========================================
APK:
$APK_PATH

Install locally:
adb install -r "$APK_PATH"

Play Store AAB:
cd mobile && eas build --platform android --profile production
EOF
