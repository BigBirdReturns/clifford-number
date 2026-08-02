import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV13Build } from './preference-custody-manifest-v13.mjs';
import { validatePreferenceLiabilityRemedyBuild } from './preference-liability-remedy.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V14_SCHEMA_VERSION = 'preference-custody-control-manifest-v14@1';
export const PREFERENCE_CUSTODY_MANIFEST_V14_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v14-build@1';

const REQUIRED_CONTROL_IDS = [
  'PC-01', 'PC-02', 'PC-03', 'PC-04', 'PC-05', 'PC-06', 'PC-07', 'PC-08',
  'PC-09', 'PC-10', 'PC-11', 'PC-12', 'PC-13', 'PC-14', 'PC-15', 'PC-16'
];
const REQUIRED_SUCCESSOR_FRONTIERS = [
  'cross_jurisdiction_contribution_subrogation_and_insurance_succession',
  'public_remedy_enforcement_insolvency_and_collective_claim_governance'
];
const EXPECTED_PC16_METRICS = {
  world_count: 8,
  distinct_liability_remedy_signatures: 8,
  distinct_public_status_signatures: 1,
  complete_governance_and_remedy_worlds: 1,
  complete_affected_party_compensation_worlds: 2,
  direct_standing_absent_worlds: 3,
  liability_cap_worlds: 1,
  circular_indemnity_worlds: 1,
  upstream_disclaimer_worlds: 1,
  insurance_exclusion_worlds: 1,
  forum_fragmentation_worlds: 2,
  causation_burden_block_worlds: 1,
  insurance_payment_worlds: 1,
  customer_concentrated_loss_worlds: 1,
  externalized_loss_worlds: 6,
  unresolved_liability_worlds: 4,
  total_paid_across_worlds: 10750,
  total_affected_party_compensation_paid: 5000,
  total_uncompensated_affected_party_harm: 11000,
  total_externalized_loss: 17250,
  maximum_enforcement_delay_days: 365,
  binding_public_authority_worlds: 0
};
const EXPECTED_FALSE_PC16_CLASSIFICATIONS = [
  'technical_recovery_identifies_loss_allocation',
  'vendor_indemnity_identifies_direct_public_remedy',
  'contractual_indemnity_identifies_payment',
  'liability_cap_identifies_complete_compensation',
  'insurance_policy_identifies_covered_or_paid_claim',
  'claim_acceptance_identifies_full_indemnification',
  'customer_payment_identifies_correct_cross_organizational_allocation',
  'forum_availability_identifies_timely_enforceable_remedy',
  'public_recovered_status_identifies_compensated_population',
  'correction_identifies_monetary_or_nonmonetary_restoration',
  'uncompensated_loss_establishes_breach_misconduct_or_intent',
  'binding_public_authority_supported'
];
const EXPECTED_TRUE_PC16_CLASSIFICATIONS = [
  'complete_joint_allocation_supported_in_at_least_one_world',
  'complete_affected_party_compensation_supported_in_at_least_one_world'
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

function summarizePc16(control, build) {
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
      ...Object.fromEntries(Object.keys(EXPECTED_PC16_METRICS).map(key => [key, build.metrics?.[key]])),
      ...Object.fromEntries(EXPECTED_FALSE_PC16_CLASSIFICATIONS.map(key => [key, build.classification?.[key]])),
      ...Object.fromEntries(EXPECTED_TRUE_PC16_CLASSIFICATIONS.map(key => [key, build.classification?.[key]]))
    }
  };
}

function buildV14Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${manifest.manifest_id}:base`,
    event_type: 'qualified_v13_floor_snapshot',
    evidence_class: 'compiled_synthetic_control_floor',
    authority: 'preference_custody_v13_compiler',
    source_event_ids: [],
    payload: {
      manifest_id: baseBuild.manifest_id,
      schema_version: baseBuild.schema_version,
      control_count: baseBuild.control_count,
      snapshot_sha256: sha256(baseBuild)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:pc16`,
    event_type: 'pc16_federated_liability_and_public_remedy_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'liability_remedy_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: {
      control: extensionControl,
      snapshot_sha256: sha256(extensionControl)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'liability_remedy_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v14_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc16`],
    payload: {
      transition: manifest.frontier_transition,
      open_frontiers: openFrontiers
    }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'liability_remedy_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v14_compiler',
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
    authority: 'preference_custody_v14_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: {
      allowed_interpretation: 'qualified sixteen-control synthetic Preference Custody floor',
      refused_promotions: [
        'laboratory_control_as_named_liability_finding',
        'technical_recovery_as_loss_allocation',
        'indemnity_or_policy_as_payment',
        'organizational_indemnity_as_direct_public_remedy',
        'cap_or_partial_payment_as_complete_compensation',
        'customer_payment_as_correct_federated_allocation',
        'forum_or_appeal_as_timely_enforcement',
        'uncompensated_loss_as_breach_negligence_misconduct_or_intent',
        'compensation_as_binding_public_authority'
      ]
    }
  });
  return events;
}

export function validatePreferenceCustodyManifestV14(manifest) {
  const errors = [];
  const base = object(manifest?.base_floor);
  const control = object(manifest?.extension_control);
  const requirement = object(manifest?.identification_requirement);
  const transition = object(manifest?.frontier_transition);

  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V14_SCHEMA_VERSION) errors.push('preference custody v14 manifest schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v14') errors.push('manifest_id must remain preference-custody-laboratory-floor-v14');
  if (manifest?.status !== 'synthetic_control_floor_extension') errors.push('v14 manifest status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('v14 manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v14 manifest counts_toward_thesis_evidence', errors);

  if (base.manifest_id !== 'preference-custody-laboratory-floor-v13') errors.push('v14 base manifest must remain floor v13');
  if (!text(base.source_manifest_path) || base.expected_build_schema !== 'preference-custody-control-manifest-v13-build@1' || base.expected_control_count !== 15) errors.push('v14 base floor contract is incomplete');

  if (control.control_id !== 'PC-16') errors.push('v14 extension control must remain PC-16');
  if (control.fixture_id !== 'same-recovery-different-liability-remedy-v1') errors.push('PC-16 fixture identity mismatch');
  if (control.failure_class !== 'federated_liability_loss_allocation_insurance_and_public_remedy_equifinality') errors.push('PC-16 failure class mismatch');
  if (!text(control.source_fixture_path) || !text(control.build_artifact_path) || control.expected_build_schema !== 'preference-liability-remedy-build@1') errors.push('PC-16 source or build contract is incomplete');
  if (unique(control.required_refusal_rules).length < 12) errors.push('PC-16 refusal-rule contract is incomplete');

  if (requirement.stage !== 'federated_liability_loss_allocation_insurance_and_public_remedy') errors.push('v14 identification stage mismatch');
  if (!text(requirement.required_state) || !text(requirement.refused_inference)) errors.push('v14 liability-remedy identification requirement is incomplete');
  if (transition.resolved_base_frontier !== 'federated_trust_governance_liability_and_public_remedy') errors.push('v14 resolved frontier mismatch');
  if (!sameMembers(transition.successor_frontiers, REQUIRED_SUCCESSOR_FRONTIERS)) errors.push('v14 successor frontiers are incomplete');
  if (unique(manifest?.real_case_requirements_added).length < 30) errors.push('v14 liability-remedy real-case requirements are incomplete');
  if (unique(manifest?.prohibited_inferences).length < 10) errors.push('v14 prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id)
      || !text(manifest?.interpretation_contract?.what_this_is)
      || !text(manifest?.interpretation_contract?.what_this_is_not)
      || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v14 interpretation contract is incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV14(manifest, baseBuild, liabilityBuild) {
  const errors = validatePreferenceCustodyManifestV14(manifest);
  if (errors.length) throw new Error(`invalid preference custody v14 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV13Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v13 base build:\n- ${baseErrors.join('\n- ')}`);
  const liabilityErrors = validatePreferenceLiabilityRemedyBuild(liabilityBuild);
  if (liabilityErrors.length) throw new Error(`invalid PC-16 build:\n- ${liabilityErrors.join('\n- ')}`);
  if (baseBuild.manifest_id !== manifest.base_floor.manifest_id) throw new Error('v14 base manifest identity mismatch');
  if (baseBuild.schema_version !== manifest.base_floor.expected_build_schema) throw new Error('v14 base build schema mismatch');
  if (baseBuild.control_count !== manifest.base_floor.expected_control_count) throw new Error('v14 base control count mismatch');
  if (liabilityBuild.fixture_id !== manifest.extension_control.fixture_id) throw new Error('v14 PC-16 fixture identity mismatch');
  if (liabilityBuild.schema_version !== manifest.extension_control.expected_build_schema) throw new Error('v14 PC-16 build schema mismatch');

  const extensionControl = summarizePc16(manifest.extension_control, liabilityBuild);
  const allRequiredRulesPresent = extensionControl.required_refusal_rules.every(rule => extensionControl.observed_refusal_rules.includes(rule));
  const controls = [...baseBuild.controls, extensionControl];
  const openFrontiers = unique([
    ...baseBuild.open_frontiers.filter(frontier => frontier !== manifest.frontier_transition.resolved_base_frontier),
    ...manifest.frontier_transition.successor_frontiers
  ]);
  const addedPromotionRequirements = unique(manifest.real_case_requirements_added).filter(item => !baseBuild.promotion_boundary.real_case_requires.includes(item));
  const promotionRequirements = unique([
    ...baseBuild.promotion_boundary.real_case_requires,
    ...manifest.real_case_requirements_added
  ]);
  const refusalRules = unique([...baseBuild.refusal_rule_union, ...extensionControl.observed_refusal_rules]);
  const identificationRequirements = [...baseBuild.identification_requirements, manifest.identification_requirement];
  const chain = buildV14Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements);

  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V14_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v14_qualified',
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
      base_floor_qualified: baseBuild.status === 'laboratory_floor_v13_qualified',
      base_integrity_preserved: Object.values(baseBuild.control_integrity).every(value => value === true),
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_pc16_refusal_rules_present: allRequiredRulesPresent
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

export function validatePreferenceCustodyManifestV14Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V14_BUILD_SCHEMA_VERSION) errors.push('preference custody v14 build schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v14') errors.push('compiled v14 manifest identity mismatch');
  if (compiled?.status !== 'laboratory_floor_v14_qualified') errors.push('compiled v14 status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled v14 graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v14 counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v14 conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled v14 real_world_evidence_state must remain none');
  if (compiled?.control_count !== 16) errors.push('compiled v14 must preserve sixteen controls');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v14 control IDs are incomplete');

  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v13') errors.push('compiled v14 base manifest mismatch');
  if (composition.base_control_count !== 15) errors.push('compiled v14 base control count must remain fifteen');
  if (composition.extension_control_id !== 'PC-16') errors.push('compiled v14 extension control must remain PC-16');
  for (const key of ['base_floor_snapshot_sha256','extension_snapshot_sha256']) {
    if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v14 ${key} is invalid`);
  }
  if (!Number.isInteger(composition.base_promotion_requirement_count) || composition.base_promotion_requirement_count <= 0) errors.push('compiled v14 base promotion requirement count is invalid');
  if (!Number.isInteger(composition.added_promotion_requirement_count) || composition.added_promotion_requirement_count < 30) errors.push('compiled v14 must add at least thirty promotion requirements');
  if (composition.final_promotion_requirement_count !== composition.base_promotion_requirement_count + composition.added_promotion_requirement_count) errors.push('compiled v14 promotion requirement counts do not reconcile');
  if (composition.final_promotion_requirement_count !== unique(compiled?.promotion_boundary?.real_case_requires).length) errors.push('compiled v14 final promotion count does not match the promotion boundary');

  const integrity = object(compiled?.control_integrity);
  for (const key of [
    'base_floor_qualified','base_integrity_preserved','all_graph_effect_none',
    'no_thesis_evidence_consumption','no_real_world_conclusion','no_preference_change_claim',
    'no_intent_inference','all_required_pc16_refusal_rules_present'
  ]) if (integrity[key] !== true) errors.push(`compiled v14 control_integrity.${key} must be true`);

  const pc16 = array(compiled?.controls).find(control => control.control_id === 'PC-16');
  if (!pc16) errors.push('compiled v14 PC-16 control is missing');
  else {
    const proof = object(pc16.proof_summary);
    for (const [key, value] of Object.entries(EXPECTED_PC16_METRICS)) {
      if (!close(proof[key], value)) errors.push(`PC-16 ${key} must equal ${value}`);
    }
    for (const key of EXPECTED_FALSE_PC16_CLASSIFICATIONS) if (proof[key] !== false) errors.push(`PC-16 ${key} must remain false`);
    for (const key of EXPECTED_TRUE_PC16_CLASSIFICATIONS) if (proof[key] !== true) errors.push(`PC-16 ${key} must remain true`);
  }

  if (!array(compiled?.identification_requirements).some(item => item.stage === 'federated_liability_loss_allocation_insurance_and_public_remedy')) errors.push('compiled v14 liability-remedy identification stage is missing');
  if (array(compiled?.open_frontiers).includes('federated_trust_governance_liability_and_public_remedy')) errors.push('compiled v14 must remove the resolved broad liability-remedy frontier');
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v14 successor frontier missing: ${frontier}`);
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v14 laboratory_controls_are_real_world_evidence', errors);

  const seen = new Set();
  let previous = null;
  for (const event of array(compiled?.custody_chain)) {
    if (!text(event?.event_id)) errors.push('compiled v14 custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate compiled v14 event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`compiled v14 event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`compiled v14 event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`compiled v14 event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (!/^[0-9a-f]{64}$/.test(text(compiled?.custody_chain_head_sha256))) errors.push('compiled v14 custody head is invalid');
  if (array(compiled?.custody_chain).at(-1)?.event_sha256 !== compiled?.custody_chain_head_sha256) errors.push('compiled v14 custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v14 caveat is required');
  return errors;
}

export function renderPreferenceCustodyManifestV14Markdown(compiled) {
  const proof = compiled.controls.find(control => control.control_id === 'PC-16').proof_summary;
  const lines = [
    '# Preference custody laboratory floor v14',
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
    `- Added promotion requirements: ${compiled.composition.added_promotion_requirement_count}`,
    '',
    '## PC-16: federated liability, insurance, payment, and public remedy',
    ''
  ];
  for (const [key, value] of Object.entries(proof)) lines.push(`- ${key}: ${value}`);
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
