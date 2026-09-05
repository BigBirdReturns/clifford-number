#!/usr/bin/env node
// Plain-language narration over the built hop graph.
//
//   node tools/narrate-hops.mjs --from dominic-cummings --to matt-clifford
//   node tools/narrate-hops.mjs --from ben-warner --as-of 2020 --md
//   node tools/narrate-hops.mjs --from simon-case --legible
//
// This is a READER-FACING compilation target. It adds no facts: every
// sentence is rendered from ledger rows (participation roles, surface
// labels, windows, receipts) or from an optional `plain` block on the
// canonical actor/organization record:
//
//   { "id": "...", "label": "...", "kind": "person",
//     "plain": {
//       "who": "One sentence of who this is, written by a human.",
//       "why_here": "One sentence on why they appear in this case.",
//       "receipt_ids": ["..."] } }
//
// Where no plain block exists, the narrator falls back to a mechanical
// profile derived from the actor's documented participations - honest,
// receipt-backed, and clearly marked as machine-derived.
//
// --legible re-ranks among equal-length shortest paths: prefer hops over
// low-population surfaces (a 4-person advisory beats a 100-name roster),
// fully dated bases, and stronger evidence. Topology is unchanged; only
// which minimal path gets narrated changes.
import { readJson, readJsonl } from './lib/ledger.mjs';
import { buildAdjacency, shortestPath, basisSupportsTimeSlice } from './lib/hops.mjs';
import { formatWindow, windowOf, overlapsPeriod } from './lib/temporal.mjs';
import { resolveLocalId } from './lib/axm-identity.mjs';
import { narrationBasesForSlice, narrationWindowText, selectNarrationBasis } from './lib/narration.mjs';

function parseArgs(argv) {
  const args = { md: false, legible: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--md') args.md = true;
    else if (a === '--json') args.json = true;
    else if (a === '--legible') args.legible = true;
    else if (a === '--from') args.from = argv[++i];
    else if (a === '--to') args.to = argv[++i];
    else if (a === '--as-of') args.asOf = argv[++i];
    else { console.error(`unknown argument: ${a}`); process.exit(2); }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.from) {
  console.error('usage: narrate-hops --from <actor_id> [--to <actor_id>] [--as-of <YYYY[-MM[-DD]]>] [--legible] [--md] [--json]');
  process.exit(2);
}

const hopGraph = readJson('build/hop-graph.json');
const identity = readJson('build/axm-identity.json');
const actorsReg = readJson('data/canonical/actors.json');
const participation = readJsonl('data/ledger/participation.jsonl');

const actors = new Map((actorsReg.actors ?? actorsReg).map(a => [a.id, a]));

// Surface population: distinct actor participants per surface. Legibility is
// roughly inverse to population; a hop through a small bounded surface is
// worth more to a reader (and to inference) than co-presence on a big roster.
const surfacePop = new Map();
const rolesByActor = new Map();
for (const p of participation) {
  if (p.participant_type === 'actor') {
    if (!surfacePop.has(p.surface_id)) surfacePop.set(p.surface_id, new Set());
    surfacePop.get(p.surface_id).add(p.actor_id);
    if (!rolesByActor.has(p.actor_id)) rolesByActor.set(p.actor_id, []);
    rolesByActor.get(p.actor_id).push(p);
  }
}
const pop = sid => (surfacePop.get(sid)?.size ?? 0);

function label(id) { return actors.get(id)?.label ?? id; }

// ---------- actor introductions ----------
function actorIntro(id) {
  const a = actors.get(id);
  if (!a) return { text: `${id}: not in the canonical registry.`, source: 'missing' };
  if (a.plain?.who) {
    const why = a.plain.why_here ? ` ${a.plain.why_here}` : '';
    const rec = a.plain.receipt_ids?.length ? ` [receipts: ${a.plain.receipt_ids.join(', ')}]` : '';
    return { text: `${a.label}: ${a.plain.who}${why}${rec}`, source: 'plain' };
  }
  // Mechanical fallback: documented roles, dated first, at most three.
  const rows = (rolesByActor.get(id) ?? [])
    .slice()
    .sort((x, y) => ((y.time_start ? 1 : 0) - (x.time_start ? 1 : 0)) || String(x.time_start ?? '').localeCompare(String(y.time_start ?? '')));
  if (!rows.length) return { text: `${a.label} (${a.kind}): no participations documented in this case.`, source: 'mechanical' };
  const parts = rows.slice(0, 3).map(p => {
    const w = formatWindow(windowOf(p));
    return `${p.role ?? p.participation_type}${w ? ` (${w})` : ''}`;
  });
  const more = rows.length > 3 ? `; +${rows.length - 3} further documented participation${rows.length - 3 === 1 ? '' : 's'}` : '';
  return {
    text: `${a.label} (${a.kind}): documented in this case as ${parts.join('; ')}${more}. [machine-derived from ledger; no editorial profile yet]`,
    source: 'mechanical',
  };
}

// ---------- hop narration ----------
// Templates keyed by surface_type. {A} {B} {SURFACE} {WINDOW} {ROLE_A} {ROLE_B}.
const TEMPLATES = {
  government_advisory_surface: '{A} and {B} were inside the same government advisory context - {SURFACE} - {WINDOW}, {A} as {ROLE_A} and {B} as {ROLE_B}.',
  employment_investment_surface: '{A} and {B} sat on the same company surface - {SURFACE} - {WINDOW} ({A}: {ROLE_A}; {B}: {ROLE_B}).',
  campaign_surface: '{A} and {B} worked the same campaign operation - {SURFACE} - {WINDOW} ({A}: {ROLE_A}; {B}: {ROLE_B}).',
  founder_officer_surface: '{A} and {B} appear on the same company formation/officer record - {SURFACE} - {WINDOW} ({A}: {ROLE_A}; {B}: {ROLE_B}).',
  customer_vendor_surface: '{A} and {B} were on opposite or adjacent sides of the same customer/vendor relationship - {SURFACE} - {WINDOW} ({A}: {ROLE_A}; {B}: {ROLE_B}).',
  directory_roster_surface: '{A} and {B} both appear on {SURFACE} {WINDOW}. This is a roster co-presence, not a documented working relationship.',
  category_formation_surface: '{A} and {B} were both carried by the same category-formation surface - {SURFACE} - {WINDOW}. Co-presence on a broad list is weak on its own.',
};
const GENERIC = '{A} and {B} shared a bounded surface - {SURFACE} - {WINDOW} ({A}: {ROLE_A}; {B}: {ROLE_B}).';

function fillTemplate(tpl, ctx) {
  return tpl
    .replaceAll('{A}', ctx.A).replaceAll('{B}', ctx.B)
    .replaceAll('{SURFACE}', ctx.SURFACE).replaceAll('{WINDOW}', ctx.WINDOW)
    .replaceAll('{ROLE_A}', ctx.ROLE_A).replaceAll('{ROLE_B}', ctx.ROLE_B);
}

function narrateBasis(aId, bId, s) {
  const ctx = {
    A: label(aId), B: label(bId),
    SURFACE: s.surface_label,
    WINDOW: narrationWindowText(s),
    ROLE_A: s.actor_a_role ?? 'participant',
    ROLE_B: s.actor_b_role ?? 'participant',
  };
  // actor_a/actor_b in the edge are sorted ids; roles may need swapping.
  let sentence = fillTemplate(TEMPLATES[s.surface_type] ?? GENERIC, ctx);
  const flags = [];
  if (s.temporal_status !== 'dated') flags.push(`temporal status: ${s.temporal_status}`);
  const p = pop(s.surface_id);
  if (p >= 20) flags.push(`broad surface: ${p} documented participants - low individual signal`);
  flags.push(`evidence: ${s.evidence_class}`);
  return `${sentence} [${flags.join(' | ')}] (receipts: ${(s.receipt_ids ?? []).join(', ')})`;
}

function orientBasis(edge, fromId, s) {
  // edges store actor_a/actor_b sorted; make roles follow narration order.
  if (edge.actor_a === fromId) return s;
  return { ...s, actor_a_role: s.actor_b_role, actor_b_role: s.actor_a_role };
}

// ---------- legible path selection ----------
// Enumerate all paths of the shortest length (bounded), score for legibility.
function enumerateShortestPaths(adjacency, start, target, k, asOf, cap = 400) {
  const results = [];
  const stack = [[start, [start]]];
  const usable = e => !asOf || e.surfaces.some(s => basisSupportsTimeSlice(s) && overlapsPeriod({ valid_from: s.valid_from, valid_until: s.valid_until, dated: true }, asOf));
  while (stack.length && results.length < cap) {
    const [node, path] = stack.pop();
    if (path.length - 1 > k) continue;
    if (node === target && path.length - 1 === k) { results.push(path); continue; }
    if (path.length - 1 === k) continue;
    for (const n of adjacency.get(node) ?? []) {
      if (path.includes(n.to)) continue;
      if (!usable(n.edge)) continue;
      stack.push([n.to, [...path, n.to]]);
    }
  }
  return results;
}

function edgeBetween(adjacency, a, b) {
  for (const n of adjacency.get(a) ?? []) if (n.to === b) return n.edge;
  return null;
}

function legibilityScore(adjacency, path, asOf = null) {
  let score = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const e = edgeBetween(adjacency, path[i], path[i + 1]);
    const b = selectNarrationBasis(e, { asOf, populationOf: pop });
    score += Math.min(pop(b.surface_id), 50);            // small surfaces read better
    score += b.temporal_status === 'dated' ? 0 : 10;      // undated costs
    score += (TEMPLATES[b.surface_type] ? 0 : 2);          // known type reads better
  }
  return score; // lower is better
}

// ---------- main ----------
const from = resolveLocalId(identity, args.from);
const target = resolveLocalId(identity, args.to ?? hopGraph.anchor_actor_id);
const adjacency = buildAdjacency(hopGraph.edges);
const base = shortestPath(adjacency, from, target, { asOf: args.asOf ?? null });

if (base.number === null || base.number === Infinity || !base.actor_path?.length) {
  console.log(`${label(from)} and ${label(target)} share no surface-hop path${args.asOf ? ` as of ${args.asOf}` : ''} in this case file. Absence of a path is absence of documented shared bounded surfaces - nothing more.`);
  process.exit(0);
}

let path = base.actor_path;
if (args.legible && base.number >= 1) {
  const all = enumerateShortestPaths(adjacency, from, target, base.number, args.asOf ?? null);
  if (all.length > 1) path = all.sort((p, q) =>
    legibilityScore(adjacency, p, args.asOf ?? null) - legibilityScore(adjacency, q, args.asOf ?? null))[0];
}

const introSeen = new Set();
const lines = [];
const H = args.md ? '##' : '';
lines.push(args.md
  ? `## ${label(from)} -> ${label(target)}: Clifford Number ${base.number}${args.asOf ? ` (as of ${args.asOf})` : ''}`
  : `${label(from)} -> ${label(target)}: Clifford Number ${base.number}${args.asOf ? ` (as of ${args.asOf})` : ''}`);
lines.push('');
lines.push(args.md ? '### Who these people are' : 'WHO THESE PEOPLE ARE');
for (const id of path) {
  if (introSeen.has(id)) continue;
  introSeen.add(id);
  const intro = actorIntro(id);
  lines.push(args.md ? `- ${intro.text}` : `  - ${intro.text}`);
}
lines.push('');
lines.push(args.md ? '### The connection, step by step' : 'THE CONNECTION, STEP BY STEP');
for (let i = 0; i < path.length - 1; i++) {
  const a = path[i], b = path[i + 1];
  const edge = edgeBetween(adjacency, a, b);
  const sliceBases = narrationBasesForSlice(edge, args.asOf ?? null);
  const basis = orientBasis(edge, a, selectNarrationBasis(edge, { asOf: args.asOf ?? null, populationOf: pop }));
  const extra = sliceBases.length > 1 ? ` They additionally share ${sliceBases.length - 1} other documented surface${sliceBases.length - 1 === 1 ? '' : 's'}${args.asOf ? ' in this time slice' : ''}.` : '';
  lines.push((args.md ? `${i + 1}. ` : `  ${i + 1}. `) + narrateBasis(a, b, basis) + extra);
}
lines.push('');
lines.push(args.md
  ? '_Every sentence above is rendered from receipt-backed canonical profiles or case-ledger rows. A shared surface is a documented co-presence, not a claim of coordination, intent, or wrongdoing. Verify any hop through its receipt IDs._'
  : 'NOTE: rendered from receipt-backed canonical profiles or case-ledger rows. A shared surface is documented co-presence, not a claim of coordination, intent, or wrongdoing. Verify any hop through its receipt IDs.');

if (args.json) {
  console.log(JSON.stringify({ from, to: target, number: base.number, path, narration: lines.join('\n') }, null, 2));
} else {
  console.log(lines.join('\n'));
}
