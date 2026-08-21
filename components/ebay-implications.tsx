import type { Signal } from '@/lib/taxonomy';
import { LEVER_LABELS, JOURNEY_STAGE_LABELS } from '@/lib/taxonomy';
import { formatDate } from '@/lib/utils';

interface Props {
  signals: Signal[];
  limit?: number;
}

export default function EbayImplications({ signals, limit = 5 }: Props) {
  const highPriority = [...signals]
    .filter((s) => s.priority === 'high')
    .sort((a, b) => b.scores.composite - a.scores.composite)
    .slice(0, limit);

  if (highPriority.length === 0) {
    return (
      <div className="card" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
        No high-priority signals in current view.
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--danger)',
            display: 'inline-block',
            animation: 'pulse 2s infinite',
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 600 }}>eBay Implications — High Priority</span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          Top {highPriority.length} by composite score
        </span>
      </div>

      {highPriority.map((signal, idx) => (
        <div
          key={signal.id}
          style={{
            padding: '16px 20px',
            borderBottom: idx < highPriority.length - 1 ? '1px solid var(--border-muted)' : 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                {signal.company}: {signal.title}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className={`badge badge-stage-${signal.journey_stage}`}>
                  {JOURNEY_STAGE_LABELS[signal.journey_stage]}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    alignSelf: 'center',
                  }}
                >
                  {LEVER_LABELS[signal.lever]} · {formatDate(signal.published_date ?? signal.ingested_date ?? '')}
                </span>
              </div>
            </div>
          </div>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              borderLeft: '2px solid var(--accent-dim)',
              paddingLeft: 12,
            }}
          >
            {signal.ebay_implications}
          </p>
          <a
            href={signal.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              marginTop: 10,
              padding: '4px 10px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--bg-input)',
              color: 'var(--accent)',
              fontSize: 12,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Learn More ↗
          </a>
        </div>
      ))}
    </div>
  );
}
