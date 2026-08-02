import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV28Build } from './preference-custody-manifest-v28.mjs';
import {
  EXPECTED_SERVICE_DENOMINATOR_METRICS,
  FALSE_SERVICE_DENOMINATOR_CLASSIFICATIONS,
  validatePreferenceServiceDenominatorAssuranceBuild
} from './preference-service-denominator-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V29_SCHEMA_VERSION = 'preference-custody-control-manifest-v29@1';
export const PREFERENCE_CUSTODY_MANIFEST_V29_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v29-build@1';

const REQUIRED_CONTROL_IDS = Array.from({ length: 31 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`);
const REQUIRED_SUCCESSOR_FRONTIERS = [
  'eligibility_awareness_request_intake_and_never_attempted_unserved_population_assurance',
  'queue_wait_rationing_priority_denial_disposition_and_completion_durability_governance'
];
const INDEPENDENT_PRICE_ACCESS_FRONTIER = 'price_availability_affordability_access_quality_provider_mix_and_market_lineage_assurance';
const INDEPENDENT_STRATEGIC_FRONTIER = 'strategic_response_substitution_multiple_equilibria_welfare_incidence_replication_and_scale_succession_governance';

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

function summarizePc31(control, build) {
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
      ...Object.fromEntries(Object.keys(EXPECTED_SERVICE_DENOMINATOR_METRICS).map(key => [key, build.metrics?.[key]])),
      ...Object.fromEntries(FALSE_SERVICE_DENOMINATOR_CLASSIFICATIONS.map(key => [key, build.classification?.[key]])),
      complete_service_denominator_assurance_supported_in_at_least_one_world: build.classification?.complete_service_denominator_assurance_supported_in_at_least_one_world
    }
  };
}

function buildV29Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${manifest.manifest_id}:base`,
    event_type: 'qualified_v28_floor_snapshot',
    evidence_class: 'compiled_synthetic_control_floor',
    authority: 'preference_custody_v28_compiler',
    source_event_ids: [],
    payload: {
      manifest_id: baseBuild.manifest_id,
      schema_version: baseBuild.schema_version,
      control_count: baseBuild.control_count,
      snapshot_sha256: sha256(baseBuild)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:pc31`,
    event_type: 'pc31_service_denominator_unserved_queue_rationing_denial_completion_and_lineage_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'service_denominator_assurance_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: { control: extensionControl, snapshot_sha256: sha256(extensionControl) }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'service_denominator_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v29_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc31`],
    payload: { transition: manifest.frontier_transition, open_frontiers: openFrontiers }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'service_denominator_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v29_compiler',
    source_event_ids: [`${manifest.manifest_id}:frontier`],
    payload: { identification_requirement: manifest.identification_requirement, real_case_requires: promotionRequirements }
  });
  push({
    event_id: `${manifest.manifest_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'preference_custody_v29_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: {
      allowed_interpretation: 'qualified thirty-one-control synthetic Preference Custody floor',
      refused_promotions: [
        'laboratory_control_as_named_service_provider_or_population_finding',
        'declared_eligibility_as_operational_eligibility',
        'absence_of_recorded_request_as_absence_of_need',
        'absence_of_recorded_attempt_as_absence_of_attempt',
        'queue_snapshot_as_complete_queue_and_wait_custody',
        'zero_published_queue_as_zero_true_queue',
        'zero_published_rationing_as_absence_of_priority_override_or_displacement',
        'non_denial_label_as_true_non_denial_disposition',
        'zero_published_denial_as_zero_true_denial',
        'zero_published_unserved_as_complete_unserved_population',
        'completion_record_as_unique_substantive_durable_completion',
        'published_median_wait_as_complete_wait_distribution',
        'historical_denominator_assurance_as_current_lineage',
        'service_denominator_verified_status_as_public_authorization'
      ]
    }
  });
  return events;
}

export function validatePreferenceCustodyManifestV29(manifest) {
  const errors = [];
  const base = object(manifest?.base_floor);
  const control = object(manifest?.extension_control);
  const requirement = object(manifest?.identification_requirement);
  const transition = object(manifest?.frontier_transition);
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V29_SCHEMA_VERSION) errors.push('preference custody v29 manifest schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v29') errors.push('manifest_id must remain preference-custody-laboratory-floor-v29');
  if (manifest?.control_issue !== 815) errors.push('v29 control issue must remain 815');
  if (manifest?.status !== 'synthetic_control_floor_extension') errors.push('v29 manifest status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('v29 manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v29 manifest counts_toward_thesis_evidence', errors);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v28') errors.push('v29 base manifest must remain floor v28');
  if (!text(base.source_manifest_path) || base.expected_build_schema !== 'preference-custody-control-manifest-v28-build@1' || base.expected_control_count !== 30) errors.push('v29 base floor contract is incomplete');
  if (control.control_id !== 'PC-31') errors.push('v29 extension control must remain PC-31');
  if (control.fixture_id !== 'same-service-denominator-verified-status-different-operational-states-v1') errors.push('PC-31 fixture identity mismatch');
  if (control.failure_class !== 'service_denominator_unserved_population_attempt_queue_rationing_denial_completion_and_lineage_equifinality') errors.push('PC-31 failure class mismatch');
  if (!text(control.source_fixture_path) || !text(control.build_artifact_path) || control.expected_build_schema !== 'preference-service-denominator-assurance-build@1') errors.push('PC-31 source or build contract is incomplete');
  if (unique(control.required_refusal_rules).length !== 17) errors.push('PC-31 refusal-rule contract must contain exactly seventeen unique items');
  if (requirement.stage !== 'service_denominator_eligibility_request_attempt_queue_wait_rationing_priority_denial_unserved_completion_and_lineage') errors.push('v29 identification stage mismatch');
  if (!text(requirement.required_state) || !text(requirement.refused_inference)) errors.push('v29 service-denominator identification requirement is incomplete');
  if (transition.resolved_base_frontier !== 'service_denominator_unserved_population_queue_rationing_denial_and_completion_reconciliation_governance') errors.push('v29 resolved frontier mismatch');
  if (!sameMembers(transition.successor_frontiers, REQUIRED_SUCCESSOR_FRONTIERS)) errors.push('v29 successor frontiers are incomplete');
  if (unique(manifest?.real_case_requirements_added).length !== 68) errors.push('v29 service-denominator real-case requirements must contain exactly sixty-eight unique items');
  if (array(manifest?.real_case_requirements_added).some(item => !/^[a-z0-9_]+$/.test(text(item)))) errors.push('v29 service-denominator real-case requirements must be lowercase underscore-delimited machine identifiers');
  if (unique(manifest?.prohibited_inferences).length < 16) errors.push('v29 prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id) || !text(manifest?.interpretation_contract?.what_this_is) || !text(manifest?.interpretation_contract?.what_this_is_not) || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v29 interpretation contract is incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV29(manifest, baseBuild, serviceDenominatorBuild) {
  const errors = validatePreferenceCustodyManifestV29(manifest);
  if (errors.length) throw new Error(`invalid preference custody v29 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV28Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v28 base build:\n- ${baseErrors.join('\n- ')}`);
  const extensionErrors = validatePreferenceServiceDenominatorAssuranceBuild(serviceDenominatorBuild);
  if (extensionErrors.length) throw new Error(`invalid PC-31 build:\n- ${extensionErrors.join('\n- ')}`);

  const extensionControl = summarizePc31(manifest.extension_control, serviceDenominatorBuild);
  const allRequiredRulesPresent = manifest.extension_control.required_refusal_rules.every(rule => serviceDenominatorBuild.refusal_rules.includes(rule));
  const completePathPreserved = serviceDenominatorBuild.classification.complete_service_denominator_assurance_supported_in_at_least_one_world === true;
  if (!allRequiredRulesPresent || !completePathPreserved) throw new Error('PC-31 refusal or complete-path contract failed');

  const controls = [...baseBuild.controls, extensionControl];
  const identificationRequirements = [...baseBuild.identification_requirements, manifest.identification_requirement];
  const refusalRules = unique([...baseBuild.refusal_rule_union, ...serviceDenominatorBuild.refusal_rules]);
  const openFrontiers = sorted(unique([
    ...baseBuild.open_frontiers.filter(frontier => frontier !== manifest.frontier_transition.resolved_base_frontier),
    ...manifest.frontier_transition.successor_frontiers
  ]));
  const promotionRequirements = unique([
    ...baseBuild.promotion_boundary.real_case_requires,
    ...manifest.real_case_requirements_added
  ]);
  const chain = buildV29Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements);

  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V29_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v29_qualified',
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
      base_floor_qualified: baseBuild.status === 'laboratory_floor_v28_qualified',
      base_integrity_preserved: Object.values(baseBuild.control_integrity).every(value => value === true),
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_pc31_refusal_rules_present: allRequiredRulesPresent,
      complete_service_denominator_assurance_path_preserved: completePathPreserved
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

export function validatePreferenceCustodyManifestV29Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V29_BUILD_SCHEMA_VERSION) errors.push('preference custody v29 build schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v29') errors.push('compiled v29 manifest identity mismatch');
  if (compiled?.control_issue !== 815) errors.push('compiled v29 control issue must remain 815');
  if (compiled?.status !== 'laboratory_floor_v29_qualified') errors.push('compiled v29 status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled v29 graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v29 counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v29 conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled v29 real_world_evidence_state must remain none');
  if (compiled?.control_count !== 31) errors.push('compiled v29 must preserve thirty-one controls');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v29 control IDs are incomplete');

  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v28') errors.push('compiled v29 base manifest mismatch');
  if (composition.base_control_count !== 30) errors.push('compiled v29 base control count must remain thirty');
  if (composition.extension_control_id !== 'PC-31') errors.push('compiled v29 extension control must remain PC-31');
  for (const key of ['base_floor_snapshot_sha256','extension_snapshot_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v29 ${key} is invalid`);
  if (composition.base_promotion_requirement_count !== 889) errors.push('compiled v29 base promotion requirement count must remain 889');
  if (composition.added_promotion_requirement_count !== 68) errors.push('compiled v29 must add exactly sixty-eight promotion requirements');
  if (composition.final_promotion_requirement_count !== composition.base_promotion_requirement_count + composition.added_promotion_requirement_count) errors.push('compiled v29 promotion requirement counts do not reconcile');
  if (composition.final_promotion_requirement_count !== 957) errors.push('compiled v29 final promotion requirement count must remain 957');
  if (composition.final_promotion_requirement_count !== unique(compiled?.promotion_boundary?.real_case_requires).length) errors.push('compiled v29 final promotion count does not match the promotion boundary');

  const integrity = object(compiled?.control_integrity);
  for (const key of [
    'base_floor_qualified','base_integrity_preserved','all_graph_effect_none','no_thesis_evidence_consumption',
    'no_real_world_conclusion','no_preference_change_claim','no_intent_inference',
    'all_required_pc31_refusal_rules_present','complete_service_denominator_assurance_path_preserved'
  ]) if (integrity[key] !== true) errors.push(`compiled v29 control_integrity.${key} must be true`);

  const pc31 = array(compiled?.controls).find(control => control.control_id === 'PC-31');
  if (!pc31) errors.push('compiled v29 PC-31 control is missing');
  else {
    const proof = object(pc31.proof_summary);
    for (const [key, value] of Object.entries(EXPECTED_SERVICE_DENOMINATOR_METRICS)) if (proof[key] !== value) errors.push(`PC-31 ${key} must equal ${value}`);
    for (const key of FALSE_SERVICE_DENOMINATOR_CLASSIFICATIONS) if (proof[key] !== false) errors.push(`PC-31 ${key} must remain false`);
    if (proof.complete_service_denominator_assurance_supported_in_at_least_one_world !== true) errors.push('PC-31 must preserve one complete service-denominator assurance path');
  }

  if (!array(compiled?.identification_requirements).some(item => item.stage === 'service_denominator_eligibility_request_attempt_queue_wait_rationing_priority_denial_unserved_completion_and_lineage')) errors.push('compiled v29 service-denominator identification stage is missing');
  if (array(compiled?.open_frontiers).includes('service_denominator_unserved_population_queue_rationing_denial_and_completion_reconciliation_governance')) errors.push('compiled v29 must remove the resolved broad service-denominator frontier');
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v29 successor frontier missing: ${frontier}`);
  if (!array(compiled?.open_frontiers).includes(INDEPENDENT_PRICE_ACCESS_FRONTIER)) errors.push('compiled v29 must preserve the independent price-access-quality frontier');
  if (!array(compiled?.open_frontiers).includes(INDEPENDENT_STRATEGIC_FRONTIER)) errors.push('compiled v29 must preserve the independent strategic-equilibrium frontier');
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v29 laboratory_controls_are_real_world_evidence', errors);

  const chain = array(compiled?.custody_chain);
  if (chain.length !== 5) errors.push('compiled v29 custody chain must contain five events');
  const seen = new Set();
  let previous = null;
  for (const event of chain) {
    if (!text(event?.event_id)) errors.push('compiled v29 custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate compiled v29 event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`compiled v29 event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`compiled v29 event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`compiled v29 event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (!/^[0-9a-f]{64}$/.test(text(compiled?.custody_chain_head_sha256))) errors.push('compiled v29 custody head is invalid');
  if (chain.at(-1)?.event_sha256 !== compiled?.custody_chain_head_sha256) errors.push('compiled v29 custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v29 caveat is required');
  return errors;
}

export function renderPreferenceCustodyManifestV29Markdown(compiled) {
  const proof = compiled.controls.find(control => control.control_id === 'PC-31').proof_summary;
  const lines = [
    '# Preference custody laboratory floor v29','',
    `**Status:** ${compiled.status}`,'',
    `**Controls:** ${compiled.control_count}`,'',
    `**Composition:** ${compiled.composition.base_manifest_id} + ${compiled.composition.extension_control_id}`,'',
    `**Real-world evidence state:** ${compiled.real_world_evidence_state}`,'',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,'',
    '## Frozen base','',
    `- Base manifest: ${compiled.composition.base_manifest_id}`,
    `- Base controls: ${compiled.composition.base_control_count}`,
    `- Base snapshot: ${compiled.composition.base_floor_snapshot_sha256}`,
    `- Added promotion requirements: ${compiled.composition.added_promotion_requirement_count}`,
    `- Final promotion requirements: ${compiled.composition.final_promotion_requirement_count}`,'',
    '## PC-31: service-denominator, unserved-population, queue, rationing, denial, and completion custody',''
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
