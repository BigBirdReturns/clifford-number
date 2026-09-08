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

// CE0364-XBOW-SOURCE-CONFLICT-V2
const ce0364Events = fs.readFileSync(
  'data/intake/natsec100-pathways/chunk1/conversion_events.jsonl',
  'utf8',
).trim().split('\n').map((line) => JSON.parse(line));
const ce0364Receipts = fs.readFileSync(
  'data/intake/natsec100-pathways/chunk1/receipts.jsonl',
  'utf8',
).trim().split('\n').map((line) => JSON.parse(line));
const ce0364Adjudication = JSON.parse(
  fs.readFileSync('data/research/natsec100-x-bow-award-adjudication.json', 'utf8'),
);

test('CE0364 preserves source-specific award fields and refuses a fabricated modification', () => {
  const event = ce0364Events.find((row) => row.event_id === 'CE0364');
  assert.ok(event);
  assert.equal(event.company_id, 'x_bow_systems');
  assert.equal(event.confidence, 'medium');
  assert.deepEqual(event.receipt_ids, ['R010', 'R017', 'R018', 'R019']);
  assert.ok(!event.notes.includes('FY25 Air Force obligation: $129M'));

  assert.equal(ce0364Adjudication.contract.piid, 'FA9300-25-C-6015');
  assert.equal(ce0364Adjudication.identity_bridge.federal_recipient_uei, 'MD76AJXHCMQ5');
  assert.equal(ce0364Adjudication.announcement_record.announced_contract_value, 191303197);
  assert.equal(ce0364Adjudication.announcement_record.obligated_at_award, 121494248);
  assert.equal(ce0364Adjudication.usa_spending_record.base_and_all_options, 199303198);
  assert.equal(ce0364Adjudication.usa_spending_record.total_obligation, 129494248);
  assert.equal(ce0364Adjudication.reconciliation.potential_value_delta, 8000001);
  assert.equal(ce0364Adjudication.reconciliation.obligation_delta, 8000000);
  assert.equal(ce0364Adjudication.reconciliation.deltas_are_equal, false);
  assert.equal(ce0364Adjudication.reconciliation.cause, 'unresolved');
  assert.equal(ce0364Adjudication.transaction_population.count, 1);
  assert.equal(ce0364Adjudication.transaction_population.actions[0].modification_number, '0');
  assert.equal(ce0364Adjudication.transaction_population.actions[0].action_date, '2025-09-25');
  assert.equal(ce0364Adjudication.transaction_population.actions[0].federal_action_obligation, 129494248);
  assert.equal(ce0364Adjudication.transaction_population.later_action_observed, false);
  assert.equal(ce0364Adjudication.transaction_population.later_modification_observed, false);
  assert.equal(ce0364Adjudication.disposition.canonical_amount_collapse_permitted, false);
  assert.equal(ce0364Adjudication.disposition.graph_effect, 'none');

  for (const receiptId of ['R017', 'R018', 'R019']) {
    const receipt = ce0364Receipts.find((row) => row.receipt_id === receiptId);
    assert.ok(receipt, `missing receipt ${receiptId}`);
    assert.equal(receipt.archive.method, 'in_repo_content_hash');
    assert.match(receipt.archive.ref, /^sha256:[0-9a-f]{64}$/);
    assert.ok(receipt.path.startsWith('receipts/natsec100/ce0364-xbow-20260908/'));
  }
});

const ce0364Materialization = JSON.parse(
  fs.readFileSync(
    'receipts/natsec100/ce0364-xbow-20260908/materialization-record.json',
    'utf8',
  ),
);
const ce0364IntakeReadme = fs.readFileSync(
  'data/intake/natsec100-pathways/README.md',
  'utf8',
);

test('CE0364 materialization and receipt documentation match their live denominators', () => {
  assert.equal(ce0364Materialization.intended_path_count, 17);
  assert.equal(
    ce0364Materialization.intended_paths.length,
    ce0364Materialization.intended_path_count,
  );
  assert.equal(
    new Set(ce0364Materialization.intended_paths).size,
    ce0364Materialization.intended_path_count,
  );
  assert.ok(
    ce0364Materialization.intended_paths.includes(
      'receipts/natsec100/ce0364-xbow-20260908/materialization-record.json',
    ),
  );

  assert.equal(ce0364Receipts.length, 19);
  const documentedReceiptCount = ce0364IntakeReadme.match(
    /\| `receipts\.jsonl` \| (\d+) \|/,
  );
  assert.ok(documentedReceiptCount);
  assert.equal(Number(documentedReceiptCount[1]), ce0364Receipts.length);
});
