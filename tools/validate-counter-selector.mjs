#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReleaseManifest } from './build-counter-selector.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const classIds = [
  'positive_candidate_operators',
  'false_positive_outsider_genius_candidates',
  'ordinary_specialists',
  'high_status_selected_operators',
  'repair_capable_partnerships',
  'brittle_or_failed_partnerships'
];
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
const expectedProgramBoundaries = [
  'status_output_mismatch_proves_capability',
  'rejection_proves_value',
  'ai_use_proves_authorship_or_fraud',
  'recognition_lag_proves_appropriation',
  'private_microcase_proves_field_mechanism',
  'similarity_creates_graph_edge',
  'silence_proves_motive',
  'class_assignment_is_disposition',
  'source_routed_intake_is_blind_review',
  'source_routed_intake_is_field_test',
  'aggregate_merit_score_generated',
  'person_rank_order_generated',
  'automated_adverse_decision_authorized',
  'public_person_ranking_authorized'
];

function push(errors, code, detail) {
  errors.push(`${code}:${detail}`);
}

export function collectStructuralErrors(program, registry, wave, schema, supersession = null) {
  const errors = [];


  if (supersession) {
    if (supersession.record_id !== 'CS-W00-SUP-01' || supersession.supersedes.path !== 'data/project/counter-selector-wave-00-protocol.json' || supersession.supersedes.blob_sha !== '76546eca680570906d927571f51c60b552fbe280') push(errors, 'SUPERSESSION_ID', 'Wave 00 custody changed');
    if (supersession.replacement_contract.source_routed_candidate_state !== 'not_tested' || supersession.replacement_contract.status_output_residual_before_field_test !== null || supersession.replacement_contract.aggregate_score_generated !== false || supersession.replacement_contract.rank_order_generated !== false) push(errors, 'SUPERSESSION_CONTRACT', 'premature scoring restored');
    if (supersession.successor.wave_id !== 'CS-W02-W01' || supersession.boundaries.historical_protocol_deleted !== false || supersession.boundaries.review_order_changed !== false || supersession.boundaries.not_tested_is_negative_evidence !== false || supersession.boundaries.publication_cleared !== false || supersession.boundaries.graph_effect !== 'none') push(errors, 'SUPERSESSION_BOUNDARY', 'append-preserving boundary weakened');
  }

  if (program.program_id !== 'counter-selector-v1') push(errors, 'PROGRAM_ID', program.program_id);
  if (program.graph_effect !== 'none' || program.boundaries.graph_effect !== 'none') push(errors, 'PROGRAM_GRAPH', 'graph effect must remain none');
  for (const key of expectedProgramBoundaries) {
    if (program.boundaries[key] !== false) push(errors, 'PROGRAM_BOUNDARY', key);
  }
  if (program.operator_dimensions.length !== 8 || new Set(program.operator_dimensions.map((row) => row.id)).size !== 8) push(errors, 'PROGRAM_DIMENSIONS', 'expected eight unique dimensions');
  if (program.review_stages.length !== 8 || new Set(program.review_stages.map((row) => row.stage_id)).size !== 8) push(errors, 'PROGRAM_STAGES', 'expected CS-S0 through CS-S7');
  if (program.dimension_contract.numeric_aggregate_generated !== false || program.dimension_contract.rank_order_generated !== false) push(errors, 'PROGRAM_RANK_BOUNDARY', 'aggregate or rank enabled');
  if (program.denominator_contract.target_total !== 30 || program.denominator_contract.classes.length !== 6) push(errors, 'PROGRAM_DENOMINATOR', 'target or class count changed');
  if (!program.denominator_contract.no_source_object_counts_twice || !program.denominator_contract.class_assignment_is_sampling_role_not_finding || !program.denominator_contract.aggregate_rank_forbidden) push(errors, 'PROGRAM_DENOMINATOR_LAW', 'counting or ranking law weakened');
  if (!program.current_state.candidate_denominator_complete || program.current_state.candidate_denominator_current !== 30 || program.current_state.candidate_denominator_independently_reviewed !== false) push(errors, 'PROGRAM_STATE', 'denominator state inconsistent');
  if (program.current_state.bounded_operator_tests_executed !== 0 || program.current_state.public_person_ranking_generated !== false || program.current_state.graph_effect !== 'none') push(errors, 'PROGRAM_STATE', 'premature empirical or graph effect');

  if (registry.registry_id !== 'counter-selector-candidates-v1' || registry.program_id !== program.program_id) push(errors, 'REGISTRY_ID', registry.registry_id);
  if (registry.graph_effect !== 'none') push(errors, 'GRAPH_EFFECT', 'registry');
  if (!registry.denominator.complete || registry.denominator.target !== 30 || registry.denominator.current !== 30 || registry.denominator.independently_reviewed !== false) push(errors, 'DENOMINATOR', 'registry denominator state');
  if (registry.candidates.length !== 30) push(errors, 'DENOMINATOR', `candidate length ${registry.candidates.length}`);
  if (registry.selection_boundary.aggregate_rank_generated !== false || registry.selection_boundary.public_person_ranking_authorized !== false) push(errors, 'PROGRAM_RANK_BOUNDARY', 'registry rank boundary');
  if (registry.execution.blind_first_reviews_executed !== 0 || registry.execution.bounded_tests_executed !== 0 || registry.execution.second_party_reviews_complete !== 0 || registry.execution.promoted_candidates !== 0 || registry.execution.public_identities_released !== 0 || registry.execution.graph_effects !== 0) push(errors, 'REGISTRY_EXECUTION', 'premature review, test, promotion, identity, or graph count');

  const schemaRequired = new Set(schema.required || []);
  const programRequired = new Set(['schema_version', 'program_id', ...program.candidate_schema.required]);
  for (const key of programRequired) if (!schemaRequired.has(key)) push(errors, 'SCHEMA_REQUIRED', key);
  if (schema.additionalProperties !== false || schema.properties.graph_effect?.const !== 'none') push(errors, 'SCHEMA_BOUNDARY', 'schema must fail closed and graph-inert');
  const allowedKeys = new Set(Object.keys(schema.properties || {}));

  const ids = new Set();
  const sourceIds = new Set();
  const counts = Object.fromEntries(classIds.map((id) => [id, 0]));
  const candidateById = new Map(registry.candidates.map((candidate) => [candidate.candidate_id, candidate]));

  for (const candidate of registry.candidates) {
    if (ids.has(candidate.candidate_id)) push(errors, 'CANDIDATE_ID_DUP', candidate.candidate_id);
    ids.add(candidate.candidate_id);
    if (!/^CS-C\d{4,}$/.test(candidate.candidate_id)) push(errors, 'CANDIDATE_ID', candidate.candidate_id);
    for (const key of programRequired) if (!(key in candidate)) push(errors, 'CANDIDATE_REQUIRED', `${candidate.candidate_id}:${key}`);
    for (const key of Object.keys(candidate)) if (!allowedKeys.has(key)) push(errors, 'CANDIDATE_UNKNOWN', `${candidate.candidate_id}:${key}`);
    if (!classIds.includes(candidate.denominator_class)) push(errors, 'CLASS_UNKNOWN', `${candidate.candidate_id}:${candidate.denominator_class}`);
    else counts[candidate.denominator_class] += 1;
    if (candidate.class_role !== 'source_routed_sampling_object_not_disposition') push(errors, 'CLASS_ROLE', candidate.candidate_id);
    if (candidate.review_state !== 'retained_candidate_only') push(errors, 'REVIEW_STATE', candidate.candidate_id);
    if (candidate.field_result !== 'not_observed') push(errors, 'FIELD_RESULT', candidate.candidate_id);
    if (candidate.blind_first_review !== 'not_executed' || candidate.bounded_test !== 'not_run' || candidate.handoff_test !== 'not_run' || candidate.contradiction_test !== 'not_run') push(errors, 'TEST_PREMATURE', candidate.candidate_id);
    if (candidate.graph_effect !== 'none') push(errors, 'GRAPH_EFFECT', candidate.candidate_id);
    if (candidate.status_output_residual !== null) push(errors, 'STATUS_RESIDUAL', candidate.candidate_id);
    for (const dimension of dimensionNames) if (candidate[dimension] !== 'not_tested') push(errors, 'DIMENSION_PREMATURE', `${candidate.candidate_id}:${dimension}`);
    if (typeof candidate.dimension_evidence_ceiling !== 'string' || candidate.dimension_evidence_ceiling.length < 20) push(errors, 'DIMENSION_CEILING', candidate.candidate_id);
    if (!Array.isArray(candidate.alternative_explanations) || candidate.alternative_explanations.length < 2 || !candidate.counterevidence?.length || !candidate.falsifier?.length || !candidate.missing_receipt?.length) push(errors, 'EVIDENCE_PARTITIONS', candidate.candidate_id);
    if (candidate.privacy.private_evidence_used !== false || candidate.privacy.public_identity_release_authorized !== false || candidate.privacy.consent_required_before_bounded_collaboration !== true || candidate.privacy.candidate_withdrawal_supported !== true) push(errors, 'PRIVACY', candidate.candidate_id);
    if (candidate.identity_status !== 'public_record_role_only') push(errors, 'IDENTITY_STATE', candidate.candidate_id);
    if (!Array.isArray(candidate.source_ids) || candidate.source_ids.length !== 1 || candidate.source_routes.length !== 1) push(errors, 'SOURCE_ROUTE', candidate.candidate_id);
    for (const sourceId of candidate.source_ids || []) {
      if (sourceIds.has(sourceId)) push(errors, 'SOURCE_ID_DUP', sourceId);
      sourceIds.add(sourceId);
    }
    const route = candidate.source_routes?.[0];
    if (!route || route.family_id !== 'K0' || route.record_id !== candidate.source_ids?.[0] || !/^data\/research\/k0-role-neutral-wave-\d{2}\.json$/.test(route.path || '') || !route.authority_ceiling?.includes('does not transfer')) push(errors, 'SOURCE_ROUTE', candidate.candidate_id);
    const controlId = candidate.matched_control?.candidate_id;
    const control = candidateById.get(controlId);
    if (!controlId || !control || controlId === candidate.candidate_id || control.denominator_class !== candidate.matched_control.denominator_class || candidate.comparators?.[0] !== controlId) push(errors, 'MATCHED_CONTROL', candidate.candidate_id);
  }

  if (ids.size !== 30 || sourceIds.size !== 30) push(errors, 'DENOMINATOR', `unique ids ${ids.size}, sources ${sourceIds.size}`);
  for (const classId of classIds) {
    if (counts[classId] !== 5) push(errors, 'CLASS_COUNT', `${classId}:${counts[classId]}`);
    if (registry.candidate_counts[classId] !== counts[classId]) push(errors, 'CLASS_COUNT', `registry:${classId}:${registry.candidate_counts[classId]}`);
  }

  if (wave.program_id !== program.program_id || wave.wave_id !== 'CS-W02-W01' || wave.phase_id !== 'CS-W02') push(errors, 'WAVE_ID', wave.wave_id);
  if (wave.execution.candidate_records !== 30 || !wave.execution.source_routing_complete || !wave.execution.class_counts_complete) push(errors, 'WAVE_DENOMINATOR', 'source routing incomplete');
  if (wave.execution.blind_first_reviews_executed !== 0 || wave.execution.bounded_tests_executed !== 0 || wave.execution.contradiction_tests_executed !== 0 || wave.execution.handoff_tests_executed !== 0 || wave.execution.second_party_reviews !== 0 || wave.execution.promotions !== 0 || wave.execution.person_rankings !== 0 || wave.execution.graph_effects !== 0) push(errors, 'WAVE_EXECUTION', 'premature empirical or ranking count');
  if (wave.boundaries.blind_review_executed !== false || wave.boundaries.field_test_executed !== false || wave.boundaries.second_party_review_complete !== false || wave.boundaries.publication_cleared !== false || wave.boundaries.graph_effect !== 'none') push(errors, 'WAVE_BOUNDARY', 'wave authority ceiling weakened');
  const waveIds = new Set(wave.candidate_ids || []);
  if (waveIds.size !== 30 || [...ids].some((id) => !waveIds.has(id))) push(errors, 'WAVE_CANDIDATES', 'registry and wave differ');

  return errors;
}

export function validateCounterSelector() {
  const program = read('data/project/counter-selector-program.json');
  const registry = read('data/project/counter-selector-candidate-registry.json');
  const supersession = read('data/project/counter-selector-wave-00-supersession.json');
  const wave = read('data/project/counter-selector-wave-01.json');
  const schema = read('schemas/counter-selector-candidate.schema.json');
  const manifest = read('data/project/counter-selector-release-manifest.json');
  const report = read('reports/core-thesis/counter-selector/data.json');
  const html = fs.readFileSync(path.join(root, 'reports/core-thesis/counter-selector/index.html'), 'utf8');

  const errors = collectStructuralErrors(program, registry, wave, schema, supersession);
  assert.deepEqual(errors, [], errors.join('\n'));
  assert.deepEqual(manifest, computeReleaseManifest(), 'release manifest does not match exact bytes');
  assert.equal(report.counts.candidates, 30);
  assert.equal(report.counts.unique_source_ids, 30);
  assert.equal(report.counts.matched_controls, 30);
  assert.equal(report.counts.bounded_tests, 0);
  assert.equal(report.counts.promotions, 0);
  assert.equal(report.counts.person_rankings, 0);
  assert.equal(report.counts.graph_effects, 0);
  assert.equal(report.records.length, 30);
  assert.equal(report.release_manifest.combined_sha256, manifest.combined_sha256);
  assert.match(html, /SOURCE-ROUTED INTAKE · NO PERSON RANKING · NO FIELD RESULT · GRAPH EFFECT NONE/);
  assert.match(html, /name="robots" content="noindex,nofollow"/);
  assert.match(html, /source-routed intake ≠ field test/);
  assert.doesNotMatch(html, /ranked #|overall score|IQ score/i);

  console.log(`validate-counter-selector: PASS (${registry.candidates.length} candidates, ${new Set(registry.candidates.flatMap((row) => row.source_ids)).size} unique sources, ${manifest.combined_sha256})`);
  return { program, registry, supersession, wave, schema, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) validateCounterSelector();
