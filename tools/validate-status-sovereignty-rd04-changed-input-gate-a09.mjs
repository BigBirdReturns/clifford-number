#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gitBlobSha1 } from './acquisition/status-sovereignty-rd04-a09/detect-changed-input.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = 'status-sovereignty-rd04-changed-input-gate-a09';
const reportSlug = 'rd04-changed-input-gate-a09';
const corePath = path.join(root, 'data/intake', slug, 'core.json');
const manifestPath = path.join(root, 'data/project', `${slug}-release-manifest.json`);
const custodyRoot = path.join(root, 'data/intake', slug, 'source-custody');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const rel = (target) => path.relative(root, target).replaceAll(path.sep, '/');
function assert(condition, message) { if (!condition) throw new Error(message); }
function eq(actual, expected, label) { assert(actual === expected, `${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`); }
function collectFiles(target) {
  if (!fs.existsSync(target)) return [];
  if (fs.statSync(target).isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => collectFiles(path.join(target, entry.name)));
}

export function validateA09Core(core) {
  eq(core.schema_version, 'ssc-rd04-a09-core@1', 'schema_version');
  eq(core.hypothesis_id, 'SSC-H01', 'hypothesis_id');
  eq(core.lane_id, 'SSC-RD04', 'lane_id');
  eq(core.execution_id, 'SSC-RD04-CHANGED-INPUT-GATE-A09', 'execution_id');
  eq(core.issue, 777, 'issue');
  eq(core.as_of, '2026-08-02', 'as_of');
  eq(core.status, 'complete_no_changed_input_observed_reusable_changed_input_gate_installed', 'status');
  eq(core.parent.canonical_merge, '68f4cb2aeccb129a3789b0b1b5da0f1e1c52cab6', 'parent.canonical_merge');
  eq(core.parent.execution_id, 'SSC-RD04-INTERNAL-ADJUDICATION-A08', 'parent.execution_id');
  eq(core.parent.release_sha256, '0f53625ade42bf3278429040d50a74a6a52714d28e6f8e754b11f31acb710356', 'parent.release');
  eq(core.execution_receipt.workflow_run, 30761731270, 'workflow_run');
  eq(core.execution_receipt.artifact_id, 8837670685, 'artifact_id');
  eq(core.execution_receipt.artifact_zip_sha256, '3249ef058e95652c0aff6167524b99ea5e78b582e4b6f752d37a30993fc070a4', 'artifact digest');
  eq(core.execution_receipt.pass_ref_commit, '7d8908e11dd94e6a96f25ae49dfaaa4c083a6b6a', 'pass ref');
  eq(core.execution_receipt.start_main, '30cdc27e3c90ceec06773616edc49d7338bb43c5', 'start main');
  eq(core.execution_receipt.end_main, core.execution_receipt.start_main, 'end main');
  eq(core.denominator_contract.candidate_ledger_paths.length, 2, 'candidate paths');
  eq(core.denominator_contract.expected_empty_candidate_blob_sha1, 'fe51488c7066f6687ef680d6bfaa4f7768ef205c', 'empty blob');
  eq(core.denominator_contract.frozen_public_urls.length, 1, 'frozen URLs');
  eq(core.denominator_contract.request_limit_per_cycle, 1, 'request limit');
  eq(core.denominator_contract.automatic_schedule_installed, false, 'automatic schedule');
  eq(core.denominator_contract.outside_human_dependency, false, 'outside human');
  const expectedCounts = {
    candidate_ledgers: 2, candidate_entries: 0, frozen_urls: 1, requests: 1,
    changed_candidate_inputs: 0, changed_public_sources: 0, changed_inputs_observed: 0,
    external_contacts: 0, external_reviews: 0, adjudications: 0,
    publication_clearances: 0, graph_effects: 0, adversarial_mutations: 45
  };
  for (const [key, value] of Object.entries(expectedCounts)) eq(core.counts[key], value, `counts.${key}`);
  eq(core.current_result.terminal_state, 'no_changed_input_observed', 'terminal state');
  eq(core.current_result.changed_input_observed, false, 'changed input');
  eq(core.current_result.reusable_gate_installed, true, 'gate installed');
  eq(core.current_result.automatic_schedule_installed, false, 'result schedule');
  eq(core.current_result.broader_crawl_authorized, false, 'broader crawl');
  eq(core.current_result.exact_source_adjudication_authorized, false, 'source adjudication');
  eq(core.current_result.case_specific_implementation_receipt_supported, false, 'implementation');
  eq(core.current_result.restoration_receipt_supported, false, 'restoration');
  eq(core.current_result.missing_public_material_is_noncompliance, false, 'noncompliance');
  eq(core.current_result.project_blocking, false, 'project blocking');
  eq(core.standing_gate.gate_id, 'SSC-RD04-A09-CHANGED-INPUT-GATE', 'gate id');
  eq(core.standing_gate.schedule_installed, false, 'standing schedule');
  eq(core.standing_gate.unchanged_inputs_terminate_honestly, true, 'honest terminal');
  eq(core.standing_gate.outside_human_dependency, false, 'gate outside human');
  const falseBoundaries = [
    'unchanged_zero_ledgers_are_failed_work', 'changed_page_is_case_specific_implementation',
    'http_failure_is_record_absence', 'missing_public_material_is_noncompliance',
    'change_detection_is_external_review', 'no_change_closes_the_residual_class',
    'result_proves_effective_counterpower', 'result_proves_national_prevalence',
    'result_proves_racial_hierarchy', 'result_proves_unlawful_motive',
    'result_proves_coordination', 'result_proves_common_purpose'
  ];
  for (const key of falseBoundaries) eq(core.boundaries[key], false, `boundaries.${key}`);
  eq(core.boundaries.graph_effect, 'none', 'graph effect');
  assert(Array.isArray(core.stages) && core.stages.length === 4, 'stages');
  return true;
}

export function validateA09Repository() {
  const core = readJson(corePath);
  validateA09Core(core);
  const a08Manifest = readJson(path.join(root, 'data/project/status-sovereignty-rd04-internal-adjudication-a08-release-manifest.json'));
  const a08Core = readJson(path.join(root, 'data/intake/status-sovereignty-rd04-internal-adjudication-a08/core.json'));
  eq(a08Manifest.combined_sha256, core.parent.release_sha256, 'live A08 release');
  eq(a08Core.execution_id, core.parent.execution_id, 'live A08 execution');
  eq(a08Core.current_result.terminal_state, core.parent.terminal_state, 'live A08 terminal');

  const candidate = readJson(path.join(custodyRoot, 'candidate-input-receipt.json'));
  eq(candidate.candidate_input_changed, false, 'candidate changed');
  eq(candidate.combined_candidate_denominator, 0, 'candidate denominator');
  for (const row of candidate.ledgers) {
    const body = fs.readFileSync(path.join(root, row.path));
    eq(body.length, row.bytes, `candidate bytes ${row.path}`);
    eq(sha256(body), row.sha256, `candidate digest ${row.path}`);
    eq(gitBlobSha1(body), row.git_blob_sha1, `candidate blob ${row.path}`);
    eq(row.entries, 0, `candidate entries ${row.path}`);
  }

  const cycle = readJson(path.join(custodyRoot, 'current-cycle/summary.json'));
  eq(cycle.result.terminal_state, core.current_result.terminal_state, 'cycle terminal');
  eq(cycle.result.changed_input_observed, false, 'cycle changed');
  eq(cycle.counts.requests, 1, 'cycle requests');
  eq(cycle.public_source_input.current.http_status, 500, 'cycle status');
  const responseBody = fs.readFileSync(path.join(custodyRoot, 'current-cycle/response/body.bin'));
  const responseHeaders = fs.readFileSync(path.join(custodyRoot, 'current-cycle/response/headers.txt'));
  eq(responseBody.length, cycle.public_source_input.current.body_bytes, 'response body bytes');
  eq(sha256(responseBody), cycle.public_source_input.current.body_sha256, 'response body digest');
  eq(responseHeaders.length, cycle.public_source_input.current.headers_bytes, 'response headers bytes');
  eq(sha256(responseHeaders), cycle.public_source_input.current.headers_sha256, 'response headers digest');

  const sourceLedger = readJson(path.join(custodyRoot, 'source-ledger.json'));
  eq(sourceLedger.schema_version, 'ssc-rd04-a09-source-ledger@1', 'source schema');
  eq(sourceLedger.execution_id, core.execution_id, 'source execution');
  eq(sourceLedger.counts.retained_exact_files, 9, 'retained files');
  eq(sourceLedger.counts.current_cycle_files, 8, 'cycle files');
  for (const row of sourceLedger.retained_exact_files) {
    const body = fs.readFileSync(path.join(root, row.path));
    eq(body.length, row.bytes, `custody bytes ${row.path}`);
    eq(sha256(body), row.sha256, `custody digest ${row.path}`);
  }

  const manifest = readJson(manifestPath);
  eq(manifest.schema_version, 'ssc-rd04-a09-release-manifest@1', 'manifest schema');
  eq(manifest.acquisition_id, core.execution_id, 'manifest acquisition');
  const expectedFiles = [
    path.join(root, '.github/workflows/status-sovereignty-rd04-changed-input-gate-a09.yml'),
    path.join(root, 'data/intake', slug),
    path.join(root, 'docs/milestones/ssc-rd04-changed-input-gate-a09.md'),
    path.join(root, 'reports/core-thesis/status-sovereignty', reportSlug),
    path.join(root, 'build/core-thesis/status-sovereignty', reportSlug),
    path.join(root, 'schemas/status-sovereignty-rd04-changed-input-gate-a09.schema.json'),
    path.join(root, 'test/status-sovereignty-rd04-changed-input-gate-a09.test.js'),
    path.join(root, 'tools/build-status-sovereignty-rd04-changed-input-gate-a09.mjs'),
    path.join(root, 'tools/validate-status-sovereignty-rd04-changed-input-gate-a09.mjs'),
    path.join(root, 'tools/acquisition/status-sovereignty-rd04-a09')
  ].flatMap(collectFiles).filter((target) => target !== manifestPath).map(rel).sort();
  assert(JSON.stringify(manifest.entries.map((row) => row.path)) === JSON.stringify(expectedFiles), 'manifest scope');
  for (const row of manifest.entries) {
    const body = fs.readFileSync(path.join(root, row.path));
    eq(body.length, row.bytes, `manifest bytes ${row.path}`);
    eq(sha256(body), row.sha256, `manifest digest ${row.path}`);
  }
  const combined = sha256(Buffer.from(manifest.entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
  eq(combined, manifest.combined_sha256, 'combined digest');
  const reportData = readJson(path.join(root, 'reports/core-thesis/status-sovereignty', reportSlug, 'data.json'));
  const buildData = readJson(path.join(root, 'build/core-thesis/status-sovereignty', reportSlug, 'data.json'));
  assert(JSON.stringify(reportData) === JSON.stringify(core), 'report projection');
  assert(JSON.stringify(buildData) === JSON.stringify(core), 'build projection');
  const html = fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty', reportSlug, 'index.html'), 'utf8');
  assert(html.includes('noindex,nofollow,noarchive'), 'noindex');
  assert(html.includes('No changed input was observed'), 'report no-change statement');
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/status-sovereignty-rd04-changed-input-gate-a09.yml'), 'utf8');
  assert(workflow.includes('workflow_dispatch:'), 'manual dispatch');
  assert(!workflow.includes('schedule:'), 'no automatic schedule');
  assert(workflow.includes('detect-changed-input.mjs'), 'detector invocation');
  const schema = readJson(path.join(root, 'schemas/status-sovereignty-rd04-changed-input-gate-a09.schema.json'));
  eq(schema.$id, 'https://clifford-number.invalid/schemas/status-sovereignty-rd04-changed-input-gate-a09.schema.json', 'schema id');
  return { core, manifest };
}
const direct = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (direct) {
  const result = validateA09Repository();
  console.log(`validate-status-sovereignty-rd04-changed-input-gate-a09: PASS — ${result.manifest.entries.length} exact-byte entries, no changed input, reusable gate installed`);
}
