#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="MANAS"
BUNDLE_ID="com.jeygroups.manas"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/mobile"
IOS_DEVICE="${IOS_DEVICE:-}"
FORCE_PREBUILD="${FORCE_PREBUILD:-false}"

require_command() {
  local command_name="$1"
  local install_hint="$2"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $command_name" >&2
    echo "$install_hint" >&2
    exit 1
  fi
}

require_macos() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "ERROR: iOS device runs require macOS with Xcode installed." >&2
    exit 1
  fi
}

validate_expo_identity() {
  node - "$MOBILE_DIR/app.json" "$APP_NAME" "$BUNDLE_ID" <<'NODE'
const fs = require('fs');
const [appJsonPath, expectedName, expectedBundleId] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(appJsonPath, 'utf8')).expo || {};
const bundleId = config.ios && config.ios.bundleIdentifier;

if (config.name !== expectedName || bundleId !== expectedBundleId) {
  console.error('ERROR: mobile/app.json does not match the MANAS iOS identity.');
  console.error(`Expected name=${expectedName}, ios.bundleIdentifier=${expectedBundleId}`);
  console.error(`Found name=${config.name || '(missing)'}, ios.bundleIdentifier=${bundleId || '(missing)'}`);
  process.exit(1);
}
NODE
}

cat <<'BANNER'
========================================
 MANAS iOS Device Run
========================================
BANNER

require_macos

if [[ ! -d "$MOBILE_DIR" ]]; then
  echo "ERROR: mobile/ directory not found at $MOBILE_DIR" >&2
  exit 1
fi

if [[ ! -f "$MOBILE_DIR/app.json" ]]; then
  echo "ERROR: Expo config not found at mobile/app.json" >&2
  exit 1
fi

require_command node "Install Node.js."
require_command npm "Install npm with Node.js."
require_command npx "Install npm/npx with Node.js."
require_command xcodebuild "Install Xcode and run: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
validate_expo_identity

if ! xcodebuild -version >/dev/null 2>&1; then
  echo "ERROR: Xcode is not ready. Open Xcode, accept the license, and complete first launch setup." >&2
  exit 1
fi

cat <<EOF
Bundle id: $BUNDLE_ID

Physical iPhone runs require Xcode signing for com.jeygroups.manas.
If Expo/Xcode reports a signing error, configure Signing & Capabilities in the
generated mobile/ios project or use EAS:

  cd mobile && eas build --platform ios --profile preview

Do not commit Team IDs, provisioning profiles, certificates, or private keys.

EOF

(
  cd "$MOBILE_DIR"
  npm ci

  if [[ "$FORCE_PREBUILD" == "true" || ! -d ios ]]; then
    npx expo prebuild --platform ios
  fi

  if [[ -n "$IOS_DEVICE" ]]; then
    npx expo run:ios --device "$IOS_DEVICE"
  else
    npx expo run:ios --device
  fi
)
