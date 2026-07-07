#!/usr/bin/env node
// Dark-network delta (BUILD-INSTRUCTIONS 3.3): the diff of two compiles of the
// same case, rendered as a narrated changelog with receipts. Deltas are the
// publishable unit — the FA series consumes them.
//
//   node tools/delta.mjs --case <id> --from <gitref|dir> --to <gitref|dir> [--md|--json]
//
// --from / --to each resolve a COMPILE STATE. If the value is a directory, its
// hop-graph.json (+ surface-graph.json if present) is read from disk. Otherwise
// the value is a git ref and the artifacts are read straight out of git:
//
//     git show <ref>:build/cases/<id>/hop-graph.json
//
// falling back to the legacy top-level path
//
//     git show <ref>:build/hop-graph.json
//
// for refs that predate the multi-case layout (that path only ever held the
// DEFAULT case). Build artifacts are committed in this repo, so git refs ARE the
// compile history: no snapshot infrastructure is needed to diff across time.
//
// The diff is computed at hop-basis granularity: edges are keyed by the sorted
// actor pair, bases by surface_id within the pair. Every rendered sentence
// carries the receipt ids in effect and the temporal / evidence honesty flags,
// in the style of tools/narrate-hops.mjs. This tool adds no facts; it only
// reports what changed between two mechanically built graphs.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { root, evidenceWeight } from './lib/ledger.mjs';

// ---------- compile-state resolution ----------
function gitShow(ref, file) {
  return execFileSync('git', ['show', `${ref}:${file}`], {
    cwd: root, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
  }).toString();
}

function tryJson(fn) { try { return JSON.parse(fn()); } catch { return null; } }

// Resolve a --from/--to value to { hop, surface, id, source, path }. A directory
// is read from disk; anything else is treated as a git ref and read via git show.
export function resolveCompile(value, caseId) {
  const asDir = path.resolve(process.cwd(), value);
  if (fs.existsSync(asDir) && fs.statSync(asDir).isDirectory()) {
    const hop = JSON.parse(fs.readFileSync(path.join(asDir, 'hop-graph.json'), 'utf8'));
    const sp = path.join(asDir, 'surface-graph.json');
    const surface = fs.existsSync(sp) ? JSON.parse(fs.readFileSync(sp, 'utf8')) : null;
    return { hop, surface, id: value, source: 'dir', path: asDir };
  }
  // Git ref. Prefer the multi-case path; fall back to the legacy top-level path
  // for refs predating the per-case layout (default case only). THIS FALLBACK is
  // what lets a delta reach back across the multi-case migration.
  const primary = `build/cases/${caseId}/hop-graph.json`;
  const fallback = 'build/hop-graph.json';
  let hop = tryJson(() => gitShow(value, primary));
  let usedPath = primary;
  if (hop === null) {
    hop = tryJson(() => gitShow(value, fallback));
    usedPath = fallback;
  }
  if (hop === null) {
    throw new Error(`could not read a hop-graph for ref '${value}' at ${primary} or ${fallback}`);
  }
  // Surface graph sits beside whichever hop-graph path resolved.
  const dir = path.posix.dirname(usedPath);
  const surface = tryJson(() => gitShow(value, `${dir}/surface-graph.json`));
  return { hop, surface, id: value, source: 'git', path: usedPath };
}

// ---------- indexing helpers ----------
const edgeKey = e => [e.actor_a, e.actor_b].slice().sort().join('||');
const pairActors = key => key.split('||');

function indexEdges(compile) {
  const m = new Map();
  for (const e of compile.hop.edges ?? []) m.set(edgeKey(e), e);
  return m;
}
function basisMap(edge) {
  const m = new Map();
  for (const b of edge?.surfaces ?? []) m.set(b.surface_id, b);
  return m;
}
function surfaceIdSet(compile) {
  if (Array.isArray(compile.surface?.surfaces)) {
    return new Set(compile.surface.surfaces.map(s => s.surface_id));
  }
  const set = new Set();
  for (const e of compile.hop.edges ?? []) for (const b of e.surfaces ?? []) set.add(b.surface_id);
  return set;
}
function surfaceLabelMap(compile) {
  const m = new Map();
  for (const s of compile.surface?.surfaces ?? []) m.set(s.surface_id, s.surface_label);
  for (const e of compile.hop.edges ?? []) for (const b of e.surfaces ?? []) if (!m.has(b.surface_id)) m.set(b.surface_id, b.surface_label);
  return m;
}
function surfaceReceiptMap(compile) {
  const m = new Map();
  for (const s of compile.surface?.surfaces ?? []) if (s.receipt_ids) m.set(s.surface_id, s.receipt_ids);
  for (const e of compile.hop.edges ?? []) for (const b of e.surfaces ?? []) if (!m.has(b.surface_id) && b.receipt_ids) m.set(b.surface_id, b.receipt_ids);
  return m;
}
function actorLabelMap(...compiles) {
  const m = new Map();
  for (const c of compiles) for (const a of c?.surface?.actors ?? []) if (!m.has(a.id)) m.set(a.id, a.label);
  return m;
}
function basisSummary(b) {
  return {
    surface_id: b.surface_id,
    surface_label: b.surface_label,
    surface_type: b.surface_type,
    evidence_class: b.evidence_class,
    temporal_status: b.temporal_status,
    valid_from: b.valid_from ?? null,
    valid_until: b.valid_until ?? null,
    receipt_ids: b.receipt_ids ?? [],
  };
}

// ---------- window classification ----------
// A basis window changes on either side; a valid_until opening/closing is called
// out by name because "the open end became dated" (or the reverse) is the whole
// point of a temporal delta.
function classifyWindow(from, to) {
  const cls = [];
  const fFrom = from.valid_from ?? null, tFrom = to.valid_from ?? null;
  const fUntil = from.valid_until ?? null, tUntil = to.valid_until ?? null;
  if (fUntil !== tUntil) {
    if (fUntil === null && tUntil !== null) cls.push({ type: 'window_closed', side: 'valid_until' });
    else if (fUntil !== null && tUntil === null) cls.push({ type: 'window_opened', side: 'valid_until' });
    else if (tUntil > fUntil) cls.push({ type: 'window_widened', side: 'valid_until' });
    else cls.push({ type: 'window_narrowed', side: 'valid_until' });
  }
  if (fFrom !== tFrom) {
    if (tFrom === null && fFrom !== null) cls.push({ type: 'window_widened', side: 'valid_from' });
    else if (fFrom === null && tFrom !== null) cls.push({ type: 'window_narrowed', side: 'valid_from' });
    else if (tFrom < fFrom) cls.push({ type: 'window_widened', side: 'valid_from' });
    else cls.push({ type: 'window_narrowed', side: 'valid_from' });
  }
  if ((from.temporal_status ?? null) !== (to.temporal_status ?? null)) {
    cls.push({ type: 'temporal_status_change', from: from.temporal_status ?? null, to: to.temporal_status ?? null });
  }
  return cls;
}

// ---------- the diff ----------
export function diffCompiles(fromCompile, toCompile, opts = {}) {
  const caseId = opts.caseId ?? toCompile.hop?.case ?? fromCompile.hop?.case ?? 'unknown';
  const fromEdges = indexEdges(fromCompile);
  const toEdges = indexEdges(toCompile);

  const labelOf = sid => surfaceLabelMap(toCompile).get(sid) ?? surfaceLabelMap(fromCompile).get(sid) ?? sid;
  const toLabels = surfaceLabelMap(toCompile);
  const fromLabels = surfaceLabelMap(fromCompile);
  const label = sid => toLabels.get(sid) ?? fromLabels.get(sid) ?? sid;
  const toReceipts = surfaceReceiptMap(toCompile);
  const fromReceipts = surfaceReceiptMap(fromCompile);
  const actorLabels = actorLabelMap(toCompile, fromCompile);
  const actor = id => actorLabels.get(id) ?? id;

  // --- surfaces (union of basis surface_ids, or surface-graph when present) ---
  const fromSurfaces = surfaceIdSet(fromCompile);
  const toSurfaces = surfaceIdSet(toCompile);
  const new_surfaces = [...toSurfaces].filter(s => !fromSurfaces.has(s))
    .map(sid => ({ surface_id: sid, label: label(sid), receipt_ids: toReceipts.get(sid) ?? [] }));
  const removed_surfaces = [...fromSurfaces].filter(s => !toSurfaces.has(s))
    .map(sid => ({ surface_id: sid, label: label(sid), receipt_ids: fromReceipts.get(sid) ?? [] }));

  // --- hop pairs (an actor pair gaining/losing its first/last basis) ---
  const new_hop_pairs = [];
  const removed_hop_pairs = [];
  for (const [key, edge] of toEdges) {
    if (!fromEdges.has(key)) {
      const [a, b] = pairActors(key);
      new_hop_pairs.push({ pair: key, actor_a: a, actor_b: b, actor_a_label: actor(a), actor_b_label: actor(b), bases: (edge.surfaces ?? []).map(basisSummary) });
    }
  }
  for (const [key, edge] of fromEdges) {
    if (!toEdges.has(key)) {
      const [a, b] = pairActors(key);
      removed_hop_pairs.push({ pair: key, actor_a: a, actor_b: b, actor_a_label: actor(a), actor_b_label: actor(b), bases: (edge.surfaces ?? []).map(basisSummary) });
    }
  }

  // --- bases / windows / evidence / receipts, for pairs present in BOTH ---
  const new_bases = [];
  const removed_bases = [];
  const window_changes = [];
  const evidence_changes = [];
  const receipt_changes = [];
  for (const [key, toEdge] of toEdges) {
    const fromEdge = fromEdges.get(key);
    if (!fromEdge) continue;
    const [a, b] = pairActors(key);
    const meta = { pair: key, actor_a: a, actor_b: b, actor_a_label: actor(a), actor_b_label: actor(b) };
    const fromB = basisMap(fromEdge);
    const toB = basisMap(toEdge);

    for (const [sid, tb] of toB) {
      if (!fromB.has(sid)) { new_bases.push({ ...meta, ...basisSummary(tb) }); continue; }
      const fb = fromB.get(sid);

      // window change
      const cls = classifyWindow(fb, tb);
      if (cls.length) {
        window_changes.push({
          ...meta, surface_id: sid, label: label(sid),
          classifications: cls,
          from: { valid_from: fb.valid_from ?? null, valid_until: fb.valid_until ?? null, temporal_status: fb.temporal_status ?? null },
          to: { valid_from: tb.valid_from ?? null, valid_until: tb.valid_until ?? null, temporal_status: tb.temporal_status ?? null },
          receipt_ids: tb.receipt_ids ?? [],
        });
      }

      // evidence change (direction per evidenceWeight in tools/lib/ledger.mjs;
      // a LOWER weight is stronger, so a fall in weight is a move UP the ladder)
      if (fb.evidence_class !== tb.evidence_class) {
        const fw = evidenceWeight(fb.evidence_class), tw = evidenceWeight(tb.evidence_class);
        const direction = tw < fw ? 'upgraded' : tw > fw ? 'downgraded' : 'reclassified';
        evidence_changes.push({
          ...meta, surface_id: sid, label: label(sid),
          from_evidence: fb.evidence_class, to_evidence: tb.evidence_class,
          from_weight: fw, to_weight: tw, direction,
          temporal_status: tb.temporal_status ?? null, receipt_ids: tb.receipt_ids ?? [],
        });
      }

      // receipt change
      const fr = new Set(fb.receipt_ids ?? []);
      const tr = new Set(tb.receipt_ids ?? []);
      const gained = [...tr].filter(r => !fr.has(r));
      const lost = [...fr].filter(r => !tr.has(r));
      if (gained.length || lost.length) {
        receipt_changes.push({
          ...meta, surface_id: sid, label: label(sid),
          gained, lost, receipt_ids: tb.receipt_ids ?? [],
          evidence_class: tb.evidence_class, temporal_status: tb.temporal_status ?? null,
        });
      }
    }
    for (const [sid, fb] of fromB) {
      if (!toB.has(sid)) removed_bases.push({ ...meta, ...basisSummary(fb) });
    }
  }

  // --- rejection changes (surfaces entering/leaving rejected_hop_surfaces) ---
  const rejIndex = compile => {
    const m = new Map();
    for (const r of compile.hop.rejected_hop_surfaces ?? []) m.set(r.surface_id, r);
    return m;
  };
  const fromRej = rejIndex(fromCompile);
  const toRej = rejIndex(toCompile);
  const rejEntry = (r, l) => ({ surface_id: r.surface_id, label: l, reason: r.reason, ...(r.population != null ? { population: r.population } : {}), ...(r.threshold != null ? { threshold: r.threshold } : {}) });
  const rejection_changes = {
    entering: [...toRej.values()].filter(r => !fromRej.has(r.surface_id)).map(r => rejEntry(r, label(r.surface_id))),
    leaving: [...fromRej.values()].filter(r => !toRej.has(r.surface_id)).map(r => rejEntry(r, label(r.surface_id))),
  };

  const diff = {
    case: caseId,
    from: { id: fromCompile.id ?? null, source: fromCompile.source ?? null, path: fromCompile.path ?? null, generated: fromCompile.hop?.generated ?? null },
    to: { id: toCompile.id ?? null, source: toCompile.source ?? null, path: toCompile.path ?? null, generated: toCompile.hop?.generated ?? null },
    new_surfaces, removed_surfaces,
    new_hop_pairs, removed_hop_pairs,
    new_bases, removed_bases,
    window_changes, evidence_changes, receipt_changes,
    rejection_changes,
  };
  diff.empty = isEmpty(diff);
  return diff;
}

export function isEmpty(diff) {
  return diff.new_surfaces.length === 0 && diff.removed_surfaces.length === 0
    && diff.new_hop_pairs.length === 0 && diff.removed_hop_pairs.length === 0
    && diff.new_bases.length === 0 && diff.removed_bases.length === 0
    && diff.window_changes.length === 0 && diff.evidence_changes.length === 0
    && diff.receipt_changes.length === 0
    && diff.rejection_changes.entering.length === 0 && diff.rejection_changes.leaving.length === 0;
}

// ---------- narration (mirrors tools/narrate-hops.mjs honesty style) ----------
function honesty(basis) {
  const flags = [];
  if (basis.temporal_status && basis.temporal_status !== 'dated') flags.push(`temporal status: ${basis.temporal_status}`);
  if (basis.evidence_class) flags.push(`evidence: ${basis.evidence_class}`);
  return flags.length ? ` [${flags.join(' | ')}]` : '';
}
function receipts(ids) { return ` (receipts: ${(ids ?? []).length ? ids.join(', ') : 'none'})`; }
function fmtWindow(w) { return `${w.valid_from ?? '…'} → ${w.valid_until ?? 'ongoing'}`; }
function classifyPhrase(cls) {
  return cls.map(c => {
    if (c.type === 'window_closed') return 'window closed (open end now dated)';
    if (c.type === 'window_opened') return 'window opened (dated end now open)';
    if (c.type === 'temporal_status_change') return `temporal status ${c.from} → ${c.to}`;
    return `${c.type.replace('window_', 'window ')} on ${c.side}`;
  }).join('; ');
}

// Render the diff as a narrated changelog. md=true emits markdown headings.
export function render(diff, { md = false } = {}) {
  const L = [];
  const H = t => L.push(md ? `## ${t}` : t.toUpperCase());
  const S = t => L.push(md ? `### ${t}` : `${t}:`);
  const item = t => L.push(md ? `- ${t}` : `  - ${t}`);
  const pair = c => `${c.actor_a_label ?? c.actor_a} and ${c.actor_b_label ?? c.actor_b}`;

  H(`Delta — case ${diff.case}`);
  L.push(md
    ? `**from** \`${diff.from.id ?? '?'}\` (compiled ${diff.from.generated ?? 'unknown'}) → **to** \`${diff.to.id ?? '?'}\` (compiled ${diff.to.generated ?? 'unknown'})`
    : `from ${diff.from.id ?? '?'} (compiled ${diff.from.generated ?? 'unknown'}) -> to ${diff.to.id ?? '?'} (compiled ${diff.to.generated ?? 'unknown'})`);
  L.push('');

  if (diff.empty) {
    L.push('no changes between these compiles');
    return L.join('\n');
  }

  if (diff.new_hop_pairs.length) {
    S('New hop pairs');
    for (const c of diff.new_hop_pairs) {
      const b = c.bases[0] ?? {};
      const extra = c.bases.length > 1 ? ` (+${c.bases.length - 1} further shared surface${c.bases.length - 1 === 1 ? '' : 's'})` : '';
      item(`${pair(c)} are a new hop pair, first documented through ${b.surface_label ?? b.surface_id}${extra}${honesty(b)}${receipts(b.receipt_ids)}.`);
    }
    L.push('');
  }
  if (diff.removed_hop_pairs.length) {
    S('Removed hop pairs');
    for (const c of diff.removed_hop_pairs) {
      const b = c.bases[0] ?? {};
      item(`${pair(c)} are no longer a hop pair; their last basis ${b.surface_label ?? b.surface_id} left the graph${honesty(b)}${receipts(b.receipt_ids)}.`);
    }
    L.push('');
  }
  if (diff.new_bases.length) {
    S('New bases');
    for (const c of diff.new_bases) {
      item(`${pair(c)} gained a shared surface — ${c.surface_label ?? c.surface_id} (${fmtWindow(c)})${honesty(c)}${receipts(c.receipt_ids)}.`);
    }
    L.push('');
  }
  if (diff.removed_bases.length) {
    S('Removed bases');
    for (const c of diff.removed_bases) {
      item(`${pair(c)} lost a shared surface — ${c.surface_label ?? c.surface_id} (${fmtWindow(c)})${honesty(c)}${receipts(c.receipt_ids)}.`);
    }
    L.push('');
  }
  if (diff.window_changes.length) {
    S('Window changes');
    for (const c of diff.window_changes) {
      item(`${pair(c)} on ${c.label}: ${classifyPhrase(c.classifications)} — ${fmtWindow(c.from)} ⇒ ${fmtWindow(c.to)}${honesty({ temporal_status: c.to.temporal_status })}${receipts(c.receipt_ids)}.`);
    }
    L.push('');
  }
  if (diff.evidence_changes.length) {
    S('Evidence changes');
    for (const c of diff.evidence_changes) {
      const dir = c.direction === 'upgraded' ? 'moved UP the evidence ladder' : c.direction === 'downgraded' ? 'moved DOWN the evidence ladder' : 'was reclassified (same rung)';
      item(`${pair(c)} on ${c.label}: evidence ${c.from_evidence} → ${c.to_evidence} — ${dir}${c.temporal_status && c.temporal_status !== 'dated' ? ` [temporal status: ${c.temporal_status}]` : ''}${receipts(c.receipt_ids)}.`);
    }
    L.push('');
  }
  if (diff.receipt_changes.length) {
    S('Receipt changes');
    for (const c of diff.receipt_changes) {
      const parts = [];
      if (c.gained.length) parts.push(`gained ${c.gained.join(', ')}`);
      if (c.lost.length) parts.push(`lost ${c.lost.join(', ')}`);
      item(`${pair(c)} on ${c.label}: ${parts.join('; ')}${honesty(c)}${receipts(c.receipt_ids)}.`);
    }
    L.push('');
  }
  if (diff.new_surfaces.length) {
    S('New surfaces');
    for (const s of diff.new_surfaces) item(`${s.label} (${s.surface_id}) entered the compile${receipts(s.receipt_ids)}.`);
    L.push('');
  }
  if (diff.removed_surfaces.length) {
    S('Removed surfaces');
    for (const s of diff.removed_surfaces) item(`${s.label} (${s.surface_id}) left the compile${receipts(s.receipt_ids)}.`);
    L.push('');
  }
  if (diff.rejection_changes.entering.length || diff.rejection_changes.leaving.length) {
    S('Rejection changes');
    for (const r of diff.rejection_changes.entering) {
      const detail = r.reason === 'population_exceeds_density_threshold' ? ` (population ${r.population} ≥ threshold ${r.threshold} — the density rule, not noise)` : '';
      item(`${r.label} (${r.surface_id}) entered the rejected set — reason: ${r.reason}${detail}.`);
    }
    for (const r of diff.rejection_changes.leaving) {
      const detail = r.reason === 'population_exceeds_density_threshold' ? ' — a surface that was density-rejected is now scorable again, a story worth telling' : '';
      item(`${r.label} (${r.surface_id}) left the rejected set (was: ${r.reason})${detail}.`);
    }
    L.push('');
  }

  L.push(md
    ? '_Rendered mechanically from the case ledgers. A shared surface is documented co-presence, nothing more — not a claim of coordination, intent, or wrongdoing. Verify any change through its receipt IDs._'
    : 'NOTE: rendered mechanically from the case ledgers. A shared surface is documented co-presence, nothing more - not a claim of coordination, intent, or wrongdoing. Verify any change through its receipt IDs.');
  return L.join('\n');
}

export const renderMarkdown = diff => render(diff, { md: true });
export const renderText = diff => render(diff, { md: false });

// ---------- CLI ----------
function parseArgs(argv) {
  const args = { md: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--md') args.md = true;
    else if (a === '--json') args.json = true;
    else if (a === '--case') args.caseId = argv[++i];
    else if (a === '--from') args.from = argv[++i];
    else if (a === '--to') args.to = argv[++i];
    else { console.error(`unknown argument: ${a}`); process.exit(2); }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.caseId || !args.from) {
    console.error('usage: delta --case <id> --from <gitref|dir> [--to <gitref|dir>] [--md|--json]');
    console.error('  --to defaults to the working tree build/cases/<id>/');
    process.exit(2);
  }
  const toValue = args.to ?? path.join(root, 'build', 'cases', args.caseId);
  let fromCompile, toCompile;
  try {
    fromCompile = resolveCompile(args.from, args.caseId);
    toCompile = resolveCompile(toValue, args.caseId);
  } catch (err) {
    console.error(`delta: ${err.message}`);
    process.exit(1);
  }
  const diff = diffCompiles(fromCompile, toCompile, { caseId: args.caseId });
  if (args.json) {
    console.log(JSON.stringify(diff, null, 2));
  } else {
    console.log(render(diff, { md: args.md }));
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
