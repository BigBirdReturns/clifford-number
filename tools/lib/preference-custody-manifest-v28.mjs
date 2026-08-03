import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV27Build } from './preference-custody-manifest-v27.mjs';
import { validatePreferenceMarketServiceAssuranceBuild } from './preference-market-service-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V28_SCHEMA_VERSION = 'preference-custody-control-manifest-v28@1';
export const PREFERENCE_CUSTODY_MANIFEST_V28_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v28-build@1';

const REQUIRED_CONTROL_IDS = Array.from({ length: 30 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`);
const REQUIRED_SUCCESSOR_FRONTIERS = [
  'service_denominator_unserved_population_queue_rationing_denial_and_completion_reconciliation_governance',
  'price_availability_affordability_access_quality_provider_mix_and_market_lineage_assurance'
];
const EXPECTED_PC30_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_market_service_governance_signatures: 8,
  complete_market_service_assurance_worlds: 1,
  market_boundary_counterfactual_failure_worlds: 1,
  capacity_queue_rationing_denial_failure_worlds: 1,
  price_availability_affordability_failure_worlds: 1,
  access_exclusion_failure_worlds: 1,
  service_denominator_failure_worlds: 1,
  quality_version_provider_selection_failure_worlds: 1,
  stale_market_lineage_failure_worlds: 1,
  market_counterfactual_complete_worlds: 7,
  capacity_flow_complete_worlds: 7,
  price_affordability_complete_worlds: 7,
  access_coverage_complete_worlds: 7,
  service_denominator_complete_worlds: 7,
  quality_measurement_complete_worlds: 7,
  current_market_lineage_complete_worlds: 7,
  monitoring_correction_complete_worlds: 8,
  total_counterfactual_unavailable_unit_count: 100,
  total_omitted_market_count: 2,
  total_cross_market_contaminated_unit_count: 100,
  total_capacity_constrained_unit_count: 60,
  total_queued_unit_count: 40,
  total_rationed_unit_count: 30,
  total_capacity_denied_unit_count: 20,
  total_unmet_need_unit_count: 30,
  total_price_exposed_unit_count: 60,
  total_availability_shifted_unit_count: 30,
  total_affordability_shifted_unit_count: 40,
  total_demand_shifted_unit_count: 40,
  total_uptake_shifted_unit_count: 30,
  total_access_limited_unit_count: 50,
  total_geographic_temporal_excluded_unit_count: 60,
  total_language_excluded_unit_count: 20,
  total_disability_excluded_unit_count: 15,
  total_digital_excluded_unit_count: 25,
  total_documentation_excluded_unit_count: 10,
  total_administrative_burden_excluded_unit_count: 20,
  total_service_denominator_excluded_unit_count: 40,
  total_unserved_unit_count: 60,
  total_service_denied_unit_count: 30,
  total_abandoned_unit_count: 10,
  total_deferred_unit_count: 5,
  total_referred_pending_unit_count: 5,
  total_quality_degraded_unit_count: 40,
  total_version_shifted_unit_count: 40,
  total_provider_mix_selected_unit_count: 40,
  total_cream_skimming_unit_count: 30,
  total_survivor_only_unit_count: 40,
  total_stale_market_assurance_decision_count: 100,
  total_unsupported_market_assurance_decisions: 700,
  binding_public_authority_worlds: 0
};
const EXPECTED_FALSE_PC30_CLASSIFICATIONS = [
  'declared_market_boundary_identifies_operational_system_boundary',
  'observed_untreated_units_identify_valid_untreated_market_counterfactual',
  'published_capacity_coverage_identifies_staffed_available_usable_unconstrained_capacity',
  'completed_services_identify_complete_service_population',
  'zero_published_denial_rate_identifies_zero_true_denial',
  'zero_published_price_change_identifies_zero_affordability_or_availability_change',
  'nominal_channel_availability_identifies_usable_access',
  'published_access_coverage_identifies_complete_population_access',
  'published_service_records_identify_complete_service_denominator',
  'aggregate_quality_identifies_stable_version_dose_provider_and_case_mix',
  'stable_quality_score_identifies_absence_of_selection_or_deterioration',
  'historical_market_assurance_identifies_current_market_service_assurance',
  'public_market_service_verified_status_identifies_complete_current_counterfactual_capacity_price_access_denominator_quality_correctable_authorized_evidence',
  'market_service_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'binding_public_authority_supported',
  'manipulative_intent_inferable',
  'real_world_effect_claimed'
];

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(value => text(value)).filter(Boolean))];
const sorted = values => [...values].sort((left, right) => String(left).localeCompare(String(right)));
const sameMembers = (left, right) => JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
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

function summarizePc30(control, build) {
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
    preference_change_present: build.preference_change_present,
    manipulative_intent_inferable: build.classification?.manipulative_intent_inferable,
    required_refusal_rules: control.required_refusal_rules,
    observed_refusal_rules: array(build.refusal_rules),
    proof_summary: {
      ...Object.fromEntries(Object.keys(EXPECTED_PC30_METRICS).map(key => [key, build.metrics?.[key]])),
      ...Object.fromEntries(EXPECTED_FALSE_PC30_CLASSIFICATIONS.map(key => [key, build.classification?.[key]])),
      complete_market_service_assurance_supported_in_at_least_one_world: build.classification?.complete_market_service_assurance_supported_in_at_least_one_world
    }
  };
}

function buildV28Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${manifest.manifest_id}:base`,
    event_type: 'qualified_v27_floor_snapshot',
    evidence_class: 'compiled_synthetic_control_floor',
    authority: 'preference_custody_v27_compiler',
    source_event_ids: [],
    payload: {
      manifest_id: baseBuild.manifest_id,
      schema_version: baseBuild.schema_version,
      control_count: baseBuild.control_count,
      snapshot_sha256: sha256(baseBuild)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:pc30`,
    event_type: 'pc30_market_counterfactual_capacity_price_access_service_denominator_quality_and_lineage_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'market_service_assurance_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: { control: extensionControl, snapshot_sha256: sha256(extensionControl) }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'market_service_assurance_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v28_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc30`],
    payload: { transition: manifest.frontier_transition, open_frontiers: openFrontiers }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'market_service_assurance_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v28_compiler',
    source_event_ids: [`${manifest.manifest_id}:frontier`],
    payload: { identification_requirement: manifest.identification_requirement, real_case_requires: promotionRequirements }
  });
  push({
    event_id: `${manifest.manifest_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'preference_custody_v28_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: {
      allowed_interpretation: 'qualified thirty-control synthetic Preference Custody floor',
      refused_promotions: [
        'laboratory_control_as_named_market_service_or_provider_finding',
        'declared_market_boundary_as_operational_system_boundary',
        'nominal_untreated_units_as_valid_untreated_market_counterfactual',
        'capacity_coverage_as_staffed_available_usable_capacity',
        'completed_or_published_records_as_complete_service_denominator',
        'zero_published_denial_as_zero_true_denial',
        'zero_published_price_change_as_zero_availability_or_affordability_feedback',
        'nominal_channel_availability_as_usable_access',
        'aggregate_quality_as_stable_version_provider_and_case_mix',
        'stable_quality_score_as_absence_of_selection_or_deterioration',
        'historical_assurance_as_current_market_service_lineage',
        'market_service_verified_status_as_public_authorization'
      ]
    }
  });
  return events;
}

export function validatePreferenceCustodyManifestV28(manifest) {
  const errors = [];
  const base = object(manifest?.base_floor);
  const control = object(manifest?.extension_control);
  const requirement = object(manifest?.identification_requirement);
  const transition = object(manifest?.frontier_transition);
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V28_SCHEMA_VERSION) errors.push('preference custody v28 manifest schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v28') errors.push('manifest_id must remain preference-custody-laboratory-floor-v28');
  if (manifest?.control_issue !== 799) errors.push('v28 control issue must remain 799');
  if (manifest?.status !== 'synthetic_control_floor_extension') errors.push('v28 manifest status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('v28 manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v28 manifest counts_toward_thesis_evidence', errors);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v27') errors.push('v28 base manifest must remain floor v27');
  if (!text(base.source_manifest_path) || base.expected_build_schema !== 'preference-custody-control-manifest-v27-build@1' || base.expected_control_count !== 29) errors.push('v28 base floor contract is incomplete');
  if (control.control_id !== 'PC-30') errors.push('v28 extension control must remain PC-30');
  if (control.fixture_id !== 'same-market-service-verified-status-different-operational-states-v1') errors.push('PC-30 fixture identity mismatch');
  if (control.failure_class !== 'market_counterfactual_capacity_price_access_quality_service_denominator_and_lineage_equifinality') errors.push('PC-30 failure class mismatch');
  if (!text(control.source_fixture_path) || !text(control.build_artifact_path) || control.expected_build_schema !== 'preference-market-service-assurance-build@1') errors.push('PC-30 source or build contract is incomplete');
  if (unique(control.required_refusal_rules).length < 16) errors.push('PC-30 refusal-rule contract is incomplete');
  if (requirement.stage !== 'market_counterfactual_capacity_price_access_quality_and_service_denominator') errors.push('v28 identification stage mismatch');
  if (!text(requirement.required_state) || !text(requirement.refused_inference)) errors.push('v28 market-service identification requirement is incomplete');
  if (transition.resolved_base_frontier !== 'market_counterfactual_capacity_price_access_quality_and_service_denominator_assurance') errors.push('v28 resolved frontier mismatch');
  if (!sameMembers(transition.successor_frontiers, REQUIRED_SUCCESSOR_FRONTIERS)) errors.push('v28 successor frontiers are incomplete');
  if (unique(manifest?.real_case_requirements_added).length !== 69) errors.push('v28 market-service real-case requirements must contain exactly sixty-nine unique items');
  if (array(manifest?.real_case_requirements_added).some(item => !/^[a-z0-9_]+$/.test(text(item)))) errors.push('v28 market-service real-case requirements must be lowercase underscore-delimited machine identifiers');
  if (unique(manifest?.prohibited_inferences).length < 16) errors.push('v28 prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id) || !text(manifest?.interpretation_contract?.what_this_is) || !text(manifest?.interpretation_contract?.what_this_is_not) || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v28 interpretation contract is incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV28(manifest, baseBuild, marketServiceBuild) {
  const errors = validatePreferenceCustodyManifestV28(manifest);
  if (errors.length) throw new Error(`invalid preference custody v28 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV27Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v27 base build:\n- ${baseErrors.join('\n- ')}`);
  const extensionErrors = validatePreferenceMarketServiceAssuranceBuild(marketServiceBuild);
  if (extensionErrors.length) throw new Error(`invalid PC-30 build:\n- ${extensionErrors.join('\n- ')}`);

  const extensionControl = summarizePc30(manifest.extension_control, marketServiceBuild);
  const allRequiredRulesPresent = manifest.extension_control.required_refusal_rules.every(rule => marketServiceBuild.refusal_rules.includes(rule));
  const completePathPreserved = marketServiceBuild.classification.complete_market_service_assurance_supported_in_at_least_one_world === true;
  if (!allRequiredRulesPresent || !completePathPreserved) throw new Error('PC-30 refusal or complete-path contract failed');

  const controls = [...baseBuild.controls, extensionControl];
  const identificationRequirements = [...baseBuild.identification_requirements, manifest.identification_requirement];
  const refusalRules = unique([...baseBuild.refusal_rule_union, ...marketServiceBuild.refusal_rules]);
  const openFrontiers = sorted(unique([
    ...baseBuild.open_frontiers.filter(frontier => frontier !== manifest.frontier_transition.resolved_base_frontier),
    ...manifest.frontier_transition.successor_frontiers
  ]));
  const promotionRequirements = unique([
    ...baseBuild.promotion_boundary.real_case_requires,
    ...manifest.real_case_requirements_added
  ]);
  const chain = buildV28Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements);

  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V28_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v28_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    composition: {
      base_manifest_id: baseBuild.manifest_id,
      base_control_count: baseBuild.control_count,
      base_floor_snapshot_sha256: sha256(baseBuild),
      base_promotion_requirement_count: baseBuild.promotion_boundary.real_case_requires.length,
      added_promotion_requirement_count: manifest.real_case_requirements_added.length,
      final_promotion_requirement_count: promotionRequirements.length,
      extension_control_id: extensionControl.control_id,
      extension_snapshot_sha256: sha256(extensionControl)
    },
    control_count: controls.length,
    failure_classes: sorted(controls.map(control => control.failure_class)),
    controls,
    control_integrity: {
      base_floor_qualified: baseBuild.status === 'laboratory_floor_v27_qualified',
      base_integrity_preserved: Object.values(baseBuild.control_integrity).every(value => value === true),
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_pc30_refusal_rules_present: allRequiredRulesPresent,
      complete_market_service_assurance_path_preserved: completePathPreserved
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

export function validatePreferenceCustodyManifestV28Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V28_BUILD_SCHEMA_VERSION) errors.push('preference custody v28 build schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v28') errors.push('compiled v28 manifest identity mismatch');
  if (compiled?.control_issue !== 799) errors.push('compiled v28 control issue must remain 799');
  if (compiled?.status !== 'laboratory_floor_v28_qualified') errors.push('compiled v28 status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled v28 graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v28 counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v28 conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled v28 real_world_evidence_state must remain none');
  if (compiled?.control_count !== 30) errors.push('compiled v28 must preserve thirty controls');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v28 control IDs are incomplete');

  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v27') errors.push('compiled v28 base manifest mismatch');
  if (composition.base_control_count !== 29) errors.push('compiled v28 base control count must remain twenty-nine');
  if (composition.extension_control_id !== 'PC-30') errors.push('compiled v28 extension control must remain PC-30');
  for (const key of ['base_floor_snapshot_sha256','extension_snapshot_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v28 ${key} is invalid`);
  if (composition.added_promotion_requirement_count !== 69) errors.push('compiled v28 must add exactly sixty-nine promotion requirements');
  if (composition.final_promotion_requirement_count !== composition.base_promotion_requirement_count + composition.added_promotion_requirement_count) errors.push('compiled v28 promotion requirement counts do not reconcile');
  if (composition.final_promotion_requirement_count !== unique(compiled?.promotion_boundary?.real_case_requires).length) errors.push('compiled v28 final promotion count does not match the promotion boundary');

  const integrity = object(compiled?.control_integrity);
  for (const key of [
    'base_floor_qualified','base_integrity_preserved','all_graph_effect_none','no_thesis_evidence_consumption',
    'no_real_world_conclusion','no_preference_change_claim','no_intent_inference',
    'all_required_pc30_refusal_rules_present','complete_market_service_assurance_path_preserved'
  ]) if (integrity[key] !== true) errors.push(`compiled v28 control_integrity.${key} must be true`);

  const pc30 = array(compiled?.controls).find(control => control.control_id === 'PC-30');
  if (!pc30) errors.push('compiled v28 PC-30 control is missing');
  else {
    const proof = object(pc30.proof_summary);
    for (const [key, value] of Object.entries(EXPECTED_PC30_METRICS)) if (proof[key] !== value) errors.push(`PC-30 ${key} must equal ${value}`);
    for (const key of EXPECTED_FALSE_PC30_CLASSIFICATIONS) if (proof[key] !== false) errors.push(`PC-30 ${key} must remain false`);
    if (proof.complete_market_service_assurance_supported_in_at_least_one_world !== true) errors.push('PC-30 must preserve one complete market-service assurance path');
  }

  if (!array(compiled?.identification_requirements).some(item => item.stage === 'market_counterfactual_capacity_price_access_quality_and_service_denominator')) errors.push('compiled v28 market-service identification stage is missing');
  if (array(compiled?.open_frontiers).includes('market_counterfactual_capacity_price_access_quality_and_service_denominator_assurance')) errors.push('compiled v28 must remove the resolved broad market-service frontier');
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v28 successor frontier missing: ${frontier}`);
  if (!array(compiled?.open_frontiers).includes('strategic_response_substitution_multiple_equilibria_welfare_incidence_replication_and_scale_succession_governance')) errors.push('compiled v28 must preserve the independent strategic-equilibrium frontier');
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v28 laboratory_controls_are_real_world_evidence', errors);

  const chain = array(compiled?.custody_chain);
  if (chain.length !== 5) errors.push('compiled v28 custody chain must contain five events');
  const seen = new Set();
  let previous = null;
  for (const event of chain) {
    if (!text(event?.event_id)) errors.push('compiled v28 custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate compiled v28 event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`compiled v28 event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`compiled v28 event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`compiled v28 event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (!/^[0-9a-f]{64}$/.test(text(compiled?.custody_chain_head_sha256))) errors.push('compiled v28 custody head is invalid');
  if (chain.at(-1)?.event_sha256 !== compiled?.custody_chain_head_sha256) errors.push('compiled v28 custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v28 caveat is required');
  return errors;
}

export function renderPreferenceCustodyManifestV28Markdown(compiled) {
  const proof = compiled.controls.find(control => control.control_id === 'PC-30').proof_summary;
  const lines = [
    '# Preference custody laboratory floor v28','',
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
    '## PC-30: market counterfactual, capacity, price, access, quality, and service-denominator custody',''
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
