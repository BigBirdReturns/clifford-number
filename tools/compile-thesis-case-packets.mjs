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
const sourceFiles = fs.readdirSync(sourceDirectory)
  .filter(file => file.endsWith('.json'))
  .sort();
const manifest = readJson('data/research/theses/synthetic-population-infrastructure.json');
const receiptIds = new Set(readJsonl('data/ledger/receipts.jsonl').map(receipt => receipt.receipt_id));
const thesisCaseIds = new Set((manifest.case_index ?? []).map(item => item.case_id));
const thesisPropositionIds = new Set((manifest.propositions ?? []).map(item => item.proposition_id));
const compiledPackets = [];
const errors = [];

for (const file of sourceFiles) {
  const packet = JSON.parse(fs.readFileSync(path.join(sourceDirectory, file), 'utf8'));
  const packetErrors = validateThesisCasePacket(packet, { receiptIds, thesisCaseIds, thesisPropositionIds });
  for (const error of packetErrors) errors.push(`${file}: ${error}`);
  compiledPackets.push(compileThesisCasePacket(packet));
}

if (errors.length) {
  console.error(`compile-thesis-case-packets: ${errors.length} source error(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const outputDirectory = path.join(root, 'build', 'thesis', 'case-packets');
fs.mkdirSync(outputDirectory, { recursive: true });
for (const packet of compiledPackets) {
  fs.writeFileSync(path.join(outputDirectory, `${packet.case_id}.json`), `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDirectory, `${packet.case_id}.md`), `${renderThesisCasePacketMarkdown(packet)}\n`);
}
const index = compileThesisCasePacketIndex(compiledPackets);
fs.writeFileSync(path.join(root, 'build', 'thesis', 'case-packet-index.json'), `${JSON.stringify(index, null, 2)}\n`);
fs.writeFileSync(path.join(root, 'build', 'thesis', 'case-packet-index.md'), `${renderThesisCasePacketIndexMarkdown(index)}\n`);
console.log(`compile-thesis-case-packets: ${index.totals.cases} cases, ${index.totals.observations} observations, ${index.totals.repository_receipts} receipts, ${index.totals.emitted_thesis_evidence_packets} emitted thesis evidence packets`);
