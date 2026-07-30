#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateK0 } from '../tools/validate-k0-epistemic-admissibility.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};
run(['tools/build-k0-epistemic-admissibility.mjs']);
const baseline = validateK0({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const seeds = JSON.parse(fs.readFileSync(path.join(root, 'data/intake/k0-ceiling-conversion-seed-events.json'), 'utf8'));
const wiring = JSON.parse(fs.readFileSync(path.join(root, 'data/project/k0-existing-ecosystem-wiring.json'), 'utf8'));
const sourceAudit = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-source-custody-audit.json'), 'utf8'));
const fieldAudit = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-field-audit.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-test-'));
const write = (name, value) => { const file = path.join(tmp, name); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); return file; };
const rel = file => path.relative(root, file).replaceAll('\\', '/');

const graphLeak = structuredClone(seeds);
graphLeak.events[0].graph_effect = 'create_hop';
let result = validateK0({ root, seedPath: rel(write('graph-leak.json', graphLeak)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('graph boundary')));

const truthLaunder = structuredClone(seeds);
truthLaunder.events[0].evidence_truth_determined = true;
result = validateK0({ root, seedPath: rel(write('truth-launder.json', truthLaunder)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('evidence truth laundering')));

const ccdSkip = structuredClone(seeds);
ccdSkip.events.find(row => row.event_id === 'K0-SEED-013').ccd_depth = 7;
ccdSkip.events.find(row => row.event_id === 'K0-SEED-013').ccd_chain_depth = 7;
result = validateK0({ root, seedPath: rel(write('ccd-skip.json', ccdSkip)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('CCD chain mismatch')));

const missingSubstitute = structuredClone(sourceAudit);
missingSubstitute.rows.find(row => row.source_id === 'K0-SRC-002').substitute_sources = [];
result = validateK0({ root, sourceAuditPath: rel(write('missing-substitute.json', missingSubstitute)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('restricted source lacks substitute')));

const fieldPromotion = structuredClone(fieldAudit);
fieldPromotion.disposition_counts.supported_for_human_review = 13;
result = validateK0({ root, fieldAuditPath: rel(write('field-promotion.json', fieldPromotion)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('field disposition count drift')));

const network = structuredClone(wiring);
network.justified_common_purpose_network_edges_among_top_ten = 1;
result = validateK0({ root, wiringPath: rel(write('network.json', network)) });
assert.equal(result.ok, false); assert.ok(result.failures.some(row => row.includes('pairwise/network boundary')));

const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/core-thesis/answerable-power/k0.json'), 'utf8'));
assert.equal(report.counts.top_ten_people, 10);
assert.equal(report.counts.normalized_seed_events, 13);
assert.equal(report.counts.field_audit_supported_for_human_review, 6);
assert.equal(report.counts.field_audit_retained_candidate_only, 7);
assert.equal(report.counts.common_purpose_network_edges, 0);
assert.equal(report.counts.role_neutral_retained_records, 66);
assert.equal(report.counts.role_neutral_wave_06_candidate_records, 3);
assert.equal(report.counts.role_neutral_wave_06_field_records_reviewed, 8);
assert.equal(report.counts.role_neutral_wave_06_field_supported_for_human_review, 2);
assert.equal(report.counts.role_neutral_wave_06_field_retained_candidate_only, 1);
assert.equal(report.current_result.role_neutral_wave_06_field_adjudication_complete, true);
assert.equal(report.counts.role_neutral_wave_07_query_executions, 16);
assert.equal(report.counts.role_neutral_wave_07_retained_records, 9);
assert.equal(report.counts.role_neutral_wave_07_candidate_records, 3);
assert.equal(report.current_result.role_neutral_wave_07_discovery_complete, true);
assert.equal(report.counts.role_neutral_wave_07_field_records_reviewed, 9);
assert.equal(report.counts.role_neutral_wave_07_field_supported_for_human_review, 0);
assert.equal(report.counts.role_neutral_wave_07_field_bounded_non_link, 2);
assert.equal(report.counts.role_neutral_wave_07_field_retained_candidate_only, 1);
assert.equal(report.current_result.role_neutral_wave_07_field_adjudication_complete, true);
assert.equal(report.current_result.maintainer_source_retrieval_audit_complete, true);
assert.equal(report.current_result.independent_second_party_review_complete, false);
assert.equal(report.current_result.graph_effect, 'none');
assert.equal(report.counts.role_neutral_wave_08_retained_records, 9);
assert.equal(report.counts.role_neutral_wave_08_candidate_records, 4);
assert.equal(report.current_result.role_neutral_wave_08_discovery_complete, true);
assert.equal(report.current_result.role_neutral_wave_08_field_adjudication_complete, false);
assert.equal(report.current_result.role_neutral_universe_executed, true);
console.log('k0-epistemic-admissibility.test: OK');
