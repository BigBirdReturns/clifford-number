import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV11Build } from './preference-custody-manifest-v11.mjs';
import { validatePreferenceProvenanceRecoveryBuild } from './preference-provenance-recovery.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V12_SCHEMA_VERSION = 'preference-custody-control-manifest-v12@1';
export const PREFERENCE_CUSTODY_MANIFEST_V12_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v12-build@1';

const REQUIRED_CONTROL_IDS = [
  'PC-01', 'PC-02', 'PC-03', 'PC-04', 'PC-05', 'PC-06', 'PC-07',
  'PC-08', 'PC-09', 'PC-10', 'PC-11', 'PC-12', 'PC-13', 'PC-14'
];
const REQUIRED_SUCCESSOR_FRONTIERS = [
  'cross_organizational_provenance_trust_federation_and_recovery',
  'adversarial_attribution_incentives_and_recovery_externalities'
];
const EPSILON = 1e-12;

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set(array(values).map(value => text(value)).filter(Boolean))];
}

function sorted(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function sameMembers(left, right) {
  return JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
}

function close(left, right, tolerance = EPSILON) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  }
  return value;
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(canonicalValue(value))).digest('hex');
}

function requireFalse(value, label, errors) {
  if (value !== false) errors.push(`${label} must remain false`);
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function summarizePc14(control, build) {
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
      world_count: build.metrics?.world_count,
      distinct_public_headline_signatures: build.metrics?.distinct_public_headline_signatures,
      distinct_final_disposition_signatures: build.metrics?.distinct_final_disposition_signatures,
      distinct_attack_recovery_signatures: build.metrics?.distinct_attack_recovery_signatures,
      clean_execution_worlds: build.metrics?.clean_execution_worlds,
      attack_present_worlds: build.metrics?.attack_present_worlds,
      detected_attack_worlds: build.metrics?.detected_attack_worlds,
      undetected_attack_worlds: build.metrics?.undetected_attack_worlds,
      predecision_detection_worlds: build.metrics?.predecision_detection_worlds,
      postdecision_detection_worlds: build.metrics?.postdecision_detection_worlds,
      predecision_containment_worlds: build.metrics?.predecision_containment_worlds,
      postdecision_rollback_worlds: build.metrics?.postdecision_rollback_worlds,
      successful_clean_replay_worlds: build.metrics?.successful_clean_replay_worlds,
      detected_but_unrecoverable_worlds: build.metrics?.detected_but_unrecoverable_worlds,
      safe_abstention_worlds: build.metrics?.safe_abstention_worlds,
      wrong_version_active_worlds: build.metrics?.wrong_version_active_worlds,
      reference_correct_final_worlds: build.metrics?.reference_correct_final_worlds,
      cryptographically_valid_but_provenance_invalid_worlds: build.metrics?.cryptographically_valid_but_provenance_invalid_worlds,
      trust_anchor_rotation_worlds: build.metrics?.trust_anchor_rotation_worlds,
      quarantine_worlds: build.metrics?.quarantine_worlds,
      forensic_snapshot_worlds: build.metrics?.forensic_snapshot_worlds,
      rollback_worlds: build.metrics?.rollback_worlds,
      correction_required_worlds: build.metrics?.correction_required_worlds,
      correction_issued_worlds: build.metrics?.correction_issued_worlds,
      transient_exposure_worlds: build.metrics?.transient_exposure_worlds,
      residual_uncertainty_worlds: build.metrics?.residual_uncertainty_worlds,
      public_A_share: build.metrics?.public_A_share,
      valid_hash_proves_current_semantic_validity: build.classification?.valid_hash_proves_current_semantic_validity,
      valid_signature_proves_uncompromised_signer_and_authorized_content: build.classification?.valid_signature_proves_uncompromised_signer_and_authorized_content,
      correct_final_result_proves_clean_execution_path: build.classification?.correct_final_result_proves_clean_execution_path,
      attack_detection_proves_successful_recovery: build.classification?.attack_detection_proves_successful_recovery,
      quarantine_is_rollback: build.classification?.quarantine_is_rollback,
      rollback_is_deterministic_clean_replay: build.classification?.rollback_is_deterministic_clean_replay,
      replay_success_proves_no_transient_exposure_or_residual_harm: build.classification?.replay_success_proves_no_transient_exposure_or_residual_harm,
      eventual_correction_proves_no_prior_consequence: build.classification?.eventual_correction_proves_no_prior_consequence,
      unchanged_public_headline_proves_same_exact_proposal_or_implementation_state: build.classification?.unchanged_public_headline_proves_same_exact_proposal_or_implementation_state,
      missing_detector_alert_proves_clean_provenance: build.classification?.missing_detector_alert_proves_clean_provenance,
      bounded_predecision_containment_supported: build.classification?.bounded_predecision_containment_supported,
      bounded_postdecision_recovery_supported: build.classification?.bounded_postdecision_recovery_supported,
      safe_abstention_supported: build.classification?.safe_abstention_supported,
      binding_public_authority_supported: build.classification?.binding_public_authority_supported
    }
  };
}

function buildV12Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${manifest.manifest_id}:base`,
    event_type: 'qualified_v11_floor_snapshot',
    evidence_class: 'compiled_synthetic_control_floor',
    authority: 'preference_custody_v11_compiler',
    source_event_ids: [],
    payload: {
      manifest_id: baseBuild.manifest_id,
      schema_version: baseBuild.schema_version,
      control_count: baseBuild.control_count,
      snapshot_sha256: sha256(baseBuild)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:pc14`,
    event_type: 'pc14_provenance_recovery_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'provenance_recovery_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: {
      control: extensionControl,
      snapshot_sha256: sha256(extensionControl)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'provenance_recovery_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v12_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc14`],
    payload: {
      transition: manifest.frontier_transition,
      open_frontiers: openFrontiers
    }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'provenance_recovery_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v12_compiler',
    source_event_ids: [`${manifest.manifest_id}:frontier`],
    payload: {
      identification_requirement: manifest.identification_requirement,
      real_case_requires: promotionRequirements
    }
  });
  push({
    event_id: `${manifest.manifest_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'preference_custody_v12_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: {
      allowed_interpretation: 'qualified fourteen-control synthetic Preference Custody floor',
      refused_promotions: [
        'laboratory_control_as_named_incident_evidence',
        'hash_as_current_semantic_validity',
        'signature_as_signer_trust',
        'correct_result_as_clean_execution',
        'detection_as_recovery',
        'quarantine_as_rollback',
        'rollback_as_clean_replay',
        'correction_as_no_prior_consequence',
        'headline_stability_as_exact_state_continuity',
        'missing_alert_as_clean_provenance'
      ]
    }
  });
  return events;
}

export function validatePreferenceCustodyManifestV12(manifest) {
  const errors = [];
  const base = object(manifest?.base_floor);
  const control = object(manifest?.extension_control);
  const requirement = object(manifest?.identification_requirement);
  const transition = object(manifest?.frontier_transition);

  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V12_SCHEMA_VERSION) errors.push('preference custody v12 manifest schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v12') errors.push('manifest_id must remain preference-custody-laboratory-floor-v12');
  if (manifest?.status !== 'synthetic_control_floor_extension') errors.push('v12 manifest status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('v12 manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v12 manifest counts_toward_thesis_evidence', errors);

  if (base.manifest_id !== 'preference-custody-laboratory-floor-v11') errors.push('v12 base manifest must remain floor v11');
  if (!text(base.source_manifest_path) || base.expected_build_schema !== 'preference-custody-control-manifest-v11-build@1' || base.expected_control_count !== 13) errors.push('v12 base floor contract is incomplete');

  if (control.control_id !== 'PC-14') errors.push('v12 extension control must remain PC-14');
  if (control.fixture_id !== 'same-headline-different-provenance-recovery-v1') errors.push('PC-14 fixture identity mismatch');
  if (control.failure_class !== 'epistemic_adversary_provenance_attack_detection_and_recovery_equifinality') errors.push('PC-14 failure class mismatch');
  if (!text(control.source_fixture_path) || !text(control.build_artifact_path) || control.expected_build_schema !== 'preference-provenance-recovery-build@1') errors.push('PC-14 source or build contract is incomplete');
  if (unique(control.required_refusal_rules).length < 11) errors.push('PC-14 refusal-rule contract is incomplete');

  if (requirement.stage !== 'provenance_attack_detection_containment_and_recovery') errors.push('v12 identification stage mismatch');
  if (!text(requirement.required_state) || !text(requirement.refused_inference)) errors.push('v12 provenance-recovery identification requirement is incomplete');
  if (transition.resolved_base_frontier !== 'epistemic_adversaries_provenance_attack_and_recovery') errors.push('v12 resolved frontier mismatch');
  if (!sameMembers(transition.successor_frontiers, REQUIRED_SUCCESSOR_FRONTIERS)) errors.push('v12 successor frontiers are incomplete');
  if (unique(manifest?.real_case_requirements_added).length < 24) errors.push('v12 provenance-recovery real-case requirements are incomplete');
  if (unique(manifest?.prohibited_inferences).length < 10) errors.push('v12 prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id)
      || !text(manifest?.interpretation_contract?.what_this_is)
      || !text(manifest?.interpretation_contract?.what_this_is_not)
      || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v12 interpretation contract is incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV12(manifest, baseBuild, provenanceBuild) {
  const errors = validatePreferenceCustodyManifestV12(manifest);
  if (errors.length) throw new Error(`invalid preference custody v12 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV11Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v11 base build:\n- ${baseErrors.join('\n- ')}`);
  const provenanceErrors = validatePreferenceProvenanceRecoveryBuild(provenanceBuild);
  if (provenanceErrors.length) throw new Error(`invalid PC-14 build:\n- ${provenanceErrors.join('\n- ')}`);
  if (baseBuild.manifest_id !== manifest.base_floor.manifest_id) throw new Error('v12 base manifest identity mismatch');
  if (baseBuild.schema_version !== manifest.base_floor.expected_build_schema) throw new Error('v12 base build schema mismatch');
  if (baseBuild.control_count !== manifest.base_floor.expected_control_count) throw new Error('v12 base control count mismatch');
  if (provenanceBuild.fixture_id !== manifest.extension_control.fixture_id) throw new Error('v12 PC-14 fixture identity mismatch');
  if (provenanceBuild.schema_version !== manifest.extension_control.expected_build_schema) throw new Error('v12 PC-14 build schema mismatch');

  const extensionControl = summarizePc14(manifest.extension_control, provenanceBuild);
  const allRequiredRulesPresent = extensionControl.required_refusal_rules.every(rule => extensionControl.observed_refusal_rules.includes(rule));
  const controls = [...baseBuild.controls, extensionControl];
  const openFrontiers = unique([
    ...baseBuild.open_frontiers.filter(frontier => frontier !== manifest.frontier_transition.resolved_base_frontier),
    ...manifest.frontier_transition.successor_frontiers
  ]);
  const promotionRequirements = unique([
    ...baseBuild.promotion_boundary.real_case_requires,
    ...manifest.real_case_requirements_added
  ]);
  const refusalRules = unique([...baseBuild.refusal_rule_union, ...extensionControl.observed_refusal_rules]);
  const identificationRequirements = [...baseBuild.identification_requirements, manifest.identification_requirement];
  const chain = buildV12Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements);

  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V12_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v12_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    composition: {
      base_manifest_id: baseBuild.manifest_id,
      base_schema_version: baseBuild.schema_version,
      base_control_count: baseBuild.control_count,
      base_floor_snapshot_sha256: sha256(baseBuild),
      extension_control_id: extensionControl.control_id,
      extension_snapshot_sha256: sha256(extensionControl)
    },
    control_count: controls.length,
    failure_classes: sorted(controls.map(control => control.failure_class)),
    controls,
    control_integrity: {
      base_floor_qualified: baseBuild.status === 'laboratory_floor_v11_qualified',
      base_integrity_preserved: Object.values(baseBuild.control_integrity).every(value => value === true),
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_pc14_refusal_rules_present: allRequiredRulesPresent
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

export function validatePreferenceCustodyManifestV12Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V12_BUILD_SCHEMA_VERSION) errors.push('preference custody v12 build schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v12') errors.push('compiled v12 manifest identity mismatch');
  if (compiled?.status !== 'laboratory_floor_v12_qualified') errors.push('compiled v12 status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled v12 graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v12 counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v12 conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled v12 real_world_evidence_state must remain none');
  if (compiled?.control_count !== 14) errors.push('compiled v12 must preserve fourteen controls');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v12 control IDs are incomplete');

  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v11') errors.push('compiled v12 base manifest mismatch');
  if (composition.base_control_count !== 13) errors.push('compiled v12 base control count must remain thirteen');
  if (composition.extension_control_id !== 'PC-14') errors.push('compiled v12 extension control must remain PC-14');
  for (const key of ['base_floor_snapshot_sha256', 'extension_snapshot_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v12 ${key} is invalid`);

  const integrity = object(compiled?.control_integrity);
  for (const key of [
    'base_floor_qualified', 'base_integrity_preserved', 'all_graph_effect_none',
    'no_thesis_evidence_consumption', 'no_real_world_conclusion', 'no_preference_change_claim',
    'no_intent_inference', 'all_required_pc14_refusal_rules_present'
  ]) if (integrity[key] !== true) errors.push(`compiled v12 control_integrity.${key} must be true`);

  const pc14 = array(compiled?.controls).find(control => control.control_id === 'PC-14');
  if (!pc14) errors.push('compiled v12 PC-14 control is missing');
  else {
    const proof = object(pc14.proof_summary);
    const exactCounts = {
      world_count: 8,
      distinct_public_headline_signatures: 1,
      distinct_final_disposition_signatures: 3,
      distinct_attack_recovery_signatures: 8,
      clean_execution_worlds: 1,
      attack_present_worlds: 7,
      detected_attack_worlds: 6,
      undetected_attack_worlds: 1,
      predecision_detection_worlds: 3,
      postdecision_detection_worlds: 3,
      predecision_containment_worlds: 2,
      postdecision_rollback_worlds: 3,
      successful_clean_replay_worlds: 5,
      detected_but_unrecoverable_worlds: 1,
      safe_abstention_worlds: 1,
      wrong_version_active_worlds: 1,
      reference_correct_final_worlds: 6,
      cryptographically_valid_but_provenance_invalid_worlds: 5,
      trust_anchor_rotation_worlds: 1,
      quarantine_worlds: 6,
      forensic_snapshot_worlds: 6,
      rollback_worlds: 3,
      correction_required_worlds: 3,
      correction_issued_worlds: 3,
      transient_exposure_worlds: 3,
      residual_uncertainty_worlds: 4
    };
    for (const [key, value] of Object.entries(exactCounts)) if (proof[key] !== value) errors.push(`PC-14 ${key} must equal ${value}`);
    if (!close(proof.public_A_share, 0.8)) errors.push('PC-14 must preserve the frozen public 80 percent A-family headline');
    for (const key of [
      'valid_hash_proves_current_semantic_validity',
      'valid_signature_proves_uncompromised_signer_and_authorized_content',
      'correct_final_result_proves_clean_execution_path',
      'attack_detection_proves_successful_recovery',
      'quarantine_is_rollback',
      'rollback_is_deterministic_clean_replay',
      'replay_success_proves_no_transient_exposure_or_residual_harm',
      'eventual_correction_proves_no_prior_consequence',
      'unchanged_public_headline_proves_same_exact_proposal_or_implementation_state',
      'missing_detector_alert_proves_clean_provenance',
      'binding_public_authority_supported'
    ]) if (proof[key] !== false) errors.push(`PC-14 ${key} must remain false`);
    if (proof.bounded_predecision_containment_supported !== true) errors.push('PC-14 must preserve bounded predecision containment');
    if (proof.bounded_postdecision_recovery_supported !== true) errors.push('PC-14 must preserve bounded postdecision recovery');
    if (proof.safe_abstention_supported !== true) errors.push('PC-14 must preserve safe abstention');
  }

  if (!array(compiled?.identification_requirements).some(item => item.stage === 'provenance_attack_detection_containment_and_recovery')) errors.push('compiled v12 provenance-recovery identification stage is missing');
  if (array(compiled?.open_frontiers).includes('epistemic_adversaries_provenance_attack_and_recovery')) errors.push('compiled v12 must remove the resolved broad provenance-recovery frontier');
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v12 successor frontier missing: ${frontier}`);
  if (unique(compiled?.promotion_boundary?.real_case_requires).length < 100) errors.push('compiled v12 real-case promotion requirements are incomplete');
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v12 laboratory_controls_are_real_world_evidence', errors);

  const seen = new Set();
  let previous = null;
  for (const event of array(compiled?.custody_chain)) {
    if (!text(event?.event_id)) errors.push('compiled v12 custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate compiled v12 event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`compiled v12 event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`compiled v12 event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`compiled v12 event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (!/^[0-9a-f]{64}$/.test(text(compiled?.custody_chain_head_sha256))) errors.push('compiled v12 custody head is invalid');
  if (array(compiled?.custody_chain).at(-1)?.event_sha256 !== compiled?.custody_chain_head_sha256) errors.push('compiled v12 custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v12 caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPreferenceCustodyManifestV12Markdown(compiled) {
  const proof = compiled.controls.find(control => control.control_id === 'PC-14').proof_summary;
  const lines = [
    '# Preference custody laboratory floor v12',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Controls:** ${compiled.control_count}`,
    '',
    `**Composition:** ${compiled.composition.base_manifest_id} + ${compiled.composition.extension_control_id}`,
    '',
    `**Real-world evidence state:** ${compiled.real_world_evidence_state}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Frozen base',
    '',
    `- Base manifest: ${compiled.composition.base_manifest_id}`,
    `- Base controls: ${compiled.composition.base_control_count}`,
    `- Base snapshot: ${compiled.composition.base_floor_snapshot_sha256}`,
    '',
    '## PC-14: provenance attack, quarantine, rollback, and recovery',
    ''
  ];
  for (const [key, value] of Object.entries(proof)) {
    const rendered = typeof value === 'number' && value >= 0 && value <= 1 && !Number.isInteger(value) ? percentage(value) : value;
    lines.push(`- ${key}: ${rendered}`);
  }
  lines.push('', '## Floor integrity', '');
  for (const [key, value] of Object.entries(compiled.control_integrity)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Identification stages', '');
  for (const requirement of compiled.identification_requirements) {
    lines.push(`### ${requirement.stage}`, '');
    lines.push(`- Required state: ${requirement.required_state}`);
    lines.push(`- Refusal: ${requirement.refused_inference}`, '');
  }
  lines.push('## Open frontiers', '');
  for (const frontier of compiled.open_frontiers) lines.push(`- ${frontier}`);
  lines.push('', '## Promotion boundary', '');
  lines.push(`- Laboratory controls are real-world evidence: ${compiled.promotion_boundary.laboratory_controls_are_real_world_evidence}`);
  lines.push(`- Promotion authority: ${compiled.promotion_boundary.promotion_authority}`, '', '### Required real-case evidence', '');
  for (const item of compiled.promotion_boundary.real_case_requires) lines.push(`- ${item}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('', `**Custody head:** ${compiled.custody_chain_head_sha256}`, '');
  return lines.join('\n');
}
