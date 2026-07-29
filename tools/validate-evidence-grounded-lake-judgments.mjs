#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const snapshot = read('data/project/lake-judgment-shadow-snapshot.json');
const ledger = read('build/evidence-grounded-judgments.json');
const failures = [];
const fail = message => failures.push(message);

if (snapshot.schema_version !== 'lake-judgment-shadow-snapshot@1') fail('lake judgment snapshot schema drift');
if (snapshot.boundaries?.snapshot_is_merged_lake_index !== false || snapshot.boundaries?.source_truth_determined !== false) fail('lake shadow boundary drift');
if ((snapshot.decisions_supported_by_snapshot ?? []).length !== 6) fail('lake decision denominator drift');

const lake = (ledger.decisions ?? []).filter(row => row.domain === 'lake_basin' && row.evidence_basis?.snapshot_id === snapshot.snapshot_id);
if (lake.length !== 6) fail(`expected 6 lake judgments, got ${lake.length}`);
if (ledger.summary?.lake_layer_present !== true || ledger.summary?.lake_shadow_snapshot_present !== true || ledger.summary?.lake_operational_decisions !== 6) fail('lake summary state drift');
if (ledger.summary?.decisions_requiring_human_permission !== 0) fail('lake judgment introduced a human-permission gate');
for (const row of lake) {
  if (row.judgment_level !== 'J4') fail(`${row.subject_id}: lake repair is not an operational decision`);
  if (row.review_dependency?.required_to_decide !== false) fail(`${row.subject_id}: human permission gate remains`);
  if (row.graph_effect !== 'none' || row.publication_effect !== 'none_internal_repair_priority') fail(`${row.subject_id}: lake boundary drift`);
  if (!row.action || /wait/i.test(row.action)) fail(`${row.subject_id}: lake action is missing or waits`);
}

const expectedSubjects = new Set(snapshot.decisions_supported_by_snapshot.map(row => row.subject_id));
for (const subject of expectedSubjects) if (!lake.some(row => row.subject_id === subject)) fail(`missing lake judgment ${subject}`);
const report = fs.readFileSync(path.join(root, 'reports/evidence-grounded-lake-decisions.md'), 'utf8');
if (!report.includes('It is enough evidence to make a reversible operating decision.')) fail('lake report refuses to decide');
if (!report.includes('Assign semantic program ownership and authoritative entrypoints.')) fail('lake operating order missing');

if (failures.length) {
  console.error(`evidence-grounded lake judgment validation failed with ${failures.length} error(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('evidence-grounded lake judgment validation: OK');
console.log('  operational lake decisions: 6');
console.log('  human permission gates: 0');
