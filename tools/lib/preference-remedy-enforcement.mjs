import { createHash } from 'node:crypto';

export const PREFERENCE_REMEDY_ENFORCEMENT_FIXTURE_SCHEMA_VERSION = 'preference-remedy-enforcement-fixture@1';
export const PREFERENCE_REMEDY_ENFORCEMENT_BUILD_SCHEMA_VERSION = 'preference-remedy-enforcement-build@1';

const EXPECTED_WORLD_IDS = [
  'customer-indemnity-no-affected-pass-through',
  'final-judgment-stayed-pending-appeal',
  'individual-arbitration-fragmented-low-takeup',
  'nonmonetary-correction-complete-compensation-uncollected',
  'provisional-public-fund-payment-clawback-risk',
  'segregated-escrow-collective-paid-successor-guarantee',
  'successor-exclusion-original-obligor-dissolved',
  'unsecured-settlement-insolvency-fractional-recovery'
];
const EXPECTED_FLAG_KEYS = [
  'appeal_stay_present',
  'claim_fragmentation_present',
  'clawback_risk_present',
  'complete_durable_collective_remedy',
  'full_durable_compensation_present',
  'full_gross_affected_payment_present',
  'full_gross_payment_present',
  'insolvency_priority_gap_present',
  'nonmonetary_only_present',
  'pass_through_failure_present',
  'successor_liability_gap_present',
  'zero_durable_compensation'
];
const EXPECTED_METRICS = {
  world_count: 8,
  distinct_enforcement_signatures: 8,
  distinct_public_status_signatures: 1,
  complete_durable_collective_remedy_worlds: 1,
  appeal_stay_worlds: 1,
  insolvency_priority_gap_worlds: 2,
  pass_through_failure_worlds: 1,
  claim_fragmentation_worlds: 1,
  successor_liability_gap_worlds: 2,
  clawback_risk_worlds: 1,
  nonmonetary_only_worlds: 1,
  full_gross_payment_worlds: 3,
  full_gross_affected_payment_worlds: 2,
  full_durable_compensation_worlds: 1,
  zero_durable_compensation_worlds: 5,
  collective_standing_worlds: 7,
  total_gross_paid: 6600,
  total_gross_paid_to_affected_people: 4600,
  total_durable_compensation_paid: 2600,
  total_unpaid_durable_obligation: 13400,
  maximum_enforcement_delay_days: 365,
  binding_public_authority_worlds: 0
};
const EXPECTED_CLASSIFICATION = {
  judgment_or_settlement_identifies_collected_remedy: false,
  appeal_right_identifies_unstayed_enforcement: false,
  escrow_announcement_identifies_funded_segregated_account: false,
  intermediary_payment_identifies_affected_party_payment: false,
  nominal_collective_eligibility_identifies_usable_collective_standing: false,
  individual_claim_route_identifies_population_remedy: false,
  gross_provisional_payment_identifies_durable_compensation: false,
  insolvency_claim_identifies_priority_or_recovery: false,
  technical_correction_identifies_monetary_restoration: false,
  successor_acquisition_identifies_liability_assumption: false,
  public_remedied_status_identifies_completed_durable_remedy: false,
  uncollected_award_establishes_breach_misconduct_or_intent: false,
  complete_durable_collective_remedy_supported_in_at_least_one_world: true,
  binding_public_authority_supported: false,
  manipulative_intent_inferable: false,
  real_world_effect_claimed: false
};
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

function sum(values) {
  return array(values).reduce((total, value) => total + Number(value), 0);
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

function nonNegativeNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function requireFalse(value, label, errors) {
  if (value !== false) errors.push(`${label} must remain false`);
}

function validateExactObjectKeys(value, expectedKeys, label, errors) {
  if (!sameMembers(Object.keys(object(value)), expectedKeys)) errors.push(`${label} must contain exactly ${expectedKeys.join(', ')}`);
}

function validateWorld(world, baseline, errors) {
  const worldId = text(world?.world_id) || '(missing world ID)';
  const standing = object(world?.standing);
  const instrument = object(world?.instrument);
  const security = object(world?.security);
  const payment = object(world?.payment);
  const insolvency = object(world?.insolvency);
  const succession = object(world?.succession);
  const enforcement = object(world?.enforcement);
  const residual = object(world?.residual);
  const flags = object(world?.expected_flags);

  if (!text(world?.mechanism)) errors.push(`world ${worldId} mechanism is required`);
  for (const key of ['representative_route','individual_route']) if (!text(standing[key])) errors.push(`world ${worldId} standing.${key} is required`);
  for (const key of ['collective_standing','assignment_allowed']) if (typeof standing[key] !== 'boolean') errors.push(`world ${worldId} standing.${key} must be boolean`);
  if (standing.eligible_claimants !== baseline.eligible_affected_people) errors.push(`world ${worldId} must preserve the eligible claimant population`);
  if (!nonNegativeInteger(standing.participating_claimants) || standing.participating_claimants > standing.eligible_claimants) errors.push(`world ${worldId} participating_claimants is invalid`);

  for (const key of ['instrument_type','finality_state']) if (!text(instrument[key])) errors.push(`world ${worldId} instrument.${key} is required`);
  if (!close(instrument.nominal_amount, baseline.nominal_compensation_obligation)) errors.push(`world ${worldId} nominal amount must remain ${baseline.nominal_compensation_obligation}`);
  for (const key of ['appeal_pending','enforcement_stayed','nonmonetary_correction_complete']) if (typeof instrument[key] !== 'boolean') errors.push(`world ${worldId} instrument.${key} must be boolean`);
  if (!nonNegativeNumber(instrument.bond_posted_amount)) errors.push(`world ${worldId} bond_posted_amount must be non-negative`);
  if (instrument.nonmonetary_correction_complete !== true) errors.push(`world ${worldId} must preserve complete nonmonetary correction`);
  if (instrument.enforcement_stayed && !instrument.appeal_pending && insolvency.estate_state === 'not_in_insolvency') errors.push(`world ${worldId} non-insolvency stay requires a pending appeal`);

  for (const key of ['escrow_state','lien_or_security_state','priority_class']) if (!text(security[key])) errors.push(`world ${worldId} security.${key} is required`);
  if (!nonNegativeNumber(security.escrow_funded_amount)) errors.push(`world ${worldId} escrow_funded_amount must be non-negative`);
  if (typeof security.segregated_for_affected_people !== 'boolean') errors.push(`world ${worldId} segregated_for_affected_people must be boolean`);
  if (security.segregated_for_affected_people && security.escrow_funded_amount <= 0) errors.push(`world ${worldId} segregated account must preserve positive funding`);

  for (const key of ['gross_paid','paid_to_affected_people','durable_compensation_paid']) if (!nonNegativeNumber(payment[key])) errors.push(`world ${worldId} payment.${key} must be non-negative`);
  if (payment.paid_to_affected_people > payment.gross_paid) errors.push(`world ${worldId} affected-person payment cannot exceed gross payment`);
  if (payment.durable_compensation_paid > payment.paid_to_affected_people) errors.push(`world ${worldId} durable compensation cannot exceed affected-person payment`);
  for (const key of ['pass_through_complete','provisional','clawback_or_recoupment_risk']) if (typeof payment[key] !== 'boolean') errors.push(`world ${worldId} payment.${key} must be boolean`);
  if (payment.clawback_or_recoupment_risk && !payment.provisional) errors.push(`world ${worldId} clawback risk must remain provisional`);
  if (payment.gross_paid > 0 && !text(payment.payment_receipt_id)) errors.push(`world ${worldId} positive gross payment requires a receipt`);
  if (payment.gross_paid === 0 && payment.payment_receipt_id !== null) errors.push(`world ${worldId} zero gross payment requires a null payment receipt`);
  if (payment.pass_through_complete && !close(payment.gross_paid, payment.paid_to_affected_people)) errors.push(`world ${worldId} complete pass-through must reconcile gross and affected-person payment`);

  for (const key of ['estate_state','estate_claim_state','priority_state','discharge_state']) if (!text(insolvency[key])) errors.push(`world ${worldId} insolvency.${key} is required`);
  if (!nonNegativeNumber(insolvency.distribution_paid)) errors.push(`world ${worldId} insolvency distribution must be non-negative`);
  if (insolvency.distribution_paid > payment.gross_paid) errors.push(`world ${worldId} insolvency distribution cannot exceed gross payment`);

  for (const key of ['organization_state','successor_guarantee_state','assignment_state']) if (!text(succession[key])) errors.push(`world ${worldId} succession.${key} is required`);
  for (const key of ['original_obligor_active','successor_assumed_liability']) if (typeof succession[key] !== 'boolean') errors.push(`world ${worldId} succession.${key} must be boolean`);

  for (const key of ['notice_state','filing_burden','enforcement_route','monitoring_state','reopen_state']) if (!text(enforcement[key])) errors.push(`world ${worldId} enforcement.${key} is required`);
  if (!nonNegativeInteger(enforcement.take_up_count) || enforcement.take_up_count !== standing.participating_claimants) errors.push(`world ${worldId} take-up count must match participating claimants`);
  if (!nonNegativeInteger(enforcement.delay_days)) errors.push(`world ${worldId} delay_days must be a non-negative integer`);

  if (!nonNegativeNumber(residual.unpaid_durable_obligation)) errors.push(`world ${worldId} unpaid_durable_obligation must be non-negative`);
  for (const key of ['residual_uncertainty','remedy_durable']) if (typeof residual[key] !== 'boolean') errors.push(`world ${worldId} residual.${key} must be boolean`);
  if (!close(residual.unpaid_durable_obligation, baseline.nominal_compensation_obligation - payment.durable_compensation_paid)) errors.push(`world ${worldId} unpaid durable obligation does not reconcile`);
  if (residual.remedy_durable && residual.unpaid_durable_obligation > 0) errors.push(`world ${worldId} durable remedy cannot preserve an unpaid durable obligation`);

  validateExactObjectKeys(flags, EXPECTED_FLAG_KEYS, `world ${worldId} expected_flags`, errors);
  for (const key of EXPECTED_FLAG_KEYS) if (typeof flags[key] !== 'boolean') errors.push(`world ${worldId} expected_flags.${key} must be boolean`);
}

export function validatePreferenceRemedyEnforcementFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const worlds = array(fixture?.worlds);

  if (fixture?.schema_version !== PREFERENCE_REMEDY_ENFORCEMENT_FIXTURE_SCHEMA_VERSION) errors.push('preference remedy-enforcement fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'fixture counts_toward_thesis_evidence', errors);

  if (!text(baseline.incident_id)) errors.push('baseline incident_id is required');
  if (baseline.technical_correction_state !== 'complete') errors.push('baseline technical correction must remain complete');
  if (baseline.final_proposal_id !== 'A1') errors.push('baseline final proposal must remain A1');
  if (baseline.public_incident_status !== 'remedied') errors.push('baseline public status must remain remedied');
  if (baseline.eligible_affected_people !== 100) errors.push('baseline eligible affected people must remain 100');
  if (baseline.nominal_compensation_obligation !== 2000) errors.push('baseline nominal obligation must remain 2000');
  if (!text(baseline.currency)) errors.push('baseline currency is required');
  if (baseline.nonmonetary_correction_obligation !== 'complete') errors.push('baseline nonmonetary correction must remain complete');
  requireFalse(baseline.binding_public_authority, 'baseline binding_public_authority', errors);

  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the eight required remedy-enforcement worlds');
  if (unique(worlds.map(world => text(world?.world_id))).length !== worlds.length) errors.push('world IDs must be unique');
  for (const world of worlds) validateWorld(world, baseline, errors);

  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (fixture?.expected_metrics?.[key] !== value) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const [key, value] of Object.entries(EXPECTED_CLASSIFICATION)) if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);

  const requiredRules = [
    'judgment_or_settlement_is_not_collected_remedy',
    'appeal_right_is_not_unstayed_enforcement',
    'escrow_announcement_is_not_funded_segregated_account',
    'payment_to_intermediary_is_not_payment_to_affected_people',
    'nominal_collective_eligibility_is_not_usable_collective_standing',
    'individual_claim_route_is_not_complete_population_remedy',
    'gross_provisional_payment_is_not_durable_compensation',
    'insolvency_claim_is_not_priority_or_recovery',
    'technical_correction_is_not_monetary_restoration',
    'successor_acquisition_is_not_successor_liability_assumption',
    'public_remedied_status_is_not_completed_durable_remedy',
    'uncollected_award_is_not_proof_of_breach_misconduct_or_intent',
    'remedy_enforcement_claim_requires_eligibility_collective_standing_finality_stay_escrow_security_payment_pass_through_takeup_insolvency_priority_successor_clawback_monitoring_residual_and_authority_custody'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of requiredRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 10) errors.push('prohibited-inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id)
      || !text(fixture?.interpretation_contract?.what_this_is)
      || !text(fixture?.interpretation_contract?.what_this_is_not)
      || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract is incomplete');
  return errors;
}

export function simulatePreferenceRemedyEnforcementWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const standing = object(world.standing);
  const instrument = object(world.instrument);
  const security = object(world.security);
  const payment = object(world.payment);
  const insolvency = object(world.insolvency);
  const succession = object(world.succession);
  const enforcement = object(world.enforcement);
  const residual = object(world.residual);

  const appealStayPresent = instrument.appeal_pending === true && instrument.enforcement_stayed === true;
  const insolvencyPriorityGapPresent = ['chapter_reorganization','dissolution_complete'].includes(insolvency.estate_state)
    && !['protected_outside_estate','secured_priority'].includes(insolvency.priority_state);
  const passThroughFailurePresent = payment.gross_paid > payment.paid_to_affected_people
    && Boolean(payment.intermediary)
    && payment.pass_through_complete === false;
  const claimFragmentationPresent = standing.collective_standing === false
    && standing.participating_claimants < standing.eligible_claimants;
  const successorLiabilityGapPresent = succession.original_obligor_active === false
    && succession.successor_assumed_liability === false;
  const clawbackRiskPresent = payment.clawback_or_recoupment_risk === true;
  const nonmonetaryOnlyPresent = instrument.nonmonetary_correction_complete === true
    && payment.gross_paid === 0
    && payment.durable_compensation_paid === 0
    && text(instrument.instrument_type).includes('injunction');
  const fullGrossPaymentPresent = close(payment.gross_paid, baseline.nominal_compensation_obligation);
  const fullGrossAffectedPaymentPresent = close(payment.paid_to_affected_people, baseline.nominal_compensation_obligation);
  const fullDurableCompensationPresent = close(payment.durable_compensation_paid, baseline.nominal_compensation_obligation);
  const zeroDurableCompensation = close(payment.durable_compensation_paid, 0);
  const completeDurableCollectiveRemedy = standing.collective_standing === true
    && standing.participating_claimants === baseline.eligible_affected_people
    && instrument.finality_state === 'final_enforceable'
    && instrument.appeal_pending === false
    && instrument.enforcement_stayed === false
    && security.escrow_state === 'funded_segregated'
    && close(security.escrow_funded_amount, baseline.nominal_compensation_obligation)
    && security.segregated_for_affected_people === true
    && fullGrossPaymentPresent
    && fullGrossAffectedPaymentPresent
    && fullDurableCompensationPresent
    && payment.pass_through_complete === true
    && payment.provisional === false
    && payment.clawback_or_recoupment_risk === false
    && succession.successor_assumed_liability === true
    && succession.successor_guarantee_state === 'binding'
    && residual.unpaid_durable_obligation === 0
    && residual.remedy_durable === true
    && instrument.nonmonetary_correction_complete === true;

  const flags = {
    complete_durable_collective_remedy: completeDurableCollectiveRemedy,
    appeal_stay_present: appealStayPresent,
    insolvency_priority_gap_present: insolvencyPriorityGapPresent,
    pass_through_failure_present: passThroughFailurePresent,
    claim_fragmentation_present: claimFragmentationPresent,
    successor_liability_gap_present: successorLiabilityGapPresent,
    clawback_risk_present: clawbackRiskPresent,
    nonmonetary_only_present: nonmonetaryOnlyPresent,
    full_gross_payment_present: fullGrossPaymentPresent,
    full_gross_affected_payment_present: fullGrossAffectedPaymentPresent,
    full_durable_compensation_present: fullDurableCompensationPresent,
    zero_durable_compensation: zeroDurableCompensation
  };
  const enforcementState = { standing, instrument, security, payment, insolvency, succession, enforcement, residual, flags };
  const publicStatusState = {
    incident_id: baseline.incident_id,
    technical_correction_state: baseline.technical_correction_state,
    final_proposal_id: baseline.final_proposal_id,
    public_incident_status: baseline.public_incident_status,
    eligible_affected_people: baseline.eligible_affected_people,
    nominal_compensation_obligation: baseline.nominal_compensation_obligation,
    nonmonetary_correction_obligation: baseline.nonmonetary_correction_obligation
  };

  return {
    world_id: world.world_id,
    mechanism: world.mechanism,
    standing,
    instrument,
    security,
    payment,
    insolvency,
    succession,
    enforcement,
    residual,
    flags,
    public_status_state: publicStatusState,
    enforcement_signature_sha256: sha256(enforcementState),
    public_status_signature_sha256: sha256(publicStatusState)
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildRemedyEnforcementChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${result.world_id}:baseline`,
    event_type: 'incident_correction_claimant_and_nominal_remedy_snapshot',
    evidence_class: 'synthetic_control_truth',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: fixture.baseline
  });
  push({
    event_id: `${result.world_id}:standing-instrument`,
    event_type: 'collective_standing_finality_appeal_and_stay_state',
    evidence_class: 'synthetic_control_remedy_state',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:baseline`],
    payload: { standing: result.standing, instrument: result.instrument }
  });
  push({
    event_id: `${result.world_id}:security-payment`,
    event_type: 'escrow_security_gross_payment_pass_through_and_durability_state',
    evidence_class: 'synthetic_control_payment_state',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:standing-instrument`],
    payload: { security: result.security, payment: result.payment }
  });
  push({
    event_id: `${result.world_id}:insolvency-succession`,
    event_type: 'insolvency_priority_distribution_discharge_and_successor_state',
    evidence_class: 'synthetic_control_succession_state',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:security-payment`],
    payload: { insolvency: result.insolvency, succession: result.succession }
  });
  push({
    event_id: `${result.world_id}:enforcement`,
    event_type: 'notice_takeup_delay_monitoring_reopen_and_residual_state',
    evidence_class: 'synthetic_control_enforcement_state',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:insolvency-succession`],
    payload: { enforcement: result.enforcement, residual: result.residual }
  });
  push({
    event_id: `${result.world_id}:classification`,
    event_type: 'remedy_enforcement_mechanism_classified',
    evidence_class: 'deterministic_control_classification',
    authority: 'remedy_enforcement_compiler',
    source_event_ids: [`${result.world_id}:enforcement`],
    payload: { mechanism: result.mechanism, flags: result.flags }
  });
  push({
    event_id: `${result.world_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'remedy_enforcement_analyst',
    source_event_ids: [`${result.world_id}:classification`],
    payload: {
      allowed_interpretation: 'synthetic standing, security, collection, insolvency, succession, and durable-remedy state beneath one public remedied status',
      refused_promotions: [
        'judgment_or_settlement_as_collected_remedy',
        'appeal_as_unstayed_enforcement',
        'escrow_announcement_as_funded_segregated_account',
        'intermediary_payment_as_affected_party_payment',
        'individual_route_as_population_remedy',
        'gross_provisional_payment_as_durable_compensation',
        'insolvency_claim_as_priority_or_recovery',
        'technical_correction_as_monetary_restoration',
        'successor_transaction_as_liability_assumption',
        'unpaid_obligation_as_breach_misconduct_or_intent'
      ]
    }
  });
  return events;
}

export function validatePreferenceRemedyEnforcementChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('remedy-enforcement event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate remedy-enforcement event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`remedy-enforcement event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`remedy-enforcement event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`remedy-enforcement event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceRemedyEnforcementFixture(fixture) {
  const errors = validatePreferenceRemedyEnforcementFixture(fixture);
  if (errors.length) throw new Error(`invalid preference remedy-enforcement fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceRemedyEnforcementWorld(fixture, world);
    for (const key of EXPECTED_FLAG_KEYS) {
      if (result.flags[key] !== world.expected_flags[key]) throw new Error(`world ${world.world_id} ${key} mismatch`);
    }
    const chain = buildRemedyEnforcementChain(fixture, result);
    return { ...result, custody_chain: chain, custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null };
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));

  const countFlag = flag => worlds.filter(world => world.flags[flag] === true).length;
  const metrics = {
    world_count: worlds.length,
    distinct_enforcement_signatures: unique(worlds.map(world => world.enforcement_signature_sha256)).length,
    distinct_public_status_signatures: unique(worlds.map(world => world.public_status_signature_sha256)).length,
    complete_durable_collective_remedy_worlds: countFlag('complete_durable_collective_remedy'),
    appeal_stay_worlds: countFlag('appeal_stay_present'),
    insolvency_priority_gap_worlds: countFlag('insolvency_priority_gap_present'),
    pass_through_failure_worlds: countFlag('pass_through_failure_present'),
    claim_fragmentation_worlds: countFlag('claim_fragmentation_present'),
    successor_liability_gap_worlds: countFlag('successor_liability_gap_present'),
    clawback_risk_worlds: countFlag('clawback_risk_present'),
    nonmonetary_only_worlds: countFlag('nonmonetary_only_present'),
    full_gross_payment_worlds: countFlag('full_gross_payment_present'),
    full_gross_affected_payment_worlds: countFlag('full_gross_affected_payment_present'),
    full_durable_compensation_worlds: countFlag('full_durable_compensation_present'),
    zero_durable_compensation_worlds: countFlag('zero_durable_compensation'),
    collective_standing_worlds: worlds.filter(world => world.standing.collective_standing === true).length,
    total_gross_paid: sum(worlds.map(world => world.payment.gross_paid)),
    total_gross_paid_to_affected_people: sum(worlds.map(world => world.payment.paid_to_affected_people)),
    total_durable_compensation_paid: sum(worlds.map(world => world.payment.durable_compensation_paid)),
    total_unpaid_durable_obligation: sum(worlds.map(world => world.residual.unpaid_durable_obligation)),
    maximum_enforcement_delay_days: Math.max(...worlds.map(world => world.enforcement.delay_days)),
    binding_public_authority_worlds: 0
  };
  for (const [key, value] of Object.entries(EXPECTED_METRICS)) {
    if (!close(metrics[key], value)) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);
  }

  return {
    schema_version: PREFERENCE_REMEDY_ENFORCEMENT_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'remedy_enforcement_equifinality_qualified',
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

export function validatePreferenceRemedyEnforcementBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_REMEDY_ENFORCEMENT_BUILD_SCHEMA_VERSION) errors.push('preference remedy-enforcement build schema mismatch');
  if (compiled?.status !== 'remedy_enforcement_equifinality_qualified') errors.push('compiled remedy-enforcement status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled remedy-enforcement graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled remedy-enforcement counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled remedy-enforcement conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled remedy-enforcement real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), EXPECTED_WORLD_IDS)) errors.push('compiled remedy-enforcement worlds are incomplete');

  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (!close(compiled?.metrics?.[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const [key, value] of Object.entries(EXPECTED_CLASSIFICATION)) if (compiled?.classification?.[key] !== value) errors.push(`compiled classification.${key} must equal ${JSON.stringify(value)}`);
  requireFalse(compiled?.classification?.preference_change_present, 'compiled preference_change_present', errors);

  for (const world of array(compiled?.worlds)) {
    validateExactObjectKeys(world?.flags, EXPECTED_FLAG_KEYS, `compiled world ${world?.world_id} flags`, errors);
    if (!/^[0-9a-f]{64}$/.test(text(world?.enforcement_signature_sha256))) errors.push(`world ${world?.world_id} enforcement signature is invalid`);
    if (!/^[0-9a-f]{64}$/.test(text(world?.public_status_signature_sha256))) errors.push(`world ${world?.world_id} public-status signature is invalid`);
    errors.push(...validatePreferenceRemedyEnforcementChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
  }

  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  const complete = byId['segregated-escrow-collective-paid-successor-guarantee'];
  if (complete?.flags?.complete_durable_collective_remedy !== true || complete?.payment?.durable_compensation_paid !== 2000) errors.push('complete world must preserve durable collective payment');
  if (byId['final-judgment-stayed-pending-appeal']?.flags?.appeal_stay_present !== true) errors.push('appeal world must preserve a stayed judgment');
  if (byId['unsecured-settlement-insolvency-fractional-recovery']?.flags?.insolvency_priority_gap_present !== true) errors.push('insolvency world must preserve low-priority fractional recovery');
  if (byId['customer-indemnity-no-affected-pass-through']?.flags?.pass_through_failure_present !== true) errors.push('pass-through world must preserve intermediary-payment failure');
  if (byId['individual-arbitration-fragmented-low-takeup']?.flags?.claim_fragmentation_present !== true) errors.push('fragmentation world must preserve low take-up');
  if (byId['successor-exclusion-original-obligor-dissolved']?.flags?.successor_liability_gap_present !== true) errors.push('successor world must preserve excluded liability');
  if (byId['provisional-public-fund-payment-clawback-risk']?.flags?.clawback_risk_present !== true) errors.push('public-fund world must preserve clawback risk');
  if (byId['nonmonetary-correction-complete-compensation-uncollected']?.flags?.nonmonetary_only_present !== true) errors.push('nonmonetary world must preserve unpaid compensation');
  if (unique(compiled?.refusal_rules).length < 13) errors.push('compiled remedy-enforcement refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled remedy-enforcement caveat is required');
  return errors;
}

export function renderPreferenceRemedyEnforcementMarkdown(compiled) {
  const lines = [
    '# Collective remedy enforcement, insolvency, priority, and successor custody',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Worlds:** ${compiled.metrics.world_count}`,
    '',
    `**Public incident status:** ${compiled.baseline.public_incident_status}`,
    '',
    `**Nominal compensation obligation:** ${compiled.baseline.nominal_compensation_obligation}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Candidate worlds',
    ''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    lines.push(`- Mechanism: ${world.mechanism}`);
    lines.push(`- Collective standing: ${world.standing.collective_standing}`);
    lines.push(`- Participating claimants: ${world.standing.participating_claimants}`);
    lines.push(`- Finality: ${world.instrument.finality_state}`);
    lines.push(`- Enforcement stayed: ${world.instrument.enforcement_stayed}`);
    lines.push(`- Escrow state: ${world.security.escrow_state}`);
    lines.push(`- Gross paid: ${world.payment.gross_paid}`);
    lines.push(`- Paid to affected people: ${world.payment.paid_to_affected_people}`);
    lines.push(`- Durable compensation: ${world.payment.durable_compensation_paid}`);
    lines.push(`- Insolvency state: ${world.insolvency.estate_state}`);
    lines.push(`- Successor assumed liability: ${world.succession.successor_assumed_liability}`);
    lines.push(`- Enforcement delay: ${world.enforcement.delay_days} days`);
    lines.push(`- Unpaid durable obligation: ${world.residual.unpaid_durable_obligation}`);
    lines.push(`- Complete durable collective remedy: ${world.flags.complete_durable_collective_remedy}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`, '');
  }
  lines.push('## Aggregate separations', '');
  for (const [key, value] of Object.entries(compiled.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Classification', '');
  for (const [key, value] of Object.entries(compiled.classification)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Refusal rules', '');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
