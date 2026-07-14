#!/usr/bin/env node
// Validate the Austin–Israel defense-corridor intake against the mission's acceptance conditions.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CORROB = new Set(['source_explicit', 'independently_corroborated', 'self_claimed', 'name_match_only', 'rejected', 'not_searched', 'source_unavailable', 'receipt_unresolved', 'reported']);
const REQUIRED = ['README.md', 'manifest.json', 'actors.jsonl', 'organizations.jsonl', 'receipts.jsonl', 'professional-claims.jsonl', 'portfolio-edges.jsonl', 'government-surfaces.jsonl', 'join-candidates.jsonl', 'confirmed-joins.jsonl', 'rejected-joins.jsonl', 'coverage-gaps.jsonl', 'motifs.jsonl', 'analysis.md'];

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
  if (!(manifest.counts?.capital_factory_portfolio_universe > 0 && manifest.counts?.natsec100_universe > 0)) e.push('overlap denominators missing');
  if (confirmed.length !== (manifest.counts?.cf_natsec100_confirmed_colistings ?? -1)) e.push('confirmed co-listing count mismatch');
  if (confirmed.length === 0) e.push('Capital Factory overlap did not produce any co-listing (was it run?)');
  for (const c of confirmed) if (c.independent_corroboration_state !== 'source_explicit') e.push(`confirmed join ${c.join_id} not source_explicit`);

  // CF<->Stratos tested and rejected; no manufactured edge
  const rejected = jl('rejected-joins.jsonl') ?? [];
  const cfStratos = [...(jl('join-candidates.jsonl') ?? []), ...rejected].find(j => j.kind === 'capital_factory_x_stratos');
  if (!cfStratos || cfStratos.disposition !== 'rejected') e.push('Capital Factory<->Stratos edge must be tested and rejected');

  // institutional arms are separate nodes
  const orgs = new Set((jl('organizations.jsonl') ?? []).map(o => o.org_id));
  for (const pair of [['org-capital-factory', 'org-capital-factory-texas-fund'], ['org-stratos-ventures', 'org-lab-miami']]) {
    if (!(orgs.has(pair[0]) && orgs.has(pair[1]))) e.push(`institutional arms not separated: ${pair.join(' / ')}`);
  }

  // dual state on every edge/claim/actor; corroboration vocab enforced; no name-inferred Israel link
  for (const f of ['actors.jsonl', 'professional-claims.jsonl', 'portfolio-edges.jsonl', 'government-surfaces.jsonl', 'join-candidates.jsonl', 'confirmed-joins.jsonl', 'rejected-joins.jsonl']) {
    for (const row of jl(f) ?? []) {
      if (!('discovery_admission_state' in row) || !('independent_corroboration_state' in row) && !('disposition' in row)) e.push(`${f}: row missing dual state`);
      const cs = row.independent_corroboration_state;
      if (cs != null && !CORROB.has(cs)) e.push(`${f}: invalid corroboration state ${cs}`);
      if (row.graph_effect !== 'none') e.push(`${f}: graph_effect must be none`);
      if (/israeli|israel/i.test(JSON.stringify(row)) && /surname|name_match|sounds/i.test(JSON.stringify(row))) e.push(`${f}: possible name-inferred Israel linkage`);
    }
  }

  // Austin-Israel cohort explicitly not asserted from names
  const gaps = jl('coverage-gaps.jsonl') ?? [];
  if (!gaps.some(g => g.gap_id === 'gap-austin-israel-cohort' && g.state === 'not_searched')) e.push('Austin-Israel cohort must be explicitly not_searched (no inferred members)');
  return e;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data/intake/austin-israel-defense-corridor');
  const errs = validateCorridor(dir);
  if (errs.length) { console.error('validate-austin-israel-corridor failed:'); for (const x of errs) console.error(`- ${x}`); process.exit(1); }
  console.log('validate-austin-israel-corridor: OK (overlap ran, receipts audited, CF<->Stratos rejected, dual-state, no name-inferred linkage)');
}
