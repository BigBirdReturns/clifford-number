import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compileThesisCasePacket,
  compileThesisCasePacketIndex,
  renderThesisCasePacketIndexMarkdown,
  renderThesisCasePacketMarkdown,
  validateThesisCasePacket
} from '../tools/lib/thesis-case-packet.mjs';

const manifest = JSON.parse(readFileSync('data/research/theses/synthetic-population-infrastructure.json', 'utf8'));
const thesisCaseIds = new Set(manifest.case_index.map(item => item.case_id));
const thesisPropositionIds = new Set(manifest.propositions.map(item => item.proposition_id));
const files = [
  'state-market-no10-pandemic-data-diaspora',
  'state-market-central-government-ai-unit-succession'
];
const actualPackets = files.map(id => JSON.parse(readFileSync(`data/research/thesis-case-packets/${id}.json`, 'utf8')));

for (const packet of actualPackets) {
  assert.deepEqual(validateThesisCasePacket(packet, { thesisCaseIds, thesisPropositionIds, receiptIds: new Set() }), []);
  const compiled = compileThesisCasePacket(packet);
  assert.equal(compiled.graph_effect, 'none');
  assert.equal(compiled.conclusion_generated, false);
  assert.equal(compiled.receipt_count, 0);
  assert.equal(compiled.promotion.eligible_for_thesis_evidence_promotion, false);
  assert.equal(compiled.thesis_consumption.evidence_packet_emitted, false);
  assert.match(renderThesisCasePacketMarkdown(compiled), /Intended analytical relations inside intake packets do not count as thesis evidence/i);
}

const index = compileThesisCasePacketIndex(actualPackets.map(compileThesisCasePacket));
assert.equal(index.totals.cases, 2);
assert.equal(index.totals.repository_receipts, 0);
assert.equal(index.totals.eligible_for_promotion, 0);
assert.equal(index.totals.emitted_thesis_evidence_packets, 0);
assert.ok(index.totals.intended_support_observations > 0);
assert.ok(index.totals.challenge_observations > 0);
assert.match(renderThesisCasePacketIndexMarkdown(index), /Emitted thesis evidence packets: 0/);

const jones = actualPackets.find(packet => packet.case_id === 'state-market-no10-pandemic-data-diaspora');
const breach = jones.observations.find(observation => observation.predicate === 'business_appointment_rules_breach_recorded');
assert.equal(breach.relation, 'context');
assert.equal(breach.non_retroactive, true);
assert.ok(breach.forbidden_inferences.some(item => /retroactive|retroactively/i.test(item)));
assert.ok(!breach.objects.includes('CeraCare'));
assert.ok(jones.observations.some(observation => observation.relation === 'weakens' && observation.predicate === 'source_explicit_ordinary_explanation'));
assert.ok(jones.observations.some(observation => observation.relation === 'weakens' && observation.predicate === 'formally_recused_from_ai_matters'));

const succession = actualPackets.find(packet => packet.case_id === 'state-market-central-government-ai-unit-succession');
const refused = succession.observations.find(observation => observation.predicate === 'institutional_succession_not_established_in_opened_sources');
assert.equal(refused.relation, 'null_result');
assert.match(refused.query_scope, /bounded|named official/i);
assert.ok(succession.observations.some(observation => observation.relation === 'context' && observation.predicate === 'units_collaborated'));
assert.ok(succession.observations.some(observation => observation.relation === 'coverage' && observation.predicate === 'comparator_identified_not_normalised'));

const unknownSource = structuredClone(jones);
unknownSource.observations[0].source_ids.push('missing-source');
assert.ok(validateThesisCasePacket(unknownSource, { thesisCaseIds, thesisPropositionIds }).some(error => /unknown source/.test(error)));

const universalNull = structuredClone(succession);
const nullObservation = universalNull.observations.find(observation => observation.relation === 'null_result');
nullObservation.factual_statement = 'This proves universal absence and no relationship exists.';
assert.ok(validateThesisCasePacket(universalNull, { thesisCaseIds, thesisPropositionIds }).some(error => /overstates a bounded source search/.test(error)));

const retroactive = structuredClone(jones);
retroactive.observations.find(observation => observation.temporal_status === 'later_compliance_record').non_retroactive = false;
assert.ok(validateThesisCasePacket(retroactive, { thesisCaseIds, thesisPropositionIds }).some(error => /must be explicitly non-retroactive/.test(error)));

const missingChallenge = structuredClone(jones);
missingChallenge.observations = missingChallenge.observations.filter(observation => !['weakens', 'contradicts', 'null_result'].includes(observation.relation));
missingChallenge.case_disposition.challenge_material_present = false;
assert.ok(validateThesisCasePacket(missingChallenge, { thesisCaseIds, thesisPropositionIds }).some(error => /requires weakening, contradiction, or bounded-null/.test(error)));

const unblockedUnready = structuredClone(jones);
unblockedUnready.observations.find(observation => observation.relation === 'supports').promotion_status = 'ready';
assert.ok(validateThesisCasePacket(unblockedUnready, { thesisCaseIds, thesisPropositionIds }).some(error => /must remain blocked/.test(error)));

const fakeReceipt = structuredClone(jones);
fakeReceipt.observations.find(observation => observation.relation === 'supports').receipt_ids = ['receipt-does-not-exist'];
assert.ok(validateThesisCasePacket(fakeReceipt, { thesisCaseIds, thesisPropositionIds, receiptIds: new Set() }).some(error => /unknown receipt/.test(error)));

const selfPromoting = structuredClone(jones);
const evidenceRows = selfPromoting.observations.filter(observation => ['supports', 'weakens', 'contradicts'].includes(observation.relation));
const receiptIds = new Set();
for (const [indexValue, observation] of evidenceRows.entries()) {
  const receiptId = `fixture-receipt-${indexValue + 1}`;
  observation.receipt_ids = [receiptId];
  observation.review_status = 'human_reviewed';
  observation.promotion_status = 'blocked_pending_separate_human_promotion';
  receiptIds.add(receiptId);
}
selfPromoting.case_disposition.repository_receipts_complete = true;
selfPromoting.case_disposition.human_review_complete = true;
selfPromoting.case_disposition.denominator_complete = true;
selfPromoting.case_disposition.eligible_for_thesis_evidence_promotion = true;
assert.ok(validateThesisCasePacket(selfPromoting, { thesisCaseIds, thesisPropositionIds, receiptIds })
  .some(error => /unexpectedly satisfies promotion|separate reviewed action/.test(error)));

const forbiddenField = structuredClone(jones);
forbiddenField.observations[0].verdict = 'proved';
assert.ok(validateThesisCasePacket(forbiddenField, { thesisCaseIds, thesisPropositionIds }).some(error => /forbidden field verdict/.test(error)));

console.log('thesis-case-packet.test.js: OK');
