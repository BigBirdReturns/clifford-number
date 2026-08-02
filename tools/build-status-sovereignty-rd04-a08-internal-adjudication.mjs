#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(__filename), '..');
const SLUG = 'status-sovereignty-rd04-a08-internal-adjudication';
const INTAKE = `data/intake/${SLUG}`;

export const a08Paths = Object.freeze({
  workflow: `.github/workflows/${SLUG}.yml`,
  receipt: `${INTAKE}/execution-receipt.json`,
  adjudications: `${INTAKE}/adjudications.json`,
  supported: `${INTAKE}/internally-supported-receipts.json`,
  rejected: `${INTAKE}/rejected-or-unresolved-candidates.json`,
  failures: `${INTAKE}/failure-ledger.json`,
  controls: `${INTAKE}/negative-controls.json`,
  core: `${INTAKE}/core.json`,
  manifest: `data/project/${SLUG}-release-manifest.json`,
  milestone: `docs/milestones/ssc-rd04-a08-internal-adjudication.md`,
  report: `reports/core-thesis/status-sovereignty/rd04-a08-internal-adjudication/index.html`,
  schema: `schemas/${SLUG}.schema.json`,
  builder: `tools/build-${SLUG}.mjs`,
  validator: `tools/validate-${SLUG}.mjs`,
  test: `test/${SLUG}.test.js`,
  parentCore: 'data/intake/status-sovereignty-rd04-public-implementation-receipts-a07/core.json',
  parentManifest: 'data/project/status-sovereignty-rd04-public-implementation-receipts-a07-release-manifest.json'
});

export const MANIFEST_SCOPE = Object.freeze([
  a08Paths.workflow,
  a08Paths.receipt,
  a08Paths.adjudications,
  a08Paths.supported,
  a08Paths.rejected,
  a08Paths.failures,
  a08Paths.controls,
  a08Paths.core,
  a08Paths.milestone,
  a08Paths.report,
  a08Paths.schema,
  a08Paths.builder,
  a08Paths.validator,
  a08Paths.test
]);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });
const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function buildCore(root = DEFAULT_ROOT) {
  const receipt = readJson(root, a08Paths.receipt);
  const adjudications = readJson(root, a08Paths.adjudications);
  const supported = readJson(root, a08Paths.supported);
  const rejected = readJson(root, a08Paths.rejected);
  const failures = readJson(root, a08Paths.failures);
  const controls = readJson(root, a08Paths.controls);

  return {
    schema_version: 'ssc-rd04-a08-core@1',
    hypothesis_id: 'SSC-H01',
    lane_id: 'SSC-RD04',
    execution_id: 'SSC-RD04-INTERNAL-ADJUDICATION-A08',
    issue: 765,
    as_of: '2026-08-02',
    title: 'California CalFresh internal machine-candidate adjudication',
    status: 'complete_internal_zero_candidate_adjudication_public_source_refresh_open',
    parent: receipt.parent,
    execution_receipt: {
      path: a08Paths.receipt,
      ...receipt.execution
    },
    candidate_denominator: {
      a07_machine_candidate_denominator: receipt.counts.total_machine_candidates,
      same_shn_decision_candidates: receipt.counts.same_shn_decision_candidates,
      official_page_candidates: receipt.counts.official_page_candidates,
      admitted_machine_candidates: adjudications.length,
      adjudicated_candidates: receipt.counts.adjudicated_candidates,
      candidate_denominator_changed_after_inspection: false,
      zero_candidate_set_is_terminal_for_internal_adjudication: true
    },
    adjudication: {
      internally_supported_public_completed_action_receipts: supported.length,
      internally_supported_public_restoration_receipts: receipt.counts.internally_supported_public_restoration_receipts,
      rejected_or_unresolved_candidates: rejected.length,
      negative_controls: controls.length,
      negative_control_failures: controls.filter((row) => row.pass !== true).length,
      source_or_structure_failures: failures.length,
      complete: true
    },
    public_source_refresh: {
      frozen_selected_urls: 347,
      successful_at_parent_cutoff: 346,
      unresolved_at_parent_cutoff: 1,
      refresh_attempts: 0,
      refresh_terminal_receipts: 0,
      complete: false,
      unresolved_source_is_noncompliance: false
    },
    current_result: {
      terminal_state: 'internal_zero_candidate_adjudication_complete_public_source_refresh_pending',
      internal_adjudication_complete: true,
      public_source_refresh_complete: false,
      verified_implementation_supported: false,
      verified_restoration_supported: false,
      complete_restoration_chain_supported: false,
      remedy_timeliness_supported: false,
      residual_class_closed: false,
      reviewed_disposition_changed: false,
      publication_effect: 'none',
      graph_effect: 'none',
      adoption_effect: 'none'
    },
    next_handoff: {
      acquisition_id: 'SSC-RD04-PUBLIC-SOURCE-REFRESH-A08-R1',
      status: 'authorized_nonblocking_exact_route_refresh',
      outside_human_dependency: false,
      project_blocking: false,
      unit: 'the 347 frozen A07 official routes, retaining the one unresolved route and all changed or unchanged exact receipts',
      forbidden_shortcuts: [
        'contacting claimants, representatives, counties, agencies, reviewers, or other outside people',
        'treating a zero candidate denominator as evidence of implementation or nonimplementation',
        'treating a failed or missing public source as noncompliance',
        'changing the frozen route denominator after observing refresh outcomes'
      ]
    },
    authority: {
      outside_human_dependency: false,
      external_contacts: 0,
      external_reviews: 0,
      case_level_implementation_joins: 0,
      complete_restoration_findings: 0,
      remedy_timeliness_findings: 0,
      residual_class_closures: 0,
      reviewed_disposition_changes: 0,
      prevalence_findings: 0,
      racial_order_findings: 0,
      coordination_findings: 0,
      common_purpose_findings: 0,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    boundaries: receipt.boundaries
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildReport(core) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SSC RD-04 A08 internal adjudication</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:980px;margin:2rem auto;padding:0 1rem;line-height:1.5}
    pre,code{background:#f4f4f4}pre{padding:1rem;overflow:auto}
    .boundary{border-left:5px solid #555;padding-left:1rem}
  </style>
</head>
<body>
  <h1>SSC RD-04 A08 internal adjudication</h1>
  <p><strong>Terminal receipt:</strong> <code>${escapeHtml(core.current_result.terminal_state)}</code></p>
  <h2>Exact result</h2>
  <pre>${escapeHtml(JSON.stringify({
    candidate_denominator: core.candidate_denominator,
    adjudication: core.adjudication,
    public_source_refresh: core.public_source_refresh
  }, null, 2))}</pre>
  <h2>Bounded interpretation</h2>
  <div class="boundary">
    <p>Canonical A07 admitted zero case-joined machine candidates. A08 therefore completed an exact zero-candidate adjudication rather than selecting a favorable subset.</p>
    <p>Zero admitted candidates do not establish implementation, nonimplementation, compliance, noncompliance, restoration, remedy timeliness, or effective counterpower.</p>
    <p>The bounded refresh of the 347 frozen official routes remains open. One route was unresolved at the parent cutoff.</p>
  </div>
  <h2>Authority</h2>
  <pre>${escapeHtml(JSON.stringify(core.authority, null, 2))}</pre>
</body>
</html>
`;
}

export function buildManifest(root = DEFAULT_ROOT) {
  const entries = MANIFEST_SCOPE.map((rel) => {
    const bytes = fs.readFileSync(path.join(root, rel));
    return { path: rel, bytes: bytes.length, sha256: sha256(bytes) };
  });
  const combined = sha256(Buffer.from(entries.map((row) => `${row.sha256}  ${row.path}\n`).join(''), 'utf8'));
  return {
    schema_version: 'ssc-rd04-a08-release-manifest@1',
    execution_id: 'SSC-RD04-INTERNAL-ADJUDICATION-A08',
    issue: 765,
    as_of: '2026-08-02',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: combined,
    boundaries: {
      internal_adjudication_is_external_review: false,
      missing_public_material_is_noncompliance: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };
}

export function writeProducts(root = DEFAULT_ROOT) {
  const core = buildCore(root);
  const report = buildReport(core);
  ensureDir(path.dirname(path.join(root, a08Paths.core)));
  ensureDir(path.dirname(path.join(root, a08Paths.report)));
  fs.writeFileSync(path.join(root, a08Paths.core), stable(core));
  fs.writeFileSync(path.join(root, a08Paths.report), report);
  const manifest = buildManifest(root);
  ensureDir(path.dirname(path.join(root, a08Paths.manifest)));
  fs.writeFileSync(path.join(root, a08Paths.manifest), stable(manifest));
  return { core, manifest };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (invoked) {
  const rootArg = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ROOT;
  const result = writeProducts(rootArg);
  console.log(JSON.stringify({
    terminal_state: result.core.current_result.terminal_state,
    candidates: result.core.candidate_denominator.admitted_machine_candidates,
    manifest_entries: result.manifest.entries.length,
    release_sha256: result.manifest.combined_sha256
  }, null, 2));
}
