#!/usr/bin/env node
// Validate the person-centered defense-router intake + enforce the completion contract.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EVIDENCE = new Set(['observed', 'self_claimed', 'counterpart_reported', 'official_record', 'independently_corroborated', 'inferred', 'disputed', 'name_match_only', 'unavailable_after_search', 'not_searched', 'source_explicit', 'reported']);
const COUNTERPART = new Set(['counterpart_reported', 'no_counterpart_confirmation_observed', 'third_party_reported_not_counterpart_confirmed', 'not_searched']);
const REQUIRED = ['README.md', 'manifest.json', 'actors.jsonl', 'vehicles.jsonl', 'professional-roles.jsonl', 'portfolio-edges.jsonl', 'advisory-edges.jsonl', 'deal-sourcing-claims.jsonl', 'funding-rounds.jsonl', 'co-investor-edges.jsonl', 'government-programs.jsonl', 'government-awards.jsonl', 'validation-surfaces.jsonl', 'follow-on-capital.jsonl', 'exits.jsonl', 'router-source-universe.jsonl', 'router-candidates.jsonl', 'router-signatures.jsonl', 'game-trails.jsonl', 'trail-frontier.jsonl', 'rejected-joins.jsonl', 'coverage-gaps.jsonl', 'receipts.jsonl', 'analysis.md'];
// The 12 names supplied in the prior prompt's seed list — the denominator must NOT equal only these.
const PRIOR_SEED = new Set(['person:jackson-moses', 'person:sally-donnelly', 'person:tony-demartino', 'person:joshua-baer', 'person:richard-spencer', 'person:rotem-yehuda-kakon', 'person:aviad-grinfeld', 'person:daniel-fouzailov', 'person:joe-lonsdale', 'person:trae-stephens', 'person:katherine-boyle', 'person:tal-shmueli']);

export function validatePersonRouters(dir) {
  const e = [];
  const jl = f => fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l)) : null;
  for (const f of REQUIRED) if (!fs.existsSync(path.join(dir, f))) e.push(`missing required artifact: ${f}`);
  const manifest = fs.existsSync(path.join(dir, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')) : {};
  if (manifest.graph_effect !== 'none') e.push('manifest graph_effect must be none');

  // Jackson canonical node with resolving receipt
  const actors = jl('actors.jsonl') ?? [];
  const receipts = new Map((jl('receipts.jsonl') ?? []).map(r => [r.receipt_id, r]));
  const jm = actors.find(a => a.actor_id === 'person:jackson-moses');
  if (!jm || jm.canonical !== true) e.push('person:jackson-moses canonical node missing');
  else if (!(jm.receipt_ids ?? []).some(id => /^https?:\/\//.test(receipts.get(id)?.locator_url ?? ''))) e.push('Jackson canonical node lacks a resolving receipt');
  for (const v of ['vehicle:silent-ventures', 'vehicle:silent-capital', 'vehicle:jackson-personal-investing']) if (!(jl('vehicles.jsonl') ?? []).some(x => x.vehicle_id === v)) e.push(`vehicle not separated: ${v}`);

  // receipts resolve or demoted with attempts
  for (const r of jl('receipts.jsonl') ?? []) {
    const resolved = /^https?:\/\//.test(r.locator_url ?? '');
    if (!resolved && r.status !== 'receipt_unresolved') e.push(`receipt ${r.receipt_id}: neither resolved nor demoted`);
    if (r.status === 'receipt_unresolved' && !r.unavailable_after_search) e.push(`receipt ${r.receipt_id}: demoted without documented attempts`);
  }

  // ROSTER-DERIVED DENOMINATOR (completion contract): must exceed the prior 12-name seed list
  const universe = jl('router-source-universe.jsonl') ?? [];
  const ids = new Set(universe.map(u => u.candidate_id));
  if (universe.length <= PRIOR_SEED.size) e.push(`router denominator (${universe.length}) must derive from rosters, not only the ${PRIOR_SEED.size}-name seed list`);
  const nonSeed = [...ids].filter(id => !PRIOR_SEED.has(id));
  if (nonSeed.length < 20) e.push('denominator lacks substantial roster-derived (non-seed) candidates');
  for (const u of universe) if (!u.roster_source || !u.roster_receipt) e.push(`candidate ${u.candidate_id} lacks roster source/receipt`);
  const sigs = jl('router-signatures.jsonl') ?? [];
  if (sigs.length !== universe.length) e.push('every candidate must have a signature row');
  for (const s of sigs) if (s.admitted !== (s.routing_score >= s.threshold)) e.push(`signature ${s.actor_id}: admission inconsistent with score`);
  const admitted = sigs.filter(s => s.admitted);

  // COUNTERPART-STATE CONTRACT: no counterpart_not_found without provenance; not both not_searched & found
  for (const f of ['advisory-edges.jsonl', 'deal-sourcing-claims.jsonl']) {
    for (const row of jl(f) ?? []) {
      if (!('counterpart_status' in row)) { e.push(`${f}: ${row.actor_id} missing counterpart_status`); continue; }
      const cs = row.counterpart_status;
      if (!COUNTERPART.has(cs)) e.push(`${f}: invalid counterpart_status ${cs}`);
      // a "no confirmation / reported" state REQUIRES a documented search ref; else it must be not_searched
      if ((cs === 'no_counterpart_confirmation_observed' || cs === 'third_party_reported_not_counterpart_confirmed') && !row.counterpart_search_ref) e.push(`${f}: ${row.counterparty ?? row.company} claims searched-result without counterpart_search_ref`);
      if (row.evidence_state === 'self_claimed' && cs === 'counterpart_reported') e.push(`${f}: self_claimed silently promoted`);
    }
  }

  // every admitted router has a two-hop (>=3 node) trail
  const trails = jl('game-trails.jsonl') ?? [];
  for (const r of admitted) { const t = trails.filter(x => x.hops?.[0] === r.actor_id); if (!t.length) e.push(`admitted router ${r.actor_id} has no game-trail`); }

  // gov awards keep ceiling/obligated/outlay separate
  for (const g of jl('government-awards.jsonl') ?? []) if (!('contract_ceiling_usd' in g) || !('obligated_usd' in g) || !('outlay_usd' in g)) e.push('gov award missing ceiling/obligated/outlay separation');

  // frontier: no required row remains not_searched
  for (const fr of jl('trail-frontier.jsonl') ?? []) if (fr.state === 'not_searched') e.push(`frontier ${fr.frontier_id} left not_searched`);

  // evidence vocab + graph_effect
  for (const f of ['portfolio-edges.jsonl', 'validation-surfaces.jsonl', 'government-awards.jsonl', 'exits.jsonl', 'co-investor-edges.jsonl']) {
    for (const row of jl(f) ?? []) { if (row.graph_effect !== 'none') e.push(`${f}: graph_effect must be none`); if (row.evidence_state != null && !EVIDENCE.has(row.evidence_state)) e.push(`${f}: invalid evidence_state ${row.evidence_state}`); }
  }

  if (typeof manifest.counts?.jackson_x_natsec100 !== 'number') e.push('Jackson×NatSec100 overlap count missing');
  return e;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data/intake/person-centered-defense-routers');
  const errs = validatePersonRouters(dir);
  if (errs.length) { console.error('validate-person-routers failed:'); for (const x of errs) console.error(`- ${x}`); process.exit(1); }
  console.log('validate-person-routers: OK (roster-derived denominator; counterpart states have provenance; admitted routers have trails; ceilings/obligations separate; frontier closed; Jackson overlap ran)');
}
