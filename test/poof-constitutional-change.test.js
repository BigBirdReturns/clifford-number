#!/usr/bin/env node
import assert from 'node:assert/strict';
import { validateConstitutionalChangePlan, canonicalChangeLogPath, remoteBranchForCandidate, resolveComparisonBase, resolveCommittedPathDiff } from '../tools/validate-poof-constitutional-change.mjs';

const requiredFields = ['protected_paths_touched','affected_invariants','reason','previous_behavior','proposed_behavior','migration','backward_compatibility','adversarial_fixtures_added','emergency_override'];
const contract = {
  constitutional_amendment_law: {
    protected_paths: ['constitution.json','validator.mjs'],
    required_fields: requiredFields,
    emergency_override_rule: { permitted: true }
  }
};
const oldReceipt = {
  change_id: 'OLD', protected_paths_touched: ['constitution.json'], affected_invariants: ['old'], reason: 'old', previous_behavior: ['old'], proposed_behavior: ['old'], migration: 'old', backward_compatibility: 'old', adversarial_fixtures_added: ['old'], emergency_override: false, expires_at: null, graph_effect: 'none'
};
const newReceipt = {
  change_id: 'NEW', protected_paths_touched: ['validator.mjs'], affected_invariants: ['new'], reason: 'new', previous_behavior: ['old'], proposed_behavior: ['new'], migration: 'additive', backward_compatibility: 'preserved', adversarial_fixtures_added: ['coverage'], emergency_override: false, expires_at: null, graph_effect: 'none'
};
const baseLog = { protected_paths: ['constitution.json','validator.mjs'], changes: [oldReceipt] };
const currentLog = { protected_paths: ['constitution.json','validator.mjs'], changes: [oldReceipt, newReceipt] };
let result = validateConstitutionalChangePlan({ baseContract: contract, currentContract: contract, baseLog, currentLog, changedPaths: ['validator.mjs', canonicalChangeLogPath] });
assert.equal(result.ok, true, result.failures.join('\n'));

let mutation = structuredClone(currentLog);
mutation.changes[0].reason = 'rewritten';
result = validateConstitutionalChangePlan({ baseContract: contract, currentContract: contract, baseLog, currentLog: mutation, changedPaths: ['validator.mjs', canonicalChangeLogPath] });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('rewrote prior receipt')));

mutation = structuredClone(currentLog);
mutation.changes[1].protected_paths_touched = [];
result = validateConstitutionalChangePlan({ baseContract: contract, currentContract: contract, baseLog, currentLog: mutation, changedPaths: ['validator.mjs', canonicalChangeLogPath] });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('coverage')));

result = validateConstitutionalChangePlan({ baseContract: contract, currentContract: contract, baseLog, currentLog, changedPaths: ['validator.mjs'] });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('without changing')));

mutation = structuredClone(currentLog);
mutation.changes[1].emergency_override = true;
mutation.changes[1].effective_at = '2026-07-29T19:00:00-07:00';
mutation.changes[1].expires_at = null;
result = validateConstitutionalChangePlan({ baseContract: contract, currentContract: contract, baseLog, currentLog: mutation, changedPaths: ['validator.mjs', canonicalChangeLogPath] });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('expiry')));

assert.equal(remoteBranchForCandidate('origin/main'), 'main');
assert.equal(remoteBranchForCandidate('origin/feature/constitutional-guard'), 'feature/constitutional-guard');
assert.equal(remoteBranchForCandidate('HEAD^'), null);
assert.equal(remoteBranchForCandidate('origin/../escape'), null);

const availableRefs = new Set();
const fetchedBranches = [];
const resolvedBase = resolveComparisonBase({
  candidates: ['origin/main', 'HEAD^'],
  verify: (candidate) => availableRefs.has(candidate),
  fetchRemoteBranch: (branch) => {
    fetchedBranches.push(branch);
    if (branch === 'main') availableRefs.add('origin/main');
  }
});
assert.equal(resolvedBase, 'origin/main');
assert.deepEqual(fetchedBranches, ['main']);

const comparisonAttempts = [];
const shallowComparison = resolveCommittedPathDiff({
  mergeBaseDiff: () => { comparisonAttempts.push('merge_base'); return null; },
  treeDiff: () => { comparisonAttempts.push('tree_delta'); return 'validator.mjs\n'; }
});
assert.deepEqual(shallowComparison, { mode: 'tree_delta', output: 'validator.mjs\n' });
assert.deepEqual(comparisonAttempts, ['merge_base', 'tree_delta']);

const fullComparison = resolveCommittedPathDiff({
  mergeBaseDiff: () => 'constitution.json\n',
  treeDiff: () => { throw new Error('tree fallback must not run'); }
});
assert.deepEqual(fullComparison, { mode: 'merge_base', output: 'constitution.json\n' });

console.log('poof-constitutional-change.test: OK');
