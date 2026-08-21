'use client';

import { useState, useMemo } from 'react';
import type { Signal } from '@/lib/taxonomy';
import SummaryCards from '@/components/summary-cards';
import SignalsTable from '@/components/signals-table';
import EbayImplications from '@/components/ebay-implications';

function fmtDate(d: Date): string {
  return [
    String(d.getDate()).padStart(2, '0'),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getFullYear()).slice(2),
  ].join('/');
}

function midnight(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

interface Props {
  signals: Signal[];
}

export default function OverviewFilters({ signals }: Props) {
  const { minDate, totalDays } = useMemo(() => {
    const today = midnight(new Date());
    const dates = signals
      .map((s) => new Date(s.published_date ?? s.ingested_date ?? ''))
      .filter((d) => !isNaN(d.getTime()))
      .map((d) => midnight(d).getTime());

    if (dates.length === 0) return { minDate: today, totalDays: 0 };

    const earliest = new Date(Math.min(...dates));
    const total = Math.round((today.getTime() - earliest.getTime()) / 86_400_000);
    return { minDate: earliest, totalDays: total };
  }, [signals]);

  const [sliderVal, setSliderVal] = useState(365);
  const effectiveDays = Math.min(sliderVal, totalDays);

  const fromDate = useMemo(() => {
    const today = midnight(new Date());
    const d = new Date(today);
    d.setDate(d.getDate() - effectiveDays);
    return d;
  }, [effectiveDays]);

  const today = useMemo(() => midnight(new Date()), []);
  const progress = totalDays > 0 ? (effectiveDays / totalDays) * 100 : 100;

  const filtered = useMemo(() => {
    return signals.filter((s) => {
      const dateStr = s.published_date ?? s.ingested_date ?? '';
      if (dateStr && new Date(dateStr) < fromDate) return false;
      return true;
    });
  }, [signals, fromDate]);

  const isAllTime = effectiveDays >= totalDays;

  return (
    <>
      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <SummaryCards signals={filtered} />

      {/* ── Time slider ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 18px 10px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {fmtDate(today)}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Today
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              From
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {isAllTime ? 'All time' : fmtDate(fromDate)}
            </span>
          </div>
        </div>

        <div style={{ position: 'relative', paddingBottom: 20 }}>
          <input
            type="range"
            min={0}
            max={totalDays || 1}
            step={1}
            value={effectiveDays}
            onChange={(e) => setSliderVal(Number(e.target.value))}
            className="time-slider"
            style={{ '--slider-progress': `${progress}%` } as React.CSSProperties}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {fmtDate(today)}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {totalDays}d range · {filtered.length} signal{filtered.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {fmtDate(minDate)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 20, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>All Signals</div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          {filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              No signals match the selected filters.
            </div>
          ) : (
            <SignalsTable signals={filtered} compact={false} />
          )}
        </div>

        <div>
          <div className="section-header mb-4">eBay Action Items</div>
          <EbayImplications signals={filtered} limit={8} />
        </div>
      </div>
    </>
  );
}
