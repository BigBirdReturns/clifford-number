import assert from 'node:assert/strict';
import { loadCliffordCrossCorpusPublicInterestMap, validateCliffordCrossCorpusPublicInterestMap } from '../tools/lib/clifford-cross-corpus-public-interest-map.mjs';

const baseline = loadCliffordCrossCorpusPublicInterestMap();
assert.deepEqual(validateCliffordCrossCorpusPublicInterestMap(baseline), []);

const advancedTargetBranch = structuredClone(baseline);
for (let i = 0; i < 9; i++) {
  advancedTargetBranch.crawlCandidates.push({ candidate_id: `future-${i}` });
  advancedTargetBranch.crawlObservations.push({ observation_id: `future-${i}` });
}
for (let i = 0; i < 28; i++) advancedTargetBranch.crawlRejections.push({ rejection_id: `future-${i}` });
if (advancedTargetBranch.fanout) advancedTargetBranch.fanout.source_counts.total += 37;
assert.deepEqual(
  validateCliffordCrossCorpusPublicInterestMap(advancedTargetBranch),
  [],
  'live official-record intake may grow beyond the infrastructure snapshot without erasing the preserved minimum',
);

function expectFailure(label, mutate, pattern) {
  const bundle = structuredClone(baseline);
  mutate(bundle);
  const errors = validateCliffordCrossCorpusPublicInterestMap(bundle);
  assert.match(errors.join('\n'), pattern, label);
}

expectFailure('Austin-Israel cannot disappear because it is intake-only', bundle => {
  bundle.map.lanes = bundle.map.lanes.filter(lane => lane.lane_id !== 'austin-israel-defense-vc-corridor');
}, /must preserve lane austin-israel-defense-vc-corridor/);

expectFailure('the map cannot claim a crawl minimum larger than the checked corpus', bundle => {
  bundle.map.inventory.discovery_queue.crawl_candidates_minimum = 999;
}, /crawl candidates: expected at least 999/);

expectFailure('staged NatSec100 data cannot be hidden', bundle => {
  bundle.map.lanes.find(lane => lane.lane_id === 'natsec100-defense-companies').visibility = 'hidden_until_promoted';
}, /must remain visible/);

expectFailure('the 837-company Capital Factory universe cannot be reduced to the 12 overlaps', bundle => {
  bundle.map.lanes.find(lane => lane.lane_id === 'austin-israel-defense-vc-corridor').counts.capital_factory_portfolio_universe = 12;
}, /Austin-Israel capital_factory_portfolio_universe/);

expectFailure('the generic zero-row window cannot erase targeted USAspending awards', bundle => {
  const lane = bundle.map.lanes.find(row => row.lane_id === 'usaspending-defense-awards');
  lane.counts.router_government_awards = 0;
  lane.counts.natsec100_official_award_rows_observed = 0;
}, /targeted USAspending acquisitions cannot be erased/);

expectFailure('SAM missing credential cannot become a zero-result search', bundle => {
  const lane = bundle.map.lanes.find(row => row.lane_id === 'sam-gov-defense-opportunities');
  lane.counts.records_seen = 0;
}, /SAM records_seen must remain null/);

expectFailure('SAM source state cannot claim a completed empty search', bundle => {
  bundle.crawlState.sources['sam-opportunities'].status = 'ok';
}, /SAM source state must preserve skipped_missing_credential/);

expectFailure('held LinkedIn signals cannot be deleted from the public-interest map', bundle => {
  bundle.map.lanes.find(row => row.lane_id === 'linkedin-public-private-crossings').counts.crossing_candidates = 0;
}, /LinkedIn crossing_candidates/);

expectFailure('zero promoted Trump crossings cannot be rewritten as zero underlying data', bundle => {
  bundle.map.lanes.find(row => row.lane_id === 'trump-presidential-disclosures').counts.normalized_transaction_records = 0;
}, /presidential normalized_transaction_records/);

expectFailure('cross-lane trails must expose the person-router lane', bundle => {
  for (const trail of bundle.map.cross_lane_trails) {
    trail.lane_ids = trail.lane_ids.filter(id => id !== 'person-centered-defense-routers');
  }
}, /cross-lane trails never expose lane person-centered-defense-routers/);

expectFailure('the machine cannot generate a cross-corpus verdict', bundle => {
  bundle.map.public_interpretation_contract.conclusion_generated = true;
}, /must leave conclusions open to public evaluation/);

console.log('clifford-cross-corpus-public-interest-map.test.js: OK');
