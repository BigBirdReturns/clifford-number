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
if (!Array.isArray(policy.projection_contract?.target_identifier_keys)) {
  throw new Error('Wave 21 projection target identifier keys missing');
}
for (const key of ['gate_id', 'owner_program_id']) {
  if (!policy.projection_contract.target_identifier_keys.includes(key)) {
    policy.projection_contract.target_identifier_keys.push(key);
  }
}
policy.projection_contract.target_identifier_keys.sort();
policy.projection_contract.divergence_classification = 'typed_wave21_identifier_reuse_across_source_records_and_projection_views';
policy.projection_contract.divergence_disposition = 'retain_declared_typed_reference_views';
policy.boundaries.repeated_gate_id_is_identical_assessment = false;
policy.boundaries.repeated_owner_program_id_is_graph_or_common_purpose = false;

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

let method = read(methodDoc);
method = replaceRequired(
  method,
  'basin membership is not common purpose\ngraph effect: none',
  'basin membership is not common purpose\nrepeated gate_id is a reusable assessment dimension, not an identical assessment\nrepeated owner_program_id is an accountable reference, not a graph edge or common purpose\ngraph effect: none',
  'method metadata-reference boundaries'
);
write(methodDoc, method);

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

const stabilizerPath = 'tools/stabilize-lake-allocator-war-wave-21.mjs';
let stabilizer = read(stabilizerPath);
stabilizer = replaceRequired(
  stabilizer,
  "const projectionTargets = new Map([\n  [`program_id:${policy.program_id}`, { object_type: 'program_identity' }],\n  [`wave_id:${policy.wave_id}`, { object_type: 'wave_identity' }],",
  "const gateIds = unique(observations.flatMap(row =>\n  (row.four_gate_assessment ?? []).map(gate => gate.gate_id)\n));\nassert(gateIds.length === 4, `allocator-war Wave 21 gate identifiers ${gateIds.length}/4`);\nconst projectionTargets = new Map([\n  [`program_id:${policy.program_id}`, { object_type: 'program_identity' }],\n  [`owner_program_id:${policy.program_id}`, { object_type: 'program_owner_reference' }],\n  [`wave_id:${policy.wave_id}`, { object_type: 'wave_identity' }],\n  ...gateIds.map(gateId => [`gate_id:${gateId}`, { object_type: 'four_gate_dimension_reference', consumer_key: gateId }]),",
  'metadata projection targets'
);
stabilizer = replaceRequired(
  stabilizer,
  "const remainingUnindexed = (objects.objects ?? []).filter(object => object.unindexed_identifier && !object.topology_unindexed_disposition);\n\nindex.summary.counts.allocator_war_wave_21_source_rows = authorityByCompound.size;",
  "const remainingUnindexed = (objects.objects ?? []).filter(object => object.unindexed_identifier && !object.topology_unindexed_disposition);\n\nconst residualViews = [\n  ['unindexed', remainingUnindexed, 'unindexed_machine_ids_unadjudicated'],\n  ['source-only', remainingSourceOnly, 'source_ids_without_projection_unadjudicated'],\n  ['divergence', remainingDivergence, 'divergent_identifier_projections_unadjudicated']\n];\nfor (const [label, rows, summaryKey] of residualViews) {\n  index.summary.counts[summaryKey] = rows.length;\n  gaps[summaryKey] = rows;\n  assert(index.summary.counts[summaryKey] === gaps[summaryKey].length, label + ' residual summary drift');\n}\nif (gaps.identifier_topology) {\n  gaps.identifier_topology.unindexed_unadjudicated = remainingUnindexed.length;\n  gaps.identifier_topology.source_only_unadjudicated = remainingSourceOnly.length;\n  gaps.identifier_topology.divergence_unadjudicated = remainingDivergence.length;\n}\n\nindex.summary.counts.allocator_war_wave_21_source_rows = authorityByCompound.size;",
  'canonical residual view synchronization'
);
write(stabilizerPath, stabilizer);

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
validator = replaceRequired(
  validator,
  "  if (policy.projection_contract.projection_hash_equality_required !== false) fail(errors, 'projection contract hash-equality drift');",
  "  if (policy.projection_contract.projection_hash_equality_required !== false) fail(errors, 'projection contract hash-equality drift');\n  for (const key of ['gate_id', 'owner_program_id']) {\n    if (!policy.projection_contract.target_identifier_keys.includes(key)) fail(errors, `${key}: projection contract target missing`);\n  }\n  if (policy.boundaries.repeated_gate_id_is_identical_assessment !== false) fail(errors, 'gate reference boundary drift');\n  if (policy.boundaries.repeated_owner_program_id_is_graph_or_common_purpose !== false) fail(errors, 'owner reference boundary drift');",
  'validator metadata projection contract'
);
validator = replaceRequired(
  validator,
  "  if (![recordIds, classIds, estateIds, programIds].every(unique)) fail(errors, 'duplicate Wave 21 identifier');",
  "  if (![recordIds, classIds, estateIds, programIds].every(unique)) fail(errors, 'duplicate Wave 21 identifier');\n  const gateIds = [...new Set(observations.flatMap(row =>\n    (row.four_gate_assessment ?? []).map(gate => gate.gate_id)\n  ))].sort();\n  if (gateIds.length !== 4) fail(errors, `four-gate identifier count ${gateIds.length}`);",
  'validator gate identity denominator'
);
validator = replaceRequired(
  validator,
  "      if (summary.counts?.allocator_war_wave_21_source_rows !== 53) fail(errors, 'sharded summary Wave 21 source count drift');\n      if (summary.counts?.allocator_war_wave_21_complete_findings !== 0) fail(errors, 'sharded summary finding inflation');",
  "      const expectedSourceRows = observations.length + waterline.length + estates.length + programs.length;\n      const expectedGateIds = new Set(observations.flatMap(row =>\n        (row.four_gate_assessment ?? []).map(gate => gate.gate_id)\n      )).size;\n      const expectedContractObjects = expectedSourceRows + policy.basin_contract.length + expectedGateIds + 3;\n      if (summary.counts?.allocator_war_wave_21_source_rows !== expectedSourceRows) fail(errors, 'sharded summary Wave 21 source count drift');\n      if (summary.counts?.allocator_war_wave_21_contract_objects !== expectedContractObjects) fail(errors, 'sharded summary Wave 21 contract-object count drift');\n      if (summary.counts?.allocator_war_wave_21_complete_findings !== 0) fail(errors, 'sharded summary finding inflation');",
  'validator sharded contract-object denominator'
);
validator = replaceRequired(
  validator,
  "      if (gaps.allocator_war_wave_21?.unresolved_identifier_divergence !== 0) fail(errors, 'Wave 21 unresolved identifier divergence');",
  "      for (const [key, label] of [\n        ['remaining_unadjudicated_divergence', 'divergence'],\n        ['remaining_unadjudicated_source_only', 'source-only'],\n        ['remaining_unadjudicated_unindexed', 'unindexed']\n      ]) if (gaps.allocator_war_wave_21?.[key] !== 0) fail(errors, `Wave 21 unresolved identifier ${label}`);",
  'validator residual topology fields'
);
write(validatorPath, validator);

const testPath = 'test/lake-allocator-war-wave-21.test.js';
let tests = read(testPath);
tests = replaceRequired(
  tests,
  "  ['remove projection basin view', state => { state.projection.basins.pop(); }]",
  "  ['remove projection basin view', state => { state.projection.basins.pop(); }],\n  ['drop gate identifier contract', state => { state.policy.projection_contract.target_identifier_keys = state.policy.projection_contract.target_identifier_keys.filter(key => key !== 'gate_id'); }],\n  ['drop owner identifier contract', state => { state.policy.projection_contract.target_identifier_keys = state.policy.projection_contract.target_identifier_keys.filter(key => key !== 'owner_program_id'); }]",
  'metadata projection contract mutations'
);
write(testPath, tests);

console.log('allocator-war Wave 21 final reconciliation seams repaired');
console.log('  exact declared source/projection path observation: enabled');
console.log('  method and milestone ownership/reachability: declared');
console.log('  gate and owner metadata references: typed and topology-adjudicated');
console.log('  residual summary, gap arrays, and topology counters: synchronized');
