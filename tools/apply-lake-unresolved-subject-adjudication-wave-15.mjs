#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const policyPath = 'data/project/lake-unresolved-subject-adjudication-wave-15-policy.json';
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
assert.equal(policy.schema_version, 'lake-unresolved-subject-adjudication-wave-15-policy@1');

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = JSON.parse(fs.readFileSync(lakePolicyPath, 'utf8'));
for (const file of [
  policyPath,
  policy.registry_path,
  policy.receipt_path,
  policy.projection_path,
  policy.plan_path,
  policy.reconciliation_path
]) {
  if (!lakePolicy.authoritative_roots.includes(file)) lakePolicy.authoritative_roots.push(file);
}
lakePolicy.authoritative_roots.sort((left, right) => left.localeCompare(right));
for (const file of [
  policy.report_path,
  policy.reconciliation_report_path,
  '.github/tmp/lake-unresolved-subject-adjudication-wave-15-trigger.json'
]) {
  if (!lakePolicy.excluded_paths.includes(file)) lakePolicy.excluded_paths.push(file);
}
lakePolicy.excluded_paths.sort((left, right) => left.localeCompare(right));
Object.assign(lakePolicy.boundaries, {
  unresolved_subject_adjudication_proves_claim_truth: false,
  unresolved_subject_adjudication_validates_all_claims: false,
  wave_15_planned_canonical_record_is_materialized: false,
  wave_15_identity_decision_is_cross_case_bridge: false,
  wave_15_nonidentity_object_is_actor_or_organization: false,
  wave_15_source_records_mutated: false,
  wave_15_relationship_created: false,
  wave_15_participation_created: false,
  wave_15_graph_effect: 'none'
});
writeJson(lakePolicyPath, lakePolicy);

function appendSection(file, marker, section) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(marker)) return;
  fs.writeFileSync(file, `${source.trimEnd()}\n\n${section.trim()}\n`);
}

appendSection('BUILD-INSTRUCTIONS.md', '3.15 **Unresolved subject adjudication', `3.15 **Unresolved subject adjudication — Wave 15.**
Every subject left by the exact-ID lane must receive exactly one evidence-grounded
adjudication: an existing provenance-backed identity, a named controlled identity,
a source-custodied canonical-creation plan, or a typed nonidentity object. Missing a
reviewer is not a decision blocker.

Wave 15 does not mutate canonical records or case claims. Identity decisions remain
integration-ready and graph-inert; planned records remain unapplied; contracts,
programs, records, places, infrastructure, products, sites, roles, and analytic
constructs remain typed nonidentity objects. No adjudication creates a relationship,
participation row, graph edge, hop, cross-case bridge, truth determination, or
publication clearance.`);

appendSection('README.md', '## Unresolved subject adjudication', `## Unresolved subject adjudication

Wave 15 converts the complete Wave 14 unresolved denominator into bounded decisions:
provenance-backed identities, named controlled mappings, three canonical-creation
plans, and typed nonidentity subject objects. Nothing remains in a generic
wait-for-review state.

The adjudication is additive metadata. Source claims and canonical registries are not
mutated in this wave, and no decision creates a relationship, participation row,
graph edge, hop, or automatic cross-case join.`);

console.log('Wave 15 lake authority and documentation applied');
console.log('  authoritative Wave 15 roots: 6');
console.log('  graph, relationship, participation, and human-permission effects: 0');
