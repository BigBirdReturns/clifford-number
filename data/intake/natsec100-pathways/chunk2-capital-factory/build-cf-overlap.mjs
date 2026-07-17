#!/usr/bin/env node
// Deterministic Capital Factory x NatSec100 overlap.
//
// Inputs (all local, source-addressed):
//   - cf_portfolio_universe.txt : 837 slugs extracted from Capital Factory's public
//     /portfolio index page, sha256-pinned in source_manifest.json (receipt RCF01).
//   - ../chunk1/companies.jsonl : 196 alias-reconciled NatSec100 companies.
//   - corroboration_overlay.json : hand-authored, per-edge independent-corroboration
//     annotations gathered by live search (kept OUT of the deterministic match).
//
// Output: overlap_cf_natsec100.jsonl (one edge per co-listing) + a summary to stdout.
//
// Discipline: this computes CO-LISTING only. A co-listing is a graph fact
// ("company C's slug appears on CF's public portfolio index"); it is NOT a claim
// of CF equity, and never a coordination claim. Every edge carries the dual state
// (discovery_admission vs independent_corroboration) and explicit forbidden_inferences.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(HERE, p), 'utf8');

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
const SUFFIX = /-(inc|llc|corp|corporation|co|ltd|company|technologies|technology|systems|labs)$/;
function core(sl) {
  let prev = null;
  while (prev !== sl) { prev = sl; sl = sl.replace(SUFFIX, ''); }
  // also strip a trailing hex-uuid fragment CF sometimes appends
  return sl.replace(/-[0-9a-f]{8}(-[0-9a-f]{4}){0,4}$/, '');
}

const cfSlugs = read('cf_portfolio_universe.txt').split('\n').map((s) => s.trim()).filter(Boolean);
const cfSet = new Set(cfSlugs);
const cfCore = new Map();
for (const c of cfSlugs) {
  const k = core(c);
  if (!cfCore.has(k)) cfCore.set(k, []);
  cfCore.get(k).push(c);
}

const overlay = JSON.parse(read('corroboration_overlay.json')).edges;

const companies = read('../chunk1/companies.jsonl').split('\n').filter(Boolean).map(JSON.parse);

const edges = [];
for (const o of companies) {
  const forms = [o.canonical_name, ...(o.aliases || [])];
  const slugs = [...new Set(forms.map(slugify))];
  const cores = [...new Set(slugs.map(core))];

  let matched = null, tier = null;
  const exactHits = slugs.filter((s) => cfSet.has(s));
  if (exactHits.length) {
    matched = [...new Set(exactHits)].sort();
    tier = 'exact';
  } else {
    const coreHits = [];
    for (const cr of cores) if (cfCore.has(cr)) coreHits.push(...cfCore.get(cr));
    if (coreHits.length) { matched = [...new Set(coreHits)].sort(); tier = 'normalized_core'; }
  }
  if (!matched) continue;

  const ov = overlay[o.company_id] || {};
  const corrob = ov.independent_corroboration_state || 'cf_listing_only';
  const receipt_ids = ['RCF01'];
  if (corrob === 'corroborated') {
    if (o.company_id === 'icon') receipt_ids.push('RCF02');
    if (o.company_id === 'saronic' || o.company_id === 'firefly_aerospace' || o.company_id === 'venus_aerospace') receipt_ids.push('RCF03');
  }

  edges.push({
    edge_id: `cfxns-${o.company_id}`,
    relation: 'co_listing',
    natsec100_company_id: o.company_id,
    natsec100_canonical_name: o.canonical_name,
    natsec100_years_documented: o.natsec100_years_documented || [],
    cf_portfolio_slug: matched,
    match_tier: tier,
    discovery_admission_state: 'cf_public_portfolio_index',
    cf_dedicated_page: ov.cf_dedicated_page || null,
    independent_corroboration_state: corrob,
    corroboration_sources: ov.sources || [],
    identity_note: ov.identity_confirmed || null,
    receipt_ids,
    competing_explanations: [
      'Slug may appear on CF\'s public portfolio index for ecosystem/accelerator/event reasons rather than a priced equity investment.',
      'NatSec100 membership and CF listing are independent surfaces; co-listing is their intersection, not a shared cause.'
    ],
    forbidden_inferences: [
      'Presence on CF portfolio index != CF holds equity in the company.',
      'Co-listing != any coordination, routing, or influence between CF and the company or between the two companies.',
      tier === 'normalized_core'
        ? 'This edge matched only after suffix normalization; treat identity as candidate until the exact CF entity is confirmed.'
        : 'Exact-slug match; identity still bounded by whatever the CF index page actually denotes.'
    ]
  });
}

edges.sort((a, b) => a.natsec100_company_id.localeCompare(b.natsec100_company_id));

const outPath = path.join(HERE, 'overlap_cf_natsec100.jsonl');
fs.writeFileSync(outPath, edges.map((e) => JSON.stringify(e)).join('\n') + '\n');

const exact = edges.filter((e) => e.match_tier === 'exact');
const norm = edges.filter((e) => e.match_tier === 'normalized_core');
const corr = edges.filter((e) => e.independent_corroboration_state === 'corroborated');
const summary = {
  denominators: { cf_portfolio_universe: cfSlugs.length, natsec100_companies: companies.length },
  overlap_total: edges.length,
  by_match_tier: { exact: exact.length, normalized_core: norm.length },
  by_corroboration: { corroborated: corr.length, cf_listing_only: edges.length - corr.length },
  companies: edges.map((e) => e.natsec100_canonical_name)
};
console.log(JSON.stringify(summary, null, 2));
