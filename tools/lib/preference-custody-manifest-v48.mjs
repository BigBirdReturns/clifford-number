import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';
import {
  loadPreferenceCustodyV46SourceBundle,
  validatePreferenceCustodyManifestV47,
  validatePreferenceCustodyManifestV47Build
} from './preference-custody-manifest-v47.mjs';
import {
  PREFERENCE_LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_BUILD_SCHEMA_VERSION,
  REQUIRED_LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_REFUSAL_RULES,
  validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityBuild,
  validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture
} from './preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V48_SCHEMA_VERSION = 'preference-custody-control-manifest-v48@1';
export const PREFERENCE_CUSTODY_MANIFEST_V48_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v48-build@1';
export const PREFERENCE_CUSTODY_V47_SOURCE_BUNDLE_SCHEMA_VERSION = 'preference-custody-v47-source-bundle@1';

const EXPECTED_MANIFEST_SNAPSHOT_SHA256 = 'a16f432cdd0e663cc89e4bcd04368c2daec80db171abe47d6f2b4de46c188744';
const EXPECTED_MANIFEST_LITERAL = Object.freeze({"schema_version":"preference-custody-control-manifest-v48@1","manifest_id":"preference-custody-laboratory-floor-v48","issue":594,"control_issue":1197,"captured_at":"2026-08-05","status":"synthetic_control_floor_extension","graph_effect":"none","counts_toward_thesis_evidence":false,"base_floor":{"manifest_id":"preference-custody-laboratory-floor-v47","source_manifest_path":"data/research/preference-custody/control-manifest-v47.json","expected_build_schema":"preference-custody-control-manifest-v47-build@1","expected_control_count":49},"extension_control":{"control_id":"PC-50","fixture_id":"same-linkage-artifact-build-runtime-status-different-source-dependency-environment-execution-states-v1","failure_class":"linkage_interval_source_review_build_recipe_toolchain_artifact_signature_container_dependency_environment_runtime_loaded_module_execution_attestation_and_lineage_equifinality","source_fixture_path":"data/research/preference-custody/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.fixture.json","build_artifact_path":"build/research/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.json","expected_build_schema":"preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance-build@1","required_refusal_rules":["one_repository_url_is_not_the_reviewed_commit_source_tree_file_set_or_executed_source","one_commit_hash_is_not_a_reproducible_build","one_reviewed_diff_is_not_complete_source_custody_when_generated_inputs_submodules_vendored_code_or_build_scripts_are_unbound","one_build_recipe_is_not_a_reproducible_build_without_exact_toolchain_flags_environment_generated_inputs_and_independent_byte_comparison","one_artifact_digest_is_not_the_executed_artifact_entry_point_package_model_asset_plugin_resource_or_container_layer_set","one_signature_is_not_complete_provenance_when_signer_scope_transparency_revocation_and_artifact_binding_are_incomplete","one_package_or_image_tag_is_not_immutable_package_manifest_layer_base_image_and_registry_custody","one_lockfile_is_not_the_complete_resolved_dependency_graph_package_checksum_native_library_and_supply_chain_provenance","one_container_image_is_not_the_executed_runtime_when_kernel_container_runtime_mounts_secrets_configuration_and_loaded_modules_differ","one_runtime_version_is_not_complete_environment_identity","matching_top_level_artifact_metadata_is_not_loaded_module_or_invocation_equivalence","one_startup_command_is_not_complete_execution_custody_when_import_resolution_plugin_discovery_cache_filesystem_clock_or_services_alter_execution","one_successful_replay_is_not_source_to_execution_identity_assurance","historical_executable_identity_is_not_current_after_source_build_artifact_dependency_package_image_environment_runtime_module_service_release_or_use_succession","artifact_or_runtime_identity_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent","binding_public_authority_requires_separate_current_public_authorization_receipts","synthetic_artifact_runtime_burdens_are_not_real_world_defect_prevalence_security_compromise_causal_effect_or_institutional_performance_estimates","execution_attestation_requires_source_build_artifact_package_container_runtime_loaded_module_invocation_output_correction_and_lineage_reconciliation"]},"identification_requirement":{"stage":"linkage_interval_executable_artifact_build_dependency_environment_and_runtime_identity","required_state":"bound_reviewed_source_reproducible_build_artifact_signature_package_dependency_container_environment_runtime_loaded_module_invocation_execution_attestation_correction_and_current_lineage_custody","refused_inference":"public_artifact_build_dependency_runtime_and_execution_badges_do_not_identify_the_reviewed_source_reproduced_build_or_executed_bytes"},"frontier_transition":{"resolved_base_frontier":"linkage_interval_executable_artifact_build_dependency_environment_and_runtime_identity_governance","successor_frontiers":["linkage_interval_source_review_build_reproducibility_artifact_signature_provenance_and_execution_attestation_assurance","linkage_interval_dependency_supply_chain_container_environment_loaded_module_service_snapshot_and_runtime_succession_governance"]},"real_case_requirements_added":["linkage_interval_v48_artifact_identity_owner_version_and_release","linkage_interval_v48_repository_identity_and_review_scope","linkage_interval_v48_commit_parent_and_source_tree_custody","linkage_interval_v48_reviewed_file_set_and_blob_identity_custody","linkage_interval_v48_diff_review_disposition_and_approval_receipts","linkage_interval_v48_submodule_vendored_and_generated_source_custody","linkage_interval_v48_build_recipe_identity_and_version","linkage_interval_v48_build_graph_and_generated_input_ledger","linkage_interval_v48_toolchain_identity_and_provenance","linkage_interval_v48_compiler_linker_and_flag_custody","linkage_interval_v48_optimization_timestamp_and_nondeterminism_policy","linkage_interval_v48_hermeticity_and_build_network_policy","linkage_interval_v48_reproducible_build_owner_and_attestation","linkage_interval_v48_independent_builder_and_clean_room_reproduction","linkage_interval_v48_reproduced_byte_comparison_and_divergence_disposition","linkage_interval_v48_artifact_format_digest_and_content_identity","linkage_interval_v48_signature_signer_scope_and_key_identity","linkage_interval_v48_provenance_transparency_revocation_and_statement_scope","linkage_interval_v48_package_identity_version_and_registry_receipt","linkage_interval_v48_executable_and_entry_point_identity","linkage_interval_v48_model_asset_plugin_and_generated_resource_set","linkage_interval_v48_container_manifest_identity","linkage_interval_v48_container_layer_and_base_image_identity","linkage_interval_v48_registry_mirror_and_package_distribution_custody","linkage_interval_v48_dependency_lock_and_resolver_identity","linkage_interval_v48_direct_and_transitive_dependency_graph","linkage_interval_v48_package_version_and_checksum_ledger","linkage_interval_v48_dependency_registry_and_mirror_provenance","linkage_interval_v48_vendored_code_and_native_library_set","linkage_interval_v48_build_script_postinstall_and_generated_binary_actions","linkage_interval_v48_license_advisory_and_supply_chain_provenance","linkage_interval_v48_operating_system_image_and_kernel_identity","linkage_interval_v48_architecture_instruction_set_and_platform_policy","linkage_interval_v48_language_runtime_vm_standard_and_system_libraries","linkage_interval_v48_accelerator_driver_and_container_runtime_identity","linkage_interval_v48_environment_variable_parameter_and_configuration_custody","linkage_interval_v48_secret_version_and_injection_custody","linkage_interval_v48_locale_timezone_encoding_and_collation_policy","linkage_interval_v48_working_directory_filesystem_metadata_and_order","linkage_interval_v48_mount_permission_and_runtime_network_policy","linkage_interval_v48_startup_command_and_invocation_argument_custody","linkage_interval_v48_import_resolution_and_dynamic_loader_path","linkage_interval_v48_loaded_module_and_shared_library_ledger","linkage_interval_v48_plugin_discovery_and_cache_state_custody","linkage_interval_v48_service_endpoint_response_snapshot_retry_timeout_and_clock","linkage_interval_v48_source_build_artifact_package_container_runtime_module_execution_output_attestation_chain","linkage_interval_v48_negative_controls_alternate_builders_and_substitution_perturbation_tests","linkage_interval_v48_monitoring_attestation_failure_quarantine_rollback_and_certificate_withdrawal","linkage_interval_v48_corrected_rebuild_republication_retirement_appeal_and_durability","linkage_interval_v48_source_build_dependency_package_image_environment_runtime_module_service_release_use_succession_and_public_claim_authority"],"prohibited_inferences":["Do not treat floor v48 or PC-50 as evidence that any named person organization institution platform network source system artifact or deployment executed reviewed or reproducibly built bytes.","Do not infer the reviewed source tree from a repository URL, branch label, release tag, commit label, or partial diff.","Do not infer a reproducible build from one build recipe or one successful build without exact toolchain, inputs, environment, and independent byte comparison.","Do not infer the executed artifact from one digest or signature when package, entry point, plugin, model asset, generated resource, or container layers remain unbound.","Do not infer complete provenance from one signature without signer scope, transparency, revocation, and statement-to-artifact binding.","Do not infer immutable package or image identity from a mutable tag.","Do not infer the complete resolved dependency graph from one lockfile.","Do not infer supply-chain integrity from package versions without checksums, registries, vendored code, native libraries, and build-action custody.","Do not infer runtime identity from one container image when kernel, mounts, secrets, configuration, system libraries, or loaded modules differ.","Do not infer complete environment identity from one runtime version.","Do not infer loaded-module or invocation equivalence from matching top-level artifact metadata.","Do not infer source-to-output identity from one startup command or one successful replay.","Do not treat the absence of an attestation failure record as evidence that no source, build, artifact, dependency, environment, loader, service, or invocation drift occurred.","Do not infer current executable identity after source, build, artifact, dependency, package, image, environment, runtime, module, service, release, or use succession.","Do not infer public authorization from complete source, build, artifact, dependency, environment, runtime, or execution custody.","Do not infer coercion manipulation discrimination breach misconduct coordination common purpose intent or security compromise from artifact or runtime identity failure.","Do not treat synthetic artifact-runtime burdens as real-world defect prevalence, security compromise rates, causal effects, welfare trajectories, or institutional-performance estimates."],"interpretation_contract":{"contract_id":"preference-custody-control-manifest-v48@1","what_this_is":"A compositional successor floor preserving the qualified forty-nine-control v47 base and adding PC-50 source-review, reproducible-build, artifact, dependency, container, environment, loaded-module, execution-attestation, correction, and current-lineage equifinality.","what_this_is_not":"A real source-code review, reproducible-build audit, artifact signature verification, dependency or supply-chain attestation, runtime inspection, loaded-module audit, security finding, interval-validity finding, causal effect, longitudinal history, graph fact, allegation, or public-authority verdict.","copy_ready_caveat":"Preference Custody floor v48 composes the qualified v47 controls with PC-50. It separates complete-looking artifact, build, dependency, runtime, and execution badges from reviewed source, exact and independently reproduced builds, executed bytes, complete package and dependency identity, immutable images and environments, loaded modules, invocation receipts, correction, and current source-to-output succession."}});
const EXPECTED_MANIFEST_KEYS = Object.freeze(["schema_version","manifest_id","issue","control_issue","captured_at","status","graph_effect","counts_toward_thesis_evidence","base_floor","extension_control","identification_requirement","frontier_transition","real_case_requirements_added","prohibited_inferences","interpretation_contract"]);
const EXPECTED_BASE_FLOOR_KEYS = Object.freeze(["manifest_id","source_manifest_path","expected_build_schema","expected_control_count"]);
const EXPECTED_EXTENSION_KEYS = Object.freeze(["control_id","fixture_id","failure_class","source_fixture_path","build_artifact_path","expected_build_schema","required_refusal_rules"]);
const EXPECTED_IDENTIFICATION_KEYS = Object.freeze(["stage","required_state","refused_inference"]);
const EXPECTED_FRONTIER_KEYS = Object.freeze(["resolved_base_frontier","successor_frontiers"]);
const EXPECTED_INTERPRETATION_KEYS = Object.freeze(["contract_id","what_this_is","what_this_is_not","copy_ready_caveat"]);
const EXPECTED_SOURCE_BUNDLE_KEYS = Object.freeze(['manifest','baseBuild','targetBuild','targetFixture','baseSources']);
const REQUIRED_CONTROL_IDS = Object.freeze(Array.from({ length: 50 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`));
const RESOLVED_FRONTIER = "linkage_interval_executable_artifact_build_dependency_environment_and_runtime_identity_governance";
const REQUIRED_SUCCESSORS = Object.freeze(["linkage_interval_source_review_build_reproducibility_artifact_signature_provenance_and_execution_attestation_assurance","linkage_interval_dependency_supply_chain_container_environment_loaded_module_service_snapshot_and_runtime_succession_governance"]);
const PRESERVED_FRONTIERS = Object.freeze(["linkage_interval_numerical_determinism_seed_prng_parallelism_hardware_precision_and_replay_equivalence_governance","linkage_interval_deployment_applicability_monitoring_shift_trigger_abstention_rollback_and_release_succession_governance","linkage_interval_event_state_competing_event_censoring_abstention_and_ambiguity_governance","linkage_interval_estimand_population_unit_horizon_support_tail_coverage_meaning_and_interpretation_governance","linkage_interval_dependence_resampling_effective_sample_size_multiplicity_adaptive_selection_and_simultaneous_coverage_governance","linkage_calibration_drift_subgroup_monitoring_recalibration_trigger_rollback_and_certificate_withdrawal_governance"]);

const BUILD_KEYS = Object.freeze(['schema_version','manifest_id','issue','control_issue','captured_at','status','graph_effect','counts_toward_thesis_evidence','conclusion_generated','real_world_evidence_state','control_count','controls','composition','control_integrity','identification_requirements','refusal_rule_union','open_frontiers','frontier_transition','promotion_boundary','custody_chain','custody_chain_head_sha256','prohibited_inferences','interpretation_contract']);
const COMPOSITION_KEYS = Object.freeze([
  'base_manifest_id','base_schema_version','base_control_count','extension_control_id',
  'manifest_snapshot_sha256','base_floor_snapshot_sha256','extension_snapshot_sha256',
  'v47_source_bundle_schema_version','v47_source_bundle_sha256','base_controls_sha256',
  'base_promotion_requirements_sha256','base_refusal_rule_union_sha256',
  'base_identification_requirements_sha256','base_open_frontiers_sha256',
  'base_prohibited_inferences_sha256','base_interpretation_contract_sha256',
  'base_promotion_requirement_count','added_promotion_requirement_count',
  'final_promotion_requirement_count','base_open_frontiers'
]);
const CONTROL_INTEGRITY_KEYS = Object.freeze([
  'base_floor_qualified','base_integrity_preserved','v47_complete_source_bundle_bound',
  'all_graph_effect_none','no_thesis_evidence_consumption','no_real_world_conclusion',
  'no_preference_change_claim','no_intent_inference','no_security_compromise_claim',
  'all_required_pc50_refusal_rules_present','complete_executable_identity_assurance_path_preserved',
  'numerical_determinism_successor_preserved','deployment_successor_preserved',
  'event_state_successor_preserved','estimand_scope_successor_preserved',
  'dependence_multiplicity_successor_preserved','calibration_drift_successor_preserved'
]);
const PROMOTION_KEYS = Object.freeze(['promotion_authority','promotion_requirement_count','real_case_requires','laboratory_controls_are_real_world_evidence']);
const INPUT_VALIDATION_CACHE = new Map();

const record = value => { try { return value !== null && typeof value === 'object' && !Array.isArray(value) && !nodeTypes.isProxy(value); } catch { return false; } };
const object = value => record(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const sorted = values => [...values].sort((left, right) => String(left).localeCompare(String(right)));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const stable = value => JSON.stringify(canonical(value));
const sha256 = value => createHash('sha256').update(typeof value === 'string' ? value : stable(value)).digest('hex');
const isoDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
function requireExactKeys(value, expected, label, errors) {
  let keys; try { keys = Reflect.ownKeys(value); } catch { errors.push(`${label} must be inspectable`); return; }
  const strings = keys.filter(key => typeof key === 'string');
  if (strings.length !== keys.length || stable(sorted(strings)) !== stable(sorted(expected)) || strings.length !== expected.length) errors.push(`${label} key ledger mismatch`);
}
function validateCanonicalJsonTree(value, label, errors, seen = new WeakSet()) {
  const walk = (current, path) => {
    if (current === null || typeof current === 'string' || typeof current === 'boolean') return;
    if (typeof current === 'number') { if (!Number.isFinite(current)) errors.push(`${path} must contain finite JSON numbers`); return; }
    if (typeof current !== 'object') { errors.push(`${path} must contain only canonical JSON values`); return; }
    if (nodeTypes.isProxy(current)) { errors.push(`${path} must not contain proxy-backed data`); return; }
    if (seen.has(current)) { errors.push(`${path} must not contain cycles or repeated identities`); return; }
    seen.add(current);
    let keys; let prototype; try { keys = Reflect.ownKeys(current); prototype = Object.getPrototypeOf(current); } catch { errors.push(`${path} must be inspectable`); return; }
    if (Array.isArray(current)) {
      if (prototype !== Array.prototype) errors.push(`${path} must use the canonical array prototype`);
      const expectedKeys = new Set(['length', ...Array.from({ length: current.length }, (_, index) => String(index))]);
      if (keys.length !== expectedKeys.size || keys.some(key => typeof key !== 'string' || !expectedKeys.has(key))) errors.push(`${path} array key ledger mismatch`);
      for (let index = 0; index < current.length; index += 1) {
        if (!Object.hasOwn(current, index)) { errors.push(`${path}[${index}] must not be sparse`); continue; }
        let descriptor; try { descriptor = Object.getOwnPropertyDescriptor(current, String(index)); } catch { descriptor = null; }
        if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) { errors.push(`${path}[${index}] must be an enumerable data property`); continue; }
        walk(descriptor.value, `${path}[${index}]`);
      }
      return;
    }
    if (prototype !== Object.prototype) errors.push(`${path} must use the canonical object prototype`);
    for (const key of keys) {
      if (typeof key !== 'string') { errors.push(`${path} must not contain symbol keys`); continue; }
      let descriptor; try { descriptor = Object.getOwnPropertyDescriptor(current, key); } catch { descriptor = null; }
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) { errors.push(`${path}.${key} must be an enumerable data property`); continue; }
      walk(descriptor.value, `${path}.${key}`);
    }
  };
  walk(value, label);
}
function collectCaptureDates(value, path, output, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (!Array.isArray(value) && Object.hasOwn(value, 'captured_at')) output.push([`${path}.captured_at`, value.captured_at]);
  if (Array.isArray(value)) value.forEach((item, index) => collectCaptureDates(item, `${path}[${index}]`, output, seen));
  else Object.entries(value).forEach(([key, item]) => collectCaptureDates(item, `${path}.${key}`, output, seen));
}
function validateChronology(floorDate, values) {
  const errors = []; if (!isoDate(floorDate)) return errors; const dates = [];
  values.forEach(([path, value]) => collectCaptureDates(value, path, dates));
  for (const [path, date] of dates) {
    if (!isoDate(date)) errors.push(`PC-50 source chronology invalid date: ${path}`);
    else if (date > floorDate) errors.push(`PC-50 source snapshot postdates floor: ${path} ${date} > ${floorDate}`);
  }
  return errors;
}
function seal(event, previousEventSha256) { const unsigned = { ...canonical(event), previous_event_sha256: previousEventSha256 }; return { ...unsigned, event_sha256: sha256(unsigned) }; }

export function loadPreferenceCustodyV47SourceBundle(load) {
  return {
    manifest: load('data/research/preference-custody/control-manifest-v47.json'),
    baseBuild: load('build/research/preference-custody-laboratory-floor-v46.json'),
    targetBuild: load('build/research/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.json'),
    targetFixture: load('data/research/preference-custody/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.fixture.json'),
    baseSources: loadPreferenceCustodyV46SourceBundle(load)
  };
}
export const preferenceCustodyV47SourceBundleSnapshot = sourceBundle => sha256({ schema_version: PREFERENCE_CUSTODY_V47_SOURCE_BUNDLE_SCHEMA_VERSION, source_bundle: sourceBundle });
export const preferenceCustodyManifestV48Snapshot = manifest => sha256(manifest);

export function validatePreferenceCustodyManifestV48(manifest) {
  const errors = [];
  validateCanonicalJsonTree(manifest, 'Preference Custody v48 manifest', errors);
  if (errors.length) return unique(errors);
  if (!record(manifest)) return ['Preference Custody v48 manifest must be an object'];

  requireExactKeys(manifest, EXPECTED_MANIFEST_KEYS, 'Preference Custody v48 manifest', errors);
  for (const field of ['base_floor', 'extension_control', 'identification_requirement', 'frontier_transition', 'interpretation_contract']) {
    if (!record(manifest[field])) errors.push(`Preference Custody v48 manifest ${field} must be an object`);
  }
  for (const field of ['real_case_requirements_added', 'prohibited_inferences']) {
    if (!Array.isArray(manifest[field])) errors.push(`Preference Custody v48 manifest ${field} must be an array`);
  }
  if (record(manifest.extension_control) && !Array.isArray(manifest.extension_control.required_refusal_rules)) {
    errors.push('Preference Custody v48 extension required_refusal_rules must be an array');
  }
  if (record(manifest.frontier_transition) && !Array.isArray(manifest.frontier_transition.successor_frontiers)) {
    errors.push('Preference Custody v48 frontier transition successor_frontiers must be an array');
  }
  if (errors.length) return unique(errors);

  requireExactKeys(manifest.base_floor, EXPECTED_BASE_FLOOR_KEYS, 'Preference Custody v48 base floor', errors);
  requireExactKeys(manifest.extension_control, EXPECTED_EXTENSION_KEYS, 'Preference Custody v48 extension', errors);
  requireExactKeys(manifest.identification_requirement, EXPECTED_IDENTIFICATION_KEYS, 'Preference Custody v48 identification requirement', errors);
  requireExactKeys(manifest.frontier_transition, EXPECTED_FRONTIER_KEYS, 'Preference Custody v48 frontier transition', errors);
  requireExactKeys(manifest.interpretation_contract, EXPECTED_INTERPRETATION_KEYS, 'Preference Custody v48 interpretation contract', errors);
  if (errors.length) return unique(errors);

  const baseFloor = manifest.base_floor;
  const extension = manifest.extension_control;
  const transition = manifest.frontier_transition;
  if (manifest.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V48_SCHEMA_VERSION || manifest.manifest_id !== 'preference-custody-laboratory-floor-v48') errors.push('Preference Custody v48 identity mismatch');
  if (manifest.issue !== 594 || manifest.control_issue !== 1197) errors.push('Preference Custody v48 issue binding mismatch');
  if (manifest.captured_at !== '2026-08-05' || !isoDate(manifest.captured_at)) errors.push('Preference Custody v48 capture date mismatch');
  if (manifest.status !== 'synthetic_control_floor_extension' || manifest.graph_effect !== 'none' || manifest.counts_toward_thesis_evidence !== false) errors.push('Preference Custody v48 authority/status mismatch');
  if (baseFloor.manifest_id !== 'preference-custody-laboratory-floor-v47' || baseFloor.source_manifest_path !== 'data/research/preference-custody/control-manifest-v47.json' || baseFloor.expected_build_schema !== 'preference-custody-control-manifest-v47-build@1' || baseFloor.expected_control_count !== 49) errors.push('Preference Custody v48 base-floor contract mismatch');
  if (extension.control_id !== 'PC-50' || extension.fixture_id !== "same-linkage-artifact-build-runtime-status-different-source-dependency-environment-execution-states-v1" || extension.expected_build_schema !== PREFERENCE_LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_BUILD_SCHEMA_VERSION) errors.push('Preference Custody v48 extension contract mismatch');
  if (stable(extension.required_refusal_rules) !== stable(REQUIRED_LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_REFUSAL_RULES)) errors.push('Preference Custody v48 extension refusal-rule ledger mismatch');
  if (transition.resolved_base_frontier !== RESOLVED_FRONTIER || stable(transition.successor_frontiers) !== stable(REQUIRED_SUCCESSORS)) errors.push('Preference Custody v48 frontier transition mismatch');
  if (manifest.real_case_requirements_added.length !== 50 || unique(manifest.real_case_requirements_added).length !== 50) errors.push('Preference Custody v48 must add exactly 50 unique promotion requirements');
  if (manifest.prohibited_inferences.length !== 17 || unique(manifest.prohibited_inferences).length !== 17) errors.push('Preference Custody v48 prohibited-inference ledger mismatch');
  const snapshot = preferenceCustodyManifestV48Snapshot(manifest);
  if (snapshot !== EXPECTED_MANIFEST_SNAPSHOT_SHA256 || stable(manifest) !== stable(EXPECTED_MANIFEST_LITERAL)) errors.push(`Preference Custody v48 manifest snapshot mismatch: ${snapshot}`);
  return unique(errors);
}

function validateInputBundle(manifest, liveBaseBuild, liveTargetBuild, liveTargetFixture, liveBaseSources) {
  const manifestErrors = validatePreferenceCustodyManifestV48(manifest); if (manifestErrors.length) return manifestErrors;
  const errors = [];
  const liveRoot = { baseBuild: liveBaseBuild, targetBuild: liveTargetBuild, targetFixture: liveTargetFixture, baseSources: liveBaseSources };
  validateCanonicalJsonTree(liveRoot, 'Preference Custody v48 input roots', errors); if (errors.length) return unique(errors);
  let snapshot; try { snapshot = structuredClone(liveRoot); } catch (error) { return [`Preference Custody v48 input snapshot failed closed: ${error.message}`]; }
  validateCanonicalJsonTree(snapshot, 'Preference Custody v48 input snapshot', errors); if (errors.length) return unique(errors);
  let liveDigest; let snapshotDigest;
  try { liveDigest = sha256(liveRoot); snapshotDigest = sha256(snapshot); } catch (error) { return [`Preference Custody v48 input digest failed closed: ${error.message}`]; }
  if (liveDigest !== snapshotDigest) return ['Preference Custody v48 live input differs from its custody snapshot'];
  const cached = INPUT_VALIDATION_CACHE.get(snapshotDigest); if (cached) return [...cached];
  const { baseBuild, targetBuild, targetFixture, baseSources } = snapshot;
  requireExactKeys(baseSources, EXPECTED_SOURCE_BUNDLE_KEYS, 'Preference Custody v47 source bundle', errors);
  errors.push(...validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(targetFixture));
  errors.push(...validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityBuild(targetBuild, targetFixture));
  if (baseBuild?.schema_version !== manifest.base_floor.expected_build_schema || baseBuild?.manifest_id !== manifest.base_floor.manifest_id || baseBuild?.control_count !== manifest.base_floor.expected_control_count) errors.push('Preference Custody v48 base build identity mismatch');
  if (baseSources?.manifest?.manifest_id !== 'preference-custody-laboratory-floor-v47') errors.push('Preference Custody v47 source manifest identity mismatch');
  try {
    errors.push(...validatePreferenceCustodyManifestV47(baseSources.manifest));
    errors.push(...validatePreferenceCustodyManifestV47Build(baseBuild, baseSources.manifest, baseSources.baseBuild, baseSources.targetBuild, baseSources.targetFixture, baseSources.baseSources));
  } catch (error) { errors.push(`Preference Custody v47 source validation failed closed: ${error.message}`); }
  if (!array(baseBuild?.open_frontiers).includes(RESOLVED_FRONTIER)) errors.push('Preference Custody v47 base does not expose the PC-50 frontier');
  for (const frontier of PRESERVED_FRONTIERS) if (!array(baseBuild?.open_frontiers).includes(frontier)) errors.push(`Preference Custody v47 base missing preserved frontier ${frontier}`);
  errors.push(...validateChronology(manifest.captured_at, [['baseBuild', baseBuild], ['targetBuild', targetBuild], ['targetFixture', targetFixture], ['baseSources', baseSources]]));
  let liveAfter; try { liveAfter = sha256(liveRoot); } catch (error) { errors.push(`Preference Custody v48 post-validation input digest failed closed: ${error.message}`); }
  if (liveAfter !== snapshotDigest) errors.push('Preference Custody v48 live input mutated during validation');
  const result = unique(errors); INPUT_VALIDATION_CACHE.set(snapshotDigest, [...result]); return result;
}

function extensionControl(manifest, targetBuild) {
  return {
    control_id: 'PC-50', fixture_id: manifest.extension_control.fixture_id, failure_class: manifest.extension_control.failure_class,
    source_fixture_path: manifest.extension_control.source_fixture_path, build_artifact_path: manifest.extension_control.build_artifact_path,
    graph_effect: 'none', counts_toward_thesis_evidence: false, conclusion_generated: false, real_world_effect_claimed: false,
    preference_change_present: false, manipulative_intent_inferable: false, security_compromise_claimed: false,
    required_refusal_rules: [...manifest.extension_control.required_refusal_rules], observed_refusal_rules: [...targetBuild.required_refusal_rules],
    fixture_snapshot_sha256: targetBuild.fixture_snapshot_sha256, build_snapshot_sha256: sha256(targetBuild),
    public_signature_count: targetBuild.public_signature_count,
    artifact_runtime_governance_signature_count: targetBuild.artifact_runtime_governance_signature_count,
    complete_artifact_runtime_assurance_world_count: targetBuild.complete_artifact_runtime_assurance_world_count,
    metrics: canonical(targetBuild.metrics), classification: canonical(targetBuild.classification)
  };
}
function custodyChain(manifest, baseBuild, targetBuild, compiledParts) {
  const events = [
    { event_id: `${manifest.manifest_id}:manifest`, event_type: 'manifest_frozen', authority: 'preference_custody_v48_analyst', evidence_class: 'candidate_inference', source_event_ids: [], payload: { manifest_snapshot_sha256: compiledParts.manifestSnapshot, graph_effect: 'none' } },
    { event_id: `${manifest.manifest_id}:base`, event_type: 'qualified_base_bound', authority: 'preference_custody_v48_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${manifest.manifest_id}:manifest`], payload: { base_manifest_id: baseBuild.manifest_id, base_control_count: baseBuild.control_count, base_floor_snapshot_sha256: compiledParts.baseSnapshot, v47_source_bundle_sha256: compiledParts.sourceSnapshot } },
    { event_id: `${manifest.manifest_id}:extension`, event_type: 'pc50_extension_bound', authority: 'preference_custody_v48_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${manifest.manifest_id}:base`], payload: { control_id: 'PC-50', extension_snapshot_sha256: compiledParts.targetSnapshot, complete_artifact_runtime_assurance_world_count: targetBuild.complete_artifact_runtime_assurance_world_count } },
    { event_id: `${manifest.manifest_id}:promotion`, event_type: 'promotion_boundary_extended', authority: 'preference_custody_v48_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${manifest.manifest_id}:extension`], payload: { base_promotion_requirement_count: baseBuild.promotion_boundary.promotion_requirement_count, added_promotion_requirement_count: manifest.real_case_requirements_added.length, final_promotion_requirement_count: compiledParts.finalRequirementCount, laboratory_controls_are_real_world_evidence: false } },
    { event_id: `${manifest.manifest_id}:interpretation`, event_type: 'interpretation_sealed', authority: 'preference_custody_v48_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${manifest.manifest_id}:promotion`], payload: { allowed_interpretation: 'qualified fifty-control synthetic Preference Custody floor', graph_effect: 'none', real_world_evidence_state: 'none', interpretation_contract: canonical(manifest.interpretation_contract) } }
  ];
  let previous = null; return events.map(event => { const sealed = seal(event, previous); previous = sealed.event_sha256; return sealed; });
}

export function compilePreferenceCustodyManifestV48(manifest, baseBuild, targetBuild, targetFixture, baseSources) {
  const errors = validateInputBundle(manifest, baseBuild, targetBuild, targetFixture, baseSources); if (errors.length) throw new Error(errors.join('\n'));
  const extension = extensionControl(manifest, targetBuild);
  const controls = [...structuredClone(baseBuild.controls), extension];
  const openFrontiers = baseBuild.open_frontiers.filter(frontier => frontier !== RESOLVED_FRONTIER); for (const successor of REQUIRED_SUCCESSORS) if (!openFrontiers.includes(successor)) openFrontiers.push(successor);
  const promotionRequirements = [...baseBuild.promotion_boundary.real_case_requires, ...manifest.real_case_requirements_added];
  const manifestSnapshot = preferenceCustodyManifestV48Snapshot(manifest); const baseSnapshot = sha256(baseBuild); const targetSnapshot = sha256(targetBuild); const sourceSnapshot = preferenceCustodyV47SourceBundleSnapshot(baseSources); const finalRequirementCount = promotionRequirements.length;
  const composition = {
    base_manifest_id: baseBuild.manifest_id, base_schema_version: baseBuild.schema_version, base_control_count: baseBuild.control_count, extension_control_id: 'PC-50',
    manifest_snapshot_sha256: manifestSnapshot, base_floor_snapshot_sha256: baseSnapshot, extension_snapshot_sha256: targetSnapshot,
    v47_source_bundle_schema_version: PREFERENCE_CUSTODY_V47_SOURCE_BUNDLE_SCHEMA_VERSION, v47_source_bundle_sha256: sourceSnapshot,
    base_controls_sha256: sha256(baseBuild.controls), base_promotion_requirements_sha256: sha256(baseBuild.promotion_boundary.real_case_requires),
    base_refusal_rule_union_sha256: sha256(baseBuild.refusal_rule_union), base_identification_requirements_sha256: sha256(baseBuild.identification_requirements),
    base_open_frontiers_sha256: sha256(baseBuild.open_frontiers), base_prohibited_inferences_sha256: sha256(baseBuild.prohibited_inferences), base_interpretation_contract_sha256: sha256(baseBuild.interpretation_contract),
    base_promotion_requirement_count: baseBuild.promotion_boundary.promotion_requirement_count, added_promotion_requirement_count: manifest.real_case_requirements_added.length, final_promotion_requirement_count: finalRequirementCount, base_open_frontiers: [...baseBuild.open_frontiers]
  };
  const integrity = {
    base_floor_qualified: true, base_integrity_preserved: sha256(controls.slice(0, 49)) === sha256(baseBuild.controls), v47_complete_source_bundle_bound: true,
    all_graph_effect_none: controls.every(control => control.graph_effect === 'none'), no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false), no_real_world_conclusion: controls.every(control => control.conclusion_generated === false),
    no_preference_change_claim: controls.every(control => control.preference_change_present !== true), no_intent_inference: controls.every(control => control.manipulative_intent_inferable !== true), no_security_compromise_claim: controls.every(control => control.security_compromise_claimed !== true),
    all_required_pc50_refusal_rules_present: manifest.extension_control.required_refusal_rules.every(rule => extension.observed_refusal_rules.includes(rule)), complete_executable_identity_assurance_path_preserved: targetBuild.complete_artifact_runtime_assurance_world_count === 1,
    numerical_determinism_successor_preserved: openFrontiers.includes(PRESERVED_FRONTIERS[0]), deployment_successor_preserved: openFrontiers.includes(PRESERVED_FRONTIERS[1]), event_state_successor_preserved: openFrontiers.includes(PRESERVED_FRONTIERS[2]), estimand_scope_successor_preserved: openFrontiers.includes(PRESERVED_FRONTIERS[3]), dependence_multiplicity_successor_preserved: openFrontiers.includes(PRESERVED_FRONTIERS[4]), calibration_drift_successor_preserved: openFrontiers.includes(PRESERVED_FRONTIERS[5])
  };
  const chain = custodyChain(manifest, baseBuild, targetBuild, { manifestSnapshot, baseSnapshot, targetSnapshot, sourceSnapshot, finalRequirementCount });
  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V48_BUILD_SCHEMA_VERSION, manifest_id: manifest.manifest_id, issue: manifest.issue, control_issue: manifest.control_issue, captured_at: manifest.captured_at,
    status: 'synthetic_preference_custody_floor_v48_compiled', graph_effect: 'none', counts_toward_thesis_evidence: false, conclusion_generated: false, real_world_evidence_state: 'none',
    control_count: controls.length, controls, composition, control_integrity: integrity,
    identification_requirements: [...structuredClone(baseBuild.identification_requirements), canonical(manifest.identification_requirement)],
    refusal_rule_union: unique([...baseBuild.refusal_rule_union, ...manifest.extension_control.required_refusal_rules]), open_frontiers: openFrontiers, frontier_transition: canonical(manifest.frontier_transition),
    promotion_boundary: { promotion_authority: baseBuild.promotion_boundary.promotion_authority, promotion_requirement_count: finalRequirementCount, real_case_requires: promotionRequirements, laboratory_controls_are_real_world_evidence: false },
    custody_chain: chain, custody_chain_head_sha256: chain.at(-1).event_sha256, prohibited_inferences: unique([...baseBuild.prohibited_inferences, ...manifest.prohibited_inferences]), interpretation_contract: canonical(manifest.interpretation_contract)
  };
}
function validateChain(build, errors) {
  if (!Array.isArray(build.custody_chain) || build.custody_chain.length !== 5) { errors.push('Preference Custody v48 custody chain must contain five events'); return; }
  if (build.custody_chain.some(event => !record(event))) { errors.push('Preference Custody v48 custody events must be objects'); return; }
  let previous = null; for (const [index, event] of build.custody_chain.entries()) { if (event.previous_event_sha256 !== previous) errors.push(`Preference Custody v48 custody event ${index} previous hash mismatch`); const { event_sha256, ...unsigned } = event; if (event_sha256 !== sha256(unsigned)) errors.push(`Preference Custody v48 custody event ${index} hash mismatch`); previous = event_sha256; }
  if (build.custody_chain_head_sha256 !== previous) errors.push('Preference Custody v48 custody chain head mismatch');
}
export function validatePreferenceCustodyManifestV48Build(build, manifest, baseBuild, targetBuild, targetFixture, baseSources) {
  const errors = []; validateCanonicalJsonTree(build, 'Preference Custody v48 build', errors); if (errors.length) return unique(errors);
  if (!record(build)) return ['Preference Custody v48 build must be an object'];
  requireExactKeys(build, BUILD_KEYS, 'Preference Custody v48 build', errors);
  const arrayFields = ['controls','identification_requirements','refusal_rule_union','open_frontiers','custody_chain','prohibited_inferences'];
  for (const field of arrayFields) if (!Array.isArray(build[field])) errors.push(`Preference Custody v48 build ${field} must be an array`);
  const objectFields = ['composition','control_integrity','frontier_transition','promotion_boundary','interpretation_contract'];
  for (const field of objectFields) if (!record(build[field])) errors.push(`Preference Custody v48 build ${field} must be an object`);
  if (Array.isArray(build.controls) && build.controls.some(control => !record(control))) errors.push('Preference Custody v48 controls must contain objects');
  if (Array.isArray(build.custody_chain) && build.custody_chain.some(event => !record(event))) errors.push('Preference Custody v48 custody events must contain objects');
  if (errors.length) return unique(errors);
  requireExactKeys(build.composition, COMPOSITION_KEYS, 'Preference Custody v48 composition', errors);
  requireExactKeys(build.control_integrity, CONTROL_INTEGRITY_KEYS, 'Preference Custody v48 control integrity', errors);
  requireExactKeys(build.frontier_transition, EXPECTED_FRONTIER_KEYS, 'Preference Custody v48 frontier transition', errors);
  requireExactKeys(build.promotion_boundary, PROMOTION_KEYS, 'Preference Custody v48 promotion boundary', errors);
  requireExactKeys(build.interpretation_contract, EXPECTED_INTERPRETATION_KEYS, 'Preference Custody v48 interpretation contract', errors);
  if (errors.length) return unique(errors);
  const inputErrors = validateInputBundle(manifest, baseBuild, targetBuild, targetFixture, baseSources); errors.push(...inputErrors); if (inputErrors.length) return unique(errors);
  let expected; try { expected = compilePreferenceCustodyManifestV48(manifest, baseBuild, targetBuild, targetFixture, baseSources); } catch (error) { errors.push(`Preference Custody v48 deterministic compile failed: ${error.message}`); return unique(errors); }
  if (stable(build) !== stable(expected)) errors.push('Preference Custody v48 build differs from deterministic compilation');
  if (build.control_count !== 50 || stable(build.controls.map(control => control.control_id)) !== stable(REQUIRED_CONTROL_IDS)) errors.push('Preference Custody v48 control denominator mismatch');
  if (build.promotion_boundary.promotion_requirement_count !== 1970 || build.composition.base_promotion_requirement_count !== 1920 || build.composition.added_promotion_requirement_count !== 50 || build.composition.final_promotion_requirement_count !== 1970) errors.push('Preference Custody v48 promotion denominator mismatch');
  if (build.open_frontiers.includes(RESOLVED_FRONTIER)) errors.push('Preference Custody v48 resolved frontier remains open');
  for (const frontier of [...REQUIRED_SUCCESSORS, ...PRESERVED_FRONTIERS]) if (!build.open_frontiers.includes(frontier)) errors.push(`Preference Custody v48 missing required open frontier ${frontier}`);
  if (Object.values(build.control_integrity).some(value => value !== true)) errors.push('Preference Custody v48 integrity ledger contains a false value');
  validateChain(build, errors); return unique(errors);
}
export function renderPreferenceCustodyManifestV48Markdown(build) {
  return `# Preference Custody laboratory floor v48

` +
    `Synthetic compositional floor only. Graph effect: **${build.graph_effect}**. Real-world evidence: **${build.real_world_evidence_state}**.

` +
    `| Measure | Value |
| --- | ---: |
` +
    `| Base controls | ${build.composition.base_control_count} |
| PC-50 extension | 1 |
| Final controls | ${build.control_count} |
` +
    `| Base promotion requirements | ${build.composition.base_promotion_requirement_count} |
| Requirements added | ${build.composition.added_promotion_requirement_count} |
| Final promotion requirements | ${build.promotion_boundary.promotion_requirement_count} |

` +
    `Resolved frontier: \`${build.frontier_transition.resolved_base_frontier}\`.

Successor frontiers:
${build.frontier_transition.successor_frontiers.map(frontier => `- \`${frontier}\``).join('\n')}

` +
    `The qualified v47 base is hash-bound and byte-preserved. PC-50 creates no real source-review, build, artifact, dependency, runtime, loaded-module, execution, security, effect, graph, allegation, adoption, or public-authority conclusion.
`;
}
