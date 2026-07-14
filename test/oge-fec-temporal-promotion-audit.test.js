import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { classifyTemporalCandidate } from '../tools/lib/oge-fec-temporal-screen.mjs';

const audit = JSON.parse(fs.readFileSync('test/audits/oge-fec-temporal-frontier-audit.json', 'utf8'));
const visuallyRecoveredDates = {
  '5118/2026': '2026-05-18',
  '417/2026': '2026-04-07',
  '4127/2026': '2026-04-27',
  '4110/2026': '2026-04-10',
  '4120/2026': '2026-04-20',
  '4128/2026': '2026-04-28',
  '4115/2026': '2026-04-15',
  '1123/2026': '2026-01-23',
};

function strictCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function completeReceipt(receipt) {
  return Boolean(receipt?.source_sha256 && Number.isInteger(receipt?.source_page) && receipt?.source_row_label);
}

function promotionGate(candidate) {
  const held = reason => ({ status: 'held', reason, graph_effect: 'none' });
  if (candidate.record_kind !== 'reported_transaction') {
    return held('structural_record_has_no_event_interval');
  }

  let eventDate = candidate.transaction_date_normalized;
  if (!strictCalendarDate(eventDate)) {
    const correction = candidate.visual_date_correction;
    if (!correction
      || correction.method !== 'source_page_visual_review'
      || !completeReceipt(correction.receipt)
      || !strictCalendarDate(correction.normalized_date)
      || !correction.visible_token) {
      return held('transaction_date_requires_source_page_visual_correction');
    }
    eventDate = correction.normalized_date;
  }

  const itemizations = (candidate.fec_itemizations ?? []).filter(item => (
    strictCalendarDate(item.date) && completeReceipt(item.receipt)
  ));
  if (!itemizations.length) return held('actual_fec_itemization_receipt_required');
  if (!itemizations.some(item => item.date === eventDate)) {
    return held('no_same_day_receipted_fec_itemization');
  }

  if (candidate.identity_resolution !== 'resolved_same_legal_entity') {
    return { status: 'eligible_for_identity_review', reason: 'receipted_same_day_events_identity_unresolved', graph_effect: 'none' };
  }
  if (!['filer', 'spouse', 'dependent_child'].includes(candidate.holder_scope)) {
    return held('holder_scope_unresolved');
  }
  if (candidate.fec_itemization_semantics !== 'unique_nonmemo_itemization') {
    return held('fec_amendment_duplicate_or_memo_semantics_unresolved');
  }
  return {
    status: 'eligible_for_crossing_review',
    reason: 'temporal_identity_holder_and_itemization_gates_satisfied',
    graph_effect: 'none',
  };
}

test('decomposes the 1,040 unknown pairs into structural and OCR causes without pair-count inflation', () => {
  assert.equal(audit.population.temporally_unknown_candidate_pairs, 1040);
  assert.equal(audit.population.distinct_oge_interest_rows, 178);
  assert.equal(audit.evidence_causes[0].candidate_pairs, 995);
  assert.equal(audit.evidence_causes[0].distinct_oge_interest_rows, 155);
  assert.equal(audit.evidence_causes[1].candidate_pairs, 45);
  assert.equal(audit.evidence_causes[1].distinct_oge_interest_rows, 23);
});

test('does not manufacture an annual ownership interval from a report date', () => {
  assert.deepEqual(promotionGate({
    record_kind: 'other_asset_or_income',
    report_date: '2025-06-14',
    fec_aggregate_range: { earliest: '2024-01-01', latest: '2026-01-01' },
  }), {
    status: 'held',
    reason: 'structural_record_has_no_event_interval',
    graph_effect: 'none',
  });
});

test('all 45 visually recoverable transaction pairs become non-overlapping under the current aggregate-range screen', () => {
  assert.deepEqual(audit.visual_date_recovery.text_layer_to_visible_date, visuallyRecoveredDates);
  assert.equal(audit.visual_date_recovery.candidate_pairs_with_visually_recovered_dates, 45);
  assert.deepEqual(audit.visual_date_recovery.projected_current_screen_after_source_page_corrections, {
    non_overlapping: 177,
    temporally_unknown: 995,
    overlapping: 0,
    delta_non_overlapping: 45,
    delta_temporally_unknown: -45,
  });
});

test('requires a source-addressed visual correction before using an OCR-damaged transaction date', () => {
  const base = {
    record_kind: 'reported_transaction',
    transaction_date_as_reported: '5118/2026',
    transaction_date_normalized: null,
    fec_itemizations: [{
      date: '2026-05-18',
      receipt: { source_sha256: 'fec'.repeat(21) + 'f', source_page: 1, source_row_label: 'row/1' },
    }],
  };
  assert.equal(promotionGate(base).reason, 'transaction_date_requires_source_page_visual_correction');
  assert.equal(promotionGate({
    ...base,
    visual_date_correction: {
      method: 'source_page_visual_review',
      visible_token: '5/18/2026',
      normalized_date: '2026-05-18',
      receipt: { source_sha256: '89d331853a821b576dc63284228f277637a8325bf8eb2e094f2807589c778f46', source_page: 24, source_row_label: 'transactions/731@y443.2' },
    },
  }).status, 'eligible_for_identity_review');
});

test('does not substitute an aggregate FEC payee range for an actual itemization receipt', () => {
  const result = promotionGate({
    record_kind: 'reported_transaction',
    transaction_date_normalized: '2025-01-15',
    fec_aggregate_range: { earliest: '2025-01-01', latest: '2025-01-31' },
  });
  assert.equal(result.reason, 'actual_fec_itemization_receipt_required');
});

test('rejects impossible calendar dates rather than allowing Date.parse normalization', () => {
  const result = promotionGate({
    record_kind: 'reported_transaction',
    transaction_date_normalized: '2025-02-30',
  });
  assert.equal(result.reason, 'transaction_date_requires_source_page_visual_correction');
});

test('requires same-legal-entity, holder-scope, and itemization-semantic gates before crossing review', () => {
  const base = {
    record_kind: 'reported_transaction',
    transaction_date_normalized: '2026-05-18',
    fec_itemizations: [{
      date: '2026-05-18',
      receipt: { source_sha256: 'a'.repeat(64), source_page: 1, source_row_label: 'fec/1' },
    }],
  };
  assert.equal(promotionGate(base).status, 'eligible_for_identity_review');
  assert.equal(promotionGate({ ...base, identity_resolution: 'resolved_same_legal_entity' }).reason, 'holder_scope_unresolved');
  assert.equal(promotionGate({ ...base, identity_resolution: 'resolved_same_legal_entity', holder_scope: 'filer' }).reason, 'fec_amendment_duplicate_or_memo_semantics_unresolved');
  assert.deepEqual(promotionGate({
    ...base,
    identity_resolution: 'resolved_same_legal_entity',
    holder_scope: 'filer',
    fec_itemization_semantics: 'unique_nonmemo_itemization',
  }), {
    status: 'eligible_for_crossing_review',
    reason: 'temporal_identity_holder_and_itemization_gates_satisfied',
    graph_effect: 'none',
  });
});

test('classifier rejects impossible calendar dates', () => {
  const current = classifyTemporalCandidate({
    overlap_candidate_id: 'adversarial-invalid-date',
    interest_dates: { valid_from: '2025-02-30', valid_until: '2025-02-30' },
    fec_payee_ref: {
      candidate_id: 'fec-1',
      date_range_observed: { earliest: '2025-03-02', latest: '2025-03-02' },
    },
  });
  assert.equal(current.eligible_for_identity_review, false);
});

test('classifier does not use an aggregate payee date range as event-overlap proof', () => {
  const current = classifyTemporalCandidate({
    overlap_candidate_id: 'adversarial-aggregate-range',
    interest_dates: { valid_from: '2025-01-15', valid_until: '2025-01-15' },
    fec_payee_ref: {
      candidate_id: 'fec-2',
      date_range_observed: { earliest: '2025-01-01', latest: '2025-01-31' },
    },
  });
  assert.equal(current.eligible_for_identity_review, false);
});
