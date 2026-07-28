#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowedOutcomes = new Set([
  'candidate_requires_field_audit',
  'positive_control',
  'negative_control',
  'requires_additional_acquisition'
]);

export function validateK0RoleNeutralWave01({
  root = defaultRoot,
  wavePath = 'data/research/k0-role-neutral-wave-01.json',
  neutralPath = 'data/research/k0-role-neutral-denominator.json'
} = {}) {
  const failures = [];
  const fail = message => failures.push(message);
  const read = rel => JSON.parse(fs.readFileSync(path.resolve(root, rel), 'utf8'));
  const wave = read(wavePath);
  const neutral = read(neutralPath);
  const seeds = read('data/intake/k0-ceiling-conversion-seed-events.json');

  if (wave.schema_version !== 'k0-role-neutral-wave@1' || wave.wave_id !== 'K0-W01') fail('wave identity drift');
  if (wave.status !== 'name_blind_official_oversight_discovery_complete_field_adjudication_pending') fail('wave status drift');
  if (wave.source_plane?.provider_result_order_reproducible !== false) fail('search ranking reproducibility laundering');
  if (wave.source_plane?.query_text_and_retained_urls_frozen !== true) fail('query/url freeze missing');
  if (wave.query_executions?.length !== 4) fail('query execution denominator drift');
  if (wave.records?.length !== 10 || wave.excluded_results?.length !== 8) fail('return denominator drift');

  const seedNames = new Set(seeds.events.map(row => row.seed_person.toLowerCase()));
  const frozenQueries = new Map(neutral.search_battery.map(row => [row.query_id, row.template]));
  const queryIds = new Set();
  for (const execution of wave.query_executions || []) {
    queryIds.add(execution.query_id);
    if (!['K0-Q01', 'K0-Q03'].includes(execution.query_id)) fail(`${execution.execution_id}: unexpected frozen query`);
    if (!frozenQueries.has(execution.query_id)) fail(`${execution.execution_id}: query is not in frozen battery`);
    if (execution.selection_by_person_name !== false) fail(`${execution.execution_id}: person-name selection flag`);
    const q = String(execution.query_text || '').toLowerCase();
    for (const name of seedNames) if (q.includes(name)) fail(`${execution.execution_id}: seed person leaked into query`);
    if (!/^site:(osc\.gov|oversight\.gov)/.test(execution.query_text)) fail(`${execution.execution_id}: official domain filter missing`);
  }
  if (queryIds.size !== 2) fail('frozen query-template count drift');

  const ids = new Set();
  const urls = new Set();
  const outcomeCounts = {};
  for (const row of wave.records || []) {
    if (!row.record_id || ids.has(row.record_id)) fail(`duplicate or missing record ${row.record_id}`);
    ids.add(row.record_id);
    if (!allowedOutcomes.has(row.selection_outcome)) fail(`${row.record_id}: invalid outcome`);
    outcomeCounts[row.selection_outcome] = (outcomeCounts[row.selection_outcome] || 0) + 1;
    if (!/^https:\/\/(www\.)?(osc\.gov|oversight\.gov)\//.test(row.source_url)) fail(`${row.record_id}: nonofficial source`);
    if (urls.has(row.source_url)) fail(`${row.record_id}: duplicate source URL`);
    urls.add(row.source_url);
    if (row.graph_effect !== 'none' || row.included_event !== false) fail(`${row.record_id}: graph/event promotion`);
    if (row.evidence_truth_determined !== false || row.publication_status !== 'blocked') fail(`${row.record_id}: truth/publication laundering`);
    if (row.ccd_chain_depth !== null) fail(`${row.record_id}: discovery record assigned CCD`);
    if (!Array.isArray(row.source_does_not_establish) || row.source_does_not_establish.length < 2) fail(`${row.record_id}: source limits missing`);
    if (row.selection_outcome === 'candidate_requires_field_audit' && row.qualification_basis_status !== 'source_explicit') fail(`${row.record_id}: candidate lacks explicit qualification basis`);
    if (['positive_control','negative_control'].includes(row.selection_outcome) && !row.control_id) fail(`${row.record_id}: control ID missing`);
    if (row.selection_outcome === 'requires_additional_acquisition' && row.field_audit_status !== 'requires_additional_acquisition') fail(`${row.record_id}: acquisition state mismatch`);
  }

  const expected = {
    candidate_requires_field_audit: 5,
    positive_control: 1,
    negative_control: 2,
    requires_additional_acquisition: 2
  };
  for (const [key, count] of Object.entries(expected)) if ((outcomeCounts[key] || 0) !== count) fail(`${key}: expected ${count}, got ${outcomeCounts[key] || 0}`);

  const excludedIds = new Set();
  for (const row of wave.excluded_results || []) {
    if (!row.result_id || excludedIds.has(row.result_id)) fail(`duplicate excluded result ${row.result_id}`);
    excludedIds.add(row.result_id);
    if (!row.reason || row.reason.length < 20) fail(`${row.result_id}: weak exclusion reason`);
    if (urls.has(row.source_url)) fail(`${row.result_id}: retained/excluded URL overlap`);
  }

  const counts = wave.counts || {};
  if (counts.query_executions !== 4 || counts.raw_results_observed !== 18 || counts.retained_records !== 10) fail('wave count drift');
  if (counts.candidate_requires_field_audit !== 5 || counts.positive_controls !== 1 || counts.negative_controls !== 2 || counts.requires_additional_acquisition !== 2) fail('wave disposition count drift');
  if (counts.included_events !== 0 || counts.source_failures !== 0) fail('event/source-failure boundary drift');
  if (counts.raw_results_observed !== wave.records.length + wave.excluded_results.length) fail('raw result reconciliation drift');

  if (wave.boundaries?.name_blind_discovery_executed !== true || wave.boundaries?.full_search_battery_executed !== false) fail('execution boundary drift');
  if (wave.boundaries?.query_hit_is_event !== false || wave.boundaries?.publication_cleared !== false || wave.boundaries?.graph_effect !== 'none') fail('promotion boundary drift');

  // W01 validates its frozen slice inside an append-only aggregate. Later waves may
  // increase aggregate totals but may not erase, undercount, or relabel W01.
  const execution = neutral.execution || {};
  if (!String(neutral.status || '').startsWith('execution_started_wave_')) fail('neutral status drift');
  if (execution.name_blind_execution_started !== true || execution.searches_executed < 4 || execution.raw_results_observed < 18 || execution.returned_records < 10) fail('neutral execution count drift');
  if (execution.candidate_records < 5 || execution.positive_controls < 1 || execution.negative_controls < 2 || execution.requires_additional_acquisition < 2) fail('neutral classification count drift');
  if (execution.included_events !== 0 || execution.independent_second_party_review_complete !== false) fail('neutral promotion/independence drift');
  if (!Array.isArray(execution.executed_wave_ids) || !execution.executed_wave_ids.includes('K0-W01')) fail('neutral W01 linkage drift');
  const waveLink = neutral.discovery_waves?.find(row => row.wave_id === 'K0-W01');
  if (!waveLink || waveLink.path !== 'data/research/k0-role-neutral-wave-01.json' || waveLink.graph_effect !== 'none') fail('neutral W01 discovery-row drift');

  return { ok: failures.length === 0, failures };
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const result = validateK0RoleNeutralWave01();
  if (!result.ok) {
    console.error(`K0 role-neutral wave 01 validation failed with ${result.failures.length} error(s):\n${result.failures.map(row => `- ${row}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log('validate-k0-role-neutral-wave-01: OK');
}
