import { classRank } from './graph.js';

export function computePathScore(path) {
  if (!path) return null;
  const base = Math.max(0, 100 - path.number * 7);
  const weakestPenalty = Math.max(0, ...path.hops.map((hop) => (classRank(hop.edge.evidence_class) - 1) * 8));
  const listedPenalty = path.hops.some((hop) => hop.edge.status === 'listed') ? 10 : 0;
  const derivedPenalty = path.hops.filter((hop) => ['derived', 'judgment', 'open'].includes(hop.edge.evidence_class)).length * 6;
  return Math.max(0, base - weakestPenalty - listedPenalty - derivedPenalty);
}

export function confidenceLabel(score) {
  if (score == null) return 'none';
  if (score >= 85) return 'high';
  if (score >= 65) return 'medium';
  if (score >= 40) return 'low';
  return 'audit first';
}
