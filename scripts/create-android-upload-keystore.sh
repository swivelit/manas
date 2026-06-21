#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_STORE_FILE="keystores/manas-upload-key.jks"
DEFAULT_KEY_ALIAS="manas-upload"
STORE_FILE="${MANAS_UPLOAD_STORE_FILE:-$DEFAULT_STORE_FILE}"
KEY_ALIAS="${MANAS_UPLOAD_KEY_ALIAS:-$DEFAULT_KEY_ALIAS}"
PROPERTIES_FILE="$REPO_ROOT/release-signing.properties"

if [[ "$STORE_FILE" = /* ]]; then
  STORE_FILE_ABS="$STORE_FILE"
else
  STORE_FILE_ABS="$REPO_ROOT/$STORE_FILE"
fi

prompt_secret() {
  local label="$1"
  local first second

  printf '%s: ' "$label" >&2
  IFS= read -r -s first
  printf '\n' >&2
  printf 'Confirm %s: ' "$label" >&2
  IFS= read -r -s second
  printf '\n' >&2

  if [[ "$first" != "$second" ]]; then
    echo "ERROR: Passwords did not match." >&2
    exit 1
  fi

  if [[ ${#first} -lt 6 ]]; then
    echo "ERROR: Android keystore passwords must be at least 6 characters." >&2
    exit 1
  fi

  printf '%s' "$first"
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $command_name" >&2
    exit 1
  fi
}

cat <<EOF
========================================
 MANAS Android upload keystore
========================================
Keystore path: $STORE_FILE
Key alias: $KEY_ALIAS

This creates local release signing credentials for Play Console AABs.
The keystore and release-signing.properties file are gitignored and must never be committed.
EOF

require_command keytool

if [[ -e "$STORE_FILE_ABS" ]]; then
  echo "ERROR: Keystore already exists at $STORE_FILE_ABS" >&2
  echo "Move it out of the way before generating a new upload key." >&2
  exit 1
fi

if [[ -e "$PROPERTIES_FILE" ]]; then
  echo "ERROR: release-signing.properties already exists at $PROPERTIES_FILE" >&2
  echo "Move it out of the way before generating a new upload key." >&2
  exit 1
fi

STORE_PASSWORD="$(prompt_secret "Upload keystore password")"
KEY_PASSWORD="$(prompt_secret "Upload key password")"

mkdir -p "$(dirname "$STORE_FILE_ABS")"

keytool -genkeypair \
  -v \
  -storetype JKS \
  -keystore "$STORE_FILE_ABS" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=MANAS Upload, OU=MANAS, O=Jey Groups, L=Chennai, ST=Tamil Nadu, C=IN" \
  -storepass "$STORE_PASSWORD" \
  -keypass "$KEY_PASSWORD"

chmod 600 "$STORE_FILE_ABS"

umask 077
{
  printf 'MANAS_UPLOAD_STORE_FILE=%s\n' "$STORE_FILE"
  printf 'MANAS_UPLOAD_STORE_PASSWORD=%s\n' "$STORE_PASSWORD"
  printf 'MANAS_UPLOAD_KEY_ALIAS=%s\n' "$KEY_ALIAS"
  printf 'MANAS_UPLOAD_KEY_PASSWORD=%s\n' "$KEY_PASSWORD"
} > "$PROPERTIES_FILE"

unset STORE_PASSWORD
unset KEY_PASSWORD

cat <<EOF

========================================
 MANAS upload keystore created
========================================
Created:
  $STORE_FILE
  release-signing.properties

Next:
  ./scripts/build-android_release-aab.sh

Cloud alternative:
  cd mobile && eas build --platform android --profile production

Keep the keystore and passwords backed up securely. If the Play app is enrolled in
Play App Signing, this is the upload key you will use for future local uploads.
EOF
