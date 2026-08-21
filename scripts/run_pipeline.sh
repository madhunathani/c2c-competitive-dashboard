#!/usr/bin/env bash
# run_pipeline.sh — Full C2C competitive intelligence pipeline.
#
# Required env vars:
#   ANTHROPIC_API_KEY      — eBay gateway token (npx @ebay/claude-code-token@latest get_token)
#   ANTHROPIC_BASE_URL     — https://platformgateway2.vip.ebay.com/hubgptgatewaysvc/v1/anthropic
#   SLACK_BOT_TOKEN        — xoxb-... bot token with channels:history + channels:read

set -euo pipefail
cd "$(dirname "$0")/.."

echo "================================================"
echo "  C2C Competitive Intelligence Pipeline"
echo "  $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "================================================"

# 1. Fetch from configured web sources
echo ""
echo "── Step 1: Fetch web sources ───────────────────"
python3 scripts/fetch_sources.py

# 2. Fetch links shared in Slack channels
echo ""
echo "── Step 2: Fetch Slack channel links ───────────"
if [ -z "${SLACK_BOT_TOKEN:-}" ]; then
  echo "  SKIP: SLACK_BOT_TOKEN not set"
else
  python3 scripts/fetch_slack_sources.py
fi

# 3. Extract signals via LLM
echo ""
echo "── Step 3: Extract signals ─────────────────────"
python3 scripts/extract_signals.py

# 4. Map / normalise fields
echo ""
echo "── Step 4: Map signals ─────────────────────────"
python3 scripts/map_signals.py

# 5. Deduplicate
echo ""
echo "── Step 5: Deduplicate ─────────────────────────"
python3 scripts/dedupe_signals.py

# 6. Score and generate eBay implications
echo ""
echo "── Step 6: Score signals ───────────────────────"
python3 scripts/score_signals.py

# 7. Write final snapshot
echo ""
echo "── Step 7: Write snapshot ──────────────────────"
python3 scripts/write_snapshots.py

echo ""
echo "================================================"
echo "  Pipeline complete."
echo "================================================"
