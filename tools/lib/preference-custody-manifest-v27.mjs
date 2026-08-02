import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV26Build } from './preference-custody-manifest-v26.mjs';
import { validatePreferenceIdentityBoundaryAssuranceBuild } from './preference-identity-boundary-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V27_SCHEMA_VERSION =
  'preference-custody-control-manifest-v27@1';
export const PREFERENCE_CUSTODY_MANIFEST_V27_BUILD_SCHEMA_VERSION =
  'preference-custody-control-manifest-v27-build@1';

const REQUIRED_CONTROL_IDS = Array.from({ length: 29 }, (_, index) =>
  `PC-${String(index + 1).padStart(2, '0')}`
);

const REQUIRED_SUCCESSOR_FRONTIERS = [
  'record_linkage_namespace_temporal_identity_and_succession_assurance',
  'population_eligibility_membership_denominator_and_operational_frame_governance'
];

const EXPECTED_PC29_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_identity_boundary_provenance_signatures: 8,
  complete_identity_boundary_assurance_worlds: 1,
  false_merge_worlds: 1,
  false_split_worlds: 1,
  recycled_identifier_worlds: 1,
  boundary_truncation_worlds: 1,
  ineligible_inclusion_worlds: 1,
  frame_mismatch_worlds: 1,
  membership_drift_worlds: 1,
  one_to_one_identity_complete_worlds: 6,
  temporal_identity_complete_worlds: 7,
  boundary_coverage_complete_worlds: 7,
  frame_alignment_complete_worlds: 7,
  eligibility_complete_worlds: 7,
  membership_current_worlds: 7,
  denominator_valid_worlds: 5,
  current_identity_boundary_lineage_complete_worlds: 6,
  total_false_merged_entities: 20,
  total_false_split_entities: 20,
  total_recycled_identifiers: 15,
  total_omitted_external_entities: 30,
  total_omitted_bridge_entities: 15,
  total_ineligible_included_entities: 25,
  total_frame_misclassified_entities: 40,
  total_entered_entities: 20,
  total_exited_entities: 15,
  total_churned_entities: 35,
  total_stale_memberships: 35,
  total_denominator_drift: 35,
  total_unsupported_identity_boundary_decisions: 700,
  binding_public_authority_worlds: 0
};

const FALSE_PC29_CLASSIFICATIONS = [
  'one_hundred_resolved_records_identifies_one_hundred_true_entities',
  'one_hundred_percent_identity_coverage_identifies_one_to_one_entity_resolution',
  'stable_node_count_identifies_stable_entity_identity_or_membership',
  'zero_published_duplicates_identifies_zero_false_merges',
  'zero_published_unresolved_identities_identifies_zero_false_splits_or_recycled_identifiers',
  'declared_operational_boundary_identifies_observed_operative_system_boundary',
  'administrative_roster_identifies_communication_exposure_market_household_or_institutional_population',
  'included_node_identifies_eligible_target_entity',
  'omitted_external_node_identifies_irrelevant_entity',
  'current_identifier_identifies_persistent_entity_across_succession',
  'frozen_denominator_identifies_current_population_under_entry_exit_churn_or_role_change',
  'public_identity_verified_status_identifies_complete_one_to_one_boundary_valid_frame_valid_current_correctable_authorized_evidence',
  'identity_or_boundary_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'binding_public_authority_supported',
  'manipulative_intent_inferable',
  'real_world_effect_claimed',
  'preference_change_present'
];

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const sorted = values => [...values].sort((a, b) => String(a).localeCompare(String(b)));
const sameMembers = (left, right) =>
  JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const requireFalse = (value, label, errors) => {
  if (value !== false) errors.push(`${label} must remain false`);
};

function seal(event, previous) {
  const unsigned = { ...canonical(event), previous_event_sha256: previous };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

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
    required_refusal_rules: [...control.required_refusal_rules],
    observed_refusal_rules: [...array(build.required_refusal_rules)],
    proof_summary: {
      ...Object.fromEntries(
        Object.keys(EXPECTED_PC29_METRICS).map(key => [key, build.metrics?.[key]])
      ),
      ...Object.fromEntries(
        FALSE_PC29_CLASSIFICATIONS.map(key => [key, build.classification?.[key]])
      ),
      complete_identity_boundary_assurance_supported_in_at_least_one_world:
        build.classification?.complete_identity_boundary_assurance_supported_in_at_least_one_world
    }
  };
}

function buildChain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = seal(event, previous);
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
    event_type: 'pc29_record_identity_entity_boundary_frame_membership_and_denominator_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'identity_boundary_assurance_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: {
      control: extensionControl,
      snapshot_sha256: sha256(extensionControl)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'identity_boundary_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v27_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc29`],
    payload: {
      transition: manifest.frontier_transition,
      open_frontiers: openFrontiers
    }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'identity_boundary_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v27_compiler',
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
    authority: 'preference_custody_v27_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: {
      allowed_interpretation:
        'qualified twenty-nine-control synthetic Preference Custody floor',
      refused_promotions: [
        'resolved_record_count_as_true_entity_count',
        'identity_coverage_as_one_to_one_resolution',
        'stable_node_count_as_stable_identity_or_membership',
        'zero_duplicates_as_zero_false_merges',
        'zero_unresolved_as_zero_false_splits_or_recycled_identifiers',
        'declared_boundary_as_observed_operative_system',
        'administrative_roster_as_operational_exposure_population',
        'included_node_as_eligible_target_entity',
        'omitted_external_entity_as_irrelevant',
        'current_identifier_as_persistent_entity',
        'frozen_denominator_as_current_population',
        'identity_verified_status_as_public_authorization'
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

  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V27_SCHEMA_VERSION) {
    errors.push('preference custody v27 manifest schema mismatch');
  }
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v27') {
    errors.push('manifest_id must remain preference-custody-laboratory-floor-v27');
  }
  if (manifest?.control_issue !== 780) errors.push('v27 control issue must remain 780');
  if (manifest?.status !== 'synthetic_control_floor_extension') {
    errors.push('v27 manifest status mismatch');
  }
  if (manifest?.graph_effect !== 'none') errors.push('v27 manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v27 manifest counts_toward_thesis_evidence', errors);

  if (base.manifest_id !== 'preference-custody-laboratory-floor-v26') {
    errors.push('v27 base manifest must remain floor v26');
  }
  if (!text(base.source_manifest_path) ||
      base.expected_build_schema !== 'preference-custody-control-manifest-v26-build@1' ||
      base.expected_control_count !== 28) {
    errors.push('v27 base floor contract is incomplete');
  }

  if (control.control_id !== 'PC-29') errors.push('v27 extension control must remain PC-29');
  if (control.fixture_id !== 'same-identity-verified-status-different-provenance-v1') {
    errors.push('PC-29 fixture identity mismatch');
  }
  if (control.failure_class !==
      'identity_resolution_entity_boundary_network_frame_population_denominator_and_membership_succession_equifinality') {
    errors.push('PC-29 failure class mismatch');
  }
  if (!text(control.source_fixture_path) || !text(control.build_artifact_path) ||
      control.expected_build_schema !== 'preference-identity-boundary-assurance-build@1') {
    errors.push('PC-29 source or build contract is incomplete');
  }
  if (unique(control.required_refusal_rules).length < 15) {
    errors.push('PC-29 refusal-rule contract is incomplete');
  }

  if (requirement.stage !==
      'record_identity_entity_boundary_frame_membership_and_population_denominator') {
    errors.push('v27 identification stage mismatch');
  }
  if (!text(requirement.required_state) || !text(requirement.refused_inference)) {
    errors.push('v27 identity-boundary identification requirement is incomplete');
  }

  if (transition.resolved_base_frontier !==
      'identity_resolution_entity_boundary_and_network_frame_assurance') {
    errors.push('v27 resolved frontier mismatch');
  }
  if (!sameMembers(transition.successor_frontiers, REQUIRED_SUCCESSOR_FRONTIERS)) {
    errors.push('v27 successor frontiers are incomplete');
  }
  if (unique(manifest?.real_case_requirements_added).length < 48) {
    errors.push('v27 identity-boundary real-case requirements are incomplete');
  }
  if (array(manifest?.real_case_requirements_added).some(item =>
      !/^[a-z0-9_]+$/.test(text(item)))) {
    errors.push('v27 real-case requirements must be lowercase underscore-delimited machine identifiers');
  }
  if (unique(manifest?.prohibited_inferences).length < 14) {
    errors.push('v27 prohibited-inference ledger is incomplete');
  }
  const contract = object(manifest?.interpretation_contract);
  if (!text(contract.contract_id) || !text(contract.what_this_is) ||
      !text(contract.what_this_is_not) || !text(contract.copy_ready_caveat)) {
    errors.push('v27 interpretation contract is incomplete');
  }
  return errors;
}

export function compilePreferenceCustodyManifestV27(manifest, baseBuild, identityBuild) {
  const errors = validatePreferenceCustodyManifestV27(manifest);
  if (errors.length) {
    throw new Error(`invalid preference custody v27 manifest:\n- ${errors.join('\n- ')}`);
  }
  const baseErrors = validatePreferenceCustodyManifestV26Build(baseBuild);
  if (baseErrors.length) {
    throw new Error(`invalid v26 base build:\n- ${baseErrors.join('\n- ')}`);
  }
  const identityErrors = validatePreferenceIdentityBoundaryAssuranceBuild(identityBuild);
  if (identityErrors.length) {
    throw new Error(`invalid PC-29 build:\n- ${identityErrors.join('\n- ')}`);
  }
  if (baseBuild.manifest_id !== manifest.base_floor.manifest_id) {
    throw new Error('v27 base manifest identity mismatch');
  }
  if (baseBuild.schema_version !== manifest.base_floor.expected_build_schema) {
    throw new Error('v27 base build schema mismatch');
  }
  if (baseBuild.control_count !== manifest.base_floor.expected_control_count) {
    throw new Error('v27 base control count mismatch');
  }
  if (identityBuild.fixture_id !== manifest.extension_control.fixture_id) {
    throw new Error('v27 PC-29 fixture identity mismatch');
  }
  if (identityBuild.schema_version !== manifest.extension_control.expected_build_schema) {
    throw new Error('v27 PC-29 build schema mismatch');
  }

  const extensionControl = summarizePc29(manifest.extension_control, identityBuild);
  const allRequiredRulesPresent =
    extensionControl.required_refusal_rules.every(rule =>
      extensionControl.observed_refusal_rules.includes(rule)
    );
  const completePathPreserved =
    extensionControl.proof_summary
      .complete_identity_boundary_assurance_supported_in_at_least_one_world === true;

  const controls = [...baseBuild.controls, extensionControl];
  const openFrontiers = unique([
    ...baseBuild.open_frontiers.filter(frontier =>
      frontier !== manifest.frontier_transition.resolved_base_frontier
    ),
    ...manifest.frontier_transition.successor_frontiers
  ]);
  const baseRequirements = unique(baseBuild.promotion_boundary.real_case_requires);
  const addedPromotionRequirements = unique(manifest.real_case_requirements_added)
    .filter(item => !baseRequirements.includes(item));
  const promotionRequirements = unique([
    ...baseRequirements,
    ...manifest.real_case_requirements_added
  ]);
  const refusalRules = unique([
    ...baseBuild.refusal_rule_union,
    ...extensionControl.observed_refusal_rules
  ]);
  const identificationRequirements = [
    ...baseBuild.identification_requirements,
    manifest.identification_requirement
  ];
  const chain = buildChain(
    manifest,
    baseBuild,
    extensionControl,
    openFrontiers,
    promotionRequirements
  );

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
      base_promotion_requirement_count: baseRequirements.length,
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
      base_integrity_preserved:
        Object.values(baseBuild.control_integrity).every(value => value === true),
      all_graph_effect_none:
        controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption:
        controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion:
        controls.every(control =>
          control.conclusion_generated === false &&
          control.real_world_effect_claimed === false
        ),
      no_preference_change_claim:
        controls.every(control => control.preference_change_present === false),
      no_intent_inference:
        controls.every(control => control.manipulative_intent_inferable === false),
      all_required_pc29_refusal_rules_present: allRequiredRulesPresent,
      complete_identity_boundary_assurance_path_preserved: completePathPreserved
    },
    identification_requirements: identificationRequirements,
    refusal_rule_union: refusalRules,
    open_frontiers: openFrontiers,
    frontier_transition: canonical(manifest.frontier_transition),
    promotion_boundary: {
      laboratory_controls_are_real_world_evidence: false,
      real_case_requires: promotionRequirements,
      promotion_authority: baseBuild.promotion_boundary.promotion_authority
    },
    custody_chain: chain,
    custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null,
    prohibited_inferences: [
      ...baseBuild.prohibited_inferences,
      ...manifest.prohibited_inferences
    ],
    interpretation_contract: canonical(manifest.interpretation_contract)
  };
}

export function validatePreferenceCustodyManifestV27Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V27_BUILD_SCHEMA_VERSION) {
    errors.push('preference custody v27 build schema mismatch');
  }
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v27') {
    errors.push('compiled v27 manifest identity mismatch');
  }
  if (compiled?.control_issue !== 780) {
    errors.push('compiled v27 control issue must remain 780');
  }
  if (compiled?.status !== 'laboratory_floor_v27_qualified') {
    errors.push('compiled v27 status mismatch');
  }
  if (compiled?.graph_effect !== 'none') {
    errors.push('compiled v27 graph_effect must remain none');
  }
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v27 counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v27 conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') {
    errors.push('compiled v27 real_world_evidence_state must remain none');
  }
  if (compiled?.control_count !== 29) {
    errors.push('compiled v27 must preserve twenty-nine controls');
  }
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) {
    errors.push('compiled v27 control IDs are incomplete');
  }

  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v26') {
    errors.push('compiled v27 base manifest mismatch');
  }
  if (composition.base_schema_version !== 'preference-custody-control-manifest-v26-build@1') {
    errors.push('compiled v27 base schema mismatch');
  }
  if (composition.base_control_count !== 28) {
    errors.push('compiled v27 base control count must remain twenty-eight');
  }
  if (composition.extension_control_id !== 'PC-29') {
    errors.push('compiled v27 extension control must remain PC-29');
  }
  for (const key of ['base_floor_snapshot_sha256', 'extension_snapshot_sha256']) {
    if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) {
      errors.push(`compiled v27 ${key} is invalid`);
    }
  }
  if (!Number.isInteger(composition.added_promotion_requirement_count) ||
      composition.added_promotion_requirement_count < 48) {
    errors.push('compiled v27 must add at least forty-eight promotion requirements');
  }
  if (composition.final_promotion_requirement_count !==
      composition.base_promotion_requirement_count +
      composition.added_promotion_requirement_count) {
    errors.push('compiled v27 promotion requirement counts do not reconcile');
  }
  if (composition.final_promotion_requirement_count !==
      unique(compiled?.promotion_boundary?.real_case_requires).length) {
    errors.push('compiled v27 final promotion count does not match the promotion boundary');
  }

  const integrity = object(compiled?.control_integrity);
  for (const key of [
    'base_floor_qualified',
    'base_integrity_preserved',
    'all_graph_effect_none',
    'no_thesis_evidence_consumption',
    'no_real_world_conclusion',
    'no_preference_change_claim',
    'no_intent_inference',
    'all_required_pc29_refusal_rules_present',
    'complete_identity_boundary_assurance_path_preserved'
  ]) {
    if (integrity[key] !== true) {
      errors.push(`compiled v27 control_integrity.${key} must be true`);
    }
  }

  const pc29 = array(compiled?.controls).find(control => control.control_id === 'PC-29');
  if (!pc29) {
    errors.push('compiled v27 PC-29 control is missing');
  } else {
    const proof = object(pc29.proof_summary);
    for (const [key, value] of Object.entries(EXPECTED_PC29_METRICS)) {
      if (proof[key] !== value) errors.push(`PC-29 ${key} must equal ${value}`);
    }
    for (const key of FALSE_PC29_CLASSIFICATIONS) {
      if (proof[key] !== false) errors.push(`PC-29 ${key} must remain false`);
    }
    if (proof.complete_identity_boundary_assurance_supported_in_at_least_one_world !== true) {
      errors.push('PC-29 must preserve one complete identity-boundary assurance path');
    }
  }

  if (!array(compiled?.identification_requirements).some(item =>
      item.stage === 'record_identity_entity_boundary_frame_membership_and_population_denominator'
  )) {
    errors.push('compiled v27 identity-boundary identification stage is missing');
  }
  if (array(compiled?.open_frontiers).includes(
      'identity_resolution_entity_boundary_and_network_frame_assurance'
  )) {
    errors.push('compiled v27 must remove the resolved identity-boundary frontier');
  }
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) {
    if (!array(compiled?.open_frontiers).includes(frontier)) {
      errors.push(`compiled v27 successor frontier missing: ${frontier}`);
    }
  }
  if (!array(compiled?.open_frontiers).includes(
      'edge_ascertainment_multiplex_temporal_reconstruction_and_path_validity_governance'
  )) {
    errors.push('compiled v27 must preserve the independent edge-path frontier');
  }
  if (!array(compiled?.open_frontiers).includes(
      'saturation_general_equilibrium_and_interference_robust_policy_governance'
  )) {
    errors.push('compiled v27 must preserve the independent saturation frontier');
  }
  requireFalse(
    compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence,
    'compiled v27 laboratory_controls_are_real_world_evidence',
    errors
  );

  const chain = array(compiled?.custody_chain);
  if (chain.length !== 5) errors.push('compiled v27 custody chain must contain five events');
  const seen = new Set();
  let previous = null;
  for (const event of chain) {
    if (!text(event?.event_id)) errors.push('compiled v27 custody event requires event_id');
    if (seen.has(event?.event_id)) {
      errors.push(`duplicate compiled v27 event ${event.event_id}`);
    }
    if (event?.previous_event_sha256 !== previous) {
      errors.push(`compiled v27 event ${event?.event_id} previous hash mismatch`);
    }
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) {
        errors.push(`compiled v27 event ${event?.event_id} references unseen source ${sourceId}`);
      }
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) {
      errors.push(`compiled v27 event ${event?.event_id} hash mismatch`);
    }
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (!/^[0-9a-f]{64}$/.test(text(compiled?.custody_chain_head_sha256))) {
    errors.push('compiled v27 custody head is invalid');
  }
  if (chain.at(-1)?.event_sha256 !== compiled?.custody_chain_head_sha256) {
    errors.push('compiled v27 custody head mismatch');
  }
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) {
    errors.push('compiled v27 caveat is required');
  }
  return errors;
}

export function renderPreferenceCustodyManifestV27Markdown(compiled) {
  const proof = compiled.controls.find(control => control.control_id === 'PC-29').proof_summary;
  const lines = [
    '# Preference custody laboratory floor v27',
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
    '## PC-29: identity resolution, entity-boundary, and network frame',
    ''
  ];
  for (const [key, value] of Object.entries(proof)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Floor integrity', '');
  for (const [key, value] of Object.entries(compiled.control_integrity)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push('', '## Identification stages', '');
  for (const requirement of compiled.identification_requirements) {
    lines.push(
      `### ${requirement.stage}`,
      '',
      `- Required state: ${requirement.required_state}`,
      `- Refusal: ${requirement.refused_inference}`,
      ''
    );
  }
  lines.push('## Open frontiers', '');
  for (const frontier of compiled.open_frontiers) lines.push(`- ${frontier}`);
  lines.push(
    '',
    '## Promotion boundary',
    '',
    `- Laboratory controls are real-world evidence: ${compiled.promotion_boundary.laboratory_controls_are_real_world_evidence}`,
    `- Promotion authority: ${compiled.promotion_boundary.promotion_authority}`,
    '',
    '### Required real-case evidence',
    ''
  );
  for (const item of compiled.promotion_boundary.real_case_requires) {
    lines.push(`- ${item}`);
  }
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
