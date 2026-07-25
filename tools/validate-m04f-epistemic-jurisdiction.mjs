#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = rel => JSON.parse(read(rel));
const errors = [];
const assert = (value, message) => { if (!value) errors.push(message); };
const unique = (items, key, label) =>
  assert(new Set(items.map(item => item[key])).size === items.length, `duplicate ${label}`);
const countBy = values => Object.fromEntries(
  [...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map())]
    .sort(([a], [b]) => a.localeCompare(b)),
);

const intakeDir = path.join(root, 'data/intake');
const projectDir = path.join(root, 'data/project');
const corePath = 'data/project/m04f-epistemic-jurisdiction-core.json';
const axesPath = 'data/project/m04f-epistemic-jurisdiction-axes.json';
const testsClassesPath = 'data/project/m04f-epistemic-jurisdiction-tests-classes.json';
const systemsPath = 'data/intake/m04f-epistemic-jurisdiction-systems.json';
const baseFanoutPath = 'data/project/m04f-epistemic-jurisdiction-fanout.json';
const stratigraphyPath = 'data/project/m04f-evidentiary-stratigraphy.json';
const sourcePaths = fs.readdirSync(intakeDir)
  .filter(name => /^m04f-epistemic-jurisdiction-sources-\d+\.json$/.test(name))
  .sort()
  .map(name => `data/intake/${name}`);
const matrixPaths = fs.readdirSync(intakeDir)
  .filter(name => name.startsWith('m04f-epistemic-jurisdiction-matrix-'))
  .sort()
  .map(name => `data/intake/${name}`);
const supplementalWavePaths = fs.readdirSync(intakeDir)
  .filter(name => /^m04f-epistemic-jurisdiction-wave-\d+\.json$/.test(name))
  .filter(name => name !== 'm04f-epistemic-jurisdiction-wave-01.json')
  .sort()
  .map(name => `data/intake/${name}`);
const supplementalFanoutPaths = fs.readdirSync(projectDir)
  .filter(name => /^m04f-epistemic-jurisdiction-fanout-wave-\d+\.json$/.test(name))
  .sort()
  .map(name => `data/project/${name}`);
const fanoutPaths = [baseFanoutPath, ...supplementalFanoutPaths];
const seedPaths = [
  corePath, axesPath, testsClassesPath, systemsPath, stratigraphyPath,
  ...sourcePaths, ...fanoutPaths, ...matrixPaths, ...supplementalWavePaths,
];

const core = readJson(corePath);
const axes = readJson(axesPath);
const testsClasses = readJson(testsClassesPath);
const baseSystems = readJson(systemsPath).systems;
const stratigraphyMethod = readJson(stratigraphyPath);
const fanoutDocs = fanoutPaths.map(readJson);
const fanout = {
  lanes: fanoutDocs.flatMap(doc => doc.lanes ?? []),
  boundaries: core.boundaries,
};
const sourceDocs = sourcePaths.map(readJson);
const sources = sourceDocs.flatMap(doc => doc.sources ?? []);
const supplementalWaves = supplementalWavePaths.map(readJson);
const systems = [...baseSystems, ...supplementalWaves.flatMap(doc => doc.systems ?? [])];
const waveOne = readJson('data/intake/m04f-epistemic-jurisdiction-wave-01.json');
const estate = readJson('data/project/m04f-epistemic-jurisdiction-estate.json');
const manifest = readJson('build/core-thesis/epistemic-jurisdiction/manifest.json');
const testMatrix = readJson('build/core-thesis/epistemic-jurisdiction/test-matrix.json');
const stratigraphyBuild = readJson('build/core-thesis/epistemic-jurisdiction/stratigraphy.json');
const report = readJson('reports/core-thesis/epistemic-jurisdiction/data.json');
const records = [...waveOne.records, ...supplementalWaves.flatMap(doc => doc.records ?? [])];

assert(core.schema === 'm04f-core@1', 'core schema');
assert(axes.schema === 'm04f-axes@1', 'axes schema');
assert(testsClasses.schema === 'm04f-tests-classes@1', 'tests/classes schema');
assert(stratigraphyMethod.schema === 'm04f-evidentiary-stratigraphy@1', 'stratigraphy schema');
assert(waveOne.schema_version === 'm04f-epistemic-jurisdiction-wave@1', 'Wave 01 schema');
assert(estate.schema_version === 'm04f-epistemic-jurisdiction-estate@1', 'estate schema');
assert(report.schema_version === 'm04f-epistemic-jurisdiction-report@3', 'report schema');
assert(manifest.schema_version === 'm04f-epistemic-jurisdiction-build@3', 'manifest schema');
assert(testMatrix.schema_version === 'm04f-epistemic-jurisdiction-test-matrix@3', 'test matrix schema');
assert(stratigraphyBuild.schema_version === 'm04f-evidentiary-stratigraphy-build@1', 'stratigraphy build schema');
assert(waveOne.status === 'candidate_cross_estate' && estate.status === 'candidate_cross_estate', 'candidate boundary');

for (const doc of sourceDocs) assert(doc.schema === 'm04f-sources@1', 'source document schema');
for (const wave of supplementalWaves) {
  assert(wave.schema_version === 'm04f-epistemic-jurisdiction-supplemental-wave@1', `${wave.wave_id} schema`);
  assert(wave.status === 'candidate_cross_estate', `${wave.wave_id} status`);
  assert(wave.estate_id === core.estate_id, `${wave.wave_id} estate`);
  assert((wave.records ?? []).every(record => record.stopping_rule), `${wave.wave_id} stopping rules`);
}
for (const [index, doc] of fanoutDocs.entries()) {
  if (index === 0) assert(doc.schema === 'm04f-fanout@1', 'base fanout schema');
  else assert(doc.schema === 'm04f-fanout-supplement@1', `${fanoutPaths[index]} schema`);
}

unique(sources, 'source_id', 'source');
unique(systems, 'system_id', 'system');
unique(testsClasses.tests, 'test_id', 'test');
unique(testsClasses.classes, 'class_id', 'class');
unique(records, 'record_id', 'record');
unique(fanout.lanes, 'lane_id', 'lane');

const sourceIds = new Set(sources.map(item => item.source_id));
const systemIds = new Set(systems.map(item => item.system_id));
const testIds = new Set(testsClasses.tests.map(item => item.test_id));
const classMap = new Map(testsClasses.classes.map(item => [item.class_id, item]));
const terminal = new Set(core.terminal);
const strata = new Set(stratigraphyMethod.states.map(item => item.state_id));
const sets = {
  e: new Set(axes.axes.epistemic_standing.map(item => item.standing_id)),
  b: new Set(axes.axes.burden_position.map(item => item.burden_id)),
  i: new Set(axes.axes.intervention_timing.map(item => item.timing_id)),
  c: new Set(axes.axes.evidence_custody.map(item => item.custody_id)),
  x: new Set(axes.axes.counterfactual_access.map(item => item.counterfactual_id)),
  r: new Set(axes.axes.remedy_power.map(item => item.remedy_id)),
  u: new Set(axes.axes.uncertainty_allocation.map(item => item.uncertainty_id)),
  a: new Set(axes.axes.action_rights),
};

for (const source of sources) {
  assert(/^https:\/\//.test(source.url ?? ''), `${source.source_id} URL`);
  assert(source.publisher && source.title && source.source_type, `${source.source_id} metadata`);
}
for (const record of records) {
  const classification = record.classification ?? {};
  assert(systemIds.has(record.system_id), `${record.record_id} system`);
  assert(testIds.has(record.test_id), `${record.record_id} test`);
  assert(terminal.has(record.disposition), `${record.record_id} disposition`);
  assert(record.source_ids?.length > 0, `${record.record_id} sources`);
  for (const id of record.source_ids ?? []) assert(sourceIds.has(id), `${record.record_id} source ${id}`);
  assert(record.parent_record_ids?.length > 0, `${record.record_id} lineage`);
  assert(
    record.proposition && record.observation && record.supports?.length &&
    record.does_not_support?.length && record.next_decisive_acquisition && record.falsifier,
    `${record.record_id} evidence contract`,
  );
  assert(
    sets.e.has(classification.epistemic_standing_id) &&
    sets.b.has(classification.burden_position_id) &&
    sets.i.has(classification.intervention_timing_id) &&
    sets.c.has(classification.evidence_custody_id) &&
    sets.x.has(classification.counterfactual_access_id) &&
    sets.r.has(classification.remedy_power_id) &&
    sets.u.has(classification.uncertainty_allocation_id),
    `${record.record_id} axis`,
  );
  let compatible = false;
  for (const id of classification.class_ids ?? []) {
    const classRow = classMap.get(id);
    assert(Boolean(classRow), `${record.record_id} class ${id}`);
    if (classRow?.allowed_standing?.includes(classification.epistemic_standing_id)) compatible = true;
  }
  assert(compatible, `${record.record_id} class/standing`);
  for (const id of classification.action_rights ?? []) assert(sets.a.has(id), `${record.record_id} action ${id}`);
  assert(/no mental state/i.test(classification.mental_state_ceiling ?? ''), `${record.record_id} mental-state ceiling`);
}

const reportById = new Map(report.records.map(record => [record.record_id, record]));
for (const record of records) {
  const projected = reportById.get(record.record_id);
  assert(Boolean(projected), `${record.record_id} report projection`);
  assert(strata.has(projected?.stratigraphy?.state_id), `${record.record_id} stratigraphy state`);
  assert(Array.isArray(projected?.stratigraphy?.durability_signals), `${record.record_id} stratigraphy signals`);
}

const baseSystemIds = new Set(baseSystems.map(system => system.system_id));
for (const system of systems) {
  const systemRecords = records.filter(record => record.system_id === system.system_id);
  assert(systemRecords.length > 0, `${system.system_id} no records`);
  if (baseSystemIds.has(system.system_id)) {
    assert(new Set(systemRecords.map(record => record.test_id)).size === 8, `${system.system_id} lost baseline test coverage`);
  } else {
    assert(systemRecords.length >= 2, `${system.system_id} supplemental system too thin`);
  }
}
for (const id of [
  'SYS-POST-OFFICE-HORIZON',
  'SYS-WISCONSIN-COMPAS-LOOMIS',
  'SYS-IDAHO-MEDICAID-BUDGET-TOOL',
  'SYS-NETHERLANDS-SYRI',
  'SYS-AUSTRALIA-ROBODEBT',
]) {
  assert(records.filter(record => record.system_id === id).length === 8, `${id} Wave 03 test coverage`);
}

const usedSources = new Set(records.flatMap(record => record.source_ids));
assert(usedSources.size === sources.length, 'source registry contains unused source');
const directSubject = record => /^(?:direct-subject|collective-subject)/i.test(record.classification?.represented_voice_basis ?? '');
const directWorker = record => /^(?:direct-worker|collective-worker)/i.test(record.classification?.represented_voice_basis ?? '');
const computed = {
  systems: systems.length,
  records: records.length,
  sources: sources.length,
  sources_used: usedSources.size,
  waves: 1 + supplementalWaves.length,
  fanout_lanes: fanout.lanes.length,
  by_test: countBy(records.map(record => record.test_id)),
  by_disposition: countBy(records.map(record => record.disposition)),
  by_epistemic_standing: countBy(records.map(record => record.classification.epistemic_standing_id)),
  by_burden: countBy(records.map(record => record.classification.burden_position_id)),
  by_timing: countBy(records.map(record => record.classification.intervention_timing_id)),
  by_custody: countBy(records.map(record => record.classification.evidence_custody_id)),
  by_counterfactual: countBy(records.map(record => record.classification.counterfactual_access_id)),
  by_remedy: countBy(records.map(record => record.classification.remedy_power_id)),
  by_uncertainty: countBy(records.map(record => record.classification.uncertainty_allocation_id)),
  by_class: countBy(records.flatMap(record => record.classification.class_ids)),
  by_stratigraphy: countBy(report.records.map(record => record.stratigraphy.state_id)),
  waterline_by_state: countBy(report.waterline.map(item => item.waterline_state)),
  direct_represented_person_voice_records: records.filter(directSubject).length,
  direct_worker_voice_records: records.filter(directWorker).length,
  direct_voice_records_total: records.filter(record => directSubject(record) || directWorker(record)).length,
  bedrock_records: report.records.filter(record => record.stratigraphy.state_id === 'bedrock').length,
  fault_line_records: report.records.filter(record => record.stratigraphy.state_id === 'fault_line').length,
};
for (const key of Object.keys(computed)) {
  assert(JSON.stringify(estate.counts[key]) === JSON.stringify(computed[key]), `count ${key}`);
}

assert(estate.counts.records === 122, 'Wave 03 record total');
assert(estate.counts.systems === 15, 'Wave 03 system total');
assert(estate.counts.sources === 66, 'Wave 03 source total');
assert(estate.counts.waves === 3, 'Wave count');
assert(estate.counts.fanout_lanes === 19, 'fanout count');
assert(estate.counts.by_disposition.supported_for_human_review === 76, 'supported count');
assert(estate.counts.by_disposition.requires_additional_acquisition === 29, 'acquisition count');
assert(estate.counts.by_disposition.retained_candidate_only === 14, 'candidate count');
assert(estate.counts.by_disposition.bounded_non_link === 3, 'non-link count');
assert(estate.counts.direct_represented_person_voice_records === 10, 'direct represented-person voice count');
assert(supplementalWaves.length === 2, 'supplemental wave count');
assert(supplementalWaves.find(wave => wave.wave_id === 'M04F-EJ-W03')?.records.length === 40, 'Wave 03 size');
assert(fanout.lanes.length === 19, 'combined fanout size');
assert(core.pattern.seed_document.sha256 === 'dfaba098a5aaee021ddfffe501252dfdb5813034481406d0bbec7134903a9290', 'seed hash');

const horizon = reportById.get('M04F-EJ-085');
assert(horizon?.stratigraphy.state_id === 'bedrock', 'Horizon burden record must be bedrock');
const loomNonLink = reportById.get('M04F-EJ-096');
assert(loomNonLink?.disposition === 'bounded_non_link' && loomNonLink?.stratigraphy.state_id === 'fault_line', 'Loomis non-link fault line');
const kw = reportById.get('M04F-EJ-101');
assert(kw?.stratigraphy.state_id === 'bedrock', 'K.W. burden shift bedrock');
const syri = reportById.get('M04F-EJ-109');
assert(syri?.stratigraphy.state_id === 'bedrock', 'SyRI burden shift bedrock');
const robo = reportById.get('M04F-EJ-117');
assert(robo?.stratigraphy.state_id === 'bedrock', 'Robodebt subject burden bedrock');
const sevis = reportById.get('M04F-EJ-068');
assert(sevis?.disposition === 'bounded_non_link' && sevis?.stratigraphy.state_id === 'fault_line', 'SEVIS non-link remains visible');
assert(report.waterline.length === systems.length, 'system waterline count');
assert(report.waterline.every(item => item.join_count >= 0 && item.join_count <= 7), 'waterline join range');
assert(report.waterline.some(item => item.waterline_state === 'bounded_landfall'), 'no bounded landfall positive control');
assert(stratigraphyBuild.records.length === records.length, 'stratigraphy record count');
assert(stratigraphyBuild.systems.length === systems.length, 'stratigraphy system count');

for (const boundary of [
  core.boundaries,
  waveOne.boundaries,
  ...supplementalWaves.map(wave => wave.boundaries),
  estate.boundaries,
  ...fanoutDocs.map(doc => doc.boundaries),
]) {
  assert(
    boundary.promotes_to === 'candidate_only' &&
    boundary.graph_effect === 'none' &&
    boundary.conclusion_generated === false &&
    boundary.estate_completion_claimed === false,
    'boundary exceeded',
  );
}
assert(stratigraphyMethod.boundaries.bedrock_is_not_system_truth === true, 'bedrock boundary missing');
assert(estate.boundaries.bedrock_is_not_system_truth === true, 'estate bedrock boundary missing');

const fingerprint = crypto.createHash('sha256').update(seedPaths.map(read).join('\n---\n')).digest('hex');
assert(manifest.source_fingerprint === fingerprint && report.source_fingerprint === fingerprint, 'fingerprint');
assert(testMatrix.systems.length === 15 && report.records.length === 122 && report.fanout.length === 19, 'outputs');
assert(report.source_waves.length === 3, 'report waves');

if (errors.length) {
  console.error('validate-m04f failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`validate-m04f: OK (${records.length} records, ${systems.length} systems, ${sources.length} sources, ${fanout.lanes.length} lanes, ${computed.direct_represented_person_voice_records} direct subject voice, ${computed.bedrock_records} bedrock)`);
