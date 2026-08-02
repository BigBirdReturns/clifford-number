#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRepository } from '../tools/validate-lake-allocator-war-public-acquisition-wave-36.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'law36-adversarial-'));
const baselineRoot = path.join(scratch, 'baseline');
const workRoot = path.join(scratch, 'work');
const readJson = (root, relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const writeJson = (root, relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};
const readJsonl = (root, relative) => fs.readFileSync(path.join(root, relative), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const writeJsonl = (root, relative, rows) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${rows.map(row => JSON.stringify(row)).join('\n')}\n`);
};
const copyRelative = relative => {
  const source = path.join(repoRoot, relative);
  const target = path.join(baselineRoot, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
};

for (const relative of [
  'data/project/lake-allocator-war-public-acquisition-wave-36-policy.json',
  'data/project/lake-allocator-war-public-acquisition-wave-36-plan.json',
  'data/project/lake-allocator-war-join-requirements-wave-35-policy.json',
  'data/project/lake-index-policy.json',
  'data/project/lake-basin-registry.json',
  'data/acquisition/lake-allocator-war-wave-35',
  'data/acquisition/lake-allocator-war-wave-36',
  'build/lake-actions/allocator-war-join-requirements-wave-35.json',
  'build/lake-actions/allocator-war-public-acquisition-wave-36.json',
  'reports/lake-allocator-war-public-acquisition-wave-36.md',
  'docs/methods/lake-allocator-war-public-acquisition-wave-36.md',
  'docs/milestones/lake-allocator-war-public-acquisition-wave-36.md',
  'package.json'
]) copyRelative(relative);

const reset = () => {
  fs.rmSync(workRoot, { recursive: true, force: true });
  fs.cpSync(baselineRoot, workRoot, { recursive: true });
};
reset();
validateRepository(workRoot);

const POLICY = 'data/project/lake-allocator-war-public-acquisition-wave-36-policy.json';
const PLAN = 'data/project/lake-allocator-war-public-acquisition-wave-36-plan.json';
const CAPTURES = 'data/acquisition/lake-allocator-war-wave-36/capture-ledger.jsonl';
const RECORDS = 'data/acquisition/lake-allocator-war-wave-36/institutional-record-ledger.jsonl';
const PROJECTION = 'build/lake-actions/allocator-war-public-acquisition-wave-36.json';
const LAKE = 'data/project/lake-index-policy.json';
const BASIN = 'data/project/lake-basin-registry.json';
const PACKAGE = 'package.json';
const REPORT = 'reports/lake-allocator-war-public-acquisition-wave-36.md';
const ROUTE = 'data/acquisition/lake-allocator-war-wave-36/routes/internal-authority-and-inventory.jsonl';
const PROTECTED_ROUTE = 'data/acquisition/lake-allocator-war-wave-36/routes/protected-personnel-records.jsonl';
const firstSnapshot = readJson(baselineRoot, PLAN).source_specs[0].storage_path;

const mutations = [];
const add = (name, mutate) => mutations.push({ name, mutate });
const mutateJson = (relative, change) => add(relative + ' ' + mutations.length, root => {
  const value = readJson(root, relative); change(value); writeJson(root, relative, value);
});
const mutateJsonl = (relative, change) => add(relative + ' ' + mutations.length, root => {
  const rows = readJsonl(root, relative); change(rows); writeJsonl(root, relative, rows);
});

// Policy and source-denominator mutations.
mutateJson(POLICY, v => { v.schema_version = 'bad'; });
mutateJson(POLICY, v => { v.program_ref = 'BAD'; });
mutateJson(POLICY, v => { v.wave_ref = 'BAD'; });
mutateJson(POLICY, v => { v.base_checkpoint.commit = '0'.repeat(40); });
mutateJson(POLICY, v => { v.source_contract.required_policy_schema = 'bad'; });
mutateJson(POLICY, v => { v.source_contract.required_projection_schema = 'bad'; });
mutateJson(POLICY, v => { v.expected_counts.source_specs = 49; });
mutateJson(POLICY, v => { v.expected_counts.transparent_text_relay_sources = 2; });
mutateJson(POLICY, v => { v.expected_counts.task_results = 30; });
mutateJson(POLICY, v => { v.expected_counts.route_summaries = 6; });
mutateJson(POLICY, v => { v.expected_counts.execution_ready_tasks = 27; });
mutateJson(POLICY, v => { v.expected_counts.protected_tasks = 2; });
mutateJson(POLICY, v => { v.expected_counts.requirements_satisfied = 1; });
mutateJson(POLICY, v => { v.boundaries.capture_is_evidence = true; });
mutateJson(POLICY, v => { v.boundaries.official_record_component_satisfies_requirement = true; });
mutateJson(POLICY, v => { v.boundaries.public_record_authorizes_protected_access = true; });
mutateJson(POLICY, v => { v.boundaries.announced_amount_is_realized_payment = true; });
mutateJson(POLICY, v => { v.boundaries.docket_presence_is_practical_correction = true; });
mutateJson(POLICY, v => { v.boundaries.graph_effect = 'created'; });
mutateJson('data/project/lake-allocator-war-join-requirements-wave-35-policy.json', v => { v.schema_version = 'bad'; });
mutateJson('build/lake-actions/allocator-war-join-requirements-wave-35.json', v => { v.schema_version = 'bad'; });

// Plan identity, request, and task-map mutations.
mutateJson(PLAN, v => { v.schema_version = 'bad'; });
mutateJson(PLAN, v => { v.source_specs.pop(); });
mutateJson(PLAN, v => { v.task_plans.pop(); });
mutateJson(PLAN, v => { v.source_specs[1].source_ref = v.source_specs[0].source_ref; });
mutateJson(PLAN, v => { v.source_specs[1].capture_ref = v.source_specs[0].capture_ref; });
mutateJson(PLAN, v => { v.source_specs[1].capture_sequence = v.source_specs[0].capture_sequence; });
mutateJson(PLAN, v => { v.source_specs[0].capture_sequence = 99; });
mutateJson(PLAN, v => { v.source_specs[0].capture_ref = 'LAW36-C999'; });
mutateJson(PLAN, v => { v.source_specs[0].request.url = 'http://example.test'; });
mutateJson(PLAN, v => { v.source_specs[0].request.method = 'DELETE'; });
mutateJson(PLAN, v => { v.source_specs[0].required_success = !v.source_specs[0].required_success; });
mutateJson(PLAN, v => { v.required_success_source_refs.pop(); });
mutateJson(PLAN, v => { v.task_plans[1].task_ref = v.task_plans[0].task_ref; });
mutateJson(PLAN, v => { v.task_plans[0].task_sequence = 99; });
mutateJson(PLAN, v => { v.task_plans[0].protected_lawful_access_only = true; });
mutateJson(PLAN, v => { v.task_plans[0].source_refs = []; });
mutateJson(PLAN, v => { v.task_plans[0].source_refs.push('UNKNOWN-SOURCE'); });
mutateJson(PLAN, v => { v.task_plans[0].completion_gap = ''; });
mutateJson(PLAN, v => { v.task_plans[0].result_ceiling = 'satisfied'; });
mutateJson(PLAN, v => { const p=v.task_plans.find(x=>x.protected_lawful_access_only); p.source_refs=['LAW24-S005']; });
mutateJson(PLAN, v => { v.counts.source_specs = 49; });
mutateJson(PLAN, v => { v.counts.transparent_text_relay_sources = 2; });
mutateJson(PLAN, v => { v.counts.task_plans = 30; });
mutateJson(PLAN, v => { v.counts.execution_ready_tasks = 27; });
mutateJson(PLAN, v => { v.counts.protected_tasks = 2; });
mutateJson(PLAN, v => { v.counts.required_success_sources = 21; });
mutateJson(PLAN, v => { v.request_defaults.user_agent = 'wrong'; });
mutateJson(PLAN, v => { v.source_specs[0].storage_path = v.source_specs[1].storage_path; });
mutateJson(PLAN, v => { v.source_specs[0].request.body = { drift: true }; });
mutateJson(PLAN, v => { v.source_specs[0].represented_value.status = 'realized payment'; });
mutateJson(PLAN, v => { v.boundaries.capture_is_evidence = true; });
mutateJson(PLAN, v => { const r=v.source_specs.find(x=>x.transport_mode==='transparent_text_relay_of_official_pdf'); r.transport_mode='direct_official_http'; });
mutateJson(PLAN, v => { const r=v.source_specs.find(x=>x.transport_mode==='transparent_text_relay_of_official_pdf'); r.request.url=r.official_origin_url; });
mutateJson(PLAN, v => { const r=v.source_specs.find(x=>x.transport_mode==='transparent_text_relay_of_official_pdf'); r.source_locator=r.request.url; });

// Capture custody and authority mutations.
mutateJsonl(CAPTURES, rows => { rows.pop(); });
mutateJsonl(CAPTURES, rows => { rows[1].source_ref = rows[0].source_ref; });
mutateJsonl(CAPTURES, rows => { rows[1].capture_ref = rows[0].capture_ref; });
mutateJsonl(CAPTURES, rows => { rows[0].capture_ref = 'LAW36-C999'; });
mutateJsonl(CAPTURES, rows => { rows[0].capture_sequence = 99; });
mutateJsonl(CAPTURES, rows => { rows[0].request.method = 'POST'; });
mutateJsonl(CAPTURES, rows => { rows[0].request.url += '?drift=1'; });
mutateJsonl(CAPTURES, rows => { rows[0].request.fingerprint_sha256 = '0'.repeat(64); });
mutateJsonl(CAPTURES, rows => { rows[0].required_success = !rows[0].required_success; });
mutateJsonl(CAPTURES, rows => { rows[0].response_body_bytes += 1; });
mutateJsonl(CAPTURES, rows => { rows[0].response_body_sha256 = '0'.repeat(64); });
mutateJsonl(CAPTURES, rows => { rows[0].response_body_path = null; });
mutateJsonl(CAPTURES, rows => { rows[0].response_ok = false; });
mutateJsonl(CAPTURES, rows => { rows[0].marker_audit.passed = false; });
mutateJsonl(CAPTURES, rows => { rows[0].capture_state = 'captured_marker_mismatch'; });
mutateJsonl(CAPTURES, rows => { rows[0].requirement_satisfied = true; });
mutateJsonl(CAPTURES, rows => { rows[0].authorized_join = true; });
mutateJsonl(CAPTURES, rows => { rows[0].complete_denominator = true; });
mutateJsonl(CAPTURES, rows => { rows[0].evidence_adjudicated = true; });
mutateJsonl(CAPTURES, rows => { rows[0].graph_effect = 'created'; });
mutateJsonl(CAPTURES, rows => { rows[0].publication_status = 'cleared'; });
mutateJsonl(CAPTURES, rows => { const r=rows.find(x=>x.transport_mode==='transparent_text_relay_of_official_pdf'); r.transport_mode='direct_official_http'; });
mutateJsonl(CAPTURES, rows => { const r=rows.find(x=>x.transport_mode==='transparent_text_relay_of_official_pdf'); r.official_origin_url='https://example.invalid'; });
mutateJsonl(CAPTURES, rows => { const r=rows.find(x=>x.transport_mode==='transparent_text_relay_of_official_pdf'); r.capture_authority='frozen_official_source_response_acquisition_only'; });
add('snapshot byte drift', root => { fs.appendFileSync(path.join(root, firstSnapshot), 'x'); });
add('snapshot missing', root => { fs.rmSync(path.join(root, firstSnapshot)); });
mutateJsonl(CAPTURES, rows => { rows[0].response_body_path = 'data/acquisition/lake-allocator-war-wave-36/snapshots/missing.html'; });
mutateJsonl(CAPTURES, rows => { rows[0].response_body_path = null; rows[0].response_body_sha256 = '0'.repeat(64); });

// Institutional-record mutations.
mutateJsonl(RECORDS, rows => { rows.pop(); });
mutateJsonl(RECORDS, rows => { rows[1].record_ref = rows[0].record_ref; });
mutateJsonl(RECORDS, rows => { rows[1].source_ref = rows[0].source_ref; });
mutateJsonl(RECORDS, rows => { rows[0].record_sequence = 99; });
mutateJsonl(RECORDS, rows => { rows[0].record_ref = 'LAW36-R999'; });
mutateJsonl(RECORDS, rows => { rows[0].response_body_sha256 = '0'.repeat(64); });
mutateJsonl(RECORDS, rows => { rows[0].response_body_path = 'wrong'; });
mutateJsonl(RECORDS, rows => { rows[0].task_refs.pop(); });
mutateJsonl(RECORDS, rows => { rows[0].requirement_satisfied = true; });
mutateJsonl(RECORDS, rows => { rows[0].authorized_join = true; });
mutateJsonl(RECORDS, rows => { rows[0].joined_rows = 1; });
mutateJsonl(RECORDS, rows => { rows[0].complete_denominator = true; });
mutateJsonl(RECORDS, rows => { rows[0].evidence_adjudicated = true; });
mutateJsonl(RECORDS, rows => { rows[0].finding_promoted = true; });
mutateJsonl(RECORDS, rows => { rows[0].graph_effect = 'created'; });
mutateJsonl(RECORDS, rows => { rows[0].publication_status = 'cleared'; });
mutateJsonl(RECORDS, rows => { const r=rows.find(x=>x.transport_mode==='transparent_text_relay_of_official_pdf'); r.transport_mode='direct_official_http'; });
mutateJsonl(RECORDS, rows => { const r=rows.find(x=>x.transport_mode==='transparent_text_relay_of_official_pdf'); r.component_authority='official_record_component_acquisition_only'; });

// Route summary and task-result mutations.
mutateJsonl(ROUTE, rows => { rows.shift(); });
mutateJsonl(ROUTE, rows => { rows.pop(); });
mutateJsonl(ROUTE, rows => { rows[0].route_sequence = 99; });
mutateJsonl(ROUTE, rows => { rows[0].route_class = 'wrong'; });
mutateJsonl(ROUTE, rows => { rows[0].task_count -= 1; });
mutateJsonl(ROUTE, rows => { rows[0].executed_tasks -= 1; });
mutateJsonl(ROUTE, rows => { rows[0].result_states = {}; });
mutateJsonl(ROUTE, rows => { rows[0].requirements_satisfied = 1; });
mutateJsonl(ROUTE, rows => { rows[0].authorized_joins = 1; });
mutateJsonl(ROUTE, rows => { rows[0].complete_denominators = 1; });
mutateJsonl(ROUTE, rows => { rows[0].evidence_rows = 1; });
mutateJsonl(ROUTE, rows => { rows[0].finding_promotions = 1; });
mutateJsonl(ROUTE, rows => { rows[0].graph_effects = 1; });
mutateJsonl(ROUTE, rows => { rows[0].publication_clearances = 1; });
mutateJsonl(ROUTE, rows => { rows[1].source_task_ref = 'LAW35-T999'; });
mutateJsonl(ROUTE, rows => { rows[1].result_sequence = 99; });
mutateJsonl(ROUTE, rows => { rows[1].route_class = 'wrong'; });
mutateJsonl(ROUTE, rows => { rows[1].source_refs.pop(); });
mutateJsonl(ROUTE, rows => { rows[1].public_record_refs.pop(); });
mutateJsonl(ROUTE, rows => { rows[1].public_record_component_count -= 1; });
mutateJsonl(ROUTE, rows => { rows[1].network_requests_performed -= 1; });
mutateJsonl(ROUTE, rows => { rows[1].result_state = 'complete'; });
mutateJsonl(ROUTE, rows => { rows[1].completion_gap = 'wrong'; });
mutateJsonl(ROUTE, rows => { rows[1].refused_substitution = 'wrong'; });
mutateJsonl(ROUTE, rows => { rows[1].requirement_satisfied = true; });
mutateJsonl(ROUTE, rows => { rows[1].task_execution_authorizes_join = true; });
mutateJsonl(ROUTE, rows => { rows[1].join_authorized = true; });
mutateJsonl(ROUTE, rows => { rows[1].joined_rows = 1; });
mutateJsonl(ROUTE, rows => { rows[1].complete_denominator = true; });
mutateJsonl(ROUTE, rows => { rows[1].evidence_adjudicated = true; });
mutateJsonl(ROUTE, rows => { rows[1].evidence_rows = 1; });
mutateJsonl(ROUTE, rows => { rows[1].finding_promoted = true; });
mutateJsonl(ROUTE, rows => { rows[1].graph_effect = 'created'; });
mutateJsonl(ROUTE, rows => { rows[1].publication_status = 'cleared'; });
mutateJsonl(PROTECTED_ROUTE, rows => { rows[1].executed_in_wave = true; });
mutateJsonl(PROTECTED_ROUTE, rows => { rows[1].network_requests_performed = 1; });
mutateJsonl(PROTECTED_ROUTE, rows => { rows[1].result_state = 'source_backed_component_recovery'; });

// Projection, lake integration, report, and temporary transport mutations.
mutateJson(PROJECTION, v => { v.schema_version = 'bad'; });
mutateJson(PROJECTION, v => { v.counts.source_specs = 49; });
mutateJson(PROJECTION, v => { v.counts.transparent_text_relay_sources = 2; });
mutateJson(PROJECTION, v => { v.authority = 'official_record_component_acquisition_only'; });
mutateJson(PROJECTION, v => { v.counts.captures = 49; });
mutateJson(PROJECTION, v => { v.counts.usable_official_records = 49; });
mutateJson(PROJECTION, v => { v.counts.route_summaries = 6; });
mutateJson(PROJECTION, v => { v.counts.task_results = 30; });
mutateJson(PROJECTION, v => { v.counts.executed_public_or_lawful_tasks = 27; });
mutateJson(PROJECTION, v => { v.counts.protected_tasks = 2; });
mutateJson(PROJECTION, v => { v.counts.requirements_satisfied = 1; });
mutateJson(PROJECTION, v => { v.counts.authorized_joins = 1; });
mutateJson(PROJECTION, v => { v.counts.complete_denominators = 1; });
mutateJson(PROJECTION, v => { v.counts.evidence_rows = 1; });
mutateJson(PROJECTION, v => { v.counts.finding_promotions = 1; });
mutateJson(PROJECTION, v => { v.graph_effect = 'created'; });
mutateJson(PROJECTION, v => { v.publication_status = 'cleared'; });
mutateJson(LAKE, v => { v.authoritative_roots = v.authoritative_roots.filter(x => x !== POLICY); });
mutateJson(LAKE, v => { v.boundaries.allocator_war_wave_36_official_record_component_is_requirement = true; });
mutateJson(BASIN, v => { v.boundaries.allocator_war_wave_36_capture_authorizes_join = true; });
mutateJson(PACKAGE, v => { delete v.scripts['acquire:lake-allocator-war-public-acquisition-wave-36']; });
mutateJson(PACKAGE, v => { delete v.scripts['build:lake-allocator-war-public-acquisition-wave-36']; });
mutateJson(PACKAGE, v => { delete v.scripts['validate:lake-allocator-war-public-acquisition-wave-36']; });
mutateJson(PACKAGE, v => { delete v.scripts['ci:lake-allocator-war-public-acquisition-wave-36']; });
mutateJson(PACKAGE, v => { v.scripts.check = v.scripts.check.replace(' && npm run validate:lake-allocator-war-public-acquisition-wave-36', ''); });
add('report zero waterline removed', root => { fs.writeFileSync(path.join(root, REPORT), '# drift\n'); });
add('temporary trigger survives', root => { const f=path.join(root,'.github/tmp/wave36-materialize-trigger.json'); fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,'{}\n'); });
add('temporary workflow survives', root => { const f=path.join(root,'.github/workflows/temporary-wave36-materializer.yml'); fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,'name: temp\n'); });
add('temporary runner survives', root => { const f=path.join(root,'tools/run-wave36-materializer.sh'); fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,'#!/bin/sh\n'); });

assert.ok(mutations.length >= 125, `expected at least 125 adversarial mutations, observed ${mutations.length}`);
const failures = [];
for (const { name, mutate } of mutations) {
  reset();
  mutate(workRoot);
  try {
    validateRepository(workRoot);
    failures.push(name);
  } catch {
    // Expected fail-closed behavior.
  }
}
fs.rmSync(scratch, { recursive: true, force: true });
assert.deepEqual(failures, [], `validator accepted mutations:\n${failures.join('\n')}`);
console.log(`allocator-war official-record public acquisition Wave 36 adversarial mutations passed: ${mutations.length}`);
