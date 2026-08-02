import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV9Build } from './preference-custody-manifest-v9.mjs';
import { validatePreferenceDeliberativeFormationBuild } from './preference-deliberative-formation.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V10_SCHEMA_VERSION = 'preference-custody-control-manifest-v10@1';
export const PREFERENCE_CUSTODY_MANIFEST_V10_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v10-build@1';

const REQUIRED_CONTROL_IDS = [
  'PC-01','PC-02','PC-03','PC-04','PC-05','PC-06',
  'PC-07','PC-08','PC-09','PC-10','PC-11','PC-12'
];
const REQUIRED_SUCCESSOR_FRONTIERS = [
  'collective_reason_quality_epistemic_diversity_and_information_cascades',
  'deliberative_scale_representation_and_nonparticipant_standing'
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

function summarizePc12(control, build) {
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
      distinct_published_disposition_signatures: build.metrics?.distinct_published_disposition_signatures,
      distinct_private_preference_signatures: build.metrics?.distinct_private_preference_signatures,
      distinct_ballot_signatures: build.metrics?.distinct_ballot_signatures,
      distinct_process_signatures: build.metrics?.distinct_process_signatures,
      worlds_with_private_conversion: build.metrics?.worlds_with_private_conversion,
      worlds_without_private_conversion: build.metrics?.worlds_without_private_conversion,
      worlds_with_reciprocal_reason_exchange: build.metrics?.worlds_with_reciprocal_reason_exchange,
      worlds_with_reason_uptake: build.metrics?.worlds_with_reason_uptake,
      worlds_with_amendment_uptake: build.metrics?.worlds_with_amendment_uptake,
      worlds_with_one_way_briefing: build.metrics?.worlds_with_one_way_briefing,
      worlds_with_vote_private_divergence: build.metrics?.worlds_with_vote_private_divergence,
      worlds_with_strategic_logroll: build.metrics?.worlds_with_strategic_logroll,
      worlds_with_summary_vote_divergence: build.metrics?.worlds_with_summary_vote_divergence,
      worlds_with_deliberative_process: build.metrics?.worlds_with_deliberative_process,
      worlds_with_reason_responsive_collective_position: build.metrics?.worlds_with_reason_responsive_collective_position,
      baseline_A_share: build.metrics?.baseline_A_share,
      published_A_share: build.metrics?.published_A_share,
      published_A_share_shift: build.metrics?.published_A_share_shift,
      maximum_published_private_total_variation: build.metrics?.maximum_published_private_total_variation,
      maximum_published_vote_total_variation: build.metrics?.maximum_published_vote_total_variation,
      published_disposition_identifies_private_preference: build.classification?.published_disposition_identifies_private_preference,
      information_exposure_is_deliberation: build.classification?.information_exposure_is_deliberation,
      one_way_briefing_is_reciprocal_reason_exchange: build.classification?.one_way_briefing_is_reciprocal_reason_exchange,
      speaking_opportunity_establishes_reason_uptake: build.classification?.speaking_opportunity_establishes_reason_uptake,
      majority_vote_is_consensus: build.classification?.majority_vote_is_consensus,
      strategic_logroll_is_focal_preference_conversion: build.classification?.strategic_logroll_is_focal_preference_conversion,
      published_summary_is_actual_ballot: build.classification?.published_summary_is_actual_ballot,
      reason_exchange_confers_binding_authority: build.classification?.reason_exchange_confers_binding_authority,
      amendment_is_collective_agreement_without_disposition_rule: build.classification?.amendment_is_collective_agreement_without_disposition_rule,
      deliberative_process_supported_in_at_least_one_world: build.classification?.deliberative_process_supported_in_at_least_one_world,
      reason_responsive_collective_position_supported_in_at_least_one_world: build.classification?.reason_responsive_collective_position_supported_in_at_least_one_world,
      binding_public_authority_supported: build.classification?.binding_public_authority_supported
    }
  };
}

function buildV10Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${manifest.manifest_id}:base`,
    event_type: 'qualified_v9_floor_snapshot',
    evidence_class: 'compiled_synthetic_control_floor',
    authority: 'preference_custody_v9_compiler',
    source_event_ids: [],
    payload: {
      manifest_id: baseBuild.manifest_id,
      schema_version: baseBuild.schema_version,
      control_count: baseBuild.control_count,
      snapshot_sha256: sha256(baseBuild)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:pc12`,
    event_type: 'pc12_deliberative_formation_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'deliberative_formation_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: {
      control: extensionControl,
      snapshot_sha256: sha256(extensionControl)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'deliberative_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v10_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc12`],
    payload: {
      transition: manifest.frontier_transition,
      open_frontiers: openFrontiers
    }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'deliberative_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v10_compiler',
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
    authority: 'preference_custody_v10_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: {
      allowed_interpretation: 'qualified twelve-control synthetic Preference Custody floor',
      refused_promotions: [
        'laboratory_control_as_named_deliberation_evidence',
        'public_vote_as_private_preference',
        'summary_as_ballot',
        'briefing_as_deliberation',
        'speaking_as_reason_uptake',
        'majority_as_consensus',
        'reason_exchange_as_public_authority'
      ]
    }
  });
  return events;
}

export function validatePreferenceCustodyManifestV10(manifest) {
  const errors = [];
  const base = object(manifest?.base_floor);
  const control = object(manifest?.extension_control);
  const requirement = object(manifest?.identification_requirement);
  const transition = object(manifest?.frontier_transition);

  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V10_SCHEMA_VERSION) errors.push('preference custody v10 manifest schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v10') errors.push('manifest_id must remain preference-custody-laboratory-floor-v10');
  if (manifest?.status !== 'synthetic_control_floor_extension') errors.push('v10 manifest status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('v10 manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v10 manifest counts_toward_thesis_evidence', errors);

  if (base.manifest_id !== 'preference-custody-laboratory-floor-v9') errors.push('v10 base manifest must remain floor v9');
  if (!text(base.source_manifest_path) || base.expected_build_schema !== 'preference-custody-control-manifest-v9-build@1' || base.expected_control_count !== 11) errors.push('v10 base floor contract is incomplete');

  if (control.control_id !== 'PC-12') errors.push('v10 extension control must remain PC-12');
  if (control.fixture_id !== 'same-published-disposition-different-deliberative-processes-v1') errors.push('PC-12 fixture identity mismatch');
  if (control.failure_class !== 'deliberative_reason_exchange_vote_and_summary_equifinality') errors.push('PC-12 failure class mismatch');
  if (!text(control.source_fixture_path) || !text(control.build_artifact_path) || control.expected_build_schema !== 'preference-deliberative-formation-build@1') errors.push('PC-12 source or build contract is incomplete');
  if (unique(control.required_refusal_rules).length < 11) errors.push('PC-12 refusal-rule contract is incomplete');

  if (requirement.stage !== 'deliberative_reason_exchange_and_collective_position') errors.push('v10 identification stage mismatch');
  if (!text(requirement.required_state) || !text(requirement.refused_inference)) errors.push('v10 deliberative identification requirement is incomplete');
  if (transition.resolved_base_frontier !== 'collective_deliberation_reason_exchange_and_emergent_group_preference') errors.push('v10 resolved frontier mismatch');
  if (!sameMembers(transition.successor_frontiers, REQUIRED_SUCCESSOR_FRONTIERS)) errors.push('v10 successor frontiers are incomplete');
  if (unique(manifest?.real_case_requirements_added).length < 18) errors.push('v10 deliberative real-case requirements are incomplete');
  if (unique(manifest?.prohibited_inferences).length < 9) errors.push('v10 prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id)
      || !text(manifest?.interpretation_contract?.what_this_is)
      || !text(manifest?.interpretation_contract?.what_this_is_not)
      || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v10 interpretation contract is incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV10(manifest, baseBuild, deliberativeBuild) {
  const errors = validatePreferenceCustodyManifestV10(manifest);
  if (errors.length) throw new Error(`invalid preference custody v10 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV9Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v9 base build:\n- ${baseErrors.join('\n- ')}`);
  const deliberativeErrors = validatePreferenceDeliberativeFormationBuild(deliberativeBuild);
  if (deliberativeErrors.length) throw new Error(`invalid PC-12 build:\n- ${deliberativeErrors.join('\n- ')}`);
  if (baseBuild.manifest_id !== manifest.base_floor.manifest_id) throw new Error('v10 base manifest identity mismatch');
  if (baseBuild.schema_version !== manifest.base_floor.expected_build_schema) throw new Error('v10 base build schema mismatch');
  if (baseBuild.control_count !== manifest.base_floor.expected_control_count) throw new Error('v10 base control count mismatch');
  if (deliberativeBuild.fixture_id !== manifest.extension_control.fixture_id) throw new Error('v10 PC-12 fixture identity mismatch');
  if (deliberativeBuild.schema_version !== manifest.extension_control.expected_build_schema) throw new Error('v10 PC-12 build schema mismatch');

  const extensionControl = summarizePc12(manifest.extension_control, deliberativeBuild);
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
  const chain = buildV10Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements);

  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V10_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v10_qualified',
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
      base_floor_qualified: baseBuild.status === 'laboratory_floor_v9_qualified',
      base_integrity_preserved: Object.values(baseBuild.control_integrity).every(value => value === true),
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_pc12_refusal_rules_present: allRequiredRulesPresent
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

export function validatePreferenceCustodyManifestV10Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V10_BUILD_SCHEMA_VERSION) errors.push('preference custody v10 build schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v10') errors.push('compiled v10 manifest identity mismatch');
  if (compiled?.status !== 'laboratory_floor_v10_qualified') errors.push('compiled v10 status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled v10 graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v10 counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v10 conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled v10 real_world_evidence_state must remain none');
  if (compiled?.control_count !== 12) errors.push('compiled v10 must preserve twelve controls');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v10 control IDs are incomplete');

  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v9') errors.push('compiled v10 base manifest mismatch');
  if (composition.base_control_count !== 11) errors.push('compiled v10 base control count must remain eleven');
  if (composition.extension_control_id !== 'PC-12') errors.push('compiled v10 extension control must remain PC-12');
  for (const key of ['base_floor_snapshot_sha256','extension_snapshot_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v10 ${key} is invalid`);

  const integrity = object(compiled?.control_integrity);
  for (const key of [
    'base_floor_qualified','base_integrity_preserved','all_graph_effect_none',
    'no_thesis_evidence_consumption','no_real_world_conclusion','no_preference_change_claim',
    'no_intent_inference','all_required_pc12_refusal_rules_present'
  ]) if (integrity[key] !== true) errors.push(`compiled v10 control_integrity.${key} must be true`);

  const pc12 = array(compiled?.controls).find(control => control.control_id === 'PC-12');
  if (!pc12) errors.push('compiled v10 PC-12 control is missing');
  else {
    const proof = object(pc12.proof_summary);
    const exactCounts = {
      world_count:6,
      distinct_published_disposition_signatures:1,
      distinct_private_preference_signatures:2,
      distinct_ballot_signatures:2,
      distinct_process_signatures:6,
      worlds_with_private_conversion:3,
      worlds_without_private_conversion:3,
      worlds_with_reciprocal_reason_exchange:1,
      worlds_with_reason_uptake:1,
      worlds_with_amendment_uptake:1,
      worlds_with_one_way_briefing:1,
      worlds_with_vote_private_divergence:2,
      worlds_with_strategic_logroll:1,
      worlds_with_summary_vote_divergence:1,
      worlds_with_deliberative_process:1,
      worlds_with_reason_responsive_collective_position:1
    };
    for (const [key, value] of Object.entries(exactCounts)) if (proof[key] !== value) errors.push(`PC-12 ${key} must equal ${value}`);
    if (!close(proof.baseline_A_share,0.6) || !close(proof.published_A_share,0.8) || !close(proof.published_A_share_shift,0.2)) errors.push('PC-12 must preserve the frozen 60-to-80 percent published shift');
    if (!close(proof.maximum_published_private_total_variation,0.2) || !close(proof.maximum_published_vote_total_variation,0.2)) errors.push('PC-12 must preserve 20 percent maximum publication separation');
    for (const key of [
      'published_disposition_identifies_private_preference','information_exposure_is_deliberation',
      'one_way_briefing_is_reciprocal_reason_exchange','speaking_opportunity_establishes_reason_uptake',
      'majority_vote_is_consensus','strategic_logroll_is_focal_preference_conversion',
      'published_summary_is_actual_ballot','reason_exchange_confers_binding_authority',
      'amendment_is_collective_agreement_without_disposition_rule','binding_public_authority_supported'
    ]) if (proof[key] !== false) errors.push(`PC-12 ${key} must remain false`);
    if (proof.deliberative_process_supported_in_at_least_one_world !== true) errors.push('PC-12 must preserve one qualified deliberative process');
    if (proof.reason_responsive_collective_position_supported_in_at_least_one_world !== true) errors.push('PC-12 must preserve one reason-responsive collective position');
  }

  if (!array(compiled?.identification_requirements).some(item => item.stage === 'deliberative_reason_exchange_and_collective_position')) errors.push('compiled v10 deliberative identification stage is missing');
  if (array(compiled?.open_frontiers).includes('collective_deliberation_reason_exchange_and_emergent_group_preference')) errors.push('compiled v10 must remove the resolved broad deliberative frontier');
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v10 successor frontier missing: ${frontier}`);
  if (unique(compiled?.promotion_boundary?.real_case_requires).length < 68) errors.push('compiled v10 real-case promotion requirements are incomplete');
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v10 laboratory_controls_are_real_world_evidence', errors);

  const seen = new Set();
  let previous = null;
  for (const event of array(compiled?.custody_chain)) {
    if (!text(event?.event_id)) errors.push('compiled v10 custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate compiled v10 event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`compiled v10 event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`compiled v10 event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`compiled v10 event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (!/^[0-9a-f]{64}$/.test(text(compiled?.custody_chain_head_sha256))) errors.push('compiled v10 custody head is invalid');
  if (array(compiled?.custody_chain).at(-1)?.event_sha256 !== compiled?.custody_chain_head_sha256) errors.push('compiled v10 custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v10 caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPreferenceCustodyManifestV10Markdown(compiled) {
  const proof = compiled.controls.find(control => control.control_id === 'PC-12').proof_summary;
  const lines = [
    '# Preference custody laboratory floor v10',
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
    '## PC-12: deliberative reason exchange, vote, and summary',
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
