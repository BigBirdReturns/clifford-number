#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeWave02Manifest } from './build-k0-role-neutral-wave-02.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bannedQueryTerms = [
  'elon musk', 'jeff dean', 'patrick soon-shiong', 'robert f. kennedy', 'jeff bezos',
  'mark zuckerberg', 'christopher rufo', 'ron desantis', 'pete hegseth', 'donald trump',
  'meta', 'tiktok', 'aliexpress', 'temu'
];

export function validateWave02({
  root = defaultRoot,
  wavePath = 'data/research/k0-role-neutral-wave-02.json'
} = {}) {
  const failures = [];
  const fail = message => failures.push(message);
  const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const wave = read(wavePath);
  const manifest = read('data/project/k0-role-neutral-wave-02-release-manifest.json');
  const report = read('reports/core-thesis/answerable-power/k0-role-neutral-wave-02.json');

  if (wave.schema_version !== 'k0-role-neutral-wave@1' || wave.wave_id !== 'K0-W02') fail('wave identity drift');
  if (JSON.stringify(wave.query_template_ids) !== JSON.stringify(['K0-Q04'])) fail('query-template denominator drift');
  const expectedCounts = {
    query_executions: 4,
    raw_results_observed: 15,
    retained_records: 7,
    candidate_requires_field_audit: 3,
    positive_controls: 2,
    coverage_controls: 1,
    requires_additional_acquisition: 1,
    preliminary_only_records: 2,
    final_noncompliance_records: 1,
    corrective_action_records: 2,
    included_events: 0,
    assigned_ccd_values: 0,
    publication_cleared: 0,
    graph_effects: 0,
    source_failures: 0
  };
  for (const [key, value] of Object.entries(expectedCounts)) if (wave.counts?.[key] !== value) fail(`count drift ${key}`);

  if (wave.query_executions.length !== 4) fail('query execution rows drift');
  for (const query of wave.query_executions) {
    if (query.query_id !== 'K0-Q04') fail(`${query.execution_id}: wrong query id`);
    if (query.selection_by_person_name !== false || query.selection_by_platform_name !== false) fail(`${query.execution_id}: target-first selection`);
    const lower = query.query_text.toLowerCase();
    for (const term of bannedQueryTerms) {
      const regex = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
      if (regex.test(lower)) fail(`${query.execution_id}: named target leaked into query (${term})`);
    }
  }

  if (wave.records.length !== 7 || wave.excluded_results.length !== 8) fail('record or exclusion denominator drift');
  const ids = new Set();
  const outcomes = {};
  for (const row of wave.records) {
    if (!row.record_id || ids.has(row.record_id)) fail(`duplicate record ${row.record_id}`);
    ids.add(row.record_id);
    outcomes[row.selection_outcome] = (outcomes[row.selection_outcome] || 0) + 1;
    if (!Array.isArray(row.source_packets) || row.source_packets.length < 1) fail(`${row.record_id}: source packet missing`);
    for (const source of row.source_packets) if (!source.url.startsWith('https://digital-strategy.ec.europa.eu/')) fail(`${row.record_id}: non-official source plane`);
    if (row.included_event !== false || row.ccd_chain_depth !== null) fail(`${row.record_id}: discovery promoted into event`);
    if (row.evidence_truth_determined !== false || row.independent_review_complete !== false) fail(`${row.record_id}: evidence or independence laundering`);
    if (row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: publication or graph boundary drift`);
  }
  if (outcomes.candidate_requires_field_audit !== 3 || outcomes.positive_counterpower_control !== 1 || outcomes.positive_correction_control !== 1 || outcomes.coverage_control !== 1 || outcomes.requires_additional_acquisition !== 1) fail('selection outcome denominator drift');

  const meta = wave.records.find(row => row.record_id === 'K0-W02-R004');
  const tiktok = wave.records.find(row => row.record_id === 'K0-W02-R005');
  if (meta?.lifecycle_state !== 'preliminary_findings_only' || tiktok?.lifecycle_state !== 'preliminary_findings_only') fail('preliminary finding promoted');
  const x = wave.records.find(row => row.record_id === 'K0-W02-R003');
  if (!x?.lifecycle_state?.includes('effectiveness_unobserved')) fail('X corrective effectiveness laundering');
  const ali = wave.records.find(row => row.record_id === 'K0-W02-R006');
  if (!ali?.lifecycle_state?.includes('effectiveness_unobserved')) fail('AliExpress commitment effectiveness laundering');
  if (wave.boundaries.query_hit_is_event !== false || wave.boundaries.preliminary_finding_is_final !== false || wave.boundaries.corrective_plan_proves_effectiveness !== false || wave.boundaries.graph_effect !== 'none') fail('wave boundaries drift');

  const expectedManifest = computeWave02Manifest();
  if (JSON.stringify(manifest) !== JSON.stringify(expectedManifest)) fail('exact-byte manifest drift');
  if (report.release_manifest.combined_sha256 !== manifest.combined_sha256) fail('report manifest hash drift');
  if (report.current_result.included_events !== 0 || report.current_result.assigned_ccd_values !== 0 || report.current_result.evidence_truth_determined !== false || report.current_result.independent_second_party_review_complete !== false || report.current_result.publication_status !== 'blocked' || report.current_result.graph_effect !== 'none') fail('report boundary drift');

  return { ok: failures.length === 0, failures };
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const result = validateWave02();
  if (!result.ok) {
    console.error(`K0 Wave 02 validation failed with ${result.failures.length} error(s):\n${result.failures.map(row => `- ${row}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log('validate-k0-role-neutral-wave-02: OK');
}
