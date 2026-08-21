"""
map_signals.py — Validate and normalise signal taxonomy fields.

Reads:  data/processed/candidates_<date>.json
Writes: data/processed/mapped_<date>.json

Rejects signals with invalid taxonomy values rather than silently dropping them.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
PROCESSED_DIR = ROOT / "data" / "processed"

VALID_JOURNEY_STAGES = {
    "acquisition", "listing", "sale", "engagement_retention", "multi_stage"
}

VALID_LEVERS = {
    "promotions", "marketing", "onboarding", "seller_trust", "draft_reentry",
    "resell_entry_point", "fees_monetization", "listing_tools", "ai_assistant",
    "search_visibility", "price_guidance", "shipping_fulfillment", "bx_nudges",
    "seller_protections", "balance_wallet",
}

VALID_SEGMENTS = {
    "prospect", "new_seller", "reactivated_seller", "churned_seller",
    "occasional_seller", "regular_seller", "nora", "norl", "nors", "multi_segment",
}

REQUIRED_FIELDS = {
    "company", "title", "description", "journey_stage", "lever",
    "seller_segment", "action_type", "source_url", "ingested_date",
}


def validate(signal: dict) -> list[str]:
    errors = []
    for f in REQUIRED_FIELDS:
        if not signal.get(f):
            errors.append(f"missing field: {f}")
    if signal.get("journey_stage") not in VALID_JOURNEY_STAGES:
        errors.append(f"invalid journey_stage: {signal.get('journey_stage')}")
    if signal.get("lever") not in VALID_LEVERS:
        errors.append(f"invalid lever: {signal.get('lever')}")
    if signal.get("seller_segment") not in VALID_SEGMENTS:
        errors.append(f"invalid seller_segment: {signal.get('seller_segment')}")
    return errors


def run(date=None):
    today = date or datetime.utcnow().strftime("%Y-%m-%d")
    in_path = PROCESSED_DIR / f"candidates_{today}.json"
    if not in_path.exists():
        candidates_files = sorted(PROCESSED_DIR.glob("candidates_*.json"), reverse=True)
        if not candidates_files:
            print("ERROR: no candidates file found. Run extract_signals.py first.")
            sys.exit(1)
        in_path = candidates_files[0]
        print(f"Using most recent: {in_path.name}")

    candidates = json.loads(in_path.read_text())
    print(f"Loaded {len(candidates)} candidates from {in_path.name}")

    mapped, rejected = [], []
    for i, signal in enumerate(candidates):
        errors = validate(signal)
        if errors:
            print(f"  REJECT [{i}] {signal.get('title', '?')}: {'; '.join(errors)}")
            rejected.append({**signal, "_validation_errors": errors})
        else:
            mapped.append(signal)

    out_path = PROCESSED_DIR / f"mapped_{today}.json"
    out_path.write_text(json.dumps(mapped, indent=2, ensure_ascii=False))

    if rejected:
        rej_path = PROCESSED_DIR / f"rejected_{today}.json"
        rej_path.write_text(json.dumps(rejected, indent=2, ensure_ascii=False))
        print(f"Rejected {len(rejected)} signals → {rej_path.name}")

    print(f"Mapped {len(mapped)} valid signals → {out_path.name}")


if __name__ == "__main__":
    print("=== map_signals ===")
    run()
    print("Done.")
