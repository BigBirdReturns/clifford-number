#!/usr/bin/env node
// Build the reservoir: join the canonical inquiry, decision and disagreement
// ledgers with questions derived from records already on main and from the
// retrospective, then write build/reservoir/{manifest.json,
// inquiries.compiled.jsonl, circulation-report.md}.
//
//   node tools/build-reservoir.mjs [--join <dir>]... [--view <file>]... [--out <dir>]
//
// --join points at another project's reservoir directory on the estate (one
// holding inquiries.jsonl, disagreements.jsonl and decisions/prune-decisions.jsonl
// whose rows name their own project). --view points at a JSONL view a project
// exposes over its own native records (see docs/methods/reservoir.md). Rows
// from joins and views are validated and indexed alongside this repository's
// rows; nothing is copied. build/<out>/delta.json says what changed since the
// previous build in that directory.
import { buildReservoir } from './lib/reservoir.mjs';

const args = process.argv.slice(2);
const join = [];
const views = [];
let outDir = 'build/reservoir';
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--join') join.push(args[++i]);
  else if (args[i] === '--view') views.push(args[++i]);
  else if (args[i] === '--out') outDir = args[++i];
  else {
    console.error(`unknown argument ${args[i]}`);
    process.exit(2);
  }
}

const built = buildReservoir({ join, views, outDir });
const c = built.manifest.counts;
const d = built.delta;
const change = d.first_build ? 'first build' : d.unchanged ? 'no inputs changed' : `${d.inputs_changed.length + d.inputs_added.length + d.inputs_removed.length} input(s) changed, ${d.inquiries_changed.length} inquiries changed, ${d.inquiries_added.length} added, ${d.inquiries_removed.length} removed`;
console.log(`build-reservoir: ${c.total_inquiries} inquiries (${c.canonical_inquiries} canonical, ${c.retrospective_inquiries} retrospective, ${c.main_derived_inquiries} derived from main, ${c.view_inquiries} from views), ${c.held} held, ${c.open_or_parked} open or parked, ${c.contradictions} contradictions, ${c.reconnections} reconnections; ${c.projects} project(s); fingerprint ${built.manifest.fingerprint}; ${change}`);
