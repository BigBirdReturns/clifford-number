import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV23Build } from './preference-custody-manifest-v23.mjs';
import { validatePreferenceCausalAssuranceBuild } from './preference-causal-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V24_SCHEMA_VERSION = 'preference-custody-control-manifest-v24@1';
export const PREFERENCE_CUSTODY_MANIFEST_V24_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v24-build@1';

const REQUIRED_CONTROL_IDS = [
  'PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10',
  'PC-11','PC-12','PC-13','PC-14','PC-15','PC-16','PC-17','PC-18','PC-19','PC-20',
  'PC-21','PC-22','PC-23','PC-24','PC-25','PC-26'
];
const REQUIRED_SUCCESSOR_FRONTIERS = [
  'interference_network_spillover_and_exposure_mapping_causal_governance',
  'adaptive_policy_selective_labels_off_policy_evaluation_and_experiment_succession_assurance'
];
const EXPECTED_PC26_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_causal_governance_signatures: 8,
  complete_causal_identification_worlds: 1,
  post_treatment_bias_worlds: 1,
  collider_selection_worlds: 1,
  interference_spillover_worlds: 1,
  historical_control_drift_worlds: 1,
  regression_to_mean_worlds: 1,
  adaptive_feedback_selective_label_worlds: 1,
  version_pooling_drift_worlds: 1,
  randomized_assignment_complete_worlds: 5,
  temporal_order_complete_worlds: 7,
  complete_followup_observed_worlds: 6,
  no_selection_bias_complete_worlds: 6,
  no_interference_complete_worlds: 7,
  concurrent_comparator_complete_worlds: 7,
  baseline_regression_control_complete_worlds: 7,
  adaptive_logging_complete_worlds: 7,
  current_experiment_lineage_complete_worlds: 7,
  independent_replication_complete_worlds: 8,
  published_effect_matches_reference_worlds: 1,
  same_public_causal_surface_worlds: 8,
  total_post_treatment_conditioned_count: 100,
  total_collider_conditioned_count: 40,
  total_control_exposed_count: 30,
  total_historical_calendar_offset_days: 365,
  total_regression_to_mean_count: 50,
  total_selective_label_count: 40,
  total_policy_feedback_count: 200,
  total_pooled_successor_decision_count: 60,
  total_imputed_outcome_count: 80,
  total_unsupported_causal_decisions: 700,
  binding_public_authority_worlds: 0
};
const EXPECTED_FALSE_PC26_CLASSIFICATIONS = [
  'score_outcome_association_identifies_causal_effect',
  'post_treatment_criterion_identifies_pre_treatment_outcome',
  'published_denominator_identifies_complete_observed_followup',
  'conditioned_observed_set_identifies_unselected_outcome_population',
  'nominal_control_group_identifies_unexposed_control_under_interference',
  'historical_control_identifies_concurrent_counterfactual',
  'extreme_baseline_improvement_identifies_treatment_effect',
  'adaptive_policy_agreement_identifies_unbiased_effect_without_exploration_logging',
  'observed_labels_identify_representative_outcomes_under_feedback',
  'pooled_estimate_identifies_current_validation_after_system_succession',
  'narrow_interval_low_p_value_identifies_valid_causal_identification',
  'replication_count_identifies_independent_replication_of_same_estimand_design',
  'public_causally_validated_status_identifies_temporally_ordered_unselected_interference_aware_current_correctable_authorized_evidence',
  'causal_design_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent',
  'binding_public_authority_supported'
];
const EPSILON = 1e-12;

function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function array(value) { return Array.isArray(value) ? value : []; }
function text(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set(array(values).map(value => text(value)).filter(Boolean))]; }
function sorted(values) { return [...values].sort((left, right) => String(left).localeCompare(String(right))); }
function sameMembers(left, right) { return JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right))); }
function close(left, right, tolerance = EPSILON) { return Math.abs(Number(left) - Number(right)) <= tolerance; }
function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  return value;
}
function sha256(value) { return createHash('sha256').update(JSON.stringify(canonicalValue(value))).digest('hex'); }
function requireFalse(value, label, errors) { if (value !== false) errors.push(`${label} must remain false`); }
function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function summarizePc26(control, build) {
  return {
    control_id: control.control_id,
    fixture_id: control.fixture_id,
    failure_class: control.failure_class,
    source_fixture_path: control.source_fixture_path,
    build_artifact_path: control.build_artifact_path,
    build_schema_version: build.schema_version,
    graph_effect: build.graph_effect,
    counts_toward_thesis_evidence: build.counts_toward_thesis_evidence,
    conclusion_generated: build.conclusion_generated,
    real_world_effect_claimed: build.classification?.real_world_effect_claimed,
    preference_change_present: build.classification?.preference_change_present,
    manipulative_intent_inferable: build.classification?.manipulative_intent_inferable,
    required_refusal_rules: control.required_refusal_rules,
    observed_refusal_rules: array(build.refusal_rules),
    proof_summary: {
      ...Object.fromEntries(Object.keys(EXPECTED_PC26_METRICS).map(key => [key, build.metrics?.[key]])),
      ...Object.fromEntries(EXPECTED_FALSE_PC26_CLASSIFICATIONS.map(key => [key, build.classification?.[key]])),
      complete_causal_identification_supported_in_at_least_one_world: build.classification?.complete_causal_identification_supported_in_at_least_one_world
    }
  };
}

function buildV24Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${manifest.manifest_id}:base`,
    event_type: 'qualified_v23_floor_snapshot',
    evidence_class: 'compiled_synthetic_control_floor',
    authority: 'preference_custody_v23_compiler',
    source_event_ids: [],
    payload: {
      manifest_id: baseBuild.manifest_id,
      schema_version: baseBuild.schema_version,
      control_count: baseBuild.control_count,
      snapshot_sha256: sha256(baseBuild)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:pc26`,
    event_type: 'pc26_assignment_temporal_selection_interference_feedback_and_lineage_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'causal_assurance_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: { control: extensionControl, snapshot_sha256: sha256(extensionControl) }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'causal_assurance_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v24_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc26`],
    payload: { transition: manifest.frontier_transition, open_frontiers: openFrontiers }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'causal_assurance_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v24_compiler',
    source_event_ids: [`${manifest.manifest_id}:frontier`],
    payload: { identification_requirement: manifest.identification_requirement, real_case_requires: promotionRequirements }
  });
  push({
    event_id: `${manifest.manifest_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'preference_custody_v24_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: {
      allowed_interpretation: 'qualified twenty-six-control synthetic Preference Custody floor',
      refused_promotions: [
        'laboratory_control_as_named_causal_finding',
        'association_as_causal_effect',
        'post_treatment_outcome_as_pre_treatment_criterion',
        'published_denominator_as_complete_followup',
        'selected_labels_as_population_outcomes',
        'nominal_control_as_unexposed_control',
        'historical_control_as_concurrent_counterfactual',
        'regression_to_mean_as_treatment_effect',
        'adaptive_policy_agreement_as_unbiased_validation',
        'pooled_versions_as_current_validation',
        'precision_as_identification',
        'causal_status_as_public_authorization'
      ]
    }
  });
  return events;
}

export function validatePreferenceCustodyManifestV24(manifest) {
  const errors = [];
  const base = object(manifest?.base_floor);
  const control = object(manifest?.extension_control);
  const requirement = object(manifest?.identification_requirement);
  const transition = object(manifest?.frontier_transition);
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V24_SCHEMA_VERSION) errors.push('preference custody v24 manifest schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v24') errors.push('manifest_id must remain preference-custody-laboratory-floor-v24');
  if (manifest?.control_issue !== 740) errors.push('v24 control issue must remain 740');
  if (manifest?.status !== 'synthetic_control_floor_extension') errors.push('v24 manifest status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('v24 manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v24 manifest counts_toward_thesis_evidence', errors);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v23') errors.push('v24 base manifest must remain floor v23');
  if (!text(base.source_manifest_path) || base.expected_build_schema !== 'preference-custody-control-manifest-v23-build@1' || base.expected_control_count !== 25) errors.push('v24 base floor contract is incomplete');
  if (control.control_id !== 'PC-26') errors.push('v24 extension control must remain PC-26');
  if (control.fixture_id !== 'same-causal-validation-status-different-identification-paths-v1') errors.push('PC-26 fixture identity mismatch');
  if (control.failure_class !== 'criterion_temporal_causality_feedback_post_treatment_bias_and_interference_equifinality') errors.push('PC-26 failure class mismatch');
  if (!text(control.source_fixture_path) || !text(control.build_artifact_path) || control.expected_build_schema !== 'preference-causal-assurance-build@1') errors.push('PC-26 source or build contract is incomplete');
  if (unique(control.required_refusal_rules).length < 15) errors.push('PC-26 refusal-rule contract is incomplete');
  if (requirement.stage !== 'criterion_temporal_causality_feedback_post_treatment_bias_and_interference') errors.push('v24 identification stage mismatch');
  if (!text(requirement.required_state) || !text(requirement.refused_inference)) errors.push('v24 causal-assurance identification requirement is incomplete');
  if (transition.resolved_base_frontier !== 'criterion_temporal_causality_feedback_and_post_treatment_bias_assurance') errors.push('v24 resolved frontier mismatch');
  if (!sameMembers(transition.successor_frontiers, REQUIRED_SUCCESSOR_FRONTIERS)) errors.push('v24 successor frontiers are incomplete');
  if (unique(manifest?.real_case_requirements_added).length < 60) errors.push('v24 causal-assurance real-case requirements are incomplete');
  if (array(manifest?.real_case_requirements_added).some(item => !/^[a-z0-9_]+$/.test(text(item)))) errors.push('v24 causal-assurance real-case requirements must be lowercase underscore-delimited machine identifiers');
  if (unique(manifest?.prohibited_inferences).length < 13) errors.push('v24 prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id) || !text(manifest?.interpretation_contract?.what_this_is) || !text(manifest?.interpretation_contract?.what_this_is_not) || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v24 interpretation contract is incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV24(manifest, baseBuild, causalBuild) {
  const errors = validatePreferenceCustodyManifestV24(manifest);
  if (errors.length) throw new Error(`invalid preference custody v24 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV23Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v23 base build:\n- ${baseErrors.join('\n- ')}`);
  const causalErrors = validatePreferenceCausalAssuranceBuild(causalBuild);
  if (causalErrors.length) throw new Error(`invalid PC-26 build:\n- ${causalErrors.join('\n- ')}`);
  if (baseBuild.manifest_id !== manifest.base_floor.manifest_id) throw new Error('v24 base manifest identity mismatch');
  if (baseBuild.schema_version !== manifest.base_floor.expected_build_schema) throw new Error('v24 base build schema mismatch');
  if (baseBuild.control_count !== manifest.base_floor.expected_control_count) throw new Error('v24 base control count mismatch');
  if (causalBuild.fixture_id !== manifest.extension_control.fixture_id) throw new Error('v24 PC-26 fixture identity mismatch');
  if (causalBuild.schema_version !== manifest.extension_control.expected_build_schema) throw new Error('v24 PC-26 build schema mismatch');

  const extensionControl = summarizePc26(manifest.extension_control, causalBuild);
  const allRequiredRulesPresent = extensionControl.required_refusal_rules.every(rule => extensionControl.observed_refusal_rules.includes(rule));
  const controls = [...baseBuild.controls, extensionControl];
  const openFrontiers = unique([
    ...baseBuild.open_frontiers.filter(frontier => frontier !== manifest.frontier_transition.resolved_base_frontier),
    ...manifest.frontier_transition.successor_frontiers
  ]);
  const addedPromotionRequirements = unique(manifest.real_case_requirements_added).filter(item => !baseBuild.promotion_boundary.real_case_requires.includes(item));
  const promotionRequirements = unique([...baseBuild.promotion_boundary.real_case_requires, ...manifest.real_case_requirements_added]);
  const refusalRules = unique([...baseBuild.refusal_rule_union, ...extensionControl.observed_refusal_rules]);
  const identificationRequirements = [...baseBuild.identification_requirements, manifest.identification_requirement];
  const chain = buildV24Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements);

  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V24_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v24_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    composition: {
      base_manifest_id: baseBuild.manifest_id,
      base_schema_version: baseBuild.schema_version,
      base_control_count: baseBuild.control_count,
      base_floor_snapshot_sha256: sha256(baseBuild),
      base_promotion_requirement_count: unique(baseBuild.promotion_boundary.real_case_requires).length,
      added_promotion_requirement_count: addedPromotionRequirements.length,
      final_promotion_requirement_count: promotionRequirements.length,
      extension_control_id: extensionControl.control_id,
      extension_snapshot_sha256: sha256(extensionControl)
    },
    control_count: controls.length,
    failure_classes: sorted(controls.map(control => control.failure_class)),
    controls,
    control_integrity: {
      base_floor_qualified: baseBuild.status === 'laboratory_floor_v23_qualified',
      base_integrity_preserved: Object.values(baseBuild.control_integrity).every(value => value === true),
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_pc26_refusal_rules_present: allRequiredRulesPresent
    },
    identification_requirements: identificationRequirements,
    refusal_rule_union: refusalRules,
    open_frontiers: openFrontiers,
    frontier_transition: manifest.frontier_transition,
    promotion_boundary: {
      laboratory_controls_are_real_world_evidence: false,
      real_case_requires: promotionRequirements,
      promotion_authority: baseBuild.promotion_boundary.promotion_authority
    },
    custody_chain: chain,
    custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null,
    prohibited_inferences: [...baseBuild.prohibited_inferences, ...manifest.prohibited_inferences],
    interpretation_contract: manifest.interpretation_contract
  };
}

export function validatePreferenceCustodyManifestV24Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V24_BUILD_SCHEMA_VERSION) errors.push('preference custody v24 build schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v24') errors.push('compiled v24 manifest identity mismatch');
  if (compiled?.control_issue !== 740) errors.push('compiled v24 control issue must remain 740');
  if (compiled?.status !== 'laboratory_floor_v24_qualified') errors.push('compiled v24 status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled v24 graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v24 counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v24 conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled v24 real_world_evidence_state must remain none');
  if (compiled?.control_count !== 26) errors.push('compiled v24 must preserve twenty-six controls');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v24 control IDs are incomplete');

  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v23') errors.push('compiled v24 base manifest mismatch');
  if (composition.base_control_count !== 25) errors.push('compiled v24 base control count must remain twenty-five');
  if (composition.extension_control_id !== 'PC-26') errors.push('compiled v24 extension control must remain PC-26');
  for (const key of ['base_floor_snapshot_sha256','extension_snapshot_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v24 ${key} is invalid`);
  if (!Number.isInteger(composition.added_promotion_requirement_count) || composition.added_promotion_requirement_count < 60) errors.push('compiled v24 must add at least sixty promotion requirements');
  if (composition.final_promotion_requirement_count !== composition.base_promotion_requirement_count + composition.added_promotion_requirement_count) errors.push('compiled v24 promotion requirement counts do not reconcile');
  if (composition.final_promotion_requirement_count !== unique(compiled?.promotion_boundary?.real_case_requires).length) errors.push('compiled v24 final promotion count does not match the promotion boundary');

  const integrity = object(compiled?.control_integrity);
  for (const key of ['base_floor_qualified','base_integrity_preserved','all_graph_effect_none','no_thesis_evidence_consumption','no_real_world_conclusion','no_preference_change_claim','no_intent_inference','all_required_pc26_refusal_rules_present']) {
    if (integrity[key] !== true) errors.push(`compiled v24 control_integrity.${key} must be true`);
  }

  const pc26 = array(compiled?.controls).find(control => control.control_id === 'PC-26');
  if (!pc26) errors.push('compiled v24 PC-26 control is missing');
  else {
    const proof = object(pc26.proof_summary);
    for (const [key, value] of Object.entries(EXPECTED_PC26_METRICS)) if (!close(proof[key], value)) errors.push(`PC-26 ${key} must equal ${value}`);
    for (const key of EXPECTED_FALSE_PC26_CLASSIFICATIONS) if (proof[key] !== false) errors.push(`PC-26 ${key} must remain false`);
    if (proof.complete_causal_identification_supported_in_at_least_one_world !== true) errors.push('PC-26 must preserve one complete causal-identification path');
  }

  if (!array(compiled?.identification_requirements).some(item => item.stage === 'criterion_temporal_causality_feedback_post_treatment_bias_and_interference')) errors.push('compiled v24 causal-assurance identification stage is missing');
  if (array(compiled?.open_frontiers).includes('criterion_temporal_causality_feedback_and_post_treatment_bias_assurance')) errors.push('compiled v24 must remove the resolved broad causal-assurance frontier');
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v24 successor frontier missing: ${frontier}`);
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v24 laboratory_controls_are_real_world_evidence', errors);

  const seen = new Set();
  let previous = null;
  for (const event of array(compiled?.custody_chain)) {
    if (!text(event?.event_id)) errors.push('compiled v24 custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate compiled v24 event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`compiled v24 event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`compiled v24 event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`compiled v24 event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (!/^[0-9a-f]{64}$/.test(text(compiled?.custody_chain_head_sha256))) errors.push('compiled v24 custody head is invalid');
  if (array(compiled?.custody_chain).at(-1)?.event_sha256 !== compiled?.custody_chain_head_sha256) errors.push('compiled v24 custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v24 caveat is required');
  return errors;
}

export function renderPreferenceCustodyManifestV24Markdown(compiled) {
  const proof = compiled.controls.find(control => control.control_id === 'PC-26').proof_summary;
  const lines = [
    '# Preference custody laboratory floor v24','',
    `**Status:** ${compiled.status}`,'',
    `**Controls:** ${compiled.control_count}`,'',
    `**Composition:** ${compiled.composition.base_manifest_id} + ${compiled.composition.extension_control_id}`,'',
    `**Real-world evidence state:** ${compiled.real_world_evidence_state}`,'',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,'',
    '## Frozen base','',
    `- Base manifest: ${compiled.composition.base_manifest_id}`,
    `- Base controls: ${compiled.composition.base_control_count}`,
    `- Base snapshot: ${compiled.composition.base_floor_snapshot_sha256}`,
    `- Added promotion requirements: ${compiled.composition.added_promotion_requirement_count}`,'',
    '## PC-26: temporal causality, selection, interference, feedback, and experiment lineage',''
  ];
  for (const [key, value] of Object.entries(proof)) lines.push(`- ${key}: ${value}`);
  lines.push('','## Floor integrity','');
  for (const [key, value] of Object.entries(compiled.control_integrity)) lines.push(`- ${key}: ${value}`);
  lines.push('','## Identification stages','');
  for (const requirement of compiled.identification_requirements) lines.push(`### ${requirement.stage}`,'',`- Required state: ${requirement.required_state}`,`- Refusal: ${requirement.refused_inference}`,'');
  lines.push('## Open frontiers','');
  for (const frontier of compiled.open_frontiers) lines.push(`- ${frontier}`);
  lines.push('','## Promotion boundary','',`- Laboratory controls are real-world evidence: ${compiled.promotion_boundary.laboratory_controls_are_real_world_evidence}`,`- Promotion authority: ${compiled.promotion_boundary.promotion_authority}`,'','### Required real-case evidence','');
  for (const item of compiled.promotion_boundary.real_case_requires) lines.push(`- ${item}`);
  lines.push('','## Prohibited inferences','');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('',`**Custody head:** ${compiled.custody_chain_head_sha256}`,'');
  return lines.join('\n');
}
