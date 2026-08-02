import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV26Build } from './preference-custody-manifest-v26.mjs';
import { validatePreferenceEquilibriumAssuranceBuild } from './preference-equilibrium-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V27_SCHEMA_VERSION = 'preference-custody-control-manifest-v27@1';
export const PREFERENCE_CUSTODY_MANIFEST_V27_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v27-build@1';

const REQUIRED_CONTROL_IDS = Array.from({ length: 29 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`);
const REQUIRED_SUCCESSOR_FRONTIERS = [
  'market_counterfactual_capacity_price_access_quality_and_service_denominator_assurance',
  'strategic_response_substitution_multiple_equilibria_welfare_incidence_replication_and_scale_succession_governance'
];
const EXPECTED_PC29_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_equilibrium_governance_signatures: 8,
  complete_equilibrium_assurance_worlds: 1,
  universal_saturation_no_counterfactual_worlds: 1,
  capacity_queue_rationing_quality_worlds: 1,
  price_availability_feedback_worlds: 1,
  strategic_anticipation_gaming_provider_response_worlds: 1,
  substitution_displacement_harm_transfer_worlds: 1,
  multiple_equilibria_path_selection_worlds: 1,
  stale_scale_succession_worlds: 1,
  market_counterfactual_complete_worlds: 7,
  capacity_access_complete_worlds: 7,
  price_availability_complete_worlds: 7,
  strategic_response_complete_worlds: 7,
  substitution_harm_complete_worlds: 7,
  equilibrium_selection_complete_worlds: 7,
  welfare_incidence_complete_worlds: 7,
  independent_replication_complete_worlds: 7,
  current_scale_lineage_complete_worlds: 7,
  monitoring_correction_complete_worlds: 8,
  total_saturated_unit_count: 100,
  total_capacity_constrained_unit_count: 60,
  total_queued_unit_count: 40,
  total_rationed_unit_count: 30,
  total_denied_unit_count: 20,
  total_quality_deteriorated_unit_count: 30,
  total_price_exposed_unit_count: 60,
  total_affordability_shifted_unit_count: 40,
  total_demand_shifted_unit_count: 40,
  total_uptake_shifted_unit_count: 30,
  total_anticipating_unit_count: 50,
  total_gaming_unit_count: 30,
  total_compliance_adapted_unit_count: 30,
  total_provider_response_unit_count: 40,
  total_substituted_unit_count: 50,
  total_displaced_unit_count: 40,
  total_crowd_out_unit_count: 30,
  total_rebound_unit_count: 20,
  total_harm_shifted_unit_count: 40,
  total_cross_market_exposure_count: 100,
  total_intertemporal_exposure_count: 40,
  total_path_dependent_unit_count: 60,
  total_stale_scale_decision_count: 100,
  total_unsupported_equilibrium_decisions: 700,
  binding_public_authority_worlds: 0
};
const EXPECTED_FALSE_PC29_CLASSIFICATIONS = [
  'universal_rollout_identifies_untreated_system_counterfactual',
  'observed_untreated_units_identify_untreated_markets_under_saturation',
  'zero_published_capacity_change_identifies_unconstrained_capacity',
  'completed_service_identifies_eligible_or_attempted_service_denominator',
  'zero_published_price_change_identifies_zero_affordability_or_availability_feedback',
  'stable_uptake_identifies_absence_of_demand_adaptation',
  'pre_policy_behavior_identifies_unanticipated_behavior_after_announcement',
  'compliance_identifies_absence_of_gaming_or_provider_response',
  'within_market_gain_identifies_system_welfare_without_substitution_or_harm_transfer',
  'one_solved_equilibrium_identifies_unique_policy_relevant_equilibrium',
  'favorable_initialization_identifies_equilibrium_identification',
  'aggregate_welfare_gain_identifies_explicit_weights_incidence_and_no_harmed_groups',
  'replication_count_identifies_independent_equivalent_replication',
  'pilot_partial_equilibrium_identifies_current_systemwide_assurance_after_scale_succession',
  'public_equilibrium_adjusted_status_identifies_complete_current_counterfactual_capacity_price_response_substitution_welfare_replication_authorized_evidence',
  'equilibrium_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'binding_public_authority_supported',
  'manipulative_intent_inferable',
  'real_world_effect_claimed'
];
const EPSILON = 1e-12;

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(value => text(value)).filter(Boolean))];
const sorted = values => [...values].sort((left, right) => String(left).localeCompare(String(right)));
const sameMembers = (left, right) => JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
const close = (left, right, tolerance = EPSILON) => Math.abs(Number(left) - Number(right)) <= tolerance;
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const requireFalse = (value, label, errors) => { if (value !== false) errors.push(`${label} must remain false`); };
const sealedEvent = (event, previousEventSha256) => {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
};

function summarizePc29(control, build) {
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
      ...Object.fromEntries(Object.keys(EXPECTED_PC29_METRICS).map(key => [key, build.metrics?.[key]])),
      ...Object.fromEntries(EXPECTED_FALSE_PC29_CLASSIFICATIONS.map(key => [key, build.classification?.[key]])),
      complete_equilibrium_assurance_supported_in_at_least_one_world: build.classification?.complete_equilibrium_assurance_supported_in_at_least_one_world
    }
  };
}

function buildV27Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${manifest.manifest_id}:base`,
    event_type: 'qualified_v26_floor_snapshot',
    evidence_class: 'compiled_synthetic_control_floor',
    authority: 'preference_custody_v26_compiler',
    source_event_ids: [],
    payload: {
      manifest_id: baseBuild.manifest_id,
      schema_version: baseBuild.schema_version,
      control_count: baseBuild.control_count,
      snapshot_sha256: sha256(baseBuild)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:pc29`,
    event_type: 'pc29_market_counterfactual_saturation_capacity_price_response_substitution_equilibrium_welfare_replication_and_scale_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'equilibrium_assurance_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: { control: extensionControl, snapshot_sha256: sha256(extensionControl) }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'equilibrium_assurance_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v27_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc29`],
    payload: { transition: manifest.frontier_transition, open_frontiers: openFrontiers }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'equilibrium_assurance_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v27_compiler',
    source_event_ids: [`${manifest.manifest_id}:frontier`],
    payload: { identification_requirement: manifest.identification_requirement, real_case_requires: promotionRequirements }
  });
  push({
    event_id: `${manifest.manifest_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'preference_custody_v27_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: {
      allowed_interpretation: 'qualified twenty-nine-control synthetic Preference Custody floor',
      refused_promotions: [
        'laboratory_control_as_named_equilibrium_or_welfare_finding',
        'universal_rollout_as_untreated_system_counterfactual',
        'nominal_untreated_units_as_unsaturated_markets',
        'zero_published_capacity_change_as_unconstrained_capacity',
        'completed_service_as_complete_service_denominator',
        'zero_published_price_change_as_zero_feedback',
        'nominal_compliance_as_absence_of_strategic_response',
        'within_market_gain_as_system_welfare',
        'one_solver_output_as_unique_policy_relevant_equilibrium',
        'aggregate_welfare_gain_as_explicit_incidence',
        'replication_count_as_independent_equivalent_replication',
        'pilot_result_as_current_scale_assurance',
        'equilibrium_adjusted_status_as_public_authorization'
      ]
    }
  });
  return events;
}

export function validatePreferenceCustodyManifestV27(manifest) {
  const errors = [];
  const base = object(manifest?.base_floor);
  const control = object(manifest?.extension_control);
  const requirement = object(manifest?.identification_requirement);
  const transition = object(manifest?.frontier_transition);
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V27_SCHEMA_VERSION) errors.push('preference custody v27 manifest schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v27') errors.push('manifest_id must remain preference-custody-laboratory-floor-v27');
  if (manifest?.control_issue !== 781) errors.push('v27 control issue must remain 781');
  if (manifest?.status !== 'synthetic_control_floor_extension') errors.push('v27 manifest status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('v27 manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v27 manifest counts_toward_thesis_evidence', errors);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v26') errors.push('v27 base manifest must remain floor v26');
  if (!text(base.source_manifest_path) || base.expected_build_schema !== 'preference-custody-control-manifest-v26-build@1' || base.expected_control_count !== 28) errors.push('v27 base floor contract is incomplete');
  if (control.control_id !== 'PC-29') errors.push('v27 extension control must remain PC-29');
  if (control.fixture_id !== 'same-equilibrium-adjusted-status-different-system-states-v1') errors.push('PC-29 fixture identity mismatch');
  if (control.failure_class !== 'saturation_general_equilibrium_capacity_price_substitution_welfare_replication_and_scale_succession_equifinality') errors.push('PC-29 failure class mismatch');
  if (!text(control.source_fixture_path) || !text(control.build_artifact_path) || control.expected_build_schema !== 'preference-equilibrium-assurance-build@1') errors.push('PC-29 source or build contract is incomplete');
  if (unique(control.required_refusal_rules).length < 18) errors.push('PC-29 refusal-rule contract is incomplete');
  if (requirement.stage !== 'market_counterfactual_saturation_capacity_access_price_availability_strategic_response_substitution_equilibrium_welfare_replication_and_scale_succession') errors.push('v27 identification stage mismatch');
  if (!text(requirement.required_state) || !text(requirement.refused_inference)) errors.push('v27 equilibrium-assurance identification requirement is incomplete');
  if (transition.resolved_base_frontier !== 'saturation_general_equilibrium_and_interference_robust_policy_governance') errors.push('v27 resolved frontier mismatch');
  if (!sameMembers(transition.successor_frontiers, REQUIRED_SUCCESSOR_FRONTIERS)) errors.push('v27 successor frontiers are incomplete');
  if (unique(manifest?.real_case_requirements_added).length < 70) errors.push('v27 equilibrium-assurance real-case requirements are incomplete');
  if (array(manifest?.real_case_requirements_added).some(item => !/^[a-z0-9_]+$/.test(text(item)))) errors.push('v27 equilibrium-assurance real-case requirements must be lowercase underscore-delimited machine identifiers');
  if (unique(manifest?.prohibited_inferences).length < 15) errors.push('v27 prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id) || !text(manifest?.interpretation_contract?.what_this_is) || !text(manifest?.interpretation_contract?.what_this_is_not) || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v27 interpretation contract is incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV27(manifest, baseBuild, equilibriumBuild) {
  const errors = validatePreferenceCustodyManifestV27(manifest);
  if (errors.length) throw new Error(`invalid preference custody v27 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV26Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v26 base build:\n- ${baseErrors.join('\n- ')}`);
  const equilibriumErrors = validatePreferenceEquilibriumAssuranceBuild(equilibriumBuild);
  if (equilibriumErrors.length) throw new Error(`invalid PC-29 build:\n- ${equilibriumErrors.join('\n- ')}`);
  if (baseBuild.manifest_id !== manifest.base_floor.manifest_id) throw new Error('v27 base manifest identity mismatch');
  if (baseBuild.schema_version !== manifest.base_floor.expected_build_schema) throw new Error('v27 base build schema mismatch');
  if (baseBuild.control_count !== manifest.base_floor.expected_control_count) throw new Error('v27 base control count mismatch');
  if (equilibriumBuild.fixture_id !== manifest.extension_control.fixture_id) throw new Error('v27 PC-29 fixture identity mismatch');
  if (equilibriumBuild.schema_version !== manifest.extension_control.expected_build_schema) throw new Error('v27 PC-29 build schema mismatch');

  const extensionControl = summarizePc29(manifest.extension_control, equilibriumBuild);
  const allRequiredRulesPresent = extensionControl.required_refusal_rules.every(rule => extensionControl.observed_refusal_rules.includes(rule));
  const completePathPreserved = extensionControl.proof_summary.complete_equilibrium_assurance_supported_in_at_least_one_world === true;
  const controls = [...baseBuild.controls, extensionControl];
  const openFrontiers = unique([
    ...baseBuild.open_frontiers.filter(frontier => frontier !== manifest.frontier_transition.resolved_base_frontier),
    ...manifest.frontier_transition.successor_frontiers
  ]);
  const addedPromotionRequirements = unique(manifest.real_case_requirements_added).filter(item => !baseBuild.promotion_boundary.real_case_requires.includes(item));
  const promotionRequirements = unique([...baseBuild.promotion_boundary.real_case_requires, ...manifest.real_case_requirements_added]);
  const refusalRules = unique([...baseBuild.refusal_rule_union, ...extensionControl.observed_refusal_rules]);
  const identificationRequirements = [...baseBuild.identification_requirements, manifest.identification_requirement];
  const chain = buildV27Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements);

  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V27_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v27_qualified',
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
      base_floor_qualified: baseBuild.status === 'laboratory_floor_v26_qualified',
      base_integrity_preserved: Object.values(baseBuild.control_integrity).every(value => value === true),
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_pc29_refusal_rules_present: allRequiredRulesPresent,
      complete_equilibrium_assurance_path_preserved: completePathPreserved
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

export function validatePreferenceCustodyManifestV27Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V27_BUILD_SCHEMA_VERSION) errors.push('preference custody v27 build schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v27') errors.push('compiled v27 manifest identity mismatch');
  if (compiled?.control_issue !== 781) errors.push('compiled v27 control issue must remain 781');
  if (compiled?.status !== 'laboratory_floor_v27_qualified') errors.push('compiled v27 status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled v27 graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v27 counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v27 conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled v27 real_world_evidence_state must remain none');
  if (compiled?.control_count !== 29) errors.push('compiled v27 must preserve twenty-nine controls');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v27 control IDs are incomplete');

  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v26') errors.push('compiled v27 base manifest mismatch');
  if (composition.base_control_count !== 28) errors.push('compiled v27 base control count must remain twenty-eight');
  if (composition.extension_control_id !== 'PC-29') errors.push('compiled v27 extension control must remain PC-29');
  for (const key of ['base_floor_snapshot_sha256','extension_snapshot_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v27 ${key} is invalid`);
  if (!Number.isInteger(composition.added_promotion_requirement_count) || composition.added_promotion_requirement_count < 70) errors.push('compiled v27 must add at least seventy promotion requirements');
  if (composition.final_promotion_requirement_count !== composition.base_promotion_requirement_count + composition.added_promotion_requirement_count) errors.push('compiled v27 promotion requirement counts do not reconcile');
  if (composition.final_promotion_requirement_count !== unique(compiled?.promotion_boundary?.real_case_requires).length) errors.push('compiled v27 final promotion count does not match the promotion boundary');

  const integrity = object(compiled?.control_integrity);
  for (const key of [
    'base_floor_qualified','base_integrity_preserved','all_graph_effect_none','no_thesis_evidence_consumption',
    'no_real_world_conclusion','no_preference_change_claim','no_intent_inference',
    'all_required_pc29_refusal_rules_present','complete_equilibrium_assurance_path_preserved'
  ]) if (integrity[key] !== true) errors.push(`compiled v27 control_integrity.${key} must be true`);

  const pc29 = array(compiled?.controls).find(control => control.control_id === 'PC-29');
  if (!pc29) errors.push('compiled v27 PC-29 control is missing');
  else {
    const proof = object(pc29.proof_summary);
    for (const [key, value] of Object.entries(EXPECTED_PC29_METRICS)) if (!close(proof[key], value)) errors.push(`PC-29 ${key} must equal ${value}`);
    for (const key of EXPECTED_FALSE_PC29_CLASSIFICATIONS) if (proof[key] !== false) errors.push(`PC-29 ${key} must remain false`);
    if (proof.complete_equilibrium_assurance_supported_in_at_least_one_world !== true) errors.push('PC-29 must preserve one complete equilibrium-assurance path');
  }

  if (!array(compiled?.identification_requirements).some(item => item.stage === 'market_counterfactual_saturation_capacity_access_price_availability_strategic_response_substitution_equilibrium_welfare_replication_and_scale_succession')) errors.push('compiled v27 equilibrium-assurance identification stage is missing');
  if (array(compiled?.open_frontiers).includes('saturation_general_equilibrium_and_interference_robust_policy_governance')) errors.push('compiled v27 must remove the resolved broad saturation frontier');
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v27 successor frontier missing: ${frontier}`);
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v27 laboratory_controls_are_real_world_evidence', errors);

  const chain = array(compiled?.custody_chain);
  if (chain.length !== 5) errors.push('compiled v27 custody chain must contain five events');
  const seen = new Set();
  let previous = null;
  for (const event of chain) {
    if (!text(event?.event_id)) errors.push('compiled v27 custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate compiled v27 event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`compiled v27 event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`compiled v27 event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`compiled v27 event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (!/^[0-9a-f]{64}$/.test(text(compiled?.custody_chain_head_sha256))) errors.push('compiled v27 custody head is invalid');
  if (chain.at(-1)?.event_sha256 !== compiled?.custody_chain_head_sha256) errors.push('compiled v27 custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v27 caveat is required');
  return errors;
}

export function renderPreferenceCustodyManifestV27Markdown(compiled) {
  const proof = compiled.controls.find(control => control.control_id === 'PC-29').proof_summary;
  const lines = [
    '# Preference custody laboratory floor v27','',
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
    '## PC-29: saturation, general equilibrium, and interference-robust policy custody',''
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
