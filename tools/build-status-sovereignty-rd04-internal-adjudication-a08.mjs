#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = 'status-sovereignty-rd04-internal-adjudication-a08';
const reportSlug = 'rd04-internal-adjudication-a08';
const dataRoot = path.join(root, 'data/intake', slug);
const custodyRoot = path.join(dataRoot, 'source-custody');
const internalRoot = path.join(custodyRoot, 'internal-adjudication');
const refreshRoot = path.join(custodyRoot, 'public-refresh');
const sourceLedgerPath = path.join(custodyRoot, 'source-ledger.json');
const corePath = path.join(dataRoot, 'core.json');
const manifestPath = path.join(root, 'data/project', `${slug}-release-manifest.json`);
const reportRoot = path.join(root, 'reports/core-thesis/status-sovereignty', reportSlug);
const buildRoot = path.join(root, 'build/core-thesis/status-sovereignty', reportSlug);
const milestonePath = path.join(root, 'docs/milestones/ssc-rd04-internal-adjudication-a08.md');
const a07CorePath = path.join(root, 'data/intake/status-sovereignty-rd04-public-implementation-receipts-a07/core.json');
const a07ManifestPath = path.join(root, 'data/project/status-sovereignty-rd04-public-implementation-receipts-a07-release-manifest.json');
const expectedA07Release = 'a4be788259cd48235006d06b43271e61de625b72f2c7bb6d8663e63b82d520a3';
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
  return fs.readdirSync(target, { withFileTypes: true })
    .flatMap((entry) => collectFiles(path.join(target, entry.name)));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const a07 = readJson(a07CorePath);
const a07Manifest = readJson(a07ManifestPath);
const adjudication = readJson(path.join(internalRoot, 'summary.json'));
const refresh = readJson(path.join(refreshRoot, 'summary.json'));
assert(a07.execution_id === 'SSC-RD04-PUBLIC-IMPLEMENTATION-RECEIPTS-A07', `A07 execution ${a07.execution_id}`);
assert(a07Manifest.combined_sha256 === expectedA07Release, `A07 release ${a07Manifest.combined_sha256}`);
assert(a07.counts.same_shn_explicit_language_candidates === 0 && a07.counts.official_case_joined_machine_candidates === 0, 'A07 machine candidate denominator');
assert(adjudication.status === 'pass' && adjudication.parent.machine_candidate_denominator === 0, 'adjudication status');
assert(adjudication.counts.negative_controls === 5 && adjudication.counts.negative_control_failures === 0, 'negative controls');
assert(refresh.status === 'pass_unresolved_after_bounded_retry', `refresh status ${refresh.status}`);
assert(refresh.counts.attempts === 3 && refresh.counts.resolved_urls === 0 && refresh.counts.unresolved_urls === 1, 'refresh counts');

const custodyFiles = collectFiles(custodyRoot)
  .filter((target) => target !== sourceLedgerPath)
  .sort((a, b) => rel(a).localeCompare(rel(b)));
const retainedExactFiles = custodyFiles.map((target) => {
  const body = fs.readFileSync(target);
  return { path: rel(target), bytes: body.length, sha256: sha256(body) };
});
const sourceLedger = {
  schema_version: 'ssc-rd04-a08-source-ledger@1',
  execution_id: 'SSC-RD04-INTERNAL-ADJUDICATION-A08',
  as_of: '2026-08-02',
  parent: {
    canonical_merge: '281f2c5ef735d3e2a744f5977061c7c36b97a8a9',
    product_commit: 'ffbbbf832a264b15f7c10cf9f6c4ff407134e01c',
    execution_id: a07.execution_id,
    release_sha256: a07Manifest.combined_sha256
  },
  execution_receipts: {
    internal_adjudication: {
      workflow_run: 30757760972,
      artifact_id: 8836481769,
      artifact_zip_sha256: '5e789276d3b051682b85a68ed628159c5b1d030c6795d708905485ec09ee57fc',
      pass_ref_commit: 'bd446fb9fbac6c0f4cd3238eb4973ed3ac9ba341',
      original_program_blob_sha1: '8eabfb3ebfd5b72adb7bf79c80b18f9424e72cfc'
    },
    bounded_public_refresh: {
      workflow_run: 30758046311,
      artifact_id: 8836555958,
      artifact_zip_sha256: 'ab7d7f689fca5d364192bfb749021109fa550fb81f553fcac9aa647ac26f2fb4',
      pass_ref_commit: '23dd245b87747e7ea30af2e5658f5e75e0b723aa'
    }
  },
  retained_exact_files: retainedExactFiles,
  counts: {
    retained_exact_files: retainedExactFiles.length,
    internal_adjudication_files: retainedExactFiles.filter((row) => row.path.includes('/internal-adjudication/')).length,
    public_refresh_files: retainedExactFiles.filter((row) => row.path.includes('/public-refresh/')).length,
    external_contacts: 0,
    external_reviews: 0,
    graph_effects: 0
  },
  boundaries: {
    zero_machine_candidates_is_failed_work: false,
    internal_adjudication_is_external_review: false,
    successful_or_failed_refresh_is_case_specific_implementation: false,
    failed_fetch_is_record_absence: false,
    missing_public_material_is_noncompliance: false,
    outside_human_dependency: false,
    project_blocking: false,
    graph_effect: 'none'
  }
};
writeJson(sourceLedgerPath, sourceLedger);

const core = {
  schema_version: 'ssc-rd04-a08-core@1',
  hypothesis_id: 'SSC-H01',
  lane_id: 'SSC-RD04',
  execution_id: 'SSC-RD04-INTERNAL-ADJUDICATION-A08',
  issue: 765,
  as_of: '2026-08-02',
  title: 'California CalFresh internal receipt adjudication and bounded public-source refresh',
  status: 'complete_zero_machine_candidate_adjudication_one_unresolved_public_source_after_bounded_refresh',
  parent: {
    execution_id: a07.execution_id,
    canonical_merge: '281f2c5ef735d3e2a744f5977061c7c36b97a8a9',
    product_commit: 'ffbbbf832a264b15f7c10cf9f6c4ff407134e01c',
    release_sha256: a07Manifest.combined_sha256,
    D1_shns: a07.counts.D1_shns,
    same_shn_documents: a07.counts.exact_shn_candidate_documents,
    official_attempted_urls: a07.counts.official_attempted_urls,
    official_unresolved_urls: a07.counts.official_unresolved_urls
  },
  execution_receipts: sourceLedger.execution_receipts,
  denominator_contract: {
    machine_candidate_sources: [
      'data/intake/status-sovereignty-rd04-public-implementation-receipts-a07/source-custody/candidate-receipts/explicit-language-candidates.json',
      'data/intake/status-sovereignty-rd04-public-implementation-receipts-a07/source-custody/official-crawl/case-joined-machine-candidates.json'
    ],
    machine_candidate_denominator: adjudication.parent.machine_candidate_denominator,
    frozen_refresh_urls: refresh.counts.frozen_urls,
    bounded_attempt_limit: refresh.attempt_limit,
    outcome_selection_after_reading: false,
    outside_human_dependency: false,
    project_blocking: false
  },
  stages: [
    {
      stage_id: 'A08-S1',
      title: 'Frozen A07 machine-candidate denominator',
      state: 'complete_zero_candidate_denominator',
      observed: adjudication.parent.machine_candidate_denominator,
      finding: 'Both permanent A07 machine-positive candidate ledgers are exact empty arrays; zero is the complete retained denominator, not a missing reviewer or failed task.',
      proves_implementation: false
    },
    {
      stage_id: 'A08-S2',
      title: 'Internal exact-byte adjudication',
      state: 'complete_zero_candidate_adjudication',
      adjudicated: adjudication.counts.adjudicated_candidates,
      negative_controls: adjudication.counts.negative_controls,
      negative_control_failures: adjudication.counts.negative_control_failures,
      finding: 'The exact zero denominator was reproduced and five prospective, allegation, negation, conditional, and order controls were refused as completed action.',
      is_external_review: false,
      proves_implementation: false
    },
    {
      stage_id: 'A08-S3',
      title: 'Bounded refresh of the one unresolved A07 public URL',
      state: 'complete_bounded_refresh_unresolved',
      frozen_urls: refresh.counts.frozen_urls,
      attempts: refresh.counts.attempts,
      resolved_urls: refresh.counts.resolved_urls,
      unresolved_urls: refresh.counts.unresolved_urls,
      finding: 'The one frozen California Courts URL returned the same 68-byte HTTP 500 body on three exact attempts and remains unresolved public-source availability.',
      failed_fetch_is_record_absence: false,
      missing_public_material_is_noncompliance: false
    },
    {
      stage_id: 'A08-S4',
      title: 'Verified implementation and restoration receipts',
      state: 'not_observed',
      verified_public_implementation_receipts: adjudication.counts.internally_supported_public_completed_action_receipts,
      verified_public_restoration_receipts: adjudication.counts.internally_supported_public_restoration_receipts,
      finding: 'No qualifying machine candidate or refreshed public body advances the A07 zero-receipt authority state.',
      missing_receipt_is_noncompliance: false
    }
  ],
  counts: {
    same_shn_decision_candidates: adjudication.counts.same_shn_decision_candidates,
    official_page_candidates: adjudication.counts.official_page_candidates,
    total_machine_candidates: adjudication.counts.total_machine_candidates,
    adjudicated_candidates: adjudication.counts.adjudicated_candidates,
    internally_supported_public_completed_action_receipts: adjudication.counts.internally_supported_public_completed_action_receipts,
    internally_supported_public_restoration_receipts: adjudication.counts.internally_supported_public_restoration_receipts,
    rejected_or_unresolved_candidates: adjudication.counts.rejected_or_unresolved_candidates,
    negative_controls: adjudication.counts.negative_controls,
    negative_control_failures: adjudication.counts.negative_control_failures,
    source_or_structure_failures: adjudication.counts.source_or_structure_failures,
    refresh_frozen_urls: refresh.counts.frozen_urls,
    refresh_attempts: refresh.counts.attempts,
    refresh_resolved_urls: refresh.counts.resolved_urls,
    refresh_unresolved_urls: refresh.counts.unresolved_urls,
    external_contacts: 0,
    external_reviews: 0,
    adjudications: 0,
    publication_clearances: 0,
    graph_effects: 0,
    adversarial_mutations: 52
  },
  current_result: {
    terminal_state: 'zero_machine_candidates_adjudicated_one_public_url_unresolved_after_bounded_refresh',
    internal_adjudication_complete: true,
    public_source_refresh_complete: true,
    verified_implementation_supported: false,
    verified_restoration_supported: false,
    missing_public_material_is_noncompliance: false,
    residual_class_closed: false,
    publication_effect: 'none',
    graph_effect: 'none',
    adoption_effect: 'none'
  },
  next_handoff: {
    acquisition_id: 'SSC-RD04-PUBLIC-IMPLEMENTATION-RECEIPTS-A09',
    status: 'authorized_nonblocking_periodic_public_record_refresh_and_changed_input_intake',
    outside_human_dependency: false,
    project_blocking: false,
    unit: 'rerun only when a frozen public source changes, a new public case-specific receipt appears, or the A07 machine-candidate denominator changes; unchanged inputs terminate honestly',
    forbidden_shortcuts: [
      'contacting a person or agency merely to make the lane progress',
      'treating unchanged zero candidate ledgers as failed work',
      'treating HTTP 500 or a missing public page as noncompliance',
      'treating an allegation, order, plan, condition, or keyword hit as completed implementation',
      'advancing publication, adoption, or graph effect without exact evidence'
    ]
  },
  boundaries: {
    zero_machine_candidates_is_failed_work: false,
    internal_adjudication_is_external_review: false,
    same_shn_proves_claimant_identity: false,
    official_page_string_hit_proves_case_specific_implementation: false,
    refreshed_http_body_is_implementation_receipt: false,
    failed_fetch_is_record_absence: false,
    missing_public_material_is_noncompliance: false,
    result_proves_effective_counterpower: false,
    result_proves_national_prevalence: false,
    result_proves_racial_hierarchy: false,
    result_proves_unlawful_motive: false,
    result_proves_coordination: false,
    result_proves_common_purpose: false,
    result_is_external_review: false,
    graph_effect: 'none'
  }
};
writeJson(corePath, core);
writeJson(path.join(reportRoot, 'data.json'), core);
writeJson(path.join(buildRoot, 'data.json'), core);

const projectionManifest = {
  schema_version: 'ssc-rd04-a08-projection-manifest@1',
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
writeJson(path.join(buildRoot, 'manifest.json'), projectionManifest);

const html = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="robots" content="noindex,nofollow,noarchive">\n<title>${escapeHtml(core.title)}</title>\n</head>\n<body>\n<main>\n<h1>${escapeHtml(core.title)}</h1>\n<p><strong>Status:</strong> ${escapeHtml(core.status)}</p>\n<p>The complete retained machine-candidate denominator is zero. Five negative controls passed. The single frozen public URL remained HTTP 500 after three bounded attempts.</p>\n<dl>\n<dt>Machine candidates</dt><dd>0</dd>\n<dt>Verified implementation receipts</dt><dd>0</dd>\n<dt>Verified restoration receipts</dt><dd>0</dd>\n<dt>Unresolved public URLs</dt><dd>1</dd>\n<dt>External contacts</dt><dd>0</dd>\n<dt>External reviews</dt><dd>0</dd>\n<dt>Graph effect</dt><dd>none</dd>\n</dl>\n<p>HTTP failure is not record absence or noncompliance. Zero candidates are an honest terminal denominator, not a request to recruit an outside person.</p>\n</main>\n</body>\n</html>\n`;
ensureDir(reportRoot);
fs.writeFileSync(path.join(reportRoot, 'index.html'), html);

const milestone = `# SSC RD-04 A08 — internal adjudication and bounded public-source refresh\n\nA08 preserves the exact zero machine-candidate denominator created by A07 and the exact three-attempt refresh of its one unresolved official URL.\n\n\`\`\`text\nmachine candidates:                    0\nadjudicated candidates:                0\nnegative controls:                     5\nnegative-control failures:             0\nrefresh attempts:                      3\nresolved public URLs:                  0\nunresolved public URLs:                1\nverified implementation receipts:      0\nverified restoration receipts:         0\nexternal contacts:                     0\nexternal reviews:                      0\ngraph effect:                       none\n\`\`\`\n\nThe zero candidate set is complete for the exact A07 machine-positive ledgers. The refreshed California Courts URL returned the same 68-byte HTTP 500 body on all three bounded attempts. This is unresolved public-source availability, not evidence of record absence or noncompliance. No outside person is required for the project to continue.\n`;
ensureDir(path.dirname(milestonePath));
fs.writeFileSync(milestonePath, milestone);

const releaseScope = [
  path.join(root, '.github/workflows/status-sovereignty-rd04-internal-adjudication-a08.yml'),
  dataRoot,
  milestonePath,
  reportRoot,
  buildRoot,
  path.join(root, 'schemas/status-sovereignty-rd04-internal-adjudication-a08.schema.json'),
  path.join(root, 'test/status-sovereignty-rd04-internal-adjudication-a08.test.js'),
  path.join(root, 'tools/build-status-sovereignty-rd04-internal-adjudication-a08.mjs'),
  path.join(root, 'tools/validate-status-sovereignty-rd04-internal-adjudication-a08.mjs'),
  path.join(root, 'tools/acquisition/status-sovereignty-rd04-a08')
];
const releaseFiles = releaseScope.flatMap(collectFiles)
  .filter((target) => fs.existsSync(target) && fs.statSync(target).isFile())
  .filter((target) => target !== manifestPath)
  .sort((a, b) => rel(a).localeCompare(rel(b)));
const seen = new Set();
const entries = [];
for (const target of releaseFiles) {
  const relative = rel(target);
  if (seen.has(relative)) continue;
  seen.add(relative);
  const body = fs.readFileSync(target);
  entries.push({ path: relative, sha256: sha256(body), bytes: body.length });
}
const combined = sha256(Buffer.from(entries.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join(''), 'utf8'));
const releaseManifest = {
  schema_version: 'ssc-rd04-a08-release-manifest@1',
  acquisition_id: core.execution_id,
  as_of: core.as_of,
  hash_mode: 'sha256_exact_bytes',
  scope_ordered: true,
  self_included: false,
  entries,
  combined_sha256: combined,
  boundaries: {
    exact_bytes_prove_case_specific_implementation: false,
    exact_bytes_prove_restoration: false,
    manifest_proves_external_review: false,
    manifest_authorizes_publication: false,
    manifest_advances_adoption: false,
    failed_fetch_is_noncompliance: false,
    graph_effect: 'none'
  }
};
writeJson(manifestPath, releaseManifest);
console.log(`build-status-sovereignty-rd04-internal-adjudication-a08: ${entries.length} exact-byte entries, release ${combined}`);
