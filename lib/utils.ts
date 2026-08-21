import type { Signal } from './taxonomy';

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export function scoreToHeatColor(count: number, max: number): string {
  if (count === 0) return 'transparent';
  const intensity = count / Math.max(max, 1);
  if (intensity >= 0.8) return '#1f4082';
  if (intensity >= 0.6) return '#1a3a6e';
  if (intensity >= 0.4) return '#163058';
  if (intensity >= 0.2) return '#112244';
  return '#0d1a33';
}

export function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const key = fn(item);
    acc[key] = acc[key] ? [...acc[key], item] : [item];
    return acc;
  }, {});
}

export function topSignals(signals: Signal[], n = 5): Signal[] {
  return [...signals]
    .sort((a, b) => b.scores.composite - a.scores.composite)
    .slice(0, n);
}

export function priorityCount(signals: Signal[], priority: string): number {
  return signals.filter((s) => s.priority === priority).length;
}

export function topCompany(signals: Signal[]): string {
  const counts = groupBy(signals, (s) => s.company);
  return Object.entries(counts).sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? '—';
}

export function topLever(signals: Signal[]): string {
  const counts = groupBy(signals, (s) => s.lever);
  return Object.entries(counts).sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? '—';
}
