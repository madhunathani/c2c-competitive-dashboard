import type { Signal } from '@/lib/taxonomy';
import { LEVER_LABELS, JOURNEY_STAGE_LABELS, JOURNEY_STAGE_COLORS } from '@/lib/taxonomy';
import type { JourneyStage, Lever } from '@/lib/taxonomy';
import { formatDate } from '@/lib/utils';

const COMPANY_COLORS: Record<string, string> = {
  'Amazon': '#f0883e',
  'Depop': '#bc8cff',
  'Etsy': '#e8834a',
  'Facebook Marketplace': '#58a6ff',
  'Fleek': '#a8b1ff',
  'Groupon': '#79c551',
  'Influur': '#e879f9',
  'Kleinanzeigen': '#00a550',
  'Mercari': '#3fb950',
  'Pickle': '#86efac',
  'Poshmark': '#f85149',
  'Promoted': '#94a3b8',
  'Temu': '#fb923c',
  'Vinted': '#56d364',
  'StockX': '#00b140',
  'USPS': '#004b87',
  'Whatnot': '#d29922',
  'Wikifarmer': '#84cc16',
};

interface Props {
  company: string;
  signals: Signal[];
}

export default function CompanySummary({ company, signals }: Props) {

  const stageBreakdown = signals.reduce<Partial<Record<JourneyStage, number>>>((acc, s) => {
    acc[s.journey_stage] = (acc[s.journey_stage] ?? 0) + 1;
    return acc;
  }, {});

  const leverBreakdown = signals.reduce<Partial<Record<Lever, number>>>((acc, s) => {
    acc[s.lever] = (acc[s.lever] ?? 0) + 1;
    return acc;
  }, {});

  const topLevers = Object.entries(leverBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const recentSignals = [...signals]
    .sort((a, b) =>
      (b.published_date || b.ingested_date || '').localeCompare(
        a.published_date || a.ingested_date || ''
      )
    )
    .slice(0, 3);

  const color = COMPANY_COLORS[company] ?? 'var(--text-muted)';

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 600 }}>{company}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{signals.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>signals</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <div className="section-header">By Stage</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(stageBreakdown).map(([stage, count]) => (
              <span
                key={stage}
                style={{
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 20,
                  background: `${JOURNEY_STAGE_COLORS[stage as JourneyStage]}22`,
                  color: JOURNEY_STAGE_COLORS[stage as JourneyStage],
                  border: `1px solid ${JOURNEY_STAGE_COLORS[stage as JourneyStage]}44`,
                }}
              >
                {JOURNEY_STAGE_LABELS[stage as JourneyStage]} ({count})
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="section-header">Top Levers</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {topLevers.map(([lever, count]) => (
              <div key={lever} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    height: 6,
                    width: Math.max((count / signals.length) * 120, 12),
                    background: color,
                    borderRadius: 3,
                    opacity: 0.7,
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {LEVER_LABELS[lever as Lever]} ({count})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="section-header">Recent Signals</div>
        {recentSignals.map((s) => (
          <div
            key={s.id}
            style={{
              padding: '8px 0',
              borderBottom: '1px solid var(--border-muted)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{s.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {LEVER_LABELS[s.lever]} · {formatDate(s.published_date ?? s.ingested_date ?? '')}
                </span>
                <a
                  href={s.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 11,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    padding: '1px 7px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-input)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Learn More ↗
                </a>
              </div>
            </div>
            <span className={`badge badge-${s.priority}`} style={{ flexShrink: 0 }}>
              {s.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
