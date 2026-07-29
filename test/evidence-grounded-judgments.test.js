#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

for (const [label, script] of [
  ['builder', 'tools/build-evidence-grounded-judgments.mjs'],
  ['lake augmenter', 'tools/augment-evidence-grounded-judgments-with-lake.mjs'],
  ['validator', 'tools/validate-evidence-grounded-judgments.mjs'],
  ['lake validator', 'tools/validate-evidence-grounded-lake-judgments.mjs']
]) {
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`${label} failed`);
  }
}

const policy = JSON.parse(fs.readFileSync('data/project/evidence-grounded-judgment-authority.json', 'utf8'));
const ledger = JSON.parse(fs.readFileSync('build/evidence-grounded-judgments.json', 'utf8'));
const k0 = ledger.decisions.filter(row => row.domain === 'k0_event');
const lake = ledger.decisions.filter(row => row.domain === 'lake_basin');
const supported = k0.filter(row => row.judgment === 'bounded_ceiling_conversion_mechanism_supported');
const partial = k0.filter(row => row.judgment === 'partial_mechanism_supported_but_the_complete_event_is_not' || row.judgment === 'bounded_strategic_bypass_chain_supported_without_completed_feedback_suppression');

assert.equal(policy.constitutional_rule.no_magic_human_veto, true);
assert.equal(policy.constitutional_rule.independent_review_is_evidence_not_permission, true);
assert.equal(ledger.summary.decisions_requiring_human_permission, 0);
assert.ok(supported.length >= 6, 'audited K0 support must produce judgments, not a wait state');
assert.ok(partial.length >= 1, 'supported causal prefixes must remain usable as bounded partial judgments');
assert.equal(lake.length, 6, 'the lake shadow must produce six reversible operational decisions');
assert.equal(ledger.summary.lake_operational_decisions, 6);
assert.ok(ledger.decisions.every(row => row.review_dependency.required_to_decide === false));
assert.ok(ledger.decisions.every(row => row.graph_effect === 'none'));
assert.ok(ledger.decisions.every(row => row.reversibility.mode === 'append_preserving_supersession'));
assert.ok(ledger.decisions.filter(row => row.domain === 'selection_lane').every(row => row.action && !/wait/i.test(row.action)));
assert.ok(lake.every(row => row.judgment_level === 'J4' && row.action && !/wait/i.test(row.action)));

console.log('evidence-grounded judgment test: OK');
console.log(`  decisions: ${ledger.decisions.length}`);
console.log(`  supported K0 mechanisms: ${supported.length}`);
console.log(`  bounded partial K0 mechanisms: ${partial.length}`);
console.log(`  lake operational decisions: ${lake.length}`);
