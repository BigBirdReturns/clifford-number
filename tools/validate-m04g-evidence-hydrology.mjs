#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const fail = (message) => {
  console.error(`validate-m04g-evidence-hydrology: ${message}`);
  process.exit(1);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};
const unique = (values) => new Set(values).size === values.length;

const methodology = readJson('data/project/m04g-evidence-hydrology-methodology.json');
const catchmentsDoc = readJson('data/project/m04g-evidence-hydrology-catchments.json');
const sourcesDoc = readJson('data/intake/m04g-evidence-hydrology-sources-01.json');
const pollsDoc = readJson('data/project/m04g-evidence-hydrology-pilot-polls.json');
const fanoutDoc = readJson('data/project/m04g-evidence-hydrology-fanout.json');

assert(methodology.schema === 'm04g-evidence-hydrology-methodology@1', 'methodology schema mismatch');
assert(catchmentsDoc.schema === 'm04g-evidence-hydrology-catchments@1', 'catchments schema mismatch');
assert(sourcesDoc.schema === 'm04g-evidence-hydrology-sources@1', 'sources schema mismatch');
assert(pollsDoc.schema === 'm04g-evidence-hydrology-pilot-polls@1', 'polls schema mismatch');
assert(fanoutDoc.schema === 'm04g-evidence-hydrology-fanout@1', 'fan-out schema mismatch');

const catchments = catchmentsDoc.catchments;
const sources = sourcesDoc.sources;
const polls = pollsDoc.polls;
const lanes = fanoutDoc.lanes;
assert(Array.isArray(catchments) && catchments.length === 18, `expected 18 catchments, got ${catchments?.length}`);
assert(Array.isArray(sources) && sources.length === 128, `expected 128 sources, got ${sources?.length}`);
assert(Array.isArray(polls) && polls.length >= 24, `expected at least 24 pilot polls, got ${polls?.length}`);
assert(Array.isArray(lanes) && lanes.length === 24, `expected 24 fan-out lanes, got ${lanes?.length}`);

const catchmentIds = catchments.map((row) => row.catchment_id);
const sourceIds = sources.map((row) => row.source_id);
const pollIds = polls.map((row) => row.poll_id);
const laneIds = lanes.map((row) => row.lane_id);
assert(unique(catchmentIds), 'duplicate catchment IDs');
assert(unique(sourceIds), 'duplicate source IDs');
assert(unique(pollIds), 'duplicate poll IDs');
assert(unique(laneIds), 'duplicate lane IDs');
assert(sourceIds.every((id, index) => id === `M04G-S${String(index + 1).padStart(3, '0')}`), 'source IDs are not contiguous M04G-S001..M04G-S128');
assert(laneIds.every((id, index) => id === `H${String(index + 1).padStart(2, '0')}`), 'lane IDs are not contiguous H01..H24');

const catchmentSet = new Set(catchmentIds);
const sourceSet = new Set(sourceIds);
const classNames = Object.keys(methodology.hydrology_classes);
const classSet = new Set(classNames);
const classCounts = Object.fromEntries(classNames.map((name) => [name, 0]));
const authorityTiers = new Set([
  'A0-discovery', 'A1-claimant', 'A2-primary-official',
  'A3-independent-adjudicative', 'A4-direct-affected-voice', 'A5-route-only',
]);

for (const source of sources) {
  for (const key of [
    'source_id', 'name', 'publisher', 'hydrology_class', 'catchments', 'jurisdictions',
    'source_type', 'authority_tier', 'access_mode', 'docs_url', 'entry_url', 'authentication',
    'cadence', 'automation_state', 'storage_policy', 'promotion_ceiling', 'limitations',
  ]) {
    assert(Object.hasOwn(source, key), `${source.source_id ?? '<unknown>'} missing ${key}`);
  }
  assert(classSet.has(source.hydrology_class), `${source.source_id} has unknown hydrology class`);
  assert(authorityTiers.has(source.authority_tier), `${source.source_id} has unknown authority tier`);
  assert(Array.isArray(source.catchments) && source.catchments.length > 0, `${source.source_id} has no catchments`);
  assert(source.catchments.every((id) => catchmentSet.has(id)), `${source.source_id} references unknown catchment`);
  assert(Array.isArray(source.jurisdictions) && source.jurisdictions.length > 0, `${source.source_id} has no jurisdiction`);
  for (const field of ['docs_url', 'entry_url']) {
    assert(/^https:\/\//.test(source[field]), `${source.source_id} ${field} must use HTTPS`);
  }
  classCounts[source.hydrology_class] += 1;
  if (source.hydrology_class === 'ocean_discovery') {
    assert(source.promotion_ceiling === 'locator_only', `${source.source_id} ocean source can exceed locator_only`);
  }
  if (source.hydrology_class === 'tributary_direct_voice') {
    assert(source.promotion_ceiling === 'deployment_specific_voice_candidate_only', `${source.source_id} direct voice ceiling mismatch`);
    assert(!source.automation_state.startsWith('pollable'), `${source.source_id} direct voice may not be bulk-polled`);
  }
  if (source.hydrology_class === 'aquifer_archival_or_restricted') {
    assert(source.promotion_ceiling === 'locator_or_acquisition_route_only', `${source.source_id} aquifer ceiling mismatch`);
  }
}

const expectedClassCounts = {
  ocean_discovery: 16,
  freshwater_authoritative: 72,
  tributary_direct_voice: 24,
  aquifer_archival_or_restricted: 16,
};
assert(JSON.stringify(classCounts) === JSON.stringify(expectedClassCounts), `class counts mismatch: ${JSON.stringify(classCounts)}`);
assert(JSON.stringify(sourcesDoc.counts) === JSON.stringify({sources:128, ...expectedClassCounts}), 'committed source counts mismatch');

for (const poll of polls) {
  assert(sourceSet.has(poll.source_id), `${poll.poll_id} references unknown source ${poll.source_id}`);
  assert(classSet.has(poll.hydrology_class), `${poll.poll_id} has unknown hydrology class`);
  assert(poll.hydrology_class === sources.find((source) => source.source_id === poll.source_id).hydrology_class, `${poll.poll_id} class disagrees with source`);
  assert(poll.enabled === true, `${poll.poll_id} is unexpectedly disabled`);
  assert(poll.promotion_ceiling === 'locator_only', `${poll.poll_id} can promote beyond locator_only`);
  assert(poll.retention === 'headers_hash_summary_and_change_event_only', `${poll.poll_id} retention law mismatch`);
  assert(['GET', 'HEAD', 'POST'].includes(poll.request?.method), `${poll.poll_id} method not allowed`);
  assert(/^https:\/\//.test(poll.request?.url ?? ''), `${poll.poll_id} URL must use HTTPS`);
  assert(Number.isInteger(poll.max_bytes) && poll.max_bytes > 0 && poll.max_bytes <= 5_000_000, `${poll.poll_id} max_bytes out of bounds`);
  assert(Number.isInteger(poll.timeout_ms) && poll.timeout_ms >= 1_000 && poll.timeout_ms <= 60_000, `${poll.poll_id} timeout out of bounds`);
  const source = sources.find((row) => row.source_id === poll.source_id);
  assert(!source.authentication.includes('account') && !source.authentication.includes('request') && !source.authentication.includes('restricted'), `${poll.poll_id} points to an authenticated or restricted source`);
  assert(source.hydrology_class !== 'tributary_direct_voice', `${poll.poll_id} may not poll direct voice`);
}

for (const lane of lanes) {
  assert(Array.isArray(lane.catchments) && lane.catchments.length > 0, `${lane.lane_id} has no catchments`);
  assert(lane.catchments.every((id) => catchmentSet.has(id)), `${lane.lane_id} references unknown catchment`);
  assert(Array.isArray(lane.hydrology_classes) && lane.hydrology_classes.every((name) => classSet.has(name)), `${lane.lane_id} references unknown hydrology class`);
  assert(lane.promotes_to === 'candidate_only', `${lane.lane_id} promotes beyond candidate_only`);
  assert(lane.graph_effect === 'none', `${lane.lane_id} changes the graph`);
  assert(typeof lane.falsifier === 'string' && lane.falsifier.length > 40, `${lane.lane_id} lacks a material falsifier`);
  assert(typeof lane.stopping_rule === 'string' && lane.stopping_rule.length > 40, `${lane.lane_id} lacks a stopping rule`);
}

const boundaries = methodology.boundaries;
for (const [key, expected] of Object.entries({
  promotes_to: 'candidate_only',
  graph_effect: 'none',
  conclusion_generated: false,
  estate_completion_claimed: false,
  continuous_ingestion_proves_completeness: false,
  freshness_proves_accuracy: false,
  ocean_volume_proves_recurrence: false,
  source_disappearance_proves_intent: false,
})) {
  assert(boundaries[key] === expected, `methodology boundary ${key} mismatch`);
  assert(catchmentsDoc.boundaries[key] === expected, `catchment boundary ${key} mismatch`);
  assert(sourcesDoc.boundaries[key] === expected, `source boundary ${key} mismatch`);
  assert(pollsDoc.boundaries[key] === expected, `poll boundary ${key} mismatch`);
  assert(fanoutDoc.boundaries[key] === expected, `fan-out boundary ${key} mismatch`);
}

console.log(JSON.stringify({
  ok: true,
  program_id: methodology.program_id,
  catchments: catchments.length,
  sources: sources.length,
  by_hydrology_class: classCounts,
  pilot_polls: polls.length,
  fanout_lanes: lanes.length,
  boundaries,
}, null, 2));
console.log('validate-m04g-evidence-hydrology: OK');
