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
const corePath = 'data/project/m04f-epistemic-jurisdiction-core.json';
const axesPath = 'data/project/m04f-epistemic-jurisdiction-axes.json';
const testsClassesPath = 'data/project/m04f-epistemic-jurisdiction-tests-classes.json';
const systemsPath = 'data/intake/m04f-epistemic-jurisdiction-systems.json';
const fanoutPath = 'data/project/m04f-epistemic-jurisdiction-fanout.json';
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
const seedPaths = [
  corePath,
  axesPath,
  testsClassesPath,
  systemsPath,
  ...sourcePaths,
  fanoutPath,
  ...matrixPaths,
  ...supplementalWavePaths,
];

const core = readJson(corePath);
const axes = readJson(axesPath);
const testsClasses = readJson(testsClassesPath);
const baseSystems = readJson(systemsPath).systems;
const fanout = readJson(fanoutPath);
const sourceDocs = sourcePaths.map(readJson);
const sources = sourceDocs.flatMap(doc => doc.sources ?? []);
const supplementalWaves = supplementalWavePaths.map(readJson);
const systems = [...baseSystems, ...supplementalWaves.flatMap(doc => doc.systems ?? [])];
const waveOne = readJson('data/intake/m04f-epistemic-jurisdiction-wave-01.json');
const estate = readJson('data/project/m04f-epistemic-jurisdiction-estate.json');
const manifest = readJson('build/core-thesis/epistemic-jurisdiction/manifest.json');
const testMatrix = readJson('build/core-thesis/epistemic-jurisdiction/test-matrix.json');
const report = readJson('reports/core-thesis/epistemic-jurisdiction/data.json');
const records = [...waveOne.records, ...supplementalWaves.flatMap(doc => doc.records ?? [])];

assert(core.schema === 'm04f-core@1', 'core schema');
assert(axes.schema === 'm04f-axes@1', 'axes schema');
assert(testsClasses.schema === 'm04f-tests-classes@1', 'tests/classes schema');
assert(waveOne.schema_version === 'm04f-epistemic-jurisdiction-wave@1', 'Wave 01 schema');
assert(estate.schema_version === 'm04f-epistemic-jurisdiction-estate@1', 'estate schema');
assert(report.schema_version === 'm04f-epistemic-jurisdiction-report@2', 'report schema');
assert(waveOne.status === 'candidate_cross_estate' && estate.status === 'candidate_cross_estate', 'candidate boundary');

for (const doc of sourceDocs) assert(doc.schema === 'm04f-sources@1', 'source document schema');
for (const wave of supplementalWaves) {
  assert(wave.schema_version === 'm04f-epistemic-jurisdiction-supplemental-wave@1', `${wave.wave_id} schema`);
  assert(wave.status === 'candidate_cross_estate', `${wave.wave_id} status`);
  assert(wave.estate_id === core.estate_id, `${wave.wave_id} estate`);
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

const baseSystemIds = new Set(baseSystems.map(system => system.system_id));
for (const system of systems) {
  const systemRecords = records.filter(record => record.system_id === system.system_id);
  assert(systemRecords.length > 0, `${system.system_id} no records`);
  if (baseSystemIds.has(system.system_id)) {
    assert(
      new Set(systemRecords.map(record => record.test_id)).size === 8,
      `${system.system_id} lost baseline test coverage`,
    );
  } else {
    assert(systemRecords.length >= 2, `${system.system_id} supplemental system too thin`);
  }
}

const usedSources = new Set(records.flatMap(record => record.source_ids));
assert(usedSources.size === sources.length, 'source registry contains unused source');

const directVoice = records.filter(record =>
  /^(?:direct-subject|collective-subject)/i.test(record.classification?.represented_voice_basis ?? '')
).length;
const computed = {
  systems: systems.length,
  records: records.length,
  sources: sources.length,
  sources_used: usedSources.size,
  waves: 1 + supplementalWaves.length,
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
  direct_represented_person_voice_records: directVoice,
};
for (const key of Object.keys(computed)) {
  assert(JSON.stringify(estate.counts[key]) === JSON.stringify(computed[key]), `count ${key}`);
}

assert(estate.counts.records === 82, 'Wave 02 record total');
assert(estate.counts.systems === 10, 'Wave 02 system total');
assert(estate.counts.sources === 48, 'Wave 02 source total');
assert(estate.counts.waves === 2, 'Wave count');
assert(estate.counts.by_disposition.supported_for_human_review === 48, 'supported count');
assert(estate.counts.by_disposition.requires_additional_acquisition === 21, 'acquisition count');
assert(estate.counts.by_disposition.retained_candidate_only === 11, 'candidate count');
assert(estate.counts.by_disposition.bounded_non_link === 2, 'non-link count');
assert(estate.counts.direct_represented_person_voice_records === 1, 'direct represented-person voice count');
assert(fanout.lanes.length === 13, 'fanout count');
assert(supplementalWaves.length === 1 && supplementalWaves[0].records.length === 18, 'Wave 02 size');
assert(core.pattern.seed_document.sha256 === 'dfaba098a5aaee021ddfffe501252dfdb5813034481406d0bbec7134903a9290', 'seed hash');

const subjectVoice = records.find(record => record.record_id === 'M04F-EJ-065');
assert(subjectVoice?.classification.represented_voice_basis.startsWith('direct-subject'), 'direct subject voice missing');
const sevisNonLink = records.find(record => record.record_id === 'M04F-EJ-068');
assert(
  sevisNonLink?.disposition === 'bounded_non_link' &&
  /does not establish.*Palantir|non-link/i.test(`${sevisNonLink.proposition} ${sevisNonLink.observation}`),
  'SEVIS Palantir non-link missing',
);
const classF = records.find(record => record.record_id === 'M04F-EJ-077');
assert(
  classF?.classification.class_ids.includes('CJ10-exception-holder') &&
  classF?.classification.epistemic_standing_id === 'EJ5-threshold-burden-or-counterfactual-authority',
  'Class F exception record missing',
);
const braveAbort = records.find(record => record.record_id === 'M04F-EJ-079');
assert(
  braveAbort?.classification.remedy_power_id === 'RP3-stay-veto-or-substitution-leverage' &&
  /cancel|abort/i.test(`${braveAbort.observation} ${braveAbort.next_decisive_acquisition}`),
  'Brave1 human abort record missing',
);
const workerVoice = records.find(record => record.record_id === 'M04F-EJ-081');
assert(workerVoice?.classification.represented_voice_basis === 'direct-worker-open-letter', 'worker voice missing');

for (const boundary of [
  core.boundaries,
  waveOne.boundaries,
  ...supplementalWaves.map(wave => wave.boundaries),
  estate.boundaries,
  fanout.boundaries,
]) {
  assert(
    boundary.promotes_to === 'candidate_only' &&
    boundary.graph_effect === 'none' &&
    boundary.conclusion_generated === false &&
    boundary.estate_completion_claimed === false,
    'boundary exceeded',
  );
}

const fingerprint = crypto
  .createHash('sha256')
  .update(seedPaths.map(read).join('\n---\n'))
  .digest('hex');
assert(manifest.source_fingerprint === fingerprint && report.source_fingerprint === fingerprint, 'fingerprint');
assert(testMatrix.systems.length === 10 && report.records.length === 82 && report.fanout.length === 13, 'outputs');
assert(report.source_waves.length === 2, 'report waves');

if (errors.length) {
  console.error('validate-m04f failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`validate-m04f: OK (${records.length} records, ${systems.length} systems, ${sources.length} sources, ${fanout.lanes.length} lanes, ${directVoice} direct voice)`);
