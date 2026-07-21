#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readJson, root } from './lib/ledger.mjs';
import { compileVendorDenominator, renderVendorDenominatorMarkdown, validateVendorDenominator } from './lib/vendor-denominator.mjs';

const ledger = readJson('data/research/denominators/synthetic-population-vendors.json');
const errors = validateVendorDenominator(ledger);
const expected = compileVendorDenominator(ledger);
const expectedJson = `${JSON.stringify(expected, null, 2)}\n`;
const expectedMarkdown = `${renderVendorDenominatorMarkdown(expected)}\n`;
const jsonPath = path.join(root, 'build', 'research', 'synthetic-population-vendor-denominator.json');
const markdownPath = path.join(root, 'build', 'research', 'synthetic-population-vendor-denominator.md');

if (!fs.existsSync(jsonPath)) errors.push(`missing compiled vendor denominator JSON ${path.relative(root, jsonPath)}`);
else if (fs.readFileSync(jsonPath, 'utf8') !== expectedJson) errors.push('compiled vendor denominator JSON is stale; run npm run compile:denominator');
if (!fs.existsSync(markdownPath)) errors.push(`missing compiled vendor denominator Markdown ${path.relative(root, markdownPath)}`);
else if (fs.readFileSync(markdownPath, 'utf8') !== expectedMarkdown) errors.push('compiled vendor denominator Markdown is stale; run npm run compile:denominator');

if (expected.usable_as_denominator !== false || expected.status !== 'blocked_not_frozen') errors.push('current public recovery must remain blocked and unusable as a denominator');
if (expected.counts_toward_thesis_evidence !== false || expected.thesis_consumption.evidence_bearing_relation_allowed !== false) errors.push('public recovery must not count as thesis evidence');
if (expected.graph_effect !== 'none' || expected.conclusion_generated !== false) errors.push('vendor denominator build must remain graph-inert and conclusion-free');
if (expected.counts.public_recovery_candidates_transcribed !== 14
  || expected.counts.latest_issue_reported_recovery_count !== 15
  || expected.counts.public_recoveries_not_yet_transcribed !== 1
  || expected.counts.denominator_members_frozen !== 0) {
  errors.push('vendor denominator recovery accounting drifted from the bounded issue record');
}

if (errors.length) {
  console.error(`validate-vendor-denominator: ${errors.length} error(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('validate-vendor-denominator: OK (14 transcribed public recoveries, 15 issue-reported, 0 frozen denominator members, thesis evidence blocked)');
