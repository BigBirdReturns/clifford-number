import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV17Build } from './preference-custody-manifest-v17.mjs';
import { validatePreferenceReleaseAuthorityBuild } from './preference-release-authority.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V18_SCHEMA_VERSION = 'preference-custody-control-manifest-v18@1';
export const PREFERENCE_CUSTODY_MANIFEST_V18_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v18-build@1';

const REQUIRED_CONTROL_IDS = [
  'PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10',
  'PC-11','PC-12','PC-13','PC-14','PC-15','PC-16','PC-17','PC-18','PC-19','PC-20'
];
const REQUIRED_SUCCESSOR_FRONTIERS = [
  'notice_comprehension_accessibility_exit_and_assent_effectiveness',
  'release_text_future_unknown_claim_scope_and_nonparty_binding_governance'
];
const EXPECTED_PC20_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_release_authority_signatures: 8,
  complete_notice_exit_release_worlds: 1,
  delivery_without_comprehension_worlds: 4,
  notice_overload_worlds: 1,
  accessibility_failure_worlds: 1,
  meaningful_exit_failure_worlds: 5,
  release_scope_drift_worlds: 2,
  future_claim_release_worlds: 2,
  nonparticipant_binding_worlds: 1,
  payment_as_consent_worlds: 1,
  approved_binding_version_mismatch_worlds: 2,
  independent_review_and_correction_complete_worlds: 1,
  notice_comprehension_complete_worlds: 4,
  full_notice_delivery_worlds: 8,
  full_affected_payment_worlds: 8,
  total_affected_people_without_notice_comprehension: 245,
  total_failed_optout_attempts: 55,
  total_nonparticipant_bound_people: 20,
  binding_public_authority_worlds: 0
};
const EXPECTED_FALSE_PC20_CLASSIFICATIONS = [
  'notice_delivery_identifies_received_understood_accessible_usable_notice',
  'formal_optout_identifies_meaningful_exit',
  'payment_acceptance_identifies_informed_release_agreement',
  'approval_or_collective_judgment_identifies_consent_by_every_bound_person',
  'approved_release_identifies_binding_release',
  'release_label_identifies_operative_text_version_scope_or_time_horizon',
  'narrow_disclosed_release_identifies_narrow_binding_release',
  'representation_confers_authority_to_bind_nonparticipants_or_future_claimants',
  'full_compensation_identifies_informed_release_or_objective_control',
  'objection_or_appeal_identifies_effective_explanation_correction_or_exit',
  'release_overbreadth_or_comprehension_failure_identifies_breach_coercion_misconduct_or_intent',
  'public_all_claims_released_status_identifies_complete_informed_accessible_exit_capable_authorized_release',
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

function summarizePc20(control, build) {
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
      ...Object.fromEntries(Object.keys(EXPECTED_PC20_METRICS).map(key => [key, build.metrics?.[key]])),
      ...Object.fromEntries(EXPECTED_FALSE_PC20_CLASSIFICATIONS.map(key => [key, build.classification?.[key]])),
      complete_notice_exit_release_supported_in_at_least_one_world: build.classification?.complete_notice_exit_release_supported_in_at_least_one_world
    }
  };
}

function buildV18Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${manifest.manifest_id}:base`,
    event_type: 'qualified_v17_floor_snapshot',
    evidence_class: 'compiled_synthetic_control_floor',
    authority: 'preference_custody_v17_compiler',
    source_event_ids: [],
    payload: {
      manifest_id: baseBuild.manifest_id,
      schema_version: baseBuild.schema_version,
      control_count: baseBuild.control_count,
      snapshot_sha256: sha256(baseBuild)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:pc20`,
    event_type: 'pc20_release_notice_exit_and_binding_authority_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'release_authority_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: { control: extensionControl, snapshot_sha256: sha256(extensionControl) }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'release_authority_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v18_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc20`],
    payload: { transition: manifest.frontier_transition, open_frontiers: openFrontiers }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'release_authority_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v18_compiler',
    source_event_ids: [`${manifest.manifest_id}:frontier`],
    payload: { identification_requirement: manifest.identification_requirement, real_case_requires: promotionRequirements }
  });
  push({
    event_id: `${manifest.manifest_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'preference_custody_v18_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: {
      allowed_interpretation: 'qualified twenty-control synthetic Preference Custody floor',
      refused_promotions: [
        'laboratory_control_as_named_notice_or_release_failure',
        'notice_delivery_as_comprehension_accessibility_or_usability',
        'formal_optout_as_meaningful_exit',
        'payment_acceptance_as_informed_release_agreement',
        'approval_or_judgment_as_consent_by_every_bound_person',
        'approved_or_disclosed_release_as_binding_release',
        'representation_as_authority_over_nonparticipants_or_future_claimants',
        'full_compensation_as_informed_release_or_objective_control',
        'objection_or_appeal_as_effective_explanation_correction_or_exit',
        'release_overbreadth_as_breach_coercion_misconduct_or_intent',
        'public_all_claims_released_status_as_authorized_release'
      ]
    }
  });
  return events;
}

export function validatePreferenceCustodyManifestV18(manifest) {
  const errors = [];
  const base = object(manifest?.base_floor);
  const control = object(manifest?.extension_control);
  const requirement = object(manifest?.identification_requirement);
  const transition = object(manifest?.frontier_transition);
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V18_SCHEMA_VERSION) errors.push('preference custody v18 manifest schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v18') errors.push('manifest_id must remain preference-custody-laboratory-floor-v18');
  if (manifest?.status !== 'synthetic_control_floor_extension') errors.push('v18 manifest status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('v18 manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v18 manifest counts_toward_thesis_evidence', errors);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v17') errors.push('v18 base manifest must remain floor v17');
  if (!text(base.source_manifest_path) || base.expected_build_schema !== 'preference-custody-control-manifest-v17-build@1' || base.expected_control_count !== 19) errors.push('v18 base floor contract is incomplete');
  if (control.control_id !== 'PC-20') errors.push('v18 extension control must remain PC-20');
  if (control.fixture_id !== 'same-all-claims-released-status-different-notice-exit-authority-v1') errors.push('PC-20 fixture identity mismatch');
  if (control.failure_class !== 'release_scope_notice_comprehension_collective_exit_and_binding_authority_equifinality') errors.push('PC-20 failure class mismatch');
  if (!text(control.source_fixture_path) || !text(control.build_artifact_path) || control.expected_build_schema !== 'preference-release-authority-build@1') errors.push('PC-20 source or build contract is incomplete');
  if (unique(control.required_refusal_rules).length < 13) errors.push('PC-20 refusal-rule contract is incomplete');
  if (requirement.stage !== 'release_scope_notice_comprehension_collective_exit_and_binding_authority') errors.push('v18 identification stage mismatch');
  if (!text(requirement.required_state) || !text(requirement.refused_inference)) errors.push('v18 release-authority identification requirement is incomplete');
  if (transition.resolved_base_frontier !== 'release_scope_notice_comprehension_and_collective_exit_authority') errors.push('v18 resolved frontier mismatch');
  if (!sameMembers(transition.successor_frontiers, REQUIRED_SUCCESSOR_FRONTIERS)) errors.push('v18 successor frontiers are incomplete');
  if (unique(manifest?.real_case_requirements_added).length < 42) errors.push('v18 release-authority real-case requirements are incomplete');
  if (unique(manifest?.prohibited_inferences).length < 10) errors.push('v18 prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id) || !text(manifest?.interpretation_contract?.what_this_is) || !text(manifest?.interpretation_contract?.what_this_is_not) || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v18 interpretation contract is incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV18(manifest, baseBuild, releaseBuild) {
  const errors = validatePreferenceCustodyManifestV18(manifest);
  if (errors.length) throw new Error(`invalid preference custody v18 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV17Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v17 base build:\n- ${baseErrors.join('\n- ')}`);
  const releaseErrors = validatePreferenceReleaseAuthorityBuild(releaseBuild);
  if (releaseErrors.length) throw new Error(`invalid PC-20 build:\n- ${releaseErrors.join('\n- ')}`);
  if (baseBuild.manifest_id !== manifest.base_floor.manifest_id) throw new Error('v18 base manifest identity mismatch');
  if (baseBuild.schema_version !== manifest.base_floor.expected_build_schema) throw new Error('v18 base build schema mismatch');
  if (baseBuild.control_count !== manifest.base_floor.expected_control_count) throw new Error('v18 base control count mismatch');
  if (releaseBuild.fixture_id !== manifest.extension_control.fixture_id) throw new Error('v18 PC-20 fixture identity mismatch');
  if (releaseBuild.schema_version !== manifest.extension_control.expected_build_schema) throw new Error('v18 PC-20 build schema mismatch');
  const extensionControl = summarizePc20(manifest.extension_control, releaseBuild);
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
  const chain = buildV18Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements);
  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V18_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v18_qualified',
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
      base_floor_qualified: baseBuild.status === 'laboratory_floor_v17_qualified',
      base_integrity_preserved: Object.values(baseBuild.control_integrity).every(value => value === true),
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_pc20_refusal_rules_present: allRequiredRulesPresent
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

export function validatePreferenceCustodyManifestV18Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V18_BUILD_SCHEMA_VERSION) errors.push('preference custody v18 build schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v18') errors.push('compiled v18 manifest identity mismatch');
  if (compiled?.status !== 'laboratory_floor_v18_qualified') errors.push('compiled v18 status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled v18 graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v18 counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v18 conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled v18 real_world_evidence_state must remain none');
  if (compiled?.control_count !== 20) errors.push('compiled v18 must preserve twenty controls');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v18 control IDs are incomplete');
  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v17') errors.push('compiled v18 base manifest mismatch');
  if (composition.base_control_count !== 19) errors.push('compiled v18 base control count must remain nineteen');
  if (composition.extension_control_id !== 'PC-20') errors.push('compiled v18 extension control must remain PC-20');
  for (const key of ['base_floor_snapshot_sha256','extension_snapshot_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v18 ${key} is invalid`);
  if (!Number.isInteger(composition.added_promotion_requirement_count) || composition.added_promotion_requirement_count < 42) errors.push('compiled v18 must add at least forty-two promotion requirements');
  if (composition.final_promotion_requirement_count !== composition.base_promotion_requirement_count + composition.added_promotion_requirement_count) errors.push('compiled v18 promotion requirement counts do not reconcile');
  if (composition.final_promotion_requirement_count !== unique(compiled?.promotion_boundary?.real_case_requires).length) errors.push('compiled v18 final promotion count does not match the promotion boundary');
  const integrity = object(compiled?.control_integrity);
  for (const key of ['base_floor_qualified','base_integrity_preserved','all_graph_effect_none','no_thesis_evidence_consumption','no_real_world_conclusion','no_preference_change_claim','no_intent_inference','all_required_pc20_refusal_rules_present']) if (integrity[key] !== true) errors.push(`compiled v18 control_integrity.${key} must be true`);
  const pc20 = array(compiled?.controls).find(control => control.control_id === 'PC-20');
  if (!pc20) errors.push('compiled v18 PC-20 control is missing');
  else {
    const proof = object(pc20.proof_summary);
    for (const [key, value] of Object.entries(EXPECTED_PC20_METRICS)) if (!close(proof[key], value)) errors.push(`PC-20 ${key} must equal ${value}`);
    for (const key of EXPECTED_FALSE_PC20_CLASSIFICATIONS) if (proof[key] !== false) errors.push(`PC-20 ${key} must remain false`);
    if (proof.complete_notice_exit_release_supported_in_at_least_one_world !== true) errors.push('PC-20 must preserve one complete notice, exit, and release path');
  }
  if (!array(compiled?.identification_requirements).some(item => item.stage === 'release_scope_notice_comprehension_collective_exit_and_binding_authority')) errors.push('compiled v18 release-authority identification stage is missing');
  if (array(compiled?.open_frontiers).includes('release_scope_notice_comprehension_and_collective_exit_authority')) errors.push('compiled v18 must remove the resolved broad release-authority frontier');
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v18 successor frontier missing: ${frontier}`);
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v18 laboratory_controls_are_real_world_evidence', errors);
  const seen = new Set();
  let previous = null;
  for (const event of array(compiled?.custody_chain)) {
    if (!text(event?.event_id)) errors.push('compiled v18 custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate compiled v18 event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`compiled v18 event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`compiled v18 event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`compiled v18 event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (!/^[0-9a-f]{64}$/.test(text(compiled?.custody_chain_head_sha256))) errors.push('compiled v18 custody head is invalid');
  if (array(compiled?.custody_chain).at(-1)?.event_sha256 !== compiled?.custody_chain_head_sha256) errors.push('compiled v18 custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v18 caveat is required');
  return errors;
}

export function renderPreferenceCustodyManifestV18Markdown(compiled) {
  const proof = compiled.controls.find(control => control.control_id === 'PC-20').proof_summary;
  const lines = [
    '# Preference custody laboratory floor v18','',
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
    '## PC-20: release scope, notice comprehension, collective exit, and binding authority',''
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
