import { createHash } from 'node:crypto';

export const PREFERENCE_MARKET_SERVICE_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-market-service-assurance-fixture@1';
export const PREFERENCE_MARKET_SERVICE_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-market-service-assurance-build@1';

const WORLD_IDS = [
  'complete-operational-market-counterfactual-capacity-access-service-quality-and-current-lineage',
  'boundary-truncation-omitted-markets-and-cross-market-counterfactual-contamination',
  'capacity-stock-flow-mismatch-queues-rationing-denial-and-unmet-need',
  'price-availability-affordability-demand-and-uptake-feedback',
  'nominal-access-coverage-with-geographic-temporal-language-disability-digital-and-administrative-exclusion',
  'completion-only-publication-excluding-attempted-denied-abandoned-deferred-referred-and-unserved-units',
  'aggregate-quality-preserved-by-version-provider-severity-cream-skimming-and-survivor-selection',
  'historical-market-assurance-inherited-after-supplier-service-price-capacity-access-policy-workflow-population-and-scale-succession'
];

const FLAG_KEYS = [
  'complete_market_service_assurance',
  'market_boundary_counterfactual_failure_present',
  'capacity_queue_rationing_denial_failure_present',
  'price_availability_affordability_failure_present',
  'access_exclusion_failure_present',
  'service_denominator_failure_present',
  'quality_version_provider_selection_failure_present',
  'stale_market_lineage_failure_present',
  'market_counterfactual_complete',
  'capacity_flow_complete',
  'price_affordability_complete',
  'access_coverage_complete',
  'service_denominator_complete',
  'quality_measurement_complete',
  'current_market_lineage_complete',
  'monitoring_correction_complete'
];

const EXPECTED_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_market_service_governance_signatures: 8,
  complete_market_service_assurance_worlds: 1,
  market_boundary_counterfactual_failure_worlds: 1,
  capacity_queue_rationing_denial_failure_worlds: 1,
  price_availability_affordability_failure_worlds: 1,
  access_exclusion_failure_worlds: 1,
  service_denominator_failure_worlds: 1,
  quality_version_provider_selection_failure_worlds: 1,
  stale_market_lineage_failure_worlds: 1,
  market_counterfactual_complete_worlds: 7,
  capacity_flow_complete_worlds: 7,
  price_affordability_complete_worlds: 7,
  access_coverage_complete_worlds: 7,
  service_denominator_complete_worlds: 7,
  quality_measurement_complete_worlds: 7,
  current_market_lineage_complete_worlds: 7,
  monitoring_correction_complete_worlds: 8,
  total_counterfactual_unavailable_unit_count: 100,
  total_omitted_market_count: 2,
  total_cross_market_contaminated_unit_count: 100,
  total_capacity_constrained_unit_count: 60,
  total_queued_unit_count: 40,
  total_rationed_unit_count: 30,
  total_capacity_denied_unit_count: 20,
  total_unmet_need_unit_count: 30,
  total_price_exposed_unit_count: 60,
  total_availability_shifted_unit_count: 30,
  total_affordability_shifted_unit_count: 40,
  total_demand_shifted_unit_count: 40,
  total_uptake_shifted_unit_count: 30,
  total_access_limited_unit_count: 50,
  total_geographic_temporal_excluded_unit_count: 60,
  total_language_excluded_unit_count: 20,
  total_disability_excluded_unit_count: 15,
  total_digital_excluded_unit_count: 25,
  total_documentation_excluded_unit_count: 10,
  total_administrative_burden_excluded_unit_count: 20,
  total_service_denominator_excluded_unit_count: 40,
  total_unserved_unit_count: 60,
  total_service_denied_unit_count: 30,
  total_abandoned_unit_count: 10,
  total_deferred_unit_count: 5,
  total_referred_pending_unit_count: 5,
  total_quality_degraded_unit_count: 40,
  total_version_shifted_unit_count: 40,
  total_provider_mix_selected_unit_count: 40,
  total_cream_skimming_unit_count: 30,
  total_survivor_only_unit_count: 40,
  total_stale_market_assurance_decision_count: 100,
  total_unsupported_market_assurance_decisions: 700,
  binding_public_authority_worlds: 0
};

const FALSE_CLASSIFICATIONS = [
  'declared_market_boundary_identifies_operational_system_boundary',
  'observed_untreated_units_identify_valid_untreated_market_counterfactual',
  'published_capacity_coverage_identifies_staffed_available_usable_unconstrained_capacity',
  'completed_services_identify_complete_service_population',
  'zero_published_denial_rate_identifies_zero_true_denial',
  'zero_published_price_change_identifies_zero_affordability_or_availability_change',
  'nominal_channel_availability_identifies_usable_access',
  'published_access_coverage_identifies_complete_population_access',
  'published_service_records_identify_complete_service_denominator',
  'aggregate_quality_identifies_stable_version_dose_provider_and_case_mix',
  'stable_quality_score_identifies_absence_of_selection_or_deterioration',
  'historical_market_assurance_identifies_current_market_service_assurance',
  'public_market_service_verified_status_identifies_complete_current_counterfactual_capacity_price_access_denominator_quality_correctable_authorized_evidence',
  'market_service_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'binding_public_authority_supported',
  'manipulative_intent_inferable',
  'real_world_effect_claimed'
];

const REQUIRED_RULES = [
  'declared_market_boundary_is_not_the_operational_system_boundary',
  'observed_untreated_units_are_not_an_untreated_market_counterfactual_under_cross_market_exposure',
  'published_capacity_coverage_is_not_staffed_available_usable_or_unconstrained_capacity',
  'completed_services_are_not_the_eligible_attempted_queued_denied_abandoned_or_unserved_denominator',
  'zero_published_denial_rate_is_not_zero_denial_when_denied_and_unserved_units_are_excluded',
  'zero_published_price_change_is_not_zero_fee_pass_through_availability_affordability_demand_or_uptake_change',
  'nominal_channel_availability_is_not_usable_geographic_temporal_language_disability_digital_documentary_or_administrative_access',
  'published_access_coverage_is_not_complete_access_for_the_eligible_population',
  'published_service_records_are_not_a_complete_service_denominator',
  'aggregate_quality_is_not_stable_service_version_dose_provider_mix_severity_mix_or_survivor_independent_quality',
  'stable_quality_score_is_not_absence_of_cream_skimming_quality_deterioration_or_provider_selection',
  'historical_market_assurance_is_not_current_assurance_after_supplier_market_service_price_capacity_access_policy_workflow_population_or_scale_succession',
  'public_market_service_verified_status_is_not_complete_current_counterfactual_valid_capacity_reconciled_price_aware_access_complete_denominator_complete_quality_valid_correctable_authorized_evidence',
  'market_service_assurance_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'market_service_claim_requires_operational_boundary_counterfactual_capacity_queue_rationing_denial_price_availability_affordability_access_denominator_quality_version_provider_lineage_correction_durability_and_authority_custody',
  'binding_public_authority_requires_separate_current_public_authorization_receipts'
];

const BASELINE = {
  operative_release_id: 'RELEASE-INCIDENT-V1',
  operative_release_version: 1,
  declared_markets: 10,
  eligible_units: 100,
  published_service_records: 100,
  public_market_assurance_status: 'market_service_verified',
  published_capacity_coverage: 1,
  published_access_coverage: 1,
  published_denial_rate: 0,
  published_price_change: 0,
  published_quality_score: 0.9,
  approved_use: 'systemwide_release_policy',
  reference_market_map_version: 'MARKET-MAP-V1',
  reference_service_version: 'SERVICE-V1',
  reference_capacity_plan_version: 'CAPACITY-PLAN-V1',
  binding_public_authority: false
};

const EPSILON = 1e-12;
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const sorted = values => [...values].sort((left, right) => String(left).localeCompare(String(right)));
const sameMembers = (left, right) => JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
const close = (left, right) => Math.abs(Number(left) - Number(right)) <= EPSILON;
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
    'operative_release_id','operative_release_version','declared_markets','eligible_units',
    'published_service_records','public_market_assurance_status','published_capacity_coverage',
    'published_access_coverage','published_denial_rate','published_price_change',
    'published_quality_score','approved_use'
  ].map(key => [key, baseline[key]]));
}

function validateExpandedWorld(world, baseline, errors) {
  const id = text(world.world_id) || '(missing world ID)';
  const m = object(world.market);
  const c = object(world.capacity);
  const p = object(world.price);
  const x = object(world.access);
  const d = object(world.service_denominator);
  const q = object(world.quality);
  const l = object(world.lineage);
  const a = object(world.analysis);
  const g = object(world.governance);
  const f = object(world.expected_flags);

  if (!text(world.mechanism)) errors.push(`world ${id} mechanism is required`);
  if (JSON.stringify(canonical(world.public_claim)) !== JSON.stringify(canonical(expectedPublicClaim(baseline)))) {
    errors.push(`world ${id} must preserve the frozen market-service publication surface`);
  }

  for (const key of ['declared_market_count','operational_market_count','omitted_market_count','external_market_count']) requireInteger(m, key, 0, 100, `world ${id} market`, errors);
  for (const key of ['observed_unit_count','untreated_market_unit_count','counterfactual_unavailable_unit_count','cross_market_contaminated_unit_count']) requireInteger(m, key, 0, 100, `world ${id} market`, errors);
  if (m.declared_market_count !== 10 || m.observed_unit_count !== 100) errors.push(`world ${id} must preserve declared markets and observed units`);
  if (m.operational_market_count - m.declared_market_count !== m.omitted_market_count) errors.push(`world ${id} omitted markets must reconcile declared and operational boundaries`);
  if (m.external_market_count < m.omitted_market_count) errors.push(`world ${id} external market count cannot be below omitted markets`);
  for (const key of ['market_boundary_complete','untreated_market_counterfactual_complete']) if (typeof m[key] !== 'boolean') errors.push(`world ${id} market.${key} must be boolean`);
  for (const key of ['market_map_id','approved_market_map_version','executed_market_map_version','operational_boundary_state','cross_market_exposure_state','counterfactual_audit_state']) if (!text(m[key])) errors.push(`world ${id} market.${key} is required`);

  for (const key of ['public_eligible_unit_count','operational_eligible_unit_count','attempted_unit_count','available_capacity_units','staffed_capacity_units','demanded_capacity_units','utilized_capacity_units','capacity_constrained_unit_count','queued_unit_count','rationed_unit_count','denied_unit_count','unmet_need_unit_count','max_wait_days']) requireInteger(c, key, 0, 10000, `world ${id} capacity`, errors);
  if (c.public_eligible_unit_count !== 100 || c.operational_eligible_unit_count !== 100 || c.attempted_unit_count !== 100) errors.push(`world ${id} capacity denominators must remain one hundred`);
  if (c.utilized_capacity_units > c.available_capacity_units || c.utilized_capacity_units > c.staffed_capacity_units || c.utilized_capacity_units > c.demanded_capacity_units) errors.push(`world ${id} capacity stock and flow counts must reconcile`);
  for (const key of ['capacity_constrained_unit_count','queued_unit_count','rationed_unit_count','denied_unit_count','unmet_need_unit_count']) if (c[key] > c.operational_eligible_unit_count) errors.push(`world ${id} capacity.${key} exceeds the operational denominator`);
  for (const key of ['stock_flow_reconciled','queue_denominator_complete','rationing_ledger_complete','denial_denominator_complete']) if (typeof c[key] !== 'boolean') errors.push(`world ${id} capacity.${key} must be boolean`);
  for (const key of ['capacity_plan_id','outage_state']) if (!text(c[key])) errors.push(`world ${id} capacity.${key} is required`);

  for (const key of ['baseline_price','observed_price','true_price_change','published_price_change','fee_change','subsidy_change','pass_through_rate','availability_change']) requireNumber(p, key, -1000000, 1000000, `world ${id} price`, errors);
  for (const key of ['price_exposed_unit_count','availability_shifted_unit_count','affordability_shifted_unit_count','demand_shifted_unit_count','uptake_shifted_unit_count']) requireInteger(p, key, 0, 100, `world ${id} price`, errors);
  if (!close(p.published_price_change, 0)) errors.push(`world ${id} published price change must remain zero`);
  for (const key of ['price_feedback_modeled','availability_feedback_modeled','affordability_incidence_complete']) if (typeof p[key] !== 'boolean') errors.push(`world ${id} price.${key} must be boolean`);
  if (!text(p.price_model_id)) errors.push(`world ${id} price model identity is required`);

  requireInteger(x, 'channel_count', 1, 100, `world ${id} access`, errors);
  requireInteger(x, 'usable_channel_count', 0, 100, `world ${id} access`, errors);
  if (x.usable_channel_count > x.channel_count) errors.push(`world ${id} usable channels cannot exceed declared channels`);
  for (const key of ['access_limited_unit_count','geographic_temporal_excluded_unit_count','language_excluded_unit_count','disability_excluded_unit_count','digital_excluded_unit_count','documentation_excluded_unit_count','administrative_burden_excluded_unit_count']) requireInteger(x, key, 0, 100, `world ${id} access`, errors);
  for (const key of ['geography_complete','hours_complete','language_access_complete','disability_access_complete','digital_access_complete','documentation_access_complete','administrative_access_complete']) if (typeof x[key] !== 'boolean') errors.push(`world ${id} access.${key} must be boolean`);
  for (const key of ['access_map_id','access_audit_state']) if (!text(x[key])) errors.push(`world ${id} access.${key} is required`);

  for (const key of ['public_eligible_unit_count','operational_eligible_unit_count','attempted_unit_count','referred_pending_unit_count','deferred_unit_count','abandoned_unit_count','denied_unit_count','unserved_no_attempt_unit_count','unserved_unit_count','started_unit_count','completed_unit_count','published_record_count','service_denominator_excluded_unit_count']) requireInteger(d, key, 0, 1000, `world ${id} service_denominator`, errors);
  if (d.public_eligible_unit_count !== 100 || d.published_record_count !== 100) errors.push(`world ${id} public service denominator must remain one hundred`);
  if (d.attempted_unit_count !== d.operational_eligible_unit_count - d.unserved_no_attempt_unit_count) errors.push(`world ${id} attempted and no-attempt denominators must reconcile`);
  if (d.started_unit_count + d.denied_unit_count + d.abandoned_unit_count + d.deferred_unit_count + d.referred_pending_unit_count !== d.attempted_unit_count) errors.push(`world ${id} attempted-service statuses must reconcile`);
  if (d.completed_unit_count > d.started_unit_count) errors.push(`world ${id} completed services cannot exceed started services`);
  if (d.unserved_unit_count !== d.operational_eligible_unit_count - d.completed_unit_count) errors.push(`world ${id} unserved units must reconcile to operational eligible minus completed`);
  if (d.service_denominator_excluded_unit_count > d.operational_eligible_unit_count) errors.push(`world ${id} excluded service denominator exceeds operational eligible units`);
  for (const key of ['denominator_reconciled','attempt_denominator_complete','noncompletion_reason_complete','unserved_denominator_complete']) if (typeof d[key] !== 'boolean') errors.push(`world ${id} service_denominator.${key} must be boolean`);
  for (const key of ['service_ledger_id','source_ledger_state']) if (!text(d[key])) errors.push(`world ${id} service_denominator.${key} is required`);

  for (const key of ['published_quality_score','independent_quality_score']) requireNumber(q, key, 0, 1, `world ${id} quality`, errors);
  for (const key of ['quality_observed_unit_count','quality_degraded_unit_count','version_shifted_unit_count','provider_mix_selected_unit_count','cream_skimming_unit_count','survivor_only_unit_count']) requireInteger(q, key, 0, 100, `world ${id} quality`, errors);
  requireInteger(q, 'service_version_count', 1, 100, `world ${id} quality`, errors);
  if (!close(q.published_quality_score, 0.9)) errors.push(`world ${id} published quality score must remain 0.90`);
  for (const key of ['dose_distinguished','severity_adjusted','provider_mix_complete','survivor_independent','quality_uncertainty_complete']) if (typeof q[key] !== 'boolean') errors.push(`world ${id} quality.${key} must be boolean`);
  for (const key of ['quality_model_id','quality_construct','approved_service_version','executed_service_version']) if (!text(q[key])) errors.push(`world ${id} quality.${key} is required`);

  for (const key of ['approved_scale_units','executed_scale_units']) requireInteger(l, key, 1, 1000000, `world ${id} lineage`, errors);
  requireInteger(l, 'stale_market_assurance_decision_count', 0, 100, `world ${id} lineage`, errors);
  if (typeof l.current_market_lineage !== 'boolean') errors.push(`world ${id} lineage current state must be boolean`);
  for (const key of ['approved_release_version','executed_release_version','approved_market_version','executed_market_version','approved_service_version','executed_service_version','approved_supplier_version','executed_supplier_version','approved_provider_version','executed_provider_version','approved_price_version','executed_price_version','approved_capacity_version','executed_capacity_version','approved_access_version','executed_access_version','approved_policy_version','executed_policy_version','approved_workflow_version','executed_workflow_version','approved_population_version','executed_population_version','succession_receipt','revalidation_state']) if (!text(l[key])) errors.push(`world ${id} lineage.${key} is required`);

  for (const key of ['reported_denial_rate','independent_denial_rate','reported_price_change','independent_price_change','reported_quality_score','independent_quality_score']) requireNumber(a, key, -1, 1, `world ${id} analysis`, errors);
  if (!close(a.reported_denial_rate, 0) || !close(a.reported_price_change, 0) || !close(a.reported_quality_score, 0.9)) errors.push(`world ${id} must preserve the reported denial, price, and quality surface`);
  for (const key of ['sensitivity_complete','falsification_complete','uncertainty_complete']) if (typeof a[key] !== 'boolean') errors.push(`world ${id} analysis.${key} must be boolean`);
  if (!text(a.analysis_plan_id)) errors.push(`world ${id} analysis plan is required`);

  requireInteger(g, 'unsupported_market_assurance_decision_count', 0, 100, `world ${id} governance`, errors);
  for (const key of ['monitoring_state','market_refresh_state','denominator_refresh_state','capacity_trigger_state','price_trigger_state','access_trigger_state','quality_trigger_state','rollback_state','correction_state','appeal_state','certificate_withdrawal_state']) if (!text(g[key])) errors.push(`world ${id} governance.${key} is required`);
  falseRequired(g.binding_public_authority, `world ${id} binding public authority`, errors);

  if (!sameMembers(Object.keys(f), FLAG_KEYS)) errors.push(`world ${id} expected flags are incomplete`);
  for (const key of FLAG_KEYS) if (typeof f[key] !== 'boolean') errors.push(`world ${id} expected_flags.${key} must be boolean`);
}

function deriveFlags(world) {
  const m = world.market;
  const c = world.capacity;
  const p = world.price;
  const x = world.access;
  const d = world.service_denominator;
  const q = world.quality;
  const l = world.lineage;
  const g = world.governance;

  const marketCounterfactualComplete = m.market_boundary_complete === true
    && m.untreated_market_counterfactual_complete === true
    && m.operational_market_count === m.declared_market_count
    && m.omitted_market_count === 0 && m.counterfactual_unavailable_unit_count === 0
    && m.cross_market_contaminated_unit_count === 0
    && m.approved_market_map_version === m.executed_market_map_version
    && m.operational_boundary_state === 'complete'
    && m.cross_market_exposure_state === 'bounded_none'
    && m.counterfactual_audit_state === 'independent_complete';
  const capacityFlowComplete = c.capacity_constrained_unit_count === 0
    && c.queued_unit_count === 0 && c.rationed_unit_count === 0
    && c.denied_unit_count === 0 && c.unmet_need_unit_count === 0
    && c.stock_flow_reconciled === true && c.queue_denominator_complete === true
    && c.rationing_ledger_complete === true && c.denial_denominator_complete === true
    && c.outage_state === 'none';
  const priceAffordabilityComplete = close(p.true_price_change, p.published_price_change)
    && close(p.fee_change, 0) && close(p.subsidy_change, 0)
    && close(p.availability_change, 0) && p.price_exposed_unit_count === 0
    && p.availability_shifted_unit_count === 0 && p.affordability_shifted_unit_count === 0
    && p.demand_shifted_unit_count === 0 && p.uptake_shifted_unit_count === 0
    && p.price_feedback_modeled === true && p.availability_feedback_modeled === true
    && p.affordability_incidence_complete === true;
  const accessCoverageComplete = x.usable_channel_count === x.channel_count
    && x.access_limited_unit_count === 0 && x.geographic_temporal_excluded_unit_count === 0
    && x.language_excluded_unit_count === 0 && x.disability_excluded_unit_count === 0
    && x.digital_excluded_unit_count === 0 && x.documentation_excluded_unit_count === 0
    && x.administrative_burden_excluded_unit_count === 0
    && x.geography_complete === true && x.hours_complete === true
    && x.language_access_complete === true && x.disability_access_complete === true
    && x.digital_access_complete === true && x.documentation_access_complete === true
    && x.administrative_access_complete === true && x.access_audit_state === 'independent_complete';
  const serviceDenominatorComplete = d.operational_eligible_unit_count === d.public_eligible_unit_count
    && d.service_denominator_excluded_unit_count === 0
    && d.denominator_reconciled === true && d.attempt_denominator_complete === true
    && d.noncompletion_reason_complete === true && d.unserved_denominator_complete === true
    && ['complete','complete_all_statuses'].includes(d.source_ledger_state);
  const qualityMeasurementComplete = close(q.independent_quality_score, q.published_quality_score)
    && q.quality_degraded_unit_count === 0 && q.version_shifted_unit_count === 0
    && q.provider_mix_selected_unit_count === 0 && q.cream_skimming_unit_count === 0
    && q.survivor_only_unit_count === 0 && q.service_version_count === 1
    && q.approved_service_version === q.executed_service_version
    && q.dose_distinguished === true && q.severity_adjusted === true
    && q.provider_mix_complete === true && q.survivor_independent === true
    && q.quality_uncertainty_complete === true;
  const versionPairs = [
    ['approved_release_version','executed_release_version'],
    ['approved_market_version','executed_market_version'],
    ['approved_service_version','executed_service_version'],
    ['approved_supplier_version','executed_supplier_version'],
    ['approved_provider_version','executed_provider_version'],
    ['approved_price_version','executed_price_version'],
    ['approved_capacity_version','executed_capacity_version'],
    ['approved_access_version','executed_access_version'],
    ['approved_policy_version','executed_policy_version'],
    ['approved_workflow_version','executed_workflow_version'],
    ['approved_population_version','executed_population_version']
  ];
  const currentMarketLineageComplete = l.current_market_lineage === true
    && versionPairs.every(([approved, executed]) => l[approved] === l[executed])
    && l.approved_scale_units === l.executed_scale_units
    && l.stale_market_assurance_decision_count === 0
    && l.revalidation_state === 'independent_complete';
  const monitoringCorrectionComplete = g.monitoring_state === 'current_complete'
    && g.market_refresh_state === 'current_complete'
    && g.denominator_refresh_state === 'current_complete'
    && ['capacity_trigger_state','price_trigger_state','access_trigger_state','quality_trigger_state','rollback_state','correction_state','appeal_state','certificate_withdrawal_state'].every(key => g[key] === 'operational');

  const completeMarketServiceAssurance = marketCounterfactualComplete && capacityFlowComplete
    && priceAffordabilityComplete && accessCoverageComplete && serviceDenominatorComplete
    && qualityMeasurementComplete && currentMarketLineageComplete && monitoringCorrectionComplete;

  return {
    complete_market_service_assurance: completeMarketServiceAssurance,
    market_boundary_counterfactual_failure_present: !marketCounterfactualComplete,
    capacity_queue_rationing_denial_failure_present: !capacityFlowComplete,
    price_availability_affordability_failure_present: !priceAffordabilityComplete,
    access_exclusion_failure_present: !accessCoverageComplete,
    service_denominator_failure_present: !serviceDenominatorComplete,
    quality_version_provider_selection_failure_present: !qualityMeasurementComplete,
    stale_market_lineage_failure_present: !currentMarketLineageComplete,
    market_counterfactual_complete: marketCounterfactualComplete,
    capacity_flow_complete: capacityFlowComplete,
    price_affordability_complete: priceAffordabilityComplete,
    access_coverage_complete: accessCoverageComplete,
    service_denominator_complete: serviceDenominatorComplete,
    quality_measurement_complete: qualityMeasurementComplete,
    current_market_lineage_complete: currentMarketLineageComplete,
    monitoring_correction_complete: monitoringCorrectionComplete
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildCustodyChain(world) {
  const events = [];
  let previous = null;
  const push = (eventType, evidenceClass, authority, payload) => {
    const event = sealedEvent({
      event_id: `${world.world_id}:${events.length + 1}`,
      event_type: eventType,
      evidence_class: evidenceClass,
      authority,
      source_event_ids: events.length ? [events.at(-1).event_id] : [],
      payload
    }, previous);
    events.push(event);
    previous = event.event_sha256;
  };
  push('market_service_public_claim_surface','synthetic_publication_surface','market_service_assurance_compiler',{ public_claim: world.public_claim });
  push('operational_market_boundary_and_counterfactual_state','synthetic_market_state','market_service_assurance_compiler',{ market: world.market });
  push('capacity_stock_flow_queue_rationing_denial_and_unmet_need_state','synthetic_capacity_state','market_service_assurance_compiler',{ capacity: world.capacity });
  push('price_availability_affordability_demand_and_uptake_state','synthetic_price_state','market_service_assurance_compiler',{ price: world.price });
  push('geographic_temporal_language_disability_digital_documentary_and_administrative_access_state','synthetic_access_state','market_service_assurance_compiler',{ access: world.access });
  push('eligible_attempted_started_completed_denied_abandoned_and_unserved_denominator_state','synthetic_service_denominator_state','market_service_assurance_compiler',{ service_denominator: world.service_denominator });
  push('service_version_provider_case_mix_selection_and_quality_state','synthetic_quality_state','market_service_assurance_compiler',{ quality: world.quality });
  push('market_service_lineage_analysis_correction_and_authority_state','synthetic_lineage_governance_state','market_service_assurance_compiler',{ lineage: world.lineage, analysis: world.analysis, governance: world.governance });
  push('market_service_assurance_flags_derived','derived_classification','market_service_assurance_compiler',{ flags: world.flags });
  push('market_service_governance_mechanism_classified','candidate_inference','market_service_assurance_analyst',{ mechanism: world.mechanism, complete_market_service_assurance: world.flags.complete_market_service_assurance, binding_public_authority: false });
  return events;
}

export function validatePreferenceMarketServiceAssuranceChain(chain) {
  const errors = [];
  const events = array(chain);
  if (events.length !== 10) errors.push('market-service assurance custody chain must contain ten events');
  const seen = new Set();
  let previous = null;
  for (const event of events) {
    if (!text(event?.event_id)) errors.push('market-service assurance custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate market-service assurance event ${event?.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`market-service assurance event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`market-service assurance event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`market-service assurance event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function validatePreferenceMarketServiceAssuranceFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_MARKET_SERVICE_ASSURANCE_FIXTURE_SCHEMA_VERSION || fixture?.fixture_id !== 'same-market-service-verified-status-different-operational-states-v1') errors.push('market-service assurance fixture identity or schema mismatch');
  if (fixture?.issue !== 799 || fixture?.parent_program_issue !== 594) errors.push('market-service assurance issue lineage mismatch');
  if (fixture?.status !== 'synthetic_control' || fixture?.graph_effect !== 'none') errors.push('market-service assurance status or graph effect mismatch');
  falseRequired(fixture?.counts_toward_thesis_evidence, 'market-service assurance counts_toward_thesis_evidence', errors);
  if (JSON.stringify(canonical(fixture?.baseline)) !== JSON.stringify(canonical(BASELINE))) errors.push('market-service assurance baseline contract mismatch');
  if (!sameMembers(array(fixture?.worlds).map(world => world.world_id), WORLD_IDS)) errors.push('market-service assurance fixture must contain the eight required worlds');
  if (unique(array(fixture?.worlds).map(world => world.world_id)).length !== 8) errors.push('market-service assurance world IDs must be unique');
  if (!sameMembers(fixture?.required_refusal_rules, REQUIRED_RULES)) errors.push('market-service assurance required refusal rule missing or unexpected');
  for (const key of FALSE_CLASSIFICATIONS) if (fixture?.expected_classification?.[key] !== false) errors.push(`expected_classification.${key} must remain false`);
  if (fixture?.expected_classification?.complete_market_service_assurance_supported_in_at_least_one_world !== true) errors.push('fixture must preserve one complete market-service assurance path');
  if (unique(fixture?.prohibited_inferences).length < 16) errors.push('market-service assurance prohibited-inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('market-service assurance interpretation contract is incomplete');
  for (const record of array(fixture?.worlds)) validateExpandedWorld(expandWorld(fixture, record), fixture.baseline, errors);
  return errors;
}

export function compilePreferenceMarketServiceAssuranceFixture(fixture) {
  const errors = validatePreferenceMarketServiceAssuranceFixture(fixture);
  if (errors.length) throw new Error(`invalid preference market-service assurance fixture:\n- ${errors.join('\n- ')}`);

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
      access: expanded.access,
      service_denominator: expanded.service_denominator,
      quality: expanded.quality,
      lineage: expanded.lineage,
      analysis: expanded.analysis,
      governance: expanded.governance,
      flags
    };
    world.public_status_signature_sha256 = sha256(world.public_claim);
    world.market_service_governance_signature_sha256 = sha256({
      market: world.market, capacity: world.capacity, price: world.price,
      access: world.access, service_denominator: world.service_denominator,
      quality: world.quality, lineage: world.lineage, analysis: world.analysis,
      governance: world.governance, flags: world.flags
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
    distinct_market_service_governance_signatures: unique(worlds.map(world => world.market_service_governance_signature_sha256)).length,
    complete_market_service_assurance_worlds: count('complete_market_service_assurance'),
    market_boundary_counterfactual_failure_worlds: count('market_boundary_counterfactual_failure_present'),
    capacity_queue_rationing_denial_failure_worlds: count('capacity_queue_rationing_denial_failure_present'),
    price_availability_affordability_failure_worlds: count('price_availability_affordability_failure_present'),
    access_exclusion_failure_worlds: count('access_exclusion_failure_present'),
    service_denominator_failure_worlds: count('service_denominator_failure_present'),
    quality_version_provider_selection_failure_worlds: count('quality_version_provider_selection_failure_present'),
    stale_market_lineage_failure_worlds: count('stale_market_lineage_failure_present'),
    market_counterfactual_complete_worlds: count('market_counterfactual_complete'),
    capacity_flow_complete_worlds: count('capacity_flow_complete'),
    price_affordability_complete_worlds: count('price_affordability_complete'),
    access_coverage_complete_worlds: count('access_coverage_complete'),
    service_denominator_complete_worlds: count('service_denominator_complete'),
    quality_measurement_complete_worlds: count('quality_measurement_complete'),
    current_market_lineage_complete_worlds: count('current_market_lineage_complete'),
    monitoring_correction_complete_worlds: count('monitoring_correction_complete'),
    total_counterfactual_unavailable_unit_count: sum('market','counterfactual_unavailable_unit_count'),
    total_omitted_market_count: sum('market','omitted_market_count'),
    total_cross_market_contaminated_unit_count: sum('market','cross_market_contaminated_unit_count'),
    total_capacity_constrained_unit_count: sum('capacity','capacity_constrained_unit_count'),
    total_queued_unit_count: sum('capacity','queued_unit_count'),
    total_rationed_unit_count: sum('capacity','rationed_unit_count'),
    total_capacity_denied_unit_count: sum('capacity','denied_unit_count'),
    total_unmet_need_unit_count: sum('capacity','unmet_need_unit_count'),
    total_price_exposed_unit_count: sum('price','price_exposed_unit_count'),
    total_availability_shifted_unit_count: sum('price','availability_shifted_unit_count'),
    total_affordability_shifted_unit_count: sum('price','affordability_shifted_unit_count'),
    total_demand_shifted_unit_count: sum('price','demand_shifted_unit_count'),
    total_uptake_shifted_unit_count: sum('price','uptake_shifted_unit_count'),
    total_access_limited_unit_count: sum('access','access_limited_unit_count'),
    total_geographic_temporal_excluded_unit_count: sum('access','geographic_temporal_excluded_unit_count'),
    total_language_excluded_unit_count: sum('access','language_excluded_unit_count'),
    total_disability_excluded_unit_count: sum('access','disability_excluded_unit_count'),
    total_digital_excluded_unit_count: sum('access','digital_excluded_unit_count'),
    total_documentation_excluded_unit_count: sum('access','documentation_excluded_unit_count'),
    total_administrative_burden_excluded_unit_count: sum('access','administrative_burden_excluded_unit_count'),
    total_service_denominator_excluded_unit_count: sum('service_denominator','service_denominator_excluded_unit_count'),
    total_unserved_unit_count: sum('service_denominator','unserved_unit_count'),
    total_service_denied_unit_count: sum('service_denominator','denied_unit_count'),
    total_abandoned_unit_count: sum('service_denominator','abandoned_unit_count'),
    total_deferred_unit_count: sum('service_denominator','deferred_unit_count'),
    total_referred_pending_unit_count: sum('service_denominator','referred_pending_unit_count'),
    total_quality_degraded_unit_count: sum('quality','quality_degraded_unit_count'),
    total_version_shifted_unit_count: sum('quality','version_shifted_unit_count'),
    total_provider_mix_selected_unit_count: sum('quality','provider_mix_selected_unit_count'),
    total_cream_skimming_unit_count: sum('quality','cream_skimming_unit_count'),
    total_survivor_only_unit_count: sum('quality','survivor_only_unit_count'),
    total_stale_market_assurance_decision_count: sum('lineage','stale_market_assurance_decision_count'),
    total_unsupported_market_assurance_decisions: sum('governance','unsupported_market_assurance_decision_count'),
    binding_public_authority_worlds: worlds.filter(world => world.governance.binding_public_authority === true).length
  };

  const classification = {
    ...fixture.expected_classification,
    complete_market_service_assurance_supported_in_at_least_one_world: metrics.complete_market_service_assurance_worlds >= 1
  };

  return {
    schema_version: PREFERENCE_MARKET_SERVICE_ASSURANCE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: fixture.status,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    preference_change_present: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false,
    baseline: fixture.baseline,
    worlds,
    metrics,
    classification,
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract
  };
}

export function validatePreferenceMarketServiceAssuranceBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_MARKET_SERVICE_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('market-service assurance build schema mismatch');
  if (compiled?.fixture_id !== 'same-market-service-verified-status-different-operational-states-v1') errors.push('market-service assurance build fixture identity mismatch');
  if (compiled?.issue !== 799 || compiled?.parent_program_issue !== 594) errors.push('market-service assurance build issue lineage mismatch');
  if (compiled?.status !== 'synthetic_control' || compiled?.graph_effect !== 'none') errors.push('market-service assurance build status or graph effect mismatch');
  falseRequired(compiled?.counts_toward_thesis_evidence, 'market-service assurance build counts_toward_thesis_evidence', errors);
  falseRequired(compiled?.conclusion_generated, 'market-service assurance conclusion_generated', errors);
  falseRequired(compiled?.preference_change_present, 'market-service assurance preference_change_present', errors);
  falseRequired(compiled?.manipulative_intent_inferable, 'market-service assurance manipulative_intent_inferable', errors);
  falseRequired(compiled?.real_world_effect_claimed, 'market-service assurance real_world_effect_claimed', errors);
  if (JSON.stringify(canonical(compiled?.baseline)) !== JSON.stringify(canonical(BASELINE))) errors.push('market-service assurance build baseline mismatch');
  if (array(compiled?.worlds).length !== 8) errors.push('market-service assurance build must contain eight worlds');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), WORLD_IDS)) errors.push('market-service assurance build world IDs mismatch');
  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (compiled?.metrics?.[key] !== value) errors.push(`market-service assurance metric ${key} must equal ${value}`);
  for (const key of FALSE_CLASSIFICATIONS) if (compiled?.classification?.[key] !== false) errors.push(`market-service assurance classification ${key} must remain false`);
  if (compiled?.classification?.complete_market_service_assurance_supported_in_at_least_one_world !== true) errors.push('market-service assurance build must preserve one complete path');
  if (!sameMembers(compiled?.refusal_rules, REQUIRED_RULES)) errors.push('market-service assurance build refusal-rule mismatch');
  if (unique(compiled?.prohibited_inferences).length < 16) errors.push('market-service assurance build prohibited-inference ledger is incomplete');
  for (const world of array(compiled?.worlds)) {
    if (world?.public_claim?.public_market_assurance_status !== 'market_service_verified') errors.push(`world ${world?.world_id} public market status drift`);
    if (world?.governance?.binding_public_authority !== false) errors.push(`world ${world?.world_id} binding authority must remain false`);
    if (validatePreferenceMarketServiceAssuranceChain(world?.custody_chain).length) errors.push(`world ${world?.world_id} custody chain invalid`);
    if (world?.custody_chain_head_sha256 !== world?.custody_chain?.at(-1)?.event_sha256) errors.push(`world ${world?.world_id} custody head mismatch`);
  }
  return errors;
}

export function renderPreferenceMarketServiceAssuranceMarkdown(compiled) {
  const lines = [
    '# Preference Custody PC-30: market counterfactual, capacity, price, access, quality, and service-denominator custody',
    '',
    `**Fixture:** ${compiled.fixture_id}`,
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Frozen public surface',
    '',
    `- Operative release: ${compiled.baseline.operative_release_id}@${compiled.baseline.operative_release_version}`,
    `- Declared markets: ${compiled.baseline.declared_markets}`,
    `- Eligible units: ${compiled.baseline.eligible_units}`,
    `- Published service records: ${compiled.baseline.published_service_records}`,
    `- Public market-assurance status: ${compiled.baseline.public_market_assurance_status}`,
    `- Published capacity coverage: ${(compiled.baseline.published_capacity_coverage * 100).toFixed(0)}%`,
    `- Published access coverage: ${(compiled.baseline.published_access_coverage * 100).toFixed(0)}%`,
    `- Published denial rate: ${compiled.baseline.published_denial_rate.toFixed(2)}`,
    `- Published price change: ${compiled.baseline.published_price_change.toFixed(2)}`,
    `- Published quality score: ${compiled.baseline.published_quality_score.toFixed(2)}`,
    '',
    '## Deterministic metrics',
    ''
  ];
  for (const [key, value] of Object.entries(compiled.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Worlds', '');
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '', world.mechanism, '', `- Complete market-service assurance: ${world.flags.complete_market_service_assurance}`, `- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push('## Refusal rules', '');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
