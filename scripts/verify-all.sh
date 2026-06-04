#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NVMRC_PATH="$ROOT_DIR/.nvmrc"
MIN_NODE_VERSION="22.13.1"

if [[ -f "$NVMRC_PATH" ]]; then
  REQUIRED_NODE_VERSION="$(tr -d '[:space:]' < "$NVMRC_PATH")"
else
  REQUIRED_NODE_VERSION="$MIN_NODE_VERSION"
fi

run_step() {
  local label="$1"
  shift

  echo
  echo "== $label =="
  if ! "$@"; then
    cat >&2 <<EOF

ERROR: Failed step: $label
Command: $*
Fix the error above, then rerun ./scripts/verify-all.sh.
EOF
    exit 1
  fi
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

require_node_version() {
  node - "$REQUIRED_NODE_VERSION" "$MIN_NODE_VERSION" <<'NODE'
const [requestedRaw, fallbackRaw] = process.argv.slice(2);
const normalize = (value) => String(value || '').replace(/^v/, '').trim();
const parse = (value) => normalize(value).split('.').map((part) => Number(part));
const requested = parse(requestedRaw);
const fallback = parse(fallbackRaw);
const minimum = requested.every(Number.isFinite) && requested.length >= 3 ? requested : fallback;
const current = parse(process.versions.node);
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

cat <<EOF
== MANAS verification ==
Root: $ROOT_DIR
Required Node: >=$REQUIRED_NODE_VERSION
EOF

require_command node "Install Node.js, then run: nvm install $REQUIRED_NODE_VERSION && nvm use $REQUIRED_NODE_VERSION"
require_command npm "Install npm with Node.js."
require_command npx "Install npm/npx with Node.js."
require_node_version

run_step "Backend npm ci" bash -c "cd '$ROOT_DIR/backend' && npm ci"
run_step "Backend Prisma generate" bash -c "cd '$ROOT_DIR/backend' && npx prisma generate"
run_step "Backend typecheck" bash -c "cd '$ROOT_DIR/backend' && npm run typecheck"
run_step "Backend build" bash -c "cd '$ROOT_DIR/backend' && npm run build"

run_step "Mobile npm ci" bash -c "cd '$ROOT_DIR/mobile' && npm ci"
run_step "Mobile typecheck" bash -c "cd '$ROOT_DIR/mobile' && npm run typecheck"
run_step "Mobile Expo dependency check" bash -c "cd '$ROOT_DIR/mobile' && npx expo install --check"
run_step "Mobile Expo doctor" bash -c "cd '$ROOT_DIR/mobile' && npx expo-doctor"
run_step "Mobile Android export" bash -c "cd '$ROOT_DIR/mobile' && npx expo export --platform android --output-dir ./dist/android --clear"

echo
echo "MANAS verification passed."
