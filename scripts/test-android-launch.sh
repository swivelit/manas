#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cat <<'BANNER'
========================================
 MANAS Android Launch Smoke Test
========================================
BANNER

exec "$SCRIPT_DIR/launch-debug_apk.sh" "$@"
