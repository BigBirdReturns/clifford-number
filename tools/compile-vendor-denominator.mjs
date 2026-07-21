#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readJson, root } from './lib/ledger.mjs';
import { compileVendorDenominator, renderVendorDenominatorMarkdown, validateVendorDenominator } from './lib/vendor-denominator.mjs';

const sourcePath = 'data/research/denominators/synthetic-population-vendors.json';
const ledger = readJson(sourcePath);
const errors = validateVendorDenominator(ledger);
if (errors.length) {
  console.error(`compile-vendor-denominator: ${errors.length} source error(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const compiled = compileVendorDenominator(ledger);
const markdown = renderVendorDenominatorMarkdown(compiled);
const outputDirectory = path.join(root, 'build', 'research');
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(path.join(outputDirectory, 'synthetic-population-vendor-denominator.json'), `${JSON.stringify(compiled, null, 2)}\n`);
fs.writeFileSync(path.join(outputDirectory, 'synthetic-population-vendor-denominator.md'), `${markdown}\n`);
console.log(`compile-vendor-denominator: ${compiled.counts.public_recovery_candidates_transcribed} recovery candidates, ${compiled.counts.denominator_members_frozen} frozen members, status ${compiled.status}`);
