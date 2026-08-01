import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceAcquisitionRequest,
  renderPreferenceAcquisitionRequestMarkdown,
  validatePreferenceAcquisitionChain,
  validatePreferenceAcquisitionRequest,
  validatePreferenceAcquisitionRequestBuild
} from '../tools/lib/preference-acquisition-request.mjs';

const sourcePath = 'data/research/preference-custody/acquisition/newsuk-matched-method-request.json';
const requestPath = 'docs/requests/newsuk-times-exploraition-nucleus-panel-protocol-request.md';
const packet = JSON.parse(readFileSync(sourcePath, 'utf8'));
const requestMarkdown = readFileSync(requestPath, 'utf8');

assert.deepEqual(validatePreferenceAcquisitionRequest(packet, requestMarkdown), []);
const compiled = compilePreferenceAcquisitionRequest(packet, requestMarkdown);
assert.deepEqual(validatePreferenceAcquisitionRequestBuild(compiled), []);
assert.equal(compiled.acquisition_id, 'PC-AQ-NEWSUK-MATCHED-METHOD-01');
assert.equal(compiled.status, 'prepared_request_qualified_zero_contact');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.evidence_acquired, false);
assert.equal(compiled.route_count, 3);
assert.equal(compiled.question_count, 10);
assert.equal(compiled.authority_state.contact_authorized, false);
assert.equal(compiled.authority_state.route_executed, false);
assert.equal(compiled.authority_state.message_sent, false);
assert.equal(compiled.counts.request_packets_prepared, 1);
assert.equal(compiled.counts.requests_sent, 0);
assert.equal(compiled.counts.responses_received, 0);
assert.equal(compiled.counts.evidence_objects_acquired, 0);
assert.ok(compiled.acceptable_terminal_responses.includes('no_matched_workflow_exists'));
assert.ok(compiled.acceptable_terminal_responses.includes('exists_but_confidential'));
assert.ok(compiled.acceptable_terminal_responses.includes('declined'));
assert.ok(compiled.acceptable_terminal_responses.includes('no_response'));
assert.deepEqual(validatePreferenceAcquisitionChain(compiled.custody_chain), []);
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);

const markdown = renderPreferenceAcquisitionRequestMarkdown(compiled);
assert.match(markdown, /News UK matched-method acquisition packet/);
assert.match(markdown, /prepared_request_qualified_zero_contact/);
assert.match(markdown, /contact_authorized: false/);
assert.match(markdown, /message_sent: false/);
assert.match(markdown, /no_matched_workflow_exists/);
assert.match(markdown, /no_response/);

const graphLeak = structuredClone(packet);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceAcquisitionRequest(graphLeak, requestMarkdown).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(packet);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceAcquisitionRequest(thesisLeak, requestMarkdown).some(error => /must not count toward thesis evidence/.test(error)));

for (const field of [
  'contact_authorized',
  'route_executed',
  'message_sent',
  'follow_up_authorized',
  'public_escalation_authorized',
  'source_subject_contact_authorized',
  'response_received',
  'evidence_acquired'
]) {
  const authorityLeak = structuredClone(packet);
  authorityLeak.authority_state[field] = true;
  assert.ok(validatePreferenceAcquisitionRequest(authorityLeak, requestMarkdown).some(error => error.includes(`authority_state.${field}`)));
}

const noResponseLeak = structuredClone(packet);
noResponseLeak.acceptable_terminal_responses = noResponseLeak.acceptable_terminal_responses.filter(state => state !== 'no_response');
assert.ok(validatePreferenceAcquisitionRequest(noResponseLeak, requestMarkdown).some(error => /terminal response missing: no_response/.test(error)));

const noRecordsLeak = structuredClone(packet);
noRecordsLeak.boundaries.no_response_is_no_records = true;
assert.ok(validatePreferenceAcquisitionRequest(noRecordsLeak, requestMarkdown).some(error => /boundaries.no_response_is_no_records/.test(error)));

const missingQuestion = structuredClone(packet);
missingQuestion.questions.pop();
assert.ok(validatePreferenceAcquisitionRequest(missingQuestion, requestMarkdown).some(error => /exactly Q01 through Q10/.test(error)));

const duplicateField = structuredClone(packet);
duplicateField.questions[1].field = duplicateField.questions[0].field;
assert.ok(validatePreferenceAcquisitionRequest(duplicateField, requestMarkdown).some(error => /question fields must be unique/.test(error)));

const documentStateLeak = requestMarkdown.replace('**State:** prepared, not sent', '**State:** sent');
assert.ok(validatePreferenceAcquisitionRequest(packet, documentStateLeak).some(error => /must declare prepared, not sent/.test(error)));

const documentAuthorityLeak = requestMarkdown.replace('**Contact authorized:** no', '**Contact authorized:** yes');
assert.ok(validatePreferenceAcquisitionRequest(packet, documentAuthorityLeak).some(error => /must declare contact unauthorized/.test(error)));

const documentRouteLeak = requestMarkdown.replace(packet.proposed_route.primary_contact, 'removed-contact@example.invalid');
assert.ok(validatePreferenceAcquisitionRequest(packet, documentRouteLeak).some(error => /must preserve the primary route/.test(error)));

const documentNullBoundaryLeak = requestMarkdown.replace(
  'A refusal, confidentiality boundary, routing failure, partial answer, or nonresponse will not be treated as evidence',
  'A nonresponse establishes no records'
);
assert.ok(validatePreferenceAcquisitionRequest(packet, documentNullBoundaryLeak).some(error => /null-response interpretation boundary/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.custody_chain[1].payload.request_bytes += 1;
assert.ok(validatePreferenceAcquisitionRequestBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const sentBuild = structuredClone(compiled);
sentBuild.counts.requests_sent = 1;
assert.ok(validatePreferenceAcquisitionRequestBuild(sentBuild).some(error => /counts.requests_sent must equal 0/.test(error)));

const strippedCaveat = structuredClone(packet);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceAcquisitionRequest(strippedCaveat, requestMarkdown).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-acquisition-request.test.js: OK');
