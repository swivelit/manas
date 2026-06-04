#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="MANAS"
BUNDLE_ID="com.jeygroups.manas"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/mobile"
IOS_DIR="$MOBILE_DIR/ios"
OUTPUT_DIR="$ROOT_DIR/dist/ios"
ARCHIVE_PATH="$OUTPUT_DIR/MANAS.xcarchive"
IPA_EXPORT_DIR="$OUTPUT_DIR/ipa"
IOS_LOCAL_ARCHIVE="${IOS_LOCAL_ARCHIVE:-false}"
IOS_TEAM_ID="${IOS_TEAM_ID:-}"
IOS_SCHEME="${IOS_SCHEME:-MANAS}"
IOS_CONFIGURATION="${IOS_CONFIGURATION:-Release}"
IOS_DESTINATION="${IOS_DESTINATION:-generic/platform=iOS}"
IOS_EXPORT_OPTIONS_PLIST="${IOS_EXPORT_OPTIONS_PLIST:-}"
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
    echo "ERROR: Local iOS archives require macOS with Xcode installed." >&2
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

print_eas_guidance() {
  cat <<'EOF'
========================================
 MANAS iOS Archive Guidance
========================================

Use EAS for iOS archives unless this Mac has a complete local Apple signing setup:

  cd mobile && eas build --platform ios --profile preview
  cd mobile && eas build --platform ios --profile production

Signing requirements:
- Apple Developer Program membership is required for TestFlight/App Store distribution.
- EAS or Xcode must manage certificates and provisioning profiles for com.jeygroups.manas.
- Do not commit Team IDs, provisioning profiles, private keys, certificates, or export option files.

To intentionally run a local Xcode archive from the generated Expo project:

  IOS_LOCAL_ARCHIVE=true IOS_TEAM_ID=YOUR_TEAM_ID ./scripts/build-ios-archive.sh

To export an IPA from a local archive, also pass:

  IOS_EXPORT_OPTIONS_PLIST=/absolute/path/to/ExportOptions.plist
EOF
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

print_eas_guidance

if [[ "$IOS_LOCAL_ARCHIVE" != "true" ]]; then
  exit 0
fi

cat <<'BANNER'

========================================
 MANAS Local iOS Archive
========================================
BANNER

if [[ -z "$IOS_TEAM_ID" ]]; then
  echo "ERROR: IOS_TEAM_ID is required for a local signed archive." >&2
  echo "Use EAS instead, or rerun with IOS_LOCAL_ARCHIVE=true IOS_TEAM_ID=YOUR_TEAM_ID." >&2
  exit 1
fi

if [[ -n "$IOS_EXPORT_OPTIONS_PLIST" && ! -f "$IOS_EXPORT_OPTIONS_PLIST" ]]; then
  echo "ERROR: IOS_EXPORT_OPTIONS_PLIST does not exist: $IOS_EXPORT_OPTIONS_PLIST" >&2
  exit 1
fi

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
mkdir -p "$OUTPUT_DIR"
rm -rf "$ARCHIVE_PATH"

echo
echo "Archiving $APP_NAME for iOS."
echo "Workspace: $WORKSPACE"
echo "Scheme: $IOS_SCHEME"
echo "Bundle id: $BUNDLE_ID"
echo "Team id: $IOS_TEAM_ID"

xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$IOS_SCHEME" \
  -configuration "$IOS_CONFIGURATION" \
  -destination "$IOS_DESTINATION" \
  -archivePath "$ARCHIVE_PATH" \
  DEVELOPMENT_TEAM="$IOS_TEAM_ID" \
  PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID" \
  CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates \
  archive

cat <<EOF

MANAS archive complete:
$ARCHIVE_PATH
EOF

if [[ -n "$IOS_EXPORT_OPTIONS_PLIST" ]]; then
  rm -rf "$IPA_EXPORT_DIR"
  mkdir -p "$IPA_EXPORT_DIR"
  xcodebuild \
    -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$IPA_EXPORT_DIR" \
    -exportOptionsPlist "$IOS_EXPORT_OPTIONS_PLIST" \
    -allowProvisioningUpdates

  echo "IPA export complete: $IPA_EXPORT_DIR"
else
  echo "IPA export skipped. Set IOS_EXPORT_OPTIONS_PLIST to export one."
fi
