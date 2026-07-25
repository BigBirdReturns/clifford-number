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

const sourceFiles = [
  corePath,
  axesPath,
  testsClassesPath,
  systemsPath,
  stratigraphyPath,
  ...sourcePaths,
  ...fanoutPaths,
  ...matrixPaths,
  ...supplementalWavePaths,
];
const sourceTexts = sourceFiles.map(read);

const core = readJson(corePath);
const axes = readJson(axesPath);
const testsClasses = readJson(testsClassesPath);
const baseSystemsDoc = readJson(systemsPath);
const stratigraphy = readJson(stratigraphyPath);
const fanoutDocs = fanoutPaths.map(readJson);
const sourceDocs = sourcePaths.map(readJson);
const supplementalWaves = supplementalWavePaths.map(readJson);

const sources = sourceDocs.flatMap(doc => doc.sources ?? []);
const systems = [
  ...baseSystemsDoc.systems,
  ...supplementalWaves.flatMap(doc => doc.systems ?? []),
];
const fanout = {
  schema: 'm04f-fanout-combined@1',
  master: fanoutDocs[0].master,
  lanes: fanoutDocs.flatMap(doc => doc.lanes ?? []),
  boundaries: core.boundaries,
  source_files: fanoutPaths,
};
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
    stopping_rule: 'Close only when the named decisive acquisition or falsifier is source-bounded.',
  };
});
const supplementalRecords = supplementalWaves.flatMap(doc => doc.records ?? []);
const rawRecords = [...baselineRecords, ...supplementalRecords];

const directSubject = record =>
  /^(?:direct-subject|collective-subject)/i.test(record.classification?.represented_voice_basis ?? '');
const directWorker = record =>
  /^(?:direct-worker|collective-worker)/i.test(record.classification?.represented_voice_basis ?? '');

const stratify = record => {
  const c = record.classification ?? {};
  const actions = new Set(c.action_rights ?? []);
  const signals = [];
  if (directSubject(record) || directWorker(record)) signals.push('direct_affected_voice');
  if (c.evidence_custody_id === 'EC4-independent-discoverable-or-auditable-custody') signals.push('independent_evidence_custody');
  if (c.remedy_power_id === 'RP4-compulsory-revision-reversal-or-termination') signals.push('compulsory_remedy');
  if (c.burden_position_id === 'B4-independent-authority-can-shift-burden') signals.push('burden_shift');
  if (['CF3-alternative-piloted-or-operated','CF4-alternative-substituted-or-produced-outcomes'].includes(c.counterfactual_access_id)) signals.push('operated_counterfactual');
  if (c.counterfactual_access_id === 'CF2-alternative-evaluated') signals.push('evaluated_counterfactual');
  if (
    c.intervention_timing_id === 'IT4-review-after-consequence' &&
    ['UA3-subject-bears-uncertainty-as-risk-or-proof-burden','UA4-system-captures-learning-while-subject-bears-error'].includes(c.uncertainty_allocation_id)
  ) signals.push('consequence_chain');
  if (
    c.epistemic_standing_id === 'EJ5-threshold-burden-or-counterfactual-authority' &&
    (actions.has('set_threshold') || actions.has('define_exception'))
  ) signals.push('threshold_or_exception_record');
  if (
    ['EC3-shared-public-private-custody','EC4-independent-discoverable-or-auditable-custody'].includes(c.evidence_custody_id) &&
    (actions.has('control_logs') || actions.has('compel_disclosure'))
  ) signals.push('shared_or_independent_archive');

  let state;
  let basis;
  if (['bounded_non_link','falsified'].includes(record.disposition)) {
    state = 'fault_line';
    basis = 'The record constrains or breaks a proposed bridge.';
  } else if (['requires_additional_acquisition','source_restricted','source_unavailable'].includes(record.disposition)) {
    state = 'suspended_fog';
    basis = 'The decisive transition remains an exact acquisition problem.';
  } else if (record.disposition === 'retained_candidate_only') {
    state = 'unsettled_sediment';
    basis = 'The proposition remains plausible but insufficiently compacted.';
  } else {
    const has = value => signals.includes(value);
    const bedrock =
      (has('compulsory_remedy') && has('independent_evidence_custody') && has('burden_shift')) ||
      (has('direct_affected_voice') && has('compulsory_remedy') && has('consequence_chain')) ||
      (has('operated_counterfactual') && has('compulsory_remedy') && has('independent_evidence_custody'));
    if (bedrock) {
      state = 'bedrock';
      basis = 'Multiple independent durability signals anchor this bounded proposition.';
    } else if (signals.length >= 3) {
      state = 'compacted_stratum';
      basis = 'At least three independent durability signals converge.';
    } else {
      state = 'settled_sediment';
      basis = 'The proposition is source-bounded but remains thin on corroboration, counterpower, consequence, or counterfactual.';
    }
  }
  return {
    state_id: state,
    durability_signals: [...new Set(signals)].sort(),
    signal_count: new Set(signals).size,
    basis,
    ceiling: 'Stratigraphic depth applies only to the bounded proposition and cannot promote the system-wide theory.',
  };
};

const records = rawRecords.map(record => ({ ...record, stratigraphy: stratify(record) }));

const countBy = values => Object.fromEntries(
  [...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map())]
    .sort(([a], [b]) => a.localeCompare(b)),
);
const usedSourceIds = new Set(records.flatMap(record => record.source_ids));
const systemVertical = systems.map(system => {
  const systemRecords = records.filter(record => record.system_id === system.system_id);
  const supported = record => record.disposition === 'supported_for_human_review';
  const joins = {
    inference_and_threshold:
      systemRecords.some(record => record.test_id === 'EJT1-inference-authority' && supported(record)) &&
      systemRecords.some(record => record.test_id === 'EJT2-threshold-authorship' && supported(record)),
    direct_voice: systemRecords.some(record => directSubject(record) || directWorker(record)),
    evidence_custody: systemRecords.some(record =>
      record.test_id === 'EJT5-evidence-custody' &&
      ['supported_for_human_review','retained_candidate_only'].includes(record.disposition)
    ),
    material_consequence: systemRecords.some(record =>
      supported(record) &&
      ['IT3-action-before-ordinary-review','IT4-review-after-consequence'].includes(record.classification.intervention_timing_id) &&
      ['UA3-subject-bears-uncertainty-as-risk-or-proof-burden','UA4-system-captures-learning-while-subject-bears-error'].includes(record.classification.uncertainty_allocation_id)
    ),
    compulsory_remedy: systemRecords.some(record =>
      supported(record) &&
      ['RP3-stay-veto-or-substitution-leverage','RP4-compulsory-revision-reversal-or-termination'].includes(record.classification.remedy_power_id)
    ),
    counterfactual: systemRecords.some(record =>
      ['CF2-alternative-evaluated','CF3-alternative-piloted-or-operated','CF4-alternative-substituted-or-produced-outcomes'].includes(record.classification.counterfactual_access_id)
    ),
    error_learning_benefit: systemRecords.some(record =>
      record.test_id === 'EJT8-error-metabolism' && supported(record)
    ),
  };
  const joinCount = Object.values(joins).filter(Boolean).length;
  let waterlineState = 'offshore_fog';
  if (
    joinCount >= 5 && joins.direct_voice && joins.material_consequence &&
    joins.compulsory_remedy && joins.counterfactual
  ) waterlineState = 'bounded_landfall';
  else if (joinCount >= 4 && joins.direct_voice && joins.compulsory_remedy) waterlineState = 'contested_shore';
  else if (joinCount >= 3) waterlineState = 'shoaling';
  return {
    system_id: system.system_id,
    label: system.label,
    joins,
    join_count: joinCount,
    missing_joins: Object.entries(joins).filter(([, value]) => !value).map(([key]) => key),
    waterline_state: waterlineState,
    strata: countBy(systemRecords.map(record => record.stratigraphy.state_id)),
    bedrock_record_ids: systemRecords.filter(record => record.stratigraphy.state_id === 'bedrock').map(record => record.record_id),
    fault_line_record_ids: systemRecords.filter(record => record.stratigraphy.state_id === 'fault_line').map(record => record.record_id),
  };
});
const waterlineMap = new Map(systemVertical.map(item => [item.system_id, item]));

const counts = {
  systems: systems.length,
  records: records.length,
  sources: sources.length,
  sources_used: usedSourceIds.size,
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
  by_stratigraphy: countBy(records.map(record => record.stratigraphy.state_id)),
  waterline_by_state: countBy(systemVertical.map(item => item.waterline_state)),
  direct_represented_person_voice_records: records.filter(directSubject).length,
  direct_worker_voice_records: records.filter(directWorker).length,
  direct_voice_records_total: records.filter(record => directSubject(record) || directWorker(record)).length,
  bedrock_records: records.filter(record => record.stratigraphy.state_id === 'bedrock').length,
  fault_line_records: records.filter(record => record.stratigraphy.state_id === 'fault_line').length,
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
  records: baselineRecords.map(record => ({ ...record, stratigraphy: stratify(record) })),
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
    stratigraphy: waterlineMap.get(system.system_id),
    current_ceiling: 'bounded system adjudication only; no system-wide monopoly or coordinated-class conclusion',
  };
});

const results = [
  'The lake now contains delayed-remedy, proprietary-model, prospective-injunction, system-prohibition, and public-redress comparators rather than only current Palantir-adjacent systems.',
  'Bedrock identifies bounded facts anchored by direct voice, compulsory adjudication, independent custody, or operated counterfactuals; it does not validate the total theory.',
  'Horizon and Robodebt establish durable action-before-review, direct-subject burden, public reconstruction, and late compulsory remedy at institutional scale.',
  'Loomis preserves a material fault line: COMPAS was present, but the official record does not establish that it determined the individual sentence.',
  'K.W. supplies an operated service-preserving counterfactual and prospective burden shift before further benefit reduction.',
  'SyRI supplies system-level judicial prohibition while leaving project-level consequence, deletion, and successor-system questions open.',
  'The new waterline is vertical: exact threshold, direct voice, evidence custody, consequence, remedy, counterfactual, and error-benefit reconciliation must converge within a bounded system.',
  'The cross-system monopoly proposition remains candidate-only until repeated rights-holder identity and complete vertical chains exist across core deployments.',
];

const sourceWaves = [
  { wave_id: waveOne.wave_id, path: 'data/intake/m04f-epistemic-jurisdiction-wave-01.json', records: waveOne.records.length },
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
  as_of: supplementalWaves.at(-1)?.as_of ?? core.as_of,
  source_waves: sourceWaves,
  counts,
  current_ceiling: {
    bounded_form: 'Multiple systems durably establish asymmetrical inference authority, evidence custody, burden, timing, remedy, and counterfactual access; the deepest claims remain bounded to named systems.',
    system_claim: 'retained_candidate_only',
    monopoly_on_unprovable: 'not_eligible_for_promotion',
    reason: 'The estate still lacks a complete cross-system denominator, common governance, repeated rights-holder identity, and vertical person-level causal chains in the core Palantir deployments.',
  },
  system_chains: systemChains,
  evidentiary_stratigraphy: {
    methodology_path: stratigraphyPath,
    counts: counts.by_stratigraphy,
    system_waterlines: systemVertical,
  },
  most_informative_results: results,
  next_sequence: fanout.lanes.map(lane => lane.lane_id),
  admission_rule: 'Canonical admission requires source-complete vertical chains for inference, threshold, evidence, direct voice, consequence, remedy, counterfactual, and error-benefit allocation in at least two systems.',
  boundaries: { ...core.boundaries, ...stratigraphy.boundaries },
};

const fingerprint = hash(sourceTexts.join('\n---\n'));
const report = {
  schema_version: 'm04f-epistemic-jurisdiction-report@3',
  report_id: 'M04F-EJ-REPORT-003',
  as_of: estate.as_of,
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
  fanout_source_files: fanoutPaths,
  stratigraphy,
  waterline: systemVertical,
  pattern_to_proof: core.pattern,
  boundaries: estate.boundaries,
};

writeJson('data/intake/m04f-epistemic-jurisdiction-wave-01.json', waveOne);
writeJson('data/project/m04f-epistemic-jurisdiction-estate.json', estate);
writeJson('build/core-thesis/epistemic-jurisdiction/manifest.json', {
  schema_version: 'm04f-epistemic-jurisdiction-build@3',
  estate_id: core.estate_id,
  as_of: estate.as_of,
  source_fingerprint: fingerprint,
  counts,
  source_files: sourceFiles,
  source_waves: sourceWaves,
  report_paths: [
    'reports/core-thesis/epistemic-jurisdiction/data.json',
    'reports/core-thesis/epistemic-jurisdiction/index.html',
  ],
  boundaries: estate.boundaries,
});
writeJson('build/core-thesis/epistemic-jurisdiction/test-matrix.json', {
  schema_version: 'm04f-epistemic-jurisdiction-test-matrix@3',
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
    strata: system.stratigraphy.strata,
    waterline_state: system.stratigraphy.waterline_state,
  })),
  boundaries: estate.boundaries,
});
writeJson('build/core-thesis/epistemic-jurisdiction/stratigraphy.json', {
  schema_version: 'm04f-evidentiary-stratigraphy-build@1',
  estate_id: core.estate_id,
  source_fingerprint: fingerprint,
  methodology: stratigraphy,
  counts: counts.by_stratigraphy,
  waterline_by_state: counts.waterline_by_state,
  systems: systemVertical,
  records: records.map(record => ({
    record_id: record.record_id,
    system_id: record.system_id,
    disposition: record.disposition,
    stratigraphy: record.stratigraphy,
  })),
  boundaries: estate.boundaries,
});
writeJson('reports/core-thesis/epistemic-jurisdiction/data.json', report);

const cards = systemChains.map(system =>
  `<article><h3>${esc(system.label)}</h3><p>${esc(system.scope)}</p><p><code>${system.record_ids.length} records</code></p><p><b>${esc(system.stratigraphy.waterline_state)}</b> · ${system.stratigraphy.join_count}/7 vertical joins</p><p>${Object.entries(system.stratigraphy.strata).map(([k,v])=>`${esc(k)}: ${v}`).join(' · ')}</p></article>`
).join('');
const rows = report.records.map(record =>
  `<tr><td><code>${esc(record.record_id)}</code></td><td>${esc(record.system.label)}</td><td>${esc(record.test_id)}</td><td>${esc(record.observation)}</td><td>${esc(record.classification.represented_voice_basis)}</td><td><code>${esc(record.disposition)}</code></td><td><b>${esc(record.stratigraphy.state_id)}</b><br>${esc(record.stratigraphy.durability_signals.join(' · '))}</td></tr>`
).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-04F epistemic jurisdiction</title><style>
body{font:16px/1.55 system-ui;max-width:1600px;margin:35px auto;padding:0 22px;background:#ece9df;color:#171717}article,.box{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px;padding:14px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}.metrics{display:flex;gap:12px;flex-wrap:wrap}.metric{min-width:130px}.metric b{display:block;font-size:1.7rem}.warn{border-left:5px solid #76251e;padding:14px;background:#fffdf7;margin:20px 0}.bedrock{border-left-color:#30343b}.fault{border-left-color:#a22722}table{border-collapse:collapse;width:100%;font-size:.76rem;background:#fffdf7}th,td{padding:7px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}thead th{position:sticky;top:0;background:#e5dfd1}.table-wrap{overflow:auto}
</style></head><body><p><b>M-04F · candidate cross-estate · ${counts.waves} waves</b></p><h1>${esc(core.title)}</h1><p>${esc(core.question)}</p><div class="warn"><b>Current ceiling:</b> ${esc(estate.current_ceiling.bounded_form)} Direct represented-person voice: <b>${counts.direct_represented_person_voice_records}</b>. Bedrock records: <b>${counts.bedrock_records}</b>. Fault lines: <b>${counts.fault_line_records}</b>.</div><div class="metrics"><div class="box metric"><b>${counts.systems}</b>systems</div><div class="box metric"><b>${counts.records}</b>records</div><div class="box metric"><b>${counts.sources}</b>sources</div><div class="box metric"><b>${counts.fanout_lanes}</b>lanes</div><div class="box metric"><b>${counts.by_disposition.supported_for_human_review ?? 0}</b>supported</div><div class="box metric"><b>${counts.by_disposition.requires_additional_acquisition ?? 0}</b>acquire next</div></div><h2>Waterline by bounded system</h2><div class="grid">${cards}</div><h2>Evidentiary stratigraphy</h2><div class="box">${stratigraphy.states.map(x=>`<p><b>${esc(x.state_id)}</b> — ${esc(x.meaning)}</p>`).join('')}</div><h2>Records</h2><div class="table-wrap"><table><thead><tr><th>ID</th><th>System</th><th>Test</th><th>Observation</th><th>Voice basis</th><th>Disposition</th><th>Stratum</th></tr></thead><tbody>${rows}</tbody></table></div><h2>Pattern-to-Proof</h2><p>Seed manuscript SHA-256: <code>${esc(core.pattern.seed_document.sha256)}</code>. The source PDF binary is not published by this protocol.</p><div class="warn"><code>bedrock_means_bounded_fact_not_total_theory · promotes_to: candidate_only · graph_effect: none · conclusion_generated: false · estate_completion_claimed: false</code></div></body></html>`;
write('reports/core-thesis/epistemic-jurisdiction/index.html', html);

console.log(`m04f build: ${records.length} records, ${systems.length} systems, ${sources.length} sources, ${fanout.lanes.length} lanes, ${counts.direct_represented_person_voice_records} direct subject voice, ${counts.bedrock_records} bedrock; ${fingerprint.slice(0, 12)}`);
