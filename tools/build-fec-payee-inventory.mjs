#!/usr/bin/env node
// After acquisition:
// node tools/build-fec-payee-inventory.mjs --run-dir=build/source-acquisition/fec-oppexp-cohort-v1 --output-dir=build/fec-payee-inventory/fec-oppexp-cohort-v1
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFecPayeeInventory } from './lib/fec-payee-inventory.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dir, '..');
const arg = (name, fallback) => {
  const hit = process.argv.find(value => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const runDir = path.resolve(repoRoot, arg('run-dir', 'build/source-acquisition/fec-oppexp-cohort-v1'));
const inputDir = path.resolve(repoRoot, arg('input-dir', path.join(runDir, 'normalized')));
const outputDir = path.resolve(repoRoot, arg('output-dir', 'build/fec-payee-inventory/fec-oppexp-cohort-v1'));
const durableOutputArg = arg('durable-output', '');
const durableOutput = durableOutputArg ? path.resolve(repoRoot, durableOutputArg) : null;

if (!fs.existsSync(inputDir)) {
  console.error(`fec-payee-inventory: normalized acquisition directory not found: ${inputDir}`);
  console.error('Run: npm run acquire:fec-oppexp -- --run-id=fec-oppexp-cohort-v1');
  console.error('Then: node tools/build-fec-payee-inventory.mjs --run-dir=build/source-acquisition/fec-oppexp-cohort-v1 --output-dir=build/fec-payee-inventory/fec-oppexp-cohort-v1');
  process.exit(2);
}
const inputFiles = fs.readdirSync(inputDir)
  .filter(name => /^oppexp-\d{4}\.jsonl$/i.test(name))
  .map(name => path.join(inputDir, name));

try {
  const { manifest, manifestPath } = await buildFecPayeeInventory({ inputFiles, inputRoot: inputDir, outputDir });
  if (durableOutput) {
    fs.mkdirSync(path.dirname(durableOutput), { recursive: true });
    fs.writeFileSync(durableOutput, `${JSON.stringify({
      ...manifest,
      durable_artifact: true,
      generated_from_run: path.basename(runDir),
      records_artifact: `${path.relative(repoRoot, outputDir).replaceAll('\\', '/')}/payee-records.jsonl (gitignored; hash-pinned above)`,
      candidates_artifact: `${path.relative(repoRoot, outputDir).replaceAll('\\', '/')}/payee-candidates.jsonl (gitignored; hash-pinned above)`,
    }, null, 2)}\n`);
  }
  console.log(`fec-payee-inventory: OK (${manifest.coverage.inventory_records_written} records, ${manifest.coverage.distinct_unresolved_payee_candidates} unresolved candidates)`);
  console.log(`manifest: ${manifestPath}`);
  if (durableOutput) console.log(`durable manifest: ${durableOutput}`);
} catch (error) {
  console.error(`fec-payee-inventory: FAILED: ${String(error?.stack ?? error)}`);
  process.exit(1);
}
