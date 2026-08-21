"""
write_snapshots.py — Publish final processed signals to data/processed/signals.json.

This is the file the Next.js frontend reads in mock/file mode.
In database mode, this script would instead upsert rows to the signals table.

Reads:  data/processed/deduped_<date>.json (or most recent)
Writes: data/processed/signals.json
        data/processed/snapshot_<date>.json (archived copy)
"""

import json
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

# Signals matching any of these rules are permanently excluded from the dashboard.
# eBay is an eBay-owned property and is not tracked as a competitor.
# The eBay–Depop acquisition is internal eBay news, not a competitive signal.
_EXCL_COMPANIES = {"eBay"}
_EXCL_TITLE_PREFIX = re.compile(r"^ebay\b", re.I)
_EXCL_PATTERNS = re.compile(
    r"ebay.{0,30}acqui|acqui.{0,30}depop.{0,60}ebay|cma.{0,20}ebay|ebay.{0,20}depop",
    re.I,
)


def is_excluded(signal: dict) -> bool:
    if signal.get("company") in _EXCL_COMPANIES:
        return True
    title = signal.get("title", "")
    if _EXCL_TITLE_PREFIX.match(title):
        return True
    haystack = title + " " + signal.get("description", "")
    return bool(_EXCL_PATTERNS.search(haystack))

ROOT = Path(__file__).parent.parent
PROCESSED_DIR = ROOT / "data" / "processed"
SIGNALS_FILE = PROCESSED_DIR / "signals.json"


def run(date=None):
    today = date or datetime.utcnow().strftime("%Y-%m-%d")
    files = sorted(PROCESSED_DIR.glob("deduped_*.json"), reverse=True)
    if not files:
        print("ERROR: no deduped file. Run dedupe_signals.py first.")
        sys.exit(1)
    in_path = files[0]
    signals = json.loads(in_path.read_text())
    before = len(signals)
    signals = [s for s in signals if not is_excluded(s)]
    excluded = before - len(signals)
    if excluded:
        print(f"Excluded {excluded} eBay/acquisition signals.")
    print(f"Publishing {len(signals)} signals from {in_path.name}…")

    # Backfill published_date from ingested_date when absent
    for s in signals:
        if not s.get("published_date"):
            s["published_date"] = s.get("ingested_date", "")

    # Sort by composite score descending before writing
    signals.sort(key=lambda s: s["scores"]["composite"], reverse=True)

    SIGNALS_FILE.write_text(json.dumps(signals, indent=2, ensure_ascii=False))
    print(f"Updated: {SIGNALS_FILE}")

    snapshot = PROCESSED_DIR / f"snapshot_{today}.json"
    shutil.copy(SIGNALS_FILE, snapshot)
    print(f"Archived: {snapshot.name}")

    # Print summary
    high = sum(1 for s in signals if s.get("priority") == "high")
    medium = sum(1 for s in signals if s.get("priority") == "medium")
    companies = len({s["company"] for s in signals})
    print(f"\nSummary: {len(signals)} total · {high} high · {medium} medium · {companies} companies")


if __name__ == "__main__":
    print("=== write_snapshots ===")
    run()
    print("Done.")
