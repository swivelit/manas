#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
MOBILE_DIR="$REPO_ROOT/mobile"
BUILD_TYPE="${BUILD_TYPE:-release}"

if [[ "$BUILD_TYPE" != "release" && "$BUILD_TYPE" != "debug" && "$BUILD_TYPE" != "bundle" ]]; then
  echo "BUILD_TYPE must be release, debug, or bundle" >&2
  exit 1
fi

if [[ ! -d "$MOBILE_DIR" ]]; then
  echo "mobile/ directory not found at $MOBILE_DIR" >&2
  exit 1
fi

ORIGINAL_ENV_KEYS=()
while IFS='=' read -r key _; do
  ORIGINAL_ENV_KEYS+=("$key")
done < <(env)

is_original_env() {
  local key="$1"
  local existing
  for existing in "${ORIGINAL_ENV_KEYS[@]}"; do
    if [[ "$existing" == "$key" ]]; then
      return 0
    fi
  done
  return 1
}

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0

  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    local line key value quote
    line="$(trim "${raw_line%$'\r'}")"
    [[ -z "$line" || "${line:0:1}" == "#" ]] && continue

    if [[ "$line" == export[[:space:]]* ]]; then
      line="$(trim "${line#export}")"
    fi

    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="$(trim "${BASH_REMATCH[2]}")"

      if is_original_env "$key"; then
        continue
      fi

      if [[ ${#value} -ge 2 ]]; then
        quote="${value:0:1}"
        if [[ "$quote" == "\"" && "${value: -1}" == "\"" ]]; then
          value="${value:1:${#value}-2}"
        elif [[ "$quote" == "'" && "${value: -1}" == "'" ]]; then
          value="${value:1:${#value}-2}"
        fi
      fi

      export "$key=$value"
    fi
  done < "$file"
}

load_env_file "$MOBILE_DIR/.env"
if [[ "$BUILD_TYPE" == "release" || "$BUILD_TYPE" == "bundle" ]]; then
  load_env_file "$MOBILE_DIR/.env.production"
fi
load_env_file "$MOBILE_DIR/.env.local"

if [[ -n "${API_BASE_URL:-}" ]] && ! is_original_env "EXPO_PUBLIC_API_URL"; then
  export EXPO_PUBLIC_API_URL="$API_BASE_URL"
fi

if [[ -z "${NODE_ENV:-}" ]]; then
  if [[ "$BUILD_TYPE" == "release" || "$BUILD_TYPE" == "bundle" ]]; then
    export NODE_ENV=production
  else
    export NODE_ENV=development
  fi
fi

for command_name in node npm java unzip; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name" >&2
    exit 1
  fi
done

SDK_CANDIDATES=()
[[ -n "${ANDROID_SDK_ROOT:-}" ]] && SDK_CANDIDATES+=("$ANDROID_SDK_ROOT")
[[ -n "${ANDROID_HOME:-}" ]] && SDK_CANDIDATES+=("$ANDROID_HOME")
SDK_CANDIDATES+=("$HOME/Library/Android/sdk" "$HOME/Android/Sdk")

ANDROID_SDK=""
for candidate in "${SDK_CANDIDATES[@]}"; do
  if [[ -d "$candidate" ]]; then
    ANDROID_SDK="$candidate"
    break
  fi
done

if [[ -z "$ANDROID_SDK" ]]; then
  echo "Android SDK not found. Set ANDROID_SDK_ROOT or ANDROID_HOME." >&2
  exit 1
fi

export ANDROID_SDK_ROOT="$ANDROID_SDK"
export ANDROID_HOME="$ANDROID_SDK"
export PATH="$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH"

cd "$MOBILE_DIR"

if [[ -f package-lock.json ]]; then
  npm ci --include=dev
else
  npm install --include=dev
fi

npx expo --version
CI=1 npx expo config --type public
CI=1 npx expo prebuild --platform android --clean

cat > android/local.properties <<EOF
sdk.dir=$ANDROID_SDK_ROOT
EOF

if [[ "$BUILD_TYPE" == "debug" ]]; then
  (cd android && ./gradlew assembleDebug)
  ARTIFACT_SOURCE="$MOBILE_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
  ARTIFACT_DEST="$REPO_ROOT/dist/manas-debug.apk"
  ARTIFACT_KIND="APK"
elif [[ "$BUILD_TYPE" == "release" ]]; then
  (cd android && ./gradlew assembleRelease)
  ARTIFACT_SOURCE="$MOBILE_DIR/android/app/build/outputs/apk/release/app-release.apk"
  ARTIFACT_DEST="$REPO_ROOT/dist/manas-release.apk"
  ARTIFACT_KIND="APK"
else
  (cd android && ./gradlew bundleRelease)
  ARTIFACT_SOURCE="$MOBILE_DIR/android/app/build/outputs/bundle/release/app-release.aab"
  ARTIFACT_DEST="$REPO_ROOT/dist/manas-release.aab"
  ARTIFACT_KIND="AAB"
fi

mkdir -p "$REPO_ROOT/dist"
cp "$ARTIFACT_SOURCE" "$ARTIFACT_DEST"

if [[ ! -f "$ARTIFACT_DEST" ]]; then
  echo "$ARTIFACT_KIND was not created at $ARTIFACT_DEST" >&2
  exit 1
fi

echo "$ARTIFACT_KIND created: $ARTIFACT_DEST"
if [[ "$ARTIFACT_KIND" == "APK" ]]; then
  echo "Install with: adb install -r ${ARTIFACT_DEST#$REPO_ROOT/}"
else
  echo "Bundle output: ${ARTIFACT_DEST#$REPO_ROOT/}"
fi
