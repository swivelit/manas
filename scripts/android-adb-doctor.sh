#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

REPAIR_ADB="${REPAIR_ADB:-true}"
ADB_SERVER_PORT="${ADB_SERVER_PORT:-5037}"
ADB_START_TIMEOUT_SECONDS="${ADB_START_TIMEOUT_SECONDS:-20}"

export ADB_SERVER_PORT
export ADB_MDNS_AUTO_CONNECT=0
export ADB_MDNS_OPENSCREEN=0

error() {
  echo "ERROR: $*" >&2
  exit 1
}

validate_bool() {
  local name="$1"
  local value="$2"
  if [[ "$value" != "true" && "$value" != "false" ]]; then
    error "$name must be true or false. Current value: $value"
  fi
}

run_with_timeout() {
  local seconds="$1"
  shift
  local command_pid timer_pid status

  "$@" &
  command_pid="$!"

  (
    sleep "$seconds"
    if kill -0 "$command_pid" >/dev/null 2>&1; then
      kill "$command_pid" >/dev/null 2>&1 || true
    fi
  ) &
  timer_pid="$!"

  set +e
  wait "$command_pid"
  status="$?"
  set -e

  kill "$timer_pid" >/dev/null 2>&1 || true
  wait "$timer_pid" >/dev/null 2>&1 || true

  if [[ "$status" -eq 130 || "$status" -eq 137 || "$status" -eq 143 ]]; then
    echo "ERROR: timed out after ${seconds}s: $*" >&2
    return 124
  fi

  return "$status"
}

find_android_sdk() {
  local candidates=()
  [[ -n "${ANDROID_SDK_ROOT:-}" ]] && candidates+=("$ANDROID_SDK_ROOT")
  [[ -n "${ANDROID_HOME:-}" ]] && candidates+=("$ANDROID_HOME")
  candidates+=("$HOME/Library/Android/sdk" "$HOME/Android/Sdk")

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate/platform-tools/adb" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

find_adb() {
  if command -v adb >/dev/null 2>&1; then
    command -v adb
    return 0
  fi

  local sdk_dir
  sdk_dir="$(find_android_sdk || true)"
  if [[ -n "$sdk_dir" && -x "$sdk_dir/platform-tools/adb" ]]; then
    export ANDROID_SDK_ROOT="$sdk_dir"
    export ANDROID_HOME="$sdk_dir"
    export PATH="$sdk_dir/platform-tools:$PATH"
    printf '%s\n' "$sdk_dir/platform-tools/adb"
    return 0
  fi

  return 1
}

process_args() {
  local pid="$1"
  ps -p "$pid" -o args= 2>/dev/null || true
}

process_comm_basename() {
  local pid="$1"
  local comm
  comm="$(ps -p "$pid" -o comm= 2>/dev/null || true)"
  basename "$comm" 2>/dev/null || true
}

is_adb_process() {
  local pid="$1"
  local base args
  base="$(process_comm_basename "$pid")"
  args="$(process_args "$pid")"

  [[ "$base" == "adb" || "$args" == adb[[:space:]]* || "$args" == *"/adb "* ]]
}

kill_adb_pid() {
  local pid="$1"
  local reason="$2"

  [[ "$pid" =~ ^[0-9]+$ ]] || return 0
  if ! kill -0 "$pid" >/dev/null 2>&1; then
    return 0
  fi

  if ! is_adb_process "$pid"; then
    echo "Not killing non-adb process $pid ($reason): $(process_args "$pid")" >&2
    return 1
  fi

  echo "Killing stale adb process $pid ($reason): $(process_args "$pid")"
  kill "$pid" >/dev/null 2>&1 || true
  sleep 1
  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "adb process $pid did not exit after TERM; sending KILL."
    kill -9 "$pid" >/dev/null 2>&1 || true
  fi
}

kill_stale_adb_servers() {
  local pid args

  if command -v pgrep >/dev/null 2>&1; then
    while IFS= read -r pid; do
      [[ -n "$pid" ]] || continue
      args="$(process_args "$pid")"
      if [[ "$args" == *"fork-server server"* || "$args" == *"server nodaemon"* ]]; then
        kill_adb_pid "$pid" "stale adb server"
      fi
    done < <(pgrep -x adb 2>/dev/null || true)
  fi
}

check_adb_port() {
  if ! command -v lsof >/dev/null 2>&1; then
    echo "lsof not found; skipping TCP:$ADB_SERVER_PORT listener check."
    return 0
  fi

  local saw_listener="false"
  local command_name pid rest

  while read -r command_name pid rest; do
    [[ -n "${command_name:-}" ]] || continue
    [[ "$command_name" == "COMMAND" ]] && continue
    saw_listener="true"

    if [[ "$command_name" == "adb" ]]; then
      kill_adb_pid "$pid" "listening on tcp:$ADB_SERVER_PORT"
    else
      echo "TCP:$ADB_SERVER_PORT is already used by non-adb process $pid ($command_name); not killing it." >&2
      echo "Use lsof to inspect it before deciding whether to stop that process." >&2
    fi
  done < <(lsof -nP -iTCP:"$ADB_SERVER_PORT" -sTCP:LISTEN 2>/dev/null || true)

  if [[ "$saw_listener" == "false" ]]; then
    echo "No process is listening on TCP:$ADB_SERVER_PORT."
  fi
}

manual_recovery() {
  cat <<EOF

Manual ADB recovery commands:
  adb kill-server
  pkill -f adb
  lsof -nP -iTCP:5037 -sTCP:LISTEN
  kill -9 <pid>
  adb start-server
  adb devices -l
EOF

  if [[ "$ADB_SERVER_PORT" != "5037" ]]; then
    cat <<EOF

This run used ADB_SERVER_PORT=$ADB_SERVER_PORT. If you keep using that custom
port, prefix adb commands with:
  ADB_SERVER_PORT=$ADB_SERVER_PORT
EOF
  fi
}

validate_bool "REPAIR_ADB" "$REPAIR_ADB"
[[ "$ADB_START_TIMEOUT_SECONDS" =~ ^[0-9]+$ && "$ADB_START_TIMEOUT_SECONDS" -gt 0 ]] || error "ADB_START_TIMEOUT_SECONDS must be a positive integer."
[[ "$ADB_SERVER_PORT" =~ ^[0-9]+$ && "$ADB_SERVER_PORT" -gt 0 ]] || error "ADB_SERVER_PORT must be a positive integer."

ADB_BIN="$(find_adb || true)"
[[ -n "$ADB_BIN" ]] || error "adb was not found. Install Android platform-tools or set ANDROID_SDK_ROOT/ANDROID_HOME."

ADB_DIR="$(cd "$(dirname "$ADB_BIN")" && pwd)"
export PATH="$ADB_DIR:$PATH"

cat <<EOF
========================================
 MANAS Android ADB Doctor
========================================
Repo: $ROOT_DIR
adb path: $ADB_BIN
ADB_SERVER_PORT: $ADB_SERVER_PORT
ADB_MDNS_AUTO_CONNECT: $ADB_MDNS_AUTO_CONNECT
ADB_MDNS_OPENSCREEN: $ADB_MDNS_OPENSCREEN
EOF

"$ADB_BIN" version || true
echo

if [[ "$REPAIR_ADB" == "true" ]]; then
  echo "Repairing adb server state."
  run_with_timeout "$ADB_START_TIMEOUT_SECONDS" "$ADB_BIN" kill-server || true
  kill_stale_adb_servers
  check_adb_port
else
  echo "REPAIR_ADB=false; skipping adb kill/restart cleanup."
fi

echo "Starting adb server."
if ! run_with_timeout "$ADB_START_TIMEOUT_SECONDS" "$ADB_BIN" start-server; then
  echo "ERROR: adb start-server failed." >&2
  manual_recovery >&2
  exit 1
fi

echo
echo "Connected adb devices:"
if ! run_with_timeout "$ADB_START_TIMEOUT_SECONDS" "$ADB_BIN" devices -l; then
  echo "ERROR: adb devices -l failed." >&2
  manual_recovery >&2
  exit 1
fi

echo
echo "ADB doctor completed."
