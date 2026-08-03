
import { createHash } from 'node:crypto';

export const PREFERENCE_POPULATION_COVERAGE_TURNOVER_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-population-coverage-turnover-assurance-fixture@1';
export const PREFERENCE_POPULATION_COVERAGE_TURNOVER_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-population-coverage-turnover-assurance-build@1';

const WORLD_IDS = [
  'complete-population-coverage-missingness-boundary-turnover-snapshot-and-current-lineage',
  'hard-to-enumerate-and-transient-populations-omitted',
  'nonresponse-unknown-missingness-and-unvalidated-proxy-enumeration',
  'geographic-service-institutional-external-and-linked-boundary-truncation',
  'entrants-births-and-activations-missing-or-delayed',
  'exits-deaths-and-closures-retained-or-unpropagated',
  'structural-turnover-and-snapshot-period-misalignment',
  'historical-population-coverage-assurance-inherited-after-succession',
];

const FLAG_KEYS = [
  'complete_population_coverage_assurance',
  'hard_to_enumerate_omission_present',
  'missingness_failure_present',
  'boundary_truncation_present',
  'entrant_propagation_failure_present',
  'exit_propagation_failure_present',
  'structural_turnover_snapshot_failure_present',
  'stale_population_coverage_lineage_present',
  'frame_coverage_complete',
  'missingness_classification_complete',
  'boundary_coverage_complete',
  'entrant_exit_propagation_complete',
  'structural_turnover_complete',
  'snapshot_alignment_complete',
  'current_lineage_complete',
  'monitoring_correction_complete',
];

export const EXPECTED_POPULATION_COVERAGE_TURNOVER_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_population_coverage_governance_signatures: 8,
  complete_population_coverage_assurance_worlds: 1,
  hard_to_enumerate_omission_worlds: 1,
  missingness_failure_worlds: 1,
  boundary_truncation_worlds: 1,
  entrant_propagation_failure_worlds: 1,
  exit_propagation_failure_worlds: 1,
  structural_turnover_snapshot_failure_worlds: 1,
  stale_population_coverage_lineage_worlds: 1,
  frame_coverage_complete_worlds: 7,
  missingness_classification_complete_worlds: 7,
  boundary_coverage_complete_worlds: 7,
  entrant_exit_propagation_complete_worlds: 6,
  structural_turnover_complete_worlds: 7,
  snapshot_alignment_complete_worlds: 7,
  current_lineage_complete_worlds: 7,
  monitoring_correction_complete_worlds: 8,
  same_public_population_coverage_surface_worlds: 8,
  total_omitted_population_unit_count: 40,
  total_hard_to_enumerate_omitted_count: 30,
  total_transient_omitted_count: 20,
  total_external_linked_omitted_count: 20,
  total_nonresponse_unit_count: 40,
  total_unknown_missingness_unit_count: 40,
  total_proxy_enumerated_unit_count: 30,
  total_boundary_truncated_unit_count: 40,
  total_missing_entrant_count: 30,
  total_delayed_entrant_propagation_count: 20,
  total_retained_exit_count: 20,
  total_unpropagated_death_closure_count: 15,
  total_migration_merger_split_misclassification_count: 20,
  total_reactivation_seasonal_churn_misclassification_count: 15,
  total_snapshot_misaligned_unit_count: 40,
  total_stale_frame_unit_count: 60,
  total_stale_population_coverage_decision_count: 100,
  total_unsupported_population_coverage_decisions: 700,
  binding_public_authority_worlds: 0,
};

export const FALSE_POPULATION_COVERAGE_TURNOVER_CLASSIFICATIONS = [
  'declared_population_identifies_operational_population_universe',
  'published_enumeration_coverage_identifies_complete_hard_to_enumerate_missingness_and_uncertainty_custody',
  'published_hard_to_enumerate_coverage_identifies_independently_validated_enumeration',
  'absence_of_record_identifies_absence_when_nonresponse_or_unknown_missingness_possible',
  'zero_published_missingness_identifies_zero_true_missingness',
  'proxy_enumeration_identifies_observed_independently_validated_enumeration',
  'analytic_boundary_identifies_operational_population_boundary',
  'current_records_identify_current_turnover_complete_denominator',
  'population_event_identifies_propagated_denominator_correction',
  'current_snapshot_identifies_decision_period_alignment',
  'historical_population_coverage_assurance_identifies_current_assurance',
  'public_population_coverage_verified_status_identifies_complete_current_correctable_authorized_evidence',
  'population_coverage_assurance_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'binding_public_authority_supported',
  'manipulative_intent_inferable',
  'real_world_effect_claimed',
];

const REQUIRED_RULES = [
  "declared_population_units_are_not_the_operational_population_universe",
  "published_enumeration_coverage_is_not_complete_hard_to_enumerate_transient_external_linked_missingness_or_uncertainty_custody",
  "published_hard_to_enumerate_coverage_is_not_independently_validated_enumeration",
  "no_recorded_unit_is_not_an_absent_unit_when_nonresponse_inaccessible_sources_suppression_or_unknown_missingness_remain_possible",
  "zero_published_missingness_is_not_zero_true_missingness",
  "proxy_enumeration_is_not_observed_or_independently_validated_enumeration",
  "analytic_geography_or_service_area_is_not_the_operational_population_boundary",
  "current_records_are_not_a_current_denominator_when_entrant_and_exit_propagation_is_incomplete",
  "population_turnover_event_is_not_denominator_correction_until_propagated_to_every_consequential_system",
  "current_looking_snapshot_is_not_decision_period_alignment",
  "historical_population_coverage_assurance_is_not_current_after_source_boundary_population_turnover_workflow_policy_or_release_succession",
  "public_population_coverage_verified_status_is_not_complete_current_hard_to_enumerate_complete_missingness_classified_boundary_complete_turnover_current_snapshot_aligned_correctable_or_authorized_evidence",
  "population_coverage_assurance_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "population_coverage_claim_requires_frame_hard_to_enumerate_missingness_boundary_turnover_snapshot_lineage_correction_and_authority_custody",
  "binding_public_authority_requires_separate_current_public_authorization_receipts",
  "synthetic_population_counts_are_not_real_world_prevalence_coverage_or_effect_estimates"
];
const BASELINE = {
  "operative_release_id": "RELEASE-INCIDENT-V1",
  "operative_release_version": 1,
  "declared_population_units": 100,
  "public_population_coverage_status": "population_coverage_verified",
  "published_enumeration_coverage": 1,
  "published_hard_to_enumerate_coverage": 1,
  "published_missingness_rate": 0,
  "published_entrant_coverage": 1,
  "published_exit_coverage": 1,
  "published_snapshot_alignment": "current",
  "approved_use": "systemwide_release_policy",
  "reference_frame_version": "POPULATION-COVERAGE-FRAME-V1",
  "reference_boundary_version": "POPULATION-COVERAGE-BOUNDARY-V1",
  "reference_turnover_version": "POPULATION-TURNOVER-V2",
  "reference_snapshot_version": "POPULATION-SNAPSHOT-V1",
  "binding_public_authority": false
};
const PUBLIC_KEYS = [
  "operative_release_id",
  "operative_release_version",
  "declared_population_units",
  "public_population_coverage_status",
  "published_enumeration_coverage",
  "published_hard_to_enumerate_coverage",
  "published_missingness_rate",
  "published_entrant_coverage",
  "published_exit_coverage",
  "published_snapshot_alignment",
  "approved_use"
];
const COUNT_FIELDS = {
  frame_coverage: ['declared_population_count','operational_population_count','enumerated_count','omitted_population_unit_count','hard_to_enumerate_omitted_count','transient_omitted_count','external_linked_omitted_count'],
  missingness: ['nonresponse_unit_count','inaccessible_source_unit_count','unknown_missingness_unit_count','proxy_enumerated_unit_count'],
  boundary_coverage: ['boundary_truncated_unit_count'],
  turnover: ['missing_entrant_count','delayed_entrant_propagation_count','retained_exit_count','unpropagated_death_closure_count','migration_merger_split_misclassification_count','reactivation_seasonal_churn_misclassification_count'],
  snapshot_lineage: ['snapshot_misaligned_unit_count','stale_frame_unit_count','stale_population_coverage_decision_count'],
  governance: ['unsupported_population_coverage_decision_count'],
};

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(value => text(value)).filter(Boolean))];
const sorted = values => [...values].sort((a, b) => String(a).localeCompare(String(b)));
const sameMembers = (a, b) => JSON.stringify(sorted(unique(a))) === JSON.stringify(sorted(unique(b)));
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const requireFalse = (value, label, errors) => { if (value !== false) errors.push(`${label} must remain false`); };

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

const publicClaim = baseline => Object.fromEntries(PUBLIC_KEYS.map(key => [key, baseline[key]]));

function validateCounts(world, errors) {
  for (const [section, fields] of Object.entries(COUNT_FIELDS)) {
    for (const field of fields) {
      const value = world?.[section]?.[field];
      if (!Number.isInteger(value) || value < 0) errors.push(`${section}.${field} must be a non-negative integer`);
    }
  }
}

function deriveFlags(world) {
  const frame = object(world.frame_coverage);
  const missingness = object(world.missingness);
  const boundary = object(world.boundary_coverage);
  const turnover = object(world.turnover);
  const snapshot = object(world.snapshot_lineage);
  const monitoring = object(world.monitoring_correction);

  const frameComplete = ['enumeration_complete','hard_to_enumerate_complete','transient_population_complete','external_linked_population_complete','uncertainty_complete'].every(key => frame[key] === true);
  const missingnessComplete = ['missingness_mechanism_classified','proxy_independent_validation_complete','absent_state_validation_complete','falsification_complete','sensitivity_complete'].every(key => missingness[key] === true);
  const boundaryComplete = ['geography_complete','service_area_complete','institutional_boundary_complete','external_boundary_complete','linked_population_boundary_complete'].every(key => boundary[key] === true);
  const entryExitComplete = turnover.entrant_propagation_complete === true && turnover.exit_propagation_complete === true && turnover.denominator_propagation_complete === true;
  const structuralComplete = turnover.structural_turnover_complete === true;
  const snapshotComplete = snapshot.snapshot_alignment_complete === true && snapshot.snapshot_period === snapshot.decision_period;
  const lineageComplete = snapshot.current_population_coverage_lineage === true && ['frame','boundary','turnover','snapshot'].every(name => snapshot[`approved_${name}_version`] === snapshot[`executed_${name}_version`]);
  const monitoringComplete = ['monitoring_complete','frame_refresh_complete','missingness_drift_complete','boundary_drift_complete','turnover_trigger_complete','snapshot_realignment_complete','rollback_complete','correction_complete','appeal_complete','certificate_withdrawal_complete','durability_complete'].every(key => monitoring[key] === true);

  const flags = {
    hard_to_enumerate_omission_present: frame.omitted_population_unit_count > 0 || frame.hard_to_enumerate_omitted_count > 0 || frame.transient_omitted_count > 0 || frame.external_linked_omitted_count > 0 || !frameComplete,
    missingness_failure_present: missingness.nonresponse_unit_count > 0 || missingness.inaccessible_source_unit_count > 0 || missingness.unknown_missingness_unit_count > 0 || missingness.proxy_enumerated_unit_count > 0 || !missingnessComplete,
    boundary_truncation_present: boundary.boundary_truncated_unit_count > 0 || !boundaryComplete,
    entrant_propagation_failure_present: turnover.missing_entrant_count > 0 || turnover.delayed_entrant_propagation_count > 0 || turnover.entrant_propagation_complete !== true,
    exit_propagation_failure_present: turnover.retained_exit_count > 0 || turnover.unpropagated_death_closure_count > 0 || turnover.exit_propagation_complete !== true,
    structural_turnover_snapshot_failure_present: turnover.migration_merger_split_misclassification_count > 0 || turnover.reactivation_seasonal_churn_misclassification_count > 0 || snapshot.snapshot_misaligned_unit_count > 0 || snapshot.stale_frame_unit_count > 0 || !structuralComplete || !snapshotComplete,
    stale_population_coverage_lineage_present: !lineageComplete || snapshot.stale_population_coverage_decision_count > 0,
    frame_coverage_complete: frameComplete,
    missingness_classification_complete: missingnessComplete,
    boundary_coverage_complete: boundaryComplete,
    entrant_exit_propagation_complete: entryExitComplete,
    structural_turnover_complete: structuralComplete,
    snapshot_alignment_complete: snapshotComplete,
    current_lineage_complete: lineageComplete,
    monitoring_correction_complete: monitoringComplete,
  };
  flags.complete_population_coverage_assurance = ['frame_coverage_complete','missingness_classification_complete','boundary_coverage_complete','entrant_exit_propagation_complete','structural_turnover_complete','snapshot_alignment_complete','current_lineage_complete','monitoring_correction_complete'].every(key => flags[key]);
  return Object.fromEntries(FLAG_KEYS.map(key => [key, flags[key]]));
}

function custodyChain(world, flags) {
  const stages = [
    ['PUBLIC', 'public-surface', world.public_claim],
    ['FRAME', 'frame-coverage', world.frame_coverage],
    ['MISSINGNESS', 'missingness', world.missingness],
    ['BOUNDARY', 'boundary-coverage', world.boundary_coverage],
    ['TURNOVER', 'population-turnover', world.turnover],
    ['SNAPSHOT', 'snapshot-lineage', world.snapshot_lineage],
    ['MONITOR', 'monitoring-correction', world.monitoring_correction],
    ['GOVERNANCE', 'governance', world.governance],
    ['FLAGS', 'classification', flags],
    ['INTERPRETATION', 'interpretation', { mechanism: world.mechanism, graph_effect: 'none' }],
  ];
  let previous = null;
  return stages.map(([suffix, stage, payload], index) => {
    const unsigned = {
      event_id: `${world.world_id}-${suffix}`,
      stage,
      source_event_ids: index ? [`${world.world_id}-${stages[index - 1][0]}`] : [],
      previous_event_sha256: previous,
      payload,
    };
    const event = { ...unsigned, event_sha256: sha256(unsigned) };
    previous = event.event_sha256;
    return event;
  });
}

const publicSignature = world => sha256(world.public_claim);
const governanceSignature = (world, flags) => sha256({
  frame_coverage: world.frame_coverage,
  missingness: world.missingness,
  boundary_coverage: world.boundary_coverage,
  turnover: world.turnover,
  snapshot_lineage: world.snapshot_lineage,
  monitoring_correction: world.monitoring_correction,
  governance: world.governance,
  flags,
});

function materializeWorld(defaults, spec) {
  const merged = deepMerge(defaults, object(spec.overrides));
  const world = {
    world_id: spec.world_id,
    label: spec.label,
    mechanism: spec.mechanism,
    public_claim: canonical(merged.public_claim),
    frame_coverage: canonical(merged.frame_coverage),
    missingness: canonical(merged.missingness),
    boundary_coverage: canonical(merged.boundary_coverage),
    turnover: canonical(merged.turnover),
    snapshot_lineage: canonical(merged.snapshot_lineage),
    monitoring_correction: canonical(merged.monitoring_correction),
    governance: canonical(merged.governance),
  };
  const flags = deriveFlags(world);
  const chain = custodyChain(world, flags);
  return {
    ...world,
    flags,
    public_status_signature: publicSignature(world),
    governance_signature: governanceSignature(world, flags),
    custody_chain: chain,
    custody_chain_head_sha256: chain.at(-1).event_sha256,
  };
}

function calculateMetrics(worlds) {
  const sum = path => worlds.reduce((total, world) => total + path.split('.').reduce((value, key) => value?.[key], world), 0);
  const count = flag => worlds.filter(world => world.flags[flag]).length;
  return {
    world_count: worlds.length,
    distinct_public_status_signatures: new Set(worlds.map(world => world.public_status_signature)).size,
    distinct_population_coverage_governance_signatures: new Set(worlds.map(world => world.governance_signature)).size,
    complete_population_coverage_assurance_worlds: count('complete_population_coverage_assurance'),
    hard_to_enumerate_omission_worlds: count('hard_to_enumerate_omission_present'),
    missingness_failure_worlds: count('missingness_failure_present'),
    boundary_truncation_worlds: count('boundary_truncation_present'),
    entrant_propagation_failure_worlds: count('entrant_propagation_failure_present'),
    exit_propagation_failure_worlds: count('exit_propagation_failure_present'),
    structural_turnover_snapshot_failure_worlds: count('structural_turnover_snapshot_failure_present'),
    stale_population_coverage_lineage_worlds: count('stale_population_coverage_lineage_present'),
    frame_coverage_complete_worlds: count('frame_coverage_complete'),
    missingness_classification_complete_worlds: count('missingness_classification_complete'),
    boundary_coverage_complete_worlds: count('boundary_coverage_complete'),
    entrant_exit_propagation_complete_worlds: count('entrant_exit_propagation_complete'),
    structural_turnover_complete_worlds: count('structural_turnover_complete'),
    snapshot_alignment_complete_worlds: count('snapshot_alignment_complete'),
    current_lineage_complete_worlds: count('current_lineage_complete'),
    monitoring_correction_complete_worlds: count('monitoring_correction_complete'),
    same_public_population_coverage_surface_worlds: worlds.filter(world => world.public_status_signature === worlds[0].public_status_signature).length,
    total_omitted_population_unit_count: sum('frame_coverage.omitted_population_unit_count'),
    total_hard_to_enumerate_omitted_count: sum('frame_coverage.hard_to_enumerate_omitted_count'),
    total_transient_omitted_count: sum('frame_coverage.transient_omitted_count'),
    total_external_linked_omitted_count: sum('frame_coverage.external_linked_omitted_count'),
    total_nonresponse_unit_count: sum('missingness.nonresponse_unit_count'),
    total_unknown_missingness_unit_count: sum('missingness.unknown_missingness_unit_count'),
    total_proxy_enumerated_unit_count: sum('missingness.proxy_enumerated_unit_count'),
    total_boundary_truncated_unit_count: sum('boundary_coverage.boundary_truncated_unit_count'),
    total_missing_entrant_count: sum('turnover.missing_entrant_count'),
    total_delayed_entrant_propagation_count: sum('turnover.delayed_entrant_propagation_count'),
    total_retained_exit_count: sum('turnover.retained_exit_count'),
    total_unpropagated_death_closure_count: sum('turnover.unpropagated_death_closure_count'),
    total_migration_merger_split_misclassification_count: sum('turnover.migration_merger_split_misclassification_count'),
    total_reactivation_seasonal_churn_misclassification_count: sum('turnover.reactivation_seasonal_churn_misclassification_count'),
    total_snapshot_misaligned_unit_count: sum('snapshot_lineage.snapshot_misaligned_unit_count'),
    total_stale_frame_unit_count: sum('snapshot_lineage.stale_frame_unit_count'),
    total_stale_population_coverage_decision_count: sum('snapshot_lineage.stale_population_coverage_decision_count'),
    total_unsupported_population_coverage_decisions: sum('governance.unsupported_population_coverage_decision_count'),
    binding_public_authority_worlds: worlds.filter(world => world.governance.binding_public_authority === true).length,
  };
}

function validateChain(world, errors) {
  const events = array(world?.custody_chain);
  if (events.length !== 10) errors.push(`${world?.world_id ?? 'world'} custody chain must contain ten events`);
  let previous = null;
  const seen = new Set();
  for (const event of events) {
    if (event.previous_event_sha256 !== previous) errors.push(`${world.world_id} custody previous hash mismatch`);
    for (const source of array(event.source_event_ids)) if (!seen.has(source)) errors.push(`${world.world_id} custody source missing`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event.event_sha256 !== sha256(unsigned)) errors.push(`${world.world_id} custody event hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (previous !== world?.custody_chain_head_sha256) errors.push(`${world?.world_id ?? 'world'} custody head mismatch`);
}

export function validatePreferencePopulationCoverageTurnoverAssuranceFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_POPULATION_COVERAGE_TURNOVER_ASSURANCE_FIXTURE_SCHEMA_VERSION) errors.push('fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-population-coverage-verified-status-different-operational-states-v1') errors.push('fixture_id mismatch');
  if (fixture?.issue !== 850 || fixture?.parent_program_issue !== 594) errors.push('issue custody mismatch');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status mismatch');
  if (fixture?.graph_effect !== 'none') errors.push('graph effect must remain none');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'thesis evidence', errors);
  if (JSON.stringify(canonical(fixture?.baseline)) !== JSON.stringify(canonical(BASELINE))) errors.push('baseline mismatch');
  if (!sameMembers(fixture?.required_refusal_rules, REQUIRED_RULES)) errors.push('required refusal-rule denominator mismatch');
  for (const key of FALSE_POPULATION_COVERAGE_TURNOVER_CLASSIFICATIONS) requireFalse(fixture?.expected_classification?.[key], `expected_classification.${key}`, errors);
  if (fixture?.expected_classification?.complete_population_coverage_assurance_supported_in_at_least_one_world !== true) errors.push('complete assurance support must remain true');
  if (array(fixture?.prohibited_inferences).length < 12) errors.push('prohibited inferences incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract incomplete');
  const specs = array(fixture?.worlds);
  if (specs.length !== WORLD_IDS.length || specs.some((spec, index) => spec.world_id !== WORLD_IDS[index])) errors.push('world denominator or order mismatch');
  for (const spec of specs) {
    if (!text(spec.label) || !text(spec.mechanism)) errors.push(`${spec.world_id} label or mechanism missing`);
    const world = materializeWorld(fixture.world_defaults, spec);
    validateCounts(world, errors);
    if (JSON.stringify(canonical(world.public_claim)) !== JSON.stringify(canonical(publicClaim(fixture.baseline)))) errors.push(`${spec.world_id} public claim mismatch`);
    if (JSON.stringify(canonical(spec.expected_flags)) !== JSON.stringify(canonical(world.flags))) errors.push(`${spec.world_id} expected flags mismatch`);
  }
  return errors;
}

export function compilePreferencePopulationCoverageTurnoverAssuranceFixture(fixture) {
  const errors = validatePreferencePopulationCoverageTurnoverAssuranceFixture(fixture);
  if (errors.length) throw new Error(`invalid population-coverage fixture:\n- ${errors.join('\n- ')}`);
  const worlds = fixture.worlds.map(spec => materializeWorld(fixture.world_defaults, spec));
  return {
    schema_version: PREFERENCE_POPULATION_COVERAGE_TURNOVER_ASSURANCE_BUILD_SCHEMA_VERSION,
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
    outside_human_dependency: false,
    baseline: fixture.baseline,
    worlds,
    metrics: calculateMetrics(worlds),
    classification: fixture.expected_classification,
    refusal_rules: fixture.required_refusal_rules,
    prohibited_inferences: fixture.prohibited_inferences,
    interpretation_contract: fixture.interpretation_contract,
  };
}

export function validatePreferencePopulationCoverageTurnoverAssuranceBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_POPULATION_COVERAGE_TURNOVER_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('compiled schema mismatch');
  if (compiled?.fixture_id !== 'same-population-coverage-verified-status-different-operational-states-v1') errors.push('compiled fixture_id mismatch');
  if (compiled?.issue !== 850 || compiled?.parent_program_issue !== 594) errors.push('compiled issue custody mismatch');
  if (compiled?.status !== 'synthetic_control') errors.push('compiled status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled graph effect mismatch');
  for (const [key, label] of [['counts_toward_thesis_evidence','thesis evidence'],['conclusion_generated','conclusion'],['preference_change_present','preference change'],['manipulative_intent_inferable','intent inference'],['real_world_effect_claimed','real-world effect'],['outside_human_dependency','outside-human dependency']]) requireFalse(compiled?.[key], `compiled ${label}`, errors);
  if (JSON.stringify(canonical(compiled?.baseline)) !== JSON.stringify(canonical(BASELINE))) errors.push('compiled baseline mismatch');
  const worlds = array(compiled?.worlds);
  if (worlds.length !== WORLD_IDS.length || worlds.some((world, index) => world.world_id !== WORLD_IDS[index])) errors.push('compiled world denominator or order mismatch');
  for (const world of worlds) {
    validateCounts(world, errors);
    const flags = deriveFlags(world);
    if (JSON.stringify(canonical(world.flags)) !== JSON.stringify(canonical(flags))) errors.push(`${world.world_id} compiled flags mismatch`);
    if (world.public_status_signature !== publicSignature(world)) errors.push(`${world.world_id} public signature mismatch`);
    if (world.governance_signature !== governanceSignature(world, flags)) errors.push(`${world.world_id} governance signature mismatch`);
    validateChain(world, errors);
  }
  const metrics = worlds.length ? calculateMetrics(worlds) : {};
  if (JSON.stringify(canonical(compiled?.metrics)) !== JSON.stringify(canonical(metrics))) errors.push('compiled metrics do not reconstruct');
  for (const [key, value] of Object.entries(EXPECTED_POPULATION_COVERAGE_TURNOVER_METRICS)) if (compiled?.metrics?.[key] !== value) errors.push(`compiled metric mismatch: ${key}`);
  for (const key of FALSE_POPULATION_COVERAGE_TURNOVER_CLASSIFICATIONS) requireFalse(compiled?.classification?.[key], `compiled classification.${key}`, errors);
  if (compiled?.classification?.complete_population_coverage_assurance_supported_in_at_least_one_world !== true) errors.push('compiled complete-assurance support missing');
  if (!sameMembers(compiled?.refusal_rules, REQUIRED_RULES)) errors.push('compiled refusal-rule denominator mismatch');
  if (array(compiled?.prohibited_inferences).length < 12) errors.push('compiled prohibited inferences incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled caveat missing');
  return errors;
}

export function renderPreferencePopulationCoverageTurnoverAssuranceMarkdown(compiled) {
  const lines = [
    '# Preference Custody PC-36: population-coverage and turnover assurance',
    '',
    `**Worlds:** ${compiled.metrics.world_count}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    `> ${compiled.interpretation_contract.copy_ready_caveat}`,
    '',
    '## Deterministic metrics',
    '',
  ];
  for (const [key, value] of Object.entries(compiled.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Worlds', '');
  for (const world of compiled.worlds) lines.push(`- **${world.label}** — ${world.mechanism}`);
  return `${lines.join('\n')}\n`;
}
