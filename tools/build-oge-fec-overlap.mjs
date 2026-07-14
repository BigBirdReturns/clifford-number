#!/usr/bin/env node
// Run only after the corrected OGE extraction completes:
// node tools/build-oge-fec-overlap.mjs --oge-interests=build/oge-beneficial-interests/interests.jsonl --fec-payees=build/fec-payee-inventory/fec-oppexp-cohort-local-20260713-r2/payee-candidates.jsonl --output-dir=build/oge-fec-overlap/fec-oppexp-cohort-local-20260713-r2
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOgeFecOverlap } from './lib/oge-fec-overlap.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
const ogeInterestsFile = path.resolve(repoRoot, arg('oge-interests', 'build/oge-beneficial-interests/interests.jsonl'));
const fecPayeesFile = path.resolve(repoRoot, arg('fec-payees', 'build/fec-payee-inventory/fec-oppexp-cohort-local-20260713-r2/payee-candidates.jsonl'));
const outputDir = path.resolve(repoRoot, arg('output-dir', 'build/oge-fec-overlap/fec-oppexp-cohort-local-20260713-r2'));
const durableOutputArg = arg('durable-output', '');
const durableOutput = durableOutputArg ? path.resolve(repoRoot, durableOutputArg) : null;

for (const [label, file] of [['OGE interests', ogeInterestsFile], ['FEC payee candidates', fecPayeesFile]]) {
  if (!fs.existsSync(file)) {
    console.error(`oge-fec-overlap: ${label} input not found: ${file}`);
    process.exit(2);
  }
}

try {
  const { manifest, manifestPath } = await buildOgeFecOverlap({ ogeInterestsFile, fecPayeesFile, outputDir });
  if (durableOutput) {
    fs.mkdirSync(path.dirname(durableOutput), { recursive: true });
    fs.writeFileSync(durableOutput, `${JSON.stringify({
      ...manifest,
      durable_artifact: true,
      candidates_artifact: `${path.relative(repoRoot, outputDir).replaceAll('\\', '/')}/overlap-candidates.jsonl (gitignored; hash-pinned above)`,
      rejections_artifact: `${path.relative(repoRoot, outputDir).replaceAll('\\', '/')}/rejections.jsonl (gitignored; hash-pinned above)`,
    }, null, 2)}\n`);
  }
  console.log(`oge-fec-overlap: OK (${manifest.coverage.dispositions.candidate_pairs_emitted} unresolved candidates; ${manifest.coverage.dispositions.interests_without_candidates} interests without lexical candidates)`);
  console.log(`manifest: ${manifestPath}`);
  if (durableOutput) console.log(`durable manifest: ${durableOutput}`);
} catch (error) {
  console.error(`oge-fec-overlap: FAILED: ${String(error?.stack ?? error)}`);
  process.exit(1);
}
