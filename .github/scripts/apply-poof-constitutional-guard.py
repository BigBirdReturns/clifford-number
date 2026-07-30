#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path.cwd()


def read_json(path: str):
    return json.loads((ROOT / path).read_text())


def write_json(path: str, value) -> None:
    (ROOT / path).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one anchor, found {count}: {old[:140]!r}")
    target.write_text(text.replace(old, new, 1))


def append_once(path: str, marker: str, text: str) -> None:
    target = ROOT / path
    body = target.read_text()
    if marker not in body:
        target.write_text(body.rstrip() + "\n\n" + text.strip() + "\n")


protected = [
    ".github/workflows/poof-clifford-ecology.yml",
    "data/project/poof-clifford-ecology-contract.json",
    "data/project/poof-clifford-object-registry.json",
    "data/project/poof-clifford-projection-contracts.json",
    "schemas/poof-projection-manifest.schema.json",
    "schemas/poof-referral-packet.schema.json",
    "schemas/poof-comprehension-receipt.schema.json",
    "schemas/poof-publication-audit-receipt.schema.json",
    "schemas/poof-right-of-reply.schema.json",
    "tools/build-poof-clifford-ecology.mjs",
    "tools/validate-poof-clifford-ecology.mjs",
    "tools/validate-poof-constitutional-change.mjs",
    "test/poof-clifford-ecology.test.js",
    "test/poof-constitutional-change.test.js",
]
old_protected = [
    "data/project/poof-clifford-ecology-contract.json",
    "data/project/poof-clifford-object-registry.json",
    "data/project/poof-clifford-projection-contracts.json",
    "schemas/poof-projection-manifest.schema.json",
    "schemas/poof-referral-packet.schema.json",
    "schemas/poof-comprehension-receipt.schema.json",
    "schemas/poof-publication-audit-receipt.schema.json",
    "schemas/poof-right-of-reply.schema.json",
    "tools/validate-poof-clifford-ecology.mjs",
]

contract_path = "data/project/poof-clifford-ecology-contract.json"
contract = read_json(contract_path)
contract["constitutional_amendment_law"]["protected_paths"] = protected
required = contract["constitutional_amendment_law"]["required_fields"]
if "protected_paths_touched" not in required:
    required.insert(0, "protected_paths_touched")
contract["constitutional_amendment_law"]["append_only_base_comparison_required"] = True
contract["constitutional_amendment_law"]["protected_path_coverage_required"] = True
write_json(contract_path, contract)

log_path = "data/project/poof-clifford-constitutional-change-log.json"
log = read_json(log_path)
log["protected_paths"] = protected
log["changes"][0]["protected_paths_touched"] = old_protected
log["changes"].append({
    "change_id": "POOF-CONST-2026-07-29-002",
    "effective_at": "2026-07-29T19:15:00-07:00",
    "protected_paths_touched": protected,
    "affected_invariants": [
        "a prior constitutional receipt cannot be reused for a later protected-path change",
        "previous constitutional receipts are append-only across the merge base",
        "object-specific operational effects remain exact rather than merely dimension-complete",
        "generated machine contracts and selection hashes are validated as authority surfaces",
    ],
    "reason": "The first hardening pass recorded constitutional change but did not mechanically bind each future protected-path diff to a newly appended receipt.",
    "previous_behavior": [
        "validation required at least one constitutional receipt but did not compare it with the merge-base receipt sequence",
        "the object registry was dimension-checked while some object-specific review, publication, and custody values were not hard-coded in the validator",
        "MCP effects were checked while parallel OpenAPI and agent-skill effects were not independently revalidated",
    ],
    "proposed_behavior": [
        "a base-aware guard requires the prior receipt sequence to remain an exact prefix",
        "the union of newly appended receipt path coverage must equal the protected paths changed in the pull request",
        "object, projection, MCP, OpenAPI, and agent-skill effects fail closed against exact expected contracts",
    ],
    "migration": "Add a permanent git-aware constitutional guard, a pure mutation-test surface, complete protected-path coverage, and regenerate the staged release.",
    "backward_compatibility": "The change is additive and predeployment; canonical evidence and previous release interpretation remain unchanged.",
    "adversarial_fixtures_added": [
        "reused old receipt with protected change",
        "rewritten prior receipt",
        "incomplete protected-path coverage",
        "object-specific publication-effect mutation",
        "machine-interface operational-effect mutation",
        "projection candidate-set hash mutation",
    ],
    "emergency_override": False,
    "expires_at": None,
    "authority": "repository_change_receipt_below_canonical_evidence",
    "graph_effect": "none",
})
write_json(log_path, log)

guard = r'''#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const canonicalChangeLogPath = 'data/project/poof-clifford-constitutional-change-log.json';
const stable = (value) => JSON.stringify(value);
const sortedUnique = (values) => [...new Set(values || [])].sort();

export function validateConstitutionalChangePlan({ baseContract, currentContract, baseLog, currentLog, changedPaths }) {
  const failures = [];
  const fail = (message) => failures.push(message);
  const baseProtected = new Set(baseContract?.constitutional_amendment_law?.protected_paths || []);
  const currentProtected = new Set(currentContract?.constitutional_amendment_law?.protected_paths || []);
  const protectedUnion = new Set([...baseProtected, ...currentProtected]);
  const changed = new Set(changedPaths || []);
  const touched = sortedUnique([...changed].filter((item) => protectedUnion.has(item)));
  const declaredProtected = sortedUnique(currentLog?.protected_paths || []);
  if (stable(declaredProtected) !== stable(sortedUnique([...currentProtected]))) fail('change log protected path registry does not match the current constitution');

  const baseChanges = baseLog?.changes || [];
  const currentChanges = currentLog?.changes || [];
  if (currentChanges.length < baseChanges.length) fail('constitutional change history was truncated');
  for (let index = 0; index < baseChanges.length; index += 1) {
    if (stable(currentChanges[index]) !== stable(baseChanges[index])) fail(`constitutional change history rewrote prior receipt ${baseChanges[index]?.change_id || index}`);
  }
  const appended = currentChanges.slice(baseChanges.length);
  const logChanged = changed.has(canonicalChangeLogPath);
  if (touched.length && !logChanged) fail('protected constitutional paths changed without changing the constitutional change log');
  if (logChanged && appended.length === 0) fail('constitutional change log changed without an appended receipt');

  const required = currentContract?.constitutional_amendment_law?.required_fields || [];
  const covered = [];
  for (const record of appended) {
    for (const field of required) if (!(field in record)) fail(`${record.change_id || 'new constitutional receipt'}: missing ${field}`);
    const recordPaths = sortedUnique(record.protected_paths_touched || []);
    if (recordPaths.length !== (record.protected_paths_touched || []).length) fail(`${record.change_id}: protected path coverage contains duplicates`);
    for (const item of recordPaths) {
      if (!protectedUnion.has(item)) fail(`${record.change_id}: path outside constitutional registry: ${item}`);
      covered.push(item);
    }
    if (record.graph_effect !== 'none') fail(`${record.change_id}: constitutional receipt cannot create graph authority`);
    if (record.emergency_override === true) {
      if (currentContract?.constitutional_amendment_law?.emergency_override_rule?.permitted !== true) fail(`${record.change_id}: emergency override not permitted`);
      if (!record.expires_at || Number.isNaN(Date.parse(record.expires_at))) fail(`${record.change_id}: emergency override lacks a valid expiry`);
      if (record.effective_at && Date.parse(record.expires_at) <= Date.parse(record.effective_at)) fail(`${record.change_id}: emergency override expiry is not later than its effective time`);
    }
  }
  if (stable(sortedUnique(covered)) !== stable(touched)) {
    fail(`new receipt coverage does not equal protected path diff; touched=${touched.join(',') || 'none'} covered=${sortedUnique(covered).join(',') || 'none'}`);
  }
  return { ok: failures.length === 0, failures, touched, appended: appended.map((row) => row.change_id) };
}

function git(args, { allowFailure = false } = {}) {
  try { return execFileSync('git', args, { cwd: moduleRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', allowFailure ? 'ignore' : 'pipe'] }).trim(); }
  catch (error) { if (allowFailure) return null; throw error; }
}

function jsonAt(ref, relative) {
  const value = git(['show', `${ref}:${relative}`], { allowFailure: true });
  return value === null ? null : JSON.parse(value);
}

function resolveBase(explicit) {
  const candidates = [explicit, process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null, 'origin/main', 'HEAD^'].filter(Boolean);
  for (const candidate of candidates) if (git(['rev-parse', '--verify', candidate], { allowFailure: true })) return candidate;
  throw new Error('Unable to resolve a constitutional comparison base');
}

export function validateRepositoryConstitutionalChange({ root = moduleRoot, baseRef } = {}) {
  const resolvedBase = resolveBase(baseRef);
  const currentContract = JSON.parse(fs.readFileSync(path.join(root, 'data/project/poof-clifford-ecology-contract.json'), 'utf8'));
  const currentLog = JSON.parse(fs.readFileSync(path.join(root, canonicalChangeLogPath), 'utf8'));
  const baseContract = jsonAt(resolvedBase, 'data/project/poof-clifford-ecology-contract.json');
  const baseLog = jsonAt(resolvedBase, canonicalChangeLogPath);
  const committed = git(['diff', '--name-only', `${resolvedBase}...HEAD`]).split('\n').filter(Boolean);
  const working = git(['diff', '--name-only']).split('\n').filter(Boolean);
  const staged = git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
  const untracked = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);
  const changedPaths = sortedUnique([...committed, ...working, ...staged, ...untracked]);
  return { baseRef: resolvedBase, ...validateConstitutionalChangePlan({ baseContract, currentContract, baseLog, currentLog, changedPaths }) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateRepositoryConstitutionalChange({ baseRef: process.argv[2] });
  if (!result.ok) {
    console.error(`POOF constitutional change validation failed against ${result.baseRef}:\n${result.failures.map((row) => `- ${row}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`validate-poof-constitutional-change: OK (${result.appended.length} appended receipt(s), ${result.touched.length} protected path(s))`);
}
'''
(ROOT / "tools/validate-poof-constitutional-change.mjs").write_text(guard)

guard_test = r'''#!/usr/bin/env node
import assert from 'node:assert/strict';
import { validateConstitutionalChangePlan, canonicalChangeLogPath } from '../tools/validate-poof-constitutional-change.mjs';

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

console.log('poof-constitutional-change.test: OK');
'''
(ROOT / "test/poof-constitutional-change.test.js").write_text(guard_test)

replace_once("tools/build-poof-clifford-ecology.mjs", "  'tools/validate-poof-clifford-ecology.mjs',\n", "  'tools/validate-poof-clifford-ecology.mjs',\n  'tools/validate-poof-constitutional-change.mjs',\n")
replace_once("tools/build-poof-clifford-ecology.mjs", "  'test/poof-clifford-ecology.test.js',\n", "  'test/poof-clifford-ecology.test.js',\n  'test/poof-constitutional-change.test.js',\n")

validator_path = "tools/validate-poof-clifford-ecology.mjs"
replace_once(validator_path, "import fs from 'node:fs';\n", "import crypto from 'node:crypto';\nimport fs from 'node:fs';\n")
replace_once(validator_path, "const effectDimensions = ['evidence','graph','review_queue','publication','visibility','ranking','custody'];\n", "const effectDimensions = ['evidence','graph','review_queue','publication','visibility','ranking','custody'];\nconst expectedObjectEffects = {\n  'POOF-O1': { evidence:'none', graph:'none', review_queue:'none', publication:'binds_projection_custody', visibility:'none', ranking:'none', custody:'release_attached' },\n  'POOF-O2': { evidence:'none', graph:'none', review_queue:'opens_intake_review', publication:'separate_decision_required', visibility:'none', ranking:'none', custody:'intake_append_only' },\n  'POOF-O3': { evidence:'none', graph:'none', review_queue:'advisory_candidate', publication:'advisory_only', visibility:'none', ranking:'none', custody:'reader_local_or_voluntary_export' },\n  'POOF-O4': { evidence:'none', graph:'none', review_queue:'opens_publication_repair_review', publication:'separate_decision_required', visibility:'none', ranking:'none', custody:'audit_append_only' },\n  'POOF-O5': { evidence:'none', graph:'none', review_queue:'opens_correction_review', publication:'separate_decision_required', visibility:'none', ranking:'none', custody:'versioned_append_only' }\n};\n")
replace_once(validator_path, "  if (changeLog.schema_version !== 'poof-clifford-constitutional-change-log@1' || changeLog.changes.length < 1) fail('constitutional change log missing');\n  for (const change of changeLog.changes) {\n    for (const key of contract.constitutional_amendment_law.required_fields) if (!(key in change)) fail(`${change.change_id || 'constitutional change'}: missing ${key}`);\n    if (change.emergency_override !== false || change.graph_effect !== 'none') fail(`${change.change_id}: unconstitutional override or graph effect`);\n  }\n", "  if (changeLog.schema_version !== 'poof-clifford-constitutional-change-log@1' || changeLog.changes.length < 1) fail('constitutional change log missing');\n  if (JSON.stringify([...changeLog.protected_paths].sort()) !== JSON.stringify([...contract.constitutional_amendment_law.protected_paths].sort())) fail('constitutional protected path registry drift');\n  for (const change of changeLog.changes) {\n    for (const key of contract.constitutional_amendment_law.required_fields) if (!(key in change)) fail(`${change.change_id || 'constitutional change'}: missing ${key}`);\n    if (change.graph_effect !== 'none') fail(`${change.change_id}: unconstitutional graph effect`);\n    if (new Set(change.protected_paths_touched || []).size !== (change.protected_paths_touched || []).length) fail(`${change.change_id}: duplicate protected path coverage`);\n    for (const touched of change.protected_paths_touched || []) if (!contract.constitutional_amendment_law.protected_paths.includes(touched)) fail(`${change.change_id}: path outside constitutional registry`);\n    if (change.emergency_override === true && (!change.expires_at || Number.isNaN(Date.parse(change.expires_at)) || Date.parse(change.expires_at) <= Date.parse(change.effective_at))) fail(`${change.change_id}: unconstitutional emergency override expiry`);\n  }\n")
replace_once(validator_path, "    for (const error of effectFailures(row.effect_contract, row.effect_contract, row.object_id)) fail(error);\n", "    const expectedEffect = expectedObjectEffects[row.object_id];\n    if (!expectedEffect) fail(`${row.object_id}: missing exact effect constitution`);\n    else for (const error of effectFailures(row.effect_contract, expectedEffect, row.object_id)) fail(error);\n")
replace_once(validator_path, "    else for (const error of effectFailures(fixture.effect_contract, registryObject.effect_contract, fixturePath)) fail(error);\n", "    else for (const error of effectFailures(fixture.effect_contract, expectedObjectEffects[registryObject.object_id], fixturePath)) fail(error);\n")
replace_once(validator_path, "  if (!projection.selection_contract || projection.selection_contract.candidate_set_hash_mode !== 'sha256_stable_source_object_ids' || projection.selection_contract.candidate_count < projection.selection_contract.included_count || !projection.selection_contract.compression_disclosure) fail('projection selection or compression contract drift');\n", "  const includedObjectIds = Object.values(projection.source_objects || {}).flat().sort();\n  const includedHash = crypto.createHash('sha256').update(includedObjectIds.join('\\n')).digest('hex');\n  if (!projection.selection_contract || projection.selection_contract.candidate_set_hash_mode !== 'sha256_stable_source_object_ids' || !Number.isInteger(projection.selection_contract.candidate_count) || projection.selection_contract.candidate_count < 0 || projection.selection_contract.candidate_count < projection.selection_contract.included_count || projection.selection_contract.included_count !== includedObjectIds.length || !projection.selection_contract.compression_disclosure) fail('projection selection or compression contract drift');\n  if (projection.selection_contract.candidate_count === projection.selection_contract.included_count && projection.selection_contract.candidate_set_hash !== includedHash) fail('projection candidate set hash drift');\n")
replace_once(validator_path, "  const openapi = readJson(root, `${outputRoot}/openapi.json`);\n  if (openapi['x-implementation-status'] !== 'contract_only_not_deployed' || openapi['x-canonical-write'] !== false) fail('OpenAPI deployment or authority laundering');\n", "  const openapi = overrides.openapi ?? readJson(root, `${outputRoot}/openapi.json`);\n  if (openapi['x-implementation-status'] !== 'contract_only_not_deployed' || openapi['x-canonical-write'] !== false) fail('OpenAPI deployment or authority laundering');\n  for (const error of effectFailures(openapi['x-effect-contract'], noEffect, 'OpenAPI effect contract')) fail(error);\n  const skills = overrides.skills ?? readJson(root, `${outputRoot}/agent-skills.json`);\n  for (const error of effectFailures(skills.effect_contract, noEffect, 'agent skills effect contract')) fail(error);\n")

test_path = "test/poof-clifford-ecology.test.js"
replace_once(test_path, "assert.ok(result.failures.some((row) => row.includes('POOF-O2')));\n\nconst projection", "assert.ok(result.failures.some((row) => row.includes('POOF-O2')));\nmutation = structuredClone(objects);\nmutation.objects.find((row) => row.object_id === 'POOF-O2').effect_contract.publication = 'automatic_publication_hold';\nresult = validatePoofCliffordEcology({ root, overrides: { objects: mutation } });\nassert.equal(result.ok, false);\nassert.ok(result.failures.some((row) => row.includes('POOF-O2.publication')));\n\nconst projection")
replace_once(test_path, "assert.ok(result.failures.some((row) => row.includes('selection')));\n\nconst changeLog", "assert.ok(result.failures.some((row) => row.includes('selection')));\nmutation = structuredClone(projection);\nmutation.selection_contract.candidate_set_hash = '0'.repeat(64);\nresult = validatePoofCliffordEcology({ root, overrides: { projection: mutation } });\nassert.equal(result.ok, false);\nassert.ok(result.failures.some((row) => row.includes('candidate set hash')));\n\nconst openapi = read('reports/core-thesis/poof-clifford-ecology/openapi.json');\nmutation = structuredClone(openapi);\nmutation['x-effect-contract'].ranking = 'machine_priority';\nresult = validatePoofCliffordEcology({ root, overrides: { openapi: mutation } });\nassert.equal(result.ok, false);\nassert.ok(result.failures.some((row) => row.includes('OpenAPI effect contract')));\n\nconst changeLog")
replace_once(test_path, "assert.ok(result.failures.some((row) => row.includes('override')));\n\nconst bindings", "assert.ok(result.failures.some((row) => row.includes('override')));\nmutation = structuredClone(changeLog);\nmutation.protected_paths.pop();\nresult = validatePoofCliffordEcology({ root, overrides: { changeLog: mutation } });\nassert.equal(result.ok, false);\nassert.ok(result.failures.some((row) => row.includes('protected path registry')));\n\nconst bindings")

package_path = "package.json"
package = read_json(package_path)
scripts = package["scripts"]
scripts["validate:poof-constitution"] = "node tools/validate-poof-constitutional-change.mjs"
scripts["ci:poof-constitution"] = "npm run validate:poof-constitution && node test/poof-constitutional-change.test.js"
if "node test/poof-constitutional-change.test.js" not in scripts["test"]:
    scripts["test"] = scripts["test"].replace(" && node test/poof-clifford-ecology.test.js", " && node test/poof-constitutional-change.test.js && node test/poof-clifford-ecology.test.js")
if "npm run validate:poof-constitution" not in scripts["check"]:
    scripts["check"] = scripts["check"].replace(" && npm run build:poof-ecology", " && npm run validate:poof-constitution && npm run build:poof-ecology")
write_json(package_path, package)

workflow_path = ".github/workflows/poof-clifford-ecology.yml"
replace_once(workflow_path, "      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n", "      - uses: actions/checkout@v4\n        with:\n          fetch-depth: 0\n      - uses: actions/setup-node@v4\n")
replace_once(workflow_path, "      - name: Build and validate the ecology\n", "      - name: Validate constitutional change custody\n        run: |\n          node tools/validate-poof-constitutional-change.mjs\n          node test/poof-constitutional-change.test.js\n      - name: Build and validate the ecology\n")

append_once("docs/methods/poof-operational-effect-and-amendment-law.md", "## Append-only merge-base guard", """## Append-only merge-base guard

The repository compares every pull request with its merge base. Prior constitutional receipts must remain an exact prefix. Any protected contract, schema, generator, validator, workflow, or adversarial test that changes must be covered exactly by one or more newly appended receipts. Reusing an old receipt, narrowing the protected-path registry, rewriting receipt history, or omitting a changed protected path fails the gate.
""")
append_once("docs/poof-clifford-ecology.md", "### Merge-base constitutional custody", """### Merge-base constitutional custody

A permanent validator now compares the pull request with its merge base. Constitutional receipt history is append-only, and the newly appended receipts must exactly cover the protected files changed by the proposal. This closes the reusable-receipt bypass.
""")

print("apply-poof-constitutional-guard: source changes applied")
