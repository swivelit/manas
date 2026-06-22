#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PERMISSION_DEMO=microphone
exec "$SCRIPT_DIR/record-play-fgs-permission-video.sh"
