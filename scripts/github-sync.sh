#!/usr/bin/env bash
set -euo pipefail

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "ERROR: GITHUB_TOKEN is not set. Cannot push to GitHub."
  exit 1
fi

REPO_URL="${GITHUB_REPO_URL:-https://github.com/aquilamoyo47-blip/Lex-Superior}"
REPO_PATH="${REPO_URL#https://}"
AUTH_URL="https://${GITHUB_TOKEN}@${REPO_PATH}"

cd "$(git rev-parse --show-toplevel)"

git config user.email "replit-sync@replit.com" 2>/dev/null || true
git config user.name "Replit Sync" 2>/dev/null || true

if ! git remote get-url github &>/dev/null; then
  git remote add github "$REPO_URL"
  echo "Added 'github' remote (unauthenticated URL)."
else
  git remote set-url github "$REPO_URL"
fi

if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  git add -A
  TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
  git commit -m "chore: auto-sync at ${TIMESTAMP}" || true
  echo "Committed pending changes."
else
  echo "No changes to commit."
fi

echo "Pushing master to GitHub..."
git push "$AUTH_URL" "master:master" --force
echo "Done. Successfully pushed to GitHub."
