export type JourneyStage =
  | 'acquisition'
  | 'listing'
  | 'sale'
  | 'engagement_retention'
  | 'multi_stage';

export type Lever =
  | 'promotions'
  | 'marketing'
  | 'onboarding'
  | 'seller_trust'
  | 'draft_reentry'
  | 'resell_entry_point'
  | 'fees_monetization'
  | 'listing_tools'
  | 'ai_assistant'
  | 'search_visibility'
  | 'price_guidance'
  | 'shipping_fulfillment'
  | 'bx_nudges'
  | 'seller_protections'
  | 'balance_wallet';

export type SellerSegment =
  | 'prospect'
  | 'new_seller'
  | 'reactivated_seller'
  | 'churned_seller'
  | 'occasional_seller'
  | 'regular_seller'
  | 'nora'
  | 'norl'
  | 'nors'
  | 'multi_segment';

export type Priority = 'high' | 'medium' | 'low';

export type SourceType =
  | 'company_blog'
  | 'company_announcement'
  | 'press_release'
  | 'product_page'
  | 'policy_page'
  | 'earnings_call'
  | 'trade_press';

export interface SignalScores {
  relevance: number;
  magnitude: number;
  novelty: number;
  confidence: number;
  recency: number;
  composite: number;
}

export interface Signal {
  id: string;
  company: string;
  title: string;
  description: string;
  journey_stage: JourneyStage;
  lever: Lever;
  seller_segment: SellerSegment;
  action_type: string;
  source_url: string;
  source_type: SourceType;
  published_date?: string;
  ingested_date: string;
  scores: SignalScores;
  ebay_implications: string;
  priority: Priority;
  tags: string[];
}

export const JOURNEY_STAGES: JourneyStage[] = [
  'acquisition',
  'listing',
  'sale',
  'engagement_retention',
  'multi_stage',
];

export const LEVERS: Lever[] = [
  'promotions',
  'marketing',
  'onboarding',
  'seller_trust',
  'draft_reentry',
  'resell_entry_point',
  'fees_monetization',
  'listing_tools',
  'ai_assistant',
  'search_visibility',
  'price_guidance',
  'shipping_fulfillment',
  'bx_nudges',
  'seller_protections',
  'balance_wallet',
];

export const SELLER_SEGMENTS: SellerSegment[] = [
  'prospect',
  'new_seller',
  'reactivated_seller',
  'churned_seller',
  'occasional_seller',
  'regular_seller',
  'nora',
  'norl',
  'nors',
  'multi_segment',
];

export const COMPANIES = [
  'Amazon',
  'Depop',
  'Etsy',
  'Facebook Marketplace',
  'Fleek',
  'Groupon',
  'Influur',
  'Kleinanzeigen',
  'Mercari',
  'Pickle',
  'Poshmark',
  'Promoted',
  'StockX',
  'Temu',
  'USPS',
  'Vinted',
  'Whatnot',
  'Wikifarmer',
];

export const LEVER_LABELS: Record<Lever, string> = {
  promotions: 'Promotions',
  marketing: 'Marketing',
  onboarding: 'Onboarding',
  seller_trust: 'Seller Trust',
  draft_reentry: 'Draft Reentry',
  resell_entry_point: 'Resell Entry',
  fees_monetization: 'Fees & Monetization',
  listing_tools: 'Listing Tools',
  ai_assistant: 'AI Assistant',
  search_visibility: 'Search Visibility',
  price_guidance: 'Price Guidance',
  shipping_fulfillment: 'Shipping & Fulfillment',
  bx_nudges: 'BX Nudges',
  seller_protections: 'Seller Protections',
  balance_wallet: 'Balance & Wallet',
};

export const JOURNEY_STAGE_LABELS: Record<JourneyStage, string> = {
  acquisition: 'Acquisition',
  listing: 'Listing',
  sale: 'Sale',
  engagement_retention: 'Engagement & Retention',
  multi_stage: 'Multi-stage',
};

export const SELLER_SEGMENT_LABELS: Record<SellerSegment, string> = {
  prospect: 'Prospect',
  new_seller: 'New Seller',
  reactivated_seller: 'Reactivated Seller',
  churned_seller: 'Churned Seller',
  occasional_seller: 'Occasional Seller',
  regular_seller: 'Regular Seller',
  nora: 'NORA',
  norl: 'NORL',
  nors: 'NORS',
  multi_segment: 'Multi-segment',
};

export const JOURNEY_STAGE_COLORS: Record<JourneyStage, string> = {
  acquisition: '#58a6ff',
  listing: '#bc8cff',
  sale: '#3fb950',
  engagement_retention: '#f0883e',
  multi_stage: '#8b949e',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#f85149',
  medium: '#d29922',
  low: '#3fb950',
};
