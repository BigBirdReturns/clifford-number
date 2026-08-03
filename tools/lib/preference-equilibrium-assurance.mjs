import { createHash } from 'node:crypto';

export const PREFERENCE_EQUILIBRIUM_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-equilibrium-assurance-fixture@1';
export const PREFERENCE_EQUILIBRIUM_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-equilibrium-assurance-build@1';

const WORLD_IDS = [
  'complete-market-counterfactual-capacity-price-substitution-welfare-replication-current-lineage',
  'universal-saturation-without-system-counterfactual',
  'capacity-queues-rationing-denial-and-quality-deterioration',
  'price-availability-affordability-and-demand-feedback',
  'strategic-anticipation-gaming-compliance-and-provider-response',
  'substitution-displacement-crowd-out-rebound-and-harm-transfer',
  'multiple-equilibria-path-dependent-favorable-selection-and-unpublished-welfare-weights',
  'pilot-partial-equilibrium-extrapolated-after-scale-and-system-succession'
];

const FLAG_KEYS = [
  'complete_equilibrium_assurance',
  'universal_saturation_no_counterfactual_present',
  'capacity_queue_rationing_quality_present',
  'price_availability_feedback_present',
  'strategic_anticipation_gaming_provider_response_present',
  'substitution_displacement_harm_transfer_present',
  'multiple_equilibria_path_selection_present',
  'stale_scale_succession_present',
  'market_counterfactual_complete',
  'capacity_access_complete',
  'price_availability_complete',
  'strategic_response_complete',
  'substitution_harm_complete',
  'equilibrium_selection_complete',
  'welfare_incidence_complete',
  'independent_replication_complete',
  'current_scale_lineage_complete',
  'monitoring_correction_complete'
];

const EXPECTED_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_equilibrium_governance_signatures: 8,
  complete_equilibrium_assurance_worlds: 1,
  universal_saturation_no_counterfactual_worlds: 1,
  capacity_queue_rationing_quality_worlds: 1,
  price_availability_feedback_worlds: 1,
  strategic_anticipation_gaming_provider_response_worlds: 1,
  substitution_displacement_harm_transfer_worlds: 1,
  multiple_equilibria_path_selection_worlds: 1,
  stale_scale_succession_worlds: 1,
  market_counterfactual_complete_worlds: 7,
  capacity_access_complete_worlds: 7,
  price_availability_complete_worlds: 7,
  strategic_response_complete_worlds: 7,
  substitution_harm_complete_worlds: 7,
  equilibrium_selection_complete_worlds: 7,
  welfare_incidence_complete_worlds: 7,
  independent_replication_complete_worlds: 7,
  current_scale_lineage_complete_worlds: 7,
  monitoring_correction_complete_worlds: 8,
  total_saturated_unit_count: 100,
  total_capacity_constrained_unit_count: 60,
  total_queued_unit_count: 40,
  total_rationed_unit_count: 30,
  total_denied_unit_count: 20,
  total_quality_deteriorated_unit_count: 30,
  total_price_exposed_unit_count: 60,
  total_affordability_shifted_unit_count: 40,
  total_demand_shifted_unit_count: 40,
  total_uptake_shifted_unit_count: 30,
  total_anticipating_unit_count: 50,
  total_gaming_unit_count: 30,
  total_compliance_adapted_unit_count: 30,
  total_provider_response_unit_count: 40,
  total_substituted_unit_count: 50,
  total_displaced_unit_count: 40,
  total_crowd_out_unit_count: 30,
  total_rebound_unit_count: 20,
  total_harm_shifted_unit_count: 40,
  total_cross_market_exposure_count: 100,
  total_intertemporal_exposure_count: 40,
  total_path_dependent_unit_count: 60,
  total_stale_scale_decision_count: 100,
  total_unsupported_equilibrium_decisions: 700,
  binding_public_authority_worlds: 0
};

const FALSE_CLASSIFICATIONS = [
  'universal_rollout_identifies_untreated_system_counterfactual',
  'observed_untreated_units_identify_untreated_markets_under_saturation',
  'zero_published_capacity_change_identifies_unconstrained_capacity',
  'completed_service_identifies_eligible_or_attempted_service_denominator',
  'zero_published_price_change_identifies_zero_affordability_or_availability_feedback',
  'stable_uptake_identifies_absence_of_demand_adaptation',
  'pre_policy_behavior_identifies_unanticipated_behavior_after_announcement',
  'compliance_identifies_absence_of_gaming_or_provider_response',
  'within_market_gain_identifies_system_welfare_without_substitution_or_harm_transfer',
  'one_solved_equilibrium_identifies_unique_policy_relevant_equilibrium',
  'favorable_initialization_identifies_equilibrium_identification',
  'aggregate_welfare_gain_identifies_explicit_weights_incidence_and_no_harmed_groups',
  'replication_count_identifies_independent_equivalent_replication',
  'pilot_partial_equilibrium_identifies_current_systemwide_assurance_after_scale_succession',
  'public_equilibrium_adjusted_status_identifies_complete_current_counterfactual_capacity_price_response_substitution_welfare_replication_authorized_evidence',
  'equilibrium_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'binding_public_authority_supported',
  'manipulative_intent_inferable',
  'real_world_effect_claimed'
];

const REQUIRED_RULES = [
  'universal_rollout_is_not_an_untreated_system_counterfactual',
  'observed_untreated_units_are_not_untreated_markets_under_saturation',
  'zero_published_capacity_change_is_not_unconstrained_capacity',
  'completed_service_is_not_the_eligible_or_attempted_service_denominator',
  'zero_published_price_change_is_not_zero_affordability_or_availability_feedback',
  'stable_uptake_is_not_absence_of_demand_adaptation',
  'pre_policy_behavior_is_not_unanticipated_behavior_after_announcement',
  'compliance_is_not_absence_of_gaming_or_provider_response',
  'within_market_gain_is_not_system_welfare_after_substitution_displacement_rebound_or_harm_transfer',
  'one_solved_equilibrium_is_not_the_unique_or_policy_relevant_equilibrium',
  'favorable_initialization_is_not_equilibrium_identification',
  'aggregate_welfare_gain_is_not_explicit_welfare_weights_incidence_or_absence_of_harmed_groups',
  'replication_count_is_not_independent_replication_of_the_same_equilibrium_design_and_estimand',
  'pilot_partial_equilibrium_evidence_is_not_current_systemwide_assurance_after_scale_succession',
  'public_equilibrium_adjusted_status_is_not_complete_current_counterfactual_valid_capacity_aware_price_aware_response_aware_substitution_aware_welfare_explicit_replicated_correctable_authorized_evidence',
  'equilibrium_or_welfare_assurance_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'equilibrium_adjusted_claim_requires_market_counterfactual_saturation_capacity_access_price_availability_response_substitution_equilibrium_welfare_replication_scale_succession_correction_durability_and_authority_custody',
  'binding_public_authority_requires_separate_current_public_authorization_receipts'
];

const BASELINE = {
  operative_release_id: 'RELEASE-INCIDENT-V1',
  operative_release_version: 1,
  observed_markets: 10,
  observed_units: 100,
  public_equilibrium_status: 'equilibrium_adjusted',
  reported_direct_effect: 0.20,
  reported_equilibrium_effect: 0.18,
  reported_welfare_gain: 0.15,
  published_price_change: 0.00,
  published_capacity_change: 0.00,
  published_replications: 2,
  approved_use: 'systemwide_release_policy',
  reference_market_map_version: 'MARKET-MAP-V1',
  reference_policy_version: 'POLICY-V1',
  reference_equilibrium_model_version: 'EQUILIBRIUM-MODEL-V1',
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

function requireInteger(record, key, min, max, label, errors) {
  const value = record[key];
  if (!Number.isInteger(value) || value < min || value > max) errors.push(`${label}.${key} is invalid`);
}

function requireNumber(record, key, min, max, label, errors) {
  const value = Number(record[key]);
  if (!Number.isFinite(value) || value < min || value > max) errors.push(`${label}.${key} is invalid`);
}

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
    'operative_release_id','operative_release_version','observed_markets','observed_units',
    'public_equilibrium_status','reported_direct_effect','reported_equilibrium_effect',
    'reported_welfare_gain','published_price_change','published_capacity_change',
    'published_replications','approved_use'
  ].map(key => [key, baseline[key]]));
}

function validateExpandedWorld(world, baseline, errors) {
  const id = text(world.world_id) || '(missing world ID)';
  const m = object(world.market);
  const c = object(world.capacity);
  const p = object(world.price);
  const s = object(world.strategic_response);
  const u = object(world.substitution);
  const e = object(world.equilibrium);
  const w = object(world.welfare);
  const r = object(world.replication);
  const l = object(world.lineage);
  const a = object(world.analysis);
  const g = object(world.governance);
  const f = object(world.expected_flags);

  if (!text(world.mechanism)) errors.push(`world ${id} mechanism is required`);
  if (JSON.stringify(canonical(world.public_claim)) !== JSON.stringify(canonical(expectedPublicClaim(baseline)))) {
    errors.push(`world ${id} must preserve the frozen equilibrium-publication surface`);
  }

  for (const key of ['observed_market_count','treated_market_count','untreated_market_count']) requireInteger(m, key, 0, 10, `world ${id} market`, errors);
  for (const key of ['observed_unit_count','treated_unit_count','untreated_unit_count','saturated_unit_count','cross_market_exposure_count']) requireInteger(m, key, 0, 100, `world ${id} market`, errors);
  if (m.observed_market_count !== 10 || m.treated_market_count + m.untreated_market_count !== 10) errors.push(`world ${id} market counts must reconcile to ten`);
  if (m.observed_unit_count !== 100 || m.treated_unit_count + m.untreated_unit_count !== 100) errors.push(`world ${id} unit counts must reconcile to one hundred`);
  for (const key of ['untreated_system_counterfactual_available','market_boundary_complete']) if (typeof m[key] !== 'boolean') errors.push(`world ${id} market.${key} must be boolean`);
  for (const key of ['market_map_id','approved_market_map_version','executed_market_map_version','market_linkage_state','spillover_state','counterfactual_audit_state']) if (!text(m[key])) errors.push(`world ${id} market.${key} is required`);

  for (const key of ['eligible_service_unit_count','attempted_service_unit_count','completed_service_unit_count','capacity_constrained_unit_count','queued_unit_count','rationed_unit_count','denied_unit_count','quality_deteriorated_unit_count','unmet_need_unit_count']) requireInteger(c, key, 0, 100, `world ${id} capacity`, errors);
  for (const key of ['available_capacity_units','demanded_capacity_units','utilized_capacity_units','wait_time_days']) requireInteger(c, key, 0, 10000, `world ${id} capacity`, errors);
  if (c.eligible_service_unit_count !== 100 || c.attempted_service_unit_count !== 100) errors.push(`world ${id} service denominators must remain one hundred`);
  if (c.completed_service_unit_count > c.attempted_service_unit_count || c.utilized_capacity_units > c.available_capacity_units || c.utilized_capacity_units > c.demanded_capacity_units) errors.push(`world ${id} capacity stock, flow, and completion counts must reconcile`);
  for (const key of ['stock_flow_reconciled','queue_denominator_complete','denial_denominator_complete']) if (typeof c[key] !== 'boolean') errors.push(`world ${id} capacity.${key} must be boolean`);
  for (const key of ['capacity_model_id','quality_audit_state']) if (!text(c[key])) errors.push(`world ${id} capacity.${key} is required`);

  for (const key of ['baseline_price','observed_price','true_price_change','published_price_change','availability_change','pass_through_rate']) requireNumber(p, key, -10, 1000000, `world ${id} price`, errors);
  for (const key of ['price_exposed_unit_count','affordability_shifted_unit_count','demand_shifted_unit_count','uptake_shifted_unit_count']) requireInteger(p, key, 0, 100, `world ${id} price`, errors);
  if (!close(p.published_price_change, 0)) errors.push(`world ${id} published price change must remain zero`);
  for (const key of ['price_feedback_modeled','availability_feedback_modeled','affordability_incidence_complete']) if (typeof p[key] !== 'boolean') errors.push(`world ${id} price.${key} must be boolean`);
  if (!text(p.price_model_id)) errors.push(`world ${id} price model identity is required`);

  for (const key of ['policy_announcement_time','treatment_start_time','anticipation_window_days','anticipating_unit_count','gaming_unit_count','compliance_adapted_unit_count','provider_response_unit_count','supplier_entry_count','supplier_exit_count']) requireInteger(s, key, 0, 1000, `world ${id} strategic_response`, errors);
  if (s.policy_announcement_time >= s.treatment_start_time) errors.push(`world ${id} announcement must precede treatment`);
  for (const key of ['unanticipated_counterfactual_available','gaming_audit_complete','provider_response_modeled','compliance_version_distinguished']) if (typeof s[key] !== 'boolean') errors.push(`world ${id} strategic_response.${key} must be boolean`);
  if (!text(s.response_model_id)) errors.push(`world ${id} strategic response model is required`);

  for (const key of ['substituted_unit_count','displaced_unit_count','crowd_out_unit_count','rebound_unit_count','harm_shifted_unit_count','cross_market_exposure_count','intertemporal_exposure_count']) requireInteger(u, key, 0, 100, `world ${id} substitution`, errors);
  for (const key of ['substitution_map_complete','displaced_destination_complete','harm_transfer_ledger_complete']) if (typeof u[key] !== 'boolean') errors.push(`world ${id} substitution.${key} must be boolean`);
  if (!text(u.substitution_map_id)) errors.push(`world ${id} substitution map is required`);

  for (const key of ['equilibrium_count','solved_equilibrium_count','initialization_count','converged_initialization_count','path_dependent_unit_count']) requireInteger(e, key, 0, 100, `world ${id} equilibrium`, errors);
  if (e.equilibrium_count < 1 || e.solved_equilibrium_count < 1 || e.solved_equilibrium_count > e.equilibrium_count || e.converged_initialization_count > e.initialization_count) errors.push(`world ${id} equilibrium solution and initialization counts must reconcile`);
  for (const key of ['unique_policy_relevant_equilibrium','basin_audit_complete','stability_test_complete','counterfactual_model_current']) if (typeof e[key] !== 'boolean') errors.push(`world ${id} equilibrium.${key} must be boolean`);
  for (const key of ['model_id','model_version','solver_version','equilibrium_concept','selected_equilibrium_id','selection_rule']) if (!text(e[key])) errors.push(`world ${id} equilibrium.${key} is required`);

  for (const key of ['reported_welfare_gain','independent_welfare_gain']) requireNumber(w, key, -1, 1, `world ${id} welfare`, errors);
  for (const key of ['benefited_unit_count','harmed_unit_count','neutral_unit_count','transfer_count','externality_count']) requireInteger(w, key, 0, 100, `world ${id} welfare`, errors);
  if (w.benefited_unit_count + w.harmed_unit_count + w.neutral_unit_count !== 100) errors.push(`world ${id} welfare incidence counts must reconcile to one hundred`);
  if (!close(w.reported_welfare_gain, 0.15)) errors.push(`world ${id} reported welfare gain must remain 0.15`);
  for (const key of ['distributional_incidence_complete','weights_published','subgroup_harm_audit_complete','uncertainty_complete']) if (typeof w[key] !== 'boolean') errors.push(`world ${id} welfare.${key} must be boolean`);
  for (const key of ['welfare_construct','weighting_rule']) if (!text(w[key])) errors.push(`world ${id} welfare.${key} is required`);

  for (const key of ['published_replication_count','independent_replication_count','design_equivalent_replication_count','transport_complete_replication_count','result_reproduced_replication_count','independent_organization_count']) requireInteger(r, key, 0, 10, `world ${id} replication`, errors);
  if (r.published_replication_count !== 2) errors.push(`world ${id} published replications must remain two`);
  for (const key of ['independent_replication_count','design_equivalent_replication_count','transport_complete_replication_count','result_reproduced_replication_count']) if (r[key] > r.published_replication_count) errors.push(`world ${id} replication counts cannot exceed the published denominator`);
  if (typeof r.publication_control_independent !== 'boolean') errors.push(`world ${id} replication publication control must be boolean`);

  for (const key of ['approved_scale_units','executed_scale_units']) requireInteger(l, key, 1, 1000000, `world ${id} lineage`, errors);
  requireInteger(l, 'stale_scale_decision_count', 0, 100, `world ${id} lineage`, errors);
  if (typeof l.current_scale_lineage !== 'boolean') errors.push(`world ${id} lineage current state must be boolean`);
  for (const key of ['approved_release_version','executed_release_version','approved_policy_version','executed_policy_version','approved_workflow_version','executed_workflow_version','approved_supplier_version','executed_supplier_version','approved_market_version','executed_market_version','approved_population_version','executed_population_version','succession_receipt','revalidation_state']) if (!text(l[key])) errors.push(`world ${id} lineage.${key} is required`);

  for (const key of ['reported_direct_effect','reported_equilibrium_effect','reported_welfare_gain','independent_direct_effect','independent_equilibrium_effect','independent_welfare_gain']) requireNumber(a, key, -1, 1, `world ${id} analysis`, errors);
  if (!close(a.reported_direct_effect, 0.20) || !close(a.reported_equilibrium_effect, 0.18) || !close(a.reported_welfare_gain, 0.15)) errors.push(`world ${id} must preserve the reported direct, equilibrium, and welfare surface`);
  for (const key of ['sensitivity_complete','falsification_complete','uncertainty_complete']) if (typeof a[key] !== 'boolean') errors.push(`world ${id} analysis.${key} must be boolean`);
  for (const key of ['estimand_id','estimator_id','model_code_version']) if (!text(a[key])) errors.push(`world ${id} analysis.${key} is required`);

  requireInteger(g, 'unsupported_equilibrium_decision_count', 0, 100, `world ${id} governance`, errors);
  for (const key of ['monitoring_state','market_refresh_state','capacity_price_trigger_state','rollback_state','correction_state','appeal_state','certificate_withdrawal_state']) if (!text(g[key])) errors.push(`world ${id} governance.${key} is required`);
  falseRequired(g.binding_public_authority, `world ${id} binding public authority`, errors);

  if (!sameMembers(Object.keys(f), FLAG_KEYS)) errors.push(`world ${id} expected flags are incomplete`);
  for (const key of FLAG_KEYS) if (typeof f[key] !== 'boolean') errors.push(`world ${id} expected_flags.${key} must be boolean`);
}

function deriveFlags(world) {
  const m = world.market;
  const c = world.capacity;
  const p = world.price;
  const s = world.strategic_response;
  const u = world.substitution;
  const e = world.equilibrium;
  const w = world.welfare;
  const r = world.replication;
  const l = world.lineage;
  const a = world.analysis;
  const g = world.governance;

  const marketCounterfactualComplete = m.untreated_system_counterfactual_available === true
    && m.saturated_unit_count === 0
    && m.market_boundary_complete === true
    && m.market_linkage_state === 'complete'
    && m.counterfactual_audit_state === 'independent_complete';
  const capacityAccessComplete = c.capacity_constrained_unit_count === 0
    && c.queued_unit_count === 0 && c.rationed_unit_count === 0 && c.denied_unit_count === 0
    && c.quality_deteriorated_unit_count === 0 && c.unmet_need_unit_count === 0
    && c.stock_flow_reconciled === true && c.queue_denominator_complete === true
    && c.denial_denominator_complete === true && c.quality_audit_state === 'independent_complete';
  const priceAvailabilityComplete = close(p.true_price_change, p.published_price_change)
    && close(p.availability_change, 0) && p.price_exposed_unit_count === 0
    && p.affordability_shifted_unit_count === 0 && p.demand_shifted_unit_count === 0
    && p.uptake_shifted_unit_count === 0 && p.price_feedback_modeled === true
    && p.availability_feedback_modeled === true && p.affordability_incidence_complete === true;
  const strategicResponseComplete = s.anticipating_unit_count === 0 && s.gaming_unit_count === 0
    && s.compliance_adapted_unit_count === 0 && s.provider_response_unit_count === 0
    && s.supplier_entry_count === 0 && s.supplier_exit_count === 0
    && s.unanticipated_counterfactual_available === true && s.gaming_audit_complete === true
    && s.provider_response_modeled === true && s.compliance_version_distinguished === true;
  const substitutionHarmComplete = u.substituted_unit_count === 0 && u.displaced_unit_count === 0
    && u.crowd_out_unit_count === 0 && u.rebound_unit_count === 0 && u.harm_shifted_unit_count === 0
    && u.cross_market_exposure_count === 0 && u.intertemporal_exposure_count === 0
    && u.substitution_map_complete === true && u.displaced_destination_complete === true
    && u.harm_transfer_ledger_complete === true;
  const equilibriumSelectionComplete = e.equilibrium_count === 1 && e.solved_equilibrium_count === 1
    && e.unique_policy_relevant_equilibrium === true && e.selection_rule === 'predeclared_unique'
    && e.path_dependent_unit_count === 0 && e.basin_audit_complete === true
    && e.stability_test_complete === true;
  const welfareIncidenceComplete = close(w.independent_welfare_gain, w.reported_welfare_gain)
    && w.distributional_incidence_complete === true && w.weights_published === true
    && w.subgroup_harm_audit_complete === true && w.uncertainty_complete === true
    && w.harmed_unit_count === 0;
  const independentReplicationComplete = r.published_replication_count === 2
    && r.independent_replication_count === 2 && r.design_equivalent_replication_count === 2
    && r.transport_complete_replication_count === 2 && r.result_reproduced_replication_count === 2
    && r.independent_organization_count === 2 && r.publication_control_independent === true;
  const versions = [
    ['approved_release_version','executed_release_version'],['approved_policy_version','executed_policy_version'],
    ['approved_workflow_version','executed_workflow_version'],['approved_supplier_version','executed_supplier_version'],
    ['approved_market_version','executed_market_version'],['approved_population_version','executed_population_version']
  ];
  const currentScaleLineageComplete = l.current_scale_lineage === true
    && e.counterfactual_model_current === true
    && versions.every(([approved, executed]) => l[approved] === l[executed])
    && l.approved_scale_units === l.executed_scale_units && l.stale_scale_decision_count === 0
    && l.revalidation_state === 'independent_complete';
  const monitoringCorrectionComplete = g.monitoring_state === 'current_complete'
    && g.market_refresh_state === 'current_complete' && g.capacity_price_trigger_state === 'operational'
    && g.rollback_state === 'operational' && g.correction_state === 'operational'
    && g.appeal_state === 'operational' && g.certificate_withdrawal_state === 'operational';

  const flags = {
    universal_saturation_no_counterfactual_present: m.saturated_unit_count > 0 && m.untreated_system_counterfactual_available === false,
    capacity_queue_rationing_quality_present: !capacityAccessComplete,
    price_availability_feedback_present: !priceAvailabilityComplete,
    strategic_anticipation_gaming_provider_response_present: !strategicResponseComplete,
    substitution_displacement_harm_transfer_present: !substitutionHarmComplete,
    multiple_equilibria_path_selection_present: !equilibriumSelectionComplete || !welfareIncidenceComplete,
    stale_scale_succession_present: !independentReplicationComplete || !currentScaleLineageComplete,
    market_counterfactual_complete: marketCounterfactualComplete,
    capacity_access_complete: capacityAccessComplete,
    price_availability_complete: priceAvailabilityComplete,
    strategic_response_complete: strategicResponseComplete,
    substitution_harm_complete: substitutionHarmComplete,
    equilibrium_selection_complete: equilibriumSelectionComplete,
    welfare_incidence_complete: welfareIncidenceComplete,
    independent_replication_complete: independentReplicationComplete,
    current_scale_lineage_complete: currentScaleLineageComplete,
    monitoring_correction_complete: monitoringCorrectionComplete
  };
  flags.complete_equilibrium_assurance = marketCounterfactualComplete && capacityAccessComplete
    && priceAvailabilityComplete && strategicResponseComplete && substitutionHarmComplete
    && equilibriumSelectionComplete && welfareIncidenceComplete && independentReplicationComplete
    && currentScaleLineageComplete && monitoringCorrectionComplete
    && a.sensitivity_complete === true && a.falsification_complete === true && a.uncertainty_complete === true
    && g.unsupported_equilibrium_decision_count === 0;
  return flags;
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildCustodyChain(world) {
  const events = [];
  let previous = null;
  let source = [];
  const push = (eventType, evidenceClass, authority, payload) => {
    const eventId = `${world.world_id}:${events.length + 1}`;
    const event = sealedEvent({ event_id: eventId, event_type: eventType, evidence_class: evidenceClass, authority, source_event_ids: source, payload }, previous);
    events.push(event);
    previous = event.event_sha256;
    source = [eventId];
  };
  push('equilibrium_publication_surface_frozen','public_claim_surface','equilibrium_assurance_compiler',{ public_claim: world.public_claim });
  push('market_counterfactual_and_saturation_state','synthetic_market_state','equilibrium_assurance_compiler',{ market: world.market });
  push('capacity_queue_rationing_access_quality_state','synthetic_capacity_state','equilibrium_assurance_compiler',{ capacity: world.capacity });
  push('price_availability_affordability_and_demand_state','synthetic_price_state','equilibrium_assurance_compiler',{ price: world.price });
  push('strategic_anticipation_gaming_compliance_and_provider_response_state','synthetic_response_state','equilibrium_assurance_compiler',{ strategic_response: world.strategic_response });
  push('substitution_displacement_crowd_out_rebound_and_harm_transfer_state','synthetic_substitution_state','equilibrium_assurance_compiler',{ substitution: world.substitution });
  push('equilibrium_multiplicity_path_selection_and_welfare_incidence_state','synthetic_equilibrium_welfare_state','equilibrium_assurance_compiler',{ equilibrium: world.equilibrium, welfare: world.welfare });
  push('replication_scale_lineage_analysis_correction_and_authority_state','synthetic_lineage_governance_state','equilibrium_assurance_compiler',{ replication: world.replication, lineage: world.lineage, analysis: world.analysis, governance: world.governance });
  push('equilibrium_assurance_flags_derived','derived_classification','equilibrium_assurance_compiler',{ flags: world.flags });
  push('equilibrium_governance_mechanism_classified','candidate_inference','equilibrium_assurance_analyst',{ mechanism: world.mechanism, complete_equilibrium_assurance: world.flags.complete_equilibrium_assurance, binding_public_authority: false });
  return events;
}

export function validatePreferenceEquilibriumAssuranceChain(chain) {
  const errors = [];
  const events = array(chain);
  if (events.length !== 10) errors.push('equilibrium-assurance custody chain must contain ten events');
  const seen = new Set();
  let previous = null;
  for (const event of events) {
    if (!text(event?.event_id)) errors.push('equilibrium-assurance custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate equilibrium-assurance event ${event?.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`equilibrium-assurance event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`equilibrium-assurance event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`equilibrium-assurance event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function validatePreferenceEquilibriumAssuranceFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_EQUILIBRIUM_ASSURANCE_FIXTURE_SCHEMA_VERSION || fixture?.fixture_id !== 'same-equilibrium-adjusted-status-different-system-states-v1') errors.push('equilibrium-assurance fixture identity or schema mismatch');
  if (fixture?.issue !== 781 || fixture?.parent_program_issue !== 594) errors.push('equilibrium-assurance issue lineage mismatch');
  if (fixture?.status !== 'synthetic_control' || fixture?.graph_effect !== 'none') errors.push('equilibrium-assurance status or graph effect mismatch');
  falseRequired(fixture?.counts_toward_thesis_evidence, 'equilibrium-assurance counts_toward_thesis_evidence', errors);
  if (JSON.stringify(canonical(fixture?.baseline)) !== JSON.stringify(canonical(BASELINE))) errors.push('equilibrium-assurance baseline contract mismatch');
  if (!sameMembers(array(fixture?.worlds).map(world => world.world_id), WORLD_IDS)) errors.push('equilibrium-assurance fixture must contain the eight required worlds');
  if (unique(array(fixture?.worlds).map(world => world.world_id)).length !== 8) errors.push('equilibrium-assurance world IDs must be unique');
  if (!sameMembers(fixture?.required_refusal_rules, REQUIRED_RULES)) errors.push('equilibrium-assurance required refusal rule missing or unexpected');
  for (const key of FALSE_CLASSIFICATIONS) if (fixture?.expected_classification?.[key] !== false) errors.push(`expected_classification.${key} must remain false`);
  if (fixture?.expected_classification?.complete_equilibrium_assurance_supported_in_at_least_one_world !== true) errors.push('fixture must preserve one complete equilibrium-assurance path');
  if (unique(fixture?.prohibited_inferences).length < 16) errors.push('equilibrium-assurance prohibited-inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('equilibrium-assurance interpretation contract is incomplete');
  for (const record of array(fixture?.worlds)) validateExpandedWorld(expandWorld(fixture, record), fixture.baseline, errors);
  return errors;
}

export function compilePreferenceEquilibriumAssuranceFixture(fixture) {
  const errors = validatePreferenceEquilibriumAssuranceFixture(fixture);
  if (errors.length) throw new Error(`invalid preference equilibrium-assurance fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(record => {
    const expanded = expandWorld(fixture, record);
    const flags = deriveFlags(expanded);
    for (const key of FLAG_KEYS) if (flags[key] !== expanded.expected_flags[key]) throw new Error(`world ${record.world_id} flag ${key} mismatch: expected ${expanded.expected_flags[key]}, observed ${flags[key]}`);
    const world = {
      world_id: expanded.world_id,
      mechanism: expanded.mechanism,
      public_claim: expanded.public_claim,
      market: expanded.market,
      capacity: expanded.capacity,
      price: expanded.price,
      strategic_response: expanded.strategic_response,
      substitution: expanded.substitution,
      equilibrium: expanded.equilibrium,
      welfare: expanded.welfare,
      replication: expanded.replication,
      lineage: expanded.lineage,
      analysis: expanded.analysis,
      governance: expanded.governance,
      flags
    };
    world.public_status_signature_sha256 = sha256(world.public_claim);
    world.equilibrium_governance_signature_sha256 = sha256({
      market: world.market, capacity: world.capacity, price: world.price,
      strategic_response: world.strategic_response, substitution: world.substitution,
      equilibrium: world.equilibrium, welfare: world.welfare, replication: world.replication,
      lineage: world.lineage, analysis: world.analysis, governance: world.governance, flags: world.flags
    });
    world.custody_chain = buildCustodyChain(world);
    world.custody_chain_head_sha256 = world.custody_chain.at(-1)?.event_sha256 ?? null;
    return world;
  });

  const count = key => worlds.filter(world => world.flags[key] === true).length;
  const sum = (section, key) => worlds.reduce((total, world) => total + Number(world[section][key]), 0);
  const metrics = {
    world_count: worlds.length,
    distinct_public_status_signatures: unique(worlds.map(world => world.public_status_signature_sha256)).length,
    distinct_equilibrium_governance_signatures: unique(worlds.map(world => world.equilibrium_governance_signature_sha256)).length,
    complete_equilibrium_assurance_worlds: count('complete_equilibrium_assurance'),
    universal_saturation_no_counterfactual_worlds: count('universal_saturation_no_counterfactual_present'),
    capacity_queue_rationing_quality_worlds: count('capacity_queue_rationing_quality_present'),
    price_availability_feedback_worlds: count('price_availability_feedback_present'),
    strategic_anticipation_gaming_provider_response_worlds: count('strategic_anticipation_gaming_provider_response_present'),
    substitution_displacement_harm_transfer_worlds: count('substitution_displacement_harm_transfer_present'),
    multiple_equilibria_path_selection_worlds: count('multiple_equilibria_path_selection_present'),
    stale_scale_succession_worlds: count('stale_scale_succession_present'),
    market_counterfactual_complete_worlds: count('market_counterfactual_complete'),
    capacity_access_complete_worlds: count('capacity_access_complete'),
    price_availability_complete_worlds: count('price_availability_complete'),
    strategic_response_complete_worlds: count('strategic_response_complete'),
    substitution_harm_complete_worlds: count('substitution_harm_complete'),
    equilibrium_selection_complete_worlds: count('equilibrium_selection_complete'),
    welfare_incidence_complete_worlds: count('welfare_incidence_complete'),
    independent_replication_complete_worlds: count('independent_replication_complete'),
    current_scale_lineage_complete_worlds: count('current_scale_lineage_complete'),
    monitoring_correction_complete_worlds: count('monitoring_correction_complete'),
    total_saturated_unit_count: sum('market','saturated_unit_count'),
    total_capacity_constrained_unit_count: sum('capacity','capacity_constrained_unit_count'),
    total_queued_unit_count: sum('capacity','queued_unit_count'),
    total_rationed_unit_count: sum('capacity','rationed_unit_count'),
    total_denied_unit_count: sum('capacity','denied_unit_count'),
    total_quality_deteriorated_unit_count: sum('capacity','quality_deteriorated_unit_count'),
    total_price_exposed_unit_count: sum('price','price_exposed_unit_count'),
    total_affordability_shifted_unit_count: sum('price','affordability_shifted_unit_count'),
    total_demand_shifted_unit_count: sum('price','demand_shifted_unit_count'),
    total_uptake_shifted_unit_count: sum('price','uptake_shifted_unit_count'),
    total_anticipating_unit_count: sum('strategic_response','anticipating_unit_count'),
    total_gaming_unit_count: sum('strategic_response','gaming_unit_count'),
    total_compliance_adapted_unit_count: sum('strategic_response','compliance_adapted_unit_count'),
    total_provider_response_unit_count: sum('strategic_response','provider_response_unit_count'),
    total_substituted_unit_count: sum('substitution','substituted_unit_count'),
    total_displaced_unit_count: sum('substitution','displaced_unit_count'),
    total_crowd_out_unit_count: sum('substitution','crowd_out_unit_count'),
    total_rebound_unit_count: sum('substitution','rebound_unit_count'),
    total_harm_shifted_unit_count: sum('substitution','harm_shifted_unit_count'),
    total_cross_market_exposure_count: sum('substitution','cross_market_exposure_count'),
    total_intertemporal_exposure_count: sum('substitution','intertemporal_exposure_count'),
    total_path_dependent_unit_count: sum('equilibrium','path_dependent_unit_count'),
    total_stale_scale_decision_count: sum('lineage','stale_scale_decision_count'),
    total_unsupported_equilibrium_decisions: sum('governance','unsupported_equilibrium_decision_count'),
    binding_public_authority_worlds: worlds.filter(world => world.governance.binding_public_authority === true).length
  };
  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (!close(metrics[key], value)) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);

  return {
    schema_version: PREFERENCE_EQUILIBRIUM_ASSURANCE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'saturation_general_equilibrium_and_interference_robust_policy_assurance_qualified',
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

export function validatePreferenceEquilibriumAssuranceBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_EQUILIBRIUM_ASSURANCE_BUILD_SCHEMA_VERSION || compiled?.fixture_id !== 'same-equilibrium-adjusted-status-different-system-states-v1') errors.push('compiled equilibrium-assurance identity or schema mismatch');
  if (compiled?.issue !== 781 || compiled?.status !== 'saturation_general_equilibrium_and_interference_robust_policy_assurance_qualified') errors.push('compiled equilibrium-assurance issue or status mismatch');
  if (compiled?.graph_effect !== 'none' || compiled?.real_world_evidence_state !== 'none') errors.push('compiled equilibrium-assurance evidence boundary mismatch');
  falseRequired(compiled?.counts_toward_thesis_evidence, 'compiled counts_toward_thesis_evidence', errors);
  falseRequired(compiled?.conclusion_generated, 'compiled conclusion_generated', errors);
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), WORLD_IDS)) errors.push('compiled equilibrium-assurance worlds are incomplete');
  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (!close(compiled?.metrics?.[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const key of FALSE_CLASSIFICATIONS) if (compiled?.classification?.[key] !== false) errors.push(`compiled classification.${key} must remain false`);
  falseRequired(compiled?.classification?.preference_change_present, 'compiled preference_change_present', errors);
  if (compiled?.classification?.complete_equilibrium_assurance_supported_in_at_least_one_world !== true) errors.push('compiled build must preserve one complete equilibrium-assurance path');

  for (const world of array(compiled?.worlds)) {
    if (!sameMembers(Object.keys(world.flags), FLAG_KEYS)) errors.push(`compiled world ${world.world_id} flags are incomplete`);
    if (!/^[0-9a-f]{64}$/.test(text(world.public_status_signature_sha256)) || !/^[0-9a-f]{64}$/.test(text(world.equilibrium_governance_signature_sha256))) errors.push(`compiled world ${world.world_id} signature is invalid`);
    errors.push(...validatePreferenceEquilibriumAssuranceChain(world.custody_chain));
    if (world.custody_chain.at(-1)?.event_sha256 !== world.custody_chain_head_sha256) errors.push(`compiled world ${world.world_id} custody head mismatch`);
  }
  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  if (byId[WORLD_IDS[0]]?.flags.complete_equilibrium_assurance !== true) errors.push('positive world must preserve complete equilibrium assurance');
  if (byId[WORLD_IDS[1]]?.flags.universal_saturation_no_counterfactual_present !== true) errors.push('universal saturation control is missing');
  if (byId[WORLD_IDS[2]]?.flags.capacity_queue_rationing_quality_present !== true) errors.push('capacity and access control is missing');
  if (byId[WORLD_IDS[3]]?.flags.price_availability_feedback_present !== true) errors.push('price and availability control is missing');
  if (byId[WORLD_IDS[4]]?.flags.strategic_anticipation_gaming_provider_response_present !== true) errors.push('strategic response control is missing');
  if (byId[WORLD_IDS[5]]?.flags.substitution_displacement_harm_transfer_present !== true) errors.push('substitution and harm-transfer control is missing');
  if (byId[WORLD_IDS[6]]?.flags.multiple_equilibria_path_selection_present !== true) errors.push('multiple-equilibria and welfare control is missing');
  if (byId[WORLD_IDS[7]]?.flags.stale_scale_succession_present !== true) errors.push('scale-succession control is missing');
  if (!sameMembers(compiled?.refusal_rules, REQUIRED_RULES) || !text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled equilibrium-assurance interpretation boundary is incomplete');
  return errors;
}

export function renderPreferenceEquilibriumAssuranceMarkdown(compiled) {
  const lines = [
    '# Saturation, general-equilibrium, and interference-robust policy custody','',
    `**Status:** ${compiled.status}`,'',
    `**Worlds:** ${compiled.metrics.world_count}`,'',
    `**Public equilibrium status:** ${compiled.baseline.public_equilibrium_status}`,'',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,'',
    '## Candidate worlds',''
  ];
  for (const world of compiled.worlds) {
    lines.push(
      `### ${world.world_id}`,'',
      `- Mechanism: ${world.mechanism}`,
      `- Saturated units: ${world.market.saturated_unit_count}`,
      `- Capacity-constrained units: ${world.capacity.capacity_constrained_unit_count}`,
      `- Queued units: ${world.capacity.queued_unit_count}`,
      `- Rationed units: ${world.capacity.rationed_unit_count}`,
      `- Price-exposed units: ${world.price.price_exposed_unit_count}`,
      `- Anticipating units: ${world.strategic_response.anticipating_unit_count}`,
      `- Gaming units: ${world.strategic_response.gaming_unit_count}`,
      `- Provider-response units: ${world.strategic_response.provider_response_unit_count}`,
      `- Displaced units: ${world.substitution.displaced_unit_count}`,
      `- Harm-shifted units: ${world.substitution.harm_shifted_unit_count}`,
      `- Path-dependent units: ${world.equilibrium.path_dependent_unit_count}`,
      `- Stale scale decisions: ${world.lineage.stale_scale_decision_count}`,
      `- Complete assurance: ${world.flags.complete_equilibrium_assurance}`,
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
