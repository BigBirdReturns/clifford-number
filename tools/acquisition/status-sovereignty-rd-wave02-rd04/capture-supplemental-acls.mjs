#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const V3_ROOT = path.resolve(process.env.RD04_CROSSREF_V3_ARTIFACT || '/tmp/rd04-crossref-v3');
export const AUTH_ROOT = path.resolve(process.env.RD04_AUTHORITY_UNITS_V2 || '/tmp/rd04-authority-units-v2');
export const ID_ROOT = path.resolve(process.env.RD04_SOURCE_IDENTITIES_V2 || '/tmp/rd04-source-identities-v2');
export const OUTPUT = path.resolve(process.env.RD04_SUPPLEMENTAL_ACL_OUTPUT || '/tmp/rd04-supplemental-acls');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const writeJson = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const now = () => new Date().toISOString();
const ensureFile = (target) => { if (!fs.existsSync(target)) fs.writeFileSync(target, Buffer.alloc(0)); };
const rel = (target) => path.relative(OUTPUT, target).split(path.sep).join('/');
const normalize = (value) => value
  .normalize('NFKC')
  .replace(/[‐‑‒–—−]/g, '-')
  .replace(/[’‘]/g, "'")
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

export const SUPPLEMENTAL_UNITS = Object.freeze([
  {
    execution_unit_id: 'AUTH-CA-ACL-20-145',
    reference_id: 'CA-ACL-20-145',
    official_url: 'https://www.cdss.ca.gov/Portals/9/Additional-Resources/Letters-and-Notices/ACLs/2020/20-145.pdf',
    expected_markers: ['20-145', 'elderly simplified application project'],
    title: 'CalFresh Elderly Simplified Application Project Extension Approval'
  },
  {
    execution_unit_id: 'AUTH-CA-ACL-21-101',
    reference_id: 'CA-ACL-21-101',
    official_url: 'https://cdss.ca.gov/Portals/9/Additional-Resources/Letters-and-Notices/ACLs/2021/21-101.pdf?ver=2021-10-21-105820-070',
    expected_markers: ['21-101', 'calfresh mid-period actions'],
    title: 'CalFresh Mid-Period Actions'
  },
  {
    execution_unit_id: 'AUTH-CA-ACL-21-101E',
    reference_id: 'CA-ACL-21-101E',
    official_url: 'https://cdss.ca.gov/Portals/9/Additional-Resources/Letters-and-Notices/ACLs/2021/21-101E.pdf?ver=D-6FyzHbElAsVXdJostzxw%3D%3D',
    expected_markers: ['21-101e', 'errata', 'calfresh mid-period actions'],
    title: 'Errata To All County Letter No. 21-101 CalFresh Mid-Period Actions'
  },
  {
    execution_unit_id: 'AUTH-CA-ACL-23-100',
    reference_id: 'CA-ACL-23-100',
    official_url: 'https://www.cdss.ca.gov/Portals/9/Additional-Resources/Letters-and-Notices/ACLs/2023/23-100.pdf?ver=2023-12-22-112941-910',
    expected_markers: ['23-100', 'provider determination notice'],
    title: 'CalFresh Employment And Training Provider Determination Notice'
  },
  {
    execution_unit_id: 'AUTH-CA-ACL-23-107',
    reference_id: 'CA-ACL-23-107',
    official_url: 'https://www.cdss.ca.gov/Portals/9/Additional-Resources/Letters-and-Notices/ACLs/2023/23-107.pdf?ver=2024-01-04-164629-227',
    expected_markers: ['23-107', 'able-bodied adults without dependents', 'fiscal responsibility act of 2023'],
    title: 'CalFresh Revised Able-Bodied Adults Without Dependents Time Limit Notices And Forms Updates Due To The Fiscal Responsibility Act Of 2023'
  }
]);

export const PROTOCOL = Object.freeze({
  maximum_attempts_per_route: 2,
  connect_timeout_seconds: 15,
  total_timeout_seconds: 60,
  concurrent_routes: 5,
  redirect_following: true,
  outcome_selected_retry: false
});

function verifyExactFile(target, bytes, digest, label) {
  const data = fs.readFileSync(target);
  ok(data.length === bytes, `${label}: byte count changed`);
  ok(sha256(data) === digest, `${label}: digest changed`);
  return data;
}

function verifyInputs() {
  const v3RegistryBytes = verifyExactFile(
    path.join(V3_ROOT, 'registry.json'),
    639149,
    '07b10c99d32da63b3df4c1a804d1108603365ed72320a938f08db12df6e4c9ea',
    'v3 registry'
  );
  verifyExactFile(
    path.join(V3_ROOT, 'delta.json'),
    1115,
    '07d51454485bffdc1f255b2db3d9d807cfdefd5990f32fc614c690cdc4ac91df',
    'v3 delta'
  );
  verifyExactFile(
    path.join(V3_ROOT, 'receipt.json'),
    1317,
    'c5e70e41f51f36c51cd28b8bd5a0a7a4f2b2bf78c2af66adf654814f1d1aab99',
    'v3 receipt'
  );
  const v3 = JSON.parse(v3RegistryBytes.toString('utf8'));
  ok(v3.counts.unique_reference_ids === 159 && v3.counts.new_cross_reference_candidates === 145, 'v3 denominator changed');

  const authBytes = verifyExactFile(
    path.join(AUTH_ROOT, 'authority-units.json'),
    63174,
    'dc513bb82a8a7faab70ce82fb13cea68fe8107b8aa679220a7ff994b95fe6fe4',
    'v2 authority units'
  );
  verifyExactFile(
    path.join(AUTH_ROOT, 'receipt.json'),
    1333,
    '9be2ab407fe8cd5f278bbb67b00b3c298772128165306eae0adbeb78e561f7c9',
    'v2 authority receipt'
  );
  const auth = JSON.parse(authBytes.toString('utf8'));
  ok(auth.counts.candidate_reference_ids === 140 && auth.counts.candidate_authority_units === 79, 'v2 authority denominator changed');

  const priorCombinedBytes = verifyExactFile(
    path.join(ID_ROOT, 'combined-unit-ledger.json'),
    132517,
    'c910e7de98dace5877684c008b0c3b4076cb57d5ef1d86b94b9ec7da8c744476',
    'prior combined identity ledger'
  );
  const priorIdentityBytes = verifyExactFile(
    path.join(ID_ROOT, 'source-identity-ledger.json'),
    142174,
    'd4598dc5b818e26f8c880e3c383aca13c7b6e9a99d3129f0e5a92c8327a08f4a',
    'prior source identity ledger'
  );
  verifyExactFile(
    path.join(ID_ROOT, 'summary.json'),
    2480,
    'aa0d050d42b58bc7c14a561c440a0525377568c7bc7d07612230ad891e123ad6',
    'prior identity summary'
  );
  const priorCombined = JSON.parse(priorCombinedBytes.toString('utf8')).execution_units;
  const priorIdentities = JSON.parse(priorIdentityBytes.toString('utf8')).execution_units;
  ok(priorCombined.length === 93 && priorIdentities.length === 93, 'prior identity denominator changed');

  const v3Candidates = v3.references
    .filter((row) => row.disposition === 'new_cross_reference_candidate')
    .map((row) => row.reference_id);
  const oldMapped = auth.authority_units.flatMap((unit) => unit.reference_ids);
  const oldSet = new Set(oldMapped);
  const supplementalIds = SUPPLEMENTAL_UNITS.map((unit) => unit.reference_id);
  ok(oldSet.size === 140 && oldMapped.length === 140, 'prior candidate mapping not one-to-one');
  ok(v3Candidates.length === 145 && new Set(v3Candidates).size === 145, 'v3 candidate identities changed');
  ok(supplementalIds.every((id) => v3Candidates.includes(id) && !oldSet.has(id)), 'supplemental candidate identity changed');
  ok(v3Candidates.every((id) => oldSet.has(id) || supplementalIds.includes(id)), 'silent v3 candidate');
  return { v3, auth, priorCombined, priorIdentities };
}

export function classifyPdfText(unit, text) {
  const normalized = normalize(text);
  const markerResults = unit.expected_markers.map((marker) => ({
    marker,
    observed: normalized.includes(normalize(marker))
  }));
  const allMarkersObserved = markerResults.every((row) => row.observed);
  return {
    marker_results: markerResults,
    all_markers_observed: allMarkersObserved,
    exact_identity_observed: allMarkersObserved,
    identity_state: allMarkersObserved
      ? 'exact_requested_acl_identity_observed'
      : 'official_pdf_recovered_expected_acl_identity_not_observed'
  };
}

function captureAttempt(unit, attempt, routeDir) {
  return new Promise((resolve) => {
    const attemptDir = path.join(routeDir, `attempt-${attempt}`);
    fs.mkdirSync(attemptDir, { recursive: true });
    const headersPath = path.join(attemptDir, 'headers.txt');
    const bodyPath = path.join(attemptDir, 'body.bin');
    const stderrPath = path.join(attemptDir, 'curl-stderr.txt');
    const metaPath = path.join(attemptDir, 'curl-meta.txt');
    const startedAt = now();
    const args = [
      '--location', '--silent', '--show-error', '--compressed',
      '--connect-timeout', String(PROTOCOL.connect_timeout_seconds),
      '--max-time', String(PROTOCOL.total_timeout_seconds),
      '--user-agent', 'clifford-number-rd04-supplemental-acl/1.0',
      '--header', 'Accept: application/pdf',
      '--dump-header', headersPath,
      '--output', bodyPath,
      '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n%{size_download}\n%{num_redirects}\n',
      unit.official_url
    ];
    const child = spawn('curl', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => { stderr += `${error.stack || error.message}\n`; });
    child.on('close', (code, signal) => {
      const finishedAt = now();
      ensureFile(headersPath);
      ensureFile(bodyPath);
      fs.writeFileSync(stderrPath, stderr, 'utf8');
      fs.writeFileSync(metaPath, stdout, 'utf8');
      const lines = stdout.split(/\r?\n/);
      const httpStatus = Number(lines[0] || 0);
      const finalUrl = lines[1] || unit.official_url;
      const contentType = lines[2] || '';
      const reportedBytes = Number(lines[3] || 0);
      const redirects = Number(lines[4] || 0);
      const body = fs.readFileSync(bodyPath);
      const headers = fs.readFileSync(headersPath);
      const curlExit = Number.isInteger(code) ? code : 255;
      const pdfMagic = body.subarray(0, 5).toString('ascii') === '%PDF-';
      const transportResolved = curlExit === 0 && httpStatus >= 200 && httpStatus < 300 && body.length > 0;
      const pdfResolved = transportResolved && pdfMagic;
      resolve({
        attempt,
        started_at: startedAt,
        finished_at: finishedAt,
        request_url: unit.official_url,
        final_url: finalUrl,
        curl_exit: curlExit,
        termination_signal: signal || null,
        http_status: httpStatus,
        content_type: contentType,
        reported_download_bytes: reportedBytes,
        redirect_count: redirects,
        headers_path: rel(headersPath),
        headers_bytes: headers.length,
        headers_sha256: sha256(headers),
        body_path: rel(bodyPath),
        body_bytes: body.length,
        body_sha256: sha256(body),
        stderr_path: rel(stderrPath),
        stderr_bytes: Buffer.byteLength(stderr),
        meta_path: rel(metaPath),
        pdf_magic_observed: pdfMagic,
        transport_resolved: transportResolved,
        resolved: pdfResolved
      });
    });
  });
}

async function captureUnit(unit, scratch) {
  const routeDir = path.join(OUTPUT, 'routes', unit.execution_unit_id);
  const attempts = [];
  for (let attempt = 1; attempt <= PROTOCOL.maximum_attempts_per_route; attempt += 1) {
    const receipt = await captureAttempt(unit, attempt, routeDir);
    attempts.push(receipt);
    if (receipt.resolved) break;
  }
  const final = attempts.at(-1);
  let extraction = null;
  let identity = {
    marker_results: unit.expected_markers.map((marker) => ({ marker, observed: false })),
    all_markers_observed: false,
    exact_identity_observed: false,
    identity_state: final.resolved ? 'pdf_extraction_failed' : 'source_unavailable_after_fixed_protocol'
  };
  if (final.resolved) {
    const textPath = path.join(scratch, `${unit.execution_unit_id}.txt`);
    const result = spawnSync('pdftotext', ['-layout', '-enc', 'UTF-8', path.join(OUTPUT, final.body_path), textPath], { encoding: 'utf8' });
    if (result.status === 0) {
      const text = fs.readFileSync(textPath, 'utf8');
      identity = classifyPdfText(unit, text);
      extraction = {
        method: 'pdftotext_layout_utf8',
        text_bytes: Buffer.byteLength(text),
        text_sha256: sha256(Buffer.from(text, 'utf8')),
        evidence_excerpt: normalize(text).slice(0, 500)
      };
    }
  }
  return {
    execution_unit_id: unit.execution_unit_id,
    unit_origin: 'v3_supplemental_candidate_authority_unit',
    authority_class: 'california_all_county_letter',
    reference_ids: [unit.reference_id],
    exact_title: unit.title,
    official_url: unit.official_url,
    expected_markers: unit.expected_markers,
    protocol: PROTOCOL,
    attempts,
    attempt_count: attempts.length,
    source_capture_terminal: true,
    terminal_source_state: final.resolved ? 'official_pdf_recovered' : 'source_unavailable_after_fixed_protocol',
    selected_body_path: final.resolved ? final.body_path : null,
    selected_body_bytes: final.resolved ? final.body_bytes : null,
    selected_body_sha256: final.resolved ? final.body_sha256 : null,
    extraction,
    source_identity_adjudicated: true,
    source_identity_state: identity.identity_state,
    exact_source_identity_observed: identity.exact_identity_observed,
    identity_marker_results: identity.marker_results,
    identity_decision_changes_reviewed_disposition: false,
    chronology_state: 'not_adjudicated',
    version_edges_adjudicated: 0,
    class_effect: 'none',
    graph_effect: 'none'
  };
}

function walk(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

export async function main() {
  const inputs = verifyInputs();
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'rd04-supplemental-acls-'));
  try {
    const results = await Promise.all(SUPPLEMENTAL_UNITS.map((unit) => captureUnit(unit, scratch)));
    results.sort((a, b) => a.execution_unit_id.localeCompare(b.execution_unit_id));
    const combined = [...inputs.priorCombined, ...results].sort((a, b) => a.execution_unit_id.localeCompare(b.execution_unit_id));
    const supplementalAuthorityUnits = SUPPLEMENTAL_UNITS.map((unit) => ({
      authority_unit_id: unit.execution_unit_id,
      authority_class: 'california_all_county_letter',
      locator_strategy: 'official_cdss_annual_archive_exact_acl_identity',
      reference_ids: [unit.reference_id],
      reference_classes: ['california_all_county_letter'],
      source_ids: inputs.v3.references.find((row) => row.reference_id === unit.reference_id).source_ids,
      occurrence_count: inputs.v3.references.find((row) => row.reference_id === unit.reference_id).occurrence_count,
      identity_state: results.find((row) => row.execution_unit_id === unit.execution_unit_id).source_identity_state,
      source_state: results.find((row) => row.execution_unit_id === unit.execution_unit_id).terminal_source_state,
      chronology_state: 'not_adjudicated',
      version_edges_adjudicated: 0,
      class_effect: 'none'
    }));
    const combinedAuthorityUnits = [...inputs.auth.authority_units, ...supplementalAuthorityUnits]
      .sort((a, b) => a.authority_unit_id.localeCompare(b.authority_unit_id));
    const totalAttempts = results.reduce((sum, row) => sum + row.attempt_count, 0);
    const exact = results.filter((row) => row.exact_source_identity_observed).length;
    const unavailable = results.filter((row) => row.terminal_source_state === 'source_unavailable_after_fixed_protocol').length;
    const identityNonlinks = results.filter((row) => !row.exact_source_identity_observed && row.terminal_source_state !== 'source_unavailable_after_fixed_protocol').length;
    ok(results.length === 5 && combined.length === 98, 'combined execution denominator changed');
    ok(new Set(combined.map((row) => row.execution_unit_id)).size === 98, 'duplicate execution unit');
    ok(combinedAuthorityUnits.length === 84, 'combined candidate authority unit denominator changed');
    const mapped = combinedAuthorityUnits.flatMap((unit) => unit.reference_ids);
    ok(mapped.length === 145 && new Set(mapped).size === 145, 'combined candidate reference mapping changed');
    ok(exact === 5 && unavailable === 0 && identityNonlinks === 0, 'supplemental source identities not exact');
    ok(totalAttempts >= 5 && totalAttempts <= 10, 'attempt count escaped fixed protocol');

    writeJson(path.join(OUTPUT, 'plan.json'), {
      schema_version: 'ssc-rd-wave02-rd04-supplemental-acl-plan@1',
      frozen_before_fetch: true,
      parent_v3_registry_sha256: '07b10c99d32da63b3df4c1a804d1108603365ed72320a938f08db12df6e4c9ea',
      units: SUPPLEMENTAL_UNITS,
      protocol: PROTOCOL,
      outcome_selected_routes: false,
      version_edges_adjudicated: 0,
      class_closed: false
    });
    writeJson(path.join(OUTPUT, 'supplemental-unit-ledger.json'), {
      schema_version: 'ssc-rd-wave02-rd04-supplemental-acl-unit-ledger@1',
      execution_units: results
    });
    writeJson(path.join(OUTPUT, 'combined-authority-unit-ledger.json'), {
      schema_version: 'ssc-rd-wave02-rd04-combined-authority-unit-ledger@2',
      authority_units: combinedAuthorityUnits
    });
    writeJson(path.join(OUTPUT, 'combined-unit-ledger.json'), {
      schema_version: 'ssc-rd-wave02-rd04-source-identity-combined-unit-ledger@2',
      execution_units: combined
    });
    const summary = {
      schema_version: 'ssc-rd-wave02-rd04-supplemental-acl-capture@1',
      wave_id: 'SSC-RD-W02',
      lane_id: 'RD-04',
      class_id: 'RD-04-C01',
      issue: 789,
      captured_at: now(),
      counts: {
        cross_reference_ids: 159,
        seed_alias_reference_ids: 14,
        candidate_reference_ids: 145,
        candidate_reference_ids_mapped: 145,
        candidate_authority_units: 84,
        seed_source_units: 14,
        execution_units: 98,
        prior_execution_units_preserved: 93,
        supplemental_acl_units: 5,
        terminal_supplemental_acl_units: 5,
        exact_supplemental_acl_identities: exact,
        unavailable_supplemental_acl_units: unavailable,
        supplemental_identity_nonlinks: identityNonlinks,
        supplemental_attempts: totalAttempts,
        total_source_identity_adjudications: 98,
        total_exact_source_identities_observed: 97,
        total_bounded_source_identity_nonlinks: 1,
        unresolved_source_identity_failures: 0,
        version_edges_adjudicated: 0,
        class_closed: 0,
        external_contacts: 0,
        external_reviews: 0,
        graph_effects: 0,
        publication_effects: 0
      },
      current_result: {
        terminal_state: 'corrected_ninety_eight_unit_source_identity_denominator_complete_chronology_pending',
        candidate_denominator_complete_for_recovered_seed_bodies: true,
        source_capture_complete: true,
        source_identity_adjudication_complete: true,
        version_edge_adjudication_complete: false,
        operative_interval_adjudication_complete: false,
        class_closed: false,
        outside_human_dependency: false,
        project_blocking: false,
        graph_effect: 'none',
        publication_effect: 'none',
        adoption_effect: 'none'
      },
      prior_receipts: {
        authority_unit_denominator_93_units: 'preserved_and_superseded_for_denominator_completeness',
        source_identity_denominator_93_units: 'preserved_and_superseded_for_denominator_completeness',
        prior_bounded_nonlink: 'AUTH-CA-HSC-1231110'
      },
      next_handoff: {
        stage: 'freeze_explicit_chronology_relation_occurrence_universe_from_ninety_eight_identity_adjudicated_units',
        source_identity_is_version_edge: false,
        added_acl_is_operative_authority: false,
        publication_is_implementation: false,
        outside_human_dependency: false
      },
      boundaries: {
        source_body_is_version_edge: false,
        later_acl_totally_supersedes_earlier_acl: false,
        exact_identity_is_operative_interval: false,
        exact_identity_is_implementation: false,
        bounded_nonlink_is_record_absence: false,
        parser_repair_changes_reviewed_disposition: false,
        graph_effect: 'none'
      }
    };
    writeJson(path.join(OUTPUT, 'summary.json'), summary);
    const entries = walk(OUTPUT)
      .filter((target) => path.basename(target) !== 'manifest.json')
      .sort()
      .map((target) => {
        const bytes = fs.readFileSync(target);
        return { path: rel(target), bytes: bytes.length, sha256: sha256(bytes) };
      });
    const combinedSha = sha256(Buffer.from(entries.map((entry) => `${entry.path}\0${entry.bytes}\0${entry.sha256}\n`).join(''), 'utf8'));
    writeJson(path.join(OUTPUT, 'manifest.json'), {
      schema_version: 'exact-byte-manifest@1',
      entries,
      combined_sha256: combinedSha
    });
    console.log(`capture-supplemental-acls: ${exact}/5 exact, ${totalAttempts} attempts, 98 total units`);
    console.log(`manifest: ${entries.length} entries ${combinedSha}`);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => { console.error(error.stack || error.message); process.exit(1); });
}
