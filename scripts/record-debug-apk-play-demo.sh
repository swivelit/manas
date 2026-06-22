#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

export START_EMULATOR="${START_EMULATOR:-true}"
export USE_LAUNCH_DEBUG_SCRIPT=true
export BUILD_MODE=debug
export RESET_APP=true
export DEMO_SECONDS="${DEMO_SECONDS:-120}"

cat <<'EOF'
========================================
 MANAS debug APK Play demo recording
========================================
This uses the debug APK for local video recording only.
The Play Console uploadable app bundle is still dist/manas-release.aab.
The generated MP4 is only for the Play Console permission declaration video link.
EOF

"$SCRIPT_DIR/record-play-foreground-service-demo.sh"
