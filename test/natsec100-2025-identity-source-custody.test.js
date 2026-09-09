import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(HERE, '..');
const intakeRoot = path.join(root, 'data', 'intake', 'natsec100-pathways');
const chunk1 = path.join(intakeRoot, 'chunk1');
const summaryPath = path.join(chunk1, 'roster-2025-identity-source-custody.json');
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const packetRoot = path.join(root, summary.packet_path);
const manifestPath = path.join(packetRoot, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const readme = readFileSync(path.join(intakeRoot, 'README.md'), 'utf8');

const sha256File = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const formatInteger = value => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const verifier = execFileSync('python3', [
  path.join(packetRoot, 'verify.py'),
  '--self-test',
], { encoding: 'utf8' });
const verifierResult = JSON.parse(verifier.trim());

assert.deepEqual(verifierResult, {
  adjudication_rows: 23,
  archive_members: manifest.archive.members,
  capture_manifest_combined_sha256: manifest.source_inputs.capture_manifest_combined_sha256,
  captured_body_bytes: manifest.denominator.captured_body_bytes,
  case_receipt_admission: 'none',
  cookie_values_redacted: manifest.denominator.server_cookie_values_redacted,
  current_repository_inputs_bound: 4,
  identity_promotion: 'none',
  rejected_negative_controls: 14,
  source_routes: manifest.denominator.evidence_routes,
  verified: true,
});

assert.equal(summary.schema_version, 'natsec100-2025-identity-source-custody-summary@1');
assert.equal(summary.status, 'source_custody_complete_case_receipt_admission_pending');
assert.equal(summary.base_commit, manifest.base_commit,
  'summary must preserve the acquisition base');
assert.equal(summary.packet_archive_sha256,
  sha256File(path.join(packetRoot, 'sources.zip')),
  'summary must bind the retained source archive');
assert.equal(summary.packet_manifest_sha256, sha256File(manifestPath),
  'summary must bind the packet manifest');
assert.equal(summary.capture_manifest_combined_sha256,
  manifest.source_inputs.capture_manifest_combined_sha256,
  'summary must bind the raw-capture manifest');

assert.deepEqual(summary.counts, {
  adjudication_rows: manifest.denominator.adjudicated_identity_candidates,
  allowed_final_host_routes: manifest.denominator.evidence_routes,
  archive_members: manifest.archive.members,
  captured_body_bytes: manifest.denominator.captured_body_bytes,
  case_receipts_admitted: manifest.denominator.case_receipts_admitted,
  current_repository_inputs_bound: 4,
  evidence_routes: manifest.denominator.evidence_routes,
  exact_brand_domain_candidates_supported: 19,
  existing_alias_website_updates_supported: 2,
  identity_content_coding_routes: manifest.denominator.identity_content_coding_routes,
  identity_rows_promoted: manifest.denominator.identity_rows_promoted,
  legal_entity_successions_established: 0,
  rejected_negative_controls: 14,
  server_cookie_values_redacted: manifest.denominator.server_cookie_values_redacted,
  successor_brand_continuity_candidates_supported: 2,
  terminal_http_200_routes: manifest.denominator.terminal_http_200_routes,
  tls_verified_routes: manifest.denominator.tls_verified_routes,
  unique_final_hosts: manifest.denominator.unique_final_hosts,
}, 'summary must derive the complete bounded source-custody result');
assert.deepEqual(summary.scope, {
  actor_hop_effect: 'none',
  case_receipt_ledger_effect: 'none',
  company_registry_effect: 'none',
  company_year_effect: 'none',
  cross_case_identity_effect: 'none',
  graph_effect: 'none',
  source_custody_effect: 'complete_for_26_declared_evidence_routes',
}, 'source custody must not become receipt admission or identity promotion');

const expectedStatusLines = [
  `2025 identity-source routes custodied:             ${summary.counts.evidence_routes}`,
  `2025 identity-source body bytes:            ${formatInteger(summary.counts.captured_body_bytes)}`,
  `2025 case receipt admissions:                       ${summary.counts.case_receipts_admitted}`,
  `2025 identity promotions:                            ${summary.counts.identity_rows_promoted}`,
];
for (const line of expectedStatusLines) {
  assert.ok(readme.includes(line), `NatSec100 source-custody status drift: missing ${line}`);
}
assert.match(readme, /source custody admits a case receipt automatically: false/,
  'custody must remain distinct from case receipt admission');
assert.match(readme, /Admit the 26 already-custodied identity source objects/,
  'the current frontier must start at receipt admission, not repeat acquisition');
assert.doesNotMatch(readme, /external identity evidence has not yet been separately acquired/i,
  'completed source acquisition must not remain documented as pending');

console.log(
  `natsec100-2025-identity-source-custody.test: OK `
  + `(${summary.counts.evidence_routes} routes, ${formatInteger(summary.counts.captured_body_bytes)} bytes, `
  + `${summary.counts.case_receipts_admitted} receipt admissions, `
  + `${summary.counts.identity_rows_promoted} identity promotions)`,
);