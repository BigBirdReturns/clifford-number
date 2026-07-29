#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

for (const script of [
  'tools/build-evidence-grounded-judgments.mjs',
  'tools/augment-evidence-grounded-judgments-with-lake.mjs',
  'tools/build-human-permission-gate-audit.mjs',
  'tools/validate-human-permission-gate-audit.mjs'
]) {
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`${script} failed`);
  }
}

const audit = JSON.parse(fs.readFileSync('build/human-permission-gate-audit.json', 'utf8'));
const ledger = JSON.parse(fs.readFileSync('build/evidence-grounded-judgments.json', 'utf8'));
const mappedDomains = new Set(audit.summary.mapped_decision_domains);

assert.equal(audit.summary.active_permission_gates, 0);
assert.equal(audit.active_permission_gates.length, 0);
assert.equal(audit.summary.decisions_requiring_human_permission, 0);
assert.equal(ledger.summary.decisions_requiring_human_permission, 0);
assert.ok(audit.summary.review_language_matches > 0, 'the audit must examine real review language rather than pass an empty corpus');
assert.ok(audit.summary.legacy_gate_matches_mapped_to_decisions > 0, 'legacy gate language must be mapped, not silently ignored');
for (const domain of ['k0_event', 'selection_lane', 'report', 'lake_basin']) assert.ok(mappedDomains.has(domain), `${domain} is not mapped`);
assert.ok(audit.matches.every(row => row.active_permission_gate === false));

console.log('human-permission gate audit test: OK');
console.log(`  review-language matches: ${audit.summary.review_language_matches}`);
console.log(`  mapped legacy gate matches: ${audit.summary.legacy_gate_matches_mapped_to_decisions}`);
console.log('  active permission gates: 0');
