#!/usr/bin/env node
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, content) => fs.writeFileSync(file, content);
const readJson = file => JSON.parse(read(file));
const writeJson = (file, value) => write(file, `${JSON.stringify(value, null, 2)}\n`);
function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one marker, saw ${count}`);
  return source.replace(before, after);
}

const methodDoc = 'docs/methods/lake-allocator-war-wave-21.md';
const milestoneDoc = 'docs/milestones/lake-allocator-war-wave-21.md';

const policyPath = 'data/project/lake-allocator-war-wave-21-policy.json';
const policy = readJson(policyPath);
const sourceBasin = policy.basin_contract.find(row => row.basin_id === 'allocator-war-source');
if (!sourceBasin) throw new Error('allocator-war-source basin contract missing');
for (const relative of [methodDoc, milestoneDoc]) {
  if (!sourceBasin.path_prefixes.includes(relative)) sourceBasin.path_prefixes.push(relative);
  if (!sourceBasin.authoritative_entrypoints.includes(relative)) sourceBasin.authoritative_entrypoints.push(relative);
}
sourceBasin.path_prefixes.sort();
sourceBasin.authoritative_entrypoints.sort();
policy.boundaries.wave_21_method_and_milestone_are_source_owned = true;
writeJson(policyPath, policy);

const reconcilerPath = 'tools/reconcile-lake-allocator-war-wave-21.mjs';
let reconciler = read(reconcilerPath);
reconciler = replaceRequired(
  reconciler,
  "  const source = (object.occurrences ?? []).some(occurrence =>\n    occurrence.generated !== true && occurrence.path === row.sourcePath\n  );",
  "  const source = (object.occurrences ?? []).some(occurrence =>\n    occurrence.path === row.sourcePath\n  );",
  'source occurrence contract'
);
reconciler = replaceRequired(
  reconciler,
  "  const generated = (object.occurrences ?? []).some(occurrence =>\n    projectionOccurrence(occurrence) && occurrence.path === policy.paths.projection\n  );",
  "  const generated = (object.occurrences ?? []).some(occurrence =>\n    occurrence.path === policy.paths.projection\n  );",
  'projection occurrence contract'
);
write(reconcilerPath, reconciler);

const installPath = 'tools/install-lake-allocator-war-wave-21.mjs';
let installer = read(installPath);
installer = replaceRequired(
  installer,
  "  policy.paths.reconciliation,\n  policy.paths.report\n]) roots.add(relative);",
  "  policy.paths.reconciliation,\n  policy.paths.report,\n  'docs/methods/lake-allocator-war-wave-21.md',\n  'docs/milestones/lake-allocator-war-wave-21.md'\n]) roots.add(relative);",
  'authoritative documentation roots'
);
write(installPath, installer);

const validatorPath = 'tools/validate-lake-allocator-war-wave-21.mjs';
let validator = read(validatorPath);
validator = replaceRequired(
  validator,
  "    policy.paths.reconciliation,\n    policy.paths.report\n  ]) if (!lakePolicy.authoritative_roots.includes(relative))",
  "    policy.paths.reconciliation,\n    policy.paths.report,\n    'docs/methods/lake-allocator-war-wave-21.md',\n    'docs/milestones/lake-allocator-war-wave-21.md'\n  ]) if (!lakePolicy.authoritative_roots.includes(relative))",
  'validator authoritative documentation roots'
);
validator = replaceRequired(
  validator,
  "        policy.paths.program_registry,\n        policy.paths.receipt\n      ]) if (byPath.get(relative)?.basin_id !== 'allocator-war-source')",
  "        policy.paths.program_registry,\n        policy.paths.receipt,\n        'docs/methods/lake-allocator-war-wave-21.md',\n        'docs/milestones/lake-allocator-war-wave-21.md'\n      ]) if (byPath.get(relative)?.basin_id !== 'allocator-war-source')",
  'validator source-basin documentation paths'
);
write(validatorPath, validator);

console.log('allocator-war Wave 21 final reconciliation seams repaired');
console.log('  exact declared source/projection path observation: enabled');
console.log('  method and milestone ownership/reachability: declared');
