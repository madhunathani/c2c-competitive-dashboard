import type { SignalScores } from './taxonomy';

const WEIGHTS = {
  relevance: 0.30,
  magnitude: 0.25,
  novelty: 0.20,
  confidence: 0.15,
  recency: 0.10,
};

export function computeCompositeScore(
  scores: Omit<SignalScores, 'composite'>
): number {
  const raw =
    scores.relevance * WEIGHTS.relevance +
    scores.magnitude * WEIGHTS.magnitude +
    scores.novelty * WEIGHTS.novelty +
    scores.confidence * WEIGHTS.confidence +
    scores.recency * WEIGHTS.recency;
  return Math.round(raw * 10) / 10;
}

export function priorityFromScore(composite: number): 'high' | 'medium' | 'low' {
  if (composite >= 8.0) return 'high';
  if (composite >= 6.5) return 'medium';
  return 'low';
}

export function recencyScore(publishedDate: string): number {
  const days = Math.floor(
    (Date.now() - new Date(publishedDate).getTime()) / 86_400_000
  );
  if (days <= 7) return 10;
  if (days <= 14) return 8;
  if (days <= 30) return 6;
  if (days <= 60) return 4;
  if (days <= 90) return 2;
  return 1;
}

export function scoreLabel(score: number): string {
  if (score >= 9) return 'Critical';
  if (score >= 8) return 'High';
  if (score >= 6.5) return 'Medium';
  return 'Low';
}
