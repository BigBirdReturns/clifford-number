#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = 'status-sovereignty-rd04-internal-adjudication-a08';
const reportSlug = 'rd04-internal-adjudication-a08';
const corePath = path.join(root, 'data/intake', slug, 'core.json');
const manifestPath = path.join(root, 'data/project', `${slug}-release-manifest.json`);
const custodyRoot = path.join(root, 'data/intake', slug, 'source-custody');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const rel = (target) => path.relative(root, target).replaceAll(path.sep, '/');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function eq(actual, expected, label) {
  assert(actual === expected, `${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
}
function collectFiles(target) {
  if (!fs.existsSync(target)) return [];
  if (fs.statSync(target).isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true })
    .flatMap((entry) => collectFiles(path.join(target, entry.name)));
}

export function validateA08Core(core) {
  eq(core.schema_version, 'ssc-rd04-a08-core@1', 'schema_version');
  eq(core.hypothesis_id, 'SSC-H01', 'hypothesis_id');
  eq(core.lane_id, 'SSC-RD04', 'lane_id');
  eq(core.execution_id, 'SSC-RD04-INTERNAL-ADJUDICATION-A08', 'execution_id');
  eq(core.issue, 765, 'issue');
  eq(core.as_of, '2026-08-02', 'as_of');
  eq(core.status, 'complete_zero_machine_candidate_adjudication_one_unresolved_public_source_after_bounded_refresh', 'status');
  eq(core.parent.execution_id, 'SSC-RD04-PUBLIC-IMPLEMENTATION-RECEIPTS-A07', 'parent.execution_id');
  eq(core.parent.canonical_merge, '281f2c5ef735d3e2a744f5977061c7c36b97a8a9', 'parent.canonical_merge');
  eq(core.parent.product_commit, 'ffbbbf832a264b15f7c10cf9f6c4ff407134e01c', 'parent.product_commit');
  eq(core.parent.release_sha256, 'a4be788259cd48235006d06b43271e61de625b72f2c7bb6d8663e63b82d520a3', 'parent.release_sha256');
  eq(core.parent.D1_shns, 6292, 'parent.D1_shns');
  eq(core.parent.same_shn_documents, 1433, 'parent.same_shn_documents');
  eq(core.parent.official_attempted_urls, 347, 'parent.official_attempted_urls');
  eq(core.parent.official_unresolved_urls, 1, 'parent.official_unresolved_urls');
  eq(core.execution_receipts.internal_adjudication.workflow_run, 30757760972, 'adjudication.workflow_run');
  eq(core.execution_receipts.internal_adjudication.artifact_id, 8836481769, 'adjudication.artifact_id');
  eq(core.execution_receipts.internal_adjudication.artifact_zip_sha256, '5e789276d3b051682b85a68ed628159c5b1d030c6795d708905485ec09ee57fc', 'adjudication.artifact_zip_sha256');
  eq(core.execution_receipts.internal_adjudication.pass_ref_commit, 'bd446fb9fbac6c0f4cd3238eb4973ed3ac9ba341', 'adjudication.pass_ref_commit');
  eq(core.execution_receipts.internal_adjudication.original_program_blob_sha1, '8eabfb3ebfd5b72adb7bf79c80b18f9424e72cfc', 'adjudication.original_program_blob_sha1');
  eq(core.execution_receipts.bounded_public_refresh.workflow_run, 30758046311, 'refresh.workflow_run');
  eq(core.execution_receipts.bounded_public_refresh.artifact_id, 8836555958, 'refresh.artifact_id');
  eq(core.execution_receipts.bounded_public_refresh.artifact_zip_sha256, 'ab7d7f689fca5d364192bfb749021109fa550fb81f553fcac9aa647ac26f2fb4', 'refresh.artifact_zip_sha256');
  eq(core.execution_receipts.bounded_public_refresh.pass_ref_commit, '23dd245b87747e7ea30af2e5658f5e75e0b723aa', 'refresh.pass_ref_commit');
  eq(core.denominator_contract.machine_candidate_denominator, 0, 'machine_candidate_denominator');
  eq(core.denominator_contract.frozen_refresh_urls, 1, 'frozen_refresh_urls');
  eq(core.denominator_contract.bounded_attempt_limit, 3, 'bounded_attempt_limit');
  eq(core.denominator_contract.outcome_selection_after_reading, false, 'outcome_selection_after_reading');
  eq(core.denominator_contract.outside_human_dependency, false, 'outside_human_dependency');
  eq(core.denominator_contract.project_blocking, false, 'project_blocking');
  const expectedCounts = {
    same_shn_decision_candidates: 0,
    official_page_candidates: 0,
    total_machine_candidates: 0,
    adjudicated_candidates: 0,
    internally_supported_public_completed_action_receipts: 0,
    internally_supported_public_restoration_receipts: 0,
    rejected_or_unresolved_candidates: 0,
    negative_controls: 5,
    negative_control_failures: 0,
    source_or_structure_failures: 0,
    refresh_frozen_urls: 1,
    refresh_attempts: 3,
    refresh_resolved_urls: 0,
    refresh_unresolved_urls: 1,
    external_contacts: 0,
    external_reviews: 0,
    adjudications: 0,
    publication_clearances: 0,
    graph_effects: 0,
    adversarial_mutations: 52
  };
  for (const [key, expected] of Object.entries(expectedCounts)) eq(core.counts[key], expected, `counts.${key}`);
  eq(core.current_result.terminal_state, 'zero_machine_candidates_adjudicated_one_public_url_unresolved_after_bounded_refresh', 'terminal_state');
  eq(core.current_result.internal_adjudication_complete, true, 'internal_adjudication_complete');
  eq(core.current_result.public_source_refresh_complete, true, 'public_source_refresh_complete');
  eq(core.current_result.verified_implementation_supported, false, 'verified_implementation_supported');
  eq(core.current_result.verified_restoration_supported, false, 'verified_restoration_supported');
  eq(core.current_result.missing_public_material_is_noncompliance, false, 'missing_public_material_is_noncompliance');
  eq(core.current_result.residual_class_closed, false, 'residual_class_closed');
  eq(core.current_result.publication_effect, 'none', 'publication_effect');
  eq(core.current_result.graph_effect, 'none', 'graph_effect');
  eq(core.current_result.adoption_effect, 'none', 'adoption_effect');
  eq(core.next_handoff.acquisition_id, 'SSC-RD04-PUBLIC-IMPLEMENTATION-RECEIPTS-A09', 'next_handoff.acquisition_id');
  eq(core.next_handoff.outside_human_dependency, false, 'next_handoff.outside_human_dependency');
  eq(core.next_handoff.project_blocking, false, 'next_handoff.project_blocking');
  const falseBoundaries = [
    'zero_machine_candidates_is_failed_work',
    'internal_adjudication_is_external_review',
    'same_shn_proves_claimant_identity',
    'official_page_string_hit_proves_case_specific_implementation',
    'refreshed_http_body_is_implementation_receipt',
    'failed_fetch_is_record_absence',
    'missing_public_material_is_noncompliance',
    'result_proves_effective_counterpower',
    'result_proves_national_prevalence',
    'result_proves_racial_hierarchy',
    'result_proves_unlawful_motive',
    'result_proves_coordination',
    'result_proves_common_purpose',
    'result_is_external_review'
  ];
  for (const key of falseBoundaries) eq(core.boundaries[key], false, `boundaries.${key}`);
  eq(core.boundaries.graph_effect, 'none', 'boundaries.graph_effect');
  assert(Array.isArray(core.stages) && core.stages.length === 4, 'stages length');
  eq(core.stages[0].observed, 0, 'stage A08-S1 observed');
  eq(core.stages[1].negative_controls, 5, 'stage A08-S2 controls');
  eq(core.stages[2].attempts, 3, 'stage A08-S3 attempts');
  eq(core.stages[2].unresolved_urls, 1, 'stage A08-S3 unresolved');
  eq(core.stages[3].verified_public_implementation_receipts, 0, 'stage A08-S4 implementation');
  return true;
}

export function validateA08Repository() {
  const core = readJson(corePath);
  validateA08Core(core);
  const a07Core = readJson(path.join(root, 'data/intake/status-sovereignty-rd04-public-implementation-receipts-a07/core.json'));
  const a07Manifest = readJson(path.join(root, 'data/project/status-sovereignty-rd04-public-implementation-receipts-a07-release-manifest.json'));
  eq(a07Core.execution_id, core.parent.execution_id, 'live A07 execution');
  eq(a07Manifest.combined_sha256, core.parent.release_sha256, 'live A07 release');
  eq(a07Core.counts.same_shn_explicit_language_candidates, 0, 'live A07 same-SHN candidates');
  eq(a07Core.counts.official_case_joined_machine_candidates, 0, 'live A07 official candidates');

  const adjudication = readJson(path.join(custodyRoot, 'internal-adjudication/summary.json'));
  const refresh = readJson(path.join(custodyRoot, 'public-refresh/summary.json'));
  eq(adjudication.status, 'pass', 'adjudication status');
  eq(adjudication.parent.machine_candidate_denominator, core.denominator_contract.machine_candidate_denominator, 'adjudication denominator');
  eq(adjudication.counts.negative_controls, core.counts.negative_controls, 'adjudication controls');
  eq(refresh.status, 'pass_unresolved_after_bounded_retry', 'refresh status');
  eq(refresh.counts.attempts, core.counts.refresh_attempts, 'refresh attempts');
  eq(refresh.counts.unresolved_urls, core.counts.refresh_unresolved_urls, 'refresh unresolved');

  const sourceLedger = readJson(path.join(custodyRoot, 'source-ledger.json'));
  eq(sourceLedger.schema_version, 'ssc-rd04-a08-source-ledger@1', 'source ledger schema');
  eq(sourceLedger.execution_id, core.execution_id, 'source ledger execution');
  eq(sourceLedger.parent.release_sha256, core.parent.release_sha256, 'source ledger parent');
  eq(sourceLedger.counts.internal_adjudication_files, 6, 'internal custody count');
  eq(sourceLedger.counts.public_refresh_files, 16, 'refresh custody count');
  eq(sourceLedger.counts.retained_exact_files, 22, 'total custody count');
  for (const entry of sourceLedger.retained_exact_files) {
    const target = path.join(root, entry.path);
    assert(fs.existsSync(target), `missing custody file ${entry.path}`);
    const body = fs.readFileSync(target);
    eq(body.length, entry.bytes, `custody bytes ${entry.path}`);
    eq(sha256(body), entry.sha256, `custody digest ${entry.path}`);
  }

  const manifest = readJson(manifestPath);
  eq(manifest.schema_version, 'ssc-rd04-a08-release-manifest@1', 'release schema');
  eq(manifest.acquisition_id, core.execution_id, 'release acquisition');
  eq(manifest.hash_mode, 'sha256_exact_bytes', 'hash mode');
  eq(manifest.self_included, false, 'self included');
  eq(manifest.entries.length, 36, 'manifest entries');
  const expectedFiles = [
    path.join(root, '.github/workflows/status-sovereignty-rd04-internal-adjudication-a08.yml'),
    path.join(root, 'data/intake', slug),
    path.join(root, 'docs/milestones/ssc-rd04-internal-adjudication-a08.md'),
    path.join(root, 'reports/core-thesis/status-sovereignty', reportSlug),
    path.join(root, 'build/core-thesis/status-sovereignty', reportSlug),
    path.join(root, 'schemas/status-sovereignty-rd04-internal-adjudication-a08.schema.json'),
    path.join(root, 'test/status-sovereignty-rd04-internal-adjudication-a08.test.js'),
    path.join(root, 'tools/build-status-sovereignty-rd04-internal-adjudication-a08.mjs'),
    path.join(root, 'tools/validate-status-sovereignty-rd04-internal-adjudication-a08.mjs'),
    path.join(root, 'tools/acquisition/status-sovereignty-rd04-a08')
  ].flatMap(collectFiles)
    .filter((target) => target !== manifestPath)
    .map(rel)
    .sort();
  const manifestPaths = manifest.entries.map((entry) => entry.path);
  assert(JSON.stringify(manifestPaths) === JSON.stringify(expectedFiles), 'manifest path scope');
  for (const entry of manifest.entries) {
    const body = fs.readFileSync(path.join(root, entry.path));
    eq(body.length, entry.bytes, `manifest bytes ${entry.path}`);
    eq(sha256(body), entry.sha256, `manifest digest ${entry.path}`);
  }
  const combined = sha256(Buffer.from(manifest.entries.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join(''), 'utf8'));
  eq(combined, manifest.combined_sha256, 'combined release digest');
  const reportData = readJson(path.join(root, 'reports/core-thesis/status-sovereignty', reportSlug, 'data.json'));
  const buildData = readJson(path.join(root, 'build/core-thesis/status-sovereignty', reportSlug, 'data.json'));
  assert(JSON.stringify(reportData) === JSON.stringify(core), 'report data projection');
  assert(JSON.stringify(buildData) === JSON.stringify(core), 'build data projection');
  const html = fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty', reportSlug, 'index.html'), 'utf8');
  assert(html.includes('noindex,nofollow,noarchive'), 'noindex report');
  assert(html.includes('Zero candidates are an honest terminal denominator'), 'zero-denominator report boundary');
  const schema = readJson(path.join(root, 'schemas/status-sovereignty-rd04-internal-adjudication-a08.schema.json'));
  eq(schema.$id, 'https://clifford-number.invalid/schemas/status-sovereignty-rd04-internal-adjudication-a08.schema.json', 'schema id');
  return { core, manifest };
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (direct) {
  const result = validateA08Repository();
  console.log(`validate-status-sovereignty-rd04-internal-adjudication-a08: PASS — ${result.manifest.entries.length} exact-byte entries, zero candidates, one unresolved URL, no outside-human gate`);
}
