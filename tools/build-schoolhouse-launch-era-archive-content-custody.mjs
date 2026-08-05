import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('data/intake/bvvc-defense-capital');
const AS_OF = '2026-08-05';
const BASELINE_RUN_ID = 31024272835;
const BASELINE_ARTIFACT_ID = 8937954996;
const BASELINE_ARTIFACT_DIGEST = 'sha256:e9d4346b9ff2831cbe0b7a2e3cae3aaebcc654f6af0742d80534904d9ca3b8b1';
const BASELINE_ROUTE_RESULTS_SHA256 = 'aa55078fbbd5feeeb3c205eba6facf797c7c3f9862285345a175af0f5e94ea58';
const BASELINE_SUMMARY_SHA256 = '0ce462c2cbdc2b3ad8ead43cef56fc86c7fd742106b728cc5d07f4f248edb65a';
const BASELINE_HEAD = '83943f2dffab78c3736b867e302d0012ccfb94a6';
const REPLAY_RUN_ID = 31026429458;
const REPLAY_ARTIFACT_ID = 8938827444;
const REPLAY_ARTIFACT_DIGEST = 'sha256:3fcc4191cf2e6aa3f84eadc5b5265c4e9af13a58a7391b2407a194d6d147a6c9';
const REPLAY_ROUTE_RESULTS_SHA256 = '0e51575f0a126a897a5b90f78263babae535365d3f234ef136ad68329fe53725';
const REPLAY_SUMMARY_SHA256 = '1f7f584389241706905fddbb01ace91f61ad5eaa60c4899d00db6a5822f0009f';
const REPLAY_HEAD = 'b023a718cde41046418488e7e844f5784ac7da63';
const PREDECESSOR_SOURCE_ROWS = 408;
const PREDECESSOR_COVERAGE_ROWS = 24;
const PREDECESSOR_GAP_ROWS = 16;
const BASELINE_ATTEMPTS = 7;
const REPLAY_ATTEMPTS = 3;
const TOTAL_ATTEMPTS = 10;
const SOURCE_ROUTES = 7;
const EXPECTED_SOURCE_ROWS = 418;
const EXPECTED_COVERAGE_ROWS = 25;

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, i) => {
  try { return JSON.parse(line); } catch (error) { throw new Error(`${file}:${i + 1}: ${error.message}`); }
});
const sha256Buffer = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const sha256File = file => sha256Buffer(fs.readFileSync(file));
const sha256Text = value => sha256Buffer(Buffer.from(value, 'utf8'));
const canonicalJson = value => `${JSON.stringify(value, null, 2)}\n`;
const canonicalJsonl = rows => rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
const writeJson = (file, value) => fs.writeFileSync(file, canonicalJson(value));
const writeJsonl = (file, rows) => fs.writeFileSync(file, canonicalJsonl(rows));
const unique = values => new Set(values).size === values.length;
const fileReceipt = filename => {
  const file = path.join(DATA_DIR, filename);
  return { bytes: fs.statSync(file).size, sha256: sha256File(file) };
};
const insertBefore = (value, marker, addition, label) => {
  const index = value.lastIndexOf(marker);
  assert(index >= 0, `${label}: marker missing`);
  return value.slice(0, index) + addition + value.slice(index);
};
const replaceOnce = (value, from, to, label) => {
  const count = value.split(from).length - 1;
  assert.equal(count, 1, `${label}: expected one occurrence, got ${count}`);
  return value.replace(from, to);
};

function verifyChecksums(dir) {
  const file = path.join(dir, 'SHA256SUMS');
  assert(fs.existsSync(file), `${dir}: missing SHA256SUMS`);
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match, `${dir}: malformed checksum row`);
    const target = path.join(dir, match[2]);
    assert(fs.existsSync(target), `${dir}: missing ${match[2]}`);
    assert.equal(sha256File(target), match[1], `${dir}: checksum drift for ${match[2]}`);
  }
}

function verifyManifest(dir, schema) {
  const manifest = readJson(path.join(dir, 'artifact-manifest.json'));
  assert.equal(manifest.schema_version, schema, `${dir}: artifact schema drift`);
  for (const [filename, receipt] of Object.entries(manifest.files)) {
    const file = path.join(dir, filename);
    assert(fs.existsSync(file), `${dir}: missing artifact file ${filename}`);
    assert.equal(fs.statSync(file).size, receipt.bytes, `${dir}: byte drift ${filename}`);
    assert.equal(sha256File(file), receipt.sha256, `${dir}: SHA drift ${filename}`);
  }
  for (const [key, expected] of Object.entries({
    raw_source_retained: false,
    full_visible_text_retained: false,
    hidden_form_values_retained: false,
    field_names_retained: false,
    street_address_rows_retained: 0,
    contact_detail_rows_retained: 0,
    private_support_rows: 0,
    identity_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
  })) assert.equal(manifest[key], expected, `${dir}: ${key} drift`);
  return manifest;
}

const attemptReceiptId = (phase, routeId) => `r-schoolhouse-launch-era-archive-content-${phase}-${routeId}-${AS_OF}`;
const attemptId = (phase, routeId) => `schoolhouse-launch-era-archive-content-attempt-${phase}-${routeId}`;
const stateClass = state => state === 'terminal_archived_html_acquired_ephemerally'
  ? 'captured_archived_html_surface_privacy_minimized'
  : 'archive_content_provider_error_not_absence';

function normalizeAttempt(row, phase, workflowRunId, artifactId, artifactDigest) {
  return {
    ...row,
    schema_version: 'schoolhouse-launch-era-archive-content-attempt@1',
    attempt_id: attemptId(phase, row.route_id),
    attempt_receipt_id: attemptReceiptId(phase, row.route_id),
    acquisition_phase: phase === 'baseline' ? 'launch_era_archive_content_baseline' : 'bounded_failed_snapshot_replay',
    attempt_number_for_route: phase === 'baseline' ? 1 : 2,
    workflow_run_id: workflowRunId,
    artifact_id: artifactId,
    artifact_digest: artifactDigest,
    state_class: stateClass(row.state),
    raw_source_retained: false,
    full_visible_text_retained: false,
    hidden_form_values_retained: false,
    field_names_retained: false,
    identity_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  };
}

function sourceInventoryRow(attempt) {
  return {
    receipt_id: attempt.attempt_receipt_id,
    source_id: `schoolhouse-launch-era-archive-content-${attempt.acquisition_phase}-${attempt.route_id}`,
    locator_url: attempt.replay_locator,
    source_type: 'public_archive_replay_content_request',
    evidence_class: 'primary_public_archive_content_replay_custody',
    source_state: attempt.state_class,
    retrieved_at: attempt.completed_at,
    content_sha256: attempt.response_sha256 ?? null,
    route_result_sha256: sha256Text(JSON.stringify(attempt)),
    workflow_run_id: attempt.workflow_run_id,
    artifact_id: attempt.artifact_id,
    artifact_digest: attempt.artifact_digest,
    source_route_id: attempt.source_route_id,
    source_receipt_id: attempt.source_receipt_id,
    archive_timestamp: attempt.timestamp,
    original_url: attempt.original_url,
    expected_archive_digest: attempt.expected_archive_digest,
    expected_archived_length: attempt.expected_archived_length,
    request_method: 'GET',
    request_attempts: 1,
    error_class: attempt.error_class ?? null,
    error_message_sha256: attempt.error_message_sha256 ?? null,
    embedded_resources_fetched: 0,
    followup_links_fetched: 0,
    forms_submitted: 0,
    query_submitted: false,
    organization_name_submitted: false,
    identifier_submitted: false,
    source_rows_acquired: 0,
    raw_source_retained: false,
    full_visible_text_retained: false,
    street_address_retained: false,
    contact_details_retained: false,
    private_support_rows: 0,
    identity_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
    note: `${attempt.acquisition_phase} exact archived replay request; ${attempt.state}; body processed ephemerally and discarded.`,
  };
}

function surfaceClass(row) {
  if (row.route_id === 'launch-archive-home-2022-11-29') return 'prelaunch_parked_domain_surface';
  if (row.route_id.startsWith('launch-archive-home-2023-')) return 'prelaunch_domain_marketplace_surface';
  if (row.route_id === 'launch-archive-connect-2024-03-05') return 'early_first_party_schoolhouse_connect_surface';
  return 'early_first_party_schoolhouse_home_surface';
}

function adjudicationFor(candidate) {
  if (candidate.candidate_class === 'privacy_terms') return 'third_party_marketplace_legal_link_label_not_schoolhouse_identity';
  if (candidate.candidate_class === 'copyright') return 'third_party_marketplace_copyright_not_schoolhouse_legal_name';
  if (candidate.candidate_class === 'nonprofit' || candidate.candidate_class === 'public_charity') return 'early_first_party_tax_status_self_description_not_registry_identity';
  return 'candidate_only_not_registry_identity';
}

function build(baselineDir, replayDir) {
  verifyChecksums(baselineDir);
  verifyChecksums(replayDir);
  verifyManifest(baselineDir, 'schoolhouse-launch-era-archive-artifact-manifest@1');
  verifyManifest(replayDir, 'schoolhouse-launch-era-archive-replay-artifact-manifest@1');

  const baselineSummary = readJson(path.join(baselineDir, 'summary.json'));
  const replaySummary = readJson(path.join(replayDir, 'summary.json'));
  const baselinePolicy = readJson(path.join(baselineDir, 'route-policy.json'));
  const replayPolicy = readJson(path.join(replayDir, 'route-policy.json'));
  const baselineRoutes = readJsonl(path.join(baselineDir, 'archived-route-results.jsonl'));
  const replayRoutes = readJsonl(path.join(replayDir, 'archived-route-results.jsonl'));
  const baselineSurfaces = readJsonl(path.join(baselineDir, 'archived-surface-evidence.jsonl'));
  const replaySurfaces = readJsonl(path.join(replayDir, 'archived-surface-evidence.jsonl'));
  const baselineCandidates = readJsonl(path.join(baselineDir, 'archived-candidate-observations.jsonl'));
  const replayCandidates = readJsonl(path.join(replayDir, 'archived-candidate-observations.jsonl'));
  const baselineLinks = readJsonl(path.join(baselineDir, 'archived-link-inventory.jsonl'));
  const replayLinks = readJsonl(path.join(replayDir, 'archived-link-inventory.jsonl'));

  assert.equal(sha256File(path.join(baselineDir, 'archived-route-results.jsonl')), BASELINE_ROUTE_RESULTS_SHA256);
  assert.equal(sha256File(path.join(baselineDir, 'summary.json')), BASELINE_SUMMARY_SHA256);
  assert.equal(sha256File(path.join(replayDir, 'archived-route-results.jsonl')), REPLAY_ROUTE_RESULTS_SHA256);
  assert.equal(sha256File(path.join(replayDir, 'summary.json')), REPLAY_SUMMARY_SHA256);
  assert.equal(baselineSummary.schema_version, 'schoolhouse-launch-era-archive-content-census@1');
  assert.equal(replaySummary.schema_version, 'schoolhouse-launch-era-archive-content-replay@1');
  assert.equal(baselineRoutes.length, BASELINE_ATTEMPTS);
  assert.equal(replayRoutes.length, REPLAY_ATTEMPTS);
  assert.equal(baselineSummary.declared_snapshots, SOURCE_ROUTES);
  assert.equal(baselineSummary.terminal_route_rows, SOURCE_ROUTES);
  assert.equal(baselineSummary.successful_routes, 4);
  assert.equal(baselineSummary.provider_error_routes, 3);
  assert.equal(replaySummary.declared_snapshots, REPLAY_ATTEMPTS);
  assert.equal(replaySummary.successful_routes, 2);
  assert.equal(replaySummary.provider_error_routes, 1);
  assert.equal(replaySummary.baseline_workflow_run_id, BASELINE_RUN_ID);
  assert.equal(replaySummary.baseline_artifact_id, BASELINE_ARTIFACT_ID);
  assert.equal(replaySummary.baseline_artifact_digest, BASELINE_ARTIFACT_DIGEST);
  assert.equal(baselinePolicy.source_denominator.declared_snapshots, SOURCE_ROUTES);
  assert.equal(replayPolicy.source_denominator.declared_snapshots, REPLAY_ATTEMPTS);
  assert.equal(replayPolicy.source_denominator.baseline_artifact.artifact_id, BASELINE_ARTIFACT_ID);

  const allArtifactRows = [
    ...baselineRoutes, ...replayRoutes, ...baselineSurfaces, ...replaySurfaces,
    ...baselineCandidates, ...replayCandidates, ...baselineLinks, ...replayLinks,
  ];
  for (const row of allArtifactRows) {
    if ('identity_admitted' in row) assert.equal(row.identity_admitted, false);
    if ('outside_human_dependency' in row) assert.equal(row.outside_human_dependency, false);
    if ('graph_effect' in row) assert.equal(row.graph_effect, 'none');
    if ('street_address_rows_retained' in row) assert.equal(row.street_address_rows_retained, 0);
    if ('contact_detail_rows_retained' in row) assert.equal(row.contact_detail_rows_retained, 0);
  }
  assert(baselineRoutes.every(row => row.request_attempts === 1));
  assert(replayRoutes.every(row => row.request_attempts === 1 && row.attempt_number === 2));
  const failedBaseline = baselineRoutes.filter(row => row.state === 'terminal_archive_replay_transport_error_not_absence_evidence');
  assert.deepEqual(replayRoutes.map(row => row.route_id).sort(), failedBaseline.map(row => row.route_id).sort());

  const baselineAttempts = baselineRoutes.map(row => normalizeAttempt(row, 'baseline', BASELINE_RUN_ID, BASELINE_ARTIFACT_ID, BASELINE_ARTIFACT_DIGEST));
  const replayAttempts = replayRoutes.map(row => normalizeAttempt(row, 'replay', REPLAY_RUN_ID, REPLAY_ARTIFACT_ID, REPLAY_ARTIFACT_DIGEST));
  const attemptRows = [...baselineAttempts, ...replayAttempts].sort((a, b) => a.route_id.localeCompare(b.route_id) || a.attempt_number_for_route - b.attempt_number_for_route);
  assert.equal(attemptRows.length, TOTAL_ATTEMPTS);
  assert(unique(attemptRows.map(row => row.attempt_id)));
  assert(unique(attemptRows.map(row => row.attempt_receipt_id)));

  const replayByRoute = new Map(replayRoutes.map(row => [row.route_id, row]));
  const effectiveRoutes = baselineRoutes.map(baseline => {
    const replay = replayByRoute.get(baseline.route_id) ?? null;
    const effective = replay ?? baseline;
    return {
      schema_version: 'schoolhouse-launch-era-archive-content-route-custody@1',
      route_custody_id: `schoolhouse-launch-era-archive-content-route-${baseline.route_id}`,
      route_id: baseline.route_id,
      source_route_id: baseline.source_route_id,
      source_receipt_id: baseline.source_receipt_id,
      timestamp: baseline.timestamp,
      original_url: baseline.original_url,
      replay_locator: baseline.replay_locator,
      expected_archive_digest: baseline.expected_archive_digest,
      expected_archived_length: baseline.expected_archived_length,
      baseline_attempt_receipt_id: attemptReceiptId('baseline', baseline.route_id),
      replay_attempt_receipt_id: replay ? attemptReceiptId('replay', baseline.route_id) : null,
      total_attempts: replay ? 2 : 1,
      effective_attempt_phase: replay ? 'bounded_failed_snapshot_replay' : 'launch_era_archive_content_baseline',
      baseline_state: baseline.state,
      replay_state: replay?.state ?? null,
      effective_state: effective.state,
      effective_state_class: stateClass(effective.state),
      status: effective.status,
      final_url: effective.final_url ?? null,
      response_bytes: effective.response_bytes ?? null,
      response_sha256: effective.response_sha256 ?? null,
      content_type: effective.content_type ?? null,
      error_class: effective.error_class ?? null,
      error_message_sha256: effective.error_message_sha256 ?? null,
      archived_html_surface_captured_ephemerally: effective.state === 'terminal_archived_html_acquired_ephemerally',
      raw_source_retained: false,
      full_visible_text_retained: false,
      embedded_resources_fetched: 0,
      followup_links_fetched: 0,
      forms_submitted: 0,
      interactive_searches_submitted: 0,
      source_rows_acquired: 0,
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
    };
  }).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  assert.equal(effectiveRoutes.length, SOURCE_ROUTES);
  const successfulRoutes = effectiveRoutes.filter(row => row.effective_state_class === 'captured_archived_html_surface_privacy_minimized');
  const residualProviderErrors = effectiveRoutes.filter(row => row.effective_state_class === 'archive_content_provider_error_not_absence');
  assert.equal(successfulRoutes.length, 6);
  assert.equal(residualProviderErrors.length, 1);

  const attemptLookup = new Map(attemptRows.map(row => [`${row.acquisition_phase}\0${row.route_id}`, row]));
  const normalizeSurface = (row, phase, workflowRunId, artifactId, artifactDigest) => ({
    ...row,
    schema_version: 'schoolhouse-launch-era-archive-content-surface-evidence@1',
    acquisition_phase: phase,
    workflow_run_id: workflowRunId,
    artifact_id: artifactId,
    artifact_digest: artifactDigest,
    attempt_receipt_id: attemptLookup.get(`${phase}\0${row.route_id}`).attempt_receipt_id,
    surface_class: surfaceClass(row),
    archived_body_processed_ephemerally: true,
    raw_source_retained: false,
    full_visible_text_retained: false,
    identity_admitted: false,
    outside_human_dependency: false,
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  });
  const surfaceRows = [
    ...baselineSurfaces.map(row => normalizeSurface(row, 'launch_era_archive_content_baseline', BASELINE_RUN_ID, BASELINE_ARTIFACT_ID, BASELINE_ARTIFACT_DIGEST)),
    ...replaySurfaces.map(row => normalizeSurface(row, 'bounded_failed_snapshot_replay', REPLAY_RUN_ID, REPLAY_ARTIFACT_ID, REPLAY_ARTIFACT_DIGEST)),
  ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  assert.equal(surfaceRows.length, 6);

  const normalizeCandidate = (row, phase, workflowRunId, artifactId, artifactDigest) => ({
    ...row,
    schema_version: 'schoolhouse-launch-era-archive-content-candidate-observation@1',
    acquisition_phase: phase,
    workflow_run_id: workflowRunId,
    artifact_id: artifactId,
    artifact_digest: artifactDigest,
    attempt_receipt_id: attemptLookup.get(`${phase}\0${row.route_id}`).attempt_receipt_id,
    adjudication_state: adjudicationFor(row),
    registry_grade_identity_evidence: false,
    identity_admitted: false,
    outside_human_dependency: false,
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  });
  const candidateRows = [
    ...baselineCandidates.map(row => normalizeCandidate(row, 'launch_era_archive_content_baseline', BASELINE_RUN_ID, BASELINE_ARTIFACT_ID, BASELINE_ARTIFACT_DIGEST)),
    ...replayCandidates.map(row => normalizeCandidate(row, 'bounded_failed_snapshot_replay', REPLAY_RUN_ID, REPLAY_ARTIFACT_ID, REPLAY_ARTIFACT_DIGEST)),
  ].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.candidate_observation_id.localeCompare(b.candidate_observation_id));
  assert.equal(candidateRows.length, 11);

  const normalizeLink = (row, phase, workflowRunId, artifactId, artifactDigest) => ({
    ...row,
    schema_version: 'schoolhouse-launch-era-archive-content-link-observation@1',
    acquisition_phase: phase,
    workflow_run_id: workflowRunId,
    artifact_id: artifactId,
    artifact_digest: artifactDigest,
    attempt_receipt_id: attemptLookup.get(`${phase}\0${row.route_id}`).attempt_receipt_id,
    adjudication_state: 'third_party_marketplace_legal_link_not_schoolhouse_governance_or_identity',
    identity_admitted: false,
    outside_human_dependency: false,
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  });
  const linkRows = [
    ...baselineLinks.map(row => normalizeLink(row, 'launch_era_archive_content_baseline', BASELINE_RUN_ID, BASELINE_ARTIFACT_ID, BASELINE_ARTIFACT_DIGEST)),
    ...replayLinks.map(row => normalizeLink(row, 'bounded_failed_snapshot_replay', REPLAY_RUN_ID, REPLAY_ARTIFACT_ID, REPLAY_ARTIFACT_DIGEST)),
  ].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.link_observation_id.localeCompare(b.link_observation_id));
  assert.equal(linkRows.length, 6);

  const formRows = surfaceRows.reduce((sum, row) => sum + row.form_rows, 0);
  const screenedChars = surfaceRows.reduce((sum, row) => sum + row.screened_visible_text_chars, 0);
  const structuredDataRows = surfaceRows.reduce((sum, row) => sum + row.organization_structured_data_row_count, 0);
  const taxStatusSelfDescriptionRows = candidateRows.filter(row => row.adjudication_state === 'early_first_party_tax_status_self_description_not_registry_identity');
  const marketplaceCopyrightRows = candidateRows.filter(row => row.adjudication_state === 'third_party_marketplace_copyright_not_schoolhouse_legal_name');
  const marketplaceLegalLabelRows = candidateRows.filter(row => row.adjudication_state === 'third_party_marketplace_legal_link_label_not_schoolhouse_identity');
  assert.equal(formRows, 4);
  assert.equal(screenedChars, 21641);
  assert.equal(structuredDataRows, 0);
  assert.equal(taxStatusSelfDescriptionRows.length, 2);
  assert.equal(new Set(taxStatusSelfDescriptionRows.map(row => row.route_id)).size, 1);
  assert.equal(marketplaceCopyrightRows.length, 3);
  assert.equal(marketplaceLegalLabelRows.length, 6);
  assert.equal(candidateRows.filter(row => ['ein_formatted', 'ein_label', 'fiscal_sponsor', 'legal_name', 'operated_by', 'incorporation', 'governance'].includes(row.candidate_class)).length, 0);

  const sourceInventoryRows = attemptRows.map(sourceInventoryRow);
  const custody = {
    schema_version: 'schoolhouse-launch-era-archive-content-custody@1',
    as_of: AS_OF,
    acquisitions: {
      baseline: {
        workflow_run_id: BASELINE_RUN_ID,
        artifact_id: BASELINE_ARTIFACT_ID,
        artifact_digest: BASELINE_ARTIFACT_DIGEST,
        acquisition_head: BASELINE_HEAD,
        summary_sha256: BASELINE_SUMMARY_SHA256,
        route_results_sha256: BASELINE_ROUTE_RESULTS_SHA256,
        attempt_rows: BASELINE_ATTEMPTS,
        successful_html_routes: 4,
        provider_error_routes: 3,
      },
      bounded_failed_snapshot_replay: {
        workflow_run_id: REPLAY_RUN_ID,
        artifact_id: REPLAY_ARTIFACT_ID,
        artifact_digest: REPLAY_ARTIFACT_DIGEST,
        acquisition_head: REPLAY_HEAD,
        summary_sha256: REPLAY_SUMMARY_SHA256,
        route_results_sha256: REPLAY_ROUTE_RESULTS_SHA256,
        attempt_rows: REPLAY_ATTEMPTS,
        successful_html_routes: 2,
        provider_error_routes: 1,
        maximum_parallel_workers: 1,
        inter_request_delay_seconds: 3,
      },
    },
    hypothesis: 'Launch-era School.House home and BVVC connect snapshots may contain an explicit legal principal, EIN, exemption or fiscal-sponsor statement, formation or governance identity, or direct legal-governance links not preserved on current live surfaces.',
    bounds: {
      declared_snapshots: SOURCE_ROUTES,
      baseline_attempts: BASELINE_ATTEMPTS,
      bounded_replay_attempts: REPLAY_ATTEMPTS,
      total_attempts: TOTAL_ATTEMPTS,
      maximum_attempts_per_snapshot_per_phase: 1,
      maximum_parallel_workers: 1,
      embedded_resources_fetched: 0,
      followup_links_fetched: 0,
      forms_submitted: 0,
      interactive_searches_submitted: 0,
    },
    counts: {
      source_route_rows: SOURCE_ROUTES,
      baseline_attempt_rows: BASELINE_ATTEMPTS,
      replay_attempt_rows: REPLAY_ATTEMPTS,
      total_attempt_rows: TOTAL_ATTEMPTS,
      effective_route_rows: SOURCE_ROUTES,
      successful_archived_html_routes: successfulRoutes.length,
      residual_provider_error_routes: residualProviderErrors.length,
      surface_evidence_rows: surfaceRows.length,
      candidate_observation_rows: candidateRows.length,
      legal_governance_link_rows: linkRows.length,
      privacy_minimized_form_rows: formRows,
      screened_visible_text_chars: screenedChars,
      organization_structured_data_rows: structuredDataRows,
      prelaunch_parked_domain_surfaces: surfaceRows.filter(row => row.surface_class === 'prelaunch_parked_domain_surface').length,
      prelaunch_domain_marketplace_surfaces: surfaceRows.filter(row => row.surface_class === 'prelaunch_domain_marketplace_surface').length,
      early_first_party_schoolhouse_surfaces: surfaceRows.filter(row => row.surface_class.startsWith('early_first_party_schoolhouse_')).length,
      third_party_marketplace_legal_label_rows: marketplaceLegalLabelRows.length,
      third_party_marketplace_copyright_rows: marketplaceCopyrightRows.length,
      early_first_party_tax_status_self_description_rows: taxStatusSelfDescriptionRows.length,
      early_first_party_tax_status_self_description_routes: new Set(taxStatusSelfDescriptionRows.map(row => row.route_id)).size,
      exact_legal_name_candidate_rows: 0,
      ein_candidate_rows: 0,
      fiscal_sponsor_candidate_rows: 0,
      formation_governance_identity_candidate_rows: 0,
      source_rows_acquired: 0,
      identities_admitted: 0,
      negative_existence_claims_created: 0,
    },
    findings: {
      prelaunch_domain_state: 'November 2022 was a parked-domain surface; June, September, and December 2023 were third-party Dan.com domain-marketplace surfaces.',
      early_first_party_state: 'March 5, 2024 first-party School.House material includes nonprofit and public-charity self-description but no registry-grade legal name, EIN, exemption record, fiscal sponsor, officer, board, formation, governance, funding, or control record.',
      residual_transport_state: 'The April 18, 2024 BVVC-connect snapshot remained provider-error custody after one exact bounded replay.',
    },
    interpretation: {
      parked_or_marketplace_domain_surface_is_not_schoolhouse_legal_identity: true,
      third_party_marketplace_privacy_terms_or_copyright_is_not_schoolhouse_governance_or_legal_name: true,
      early_first_party_nonprofit_or_public_charity_phrase_is_self_description_not_registry_grade_exemption_or_identity: true,
      bounded_no_candidate_result_is_not_absence: true,
      repeated_provider_error_is_not_absence: true,
      archived_surface_content_is_not_current_state_evidence: true,
    },
    privacy: {
      raw_source_retained: false,
      full_visible_text_retained: false,
      hidden_form_values_retained: false,
      field_names_retained: false,
      street_address_rows_retained: 0,
      contact_detail_rows_retained: 0,
      private_support_rows: 0,
    },
    terminal_frontier: {
      declared_seven_snapshot_baseline_plus_one_failed_route_replay_terminal: true,
      live_first_party_surface_denominator_must_not_be_repeated: true,
      archive_locator_metadata_denominator_must_not_be_repeated: true,
      launch_era_archived_content_denominator_must_not_be_repeated: true,
      registry_grade_legal_identity_open: true,
      remaining_registry_grade_fields: ['exact legal name', 'EIN', 'exemption record', 'formation documents', 'officers', 'board', 'governance', 'funding', 'fiscal sponsor', 'related parties', 'differently named corporation', 'state-only registration'],
      outside_human_dependency: false,
    },
    public_schoolhouse_identity_admitted: false,
    admitted_legal_name: null,
    admitted_ein: null,
    admitted_exemption_record: null,
    admitted_fiscal_sponsor: null,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  };

  writeJsonl(path.join(DATA_DIR, 'source-inventory-15.jsonl'), sourceInventoryRows);
  writeJson(path.join(DATA_DIR, 'schoolhouse-launch-era-archive-content-custody.json'), custody);
  writeJsonl(path.join(DATA_DIR, 'schoolhouse-launch-era-archive-content-attempt-results.jsonl'), attemptRows);
  writeJsonl(path.join(DATA_DIR, 'schoolhouse-launch-era-archive-content-route-results.jsonl'), effectiveRoutes);
  writeJsonl(path.join(DATA_DIR, 'schoolhouse-launch-era-archive-content-surface-evidence.jsonl'), surfaceRows);
  writeJsonl(path.join(DATA_DIR, 'schoolhouse-launch-era-archive-content-candidate-observations.jsonl'), candidateRows);
  writeJsonl(path.join(DATA_DIR, 'schoolhouse-launch-era-archive-content-link-inventory.jsonl'), linkRows);

  const manifestPath = path.join(DATA_DIR, 'manifest.json');
  const coveragePath = path.join(DATA_DIR, 'coverage-matrix.json');
  const frontierPath = path.join(DATA_DIR, 'acquisition-frontier.json');
  const schoolhousePath = path.join(DATA_DIR, 'schoolhouse.json');
  const readmePath = path.join(DATA_DIR, 'README.md');
  const validatorPath = path.resolve('tools/validate-bvvc-defense-capital.mjs');
  const manifest = readJson(manifestPath);
  const coverage = readJson(coveragePath);
  const frontier = readJson(frontierPath);
  const schoolhouse = readJson(schoolhousePath);
  let readme = fs.readFileSync(readmePath, 'utf8');
  let validator = fs.readFileSync(validatorPath, 'utf8');

  assert.equal(manifest.counts.source_inventory_rows, PREDECESSOR_SOURCE_ROWS, 'predecessor source count drift');
  assert.equal(manifest.counts.coverage_denominator_rows, PREDECESSOR_COVERAGE_ROWS, 'predecessor coverage count drift');
  assert.equal(manifest.counts.explicit_gap_rows, PREDECESSOR_GAP_ROWS, 'predecessor gap count drift');
  assert.equal(manifest.storage_contract.source_inventory_parts.at(-1), 'source-inventory-14.jsonl', 'source inventory order drift');
  assert(!manifest.storage_contract.schoolhouse_launch_era_archive_content_custody, 'launch-era custody already present');

  manifest.counts.source_inventory_rows = EXPECTED_SOURCE_ROWS;
  manifest.counts.coverage_denominator_rows = EXPECTED_COVERAGE_ROWS;
  Object.assign(manifest.counts, {
    schoolhouse_launch_era_archive_content_source_route_rows: SOURCE_ROUTES,
    schoolhouse_launch_era_archive_content_baseline_attempt_rows: BASELINE_ATTEMPTS,
    schoolhouse_launch_era_archive_content_replay_attempt_rows: REPLAY_ATTEMPTS,
    schoolhouse_launch_era_archive_content_total_attempt_rows: TOTAL_ATTEMPTS,
    schoolhouse_launch_era_archive_content_effective_route_rows: SOURCE_ROUTES,
    schoolhouse_launch_era_archive_content_successful_html_routes: successfulRoutes.length,
    schoolhouse_launch_era_archive_content_residual_provider_error_routes: residualProviderErrors.length,
    schoolhouse_launch_era_archive_content_surface_evidence_rows: surfaceRows.length,
    schoolhouse_launch_era_archive_content_candidate_rows: candidateRows.length,
    schoolhouse_launch_era_archive_content_legal_link_rows: linkRows.length,
    schoolhouse_launch_era_archive_content_form_rows: formRows,
    schoolhouse_launch_era_archive_content_screened_visible_text_chars: screenedChars,
    schoolhouse_launch_era_archive_content_structured_data_rows: structuredDataRows,
    schoolhouse_launch_era_archive_content_tax_status_self_description_rows: taxStatusSelfDescriptionRows.length,
    schoolhouse_launch_era_archive_content_exact_legal_name_candidate_rows: 0,
    schoolhouse_launch_era_archive_content_ein_candidate_rows: 0,
    schoolhouse_launch_era_archive_content_fiscal_sponsor_candidate_rows: 0,
    schoolhouse_launch_era_archive_content_source_rows_acquired: 0,
    schoolhouse_launch_era_archive_content_admitted_identity_rows: 0,
  });
  for (const boundary of [
    'A prelaunch parked-domain or third-party domain-marketplace surface is domain-history custody and not School.House legal-entity, governance, funding, ownership, or control evidence.',
    'An archived first-party nonprofit or public-charity phrase is a historical self-description and not a registry-grade legal name, EIN, exemption record, fiscal-sponsor, formation, officer, board, governance, funding, or control record.',
    'A provider error that persists after one exact bounded archived-content replay is transport custody and not evidence that no archived page, entity, filing, exemption, sponsor, officer, board, or differently named organization exists.',
  ]) if (!manifest.boundaries.includes(boundary)) manifest.boundaries.push(boundary);
  manifest.coverage.schoolhouse_launch_era_archive_content_custody = `7_snapshots_10_attempts_6_html_1_provider_error_6_surfaces_11_candidates_6_links_4_forms_21641_screened_chars_zero_registry_identity`;
  manifest.custody.next_waterline = 'launch_era_archive_content_to_registry_grade_legal_identity_custody';
  manifest.source_inventory.evidence_class_counts.primary_public_archive_content_replay_custody = TOTAL_ATTEMPTS;
  const sourceStates = sourceInventoryRows.reduce((out, row) => { out[row.source_state] = (out[row.source_state] ?? 0) + 1; return out; }, {});
  for (const [key, value] of Object.entries(sourceStates)) manifest.source_inventory.source_state_counts[key] = value;
  manifest.storage_contract.source_inventory_parts.push('source-inventory-15.jsonl');
  Object.assign(manifest.storage_contract, {
    schoolhouse_launch_era_archive_content_custody: 'schoolhouse-launch-era-archive-content-custody.json',
    schoolhouse_launch_era_archive_content_attempt_results: 'schoolhouse-launch-era-archive-content-attempt-results.jsonl',
    schoolhouse_launch_era_archive_content_route_results: 'schoolhouse-launch-era-archive-content-route-results.jsonl',
    schoolhouse_launch_era_archive_content_surface_evidence: 'schoolhouse-launch-era-archive-content-surface-evidence.jsonl',
    schoolhouse_launch_era_archive_content_candidate_observations: 'schoolhouse-launch-era-archive-content-candidate-observations.jsonl',
    schoolhouse_launch_era_archive_content_link_inventory: 'schoolhouse-launch-era-archive-content-link-inventory.jsonl',
  });

  const surfaceName = 'School.House launch-era archived legal-surface content custody';
  coverage.denominators = coverage.denominators.filter(row => row.surface !== surfaceName);
  coverage.denominators.push({
    surface: surfaceName,
    declared_total: SOURCE_ROUTES,
    enumerated_total: SOURCE_ROUTES,
    baseline_attempt_rows: BASELINE_ATTEMPTS,
    bounded_replay_attempt_rows: REPLAY_ATTEMPTS,
    total_attempt_rows: TOTAL_ATTEMPTS,
    successful_archived_html_routes: successfulRoutes.length,
    residual_provider_error_routes: residualProviderErrors.length,
    surface_evidence_rows: surfaceRows.length,
    candidate_observation_rows: candidateRows.length,
    legal_governance_link_rows: linkRows.length,
    privacy_minimized_form_rows: formRows,
    screened_visible_text_chars: screenedChars,
    organization_structured_data_rows: structuredDataRows,
    early_first_party_tax_status_self_description_rows: taxStatusSelfDescriptionRows.length,
    exact_legal_name_candidate_rows: 0,
    ein_candidate_rows: 0,
    fiscal_sponsor_candidate_rows: 0,
    search_submissions: 0,
    source_rows_acquired: 0,
    admitted_identities: 0,
    coverage_state: 'terminal_for_declared_seven_snapshot_baseline_plus_one_failed_route_replay_no_registry_identity_admitted',
  });
  const gapIndex = coverage.explicit_nulls_and_gaps.findIndex(value => value.startsWith('School.House public identity remains unresolved after the complete forty-six-route first-party surface census'));
  assert(gapIndex >= 0, 'archive locator gap row missing');
  coverage.explicit_nulls_and_gaps[gapIndex] = `School.House public identity remains unresolved after the complete first-party live-surface census, the two-attempt Archive metadata protocol, and the seven-snapshot launch-era archived-content pass. Four successful prelaunch snapshots show one parked-domain surface and three Dan.com domain-marketplace surfaces. Two recovered 2024 snapshots show early first-party School.House surfaces; the March 5 connect snapshot includes nonprofit and public-charity self-description, but no registry-grade legal name, EIN, exemption record, fiscal sponsor, formation, officer, board, governance, funding, control, or related-party record. One April 18 connect snapshot remains provider-error custody after one replay. These bounded results are not absence evidence.`;

  const legalTask = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
  assert(legalTask, 'School.House legal-governance frontier task missing');
  legalTask.prior_launch_era_archive_content_custody = {
    baseline_workflow_run_id: BASELINE_RUN_ID,
    baseline_artifact_id: BASELINE_ARTIFACT_ID,
    baseline_artifact_digest: BASELINE_ARTIFACT_DIGEST,
    replay_workflow_run_id: REPLAY_RUN_ID,
    replay_artifact_id: REPLAY_ARTIFACT_ID,
    replay_artifact_digest: REPLAY_ARTIFACT_DIGEST,
    source_routes: SOURCE_ROUTES,
    baseline_attempt_rows: BASELINE_ATTEMPTS,
    replay_attempt_rows: REPLAY_ATTEMPTS,
    total_attempt_rows: TOTAL_ATTEMPTS,
    successful_archived_html_routes: successfulRoutes.length,
    residual_provider_error_routes: residualProviderErrors.length,
    surface_evidence_rows: surfaceRows.length,
    candidate_observation_rows: candidateRows.length,
    legal_governance_link_rows: linkRows.length,
    privacy_minimized_form_rows: formRows,
    screened_visible_text_chars: screenedChars,
    early_first_party_tax_status_self_description_rows: taxStatusSelfDescriptionRows.length,
    exact_legal_name_candidate_rows: 0,
    ein_candidate_rows: 0,
    fiscal_sponsor_candidate_rows: 0,
    admitted_identities: 0,
    state: 'terminal_for_declared_seven_snapshot_baseline_plus_one_failed_route_replay_no_registry_identity_admitted',
    custody_file: 'schoolhouse-launch-era-archive-content-custody.json',
  };
  legalTask.next_transition = 'Do not repeat the frozen North Carolina route/PDF denominators, the forty-six-route live first-party census, the Archive locator metadata protocol, or the seven-snapshot launch-era archived-content denominator. Treat the March 2024 nonprofit/public-charity language as historical first-party self-description only. Continue registry-grade legal-name, EIN, exemption, formation, officer, board, governance, funding, fiscal-sponsor, related-party, differently named corporation, and state-only registration evidence. Preserve the remaining provider error as non-absence custody.';

  schoolhouse.state_registry_identity_census.launch_era_archive_content_custody = {
    as_of: AS_OF,
    baseline_workflow_run_id: BASELINE_RUN_ID,
    baseline_artifact_id: BASELINE_ARTIFACT_ID,
    replay_workflow_run_id: REPLAY_RUN_ID,
    replay_artifact_id: REPLAY_ARTIFACT_ID,
    declared_snapshots: SOURCE_ROUTES,
    total_attempt_rows: TOTAL_ATTEMPTS,
    successful_archived_html_routes: successfulRoutes.length,
    residual_provider_error_routes: residualProviderErrors.length,
    prelaunch_parked_domain_surfaces: 1,
    prelaunch_domain_marketplace_surfaces: 3,
    early_first_party_schoolhouse_surfaces: 2,
    early_first_party_tax_status_self_description_rows: taxStatusSelfDescriptionRows.length,
    exact_legal_name_candidate_rows: 0,
    ein_candidate_rows: 0,
    fiscal_sponsor_candidate_rows: 0,
    archived_content_state: 'terminal_for_declared_launch_era_snapshot_denominator',
    identity_state: 'unresolved_after_launch_era_archived_content_custody_no_registry_identity_admitted',
    admitted_legal_name: null,
    admitted_ein: null,
    admitted_fiscal_sponsor: null,
    public_schoolhouse_identity_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    graph_effect: 'none',
    promotes_to: 'candidate_only',
    custody_file: 'schoolhouse-launch-era-archive-content-custody.json',
  };

  readme = replaceOnce(readme, 'public-source receipts                        408', 'public-source receipts                        418', 'README source count');
  readme = replaceOnce(readme,
    'first-party Archive public identities admitted              0\n',
    `first-party Archive public identities admitted              0\nlaunch-era archived snapshots                         7 / 7\nlaunch-era archived baseline/replay attempts          7 / 3\nlaunch-era archived total attempts                        10\nlaunch-era archived successful HTML routes                 6\nlaunch-era archived residual provider-error routes         1\nlaunch-era archived surface/candidate/link rows       6 / 11 / 6\nlaunch-era archived privacy-minimized form rows             4\nlaunch-era archived screened visible-text chars        21,641\nlaunch-era archived structured-data rows                    0\nlaunch-era archived tax-status self-description rows        2\nlaunch-era archived exact legal-name/EIN candidates       0 / 0\nlaunch-era archived public identities admitted               0\n`,
    'README launch-era counts');
  readme = replaceOnce(readme, '`source-inventory-01.jsonl` through `source-inventory-14.jsonl`', '`source-inventory-01.jsonl` through `source-inventory-15.jsonl`', 'README inventory range');
  readme = replaceOnce(readme,
    '- `schoolhouse-first-party-archive-locator-custody.json`, the attempt, effective-route, and locator ledgers, and `source-inventory-14.jsonl` preserve 72 exact-URL Archive metadata attempts across the complete forty-six-route first-party denominator. The bounded protocol leaves 21 routes with public replay locators, 3 bounded zero-row routes, and 22 residual provider-error routes; it dereferences zero locators, acquires zero archived page bodies, and admits zero identities.\n',
    '- `schoolhouse-first-party-archive-locator-custody.json`, the attempt, effective-route, and locator ledgers, and `source-inventory-14.jsonl` preserve 72 exact-URL Archive metadata attempts across the complete forty-six-route first-party denominator. The bounded protocol leaves 21 routes with public replay locators, 3 bounded zero-row routes, and 22 residual provider-error routes; it dereferences zero locators, acquires zero archived page bodies, and admits zero identities.\n- `schoolhouse-launch-era-archive-content-custody.json`, the ten-attempt, seven-route, privacy-minimized surface, candidate, and link ledgers, and `source-inventory-15.jsonl` preserve six successful archived HTML surfaces and one repeated provider error. The four prelaunch successes are one parked-domain and three domain-marketplace surfaces; two 2024 successes are early first-party School.House surfaces. Two tax-status phrases remain historical self-description rather than registry identity, and zero legal names, EINs, exemption records, or fiscal sponsors are admitted.\n',
    'README launch-era files');
  readme = insertBefore(readme, '\nThe checked-in frontier now directs',
    `\nThe launch-era archived-content successor then selected seven exact change-point snapshots from the terminal Archive locator plane and replayed only the three initial transport failures once. The effective result preserves six privacy-minimized archived HTML surfaces and one repeated provider error across ten attempts. November 2022 was a parked-domain surface; June, September, and December 2023 were Dan.com marketplace pages. The recovered March 5, 2024 connect surface contains nonprofit and public-charity self-description, while the March 24 home surface supplies no identity candidate. No archived surface supplies a registry-grade legal name, EIN, exemption record, fiscal sponsor, formation, officer, board, governance, funding, control, or related-party record.\n`,
    'README continuation');

  writeJson(coveragePath, coverage);
  writeJson(frontierPath, frontier);
  writeJson(schoolhousePath, schoolhouse);
  fs.writeFileSync(readmePath, readme);
  for (const filename of [
    'acquisition-frontier.json', 'coverage-matrix.json', 'schoolhouse.json', 'source-inventory-15.jsonl',
    'schoolhouse-launch-era-archive-content-custody.json',
    'schoolhouse-launch-era-archive-content-attempt-results.jsonl',
    'schoolhouse-launch-era-archive-content-route-results.jsonl',
    'schoolhouse-launch-era-archive-content-surface-evidence.jsonl',
    'schoolhouse-launch-era-archive-content-candidate-observations.jsonl',
    'schoolhouse-launch-era-archive-content-link-inventory.jsonl',
  ]) manifest.files[filename] = fileReceipt(filename);
  writeJson(manifestPath, manifest);

  const sourcePattern = `manifest.counts.source_inventory_rows === ${PREDECESSOR_SOURCE_ROWS}`;
  const coveragePattern = `manifest.counts.coverage_denominator_rows === ${PREDECESSOR_COVERAGE_ROWS}`;
  assert(validator.includes(sourcePattern), 'validator predecessor source pattern missing');
  assert(validator.includes(coveragePattern), 'validator predecessor coverage pattern missing');
  validator = validator.split(sourcePattern).join(`manifest.counts.source_inventory_rows === ${EXPECTED_SOURCE_ROWS}`);
  validator = validator.split(coveragePattern).join(`manifest.counts.coverage_denominator_rows === ${EXPECTED_COVERAGE_ROWS}`);
  assert(!validator.includes('schoolhouse-launch-era-archive-content-custody.json'), 'launch-era validator block already present');

  const validatorBlock = String.raw`

  {
    const launchCustody = readJson(path.join(dir, 'schoolhouse-launch-era-archive-content-custody.json'));
    const launchAttempts = readJsonl(path.join(dir, 'schoolhouse-launch-era-archive-content-attempt-results.jsonl'));
    const launchRoutes = readJsonl(path.join(dir, 'schoolhouse-launch-era-archive-content-route-results.jsonl'));
    const launchSurfaces = readJsonl(path.join(dir, 'schoolhouse-launch-era-archive-content-surface-evidence.jsonl'));
    const launchCandidates = readJsonl(path.join(dir, 'schoolhouse-launch-era-archive-content-candidate-observations.jsonl'));
    const launchLinks = readJsonl(path.join(dir, 'schoolhouse-launch-era-archive-content-link-inventory.jsonl'));
    const receiptIds = new Set(sourceInventory.map(row => row.receipt_id));
    const baselineAttempts = launchAttempts.filter(row => row.acquisition_phase === 'launch_era_archive_content_baseline');
    const replayAttempts = launchAttempts.filter(row => row.acquisition_phase === 'bounded_failed_snapshot_replay');
    const successfulRoutes = launchRoutes.filter(row => row.effective_state_class === 'captured_archived_html_surface_privacy_minimized');
    const residualErrors = launchRoutes.filter(row => row.effective_state_class === 'archive_content_provider_error_not_absence');
    const taxSelfClaims = launchCandidates.filter(row => row.adjudication_state === 'early_first_party_tax_status_self_description_not_registry_identity');

    check(manifest.counts.source_inventory_rows === ${EXPECTED_SOURCE_ROWS}, 'launch-era source denominator drift');
    check(manifest.counts.coverage_denominator_rows === ${EXPECTED_COVERAGE_ROWS}, 'launch-era coverage denominator drift');
    check(manifest.counts.explicit_gap_rows === ${PREDECESSOR_GAP_ROWS}, 'launch-era gap denominator drift');
    check(launchAttempts.length === ${TOTAL_ATTEMPTS} && baselineAttempts.length === ${BASELINE_ATTEMPTS} && replayAttempts.length === ${REPLAY_ATTEMPTS}, 'launch-era attempt denominator drift');
    check(launchRoutes.length === ${SOURCE_ROUTES} && successfulRoutes.length === 6 && residualErrors.length === 1, 'launch-era route denominator drift');
    check(launchSurfaces.length === 6 && launchCandidates.length === 11 && launchLinks.length === 6, 'launch-era evidence denominator drift');
    check(launchSurfaces.reduce((sum, row) => sum + row.form_rows, 0) === 4, 'launch-era form denominator drift');
    check(launchSurfaces.reduce((sum, row) => sum + row.screened_visible_text_chars, 0) === 21641, 'launch-era screened-text denominator drift');
    check(launchSurfaces.reduce((sum, row) => sum + row.organization_structured_data_row_count, 0) === 0, 'launch-era structured-data denominator drift');
    check(taxSelfClaims.length === 2 && new Set(taxSelfClaims.map(row => row.route_id)).size === 1, 'launch-era tax-status self-description drift');
    check(launchCandidates.filter(row => ['ein_formatted','ein_label','fiscal_sponsor','legal_name','operated_by','incorporation','governance'].includes(row.candidate_class)).length === 0, 'launch-era registry candidate drift');

    check(unique(launchAttempts.map(row => row.attempt_id)) && unique(launchAttempts.map(row => row.attempt_receipt_id)), 'launch-era attempt IDs must be unique');
    check(unique(launchRoutes.map(row => row.route_id)) && unique(launchRoutes.map(row => row.route_custody_id)), 'launch-era route IDs must be unique');
    check(launchAttempts.every(row => receiptIds.has(row.attempt_receipt_id) && row.request_attempts === 1 && row.request_method === 'GET'), 'launch-era attempt receipt/request drift');
    check(launchAttempts.every(row => row.embedded_resources_fetched === 0 && row.followup_links_fetched === 0 && row.forms_submitted === 0 && row.interactive_searches_submitted === 0 && row.source_rows_acquired === 0), 'launch-era acquisition boundary drift');
    check(launchAttempts.every(row => row.raw_source_retained === false && row.full_visible_text_retained === false && row.hidden_form_values_retained === false && row.field_names_retained === false && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'launch-era privacy boundary drift');
    check(launchAttempts.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'launch-era authority drift');
    check(baselineAttempts.every(row => row.attempt_number_for_route === 1) && replayAttempts.every(row => row.attempt_number_for_route === 2), 'launch-era attempt sequence drift');
    check(launchRoutes.every(row => receiptIds.has(row.baseline_attempt_receipt_id) && (row.replay_attempt_receipt_id === null || receiptIds.has(row.replay_attempt_receipt_id))), 'launch-era route receipt linkage drift');
    check(launchRoutes.every(row => row.total_attempts === (row.replay_attempt_receipt_id === null ? 1 : 2)), 'launch-era route attempt-count drift');
    check(launchRoutes.every(row => row.raw_source_retained === false && row.full_visible_text_retained === false && row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'launch-era route authority drift');
    check(launchSurfaces.every(row => receiptIds.has(row.attempt_receipt_id) && row.archived_body_processed_ephemerally === true && row.raw_source_retained === false && row.full_visible_text_retained === false && row.identity_admitted === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'launch-era surface custody drift');
    check(launchCandidates.every(row => receiptIds.has(row.attempt_receipt_id) && row.registry_grade_identity_evidence === false && row.identity_admitted === false && row.outside_human_dependency === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'launch-era candidate authority drift');
    check(launchLinks.every(row => receiptIds.has(row.attempt_receipt_id) && row.fetched === false && row.query_retained === false && row.contact_detail_retained === false && row.street_address_retained === false && row.identity_admitted === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'launch-era link boundary drift');

    check(launchCustody.acquisitions.baseline.workflow_run_id === ${BASELINE_RUN_ID} && launchCustody.acquisitions.baseline.artifact_id === ${BASELINE_ARTIFACT_ID} && launchCustody.acquisitions.baseline.artifact_digest === '${BASELINE_ARTIFACT_DIGEST}' && launchCustody.acquisitions.baseline.route_results_sha256 === '${BASELINE_ROUTE_RESULTS_SHA256}', 'launch-era baseline custody drift');
    check(launchCustody.acquisitions.bounded_failed_snapshot_replay.workflow_run_id === ${REPLAY_RUN_ID} && launchCustody.acquisitions.bounded_failed_snapshot_replay.artifact_id === ${REPLAY_ARTIFACT_ID} && launchCustody.acquisitions.bounded_failed_snapshot_replay.artifact_digest === '${REPLAY_ARTIFACT_DIGEST}' && launchCustody.acquisitions.bounded_failed_snapshot_replay.route_results_sha256 === '${REPLAY_ROUTE_RESULTS_SHA256}', 'launch-era replay custody drift');
    check(launchCustody.counts.source_route_rows === 7 && launchCustody.counts.total_attempt_rows === 10 && launchCustody.counts.successful_archived_html_routes === 6 && launchCustody.counts.residual_provider_error_routes === 1 && launchCustody.counts.surface_evidence_rows === 6 && launchCustody.counts.candidate_observation_rows === 11 && launchCustody.counts.legal_governance_link_rows === 6 && launchCustody.counts.privacy_minimized_form_rows === 4 && launchCustody.counts.screened_visible_text_chars === 21641 && launchCustody.counts.organization_structured_data_rows === 0, 'launch-era custody denominator drift');
    check(launchCustody.interpretation.parked_or_marketplace_domain_surface_is_not_schoolhouse_legal_identity === true && launchCustody.interpretation.early_first_party_nonprofit_or_public_charity_phrase_is_self_description_not_registry_grade_exemption_or_identity === true && launchCustody.interpretation.repeated_provider_error_is_not_absence === true, 'launch-era interpretation drift');
    check(launchCustody.privacy.raw_source_retained === false && launchCustody.privacy.full_visible_text_retained === false && launchCustody.privacy.hidden_form_values_retained === false && launchCustody.privacy.field_names_retained === false && launchCustody.privacy.street_address_rows_retained === 0 && launchCustody.privacy.contact_detail_rows_retained === 0 && launchCustody.privacy.private_support_rows === 0, 'launch-era custody privacy drift');
    check(launchCustody.public_schoolhouse_identity_admitted === false && launchCustody.admitted_legal_name === null && launchCustody.admitted_ein === null && launchCustody.admitted_exemption_record === null && launchCustody.admitted_fiscal_sponsor === null && launchCustody.negative_existence_claim_created === false && launchCustody.outside_human_dependency === false && launchCustody.graph_effect === 'none', 'launch-era identity authority drift');

    const projection = schoolhouse.state_registry_identity_census?.launch_era_archive_content_custody;
    check(projection?.declared_snapshots === 7 && projection?.total_attempt_rows === 10 && projection?.successful_archived_html_routes === 6 && projection?.residual_provider_error_routes === 1 && projection?.early_first_party_tax_status_self_description_rows === 2 && projection?.exact_legal_name_candidate_rows === 0 && projection?.ein_candidate_rows === 0 && projection?.public_schoolhouse_identity_admitted === false, 'launch-era School.House projection drift');
    const frontierProjection = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_launch_era_archive_content_custody;
    check(frontierProjection?.source_routes === 7 && frontierProjection?.total_attempt_rows === 10 && frontierProjection?.successful_archived_html_routes === 6 && frontierProjection?.residual_provider_error_routes === 1 && frontierProjection?.admitted_identities === 0, 'launch-era frontier projection drift');
    check(coverage.denominators.some(row => row.surface === 'School.House launch-era archived legal-surface content custody' && row.enumerated_total === 7 && row.total_attempt_rows === 10 && row.successful_archived_html_routes === 6 && row.residual_provider_error_routes === 1 && row.surface_evidence_rows === 6 && row.candidate_observation_rows === 11 && row.legal_governance_link_rows === 6 && row.admitted_identities === 0), 'launch-era coverage denominator missing');
  }
`;
  const marker = '\n  return errors;\n}';
  const index = validator.lastIndexOf(marker);
  assert(index >= 0, 'validator return marker missing');
  validator = validator.slice(0, index) + validatorBlock + validator.slice(index);
  fs.writeFileSync(validatorPath, validator);

  console.log(JSON.stringify({
    schema_version: 'schoolhouse-launch-era-archive-content-build@1',
    source_inventory_rows: EXPECTED_SOURCE_ROWS,
    coverage_denominator_rows: EXPECTED_COVERAGE_ROWS,
    source_routes: SOURCE_ROUTES,
    baseline_attempt_rows: BASELINE_ATTEMPTS,
    replay_attempt_rows: REPLAY_ATTEMPTS,
    total_attempt_rows: TOTAL_ATTEMPTS,
    successful_archived_html_routes: successfulRoutes.length,
    residual_provider_error_routes: residualProviderErrors.length,
    surface_evidence_rows: surfaceRows.length,
    candidate_observation_rows: candidateRows.length,
    legal_governance_link_rows: linkRows.length,
    privacy_minimized_form_rows: formRows,
    screened_visible_text_chars: screenedChars,
    organization_structured_data_rows: structuredDataRows,
    tax_status_self_description_rows: taxStatusSelfDescriptionRows.length,
    exact_legal_name_candidate_rows: 0,
    ein_candidate_rows: 0,
    fiscal_sponsor_candidate_rows: 0,
    source_rows_acquired: 0,
    admitted_identities: 0,
    outside_human_dependency: false,
    graph_effect: 'none',
  }, null, 2));
}

const baselineDir = process.argv[2];
const replayDir = process.argv[3];
assert(baselineDir && replayDir, 'usage: node build-schoolhouse-launch-era-archive-content-custody.mjs <baseline-artifact-dir> <replay-artifact-dir>');
build(path.resolve(baselineDir), path.resolve(replayDir));
