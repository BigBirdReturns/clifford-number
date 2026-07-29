#!/usr/bin/env node
import fs from 'node:fs';

const policyPath = 'data/project/lake-index-policy.json';
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

for (const file of [
  'data/project/axm-genesis-v1-identity-vectors.json',
  'data/project/axm-genesis-v1-runtime-attestation.json',
  'data/project/lake-axm-reproducibility-wave-05.json'
]) {
  if (!policy.authoritative_roots.includes(file)) policy.authoritative_roots.push(file);
}
policy.authoritative_roots.sort((a, b) => a.localeCompare(b));

for (const file of [
  'build/axm-identity-genesis-v1-migration.json',
  'build/lake-actions/axm-reproducibility-wave-05.json',
  'build/lake-actions/axm-reproducibility-wave-05-reconciliation.json',
  'reports/lake-axm-reproducibility-wave-05.md',
  'reports/lake-axm-reproducibility-wave-05-reconciliation.md',
  '.github/tmp/lake-axm-reproducibility-wave-05-trigger.json',
  '.github/tmp/apply-lake-axm-reproducibility-wave-05-policy.mjs',
  '.github/tmp/lake-axm-reproducibility-wave-05-source-paths.json'
]) {
  if (!policy.excluded_paths.includes(file)) policy.excluded_paths.push(file);
}
policy.excluded_paths.sort((a, b) => a.localeCompare(b));
policy.boundaries.axm_genesis_reference_parity_migrates_active_projection = false;
policy.boundaries.axm_migration_map_authorizes_cross_case_join = false;
fs.writeFileSync(policyPath, `${JSON.stringify(policy, null, 2)}\n`);

fs.writeFileSync('.github/tmp/lake-axm-reproducibility-wave-05-source-paths.json', `${JSON.stringify({
  schema_version: 'lake-axm-reproducibility-wave-05-source-paths@1',
  changed_paths: [policyPath]
}, null, 2)}\n`);

console.log('Wave 05 lake policy carrier applied');
