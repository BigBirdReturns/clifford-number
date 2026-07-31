#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReleaseManifest, loadCounterSelectorCandidates } from './build-counter-selector-wave-02.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const dimensionNames = [
  'support_adjusted_surplus',
  'cross_domain_transfer',
  'exception_handling',
  'custody',
  'model_elasticity',
  'governed_capacity',
  'non_zero_sum_orientation',
  'epistemic_restraint'
];

function push(errors, code, detail) {
  errors.push(`${code}:${detail}`);
}

export function collectArtifactReadinessErrors(
  contract,
  parentManifest,
  candidates,
  readinessRegistry,
  acquisitionQueue,
  schema
) {
  const errors = [];
  const classRules = Object.fromEntries(contract.class_rules.map((row) => [row.class_id, row]));
  const classIds = contract.class_rules.map((row) => row.class_id);

  if (contract.program_id !== 'counter-selector-v1' || contract.wave_id !== 'CS-W02-W02') {
    push(errors, 'CONTRACT_ID', `${contract.program_id}:${contract.wave_id}`);
  }
  if (contract.parent_release_sha256 !== parentManifest.combined_sha256) {
    push(errors, 'PARENT_DIGEST', `${contract.parent_release_sha256}:${parentManifest.combined_sha256}`);
  }
  if (parentManifest.program_id !== contract.program_id || parentManifest.wave_id !== 'CS-W02-W01') {
    push(errors, 'PARENT_ID', `${parentManifest.program_id}:${parentManifest.wave_id}`);
  }
  for (const key of [
    'source_route_is_artifact',
    'source_summary_is_blind_packet',
    'policy_existence_is_observed_repair',
    'control_fixture_is_false_person',
    'missing_artifact_is_negative_capability_evidence',
    'artifact_readiness_is_operator_score',
    'artifact_readiness_authorizes_field_test',
    'aggregate_rank_generated',
    'public_person_ranking_authorized'
  ]) {
    if (contract.boundaries[key] !== false) push(errors, 'CONTRACT_BOUNDARY', key);
  }
  if (contract.boundaries.graph_effect !== 'none') push(errors, 'GRAPH_EFFECT', 'contract');
  if (contract.class_rules.length !== 6 || new Set(classIds).size !== 6) {
    push(errors, 'CLASS_RULES', 'expected six unique classes');
  }
  for (const rule of contract.class_rules) {
    if (!contract.readiness_states.includes(rule.readiness_state)) push(errors, 'CLASS_RULE_STATE', rule.class_id);
    if (!Array.isArray(rule.artifact_requirements) || rule.artifact_requirements.length !== 6) push(errors, 'CLASS_REQUIREMENTS', rule.class_id);
    if (typeof rule.next_action !== 'string' || rule.next_action.length < 20) push(errors, 'CLASS_NEXT_ACTION', rule.class_id);
  }

  if (candidates.length !== 30) push(errors, 'SOURCE_COUNT', candidates.length);
  const candidateIds = new Set();
  const sourceIds = new Set();
  const sourceById = new Map();
  const sourceClassCounts = Object.fromEntries(classIds.map((classId) => [classId, 0]));
  for (const candidate of candidates) {
    if (candidateIds.has(candidate.candidate_id)) push(errors, 'SOURCE_ID_DUP', candidate.candidate_id);
    candidateIds.add(candidate.candidate_id);
    sourceById.set(candidate.candidate_id, candidate);
    if (!classIds.includes(candidate.denominator_class)) push(errors, 'SOURCE_CLASS', candidate.candidate_id);
    else sourceClassCounts[candidate.denominator_class] += 1;
    if (candidate.graph_effect !== 'none') push(errors, 'GRAPH_EFFECT', candidate.candidate_id);
    if (candidate.field_result !== 'not_observed' || candidate.review_state !== 'retained_candidate_only') {
      push(errors, 'SOURCE_PREMATURE', candidate.candidate_id);
    }
    if (candidate.blind_first_review !== 'not_executed' || candidate.bounded_test !== 'not_run' || candidate.handoff_test !== 'not_run' || candidate.contradiction_test !== 'not_run') {
      push(errors, 'SOURCE_PREMATURE', `${candidate.candidate_id}:tests`);
    }
    if (candidate.status_output_residual !== null) push(errors, 'SOURCE_PREMATURE', `${candidate.candidate_id}:residual`);
    for (const dimension of dimensionNames) {
      if (candidate[dimension] !== 'not_tested') push(errors, 'SOURCE_PREMATURE', `${candidate.candidate_id}:${dimension}`);
    }
    if (!Array.isArray(candidate.source_ids) || candidate.source_ids.length !== 1) push(errors, 'SOURCE_ROUTE', candidate.candidate_id);
    for (const sourceId of candidate.source_ids || []) {
      if (sourceIds.has(sourceId)) push(errors, 'SOURCE_RECORD_DUP', sourceId);
      sourceIds.add(sourceId);
    }
    if (!Array.isArray(candidate.observed_artifacts) || candidate.observed_artifacts.length < 1 || candidate.observed_artifacts.some((value) => !/^K0-W\d{2}-R\d{3}$/.test(value))) {
      push(errors, 'SOURCE_ARTIFACT_CLASS', candidate.candidate_id);
    }
  }
  if (candidateIds.size !== 30 || sourceIds.size !== 30) push(errors, 'SOURCE_COUNT', `ids=${candidateIds.size},sources=${sourceIds.size}`);
  for (const classId of classIds) if (sourceClassCounts[classId] !== 5) push(errors, 'SOURCE_CLASS_COUNT', `${classId}:${sourceClassCounts[classId]}`);

  if (readinessRegistry.program_id !== contract.program_id || readinessRegistry.wave_id !== contract.wave_id) {
    push(errors, 'REGISTRY_ID', `${readinessRegistry.program_id}:${readinessRegistry.wave_id}`);
  }
  if (readinessRegistry.parent_release_sha256 !== contract.parent_release_sha256) push(errors, 'PARENT_DIGEST', 'registry');
  if (!Array.isArray(readinessRegistry.records) || readinessRegistry.records.length !== 30) push(errors, 'READINESS_COUNT', readinessRegistry.records?.length);
  const readinessIds = new Set();
  const blindTokens = new Set();
  const readinessSourceIds = new Set();
  const readinessClassCounts = Object.fromEntries(classIds.map((classId) => [classId, 0]));
  const readinessStateCounts = {};
  const readinessById = new Map();
  for (const record of readinessRegistry.records || []) {
    if (readinessIds.has(record.candidate_id)) push(errors, 'READINESS_ID_DUP', record.candidate_id);
    readinessIds.add(record.candidate_id);
    readinessById.set(record.candidate_id, record);
    if (blindTokens.has(record.blind_token)) push(errors, 'BLIND_TOKEN_DUP', record.blind_token);
    blindTokens.add(record.blind_token);
    if (readinessSourceIds.has(record.source_record_id)) push(errors, 'SOURCE_RECORD_DUP', record.source_record_id);
    readinessSourceIds.add(record.source_record_id);
    const source = sourceById.get(record.candidate_id);
    if (!source) {
      push(errors, 'READINESS_SOURCE', record.candidate_id);
      continue;
    }
    const rule = classRules[source.denominator_class];
    if (record.denominator_class !== source.denominator_class) push(errors, 'READINESS_CLASS', record.candidate_id);
    else readinessClassCounts[record.denominator_class] += 1;
    readinessStateCounts[record.artifact_readiness_state] = (readinessStateCounts[record.artifact_readiness_state] || 0) + 1;
    if (record.artifact_readiness_state !== rule.readiness_state) push(errors, 'READINESS_STATE', record.candidate_id);
    if (record.qualifying_artifact_present !== false || record.blind_packet_ready !== false || record.identity_minimization_plan?.blind_packet_created !== false) {
      push(errors, 'ARTIFACT_PREMATURE', record.candidate_id);
    }
    if (record.observed_artifact_ref_class !== 'source_route_identifier_only') push(errors, 'SOURCE_ARTIFACT_CLASS', record.candidate_id);
    if (!Array.isArray(record.observed_artifact_refs) || record.observed_artifact_refs.length < 1 || record.observed_artifact_refs.some((value) => !/^K0-W\d{2}-R\d{3}$/.test(value))) {
      push(errors, 'SOURCE_ARTIFACT_CLASS', record.candidate_id);
    }
    if (record.source_family !== 'K0' || record.source_record_id !== source.source_ids[0] || record.source_path !== source.source_routes[0].path) {
      push(errors, 'SOURCE_ROUTE', record.candidate_id);
    }
    if (!/^[a-f0-9]{64}$/.test(record.source_route_digest || '')) push(errors, 'SOURCE_DIGEST', record.candidate_id);
    if (!Array.isArray(record.artifact_requirements) || record.artifact_requirements.length !== 6) push(errors, 'REQUIREMENTS', record.candidate_id);
    if (record.matched_control_id !== source.matched_control.candidate_id || !sourceById.has(record.matched_control_id) || record.matched_control_id === record.candidate_id) {
      push(errors, 'MATCHED_CONTROL', record.candidate_id);
    }
    if (record.review_state !== 'artifact_acquisition_required') push(errors, 'REVIEW_STATE', record.candidate_id);
    if (record.privacy?.private_evidence_used !== false || record.privacy?.public_identity_release_authorized !== false || record.privacy?.consent_required_before_field_test !== true) {
      push(errors, 'PRIVACY', record.candidate_id);
    }
    if (record.graph_effect !== 'none') push(errors, 'GRAPH_EFFECT', record.candidate_id);
    if (!/^CS-AQ-B0[1-5]$/.test(record.acquisition?.batch_id || '') || record.acquisition?.required_before_blind_review !== true) {
      push(errors, 'ACQUISITION', record.candidate_id);
    }
  }
  if (readinessIds.size !== 30 || blindTokens.size !== 30 || readinessSourceIds.size !== 30) {
    push(errors, 'READINESS_COUNT', `ids=${readinessIds.size},tokens=${blindTokens.size},sources=${readinessSourceIds.size}`);
  }
  for (const classId of classIds) if (readinessClassCounts[classId] !== 5) push(errors, 'READINESS_CLASS_COUNT', `${classId}:${readinessClassCounts[classId]}`);
  const expectedReadiness = {
    source_route_only_requires_artifact_acquisition: 20,
    control_fixture_only_requires_underlying_record: 5,
    policy_or_correction_architecture_only_requires_observed_use: 5
  };
  for (const [state, expected] of Object.entries(expectedReadiness)) {
    if ((readinessStateCounts[state] || 0) !== expected) push(errors, 'READINESS_STATE_COUNT', `${state}:${readinessStateCounts[state] || 0}`);
  }
  for (const forbiddenState of ['artifact_ready_for_blind_packet', 'privacy_or_consent_blocked', 'bounded_non_link']) {
    if ((readinessStateCounts[forbiddenState] || 0) !== 0) push(errors, 'READINESS_STATE_COUNT', `${forbiddenState}:${readinessStateCounts[forbiddenState]}`);
  }
  if (readinessRegistry.counts?.qualifying_artifacts_present !== 0 || readinessRegistry.counts?.blind_packets_ready !== 0 || readinessRegistry.counts?.artifact_acquisition_required !== 30 || readinessRegistry.counts?.graph_effects !== 0) {
    push(errors, 'REGISTRY_COUNTS', JSON.stringify(readinessRegistry.counts));
  }
  if (readinessRegistry.boundaries?.source_route_is_artifact !== false || readinessRegistry.boundaries?.no_artifact_is_negative_capability_evidence !== false || readinessRegistry.boundaries?.audit_is_blind_review !== false || readinessRegistry.boundaries?.audit_is_field_test !== false || readinessRegistry.boundaries?.graph_effect !== 'none') {
    push(errors, 'REGISTRY_BOUNDARY', 'weakened');
  }

  if (acquisitionQueue.program_id !== contract.program_id || acquisitionQueue.wave_id !== contract.wave_id) push(errors, 'QUEUE_ID', acquisitionQueue.wave_id);
  if (acquisitionQueue.parent_release_sha256 !== contract.parent_release_sha256) push(errors, 'PARENT_DIGEST', 'queue');
  if (!Array.isArray(acquisitionQueue.batches) || acquisitionQueue.batches.length !== 5) push(errors, 'BATCH_COUNT', acquisitionQueue.batches?.length);
  const queuedIds = [];
  for (const batch of acquisitionQueue.batches || []) {
    if (!/^CS-AQ-B0[1-5]$/.test(batch.batch_id || '') || batch.class_balanced !== true || batch.creates_priority_or_merit !== false) push(errors, 'BATCH_BOUNDARY', batch.batch_id);
    if (!Array.isArray(batch.candidates) || batch.candidates.length !== 6) push(errors, 'BATCH_SIZE', `${batch.batch_id}:${batch.candidates?.length}`);
    const batchClasses = new Set();
    for (const row of batch.candidates || []) {
      queuedIds.push(row.candidate_id);
      batchClasses.add(row.denominator_class);
      const readiness = readinessById.get(row.candidate_id);
      if (!readiness || row.blind_token !== readiness.blind_token || row.artifact_readiness_state !== readiness.artifact_readiness_state || row.matched_control_id !== readiness.matched_control_id || row.acquisition_state !== 'open') {
        push(errors, 'BATCH_RECORD', `${batch.batch_id}:${row.candidate_id}`);
      }
    }
    if (batchClasses.size !== 6 || classIds.some((classId) => !batchClasses.has(classId))) push(errors, 'BATCH_CLASS', batch.batch_id);
  }
  if (queuedIds.length !== 30 || new Set(queuedIds).size !== 30 || [...candidateIds].some((id) => !queuedIds.includes(id))) {
    push(errors, 'BATCH_COVERAGE', `rows=${queuedIds.length},unique=${new Set(queuedIds).size}`);
  }
  if (acquisitionQueue.execution?.batches_started !== 0 || acquisitionQueue.execution?.objects_with_qualifying_artifact !== 0 || acquisitionQueue.execution?.blind_packets_created !== 0 || acquisitionQueue.execution?.blind_reviews_executed !== 0 || acquisitionQueue.execution?.field_tests_executed !== 0 || acquisitionQueue.execution?.graph_effects !== 0) {
    push(errors, 'QUEUE_EXECUTION', JSON.stringify(acquisitionQueue.execution));
  }
  if (acquisitionQueue.boundaries?.batch_order_creates_priority_or_merit !== false || acquisitionQueue.boundaries?.source_route_is_artifact !== false || acquisitionQueue.boundaries?.acquisition_queue_is_blind_review !== false || acquisitionQueue.boundaries?.acquisition_queue_authorizes_contact !== false || acquisitionQueue.boundaries?.acquisition_queue_authorizes_field_test !== false || acquisitionQueue.boundaries?.graph_effect !== 'none') {
    push(errors, 'QUEUE_BOUNDARY', 'weakened');
  }

  if (schema.additionalProperties !== false || schema.properties?.graph_effect?.const !== 'none' || schema.properties?.qualifying_artifact_present?.const !== false || schema.properties?.blind_packet_ready?.const !== false) {
    push(errors, 'SCHEMA_BOUNDARY', 'schema must fail closed');
  }
  if (schema.properties?.program_id?.const !== contract.program_id || schema.properties?.wave_id?.const !== contract.wave_id) push(errors, 'SCHEMA_ID', 'program or wave');

  return errors;
}

export function validateCounterSelectorWave02() {
  const contract = read('data/project/counter-selector-wave-02-artifact-readiness.json');
  const parentManifest = read('data/project/counter-selector-release-manifest.json');
  const candidateRegistry = read('data/project/counter-selector-candidate-registry.json');
  const candidates = loadCounterSelectorCandidates(candidateRegistry);
  const readinessRegistry = read('data/project/counter-selector-artifact-readiness-registry.json');
  const acquisitionQueue = read('data/project/counter-selector-artifact-acquisition-queue.json');
  const schema = read('schemas/counter-selector-artifact-readiness.schema.json');
  const manifest = read('data/project/counter-selector-wave-02-release-manifest.json');
  const report = read('reports/core-thesis/counter-selector-wave-02/data.json');
  const html = fs.readFileSync(path.join(root, 'reports/core-thesis/counter-selector-wave-02/index.html'), 'utf8');

  const errors = collectArtifactReadinessErrors(
    contract,
    parentManifest,
    candidates,
    readinessRegistry,
    acquisitionQueue,
    schema
  );
  assert.deepEqual(errors, [], errors.join('\n'));
  assert.deepEqual(manifest, computeReleaseManifest(), 'Wave 02 exact-byte manifest drift');
  assert.equal(report.counts.source_routed_objects_audited, 30);
  assert.equal(report.counts.qualifying_artifacts_present, 0);
  assert.equal(report.counts.blind_packets_ready, 0);
  assert.equal(report.counts.artifact_acquisition_required, 30);
  assert.equal(report.records.length, 30);
  assert.equal(report.batches.length, 5);
  assert.equal(report.release_manifest.combined_sha256, manifest.combined_sha256);
  assert.match(html, /30 OBJECTS AUDITED · 0 BLIND PACKETS READY · 0 FIELD TESTS · GRAPH EFFECT NONE/);
  assert.match(html, /Source routes are not artifacts/);
  assert.match(html, /source route ≠ operator work artifact/i);
  assert.match(html, /name="robots" content="noindex,nofollow"/);
  assert.doesNotMatch(html, /overall score|ranked #|capability confirmed/i);

  console.log(
    `validate-counter-selector-wave-02: PASS ` +
    `(${readinessRegistry.records.length} audited, 0 artifacts, 0 blind packets, ` +
    `${acquisitionQueue.batches.length} balanced batches, ${manifest.combined_sha256})`
  );
  return { contract, parentManifest, candidates, readinessRegistry, acquisitionQueue, schema, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) validateCounterSelectorWave02();
