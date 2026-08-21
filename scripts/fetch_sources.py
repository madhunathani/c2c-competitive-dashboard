"""
fetch_sources.py — Collect raw source documents from configured sources.

Reads:  config/sources.yaml
Writes: data/raw/<company>/<slug>_<date>.json
"""

import json
import os
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import requests
import yaml
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent.parent
SOURCES_CFG = ROOT / "config" / "sources.yaml"
RAW_DIR = ROOT / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; C2C-CI-Bot/1.0)"
    )
}


def load_sources():
    with open(SOURCES_CFG) as f:
        cfg = yaml.safe_load(f)
    return cfg.get("sources", [])


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def fetch_page(url):  # -> Optional[str]
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        return resp.text
    except requests.RequestException as e:
        print(f"  WARN: failed to fetch {url}: {e}")
        return None


def extract_text(html):
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    return " ".join(soup.get_text(separator=" ").split())


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


def run():
    sources = load_sources()
    today = datetime.utcnow().strftime("%Y-%m-%d")

    for source in sources:
        company = source["company"]
        url = source["url"]
        source_type = source.get("type", "unknown")
        out_dir = RAW_DIR / slugify(company)
        out_dir.mkdir(parents=True, exist_ok=True)

        slug = slugify(source.get("label", url.split("/")[-1] or "index"))
        out_path = out_dir / f"{slug}_{today}.json"

        if out_path.exists():
            print(f"  SKIP (already fetched today): {company} / {slug}")
            continue

        print(f"  Fetching: {company} — {url}")
        html = fetch_page(url)
        if html is None:
            continue

        text = extract_text(html)
        published_date = extract_published_date(html)
        payload = {
            "company": company,
            "url": url,
            "source_type": source_type,
            "fetched_at": datetime.utcnow().isoformat(),
            "published_date": published_date,
            "text": text,
        }
        out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
        print(f"  OK: {out_path.name} ({len(text)} chars)")
        time.sleep(1)


if __name__ == "__main__":
    print("=== fetch_sources ===")
    run()
    print("Done.")
