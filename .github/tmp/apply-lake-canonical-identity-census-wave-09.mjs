#!/usr/bin/env node
import fs from 'node:fs';

const policyPath = 'data/project/lake-index-policy.json';
const lakePolicy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const changedPaths = new Set([policyPath]);

for (const file of [
  'data/project/lake-canonical-identity-census-wave-09-policy.json',
  'data/project/lake-canonical-identity-mention-registry-wave-09.jsonl',
  'data/project/lake-canonical-cross-case-candidate-registry-wave-09.jsonl',
  'data/project/lake-canonical-identity-census-wave-09.json',
  'build/axm-canonical-identity-candidate-index-wave-09.json'
]) {
  if (!lakePolicy.authoritative_roots.includes(file)) lakePolicy.authoritative_roots.push(file);
}
lakePolicy.authoritative_roots.sort((left, right) => left.localeCompare(right));

for (const file of [
  'build/lake-actions/canonical-identity-census-wave-09.json',
  'build/lake-actions/canonical-identity-census-wave-09-reconciliation.json',
  'reports/lake-canonical-identity-census-wave-09.md',
  'reports/lake-canonical-identity-census-wave-09-reconciliation.md',
  '.github/tmp/lake-canonical-identity-census-wave-09-trigger.json',
  '.github/tmp/apply-lake-canonical-identity-census-wave-09.mjs',
  '.github/tmp/lake-canonical-identity-census-wave-09-source-paths.json'
]) {
  if (!lakePolicy.excluded_paths.includes(file)) lakePolicy.excluded_paths.push(file);
}
lakePolicy.excluded_paths.sort((left, right) => left.localeCompare(right));

lakePolicy.boundaries.canonical_registry_match_proves_real_world_identity = false;
lakePolicy.boundaries.controlled_name_normalization_authorizes_join = false;
lakePolicy.boundaries.canonical_candidate_creates_graph_relation = false;
lakePolicy.boundaries.canonical_candidate_creates_hop = false;
fs.writeFileSync(policyPath, `${JSON.stringify(lakePolicy, null, 2)}\n`);

const sourcePathFile = '.github/tmp/lake-canonical-identity-census-wave-09-source-paths.json';
changedPaths.add(sourcePathFile);
fs.writeFileSync(sourcePathFile, `${JSON.stringify({
  schema_version: 'lake-canonical-identity-census-wave-09-source-paths@1',
  changed_paths: [...changedPaths].sort()
}, null, 2)}\n`);

console.log(`Wave 09 lake authority carrier applied: ${changedPaths.size} paths`);
