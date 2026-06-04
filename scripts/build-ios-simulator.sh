#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="MANAS"
BUNDLE_ID="com.jeygroups.manas"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/mobile"
IOS_DIR="$MOBILE_DIR/ios"
OUTPUT_DIR="$ROOT_DIR/dist/ios-simulator"
DERIVED_DATA_DIR="$OUTPUT_DIR/DerivedData"
IOS_SCHEME="${IOS_SCHEME:-MANAS}"
IOS_CONFIGURATION="${IOS_CONFIGURATION:-Debug}"
IOS_SIMULATOR_DESTINATION="${IOS_SIMULATOR_DESTINATION:-generic/platform=iOS Simulator}"
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
    echo "ERROR: iOS Simulator builds require macOS with Xcode installed." >&2
    exit 1
  fi
}

ensure_mobile_project() {
  if [[ ! -d "$MOBILE_DIR" ]]; then
    echo "ERROR: mobile/ directory not found at $MOBILE_DIR" >&2
    exit 1
  fi

  if [[ ! -f "$MOBILE_DIR/app.json" ]]; then
    echo "ERROR: Expo config not found at mobile/app.json" >&2
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

ensure_ios_project() {
  if [[ "$FORCE_PREBUILD" == "true" || ! -d "$IOS_DIR" ]]; then
    echo "Generating Expo iOS project with npx expo prebuild --platform ios."
    npx expo prebuild --platform ios
  else
    echo "Using existing generated iOS project at $IOS_DIR."
  fi
}

install_pods_if_needed() {
  if [[ ! -f "$IOS_DIR/Podfile" ]]; then
    echo "ERROR: Generated iOS Podfile not found at $IOS_DIR/Podfile" >&2
    exit 1
  fi

  if ! command -v pod >/dev/null 2>&1; then
    echo "ERROR: CocoaPods not found. Install it with: sudo gem install cocoapods" >&2
    exit 1
  fi

  echo "Installing CocoaPods dependencies."
  (
    cd "$IOS_DIR"
    pod install
  )
}

find_workspace() {
  local workspace
  workspace="$(find "$IOS_DIR" -maxdepth 1 -name "*.xcworkspace" -type d | sort | head -n 1)"
  if [[ -z "$workspace" ]]; then
    echo "ERROR: No .xcworkspace found in $IOS_DIR after Expo prebuild." >&2
    exit 1
  fi
  printf '%s\n' "$workspace"
}

cat <<'BANNER'
========================================
 MANAS iOS Simulator Build
========================================
BANNER

require_macos
ensure_mobile_project
require_command node "Install Node.js."
require_command npm "Install npm with Node.js."
require_command npx "Install npm/npx with Node.js."
require_command xcodebuild "Install Xcode and run: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
validate_expo_identity

if ! xcodebuild -version >/dev/null 2>&1; then
  echo "ERROR: Xcode is not ready. Open Xcode, accept the license, and complete first launch setup." >&2
  exit 1
fi

echo "Installing mobile dependencies."
(
  cd "$MOBILE_DIR"
  npm ci
)

ensure_ios_project
install_pods_if_needed

WORKSPACE="$(find_workspace)"
mkdir -p "$DERIVED_DATA_DIR"

echo
echo "Building $APP_NAME for iOS Simulator."
echo "Workspace: $WORKSPACE"
echo "Scheme: $IOS_SCHEME"
echo "Destination: $IOS_SIMULATOR_DESTINATION"

xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$IOS_SCHEME" \
  -configuration "$IOS_CONFIGURATION" \
  -sdk iphonesimulator \
  -destination "$IOS_SIMULATOR_DESTINATION" \
  -derivedDataPath "$DERIVED_DATA_DIR" \
  CODE_SIGNING_ALLOWED=NO \
  build

cat <<EOF

========================================
 MANAS iOS Simulator build complete
========================================
Derived data:
$DERIVED_DATA_DIR
EOF
