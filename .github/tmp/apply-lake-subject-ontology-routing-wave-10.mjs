#!/usr/bin/env node
import fs from 'node:fs';

const policyPath = 'data/project/lake-index-policy.json';
const lakePolicy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const changedPaths = new Set([policyPath]);

for (const file of [
  'data/project/lake-subject-ontology-routing-wave-10-policy.json',
  'data/project/lake-subject-ontology-routing-registry-wave-10.jsonl',
  'data/project/lake-canonical-acquisition-registry-wave-10.jsonl',
  'data/project/lake-noncanonical-subject-routing-registry-wave-10.jsonl',
  'data/project/lake-subject-ontology-routing-wave-10.json',
  'build/subject-ontology-routing-index-wave-10.json'
]) {
  if (!lakePolicy.authoritative_roots.includes(file)) lakePolicy.authoritative_roots.push(file);
}
lakePolicy.authoritative_roots.sort((left, right) => left.localeCompare(right));

for (const file of [
  'build/lake-actions/subject-ontology-routing-wave-10.json',
  'build/lake-actions/subject-ontology-routing-wave-10-reconciliation.json',
  'reports/lake-subject-ontology-routing-wave-10.md',
  'reports/lake-subject-ontology-routing-wave-10-reconciliation.md',
  '.github/tmp/lake-subject-ontology-routing-wave-10-trigger.json',
  '.github/tmp/apply-lake-subject-ontology-routing-wave-10.mjs',
  '.github/tmp/lake-subject-ontology-routing-wave-10-source-paths.json'
]) {
  if (!lakePolicy.excluded_paths.includes(file)) lakePolicy.excluded_paths.push(file);
}
lakePolicy.excluded_paths.sort((left, right) => left.localeCompare(right));

lakePolicy.boundaries.subject_semantic_type_proves_real_world_identity = false;
lakePolicy.boundaries.actor_or_organization_candidate_is_canonical = false;
lakePolicy.boundaries.subject_routing_creates_relationship = false;
lakePolicy.boundaries.subject_routing_creates_hop = false;
lakePolicy.boundaries.subject_routing_mutates_canonical = false;
fs.writeFileSync(policyPath, `${JSON.stringify(lakePolicy, null, 2)}\n`);

const sourcePathFile = '.github/tmp/lake-subject-ontology-routing-wave-10-source-paths.json';
changedPaths.add(sourcePathFile);
fs.writeFileSync(sourcePathFile, `${JSON.stringify({
  schema_version: 'lake-subject-ontology-routing-wave-10-source-paths@1',
  changed_paths: [...changedPaths].sort()
}, null, 2)}\n`);

console.log(`Wave 10 lake authority carrier applied: ${changedPaths.size} paths`);
