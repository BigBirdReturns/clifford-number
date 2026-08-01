import { createHash } from 'node:crypto';

export const PREFERENCE_ACQUISITION_REQUEST_SCHEMA_VERSION = 'preference-custody-acquisition-request@1';
export const PREFERENCE_ACQUISITION_REQUEST_BUILD_SCHEMA_VERSION = 'preference-custody-acquisition-request-build@1';

const REQUIRED_QUESTION_IDS = Array.from({ length: 10 }, (_, index) => `Q${String(index + 1).padStart(2, '0')}`);
const REQUIRED_AUTHORITY_FALSE = [
  'contact_authorized',
  'route_executed',
  'message_sent',
  'follow_up_authorized',
  'public_escalation_authorized',
  'source_subject_contact_authorized',
  'response_received',
  'evidence_acquired'
];
const REQUIRED_BOUNDARY_FALSE = [
  'prepared_packet_is_sent_request',
  'public_email_is_contact_authorization',
  'route_identified_is_route_executed',
  'no_response_is_no_records',
  'decline_is_misconduct',
  'confidentiality_is_invalidity',
  'parallel_products_are_matched_validation',
  'human_consultation_is_binding_public_authority'
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

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  }
  return value;
}

function sha256(value) {
  const source = typeof value === 'string' ? value : JSON.stringify(canonicalValue(value));
  return createHash('sha256').update(source).digest('hex');
}

function sealedEvent(event, previousEventSha256) {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

export function validatePreferenceAcquisitionRequest(packet, requestMarkdown) {
  const errors = [];
  const route = object(packet?.proposed_route);
  const authority = object(packet?.authority_state);
  const questions = array(packet?.questions);
  const ledger = object(packet?.evidence_ledger);
  const boundaries = object(packet?.boundaries);
  const contract = object(packet?.interpretation_contract);
  const markdown = String(requestMarkdown ?? '');

  if (packet?.schema_version !== PREFERENCE_ACQUISITION_REQUEST_SCHEMA_VERSION) errors.push('preference acquisition-request schema mismatch');
  if (!text(packet?.acquisition_id)) errors.push('acquisition_id is required');
  if (packet?.status !== 'prepared_not_sent') errors.push('acquisition status must remain prepared_not_sent');
  if (packet?.publication_status !== 'source_acquisition_packet_only') errors.push('publication status must remain source_acquisition_packet_only');
  if (packet?.graph_effect !== 'none') errors.push('acquisition graph_effect must remain none');
  if (packet?.counts_toward_thesis_evidence !== false) errors.push('acquisition packet must not count toward thesis evidence');
  if (!text(packet?.request_document_path) || !text(packet?.target_object)) errors.push('request document path and target object are required');
  if (unique(packet?.related_real_cases).length !== 2) errors.push('exactly two related real cases are required');

  if (!text(route.recipient_role) || !text(route.primary_contact) || !text(route.primary_contact_source)) errors.push('primary route identity and source are required');
  if (!route.primary_contact.includes('@')) errors.push('primary contact must be an email route');
  if (array(route.secondary_contacts).length < 2) errors.push('at least two secondary public routes are required');
  for (const secondary of array(route.secondary_contacts)) {
    if (!text(secondary?.contact) || !text(secondary?.role) || !text(secondary?.source)) errors.push('secondary routes require contact role and source');
    if (!text(secondary?.contact).includes('@')) errors.push('secondary contact must be an email route');
  }
  if (unique(route.requested_internal_routing).length < 3) errors.push('internal routing targets are incomplete');

  for (const key of REQUIRED_AUTHORITY_FALSE) {
    if (authority[key] !== false) errors.push(`authority_state.${key} must remain false`);
  }

  if (!sameMembers(questions.map(question => question?.question_id), REQUIRED_QUESTION_IDS)) errors.push('questions must contain exactly Q01 through Q10');
  const fields = questions.map(question => text(question?.field));
  if (unique(fields).length !== questions.length) errors.push('question fields must be unique');
  for (const question of questions) {
    const id = text(question?.question_id) || '(missing question ID)';
    if (!text(question?.field) || !text(question?.prompt)) errors.push(`question ${id} requires field and prompt`);
    if (unique(question?.acceptable_response_states).length < 4) errors.push(`question ${id} requires at least four acceptable response states`);
  }

  const terminalResponses = unique(packet?.acceptable_terminal_responses);
  if (terminalResponses.length < 8) errors.push('acceptable terminal-response taxonomy is incomplete');
  for (const required of ['no_matched_workflow_exists', 'exists_but_confidential', 'declined', 'no_response']) {
    if (!terminalResponses.includes(required)) errors.push(`terminal response missing: ${required}`);
  }

  for (const key of ['evidence_tier', 'venue', 'target', 'upside', 'downside', 'failure_mode']) {
    if (!text(ledger[key])) errors.push(`evidence_ledger.${key} is required`);
  }
  for (const key of REQUIRED_BOUNDARY_FALSE) {
    if (boundaries[key] !== false) errors.push(`boundaries.${key} must remain false`);
  }
  if (boundaries.graph_effect !== 'none') errors.push('boundaries.graph_effect must remain none');
  if (unique(packet?.prohibited_inferences).length < 6) errors.push('prohibited-inference ledger is incomplete');
  if (!text(contract.contract_id) || !text(contract.what_this_is) || !text(contract.what_this_is_not) || !text(contract.copy_ready_caveat)) {
    errors.push('interpretation contract is incomplete');
  }

  if (!markdown.trim()) errors.push('request Markdown is required');
  if (!markdown.includes(`**Request ID:** \`${packet?.acquisition_id}\``)) errors.push('request Markdown must preserve the acquisition ID');
  if (!/\*\*State:\*\* prepared, not sent/i.test(markdown)) errors.push('request Markdown must declare prepared, not sent');
  if (!/\*\*Contact authorized:\*\* no/i.test(markdown)) errors.push('request Markdown must declare contact unauthorized');
  if (!markdown.includes(route.primary_contact)) errors.push('request Markdown must preserve the primary route');
  if (!/A refusal, confidentiality boundary, routing failure, partial answer, or nonresponse will not be treated as evidence/i.test(markdown)) {
    errors.push('request Markdown must preserve the null-response interpretation boundary');
  }
  for (let index = 1; index <= 10; index += 1) {
    if (!markdown.includes(`${index}.`)) errors.push(`request Markdown must preserve numbered question ${index}`);
  }
  if (!markdown.includes('[researcher name]')) errors.push('request Markdown must preserve the unsent researcher placeholder');
  return errors;
}

function buildCustodyChain(packet, requestMarkdown, requestSha256) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = sealedEvent(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };

  push({
    event_id: `${packet.acquisition_id}:route`,
    event_type: 'public_contact_routes_identified',
    evidence_class: 'official_public_contact_route',
    authority: 'source_acquisition_compiler',
    source_event_ids: [],
    payload: packet.proposed_route
  });
  push({
    event_id: `${packet.acquisition_id}:request`,
    event_type: 'request_packet_authored',
    evidence_class: 'prepared_unsent_request',
    authority: 'request_author',
    source_event_ids: [`${packet.acquisition_id}:route`],
    payload: {
      request_document_path: packet.request_document_path,
      request_sha256: requestSha256,
      request_bytes: Buffer.byteLength(requestMarkdown, 'utf8'),
      question_ids: packet.questions.map(question => question.question_id)
    }
  });
  push({
    event_id: `${packet.acquisition_id}:authority`,
    event_type: 'contact_authority_sealed',
    evidence_class: 'authority_state',
    authority: 'repository_boundary',
    source_event_ids: [`${packet.acquisition_id}:request`],
    payload: packet.authority_state
  });
  push({
    event_id: `${packet.acquisition_id}:response-taxonomy`,
    event_type: 'terminal_response_taxonomy_sealed',
    evidence_class: 'acquisition_interpretation_contract',
    authority: 'source_acquisition_compiler',
    source_event_ids: [`${packet.acquisition_id}:authority`],
    payload: {
      acceptable_terminal_responses: packet.acceptable_terminal_responses,
      evidence_ledger: packet.evidence_ledger,
      boundaries: packet.boundaries
    }
  });
  push({
    event_id: `${packet.acquisition_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'source_acquisition_analyst',
    source_event_ids: [`${packet.acquisition_id}:response-taxonomy`],
    payload: {
      allowed_interpretation: 'a bounded protocol request is prepared and public routes are identified',
      refused_promotions: [
        'prepared_request_as_sent_request',
        'public_route_as_contact_authorization',
        'no_response_as_no_records',
        'decline_as_misconduct',
        'confidentiality_as_invalidity',
        'parallel_products_as_matched_validation',
        'prepared_packet_as_evidence_acquisition'
      ]
    }
  });
  return events;
}

export function validatePreferenceAcquisitionChain(events) {
  const errors = [];
  const seen = new Set();
  let previous = null;
  for (const event of array(events)) {
    if (!text(event?.event_id)) errors.push('acquisition event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate acquisition event ID ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`acquisition event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) {
      if (!seen.has(sourceId)) errors.push(`acquisition event ${event?.event_id} references unseen source ${sourceId}`);
    }
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`acquisition event ${event?.event_id} hash mismatch`);
    seen.add(event?.event_id);
    previous = event?.event_sha256 ?? null;
  }
  return errors;
}

export function compilePreferenceAcquisitionRequest(packet, requestMarkdown) {
  const errors = validatePreferenceAcquisitionRequest(packet, requestMarkdown);
  if (errors.length) throw new Error(`invalid preference acquisition request:\n- ${errors.join('\n- ')}`);

  const requestSha256 = sha256(requestMarkdown);
  const custodyChain = buildCustodyChain(packet, requestMarkdown, requestSha256);
  const routeCount = 1 + packet.proposed_route.secondary_contacts.length;

  return {
    schema_version: PREFERENCE_ACQUISITION_REQUEST_BUILD_SCHEMA_VERSION,
    acquisition_id: packet.acquisition_id,
    issue: packet.issue,
    parent_program_issue: packet.parent_program_issue,
    substitution_issue: packet.substitution_issue,
    related_real_cases: packet.related_real_cases,
    captured_at: packet.captured_at,
    status: 'prepared_request_qualified_zero_contact',
    publication_status: packet.publication_status,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    evidence_acquired: false,
    request_document_path: packet.request_document_path,
    request_sha256: requestSha256,
    request_bytes: Buffer.byteLength(requestMarkdown, 'utf8'),
    target_object: packet.target_object,
    proposed_route: packet.proposed_route,
    route_count: routeCount,
    question_count: packet.questions.length,
    questions: packet.questions,
    acceptable_terminal_responses: packet.acceptable_terminal_responses,
    terminal_response_count: packet.acceptable_terminal_responses.length,
    authority_state: packet.authority_state,
    evidence_ledger: packet.evidence_ledger,
    boundaries: packet.boundaries,
    counts: {
      request_packets_prepared: 1,
      requests_sent: 0,
      routes_identified: routeCount,
      routes_executed: 0,
      contacts_authorized: 0,
      follow_ups_authorized: 0,
      responses_received: 0,
      evidence_objects_acquired: 0,
      graph_effects: 0
    },
    custody_chain: custodyChain,
    custody_chain_head_sha256: custodyChain.at(-1)?.event_sha256 ?? null,
    prohibited_inferences: packet.prohibited_inferences,
    interpretation_contract: packet.interpretation_contract
  };
}

export function validatePreferenceAcquisitionRequestBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_ACQUISITION_REQUEST_BUILD_SCHEMA_VERSION) errors.push('preference acquisition-request build schema mismatch');
  if (compiled?.status !== 'prepared_request_qualified_zero_contact') errors.push('compiled acquisition status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled acquisition graph_effect must remain none');
  if (compiled?.counts_toward_thesis_evidence !== false) errors.push('compiled acquisition must not count toward thesis evidence');
  if (compiled?.conclusion_generated !== false) errors.push('compiled acquisition must not generate a substantive conclusion');
  if (compiled?.evidence_acquired !== false) errors.push('compiled acquisition evidence_acquired must remain false');
  if (!/^[0-9a-f]{64}$/.test(text(compiled?.request_sha256))) errors.push('compiled request SHA-256 is invalid');
  if (!(compiled?.request_bytes > 1000)) errors.push('compiled request packet is unexpectedly small');
  if (compiled?.route_count !== 3) errors.push('compiled acquisition must preserve three public routes');
  if (compiled?.question_count !== 10) errors.push('compiled acquisition must preserve ten questions');
  if (!(compiled?.terminal_response_count >= 8)) errors.push('compiled terminal-response taxonomy is incomplete');
  for (const key of REQUIRED_AUTHORITY_FALSE) {
    if (compiled?.authority_state?.[key] !== false) errors.push(`compiled authority_state.${key} must remain false`);
  }
  const counts = object(compiled?.counts);
  const expectedCounts = {
    request_packets_prepared: 1,
    requests_sent: 0,
    routes_executed: 0,
    contacts_authorized: 0,
    follow_ups_authorized: 0,
    responses_received: 0,
    evidence_objects_acquired: 0,
    graph_effects: 0
  };
  for (const [key, value] of Object.entries(expectedCounts)) {
    if (counts[key] !== value) errors.push(`compiled counts.${key} must equal ${value}`);
  }
  if (counts.routes_identified !== compiled?.route_count) errors.push('compiled route count does not reconcile');
  errors.push(...validatePreferenceAcquisitionChain(compiled?.custody_chain));
  const head = array(compiled?.custody_chain).at(-1)?.event_sha256 ?? null;
  if (compiled?.custody_chain_head_sha256 !== head) errors.push('compiled acquisition custody head mismatch');
  if (!array(compiled?.acceptable_terminal_responses).includes('no_response')) errors.push('compiled acquisition must preserve no_response as a terminal state');
  if (compiled?.boundaries?.no_response_is_no_records !== false) errors.push('compiled acquisition must refuse no response as no records');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled acquisition caveat is required');
  return errors;
}

export function renderPreferenceAcquisitionRequestMarkdown(compiled) {
  const lines = [
    '# News UK matched-method acquisition packet',
    '',
    `**Acquisition ID:** ${compiled.acquisition_id}`,
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Request object',
    '',
    `- Target: ${compiled.target_object}`,
    `- Document: ${compiled.request_document_path}`,
    `- SHA-256: ${compiled.request_sha256}`,
    `- Bytes: ${compiled.request_bytes}`,
    `- Questions: ${compiled.question_count}`,
    '',
    '## Proposed route',
    '',
    `- Recipient role: ${compiled.proposed_route.recipient_role}`,
    `- Primary contact: ${compiled.proposed_route.primary_contact}`
  ];
  for (const route of compiled.proposed_route.secondary_contacts) {
    lines.push(`- Secondary contact: ${route.contact}; ${route.role}`);
  }
  lines.push('', '## Authority state', '');
  for (const key of REQUIRED_AUTHORITY_FALSE) lines.push(`- ${key}: ${compiled.authority_state[key]}`);
  lines.push('', '## Questions', '');
  for (const question of compiled.questions) lines.push(`- ${question.question_id} ${question.field}: ${question.prompt}`);
  lines.push('', '## Acceptable terminal responses', '');
  for (const state of compiled.acceptable_terminal_responses) lines.push(`- ${state}`);
  lines.push('', '## Evidence ledger', '');
  for (const [key, value] of Object.entries(compiled.evidence_ledger)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('', `**Custody head:** ${compiled.custody_chain_head_sha256}`, '');
  return lines.join('\n');
}
