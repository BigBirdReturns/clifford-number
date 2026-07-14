#!/usr/bin/env node
// Acceptance-condition validator for the Capital Factory x NatSec100 overlap chunk.
// Exit 0 = all conditions hold. Run: node validate-chunk2.mjs

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = (p) => fs.readFileSync(path.join(HERE, p), 'utf8');
const J = (p) => R(p).split('\n').filter(Boolean).map((l, i) => { try { return JSON.parse(l); } catch (e) { throw new Error(`${p}:${i + 1} bad JSON: ${e.message}`); } });

let fail = 0;
const ok = (c, m) => { if (!c) { console.error('  FAIL:', m); fail++; } };

// 1. Universe integrity + denominators
const universe = R('cf_portfolio_universe.txt').split('\n').map((s) => s.trim()).filter(Boolean);
const manifest = JSON.parse(R('source_manifest.json'));
const uHash = crypto.createHash('sha256').update(R('cf_portfolio_universe.txt')).digest('hex');
ok(uHash === manifest.cf_portfolio_source.universe_file_sha256, `universe sha256 mismatch (${uHash})`);
ok(universe.length === manifest.cf_portfolio_source.slug_count, `universe count != manifest (${universe.length})`);
ok(new Set(universe).size === universe.length, 'universe has duplicate slugs');

const companies = J('../chunk1/companies.jsonl');
ok(companies.length === 196, `expected 196 NatSec100 companies, got ${companies.length}`);

// 2. Overlap edges: dual-state, denominators, receipt resolution, guardrails
const receipts = J('receipts.jsonl');
const receiptIds = new Set(receipts.map((r) => r.receipt_id));
const edges = J('overlap_cf_natsec100.jsonl');
const ADMISSION = new Set(['cf_public_portfolio_index']);
const CORROB = new Set(['corroborated', 'cf_listing_only']);
const uSet = new Set(universe);
const cIds = new Set(companies.map((c) => c.company_id));

for (const e of edges) {
  const w = `edge ${e.edge_id}`;
  ok(ADMISSION.has(e.discovery_admission_state), `${w}: bad discovery_admission_state`);
  ok(CORROB.has(e.independent_corroboration_state), `${w}: bad independent_corroboration_state`);
  ok(cIds.has(e.natsec100_company_id), `${w}: company_id not in chunk1`);
  ok(Array.isArray(e.cf_portfolio_slug) && e.cf_portfolio_slug.every((s) => uSet.has(s)), `${w}: slug not in pinned universe`);
  ok(Array.isArray(e.receipt_ids) && e.receipt_ids.length > 0 && e.receipt_ids.every((r) => receiptIds.has(r)), `${w}: unresolved receipt_ids`);
  ok(Array.isArray(e.competing_explanations) && e.competing_explanations.length > 0, `${w}: no competing_explanations`);
  ok(Array.isArray(e.forbidden_inferences) && e.forbidden_inferences.length > 0, `${w}: no forbidden_inferences`);
  ok(e.relation === 'co_listing', `${w}: relation must be co_listing (not equity/coordination)`);
}
// distinct companies == edges (all-pairs collapsed)
ok(new Set(edges.map((e) => e.natsec100_company_id)).size === edges.length, 'overlap has duplicate company edges');
// corroborated edges must carry sources
for (const e of edges.filter((x) => x.independent_corroboration_state === 'corroborated')) {
  ok(Array.isArray(e.corroboration_sources) && e.corroboration_sources.length > 0, `edge ${e.edge_id}: corroborated but no sources`);
}

// 3. Seed receipt audit: all 18 present, valid resolutions, named-individual guardrail
const audit = J('receipt_audit_seed.jsonl');
const RES = new Set(['resolved', 'cross_referenced', 'entity_corroborated_receipt_uncaptured', 'url_identified_uncaptured', 'source_unavailable', 'receipt_unresolved']);
ok(audit.length === 18, `expected 18 seed receipt audit rows, got ${audit.length}`);
ok(new Set(audit.map((a) => a.seed_receipt_id)).size === audit.length, 'audit has duplicate seed_receipt_id');
for (const a of audit) {
  ok(RES.has(a.resolution), `audit ${a.seed_receipt_id}: bad resolution '${a.resolution}'`);
  if (a.resolution === 'resolved') ok(receiptIds.has(a.resolves_to), `audit ${a.seed_receipt_id}: resolves_to not a real receipt`);
  // NO named-individual receipt may be marked resolved/corroborated without a captured source
  if (a.fabrication_risk === 'named_individual') {
    ok(a.resolution === 'receipt_unresolved', `audit ${a.seed_receipt_id}: named-individual receipt must stay unresolved, got '${a.resolution}'`);
    ok(a.resolves_to === null, `audit ${a.seed_receipt_id}: named-individual receipt must not resolve to anything`);
  }
}

// 4. Cross-check overlap summary matches deterministic expectation
ok(edges.length === 12, `expected 12 overlap edges, got ${edges.length}`);
ok(edges.filter((e) => e.match_tier === 'exact').length === 11, 'expected 11 exact matches');
ok(edges.filter((e) => e.match_tier === 'normalized_core').length === 1, 'expected 1 normalized_core match');

if (fail) { console.error(`\nvalidate-chunk2: ${fail} FAILURE(S)`); process.exit(1); }
console.log('validate-chunk2: OK — 837x196->12 overlap, dual-state on every edge, 18/18 seed receipts audited, named-individual guardrail holds.');
