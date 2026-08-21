export const SIGNAL_EXTRACTION_PROMPT = `You are a competitive intelligence analyst for an e-commerce marketplace.
Given the following source text, extract every signal related to seller acquisition, listing, or retention flows.

For each signal return a JSON object with:
- title: short action title
- description: 2-3 sentence explanation
- journey_stage: one of [acquisition, listing, sale, engagement_retention, multi_stage]
- lever: one of [promotions, marketing, onboarding, seller_trust, draft_reentry, resell_entry_point, fees_monetization, listing_tools, ai_assistant, search_visibility, price_guidance, shipping_fulfillment, bx_nudges, seller_protections, balance_wallet]
- seller_segment: one of [prospect, new_seller, reactivated_seller, churned_seller, occasional_seller, regular_seller, nora, norl, nors, multi_segment]
- action_type: e.g. feature_launch, pricing_change, partnership, policy_change, program_launch, ux_change, algorithm_change

Source text:
{text}

Return a JSON array. If no relevant signals are found, return [].`;

export const SCORING_PROMPT = `You are a competitive intelligence scoring specialist for an e-commerce marketplace (eBay).
Score this competitive signal on four dimensions (integer 1–10):

- relevance: How directly does this affect our seller acquisition or listing funnel?
- magnitude: How large is the potential impact on seller behavior at scale?
- novelty: How new or unexpected is this action for this company?
- confidence: How certain are you this signal is accurate and complete?

Signal:
Company: {company}
Title: {title}
Description: {description}
Journey Stage: {journey_stage}
Lever: {lever}

Return JSON: { "relevance": N, "magnitude": N, "novelty": N, "confidence": N }`;

export const IMPLICATIONS_PROMPT = `You are a competitive strategy advisor for eBay.
Write 2–3 sentences on what this signal means for eBay and what action eBay should consider.
Be specific, actionable, and focused on seller acquisition and listing implications.

Company: {company}
Title: {title}
Description: {description}
Journey Stage: {journey_stage}
Lever: {lever}`;

export function fillPrompt(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{${k}}`, v),
    template
  );
}
