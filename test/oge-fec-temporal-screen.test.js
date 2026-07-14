import assert from 'node:assert/strict';
import { classifyTemporalCandidate } from '../tools/lib/oge-fec-temporal-screen.mjs';

const base = {
  overlap_candidate_id: 'candidate:1', match_rule: 'exact_normalized_name',
  oge_interest_ref: { source_sha256: 'a'.repeat(64), source_page: 2 },
  fec_payee_ref: { candidate_id: 'fec:1', date_range_observed: { earliest: '2020-01-01', latest: '2020-12-31' } },
};
assert.equal(classifyTemporalCandidate({ ...base, interest_dates: { valid_from: '2020-05-01', valid_until: '2020-05-01' } }).temporal_relation, 'overlapping');
assert.equal(classifyTemporalCandidate({ ...base, interest_dates: { valid_from: '2025-05-01', valid_until: '2025-05-01' } }).temporal_relation, 'non_overlapping');
const unknown = classifyTemporalCandidate({ ...base, interest_dates: { valid_from: null, valid_until: '2020-12-31' } });
assert.equal(unknown.temporal_relation, 'temporally_unknown');
assert.equal(unknown.eligible_for_identity_review, false);
const ocr = classifyTemporalCandidate({ ...base, interest_dates: { valid_from: '5118/2026', valid_until: '5118/2026' } });
assert.equal(ocr.temporal_relation, 'temporally_unknown');
assert.equal(ocr.graph_effect, 'none');
console.log('oge-fec-temporal-screen.test.js: OK');
