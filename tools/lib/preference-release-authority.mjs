import { createHash } from 'node:crypto';

export const PREFERENCE_RELEASE_AUTHORITY_FIXTURE_SCHEMA_VERSION = 'preference-release-authority-fixture@1';
export const PREFERENCE_RELEASE_AUTHORITY_BUILD_SCHEMA_VERSION = 'preference-release-authority-build@1';

const EXPECTED_ACCESS_GROUP_IDS = ['COGNITIVE-ACCESS', 'LANGUAGE-ACCESS', 'STANDARD'];
const EXPECTED_WORLD_IDS = [
  'affiliate-and-nonparticipant-release-without-notice-or-consideration',
  'approved-narrow-release-replaced-by-broader-future-claims-version',
  'complete-accessible-comprehended-exitable-narrow-release',
  'formal-optout-with-short-deadline-high-friction-and-failed-exits',
  'language-and-accessibility-gaps-block-usable-comprehension-and-exit',
  'material-release-and-exit-terms-buried-in-overloaded-notice',
  'notice-delivered-but-mostly-unacknowledged-and-unread',
  'payment-acceptance-treated-as-assent-without-complete-release-understanding'
];
const EXPECTED_FLAG_KEYS = [
  'complete_notice_exit_release_path',
  'delivery_without_comprehension_present',
  'notice_overload_present',
  'accessibility_failure_present',
  'meaningful_exit_failure_present',
  'release_scope_drift_present',
  'future_claim_release_present',
  'nonparticipant_binding_present',
  'payment_as_consent_present',
  'approved_binding_version_mismatch_present',
  'independent_review_and_correction_complete',
  'notice_comprehension_complete'
];
const EPSILON = 1e-12;

function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function array(value) { return Array.isArray(value) ? value : []; }
function text(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set(array(values).map(value => text(value)).filter(Boolean))]; }
function sorted(values) { return [...values].sort((left, right) => String(left).localeCompare(String(right))); }
function sameMembers(left, right) { return JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right))); }
function sum(values) { return values.reduce((total, value) => total + Number(value), 0); }
function close(left, right, tolerance = EPSILON) { return Math.abs(Number(left) - Number(right)) <= tolerance; }
function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  return value;
}
function sha256(value) { return createHash('sha256').update(JSON.stringify(canonicalValue(value))).digest('hex'); }
function nonnegativeInteger(value) { return Number.isInteger(value) && value >= 0; }
function positiveInteger(value) { return Number.isInteger(value) && value > 0; }

function expectedClassification() {
  return {
    notice_delivery_identifies_received_understood_accessible_usable_notice: false,
    formal_optout_identifies_meaningful_exit: false,
    payment_acceptance_identifies_informed_release_agreement: false,
    approval_or_collective_judgment_identifies_consent_by_every_bound_person: false,
    approved_release_identifies_binding_release: false,
    release_label_identifies_operative_text_version_scope_or_time_horizon: false,
    narrow_disclosed_release_identifies_narrow_binding_release: false,
    representation_confers_authority_to_bind_nonparticipants_or_future_claimants: false,
    full_compensation_identifies_informed_release_or_objective_control: false,
    objection_or_appeal_identifies_effective_explanation_correction_or_exit: false,
    release_overbreadth_or_comprehension_failure_identifies_breach_coercion_misconduct_or_intent: false,
    public_all_claims_released_status_identifies_complete_informed_accessible_exit_capable_authorized_release: false,
    complete_notice_exit_release_supported_in_at_least_one_world: true,
    binding_public_authority_supported: false,
    manipulative_intent_inferable: false,
    real_world_effect_claimed: false
  };
}

function requiredMetrics() {
  return {
    world_count: 8,
    distinct_public_status_signatures: 1,
    distinct_release_authority_signatures: 8,
    complete_notice_exit_release_worlds: 1,
    delivery_without_comprehension_worlds: 4,
    notice_overload_worlds: 1,
    accessibility_failure_worlds: 1,
    meaningful_exit_failure_worlds: 5,
    release_scope_drift_worlds: 2,
    future_claim_release_worlds: 2,
    nonparticipant_binding_worlds: 1,
    payment_as_consent_worlds: 1,
    approved_binding_version_mismatch_worlds: 2,
    independent_review_and_correction_complete_worlds: 1,
    notice_comprehension_complete_worlds: 4,
    full_notice_delivery_worlds: 8,
    full_affected_payment_worlds: 8,
    total_affected_people_without_notice_comprehension: 245,
    total_failed_optout_attempts: 55,
    total_nonparticipant_bound_people: 20,
    binding_public_authority_worlds: 0
  };
}

function validatePublicClaim(claim, baseline, worldId, errors) {
  const expected = {
    technical_correction_state: baseline.technical_correction_state,
    final_proposal_id: baseline.final_proposal_id,
    public_release_status: baseline.public_release_status,
    affected_population: baseline.affected_population,
    people_paid: baseline.people_paid,
    amount_paid: baseline.amount_paid
  };
  if (JSON.stringify(claim) !== JSON.stringify(expected)) errors.push(`world ${worldId} must preserve the frozen public release claim`);
}

function validateNotice(notice, baseline, worldId, errors) {
  for (const key of ['notice_id','content_identity','operative_release_id_disclosed','assistance_state']) if (!text(notice?.[key])) errors.push(`world ${worldId} notice ${key} is required`);
  for (const key of ['version','operative_release_version_disclosed']) if (!positiveInteger(notice?.[key])) errors.push(`world ${worldId} notice ${key} must be a positive integer`);
  for (const key of ['sent_count','delivered_count','acknowledged_count','comprehended_count','language_covered_count','accessibility_covered_count']) if (!nonnegativeInteger(notice?.[key]) || notice[key] > baseline.affected_population) errors.push(`world ${worldId} notice ${key} must be within the affected population`);
  if (!(notice.sent_count >= notice.delivered_count && notice.delivered_count >= notice.acknowledged_count && notice.acknowledged_count >= notice.comprehended_count)) errors.push(`world ${worldId} notice counts do not form a valid custody chain`);
  for (const key of ['plain_language','material_terms_prominent','optout_instructions_complete']) if (typeof notice?.[key] !== 'boolean') errors.push(`world ${worldId} notice ${key} must be boolean`);
}

function validateExit(exit, worldId, errors) {
  for (const key of ['formal_optout_available','assistance_available','meaningful_exit']) if (typeof exit?.[key] !== 'boolean') errors.push(`world ${worldId} exit ${key} must be boolean`);
  if (!positiveInteger(exit?.deadline_days)) errors.push(`world ${worldId} exit deadline_days must be positive`);
  for (const key of ['attempt_count','success_count','failure_count']) if (!nonnegativeInteger(exit?.[key])) errors.push(`world ${worldId} exit ${key} must be a non-negative integer`);
  if (exit.attempt_count !== exit.success_count + exit.failure_count) errors.push(`world ${worldId} opt-out attempts must equal successes plus failures`);
  for (const key of ['late_review_state','friction_state']) if (!text(exit?.[key])) errors.push(`world ${worldId} exit ${key} is required`);
}

function validateRelease(release, baseline, exit, worldId, errors) {
  for (const key of ['approved_release_id','approved_scope','binding_release_id','binding_scope','covered_claims_state','future_claims_state','unknown_claims_state','affiliate_scope']) if (!text(release?.[key])) errors.push(`world ${worldId} release ${key} is required`);
  for (const key of ['approved_version','binding_version']) if (!positiveInteger(release?.[key])) errors.push(`world ${worldId} release ${key} must be a positive integer`);
  for (const key of ['nonparticipant_binding_count','bound_population_count','consideration_covered_population_count','operative_release_disclosed_count','operative_release_comprehended_count','explicit_agreement_count']) if (!nonnegativeInteger(release?.[key])) errors.push(`world ${worldId} release ${key} must be a non-negative integer`);
  if (release.bound_population_count !== baseline.affected_population - exit.success_count + release.nonparticipant_binding_count) errors.push(`world ${worldId} bound population does not reconcile with affected people, successful exits, and nonparticipants`);
  if (release.consideration_covered_population_count > baseline.affected_population) errors.push(`world ${worldId} consideration coverage exceeds the affected population`);
  if (release.operative_release_disclosed_count > baseline.affected_population || release.operative_release_comprehended_count > release.operative_release_disclosed_count || release.explicit_agreement_count > baseline.affected_population) errors.push(`world ${worldId} release disclosure, comprehension, or agreement counts are invalid`);
  for (const key of ['payment_acceptance_treated_as_assent','scope_drift','version_drift','authority_to_bind_nonparticipants']) if (typeof release?.[key] !== 'boolean') errors.push(`world ${worldId} release ${key} must be boolean`);
  if (release.nonparticipant_binding_count > 0 && release.bound_population_count <= baseline.affected_population) errors.push(`world ${worldId} nonparticipant binding requires an expanded bound population`);
  if (release.payment_acceptance_treated_as_assent && release.explicit_agreement_count !== 0) errors.push(`world ${worldId} payment-as-assent must preserve zero explicit agreement`);
}

function validateGovernance(governance, worldId, errors) {
  for (const key of ['independent_review_state','comprehension_test_state','objection_route','appeal_route','correction_state','release_reformation_state','public_explanation_state']) if (!text(governance?.[key])) errors.push(`world ${worldId} governance ${key} is required`);
  if (governance?.binding_public_authority !== false) errors.push(`world ${worldId} binding_public_authority must remain false`);
}

export function validatePreferenceReleaseAuthorityFixture(fixture) {
  const errors = [];
  const baseline = object(fixture?.baseline);
  const accessGroups = array(baseline.access_groups);
  const worlds = array(fixture?.worlds);
  if (fixture?.schema_version !== PREFERENCE_RELEASE_AUTHORITY_FIXTURE_SCHEMA_VERSION) errors.push('preference release-authority fixture schema mismatch');
  if (!text(fixture?.fixture_id)) errors.push('fixture_id is required');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status must remain synthetic_control');
  if (fixture?.graph_effect !== 'none') errors.push('fixture graph_effect must remain none');
  if (fixture?.counts_toward_thesis_evidence !== false) errors.push('fixture must not count toward thesis evidence');
  const expectedBaseline = {
    technical_correction_state: 'complete',
    final_proposal_id: 'A1',
    public_release_status: 'all_claims_released',
    affected_population: 100,
    represented_population: 100,
    people_paid: 100,
    amount_paid: 1800,
    currency: 'synthetic_units',
    reference_notice_id: 'NOTICE-V1',
    reference_notice_version: 1,
    reference_release_id: 'RELEASE-INCIDENT-V1',
    reference_release_version: 1,
    reference_release_scope: 'incident_specific_existing_claims',
    reference_optout_window_days: 60
  };
  for (const [key, value] of Object.entries(expectedBaseline)) if (baseline[key] !== value) errors.push(`baseline ${key} must remain ${JSON.stringify(value)}`);
  if (!sameMembers(accessGroups.map(group => group?.group_id), EXPECTED_ACCESS_GROUP_IDS) || unique(accessGroups.map(group => group?.group_id)).length !== accessGroups.length) errors.push('baseline access groups must contain exactly the required groups');
  if (sum(accessGroups.map(group => group.count)) !== baseline.affected_population) errors.push('baseline access groups must sum to the affected population');
  for (const group of accessGroups) if (!positiveInteger(group?.count) || !text(group?.language_requirement) || !text(group?.accessibility_requirement)) errors.push(`baseline access group ${group?.group_id} is incomplete`);
  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture must contain exactly the eight required release-authority worlds');
  if (unique(worlds.map(world => world?.world_id)).length !== worlds.length) errors.push('world IDs must be unique');
  for (const world of worlds) {
    const worldId = text(world?.world_id) || '(missing world ID)';
    validatePublicClaim(object(world?.public_claim), baseline, worldId, errors);
    validateNotice(object(world?.notice), baseline, worldId, errors);
    validateExit(object(world?.exit), worldId, errors);
    validateRelease(object(world?.release), baseline, object(world?.exit), worldId, errors);
    validateGovernance(object(world?.governance), worldId, errors);
    const flags = object(world?.expected_flags);
    if (!sameMembers(Object.keys(flags), EXPECTED_FLAG_KEYS)) errors.push(`world ${worldId} expected_flags must contain exactly the required release-authority flags`);
    for (const key of EXPECTED_FLAG_KEYS) if (typeof flags[key] !== 'boolean') errors.push(`world ${worldId} expected_flags.${key} must be boolean`);
  }
  for (const [key, value] of Object.entries(requiredMetrics())) if (fixture?.expected_metrics?.[key] !== value) errors.push(`expected_metrics.${key} must equal ${value}`);
  for (const [key, value] of Object.entries(expectedClassification())) if (fixture?.expected_classification?.[key] !== value) errors.push(`expected_classification.${key} must equal ${JSON.stringify(value)}`);
  const mandatoryRules = [
    'notice_sent_or_delivered_is_not_notice_received_understood_accessible_or_usable',
    'formal_optout_right_is_not_meaningful_exit_opportunity',
    'payment_acceptance_is_not_informed_agreement_to_release_terms',
    'settlement_approval_or_collective_judgment_is_not_consent_by_every_bound_person',
    'approved_release_is_not_binding_release',
    'release_label_is_not_operative_text_version_scope_or_time_horizon',
    'narrow_disclosed_release_is_not_narrow_executed_or_binding_release',
    'representation_is_not_authority_to_bind_nonparticipants_or_future_claimants',
    'full_compensation_is_not_informed_release_or_legitimate_objective_control',
    'objection_or_appeal_route_is_not_effective_explanation_correction_or_exit',
    'release_overbreadth_or_comprehension_failure_is_not_proof_of_breach_coercion_manipulation_misconduct_or_intent',
    'public_all_claims_released_status_is_not_complete_informed_accessible_exit_capable_authorized_release',
    'release_authority_claim_requires_population_notice_comprehension_accessibility_exit_operative_release_future_nonparty_scope_assent_payment_representation_binding_correction_durability_and_authority_custody'
  ];
  const rules = unique(fixture?.required_refusal_rules);
  for (const rule of mandatoryRules) if (!rules.includes(rule)) errors.push(`required refusal rule missing: ${rule}`);
  if (unique(fixture?.prohibited_inferences).length < 10) errors.push('prohibited inference ledger is incomplete');
  if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.what_this_is) || !text(fixture?.interpretation_contract?.what_this_is_not) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract is incomplete');
  return errors;
}

export function simulatePreferenceReleaseAuthorityWorld(fixture, world) {
  const baseline = object(fixture.baseline);
  const deliveryWithoutComprehension = world.notice.delivered_count === baseline.affected_population && world.notice.comprehended_count < baseline.affected_population;
  const noticeOverload = world.notice.plain_language !== true || world.notice.material_terms_prominent !== true;
  const accessibilityFailure = world.notice.language_covered_count < baseline.affected_population || world.notice.accessibility_covered_count < baseline.affected_population;
  const nonparticipantBinding = world.release.nonparticipant_binding_count > 0;
  const meaningfulExitFailure = world.exit.meaningful_exit !== true || nonparticipantBinding;
  const releaseScopeDrift = world.release.scope_drift === true;
  const futureClaimRelease = world.release.future_claims_state === 'included' || world.release.unknown_claims_state === 'included';
  const paymentAsConsent = world.release.payment_acceptance_treated_as_assent === true;
  const versionMismatch = world.release.approved_release_id !== world.release.binding_release_id || world.release.approved_version !== world.release.binding_version;
  const noticeComprehensionComplete = world.notice.comprehended_count === baseline.affected_population
    && world.notice.language_covered_count === baseline.affected_population
    && world.notice.accessibility_covered_count === baseline.affected_population;
  const independentReviewAndCorrectionComplete = world.governance.independent_review_state === 'complete'
    && world.governance.comprehension_test_state === 'complete'
    && world.governance.objection_route === 'available'
    && world.governance.appeal_route === 'available'
    && world.governance.correction_state === 'operational_and_receipted'
    && world.governance.release_reformation_state === 'available'
    && world.governance.public_explanation_state === 'complete';
  const completePath = noticeComprehensionComplete
    && world.notice.plain_language === true
    && world.notice.material_terms_prominent === true
    && world.notice.operative_release_id_disclosed === baseline.reference_release_id
    && world.notice.operative_release_version_disclosed === baseline.reference_release_version
    && world.exit.meaningful_exit === true
    && !releaseScopeDrift
    && !futureClaimRelease
    && !nonparticipantBinding
    && !paymentAsConsent
    && !versionMismatch
    && world.release.binding_release_id === baseline.reference_release_id
    && world.release.binding_version === baseline.reference_release_version
    && world.release.binding_scope === baseline.reference_release_scope
    && world.release.operative_release_disclosed_count === baseline.affected_population
    && world.release.operative_release_comprehended_count === baseline.affected_population
    && world.release.explicit_agreement_count === baseline.affected_population
    && independentReviewAndCorrectionComplete;
  const flags = {
    complete_notice_exit_release_path: completePath,
    delivery_without_comprehension_present: deliveryWithoutComprehension,
    notice_overload_present: noticeOverload,
    accessibility_failure_present: accessibilityFailure,
    meaningful_exit_failure_present: meaningfulExitFailure,
    release_scope_drift_present: releaseScopeDrift,
    future_claim_release_present: futureClaimRelease,
    nonparticipant_binding_present: nonparticipantBinding,
    payment_as_consent_present: paymentAsConsent,
    approved_binding_version_mismatch_present: versionMismatch,
    independent_review_and_correction_complete: independentReviewAndCorrectionComplete,
    notice_comprehension_complete: noticeComprehensionComplete
  };
  const fullNoticeDelivery = world.notice.delivered_count === baseline.affected_population;
  const fullAffectedPayment = world.public_claim.people_paid === baseline.affected_population && world.public_claim.amount_paid === baseline.amount_paid;
  const affectedWithoutComprehension = baseline.affected_population - world.notice.comprehended_count;
  const signatureState = { notice: world.notice, exit: world.exit, release: world.release, governance: world.governance, flags };
  return {
    world_id: world.world_id,
    public_claim: world.public_claim,
    notice: world.notice,
    exit: world.exit,
    release: world.release,
    governance: world.governance,
    flags,
    full_notice_delivery: fullNoticeDelivery,
    full_affected_payment: fullAffectedPayment,
    affected_people_without_notice_comprehension: affectedWithoutComprehension,
    failed_optout_attempts: world.exit.failure_count,
    nonparticipant_bound_people: world.release.nonparticipant_binding_count,
    public_status_signature_sha256: sha256(world.public_claim),
    release_authority_signature_sha256: sha256(signatureState)
  };
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function buildReleaseChain(fixture, result) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  push({event_id:`${result.world_id}:baseline`,event_type:'affected_population_payment_reference_notice_release_and_public_status_snapshot',evidence_class:'synthetic_control_truth',authority:'fixture_author',source_event_ids:[],payload:fixture.baseline});
  push({event_id:`${result.world_id}:notice`,event_type:'notice_delivery_acknowledgement_comprehension_language_and_accessibility_state_recorded',evidence_class:'synthetic_control_notice',authority:'fixture_world',source_event_ids:[`${result.world_id}:baseline`],payload:result.notice});
  push({event_id:`${result.world_id}:exit`,event_type:'formal_and_meaningful_collective_exit_state_recorded',evidence_class:'synthetic_control_exit',authority:'fixture_world',source_event_ids:[`${result.world_id}:notice`],payload:result.exit});
  push({event_id:`${result.world_id}:release`,event_type:'approved_disclosed_binding_future_nonparty_and_assent_release_state_recorded',evidence_class:'synthetic_control_release',authority:'fixture_world',source_event_ids:[`${result.world_id}:exit`],payload:result.release});
  push({event_id:`${result.world_id}:governance`,event_type:'review_objection_appeal_correction_reformation_and_authority_state_recorded',evidence_class:'synthetic_control_governance',authority:'fixture_world',source_event_ids:[`${result.world_id}:release`],payload:result.governance});
  push({event_id:`${result.world_id}:consequence`,event_type:'comprehension_exit_binding_and_nonparticipant_consequence_resolved',evidence_class:'deterministic_control_consequence',authority:'release_authority_compiler',source_event_ids:[`${result.world_id}:governance`],payload:{affected_people_without_notice_comprehension:result.affected_people_without_notice_comprehension,failed_optout_attempts:result.failed_optout_attempts,nonparticipant_bound_people:result.nonparticipant_bound_people,full_notice_delivery:result.full_notice_delivery,full_affected_payment:result.full_affected_payment}});
  push({event_id:`${result.world_id}:classification`,event_type:'release_notice_exit_and_binding_authority_mechanism_classified',evidence_class:'deterministic_control_classification',authority:'release_authority_compiler',source_event_ids:[`${result.world_id}:consequence`],payload:result.flags});
  push({event_id:`${result.world_id}:interpretation`,event_type:'interpretation_sealed',evidence_class:'candidate_inference',authority:'release_authority_analyst',source_event_ids:[`${result.world_id}:classification`],payload:{allowed_interpretation:'synthetic notice, comprehension, accessibility, exit, release version, future and nonparticipant scope, assent, correction, and authority state behind one public all-claims-released status',refused_promotions:['delivery_as_comprehension','formal_optout_as_meaningful_exit','payment_as_informed_release_agreement','approval_or_judgment_as_consent','approved_release_as_binding_release','release_label_as_operative_text_scope_or_time','representation_as_nonparticipant_or_future_claimant_authority','full_compensation_as_informed_release_or_objective_control','appeal_route_as_effective_explanation_correction_or_exit','release_failure_as_breach_coercion_misconduct_or_intent','public_release_status_as_authorized_release']}});
  return events;
}

export function validatePreferenceReleaseAuthorityChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('release-authority event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate release-authority event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`release-authority event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`release-authority event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`release-authority event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  return errors;
}

export function compilePreferenceReleaseAuthorityFixture(fixture) {
  const errors = validatePreferenceReleaseAuthorityFixture(fixture);
  if (errors.length) throw new Error(`invalid preference release-authority fixture:\n- ${errors.join('\n- ')}`);
  const worlds = fixture.worlds.map(world => {
    const result = simulatePreferenceReleaseAuthorityWorld(fixture, world);
    for (const key of EXPECTED_FLAG_KEYS) if (result.flags[key] !== world.expected_flags[key]) throw new Error(`world ${world.world_id} ${key} mismatch`);
    const chain = buildReleaseChain(fixture, result);
    return {...result,custody_chain:chain,custody_chain_head_sha256:chain.at(-1)?.event_sha256 ?? null};
  }).sort((left,right)=>left.world_id.localeCompare(right.world_id));
  const metrics = {
    world_count: worlds.length,
    distinct_public_status_signatures: unique(worlds.map(world=>world.public_status_signature_sha256)).length,
    distinct_release_authority_signatures: unique(worlds.map(world=>world.release_authority_signature_sha256)).length,
    complete_notice_exit_release_worlds: worlds.filter(world=>world.flags.complete_notice_exit_release_path).length,
    delivery_without_comprehension_worlds: worlds.filter(world=>world.flags.delivery_without_comprehension_present).length,
    notice_overload_worlds: worlds.filter(world=>world.flags.notice_overload_present).length,
    accessibility_failure_worlds: worlds.filter(world=>world.flags.accessibility_failure_present).length,
    meaningful_exit_failure_worlds: worlds.filter(world=>world.flags.meaningful_exit_failure_present).length,
    release_scope_drift_worlds: worlds.filter(world=>world.flags.release_scope_drift_present).length,
    future_claim_release_worlds: worlds.filter(world=>world.flags.future_claim_release_present).length,
    nonparticipant_binding_worlds: worlds.filter(world=>world.flags.nonparticipant_binding_present).length,
    payment_as_consent_worlds: worlds.filter(world=>world.flags.payment_as_consent_present).length,
    approved_binding_version_mismatch_worlds: worlds.filter(world=>world.flags.approved_binding_version_mismatch_present).length,
    independent_review_and_correction_complete_worlds: worlds.filter(world=>world.flags.independent_review_and_correction_complete).length,
    notice_comprehension_complete_worlds: worlds.filter(world=>world.flags.notice_comprehension_complete).length,
    full_notice_delivery_worlds: worlds.filter(world=>world.full_notice_delivery).length,
    full_affected_payment_worlds: worlds.filter(world=>world.full_affected_payment).length,
    total_affected_people_without_notice_comprehension: sum(worlds.map(world=>world.affected_people_without_notice_comprehension)),
    total_failed_optout_attempts: sum(worlds.map(world=>world.failed_optout_attempts)),
    total_nonparticipant_bound_people: sum(worlds.map(world=>world.nonparticipant_bound_people)),
    binding_public_authority_worlds: worlds.filter(world=>world.governance.binding_public_authority===true).length
  };
  for (const [key,value] of Object.entries(fixture.expected_metrics)) if (metrics[key] !== value) throw new Error(`compiled metric ${key} mismatch: expected ${value}, observed ${metrics[key]}`);
  return {
    schema_version:PREFERENCE_RELEASE_AUTHORITY_BUILD_SCHEMA_VERSION,
    fixture_id:fixture.fixture_id,
    issue:fixture.issue,
    parent_program_issue:fixture.parent_program_issue,
    captured_at:fixture.captured_at,
    status:'release_notice_exit_and_binding_authority_equifinality_qualified',
    graph_effect:'none',
    counts_toward_thesis_evidence:false,
    conclusion_generated:false,
    real_world_evidence_state:'none',
    baseline:fixture.baseline,
    worlds,
    metrics,
    classification:{...fixture.expected_classification,preference_change_present:false},
    refusal_rules:fixture.required_refusal_rules,
    prohibited_inferences:fixture.prohibited_inferences,
    interpretation_contract:fixture.interpretation_contract
  };
}

export function validatePreferenceReleaseAuthorityBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_RELEASE_AUTHORITY_BUILD_SCHEMA_VERSION) errors.push('preference release-authority build schema mismatch');
  if (compiled?.status !== 'release_notice_exit_and_binding_authority_equifinality_qualified') errors.push('compiled release-authority status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled release-authority graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('compiled release-authority must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('compiled release-authority must not generate a real-world conclusion');
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled release-authority real_world_evidence_state must remain none');
  if (!sameMembers(array(compiled?.worlds).map(world=>world.world_id),EXPECTED_WORLD_IDS)) errors.push('compiled release-authority worlds are incomplete');
  for (const [key,value] of Object.entries(requiredMetrics())) if (!close(compiled?.metrics?.[key],value)) errors.push(`compiled metric ${key} must equal ${value}`);
  for (const [key,value] of Object.entries(expectedClassification())) if (compiled?.classification?.[key] !== value) errors.push(`compiled classification.${key} must equal ${JSON.stringify(value)}`);
  if (compiled?.classification?.preference_change_present !== false) errors.push('compiled release-authority must not claim preference change');
  for (const world of array(compiled?.worlds)) {
    if (world?.public_claim?.public_release_status !== 'all_claims_released' || world?.public_claim?.affected_population !== 100 || world?.public_claim?.people_paid !== 100 || world?.public_claim?.amount_paid !== 1800) errors.push(`world ${world?.world_id} must preserve the frozen public release claim`);
    if (world?.full_notice_delivery !== true || world?.full_affected_payment !== true) errors.push(`world ${world?.world_id} must preserve full notice delivery and affected payment`);
    for (const field of ['public_status_signature_sha256','release_authority_signature_sha256']) if (!/^[0-9a-f]{64}$/.test(text(world?.[field]))) errors.push(`world ${world?.world_id} ${field} is invalid`);
    errors.push(...validatePreferenceReleaseAuthorityChain(world?.custody_chain));
    if (array(world?.custody_chain).at(-1)?.event_sha256 !== world?.custody_chain_head_sha256) errors.push(`world ${world?.world_id} custody head mismatch`);
  }
  const byId = Object.fromEntries(array(compiled?.worlds).map(world=>[world.world_id,world]));
  if (byId['complete-accessible-comprehended-exitable-narrow-release']?.flags?.complete_notice_exit_release_path !== true) errors.push('positive release world must preserve one complete notice, exit, and narrow-release path');
  if (byId['notice-delivered-but-mostly-unacknowledged-and-unread']?.flags?.delivery_without_comprehension_present !== true) errors.push('unread-notice world must preserve delivery without comprehension');
  if (byId['material-release-and-exit-terms-buried-in-overloaded-notice']?.flags?.notice_overload_present !== true) errors.push('overloaded-notice world must preserve buried material terms');
  if (byId['language-and-accessibility-gaps-block-usable-comprehension-and-exit']?.flags?.accessibility_failure_present !== true) errors.push('accessibility world must preserve language and accessibility failure');
  if (byId['formal-optout-with-short-deadline-high-friction-and-failed-exits']?.flags?.meaningful_exit_failure_present !== true) errors.push('opt-out world must preserve formal but unusable exit');
  const drift = byId['approved-narrow-release-replaced-by-broader-future-claims-version'];
  if (drift?.flags?.release_scope_drift_present !== true || drift?.flags?.approved_binding_version_mismatch_present !== true || drift?.flags?.future_claim_release_present !== true) errors.push('release-drift world must preserve binding-version and future-claim expansion');
  if (byId['affiliate-and-nonparticipant-release-without-notice-or-consideration']?.flags?.nonparticipant_binding_present !== true) errors.push('nonparticipant world must preserve expanded binding without notice or consideration');
  if (byId['payment-acceptance-treated-as-assent-without-complete-release-understanding']?.flags?.payment_as_consent_present !== true) errors.push('payment-as-assent world must preserve payment without complete release understanding');
  if (unique(compiled?.refusal_rules).length < 13) errors.push('compiled release-authority refusal ledger is incomplete');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled release-authority caveat is required');
  return errors;
}

export function renderPreferenceReleaseAuthorityMarkdown(compiled) {
  const lines = [
    '# Release scope, notice comprehension, collective exit, and binding-authority custody','',
    `**Status:** ${compiled.status}`,'',
    `**Worlds:** ${compiled.metrics.world_count}`,'',
    `**Public release-status signatures:** ${compiled.metrics.distinct_public_status_signatures}`,'',
    '> '+compiled.interpretation_contract.copy_ready_caveat,'',
    '## Frozen release ledger','',
    `- Technical correction: ${compiled.baseline.technical_correction_state}`,
    `- Final proposal: ${compiled.baseline.final_proposal_id}`,
    `- Public release status: ${compiled.baseline.public_release_status}`,
    `- Affected population: ${compiled.baseline.affected_population}`,
    `- People paid: ${compiled.baseline.people_paid}`,
    `- Amount paid: ${compiled.baseline.amount_paid}`,'',
    '## Candidate worlds',''
  ];
  for (const world of compiled.worlds) {
    lines.push(`### ${world.world_id}`,'');
    lines.push(`- Notice comprehension: ${world.notice.comprehended_count}/100`);
    lines.push(`- Meaningful exit: ${world.exit.meaningful_exit}`);
    lines.push(`- Approved release: ${world.release.approved_release_id}@${world.release.approved_version}`);
    lines.push(`- Binding release: ${world.release.binding_release_id}@${world.release.binding_version}`);
    lines.push(`- Complete notice-exit-release path: ${world.flags.complete_notice_exit_release_path}`);
    lines.push(`- Delivery without comprehension: ${world.flags.delivery_without_comprehension_present}`);
    lines.push(`- Accessibility failure: ${world.flags.accessibility_failure_present}`);
    lines.push(`- Release scope drift: ${world.flags.release_scope_drift_present}`);
    lines.push(`- Future claims released: ${world.flags.future_claim_release_present}`);
    lines.push(`- Nonparticipant binding: ${world.flags.nonparticipant_binding_present}`);
    lines.push(`- Payment as consent: ${world.flags.payment_as_consent_present}`);
    lines.push(`- Failed opt-out attempts: ${world.failed_optout_attempts}`);
    lines.push(`- Custody head: ${world.custody_chain_head_sha256}`,'');
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
