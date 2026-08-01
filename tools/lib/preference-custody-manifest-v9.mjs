import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestBuild } from './preference-custody-manifest.mjs';
import { validatePreferenceNetworkFormationBuild } from './preference-network-formation.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V9_SCHEMA_VERSION = 'preference-custody-control-manifest-v9@1';
export const PREFERENCE_CUSTODY_MANIFEST_V9_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v9-build@1';

const REQUIRED_CONTROL_IDS = [
  'PC-01', 'PC-02', 'PC-03', 'PC-04', 'PC-05', 'PC-06',
  'PC-07', 'PC-08', 'PC-09', 'PC-10', 'PC-11'
];
const REQUIRED_SUCCESSOR_FRONTIERS = [
  'collective_deliberation_reason_exchange_and_emergent_group_preference',
  'network_interference_multihop_causal_identification'
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

function summarizePc11(control, build) {
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
      distinct_surface_headline_signatures: build.metrics?.distinct_surface_headline_signatures,
      distinct_latent_headline_signatures: build.metrics?.distinct_latent_headline_signatures,
      distinct_report_headline_signatures: build.metrics?.distinct_report_headline_signatures,
      distinct_action_headline_signatures: build.metrics?.distinct_action_headline_signatures,
      distinct_mechanism_signatures: build.metrics?.distinct_mechanism_signatures,
      worlds_with_latent_conversion: build.metrics?.worlds_with_latent_conversion,
      worlds_without_latent_conversion: build.metrics?.worlds_without_latent_conversion,
      worlds_with_independent_conversion: build.metrics?.worlds_with_independent_conversion,
      worlds_with_peer_mediated_conversion: build.metrics?.worlds_with_peer_mediated_conversion,
      worlds_with_common_source_conversion: build.metrics?.worlds_with_common_source_conversion,
      worlds_with_report_latent_divergence: build.metrics?.worlds_with_report_latent_divergence,
      worlds_with_action_latent_divergence: build.metrics?.worlds_with_action_latent_divergence,
      worlds_with_ranking_amplification: build.metrics?.worlds_with_ranking_amplification,
      worlds_with_network_mediated_response: build.metrics?.worlds_with_network_mediated_response,
      worlds_with_collective_deliberation: build.metrics?.worlds_with_collective_deliberation,
      stable_identity_worlds: build.metrics?.stable_identity_worlds,
      stable_network_version_worlds: build.metrics?.stable_network_version_worlds,
      stable_instrument_worlds: build.metrics?.stable_instrument_worlds,
      baseline_A_share: build.metrics?.baseline_A_share,
      surfaced_A_share: build.metrics?.surfaced_A_share,
      surfaced_A_share_shift: build.metrics?.surfaced_A_share_shift,
      maximum_surface_latent_total_variation: build.metrics?.maximum_surface_latent_total_variation,
      maximum_surface_report_total_variation: build.metrics?.maximum_surface_report_total_variation,
      surface_majority_identifies_independent_preference_distribution: build.classification?.surface_majority_identifies_independent_preference_distribution,
      correlated_change_identifies_peer_influence_without_source_separation: build.classification?.correlated_change_identifies_peer_influence_without_source_separation,
      homophily_identifies_contagion: build.classification?.homophily_identifies_contagion,
      common_broadcast_is_peer_cascade: build.classification?.common_broadcast_is_peer_cascade,
      public_report_always_equals_private_preference: build.classification?.public_report_always_equals_private_preference,
      public_action_always_equals_private_preference: build.classification?.public_action_always_equals_private_preference,
      surfaced_share_always_equals_population_report_share: build.classification?.surfaced_share_always_equals_population_report_share,
      peer_influence_path_supported_in_at_least_one_world: build.classification?.peer_influence_path_supported_in_at_least_one_world,
      collective_deliberation_supported: build.classification?.collective_deliberation_supported,
      network_path_establishes_manipulation: build.classification?.network_path_establishes_manipulation,
      binding_public_authority_supported: build.classification?.binding_public_authority_supported
    }
  };
}

function buildV9Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${manifest.manifest_id}:base`,
    event_type: 'qualified_v8_floor_snapshot',
    evidence_class: 'compiled_synthetic_control_floor',
    authority: 'preference_custody_v8_compiler',
    source_event_ids: [],
    payload: {
      manifest_id: baseBuild.manifest_id,
      schema_version: baseBuild.schema_version,
      control_count: baseBuild.control_count,
      snapshot_sha256: sha256(baseBuild)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:pc11`,
    event_type: 'pc11_network_formation_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'network_formation_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: {
      control: extensionControl,
      snapshot_sha256: sha256(extensionControl)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'network_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v9_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc11`],
    payload: {
      transition: manifest.frontier_transition,
      open_frontiers: openFrontiers
    }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'network_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v9_compiler',
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
    authority: 'preference_custody_v9_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: {
      allowed_interpretation: 'qualified eleven-control synthetic Preference Custody floor',
      refused_promotions: [
        'laboratory_control_as_named_platform_evidence',
        'correlation_as_peer_influence',
        'network_path_as_manipulation',
        'cascade_as_collective_deliberation',
        'surfaced_majority_as_population_preference',
        'network_participation_as_public_authorization'
      ]
    }
  });
  return events;
}

export function validatePreferenceCustodyManifestV9(manifest) {
  const errors = [];
  const base = object(manifest?.base_floor);
  const control = object(manifest?.extension_control);
  const requirement = object(manifest?.identification_requirement);
  const transition = object(manifest?.frontier_transition);

  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V9_SCHEMA_VERSION) errors.push('preference custody v9 manifest schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v9') errors.push('manifest_id must remain preference-custody-laboratory-floor-v9');
  if (manifest?.status !== 'synthetic_control_floor_extension') errors.push('v9 manifest status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('v9 manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v9 manifest counts_toward_thesis_evidence', errors);

  if (base.manifest_id !== 'preference-custody-laboratory-floor-v8') errors.push('v9 base manifest must remain floor v8');
  if (!text(base.source_manifest_path) || base.expected_build_schema !== 'preference-custody-control-manifest-build@1' || base.expected_control_count !== 10) errors.push('v9 base floor contract is incomplete');

  if (control.control_id !== 'PC-11') errors.push('v9 extension control must remain PC-11');
  if (control.fixture_id !== 'same-surfaced-majority-different-network-mechanisms-v1') errors.push('PC-11 fixture identity mismatch');
  if (control.failure_class !== 'network_dependence_collective_formation_and_visibility_equifinality') errors.push('PC-11 failure class mismatch');
  if (!text(control.source_fixture_path) || !text(control.build_artifact_path) || control.expected_build_schema !== 'preference-network-formation-build@1') errors.push('PC-11 source or build contract is incomplete');
  if (unique(control.required_refusal_rules).length < 10) errors.push('PC-11 refusal-rule contract is incomplete');

  if (requirement.stage !== 'network_dependence_and_collective_formation') errors.push('v9 identification stage mismatch');
  if (!text(requirement.required_state) || !text(requirement.refused_inference)) errors.push('v9 network identification requirement is incomplete');
  if (transition.resolved_base_frontier !== 'endogenous_network_and_collective_preference_formation') errors.push('v9 resolved frontier mismatch');
  if (!sameMembers(transition.successor_frontiers, REQUIRED_SUCCESSOR_FRONTIERS)) errors.push('v9 successor frontiers are incomplete');
  if (unique(manifest?.real_case_requirements_added).length < 16) errors.push('v9 network real-case requirements are incomplete');
  if (unique(manifest?.prohibited_inferences).length < 9) errors.push('v9 prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id)
      || !text(manifest?.interpretation_contract?.what_this_is)
      || !text(manifest?.interpretation_contract?.what_this_is_not)
      || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v9 interpretation contract is incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV9(manifest, baseBuild, networkBuild) {
  const errors = validatePreferenceCustodyManifestV9(manifest);
  if (errors.length) throw new Error(`invalid preference custody v9 manifest:\n- ${errors.join('\n- ')}`);

  const baseErrors = validatePreferenceCustodyManifestBuild(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v8 base build:\n- ${baseErrors.join('\n- ')}`);
  const networkErrors = validatePreferenceNetworkFormationBuild(networkBuild);
  if (networkErrors.length) throw new Error(`invalid PC-11 build:\n- ${networkErrors.join('\n- ')}`);
  if (baseBuild.manifest_id !== manifest.base_floor.manifest_id) throw new Error('v9 base manifest identity mismatch');
  if (baseBuild.schema_version !== manifest.base_floor.expected_build_schema) throw new Error('v9 base build schema mismatch');
  if (baseBuild.control_count !== manifest.base_floor.expected_control_count) throw new Error('v9 base control count mismatch');
  if (networkBuild.fixture_id !== manifest.extension_control.fixture_id) throw new Error('v9 PC-11 fixture identity mismatch');
  if (networkBuild.schema_version !== manifest.extension_control.expected_build_schema) throw new Error('v9 PC-11 build schema mismatch');

  const extensionControl = summarizePc11(manifest.extension_control, networkBuild);
  const allRequiredRulesPresent = extensionControl.required_refusal_rules.every(rule => extensionControl.observed_refusal_rules.includes(rule));
  const controls = [...baseBuild.controls, extensionControl];
  const failureClasses = sorted(controls.map(control => control.failure_class));
  const identificationRequirements = [...baseBuild.identification_requirements, manifest.identification_requirement];
  const openFrontiers = unique([
    ...baseBuild.open_frontiers.filter(frontier => frontier !== manifest.frontier_transition.resolved_base_frontier),
    ...manifest.frontier_transition.successor_frontiers
  ]);
  const promotionRequirements = unique([
    ...baseBuild.promotion_boundary.real_case_requires,
    ...manifest.real_case_requirements_added
  ]);
  const refusalRules = unique([...baseBuild.refusal_rule_union, ...extensionControl.observed_refusal_rules]);
  const chain = buildV9Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements);

  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V9_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v9_qualified',
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
    failure_classes: failureClasses,
    controls,
    control_integrity: {
      base_floor_qualified: baseBuild.status === 'laboratory_floor_qualified',
      base_integrity_preserved: Object.values(baseBuild.control_integrity).every(value => value === true),
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_pc11_refusal_rules_present: allRequiredRulesPresent
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

export function validatePreferenceCustodyManifestV9Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V9_BUILD_SCHEMA_VERSION) errors.push('preference custody v9 build schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v9') errors.push('compiled v9 manifest identity mismatch');
  if (compiled?.status !== 'laboratory_floor_v9_qualified') errors.push('compiled v9 status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled v9 graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v9 counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v9 conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled v9 real_world_evidence_state must remain none');
  if (compiled?.control_count !== 11) errors.push('compiled v9 must preserve eleven controls');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v9 control IDs are incomplete');

  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v8') errors.push('compiled v9 base manifest mismatch');
  if (composition.base_control_count !== 10) errors.push('compiled v9 base control count must remain ten');
  if (composition.extension_control_id !== 'PC-11') errors.push('compiled v9 extension control must remain PC-11');
  for (const key of ['base_floor_snapshot_sha256', 'extension_snapshot_sha256']) {
    if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v9 ${key} is invalid`);
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
    'all_required_pc11_refusal_rules_present'
  ]) if (integrity[key] !== true) errors.push(`compiled v9 control_integrity.${key} must be true`);

  const pc11 = array(compiled?.controls).find(control => control.control_id === 'PC-11');
  if (!pc11) errors.push('compiled v9 PC-11 control is missing');
  else {
    const proof = object(pc11.proof_summary);
    if (proof.world_count !== 6) errors.push('PC-11 must preserve six worlds');
    if (proof.distinct_surface_headline_signatures !== 1) errors.push('PC-11 must preserve one surfaced headline');
    if (proof.distinct_latent_headline_signatures !== 2) errors.push('PC-11 must preserve two latent headlines');
    if (proof.distinct_report_headline_signatures !== 2) errors.push('PC-11 must preserve two report headlines');
    if (proof.distinct_action_headline_signatures !== 2) errors.push('PC-11 must preserve two action headlines');
    if (proof.distinct_mechanism_signatures !== 6) errors.push('PC-11 must preserve six mechanisms');
    if (proof.worlds_with_latent_conversion !== 3 || proof.worlds_without_latent_conversion !== 3) errors.push('PC-11 must preserve three conversion and three nonconversion worlds');
    if (proof.worlds_with_independent_conversion !== 1) errors.push('PC-11 must preserve one independent-conversion world');
    if (proof.worlds_with_peer_mediated_conversion !== 1) errors.push('PC-11 must preserve one peer-conversion world');
    if (proof.worlds_with_common_source_conversion !== 1) errors.push('PC-11 must preserve one common-source conversion world');
    if (proof.worlds_with_report_latent_divergence !== 1) errors.push('PC-11 must preserve one report-latent divergence world');
    if (proof.worlds_with_action_latent_divergence !== 1) errors.push('PC-11 must preserve one action-latent divergence world');
    if (proof.worlds_with_ranking_amplification !== 1) errors.push('PC-11 must preserve one ranking-amplification world');
    if (proof.worlds_with_network_mediated_response !== 3) errors.push('PC-11 must preserve three network-mediated response worlds');
    if (proof.worlds_with_collective_deliberation !== 0) errors.push('PC-11 must preserve zero collective-deliberation worlds');
    if (proof.stable_identity_worlds !== 6 || proof.stable_network_version_worlds !== 6 || proof.stable_instrument_worlds !== 6) errors.push('PC-11 must preserve stable identity, network, and instrument across all worlds');
    if (!close(proof.baseline_A_share, 0.6) || !close(proof.surfaced_A_share, 0.8) || !close(proof.surfaced_A_share_shift, 0.2)) errors.push('PC-11 must preserve the frozen 60-to-80 percent surface shift');
    if (!close(proof.maximum_surface_latent_total_variation, 0.2) || !close(proof.maximum_surface_report_total_variation, 0.2)) errors.push('PC-11 must preserve 20 percent maximum surface separation');
    for (const key of [
      'surface_majority_identifies_independent_preference_distribution',
      'correlated_change_identifies_peer_influence_without_source_separation',
      'homophily_identifies_contagion',
      'common_broadcast_is_peer_cascade',
      'public_report_always_equals_private_preference',
      'public_action_always_equals_private_preference',
      'surfaced_share_always_equals_population_report_share',
      'collective_deliberation_supported',
      'network_path_establishes_manipulation',
      'binding_public_authority_supported'
    ]) if (proof[key] !== false) errors.push(`PC-11 ${key} must remain false`);
    if (proof.peer_influence_path_supported_in_at_least_one_world !== true) errors.push('PC-11 must preserve at least one bounded peer-influence path');
  }

  if (!array(compiled?.identification_requirements).some(item => item.stage === 'network_dependence_and_collective_formation')) errors.push('compiled v9 network identification stage is missing');
  if (array(compiled?.open_frontiers).includes('endogenous_network_and_collective_preference_formation')) errors.push('compiled v9 must remove the resolved broad network frontier');
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v9 successor frontier missing: ${frontier}`);
  if (unique(compiled?.promotion_boundary?.real_case_requires).length < 50) errors.push('compiled v9 real-case promotion requirements are incomplete');
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v9 laboratory_controls_are_real_world_evidence', errors);
  if (!/^[0-9a-f]{64}$/.test(text(compiled?.custody_chain_head_sha256))) errors.push('compiled v9 custody head is invalid');
  const seen = new Set();
  let previous = null;
  for (const event of array(compiled?.custody_chain)) {
    if (!text(event?.event_id)) errors.push('compiled v9 custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate compiled v9 event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`compiled v9 event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`compiled v9 event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`compiled v9 event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (array(compiled?.custody_chain).at(-1)?.event_sha256 !== compiled?.custody_chain_head_sha256) errors.push('compiled v9 custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v9 caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPreferenceCustodyManifestV9Markdown(compiled) {
  const pc11 = compiled.controls.find(control => control.control_id === 'PC-11');
  const proof = pc11.proof_summary;
  const lines = [
    '# Preference custody laboratory floor v9',
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
    '## PC-11: network dependence, collective formation, and visibility',
    '',
    `- Worlds: ${proof.world_count}`,
    `- Distinct surfaced headlines: ${proof.distinct_surface_headline_signatures}`,
    `- Distinct latent headlines: ${proof.distinct_latent_headline_signatures}`,
    `- Distinct report headlines: ${proof.distinct_report_headline_signatures}`,
    `- Distinct action headlines: ${proof.distinct_action_headline_signatures}`,
    `- Distinct mechanisms: ${proof.distinct_mechanism_signatures}`,
    `- Latent-conversion worlds: ${proof.worlds_with_latent_conversion}`,
    `- Nonconversion worlds: ${proof.worlds_without_latent_conversion}`,
    `- Independent-conversion worlds: ${proof.worlds_with_independent_conversion}`,
    `- Peer-mediated conversion worlds: ${proof.worlds_with_peer_mediated_conversion}`,
    `- Common-source conversion worlds: ${proof.worlds_with_common_source_conversion}`,
    `- Report-latent divergence worlds: ${proof.worlds_with_report_latent_divergence}`,
    `- Action-latent divergence worlds: ${proof.worlds_with_action_latent_divergence}`,
    `- Ranking-amplification worlds: ${proof.worlds_with_ranking_amplification}`,
    `- Network-mediated response worlds: ${proof.worlds_with_network_mediated_response}`,
    `- Collective-deliberation worlds: ${proof.worlds_with_collective_deliberation}`,
    `- Frozen surfaced A shift: ${percentage(proof.surfaced_A_share_shift)}`,
    `- Maximum surface-latent separation: ${percentage(proof.maximum_surface_latent_total_variation)}`,
    `- Maximum surface-report separation: ${percentage(proof.maximum_surface_report_total_variation)}`,
    '',
    '## Floor integrity',
    ''
  ];
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
