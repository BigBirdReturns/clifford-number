#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeWave06Manifest } from './build-k0-role-neutral-wave-06.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bannedQueryTerms = [
  'elon musk', 'jeff dean', 'patrick soon-shiong', 'robert f. kennedy', 'jeff bezos',
  'mark zuckerberg', 'christopher rufo', 'ron desantis', 'pete hegseth', 'donald trump',
  'neil jacobs', 'kathy bell', 'fbi technician', 'fbi analyst', 'u.s. marshals service'
];

export function validateWave06({
  root = defaultRoot,
  wavePath = 'data/research/k0-role-neutral-wave-06.json',
  neutralPath = 'data/research/k0-role-neutral-denominator.json'
} = {}) {
  const failures = [];
  const fail = message => failures.push(message);
  const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const wave = read(wavePath);
  const neutral = read(neutralPath);
  const manifest = read('data/project/k0-role-neutral-wave-06-release-manifest.json');
  const report = read('reports/core-thesis/answerable-power/k0-role-neutral-wave-06.json');

  if (wave.schema_version !== 'k0-role-neutral-wave@1' || wave.wave_id !== 'K0-W06') fail('wave identity drift');
  if (JSON.stringify(wave.query_template_ids) !== JSON.stringify(['K0-Q07'])) fail('query-template denominator drift');

  const expectedCounts = {
    query_executions: 8,
    raw_results_observed: 41,
    retained_records: 8,
    candidate_requires_field_audit: 3,
    positive_controls: 2,
    negative_controls: 2,
    coverage_controls: 1,
    counterpower_controls: 2,
    requires_additional_acquisition: 0,
    included_events: 0,
    assigned_ccd_values: 0,
    publication_cleared: 0,
    graph_effects: 0,
    source_failures: 0
  };
  for (const [key, value] of Object.entries(expectedCounts)) if (wave.counts?.[key] !== value) fail(`count drift ${key}`);

  if (wave.query_executions?.length !== 8 || wave.query_executions.reduce((sum, row) => sum + row.raw_results_observed, 0) !== 41) fail('query execution denominator drift');
  for (const query of wave.query_executions || []) {
    if (query.query_id !== 'K0-Q07') fail(`${query.execution_id}: wrong query id`);
    if (query.selection_by_person_name !== false || query.selection_by_institution_name !== false) fail(`${query.execution_id}: target-first selection`);
    const lower = query.query_text.toLowerCase();
    for (const term of bannedQueryTerms) {
      const regex = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
      if (regex.test(lower)) fail(`${query.execution_id}: named target leaked into query (${term})`);
    }
  }

  if (wave.records?.length !== 8 || wave.excluded_results?.length !== 33) fail('record or exclusion denominator drift');
  const ids = new Set();
  const outcomes = {};
  for (const row of wave.records || []) {
    if (!row.record_id || ids.has(row.record_id)) fail(`duplicate record ${row.record_id}`);
    ids.add(row.record_id);
    outcomes[row.selection_outcome] = (outcomes[row.selection_outcome] || 0) + 1;
    if (!Array.isArray(row.source_packets) || row.source_packets.length < 1) fail(`${row.record_id}: source packet missing`);
    if (!Array.isArray(row.source_does_not_establish) || row.source_does_not_establish.length < 3) fail(`${row.record_id}: source limits missing`);
    if (row.included_event !== false || row.ccd_chain_depth !== null) fail(`${row.record_id}: discovery promoted into event`);
    if (row.evidence_truth_determined !== false || row.independent_review_complete !== false) fail(`${row.record_id}: evidence or independence laundering`);
    if (row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: publication or graph boundary drift`);
  }
  if (outcomes.candidate_requires_field_audit !== 3 || outcomes.positive_counterpower_control !== 2 || outcomes.negative_control !== 2 || outcomes.coverage_control !== 1) fail('selection outcome denominator drift');

  const technician = wave.records.find(row => row.record_id === 'K0-W06-R001');
  const analyst = wave.records.find(row => row.record_id === 'K0-W06-R002');
  const jacobs = wave.records.find(row => row.record_id === 'K0-W06-R003');
  if ([technician, analyst, jacobs].some(row => row?.selection_outcome !== 'candidate_requires_field_audit')) fail('candidate selection drift');
  const bell = wave.records.find(row => row.record_id === 'K0-W06-R004');
  if (bell?.control_kind !== 'reclassification_without_documented_adverse_personnel_action') fail('material-consequence coverage control drift');
  const policy = wave.records.find(row => row.record_id === 'K0-W06-R005');
  if (policy?.control_kind !== 'policy_violation_without_substantiated_bounded_reprisal') fail('policy non-link control drift');
  const discipline = wave.records.find(row => row.record_id === 'K0-W06-R006');
  if (discipline?.control_kind !== 'lawful_discipline_requires_proof_of_authorized_order_and_willful_refusal') fail('lawful-discipline control drift');
  const stay = wave.records.find(row => row.record_id === 'K0-W06-R007');
  if (stay?.control_kind !== 'independent_pre_action_stay_and_corrective_complaint') fail('stay control drift');

  if (wave.boundaries?.query_hit_is_event !== false || wave.boundaries?.professional_disagreement_proves_reclassification !== false || wave.boundaries?.chain_of_command_violation_proves_reprisal !== false || wave.boundaries?.reprisal_finding_proves_complete_k0_chain !== false || wave.boundaries?.roadblock_label_proves_illegitimate_legal_advice !== false || wave.boundaries?.lawful_discipline_is_ceiling_conversion !== false || wave.boundaries?.policy_violation_proves_bounded_event !== false || wave.boundaries?.stay_proves_final_merits !== false || wave.boundaries?.graph_effect !== 'none') fail('wave boundaries drift');

  const executedWaveIds = neutral.execution?.executed_wave_ids || [];
  const wave06Prefix = ['K0-W01','K0-W02','K0-W03','K0-W04','K0-W05','K0-W06'];
  if (typeof neutral.status !== 'string' || !neutral.status.startsWith('execution_started_wave_')) fail('aggregate neutral status drift');
  if (JSON.stringify(executedWaveIds.slice(0, 6)) !== JSON.stringify(wave06Prefix)) fail('aggregate wave linkage drift');
  if (executedWaveIds.length === 6) {
    if (neutral.execution?.searches_executed !== 28 || neutral.execution?.query_templates_executed !== 7 || neutral.execution?.raw_results_observed !== 127 || neutral.execution?.returned_records !== 48) fail('aggregate execution count drift');
  } else if (neutral.execution?.searches_executed < 28 || neutral.execution?.query_templates_executed < 7 || neutral.execution?.raw_results_observed < 127 || neutral.execution?.returned_records < 48) fail('aggregate append-only execution count drift');
  const waveState = neutral.discovery_waves.find(row => row.wave_id === 'K0-W06');
  if (waveState?.status !== 'discovery_complete_field_adjudication_complete') fail('aggregate Wave 06 state drift');

  const expectedManifest = computeWave06Manifest();
  if (JSON.stringify(manifest) !== JSON.stringify(expectedManifest)) fail('exact-byte manifest drift');
  if (report.release_manifest?.combined_sha256 !== manifest.combined_sha256) fail('report manifest hash drift');
  if (report.current_result?.included_events !== 0 || report.current_result?.assigned_ccd_values !== 0 || report.current_result?.evidence_truth_determined !== false || report.current_result?.independent_second_party_review_complete !== false || report.current_result?.publication_status !== 'blocked' || report.current_result?.graph_effect !== 'none') fail('report boundary drift');

  return { ok: failures.length === 0, failures };
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const result = validateWave06();
  if (!result.ok) {
    console.error(`K0 Wave 06 validation failed with ${result.failures.length} error(s):\n${result.failures.map(row => `- ${row}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log('validate-k0-role-neutral-wave-06: OK');
}
