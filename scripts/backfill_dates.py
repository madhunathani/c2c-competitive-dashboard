"""
backfill_dates.py — One-time script to populate published_date on existing signals.

For each signal lacking a real published_date, fetches the source URL and
extracts the article's publication date from HTML meta tags.

Reads + Writes: data/processed/signals.json
"""

import json
import re
import time
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent.parent
SIGNALS_FILE = ROOT / "data" / "processed" / "signals.json"

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; C2C-CI-Bot/1.0)"}

_DATE_META_ATTRS = [
    ("meta", {"property": "article:published_time"}),
    ("meta", {"name": "article:published_time"}),
    ("meta", {"property": "article:published"}),
    ("meta", {"name": "publish-date"}),
    ("meta", {"name": "date"}),
    ("meta", {"itemprop": "datePublished"}),
    ("time", {"itemprop": "datePublished"}),
    ("time", {"class": "published"}),
]

_ISO_DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")


def extract_published_date(html: str) -> Optional[str]:
    soup = BeautifulSoup(html, "html.parser")
    for tag, attrs in _DATE_META_ATTRS:
        el = soup.find(tag, attrs)
        if el:
            raw = el.get("content") or el.get("datetime") or el.get_text()
            m = _ISO_DATE_RE.search(str(raw))
            if m:
                return m.group(1)
    return None


def fetch_date(url: str) -> Optional[str]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        return extract_published_date(resp.text)
    except requests.RequestException as e:
        print(f"  WARN: {e}")
        return None


def run():
    signals = json.loads(SIGNALS_FILE.read_text())

    # Collect unique URLs for signals that need backfilling
    url_to_date: dict[str, Optional[str]] = {}
    needs_backfill = [
        s for s in signals
        if not s.get("published_date") or s.get("published_date") == s.get("ingested_date")
    ]
    unique_urls = list({s["source_url"] for s in needs_backfill})

    print(f"{len(needs_backfill)} signals need backfill across {len(unique_urls)} unique URLs")

    for i, url in enumerate(unique_urls, 1):
        print(f"  [{i}/{len(unique_urls)}] {url[:90]}")
        date = fetch_date(url)
        url_to_date[url] = date
        print(f"    → {date or 'not found'}")
        time.sleep(0.5)

    updated = 0
    for s in signals:
        if s.get("published_date") and s["published_date"] != s.get("ingested_date"):
            continue
        date = url_to_date.get(s["source_url"])
        if date:
            s["published_date"] = date
            updated += 1

    SIGNALS_FILE.write_text(json.dumps(signals, indent=2, ensure_ascii=False))
    print(f"\nUpdated {updated} signals with real published dates.")
    print(f"Remaining without real date: {len(needs_backfill) - updated}")


if __name__ == "__main__":
    print("=== backfill_dates ===")
    run()
    print("Done.")
