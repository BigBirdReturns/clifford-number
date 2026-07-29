#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeWave07FieldManifest } from './build-k0-wave07-field-adjudication.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stageOrder = [
  'governing_claim','qualified_contradiction','knower_reclassification','explanation_mutation',
  'institutional_gate_action','material_consequence','feedback_source_removed','correction_substitution_or_exit_blocked'
];
const computeChain = row => {
  if (!Array.isArray(row.stage_assessments)) return null;
  let depth = null;
  for (let index = 0; index < stageOrder.length; index++) {
    const stage = row.stage_assessments.find(item => item.stage === index && item.field === stageOrder[index]);
    if (!stage || stage.status !== 'documented') break;
    depth = index;
  }
  return depth;
};
const computeFurthest = row => {
  if (!Array.isArray(row.stage_assessments)) return null;
  let depth = null;
  for (const stage of row.stage_assessments) if (stage.status === 'documented') depth = Math.max(depth ?? -1, stage.stage);
  return depth;
};

export function validateWave07Field({
  root = defaultRoot,
  auditPath = 'data/research/k0-wave07-field-adjudication.json',
  neutralPath = 'data/research/k0-role-neutral-denominator.json',
  coveragePath = 'data/research/corpus-coverage.json',
  reviewsPath = 'data/research/selection-adversarial-reviews.json'
} = {}) {
  const failures = [];
  const fail = message => failures.push(message);
  const read = rel => JSON.parse(fs.readFileSync(path.resolve(root, rel), 'utf8'));
  const audit = read(auditPath);
  const wave = read('data/research/k0-role-neutral-wave-07.json');
  const neutral = read(neutralPath);
  const coverage = read(coveragePath);
  const reviews = read(reviewsPath);
  const manifest = read('data/project/k0-wave07-field-adjudication-release-manifest.json');
  const report = read('reports/core-thesis/answerable-power/k0-wave07-field-adjudication.json');

  if (audit.schema_version !== 'k0-wave07-field-adjudication@1' || audit.audit_id !== 'K0-W07-FIELD-2026-07-29-MAINTAINER') fail('audit identity drift');
  if (audit.source_wave_id !== 'K0-W07' || audit.independence_effect !== 'does_not_satisfy_second_party_review') fail('source/independence drift');
  if (JSON.stringify(audit.method?.stage_order) !== JSON.stringify(stageOrder)) fail('stage denominator drift');
  if (audit.method?.authorship_rule?.includes('does not establish knower reclassification') !== true || audit.method?.constructive_discharge_rule?.includes('without establishing') !== true) fail('authorship/constructive-discharge boundary missing');
  if (audit.rows?.length !== 9 || wave.records?.length !== 9) fail('record denominator drift');

  const expectedCounts = {
    retained_records_reviewed: 9,
    stage_adjudicated_records: 3,
    control_records_reviewed: 6,
    supported_for_human_review: 0,
    bounded_non_link: 2,
    retained_candidate_only: 1,
    requires_additional_acquisition: 0,
    negative_controls: 2,
    counterpower_controls: 2,
    coverage_controls: 2,
    provisional_chain_depth_null: 2,
    provisional_chain_depth_1: 1,
    included_events: 0,
    publication_cleared: 0,
    graph_effects: 0,
    public_source_pages_used: 12
  };
  for (const [key, value] of Object.entries(expectedCounts)) if (audit.counts?.[key] !== value) fail(`${key}: expected ${value}, got ${audit.counts?.[key]}`);

  const ids = new Set();
  const waveIds = new Set(wave.records.map(row => row.record_id));
  for (const row of audit.rows || []) {
    if (!row.record_id || ids.has(row.record_id)) fail(`duplicate or missing record ${row.record_id}`);
    ids.add(row.record_id);
    if (!waveIds.has(row.record_id)) fail(`${row.record_id}: not in source wave`);
    if (row.included_event !== false || row.evidence_truth_determined !== false || row.independent_review_complete !== false) fail(`${row.record_id}: event/truth/independence laundering`);
    if (row.publication_status !== 'blocked' || row.graph_effect !== 'none' || row.observed_effectiveness !== false) fail(`${row.record_id}: publication/graph/effectiveness boundary drift`);
    if (!Array.isArray(row.source_packets) || row.source_packets.length < 1) fail(`${row.record_id}: source packet missing`);
    if (row.record_role === 'stage_adjudicated_candidate') {
      if (!Array.isArray(row.stage_assessments) || row.stage_assessments.length !== 8) fail(`${row.record_id}: stage assessment denominator drift`);
      else for (let index = 0; index < 8; index++) {
        const stage = row.stage_assessments[index];
        if (stage.stage !== index || stage.field !== stageOrder[index] || !stage.status || !stage.basis) fail(`${row.record_id}: stage ${index} drift`);
      }
      if (row.provisional_ccd_chain_depth !== computeChain(row)) fail(`${row.record_id}: chain depth mismatch`);
      if (row.furthest_documented_stage !== computeFurthest(row)) fail(`${row.record_id}: furthest-stage mismatch`);
      if (!Array.isArray(row.counterevidence) || row.counterevidence.length < 4) fail(`${row.record_id}: counterevidence missing`);
      if (!Array.isArray(row.alternative_explanations) || row.alternative_explanations.length < 4) fail(`${row.record_id}: alternatives missing`);
      if (!Array.isArray(row.open_requirements) || row.open_requirements.length < 4) fail(`${row.record_id}: open requirements missing`);
    } else {
      if (!Array.isArray(row.control_findings) || row.control_findings.length < 4) fail(`${row.record_id}: control findings missing`);
      if (row.provisional_ccd_chain_depth !== undefined || row.furthest_documented_stage !== undefined) fail(`${row.record_id}: control assigned CCD`);
    }
  }
  if (ids.size !== 9 || [...waveIds].some(id => !ids.has(id))) fail('source-wave record coverage drift');

  const byId = new Map(audit.rows.map(row => [row.record_id, row]));
  const honl = byId.get('K0-W07-R001');
  if (honl?.candidate_disposition !== 'retained_candidate_only' || honl?.provisional_ccd_chain_depth !== null || honl?.furthest_documented_stage !== 6) fail('Honl disposition/CCD drift');
  if (honl?.stage_assessments?.[0]?.status !== 'not_established' || honl?.stage_assessments?.[2]?.status !== 'not_established' || honl?.stage_assessments?.[3]?.status !== 'not_established') fail('Honl early causal-bridge laundering');
  if (honl?.stage_assessments?.[4]?.status !== 'documented' || honl?.stage_assessments?.[5]?.status !== 'documented' || honl?.stage_assessments?.[6]?.status !== 'documented') fail('Honl downstream record drift');

  const eve = byId.get('K0-W07-R002');
  if (eve?.candidate_disposition !== 'bounded_non_link' || eve?.provisional_ccd_chain_depth !== null || eve?.furthest_documented_stage !== 5) fail('constructive-discharge disposition/CCD drift');
  if (eve?.stage_assessments?.slice(0, 4).some(stage => stage.status !== 'not_established')) fail('constructive-discharge K0 laundering');
  if (eve?.stage_assessments?.[7]?.status !== 'correction_obtained') fail('constructive-discharge correction drift');

  const transfer = byId.get('K0-W07-R003');
  if (transfer?.candidate_disposition !== 'bounded_non_link' || transfer?.provisional_ccd_chain_depth !== 1 || transfer?.furthest_documented_stage !== 5) fail('transfer disposition/CCD drift');
  if (transfer?.stage_assessments?.[0]?.status !== 'documented' || transfer?.stage_assessments?.[1]?.status !== 'documented') fail('transfer authorship prefix drift');
  if (transfer?.stage_assessments?.[2]?.status !== 'not_established' || transfer?.stage_assessments?.[3]?.status !== 'documented') fail('transfer reclassification/authorship boundary drift');
  if (transfer?.stage_assessments?.[6]?.status !== 'not_established') fail('transfer sensor-removal laundering');

  for (const id of ['K0-W07-R004','K0-W07-R005']) if (byId.get(id)?.control_disposition !== 'counterpower_control_retained') fail(`${id}: counterpower-control drift`);
  for (const id of ['K0-W07-R006','K0-W07-R007']) if (byId.get(id)?.control_disposition !== 'negative_control_retained') fail(`${id}: negative-control drift`);
  for (const id of ['K0-W07-R008','K0-W07-R009']) if (byId.get(id)?.control_disposition !== 'coverage_control_retained') fail(`${id}: coverage-control drift`);

  if (audit.boundaries?.blocked_action_is_authorship_transfer !== false || audit.boundaries?.accepted_resignation_is_voluntary_departure !== false) fail('blocked-action/resignation boundary drift');
  if (audit.boundaries?.constructive_discharge_finding_completes_k0_chain !== false || audit.boundaries?.voluntary_transfer_label_is_knower_reclassification !== false) fail('constructive-discharge/transfer boundary drift');
  if (audit.boundaries?.court_or_agency_correction_proves_prior_knowledge !== false || audit.boundaries?.genuine_resignation_is_ceiling_conversion !== false || audit.boundaries?.seed_overlap_creates_second_event !== false) fail('correction/resignation/dedup boundary drift');
  if (audit.boundaries?.maintainer_adjudication_proves_independence !== false || audit.boundaries?.graph_effect !== 'none') fail('independence/graph boundary drift');

  const executedWaveIds = neutral.execution?.executed_wave_ids || [];
  const waveState = neutral.discovery_waves?.find(row => row.wave_id === 'K0-W07');
  if (typeof neutral.status !== 'string' || !neutral.status.startsWith('execution_started_wave_') || JSON.stringify(executedWaveIds.slice(0, 7)) !== JSON.stringify(['K0-W01','K0-W02','K0-W03','K0-W04','K0-W05','K0-W06','K0-W07']) || waveState?.status !== 'discovery_complete_field_adjudication_complete') fail('aggregate Wave 07 reconciliation drift');

  const coverageRow = coverage.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
  const pendingMetric = coverageRow?.metrics?.find(row => row.metric_id === 'candidate_records_pending_field_audit');
  const gap = coverageRow?.known_gaps?.find(row => row.gap_id === 'k0-wave07-field-adjudication-open');
  const wave07PendingSources = new Set(['data/research/k0-role-neutral-wave-07.json','data/research/k0-wave07-field-adjudication.json']);
  if (!pendingMetric || !Number.isInteger(pendingMetric.observed) || pendingMetric.observed < 0 || typeof pendingMetric.source !== 'string' || pendingMetric.source.length < 1) fail('coverage pending-field metric drift');
  if (executedWaveIds.length === 7) {
    if (pendingMetric.observed !== 0 || pendingMetric.source !== 'data/research/k0-wave07-field-adjudication.json') fail('coverage pending-field metric drift');
  } else if (wave07PendingSources.has(pendingMetric.source)) fail('coverage pending-field metric drift');
  if (gap?.status !== 'resolved_at_maintainer_layer') fail('coverage Wave 07 gap state drift');

  const review = reviews.reviews.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
  const comparator = review?.comparator_tests?.find(row => row.test_id === 'authorship-transfer-resignation-and-correction-controls');
  if (comparator?.status !== 'maintainer_field_complete') fail('authorship-transfer comparator state drift');
  if (comparator?.blocking_conditions?.some(value => /await field adjudication|field review open|three candidate packets/i.test(value))) fail('stale field blocker retained');

  const expectedManifest = computeWave07FieldManifest();
  if (JSON.stringify(manifest) !== JSON.stringify(expectedManifest)) fail('exact-byte manifest drift');
  if (report.schema_version !== 'k0-wave07-field-adjudication-report@1') fail('report schema drift');
  if (report.release_manifest?.combined_sha256 !== manifest.combined_sha256) fail('report manifest hash drift');
  if (report.counts?.records_reviewed !== 9 || report.counts?.supported_for_human_review !== 0 || report.counts?.bounded_non_link !== 2 || report.counts?.retained_candidate_only !== 1 || report.counts?.included_events !== 0) fail('report count drift');
  if (report.current_result?.independent_second_party_review_complete !== false || report.current_result?.publication_status !== 'blocked' || report.current_result?.graph_effect !== 'none') fail('report terminal boundary drift');
  return { ok: failures.length === 0, failures };
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const result = validateWave07Field();
  if (!result.ok) {
    console.error(`K0 Wave 07 field adjudication validation failed with ${result.failures.length} error(s):\n${result.failures.map(row => `- ${row}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log('validate-k0-wave07-field-adjudication: OK');
}
