#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeWave05Manifest } from './build-k0-role-neutral-wave-05.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bannedQueryTerms = [
  'elon musk', 'jeff dean', 'patrick soon-shiong', 'robert f. kennedy', 'jeff bezos',
  'mark zuckerberg', 'christopher rufo', 'ron desantis', 'pete hegseth', 'donald trump',
  'paolo macchiarini', 'nancy olivieri', 'timnit gebru', 'google', 'karolinska', 'apotex'
];

export function validateWave05({
  root = defaultRoot,
  wavePath = 'data/research/k0-role-neutral-wave-05.json',
  neutralPath = 'data/research/k0-role-neutral-denominator.json'
} = {}) {
  const failures = [];
  const fail = message => failures.push(message);
  const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const wave = read(wavePath);
  const neutral = read(neutralPath);
  const manifest = read('data/project/k0-role-neutral-wave-05-release-manifest.json');
  const report = read('reports/core-thesis/answerable-power/k0-role-neutral-wave-05.json');

  if (wave.schema_version !== 'k0-role-neutral-wave@1' || wave.wave_id !== 'K0-W05') fail('wave identity drift');
  if (JSON.stringify(wave.query_template_ids) !== JSON.stringify(['K0-Q05'])) fail('query-template denominator drift');

  const expectedCounts = {
    query_executions: 4,
    raw_results_observed: 18,
    retained_records: 8,
    candidate_requires_field_audit: 2,
    positive_controls: 4,
    negative_controls: 1,
    coverage_controls: 1,
    counterpower_controls: 3,
    correction_controls: 1,
    requires_additional_acquisition: 0,
    included_events: 0,
    assigned_ccd_values: 0,
    publication_cleared: 0,
    graph_effects: 0,
    source_failures: 0
  };
  for (const [key, value] of Object.entries(expectedCounts)) if (wave.counts?.[key] !== value) fail(`count drift ${key}`);

  if (wave.query_executions.length !== 4) fail('query execution rows drift');
  for (const query of wave.query_executions) {
    if (query.query_id !== 'K0-Q05') fail(`${query.execution_id}: wrong query id`);
    if (query.selection_by_person_name !== false || query.selection_by_institution_name !== false) fail(`${query.execution_id}: target-first selection`);
    const lower = query.query_text.toLowerCase();
    for (const term of bannedQueryTerms) {
      const regex = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
      if (regex.test(lower)) fail(`${query.execution_id}: named target leaked into query (${term})`);
    }
  }

  if (wave.records.length !== 8 || wave.excluded_results.length !== 10) fail('record or exclusion denominator drift');
  const ids = new Set();
  const outcomes = {};
  for (const row of wave.records) {
    if (!row.record_id || ids.has(row.record_id)) fail(`duplicate record ${row.record_id}`);
    ids.add(row.record_id);
    outcomes[row.selection_outcome] = (outcomes[row.selection_outcome] || 0) + 1;
    if (!Array.isArray(row.source_packets) || row.source_packets.length < 1) fail(`${row.record_id}: source packet missing`);
    if (row.included_event !== false || row.ccd_chain_depth !== null) fail(`${row.record_id}: discovery promoted into event`);
    if (row.evidence_truth_determined !== false || row.independent_review_complete !== false) fail(`${row.record_id}: evidence or independence laundering`);
    if (row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: publication or graph boundary drift`);
  }
  if (outcomes.candidate_requires_field_audit !== 2 || outcomes.positive_counterpower_control !== 3 || outcomes.positive_correction_control !== 1 || outcomes.negative_control !== 1 || outcomes.coverage_control !== 1) fail('selection outcome denominator drift');

  const karolinska = wave.records.find(row => row.record_id === 'K0-W05-R001');
  const olivieri = wave.records.find(row => row.record_id === 'K0-W05-R002');
  if (karolinska?.selection_outcome !== 'candidate_requires_field_audit' || olivieri?.selection_outcome !== 'candidate_requires_field_audit') fail('candidate selection drift');
  const misconduct = wave.records.find(row => row.record_id === 'K0-W05-R003');
  if (misconduct?.control_kind !== 'merits_based_retraction_after_final_misconduct_finding') fail('misconduct negative control drift');
  const reversal = wave.records.find(row => row.record_id === 'K0-W05-R007');
  if (reversal?.selection_outcome !== 'positive_correction_control') fail('correction-control drift');

  if (wave.boundaries.query_hit_is_event !== false || wave.boundaries.retraction_proves_ceiling_conversion !== false || wave.boundaries.misconduct_finding_proves_epistemic_suppression !== false || wave.boundaries.later_vindication_proves_prior_knowledge !== false || wave.boundaries.policy_proves_observed_effectiveness !== false || wave.boundaries.graph_effect !== 'none') fail('wave boundaries drift');

  const executedWaveIds = neutral.execution?.executed_wave_ids || [];
  if (typeof neutral.status !== 'string' || !neutral.status.startsWith('execution_started_wave_')) fail('aggregate neutral status drift');
  if (!Number.isInteger(neutral.execution?.searches_executed) || neutral.execution.searches_executed < 20 || !Number.isInteger(neutral.execution?.query_templates_executed) || neutral.execution.query_templates_executed < 6 || !Number.isInteger(neutral.execution?.raw_results_observed) || neutral.execution.raw_results_observed < 86 || !Number.isInteger(neutral.execution?.returned_records) || neutral.execution.returned_records < 40) fail('aggregate execution count drift');
  if (JSON.stringify(executedWaveIds.slice(0, 5)) !== JSON.stringify(['K0-W01','K0-W02','K0-W03','K0-W04','K0-W05'])) fail('aggregate wave linkage drift');
  const waveState = neutral.discovery_waves.find(row => row.wave_id === 'K0-W05');
  if (!['discovery_complete_field_adjudication_pending','discovery_complete_field_adjudication_complete'].includes(waveState?.status)) fail('aggregate Wave 05 state drift');

  const expectedManifest = computeWave05Manifest();
  if (JSON.stringify(manifest) !== JSON.stringify(expectedManifest)) fail('exact-byte manifest drift');
  if (report.release_manifest.combined_sha256 !== manifest.combined_sha256) fail('report manifest hash drift');
  if (report.current_result.included_events !== 0 || report.current_result.assigned_ccd_values !== 0 || report.current_result.evidence_truth_determined !== false || report.current_result.independent_second_party_review_complete !== false || report.current_result.publication_status !== 'blocked' || report.current_result.graph_effect !== 'none') fail('report boundary drift');

  return { ok: failures.length === 0, failures };
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const result = validateWave05();
  if (!result.ok) {
    console.error(`K0 Wave 05 validation failed with ${result.failures.length} error(s):\n${result.failures.map(row => `- ${row}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log('validate-k0-role-neutral-wave-05: OK');
}
