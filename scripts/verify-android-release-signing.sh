#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ARTIFACT_PATH="${1:-}"

usage() {
  echo "Usage: $0 path/to/app-release.apk|path/to/app-release.aab" >&2
}

find_apksigner() {
  if command -v apksigner >/dev/null 2>&1; then
    command -v apksigner
    return 0
  fi

  local sdk_dir="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
  if [[ -n "$sdk_dir" && -d "$sdk_dir/build-tools" ]]; then
    find "$sdk_dir/build-tools" -name apksigner -type f | sort | tail -n 1
  fi
}

verify_no_debug_certificate() {
  local output_file="$1"
  if grep -i "Android Debug" "$output_file" >/dev/null 2>&1; then
    cat "$output_file" >&2
    echo "ERROR: Artifact is signed with the Android Debug certificate." >&2
    echo "Play Console will reject debug-signed APKs and app bundles." >&2
    exit 1
  fi
}

verify_jarsigner_signed_output() {
  local output_file="$1"
  if grep -Ei "jar is unsigned|not signed" "$output_file" >/dev/null 2>&1; then
    cat "$output_file" >&2
    echo "ERROR: Artifact is not signed." >&2
    exit 1
  fi

  if ! grep -i "jar verified" "$output_file" >/dev/null 2>&1; then
    cat "$output_file" >&2
    echo "ERROR: jarsigner did not report a verified signed artifact." >&2
    exit 1
  fi
}

if [[ -z "$ARTIFACT_PATH" ]]; then
  usage
  exit 1
fi

if [[ ! -f "$ARTIFACT_PATH" ]]; then
  echo "ERROR: Artifact not found: $ARTIFACT_PATH" >&2
  exit 1
fi

OUTPUT_FILE="$(mktemp "${TMPDIR:-/tmp}/manas-signing-verify.XXXXXX")"
trap 'rm -f "$OUTPUT_FILE"' EXIT

case "$ARTIFACT_PATH" in
  *.aab)
    if ! command -v jarsigner >/dev/null 2>&1; then
      echo "ERROR: jarsigner is required to verify Android App Bundles." >&2
      exit 1
    fi

    if ! jarsigner -verify -verbose -certs "$ARTIFACT_PATH" >"$OUTPUT_FILE" 2>&1; then
      cat "$OUTPUT_FILE" >&2
      echo "ERROR: AAB signature verification failed." >&2
      exit 1
    fi
    verify_jarsigner_signed_output "$OUTPUT_FILE"
    verify_no_debug_certificate "$OUTPUT_FILE"
    ;;
  *.apk)
    APK_SIGNER="$(find_apksigner || true)"
    if [[ -n "$APK_SIGNER" ]]; then
      if ! "$APK_SIGNER" verify --verbose --print-certs "$ARTIFACT_PATH" >"$OUTPUT_FILE" 2>&1; then
        cat "$OUTPUT_FILE" >&2
        echo "ERROR: APK signature verification failed." >&2
        exit 1
      fi
    else
      if ! command -v jarsigner >/dev/null 2>&1; then
        echo "ERROR: apksigner or jarsigner is required to verify APK signatures." >&2
        exit 1
      fi

      echo "WARNING: apksigner was not found; falling back to jarsigner." >&2
      if ! jarsigner -verify -verbose -certs "$ARTIFACT_PATH" >"$OUTPUT_FILE" 2>&1; then
        cat "$OUTPUT_FILE" >&2
        echo "ERROR: APK signature verification failed." >&2
        exit 1
      fi
      verify_jarsigner_signed_output "$OUTPUT_FILE"
    fi
    verify_no_debug_certificate "$OUTPUT_FILE"
    ;;
  *)
    echo "ERROR: Unsupported artifact type: $ARTIFACT_PATH" >&2
    usage
    exit 1
    ;;
esac

RELATIVE_PATH="$ARTIFACT_PATH"
if [[ "$ARTIFACT_PATH" == "$REPO_ROOT/"* ]]; then
  RELATIVE_PATH="${ARTIFACT_PATH#$REPO_ROOT/}"
fi

echo "MANAS release signing verified: $RELATIVE_PATH"
echo "No Android Debug certificate was found."
