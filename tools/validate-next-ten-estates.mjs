#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildNextTenEstates, NEXT_TEN_ESTATES_SCHEMA_VERSION } from './build-next-ten-estates.mjs';
import { readJson, root } from './lib/ledger.mjs';

const manifest = buildNextTenEstates({ write: false });
const emitted = readJson('data/intake/next-ten-estates/manifest.json');
assert.deepEqual(emitted, manifest, 'committed next-ten-estates manifest must match deterministic build output');

assert.equal(manifest.schema_version, NEXT_TEN_ESTATES_SCHEMA_VERSION);
assert.equal(manifest.graph_effect, 'none');
assert.equal(manifest.conclusion_generated, false);
assert.equal(manifest.promotes_to, 'candidate_only');
assert.equal(manifest.counts.estates, 10);
assert.equal(manifest.counts.tracks, 10);
assert.equal(manifest.track_ids.length, 10);
assert.equal(new Set(manifest.track_ids).size, 10);
assert.equal(manifest.estate_ids.length, 10);
assert.equal(new Set(manifest.estate_ids).size, 10);
assert.equal(manifest.estates.length, 10);

const rawDirectory = path.join(root, 'data', 'intake', 'next-ten-estates', 'raw');
const rawFiles = fs.readdirSync(rawDirectory).filter(file => file.endsWith('.json')).sort();
const manifestRawFiles = manifest.estates.map(item => path.basename(item.raw_file)).sort();
assert.deepEqual(rawFiles, manifestRawFiles, 'raw directory must contain exactly the ten manifested estate files');

for (const item of manifest.estates) {
  assert.match(item.raw_sha256, /^[a-f0-9]{64}$/);
  assert.equal(item.graph_effect, 'none');
  assert.ok(['surface_complete', 'partially_searched', 'not_searched', 'unavailable_after_search'].includes(item.denominator.coverage_state));
  assert.ok(item.denominator.acquired_count <= item.denominator.expected_count);
  if (item.denominator.coverage_state === 'surface_complete') {
    assert.equal(item.denominator.acquired_count, item.denominator.expected_count);
  }
}

const serialized = JSON.stringify(manifest);
assert.doesNotMatch(serialized, /"(?:guilt_score|corruption_score|motive_score|influence_score|risk_score|probability_score|ranking|rank|score|verdict|finding|claim_status)"\s*:/i);
assert.doesNotMatch(serialized, /"graph_effect"\s*:\s*"(?!none)"/i);
assert.doesNotMatch(serialized, /"conclusion_generated"\s*:\s*true/i);

console.log(`validate-next-ten-estates: OK (${manifest.counts.estates} estates, ${manifest.counts.sources} sources, ${manifest.counts.raw_records} raw records)`);
