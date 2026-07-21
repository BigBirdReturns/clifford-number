import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { compileThesisCasePacket } from '../tools/lib/thesis-case-packet.mjs';

const expectedReceiptIds = [
  'gov-acoba-samantha-jones-case-index-2024',
  'gov-acoba-samantha-jones-ceracare-2024',
  'civil-service-commission-samantha-harrison-breach-2026',
  'gov-no10ds-formation-mid-2020',
  'gov-iai-announcement-2023',
  'gov-dsit-digital-ai-transfer-2024',
  'gov-dsit-accounting-system-statement-2025',
  'gov-cddo-about-new-gds-2025',
  'gov-gds-about-new-gds-2025',
  'gov-ai-playbook-red-teaming-2025',
  'gsa-centers-of-excellence-2017'
];

const receipts = readFileSync('data/ledger/receipts.jsonl', 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));
const receiptById = new Map(receipts.map(receipt => [receipt.receipt_id, receipt]));

for (const receiptId of expectedReceiptIds) {
  const receipt = receiptById.get(receiptId);
  assert.ok(receipt, `${receiptId} must exist in the receipt ledger`);
  assert.equal(receipt.source_type, 'official_source_extract');
  assert.equal(receipt.evidence_class, 'official');
  assert.equal(receipt.archive?.method, 'in_repo_content_hash');
  assert.match(receipt.archive?.ref ?? '', /^sha256:[a-f0-9]{64}$/);
  assert.match(receipt.path, /^receipts\/thesis-state-market\//);
  assert.ok(existsSync(receipt.path), `${receipt.path} must exist`);
  const source = readFileSync(receipt.path);
  const digest = crypto.createHash('sha256').update(source).digest('hex');
  assert.equal(receipt.archive.ref, `sha256:${digest}`, `${receiptId} content hash must match the immutable extract`);
  assert.match(receipt.archive?.note ?? '', /extract, not the remote page/i);
  const text = source.toString('utf8');
  assert.match(text, /Live source:/);
  assert.match(text, /Capture type:/);
  assert.match(text, /structured factual extract/i);
  assert.match(text, /not a complete|not a full/i);
  assert.doesNotMatch(text, /complete archival snapshot|verbatim full copy/i);
}

const packetFiles = [
  'data/research/thesis-case-packets/state-market-no10-pandemic-data-diaspora.json',
  'data/research/thesis-case-packets/state-market-central-government-ai-unit-succession.json'
];
const packets = packetFiles.map(file => JSON.parse(readFileSync(file, 'utf8')));
const packetReceiptIds = new Set();
for (const packet of packets) {
  assert.equal(packet.status, 'intake_receipts_complete_human_review_and_denominator_pending');
  assert.equal(packet.case_disposition.repository_receipts_complete, true);
  assert.equal(packet.case_disposition.human_review_complete, false);
  assert.equal(packet.case_disposition.denominator_complete, false);
  assert.equal(packet.case_disposition.eligible_for_thesis_evidence_promotion, false);
  for (const source of packet.sources) {
    assert.ok(source.receipt_id, `${source.source_id} must have a receipt ID`);
    assert.ok(expectedReceiptIds.includes(source.receipt_id), `${source.receipt_id} must belong to the bounded receipt set`);
    packetReceiptIds.add(source.receipt_id);
  }
  for (const observation of packet.observations) {
    assert.ok(observation.receipt_ids.length > 0, `${observation.observation_id} must carry receipt custody`);
    for (const receiptId of observation.receipt_ids) {
      assert.ok(expectedReceiptIds.includes(receiptId), `${observation.observation_id} references an unexpected receipt`);
      packetReceiptIds.add(receiptId);
    }
  }
  const compiled = compileThesisCasePacket(packet);
  assert.equal(compiled.receipt_custody_status, 'complete');
  assert.equal(compiled.promotion.repository_receipts_complete, true);
  assert.equal(compiled.promotion.human_review_complete, false);
  assert.equal(compiled.promotion.denominator_complete, false);
  assert.equal(compiled.promotion.eligible_for_thesis_evidence_promotion, false);
  assert.equal(compiled.thesis_consumption.evidence_packet_emitted, false);
}
assert.deepEqual([...packetReceiptIds].sort(), [...expectedReceiptIds].sort());

const jones = packets.find(packet => packet.case_id === 'state-market-no10-pandemic-data-diaspora');
const breach = jones.observations.find(observation => observation.predicate === 'business_appointment_rules_breach_recorded');
assert.equal(breach.non_retroactive, true);
assert.ok(breach.forbidden_inferences.some(item => /retroactive|retroactively/i.test(item)));
assert.ok(!breach.objects.includes('CeraCare'));

const succession = packets.find(packet => packet.case_id === 'state-market-central-government-ai-unit-succession');
const boundedNull = succession.observations.find(observation => observation.relation === 'null_result');
assert.match(boundedNull.query_scope, /through 21 July 2026/i);
assert.match(boundedNull.source_status, /not_a_complete_all-government-search/i);
assert.ok(boundedNull.forbidden_inferences.some(item => /cannot be generalized|generalized beyond/i.test(item)));

const thesisEvidence = JSON.parse(readFileSync('data/research/thesis-evidence/synthetic-population-infrastructure.json', 'utf8'));
assert.equal(thesisEvidence.evidence_bearing.count, 0);
assert.deepEqual(thesisEvidence.evidence_bearing.packets, []);
const stateMarketCoverage = thesisEvidence.packets.filter(packet => packet.proposition_id === 'P1-state-market-continuity');
assert.equal(stateMarketCoverage.length, 2);
assert.ok(stateMarketCoverage.every(packet => packet.relation === 'coverage'));
assert.ok(stateMarketCoverage.every(packet => packet.counts_toward_support === false));
assert.ok(stateMarketCoverage.every(packet => packet.counts_toward_thesis_evidence === false));
assert.equal(new Set(stateMarketCoverage.flatMap(packet => packet.receipt_ids)).size, 11);

console.log('thesis-state-market-receipts.test.js: OK');
