#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readJsonl, root } from './lib/ledger.mjs';
import { compileThesisBundle, renderThesisMarkdown, validateThesisBundle } from './lib/thesis.mjs';

const thesisId = process.argv[2] || 'synthetic-population-infrastructure';
const manifestPath = `data/research/theses/${thesisId}.json`;
const evidencePath = `data/research/thesis-evidence/${thesisId}.json`;
const reviewsPath = `data/research/thesis-reviews/${thesisId}.json`;

const manifest = readJson(manifestPath);
const evidence = readJson(evidencePath);
const reviews = readJson(reviewsPath);
const receipts = readJsonl('data/ledger/receipts.jsonl');
const receiptIds = new Set(receipts.map(receipt => receipt.receipt_id));
const errors = validateThesisBundle({ manifest, evidence, reviews, receiptIds });
if (errors.length) {
  console.error(`compile-thesis: ${errors.length} source error(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const generatedAt = process.env.CLIFFORD_THESIS_GENERATED_AT
  || `${evidence.captured_at || '1970-01-01'}T00:00:00.000Z`;
const compiled = compileThesisBundle({ manifest, evidence, reviews, generatedAt });
const markdown = renderThesisMarkdown(compiled);
const outputDirectory = path.join(root, 'build', 'thesis');
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(path.join(outputDirectory, `${thesisId}.json`), `${JSON.stringify(compiled, null, 2)}\n`);
fs.writeFileSync(path.join(outputDirectory, `${thesisId}.md`), `${markdown}\n`);

console.log(`compile-thesis: ${thesisId} (${compiled.counts.propositions} propositions, ${compiled.counts.evidence_packets} evidence packets, status ${compiled.status})`);
