#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$REPO_ROOT/mobile"
DEFAULT_ARTIFACT="$REPO_ROOT/dist/manas-release.aab"
ARTIFACT_PATH="${1:-${AAB_PATH:-$DEFAULT_ARTIFACT}}"

BLOCKED_PERMISSIONS=(
  "android.permission.READ_MEDIA_VIDEO"
  "android.permission.READ_MEDIA_IMAGES"
  "android.permission.READ_EXTERNAL_STORAGE"
  "android.permission.WRITE_EXTERNAL_STORAGE"
)

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/manas-media-permissions.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

checked_any=0
checked_final=0
failed=0

relative_path() {
  local path_value="$1"
  if [[ "$path_value" == "$REPO_ROOT/"* ]]; then
    printf '%s\n' "${path_value#$REPO_ROOT/}"
  else
    printf '%s\n' "$path_value"
  fi
}

find_android_sdk_tool() {
  local tool_name="$1"

  if command -v "$tool_name" >/dev/null 2>&1; then
    command -v "$tool_name"
    return 0
  fi

  local sdk_dir="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
  if [[ -n "$sdk_dir" && -d "$sdk_dir/build-tools" ]]; then
    find "$sdk_dir/build-tools" -name "$tool_name" -type f | sort | tail -n 1
  fi
}

mark_failure() {
  local label="$1"
  local permission="$2"
  local matches="$3"

  echo "ERROR: $label contains $permission" >&2
  echo "$matches" >&2
  failed=1
}

check_text_strict() {
  local file_path="$1"
  local label="$2"
  local permission matches

  checked_any=1
  for permission in "${BLOCKED_PERMISSIONS[@]}"; do
    matches="$(grep -nF "$permission" "$file_path" || true)"
    if [[ -n "$matches" ]]; then
      mark_failure "$label" "$permission" "$matches"
    fi
  done
}

check_source_manifest_remove_markers() {
  local file_path="$1"
  local label="$2"
  local permission matches line bad_matches

  [[ -f "$file_path" ]] || return 0
  checked_any=1

  for permission in "${BLOCKED_PERMISSIONS[@]}"; do
    matches="$(grep -nF "$permission" "$file_path" || true)"
    [[ -n "$matches" ]] || continue

    bad_matches=""
    while IFS= read -r line; do
      if [[ "$line" != *'tools:node="remove"'* && "$line" != *"tools:node='remove'"* ]]; then
        bad_matches+="$line"$'\n'
      fi
    done <<< "$matches"

    if [[ -n "$bad_matches" ]]; then
      mark_failure "$label" "$permission" "$bad_matches"
    else
      echo "OK: $(relative_path "$file_path") removes $permission during manifest merge."
    fi
  done
}

check_release_manifests() {
  local manifest
  local found=0

  [[ -d "$MOBILE_DIR/android/app/build" ]] || return 0

  while IFS= read -r -d '' manifest; do
    found=1
    checked_final=1
    check_text_strict "$manifest" "$(relative_path "$manifest")"
  done < <(
    find "$MOBILE_DIR/android/app/build" -type f -name AndroidManifest.xml \
      \( -path "*/release/*" -o -path "*/Release/*" -o -path "*/bundleRelease/*" \) \
      -print0
  )

  if [[ "$found" -eq 1 ]]; then
    echo "Checked generated release manifest files under mobile/android/app/build."
  fi
}

check_aab_manifest() {
  local artifact_path="$1"
  local label
  label="$(relative_path "$artifact_path")"

  if command -v bundletool >/dev/null 2>&1; then
    local out_file="$TMP_DIR/bundletool-manifest.txt"
    if bundletool dump manifest --bundle="$artifact_path" --module=base >"$out_file" 2>"$TMP_DIR/bundletool.err"; then
      checked_any=1
      checked_final=1
      check_text_strict "$out_file" "$label base manifest"
      echo "Checked AAB base manifest with bundletool."
      return 0
    fi

    echo "WARNING: bundletool could not dump the AAB manifest; falling back to manifest strings." >&2
    cat "$TMP_DIR/bundletool.err" >&2
  fi

  if ! command -v unzip >/dev/null 2>&1 || ! command -v strings >/dev/null 2>&1; then
    echo "WARNING: unzip and strings are required for AAB fallback checks." >&2
    return 0
  fi

  local entry entry_index manifest_bin manifest_txt found
  entry_index=0
  found=0
  while IFS= read -r entry; do
    found=1
    entry_index=$((entry_index + 1))
    manifest_bin="$TMP_DIR/aab-manifest-$entry_index.bin"
    manifest_txt="$TMP_DIR/aab-manifest-$entry_index.txt"
    unzip -p "$artifact_path" "$entry" >"$manifest_bin"
    strings "$manifest_bin" >"$manifest_txt" || true
    checked_any=1
    checked_final=1
    check_text_strict "$manifest_txt" "$label:$entry"
  done < <(unzip -Z1 "$artifact_path" | grep -E '(^|/)AndroidManifest\.xml$' || true)

  if [[ "$found" -eq 0 ]]; then
    echo "WARNING: no AndroidManifest.xml entries were found inside $label." >&2
  else
    echo "Checked AAB manifest entries with strings fallback."
    echo "Manual final check, when bundletool is available:"
    echo "  bundletool dump manifest --bundle $(relative_path "$artifact_path") --module base"
  fi
}

check_apk_manifest() {
  local artifact_path="$1"
  local label
  label="$(relative_path "$artifact_path")"

  local aapt_path
  aapt_path="$(find_android_sdk_tool aapt || true)"
  if [[ -n "$aapt_path" ]]; then
    local out_file="$TMP_DIR/aapt-permissions.txt"
    "$aapt_path" dump permissions "$artifact_path" >"$out_file"
    checked_any=1
    checked_final=1
    check_text_strict "$out_file" "$label permissions"
    echo "Checked APK permissions with aapt."
    return 0
  fi

  if command -v apkanalyzer >/dev/null 2>&1; then
    local out_file="$TMP_DIR/apkanalyzer-permissions.txt"
    apkanalyzer manifest permissions "$artifact_path" >"$out_file"
    checked_any=1
    checked_final=1
    check_text_strict "$out_file" "$label permissions"
    echo "Checked APK permissions with apkanalyzer."
    return 0
  fi

  if ! command -v unzip >/dev/null 2>&1 || ! command -v strings >/dev/null 2>&1; then
    echo "WARNING: aapt, apkanalyzer, or unzip+strings is required for APK checks." >&2
    return 0
  fi

  local manifest_bin="$TMP_DIR/apk-manifest.bin"
  local manifest_txt="$TMP_DIR/apk-manifest.txt"
  unzip -p "$artifact_path" AndroidManifest.xml >"$manifest_bin"
  strings "$manifest_bin" >"$manifest_txt" || true
  checked_any=1
  checked_final=1
  check_text_strict "$manifest_txt" "$label manifest"
  echo "Checked APK manifest with strings fallback."
}

check_artifact() {
  local artifact_path="$1"

  if [[ ! -f "$artifact_path" ]]; then
    echo "WARNING: artifact not found at $(relative_path "$artifact_path"); skipping direct artifact check." >&2
    return 0
  fi

  case "$artifact_path" in
    *.aab)
      check_aab_manifest "$artifact_path"
      ;;
    *.apk)
      check_apk_manifest "$artifact_path"
      ;;
    *)
      echo "WARNING: unsupported artifact extension for $(relative_path "$artifact_path"); expected .aab or .apk." >&2
      ;;
  esac
}

cat <<'EOF'
========================================
 MANAS Android Media Permission Check
========================================
Blocked permissions:
  android.permission.READ_MEDIA_VIDEO
  android.permission.READ_MEDIA_IMAGES
  android.permission.READ_EXTERNAL_STORAGE
  android.permission.WRITE_EXTERNAL_STORAGE

EOF

check_release_manifests
check_source_manifest_remove_markers "$MOBILE_DIR/android/app/src/main/AndroidManifest.xml" "mobile/android/app/src/main/AndroidManifest.xml"
check_artifact "$ARTIFACT_PATH"

if [[ "$checked_any" -eq 0 ]]; then
  cat >&2 <<'EOF'
ERROR: No generated Android manifests or Android artifacts were found to check.
Run a prebuild/build first, for example:
  cd mobile && npx expo prebuild --platform android --clean
  ./scripts/build-android_release-aab.sh
EOF
  exit 1
fi

if [[ "$failed" -ne 0 ]]; then
  echo "FAIL: Broad photo/video storage permissions are still present." >&2
  exit 1
fi

if [[ "$checked_final" -eq 0 ]]; then
  cat >&2 <<'EOF'
WARNING: Only source manifest removal markers were checked. For Play Console verification, build a fresh AAB and rerun:
  ./scripts/build-android_release-aab.sh
  ./scripts/verify-android-media-permissions.sh dist/manas-release.aab
EOF
fi

echo "PASS: No broad photo/video storage permissions were found in checked Android release manifests/artifacts."
