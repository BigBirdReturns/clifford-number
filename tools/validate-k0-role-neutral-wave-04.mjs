#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeWave04Manifest } from './build-k0-role-neutral-wave-04.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bannedQueryTerms = [
  'elon musk', 'jeff dean', 'patrick soon-shiong', 'robert f. kennedy', 'jeff bezos',
  'mark zuckerberg', 'christopher rufo', 'ron desantis', 'pete hegseth', 'donald trump',
  'acip', 'sab', 'casac', 'sachrp', 'sacc', 'fda', 'isac'
];

export function validateWave04({
  root = defaultRoot,
  wavePath = 'data/research/k0-role-neutral-wave-04.json',
  neutralPath = 'data/research/k0-role-neutral-denominator.json'
} = {}) {
  const failures = [];
  const fail = message => failures.push(message);
  const read = rel => JSON.parse(fs.readFileSync(path.resolve(root, rel), 'utf8'));
  const wave = read(wavePath);
  const neutral = read(neutralPath);
  const manifest = read('data/project/k0-role-neutral-wave-04-release-manifest.json');
  const report = read('reports/core-thesis/answerable-power/k0-role-neutral-wave-04.json');

  if (wave.schema_version !== 'k0-role-neutral-wave@1' || wave.wave_id !== 'K0-W04') fail('wave identity drift');
  if (JSON.stringify(wave.query_template_ids) !== JSON.stringify(['K0-Q08'])) fail('query-template denominator drift');
  const expectedCounts = {
    query_executions: 4,
    raw_results_observed: 20,
    retained_records: 8,
    candidate_requires_field_audit: 3,
    positive_controls: 2,
    negative_controls: 2,
    coverage_controls: 1,
    seed_overlap_controls: 1,
    requires_additional_acquisition: 0,
    included_events: 0,
    assigned_ccd_values: 0,
    publication_cleared: 0,
    graph_effects: 0,
    source_failures: 0
  };
  for (const [key, value] of Object.entries(expectedCounts)) if (wave.counts?.[key] !== value) fail(`count drift ${key}`);

  if (wave.query_executions?.length !== 4) fail('query execution rows drift');
  for (const query of wave.query_executions || []) {
    if (query.query_id !== 'K0-Q08') fail(`${query.execution_id}: wrong query id`);
    if (query.selection_by_person_name !== false || query.selection_by_committee_name !== false) fail(`${query.execution_id}: target-first selection`);
    const lower = query.query_text.toLowerCase();
    for (const term of bannedQueryTerms) {
      const regex = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
      if (regex.test(lower)) fail(`${query.execution_id}: named target leaked into query (${term})`);
    }
  }

  if (wave.records?.length !== 8 || wave.excluded_results?.length !== 12) fail('record or exclusion denominator drift');
  const ids = new Set();
  const urls = new Set();
  const outcomes = {};
  for (const row of wave.records || []) {
    if (!row.record_id || ids.has(row.record_id)) fail(`duplicate record ${row.record_id}`);
    ids.add(row.record_id);
    outcomes[row.selection_outcome] = (outcomes[row.selection_outcome] || 0) + 1;
    if (!Array.isArray(row.source_packets) || row.source_packets.length < 1) fail(`${row.record_id}: source packet missing`);
    for (const source of row.source_packets) {
      if (!/^https:\/\/(www\.)?(hhs\.gov|cdc\.gov|epa\.gov|gao\.gov|gov\.uk)\//.test(source.url) && !source.url.startsWith('https://19january2021snapshot.epa.gov/')) fail(`${row.record_id}: non-official source plane`);
      if (urls.has(source.url) && row.record_id !== 'K0-W04-R004') fail(`${row.record_id}: duplicate retained source URL`);
      urls.add(source.url);
    }
    if (row.included_event !== false || row.ccd_chain_depth !== null) fail(`${row.record_id}: discovery promoted into event`);
    if (row.evidence_truth_determined !== false || row.independent_review_complete !== false) fail(`${row.record_id}: evidence or independence laundering`);
    if (row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: publication or graph boundary drift`);
    if (!Array.isArray(row.source_does_not_establish) || row.source_does_not_establish.length < 3) fail(`${row.record_id}: source limits missing`);
  }
  if (outcomes.candidate_requires_field_audit !== 3 || outcomes.positive_counterpower_control !== 2 || outcomes.negative_control !== 2 || outcomes.coverage_control !== 1) fail('selection outcome denominator drift');

  const overlap = wave.records.find(row => row.record_id === 'K0-W04-R001');
  if (overlap?.selection_outcome !== 'coverage_control' || overlap?.control_kind !== 'seed_fixture_overlap_deduplication') fail('seed-overlap control drift');
  const termination = wave.records.find(row => row.record_id === 'K0-W04-R005');
  if (termination?.selection_outcome !== 'negative_control' || termination?.control_kind !== 'committee_termination_without_documented_capture_predicate') fail('termination control drift');
  if (wave.boundaries?.query_hit_is_event !== false || wave.boundaries?.committee_reset_proves_capture !== false || wave.boundaries?.conflict_claim_proves_member_specific_conflict !== false || wave.boundaries?.seed_fixture_recovery_creates_second_event !== false || wave.boundaries?.graph_effect !== 'none') fail('wave boundaries drift');

  const executedWaveIds = neutral.execution?.executed_wave_ids || [];
  if (typeof neutral.status !== 'string' || !neutral.status.startsWith('execution_started_wave_')) fail('neutral status drift');
  if (!Number.isInteger(neutral.execution?.searches_executed) || neutral.execution.searches_executed < 16 || !Number.isInteger(neutral.execution?.query_templates_executed) || neutral.execution.query_templates_executed < 5 || !Number.isInteger(neutral.execution?.raw_results_observed) || neutral.execution.raw_results_observed < 68 || !Number.isInteger(neutral.execution?.returned_records) || neutral.execution.returned_records < 32) fail('aggregate execution count drift');
  if (JSON.stringify(executedWaveIds.slice(0, 4)) !== JSON.stringify(['K0-W01','K0-W02','K0-W03','K0-W04'])) fail('aggregate wave linkage drift');
  const w03 = neutral.discovery_waves?.find(row => row.wave_id === 'K0-W03');
  const w04 = neutral.discovery_waves?.find(row => row.wave_id === 'K0-W04');
  if (w03?.status !== 'discovery_complete_field_adjudication_complete') fail('Wave 03 reconciliation drift');
  if (!['discovery_complete_field_adjudication_pending','discovery_complete_field_adjudication_complete'].includes(w04?.status)) fail('Wave 04 discovery state drift');

  const expectedManifest = computeWave04Manifest();
  if (JSON.stringify(manifest) !== JSON.stringify(expectedManifest)) fail('exact-byte manifest drift');
  if (report.release_manifest?.combined_sha256 !== manifest.combined_sha256) fail('report manifest hash drift');
  if (report.current_result?.included_events !== 0 || report.current_result?.assigned_ccd_values !== 0 || report.current_result?.evidence_truth_determined !== false || report.current_result?.independent_second_party_review_complete !== false || report.current_result?.publication_status !== 'blocked' || report.current_result?.graph_effect !== 'none') fail('report boundary drift');

  return { ok: failures.length === 0, failures };
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const result = validateWave04();
  if (!result.ok) {
    console.error(`K0 Wave 04 validation failed with ${result.failures.length} error(s):\n${result.failures.map(row => `- ${row}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log('validate-k0-role-neutral-wave-04: OK');
}
