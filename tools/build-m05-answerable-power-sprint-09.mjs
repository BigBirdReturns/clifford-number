#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const readBytes = (relativePath) => fs.readFileSync(path.join(root, relativePath));
const write = (relativePath, value) => {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};

export const releaseScope = [
  '.github/workflows/m05-answerable-power-sprint-09.yml',
  'data/project/m05-answerable-power-sprint-09-plan.json',
  'data/project/m05-answerable-power-sprint-09-field-gate.json',
  'data/project/m05-answerable-power-sprint-09-candidate-registry.json',
  'data/project/m05-answerable-power-sprint-09-no-adverse-prospectus.json',
  'data/project/m05-answerable-power-sprint-09-outreach-ledger.json',
  'docs/methods/answerable-power-question-4-field-campaign.md',
  'docs/milestones/m05-answerable-power-sprint-09.md',
  'tools/build-m05-answerable-power-sprint-09.mjs',
  'tools/validate-m05-answerable-power-sprint-09.mjs',
  'test/m05-answerable-power-sprint-09.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((relativePath) => {
    const bytes = readBytes(relativePath);
    return {
      path: relativePath,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length
    };
  });
  const combinedSha256 = crypto
    .createHash('sha256')
    .update(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join(''))
    .digest('hex');
  return {
    schema_version: 'm05-answerable-power-sprint-09-release-manifest@1',
    program_id: 'M-05',
    sprint_id: 'M05-SPRINT-09',
    as_of: '2026-07-29',
    hash_mode: 'sha256_exact_utf8_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: combinedSha256,
    boundaries: {
      exact_bytes_prove_external_contact: false,
      exact_bytes_prove_candidate_willingness: false,
      release_manifest_proves_field_use: false,
      combined_hash_advances_adoption: false,
      manifest_authorizes_real_person_pilot: false
    }
  };
}

export function buildReport({ plan, fieldGate, candidateRegistry, prospectus, outreachLedger, manifest }) {
  return {
    schema_version: 'm05-answerable-power-sprint-09-report@1',
    program_id: 'M-05',
    sprint_id: 'M05-SPRINT-09',
    title: plan.title,
    status: plan.status,
    as_of: plan.as_of,
    dependencies: plan.dependencies,
    question: fieldGate.question,
    counts: {
      field_stages: fieldGate.field_sequence.length,
      candidate_records: candidateRegistry.records.length,
      jurisdictions: candidateRegistry.counts.jurisdictions,
      rights_impacting_gateholders: candidateRegistry.counts.rights_impacting_gateholders,
      lower_adverse_rehearsal_hosts: candidateRegistry.counts.lower_adverse_rehearsal_hosts,
      oversight_or_review_components: candidateRegistry.counts.oversight_or_review_components,
      transparency_infrastructures: candidateRegistry.counts.transparency_infrastructures,
      affected_party_standing_candidates: candidateRegistry.counts.affected_party_standing_candidates,
      secure_evidence_custody_infrastructures: candidateRegistry.counts.secure_evidence_custody_infrastructures,
      eligible_shadow_modes: prospectus.eligible_shadow_modes.length,
      prohibited_uses: prospectus.prohibited_uses.length,
      technical_firewall_requirements: prospectus.technical_firewall_requirements.length,
      legal_and_operating_firewall_requirements: prospectus.legal_and_operating_firewall_requirements.length,
      affected_party_standing_requirements: prospectus.affected_party_standing_requirements.length,
      independent_custody_requirements: prospectus.independent_custody_requirements.length,
      preregistration_fields: prospectus.preregistration_fields.length,
      failure_denominator_requirements: prospectus.failure_denominator_requirements.length,
      automatic_stop_conditions: prospectus.automatic_stop_conditions.length,
      required_public_receipts: prospectus.required_public_receipts.length,
      admission_predicates: prospectus.admission_predicates.length,
      ...outreachLedger.counts,
      candidates_contacted: outreachLedger.counts.contacted
    },
    field_gate: {
      path: 'data/project/m05-answerable-power-sprint-09-field-gate.json',
      field_sequence: fieldGate.field_sequence,
      parallel_work: fieldGate.parallel_work,
      works_standard: fieldGate.works_standard,
      magic_human_boundary: fieldGate.magic_human_boundary
    },
    candidate_registry: {
      path: 'data/project/m05-answerable-power-sprint-09-candidate-registry.json',
      source_issues: candidateRegistry.source_issues,
      default_state: candidateRegistry.default_state,
      counts: candidateRegistry.counts,
      records: candidateRegistry.records.map(({ candidate_id, name, jurisdiction, role_class }) => ({ candidate_id, name, jurisdiction, role_class }))
    },
    no_adverse_prospectus: {
      path: 'data/project/m05-answerable-power-sprint-09-no-adverse-prospectus.json',
      public_intake_issue: prospectus.public_intake_issue,
      eligible_shadow_modes: prospectus.eligible_shadow_modes,
      admission_predicates: prospectus.admission_predicates
    },
    outreach_ledger: outreachLedger,
    current_result: plan.current_result,
    release_manifest: {
      path: 'data/project/m05-answerable-power-sprint-09-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    },
    boundaries: plan.boundaries
  };
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[character]));

export function renderHtml(report) {
  const stageRows = report.field_gate.field_sequence.map((row) =>
    `<tr><td><code>${escapeHtml(row.stage_id)}</code></td><td>${escapeHtml(row.name)}</td><td><code>${escapeHtml(row.target_state)}</code></td><td><code>${escapeHtml(row.current_state)}</code></td><td>${row.external_effect_observed ? 'yes' : 'no'}</td></tr>`
  ).join('');
  const candidateRows = report.candidate_registry.records.map((row) =>
    `<tr><td><code>${escapeHtml(row.candidate_id)}</code></td><td>${escapeHtml(row.name)}</td><td><code>${escapeHtml(row.jurisdiction)}</code></td><td><code>${escapeHtml(row.role_class)}</code></td><td><code>${escapeHtml(report.candidate_registry.default_state.status)}</code></td><td><code>${escapeHtml(report.candidate_registry.default_state.contact_state)}</code></td></tr>`
  ).join('');
  const admissionRows = report.no_adverse_prospectus.admission_predicates.map((value, index) =>
    `<tr><td>${index + 1}</td><td><code>${escapeHtml(value)}</code></td><td>required</td></tr>`
  ).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Sprint 09 · Question 4 field campaign</title><style>body{font:16px/1.55 system-ui;max-width:1500px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}.small{font-size:.9rem;color:#4c463d}</style></head><body><p><b>CLIFFORD NUMBER · M-05 · SPRINT 09</b></p><h1>${escapeHtml(report.title)}</h1><p class="state">VERIFIED CEILING: A0 · NO EXTERNAL RECEIPT, A1 ENTRY, FIELD USE, OR REAL-PERSON PILOT</p><p>${escapeHtml(report.question)}</p><div class="metrics"><div class="metric"><b>${report.counts.field_stages}</b>F0–F7 stages</div><div class="metric"><b>${report.counts.candidate_records}</b>candidate records</div><div class="metric"><b>${report.counts.jurisdictions}</b>jurisdictions</div><div class="metric"><b>${report.counts.eligible_shadow_modes}</b>no-adverse modes</div><div class="metric"><b>${report.counts.candidates_contacted}</b>candidates contacted</div><div class="metric"><b>${report.current_result.A3_no_adverse_shadow_uses}</b>A3 uses</div></div><h2>Field sequence</h2><table><tr><th>Stage</th><th>Name</th><th>Target</th><th>Verified state</th><th>External effect</th></tr>${stageRows}</table><h2>Role-neutral candidate denominator</h2><p class="small">Every record begins candidate-only, not contacted, unselected, and with no adoption effect.</p><table><tr><th>ID</th><th>Candidate</th><th>Jurisdiction</th><th>Role class</th><th>Status</th><th>Contact</th></tr>${candidateRows}</table><h2>F4 admission predicates</h2><p class="small">No weighted score applies. One false or unresolved material predicate blocks admission.</p><table><tr><th>#</th><th>Predicate</th><th>Law</th></tr>${admissionRows}</table><h2>Outreach and adoption state</h2><pre class="box">${escapeHtml(JSON.stringify(report.outreach_ledger, null, 2))}</pre><h2>Current result</h2><pre class="box">${escapeHtml(JSON.stringify(report.current_result, null, 2))}</pre><h2>Boundary</h2><pre class="box boundary">${escapeHtml(JSON.stringify(report.boundaries, null, 2))}</pre><p><code>release SHA-256: ${report.release_manifest.combined_sha256}</code></p></body></html>\n`;
}

export function buildSprint09() {
  const plan = read('data/project/m05-answerable-power-sprint-09-plan.json');
  const fieldGate = read('data/project/m05-answerable-power-sprint-09-field-gate.json');
  const candidateRegistry = read('data/project/m05-answerable-power-sprint-09-candidate-registry.json');
  const prospectus = read('data/project/m05-answerable-power-sprint-09-no-adverse-prospectus.json');
  const outreachLedger = read('data/project/m05-answerable-power-sprint-09-outreach-ledger.json');
  const manifest = computeReleaseManifest();
  write('data/project/m05-answerable-power-sprint-09-release-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  const report = buildReport({ plan, fieldGate, candidateRegistry, prospectus, outreachLedger, manifest });
  write('reports/core-thesis/answerable-power/sprint-09.json', `${JSON.stringify(report, null, 2)}\n`);
  write('reports/core-thesis/answerable-power/sprint-09.html', renderHtml(report));
  return { report, manifest };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const { report } = buildSprint09();
  console.log(`build-m05-answerable-power-sprint-09: ${report.counts.field_stages} stages, ${report.counts.candidate_records} candidates, ${report.counts.jurisdictions} jurisdictions, ceiling ${report.current_result.maximum_verified_adoption_level}`);
}
