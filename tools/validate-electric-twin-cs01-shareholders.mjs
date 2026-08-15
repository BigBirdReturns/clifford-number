#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

function loadJsonl(path) {
  return fs.readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}
function one(rows, key, value) {
  const matches = rows.filter(row => row[key] === value);
  assert.equal(matches.length, 1, `expected one ${key}=${value}, found ${matches.length}`);
  return matches[0];
}
function sameSet(left = [], right = []) {
  return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());
}

const receipts = loadJsonl('data/ledger/receipts.jsonl');
const claims = loadJsonl('data/ledger/claims.jsonl');
const surfaces = loadJsonl('data/ledger/surfaces.jsonl');
const participation = loadJsonl('data/ledger/participation.jsonl');
const hop = JSON.parse(fs.readFileSync('build/hop-graph.json', 'utf8'));
const surfaceGraph = JSON.parse(fs.readFileSync('build/surface-graph.json', 'utf8'));

const receiptId = 'companies-house-electric-twin-cs01-shareholders-2025-09-27';
const surfaceId = 'electric-twin-registered-shareholdings-2025-09-27';
const cs01 = one(receipts, 'receipt_id', receiptId);
assert.equal(cs01.evidence_class, 'official');
assert.equal(cs01.company_number, '15173006');
assert.equal(cs01.instrument_type, 'CS01_confirmation_statement_with_updates');
assert.equal(cs01.confirmation_date, '2025-09-27');
assert.equal(cs01.filed_at, '2025-09-29');
assert.equal(cs01.source_document_id, 'MzQ4MzAzNTU3OGFkaXF6a2N4');
assert.equal(cs01.source_filing_code, 'XEC3JB68');
assert.equal(cs01.source_pdf_sha256, '2017a4fb95f4aca753b2780168d789e11ad289aa86a1dcb9f051b48ff8d3408f');
assert.equal(cs01.source_pdf_bytes, 148973);
assert.equal(cs01.source_pdf_pages, 8);
assert.equal(cs01.acquisition.workflow_run_id, 31892408988);
assert.equal(cs01.acquisition.workflow_job_id, 95030549856);
assert.equal(cs01.acquisition.artifact_id, 9248896790);
assert.equal(cs01.acquisition.artifact_digest, 'sha256:c4d2cde4f73deefe700b17d29a9031bdc1b3a11791d282327a018144aa771daa');
assert.deepEqual(cs01.acquisition.page_renders_visually_inspected, [5, 6]);

assert.deepEqual(cs01.statement_of_capital.share_classes, [
  { share_class: 'ORDINARY', shares: 2108068, aggregate_nominal_value_gbp: '2.108068' },
  { share_class: 'SEED 1 PREFERRED', shares: 741051, aggregate_nominal_value_gbp: '0.741051' },
  { share_class: 'SEED 2 PREFERRED', shares: 739180, aggregate_nominal_value_gbp: '0.73918' },
]);
assert.equal(cs01.statement_of_capital.total_shares, 3588299);
assert.equal(cs01.statement_of_capital.total_aggregate_nominal_value_gbp, '3.588299');
assert.equal(cs01.statement_of_capital.total_aggregate_amount_unpaid_gbp, '0');

const expectedHoldings = [
  [1, 'VARUN CHANDRA', 'ORDINARY', 5614],
  [2, 'ALEXANDER VAUGHAN COOPER', 'ORDINARY', 1000000],
  [3, 'ROBERT CRANBORNE', 'ORDINARY', 46315],
  [4, 'SHAN DRUMMOND', 'ORDINARY', 23859],
  [5, 'THOMAS RAYMOND LE FEUVRE POCOCK', 'ORDINARY', 2807],
  [6, 'ERIC RALPH SALAMA', 'ORDINARY', 21052],
  [7, 'FREDERICK SAYERS', 'ORDINARY', 2807],
  [8, 'ANKUSH KAMAL KANT SHAH', 'ORDINARY', 5614],
  [9, 'BEN WARNER', 'ORDINARY', 1000000],
  [10, 'GC&H INVESTMENT MANAGEMENT LLC', 'SEED 1 PREFERRED', 28070],
  [11, 'LOCALGLOBE XII, L.P.', 'SEED 1 PREFERRED', 631578],
  [12, 'MERCURI GP LLP', 'SEED 1 PREFERRED', 70175],
  [13, 'MILLTOWN VENTURES LIMITED', 'SEED 1 PREFERRED', 2807],
  [14, 'SLL INVESTCONSULT GMBH', 'SEED 1 PREFERRED', 8421],
  [15, 'ATOMICO VENTURE VI (PARALLEL) S.C.A., SICAV-RAIF', 'SEED 2 PREFERRED', 20972],
  [16, 'ATOMICO VENTURE VI SCSP', 'SEED 2 PREFERRED', 583322],
  [17, 'LOCALGLOBE XII, L.P.', 'SEED 2 PREFERRED', 48559],
  [18, 'MERCURI GP LLP', 'SEED 2 PREFERRED', 86327],
];
assert.deepEqual(cs01.registered_shareholdings.map(row => [
  row.shareholding_number,
  row.holder_name_as_filed,
  row.share_class,
  row.shares,
]), expectedHoldings);

const classTotal = shareClass => cs01.registered_shareholdings
  .filter(row => row.share_class === shareClass)
  .reduce((sum, row) => sum + row.shares, 0);
assert.equal(classTotal('ORDINARY'), 2108068);
assert.equal(classTotal('SEED 1 PREFERRED'), 741051);
assert.equal(classTotal('SEED 2 PREFERRED'), 739180);
assert.equal(classTotal('ORDINARY') + classTotal('SEED 1 PREFERRED') + classTotal('SEED 2 PREFERRED'), 3588299);

assert.equal(cs01.grouped_registered_holdings.atomico.seed2_preferred_shares, 604294);
assert.equal(cs01.grouped_registered_holdings.atomico.total_equity_shares, 604294);
assert.equal(cs01.grouped_registered_holdings.localglobe.seed1_preferred_shares, 631578);
assert.equal(cs01.grouped_registered_holdings.localglobe.seed2_preferred_shares, 48559);
assert.equal(cs01.grouped_registered_holdings.localglobe.total_equity_shares, 680137);
assert.equal(cs01.grouped_registered_holdings.mercuri.seed1_preferred_shares, 70175);
assert.equal(cs01.grouped_registered_holdings.mercuri.seed2_preferred_shares, 86327);
assert.equal(cs01.grouped_registered_holdings.mercuri.total_equity_shares, 156502);
assert.equal(cs01.registered_holders_identified, true);
assert.equal(cs01.registered_holdings_established, true);
assert.equal(cs01.qualifying_holdings_established, true);
assert.equal(cs01.qualifying_holdings_established_as_of, '2025-09-27');
assert.equal(cs01.registered_holder_state_only, true);
assert.equal(cs01.rights_exercise_established, false);
assert.equal(cs01.allottees_identified, false);
assert.equal(cs01.transaction_join_established, false);
assert.equal(cs01.beneficial_owners_identified, false);
assert.equal(cs01.sources_of_funds_identified, false);
assert.equal(cs01.ben_blume_nominating_investor_identified, false);
assert.deepEqual(cs01.sh01_allotment_quantities_for_separate_comparison, [604294, 86327, 48559]);
assert.equal(cs01.numerical_congruence_is_transaction_proof, false);

const receiptBytes = fs.readFileSync(cs01.path);
const receiptHash = crypto.createHash('sha256').update(receiptBytes).digest('hex');
assert.equal(cs01.archive.ref, `sha256:${receiptHash}`);
assert.match(receiptBytes.toString('utf8'), /point-in-time register-state instrument, not an allotment ledger/);
assert.match(receiptBytes.toString('utf8'), /No dated SH01 allottee is therefore attributed from numerical congruence alone/);

const articles = one(receipts, 'receipt_id', 'companies-house-electric-twin-articles-2025-09-12');
assert.equal(articles.qualifying_holdings_established, false);
assert.equal(articles.major_investor_rights.equity_share_threshold, 78251);
assert.equal(cs01.articles_major_investor_threshold_equity_shares, articles.major_investor_rights.equity_share_threshold);
assert.equal(cs01.grouped_registered_holdings.atomico.total_equity_shares >= articles.major_investor_rights.equity_share_threshold, true);
assert.equal(cs01.grouped_registered_holdings.localglobe.total_equity_shares >= articles.major_investor_rights.equity_share_threshold, true);
assert.deepEqual(cs01.qualifying_registered_holder_organization_ids_as_of_confirmation_date, ['atomico', 'localglobe']);

const holderClaim = one(claims, 'claim_id', 'electric-twin-registered-shareholdings-2025-09-27');
assert.equal(holderClaim.registered_holder_state_only, true);
assert.equal(holderClaim.registered_holders_identified, true);
assert.equal(holderClaim.registered_holdings_established, true);
assert.equal(holderClaim.beneficial_owners_identified, false);
assert.equal(holderClaim.allottees_identified, false);
assert.match(holderClaim.limits, /does not establish beneficial ownership/);
assert.match(holderClaim.limits, /recipient of any particular SH01 allotment/);

const qualifyingClaim = one(claims, 'claim_id', 'electric-twin-qualifying-registered-holdings-2025-09-27');
assert.equal(qualifyingClaim.qualifying_registered_holdings_established, true);
assert.equal(qualifyingClaim.qualifying_holdings_established_as_of, '2025-09-27');
assert.equal(qualifyingClaim.rights_exercise_established, false);
assert.match(qualifyingClaim.limits, /do not show that Atomico or LocalGlobe exercised/);
assert.match(qualifyingClaim.limits, /nominating investor for Ben Blume/);

const boundaryClaim = one(claims, 'claim_id', 'electric-twin-cs01-allotment-attribution-boundary-2025-09-27');
assert.equal(boundaryClaim.numerical_congruence_observed, true);
assert.equal(boundaryClaim.transaction_join_established, false);
assert.equal(boundaryClaim.allottees_identified, false);
assert.deepEqual(boundaryClaim.sh01_allotment_quantities, [604294, 86327, 48559]);
assert.deepEqual(boundaryClaim.cs01_grouped_seed2_registered_holding_quantities, {
  atomico_combined: 604294,
  localglobe: 48559,
  mercuri: 86327,
});
assert.match(boundaryClaim.limits, /No SH01 allottee is attributed by inference/);

const legacyAllotteeClaim = one(claims, 'claim_id', 'electric-twin-seed2-allottees-unidentified-2025-09');
assert.match(legacyAllotteeClaim.text, /do not identify the recipients/);

const holderSurface = one(surfaces, 'surface_id', surfaceId);
assert.equal(holderSurface.status, 'official_cs01_registered_holder_state');
assert.equal(holderSurface.hop_eligible, false);
assert.equal(holderSurface.hop_refusal_reason, 'registered_shareholder_state_not_shared_actor_participation');
assert.equal(holderSurface.registered_holder_state_only, true);
assert.equal(holderSurface.registered_holders_identified, true);
assert.equal(holderSurface.registered_holdings_established, true);
assert.equal(holderSurface.qualifying_holdings_established, true);
assert.equal(holderSurface.qualifying_holdings_established_as_of, '2025-09-27');
assert.equal(holderSurface.rights_exercise_established, false);
assert.equal(holderSurface.allottees_identified, false);
assert.equal(holderSurface.transaction_join_established, false);
assert.equal(holderSurface.beneficial_owners_identified, false);
assert.equal(holderSurface.ben_blume_nominating_investor_identified, false);

const holderParts = participation.filter(row => row.surface_id === surfaceId);
assert.equal(sameSet(holderParts.filter(row => row.participant_type === 'actor').map(row => row.actor_id), ['alex-cooper', 'ben-warner']), true);
assert.equal(sameSet(holderParts.filter(row => row.participant_type === 'organization').map(row => row.organization_id), ['atomico', 'electric-twin', 'localglobe', 'mercuri']), true);
assert.equal(holderParts.some(row => row.actor_id === 'ben-blume'), false);
assert.equal(holderParts.some(row => row.actor_id === 'saul-klein'), false);
assert.equal(hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === surfaceId)), false);
assert.equal((hop.rejected_hop_surfaces ?? []).some(row => row.surface_id === surfaceId && row.reason === holderSurface.hop_refusal_reason), true);

const compiledHolderSurface = one(surfaceGraph.surfaces, 'surface_id', surfaceId);
assert.equal(compiledHolderSurface.status, holderSurface.status);
assert.equal(compiledHolderSurface.hop_eligible, false);
assert.equal(compiledHolderSurface.registered_holder_state_only, true);
assert.equal(compiledHolderSurface.qualifying_holdings_established, true);
assert.equal(compiledHolderSurface.rights_exercise_established, false);
assert.equal(compiledHolderSurface.allottees_identified, false);
assert.equal(compiledHolderSurface.transaction_join_established, false);

console.log('validate-electric-twin-cs01-shareholders: OK');
