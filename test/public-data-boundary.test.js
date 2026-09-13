import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const boundary = read('build/public-data-boundary.json');
const graph = read('graph.json');
const surfaces = read('build/surface-graph.json');
const hops = read('build/hop-graph.json');
const receipts = read('build/receipt-graph.json');
const clock = read('data/project/build-clock.json');

test('public data boundary names every public graph projection and its authority', () => {
  assert.equal(boundary.schema_version, 'clifford-public-data-boundary@1');
  assert.equal(boundary.views.research_network.projection_generated, graph.generated);
  assert.equal(boundary.views.research_network.canonical_for_clifford_number, false);
  assert.equal(boundary.views.research_network.corpus_as_of, graph.corpus_as_of);
  assert.equal(boundary.views.bounded_surfaces.projection_generated, surfaces.generated);
  assert.equal(boundary.views.verified_hops.projection_generated, hops.generated);
  assert.equal(boundary.views.receipt_graph.projection_generated, receipts.generated);
  assert.equal(boundary.views.bounded_surfaces.canonical_for_clifford_number, true);
  assert.equal(boundary.views.verified_hops.canonical_for_clifford_number, true);
});

test('bounded projections share the admitted deterministic clock', () => {
  assert.equal(boundary.alignment.bounded_projections_share_clock, true);
  assert.equal(boundary.admitted_build_clock.timestamp, clock.timestamp);
  assert.equal(graph.generated, clock.timestamp);
  assert.equal(boundary.alignment.projection_clocks_aligned, true);
  assert.equal(boundary.admitted_build_clock.not_evidence_date, true);
  assert.equal(boundary.interpretation_contract.projection_generated_is_not_source_freshness, true);
  assert.equal(boundary.interpretation_contract.source_dates_live_in_receipts, true);
});

test('research corpus cutoff stays explicit even when projection clocks align', () => {
  assert.equal(boundary.alignment.mixed_projection_boundaries, false);
  assert.equal(boundary.alignment.research_projection_generated, graph.generated);
  assert.equal(boundary.alignment.bounded_projection_generated, surfaces.generated);
  assert.equal(boundary.alignment.research_corpus_as_of, graph.corpus_as_of);
  assert.notEqual(graph.corpus_as_of, graph.generated);
  assert.equal(boundary.interpretation_contract.research_corpus_as_of_is_distinct_from_projection_clock, true);
});

test('boundary builder is byte deterministic', () => {
  const before = fs.readFileSync('build/public-data-boundary.json');
  const run = spawnSync(process.execPath, ['tools/build-public-data-boundary.mjs'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const after = fs.readFileSync('build/public-data-boundary.json');
  assert.deepEqual(after, before);
});
