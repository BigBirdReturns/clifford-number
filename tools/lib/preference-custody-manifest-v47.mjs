import { createHash } from 'node:crypto';
import {
  loadPreferenceCustodyV45SourceBundle,
  validatePreferenceCustodyManifestV46,
  validatePreferenceCustodyManifestV46Build
} from './preference-custody-manifest-v46.mjs';
import {
  PREFERENCE_LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_BUILD_SCHEMA_VERSION,
  REQUIRED_LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_REFUSAL_RULES,
  validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayBuild,
  validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture
} from './preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V47_SCHEMA_VERSION = 'preference-custody-control-manifest-v47@1';
export const PREFERENCE_CUSTODY_MANIFEST_V47_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v47-build@1';
export const PREFERENCE_CUSTODY_V46_SOURCE_BUNDLE_SCHEMA_VERSION = 'preference-custody-v46-source-bundle@1';

const EXPECTED_MANIFEST_SNAPSHOT_SHA256 = 'f3f29b28a71ef9ca7f63140541ea863646c41f683d6b1853836c55c46e50f6c3';
const EXPECTED_MANIFEST_KEYS = Object.freeze(["schema_version","manifest_id","issue","control_issue","captured_at","status","graph_effect","counts_toward_thesis_evidence","base_floor","extension_control","identification_requirement","frontier_transition","real_case_requirements_added","prohibited_inferences","interpretation_contract"]);
const EXPECTED_BASE_FLOOR_KEYS = Object.freeze(["manifest_id","source_manifest_path","expected_build_schema","expected_control_count"]);
const EXPECTED_EXTENSION_KEYS = Object.freeze(["control_id","fixture_id","failure_class","source_fixture_path","build_artifact_path","expected_build_schema","required_refusal_rules"]);
const EXPECTED_IDENTIFICATION_KEYS = Object.freeze(["stage","required_state","refused_inference"]);
const EXPECTED_FRONTIER_KEYS = Object.freeze(["resolved_base_frontier","successor_frontiers"]);
const EXPECTED_INTERPRETATION_KEYS = Object.freeze(["contract_id","what_this_is","what_this_is_not","copy_ready_caveat"]);
const EXPECTED_SOURCE_BUNDLE_KEYS = Object.freeze(['manifest','baseBuild','targetBuild','targetFixture','baseSources']);
const REQUIRED_CONTROL_IDS = Object.freeze(Array.from({ length: 49 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`));
const RESOLVED_FRONTIER = "linkage_interval_runtime_artifact_dependency_numerical_determinism_and_replay_assurance";
const REQUIRED_SUCCESSORS = Object.freeze(["linkage_interval_executable_artifact_build_dependency_environment_and_runtime_identity_governance","linkage_interval_numerical_determinism_seed_prng_parallelism_hardware_precision_and_replay_equivalence_governance"]);
const PC48_DEPLOYMENT_SUCCESSOR = 'linkage_interval_deployment_applicability_monitoring_shift_trigger_abstention_rollback_and_release_succession_governance';
const PC47_EVENT_SUCCESSOR = 'linkage_interval_event_state_competing_event_censoring_abstention_and_ambiguity_governance';
const PC47_ESTIMAND_SUCCESSOR = 'linkage_interval_estimand_population_unit_horizon_support_tail_coverage_meaning_and_interpretation_governance';
const EXPECTED_MANIFEST_LITERAL = Object.freeze({"schema_version":"preference-custody-control-manifest-v47@1","manifest_id":"preference-custody-laboratory-floor-v47","issue":594,"control_issue":1120,"captured_at":"2026-08-04","status":"synthetic_control_floor_extension","graph_effect":"none","counts_toward_thesis_evidence":false,"base_floor":{"manifest_id":"preference-custody-laboratory-floor-v46","source_manifest_path":"data/research/preference-custody/control-manifest-v46.json","expected_build_schema":"preference-custody-control-manifest-v46-build@1","expected_control_count":48},"extension_control":{"control_id":"PC-49","fixture_id":"same-linkage-runtime-replay-status-different-artifact-dependency-numerical-states-v1","failure_class":"linkage_interval_runtime_artifact_dependency_environment_hardware_precision_prng_parallelism_replay_equifinality","source_fixture_path":"data/research/preference-custody/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.fixture.json","build_artifact_path":"build/research/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.json","expected_build_schema":"preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance-build@1","required_refusal_rules":["one_public_replay_badge_is_not_the_executed_artifact_and_loaded_runtime","one_artifact_digest_is_not_the_loaded_entry_point_package_module_and_container_layer_set","one_lockfile_is_not_complete_transitive_dependency_provenance_and_package_checksum_custody","one_container_tag_is_not_an_immutable_operating_system_runtime_and_environment_image","one_successful_replay_is_not_deterministic_assurance_across_permitted_environments_hardware_and_numerics","one_seed_label_is_not_prng_algorithm_state_stream_counter_substream_and_draw_order_custody","one_hardware_match_is_not_numerical_equivalence_without_driver_kernel_instruction_precision_rounding_and_reduction_order","matching_aggregate_metrics_are_not_pair_level_output_equivalence","post_result_or_widened_tolerance_is_not_predeclared_replay_equivalence","one_exact_byte_match_is_not_complete_replay_custody_without_input_output_and_execution_lineage","one_parallel_run_is_not_scheduler_process_async_cache_filesystem_clock_and_service_order_invariance","absence_of_a_divergence_log_is_not_evidence_of_zero_divergence","historical_replay_assurance_is_not_current_after_artifact_dependency_runtime_hardware_precision_prng_parallelism_tolerance_or_release_succession","replay_or_numerical_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent","binding_public_authority_requires_separate_current_public_authorization_receipts","synthetic_runtime_burdens_are_not_real_world_error_prevalence_or_institutional_performance_estimates","portable_replay_requires_declared_environment_matrix_failure_thresholds_correction_and_retirement_receipts"]},"identification_requirement":{"stage":"linkage_interval_runtime_artifact_dependency_numerical_determinism_and_replay","required_state":"bound_executed_artifact_dependency_environment_hardware_precision_prng_parallelism_input_output_equivalence_correction_and_current_runtime_lineage_custody","refused_inference":"public_artifact_deterministic_replay_and_portable_replay_badges_do_not_identify_the_executed_runtime_or_pair_level_equivalence"},"frontier_transition":{"resolved_base_frontier":"linkage_interval_runtime_artifact_dependency_numerical_determinism_and_replay_assurance","successor_frontiers":["linkage_interval_executable_artifact_build_dependency_environment_and_runtime_identity_governance","linkage_interval_numerical_determinism_seed_prng_parallelism_hardware_precision_and_replay_equivalence_governance"]},"real_case_requirements_added":["linkage_interval_v47_artifact_identity_owner_version_and_release","linkage_interval_v47_repository_commit_source_tree_and_reviewed_source_custody","linkage_interval_v47_reviewed_file_blob_diff_and_approval_custody","linkage_interval_v47_build_recipe_toolchain_and_reproducible_build_contract","linkage_interval_v47_build_artifact_digest_signature_and_provenance","linkage_interval_v47_executable_entry_point_package_and_loaded_module_set","linkage_interval_v47_container_image_layer_and_base_image_identity","linkage_interval_v47_executed_artifact_to_reviewed_source_attestation","linkage_interval_v47_dependency_lock_identity_and_hash","linkage_interval_v47_transitive_dependency_graph_and_resolution_receipt","linkage_interval_v47_package_checksum_registry_and_supply_chain_provenance","linkage_interval_v47_compiler_version_flags_linker_and_optimization_policy","linkage_interval_v47_operating_system_image_kernel_and_system_library_custody","linkage_interval_v47_language_runtime_vm_and_standard_library_custody","linkage_interval_v47_environment_variable_parameter_and_secret_version_custody","linkage_interval_v47_locale_timezone_encoding_and_collation_policy","linkage_interval_v47_filesystem_input_snapshot_order_and_metadata_custody","linkage_interval_v47_external_service_response_snapshot_and_retry_policy","linkage_interval_v47_cpu_gpu_accelerator_and_hardware_identity","linkage_interval_v47_driver_kernel_math_library_and_accelerator_runtime","linkage_interval_v47_instruction_set_feature_and_architecture_policy","linkage_interval_v47_thread_process_worker_and_device_topology","linkage_interval_v47_numerical_precision_dtype_and_mixed_precision_policy","linkage_interval_v47_rounding_fma_denormal_and_exception_policy","linkage_interval_v47_reduction_aggregation_sort_and_tie_break_order","linkage_interval_v47_nondeterministic_operation_inventory_and_disablement_audit","linkage_interval_v47_numerical_perturbation_sensitivity_and_stability_tests","linkage_interval_v47_seed_value_source_owner_and_version","linkage_interval_v47_prng_algorithm_implementation_and_version","linkage_interval_v47_prng_state_counter_and_checkpoint_custody","linkage_interval_v47_stream_substream_partition_and_collision_audit","linkage_interval_v47_draw_order_call_graph_and_consumption_ledger","linkage_interval_v47_rejection_sampling_branch_and_resampling_path_custody","linkage_interval_v47_scheduler_queue_and_concurrency_policy","linkage_interval_v47_async_completion_message_and_callback_order","linkage_interval_v47_cache_state_warmup_eviction_and_reuse_policy","linkage_interval_v47_clock_time_source_timeout_and_timestamp_policy","linkage_interval_v47_replay_input_snapshot_identity_digest_and_lineage","linkage_interval_v47_pair_level_output_digest_and_ordered_result_custody","linkage_interval_v47_exact_equivalence_definition_and_byte_semantic_scope","linkage_interval_v47_tolerance_policy_metric_version_and_precommitment","linkage_interval_v47_symmetric_pair_level_subgroup_and_tail_tolerances","linkage_interval_v47_aggregate_only_equivalence_refusal_and_denominator","linkage_interval_v47_divergence_ledger_first_difference_and_root_cause","linkage_interval_v47_divergence_disposition_correction_and_republication","linkage_interval_v47_cross_environment_hardware_runtime_replay_matrix","linkage_interval_v47_failure_suppression_retry_and_alert_audit","linkage_interval_v47_artifact_dependency_runtime_hardware_and_policy_succession","linkage_interval_v47_hash_linked_artifact_dependency_numerical_prng_parallelism_replay_and_interpretation_chain"],"prohibited_inferences":["Do not treat floor v47 or PC-49 as evidence that any named person organization institution platform network source system artifact or deployment executed a deterministic or portable linkage-interval replay.","Do not infer the executed artifact from a public digest badge, repository URL, commit hash, package label, container tag, or documentation page.","Do not infer the loaded dependency graph from one lockfile without transitive resolution, package checksum, runtime, and module-load custody.","Do not infer immutable runtime identity from a mutable container tag or environment label.","Do not infer numerical determinism from one successful replay or one matching aggregate metric.","Do not infer PRNG reproducibility from a seed label without algorithm, version, state, stream, counter, and draw-order custody.","Do not infer cross-hardware equivalence without accelerator, driver, kernel, instruction, precision, rounding, and reduction-order receipts.","Do not infer deterministic parallel execution without scheduler, process, async, cache, filesystem, clock, and service-order custody.","Do not infer pair-level equivalence from matching aggregate coverage, mean width, totals, or hashes over reordered outputs.","Do not accept a tolerance created, widened, or made asymmetric after observing replay differences.","Do not treat the absence of a divergence record as evidence that no divergence occurred.","Do not infer current replay assurance after artifact, dependency, runtime, environment, hardware, precision, PRNG, parallelism, tolerance, or release succession.","Do not infer public authorization from complete runtime, artifact, dependency, numerical, or replay custody.","Do not infer preference change manipulation discrimination breach misconduct coordination common purpose or intent from replay or numerical failure.","Do not treat synthetic burdens as real-world error prevalence welfare trajectory causal effect or institutional-performance estimates.","Do not treat the forty-nine-control floor as exhaustive of every legal economic constitutional security social network market or performative failure mode."],"interpretation_contract":{"contract_id":"preference-custody-control-manifest-v47@1","what_this_is":"A compositional successor floor preserving the qualified forty-eight-control v46 base and adding PC-49 runtime-artifact, dependency, numerical-determinism, PRNG, parallelism, replay-equivalence, and current-lineage equifinality.","what_this_is_not":"A real executable-artifact audit, dependency attestation, deterministic-runtime verification, portability result, interval-validity finding, causal effect, longitudinal history, graph fact, allegation, or public-authority verdict.","copy_ready_caveat":"Preference Custody floor v47 composes the qualified v46 controls with PC-49. It separates complete-looking artifact and replay badges from the executed artifact, loaded dependencies, fixed environment and hardware, numerical and PRNG determinism, execution order, pair-level equivalence, divergence correction, and current runtime succession."}});

const BUILD_KEYS = Object.freeze([
  'schema_version','manifest_id','issue','control_issue','captured_at','status','graph_effect',
  'counts_toward_thesis_evidence','conclusion_generated','real_world_evidence_state','control_count',
  'controls','composition','control_integrity','identification_requirements','refusal_rule_union',
  'open_frontiers','frontier_transition','promotion_boundary','custody_chain','custody_chain_head_sha256',
  'prohibited_inferences','interpretation_contract'
]);
const COMPOSITION_KEYS = Object.freeze([
  'base_manifest_id','base_schema_version','base_control_count','extension_control_id',
  'manifest_snapshot_sha256','base_floor_snapshot_sha256','extension_snapshot_sha256',
  'v46_source_bundle_schema_version','v46_source_bundle_sha256','base_controls_sha256',
  'base_promotion_requirements_sha256','base_refusal_rule_union_sha256',
  'base_identification_requirements_sha256','base_open_frontiers_sha256',
  'base_prohibited_inferences_sha256','base_interpretation_contract_sha256',
  'base_promotion_requirement_count','added_promotion_requirement_count',
  'final_promotion_requirement_count','base_open_frontiers'
]);
const CONTROL_INTEGRITY_KEYS = Object.freeze([
  'base_floor_qualified','base_integrity_preserved','v46_complete_source_bundle_bound',
  'all_graph_effect_none','no_thesis_evidence_consumption','no_real_world_conclusion',
  'no_preference_change_claim','no_intent_inference','all_required_pc49_refusal_rules_present',
  'complete_runtime_assurance_path_preserved','pc48_deployment_successor_preserved',
  'pc47_event_state_successor_preserved','pc47_estimand_scope_successor_preserved'
]);
const INPUT_VALIDATION_CACHE = new Map();

const PROMOTION_KEYS = Object.freeze([
  'promotion_authority','promotion_requirement_count','real_case_requires','laboratory_controls_are_real_world_evidence'
]);

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const sorted = values => [...values].sort((left, right) => String(left).localeCompare(String(right)));
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const stable = value => JSON.stringify(canonical(value));
const sha256 = value => createHash('sha256').update(typeof value === 'string' ? value : stable(value)).digest('hex');
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
    if (type === 'number') { if (!Number.isFinite(current)) errors.push(`${path} must contain finite JSON numbers`); return; }
    if (type !== 'object') { errors.push(`${path} contains unsupported JSON value type ${type}`); return; }
    if (seen.has(current)) { errors.push(`${path} contains a repeated, cross-root-aliased, or cyclic object`); return; }
    seen.add(current);
    let prototype;
    let keys;
    try { prototype = Object.getPrototypeOf(current); keys = Reflect.ownKeys(current); } catch { errors.push(`${path} must be inspectable canonical JSON data`); return; }
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
function collectCaptureDates(value, path, output, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (!Array.isArray(value) && Object.hasOwn(value, 'captured_at')) output.push([`${path}.captured_at`, value.captured_at]);
  if (Array.isArray(value)) value.forEach((item, index) => collectCaptureDates(item, `${path}[${index}]`, output, seen));
  else Object.entries(value).forEach(([key, item]) => collectCaptureDates(item, `${path}.${key}`, output, seen));
}
function validateChronology(floorDate, values) {
  const errors = [];
  if (!isoDate(floorDate)) return errors;
  const dates = [];
  values.forEach(([path, value]) => collectCaptureDates(value, path, dates));
  for (const [path, date] of dates) {
    if (!isoDate(date)) errors.push(`PC-49 source chronology invalid date: ${path}`);
    else if (date > floorDate) errors.push(`PC-49 source snapshot postdates floor: ${path} ${date} > ${floorDate}`);
  }
  return errors;
}
function seal(event, previousEventSha256) {
  const unsigned = { ...canonical(event), previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

export function loadPreferenceCustodyV46SourceBundle(load) {
  return {
    manifest: load('data/research/preference-custody/control-manifest-v46.json'),
    baseBuild: load('build/research/preference-custody-laboratory-floor-v45.json'),
    targetBuild: load('build/research/preference-linkage-interval-method-partition-replication-deployment-assurance.json'),
    targetFixture: load('data/research/preference-custody/linkage-interval-method-partition-replication-deployment-assurance.fixture.json'),
    baseSources: loadPreferenceCustodyV45SourceBundle(load)
  };
}
export const preferenceCustodyV46SourceBundleSnapshot = sourceBundle => sha256({
  schema_version: PREFERENCE_CUSTODY_V46_SOURCE_BUNDLE_SCHEMA_VERSION,
  source_bundle: sourceBundle
});
export const preferenceCustodyManifestV47Snapshot = manifest => sha256(manifest);

export function validatePreferenceCustodyManifestV47(manifest) {
  const errors = [];
  validateCanonicalJsonTree(manifest, 'Preference Custody v47 manifest', errors);
  if (errors.length) return errors;
  requireExactKeys(manifest, EXPECTED_MANIFEST_KEYS, 'Preference Custody v47 manifest', errors);
  requireExactKeys(manifest.base_floor, EXPECTED_BASE_FLOOR_KEYS, 'Preference Custody v47 base floor', errors);
  requireExactKeys(manifest.extension_control, EXPECTED_EXTENSION_KEYS, 'Preference Custody v47 extension', errors);
  requireExactKeys(manifest.identification_requirement, EXPECTED_IDENTIFICATION_KEYS, 'Preference Custody v47 identification requirement', errors);
  requireExactKeys(manifest.frontier_transition, EXPECTED_FRONTIER_KEYS, 'Preference Custody v47 frontier transition', errors);
  requireExactKeys(manifest.interpretation_contract, EXPECTED_INTERPRETATION_KEYS, 'Preference Custody v47 interpretation contract', errors);
  if (manifest.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V47_SCHEMA_VERSION) errors.push('Preference Custody v47 schema mismatch');
  if (manifest.manifest_id !== 'preference-custody-laboratory-floor-v47') errors.push('Preference Custody v47 manifest id mismatch');
  if (manifest.issue !== 594 || manifest.control_issue !== 1120) errors.push('Preference Custody v47 issue binding mismatch');
  if (manifest.captured_at !== '2026-08-04' || !isoDate(manifest.captured_at)) errors.push('Preference Custody v47 capture date mismatch');
  if (manifest.status !== 'synthetic_control_floor_extension') errors.push('Preference Custody v47 status mismatch');
  if (manifest.graph_effect !== 'none') errors.push('Preference Custody v47 graph effect must remain none');
  if (manifest.counts_toward_thesis_evidence !== false) errors.push('Preference Custody v47 must not count toward thesis evidence');
  if (manifest.base_floor.manifest_id !== 'preference-custody-laboratory-floor-v46' || manifest.base_floor.expected_build_schema !== 'preference-custody-control-manifest-v46-build@1' || manifest.base_floor.expected_control_count !== 48) errors.push('Preference Custody v47 base-floor contract mismatch');
  if (manifest.extension_control.control_id !== 'PC-49' || manifest.extension_control.expected_build_schema !== PREFERENCE_LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_BUILD_SCHEMA_VERSION) errors.push('Preference Custody v47 extension contract mismatch');
  if (stable(manifest.extension_control.required_refusal_rules) !== stable(REQUIRED_LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_REFUSAL_RULES)) errors.push('Preference Custody v47 extension refusal-rule ledger mismatch');
  if (manifest.frontier_transition.resolved_base_frontier !== RESOLVED_FRONTIER || stable(manifest.frontier_transition.successor_frontiers) !== stable(REQUIRED_SUCCESSORS)) errors.push('Preference Custody v47 frontier transition mismatch');
  if (!Array.isArray(manifest.real_case_requirements_added) || manifest.real_case_requirements_added.length !== 49 || unique(manifest.real_case_requirements_added).length !== 49) errors.push('Preference Custody v47 must add exactly 49 unique promotion requirements');
  if (!Array.isArray(manifest.prohibited_inferences) || manifest.prohibited_inferences.length !== 16 || unique(manifest.prohibited_inferences).length !== 16) errors.push('Preference Custody v47 prohibited-inference ledger mismatch');
  const snapshot = preferenceCustodyManifestV47Snapshot(manifest);
  if (snapshot !== EXPECTED_MANIFEST_SNAPSHOT_SHA256 || stable(manifest) !== stable(EXPECTED_MANIFEST_LITERAL)) errors.push(`Preference Custody v47 manifest snapshot mismatch: ${snapshot}`);
  return unique(errors);
}

function validateInputBundle(manifest, baseBuild, targetBuild, targetFixture, baseSources) {
  const manifestErrors = validatePreferenceCustodyManifestV47(manifest);
  if (manifestErrors.length) return manifestErrors;
  const errors = [];
  const root = { baseBuild, targetBuild, targetFixture, baseSources };
  validateCanonicalJsonTree(root, 'Preference Custody v47 input roots', errors);
  if (errors.length) return errors;
  let cacheKey;
  try { cacheKey = sha256({ baseBuild, targetBuild, targetFixture, baseSources }); }
  catch (error) { return [`Preference Custody v47 input snapshot failed closed: ${error.message}`]; }
  if (INPUT_VALIDATION_CACHE.has(cacheKey)) return [...INPUT_VALIDATION_CACHE.get(cacheKey)];
  requireExactKeys(baseSources, EXPECTED_SOURCE_BUNDLE_KEYS, 'Preference Custody v46 source bundle', errors);
  errors.push(...validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture(targetFixture));
  errors.push(...validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayBuild(targetBuild, targetFixture));
  if (baseBuild?.schema_version !== manifest.base_floor.expected_build_schema || baseBuild?.manifest_id !== manifest.base_floor.manifest_id || baseBuild?.control_count !== manifest.base_floor.expected_control_count) errors.push('Preference Custody v47 base build identity mismatch');
  if (baseSources?.manifest?.manifest_id !== 'preference-custody-laboratory-floor-v46') errors.push('Preference Custody v46 source manifest identity mismatch');
  try {
    errors.push(...validatePreferenceCustodyManifestV46(baseSources.manifest));
    errors.push(...validatePreferenceCustodyManifestV46Build(baseBuild, baseSources.manifest, baseSources.baseBuild, baseSources.targetBuild, baseSources.targetFixture, baseSources.baseSources));
  } catch (error) { errors.push(`Preference Custody v46 source validation failed closed: ${error.message}`); }
  if (!array(baseBuild?.open_frontiers).includes(RESOLVED_FRONTIER)) errors.push('Preference Custody v46 base does not expose the PC-49 frontier');
  for (const frontier of [PC48_DEPLOYMENT_SUCCESSOR, PC47_EVENT_SUCCESSOR, PC47_ESTIMAND_SUCCESSOR]) if (!array(baseBuild?.open_frontiers).includes(frontier)) errors.push(`Preference Custody v46 base missing preserved frontier ${frontier}`);
  errors.push(...validateChronology(manifest.captured_at, [['baseBuild', baseBuild], ['targetBuild', targetBuild], ['targetFixture', targetFixture], ['baseSources', baseSources]]));
  const result = unique(errors);
  INPUT_VALIDATION_CACHE.set(cacheKey, [...result]);
  return result;
}

function extensionControl(manifest, targetBuild) {
  return {
    control_id: 'PC-49',
    fixture_id: manifest.extension_control.fixture_id,
    failure_class: manifest.extension_control.failure_class,
    source_fixture_path: manifest.extension_control.source_fixture_path,
    build_artifact_path: manifest.extension_control.build_artifact_path,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_effect_claimed: false,
    preference_change_present: false,
    manipulative_intent_inferable: false,
    required_refusal_rules: [...manifest.extension_control.required_refusal_rules],
    observed_refusal_rules: [...targetBuild.required_refusal_rules],
    fixture_snapshot_sha256: targetBuild.fixture_snapshot_sha256,
    build_snapshot_sha256: sha256(targetBuild),
    public_signature_count: targetBuild.public_signature_count,
    runtime_governance_signature_count: targetBuild.runtime_governance_signature_count,
    complete_runtime_assurance_world_count: targetBuild.complete_runtime_assurance_world_count,
    metrics: canonical(targetBuild.metrics),
    classification: canonical(targetBuild.classification)
  };
}
function custodyChain(manifest, baseBuild, targetBuild, sourceBundle, compiledParts) {
  const events = [
    { event_id: `${manifest.manifest_id}:manifest`, event_type: 'manifest_frozen', authority: 'preference_custody_v47_analyst', evidence_class: 'candidate_inference', source_event_ids: [], payload: { manifest_snapshot_sha256: compiledParts.manifestSnapshot, graph_effect: 'none' } },
    { event_id: `${manifest.manifest_id}:base`, event_type: 'qualified_base_bound', authority: 'preference_custody_v47_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${manifest.manifest_id}:manifest`], payload: { base_manifest_id: baseBuild.manifest_id, base_control_count: baseBuild.control_count, base_floor_snapshot_sha256: compiledParts.baseSnapshot, v46_source_bundle_sha256: compiledParts.sourceSnapshot } },
    { event_id: `${manifest.manifest_id}:extension`, event_type: 'pc49_extension_bound', authority: 'preference_custody_v47_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${manifest.manifest_id}:base`], payload: { control_id: 'PC-49', extension_snapshot_sha256: compiledParts.targetSnapshot, complete_runtime_assurance_world_count: targetBuild.complete_runtime_assurance_world_count } },
    { event_id: `${manifest.manifest_id}:promotion`, event_type: 'promotion_boundary_extended', authority: 'preference_custody_v47_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${manifest.manifest_id}:extension`], payload: { base_promotion_requirement_count: baseBuild.promotion_boundary.promotion_requirement_count, added_promotion_requirement_count: manifest.real_case_requirements_added.length, final_promotion_requirement_count: compiledParts.finalRequirementCount, laboratory_controls_are_real_world_evidence: false } },
    { event_id: `${manifest.manifest_id}:interpretation`, event_type: 'interpretation_sealed', authority: 'preference_custody_v47_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${manifest.manifest_id}:promotion`], payload: { allowed_interpretation: 'qualified forty-nine-control synthetic Preference Custody floor', graph_effect: 'none', real_world_evidence_state: 'none', interpretation_contract: canonical(manifest.interpretation_contract) } }
  ];
  let previous = null;
  return events.map(event => { const sealed = seal(event, previous); previous = sealed.event_sha256; return sealed; });
}

export function compilePreferenceCustodyManifestV47(manifest, baseBuild, targetBuild, targetFixture, baseSources) {
  const errors = validateInputBundle(manifest, baseBuild, targetBuild, targetFixture, baseSources);
  if (errors.length) throw new Error(errors.join('\n'));
  const extension = extensionControl(manifest, targetBuild);
  const controls = [...structuredClone(baseBuild.controls), extension];
  const controlIds = controls.map(control => control.control_id);
  const openFrontiers = baseBuild.open_frontiers.filter(frontier => frontier !== RESOLVED_FRONTIER);
  for (const successor of REQUIRED_SUCCESSORS) if (!openFrontiers.includes(successor)) openFrontiers.push(successor);
  const promotionRequirements = [...baseBuild.promotion_boundary.real_case_requires, ...manifest.real_case_requirements_added];
  const manifestSnapshot = preferenceCustodyManifestV47Snapshot(manifest);
  const baseSnapshot = sha256(baseBuild);
  const targetSnapshot = sha256(targetBuild);
  const sourceSnapshot = preferenceCustodyV46SourceBundleSnapshot(baseSources);
  const finalRequirementCount = promotionRequirements.length;
  const parts = { manifestSnapshot, baseSnapshot, targetSnapshot, sourceSnapshot, finalRequirementCount };
  const composition = {
    base_manifest_id: baseBuild.manifest_id,
    base_schema_version: baseBuild.schema_version,
    base_control_count: baseBuild.control_count,
    extension_control_id: 'PC-49',
    manifest_snapshot_sha256: manifestSnapshot,
    base_floor_snapshot_sha256: baseSnapshot,
    extension_snapshot_sha256: targetSnapshot,
    v46_source_bundle_schema_version: PREFERENCE_CUSTODY_V46_SOURCE_BUNDLE_SCHEMA_VERSION,
    v46_source_bundle_sha256: sourceSnapshot,
    base_controls_sha256: sha256(baseBuild.controls),
    base_promotion_requirements_sha256: sha256(baseBuild.promotion_boundary.real_case_requires),
    base_refusal_rule_union_sha256: sha256(baseBuild.refusal_rule_union),
    base_identification_requirements_sha256: sha256(baseBuild.identification_requirements),
    base_open_frontiers_sha256: sha256(baseBuild.open_frontiers),
    base_prohibited_inferences_sha256: sha256(baseBuild.prohibited_inferences),
    base_interpretation_contract_sha256: sha256(baseBuild.interpretation_contract),
    base_promotion_requirement_count: baseBuild.promotion_boundary.promotion_requirement_count,
    added_promotion_requirement_count: manifest.real_case_requirements_added.length,
    final_promotion_requirement_count: finalRequirementCount,
    base_open_frontiers: [...baseBuild.open_frontiers]
  };
  const integrity = {
    base_floor_qualified: true,
    base_integrity_preserved: sha256(controls.slice(0, 48)) === sha256(baseBuild.controls),
    v46_complete_source_bundle_bound: true,
    all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
    no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
    no_real_world_conclusion: controls.every(control => control.conclusion_generated === false),
    no_preference_change_claim: controls.every(control => control.preference_change_present !== true),
    no_intent_inference: controls.every(control => control.manipulative_intent_inferable !== true),
    all_required_pc49_refusal_rules_present: manifest.extension_control.required_refusal_rules.every(rule => extension.observed_refusal_rules.includes(rule)),
    complete_runtime_assurance_path_preserved: targetBuild.complete_runtime_assurance_world_count === 1,
    pc48_deployment_successor_preserved: openFrontiers.includes(PC48_DEPLOYMENT_SUCCESSOR),
    pc47_event_state_successor_preserved: openFrontiers.includes(PC47_EVENT_SUCCESSOR),
    pc47_estimand_scope_successor_preserved: openFrontiers.includes(PC47_ESTIMAND_SUCCESSOR)
  };
  const chain = custodyChain(manifest, baseBuild, targetBuild, baseSources, parts);
  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V47_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'synthetic_preference_custody_floor_v47_compiled',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    control_count: controls.length,
    controls,
    composition,
    control_integrity: integrity,
    identification_requirements: [...structuredClone(baseBuild.identification_requirements), canonical(manifest.identification_requirement)],
    refusal_rule_union: unique([...baseBuild.refusal_rule_union, ...manifest.extension_control.required_refusal_rules]),
    open_frontiers: openFrontiers,
    frontier_transition: canonical(manifest.frontier_transition),
    promotion_boundary: {
      promotion_authority: baseBuild.promotion_boundary.promotion_authority,
      promotion_requirement_count: finalRequirementCount,
      real_case_requires: promotionRequirements,
      laboratory_controls_are_real_world_evidence: false
    },
    custody_chain: chain,
    custody_chain_head_sha256: chain.at(-1).event_sha256,
    prohibited_inferences: unique([...baseBuild.prohibited_inferences, ...manifest.prohibited_inferences]),
    interpretation_contract: canonical(manifest.interpretation_contract)
  };
}

function validateChain(build, errors) {
  if (!Array.isArray(build.custody_chain) || build.custody_chain.length !== 5) { errors.push('Preference Custody v47 custody chain must contain five events'); return; }
  let previous = null;
  for (const [index, event] of build.custody_chain.entries()) {
    if (event.previous_event_sha256 !== previous) errors.push(`Preference Custody v47 custody event ${index} previous hash mismatch`);
    const { event_sha256, ...unsigned } = event;
    if (event_sha256 !== sha256(unsigned)) errors.push(`Preference Custody v47 custody event ${index} hash mismatch`);
    previous = event_sha256;
  }
  if (build.custody_chain_head_sha256 !== previous) errors.push('Preference Custody v47 custody chain head mismatch');
}
export function validatePreferenceCustodyManifestV47Build(build, manifest, baseBuild, targetBuild, targetFixture, baseSources) {
  const errors = [];
  validateCanonicalJsonTree(build, 'Preference Custody v47 build', errors);
  if (errors.length) return errors;
  requireExactKeys(build, BUILD_KEYS, 'Preference Custody v47 build', errors);
  requireExactKeys(build.composition, COMPOSITION_KEYS, 'Preference Custody v47 composition', errors);
  requireExactKeys(build.control_integrity, CONTROL_INTEGRITY_KEYS, 'Preference Custody v47 control integrity', errors);
  requireExactKeys(build.promotion_boundary, PROMOTION_KEYS, 'Preference Custody v47 promotion boundary', errors);
  const inputErrors = validateInputBundle(manifest, baseBuild, targetBuild, targetFixture, baseSources);
  errors.push(...inputErrors);
  if (inputErrors.length) return unique(errors);
  let expected;
  try { expected = compilePreferenceCustodyManifestV47(manifest, baseBuild, targetBuild, targetFixture, baseSources); }
  catch (error) { errors.push(`Preference Custody v47 deterministic compile failed: ${error.message}`); return unique(errors); }
  if (stable(build) !== stable(expected)) errors.push('Preference Custody v47 build differs from deterministic compilation');
  if (build.control_count !== 49 || stable(build.controls.map(control => control.control_id)) !== stable(REQUIRED_CONTROL_IDS)) errors.push('Preference Custody v47 control denominator mismatch');
  if (build.promotion_boundary.promotion_requirement_count !== 1920 || build.composition.base_promotion_requirement_count !== 1871 || build.composition.added_promotion_requirement_count !== 49) errors.push('Preference Custody v47 promotion denominator mismatch');
  if (build.open_frontiers.includes(RESOLVED_FRONTIER)) errors.push('Preference Custody v47 resolved frontier remains open');
  for (const frontier of [...REQUIRED_SUCCESSORS, PC48_DEPLOYMENT_SUCCESSOR, PC47_EVENT_SUCCESSOR, PC47_ESTIMAND_SUCCESSOR]) if (!build.open_frontiers.includes(frontier)) errors.push(`Preference Custody v47 missing required open frontier ${frontier}`);
  if (Object.values(build.control_integrity).some(value => value !== true)) errors.push('Preference Custody v47 integrity ledger contains a false value');
  validateChain(build, errors);
  return unique(errors);
}

export function renderPreferenceCustodyManifestV47Markdown(build) {
  return `# Preference Custody laboratory floor v47

` +
    `Synthetic compositional floor only. Graph effect: **${build.graph_effect}**. Real-world evidence: **${build.real_world_evidence_state}**.

` +
    `| Measure | Value |
| --- | ---: |
` +
    `| Base controls | ${build.composition.base_control_count} |
` +
    `| PC-49 extension | 1 |
` +
    `| Final controls | ${build.control_count} |
` +
    `| Base promotion requirements | ${build.composition.base_promotion_requirement_count} |
` +
    `| Requirements added | ${build.composition.added_promotion_requirement_count} |
` +
    `| Final promotion requirements | ${build.promotion_boundary.promotion_requirement_count} |

` +
    `Resolved frontier: \`${build.frontier_transition.resolved_base_frontier}\`.

` +
    `Successor frontiers:
${build.frontier_transition.successor_frontiers.map(frontier => `- \`${frontier}\``).join('\n')}

` +
    `The qualified v46 base is hash-bound and byte-preserved. PC-49 creates no real executable-artifact, deterministic-replay, effect, graph, allegation, adoption, or public-authority conclusion.
`;
}
