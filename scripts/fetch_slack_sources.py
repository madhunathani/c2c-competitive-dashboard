"""
fetch_slack_sources.py — Pull article links from Slack channels and fetch their content.

Reads:  SLACK_BOT_TOKEN env var
        config/slack_channels.yaml
Writes: data/raw/slack/<url-hash>_<date>.json  (same schema as fetch_sources.py)

The bot must be a member of each listed channel and have scopes:
  channels:history, channels:read, groups:history, groups:read
"""

import hashlib
import json
import os
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import requests
import yaml
from bs4 import BeautifulSoup

try:
    from slack_sdk import WebClient
    from slack_sdk.errors import SlackApiError
except ImportError:
    raise SystemExit("slack-sdk not installed. Run: pip install slack-sdk")

ROOT = Path(__file__).parent.parent
SLACK_CFG = ROOT / "config" / "slack_channels.yaml"
RAW_DIR = ROOT / "data" / "raw" / "slack"
RAW_DIR.mkdir(parents=True, exist_ok=True)

FETCH_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; C2C-CI-Bot/1.0)"}

# Map root domains → company names (matches taxonomy.ts COMPANIES list)
DOMAIN_TO_COMPANY: dict[str, str] = {
    "amazon.com": "Amazon",
    "sell.amazon.com": "Amazon",
    "sellercentral.amazon.com": "Amazon",
    "depop.com": "Depop",
    "newsroom.depop.com": "Depop",
    "ebay.com": "eBay",
    "etsy.com": "Etsy",
    "facebook.com": "Facebook Marketplace",
    "about.fb.com": "Facebook Marketplace",
    "fb.com": "Facebook Marketplace",
    "instagram.com": "Facebook Marketplace",
    "fleek.fashion": "Fleek",
    "groupon.com": "Groupon",
    "influur.com": "Influur",
    "mercari.com": "Mercari",
    "about.mercari.com": "Mercari",
    "poshmark.com": "Poshmark",
    "newsroom.poshmark.com": "Poshmark",
    "blog.poshmark.com": "Poshmark",
    "temu.com": "Temu",
    "vinted.com": "Vinted",
    "vinted.co.uk": "Vinted",
    "vinted.de": "Vinted",
    "whatnot.com": "Whatnot",
    "blog.whatnot.com": "Whatnot",
    "wikifarmer.com": "Wikifarmer",
}

# Source types to assign based on known official domains
OFFICIAL_DOMAINS: set[str] = {
    "sell.amazon.com", "sellercentral.amazon.com",
    "newsroom.depop.com", "about.fb.com",
    "about.mercari.com", "newsroom.poshmark.com", "blog.poshmark.com",
    "vinted.com", "whatnot.com", "blog.whatnot.com",
    "depop.com", "etsy.com", "mercari.com",
    "ebay.com", "temu.com",
}

# Skip these — not article content
SKIP_DOMAINS: set[str] = {
    "slack.com", "app.slack.com", "files.slack.com",
    "twitter.com", "x.com", "youtube.com", "youtu.be",
    "linkedin.com", "reddit.com", "google.com", "docs.google.com",
    "drive.google.com", "dropbox.com", "notion.so",
}

# Slack mrkdwn URL patterns
_SLACK_URL_RE = re.compile(r"<(https?://[^|>]+)(?:\|[^>]*)?>")
_PLAIN_URL_RE = re.compile(r"https?://[^\s>\"')\]]+")


def load_config() -> dict:
    with open(SLACK_CFG) as f:
        return yaml.safe_load(f)


def resolve_channel_id(client: WebClient, name: str) -> Optional[str]:
    """Look up a channel ID by name, searching public and private channels."""
    name = name.lstrip("#")
    cursor = None
    while True:
        resp = client.conversations_list(
            types="public_channel,private_channel",
            limit=200,
            cursor=cursor,
        )
        for ch in resp["channels"]:
            if ch["name"] == name:
                return ch["id"]
        cursor = resp.get("response_metadata", {}).get("next_cursor")
        if not cursor:
            break
    return None


def extract_urls(message: dict) -> list[str]:
    """Pull every HTTP/S URL out of a Slack message."""
    urls: list[str] = []

    text = message.get("text", "")
    urls += _SLACK_URL_RE.findall(text)
    for plain in _PLAIN_URL_RE.findall(text):
        if plain not in urls:
            urls.append(plain)

    for att in message.get("attachments", []):
        for key in ("original_url", "from_url", "title_link"):
            val = att.get(key)
            if val and val.startswith("http") and val not in urls:
                urls.append(val)

    for block in message.get("blocks", []):
        for elem in block.get("elements", []):
            if isinstance(elem, list):
                for e in elem:
                    if isinstance(e, dict) and e.get("type") == "link":
                        url = e.get("url", "")
                        if url and url not in urls:
                            urls.append(url)
            elif isinstance(elem, dict) and elem.get("type") == "link":
                url = elem.get("url", "")
                if url and url not in urls:
                    urls.append(url)

    return urls


def root_domain(url: str) -> str:
    try:
        host = urlparse(url).hostname or ""
        parts = host.split(".")
        if len(parts) >= 2:
            return ".".join(parts[-2:])
        return host
    except Exception:
        return ""


def classify(url: str) -> tuple[str, str]:
    """Return (company, source_type) for a URL."""
    try:
        host = urlparse(url).hostname or ""
    except Exception:
        return "_trade_press", "trade_press"

    for domain, company in DOMAIN_TO_COMPANY.items():
        if host == domain or host.endswith("." + domain):
            stype = "company_announcement" if host in OFFICIAL_DOMAINS else "company_blog"
            return company, stype

    return "_trade_press", "trade_press"


def should_skip(url: str) -> bool:
    try:
        host = urlparse(url).hostname or ""
    except Exception:
        return True
    rd = root_domain(url)
    return rd in SKIP_DOMAINS or host in SKIP_DOMAINS


def url_slug(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()[:12]


def fetch_page(url: str) -> Optional[str]:
    try:
        resp = requests.get(url, headers=FETCH_HEADERS, timeout=15)
        resp.raise_for_status()
        return resp.text
    except requests.RequestException as e:
        print(f"    WARN: fetch failed {url}: {e}")
        return None


def extract_text(html: str) -> str:
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
    token = os.environ.get("SLACK_BOT_TOKEN")
    if not token:
        raise SystemExit("Set SLACK_BOT_TOKEN in your environment.")

    cfg = load_config()
    channels: list[str] = cfg.get("channels", [])
    lookback_days: int = cfg.get("lookback_days", 7)

    client = WebClient(token=token)
    today = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
    oldest_ts = str(
        (datetime.now(tz=timezone.utc) - timedelta(days=lookback_days)).timestamp()
    )

    seen_urls: set[str] = set()

    for channel_name in channels:
        print(f"\nChannel: #{channel_name}")
        channel_id = resolve_channel_id(client, channel_name)
        if not channel_id:
            print(f"  WARN: channel not found or bot not a member — #{channel_name}")
            continue

        try:
            cursor = None
            messages = []
            while True:
                resp = client.conversations_history(
                    channel=channel_id,
                    oldest=oldest_ts,
                    limit=200,
                    cursor=cursor,
                )
                messages.extend(resp.get("messages", []))
                cursor = resp.get("response_metadata", {}).get("next_cursor")
                if not cursor:
                    break
        except SlackApiError as e:
            print(f"  ERROR fetching #{channel_name}: {e.response['error']}")
            continue

        print(f"  {len(messages)} messages in last {lookback_days} days")
        urls_this_channel = 0

        for msg in messages:
            # Slack ts is a Unix timestamp float as a string e.g. "1718123456.000000"
            msg_date = None
            if ts := msg.get("ts"):
                try:
                    msg_date = datetime.fromtimestamp(float(ts), tz=timezone.utc).strftime("%Y-%m-%d")
                except (ValueError, OSError):
                    pass

            for url in extract_urls(msg):
                if url in seen_urls or should_skip(url):
                    continue
                seen_urls.add(url)

                slug = url_slug(url)
                out_path = RAW_DIR / f"{slug}_{today}.json"
                if out_path.exists():
                    print(f"    SKIP (already fetched): {url[:80]}")
                    continue

                company, source_type = classify(url)
                print(f"    Fetching [{company}]: {url[:80]}")
                html = fetch_page(url)
                if html is None:
                    continue

                text = extract_text(html)
                if len(text) < 200:
                    print(f"    SKIP (too short, likely paywalled or redirect): {url[:80]}")
                    continue

                published_date = extract_published_date(html) or msg_date
                payload = {
                    "company": company,
                    "url": url,
                    "source_type": source_type,
                    "slack_channel": channel_name,
                    "fetched_at": datetime.now(tz=timezone.utc).isoformat(),
                    "published_date": published_date,
                    "text": text,
                }
                out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
                print(f"    OK: {out_path.name} ({len(text)} chars)")
                urls_this_channel += 1
                time.sleep(0.5)

        print(f"  Fetched {urls_this_channel} new URLs from #{channel_name}")


if __name__ == "__main__":
    print("=== fetch_slack_sources ===")
    run()
    print("Done.")
