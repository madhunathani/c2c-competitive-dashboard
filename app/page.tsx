import signals from '@/data/processed/signals.json';
import type { Signal } from '@/lib/taxonomy';
import OverviewFilters from '@/components/overview-filters';

export const revalidate = 0;

export default function HomePage() {
  const allSignals = signals as unknown as Signal[];

  return (
    <div className="main-content">
      <div className="page-title">C2C Competitive Intelligence</div>
      <div className="page-subtitle">
        Competitor actions affecting seller acquisition and listing flows · {allSignals.length} signals tracked
      </div>

      <OverviewFilters signals={allSignals} />
    </div>
  );
}
