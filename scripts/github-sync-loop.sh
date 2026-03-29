#!/usr/bin/env bash
set -euo pipefail

INTERVAL="${GITHUB_SYNC_INTERVAL:-300}"

echo "GitHub Sync loop started. Syncing every ${INTERVAL} seconds."
echo "Target: ${GITHUB_REPO_URL:-https://github.com/aquilamoyo47-blip/Lex-Superior}"

while true; do
  echo "--- Sync run at $(date -u '+%Y-%m-%d %H:%M:%S UTC') ---"
  bash "$(dirname "$0")/github-sync.sh" || echo "WARN: Sync failed this round, will retry next interval."
  echo "Next sync in ${INTERVAL} seconds..."
  sleep "$INTERVAL"
done
