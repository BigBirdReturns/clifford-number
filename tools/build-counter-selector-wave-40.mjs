#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-40-cross-host-registry.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-40-control-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-40-release-manifest.json';
const METHOD_PATH = 'docs/methods/counter-selector-cross-host-registry.md';
const MILESTONE_PATH = 'docs/milestones/counter-selector-wave-40.md';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-40/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-40/index.html';

export const STATIC_MANIFEST_PATHS = [
  '.github/workflows/counter-selector-wave-40.yml',
  SOURCE_PATH,
  'schemas/counter-selector-cross-host-registry.schema.json',
  METHOD_PATH,
  MILESTONE_PATH,
  'tools/build-counter-selector-wave-40.mjs',
  'tools/validate-counter-selector-wave-40.mjs',
  'test/counter-selector-wave-40.test.js',
];

export function stableJson(value) { return `${JSON.stringify(value, null, 2)}\n`; }
export function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
export function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')); }

function bool(value) { return value ? 'yes' : 'no'; }
function codeList(values) { return values.map(value => `- \`${value}\``).join('\n'); }

export function deriveRegistry(source) {
  return {
    schema_version: 'counter-selector-wave-40-control-registry@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    parent_wave_ids: source.parent_wave_ids,
    as_of: source.as_of,
    status: source.status,
    counts: source.counts,
    controls: source.controls.map(control => ({
      control_id: control.control_id,
      public_label: control.public_label,
      system_or_subject: control.system_or_subject,
      source_record_count: control.source_records.length,
      documented_registry_route: control.adjudication.documented_checkpoint_image_registry_migration_route,
      registry_push: control.adjudication.registry_push_route,
      different_system_pull: control.adjudication.registry_pull_on_different_system,
      restore_from_pulled_image: control.adjudication.restore_from_pulled_checkpoint_image,
      observed_round_trip: control.adjudication.observed_registry_round_trip,
      public_fixed_checkpoint_digest_receipt: control.adjudication.public_fixed_checkpoint_digest_receipt,
      cross_host_application_continuation: control.adjudication.cross_host_application_continuation,
      clean_destination_operation: control.adjudication.clean_destination_operation,
      compatibility_metadata: control.adjudication.checkpoint_compatibility_metadata,
      runtime_mismatch_refusal: control.adjudication.runtime_mismatch_refusal,
      complete_portable_operational_handoff: false,
      person_support_added: false,
      classification: control.adjudication.classification,
      operator_finding: false,
      field_test_eligible: false,
      contact_authorized: false,
      graph_effect: 'none',
    })),
    join_matrix: source.join_matrix,
    boundaries: source.boundaries,
    graph_effect: 'none',
  };
}

export function renderMethod(source) {
  const controls = source.controls.map(control => `## ${control.control_id} — ${control.public_label}\n\n` +
    `**System:** ${control.system_or_subject}\n\n` +
    `**Classification:** \`${control.adjudication.classification}\`\n\n` +
    `### Positive findings\n\n${control.positive_findings.map(item => `- ${item}`).join('\n')}\n\n` +
    `### Known limits\n\n${control.known_limits.map(item => `- ${item}`).join('\n')}\n\n` +
    `### Source custody\n\n${control.source_records.map(record => `- \`${record.source_id}\` — ${record.publisher}, “${record.title}” (${record.source_class}).`).join('\n')}`
  ).join('\n\n');

  return `# Counter-Selector cross-host registry method\n\n` +
    `## Purpose\n\n${source.purpose}\n\n` +
    `## Same-object rule\n\nA completion component may be credited only when it belongs to the same package instance, destination, authority state, dependency inventory, successor operation, and review chain. Documentation, package variants, systems, recipients, and operations may not lend missing components to one another.\n\n` +
    `## Required component order\n\n${codeList(source.handoff_contract.component_order)}\n\n` +
    `## Adjudicated controls\n\n${controls}\n\n` +
    `## Non-combinability\n\n\`\`\`text\n` +
    `documented checkpoint-image push/pull/restore route\n+ cross-host checkpoint-archive application continuation\n+ compatibility metadata and fail-closed runtime refusal\n≠ one observed fixed-digest clean-destination operational handoff\n\`\`\`\n\n` +
    `## Authority ceiling\n\nThis method authorizes no external contact, outside-human dependency, physical action, local-machine action, artifact transfer by the project owner, field test, person ranking, public identity profile, promotion, or graph effect. Missing external or physical evidence remains unproven and does not become a user task.\n\n` +
    `## Next action\n\n${source.next_action}\n`;
}

export function renderMilestone(source) {
  const c = source.counts;
  return `# Counter-Selector Wave 40 — cross-host registry migration and application continuation\n\n` +
    `## Result\n\nWave 40 records one bounded documented checkpoint-image registry migration route and one distinct cross-host checkpoint-archive application-continuation receipt. The route and receipt are separate package variants and do not combine into one completed handoff.\n\n` +
    `\`\`\`text\n` +
    `documented checkpoint-image registry migration routes     ${c.documented_checkpoint_image_registry_migration_routes}\n` +
    `registry push route surfaces                              ${c.registry_push_route_surfaces}\n` +
    `different-system pull surfaces                            ${c.registry_pull_on_different_system_surfaces}\n` +
    `restore-from-pulled-image surfaces                        ${c.restore_from_pulled_checkpoint_image_surfaces}\n` +
    `cross-host archive application continuations              ${c.cross_host_archive_application_continuation_surfaces}\n` +
    `runtime-mismatch refusal surfaces                         ${c.runtime_mismatch_refusal_surfaces}\n\n` +
    `observed registry round-trip receipts                     ${c.observed_registry_round_trip_receipts}\n` +
    `public fixed checkpoint-digest receipts                   ${c.public_fixed_checkpoint_digest_receipts}\n` +
    `clean-destination operation surfaces                      ${c.clean_destination_operation_surfaces}\n` +
    `package-inventory recipient acknowledgments               ${c.package_inventory_recipient_acknowledgments}\n` +
    `complete portable operational handoffs                    ${c.complete_portable_operational_handoffs}\n` +
    `person supports / contacts / graph effects            ${c.person_dimension_supports_added} / ${c.contacts_authorized} / ${c.graph_effects}\n` +
    `adversarial mutations                                    ${c.adversarial_mutations}\n` +
    `exact-contract tamper cases                               ${c.exact_contract_tamper_cases}\n` +
    `\`\`\`\n\n` +
    `## Documented registry route\n\n` +
    `The checkpoint-image control documents this route:\n\n` +
    `\`\`\`text\nsource container checkpointed into OCI image\n→ image pushed to registry\n→ image pulled on a different system\n→ restore requested from pulled image\n\`\`\`\n\n` +
    `This is a documented route, not an observed round-trip receipt. No literal fixed digest is retained as the public checkpoint receipt, and no application-specific output is asserted from the pulled image.\n\n` +
    `## Cross-host archive continuation\n\n` +
    `The separate archive control observes application state on the source host, transfers a checkpoint archive to another host, restores it there, and observes the next application state. The destination still requires the original base image separately. This is real cross-host application continuation, but it is not the registry checkpoint-image variant.\n\n` +
    `## Compatibility boundary\n\n` +
    `Checkpoint metadata records runtime compatibility information, and restore refuses materially incompatible runtime state unless explicit override is used. That fail-closed boundary does not amount to a complete dependency inventory or rollback receipt.\n\n` +
    `## Current answer\n\n` +
    `\`\`\`text\n` +
    `Is a checkpoint-image registry migration route documented?       ${bool(c.documented_checkpoint_image_registry_migration_routes === 1)}\n` +
    `Was the registry round trip observed in one receipt?              ${bool(c.observed_registry_round_trip_receipts === 1)}\n` +
    `Was application continuation observed across hosts?               ${bool(c.cross_host_archive_application_continuation_surfaces === 1)}\n` +
    `Was that continuation from the registry image variant?            no\n` +
    `Is a clean destination proved?                                    ${bool(c.clean_destination_operation_surfaces === 1)}\n` +
    `Is a literal public fixed checkpoint digest retained?             ${bool(c.public_fixed_checkpoint_digest_receipts === 1)}\n` +
    `Did a recipient acknowledge an itemized package inventory?        ${bool(c.package_inventory_recipient_acknowledgments === 1)}\n` +
    `Has a complete portable operational handoff been found?           ${bool(c.complete_portable_operational_handoffs === 1)}\n` +
    `Did any person gain support, contact, ranking, or graph effect?    no\n` +
    `\`\`\`\n\n` +
    `## Next frontier\n\n${source.next_action}\n`;
}

export function deriveManifest(source) {
  const entries = STATIC_MANIFEST_PATHS.map(relativePath => {
    const bytes = fs.readFileSync(path.join(ROOT, relativePath));
    return { path: relativePath, sha256: sha256(bytes), bytes: bytes.length };
  });
  const combined = sha256(Buffer.from(entries.map(entry => `${entry.path}\t${entry.sha256}\t${entry.bytes}\n`).join(''), 'utf8'));
  return {
    schema_version: 'counter-selector-wave-40-release-manifest@1',
    program_id: source.program_id,
    wave_id: source.wave_id,
    as_of: source.as_of,
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: combined,
    boundaries: {
      exact_bytes_prove_source_truth: false,
      exact_bytes_prove_observed_registry_round_trip: false,
      exact_bytes_prove_public_fixed_checkpoint_digest: false,
      exact_bytes_prove_inventory_acknowledgment: false,
      exact_bytes_prove_clean_destination: false,
      exact_bytes_prove_complete_portable_handoff: false,
      exact_bytes_prove_person_support: false,
      exact_bytes_prove_external_review: false,
      manifest_authorizes_contact: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_ranking: false,
      manifest_authorizes_public_identity_profile: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none',
    },
  };
}

export function deriveReport(source, manifest) {
  return {
    schema_version: 'counter-selector-wave-40-report@1',
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
    controls: source.controls,
    join_matrix: source.join_matrix,
    boundaries: source.boundaries,
    next_action: source.next_action,
    release_manifest: { path: MANIFEST_PATH, combined_sha256: manifest.combined_sha256 },
    graph_effect: 'none',
  };
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function renderHtml(report) {
  const rows = report.controls.map(control => `<tr><td><code>${escapeHtml(control.control_id)}</code></td><td>${escapeHtml(control.system_or_subject)}</td><td>${escapeHtml(control.adjudication.classification)}</td><td>${bool(control.adjudication.documented_checkpoint_image_registry_migration_route)}</td><td>${bool(control.adjudication.observed_registry_round_trip)}</td><td>${bool(control.adjudication.cross_host_application_continuation)}</td><td>${bool(control.adjudication.clean_destination_operation)}</td><td>no</td></tr>`).join('');
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 40</title>\n<style>:root{font-family:system-ui,sans-serif;background:#f3f0e9;color:#191816}body{max-width:1240px;margin:auto;padding:40px 24px;line-height:1.5}h1{font-size:clamp(2.2rem,6vw,4.8rem);line-height:.96;letter-spacing:-.04em}.state{font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c9c0b0;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:28px;font-size:.84rem}th,td{padding:10px;border-bottom:1px solid #ded6c9;text-align:left;vertical-align:top}.boundary{padding:18px;margin-top:28px}code{overflow-wrap:anywhere}</style></head>\n<body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W40-RM-01</strong></p>\n<h1>The route crossed hosts; the receipt did not cross variants.</h1>\n<p class="state">ONE DOCUMENTED REGISTRY ROUTE · ONE CROSS-HOST ARCHIVE CONTINUATION · ZERO OBSERVED REGISTRY ROUND TRIPS · ZERO COMPLETE PORTABLE OPERATIONAL HANDOFFS</p>\n<div class="grid"><article class="card"><b>${report.counts.documented_checkpoint_image_registry_migration_routes}</b>documented registry route</article><article class="card"><b>${report.counts.cross_host_archive_application_continuation_surfaces}</b>cross-host application continuation</article><article class="card"><b>${report.counts.observed_registry_round_trip_receipts}</b>observed registry round trips</article><article class="card"><b>${report.counts.package_inventory_recipient_acknowledgments}</b>inventory acknowledgments</article></div>\n<table><thead><tr><th>ID</th><th>System</th><th>Classification</th><th>Registry route</th><th>Observed round trip</th><th>Cross-host app</th><th>Clean destination</th><th>Complete</th></tr></thead><tbody>${rows}</tbody></table>\n<div class="boundary"><strong>Scope ceiling</strong><pre>documented registry route ≠ observed registry round trip\ndifferent host ≠ clean destination\nimage tag ≠ public fixed checkpoint digest\narchive application continuation ≠ registry-image continuation\nbase-image availability ≠ self-contained package\ncompatibility refusal ≠ complete dependency inventory\ncross-control fragments ≠ one complete handoff</pre></div>\n</body></html>\n`;
}

export function buildAll() {
  const source = readJson(SOURCE_PATH);
  fs.mkdirSync(path.dirname(path.join(ROOT, METHOD_PATH)), { recursive: true });
  fs.mkdirSync(path.dirname(path.join(ROOT, MILESTONE_PATH)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, METHOD_PATH), renderMethod(source));
  fs.writeFileSync(path.join(ROOT, MILESTONE_PATH), renderMilestone(source));

  const registry = deriveRegistry(source);
  fs.writeFileSync(path.join(ROOT, REGISTRY_PATH), stableJson(registry));
  const manifest = deriveManifest(source);
  fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), stableJson(manifest));
  const report = deriveReport(source, manifest);
  fs.mkdirSync(path.dirname(path.join(ROOT, REPORT_PATH)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, REPORT_PATH), stableJson(report));
  fs.writeFileSync(path.join(ROOT, HTML_PATH), renderHtml(report));
  return { source, registry, manifest, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { source } = buildAll();
  console.log(`build-counter-selector-wave-40: ${source.counts.documented_checkpoint_image_registry_migration_routes} documented registry route, ${source.counts.cross_host_archive_application_continuation_surfaces} cross-host application continuation, ${source.counts.complete_portable_operational_handoffs} complete portable handoffs`);
}
