#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const readJsonl = relative => fs.readFileSync(path.join(root, relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));

const registry = readJson('data/project/lake-basin-registry.json');
const index = readJson('build/lake-index/basins.json');
const membership = readJsonl('build/lake-index/basin-membership.jsonl');
const gaps = readJsonl('build/lake-index/basin-gaps.jsonl');
const basinById = new Map(index.basins.map(basin => [basin.basin_id, basin]));

assert.equal(index.completion.current_tree_semantic_index_complete, false);
assert.equal(index.completion.historical_git_objects_indexed, false);
assert.equal(index.completion.open_pull_request_shadow_merged, false);
assert.equal(index.completion.independent_semantic_review_complete, false);
assert.equal(registry.boundaries.complete_current_tree_assignment_is_complete_lake_knowledge, false);
assert.equal(registry.boundaries.generated_projection_is_independent_evidence, false);

for (const required of [
  'canonical-ledgers',
  'research-records',
  'research-tracks',
  'intake-custody',
  'case-sources',
  'receipt-artifacts',
  'core-thesis-build-products',
  'core-thesis-report-products',
  'estate-game-trail-products',
  'milestone-governance',
]) assert.ok(basinById.has(required), `missing required basin ${required}`);

const intakeRows = membership.filter(row => row.basin_id === 'intake-custody');
assert.ok(intakeRows.length > 0, 'expected intake custody rows');
assert.ok(intakeRows.every(row => row.semantic_role === 'intake_only'));
assert.ok(intakeRows.every(row => row.publication_disposition === 'blocked'));

const generated = ['core-thesis-build-products', 'case-build-products', 'estate-game-trail-products'];
for (const id of generated) {
  const basin = basinById.get(id);
  assert.ok(basin.source_basin_ids.length > 0, `${id} must link to source basins`);
  assert.notEqual(basin.semantic_role, 'research_source');
}

const coreBuild = basinById.get('core-thesis-build-products');
const coreReports = basinById.get('core-thesis-report-products');
assert.ok(coreBuild.counts.files > 0, 'core-thesis build basin should be populated');
assert.ok(coreReports.counts.files > 0, 'core-thesis report basin should be populated');
assert.ok(coreBuild.counts.previously_unowned > 0 || coreReports.counts.previously_unowned > 0,
  'basin pass should expose previously unowned core-thesis material');

assert.ok(index.counts.evidence_files_previously_unowned > 0, 'the lake must preserve previously unowned evidence count');
assert.ok(index.counts.exact_orphan_evidence_files > 0, 'the lake must preserve exact orphan evidence count');
assert.ok(gaps.some(gap => gap.gap_type === 'missing_authoritative_entrypoint'));
assert.ok(gaps.some(gap => gap.gap_type === 'source_record_without_authoritative_reachability'));

const byPath = new Map(membership.map(row => [row.path, row]));
for (const row of membership) assert.equal(byPath.get(row.path), row, `duplicate path membership ${row.path}`);
for (const row of membership.filter(row => row.evidence_bearing && row.basin_id !== registry.default_basin.basin_id)) {
  assert.ok(row.owner_program_id, `${row.path}: classified evidence needs an accountable owner program`);
}

console.log(`lake-basin-index.test: OK (${membership.length} memberships, ${gaps.length} gaps)`);
