#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEmbeddedNameIntake } from './lib/oge-fec-embedded-name-intake.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const ogeInterestsFile = path.resolve(root, arg('oge-interests', 'build/oge-beneficial-interests/interests.jsonl'));
const fecPayeesFile = path.resolve(root, arg('fec-payees', 'build/fec-payee-inventory/fec-oppexp-cohort-local-20260713-r2/payee-candidates.jsonl'));
const outputDir = path.resolve(root, arg('output-dir', 'build/oge-fec-embedded-name/fec-oppexp-cohort-local-20260713-r2'));
const durableOutput = arg('durable-output', '');
for (const file of [ogeInterestsFile, fecPayeesFile]) if (!fs.existsSync(file)) { console.error(`oge-fec-embedded-name: missing input ${file}`); process.exit(2); }
try {
  const { manifest, manifestPath } = await buildEmbeddedNameIntake({ ogeInterestsFile, fecPayeesFile, outputDir });
  console.log(`oge-fec-embedded-name: OK (${manifest.coverage.embedded_candidate_pairs_emitted} candidates; ${manifest.coverage.trump_token_candidate_pairs} contain TRUMP)`);
  console.log(`manifest: ${manifestPath}`);
  if (durableOutput) {
    const target = path.resolve(root, durableOutput);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(manifestPath, target);
  }
} catch (error) { console.error(`oge-fec-embedded-name: FAILED: ${String(error?.stack ?? error)}`); process.exit(1); }
