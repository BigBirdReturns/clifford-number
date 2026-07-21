#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readJsonl, root } from './lib/ledger.mjs';
import { compileThesisBundle, renderThesisMarkdown, validateThesisBundle } from './lib/thesis.mjs';

const thesisId = process.argv[2] || 'synthetic-population-infrastructure';
const manifest = readJson(`data/research/theses/${thesisId}.json`);
const evidence = readJson(`data/research/thesis-evidence/${thesisId}.json`);
const reviews = readJson(`data/research/thesis-reviews/${thesisId}.json`);
const receiptIds = new Set(readJsonl('data/ledger/receipts.jsonl').map(receipt => receipt.receipt_id));
const errors = validateThesisBundle({ manifest, evidence, reviews, receiptIds });
const generatedAt = process.env.CLIFFORD_THESIS_GENERATED_AT
  || `${evidence.captured_at || '1970-01-01'}T00:00:00.000Z`;
const expected = compileThesisBundle({ manifest, evidence, reviews, generatedAt });
const expectedJson = `${JSON.stringify(expected, null, 2)}\n`;
const expectedMarkdown = `${renderThesisMarkdown(expected)}\n`;
const jsonPath = path.join(root, 'build', 'thesis', `${thesisId}.json`);
const markdownPath = path.join(root, 'build', 'thesis', `${thesisId}.md`);

if (!fs.existsSync(jsonPath)) errors.push(`missing compiled thesis JSON ${path.relative(root, jsonPath)}`);
else if (fs.readFileSync(jsonPath, 'utf8') !== expectedJson) errors.push('compiled thesis JSON is stale; run npm run compile:thesis');
if (!fs.existsSync(markdownPath)) errors.push(`missing compiled thesis Markdown ${path.relative(root, markdownPath)}`);
else if (fs.readFileSync(markdownPath, 'utf8') !== expectedMarkdown) errors.push('compiled thesis Markdown is stale; run npm run compile:thesis');

if (expected.conclusion_generated !== false || expected.bottom_line_generated !== false) errors.push('compiled thesis must not generate a conclusion or bottom line');
if (expected.graph_effect !== 'none') errors.push('compiled thesis graph_effect must remain none');
if (expected.propositions.some(item => !['open_no_evidence_packets', 'collecting_evidence', 'contested_pending_human_synthesis', 'eligible_for_human_synthesis'].includes(item.machine_disposition))) {
  errors.push('compiled thesis contains an impermissible machine disposition');
}
if (expected.propositions.some(item => /supported|proved|confirmed_thesis/i.test(item.machine_disposition))) {
  errors.push('machine disposition must never assert that the thesis is supported or proved');
}

if (errors.length) {
  console.error(`validate-thesis: ${errors.length} error(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`validate-thesis: OK (${expected.counts.case_contracts} case contracts, ${expected.counts.propositions} propositions, ${expected.counts.evidence_packets} evidence packets, no generated conclusion)`);
