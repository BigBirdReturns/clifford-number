import { createHash } from 'node:crypto';

export const PREFERENCE_LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_FIXTURE_SCHEMA_VERSION =
  'preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance-fixture@1';
export const PREFERENCE_LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_BUILD_SCHEMA_VERSION =
  'preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance-build@1';
export const COMPLETE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_REPLAY_CLASSIFICATION =
  'complete_runtime_artifact_dependency_numerical_replay_assurance';

const EXPECTED_FIXTURE_ID = "same-linkage-runtime-replay-status-different-artifact-dependency-numerical-states-v1";
const EXPECTED_FIXTURE_SNAPSHOT_SHA256 = '262848ba8b020a61f8d6a01f488749ac8df2badc70271407d994fce4c2c1719b';
const EXPECTED_TOP_LEVEL_KEYS = Object.freeze(["schema_version","fixture_id","issue","parent_program_issue","captured_at","status","graph_effect","counts_toward_thesis_evidence","baseline","interpretation_contract","required_refusal_rules","expected_classification","worlds"]);
const EXPECTED_BASELINE_KEYS = Object.freeze(["operative_release","published_candidate_pairs","published_interval_bearing_pairs","published_nominal_coverage","published_empirical_coverage","published_interval_misses","published_mean_interval_width","public_method_status","public_reproducibility_status","public_artifact_status","public_portability_status","published_replay_runs","published_matching_replay_runs","approved_use"]);
const EXPECTED_INTERPRETATION_KEYS = Object.freeze(["what_this_is","what_this_is_not","copy_ready_caveat"]);
const EXPECTED_CLASSIFICATION_KEYS = Object.freeze(["public_replay_badge_identifies_executed_artifact","public_artifact_digest_identifies_loaded_runtime","public_portability_badge_identifies_dependency_and_hardware_equivalence","one_seed_identifies_prng_state_and_draw_order","matching_aggregate_metrics_establish_pair_level_replay_equivalence","published_coverage_establishes_real_world_effect","graph_effect_present","binding_public_authority_present","complete_runtime_artifact_dependency_numerical_replay_assurance_supported_in_at_least_one_world"]);
const EXPECTED_WORLD_KEYS = Object.freeze(["world_id","description","artifact_identity","environment_dependency","numerical_execution","randomness","parallelism","replay_equivalence","governance","expected_mechanism","expected_flags"]);
const SECTION_KEYS = Object.freeze({"artifact_identity":["reviewed_source_bound","reviewed_commit_bound","build_recipe_bound","build_artifact_bound","executable_entry_point_bound","package_identity_bound","container_layers_bound","loaded_module_set_bound","artifact_digest_verified","executed_artifact_matches_reviewed_artifact","unbound_artifact_executions"],"environment_dependency":["dependency_lock_bound","transitive_dependency_graph_bound","package_checksums_bound","compiler_and_flags_bound","operating_system_image_bound","language_runtime_bound","environment_variables_bound","locale_and_timezone_bound","filesystem_and_service_inputs_bound","dependency_environment_drift_executions"],"numerical_execution":["hardware_identity_bound","accelerator_driver_kernel_bound","instruction_set_bound","thread_count_bound","reduction_order_bound","precision_bound","rounding_mode_bound","nondeterministic_operations_disabled_or_audited","numerical_perturbation_tested","hardware_precision_divergence_executions"],"randomness":["seed_value_bound","prng_algorithm_bound","prng_state_bound","stream_and_substream_bound","counter_bound","draw_order_bound","rejection_sampling_path_bound","stochastic_replay_receipt_verified","prng_state_draw_order_divergence_executions"],"parallelism":["process_topology_bound","scheduler_policy_bound","async_completion_order_bound","cache_state_bound","filesystem_order_bound","clock_and_time_source_bound","external_service_response_order_bound","deterministic_execution_order_verified","parallelism_order_divergence_executions"],"replay_equivalence":["input_snapshot_digest_bound","pair_level_output_digest_bound","exact_equivalence_required","tolerance_policy_predeclared","tolerance_symmetric","tolerance_pair_level","aggregate_only_equivalence_refused","divergence_ledger_complete","divergence_disposition_complete","replay_equivalence_tolerance_failures","unreconciled_replay_output_decisions"],"governance":["assurance_current","artifact_dependency_runtime_succession_ledger_complete","replay_policy_succession_ledger_complete","correction_and_retirement_defined","binding_public_authority","stale_runtime_assurance_decisions","unsupported_deterministic_replay_decisions"]});
const WORLD_IDS = Object.freeze(["complete_runtime_artifact_dependency_numerical_replay_assurance","unbound_or_substituted_executed_artifact","dependency_runtime_image_or_environment_drift","hardware_precision_kernel_or_reduction_divergence","seed_prng_state_stream_or_draw_order_divergence","parallel_scheduler_async_cache_or_service_order_divergence","undeclared_or_post_result_replay_equivalence_tolerance","stale_inherited_runtime_and_replay_assurance"]);
const WORLD_MECHANISMS = Object.freeze({"complete_runtime_artifact_dependency_numerical_replay_assurance":"complete_runtime_artifact_dependency_numerical_replay_assurance","unbound_or_substituted_executed_artifact":"unbound_or_substituted_executed_artifact","dependency_runtime_image_or_environment_drift":"dependency_runtime_image_or_environment_drift","hardware_precision_kernel_or_reduction_divergence":"hardware_precision_kernel_or_reduction_divergence","seed_prng_state_stream_or_draw_order_divergence":"seed_prng_state_stream_or_draw_order_divergence","parallel_scheduler_async_cache_or_service_order_divergence":"parallel_scheduler_async_cache_or_service_order_divergence","undeclared_or_post_result_replay_equivalence_tolerance":"undeclared_or_post_result_replay_equivalence_tolerance","stale_inherited_runtime_and_replay_assurance":"stale_inherited_runtime_and_replay_assurance"});
const EXPECTED_WORLD_BURDENS = Object.freeze({"complete_runtime_artifact_dependency_numerical_replay_assurance":{"unbound_artifact_executions":0,"dependency_environment_drift_executions":0,"hardware_precision_divergence_executions":0,"prng_state_draw_order_divergence_executions":0,"parallelism_order_divergence_executions":0,"replay_equivalence_tolerance_failures":0,"unreconciled_replay_output_decisions":0,"stale_runtime_assurance_decisions":0,"unsupported_deterministic_replay_decisions":0},"unbound_or_substituted_executed_artifact":{"unbound_artifact_executions":100,"dependency_environment_drift_executions":0,"hardware_precision_divergence_executions":0,"prng_state_draw_order_divergence_executions":0,"parallelism_order_divergence_executions":0,"replay_equivalence_tolerance_failures":0,"unreconciled_replay_output_decisions":0,"stale_runtime_assurance_decisions":0,"unsupported_deterministic_replay_decisions":100},"dependency_runtime_image_or_environment_drift":{"unbound_artifact_executions":0,"dependency_environment_drift_executions":90,"hardware_precision_divergence_executions":0,"prng_state_draw_order_divergence_executions":0,"parallelism_order_divergence_executions":0,"replay_equivalence_tolerance_failures":0,"unreconciled_replay_output_decisions":0,"stale_runtime_assurance_decisions":0,"unsupported_deterministic_replay_decisions":100},"hardware_precision_kernel_or_reduction_divergence":{"unbound_artifact_executions":0,"dependency_environment_drift_executions":0,"hardware_precision_divergence_executions":80,"prng_state_draw_order_divergence_executions":0,"parallelism_order_divergence_executions":0,"replay_equivalence_tolerance_failures":0,"unreconciled_replay_output_decisions":0,"stale_runtime_assurance_decisions":0,"unsupported_deterministic_replay_decisions":100},"seed_prng_state_stream_or_draw_order_divergence":{"unbound_artifact_executions":0,"dependency_environment_drift_executions":0,"hardware_precision_divergence_executions":0,"prng_state_draw_order_divergence_executions":70,"parallelism_order_divergence_executions":0,"replay_equivalence_tolerance_failures":0,"unreconciled_replay_output_decisions":0,"stale_runtime_assurance_decisions":0,"unsupported_deterministic_replay_decisions":100},"parallel_scheduler_async_cache_or_service_order_divergence":{"unbound_artifact_executions":0,"dependency_environment_drift_executions":0,"hardware_precision_divergence_executions":0,"prng_state_draw_order_divergence_executions":0,"parallelism_order_divergence_executions":60,"replay_equivalence_tolerance_failures":0,"unreconciled_replay_output_decisions":0,"stale_runtime_assurance_decisions":0,"unsupported_deterministic_replay_decisions":100},"undeclared_or_post_result_replay_equivalence_tolerance":{"unbound_artifact_executions":0,"dependency_environment_drift_executions":0,"hardware_precision_divergence_executions":0,"prng_state_draw_order_divergence_executions":0,"parallelism_order_divergence_executions":0,"replay_equivalence_tolerance_failures":50,"unreconciled_replay_output_decisions":40,"stale_runtime_assurance_decisions":0,"unsupported_deterministic_replay_decisions":100},"stale_inherited_runtime_and_replay_assurance":{"unbound_artifact_executions":0,"dependency_environment_drift_executions":0,"hardware_precision_divergence_executions":0,"prng_state_draw_order_divergence_executions":0,"parallelism_order_divergence_executions":0,"replay_equivalence_tolerance_failures":0,"unreconciled_replay_output_decisions":0,"stale_runtime_assurance_decisions":100,"unsupported_deterministic_replay_decisions":100}});

export const REQUIRED_LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_REFUSAL_RULES =
  Object.freeze(["one_public_replay_badge_is_not_the_executed_artifact_and_loaded_runtime","one_artifact_digest_is_not_the_loaded_entry_point_package_module_and_container_layer_set","one_lockfile_is_not_complete_transitive_dependency_provenance_and_package_checksum_custody","one_container_tag_is_not_an_immutable_operating_system_runtime_and_environment_image","one_successful_replay_is_not_deterministic_assurance_across_permitted_environments_hardware_and_numerics","one_seed_label_is_not_prng_algorithm_state_stream_counter_substream_and_draw_order_custody","one_hardware_match_is_not_numerical_equivalence_without_driver_kernel_instruction_precision_rounding_and_reduction_order","matching_aggregate_metrics_are_not_pair_level_output_equivalence","post_result_or_widened_tolerance_is_not_predeclared_replay_equivalence","one_exact_byte_match_is_not_complete_replay_custody_without_input_output_and_execution_lineage","one_parallel_run_is_not_scheduler_process_async_cache_filesystem_clock_and_service_order_invariance","absence_of_a_divergence_log_is_not_evidence_of_zero_divergence","historical_replay_assurance_is_not_current_after_artifact_dependency_runtime_hardware_precision_prng_parallelism_tolerance_or_release_succession","replay_or_numerical_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent","binding_public_authority_requires_separate_current_public_authorization_receipts","synthetic_runtime_burdens_are_not_real_world_error_prevalence_or_institutional_performance_estimates","portable_replay_requires_declared_environment_matrix_failure_thresholds_correction_and_retirement_receipts"]);
export const LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_FALSE_CLASSIFICATIONS =
  Object.freeze({"public_replay_badge_identifies_executed_artifact":false,"public_artifact_digest_identifies_loaded_runtime":false,"public_portability_badge_identifies_dependency_and_hardware_equivalence":false,"one_seed_identifies_prng_state_and_draw_order":false,"matching_aggregate_metrics_establish_pair_level_replay_equivalence":false,"published_coverage_establishes_real_world_effect":false,"graph_effect_present":false,"binding_public_authority_present":false});
export const EXPECTED_LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_METRICS =
  Object.freeze({
    worlds: 8,
    public_runtime_artifact_replay_signatures: 1,
    runtime_governance_signatures: 8,
    complete_runtime_assurance_worlds: 1,
    unbound_artifact_executions: 100,
    dependency_environment_drift_executions: 90,
    hardware_precision_divergence_executions: 80,
    prng_state_draw_order_divergence_executions: 70,
    parallelism_order_divergence_executions: 60,
    replay_equivalence_tolerance_failures: 50,
    unreconciled_replay_output_decisions: 40,
    stale_runtime_assurance_decisions: 100,
    unsupported_deterministic_replay_decisions: 700,
    binding_public_authority_worlds: 0
  });

const BUILD_KEYS = Object.freeze([
  'schema_version','fixture_id','issue','parent_program_issue','captured_at','status','graph_effect',
  'counts_toward_thesis_evidence','conclusion_generated','real_world_evidence_state','fixture_snapshot_sha256',
  'baseline','baseline_snapshot_sha256','public_signature_count','world_count','runtime_governance_signature_count',
  'complete_runtime_assurance_world_count','worlds','metrics','classification','required_refusal_rules',
  'custody_chain','custody_chain_head_sha256','interpretation_contract'
]);
const COMPILED_WORLD_KEYS = Object.freeze([
  'world_id','description','artifact_identity','environment_dependency','numerical_execution','randomness',
  'parallelism','replay_equivalence','governance','expected_mechanism','flags','numeric_burden',
  'public_signature_sha256','runtime_governance_signature_sha256'
]);
const FLAG_KEYS = Object.freeze([
  'complete_artifact_identity_custody','complete_environment_dependency_custody',
  'complete_numerical_execution_custody','complete_randomness_custody','complete_parallelism_custody',
  'complete_replay_equivalence_custody','current_runtime_lineage_assurance',
  'complete_runtime_artifact_dependency_numerical_replay_assurance'
]);
const BURDEN_LOCATIONS = Object.freeze({
  unbound_artifact_executions: ['artifact_identity','unbound_artifact_executions'],
  dependency_environment_drift_executions: ['environment_dependency','dependency_environment_drift_executions'],
  hardware_precision_divergence_executions: ['numerical_execution','hardware_precision_divergence_executions'],
  prng_state_draw_order_divergence_executions: ['randomness','prng_state_draw_order_divergence_executions'],
  parallelism_order_divergence_executions: ['parallelism','parallelism_order_divergence_executions'],
  replay_equivalence_tolerance_failures: ['replay_equivalence','replay_equivalence_tolerance_failures'],
  unreconciled_replay_output_decisions: ['replay_equivalence','unreconciled_replay_output_decisions'],
  stale_runtime_assurance_decisions: ['governance','stale_runtime_assurance_decisions'],
  unsupported_deterministic_replay_decisions: ['governance','unsupported_deterministic_replay_decisions']
});

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const stable = value => JSON.stringify(canonical(value));
const sha256 = value => createHash('sha256').update(typeof value === 'string' ? value : stable(value)).digest('hex');
const sorted = values => [...values].sort((left, right) => String(left).localeCompare(String(right)));
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const nonNegativeInteger = value => Number.isInteger(value) && value >= 0;
const isoDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

function requireExactKeys(value, expected, label, errors) {
  let keys;
  try { keys = Reflect.ownKeys(value); } catch { errors.push(`${label} must be inspectable`); return; }
  const strings = keys.filter(key => typeof key === 'string');
  if (strings.length !== keys.length || stable(sorted(strings)) !== stable(sorted(expected)) || strings.length !== expected.length) {
    errors.push(`${label} key ledger mismatch`);
  }
}

function validateCanonicalJsonTree(value, label, errors, seen = new WeakSet()) {
  const walk = (current, path) => {
    const type = typeof current;
    if (current === null || type === 'string' || type === 'boolean') return;
    if (type === 'number') { if (!Number.isFinite(current)) errors.push(`${path} must contain only finite JSON numbers`); return; }
    if (type !== 'object') { errors.push(`${path} contains unsupported JSON value type ${type}`); return; }
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
export function projectPreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture(fixture) {
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
export const preferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixtureSnapshot = fixture =>
  sha256(projectPreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture(fixture));

function sectionComplete(section, keys) {
  return keys.every(key => key in BURDEN_LOCATIONS ? nonNegativeInteger(section?.[key]) && section[key] === 0 : section?.[key] === true);
}
export function classifyPreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayWorld(world) {
  const artifact = sectionComplete(world?.artifact_identity, SECTION_KEYS.artifact_identity);
  const environment = sectionComplete(world?.environment_dependency, SECTION_KEYS.environment_dependency);
  const numerical = sectionComplete(world?.numerical_execution, SECTION_KEYS.numerical_execution);
  const randomness = sectionComplete(world?.randomness, SECTION_KEYS.randomness);
  const parallelism = sectionComplete(world?.parallelism, SECTION_KEYS.parallelism);
  const equivalence = sectionComplete(world?.replay_equivalence, SECTION_KEYS.replay_equivalence);
  const governance = object(world?.governance);
  const current = artifact && environment && numerical && randomness && parallelism && equivalence &&
    governance.assurance_current === true &&
    governance.artifact_dependency_runtime_succession_ledger_complete === true &&
    governance.replay_policy_succession_ledger_complete === true &&
    governance.correction_and_retirement_defined === true &&
    governance.binding_public_authority === false &&
    governance.stale_runtime_assurance_decisions === 0 &&
    governance.unsupported_deterministic_replay_decisions === 0;
  return {
    complete_artifact_identity_custody: artifact,
    complete_environment_dependency_custody: environment,
    complete_numerical_execution_custody: numerical,
    complete_randomness_custody: randomness,
    complete_parallelism_custody: parallelism,
    complete_replay_equivalence_custody: equivalence,
    current_runtime_lineage_assurance: current,
    complete_runtime_artifact_dependency_numerical_replay_assurance: current
  };
}

function numericBurden(world) {
  return Object.fromEntries(Object.entries(BURDEN_LOCATIONS).map(([key, [section, field]]) => [key, world?.[section]?.[field]]));
}
function computeMetrics(worlds) {
  const publicSignatures = new Set(worlds.map(world => world.public_signature_sha256));
  const governanceSignatures = new Set(worlds.map(world => world.runtime_governance_signature_sha256));
  const metrics = {
    worlds: worlds.length,
    public_runtime_artifact_replay_signatures: publicSignatures.size,
    runtime_governance_signatures: governanceSignatures.size,
    complete_runtime_assurance_worlds: worlds.filter(world => world.flags.complete_runtime_artifact_dependency_numerical_replay_assurance).length,
    ...Object.fromEntries(Object.keys(BURDEN_LOCATIONS).map(key => [key, worlds.reduce((sum, world) => sum + Number(world.numeric_burden[key] ?? 0), 0)])),
    binding_public_authority_worlds: worlds.filter(world => world.governance.binding_public_authority === true).length
  };
  return metrics;
}
function seal(event, previousEventSha256) {
  const unsigned = { ...canonical(event), previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}
function custodyChain(fixture, worlds, metrics, classification) {
  const events = [
    { event_index: 1, event_type: 'fixture_frozen', fixture_snapshot_sha256: preferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixtureSnapshot(fixture) },
    { event_index: 2, event_type: 'public_surface_frozen', baseline_snapshot_sha256: sha256(fixture.baseline), public_signature_count: metrics.public_runtime_artifact_replay_signatures },
    { event_index: 3, event_type: 'runtime_worlds_classified', world_count: metrics.worlds, runtime_governance_signature_count: metrics.runtime_governance_signatures, world_classification_sha256: sha256(worlds.map(world => [world.world_id, world.flags, world.expected_mechanism])) },
    { event_index: 4, event_type: 'runtime_burdens_reconciled', metrics_sha256: sha256(metrics), unsupported_deterministic_replay_decisions: metrics.unsupported_deterministic_replay_decisions },
    { event_index: 5, event_type: 'authority_ceiling_preserved', graph_effect: fixture.graph_effect, counts_toward_thesis_evidence: fixture.counts_toward_thesis_evidence, classification_sha256: sha256(classification), binding_public_authority_worlds: metrics.binding_public_authority_worlds }
  ];
  let previous = null;
  return events.map(event => { const sealed = seal(event, previous); previous = sealed.event_sha256; return sealed; });
}

export function validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture(fixture) {
  const errors = [];
  validateCanonicalJsonTree(fixture, 'PC-49 fixture', errors);
  if (errors.length) return errors;
  requireExactKeys(fixture, EXPECTED_TOP_LEVEL_KEYS, 'PC-49 fixture', errors);
  requireExactKeys(fixture.baseline, EXPECTED_BASELINE_KEYS, 'PC-49 baseline', errors);
  requireExactKeys(fixture.interpretation_contract, EXPECTED_INTERPRETATION_KEYS, 'PC-49 interpretation contract', errors);
  requireExactKeys(fixture.expected_classification, EXPECTED_CLASSIFICATION_KEYS, 'PC-49 expected classification', errors);
  if (fixture.schema_version !== PREFERENCE_LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_FIXTURE_SCHEMA_VERSION) errors.push('PC-49 fixture schema mismatch');
  if (fixture.fixture_id !== EXPECTED_FIXTURE_ID) errors.push('PC-49 fixture id mismatch');
  if (fixture.issue !== 1120 || fixture.parent_program_issue !== 594) errors.push('PC-49 issue binding mismatch');
  if (!isoDate(fixture.captured_at) || fixture.captured_at !== '2026-08-04') errors.push('PC-49 capture date mismatch');
  if (fixture.status !== 'synthetic_control') errors.push('PC-49 status mismatch');
  if (fixture.graph_effect !== 'none') errors.push('PC-49 graph effect must remain none');
  if (fixture.counts_toward_thesis_evidence !== false) errors.push('PC-49 must not count toward thesis evidence');
  if (stable(fixture.required_refusal_rules) !== stable(REQUIRED_LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_REFUSAL_RULES)) errors.push('PC-49 refusal-rule ledger mismatch');
  if (fixture.required_refusal_rules.length !== unique(fixture.required_refusal_rules).length) errors.push('PC-49 refusal rules must be unique');
  if (stable(fixture.expected_classification) !== stable({"public_replay_badge_identifies_executed_artifact":false,"public_artifact_digest_identifies_loaded_runtime":false,"public_portability_badge_identifies_dependency_and_hardware_equivalence":false,"one_seed_identifies_prng_state_and_draw_order":false,"matching_aggregate_metrics_establish_pair_level_replay_equivalence":false,"published_coverage_establishes_real_world_effect":false,"graph_effect_present":false,"binding_public_authority_present":false,"complete_runtime_artifact_dependency_numerical_replay_assurance_supported_in_at_least_one_world":true})) errors.push('PC-49 expected classification mismatch');
  if (!Array.isArray(fixture.worlds) || fixture.worlds.length !== WORLD_IDS.length) errors.push('PC-49 must contain exactly eight worlds');
  const ids = array(fixture.worlds).map(world => world?.world_id);
  if (stable(ids) !== stable(WORLD_IDS)) errors.push('PC-49 world order or identity mismatch');
  const baselineHash = sha256(fixture.baseline);
  for (const [index, world] of array(fixture.worlds).entries()) {
    requireExactKeys(world, EXPECTED_WORLD_KEYS, `PC-49 world ${index}`, errors);
    for (const [section, keys] of Object.entries(SECTION_KEYS)) requireExactKeys(world?.[section], keys, `PC-49 world ${world?.world_id} ${section}`, errors);
    requireExactKeys(world?.expected_flags, FLAG_KEYS, `PC-49 world ${world?.world_id} expected flags`, errors);
    if (world.expected_mechanism !== WORLD_MECHANISMS[world.world_id]) errors.push(`PC-49 world ${world.world_id} mechanism mismatch`);
    const flags = classifyPreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayWorld(world);
    if (stable(flags) !== stable(world.expected_flags)) errors.push(`PC-49 world ${world.world_id} flag classification mismatch`);
    const burden = numericBurden(world);
    if (stable(burden) !== stable(EXPECTED_WORLD_BURDENS[world.world_id])) errors.push(`PC-49 world ${world.world_id} burden allocation mismatch`);
    if (world.governance.binding_public_authority !== false) errors.push(`PC-49 world ${world.world_id} binding authority must remain false`);
    if (sha256(fixture.baseline) !== baselineHash) errors.push('PC-49 public baseline must remain identical across worlds');
  }
  const snapshot = preferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixtureSnapshot(fixture);
  if (snapshot !== EXPECTED_FIXTURE_SNAPSHOT_SHA256) errors.push(`PC-49 fixture snapshot mismatch: ${snapshot}`);
  return unique(errors);
}

export function compilePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture(fixture) {
  const errors = validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture(fixture);
  if (errors.length) throw new Error(errors.join('\n'));
  const publicSignature = sha256(fixture.baseline);
  const worlds = fixture.worlds.map(world => {
    const projected = projectWorld(world);
    return {
      world_id: world.world_id,
      description: world.description,
      artifact_identity: canonical(world.artifact_identity),
      environment_dependency: canonical(world.environment_dependency),
      numerical_execution: canonical(world.numerical_execution),
      randomness: canonical(world.randomness),
      parallelism: canonical(world.parallelism),
      replay_equivalence: canonical(world.replay_equivalence),
      governance: canonical(world.governance),
      expected_mechanism: world.expected_mechanism,
      flags: classifyPreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayWorld(world),
      numeric_burden: numericBurden(world),
      public_signature_sha256: publicSignature,
      runtime_governance_signature_sha256: sha256(projected)
    };
  });
  const metrics = computeMetrics(worlds);
  const classification = canonical(fixture.expected_classification);
  const chain = custodyChain(fixture, worlds, metrics, classification);
  return {
    schema_version: PREFERENCE_LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'synthetic_runtime_artifact_dependency_numerical_replay_control_compiled',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    fixture_snapshot_sha256: preferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixtureSnapshot(fixture),
    baseline: canonical(fixture.baseline),
    baseline_snapshot_sha256: publicSignature,
    public_signature_count: metrics.public_runtime_artifact_replay_signatures,
    world_count: worlds.length,
    runtime_governance_signature_count: metrics.runtime_governance_signatures,
    complete_runtime_assurance_world_count: metrics.complete_runtime_assurance_worlds,
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
  if (!Array.isArray(build.custody_chain) || build.custody_chain.length !== 5) { errors.push('PC-49 custody chain must contain five events'); return; }
  let previous = null;
  for (const [index, event] of build.custody_chain.entries()) {
    if (event.event_index !== index + 1) errors.push(`PC-49 custody event ${index} index mismatch`);
    if (event.previous_event_sha256 !== previous) errors.push(`PC-49 custody event ${index} previous hash mismatch`);
    const { event_sha256, ...unsigned } = event;
    if (event_sha256 !== sha256(unsigned)) errors.push(`PC-49 custody event ${index} hash mismatch`);
    previous = event_sha256;
  }
  if (build.custody_chain_head_sha256 !== previous) errors.push('PC-49 custody chain head mismatch');
}

export function validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayBuild(build, fixture) {
  const errors = [];
  validateCanonicalJsonTree(build, 'PC-49 build', errors);
  if (errors.length) return errors;
  requireExactKeys(build, BUILD_KEYS, 'PC-49 build', errors);
  for (const [index, world] of array(build.worlds).entries()) {
    requireExactKeys(world, COMPILED_WORLD_KEYS, `PC-49 compiled world ${index}`, errors);
    requireExactKeys(world.flags, FLAG_KEYS, `PC-49 compiled world ${index} flags`, errors);
    requireExactKeys(world.numeric_burden, Object.keys(BURDEN_LOCATIONS), `PC-49 compiled world ${index} numeric burden`, errors);
  }
  errors.push(...validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture(fixture));
  if (errors.length) return unique(errors);
  let expected;
  try { expected = compilePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture(fixture); }
  catch (error) { errors.push(`PC-49 expected build could not compile: ${error.message}`); return unique(errors); }
  if (stable(build) !== stable(expected)) errors.push('PC-49 build differs from deterministic compilation');
  if (stable(build.metrics) !== stable(EXPECTED_LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_METRICS)) errors.push('PC-49 metrics mismatch');
  for (const [key, value] of Object.entries(LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_FALSE_CLASSIFICATIONS)) {
    if (build.classification?.[key] !== value) errors.push(`PC-49 classification ${key} must remain ${value}`);
  }
  if (build.classification?.complete_runtime_artifact_dependency_numerical_replay_assurance_supported_in_at_least_one_world !== true) errors.push('PC-49 must preserve one complete synthetic world');
  validateCustodyChain(build, errors);
  return unique(errors);
}

export function renderPreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayMarkdown(build) {
  const metricLines = Object.entries(build.metrics).map(([key, value]) => `| ${key} | ${value} |`).join('\n');
  const worldLines = build.worlds.map(world => `| ${world.world_id} | ${world.expected_mechanism} | ${world.flags.complete_runtime_artifact_dependency_numerical_replay_assurance ? 'complete' : 'refused'} | ${Object.values(world.numeric_burden).reduce((sum, value) => sum + value, 0)} |`).join('\n');
  return `# PC-49 runtime artifact, dependency, numerical determinism, and replay custody

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
    `Only one synthetic world satisfies complete runtime-artifact, dependency, numerical, PRNG, parallelism, replay-equivalence, correction, and current-lineage custody. Public badges remain nonproof of the executed artifact or a real-world deterministic replay.
`;
}
