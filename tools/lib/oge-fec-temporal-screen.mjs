import crypto from 'node:crypto';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function strictDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) ? time : null;
}

export function classifyTemporalCandidate(candidate) {
  const interestFrom = strictDate(candidate?.interest_dates?.valid_from);
  const interestUntil = strictDate(candidate?.interest_dates?.valid_until);
  const fecFrom = strictDate(candidate?.fec_payee_ref?.date_range_observed?.earliest);
  const fecUntil = strictDate(candidate?.fec_payee_ref?.date_range_observed?.latest);
  let temporal_relation = 'temporally_unknown';
  let reason = 'missing_strict_bounded_interval';
  if ([interestFrom, interestUntil, fecFrom, fecUntil].every(value => value !== null)) {
    if (interestFrom > interestUntil || fecFrom > fecUntil) {
      reason = 'invalid_interval_order';
    } else if (interestUntil < fecFrom || fecUntil < interestFrom) {
      temporal_relation = 'non_overlapping';
      reason = 'strict_intervals_do_not_overlap';
    } else {
      temporal_relation = 'overlapping';
      reason = 'strict_intervals_overlap';
    }
  }
  return {
    overlap_candidate_id: candidate?.overlap_candidate_id ?? null,
    match_rule: candidate?.match_rule ?? null,
    temporal_relation,
    reason,
    eligible_for_identity_review: temporal_relation === 'overlapping',
    interest_interval: { valid_from: candidate?.interest_dates?.valid_from ?? null, valid_until: candidate?.interest_dates?.valid_until ?? null },
    fec_candidate_interval: candidate?.fec_payee_ref?.date_range_observed ?? { earliest: null, latest: null },
    oge_source_sha256: candidate?.oge_interest_ref?.source_sha256 ?? null,
    oge_source_page: candidate?.oge_interest_ref?.source_page ?? null,
    fec_candidate_id: candidate?.fec_payee_ref?.candidate_id ?? null,
    interpretation: 'This screen compares only the bounded dates preserved on the unresolved lexical candidate; it does not resolve identity, ownership, payment semantics, or causation.',
    graph_effect: 'none',
  };
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
