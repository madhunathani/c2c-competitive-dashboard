"""
score_signals.py — Score each signal on relevance, magnitude, novelty, confidence, recency.

Reads:  data/processed/mapped_<date>.json
Writes: data/processed/scored_<date>.json
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

import anthropic

ROOT = Path(__file__).parent.parent
PROCESSED_DIR = ROOT / "data" / "processed"

SCORE_PROMPT = """You are a competitive intelligence scoring specialist for eBay.
Score this competitive signal on four dimensions (integer 1–10 each):

- relevance: How directly does this affect eBay's seller acquisition or listing funnel?
- magnitude: How large is the potential impact on seller behavior at scale?
- novelty: How new or unexpected is this action for this company?
- confidence: How certain are you this signal is accurate and complete?
  Calibrate confidence using source type:
  - company_blog / press_release / company_announcement → start high (8–10), reduce if vague
  - trade_press from reputable industry outlets (e-commerce, retail, digital commerce) → 6–8
  - product_page → 5–7 (may be aspirational or evergreen marketing copy)
  - unknown or generic blog → 3–5

Signal:
Company: {company}
Title: {title}
Description: {description}
Journey Stage: {journey_stage}
Lever: {lever}
Seller Segment: {seller_segment}
Source Type: {source_type}
Source URL: {source_url}

Return only JSON: {{ "relevance": N, "magnitude": N, "novelty": N, "confidence": N }}"""

IMPL_PROMPT = """You are a competitive strategy advisor for eBay.
In 2–3 sentences, explain what this signal means for eBay and what action eBay should consider.
Focus on seller acquisition and listing implications. Be specific and actionable.

Company: {company}
Title: {title}
Description: {description}
Journey Stage: {journey_stage}
Lever: {lever}"""

WEIGHTS = {"relevance": 0.30, "magnitude": 0.25, "novelty": 0.20, "confidence": 0.15, "recency": 0.10}


def recency_score(date_str: str) -> int:
    try:
        days = (datetime.utcnow() - datetime.fromisoformat(date_str)).days
    except ValueError:
        return 5
    if days <= 7: return 10
    if days <= 14: return 8
    if days <= 30: return 6
    if days <= 60: return 4
    if days <= 90: return 2
    return 1


def composite(scores: dict) -> float:
    return round(
        sum(scores[k] * WEIGHTS[k] for k in ("relevance", "magnitude", "novelty", "confidence"))
        + scores["recency"] * WEIGHTS["recency"],
        1,
    )


def priority(score: float) -> str:
    if score >= 8.0: return "high"
    if score >= 6.5: return "medium"
    return "low"


def score_one(client: anthropic.Anthropic, signal: dict) -> dict:
    prompt = SCORE_PROMPT.format(**{k: signal.get(k, "") for k in
        ["company", "title", "description", "journey_stage", "lever", "seller_segment",
         "source_type", "source_url"]})

    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text.strip()
    try:
        start, end = raw.index("{"), raw.rindex("}") + 1
        s = json.loads(raw[start:end])
        s = {k: max(1, min(10, int(v))) for k, v in s.items()}
    except (ValueError, json.JSONDecodeError):
        s = {"relevance": 5, "magnitude": 5, "novelty": 5, "confidence": 5}

    s["recency"] = recency_score(signal.get("published_date", signal.get("ingested_date", "")))
    s["composite"] = composite(s)
    return s


def get_implications(client: anthropic.Anthropic, signal: dict) -> str:
    prompt = IMPL_PROMPT.format(**{k: signal.get(k, "") for k in
        ["company", "title", "description", "journey_stage", "lever"]})
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text.strip()


def make_client():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("Set ANTHROPIC_API_KEY in your environment")
    base_url = os.environ.get("ANTHROPIC_BASE_URL")
    kwargs = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url
        kwargs["default_headers"] = {"Authorization": f"Bearer {api_key}"}
    return anthropic.Anthropic(**kwargs)


def run(date=None):
    client = make_client()

    today = date or datetime.utcnow().strftime("%Y-%m-%d")
    files = sorted(PROCESSED_DIR.glob("mapped_*.json"), reverse=True)
    if not files:
        print("ERROR: no mapped file. Run map_signals.py first.")
        sys.exit(1)
    in_path = files[0]
    signals = json.loads(in_path.read_text())
    print(f"Scoring {len(signals)} signals from {in_path.name}…")

    scored = []
    for i, s in enumerate(signals):
        print(f"  [{i+1}/{len(signals)}] {s['company']}: {s['title'][:60]}")
        scores = score_one(client, s)
        implications = get_implications(client, s)
        scored.append({
            **s,
            "scores": scores,
            "priority": priority(scores["composite"]),
            "ebay_implications": implications,
            "tags": s.get("tags", []),
        })

    out_path = PROCESSED_DIR / f"scored_{today}.json"
    out_path.write_text(json.dumps(scored, indent=2, ensure_ascii=False))
    print(f"Wrote {len(scored)} scored signals → {out_path.name}")


if __name__ == "__main__":
    print("=== score_signals ===")
    run()
    print("Done.")
