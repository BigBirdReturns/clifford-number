#!/usr/bin/env node
// On-demand hop query over the built graph.
//
//   node tools/query-hops.mjs --from ben-warner
//   node tools/query-hops.mjs --from dominic-cummings --as-of 2020
//   node tools/query-hops.mjs --from simon-case --to ben-warner --as-of 2020-06 --json
//   node tools/query-hops.mjs --case us-defense-natsec100 --from <id>
//   node tools/query-hops.mjs --case all --from andreessen-horowitz
//
// --as-of accepts a year, month, or day and means "at any point during that
// period". Time-sliced paths traverse only fully dated hop bases whose
// overlap window intersects the period.
//
// --case selects the source graph:
//   (omitted)  the top-level build/*.json (the default case; unchanged).
//   <id>       build/cases/<id>/{hop-graph,axm-identity}.json.
//   all        every pipeline case merged into one graph where each node is
//              case-qualified (<case_id>:<local_id>) EXCEPT joined entities
//              (build/joins.json), which merge into a single node carrying all
//              their case-qualified local ids. Every edge carries its source
//              case_id and traversal crosses cases only through joined nodes.
//
// --from/--to accept a local id (resolved across cases in --case all mode; if
// ambiguous between cases and not joined, the default case is preferred and a
// note is printed) or a canonical AXM entity id (e1_…, canonical or
// alias-derived) from any case's identity layer.
import { readJson, loadCases } from './lib/ledger.mjs';
import { buildAdjacency, shortestPath, basisSupportsTimeSlice, basisWindow } from './lib/hops.mjs';
import { formatWindow, overlapsPeriod } from './lib/temporal.mjs';
import { resolveLocalId } from './lib/axm-identity.mjs';

function parseArgs(argv) {
  const args = { json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--from') args.from = argv[++i];
    else if (a === '--to') args.to = argv[++i];
    else if (a === '--as-of') args.asOf = argv[++i];
    else if (a === '--case') args.caseId = argv[++i];
    else {
      console.error(`unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.from) {
  console.error('usage: query-hops --from <actor_id|e1_…> [--to <actor_id|e1_…>] [--as-of <YYYY[-MM[-DD]]>] [--case <id|all>] [--json]');
  process.exit(2);
}

if (args.caseId === 'all') {
  runMerged(args);
} else {
  runSingleCase(args);
}

// ---- Single case (default top-level, or a specific --case <id>) -------------
function runSingleCase(args) {
  let hopGraphPath = 'build/hop-graph.json';
  let identityPath = 'build/axm-identity.json';
  if (args.caseId) {
    const { cases } = loadCases();
    const caseCfg = cases.find(c => c.id === args.caseId);
    if (!caseCfg) { console.error(`unknown case: ${args.caseId}`); process.exit(2); }
    hopGraphPath = `build/cases/${args.caseId}/hop-graph.json`;
    identityPath = `build/cases/${args.caseId}/axm-identity.json`;
  }

  const hopGraph = readJson(hopGraphPath);
  const identity = readJson(identityPath);
  const from = resolveLocalId(identity, args.from);
  const target = resolveLocalId(identity, args.to ?? hopGraph.anchor_actor_id);
  if (!target) {
    console.error(`case ${args.caseId} has no anchor actor; pass --to <actor_id>`);
    process.exit(2);
  }
  const adjacency = buildAdjacency(hopGraph.edges);
  const result = shortestPath(adjacency, from, target, { asOf: args.asOf ?? null });

  const output = {
    case: hopGraph.case ?? args.caseId ?? null,
    from,
    to: target,
    as_of: args.asOf ?? null,
    number: result.number,
    actor_path: result.actor_path,
    hops: result.hops,
  };

  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }
  const slice = args.asOf ? ` as of ${args.asOf}` : '';
  if (result.number === null) {
    console.log(`${from} → ${target}${slice}: no surface-hop path.`);
    if (args.asOf) console.log('(undated hop bases never support time-sliced paths; try without --as-of for all-time topology)');
  } else {
    console.log(`${from} → ${target}${slice}: ${result.number} hop${result.number === 1 ? '' : 's'}`);
    for (const hop of result.hops) {
      console.log(`  ${hop.from} ↔ ${hop.to}`);
      for (const s of hop.shared_surfaces) {
        console.log(`    ${s.surface_label} [${formatWindow({ valid_from: s.valid_from, valid_until: s.valid_until })}] (${s.evidence_class})`);
      }
    }
  }
}

// ---- Merged, all cases (--case all) -----------------------------------------
function runMerged(args) {
  const { defaultId, cases } = loadCases();
  const joinsDoc = readJson('build/joins.json');

  const identityByCase = new Map();
  const hopGraphByCase = new Map();
  for (const c of cases) {
    identityByCase.set(c.id, readJson(`build/cases/${c.id}/axm-identity.json`));
    hopGraphByCase.set(c.id, readJson(`build/cases/${c.id}/hop-graph.json`));
  }

  // Joined entities collapse into one node keyed by their shared axm id; every
  // case-qualified member maps to that key.
  const joinByKey = new Map();        // node key (axm id) -> join record
  const joinKeyByMember = new Map();  // "case:local" -> node key (axm id)
  for (const j of joinsDoc.joins) {
    joinByKey.set(j.axm_entity_id, j);
    for (const m of j.members) joinKeyByMember.set(`${m.case_id}:${m.local_id}`, j.axm_entity_id);
  }
  const nodeKey = (caseId, localId) => joinKeyByMember.get(`${caseId}:${localId}`) ?? `${caseId}:${localId}`;

  // Merged adjacency: every case's hop edges, each entry tagged with its case_id.
  const adj = new Map();
  const link = (from, to, edge, caseId) => {
    if (!adj.has(from)) adj.set(from, []);
    adj.get(from).push({ to, edge, case_id: caseId });
  };
  for (const c of cases) {
    for (const edge of hopGraphByCase.get(c.id).edges) {
      const ka = nodeKey(c.id, edge.actor_a);
      const kb = nodeKey(c.id, edge.actor_b);
      link(ka, kb, edge, c.id);
      link(kb, ka, edge, c.id);
    }
  }

  const nodeLabel = (key) => {
    if (joinByKey.has(key)) {
      const j = joinByKey.get(key);
      const members = j.members.map(m => `${m.case_id}:${m.local_id}`).join(' + ');
      return `${j.members[0].label} (joined: ${members})`;
    }
    const idx = key.indexOf(':');
    const caseId = key.slice(0, idx);
    const localId = key.slice(idx + 1);
    const ent = identityByCase.get(caseId)?.entities.find(e => e.local_id === localId);
    return `${ent?.label ?? localId} (${key})`;
  };

  // Resolve a --from/--to token to a merged node key.
  const notes = [];
  function resolveNode(token) {
    if (token == null) return null;
    // A join axm id names the merged node directly.
    if (joinByKey.has(token)) return token;
    // Any canonical/alias-derived AXM id resolves via some case's identity.
    if (/^e1_[a-z2-7]{52}$/.test(token)) {
      for (const c of cases) {
        const local = resolveLocalId(identityByCase.get(c.id), token);
        if (local !== token) return nodeKey(c.id, local);
      }
      return token; // unresolved — leave as-is (yields no path)
    }
    // A local id: find which cases carry it.
    const hits = cases.filter(c => identityByCase.get(c.id).entities.some(e => e.local_id === token));
    if (hits.length === 0) return token;
    // If it collapses into a joined node in any case, that node is unambiguous.
    for (const c of hits) {
      const k = nodeKey(c.id, token);
      if (joinByKey.has(k)) return k;
    }
    if (hits.length === 1) return nodeKey(hits[0].id, token);
    const def = hits.find(c => c.id === defaultId) ?? hits[0];
    notes.push(`note: '${token}' exists in ${hits.map(c => c.id).join(', ')} and is not joined — using default case ${def.id}`);
    return nodeKey(def.id, token);
  }

  const from = resolveNode(args.from);
  // Default target: the default case's anchor, if any.
  const defaultAnchor = hopGraphByCase.get(defaultId)?.anchor_actor_id ?? null;
  const target = resolveNode(args.to ?? defaultAnchor);
  if (!target) {
    console.error('--case all: no --to given and the default case has no anchor actor; pass --to');
    process.exit(2);
  }

  const result = mergedShortestPath(adj, from, target, args.asOf ?? null);

  if (args.json) {
    console.log(JSON.stringify({
      case: 'all',
      from,
      to: target,
      from_label: nodeLabel(from),
      to_label: nodeLabel(target),
      as_of: args.asOf ?? null,
      number: result.number,
      node_path: result.node_path,
      notes,
      hops: result.hops.map(h => ({
        from: h.from,
        to: h.to,
        from_label: nodeLabel(h.from),
        to_label: nodeLabel(h.to),
        case_id: h.case_id,
        shared_surfaces: h.shared_surfaces,
      })),
    }, null, 2));
    return;
  }

  for (const n of notes) console.log(n);
  const slice = args.asOf ? ` as of ${args.asOf}` : '';
  if (result.number === null) {
    console.log(`${nodeLabel(from)} → ${nodeLabel(target)}${slice}: no surface-hop path across cases.`);
    if (args.asOf) console.log('(undated hop bases never support time-sliced paths; try without --as-of for all-time topology)');
  } else {
    console.log(`${nodeLabel(from)} → ${nodeLabel(target)}${slice}: ${result.number} hop${result.number === 1 ? '' : 's'}`);
    for (const hop of result.hops) {
      console.log(`  ${nodeLabel(hop.from)} ↔ ${nodeLabel(hop.to)}`);
      console.log(`    [case: ${hop.case_id}]`);
      for (const s of hop.shared_surfaces) {
        console.log(`      ${s.surface_label} [${formatWindow({ valid_from: s.valid_from, valid_until: s.valid_until })}] (${s.evidence_class})`);
      }
    }
  }
}

// BFS over the merged adjacency. asOf restricts to fully dated bases whose window
// intersects the period, exactly as the single-case traversal does.
function mergedShortestPath(adj, start, target, asOf) {
  if (start === target) return { number: 0, node_path: [start], hops: [] };
  const q = [{ node: start, node_path: [start], hops: [] }];
  const seen = new Set([start]);
  while (q.length) {
    const cur = q.shift();
    for (const next of adj.get(cur.node) ?? []) {
      if (seen.has(next.to)) continue;
      const bases = asOf
        ? next.edge.surfaces.filter(b => basisSupportsTimeSlice(b) && overlapsPeriod(basisWindow(b), asOf))
        : next.edge.surfaces;
      if (!bases.length) continue;
      const node_path = [...cur.node_path, next.to];
      const hops = [...cur.hops, { from: cur.node, to: next.to, case_id: next.case_id, shared_surfaces: bases }];
      if (next.to === target) return { number: node_path.length - 1, node_path, hops };
      seen.add(next.to);
      q.push({ node: next.to, node_path, hops });
    }
  }
  return { number: null, node_path: [], hops: [] };
}
