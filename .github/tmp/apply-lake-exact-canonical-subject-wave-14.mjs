#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const policyPath = 'data/project/lake-exact-canonical-subject-wave-14-policy.json';
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const projection = JSON.parse(fs.readFileSync(policy.projection_path, 'utf8'));
const unresolvedRows = fs.readFileSync(policy.unresolved_registry_path, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const changedPaths = new Set();

assert.equal(policy.schema_version, 'lake-exact-canonical-subject-wave-14-policy@1');
assert.equal(projection.counts.exact_canonical_id_references, policy.expected.exact_canonical_references);
assert.equal(projection.counts.exact_canonical_subjects, policy.expected.exact_canonical_subjects);
assert.equal(projection.counts.unresolved_subject_references, policy.expected.unresolved_subject_references);
assert.equal(unresolvedRows.length, policy.expected.unresolved_distinct_subjects);
assert.equal(projection.finalization.exact_subject_observations_projected, true);
assert.equal(projection.finalization.unresolved_registry_projected, true);

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  changedPaths.add(file);
}

const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = JSON.parse(fs.readFileSync(lakePolicyPath, 'utf8'));
for (const file of [
  policyPath,
  policy.unresolved_registry_path,
  policy.receipt_path,
  policy.projection_path
]) {
  if (!lakePolicy.authoritative_roots.includes(file)) lakePolicy.authoritative_roots.push(file);
}
lakePolicy.authoritative_roots.sort((left, right) => left.localeCompare(right));
for (const file of [
  policy.plan_path,
  policy.reconciliation_path,
  policy.report_path,
  policy.reconciliation_report_path,
  '.github/tmp/lake-exact-canonical-subject-wave-14-trigger.json',
  '.github/tmp/apply-lake-exact-canonical-subject-wave-14.mjs',
  '.github/tmp/lake-exact-canonical-subject-wave-14-source-paths.json'
]) {
  if (!lakePolicy.excluded_paths.includes(file)) lakePolicy.excluded_paths.push(file);
}
lakePolicy.excluded_paths.sort((left, right) => left.localeCompare(right));
Object.assign(lakePolicy.boundaries, {
  exact_canonical_subject_proves_claim_truth: false,
  exact_canonical_subject_validates_all_claims: false,
  exact_canonical_subject_is_cross_case_bridge: false,
  exact_canonical_subject_rewrites_source: false,
  exact_canonical_subject_creates_relationship: false,
  exact_canonical_subject_creates_participation: false,
  exact_canonical_subject_creates_hop: false,
  exact_subject_normalized_name_match_authorized: false,
  exact_subject_alias_match_authorized: false,
  exact_subject_fuzzy_match_authorized: false,
  unresolved_subject_routing_proves_identity: false
});
writeJson(lakePolicyPath, lakePolicy);

function appendSection(file, marker, section) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(marker)) return;
  fs.writeFileSync(file, `${source.trimEnd()}\n\n${section.trim()}\n`);
  changedPaths.add(file);
}

appendSection('BUILD-INSTRUCTIONS.md', '3.14 **Exact canonical subject projection', `3.14 **Exact canonical subject projection — Wave 14.**
An accepted case-scoped resolution has first priority. Without one, a claim subject
may receive generated canonical identity metadata only when its source subject_id is
byte-for-byte equal to an existing canonical actor or organization ID. Normalized
names, aliases, fuzzy similarity, object identity, and context are not substitute
identity evidence.

The source subject_id, claim text, receipts, status, and causal qualification remain
unchanged. Every nonexact remainder is retained in a typed unresolved-subject
registry with a named next action and append-preserving correction route. Exact
projection and unresolved routing create no relationship, participation, graph edge,
hop, automatic cross-case join, truth determination, or publication clearance.`);

appendSection('README.md', '## Exact canonical subject projection', `## Exact canonical subject projection

Wave 14 recognizes case claim subjects that already use an exact canonical actor or
organization ID, while preserving explicit case-scoped resolutions as the higher
precedence decision. The remaining subjects are not guessed: they are retained in a
typed routing registry for identity, place/infrastructure, program/contract,
case/analytic, named-object, or still-unclassified work.

This is generated identity metadata only. Source claim IDs and text are unchanged,
and the projection creates no relationship, participation, graph edge, hop, or
automatic cross-case join.`);

const sourcePathFile = '.github/tmp/lake-exact-canonical-subject-wave-14-source-paths.json';
changedPaths.add(sourcePathFile);
fs.writeFileSync(sourcePathFile, `${JSON.stringify({
  schema_version: 'lake-exact-canonical-subject-wave-14-source-paths@1',
  changed_paths: [...changedPaths].sort()
}, null, 2)}\n`);
console.log(`Wave 14 exact-subject policy, documentation, and lake roots applied: ${changedPaths.size} paths`);
console.log(`  exact references / subjects: ${projection.counts.exact_canonical_id_references} / ${projection.counts.exact_canonical_subjects}`);
console.log(`  unresolved references / subjects: ${projection.counts.unresolved_subject_references} / ${unresolvedRows.length}`);
