#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const validation = spawnSync(process.execPath, ['tools/validate-lake-basin-execution-wave-01.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const waterline = JSON.parse(fs.readFileSync('build/lake-actions/waterline.json', 'utf8'));
const reconciliation = JSON.parse(fs.readFileSync('build/lake-actions/post-execution-reconciliation.json', 'utf8'));
const cases = JSON.parse(fs.readFileSync('build/lake-actions/case-catalog-dispositions.json', 'utf8'));
const branches = JSON.parse(fs.readFileSync('build/lake-actions/branch-shadow-dispositions.json', 'utf8'));
const idQueue = JSON.parse(fs.readFileSync('build/lake-actions/identifier-repair-queue.json', 'utf8'));
const core = JSON.parse(fs.readFileSync('build/core-thesis/index.json', 'utf8'));
const paths = fs.readFileSync('build/lake-actions/unclassified-path-dispositions.jsonl', 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));

assert.equal(waterline.counts.decisions_requiring_human_permission, 0);
assert.equal(waterline.completion.wave_01_decisions_complete, true);
assert.equal(waterline.completion.all_current_unclassified_paths_have_dispositions, true);
assert.equal(waterline.completion.all_current_case_ids_have_dispositions, true);
assert.equal(waterline.completion.all_current_open_prs_have_dispositions, true);
assert.equal(waterline.completion.identifier_repairs_completed, false);
assert.equal(reconciliation.completion.decisions_requiring_human_permission, 0);
assert.equal(reconciliation.completion.core_thesis_entrypoint_closed, true);
assert.equal(reconciliation.after.core_thesis_missing_entrypoints, 0);
assert.equal(reconciliation.completion.semantic_lake_complete, false);
assert.ok(core.products.length > 100, 'core-thesis index should cover the existing product lake');
assert.equal(paths.length, waterline.counts.current_unclassified_paths);
assert.equal(cases.cases.length, waterline.counts.case_ids_classified);
assert.equal(branches.pull_requests.length, waterline.counts.open_prs_dispositioned);
assert.equal(idQueue.groups.reduce((sum, row) => sum + row.row_count, 0), idQueue.counts.gap_rows);
assert.ok(paths.every(row => row.review_dependency.required_to_decide === false));
assert.ok(cases.cases.every(row => row.review_dependency.required_to_decide === false));
assert.ok(branches.pull_requests.every(row => row.review_dependency.required_to_decide === false));
assert.ok(idQueue.groups.every(row => row.review_dependency.required_to_decide === false));

console.log('lake basin execution Wave 01 test: OK');
console.log(`  core products: ${core.products.length}`);
console.log(`  path decisions: ${paths.length}`);
console.log(`  identifier groups: ${idQueue.groups.length}`);
console.log(`  case decisions: ${cases.cases.length}`);
console.log(`  PR decisions: ${branches.pull_requests.length}`);
console.log(`  final unclassified paths: ${reconciliation.after.unclassified_paths}`);
