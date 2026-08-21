'use client';

import { useState, useMemo } from 'react';
import signalsData from '@/data/processed/signals.json';
import type { Signal } from '@/lib/taxonomy';
import FilterBar, { type Filters } from '@/components/filter-bar';
import SignalsTable from '@/components/signals-table';

const ALL_SIGNALS = signalsData as Signal[];

export default function SignalsPage() {
  const [filters, setFilters] = useState<Filters>({
    company: '',
    journey_stage: '',
    lever: '',
    priority: '',
    seller_segment: '',
    search: '',
  });

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return ALL_SIGNALS.filter((s) => {
      if (filters.company && s.company !== filters.company) return false;
      if (filters.journey_stage && s.journey_stage !== filters.journey_stage) return false;
      if (filters.lever && s.lever !== filters.lever) return false;
      if (filters.priority && s.priority !== filters.priority) return false;
      if (filters.seller_segment && s.seller_segment !== filters.seller_segment) return false;
      if (q && !s.title.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q) && !s.company.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [filters]);

  return (
    <div className="main-content">
      <div className="page-title">Signals</div>
      <div className="page-subtitle">
        All competitive signals · click any row to expand details and eBay implications
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        totalCount={ALL_SIGNALS.length}
        filteredCount={filtered.length}
      />

      <SignalsTable signals={filtered} />
    </div>
  );
}
