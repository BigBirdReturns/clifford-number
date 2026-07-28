#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { computeAdditionalAcquisitionManifest } from './build-k0-wave01-additional-acquisition.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stageOrder = [
  'governing_claim',
  'qualified_contradiction',
  'knower_reclassification',
  'explanation_mutation',
  'institutional_gate_action',
  'material_consequence',
  'feedback_source_removed',
  'correction_substitution_or_exit_blocked',
];

export function validateResolutionObject(resolution) {
  const failures = [];
  const fail = message => failures.push(message);

  if (resolution.schema_version !== 'k0-wave01-additional-acquisition-resolution@1') fail('resolution schema drift');
  if (resolution.program_id !== 'M-05' || resolution.layer_id !== 'K0') fail('program identity drift');
  if (resolution.resolution_id !== 'K0-W01-ADD-2026-07-28-MAINTAINER') fail('resolution id drift');
  if (resolution.independence_effect !== 'does_not_satisfy_second_party_review') fail('independence laundering');
  if (JSON.stringify(resolution.method?.stage_order) !== JSON.stringify(stageOrder)) fail('stage denominator drift');

  const counts = resolution.counts || {};
  const expectedCounts = {
    records_in_universe: 2,
    records_resolved: 2,
    official_case_packets_recovered: 2,
    official_source_artifacts_used: 4,
    supported_for_human_review: 2,
    remaining_requires_additional_acquisition: 0,
    provisional_chain_depth_6: 2,
    included_events: 0,
    publication_cleared: 0,
    graph_effects: 0,
    exact_remote_content_hashes: 0,
  };
  for (const [key, value] of Object.entries(expectedCounts)) {
    if (counts[key] !== value) fail(`count drift ${key}: ${counts[key]} !== ${value}`);
  }

  if (!Array.isArray(resolution.rows) || resolution.rows.length !== 2) fail('row denominator drift');
  const ids = resolution.rows?.map(row => row.record_id) || [];
  if (JSON.stringify(ids) !== JSON.stringify(['K0-W01-R006', 'K0-W01-R008'])) fail('record universe drift');

  for (const row of resolution.rows || []) {
    if (row.prior_selection_outcome !== 'requires_additional_acquisition') fail(`${row.record_id}: prior class drift`);
    if (row.resolution_disposition !== 'supported_for_human_review') fail(`${row.record_id}: disposition drift`);
    if (!row.qualification_basis || !row.gateholder_attribution || !row.bounded_domain) fail(`${row.record_id}: field coverage missing`);
    if (!Array.isArray(row.source_packets) || row.source_packets.length !== 2) fail(`${row.record_id}: source packet denominator drift`);
    if (row.source_packets?.some(packet => !packet.url?.startsWith('https://') || !packet.source_class?.startsWith('official_'))) fail(`${row.record_id}: nonofficial or malformed source packet`);
    if (row.source_custody?.exact_content_sha256 !== null || row.source_custody?.remote_bytes_archived !== false) fail(`${row.record_id}: exact remote-byte custody laundering`);
    if (row.source_custody?.hash_status !== 'not_captured_in_maintainer_web_audit') fail(`${row.record_id}: hash boundary drift`);
    if (!Array.isArray(row.stage_assessments) || row.stage_assessments.length !== 8) fail(`${row.record_id}: stage denominator drift`);

    for (let index = 0; index < 8; index++) {
      const stage = row.stage_assessments?.[index];
      if (stage?.stage !== index || stage?.field !== stageOrder[index]) fail(`${row.record_id}: stage order drift at ${index}`);
      const expectedStatus = index <= 6 ? 'documented' : 'partial';
      if (stage?.status !== expectedStatus) fail(`${row.record_id}: stage ${index} status ${stage?.status} !== ${expectedStatus}`);
      if (!stage?.basis) fail(`${row.record_id}: stage ${index} basis missing`);
    }

    if (row.provisional_ccd_chain_depth !== 6 || row.furthest_documented_stage !== 6) fail(`${row.record_id}: CCD/furthest drift`);
    if (!Array.isArray(row.alternative_explanations) || row.alternative_explanations.length < 2) fail(`${row.record_id}: alternative explanations missing`);
    if (!Array.isArray(row.counterevidence_and_limits) || row.counterevidence_and_limits.length < 2) fail(`${row.record_id}: counterevidence missing`);
    if (!Array.isArray(row.open_requirements) || row.open_requirements.length < 3) fail(`${row.record_id}: open requirements missing`);
    if (row.included_event !== false || row.evidence_truth_determined !== false || row.independent_review_complete !== false) fail(`${row.record_id}: truth or event promotion`);
    if (row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: publication or graph promotion`);
  }

  const result = resolution.current_result || {};
  if (result.additional_acquisition_complete !== true || result.remaining_requires_additional_acquisition !== 0) fail('resolution completion drift');
  if (result.independent_second_party_review_complete !== false || result.evidence_truth_determined !== false) fail('result independence laundering');
  if (result.included_events !== 0 || result.publication_status !== 'blocked' || result.graph_effect !== 'none' || result.project_complete !== false) fail('result promotion drift');

  const boundaries = resolution.boundaries || {};
  for (const key of [
    'official_oversight_finding_is_independent_k0_review',
    'supported_for_human_review_creates_event',
    'provisional_ccd_creates_guilt_score',
    'settlement_proves_complete_remedy',
    'source_retrieval_proves_exact_byte_custody',
    'common_shape_proves_coordination',
  ]) {
    if (boundaries[key] !== false) fail(`boundary drift ${key}`);
  }
  if (boundaries.graph_effect !== 'none') fail('boundary graph drift');

  return { ok: failures.length === 0, failures };
}

export function validateAdditionalAcquisition({
  root = defaultRoot,
  resolutionPath = 'data/research/k0-wave01-additional-acquisition-resolution.json',
  checkProducts = true,
  checkSourceWave = true,
} = {}) {
  const failures = [];
  const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const resolution = read(resolutionPath);
  const core = validateResolutionObject(resolution);
  failures.push(...core.failures);

  if (checkSourceWave) {
    const sourceWave = read(resolution.source_wave_path);
    const byId = new Map(sourceWave.records.map(row => [row.record_id, row]));
    for (const row of resolution.rows) {
      const source = byId.get(row.record_id);
      if (!source) failures.push(`${row.record_id}: absent from source wave`);
      else {
        if (source.selection_outcome !== 'requires_additional_acquisition') failures.push(`${row.record_id}: source-wave selection drift`);
        if (source.included_event !== false || source.graph_effect !== 'none') failures.push(`${row.record_id}: source-wave promotion drift`);
      }
    }
  }

  for (const rel of ['data/ledger/surfaces.jsonl', 'data/ledger/participation.jsonl', 'data/ledger/chains.jsonl']) {
    const full = path.join(root, rel);
    if (fs.existsSync(full) && /K0-W01-R00[68]|K0-W01-ADD-2026-07-28-MAINTAINER/.test(fs.readFileSync(full, 'utf8'))) {
      failures.push(`${rel}: additional-acquisition records leaked into canonical graph`);
    }
  }

  if (checkProducts) {
    const manifest = read('data/project/k0-wave01-additional-acquisition-release-manifest.json');
    const report = read('reports/core-thesis/answerable-power/k0-wave01-additional-acquisition.json');
    const expected = computeAdditionalAcquisitionManifest(root);
    if (JSON.stringify(manifest) !== JSON.stringify(expected)) failures.push('exact-byte manifest drift');
    if (report.schema_version !== 'k0-wave01-additional-acquisition-report@1') failures.push('report schema drift');
    if (report.release_manifest?.combined_sha256 !== manifest.combined_sha256) failures.push('report manifest hash drift');
    if (report.counts?.records_resolved !== 2 || report.counts?.remaining_requires_additional_acquisition !== 0) failures.push('report count drift');
    if (report.current_result?.included_events !== 0 || report.current_result?.publication_status !== 'blocked' || report.current_result?.graph_effect !== 'none') failures.push('report promotion drift');
    const htmlPath = path.join(root, 'reports/core-thesis/answerable-power/k0-wave01-additional-acquisition.html');
    if (!fs.existsSync(htmlPath) || !fs.readFileSync(htmlPath, 'utf8').includes('INDEPENDENT REVIEW OPEN')) failures.push('html report missing or boundary drift');
  }

  return { ok: failures.length === 0, failures };
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invoked === import.meta.url) {
  const result = validateAdditionalAcquisition();
  if (!result.ok) {
    console.error(`K0 additional-acquisition validation failed with ${result.failures.length} error(s):\n${result.failures.map(value => `- ${value}`).join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log('validate-k0-wave01-additional-acquisition: OK');
  }
}
