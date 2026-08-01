import { createHash } from 'node:crypto';

export const REPRESENTATION_CUSTODY_SCHEMA_VERSION = 'preference-representation-custody@1';
export const REPRESENTATION_CUSTODY_BUILD_SCHEMA_VERSION = 'preference-representation-custody-build@1';

const STATE_ORDER = ['RC-00', 'RC-01', 'RC-02', 'RC-03', 'RC-04', 'RC-05'];
const REQUIRED_RECEIPT_CLASSES = new Set([
  'participant_policy_primary_public',
  'participant_terms_primary_public',
  'participant_product_primary_public',
  'client_methodology_primary_public',
  'client_terms_primary_public',
  'client_policy_primary_public'
]);
const REQUIRED_OPERATIONAL_TRUE = [
  'individual_source_grounding_confirmed',
  'participant_chooses_training_information_confirmed',
  'participant_trains_and_updates_twin_confirmed',
  'participant_reviews_and_rates_twin_answers_confirmed',
  'participant_can_correct_data_confirmed',
  'participant_can_request_deletion_confirmed',
  'participant_can_withdraw_consent_confirmed',
  'participant_can_object_to_processing_confirmed',
  'participant_has_data_portability_right_confirmed',
  'participant_may_receive_task_rewards_confirmed',
  'participant_notified_of_twin_task_answer_and_reward_claimed',
  'special_category_data_requires_explicit_consent_confirmed',
  'clients_receive_anonymised_not_identifiable_outputs_confirmed'
];
const REQUIRED_PLATFORM_TRUE = [
  'anonymised_user_content_license_to_platform_confirmed',
  'platform_owns_models_and_underlying_systems_confirmed',
  'platform_controls_task_types_availability_and_frequency_confirmed',
  'platform_controls_reward_and_redemption_rules_confirmed',
  'inactive_or_terminated_accounts_may_forfeit_unredeemed_rewards_confirmed',
  'platform_controls_question_admissibility_policy_confirmed',
  'client_defines_audience_selection_criteria_confirmed'
];
const REQUIRED_UNRESOLVED_FALSE = [
  'legal_assignment_of_twin_ownership_to_participant_publicly_recovered',
  'task_specific_client_identity_disclosed_before_execution_publicly_recovered',
  'task_specific_purpose_disclosed_before_execution_publicly_recovered',
  'participant_can_refuse_each_question_before_twin_answers_publicly_recovered',
  'participant_reviews_answer_before_client_delivery_publicly_recovered',
  'participant_can_retract_already_delivered_anonymised_answer_publicly_recovered',
  'deletion_propagation_to_model_backups_and_prior_outputs_publicly_recovered',
  'reward_rate_and_client_value_share_formula_publicly_recovered',
  'participant_can_control_audience_ontology_or_aggregation_publicly_recovered',
  'participant_can_control_client_interpretation_or_downstream_action_publicly_recovered',
  'participants_have_collective_bargaining_or_group_disposition_publicly_recovered',
  'represented_people_have_binding_public_authority_publicly_recovered'
];

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

function countBy(values, key) {
  const counts = {};
  for (const value of array(values)) {
    const label = text(value?.[key]) || 'unknown';
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
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

function requireTrue(value, label, errors) {
  if (value !== true) errors.push(`${label} must remain true`);
}

function requireFalse(value, label, errors) {
  if (value !== false) errors.push(`${label} must remain false`);
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function supportedStatePattern(states) {
  return Object.fromEntries(array(states).map(state => [state.state_id, state.supported_in_case]));
}

function highestSupportedState(states) {
  const supported = array(states)
    .filter(state => state.supported_in_case === true)
    .map(state => state.state_id)
    .filter(stateId => STATE_ORDER.includes(stateId));
  return supported.sort((left, right) => STATE_ORDER.indexOf(right) - STATE_ORDER.indexOf(left))[0] ?? null;
}

export function validateRepresentationCustodyPacket(packet) {
  const errors = [];
  const ecosystem = object(packet?.ecosystem);
  const receipts = array(packet?.receipts);
  const states = array(packet?.representation_states);
  const operational = object(packet?.operational_rights);
  const platform = object(packet?.platform_retained_powers);
  const unresolved = object(packet?.unresolved_control_fields);
  const ownership = object(packet?.ownership_language);
  const value = object(packet?.value_and_exit);
  const verdict = object(packet?.classification_verdict);

  if (packet?.schema_version !== REPRESENTATION_CUSTODY_SCHEMA_VERSION) errors.push('representation-custody schema mismatch');
  if (!text(packet?.case_id)) errors.push('case_id is required');
  if (packet?.status !== 'bounded_individual_representation_custody_admitted_collective_authority_unresolved') errors.push('representation-custody status mismatch');
  if (packet?.classification !== 'individual_representation_custody_positive_control') errors.push('representation-custody classification mismatch');
  if (packet?.graph_effect !== 'none') errors.push('representation-custody graph_effect must remain none');
  requireFalse(packet?.counts_toward_thesis_evidence, 'counts_toward_thesis_evidence', errors);
  if (packet?.publication_status !== 'bounded_rights_and_control_surface') errors.push('publication status must remain bounded_rights_and_control_surface');

  for (const key of ['participant_surface', 'client_surface', 'operator_public_name', 'representation_object', 'client_output_object']) {
    if (!text(ecosystem[key])) errors.push(`ecosystem.${key} is required`);
  }
  requireFalse(ecosystem.operator_identity_reconciliation_complete, 'ecosystem.operator_identity_reconciliation_complete', errors);

  if (receipts.length < 6) errors.push('representation-custody packet requires at least six receipts');
  const receiptIds = receipts.map(receipt => text(receipt?.receipt_id));
  if (unique(receiptIds).length !== receipts.length) errors.push('representation-custody receipt IDs must be unique');
  for (const receipt of receipts) {
    const id = text(receipt?.receipt_id) || '(missing receipt ID)';
    if (!text(receipt?.url) || !text(receipt?.receipt_id)) errors.push(`receipt ${id} requires identity and URL`);
    if (!REQUIRED_RECEIPT_CLASSES.has(receipt?.source_class)) errors.push(`receipt ${id} has invalid source class ${receipt?.source_class}`);
    if (!array(receipt?.supports).length) errors.push(`receipt ${id} must declare bounded support`);
  }
  for (const requiredClass of REQUIRED_RECEIPT_CLASSES) {
    if (!receipts.some(receipt => receipt.source_class === requiredClass)) errors.push(`missing representation-custody receipt source class ${requiredClass}`);
  }

  if (!sameMembers(states.map(state => state?.state_id), STATE_ORDER)) errors.push('representation states must contain exactly RC-00 through RC-05');
  for (const state of states) {
    if (!text(state?.name) || !text(state?.required_state) || typeof state?.supported_in_case !== 'boolean') errors.push(`representation state ${state?.state_id} is incomplete`);
  }
  const pattern = supportedStatePattern(states);
  const expectedPattern = {
    'RC-00': false,
    'RC-01': true,
    'RC-02': true,
    'RC-03': true,
    'RC-04': false,
    'RC-05': false
  };
  for (const stateId of STATE_ORDER) {
    if (pattern[stateId] !== expectedPattern[stateId]) errors.push(`representation state ${stateId} support must remain ${expectedPattern[stateId]}`);
  }

  for (const key of REQUIRED_OPERATIONAL_TRUE) requireTrue(operational[key], `operational_rights.${key}`, errors);
  requireFalse(operational.participant_data_used_to_train_third_party_models, 'operational_rights.participant_data_used_to_train_third_party_models', errors);

  for (const key of REQUIRED_PLATFORM_TRUE) requireTrue(platform[key], `platform_retained_powers.${key}`, errors);
  requireFalse(platform.client_controls_downstream_decision_confirmed, 'platform_retained_powers.client_controls_downstream_decision_confirmed', errors);

  for (const key of REQUIRED_UNRESOLVED_FALSE) requireFalse(unresolved[key], `unresolved_control_fields.${key}`, errors);

  for (const key of ['marketing_claim', 'legal_user_content_position', 'platform_ip_position', 'classification']) {
    if (!text(ownership[key])) errors.push(`ownership_language.${key} is required`);
  }
  requireFalse(ownership.legal_twin_ownership_assignment_publicly_recovered, 'ownership_language.legal_twin_ownership_assignment_publicly_recovered', errors);
  if (ownership.classification !== 'marketing_ownership_language_present_legal_twin_title_unresolved') errors.push('ownership classification mismatch');

  for (const key of [
    'participant_reward_path_confirmed',
    'withdrawal_threshold_and_redemption_conditions_platform_controlled',
    'account_deletion_path_confirmed',
    'data_access_correction_erasure_objection_and_portability_rights_confirmed',
    'unredeemed_reward_forfeiture_risk_confirmed'
  ]) requireTrue(value[key], `value_and_exit.${key}`, errors);
  for (const key of [
    'reward_amount_or_revenue_share_formula_publicly_recovered',
    'historical_anonymised_output_recall_right_publicly_recovered'
  ]) requireFalse(value[key], `value_and_exit.${key}`, errors);

  for (const key of [
    'individual_representation_grounding_confirmed',
    'individual_training_update_review_and_correction_rights_confirmed',
    'individual_deletion_withdrawal_objection_and_portability_rights_confirmed',
    'participant_reward_path_confirmed',
    'client_pii_exclusion_confirmed'
  ]) requireTrue(verdict[key], `classification_verdict.${key}`, errors);
  if (verdict.highest_supported_representation_state !== 'RC-03') errors.push('highest supported representation state must remain RC-03');
  for (const key of [
    'pre_task_specific_purpose_and_client_control_supported',
    'legal_twin_ownership_assignment_supported',
    'participant_controls_aggregation_interpretation_or_downstream_action_supported',
    'collective_bargaining_supported',
    'binding_public_authority_supported',
    'complete_economic_fairness_supported',
    'real_world_causal_effect_claimed',
    'manipulative_intent_inferable'
  ]) requireFalse(verdict[key], `classification_verdict.${key}`, errors);

  if (unique(packet?.required_next_evidence).length < 10) errors.push('required next-evidence ledger is incomplete');
  if (unique(packet?.prohibited_inferences).length < 7) errors.push('prohibited-inference ledger is incomplete');
  if (!text(packet?.interpretation_contract?.contract_id)
      || !text(packet?.interpretation_contract?.what_this_is)
      || !text(packet?.interpretation_contract?.what_this_is_not)
      || !text(packet?.interpretation_contract?.copy_ready_caveat)) {
    errors.push('interpretation contract is incomplete');
  }
  return errors;
}

function buildRepresentationCustodyChain(packet, highestState) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${packet.case_id}:ecosystem`,
    event_type: 'representation_ecosystem_recorded',
    evidence_class: 'primary_public_product_and_policy_surface',
    authority: 'representation_custody_compiler',
    source_event_ids: [],
    payload: packet.ecosystem
  });
  push({
    event_id: `${packet.case_id}:individual-rights`,
    event_type: 'participant_operational_rights_recorded',
    evidence_class: 'participant_policy_and_terms',
    authority: packet.ecosystem.operator_public_name,
    source_event_ids: [`${packet.case_id}:ecosystem`],
    payload: packet.operational_rights
  });
  push({
    event_id: `${packet.case_id}:value-exit`,
    event_type: 'participant_value_and_exit_recorded',
    evidence_class: 'participant_terms_and_privacy_rights',
    authority: packet.ecosystem.operator_public_name,
    source_event_ids: [`${packet.case_id}:individual-rights`],
    payload: packet.value_and_exit
  });
  push({
    event_id: `${packet.case_id}:client-boundary`,
    event_type: 'client_output_and_privacy_boundary_recorded',
    evidence_class: 'client_terms_and_methodology',
    authority: packet.ecosystem.client_surface,
    source_event_ids: [`${packet.case_id}:value-exit`],
    payload: {
      client_output_object: packet.ecosystem.client_output_object,
      clients_receive_anonymised_not_identifiable_outputs_confirmed: packet.operational_rights.clients_receive_anonymised_not_identifiable_outputs_confirmed,
      client_defines_audience_selection_criteria_confirmed: packet.platform_retained_powers.client_defines_audience_selection_criteria_confirmed,
      participant_controls_aggregation_or_downstream_action_supported: packet.classification_verdict.participant_controls_aggregation_interpretation_or_downstream_action_supported
    }
  });
  push({
    event_id: `${packet.case_id}:retained-powers`,
    event_type: 'platform_retained_powers_and_ownership_language_recorded',
    evidence_class: 'participant_and_client_terms',
    authority: packet.ecosystem.operator_public_name,
    source_event_ids: [`${packet.case_id}:client-boundary`],
    payload: {
      platform_retained_powers: packet.platform_retained_powers,
      ownership_language: packet.ownership_language,
      unresolved_control_fields: packet.unresolved_control_fields
    }
  });
  push({
    event_id: `${packet.case_id}:state`,
    event_type: 'representation_custody_state_resolved',
    evidence_class: 'deterministic_rights_classification',
    authority: 'representation_custody_compiler',
    source_event_ids: [`${packet.case_id}:retained-powers`],
    payload: {
      representation_states: packet.representation_states,
      highest_supported_representation_state: highestState,
      classification_verdict: packet.classification_verdict
    }
  });
  push({
    event_id: `${packet.case_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'representation_custody_analyst',
    source_event_ids: [`${packet.case_id}:state`],
    payload: {
      allowed_interpretation: 'meaningful individual representation custody is publicly documented through RC-03 while task-specific and collective authority remain unresolved',
      refused_promotions: [
        'marketing_ownership_as_legal_twin_title',
        'post_task_review_as_pre_task_approval',
        'deletion_right_as_historical_output_recall',
        'participant_reward_as_fair_value_allocation',
        'anonymisation_as_downstream_decision_control',
        'individual_data_rights_as_collective_bargaining',
        'individual_representation_custody_as_public_authority'
      ]
    }
  });
  return events;
}

export function validateRepresentationCustodyChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('representation-custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate representation-custody event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`representation-custody event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`representation-custody event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`representation-custody event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function compileRepresentationCustodyPacket(packet) {
  const errors = validateRepresentationCustodyPacket(packet);
  if (errors.length) throw new Error(`invalid representation-custody packet:\n- ${errors.join('\n- ')}`);

  const highestState = highestSupportedState(packet.representation_states);
  const chain = buildRepresentationCustodyChain(packet, highestState);
  const operationalTrueCount = Object.values(packet.operational_rights).filter(value => value === true).length;
  const platformTrueCount = Object.values(packet.platform_retained_powers).filter(value => value === true).length;
  const unresolvedCount = Object.values(packet.unresolved_control_fields).filter(value => value === false).length;

  return {
    schema_version: REPRESENTATION_CUSTODY_BUILD_SCHEMA_VERSION,
    case_id: packet.case_id,
    issue: packet.issue,
    parent_program_issue: packet.parent_program_issue,
    substitution_issue: packet.substitution_issue,
    captured_at: packet.captured_at,
    status: 'individual_representation_custody_confirmed_highest_rc03_collective_authority_unresolved',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'bounded_individual_rights_and_platform_control_surface',
    publication_status: packet.publication_status,
    ecosystem: packet.ecosystem,
    receipt_count: packet.receipts.length,
    receipt_source_class_counts: countBy(packet.receipts, 'source_class'),
    receipts: packet.receipts,
    representation_states: packet.representation_states,
    supported_state_count: packet.representation_states.filter(state => state.supported_in_case).length,
    highest_supported_representation_state: highestState,
    operational_rights: packet.operational_rights,
    operational_rights_confirmed_count: operationalTrueCount,
    platform_retained_powers: packet.platform_retained_powers,
    platform_retained_powers_confirmed_count: platformTrueCount,
    unresolved_control_fields: packet.unresolved_control_fields,
    unresolved_control_field_count: unresolvedCount,
    ownership_language: packet.ownership_language,
    value_and_exit: packet.value_and_exit,
    classification_verdict: packet.classification_verdict,
    custody_chain: chain,
    custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null,
    allowed_publication_claims: [
      'Twineo and OriginalVoices publicly document Digital Twins grounded in one participant who can train update review and correct the representation.',
      'Twineo publicly documents deletion consent withdrawal objection portability and a participant reward path.',
      'Client-facing materials state that clients receive anonymised rather than identifiable outputs.',
      'Public materials do not establish task-specific pre-approval legal title to the Twin control over audience aggregation or downstream decisions collective bargaining or binding public authority.'
    ],
    required_next_evidence: packet.required_next_evidence,
    prohibited_inferences: packet.prohibited_inferences,
    interpretation_contract: packet.interpretation_contract
  };
}

export function validateRepresentationCustodyBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== REPRESENTATION_CUSTODY_BUILD_SCHEMA_VERSION) errors.push('representation-custody build schema mismatch');
  if (compiled?.status !== 'individual_representation_custody_confirmed_highest_rc03_collective_authority_unresolved') errors.push('compiled representation-custody status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled representation-custody graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'bounded_individual_rights_and_platform_control_surface') errors.push('compiled real-world evidence state mismatch');
  if (compiled?.receipt_count !== 6) errors.push('compiled representation-custody packet must preserve six receipts');
  if (compiled?.supported_state_count !== 3) errors.push('compiled representation-custody packet must preserve three supported states');
  if (compiled?.highest_supported_representation_state !== 'RC-03') errors.push('compiled highest supported representation state must remain RC-03');
  if (compiled?.operational_rights_confirmed_count !== 13) errors.push('compiled operational-rights count must remain 13');
  if (compiled?.platform_retained_powers_confirmed_count !== 7) errors.push('compiled platform-retained-powers count must remain 7');
  if (compiled?.unresolved_control_field_count !== 12) errors.push('compiled unresolved-control-field count must remain 12');
  if (compiled?.classification_verdict?.pre_task_specific_purpose_and_client_control_supported !== false) errors.push('compiled packet must refuse pre-task specific control');
  if (compiled?.classification_verdict?.legal_twin_ownership_assignment_supported !== false) errors.push('compiled packet must refuse legal Twin ownership assignment');
  if (compiled?.classification_verdict?.collective_bargaining_supported !== false) errors.push('compiled packet must refuse collective bargaining');
  if (compiled?.classification_verdict?.binding_public_authority_supported !== false) errors.push('compiled packet must refuse binding public authority');
  if (compiled?.classification_verdict?.complete_economic_fairness_supported !== false) errors.push('compiled packet must refuse complete economic fairness');
  if (compiled?.classification_verdict?.real_world_causal_effect_claimed !== false) errors.push('compiled packet must refuse real-world causal effect');
  if (compiled?.classification_verdict?.manipulative_intent_inferable !== false) errors.push('compiled packet must refuse intent inference');
  errors.push(...validateRepresentationCustodyChain(compiled?.custody_chain));
  const head = array(compiled?.custody_chain).at(-1)?.event_sha256 ?? null;
  if (compiled?.custody_chain_head_sha256 !== head) errors.push('compiled representation-custody custody head mismatch');
  if (!array(compiled?.allowed_publication_claims).length) errors.push('compiled allowed publication claims are required');
  if (!array(compiled?.required_next_evidence).length) errors.push('compiled next-evidence ledger is required');
  if (!array(compiled?.prohibited_inferences).length) errors.push('compiled prohibited-inference ledger is required');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled representation-custody caveat is required');
  return errors;
}

export function renderRepresentationCustodyMarkdown(compiled) {
  const lines = [
    '# Twineo and OriginalVoices representation-custody positive control',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Highest supported state:** ${compiled.highest_supported_representation_state}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Ecosystem',
    '',
    `- Participant surface: ${compiled.ecosystem.participant_surface}`,
    `- Client surface: ${compiled.ecosystem.client_surface}`,
    `- Representation object: ${compiled.ecosystem.representation_object}`,
    `- Client output object: ${compiled.ecosystem.client_output_object}`,
    '',
    '## Representation states',
    ''
  ];
  for (const state of compiled.representation_states) {
    lines.push(`- ${state.state_id} ${state.name}: ${state.supported_in_case}`);
  }
  lines.push('', '## Individual operational rights', '');
  for (const [key, value] of Object.entries(compiled.operational_rights)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Platform-retained powers', '');
  for (const [key, value] of Object.entries(compiled.platform_retained_powers)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Unresolved control fields', '');
  for (const [key, value] of Object.entries(compiled.unresolved_control_fields)) lines.push(`- ${key}: ${value}`);
  lines.push(
    '',
    '## Ownership language',
    '',
    `- Marketing claim: ${compiled.ownership_language.marketing_claim}`,
    `- Legal user-content position: ${compiled.ownership_language.legal_user_content_position}`,
    `- Platform IP position: ${compiled.ownership_language.platform_ip_position}`,
    `- Legal Twin ownership assignment recovered: ${compiled.ownership_language.legal_twin_ownership_assignment_publicly_recovered}`,
    '',
    '## Bounded verdict',
    ''
  );
  for (const [key, value] of Object.entries(compiled.classification_verdict)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Required next evidence', '');
  for (const item of compiled.required_next_evidence) lines.push(`- ${item}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('', `**Custody head:** ${compiled.custody_chain_head_sha256}`, '');
  return lines.join('\n');
}
