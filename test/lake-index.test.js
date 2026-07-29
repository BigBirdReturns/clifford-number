#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function run(script) {
  const validation = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  if (validation.status !== 0) {
    process.stderr.write(validation.stdout || '');
    process.stderr.write(validation.stderr || '');
    process.exit(validation.status ?? 1);
  }
}

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

if (fs.existsSync('build/lake-index.json')) {
  run('tools/validate-lake-index.mjs');
  const index = JSON.parse(fs.readFileSync('build/lake-index.json', 'utf8'));
  const gaps = JSON.parse(fs.readFileSync('build/lake-index-gaps.json', 'utf8'));
  const objects = JSON.parse(fs.readFileSync('build/lake-object-index.json', 'utf8'));
  assert.equal(index.summary.boundaries.current_tracked_path_census_complete, true);
  assert.equal(index.summary.boundaries.current_tree_semantic_index_complete, false);
  assert.equal(index.summary.boundaries.historical_git_object_index_complete, false);
  assert.equal(index.summary.boundaries.source_truth_determined, false);
  assert.equal(index.summary.boundaries.publication_cleared, false);
  assert.equal(index.summary.boundaries.common_purpose_conclusion_generated, false);
  assert.equal(index.summary.boundaries.bare_local_identifier_globally_joined, false);
  assert.equal(index.summary.boundaries.projection_divergence_includes_source_shape_difference, false);
  assert.ok(index.summary.counts.tracked_files_indexed > 0);
  assert.ok(index.summary.counts.evidence_bearing_files > 0);
  assert.ok(index.summary.counts.local_identifier_values_observed > 0);
  assert.ok(index.summary.counts.local_identifier_occurrences_observed >= index.summary.counts.local_identifier_values_observed);
  assert.equal(index.summary.counts.distinct_machine_ids, objects.objects.length);
  assert.equal(index.summary.counts.exact_orphan_evidence_files, gaps.exact_orphan_evidence_paths.length);
  assert.equal(objects.identifier_semantics.schema_version, 'lake-identifier-semantics@1');
  assert.equal(objects.identifier_semantics.boundaries.repeated_local_id_proves_same_object, false);
  assert.ok(objects.objects.every(object => object.id_key !== 'id'));
  assert.ok(objects.objects.every(object => object.divergent_projections === (object.distinct_projection_hashes > 1)));
  assert.ok(gaps.unindexed_machine_ids.every(object => object.id_key !== 'id'));
  assert.ok(gaps.divergent_identifier_projections.every(object => object.id_key !== 'id'));
  assert.ok(gaps.source_ids_without_projection.every(object => object.id_key !== 'id'));
  assert.ok(gaps.projection_ids_without_source.every(object => object.id_key !== 'id'));
  assert.ok(!index.files.some(file => file.path.startsWith('.github/tmp/')));
  assert.ok(!index.files.some(file => file.path === 'build/lake-index.json'));
  assert.ok(!index.files.some(file => file.path === 'build/lake-object-index.json'));
  assert.ok(!index.files.some(file => file.path === 'build/lake-index-gaps.json'));
  console.log('lake index test: OK (monolithic build state)');
} else {
  run('tools/validate-lake-index-shards.mjs');
  const summary = JSON.parse(fs.readFileSync('build/lake-index/summary.json', 'utf8'));
  const manifest = JSON.parse(fs.readFileSync('build/lake-index/manifest.json', 'utf8'));
  const files = readJsonl('build/lake-index/files.jsonl');
  const objects = readJsonl('build/lake-index/objects.jsonl');
  const pathGaps = readJsonl('build/lake-index/path-gaps.jsonl');
  const idGaps = readJsonl('build/lake-index/id-gaps.jsonl');
  assert.equal(summary.boundaries.current_tracked_path_census_complete, true);
  assert.equal(summary.boundaries.current_tree_semantic_index_complete, false);
  assert.equal(summary.boundaries.historical_git_object_index_complete, false);
  assert.equal(summary.boundaries.source_truth_determined, false);
  assert.equal(summary.boundaries.publication_cleared, false);
  assert.equal(summary.boundaries.common_purpose_conclusion_generated, false);
  assert.equal(summary.boundaries.bare_local_identifier_globally_joined, false);
  assert.equal(summary.boundaries.projection_divergence_includes_source_shape_difference, false);
  assert.ok(summary.counts.local_identifier_values_observed > 0);
  assert.ok(summary.counts.local_identifier_occurrences_observed >= summary.counts.local_identifier_values_observed);
  assert.equal(summary.counts.tracked_files_indexed, files.length);
  assert.equal(summary.counts.distinct_machine_ids, objects.length);
  assert.equal(summary.counts.exact_orphan_evidence_files, pathGaps.filter(row => row.gap_class === 'exact_orphan').length);
  assert.ok(objects.every(object => object.id_key !== 'id'));
  assert.ok(objects.every(object => object.divergent_projections === (object.distinct_projection_hashes > 1)));
  assert.ok(idGaps.every(row => row.id_key !== 'id'));
  assert.equal(manifest.boundaries.shard_manifest_proves_semantic_completeness, false);
  assert.ok(!files.some(file => file.path.startsWith('.github/tmp/')));
  assert.ok(!files.some(file => file.path.startsWith('build/lake-index/')));
  console.log('lake index test: OK (sharded release state)');
}
