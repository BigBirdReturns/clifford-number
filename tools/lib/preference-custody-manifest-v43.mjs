import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV42Build } from './preference-custody-manifest-v42.mjs';
import {
  COMPLETE_LINKAGE_INTERVAL_CONSTRUCTION_CLASSIFICATION,
  EXPECTED_LINKAGE_INTERVAL_CONSTRUCTION_METRICS,
  LINKAGE_INTERVAL_CONSTRUCTION_FALSE_CLASSIFICATIONS,
  REQUIRED_LINKAGE_INTERVAL_CONSTRUCTION_REFUSAL_RULES,
  validatePreferenceLinkageIntervalConstructionAssuranceBuild
} from './preference-linkage-interval-construction-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V43_SCHEMA_VERSION = 'preference-custody-control-manifest-v43@1';
export const PREFERENCE_CUSTODY_MANIFEST_V43_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v43-build@1';
const REQUIRED_CONTROL_IDS = Array.from({ length: 45 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`);
const RESOLVED_FRONTIER = 'linkage_uncertainty_interval_construction_empirical_coverage_dependence_and_multiplicity_assurance';
const REQUIRED_SUCCESSORS = Object.freeze(["linkage_interval_target_estimand_construction_method_and_out_of_sample_exchangeability_assurance","linkage_interval_dependence_resampling_effective_sample_size_multiplicity_adaptive_selection_and_simultaneous_coverage_governance"]);
const V42_SOURCE_BUNDLE_SCHEMA_VERSION = 'preference-custody-v42-source-bundle@1';
const REQUIRED_IDENTIFICATION_REQUIREMENT = Object.freeze({"stage":"interval_target_construction_data_separation_dependence_resampling_multiplicity_empirical_coverage_and_lineage","required_state":"target_event_estimand_interval_method_data_separation_independent_labels_dependence_resampling_unit_effective_sample_size_multiplicity_adaptive_selection_simultaneous_coverage_complete_empirical_denominator_correction_durability_and_authority_custody","refused_inference":"published_nominal_or_empirical_coverage_width_misses_simultaneous_status_or_public_linkage_interval_validated_status_does_not_identify_complete_current_out_of_sample_dependence_aware_multiplicity_adjusted_empirically_covered_correctable_or_authorized_evidence"});
const REQUIRED_REAL_CASE_REQUIREMENTS = Object.freeze(["linkage_interval_v43_target_event_and_prediction_object","linkage_interval_v43_estimand_population_and_unit_of_analysis","linkage_interval_v43_interval_type_support_tail_allocation_and_coverage_meaning","linkage_interval_v43_construction_method_identity_version_owner_and_approval","linkage_interval_v43_construction_code_configuration_repository_and_hash","linkage_interval_v43_random_seed_deterministic_replay_and_environment","linkage_interval_v43_score_probability_transform_and_calibration_lineage","linkage_interval_v43_residual_source_identity_scope_and_independence","linkage_interval_v43_bootstrap_design_resampling_unit_blocks_and_replications","linkage_interval_v43_conformal_design_nonconformity_score_split_and_guarantee","linkage_interval_v43_posterior_predictive_model_prior_likelihood_and_diagnostics","linkage_interval_v43_cross_fitting_fold_identity_assignment_and_leakage_audit","linkage_interval_v43_exchangeability_assumptions_tests_and_failure_state","linkage_interval_v43_distribution_shift_scope_bounds_and_deployment_applicability","linkage_interval_v43_training_data_identity_scope_lineage_and_hash","linkage_interval_v43_tuning_data_identity_scope_lineage_and_hash","linkage_interval_v43_construction_data_identity_scope_lineage_and_hash","linkage_interval_v43_calibration_data_identity_scope_lineage_and_hash","linkage_interval_v43_validation_data_identity_scope_lineage_and_hash","linkage_interval_v43_holdout_data_identity_scope_lineage_and_hash","linkage_interval_v43_deployment_data_identity_scope_lineage_and_hash","linkage_interval_v43_monitoring_data_identity_scope_lineage_and_hash","linkage_interval_v43_cross_dataset_overlap_leakage_derivation_and_sampling_audit","linkage_interval_v43_independent_label_owner_timing_blinding_and_hash","linkage_interval_v43_entity_split_block_assignment_and_cross_split_audit","linkage_interval_v43_source_split_block_assignment_and_cross_split_audit","linkage_interval_v43_household_cluster_and_repeated_observation_dependence","linkage_interval_v43_geography_language_identifier_quality_and_time_dependence","linkage_interval_v43_graph_component_network_and_longitudinal_trajectory_dependence","linkage_interval_v43_covariance_model_identity_fit_diagnostics_and_sensitivity","linkage_interval_v43_resampling_unit_validity_and_alternate_unit_sensitivity","linkage_interval_v43_effective_sample_size_method_estimate_and_uncertainty","linkage_interval_v43_dependence_correction_and_residual_dependence_audit","linkage_interval_v43_multiplicity_family_hypotheses_and_complete_denominator","linkage_interval_v43_model_method_and_hyperparameter_search_family","linkage_interval_v43_threshold_subgroup_source_and_monitoring_window_family","linkage_interval_v43_coverage_level_tail_allocation_and_interval_family","linkage_interval_v43_repeated_looks_alpha_spending_and_monitoring_schedule","linkage_interval_v43_optional_stopping_rule_execution_and_correction","linkage_interval_v43_adaptive_selection_winners_curse_and_post_selection_correction","linkage_interval_v43_simultaneous_coverage_method_adjusted_level_and_receipt","linkage_interval_v43_empirical_coverage_design_independent_labels_and_target_population","linkage_interval_v43_known_match_known_nonmatch_and_adjudication_inventory","linkage_interval_v43_hard_negative_definition_sampling_and_complete_inventory","linkage_interval_v43_unlabelled_excluded_ineligible_and_missing_pair_inventory","linkage_interval_v43_sampling_frame_weights_inclusion_probabilities_and_nonresponse","linkage_interval_v43_confidence_bounds_power_precision_and_uncertainty","linkage_interval_v43_width_distribution_interval_misses_and_root_cause_audit","linkage_interval_v43_subgroup_source_geography_language_and_time_specific_coverage","linkage_interval_v43_weak_source_identifier_quality_missingness_and_tail_coverage","linkage_interval_v43_negative_controls_falsification_stress_and_alternate_methods","linkage_interval_v43_feature_model_label_interval_source_population_and_workflow_lineage","linkage_interval_v43_correction_certificate_withdrawal_republication_and_durability","linkage_interval_v43_public_claim_basis_limitations_authority_and_hash_linked_chain"]);
const REQUIRED_PROHIBITED_INFERENCES = Object.freeze(["Do not treat floor v43 or PC-45 as evidence that any named person organization institution platform network or source system has a valid interval.","Do not infer empirical target-population coverage from one nominal coverage level.","Do not infer out-of-sample assurance from published empirical coverage when construction calibration tuning or validation overlap.","Do not treat score residuals or heuristic margins as predictive intervals without a defined target event estimand and coverage meaning.","Do not treat random pair splitting as independence across entities sources households clusters graph components or time.","Do not treat pair-level bootstrap or resampling as valid when the dependence unit is larger than a pair.","Do not infer effective sample size from the reported pair count under unresolved dependence.","Do not infer simultaneous coverage across selected models methods thresholds subgroups sources or windows from one nominal level.","Do not treat the best observed interval method as predeclared when methods were adaptively searched.","Do not treat repeated looks without correction as one fixed validation design.","Do not treat optional stopping as predeclared validation.","Do not infer target-population coverage from coverage measured only on labelled or easy pairs.","Do not treat omission of hard negatives unlabelled pairs weak sources missingness or excluded cases as denominator preservation.","Do not infer subgroup source geography language identifier-quality missingness or temporal coverage from aggregate coverage.","Do not treat one conformal bootstrap posterior or predictive result as shift-robust deployment coverage without current assumptions and tests.","Do not treat independent labels as complete when label ownership timing blindness sampling or adjudication is unresolved.","Do not infer current assurance from historical interval evidence after model feature label source population workflow policy or release succession.","Do not infer monitoring recalibration rollback or certificate-withdrawal assurance from interval construction alone.","Do not infer threshold abstention ambiguity adjudication or error-monitoring assurance from interval coverage alone.","Do not infer coercion manipulation discrimination breach misconduct coordination common purpose or intent from interval-assurance failure.","Do not infer public authorization from target construction dependence resampling multiplicity empirical coverage correction or lineage.","Do not treat synthetic counts as real-world prevalence error burden welfare trajectory or causal effect estimates.","Do not treat the forty-five-control floor as exhaustive of every legal economic constitutional security social network market or performative failure mode."]);
const REQUIRED_INTERPRETATION_CONTRACT = Object.freeze({"contract_id":"preference-custody-control-manifest-v43@1","what_this_is":"A compositional successor floor preserving the qualified forty-four-control v42 base and adding PC-45 interval-target construction data separation dependence resampling multiplicity adaptive selection empirical denominator lineage and authority equifinality.","what_this_is_not":"A real identity map interval empirical coverage rate target-population burden subgroup burden causal effect longitudinal history named-actor allegation graph fact or public-authority verdict.","copy_ready_caveat":"Preference Custody floor v43 composes the qualified v42 controls with PC-45. It separates one complete-looking linkage-interval validation publication from target semantics, out-of-sample construction, independent data and labels, dependence-aware splitting and resampling, effective sample size, multiplicity and adaptive-selection correction, simultaneous coverage, complete empirical denominators, current lineage, correction, durability, and authority custody while requiring real cases to preserve the complete interval-assurance chain."});

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const sorted = values => [...values].sort((left, right) => String(left).localeCompare(String(right)));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const stable = value => JSON.stringify(canonical(value));
const sha256 = value => createHash('sha256').update(stable(value)).digest('hex');
const sameMembers = (left, right) => stable(sorted(unique(left))) === stable(sorted(unique(right)));
const requireFalse = (value, label, errors) => { if (value !== false) errors.push(`${label} must remain false`); };
function seal(event, previous) { const unsigned = { ...canonical(event), previous_event_sha256: previous }; return { ...unsigned, event_sha256: sha256(unsigned) }; }

function custodyChain(manifest, base, control, openFrontiers, requirements) {
  const events = []; let previous = null;
  const push = event => { const sealed = seal(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  push({ event_id:`${manifest.manifest_id}:base`, event_type:'qualified_v42_floor_snapshot', evidence_class:'compiled_synthetic_control_floor', authority:'preference_custody_v42_compiler', source_event_ids:[], payload:{ manifest_id:base.manifest_id, schema_version:base.schema_version, control_count:base.control_count, snapshot_sha256:sha256(base) } });
  push({ event_id:`${manifest.manifest_id}:pc45`, event_type:'pc45_linkage_interval_construction_assurance_control_admitted', evidence_class:'compiled_synthetic_control', authority:'linkage_interval_construction_compiler', source_event_ids:[`${manifest.manifest_id}:base`], payload:{ control, snapshot_sha256:sha256(control) } });
  push({ event_id:`${manifest.manifest_id}:frontier`, event_type:'linkage_interval_construction_frontier_transition_sealed', evidence_class:'laboratory_frontier_contract', authority:'preference_custody_v43_compiler', source_event_ids:[`${manifest.manifest_id}:pc45`], payload:{ transition:manifest.frontier_transition, open_frontiers:openFrontiers } });
  push({ event_id:`${manifest.manifest_id}:promotion`, event_type:'linkage_interval_construction_real_case_promotion_boundary_sealed', evidence_class:'laboratory_promotion_contract', authority:'preference_custody_v43_compiler', source_event_ids:[`${manifest.manifest_id}:frontier`], payload:{ identification_requirement:manifest.identification_requirement, real_case_requires:requirements } });
  push({ event_id:`${manifest.manifest_id}:interpretation`, event_type:'interpretation_sealed', evidence_class:'candidate_inference', authority:'preference_custody_v43_analyst', source_event_ids:[`${manifest.manifest_id}:promotion`], payload:{ allowed_interpretation:'qualified forty-five-control synthetic Preference Custody floor', graph_effect:'none', real_world_evidence_state:'none' } });
  return events;
}

export function validatePreferenceCustodyManifestV43(manifest) {
  const errors = [];
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V43_SCHEMA_VERSION) errors.push('v43 schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v43') errors.push('v43 manifest identity mismatch');
  if (manifest?.issue !== 594 || manifest?.control_issue !== 978) errors.push('v43 issue custody mismatch');
  if (manifest?.status !== 'synthetic_control_floor_extension' || manifest?.graph_effect !== 'none') errors.push('v43 status or graph effect mismatch');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v43 thesis evidence', errors);
  const base = object(manifest?.base_floor);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v42' || base.source_manifest_path !== 'data/research/preference-custody/control-manifest-v42.json' || base.expected_build_schema !== 'preference-custody-control-manifest-v42-build@1' || base.expected_control_count !== 44) errors.push('v43 base floor contract mismatch');
  const extension = object(manifest?.extension_control);
  if (extension.control_id !== 'PC-45' || extension.fixture_id !== 'same-linkage-interval-validated-status-different-construction-states-v1' || extension.failure_class !== 'linkage_interval_target_construction_out_of_sample_design_dependence_resampling_multiplicity_adaptive_selection_empirical_coverage_and_lineage_equifinality' || extension.source_fixture_path !== 'data/research/preference-custody/linkage-interval-construction-assurance.fixture.json' || extension.build_artifact_path !== 'build/research/preference-linkage-interval-construction-assurance.json' || extension.expected_build_schema !== 'preference-linkage-interval-construction-assurance-build@1') errors.push('v43 extension contract mismatch');
  if (!sameMembers(extension.required_refusal_rules, REQUIRED_LINKAGE_INTERVAL_CONSTRUCTION_REFUSAL_RULES) || array(extension.required_refusal_rules).length !== REQUIRED_LINKAGE_INTERVAL_CONSTRUCTION_REFUSAL_RULES.length) errors.push('v43 refusal-rule contract must match the exact PC-45 ledger');
  if (stable(manifest?.identification_requirement) !== stable(REQUIRED_IDENTIFICATION_REQUIREMENT)) errors.push('v43 identification requirement contract mismatch');
  if (manifest?.frontier_transition?.resolved_base_frontier !== RESOLVED_FRONTIER) errors.push('v43 resolved frontier mismatch');
  if (!sameMembers(manifest?.frontier_transition?.successor_frontiers, REQUIRED_SUCCESSORS) || array(manifest?.frontier_transition?.successor_frontiers).length !== REQUIRED_SUCCESSORS.length) errors.push('v43 successor frontier mismatch');
  if (!sameMembers(manifest?.real_case_requirements_added, REQUIRED_REAL_CASE_REQUIREMENTS) || array(manifest?.real_case_requirements_added).length !== REQUIRED_REAL_CASE_REQUIREMENTS.length) errors.push('v43 real-case requirement ledger must match the exact PC-45 extension');
  for (const item of array(manifest?.real_case_requirements_added)) if (!/^[a-z0-9_]+$/.test(item)) errors.push(`invalid v43 requirement: ${item}`);
  if (stable(manifest?.prohibited_inferences) !== stable(REQUIRED_PROHIBITED_INFERENCES)) errors.push('v43 prohibited-inference ledger mismatch');
  if (stable(manifest?.interpretation_contract) !== stable(REQUIRED_INTERPRETATION_CONTRACT)) errors.push('v43 interpretation contract mismatch');
  return errors;
}

function v42SourceBundlePayload(baseSources) {
  return {
    schema_version: V42_SOURCE_BUNDLE_SCHEMA_VERSION,
    manifest: baseSources?.manifest,
    base_build: baseSources?.baseBuild,
    uncertainty_build: baseSources?.uncertaintyBuild,
    uncertainty_fixture: baseSources?.uncertaintyFixture,
    transitive_sources: baseSources?.baseSources
  };
}
function v42SourceBundleSha256(baseSources) { return sha256(v42SourceBundlePayload(baseSources)); }
function validateBaseSources(baseBuild, baseSources) {
  if (!baseSources) return ['v43 complete v42 source bundle is required'];
  const errors = [];
  for (const [value, label] of [[baseSources.manifest,'v42 manifest'],[baseSources.baseBuild,'v42 v41 base build'],[baseSources.uncertaintyBuild,'v42 PC-44 build'],[baseSources.uncertaintyFixture,'v42 PC-44 fixture'],[baseSources.baseSources,'v42 transitive sources']]) if (!value) errors.push(`v43 ${label} is required`);
  if (errors.length) return errors;
  return validatePreferenceCustodyManifestV42Build(baseBuild, baseSources.manifest, baseSources.baseBuild, baseSources.uncertaintyBuild, baseSources.uncertaintyFixture, baseSources.baseSources);
}

export function compilePreferenceCustodyManifestV43(manifest, baseBuild, intervalBuild, intervalFixture, baseSources) {
  const errors = validatePreferenceCustodyManifestV43(manifest); if (errors.length) throw new Error(`invalid v43 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validateBaseSources(baseBuild, baseSources); if (baseErrors.length) throw new Error(`invalid v42 base:\n- ${baseErrors.join('\n- ')}`);
  const intervalErrors = validatePreferenceLinkageIntervalConstructionAssuranceBuild(intervalBuild, intervalFixture); if (intervalErrors.length) throw new Error(`invalid PC-45 build:\n- ${intervalErrors.join('\n- ')}`);
  if (baseBuild.control_count !== 44 || baseBuild.manifest_id !== 'preference-custody-laboratory-floor-v42') throw new Error('v43 base identity mismatch');
  const baseOpen = unique(baseBuild.open_frontiers); if (!baseOpen.includes(RESOLVED_FRONTIER)) throw new Error('v43 base does not contain the resolved interval-construction frontier');
  const requiredRules = manifest.extension_control.required_refusal_rules;
  const control = { control_id:'PC-45', fixture_id:intervalBuild.fixture_id, failure_class:manifest.extension_control.failure_class, source_fixture_path:manifest.extension_control.source_fixture_path, build_artifact_path:manifest.extension_control.build_artifact_path, graph_effect:'none', counts_toward_thesis_evidence:false, conclusion_generated:false, real_world_effect_claimed:false, preference_change_present:false, manipulative_intent_inferable:false, required_refusal_rules:[...requiredRules], observed_refusal_rules:[...intervalBuild.required_refusal_rules], proof_summary:{...intervalBuild.metrics,...intervalBuild.classification} };
  const openFrontiers = unique([...baseOpen.filter(frontier => frontier !== RESOLVED_FRONTIER), ...manifest.frontier_transition.successor_frontiers]);
  const baseRequirements = unique(baseBuild.promotion_boundary.real_case_requires); const requirements = unique([...baseRequirements, ...manifest.real_case_requirements_added]);
  if (requirements.length - baseRequirements.length !== 54) throw new Error('v43 requirement extension is not exactly fifty-four');
  const controls = [...baseBuild.controls, control]; const custody = custodyChain(manifest, baseBuild, control, openFrontiers, requirements);
  return {
    schema_version:PREFERENCE_CUSTODY_MANIFEST_V43_BUILD_SCHEMA_VERSION,
    manifest_id:manifest.manifest_id,
    issue:manifest.issue,
    control_issue:manifest.control_issue,
    captured_at:manifest.captured_at,
    status:'laboratory_floor_v43_qualified',
    graph_effect:'none',
    counts_toward_thesis_evidence:false,
    conclusion_generated:false,
    real_world_evidence_state:'none',
    control_count:controls.length,
    controls,
    composition:{
      base_manifest_id:baseBuild.manifest_id,
      base_schema_version:baseBuild.schema_version,
      base_control_count:baseBuild.control_count,
      extension_control_id:'PC-45',
      manifest_snapshot_sha256:sha256(manifest),
      base_floor_snapshot_sha256:sha256(baseBuild),
      extension_snapshot_sha256:sha256(intervalBuild),
      v42_source_bundle_schema_version:V42_SOURCE_BUNDLE_SCHEMA_VERSION,
      v42_source_bundle_sha256:v42SourceBundleSha256(baseSources),
      base_controls_sha256:sha256(baseBuild.controls),
      base_promotion_requirements_sha256:sha256(baseRequirements),
      base_promotion_requirement_count:baseRequirements.length,
      added_promotion_requirement_count:requirements.length-baseRequirements.length,
      final_promotion_requirement_count:requirements.length,
      base_open_frontiers:[...baseOpen]
    },
    control_integrity:{
      base_floor_qualified:true,
      base_integrity_preserved:Object.values(baseBuild.control_integrity).every(Boolean),
      v42_complete_source_bundle_bound:true,
      all_graph_effect_none:controls.every(item=>item.graph_effect==='none'),
      no_thesis_evidence_consumption:controls.every(item=>item.counts_toward_thesis_evidence===false),
      no_real_world_conclusion:true,
      no_preference_change_claim:true,
      no_intent_inference:true,
      all_required_pc45_refusal_rules_present:requiredRules.every(rule=>intervalBuild.required_refusal_rules.includes(rule)),
      complete_linkage_interval_construction_assurance_path_preserved:intervalBuild.metrics.complete_linkage_interval_construction_assurance_worlds===1
    },
    identification_requirements:[...baseBuild.identification_requirements,manifest.identification_requirement],
    refusal_rule_union:unique([...baseBuild.refusal_rule_union,...intervalBuild.required_refusal_rules]),
    open_frontiers:openFrontiers,
    frontier_transition:manifest.frontier_transition,
    promotion_boundary:{...baseBuild.promotion_boundary,promotion_requirement_count:requirements.length,real_case_requires:requirements,laboratory_controls_are_real_world_evidence:false},
    custody_chain:custody,
    custody_chain_head_sha256:custody.at(-1).event_sha256,
    prohibited_inferences:[...baseBuild.prohibited_inferences,...manifest.prohibited_inferences],
    interpretation_contract:manifest.interpretation_contract
  };
}

function validateChain(compiled, errors) {
  const events=array(compiled?.custody_chain); if(events.length!==5) errors.push('compiled v43 custody chain must contain five events');
  let previous=null; const seen=new Set();
  for(const event of events){ if(event?.previous_event_sha256!==previous) errors.push('compiled v43 custody previous hash mismatch'); for(const sourceId of array(event?.source_event_ids)) if(!seen.has(sourceId)) errors.push('compiled v43 custody source missing'); const unsigned={...event}; delete unsigned.event_sha256; if(event?.event_sha256!==sha256(unsigned)) errors.push('compiled v43 custody event hash mismatch'); if(text(event?.event_id)) seen.add(event.event_id); previous=event?.event_sha256; }
  if(previous!==compiled?.custody_chain_head_sha256) errors.push('compiled v43 custody head mismatch');
}

export function validatePreferenceCustodyManifestV43Build(compiled, manifest, baseBuild, intervalBuild, intervalFixture, baseSources) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V43_BUILD_SCHEMA_VERSION) errors.push('compiled v43 schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v43' || compiled?.control_issue !== 978) errors.push('compiled v43 identity mismatch');
  if (compiled?.status !== 'laboratory_floor_v43_qualified' || compiled?.graph_effect !== 'none' || compiled?.real_world_evidence_state !== 'none') errors.push('compiled v43 status boundary mismatch');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v43 thesis evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v43 conclusion', errors);

  const controls = array(compiled?.controls);
  if (compiled?.control_count !== 45 || controls.length !== 45 || !sameMembers(controls.map(control => control?.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v43 must preserve forty-five exact controls');

  const composition = object(compiled?.composition);
  if (
    composition.base_manifest_id !== 'preference-custody-laboratory-floor-v42' ||
    composition.base_schema_version !== 'preference-custody-control-manifest-v42-build@1' ||
    composition.base_control_count !== 44 ||
    composition.extension_control_id !== 'PC-45' ||
    composition.v42_source_bundle_schema_version !== V42_SOURCE_BUNDLE_SCHEMA_VERSION
  ) errors.push('compiled v43 composition identity mismatch');
  if (composition.base_promotion_requirement_count !== 1677 || composition.added_promotion_requirement_count !== 54 || composition.final_promotion_requirement_count !== 1731) errors.push('compiled v43 promotion counts mismatch');
  for (const key of ['manifest_snapshot_sha256', 'base_floor_snapshot_sha256', 'extension_snapshot_sha256', 'v42_source_bundle_sha256', 'base_controls_sha256', 'base_promotion_requirements_sha256']) {
    if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v43 invalid hash: ${key}`);
  }

  if (!manifest) errors.push('compiled v43 manifest source is required');
  if (!baseBuild) errors.push('compiled v43 base source is required');
  if (!intervalBuild) errors.push('compiled v43 PC-45 source is required');
  if (!intervalFixture) errors.push('compiled v43 PC-45 fixture source is required');
  if (!baseSources) errors.push('compiled v43 complete v42 source bundle is required');

  if (baseBuild) {
    if (stable(controls.slice(0, 44)) !== stable(baseBuild.controls)) errors.push('compiled v43 preserved base controls mismatch');
    if (stable(composition.base_open_frontiers) !== stable(baseBuild.open_frontiers)) errors.push('compiled v43 base frontier snapshot mismatch');
    if (composition.base_controls_sha256 !== sha256(baseBuild.controls)) errors.push('compiled v43 base controls hash mismatch');
    const baseRequirements = unique(baseBuild?.promotion_boundary?.real_case_requires);
    if (composition.base_promotion_requirements_sha256 !== sha256(baseRequirements)) errors.push('compiled v43 base promotion requirements hash mismatch');
  }

  const pc45 = controls.at(-1);
  if (pc45?.control_id !== 'PC-45' || pc45?.fixture_id !== 'same-linkage-interval-validated-status-different-construction-states-v1') errors.push('compiled v43 PC-45 identity mismatch');
  if (intervalBuild && stable(pc45?.proof_summary) !== stable({ ...intervalBuild.metrics, ...intervalBuild.classification })) errors.push('compiled v43 PC-45 proof summary mismatch');

  if (!sameMembers(compiled?.frontier_transition?.successor_frontiers, REQUIRED_SUCCESSORS) || compiled?.frontier_transition?.resolved_base_frontier !== RESOLVED_FRONTIER) errors.push('compiled v43 frontier transition mismatch');
  if (array(compiled?.open_frontiers).includes(RESOLVED_FRONTIER)) errors.push('compiled v43 resolved frontier remains open');
  for (const successor of REQUIRED_SUCCESSORS) if (!array(compiled?.open_frontiers).includes(successor)) errors.push(`compiled v43 missing successor: ${successor}`);
  if (baseBuild) for (const frontier of array(baseBuild.open_frontiers).filter(item => item !== RESOLVED_FRONTIER)) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v43 lost base frontier: ${frontier}`);

  if (compiled?.promotion_boundary?.promotion_requirement_count !== 1731 || unique(compiled?.promotion_boundary?.real_case_requires).length !== 1731) errors.push('compiled v43 promotion boundary mismatch');
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v43 laboratory evidence', errors);

  if (manifest && baseBuild && intervalBuild) {
    const expectedIdentification = [...array(baseBuild.identification_requirements), manifest.identification_requirement];
    const expectedRefusalUnion = unique([...array(baseBuild.refusal_rule_union), ...array(intervalBuild.required_refusal_rules)]);
    const expectedProhibited = [...array(baseBuild.prohibited_inferences), ...array(manifest.prohibited_inferences)];
    if (stable(compiled?.identification_requirements) !== stable(expectedIdentification)) errors.push('compiled v43 identification ledger mismatch');
    if (stable(compiled?.refusal_rule_union) !== stable(expectedRefusalUnion)) errors.push('compiled v43 refusal-rule union mismatch');
    if (stable(compiled?.prohibited_inferences) !== stable(expectedProhibited)) errors.push('compiled v43 prohibited-inference ledger mismatch');
    if (stable(compiled?.interpretation_contract) !== stable(manifest.interpretation_contract)) errors.push('compiled v43 interpretation contract mismatch');
  }

  if (compiled?.control_integrity?.v42_complete_source_bundle_bound !== true) errors.push('compiled v43 v42 source-bundle integrity missing');
  for (const key of Object.keys(object(compiled?.control_integrity))) if (compiled.control_integrity[key] !== true) errors.push(`compiled v43 integrity flag false: ${key}`);

  if (pc45) {
    for (const [key, expected] of Object.entries(EXPECTED_LINKAGE_INTERVAL_CONSTRUCTION_METRICS)) if (pc45?.proof_summary?.[key] !== expected) errors.push(`compiled v43 PC-45 metric mismatch: ${key}`);
    for (const key of LINKAGE_INTERVAL_CONSTRUCTION_FALSE_CLASSIFICATIONS) requireFalse(pc45?.proof_summary?.[key], `compiled v43 PC-45 classification.${key}`, errors);
    if (pc45?.proof_summary?.[COMPLETE_LINKAGE_INTERVAL_CONSTRUCTION_CLASSIFICATION] !== true) errors.push('compiled v43 complete interval-construction path missing');
  }
  validateChain(compiled, errors);

  // Fast snapshot checks reject stale pairings before the expensive transitive reconstruction.
  if (manifest && composition.manifest_snapshot_sha256 !== sha256(manifest)) errors.push('compiled v43 manifest snapshot hash mismatch');
  if (baseBuild && composition.base_floor_snapshot_sha256 !== sha256(baseBuild)) errors.push('compiled v43 base floor snapshot hash mismatch');
  if (intervalBuild && composition.extension_snapshot_sha256 !== sha256(intervalBuild)) errors.push('compiled v43 extension snapshot hash mismatch');
  if (baseSources && composition.v42_source_bundle_sha256 !== v42SourceBundleSha256(baseSources)) errors.push('compiled v43 v42 source-bundle hash mismatch');

  // Only a structurally and cryptographically coherent candidate pays the full source-reconstruction cost.
  if (!errors.length && manifest && baseBuild && intervalBuild && intervalFixture && baseSources) {
    const manifestErrors = validatePreferenceCustodyManifestV43(manifest);
    const baseErrors = validateBaseSources(baseBuild, baseSources);
    const intervalErrors = validatePreferenceLinkageIntervalConstructionAssuranceBuild(intervalBuild, intervalFixture);
    if (manifestErrors.length) errors.push(...manifestErrors.map(error => `compiled v43 manifest source invalid: ${error}`));
    if (baseErrors.length) errors.push(...baseErrors.map(error => `compiled v43 base source invalid: ${error}`));
    if (intervalErrors.length) errors.push(...intervalErrors.map(error => `compiled v43 PC-45 source invalid: ${error}`));
    if (!manifestErrors.length && !baseErrors.length && !intervalErrors.length) {
      try {
        const expected = compilePreferenceCustodyManifestV43(manifest, baseBuild, intervalBuild, intervalFixture, baseSources);
        if (stable(compiled) !== stable(expected)) errors.push('compiled v43 build does not deterministically reconstruct from supplied sources');
      } catch (error) {
        errors.push(`compiled v43 source reconstruction failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return errors;
}

export function renderPreferenceCustodyManifestV43Markdown(compiled) {
  const lines=['# Preference Custody laboratory floor v43','',`**Status:** ${compiled.status}`,'',`**Controls:** ${compiled.control_count}`,'',`**Promotion requirements:** ${compiled.promotion_boundary.promotion_requirement_count}`,'','> Floor v43 preserves the qualified forty-four-control base and adds PC-45 linkage-interval target, construction, data separation, dependence, resampling, effective sample size, multiplicity, adaptive selection, simultaneous coverage, empirical denominator, correction, and lineage custody.','','## PC-45 proof summary',''];
  const control=compiled.controls.at(-1); for(const [key,value] of Object.entries(control.proof_summary)) lines.push(`- ${key}: ${value}`);
  lines.push('','## Claim boundary','','This is a synthetic compositional control floor, not a real identity map, interval, empirical coverage rate, target-population burden, causal conclusion, graph fact, or public-authority verdict.');
  return `${lines.join('\n')}\n`;
}
