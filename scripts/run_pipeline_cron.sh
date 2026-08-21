#!/usr/bin/env bash
# run_pipeline_cron.sh — Cron-safe wrapper for the C2C pipeline.
#
# Reads the eBay gateway token from ~/.ebay-claude-code.txt, checks if it's
# still valid, then runs the full pipeline. Sends a macOS notification if
# the token is expired or expiring within 24 hours.

set -uo pipefail
cd "$(dirname "$0")/.."

LOG="$HOME/.c2c-pipeline.log"
TOKEN_FILE="$HOME/.ebay-claude-code.txt"
NOTIFY_TITLE="C2C Dashboard"

log() { echo "[$(date '+%Y-%m-%d %H:%M')] $*" | tee -a "$LOG"; }
notify() { osascript -e "display notification \"$1\" with title \"$NOTIFY_TITLE\"" 2>/dev/null || true; }

log "=== Pipeline starting ==="

# ── Check token ────────────────────────────────────────────────────────────
if [ ! -f "$TOKEN_FILE" ]; then
  log "ERROR: Token file not found at $TOKEN_FILE"
  notify "Token file missing — run: npx @ebay/claude-code-token@latest get_token"
  exit 1
fi

TOKEN=$(cat "$TOKEN_FILE")

# Decode JWT expiry (middle segment, base64url → JSON)
EXP=$(python3 -c "
import base64, json, sys
try:
    seg = '$TOKEN'.split('.')[1]
    seg += '=' * (-len(seg) % 4)
    print(json.loads(base64.urlsafe_b64decode(seg))['exp'])
except Exception as e:
    print(0)
")

NOW=$(date +%s)
HOURS_LEFT=$(( (EXP - NOW) / 3600 ))

if [ "$EXP" -eq 0 ] || [ "$NOW" -ge "$EXP" ]; then
  log "ERROR: eBay API token is expired. Renew with: npx @ebay/claude-code-token@latest get_token"
  notify "⚠️ Token expired — pipeline skipped. Run: npx @ebay/claude-code-token@latest get_token"
  exit 1
fi

if [ "$HOURS_LEFT" -le 24 ]; then
  log "WARN: Token expires in ${HOURS_LEFT}h — renew soon"
  notify "⚠️ Token expires in ${HOURS_LEFT}h — renew with: npx @ebay/claude-code-token@latest get_token"
fi

# ── Run pipeline ───────────────────────────────────────────────────────────
export ANTHROPIC_API_KEY="$TOKEN"
export ANTHROPIC_BASE_URL="https://platformgateway2.vip.ebay.com/hubgptgatewaysvc/v1/anthropic"

if bash scripts/run_pipeline.sh >> "$LOG" 2>&1; then
  TOTAL=$(python3 -c "import json; s=json.load(open('data/processed/signals.json')); print(len(s))" 2>/dev/null || echo "?")
  log "Pipeline complete — $TOTAL signals"

  # Push updated signals.json to trigger GitHub Pages rebuild
  if git diff --quiet data/processed/signals.json; then
    log "No new signals — skipping git push"
  else
    git add data/processed/signals.json >> "$LOG" 2>&1
    git commit -m "chore: update signals [$(date '+%Y-%m-%d')]" >> "$LOG" 2>&1
    git push origin main >> "$LOG" 2>&1 && log "Pushed signals.json → GitHub Pages rebuild triggered" \
      || log "WARN: git push failed"
  fi

  notify "Pipeline complete — $TOTAL signals in dashboard"
else
  log "ERROR: Pipeline failed (exit $?)"
  notify "❌ Pipeline failed — check ~/.c2c-pipeline.log"
fi
