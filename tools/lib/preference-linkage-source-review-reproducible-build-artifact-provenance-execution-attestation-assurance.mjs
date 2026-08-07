import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';

export const PREFERENCE_LINKAGE_SOURCE_REVIEW_REPRODUCIBLE_BUILD_ARTIFACT_PROVENANCE_EXECUTION_ATTESTATION_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance-fixture@1';
export const PREFERENCE_LINKAGE_SOURCE_REVIEW_REPRODUCIBLE_BUILD_ARTIFACT_PROVENANCE_EXECUTION_ATTESTATION_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance-build@1';
export const COMPLETE_SOURCE_REVIEW_REPRODUCIBLE_BUILD_ARTIFACT_PROVENANCE_EXECUTION_ATTESTATION_ASSURANCE_CLASSIFICATION =
  'complete_source_review_reproducible_build_artifact_provenance_execution_attestation_assurance';

const EXPECTED_FIXTURE_ID = "same-linkage-source-build-provenance-attestation-status-different-assurance-states-v1";
const EXPECTED_FIXTURE_SNAPSHOT_SHA256 = '7ba91374f3d82f4202925c2b8dbde1a8b907e0f3940a31d8681d08e9fdd21fee';
const EXPECTED_TOP_LEVEL_KEYS = Object.freeze(["schema_version","fixture_id","issue","parent_program_issue","captured_at","status","graph_effect","counts_toward_thesis_evidence","baseline","interpretation_contract","required_refusal_rules","expected_classification","worlds"]);
const EXPECTED_BASELINE_KEYS = Object.freeze(["operative_release","published_candidate_pairs","published_interval_bearing_pairs","published_nominal_coverage","published_empirical_coverage","published_interval_misses","published_mean_interval_width","public_source_review_status","public_build_status","public_provenance_status","public_execution_attestation_status","published_replay_runs","published_matching_replay_runs","approved_use"]);
const EXPECTED_INTERPRETATION_KEYS = Object.freeze(["what_this_is","what_this_is_not","copy_ready_caveat"]);
const EXPECTED_CLASSIFICATION_KEYS = Object.freeze(["public_repository_identifies_complete_review_scope","public_commit_identifies_reproducible_build","public_reproducible_build_badge_identifies_independent_byte_reproduction","public_artifact_digest_identifies_package_and_entry_point","public_signature_establishes_complete_provenance","transparency_receipt_establishes_current_unrevoked_validity","execution_attestation_establishes_source_to_output_identity","matching_replay_outputs_establish_source_to_execution_identity","published_coverage_establishes_real_world_effect","security_compromise_established","graph_effect_present","binding_public_authority_present","complete_source_review_reproducible_build_artifact_provenance_execution_attestation_assurance_supported_in_at_least_one_world"]);
const EXPECTED_WORLD_KEYS = Object.freeze(["world_id","description","source_review","build_reproducibility","independent_reproduction","artifact_provenance","execution_attestation","governance","expected_mechanism","expected_flags"]);
const SECTION_KEYS = Object.freeze({"source_review":["repository_bound","reviewed_commit_bound","parent_commit_bound","source_tree_bound","reviewed_file_set_bound","reviewed_blob_set_bound","reviewed_diff_bound","review_disposition_bound","approval_bound","submodule_state_bound","vendored_source_bound","generated_input_ledger_bound","patch_series_bound","source_export_receipt_bound","executed_build_uses_reviewed_source","source_scope_unbound_executions"],"build_reproducibility":["build_recipe_bound","build_graph_bound","build_target_bound","toolchain_bound","compiler_bound","linker_bound","compile_flags_bound","optimization_policy_bound","timestamp_policy_bound","hermetic_build_bound","build_network_policy_bound","build_environment_bound","generated_inputs_reproducible","build_logs_complete","primary_build_artifact_bound","build_recipe_toolchain_divergent_executions"],"independent_reproduction":["independent_builder_identity_bound","independence_basis_bound","clean_room_state_bound","source_materials_identical","recipe_and_toolchain_identical","reproduction_attempts_complete","reproduction_logs_complete","output_artifact_digest_bound","byte_for_byte_comparison_complete","divergence_disposition_complete","rerun_custody_complete","independent_reproduction_verified","independent_reproduction_failures"],"artifact_provenance":["artifact_identity_bound","artifact_format_bound","artifact_digest_bound","package_identity_bound","executable_identity_bound","entry_point_bound","generated_resource_set_bound","signature_bound","signer_identity_bound","signing_key_identity_bound","delegation_bound","statement_scope_bound","subject_set_bound","material_set_bound","provenance_predicate_bound","transparency_receipt_bound","inclusion_proof_bound","expiry_state_bound","revocation_state_bound","artifact_package_entry_point_substitutions","signature_provenance_scope_failures","transparency_revocation_failures"],"execution_attestation":["reviewed_source_to_build_attested","build_to_artifact_attested","artifact_to_package_attested","package_to_entry_point_attested","entry_point_to_invocation_attested","invocation_arguments_bound","invocation_environment_bound","executed_bytes_digest_bound","executed_bytes_to_output_attested","output_digest_bound","execution_receipt_reconciled","correction_receipt_bound","rollback_receipt_bound","withdrawal_receipt_bound","source_to_output_chain_complete","unreconciled_execution_attestation_decisions"],"governance":["assurance_current","approved_source_lineage_current","approved_recipe_lineage_current","approved_toolchain_lineage_current","approved_builder_lineage_current","approved_artifact_lineage_current","approved_signer_lineage_current","approved_provenance_lineage_current","approved_package_lineage_current","approved_entry_point_lineage_current","approved_release_lineage_current","approved_correction_lineage_current","approved_use_lineage_current","monitoring_defined","attestation_failure_defined","quarantine_defined","rollback_defined","certificate_withdrawal_defined","corrected_rebuild_defined","resigning_defined","republication_defined","retirement_defined","appeal_defined","durability_defined","stale_assurance_decisions","unsupported_assurance_decisions","binding_public_authority"]});
const SECTION_BOOLEAN_KEYS = Object.freeze({"source_review":["repository_bound","reviewed_commit_bound","parent_commit_bound","source_tree_bound","reviewed_file_set_bound","reviewed_blob_set_bound","reviewed_diff_bound","review_disposition_bound","approval_bound","submodule_state_bound","vendored_source_bound","generated_input_ledger_bound","patch_series_bound","source_export_receipt_bound","executed_build_uses_reviewed_source"],"build_reproducibility":["build_recipe_bound","build_graph_bound","build_target_bound","toolchain_bound","compiler_bound","linker_bound","compile_flags_bound","optimization_policy_bound","timestamp_policy_bound","hermetic_build_bound","build_network_policy_bound","build_environment_bound","generated_inputs_reproducible","build_logs_complete","primary_build_artifact_bound"],"independent_reproduction":["independent_builder_identity_bound","independence_basis_bound","clean_room_state_bound","source_materials_identical","recipe_and_toolchain_identical","reproduction_attempts_complete","reproduction_logs_complete","output_artifact_digest_bound","byte_for_byte_comparison_complete","divergence_disposition_complete","rerun_custody_complete","independent_reproduction_verified"],"artifact_provenance":["artifact_identity_bound","artifact_format_bound","artifact_digest_bound","package_identity_bound","executable_identity_bound","entry_point_bound","generated_resource_set_bound","signature_bound","signer_identity_bound","signing_key_identity_bound","delegation_bound","statement_scope_bound","subject_set_bound","material_set_bound","provenance_predicate_bound","transparency_receipt_bound","inclusion_proof_bound","expiry_state_bound","revocation_state_bound"],"execution_attestation":["reviewed_source_to_build_attested","build_to_artifact_attested","artifact_to_package_attested","package_to_entry_point_attested","entry_point_to_invocation_attested","invocation_arguments_bound","invocation_environment_bound","executed_bytes_digest_bound","executed_bytes_to_output_attested","output_digest_bound","execution_receipt_reconciled","correction_receipt_bound","rollback_receipt_bound","withdrawal_receipt_bound","source_to_output_chain_complete"],"governance":["assurance_current","approved_source_lineage_current","approved_recipe_lineage_current","approved_toolchain_lineage_current","approved_builder_lineage_current","approved_artifact_lineage_current","approved_signer_lineage_current","approved_provenance_lineage_current","approved_package_lineage_current","approved_entry_point_lineage_current","approved_release_lineage_current","approved_correction_lineage_current","approved_use_lineage_current","monitoring_defined","attestation_failure_defined","quarantine_defined","rollback_defined","certificate_withdrawal_defined","corrected_rebuild_defined","resigning_defined","republication_defined","retirement_defined","appeal_defined","durability_defined","binding_public_authority"]});
const WORLD_IDS = Object.freeze(["complete_source_review_reproducible_build_artifact_provenance_execution_attestation_assurance","review_scope_source_tree_or_generated_input_unbound","build_recipe_toolchain_environment_or_generated_input_divergence","non_independent_or_byte_divergent_reproduction","artifact_package_entry_point_or_generated_resource_substitution","signature_provenance_transparency_or_revocation_failure","source_to_output_execution_attestation_break","stale_inherited_review_build_provenance_and_attestation_assurance"]);
const WORLD_MECHANISMS = Object.freeze({"complete_source_review_reproducible_build_artifact_provenance_execution_attestation_assurance":"complete_source_review_reproducible_build_artifact_provenance_execution_attestation_assurance","review_scope_source_tree_or_generated_input_unbound":"review_scope_source_tree_or_generated_input_unbound","build_recipe_toolchain_environment_or_generated_input_divergence":"build_recipe_toolchain_environment_or_generated_input_divergence","non_independent_or_byte_divergent_reproduction":"non_independent_or_byte_divergent_reproduction","artifact_package_entry_point_or_generated_resource_substitution":"artifact_package_entry_point_or_generated_resource_substitution","signature_provenance_transparency_or_revocation_failure":"signature_provenance_transparency_or_revocation_failure","source_to_output_execution_attestation_break":"source_to_output_execution_attestation_break","stale_inherited_review_build_provenance_and_attestation_assurance":"stale_inherited_review_build_provenance_and_attestation_assurance"});
const EXPECTED_WORLD_BURDENS = Object.freeze({"complete_source_review_reproducible_build_artifact_provenance_execution_attestation_assurance":{"source_scope_unbound_executions":0,"build_recipe_toolchain_divergent_executions":0,"independent_reproduction_failures":0,"artifact_package_entry_point_substitutions":0,"signature_provenance_scope_failures":0,"transparency_revocation_failures":0,"unreconciled_execution_attestation_decisions":0,"stale_assurance_decisions":0,"unsupported_assurance_decisions":0},"review_scope_source_tree_or_generated_input_unbound":{"source_scope_unbound_executions":100,"build_recipe_toolchain_divergent_executions":0,"independent_reproduction_failures":0,"artifact_package_entry_point_substitutions":0,"signature_provenance_scope_failures":0,"transparency_revocation_failures":0,"unreconciled_execution_attestation_decisions":0,"stale_assurance_decisions":0,"unsupported_assurance_decisions":100},"build_recipe_toolchain_environment_or_generated_input_divergence":{"source_scope_unbound_executions":0,"build_recipe_toolchain_divergent_executions":90,"independent_reproduction_failures":0,"artifact_package_entry_point_substitutions":0,"signature_provenance_scope_failures":0,"transparency_revocation_failures":0,"unreconciled_execution_attestation_decisions":0,"stale_assurance_decisions":0,"unsupported_assurance_decisions":100},"non_independent_or_byte_divergent_reproduction":{"source_scope_unbound_executions":0,"build_recipe_toolchain_divergent_executions":0,"independent_reproduction_failures":80,"artifact_package_entry_point_substitutions":0,"signature_provenance_scope_failures":0,"transparency_revocation_failures":0,"unreconciled_execution_attestation_decisions":0,"stale_assurance_decisions":0,"unsupported_assurance_decisions":100},"artifact_package_entry_point_or_generated_resource_substitution":{"source_scope_unbound_executions":0,"build_recipe_toolchain_divergent_executions":0,"independent_reproduction_failures":0,"artifact_package_entry_point_substitutions":70,"signature_provenance_scope_failures":0,"transparency_revocation_failures":0,"unreconciled_execution_attestation_decisions":0,"stale_assurance_decisions":0,"unsupported_assurance_decisions":100},"signature_provenance_transparency_or_revocation_failure":{"source_scope_unbound_executions":0,"build_recipe_toolchain_divergent_executions":0,"independent_reproduction_failures":0,"artifact_package_entry_point_substitutions":0,"signature_provenance_scope_failures":60,"transparency_revocation_failures":50,"unreconciled_execution_attestation_decisions":0,"stale_assurance_decisions":0,"unsupported_assurance_decisions":100},"source_to_output_execution_attestation_break":{"source_scope_unbound_executions":0,"build_recipe_toolchain_divergent_executions":0,"independent_reproduction_failures":0,"artifact_package_entry_point_substitutions":0,"signature_provenance_scope_failures":0,"transparency_revocation_failures":0,"unreconciled_execution_attestation_decisions":40,"stale_assurance_decisions":0,"unsupported_assurance_decisions":100},"stale_inherited_review_build_provenance_and_attestation_assurance":{"source_scope_unbound_executions":0,"build_recipe_toolchain_divergent_executions":0,"independent_reproduction_failures":0,"artifact_package_entry_point_substitutions":0,"signature_provenance_scope_failures":0,"transparency_revocation_failures":0,"unreconciled_execution_attestation_decisions":0,"stale_assurance_decisions":100,"unsupported_assurance_decisions":100}});

export const REQUIRED_LINKAGE_SOURCE_REVIEW_REPRODUCIBLE_BUILD_ARTIFACT_PROVENANCE_EXECUTION_ATTESTATION_ASSURANCE_REFUSAL_RULES =
  Object.freeze(["one_repository_url_is_not_the_reviewed_commit_parent_source_tree_file_set_or_blob_set","one_commit_hash_is_not_complete_review_scope_or_executed_source_custody","one_reviewed_diff_is_not_complete_source_custody_when_generated_inputs_submodules_vendored_code_patches_or_build_scripts_are_unbound","one_build_recipe_is_not_a_reproducible_build_without_exact_graph_toolchain_flags_environment_timestamps_and_generated_inputs","one_second_build_is_not_independent_reproduction_without_attributed_independence_clean_room_state_complete_logs_and_byte_comparison","one_matching_high_level_checksum_is_not_byte_for_byte_reproduced_artifact_identity","one_artifact_digest_is_not_the_package_executable_entry_point_resource_set_or_invoked_bytes","one_signature_is_not_complete_provenance_when_signer_key_scope_materials_subject_transparency_expiry_delegation_and_revocation_are_incomplete","one_transparency_receipt_is_not_current_signature_validity_after_revocation_expiry_key_succession_or_statement_withdrawal","one_provenance_statement_is_not_source_to_output_execution_attestation","one_startup_command_or_successful_replay_is_not_proof_that_reviewed_source_produced_the_executed_bytes_and_output","historical_review_build_provenance_or_attestation_assurance_is_not_current_after_source_recipe_toolchain_signer_key_artifact_package_entry_point_release_correction_or_use_succession","review_build_provenance_or_attestation_failure_is_not_proof_of_misconduct_breach_manipulation_discrimination_coordination_common_purpose_or_intent","binding_public_authority_requires_separate_current_public_authorization_receipts","synthetic_assurance_burdens_are_not_real_world_defect_prevalence_security_compromise_causal_effect_or_institutional_performance_estimates","execution_attestation_requires_reviewed_source_build_artifact_package_entry_point_invocation_executed_bytes_output_correction_and_lineage_reconciliation"]);
export const LINKAGE_SOURCE_REVIEW_REPRODUCIBLE_BUILD_ARTIFACT_PROVENANCE_EXECUTION_ATTESTATION_ASSURANCE_FALSE_CLASSIFICATIONS =
  Object.freeze({"public_repository_identifies_complete_review_scope":false,"public_commit_identifies_reproducible_build":false,"public_reproducible_build_badge_identifies_independent_byte_reproduction":false,"public_artifact_digest_identifies_package_and_entry_point":false,"public_signature_establishes_complete_provenance":false,"transparency_receipt_establishes_current_unrevoked_validity":false,"execution_attestation_establishes_source_to_output_identity":false,"matching_replay_outputs_establish_source_to_execution_identity":false,"published_coverage_establishes_real_world_effect":false,"security_compromise_established":false,"graph_effect_present":false,"binding_public_authority_present":false});
export const EXPECTED_LINKAGE_SOURCE_REVIEW_REPRODUCIBLE_BUILD_ARTIFACT_PROVENANCE_EXECUTION_ATTESTATION_ASSURANCE_METRICS =
  Object.freeze({"worlds":8,"public_review_build_provenance_signatures":1,"assurance_governance_signatures":8,"complete_assurance_worlds":1,"source_scope_unbound_executions":100,"build_recipe_toolchain_divergent_executions":90,"independent_reproduction_failures":80,"artifact_package_entry_point_substitutions":70,"signature_provenance_scope_failures":60,"transparency_revocation_failures":50,"unreconciled_execution_attestation_decisions":40,"stale_assurance_decisions":100,"unsupported_assurance_decisions":700,"binding_public_authority_worlds":0});

const BUILD_KEYS = Object.freeze(["schema_version","fixture_id","issue","parent_program_issue","captured_at","status","graph_effect","counts_toward_thesis_evidence","conclusion_generated","real_world_evidence_state","fixture_snapshot_sha256","baseline","baseline_snapshot_sha256","public_signature_count","world_count","assurance_governance_signature_count","complete_assurance_world_count","worlds","metrics","classification","required_refusal_rules","custody_chain","custody_chain_head_sha256","interpretation_contract"]);
const COMPILED_WORLD_KEYS = Object.freeze(["world_id","description","source_review","build_reproducibility","independent_reproduction","artifact_provenance","execution_attestation","governance","expected_mechanism","flags","numeric_burden","public_signature_sha256","assurance_governance_signature_sha256"]);
const FLAG_KEYS = Object.freeze(["complete_source_review_custody","complete_build_recipe_custody","complete_independent_reproduction_custody","complete_artifact_provenance_custody","complete_execution_attestation_custody","current_assurance_lineage","complete_source_review_reproducible_build_artifact_provenance_execution_attestation_assurance"]);
const BURDEN_LOCATIONS = Object.freeze({"source_scope_unbound_executions":["source_review","source_scope_unbound_executions"],"build_recipe_toolchain_divergent_executions":["build_reproducibility","build_recipe_toolchain_divergent_executions"],"independent_reproduction_failures":["independent_reproduction","independent_reproduction_failures"],"artifact_package_entry_point_substitutions":["artifact_provenance","artifact_package_entry_point_substitutions"],"signature_provenance_scope_failures":["artifact_provenance","signature_provenance_scope_failures"],"transparency_revocation_failures":["artifact_provenance","transparency_revocation_failures"],"unreconciled_execution_attestation_decisions":["execution_attestation","unreconciled_execution_attestation_decisions"],"stale_assurance_decisions":["governance","stale_assurance_decisions"],"unsupported_assurance_decisions":["governance","unsupported_assurance_decisions"]});

const record = value => { try { return value !== null && typeof value === 'object' && !Array.isArray(value) && !nodeTypes.isProxy(value); } catch { return false; } };
const array = value => { try { return Array.isArray(value) && !nodeTypes.isProxy(value) ? value : []; } catch { return []; } };
const text = value => String(value ?? '').trim();
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const stable = value => JSON.stringify(canonical(value));
const sha256 = value => createHash('sha256').update(typeof value === 'string' ? value : stable(value)).digest('hex');
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const nonNegativeInteger = value => Number.isInteger(value) && value >= 0;
const isoDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
function requireExactKeys(value, expected, label, errors) {
  if (!record(value)) { errors.push(`${label} must be an object`); return; }
  let keys; try { keys = Object.keys(value); } catch (error) { errors.push(`${label} keys could not be inspected: ${error.message}`); return; }
  if (stable(keys.sort()) !== stable([...expected].sort())) errors.push(`${label} keys mismatch`);
}
function validateCanonicalJsonTree(value, label, errors, seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') { if (!Number.isFinite(value)) errors.push(`${label} contains a non-finite number`); return; }
  if (typeof value !== 'object') { errors.push(`${label} contains unsupported ${typeof value}`); return; }
  try { if (nodeTypes.isProxy(value)) { errors.push(`${label} contains a proxy object`); return; } } catch { errors.push(`${label} proxy state is uninspectable`); return; }
  if (seen.has(value)) { errors.push(`${label} contains a cycle or repeated object identity`); return; }
  seen.add(value);
  let proto; let keys;
  try { proto = Object.getPrototypeOf(value); keys = Reflect.ownKeys(value); } catch (error) { errors.push(`${label} cannot be inspected: ${error.message}`); return; }
  const isArray = Array.isArray(value);
  let arrayLength = null;
  if (isArray) {
    if (proto !== Array.prototype) errors.push(`${label} array prototype must be canonical`);
    try { arrayLength = value.length; } catch (error) { errors.push(`${label} array length cannot be read: ${error.message}`); return; }
    for (let index = 0; index < arrayLength; index += 1) if (!Object.prototype.hasOwnProperty.call(value, index)) errors.push(`${label} contains a sparse array hole at ${index}`);
  } else if (proto !== Object.prototype) errors.push(`${label} object prototype must be canonical`);
  for (const key of keys) {
    if (isArray && key === 'length') continue;
    if (isArray && (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= arrayLength)) {
      errors.push(`${label} contains an undeclared array property ${String(key)}`);
      continue;
    }
    if (typeof key !== 'string') { errors.push(`${label} contains a symbol key`); continue; }
    let descriptor; try { descriptor = Object.getOwnPropertyDescriptor(value, key); } catch (error) { errors.push(`${label} descriptor ${key} cannot be read: ${error.message}`); continue; }
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) { errors.push(`${label} property ${key} must be an enumerable data property`); continue; }
    validateCanonicalJsonTree(descriptor.value, `${label}.${key}`, errors, seen);
  }
}
const pick = (value, keys) => Object.fromEntries(keys.map(key => [key, value[key]]));
function projectWorld(world) {
  return {
    world_id: world.world_id,
    description: world.description,
    ...Object.fromEntries(Object.entries(SECTION_KEYS).map(([section, keys]) => [section, pick(world[section], keys)])),
    expected_mechanism: world.expected_mechanism,
    expected_flags: pick(world.expected_flags, FLAG_KEYS)
  };
}
export function projectPreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(fixture) {
  return {
    schema_version: fixture.schema_version, fixture_id: fixture.fixture_id, issue: fixture.issue, parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at, status: fixture.status, graph_effect: fixture.graph_effect, counts_toward_thesis_evidence: fixture.counts_toward_thesis_evidence,
    baseline: pick(fixture.baseline, EXPECTED_BASELINE_KEYS), interpretation_contract: pick(fixture.interpretation_contract, EXPECTED_INTERPRETATION_KEYS),
    required_refusal_rules: [...fixture.required_refusal_rules], expected_classification: pick(fixture.expected_classification, EXPECTED_CLASSIFICATION_KEYS),
    worlds: fixture.worlds.map(projectWorld)
  };
}
export const preferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixtureSnapshot = fixture => sha256(projectPreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(fixture));
function sectionComplete(section, keys) { return keys.every(key => section[key] === true); }
export function classifyPreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceWorld(world) {
  const flags = {
    complete_source_review_custody: sectionComplete(world.source_review, SECTION_BOOLEAN_KEYS.source_review),
    complete_build_recipe_custody: sectionComplete(world.build_reproducibility, SECTION_BOOLEAN_KEYS.build_reproducibility),
    complete_independent_reproduction_custody: sectionComplete(world.independent_reproduction, SECTION_BOOLEAN_KEYS.independent_reproduction),
    complete_artifact_provenance_custody: sectionComplete(world.artifact_provenance, SECTION_BOOLEAN_KEYS.artifact_provenance),
    complete_execution_attestation_custody: sectionComplete(world.execution_attestation, SECTION_BOOLEAN_KEYS.execution_attestation)
  };
  const governanceKeys = SECTION_BOOLEAN_KEYS.governance.filter(key => key !== 'binding_public_authority');
  flags.current_assurance_lineage = governanceKeys.every(key => world.governance[key] === true) && Object.values(flags).every(Boolean);
  flags.complete_source_review_reproducible_build_artifact_provenance_execution_attestation_assurance = Object.values(flags).every(Boolean);
  return flags;
}
function numericBurden(world) { return Object.fromEntries(Object.entries(BURDEN_LOCATIONS).map(([name, [section, field]]) => [name, world[section][field]])); }
function computeMetrics(worlds) {
  return {
    worlds: worlds.length,
    public_review_build_provenance_signatures: new Set(worlds.map(world => world.public_signature_sha256)).size,
    assurance_governance_signatures: new Set(worlds.map(world => world.assurance_governance_signature_sha256)).size,
    complete_assurance_worlds: worlds.filter(world => world.flags.complete_source_review_reproducible_build_artifact_provenance_execution_attestation_assurance).length,
    ...Object.fromEntries(Object.keys(BURDEN_LOCATIONS).map(key => [key, worlds.reduce((sum, world) => sum + world.numeric_burden[key], 0)])),
    binding_public_authority_worlds: worlds.filter(world => world.governance.binding_public_authority === true).length
  };
}
function seal(event, previousEventSha256) { const unsigned = { ...canonical(event), previous_event_sha256: previousEventSha256 }; return { ...unsigned, event_sha256: sha256(unsigned) }; }
function custodyChain(fixture, worlds, metrics, classification) {
  const events = [
    { event_index: 1, event_type: 'fixture_frozen', authority: 'preference_custody_pc51_analyst', evidence_class: 'candidate_inference', payload: { fixture_snapshot_sha256: preferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixtureSnapshot(fixture), graph_effect: 'none' } },
    { event_index: 2, event_type: 'public_surface_bound', authority: 'preference_custody_pc51_analyst', evidence_class: 'candidate_inference', payload: { baseline_snapshot_sha256: sha256(fixture.baseline), public_signature_count: metrics.public_review_build_provenance_signatures } },
    { event_index: 3, event_type: 'assurance_worlds_classified', authority: 'preference_custody_pc51_analyst', evidence_class: 'candidate_inference', payload: { world_count: worlds.length, assurance_governance_signature_count: metrics.assurance_governance_signatures, complete_assurance_world_count: metrics.complete_assurance_worlds } },
    { event_index: 4, event_type: 'refusal_boundary_enforced', authority: 'preference_custody_pc51_analyst', evidence_class: 'candidate_inference', payload: { required_refusal_rule_count: fixture.required_refusal_rules.length, unsupported_assurance_decisions: metrics.unsupported_assurance_decisions, binding_public_authority_worlds: metrics.binding_public_authority_worlds } },
    { event_index: 5, event_type: 'interpretation_sealed', authority: 'preference_custody_pc51_analyst', evidence_class: 'candidate_inference', payload: { classification, interpretation_contract: canonical(fixture.interpretation_contract), graph_effect: 'none', real_world_evidence_state: 'none' } }
  ];
  let previous = null; return events.map(event => { const sealed = seal(event, previous); previous = sealed.event_sha256; return sealed; });
}
export function validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(fixture) {
  const errors = [];
  validateCanonicalJsonTree(fixture, 'PC-51 fixture', errors); if (errors.length) return unique(errors);
  if (!record(fixture)) return ['PC-51 fixture must be an object'];
  requireExactKeys(fixture, EXPECTED_TOP_LEVEL_KEYS, 'PC-51 fixture', errors);
  for (const field of ['baseline','interpretation_contract','expected_classification']) if (!record(fixture[field])) errors.push(`PC-51 fixture ${field} must be an object`);
  for (const field of ['required_refusal_rules','worlds']) if (!Array.isArray(fixture[field])) errors.push(`PC-51 fixture ${field} must be an array`);
  if (Array.isArray(fixture.worlds) && fixture.worlds.some(world => !record(world))) errors.push('PC-51 fixture worlds must contain objects');
  if (errors.length) return unique(errors);
  requireExactKeys(fixture.baseline, EXPECTED_BASELINE_KEYS, 'PC-51 baseline', errors);
  requireExactKeys(fixture.interpretation_contract, EXPECTED_INTERPRETATION_KEYS, 'PC-51 interpretation contract', errors);
  requireExactKeys(fixture.expected_classification, EXPECTED_CLASSIFICATION_KEYS, 'PC-51 expected classification', errors);
  if (fixture.schema_version !== PREFERENCE_LINKAGE_SOURCE_REVIEW_REPRODUCIBLE_BUILD_ARTIFACT_PROVENANCE_EXECUTION_ATTESTATION_ASSURANCE_FIXTURE_SCHEMA_VERSION || fixture.fixture_id !== EXPECTED_FIXTURE_ID) errors.push('PC-51 fixture identity mismatch');
  if (fixture.issue !== 1268 || fixture.parent_program_issue !== 594) errors.push('PC-51 issue binding mismatch');
  if (fixture.captured_at !== '2026-08-06' || !isoDate(fixture.captured_at)) errors.push('PC-51 capture date mismatch');
  if (fixture.status !== 'synthetic_control' || fixture.graph_effect !== 'none' || fixture.counts_toward_thesis_evidence !== false) errors.push('PC-51 authority/status mismatch');
  if (stable(fixture.baseline) !== stable({"operative_release":"RELEASE-INCIDENT-V1@1","published_candidate_pairs":100,"published_interval_bearing_pairs":100,"published_nominal_coverage":0.95,"published_empirical_coverage":0.95,"published_interval_misses":5,"published_mean_interval_width":0.02,"public_source_review_status":"source_review_verified","public_build_status":"reproducible_build_verified","public_provenance_status":"artifact_provenance_verified","public_execution_attestation_status":"execution_attestation_verified","published_replay_runs":10,"published_matching_replay_runs":10,"approved_use":"longitudinal_exposure_estimation"})) errors.push('PC-51 public baseline mismatch');
  if (stable(fixture.interpretation_contract) !== stable({"what_this_is":"A synthetic source-review, reproducible-build, artifact-provenance, and execution-attestation control separating one complete-looking public assurance surface from eight incompatible review-scope, build, independent-reproduction, signature, transparency, revocation, execution, and lineage states.","what_this_is_not":"A real source-code review, reproducible-build result, artifact signature or provenance verification, transparency-log validation, execution attestation, security finding, interval-validity finding, causal effect, graph fact, allegation, or public-authority verdict.","copy_ready_caveat":"Verified-looking source-review, build, provenance, and execution-attestation badges do not establish complete review scope, independent byte reproduction, current unrevoked signature and provenance scope, package and entry-point identity, or a reconciled reviewed-source-to-output chain."})) errors.push('PC-51 interpretation contract mismatch');
  if (stable(fixture.required_refusal_rules) !== stable(REQUIRED_LINKAGE_SOURCE_REVIEW_REPRODUCIBLE_BUILD_ARTIFACT_PROVENANCE_EXECUTION_ATTESTATION_ASSURANCE_REFUSAL_RULES)) errors.push('PC-51 refusal-rule ledger mismatch');
  if (stable(fixture.expected_classification) !== stable({"public_repository_identifies_complete_review_scope":false,"public_commit_identifies_reproducible_build":false,"public_reproducible_build_badge_identifies_independent_byte_reproduction":false,"public_artifact_digest_identifies_package_and_entry_point":false,"public_signature_establishes_complete_provenance":false,"transparency_receipt_establishes_current_unrevoked_validity":false,"execution_attestation_establishes_source_to_output_identity":false,"matching_replay_outputs_establish_source_to_execution_identity":false,"published_coverage_establishes_real_world_effect":false,"security_compromise_established":false,"graph_effect_present":false,"binding_public_authority_present":false,"complete_source_review_reproducible_build_artifact_provenance_execution_attestation_assurance_supported_in_at_least_one_world":true})) errors.push('PC-51 expected classification mismatch');
  if (fixture.worlds.length !== WORLD_IDS.length) errors.push('PC-51 must contain exactly eight worlds');
  const ids = fixture.worlds.map(world => world.world_id); if (stable(ids) !== stable(WORLD_IDS)) errors.push('PC-51 world order or identity mismatch');
  for (const world of fixture.worlds) {
    requireExactKeys(world, EXPECTED_WORLD_KEYS, `PC-51 world ${world.world_id}`, errors);
    let containersValid = true;
    for (const [section, keys] of Object.entries(SECTION_KEYS)) {
      if (!record(world[section])) { errors.push(`PC-51 world ${world.world_id} ${section} must be an object`); containersValid = false; continue; }
      requireExactKeys(world[section], keys, `PC-51 world ${world.world_id} ${section}`, errors);
      for (const key of SECTION_BOOLEAN_KEYS[section]) if (typeof world[section][key] !== 'boolean') errors.push(`PC-51 world ${world.world_id} ${section}.${key} must be boolean`);
    }
    if (!record(world.expected_flags)) { errors.push(`PC-51 world ${world.world_id} expected flags must be an object`); containersValid = false; }
    else requireExactKeys(world.expected_flags, FLAG_KEYS, `PC-51 world ${world.world_id} expected flags`, errors);
    if (!containersValid) continue;
    for (const [name, [section, field]] of Object.entries(BURDEN_LOCATIONS)) if (!nonNegativeInteger(world[section][field])) errors.push(`PC-51 world ${world.world_id} burden ${name} must be a non-negative integer`);
    if (world.expected_mechanism !== WORLD_MECHANISMS[world.world_id]) errors.push(`PC-51 world ${world.world_id} mechanism mismatch`);
    const flags = classifyPreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceWorld(world); if (stable(flags) !== stable(world.expected_flags)) errors.push(`PC-51 world ${world.world_id} flag classification mismatch`);
    const burden = numericBurden(world); if (stable(burden) !== stable(EXPECTED_WORLD_BURDENS[world.world_id])) errors.push(`PC-51 world ${world.world_id} burden allocation mismatch`);
    if (world.governance.binding_public_authority !== false) errors.push(`PC-51 world ${world.world_id} binding authority must remain false`);
  }
  if (errors.length) return unique(errors);
  const snapshot = preferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixtureSnapshot(fixture); if (snapshot !== EXPECTED_FIXTURE_SNAPSHOT_SHA256) errors.push(`PC-51 fixture snapshot mismatch: ${snapshot}`);
  return unique(errors);
}
export function compilePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(fixture) {
  const errors = validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(fixture); if (errors.length) throw new Error(errors.join('\n'));
  const publicSignature = sha256(fixture.baseline);
  const worlds = fixture.worlds.map(world => ({
    world_id: world.world_id, description: world.description,
    ...Object.fromEntries(Object.keys(SECTION_KEYS).map(section => [section, canonical(world[section])])),
    expected_mechanism: world.expected_mechanism, flags: classifyPreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceWorld(world), numeric_burden: numericBurden(world),
    public_signature_sha256: publicSignature, assurance_governance_signature_sha256: sha256(projectWorld(world))
  }));
  const metrics = computeMetrics(worlds); const classification = canonical(fixture.expected_classification); const chain = custodyChain(fixture, worlds, metrics, classification);
  return {
    schema_version: PREFERENCE_LINKAGE_SOURCE_REVIEW_REPRODUCIBLE_BUILD_ARTIFACT_PROVENANCE_EXECUTION_ATTESTATION_ASSURANCE_BUILD_SCHEMA_VERSION, fixture_id: fixture.fixture_id, issue: fixture.issue, parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at, status: 'synthetic_source_review_reproducible_build_artifact_provenance_execution_attestation_control_compiled', graph_effect: 'none', counts_toward_thesis_evidence: false,
    conclusion_generated: false, real_world_evidence_state: 'none', fixture_snapshot_sha256: preferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixtureSnapshot(fixture), baseline: canonical(fixture.baseline), baseline_snapshot_sha256: publicSignature,
    public_signature_count: metrics.public_review_build_provenance_signatures, world_count: worlds.length, assurance_governance_signature_count: metrics.assurance_governance_signatures,
    complete_assurance_world_count: metrics.complete_assurance_worlds, worlds, metrics, classification, required_refusal_rules: [...fixture.required_refusal_rules],
    custody_chain: chain, custody_chain_head_sha256: chain.at(-1).event_sha256, interpretation_contract: canonical(fixture.interpretation_contract)
  };
}
function validateCustodyChain(build, errors) {
  if (!Array.isArray(build.custody_chain) || build.custody_chain.length !== 5) { errors.push('PC-51 custody chain must contain five events'); return; }
  if (build.custody_chain.some(event => !record(event))) { errors.push('PC-51 custody events must be objects'); return; }
  let previous = null; for (const [index,event] of build.custody_chain.entries()) { if (event.event_index !== index + 1) errors.push(`PC-51 custody event ${index} index mismatch`); if (event.previous_event_sha256 !== previous) errors.push(`PC-51 custody event ${index} previous hash mismatch`); const { event_sha256, ...unsigned } = event; if (event_sha256 !== sha256(unsigned)) errors.push(`PC-51 custody event ${index} hash mismatch`); previous = event_sha256; }
  if (build.custody_chain_head_sha256 !== previous) errors.push('PC-51 custody chain head mismatch');
}
export function validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceBuild(build, fixture) {
  const errors = []; validateCanonicalJsonTree(build, 'PC-51 build', errors); if (errors.length) return unique(errors);
  if (!record(build)) return ['PC-51 build must be an object'];
  requireExactKeys(build, BUILD_KEYS, 'PC-51 build', errors);
  for (const field of ['worlds','required_refusal_rules','custody_chain']) if (!Array.isArray(build[field])) errors.push(`PC-51 build ${field} must be an array`);
  for (const field of ['baseline','metrics','classification','interpretation_contract']) if (!record(build[field])) errors.push(`PC-51 build ${field} must be an object`);
  if (Array.isArray(build.worlds) && build.worlds.some(world => !record(world))) errors.push('PC-51 compiled worlds must contain objects');
  if (Array.isArray(build.custody_chain) && build.custody_chain.some(event => !record(event))) errors.push('PC-51 custody events must contain objects');
  if (errors.length) return unique(errors);
  for (const [index, world] of build.worlds.entries()) {
    requireExactKeys(world, COMPILED_WORLD_KEYS, `PC-51 compiled world ${index}`, errors);
    for (const [section, keys] of Object.entries(SECTION_KEYS)) requireExactKeys(world[section], keys, `PC-51 compiled world ${index} ${section}`, errors);
    requireExactKeys(world.flags, FLAG_KEYS, `PC-51 compiled world ${index} flags`, errors);
    requireExactKeys(world.numeric_burden, Object.keys(BURDEN_LOCATIONS), `PC-51 compiled world ${index} numeric burden`, errors);
  }
  if (errors.length) return unique(errors);
  errors.push(...validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(fixture)); if (errors.length) return unique(errors);
  let expected; try { expected = compilePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(fixture); } catch (error) { errors.push(`PC-51 expected build could not compile: ${error.message}`); return unique(errors); }
  if (stable(build) !== stable(expected)) errors.push('PC-51 build differs from deterministic compilation');
  if (stable(build.metrics) !== stable(EXPECTED_LINKAGE_SOURCE_REVIEW_REPRODUCIBLE_BUILD_ARTIFACT_PROVENANCE_EXECUTION_ATTESTATION_ASSURANCE_METRICS)) errors.push('PC-51 metrics mismatch');
  for (const [key,value] of Object.entries(LINKAGE_SOURCE_REVIEW_REPRODUCIBLE_BUILD_ARTIFACT_PROVENANCE_EXECUTION_ATTESTATION_ASSURANCE_FALSE_CLASSIFICATIONS)) if (build.classification?.[key] !== value) errors.push(`PC-51 classification ${key} must remain ${value}`);
  if (build.classification?.complete_source_review_reproducible_build_artifact_provenance_execution_attestation_assurance_supported_in_at_least_one_world !== true) errors.push('PC-51 must preserve one complete synthetic world');
  validateCustodyChain(build, errors); return unique(errors);
}
export function renderPreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceMarkdown(build) {
  const metricLines = Object.entries(build.metrics).map(([key,value]) => `| ${key} | ${value} |`).join('\n');
  const worldLines = build.worlds.map(world => `| ${world.world_id} | ${world.expected_mechanism} | ${world.flags.complete_source_review_reproducible_build_artifact_provenance_execution_attestation_assurance ? 'complete' : 'refused'} | ${Object.values(world.numeric_burden).reduce((sum,value)=>sum+value,0)} |`).join('\n');
  return `# PC-51 source review, reproducible build, artifact provenance, and execution-attestation custody

Synthetic control only. Graph effect: **${build.graph_effect}**. Real-world evidence: **${build.real_world_evidence_state}**.

## Metrics

| Metric | Value |
| --- | ---: |
${metricLines}

## Eight incompatible worlds

| World | Mechanism | Complete assurance | Numeric burden |
| --- | --- | --- | ---: |
${worldLines}

Only one synthetic world satisfies complete review-scope, reproducible-build, independent-reproduction, artifact-provenance, execution-attestation, correction, and current-lineage custody. Public badges remain nonproof of the executed bytes or a real-world security or validity conclusion.
`;
}
