'use client';

import { useState, useMemo } from 'react';
import signalsData from '@/data/processed/signals.json';
import type { Signal } from '@/lib/taxonomy';
import { JOURNEY_STAGES, JOURNEY_STAGE_LABELS, LEVER_LABELS, LEVERS } from '@/lib/taxonomy';
import LeverHeatmap from '@/components/lever-heatmap';

const ALL_SIGNALS = signalsData as Signal[];

export default function LeversPage() {
  const [stageFilter, setStageFilter] = useState('');

  const filtered = useMemo(
    () =>
      stageFilter
        ? ALL_SIGNALS.filter((s) => s.journey_stage === stageFilter)
        : ALL_SIGNALS,
    [stageFilter]
  );

  const leverTotals = useMemo(() => {
    return LEVERS.map((lever) => ({
      lever,
      label: LEVER_LABELS[lever],
      count: filtered.filter((s) => s.lever === lever).length,
      highCount: filtered.filter((s) => s.lever === lever && s.priority === 'high').length,
    })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  return (
    <div className="main-content">
      <div className="page-title">Levers</div>
      <div className="page-subtitle">
        Company-by-lever signal heatmap · hover a cell to see its signals
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={() => setStageFilter('')}
          style={{
            padding: '5px 14px',
            borderRadius: 20,
            border: '1px solid var(--border)',
            background: !stageFilter ? 'var(--accent-dim)' : 'transparent',
            color: !stageFilter ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          All Stages
        </button>
        {JOURNEY_STAGES.map((stage) => (
          <button
            key={stage}
            onClick={() => setStageFilter(stageFilter === stage ? '' : stage)}
            style={{
              padding: '5px 14px',
              borderRadius: 20,
              border: '1px solid var(--border)',
              background: stageFilter === stage ? 'var(--accent-dim)' : 'transparent',
              color: stageFilter === stage ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {JOURNEY_STAGE_LABELS[stage]}
          </button>
        ))}
      </div>

      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 20,
          marginBottom: 24,
        }}
      >
        <div className="section-header" style={{ marginBottom: 16 }}>
          Company × Lever Heatmap
          <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-muted)' }}>
            ({filtered.length} signals{stageFilter ? ` · ${JOURNEY_STAGE_LABELS[stageFilter as keyof typeof JOURNEY_STAGE_LABELS]}` : ''})
          </span>
        </div>
        <LeverHeatmap signals={filtered} />
      </div>

      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 20,
        }}
      >
        <div className="section-header" style={{ marginBottom: 12 }}>Lever Rankings</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leverTotals.filter((l) => l.count > 0).map((l, idx) => (
            <div
              key={l.lever}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <span style={{ width: 20, color: 'var(--text-muted)', fontSize: 12, textAlign: 'right' }}>
                {idx + 1}
              </span>
              <div
                style={{
                  height: 8,
                  width: Math.max((l.count / (leverTotals[0]?.count ?? 1)) * 200, 8),
                  background: 'var(--accent)',
                  borderRadius: 4,
                  opacity: 0.6,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>
                {l.label}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                {l.count} signal{l.count !== 1 ? 's' : ''}
                {l.highCount > 0 && (
                  <span style={{ color: 'var(--danger)', marginLeft: 6 }}>
                    · {l.highCount} high
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
