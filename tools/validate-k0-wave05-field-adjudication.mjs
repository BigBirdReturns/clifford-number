#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeWave05FieldManifest } from './build-k0-wave05-field-adjudication.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stageOrder = [
  'governing_claim',
  'qualified_contradiction',
  'knower_reclassification',
  'explanation_mutation',
  'institutional_gate_action',
  'material_consequence',
  'feedback_source_removed',
  'correction_substitution_or_exit_blocked'
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

export function validateWave05Field({
  root = defaultRoot,
  auditPath = 'data/research/k0-wave05-field-adjudication.json',
  neutralPath = 'data/research/k0-role-neutral-denominator.json',
  coveragePath = 'data/research/corpus-coverage.json',
  reviewsPath = 'data/research/selection-adversarial-reviews.json'
} = {}) {
  const failures = [];
  const fail = message => failures.push(message);
  const read = rel => JSON.parse(fs.readFileSync(path.resolve(root, rel), 'utf8'));
  const audit = read(auditPath);
  const wave = read('data/research/k0-role-neutral-wave-05.json');
  const neutral = read(neutralPath);
  const coverage = read(coveragePath);
  const reviews = read(reviewsPath);
  const manifest = read('data/project/k0-wave05-field-adjudication-release-manifest.json');
  const report = read('reports/core-thesis/answerable-power/k0-wave05-field-adjudication.json');

  if (audit.schema_version !== 'k0-wave05-field-adjudication@1' || audit.audit_id !== 'K0-W05-FIELD-2026-07-28-MAINTAINER') fail('audit identity drift');
  if (audit.source_wave_id !== 'K0-W05' || audit.independence_effect !== 'does_not_satisfy_second_party_review') fail('source/independence drift');
  if (JSON.stringify(audit.method?.stage_order) !== JSON.stringify(stageOrder)) fail('stage denominator drift');
  if (audit.method?.temporal_order_rule?.includes('cannot establish') !== true) fail('temporal-order boundary missing');
  if (audit.rows?.length !== 8 || wave.records?.length !== 8) fail('record denominator drift');

  const expectedCounts = {
    retained_records_reviewed: 8,
    stage_adjudicated_records: 2,
    control_records_reviewed: 6,
    supported_for_human_review: 1,
    bounded_non_link: 0,
    retained_candidate_only: 1,
    requires_additional_acquisition: 0,
    negative_controls: 1,
    counterpower_controls: 3,
    correction_controls: 1,
    coverage_controls: 1,
    provisional_chain_depth_1: 1,
    provisional_chain_depth_6: 1,
    included_events: 0,
    publication_cleared: 0,
    graph_effects: 0,
    public_source_pages_used: 19
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
      else {
        for (let index = 0; index < 8; index++) {
          const stage = row.stage_assessments[index];
          if (stage.stage !== index || stage.field !== stageOrder[index] || !stage.status || !stage.basis) fail(`${row.record_id}: stage ${index} drift`);
        }
      }
      const expectedChain = computeChain(row);
      const expectedFurthest = computeFurthest(row);
      if (row.provisional_ccd_chain_depth !== expectedChain) fail(`${row.record_id}: chain depth mismatch`);
      if (row.furthest_documented_stage !== expectedFurthest) fail(`${row.record_id}: furthest-stage mismatch`);
      if (!Array.isArray(row.counterevidence) || row.counterevidence.length < 3) fail(`${row.record_id}: counterevidence missing`);
      if (!Array.isArray(row.alternative_explanations) || row.alternative_explanations.length < 3) fail(`${row.record_id}: alternatives missing`);
      if (!Array.isArray(row.open_requirements) || row.open_requirements.length < 3) fail(`${row.record_id}: open requirements missing`);
    } else {
      if (!Array.isArray(row.control_findings) || row.control_findings.length < 3) fail(`${row.record_id}: control findings missing`);
      if (row.provisional_ccd_chain_depth !== undefined || row.furthest_documented_stage !== undefined) fail(`${row.record_id}: control assigned CCD`);
    }
  }
  if (ids.size !== 8 || [...waveIds].some(id => !ids.has(id))) fail('source-wave record coverage drift');

  const byId = new Map(audit.rows.map(row => [row.record_id, row]));
  const karolinska = byId.get('K0-W05-R001');
  if (karolinska?.candidate_disposition !== 'retained_candidate_only' || karolinska?.provisional_ccd_chain_depth !== 1 || karolinska?.furthest_documented_stage !== 4) fail('Karolinska disposition/CCD drift');
  if (karolinska?.stage_assessments?.[2]?.status !== 'not_established' || karolinska?.stage_assessments?.[3]?.status !== 'not_established') fail('Karolinska causal-bridge laundering');
  if (karolinska?.stage_assessments?.[7]?.status !== 'correction_obtained') fail('Karolinska correction-state drift');

  const olivieri = byId.get('K0-W05-R002');
  if (olivieri?.candidate_disposition !== 'supported_for_human_review' || olivieri?.provisional_ccd_chain_depth !== 6 || olivieri?.furthest_documented_stage !== 6) fail('Olivieri disposition/CCD drift');
  if (olivieri?.stage_assessments?.slice(0, 7).some(stage => stage.status !== 'documented')) fail('Olivieri contiguous-chain drift');
  if (olivieri?.stage_assessments?.[7]?.status !== 'partial') fail('Olivieri remedy-completion laundering');

  if (byId.get('K0-W05-R003')?.control_disposition !== 'negative_control_retained') fail('misconduct negative-control drift');
  for (const id of ['K0-W05-R004','K0-W05-R005','K0-W05-R006']) if (byId.get(id)?.control_disposition !== 'counterpower_control_retained') fail(`${id}: counterpower-control drift`);
  if (byId.get('K0-W05-R007')?.control_disposition !== 'correction_control_retained') fail('correction-control drift');
  if (byId.get('K0-W05-R008')?.control_disposition !== 'coverage_control_retained') fail('coverage-control drift');

  if (audit.boundaries?.publication_dispute_is_ceiling_conversion !== false || audit.boundaries?.retraction_proves_epistemic_suppression !== false) fail('publication/retraction boundary drift');
  if (audit.boundaries?.later_vindication_proves_prior_knowledge !== false || audit.boundaries?.distributed_institution_is_single_gateholder !== false) fail('temporal/attribution boundary drift');
  if (audit.boundaries?.maintainer_adjudication_proves_independence !== false || audit.boundaries?.graph_effect !== 'none') fail('independence/graph boundary drift');

  const executedWaveIds = neutral.execution?.executed_wave_ids || [];
  const waveState = neutral.discovery_waves?.find(row => row.wave_id === 'K0-W05');
  if (typeof neutral.status !== 'string' || !neutral.status.startsWith('execution_started_wave_') || JSON.stringify(executedWaveIds.slice(0, 5)) !== JSON.stringify(['K0-W01','K0-W02','K0-W03','K0-W04','K0-W05']) || waveState?.status !== 'discovery_complete_field_adjudication_complete') fail('aggregate Wave 05 reconciliation drift');

  const coverageRow = coverage.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
  const pendingMetric = coverageRow?.metrics?.find(row => row.metric_id === 'candidate_records_pending_field_audit');
  const gap = coverageRow?.known_gaps?.find(row => row.gap_id === 'k0-wave05-field-adjudication-open');
  const wave05PendingSources = new Set([
    'data/research/k0-role-neutral-wave-05.json',
    'data/research/k0-wave05-field-adjudication.json'
  ]);
  if (!pendingMetric || !Number.isInteger(pendingMetric.observed) || pendingMetric.observed < 0 || typeof pendingMetric.source !== 'string' || pendingMetric.source.length < 1) fail('coverage pending-field metric drift');
  if (executedWaveIds.length === 5) {
    if (pendingMetric?.observed !== 0 || pendingMetric?.source !== 'data/research/k0-wave05-field-adjudication.json') fail('coverage pending-field metric drift');
  } else if (wave05PendingSources.has(pendingMetric?.source)) fail('coverage pending-field metric drift');
  if (gap?.status !== 'resolved_at_maintainer_layer') fail('coverage Wave 05 gap state drift');

  const review = reviews.reviews.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
  const comparator = review?.comparator_tests?.find(row => row.test_id === 'publication-gate-and-correction-controls');
  if (comparator?.status !== 'maintainer_field_complete') fail('publication comparator state drift');
  if (comparator?.blocking_conditions?.some(value => /await field adjudication|field review open/i.test(value))) fail('stale field blocker retained');

  const expectedManifest = computeWave05FieldManifest();
  if (JSON.stringify(manifest) !== JSON.stringify(expectedManifest)) fail('exact-byte manifest drift');
  if (report.schema_version !== 'k0-wave05-field-adjudication-report@1') fail('report schema drift');
  if (report.release_manifest?.combined_sha256 !== manifest.combined_sha256) fail('report manifest hash drift');
  if (report.counts?.records_reviewed !== 8 || report.counts?.supported_for_human_review !== 1 || report.counts?.retained_candidate_only !== 1 || report.counts?.included_events !== 0) fail('report count drift');
  if (report.current_result?.independent_second_party_review_complete !== false || report.current_result?.publication_status !== 'blocked' || report.current_result?.graph_effect !== 'none') fail('report terminal boundary drift');

  return { ok: failures.length === 0, failures };
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const result = validateWave05Field();
  if (!result.ok) {
    console.error(`K0 Wave 05 field adjudication validation failed with ${result.failures.length} error(s):\n${result.failures.map(row => `- ${row}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log('validate-k0-wave05-field-adjudication: OK');
}
