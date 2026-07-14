#!/usr/bin/env node
// Validate the person-centered defense-router intake against the mission's acceptance conditions.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EVIDENCE = new Set(['observed', 'self_claimed', 'counterpart_reported', 'official_record', 'independently_corroborated', 'inferred', 'disputed', 'name_match_only', 'unavailable_after_search', 'not_searched', 'source_explicit', 'reported']);
const REQUIRED = ['README.md', 'manifest.json', 'actors.jsonl', 'vehicles.jsonl', 'professional-roles.jsonl', 'portfolio-edges.jsonl', 'advisory-edges.jsonl', 'deal-sourcing-claims.jsonl', 'funding-rounds.jsonl', 'co-investor-edges.jsonl', 'government-programs.jsonl', 'government-awards.jsonl', 'validation-surfaces.jsonl', 'follow-on-capital.jsonl', 'exits.jsonl', 'router-candidates.jsonl', 'router-signatures.jsonl', 'game-trails.jsonl', 'trail-frontier.jsonl', 'rejected-joins.jsonl', 'coverage-gaps.jsonl', 'receipts.jsonl', 'analysis.md'];

export function validatePersonRouters(dir) {
  const e = [];
  const jl = f => fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l)) : null;
  for (const f of REQUIRED) if (!fs.existsSync(path.join(dir, f))) e.push(`missing required artifact: ${f}`);
  const manifest = fs.existsSync(path.join(dir, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')) : {};
  if (manifest.graph_effect !== 'none') e.push('manifest graph_effect must be none');

  // Jackson canonical node exists with resolving receipt
  const actors = jl('actors.jsonl') ?? [];
  const receipts = new Map((jl('receipts.jsonl') ?? []).map(r => [r.receipt_id, r]));
  const jm = actors.find(a => a.actor_id === 'person:jackson-moses');
  if (!jm || jm.canonical !== true) e.push('person:jackson-moses canonical node missing');
  else if (!(jm.receipt_ids ?? []).some(id => /^https?:\/\//.test(receipts.get(id)?.locator_url ?? ''))) e.push('Jackson canonical node lacks a resolving receipt');

  // vehicles separate
  const vids = new Set((jl('vehicles.jsonl') ?? []).map(v => v.vehicle_id));
  for (const v of ['vehicle:silent-ventures', 'vehicle:silent-capital', 'vehicle:jackson-personal-investing']) if (!vids.has(v)) e.push(`vehicle not separated: ${v}`);

  // receipts resolve or explicitly demoted; blocked ones carry attempts
  for (const r of jl('receipts.jsonl') ?? []) {
    const resolved = /^https?:\/\//.test(r.locator_url ?? '');
    if (!resolved && r.status !== 'receipt_unresolved') e.push(`receipt ${r.receipt_id}: neither resolved nor demoted`);
    if (r.status === 'receipt_unresolved' && !r.unavailable_after_search) e.push(`receipt ${r.receipt_id}: demoted without documented attempts`);
  }

  // router universe has a denominator and every threshold-qualified candidate is processed
  const sigs = jl('router-signatures.jsonl') ?? [];
  const cands = jl('router-candidates.jsonl') ?? [];
  if (!(cands.length > 0)) e.push('router-candidates has no denominator');
  if (sigs.length !== cands.length) e.push('every candidate must have a signature row');
  const admitted = sigs.filter(s => s.admitted);
  for (const s of sigs) {
    if (typeof s.routing_score !== 'number') e.push(`signature ${s.actor_id}: no routing_score`);
    if (s.admitted !== (s.routing_score >= s.threshold)) e.push(`signature ${s.actor_id}: admission inconsistent with score/threshold`);
  }

  // every admitted router has a >=1-trail two-hop pass
  const trails = jl('game-trails.jsonl') ?? [];
  const trailActors = new Set(trails.map(t => t.hops?.[0]));
  for (const r of admitted) if (!trailActors.has(r.actor_id)) e.push(`admitted router ${r.actor_id} has no game-trail`);

  // government ceilings vs obligations vs outlays separated; never conflated
  for (const g of jl('government-awards.jsonl') ?? []) {
    if (!('contract_ceiling_usd' in g) || !('obligated_usd' in g) || !('outlay_usd' in g)) e.push(`gov award missing ceiling/obligated/outlay separation`);
  }

  // per-predicate evidence state vocabulary + dual state + graph_effect
  for (const f of ['portfolio-edges.jsonl', 'advisory-edges.jsonl', 'deal-sourcing-claims.jsonl', 'validation-surfaces.jsonl', 'government-awards.jsonl', 'router-signatures.jsonl', 'exits.jsonl']) {
    for (const row of jl(f) ?? []) {
      if (row.graph_effect !== 'none') e.push(`${f}: graph_effect must be none`);
      const es = row.evidence_state;
      if (es != null && !EVIDENCE.has(es)) e.push(`${f}: invalid evidence_state ${es}`);
    }
  }

  // self-claims not silently promoted (advisory + sourcing carry counterpart_status)
  for (const f of ['advisory-edges.jsonl', 'deal-sourcing-claims.jsonl']) {
    for (const row of jl(f) ?? []) {
      if (!('counterpart_status' in row)) e.push(`${f}: ${row.actor_id ?? ''} missing counterpart_status`);
      if (row.evidence_state === 'self_claimed' && row.counterpart_status === 'counterpart_reported') e.push(`${f}: self_claimed silently promoted`);
    }
  }

  // Jackson overlap actually ran
  if (typeof manifest.counts?.jackson_x_natsec100 !== 'number') e.push('Jackson×NatSec100 overlap count missing (must have run)');
  return e;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data/intake/person-centered-defense-routers');
  const errs = validatePersonRouters(dir);
  if (errs.length) { console.error('validate-person-routers failed:'); for (const x of errs) console.error(`- ${x}`); process.exit(1); }
  console.log('validate-person-routers: OK (Jackson canonical + vehicles separate; router denominator; admitted routers have trails; ceilings/obligations separated; self-claims not auto-promoted; overlap ran)');
}
