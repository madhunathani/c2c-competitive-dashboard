"""
ingest_watchful_signals.py — Score and ingest signals extracted from Watchful monthly reports.

Watchful reports are image-based PDFs, so signals are pre-extracted here.
Scores each via the Anthropic API using the same rubric as score_signals.py,
then deduplicates against existing signals.json and appends new ones.

Source reports (publicly accessible Google Drive):
  Jul 2026 C2C:            https://drive.google.com/file/d/1q3y9vxNcSsEd1g6Ag5Nr2JRQfsBIgkOi/view
  Jun 2026 C2C:            https://drive.google.com/file/d/1LhFoFqcTP38QoRyTJNjWn4sw85r-j8-q/view
  Jul 2026 Livestream+C2C: https://drive.google.com/file/d/111kQILyCFFuqgf9-9GcGatdU-65y16ht/view
"""

import json
import os
from datetime import datetime
from pathlib import Path

import anthropic

ROOT = Path(__file__).parent.parent
SIGNALS_FILE = ROOT / "data" / "processed" / "signals.json"

SRC_JUL_C2C  = "https://drive.google.com/file/d/1q3y9vxNcSsEd1g6Ag5Nr2JRQfsBIgkOi/view"
SRC_JUN_C2C  = "https://drive.google.com/file/d/1LhFoFqcTP38QoRyTJNjWn4sw85r-j8-q/view"
SRC_JUL_LIVE = "https://drive.google.com/file/d/111kQILyCFFuqgf9-9GcGatdU-65y16ht/view"

CANDIDATES = [
    # ── VINTED Jul 2026 ────────────────────────────────────────────────────
    {
        "company": "Vinted",
        "title": "Vinted launches in Australia with UK–Australia international shipping corridor",
        "description": "Vinted went live at vinted.com.au with AUD pricing and localized Buyer Protection. It simultaneously launched a UK–Australia international shipping corridor with no extra customs steps, enabling cross-border C2C trade from day one. This positions Vinted directly against Depop and Tise in the Australian secondhand market.",
        "journey_stage": "acquisition",
        "lever": "shipping_fulfillment",
        "seller_segment": "prospect",
        "action_type": "program_launch",
        "source_url": SRC_JUL_C2C,
        "published_date": "2026-07-21",
    },
    {
        "company": "Vinted",
        "title": "Vinted developing voice-to-text for listing creation, search, and messaging",
        "description": "Vinted is building voice-to-text input across its listing creation flow, search bar, and messaging interface. Sellers will be able to dictate listing descriptions and respond to buyers hands-free, lowering the friction of mobile listing on the go.",
        "journey_stage": "listing",
        "lever": "listing_tools",
        "seller_segment": "occasional_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUL_C2C,
        "published_date": "2026-07-21",
    },
    {
        "company": "Vinted",
        "title": "Vinted updates Refund Policy with revised refund process information",
        "description": "Vinted updated its Refund Policy page with new information on refund eligibility and process steps for both buyers and sellers. The change signals continued investment in buyer/seller protection clarity to build trust.",
        "journey_stage": "engagement_retention",
        "lever": "seller_protections",
        "seller_segment": "regular_seller",
        "action_type": "policy_change",
        "source_url": SRC_JUL_C2C,
        "published_date": "2026-07-21",
    },
    # ── VINTED Jun 2026 ────────────────────────────────────────────────────
    {
        "company": "Vinted",
        "title": "Vinted adds ISBN barcode scanning to auto-populate book listing details",
        "description": "Vinted is building a barcode scan flow for book listings that automatically populates the title, author, category, and cover image from the ISBN. This reduces listing friction for one of the platform's high-volume secondhand categories and mirrors Amazon's long-standing scanning capability.",
        "journey_stage": "listing",
        "lever": "listing_tools",
        "seller_segment": "occasional_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUN_C2C,
        "published_date": "2026-06-22",
    },
    {
        "company": "Vinted",
        "title": "Vinted developing shipping extension requests with real-time buyer status updates",
        "description": "Vinted is adding a feature for eligible sellers to request extra shipping time after a sale, with real-time status updates pushed to buyers throughout. This reduces cancellations caused by shipping delays and protects seller metrics.",
        "journey_stage": "listing",
        "lever": "shipping_fulfillment",
        "seller_segment": "regular_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUN_C2C,
        "published_date": "2026-06-22",
    },
    {
        "company": "Vinted",
        "title": "Vinted adds IBAN and account holder name verification before fund withdrawals",
        "description": "Vinted is introducing bank account verification requiring sellers to confirm their IBAN and account holder name before funds can be released. This is a trust and fraud-reduction measure that may slightly increase payout friction for new sellers.",
        "journey_stage": "engagement_retention",
        "lever": "seller_trust",
        "seller_segment": "new_seller",
        "action_type": "policy_change",
        "source_url": SRC_JUN_C2C,
        "published_date": "2026-06-22",
    },
    {
        "company": "Vinted",
        "title": "Vinted builds self-service SNAD dispute flow with status tracking and post-submission guidance",
        "description": "Vinted is adding a self-service dispute resolution flow for Significantly Not As Described (SNAD) claims, with a progress timeline, post-submission guidance, and status tracking for buyers. This reduces support burden while giving buyers more transparency and control during disputes.",
        "journey_stage": "engagement_retention",
        "lever": "seller_protections",
        "seller_segment": "regular_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUN_C2C,
        "published_date": "2026-06-22",
    },
    # ── KLEINANZEIGEN Jul 2026 ─────────────────────────────────────────────
    {
        "company": "Kleinanzeigen",
        "title": "Kleinanzeigen building advanced seller analytics dashboard with export and custom date ranges",
        "description": "Kleinanzeigen is developing a dedicated analytics page for PRO and business sellers with custom date ranges, historical trend comparisons, export functionality, and detailed metrics including impressions, ad views, conversations, website clicks, followers, and call analytics. This mirrors professional-grade analytics tools and raises the bar for seller retention on the platform.",
        "journey_stage": "engagement_retention",
        "lever": "listing_tools",
        "seller_segment": "regular_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUL_C2C,
        "published_date": "2026-07-21",
    },
    {
        "company": "Kleinanzeigen",
        "title": "Kleinanzeigen integrating EPREL energy label QR scan for EU appliance compliance",
        "description": "Kleinanzeigen is building a listing flow where sellers can scan a QR code or enter an EPREL ID to automatically retrieve and attach the EU-mandated energy label and product datasheet to appliance listings. This removes a regulatory compliance burden from sellers and reduces friction for a high-value category.",
        "journey_stage": "listing",
        "lever": "listing_tools",
        "seller_segment": "regular_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUL_C2C,
        "published_date": "2026-07-21",
    },
    # ── KLEINANZEIGEN Jun 2026 ─────────────────────────────────────────────
    {
        "company": "Kleinanzeigen",
        "title": "Kleinanzeigen expanding verified reviews to cover off-platform transactions",
        "description": "Kleinanzeigen is expanding its verified review system so users can receive verified ratings even for transactions that did not use Kleinanzeigen's Secure Payment. This broadens trust signal coverage and incentivizes sellers who previously transacted off-platform to build verifiable reputation on the platform.",
        "journey_stage": "engagement_retention",
        "lever": "seller_trust",
        "seller_segment": "occasional_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUN_C2C,
        "published_date": "2026-06-22",
    },
    {
        "company": "Kleinanzeigen",
        "title": "Kleinanzeigen launches Plus Package premium seller subscription with visibility boosts",
        "description": "Kleinanzeigen is introducing a new Plus Package premium subscription for sellers bundling enhanced ad visibility, listing boosts, additional photo slots, and other exposure tools. This adds a recurring revenue tier while offering power sellers a competitive edge in search visibility.",
        "journey_stage": "engagement_retention",
        "lever": "fees_monetization",
        "seller_segment": "regular_seller",
        "action_type": "program_launch",
        "source_url": SRC_JUN_C2C,
        "published_date": "2026-06-22",
    },
    {
        "company": "Kleinanzeigen",
        "title": "Kleinanzeigen building AI-generated message reply suggestions for sellers",
        "description": "Kleinanzeigen is developing AI-powered messaging that analyzes incoming buyer messages and suggests contextual replies for sellers to review, edit, and manually send. This reduces the time sellers spend on buyer communication and lowers the barrier for less experienced sellers to respond professionally.",
        "journey_stage": "listing",
        "lever": "ai_assistant",
        "seller_segment": "occasional_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUN_C2C,
        "published_date": "2026-06-22",
    },
    {
        "company": "Kleinanzeigen",
        "title": "Kleinanzeigen adds prominent Buyer Protection section to product pages",
        "description": "Kleinanzeigen added a dedicated Buyer Protection section directly on product pages, highlighting secure payment and key trust signals. The placement is designed to increase on-platform payment adoption and reduce off-platform transaction abandonment.",
        "journey_stage": "sale",
        "lever": "seller_trust",
        "seller_segment": "prospect",
        "action_type": "ux_change",
        "source_url": SRC_JUN_C2C,
        "published_date": "2026-06-22",
    },
    # ── DEPOP Jul 2026 ────────────────────────────────────────────────────
    {
        "company": "Depop",
        "title": "Depop revamps Selling Hub stats with comprehensive analytics dashboard",
        "description": "Depop replaced its previous chart-based Stats view with a full analytics dashboard in the Selling Hub showing earnings, sales count, listings created, potential revenue, all-time totals, revenue breakdown by category, and boosted listing performance—all in a single view. This gives sellers a much clearer picture of their business health and listing effectiveness.",
        "journey_stage": "engagement_retention",
        "lever": "listing_tools",
        "seller_segment": "regular_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUL_C2C,
        "published_date": "2026-07-21",
    },
    {
        "company": "Depop",
        "title": "Depop adds Bulk Label Download for downloading multiple shipping labels at once",
        "description": "Depop added a dedicated Bulk Label Download page under Selling Settings in My Depop, allowing sellers to download multiple shipping labels from one place. This reduces the operational overhead for high-volume sellers managing many concurrent orders.",
        "journey_stage": "listing",
        "lever": "shipping_fulfillment",
        "seller_segment": "regular_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUL_C2C,
        "published_date": "2026-07-21",
    },
    {
        "company": "Depop",
        "title": "Depop refining onboarding to include preferred color and size selection for personalization",
        "description": "Depop is enhancing its onboarding flow to capture preferred colors alongside sizes, personalizing the shopping experience from the first session. For sellers, this means their listings are more likely to surface to the right buyers, improving early sales conversion.",
        "journey_stage": "acquisition",
        "lever": "onboarding",
        "seller_segment": "new_seller",
        "action_type": "ux_change",
        "source_url": SRC_JUL_C2C,
        "published_date": "2026-07-21",
    },
    {
        "company": "Depop",
        "title": "Depop building dedicated profile sharing flow for sellers",
        "description": "Depop is developing a dedicated profile-sharing flow allowing sellers to create and share profile-based content through a dedicated upload and sharing interface—going beyond just sharing a profile link. This supports seller-led marketing and word-of-mouth acquisition of new buyers.",
        "journey_stage": "acquisition",
        "lever": "marketing",
        "seller_segment": "regular_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUL_C2C,
        "published_date": "2026-07-21",
    },
    # ── DEPOP Jun 2026 ────────────────────────────────────────────────────
    {
        "company": "Depop",
        "title": "Depop expanding listing templates so sellers can save and reuse templates for similar items",
        "description": "Depop is expanding listing templates to allow sellers to create, save, manage, and reuse templates across similar item types—significantly reducing the time needed to list multiple items in the same category. This is a direct response to the friction of repeatedly entering the same attributes for similar listings.",
        "journey_stage": "listing",
        "lever": "listing_tools",
        "seller_segment": "regular_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUN_C2C,
        "published_date": "2026-06-22",
    },
    {
        "company": "Depop",
        "title": "Depop building AI-powered listing optimization with auto-descriptions, tags, and photo attribute extraction",
        "description": "Depop is building AI tools to auto-generate listing descriptions, suggest search-friendly tags, and extract item details (size, color, condition, brand) from listing photos during the creation flow. This significantly lowers the effort required to create high-quality, discoverable listings—especially for casual or new sellers.",
        "journey_stage": "listing",
        "lever": "ai_assistant",
        "seller_segment": "new_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUN_C2C,
        "published_date": "2026-06-22",
    },
    {
        "company": "Depop",
        "title": "Depop launching free shipping promotion for US buyers, prominently surfaced across app",
        "description": "Depop is developing a Free Depop Shipping promotion for US users, highlighting free shipping on the homepage, individual listings, and product pages. Free shipping is consistently one of the highest-converting purchase drivers in secondhand marketplaces and could meaningfully accelerate buyer conversion and seller sell-through.",
        "journey_stage": "acquisition",
        "lever": "promotions",
        "seller_segment": "prospect",
        "action_type": "program_launch",
        "source_url": SRC_JUN_C2C,
        "published_date": "2026-06-22",
    },
    {
        "company": "Depop",
        "title": "Depop redesigns Balance section as a prominent card with quick payout access",
        "description": "Depop redesigned its Depop Balance feature from a simple text link to a prominent balance card showing the current balance and quick access to payout information. The redesign increases seller awareness of available funds and simplifies the path to withdrawal, supporting seller financial engagement.",
        "journey_stage": "engagement_retention",
        "lever": "balance_wallet",
        "seller_segment": "regular_seller",
        "action_type": "ux_change",
        "source_url": SRC_JUN_C2C,
        "published_date": "2026-06-22",
    },
    # ── WHATNOT Jul 2026 ─────────────────────────────────────────────────
    {
        "company": "Whatnot",
        "title": "Whatnot building Sell More Earn More tiered seller rewards program with fee reductions",
        "description": "Whatnot is developing a tiered seller rewards program called Sell More Earn More with sales milestone tracking, recurring earning cycles, and tiered benefits including reduced selling fees for higher-performing sellers. This creates a structured incentive to grow GMV on the platform and increases switching costs for top sellers.",
        "journey_stage": "engagement_retention",
        "lever": "fees_monetization",
        "seller_segment": "regular_seller",
        "action_type": "program_launch",
        "source_url": SRC_JUL_LIVE,
        "published_date": "2026-07-21",
    },
    {
        "company": "Whatnot",
        "title": "Whatnot rebrands Gems to Points with expanded earning and redemption across Rewards Hub",
        "description": "Whatnot rebranded its Gems rewards currency to Points as part of a broader rewards consolidation, with expanded earning and redemption capabilities across a new Points Shop alongside Referrals and Coupons. The unified rewards experience is designed to increase engagement and loyalty for both buyers and sellers.",
        "journey_stage": "engagement_retention",
        "lever": "bx_nudges",
        "seller_segment": "regular_seller",
        "action_type": "program_launch",
        "source_url": SRC_JUL_LIVE,
        "published_date": "2026-07-21",
    },
    {
        "company": "Whatnot",
        "title": "Whatnot adds custom thumbnail support for short-form seller videos",
        "description": "Whatnot is developing support for custom cover images on short-form videos instead of auto-generated frames, giving sellers control over how their video content appears in discovery surfaces. This raises the presentation quality bar for seller storefronts and supports stronger visual merchandising.",
        "journey_stage": "listing",
        "lever": "listing_tools",
        "seller_segment": "regular_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUL_LIVE,
        "published_date": "2026-07-21",
    },
    # ── POSHMARK Jul 2026 ────────────────────────────────────────────────
    {
        "company": "Poshmark",
        "title": "Poshmark launches Bulk Smart Sell with minimum price controls across multiple listings",
        "description": "Poshmark launched Bulk Smart Sell, allowing sellers to enable or disable Smart Sell (automated offer sending and acceptance) across multiple listings at once, and set a minimum accepted price threshold at 20%, 30%, 40% below listing price or a custom amount. Smart Sell then automatically negotiates with interested buyers within those bounds, dramatically reducing the manual effort of offer management at scale.",
        "journey_stage": "sale",
        "lever": "bx_nudges",
        "seller_segment": "regular_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUL_LIVE,
        "published_date": "2026-07-21",
    },
    {
        "company": "Poshmark",
        "title": "Poshmark launches Sourcing Insights page highlighting fast-selling items and trending products",
        "description": "Poshmark launched a Sourcing Insights page in account navigation that surfaces fast-selling items and trending products across categories. This helps sellers make better inventory decisions by showing them what's already selling well on the platform, reducing the risk of sourcing slow-moving stock.",
        "journey_stage": "listing",
        "lever": "listing_tools",
        "seller_segment": "regular_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUL_LIVE,
        "published_date": "2026-07-21",
    },
    {
        "company": "Poshmark",
        "title": "Poshmark adds Negotiate Your Price banner on listings to prompt buyer offer awareness",
        "description": "Poshmark added an informational banner on listing pages prompting buyers to submit an offer below the listing price. The banner increases buyer awareness of the offer feature, which can accelerate time-to-sale for sellers by generating more offer activity without requiring a price reduction.",
        "journey_stage": "sale",
        "lever": "price_guidance",
        "seller_segment": "regular_seller",
        "action_type": "ux_change",
        "source_url": SRC_JUL_LIVE,
        "published_date": "2026-07-21",
    },
    {
        "company": "Poshmark",
        "title": "Poshmark launches Posh LIVE Studio beta — dedicated web-based workspace for live sellers",
        "description": "Poshmark launched a beta of Posh LIVE Studio, a dedicated desktop web workspace for live sellers combining item list preparation, promotion management, Posh Shows broadcasting, and real-time sales and viewer activity monitoring in one hub. This significantly lowers the operational complexity of running professional live selling shows on Poshmark.",
        "journey_stage": "engagement_retention",
        "lever": "listing_tools",
        "seller_segment": "regular_seller",
        "action_type": "feature_launch",
        "source_url": SRC_JUL_LIVE,
        "published_date": "2026-07-21",
    },
]

SCORE_PROMPT = """You are a competitive intelligence scoring specialist for eBay.
Score this competitive signal on four dimensions (integer 1–10 each):

- relevance: How directly does this affect eBay's seller acquisition or listing funnel?
- magnitude: How large is the potential impact on seller behavior at scale?
- novelty: How new or unexpected is this action for this company?
- confidence: Source is a Watchful product intelligence report (systematic app/product monitoring,
  very high reliability) — start at 8, adjust down only if the signal is marked as an early
  indication rather than a shipped feature.

Signal:
Company: {company}
Title: {title}
Description: {description}
Journey Stage: {journey_stage}
Lever: {lever}
Seller Segment: {seller_segment}

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
    if days <= 7:   return 10
    if days <= 14:  return 8
    if days <= 30:  return 6
    if days <= 60:  return 4
    if days <= 90:  return 2
    return 1


def composite(scores: dict) -> float:
    return round(
        sum(scores[k] * WEIGHTS[k] for k in ("relevance", "magnitude", "novelty", "confidence"))
        + scores["recency"] * WEIGHTS["recency"],
        1,
    )


def priority_label(score: float) -> str:
    if score >= 8.0: return "high"
    if score >= 6.5: return "medium"
    return "low"


def make_client():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("Set ANTHROPIC_API_KEY")
    kwargs = {"api_key": api_key}
    base_url = os.environ.get("ANTHROPIC_BASE_URL")
    if base_url:
        kwargs["base_url"] = base_url
        kwargs["default_headers"] = {"Authorization": f"Bearer {api_key}"}
    return anthropic.Anthropic(**kwargs)


def score_one(client, signal):
    msg = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=256,
        messages=[{"role": "user", "content": SCORE_PROMPT.format(**signal)}],
    )
    raw = msg.content[0].text.strip()
    try:
        s = json.loads(raw[raw.index("{"):raw.rindex("}") + 1])
        s = {k: max(1, min(10, int(v))) for k, v in s.items()}
    except (ValueError, json.JSONDecodeError):
        s = {"relevance": 6, "magnitude": 6, "novelty": 6, "confidence": 8}
    s["recency"] = recency_score(signal.get("published_date", ""))
    s["composite"] = composite(s)
    return s


def get_implications(client, signal):
    msg = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=256,
        messages=[{"role": "user", "content": IMPL_PROMPT.format(**signal)}],
    )
    return msg.content[0].text.strip()


def is_duplicate(candidate, existing_signals):
    title_lower = candidate["title"].lower()
    company = candidate["company"]
    for s in existing_signals:
        if s.get("company") != company:
            continue
        if s.get("source_url") == candidate.get("source_url") and s.get("title", "").lower() == title_lower:
            return True
        # Fuzzy: same company + 70%+ word overlap in title
        existing_words = set(s.get("title", "").lower().split())
        candidate_words = set(title_lower.split())
        if len(existing_words) > 0:
            overlap = len(existing_words & candidate_words) / len(existing_words | candidate_words)
            if overlap > 0.7:
                return True
    return False


def run():
    client = make_client()
    existing = json.loads(SIGNALS_FILE.read_text())
    max_id = max((int(s["id"].replace("sig_", "")) for s in existing if s["id"].startswith("sig_")), default=83)

    today = datetime.utcnow().strftime("%Y-%m-%d")
    added = []
    skipped = 0

    for i, candidate in enumerate(CANDIDATES):
        print(f"[{i+1}/{len(CANDIDATES)}] {candidate['company']}: {candidate['title'][:65]}")

        if is_duplicate(candidate, existing):
            print("  SKIP (duplicate)")
            skipped += 1
            continue

        scores = score_one(client, candidate)
        implications = get_implications(client, candidate)

        max_id += 1
        signal = {
            "id": f"sig_{max_id:03d}",
            **candidate,
            "source_type": "watchful_report",
            "ingested_date": today,
            "tags": [],
            "scores": scores,
            "priority": priority_label(scores["composite"]),
            "ebay_implications": implications,
        }
        added.append(signal)
        print(f"  → composite {scores['composite']} ({signal['priority']})")

    if added:
        merged = existing + added
        merged.sort(key=lambda s: s["scores"]["composite"], reverse=True)
        SIGNALS_FILE.write_text(json.dumps(merged, indent=2, ensure_ascii=False))
        print(f"\nAdded {len(added)} signals, skipped {skipped} duplicates. Total: {len(merged)}")
    else:
        print(f"\nNo new signals added (all {skipped} were duplicates).")


if __name__ == "__main__":
    print("=== ingest_watchful_signals ===")
    run()
    print("Done.")
