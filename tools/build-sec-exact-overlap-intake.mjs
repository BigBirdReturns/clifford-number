#!/usr/bin/env node
// node tools/build-sec-exact-overlap-intake.mjs --overlap=build/oge-fec-overlap/fec-oppexp-cohort-local-20260713-r2/overlap-candidates.jsonl --sec-candidates=build/sec-company-identifiers/exact-public-company-candidates.jsonl --output-dir=build/sec-exact-overlap-intake/fec-oppexp-cohort-local-20260713-r2
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSecExactOverlapIntake } from './lib/sec-exact-overlap-intake.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
const overlapFile = path.resolve(root, arg('overlap', 'build/oge-fec-overlap/fec-oppexp-cohort-local-20260713-r2/overlap-candidates.jsonl'));
const secCandidatesFile = path.resolve(root, arg('sec-candidates', 'build/sec-company-identifiers/exact-public-company-candidates.jsonl'));
const outputDir = path.resolve(root, arg('output-dir', 'build/sec-exact-overlap-intake/fec-oppexp-cohort-local-20260713-r2'));
const durableOutput = arg('durable-output', '');
for (const file of [overlapFile, secCandidatesFile]) {
  if (!fs.existsSync(file)) { console.error(`sec-exact-overlap-intake: missing input ${file}`); process.exit(2); }
}
try {
  const { manifest, manifestPath } = await buildSecExactOverlapIntake({ overlapFile, secCandidatesFile, outputDir });
  console.log(`sec-exact-overlap-intake: OK (${manifest.coverage.identifier_candidate_rows_emitted} identifier candidates; ${manifest.coverage.accepted_identity_resolutions} resolved identities)`);
  console.log(`manifest: ${manifestPath}`);
  if (durableOutput) {
    const target = path.resolve(root, durableOutput);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(manifestPath, target);
  }
} catch (error) {
  console.error(`sec-exact-overlap-intake: FAILED: ${String(error?.stack ?? error)}`); process.exit(1);
}
