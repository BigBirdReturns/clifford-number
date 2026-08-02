import { createHash } from 'node:crypto';

export const PREFERENCE_COLLECTIVE_DISTRIBUTION_FIXTURE_SCHEMA_VERSION = 'preference-collective-distribution-fixture@1';
export const PREFERENCE_COLLECTIVE_DISTRIBUTION_BUILD_SCHEMA_VERSION = 'preference-collective-distribution-build@1';

const GROUP_IDS = ['HIGH-HARM', 'LOW-HARM'];
const EXPECTED_WORLD_IDS = [
  'adequate-representation-automatic-audited-distribution',
  'algorithmic-formula-undercompensates-high-harm-group',
  'claims-made-high-burden-low-takeup-reversion',
  'cy-pres-diversion-away-from-affected-population',
  'notice-failure-binds-unnotified-population',
  'opaque-administrator-fees-and-deductions',
  'overbroad-release-binds-excluded-unpaid-people',
  'representative-conflict-side-payment-skew'
];
const EXPECTED_FLAG_KEYS = [
  'claims_burden_low_takeup_present',
  'complete_collective_distribution',
  'cy_pres_diversion_present',
  'fee_opacity_present',
  'formula_disparity_present',
  'full_affected_population_paid',
  'full_reference_net_paid',
  'notice_optout_failure_present',
  'overbroad_release_present',
  'reference_formula_match',
  'representation_conflict_present'
];
const EXPECTED_METRICS = {
  world_count: 8,
  distinct_distribution_governance_signatures: 8,
  distinct_public_status_signatures: 1,
  complete_collective_distribution_worlds: 1,
  representation_conflict_worlds: 2,
  notice_optout_failure_worlds: 2,
  claims_burden_low_takeup_worlds: 1,
  formula_disparity_worlds: 1,
  cy_pres_diversion_worlds: 1,
  fee_opacity_worlds: 2,
  overbroad_release_worlds: 4,
  full_affected_population_paid_worlds: 4,
  full_reference_net_paid_worlds: 2,
  reference_formula_match_worlds: 1,
  total_people_paid: 540,
  total_bound_but_unpaid_people: 260,
  total_amount_paid_to_affected: 8400,
  total_durable_compensation_paid: 8400,
  total_unclaimed_or_redirected: 4600,
  total_fees_incentives_and_deductions: 3000,
  binding_public_authority_worlds: 0
};
const EXPECTED_CLASSIFICATION = {
  class_certification_identifies_adequate_representation: false,
  representative_appointment_identifies_absence_of_conflict: false,
  notice_sent_identifies_received_understood_usable_notice: false,
  formal_opt_out_identifies_meaningful_exit: false,
  claim_route_identifies_population_takeup_or_remedy: false,
  settlement_approval_identifies_fair_allocation_or_complete_payment: false,
  gross_fund_identifies_net_distributable_or_beneficiary_payment: false,
  administrator_payment_file_identifies_accurate_audited_distribution: false,
  unclaimed_funds_default_to_defendant_or_cy_pres: false,
  pro_rata_equality_identifies_harm_responsive_fairness: false,
  release_or_class_judgment_identifies_informed_consent: false,
  public_distributed_status_identifies_complete_fair_auditable_appealable_remedy: false,
  complete_collective_distribution_supported_in_at_least_one_world: true,
  binding_public_authority_supported: false,
  manipulative_intent_inferable: false,
  real_world_effect_claimed: false
};
const EPSILON = 1e-12;

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function array(value) { return Array.isArray(value) ? value : []; }
function text(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set(array(values).map(value => text(value)).filter(Boolean))]; }
function sorted(values) { return [...values].sort((left, right) => String(left).localeCompare(String(right))); }
function sameMembers(left, right) { return JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right))); }
function sum(values) { return array(values).reduce((total, value) => total + Number(value), 0); }
function close(left, right, tolerance = EPSILON) { return Math.abs(Number(left) - Number(right)) <= tolerance; }
function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  return value;
}
function sha256(value) { return createHash('sha256').update(JSON.stringify(canonicalValue(value))).digest('hex'); }
function nonNegativeNumber(value) { return Number.isFinite(Number(value)) && Number(value) >= 0; }
function nonNegativeInteger(value) { return Number.isInteger(value) && value >= 0; }
function requireFalse(value, label, errors) { if (value !== false) errors.push(`${label} must remain false`); }
function validateExactObjectKeys(value, expectedKeys, label, errors) {
  if (!sameMembers(Object.keys(object(value)), expectedKeys)) errors.push(`${label} must contain exactly ${expectedKeys.join(', ')}`);
}

function validateWorld(world, baseline, errors) {
  const worldId = text(world?.world_id) || '(missing world ID)';
  const representation = object(world?.representation);
  const notice = object(world?.notice);
  const claims = object(world?.claims);
  const release = object(world?.release);
  const fund = object(world?.fund);
  const allocation = object(world?.allocation);
  const unclaimed = object(world?.unclaimed);
  const governance = object(world?.governance);
  const flags = object(world?.expected_flags);

  if (!text(world?.mechanism)) errors.push(`world ${worldId} mechanism is required`);
  if (!nonNegativeInteger(representation.represented_count) || representation.represented_count > baseline.affected_population) errors.push(`world ${worldId} represented_count is invalid`);
  for (const key of ['representative_id','adequacy_state','conflict_state','administrator_id']) if (!text(representation[key])) errors.push(`world ${worldId} representation.${key} is required`);
  for (const key of ['representative_incentive','counsel_fee']) if (!nonNegativeNumber(representation[key])) errors.push(`world ${worldId} representation.${key} must be non-negative`);
  if (typeof representation.administrator_conflict !== 'boolean') errors.push(`world ${worldId} administrator_conflict must be boolean`);

  for (const key of ['sent_count','delivered_count','acknowledged_count','comprehended_count','opt_out_deadline_days','opt_out_count']) if (!nonNegativeInteger(notice[key])) errors.push(`world ${worldId} notice.${key} must be a non-negative integer`);
  if (notice.sent_count > baseline.affected_population || notice.delivered_count > notice.sent_count || notice.acknowledged_count > notice.delivered_count || notice.comprehended_count > notice.acknowledged_count) errors.push(`world ${worldId} notice counts do not form a valid custody chain`);
  if (!text(notice.language_and_accessibility_state)) errors.push(`world ${worldId} language and accessibility state is required`);
  for (const key of ['opt_out_available','meaningful_opt_out']) if (typeof notice[key] !== 'boolean') errors.push(`world ${worldId} notice.${key} must be boolean`);
  if (notice.meaningful_opt_out && !notice.opt_out_available) errors.push(`world ${worldId} meaningful opt-out requires formal availability`);

  for (const key of ['route','burden_state','assistance_state']) if (!text(claims[key])) errors.push(`world ${worldId} claims.${key} is required`);
  for (const key of ['eligible_count','submitted_count','approved_count','denied_count','late_count']) if (!nonNegativeInteger(claims[key])) errors.push(`world ${worldId} claims.${key} must be a non-negative integer`);
  if (claims.eligible_count !== baseline.affected_population) errors.push(`world ${worldId} claims eligible_count must preserve the affected population`);
  if (claims.submitted_count > claims.eligible_count || claims.approved_count > claims.submitted_count || claims.denied_count > claims.submitted_count) errors.push(`world ${worldId} claim counts are inconsistent`);
  if (typeof claims.appeal_available !== 'boolean') errors.push(`world ${worldId} appeal_available must be boolean`);

  if (!nonNegativeInteger(release.bound_count) || release.bound_count > baseline.affected_population) errors.push(`world ${worldId} release bound_count is invalid`);
  if (!text(release.scope)) errors.push(`world ${worldId} release scope is required`);
  for (const key of ['future_claims_released','nonparty_claims_released','consideration_match','overbroad']) if (typeof release[key] !== 'boolean') errors.push(`world ${worldId} release.${key} must be boolean`);

  for (const key of ['gross_fund','administrator_fees','counsel_fees','representative_incentive','other_deductions','net_distributable']) if (!nonNegativeNumber(fund[key])) errors.push(`world ${worldId} fund.${key} must be non-negative`);
  if (!close(fund.gross_fund, baseline.gross_remedy_fund)) errors.push(`world ${worldId} gross fund must remain ${baseline.gross_remedy_fund}`);
  const deductions = Number(fund.administrator_fees) + Number(fund.counsel_fees) + Number(fund.representative_incentive) + Number(fund.other_deductions);
  if (!close(deductions + Number(fund.net_distributable), fund.gross_fund)) errors.push(`world ${worldId} fund does not reconcile`);
  if (!close(representation.counsel_fee, fund.counsel_fees) || !close(representation.representative_incentive, fund.representative_incentive)) errors.push(`world ${worldId} representation payments do not match the fund ledger`);

  if (!text(allocation.formula) || !text(allocation.fairness_state) || !text(allocation.rounding_state)) errors.push(`world ${worldId} allocation identity is incomplete`);
  validateExactObjectKeys(allocation.group_payments, GROUP_IDS, `world ${worldId} allocation.group_payments`, errors);
  for (const groupId of GROUP_IDS) if (!nonNegativeNumber(allocation.group_payments?.[groupId])) errors.push(`world ${worldId} group payment ${groupId} must be non-negative`);
  for (const key of ['people_paid']) if (!nonNegativeInteger(allocation[key])) errors.push(`world ${worldId} allocation.${key} must be a non-negative integer`);
  for (const key of ['amount_paid_to_affected','durable_compensation_paid','minimum_payment','maximum_payment']) if (!nonNegativeNumber(allocation[key])) errors.push(`world ${worldId} allocation.${key} must be non-negative`);
  if (allocation.people_paid > representation.represented_count || allocation.people_paid !== claims.approved_count) errors.push(`world ${worldId} people_paid must match approved claims and remain within the represented population`);
  if (!close(sum(Object.values(allocation.group_payments)), allocation.amount_paid_to_affected)) errors.push(`world ${worldId} group payments do not reconcile to affected payment`);
  if (allocation.durable_compensation_paid > allocation.amount_paid_to_affected) errors.push(`world ${worldId} durable compensation cannot exceed affected payment`);
  if (typeof allocation.formula_audited !== 'boolean') errors.push(`world ${worldId} formula_audited must be boolean`);

  for (const key of ['amount','reversion_amount','cy_pres_amount','redistribution_amount','escheat_amount']) if (!nonNegativeNumber(unclaimed[key])) errors.push(`world ${worldId} unclaimed.${key} must be non-negative`);
  if (!text(unclaimed.disposition)) errors.push(`world ${worldId} unclaimed disposition is required`);
  if (!close(sum([unclaimed.reversion_amount, unclaimed.cy_pres_amount, unclaimed.redistribution_amount, unclaimed.escheat_amount]), unclaimed.amount)) errors.push(`world ${worldId} unclaimed disposition does not reconcile`);
  if (!close(Number(allocation.amount_paid_to_affected) + Number(unclaimed.amount), fund.net_distributable)) errors.push(`world ${worldId} net distribution does not reconcile`);

  for (const key of ['audit_state','error_correction_state','objection_route','appeal_route']) if (!text(governance[key])) errors.push(`world ${worldId} governance.${key} is required`);
  for (const key of ['methodology_public','conflicts_disclosed']) if (typeof governance[key] !== 'boolean') errors.push(`world ${worldId} governance.${key} must be boolean`);

  validateExactObjectKeys(flags, EXPECTED_FLAG_KEYS, `world ${worldId} expected_flags`, errors);
  for (const key of EXPECTED_FLAG_KEYS) if (typeof flags[key] !== 'boolean') errors.push(`world ${worldId} expected_flags.${key} must be boolean`);
}

export function validatePreferenceCollectiveDistributionFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const groups = array(baseline.affected_groups);
  const worlds = array(fixture?.worlds);

  if (fixture?.schema_version !== PREFERENCE_COLLECTIVE_DISTRIBUTION_FIXTURE_SCHEMA_VERSION) errors.push('preference collective-distribution fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'fixture counts_toward_thesis_evidence', errors);

  if (!text(baseline.incident_id)) errors.push('baseline incident_id is required');
  if (baseline.technical_correction_state !== 'complete') errors.push('baseline technical correction must remain complete');
  if (baseline.final_proposal_id !== 'A1') errors.push('baseline final proposal must remain A1');
  if (baseline.public_remedy_status !== 'distributed') errors.push('baseline public status must remain distributed');
  if (baseline.affected_population !== 100) errors.push('baseline affected population must remain 100');
  if (!sameMembers(groups.map(group => group?.group_id), GROUP_IDS)) errors.push('baseline affected groups are incomplete');
  if (sum(groups.map(group => group.count)) !== baseline.affected_population) errors.push('baseline affected groups must sum to 100');
  validateExactObjectKeys(baseline.reference_group_allocation, GROUP_IDS, 'baseline reference_group_allocation', errors);
  if (!close(sum(Object.values(baseline.reference_group_allocation)), baseline.reference_net_distributable)) errors.push('baseline reference allocation does not reconcile');
  if (baseline.gross_remedy_fund !== 2000 || baseline.reference_administration_fee !== 200 || baseline.reference_net_distributable !== 1800) errors.push('baseline fund contract must preserve 2000 gross, 200 fees, and 1800 net');
  if (!close(baseline.gross_remedy_fund - baseline.reference_administration_fee, baseline.reference_net_distributable)) errors.push('baseline fund contract does not reconcile');
  requireFalse(baseline.binding_public_authority, 'baseline binding_public_authority', errors);

  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the eight required collective-distribution worlds');
  if (unique(worlds.map(world => text(world?.world_id))).length !== worlds.length) errors.push('world IDs must be unique');
  for (const world of worlds) validateWorld(world, baseline, errors);

  for (const [key, value] of Object.entries(EXPECTED_METRICS)) if (fixture?.expected_metrics?.[key] !== value) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const [key, value] of Object.entries(EXPECTED_CLASSIFICATION)) if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);

  const requiredRules = [
    'class_certification_is_not_adequate_representation',
    'representative_appointment_is_not_absence_of_conflict',
    'notice_sent_is_not_notice_received_understood_or_usable',
    'formal_opt_out_right_is_not_meaningful_exit_opportunity',
    'claim_route_is_not_population_takeup_or_remedy',
    'settlement_approval_is_not_fair_allocation_or_complete_payment',
    'gross_fund_is_not_net_distributable_or_beneficiary_payment',
    'administrator_payment_file_is_not_accurate_audited_distribution',
    'unclaimed_funds_are_not_defendant_property_or_appropriate_cy_pres_by_default',
    'pro_rata_equality_is_not_harm_responsive_fairness',
    'release_or_class_judgment_is_not_informed_consent_by_every_bound_person',
    'public_distributed_status_is_not_complete_fair_auditable_appealable_remedy',
    'collective_distribution_claim_requires_population_representation_conflict_notice_optout_claim_release_fee_formula_subgroup_unclaimed_payment_audit_objection_appeal_residual_and_authority_custody'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of requiredRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 10) errors.push('prohibited-inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract is incomplete');
  return errors;
}

export function simulatePreferenceCollectiveDistributionWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const representation = object(world.representation);
  const notice = object(world.notice);
  const claims = object(world.claims);
  const release = object(world.release);
  const fund = object(world.fund);
  const allocation = object(world.allocation);
  const unclaimed = object(world.unclaimed);
  const governance = object(world.governance);
  const deductions = Number(fund.administrator_fees) + Number(fund.counsel_fees) + Number(fund.representative_incentive) + Number(fund.other_deductions);
  const representationConflict = representation.conflict_state !== 'none' || representation.administrator_conflict === true;
  const noticeFailure = notice.delivered_count < baseline.affected_population || notice.comprehended_count < baseline.affected_population || notice.meaningful_opt_out !== true;
  const claimsBurden = claims.burden_state === 'high' && claims.approved_count < baseline.affected_population / 2;
  const formulaDisparity = allocation.fairness_state === 'high_harm_undercompensated';
  const cyPres = Number(unclaimed.cy_pres_amount) > 0;
  const feeOpacity = deductions > baseline.reference_administration_fee && (governance.methodology_public !== true || governance.audit_state === 'none');
  const overbroad = release.overbroad === true || release.bound_count > representation.represented_count;
  const fullPopulationPaid = allocation.people_paid === baseline.affected_population;
  const fullReferenceNetPaid = close(allocation.amount_paid_to_affected, baseline.reference_net_distributable);
  const referenceFormulaMatch = close(allocation.group_payments['LOW-HARM'], baseline.reference_group_allocation['LOW-HARM'])
    && close(allocation.group_payments['HIGH-HARM'], baseline.reference_group_allocation['HIGH-HARM']);
  const complete = representation.adequacy_state === 'adequate'
    && !representationConflict
    && notice.delivered_count === baseline.affected_population
    && notice.comprehended_count === baseline.affected_population
    && notice.meaningful_opt_out === true
    && claims.approved_count === baseline.affected_population
    && release.overbroad === false
    && release.consideration_match === true
    && close(deductions, baseline.reference_administration_fee)
    && fullReferenceNetPaid
    && referenceFormulaMatch
    && close(unclaimed.amount, 0)
    && governance.methodology_public === true
    && governance.audit_state === 'independent_complete'
    && allocation.formula_audited === true
    && governance.objection_route === 'available'
    && governance.appeal_route === 'available';
  const flags = {
    complete_collective_distribution: complete,
    representation_conflict_present: representationConflict,
    notice_optout_failure_present: noticeFailure,
    claims_burden_low_takeup_present: claimsBurden,
    formula_disparity_present: formulaDisparity,
    cy_pres_diversion_present: cyPres,
    fee_opacity_present: feeOpacity,
    overbroad_release_present: overbroad,
    full_affected_population_paid: fullPopulationPaid,
    full_reference_net_paid: fullReferenceNetPaid,
    reference_formula_match: referenceFormulaMatch
  };
  const distributionState = { representation, notice, claims, release, fund, allocation, unclaimed, governance, flags };
  const publicStatusState = {
    incident_id: baseline.incident_id,
    technical_correction_state: baseline.technical_correction_state,
    final_proposal_id: baseline.final_proposal_id,
    public_remedy_status: baseline.public_remedy_status,
    affected_population: baseline.affected_population,
    gross_remedy_fund: baseline.gross_remedy_fund
  };
  return {
    world_id: world.world_id,
    mechanism: world.mechanism,
    representation, notice, claims, release, fund, allocation, unclaimed, governance, flags,
    deductions,
    bound_but_unpaid_people: release.bound_count - allocation.people_paid,
    public_status_state: publicStatusState,
    distribution_governance_signature_sha256: sha256(distributionState),
    public_status_signature_sha256: sha256(publicStatusState)
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildCollectiveDistributionChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => { const sealed = sealedEvent(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  push({ event_id:`${result.world_id}:baseline`, event_type:'affected_population_public_status_and_fund_snapshot', evidence_class:'synthetic_control_truth', authority:'fixture_author', source_event_ids:[], payload:fixture.baseline });
  push({ event_id:`${result.world_id}:representation-notice`, event_type:'representation_conflict_notice_and_optout_state', evidence_class:'synthetic_control_governance_state', authority:'fixture_world', source_event_ids:[`${result.world_id}:baseline`], payload:{representation:result.representation, notice:result.notice} });
  push({ event_id:`${result.world_id}:claims-release`, event_type:'claim_burden_takeup_release_and_binding_state', evidence_class:'synthetic_control_claim_state', authority:'fixture_world', source_event_ids:[`${result.world_id}:representation-notice`], payload:{claims:result.claims, release:result.release} });
  push({ event_id:`${result.world_id}:fund-allocation`, event_type:'gross_net_fee_formula_subgroup_and_beneficiary_payment_state', evidence_class:'synthetic_control_distribution_state', authority:'fixture_world', source_event_ids:[`${result.world_id}:claims-release`], payload:{fund:result.fund, allocation:result.allocation, deductions:result.deductions} });
  push({ event_id:`${result.world_id}:unclaimed-governance`, event_type:'unclaimed_reversion_cy_pres_audit_objection_and_appeal_state', evidence_class:'synthetic_control_residual_state', authority:'fixture_world', source_event_ids:[`${result.world_id}:fund-allocation`], payload:{unclaimed:result.unclaimed, governance:result.governance, bound_but_unpaid_people:result.bound_but_unpaid_people} });
  push({ event_id:`${result.world_id}:classification`, event_type:'collective_distribution_mechanism_classified', evidence_class:'deterministic_control_classification', authority:'collective_distribution_compiler', source_event_ids:[`${result.world_id}:unclaimed-governance`], payload:{mechanism:result.mechanism, flags:result.flags} });
  push({ event_id:`${result.world_id}:interpretation`, event_type:'interpretation_sealed', evidence_class:'candidate_inference', authority:'collective_distribution_analyst', source_event_ids:[`${result.world_id}:classification`], payload:{allowed_interpretation:'synthetic representation, notice, claim, release, allocation, payment, residual, and audit state beneath one public distributed status', refused_promotions:['certification_as_adequate_representation','appointment_as_no_conflict','notice_sent_as_usable_notice','formal_optout_as_meaningful_exit','claim_route_as_population_remedy','gross_fund_as_beneficiary_payment','payment_file_as_audited_distribution','pro_rata_as_harm_responsive_fairness','release_as_informed_consent','distribution_as_binding_public_authority']} });
  return events;
}

export function validatePreferenceCollectiveDistributionChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('collective-distribution event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate collective-distribution event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`collective-distribution event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`collective-distribution event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event }; delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`collective-distribution event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id); previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceCollectiveDistributionFixture(fixture) {
  const errors = validatePreferenceCollectiveDistributionFixture(fixture);
  if (errors.length) throw new Error(`invalid preference collective-distribution fixture:\n- ${errors.join('\n- ')}`);
  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceCollectiveDistributionWorld(fixture, world);
    for (const key of EXPECTED_FLAG_KEYS) if (result.flags[key] !== world.expected_flags[key]) throw new Error(`world ${world.world_id} ${key} mismatch`);
    const chain = buildCollectiveDistributionChain(fixture, result);
    return { ...result, custody_chain:chain, custody_chain_head_sha256:chain.at(-1)?.event_sha256 ?? null };
  }).sort((left, right) => left.world_id.localeCompare(right.world_id));
  const countFlag = flag => worlds.filter(world => world.flags[flag] === true).length;
  const metrics = {
    world_count:worlds.length,
    distinct_distribution_governance_signatures:unique(worlds.map(world => world.distribution_governance_signature_sha256)).length,
    distinct_public_status_signatures:unique(worlds.map(world => world.public_status_signature_sha256)).length,
    complete_collective_distribution_worlds:countFlag('complete_collective_distribution'),
    representation_conflict_worlds:countFlag('representation_conflict_present'),
    notice_optout_failure_worlds:countFlag('notice_optout_failure_present'),
    claims_burden_low_takeup_worlds:countFlag('claims_burden_low_takeup_present'),
    formula_disparity_worlds:countFlag('formula_disparity_present'),
    cy_pres_diversion_worlds:countFlag('cy_pres_diversion_present'),
    fee_opacity_worlds:countFlag('fee_opacity_present'),
    overbroad_release_worlds:countFlag('overbroad_release_present'),
    full_affected_population_paid_worlds:countFlag('full_affected_population_paid'),
    full_reference_net_paid_worlds:countFlag('full_reference_net_paid'),
    reference_formula_match_worlds:countFlag('reference_formula_match'),
    total_people_paid:sum(worlds.map(world => world.allocation.people_paid)),
    total_bound_but_unpaid_people:sum(worlds.map(world => world.bound_but_unpaid_people)),
    total_amount_paid_to_affected:sum(worlds.map(world => world.allocation.amount_paid_to_affected)),
    total_durable_compensation_paid:sum(worlds.map(world => world.allocation.durable_compensation_paid)),
    total_unclaimed_or_redirected:sum(worlds.map(world => world.unclaimed.amount)),
    total_fees_incentives_and_deductions:sum(worlds.map(world => world.deductions)),
    binding_public_authority_worlds:0
  };
  for (const [key,value] of Object.entries(EXPECTED_METRICS)) if (!close(metrics[key], value)) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);
  return {
    schema_version:PREFERENCE_COLLECTIVE_DISTRIBUTION_BUILD_SCHEMA_VERSION,
    fixture_id:fixture.fixture_id,
    issue:fixture.issue,
    parent_program_issue:fixture.parent_program_issue,
    captured_at:fixture.captured_at,
    status:'collective_distribution_governance_equifinality_qualified',
    graph_effect:'none',
    counts_toward_thesis_evidence:false,
    conclusion_generated:false,
    real_world_evidence_state:'none',
    baseline:fixture.baseline,
    worlds,
    metrics,
    classification:{...fixture.expected_classification, preference_change_present:false},
    refusal_rules:fixture.required_refusal_rules,
    prohibited_inferences:fixture.prohibited_inferences,
    interpretation_contract:fixture.interpretation_contract
  };
}

export function validatePreferenceCollectiveDistributionBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_COLLECTIVE_DISTRIBUTION_BUILD_SCHEMA_VERSION) errors.push('preference collective-distribution build schema mismatch');
  if (compiled?.status !== 'collective_distribution_governance_equifinality_qualified') errors.push('compiled collective-distribution status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled collective-distribution graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled collective-distribution counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled collective-distribution conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled collective-distribution real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world => world.world_id), EXPECTED_WORLD_IDS)) errors.push('compiled collective-distribution worlds are incomplete');
  for (const [key,value] of Object.entries(EXPECTED_METRICS)) if (!close(compiled?.metrics?.[key], value)) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const [key,value] of Object.entries(EXPECTED_CLASSIFICATION)) if (compiled?.classification?.[key] !== value) errors.push(`compiled classification.${key} must equal ${JSON.stringify(value)}`);
  requireFalse(compiled?.classification?.preference_change_present, 'compiled preference_change_present', errors);
  for (const world of array(compiled?.worlds)) {
    validateExactObjectKeys(world?.flags, EXPECTED_FLAG_KEYS, `compiled world ${world?.world_id} flags`, errors);
    if (!/^[0-9a-f]{64}$/.test(text(world?.distribution_governance_signature_sha256))) errors.push(`world ${world?.world_id} distribution signature is invalid`);
    if (!/^[0-9a-f]{64}$/.test(text(world?.public_status_signature_sha256))) errors.push(`world ${world?.world_id} public-status signature is invalid`);
    errors.push(...validatePreferenceCollectiveDistributionChain(world?.custody_chain));
    const head = array(world?.custody_chain).at(-1)?.event_sha256 ?? null;
    if (world?.custody_chain_head_sha256 !== head) errors.push(`world ${world?.world_id} custody head mismatch`);
  }
  const byId = Object.fromEntries(array(compiled?.worlds).map(world => [world.world_id, world]));
  if (byId['adequate-representation-automatic-audited-distribution']?.flags?.complete_collective_distribution !== true) errors.push('complete world must preserve complete collective distribution');
  if (byId['representative-conflict-side-payment-skew']?.flags?.representation_conflict_present !== true) errors.push('conflict world must preserve representative conflict');
  if (byId['notice-failure-binds-unnotified-population']?.flags?.notice_optout_failure_present !== true) errors.push('notice world must preserve notice and opt-out failure');
  if (byId['claims-made-high-burden-low-takeup-reversion']?.flags?.claims_burden_low_takeup_present !== true) errors.push('claims world must preserve burden and low take-up');
  if (byId['algorithmic-formula-undercompensates-high-harm-group']?.flags?.formula_disparity_present !== true) errors.push('formula world must preserve subgroup disparity');
  if (byId['cy-pres-diversion-away-from-affected-population']?.flags?.cy_pres_diversion_present !== true) errors.push('cy-pres world must preserve diversion');
  if (byId['opaque-administrator-fees-and-deductions']?.flags?.fee_opacity_present !== true) errors.push('fee world must preserve opaque deductions');
  if (byId['overbroad-release-binds-excluded-unpaid-people']?.flags?.overbroad_release_present !== true) errors.push('release world must preserve overbroad binding');
  if (unique(compiled?.refusal_rules).length < 13) errors.push('compiled collective-distribution refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled collective-distribution caveat is required');
  return errors;
}

export function renderPreferenceCollectiveDistributionMarkdown(compiled) {
  const lines = [
    '# Collective representation, opt-out, release, and distribution-governance custody','',
    `**Status:** ${compiled.status}`,'',
    `**Worlds:** ${compiled.metrics.world_count}`,'',
    `**Public remedy status:** ${compiled.baseline.public_remedy_status}`,'',
    `**Gross remedy fund:** ${compiled.baseline.gross_remedy_fund}`,'',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,'',
    '## Candidate worlds',''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`,'',
      `- Mechanism: ${world.mechanism}`,
      `- Represented people: ${world.representation.represented_count}`,
      `- Conflict state: ${world.representation.conflict_state}`,
      `- Notice delivered: ${world.notice.delivered_count}`,
      `- Meaningful opt-out: ${world.notice.meaningful_opt_out}`,
      `- Approved claims: ${world.claims.approved_count}`,
      `- People bound: ${world.release.bound_count}`,
      `- People paid: ${world.allocation.people_paid}`,
      `- Net distributable: ${world.fund.net_distributable}`,
      `- Paid to affected people: ${world.allocation.amount_paid_to_affected}`,
      `- Unclaimed or redirected: ${world.unclaimed.amount}`,
      `- Audit state: ${world.governance.audit_state}`,
      `- Complete collective distribution: ${world.flags.complete_collective_distribution}`,
      `- Custody head: ${world.custody_chain_head_sha256}`,'');
  }
  lines.push('## Aggregate separations','');
  for (const [key,value] of Object.entries(compiled.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('','## Classification','');
  for (const [key,value] of Object.entries(compiled.classification)) lines.push(`- ${key}: ${value}`);
  lines.push('','## Refusal rules','');
  for (const rule of compiled.refusal_rules) lines.push(`- ${rule}`);
  lines.push('','## Prohibited inferences','');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
