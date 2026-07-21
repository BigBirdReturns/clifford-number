#!/usr/bin/env python3
"""Finish the first state-market thesis receipt-custody tranche.

This script is intentionally idempotent. It updates the source contracts, tests,
Pages validation, documentation, and focused workflow. Generated artifacts are
rebuilt by the calling workflow. Receipt custody remains distinct from human
review, denominator completion, evidence promotion, and graph effect.
"""

from __future__ import annotations

import json
import os
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRY_RUN = os.environ.get("RECEIPT_CUSTODY_DRY_RUN") == "1"

JONES_RECEIPTS = [
    "gov-acoba-samantha-jones-case-index-2024",
    "gov-acoba-samantha-jones-ceracare-2024",
    "civil-service-commission-samantha-harrison-breach-2026",
]
SUCCESSION_RECEIPTS = [
    "gov-no10ds-formation-mid-2020",
    "gov-iai-announcement-2023",
    "gov-dsit-digital-ai-transfer-2024",
    "gov-dsit-accounting-system-statement-2025",
    "gov-cddo-about-new-gds-2025",
    "gov-gds-about-new-gds-2025",
    "gov-ai-playbook-red-teaming-2025",
    "gsa-centers-of-excellence-2017",
]
ALL_RECEIPTS = JONES_RECEIPTS + SUCCESSION_RECEIPTS


def read_json(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def write_json(path: str, value: dict) -> None:
    (ROOT / path).write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def write_text(path: str, value: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(textwrap.dedent(value).lstrip(), encoding="utf-8")


def require_replace(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise RuntimeError(f"{label}: expected source text is missing")
    return text.replace(old, new)


# Package entrypoints and release-test integration.
package = read_json("package.json")
package["scripts"]["validate:state-market-receipts"] = (
    "node test/thesis-state-market-receipts.test.js"
)
receipt_test_command = "node test/thesis-state-market-receipts.test.js"
if receipt_test_command not in package["scripts"]["test"]:
    package["scripts"]["test"] += f" && {receipt_test_command}"
write_json("package.json", package)


# Coverage packets carry receipt custody but remain non-evidentiary.
evidence_path = "data/research/thesis-evidence/synthetic-population-infrastructure.json"
evidence = read_json(evidence_path)
evidence["research_progress"] = (
    "denominator_and_receipted_state_market_case_intake_in_progress"
)
packet_by_id = {packet["packet_id"]: packet for packet in evidence["packets"]}

jones = packet_by_id["coverage-state-market-jones-intake-2026-07-21"]
jones["summary"] = (
    "A bounded Samantha Jones case-intake packet now carries three immutable "
    "in-repo structured extracts for the official public-to-private transition "
    "record, restrictions, source-explicit ordinary explanations, AI recusal, "
    "and the separate non-retroactive 2026 consultancy-rules breach. The neutral "
    "cohort denominator and claim-level human review remain incomplete."
)
jones["receipt_ids"] = JONES_RECEIPTS
jones["allowed_language"] = (
    "A receipted case intake exists and preserves both the transition row and its "
    "official counterevidence. Receipt custody is complete for this packet, but "
    "it is not a promoted evidence packet and cannot establish a diaspora pattern."
)

succession = packet_by_id[
    "coverage-state-market-unit-chronology-intake-2026-07-21"
]
succession["summary"] = (
    "A bounded institutional case-intake packet now carries eight immutable "
    "in-repo structured extracts for separate 10DS and i.AI creation, the transfer "
    "of named digital and AI bodies into DSIT, the formation of the new GDS, "
    "collaboration among 10DS, CDDO, and i.AI, the refused 10DS-to-i.AI succession, "
    "and an unnormalised GSA comparator. Institutional normalisation and claim-level "
    "human review remain incomplete."
)
succession["receipt_ids"] = SUCCESSION_RECEIPTS
succession["allowed_language"] = (
    "A receipted institutional chronology and refused succession exist at intake. "
    "Receipt custody is complete for this packet; collaboration and similar remit "
    "remain distinct from inheritance, and no thesis evidence packet has been promoted."
)

case_gap = next(
    gap for gap in evidence["known_gaps"] if gap["gap_id"] == "case-packets-not-promoted"
)
case_gap["description"] = (
    "Two state-market case-intake packets now carry eleven immutable repository "
    "receipt extracts, but neither has a complete denominator, claim-level human "
    "review, or a separate promotion decision. The other sixteen case contracts "
    "have not yet emitted durable receipt-custody packets."
)
case_gap["next_action"] = (
    "Complete the public-side cohort and institutional comparator denominators, "
    "conduct claim-level human review, promote only admissible observations through "
    "a separate action, and build the remaining sixteen case packets. Structured "
    "extracts should later be supplemented by full remote-page snapshots where "
    "lawful and available."
)
write_json(evidence_path, evidence)


write_text(
    "tools/validate-thesis-case-packets.mjs",
    r'''
    #!/usr/bin/env node
    import fs from 'node:fs';
    import path from 'node:path';
    import { readJson, readJsonl, root } from './lib/ledger.mjs';
    import {
      compileThesisCasePacket,
      compileThesisCasePacketIndex,
      renderThesisCasePacketIndexMarkdown,
      renderThesisCasePacketMarkdown,
      validateThesisCasePacket
    } from './lib/thesis-case-packet.mjs';

    const sourceDirectory = path.join(root, 'data', 'research', 'thesis-case-packets');
    const sourceFiles = fs.readdirSync(sourceDirectory).filter(file => file.endsWith('.json')).sort();
    const manifest = readJson('data/research/theses/synthetic-population-infrastructure.json');
    const receiptIds = new Set(readJsonl('data/ledger/receipts.jsonl').map(receipt => receipt.receipt_id));
    const thesisCaseIds = new Set((manifest.case_index ?? []).map(item => item.case_id));
    const thesisPropositionIds = new Set((manifest.propositions ?? []).map(item => item.proposition_id));
    const errors = [];
    const compiledPackets = [];

    for (const file of sourceFiles) {
      const packet = JSON.parse(fs.readFileSync(path.join(sourceDirectory, file), 'utf8'));
      const packetErrors = validateThesisCasePacket(packet, { receiptIds, thesisCaseIds, thesisPropositionIds });
      for (const error of packetErrors) errors.push(`${file}: ${error}`);
      const compiled = compileThesisCasePacket(packet);
      compiledPackets.push(compiled);
      const jsonPath = path.join(root, 'build', 'thesis', 'case-packets', `${compiled.case_id}.json`);
      const markdownPath = path.join(root, 'build', 'thesis', 'case-packets', `${compiled.case_id}.md`);
      const expectedJson = `${JSON.stringify(compiled, null, 2)}\n`;
      const expectedMarkdown = `${renderThesisCasePacketMarkdown(compiled)}\n`;
      if (!fs.existsSync(jsonPath)) errors.push(`missing compiled case packet ${path.relative(root, jsonPath)}`);
      else if (fs.readFileSync(jsonPath, 'utf8') !== expectedJson) errors.push(`${compiled.case_id} compiled JSON is stale`);
      if (!fs.existsSync(markdownPath)) errors.push(`missing compiled case packet ${path.relative(root, markdownPath)}`);
      else if (fs.readFileSync(markdownPath, 'utf8') !== expectedMarkdown) errors.push(`${compiled.case_id} compiled Markdown is stale`);
    }

    const index = compileThesisCasePacketIndex(compiledPackets);
    const indexJsonPath = path.join(root, 'build', 'thesis', 'case-packet-index.json');
    const indexMarkdownPath = path.join(root, 'build', 'thesis', 'case-packet-index.md');
    const expectedIndexJson = `${JSON.stringify(index, null, 2)}\n`;
    const expectedIndexMarkdown = `${renderThesisCasePacketIndexMarkdown(index)}\n`;
    if (!fs.existsSync(indexJsonPath)) errors.push(`missing compiled case packet index ${path.relative(root, indexJsonPath)}`);
    else if (fs.readFileSync(indexJsonPath, 'utf8') !== expectedIndexJson) errors.push('compiled case packet index JSON is stale');
    if (!fs.existsSync(indexMarkdownPath)) errors.push(`missing compiled case packet index ${path.relative(root, indexMarkdownPath)}`);
    else if (fs.readFileSync(indexMarkdownPath, 'utf8') !== expectedIndexMarkdown) errors.push('compiled case packet index Markdown is stale');

    const receiptCompleteStatus = 'intake_receipts_complete_human_review_and_denominator_pending';
    if (index.totals.cases !== 2) errors.push(`expected two initial state-market case packets, got ${index.totals.cases}`);
    if (index.totals.repository_receipts !== 11) errors.push(`expected eleven bounded repository receipts, got ${index.totals.repository_receipts}`);
    if (index.totals.receipt_complete_cases !== 2) errors.push(`expected two receipt-complete cases, got ${index.totals.receipt_complete_cases}`);
    if (index.totals.human_review_complete_cases !== 0) errors.push('receipt custody must not impersonate completed human review');
    if (index.totals.denominator_complete_cases !== 0) errors.push('receipt custody must not impersonate denominator completion');
    if (index.totals.eligible_for_promotion !== 0 || index.totals.emitted_thesis_evidence_packets !== 0) errors.push('receipted intake must not emit or qualify for thesis evidence promotion');
    if (index.cases.some(item => item.status !== receiptCompleteStatus || item.receipt_custody_status !== 'complete')) errors.push('both state-market packets must report complete receipt custody while remaining intake');
    if (compiledPackets.some(packet => packet.graph_effect !== 'none' || packet.conclusion_generated !== false)) errors.push('case packets must remain graph-inert and conclusion-free');

    const jones = compiledPackets.find(packet => packet.case_id === 'state-market-no10-pandemic-data-diaspora');
    if (jones?.receipt_count !== 3) errors.push(`Jones packet must carry three unique receipts, got ${jones?.receipt_count}`);
    if (!jones?.observations.some(observation => observation.predicate === 'business_appointment_rules_breach_recorded' && observation.non_retroactive === true)) errors.push('Jones packet must preserve the later compliance breach as non-retroactive context');
    if (!jones?.observations.some(observation => observation.predicate === 'source_explicit_ordinary_explanation' && observation.relation === 'weakens')) errors.push('Jones packet must carry the official ordinary explanation and counterevidence');

    const succession = compiledPackets.find(packet => packet.case_id === 'state-market-central-government-ai-unit-succession');
    if (succession?.receipt_count !== 8) errors.push(`institutional packet must carry eight unique receipts, got ${succession?.receipt_count}`);
    if (!succession?.observations.some(observation => observation.predicate === 'institutional_succession_not_established_in_opened_sources' && observation.relation === 'null_result')) errors.push('institutional packet must preserve the refused 10DS to i.AI succession as a bounded null');
    if (!succession?.observations.some(observation => observation.predicate === 'units_collaborated' && observation.relation === 'context')) errors.push('institutional packet must keep collaboration distinct from succession');

    if (errors.length) {
      console.error(`validate-thesis-case-packets: ${errors.length} error(s)`);
      for (const error of errors) console.error(`- ${error}`);
      process.exit(1);
    }

    console.log(`validate-thesis-case-packets: OK (${index.totals.cases} intake cases, ${index.totals.observations} observations, ${index.totals.repository_receipts} receipts, 0 promoted evidence packets)`);
    ''',
)


write_text(
    "test/thesis-case-packet.test.js",
    r'''
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
    const ledgerReceiptIds = new Set(readFileSync('data/ledger/receipts.jsonl', 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line).receipt_id));
    const files = ['state-market-no10-pandemic-data-diaspora', 'state-market-central-government-ai-unit-succession'];
    const actualPackets = files.map(id => JSON.parse(readFileSync(`data/research/thesis-case-packets/${id}.json`, 'utf8')));

    for (const packet of actualPackets) {
      assert.deepEqual(validateThesisCasePacket(packet, { thesisCaseIds, thesisPropositionIds, receiptIds: ledgerReceiptIds }), []);
      const compiled = compileThesisCasePacket(packet);
      assert.equal(compiled.graph_effect, 'none');
      assert.equal(compiled.conclusion_generated, false);
      assert.equal(compiled.receipt_custody_status, 'complete');
      assert.ok(compiled.receipt_count > 0);
      assert.equal(compiled.promotion.repository_receipts_complete, true);
      assert.equal(compiled.promotion.human_review_complete, false);
      assert.equal(compiled.promotion.denominator_complete, false);
      assert.equal(compiled.promotion.eligible_for_thesis_evidence_promotion, false);
      assert.equal(compiled.thesis_consumption.evidence_packet_emitted, false);
      assert.match(renderThesisCasePacketMarkdown(compiled), /remains intake until receipt custody, denominator, and human-review gates pass/i);
    }

    const index = compileThesisCasePacketIndex(actualPackets.map(compileThesisCasePacket));
    assert.equal(index.totals.cases, 2);
    assert.equal(index.totals.repository_receipts, 11);
    assert.equal(index.totals.receipt_complete_cases, 2);
    assert.equal(index.totals.human_review_complete_cases, 0);
    assert.equal(index.totals.denominator_complete_cases, 0);
    assert.equal(index.totals.eligible_for_promotion, 0);
    assert.equal(index.totals.emitted_thesis_evidence_packets, 0);
    assert.ok(index.totals.intended_support_observations > 0);
    assert.ok(index.totals.challenge_observations > 0);
    assert.match(renderThesisCasePacketIndexMarkdown(index), /Repository receipts: 11/);
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
    assert.ok(validateThesisCasePacket(unknownSource, { thesisCaseIds, thesisPropositionIds, receiptIds: ledgerReceiptIds }).some(error => /unknown source/.test(error)));

    const universalNull = structuredClone(succession);
    const nullObservation = universalNull.observations.find(observation => observation.relation === 'null_result');
    nullObservation.factual_statement = 'This proves universal absence and no relationship exists.';
    assert.ok(validateThesisCasePacket(universalNull, { thesisCaseIds, thesisPropositionIds, receiptIds: ledgerReceiptIds }).some(error => /overstates a bounded source search/.test(error)));

    const retroactive = structuredClone(jones);
    retroactive.observations.find(observation => observation.temporal_status === 'later_compliance_record').non_retroactive = false;
    assert.ok(validateThesisCasePacket(retroactive, { thesisCaseIds, thesisPropositionIds, receiptIds: ledgerReceiptIds }).some(error => /must be explicitly non-retroactive/.test(error)));

    const missingChallenge = structuredClone(jones);
    missingChallenge.observations = missingChallenge.observations.filter(observation => !['weakens', 'contradicts', 'null_result'].includes(observation.relation));
    missingChallenge.case_disposition.challenge_material_present = false;
    assert.ok(validateThesisCasePacket(missingChallenge, { thesisCaseIds, thesisPropositionIds, receiptIds: ledgerReceiptIds }).some(error => /requires weakening, contradiction, or bounded-null/.test(error)));

    const unblockedUnready = structuredClone(jones);
    unblockedUnready.observations.find(observation => observation.relation === 'supports').promotion_status = 'ready';
    assert.ok(validateThesisCasePacket(unblockedUnready, { thesisCaseIds, thesisPropositionIds, receiptIds: ledgerReceiptIds }).some(error => /must remain blocked/.test(error)));

    const fakeReceipt = structuredClone(jones);
    fakeReceipt.observations.find(observation => observation.relation === 'supports').receipt_ids = ['receipt-does-not-exist'];
    assert.ok(validateThesisCasePacket(fakeReceipt, { thesisCaseIds, thesisPropositionIds, receiptIds: ledgerReceiptIds }).some(error => /unknown receipt/.test(error)));

    const staleStatus = structuredClone(jones);
    staleStatus.status = 'intake_pending_receipt_ingest_and_human_review';
    assert.ok(validateThesisCasePacket(staleStatus, { thesisCaseIds, thesisPropositionIds, receiptIds: ledgerReceiptIds }).some(error => /status expected/.test(error)));

    const selfPromoting = structuredClone(jones);
    for (const observation of selfPromoting.observations.filter(item => ['supports', 'weakens', 'contradicts'].includes(item.relation))) {
      observation.review_status = 'human_reviewed';
      observation.promotion_status = 'blocked_pending_separate_human_promotion';
    }
    selfPromoting.case_disposition.repository_receipts_complete = true;
    selfPromoting.case_disposition.human_review_complete = true;
    selfPromoting.case_disposition.denominator_complete = true;
    selfPromoting.case_disposition.eligible_for_thesis_evidence_promotion = true;
    assert.ok(validateThesisCasePacket(selfPromoting, { thesisCaseIds, thesisPropositionIds, receiptIds: ledgerReceiptIds }).some(error => /unexpectedly satisfies promotion|separate reviewed action/.test(error)));

    const forbiddenField = structuredClone(jones);
    forbiddenField.observations[0].verdict = 'proved';
    assert.ok(validateThesisCasePacket(forbiddenField, { thesisCaseIds, thesisPropositionIds, receiptIds: ledgerReceiptIds }).some(error => /forbidden field verdict/.test(error)));

    console.log('thesis-case-packet.test.js: OK');
    ''',
)


write_text(
    "test/thesis-state-market-receipts.test.js",
    r'''
    import assert from 'node:assert/strict';
    import { existsSync, readFileSync } from 'node:fs';
    import { compileThesisCasePacket } from '../tools/lib/thesis-case-packet.mjs';
    import { canonicalReceiptHash } from '../tools/lib/receipt-archival.mjs';

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

    const receipts = readFileSync('data/ledger/receipts.jsonl', 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    const receiptById = new Map(receipts.map(receipt => [receipt.receipt_id, receipt]));

    for (const receiptId of expectedReceiptIds) {
      const receipt = receiptById.get(receiptId);
      assert.ok(receipt, `${receiptId} must exist in the receipt ledger`);
      assert.equal(receipt.source_type, 'official_source_extract');
      assert.equal(receipt.evidence_class, 'official');
      assert.equal(receipt.archive?.method, 'in_repo_content_hash');
      assert.match(receipt.archive?.ref ?? '', /^sha256:[a-f0-9]{64}$/);
      assert.equal(receipt.archive?.captured, '2026-07-21');
      assert.match(receipt.path, /^receipts\/thesis-state-market\//);
      assert.ok(existsSync(receipt.path), `${receipt.path} must exist`);
      assert.equal(receipt.archive.ref, `sha256:${canonicalReceiptHash(receipt.path)}`, `${receiptId} canonical content hash must match the immutable extract`);
      assert.match(receipt.archive?.note ?? '', /extract, not the remote page/i);
      const text = readFileSync(receipt.path, 'utf8');
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

    const jonesPacket = packets.find(packet => packet.case_id === 'state-market-no10-pandemic-data-diaspora');
    const breach = jonesPacket.observations.find(observation => observation.predicate === 'business_appointment_rules_breach_recorded');
    assert.equal(breach.non_retroactive, true);
    assert.ok(breach.forbidden_inferences.some(item => /retroactive|retroactively/i.test(item)));
    assert.ok(!breach.objects.includes('CeraCare'));

    const successionPacket = packets.find(packet => packet.case_id === 'state-market-central-government-ai-unit-succession');
    const boundedNull = successionPacket.observations.find(observation => observation.relation === 'null_result');
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
    ''',
)


# Pages release contract: ship all extracts and verify receipt custody without promotion.
pages_path = ROOT / "tools/validate-pages.mjs"
pages = pages_path.read_text(encoding="utf-8")
insert_after = (
    "  'data/research/thesis-case-packets/state-market-central-government-ai-unit-succession.json',\n"
)
receipt_paths = [
    "receipts/thesis-state-market/gov-acoba-samantha-jones-case-index-2024.md",
    "receipts/thesis-state-market/gov-acoba-samantha-jones-ceracare-2024.md",
    "receipts/thesis-state-market/civil-service-commission-samantha-harrison-breach-2026.md",
    "receipts/thesis-state-market/gov-no10ds-formation-mid-2020.md",
    "receipts/thesis-state-market/gov-iai-announcement-2023.md",
    "receipts/thesis-state-market/gov-dsit-digital-ai-transfer-2024.md",
    "receipts/thesis-state-market/gov-dsit-accounting-system-statement-2025.md",
    "receipts/thesis-state-market/gov-cddo-about-new-gds-2025.md",
    "receipts/thesis-state-market/gov-gds-about-new-gds-2025.md",
    "receipts/thesis-state-market/gov-ai-playbook-red-teaming-2025.md",
    "receipts/thesis-state-market/gsa-centers-of-excellence-2017.md",
]
receipt_required = "".join(f"  '{path}',\n" for path in receipt_paths)
if receipt_required.strip() not in pages:
    if insert_after not in pages:
        raise RuntimeError("Pages required-list insertion point is missing")
    pages = pages.replace(insert_after, insert_after + receipt_required)

pages = require_replace(
    pages,
    "  'docs/synthetic-population-vendor-denominator.md', 'docs/thesis-case-packets.md',\n",
    "  'docs/synthetic-population-vendor-denominator.md', 'docs/thesis-case-packets.md',\n"
    "  'docs/thesis-state-market-receipt-custody.md',\n",
    "Pages receipt-custody documentation",
)
pages = require_replace(
    pages,
    "  || casePacketIndex.totals?.repository_receipts !== 0\n",
    "  || casePacketIndex.totals?.repository_receipts !== 11\n"
    "  || casePacketIndex.totals?.receipt_complete_cases !== 2\n"
    "  || casePacketIndex.totals?.human_review_complete_cases !== 0\n"
    "  || casePacketIndex.totals?.denominator_complete_cases !== 0\n",
    "Pages case index receipt counts",
)
pages = require_replace(
    pages,
    "  || jonesPacket.promotion?.eligible_for_thesis_evidence_promotion !== false\n",
    "  || jonesPacket.receipt_custody_status !== 'complete'\n"
    "  || jonesPacket.receipt_count !== 3\n"
    "  || jonesPacket.promotion?.repository_receipts_complete !== true\n"
    "  || jonesPacket.promotion?.human_review_complete !== false\n"
    "  || jonesPacket.promotion?.eligible_for_thesis_evidence_promotion !== false\n",
    "Pages Jones receipt custody",
)
pages = require_replace(
    pages,
    "  || successionPacket.promotion?.eligible_for_thesis_evidence_promotion !== false\n",
    "  || successionPacket.receipt_custody_status !== 'complete'\n"
    "  || successionPacket.receipt_count !== 8\n"
    "  || successionPacket.promotion?.repository_receipts_complete !== true\n"
    "  || successionPacket.promotion?.human_review_complete !== false\n"
    "  || successionPacket.promotion?.eligible_for_thesis_evidence_promotion !== false\n",
    "Pages institutional receipt custody",
)
pages_path.write_text(pages, encoding="utf-8")


write_text(
    "docs/thesis-state-market-receipt-custody.md",
    """
    # State-market thesis receipt custody

    The first two thesis case-intake packets now have immutable repository custody
    for the official-source material used in their bounded observations.

    ## Scope

    The tranche covers eleven sources:

    - three ACOBA and Civil Service Commission records for the Samantha Jones case;
    - seven UK government records for the 10DS, i.AI, DSIT, and new-GDS chronology;
    - one GSA Centers of Excellence comparator record.

    Every receipt is a **structured factual extract**, not a complete HTML or PDF
    snapshot. Each extract preserves the live source URL, capture date, selected
    factual content, and a limitation statement. Its ledger hash authenticates the
    repository extract only; it does not claim that the remote page bytes were
    captured or that the extract is exhaustive.

    ## State separation

    Receipt custody changes the case-packet machine stage from missing-receipt
    intake to human-review-pending intake. It does not complete:

    - the neutral public-side cohort or matched comparator denominator;
    - institutional budget, personnel, programme, supplier, or merger-perimeter normalisation;
    - claim-level human review;
    - independent selection review;
    - a separate evidence-promotion decision.

    The compiled state must therefore remain:

    ```text
    receipt-complete cases:           2
    unique repository receipts:      11
    human-review-complete cases:      0
    denominator-complete cases:       0
    promotion-eligible cases:         0
    emitted thesis evidence packets:  0
    graph effect:                   none
    conclusion generated:           false
    ```

    Intended `supports`, `weakens`, and `null_result` relations inside an intake
    packet remain inadmissible to thesis synthesis until a separate human-reviewed
    promotion action creates a proposition-scoped evidence packet.

    ## Reproduction

    ```bash
    npm run compile:case-packets
    npm run validate:case-packets
    npm run validate:state-market-receipts
    npm run compile:thesis
    npm run validate:thesis
    ```

    The repository-wide `npm run release:check` includes the receipt regression
    through `npm test`.
    """,
)


write_text(
    ".github/workflows/thesis-state-market-receipts.yml",
    """
    name: Thesis state-market receipt custody

    on:
      pull_request:
        paths:
          - 'data/ledger/receipts.jsonl'
          - 'receipts/thesis-state-market/**'
          - 'data/research/thesis-case-packets/**'
          - 'data/research/thesis-evidence/**'
          - 'tools/lib/thesis-case-packet.mjs'
          - 'tools/compile-thesis-case-packets.mjs'
          - 'tools/validate-thesis-case-packets.mjs'
          - 'tools/validate-pages.mjs'
          - 'test/thesis-case-packet.test.js'
          - 'test/thesis-state-market-receipts.test.js'
          - 'docs/thesis-state-market-receipt-custody.md'
          - 'package.json'
          - '.github/workflows/thesis-state-market-receipts.yml'
      workflow_dispatch:

    permissions:
      contents: read

    jobs:
      receipt-custody:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: '20'
          - name: Compile bounded case packets
            run: npm run compile:case-packets
          - name: Validate case-packet and receipt boundaries
            run: |
              npm run validate:case-packets
              npm run validate:state-market-receipts
          - name: Compile the unchanged evidence ceiling
            run: |
              npm run compile:thesis
              npm run validate:thesis
          - name: Verify Pages publication contract
            run: |
              npm run build:pages
              npm run build:standalone
              npm run validate:pages
          - name: Preserve deterministic receipt-custody projections
            uses: actions/upload-artifact@v4
            with:
              name: thesis-state-market-receipt-custody
              path: |
                build/thesis/case-packet-index.json
                build/thesis/case-packet-index.md
                build/thesis/case-packets/*.json
                build/thesis/case-packets/*.md
                build/thesis/synthetic-population-infrastructure.json
                build/thesis/synthetic-population-infrastructure.md
                receipts/thesis-state-market/*.md
              if-no-files-found: error
    """,
)


if not DRY_RUN:
    for temporary in [
        ROOT / ".github/workflows/one-shot-integrate-receipt-custody.yml",
        Path(__file__),
    ]:
        if temporary.exists():
            temporary.unlink()

print(
    "integrate-state-market-receipt-custody: "
    f"{'dry run' if DRY_RUN else 'apply'} complete; "
    "11 receipt IDs remain coverage-only pending human review and denominators"
)
