#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readJson, writeJson } from './lib/ledger.mjs';

const policyPath = 'data/project/lake-subject-integration-wave-16-policy.json';
const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-subject-integration-wave-16-policy@1');

const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = readJson(lakePolicyPath);
for (const file of [
  policyPath,
  policy.paths.local_resolution_registry,
  policy.paths.subject_object_registry,
  policy.paths.identity_extension_registry,
  policy.paths.receipt,
  policy.paths.projection,
  policy.paths.plan,
  policy.paths.reconciliation
]) {
  if (!lakePolicy.authoritative_roots.includes(file)) lakePolicy.authoritative_roots.push(file);
}
lakePolicy.authoritative_roots.sort((left, right) => left.localeCompare(right));
for (const file of [
  policy.paths.source_mutation_plan,
  policy.paths.report,
  policy.paths.reconciliation_report,
  '.github/tmp/lake-subject-integration-wave-16-trigger.json'
]) {
  if (!lakePolicy.excluded_paths.includes(file)) lakePolicy.excluded_paths.push(file);
}
lakePolicy.excluded_paths.sort((left, right) => left.localeCompare(right));
Object.assign(lakePolicy.boundaries, {
  wave_16_integration_proves_claim_truth: false,
  wave_16_subject_object_is_actor_or_organization: false,
  wave_16_subject_object_creates_relationship: false,
  wave_16_subject_object_creates_participation: false,
  wave_16_identity_resolution_is_cross_case_bridge: false,
  wave_16_source_claims_mutated: false,
  wave_16_graph_effect: 'none'
});
writeJson(lakePolicyPath, lakePolicy);

function appendSection(file, marker, section) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(marker)) return;
  fs.writeFileSync(file, `${source.trimEnd()}\n\n${section.trim()}\n`);
}

appendSection('BUILD-INSTRUCTIONS.md', '3.16 **Integrated subject layer', `3.16 **Integrated subject layer — Wave 16.**
Accepted Wave 15 identity decisions enter the live generated case layer only through
case-scoped local-to-canonical resolutions. Accepted nonidentity decisions enter a
parallel typed subject-object registry. One case-local subject cannot simultaneously
be a canonical identity and a nonidentity object.

Canonical identity and subject-object metadata are additive projections. Original
subject IDs and claim text remain unchanged. Contracts, records, programs, places,
infrastructure, products, sites, roles, and analytic constructs are not forced into
actor or organization joins. Integration creates no relationship, participation row,
graph edge, hop, cross-case bridge, truth determination, or publication clearance.
Sealed Wave 14 and Wave 15 products remain historical and are not regenerated.`);

appendSection('README.md', '## Integrated subject layer', `## Integrated subject layer

Wave 16 makes the completed Wave 15 decisions usable in generated cases and the public
catalog. Seventeen identity decisions travel through the existing graph-inert local
resolution lane; forty nonidentity decisions travel through a separate typed
subject-object lane. The result distinguishes unresolved identity from a resolved
contract, program, record, place, infrastructure item, product, site, role, or
analytic construct.

This projection preserves source claim bytes and creates no relationship,
participation, graph edge, hop, or automatic cross-case join.`);

console.log('Wave 16 lake authority and documentation applied');
console.log('  authoritative source and projection roots installed');
console.log('  source claim, relationship, participation, graph, hop, and human-permission effects: 0');
