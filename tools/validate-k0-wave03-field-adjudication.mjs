#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeWave03FieldManifest } from './build-k0-wave03-field-adjudication.mjs';

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

export function validateWave03Field({
  root = defaultRoot,
  auditPath = 'data/research/k0-wave03-field-adjudication.json'
} = {}) {
  const failures = [];
  const fail = message => failures.push(message);
  const read = rel => JSON.parse(fs.readFileSync(path.resolve(root, rel), 'utf8'));
  const audit = read(auditPath);
  const wave = read('data/research/k0-role-neutral-wave-03.json');
  const manifest = read('data/project/k0-wave03-field-adjudication-release-manifest.json');
  const report = read('reports/core-thesis/answerable-power/k0-wave03-field-adjudication.json');

  if (audit.schema_version !== 'k0-wave03-field-adjudication@1' || audit.audit_id !== 'K0-W03-FIELD-2026-07-28-MAINTAINER') fail('audit identity drift');
  if (audit.source_wave_id !== 'K0-W03' || audit.independence_effect !== 'does_not_satisfy_second_party_review') fail('source/independence drift');
  if (JSON.stringify(audit.method?.stage_order) !== JSON.stringify(stageOrder)) fail('stage denominator drift');
  if (audit.rows?.length !== 7 || wave.records?.length !== 7) fail('record denominator drift');

  const expectedCounts = {
    retained_records_reviewed: 7,
    stage_adjudicated_records: 5,
    control_records_reviewed: 2,
    supported_for_human_review: 3,
    bounded_non_link: 1,
    retained_candidate_only: 1,
    requires_additional_acquisition: 0,
    negative_controls: 1,
    coverage_controls: 1,
    provisional_chain_depth_1: 2,
    provisional_chain_depth_3: 1,
    provisional_chain_depth_6: 2,
    included_events: 0,
    publication_cleared: 0,
    graph_effects: 0,
    official_source_pages_used: 17
  };
  for (const [key, value] of Object.entries(expectedCounts)) if (audit.counts?.[key] !== value) fail(`${key}: expected ${value}, got ${audit.counts?.[key]}`);

  const ids = new Set();
  const waveIds = new Set(wave.records.map(row => row.record_id));
  for (const row of audit.rows || []) {
    if (!row.record_id || ids.has(row.record_id)) fail(`duplicate or missing record ${row.record_id}`);
    ids.add(row.record_id);
    if (!waveIds.has(row.record_id)) fail(`${row.record_id}: not in source wave`);
    if (row.included_event !== false || row.evidence_truth_determined !== false || row.independent_review_complete !== false) fail(`${row.record_id}: event/truth/independence laundering`);
    if (row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: publication/graph boundary drift`);
    if (row.observed_effectiveness !== false) fail(`${row.record_id}: effectiveness laundering`);
    if (!Array.isArray(row.source_packets) || row.source_packets.length < 1) fail(`${row.record_id}: source packet missing`);

    if (row.record_role === 'stage_adjudicated_candidate') {
      if (!Array.isArray(row.stage_assessments) || row.stage_assessments.length !== 8) fail(`${row.record_id}: stage assessment denominator drift`);
      else for (let index = 0; index < 8; index++) {
        const stage = row.stage_assessments[index];
        if (stage.stage !== index || stage.field !== stageOrder[index] || !stage.status || !stage.basis) fail(`${row.record_id}: stage ${index} drift`);
      }
      const expectedChain = computeChain(row);
      const expectedFurthest = computeFurthest(row);
      if (row.provisional_ccd_chain_depth !== expectedChain) fail(`${row.record_id}: chain depth mismatch`);
      if (row.furthest_documented_stage !== expectedFurthest) fail(`${row.record_id}: furthest-stage mismatch`);
      if (!Array.isArray(row.open_requirements) || row.open_requirements.length < 4) fail(`${row.record_id}: open requirements missing`);
    } else {
      if (!Array.isArray(row.control_findings) || row.control_findings.length < 3) fail(`${row.record_id}: control findings missing`);
      if (row.provisional_ccd_chain_depth !== undefined || row.furthest_documented_stage !== undefined) fail(`${row.record_id}: control assigned CCD`);
    }
  }
  if (ids.size !== 7 || [...waveIds].some(id => !ids.has(id))) fail('source-wave record coverage drift');

  const byId = new Map(audit.rows.map(row => [row.record_id, row]));
  const challenger = byId.get('K0-W03-R001');
  if (challenger?.candidate_disposition !== 'supported_for_human_review' || challenger?.provisional_ccd_chain_depth !== 6 || challenger?.furthest_documented_stage !== 6) fail('Challenger disposition/CCD drift');
  if (challenger?.stage_assessments?.[2]?.status !== 'documented' || challenger?.stage_assessments?.[3]?.status !== 'documented' || challenger?.stage_assessments?.[7]?.status !== 'partial') fail('Challenger chain boundary drift');

  const columbia = byId.get('K0-W03-R002');
  if (columbia?.candidate_disposition !== 'bounded_non_link' || columbia?.provisional_ccd_chain_depth !== 1 || columbia?.furthest_documented_stage !== 5) fail('Columbia disposition/CCD drift');
  if (columbia?.stage_assessments?.[2]?.status !== 'not_established' || !columbia?.non_link_reason) fail('Columbia reclassification laundering');

  const ndk = byId.get('K0-W03-R003');
  if (ndk?.candidate_disposition !== 'retained_candidate_only' || ndk?.provisional_ccd_chain_depth !== 1 || ndk?.furthest_documented_stage !== 5) fail('NDK disposition/CCD drift');
  if (ndk?.stage_assessments?.[2]?.status !== 'not_established' || ndk?.stage_assessments?.[3]?.status !== 'not_established') fail('NDK reclassification/mutation laundering');

  const eastRiver = byId.get('K0-W03-R004');
  if (eastRiver?.candidate_disposition !== 'supported_for_human_review' || eastRiver?.provisional_ccd_chain_depth !== 6 || eastRiver?.furthest_documented_stage !== 6) fail('East River disposition/CCD drift');
  if (eastRiver?.stage_assessments?.[2]?.status !== 'documented' || eastRiver?.stage_assessments?.[3]?.status !== 'documented' || eastRiver?.stage_assessments?.[7]?.status !== 'partial') fail('East River chain boundary drift');

  const grenfell = byId.get('K0-W03-R005');
  if (grenfell?.candidate_disposition !== 'supported_for_human_review' || grenfell?.provisional_ccd_chain_depth !== 3 || grenfell?.furthest_documented_stage !== 5) fail('Grenfell disposition/CCD drift');
  if (grenfell?.decomposition_required !== true || !Array.isArray(grenfell?.decomposition_targets) || grenfell.decomposition_targets.length < 5) fail('Grenfell decomposition boundary drift');
  if (grenfell?.stage_assessments?.[4]?.status !== 'partial') fail('Grenfell single-gate laundering');

  const cape = byId.get('K0-W03-R006');
  if (cape?.control_disposition !== 'negative_control_retained' || cape?.record_role !== 'negative_control') fail('Cape Douglas control drift');
  const tank = byId.get('K0-W03-R007');
  if (tank?.control_disposition !== 'coverage_control_retained' || tank?.record_role !== 'coverage_control') fail('tank-car control drift');

  if (audit.boundaries?.accident_is_ceiling_conversion !== false || audit.boundaries?.material_consequence_proves_reclassification !== false) fail('accident/consequence boundary drift');
  if (audit.boundaries?.distributed_system_is_one_bounded_event !== false || audit.boundaries?.same_failure_shape_proves_coordination !== false) fail('distributed/network boundary drift');
  if (audit.boundaries?.publication_cleared !== false || audit.boundaries?.graph_effect !== 'none') fail('publication/graph boundary drift');

  const expectedManifest = computeWave03FieldManifest();
  if (JSON.stringify(manifest) !== JSON.stringify(expectedManifest)) fail('exact-byte manifest drift');
  if (report.schema_version !== 'k0-wave03-field-adjudication-report@1') fail('report schema drift');
  if (report.release_manifest?.combined_sha256 !== manifest.combined_sha256) fail('report manifest hash drift');
  if (report.counts?.records_reviewed !== 7 || report.counts?.supported_for_human_review !== 3 || report.counts?.bounded_non_link !== 1 || report.counts?.retained_candidate_only !== 1 || report.counts?.included_events !== 0) fail('report count drift');
  if (report.current_result?.independent_second_party_review_complete !== false || report.current_result?.publication_status !== 'blocked' || report.current_result?.graph_effect !== 'none') fail('report terminal boundary drift');

  return { ok: failures.length === 0, failures };
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const result = validateWave03Field();
  if (!result.ok) {
    console.error(`K0 Wave 03 field adjudication validation failed with ${result.failures.length} error(s):\n${result.failures.map(row => `- ${row}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log('validate-k0-wave03-field-adjudication: OK');
}
