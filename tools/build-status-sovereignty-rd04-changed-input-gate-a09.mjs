#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = 'status-sovereignty-rd04-changed-input-gate-a09';
const reportSlug = 'rd04-changed-input-gate-a09';
const dataRoot = path.join(root, 'data/intake', slug);
const custodyRoot = path.join(dataRoot, 'source-custody');
const currentCycleRoot = path.join(custodyRoot, 'current-cycle');
const sourceLedgerPath = path.join(custodyRoot, 'source-ledger.json');
const corePath = path.join(dataRoot, 'core.json');
const manifestPath = path.join(root, 'data/project', `${slug}-release-manifest.json`);
const reportRoot = path.join(root, 'reports/core-thesis/status-sovereignty', reportSlug);
const buildRoot = path.join(root, 'build/core-thesis/status-sovereignty', reportSlug);
const milestonePath = path.join(root, 'docs/milestones/ssc-rd04-changed-input-gate-a09.md');
const expectedA08Release = '0f53625ade42bf3278429040d50a74a6a52714d28e6f8e754b11f31acb710356';
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });
const writeJson = (target, value) => { ensureDir(path.dirname(target)); fs.writeFileSync(target, stable(value)); };
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const rel = (target) => path.relative(root, target).replaceAll(path.sep, '/');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function collectFiles(target) {
  if (!fs.existsSync(target)) return [];
  if (fs.statSync(target).isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => collectFiles(path.join(target, entry.name)));
}
function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const a08Manifest = readJson(path.join(root, 'data/project/status-sovereignty-rd04-internal-adjudication-a08-release-manifest.json'));
const a08Core = readJson(path.join(root, 'data/intake/status-sovereignty-rd04-internal-adjudication-a08/core.json'));
const candidate = readJson(path.join(custodyRoot, 'candidate-input-receipt.json'));
const cycle = readJson(path.join(currentCycleRoot, 'summary.json'));
assert(a08Manifest.combined_sha256 === expectedA08Release, `A08 release ${a08Manifest.combined_sha256}`);
assert(a08Core.execution_id === 'SSC-RD04-INTERNAL-ADJUDICATION-A08', `A08 execution ${a08Core.execution_id}`);
assert(candidate.combined_candidate_denominator === 0 && candidate.candidate_input_changed === false, 'candidate input state');
assert(cycle.result.terminal_state === 'no_changed_input_observed', `cycle state ${cycle.result.terminal_state}`);
assert(cycle.counts.requests === 1 && cycle.counts.changed_public_sources === 0, 'cycle request state');

const retainedFiles = collectFiles(custodyRoot).filter((target) => target !== sourceLedgerPath).sort((a, b) => rel(a).localeCompare(rel(b)));
const retainedExactFiles = retainedFiles.map((target) => {
  const body = fs.readFileSync(target);
  return { path: rel(target), bytes: body.length, sha256: sha256(body) };
});
const sourceLedger = {
  schema_version: 'ssc-rd04-a09-source-ledger@1',
  execution_id: 'SSC-RD04-CHANGED-INPUT-GATE-A09',
  as_of: '2026-08-02',
  parent: {
    canonical_merge: '68f4cb2aeccb129a3789b0b1b5da0f1e1c52cab6',
    execution_id: a08Core.execution_id,
    release_sha256: a08Manifest.combined_sha256,
    terminal_state: a08Core.current_result.terminal_state
  },
  execution_receipt: {
    workflow_run: 30761731270,
    artifact_id: 8837670685,
    artifact_zip_sha256: '3249ef058e95652c0aff6167524b99ea5e78b582e4b6f752d37a30993fc070a4',
    pass_ref_commit: '7d8908e11dd94e6a96f25ae49dfaaa4c083a6b6a',
    start_main: fs.readFileSync(path.join(currentCycleRoot, 'start-main.txt'), 'utf8').trim(),
    end_main: fs.readFileSync(path.join(currentCycleRoot, 'end-main.txt'), 'utf8').trim()
  },
  retained_exact_files: retainedExactFiles,
  counts: {
    retained_exact_files: retainedExactFiles.length,
    candidate_receipt_files: retainedExactFiles.filter((row) => row.path.endsWith('/candidate-input-receipt.json')).length,
    current_cycle_files: retainedExactFiles.filter((row) => row.path.includes('/current-cycle/')).length,
    external_contacts: 0,
    external_reviews: 0,
    graph_effects: 0
  },
  boundaries: {
    unchanged_zero_ledgers_are_failed_work: false,
    changed_page_is_case_specific_implementation: false,
    http_failure_is_record_absence: false,
    missing_public_material_is_noncompliance: false,
    outside_human_dependency: false,
    project_blocking: false,
    graph_effect: 'none'
  }
};
writeJson(sourceLedgerPath, sourceLedger);

const core = {
  schema_version: 'ssc-rd04-a09-core@1',
  hypothesis_id: 'SSC-H01',
  lane_id: 'SSC-RD04',
  execution_id: 'SSC-RD04-CHANGED-INPUT-GATE-A09',
  issue: 777,
  as_of: '2026-08-02',
  title: 'California CalFresh changed-input gate and periodic public-record refresh control',
  status: 'complete_no_changed_input_observed_reusable_changed_input_gate_installed',
  parent: sourceLedger.parent,
  execution_receipt: sourceLedger.execution_receipt,
  denominator_contract: {
    candidate_ledger_paths: candidate.ledgers.map((row) => row.path),
    expected_empty_candidate_blob_sha1: candidate.expected_empty_blob_sha1,
    frozen_public_urls: [cycle.public_source_input.frozen_url],
    baseline_public_response: cycle.public_source_input.baseline,
    request_limit_per_cycle: 1,
    changed_dimensions: ['candidate ledger bytes or entries', 'HTTP status', 'final URL', 'response body bytes or SHA-256'],
    automatic_schedule_installed: false,
    outcome_selection_after_reading: false,
    outside_human_dependency: false,
    project_blocking: false
  },
  stages: [
    {
      stage_id: 'A09-S1',
      title: 'Frozen candidate-ledger change input',
      state: 'complete_unchanged_zero_candidate_denominator',
      candidate_ledgers: candidate.ledgers.length,
      candidate_entries: candidate.combined_candidate_denominator,
      changed_candidate_inputs: cycle.counts.changed_candidate_inputs,
      finding: 'Both authoritative A07 machine-candidate ledgers remain the exact empty A08 blob; unchanged zero is a complete detector result.',
      proves_implementation: false
    },
    {
      stage_id: 'A09-S2',
      title: 'Single-request public-source change detector',
      state: 'complete_unchanged_public_source_response',
      frozen_urls: cycle.counts.frozen_urls,
      requests: cycle.counts.requests,
      changed_public_sources: cycle.counts.changed_public_sources,
      finding: 'The frozen California Courts URL retained the A08 HTTP 500 status, final target, 68-byte body, and body digest on one exact change-detection request.',
      failed_fetch_is_record_absence: false,
      missing_public_material_is_noncompliance: false
    },
    {
      stage_id: 'A09-S3',
      title: 'Changed-input classification',
      state: 'no_changed_input_observed',
      changed_input_observed: cycle.result.changed_input_observed,
      broader_crawl_authorized: cycle.result.broader_crawl_authorized,
      finding: 'No admissible input changed, so this cycle terminates without a broader crawl or case-level adjudication.',
      proves_implementation: false
    },
    {
      stage_id: 'A09-S4',
      title: 'Reusable changed-input gate',
      state: 'installed_manual_dispatch_without_schedule',
      workflow_path: '.github/workflows/status-sovereignty-rd04-changed-input-gate-a09.yml',
      detector_path: 'tools/acquisition/status-sovereignty-rd04-a09/detect-changed-input.mjs',
      finding: 'Future cycles can reproduce the same bounded decision rule through manual workflow dispatch or an explicit source-change signal; no automatic crawl schedule or outside-human dependency is installed.'
    }
  ],
  counts: {
    candidate_ledgers: cycle.counts.candidate_ledgers,
    candidate_entries: cycle.counts.candidate_entries,
    frozen_urls: cycle.counts.frozen_urls,
    requests: cycle.counts.requests,
    changed_candidate_inputs: cycle.counts.changed_candidate_inputs,
    changed_public_sources: cycle.counts.changed_public_sources,
    changed_inputs_observed: cycle.result.changed_input_observed ? 1 : 0,
    external_contacts: 0,
    external_reviews: 0,
    adjudications: 0,
    publication_clearances: 0,
    graph_effects: 0,
    adversarial_mutations: 45
  },
  current_result: {
    terminal_state: 'no_changed_input_observed',
    changed_input_observed: false,
    reusable_gate_installed: true,
    automatic_schedule_installed: false,
    broader_crawl_authorized: false,
    exact_source_adjudication_authorized: false,
    case_specific_implementation_receipt_supported: false,
    restoration_receipt_supported: false,
    missing_public_material_is_noncompliance: false,
    project_blocking: false,
    publication_effect: 'none',
    graph_effect: 'none',
    adoption_effect: 'none'
  },
  standing_gate: {
    gate_id: 'SSC-RD04-A09-CHANGED-INPUT-GATE',
    status: 'standing_nonblocking_recheck_only_on_explicit_source_change_signal_or_bounded_periodic_cycle',
    workflow_path: '.github/workflows/status-sovereignty-rd04-changed-input-gate-a09.yml',
    detector_path: 'tools/acquisition/status-sovereignty-rd04-a09/detect-changed-input.mjs',
    dispatch_mode: 'manual_workflow_dispatch_or_explicit_source_change_signal',
    schedule_installed: false,
    unchanged_inputs_terminate_honestly: true,
    outside_human_dependency: false,
    project_blocking: false,
    forbidden_shortcuts: [
      'contacting a person or agency merely to make the lane progress',
      'treating unchanged zero candidate ledgers as failed work',
      'treating HTTP 500 or a missing public page as noncompliance',
      'treating a changed page as case-specific implementation without exact identity and completed-action evidence',
      'starting a broader crawl when no changed input was observed',
      'advancing publication, adoption, or graph effect without exact evidence'
    ]
  },
  boundaries: {
    unchanged_zero_ledgers_are_failed_work: false,
    changed_page_is_case_specific_implementation: false,
    http_failure_is_record_absence: false,
    missing_public_material_is_noncompliance: false,
    change_detection_is_external_review: false,
    no_change_closes_the_residual_class: false,
    result_proves_effective_counterpower: false,
    result_proves_national_prevalence: false,
    result_proves_racial_hierarchy: false,
    result_proves_unlawful_motive: false,
    result_proves_coordination: false,
    result_proves_common_purpose: false,
    graph_effect: 'none'
  }
};
writeJson(corePath, core);
writeJson(path.join(reportRoot, 'data.json'), core);
writeJson(path.join(buildRoot, 'data.json'), core);
const projection = {
  schema_version: 'ssc-rd04-a09-projection-manifest@1',
  execution_id: core.execution_id,
  as_of: core.as_of,
  source_core_path: rel(corePath),
  release_manifest_path: rel(manifestPath),
  report_path: rel(path.join(reportRoot, 'index.html')),
  report_state: 'held_noindex',
  publication_authorized: false,
  adoption_advanced: false,
  graph_effect: 'none'
};
writeJson(path.join(buildRoot, 'manifest.json'), projection);
const html = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="robots" content="noindex,nofollow,noarchive">\n<title>${escapeHtml(core.title)}</title>\n</head>\n<body>\n<main>\n<h1>${escapeHtml(core.title)}</h1>\n<p><strong>Status:</strong> ${escapeHtml(core.status)}</p>\n<p>No changed input was observed. Both candidate ledgers remain exact empty arrays, and the frozen public URL retained the same HTTP 500 status, target, 68-byte body, and digest.</p>\n<dl>\n<dt>Candidate entries</dt><dd>0</dd>\n<dt>Changed candidate inputs</dt><dd>0</dd>\n<dt>Public requests</dt><dd>1</dd>\n<dt>Changed public sources</dt><dd>0</dd>\n<dt>Broader crawl authorized</dt><dd>false</dd>\n<dt>External contacts</dt><dd>0</dd>\n<dt>External reviews</dt><dd>0</dd>\n<dt>Graph effect</dt><dd>none</dd>\n</dl>\n<p>The reusable gate is manually dispatchable and has no automatic crawl schedule. Unchanged inputs terminate honestly. HTTP failure and missing public material are not noncompliance.</p>\n</main>\n</body>\n</html>\n`;
ensureDir(reportRoot);
fs.writeFileSync(path.join(reportRoot, 'index.html'), html);
const milestone = `# SSC RD-04 A09 · Changed-input gate\n\nCanonical A08 authorized a nonblocking changed-input cycle. The exact A09 detector found no changed candidate or public-source input and therefore refused a broader crawl.\n\n\`\`\`text\ncandidate ledgers:            2\ncandidate entries:            0\nchanged candidate inputs:     0\npublic requests:              1\nchanged public sources:       0\nbroader crawl authorized:     false\nexternal contacts:            0\nexternal reviews:             0\ngraph effect:                 none\n\`\`\`\n\nA reusable manual-dispatch gate is retained without an automatic schedule. A changed response remains only a changed source object until exact case identity and completed-action evidence validate.\n`;
ensureDir(path.dirname(milestonePath));
fs.writeFileSync(milestonePath, milestone);

const releaseScope = [
  path.join(root, '.github/workflows/status-sovereignty-rd04-changed-input-gate-a09.yml'),
  dataRoot,
  milestonePath,
  reportRoot,
  buildRoot,
  path.join(root, 'schemas/status-sovereignty-rd04-changed-input-gate-a09.schema.json'),
  path.join(root, 'test/status-sovereignty-rd04-changed-input-gate-a09.test.js'),
  path.join(root, 'tools/build-status-sovereignty-rd04-changed-input-gate-a09.mjs'),
  path.join(root, 'tools/validate-status-sovereignty-rd04-changed-input-gate-a09.mjs'),
  path.join(root, 'tools/acquisition/status-sovereignty-rd04-a09')
];
const releaseFiles = releaseScope.flatMap(collectFiles).filter((target) => target !== manifestPath).sort((a, b) => rel(a).localeCompare(rel(b)));
const entries = [];
const seen = new Set();
for (const target of releaseFiles) {
  const relative = rel(target);
  if (seen.has(relative)) continue;
  seen.add(relative);
  const body = fs.readFileSync(target);
  entries.push({ path: relative, sha256: sha256(body), bytes: body.length });
}
const combined = sha256(Buffer.from(entries.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join('')));
writeJson(manifestPath, {
  schema_version: 'ssc-rd04-a09-release-manifest@1',
  acquisition_id: core.execution_id,
  as_of: core.as_of,
  hash_mode: 'sha256_exact_bytes',
  scope_ordered: true,
  self_included: false,
  entries,
  combined_sha256: combined,
  boundaries: {
    exact_bytes_are_case_specific_implementation: false,
    manifest_is_external_review: false,
    manifest_authorizes_publication: false,
    manifest_advances_adoption: false,
    graph_effect: 'none'
  }
});
console.log(`build-status-sovereignty-rd04-changed-input-gate-a09: ${entries.length} exact-byte entries, release ${combined}`);
