import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root } from '../tools/lib/ledger.mjs';
import { MAP_SOURCE_PATH, MAP_VIEW_PATH, projectCrawlHealthMap } from '../tools/lib/crawl-health-map-projection.mjs';
import { loadCliffordCrossCorpusPublicInterestMap, validateCliffordCrossCorpusPublicInterestMap } from '../tools/lib/clifford-cross-corpus-public-interest-map.mjs';

execFileSync(process.execPath, ['tools/build-research-fanout.mjs'], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, ['tools/build-clifford-cross-corpus-public-interest-map.mjs'], { cwd: root, stdio: 'pipe' });
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

const inputPaths = [MAP_SOURCE_PATH, 'data/crawl/sources.json', 'data/crawl/state.json'];
const sourceBytes = inputPaths.map(file => fs.readFileSync(path.join(root, file)));
const fanoutLane = map => map.lanes.find(lane => lane.lane_id === 'official-research-fanout');
const projectedBundle = (state, sources = baseline.crawlSources) => {
  const bundle = structuredClone(baseline);
  bundle.crawlState = state;
  bundle.crawlSources = sources;
  bundle.map = projectCrawlHealthMap(bundle.sourceMap, sources, state);
  bundle.fanout.source_counts.crawl_source_gaps = sources.sources.filter(source =>
    source.enabled && (state.sources[source.id]?.status ?? 'not_run') !== 'ok').length;
  return bundle;
};
const original = structuredClone(baseline);
const lifecycleState = structuredClone(baseline.crawlState);
for (const source of baseline.crawlSources.sources) {
  if (source.id !== 'sam-opportunities') lifecycleState.sources[source.id] = { status: 'ok' };
}
for (const [index, status] of ['ok', 'error', 'partial', 'not_run', 'ok'].entries()) {
  const state = structuredClone(lifecycleState);
  state.sources['sec-form-d'] = { status, errors: ['private diagnostic must not be published'] };
  const bundle = projectedBundle(state);
  assert.equal(fanoutLane(bundle.map).counts.crawl_source_gaps, [1, 2, 2, 2, 1][index]);
  assert.deepEqual(validateCliffordCrossCorpusPublicInterestMap(bundle), []);
  assert.deepEqual(projectCrawlHealthMap(bundle.sourceMap, bundle.crawlSources, state), bundle.map);
  assert.ok(!JSON.stringify(bundle.map).includes('private diagnostic must not be published'));
  assert.deepEqual(bundle.map.lanes.filter(lane => lane.lane_id !== 'official-research-fanout'),
    baseline.sourceMap.lanes.filter(lane => lane.lane_id !== 'official-research-fanout'));
}
assert.deepEqual(baseline, original, 'projection must not mutate inputs');
const missingState = structuredClone(lifecycleState);
delete missingState.sources['sec-form-d'];
const neverRun = projectedBundle(missingState);
assert.equal(fanoutLane(neverRun.map).crawl_source_gap_states.find(row => row.source_id === 'sec-form-d').status, 'not_run');
assert.deepEqual(validateCliffordCrossCorpusPublicInterestMap(neverRun), []);
const disabledSources = structuredClone(baseline.crawlSources);
disabledSources.sources.find(row => row.id === 'sec-form-d').enabled = false;
const disabled = projectedBundle(missingState, disabledSources);
assert.equal(fanoutLane(disabled.map).counts.crawl_source_gaps, 1);
assert.deepEqual(validateCliffordCrossCorpusPublicInterestMap(disabled), []);
const allHealthy = structuredClone(lifecycleState);
allHealthy.sources['sam-opportunities'].status = 'ok';
assert.equal(fanoutLane(projectedBundle(allHealthy).map).counts.crawl_source_gaps, 0);
assert.match(validateCliffordCrossCorpusPublicInterestMap(projectedBundle(allHealthy)).join('\n'), /SAM source state/);
const duplicates = structuredClone(baseline.crawlSources);
duplicates.sources.push(duplicates.sources[0]);
assert.throws(() => projectCrawlHealthMap(baseline.sourceMap, duplicates, lifecycleState), /duplicate configured source/);
for (const bad of [{ status: 'unsupported' }, { status: { secret: true } }, 'malformed-record']) {
  const state = structuredClone(lifecycleState);
  state.sources['sec-form-d'] = bad;
  assert.throws(() => projectedBundle(state), /unsupported status|invalid source state record/);
}
const recovery = structuredClone(lifecycleState);
recovery.sources['sec-form-d'].status = 'error';
const stale = projectedBundle(recovery);
stale.map = projectedBundle(lifecycleState).map;
const staleBytes = JSON.stringify(stale);
assert.match(validateCliffordCrossCorpusPublicInterestMap(stale).join('\n'), /fanout crawl source gaps: expected 2, got 1/);
assert.equal(JSON.stringify(stale), staleBytes, 'validation must reject rather than repair a stale view');
for (const mutate of [
  bundle => { fanoutLane(bundle.map).counts.crawl_source_gaps += 1; },
  bundle => { fanoutLane(bundle.map).crawl_source_gap_states[0].source_id = 'wrong-source'; },
  bundle => { fanoutLane(bundle.map).crawl_source_gap_states[0].status = 'ok'; },
  bundle => { fanoutLane(bundle.map).crawl_source_health_statement = 'No gaps remain'; },
  bundle => { bundle.map.crawl_health_projection.inputs.recorded_state.json_sha256 = '0'.repeat(64); },
  bundle => { bundle.crawlState.sources['sec-form-d'].last_run_at = '1900-01-01T00:00:00Z'; },
]) {
  const bundle = structuredClone(baseline);
  mutate(bundle);
  assert.match(validateCliffordCrossCorpusPublicInterestMap(bundle).join('\n'), /materialized map must exactly match/);
}
const absentFanout = structuredClone(baseline);
absentFanout.fanout = null;
assert.match(validateCliffordCrossCorpusPublicInterestMap(absentFanout).join('\n'), /current research fanout is required/);
const beforeRebuild = fs.readFileSync(path.join(root, MAP_VIEW_PATH));
execFileSync(process.execPath, ['tools/build-clifford-cross-corpus-public-interest-map.mjs'], { cwd: root, stdio: 'pipe' });
assert.deepEqual(fs.readFileSync(path.join(root, MAP_VIEW_PATH)), beforeRebuild, 'unchanged inputs produce identical bytes');
for (const [index, file] of inputPaths.entries()) {
  assert.deepEqual(fs.readFileSync(path.join(root, file)), sourceBytes[index], `builder changed source ${file}`);
}
console.log('cross-corpus crawl-health lifecycle and stale-view rejection: OK');
execFileSync(process.execPath, ['tools/build-pages.mjs'], { cwd: root, stdio: 'pipe' });
for (const file of [MAP_SOURCE_PATH, MAP_VIEW_PATH]) {
  const publishedPath = path.join(root, 'dist', file);
  const bytes = fs.readFileSync(publishedPath);
  assert.deepEqual(JSON.parse(bytes), baseline.map, `published map differs: ${file}`);
  try {
    const tampered = JSON.parse(bytes);
    fanoutLane(tampered).counts.crawl_source_gaps += 1;
    fs.writeFileSync(publishedPath, JSON.stringify(tampered));
    assert.throws(() => execFileSync(process.execPath, ['tools/validate-pages.mjs'], { cwd: root, stdio: 'pipe' }),
      error => String(error.stderr).includes('published current map drift'), `stale published alias accepted: ${file}`);
  } finally {
    fs.writeFileSync(publishedPath, bytes);
  }
}
try {
  const invalid = structuredClone(baseline.map);
  fanoutLane(invalid).counts.crawl_source_gaps += 1;
  fs.writeFileSync(path.join(root, MAP_VIEW_PATH), JSON.stringify(invalid));
  assert.throws(() => execFileSync(process.execPath, ['tools/build-pages.mjs'], { cwd: root, stdio: 'pipe' }),
    error => String(error.stderr).includes('public map is stale or invalid'));
} finally {
  fs.writeFileSync(path.join(root, MAP_VIEW_PATH), beforeRebuild);
}
console.log('cross-corpus published-view freshness controls: OK');

const scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts;
assert.equal(scripts['build:pages'], 'npm run fanout && npm run build:cross-corpus-map && node tools/build-pages.mjs',
  'standalone Pages orchestration must build the fanout and current map before checked publication');
