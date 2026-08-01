import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV12Build } from './preference-custody-manifest-v12.mjs';
import { validatePreferenceTrustFederationBuild } from './preference-trust-federation.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V13_SCHEMA_VERSION = 'preference-custody-control-manifest-v13@1';
export const PREFERENCE_CUSTODY_MANIFEST_V13_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v13-build@1';

const REQUIRED_CONTROL_IDS = [
  'PC-01', 'PC-02', 'PC-03', 'PC-04', 'PC-05', 'PC-06', 'PC-07',
  'PC-08', 'PC-09', 'PC-10', 'PC-11', 'PC-12', 'PC-13', 'PC-14', 'PC-15'
];
const REQUIRED_SUCCESSOR_FRONTIERS = [
  'federated_trust_governance_liability_and_public_remedy',
  'multi_party_recovery_succession_and_service_substitution'
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

function summarizePc15(control, build) {
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
      distinct_public_status_signatures: build.metrics?.distinct_public_status_signatures,
      distinct_federation_state_signatures: build.metrics?.distinct_federation_state_signatures,
      complete_federated_recovery_worlds: build.metrics?.complete_federated_recovery_worlds,
      incomplete_federated_recovery_worlds: build.metrics?.incomplete_federated_recovery_worlds,
      public_recovered_claim_contradicted_worlds: build.metrics?.public_recovered_claim_contradicted_worlds,
      stale_cache_worlds: build.metrics?.stale_cache_worlds,
      continued_serving_worlds: build.metrics?.continued_serving_worlds,
      trust_list_lag_worlds: build.metrics?.trust_list_lag_worlds,
      contractual_authority_gap_worlds: build.metrics?.contractual_authority_gap_worlds,
      notification_remedy_gap_worlds: build.metrics?.notification_remedy_gap_worlds,
      source_restricted_abstention_worlds: build.metrics?.source_restricted_abstention_worlds,
      secondary_tenant_exposure_worlds: build.metrics?.secondary_tenant_exposure_worlds,
      full_revocation_delivery_worlds: build.metrics?.full_revocation_delivery_worlds,
      full_revocation_acknowledgement_worlds: build.metrics?.full_revocation_acknowledgement_worlds,
      full_revocation_enforcement_worlds: build.metrics?.full_revocation_enforcement_worlds,
      technical_recovery_complete_worlds: build.metrics?.technical_recovery_complete_worlds,
      public_rights_complete_worlds: build.metrics?.public_rights_complete_worlds,
      residual_exposure_worlds: build.metrics?.residual_exposure_worlds,
      zero_residual_but_incomplete_worlds: build.metrics?.zero_residual_but_incomplete_worlds,
      reference_correct_customer_worlds: build.metrics?.reference_correct_customer_worlds,
      total_residual_exposure_count: build.metrics?.total_residual_exposure_count,
      maximum_world_residual_exposure_count: build.metrics?.maximum_world_residual_exposure_count,
      public_A_share: build.metrics?.public_A_share,
      vendor_revocation_proves_federation_wide_revocation: build.classification?.vendor_revocation_proves_federation_wide_revocation,
      message_delivery_proves_acknowledgement_or_enforcement: build.classification?.message_delivery_proves_acknowledgement_or_enforcement,
      trust_list_update_proves_cache_purge: build.classification?.trust_list_update_proves_cache_purge,
      customer_rollback_proves_cloud_or_downstream_rollback: build.classification?.customer_rollback_proves_cloud_or_downstream_rollback,
      cloud_quarantine_proves_customer_implementation_stop: build.classification?.cloud_quarantine_proves_customer_implementation_stop,
      technical_capability_confers_contractual_authority: build.classification?.technical_capability_confers_contractual_authority,
      successful_replay_at_one_organization_proves_federation_recovery: build.classification?.successful_replay_at_one_organization_proves_federation_recovery,
      reference_correct_final_result_proves_synchronized_clean_path: build.classification?.reference_correct_final_result_proves_synchronized_clean_path,
      public_recovered_status_proves_notification_remedy_and_residual_closure: build.classification?.public_recovered_status_proves_notification_remedy_and_residual_closure,
      primary_tenant_recovery_proves_secondary_tenant_recovery: build.classification?.primary_tenant_recovery_proves_secondary_tenant_recovery,
      source_restriction_proves_successful_recovery_or_misconduct: build.classification?.source_restriction_proves_successful_recovery_or_misconduct,
      complete_federated_recovery_supported: build.classification?.complete_federated_recovery_supported,
      safe_partial_abstention_supported: build.classification?.safe_partial_abstention_supported,
      binding_public_authority_supported: build.classification?.binding_public_authority_supported
    }
  };
}

function buildV13Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${manifest.manifest_id}:base`,
    event_type: 'qualified_v12_floor_snapshot',
    evidence_class: 'compiled_synthetic_control_floor',
    authority: 'preference_custody_v12_compiler',
    source_event_ids: [],
    payload: {
      manifest_id: baseBuild.manifest_id,
      schema_version: baseBuild.schema_version,
      control_count: baseBuild.control_count,
      snapshot_sha256: sha256(baseBuild)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:pc15`,
    event_type: 'pc15_cross_organizational_trust_federation_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'trust_federation_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: {
      control: extensionControl,
      snapshot_sha256: sha256(extensionControl)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'trust_federation_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v13_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc15`],
    payload: {
      transition: manifest.frontier_transition,
      open_frontiers: openFrontiers
    }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'trust_federation_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v13_compiler',
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
    authority: 'preference_custody_v13_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: {
      allowed_interpretation: 'qualified fifteen-control synthetic Preference Custody floor',
      refused_promotions: [
        'laboratory_control_as_named_federation_failure',
        'issuer_revocation_as_federation_revocation',
        'delivery_as_acknowledgement_or_enforcement',
        'trust_update_as_cache_purge',
        'local_rollback_as_remote_recovery',
        'technical_capability_as_contractual_authority',
        'single_org_replay_as_federation_recovery',
        'reference_correct_result_as_synchronized_clean_path',
        'public_recovered_label_as_rights_and_exposure_closure',
        'primary_recovery_as_secondary_recovery'
      ]
    }
  });
  return events;
}

export function validatePreferenceCustodyManifestV13(manifest) {
  const errors = [];
  const base = object(manifest?.base_floor);
  const control = object(manifest?.extension_control);
  const requirement = object(manifest?.identification_requirement);
  const transition = object(manifest?.frontier_transition);

  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V13_SCHEMA_VERSION) errors.push('preference custody v13 manifest schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v13') errors.push('manifest_id must remain preference-custody-laboratory-floor-v13');
  if (manifest?.status !== 'synthetic_control_floor_extension') errors.push('v13 manifest status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('v13 manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v13 manifest counts_toward_thesis_evidence', errors);

  if (base.manifest_id !== 'preference-custody-laboratory-floor-v12') errors.push('v13 base manifest must remain floor v12');
  if (!text(base.source_manifest_path) || base.expected_build_schema !== 'preference-custody-control-manifest-v12-build@1' || base.expected_control_count !== 14) errors.push('v13 base floor contract is incomplete');

  if (control.control_id !== 'PC-15') errors.push('v13 extension control must remain PC-15');
  if (control.fixture_id !== 'same-recovered-claim-different-federation-states-v1') errors.push('PC-15 fixture identity mismatch');
  if (control.failure_class !== 'cross_organizational_provenance_trust_federation_and_recovery_equifinality') errors.push('PC-15 failure class mismatch');
  if (!text(control.source_fixture_path) || !text(control.build_artifact_path) || control.expected_build_schema !== 'preference-trust-federation-build@1') errors.push('PC-15 source or build contract is incomplete');
  if (unique(control.required_refusal_rules).length < 12) errors.push('PC-15 refusal-rule contract is incomplete');

  if (requirement.stage !== 'cross_organizational_trust_federation_and_recovery') errors.push('v13 identification stage mismatch');
  if (!text(requirement.required_state) || !text(requirement.refused_inference)) errors.push('v13 trust-federation identification requirement is incomplete');
  if (transition.resolved_base_frontier !== 'cross_organizational_provenance_trust_federation_and_recovery') errors.push('v13 resolved frontier mismatch');
  if (!sameMembers(transition.successor_frontiers, REQUIRED_SUCCESSOR_FRONTIERS)) errors.push('v13 successor frontiers are incomplete');
  if (unique(manifest?.real_case_requirements_added).length < 25) errors.push('v13 trust-federation real-case requirements are incomplete');
  if (unique(manifest?.prohibited_inferences).length < 10) errors.push('v13 prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id)
      || !text(manifest?.interpretation_contract?.what_this_is)
      || !text(manifest?.interpretation_contract?.what_this_is_not)
      || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v13 interpretation contract is incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV13(manifest, baseBuild, federationBuild) {
  const errors = validatePreferenceCustodyManifestV13(manifest);
  if (errors.length) throw new Error(`invalid preference custody v13 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV12Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v12 base build:\n- ${baseErrors.join('\n- ')}`);
  const federationErrors = validatePreferenceTrustFederationBuild(federationBuild);
  if (federationErrors.length) throw new Error(`invalid PC-15 build:\n- ${federationErrors.join('\n- ')}`);
  if (baseBuild.manifest_id !== manifest.base_floor.manifest_id) throw new Error('v13 base manifest identity mismatch');
  if (baseBuild.schema_version !== manifest.base_floor.expected_build_schema) throw new Error('v13 base build schema mismatch');
  if (baseBuild.control_count !== manifest.base_floor.expected_control_count) throw new Error('v13 base control count mismatch');
  if (federationBuild.fixture_id !== manifest.extension_control.fixture_id) throw new Error('v13 PC-15 fixture identity mismatch');
  if (federationBuild.schema_version !== manifest.extension_control.expected_build_schema) throw new Error('v13 PC-15 build schema mismatch');

  const extensionControl = summarizePc15(manifest.extension_control, federationBuild);
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
  const chain = buildV13Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements);

  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V13_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v13_qualified',
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
      base_floor_qualified: baseBuild.status === 'laboratory_floor_v12_qualified',
      base_integrity_preserved: Object.values(baseBuild.control_integrity).every(value => value === true),
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_pc15_refusal_rules_present: allRequiredRulesPresent
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

export function validatePreferenceCustodyManifestV13Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V13_BUILD_SCHEMA_VERSION) errors.push('preference custody v13 build schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v13') errors.push('compiled v13 manifest identity mismatch');
  if (compiled?.status !== 'laboratory_floor_v13_qualified') errors.push('compiled v13 status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled v13 graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v13 counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v13 conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled v13 real_world_evidence_state must remain none');
  if (compiled?.control_count !== 15) errors.push('compiled v13 must preserve fifteen controls');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v13 control IDs are incomplete');

  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v12') errors.push('compiled v13 base manifest mismatch');
  if (composition.base_control_count !== 14) errors.push('compiled v13 base control count must remain fourteen');
  if (composition.extension_control_id !== 'PC-15') errors.push('compiled v13 extension control must remain PC-15');
  for (const key of ['base_floor_snapshot_sha256', 'extension_snapshot_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v13 ${key} is invalid`);

  const integrity = object(compiled?.control_integrity);
  for (const key of [
    'base_floor_qualified', 'base_integrity_preserved', 'all_graph_effect_none',
    'no_thesis_evidence_consumption', 'no_real_world_conclusion', 'no_preference_change_claim',
    'no_intent_inference', 'all_required_pc15_refusal_rules_present'
  ]) if (integrity[key] !== true) errors.push(`compiled v13 control_integrity.${key} must be true`);

  const pc15 = array(compiled?.controls).find(control => control.control_id === 'PC-15');
  if (!pc15) errors.push('compiled v13 PC-15 control is missing');
  else {
    const proof = object(pc15.proof_summary);
    const exactCounts = {
      world_count: 8,
      distinct_public_headline_signatures: 1,
      distinct_public_status_signatures: 1,
      distinct_federation_state_signatures: 8,
      complete_federated_recovery_worlds: 1,
      incomplete_federated_recovery_worlds: 7,
      public_recovered_claim_contradicted_worlds: 7,
      stale_cache_worlds: 4,
      continued_serving_worlds: 4,
      trust_list_lag_worlds: 1,
      contractual_authority_gap_worlds: 1,
      notification_remedy_gap_worlds: 2,
      source_restricted_abstention_worlds: 1,
      secondary_tenant_exposure_worlds: 1,
      full_revocation_delivery_worlds: 4,
      full_revocation_acknowledgement_worlds: 3,
      full_revocation_enforcement_worlds: 3,
      technical_recovery_complete_worlds: 2,
      public_rights_complete_worlds: 6,
      residual_exposure_worlds: 5,
      zero_residual_but_incomplete_worlds: 2,
      reference_correct_customer_worlds: 6,
      total_residual_exposure_count: 750,
      maximum_world_residual_exposure_count: 200
    };
    for (const [key, value] of Object.entries(exactCounts)) if (proof[key] !== value) errors.push(`PC-15 ${key} must equal ${value}`);
    if (!close(proof.public_A_share, 0.8)) errors.push('PC-15 must preserve the frozen public 80 percent A-family headline');
    for (const key of [
      'vendor_revocation_proves_federation_wide_revocation',
      'message_delivery_proves_acknowledgement_or_enforcement',
      'trust_list_update_proves_cache_purge',
      'customer_rollback_proves_cloud_or_downstream_rollback',
      'cloud_quarantine_proves_customer_implementation_stop',
      'technical_capability_confers_contractual_authority',
      'successful_replay_at_one_organization_proves_federation_recovery',
      'reference_correct_final_result_proves_synchronized_clean_path',
      'public_recovered_status_proves_notification_remedy_and_residual_closure',
      'primary_tenant_recovery_proves_secondary_tenant_recovery',
      'source_restriction_proves_successful_recovery_or_misconduct',
      'binding_public_authority_supported'
    ]) if (proof[key] !== false) errors.push(`PC-15 ${key} must remain false`);
    if (proof.complete_federated_recovery_supported !== true) errors.push('PC-15 must preserve one complete federated recovery');
    if (proof.safe_partial_abstention_supported !== true) errors.push('PC-15 must preserve safe partial abstention');
  }

  if (!array(compiled?.identification_requirements).some(item => item.stage === 'cross_organizational_trust_federation_and_recovery')) errors.push('compiled v13 trust-federation identification stage is missing');
  if (array(compiled?.open_frontiers).includes('cross_organizational_provenance_trust_federation_and_recovery')) errors.push('compiled v13 must remove the resolved broad trust-federation frontier');
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v13 successor frontier missing: ${frontier}`);
  if (unique(compiled?.promotion_boundary?.real_case_requires).length < 120) errors.push('compiled v13 real-case promotion requirements are incomplete');
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v13 laboratory_controls_are_real_world_evidence', errors);

  const seen = new Set();
  let previous = null;
  for (const event of array(compiled?.custody_chain)) {
    if (!text(event?.event_id)) errors.push('compiled v13 custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate compiled v13 event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`compiled v13 event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`compiled v13 event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`compiled v13 event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (!/^[0-9a-f]{64}$/.test(text(compiled?.custody_chain_head_sha256))) errors.push('compiled v13 custody head is invalid');
  if (array(compiled?.custody_chain).at(-1)?.event_sha256 !== compiled?.custody_chain_head_sha256) errors.push('compiled v13 custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v13 caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPreferenceCustodyManifestV13Markdown(compiled) {
  const proof = compiled.controls.find(control => control.control_id === 'PC-15').proof_summary;
  const lines = [
    '# Preference custody laboratory floor v13',
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
    '## PC-15: cross-organizational trust federation and recovery',
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
