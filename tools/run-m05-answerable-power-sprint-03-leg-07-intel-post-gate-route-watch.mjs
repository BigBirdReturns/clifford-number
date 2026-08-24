#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  runIntelRouteWatch,
  validateContract,
  validateReceipt
} from './lib/m05-answerable-power-sprint-03-leg-07-intel-post-gate-route-watch.mjs';

const DEFAULT_CONTRACT = 'data/project/m05-answerable-power-sprint-03-leg-07-intel-post-gate-route-watch-contract.json';
const DEFAULT_OUTPUT = 'build/m05-intel-post-gate-route-watch/m05-intel-post-gate-route-watch-receipt.json';

function usage() {
  return `Usage: node tools/run-m05-answerable-power-sprint-03-leg-07-intel-post-gate-route-watch.mjs [options]\n\nOptions:\n  --contract <path>     Contract JSON path (default: ${DEFAULT_CONTRACT})\n  --output <path>       Receipt JSON path (default: ${DEFAULT_OUTPUT})\n  --previous <path>     Optional prior compatible receipt\n  --observed-at <time>  Historical RFC 3339 observation clock; future values are refused\n  --help                Show this help\n`;
}

function parseArgs(argv) {
  const args = { contract: DEFAULT_CONTRACT, output: DEFAULT_OUTPUT, previous: null, observedAt: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (!['--contract', '--output', '--previous', '--observed-at'].includes(token)) {
      throw new Error(`Unknown argument: ${token}`);
    }
    const value = argv[index + 1];
    index += 1;
    if (!value || value.startsWith('--')) throw new Error(`${token} requires a value`);
    if (token === '--contract') args.contract = value;
    if (token === '--output') args.output = value;
    if (token === '--previous') args.previous = value;
    if (token === '--observed-at') args.observedAt = value;
  }
  return args;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }
  const contract = await readJson(args.contract);
  validateContract(contract);
  const previousReceipt = args.previous ? await readJson(args.previous) : null;
  if (previousReceipt) validateReceipt(previousReceipt, contract);
  const actualNow = Date.now();
  const observedAtMs = args.observedAt === null ? actualNow : Date.parse(args.observedAt);
  if (!Number.isFinite(observedAtMs)) throw new Error(`Invalid --observed-at value: ${args.observedAt}`);
  if (observedAtMs > actualNow) throw new Error(`--observed-at cannot be in the future: ${args.observedAt}`);
  const receipt = await runIntelRouteWatch(contract, { observedAtMs, previousReceipt });
  validateReceipt(receipt, contract);
  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  const outputDir = path.dirname(args.output);
  const stem = path.basename(args.output, path.extname(args.output));
  const summaryPath = path.join(outputDir, `${stem}-summary.json`);
  const proofPath = path.join(outputDir, `${stem}-proof.sha256`);
  await fs.writeFile(summaryPath, `${JSON.stringify(receipt.summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(proofPath, `${receipt.proof_sha256}  ${path.basename(args.output)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({
    receipt: args.output,
    summary: summaryPath,
    proof: proofPath,
    observation_clock_utc: receipt.observation_clock_utc,
    ...receipt.summary
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Intel post-gate route watch failed: ${error?.stack || error}\n`);
  process.exitCode = 1;
});
