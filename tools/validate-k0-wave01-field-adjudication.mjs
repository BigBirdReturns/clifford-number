#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeFieldAdjudicationManifest } from './build-k0-wave01-field-adjudication.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fields = [
  'governing_claim',
  'qualified_contradiction',
  'knower_reclassification',
  'explanation_mutation',
  'institutional_gate_action',
  'material_consequence',
  'feedback_source_removed',
  'correction_substitution_or_exit_blocked'
];
const candidateIds = ['K0-W01-R004','K0-W01-R005','K0-W01-R007','K0-W01-R009','K0-W01-R010'];
const allowedStatuses = new Set(['documented','partial','not_established']);
const allowedDispositions = new Set(['supported_for_human_review','retained_candidate_only']);

function computeChain(row) {
  let depth = null;
  for (let index = 0; index < row.stage_assessments.length; index++) {
    if (row.stage_assessments[index].status !== 'documented') break;
    depth = index;
  }
  return depth;
}
function computeFurthest(row) {
  let depth = null;
  for (const stage of row.stage_assessments) if (stage.status === 'documented') depth = stage.stage;
  return depth;
}

export function validateFieldAdjudication({
  root = defaultRoot,
  auditPath = 'data/research/k0-wave01-field-adjudication.json'
} = {}) {
  const failures = [];
  const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const fail = message => failures.push(message);
  const audit = read(auditPath);
  const wave = read('data/research/k0-role-neutral-wave-01.json');
  const manifest = read('data/project/k0-wave01-field-adjudication-release-manifest.json');
  const report = read('reports/core-thesis/answerable-power/k0-wave01-field-adjudication.json');

  if (audit.schema_version !== 'k0-wave01-field-adjudication@1' || audit.audit_id !== 'K0-W01-FIELD-2026-07-27-MAINTAINER') fail('audit identity drift');
  if (audit.source_wave_id !== 'K0-W01' || audit.independence_effect !== 'does_not_satisfy_second_party_review') fail('source-wave or independence boundary drift');
  if (audit.rows.length !== 5 || audit.counts.candidate_records_audited !== 5) fail('candidate denominator drift');
  if (audit.counts.supported_for_human_review !== 2 || audit.counts.retained_candidate_only !== 3) fail('disposition count drift');
  if (audit.counts.included_events !== 0 || audit.counts.graph_effects !== 0) fail('event or graph promotion drift');

  const waveCandidates = wave.records.filter(row => row.selection_outcome === 'candidate_requires_field_audit').map(row => row.record_id).sort();
  if (JSON.stringify(waveCandidates) !== JSON.stringify(candidateIds)) fail(`source-wave candidate set drift: ${waveCandidates.join(',')}`);
  const ids = new Set();
  let supported = 0;
  let retained = 0;
  let nullDepth = 0;
  let depthOne = 0;
  for (const row of audit.rows) {
    if (!candidateIds.includes(row.record_id) || ids.has(row.record_id)) fail(`${row.record_id}: unexpected or duplicate candidate`);
    ids.add(row.record_id);
    if (!allowedDispositions.has(row.candidate_disposition)) fail(`${row.record_id}: invalid disposition`);
    if (row.candidate_disposition === 'supported_for_human_review') supported++;
    if (row.candidate_disposition === 'retained_candidate_only') retained++;
    if (!Array.isArray(row.source_packets) || row.source_packets.length < 1 || row.source_packets.some(source => !/^https:\/\//.test(source.url))) fail(`${row.record_id}: source packet missing`);
    if (!Array.isArray(row.stage_assessments) || row.stage_assessments.length !== 8) fail(`${row.record_id}: stage denominator drift`);
    for (let index = 0; index < row.stage_assessments.length; index++) {
      const stage = row.stage_assessments[index];
      if (stage.stage !== index || stage.field !== fields[index] || !allowedStatuses.has(stage.status) || !stage.basis) fail(`${row.record_id}: malformed stage ${index}`);
    }
    const expectedChain = computeChain(row);
    const expectedFurthest = computeFurthest(row);
    if (row.provisional_ccd_chain_depth !== expectedChain) fail(`${row.record_id}: chain depth expected ${expectedChain}`);
    if (row.furthest_documented_stage !== expectedFurthest) fail(`${row.record_id}: furthest stage expected ${expectedFurthest}`);
    if (row.provisional_ccd_chain_depth === null) nullDepth++;
    if (row.provisional_ccd_chain_depth === 1) depthOne++;
    if (!Array.isArray(row.open_requirements) || row.open_requirements.length < 2) fail(`${row.record_id}: open requirements missing`);
    if (row.included_event !== false || row.evidence_truth_determined !== false || row.independent_review_complete !== false || row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: evidence or publication laundering`);
  }
  if (ids.size !== candidateIds.length || supported !== 2 || retained !== 3 || nullDepth !== 3 || depthOne !== 2) fail('computed audit counts drift');
  if (audit.rows.find(row => row.record_id === 'K0-W01-R007')?.candidate_disposition !== 'supported_for_human_review') fail('CBP disposition drift');
  if (audit.rows.find(row => row.record_id === 'K0-W01-R009')?.furthest_documented_stage !== 7) fail('Army delayed-remedy record drift');
  if (audit.boundaries.maintainer_adjudication_is_independent_review !== false || audit.boundaries.supported_for_human_review_is_included_event !== false || audit.boundaries.settlement_is_merits_finding !== false || audit.boundaries.graph_effect !== 'none') fail('audit boundary drift');

  const expectedManifest = computeFieldAdjudicationManifest();
  if (JSON.stringify(manifest) !== JSON.stringify(expectedManifest)) fail('exact-byte field-adjudication manifest drift');
  if (report.schema_version !== 'k0-wave01-field-adjudication-report@1' || report.counts.candidate_records_audited !== 5 || report.counts.supported_for_human_review !== 2 || report.counts.retained_candidate_only !== 3) fail('report count drift');
  if (report.release_manifest.combined_sha256 !== manifest.combined_sha256) fail('report manifest hash drift');
  if (report.current_result.independent_second_party_review_complete !== false || report.current_result.evidence_truth_determined !== false || report.current_result.included_events !== 0 || report.current_result.publication_status !== 'blocked' || report.current_result.graph_effect !== 'none' || report.current_result.project_complete !== false) fail('report boundary drift');

  return { ok: failures.length === 0, failures };
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const result = validateFieldAdjudication();
  if (!result.ok) {
    console.error(`K0 Wave 01 field adjudication failed with ${result.failures.length} error(s):\n${result.failures.map(value => `- ${value}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log('validate-k0-wave01-field-adjudication: OK');
}
