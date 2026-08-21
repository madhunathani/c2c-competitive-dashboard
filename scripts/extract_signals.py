"""
extract_signals.py — Use an LLM to extract candidate signals from raw documents.

Reads:  data/raw/**/*.json
Writes: data/processed/candidates_<date>.json
"""

import json
import os
from datetime import datetime
from pathlib import Path

import anthropic

ROOT = Path(__file__).parent.parent
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

PROMPT = """You are a competitive intelligence analyst for an e-commerce marketplace.
Given the following source text, extract signals related to seller acquisition, listing, or retention flows.

EXCLUSION RULES — never extract these:
- Any signal where eBay itself is the acting company (eBay is not a tracked competitor).
- Any signal primarily about the eBay acquisition of Depop (e.g. deal announcement, CMA clearance, closing date, integration updates). This is internal eBay news, not a competitive signal.
- If a source is entirely about eBay's actions, return [].

SOURCE QUALITY RULES — apply before extracting:
- Official company channels (company_blog, press_release, company_announcement, product_page): extract signals that describe real, concrete actions the company has taken or announced.
- Reputable trade/industry press (trade_press) focused on retail, e-commerce, digital commerce, marketing, influencers, or social platforms: extract signals that report on verified competitor actions. Prefer original reporting over aggregated or speculative pieces.
- If the source appears to be a generic marketing blog, thin promotional content, or low-quality SEO content farm, return [].
- If multiple signals from this source cover the same underlying development, emit only the most informative one.
- Do not extract signals that are speculative, opinion-only, or lack a concrete company action.

For each valid signal return a JSON object with:
- title: short action title (< 80 chars)
- description: 2–3 sentence explanation of the concrete action
- journey_stage: one of [acquisition, listing, sale, engagement_retention, multi_stage]
- lever: one of [promotions, marketing, onboarding, seller_trust, draft_reentry, resell_entry_point, fees_monetization, listing_tools, ai_assistant, search_visibility, price_guidance, shipping_fulfillment, bx_nudges, seller_protections, balance_wallet]
- seller_segment: one of [prospect, new_seller, reactivated_seller, churned_seller, occasional_seller, regular_seller, nora, norl, nors, multi_segment]
- action_type: e.g. feature_launch, pricing_change, partnership, policy_change, program_launch, ux_change, algorithm_change

Source:
Company: {company}
URL: {url}
Type: {source_type}

Text:
{text}

Return a JSON array only. If no relevant signals found, return [].
"""

MAX_TEXT_CHARS = 8_000


def extract_from_document(client: anthropic.Anthropic, doc: dict) -> list[dict]:
    text = doc.get("text", "")[:MAX_TEXT_CHARS]
    prompt = PROMPT.format(
        company=doc["company"],
        url=doc["url"],
        source_type=doc.get("source_type", "unknown"),
        text=text,
    )
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    try:
        start = raw.index("[")
        end = raw.rindex("]") + 1
        return json.loads(raw[start:end])
    except (ValueError, json.JSONDecodeError) as e:
        print(f"  WARN: could not parse JSON from model response: {e}")
        return []


def make_client():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("Set ANTHROPIC_API_KEY in your environment or .env.local")
    base_url = os.environ.get("ANTHROPIC_BASE_URL")
    kwargs = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url
        kwargs["default_headers"] = {"Authorization": f"Bearer {api_key}"}
    return anthropic.Anthropic(**kwargs)


def run():
    client = make_client()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    all_candidates = []

    raw_files = sorted(RAW_DIR.glob("**/*.json"))
    print(f"Processing {len(raw_files)} raw documents…")

    for path in raw_files:
        doc = json.loads(path.read_text())
        print(f"  Extracting from: {doc['company']} / {path.name}")
        signals = extract_from_document(client, doc)

        doc_published = doc.get("published_date")
        for s in signals:
            s["company"] = doc["company"]
            s["source_url"] = doc["url"]
            s["source_type"] = doc.get("source_type", "unknown")
            s["ingested_date"] = today
            if doc_published:
                s["published_date"] = doc_published

        all_candidates.extend(signals)
        print(f"    → {len(signals)} signals extracted")

    out = PROCESSED_DIR / f"candidates_{today}.json"
    out.write_text(json.dumps(all_candidates, indent=2, ensure_ascii=False))
    print(f"Wrote {len(all_candidates)} candidates to {out.name}")


if __name__ == "__main__":
    print("=== extract_signals ===")
    run()
    print("Done.")
