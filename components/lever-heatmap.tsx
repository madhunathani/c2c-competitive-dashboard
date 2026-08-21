'use client';

import { useState } from 'react';
import type { Signal } from '@/lib/taxonomy';
import { COMPANIES, LEVERS, LEVER_LABELS } from '@/lib/taxonomy';

interface Props {
  signals: Signal[];
}

function heatColor(count: number, max: number): { bg: string; fg: string } {
  if (count === 0) return { bg: 'var(--bg-input)', fg: 'var(--text-muted)' };
  const t = count / Math.max(max, 1);
  if (t >= 0.8) return { bg: '#1f4082', fg: '#58a6ff' };
  if (t >= 0.6) return { bg: '#1a3a6e', fg: '#79b4f7' };
  if (t >= 0.4) return { bg: '#163058', fg: '#9ec4f8' };
  if (t >= 0.2) return { bg: '#112244', fg: '#b8d3f9' };
  return { bg: '#0d1a33', fg: '#d0e5fc' };
}

export default function LeverHeatmap({ signals }: Props) {
  const [hoveredCell, setHoveredCell] = useState<{ company: string; lever: string } | null>(null);

  const countMap: Record<string, Record<string, number>> = {};
  for (const company of COMPANIES) {
    countMap[company] = {};
    for (const lever of LEVERS) {
      countMap[company][lever] = 0;
    }
  }
  for (const s of signals) {
    if (countMap[s.company]) {
      countMap[s.company][s.lever] = (countMap[s.company][s.lever] ?? 0) + 1;
    }
  }

  const maxCount = Math.max(
    ...COMPANIES.flatMap((c) => LEVERS.map((l) => countMap[c][l] ?? 0)),
    1
  );

  const hoveredSignals = hoveredCell
    ? signals.filter((s) => s.company === hoveredCell.company && s.lever === hoveredCell.lever)
    : [];

  return (
    <div>
      <div className="heatmap-grid">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th style={{ background: 'transparent', borderBottom: 'none', width: 140 }} />
              {LEVERS.map((lever) => (
                <th key={lever} className="heatmap-col-label" style={{ background: 'transparent', borderBottom: 'none' }}>
                  {LEVER_LABELS[lever]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPANIES.map((company) => (
              <tr key={company}>
                <td className="heatmap-row-label">{company}</td>
                {LEVERS.map((lever) => {
                  const count = countMap[company][lever] ?? 0;
                  const { bg, fg } = heatColor(count, maxCount);
                  const isHovered =
                    hoveredCell?.company === company && hoveredCell?.lever === lever;
                  return (
                    <td
                      key={lever}
                      className="heatmap-cell"
                      style={{
                        background: bg,
                        color: fg,
                        outline: isHovered ? '2px solid var(--accent)' : undefined,
                      }}
                      onMouseEnter={() => count > 0 && setHoveredCell({ company, lever })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {count > 0 ? count : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hoveredCell && hoveredSignals.length > 0 && (
        <div
          style={{
            marginTop: 20,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 16,
          }}
        >
          <div className="section-header" style={{ marginBottom: 10 }}>
            {hoveredCell.company} — {LEVER_LABELS[hoveredCell.lever as keyof typeof LEVER_LABELS]}
          </div>
          {hoveredSignals.map((s) => (
            <div
              key={s.id}
              style={{
                padding: '10px 0',
                borderBottom: '1px solid var(--border-muted)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.ebay_implications}</div>
                </div>
                <span className={`badge badge-${s.priority}`} style={{ flexShrink: 0 }}>
                  {s.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          color: 'var(--text-muted)',
        }}
      >
        <span>Intensity:</span>
        {[0, 1, 2, 3].map((i) => {
          const frac = i / 3;
          const { bg } = heatColor(Math.round(frac * maxCount), maxCount);
          return (
            <span
              key={i}
              style={{
                width: 20,
                height: 14,
                borderRadius: 3,
                background: bg,
                display: 'inline-block',
              }}
            />
          );
        })}
        <span>Low → High</span>
      </div>
    </div>
  );
}
