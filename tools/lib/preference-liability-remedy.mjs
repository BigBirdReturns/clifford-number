import { createHash } from 'node:crypto';

export const PREFERENCE_LIABILITY_REMEDY_FIXTURE_SCHEMA_VERSION = 'preference-liability-remedy-fixture@1';
export const PREFERENCE_LIABILITY_REMEDY_BUILD_SCHEMA_VERSION = 'preference-liability-remedy-build@1';

const EXPECTED_ORGANIZATION_IDS = [
  'ORG-AUDITOR',
  'ORG-CLOUD',
  'ORG-CUSTOMER',
  'ORG-DOWNSTREAM',
  'ORG-PUBLIC',
  'ORG-VENDOR'
];
const EXPECTED_PAYMENT_ACCOUNTS = [
  'INSURER',
  'ORG-CLOUD',
  'ORG-CUSTOMER',
  'ORG-DOWNSTREAM',
  'ORG-VENDOR',
  'PUBLIC-FUND'
];
const EXPECTED_WORLD_IDS = [
  'causation-burden-blocks-public-fund',
  'circular-mutual-indemnities-no-primary-payer',
  'complete-joint-allocation-insurance-paid-remedy',
  'fragmented-forum-delays-payment',
  'insurance-exclusion-defeats-expected-recovery',
  'liability-cap-externalizes-balance',
  'upstream-disclaimer-customer-concentrated-loss',
  'vendor-indemnity-customer-only-no-public-standing'
];
const EXPECTED_FLAG_KEYS = [
  'causation_burden_block_present',
  'circular_indemnity_present',
  'complete_affected_party_compensation',
  'complete_governance_and_remedy',
  'customer_concentrated_loss',
  'direct_standing_absent',
  'externalized_loss_present',
  'forum_fragmentation_present',
  'insurance_exclusion_present',
  'insurance_payment_present',
  'liability_cap_present',
  'unresolved_liability_present',
  'upstream_disclaimer_present'
];
const EXPECTED_METRICS = {
  world_count: 8,
  distinct_liability_remedy_signatures: 8,
  distinct_public_status_signatures: 1,
  complete_governance_and_remedy_worlds: 1,
  complete_affected_party_compensation_worlds: 2,
  direct_standing_absent_worlds: 3,
  liability_cap_worlds: 1,
  circular_indemnity_worlds: 1,
  upstream_disclaimer_worlds: 1,
  insurance_exclusion_worlds: 1,
  forum_fragmentation_worlds: 2,
  causation_burden_block_worlds: 1,
  insurance_payment_worlds: 1,
  customer_concentrated_loss_worlds: 1,
  externalized_loss_worlds: 6,
  unresolved_liability_worlds: 4,
  total_paid_across_worlds: 10750,
  total_affected_party_compensation_paid: 5000,
  total_uncompensated_affected_party_harm: 11000,
  total_externalized_loss: 17250,
  maximum_enforcement_delay_days: 365,
  binding_public_authority_worlds: 0
};
const EXPECTED_CLASSIFICATION = {
  technical_recovery_identifies_loss_allocation: false,
  vendor_indemnity_identifies_direct_public_remedy: false,
  contractual_indemnity_identifies_payment: false,
  liability_cap_identifies_complete_compensation: false,
  insurance_policy_identifies_covered_or_paid_claim: false,
  claim_acceptance_identifies_full_indemnification: false,
  customer_payment_identifies_correct_cross_organizational_allocation: false,
  forum_availability_identifies_timely_enforceable_remedy: false,
  public_recovered_status_identifies_compensated_population: false,
  correction_identifies_monetary_or_nonmonetary_restoration: false,
  uncompensated_loss_establishes_breach_misconduct_or_intent: false,
  complete_joint_allocation_supported_in_at_least_one_world: true,
  complete_affected_party_compensation_supported_in_at_least_one_world: true,
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

function requireFalse(value, label, errors) {
  if (value !== false) errors.push(`${label} must remain false`);
}

function nonNegativeNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateExactObjectKeys(value, expectedKeys, label, errors) {
  if (!sameMembers(Object.keys(object(value)), expectedKeys)) errors.push(`${label} must contain exactly ${expectedKeys.join(', ')}`);
}

function validatePaymentLedger(world, baseline, errors) {
  const worldId = text(world?.world_id) || '(missing world ID)';
  const payments = object(world?.payments);
  const byPayer = object(payments.by_payer);
  validateExactObjectKeys(byPayer, baseline.payment_accounts, `world ${worldId} payments.by_payer`, errors);
  for (const payer of baseline.payment_accounts) {
    if (!nonNegativeNumber(byPayer[payer])) errors.push(`world ${worldId} payment ${payer} must be non-negative`);
  }
  if (!nonNegativeNumber(payments.total_paid)) errors.push(`world ${worldId} total_paid must be non-negative`);
  if (!nonNegativeNumber(payments.affected_party_compensation_paid)) errors.push(`world ${worldId} affected_party_compensation_paid must be non-negative`);
  if (!close(sum(Object.values(byPayer)), payments.total_paid)) errors.push(`world ${worldId} payer ledger does not reconcile to total_paid`);
  if (payments.total_paid > baseline.loss_ledger.total_loss) errors.push(`world ${worldId} total_paid exceeds total_loss`);
  if (payments.affected_party_compensation_paid > baseline.loss_ledger.direct_affected_party_harm) errors.push(`world ${worldId} affected-party compensation exceeds direct harm`);
}

function validateWorld(world, baseline, errors) {
  const worldId = text(world?.world_id) || '(missing world ID)';
  const contract = object(world?.contract);
  const insurance = object(world?.insurance);
  const claim = object(world?.claim);
  const forum = object(world?.forum);
  const payments = object(world?.payments);
  const residual = object(world?.residual);
  const flags = object(world?.expected_flags);

  if (!text(world?.mechanism)) errors.push(`world ${worldId} mechanism is required`);
  for (const key of ['indemnity_state']) if (!text(contract[key])) errors.push(`world ${worldId} contract.${key} is required`);
  if (contract.liability_cap !== null && !nonNegativeNumber(contract.liability_cap)) errors.push(`world ${worldId} liability_cap must be null or non-negative`);
  for (const key of ['upstream_disclaimer','circular_indemnity','direct_affected_party_right','contribution_resolved','primary_payer_resolved','contractual_allocation_complete']) {
    if (typeof contract[key] !== 'boolean') errors.push(`world ${worldId} contract.${key} must be boolean`);
  }

  for (const key of ['coverage_state','reservation_state']) if (!text(insurance[key])) errors.push(`world ${worldId} insurance.${key} is required`);
  if (insurance.policy_id !== null && !text(insurance.policy_id)) errors.push(`world ${worldId} policy_id must be null or non-empty`);
  for (const key of ['limit','deductible','paid_amount']) if (!nonNegativeNumber(insurance[key])) errors.push(`world ${worldId} insurance.${key} must be non-negative`);
  for (const key of ['exclusion_applied','claim_paid']) if (typeof insurance[key] !== 'boolean') errors.push(`world ${worldId} insurance.${key} must be boolean`);
  if (insurance.claim_paid !== (Number(insurance.paid_amount) > 0)) errors.push(`world ${worldId} claim_paid must match paid_amount`);
  if (!close(insurance.paid_amount, payments.by_payer?.INSURER ?? 0)) errors.push(`world ${worldId} insurer payment does not match the payer ledger`);
  if (insurance.exclusion_applied && insurance.coverage_state !== 'excluded') errors.push(`world ${worldId} insurance exclusion requires excluded coverage_state`);

  for (const key of ['causation_burden_state','notice_state','correction_state','compensation_state','appeal_state','enforcement_state','public_fund_state']) {
    if (!text(claim[key])) errors.push(`world ${worldId} claim.${key} is required`);
  }
  for (const key of ['direct_standing','collective_claim_available']) if (typeof claim[key] !== 'boolean') errors.push(`world ${worldId} claim.${key} must be boolean`);
  if (claim.direct_standing !== contract.direct_affected_party_right) errors.push(`world ${worldId} direct standing must match the direct affected-party contract right`);

  for (const key of ['forum_state','choice_of_law_state','arbitration_state','judgment_state']) if (!text(forum[key])) errors.push(`world ${worldId} forum.${key} is required`);
  if (!nonNegativeInteger(forum.enforcement_delay_days)) errors.push(`world ${worldId} enforcement_delay_days must be a non-negative integer`);

  validatePaymentLedger(world, baseline, errors);

  for (const key of ['uncompensated_affected_party_harm','externalized_loss','payment_delay_days']) {
    if (!nonNegativeNumber(residual[key])) errors.push(`world ${worldId} residual.${key} must be non-negative`);
  }
  for (const key of ['unresolved_liability','remedy_durable_after_succession']) if (typeof residual[key] !== 'boolean') errors.push(`world ${worldId} residual.${key} must be boolean`);
  if (!close(residual.uncompensated_affected_party_harm, baseline.loss_ledger.direct_affected_party_harm - payments.affected_party_compensation_paid)) {
    errors.push(`world ${worldId} uncompensated affected-party harm does not reconcile`);
  }
  if (!close(residual.externalized_loss, baseline.loss_ledger.total_loss - payments.total_paid)) errors.push(`world ${worldId} externalized loss does not reconcile`);
  if (!close(residual.payment_delay_days, forum.enforcement_delay_days)) errors.push(`world ${worldId} payment delay must match the enforcement delay`);

  validateExactObjectKeys(flags, EXPECTED_FLAG_KEYS, `world ${worldId} expected_flags`, errors);
  for (const key of EXPECTED_FLAG_KEYS) if (typeof flags[key] !== 'boolean') errors.push(`world ${worldId} expected_flags.${key} must be boolean`);
}

export function validatePreferenceLiabilityRemedyFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const organizations = array(baseline.organizations);
  const loss = object(baseline.loss_ledger);
  const worlds = array(fixture?.worlds);

  if (fixture?.schema_version !== PREFERENCE_LIABILITY_REMEDY_FIXTURE_SCHEMA_VERSION) errors.push('preference liability-remedy fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'fixture counts_toward_thesis_evidence', errors);

  if (!text(baseline.incident_id)) errors.push('baseline incident_id is required');
  if (baseline.technical_recovery_state !== 'complete') errors.push('baseline technical recovery must remain complete');
  if (baseline.final_proposal_id !== 'A1') errors.push('baseline final proposal must remain A1');
  if (baseline.public_incident_status !== 'recovered') errors.push('baseline public status must remain recovered');
  if (baseline.affected_population !== 100) errors.push('baseline affected population must remain 100');
  if (!sameMembers(organizations.map(org => org?.org_id), EXPECTED_ORGANIZATION_IDS)) errors.push('baseline organizations are incomplete');
  if (unique(organizations.map(org => text(org?.org_id))).length !== organizations.length) errors.push('baseline organization IDs must be unique');
  for (const org of organizations) {
    if (!text(org?.role) || !text(org?.jurisdiction) || !text(org?.authority_class)) errors.push(`organization ${org?.org_id} role, jurisdiction, and authority class are required`);
  }
  if (!sameMembers(baseline.payment_accounts, EXPECTED_PAYMENT_ACCOUNTS)) errors.push('baseline payment accounts are incomplete');
  if (unique(baseline.required_rights).length < 5) errors.push('baseline required-rights ledger is incomplete');
  requireFalse(baseline.binding_public_authority, 'baseline binding_public_authority', errors);

  for (const key of ['direct_affected_party_harm','consequential_institutional_loss','technical_recovery_cost','total_loss']) {
    if (!nonNegativeNumber(loss[key])) errors.push(`baseline loss_ledger.${key} must be non-negative`);
  }
  const componentTotal = Number(loss.direct_affected_party_harm) + Number(loss.consequential_institutional_loss) + Number(loss.technical_recovery_cost);
  if (!close(componentTotal, loss.total_loss) || loss.total_loss !== 3500) errors.push('baseline loss ledger must reconcile to 3500');

  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the eight required liability-remedy worlds');
  if (unique(worlds.map(world => text(world?.world_id))).length !== worlds.length) errors.push('world IDs must be unique');
  for (const world of worlds) validateWorld(world, baseline, errors);

  for (const [key, value] of Object.entries(EXPECTED_METRICS)) {
    if (fixture?.expected_metrics?.[key] !== value) errors.push(`expected_metrics.${key} must equal ${value}`);
  }
  for (const [key, value] of Object.entries(EXPECTED_CLASSIFICATION)) {
    if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  }

  const requiredRules = [
    'technical_recovery_is_not_loss_allocation',
    'vendor_indemnity_is_not_direct_affected_party_remedy',
    'contractual_indemnity_is_not_payment',
    'liability_cap_is_not_complete_compensation',
    'insurance_policy_is_not_covered_or_paid_claim',
    'claim_acceptance_is_not_full_indemnification',
    'customer_payment_is_not_correct_cross_organizational_allocation',
    'forum_availability_is_not_timely_enforceable_remedy',
    'public_recovered_status_is_not_compensated_affected_population',
    'correction_is_not_monetary_or_nonmonetary_restoration',
    'uncompensated_loss_is_not_proof_of_breach_misconduct_or_intent',
    'liability_remedy_claim_requires_entity_contract_law_loss_causation_notice_insurance_standing_adjudication_payment_contribution_residual_enforcement_succession_and_authority_custody'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of requiredRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 9) errors.push('prohibited-inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id)
      || !text(fixture?.interpretation_contract?.what_this_is)
      || !text(fixture?.interpretation_contract?.what_this_is_not)
      || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract is incomplete');
  return errors;
}

function completePublicRights(world, baseline) {
  const claim = object(world.claim);
  return claim.notice_state === 'complete'
    && claim.correction_state === 'complete'
    && claim.compensation_state === 'paid_complete'
    && claim.appeal_state === 'available'
    && claim.enforcement_state === 'complete'
    && baseline.required_rights.length >= 5;
}

export function simulatePreferenceLiabilityRemedyWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const contract = object(world.contract);
  const insurance = object(world.insurance);
  const claim = object(world.claim);
  const forum = object(world.forum);
  const payments = object(world.payments);
  const residual = object(world.residual);

  const completeAffectedPartyCompensation = close(payments.affected_party_compensation_paid, baseline.loss_ledger.direct_affected_party_harm)
    && close(residual.uncompensated_affected_party_harm, 0);
  const liabilityCapPresent = contract.liability_cap !== null && Number(contract.liability_cap) > 0;
  const circularIndemnityPresent = contract.circular_indemnity === true;
  const upstreamDisclaimerPresent = contract.upstream_disclaimer === true;
  const insuranceExclusionPresent = insurance.exclusion_applied === true || insurance.coverage_state === 'excluded';
  const forumFragmentationPresent = ['fragmented_multi_jurisdiction','circular_contract_deadlock'].includes(forum.forum_state);
  const causationBurdenBlockPresent = text(claim.causation_burden_state).startsWith('not_met');
  const insurancePaymentPresent = insurance.claim_paid === true
    && Number(insurance.paid_amount) > 0
    && close(insurance.paid_amount, payments.by_payer.INSURER);
  const customerConcentratedLoss = close(payments.by_payer['ORG-CUSTOMER'], baseline.loss_ledger.total_loss)
    && close(payments.total_paid, baseline.loss_ledger.total_loss);
  const externalizedLossPresent = Number(residual.externalized_loss) > 0;
  const unresolvedLiabilityPresent = residual.unresolved_liability === true;
  const directStandingAbsent = claim.direct_standing !== true;
  const completeGovernanceAndRemedy = contract.contractual_allocation_complete === true
    && contract.contribution_resolved === true
    && contract.primary_payer_resolved === true
    && claim.direct_standing === true
    && claim.collective_claim_available === true
    && completePublicRights(world, baseline)
    && completeAffectedPartyCompensation
    && close(payments.total_paid, baseline.loss_ledger.total_loss)
    && close(residual.externalized_loss, 0)
    && residual.unresolved_liability === false
    && residual.remedy_durable_after_succession === true
    && forum.forum_state === 'single_enforceable_route'
    && forum.choice_of_law_state === 'resolved'
    && ['settled_and_enforced','customer_settlement_enforced'].includes(forum.judgment_state)
    && (!insurance.policy_id || insurance.coverage_state === 'accepted' || insurance.coverage_state === 'not_applicable');

  const flags = {
    complete_governance_and_remedy: completeGovernanceAndRemedy,
    complete_affected_party_compensation: completeAffectedPartyCompensation,
    direct_standing_absent: directStandingAbsent,
    liability_cap_present: liabilityCapPresent,
    circular_indemnity_present: circularIndemnityPresent,
    upstream_disclaimer_present: upstreamDisclaimerPresent,
    insurance_exclusion_present: insuranceExclusionPresent,
    forum_fragmentation_present: forumFragmentationPresent,
    causation_burden_block_present: causationBurdenBlockPresent,
    insurance_payment_present: insurancePaymentPresent,
    customer_concentrated_loss: customerConcentratedLoss,
    externalized_loss_present: externalizedLossPresent,
    unresolved_liability_present: unresolvedLiabilityPresent
  };
  const liabilityRemedyState = {
    contract,
    insurance,
    claim,
    forum,
    payments,
    residual,
    flags
  };
  const publicStatusState = {
    incident_id: baseline.incident_id,
    technical_recovery_state: baseline.technical_recovery_state,
    final_proposal_id: baseline.final_proposal_id,
    public_incident_status: baseline.public_incident_status,
    affected_population: baseline.affected_population,
    total_loss: baseline.loss_ledger.total_loss
  };

  return {
    world_id: world.world_id,
    mechanism: world.mechanism,
    contract,
    insurance,
    claim,
    forum,
    payments,
    residual,
    flags,
    public_status_state: publicStatusState,
    liability_remedy_signature_sha256: sha256(liabilityRemedyState),
    public_status_signature_sha256: sha256(publicStatusState)
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildLiabilityRemedyChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${result.world_id}:baseline`,
    event_type: 'incident_organization_recovery_and_loss_snapshot',
    evidence_class: 'synthetic_control_truth',
    authority: 'fixture_author',
    source_event_ids: [],
    payload: fixture.baseline
  });
  push({
    event_id: `${result.world_id}:contract`,
    event_type: 'contract_indemnity_cap_contribution_and_direct_rights_state',
    evidence_class: 'synthetic_control_contract_state',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:baseline`],
    payload: result.contract
  });
  push({
    event_id: `${result.world_id}:insurance`,
    event_type: 'insurance_policy_coverage_reservation_and_payment_state',
    evidence_class: 'synthetic_control_insurance_state',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:contract`],
    payload: result.insurance
  });
  push({
    event_id: `${result.world_id}:claim-forum`,
    event_type: 'standing_causation_forum_appeal_and_enforcement_state',
    evidence_class: 'synthetic_control_claim_state',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:insurance`],
    payload: { claim: result.claim, forum: result.forum }
  });
  push({
    event_id: `${result.world_id}:payments`,
    event_type: 'payer_contribution_and_affected_party_payment_ledger',
    evidence_class: 'synthetic_control_payment_state',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:claim-forum`],
    payload: result.payments
  });
  push({
    event_id: `${result.world_id}:residual`,
    event_type: 'uncompensated_externalized_delay_and_succession_state',
    evidence_class: 'synthetic_control_residual_state',
    authority: 'fixture_world',
    source_event_ids: [`${result.world_id}:payments`],
    payload: result.residual
  });
  push({
    event_id: `${result.world_id}:classification`,
    event_type: 'liability_remedy_mechanism_classified',
    evidence_class: 'deterministic_control_classification',
    authority: 'liability_remedy_compiler',
    source_event_ids: [`${result.world_id}:residual`],
    payload: { mechanism: result.mechanism, flags: result.flags }
  });
  push({
    event_id: `${result.world_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'liability_remedy_analyst',
    source_event_ids: [`${result.world_id}:classification`],
    payload: {
      allowed_interpretation: 'synthetic allocation, insurance, standing, payment, forum, and residual-loss state beneath one recovered technical outcome',
      refused_promotions: [
        'technical_recovery_as_loss_allocation',
        'indemnity_as_direct_public_remedy',
        'contract_or_policy_as_payment',
        'cap_as_complete_compensation',
        'forum_as_timely_enforcement',
        'payment_as_correct_cross_organizational_allocation',
        'uncompensated_loss_as_breach_misconduct_or_intent',
        'compensation_as_binding_public_authority'
      ]
    }
  });
  return events;
}

export function validatePreferenceLiabilityRemedyChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('liability-remedy event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate liability-remedy event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`liability-remedy event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`liability-remedy event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`liability-remedy event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceLiabilityRemedyFixture(fixture) {
  const errors = validatePreferenceLiabilityRemedyFixture(fixture);
  if (errors.length) throw new Error(`invalid preference liability-remedy fixture:\n- ${errors.join('\n- ')}`);

  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceLiabilityRemedyWorld(fixture, world);
    for (const key of EXPECTED_FLAG_KEYS) {
      if (result.flags[key] !== world.expected_flags[key]) throw new Error(`world ${world.world_id} ${key} mismatch`);
    }
    const chain = buildLiabilityRemedyChain(fixture, result);
    return { ...result, custody_chain: chain, custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null };
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));

  const countFlag = flag => worlds.filter(world => world.flags[flag] === true).length;
  const metrics = {
    world_count: worlds.length,
    distinct_liability_remedy_signatures: unique(worlds.map(world => world.liability_remedy_signature_sha256)).length,
    distinct_public_status_signatures: unique(worlds.map(world => world.public_status_signature_sha256)).length,
    complete_governance_and_remedy_worlds: countFlag('complete_governance_and_remedy'),
    complete_affected_party_compensation_worlds: countFlag('complete_affected_party_compensation'),
    direct_standing_absent_worlds: countFlag('direct_standing_absent'),
    liability_cap_worlds: countFlag('liability_cap_present'),
    circular_indemnity_worlds: countFlag('circular_indemnity_present'),
    upstream_disclaimer_worlds: countFlag('upstream_disclaimer_present'),
    insurance_exclusion_worlds: countFlag('insurance_exclusion_present'),
    forum_fragmentation_worlds: countFlag('forum_fragmentation_present'),
    causation_burden_block_worlds: countFlag('causation_burden_block_present'),
    insurance_payment_worlds: countFlag('insurance_payment_present'),
    customer_concentrated_loss_worlds: countFlag('customer_concentrated_loss'),
    externalized_loss_worlds: countFlag('externalized_loss_present'),
    unresolved_liability_worlds: countFlag('unresolved_liability_present'),
    total_paid_across_worlds: sum(worlds.map(world => world.payments.total_paid)),
    total_affected_party_compensation_paid: sum(worlds.map(world => world.payments.affected_party_compensation_paid)),
    total_uncompensated_affected_party_harm: sum(worlds.map(world => world.residual.uncompensated_affected_party_harm)),
    total_externalized_loss: sum(worlds.map(world => world.residual.externalized_loss)),
    maximum_enforcement_delay_days: Math.max(...worlds.map(world => world.forum.enforcement_delay_days)),
    binding_public_authority_worlds: 0
  };
  for (const [key, value] of Object.entries(EXPECTED_METRICS)) {
    if (!close(metrics[key], value)) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);
  }

  return {
    schema_version: PREFERENCE_LIABILITY_REMEDY_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'liability_remedy_equifinality_qualified',
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

export function validatePreferenceLiabilityRemedyBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_LIABILITY_REMEDY_BUILD_SCHEMA_VERSION) errors.push('preference liability-remedy build schema mismatch');
  if (compiled?.status !== 'liability_remedy_equifinality_qualified') errors.push('compiled liability-remedy status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled liability-remedy graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled liability-remedy counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled liability-remedy conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled liability-remedy real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), EXPECTED_WORLD_IDS)) errors.push('compiled liability-remedy worlds are incomplete');

  for (const [key, value] of Object.entries(EXPECTED_METRICS)) {
    if (!close(compiled?.metrics?.[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  }
  for (const [key, value] of Object.entries(EXPECTED_CLASSIFICATION)) {
    if (compiled?.classification?.[key] !== value) errors.push(`compiled classification.${key} must equal ${JSON.stringify(value)}`);
  }
  requireFalse(compiled?.classification?.preference_change_present, 'compiled preference_change_present', errors);

  for (const world of array(compiled?.worlds)) {
    validateExactObjectKeys(world?.flags, EXPECTED_FLAG_KEYS, `compiled world ${world?.world_id} flags`, errors);
    if (!/^[0-9a-f]{64}$/.test(text(world?.liability_remedy_signature_sha256))) errors.push(`world ${world?.world_id} liability-remedy signature is invalid`);
    if (!/^[0-9a-f]{64}$/.test(text(world?.public_status_signature_sha256))) errors.push(`world ${world?.world_id} public-status signature is invalid`);
    errors.push(...validatePreferenceLiabilityRemedyChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
  }

  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  const complete = byId['complete-joint-allocation-insurance-paid-remedy'];
  if (complete?.flags?.complete_governance_and_remedy !== true || complete?.flags?.complete_affected_party_compensation !== true) errors.push('complete world must preserve full allocation and affected-party remedy');
  if (complete?.payments?.total_paid !== 3500 || complete?.payments?.affected_party_compensation_paid !== 2000) errors.push('complete world payment ledger mismatch');
  if (byId['vendor-indemnity-customer-only-no-public-standing']?.flags?.direct_standing_absent !== true) errors.push('customer-only indemnity world must preserve no direct public standing');
  if (byId['liability-cap-externalizes-balance']?.flags?.liability_cap_present !== true) errors.push('liability-cap world must preserve its cap');
  if (byId['circular-mutual-indemnities-no-primary-payer']?.flags?.circular_indemnity_present !== true) errors.push('circular world must preserve unresolved mutual indemnity');
  if (byId['upstream-disclaimer-customer-concentrated-loss']?.flags?.customer_concentrated_loss !== true) errors.push('upstream disclaimer world must preserve customer-concentrated payment');
  if (byId['insurance-exclusion-defeats-expected-recovery']?.flags?.insurance_exclusion_present !== true) errors.push('insurance-exclusion world must preserve denied coverage');
  if (byId['fragmented-forum-delays-payment']?.flags?.forum_fragmentation_present !== true) errors.push('forum world must preserve fragmented enforcement');
  if (byId['causation-burden-blocks-public-fund']?.flags?.causation_burden_block_present !== true) errors.push('causation world must preserve the blocked public fund');
  if (unique(compiled?.refusal_rules).length < 12) errors.push('compiled liability-remedy refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled liability-remedy caveat is required');
  return errors;
}

export function renderPreferenceLiabilityRemedyMarkdown(compiled) {
  const lines = [
    '# Federated liability, loss allocation, insurance, and public-remedy custody',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Worlds:** ${compiled.metrics.world_count}`,
    '',
    `**Technical recovery:** ${compiled.baseline.technical_recovery_state}`,
    '',
    `**Total loss per world:** ${compiled.baseline.loss_ledger.total_loss}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Frozen loss ledger',
    ''
  ];
  for (const [key, value] of Object.entries(compiled.baseline.loss_ledger)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Candidate worlds', '');
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`, '');
    lines.push(`- Mechanism: ${world.mechanism}`);
    lines.push(`- Indemnity state: ${world.contract.indemnity_state}`);
    lines.push(`- Direct standing: ${world.claim.direct_standing}`);
    lines.push(`- Insurance coverage: ${world.insurance.coverage_state}`);
    lines.push(`- Insurance paid: ${world.insurance.paid_amount}`);
    lines.push(`- Total paid: ${world.payments.total_paid}`);
    lines.push(`- Affected-party compensation: ${world.payments.affected_party_compensation_paid}`);
    lines.push(`- Uncompensated affected harm: ${world.residual.uncompensated_affected_party_harm}`);
    lines.push(`- Externalized loss: ${world.residual.externalized_loss}`);
    lines.push(`- Enforcement delay: ${world.forum.enforcement_delay_days} days`);
    lines.push(`- Complete governance and remedy: ${world.flags.complete_governance_and_remedy}`);
    lines.push(`- Complete affected-party compensation: ${world.flags.complete_affected_party_compensation}`);
    lines.push(`- Unresolved liability: ${world.flags.unresolved_liability_present}`);
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
