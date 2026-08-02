#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-34-executable-handoff-control.json';
const PACKAGE_DIR = 'data/project/counter-selector-wave-34-package';
const PACKAGE_MANIFEST_PATH = `${PACKAGE_DIR}/package-manifest.json`;
const REGISTRY_PATH = 'data/project/counter-selector-wave-34-handoff-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-34-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-34/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-34/index.html';

export const PACKAGE_ENTRY_PATHS = [
  'object-before.json',
  'operation-contract.json',
  'authority-ledger.json',
  'dependency-inventory.json',
  'open-decision-inventory.json',
  'rollback-plan.json',
  'resume.mjs'
];

export const STATIC_MANIFEST_PATHS = [
  '.github/workflows/counter-selector-wave-34.yml',
  SOURCE_PATH,
  'schemas/counter-selector-executable-handoff-control.schema.json',
  'docs/methods/counter-selector-executable-handoff-control.md',
  'docs/milestones/counter-selector-wave-34.md',
  'tools/build-counter-selector-wave-34.mjs',
  'tools/validate-counter-selector-wave-34.mjs',
  'tools/verify-counter-selector-wave-34-successor.mjs',
  'test/counter-selector-wave-34.test.js',
  ...PACKAGE_ENTRY_PATHS.map(entry => `${PACKAGE_DIR}/${entry}`),
  PACKAGE_MANIFEST_PATH
];

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

export function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

export function derivePackageManifest(source) {
  const entries = PACKAGE_ENTRY_PATHS.map(relativePath => {
    const bytes = fs.readFileSync(path.join(ROOT, PACKAGE_DIR, relativePath));
    return { path: relativePath, sha256: sha256(bytes), bytes: bytes.length };
  });
  const combined = sha256(Buffer.from(entries.map(entry =>
    `${entry.path}\t${entry.sha256}\t${entry.bytes}\n`).join(''), 'utf8'));
  return {
    schema_version: 'counter-selector-wave-34-package-manifest@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    control_id: source.control.control_id,
    package_id: source.control.package_id,
    package_version: source.control.package_version,
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    entries,
    combined_sha256: combined,
    boundaries: {
      exact_bytes_prove_external_independence: false,
      exact_bytes_prove_person_custody: false,
      package_authorizes_contact: false,
      package_authorizes_field_test: false,
      package_authorizes_promotion: false,
      graph_effect: 'none'
    }
  };
}

export function deriveRegistry(source, packageManifest) {
  return {
    schema_version: 'counter-selector-wave-34-handoff-registry@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_ids: source.parent_wave_ids,
    as_of: source.as_of,
    status: source.status,
    counts: source.counts,
    control: {
      control_id: source.control.control_id,
      public_label: source.control.public_label,
      control_type: source.control.control_type,
      package_id: source.control.package_id,
      package_version: source.control.package_version,
      package_entry_count: packageManifest.entries.length,
      package_combined_sha256: packageManifest.combined_sha256,
      package_state: source.control.adjudication.package_state,
      recipient_state: source.control.adjudication.recipient_state,
      safe_decline_state: source.control.adjudication.safe_decline_state,
      successor_state: source.control.adjudication.successor_state,
      verification_state: source.control.adjudication.verification_state,
      complete_bounded_package_handoff: true,
      complete_direct_person_handoff: false,
      person_support_added: false,
      operator_finding: false,
      field_test_eligible: false,
      contact_authorized: false,
      graph_effect: 'none'
    },
    boundaries: source.boundaries,
    graph_effect: 'none'
  };
}

export function deriveReleaseManifest(source) {
  const entries = STATIC_MANIFEST_PATHS.map(relativePath => {
    const bytes = fs.readFileSync(path.join(ROOT, relativePath));
    return { path: relativePath, sha256: sha256(bytes), bytes: bytes.length };
  });
  const combined = sha256(Buffer.from(entries.map(entry =>
    `${entry.path}\t${entry.sha256}\t${entry.bytes}\n`).join(''), 'utf8'));
  return {
    schema_version: 'counter-selector-wave-34-release-manifest@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    as_of: source.as_of,
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: combined,
    boundaries: {
      exact_bytes_prove_workflow_execution: false,
      exact_bytes_prove_external_independence: false,
      exact_bytes_prove_person_support: false,
      exact_bytes_prove_complete_operator: false,
      manifest_authorizes_contact: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_ranking: false,
      manifest_authorizes_public_identity_profile: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

export function deriveReport(source, packageManifest, releaseManifest) {
  return {
    schema_version: 'counter-selector-wave-34-report@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_ids: source.parent_wave_ids,
    as_of: source.as_of,
    observed_at: source.observed_at,
    title: source.title,
    status: source.status,
    purpose: source.purpose,
    counts: source.counts,
    handoff_contract: source.handoff_contract,
    control: {
      ...source.control,
      package_manifest: {
        path: PACKAGE_MANIFEST_PATH,
        entry_count: packageManifest.entries.length,
        combined_sha256: packageManifest.combined_sha256
      }
    },
    boundaries: source.boundaries,
    next_action: source.next_action,
    release_manifest: {
      path: MANIFEST_PATH,
      combined_sha256: releaseManifest.combined_sha256
    },
    graph_effect: 'none'
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderHtml(report) {
  const components = report.handoff_contract.component_order
    .map((component, index) => `<li><b>${index + 1}</b> ${escapeHtml(component)}</li>`)
    .join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 34</title>
<style>:root{font-family:system-ui,sans-serif;background:#f2efe7;color:#171714}body{max-width:1120px;margin:auto;padding:42px 24px;line-height:1.55}h1{font-size:clamp(2.5rem,7vw,5.4rem);line-height:.92;letter-spacing:-.05em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,.contract,.ceiling{background:#fffdf8;border:1px solid #c8c0ae;border-radius:14px;padding:18px}.card b{display:block;font-size:2.2rem}.contract{margin-top:28px}.contract ol{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;padding:0;list-style:none}.contract li{border-top:1px solid #ddd4c4;padding:10px 0}.contract li b{display:inline-grid;place-items:center;width:1.8rem;height:1.8rem;border-radius:999px;background:#171714;color:#fff;margin-right:.5rem}.ceiling{margin-top:28px}code{overflow-wrap:anywhere}</style></head>
<body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W34-EH-01</strong></p>
<h1>The package—not the predecessor—carried the state.</h1>
<p><strong>ONE COMPLETE BOUNDED PACKAGE HANDOFF · ZERO PERSON FINDINGS</strong></p>
<div class="grid">
<article class="card"><b>${report.counts.package_entries}</b>exact entries</article>
<article class="card"><b>${report.counts.corrupted_package_decline_probes}</b>safe-decline probe</article>
<article class="card"><b>${report.counts.recipient_package_acknowledgments}</b>package receipt</article>
<article class="card"><b>${report.counts.complete_bounded_package_handoffs}</b>bounded completion</article>
</div>
<section class="contract"><h2>Complete bounded handoff chain</h2><ol>${components}</ol>
<p><code>${escapeHtml(report.control.package_manifest.combined_sha256)}</code></p></section>
<section class="ceiling"><h2>Authority ceiling</h2><pre>complete bounded package ≠ complete production system
fresh job ≠ external institution
process separation ≠ independent human review
complete process handoff ≠ person-level custody
control success ≠ operator promotion</pre></section>
</body></html>
`;
}

export function buildAll() {
  const source = readJson(SOURCE_PATH);
  const packageManifest = derivePackageManifest(source);
  fs.writeFileSync(path.join(ROOT, PACKAGE_MANIFEST_PATH), stableJson(packageManifest));
  const registry = deriveRegistry(source, packageManifest);
  fs.writeFileSync(path.join(ROOT, REGISTRY_PATH), stableJson(registry));
  const releaseManifest = deriveReleaseManifest(source);
  fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), stableJson(releaseManifest));
  const report = deriveReport(source, packageManifest, releaseManifest);
  fs.mkdirSync(path.dirname(path.join(ROOT, REPORT_PATH)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, REPORT_PATH), stableJson(report));
  fs.writeFileSync(path.join(ROOT, HTML_PATH), renderHtml(report));
  return { source, packageManifest, registry, releaseManifest, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { source } = buildAll();
  console.log(`build-counter-selector-wave-34: ${source.counts.complete_bounded_package_handoffs} complete bounded handoff`);
}
