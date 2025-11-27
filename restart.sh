#!/usr/bin/env bash
# Restart helper for AutoTranscribe: stops any running startAll/child watchers
# and relaunches startAll in the background.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
NODE_BIN="${NODE_BIN:-node}"
START_SCRIPT="$ROOT/src/node/startAll.js"
LOG_FILE="${LOG_FILE:-/tmp/autotranscribe.out}"
# Increase file descriptor limit to avoid EMFILE from chokidar watchers.
FILE_LIMIT="${FILE_LIMIT:-4096}"
# Prefer polling to reduce watcher FD usage; tweak interval if needed.
export CHOKIDAR_USEPOLLING="${CHOKIDAR_USEPOLLING:-true}"
export CHOKIDAR_INTERVAL="${CHOKIDAR_INTERVAL:-1000}"

echo "[restart] Checking existing processes..."
pgrep -fl "$START_SCRIPT" || echo "  (no startAll)"
pgrep -fl "ingestJustPressRecord.js" || echo "  (no ingestJustPressRecord)"
pgrep -fl "watcher.js" || echo "  (no watcher)"

kill_group() {
  local label="$1"
  local pattern="$2"
  local attempts=0
  while true; do
    local pids
    pids=$(pgrep -f "$pattern" || true)
    if [[ -z "$pids" ]]; then
      if (( attempts == 0 )); then
        echo "  (no $label)"
      else
        echo "  $label stopped"
      fi
      break
    fi

    attempts=$((attempts + 1))
    echo "  Stopping $label (attempt $attempts): $pids"
    echo "$pids" | xargs -r kill 2>/dev/null || true
    for pid in $pids; do
      pkill -P "$pid" 2>/dev/null || true
    done
    sleep 0.5

    pids=$(pgrep -f "$pattern" || true)
    if [[ -n "$pids" ]]; then
      echo "  Forcing $label: $pids"
      echo "$pids" | xargs -r kill -9 2>/dev/null || true
      sleep 0.5
    fi

    if (( attempts >= 5 )); then
      pids=$(pgrep -f "$pattern" || true)
      if [[ -n "$pids" ]]; then
        echo "  $label still running after retries: $pids"
      fi
      break
    fi
  done
}

echo "[restart] Stopping existing processes..."
kill_group "startAll" "$START_SCRIPT"
kill_group "ingestJustPressRecord" "ingestJustPressRecord.js"
kill_group "watcher" "watcher.js"

echo "[restart] Setting file limit to $FILE_LIMIT"
ulimit -n "$FILE_LIMIT" 2>/dev/null || echo "  (could not raise ulimit, continuing)"

echo "[restart] Starting: $START_SCRIPT"
nohup "$NODE_BIN" "$START_SCRIPT" >"$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "[restart] Started with PID $NEW_PID"
echo "[restart] Waiting for child processes to appear..."
for i in {1..10}; do
  sleep 0.5
  ingest=$(pgrep -fl "ingestJustPressRecord.js" || true)
  watch=$(pgrep -fl "watcher.js" || true)
  [[ -n "$ingest" && -n "$watch" ]] && break
done

echo "[restart] Active processes now:"
pgrep -fl "$START_SCRIPT" || echo "  (startAll not found yet)"
pgrep -fl "ingestJustPressRecord.js" || echo "  (ingestJustPressRecord not found yet)"
pgrep -fl "watcher.js" || echo "  (watcher not found yet)"

# Ensure only the freshly started instance remains; kill any extra startAll and their children.
echo "[restart] Cleaning up any extra instances..."
pgrep -f "$START_SCRIPT" | grep -v "$NEW_PID" | xargs -r kill 2>/dev/null || true
pgrep -f "$START_SCRIPT" | grep -v "$NEW_PID" | xargs -r kill -9 2>/dev/null || true

# Kill orphaned watchers/ingesters not owned by the new startAll.
for pattern in "ingestJustPressRecord.js" "watcher.js"; do
  pgrep -fl "$pattern" >/dev/null || continue
  while read -r pid ppid; do
    if [[ "$ppid" != "$NEW_PID" ]]; then
      kill "$pid" 2>/dev/null || true
      kill -9 "$pid" 2>/dev/null || true
    fi
  done < <(pgrep -f "$pattern" | xargs -I{} ps -o pid=,ppid= -p {})
done

echo "[restart] Final process snapshot:"
pgrep -fl "$START_SCRIPT" || echo "  (startAll not found)"
pgrep -fl "ingestJustPressRecord.js" || echo "  (ingestJustPressRecord not found)"
pgrep -fl "watcher.js" || echo "  (watcher not found)"
echo "[restart] Logs: $LOG_FILE"
