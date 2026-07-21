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
