#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== MANAS verification =="
echo "Root: ${ROOT_DIR}"

node -e "
const [major, minor, patch] = process.versions.node.split('.').map(Number);
const ok = major > 22 || (major === 22 && (minor > 13 || (minor === 13 && patch >= 1)));
if (!ok) {
  console.error('Node >= 22.13.1 is required for the Expo SDK 56 mobile toolchain.');
  console.error('Run: nvm install 22.13.1 && nvm use 22.13.1');
  process.exit(1);
}
"

echo
echo "== Backend =="
cd "${ROOT_DIR}/backend"
npm ci
npx prisma generate
npm run typecheck
npm run build

echo
echo "== Mobile =="
cd "${ROOT_DIR}/mobile"
rm -rf .expo dist node_modules/.cache
npm ci
npm run typecheck
npx expo install --check
npx expo-doctor --verbose
npx expo export --platform android --output-dir ./dist/android --clear

echo
echo "MANAS verification passed."
