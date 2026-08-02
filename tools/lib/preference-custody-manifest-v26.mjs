import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV25Build } from './preference-custody-manifest-v25.mjs';
import { validatePreferenceTopologyAssuranceBuild } from './preference-topology-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V26_SCHEMA_VERSION = 'preference-custody-control-manifest-v26@1';
export const PREFERENCE_CUSTODY_MANIFEST_V26_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v26-build@1';

const REQUIRED_CONTROL_IDS = [
  "PC-01",
  "PC-02",
  "PC-03",
  "PC-04",
  "PC-05",
  "PC-06",
  "PC-07",
  "PC-08",
  "PC-09",
  "PC-10",
  "PC-11",
  "PC-12",
  "PC-13",
  "PC-14",
  "PC-15",
  "PC-16",
  "PC-17",
  "PC-18",
  "PC-19",
  "PC-20",
  "PC-21",
  "PC-22",
  "PC-23",
  "PC-24",
  "PC-25",
  "PC-26",
  "PC-27",
  "PC-28"
];
const REQUIRED_SUCCESSOR_FRONTIERS = [
  "identity_resolution_entity_boundary_and_network_frame_assurance",
  "edge_ascertainment_multiplex_temporal_reconstruction_and_path_validity_governance"
];
const EXPECTED_PC28_METRICS = {
  "world_count": 8,
  "distinct_public_status_signatures": 1,
  "distinct_topology_provenance_signatures": 8,
  "complete_topology_assurance_worlds": 1,
  "identity_collision_fragmentation_worlds": 1,
  "boundary_truncation_worlds": 1,
  "differential_edge_censoring_worlds": 1,
  "structural_collapse_worlds": 1,
  "stale_nonconcurrent_topology_worlds": 1,
  "endogenous_rewiring_worlds": 1,
  "unvalidated_reconstruction_worlds": 1,
  "identity_resolution_complete_worlds": 7,
  "boundary_coverage_complete_worlds": 7,
  "edge_ascertainment_complete_worlds": 4,
  "layer_fidelity_complete_worlds": 7,
  "temporal_alignment_complete_worlds": 6,
  "pre_treatment_topology_complete_worlds": 6,
  "reconstruction_validation_complete_worlds": 7,
  "dynamic_exposure_complete_worlds": 1,
  "hidden_edge_audit_complete_worlds": 1,
  "path_validity_complete_worlds": 1,
  "current_topology_lineage_complete_worlds": 7,
  "total_false_merged_nodes": 20,
  "total_false_split_nodes": 20,
  "total_external_nodes_omitted": 30,
  "total_missing_true_edges": 1000,
  "total_censored_edges": 300,
  "total_direction_lost_edges": 400,
  "total_weight_lost_edges": 400,
  "total_layer_collapsed_edges": 400,
  "total_stale_edges": 600,
  "total_nonconcurrent_paths": 80,
  "total_rewired_edges": 200,
  "total_imputed_edges": 500,
  "total_false_positive_edges": 400,
  "total_false_negative_edges": 1000,
  "total_misclassified_exposure_paths": 340,
  "total_unsupported_topology_decisions": 700,
  "binding_public_authority_worlds": 0
};
const EXPECTED_FALSE_PC28_CLASSIFICATIONS = [
  "one_hundred_percent_node_coverage_identifies_complete_network_coverage",
  "stable_node_count_identifies_stable_identity",
  "declared_analytic_boundary_identifies_operational_system_boundary",
  "binary_adjacency_identifies_direction_sign_weight_layer_hyperedge_and_context_fidelity",
  "three_snapshots_identify_temporally_feasible_paths",
  "current_topology_identifies_pre_treatment_topology",
  "high_stability_coefficient_identifies_stable_edge_identity_and_path_validity",
  "observed_edge_identifies_true_edge_when_ascertainment_or_censoring_unresolved",
  "reconstructed_edge_identifies_observed_or_independently_validated_edge",
  "model_fit_identifies_path_validity",
  "post_assignment_topology_identifies_exogenous_exposure_map",
  "zero_published_missing_edges_identifies_zero_true_missing_edges",
  "public_topology_verified_status_identifies_complete_current_dynamic_correctable_authorized_evidence",
  "topology_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_or_intent",
  "binding_public_authority_supported",
  "manipulative_intent_inferable",
  "real_world_effect_claimed"
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

function summarizePc28(control, build) {
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
      ...Object.fromEntries(Object.keys(EXPECTED_PC28_METRICS).map(key => [key, build.metrics?.[key]])),
      ...Object.fromEntries(EXPECTED_FALSE_PC28_CLASSIFICATIONS.map(key => [key, build.classification?.[key]])),
      complete_topology_assurance_supported_in_at_least_one_world: build.classification?.complete_topology_assurance_supported_in_at_least_one_world
    }
  };
}

function buildV26Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({
    event_id: `${manifest.manifest_id}:base`,
    event_type: 'qualified_v25_floor_snapshot',
    evidence_class: 'compiled_synthetic_control_floor',
    authority: 'preference_custody_v25_compiler',
    source_event_ids: [],
    payload: {
      manifest_id: baseBuild.manifest_id,
      schema_version: baseBuild.schema_version,
      control_count: baseBuild.control_count,
      snapshot_sha256: sha256(baseBuild)
    }
  });
  push({
    event_id: `${manifest.manifest_id}:pc28`,
    event_type: 'pc28_identity_boundary_edge_temporal_reconstruction_path_and_dynamic_exposure_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'topology_assurance_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: { control: extensionControl, snapshot_sha256: sha256(extensionControl) }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'topology_assurance_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v26_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc28`],
    payload: { transition: manifest.frontier_transition, open_frontiers: openFrontiers }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'topology_assurance_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v26_compiler',
    source_event_ids: [`${manifest.manifest_id}:frontier`],
    payload: { identification_requirement: manifest.identification_requirement, real_case_requires: promotionRequirements }
  });
  push({
    event_id: `${manifest.manifest_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'preference_custody_v26_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: {
      allowed_interpretation: 'qualified twenty-eight-control synthetic Preference Custody floor',
      refused_promotions: [
        'laboratory_control_as_named_topology_finding',
        'node_coverage_as_complete_network_coverage',
        'stable_node_count_as_stable_identity',
        'declared_boundary_as_operational_system_boundary',
        'binary_adjacency_as_structural_fidelity',
        'snapshot_count_as_temporal_path_feasibility',
        'current_topology_as_pre_treatment_topology',
        'post_assignment_topology_as_exogenous_exposure_map',
        'reconstruction_model_fit_as_observed_edge_or_valid_path',
        'zero_published_missing_edges_as_zero_true_missing_edges',
        'topology_verified_status_as_public_authorization'
      ]
    }
  });
  return events;
}

export function validatePreferenceCustodyManifestV26(manifest) {
  const errors = [];
  const base = object(manifest?.base_floor);
  const control = object(manifest?.extension_control);
  const requirement = object(manifest?.identification_requirement);
  const transition = object(manifest?.frontier_transition);
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V26_SCHEMA_VERSION) errors.push('preference custody v26 manifest schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v26') errors.push('manifest_id must remain preference-custody-laboratory-floor-v26');
  if (manifest?.control_issue !== 769) errors.push('v26 control issue must remain 769');
  if (manifest?.status !== 'synthetic_control_floor_extension') errors.push('v26 manifest status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('v26 manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v26 manifest counts_toward_thesis_evidence', errors);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v25') errors.push('v26 base manifest must remain floor v25');
  if (!text(base.source_manifest_path) || base.expected_build_schema !== 'preference-custody-control-manifest-v25-build@1' || base.expected_control_count !== 27) errors.push('v26 base floor contract is incomplete');
  if (control.control_id !== 'PC-28') errors.push('v26 extension control must remain PC-28');
  if (control.fixture_id !== 'same-topology-verified-status-different-provenance-v1') errors.push('PC-28 fixture identity mismatch');
  if (control.failure_class !== 'network_topology_measurement_error_hidden_edge_dynamic_exposure_and_path_validity_equifinality') errors.push('PC-28 failure class mismatch');
  if (!text(control.source_fixture_path) || !text(control.build_artifact_path) || control.expected_build_schema !== 'preference-topology-assurance-build@1') errors.push('PC-28 source or build contract is incomplete');
  if (unique(control.required_refusal_rules).length < 16) errors.push('PC-28 refusal-rule contract is incomplete');
  if (requirement.stage !== 'network_identity_boundary_edge_layer_temporal_reconstruction_path_and_dynamic_exposure') errors.push('v26 identification stage mismatch');
  if (!text(requirement.required_state) || !text(requirement.refused_inference)) errors.push('v26 topology-assurance identification requirement is incomplete');
  if (transition.resolved_base_frontier !== 'network_topology_measurement_error_hidden_edge_and_dynamic_exposure_assurance') errors.push('v26 resolved frontier mismatch');
  if (!sameMembers(transition.successor_frontiers, REQUIRED_SUCCESSOR_FRONTIERS)) errors.push('v26 successor frontiers are incomplete');
  if (unique(manifest?.real_case_requirements_added).length < 60) errors.push('v26 topology-assurance real-case requirements are incomplete');
  if (array(manifest?.real_case_requirements_added).some(item => !/^[a-z0-9_]+$/.test(text(item)))) errors.push('v26 topology-assurance real-case requirements must be lowercase underscore-delimited machine identifiers');
  if (unique(manifest?.prohibited_inferences).length < 14) errors.push('v26 prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id) || !text(manifest?.interpretation_contract?.what_this_is) || !text(manifest?.interpretation_contract?.what_this_is_not) || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v26 interpretation contract is incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV26(manifest, baseBuild, topologyBuild) {
  const errors = validatePreferenceCustodyManifestV26(manifest);
  if (errors.length) throw new Error(`invalid preference custody v26 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV25Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v25 base build:\n- ${baseErrors.join('\n- ')}`);
  const topologyErrors = validatePreferenceTopologyAssuranceBuild(topologyBuild);
  if (topologyErrors.length) throw new Error(`invalid PC-28 build:\n- ${topologyErrors.join('\n- ')}`);
  if (baseBuild.manifest_id !== manifest.base_floor.manifest_id) throw new Error('v26 base manifest identity mismatch');
  if (baseBuild.schema_version !== manifest.base_floor.expected_build_schema) throw new Error('v26 base build schema mismatch');
  if (baseBuild.control_count !== manifest.base_floor.expected_control_count) throw new Error('v26 base control count mismatch');
  if (topologyBuild.fixture_id !== manifest.extension_control.fixture_id) throw new Error('v26 PC-28 fixture identity mismatch');
  if (topologyBuild.schema_version !== manifest.extension_control.expected_build_schema) throw new Error('v26 PC-28 build schema mismatch');

  const extensionControl = summarizePc28(manifest.extension_control, topologyBuild);
  const allRequiredRulesPresent = extensionControl.required_refusal_rules.every(rule => extensionControl.observed_refusal_rules.includes(rule));
  const completePathPreserved = extensionControl.proof_summary.complete_topology_assurance_supported_in_at_least_one_world === true;
  const controls = [...baseBuild.controls, extensionControl];
  const openFrontiers = unique([
    ...baseBuild.open_frontiers.filter(frontier => frontier !== manifest.frontier_transition.resolved_base_frontier),
    ...manifest.frontier_transition.successor_frontiers
  ]);
  const addedPromotionRequirements = unique(manifest.real_case_requirements_added).filter(item => !baseBuild.promotion_boundary.real_case_requires.includes(item));
  const promotionRequirements = unique([...baseBuild.promotion_boundary.real_case_requires, ...manifest.real_case_requirements_added]);
  const refusalRules = unique([...baseBuild.refusal_rule_union, ...extensionControl.observed_refusal_rules]);
  const identificationRequirements = [...baseBuild.identification_requirements, manifest.identification_requirement];
  const chain = buildV26Chain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements);

  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V26_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v26_qualified',
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
      base_floor_qualified: baseBuild.status === 'laboratory_floor_v25_qualified',
      base_integrity_preserved: Object.values(baseBuild.control_integrity).every(value => value === true),
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_pc28_refusal_rules_present: allRequiredRulesPresent,
      complete_topology_assurance_path_preserved: completePathPreserved
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

export function validatePreferenceCustodyManifestV26Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V26_BUILD_SCHEMA_VERSION) errors.push('preference custody v26 build schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v26') errors.push('compiled v26 manifest identity mismatch');
  if (compiled?.control_issue !== 769) errors.push('compiled v26 control issue must remain 769');
  if (compiled?.status !== 'laboratory_floor_v26_qualified') errors.push('compiled v26 status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled v26 graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v26 counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v26 conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled v26 real_world_evidence_state must remain none');
  if (compiled?.control_count !== 28) errors.push('compiled v26 must preserve twenty-eight controls');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v26 control IDs are incomplete');

  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v25') errors.push('compiled v26 base manifest mismatch');
  if (composition.base_control_count !== 27) errors.push('compiled v26 base control count must remain twenty-seven');
  if (composition.extension_control_id !== 'PC-28') errors.push('compiled v26 extension control must remain PC-28');
  for (const key of ['base_floor_snapshot_sha256','extension_snapshot_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v26 ${key} is invalid`);
  if (!Number.isInteger(composition.added_promotion_requirement_count) || composition.added_promotion_requirement_count < 60) errors.push('compiled v26 must add at least sixty promotion requirements');
  if (composition.final_promotion_requirement_count !== composition.base_promotion_requirement_count + composition.added_promotion_requirement_count) errors.push('compiled v26 promotion requirement counts do not reconcile');
  if (composition.final_promotion_requirement_count !== unique(compiled?.promotion_boundary?.real_case_requires).length) errors.push('compiled v26 final promotion count does not match the promotion boundary');

  const integrity = object(compiled?.control_integrity);
  for (const key of [
    'base_floor_qualified','base_integrity_preserved','all_graph_effect_none','no_thesis_evidence_consumption',
    'no_real_world_conclusion','no_preference_change_claim','no_intent_inference',
    'all_required_pc28_refusal_rules_present','complete_topology_assurance_path_preserved'
  ]) if (integrity[key] !== true) errors.push(`compiled v26 control_integrity.${key} must be true`);

  const pc28 = array(compiled?.controls).find(control => control.control_id === 'PC-28');
  if (!pc28) errors.push('compiled v26 PC-28 control is missing');
  else {
    const proof = object(pc28.proof_summary);
    for (const [key, value] of Object.entries(EXPECTED_PC28_METRICS)) if (!close(proof[key], value)) errors.push(`PC-28 ${key} must equal ${value}`);
    for (const key of EXPECTED_FALSE_PC28_CLASSIFICATIONS) if (proof[key] !== false) errors.push(`PC-28 ${key} must remain false`);
    if (proof.complete_topology_assurance_supported_in_at_least_one_world !== true) errors.push('PC-28 must preserve one complete topology-assurance path');
  }

  if (!array(compiled?.identification_requirements).some(item => item.stage === 'network_identity_boundary_edge_layer_temporal_reconstruction_path_and_dynamic_exposure')) errors.push('compiled v26 topology-assurance identification stage is missing');
  if (array(compiled?.open_frontiers).includes('network_topology_measurement_error_hidden_edge_and_dynamic_exposure_assurance')) errors.push('compiled v26 must remove the resolved broad topology frontier');
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v26 successor frontier missing: ${frontier}`);
  if (!array(compiled?.open_frontiers).includes('saturation_general_equilibrium_and_interference_robust_policy_governance')) errors.push('compiled v26 must preserve the independent saturation frontier');
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v26 laboratory_controls_are_real_world_evidence', errors);

  const chain = array(compiled?.custody_chain);
  if (chain.length !== 5) errors.push('compiled v26 custody chain must contain five events');
  const seen = new Set();
  let previous = null;
  for (const event of chain) {
    if (!text(event?.event_id)) errors.push('compiled v26 custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate compiled v26 event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`compiled v26 event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`compiled v26 event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`compiled v26 event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (!/^[0-9a-f]{64}$/.test(text(compiled?.custody_chain_head_sha256))) errors.push('compiled v26 custody head is invalid');
  if (chain.at(-1)?.event_sha256 !== compiled?.custody_chain_head_sha256) errors.push('compiled v26 custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v26 caveat is required');
  return errors;
}

export function renderPreferenceCustodyManifestV26Markdown(compiled) {
  const proof = compiled.controls.find(control => control.control_id === 'PC-28').proof_summary;
  const lines = [
    '# Preference custody laboratory floor v26','',
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
    '## PC-28: topology measurement error, hidden-edge, and dynamic exposure',''
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
