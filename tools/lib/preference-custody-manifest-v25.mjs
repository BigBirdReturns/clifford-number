import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV24Build } from './preference-custody-manifest-v24.mjs';
import { validatePreferenceInterferenceMappingBuild } from './preference-interference-mapping.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V25_SCHEMA_VERSION = 'preference-custody-control-manifest-v25@1';
export const PREFERENCE_CUSTODY_MANIFEST_V25_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v25-build@1';

const REQUIRED_CONTROL_IDS = [
  'PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10',
  'PC-11','PC-12','PC-13','PC-14','PC-15','PC-16','PC-17','PC-18','PC-19','PC-20',
  'PC-21','PC-22','PC-23','PC-24','PC-25','PC-26','PC-27'
];
const REQUIRED_SUCCESSOR_FRONTIERS = [
  'network_topology_measurement_error_hidden_edge_and_dynamic_exposure_assurance',
  'saturation_general_equilibrium_and_interference_robust_policy_governance'
];
const EXPECTED_PC27_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_interference_governance_signatures: 8,
  complete_interference_assurance_worlds: 1,
  peer_spillover_worlds: 1,
  institutional_channel_contamination_worlds: 1,
  cross_cluster_interference_worlds: 1,
  network_undercoverage_worlds: 1,
  treatment_version_interference_worlds: 1,
  endogenous_network_rewiring_worlds: 1,
  general_equilibrium_saturation_worlds: 1,
  assignment_complete_worlds: 8,
  network_census_complete_worlds: 6,
  channel_map_complete_worlds: 7,
  control_unexposed_complete_worlds: 2,
  stable_treatment_complete_worlds: 7,
  stable_network_complete_worlds: 6,
  partial_interference_supported_worlds: 3,
  exposure_mapping_complete_worlds: 1,
  spillover_estimand_identified_worlds: 1,
  current_interference_lineage_complete_worlds: 5,
  same_public_interference_surface_worlds: 8,
  total_true_exposed_control_count: 205,
  total_false_negative_exposure_count: 205,
  total_peer_spillover_count: 30,
  total_institutional_exposure_count: 40,
  total_cross_cluster_exposure_count: 25,
  total_hidden_network_exposure_count: 40,
  total_rewiring_exposure_count: 20,
  total_ambient_saturation_exposure_count: 100,
  total_missing_edge_count: 400,
  total_cross_cluster_edge_count: 50,
  total_shared_channel_exposure_count: 140,
  total_multiple_version_unit_count: 30,
  total_rewired_edge_count: 100,
  total_unsupported_interference_decisions: 700,
  binding_public_authority_worlds: 0
};
const EXPECTED_FALSE_PC27_CLASSIFICATIONS = [
  'cluster_randomization_identifies_absence_of_interference',
  'nominal_control_identifies_unexposed_control',
  'complete_node_coverage_identifies_complete_edge_channel_exposure_coverage',
  'person_network_identifies_complete_institutional_market_exposure',
  'predeclared_mapping_identifies_correct_exposure_when_channels_omitted',
  'zero_observed_cross_cluster_edges_identifies_partial_interference',
  'stable_assignment_identifies_stable_network',
  'single_treatment_label_identifies_stable_version_or_dose',
  'network_adjusted_estimator_identifies_valid_exposure_model',
  'cluster_robust_uncertainty_identifies_spillover_correction',
  'zero_reported_spillover_identifies_zero_true_spillover',
  'current_network_snapshot_identifies_pre_treatment_network',
  'saturation_equilibrium_identifies_unit_level_untreated_counterfactual',
  'public_interference_adjusted_status_identifies_complete_current_exposure_aware_correctable_authorized_evidence',
  'interference_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent',
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

function summarizePc27(control, build) {
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
      ...Object.fromEntries(Object.keys(EXPECTED_PC27_METRICS).map(key => [key, build.metrics?.[key]])),
      ...Object.fromEntries(EXPECTED_FALSE_PC27_CLASSIFICATIONS.map(key => [key, build.classification?.[key]])),
      complete_interference_assurance_supported_in_at_least_one_world: build.classification?.complete_interference_assurance_supported_in_at_least_one_world
    }
  };
}

function buildV25Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${manifest.manifest_id}:base`,
    event_type: 'qualified_v24_floor_snapshot',
    evidence_class: 'compiled_synthetic_control_floor',
    authority: 'preference_custody_v24_compiler',
    source_event_ids: [],
    payload: {
      manifest_id: baseBuild.manifest_id,
      schema_version: baseBuild.schema_version,
      control_count: baseBuild.control_count,
      snapshot_sha256: sha256(baseBuild)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:pc27`,
    event_type: 'pc27_interference_network_channel_exposure_topology_saturation_and_lineage_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'interference_mapping_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: { control: extensionControl, snapshot_sha256: sha256(extensionControl) }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'interference_assurance_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v25_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc27`],
    payload: { transition: manifest.frontier_transition, open_frontiers: openFrontiers }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'interference_assurance_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v25_compiler',
    source_event_ids: [`${manifest.manifest_id}:frontier`],
    payload: { identification_requirement: manifest.identification_requirement, real_case_requires: promotionRequirements }
  });
  push({
    event_id: `${manifest.manifest_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'preference_custody_v25_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: {
      allowed_interpretation: 'qualified twenty-seven-control synthetic Preference Custody floor',
      refused_promotions: [
        'laboratory_control_as_named_interference_finding',
        'cluster_randomization_as_absence_of_interference',
        'nominal_control_as_unexposed_control',
        'node_coverage_as_complete_network_coverage',
        'person_network_as_complete_channel_map',
        'zero_observed_cross_cluster_edges_as_partial_interference',
        'stable_assignment_as_stable_network',
        'single_treatment_label_as_stable_version_or_dose',
        'network_adjustment_as_valid_exposure_model',
        'zero_reported_spillover_as_zero_true_spillover',
        'current_snapshot_as_pre_treatment_topology',
        'saturation_as_unit_level_untreated_counterfactual',
        'interference_status_as_public_authorization'
      ]
    }
  });
  return events;
}

export function validatePreferenceCustodyManifestV25(manifest) {
  const errors = [];
  const base = object(manifest?.base_floor);
  const control = object(manifest?.extension_control);
  const requirement = object(manifest?.identification_requirement);
  const transition = object(manifest?.frontier_transition);
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V25_SCHEMA_VERSION) errors.push('preference custody v25 manifest schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v25') errors.push('manifest_id must remain preference-custody-laboratory-floor-v25');
  if (manifest?.control_issue !== 752) errors.push('v25 control issue must remain 752');
  if (manifest?.status !== 'synthetic_control_floor_extension') errors.push('v25 manifest status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('v25 manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v25 manifest counts_toward_thesis_evidence', errors);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v24') errors.push('v25 base manifest must remain floor v24');
  if (!text(base.source_manifest_path) || base.expected_build_schema !== 'preference-custody-control-manifest-v24-build@1' || base.expected_control_count !== 26) errors.push('v25 base floor contract is incomplete');
  if (control.control_id !== 'PC-27') errors.push('v25 extension control must remain PC-27');
  if (control.fixture_id !== 'same-interference-adjusted-status-different-exposure-governance-v1') errors.push('PC-27 fixture identity mismatch');
  if (control.failure_class !== 'interference_network_spillover_exposure_mapping_and_general_equilibrium_equifinality') errors.push('PC-27 failure class mismatch');
  if (!text(control.source_fixture_path) || !text(control.build_artifact_path) || control.expected_build_schema !== 'preference-interference-mapping-build@1') errors.push('PC-27 source or build contract is incomplete');
  if (unique(control.required_refusal_rules).length < 16) errors.push('PC-27 refusal-rule contract is incomplete');
  if (requirement.stage !== 'interference_network_channel_exposure_treatment_version_topology_saturation_and_equilibrium') errors.push('v25 identification stage mismatch');
  if (!text(requirement.required_state) || !text(requirement.refused_inference)) errors.push('v25 interference-assurance identification requirement is incomplete');
  if (transition.resolved_base_frontier !== 'interference_network_spillover_and_exposure_mapping_causal_governance') errors.push('v25 resolved frontier mismatch');
  if (!sameMembers(transition.successor_frontiers, REQUIRED_SUCCESSOR_FRONTIERS)) errors.push('v25 successor frontiers are incomplete');
  if (unique(manifest?.real_case_requirements_added).length < 60) errors.push('v25 interference-assurance real-case requirements are incomplete');
  if (array(manifest?.real_case_requirements_added).some(item => !/^[a-z0-9_]+$/.test(text(item)))) errors.push('v25 interference-assurance real-case requirements must be lowercase underscore-delimited machine identifiers');
  if (unique(manifest?.prohibited_inferences).length < 14) errors.push('v25 prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id) || !text(manifest?.interpretation_contract?.what_this_is) || !text(manifest?.interpretation_contract?.what_this_is_not) || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v25 interpretation contract is incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV25(manifest, baseBuild, interferenceBuild) {
  const errors = validatePreferenceCustodyManifestV25(manifest);
  if (errors.length) throw new Error(`invalid preference custody v25 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV24Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v24 base build:\n- ${baseErrors.join('\n- ')}`);
  const interferenceErrors = validatePreferenceInterferenceMappingBuild(interferenceBuild);
  if (interferenceErrors.length) throw new Error(`invalid PC-27 build:\n- ${interferenceErrors.join('\n- ')}`);
  if (baseBuild.manifest_id !== manifest.base_floor.manifest_id) throw new Error('v25 base manifest identity mismatch');
  if (baseBuild.schema_version !== manifest.base_floor.expected_build_schema) throw new Error('v25 base build schema mismatch');
  if (baseBuild.control_count !== manifest.base_floor.expected_control_count) throw new Error('v25 base control count mismatch');
  if (interferenceBuild.fixture_id !== manifest.extension_control.fixture_id) throw new Error('v25 PC-27 fixture identity mismatch');
  if (interferenceBuild.schema_version !== manifest.extension_control.expected_build_schema) throw new Error('v25 PC-27 build schema mismatch');

  const extensionControl = summarizePc27(manifest.extension_control, interferenceBuild);
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
  const chain = buildV25Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements);

  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V25_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v25_qualified',
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
      base_floor_qualified: baseBuild.status === 'laboratory_floor_v24_qualified',
      base_integrity_preserved: Object.values(baseBuild.control_integrity).every(value => value === true),
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_pc27_refusal_rules_present: allRequiredRulesPresent
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

export function validatePreferenceCustodyManifestV25Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V25_BUILD_SCHEMA_VERSION) errors.push('preference custody v25 build schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v25') errors.push('compiled v25 manifest identity mismatch');
  if (compiled?.control_issue !== 752) errors.push('compiled v25 control issue must remain 752');
  if (compiled?.status !== 'laboratory_floor_v25_qualified') errors.push('compiled v25 status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled v25 graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v25 counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v25 conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled v25 real_world_evidence_state must remain none');
  if (compiled?.control_count !== 27) errors.push('compiled v25 must preserve twenty-seven controls');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v25 control IDs are incomplete');

  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v24') errors.push('compiled v25 base manifest mismatch');
  if (composition.base_control_count !== 26) errors.push('compiled v25 base control count must remain twenty-six');
  if (composition.extension_control_id !== 'PC-27') errors.push('compiled v25 extension control must remain PC-27');
  for (const key of ['base_floor_snapshot_sha256','extension_snapshot_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v25 ${key} is invalid`);
  if (!Number.isInteger(composition.added_promotion_requirement_count) || composition.added_promotion_requirement_count < 60) errors.push('compiled v25 must add at least sixty promotion requirements');
  if (composition.final_promotion_requirement_count !== composition.base_promotion_requirement_count + composition.added_promotion_requirement_count) errors.push('compiled v25 promotion requirement counts do not reconcile');
  if (composition.final_promotion_requirement_count !== unique(compiled?.promotion_boundary?.real_case_requires).length) errors.push('compiled v25 final promotion count does not match the promotion boundary');

  const integrity = object(compiled?.control_integrity);
  for (const key of ['base_floor_qualified','base_integrity_preserved','all_graph_effect_none','no_thesis_evidence_consumption','no_real_world_conclusion','no_preference_change_claim','no_intent_inference','all_required_pc27_refusal_rules_present']) {
    if (integrity[key] !== true) errors.push(`compiled v25 control_integrity.${key} must be true`);
  }

  const pc27 = array(compiled?.controls).find(control => control.control_id === 'PC-27');
  if (!pc27) errors.push('compiled v25 PC-27 control is missing');
  else {
    const proof = object(pc27.proof_summary);
    for (const [key, value] of Object.entries(EXPECTED_PC27_METRICS)) if (!close(proof[key], value)) errors.push(`PC-27 ${key} must equal ${value}`);
    for (const key of EXPECTED_FALSE_PC27_CLASSIFICATIONS) if (proof[key] !== false) errors.push(`PC-27 ${key} must remain false`);
    if (proof.complete_interference_assurance_supported_in_at_least_one_world !== true) errors.push('PC-27 must preserve one complete interference-assurance path');
  }

  if (!array(compiled?.identification_requirements).some(item => item.stage === 'interference_network_channel_exposure_treatment_version_topology_saturation_and_equilibrium')) errors.push('compiled v25 interference-assurance identification stage is missing');
  if (array(compiled?.open_frontiers).includes('interference_network_spillover_and_exposure_mapping_causal_governance')) errors.push('compiled v25 must remove the resolved broad interference frontier');
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v25 successor frontier missing: ${frontier}`);
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v25 laboratory_controls_are_real_world_evidence', errors);

  const seen = new Set();
  let previous = null;
  for (const event of array(compiled?.custody_chain)) {
    if (!text(event?.event_id)) errors.push('compiled v25 custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate compiled v25 event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`compiled v25 event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`compiled v25 event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`compiled v25 event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (!/^[0-9a-f]{64}$/.test(text(compiled?.custody_chain_head_sha256))) errors.push('compiled v25 custody head is invalid');
  if (array(compiled?.custody_chain).at(-1)?.event_sha256 !== compiled?.custody_chain_head_sha256) errors.push('compiled v25 custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v25 caveat is required');
  return errors;
}

export function renderPreferenceCustodyManifestV25Markdown(compiled) {
  const proof = compiled.controls.find(control => control.control_id === 'PC-27').proof_summary;
  const lines = [
    '# Preference custody laboratory floor v25','',
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
    '## PC-27: interference, network spillover, and exposure mapping',''
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
