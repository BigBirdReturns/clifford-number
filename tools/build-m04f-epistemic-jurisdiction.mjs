#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = rel => JSON.parse(read(rel));
const write = (rel, value) => {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
};
const writeJson = (rel, value) => write(rel, `${JSON.stringify(value, null, 2)}\n`);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

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

const sourceFiles = [
  corePath,
  axesPath,
  testsClassesPath,
  systemsPath,
  ...sourcePaths,
  fanoutPath,
  ...matrixPaths,
  ...supplementalWavePaths,
];
const sourceTexts = sourceFiles.map(read);

const core = readJson(corePath);
const axes = readJson(axesPath);
const testsClasses = readJson(testsClassesPath);
const baseSystemsDoc = readJson(systemsPath);
const fanout = readJson(fanoutPath);
const sourceDocs = sourcePaths.map(readJson);
const supplementalWaves = supplementalWavePaths.map(readJson);

const sources = sourceDocs.flatMap(doc => doc.sources ?? []);
const systems = [
  ...baseSystemsDoc.systems,
  ...supplementalWaves.flatMap(doc => doc.systems ?? []),
];
const tests = new Map(testsClasses.tests.map(item => [item.test_id, item]));
const systemMap = new Map(systems.map(item => [item.system_id, item]));
const sourceMap = new Map(sources.map(item => [item.source_id, item]));

const baselineRows = matrixPaths.flatMap(rel => {
  const doc = readJson(rel);
  return doc.rows.map(row => ({ ...row, system_id: doc.system_id }));
});
const baselineRecords = baselineRows.map(row => {
  const system = systemMap.get(row.system_id);
  const test = tests.get(row.test);
  return {
    record_id: row.id,
    system_id: row.system_id,
    test_id: row.test,
    scope: system.scope,
    actors: system.actors,
    source_ids: system.source_ids,
    parent_record_ids: system.parent_record_ids,
    proposition: `${system.label}: ${test.question}`,
    observation: row.note,
    supports: [
      `bounded ${test.test_id} review in ${system.label}`,
      'the source-defined transition at the stated evidence ceiling',
    ],
    does_not_support: [
      'mental state, motive, awareness, wrongdoing, coercion, or extraction',
      'a system-wide coordinated-class or monopoly conclusion',
      'causal consequence beyond the cited sources',
    ],
    classification: {
      epistemic_standing_id: row.e,
      burden_position_id: row.b,
      intervention_timing_id: row.i,
      evidence_custody_id: row.c,
      counterfactual_access_id: row.x,
      remedy_power_id: row.r,
      uncertainty_allocation_id: row.u,
      class_ids: row.k,
      action_rights: row.a,
      represented_voice_basis: 'institutional-description-only; no direct represented-person voice in the Wave 01 source set',
      mental_state_ceiling: 'No mental state, awareness, motive, or coordination inference is generated from this structural classification.',
    },
    disposition: row.disp,
    evidence_ceiling: row.ceil,
    next_decisive_acquisition: row.next,
    falsifier: row.fals,
  };
});
const supplementalRecords = supplementalWaves.flatMap(doc => doc.records ?? []);
const records = [...baselineRecords, ...supplementalRecords];

const countBy = values => Object.fromEntries(
  [...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map())]
    .sort(([a], [b]) => a.localeCompare(b)),
);
const directVoice = records.filter(record =>
  /^(?:direct-subject|collective-subject)/i.test(record.classification?.represented_voice_basis ?? '')
).length;
const usedSourceIds = new Set(records.flatMap(record => record.source_ids));
const counts = {
  systems: systems.length,
  records: records.length,
  sources: sources.length,
  sources_used: usedSourceIds.size,
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

const baseSourceIds = new Set(baseSystemsDoc.systems.flatMap(system => system.source_ids));
const waveOneSources = sources.filter(source => baseSourceIds.has(source.source_id));
const waveOne = {
  schema_version: 'm04f-epistemic-jurisdiction-wave@1',
  wave_id: 'M04F-EJ-W01',
  estate_id: core.estate_id,
  status: 'candidate_cross_estate',
  as_of: core.as_of,
  purpose: 'Apply eight epistemic-jurisdiction tests to eight source-bounded systems without converting structural position into mental state or system-wide conclusion.',
  null_hypothesis: core.null,
  source_registry: waveOneSources,
  systems: baseSystemsDoc.systems,
  records: baselineRecords,
  boundaries: core.boundaries,
};

const systemChains = systems.map(system => {
  const systemRecords = records.filter(record => record.system_id === system.system_id);
  return {
    system_id: system.system_id,
    label: system.label,
    scope: system.scope,
    record_ids: systemRecords.map(record => record.record_id),
    test_coverage: Object.fromEntries(
      testsClasses.tests.map(test => [
        test.test_id,
        systemRecords.some(record => record.test_id === test.test_id) ? 'present' : 'not_yet_present',
      ]),
    ),
    current_ceiling: 'bounded system adjudication only; no system-wide monopoly or coordinated-class conclusion',
  };
});

const results = [
  'Wave 02 preserves the first direct represented-person voice in the M-04F estate through a judicial record of a SEVIS termination, retrospective proof burden, and court-ordered restoration.',
  'The SEVIS comparator is an explicit non-link to Palantir, ICM, and ImmigrationOS unless operative interface evidence is acquired.',
  'NHS governance records show aggregated public feedback, direct public-representative participation, repeated challenge to AI consent and data-use thresholds, and observed programme response without yet proving a binding public veto.',
  'Palantir shareholder proposals created explicit governance counterfactuals, while the Class F formula and actual vote record make founder voting privilege observable without proving how a one-share-one-vote counterfactual would have resolved.',
  'Brave1 publicly describes high automation with operator target selection and an attack-cancel path, while the negative-validation, incident, recall, injury, and remedy denominator remains absent.',
  'Technology-worker letters supply direct preventive challenge and evidence-custody claims, but not yet demonstrated compulsory power.',
  'The cross-system monopoly proposition remains candidate-only until repeated rights-holder identity, direct deployment-specific subject voice, consequence, remedy, comparator, and causal error-benefit chains are complete.',
];

const sourceWaves = [
  { wave_id: waveOne.wave_id, path: 'data/intake/m04f-epistemic-jurisdiction-wave-01.json', records: baselineRecords.length },
  ...supplementalWaves.map((doc, index) => ({
    wave_id: doc.wave_id,
    path: supplementalWavePaths[index],
    records: (doc.records ?? []).length,
  })),
];

const estate = {
  schema_version: 'm04f-epistemic-jurisdiction-estate@1',
  estate_id: core.estate_id,
  status: 'candidate_cross_estate',
  as_of: core.as_of,
  source_waves: sourceWaves,
  counts,
  current_ceiling: {
    bounded_form: 'Multiple systems allocate prospective inference authority, thresholds, evidence custody, exception power, and retrospective burdens asymmetrically; Wave 02 adds direct subject voice and observed bounded counterpower.',
    system_claim: 'retained_candidate_only',
    monopoly_on_unprovable: 'not_eligible_for_promotion',
    reason: 'The estate still lacks a complete cross-system denominator, common governance, repeated rights-holder identity, deployment-specific direct subject voice in the core Palantir lanes, and causal error-benefit chains.',
  },
  system_chains: systemChains,
  most_informative_results: results,
  next_sequence: fanout.lanes.map(lane => lane.lane_id),
  admission_rule: 'Canonical admission requires at least two source-complete systems with inference authority, threshold, evidence custody, direct affected-person voice, consequence, remedy, comparator, and observed exit or preventive stay.',
  boundaries: core.boundaries,
};

const fingerprint = hash(sourceTexts.join('\n---\n'));
const report = {
  schema_version: 'm04f-epistemic-jurisdiction-report@2',
  report_id: 'M04F-EJ-REPORT-002',
  as_of: core.as_of,
  estate_id: core.estate_id,
  source_fingerprint: fingerprint,
  source_files: sourceFiles,
  source_waves: sourceWaves,
  counts,
  current_ceiling: estate.current_ceiling,
  most_informative_results: results,
  systems: systemChains,
  records: records.map(record => ({
    ...record,
    system: systemMap.get(record.system_id),
    test: tests.get(record.test_id),
    sources: record.source_ids.map(id => sourceMap.get(id)),
  })),
  sources,
  proof_tests: testsClasses.tests,
  axes: axes.axes,
  class_catalog: testsClasses.classes,
  fanout: fanout.lanes,
  pattern_to_proof: core.pattern,
  boundaries: core.boundaries,
};

writeJson('data/intake/m04f-epistemic-jurisdiction-wave-01.json', waveOne);
writeJson('data/project/m04f-epistemic-jurisdiction-estate.json', estate);
writeJson('build/core-thesis/epistemic-jurisdiction/manifest.json', {
  schema_version: 'm04f-epistemic-jurisdiction-build@2',
  estate_id: core.estate_id,
  as_of: core.as_of,
  source_fingerprint: fingerprint,
  counts,
  source_files: sourceFiles,
  source_waves: sourceWaves,
  report_paths: [
    'reports/core-thesis/epistemic-jurisdiction/data.json',
    'reports/core-thesis/epistemic-jurisdiction/index.html',
  ],
  boundaries: core.boundaries,
});
writeJson('build/core-thesis/epistemic-jurisdiction/test-matrix.json', {
  schema_version: 'm04f-epistemic-jurisdiction-test-matrix@2',
  estate_id: core.estate_id,
  proof_tests: testsClasses.tests,
  systems: systemChains.map(system => ({
    system_id: system.system_id,
    label: system.label,
    record_ids: system.record_ids,
    dispositions: Object.fromEntries(
      records
        .filter(record => record.system_id === system.system_id)
        .map(record => [`${record.test_id}:${record.record_id}`, record.disposition]),
    ),
  })),
  boundaries: core.boundaries,
});
writeJson('reports/core-thesis/epistemic-jurisdiction/data.json', report);

const cards = systemChains.map(system =>
  `<article><h3>${esc(system.label)}</h3><p>${esc(system.scope)}</p><p><code>${system.record_ids.length} records</code></p></article>`
).join('');
const rows = report.records.map(record =>
  `<tr><td><code>${esc(record.record_id)}</code></td><td>${esc(record.system.label)}</td><td>${esc(record.test_id)}</td><td>${esc(record.observation)}</td><td>${esc(record.classification.represented_voice_basis)}</td><td><code>${esc(record.disposition)}</code></td></tr>`
).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-04F epistemic jurisdiction</title><style>
body{font:16px/1.55 system-ui;max-width:1500px;margin:35px auto;padding:0 22px;background:#ece9df;color:#171717}article,.box{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px;padding:14px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}.metrics{display:flex;gap:12px;flex-wrap:wrap}.metric{min-width:130px}.metric b{display:block;font-size:1.7rem}.warn{border-left:5px solid #76251e;padding:14px;background:#fffdf7;margin:20px 0}table{border-collapse:collapse;width:100%;font-size:.78rem;background:#fffdf7}th,td{padding:7px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}
</style></head><body><p><b>M-04F · candidate cross-estate · ${counts.waves} waves</b></p><h1>${esc(core.title)}</h1><p>${esc(core.question)}</p><div class="warn"><b>Current ceiling:</b> ${esc(estate.current_ceiling.bounded_form)} Direct represented-person voice records: <b>${counts.direct_represented_person_voice_records}</b>.</div><div class="metrics"><div class="box metric"><b>${counts.systems}</b>systems</div><div class="box metric"><b>${counts.records}</b>records</div><div class="box metric"><b>${counts.sources}</b>sources</div><div class="box metric"><b>${counts.by_disposition.supported_for_human_review ?? 0}</b>supported</div><div class="box metric"><b>${counts.by_disposition.requires_additional_acquisition ?? 0}</b>acquire next</div></div><h2>Systems</h2><div class="grid">${cards}</div><h2>Records</h2><table><thead><tr><th>ID</th><th>System</th><th>Test</th><th>Observation</th><th>Voice basis</th><th>Disposition</th></tr></thead><tbody>${rows}</tbody></table><h2>Pattern-to-Proof</h2><p>Seed manuscript SHA-256: <code>${esc(core.pattern.seed_document.sha256)}</code>. The source PDF binary is not published by this protocol.</p><div class="warn"><code>promotes_to: candidate_only · graph_effect: none · conclusion_generated: false · estate_completion_claimed: false</code></div></body></html>`;
write('reports/core-thesis/epistemic-jurisdiction/index.html', html);

console.log(`m04f build: ${records.length} records, ${systems.length} systems, ${sources.length} sources, ${fanout.lanes.length} lanes, ${counts.direct_represented_person_voice_records} direct voice; ${fingerprint.slice(0, 12)}`);
