#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

const validation = spawnSync(process.execPath, ['tools/validate-lake-native-source-migration-wave-03.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const policy = readJson('data/project/lake-native-source-migration-wave-03-policy.json');
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.migration_receipt_path);
const reconciliation = readJson(policy.reconciliation_path);
const supersessions = readJsonl(policy.supersession_ledger_path);
const claims = readJsonl(`${policy.native_case_directory}/claims.jsonl`);
const events = readJsonl(`${policy.native_case_directory}/events.jsonl`);
const receipts = readJsonl(`${policy.native_case_directory}/receipts.jsonl`);
const compiled = readJson('build/cases/uk-ai-policy.json');
const caseIndex = readJson('build/cases/index.json');
const frontier = readJson('build/report-frontier.json');

assert.equal(claims.length, 224);
assert.equal(events.length, 224);
assert.equal(receipts.length, 15);
assert.equal(supersessions.length, 448);
assert.ok(claims.every(row => !('value' in row) && !('receipts' in row)));
assert.ok(events.every(row => !('claims' in row)));
assert.ok(receipts.every(row => row.evidence_class));
assert.ok(compiled.claims.every(row => 'value' in row && row.receipts.length === row.receipt_ids.length));
assert.equal(compiled.counts.claims, claims.length);
assert.equal(compiled.counts.events, events.length);
assert.equal(compiled.counts.receipts, receipts.length);
assert.equal(caseIndex.cases.find(row => row.case_id === 'uk-ai-policy').counts.claims, 224);

const ukAi = frontier.cases.find(row => row.case_id === 'uk-ai-policy');
assert.equal(ukAi.case_state, 'case_ledger');
assert.equal(ukAi.current_stage, 'case_ledger');
assert.equal(ukAi.next_transition, 'structured_report_specification');
assert.equal(ukAi.blockers.includes('canonical_case_ledger_missing'), false);
assert.equal(ukAi.blockers.includes('187_claims_review_required'), true);

assert.equal(supersessions.every(row => row.prior_native_source_migration_required === true), true);
assert.equal(supersessions.every(row => row.current_native_source_migration_required === false), true);
assert.equal(supersessions.every(row => row.review_dependency.required_to_decide === false), true);
assert.equal(supersessions.every(row => row.reversibility.mode === 'append_preserving_supersession'), true);
assert.equal(supersessions.every(row => row.graph_effect === 'none'), true);
assert.equal(plan.completion.source_semantic_equivalence_proved, true);
assert.equal(receipt.counts.superseded_identifier_registrations, 448);
assert.equal(reconciliation.identifier_supersessions.rows_with_native_source_occurrence, 448);
assert.equal(reconciliation.identifier_supersessions.current_native_source_migration_debt, 164);
assert.equal(reconciliation.completion.native_source_validation_complete, true);
assert.equal(reconciliation.completion.native_case_indexed, true);
assert.equal(reconciliation.completion.report_frontier_case_ledger_transition_complete, true);
assert.equal(reconciliation.completion.evidence_truth_determined, false);
assert.equal(reconciliation.completion.publication_cleared, false);
assert.equal(reconciliation.completion.decisions_requiring_human_permission, 0);

console.log('lake-native-source-migration-wave-03.test: OK (224 claims, 224 events, 448 supersessions, 164 debt remaining)');
