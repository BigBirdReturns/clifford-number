import { createHash } from 'node:crypto';

export const PREFERENCE_LINKAGE_TARGET_CONSTRUCTION_EXCHANGEABILITY_FIXTURE_SCHEMA_VERSION = 'preference-linkage-target-construction-exchangeability-assurance-fixture@1';
export const PREFERENCE_LINKAGE_TARGET_CONSTRUCTION_EXCHANGEABILITY_BUILD_SCHEMA_VERSION = 'preference-linkage-target-construction-exchangeability-assurance-build@1';
export const COMPLETE_LINKAGE_TARGET_METHOD_EXCHANGEABILITY_CLASSIFICATION = 'complete_linkage_interval_target_method_exchangeability_assurance_supported_in_at_least_one_world';
export const LINKAGE_TARGET_METHOD_EXCHANGEABILITY_FALSE_CLASSIFICATIONS = Object.freeze(["public_target_badges_identify_defined_event", "pair_label_identifies_entity_or_trajectory_event", "estimand_name_identifies_population_unit_horizon_support_tail", "method_label_identifies_reproducible_method", "reproducible_build_identifies_out_of_sample_design", "heldout_file_identifies_independent_data", "random_pair_split_identifies_leakage_free_partition", "historical_validation_identifies_deployment_exchangeability", "one_method_result_identifies_shift_robust_applicability", "aggregate_agreement_identifies_all_subgroup_support", "one_replication_identifies_independent_replication", "historical_target_method_certificate_identifies_current_assurance", "public_target_method_out_of_sample_status_identifies_complete_authorized_evidence", "target_exchangeability_failure_identifies_misconduct_intent", "binding_public_authority_supported", "manipulative_intent_inferable", "real_world_effect_claimed", "graph_effect_present", "preference_change_present"]);
export const REQUIRED_LINKAGE_TARGET_METHOD_EXCHANGEABILITY_REFUSAL_RULES = Object.freeze(["one_target_badge_is_not_a_defined_predicted_event", "one_pair_label_is_not_an_entity_household_cluster_graph_or_longitudinal_trajectory_event", "one_estimand_name_is_not_target_population_unit_horizon_support_or_tail_custody", "one_interval_method_label_is_not_identifiable_code_configuration_seed_transform_and_method_lineage", "one_reproducible_build_is_not_an_out_of_sample_design_when_data_partitions_overlap", "random_pair_splitting_is_not_leakage_free_when_entities_sources_households_clusters_graph_components_trajectories_or_time_cross_splits", "one_heldout_file_is_not_independent_when_labels_features_records_derivations_or_model_selection_cross_the_boundary", "historical_calibration_or_validation_data_are_not_deployment_exchangeability", "one_conformal_bootstrap_posterior_or_predictive_result_is_not_valid_after_its_assumptions_fail", "aggregate_source_or_population_agreement_is_not_support_overlap_for_every_deployment_subgroup_or_tail", "one_replication_is_not_independent_when_the_method_labels_population_or_acceptance_rule_changed_after_results", "historical_target_method_or_out_of_sample_assurance_is_not_current_after_model_feature_label_source_population_workflow_policy_or_release_succession", "public_target_method_and_out_of_sample_status_is_not_complete_event_estimand_method_data_separation_leakage_exchangeability_deployment_applicability_correction_durability_or_authority_custody", "target_or_exchangeability_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent", "binding_public_authority_requires_separate_current_public_authorization_receipts"]);
export const EXPECTED_LINKAGE_TARGET_METHOD_EXCHANGEABILITY_METRICS = Object.freeze({
  worlds: 8,
  public_target_method_signatures: 1,
  target_method_governance_signatures: 8,
  complete_target_method_exchangeability_assurance_worlds: 1,
  undefined_event_pairs: 100,
  estimand_mismatched_pairs: 80,
  unidentified_method_pairs: 60,
  construction_validation_overlap_pairs: 40,
  split_leaked_pairs: 40,
  exchangeability_violated_pairs: 50,
  deployment_shifted_pairs: 50,
  independent_replication_failures: 30,
  stale_target_method_decisions: 100,
  unsupported_interval_decisions: 700,
  binding_public_authority_worlds: 0
});
const EXPECTED_BASELINE = Object.freeze({"operative_release_id": "RELEASE-INCIDENT-V1", "operative_release_version": 1, "source_systems": 4, "published_candidate_pairs": 100, "published_interval_bearing_pairs": 100, "published_nominal_coverage_pct": 95, "published_empirical_coverage_pct": 95, "published_interval_misses": 5, "published_mean_interval_width": 0.02, "public_interval_target_status": "linkage_interval_target_verified", "public_construction_method_status": "linkage_interval_method_verified", "public_out_of_sample_status": "out_of_sample_validated", "approved_use": "longitudinal_exposure_estimation"});
const EXPECTED_INTERPRETATION_CONTRACT = Object.freeze({
  what_this_is: 'A synthetic eight-world control for linkage interval event, estimand, method, data-partition, exchangeability, deployment, and lineage equifinality.',
  what_this_is_not: 'A real interval, identity map, deployment applicability finding, empirical burden, causal effect, graph fact, allegation, or public-authority verdict.',
  copy_ready_caveat: 'The same complete-looking public target, method, and out-of-sample badges can coexist with complete assurance or with undefined events, mismatched estimands, unidentified methods, data reuse, split leakage, failed exchangeability, deployment shift, or stale lineage. Real use requires complete source-addressed custody.'
});
const EXPECTED_WORLD_IDS = Object.freeze([
  'complete_target_method_exchangeability_assurance',
  'undefined_or_mismatched_predicted_event',
  'estimand_population_unit_horizon_mismatch',
  'unidentified_or_irreproducible_construction_method',
  'construction_calibration_validation_data_reuse',
  'entity_source_cluster_graph_temporal_split_leakage',
  'exchangeability_distribution_shift_and_replication_failure',
  'stale_target_method_and_out_of_sample_lineage'
]);
const EXPECTED_MECHANISMS = Object.freeze(Object.fromEntries(EXPECTED_WORLD_IDS.map(id => [id, id])));
const EXPECTED_WORLD_SNAPSHOT_SHA256 = Object.freeze({
  "complete_target_method_exchangeability_assurance": "4f849821a5dc0030fc668f4198a55eca4e4eb26bb8d9edbecd19f48cd636e310",
  "undefined_or_mismatched_predicted_event": "c9808d4f6ed052df1d686a0e3c63cc95a50ba70d12593c60056b3f2c161569eb",
  "estimand_population_unit_horizon_mismatch": "fb765f0238563fd7711d38b557472896d2d983dcb90e9e328e1fcb41ee738af7",
  "unidentified_or_irreproducible_construction_method": "bf96a0532d0c80651079e2790b41fab94a40cb8448dce377fbd7df9723534722",
  "construction_calibration_validation_data_reuse": "455b53b826dcba0ca5445f3445cc39b92518be1ce6d91670808e239c3a8d78cd",
  "entity_source_cluster_graph_temporal_split_leakage": "81cb5c06584c72b00a89eb31dfa92ffe1375e1f0541caa129664bfbf9ce67ef0",
  "exchangeability_distribution_shift_and_replication_failure": "48495bf7f9ba289f4d53618729c6914e3652a21fabbf0bee88641b3576489f5e",
  "stale_target_method_and_out_of_sample_lineage": "047f82ab6b4cbd2ddbf46b3c719cbdbf72d3816ce65160d3feef353511976f60",
});
const EXPECTED_FIXTURE_KEYS = Object.freeze(['schema_version','fixture_id','issue','parent_program_issue','captured_at','status','graph_effect','counts_toward_thesis_evidence','baseline','required_refusal_rules','expected_classification','worlds','interpretation_contract']);
const EXPECTED_WORLD_KEYS = Object.freeze(['world_id','description','target_event','estimand_scope','method_identity','data_partition','exchangeability_deployment','governance','expected_mechanism','expected_flags']);
const EXPECTED_TARGET_EVENT_KEYS = Object.freeze(['event_defined','state_space_defined','positive_negative_events_defined','censoring_competing_events_defined','abstention_ambiguity_defined','interpretation_current','undefined_event_pairs']);
const EXPECTED_ESTIMAND_SCOPE_KEYS = Object.freeze(['estimand_defined','target_population_defined','sampling_frame_complete','unit_matches_claim','horizon_defined','support_tail_meaning_defined','estimand_mismatched_pairs']);
const EXPECTED_METHOD_IDENTITY_KEYS = Object.freeze(['method_family_identified','method_version_current','code_repository_commit_bound','configuration_seed_environment_bound','transformation_and_inversion_defined','deterministic_replay_supported','unidentified_method_pairs']);
const EXPECTED_DATA_PARTITION_KEYS = Object.freeze(['training_tuning_separate','construction_calibration_separate','calibration_validation_separate','holdout_independent','labels_independent','cross_dataset_overlap_audited','group_split_leakage_free','construction_validation_overlap_pairs','split_leaked_pairs']);
const EXPECTED_EXCHANGEABILITY_DEPLOYMENT_KEYS = Object.freeze(['assumptions_stated','support_overlap_verified','covariate_label_source_shift_bounded','population_temporal_policy_shift_bounded','deployment_within_scope','independent_replication_complete','replication_method_frozen','exchangeability_violated_pairs','deployment_shifted_pairs','independent_replication_failures']);
const EXPECTED_GOVERNANCE_KEYS = Object.freeze(['current_lineage','negative_controls_complete','falsification_complete','applicability_boundary_enforced','correction_and_withdrawal_available','public_claim_supported','binding_public_authority','stale_target_method_decisions','unsupported_interval_decisions']);
const EXPECTED_WORLD_FLAG_KEYS = Object.freeze(['complete_target_event_assurance','complete_estimand_scope_assurance','complete_method_identity_assurance','complete_data_partition_assurance','complete_exchangeability_deployment_assurance','current_target_method_lineage_assurance','binding_public_authority_supported','real_world_effect_claimed','graph_effect_present','preference_change_present','complete_linkage_interval_target_method_exchangeability_assurance']);
const BURDEN_KEYS = Object.freeze(['undefined_event_pairs','estimand_mismatched_pairs','unidentified_method_pairs','construction_validation_overlap_pairs','split_leaked_pairs','exchangeability_violated_pairs','deployment_shifted_pairs','independent_replication_failures','stale_target_method_decisions','unsupported_interval_decisions']);
const ZERO_BURDEN = Object.freeze(Object.fromEntries(BURDEN_KEYS.map(key => [key, 0])));
const burden = overrides => Object.freeze({ ...ZERO_BURDEN, ...overrides });
const EXPECTED_WORLD_BURDENS = Object.freeze({
  complete_target_method_exchangeability_assurance: burden({}),
  undefined_or_mismatched_predicted_event: burden({ undefined_event_pairs:100, unsupported_interval_decisions:100 }),
  estimand_population_unit_horizon_mismatch: burden({ estimand_mismatched_pairs:80, unsupported_interval_decisions:100 }),
  unidentified_or_irreproducible_construction_method: burden({ unidentified_method_pairs:60, unsupported_interval_decisions:100 }),
  construction_calibration_validation_data_reuse: burden({ construction_validation_overlap_pairs:40, unsupported_interval_decisions:100 }),
  entity_source_cluster_graph_temporal_split_leakage: burden({ split_leaked_pairs:40, unsupported_interval_decisions:100 }),
  exchangeability_distribution_shift_and_replication_failure: burden({ exchangeability_violated_pairs:50, deployment_shifted_pairs:50, independent_replication_failures:30, unsupported_interval_decisions:100 }),
  stale_target_method_and_out_of_sample_lineage: burden({ stale_target_method_decisions:100, unsupported_interval_decisions:100 })
});
const EXPECTED_BUILD_KEYS = Object.freeze(['schema_version','fixture_id','issue','parent_program_issue','captured_at','status','graph_effect','counts_toward_thesis_evidence','conclusion_generated','real_world_evidence_state','source_fixture_sha256','required_refusal_rules','baseline','worlds','metrics','classification','custody_chain','custody_chain_head_sha256','interpretation_contract']);
const EXPECTED_COMPILED_WORLD_KEYS = Object.freeze([...EXPECTED_WORLD_KEYS,'public_surface','public_signature_sha256','target_method_governance_signature_sha256','observed_flags','burdens']);

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const sorted = values => [...values].sort((left, right) => String(left).localeCompare(String(right)));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const stable = value => JSON.stringify(canonical(value));
const sha256 = value => createHash('sha256').update(stable(value)).digest('hex');
const sameMembers = (left, right) => stable(sorted(unique(left))) === stable(sorted(unique(right)));
const sameKeys = (value, expected) => stable(Object.keys(object(value)).sort()) === stable([...expected].sort());
const requireExactKeys = (value, expected, label, errors) => { if (!sameKeys(value, expected)) errors.push(`${label} key ledger mismatch`); };
const requireFalse = (value, label, errors) => { if (value !== false) errors.push(`${label} must remain false`); };
const allTrue = (source, keys) => keys.every(key => source?.[key] === true);
const nonnegative = value => Number.isInteger(value) && value >= 0;
const isoDate = value => { if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const parsed=new Date(`${value}T00:00:00Z`); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10)===value; };
const project = (value, keys) => Object.fromEntries(keys.map(key => [key, value?.[key]]));
function projectWorld(world) {
  return {
    world_id: world?.world_id,
    description: world?.description,
    target_event: project(world?.target_event, EXPECTED_TARGET_EVENT_KEYS),
    estimand_scope: project(world?.estimand_scope, EXPECTED_ESTIMAND_SCOPE_KEYS),
    method_identity: project(world?.method_identity, EXPECTED_METHOD_IDENTITY_KEYS),
    data_partition: project(world?.data_partition, EXPECTED_DATA_PARTITION_KEYS),
    exchangeability_deployment: project(world?.exchangeability_deployment, EXPECTED_EXCHANGEABILITY_DEPLOYMENT_KEYS),
    governance: project(world?.governance, EXPECTED_GOVERNANCE_KEYS),
    expected_mechanism: world?.expected_mechanism,
    expected_flags: project(world?.expected_flags, EXPECTED_WORLD_FLAG_KEYS)
  };
}
function seal(event, previous) { const unsigned = { ...canonical(event), previous_event_sha256: previous }; return { ...unsigned, event_sha256: sha256(unsigned) }; }

function classifyWorld(world) {
  const target = object(world?.target_event);
  const estimand = object(world?.estimand_scope);
  const method = object(world?.method_identity);
  const partition = object(world?.data_partition);
  const exchangeability = object(world?.exchangeability_deployment);
  const governance = object(world?.governance);
  const targetOk = allTrue(target, ['event_defined','state_space_defined','positive_negative_events_defined','censoring_competing_events_defined','abstention_ambiguity_defined','interpretation_current']);
  const estimandOk = allTrue(estimand, ['estimand_defined','target_population_defined','sampling_frame_complete','unit_matches_claim','horizon_defined','support_tail_meaning_defined']);
  const methodOk = allTrue(method, ['method_family_identified','method_version_current','code_repository_commit_bound','configuration_seed_environment_bound','transformation_and_inversion_defined','deterministic_replay_supported']);
  const partitionOk = allTrue(partition, ['training_tuning_separate','construction_calibration_separate','calibration_validation_separate','holdout_independent','labels_independent','cross_dataset_overlap_audited','group_split_leakage_free']);
  const exchangeabilityOk = allTrue(exchangeability, ['assumptions_stated','support_overlap_verified','covariate_label_source_shift_bounded','population_temporal_policy_shift_bounded','deployment_within_scope','independent_replication_complete','replication_method_frozen']);
  const lineageOk = allTrue(governance, ['current_lineage','negative_controls_complete','falsification_complete','applicability_boundary_enforced','correction_and_withdrawal_available','public_claim_supported']);
  return {
    complete_target_event_assurance: targetOk,
    complete_estimand_scope_assurance: estimandOk,
    complete_method_identity_assurance: methodOk,
    complete_data_partition_assurance: partitionOk,
    complete_exchangeability_deployment_assurance: exchangeabilityOk,
    current_target_method_lineage_assurance: lineageOk,
    binding_public_authority_supported: false,
    real_world_effect_claimed: false,
    graph_effect_present: false,
    preference_change_present: false,
    complete_linkage_interval_target_method_exchangeability_assurance: targetOk && estimandOk && methodOk && partitionOk && exchangeabilityOk && lineageOk
  };
}

function numericBurden(world) {
  const target = object(world?.target_event);
  const estimand = object(world?.estimand_scope);
  const method = object(world?.method_identity);
  const partition = object(world?.data_partition);
  const exchangeability = object(world?.exchangeability_deployment);
  const governance = object(world?.governance);
  return {
    undefined_event_pairs: target.undefined_event_pairs,
    estimand_mismatched_pairs: estimand.estimand_mismatched_pairs,
    unidentified_method_pairs: method.unidentified_method_pairs,
    construction_validation_overlap_pairs: partition.construction_validation_overlap_pairs,
    split_leaked_pairs: partition.split_leaked_pairs,
    exchangeability_violated_pairs: exchangeability.exchangeability_violated_pairs,
    deployment_shifted_pairs: exchangeability.deployment_shifted_pairs,
    independent_replication_failures: exchangeability.independent_replication_failures,
    stale_target_method_decisions: governance.stale_target_method_decisions,
    unsupported_interval_decisions: governance.unsupported_interval_decisions
  };
}
function governancePayload(world) {
  const approved = projectWorld(world);
  return { target_event:approved.target_event, estimand_scope:approved.estimand_scope, method_identity:approved.method_identity, data_partition:approved.data_partition, exchangeability_deployment:approved.exchangeability_deployment, governance:approved.governance };
}
function fixtureSnapshot(fixture) { return sha256(fixture); }

export function validatePreferenceLinkageTargetConstructionExchangeabilityFixture(fixture) {
  const errors = [];
  requireExactKeys(fixture, EXPECTED_FIXTURE_KEYS, 'fixture', errors);
  if (fixture?.schema_version !== PREFERENCE_LINKAGE_TARGET_CONSTRUCTION_EXCHANGEABILITY_FIXTURE_SCHEMA_VERSION) errors.push('fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-linkage-target-method-out-of-sample-status-different-assurance-states-v1') errors.push('fixture identity mismatch');
  if (fixture?.issue !== 1000 || fixture?.parent_program_issue !== 594) errors.push('fixture issue custody mismatch');
  if (!isoDate(fixture?.captured_at)) errors.push('fixture captured_at must be an exact ISO date');
  if (fixture?.status !== 'synthetic_control' || fixture?.graph_effect !== 'none') errors.push('fixture status or graph effect mismatch');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'fixture thesis evidence', errors);
  if (stable(fixture?.baseline) !== stable(EXPECTED_BASELINE)) errors.push('fixture frozen public surface mismatch');
  if (stable(fixture?.interpretation_contract) !== stable(EXPECTED_INTERPRETATION_CONTRACT)) errors.push('fixture interpretation contract mismatch');
  if (!sameMembers(fixture?.required_refusal_rules, REQUIRED_LINKAGE_TARGET_METHOD_EXCHANGEABILITY_REFUSAL_RULES) || array(fixture?.required_refusal_rules).length !== REQUIRED_LINKAGE_TARGET_METHOD_EXCHANGEABILITY_REFUSAL_RULES.length) errors.push('fixture refusal-rule ledger mismatch');
  for (const key of LINKAGE_TARGET_METHOD_EXCHANGEABILITY_FALSE_CLASSIFICATIONS) requireFalse(fixture?.expected_classification?.[key], `fixture classification.${key}`, errors);
  if (fixture?.expected_classification?.[COMPLETE_LINKAGE_TARGET_METHOD_EXCHANGEABILITY_CLASSIFICATION] !== true) errors.push('fixture complete assurance classification missing');
  const expectedClassificationKeys = [...LINKAGE_TARGET_METHOD_EXCHANGEABILITY_FALSE_CLASSIFICATIONS, COMPLETE_LINKAGE_TARGET_METHOD_EXCHANGEABILITY_CLASSIFICATION];
  if (!sameMembers(Object.keys(object(fixture?.expected_classification)), expectedClassificationKeys) || Object.keys(object(fixture?.expected_classification)).length !== expectedClassificationKeys.length) errors.push('fixture classification key ledger mismatch');
  const worlds = array(fixture?.worlds);
  if (worlds.length !== 8 || stable(worlds.map(world => world?.world_id)) !== stable(EXPECTED_WORLD_IDS)) errors.push('fixture must contain the eight exact ordered worlds');
  let complete = 0;
  const aggregate = Object.fromEntries(BURDEN_KEYS.map(key => [key, 0]));
  for (const world of worlds) {
    const id = text(world?.world_id);
    requireExactKeys(world, EXPECTED_WORLD_KEYS, `world ${id}`, errors);
    requireExactKeys(world?.target_event, EXPECTED_TARGET_EVENT_KEYS, `world ${id} target_event`, errors);
    requireExactKeys(world?.estimand_scope, EXPECTED_ESTIMAND_SCOPE_KEYS, `world ${id} estimand_scope`, errors);
    requireExactKeys(world?.method_identity, EXPECTED_METHOD_IDENTITY_KEYS, `world ${id} method_identity`, errors);
    requireExactKeys(world?.data_partition, EXPECTED_DATA_PARTITION_KEYS, `world ${id} data_partition`, errors);
    requireExactKeys(world?.exchangeability_deployment, EXPECTED_EXCHANGEABILITY_DEPLOYMENT_KEYS, `world ${id} exchangeability_deployment`, errors);
    requireExactKeys(world?.governance, EXPECTED_GOVERNANCE_KEYS, `world ${id} governance`, errors);
    requireExactKeys(world?.expected_flags, EXPECTED_WORLD_FLAG_KEYS, `world ${id} expected_flags`, errors);
    if (!text(world?.description)) errors.push(`world ${id} description is required`);
    if (world?.expected_mechanism !== EXPECTED_MECHANISMS[id]) errors.push(`world ${id} mechanism mismatch`);
    if (sha256(projectWorld(world)) !== EXPECTED_WORLD_SNAPSHOT_SHA256[id]) errors.push(`world ${id} snapshot mismatch`);
    const observedFlags = classifyWorld(world);
    if (stable(world?.expected_flags) !== stable(observedFlags)) errors.push(`world ${id} expected flags mismatch`);
    if (observedFlags.complete_linkage_interval_target_method_exchangeability_assurance) complete += 1;
    if (world?.governance?.binding_public_authority !== false) errors.push(`world ${id} binding authority must remain false`);
    const observedBurden = numericBurden(world);
    const expectedBurden = EXPECTED_WORLD_BURDENS[id];
    if (!expectedBurden || stable(observedBurden) !== stable(expectedBurden)) errors.push(`world ${id} burden-state mismatch`);
    for (const [key, value] of Object.entries(observedBurden)) {
      if (!nonnegative(value)) errors.push(`world ${id} ${key} must be a nonnegative integer`);
      else aggregate[key] += value;
    }
  }
  if (complete !== 1) errors.push('fixture must preserve exactly one complete target/method/exchangeability world');
  for (const [key, expected] of Object.entries(EXPECTED_LINKAGE_TARGET_METHOD_EXCHANGEABILITY_METRICS)) {
    if (key in aggregate && aggregate[key] !== expected) errors.push(`fixture aggregate mismatch: ${key}`);
  }
  return errors;
}

function custodyChain(fixture, compiledWorlds, metrics, classification) {
  const events = []; let previous = null;
  const push = event => { const sealed = seal(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  push({ event_id:`${fixture.fixture_id}:publication`, event_type:'frozen_public_target_method_surface_observed', evidence_class:'synthetic_publication_surface', authority:'pc46_fixture', source_event_ids:[], payload:{ public_surface:fixture.baseline, public_signature_sha256:sha256(fixture.baseline) } });
  push({ event_id:`${fixture.fixture_id}:target`, event_type:'target_event_and_estimand_states_sealed', evidence_class:'synthetic_control_state', authority:'pc46_compiler', source_event_ids:[`${fixture.fixture_id}:publication`], payload:{ worlds:compiledWorlds.map(world=>({world_id:world.world_id,target_event:world.target_event,estimand_scope:world.estimand_scope})) } });
  push({ event_id:`${fixture.fixture_id}:method`, event_type:'method_and_partition_states_sealed', evidence_class:'synthetic_control_state', authority:'pc46_compiler', source_event_ids:[`${fixture.fixture_id}:target`], payload:{ worlds:compiledWorlds.map(world=>({world_id:world.world_id,method_identity:world.method_identity,data_partition:world.data_partition})) } });
  push({ event_id:`${fixture.fixture_id}:exchangeability`, event_type:'exchangeability_and_deployment_states_sealed', evidence_class:'synthetic_control_state', authority:'pc46_compiler', source_event_ids:[`${fixture.fixture_id}:method`], payload:{ worlds:compiledWorlds.map(world=>({world_id:world.world_id,exchangeability_deployment:world.exchangeability_deployment})) } });
  push({ event_id:`${fixture.fixture_id}:metrics`, event_type:'bounded_target_method_burdens_sealed', evidence_class:'synthetic_aggregate', authority:'pc46_compiler', source_event_ids:[`${fixture.fixture_id}:exchangeability`], payload:{ metrics } });
  push({ event_id:`${fixture.fixture_id}:interpretation`, event_type:'interpretation_boundary_sealed', evidence_class:'candidate_inference', authority:'pc46_analyst', source_event_ids:[`${fixture.fixture_id}:metrics`], payload:{ classification, interpretation_contract:EXPECTED_INTERPRETATION_CONTRACT, graph_effect:'none', real_world_evidence_state:'none' } });
  return events;
}

export function compilePreferenceLinkageTargetConstructionExchangeabilityFixture(fixture) {
  const errors = validatePreferenceLinkageTargetConstructionExchangeabilityFixture(fixture);
  if (errors.length) throw new Error(`invalid PC-46 fixture:\n- ${errors.join('\n- ')}`);
  const publicSignature = sha256(fixture.baseline);
  const compiledWorlds = fixture.worlds.map(sourceWorld => {
    const world = projectWorld(sourceWorld);
    return {
      ...canonical(world),
      public_surface: canonical(fixture.baseline),
      public_signature_sha256: publicSignature,
      target_method_governance_signature_sha256: sha256(governancePayload(world)),
      observed_flags: classifyWorld(world),
      burdens: numericBurden(world)
    };
  });
  const metrics = {
    worlds: compiledWorlds.length,
    public_target_method_signatures: unique(compiledWorlds.map(world=>world.public_signature_sha256)).length,
    target_method_governance_signatures: unique(compiledWorlds.map(world=>world.target_method_governance_signature_sha256)).length,
    complete_target_method_exchangeability_assurance_worlds: compiledWorlds.filter(world=>world.observed_flags.complete_linkage_interval_target_method_exchangeability_assurance).length,
    ...Object.fromEntries(BURDEN_KEYS.map(key => [key, compiledWorlds.reduce((sum, world) => sum + world.burdens[key], 0)])),
    binding_public_authority_worlds: compiledWorlds.filter(world=>world.governance.binding_public_authority===true).length
  };
  const classification = { ...fixture.expected_classification };
  const custody = custodyChain(fixture, compiledWorlds, metrics, classification);
  return {
    schema_version:PREFERENCE_LINKAGE_TARGET_CONSTRUCTION_EXCHANGEABILITY_BUILD_SCHEMA_VERSION,
    fixture_id:fixture.fixture_id,
    issue:fixture.issue,
    parent_program_issue:fixture.parent_program_issue,
    captured_at:fixture.captured_at,
    status:'synthetic_linkage_target_construction_exchangeability_control_compiled',
    graph_effect:'none',
    counts_toward_thesis_evidence:false,
    conclusion_generated:false,
    real_world_evidence_state:'none',
    source_fixture_sha256:fixtureSnapshot(fixture),
    required_refusal_rules:[...fixture.required_refusal_rules],
    baseline:canonical(fixture.baseline),
    worlds:compiledWorlds,
    metrics,
    classification,
    custody_chain:custody,
    custody_chain_head_sha256:custody.at(-1).event_sha256,
    interpretation_contract:canonical(EXPECTED_INTERPRETATION_CONTRACT)
  };
}

function validateChain(compiled, errors) {
  const events=array(compiled?.custody_chain); if(events.length!==6) errors.push('compiled PC-46 custody chain must contain six events');
  let previous=null; const seen=new Set();
  for(const event of events){
    if(event?.previous_event_sha256!==previous) errors.push('compiled PC-46 custody previous hash mismatch');
    for(const sourceId of array(event?.source_event_ids)) if(!seen.has(sourceId)) errors.push('compiled PC-46 custody source missing');
    const unsigned={...event}; delete unsigned.event_sha256;
    if(event?.event_sha256!==sha256(unsigned)) errors.push('compiled PC-46 custody event hash mismatch');
    if(text(event?.event_id)) seen.add(event.event_id); previous=event?.event_sha256;
  }
  if(previous!==compiled?.custody_chain_head_sha256) errors.push('compiled PC-46 custody head mismatch');
}

export function validatePreferenceLinkageTargetConstructionExchangeabilityBuild(compiled, fixture) {
  const errors=[];
  requireExactKeys(compiled, EXPECTED_BUILD_KEYS, 'compiled PC-46', errors);
  if(compiled?.schema_version!==PREFERENCE_LINKAGE_TARGET_CONSTRUCTION_EXCHANGEABILITY_BUILD_SCHEMA_VERSION) errors.push('compiled PC-46 schema mismatch');
  if(compiled?.fixture_id!=='same-linkage-target-method-out-of-sample-status-different-assurance-states-v1' || compiled?.issue!==1000) errors.push('compiled PC-46 identity mismatch');
  if(!isoDate(compiled?.captured_at)) errors.push('compiled PC-46 captured_at must be an exact ISO date');
  if(compiled?.status!=='synthetic_linkage_target_construction_exchangeability_control_compiled' || compiled?.graph_effect!=='none' || compiled?.real_world_evidence_state!=='none') errors.push('compiled PC-46 status boundary mismatch');
  requireFalse(compiled?.counts_toward_thesis_evidence,'compiled PC-46 thesis evidence',errors);
  requireFalse(compiled?.conclusion_generated,'compiled PC-46 conclusion',errors);
  if(!fixture) errors.push('compiled PC-46 fixture source is required');
  if(!/^[0-9a-f]{64}$/.test(text(compiled?.source_fixture_sha256))) errors.push('compiled PC-46 source hash invalid');
  if(fixture && compiled?.source_fixture_sha256!==fixtureSnapshot(fixture)) errors.push('compiled PC-46 source fixture hash mismatch');
  if(stable(compiled?.baseline)!==stable(EXPECTED_BASELINE)) errors.push('compiled PC-46 baseline mismatch');
  if(stable(compiled?.interpretation_contract)!==stable(EXPECTED_INTERPRETATION_CONTRACT)) errors.push('compiled PC-46 interpretation contract mismatch');
  if(!sameMembers(compiled?.required_refusal_rules,REQUIRED_LINKAGE_TARGET_METHOD_EXCHANGEABILITY_REFUSAL_RULES) || array(compiled?.required_refusal_rules).length!==REQUIRED_LINKAGE_TARGET_METHOD_EXCHANGEABILITY_REFUSAL_RULES.length) errors.push('compiled PC-46 refusal ledger mismatch');
  requireExactKeys(compiled?.metrics, Object.keys(EXPECTED_LINKAGE_TARGET_METHOD_EXCHANGEABILITY_METRICS), 'compiled PC-46 metrics', errors);
  const expectedClassificationKeys = [...LINKAGE_TARGET_METHOD_EXCHANGEABILITY_FALSE_CLASSIFICATIONS, COMPLETE_LINKAGE_TARGET_METHOD_EXCHANGEABILITY_CLASSIFICATION];
  requireExactKeys(compiled?.classification, expectedClassificationKeys, 'compiled PC-46 classification', errors);
  const worlds=array(compiled?.worlds);
  if(worlds.length!==8 || stable(worlds.map(world=>world?.world_id))!==stable(EXPECTED_WORLD_IDS)) errors.push('compiled PC-46 world ledger mismatch');
  const publicSignatures=unique(worlds.map(world=>world?.public_signature_sha256));
  const governanceSignatures=unique(worlds.map(world=>world?.target_method_governance_signature_sha256));
  if(publicSignatures.length!==1) errors.push('compiled PC-46 must preserve one public signature');
  if(governanceSignatures.length!==8) errors.push('compiled PC-46 must preserve eight governance signatures');
  for(const world of worlds){
    const id=text(world?.world_id);
    requireExactKeys(world, EXPECTED_COMPILED_WORLD_KEYS, `compiled PC-46 world ${id}`, errors);
    requireExactKeys(world?.target_event, EXPECTED_TARGET_EVENT_KEYS, `compiled PC-46 world ${id} target_event`, errors);
    requireExactKeys(world?.estimand_scope, EXPECTED_ESTIMAND_SCOPE_KEYS, `compiled PC-46 world ${id} estimand_scope`, errors);
    requireExactKeys(world?.method_identity, EXPECTED_METHOD_IDENTITY_KEYS, `compiled PC-46 world ${id} method_identity`, errors);
    requireExactKeys(world?.data_partition, EXPECTED_DATA_PARTITION_KEYS, `compiled PC-46 world ${id} data_partition`, errors);
    requireExactKeys(world?.exchangeability_deployment, EXPECTED_EXCHANGEABILITY_DEPLOYMENT_KEYS, `compiled PC-46 world ${id} exchangeability_deployment`, errors);
    requireExactKeys(world?.governance, EXPECTED_GOVERNANCE_KEYS, `compiled PC-46 world ${id} governance`, errors);
    requireExactKeys(world?.expected_flags, EXPECTED_WORLD_FLAG_KEYS, `compiled PC-46 world ${id} expected_flags`, errors);
    requireExactKeys(world?.observed_flags, EXPECTED_WORLD_FLAG_KEYS, `compiled PC-46 world ${id} observed_flags`, errors);
    requireExactKeys(world?.burdens, BURDEN_KEYS, `compiled PC-46 world ${id} burdens`, errors);
    if(stable(world?.public_surface)!==stable(EXPECTED_BASELINE)) errors.push(`compiled PC-46 world ${id} public surface mismatch`);
    if(world?.public_signature_sha256!==sha256(EXPECTED_BASELINE)) errors.push(`compiled PC-46 world ${id} public signature mismatch`);
    if(world?.target_method_governance_signature_sha256!==sha256(governancePayload(world))) errors.push(`compiled PC-46 world ${id} governance signature mismatch`);
    if(world?.expected_mechanism!==EXPECTED_MECHANISMS[id]) errors.push(`compiled PC-46 world ${id} mechanism mismatch`);
    if(sha256(projectWorld(world))!==EXPECTED_WORLD_SNAPSHOT_SHA256[id]) errors.push(`compiled PC-46 world ${id} snapshot mismatch`);
    const expectedFlags=classifyWorld(world);
    if(stable(world?.expected_flags)!==stable(expectedFlags) || stable(world?.observed_flags)!==stable(expectedFlags)) errors.push(`compiled PC-46 world ${id} flag mismatch`);
    const observedBurden = numericBurden(world);
    const expectedBurden = EXPECTED_WORLD_BURDENS[id];
    if(stable(world?.burdens)!==stable(observedBurden)) errors.push(`compiled PC-46 world ${id} burden mismatch`);
    if(!expectedBurden || stable(observedBurden)!==stable(expectedBurden) || stable(world?.burdens)!==stable(expectedBurden)) errors.push(`compiled PC-46 world ${id} burden-state mismatch`);
    if(world?.governance?.binding_public_authority!==false) errors.push(`compiled PC-46 world ${id} binding authority must remain false`);
  }
  for(const [key,expected] of Object.entries(EXPECTED_LINKAGE_TARGET_METHOD_EXCHANGEABILITY_METRICS)) if(compiled?.metrics?.[key]!==expected) errors.push(`compiled PC-46 metric mismatch: ${key}`);
  for(const key of LINKAGE_TARGET_METHOD_EXCHANGEABILITY_FALSE_CLASSIFICATIONS) requireFalse(compiled?.classification?.[key],`compiled PC-46 classification.${key}`,errors);
  if(compiled?.classification?.[COMPLETE_LINKAGE_TARGET_METHOD_EXCHANGEABILITY_CLASSIFICATION]!==true) errors.push('compiled PC-46 complete assurance classification missing');
  validateChain(compiled,errors);
  if(fixture && !errors.length){
    const fixtureErrors=validatePreferenceLinkageTargetConstructionExchangeabilityFixture(fixture);
    if(fixtureErrors.length) errors.push(...fixtureErrors.map(error=>`compiled PC-46 fixture invalid: ${error}`));
    else {
      try { const expected=compilePreferenceLinkageTargetConstructionExchangeabilityFixture(fixture); if(stable(compiled)!==stable(expected)) errors.push('compiled PC-46 build does not deterministically reconstruct from fixture'); }
      catch(error){ errors.push(`compiled PC-46 reconstruction failed: ${error instanceof Error ? error.message : String(error)}`); }
    }
  }
  return errors;
}

export function renderPreferenceLinkageTargetConstructionExchangeabilityMarkdown(compiled) {
  const lines=['# Preference linkage target, construction, and exchangeability assurance','',`**Status:** ${compiled.status}`,'',`**Worlds:** ${compiled.metrics.worlds}`,'',`**Complete assurance worlds:** ${compiled.metrics.complete_target_method_exchangeability_assurance_worlds}`,'','## Frozen public surface',''];
  for(const [key,value] of Object.entries(compiled.baseline)) lines.push(`- ${key}: ${value}`);
  lines.push('','## Bounded synthetic burdens','');
  for(const [key,value] of Object.entries(compiled.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('','## Claim boundary','','This synthetic control does not establish a real predicted event, estimand, interval method, exchangeability condition, deployment applicability, empirical burden, causal effect, graph fact, allegation, or public-authority verdict.');
  return `${lines.join('\n')}\n`;
}
