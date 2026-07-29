#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeWave07Manifest } from './build-k0-role-neutral-wave-07.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bannedQueryTerms = [
  'elon musk', 'jeff dean', 'patrick soon-shiong', 'robert f. kennedy', 'jeff bezos',
  'mark zuckerberg', 'christopher rufo', 'ron desantis', 'pete hegseth', 'donald trump',
  'ryan honl', 'timnit gebru', 'mariel garza', 'eve e.'
];

export function validateWave07({
  root = defaultRoot,
  wavePath = 'data/research/k0-role-neutral-wave-07.json',
  neutralPath = 'data/research/k0-role-neutral-denominator.json'
} = {}) {
  const failures = [];
  const fail = message => failures.push(message);
  const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const wave = read(wavePath);
  const neutral = read(neutralPath);
  const coverage = read('data/research/corpus-coverage.json');
  const reviews = read('data/research/selection-adversarial-reviews.json');
  const manifest = read('data/project/k0-role-neutral-wave-07-release-manifest.json');
  const report = read('reports/core-thesis/answerable-power/k0-role-neutral-wave-07.json');

  if (wave.schema_version !== 'k0-role-neutral-wave@1' || wave.wave_id !== 'K0-W07') fail('wave identity drift');
  if (JSON.stringify(wave.query_template_ids) !== JSON.stringify(['K0-Q09'])) fail('query-template denominator drift');

  const expectedCounts = {
    query_executions: 16,
    raw_results_observed: 79,
    retained_records: 9,
    candidate_requires_field_audit: 3,
    positive_controls: 2,
    negative_controls: 2,
    coverage_controls: 2,
    counterpower_controls: 2,
    requires_additional_acquisition: 0,
    included_events: 0,
    assigned_ccd_values: 0,
    publication_cleared: 0,
    graph_effects: 0,
    source_failures: 0
  };
  for (const [key, value] of Object.entries(expectedCounts)) if (wave.counts?.[key] !== value) fail(`count drift ${key}`);

  if (wave.query_executions?.length !== 16 || wave.query_executions.reduce((sum, row) => sum + row.raw_results_observed, 0) !== 79 || wave.query_executions.reduce((sum, row) => sum + row.retained_unique_records, 0) !== 9) fail('query execution denominator drift');
  for (const query of wave.query_executions || []) {
    if (query.query_id !== 'K0-Q09') fail(`${query.execution_id}: wrong query id`);
    if (query.selection_by_person_name !== false || query.selection_by_institution_name !== false) fail(`${query.execution_id}: target-first selection`);
    const lower = query.query_text.toLowerCase();
    for (const term of bannedQueryTerms) {
      const regex = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
      if (regex.test(lower)) fail(`${query.execution_id}: named target leaked into query (${term})`);
    }
  }

  if (wave.excluded_result_summaries?.length !== 16) fail('exclusion summary denominator drift');
  const excludedCount = (wave.excluded_result_summaries || []).reduce((sum, row) => sum + row.excluded_after_deduplication, 0);
  if (excludedCount !== 70) fail(`excluded result count drift ${excludedCount}`);

  if (wave.records?.length !== 9) fail('record denominator drift');
  const ids = new Set();
  const outcomes = {};
  for (const row of wave.records || []) {
    if (!row.record_id || ids.has(row.record_id)) fail(`duplicate record ${row.record_id}`);
    ids.add(row.record_id);
    outcomes[row.selection_outcome] = (outcomes[row.selection_outcome] || 0) + 1;
    if (!Array.isArray(row.source_packets) || row.source_packets.length < 1) fail(`${row.record_id}: source packet missing`);
    if (!Array.isArray(row.source_does_not_establish) || row.source_does_not_establish.length < 3) fail(`${row.record_id}: source limits missing`);
    if (row.field_audit_status !== 'pending') fail(`${row.record_id}: field state drift`);
    if (row.included_event !== false || row.ccd_chain_depth !== null) fail(`${row.record_id}: discovery promoted into event`);
    if (row.evidence_truth_determined !== false || row.independent_review_complete !== false) fail(`${row.record_id}: evidence or independence laundering`);
    if (row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: publication or graph boundary drift`);
  }
  if (outcomes.candidate_requires_field_audit !== 3 || outcomes.positive_counterpower_control !== 2 || outcomes.negative_control !== 2 || outcomes.coverage_control !== 2) fail('selection outcome denominator drift');

  const honl = wave.records.find(row => row.record_id === 'K0-W07-R001');
  const constructive = wave.records.find(row => row.record_id === 'K0-W07-R002');
  const transfer = wave.records.find(row => row.record_id === 'K0-W07-R003');
  if ([honl, constructive, transfer].some(row => row?.selection_outcome !== 'candidate_requires_field_audit')) fail('candidate selection drift');
  if (wave.records.find(row => row.record_id === 'K0-W07-R004')?.control_kind !== 'independent_constructive_discharge_correction_standard') fail('constructive-discharge control drift');
  if (wave.records.find(row => row.record_id === 'K0-W07-R005')?.control_kind !== 'independent_personnel_appeal_and_record_review') fail('appeal control drift');
  if (wave.records.find(row => row.record_id === 'K0-W07-R006')?.control_kind !== 'genuine_or_merit_grounded_resignation_comparator') fail('misconduct resignation control drift');
  if (wave.records.find(row => row.record_id === 'K0-W07-R007')?.control_kind !== 'admitted_misconduct_and_negotiated_resignation_control') fail('settled resignation control drift');
  for (const id of ['K0-W07-R008','K0-W07-R009']) if (wave.records.find(row => row.record_id === id)?.control_kind !== 'seed_overlap_deduplication_control') fail(`${id}: seed-overlap control drift`);

  const b = wave.boundaries || {};
  if (b.query_hit_is_event !== false || b.blocked_action_proves_authorship_transfer !== false || b.accepted_resignation_proves_voluntary_departure !== false || b.constructive_discharge_finding_proves_complete_k0_chain !== false || b.ownership_decision_proves_comprehension_failure !== false || b.court_allegation_proves_merits !== false || b.staff_disagreement_proves_qualified_contradiction !== false || b.seed_overlap_creates_second_event !== false || b.genuine_resignation_is_ceiling_conversion !== false || b.same_explanation_form_proves_coordination !== false || b.maintainer_retention_proves_independent_review !== false || b.graph_effect !== 'none') fail('wave boundaries drift');

  const executedWaveIds = neutral.execution?.executed_wave_ids || [];
  if (neutral.status !== 'execution_started_wave_07_field_pending' || neutral.execution?.searches_executed !== 44 || neutral.execution?.query_templates_executed !== 8 || neutral.execution?.raw_results_observed !== 206 || neutral.execution?.returned_records !== 57 || neutral.execution?.candidate_records !== 24 || neutral.execution?.positive_controls !== 13 || neutral.execution?.negative_controls !== 10 || neutral.execution?.coverage_controls !== 7 || neutral.execution?.included_events !== 0 || neutral.execution?.non_events !== 30) fail('aggregate execution count drift');
  if (JSON.stringify(executedWaveIds) !== JSON.stringify(['K0-W01','K0-W02','K0-W03','K0-W04','K0-W05','K0-W06','K0-W07'])) fail('aggregate wave linkage drift');
  const waveState = neutral.discovery_waves.find(row => row.wave_id === 'K0-W07');
  if (waveState?.status !== 'discovery_complete_field_adjudication_pending' || waveState?.path !== 'data/research/k0-role-neutral-wave-07.json') fail('aggregate Wave 07 state drift');

  const coverageRow = coverage.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
  const pendingMetric = coverageRow?.metrics?.find(row => row.metric_id === 'candidate_records_pending_field_audit');
  const gap = coverageRow?.known_gaps?.find(row => row.gap_id === 'k0-wave07-field-adjudication-open');
  if (pendingMetric?.observed !== 3 || pendingMetric?.source !== 'data/research/k0-role-neutral-wave-07.json') fail('Wave 07 coverage metric drift');
  if (gap?.status !== 'open') fail('Wave 07 coverage gap drift');
  const review = reviews.reviews.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
  const comparator = review?.comparator_tests?.find(row => row.test_id === 'authorship-transfer-resignation-and-correction-controls');
  if (comparator?.status !== 'discovery_complete_field_pending' || !comparator?.blocking_conditions?.some(value => /(?:field|stage) adjudication/i.test(value))) fail('authorship-transfer comparator drift');

  const expectedManifest = computeWave07Manifest();
  if (JSON.stringify(manifest) !== JSON.stringify(expectedManifest)) fail('exact-byte manifest drift');
  if (report.schema_version !== 'k0-role-neutral-wave-07-report@1' || report.release_manifest?.combined_sha256 !== manifest.combined_sha256) fail('report or manifest hash drift');
  if (report.counts?.retained_records !== 9 || report.counts?.candidate_requires_field_audit !== 3 || report.current_result?.field_adjudication_complete !== false || report.current_result?.included_events !== 0 || report.current_result?.assigned_ccd_values !== 0 || report.current_result?.evidence_truth_determined !== false || report.current_result?.independent_second_party_review_complete !== false || report.current_result?.publication_status !== 'blocked' || report.current_result?.graph_effect !== 'none') fail('report boundary drift');

  return { ok: failures.length === 0, failures };
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const result = validateWave07();
  if (!result.ok) {
    console.error(`K0 Wave 07 validation failed with ${result.failures.length} error(s):\n${result.failures.map(row => `- ${row}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log('validate-k0-role-neutral-wave-07: OK');
}
