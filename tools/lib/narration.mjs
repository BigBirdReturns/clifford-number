import { evidenceWeight } from './ledger.mjs';
import { basisSupportsTimeSlice } from './hops.mjs';
import { formatWindow, overlapsPeriod } from './temporal.mjs';

export function narrationBasesForSlice(edge, asOf = null) {
  if (!asOf) return edge.surfaces;
  return edge.surfaces.filter(s =>
    basisSupportsTimeSlice(s)
    && overlapsPeriod({ valid_from: s.valid_from, valid_until: s.valid_until, dated: true }, asOf));
}

export function selectNarrationBasis(edge, { asOf = null, populationOf = () => 0 } = {}) {
  return narrationBasesForSlice(edge, asOf).slice().sort((x, y) =>
    (populationOf(x.surface_id) - populationOf(y.surface_id))
    || ((y.temporal_status === 'dated' ? 1 : 0) - (x.temporal_status === 'dated' ? 1 : 0))
    || (evidenceWeight(x.evidence_class) - evidenceWeight(y.evidence_class))
    || x.surface_id.localeCompare(y.surface_id)
  )[0];
}

export function narrationWindowText(basis) {
  if (basis.temporal_status !== 'dated') return '(co-presence dates not fully documented)';
  return `during ${formatWindow({
    valid_from: basis.valid_from ?? null,
    valid_until: basis.valid_until ?? null,
    dated: true,
  })}`;
}
