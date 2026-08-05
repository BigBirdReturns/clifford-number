import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV45, validatePreferenceCustodyManifestV45Build } from './preference-custody-manifest-v45.mjs';
import { validatePreferenceLinkageEventEstimandScopeInterpretationBuild } from './preference-linkage-event-estimand-scope-interpretation-assurance.mjs';
import {
  COMPLETE_LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_CLASSIFICATION,
  EXPECTED_LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_METRICS,
  LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_FALSE_CLASSIFICATIONS,
  REQUIRED_LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_REFUSAL_RULES,
  validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentBuild
} from './preference-linkage-interval-method-partition-replication-deployment-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V46_SCHEMA_VERSION = "preference-custody-control-manifest-v46@1";
export const PREFERENCE_CUSTODY_MANIFEST_V46_BUILD_SCHEMA_VERSION = "preference-custody-control-manifest-v46-build@1";
const FIXTURE_ID = "same-linkage-interval-method-replay-oos-deployment-status-different-assurance-states-v1";
const FAILURE_CLASS = "linkage_interval_method_code_configuration_seed_runtime_partition_exchangeability_replication_deployment_applicability_and_lineage_equifinality";
const REQUIRED_CONTROL_IDS = Object.freeze(Array.from({ length: 48 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`));
const RESOLVED_FRONTIER = "linkage_interval_method_code_configuration_seed_data_partition_exchangeability_replication_and_deployment_applicability_governance";
const REQUIRED_SUCCESSORS = Object.freeze(["linkage_interval_runtime_artifact_dependency_numerical_determinism_and_replay_assurance","linkage_interval_deployment_applicability_monitoring_shift_trigger_abstention_rollback_and_release_succession_governance"]);
const REQUIRED_FRONTIER_TRANSITION = Object.freeze({ resolved_base_frontier: RESOLVED_FRONTIER, successor_frontiers: Object.freeze([...REQUIRED_SUCCESSORS]) });
const PC47_EVENT_SUCCESSOR = 'linkage_interval_event_state_competing_event_censoring_abstention_and_ambiguity_governance';
const PC47_ESTIMAND_SUCCESSOR = 'linkage_interval_estimand_population_unit_horizon_support_tail_coverage_meaning_and_interpretation_governance';
const V45_SOURCE_BUNDLE_SCHEMA_VERSION = 'preference-custody-v45-source-bundle@1';
const REQUIRED_IDENTIFICATION_REQUIREMENT = Object.freeze({"stage":"linkage_interval_method_code_configuration_seed_data_partition_exchangeability_replication_and_deployment_applicability","required_state":"bound_versioned_executed_method_code_artifact_configuration_randomness_environment_partition_label_exchangeability_replication_deployment_monitoring_correction_and_current_lineage_custody","refused_inference":"public_method_replay_out_of_sample_and_deployment_badges_do_not_identify_executed_implementation_leakage_free_validation_independent_replication_or_current_applicability"});
const REQUIRED_REAL_CASE_REQUIREMENTS = Object.freeze(["linkage_interval_v46_method_specification_identity_owner_and_version","linkage_interval_v46_method_family_algorithm_and_inference_contract","linkage_interval_v46_transform_nonconformity_residual_and_score_function","linkage_interval_v46_interval_construction_inversion_tail_and_output_contract","linkage_interval_v46_repository_commit_and_source_tree_custody","linkage_interval_v46_reviewed_file_path_blob_and_diff_custody","linkage_interval_v46_build_recipe_artifact_digest_and_signature_custody","linkage_interval_v46_executable_entry_point_package_release_and_owner","linkage_interval_v46_executed_code_to_reviewed_artifact_attestation","linkage_interval_v46_configuration_parameter_file_and_hash_custody","linkage_interval_v46_seed_prng_algorithm_state_stream_and_draw_order","linkage_interval_v46_environment_image_operating_system_and_runtime","linkage_interval_v46_dependency_lock_compiler_and_toolchain_custody","linkage_interval_v46_hardware_accelerator_and_numerical_precision","linkage_interval_v46_deterministic_operation_policy_and_nondeterminism_audit","linkage_interval_v46_replay_receipt_cross_environment_tolerance_and_disposition","linkage_interval_v46_training_data_identity_window_version_and_hash","linkage_interval_v46_tuning_and_model_selection_data_identity","linkage_interval_v46_construction_and_calibration_data_identity","linkage_interval_v46_validation_and_holdout_data_identity","linkage_interval_v46_deployment_and_monitoring_data_identity","linkage_interval_v46_independent_label_data_identity_and_lineage","linkage_interval_v46_split_generation_algorithm_seed_and_version","linkage_interval_v46_entity_source_household_and_cluster_grouping","linkage_interval_v46_graph_component_trajectory_and_time_grouping","linkage_interval_v46_geography_language_source_and_time_partition","linkage_interval_v46_duplicate_near_duplicate_and_derivation_audit","linkage_interval_v46_cross_split_overlap_and_feature_leakage_ledger","linkage_interval_v46_cross_fitting_fold_assignment_and_reuse_rule","linkage_interval_v46_label_source_adjudication_uncertainty_and_freeze","linkage_interval_v46_label_independence_circularity_and_contamination_audit","linkage_interval_v46_post_outcome_revision_and_model_selection_reuse_audit","linkage_interval_v46_exchangeability_iid_and_conditional_assumption_contract","linkage_interval_v46_positivity_support_overlap_and_out_of_support_rule","linkage_interval_v46_sampling_selection_and_missingness_assumption_contract","linkage_interval_v46_stationarity_covariate_label_and_prevalence_shift_tests","linkage_interval_v46_source_population_policy_workflow_and_time_transport","linkage_interval_v46_assumption_diagnostics_failure_thresholds_and_safe_decline","linkage_interval_v46_replication_population_site_team_owner_and_time","linkage_interval_v46_replication_blinding_method_configuration_and_freeze","linkage_interval_v46_independent_data_labels_precommitment_and_acceptance_rule","linkage_interval_v46_replication_result_discordance_and_disposition","linkage_interval_v46_applicability_population_frame_unit_and_horizon","linkage_interval_v46_applicability_support_tail_geography_language_and_source","linkage_interval_v46_applicability_workflow_policy_release_use_and_exclusions","linkage_interval_v46_monitoring_triggers_alerts_abstention_override_and_appeal","linkage_interval_v46_rollback_certificate_withdrawal_republication_and_retirement","linkage_interval_v46_hash_linked_method_runtime_partition_assumption_replication_deployment_and_interpretation_chain"]);
const REQUIRED_PROHIBITED_INFERENCES = Object.freeze(["Do not treat floor v46 or PC-48 as evidence that any named person organization institution platform network source system or deployment executed a valid linkage-interval method or satisfies deployment applicability.","Do not infer bound executed code or a reviewed artifact from a method badge or method name.","Do not infer an executed build from a repository URL commit hash package name or documentation page.","Do not infer deterministic runtime custody from one successful replay.","Do not infer stochastic reproducibility from one seed without PRNG algorithm state stream and draw-order custody.","Do not infer leakage-free out-of-sample validation from a heldout filename or public badge.","Do not infer independent partitions from one partition identifier without grouping overlap duplicate derivation and leakage audits.","Do not infer deployment exchangeability from historical calibration or validation data.","Do not infer conformal bootstrap posterior or predictive validity after exchangeability support sampling stationarity or missingness failure.","Do not infer independent replication when team labels population method choices or acceptance rules are reused or revised after results.","Do not infer subgroup source geography language support tail or temporal applicability from aggregate replication agreement.","Do not infer deployment applicability outside the frozen population policy workflow release support and approved use.","Do not infer governance from monitoring without predeclared thresholds safe decline rollback withdrawal correction and republication.","Do not infer current method assurance after method code dependency configuration data partition label source population workflow policy release deployment or use succession.","Do not infer public authorization from complete method runtime partition exchangeability replication deployment and lineage custody.","Do not infer preference change manipulation discrimination breach misconduct coordination common purpose or intent from method or applicability failure.","Do not treat synthetic burdens as real-world error prevalence welfare trajectory causal effect or institutional-performance estimates.","Do not treat the forty-eight-control floor as exhaustive of every legal economic constitutional security social network market or performative failure mode."]);
const REQUIRED_INTERPRETATION_CONTRACT = Object.freeze({"contract_id":"preference-custody-control-manifest-v46@1","what_this_is":"A compositional successor floor preserving the qualified forty-seven-control v45 base and adding PC-48 method implementation, runtime, partition, exchangeability, replication, deployment-applicability, and current-lineage equifinality.","what_this_is_not":"A real executable-method audit, leakage finding, exchangeability finding, replication result, deployment-validity claim, causal effect, longitudinal history, graph fact, allegation, or public-authority verdict.","copy_ready_caveat":"Preference Custody floor v46 composes the qualified v45 controls with PC-48. It separates complete-looking method, deterministic-replay, out-of-sample, and deployment badges from bound executed code and artifacts, frozen runtime and randomness, leakage-free partitions, current assumptions, independent replication, deployment scope, monitoring, rollback, and release succession."});
const EXPECTED_MANIFEST_KEYS = Object.freeze(["schema_version","manifest_id","issue","control_issue","captured_at","status","graph_effect","counts_toward_thesis_evidence","base_floor","extension_control","identification_requirement","frontier_transition","real_case_requirements_added","prohibited_inferences","interpretation_contract"]);
const EXPECTED_BASE_FLOOR_KEYS = Object.freeze(["manifest_id","source_manifest_path","expected_build_schema","expected_control_count"]);
const EXPECTED_EXTENSION_KEYS = Object.freeze(["control_id","fixture_id","failure_class","source_fixture_path","build_artifact_path","expected_build_schema","required_refusal_rules"]);
const EXPECTED_IDENTIFICATION_KEYS = Object.freeze(["stage","required_state","refused_inference"]);
const EXPECTED_FRONTIER_KEYS = Object.freeze(["resolved_base_frontier","successor_frontiers"]);
const EXPECTED_INTERPRETATION_KEYS = Object.freeze(["contract_id","what_this_is","what_this_is_not","copy_ready_caveat"]);
const EXPECTED_BUILD_KEYS = Object.freeze([
  'schema_version','manifest_id','issue','control_issue','captured_at','status','graph_effect','counts_toward_thesis_evidence',
  'conclusion_generated','real_world_evidence_state','control_count','controls','composition','control_integrity',
  'identification_requirements','refusal_rule_union','open_frontiers','frontier_transition','promotion_boundary','custody_chain',
  'custody_chain_head_sha256','prohibited_inferences','interpretation_contract'
]);
const EXPECTED_COMPOSITION_KEYS = Object.freeze([
  'base_manifest_id','base_schema_version','base_control_count','extension_control_id','manifest_snapshot_sha256',
  'base_floor_snapshot_sha256','extension_snapshot_sha256','v45_source_bundle_schema_version','v45_source_bundle_sha256',
  'base_controls_sha256','base_promotion_requirements_sha256','base_refusal_rule_union_sha256',
  'base_identification_requirements_sha256','base_open_frontiers_sha256','base_prohibited_inferences_sha256',
  'base_interpretation_contract_sha256','base_promotion_requirement_count','added_promotion_requirement_count',
  'final_promotion_requirement_count','base_open_frontiers'
]);
const EXPECTED_CONTROL_KEYS = Object.freeze([
  'control_id','fixture_id','failure_class','source_fixture_path','build_artifact_path','graph_effect',
  'counts_toward_thesis_evidence','conclusion_generated','real_world_effect_claimed','preference_change_present',
  'manipulative_intent_inferable','required_refusal_rules','observed_refusal_rules','proof_summary'
]);
const EXPECTED_INTEGRITY_KEYS = Object.freeze([
  'base_floor_qualified','base_integrity_preserved','v45_complete_source_bundle_bound','all_graph_effect_none',
  'no_thesis_evidence_consumption','no_real_world_conclusion','no_preference_change_claim','no_intent_inference',
  'all_required_pc48_refusal_rules_present','complete_method_partition_replication_deployment_assurance_path_preserved',
  'pc47_event_state_successor_preserved','pc47_estimand_scope_successor_preserved'
]);
const EXPECTED_CUSTODY_EVENT_KEYS = Object.freeze([
  'authority','event_id','event_sha256','event_type','evidence_class','payload','previous_event_sha256','source_event_ids'
]);
const EXPECTED_BASE_SOURCE_KEYS = Object.freeze(['manifest','baseBuild','targetBuild','targetFixture','baseSources']);
const EXPECTED_V43_SOURCE_KEYS = Object.freeze(['manifest','baseBuild','intervalBuild','intervalFixture','baseSources']);
const EXPECTED_V42_SOURCE_KEYS = Object.freeze(['manifest','baseBuild','uncertaintyBuild','uncertaintyFixture','baseSources']);
const EXPECTED_V41_SOURCE_KEYS = Object.freeze(['manifest','baseBuild','probabilityBuild','probabilityFixture','baseSources']);
const EXPECTED_V40_SOURCE_KEYS = Object.freeze(['manifest','baseBuild','scoreBuild','scoreFixture','baseSources']);
const EXPECTED_V39_SOURCE_KEYS = Object.freeze(['manifest','baseBuild','candidateBuild','candidateFixture','baseSources']);
const EXPECTED_V38_SOURCE_KEYS = Object.freeze(['manifest','baseBuild','confidenceBuild','confidenceFixture','v37SourceCutoff']);
const EXPECTED_V37_SOURCE_KEYS = Object.freeze(['manifest','baseBuild','linkageBuild','linkageFixture']);
const EXPECTED_TRANSITIVE_MANIFEST_KEYS = Object.freeze([
  'schema_version','manifest_id','issue','control_issue','captured_at','status','graph_effect',
  'counts_toward_thesis_evidence','base_floor','extension_control','identification_requirement',
  'frontier_transition','real_case_requirements_added','prohibited_inferences','interpretation_contract'
]);
const EXPECTED_TRANSITIVE_BASE_FLOOR_KEYS = Object.freeze(['manifest_id','source_manifest_path','expected_build_schema','expected_control_count']);
const EXPECTED_TRANSITIVE_EXTENSION_KEYS = Object.freeze(['control_id','fixture_id','failure_class','source_fixture_path','build_artifact_path','expected_build_schema','required_refusal_rules']);
const EXPECTED_TRANSITIVE_IDENTIFICATION_KEYS = Object.freeze(['stage','required_state','refused_inference']);
const EXPECTED_TRANSITIVE_FRONTIER_KEYS = Object.freeze(['resolved_base_frontier','successor_frontiers']);
const EXPECTED_TRANSITIVE_INTERPRETATION_KEYS = Object.freeze(['contract_id','what_this_is','what_this_is_not','copy_ready_caveat']);

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
const sha256 = value => createHash('sha256').update(stable(value)).digest('hex');
const isoDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const requireFalse = (value, label, errors) => { if (value !== false) errors.push(`${label} must remain false`); };
function requireExactKeys(value, expected, label, errors) {
  const keys = Reflect.ownKeys(object(value));
  const stringKeys = keys.filter(key => typeof key === 'string');
  if (
    stringKeys.length !== keys.length ||
    stable(sorted(stringKeys)) !== stable(sorted(expected)) ||
    stringKeys.length !== expected.length
  ) errors.push(`${label} key ledger mismatch`);
}
function validateCacheSafeJsonTree(value, label, errors, seen = new WeakSet()) {
  const walk = (current, path) => {
    const type = typeof current;
    if (current === null || type === 'string' || type === 'boolean') return;
    if (type === 'number') {
      if (!Number.isFinite(current)) errors.push(`${path} must contain only finite JSON numbers`);
      return;
    }
    if (type !== 'object') {
      errors.push(`${path} contains unsupported JSON value type ${type}`);
      return;
    }
    if (seen.has(current)) {
      errors.push(`${path} contains a repeated or cyclic object`);
      return;
    }
    seen.add(current);
    let prototype;
    let keys;
    try {
      prototype = Object.getPrototypeOf(current);
      keys = Reflect.ownKeys(current);
    } catch {
      errors.push(`${path} must be inspectable cache-safe JSON data`);
      return;
    }
    if (Array.isArray(current)) {
      if (prototype !== Array.prototype) errors.push(`${path} must use the canonical array prototype`);
      const expectedKeys = new Set(['length', ...Array.from({ length: current.length }, (_, index) => String(index))]);
      if (keys.length !== expectedKeys.size || keys.some(key => typeof key !== 'string' || !expectedKeys.has(key))) {
        errors.push(`${path} array key ledger mismatch`);
      }
      for (let index = 0; index < current.length; index += 1) {
        const key = String(index);
        if (!Object.hasOwn(current, key)) {
          errors.push(`${path}[${index}] must not be sparse`);
          continue;
        }
        let descriptor;
        try {
          descriptor = Object.getOwnPropertyDescriptor(current, key);
        } catch {
          descriptor = null;
        }
        if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
          errors.push(`${path}[${index}] must be an enumerable data property`);
          continue;
        }
        walk(descriptor.value, `${path}[${index}]`);
      }
      return;
    }
    if (prototype !== Object.prototype) errors.push(`${path} must use the canonical object prototype`);
    for (const key of keys) {
      if (typeof key !== 'string') {
        errors.push(`${path} must not contain symbol keys`);
        continue;
      }
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(current, key);
      } catch {
        descriptor = null;
      }
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
        errors.push(`${path}.${key} must be an enumerable data property`);
        continue;
      }
      walk(descriptor.value, `${path}.${key}`);
    }
  };
  walk(value, label);
}
function snapshotCacheSafeV45Inputs(baseBuild, baseSources, errors) {
  const inputSeen = new WeakSet();
  validateCacheSafeJsonTree(baseBuild, 'v46 v45 base build cache input', errors, inputSeen);
  validateCacheSafeJsonTree(baseSources, 'v46 v45 source bundle cache input', errors, inputSeen);
  if (errors.length) return null;
  let snapshot;
  try {
    snapshot = structuredClone({ baseBuild, baseSources });
  } catch {
    errors.push('v46 v45 cache inputs must be structured-cloneable canonical JSON data');
    return null;
  }
  const snapshotErrors = [];
  const snapshotSeen = new WeakSet();
  validateCacheSafeJsonTree(snapshot.baseBuild, 'v46 v45 base build cache snapshot', snapshotErrors, snapshotSeen);
  validateCacheSafeJsonTree(snapshot.baseSources, 'v46 v45 source bundle cache snapshot', snapshotErrors, snapshotSeen);
  errors.push(...snapshotErrors);
  return errors.length ? null : snapshot;
}
function seal(event, previousEventSha256) {
  const unsigned = { ...canonical(event), previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}
const projectFrontierTransition = value => ({ resolved_base_frontier: value?.resolved_base_frontier, successor_frontiers: [...array(value?.successor_frontiers)] });

function collectSnapshotDates(value, path, dates, seen) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (!Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, 'captured_at')) dates.push({ path, date: value.captured_at });
  if (Array.isArray(value)) value.forEach((item, index) => collectSnapshotDates(item, `${path}[${index}]`, dates, seen));
  else for (const [key, item] of Object.entries(value)) collectSnapshotDates(item, `${path}.${key}`, dates, seen);
}
function validateDirectSourceChronology(floorDate, baseBuild, targetBuild, targetFixture, baseSources) {
  const errors = [];
  if (!isoDate(floorDate)) return errors;
  const direct = [
    ['baseBuild', baseBuild?.captured_at],
    ['targetBuild', targetBuild?.captured_at],
    ['targetFixture', targetFixture?.captured_at],
    ['baseSources.manifest', baseSources?.manifest?.captured_at],
    ['baseSources.baseBuild', baseSources?.baseBuild?.captured_at],
    ['baseSources.targetBuild', baseSources?.targetBuild?.captured_at],
    ['baseSources.targetFixture', baseSources?.targetFixture?.captured_at]
  ];
  for (const [path, date] of direct) {
    if (date === undefined) continue;
    if (!isoDate(date)) errors.push(`v46 source chronology invalid date: ${path}.captured_at`);
    else if (date > floorDate) errors.push(`v46 source snapshot postdates floor: ${path}.captured_at ${date} > ${floorDate}`);
  }
  return errors;
}

function validateSourceChronology(floorDate, baseBuild, targetBuild, targetFixture, baseSources) {
  const errors = [];
  if (!isoDate(floorDate)) return errors;
  const dates = [];
  const seen = new Set();
  for (const [path, value] of [['baseBuild',baseBuild],['targetBuild',targetBuild],['targetFixture',targetFixture],['baseSources',baseSources]]) collectSnapshotDates(value, path, dates, seen);
  for (const { path, date } of dates) {
    if (!isoDate(date)) errors.push(`v46 source chronology invalid date: ${path}.captured_at`);
    else if (date > floorDate) errors.push(`v46 source snapshot postdates floor: ${path}.captured_at ${date} > ${floorDate}`);
  }
  return errors;
}

export function loadPreferenceCustodyV45SourceBundle(load) {
  return {
    manifest: load('data/research/preference-custody/control-manifest-v45.json'),
    baseBuild: load('build/research/preference-custody-laboratory-floor-v44.json'),
    targetBuild: load('build/research/preference-linkage-event-estimand-scope-interpretation-assurance.json'),
    targetFixture: load('data/research/preference-custody/linkage-event-estimand-scope-interpretation-assurance.fixture.json'),
    baseSources: {
      manifest: load('data/research/preference-custody/control-manifest-v44.json'),
      baseBuild: load('build/research/preference-custody-laboratory-floor-v43.json'),
      targetBuild: load('build/research/preference-linkage-target-construction-exchangeability-assurance.json'),
      targetFixture: load('data/research/preference-custody/linkage-target-construction-exchangeability-assurance.fixture.json'),
      baseSources: {
        manifest: load('data/research/preference-custody/control-manifest-v43.json'),
        baseBuild: load('build/research/preference-custody-laboratory-floor-v42.json'),
        intervalBuild: load('build/research/preference-linkage-interval-construction-assurance.json'),
        intervalFixture: load('data/research/preference-custody/linkage-interval-construction-assurance.fixture.json'),
        baseSources: {
          manifest: load('data/research/preference-custody/control-manifest-v42.json'),
          baseBuild: load('build/research/preference-custody-laboratory-floor-v41.json'),
          uncertaintyBuild: load('build/research/preference-linkage-uncertainty-monitoring-assurance.json'),
          uncertaintyFixture: load('data/research/preference-custody/linkage-uncertainty-monitoring-assurance.fixture.json'),
          baseSources: {
            manifest: load('data/research/preference-custody/control-manifest-v41.json'),
            baseBuild: load('build/research/preference-custody-laboratory-floor-v40.json'),
            probabilityBuild: load('build/research/preference-linkage-probability-calibration-assurance.json'),
            probabilityFixture: load('data/research/preference-custody/linkage-probability-calibration-assurance.fixture.json'),
            baseSources: {
              manifest: load('data/research/preference-custody/control-manifest-v40.json'),
              baseBuild: load('build/research/preference-custody-laboratory-floor-v39.json'),
              scoreBuild: load('build/research/preference-linkage-score-calibration-assurance.json'),
              scoreFixture: load('data/research/preference-custody/linkage-score-calibration-assurance.fixture.json'),
              baseSources: {
                manifest: load('data/research/preference-custody/control-manifest-v39.json'),
                baseBuild: load('build/research/preference-custody-laboratory-floor-v38.json'),
                candidateBuild: load('build/research/preference-candidate-pair-blocking-recall-assurance.json'),
                candidateFixture: load('data/research/preference-custody/candidate-pair-blocking-recall-assurance.fixture.json'),
                baseSources: {
                  manifest: load('data/research/preference-custody/control-manifest-v38.json'),
                  baseBuild: load('build/research/preference-custody-laboratory-floor-v37.json'),
                  confidenceBuild: load('build/research/preference-linkage-confidence-adjudication-assurance.json'),
                  confidenceFixture: load('data/research/preference-custody/linkage-confidence-adjudication-assurance.fixture.json'),
                  v37SourceCutoff: {
                    manifest: load('data/research/preference-custody/control-manifest-v37.json'),
                    baseBuild: load('build/research/preference-custody-laboratory-floor-v36.json'),
                    linkageBuild: load('build/research/preference-record-linkage-temporal-succession-assurance.json'),
                    linkageFixture: load('data/research/preference-custody/record-linkage-temporal-succession-assurance.fixture.json')
                  }
                }
              }
            }
          }
        }
      }
    }
  };
}

function v45SourceBundlePayload(baseSources) {
  return {
    schema_version: V45_SOURCE_BUNDLE_SCHEMA_VERSION,
    manifest: baseSources?.manifest,
    base_build: baseSources?.baseBuild,
    pc47_build: baseSources?.targetBuild,
    pc47_fixture: baseSources?.targetFixture,
    transitive_sources: baseSources?.baseSources
  };
}
function v45SourceBundleSha256(baseSources) { return sha256(v45SourceBundlePayload(baseSources)); }
const QUALIFIED_V45_BASE_VALIDATION_CACHE = new Map();
function validateQualifiedV45Base(baseBuild, baseSources) {
  const keyErrors = [];
  requireExactKeys(baseBuild, EXPECTED_BUILD_KEYS, 'v46 v45 base build', keyErrors);
  requireExactKeys(baseSources, EXPECTED_BASE_SOURCE_KEYS, 'v46 v45 source bundle', keyErrors);
  const snapshot = snapshotCacheSafeV45Inputs(baseBuild, baseSources, keyErrors);
  if (!snapshot) return keyErrors;
  const transitiveKeyErrors = validateTransitiveSourceBundleKeys(snapshot.baseSources);
  if (transitiveKeyErrors.length) return transitiveKeyErrors;
  const cacheKey = sha256(snapshot);
  if (sha256({ baseBuild, baseSources }) !== cacheKey) return ['v46 v45 cache inputs changed during snapshot preflight'];
  const cached = QUALIFIED_V45_BASE_VALIDATION_CACHE.get(cacheKey);
  if (cached) return [...cached];
  const errors = validatePreferenceCustodyManifestV45Build(
    snapshot.baseBuild,
    snapshot.baseSources?.manifest,
    snapshot.baseSources?.baseBuild,
    snapshot.baseSources?.targetBuild,
    snapshot.baseSources?.targetFixture,
    snapshot.baseSources?.baseSources
  );
  if (sha256({ baseBuild, baseSources }) !== cacheKey) errors.push('v46 v45 cache inputs changed during full validation');
  QUALIFIED_V45_BASE_VALIDATION_CACHE.set(cacheKey, Object.freeze([...errors]));
  return errors;
}
function v44SourceBundlePayload(baseSources) {
  return {
    schema_version: 'preference-custody-v44-source-bundle@1',
    manifest: baseSources?.manifest,
    base_build: baseSources?.baseBuild,
    pc46_build: baseSources?.targetBuild,
    pc46_fixture: baseSources?.targetFixture,
    transitive_sources: baseSources?.baseSources
  };
}
function validateTransitiveManifest(manifest, label, schemaVersion, manifestId, errors) {
  requireExactKeys(manifest, EXPECTED_TRANSITIVE_MANIFEST_KEYS, label, errors);
  requireExactKeys(manifest?.base_floor, EXPECTED_TRANSITIVE_BASE_FLOOR_KEYS, `${label} base_floor`, errors);
  requireExactKeys(manifest?.extension_control, EXPECTED_TRANSITIVE_EXTENSION_KEYS, `${label} extension_control`, errors);
  requireExactKeys(manifest?.identification_requirement, EXPECTED_TRANSITIVE_IDENTIFICATION_KEYS, `${label} identification_requirement`, errors);
  requireExactKeys(manifest?.frontier_transition, EXPECTED_TRANSITIVE_FRONTIER_KEYS, `${label} frontier_transition`, errors);
  requireExactKeys(manifest?.interpretation_contract, EXPECTED_TRANSITIVE_INTERPRETATION_KEYS, `${label} interpretation_contract`, errors);
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return;
  if (manifest.schema_version !== schemaVersion) errors.push(`${label} schema mismatch`);
  if (manifest.manifest_id !== manifestId) errors.push(`${label} identity mismatch`);
}
function validateTransitiveSourceBundleKeys(baseSources) {
  const errors = [];
  const v44 = baseSources?.baseSources;
  const v43 = v44?.baseSources;
  const v42 = v43?.baseSources;
  const v41 = v42?.baseSources;
  const v40 = v41?.baseSources;
  const v39 = v40?.baseSources;
  const v38 = v39?.baseSources;
  const v37 = v38?.v37SourceCutoff;
  const bundleLedgers = [
    [v43, EXPECTED_V43_SOURCE_KEYS, 'v46 v43 source bundle'],
    [v42, EXPECTED_V42_SOURCE_KEYS, 'v46 v42 source bundle'],
    [v41, EXPECTED_V41_SOURCE_KEYS, 'v46 v41 source bundle'],
    [v40, EXPECTED_V40_SOURCE_KEYS, 'v46 v40 source bundle'],
    [v39, EXPECTED_V39_SOURCE_KEYS, 'v46 v39 source bundle'],
    [v38, EXPECTED_V38_SOURCE_KEYS, 'v46 v38 source bundle'],
    [v37, EXPECTED_V37_SOURCE_KEYS, 'v46 v37 source cutoff']
  ];
  const manifestLedgers = [
    [v44?.manifest, 'v46 v44 manifest', 'preference-custody-control-manifest-v44@1', 'preference-custody-laboratory-floor-v44'],
    [v43?.manifest, 'v46 v43 manifest', 'preference-custody-control-manifest-v43@1', 'preference-custody-laboratory-floor-v43'],
    [v42?.manifest, 'v46 v42 manifest', 'preference-custody-control-manifest-v42@1', 'preference-custody-laboratory-floor-v42'],
    [v41?.manifest, 'v46 v41 manifest', 'preference-custody-control-manifest-v41@1', 'preference-custody-laboratory-floor-v41'],
    [v40?.manifest, 'v46 v40 manifest', 'preference-custody-control-manifest-v40@1', 'preference-custody-laboratory-floor-v40'],
    [v39?.manifest, 'v46 v39 manifest', 'preference-custody-control-manifest-v39@1', 'preference-custody-laboratory-floor-v39'],
    [v38?.manifest, 'v46 v38 manifest', 'preference-custody-control-manifest-v38@1', 'preference-custody-laboratory-floor-v38'],
    [v37?.manifest, 'v46 v37 manifest', 'preference-custody-control-manifest-v37@1', 'preference-custody-laboratory-floor-v37']
  ];
  const seenBundles = new Set([baseSources, v44].filter(value => value && typeof value === 'object' && !Array.isArray(value)));
  for (const [value, expected, label] of bundleLedgers) {
    requireExactKeys(value, expected, label, errors);
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    if (seenBundles.has(value)) errors.push(`${label} source bundle object repeated`);
    seenBundles.add(value);
  }
  const seenManifests = new Set();
  for (const [manifest, label, schemaVersion, manifestId] of manifestLedgers) {
    validateTransitiveManifest(manifest, label, schemaVersion, manifestId, errors);
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) continue;
    if (seenManifests.has(manifest)) errors.push(`${label} manifest object repeated`);
    seenManifests.add(manifest);
  }
  return errors;
}

function validateBaseSources(baseBuild, baseSources) {
  if (!baseSources) return ['v46 complete v45 source bundle is required'];
  const errors = [];
  requireExactKeys(baseSources, EXPECTED_BASE_SOURCE_KEYS, 'v46 v45 source bundle', errors);
  errors.push(...validateTransitiveSourceBundleKeys(baseSources));
  for (const [value, label] of [
    [baseSources.manifest,'v45 manifest'],
    [baseSources.baseBuild,'v45 v44 base build'],
    [baseSources.targetBuild,'v45 PC-47 build'],
    [baseSources.targetFixture,'v45 PC-47 fixture'],
    [baseSources.baseSources,'v45 transitive sources']
  ]) if (!value) errors.push(`v46 ${label} is required`);
  if (errors.length) return errors;
  const manifestErrors = validatePreferenceCustodyManifestV45(baseSources.manifest);
  if (manifestErrors.length) errors.push(...manifestErrors.map(error => `v46 v45 manifest invalid: ${error}`));
  const pc47Errors = validatePreferenceLinkageEventEstimandScopeInterpretationBuild(baseSources.targetBuild, baseSources.targetFixture);
  if (pc47Errors.length) errors.push(...pc47Errors.map(error => `v46 PC-47 source invalid: ${error}`));
  if (baseBuild?.schema_version !== 'preference-custody-control-manifest-v45-build@1'
    || baseBuild?.manifest_id !== 'preference-custody-laboratory-floor-v45'
    || baseBuild?.control_count !== 47) errors.push('v46 v45 compiled base identity mismatch');
  if (baseBuild?.captured_at !== baseSources.manifest?.captured_at) errors.push('v46 v45 compiled base date mismatch');
  if (baseSources.baseBuild?.schema_version !== 'preference-custody-control-manifest-v44-build@1'
    || baseSources.baseBuild?.manifest_id !== 'preference-custody-laboratory-floor-v44'
    || baseSources.baseBuild?.control_count !== 46) errors.push('v46 v44 source build identity mismatch');
  requireExactKeys(baseSources.baseSources, EXPECTED_BASE_SOURCE_KEYS, 'v46 v44 source bundle', errors);
  if (stable(array(baseBuild?.controls).slice(0, 46)) !== stable(baseSources.baseBuild?.controls)) errors.push('v46 v45 preserved v44 controls mismatch');
  if (baseBuild?.controls?.at(-1)?.control_id !== 'PC-47') errors.push('v46 v45 extension control mismatch');
  if (stable(baseBuild?.controls?.at(-1)?.proof_summary) !== stable({ ...baseSources.targetBuild?.metrics, ...baseSources.targetBuild?.classification })) errors.push('v46 v45 PC-47 proof binding mismatch');
  const composition = object(baseBuild?.composition);
  const checks = {
    manifest_snapshot_sha256: sha256(baseSources.manifest),
    base_floor_snapshot_sha256: sha256(baseSources.baseBuild),
    extension_snapshot_sha256: sha256(baseSources.targetBuild),
    v44_source_bundle_sha256: sha256(v44SourceBundlePayload(baseSources.baseSources))
  };
  for (const [key, expected] of Object.entries(checks)) if (composition[key] !== expected) errors.push(`v46 v45 source binding mismatch: ${key}`);
  if (composition.v44_source_bundle_schema_version !== 'preference-custody-v44-source-bundle@1') errors.push('v46 v45 source-bundle schema mismatch');
  if (!array(baseBuild?.open_frontiers).includes(RESOLVED_FRONTIER)) errors.push('v46 v45 base lost the PC-48 frontier');
  for (const key of Object.keys(object(baseBuild?.control_integrity))) if (baseBuild.control_integrity[key] !== true) errors.push(`v46 v45 base integrity flag false: ${key}`);
  return errors;
}

function custodyChain(manifest, base, control, openFrontiers, requirements) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = seal(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${manifest.manifest_id}:base`,
    event_type: 'qualified_v45_floor_snapshot',
    evidence_class: 'compiled_synthetic_control_floor',
    authority: 'preference_custody_v45_compiler',
    source_event_ids: [],
    payload: { manifest_id: base.manifest_id, schema_version: base.schema_version, control_count: base.control_count, snapshot_sha256: sha256(base) }
  });
  push({
    event_id: `${manifest.manifest_id}:pc48`,
    event_type: 'pc48_method_partition_replication_deployment_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'linkage_interval_method_partition_replication_deployment_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: { control, snapshot_sha256: sha256(control) }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'linkage_interval_method_governance_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v46_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc48`],
    payload: { transition: projectFrontierTransition(manifest.frontier_transition), open_frontiers: openFrontiers }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'linkage_interval_method_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v46_compiler',
    source_event_ids: [`${manifest.manifest_id}:frontier`],
    payload: { identification_requirement: canonical(REQUIRED_IDENTIFICATION_REQUIREMENT), real_case_requires: requirements }
  });
  push({
    event_id: `${manifest.manifest_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'preference_custody_v46_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: { allowed_interpretation: 'qualified forty-eight-control synthetic Preference Custody floor', interpretation_contract: canonical(REQUIRED_INTERPRETATION_CONTRACT), graph_effect: 'none', real_world_evidence_state: 'none' }
  });
  return events;
}

export function validatePreferenceCustodyManifestV46(manifest) {
  const errors = [];
  requireExactKeys(manifest, EXPECTED_MANIFEST_KEYS, 'v46 manifest', errors);
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V46_SCHEMA_VERSION) errors.push('v46 schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v46') errors.push('v46 manifest identity mismatch');
  if (manifest?.issue !== 594 || manifest?.control_issue !== 1064) errors.push('v46 issue custody mismatch');
  if (!isoDate(manifest?.captured_at)) errors.push('v46 captured_at must be an exact ISO date');
  if (manifest?.status !== 'synthetic_control_floor_extension' || manifest?.graph_effect !== 'none') errors.push('v46 status or graph effect mismatch');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v46 thesis evidence', errors);
  requireExactKeys(manifest?.base_floor, EXPECTED_BASE_FLOOR_KEYS, 'v46 base floor', errors);
  if (manifest?.base_floor?.manifest_id !== 'preference-custody-laboratory-floor-v45'
    || manifest?.base_floor?.source_manifest_path !== 'data/research/preference-custody/control-manifest-v45.json'
    || manifest?.base_floor?.expected_build_schema !== 'preference-custody-control-manifest-v45-build@1'
    || manifest?.base_floor?.expected_control_count !== 47) errors.push('v46 base floor identity mismatch');
  requireExactKeys(manifest?.extension_control, EXPECTED_EXTENSION_KEYS, 'v46 extension control', errors);
  if (manifest?.extension_control?.control_id !== 'PC-48'
    || manifest?.extension_control?.fixture_id !== FIXTURE_ID
    || manifest?.extension_control?.failure_class !== FAILURE_CLASS
    || manifest?.extension_control?.source_fixture_path !== 'data/research/preference-custody/linkage-interval-method-partition-replication-deployment-assurance.fixture.json'
    || manifest?.extension_control?.build_artifact_path !== 'build/research/preference-linkage-interval-method-partition-replication-deployment-assurance.json'
    || manifest?.extension_control?.expected_build_schema !== 'preference-linkage-interval-method-partition-replication-deployment-assurance-build@1') errors.push('v46 PC-48 extension identity mismatch');
  if (stable(manifest?.extension_control?.required_refusal_rules) !== stable(REQUIRED_LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_REFUSAL_RULES)) errors.push('v46 PC-48 refusal ledger mismatch');
  requireExactKeys(manifest?.identification_requirement, EXPECTED_IDENTIFICATION_KEYS, 'v46 identification requirement', errors);
  if (stable(manifest?.identification_requirement) !== stable(REQUIRED_IDENTIFICATION_REQUIREMENT)) errors.push('v46 identification requirement mismatch');
  requireExactKeys(manifest?.frontier_transition, EXPECTED_FRONTIER_KEYS, 'v46 frontier transition', errors);
  if (stable(manifest?.frontier_transition) !== stable(REQUIRED_FRONTIER_TRANSITION)) errors.push('v46 frontier transition mismatch');
  if (stable(manifest?.real_case_requirements_added) !== stable(REQUIRED_REAL_CASE_REQUIREMENTS)) errors.push('v46 real-case requirement ledger mismatch');
  if (stable(manifest?.prohibited_inferences) !== stable(REQUIRED_PROHIBITED_INFERENCES)) errors.push('v46 prohibited-inference ledger mismatch');
  requireExactKeys(manifest?.interpretation_contract, EXPECTED_INTERPRETATION_KEYS, 'v46 interpretation contract', errors);
  if (stable(manifest?.interpretation_contract) !== stable(REQUIRED_INTERPRETATION_CONTRACT)) errors.push('v46 interpretation contract mismatch');
  return errors;
}

export function compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, baseSources) {
  const qualifiedBaseErrors = validateQualifiedV45Base(baseBuild, baseSources);
  const baseSourceErrors = qualifiedBaseErrors.length ? [] : validateBaseSources(baseBuild, baseSources);
  const chronologyErrors = qualifiedBaseErrors.length ? [] : validateSourceChronology(manifest?.captured_at, baseBuild, targetBuild, targetFixture, baseSources);
  const errors = [
    ...validatePreferenceCustodyManifestV46(manifest),
    ...baseSourceErrors,
    ...qualifiedBaseErrors.map(error => `v46 v45 build invalid: ${error}`),
    ...validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentBuild(targetBuild, targetFixture),
    ...chronologyErrors
  ];
  if (errors.length) throw new Error(errors.join('; '));
  const baseRequirements = unique(baseBuild?.promotion_boundary?.real_case_requires);
  const requirements = unique([...baseRequirements, ...REQUIRED_REAL_CASE_REQUIREMENTS]);
  if (baseRequirements.length !== 1823 || requirements.length !== 1871) throw new Error('v46 promotion requirement denominator mismatch');
  const control = {
    control_id: 'PC-48',
    fixture_id: FIXTURE_ID,
    failure_class: FAILURE_CLASS,
    source_fixture_path: manifest.extension_control.source_fixture_path,
    build_artifact_path: manifest.extension_control.build_artifact_path,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_effect_claimed: false,
    preference_change_present: false,
    manipulative_intent_inferable: false,
    required_refusal_rules: [...REQUIRED_LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_REFUSAL_RULES],
    observed_refusal_rules: [...targetBuild.required_refusal_rules],
    proof_summary: canonical({ ...targetBuild.metrics, ...targetBuild.classification })
  };
  const controls = [...baseBuild.controls, control];
  const openFrontiers = unique([...array(baseBuild.open_frontiers).filter(frontier => frontier !== RESOLVED_FRONTIER), ...REQUIRED_SUCCESSORS]);
  const identificationRequirements = [...array(baseBuild.identification_requirements), canonical(REQUIRED_IDENTIFICATION_REQUIREMENT)];
  const refusalRuleUnion = unique([...array(baseBuild.refusal_rule_union), ...REQUIRED_LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_REFUSAL_RULES]);
  const prohibitedInferences = [...array(baseBuild.prohibited_inferences), ...REQUIRED_PROHIBITED_INFERENCES];
  const composition = {
    base_manifest_id: baseBuild.manifest_id,
    base_schema_version: baseBuild.schema_version,
    base_control_count: baseBuild.control_count,
    extension_control_id: 'PC-48',
    manifest_snapshot_sha256: sha256(manifest),
    base_floor_snapshot_sha256: sha256(baseBuild),
    extension_snapshot_sha256: sha256(targetBuild),
    v45_source_bundle_schema_version: V45_SOURCE_BUNDLE_SCHEMA_VERSION,
    v45_source_bundle_sha256: v45SourceBundleSha256(baseSources),
    base_controls_sha256: sha256(baseBuild.controls),
    base_promotion_requirements_sha256: sha256(baseRequirements),
    base_refusal_rule_union_sha256: sha256(baseBuild.refusal_rule_union),
    base_identification_requirements_sha256: sha256(baseBuild.identification_requirements),
    base_open_frontiers_sha256: sha256(baseBuild.open_frontiers),
    base_prohibited_inferences_sha256: sha256(baseBuild.prohibited_inferences),
    base_interpretation_contract_sha256: sha256(baseBuild.interpretation_contract),
    base_promotion_requirement_count: 1823,
    added_promotion_requirement_count: 48,
    final_promotion_requirement_count: 1871,
    base_open_frontiers: unique(baseBuild.open_frontiers)
  };
  const controlIntegrity = {
    base_floor_qualified: true,
    base_integrity_preserved: true,
    v45_complete_source_bundle_bound: true,
    all_graph_effect_none: controls.every(item => item.graph_effect === 'none'),
    no_thesis_evidence_consumption: controls.every(item => item.counts_toward_thesis_evidence === false),
    no_real_world_conclusion: controls.every(item => item.conclusion_generated === false),
    no_preference_change_claim: control.preference_change_present === false,
    no_intent_inference: control.manipulative_intent_inferable === false,
    all_required_pc48_refusal_rules_present: stable(control.observed_refusal_rules) === stable(REQUIRED_LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_REFUSAL_RULES),
    complete_method_partition_replication_deployment_assurance_path_preserved: targetBuild.classification[COMPLETE_LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_CLASSIFICATION] === true,
    pc47_event_state_successor_preserved: openFrontiers.includes(PC47_EVENT_SUCCESSOR),
    pc47_estimand_scope_successor_preserved: openFrontiers.includes(PC47_ESTIMAND_SUCCESSOR)
  };
  const custody = custodyChain(manifest, baseBuild, control, openFrontiers, requirements);
  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V46_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'synthetic_preference_custody_floor_v46_compiled',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    control_count: controls.length,
    controls,
    composition,
    control_integrity: controlIntegrity,
    identification_requirements: identificationRequirements,
    refusal_rule_union: refusalRuleUnion,
    open_frontiers: openFrontiers,
    frontier_transition: canonical(REQUIRED_FRONTIER_TRANSITION),
    promotion_boundary: {
      promotion_authority: 'separate_current_real_case_receipts_required',
      promotion_requirement_count: requirements.length,
      real_case_requires: requirements,
      laboratory_controls_are_real_world_evidence: false
    },
    custody_chain: custody,
    custody_chain_head_sha256: custody.at(-1).event_sha256,
    prohibited_inferences: prohibitedInferences,
    interpretation_contract: canonical(REQUIRED_INTERPRETATION_CONTRACT)
  };
}

function validateChain(compiled, errors) {
  const events = array(compiled?.custody_chain);
  if (events.length !== 5) errors.push('compiled v46 custody chain must contain five events');
  let previous = null;
  const seen = new Set();
  for (const event of events) {
    requireExactKeys(event, EXPECTED_CUSTODY_EVENT_KEYS, 'compiled v46 custody event', errors);
    if (event?.previous_event_sha256 !== previous) errors.push('compiled v46 custody previous hash mismatch');
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push('compiled v46 custody source missing');
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push('compiled v46 custody event hash mismatch');
    if (text(event?.event_id)) seen.add(event.event_id);
    previous = event?.event_sha256;
  }
  if (previous !== compiled?.custody_chain_head_sha256) errors.push('compiled v46 custody head mismatch');
}

export function validatePreferenceCustodyManifestV46Build(compiled, manifest, baseBuild, targetBuild, targetFixture, baseSources) {
  const errors = [];
  requireExactKeys(compiled, EXPECTED_BUILD_KEYS, 'compiled v46', errors);
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V46_BUILD_SCHEMA_VERSION) errors.push('compiled v46 schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v46' || compiled?.issue !== 594 || compiled?.control_issue !== 1064) errors.push('compiled v46 identity mismatch');
  if (!isoDate(compiled?.captured_at)) errors.push('compiled v46 captured_at must be an exact ISO date');
  if (manifest && compiled?.captured_at !== manifest?.captured_at) errors.push('compiled v46 captured_at must equal manifest captured_at');
  if (compiled?.status !== 'synthetic_preference_custody_floor_v46_compiled' || compiled?.graph_effect !== 'none' || compiled?.real_world_evidence_state !== 'none') errors.push('compiled v46 status boundary mismatch');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v46 thesis evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v46 conclusion', errors);
  if (compiled?.control_count !== 48) errors.push('compiled v46 control count mismatch');
  const controls = array(compiled?.controls);
  if (controls.length !== 48 || stable(controls.map(control => control?.control_id)) !== stable(REQUIRED_CONTROL_IDS)) errors.push('compiled v46 control ledger mismatch');
  requireExactKeys(compiled?.composition, EXPECTED_COMPOSITION_KEYS, 'compiled v46 composition', errors);
  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v45'
    || composition.base_schema_version !== 'preference-custody-control-manifest-v45-build@1'
    || composition.base_control_count !== 47
    || composition.extension_control_id !== 'PC-48'
    || composition.v45_source_bundle_schema_version !== V45_SOURCE_BUNDLE_SCHEMA_VERSION) errors.push('compiled v46 composition identity mismatch');
  if (composition.base_promotion_requirement_count !== 1823 || composition.added_promotion_requirement_count !== 48 || composition.final_promotion_requirement_count !== 1871) errors.push('compiled v46 promotion counts mismatch');
  for (const key of ['manifest_snapshot_sha256','base_floor_snapshot_sha256','extension_snapshot_sha256','v45_source_bundle_sha256','base_controls_sha256','base_promotion_requirements_sha256','base_refusal_rule_union_sha256','base_identification_requirements_sha256','base_open_frontiers_sha256','base_prohibited_inferences_sha256','base_interpretation_contract_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v46 invalid hash: ${key}`);
  if (!manifest) errors.push('compiled v46 manifest source is required');
  if (!baseBuild) errors.push('compiled v46 base source is required');
  if (!targetBuild) errors.push('compiled v46 PC-48 source is required');
  if (!targetFixture) errors.push('compiled v46 PC-48 fixture source is required');
  if (!baseSources) errors.push('compiled v46 complete v45 source bundle is required');
  const cachePreflightErrors = [];
  let cacheSnapshot = null;
  if (baseBuild && baseSources) {
    requireExactKeys(baseBuild, EXPECTED_BUILD_KEYS, 'v46 v45 base build', cachePreflightErrors);
    requireExactKeys(baseSources, EXPECTED_BASE_SOURCE_KEYS, 'v46 v45 source bundle', cachePreflightErrors);
    cacheSnapshot = snapshotCacheSafeV45Inputs(baseBuild, baseSources, cachePreflightErrors);
  }
  if (cachePreflightErrors.length) errors.push(...cachePreflightErrors.map(error => `compiled v46 base invalid: ${error}`));
  if (manifest && cacheSnapshot) {
    errors.push(...validateDirectSourceChronology(
      manifest.captured_at,
      cacheSnapshot.baseBuild,
      targetBuild,
      targetFixture,
      cacheSnapshot.baseSources
    ));
  }
  const qualifiedBaseErrors = cacheSnapshot ? validateQualifiedV45Base(baseBuild, baseSources) : cachePreflightErrors;
  if (!cachePreflightErrors.length && qualifiedBaseErrors.length) {
    errors.push(...qualifiedBaseErrors.map(error => `compiled v46 base invalid: ${error}`));
  }
  if (baseBuild && cacheSnapshot && !qualifiedBaseErrors.length) {
    if (stable(controls.slice(0, 47)) !== stable(baseBuild.controls)) errors.push('compiled v46 preserved base controls mismatch');
    if (stable(composition.base_open_frontiers) !== stable(unique(baseBuild.open_frontiers))) errors.push('compiled v46 base frontier snapshot mismatch');
    const baseRequirements = unique(baseBuild?.promotion_boundary?.real_case_requires);
    const hashChecks = {
      base_floor_snapshot_sha256: sha256(baseBuild),
      base_controls_sha256: sha256(baseBuild.controls),
      base_promotion_requirements_sha256: sha256(baseRequirements),
      base_refusal_rule_union_sha256: sha256(baseBuild.refusal_rule_union),
      base_identification_requirements_sha256: sha256(baseBuild.identification_requirements),
      base_open_frontiers_sha256: sha256(baseBuild.open_frontiers),
      base_prohibited_inferences_sha256: sha256(baseBuild.prohibited_inferences),
      base_interpretation_contract_sha256: sha256(baseBuild.interpretation_contract)
    };
    for (const [key, expected] of Object.entries(hashChecks)) if (composition[key] !== expected) errors.push(`compiled v46 base hash mismatch: ${key}`);
  }
  const pc48 = controls.at(-1);
  requireExactKeys(pc48, EXPECTED_CONTROL_KEYS, 'compiled v46 PC-48 control', errors);
  if (pc48?.control_id !== 'PC-48' || pc48?.fixture_id !== FIXTURE_ID || pc48?.failure_class !== FAILURE_CLASS) errors.push('compiled v46 PC-48 identity mismatch');
  if (targetBuild && stable(pc48?.proof_summary) !== stable({ ...targetBuild.metrics, ...targetBuild.classification })) errors.push('compiled v46 PC-48 proof summary mismatch');
  const expectedProofKeys = [
    ...Object.keys(EXPECTED_LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_METRICS),
    ...LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_FALSE_CLASSIFICATIONS,
    COMPLETE_LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_CLASSIFICATION
  ];
  requireExactKeys(pc48?.proof_summary, expectedProofKeys, 'compiled v46 PC-48 proof summary', errors);
  if (stable(pc48?.required_refusal_rules) !== stable(REQUIRED_LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_REFUSAL_RULES)) errors.push('compiled v46 PC-48 required refusal ledger mismatch');
  if (stable(pc48?.observed_refusal_rules) !== stable(REQUIRED_LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_REFUSAL_RULES)) errors.push('compiled v46 PC-48 observed refusal ledger mismatch');
  for (const key of ['counts_toward_thesis_evidence','conclusion_generated','real_world_effect_claimed','preference_change_present','manipulative_intent_inferable']) requireFalse(pc48?.[key], `compiled v46 PC-48 ${key}`, errors);
  if (pc48?.graph_effect !== 'none') errors.push('compiled v46 PC-48 graph effect mismatch');
  requireExactKeys(compiled?.control_integrity, EXPECTED_INTEGRITY_KEYS, 'compiled v46 control integrity', errors);
  for (const key of EXPECTED_INTEGRITY_KEYS) if (compiled?.control_integrity?.[key] !== true) errors.push(`compiled v46 integrity flag false: ${key}`);
  if (stable(compiled?.frontier_transition) !== stable(REQUIRED_FRONTIER_TRANSITION)) errors.push('compiled v46 frontier transition mismatch');
  if (baseBuild && !qualifiedBaseErrors.length) {
    const expectedOpen = unique([...array(baseBuild.open_frontiers).filter(frontier => frontier !== RESOLVED_FRONTIER), ...REQUIRED_SUCCESSORS]);
    if (stable(compiled?.open_frontiers) !== stable(expectedOpen)) errors.push('compiled v46 open-frontier ledger mismatch');
  }
  if (array(compiled?.open_frontiers).includes(RESOLVED_FRONTIER)) errors.push('compiled v46 resolved method frontier remains open');
  for (const successor of REQUIRED_SUCCESSORS) if (!array(compiled?.open_frontiers).includes(successor)) errors.push(`compiled v46 missing successor: ${successor}`);
  for (const successor of [PC47_EVENT_SUCCESSOR, PC47_ESTIMAND_SUCCESSOR]) if (!array(compiled?.open_frontiers).includes(successor)) errors.push(`compiled v46 lost PC-47 successor: ${successor}`);
  if (compiled?.promotion_boundary?.promotion_requirement_count !== 1871 || unique(compiled?.promotion_boundary?.real_case_requires).length !== 1871) errors.push('compiled v46 promotion boundary mismatch');
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v46 laboratory evidence', errors);
  if (manifest && baseBuild && targetBuild && !qualifiedBaseErrors.length) {
    const expectedIdentification = [...array(baseBuild.identification_requirements), canonical(REQUIRED_IDENTIFICATION_REQUIREMENT)];
    const expectedRefusal = unique([...array(baseBuild.refusal_rule_union), ...REQUIRED_LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_REFUSAL_RULES]);
    const expectedProhibited = [...array(baseBuild.prohibited_inferences), ...REQUIRED_PROHIBITED_INFERENCES];
    const expectedRequirements = unique([...array(baseBuild?.promotion_boundary?.real_case_requires), ...REQUIRED_REAL_CASE_REQUIREMENTS]);
    if (stable(compiled?.identification_requirements) !== stable(expectedIdentification)) errors.push('compiled v46 identification ledger mismatch');
    if (stable(compiled?.refusal_rule_union) !== stable(expectedRefusal)) errors.push('compiled v46 refusal union mismatch');
    if (stable(compiled?.prohibited_inferences) !== stable(expectedProhibited)) errors.push('compiled v46 prohibited ledger mismatch');
    if (stable(compiled?.promotion_boundary?.real_case_requires) !== stable(expectedRequirements)) errors.push('compiled v46 requirement ledger mismatch');
    if (stable(compiled?.interpretation_contract) !== stable(REQUIRED_INTERPRETATION_CONTRACT)) errors.push('compiled v46 interpretation contract mismatch');
  }
  if (pc48) {
    for (const [key, expected] of Object.entries(EXPECTED_LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_METRICS)) if (pc48?.proof_summary?.[key] !== expected) errors.push(`compiled v46 PC-48 metric mismatch: ${key}`);
    for (const key of LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_FALSE_CLASSIFICATIONS) requireFalse(pc48?.proof_summary?.[key], `compiled v46 PC-48 classification.${key}`, errors);
    if (pc48?.proof_summary?.[COMPLETE_LINKAGE_INTERVAL_METHOD_PARTITION_REPLICATION_DEPLOYMENT_CLASSIFICATION] !== true) errors.push('compiled v46 complete PC-48 path missing');
  }
  validateChain(compiled, errors);
  if (manifest && composition.manifest_snapshot_sha256 !== sha256(manifest)) errors.push('compiled v46 manifest snapshot hash mismatch');
  if (targetBuild && composition.extension_snapshot_sha256 !== sha256(targetBuild)) errors.push('compiled v46 extension snapshot hash mismatch');
  if (!errors.length && manifest && baseBuild && targetBuild && targetFixture && baseSources) {
    const chronologyErrors = validateSourceChronology(manifest.captured_at, baseBuild, targetBuild, targetFixture, baseSources);
    if (chronologyErrors.length) errors.push(...chronologyErrors);
    if (!errors.length && composition.v45_source_bundle_sha256 !== v45SourceBundleSha256(baseSources)) errors.push('compiled v46 v45 source-bundle hash mismatch');
    const manifestErrors = errors.length ? [] : validatePreferenceCustodyManifestV46(manifest);
    const baseErrors = errors.length ? [] : validateBaseSources(baseBuild, baseSources);
    const targetErrors = errors.length ? [] : validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentBuild(targetBuild, targetFixture);
    if (manifestErrors.length) errors.push(...manifestErrors.map(error => `compiled v46 manifest invalid: ${error}`));
    if (baseErrors.length) errors.push(...baseErrors.map(error => `compiled v46 base invalid: ${error}`));
    if (targetErrors.length) errors.push(...targetErrors.map(error => `compiled v46 PC-48 invalid: ${error}`));
    if (!manifestErrors.length && !baseErrors.length && !targetErrors.length) {
      try {
        const expected = compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, baseSources);
        if (stable(compiled) !== stable(expected)) errors.push('compiled v46 build does not deterministically reconstruct from supplied sources');
      } catch (error) {
        errors.push(`compiled v46 reconstruction failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return errors;
}

export function renderPreferenceCustodyManifestV46Markdown(compiled) {
  const lines = [
    '# Preference Custody laboratory floor v46',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Controls:** ${compiled.control_count}`,
    '',
    `**Promotion requirements:** ${compiled.promotion_boundary.promotion_requirement_count}`,
    '',
    '> Floor v46 preserves the qualified forty-seven-control base and adds PC-48 method implementation, runtime, partition, exchangeability, independent replication, deployment-applicability, monitoring, correction, and current-lineage custody.',
    '',
    '## PC-48 proof summary',
    ''
  ];
  const control = compiled.controls.at(-1);
  for (const [key, value] of Object.entries(control.proof_summary)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Claim boundary', '', 'This is a synthetic compositional control floor, not a real executable-method audit, leakage finding, exchangeability finding, replication result, deployment-validity claim, causal conclusion, graph fact, allegation, or public-authority verdict. Runtime-artifact numerical determinism and deployment monitoring, rollback, withdrawal, and release-succession governance remain open.');
  return `${lines.join('\n')}\n`;
}
