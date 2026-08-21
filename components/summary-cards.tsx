import type { Signal } from '@/lib/taxonomy';
import { topCompany, topLever } from '@/lib/utils';
import { LEVER_LABELS } from '@/lib/taxonomy';
import type { Lever } from '@/lib/taxonomy';

interface Props {
  signals: Signal[];
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accent ? { color: accent } : {}}>
        {value}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function SummaryCards({ signals }: Props) {
  const company = topCompany(signals);
  const lever = topLever(signals);
  const acqCount = signals.filter((s) => s.journey_stage === 'acquisition').length;
  const listCount = signals.filter((s) => s.journey_stage === 'listing').length;
  const engCount = signals.filter((s) => s.journey_stage === 'engagement_retention').length;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 28,
      }}
    >
      <StatCard
        label="Total Signals"
        value={signals.length}
      />
      <StatCard
        label="Most Active Competitor"
        value={company}
        sub={`${signals.filter((s) => s.company === company).length} signals`}
      />
      <StatCard
        label="Top Lever"
        value={LEVER_LABELS[lever as Lever] ?? lever}
        sub={`${signals.filter((s) => s.lever === lever).length} signals`}
      />
      <StatCard
        label="Acquisition"
        value={acqCount}
        sub="signals"
        accent="var(--accent)"
      />
      <StatCard
        label="Listing"
        value={listCount}
        sub="signals"
        accent="var(--purple)"
      />
      <StatCard
        label="Engagement & Retention"
        value={engCount}
        sub="signals"
        accent="var(--orange)"
      />
    </div>
  );
}
