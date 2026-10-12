#!/usr/bin/env node
// Build the reservoir: join the canonical inquiry, decision and disagreement
// ledgers with questions derived from records already on main and from the
// retrospective, then write build/reservoir/{manifest.json,
// inquiries.compiled.jsonl, circulation-report.md}.
//
//   node tools/build-reservoir.mjs [--join <dir>]... [--out <dir>]
//
// --join points at another project's reservoir directory on the estate (one
// holding inquiries.jsonl, disagreements.jsonl and decisions/prune-decisions.jsonl
// whose rows name their own project). Rows from joined reservoirs are
// validated and indexed alongside this repository's rows; nothing is copied.
import { buildReservoir } from './lib/reservoir.mjs';

const args = process.argv.slice(2);
const join = [];
let outDir = 'build/reservoir';
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--join') join.push(args[++i]);
  else if (args[i] === '--out') outDir = args[++i];
  else {
    console.error(`unknown argument ${args[i]}`);
    process.exit(2);
  }
}

const built = buildReservoir({ join, outDir });
const c = built.manifest.counts;
console.log(`build-reservoir: ${c.total_inquiries} inquiries (${c.canonical_inquiries} canonical, ${c.retrospective_inquiries} retrospective, ${c.main_derived_inquiries} derived from main), ${c.open_or_parked} open or parked, ${c.contradictions} contradictions, ${c.reconnections} reconnections; ${c.projects} project(s); fingerprint ${built.manifest.fingerprint}`);
