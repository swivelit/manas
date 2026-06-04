#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_BUILD_MODE="${IOS_BUILD_MODE:-simulator}"

case "$(printf '%s' "$IOS_BUILD_MODE" | tr '[:upper:]' '[:lower:]')" in
  simulator|sim)
    exec "$SCRIPT_DIR/build-ios-simulator.sh" "$@"
    ;;
  device|iphone|debug-device)
    exec "$SCRIPT_DIR/run-ios-device.sh" "$@"
    ;;
  archive|release)
    exec "$SCRIPT_DIR/build-ios-archive.sh" "$@"
    ;;
  *)
    cat >&2 <<EOF
ERROR: Unknown IOS_BUILD_MODE: $IOS_BUILD_MODE

Supported modes:
  simulator  Build MANAS for an iOS Simulator
  device     Run MANAS on a signed physical iPhone using Expo
  archive    Print EAS archive guidance, or run local archive with IOS_LOCAL_ARCHIVE=true
EOF
    exit 1
    ;;
esac
