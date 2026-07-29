#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const validation = spawnSync(process.execPath, ['tools/validate-lake-index.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const index = JSON.parse(fs.readFileSync('build/lake-index.json', 'utf8'));
const gaps = JSON.parse(fs.readFileSync('build/lake-index-gaps.json', 'utf8'));
const objects = JSON.parse(fs.readFileSync('build/lake-object-index.json', 'utf8'));

assert.equal(index.summary.boundaries.current_tracked_path_census_complete, true);
assert.equal(index.summary.boundaries.current_tree_semantic_index_complete, false);
assert.equal(index.summary.boundaries.historical_git_object_index_complete, false);
assert.equal(index.summary.boundaries.source_truth_determined, false);
assert.equal(index.summary.boundaries.publication_cleared, false);
assert.equal(index.summary.boundaries.common_purpose_conclusion_generated, false);
assert.ok(index.summary.counts.tracked_files_indexed > 0);
assert.ok(index.summary.counts.evidence_bearing_files > 0);
assert.equal(index.summary.counts.distinct_machine_ids, objects.objects.length);
assert.equal(index.summary.counts.exact_orphan_evidence_files, gaps.exact_orphan_evidence_paths.length);
assert.ok(!index.files.some(file => file.path.startsWith('.github/tmp/')));
assert.ok(!index.files.some(file => file.path === 'build/lake-index.json'));
assert.ok(!index.files.some(file => file.path === 'build/lake-object-index.json'));
assert.ok(!index.files.some(file => file.path === 'build/lake-index-gaps.json'));

console.log('lake index test: OK');
