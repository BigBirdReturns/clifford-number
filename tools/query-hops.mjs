#!/usr/bin/env node
// On-demand hop query over the built graph.
//
//   node tools/query-hops.mjs --from ben-warner
//   node tools/query-hops.mjs --from dominic-cummings --as-of 2020
//   node tools/query-hops.mjs --from simon-case --to ben-warner --as-of 2020-06 --json
//
// --as-of accepts a year, month, or day and means "at any point during that
// period". Time-sliced paths traverse only fully dated hop bases whose
// overlap window intersects the period.
// --from/--to also accept reconciled e1_ identifiers and unique historical
// e_ case-local tokens from build/axm-identity.json. They resolve to the
// local actor id before traversal without changing graph admission.
import { readJson } from './lib/ledger.mjs';
import { buildAdjacency, shortestPath } from './lib/hops.mjs';
import { formatWindow } from './lib/temporal.mjs';
import { resolveLocalId } from './lib/axm-identity.mjs';

function parseArgs(argv) {
  const args = { json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--from') args.from = argv[++i];
    else if (a === '--to') args.to = argv[++i];
    else if (a === '--as-of') args.asOf = argv[++i];
    else {
      console.error(`unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.from) {
  console.error('usage: query-hops --from <actor_id> [--to <actor_id>] [--as-of <YYYY[-MM[-DD]]>] [--json]');
  process.exit(2);
}

const hopGraph = readJson('build/hop-graph.json');
const identity = readJson('build/axm-identity.json');
const from = resolveLocalId(identity, args.from);
const target = resolveLocalId(identity, args.to ?? hopGraph.anchor_actor_id);
const adjacency = buildAdjacency(hopGraph.edges);
const result = shortestPath(adjacency, from, target, { asOf: args.asOf ?? null });

const output = {
  from,
  to: target,
  as_of: args.asOf ?? null,
  number: result.number,
  actor_path: result.actor_path,
  hops: result.hops,
};

if (args.json) {
  console.log(JSON.stringify(output, null, 2));
} else {
  const slice = args.asOf ? ` as of ${args.asOf}` : '';
  if (result.number === null) {
    console.log(`${from} → ${target}${slice}: no surface-hop path.`);
    if (args.asOf) console.log('(undated hop bases never support time-sliced paths; try without --as-of for all-time topology)');
  } else {
    console.log(`${from} → ${target}${slice}: ${result.number} hop${result.number === 1 ? '' : 's'}`);
    for (const hop of result.hops) {
      console.log(`  ${hop.from} ↔ ${hop.to}`);
      for (const s of hop.shared_surfaces) {
        const windowText = s.temporal_status === 'dated'
          ? formatWindow({ valid_from: s.valid_from, valid_until: s.valid_until, dated: true })
          : 'co-presence dates not fully documented';
        console.log(`    ${s.surface_label} [${windowText}] (${s.evidence_class})`);
      }
    }
  }
}
