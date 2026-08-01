#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

const dimensions = [
  'support_adjusted_surplus', 'cross_domain_transfer', 'exception_handling', 'custody',
  'model_elasticity', 'governed_capacity', 'non_zero_sum_orientation', 'epistemic_restraint'
];

export function validateContract(contract) {
  assert(contract.schema_version === 'counter-selector-repair-continuation-audit@1', 'schema version');
  assert(contract.program_id === 'counter-selector-v1', 'program');
  assert(contract.wave_id === 'CS-W18-RC-01', 'wave');
  assert(contract.as_of === '2026-08-01', 'as of');
  assert(contract.status === 'three_person_support_updates_two_identity_blocks_retained_six_review_exports_ready_zero_external_reviews', 'status');
  assert(contract.publication_status === 'staged_nonpublic_source_custody', 'publication status');
  assert(/^[0-9a-f]{40}$/.test(contract.parent_main_sha), 'parent main sha');
  assert(contract.parent_main_sha === 'b952da00932012be409c63554d6c81f8367723cb', 'exact parent main');
  assert(/^[0-9a-f]{64}$/.test(contract.parent_release_sha256), 'parent release sha');
  assert(contract.parent_release_sha256 === '6da6c41d1498466409f50bc6b2f3e3715af53673924b3237a9db4f613c6e1d35', 'exact parent release');

  const expectedCounts = {
    person_traces_audited: 4,
    identity_blocks_audited: 2,
    official_source_records: 8,
    person_support_updates: 3,
    inherited_function_support_attributions: 1,
    new_evidence_person_supports: 2,
    identity_blocks_resolved: 0,
    identity_blocks_retained: 2,
    external_review_exports_prepared: 6,
    identity_labels_removed_from_exports: 6,
    external_review_requests_sent: 0,
    external_selector_reviews_executed: 0,
    open_exact_acquisition_lanes: 7,
    complete_operator_findings: 0,
    field_test_eligible_candidates: 0,
    contacts_authorized: 0,
    bounded_collaborations_authorized: 0,
    promotions: 0,
    person_rankings: 0,
    public_identity_profiles: 0,
    graph_effects: 0,
    adversarial_mutations: 42
  };
  for (const [key, value] of Object.entries(expectedCounts)) assert(contract.counts[key] === value, `count ${key}`);

  assert(Array.isArray(contract.person_updates) && contract.person_updates.length === 4, 'four person updates');
  assert(Array.isArray(contract.identity_block_updates) && contract.identity_block_updates.length === 2, 'two identity blocks');
  assert(Array.isArray(contract.external_review_exports) && contract.external_review_exports.length === 6, 'six review exports');
  assert(Array.isArray(contract.sources) && contract.sources.length === 8, 'eight sources');
  assert(Array.isArray(contract.acquisition_lanes) && contract.acquisition_lanes.length === 7, 'seven acquisition lanes');
  assert(new Set(contract.person_updates.map((row) => row.trace_id)).size === 4, 'unique traces');
  assert(new Set(contract.sources.map((row) => row.source_id)).size === 8, 'unique sources');
  assert(new Set(contract.external_review_exports.map((row) => row.export_id)).size === 6, 'unique exports');
  assert(new Set(contract.external_review_exports.map((row) => row.review_token)).size === 6, 'unique review tokens');
  assert(new Set(contract.acquisition_lanes.map((row) => row.lane_id)).size === 7, 'unique lanes');

  const byIdentity = Object.fromEntries(contract.person_updates.map((row) => [row.source_identity, row]));
  assert(Object.keys(byIdentity).sort().join(',') === 'Allan McDonald,Rene Febles,Rodney Rocha,Roger Boisjoly', 'person set');

  const mcdonald = byIdentity['Allan McDonald'];
  assert(mcdonald.new_support_assignments.length === 2, 'McDonald two supports');
  assert(mcdonald.new_support_assignments.map((row) => row.dimension).join(',') === 'exception_handling,custody', 'McDonald dimensions');
  assert(mcdonald.new_support_assignments[0].support_class === 'inherited_function_support_attributed_by_new_person_receipt', 'McDonald inherited support class');
  assert(mcdonald.new_support_assignments[1].support_class === 'new_evidence_person_support', 'McDonald new evidence class');
  assert(mcdonald.supported_dimensions_after_update.join(',') === 'exception_handling,custody,governed_capacity,epistemic_restraint', 'McDonald vector');
  assert(mcdonald.unresolved_dimensions.join(',') === 'support_adjusted_surplus,cross_domain_transfer,model_elasticity,non_zero_sum_orientation', 'McDonald unresolved');
  assert(mcdonald.support_context.substantial_support_observed === true, 'McDonald support context');
  assert(mcdonald.support_context.support_adjusted_surplus_established === false, 'McDonald no surplus');

  const rocha = byIdentity['Rodney Rocha'];
  assert(rocha.new_support_assignments.length === 1, 'Rocha one support');
  assert(rocha.new_support_assignments[0].dimension === 'custody', 'Rocha custody');
  assert(rocha.new_support_assignments[0].state === 'bounded_support_individual_learning_object_publication_scope', 'Rocha custody scope');
  assert(rocha.supported_dimensions_after_update.join(',') === 'exception_handling,custody,epistemic_restraint', 'Rocha vector');
  assert(rocha.support_context.support_adjusted_surplus_established === false, 'Rocha no surplus');

  const boisjoly = byIdentity['Roger Boisjoly'];
  assert(boisjoly.new_support_assignments.length === 0, 'Boisjoly no advance');
  assert(typeof boisjoly.non_advance_reason === 'string' && boisjoly.non_advance_reason.length > 20, 'Boisjoly non-advance');
  const febles = byIdentity['Rene Febles'];
  assert(febles.new_support_assignments.length === 0, 'Febles no advance');
  assert(typeof febles.non_advance_reason === 'string' && febles.non_advance_reason.length > 20, 'Febles non-advance');

  const updateCount = contract.person_updates.reduce((sum, row) => sum + row.new_support_assignments.length, 0);
  const inheritedCount = contract.person_updates.flatMap((row) => row.new_support_assignments).filter((row) => row.support_class === 'inherited_function_support_attributed_by_new_person_receipt').length;
  const newEvidenceCount = contract.person_updates.flatMap((row) => row.new_support_assignments).filter((row) => row.support_class === 'new_evidence_person_support').length;
  assert(updateCount === 3, 'three person support updates');
  assert(inheritedCount === 1, 'one inherited attribution');
  assert(newEvidenceCount === 2, 'two new evidence supports');

  for (const row of contract.person_updates) {
    assert(row.external_review_ready === true, `${row.source_identity} review ready`);
    assert(row.complete_operator_finding === false, `${row.source_identity} no operator`);
    assert(row.field_test_eligible === false, `${row.source_identity} no field test`);
    assert(row.contact_authorized === false, `${row.source_identity} no contact`);
    assert(row.graph_effect === 'none', `${row.source_identity} no graph`);
    assert(row.supported_dimensions_after_update.every((d) => dimensions.includes(d)), `${row.source_identity} valid supported dimensions`);
    assert(row.unresolved_dimensions.every((d) => dimensions.includes(d)), `${row.source_identity} valid unresolved dimensions`);
    assert(new Set([...row.supported_dimensions_after_update, ...row.unresolved_dimensions]).size === 8, `${row.source_identity} full vector partition`);
    assert(row.supported_dimensions_after_update.every((d) => !row.unresolved_dimensions.includes(d)), `${row.source_identity} disjoint vector`);
    assert(row.new_support_assignments.every((finding) => finding.basis && finding.ceiling && finding.source_ids.length), `${row.source_identity} support receipt completeness`);
  }

  const blockIds = contract.identity_block_updates.map((row) => row.identity_block_id).sort();
  assert(blockIds.join(',') === 'CS-IDBLOCK-W17-0004,CS-IDBLOCK-W17-0013', 'identity block set');
  for (const row of contract.identity_block_updates) {
    assert(row.audit_result.startsWith('identity_block_retained_'), `${row.identity_block_id} retained`);
    assert(row.acquired_record_state.includes('visual'), `${row.identity_block_id} visual limit preserved`);
    assert(row.named_person_inferred === false, `${row.identity_block_id} no inferred person`);
    assert(row.person_support_assigned === false, `${row.identity_block_id} no support`);
    assert(row.contact_authorized === false, `${row.identity_block_id} no contact`);
    assert(row.graph_effect === 'none', `${row.identity_block_id} no graph`);
    assert(row.required_objects.length === 3, `${row.identity_block_id} exact requirements`);
  }

  for (const row of contract.external_review_exports) {
    assert(row.source_identity_omitted_from_export === true, `${row.export_id} identity omitted`);
    assert(row.artifact_may_remain_inferable === true, `${row.export_id} inferability preserved`);
    assert(row.export_state === 'ready_not_sent', `${row.export_id} not sent`);
    assert(row.external_review_executed === false, `${row.export_id} no review`);
    assert(row.contact_required === false, `${row.export_id} no contact required`);
    assert(row.contact_authorized === false, `${row.export_id} no contact`);
    assert(row.field_test_authorized === false, `${row.export_id} no field test`);
    assert(row.graph_effect === 'none', `${row.export_id} no graph`);
    assert(row.asserted_dimensions.length > 0, `${row.export_id} asserted dimensions`);
    assert(row.review_questions.length >= 3, `${row.export_id} review questions`);
    assert(row.countermodels.length >= 3, `${row.export_id} countermodels`);
    assert(row.falsifiers.length >= 3, `${row.export_id} falsifiers`);
    assert(row.missing_receipts.length >= 2, `${row.export_id} missing receipts`);
  }

  assert(contract.sources.filter((row) => row.record_state.includes('visual_confirmation_cache_unavailable')).length === 2, 'two visual-limit sources');
  assert(contract.sources.every((row) => row.supports.length && row.limits.length), 'source support and limits');
  assert(contract.acquisition_lanes.every((row) => row.contact_authorized === false && row.graph_effect === 'none'), 'lanes inert');

  const b = contract.boundaries;
  for (const key of [
    'repair_team_leadership_is_safe_handoff', 'successful_redesign_is_cross_domain_transfer',
    'restored_central_role_is_support_adjusted_surplus', 'team_design_revision_is_person_model_elasticity',
    'final_test_inspection_is_sole_program_custody', 'post_incident_learning_authorship_is_in_flight_custody',
    'learning_object_publication_is_observed_adoption', 'identity_label_removed_is_identity_blind',
    'named_meeting_participant_is_warning_author', 'named_process_custodian_is_effective_hazard_control',
    'unnamed_consultant_may_be_named_by_inference', 'visual_confirmation_failure_resolves_identity_absence',
    'person_support_update_is_complete_operator', 'review_export_prepared_is_external_review',
    'review_export_prepared_authorizes_contact', 'supported_dimension_count_is_rank', 'contact_authorized',
    'bounded_collaboration_authorized', 'field_test_authorized', 'promotion_authorized',
    'person_ranking_authorized', 'public_identity_profile_authorized'
  ]) assert(b[key] === false, `boundary ${key}`);
  assert(b.graph_effect === 'none', 'boundary graph');
  return true;
}

export function validateProducts() {
  const contract = read('data/project/counter-selector-wave-18-repair-continuation.json');
  validateContract(contract);
  const repair = read('data/project/counter-selector-repair-continuation-registry.json');
  const review = read('data/project/counter-selector-external-review-export-registry.json');
  const report = read('reports/core-thesis/counter-selector-wave-18/data.json');
  const manifest = read('data/project/counter-selector-wave-18-release-manifest.json');
  assert(repair.counts.person_support_updates === 3, 'repair support count');
  assert(repair.counts.identity_blocks_retained === 2, 'repair identity blocks');
  assert(review.counts.exports_prepared === 6, 'review export count');
  assert(review.counts.identity_labels_removed === 6, 'review identity labels');
  assert(review.counts.external_reviews_executed === 0, 'review zero executions');
  assert(review.exports.every((row) => !Object.hasOwn(row, 'identity_key')), 'review exports omit identity key');
  assert(review.identity_key_registry.length === 6, 'separate identity key registry');
  assert(review.identity_key_registry.every((row) => row.released_to_reviewer === false), 'identity keys not released');
  assert(report.counts.new_evidence_person_supports === 2, 'report new evidence supports');
  assert(report.external_review.reviews_executed === 0, 'report zero reviews');
  assert(report.release_manifest.combined_sha256 === manifest.combined_sha256, 'manifest link');
  assert(/^[0-9a-f]{64}$/.test(manifest.combined_sha256), 'manifest digest');
  assert(manifest.boundaries.manifest_authorizes_contact === false, 'manifest contact boundary');
  assert(manifest.boundaries.manifest_authorizes_field_test === false, 'manifest field test boundary');
  assert(manifest.boundaries.manifest_proves_identity_absence === false, 'manifest identity boundary');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateProducts();
  console.log('validate-counter-selector-wave-18: contract and products valid');
}
