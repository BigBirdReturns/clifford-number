#!/usr/bin/env node
import fs from 'node:fs';

const policyPath = 'data/project/lake-index-policy.json';
const lakePolicy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const changedPaths = new Set([policyPath]);

for (const file of [
  'data/project/lake-production-cross-case-census-wave-08-policy.json',
  'data/project/lake-production-cross-case-candidate-registry-wave-08.jsonl',
  'data/project/lake-production-cross-case-case-pair-registry-wave-08.jsonl',
  'data/project/lake-production-cross-case-census-wave-08.json',
  'build/axm-production-cross-case-candidate-index-wave-08.json'
]) {
  if (!lakePolicy.authoritative_roots.includes(file)) lakePolicy.authoritative_roots.push(file);
}
lakePolicy.authoritative_roots.sort((left, right) => left.localeCompare(right));

for (const file of [
  'build/lake-actions/production-cross-case-census-wave-08.json',
  'build/lake-actions/production-cross-case-census-wave-08-reconciliation.json',
  'reports/lake-production-cross-case-census-wave-08.md',
  'reports/lake-production-cross-case-census-wave-08-reconciliation.md',
  '.github/tmp/lake-production-cross-case-census-wave-08-trigger.json',
  '.github/tmp/apply-lake-production-cross-case-census-wave-08.mjs',
  '.github/tmp/lake-production-cross-case-census-wave-08-source-paths.json'
]) {
  if (!lakePolicy.excluded_paths.includes(file)) lakePolicy.excluded_paths.push(file);
}
lakePolicy.excluded_paths.sort((left, right) => left.localeCompare(right));

lakePolicy.boundaries.production_cross_case_candidate_proves_identity = false;
lakePolicy.boundaries.exact_local_identifier_recurrence_authorizes_join = false;
lakePolicy.boundaries.production_cross_case_candidate_creates_graph_relation = false;
lakePolicy.boundaries.production_cross_case_candidate_creates_hop = false;
fs.writeFileSync(policyPath, `${JSON.stringify(lakePolicy, null, 2)}\n`);

const sourcePathFile = '.github/tmp/lake-production-cross-case-census-wave-08-source-paths.json';
changedPaths.add(sourcePathFile);
fs.writeFileSync(sourcePathFile, `${JSON.stringify({
  schema_version: 'lake-production-cross-case-census-wave-08-source-paths@1',
  changed_paths: [...changedPaths].sort()
}, null, 2)}\n`);

console.log(`Wave 08 lake authority carrier applied: ${changedPaths.size} paths`);
