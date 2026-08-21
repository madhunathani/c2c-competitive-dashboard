'use client';

import { useState } from 'react';
import type { Signal } from '@/lib/taxonomy';
import { LEVER_LABELS, JOURNEY_STAGE_LABELS, SELLER_SEGMENT_LABELS } from '@/lib/taxonomy';
import { formatDate } from '@/lib/utils';

interface Props {
  signals: Signal[];
  compact?: boolean;
}

type SortKey = 'published_date' | 'company';
type SortDir = 'asc' | 'desc';

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
  'StockX': '#00b140',
  'Temu': '#fb923c',
  'USPS': '#004b87',
  'Vinted': '#56d364',
  'Whatnot': '#d29922',
  'Wikifarmer': '#84cc16',
};

const COMPANY_DOMAINS: Record<string, string> = {
  'Amazon': 'amazon.com',
  'Depop': 'depop.com',
  'Etsy': 'etsy.com',
  'Facebook Marketplace': 'facebook.com',
  'Fleek': 'fleek.fashion',
  'Groupon': 'groupon.com',
  'Influur': 'influur.com',
  'Kleinanzeigen': 'kleinanzeigen.de',
  'Mercari': 'mercari.com',
  'Pickle': 'pickle.com',
  'Poshmark': 'poshmark.com',
  'Promoted': 'promoted.ai',
  'StockX': 'stockx.com',
  'Temu': 'temu.com',
  'USPS': 'usps.com',
  'Vinted': 'vinted.com',
  'Whatnot': 'whatnot.com',
  'Wikifarmer': 'wikifarmer.com',
};

function CompanyWordmark({ company }: { company: string }) {
  const domain = COMPANY_DOMAINS[company];
  const color = COMPANY_COLORS[company] ?? 'var(--text-muted)';
  const [failed, setFailed] = useState(false);

  if (!domain || failed) {
    return (
      <span
        title={company}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 6,
          background: `${color}33`,
          color,
          fontSize: 11,
          fontWeight: 700,
          border: `1px solid ${color}55`,
          flexShrink: 0,
        }}
      >
        {company[0]}
      </span>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt={company}
      title={company}
      width={32}
      height={32}
      style={{ borderRadius: 6, display: 'block' }}
      onError={() => setFailed(true)}
    />
  );
}


export default function SignalsTable({ signals, compact = false }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('published_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = [...signals].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'published_date') cmp = (a.published_date ?? a.ingested_date ?? '').localeCompare(b.published_date ?? b.ingested_date ?? '');
    if (sortKey === 'company') cmp = a.company.localeCompare(b.company);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span style={{ opacity: 0.3 }}> ↕</span>;
    return <span style={{ color: 'var(--accent)' }}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>;
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th onClick={() => toggleSort('company')}>
              Company <SortIcon k="company" />
            </th>
            <th style={{ minWidth: 260 }}>Signal</th>
            {!compact && <th>Stage</th>}
            {!compact && <th>Lever</th>}
            {!compact && <th>Segment</th>}
            <th onClick={() => toggleSort('published_date')}>
              Date <SortIcon k="published_date" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((signal) => {
            const isExpanded = expanded === signal.id;
            return (
              <>
                <tr
                  key={signal.id}
                  onClick={() => setExpanded(isExpanded ? null : signal.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <CompanyWordmark company={signal.company} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 3 }}>
                      {signal.title}
                    </div>
                    {!compact && (
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.4 }}>
                        {signal.description.slice(0, 120)}…
                      </div>
                    )}
                  </td>
                  {!compact && (
                    <td>
                      <span className={`badge badge-stage-${signal.journey_stage}`}>
                        {JOURNEY_STAGE_LABELS[signal.journey_stage]}
                      </span>
                    </td>
                  )}
                  {!compact && (
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      {LEVER_LABELS[signal.lever]}
                    </td>
                  )}
                  {!compact && (
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {SELLER_SEGMENT_LABELS[signal.seller_segment]}
                    </td>
                  )}
                  <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {formatDate(signal.published_date ?? signal.ingested_date ?? '')}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${signal.id}-expanded`}>
                    <td colSpan={compact ? 3 : 6} style={{ padding: '0 14px 16px', background: 'var(--bg-hover)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 12 }}>
                        <div>
                          <div className="section-header" style={{ marginBottom: 6 }}>Description</div>
                          <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
                            {signal.description}
                          </p>
                          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                            {signal.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                          </div>
                          <a
                            href={signal.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              marginTop: 12,
                              padding: '5px 12px',
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
                        <div>
                          <div className="section-header" style={{ marginBottom: 6 }}>eBay Implications</div>
                          <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
                            {signal.ebay_implications}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
