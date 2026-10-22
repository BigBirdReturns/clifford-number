#!/usr/bin/env node
// Open one inquiry: recover what drew attention, the investigations it
// touched, which retained observations support or challenge its
// explanations, its decisions and disagreements, and how to return a
// result to its history.
//
//   node tools/reservoir-open.mjs <inquiry_id | project:inquiry_id> [--json] [--join <dir>]... [--view <file>]...
import { buildReservoir, openInquiry, renderOpenInquiry } from './lib/reservoir.mjs';

const args = process.argv.slice(2);
const join = [];
const views = [];
let json = false;
let id = null;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--join') join.push(args[++i]);
  else if (args[i] === '--view') views.push(args[++i]);
  else if (args[i] === '--json') json = true;
  else if (!id) id = args[i];
  else {
    console.error(`unknown argument ${args[i]}`);
    process.exit(2);
  }
}
if (!id) {
  console.error('usage: node tools/reservoir-open.mjs <inquiry_id> [--json] [--join <dir>]... [--view <file>]...');
  process.exit(2);
}

const built = buildReservoir({ write: false, join, views });
const view = openInquiry(built, id);
if (!view) {
  console.error(`no inquiry ${id} in the reservoir (${built.manifest.counts.total_inquiries} inquiries)`);
  process.exit(1);
}
process.stdout.write(json ? `${JSON.stringify(view, null, 2)}\n` : renderOpenInquiry(view));
