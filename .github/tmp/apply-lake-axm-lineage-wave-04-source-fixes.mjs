#!/usr/bin/env node
import fs from 'node:fs';

const changedPaths = new Set();

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  changedPaths.add(file);
}

function replaceExact(file, before, after) {
  const source = fs.readFileSync(file, 'utf8');
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) throw new Error(`${file}: expected one Wave 04 source target, found ${occurrences}`);
  fs.writeFileSync(file, source.replace(before, after));
  changedPaths.add(file);
}

const policyPath = 'data/project/lake-axm-lineage-wave-04-policy.json';
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
policy.input_paths = [
  'data/project/lake-identifier-source-registry-wave-02.jsonl',
  'data/project/lake-identifier-source-supersessions-wave-03.jsonl',
  'build/lake-actions/native-source-migration-wave-03-reconciliation.json',
  'build/axm-identity.json',
  'data/ledger/participation.jsonl',
  'data/ledger/surfaces.jsonl',
  'data/canonical/actors.json',
  'data/canonical/organizations.json',
  'data/canonical/aliases.json',
  'cases.json',
  'BUILD-INSTRUCTIONS.md'
];
policy.native_source_paths = [
  'data/ledger/participation.jsonl',
  'data/ledger/surfaces.jsonl',
  'data/canonical/actors.json',
  'data/canonical/organizations.json',
  'data/canonical/aliases.json',
  'cases.json'
];
writeJson(policyPath, policy);

const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = JSON.parse(fs.readFileSync(lakePolicyPath, 'utf8'));
for (const file of [
  '.github/tmp/apply-lake-axm-lineage-wave-04-source-fixes.mjs',
  '.github/tmp/lake-axm-lineage-wave-04-source-paths.json'
]) {
  if (!lakePolicy.excluded_paths.includes(file)) lakePolicy.excluded_paths.push(file);
}
lakePolicy.excluded_paths.sort((a, b) => a.localeCompare(b));
writeJson(lakePolicyPath, lakePolicy);

for (const file of [
  'tools/build-lake-axm-lineage-wave-04.mjs',
  'tools/reconcile-lake-axm-lineage-wave-04.mjs',
  'tools/validate-lake-axm-lineage-wave-04.mjs'
]) {
  replaceExact(
    file,
    'namespace: data.caseConfig.namespace',
    "namespace: readJson('cases.json').default_case_id"
  );
}

fs.writeFileSync('.github/tmp/lake-axm-lineage-wave-04-source-paths.json', `${JSON.stringify({
  schema_version: 'lake-axm-lineage-wave-04-source-paths@1',
  changed_paths: [...changedPaths].sort()
}, null, 2)}\n`);

console.log(`Wave 04 source fixes applied: ${changedPaths.size} checked source paths`);
