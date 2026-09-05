import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { diagnoseAwardSearch } from '../tools/lib/award-search-evidence.mjs';

const manifest = JSON.parse(fs.readFileSync('data/research/natsec100-award-control-manifest.json', 'utf8'));
assert.equal(manifest.schema_version, 'natsec100-award-control-manifest@1');
assert.equal(manifest.coverage.leads_queried, 5);
assert.ok(manifest.coverage.official_award_rows_observed > 0);
assert.equal(manifest.source_native_real_positive.gate.gate, 'pass');
assert.deepEqual(manifest.source_native_real_positive.gate.receipt_roles_satisfied, ['award_record']);
assert.match(manifest.source_native_real_positive.award.recipient_uei, /^[A-Z0-9]{12}$/);
assert.equal(manifest.cross_corpus_join_status, 'held_identity_unresolved');
assert.match(manifest.cross_corpus_identity_gap, /name similarity cannot merge/i);
assert.ok(manifest.source_native_real_positive.does_not_establish.includes('wrongdoing'));
assert.equal(manifest.graph_effect, 'none');
console.log('natsec100-award-control.test.js: OK');

// Synthetic negative controls below are not real award observations.
const lead = { reported_amount: 129000000, reported_program: 'Advanced Integrated Motor Manufacturing' };

test('amount and programme matches on different awards cannot verify a summary', () => {
  const result = diagnoseAwardSearch([
    { award_id: 'synthetic-A', award_amount: 129000000, description: 'Unrelated service' },
    { award_id: 'synthetic-B', award_amount: 1, description: lead.reported_program },
  ], lead);
  assert.equal(result.exact_reported_amount_rows, 1);
  assert.equal(result.program_token_match_rows, 1);
  assert.equal(result.same_award_amount_and_program_token_rows, 0);
  assert.equal(result.trade_summary_exactly_verified, false);
});

test('even one exact amount and programme row is not fiscal-year transaction proof', () => {
  const result = diagnoseAwardSearch([{ award_id: 'synthetic-C', award_amount: 129000000, description: lead.reported_program }], lead);
  assert.equal(result.same_award_amount_and_program_token_rows, 1);
  assert.equal(result.trade_summary_exactly_verified, false);
  assert.equal(result.trade_summary_verification_status, 'not_verified_by_award_search');
});

test('a generic programme token stays a diagnostic', () => {
  const result = diagnoseAwardSearch([{ award_id: 'synthetic-D', award_amount: 129000000, description: 'Manufacturing an unrelated article' }], lead);
  assert.equal(result.program_token_match_rows, 1);
  assert.equal(result.trade_summary_exactly_verified, false);
});

test('rounded headline amount does not require exact dollar equality', () => {
  const result = diagnoseAwardSearch([{ award_amount: 129494248, description: lead.reported_program }], lead);
  assert.equal(result.exact_reported_amount_rows, 0);
  assert.equal(result.trade_summary_exactly_verified, false);
  assert.ok(result.verification_limitations.some(line => /precision rule/.test(line)));
});

test('missing, blank, nonnumeric and infinite values do not become exact zero amounts', () => {
  for (const value of [null, undefined, '', ' ', false, Infinity, NaN, 'invalid']) {
    assert.equal(diagnoseAwardSearch([{ award_amount: value }], { ...lead, reported_amount: 0 }).exact_reported_amount_rows, 0);
  }
  assert.equal(diagnoseAwardSearch([{ award_amount: '129000000.00' }], lead).exact_reported_amount_rows, 1);
});

test('empty or duplicated returned populations cannot establish completeness', () => {
  const row = { award_id: 'synthetic-E', award_amount: lead.reported_amount, description: lead.reported_program };
  for (const rows of [[], [row, row]]) {
    assert.equal(diagnoseAwardSearch(rows, lead).trade_summary_exactly_verified, false);
  }
});

test('mis-shaped inputs fail explicitly', () => {
  for (const rows of [null, {}, [null], [[]]]) assert.throws(() => diagnoseAwardSearch(rows, lead), TypeError);
  for (const invalid of [null, { ...lead, reported_amount: Infinity }, { ...lead, reported_amount: '129000000' }, { ...lead, reported_program: '' }]) {
    assert.throws(() => diagnoseAwardSearch([], invalid), TypeError);
  }
});

test('preserved five-lead record is unchanged and does not contain an admitted false positive', () => {
  assert.deepEqual(manifest.queries.map(row => row.company_id), ['sierra_space', 'x_bow_systems', 'jetzero', 'dataminr', 'castelion']);
  assert.ok(manifest.queries.every(row => row.trade_summary_exactly_verified === false));
  assert.equal(manifest.coverage.trade_summaries_exactly_verified, 0);
  assert.equal(manifest.graph_effect, 'none');
});
