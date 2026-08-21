'use client';

import {
  COMPANIES,
  JOURNEY_STAGES,
  JOURNEY_STAGE_LABELS,
  LEVERS,
  LEVER_LABELS,
  SELLER_SEGMENTS,
  SELLER_SEGMENT_LABELS,
} from '@/lib/taxonomy';

export interface Filters {
  company: string;
  journey_stage: string;
  lever: string;
  priority: string;
  seller_segment: string;
  search: string;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  totalCount: number;
  filteredCount: number;
}

export default function FilterBar({ filters, onChange, totalCount, filteredCount }: Props) {
  function set(key: keyof Filters) {
    return (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      onChange({ ...filters, [key]: e.target.value });
  }

  function reset() {
    onChange({ company: '', journey_stage: '', lever: '', priority: '', seller_segment: '', search: '' });
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        marginBottom: 20,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <input
        type="text"
        placeholder="Search signals…"
        value={filters.search}
        onChange={set('search')}
        style={{ width: 200 }}
      />

      <select value={filters.company} onChange={set('company')}>
        <option value="">All Companies</option>
        {COMPANIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select value={filters.journey_stage} onChange={set('journey_stage')}>
        <option value="">All Stages</option>
        {JOURNEY_STAGES.map((s) => (
          <option key={s} value={s}>{JOURNEY_STAGE_LABELS[s]}</option>
        ))}
      </select>

      <select value={filters.lever} onChange={set('lever')}>
        <option value="">All Levers</option>
        {LEVERS.map((l) => (
          <option key={l} value={l}>{LEVER_LABELS[l]}</option>
        ))}
      </select>

      <select value={filters.priority} onChange={set('priority')}>
        <option value="">All Priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <select value={filters.seller_segment} onChange={set('seller_segment')}>
        <option value="">All Segments</option>
        {SELLER_SEGMENTS.map((s) => (
          <option key={s} value={s}>{SELLER_SEGMENT_LABELS[s]}</option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={reset}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-secondary)',
            fontSize: 12,
            padding: '6px 10px',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      )}

      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
        {filteredCount === totalCount
          ? `${totalCount} signals`
          : `${filteredCount} of ${totalCount} signals`}
      </span>
    </div>
  );
}
