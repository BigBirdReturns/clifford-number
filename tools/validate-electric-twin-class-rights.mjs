#!/usr/bin/env node
import assert from 'node:assert/strict';
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

const articles = one(receipts, 'receipt_id', 'companies-house-electric-twin-articles-2025-09-12');
assert.equal(articles.instrument_type, 'articles_of_association');
assert.equal(articles.company_number, '15173006');
assert.equal(articles.source_document_id, 'MzQ4MjEzNzAyN2FkaXF6a2N4');
assert.equal(articles.source_pdf_pages, 71);
assert.equal(articles.source_pdf_sha256, '84a0363d5e2b8075c3d68cf06c769e0e20cf98164f1b7bc48283c473e1dc3bae');
assert.deepEqual(articles.founder_actor_ids, ['alex-cooper', 'ben-warner']);
assert.deepEqual(articles.named_investor_organization_ids, ['atomico', 'localglobe']);
assert.deepEqual(articles.defined_investor_entities.atomico.legal_vehicles, [
  'Atomico Venture VI SCSp',
  'Atomico Venture VI (Parallel) S.C.A., SICAV-RAIF',
]);
assert.deepEqual(articles.defined_investor_entities.localglobe.legal_vehicles, ['LocalGlobe XII, L.P.']);
assert.equal(articles.board_governance.default_max_directors, 5);
assert.equal(articles.board_governance.founder_majority_may_appoint_board_majority, true);
assert.equal(articles.board_governance.atomico_conditional_director_seats, 1);
assert.equal(articles.board_governance.atomico_conditional_non_voting_observers, 1);
assert.equal(articles.board_governance.localglobe_conditional_director_seats, 1);
assert.equal(articles.initial_board_quorum.directors_required, 3);
assert.equal(articles.initial_board_quorum.investor_director_required_if_appointed, true);
assert.equal(articles.initial_board_quorum.adjourned_meeting_fallback, true);
assert.equal(articles.initial_board_quorum.fallback_wait_minutes, 30);
assert.equal(articles.initial_board_quorum.permanent_unconditional_veto_established, false);
assert.equal(articles.major_investor_rights.equity_share_threshold, 78251);
assert.equal(articles.major_investor_rights.pro_rata_first_offer_over_new_securities, true);
assert.equal(articles.seed2_preferred_rights.preference_amount_per_share_gbp, '9.267');
assert.equal(articles.instrument_rights_only, true);
assert.equal(articles.rights_exercise_established, false);
assert.equal(articles.qualifying_holdings_established, false);
assert.equal(articles.allottees_identified, false);
assert.equal(articles.beneficial_owners_identified, false);
assert.equal(articles.ben_blume_nominating_investor_identified, false);
assert.equal(articles.archive.ref, 'sha256:9293198d321a794e37ca5cf3233c797c6bfb2b43e4de9456048193be399f7245');

const sh10 = one(receipts, 'receipt_id', 'companies-house-electric-twin-sh10-rights-2025-09-12');
assert.equal(sh10.instrument_type, 'SH10_notice_of_particulars_of_variation_of_rights_attached_to_shares');
assert.equal(sh10.source_document_id, 'MzQ4MjUyMzM1NGFkaXF6a2N4');
assert.equal(sh10.source_pdf_pages, 4);
assert.equal(sh10.source_pdf_sha256, '64dfc352383793e504d74906c000424d985cfde432cfb81ced58f9e1e8b20cb9');
assert.equal(sh10.ordinary_rights.voting, 'full_as_filed');
assert.equal(sh10.ordinary_rights.dividends, 'full_as_filed');
assert.deepEqual(sh10.liquidation_return_of_capital_waterfall.map(row => row.priority), [1, 2, 3]);
assert.equal(sh10.liquidation_return_of_capital_waterfall[1].insufficient_assets_allocation, 'pro_rata_by_aggregate_preference_amount');
assert.equal(sh10.company_signatory_name_as_filed, 'W Edwards');
assert.equal(sh10.signatory_actor_promoted, false);
assert.equal(sh10.instrument_rights_only, true);
assert.equal(sh10.holders_identified, false);
assert.equal(sh10.allottees_identified, false);
assert.equal(sh10.beneficial_owners_identified, false);
assert.equal(sh10.liquidation_or_exit_observed, false);
assert.deepEqual(sh10.named_actor_ids, []);
assert.equal(sh10.archive.ref, 'sha256:d4ee2bff4134ec694ce3ebbe3b6abe30ab32103952d6195d04b9c7290011bc5f');

const governance = one(surfaces, 'surface_id', 'electric-twin-seed2-governance-instrument-2025-09-12');
assert.equal(governance.status, 'official_structured_governance_and_class_rights_instrument');
assert.equal(governance.hop_eligible, false);
assert.equal(governance.hop_refusal_reason, 'governance_instrument_rights_not_exercised_shared_participation');
assert.equal(governance.instrument_rights_only, true);
assert.equal(governance.rights_exercise_established, false);
assert.equal(governance.qualifying_holdings_established, false);
assert.equal(governance.holder_identity_established, false);
const governanceParts = participation.filter(row => row.surface_id === governance.surface_id);
assert.equal(sameSet(governanceParts.filter(row => row.participant_type === 'actor').map(row => row.actor_id), ['alex-cooper', 'ben-warner']), true);
assert.equal(sameSet(governanceParts.filter(row => row.participant_type === 'organization').map(row => row.organization_id), ['atomico', 'electric-twin', 'localglobe']), true);
assert.equal(governanceParts.some(row => row.actor_id === 'ben-blume'), false);
assert.equal(hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === governance.surface_id)), false);
assert.equal((hop.rejected_hop_surfaces ?? []).some(row => row.surface_id === governance.surface_id && row.reason === governance.hop_refusal_reason), true);

const compiledGovernance = one(surfaceGraph.surfaces, 'surface_id', governance.surface_id);
assert.equal(compiledGovernance.status, governance.status);
assert.equal(compiledGovernance.instrument_rights_only, true);
assert.equal(compiledGovernance.rights_exercise_established, false);

const boardClaim = one(claims, 'claim_id', 'electric-twin-seed2-board-rights-2025-09-12');
assert.equal(boardClaim.instrument_rights_only, true);
assert.equal(boardClaim.rights_exercise_established, false);
assert.equal(boardClaim.qualifying_holdings_established, false);
assert.equal(boardClaim.nominating_investor_for_ben_blume_identified, false);
assert.match(boardClaim.limits, /adjourned-meeting fallback/);
assert.match(boardClaim.limits, /They do not establish that Atomico or LocalGlobe held the qualifying shares/);

const investorClaim = one(claims, 'claim_id', 'electric-twin-seed2-investor-rights-2025-09-12');
assert.equal(investorClaim.instrument_rights_only, true);
assert.equal(investorClaim.holder_identity_established, false);
assert.equal(investorClaim.qualifying_holdings_established, false);
assert.equal(investorClaim.liquidation_or_exit_observed, false);
assert.match(investorClaim.limits, /do not identify the holders or allottees/);

const capital = one(surfaces, 'surface_id', 'electric-twin-capital-allotment-observations-2026-01-13-2026-07-09');
assert.equal(capital.status, 'official_sh01_form_sequence_allottees_unidentified');
assert.equal(capital.underlying_allotment_period_start, '2025-11-21');
assert.equal(capital.hop_eligible, false);
assert.equal(capital.hop_refusal_reason, 'issuer_only_capital_filing_sequence');
assert.equal(capital.notes.includes('recovered forms preserve exact document custody'), true);
assert.equal(capital.notes.includes('do not duplicate'), true);
assert.equal(capital.bounded_by.some(row => row.includes('70,138 Seed 2 Preferred')), true);
assert.equal(capital.bounded_by.some(row => row.includes('class rights remain separately receipted')), true);
assert.equal(hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === capital.surface_id)), false);
const capitalReceipt = one(receipts, 'receipt_id', 'companies-house-electric-twin-2026-capital-allotment-filing-history');
assert.equal(capitalReceipt.class_rights_promoted, false);
assert.deepEqual(capitalReceipt.class_rights_source_receipt_ids, [
  'companies-house-electric-twin-articles-2025-09-12',
  'companies-house-electric-twin-sh10-rights-2025-09-12',
]);
const capitalClaim = one(claims, 'claim_id', 'electric-twin-2026-capital-allotment-filing-history');
assert.equal(capitalClaim.class_rights_promoted, false);
assert.deepEqual(capitalClaim.class_rights_source_receipt_ids, capitalReceipt.class_rights_source_receipt_ids);
assert.match(capitalClaim.limits, /not promoted again from the SH01 statements of capital/);

console.log('validate-electric-twin-class-rights: OK');
