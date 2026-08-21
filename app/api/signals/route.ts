import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import signals from '@/data/processed/signals.json';
import type { Signal } from '@/lib/taxonomy';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  let filtered = signals as Signal[];

  const company = searchParams.get('company');
  const stage = searchParams.get('journey_stage');
  const lever = searchParams.get('lever');
  const priority = searchParams.get('priority');
  const segment = searchParams.get('seller_segment');

  if (company) filtered = filtered.filter((s) => s.company === company);
  if (stage) filtered = filtered.filter((s) => s.journey_stage === stage);
  if (lever) filtered = filtered.filter((s) => s.lever === lever);
  if (priority) filtered = filtered.filter((s) => s.priority === priority);
  if (segment) filtered = filtered.filter((s) => s.seller_segment === segment);

  return NextResponse.json(filtered);
}
