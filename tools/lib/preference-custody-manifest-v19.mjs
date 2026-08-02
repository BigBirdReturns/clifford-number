import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV18Build } from './preference-custody-manifest-v18.mjs';
import { validatePreferenceChoiceEffectivenessBuild } from './preference-choice-effectiveness.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V19_SCHEMA_VERSION = 'preference-custody-control-manifest-v19@1';
export const PREFERENCE_CUSTODY_MANIFEST_V19_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v19-build@1';

const REQUIRED_CONTROL_IDS = [
  'PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10',
  'PC-11','PC-12','PC-13','PC-14','PC-15','PC-16','PC-17','PC-18','PC-19','PC-20','PC-21'
];
const REQUIRED_SUCCESSOR_FRONTIERS = [
  'choice_architecture_exit_authorship_assent_and_payment_sequence_governance',
  'comprehension_measurement_translation_accessibility_and_transfer_assurance'
];
const EXPECTED_PC21_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_choice_effectiveness_signatures: 8,
  complete_informed_choice_worlds: 1,
  open_receipt_as_comprehension_worlds: 1,
  recognition_without_transfer_worlds: 1,
  translation_equivalence_failure_worlds: 1,
  accessibility_failure_worlds: 1,
  intended_exit_suppression_worlds: 1,
  representative_substitution_worlds: 1,
  payment_before_assent_worlds: 1,
  explicit_assent_complete_worlds: 5,
  self_authorship_complete_worlds: 5,
  independent_validation_and_correction_complete_worlds: 1,
  verified_comprehension_complete_worlds: 3,
  full_notice_delivery_worlds: 8,
  full_formal_choice_record_worlds: 8,
  same_recorded_disposition_worlds: 8,
  full_payment_worlds: 8,
  total_verified_consequence_understanding: 550,
  total_scenario_transfer_count: 505,
  total_intended_exit_count: 55,
  total_completed_exit_count: 40,
  total_suppressed_exit_intentions: 15,
  total_representative_substituted_choices: 30,
  total_inferred_assent_count: 140,
  total_payment_before_choice_count: 100,
  binding_public_authority_worlds: 0
};
const EXPECTED_FALSE_PC21_CLASSIFICATIONS = [
  'notice_delivery_or_message_open_identifies_comprehension',
  'recognition_score_identifies_consequence_understanding_or_scenario_transfer',
  'translation_availability_identifies_semantic_procedural_equivalence',
  'formal_accessibility_label_identifies_usable_access_or_assisted_comprehension',
  'formal_choice_route_identifies_self_authored_meaningful_choice',
  'recorded_exit_rate_identifies_intended_exit_or_completed_agency',
  'representative_or_operator_action_identifies_affected_person_assent',
  'payment_retention_identifies_prior_informed_agreement',
  'explicit_choice_field_identifies_valid_explicit_assent_receipt',
  'same_recorded_disposition_identifies_same_comprehension_intention_choice_or_authority',
  'comprehension_or_exit_failure_identifies_coercion_manipulation_breach_misconduct_or_intent',
  'public_informed_choice_complete_status_identifies_validated_accessible_self_authored_correctable_authorized_choice',
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

function summarizePc21(control, build) {
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
      ...Object.fromEntries(Object.keys(EXPECTED_PC21_METRICS).map(key => [key, build.metrics?.[key]])),
      ...Object.fromEntries(EXPECTED_FALSE_PC21_CLASSIFICATIONS.map(key => [key, build.classification?.[key]])),
      complete_informed_choice_supported_in_at_least_one_world: build.classification?.complete_informed_choice_supported_in_at_least_one_world
    }
  };
}

function buildV19Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${manifest.manifest_id}:base`,
    event_type: 'qualified_v18_floor_snapshot',
    evidence_class: 'compiled_synthetic_control_floor',
    authority: 'preference_custody_v18_compiler',
    source_event_ids: [],
    payload: {
      manifest_id: baseBuild.manifest_id,
      schema_version: baseBuild.schema_version,
      control_count: baseBuild.control_count,
      snapshot_sha256: sha256(baseBuild)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:pc21`,
    event_type: 'pc21_notice_comprehension_accessibility_exit_and_assent_effectiveness_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'choice_effectiveness_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: { control: extensionControl, snapshot_sha256: sha256(extensionControl) }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'choice_effectiveness_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v19_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc21`],
    payload: { transition: manifest.frontier_transition, open_frontiers: openFrontiers }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'choice_effectiveness_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v19_compiler',
    source_event_ids: [`${manifest.manifest_id}:frontier`],
    payload: { identification_requirement: manifest.identification_requirement, real_case_requires: promotionRequirements }
  });
  push({
    event_id: `${manifest.manifest_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'preference_custody_v19_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: {
      allowed_interpretation: 'qualified twenty-one-control synthetic Preference Custody floor',
      refused_promotions: [
        'laboratory_control_as_named_comprehension_or_choice_failure',
        'delivery_open_or_acknowledgement_as_comprehension',
        'recognition_as_consequence_understanding_or_transfer',
        'translation_availability_as_semantic_or_procedural_equivalence',
        'accessibility_label_as_usable_access',
        'formal_choice_or_recorded_disposition_as_self_authored_meaningful_choice',
        'recorded_exit_as_intended_exit_or_completed_agency',
        'representative_action_as_affected_person_assent',
        'payment_retention_as_prior_informed_agreement',
        'choice_field_as_valid_assent_receipt',
        'failure_as_coercion_manipulation_breach_misconduct_or_intent',
        'public_informed_choice_status_as_authorized_choice'
      ]
    }
  });
  return events;
}

export function validatePreferenceCustodyManifestV19(manifest) {
  const errors = [];
  const base = object(manifest?.base_floor);
  const control = object(manifest?.extension_control);
  const requirement = object(manifest?.identification_requirement);
  const transition = object(manifest?.frontier_transition);
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V19_SCHEMA_VERSION) errors.push('preference custody v19 manifest schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v19') errors.push('manifest_id must remain preference-custody-laboratory-floor-v19');
  if (manifest?.status !== 'synthetic_control_floor_extension') errors.push('v19 manifest status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('v19 manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v19 manifest counts_toward_thesis_evidence', errors);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v18') errors.push('v19 base manifest must remain floor v18');
  if (!text(base.source_manifest_path) || base.expected_build_schema !== 'preference-custody-control-manifest-v18-build@1' || base.expected_control_count !== 20) errors.push('v19 base floor contract is incomplete');
  if (control.control_id !== 'PC-21') errors.push('v19 extension control must remain PC-21');
  if (control.fixture_id !== 'same-informed-choice-status-different-comprehension-agency-v1') errors.push('PC-21 fixture identity mismatch');
  if (control.failure_class !== 'notice_comprehension_accessibility_exit_and_assent_effectiveness_equifinality') errors.push('PC-21 failure class mismatch');
  if (!text(control.source_fixture_path) || !text(control.build_artifact_path) || control.expected_build_schema !== 'preference-choice-effectiveness-build@1') errors.push('PC-21 source or build contract is incomplete');
  if (unique(control.required_refusal_rules).length < 13) errors.push('PC-21 refusal-rule contract is incomplete');
  if (requirement.stage !== 'notice_comprehension_accessibility_exit_and_assent_effectiveness') errors.push('v19 identification stage mismatch');
  if (!text(requirement.required_state) || !text(requirement.refused_inference)) errors.push('v19 choice-effectiveness identification requirement is incomplete');
  if (transition.resolved_base_frontier !== 'notice_comprehension_accessibility_exit_and_assent_effectiveness') errors.push('v19 resolved frontier mismatch');
  if (!sameMembers(transition.successor_frontiers, REQUIRED_SUCCESSOR_FRONTIERS)) errors.push('v19 successor frontiers are incomplete');
  if (unique(manifest?.real_case_requirements_added).length < 46) errors.push('v19 choice-effectiveness real-case requirements are incomplete');
  if (unique(manifest?.prohibited_inferences).length < 10) errors.push('v19 prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id) || !text(manifest?.interpretation_contract?.what_this_is) || !text(manifest?.interpretation_contract?.what_this_is_not) || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v19 interpretation contract is incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV19(manifest, baseBuild, choiceBuild) {
  const errors = validatePreferenceCustodyManifestV19(manifest);
  if (errors.length) throw new Error(`invalid preference custody v19 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV18Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v18 base build:\n- ${baseErrors.join('\n- ')}`);
  const choiceErrors = validatePreferenceChoiceEffectivenessBuild(choiceBuild);
  if (choiceErrors.length) throw new Error(`invalid PC-21 build:\n- ${choiceErrors.join('\n- ')}`);
  if (baseBuild.manifest_id !== manifest.base_floor.manifest_id) throw new Error('v19 base manifest identity mismatch');
  if (baseBuild.schema_version !== manifest.base_floor.expected_build_schema) throw new Error('v19 base build schema mismatch');
  if (baseBuild.control_count !== manifest.base_floor.expected_control_count) throw new Error('v19 base control count mismatch');
  if (choiceBuild.fixture_id !== manifest.extension_control.fixture_id) throw new Error('v19 PC-21 fixture identity mismatch');
  if (choiceBuild.schema_version !== manifest.extension_control.expected_build_schema) throw new Error('v19 PC-21 build schema mismatch');
  const extensionControl = summarizePc21(manifest.extension_control, choiceBuild);
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
  const chain = buildV19Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements);
  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V19_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v19_qualified',
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
      base_floor_qualified: baseBuild.status === 'laboratory_floor_v18_qualified',
      base_integrity_preserved: Object.values(baseBuild.control_integrity).every(value => value === true),
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_pc21_refusal_rules_present: allRequiredRulesPresent
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

export function validatePreferenceCustodyManifestV19Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V19_BUILD_SCHEMA_VERSION) errors.push('preference custody v19 build schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v19') errors.push('compiled v19 manifest identity mismatch');
  if (compiled?.status !== 'laboratory_floor_v19_qualified') errors.push('compiled v19 status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled v19 graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v19 counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v19 conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled v19 real_world_evidence_state must remain none');
  if (compiled?.control_count !== 21) errors.push('compiled v19 must preserve twenty-one controls');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v19 control IDs are incomplete');
  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v18') errors.push('compiled v19 base manifest mismatch');
  if (composition.base_control_count !== 20) errors.push('compiled v19 base control count must remain twenty');
  if (composition.extension_control_id !== 'PC-21') errors.push('compiled v19 extension control must remain PC-21');
  for (const key of ['base_floor_snapshot_sha256','extension_snapshot_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v19 ${key} is invalid`);
  if (!Number.isInteger(composition.added_promotion_requirement_count) || composition.added_promotion_requirement_count < 46) errors.push('compiled v19 must add at least forty-six promotion requirements');
  if (composition.final_promotion_requirement_count !== composition.base_promotion_requirement_count + composition.added_promotion_requirement_count) errors.push('compiled v19 promotion requirement counts do not reconcile');
  if (composition.final_promotion_requirement_count !== unique(compiled?.promotion_boundary?.real_case_requires).length) errors.push('compiled v19 final promotion count does not match the promotion boundary');
  const integrity = object(compiled?.control_integrity);
  for (const key of ['base_floor_qualified','base_integrity_preserved','all_graph_effect_none','no_thesis_evidence_consumption','no_real_world_conclusion','no_preference_change_claim','no_intent_inference','all_required_pc21_refusal_rules_present']) if (integrity[key] !== true) errors.push(`compiled v19 control_integrity.${key} must be true`);
  const pc21 = array(compiled?.controls).find(control => control.control_id === 'PC-21');
  if (!pc21) errors.push('compiled v19 PC-21 control is missing');
  else {
    const proof = object(pc21.proof_summary);
    for (const [key, value] of Object.entries(EXPECTED_PC21_METRICS)) if (!close(proof[key], value)) errors.push(`PC-21 ${key} must equal ${value}`);
    for (const key of EXPECTED_FALSE_PC21_CLASSIFICATIONS) if (proof[key] !== false) errors.push(`PC-21 ${key} must remain false`);
    if (proof.complete_informed_choice_supported_in_at_least_one_world !== true) errors.push('PC-21 must preserve one complete informed-choice path');
  }
  if (!array(compiled?.identification_requirements).some(item => item.stage === 'notice_comprehension_accessibility_exit_and_assent_effectiveness')) errors.push('compiled v19 choice-effectiveness identification stage is missing');
  if (array(compiled?.open_frontiers).includes('notice_comprehension_accessibility_exit_and_assent_effectiveness')) errors.push('compiled v19 must remove the resolved broad choice-effectiveness frontier');
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v19 successor frontier missing: ${frontier}`);
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v19 laboratory_controls_are_real_world_evidence', errors);
  const seen = new Set();
  let previous = null;
  for (const event of array(compiled?.custody_chain)) {
    if (!text(event?.event_id)) errors.push('compiled v19 custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate compiled v19 event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`compiled v19 event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`compiled v19 event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`compiled v19 event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (!/^[0-9a-f]{64}$/.test(text(compiled?.custody_chain_head_sha256))) errors.push('compiled v19 custody head is invalid');
  if (array(compiled?.custody_chain).at(-1)?.event_sha256 !== compiled?.custody_chain_head_sha256) errors.push('compiled v19 custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v19 caveat is required');
  return errors;
}

export function renderPreferenceCustodyManifestV19Markdown(compiled) {
  const proof = compiled.controls.find(control => control.control_id === 'PC-21').proof_summary;
  const lines = [
    '# Preference custody laboratory floor v19','',
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
    '## PC-21: notice comprehension, accessibility, exit, and assent effectiveness',''
  ];
  for (const [key, value] of Object.entries(proof)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Floor integrity', '');
  for (const [key, value] of Object.entries(compiled.control_integrity)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Identification stages', '');
  for (const requirement of compiled.identification_requirements) lines.push(`### ${requirement.stage}`, '', `- Required state: ${requirement.required_state}`, `- Refusal: ${requirement.refused_inference}`, '');
  lines.push('## Open frontiers', '');
  for (const frontier of compiled.open_frontiers) lines.push(`- ${frontier}`);
  lines.push('', '## Promotion boundary', '', `- Laboratory controls are real-world evidence: ${compiled.promotion_boundary.laboratory_controls_are_real_world_evidence}`, `- Promotion authority: ${compiled.promotion_boundary.promotion_authority}`, '', '### Required real-case evidence', '');
  for (const item of compiled.promotion_boundary.real_case_requires) lines.push(`- ${item}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('', `**Custody head:** ${compiled.custody_chain_head_sha256}`, '');
  return lines.join('\n');
}
