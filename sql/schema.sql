-- C2C Competitive Intelligence Dashboard — Database Schema
-- Compatible with PostgreSQL 15+ (Vercel Postgres / Neon / Supabase)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Sources ──────────────────────────────────────────────────────────────────

CREATE TABLE sources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company     TEXT NOT NULL,
  url         TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL, -- company_blog | company_announcement | press_release | product_page | policy_page | earnings_call | trade_press
  label       TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Raw Documents ─────────────────────────────────────────────────────────────

CREATE TABLE raw_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id   UUID REFERENCES sources(id) ON DELETE SET NULL,
  company     TEXT NOT NULL,
  url         TEXT NOT NULL,
  source_type TEXT NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL,
  text        TEXT NOT NULL,
  char_count  INT GENERATED ALWAYS AS (length(text)) STORED,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX raw_documents_company_idx ON raw_documents (company);
CREATE INDEX raw_documents_fetched_idx ON raw_documents (fetched_at DESC);

-- ── Competitive Signals ───────────────────────────────────────────────────────

CREATE TABLE competitive_signals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug             TEXT UNIQUE,                  -- e.g. sig_001, stable identifier
  company          TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  journey_stage    TEXT NOT NULL
    CHECK (journey_stage IN ('acquisition','listing','sale','engagement_retention','multi_stage')),
  lever            TEXT NOT NULL
    CHECK (lever IN ('promotions','marketing','onboarding','seller_trust','draft_reentry',
                     'resell_entry_point','fees_monetization','listing_tools','ai_assistant',
                     'search_visibility','price_guidance','shipping_fulfillment','bx_nudges',
                     'seller_protections','balance_wallet')),
  seller_segment   TEXT NOT NULL
    CHECK (seller_segment IN ('prospect','new_seller','reactivated_seller','churned_seller',
                              'occasional_seller','regular_seller','nora','norl','nors','multi_segment')),
  action_type      TEXT NOT NULL,
  source_url       TEXT NOT NULL,
  source_type      TEXT NOT NULL,
  published_date   DATE,
  ingested_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  ebay_implications TEXT,
  priority         TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high','medium','low')),
  tags             TEXT[] DEFAULT '{}',
  raw_document_id  UUID REFERENCES raw_documents(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX signals_company_idx       ON competitive_signals (company);
CREATE INDEX signals_journey_stage_idx ON competitive_signals (journey_stage);
CREATE INDEX signals_lever_idx         ON competitive_signals (lever);
CREATE INDEX signals_priority_idx      ON competitive_signals (priority);
CREATE INDEX signals_published_idx     ON competitive_signals (published_date DESC);

-- ── Signal Scores ─────────────────────────────────────────────────────────────

CREATE TABLE signal_scores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_id   UUID NOT NULL REFERENCES competitive_signals(id) ON DELETE CASCADE,
  relevance   NUMERIC(4,1) NOT NULL CHECK (relevance BETWEEN 0 AND 10),
  magnitude   NUMERIC(4,1) NOT NULL CHECK (magnitude BETWEEN 0 AND 10),
  novelty     NUMERIC(4,1) NOT NULL CHECK (novelty BETWEEN 0 AND 10),
  confidence  NUMERIC(4,1) NOT NULL CHECK (confidence BETWEEN 0 AND 10),
  recency     NUMERIC(4,1) NOT NULL CHECK (recency BETWEEN 0 AND 10),
  composite   NUMERIC(4,1) NOT NULL CHECK (composite BETWEEN 0 AND 10),
  scored_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model       TEXT,
  UNIQUE (signal_id)
);

-- ── Company Snapshots ─────────────────────────────────────────────────────────

CREATE TABLE company_snapshots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company         TEXT NOT NULL,
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  signal_count    INT NOT NULL DEFAULT 0,
  high_count      INT NOT NULL DEFAULT 0,
  medium_count    INT NOT NULL DEFAULT 0,
  low_count       INT NOT NULL DEFAULT 0,
  avg_composite   NUMERIC(4,1),
  top_lever       TEXT,
  top_stage       TEXT,
  summary         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company, snapshot_date)
);

-- ── Trigger: update updated_at ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER signals_updated_at
  BEFORE UPDATE ON competitive_signals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Convenience Views ─────────────────────────────────────────────────────────

CREATE VIEW signals_with_scores AS
SELECT
  cs.*,
  ss.relevance,
  ss.magnitude,
  ss.novelty,
  ss.confidence,
  ss.recency,
  ss.composite
FROM competitive_signals cs
LEFT JOIN signal_scores ss ON ss.signal_id = cs.id;

CREATE VIEW lever_heatmap AS
SELECT
  company,
  lever,
  COUNT(*) AS signal_count,
  COUNT(*) FILTER (WHERE priority = 'high') AS high_count,
  ROUND(AVG(ss.composite), 1) AS avg_composite
FROM competitive_signals cs
LEFT JOIN signal_scores ss ON ss.signal_id = cs.id
GROUP BY company, lever;
