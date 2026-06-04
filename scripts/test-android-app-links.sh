#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_APP_JSON="$ROOT_DIR/mobile/app.json"

cat <<'BANNER'
========================================
 MANAS Android App Links Check
========================================
BANNER

if [[ ! -f "$MOBILE_APP_JSON" ]]; then
  echo "ERROR: Expo config not found at mobile/app.json" >&2
  exit 1
fi

node - "$MOBILE_APP_JSON" <<'NODE'
const fs = require('fs');
const appJsonPath = process.argv[2];
const expo = JSON.parse(fs.readFileSync(appJsonPath, 'utf8')).expo || {};
const android = expo.android || {};
const intentFilters = Array.isArray(android.intentFilters) ? android.intentFilters : [];

if (intentFilters.length > 0) {
  console.error('ERROR: mobile/app.json contains Android intentFilters, so this compatibility wrapper is no longer enough.');
  console.error('Add a MANAS-specific Android App Links test before using this script.');
  process.exit(1);
}

console.log('MANAS has no Android App Links intentFilters configured in mobile/app.json.');
console.log(`Configured custom scheme: ${expo.scheme || '(missing)'}`);
console.log(`Android package: ${android.package || '(missing)'}`);
NODE

cat <<'EOF'

No website App Links are tested here because MANAS does not currently configure
Android App Links. Running the MANAS Android launch smoke test instead.
EOF

exec "$SCRIPT_DIR/test-android-launch.sh" "$@"
