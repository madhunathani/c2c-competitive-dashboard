"""
dedupe_signals.py — Remove near-duplicate signals using title + company similarity.

Reads:  data/processed/scored_<date>.json
Writes: data/processed/deduped_<date>.json
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
PROCESSED_DIR = ROOT / "data" / "processed"


def normalize(text: str) -> set[str]:
    """Simple bag-of-words normalisation for similarity comparison."""
    stop = {"a", "an", "the", "for", "in", "on", "to", "of", "and", "or", "with", "its"}
    words = re.findall(r"[a-z0-9]+", text.lower())
    return {w for w in words if w not in stop and len(w) > 2}


def jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


SIMILARITY_THRESHOLD = 0.65


def dedupe(signals: list[dict]) -> tuple[list[dict], list[dict]]:
    kept, dupes = [], []
    fingerprints: list[tuple[str, set]] = []

    for s in sorted(signals, key=lambda x: x["scores"]["composite"], reverse=True):
        key = s["company"]
        tokens = normalize(s["title"] + " " + s.get("description", ""))
        is_dupe = False

        for kept_company, kept_tokens in fingerprints:
            if kept_company != key:
                continue
            sim = jaccard(tokens, kept_tokens)
            if sim >= SIMILARITY_THRESHOLD:
                is_dupe = True
                break

        if is_dupe:
            dupes.append(s)
        else:
            kept.append(s)
            fingerprints.append((key, tokens))

    return kept, dupes


def assign_ids(signals: list[dict]) -> list[dict]:
    for i, s in enumerate(signals, 1):
        if not s.get("id"):
            s["id"] = f"sig_{i:03d}"
    return signals


def run(date=None):
    today = date or datetime.utcnow().strftime("%Y-%m-%d")
    files = sorted(PROCESSED_DIR.glob("scored_*.json"), reverse=True)
    if not files:
        print("ERROR: no scored file. Run score_signals.py first.")
        sys.exit(1)
    in_path = files[0]
    signals = json.loads(in_path.read_text())
    print(f"Deduplicating {len(signals)} signals from {in_path.name}…")

    kept, dupes = dedupe(signals)
    kept = assign_ids(kept)

    out_path = PROCESSED_DIR / f"deduped_{today}.json"
    out_path.write_text(json.dumps(kept, indent=2, ensure_ascii=False))

    if dupes:
        dup_path = PROCESSED_DIR / f"dupes_{today}.json"
        dup_path.write_text(json.dumps(dupes, indent=2, ensure_ascii=False))
        print(f"Removed {len(dupes)} duplicates → {dup_path.name}")

    print(f"Kept {len(kept)} unique signals → {out_path.name}")


if __name__ == "__main__":
    print("=== dedupe_signals ===")
    run()
    print("Done.")
