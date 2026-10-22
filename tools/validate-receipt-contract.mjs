#!/usr/bin/env node
// Mechanical gate for the receipt contract (docs/methodology.md, docs/definitions.md,
// docs/case-ledger.md). Offline: reads data/ledger/receipts.jsonl and the archived
// extracts under receipts/, never the network.
//
// Every receipt row must have
//   - a resolvable source URL (`source_url`, or an http(s) `path`),
//   - an archive reference that resolves: an in-repo extract under receipts/ whose
//     canonical SHA-256 equals archive.ref, or a Wayback snapshot of the source URL,
//   - a non-empty `limits` statement on the row or a `## Limits` section in the extract.
//
// Usage: node tools/validate-receipt-contract.mjs [--root <repo-root>]
import fs from 'node:fs';
import path from 'node:path';
import {
  checkReceiptContract,
  formatReceiptContractError,
} from './lib/receipt-contract.mjs';
import { root as defaultRoot } from './lib/ledger.mjs';

function parseArgs(argv) {
  const args = { root: defaultRoot };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root') args.root = path.resolve(argv[++i] ?? '');
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  return args;
}

function readReceipts(base) {
  const file = path.join(base, 'data/ledger/receipts.jsonl');
  if (!fs.existsSync(file)) throw new Error(`missing receipts ledger: ${file}`);
  const rows = [];
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    try {
      rows.push(JSON.parse(line));
    } catch (error) {
      throw new Error(`data/ledger/receipts.jsonl:${index + 1}: invalid JSONL: ${error.message}`);
    }
  });
  return rows;
}

let result;
try {
  const { root: base } = parseArgs(process.argv.slice(2));
  const receipts = readReceipts(base);
  result = checkReceiptContract(receipts, { root: base });
} catch (error) {
  console.error(`validate-receipt-contract: ${error.message}`);
  process.exit(1);
}

if (result.errors.length > 0) {
  console.error(`validate-receipt-contract: FAILED (${result.errors.length} violation${result.errors.length === 1 ? '' : 's'} across ${new Set(result.errors.map(e => e.receipt_id)).size} receipt${new Set(result.errors.map(e => e.receipt_id)).size === 1 ? '' : 's'})`);
  for (const error of result.errors) console.error(`  - ${formatReceiptContractError(error)}`);
  process.exit(1);
}

const s = result.summary;
console.log(
  `validate-receipt-contract: OK ${s.total_receipts} receipts; `
  + `source URL on all; archive resolved on all (${s.in_repo_hash_checked} SHA-256 matched, ${s.wayback_snapshots} Wayback snapshots); `
  + `limits on all (${s.limits_on_row} on the row, ${s.limits_in_extract} in the extract)`,
);
