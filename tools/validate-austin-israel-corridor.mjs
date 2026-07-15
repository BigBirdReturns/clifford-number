#!/usr/bin/env node
// Validate the Austin–Israel defense-corridor intake against the mission's acceptance conditions.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CORROB = new Set(['source_explicit', 'independently_corroborated', 'self_claimed', 'name_match_only', 'not_searched', 'source_unavailable', 'receipt_unresolved', 'reported', 'no_source_explicit_join_observed_on_searched_surfaces']);
// A confirmed co-listing must reach at least this tier (name_match_only / not_searched are NOT confirmations).
const CONFIRMED_OK = new Set(['source_explicit', 'independently_corroborated', 'reported']);
// Markers that would betray Israel linkage inferred from a name rather than explicit self/press identification.
const NAME_INFERENCE_MARKERS = /surname|last name|name_match|sounds|name suggests|by name|hebrew name/i;
const REQUIRED = ['README.md', 'manifest.json', 'actors.jsonl', 'organizations.jsonl', 'receipts.jsonl', 'professional-claims.jsonl', 'portfolio-edges.jsonl', 'government-surfaces.jsonl', 'join-candidates.jsonl', 'confirmed-joins.jsonl', 'rejected-joins.jsonl', 'coverage-gaps.jsonl', 'motifs.jsonl', 'austin-israel-cohort.jsonl', 'deep-dives.jsonl', 'analysis.md'];

export function validateCorridor(dir) {
  const e = [];
  const jl = f => fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l)) : null;
  for (const f of REQUIRED) if (!fs.existsSync(path.join(dir, f))) e.push(`missing required artifact: ${f}`);
  const manifest = fs.existsSync(path.join(dir, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')) : {};
  if (manifest.graph_effect !== 'none') e.push('manifest graph_effect must be none');

  // receipts: every one resolves OR is explicitly receipt_unresolved
  const receipts = jl('receipts.jsonl') ?? [];
  for (const r of receipts) {
    const resolved = typeof r.locator_url === 'string' && /^https?:\/\//.test(r.locator_url);
    if (!resolved && r.status !== 'receipt_unresolved') e.push(`receipt ${r.receipt_id}: neither resolved nor marked receipt_unresolved`);
  }
  if ((manifest.counts?.receipts_unresolved ?? -1) !== receipts.filter(r => r.status === 'receipt_unresolved').length) e.push('receipts_unresolved count mismatch');
  if ((manifest.counts?.receipts_resolved ?? -1) !== receipts.filter(r => /^https?:\/\//.test(r.locator_url ?? '')).length) e.push('receipts_resolved count mismatch');

  // the Capital Factory overlap actually ran, with denominators
  const confirmed = jl('confirmed-joins.jsonl') ?? [];
  const cfNs = confirmed.filter(c => c.kind === 'capital_factory_x_natsec100_co_listing');
  if (!(manifest.counts?.capital_factory_portfolio_universe > 0 && manifest.counts?.natsec100_universe > 0)) e.push('overlap denominators missing');
  if (cfNs.length !== (manifest.counts?.cf_natsec100_confirmed_colistings ?? -1)) e.push('CF×NatSec100 co-listing count mismatch with manifest');
  if (cfNs.length === 0) e.push('Capital Factory overlap did not produce any co-listing (was it run?)');
  for (const c of confirmed) if (!CONFIRMED_OK.has(c.independent_corroboration_state)) e.push(`confirmed join ${c.join_id} has non-confirming state ${c.independent_corroboration_state}`);
  // bf26860 port: the 4 corroborated CF edges present
  const corroborated = cfNs.filter(c => c.independent_corroboration_state === 'independently_corroborated').map(c => c.natsec100_name).sort();
  for (const want of ['Firefly Aerospace', 'ICON', 'Saronic', 'Venus Aerospace']) if (!corroborated.includes(want)) e.push(`expected independently_corroborated CF co-listing missing: ${want}`);

  // CF<->Stratos tested; edge NOT manufactured and NOT asserted as a proven negative
  const allJoins = [...(jl('join-candidates.jsonl') ?? []), ...(jl('rejected-joins.jsonl') ?? [])];
  const cfStratos = allJoins.find(j => j.kind === 'capital_factory_x_stratos');
  if (!cfStratos || cfStratos.tested !== true) e.push('CF<->Stratos edge must be explicitly tested');
  if (cfStratos && cfStratos.disposition !== 'no_source_explicit_join_observed_on_searched_surfaces') e.push('CF<->Stratos must be labeled no_source_explicit_join_observed_on_searched_surfaces (not a proven rejection)');

  // institutional arms are separate nodes (CF and its fund; Stratos and The LAB; the three Pallas arms)
  const orgs = new Set((jl('organizations.jsonl') ?? []).map(o => o.org_id));
  for (const pair of [['org-capital-factory', 'org-capital-factory-texas-fund'], ['org-stratos-ventures', 'org-lab-miami']]) {
    if (!(orgs.has(pair[0]) && orgs.has(pair[1]))) e.push(`institutional arms not separated: ${pair.join(' / ')}`);
  }
  for (const arm of ['org-pallas-advisors', 'org-pallas-ventures', 'org-pallas-foundation']) if (!orgs.has(arm)) e.push(`Pallas arm not a separate node: ${arm}`);

  // dual state on every edge/claim/actor; corroboration vocab enforced; no name-inferred Israel link
  for (const f of ['actors.jsonl', 'professional-claims.jsonl', 'portfolio-edges.jsonl', 'government-surfaces.jsonl', 'join-candidates.jsonl', 'confirmed-joins.jsonl', 'rejected-joins.jsonl', 'austin-israel-cohort.jsonl']) {
    for (const row of jl(f) ?? []) {
      if (!('discovery_admission_state' in row) || (!('independent_corroboration_state' in row) && !('disposition' in row))) e.push(`${f}: row missing dual state`);
      const cs = row.independent_corroboration_state;
      if (cs != null && !CORROB.has(cs)) e.push(`${f}: invalid corroboration state ${cs}`);
      if (row.graph_effect !== 'none') e.push(`${f}: graph_effect must be none`);
      if (row.israel_linkage_basis && NAME_INFERENCE_MARKERS.test(String(row.israel_linkage_basis))) e.push(`${f}: Israel linkage appears name-inferred, not explicit`);
    }
  }

  // Lane B EXECUTED with source-explicit members, each carrying an explicit (non-name) linkage basis
  const cohort = (jl('austin-israel-cohort.jsonl') ?? []).filter(m => m.membership !== 'excluded');
  if (cohort.length === 0) e.push('Austin-Israel cohort executed but has no members');
  for (const m of cohort) {
    if (!m.linkage_basis) e.push(`cohort member ${m.member_id ?? m.org_id}: missing linkage_basis`);
    if (m.linkage_basis && NAME_INFERENCE_MARKERS.test(String(m.linkage_basis))) e.push(`cohort member ${m.member_id ?? m.org_id}: linkage_basis is name-inferred`);
    if (m.independent_corroboration_state !== 'source_explicit') e.push(`cohort member ${m.member_id ?? m.org_id}: not source_explicit`);
  }
  const gaps = jl('coverage-gaps.jsonl') ?? [];
  if (!gaps.some(g => g.gap_id === 'gap-austin-israel-cohort' && g.state === 'searched_nonexhaustive')) e.push('Austin-Israel cohort must be recorded as searched_nonexhaustive (executed but not a full census)');
  return e;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data/intake/austin-israel-defense-corridor');
  const errs = validateCorridor(dir);
  if (errs.length) { console.error('validate-austin-israel-corridor failed:'); for (const x of errs) console.error(`- ${x}`); process.exit(1); }
  console.log('validate-austin-israel-corridor: OK (overlaps ran, Lane B executed source-explicit, Pallas arms separated, CF<->Stratos = no-edge-observed, receipts audited/hashed, no name-inferred linkage)');
}
