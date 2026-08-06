import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';

export const PREFERENCE_LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_FIXTURE_SCHEMA_VERSION =
  'preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance-fixture@1';
export const PREFERENCE_LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_BUILD_SCHEMA_VERSION =
  'preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance-build@1';
export const COMPLETE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_CLASSIFICATION =
  'complete_executable_artifact_build_dependency_environment_runtime_identity_assurance';

const EXPECTED_FIXTURE_ID = "same-linkage-artifact-build-runtime-status-different-source-dependency-environment-execution-states-v1";
const EXPECTED_FIXTURE_SNAPSHOT_SHA256 = '85efedba500298de2d30bf242bf591e2179ad600213e483cc6b21273f4fb2616';
const EXPECTED_TOP_LEVEL_KEYS = Object.freeze(["schema_version","fixture_id","issue","parent_program_issue","captured_at","status","graph_effect","counts_toward_thesis_evidence","baseline","interpretation_contract","required_refusal_rules","expected_classification","worlds"]);
const EXPECTED_BASELINE_KEYS = Object.freeze(["operative_release","published_candidate_pairs","published_interval_bearing_pairs","published_nominal_coverage","published_empirical_coverage","published_interval_misses","published_mean_interval_width","public_artifact_status","public_build_status","public_dependency_status","public_runtime_status","public_execution_status","published_replay_runs","published_matching_replay_runs","approved_use"]);
const EXPECTED_INTERPRETATION_KEYS = Object.freeze(["what_this_is","what_this_is_not","copy_ready_caveat"]);
const EXPECTED_CLASSIFICATION_KEYS = Object.freeze(["public_repository_identifies_executed_source","public_commit_identifies_reproducible_build","public_artifact_digest_identifies_executed_package","public_signature_establishes_complete_provenance","public_lockfile_identifies_complete_dependency_graph","public_image_tag_identifies_executed_runtime","runtime_version_identifies_loaded_modules_and_invocation","matching_replay_outputs_establish_source_to_execution_identity","published_coverage_establishes_real_world_effect","security_compromise_established","graph_effect_present","binding_public_authority_present","complete_executable_artifact_build_dependency_environment_runtime_identity_assurance_supported_in_at_least_one_world"]);
const EXPECTED_WORLD_KEYS = Object.freeze(["world_id","description","source_review","build_reproducibility","artifact_package","dependency_supply_chain","runtime_environment","execution_attestation","governance","expected_mechanism","expected_flags"]);
const SECTION_KEYS = Object.freeze({"source_review":["repository_bound","reviewed_commit_bound","parent_commit_bound","source_tree_bound","reviewed_file_set_bound","reviewed_blob_set_bound","reviewed_diff_bound","review_disposition_bound","approval_bound","generated_inputs_bound","submodules_and_vendored_sources_bound","executed_build_uses_reviewed_source","source_review_unbound_executions"],"build_reproducibility":["build_recipe_bound","build_graph_bound","generated_input_ledger_bound","toolchain_bound","compiler_bound","linker_bound","compile_flags_bound","optimization_policy_bound","timestamp_policy_bound","hermetic_build_bound","alternate_builder_bound","clean_room_reproduction_bound","independent_reproduction_verified","reproduced_bytes_match","build_toolchain_divergent_executions"],"artifact_package":["artifact_identity_bound","artifact_format_bound","artifact_digest_bound","artifact_signature_bound","signer_identity_bound","provenance_statement_bound","transparency_receipt_bound","revocation_state_bound","package_identity_bound","executable_identity_bound","entry_point_bound","model_assets_bound","plugin_set_bound","generated_resources_bound","container_manifest_bound","container_layers_bound","base_image_bound","artifact_package_entry_point_substitutions"],"dependency_supply_chain":["dependency_lock_bound","resolver_bound","transitive_graph_bound","direct_versions_bound","transitive_versions_bound","package_checksums_bound","package_registry_bound","registry_mirror_bound","vendored_code_bound","native_libraries_bound","build_scripts_bound","post_install_actions_bound","licenses_bound","security_advisories_bound","supply_chain_provenance_bound","dependency_supply_chain_drift_executions"],"runtime_environment":["operating_system_image_bound","kernel_bound","architecture_bound","instruction_set_bound","language_runtime_bound","virtual_machine_bound","standard_library_bound","system_libraries_bound","accelerator_runtime_bound","driver_bound","container_runtime_bound","environment_variables_bound","parameter_set_bound","configuration_bound","secret_versions_bound","locale_bound","timezone_bound","encoding_bound","collation_bound","working_directory_bound","filesystem_inputs_bound","mounts_bound","permissions_bound","network_policy_bound","container_environment_runtime_drift_executions"],"execution_attestation":["startup_command_bound","invocation_arguments_bound","entry_point_invoked_bound","import_resolution_bound","dynamic_loader_path_bound","loaded_module_ledger_bound","shared_library_ledger_bound","plugin_discovery_bound","cache_state_bound","filesystem_order_bound","service_endpoints_bound","service_response_snapshots_bound","retry_policy_bound","timeout_policy_bound","clock_source_bound","source_to_build_attested","build_to_artifact_attested","artifact_to_package_attested","package_to_container_attested","container_to_runtime_attested","runtime_to_loaded_module_attested","loaded_module_to_execution_attested","execution_to_output_attested","execution_receipt_reconciled","loaded_module_invocation_drift_executions","unreconciled_execution_attestation_decisions"],"governance":["assurance_current","approved_source_lineage_current","approved_build_lineage_current","approved_artifact_lineage_current","approved_dependency_lineage_current","approved_image_lineage_current","approved_environment_lineage_current","approved_runtime_lineage_current","approved_module_lineage_current","approved_service_lineage_current","approved_release_lineage_current","approved_use_lineage_current","monitoring_defined","drift_detection_defined","quarantine_defined","rollback_defined","certificate_withdrawal_defined","corrected_rebuild_defined","republication_defined","retirement_defined","appeal_defined","durability_defined","stale_executable_identity_decisions","unsupported_executable_identity_decisions","binding_public_authority"]});
const SECTION_BOOLEAN_KEYS = Object.freeze({"source_review":["repository_bound","reviewed_commit_bound","parent_commit_bound","source_tree_bound","reviewed_file_set_bound","reviewed_blob_set_bound","reviewed_diff_bound","review_disposition_bound","approval_bound","generated_inputs_bound","submodules_and_vendored_sources_bound","executed_build_uses_reviewed_source"],"build_reproducibility":["build_recipe_bound","build_graph_bound","generated_input_ledger_bound","toolchain_bound","compiler_bound","linker_bound","compile_flags_bound","optimization_policy_bound","timestamp_policy_bound","hermetic_build_bound","alternate_builder_bound","clean_room_reproduction_bound","independent_reproduction_verified","reproduced_bytes_match"],"artifact_package":["artifact_identity_bound","artifact_format_bound","artifact_digest_bound","artifact_signature_bound","signer_identity_bound","provenance_statement_bound","transparency_receipt_bound","revocation_state_bound","package_identity_bound","executable_identity_bound","entry_point_bound","model_assets_bound","plugin_set_bound","generated_resources_bound","container_manifest_bound","container_layers_bound","base_image_bound"],"dependency_supply_chain":["dependency_lock_bound","resolver_bound","transitive_graph_bound","direct_versions_bound","transitive_versions_bound","package_checksums_bound","package_registry_bound","registry_mirror_bound","vendored_code_bound","native_libraries_bound","build_scripts_bound","post_install_actions_bound","licenses_bound","security_advisories_bound","supply_chain_provenance_bound"],"runtime_environment":["operating_system_image_bound","kernel_bound","architecture_bound","instruction_set_bound","language_runtime_bound","virtual_machine_bound","standard_library_bound","system_libraries_bound","accelerator_runtime_bound","driver_bound","container_runtime_bound","environment_variables_bound","parameter_set_bound","configuration_bound","secret_versions_bound","locale_bound","timezone_bound","encoding_bound","collation_bound","working_directory_bound","filesystem_inputs_bound","mounts_bound","permissions_bound","network_policy_bound"],"execution_attestation":["startup_command_bound","invocation_arguments_bound","entry_point_invoked_bound","import_resolution_bound","dynamic_loader_path_bound","loaded_module_ledger_bound","shared_library_ledger_bound","plugin_discovery_bound","cache_state_bound","filesystem_order_bound","service_endpoints_bound","service_response_snapshots_bound","retry_policy_bound","timeout_policy_bound","clock_source_bound","source_to_build_attested","build_to_artifact_attested","artifact_to_package_attested","package_to_container_attested","container_to_runtime_attested","runtime_to_loaded_module_attested","loaded_module_to_execution_attested","execution_to_output_attested","execution_receipt_reconciled"],"governance":["assurance_current","approved_source_lineage_current","approved_build_lineage_current","approved_artifact_lineage_current","approved_dependency_lineage_current","approved_image_lineage_current","approved_environment_lineage_current","approved_runtime_lineage_current","approved_module_lineage_current","approved_service_lineage_current","approved_release_lineage_current","approved_use_lineage_current","monitoring_defined","drift_detection_defined","quarantine_defined","rollback_defined","certificate_withdrawal_defined","corrected_rebuild_defined","republication_defined","retirement_defined","appeal_defined","durability_defined"]});
const SECTION_BURDEN_KEYS = Object.freeze({"source_review":["source_review_unbound_executions"],"build_reproducibility":["build_toolchain_divergent_executions"],"artifact_package":["artifact_package_entry_point_substitutions"],"dependency_supply_chain":["dependency_supply_chain_drift_executions"],"runtime_environment":["container_environment_runtime_drift_executions"],"execution_attestation":["loaded_module_invocation_drift_executions","unreconciled_execution_attestation_decisions"],"governance":["stale_executable_identity_decisions","unsupported_executable_identity_decisions"]});
const WORLD_IDS = Object.freeze(["complete_executable_artifact_build_dependency_environment_runtime_identity_assurance","reviewed_source_not_bound_to_executed_build","build_recipe_toolchain_or_reproduction_divergence","artifact_package_entry_point_or_container_layer_substitution","dependency_graph_checksum_registry_or_supply_chain_drift","container_environment_kernel_runtime_or_configuration_drift","loaded_module_import_plugin_service_or_invocation_drift","stale_inherited_executable_artifact_and_runtime_identity_assurance"]);
const WORLD_MECHANISMS = Object.freeze({"complete_executable_artifact_build_dependency_environment_runtime_identity_assurance":"complete_executable_artifact_build_dependency_environment_runtime_identity_assurance","reviewed_source_not_bound_to_executed_build":"reviewed_source_not_bound_to_executed_build","build_recipe_toolchain_or_reproduction_divergence":"build_recipe_toolchain_or_reproduction_divergence","artifact_package_entry_point_or_container_layer_substitution":"artifact_package_entry_point_or_container_layer_substitution","dependency_graph_checksum_registry_or_supply_chain_drift":"dependency_graph_checksum_registry_or_supply_chain_drift","container_environment_kernel_runtime_or_configuration_drift":"container_environment_kernel_runtime_or_configuration_drift","loaded_module_import_plugin_service_or_invocation_drift":"loaded_module_import_plugin_service_or_invocation_drift","stale_inherited_executable_artifact_and_runtime_identity_assurance":"stale_inherited_executable_artifact_and_runtime_identity_assurance"});
const EXPECTED_WORLD_BURDENS = Object.freeze({"complete_executable_artifact_build_dependency_environment_runtime_identity_assurance":{"source_review_unbound_executions":0,"build_toolchain_divergent_executions":0,"artifact_package_entry_point_substitutions":0,"dependency_supply_chain_drift_executions":0,"container_environment_runtime_drift_executions":0,"loaded_module_invocation_drift_executions":0,"unreconciled_execution_attestation_decisions":0,"stale_executable_identity_decisions":0,"unsupported_executable_identity_decisions":0},"reviewed_source_not_bound_to_executed_build":{"source_review_unbound_executions":100,"build_toolchain_divergent_executions":0,"artifact_package_entry_point_substitutions":0,"dependency_supply_chain_drift_executions":0,"container_environment_runtime_drift_executions":0,"loaded_module_invocation_drift_executions":0,"unreconciled_execution_attestation_decisions":0,"stale_executable_identity_decisions":0,"unsupported_executable_identity_decisions":100},"build_recipe_toolchain_or_reproduction_divergence":{"source_review_unbound_executions":0,"build_toolchain_divergent_executions":90,"artifact_package_entry_point_substitutions":0,"dependency_supply_chain_drift_executions":0,"container_environment_runtime_drift_executions":0,"loaded_module_invocation_drift_executions":0,"unreconciled_execution_attestation_decisions":0,"stale_executable_identity_decisions":0,"unsupported_executable_identity_decisions":100},"artifact_package_entry_point_or_container_layer_substitution":{"source_review_unbound_executions":0,"build_toolchain_divergent_executions":0,"artifact_package_entry_point_substitutions":80,"dependency_supply_chain_drift_executions":0,"container_environment_runtime_drift_executions":0,"loaded_module_invocation_drift_executions":0,"unreconciled_execution_attestation_decisions":0,"stale_executable_identity_decisions":0,"unsupported_executable_identity_decisions":100},"dependency_graph_checksum_registry_or_supply_chain_drift":{"source_review_unbound_executions":0,"build_toolchain_divergent_executions":0,"artifact_package_entry_point_substitutions":0,"dependency_supply_chain_drift_executions":70,"container_environment_runtime_drift_executions":0,"loaded_module_invocation_drift_executions":0,"unreconciled_execution_attestation_decisions":0,"stale_executable_identity_decisions":0,"unsupported_executable_identity_decisions":100},"container_environment_kernel_runtime_or_configuration_drift":{"source_review_unbound_executions":0,"build_toolchain_divergent_executions":0,"artifact_package_entry_point_substitutions":0,"dependency_supply_chain_drift_executions":0,"container_environment_runtime_drift_executions":60,"loaded_module_invocation_drift_executions":0,"unreconciled_execution_attestation_decisions":0,"stale_executable_identity_decisions":0,"unsupported_executable_identity_decisions":100},"loaded_module_import_plugin_service_or_invocation_drift":{"source_review_unbound_executions":0,"build_toolchain_divergent_executions":0,"artifact_package_entry_point_substitutions":0,"dependency_supply_chain_drift_executions":0,"container_environment_runtime_drift_executions":0,"loaded_module_invocation_drift_executions":50,"unreconciled_execution_attestation_decisions":40,"stale_executable_identity_decisions":0,"unsupported_executable_identity_decisions":100},"stale_inherited_executable_artifact_and_runtime_identity_assurance":{"source_review_unbound_executions":0,"build_toolchain_divergent_executions":0,"artifact_package_entry_point_substitutions":0,"dependency_supply_chain_drift_executions":0,"container_environment_runtime_drift_executions":0,"loaded_module_invocation_drift_executions":0,"unreconciled_execution_attestation_decisions":0,"stale_executable_identity_decisions":100,"unsupported_executable_identity_decisions":100}});

export const REQUIRED_LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_REFUSAL_RULES =
  Object.freeze(["one_repository_url_is_not_the_reviewed_commit_source_tree_file_set_or_executed_source","one_commit_hash_is_not_a_reproducible_build","one_reviewed_diff_is_not_complete_source_custody_when_generated_inputs_submodules_vendored_code_or_build_scripts_are_unbound","one_build_recipe_is_not_a_reproducible_build_without_exact_toolchain_flags_environment_generated_inputs_and_independent_byte_comparison","one_artifact_digest_is_not_the_executed_artifact_entry_point_package_model_asset_plugin_resource_or_container_layer_set","one_signature_is_not_complete_provenance_when_signer_scope_transparency_revocation_and_artifact_binding_are_incomplete","one_package_or_image_tag_is_not_immutable_package_manifest_layer_base_image_and_registry_custody","one_lockfile_is_not_the_complete_resolved_dependency_graph_package_checksum_native_library_and_supply_chain_provenance","one_container_image_is_not_the_executed_runtime_when_kernel_container_runtime_mounts_secrets_configuration_and_loaded_modules_differ","one_runtime_version_is_not_complete_environment_identity","matching_top_level_artifact_metadata_is_not_loaded_module_or_invocation_equivalence","one_startup_command_is_not_complete_execution_custody_when_import_resolution_plugin_discovery_cache_filesystem_clock_or_services_alter_execution","one_successful_replay_is_not_source_to_execution_identity_assurance","historical_executable_identity_is_not_current_after_source_build_artifact_dependency_package_image_environment_runtime_module_service_release_or_use_succession","artifact_or_runtime_identity_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent","binding_public_authority_requires_separate_current_public_authorization_receipts","synthetic_artifact_runtime_burdens_are_not_real_world_defect_prevalence_security_compromise_causal_effect_or_institutional_performance_estimates","execution_attestation_requires_source_build_artifact_package_container_runtime_loaded_module_invocation_output_correction_and_lineage_reconciliation"]);
export const LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_FALSE_CLASSIFICATIONS =
  Object.freeze({"public_repository_identifies_executed_source":false,"public_commit_identifies_reproducible_build":false,"public_artifact_digest_identifies_executed_package":false,"public_signature_establishes_complete_provenance":false,"public_lockfile_identifies_complete_dependency_graph":false,"public_image_tag_identifies_executed_runtime":false,"runtime_version_identifies_loaded_modules_and_invocation":false,"matching_replay_outputs_establish_source_to_execution_identity":false,"published_coverage_establishes_real_world_effect":false,"security_compromise_established":false,"graph_effect_present":false,"binding_public_authority_present":false});
export const EXPECTED_LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_METRICS =
  Object.freeze({"worlds":8,"public_artifact_build_runtime_signatures":1,"artifact_runtime_governance_signatures":8,"complete_artifact_runtime_assurance_worlds":1,"source_review_unbound_executions":100,"build_toolchain_divergent_executions":90,"artifact_package_entry_point_substitutions":80,"dependency_supply_chain_drift_executions":70,"container_environment_runtime_drift_executions":60,"loaded_module_invocation_drift_executions":50,"unreconciled_execution_attestation_decisions":40,"stale_executable_identity_decisions":100,"unsupported_executable_identity_decisions":700,"binding_public_authority_worlds":0});

const BUILD_KEYS = Object.freeze([
  'schema_version','fixture_id','issue','parent_program_issue','captured_at','status','graph_effect',
  'counts_toward_thesis_evidence','conclusion_generated','real_world_evidence_state','fixture_snapshot_sha256',
  'baseline','baseline_snapshot_sha256','public_signature_count','world_count','artifact_runtime_governance_signature_count',
  'complete_artifact_runtime_assurance_world_count','worlds','metrics','classification','required_refusal_rules',
  'custody_chain','custody_chain_head_sha256','interpretation_contract'
]);
const COMPILED_WORLD_KEYS = Object.freeze([
  'world_id','description','source_review','build_reproducibility','artifact_package','dependency_supply_chain',
  'runtime_environment','execution_attestation','governance','expected_mechanism','flags','numeric_burden',
  'public_signature_sha256','artifact_runtime_governance_signature_sha256'
]);
const FLAG_KEYS = Object.freeze(["complete_source_review_custody","complete_build_reproducibility_custody","complete_artifact_package_custody","complete_dependency_supply_chain_custody","complete_runtime_environment_custody","complete_execution_attestation_custody","current_executable_identity_lineage_assurance","complete_executable_artifact_build_dependency_environment_runtime_identity_assurance"]);
const BURDEN_LOCATIONS = Object.freeze({"source_review_unbound_executions":["source_review","source_review_unbound_executions"],"build_toolchain_divergent_executions":["build_reproducibility","build_toolchain_divergent_executions"],"artifact_package_entry_point_substitutions":["artifact_package","artifact_package_entry_point_substitutions"],"dependency_supply_chain_drift_executions":["dependency_supply_chain","dependency_supply_chain_drift_executions"],"container_environment_runtime_drift_executions":["runtime_environment","container_environment_runtime_drift_executions"],"loaded_module_invocation_drift_executions":["execution_attestation","loaded_module_invocation_drift_executions"],"unreconciled_execution_attestation_decisions":["execution_attestation","unreconciled_execution_attestation_decisions"],"stale_executable_identity_decisions":["governance","stale_executable_identity_decisions"],"unsupported_executable_identity_decisions":["governance","unsupported_executable_identity_decisions"]});

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const stable = value => JSON.stringify(canonical(value));
const sha256 = value => createHash('sha256').update(typeof value === 'string' ? value : stable(value)).digest('hex');
const sorted = values => [...values].sort((left, right) => String(left).localeCompare(String(right)));
const unique = values => [...new Set(array(values))];
const nonNegativeInteger = value => Number.isInteger(value) && value >= 0;
const record = value => { try { return value !== null && typeof value === 'object' && !Array.isArray(value) && !nodeTypes.isProxy(value); } catch { return false; } };
const isoDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

function requireExactKeys(value, expected, label, errors) {
  let keys;
  try { keys = Reflect.ownKeys(value); } catch { errors.push(`${label} must be inspectable`); return; }
  const strings = keys.filter(key => typeof key === 'string');
  if (strings.length !== keys.length || stable(sorted(strings)) !== stable(sorted(expected)) || strings.length !== expected.length) errors.push(`${label} key ledger mismatch`);
}
function validateCanonicalJsonTree(value, label, errors, seen = new WeakSet()) {
  const walk = (current, path) => {
    const type = typeof current;
    if (current === null || type === 'string' || type === 'boolean') return;
    if (type === 'number') { if (!Number.isFinite(current)) errors.push(`${path} must contain only finite JSON numbers`); return; }
    if (type !== 'object') { errors.push(`${path} contains unsupported JSON value type ${type}`); return; }
    if (nodeTypes.isProxy(current)) { errors.push(`${path} must not contain proxy-backed data`); return; }
    if (seen.has(current)) { errors.push(`${path} contains a repeated, aliased, or cyclic object`); return; }
    seen.add(current);
    let prototype;
    let keys;
    try { prototype = Object.getPrototypeOf(current); keys = Reflect.ownKeys(current); }
    catch { errors.push(`${path} must be inspectable canonical JSON data`); return; }
    if (Array.isArray(current)) {
      if (prototype !== Array.prototype) errors.push(`${path} must use the canonical array prototype`);
      const expectedKeys = new Set(['length', ...Array.from({ length: current.length }, (_, index) => String(index))]);
      if (keys.length !== expectedKeys.size || keys.some(key => typeof key !== 'string' || !expectedKeys.has(key))) errors.push(`${path} array key ledger mismatch`);
      for (let index = 0; index < current.length; index += 1) {
        if (!Object.hasOwn(current, index)) { errors.push(`${path}[${index}] must not be sparse`); continue; }
        let descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(current, String(index)); } catch { descriptor = null; }
        if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) { errors.push(`${path}[${index}] must be an enumerable data property`); continue; }
        walk(descriptor.value, `${path}[${index}]`);
      }
      return;
    }
    if (prototype !== Object.prototype) errors.push(`${path} must use the canonical object prototype`);
    for (const key of keys) {
      if (typeof key !== 'string') { errors.push(`${path} must not contain symbol keys`); continue; }
      let descriptor;
      try { descriptor = Object.getOwnPropertyDescriptor(current, key); } catch { descriptor = null; }
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) { errors.push(`${path}.${key} must be an enumerable data property`); continue; }
      walk(descriptor.value, `${path}.${key}`);
    }
  };
  walk(value, label);
}

const pick = (value, keys) => Object.fromEntries(keys.map(key => [key, value?.[key]]));
function projectWorld(world) {
  return {
    world_id: world?.world_id,
    description: world?.description,
    ...Object.fromEntries(Object.entries(SECTION_KEYS).map(([section, keys]) => [section, pick(world?.[section], keys)])),
    expected_mechanism: world?.expected_mechanism,
    expected_flags: pick(world?.expected_flags, FLAG_KEYS)
  };
}
export function projectPreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(fixture) {
  return {
    schema_version: fixture?.schema_version,
    fixture_id: fixture?.fixture_id,
    issue: fixture?.issue,
    parent_program_issue: fixture?.parent_program_issue,
    captured_at: fixture?.captured_at,
    status: fixture?.status,
    graph_effect: fixture?.graph_effect,
    counts_toward_thesis_evidence: fixture?.counts_toward_thesis_evidence,
    baseline: pick(fixture?.baseline, EXPECTED_BASELINE_KEYS),
    interpretation_contract: pick(fixture?.interpretation_contract, EXPECTED_INTERPRETATION_KEYS),
    required_refusal_rules: [...array(fixture?.required_refusal_rules)],
    expected_classification: pick(fixture?.expected_classification, EXPECTED_CLASSIFICATION_KEYS),
    worlds: array(fixture?.worlds).map(projectWorld)
  };
}
export const preferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixtureSnapshot = fixture =>
  sha256(projectPreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(fixture));

function sectionComplete(sectionName, section) {
  const booleansComplete = SECTION_BOOLEAN_KEYS[sectionName].every(key => section?.[key] === true);
  const burdensClear = SECTION_BURDEN_KEYS[sectionName].every(key => nonNegativeInteger(section?.[key]) && section[key] === 0);
  if (sectionName === 'governance') return booleansComplete && burdensClear && section?.binding_public_authority === false;
  return booleansComplete && burdensClear;
}
export function classifyPreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityWorld(world) {
  const source = sectionComplete('source_review', world?.source_review);
  const build = sectionComplete('build_reproducibility', world?.build_reproducibility);
  const artifact = sectionComplete('artifact_package', world?.artifact_package);
  const dependency = sectionComplete('dependency_supply_chain', world?.dependency_supply_chain);
  const runtime = sectionComplete('runtime_environment', world?.runtime_environment);
  const execution = sectionComplete('execution_attestation', world?.execution_attestation);
  const governance = sectionComplete('governance', world?.governance);
  const current = source && build && artifact && dependency && runtime && execution && governance;
  return {
    complete_source_review_custody: source,
    complete_build_reproducibility_custody: build,
    complete_artifact_package_custody: artifact,
    complete_dependency_supply_chain_custody: dependency,
    complete_runtime_environment_custody: runtime,
    complete_execution_attestation_custody: execution,
    current_executable_identity_lineage_assurance: current,
    complete_executable_artifact_build_dependency_environment_runtime_identity_assurance: current
  };
}

function numericBurden(world) {
  return Object.fromEntries(Object.entries(BURDEN_LOCATIONS).map(([key, [section, field]]) => [key, world?.[section]?.[field]]));
}
function computeMetrics(worlds) {
  const publicSignatures = new Set(worlds.map(world => world.public_signature_sha256));
  const governanceSignatures = new Set(worlds.map(world => world.artifact_runtime_governance_signature_sha256));
  return {
    worlds: worlds.length,
    public_artifact_build_runtime_signatures: publicSignatures.size,
    artifact_runtime_governance_signatures: governanceSignatures.size,
    complete_artifact_runtime_assurance_worlds: worlds.filter(world => world.flags.complete_executable_artifact_build_dependency_environment_runtime_identity_assurance).length,
    ...Object.fromEntries(Object.keys(BURDEN_LOCATIONS).map(key => [key, worlds.reduce((sum, world) => sum + Number(world.numeric_burden[key] ?? 0), 0)])),
    binding_public_authority_worlds: worlds.filter(world => world.governance.binding_public_authority === true).length
  };
}
function seal(event, previousEventSha256) {
  const unsigned = { ...canonical(event), previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}
function custodyChain(fixture, worlds, metrics, classification) {
  const events = [
    { event_index: 1, event_type: 'fixture_frozen', fixture_snapshot_sha256: preferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixtureSnapshot(fixture) },
    { event_index: 2, event_type: 'public_surface_frozen', baseline_snapshot_sha256: sha256(fixture.baseline), public_signature_count: metrics.public_artifact_build_runtime_signatures },
    { event_index: 3, event_type: 'artifact_runtime_worlds_classified', world_count: metrics.worlds, artifact_runtime_governance_signature_count: metrics.artifact_runtime_governance_signatures, world_classification_sha256: sha256(worlds.map(world => [world.world_id, world.flags, world.expected_mechanism])) },
    { event_index: 4, event_type: 'artifact_runtime_burdens_reconciled', metrics_sha256: sha256(metrics), unsupported_executable_identity_decisions: metrics.unsupported_executable_identity_decisions },
    { event_index: 5, event_type: 'authority_ceiling_preserved', graph_effect: fixture.graph_effect, counts_toward_thesis_evidence: fixture.counts_toward_thesis_evidence, classification_sha256: sha256(classification), binding_public_authority_worlds: metrics.binding_public_authority_worlds }
  ];
  let previous = null;
  return events.map(event => { const sealed = seal(event, previous); previous = sealed.event_sha256; return sealed; });
}

export function validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(fixture) {
  const errors = [];
  validateCanonicalJsonTree(fixture, 'PC-50 fixture', errors);
  if (errors.length) return unique(errors);
  if (!record(fixture)) return ['PC-50 fixture must be an object'];

  requireExactKeys(fixture, EXPECTED_TOP_LEVEL_KEYS, 'PC-50 fixture', errors);
  for (const field of ['baseline', 'interpretation_contract', 'expected_classification']) {
    if (!record(fixture[field])) errors.push(`PC-50 fixture ${field} must be an object`);
  }
  for (const field of ['required_refusal_rules', 'worlds']) {
    if (!Array.isArray(fixture[field])) errors.push(`PC-50 fixture ${field} must be an array`);
  }
  if (Array.isArray(fixture.worlds) && fixture.worlds.some(world => !record(world))) {
    errors.push('PC-50 worlds must contain objects');
  }
  if (errors.length) return unique(errors);

  requireExactKeys(fixture.baseline, EXPECTED_BASELINE_KEYS, 'PC-50 baseline', errors);
  requireExactKeys(fixture.interpretation_contract, EXPECTED_INTERPRETATION_KEYS, 'PC-50 interpretation contract', errors);
  requireExactKeys(fixture.expected_classification, EXPECTED_CLASSIFICATION_KEYS, 'PC-50 expected classification', errors);
  for (const [index, world] of fixture.worlds.entries()) {
    requireExactKeys(world, EXPECTED_WORLD_KEYS, `PC-50 world ${index}`, errors);
    for (const section of Object.keys(SECTION_KEYS)) {
      if (!record(world[section])) errors.push(`PC-50 world ${world.world_id ?? index} ${section} must be an object`);
    }
    if (!record(world.expected_flags)) errors.push(`PC-50 world ${world.world_id ?? index} expected flags must be an object`);
  }
  if (errors.length) return unique(errors);

  if (fixture.schema_version !== PREFERENCE_LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_FIXTURE_SCHEMA_VERSION) errors.push('PC-50 fixture schema mismatch');
  if (fixture.fixture_id !== EXPECTED_FIXTURE_ID) errors.push('PC-50 fixture id mismatch');
  if (fixture.issue !== 1197 || fixture.parent_program_issue !== 594) errors.push('PC-50 issue binding mismatch');
  if (!isoDate(fixture.captured_at) || fixture.captured_at !== '2026-08-05') errors.push('PC-50 capture date mismatch');
  if (fixture.status !== 'synthetic_control') errors.push('PC-50 status mismatch');
  if (fixture.graph_effect !== 'none') errors.push('PC-50 graph effect must remain none');
  if (fixture.counts_toward_thesis_evidence !== false) errors.push('PC-50 must not count toward thesis evidence');
  if (stable(fixture.required_refusal_rules) !== stable(REQUIRED_LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_REFUSAL_RULES)) errors.push('PC-50 refusal-rule ledger mismatch');
  if (fixture.required_refusal_rules.length !== unique(fixture.required_refusal_rules).length) errors.push('PC-50 refusal rules must be unique');
  if (stable(fixture.expected_classification) !== stable({"public_repository_identifies_executed_source":false,"public_commit_identifies_reproducible_build":false,"public_artifact_digest_identifies_executed_package":false,"public_signature_establishes_complete_provenance":false,"public_lockfile_identifies_complete_dependency_graph":false,"public_image_tag_identifies_executed_runtime":false,"runtime_version_identifies_loaded_modules_and_invocation":false,"matching_replay_outputs_establish_source_to_execution_identity":false,"published_coverage_establishes_real_world_effect":false,"security_compromise_established":false,"graph_effect_present":false,"binding_public_authority_present":false,"complete_executable_artifact_build_dependency_environment_runtime_identity_assurance_supported_in_at_least_one_world":true})) errors.push('PC-50 expected classification mismatch');
  if (fixture.worlds.length !== WORLD_IDS.length) errors.push('PC-50 must contain exactly eight worlds');
  const ids = fixture.worlds.map(world => world.world_id);
  if (stable(ids) !== stable(WORLD_IDS)) errors.push('PC-50 world order or identity mismatch');
  const baselineHash = sha256(fixture.baseline);
  for (const [index, world] of fixture.worlds.entries()) {
    for (const [section, keys] of Object.entries(SECTION_KEYS)) requireExactKeys(world[section], keys, `PC-50 world ${world.world_id} ${section}`, errors);
    requireExactKeys(world.expected_flags, FLAG_KEYS, `PC-50 world ${world.world_id} expected flags`, errors);
    if (world.expected_mechanism !== WORLD_MECHANISMS[world.world_id]) errors.push(`PC-50 world ${world.world_id} mechanism mismatch`);
    const flags = classifyPreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityWorld(world);
    if (stable(flags) !== stable(world.expected_flags)) errors.push(`PC-50 world ${world.world_id} flag classification mismatch`);
    const burden = numericBurden(world);
    if (stable(burden) !== stable(EXPECTED_WORLD_BURDENS[world.world_id])) errors.push(`PC-50 world ${world.world_id} burden allocation mismatch`);
    if (world.governance.binding_public_authority !== false) errors.push(`PC-50 world ${world.world_id} binding authority must remain false`);
    if (sha256(fixture.baseline) !== baselineHash) errors.push('PC-50 public baseline must remain identical across worlds');
  }
  const snapshot = preferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixtureSnapshot(fixture);
  if (snapshot !== EXPECTED_FIXTURE_SNAPSHOT_SHA256) errors.push(`PC-50 fixture snapshot mismatch: ${snapshot}`);
  return unique(errors);
}

export function compilePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(fixture) {
  const errors = validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(fixture);
  if (errors.length) throw new Error(errors.join('\n'));
  const publicSignature = sha256(fixture.baseline);
  const worlds = fixture.worlds.map(world => {
    const projected = projectWorld(world);
    return {
      world_id: world.world_id,
      description: world.description,
      source_review: canonical(world.source_review),
      build_reproducibility: canonical(world.build_reproducibility),
      artifact_package: canonical(world.artifact_package),
      dependency_supply_chain: canonical(world.dependency_supply_chain),
      runtime_environment: canonical(world.runtime_environment),
      execution_attestation: canonical(world.execution_attestation),
      governance: canonical(world.governance),
      expected_mechanism: world.expected_mechanism,
      flags: classifyPreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityWorld(world),
      numeric_burden: numericBurden(world),
      public_signature_sha256: publicSignature,
      artifact_runtime_governance_signature_sha256: sha256(projected)
    };
  });
  const metrics = computeMetrics(worlds);
  const classification = canonical(fixture.expected_classification);
  const chain = custodyChain(fixture, worlds, metrics, classification);
  return {
    schema_version: PREFERENCE_LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'synthetic_executable_artifact_build_dependency_environment_runtime_identity_control_compiled',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    fixture_snapshot_sha256: preferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixtureSnapshot(fixture),
    baseline: canonical(fixture.baseline),
    baseline_snapshot_sha256: publicSignature,
    public_signature_count: metrics.public_artifact_build_runtime_signatures,
    world_count: worlds.length,
    artifact_runtime_governance_signature_count: metrics.artifact_runtime_governance_signatures,
    complete_artifact_runtime_assurance_world_count: metrics.complete_artifact_runtime_assurance_worlds,
    worlds,
    metrics,
    classification,
    required_refusal_rules: [...fixture.required_refusal_rules],
    custody_chain: chain,
    custody_chain_head_sha256: chain.at(-1).event_sha256,
    interpretation_contract: canonical(fixture.interpretation_contract)
  };
}

function validateCustodyChain(build, errors) {
  if (!Array.isArray(build.custody_chain) || build.custody_chain.length !== 5) { errors.push('PC-50 custody chain must contain five events'); return; }
  if (build.custody_chain.some(event => !record(event))) { errors.push('PC-50 custody events must be objects'); return; }
  let previous = null;
  for (const [index, event] of build.custody_chain.entries()) {
    if (event.event_index !== index + 1) errors.push(`PC-50 custody event ${index} index mismatch`);
    if (event.previous_event_sha256 !== previous) errors.push(`PC-50 custody event ${index} previous hash mismatch`);
    const { event_sha256, ...unsigned } = event;
    if (event_sha256 !== sha256(unsigned)) errors.push(`PC-50 custody event ${index} hash mismatch`);
    previous = event_sha256;
  }
  if (build.custody_chain_head_sha256 !== previous) errors.push('PC-50 custody chain head mismatch');
}

export function validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityBuild(build, fixture) {
  const errors = [];
  validateCanonicalJsonTree(build, 'PC-50 build', errors);
  if (errors.length) return unique(errors);
  if (!record(build)) return ['PC-50 build must be an object'];
  requireExactKeys(build, BUILD_KEYS, 'PC-50 build', errors);
  const arrayFields = ['worlds','required_refusal_rules','custody_chain'];
  for (const field of arrayFields) if (!Array.isArray(build[field])) errors.push(`PC-50 build ${field} must be an array`);
  const objectFields = ['baseline','metrics','classification','interpretation_contract'];
  for (const field of objectFields) if (!record(build[field])) errors.push(`PC-50 build ${field} must be an object`);
  if (Array.isArray(build.worlds) && build.worlds.some(world => !record(world))) errors.push('PC-50 compiled worlds must contain objects');
  if (Array.isArray(build.custody_chain) && build.custody_chain.some(event => !record(event))) errors.push('PC-50 custody events must contain objects');
  if (errors.length) return unique(errors);
  for (const [index, world] of build.worlds.entries()) {
    requireExactKeys(world, COMPILED_WORLD_KEYS, `PC-50 compiled world ${index}`, errors);
    if (!record(world.flags)) errors.push(`PC-50 compiled world ${index} flags must be an object`);
    else requireExactKeys(world.flags, FLAG_KEYS, `PC-50 compiled world ${index} flags`, errors);
    if (!record(world.numeric_burden)) errors.push(`PC-50 compiled world ${index} numeric burden must be an object`);
    else requireExactKeys(world.numeric_burden, Object.keys(BURDEN_LOCATIONS), `PC-50 compiled world ${index} numeric burden`, errors);
  }
  if (errors.length) return unique(errors);
  errors.push(...validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(fixture));
  if (errors.length) return unique(errors);
  let expected;
  try { expected = compilePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(fixture); }
  catch (error) { errors.push(`PC-50 expected build could not compile: ${error.message}`); return unique(errors); }
  if (stable(build) !== stable(expected)) errors.push('PC-50 build differs from deterministic compilation');
  if (stable(build.metrics) !== stable(EXPECTED_LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_METRICS)) errors.push('PC-50 metrics mismatch');
  for (const [key, value] of Object.entries(LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_FALSE_CLASSIFICATIONS)) {
    if (build.classification?.[key] !== value) errors.push(`PC-50 classification ${key} must remain ${value}`);
  }
  if (build.classification?.complete_executable_artifact_build_dependency_environment_runtime_identity_assurance_supported_in_at_least_one_world !== true) errors.push('PC-50 must preserve one complete synthetic world');
  validateCustodyChain(build, errors);
  return unique(errors);
}

export function renderPreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityMarkdown(build) {
  const metricLines = Object.entries(build.metrics).map(([key, value]) => `| ${key} | ${value} |`).join('\n');
  const worldLines = build.worlds.map(world => `| ${world.world_id} | ${world.expected_mechanism} | ${world.flags.complete_executable_artifact_build_dependency_environment_runtime_identity_assurance ? 'complete' : 'refused'} | ${Object.values(world.numeric_burden).reduce((sum, value) => sum + value, 0)} |`).join('\n');
  return `# PC-50 executable artifact, build, dependency, environment, and runtime identity custody

` +
    `Synthetic control only. Graph effect: **${build.graph_effect}**. Real-world evidence: **${build.real_world_evidence_state}**.

` +
    `## Metrics

| Metric | Value |
| --- | ---: |
${metricLines}

` +
    `## Eight incompatible worlds

| World | Mechanism | Complete assurance | Numeric burden |
| --- | --- | --- | ---: |
${worldLines}

` +
    `Only one synthetic world satisfies complete reviewed-source, reproducible-build, artifact, dependency, container, environment, loaded-module, execution-attestation, correction, and current-lineage custody. Public badges remain nonproof of the executed artifact or a real-world security or validity conclusion.
`;
}
