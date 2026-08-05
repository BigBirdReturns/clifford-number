import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('data/intake/bvvc-defense-capital');
const AS_OF = '2026-08-05';

const BASELINE_RUN_ID = 30995963355;
const BASELINE_ARTIFACT_ID = 8926199862;
const BASELINE_ARTIFACT_DIGEST = 'sha256:1db8ed490991492167b6b9c2a2fbaaaca83ae8f09d036457dbd151202c0cc103';
const BASELINE_ROUTE_RESULTS_SHA256 = '713f5e8f973c277706131112b0c8bc68eba69ab8fd8e5470c58e2a53bc966e0e';
const BASELINE_LOCATORS_SHA256 = '10d03c93d0a45b41e8a77937b08a1acb1ebdf7c0fe5b377aa8b55be9c4036b0c';
const BASELINE_ACQUISITION_HEAD = 'a4e2c6f426c2d6c60771fca74ac4eaf03ae5d7eb';

const REPLAY_RUN_ID = 31019907916;
const REPLAY_ARTIFACT_ID = 8936473911;
const REPLAY_ARTIFACT_DIGEST = 'sha256:c20278d37fe505aa6d465e6f02da0e8dde69f7086fe05c064dcced980009dbab';
const REPLAY_ACQUISITION_HEAD = 'c60a4f0f06928211969b744d96f2e4b801d5868a';

const PREDECESSOR_SOURCE_INVENTORY_ROWS = 336;
const PREDECESSOR_COVERAGE_ROWS = 23;
const PREDECESSOR_GAP_ROWS = 16;
const BASELINE_ROUTE_COUNT = 46;
const REPLAY_ROUTE_COUNT = 26;
const TOTAL_ATTEMPT_ROWS = BASELINE_ROUTE_COUNT + REPLAY_ROUTE_COUNT;
const EXPECTED_SOURCE_INVENTORY_ROWS = PREDECESSOR_SOURCE_INVENTORY_ROWS + TOTAL_ATTEMPT_ROWS;
const EXPECTED_COVERAGE_ROWS = PREDECESSOR_COVERAGE_ROWS + 1;

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${file}:${index + 1}: ${error.message}`);
    }
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
const replaceOnce = (value, from, to, label) => {
  const occurrences = value.split(from).length - 1;
  assert.equal(occurrences, 1, `${label}: expected one occurrence, got ${occurrences}`);
  return value.replace(from, to);
};
const stateClass = state => {
  if (state.includes('transport_error')) return 'archive_locator_provider_error';
  if (state.includes('zero_archive_rows')) return 'bounded_zero_archive_locator_metadata';
  if (state.includes('archive_rows')) return 'captured_archive_locator_metadata';
  throw new Error(`unexpected Archive attempt state: ${state}`);
};
const attemptReceiptId = (phase, routeId) => `r-schoolhouse-first-party-archive-locator-${phase}-${routeId}-${AS_OF}`;
const locatorId = row => `schoolhouse-archive-locator-${sha256Text([
  row.source_route_id,
  row.timestamp,
  row.original_url,
  row.archive_digest,
].join('\u0000')).slice(0, 24)}`;


const archiveQueryUrl = sourceUrl => {
  const url = new URL('https://web.archive.org/cdx/search/cdx');
  for (const [key, value] of [
    ['url', sourceUrl],
    ['matchType', 'exact'],
    ['from', '2019'],
    ['to', '2026'],
    ['output', 'json'],
    ['fl', 'timestamp,original,statuscode,mimetype,digest,length'],
    ['filter', 'statuscode:200'],
    ['collapse', 'digest'],
    ['limit', '1000'],
  ]) url.searchParams.append(key, value);
  return url.toString();
};

function verifyChecksums(dir) {
  const checksumFile = path.join(dir, 'SHA256SUMS');
  assert(fs.existsSync(checksumFile), `${dir}: missing SHA256SUMS`);
  const rows = fs.readFileSync(checksumFile, 'utf8').split(/\r?\n/).filter(Boolean);
  assert(rows.length >= 4, `${dir}: incomplete SHA256SUMS`);
  for (const row of rows) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(row);
    assert(match, `${dir}: malformed checksum row`);
    const [, expected, filename] = match;
    const file = path.join(dir, filename);
    assert(fs.existsSync(file), `${dir}: missing checksummed file ${filename}`);
    assert.equal(sha256File(file), expected, `${dir}: checksum drift for ${filename}`);
  }
}

function verifyArtifactManifest(dir, expectedSchema) {
  const manifest = readJson(path.join(dir, 'artifact-manifest.json'));
  assert.equal(manifest.schema_version, expectedSchema, `${dir}: artifact schema drift`);
  for (const [filename, receipt] of Object.entries(manifest.files)) {
    const file = path.join(dir, filename);
    assert(fs.existsSync(file), `${dir}: missing artifact file ${filename}`);
    assert.equal(fs.statSync(file).size, receipt.bytes, `${dir}: byte drift for ${filename}`);
    assert.equal(sha256File(file), receipt.sha256, `${dir}: SHA drift for ${filename}`);
  }
  assert.equal(manifest.raw_source_retained, false, `${dir}: raw source boundary drift`);
  assert.equal(manifest.archived_bodies_fetched, false, `${dir}: archived-body boundary drift`);
  assert.equal(manifest.identity_admitted, false, `${dir}: identity boundary drift`);
  assert.equal(manifest.negative_existence_claim_created, false, `${dir}: absence boundary drift`);
  assert.equal(manifest.outside_human_dependency, false, `${dir}: outside-human boundary drift`);
  assert.equal(manifest.publication_effect, 'none', `${dir}: publication boundary drift`);
  assert.equal(manifest.adoption_effect, 'none', `${dir}: adoption boundary drift`);
  assert.equal(manifest.graph_effect, 'none', `${dir}: graph boundary drift`);
  return manifest;
}

function normalizeAttempt(row, phase, workflowRunId, artifactId, artifactDigest) {
  const receiptId = attemptReceiptId(phase, row.source_route_id);
  return {
    schema_version: 'schoolhouse-first-party-archive-locator-attempt@1',
    attempt_id: `schoolhouse-archive-attempt-${phase}-${row.source_route_id}`,
    attempt_receipt_id: receiptId,
    acquisition_phase: phase === 'baseline' ? 'baseline_archive_locator_census' : 'bounded_transport_replay',
    attempt_number_for_route: phase === 'baseline' ? 1 : 2,
    workflow_run_id: workflowRunId,
    artifact_id: artifactId,
    artifact_digest: artifactDigest,
    source_route_id: row.source_route_id,
    source_receipt_id: row.source_receipt_id,
    source_url: row.source_url,
    source_url_field: row.source_url_field,
    archive_api_host: row.archive_api_host,
    archive_api_path: row.archive_api_path,
    archive_query_url_sha256: row.archive_query_url_sha256,
    final_archive_api_url_sha256: row.final_archive_api_url_sha256 ?? null,
    request_method: row.request_method,
    request_attempts: phase === 'baseline' ? row.request_attempts : row.replay_attempts,
    started_at: row.started_at,
    completed_at: row.completed_at,
    status: row.status,
    response_bytes: row.response_bytes ?? null,
    response_sha256: row.response_sha256 ?? null,
    error_class: row.error_class ?? null,
    error_message_sha256: row.error_message_sha256 ?? null,
    redirects_followed: row.redirects_followed ?? 0,
    maximum_results: row.maximum_results,
    result_cap_exhausted: row.result_cap_exhausted,
    snapshot_locator_rows: row.snapshot_locator_rows,
    earliest_timestamp: row.earliest_timestamp ?? null,
    latest_timestamp: row.latest_timestamp ?? null,
    state: row.state,
    state_class: stateClass(row.state),
    baseline_state: phase === 'baseline' ? null : row.baseline_state,
    baseline_error_class: phase === 'baseline' ? null : row.baseline_error_class,
    baseline_error_message_sha256: phase === 'baseline' ? null : row.baseline_error_message_sha256,
    archived_bodies_fetched: 0,
    replay_locators_dereferenced: 0,
    interactive_search_submissions: row.interactive_search_submissions,
    organization_name_submissions: row.organization_name_submissions,
    identifier_submissions: row.identifier_submissions,
    source_rows_acquired: row.source_rows_acquired,
    street_address_rows_retained: row.street_address_rows_retained,
    contact_detail_rows_retained: row.contact_detail_rows_retained,
    private_support_rows: row.private_support_rows,
    identity_admitted: row.identity_admitted,
    negative_existence_claim_created: row.negative_existence_claim_created,
    outside_human_dependency: row.outside_human_dependency,
    publication_effect: row.publication_effect,
    adoption_effect: row.adoption_effect,
    graph_effect: row.graph_effect,
    promotes_to: row.promotes_to,
  };
}

function sourceInventoryRow(attempt) {
  const locatorUrl = archiveQueryUrl(attempt.source_url);
  assert.equal(
    sha256Text(locatorUrl),
    attempt.archive_query_url_sha256,
    `${attempt.attempt_receipt_id}: Archive query URL drift`,
  );
  return {
    receipt_id: attempt.attempt_receipt_id,
    source_id: `schoolhouse-first-party-archive-locator-${attempt.acquisition_phase}-${attempt.source_route_id}`,
    locator_url: locatorUrl,
    queried_url: attempt.source_url,
    source_type: 'public_archive_cdx_metadata_query',
    evidence_class: 'primary_public_archive_metadata_query_custody',
    source_state: attempt.state_class,
    retrieved_at: attempt.completed_at,
    content_sha256: attempt.response_sha256,
    route_result_sha256: sha256Text(JSON.stringify(attempt)),
    workflow_run_id: attempt.workflow_run_id,
    artifact_id: attempt.artifact_id,
    artifact_digest: attempt.artifact_digest,
    request_method: 'GET',
    archive_query_url_sha256: attempt.archive_query_url_sha256,
    snapshot_locator_rows: attempt.snapshot_locator_rows,
    error_message_sha256: attempt.error_message_sha256,
    archived_body_fetched: false,
    replay_locator_dereferenced: false,
    query_submitted: false,
    organization_name_submitted: false,
    identifier_submitted: false,
    source_rows_acquired: 0,
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
    note: `${attempt.acquisition_phase} exact-URL Archive CDX metadata query; ${attempt.state}; archived page bodies were not fetched.`,
  };
}

function build(baselineDir, replayDir) {
  verifyChecksums(baselineDir);
  verifyChecksums(replayDir);
  const baselineArtifactManifest = verifyArtifactManifest(baselineDir, 'schoolhouse-first-party-archive-locator-artifact@1');
  const replayArtifactManifest = verifyArtifactManifest(replayDir, 'schoolhouse-first-party-archive-locator-replay-artifact@1');

  const baselineSummary = readJson(path.join(baselineDir, 'summary.json'));
  const baselinePolicy = readJson(path.join(baselineDir, 'route-policy.json'));
  const baselineRoutes = readJsonl(path.join(baselineDir, 'archive-route-results.jsonl'));
  const baselineLocators = readJsonl(path.join(baselineDir, 'archive-snapshot-locators.jsonl'));
  const replaySummary = readJson(path.join(replayDir, 'summary.json'));
  const replayPolicy = readJson(path.join(replayDir, 'route-policy.json'));
  const replayRoutes = readJsonl(path.join(replayDir, 'replay-route-results.jsonl'));
  const replayLocators = readJsonl(path.join(replayDir, 'archive-snapshot-locators.jsonl'));

  assert.equal(sha256File(path.join(baselineDir, 'archive-route-results.jsonl')), BASELINE_ROUTE_RESULTS_SHA256, 'baseline route-result SHA drift');
  assert.equal(sha256File(path.join(baselineDir, 'archive-snapshot-locators.jsonl')), BASELINE_LOCATORS_SHA256, 'baseline locator SHA drift');
  assert.equal(baselineSummary.schema_version, 'schoolhouse-first-party-archive-locator-census@1', 'baseline summary schema drift');
  assert.equal(baselineSummary.declared_source_routes, BASELINE_ROUTE_COUNT, 'baseline route denominator drift');
  assert.equal(baselineSummary.terminal_archive_query_rows, BASELINE_ROUTE_COUNT, 'baseline terminal row drift');
  assert.equal(baselineSummary.archive_api_queries, BASELINE_ROUTE_COUNT, 'baseline query count drift');
  assert.equal(baselineSummary.archived_bodies_fetched, 0, 'baseline body-fetch boundary drift');
  assert.equal(baselineSummary.identities_admitted, 0, 'baseline identity boundary drift');
  assert.equal(baselineSummary.negative_existence_claims_created, 0, 'baseline absence boundary drift');
  assert.equal(baselineSummary.outside_human_dependency, false, 'baseline outside-human boundary drift');
  assert.equal(baselinePolicy.archive_api.exact_url_queries, BASELINE_ROUTE_COUNT, 'baseline policy query drift');
  assert.equal(baselinePolicy.archive_api.archived_page_bodies_fetched, false, 'baseline policy body-fetch drift');
  assert.equal(baselinePolicy.interpretation.zero_rows_is_not_absence, true, 'baseline zero-row interpretation drift');
  assert.equal(baselinePolicy.interpretation.provider_error_is_not_absence, true, 'baseline error interpretation drift');
  assert.equal(baselineRoutes.length, BASELINE_ROUTE_COUNT, 'baseline route file count drift');
  assert.equal(baselineLocators.length, baselineSummary.archive_snapshot_locator_rows, 'baseline locator count drift');

  assert.equal(replaySummary.schema_version, 'schoolhouse-first-party-archive-locator-transport-replay@1', 'replay summary schema drift');
  assert.equal(replaySummary.baseline_workflow_run_id, BASELINE_RUN_ID, 'replay baseline run drift');
  assert.equal(replaySummary.baseline_artifact_id, BASELINE_ARTIFACT_ID, 'replay baseline artifact drift');
  assert.equal(replaySummary.baseline_artifact_digest, BASELINE_ARTIFACT_DIGEST, 'replay baseline digest drift');
  assert.equal(replaySummary.declared_retry_routes, REPLAY_ROUTE_COUNT, 'replay denominator drift');
  assert.equal(replaySummary.terminal_replay_rows, REPLAY_ROUTE_COUNT, 'replay terminal row drift');
  assert.equal(replaySummary.archive_api_queries, REPLAY_ROUTE_COUNT, 'replay query count drift');
  assert.equal(replaySummary.replay_request_attempts, REPLAY_ROUTE_COUNT, 'replay attempt count drift');
  assert.equal(replaySummary.maximum_parallel_workers, 1, 'replay serialization drift');
  assert.equal(replaySummary.inter_query_delay_seconds, 3, 'replay pacing drift');
  assert.equal(replaySummary.archived_bodies_fetched, 0, 'replay body-fetch boundary drift');
  assert.equal(replaySummary.identities_admitted, 0, 'replay identity boundary drift');
  assert.equal(replaySummary.negative_existence_claims_created, 0, 'replay absence boundary drift');
  assert.equal(replaySummary.outside_human_dependency, false, 'replay outside-human boundary drift');
  assert.equal(replayPolicy.baseline.workflow_run_id, BASELINE_RUN_ID, 'replay policy baseline run drift');
  assert.equal(replayPolicy.baseline.artifact_id, BASELINE_ARTIFACT_ID, 'replay policy baseline artifact drift');
  assert.equal(replayPolicy.baseline.artifact_digest, BASELINE_ARTIFACT_DIGEST, 'replay policy baseline digest drift');
  assert.equal(replayPolicy.baseline.route_results_sha256, BASELINE_ROUTE_RESULTS_SHA256, 'replay policy route SHA drift');
  assert.equal(replayPolicy.baseline.snapshot_locators_sha256, BASELINE_LOCATORS_SHA256, 'replay policy locator SHA drift');
  assert.equal(replayPolicy.source_denominator.replayed_transport_error_routes, REPLAY_ROUTE_COUNT, 'replay policy denominator drift');
  assert.equal(replayPolicy.archive_api.archived_page_bodies_fetched, false, 'replay policy body-fetch drift');
  assert.equal(replayPolicy.interpretation.zero_rows_after_replay_is_not_absence, true, 'replay zero-row interpretation drift');
  assert.equal(replayPolicy.interpretation.provider_error_after_replay_is_not_absence, true, 'replay error interpretation drift');
  assert.equal(replayRoutes.length, REPLAY_ROUTE_COUNT, 'replay route file count drift');
  assert.equal(replayLocators.length, replaySummary.archive_snapshot_locator_rows, 'replay locator count drift');

  assert(unique(baselineRoutes.map(row => row.source_route_id)), 'baseline source route IDs must be unique');
  assert(unique(replayRoutes.map(row => row.source_route_id)), 'replay source route IDs must be unique');
  assert(baselineRoutes.every(row => row.request_method === 'GET' && row.request_attempts === 1), 'baseline request boundary drift');
  assert(replayRoutes.every(row => row.request_method === 'GET' && row.replay_attempts === 1), 'replay request boundary drift');
  const baselineErrors = baselineRoutes.filter(row => row.state === 'terminal_archive_transport_error_not_absence_evidence');
  assert.equal(baselineErrors.length, REPLAY_ROUTE_COUNT, 'baseline retry denominator drift');
  assert.deepEqual(
    replayRoutes.map(row => row.source_route_id).sort(),
    baselineErrors.map(row => row.source_route_id).sort(),
    'replay route set must equal the baseline transport-error set',
  );
  const baselineByRoute = new Map(baselineRoutes.map(row => [row.source_route_id, row]));
  for (const replay of replayRoutes) {
    const baseline = baselineByRoute.get(replay.source_route_id);
    assert(baseline, `${replay.source_route_id}: missing baseline`);
    assert.equal(replay.source_url, baseline.source_url, `${replay.source_route_id}: source URL drift`);
    assert.equal(replay.source_receipt_id, baseline.source_receipt_id, `${replay.source_route_id}: source receipt drift`);
    assert.equal(replay.archive_query_url_sha256, baseline.archive_query_url_sha256, `${replay.source_route_id}: query hash drift`);
    assert.equal(replay.baseline_state, baseline.state, `${replay.source_route_id}: baseline state drift`);
    assert.equal(replay.baseline_error_class, baseline.error_class, `${replay.source_route_id}: baseline error class drift`);
    assert.equal(replay.baseline_error_message_sha256, baseline.error_message_sha256, `${replay.source_route_id}: baseline error hash drift`);
  }

  for (const row of [...baselineRoutes, ...replayRoutes]) {
    assert.equal(row.archived_bodies_fetched, 0, `${row.source_route_id}: archived-body boundary drift`);
    assert.equal(row.interactive_search_submissions, 0, `${row.source_route_id}: search boundary drift`);
    assert.equal(row.organization_name_submissions, 0, `${row.source_route_id}: organization submission drift`);
    assert.equal(row.identifier_submissions, 0, `${row.source_route_id}: identifier submission drift`);
    assert.equal(row.source_rows_acquired, 0, `${row.source_route_id}: source-row boundary drift`);
    assert.equal(row.street_address_rows_retained, 0, `${row.source_route_id}: address boundary drift`);
    assert.equal(row.contact_detail_rows_retained, 0, `${row.source_route_id}: contact boundary drift`);
    assert.equal(row.private_support_rows, 0, `${row.source_route_id}: private-support boundary drift`);
    assert.equal(row.identity_admitted, false, `${row.source_route_id}: identity boundary drift`);
    assert.equal(row.negative_existence_claim_created, false, `${row.source_route_id}: absence boundary drift`);
    assert.equal(row.outside_human_dependency, false, `${row.source_route_id}: outside-human boundary drift`);
    assert.equal(row.publication_effect, 'none', `${row.source_route_id}: publication boundary drift`);
    assert.equal(row.adoption_effect, 'none', `${row.source_route_id}: adoption boundary drift`);
    assert.equal(row.graph_effect, 'none', `${row.source_route_id}: graph boundary drift`);
    assert.equal(row.promotes_to, 'candidate_only', `${row.source_route_id}: promotion boundary drift`);
  }
  for (const row of [...baselineLocators, ...replayLocators]) {
    assert.equal(row.archived_body_fetched, false, `${row.source_route_id}: locator body-fetch drift`);
    assert.equal(row.replay_dereferenced, false, `${row.source_route_id}: locator dereference drift`);
    assert.equal(row.source_rows_acquired, 0, `${row.source_route_id}: locator source-row drift`);
    assert.equal(row.street_address_rows_retained, 0, `${row.source_route_id}: locator address drift`);
    assert.equal(row.contact_detail_rows_retained, 0, `${row.source_route_id}: locator contact drift`);
    assert.equal(row.private_support_rows, 0, `${row.source_route_id}: locator private-support drift`);
    assert.equal(row.identity_admitted, false, `${row.source_route_id}: locator identity drift`);
    assert.equal(row.negative_existence_claim_created, false, `${row.source_route_id}: locator absence drift`);
    assert.equal(row.outside_human_dependency, false, `${row.source_route_id}: locator outside-human drift`);
    assert.equal(row.publication_effect, 'none', `${row.source_route_id}: locator publication drift`);
    assert.equal(row.adoption_effect, 'none', `${row.source_route_id}: locator adoption drift`);
    assert.equal(row.graph_effect, 'none', `${row.source_route_id}: locator graph drift`);
    assert.equal(row.promotes_to, 'candidate_only', `${row.source_route_id}: locator promotion drift`);
  }

  const baselineAttempts = baselineRoutes
    .map(row => normalizeAttempt(row, 'baseline', BASELINE_RUN_ID, BASELINE_ARTIFACT_ID, BASELINE_ARTIFACT_DIGEST))
    .sort((a, b) => a.source_route_id.localeCompare(b.source_route_id));
  const replayAttempts = replayRoutes
    .map(row => normalizeAttempt(row, 'replay', REPLAY_RUN_ID, REPLAY_ARTIFACT_ID, REPLAY_ARTIFACT_DIGEST))
    .sort((a, b) => a.source_route_id.localeCompare(b.source_route_id));
  const attemptRows = [...baselineAttempts, ...replayAttempts]
    .sort((a, b) => a.source_route_id.localeCompare(b.source_route_id) || a.attempt_number_for_route - b.attempt_number_for_route);
  assert.equal(attemptRows.length, TOTAL_ATTEMPT_ROWS, 'combined attempt denominator drift');
  assert(unique(attemptRows.map(row => row.attempt_id)), 'attempt IDs must be unique');
  assert(unique(attemptRows.map(row => row.attempt_receipt_id)), 'attempt receipt IDs must be unique');

  const replayByRoute = new Map(replayRoutes.map(row => [row.source_route_id, row]));
  const effectiveRouteRows = baselineRoutes.map(baseline => {
    const replay = replayByRoute.get(baseline.source_route_id) ?? null;
    const effective = replay ?? baseline;
    const effectivePhase = replay ? 'bounded_transport_replay' : 'baseline_archive_locator_census';
    return {
      schema_version: 'schoolhouse-first-party-archive-locator-route-custody@1',
      route_custody_id: `schoolhouse-archive-route-${baseline.source_route_id}`,
      source_route_id: baseline.source_route_id,
      source_receipt_id: baseline.source_receipt_id,
      source_url: baseline.source_url,
      source_url_field: baseline.source_url_field,
      baseline_attempt_receipt_id: attemptReceiptId('baseline', baseline.source_route_id),
      replay_attempt_receipt_id: replay ? attemptReceiptId('replay', baseline.source_route_id) : null,
      total_archive_api_attempts: replay ? 2 : 1,
      effective_attempt_phase: effectivePhase,
      effective_state: effective.state,
      effective_state_class: stateClass(effective.state),
      status: effective.status,
      archive_query_url_sha256: effective.archive_query_url_sha256,
      final_archive_api_url_sha256: effective.final_archive_api_url_sha256 ?? null,
      response_sha256: effective.response_sha256 ?? null,
      error_class: effective.error_class ?? null,
      error_message_sha256: effective.error_message_sha256 ?? null,
      result_cap_exhausted: effective.result_cap_exhausted,
      snapshot_locator_rows: effective.snapshot_locator_rows,
      earliest_timestamp: effective.earliest_timestamp ?? null,
      latest_timestamp: effective.latest_timestamp ?? null,
      baseline_state: baseline.state,
      replay_state: replay?.state ?? null,
      archived_content_custody: false,
      archived_bodies_fetched: 0,
      replay_locators_dereferenced: 0,
      interactive_search_submissions: 0,
      organization_name_submissions: 0,
      identifier_submissions: 0,
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
  }).sort((a, b) => a.source_route_id.localeCompare(b.source_route_id));
  assert.equal(effectiveRouteRows.length, BASELINE_ROUTE_COUNT, 'effective route denominator drift');
  assert(unique(effectiveRouteRows.map(row => row.source_route_id)), 'effective route IDs must be unique');

  const locatorRows = [
    ...baselineLocators.map(row => ({ row, phase: 'baseline_archive_locator_census', workflowRunId: BASELINE_RUN_ID, artifactId: BASELINE_ARTIFACT_ID, artifactDigest: BASELINE_ARTIFACT_DIGEST })),
    ...replayLocators.map(row => ({ row, phase: 'bounded_transport_replay', workflowRunId: REPLAY_RUN_ID, artifactId: REPLAY_ARTIFACT_ID, artifactDigest: REPLAY_ARTIFACT_DIGEST })),
  ].map(({ row, phase, workflowRunId, artifactId, artifactDigest }) => ({
    schema_version: 'schoolhouse-first-party-archive-locator@1',
    locator_id: locatorId(row),
    acquisition_phase: phase,
    workflow_run_id: workflowRunId,
    artifact_id: artifactId,
    artifact_digest: artifactDigest,
    attempt_receipt_id: attemptReceiptId(phase === 'baseline_archive_locator_census' ? 'baseline' : 'replay', row.source_route_id),
    source_route_id: row.source_route_id,
    source_receipt_id: row.source_receipt_id,
    queried_url: row.queried_url,
    timestamp: row.timestamp,
    original_url: row.original_url,
    status_code: row.status_code,
    mime_type: row.mime_type,
    archive_digest: row.archive_digest,
    archived_length: row.archived_length,
    replay_locator: row.replay_locator,
    archived_body_fetched: false,
    replay_dereferenced: false,
    archived_content_custody: false,
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
  })).sort((a, b) => a.source_route_id.localeCompare(b.source_route_id)
    || a.timestamp.localeCompare(b.timestamp)
    || a.original_url.localeCompare(b.original_url)
    || a.archive_digest.localeCompare(b.archive_digest));
  assert(unique(locatorRows.map(row => row.locator_id)), 'locator IDs must be unique');
  assert(unique(locatorRows.map(row => [row.source_route_id, row.timestamp, row.original_url, row.archive_digest].join('\u0000'))), 'locator tuples must be unique');

  const routesWithLocators = effectiveRouteRows.filter(row => row.snapshot_locator_rows > 0).length;
  const boundedZeroRoutes = effectiveRouteRows.filter(row => row.effective_state_class === 'bounded_zero_archive_locator_metadata').length;
  const residualProviderErrors = effectiveRouteRows.filter(row => row.effective_state_class === 'archive_locator_provider_error').length;
  const uniqueArchiveDigests = new Set(locatorRows.map(row => row.archive_digest)).size;
  const timestamps = locatorRows.map(row => row.timestamp);
  const resultCapsExhausted = attemptRows.filter(row => row.result_cap_exhausted).length;
  assert.equal(routesWithLocators + boundedZeroRoutes + residualProviderErrors, BASELINE_ROUTE_COUNT, 'effective route state partition drift');
  assert.equal(locatorRows.length, effectiveRouteRows.reduce((sum, row) => sum + row.snapshot_locator_rows, 0), 'effective locator total drift');

  const sourceInventoryRows = attemptRows.map(sourceInventoryRow);
  const custody = {
    schema_version: 'schoolhouse-first-party-archive-locator-custody@1',
    as_of: AS_OF,
    acquisitions: {
      baseline: {
        workflow_run_id: BASELINE_RUN_ID,
        artifact_id: BASELINE_ARTIFACT_ID,
        artifact_digest: BASELINE_ARTIFACT_DIGEST,
        acquisition_head: BASELINE_ACQUISITION_HEAD,
        artifact_manifest_sha256: sha256File(path.join(baselineDir, 'artifact-manifest.json')),
        route_results_sha256: BASELINE_ROUTE_RESULTS_SHA256,
        snapshot_locators_sha256: BASELINE_LOCATORS_SHA256,
        source_routes: BASELINE_ROUTE_COUNT,
        request_attempts: BASELINE_ROUTE_COUNT,
      },
      bounded_transport_replay: {
        workflow_run_id: REPLAY_RUN_ID,
        artifact_id: REPLAY_ARTIFACT_ID,
        artifact_digest: REPLAY_ARTIFACT_DIGEST,
        acquisition_head: REPLAY_ACQUISITION_HEAD,
        artifact_manifest_sha256: sha256File(path.join(replayDir, 'artifact-manifest.json')),
        route_results_sha256: sha256File(path.join(replayDir, 'replay-route-results.jsonl')),
        snapshot_locators_sha256: sha256File(path.join(replayDir, 'archive-snapshot-locators.jsonl')),
        replayed_transport_error_routes: REPLAY_ROUTE_COUNT,
        request_attempts: REPLAY_ROUTE_COUNT,
        maximum_parallel_workers: replaySummary.maximum_parallel_workers,
        inter_query_delay_seconds: replaySummary.inter_query_delay_seconds,
      },
    },
    bounds: {
      archive_api_host: 'web.archive.org',
      archive_api_path: '/cdx/search/cdx',
      from_year: '2019',
      to_year: '2026',
      exact_url_match: true,
      maximum_results_per_route: 1000,
      maximum_response_bytes_per_route: 5242880,
      baseline_maximum_parallel_workers: 4,
      replay_maximum_parallel_workers: 1,
      replay_inter_query_delay_seconds: 3,
      request_methods: ['GET'],
      archived_page_bodies_fetched: 0,
      replay_locators_dereferenced: 0,
    },
    counts: {
      source_route_rows: BASELINE_ROUTE_COUNT,
      baseline_attempt_rows: BASELINE_ROUTE_COUNT,
      replay_attempt_rows: REPLAY_ROUTE_COUNT,
      total_attempt_rows: TOTAL_ATTEMPT_ROWS,
      effective_route_rows: effectiveRouteRows.length,
      routes_with_snapshot_locators: routesWithLocators,
      bounded_zero_snapshot_locator_routes: boundedZeroRoutes,
      residual_provider_error_routes: residualProviderErrors,
      archive_snapshot_locator_rows: locatorRows.length,
      unique_archive_digests: uniqueArchiveDigests,
      earliest_snapshot_timestamp: timestamps.length ? timestamps.reduce((a, b) => a < b ? a : b) : null,
      latest_snapshot_timestamp: timestamps.length ? timestamps.reduce((a, b) => a > b ? a : b) : null,
      result_caps_exhausted: resultCapsExhausted,
      archived_bodies_fetched: 0,
      replay_locators_dereferenced: 0,
      interactive_search_submissions: 0,
      organization_name_submissions: 0,
      identifier_submissions: 0,
      source_rows_acquired: 0,
      street_address_rows_retained: 0,
      contact_detail_rows_retained: 0,
      private_support_rows: 0,
      identities_admitted: 0,
      negative_existence_claims_created: 0,
    },
    interpretation: {
      archive_locator_metadata_is_not_archived_content_custody: true,
      timestamp_digest_status_mime_length_or_replay_locator_is_not_registry_identity: true,
      bounded_zero_rows_is_not_absence: true,
      provider_error_after_bounded_replay_is_not_absence: true,
      replay_locator_must_not_be_dereferenced_without_separate_authorization: true,
    },
    terminal_frontier: {
      declared_two_attempt_archive_metadata_protocol_terminal: true,
      baseline_transport_errors_replayed_exactly_once: true,
      live_first_party_surface_denominator_must_not_be_repeated: true,
      archive_locator_metadata_denominator_must_not_be_repeated: true,
      archived_content_custody_open: true,
      registry_grade_legal_identity_open: true,
      remaining_registry_grade_fields: [
        'exact legal name', 'EIN', 'exemption record', 'formation documents', 'officers', 'board',
        'governance', 'funding', 'fiscal sponsor', 'related parties', 'differently named corporation',
        'state-only registration',
      ],
      outside_human_dependency: false,
    },
    privacy: {
      raw_source_retained: false,
      archived_page_bodies_retained: false,
      archived_visible_text_retained: false,
      street_address_rows_retained: 0,
      contact_detail_rows_retained: 0,
      private_support_rows: 0,
    },
    public_schoolhouse_identity_admitted: false,
    admitted_legal_name: null,
    admitted_ein: null,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  };

  writeJsonl(path.join(DATA_DIR, 'source-inventory-14.jsonl'), sourceInventoryRows);
  writeJsonl(path.join(DATA_DIR, 'schoolhouse-first-party-archive-locator-attempt-results.jsonl'), attemptRows);
  writeJsonl(path.join(DATA_DIR, 'schoolhouse-first-party-archive-locator-route-results.jsonl'), effectiveRouteRows);
  writeJsonl(path.join(DATA_DIR, 'schoolhouse-first-party-archive-locators.jsonl'), locatorRows);
  writeJson(path.join(DATA_DIR, 'schoolhouse-first-party-archive-locator-custody.json'), custody);

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

  assert.equal(manifest.counts.source_inventory_rows, PREDECESSOR_SOURCE_INVENTORY_ROWS, 'predecessor source-inventory count drift');
  assert.equal(manifest.counts.coverage_denominator_rows, PREDECESSOR_COVERAGE_ROWS, 'predecessor coverage count drift');
  assert.equal(manifest.counts.explicit_gap_rows, PREDECESSOR_GAP_ROWS, 'predecessor gap count drift');
  assert.equal(manifest.storage_contract.source_inventory_parts.at(-1), 'source-inventory-13.jsonl', 'predecessor source-inventory order drift');
  assert(!manifest.storage_contract.schoolhouse_first_party_archive_locator_custody, 'archive locator custody already present');

  manifest.counts.source_inventory_rows = EXPECTED_SOURCE_INVENTORY_ROWS;
  manifest.counts.coverage_denominator_rows = EXPECTED_COVERAGE_ROWS;
  Object.assign(manifest.counts, {
    schoolhouse_first_party_archive_locator_source_route_rows: BASELINE_ROUTE_COUNT,
    schoolhouse_first_party_archive_locator_baseline_attempt_rows: BASELINE_ROUTE_COUNT,
    schoolhouse_first_party_archive_locator_replay_attempt_rows: REPLAY_ROUTE_COUNT,
    schoolhouse_first_party_archive_locator_total_attempt_rows: TOTAL_ATTEMPT_ROWS,
    schoolhouse_first_party_archive_locator_effective_route_rows: effectiveRouteRows.length,
    schoolhouse_first_party_archive_locator_routes_with_locators: routesWithLocators,
    schoolhouse_first_party_archive_locator_bounded_zero_routes: boundedZeroRoutes,
    schoolhouse_first_party_archive_locator_residual_provider_error_routes: residualProviderErrors,
    schoolhouse_first_party_archive_locator_rows: locatorRows.length,
    schoolhouse_first_party_archive_locator_unique_digests: uniqueArchiveDigests,
    schoolhouse_first_party_archive_locator_result_caps_exhausted: resultCapsExhausted,
    schoolhouse_first_party_archive_locator_archived_bodies_fetched: 0,
    schoolhouse_first_party_archive_locator_replay_dereferences: 0,
    schoolhouse_first_party_archive_locator_search_submissions: 0,
    schoolhouse_first_party_archive_locator_source_rows_acquired: 0,
    schoolhouse_first_party_archive_locator_admitted_identity_rows: 0,
  });
  for (const boundary of [
    'Archive CDX timestamps, original URLs, status codes, MIME types, digests, archived lengths, and replay locators are public locator metadata and not archived-content custody or registry-grade School.House identity evidence.',
    'A bounded zero-row Archive response, or a provider error that persists after one exact serialized replay, is not evidence that no archived page, legal entity, filing, exemption, officer, board, sponsor, or differently named organization exists.',
    'An Archive replay locator may not be dereferenced without a separately bounded acquisition that preserves publisher, privacy, identity, and absence-evidence controls.',
  ]) {
    if (!manifest.boundaries.includes(boundary)) manifest.boundaries.push(boundary);
  }
  manifest.coverage.schoolhouse_first_party_archive_locator_custody = `${BASELINE_ROUTE_COUNT}_routes_${TOTAL_ATTEMPT_ROWS}_attempts_${routesWithLocators}_routes_with_locators_${boundedZeroRoutes}_bounded_zero_${residualProviderErrors}_provider_errors_${locatorRows.length}_locator_rows_${uniqueArchiveDigests}_unique_digests_zero_replay_dereferences_zero_identity`;
  manifest.custody.next_waterline = 'archive_locator_metadata_to_separately_bounded_archived_content_or_registry_grade_legal_identity_custody';
  manifest.purpose = manifest.purpose.includes('archive-locator metadata custody')
    ? manifest.purpose
    : manifest.purpose.replace(
      'query-free first-party legal-surface and form-mechanics custody,',
      'query-free first-party legal-surface, form-mechanics, and archive-locator metadata custody,',
    );
  manifest.source_inventory.evidence_class_counts.primary_public_archive_metadata_query_custody = TOTAL_ATTEMPT_ROWS;
  const sourceStateCounts = sourceInventoryRows.reduce((out, row) => {
    out[row.source_state] = (out[row.source_state] ?? 0) + 1;
    return out;
  }, {});
  for (const [key, value] of Object.entries(sourceStateCounts)) manifest.source_inventory.source_state_counts[key] = value;
  manifest.storage_contract.source_inventory_parts.push('source-inventory-14.jsonl');
  Object.assign(manifest.storage_contract, {
    schoolhouse_first_party_archive_locator_custody: 'schoolhouse-first-party-archive-locator-custody.json',
    schoolhouse_first_party_archive_locator_attempt_results: 'schoolhouse-first-party-archive-locator-attempt-results.jsonl',
    schoolhouse_first_party_archive_locator_route_results: 'schoolhouse-first-party-archive-locator-route-results.jsonl',
    schoolhouse_first_party_archive_locators: 'schoolhouse-first-party-archive-locators.jsonl',
  });

  const surfaceName = 'School.House first-party public Archive locator metadata custody';
  coverage.denominators = coverage.denominators.filter(row => row.surface !== surfaceName);
  coverage.denominators.push({
    surface: surfaceName,
    declared_total: BASELINE_ROUTE_COUNT,
    enumerated_total: effectiveRouteRows.length,
    baseline_attempt_rows: BASELINE_ROUTE_COUNT,
    bounded_replay_attempt_rows: REPLAY_ROUTE_COUNT,
    total_attempt_rows: TOTAL_ATTEMPT_ROWS,
    routes_with_snapshot_locators: routesWithLocators,
    bounded_zero_snapshot_locator_routes: boundedZeroRoutes,
    residual_provider_error_routes: residualProviderErrors,
    archive_snapshot_locator_rows: locatorRows.length,
    unique_archive_digests: uniqueArchiveDigests,
    result_caps_exhausted: resultCapsExhausted,
    archived_bodies_fetched: 0,
    replay_locators_dereferenced: 0,
    search_submissions: 0,
    source_rows_acquired: 0,
    admitted_identities: 0,
    coverage_state: 'terminal_for_declared_baseline_plus_one_exact_transport_replay_archive_metadata_protocol_no_archived_content_or_identity_admitted',
  });
  const gapIndex = coverage.explicit_nulls_and_gaps.findIndex(value => value.startsWith('School.House public identity remains unresolved after terminal custody for five fixed roots'));
  assert(gapIndex >= 0, 'first-party legal-surface gap row not found');
  coverage.explicit_nulls_and_gaps[gapIndex] = `School.House public identity remains unresolved after the complete forty-six-route first-party surface census and the bounded public Archive locator protocol. The Archive plane preserves ${TOTAL_ATTEMPT_ROWS} exact-URL metadata attempts, ${locatorRows.length} replay locators across ${routesWithLocators} routes, ${boundedZeroRoutes} bounded zero-row routes, and ${residualProviderErrors} residual provider-error routes after one exact serialized replay. No replay locator was dereferenced and no archived page body or visible text was acquired. Locator metadata, bounded zero rows, and provider errors are not legal-identity or absence evidence. Exact legal name, EIN, exemption, formation documents, officers, board, governance, funding, fiscal sponsor, related parties, differently named corporations, state-only registrations, and separately authorized archived-content custody remain open.`;

  const legalTask = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
  assert(legalTask, 'School.House legal-governance frontier task missing');
  legalTask.prior_first_party_archive_locator_custody = {
    baseline_workflow_run_id: BASELINE_RUN_ID,
    baseline_artifact_id: BASELINE_ARTIFACT_ID,
    baseline_artifact_digest: BASELINE_ARTIFACT_DIGEST,
    replay_workflow_run_id: REPLAY_RUN_ID,
    replay_artifact_id: REPLAY_ARTIFACT_ID,
    replay_artifact_digest: REPLAY_ARTIFACT_DIGEST,
    source_routes: BASELINE_ROUTE_COUNT,
    baseline_attempt_rows: BASELINE_ROUTE_COUNT,
    replay_attempt_rows: REPLAY_ROUTE_COUNT,
    total_attempt_rows: TOTAL_ATTEMPT_ROWS,
    routes_with_snapshot_locators: routesWithLocators,
    bounded_zero_snapshot_locator_routes: boundedZeroRoutes,
    residual_provider_error_routes: residualProviderErrors,
    archive_snapshot_locator_rows: locatorRows.length,
    unique_archive_digests: uniqueArchiveDigests,
    archived_bodies_fetched: 0,
    replay_locators_dereferenced: 0,
    search_submissions: 0,
    source_rows_acquired: 0,
    admitted_identities: 0,
    state: 'terminal_for_declared_baseline_plus_one_exact_transport_replay_archive_metadata_protocol_no_archived_content_or_identity_admitted',
    custody_file: 'schoolhouse-first-party-archive-locator-custody.json',
  };
  legalTask.next_transition = 'Do not repeat the frozen North Carolina route/PDF denominators, the forty-six-route query-free first-party surface census, or the baseline-plus-one-replay Archive locator metadata protocol. Do not dereference an Archive replay locator without a separately bounded acquisition. Continue registry-grade legal-name, EIN, exemption, formation, officer, board, governance, funding, fiscal-sponsor, related-party, differently named corporation, and state-only registration evidence; separately authorize only the minimum archived-content surfaces needed to test a declared identity hypothesis. Preserve all zero-row and provider-error states as non-absence custody.';

  schoolhouse.state_registry_identity_census.first_party_archive_locator_custody = {
    as_of: AS_OF,
    baseline_workflow_run_id: BASELINE_RUN_ID,
    baseline_artifact_id: BASELINE_ARTIFACT_ID,
    replay_workflow_run_id: REPLAY_RUN_ID,
    replay_artifact_id: REPLAY_ARTIFACT_ID,
    source_routes: BASELINE_ROUTE_COUNT,
    total_attempt_rows: TOTAL_ATTEMPT_ROWS,
    routes_with_snapshot_locators: routesWithLocators,
    bounded_zero_snapshot_locator_routes: boundedZeroRoutes,
    residual_provider_error_routes: residualProviderErrors,
    archive_snapshot_locator_rows: locatorRows.length,
    unique_archive_digests: uniqueArchiveDigests,
    earliest_snapshot_timestamp: custody.counts.earliest_snapshot_timestamp,
    latest_snapshot_timestamp: custody.counts.latest_snapshot_timestamp,
    archived_bodies_fetched: 0,
    replay_locators_dereferenced: 0,
    archive_locator_state: 'terminal_for_declared_baseline_plus_one_exact_transport_replay_metadata_protocol',
    archived_content_state: 'not_acquired',
    identity_state: 'unresolved_after_archive_locator_metadata_custody_no_registry_identity_admitted',
    admitted_legal_name: null,
    admitted_ein: null,
    public_schoolhouse_identity_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    graph_effect: 'none',
    promotes_to: 'candidate_only',
    custody_file: 'schoolhouse-first-party-archive-locator-custody.json',
  };

  readme = replaceOnce(readme, 'public-source receipts                        336', `public-source receipts                        ${EXPECTED_SOURCE_INVENTORY_ROWS}`, 'README public-source count');
  readme = replaceOnce(
    readme,
    'first-party legal-surface public identities admitted            0\n',
    `first-party legal-surface public identities admitted            0\nfirst-party Archive source routes                    ${String(BASELINE_ROUTE_COUNT).padStart(2)} / ${BASELINE_ROUTE_COUNT}\nfirst-party Archive baseline/replay attempts         ${BASELINE_ROUTE_COUNT} / ${REPLAY_ROUTE_COUNT}\nfirst-party Archive total metadata attempts               ${TOTAL_ATTEMPT_ROWS}\nfirst-party Archive routes with locators                  ${routesWithLocators}\nfirst-party Archive bounded zero routes                    ${boundedZeroRoutes}\nfirst-party Archive residual provider-error routes         ${residualProviderErrors}\nfirst-party Archive locator rows                           ${locatorRows.length}\nfirst-party Archive unique digests                         ${uniqueArchiveDigests}\nfirst-party Archive bodies/replay dereferences           0 / 0\nfirst-party Archive searches or submissions                 0\nfirst-party Archive public identities admitted              0\n`,
    'README archive counts',
  );
  readme = replaceOnce(readme, '`source-inventory-01.jsonl` through `source-inventory-13.jsonl`', '`source-inventory-01.jsonl` through `source-inventory-14.jsonl`', 'README source-inventory range');
  readme = replaceOnce(
    readme,
    '- `schoolhouse-first-party-legal-surface-custody.json`, the combined route, link, surface-evidence, adjudicated-candidate, and external-link files, and `source-inventory-13.jsonl` preserve terminal custody for five fixed roots and all forty-three discovered query-free same-host routes. The package distinguishes thirty-nine repeated first-party tax-status self-descriptions, thirty-eight footer brand strings, one context-pattern collision, zero exact legal-name candidates, zero organization JSON-LD rows, eight unsubmitted form-mechanics rows, and zero identity admissions.\n',
    `- \`schoolhouse-first-party-legal-surface-custody.json\`, the combined route, link, surface-evidence, adjudicated-candidate, and external-link files, and \`source-inventory-13.jsonl\` preserve terminal custody for five fixed roots and all forty-three discovered query-free same-host routes. The package distinguishes thirty-nine repeated first-party tax-status self-descriptions, thirty-eight footer brand strings, one context-pattern collision, zero exact legal-name candidates, zero organization JSON-LD rows, eight unsubmitted form-mechanics rows, and zero identity admissions.\n- \`schoolhouse-first-party-archive-locator-custody.json\`, the attempt, effective-route, and locator ledgers, and \`source-inventory-14.jsonl\` preserve ${TOTAL_ATTEMPT_ROWS} exact-URL Archive metadata attempts across the complete forty-six-route first-party denominator. The bounded protocol leaves ${routesWithLocators} routes with public replay locators, ${boundedZeroRoutes} bounded zero-row routes, and ${residualProviderErrors} residual provider-error routes; it dereferences zero locators, acquires zero archived page bodies, and admits zero identities.\n`,
    'README archive files',
  );
  readme = replaceOnce(
    readme,
    '\n\nThe checked-in frontier now directs',
    `\n\nThe Archive-locator successor then issued one exact-URL public CDX metadata query for each of the forty-six frozen first-party routes and one serialized replay only for the twenty-six baseline transport failures. The terminal protocol preserves ${locatorRows.length} public locator rows over ${routesWithLocators} routes, ${boundedZeroRoutes} bounded zero-row routes, and ${residualProviderErrors} residual provider-error routes after replay. No replay locator was dereferenced, no archived page body or visible text was acquired, and no timestamp, digest, MIME type, status, archived length, or replay locator was promoted into legal-identity or absence evidence.\n\nThe checked-in frontier now directs`,
    'README archive continuation',
  );

  writeJson(coveragePath, coverage);
  writeJson(frontierPath, frontier);
  writeJson(schoolhousePath, schoolhouse);
  fs.writeFileSync(readmePath, readme);

  const dataFilesToBind = [
    'acquisition-frontier.json',
    'coverage-matrix.json',
    'schoolhouse.json',
    'source-inventory-14.jsonl',
    'schoolhouse-first-party-archive-locator-custody.json',
    'schoolhouse-first-party-archive-locator-attempt-results.jsonl',
    'schoolhouse-first-party-archive-locator-route-results.jsonl',
    'schoolhouse-first-party-archive-locators.jsonl',
  ];
  for (const filename of dataFilesToBind) manifest.files[filename] = fileReceipt(filename);
  writeJson(manifestPath, manifest);

  const sourceCountPattern = `manifest.counts.source_inventory_rows === ${PREDECESSOR_SOURCE_INVENTORY_ROWS}`;
  const coverageCountPattern = `manifest.counts.coverage_denominator_rows === ${PREDECESSOR_COVERAGE_ROWS}`;
  const sourceCountOccurrences = validator.split(sourceCountPattern).length - 1;
  const coverageCountOccurrences = validator.split(coverageCountPattern).length - 1;
  assert(sourceCountOccurrences >= 1, 'validator predecessor source-count pattern missing');
  assert(coverageCountOccurrences >= 1, 'validator predecessor coverage-count pattern missing');
  validator = validator.split(sourceCountPattern).join(`manifest.counts.source_inventory_rows === ${EXPECTED_SOURCE_INVENTORY_ROWS}`);
  validator = validator.split(coverageCountPattern).join(`manifest.counts.coverage_denominator_rows === ${EXPECTED_COVERAGE_ROWS}`);
  assert(!validator.includes('schoolhouse-first-party-archive-locator-custody.json'), 'archive locator validator block already present');

  const validatorBlock = String.raw`

  {
    const archiveCustody = readJson(path.join(dir, 'schoolhouse-first-party-archive-locator-custody.json'));
    const archiveAttempts = readJsonl(path.join(dir, 'schoolhouse-first-party-archive-locator-attempt-results.jsonl'));
    const archiveRoutes = readJsonl(path.join(dir, 'schoolhouse-first-party-archive-locator-route-results.jsonl'));
    const archiveLocators = readJsonl(path.join(dir, 'schoolhouse-first-party-archive-locators.jsonl'));
    const archiveReceiptIds = new Set(sourceInventory.map(row => row.receipt_id));
    const archiveAttemptsByReceipt = new Map(archiveAttempts.map(row => [row.attempt_receipt_id, row]));
    const archiveSourceInventoryRows = sourceInventory.filter(row => row.evidence_class === 'primary_public_archive_metadata_query_custody');
    const archiveQueryLocator = sourceUrl => {
      const url = new URL('https://web.archive.org/cdx/search/cdx');
      for (const [key, value] of [
        ['url', sourceUrl],
        ['matchType', 'exact'],
        ['from', '2019'],
        ['to', '2026'],
        ['output', 'json'],
        ['fl', 'timestamp,original,statuscode,mimetype,digest,length'],
        ['filter', 'statuscode:200'],
        ['collapse', 'digest'],
        ['limit', '1000'],
      ]) url.searchParams.append(key, value);
      return url.toString();
    };
    const archiveLocatorSha256 = value => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
    const archiveBaselineAttempts = archiveAttempts.filter(row => row.acquisition_phase === 'baseline_archive_locator_census');
    const archiveReplayAttempts = archiveAttempts.filter(row => row.acquisition_phase === 'bounded_transport_replay');
    const archiveRoutesWithLocators = archiveRoutes.filter(row => row.snapshot_locator_rows > 0);
    const archiveBoundedZeroRoutes = archiveRoutes.filter(row => row.effective_state_class === 'bounded_zero_archive_locator_metadata');
    const archiveResidualProviderErrors = archiveRoutes.filter(row => row.effective_state_class === 'archive_locator_provider_error');

    check(manifest.counts.source_inventory_rows === ${EXPECTED_SOURCE_INVENTORY_ROWS}, 'archive source-inventory denominator drift');
    check(manifest.counts.coverage_denominator_rows === ${EXPECTED_COVERAGE_ROWS}, 'archive coverage-denominator count drift');
    check(manifest.counts.explicit_gap_rows === ${PREDECESSOR_GAP_ROWS}, 'archive explicit-gap count drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_source_route_rows === archiveRoutes.length && archiveRoutes.length === ${BASELINE_ROUTE_COUNT}, 'archive source-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_baseline_attempt_rows === archiveBaselineAttempts.length && archiveBaselineAttempts.length === ${BASELINE_ROUTE_COUNT}, 'archive baseline-attempt denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_replay_attempt_rows === archiveReplayAttempts.length && archiveReplayAttempts.length === ${REPLAY_ROUTE_COUNT}, 'archive replay-attempt denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_total_attempt_rows === archiveAttempts.length && archiveAttempts.length === ${TOTAL_ATTEMPT_ROWS}, 'archive total-attempt denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_effective_route_rows === archiveRoutes.length && archiveRoutes.length === ${BASELINE_ROUTE_COUNT}, 'archive effective-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_routes_with_locators === archiveRoutesWithLocators.length && archiveRoutesWithLocators.length === ${routesWithLocators}, 'archive routes-with-locators drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_bounded_zero_routes === archiveBoundedZeroRoutes.length && archiveBoundedZeroRoutes.length === ${boundedZeroRoutes}, 'archive bounded-zero denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_residual_provider_error_routes === archiveResidualProviderErrors.length && archiveResidualProviderErrors.length === ${residualProviderErrors}, 'archive residual-error denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_rows === archiveLocators.length && archiveLocators.length === ${locatorRows.length}, 'archive locator-row denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_unique_digests === new Set(archiveLocators.map(row => row.archive_digest)).size && manifest.counts.schoolhouse_first_party_archive_locator_unique_digests === ${uniqueArchiveDigests}, 'archive unique-digest denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_result_caps_exhausted === archiveAttempts.filter(row => row.result_cap_exhausted).length && manifest.counts.schoolhouse_first_party_archive_locator_result_caps_exhausted === ${resultCapsExhausted}, 'archive result-cap denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_archived_bodies_fetched === 0 && manifest.counts.schoolhouse_first_party_archive_locator_replay_dereferences === 0 && manifest.counts.schoolhouse_first_party_archive_locator_search_submissions === 0 && manifest.counts.schoolhouse_first_party_archive_locator_source_rows_acquired === 0 && manifest.counts.schoolhouse_first_party_archive_locator_admitted_identity_rows === 0, 'archive authority count drift');

    check(archiveSourceInventoryRows.length === archiveAttempts.length && archiveSourceInventoryRows.length === ${TOTAL_ATTEMPT_ROWS}, 'archive source-addressed inventory denominator drift');
    check(archiveSourceInventoryRows.every(row => {
      const attempt = archiveAttemptsByReceipt.get(row.receipt_id);
      if (!attempt) return false;
      const expectedLocator = archiveQueryLocator(attempt.source_url);
      let parsed;
      try { parsed = new URL(row.locator_url); } catch { return false; }
      return row.source_type === 'public_archive_cdx_metadata_query'
        && row.locator_url === expectedLocator
        && row.queried_url === attempt.source_url
        && row.locator_url !== row.queried_url
        && parsed.hostname === 'web.archive.org'
        && parsed.pathname === '/cdx/search/cdx'
        && archiveLocatorSha256(row.locator_url) === attempt.archive_query_url_sha256
        && row.archive_query_url_sha256 === attempt.archive_query_url_sha256
        && row.content_sha256 === attempt.response_sha256;
    }), 'archive source-inventory locator/hash linkage drift');

    check(unique(archiveAttempts.map(row => row.attempt_id)) && unique(archiveAttempts.map(row => row.attempt_receipt_id)), 'archive attempt IDs and receipts must be unique');
    check(unique(archiveRoutes.map(row => row.source_route_id)) && unique(archiveRoutes.map(row => row.route_custody_id)), 'archive effective-route IDs must be unique');
    check(unique(archiveLocators.map(row => row.locator_id)), 'archive locator IDs must be unique');
    check(archiveAttempts.every(row => archiveReceiptIds.has(row.attempt_receipt_id) && row.request_method === 'GET' && row.request_attempts === 1), 'archive attempt receipt/request drift');
    check(archiveAttempts.every(row => row.archived_bodies_fetched === 0 && row.replay_locators_dereferenced === 0 && row.interactive_search_submissions === 0 && row.organization_name_submissions === 0 && row.identifier_submissions === 0), 'archive attempt acquisition boundary drift');
    check(archiveAttempts.every(row => row.source_rows_acquired === 0 && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'archive attempt privacy drift');
    check(archiveAttempts.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'archive attempt authority drift');
    check(archiveBaselineAttempts.every(row => row.attempt_number_for_route === 1), 'archive baseline attempt-number drift');
    check(archiveReplayAttempts.every(row => row.attempt_number_for_route === 2 && row.baseline_state === 'terminal_archive_transport_error_not_absence_evidence'), 'archive replay predecessor drift');
    check(archiveRoutes.every(row => archiveReceiptIds.has(row.baseline_attempt_receipt_id) && (row.replay_attempt_receipt_id === null || archiveReceiptIds.has(row.replay_attempt_receipt_id))), 'archive route receipt linkage drift');
    check(archiveRoutes.every(row => row.total_archive_api_attempts === (row.replay_attempt_receipt_id === null ? 1 : 2)), 'archive route attempt-count drift');
    check(archiveRoutes.every(row => row.archived_content_custody === false && row.archived_bodies_fetched === 0 && row.replay_locators_dereferenced === 0 && row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'archive route authority drift');
    check(archiveRoutes.reduce((sum, row) => sum + row.snapshot_locator_rows, 0) === archiveLocators.length, 'archive effective-route locator total drift');
    check(archiveLocators.every(row => archiveReceiptIds.has(row.attempt_receipt_id) && row.status_code === 200 && row.archived_body_fetched === false && row.replay_dereferenced === false && row.archived_content_custody === false), 'archive locator custody drift');
    check(archiveLocators.every(row => row.source_rows_acquired === 0 && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'archive locator privacy drift');
    check(archiveLocators.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'archive locator authority drift');

    check(archiveCustody.acquisitions.baseline.workflow_run_id === ${BASELINE_RUN_ID} && archiveCustody.acquisitions.baseline.artifact_id === ${BASELINE_ARTIFACT_ID} && archiveCustody.acquisitions.baseline.artifact_digest === '${BASELINE_ARTIFACT_DIGEST}' && archiveCustody.acquisitions.baseline.route_results_sha256 === '${BASELINE_ROUTE_RESULTS_SHA256}' && archiveCustody.acquisitions.baseline.snapshot_locators_sha256 === '${BASELINE_LOCATORS_SHA256}', 'archive baseline acquisition custody drift');
    check(archiveCustody.acquisitions.bounded_transport_replay.workflow_run_id === ${REPLAY_RUN_ID} && archiveCustody.acquisitions.bounded_transport_replay.artifact_id === ${REPLAY_ARTIFACT_ID} && archiveCustody.acquisitions.bounded_transport_replay.artifact_digest === '${REPLAY_ARTIFACT_DIGEST}', 'archive replay acquisition custody drift');
    check(archiveCustody.counts.source_route_rows === ${BASELINE_ROUTE_COUNT} && archiveCustody.counts.total_attempt_rows === ${TOTAL_ATTEMPT_ROWS} && archiveCustody.counts.routes_with_snapshot_locators === ${routesWithLocators} && archiveCustody.counts.bounded_zero_snapshot_locator_routes === ${boundedZeroRoutes} && archiveCustody.counts.residual_provider_error_routes === ${residualProviderErrors} && archiveCustody.counts.archive_snapshot_locator_rows === ${locatorRows.length} && archiveCustody.counts.unique_archive_digests === ${uniqueArchiveDigests}, 'archive custody denominator drift');
    check(archiveCustody.interpretation.archive_locator_metadata_is_not_archived_content_custody === true && archiveCustody.interpretation.bounded_zero_rows_is_not_absence === true && archiveCustody.interpretation.provider_error_after_bounded_replay_is_not_absence === true && archiveCustody.interpretation.replay_locator_must_not_be_dereferenced_without_separate_authorization === true, 'archive interpretation drift');
    check(archiveCustody.terminal_frontier.declared_two_attempt_archive_metadata_protocol_terminal === true && archiveCustody.terminal_frontier.baseline_transport_errors_replayed_exactly_once === true && archiveCustody.terminal_frontier.archived_content_custody_open === true && archiveCustody.terminal_frontier.registry_grade_legal_identity_open === true && archiveCustody.terminal_frontier.outside_human_dependency === false, 'archive terminal-frontier drift');
    check(archiveCustody.privacy.raw_source_retained === false && archiveCustody.privacy.archived_page_bodies_retained === false && archiveCustody.privacy.archived_visible_text_retained === false && archiveCustody.privacy.street_address_rows_retained === 0 && archiveCustody.privacy.contact_detail_rows_retained === 0 && archiveCustody.privacy.private_support_rows === 0, 'archive custody privacy drift');
    check(archiveCustody.public_schoolhouse_identity_admitted === false && archiveCustody.admitted_legal_name === null && archiveCustody.admitted_ein === null && archiveCustody.negative_existence_claim_created === false && archiveCustody.outside_human_dependency === false && archiveCustody.publication_effect === 'none' && archiveCustody.adoption_effect === 'none' && archiveCustody.graph_effect === 'none' && archiveCustody.promotes_to === 'candidate_only', 'archive custody authority drift');

    const archiveProjection = schoolhouse.state_registry_identity_census?.first_party_archive_locator_custody;
    check(archiveProjection?.source_routes === ${BASELINE_ROUTE_COUNT} && archiveProjection?.total_attempt_rows === ${TOTAL_ATTEMPT_ROWS} && archiveProjection?.routes_with_snapshot_locators === ${routesWithLocators} && archiveProjection?.bounded_zero_snapshot_locator_routes === ${boundedZeroRoutes} && archiveProjection?.residual_provider_error_routes === ${residualProviderErrors} && archiveProjection?.archive_snapshot_locator_rows === ${locatorRows.length} && archiveProjection?.unique_archive_digests === ${uniqueArchiveDigests}, 'School.House archive projection drift');
    check(archiveProjection?.archived_content_state === 'not_acquired' && archiveProjection?.identity_state === 'unresolved_after_archive_locator_metadata_custody_no_registry_identity_admitted' && archiveProjection?.admitted_legal_name === null && archiveProjection?.admitted_ein === null && archiveProjection?.public_schoolhouse_identity_admitted === false, 'School.House archive identity authority drift');
    const archiveFrontier = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_first_party_archive_locator_custody;
    check(archiveFrontier?.source_routes === ${BASELINE_ROUTE_COUNT} && archiveFrontier?.total_attempt_rows === ${TOTAL_ATTEMPT_ROWS} && archiveFrontier?.routes_with_snapshot_locators === ${routesWithLocators} && archiveFrontier?.bounded_zero_snapshot_locator_routes === ${boundedZeroRoutes} && archiveFrontier?.residual_provider_error_routes === ${residualProviderErrors} && archiveFrontier?.archive_snapshot_locator_rows === ${locatorRows.length} && archiveFrontier?.admitted_identities === 0, 'School.House archive frontier projection drift');
    check(coverage.denominators.some(row => row.surface === 'School.House first-party public Archive locator metadata custody' && row.enumerated_total === ${BASELINE_ROUTE_COUNT} && row.total_attempt_rows === ${TOTAL_ATTEMPT_ROWS} && row.routes_with_snapshot_locators === ${routesWithLocators} && row.bounded_zero_snapshot_locator_routes === ${boundedZeroRoutes} && row.residual_provider_error_routes === ${residualProviderErrors} && row.archive_snapshot_locator_rows === ${locatorRows.length} && row.search_submissions === 0), 'archive coverage denominator missing');
  }
`;
  const returnMarker = '\n  return errors;\n}';
  const returnIndex = validator.lastIndexOf(returnMarker);
  assert(returnIndex >= 0, 'validator return marker missing');
  validator = validator.slice(0, returnIndex) + validatorBlock + validator.slice(returnIndex);
  fs.writeFileSync(validatorPath, validator);

  console.log(JSON.stringify({
    schema_version: 'schoolhouse-first-party-archive-locator-build@1',
    source_inventory_rows: EXPECTED_SOURCE_INVENTORY_ROWS,
    coverage_denominator_rows: EXPECTED_COVERAGE_ROWS,
    source_routes: BASELINE_ROUTE_COUNT,
    baseline_attempt_rows: BASELINE_ROUTE_COUNT,
    replay_attempt_rows: REPLAY_ROUTE_COUNT,
    total_attempt_rows: TOTAL_ATTEMPT_ROWS,
    routes_with_snapshot_locators: routesWithLocators,
    bounded_zero_snapshot_locator_routes: boundedZeroRoutes,
    residual_provider_error_routes: residualProviderErrors,
    archive_snapshot_locator_rows: locatorRows.length,
    unique_archive_digests: uniqueArchiveDigests,
    result_caps_exhausted: resultCapsExhausted,
    archived_bodies_fetched: 0,
    replay_locators_dereferenced: 0,
    search_submissions: 0,
    source_rows_acquired: 0,
    admitted_identities: 0,
    outside_human_dependency: false,
    graph_effect: 'none',
  }, null, 2));
}

const baselineDir = process.argv[2];
const replayDir = process.argv[3];
assert(baselineDir && replayDir, 'usage: node build-schoolhouse-first-party-archive-locator-custody.mjs <baseline-artifact-dir> <replay-artifact-dir>');
build(path.resolve(baselineDir), path.resolve(replayDir));
