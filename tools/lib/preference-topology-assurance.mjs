import { createHash } from 'node:crypto';

export const PREFERENCE_TOPOLOGY_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-topology-assurance-fixture@1';
export const PREFERENCE_TOPOLOGY_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-topology-assurance-build@1';

const WORLD_IDS = [
  "complete-identity-boundary-multiplex-temporal-dynamic-topology",
  "identity-collision-and-fragmentation",
  "boundary-truncation-and-omitted-bridging-ties",
  "differential-edge-censoring-and-reporting",
  "direction-sign-weight-layer-and-hyperedge-collapse",
  "stale-snapshots-and-nonconcurrent-temporal-paths",
  "post-assignment-endogenous-rewiring",
  "unvalidated-model-reconstructed-edges-and-paths"
];
const FLAG_KEYS = [
  "complete_topology_assurance",
  "identity_collision_fragmentation_present",
  "boundary_truncation_present",
  "differential_edge_censoring_present",
  "structural_collapse_present",
  "stale_nonconcurrent_topology_present",
  "endogenous_rewiring_present",
  "unvalidated_reconstruction_present",
  "identity_resolution_complete",
  "boundary_coverage_complete",
  "edge_ascertainment_complete",
  "layer_fidelity_complete",
  "temporal_alignment_complete",
  "pre_treatment_topology_complete",
  "reconstruction_validation_complete",
  "dynamic_exposure_complete",
  "hidden_edge_audit_complete",
  "path_validity_complete",
  "current_topology_lineage_complete"
];
const EXPECTED_METRICS = {
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
const FALSE_CLASSIFICATIONS = [
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
const REQUIRED_RULES = [
  "one_hundred_percent_node_coverage_is_not_complete_network_coverage",
  "stable_node_count_is_not_stable_identity",
  "declared_analytic_boundary_is_not_operational_system_boundary",
  "binary_adjacency_is_not_direction_sign_weight_layer_hyperedge_or_shared_context_fidelity",
  "three_snapshots_are_not_temporally_feasible_paths",
  "current_topology_is_not_pre_treatment_topology",
  "high_stability_coefficient_is_not_stable_edge_identity_or_path_validity",
  "observed_edge_is_not_true_edge_when_ascertainment_or_censoring_is_unresolved",
  "reconstructed_edge_is_not_observed_or_independently_validated_edge",
  "model_fit_is_not_path_validity",
  "post_assignment_topology_is_not_exogenous_exposure_map",
  "zero_published_missing_edges_is_not_zero_true_missing_edges",
  "public_topology_verified_status_is_not_complete_identity_valid_boundary_complete_edge_complete_temporally_aligned_dynamic_correctable_authorized_evidence",
  "topology_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_or_intent",
  "topology_claim_requires_identity_boundary_edge_layer_temporal_treatment_reconstruction_hidden_edge_path_dynamic_exposure_succession_correction_durability_and_authority_custody",
  "binding_public_authority_requires_separate_current_public_authorization_receipts"
];
const BASELINE = {
  "operative_release_id": "RELEASE-INCIDENT-V1",
  "operative_release_version": 1,
  "observed_nodes": 100,
  "published_node_coverage": 1.0,
  "published_edges": 1000,
  "published_missing_edges": 0,
  "published_snapshots": 3,
  "public_topology_status": "topology_verified",
  "published_stability_coefficient": 0.95,
  "declared_pre_treatment_map": "complete",
  "approved_use": "interference_adjusted_effect",
  "reference_identity_version": "IDENTITY-V1",
  "reference_boundary_version": "BOUNDARY-V1",
  "reference_topology_version": "TOPOLOGY-V1",
  "binding_public_authority": false
};

const EPSILON = 1e-12;
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const sorted = values => [...values].sort((left, right) => String(left).localeCompare(String(right)));
const close = (left, right) => Math.abs(Number(left) - Number(right)) <= EPSILON;
const sameMembers = (left, right) => JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const falseRequired = (value, label, errors) => { if (value !== false) errors.push(`${label} must remain false`); };

function deepMerge(base, override) {
  if (Array.isArray(override)) return override.map(canonical);
  if (!override || typeof override !== 'object') return override;
  const result = { ...object(base) };
  for (const [key, value] of Object.entries(override)) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(result[key], value)
      : canonical(value);
  }
  return result;
}

function expandWorld(fixture, record) {
  return {
    world_id: record.world_id,
    mechanism: record.mechanism,
    ...deepMerge(fixture.world_defaults, record.overrides),
    expected_flags: record.expected_flags
  };
}

function expectedPublicClaim(baseline) {
  return Object.fromEntries([
    'operative_release_id','operative_release_version','observed_nodes','published_node_coverage',
    'published_edges','published_missing_edges','published_snapshots','public_topology_status',
    'published_stability_coefficient','declared_pre_treatment_map','approved_use'
  ].map(key => [key, baseline[key]]));
}

function requireInteger(record, key, min, max, label, errors) {
  const value = record[key];
  if (!Number.isInteger(value) || value < min || value > max) errors.push(`${label}.${key} is invalid`);
}

function validateExpandedWorld(world, baseline, errors) {
  const id = text(world.world_id) || '(missing world ID)';
  const i = object(world.identity);
  const b = object(world.boundary);
  const e = object(world.edges);
  const t = object(world.temporal);
  const r = object(world.rewiring);
  const m = object(world.reconstruction);
  const p = object(world.paths);
  const l = object(world.lineage);
  const g = object(world.governance);
  const f = object(world.expected_flags);

  if (!text(world.mechanism)) errors.push(`world ${id} mechanism is required`);
  if (JSON.stringify(canonical(world.public_claim)) !== JSON.stringify(canonical(expectedPublicClaim(baseline)))) {
    errors.push(`world ${id} must preserve the frozen topology-publication surface`);
  }

  for (const key of ['observed_record_count','true_entity_count','resolved_entity_count','false_merged_node_count','false_split_node_count','collision_count','fragmentation_count']) {
    requireInteger(i, key, 0, 200, `world ${id} identity`, errors);
  }
  if (i.observed_record_count !== 100 || i.resolved_entity_count !== 100) errors.push(`world ${id} must preserve the stable one-hundred-node publication denominator`);
  for (const key of ['stable_identity']) if (typeof i[key] !== 'boolean') errors.push(`world ${id} identity.${key} must be boolean`);
  for (const key of ['identity_map_id','approved_version','executed_version','alias_state','resolution_audit_state']) if (!text(i[key])) errors.push(`world ${id} identity.${key} is required`);

  for (const key of ['internal_node_count','external_node_count','omitted_external_node_count','bridging_tie_count','omitted_bridging_tie_count']) {
    requireInteger(b, key, 0, 5000, `world ${id} boundary`, errors);
  }
  if (b.internal_node_count !== 100) errors.push(`world ${id} internal node denominator must remain one hundred`);
  if (b.omitted_external_node_count > b.external_node_count) errors.push(`world ${id} omitted external nodes exceed external nodes`);
  if (b.omitted_bridging_tie_count > b.bridging_tie_count) errors.push(`world ${id} omitted bridging ties exceed bridging ties`);
  for (const key of ['boundary_id','declared_version','executed_version','declared_scope','operational_scope','boundary_state','alternate_boundary_test_state']) if (!text(b[key])) errors.push(`world ${id} boundary.${key} is required`);

  for (const key of [
    'true_edge_count','published_edge_count','direct_observed_edge_count','missing_true_edge_count','censored_edge_count',
    'direction_lost_edge_count','sign_lost_edge_count','weight_lost_edge_count','layer_collapsed_edge_count',
    'hyperedge_collapsed_count','shared_context_collapsed_count','imputed_edge_count','false_positive_edge_count','false_negative_edge_count'
  ]) requireInteger(e, key, 0, 10000, `world ${id} edges`, errors);
  if (e.published_edge_count !== 1000) errors.push(`world ${id} published edge denominator must remain one thousand`);
  if (e.direct_observed_edge_count + e.imputed_edge_count !== e.published_edge_count) errors.push(`world ${id} observed and imputed published edges must reconcile`);
  if (e.true_edge_count + e.false_positive_edge_count - e.false_negative_edge_count !== e.published_edge_count) errors.push(`world ${id} true, false-positive, false-negative, and published edges must reconcile`);
  if (e.missing_true_edge_count !== e.false_negative_edge_count) errors.push(`world ${id} missing and false-negative true edges must reconcile`);
  if (e.censored_edge_count > e.missing_true_edge_count) errors.push(`world ${id} censored edges exceed missing true edges`);
  for (const key of ['edge_map_id','approved_version','executed_version','ascertainment_state','direction_state','sign_state','weight_state','layer_state','hyperedge_state','shared_context_state','edge_audit_state']) if (!text(e[key])) errors.push(`world ${id} edges.${key} is required`);

  requireInteger(t, 'snapshot_count', 0, 100, `world ${id} temporal`, errors);
  requireInteger(t, 'assignment_time', -100000, 100000, `world ${id} temporal`, errors);
  requireInteger(t, 'treatment_start_time', -100000, 100000, `world ${id} temporal`, errors);
  requireInteger(t, 'outcome_time', -100000, 100000, `world ${id} temporal`, errors);
  requireInteger(t, 'stale_edge_count', 0, 10000, `world ${id} temporal`, errors);
  requireInteger(t, 'nonconcurrent_path_count', 0, 10000, `world ${id} temporal`, errors);
  if (t.snapshot_count !== 3 || array(t.snapshot_times).length !== 3 || array(t.snapshot_times).some(value => !Number.isInteger(value))) errors.push(`world ${id} must preserve three integer snapshot times`);
  if (typeof t.pre_treatment_topology !== 'boolean') errors.push(`world ${id} temporal.pre_treatment_topology must be boolean`);
  for (const key of ['snapshot_set_id','validity_interval_state','temporal_alignment_state','ordered_path_test_state']) if (!text(t[key])) errors.push(`world ${id} temporal.${key} is required`);

  for (const key of ['post_assignment_rewired_edge_count','created_edge_count','deleted_edge_count']) requireInteger(r, key, 0, 10000, `world ${id} rewiring`, errors);
  if (r.created_edge_count + r.deleted_edge_count !== r.post_assignment_rewired_edge_count) errors.push(`world ${id} rewiring counts must reconcile`);
  if (typeof r.endogenous_post_assignment_topology !== 'boolean') errors.push(`world ${id} rewiring.endogenous_post_assignment_topology must be boolean`);
  for (const key of ['rewiring_state','change_point_test_state']) if (!text(r[key])) errors.push(`world ${id} rewiring.${key} is required`);

  requireInteger(m, 'validation_sample_count', 0, 10000, `world ${id} reconstruction`, errors);
  if (typeof m.independent_validation !== 'boolean') errors.push(`world ${id} reconstruction.independent_validation must be boolean`);
  for (const key of ['model_id','model_version','feature_source','training_data_state','calibration_state','validation_state']) if (!text(m[key])) errors.push(`world ${id} reconstruction.${key} is required`);

  for (const key of ['evaluated_path_count','feasible_path_count','misclassified_exposure_path_count']) requireInteger(p, key, 0, 10000, `world ${id} paths`, errors);
  if (p.feasible_path_count > p.evaluated_path_count || p.misclassified_exposure_path_count > p.evaluated_path_count) errors.push(`world ${id} path counts are inconsistent`);
  for (const key of ['direction_checked','layer_checked','temporal_concurrency_checked','boundary_checked']) if (typeof p[key] !== 'boolean') errors.push(`world ${id} paths.${key} must be boolean`);
  for (const key of ['path_model_id','dose_accumulation_state','dynamic_exposure_state','hidden_edge_audit_state','bridge_audit_state','placebo_edge_state','falsification_path_state','path_validity_state']) if (!text(p[key])) errors.push(`world ${id} paths.${key} is required`);

  for (const key of [
    'approved_identity_version','executed_identity_version','approved_boundary_version','executed_boundary_version',
    'approved_topology_version','executed_topology_version','approved_snapshot_set','executed_snapshot_set',
    'approved_reconstruction_version','executed_reconstruction_version','revalidation_state'
  ]) if (!text(l[key])) errors.push(`world ${id} lineage.${key} is required`);
  if (l.succession_receipt !== null && !text(l.succession_receipt)) errors.push(`world ${id} lineage succession receipt is invalid`);

  requireInteger(g, 'unsupported_topology_decision_count', 0, 100, `world ${id} governance`, errors);
  falseRequired(g.binding_public_authority, `world ${id} binding public authority`, errors);
  for (const key of ['monitoring_state','correction_state','appeal_state','certificate_state','audit_state']) if (!text(g[key])) errors.push(`world ${id} governance.${key} is required`);

  if (!sameMembers(Object.keys(f), FLAG_KEYS)) errors.push(`world ${id} expected flags are incomplete`);
  for (const key of FLAG_KEYS) if (typeof f[key] !== 'boolean') errors.push(`world ${id} expected_flags.${key} must be boolean`);
}

function deriveFlags(world) {
  const i = world.identity;
  const b = world.boundary;
  const e = world.edges;
  const t = world.temporal;
  const r = world.rewiring;
  const m = world.reconstruction;
  const p = world.paths;
  const l = world.lineage;
  const g = world.governance;

  const identityError = i.false_merged_node_count > 0 || i.false_split_node_count > 0 || i.collision_count > 0 || i.fragmentation_count > 0 || !i.stable_identity;
  const boundaryTruncation = b.omitted_external_node_count > 0 || b.omitted_bridging_tie_count > 0 || b.boundary_state !== 'operational_complete';
  const differentialCensoring = e.censored_edge_count > 0 || e.ascertainment_state === 'differentially_censored';
  const structuralCollapse = [
    e.direction_lost_edge_count,e.sign_lost_edge_count,e.weight_lost_edge_count,e.layer_collapsed_edge_count,
    e.hyperedge_collapsed_count,e.shared_context_collapsed_count
  ].some(value => value > 0);
  const staleNonconcurrent = t.stale_edge_count > 0 || t.nonconcurrent_path_count > 0 || ['nonconcurrent','stale'].includes(t.temporal_alignment_state);
  const endogenousRewiring = r.post_assignment_rewired_edge_count > 0 || r.endogenous_post_assignment_topology;
  const unvalidatedReconstruction = e.imputed_edge_count > 0 && (!m.independent_validation || m.validation_state !== 'independently_validated');

  const identityComplete = !identityError && i.approved_version === i.executed_version && i.resolution_audit_state === 'independent_complete';
  const boundaryComplete = !boundaryTruncation && b.declared_version === b.executed_version && b.declared_scope === b.operational_scope && b.alternate_boundary_test_state === 'independent_complete';
  const edgeComplete = e.missing_true_edge_count === 0 && e.censored_edge_count === 0 && e.false_positive_edge_count === 0 && e.false_negative_edge_count === 0 && e.ascertainment_state === 'complete_observed';
  const layerComplete = !structuralCollapse && e.direction_state === 'preserved' && e.sign_state === 'preserved' && e.weight_state === 'preserved' && e.layer_state === 'multiplex_complete' && e.hyperedge_state === 'preserved' && e.shared_context_state === 'preserved';
  const temporalComplete = t.snapshot_count === 3 && t.temporal_alignment_state === 'concurrent_feasible' && t.validity_interval_state === 'complete' && t.nonconcurrent_path_count === 0 && t.ordered_path_test_state === 'independent_complete';
  const preTreatmentComplete = t.pre_treatment_topology && array(t.snapshot_times).every(time => time < t.assignment_time) && !endogenousRewiring;
  const reconstructionComplete = e.imputed_edge_count === 0
    ? m.validation_state === 'not_required_observed_edges' && m.independent_validation
    : m.validation_state === 'independently_validated' && m.independent_validation;
  const hiddenAudit = p.hidden_edge_audit_state === 'independent_complete' && p.bridge_audit_state === 'independent_complete' && p.placebo_edge_state === 'negative_controls_complete' && p.falsification_path_state === 'independent_complete';
  const pathValid = p.path_validity_state === 'independent_complete' && p.direction_checked && p.layer_checked && p.temporal_concurrency_checked && p.boundary_checked && p.feasible_path_count === p.evaluated_path_count && p.misclassified_exposure_path_count === 0;
  const lineage = l.approved_identity_version === l.executed_identity_version && l.approved_boundary_version === l.executed_boundary_version && l.approved_topology_version === l.executed_topology_version && l.approved_snapshot_set === l.executed_snapshot_set && l.approved_reconstruction_version === l.executed_reconstruction_version && l.revalidation_state === 'current' && Boolean(text(l.succession_receipt));
  const dynamic = identityComplete && boundaryComplete && edgeComplete && layerComplete && temporalComplete && preTreatmentComplete && reconstructionComplete && hiddenAudit && pathValid && lineage && p.dynamic_exposure_state === 'complete' && p.dose_accumulation_state === 'complete';
  const complete = dynamic && g.unsupported_topology_decision_count === 0 && g.audit_state === 'independent_complete' && g.correction_state === 'recompute_revoke_and_reissue_operational';

  return {
    complete_topology_assurance: complete,
    identity_collision_fragmentation_present: identityError,
    boundary_truncation_present: boundaryTruncation,
    differential_edge_censoring_present: differentialCensoring,
    structural_collapse_present: structuralCollapse,
    stale_nonconcurrent_topology_present: staleNonconcurrent,
    endogenous_rewiring_present: endogenousRewiring,
    unvalidated_reconstruction_present: unvalidatedReconstruction,
    identity_resolution_complete: identityComplete,
    boundary_coverage_complete: boundaryComplete,
    edge_ascertainment_complete: edgeComplete,
    layer_fidelity_complete: layerComplete,
    temporal_alignment_complete: temporalComplete,
    pre_treatment_topology_complete: preTreatmentComplete,
    reconstruction_validation_complete: reconstructionComplete,
    dynamic_exposure_complete: dynamic,
    hidden_edge_audit_complete: hiddenAudit,
    path_validity_complete: pathValid,
    current_topology_lineage_complete: lineage
  };
}

export function validatePreferenceTopologyAssuranceFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_TOPOLOGY_ASSURANCE_FIXTURE_SCHEMA_VERSION) errors.push('topology-assurance fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-topology-verified-status-different-provenance-v1') errors.push('topology-assurance fixture identity mismatch');
  if (fixture?.issue !== 769 || fixture?.parent_program_issue !== 594) errors.push('topology-assurance issue lineage mismatch');
  if (fixture?.status !== 'synthetic_control' || fixture?.graph_effect !== 'none') errors.push('topology-assurance fixture status or graph effect mismatch');
  falseRequired(fixture?.counts_toward_thesis_evidence, 'fixture counts_toward_thesis_evidence', errors);
  if (JSON.stringify(canonical(fixture?.baseline)) !== JSON.stringify(canonical(BASELINE))) errors.push('topology-assurance baseline contract mismatch');
  if (!object(fixture?.world_defaults).public_claim) errors.push('topology-assurance world defaults are incomplete');

  const records = array(fixture?.worlds);
  if (!sameMembers(records.map(record => record?.world_id), WORLD_IDS)) errors.push('fixture must contain exactly the eight required topology-assurance worlds');
  if (unique(records.map(record => record?.world_id)).length !== records.length) errors.push('topology-assurance world IDs must be unique');
  for (const record of records) {
    if (!text(record?.world_id) || !text(record?.mechanism) || typeof record?.overrides !== 'object' || !record?.expected_flags) errors.push('topology-assurance world record is incomplete');
    validateExpandedWorld(expandWorld(fixture, record), fixture.baseline, errors);
  }

  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (!close(fixture?.expected_metrics?.[key], value)) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const key of FALSE_CLASSIFICATIONS) if (fixture?.expected_classification?.[key] !== false) errors.push(`expected_classification.${key} must remain false`);
  if (fixture?.expected_classification?.complete_topology_assurance_supported_in_at_least_one_world !== true) errors.push('expected classification must preserve one complete topology-assurance path');
  for (const rule of REQUIRED_RULES) if (!unique(fixture?.required_refusal_rules).includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 15) errors.push('topology-assurance prohibited-inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('topology-assurance interpretation contract is incomplete');
  return errors;
}

function seal(event, previous) {
  const unsigned = { ...event, previous_event_sha256: previous };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

export function validatePreferenceTopologyAssuranceChain(chain) {
  const errors = [];
  const events = array(chain);
  if (events.length !== 10) errors.push('topology-assurance custody chain must contain ten events');
  let previous = null;
  for (const event of events) {
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event.previous_event_sha256 !== previous) errors.push(`custody event ${event.event_id} previous hash mismatch`);
    if (event.event_sha256 !== sha256(unsigned)) errors.push(`custody event ${event.event_id} hash mismatch`);
    previous = event.event_sha256;
  }
  return errors;
}

function buildChain(result) {
  const events = [];
  let previous = null;
  const push = event => { const sealed = seal(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  push({event_id:`${result.world_id}:public`,event_type:'topology_publication_surface_frozen',source_event_ids:[],payload:result.public_claim});
  push({event_id:`${result.world_id}:identity`,event_type:'node_identity_resolution_state',source_event_ids:[`${result.world_id}:public`],payload:result.identity});
  push({event_id:`${result.world_id}:boundary`,event_type:'network_boundary_and_external_node_state',source_event_ids:[`${result.world_id}:identity`],payload:result.boundary});
  push({event_id:`${result.world_id}:edges`,event_type:'edge_ascertainment_structure_and_missingness_state',source_event_ids:[`${result.world_id}:boundary`],payload:result.edges});
  push({event_id:`${result.world_id}:temporal`,event_type:'snapshot_temporal_alignment_and_rewiring_state',source_event_ids:[`${result.world_id}:edges`],payload:{temporal:result.temporal,rewiring:result.rewiring}});
  push({event_id:`${result.world_id}:reconstruction`,event_type:'edge_reconstruction_model_and_validation_state',source_event_ids:[`${result.world_id}:temporal`],payload:result.reconstruction});
  push({event_id:`${result.world_id}:paths`,event_type:'path_feasibility_hidden_edge_and_dynamic_exposure_state',source_event_ids:[`${result.world_id}:reconstruction`],payload:result.paths});
  push({event_id:`${result.world_id}:lineage`,event_type:'topology_version_succession_and_revalidation_state',source_event_ids:[`${result.world_id}:paths`],payload:result.lineage});
  push({event_id:`${result.world_id}:governance`,event_type:'topology_consequence_correction_appeal_and_authority_state',source_event_ids:[`${result.world_id}:lineage`],payload:result.governance});
  push({event_id:`${result.world_id}:classification`,event_type:'topology_provenance_mechanism_classified',source_event_ids:[`${result.world_id}:governance`],payload:{mechanism:result.mechanism,flags:result.flags}});
  return events;
}

export function compilePreferenceTopologyAssuranceFixture(fixture) {
  const errors = validatePreferenceTopologyAssuranceFixture(fixture);
  if (errors.length) throw new Error(`invalid preference topology-assurance fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(record => {
    const world = expandWorld(fixture, record);
    const flags = deriveFlags(world);
    for (const key of FLAG_KEYS) if (flags[key] !== world.expected_flags[key]) throw new Error(`world ${world.world_id} flag ${key} mismatch: expected ${world.expected_flags[key]}, observed ${flags[key]}`);
    const result = { ...world, flags };
    delete result.expected_flags;
    result.public_status_signature_sha256 = sha256(result.public_claim);
    result.topology_provenance_signature_sha256 = sha256({identity:result.identity,boundary:result.boundary,edges:result.edges,temporal:result.temporal,rewiring:result.rewiring,reconstruction:result.reconstruction,paths:result.paths,lineage:result.lineage,governance:result.governance,flags});
    result.custody_chain = buildChain(result);
    result.custody_chain_head_sha256 = result.custody_chain.at(-1).event_sha256;
    return result;
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));

  const count = flag => worlds.filter(world => world.flags[flag]).length;
  const sum = (section, key) => worlds.reduce((total, world) => total + Number(world[section][key]), 0);
  const metrics = {
    world_count: worlds.length,
    distinct_public_status_signatures: unique(worlds.map(world => world.public_status_signature_sha256)).length,
    distinct_topology_provenance_signatures: unique(worlds.map(world => world.topology_provenance_signature_sha256)).length,
    complete_topology_assurance_worlds: count('complete_topology_assurance'),
    identity_collision_fragmentation_worlds: count('identity_collision_fragmentation_present'),
    boundary_truncation_worlds: count('boundary_truncation_present'),
    differential_edge_censoring_worlds: count('differential_edge_censoring_present'),
    structural_collapse_worlds: count('structural_collapse_present'),
    stale_nonconcurrent_topology_worlds: count('stale_nonconcurrent_topology_present'),
    endogenous_rewiring_worlds: count('endogenous_rewiring_present'),
    unvalidated_reconstruction_worlds: count('unvalidated_reconstruction_present'),
    identity_resolution_complete_worlds: count('identity_resolution_complete'),
    boundary_coverage_complete_worlds: count('boundary_coverage_complete'),
    edge_ascertainment_complete_worlds: count('edge_ascertainment_complete'),
    layer_fidelity_complete_worlds: count('layer_fidelity_complete'),
    temporal_alignment_complete_worlds: count('temporal_alignment_complete'),
    pre_treatment_topology_complete_worlds: count('pre_treatment_topology_complete'),
    reconstruction_validation_complete_worlds: count('reconstruction_validation_complete'),
    dynamic_exposure_complete_worlds: count('dynamic_exposure_complete'),
    hidden_edge_audit_complete_worlds: count('hidden_edge_audit_complete'),
    path_validity_complete_worlds: count('path_validity_complete'),
    current_topology_lineage_complete_worlds: count('current_topology_lineage_complete'),
    total_false_merged_nodes: sum('identity','false_merged_node_count'),
    total_false_split_nodes: sum('identity','false_split_node_count'),
    total_external_nodes_omitted: sum('boundary','omitted_external_node_count'),
    total_missing_true_edges: sum('edges','missing_true_edge_count'),
    total_censored_edges: sum('edges','censored_edge_count'),
    total_direction_lost_edges: sum('edges','direction_lost_edge_count'),
    total_weight_lost_edges: sum('edges','weight_lost_edge_count'),
    total_layer_collapsed_edges: sum('edges','layer_collapsed_edge_count'),
    total_stale_edges: sum('temporal','stale_edge_count'),
    total_nonconcurrent_paths: sum('temporal','nonconcurrent_path_count'),
    total_rewired_edges: sum('rewiring','post_assignment_rewired_edge_count'),
    total_imputed_edges: sum('edges','imputed_edge_count'),
    total_false_positive_edges: sum('edges','false_positive_edge_count'),
    total_false_negative_edges: sum('edges','false_negative_edge_count'),
    total_misclassified_exposure_paths: sum('paths','misclassified_exposure_path_count'),
    total_unsupported_topology_decisions: sum('governance','unsupported_topology_decision_count'),
    binding_public_authority_worlds: 0
  };
  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (!close(metrics[key], value)) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);

  return {
    schema_version: PREFERENCE_TOPOLOGY_ASSURANCE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'network_topology_identity_boundary_edge_temporal_reconstruction_and_path_assurance_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    baseline: fixture.baseline,
    worlds,
    metrics,
    classification: { ...fixture.expected_classification, preference_change_present: false },
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validatePreferenceTopologyAssuranceBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_TOPOLOGY_ASSURANCE_BUILD_SCHEMA_VERSION || compiled?.fixture_id !== 'same-topology-verified-status-different-provenance-v1') errors.push('compiled topology-assurance identity or schema mismatch');
  if (compiled?.issue !== 769 || compiled?.status !== 'network_topology_identity_boundary_edge_temporal_reconstruction_and_path_assurance_qualified') errors.push('compiled topology-assurance issue or status mismatch');
  if (compiled?.graph_effect !== 'none' || compiled?.real_world_evidence_state !== 'none') errors.push('compiled topology-assurance evidence boundary mismatch');
  falseRequired(compiled?.counts_toward_thesis_evidence, 'compiled counts_toward_thesis_evidence', errors);
  falseRequired(compiled?.conclusion_generated, 'compiled conclusion_generated', errors);
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), WORLD_IDS)) errors.push('compiled topology-assurance worlds are incomplete');
  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (!close(compiled?.metrics?.[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const key of FALSE_CLASSIFICATIONS) if (compiled?.classification?.[key] !== false) errors.push(`compiled classification.${key} must remain false`);
  falseRequired(compiled?.classification?.preference_change_present, 'compiled preference_change_present', errors);
  if (compiled?.classification?.complete_topology_assurance_supported_in_at_least_one_world !== true) errors.push('compiled build must preserve one complete topology-assurance path');

  for (const world of array(compiled?.worlds)) {
    if (!sameMembers(Object.keys(world.flags), FLAG_KEYS)) errors.push(`compiled world ${world.world_id} flags are incomplete`);
    if (!/^[0-9a-f]{64}$/.test(text(world.public_status_signature_sha256)) || !/^[0-9a-f]{64}$/.test(text(world.topology_provenance_signature_sha256))) errors.push(`compiled world ${world.world_id} signature is invalid`);
    errors.push(...validatePreferenceTopologyAssuranceChain(world.custody_chain));
    if (world.custody_chain.at(-1)?.event_sha256 !== world.custody_chain_head_sha256) errors.push(`compiled world ${world.world_id} custody head mismatch`);
  }
  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  if (byId['complete-identity-boundary-multiplex-temporal-dynamic-topology']?.flags.complete_topology_assurance !== true) errors.push('positive world must preserve complete topology assurance');
  if (byId['identity-collision-and-fragmentation']?.flags.identity_collision_fragmentation_present !== true) errors.push('identity collision and fragmentation control is missing');
  if (byId['boundary-truncation-and-omitted-bridging-ties']?.flags.boundary_truncation_present !== true) errors.push('boundary truncation control is missing');
  if (byId['differential-edge-censoring-and-reporting']?.flags.differential_edge_censoring_present !== true) errors.push('edge censoring control is missing');
  if (byId['direction-sign-weight-layer-and-hyperedge-collapse']?.flags.structural_collapse_present !== true) errors.push('structural collapse control is missing');
  if (byId['stale-snapshots-and-nonconcurrent-temporal-paths']?.flags.stale_nonconcurrent_topology_present !== true) errors.push('stale nonconcurrent topology control is missing');
  if (byId['post-assignment-endogenous-rewiring']?.flags.endogenous_rewiring_present !== true) errors.push('endogenous rewiring control is missing');
  if (byId['unvalidated-model-reconstructed-edges-and-paths']?.flags.unvalidated_reconstruction_present !== true) errors.push('unvalidated reconstruction control is missing');
  if (unique(compiled?.refusal_rules).length < 16 || !text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled topology-assurance interpretation boundary is incomplete');
  return errors;
}

export function renderPreferenceTopologyAssuranceMarkdown(compiled) {
  const lines = [
    '# Topology measurement error, hidden-edge, and dynamic-exposure custody','',
    `**Status:** ${compiled.status}`,'',
    `**Worlds:** ${compiled.metrics.world_count}`,'',
    `**Public topology status:** ${compiled.baseline.public_topology_status}`,'',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,'',
    '## Candidate worlds',''
  ];
  for (const world of compiled.worlds) {
    lines.push(
      `### ${world.world_id}`,'',
      `- Mechanism: ${world.mechanism}`,
      `- False merged nodes: ${world.identity.false_merged_node_count}`,
      `- False split nodes: ${world.identity.false_split_node_count}`,
      `- External nodes omitted: ${world.boundary.omitted_external_node_count}`,
      `- Missing true edges: ${world.edges.missing_true_edge_count}`,
      `- Censored edges: ${world.edges.censored_edge_count}`,
      `- Imputed edges: ${world.edges.imputed_edge_count}`,
      `- Stale edges: ${world.temporal.stale_edge_count}`,
      `- Nonconcurrent paths: ${world.temporal.nonconcurrent_path_count}`,
      `- Rewired edges: ${world.rewiring.post_assignment_rewired_edge_count}`,
      `- Misclassified exposure paths: ${world.paths.misclassified_exposure_path_count}`,
      `- Complete assurance: ${world.flags.complete_topology_assurance}`,
      `- Custody head: ${world.custody_chain_head_sha256}`,''
    );
  }
  lines.push('## Aggregate separations','');
  for (const [key, value] of Object.entries(compiled.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('','## Classification','');
  for (const [key, value] of Object.entries(compiled.classification)) lines.push(`- ${key}: ${value}`);
  lines.push('','## Refusal rules','');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('','## Prohibited inferences','');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
