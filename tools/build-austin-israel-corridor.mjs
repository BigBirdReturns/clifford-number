#!/usr/bin/env node
// Build the portable Austin–Israel defense-corridor intake. Every edge carries a DUAL state:
//   discovery_admission_state    — is the observable claim preserved? (a source represents it)
//   independent_corroboration_state ∈ source_explicit | independently_corroborated | self_claimed |
//                                     name_match_only | rejected | not_searched | source_unavailable
// Israel linkage is only ever from explicit self-identification / official company history — never
// from a name. Institutional arms are separate nodes. All-pairs inflation is collapsed to distinct
// institutional overlaps. graph_effect: none throughout.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'data/intake/austin-israel-defense-corridor');
const N = path.join(root, 'data/intake/natsec100-pathways');
fs.mkdirSync(dir, { recursive: true });
const readJsonl = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l)) : [];
const writeJsonl = (f, rows) => fs.writeFileSync(path.join(dir, f), rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const core = s => norm(s).split(' ').filter(t => t && !['inc', 'llc', 'corp', 'technologies', 'technology', 'co', 'the', 'company', 'systems', 'labs', 'group'].includes(t)).join(' ');
const G = 'none';

// ---- source-addressed receipts (RESOLVED this pass) ----
const resolvedReceipts = [
  { receipt_id: 'r-capital-factory-portfolio-2026', evidence_class: 'primary_public', locator_url: 'https://www.capitalfactory.com/portfolio', retrieved_at: '2026-07-14', content_sha256: JSON.parse(fs.readFileSync(path.join(dir, 'capital-factory-portfolio-universe.json'), 'utf8')).source_sha256, note: 'Capital Factory public portfolio page (837 listed company names).' },
  { receipt_id: 'r-stratos-official-site-2026', evidence_class: 'primary_public', locator_url: 'https://www.stratos-vc.com/', retrieved_at: '2026-07-14', content_sha256: null, note: 'Stratos Ventures official site — primary source for what Stratos publicly represents.' },
  { receipt_id: 'r-stratos-jpost-2026', evidence_class: 'reported', locator_url: 'https://www.jpost.com/defense-and-tech/article-900382', retrieved_at: '2026-07-14', content_sha256: null, note: 'Press: Stratos debuts as US-Israeli defense-tech fund with $50m.' },
  { receipt_id: 'r-stratos-refreshmiami-2026', evidence_class: 'reported', locator_url: 'https://refreshmiami.com/news/stratos-ventures-launches-with-50m-and-a-plan-to-help-make-miami-a-defense-tech-gateway/', retrieved_at: '2026-07-14', content_sha256: null, note: 'Press: Stratos + The LAB Miami; Miami defense-tech gateway.' },
];
const resolvedIds = new Set(resolvedReceipts.map(r => r.receipt_id));

// ---- receipt AUDIT: every r-* reference in the natsec100 seed either resolves or is demoted ----
const referenced = new Set();
for (const f of ['seed/claims.jsonl', 'seed/actors.jsonl', 'seed/conversion_events.jsonl', 'chunk1/company_years.jsonl', 'chunk1/conversion_events.jsonl']) {
  for (const row of readJsonl(path.join(N, f))) {
    for (const m of JSON.stringify(row).matchAll(/"receipt_ids?"\s*:\s*(\[[^\]]*\]|"[^"]*")/g)) {
      for (const idm of m[1].matchAll(/"([^"]+)"/g)) for (const id of idm[1].split(';')) if (id.startsWith('r-')) referenced.add(id);
    }
  }
}
const receipts = [...resolvedReceipts];
const demoted = [];
for (const id of [...referenced].sort()) {
  if (resolvedIds.has(id)) continue;
  demoted.push(id);
  receipts.push({ receipt_id: id, evidence_class: null, locator_url: null, content_sha256: null, status: 'receipt_unresolved', note: 'Referenced by natsec100 seed claims; no source-addressable receipt record exists. A string containing a receipt ID is not a receipt.' });
}
writeJsonl('receipts.jsonl', receipts);

// ---- organizations (institutional arms are SEPARATE functional nodes) ----
const organizations = [
  { org_id: 'org-capital-factory', label: 'Capital Factory', node_function: 'geographic_convening_and_commercialization_router', hq: 'Austin, TX', receipt_ids: ['r-capital-factory-portfolio-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', graph_effect: G },
  { org_id: 'org-capital-factory-texas-fund', label: 'Capital Factory Texas Fund', node_function: 'fund_arm_of_capital_factory', receipt_ids: ['r-capital-factory-portfolio-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', note: 'Separate fund node; not merged into the accelerator.', graph_effect: G },
  { org_id: 'org-natsec100', label: 'NatSec100', node_function: 'validation_and_ranking_surface', publisher: 'Silicon Valley Defense Group (SVDG)', discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', graph_effect: G },
  { org_id: 'org-stratos-ventures', label: 'Stratos Ventures', node_function: 'cross_border_capital_and_market_access_router', hq: 'Migdal Paz, Tel Aviv, Israel', us_office: '2750 NW 3rd Ave, Suite 24, Miami, FL 33127', receipt_ids: ['r-stratos-official-site-2026', 'r-stratos-jpost-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', graph_effect: G },
  { org_id: 'org-lab-miami', label: 'The LAB Miami', node_function: 'stratos_strategic_partner_convening', receipt_ids: ['r-stratos-refreshmiami-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'reported', graph_effect: G },
  { org_id: 'org-pallas', label: 'Pallas', node_function: 'washington_advisory_access_router', discovery_admission_state: 'not_admitted', independent_corroboration_state: 'not_searched', note: 'Named in mission scope; no source acquired this pass.', graph_effect: G },
  ...['DIU', 'AFWERX', 'DARPA', 'Army Futures Command', 'NATO DIANA', 'Israeli MOD'].map(x => ({ org_id: `org-${norm(x).replace(/ /g, '-')}`, label: x, node_function: 'public_private_acquisition_or_defense_surface', discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', graph_effect: G })),
];
writeJsonl('organizations.jsonl', organizations);

// ---- actors (Stratos team from official site; Baer from seed, receipt UNRESOLVED) ----
const stratosTeam = [
  ['Rotem (Yehuda) Kakon', 'Co-Founder & General Partner'], ['Aviad Grinfeld', 'Co-Founder & General Partner'], ['Daniel Fouzailov', 'General Partner'],
  ['LTG (Ret.) Michael Barbero', 'Partner; President, SAAB USA'], ['Steve Braverman', 'Partner; Founder & Co-Chairman of Pathstone'], ['David Braverman', 'Partner; co-founder, Saichel Capital Management family office'], ['Theo Williams', 'Partner; former Head of Portfolio Development, Salesforce Ventures'], ['Israel Biran', 'Partner; Israeli Air Force veteran, GP at U.S. venture funds'], ['Doron Landau', 'Partner; space-tech entrepreneur, GP at U.S. venture funds'],
];
const actors = [
  { actor_id: 'act-joshua-baer', label: 'Joshua Baer', affiliation: 'Capital Factory (founder, per natsec100 seed)', receipt_ids: ['r-baer-profile-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'receipt_unresolved', note: 'Seed asserts founder role via r-baer-profile-2026, which has no source-addressable receipt. Private LinkedIn captures are NOT in the portable projection and were not inspected.', graph_effect: G },
  ...stratosTeam.map(([label, title]) => ({ actor_id: `act-${norm(label).replace(/ /g, '-')}`, label, org_id: 'org-stratos-ventures', stated_title: title, receipt_ids: ['r-stratos-official-site-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', note: 'Publicly listed by Stratos on its own site (self-representation).', graph_effect: G })),
];
writeJsonl('actors.jsonl', actors);

// ---- professional claims ----
writeJsonl('professional-claims.jsonl', actors.map(a => ({ claim_id: `pc-${a.actor_id}`, actor_id: a.actor_id, predicate: 'publicly_represented_role_at', role_title: a.stated_title ?? a.affiliation ?? null, org_id: a.org_id ?? null, receipt_ids: a.receipt_ids, discovery_admission_state: a.discovery_admission_state, independent_corroboration_state: a.independent_corroboration_state, graph_effect: G })));

// ---- Capital Factory portfolio edges (CF publicly lists these companies) ----
const cf = JSON.parse(fs.readFileSync(path.join(dir, 'capital-factory-portfolio-universe.json'), 'utf8'));
writeJsonl('portfolio-edges.jsonl', [
  ...cf.company_names.map(n => ({ from_org_id: 'org-capital-factory', predicate: 'publicly_lists_portfolio_company', company_name_as_listed: n, receipt_ids: ['r-capital-factory-portfolio-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', note: 'Listed on CF public portfolio page; list membership is not identity resolution.', graph_effect: G })),
  { from_org_id: 'org-stratos-ventures', predicate: 'portfolio_companies', discovery_admission_state: 'not_admitted', independent_corroboration_state: 'source_unavailable', note: 'Stratos portfolio shown only as logos on its site; NOT OCR-promoted to named entities. Visual review of logos required.', graph_effect: G },
]);

// ---- government surfaces (Stratos self-claims; CF via unresolved seed refs) ----
writeJsonl('government-surfaces.jsonl', [
  ...['Israeli MOD', 'U.S. DoD', 'NATO DIANA'].map(s => ({ org_id: 'org-stratos-ventures', predicate: 'claims_active_partnership_with', surface: s, receipt_ids: ['r-stratos-official-site-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'self_claimed', note: 'Stated on Stratos own site; no counterpart (MOD/DoD/DIANA) confirmation searched or found.', graph_effect: G })),
  { org_id: 'org-stratos-ventures', predicate: 'claims_partner_access_to', surface: 'U.S. CENTCOM / Port of Miami (via The LAB Miami)', receipt_ids: ['r-stratos-refreshmiami-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'self_claimed', graph_effect: G },
  { org_id: 'org-capital-factory', predicate: 'claimed_surface_via_seed', surface: 'DIU / AFWERX', receipt_ids: ['r-diu-capitalfactory-2025', 'r-capitalfactory-government-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'receipt_unresolved', graph_effect: G },
]);

// ---- THE OVERLAP, ACTUALLY RUN: CF portfolio x NatSec100 ----
const ns = readJsonl(path.join(N, 'chunk1/companies.jsonl'));
const nsByCore = new Map();
for (const c of ns) for (const nm of [c.canonical_name, ...(c.aliases ?? [])]) { const k = core(nm); if (k) nsByCore.set(k, c); }
const cfByCore = new Map();
for (const n of cf.company_names) { const k = core(n); if (k && !cfByCore.has(k)) cfByCore.set(k, n); }
const confirmed = [], rejected = [], candidates = [];
for (const [k, cfName] of cfByCore) {
  if (nsByCore.has(k)) {
    const rec = { join_id: `join-cf-ns-${k.replace(/ /g, '-')}`, kind: 'capital_factory_x_natsec100_co_listing', cf_name: cfName, natsec100_name: nsByCore.get(k).canonical_name, natsec100_years: nsByCore.get(k).natsec100_years_documented, receipt_ids: ['r-capital-factory-portfolio-2026', ...(nsByCore.get(k).receipt_ids ?? [])], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', corroboration_basis: 'named on two independent curated public lists (CF portfolio + NatSec100)', note: 'Co-listing, NOT legal-identity resolution or an ownership/relationship finding.', graph_effect: G };
    confirmed.push(rec); candidates.push({ ...rec, state: 'confirmed_source_explicit' });
  }
}
// rejected fuzzy: CF name whose first core token equals a NatSec100 first token but not a full-core match
const nsFirst = new Map(); for (const [k, c] of nsByCore) { const t = k.split(' ')[0]; if (t && !nsFirst.has(t)) nsFirst.set(t, c); }
for (const [k, cfName] of cfByCore) {
  if (nsByCore.has(k)) continue;
  const t = k.split(' ')[0];
  if (t && nsFirst.has(t)) {
    const rec = { join_id: `reject-cf-ns-${k.replace(/ /g, '-')}`, kind: 'capital_factory_x_natsec100_name_only', cf_name: cfName, natsec100_near: nsFirst.get(t).canonical_name, reason: 'shared leading token without full normalized-core match', discovery_admission_state: 'admitted', independent_corroboration_state: 'name_match_only', disposition: 'rejected', graph_effect: G };
    rejected.push(rec); candidates.push({ ...rec, state: 'rejected_name_match_only' });
  }
}
// tested cross-router joins
const crossJoins = [
  { join_id: 'join-cf-stratos', kind: 'capital_factory_x_stratos', tested: true, discovery_admission_state: 'admitted', independent_corroboration_state: 'rejected', disposition: 'rejected', reason: 'No source-explicit edge. Stratos (Tel Aviv HQ + Miami office, The LAB Miami partner) makes no mention of Austin or Capital Factory on its site or in press; different geographies and networks.', receipt_ids: ['r-stratos-official-site-2026', 'r-stratos-refreshmiami-2026', 'r-capital-factory-portfolio-2026'], graph_effect: G },
  { join_id: 'join-stratos-natsec100', kind: 'stratos_x_natsec100', tested: false, discovery_admission_state: 'not_admitted', independent_corroboration_state: 'source_unavailable', disposition: 'not_joinable', reason: 'Stratos portfolio is logos-only (not named); cannot test membership against NatSec100 without visual review.', graph_effect: G },
  { join_id: 'join-stratos-pallas', kind: 'stratos_x_pallas', discovery_admission_state: 'not_admitted', independent_corroboration_state: 'not_searched', disposition: 'not_searched', graph_effect: G },
  { join_id: 'join-cf-pallas', kind: 'capital_factory_x_pallas', discovery_admission_state: 'not_admitted', independent_corroboration_state: 'not_searched', disposition: 'not_searched', graph_effect: G },
];
candidates.push(...crossJoins);
writeJsonl('join-candidates.jsonl', candidates);
writeJsonl('confirmed-joins.jsonl', confirmed);
writeJsonl('rejected-joins.jsonl', [...rejected, ...crossJoins.filter(j => j.disposition === 'rejected')]);

// ---- coverage gaps (searched/unresolved/unavailable/not-searched all distinct) ----
writeJsonl('coverage-gaps.jsonl', [
  { gap_id: 'gap-stratos-portfolio', state: 'source_unavailable', detail: 'Stratos portfolio companies visible only as logos on stratos-vc.com; not OCR-promoted. Visual image review required.', graph_effect: G },
  { gap_id: 'gap-stratos-gov-corroboration', state: 'not_searched', detail: 'Stratos MOD/DoD/NATO-DIANA partnerships are self-claimed; independent counterpart confirmation not searched.', graph_effect: G },
  { gap_id: 'gap-austin-israel-cohort', state: 'not_searched', detail: 'Lane B (documented Austin-headquartered Israeli-founded/Israel-linked defense companies) was NOT run as a full search this pass; no members are asserted. Israel linkage must come from explicit self-identification/official history, never a name. The only Israel-explicit node found (Stratos) is Miami/Tel Aviv, not Austin.', graph_effect: G },
  { gap_id: 'gap-baer-linkedin', state: 'source_unavailable', detail: 'Joshua Baer private LinkedIn captures are not in the portable 31-profile projection and were not inspected.', graph_effect: G },
  { gap_id: 'gap-pallas', state: 'not_searched', detail: 'Pallas advisory router named in scope; no source acquired this pass.', graph_effect: G },
  { gap_id: 'gap-unresolved-receipts', state: 'receipt_unresolved', detail: `${demoted.length} natsec100 seed receipt references have no source-addressable record and were demoted.`, unresolved_receipt_ids: demoted, graph_effect: G },
]);

// ---- motifs (by DISTINCT institutions/people, never Cartesian pairs) ----
writeJsonl('motifs.jsonl', [
  { motif_id: 'capital_to_accelerator_to_validation', pattern: 'Capital Factory portfolio company also ranked on the NatSec100 validation surface', distinct_companies: confirmed.length, companies: confirmed.map(c => c.natsec100_name), independent_corroboration_state: 'source_explicit', graph_effect: G },
  { motif_id: 'israeli_fund_to_us_market_access', pattern: 'Israeli-HQ defense fund claiming US government/market access', distinct_institutions: 1, institutions: ['Stratos Ventures (via The LAB Miami → CENTCOM/DoD, self-claimed)'], independent_corroboration_state: 'self_claimed', graph_effect: G },
  { motif_id: 'public_service_to_adviser_fund', pattern: 'Retired senior US military / industry leader as fund partner', distinct_people: 1, people: ['LTG (Ret.) Michael Barbero (President, SAAB USA) — Stratos partner'], independent_corroboration_state: 'source_explicit', graph_effect: G },
]);

// ---- manifest ----
const manifest = {
  schema_version: 'austin-israel-defense-corridor@1',
  built_at: '2026-07-14',
  purpose: 'Portable, source-addressed intake of three corridors (Capital Factory / Austin routing; Austin–Israel; Stratos Ventures), joined to NatSec100 only where source-explicit. Discovery admission is separate from independent corroboration.',
  counts: {
    receipts_total: receipts.length, receipts_resolved: resolvedReceipts.length, receipts_unresolved: demoted.length,
    organizations: organizations.length, actors: actors.length,
    capital_factory_portfolio_universe: cf.distinct_company_names,
    natsec100_universe: ns.length,
    cf_natsec100_confirmed_colistings: confirmed.length,
    cf_natsec100_rejected_name_only: rejected.length,
    cross_router_joins_rejected: crossJoins.filter(j => j.disposition === 'rejected').length,
    cross_router_joins_not_searched_or_unavailable: crossJoins.filter(j => j.disposition !== 'rejected').length,
  },
  key_findings: [
    `Capital Factory overlap ACTUALLY RUN: ${cf.distinct_company_names} CF portfolio companies x ${ns.length} NatSec100 -> ${confirmed.length} exact-core source-explicit co-listings.`,
    'Capital Factory <-> Stratos: REJECTED, no source-explicit edge (Stratos is Tel Aviv + Miami; never mentions Austin/Capital Factory).',
    `Receipt audit: ${resolvedReceipts.length} resolved, ${demoted.length} demoted to receipt_unresolved.`,
    'Austin-Israel cohort (Lane B) NOT searched this pass; no members asserted; no Israel linkage inferred from any name.',
  ],
  dual_state_model: { discovery_admission_states: ['admitted', 'not_admitted'], independent_corroboration_states: ['source_explicit', 'independently_corroborated', 'self_claimed', 'name_match_only', 'rejected', 'not_searched', 'source_unavailable'] },
  evidence_limit: 'Self-authored profiles/company pages establish only that an actor/org publicly represented a role or relationship — never legal identity, transaction, ownership, coordination, influence, or wrongdoing.',
  graph_effect: G,
};
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`corridor: CF ${cf.distinct_company_names} x NatSec100 ${ns.length} -> ${confirmed.length} confirmed co-listings, ${rejected.length} rejected name-only; receipts ${resolvedReceipts.length} resolved / ${demoted.length} unresolved; CF<->Stratos rejected`);
