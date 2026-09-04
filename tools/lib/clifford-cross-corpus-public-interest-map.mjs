import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { MAP_SOURCE_PATH, MAP_VIEW_PATH, projectCrawlHealthMap } from './crawl-health-map-projection.mjs';
import { readJson, readJsonl, root } from './ledger.mjs';

const optionalJson = file => {
  const full = path.join(root, file);
  return fs.existsSync(full) ? readJson(file) : null;
};

export function loadCliffordCrossCorpusPublicInterestMap() {
  return {
    sourceMap: readJson(MAP_SOURCE_PATH),
    map: readJson(MAP_VIEW_PATH),
    wrap: readJson('data/research/clifford-thiel-trump-wrap-up.json'),
    actors: readJson('data/canonical/actors.json').actors,
    organizations: readJson('data/canonical/organizations.json').organizations,
    surfaces: readJsonl('data/ledger/surfaces.jsonl'),
    participation: readJsonl('data/ledger/participation.jsonl'),
    receipts: readJsonl('data/ledger/receipts.jsonl'),
    hopGraph: readJson('build/hop-graph.json'),
    scout: readJson('build/scout-report.json'),
    crawlCandidates: readJsonl('data/crawl/candidates.jsonl'),
    crawlObservations: readJsonl('data/crawl/observations.jsonl'),
    crawlRejections: readJsonl('data/crawl/rejections.jsonl'),
    crawlSources: readJson('data/crawl/sources.json'),
    crawlState: readJson('data/crawl/state.json'),
    publicInterestSeeds: readJsonl('data/research/public-interest-discovery-seeds.jsonl'),
    fanout: optionalJson('build/research-fanout/manifest.json'),
    natsec: {
      companies: readJsonl('data/intake/natsec100-pathways/chunk1/companies.jsonl'),
      companyYears: readJsonl('data/intake/natsec100-pathways/chunk1/company_years.jsonl'),
      conversionEvents: readJsonl('data/intake/natsec100-pathways/chunk1/conversion_events.jsonl'),
      receipts: readJsonl('data/intake/natsec100-pathways/chunk1/receipts.jsonl'),
      surfaces: readJsonl('data/intake/natsec100-pathways/chunk1/surfaces.jsonl'),
      actors: readJsonl('data/intake/natsec100-pathways/chunk1/actors.jsonl'),
    },
    corridor: {
      manifest: readJson('data/intake/austin-israel-defense-corridor/manifest.json'),
      portfolioEdges: readJsonl('data/intake/austin-israel-defense-corridor/portfolio-edges.jsonl'),
    },
    routers: readJson('data/intake/person-centered-defense-routers/manifest.json'),
    linkedin: {
      manifest: readJson('data/intake/linkedin-targeted-review/manifest.json'),
      analysis: readJson('data/intake/linkedin-targeted-review/crossing-analysis.json'),
    },
    natsecAwards: readJson('data/research/natsec100-award-control-manifest.json'),
    presidential: readJson('data/research/presidential-disclosure-source-coverage.json'),
  };
}

export function validateCliffordCrossCorpusPublicInterestMap(bundle) {
  const errors = [];
  const {
    map, sourceMap, wrap, actors, organizations, surfaces, participation, receipts, hopGraph,
    scout, crawlCandidates, crawlObservations, crawlRejections, crawlSources, crawlState,
    publicInterestSeeds, fanout, natsec, corridor, routers, linkedin, natsecAwards, presidential,
  } = bundle;
  try {
    const expected = projectCrawlHealthMap(sourceMap, crawlSources, crawlState);
    if (!isDeepStrictEqual(map, expected)) errors.push('materialized map must exactly match its editorial source and current committed crawl inputs');
  } catch (error) {
    errors.push(error.message);
  }
  if (!fanout) errors.push('current research fanout is required to validate the materialized map');
  const lanes = new Map((map.lanes ?? []).map(lane => [lane.lane_id, lane]));
  const requiredLaneIds = [
    'clifford-policy-dialog-core',
    'natsec100-defense-companies',
    'austin-israel-defense-vc-corridor',
    'person-centered-defense-routers',
    'usaspending-defense-awards',
    'sam-gov-defense-opportunities',
    'linkedin-public-private-crossings',
    'trump-presidential-disclosures',
    'official-research-fanout',
  ];

  const expect = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${expected}, got ${actual}`);
  };
  const expectAtLeast = (actual, minimum, label) => {
    if (!Number.isFinite(minimum) || actual < minimum) errors.push(`${label}: expected at least ${minimum}, got ${actual}`);
  };
  const count = (laneId, field) => lanes.get(laneId)?.counts?.[field];

  if (map.schema_version !== 'clifford-cross-corpus-public-interest-map@1') errors.push('cross-corpus public-interest map schema mismatch');
  if (map.scope !== 'Repository evidence only; no new external acquisition.') errors.push('cross-corpus public-interest map must remain repository-only');
  if (map.infrastructure_contract?.mode !== 'discovery_not_adjudication' || map.infrastructure_contract?.conclusion_generated !== false) {
    errors.push('public-interest infrastructure must operate in discovery mode without generating a conclusion');
  }
  if (map.infrastructure_contract?.canonical_hop_graph_is_total_corpus !== false || map.infrastructure_contract?.intake_and_staged_data_are_publicly_inspectable !== true) {
    errors.push('public-interest infrastructure must distinguish the canonical hop graph from the publicly inspectable discovery corpus');
  }
  if (!/does not delete the data/i.test(map.infrastructure_contract?.rule ?? '')) errors.push('public-interest infrastructure must forbid promotion-state erasure');
  expect(map.inventory?.lane_count, requiredLaneIds.length, 'inventory lane_count');
  expect(lanes.size, requiredLaneIds.length, 'public-interest map lane count');
  for (const laneId of requiredLaneIds) {
    const lane = lanes.get(laneId);
    if (!lane) errors.push(`public-interest map must preserve lane ${laneId}`);
    else if (!String(lane.visibility).startsWith('visible')) errors.push(`cross-corpus lane ${laneId} must remain visible`);
  }

  expect(map.inventory?.canonical?.actors, actors.length, 'canonical actors');
  expect(map.inventory?.canonical?.organizations, organizations.length, 'canonical organizations');
  expect(map.inventory?.canonical?.surfaces, surfaces.length, 'canonical surfaces');
  expect(map.inventory?.canonical?.participations, participation.length, 'canonical participations');
  expect(map.inventory?.canonical?.receipts, receipts.length, 'canonical receipts');
  expect(map.inventory?.canonical?.compiled_hop_edges, hopGraph.edges?.length, 'compiled hop edges');
  expect(map.inventory?.discovery_queue?.scout_findings, scout.findings?.length, 'scout findings');
  expectAtLeast(crawlCandidates.length, map.inventory?.discovery_queue?.crawl_candidates_minimum, 'crawl candidates');
  expectAtLeast(crawlObservations.length, map.inventory?.discovery_queue?.crawl_observations_minimum, 'crawl observations');
  expectAtLeast(crawlRejections.length, map.inventory?.discovery_queue?.crawl_rejections_preserved_minimum, 'crawl rejections');
  expect(map.inventory?.discovery_queue?.public_interest_seeds, publicInterestSeeds.length, 'public-interest seeds');

  expect(count('clifford-policy-dialog-core', 'surviving_outcomes'), wrap.surviving_outcomes?.length, 'core surviving outcomes');
  expect(count('clifford-policy-dialog-core', 'structural_signals_outside_hop_graph'), wrap.signals_outside_hop_graph?.length, 'core structural signals');
  expect(count('clifford-policy-dialog-core', 'evaluated_paths'), wrap.evaluated_paths?.length, 'core evaluated paths');

  expect(count('natsec100-defense-companies', 'companies'), natsec.companies.length, 'NatSec100 companies');
  expect(count('natsec100-defense-companies', 'company_year_rows'), natsec.companyYears.length, 'NatSec100 company-year rows');
  expect(count('natsec100-defense-companies', 'conversion_events'), natsec.conversionEvents.length, 'NatSec100 conversion events');
  expect(count('natsec100-defense-companies', 'receipts'), natsec.receipts.length, 'NatSec100 receipts');
  expect(count('natsec100-defense-companies', 'ranking_surfaces'), natsec.surfaces.length, 'NatSec100 surfaces');
  expect(count('natsec100-defense-companies', 'actors'), natsec.actors.length, 'NatSec100 actors');
  expect(count('natsec100-defense-companies', 'known_missing_2025_roster_rows'), 400 - natsec.companyYears.length, 'NatSec100 known missing rows');

  const cm = corridor.manifest.counts;
  for (const [mapField, manifestField] of Object.entries({
    capital_factory_portfolio_universe: 'capital_factory_portfolio_universe',
    natsec100_universe: 'natsec100_universe',
    cf_natsec100_colistings: 'cf_natsec100_confirmed_colistings',
    cf_natsec100_independently_corroborated: 'cf_natsec100_independently_corroborated',
    pallas_ventures_natsec100_colistings: 'pallas_ventures_natsec100_colistings',
    silent_ventures_natsec100_colistings: 'silent_ventures_natsec100_colistings',
    austin_israel_source_explicit_members: 'austin_israel_cohort_members',
    deep_dives: 'deep_dives',
    receipts_total: 'receipts_total',
    receipts_resolved: 'receipts_resolved',
    receipts_unresolved: 'receipts_unresolved',
  })) expect(count('austin-israel-defense-vc-corridor', mapField), cm[manifestField], `Austin-Israel ${mapField}`);
  expect(count('austin-israel-defense-vc-corridor', 'portfolio_edges'), corridor.portfolioEdges.length, 'Austin-Israel portfolio edges');

  const rm = routers.counts;
  for (const [mapField, manifestField] of Object.entries({
    router_source_universe: 'router_source_universe_denominator',
    admitted_routers: 'admitted_routers',
    vehicles: 'vehicles',
    jackson_portfolio_universe: 'jackson_portfolio_universe',
    jackson_natsec100_overlaps: 'jackson_x_natsec100',
    jackson_capital_factory_overlaps: 'jackson_x_capital_factory',
    funds: 'fund_census_funds',
    fund_companies: 'fund_census_companies',
    cross_fund_coinvestments: 'cross_fund_co_investments',
    fund_natsec100_overlaps: 'fund_natsec100_overlaps',
    evidence_trails: 'evidence_trails',
    frontier_partial_or_not_searched: 'frontier_partial_or_not_searched',
    receipts_total: 'receipts_total',
    receipts_resolved: 'receipts_resolved',
  })) expect(count('person-centered-defense-routers', mapField), rm[manifestField], `person-router ${mapField}`);

  const usaLane = lanes.get('usaspending-defense-awards');
  expect(usaLane?.acquisition_state, 'acquired_official_rows_with_identity_gates', 'USAspending acquisition state');
  expect(count('usaspending-defense-awards', 'router_government_awards'), rm.government_awards, 'router government awards');
  expect(count('usaspending-defense-awards', 'router_award_identities_resolved'), rm.government_awards_identity_resolved, 'resolved router award identities');
  expect(count('usaspending-defense-awards', 'router_award_identities_held'), rm.government_awards_identity_held, 'held router award identities');
  expect(count('usaspending-defense-awards', 'natsec100_leads_queried'), natsecAwards.coverage?.leads_queried, 'NatSec100 award leads queried');
  expect(count('usaspending-defense-awards', 'natsec100_official_award_rows_observed'), natsecAwards.coverage?.official_award_rows_observed, 'NatSec100 official award rows');
  expect(count('usaspending-defense-awards', 'natsec100_leads_with_official_rows'), natsecAwards.coverage?.leads_with_official_rows, 'NatSec100 leads with official rows');
  expect(count('usaspending-defense-awards', 'natsec100_trade_summaries_exactly_verified'), natsecAwards.coverage?.trade_summaries_exactly_verified, 'NatSec100 exact trade summaries');
  if ((count('usaspending-defense-awards', 'router_government_awards') ?? 0) <= 0 || (count('usaspending-defense-awards', 'natsec100_official_award_rows_observed') ?? 0) <= 0) {
    errors.push('targeted USAspending acquisitions cannot be erased by a zero-row generic crawler window');
  }

  const samLane = lanes.get('sam-gov-defense-opportunities');
  const samSource = crawlSources.sources?.find(source => source.id === 'sam-opportunities');
  if (!samSource || samSource.auth?.env !== 'SAM_API_KEY') errors.push('SAM configured credential route is missing');
  if (crawlState.sources?.['sam-opportunities']?.status !== 'skipped_missing_credential') errors.push('SAM source state must preserve skipped_missing_credential');
  if (samLane?.acquisition_state !== 'not_acquired_missing_credential') errors.push('SAM public-interest map lane must describe a missing-credential acquisition gap');
  expect(count('sam-gov-defense-opportunities', 'queries_executed'), 0, 'SAM queries executed');
  if (count('sam-gov-defense-opportunities', 'records_seen') !== null) errors.push('SAM records_seen must remain null rather than being rewritten as zero');
  if (!/neither zero responsive opportunities nor evidence of absence/i.test(samLane?.open_join ?? '')) errors.push('SAM lane must prohibit false zero-result interpretation');

  const lm = linkedin.manifest.counts;
  const la = linkedin.analysis;
  for (const [mapField, expected] of Object.entries({
    captures: lm.captures,
    displayed_subjects: lm.displayed_subject_labels,
    role_claims: lm.role_claims,
    crossing_candidates: lm.crossing_candidates,
    distinct_institutional_transitions: la.deduplication?.distinct_institutional_transitions,
    concurrent_dual_hats: la.chronological_adjacency?.classes?.concurrent_dual_hat,
    immediate_transitions_le_3_months: la.chronological_adjacency?.classes?.immediate_transition_le_3mo,
    within_year_transitions: la.chronological_adjacency?.classes?.within_year_transition,
    gap_transitions_gt_12_months: la.chronological_adjacency?.classes?.gap_transition_gt_12mo,
    undated: la.chronological_adjacency?.classes?.undated,
    canonical_gate_passed: la.source_explicit_classification?.gate_passed,
    canonical_gate_held: la.source_explicit_classification?.gate_held,
  })) expect(count('linkedin-public-private-crossings', mapField), expected, `LinkedIn ${mapField}`);

  const pc = presidential.coverage;
  for (const [mapField, coverageField] of Object.entries({
    hashed_fec_cycle_archives: 'hashed_fec_cycle_archives',
    normalized_transaction_records: 'normalized_transaction_records',
    unresolved_payee_candidates: 'unresolved_payee_candidates',
    normalized_beneficial_interest_records: 'normalized_beneficial_interest_records',
    unresolved_lexical_overlap_candidates: 'unresolved_lexical_overlap_candidates',
    embedded_name_candidate_pairs: 'embedded_name_candidate_pairs',
    trump_token_candidate_pairs: 'embedded_name_trump_token_candidate_pairs',
    official_ny_registry_nodes: 'official_ny_registry_nodes_observed',
    sec_identifier_candidate_rows: 'sec_identifier_candidate_rows',
    resolved_cross_source_legal_entities: 'resolved_cross_source_legal_entities',
    promoted_crossings: 'crossing_matches',
  })) expect(count('trump-presidential-disclosures', mapField), pc[coverageField], `presidential ${mapField}`);

  expect(count('official-research-fanout', 'scout_findings'), scout.findings?.length, 'fanout scout findings');
  expectAtLeast(crawlCandidates.length, count('official-research-fanout', 'crawl_candidates_minimum'), 'fanout crawl candidates');
  expectAtLeast(crawlRejections.length, count('official-research-fanout', 'crawl_rejections_preserved_minimum'), 'fanout crawl rejections');
  expect(count('official-research-fanout', 'public_interest_seeds'), publicInterestSeeds.length, 'fanout public-interest seeds');
  if (fanout) {
    expectAtLeast(fanout.source_counts?.total, count('official-research-fanout', 'fanout_items_minimum'), 'fanout total items');
    expect(count('official-research-fanout', 'crawl_source_gaps'), fanout.source_counts?.crawl_source_gaps, 'fanout crawl source gaps');
    expect(count('official-research-fanout', 'field_autopsy_searches'), fanout.source_counts?.field_autopsy_trail_searches, 'fanout field-autopsy searches');
    expect(count('official-research-fanout', 'formation_signature_searches'), fanout.source_counts?.formation_signature_searches, 'fanout formation searches');
  }

  const requiredTrailCoverage = new Set(requiredLaneIds.filter(id => id !== 'sam-gov-defense-opportunities'));
  for (const trail of map.cross_lane_trails ?? []) {
    for (const laneId of trail.lane_ids ?? []) {
      if (!lanes.has(laneId)) errors.push(`cross-lane trail ${trail.trail_id} references missing lane ${laneId}`);
      requiredTrailCoverage.delete(laneId);
    }
  }
  for (const laneId of requiredTrailCoverage) errors.push(`cross-lane trails never expose lane ${laneId}`);
  for (const lane of lanes.values()) {
    for (const sourcePath of lane.source_paths ?? []) {
      if (!fs.existsSync(path.join(root, sourcePath))) errors.push(`cross-corpus lane ${lane.lane_id} references missing source path ${sourcePath}`);
    }
  }
  if (map.bottom_line !== undefined) errors.push('public-interest map must not emit a bottom-line verdict');
  if (map.public_interpretation_contract?.conclusion_generated !== false || map.public_interpretation_contract?.graph_effect !== 'none') {
    errors.push('public-interpretation contract must leave conclusions open to public evaluation and remain graph-inert');
  }
  return errors;
}
