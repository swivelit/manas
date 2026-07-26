#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$REPO_ROOT/mobile"
ARTIFACT_PATH="${1:-}"

FORBIDDEN_LITERALS=(
  "android.permission.FOREGROUND_SERVICE"
  "android.permission.FOREGROUND_SERVICE_CAMERA"
  "android.permission.FOREGROUND_SERVICE_MICROPHONE"
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"
  "expo.modules.audio.service.AudioControlsService"
  "expo.modules.audio.service.AudioRecordingService"
  "expo.modules.video.playbackService.ExpoVideoPlaybackService"
)
FOREGROUND_TYPE_REGEX="android:foregroundServiceType[[:space:]]*=[[:space:]]*[\"'][^\"']*(camera|microphone|mediaPlayback)([|,[:space:]\"']|$)"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/manas-foreground-services.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

checked_generated=0
checked_artifact=0
failed=0

usage() {
  echo "Usage: $0 [path/to/manas-release.aab]" >&2
}

relative_path() {
  local path_value="$1"
  if [[ "$path_value" == "$REPO_ROOT/"* ]]; then
    printf '%s\n' "${path_value#$REPO_ROOT/}"
  else
    printf '%s\n' "$path_value"
  fi
}

mark_failure() {
  local label="$1"
  local forbidden_value="$2"
  local matches="$3"

  echo "ERROR: $label contains unwanted foreground-service capability: $forbidden_value" >&2
  echo "$matches" >&2
  failed=1
}

check_text_manifest() {
  local file_path="$1"
  local label="$2"
  local forbidden_value matches

  for forbidden_value in "${FORBIDDEN_LITERALS[@]}"; do
    matches="$(grep -nF "$forbidden_value" "$file_path" || true)"
    if [[ -n "$matches" ]]; then
      mark_failure "$label" "$forbidden_value" "$matches"
    fi
  done

  matches="$(grep -nE "$FOREGROUND_TYPE_REGEX" "$file_path" || true)"
  if [[ -n "$matches" ]]; then
    mark_failure "$label" 'camera, microphone, or mediaPlayback foregroundServiceType' "$matches"
  fi
}

check_generated_manifest() {
  local manifest_path="$1"

  [[ -f "$manifest_path" ]] || return 0
  checked_generated=1
  check_text_manifest "$manifest_path" "$(relative_path "$manifest_path")"
  echo "Checked generated manifest: $(relative_path "$manifest_path")"
}

check_generated_manifests() {
  local main_manifest="$MOBILE_DIR/android/app/src/main/AndroidManifest.xml"
  local manifest

  check_generated_manifest "$main_manifest"

  [[ -d "$MOBILE_DIR/android/app/build" ]] || return 0
  while IFS= read -r -d '' manifest; do
    check_generated_manifest "$manifest"
  done < <(
    find "$MOBILE_DIR/android/app/build" -type f -name AndroidManifest.xml \
      \( -path "*/release/*" -o -path "*/Release/*" -o -path "*/bundleRelease/*" \) \
      -print0
  )
}

check_strings_manifest() {
  local strings_path="$1"
  local label="$2"
  local matches

  check_text_manifest "$strings_path" "$label"

  if grep -F "foregroundServiceType" "$strings_path" >/dev/null 2>&1; then
    matches="$(grep -nE '^(camera|microphone|mediaPlayback)([^[:alnum:]_]|$)' "$strings_path" || true)"
    if [[ -n "$matches" ]]; then
      mark_failure "$label" 'camera, microphone, or mediaPlayback foregroundServiceType' "$matches"
    fi
  fi
}

check_aab_manifest() {
  local artifact_path="$1"
  local label
  label="$(relative_path "$artifact_path")"

  if command -v bundletool >/dev/null 2>&1; then
    local bundletool_manifest="$TMP_DIR/bundletool-manifest.txt"
    if bundletool dump manifest --bundle="$artifact_path" --module=base \
      >"$bundletool_manifest" 2>"$TMP_DIR/bundletool.err"; then
      checked_artifact=1
      check_text_manifest "$bundletool_manifest" "$label base manifest"
      echo "Checked AAB base manifest with bundletool."
      return 0
    fi

    echo "WARNING: bundletool could not dump the AAB manifest; using unzip/strings fallback." >&2
    cat "$TMP_DIR/bundletool.err" >&2
  fi

  if ! command -v unzip >/dev/null 2>&1 || ! command -v strings >/dev/null 2>&1; then
    echo "ERROR: bundletool or both unzip and strings are required to inspect the AAB." >&2
    return 1
  fi

  local entry entry_index manifest_bin manifest_strings found
  entry_index=0
  found=0
  while IFS= read -r entry; do
    found=1
    entry_index=$((entry_index + 1))
    manifest_bin="$TMP_DIR/aab-manifest-$entry_index.bin"
    manifest_strings="$TMP_DIR/aab-manifest-$entry_index.txt"
    unzip -p "$artifact_path" "$entry" >"$manifest_bin"
    strings "$manifest_bin" >"$manifest_strings" || true
    checked_artifact=1
    check_strings_manifest "$manifest_strings" "$label:$entry"
  done < <(unzip -Z1 "$artifact_path" | grep -E '(^|/)AndroidManifest\.xml$' || true)

  if [[ "$found" -eq 0 ]]; then
    echo "ERROR: No AndroidManifest.xml entries were found inside $label." >&2
    return 1
  fi

  echo "Checked AAB manifest entries with unzip/strings fallback."
}

if [[ "$#" -gt 1 ]]; then
  usage
  exit 2
fi

cat <<'EOF'
=================================================
 MANAS Android Foreground Service Permission Check
=================================================
The release must not contain camera, microphone, or media-playback foreground
service permissions, service types, or Expo background playback services.

EOF

check_generated_manifests

if [[ "$checked_generated" -eq 0 ]]; then
  cat >&2 <<'EOF'
ERROR: No generated Android manifest was found.
Generate it first:
  cd mobile && npx expo prebuild --platform android --clean
EOF
  exit 1
fi

if [[ -n "$ARTIFACT_PATH" ]]; then
  if [[ ! -f "$ARTIFACT_PATH" ]]; then
    echo "ERROR: AAB not found: $ARTIFACT_PATH" >&2
    exit 1
  fi
  if [[ "$ARTIFACT_PATH" != *.aab ]]; then
    echo "ERROR: Expected an Android App Bundle (.aab): $ARTIFACT_PATH" >&2
    exit 2
  fi
  check_aab_manifest "$ARTIFACT_PATH"
fi

if [[ "$failed" -ne 0 ]]; then
  echo "FAIL: Unwanted Android foreground-service capabilities remain." >&2
  exit 1
fi

if [[ -n "$ARTIFACT_PATH" && "$checked_artifact" -eq 0 ]]; then
  echo "ERROR: The supplied AAB was not inspected." >&2
  exit 1
fi

if [[ -z "$ARTIFACT_PATH" ]]; then
  echo "PASS: No unwanted foreground-service capabilities were found in generated Android manifests."
  echo "For final release verification, rerun with dist/manas-release.aab."
else
  echo "PASS: No unwanted foreground-service capabilities were found in generated manifests or the AAB."
fi
