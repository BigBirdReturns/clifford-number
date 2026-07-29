#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const read = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const failures = [];
const fail = message => failures.push(message);

const policy = read('data/project/human-permission-gate-audit-policy.json');
const audit = read('build/human-permission-gate-audit.json');
const ledger = read('build/evidence-grounded-judgments.json');

if (policy.schema_version !== 'human-permission-gate-audit-policy@1') fail('audit policy schema drift');
if (policy.law?.review_state_alone_may_block_a_bounded_judgment !== false) fail('review may not block bounded judgment');
if (policy.law?.review_state_alone_may_block_reversible_execution !== false) fail('review may not block reversible execution');
if (policy.law?.every_active_domain_with_review_language_requires_a_mapped_decision !== true) fail('domain mapping law missing');
if (audit.schema_version !== 'human-permission-gate-audit@1' || audit.policy_id !== policy.policy_id) fail('audit identity drift');
if (audit.summary?.active_permission_gates !== 0) fail(`active human-permission gates remain: ${audit.summary?.active_permission_gates}`);
if ((audit.active_permission_gates ?? []).length !== 0) fail('active gate array is not empty');
if (audit.summary?.decisions_requiring_human_permission !== 0 || ledger.summary?.decisions_requiring_human_permission !== 0) fail('judgment ledger still requires human permission');
if (audit.boundaries?.review_is_ignored !== false || audit.boundaries?.graph_effect !== 'none') fail('audit boundary drift');

const mapped = new Set(audit.summary?.mapped_decision_domains ?? []);
for (const domain of ['k0_event', 'selection_lane', 'report', 'lake_basin']) if (!mapped.has(domain)) fail(`review-language domain lacks mapped decisions: ${domain}`);
for (const row of audit.matches ?? []) {
  if (row.active_permission_gate === true) fail(`${row.path}:${row.line}: active gate survived`);
  if (row.classification === 'legacy_gate_mapped_to_operational_decision') {
    if (!row.domain || row.mapped_decision_count < 1) fail(`${row.path}:${row.line}: legacy gate is not actually mapped`);
  }
}

const calculatedFingerprint = sha256((audit.scanned_manifest ?? []).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join(''));
if (calculatedFingerprint !== audit.scanned_fingerprint_sha256) fail('scanned manifest fingerprint mismatch');
for (const row of audit.scanned_manifest ?? []) {
  const target = full(row.path);
  if (!fs.existsSync(target)) {
    fail(`scanned source missing: ${row.path}`);
    continue;
  }
  const bytes = fs.readFileSync(target);
  if (bytes.length !== row.bytes || sha256(bytes) !== row.sha256) fail(`scanned source drift: ${row.path}`);
}

for (const [label, expected] of [
  ['supported_for_human_review', 'deprecated_input_label_mapped_to_J2_or_J1_judgment'],
  ['pending_second_party', 'challenge_and_confidence_state_not_permission'],
  ['independent_reviewer_missing', 'may_withhold_cleared_label_but_not_bounded_judgment_or_reversible_execution'],
  ['review_required', 'provisional_or_internal_judgment_allowed_with_receipts_and_uncertainty']
]) if (audit.compatibility?.[label] !== expected) fail(`compatibility rule drift: ${label}`);

const report = fs.readFileSync(full('reports/human-permission-gate-audit.md'), 'utf8');
if (!report.includes('active permission gates: 0')) fail('reader-facing active-gate count missing');
if (!report.includes('decisions requiring human permission: 0')) fail('reader-facing permission count missing');
if (!report.includes('review metadata from silently becoming a veto')) fail('reader-facing no-veto conclusion missing');

if (failures.length) {
  console.error(`human-permission gate audit validation failed with ${failures.length} error(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('human-permission gate audit validation: OK');
console.log(`  review-language matches: ${audit.summary.review_language_matches}`);
console.log(`  legacy gates mapped to decisions: ${audit.summary.legacy_gate_matches_mapped_to_decisions}`);
console.log(`  ambiguous review language: ${audit.summary.ambiguous_review_language}`);
console.log('  active permission gates: 0');
