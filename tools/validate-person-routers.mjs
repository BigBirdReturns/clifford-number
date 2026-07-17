#!/usr/bin/env node
// Validate the person-centered defense-router intake against the canonical completion contract.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EVIDENCE = new Set(['observed', 'self_claimed', 'counterpart_reported', 'official_record', 'independently_corroborated', 'inferred', 'disputed', 'name_match_only', 'unavailable_after_search', 'not_searched', 'source_explicit', 'reported']);
const COUNTERPART = new Set(['counterpart_reported', 'no_counterpart_confirmation_observed', 'third_party_reported_not_counterpart_confirmed', 'not_searched']);
const REQUIRED = ['README.md', 'manifest.json', 'actors.jsonl', 'vehicles.jsonl', 'professional-roles.jsonl', 'portfolio-edges.jsonl', 'advisory-edges.jsonl', 'deal-sourcing-claims.jsonl', 'funding-rounds.jsonl', 'co-investor-edges.jsonl', 'government-programs.jsonl', 'government-awards.jsonl', 'validation-surfaces.jsonl', 'follow-on-capital.jsonl', 'exits.jsonl', 'router-source-universe.jsonl', 'router-candidates.jsonl', 'router-signatures.jsonl', 'roster-coverage.jsonl', 'portfolio-coverage.jsonl', 'evidence-trails.jsonl', 'trail-frontier.jsonl', 'rejected-joins.jsonl', 'coverage-gaps.jsonl', 'receipts.jsonl', 'analysis.md'];
const PRIOR_SEED = new Set(['person:jackson-moses', 'person:sally-donnelly', 'person:tony-demartino', 'person:joshua-baer', 'person:richard-spencer', 'person:rotem-yehuda-kakon', 'person:aviad-grinfeld', 'person:daniel-fouzailov', 'person:joe-lonsdale', 'person:trae-stephens', 'person:katherine-boyle', 'person:tal-shmueli']);

export function validatePersonRouters(dir, contractPathArg) {
  const e = [];
  const root = path.resolve(dir, '..', '..', '..');
  const jl = f => fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l)) : null;
  for (const f of REQUIRED) if (!fs.existsSync(path.join(dir, f))) e.push(`missing required artifact: ${f}`);
  const manifest = fs.existsSync(path.join(dir, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')) : {};
  if (manifest.graph_effect !== 'none') e.push('manifest graph_effect must be none');

  // CANONICAL COMPLETION CONTRACT must exist and be consumed
  const contractPath = contractPathArg ?? path.join(root, 'data/canonical/person-router-completion-contract.json');
  if (!fs.existsSync(contractPath)) { e.push('missing canonical data/canonical/person-router-completion-contract.json'); return e; }
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const TERMINAL = new Set(contract.terminal_states);
  const ALLSTATES = new Set(Object.keys(contract.coverage_states));
  const partial = s => contract.partial_markers.some(m => String(s ?? '').toLowerCase().includes(m));
  const receiptsAll = new Map((jl('receipts.jsonl') ?? []).map(r => [r.receipt_id, r]));
  // GENERIC checks reused across frontier + coverage rows:
  // (a) a terminal row may not contain partial language; (b) an _after_search state needs provenance.
  const hasSearchProvenance = row => row.search_ref || (row.query && Array.isArray(row.attempted_urls) && row.attempted_urls.length && row.timestamp && row.result);
  const checkTerminalAndSearch = (row, label, textFields) => {
    const st = row.state ?? row.coverage_state;
    if (st == null) return;
    if (!ALLSTATES.has(st)) { e.push(`${label}: invalid state ${st}`); return; }
    if (TERMINAL.has(st) && textFields.some(t => partial(t))) e.push(`${label}: terminal state ${st} but text contains partial/non-terminal language`);
    if (String(st).endsWith('_after_search') && !hasSearchProvenance(row)) e.push(`${label}: ${st} without search provenance (need search_ref OR query+attempted_urls+timestamp+result)`);
  };

  // Jackson canonical + vehicles separate
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
  }

  // ROSTER-DERIVED DENOMINATOR (investment-decision-maker universe)
  const universe = jl('router-source-universe.jsonl') ?? [];
  if (universe.length <= PRIOR_SEED.size) e.push(`denominator (${universe.length}) must derive from rosters, not the seed list`);
  if ([...new Set(universe.map(u => u.candidate_id))].filter(id => !PRIOR_SEED.has(id)).length < 20) e.push('denominator lacks substantial non-seed roster candidates');
  const sigs = jl('router-signatures.jsonl') ?? [];
  if (sigs.length !== universe.length) e.push('every candidate must have a signature row');
  const admitted = sigs.filter(s => s.admitted);

  // COVERAGE LEDGERS: every required source has a disposition; partial-marker cannot be surface_complete
  const rosterCov = jl('roster-coverage.jsonl') ?? [];
  const portCov = jl('portfolio-coverage.jsonl') ?? [];
  const rosterSrc = new Set(rosterCov.map(r => r.source));
  const portSrc = new Set(portCov.map(p => p.fund));
  for (const s of contract.required_roster_sources) if (![...rosterSrc].some(x => x.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(x.toLowerCase()))) e.push(`required roster source missing a disposition: ${s}`);
  for (const s of contract.required_portfolio_sources) if (![...portSrc].some(x => x.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(x.toLowerCase()))) e.push(`required portfolio source missing a disposition: ${s}`);
  for (const row of [...rosterCov, ...portCov]) {
    const lbl = `coverage ${row.source ?? row.fund}`;
    checkTerminalAndSearch(row, lbl, [row.selection_rule, row.note]);
    // (c) source-specific receipt: locator MUST equal this row's source_url
    if (!row.source_url) e.push(`${lbl}: missing source_url`);
    const rc = receiptsAll.get(row.receipt);
    if (!rc) e.push(`${lbl}: receipt ${row.receipt} not in receipts.jsonl`);
    else if (rc.locator_url !== row.source_url) e.push(`${lbl}: receipt locator ${rc.locator_url} != source_url ${row.source_url} (shared/mismatched receipt)`);
    // (d) exact gross count must be reproducible
    if (typeof row.gross_observed === 'number') {
      if (row.gross_basis !== 'exact') e.push(`${lbl}: numeric gross_observed requires gross_basis=exact`);
      else if (row.gross_observed !== row.enumerated) e.push(`${lbl}: exact gross_observed must equal enumerated (all names preserved)`);
    }
  }
  // portfolio rows carry required fields; a subset cannot be surface_complete unless source_total==enumerated_total
  for (const p of portCov) {
    for (const k of contract.portfolio_row_required_fields) if (!(k in p)) e.push(`portfolio-coverage ${p.fund}: missing ${k}`);
    if (p.coverage_state === 'surface_complete' && !(p.source_total != null && p.source_total === p.enumerated_total)) e.push(`portfolio ${p.fund}: surface_complete requires source_total==enumerated_total`);
  }

  // COUNTERPART provenance contract
  const cs = new Map((jl('sources/counterpart-searches.jsonl') ?? []).map(c => [c.search_id, c]));
  for (const c of cs.values()) {
    if ((c.disposition === 'no_counterpart_confirmation_observed' || c.disposition === 'third_party_reported_not_counterpart_confirmed')) {
      for (const k of contract.counterpart_provenance_required_fields) if (!(k in c) || (Array.isArray(c[k]) ? c[k].length === 0 : !c[k])) e.push(`counterpart-search ${c.search_id}: missing provenance field ${k}`);
    }
  }
  for (const f of ['advisory-edges.jsonl', 'deal-sourcing-claims.jsonl']) for (const row of jl(f) ?? []) {
    if (!('counterpart_status' in row)) { e.push(`${f}: ${row.actor_id} missing counterpart_status`); continue; }
    if (!COUNTERPART.has(row.counterpart_status)) e.push(`${f}: invalid counterpart_status ${row.counterpart_status}`);
    if ((row.counterpart_status === 'no_counterpart_confirmation_observed' || row.counterpart_status === 'third_party_reported_not_counterpart_confirmed') && !row.counterpart_search_ref) e.push(`${f}: ${row.counterparty ?? row.company} searched-result without counterpart_search_ref`);
    if (row.evidence_state === 'self_claimed' && row.counterpart_status === 'counterpart_reported') e.push(`${f}: self_claimed silently promoted`);
  }

  // GOVERNMENT AWARDS: usaspending receipt per row; NEVER the portfolio receipt; identity gate
  for (const g of jl('government-awards.jsonl') ?? []) {
    if (!('contract_ceiling_usd' in g) || !('obligated_usd' in g) || !('outlay_usd' in g)) e.push(`gov award ${g.org}: ceiling/obligated/outlay not separated`);
    for (const id of g.receipt_ids ?? []) if (id === 'r-fund-portfolio-census-2026' || /portfolio|roster/.test(id)) e.push(`gov award ${g.org} cites a non-award receipt ${id}`);
    for (const k of contract.award_receipt_rule.identity_fields_required) if (!(k in g)) e.push(`gov award ${g.org}: missing identity field ${k}`);
    if (!contract.award_receipt_rule.identity_states.includes(g.identity_state)) e.push(`gov award ${g.org}: invalid identity_state ${g.identity_state}`);
    // official USAspending rows must cite an r-usaspending- receipt
    if (g.evidence_state === 'official_record' && !(g.receipt_ids ?? []).some(id => id.startsWith('r-usaspending-'))) e.push(`gov award ${g.org}: official_record must cite an r-usaspending- receipt`);
  }
  // Cambium must be held (identity gate), never resolved
  const cambium = (jl('government-awards.jsonl') ?? []).find(g => g.org === 'Cambium');
  if (cambium && cambium.identity_state === 'resolved') e.push('Cambium marked identity resolved despite moderate-confidence match');

  // every admitted router has a >=3-node trail
  const trails = jl('evidence-trails.jsonl') ?? [];
  for (const r of admitted) { if (!trails.some(x => x.hops?.[0] === r.actor_id && x.hops.length >= 3)) e.push(`admitted router ${r.actor_id} lacks a multi-hop trail`); }

  // FRONTIER honesty: generic terminal-contradiction + _after_search-provenance (same rules as coverage)
  const frontierRows = jl('trail-frontier.jsonl') ?? [];
  for (const fr of frontierRows) checkTerminalAndSearch(fr, `frontier ${fr.frontier_id}`, [fr.note, fr.next]);
  // coverage-gaps: any _after_search row must also carry provenance
  for (const g of jl('coverage-gaps.jsonl') ?? []) if (String(g.state).endsWith('_after_search')) checkTerminalAndSearch(g, `coverage-gap ${g.gap_id}`, [g.detail]);
  // manifest must not headline closure unless EVERY frontier row + required source is terminal
  const allTerminal = frontierRows.every(f => TERMINAL.has(f.state)) && [...rosterCov, ...portCov].every(r => TERMINAL.has(r.coverage_state));
  if (!allTerminal && !/partial/i.test(manifest.coverage_summary ?? '')) e.push('manifest coverage_summary must state PARTIAL while any frontier/source is non-terminal');

  if (typeof manifest.counts?.jackson_x_natsec100 !== 'number') e.push('Jackson×NatSec100 overlap count missing');
  return e;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data/intake/person-centered-defense-routers');
  const errs = validatePersonRouters(dir);
  if (errs.length) { console.error('validate-person-routers failed:'); for (const x of errs) console.error(`- ${x}`); process.exit(1); }
  console.log('validate-person-routers: OK (completion contract enforced; coverage states honest; partial != complete; awards cite USAspending receipts + identity-gated; counterpart provenance present)');
}
