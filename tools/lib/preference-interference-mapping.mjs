import { createHash } from 'node:crypto';

export const PREFERENCE_INTERFERENCE_MAPPING_FIXTURE_SCHEMA_VERSION = 'preference-interference-mapping-fixture@1';
export const PREFERENCE_INTERFERENCE_MAPPING_BUILD_SCHEMA_VERSION = 'preference-interference-mapping-build@1';

const WORLD_IDS = [
  'complete-predeclared-exposure-map-stable-unexposed-current',
  'cross-cluster-diffusion-breaks-partial-interference',
  'direct-peer-spillover-to-nominal-controls',
  'incomplete-network-census-hidden-exposure',
  'market-and-institutional-saturation-general-equilibrium',
  'multiple-treatment-versions-and-doses-collapsed',
  'post-assignment-network-rewiring',
  'shared-institutional-channel-contamination'
];

const FLAG_KEYS = [
  'complete_interference_assurance',
  'peer_spillover_present',
  'institutional_channel_contamination_present',
  'cross_cluster_interference_present',
  'network_undercoverage_present',
  'treatment_version_interference_present',
  'endogenous_network_rewiring_present',
  'general_equilibrium_saturation_present',
  'assignment_complete',
  'network_census_complete',
  'channel_map_complete',
  'control_unexposed_complete',
  'stable_treatment_complete',
  'stable_network_complete',
  'partial_interference_supported',
  'exposure_mapping_complete',
  'spillover_estimand_identified',
  'current_interference_lineage_complete'
];

const EXPECTED_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_interference_governance_signatures: 8,
  complete_interference_assurance_worlds: 1,
  peer_spillover_worlds: 1,
  institutional_channel_contamination_worlds: 1,
  cross_cluster_interference_worlds: 1,
  network_undercoverage_worlds: 1,
  treatment_version_interference_worlds: 1,
  endogenous_network_rewiring_worlds: 1,
  general_equilibrium_saturation_worlds: 1,
  assignment_complete_worlds: 8,
  network_census_complete_worlds: 6,
  channel_map_complete_worlds: 7,
  control_unexposed_complete_worlds: 2,
  stable_treatment_complete_worlds: 7,
  stable_network_complete_worlds: 6,
  partial_interference_supported_worlds: 3,
  exposure_mapping_complete_worlds: 1,
  spillover_estimand_identified_worlds: 1,
  current_interference_lineage_complete_worlds: 5,
  same_public_interference_surface_worlds: 8,
  total_true_exposed_control_count: 205,
  total_false_negative_exposure_count: 205,
  total_peer_spillover_count: 30,
  total_institutional_exposure_count: 40,
  total_cross_cluster_exposure_count: 25,
  total_hidden_network_exposure_count: 40,
  total_rewiring_exposure_count: 20,
  total_ambient_saturation_exposure_count: 100,
  total_missing_edge_count: 400,
  total_cross_cluster_edge_count: 50,
  total_shared_channel_exposure_count: 140,
  total_multiple_version_unit_count: 30,
  total_rewired_edge_count: 100,
  total_unsupported_interference_decisions: 700,
  binding_public_authority_worlds: 0
};

const FALSE_CLASSIFICATIONS = [
  'cluster_randomization_identifies_absence_of_interference',
  'nominal_control_identifies_unexposed_control',
  'complete_node_coverage_identifies_complete_edge_channel_exposure_coverage',
  'person_network_identifies_complete_institutional_market_exposure',
  'predeclared_mapping_identifies_correct_exposure_when_channels_omitted',
  'zero_observed_cross_cluster_edges_identifies_partial_interference',
  'stable_assignment_identifies_stable_network',
  'single_treatment_label_identifies_stable_version_or_dose',
  'network_adjusted_estimator_identifies_valid_exposure_model',
  'cluster_robust_uncertainty_identifies_spillover_correction',
  'zero_reported_spillover_identifies_zero_true_spillover',
  'current_network_snapshot_identifies_pre_treatment_network',
  'saturation_equilibrium_identifies_unit_level_untreated_counterfactual',
  'public_interference_adjusted_status_identifies_complete_current_exposure_aware_correctable_authorized_evidence',
  'interference_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent',
  'binding_public_authority_supported'
];

const REQUIRED_RULES = [
  'cluster_randomization_is_not_absence_of_interference',
  'nominal_control_assignment_is_not_unexposed_control',
  'complete_node_coverage_is_not_complete_edge_channel_or_exposure_coverage',
  'person_level_network_map_is_not_complete_institutional_or_market_exposure_map',
  'predeclared_exposure_mapping_is_not_correct_mapping_when_decisive_channels_are_omitted',
  'zero_observed_cross_cluster_edges_is_not_partial_interference_when_shared_channels_cross_clusters',
  'stable_assignment_is_not_stable_post_assignment_network',
  'one_treatment_label_is_not_one_stable_treatment_version_or_dose',
  'network_adjusted_estimator_is_not_valid_exposure_model',
  'cluster_robust_uncertainty_is_not_correction_for_spillover_or_exposure_misclassification',
  'zero_reported_spillover_is_not_zero_true_spillover',
  'current_network_snapshot_is_not_pre_treatment_network',
  'saturation_or_general_equilibrium_is_not_unit_level_untreated_counterfactual',
  'public_interference_adjusted_status_is_not_complete_current_exposure_aware_correctable_authorized_evidence',
  'interference_or_exposure_mapping_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_or_intent',
  'interference_adjusted_claim_requires_assignment_network_channel_exposure_interference_treatment_version_topology_saturation_estimation_succession_correction_durability_and_authority_custody'
];

const BASELINE = {
  operative_release_id: 'RELEASE-INCIDENT-V1',
  operative_release_version: 1,
  eligible_units: 100,
  assigned_units: 100,
  cluster_count: 10,
  nominal_treatment_units: 50,
  nominal_control_units: 50,
  public_interference_status: 'interference_adjusted',
  reported_direct_effect: 0.2,
  reported_spillover_effect: 0,
  published_exposed_control_count: 0,
  published_network_coverage: 1,
  approved_score_use: 'consequential_release_choice',
  reference_treatment_version: 'TREATMENT-V1',
  reference_network_version: 'NETWORK-V1',
  reference_exposure_map_version: 'EXPOSURE-MAP-V1',
  binding_public_authority: false
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
    'operative_release_id','operative_release_version','eligible_units','assigned_units','cluster_count',
    'nominal_treatment_units','nominal_control_units','public_interference_status','reported_direct_effect',
    'reported_spillover_effect','published_exposed_control_count','published_network_coverage','approved_score_use'
  ].map(key => [key, baseline[key]]));
}

function validateExpandedWorld(world, baseline, errors) {
  const id = text(world.world_id) || '(missing world ID)';
  const p = object(world.population);
  const a = object(world.assignment);
  const t = object(world.treatment);
  const n = object(world.network);
  const c = object(world.channel_map);
  const e = object(world.exposure);
  const i = object(world.interference);
  const z = object(world.analysis);
  const l = object(world.lineage);
  const g = object(world.governance);
  const f = object(world.expected_flags);

  if (!text(world.mechanism)) errors.push(`world ${id} mechanism is required`);
  if (JSON.stringify(canonical(world.public_claim)) !== JSON.stringify(canonical(expectedPublicClaim(baseline)))) {
    errors.push(`world ${id} must preserve the frozen interference-publication surface`);
  }

  for (const key of ['eligible_count','assigned_count','clustered_count','nominal_treatment_count','nominal_control_count','directly_exposed_count','indirectly_exposed_control_count','truly_unexposed_control_count','observed_count','decided_count','affected_count']) {
    if (!Number.isInteger(p[key]) || p[key] < 0 || p[key] > baseline.eligible_units) errors.push(`world ${id} population.${key} is invalid`);
  }
  if (p.eligible_count !== 100 || p.assigned_count !== 100 || p.clustered_count !== 100 || p.nominal_treatment_count !== 50 || p.nominal_control_count !== 50 || p.observed_count !== 100 || p.decided_count !== 100 || p.affected_count !== 100) {
    errors.push(`world ${id} must preserve all frozen population denominators`);
  }
  if (p.indirectly_exposed_control_count + p.truly_unexposed_control_count !== 50) errors.push(`world ${id} exposed and unexposed controls must reconcile`);

  if (a.cluster_count !== 10 || a.treated_cluster_count !== 5 || a.control_cluster_count !== 5) errors.push(`world ${id} cluster counts must remain ten, five, and five`);
  for (const key of ['randomized','predeclared','concealed']) if (typeof a[key] !== 'boolean') errors.push(`world ${id} assignment.${key} must be boolean`);

  for (const key of ['version_count','multiple_version_unit_count','spillover_dose_count']) if (!Number.isInteger(t[key]) || t[key] < 0 || t[key] > 100) errors.push(`world ${id} treatment.${key} is invalid`);
  if (t.version_count < 1 || !text(t.approved_version) || !text(t.executed_version)) errors.push(`world ${id} treatment identity and versions are incomplete`);

  for (const key of ['true_node_count','observed_node_count','true_edge_count','observed_edge_count','missing_edge_count','cross_cluster_edge_count','rewired_edge_count','census_time']) {
    if (!Number.isInteger(n[key]) || n[key] < 0) errors.push(`world ${id} network.${key} is invalid`);
  }
  if (n.true_node_count !== 100 || n.observed_node_count !== 100) errors.push(`world ${id} node denominator must remain one hundred`);
  if (n.observed_edge_count + n.missing_edge_count !== n.true_edge_count) errors.push(`world ${id} observed and missing edges must reconcile`);
  if (!Number.isFinite(Number(n.coverage_rate)) || n.coverage_rate < 0 || n.coverage_rate > 1) errors.push(`world ${id} network coverage is invalid`);
  if (typeof n.network_stable !== 'boolean') errors.push(`world ${id} network stability must be boolean`);

  if (typeof c.mapped !== 'boolean' || !text(c.map_state)) errors.push(`world ${id} channel map is incomplete`);
  for (const key of ['operator_count','facility_count','policy_count','workflow_count','media_count','market_count','shared_channel_exposure_count','cross_cluster_channel_count']) {
    if (!Number.isInteger(c[key]) || c[key] < 0 || c[key] > 100) errors.push(`world ${id} channel_map.${key} is invalid`);
  }

  for (const key of ['predeclared','current','treatment_versions_distinguished','dose_distinguished']) if (typeof e[key] !== 'boolean') errors.push(`world ${id} exposure.${key} must be boolean`);
  for (const key of ['classified_exposed_control_count','true_exposed_control_count','false_negative_count','false_positive_count','peer_spillover_count','institutional_exposure_count','cross_cluster_exposure_count','hidden_network_exposure_count','rewiring_exposure_count']) {
    if (!Number.isInteger(e[key]) || e[key] < 0 || e[key] > 50) errors.push(`world ${id} exposure.${key} is invalid`);
  }
  if (!Number.isInteger(e.ambient_saturation_exposure_count) || e.ambient_saturation_exposure_count < 0 || e.ambient_saturation_exposure_count > 100) errors.push(`world ${id} ambient saturation exposure is invalid`);
  if (e.true_exposed_control_count !== p.indirectly_exposed_control_count) errors.push(`world ${id} true exposure must match exposed controls`);
  if (e.classified_exposed_control_count - e.false_positive_count + e.false_negative_count !== e.true_exposed_control_count) errors.push(`world ${id} exposure classification counts must reconcile`);

  for (const key of ['partial_interference_assumption','stable_unit_assumption','stable_treatment_assumption','no_general_equilibrium_assumption']) if (typeof i[key] !== 'boolean') errors.push(`world ${id} interference.${key} must be boolean`);

  for (const key of ['reported_direct_effect','reported_spillover_effect','independent_direct_effect','independent_spillover_effect']) if (!Number.isFinite(Number(z[key])) || z[key] < -1 || z[key] > 1) errors.push(`world ${id} analysis.${key} is invalid`);
  if (!close(z.reported_direct_effect, 0.2) || !close(z.reported_spillover_effect, 0)) errors.push(`world ${id} must preserve the reported effect surface`);
  if (!Number.isInteger(z.unsupported_decision_count) || z.unsupported_decision_count < 0 || z.unsupported_decision_count > 100) errors.push(`world ${id} unsupported decisions are invalid`);
  for (const key of ['exposure_adjusted','cluster_robust','network_robust','misclassification_corrected']) if (typeof z[key] !== 'boolean') errors.push(`world ${id} analysis.${key} must be boolean`);

  for (const key of ['approved_treatment_version','executed_treatment_version','approved_network_version','executed_network_version','approved_channel_map_version','executed_channel_map_version','approved_exposure_map_version','executed_exposure_map_version','revalidation_state']) {
    if (!text(l[key])) errors.push(`world ${id} lineage.${key} is required`);
  }
  if (l.succession_receipt !== null && !text(l.succession_receipt)) errors.push(`world ${id} succession receipt is invalid`);
  falseRequired(g.binding_public_authority, `world ${id} binding public authority`, errors);

  if (!sameMembers(Object.keys(f), FLAG_KEYS)) errors.push(`world ${id} expected flags are incomplete`);
  for (const key of FLAG_KEYS) if (typeof f[key] !== 'boolean') errors.push(`world ${id} expected_flags.${key} must be boolean`);
}

function deriveFlags(world) {
  const p = world.population;
  const a = world.assignment;
  const t = world.treatment;
  const n = world.network;
  const c = world.channel_map;
  const e = world.exposure;
  const i = world.interference;
  const z = world.analysis;
  const l = world.lineage;
  const g = world.governance;

  const peer = e.peer_spillover_count > 0;
  const institutional = e.institutional_exposure_count > 0 || c.mapped === false;
  const cross = e.cross_cluster_exposure_count > 0;
  const undercoverage = n.missing_edge_count > 0 || Number(n.coverage_rate) < 1 || e.hidden_network_exposure_count > 0;
  const version = t.version_count > 1 || !e.treatment_versions_distinguished || !e.dose_distinguished || !i.stable_treatment_assumption;
  const rewiring = n.rewired_edge_count > 0 || !n.network_stable || n.census_state === 'post_treatment_endogenous';
  const saturation = e.ambient_saturation_exposure_count > 0 || !i.no_general_equilibrium_assumption;
  const assignmentComplete = a.cluster_count === 10 && a.treated_cluster_count === 5 && a.control_cluster_count === 5 && a.randomized && a.predeclared && a.concealed && p.assigned_count === 100;
  const networkComplete = n.true_node_count === 100 && n.observed_node_count === 100 && n.missing_edge_count === 0 && n.observed_edge_count === n.true_edge_count && close(n.coverage_rate, 1) && n.census_state === 'pre_treatment_complete';
  const channelComplete = c.mapped && ['complete','ambient_channels_recorded_but_not_used_in_exposure_classification'].includes(c.map_state);
  const controlUnexposed = e.true_exposed_control_count === 0 && p.truly_unexposed_control_count === 50;
  const stableTreatment = t.version_count === 1 && e.treatment_versions_distinguished && e.dose_distinguished && i.stable_treatment_assumption;
  const stableNetwork = n.network_stable && n.census_state === 'pre_treatment_complete';
  const partial = i.partial_interference_assumption && n.cross_cluster_edge_count === 0 && c.cross_cluster_channel_count === 0 && i.no_general_equilibrium_assumption && stableNetwork && !undercoverage;
  const mapping = e.predeclared && e.current && e.classified_exposed_control_count === e.true_exposed_control_count && e.false_negative_count === 0 && e.false_positive_count === 0 && networkComplete && c.mapped && c.map_state === 'complete' && e.treatment_versions_distinguished && e.dose_distinguished;
  const estimand = z.exposure_adjusted && z.network_robust && z.misclassification_corrected && z.sensitivity_state === 'independent_complete' && z.falsification_state === 'negative_controls_complete' && mapping;
  const lineage = l.approved_treatment_version === l.executed_treatment_version && l.approved_network_version === l.executed_network_version && l.approved_channel_map_version === l.executed_channel_map_version && l.approved_exposure_map_version === l.executed_exposure_map_version && l.revalidation_state === 'current' && Boolean(text(l.succession_receipt));
  const complete = assignmentComplete && networkComplete && c.mapped && c.map_state === 'complete' && controlUnexposed && stableTreatment && stableNetwork && partial && mapping && estimand && lineage && g.audit_state === 'independent_complete' && g.correction_state === 'reestimate_revoke_and_reissue_operational';

  return {
    complete_interference_assurance: complete,
    peer_spillover_present: peer,
    institutional_channel_contamination_present: institutional,
    cross_cluster_interference_present: cross,
    network_undercoverage_present: undercoverage,
    treatment_version_interference_present: version,
    endogenous_network_rewiring_present: rewiring,
    general_equilibrium_saturation_present: saturation,
    assignment_complete: assignmentComplete,
    network_census_complete: networkComplete,
    channel_map_complete: channelComplete,
    control_unexposed_complete: controlUnexposed,
    stable_treatment_complete: stableTreatment,
    stable_network_complete: stableNetwork,
    partial_interference_supported: partial,
    exposure_mapping_complete: mapping,
    spillover_estimand_identified: estimand,
    current_interference_lineage_complete: lineage
  };
}

export function validatePreferenceInterferenceMappingFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_INTERFERENCE_MAPPING_FIXTURE_SCHEMA_VERSION) errors.push('interference-mapping fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-interference-adjusted-status-different-exposure-governance-v1') errors.push('interference-mapping fixture identity mismatch');
  if (fixture?.issue !== 752 || fixture?.parent_program_issue !== 594) errors.push('interference-mapping issue lineage mismatch');
  if (fixture?.status !== 'synthetic_control' || fixture?.graph_effect !== 'none') errors.push('interference-mapping fixture status or graph effect mismatch');
  falseRequired(fixture?.counts_toward_thesis_evidence, 'fixture counts_toward_thesis_evidence', errors);
  if (JSON.stringify(canonical(fixture?.baseline)) !== JSON.stringify(canonical(BASELINE))) errors.push('interference-mapping baseline contract mismatch');
  if (!object(fixture?.world_defaults).public_claim) errors.push('interference-mapping world defaults are incomplete');

  const records = array(fixture?.worlds);
  if (!sameMembers(records.map(record => record?.world_id), WORLD_IDS)) errors.push('fixture must contain exactly the eight required interference-mapping worlds');
  if (unique(records.map(record => record?.world_id)).length !== records.length) errors.push('interference-mapping world IDs must be unique');
  for (const record of records) {
    if (!text(record?.world_id) || !text(record?.mechanism) || typeof record?.overrides !== 'object' || !record?.expected_flags) errors.push('interference-mapping world record is incomplete');
    validateExpandedWorld(expandWorld(fixture, record), fixture.baseline, errors);
  }

  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (!close(fixture?.expected_metrics?.[key], value)) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const key of FALSE_CLASSIFICATIONS) if (fixture?.expected_classification?.[key] !== false) errors.push(`expected_classification.${key} must remain false`);
  for (const key of ['manipulative_intent_inferable','real_world_effect_claimed']) if (fixture?.expected_classification?.[key] !== false) errors.push(`expected_classification.${key} must remain false`);
  if (fixture?.expected_classification?.complete_interference_assurance_supported_in_at_least_one_world !== true) errors.push('expected classification must preserve one complete assurance path');
  for (const rule of REQUIRED_RULES) if (!unique(fixture?.required_refusal_rules).includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 14) errors.push('interference-mapping prohibited-inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interference-mapping interpretation contract is incomplete');
  return errors;
}

function seal(event, previous) {
  const unsigned = { ...event, previous_event_sha256: previous };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildChain(result) {
  const events = [];
  let previous = null;
  const push = event => { const sealed = seal(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  push({event_id:`${result.world_id}:public`,event_type:'interference_publication_surface_frozen',source_event_ids:[],payload:result.public_claim});
  push({event_id:`${result.world_id}:assignment`,event_type:'assignment_population_and_cluster_state',source_event_ids:[`${result.world_id}:public`],payload:{population:result.population,assignment:result.assignment}});
  push({event_id:`${result.world_id}:topology`,event_type:'treatment_network_and_channel_topology_state',source_event_ids:[`${result.world_id}:assignment`],payload:{treatment:result.treatment,network:result.network,channel_map:result.channel_map}});
  push({event_id:`${result.world_id}:exposure`,event_type:'true_classified_and_misclassified_exposure_state',source_event_ids:[`${result.world_id}:topology`],payload:result.exposure});
  push({event_id:`${result.world_id}:analysis`,event_type:'interference_estimand_estimation_and_equilibrium_state',source_event_ids:[`${result.world_id}:exposure`],payload:{interference:result.interference,analysis:result.analysis}});
  push({event_id:`${result.world_id}:lineage`,event_type:'interference_lineage_correction_and_authority_state',source_event_ids:[`${result.world_id}:analysis`],payload:{lineage:result.lineage,governance:result.governance}});
  push({event_id:`${result.world_id}:classification`,event_type:'interference_mechanism_classified',source_event_ids:[`${result.world_id}:lineage`],payload:{mechanism:result.mechanism,flags:result.flags}});
  push({event_id:`${result.world_id}:interpretation`,event_type:'interpretation_sealed',source_event_ids:[`${result.world_id}:classification`],payload:{allowed:'synthetic interference and exposure-governance state beneath one public surface',refused:['assignment_as_no_interference','control_label_as_no_exposure','complete_nodes_as_complete_exposure','network_adjustment_as_valid_mapping','zero_spillover_as_zero_true_spillover','saturation_as_unit_level_counterfactual','public_status_as_authority']}});
  return events;
}

export function validatePreferenceInterferenceMappingChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('interference-mapping event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate interference-mapping event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`interference-mapping event ${event?.event_id} previous hash mismatch`);
    for (const source of array(event?.source_event_ids)) if (!seen.has(source)) errors.push(`interference-mapping event ${event?.event_id} references unseen source ${source}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`interference-mapping event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceInterferenceMappingFixture(fixture) {
  const errors = validatePreferenceInterferenceMappingFixture(fixture);
  if (errors.length) throw new Error(`invalid preference interference-mapping fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(record => {
    const world = expandWorld(fixture, record);
    const flags = deriveFlags(world);
    for (const key of FLAG_KEYS) if (flags[key] !== world.expected_flags[key]) throw new Error(`world ${world.world_id} flag ${key} mismatch`);
    const result = { ...world, flags };
    delete result.expected_flags;
    result.public_status_signature_sha256 = sha256(result.public_claim);
    result.interference_governance_signature_sha256 = sha256({population:result.population,assignment:result.assignment,treatment:result.treatment,network:result.network,channel_map:result.channel_map,exposure:result.exposure,interference:result.interference,analysis:result.analysis,lineage:result.lineage,governance:result.governance,flags});
    result.custody_chain = buildChain(result);
    result.custody_chain_head_sha256 = result.custody_chain.at(-1).event_sha256;
    return result;
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));

  const count = flag => worlds.filter(world => world.flags[flag]).length;
  const sum = (section, key) => worlds.reduce((total, world) => total + Number(world[section][key]), 0);
  const metrics = {
    world_count: worlds.length,
    distinct_public_status_signatures: unique(worlds.map(world => world.public_status_signature_sha256)).length,
    distinct_interference_governance_signatures: unique(worlds.map(world => world.interference_governance_signature_sha256)).length,
    complete_interference_assurance_worlds: count('complete_interference_assurance'),
    peer_spillover_worlds: count('peer_spillover_present'),
    institutional_channel_contamination_worlds: count('institutional_channel_contamination_present'),
    cross_cluster_interference_worlds: count('cross_cluster_interference_present'),
    network_undercoverage_worlds: count('network_undercoverage_present'),
    treatment_version_interference_worlds: count('treatment_version_interference_present'),
    endogenous_network_rewiring_worlds: count('endogenous_network_rewiring_present'),
    general_equilibrium_saturation_worlds: count('general_equilibrium_saturation_present'),
    assignment_complete_worlds: count('assignment_complete'),
    network_census_complete_worlds: count('network_census_complete'),
    channel_map_complete_worlds: count('channel_map_complete'),
    control_unexposed_complete_worlds: count('control_unexposed_complete'),
    stable_treatment_complete_worlds: count('stable_treatment_complete'),
    stable_network_complete_worlds: count('stable_network_complete'),
    partial_interference_supported_worlds: count('partial_interference_supported'),
    exposure_mapping_complete_worlds: count('exposure_mapping_complete'),
    spillover_estimand_identified_worlds: count('spillover_estimand_identified'),
    current_interference_lineage_complete_worlds: count('current_interference_lineage_complete'),
    same_public_interference_surface_worlds: worlds.filter(world => world.public_status_signature_sha256 === worlds[0].public_status_signature_sha256).length,
    total_true_exposed_control_count: sum('exposure','true_exposed_control_count'),
    total_false_negative_exposure_count: sum('exposure','false_negative_count'),
    total_peer_spillover_count: sum('exposure','peer_spillover_count'),
    total_institutional_exposure_count: sum('exposure','institutional_exposure_count'),
    total_cross_cluster_exposure_count: sum('exposure','cross_cluster_exposure_count'),
    total_hidden_network_exposure_count: sum('exposure','hidden_network_exposure_count'),
    total_rewiring_exposure_count: sum('exposure','rewiring_exposure_count'),
    total_ambient_saturation_exposure_count: sum('exposure','ambient_saturation_exposure_count'),
    total_missing_edge_count: sum('network','missing_edge_count'),
    total_cross_cluster_edge_count: sum('network','cross_cluster_edge_count'),
    total_shared_channel_exposure_count: sum('channel_map','shared_channel_exposure_count'),
    total_multiple_version_unit_count: sum('treatment','multiple_version_unit_count'),
    total_rewired_edge_count: sum('network','rewired_edge_count'),
    total_unsupported_interference_decisions: sum('analysis','unsupported_decision_count'),
    binding_public_authority_worlds: 0
  };
  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (!close(metrics[key], value)) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);

  return {
    schema_version: PREFERENCE_INTERFERENCE_MAPPING_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'interference_network_channel_exposure_mapping_and_equilibrium_assurance_qualified',
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

export function validatePreferenceInterferenceMappingBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_INTERFERENCE_MAPPING_BUILD_SCHEMA_VERSION || compiled?.fixture_id !== 'same-interference-adjusted-status-different-exposure-governance-v1') errors.push('compiled interference-mapping identity or schema mismatch');
  if (compiled?.issue !== 752 || compiled?.status !== 'interference_network_channel_exposure_mapping_and_equilibrium_assurance_qualified') errors.push('compiled interference-mapping issue or status mismatch');
  if (compiled?.graph_effect !== 'none' || compiled?.real_world_evidence_state !== 'none') errors.push('compiled interference-mapping evidence boundary mismatch');
  falseRequired(compiled?.counts_toward_thesis_evidence, 'compiled counts_toward_thesis_evidence', errors);
  falseRequired(compiled?.conclusion_generated, 'compiled conclusion_generated', errors);
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), WORLD_IDS)) errors.push('compiled interference-mapping worlds are incomplete');
  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (!close(compiled?.metrics?.[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const key of FALSE_CLASSIFICATIONS) if (compiled?.classification?.[key] !== false) errors.push(`compiled classification.${key} must remain false`);
  for (const key of ['manipulative_intent_inferable','real_world_effect_claimed','preference_change_present']) falseRequired(compiled?.classification?.[key], `compiled ${key}`, errors);
  if (compiled?.classification?.complete_interference_assurance_supported_in_at_least_one_world !== true) errors.push('compiled build must preserve one complete interference-assurance path');

  for (const world of array(compiled?.worlds)) {
    if (!sameMembers(Object.keys(world.flags), FLAG_KEYS)) errors.push(`compiled world ${world.world_id} flags are incomplete`);
    if (!/^[0-9a-f]{64}$/.test(text(world.public_status_signature_sha256)) || !/^[0-9a-f]{64}$/.test(text(world.interference_governance_signature_sha256))) errors.push(`compiled world ${world.world_id} signature is invalid`);
    errors.push(...validatePreferenceInterferenceMappingChain(world.custody_chain));
    if (world.custody_chain.at(-1)?.event_sha256 !== world.custody_chain_head_sha256) errors.push(`compiled world ${world.world_id} custody head mismatch`);
  }
  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  if (byId['complete-predeclared-exposure-map-stable-unexposed-current']?.flags.complete_interference_assurance !== true) errors.push('positive world must preserve complete interference assurance');
  if (byId['direct-peer-spillover-to-nominal-controls']?.flags.peer_spillover_present !== true) errors.push('peer-spillover control is missing');
  if (byId['shared-institutional-channel-contamination']?.flags.institutional_channel_contamination_present !== true) errors.push('institutional-channel control is missing');
  if (byId['cross-cluster-diffusion-breaks-partial-interference']?.flags.cross_cluster_interference_present !== true) errors.push('cross-cluster control is missing');
  if (byId['incomplete-network-census-hidden-exposure']?.flags.network_undercoverage_present !== true) errors.push('network-undercoverage control is missing');
  if (byId['multiple-treatment-versions-and-doses-collapsed']?.flags.treatment_version_interference_present !== true) errors.push('treatment-version control is missing');
  if (byId['post-assignment-network-rewiring']?.flags.endogenous_network_rewiring_present !== true) errors.push('network-rewiring control is missing');
  if (byId['market-and-institutional-saturation-general-equilibrium']?.flags.general_equilibrium_saturation_present !== true) errors.push('general-equilibrium control is missing');
  if (unique(compiled?.refusal_rules).length < 16 || !text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled interference-mapping interpretation boundary is incomplete');
  return errors;
}

export function renderPreferenceInterferenceMappingMarkdown(compiled) {
  const lines = [
    '# Interference, network spillover, and exposure-mapping custody','',
    `**Status:** ${compiled.status}`,'',
    `**Worlds:** ${compiled.metrics.world_count}`,'',
    `**Public interference status:** ${compiled.baseline.public_interference_status}`,'',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,'',
    '## Candidate worlds',''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`,'',`- Mechanism: ${world.mechanism}`,`- True exposed controls: ${world.exposure.true_exposed_control_count}`,`- Classified exposed controls: ${world.exposure.classified_exposed_control_count}`,`- False-negative exposures: ${world.exposure.false_negative_count}`,`- Missing edges: ${world.network.missing_edge_count}`,`- Cross-cluster edges: ${world.network.cross_cluster_edge_count}`,`- Shared-channel exposure: ${world.channel_map.shared_channel_exposure_count}`,`- Treatment versions: ${world.treatment.version_count}`,`- Rewired edges: ${world.network.rewired_edge_count}`,`- Ambient saturation exposure: ${world.exposure.ambient_saturation_exposure_count}`,`- Complete assurance: ${world.flags.complete_interference_assurance}`,`- Custody head: ${world.custody_chain_head_sha256}`,'');
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
