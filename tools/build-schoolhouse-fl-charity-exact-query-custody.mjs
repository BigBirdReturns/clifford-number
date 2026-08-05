import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = path.resolve('data/intake/bvvc-defense-capital');
const AS_OF = '2026-08-05';
const CANONICAL_PARENT_COMMIT = '1f04c0abbf89f1529dfd428389392b3425499bc3';
const CANONICAL_PARENT_TREE = '33e540e995455dfd28ebe1cd6a7f09c29844d461';

const URL_GUIDANCE = 'https://www.fdacs.gov/Divisions-Offices/Consumer-Services/Check-A-Charity';
const URL_ROBOTS = 'https://csapp.fdacs.gov/robots.txt';
const URL_SEARCH = 'https://csapp.fdacs.gov/CSPublicApp/CheckACharity/CheckACharity.aspx';
const FIXED_QUERY_MATRIX = [
  { query_id: 'schoolhouse-brand-punctuation', value: 'School.House' },
  { query_id: 'schoolhouse-brand-space', value: 'School House' },
  { query_id: 'schoolhouse-brand-compact', value: 'Schoolhouse' },
];

const URLIB = {
  phase: 'urllib_baseline_artifact',
  transport_profile: 'python_urllib_default_route',
  workflow_run_id: 31044899071,
  workflow_head: 'cd12480a16323194d899739a6e91689c99310c0d',
  artifact_id: 8946106351,
  artifact_digest: 'sha256:1d3167516a2db6e39fc08d9cac4726b38d2abb04a87c8fb46aa749105caa5718',
  summary_sha256: '84b5d609adfbf57a2b86af0aa1e4a67ed07e9ca00a51cb6b92aecf40df5f3131',
  policy_sha256: 'e359a2ae0abf6451acdc60e63ca06252ce4d28a3786a35864dc1e7863a46e522',
  route_results_sha256: 'c73c98dfca0f96415cca5c60680bce41e5f4bbb9cee942ee46797888d047183c',
  manifest_sha256: '37e4e298a15cca66adf1d5efed95d033abc89fd344a7a115c3743f418348cddb',
  schema_suffix: '1',
};
const IPV4_DIAGNOSTIC = {
  phase: 'ipv4_http1_diagnostic_execution',
  transport_profile: 'curl_ipv4_http1_1',
  workflow_run_id: 31046395385,
  workflow_head: '59e8231ec15da63a30682d520562db21cfbbd2c4',
  artifact_backed: false,
  post_source_failure_class: 'post_source_validator_schema_key_error_artifact_not_uploaded',
};
const IPV4 = {
  phase: 'ipv4_http1_packaging_artifact',
  transport_profile: 'curl_ipv4_http1_1',
  workflow_run_id: 31046743488,
  workflow_head: '5bbd80e539e74db66e4b206dc22a486e733bddba',
  artifact_id: 8946758352,
  artifact_digest: 'sha256:9e0797d62a9be0646b81f0e0ae741a6165799d58f943484a68d760d17f26296a',
  summary_sha256: '1ed32fe185daea304678cc3102f1ccb8bc9093fa21b6e23913e1625d04e6d934',
  policy_sha256: 'a826b21cc597ab10956622a46b6b8f80d3e577272b179927aecba1d0df3e1399',
  route_results_sha256: '94473306b71509b9beb8b533a58956dae43d270169166957a82a1061faaf9f86',
  manifest_sha256: '8365f053f4d09b2d8bd4b6eaeb4952645967562218885100775e47079d6daf7e',
  schema_suffix: '2',
};

const PREDECESSOR_FILE_SHA256 = {
  'README.md': '6fc0d118ce57aeb3e6955b8049368cd89297de0c168b79ac669c12688fe5cf84',
  'acquisition-frontier.json': '75e85e45243628b5afe1835d54eb18e26d3a5798a1be2e207513e1abb64dd9a8',
  'coverage-matrix.json': '21c0c39bcfee20f467d6ed1b2a0340d5236db47a6b76e97483716ed3fb1503b5',
  'manifest.json': 'bec6457290c4bf940b72ba69a2ea6bc7dde76fc46220660f9ebbc3607f0bee97',
  'schoolhouse.json': 'a8d8e73801d25926416d788ef8c5a90bd25e8eae3afbf76703fc83e29538b8f9',
  'source-inventory-16.jsonl': '02688e863d8012ab812f34f5903bd91a77c9243f2a2f62d972dad2600ddac071',
};
const PREDECESSOR_VALIDATOR_SHA256 = '83cb2cc8c6f0bb4c78daa48f4e501bc1352de367347372c13b9d2149b3954770';
const PREDECESSOR_SOURCE_ROWS = 425;
const PREDECESSOR_COVERAGE_ROWS = 26;
const EXPECTED_SOURCE_ROWS = 431;
const EXPECTED_COVERAGE_ROWS = 27;
const EXPECTED_GAP_ROWS = 16;

const CUSTODY_FILE = 'schoolhouse-fl-charity-exact-query-custody.json';
const EXECUTION_FILE = 'schoolhouse-fl-charity-exact-query-executions.jsonl';
const ATTEMPT_FILE = 'schoolhouse-fl-charity-exact-query-attempt-results.jsonl';
const SOURCE_FILE = 'source-inventory-17.jsonl';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
  try { return JSON.parse(line); } catch (error) { throw new Error(`${file}:${index + 1}: ${error.message}`); }
});
const sha256Buffer = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const sha256File = file => sha256Buffer(fs.readFileSync(file));
const sha256Text = value => sha256Buffer(Buffer.from(value, 'utf8'));
const canonicalJson = value => `${JSON.stringify(value, null, 2)}\n`;
const canonicalJsonl = rows => rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
const writeJson = (file, value) => fs.writeFileSync(file, canonicalJson(value));
const writeJsonl = (file, rows) => fs.writeFileSync(file, canonicalJsonl(rows));
const unique = values => new Set(values).size === values.length;
const countOccurrences = (value, needle) => value.split(needle).length - 1;
const replaceOnce = (value, from, to, label) => {
  assert.equal(countOccurrences(value, from), 1, `${label}: expected one occurrence`);
  return value.replace(from, to);
};
const insertBefore = (value, marker, addition, label) => {
  const index = value.lastIndexOf(marker);
  assert(index >= 0, `${label}: marker missing`);
  return value.slice(0, index) + addition + value.slice(index);
};
const fileReceipt = filename => {
  const file = path.join(DATA_DIR, filename);
  return { bytes: fs.statSync(file).size, sha256: sha256File(file) };
};

function verifyChecksums(dir) {
  const checksumFile = path.join(dir, 'SHA256SUMS');
  assert(fs.existsSync(checksumFile), `${dir}: missing SHA256SUMS`);
  for (const line of fs.readFileSync(checksumFile, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match, `${dir}: malformed checksum row`);
    const target = path.join(dir, match[2]);
    assert(fs.existsSync(target), `${dir}: missing ${match[2]}`);
    assert.equal(sha256File(target), match[1], `${dir}: checksum drift ${match[2]}`);
  }
}

function verifyArtifact(dir, spec) {
  verifyChecksums(dir);
  assert.equal(sha256File(path.join(dir, 'summary.json')), spec.summary_sha256, `${spec.phase}: summary SHA drift`);
  assert.equal(sha256File(path.join(dir, 'policy.json')), spec.policy_sha256, `${spec.phase}: policy SHA drift`);
  assert.equal(sha256File(path.join(dir, 'route-results.jsonl')), spec.route_results_sha256, `${spec.phase}: routes SHA drift`);
  assert.equal(sha256File(path.join(dir, 'artifact-manifest.json')), spec.manifest_sha256, `${spec.phase}: manifest SHA drift`);
  const summary = readJson(path.join(dir, 'summary.json'));
  const policy = readJson(path.join(dir, 'policy.json'));
  const manifest = readJson(path.join(dir, 'artifact-manifest.json'));
  const routes = readJsonl(path.join(dir, 'route-results.jsonl'));
  assert.equal(summary.schema_version, `schoolhouse-fl-charity-exact-query-summary@${spec.schema_suffix}`, `${spec.phase}: summary schema drift`);
  assert.equal(policy.schema_version, `schoolhouse-fl-charity-exact-query-policy@${spec.schema_suffix}`, `${spec.phase}: policy schema drift`);
  assert.equal(manifest.schema_version, `schoolhouse-fl-charity-exact-query-artifact-manifest@${spec.schema_suffix}`, `${spec.phase}: artifact schema drift`);
  assert.deepEqual(policy.fixed_query_matrix, FIXED_QUERY_MATRIX, `${spec.phase}: fixed query matrix drift`);
  assert.equal(summary.declared_query_rows, 3, `${spec.phase}: declared query drift`);
  assert.equal(summary.query_submissions, 0, `${spec.phase}: query submissions drift`);
  assert.equal(summary.query_submission_authorized_by_machine_gate, false, `${spec.phase}: machine gate drift`);
  assert.equal(summary.terminal_query_results, 0, `${spec.phase}: terminal query result drift`);
  assert.equal(summary.candidate_rows, 0, `${spec.phase}: candidate row drift`);
  assert.equal(summary.candidate_links, 0, `${spec.phase}: candidate link drift`);
  assert.equal(summary.source_rows_acquired, 0, `${spec.phase}: source row drift`);
  assert.equal(summary.terminal_state, 'terminal_policy_or_transport_refusal_no_unbounded_retry', `${spec.phase}: terminal state drift`);
  assert.equal(summary.raw_source_retained, false, `${spec.phase}: raw source retention drift`);
  assert.equal(summary.hidden_form_values_retained, false, `${spec.phase}: hidden values drift`);
  assert.equal(summary.identity_admitted_rows, 0, `${spec.phase}: identity authority drift`);
  assert.equal(summary.negative_existence_claims_created, 0, `${spec.phase}: absence authority drift`);
  assert.equal(summary.outside_human_dependency, false, `${spec.phase}: outside-human drift`);
  assert.equal(summary.publication_effect, 'none', `${spec.phase}: publication drift`);
  assert.equal(summary.adoption_effect, 'none', `${spec.phase}: adoption drift`);
  assert.equal(summary.graph_effect, 'none', `${spec.phase}: graph drift`);
  assert.equal(routes.length, 3, `${spec.phase}: route denominator drift`);
  assert.equal(routes.filter(row => row.route_id === 'fdacs-check-a-charity-guidance' && row.state === 'captured' && row.http_status === 200).length, 1, `${spec.phase}: guidance state drift`);
  assert.equal(routes.filter(row => row.route_id === 'fdacs-check-a-charity-robots' && row.state === 'transport_error').length, 1, `${spec.phase}: robots state drift`);
  assert.equal(routes.filter(row => row.route_id === 'fdacs-check-a-charity-search-page' && row.state === 'transport_error').length, 1, `${spec.phase}: search-page state drift`);
  assert(routes.every(row => row.query_submitted === false && row.raw_source_retained === false && row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.graph_effect === 'none'), `${spec.phase}: route authority drift`);
  return { summary, policy, manifest, routes };
}

function verifyPredecessor() {
  for (const [filename, expected] of Object.entries(PREDECESSOR_FILE_SHA256)) {
    const file = path.join(DATA_DIR, filename);
    assert(fs.existsSync(file), `predecessor missing ${filename}`);
    assert.equal(sha256File(file), expected, `predecessor SHA drift ${filename}`);
  }
  const validator = path.resolve('tools/validate-bvvc-defense-capital.mjs');
  assert.equal(sha256File(validator), PREDECESSOR_VALIDATOR_SHA256, 'predecessor validator SHA drift');
  const manifest = readJson(path.join(DATA_DIR, 'manifest.json'));
  const coverage = readJson(path.join(DATA_DIR, 'coverage-matrix.json'));
  assert.equal(manifest.counts.source_inventory_rows, PREDECESSOR_SOURCE_ROWS, 'predecessor source count drift');
  assert.equal(manifest.counts.coverage_denominator_rows, PREDECESSOR_COVERAGE_ROWS, 'predecessor coverage count drift');
  assert.equal(coverage.denominators.length, PREDECESSOR_COVERAGE_ROWS, 'predecessor coverage rows drift');
  assert.equal(coverage.explicit_nulls_and_gaps.length, EXPECTED_GAP_ROWS, 'predecessor gap rows drift');
  assert.equal(manifest.storage_contract.source_inventory_parts.at(-1), 'source-inventory-16.jsonl', 'predecessor source tail drift');
  assert(!manifest.files[SOURCE_FILE] && !fs.existsSync(path.join(DATA_DIR, CUSTODY_FILE)), 'Florida charity custody already materialized');
}

const routeRole = routeId => ({
  'fdacs-check-a-charity-guidance': 'official_guidance_surface',
  'fdacs-check-a-charity-robots': 'application_host_robots_policy_route',
  'fdacs-check-a-charity-search-page': 'official_registry_search_application_route',
})[routeId];
const stateClass = row => row.state === 'captured'
  ? 'captured_official_charity_guidance_surface'
  : 'registry_query_transport_error_not_absence';
const phaseSlug = phase => phase.replace(/_/g, '-');

function normalizeAttempt(row, spec) {
  const suffix = `${phaseSlug(spec.phase)}-${row.route_id}`;
  return {
    schema_version: 'schoolhouse-fl-charity-exact-query-attempt@1',
    attempt_id: `schoolhouse-fl-charity-exact-query-${suffix}`,
    attempt_receipt_id: `r-schoolhouse-fl-charity-exact-query-${suffix}-${AS_OF}`,
    acquisition_phase: spec.phase,
    transport_profile: spec.transport_profile,
    route_role: routeRole(row.route_id),
    route_id: row.route_id,
    requested_url: row.requested_url,
    final_url: row.final_url,
    request_method: 'GET',
    request_attempts: 1,
    state_class: stateClass(row),
    http_status: row.http_status,
    content_type: row.content_type,
    response_bytes: row.response_bytes,
    response_sha256: row.response_sha256,
    elapsed_ms: row.elapsed_ms,
    error_class: row.error_class,
    error_message_sha256: row.error_message_sha256,
    route_result_sha256: sha256Text(JSON.stringify(row)),
    workflow_run_id: spec.workflow_run_id,
    artifact_id: spec.artifact_id,
    artifact_digest: spec.artifact_digest,
    acquisition_head: spec.workflow_head,
    query_submitted: false,
    organization_name_submitted: false,
    identifier_submitted: false,
    source_rows_acquired: 0,
    raw_source_retained: false,
    full_visible_text_retained: false,
    hidden_form_values_retained: false,
    street_address_rows_retained: 0,
    contact_detail_rows_retained: 0,
    private_support_rows: 0,
    identity_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
    note: row.state === 'captured'
      ? 'Official Florida Check-A-Charity guidance surface captured and hashed; body processed ephemerally and discarded.'
      : 'Official application-host route timed out under the declared single-attempt transport profile; transport custody is not record absence.',
  };
}

function sourceInventoryRow(attempt) {
  return {
    receipt_id: attempt.attempt_receipt_id,
    source_id: attempt.attempt_id,
    locator_url: attempt.requested_url,
    source_type: 'public_state_charity_registry_route_request',
    evidence_class: 'primary_public_state_charity_registry_route_custody',
    source_state: attempt.state_class,
    retrieved_at: AS_OF,
    content_sha256: attempt.response_sha256,
    route_result_sha256: attempt.route_result_sha256,
    workflow_run_id: attempt.workflow_run_id,
    artifact_id: attempt.artifact_id,
    artifact_digest: attempt.artifact_digest,
    acquisition_head: attempt.acquisition_head,
    transport_profile: attempt.transport_profile,
    route_role: attempt.route_role,
    request_method: attempt.request_method,
    request_attempts: attempt.request_attempts,
    http_status: attempt.http_status,
    error_class: attempt.error_class,
    error_message_sha256: attempt.error_message_sha256,
    query_submitted: false,
    organization_name_submitted: false,
    identifier_submitted: false,
    source_rows_acquired: 0,
    raw_source_retained: false,
    full_visible_text_retained: false,
    hidden_form_values_retained: false,
    street_address_rows_retained: 0,
    contact_detail_rows_retained: 0,
    private_support_rows: 0,
    identity_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
    note: attempt.note,
  };
}

function executionRow({ id, phase, profile, runId, head, artifactId = null, artifactDigest = null, artifactBacked, postSourceState }) {
  return {
    schema_version: 'schoolhouse-fl-charity-exact-query-execution@1',
    execution_id: id,
    acquisition_phase: phase,
    transport_profile: profile,
    workflow_run_id: runId,
    workflow_head: head,
    artifact_id: artifactId,
    artifact_digest: artifactDigest,
    artifact_backed: artifactBacked,
    post_source_state: postSourceState,
    route_attempt_rows: 3,
    guidance_success_rows: 1,
    robots_transport_error_rows: 1,
    search_page_transport_error_rows: 1,
    declared_query_rows: 3,
    query_submissions: 0,
    terminal_query_results: 0,
    candidate_rows: 0,
    candidate_links: 0,
    source_rows_acquired: 0,
    identity_admitted_rows: 0,
    negative_existence_claims_created: 0,
    raw_source_retained: false,
    hidden_form_values_retained: false,
    street_address_rows_retained: 0,
    contact_detail_rows_retained: 0,
    private_support_rows: 0,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
    terminal_state: 'terminal_policy_or_transport_refusal_no_unbounded_retry',
  };
}

function build(urllibDir, ipv4Dir) {
  verifyPredecessor();
  const urllib = verifyArtifact(urllibDir, URLIB);
  const ipv4 = verifyArtifact(ipv4Dir, IPV4);

  const attempts = [
    ...urllib.routes.map(row => normalizeAttempt(row, URLIB)),
    ...ipv4.routes.map(row => normalizeAttempt(row, IPV4)),
  ];
  assert.equal(attempts.length, 6, 'artifact-backed attempt denominator drift');
  assert(unique(attempts.map(row => row.attempt_id)), 'attempt IDs must be unique');
  assert(unique(attempts.map(row => row.attempt_receipt_id)), 'attempt receipts must be unique');
  assert.equal(attempts.filter(row => row.state_class === 'captured_official_charity_guidance_surface').length, 2, 'artifact guidance count drift');
  assert.equal(attempts.filter(row => row.state_class === 'registry_query_transport_error_not_absence').length, 4, 'artifact transport-error count drift');

  const executions = [
    executionRow({
      id: 'schoolhouse-fl-charity-exact-query-urllib-artifact',
      phase: URLIB.phase,
      profile: URLIB.transport_profile,
      runId: URLIB.workflow_run_id,
      head: URLIB.workflow_head,
      artifactId: URLIB.artifact_id,
      artifactDigest: URLIB.artifact_digest,
      artifactBacked: true,
      postSourceState: 'artifact_uploaded_and_checksum_verified',
    }),
    executionRow({
      id: 'schoolhouse-fl-charity-exact-query-ipv4-diagnostic',
      phase: IPV4_DIAGNOSTIC.phase,
      profile: IPV4_DIAGNOSTIC.transport_profile,
      runId: IPV4_DIAGNOSTIC.workflow_run_id,
      head: IPV4_DIAGNOSTIC.workflow_head,
      artifactBacked: false,
      postSourceState: IPV4_DIAGNOSTIC.post_source_failure_class,
    }),
    executionRow({
      id: 'schoolhouse-fl-charity-exact-query-ipv4-packaging-artifact',
      phase: IPV4.phase,
      profile: IPV4.transport_profile,
      runId: IPV4.workflow_run_id,
      head: IPV4.workflow_head,
      artifactId: IPV4.artifact_id,
      artifactDigest: IPV4.artifact_digest,
      artifactBacked: true,
      postSourceState: 'packaging_replay_artifact_uploaded_and_checksum_verified',
    }),
  ];
  assert(unique(executions.map(row => row.execution_id)), 'execution IDs must be unique');

  const sourceRows = attempts.map(sourceInventoryRow);
  writeJsonl(path.join(DATA_DIR, EXECUTION_FILE), executions);
  writeJsonl(path.join(DATA_DIR, ATTEMPT_FILE), attempts);
  writeJsonl(path.join(DATA_DIR, SOURCE_FILE), sourceRows);

  const custody = {
    schema_version: 'schoolhouse-fl-charity-exact-query-custody@1',
    as_of: AS_OF,
    canonical_parent: { commit: CANONICAL_PARENT_COMMIT, tree: CANONICAL_PARENT_TREE },
    official_surface: {
      name: 'Florida FDACS Check-A-Charity',
      guidance_url: URL_GUIDANCE,
      robots_url: URL_ROBOTS,
      search_application_url: URL_SEARCH,
      evidence_scope: 'Florida charitable-solicitation registration and filed financial-information search surface',
    },
    fixed_query_matrix: FIXED_QUERY_MATRIX,
    acquisitions: {
      urllib_artifact: {
        workflow_run_id: URLIB.workflow_run_id,
        workflow_head: URLIB.workflow_head,
        artifact_id: URLIB.artifact_id,
        artifact_digest: URLIB.artifact_digest,
        summary_sha256: URLIB.summary_sha256,
        policy_sha256: URLIB.policy_sha256,
        route_results_sha256: URLIB.route_results_sha256,
        artifact_manifest_sha256: URLIB.manifest_sha256,
      },
      ipv4_http1_diagnostic_execution: {
        workflow_run_id: IPV4_DIAGNOSTIC.workflow_run_id,
        workflow_head: IPV4_DIAGNOSTIC.workflow_head,
        artifact_id: null,
        artifact_digest: null,
        source_execution_observed_in_workflow_log: true,
        post_source_state: IPV4_DIAGNOSTIC.post_source_failure_class,
        query_submissions: 0,
      },
      ipv4_http1_packaging_artifact: {
        workflow_run_id: IPV4.workflow_run_id,
        workflow_head: IPV4.workflow_head,
        artifact_id: IPV4.artifact_id,
        artifact_digest: IPV4.artifact_digest,
        summary_sha256: IPV4.summary_sha256,
        policy_sha256: IPV4.policy_sha256,
        route_results_sha256: IPV4.route_results_sha256,
        artifact_manifest_sha256: IPV4.manifest_sha256,
      },
    },
    counts: {
      declared_query_rows: 3,
      transport_profiles: 2,
      execution_rows: 3,
      artifact_backed_execution_rows: 2,
      diagnostic_execution_rows: 1,
      artifact_backed_route_attempt_rows: 6,
      diagnostic_route_attempt_rows: 3,
      total_route_attempt_rows: 9,
      guidance_success_rows: 3,
      robots_transport_error_rows: 3,
      search_page_transport_error_rows: 3,
      artifact_backed_guidance_success_rows: 2,
      artifact_backed_transport_error_rows: 4,
      query_submissions: 0,
      terminal_query_results: 0,
      candidate_rows: 0,
      candidate_links: 0,
      source_rows_acquired: 0,
      source_inventory_rows: 6,
      identity_admitted_rows: 0,
      negative_existence_claims_created: 0,
    },
    terminal_frontier: {
      declared_two_transport_profiles_terminal: true,
      repeated_application_host_timeout_state: true,
      provider_condition_change_required_before_retry: true,
      exact_query_matrix_must_not_be_repeated_without_changed_provider_condition: true,
      no_search_was_submitted: true,
      registry_grade_legal_identity_open: true,
      outside_human_dependency: false,
    },
    interpretation: {
      guidance_capture_establishes_official_service_scope_not_schoolhouse_identity: true,
      application_host_timeout_is_not_record_absence: true,
      zero_query_submissions_is_not_zero_search_results: true,
      state_charity_registration_is_not_federal_tax_exemption: true,
      diagnostic_execution_is_execution_custody_not_source_inventory_inflation: true,
      packaging_replay_does_not_create_a_third_transport_profile: true,
    },
    privacy: {
      raw_source_retained: false,
      full_visible_text_retained: false,
      hidden_form_values_retained: false,
      street_address_rows_retained: 0,
      contact_detail_rows_retained: 0,
      private_support_rows: 0,
    },
    public_schoolhouse_identity_admitted: false,
    admitted_legal_name: null,
    admitted_registration_number: null,
    admitted_ein: null,
    admitted_exemption_record: null,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  };
  writeJson(path.join(DATA_DIR, CUSTODY_FILE), custody);

  const schoolhousePath = path.join(DATA_DIR, 'schoolhouse.json');
  const schoolhouse = readJson(schoolhousePath);
  assert(schoolhouse.state_registry_identity_census, 'School.House state registry census missing');
  assert(!schoolhouse.state_registry_identity_census.fl_charity_exact_query_custody, 'School.House Florida charity projection already exists');
  schoolhouse.state_registry_identity_census.fl_charity_exact_query_custody = {
    as_of: AS_OF,
    transport_profiles: 2,
    execution_rows: 3,
    artifact_backed_route_attempt_rows: 6,
    diagnostic_route_attempt_rows: 3,
    total_route_attempt_rows: 9,
    guidance_success_rows: 3,
    robots_transport_error_rows: 3,
    search_page_transport_error_rows: 3,
    declared_query_rows: 3,
    query_submissions: 0,
    terminal_query_results: 0,
    candidate_rows: 0,
    source_rows_acquired: 0,
    admitted_identities: 0,
    identity_state: 'unresolved_after_two_transport_profiles_zero_query_submissions_provider_condition_change_required',
    public_schoolhouse_identity_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    graph_effect: 'none',
    promotes_to: 'candidate_only',
    custody_file: CUSTODY_FILE,
  };
  writeJson(schoolhousePath, schoolhouse);

  const frontierPath = path.join(DATA_DIR, 'acquisition-frontier.json');
  const frontier = readJson(frontierPath);
  const task = frontier.tasks.find(row => row.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
  assert(task, 'School.House frontier task missing');
  assert(!task.prior_fl_charity_exact_query_custody, 'Florida charity frontier projection already exists');
  task.prior_fl_charity_exact_query_custody = {
    urllib_workflow_run_id: URLIB.workflow_run_id,
    urllib_artifact_id: URLIB.artifact_id,
    urllib_artifact_digest: URLIB.artifact_digest,
    ipv4_diagnostic_workflow_run_id: IPV4_DIAGNOSTIC.workflow_run_id,
    ipv4_packaging_workflow_run_id: IPV4.workflow_run_id,
    ipv4_artifact_id: IPV4.artifact_id,
    ipv4_artifact_digest: IPV4.artifact_digest,
    transport_profiles: 2,
    execution_rows: 3,
    artifact_backed_route_attempt_rows: 6,
    diagnostic_route_attempt_rows: 3,
    total_route_attempt_rows: 9,
    guidance_success_rows: 3,
    robots_transport_error_rows: 3,
    search_page_transport_error_rows: 3,
    query_submissions: 0,
    candidate_rows: 0,
    admitted_identities: 0,
    state: 'terminal_two_transport_profiles_zero_query_submissions_provider_condition_change_required',
    custody_file: CUSTODY_FILE,
  };
  task.next_transition = 'Do not repeat the frozen North Carolina route/PDF denominators, the live first-party and Archive denominators, or the Florida Check-A-Charity exact-query matrix under the urllib or IPv4/HTTP1.1 transport profiles. Both official application-host policy/search routes timed out and zero query was submitted; repeat only after an observable provider-condition change. Continue registry-grade legal-name, EIN, exemption, formation, officer, board, governance, funding, fiscal-sponsor, related-party, differently named corporation, and state-only registration evidence through lawful noninteractive sources.';
  writeJson(frontierPath, frontier);

  const coveragePath = path.join(DATA_DIR, 'coverage-matrix.json');
  const coverage = readJson(coveragePath);
  assert.equal(coverage.denominators.length, PREDECESSOR_COVERAGE_ROWS, 'coverage predecessor row drift');
  assert(!coverage.denominators.some(row => row.surface === 'School.House Florida Check-A-Charity exact-query transport custody'), 'coverage row already exists');
  coverage.denominators.push({
    surface: 'School.House Florida Check-A-Charity exact-query transport custody',
    declared_total: 3,
    enumerated_total: 3,
    transport_profiles: 2,
    execution_rows: 3,
    artifact_backed_route_attempt_rows: 6,
    diagnostic_route_attempt_rows: 3,
    total_route_attempt_rows: 9,
    guidance_success_rows: 3,
    robots_transport_error_rows: 3,
    search_page_transport_error_rows: 3,
    query_submissions: 0,
    terminal_query_results: 0,
    candidate_rows: 0,
    source_rows_acquired: 0,
    admitted_identities: 0,
    coverage_state: 'terminal_two_transport_profiles_zero_query_submissions_provider_condition_change_required',
  });
  const gapIndex = coverage.explicit_nulls_and_gaps.findIndex(value => value.startsWith('School.House public identity remains unresolved after the complete first-party live-surface census'));
  assert(gapIndex >= 0, 'School.House cumulative gap missing');
  coverage.explicit_nulls_and_gaps[gapIndex] += ' The Florida FDACS Check-A-Charity exact-query lane then executed three bounded source transactions across two transport profiles: three official guidance captures and six application-host transport errors across nine route attempts, with zero registry query submissions, zero query results, and zero candidate rows. That is transport refusal custody, not a no-match or absence finding.';
  writeJson(coveragePath, coverage);

  const manifestPath = path.join(DATA_DIR, 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.counts.source_inventory_rows = EXPECTED_SOURCE_ROWS;
  manifest.counts.coverage_denominator_rows = EXPECTED_COVERAGE_ROWS;
  Object.assign(manifest.counts, {
    schoolhouse_fl_charity_exact_query_declared_query_rows: 3,
    schoolhouse_fl_charity_exact_query_transport_profiles: 2,
    schoolhouse_fl_charity_exact_query_execution_rows: 3,
    schoolhouse_fl_charity_exact_query_artifact_backed_execution_rows: 2,
    schoolhouse_fl_charity_exact_query_diagnostic_execution_rows: 1,
    schoolhouse_fl_charity_exact_query_artifact_backed_route_attempt_rows: 6,
    schoolhouse_fl_charity_exact_query_diagnostic_route_attempt_rows: 3,
    schoolhouse_fl_charity_exact_query_total_route_attempt_rows: 9,
    schoolhouse_fl_charity_exact_query_guidance_success_rows: 3,
    schoolhouse_fl_charity_exact_query_robots_transport_error_rows: 3,
    schoolhouse_fl_charity_exact_query_search_page_transport_error_rows: 3,
    schoolhouse_fl_charity_exact_query_query_submissions: 0,
    schoolhouse_fl_charity_exact_query_terminal_query_result_rows: 0,
    schoolhouse_fl_charity_exact_query_candidate_rows: 0,
    schoolhouse_fl_charity_exact_query_candidate_links: 0,
    schoolhouse_fl_charity_exact_query_source_rows_acquired: 0,
    schoolhouse_fl_charity_exact_query_admitted_identity_rows: 0,
    schoolhouse_fl_charity_exact_query_negative_existence_claims: 0,
  });
  manifest.storage_contract.source_inventory_parts.push(SOURCE_FILE);
  manifest.storage_contract.schoolhouse_fl_charity_exact_query_custody = CUSTODY_FILE;
  manifest.storage_contract.schoolhouse_fl_charity_exact_query_executions = EXECUTION_FILE;
  manifest.storage_contract.schoolhouse_fl_charity_exact_query_attempt_results = ATTEMPT_FILE;
  manifest.source_inventory.evidence_class_counts.primary_public_state_charity_registry_route_custody = 6;
  manifest.source_inventory.source_state_counts.captured_official_charity_guidance_surface = 2;
  manifest.source_inventory.source_state_counts.registry_query_transport_error_not_absence = 4;
  manifest.coverage.schoolhouse_fl_charity_exact_query_custody = '3_fixed_queries_2_transport_profiles_3_executions_9_route_attempts_3_guidance_successes_6_application_timeouts_zero_query_submissions_provider_condition_change_required';
  manifest.boundaries.push('A Florida Check-A-Charity guidance capture establishes the scope of the state solicitation-registration service, not a School.House legal name, registration, exemption, EIN, sponsor, governance, funding, or control record.');
  manifest.boundaries.push('An application-host timeout under urllib and IPv4/HTTP1.1 is transport custody and not evidence that no Florida charity registration or differently named legal entity exists.');
  manifest.boundaries.push('Zero submitted registry queries is not a zero-result search; the fixed three-query matrix may be retried only after an observable provider-condition change.');
  manifest.custody.next_waterline = 'registry_grade_legal_identity_after_terminal_fl_charity_transport_refusal';
  for (const filename of [
    'acquisition-frontier.json',
    'coverage-matrix.json',
    'schoolhouse.json',
    CUSTODY_FILE,
    EXECUTION_FILE,
    ATTEMPT_FILE,
    SOURCE_FILE,
  ]) {
    manifest.files[filename] = fileReceipt(filename);
  }
  writeJson(manifestPath, manifest);

  const readmePath = path.join(DATA_DIR, 'README.md');
  let readme = fs.readFileSync(readmePath, 'utf8');
  readme = replaceOnce(readme, 'public-source receipts                        425', 'public-source receipts                        431', 'README source count');
  const countMarker = 'institutional self-claim rows                  10\n';
  const countBlock = [
    'Florida charity exact-query variants                 3 / 3',
    'Florida charity transport profiles                       2',
    'Florida charity source executions                        3',
    'Florida charity artifact/diagnostic route attempts    6 / 3',
    'Florida charity total route attempts                      9',
    'Florida charity guidance successes                       3',
    'Florida charity robots/search transport errors         3 / 3',
    'Florida charity registry query submissions                 0',
    'Florida charity terminal query results                     0',
    'Florida charity candidate rows/links                    0 / 0',
    'Florida charity source rows acquired                       0',
    'Florida charity public identities admitted                 0',
  ].join('\n') + '\n';
  readme = replaceOnce(readme, countMarker, countBlock + countMarker, 'README Florida counts');
  const filesMarker = '- `schoolhouse-fl-fictitious-source-receipt.json`, `schoolhouse-fl-fictitious-member-inventory.jsonl`, `schoolhouse-fl-fictitious-candidates.jsonl`, and `schoolhouse-fl-fictitious-adjudication.json` preserve the exact 761,040-record Florida fictitious-name census, forty repaired embedded-linebreak records, twenty-nine sanitized phrase candidates, and the zero-admission decision.\n';
  const filesAddition = `- \`${CUSTODY_FILE}\`, \`${EXECUTION_FILE}\`, \`${ATTEMPT_FILE}\`, and \`${SOURCE_FILE}\` preserve three bounded Florida FDACS Check-A-Charity source executions across urllib and IPv4/HTTP1.1. The package records three guidance captures, six application-host transport errors across nine route attempts, zero registry query submissions, zero result or candidate rows, and the provider-condition-change stopping rule without retaining raw pages, hidden form values, addresses, or contact details.\n`;
  readme = replaceOnce(readme, filesMarker, filesAddition + filesMarker, 'README files bullet');
  const narrativeMarker = 'The checked-in frontier now directs the next bounded pass toward the complete BVVC vehicle denominator';
  const narrativeAddition = 'The Florida Check-A-Charity exact-query successor then froze three public-name variants and executed them under two materially different transport profiles. The official guidance page was captured in each of three source executions, while both the application-host robots route and search application timed out in every execution. The middle IPv4 diagnostic completed its source step but lost its artifact only after a local validator schema error; the final packaging replay preserves the same zero-submission terminal state. Across nine route attempts, no registry query was submitted, no search result or candidate row was obtained, and no identity or absence claim was created. The exact matrix is terminal until the provider condition observably changes.\n\n';
  readme = replaceOnce(readme, narrativeMarker, narrativeAddition + narrativeMarker, 'README narrative');
  fs.writeFileSync(readmePath, readme);

  const validatorPath = path.resolve('tools/validate-bvvc-defense-capital.mjs');
  let validator = fs.readFileSync(validatorPath, 'utf8');
  const sourceNeedle = 'manifest.counts.source_inventory_rows === 425';
  const coverageNeedle = 'manifest.counts.coverage_denominator_rows === 26';
  assert.equal(countOccurrences(validator, sourceNeedle), 7, 'validator source denominator occurrence drift');
  assert.equal(countOccurrences(validator, coverageNeedle), 7, 'validator coverage denominator occurrence drift');
  validator = validator.split(sourceNeedle).join('manifest.counts.source_inventory_rows === 431');
  validator = validator.split(coverageNeedle).join('manifest.counts.coverage_denominator_rows === 27');
  const validatorBlock = `

  if (fs.existsSync(path.join(dir, '${CUSTODY_FILE}'))) {
    const flCharityCustody = readJson(path.join(dir, '${CUSTODY_FILE}'));
    const flCharityExecutions = readJsonl(path.join(dir, '${EXECUTION_FILE}'));
    const flCharityAttempts = readJsonl(path.join(dir, '${ATTEMPT_FILE}'));
    const flCharitySourceRows = readJsonl(path.join(dir, '${SOURCE_FILE}'));
    const receiptIds = new Set(sourceInventory.map(row => row.receipt_id));
    const artifactBackedExecutions = flCharityExecutions.filter(row => row.artifact_backed);
    const diagnosticExecutions = flCharityExecutions.filter(row => !row.artifact_backed);
    const guidanceAttempts = flCharityAttempts.filter(row => row.state_class === 'captured_official_charity_guidance_surface');
    const transportErrors = flCharityAttempts.filter(row => row.state_class === 'registry_query_transport_error_not_absence');

    check(manifest.counts.source_inventory_rows === 431, 'Florida charity source-inventory denominator drift');
    check(manifest.counts.coverage_denominator_rows === 27, 'Florida charity coverage-denominator drift');
    check(manifest.storage_contract.source_inventory_parts.at(-1) === '${SOURCE_FILE}', 'Florida charity source-inventory tail drift');
    check(manifest.source_inventory.evidence_class_counts.primary_public_state_charity_registry_route_custody === 6, 'Florida charity evidence-class count drift');
    check(manifest.source_inventory.source_state_counts.captured_official_charity_guidance_surface === 2 && manifest.source_inventory.source_state_counts.registry_query_transport_error_not_absence === 4, 'Florida charity source-state count drift');

    check(flCharityExecutions.length === 3 && artifactBackedExecutions.length === 2 && diagnosticExecutions.length === 1, 'Florida charity execution denominator drift');
    check(unique(flCharityExecutions.map(row => row.execution_id)), 'Florida charity execution IDs must be unique');
    check(flCharityExecutions.reduce((sum, row) => sum + row.route_attempt_rows, 0) === 9, 'Florida charity total route-attempt denominator drift');
    check(flCharityExecutions.reduce((sum, row) => sum + row.guidance_success_rows, 0) === 3, 'Florida charity guidance denominator drift');
    check(flCharityExecutions.reduce((sum, row) => sum + row.robots_transport_error_rows, 0) === 3 && flCharityExecutions.reduce((sum, row) => sum + row.search_page_transport_error_rows, 0) === 3, 'Florida charity timeout denominator drift');
    check(flCharityExecutions.every(row => row.query_submissions === 0 && row.terminal_query_results === 0 && row.candidate_rows === 0 && row.candidate_links === 0 && row.source_rows_acquired === 0), 'Florida charity execution result drift');
    check(flCharityExecutions.every(row => row.identity_admitted_rows === 0 && row.negative_existence_claims_created === 0 && row.raw_source_retained === false && row.hidden_form_values_retained === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'Florida charity execution authority drift');
    check(diagnosticExecutions[0]?.workflow_run_id === 31046395385 && diagnosticExecutions[0]?.artifact_id === null && diagnosticExecutions[0]?.post_source_state === 'post_source_validator_schema_key_error_artifact_not_uploaded', 'Florida charity diagnostic execution drift');

    check(flCharityAttempts.length === 6 && guidanceAttempts.length === 2 && transportErrors.length === 4, 'Florida charity artifact-backed attempt denominator drift');
    check(unique(flCharityAttempts.map(row => row.attempt_id)) && unique(flCharityAttempts.map(row => row.attempt_receipt_id)), 'Florida charity attempt IDs must be unique');
    check(flCharityAttempts.every(row => receiptIds.has(row.attempt_receipt_id) && row.request_attempts === 1 && row.request_method === 'GET' && row.query_submitted === false), 'Florida charity attempt receipt/request drift');
    check(guidanceAttempts.every(row => row.http_status === 200 && row.response_sha256 === '24a9156ce429fd7de66784f7d52b50ebd9ca0fa2964bc67e9ae4597a92bffaf7'), 'Florida charity guidance content drift');
    check(transportErrors.every(row => row.response_bytes === 0 && row.response_sha256 === null && row.error_class !== null), 'Florida charity transport-error drift');
    check(flCharityAttempts.every(row => row.source_rows_acquired === 0 && row.raw_source_retained === false && row.full_visible_text_retained === false && row.hidden_form_values_retained === false && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'Florida charity attempt privacy drift');
    check(flCharityAttempts.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'Florida charity attempt authority drift');

    check(flCharitySourceRows.length === 6 && flCharitySourceRows.every(row => receiptIds.has(row.receipt_id)), 'Florida charity source inventory linkage drift');
    check(flCharitySourceRows.every(row => row.evidence_class === 'primary_public_state_charity_registry_route_custody' && row.query_submitted === false && row.source_rows_acquired === 0 && row.identity_admitted === false && row.negative_existence_claim_created === false && row.graph_effect === 'none'), 'Florida charity source inventory authority drift');

    check(flCharityCustody.canonical_parent.commit === '${CANONICAL_PARENT_COMMIT}' && flCharityCustody.canonical_parent.tree === '${CANONICAL_PARENT_TREE}', 'Florida charity parent custody drift');
    check(flCharityCustody.acquisitions.urllib_artifact.workflow_run_id === 31044899071 && flCharityCustody.acquisitions.urllib_artifact.artifact_id === 8946106351 && flCharityCustody.acquisitions.urllib_artifact.artifact_digest === 'sha256:1d3167516a2db6e39fc08d9cac4726b38d2abb04a87c8fb46aa749105caa5718' && flCharityCustody.acquisitions.urllib_artifact.route_results_sha256 === 'c73c98dfca0f96415cca5c60680bce41e5f4bbb9cee942ee46797888d047183c', 'Florida charity urllib acquisition drift');
    check(flCharityCustody.acquisitions.ipv4_http1_diagnostic_execution.workflow_run_id === 31046395385 && flCharityCustody.acquisitions.ipv4_http1_diagnostic_execution.artifact_id === null && flCharityCustody.acquisitions.ipv4_http1_diagnostic_execution.query_submissions === 0, 'Florida charity diagnostic custody drift');
    check(flCharityCustody.acquisitions.ipv4_http1_packaging_artifact.workflow_run_id === 31046743488 && flCharityCustody.acquisitions.ipv4_http1_packaging_artifact.artifact_id === 8946758352 && flCharityCustody.acquisitions.ipv4_http1_packaging_artifact.artifact_digest === 'sha256:9e0797d62a9be0646b81f0e0ae741a6165799d58f943484a68d760d17f26296a' && flCharityCustody.acquisitions.ipv4_http1_packaging_artifact.route_results_sha256 === '94473306b71509b9beb8b533a58956dae43d270169166957a82a1061faaf9f86', 'Florida charity IPv4 acquisition drift');
    check(flCharityCustody.counts.transport_profiles === 2 && flCharityCustody.counts.execution_rows === 3 && flCharityCustody.counts.total_route_attempt_rows === 9 && flCharityCustody.counts.query_submissions === 0 && flCharityCustody.counts.candidate_rows === 0 && flCharityCustody.counts.identity_admitted_rows === 0, 'Florida charity custody denominator drift');
    check(flCharityCustody.terminal_frontier.declared_two_transport_profiles_terminal === true && flCharityCustody.terminal_frontier.provider_condition_change_required_before_retry === true && flCharityCustody.terminal_frontier.no_search_was_submitted === true, 'Florida charity terminal frontier drift');
    check(flCharityCustody.interpretation.application_host_timeout_is_not_record_absence === true && flCharityCustody.interpretation.zero_query_submissions_is_not_zero_search_results === true && flCharityCustody.interpretation.diagnostic_execution_is_execution_custody_not_source_inventory_inflation === true, 'Florida charity interpretation drift');
    check(flCharityCustody.privacy.raw_source_retained === false && flCharityCustody.privacy.hidden_form_values_retained === false && flCharityCustody.privacy.street_address_rows_retained === 0 && flCharityCustody.privacy.contact_detail_rows_retained === 0 && flCharityCustody.privacy.private_support_rows === 0, 'Florida charity privacy drift');
    check(flCharityCustody.public_schoolhouse_identity_admitted === false && flCharityCustody.admitted_legal_name === null && flCharityCustody.admitted_registration_number === null && flCharityCustody.admitted_ein === null && flCharityCustody.negative_existence_claim_created === false && flCharityCustody.outside_human_dependency === false && flCharityCustody.graph_effect === 'none', 'Florida charity identity authority drift');

    const projection = schoolhouse.state_registry_identity_census?.fl_charity_exact_query_custody;
    check(projection?.transport_profiles === 2 && projection?.execution_rows === 3 && projection?.total_route_attempt_rows === 9 && projection?.query_submissions === 0 && projection?.candidate_rows === 0 && projection?.public_schoolhouse_identity_admitted === false, 'Florida charity School.House projection drift');
    const frontierProjection = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_fl_charity_exact_query_custody;
    check(frontierProjection?.transport_profiles === 2 && frontierProjection?.execution_rows === 3 && frontierProjection?.total_route_attempt_rows === 9 && frontierProjection?.query_submissions === 0 && frontierProjection?.admitted_identities === 0, 'Florida charity frontier projection drift');
    check(coverage.denominators.some(row => row.surface === 'School.House Florida Check-A-Charity exact-query transport custody' && row.enumerated_total === 3 && row.transport_profiles === 2 && row.total_route_attempt_rows === 9 && row.query_submissions === 0 && row.candidate_rows === 0 && row.admitted_identities === 0), 'Florida charity coverage denominator missing');
  }
`;
  validator = insertBefore(validator, '\n  return errors;\n}', validatorBlock, 'validator Florida charity block');
  fs.writeFileSync(validatorPath, validator);

  console.log(JSON.stringify({
    schema_version: 'schoolhouse-fl-charity-exact-query-custody-build@1',
    canonical_parent_commit: CANONICAL_PARENT_COMMIT,
    canonical_parent_tree: CANONICAL_PARENT_TREE,
    source_inventory_rows: EXPECTED_SOURCE_ROWS,
    coverage_denominator_rows: EXPECTED_COVERAGE_ROWS,
    explicit_gap_rows: EXPECTED_GAP_ROWS,
    declared_query_rows: 3,
    transport_profiles: 2,
    execution_rows: 3,
    artifact_backed_execution_rows: 2,
    diagnostic_execution_rows: 1,
    artifact_backed_route_attempt_rows: 6,
    diagnostic_route_attempt_rows: 3,
    total_route_attempt_rows: 9,
    guidance_success_rows: 3,
    robots_transport_error_rows: 3,
    search_page_transport_error_rows: 3,
    query_submissions: 0,
    terminal_query_results: 0,
    candidate_rows: 0,
    candidate_links: 0,
    source_rows_acquired: 0,
    admitted_identity_rows: 0,
    negative_existence_claims_created: 0,
    provider_condition_change_required: true,
    outside_human_dependency: false,
    graph_effect: 'none',
  }, null, 2));
}

const urllibDir = process.argv[2];
const ipv4Dir = process.argv[3];
assert(urllibDir && ipv4Dir, 'usage: node build-schoolhouse-fl-charity-exact-query-custody.mjs <urllib-artifact-dir> <ipv4-artifact-dir>');
build(path.resolve(urllibDir), path.resolve(ipv4Dir));
