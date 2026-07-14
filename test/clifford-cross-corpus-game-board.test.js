import assert from 'node:assert/strict';
import { loadCliffordCrossCorpusGameBoard, validateCliffordCrossCorpusGameBoard } from '../tools/lib/clifford-cross-corpus-game-board.mjs';

const baseline = loadCliffordCrossCorpusGameBoard();
assert.deepEqual(validateCliffordCrossCorpusGameBoard(baseline), []);

function expectFailure(label, mutate, pattern) {
  const bundle = structuredClone(baseline);
  mutate(bundle);
  const errors = validateCliffordCrossCorpusGameBoard(bundle);
  assert.match(errors.join('\n'), pattern, label);
}

expectFailure('Austin-Israel cannot disappear because it is intake-only', bundle => {
  bundle.board.lanes = bundle.board.lanes.filter(lane => lane.lane_id !== 'austin-israel-defense-vc-corridor');
}, /must preserve lane austin-israel-defense-vc-corridor/);

expectFailure('staged NatSec100 data cannot be hidden', bundle => {
  bundle.board.lanes.find(lane => lane.lane_id === 'natsec100-defense-companies').visibility = 'hidden_until_promoted';
}, /must remain visible/);

expectFailure('the 837-company Capital Factory universe cannot be reduced to the 12 overlaps', bundle => {
  bundle.board.lanes.find(lane => lane.lane_id === 'austin-israel-defense-vc-corridor').counts.capital_factory_portfolio_universe = 12;
}, /Austin-Israel capital_factory_portfolio_universe/);

expectFailure('the generic zero-row window cannot erase targeted USAspending awards', bundle => {
  const lane = bundle.board.lanes.find(row => row.lane_id === 'usaspending-defense-awards');
  lane.counts.router_government_awards = 0;
  lane.counts.natsec100_official_award_rows_observed = 0;
}, /targeted USAspending acquisitions cannot be erased/);

expectFailure('SAM missing credential cannot become a zero-result search', bundle => {
  const lane = bundle.board.lanes.find(row => row.lane_id === 'sam-gov-defense-opportunities');
  lane.counts.records_seen = 0;
}, /SAM records_seen must remain null/);

expectFailure('SAM source state cannot claim a completed empty search', bundle => {
  bundle.crawlState.sources['sam-opportunities'].status = 'ok';
}, /SAM source state must preserve skipped_missing_credential/);

expectFailure('held LinkedIn signals cannot be deleted from the board', bundle => {
  bundle.board.lanes.find(row => row.lane_id === 'linkedin-public-private-crossings').counts.crossing_candidates = 0;
}, /LinkedIn crossing_candidates/);

expectFailure('zero promoted Trump crossings cannot be rewritten as zero underlying data', bundle => {
  bundle.board.lanes.find(row => row.lane_id === 'trump-presidential-disclosures').counts.normalized_transaction_records = 0;
}, /presidential normalized_transaction_records/);

expectFailure('cross-lane trails must expose the person-router lane', bundle => {
  for (const trail of bundle.board.cross_lane_trails) {
    trail.lane_ids = trail.lane_ids.filter(id => id !== 'person-centered-defense-routers');
  }
}, /cross-lane trails never expose lane person-centered-defense-routers/);

expectFailure('the machine cannot generate a cross-corpus verdict', bundle => {
  bundle.board.player_contract.conclusion_generated = true;
}, /must leave conclusions to the player/);

console.log('clifford-cross-corpus-game-board.test.js: OK');
