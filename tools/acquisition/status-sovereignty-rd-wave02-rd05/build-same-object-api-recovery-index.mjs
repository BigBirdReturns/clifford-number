import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CONSTANTS = Object.freeze({
  schemaVersion: 'ssc-rd05-same-object-api-recovery-index@1',
  waveId: 'SSC-RD-W02-RD05-C04',
  classId: 'RD-05-C03',
  issue: 790,
  objectId: 'RD05-OBJ-051',
  documentNumber: '2024-08630',
  frozenObjectDenominator: 58,
  frozenUrl: 'https://www.federalregister.gov/documents/2024/04/29/2024-08630/solicitation-of-membership-nominations-for-the-advisory-committee-on-excellence-in-space-aces/',
  apiUrl: 'https://www.federalregister.gov/api/v1/documents/2024-08630.json',
  parentResearchHead: '205537aa7d550741b2e95df0a43484f0879559bc',
  sourceRunId: 30793626437,
  sourceArtifactId: 8848010209,
  sourceArtifactSha256: '8673716f594e02848f8b943085e2215073b8a32ccb80276b9345e6883671e8a0',
  priorFinalUrl: 'https://unblock.federalregister.gov/',
  priorBodySha256: '69fa13193e7b1b31f4a00667a85deadb464dd279c6d9323ca3efe5bcd6cad123',
  captureRoot: 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition/source-custody/same-object-api-recovery-v1/RD05-OBJ-051',
  outputPath: 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition/same-object-api-recovery-index.json'
});

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizeUrl(url) {
  return url.replace(/\/$/, '');
}

function walkFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(full) : [full];
  });
}

function verifyManifest(captureRoot, manifest) {
  invariant(manifest.schema_version === 'ssc-rd05-same-object-api-capture-manifest@1', 'manifest schema');
  invariant(manifest.object_id === CONSTANTS.objectId, 'manifest object id');
  invariant(manifest.document_number === CONSTANTS.documentNumber, 'manifest document number');
  invariant(Array.isArray(manifest.entries) && manifest.entries.length === 13, 'manifest entry denominator');

  const expectedPaths = new Set();
  for (const entry of manifest.entries) {
    invariant(entry && typeof entry.path === 'string' && entry.path.length > 0, 'manifest entry path');
    invariant(!entry.path.startsWith('/') && !entry.path.split('/').includes('..'), `unsafe manifest path: ${entry.path}`);
    invariant(!expectedPaths.has(entry.path), `duplicate manifest path: ${entry.path}`);
    expectedPaths.add(entry.path);
    const file = path.join(captureRoot, ...entry.path.split('/'));
    invariant(fs.existsSync(file) && fs.statSync(file).isFile(), `missing manifest file: ${entry.path}`);
    const body = fs.readFileSync(file);
    invariant(body.length === entry.bytes, `manifest byte mismatch: ${entry.path}`);
    invariant(sha256(body) === entry.sha256, `manifest sha mismatch: ${entry.path}`);
  }

  const actualPaths = walkFiles(captureRoot)
    .map((file) => path.relative(captureRoot, file).split(path.sep).join('/'))
    .filter((entry) => entry !== 'manifest.json')
    .sort();
  const declaredPaths = [...expectedPaths].sort();
  invariant(JSON.stringify(actualPaths) === JSON.stringify(declaredPaths), 'capture file denominator differs from manifest');

  const digestInput = manifest.entries
    .map((entry) => `${entry.path}\t${entry.bytes}\t${entry.sha256}`)
    .join('\n') + '\n';
  return {
    manifestSha256: sha256(fs.readFileSync(path.join(captureRoot, 'manifest.json'))),
    manifestBytes: fs.statSync(path.join(captureRoot, 'manifest.json')).size,
    entriesDigestSha256: sha256(Buffer.from(digestInput)),
    entryCount: manifest.entries.length,
    declaredBytes: manifest.entries.reduce((sum, entry) => sum + entry.bytes, 0)
  };
}

export function buildRecoveryIndex({
  captureRoot = CONSTANTS.captureRoot
} = {}) {
  const manifestPath = path.join(captureRoot, 'manifest.json');
  invariant(fs.existsSync(manifestPath), 'capture manifest missing');
  const manifest = readJson(manifestPath);
  const manifestAudit = verifyManifest(captureRoot, manifest);

  const requestContract = readJson(path.join(captureRoot, 'request-contract.json'));
  const summary = readJson(path.join(captureRoot, 'summary.json'));
  const selectedText = fs.readFileSync(path.join(captureRoot, 'selected-attempt.txt'), 'utf8').trim();
  invariant(selectedText === '1', 'selected attempt must be one');
  const attemptRoot = path.join(captureRoot, 'attempts', 'attempt-1');
  const receipt = readJson(path.join(attemptRoot, 'receipt.json'));
  const documentRecord = readJson(path.join(attemptRoot, 'document-record.json'));
  const bodyBuffer = fs.readFileSync(path.join(attemptRoot, 'body.bin'));
  const body = JSON.parse(bodyBuffer.toString('utf8'));
  const headersBuffer = fs.readFileSync(path.join(attemptRoot, 'headers.txt'));

  invariant(requestContract.schema_version === 'ssc-rd05-same-object-api-request-contract@1', 'request contract schema');
  invariant(requestContract.object_id === CONSTANTS.objectId, 'request contract object');
  invariant(requestContract.document_number === CONSTANTS.documentNumber, 'request contract document');
  invariant(requestContract.research_head === CONSTANTS.parentResearchHead, 'request contract research head');
  invariant(requestContract.frozen_url === CONSTANTS.frozenUrl, 'request contract frozen url');
  invariant(requestContract.single_authorized_target_url === CONSTANTS.apiUrl, 'request contract target url');
  invariant(JSON.stringify(requestContract.authorized_hosts) === JSON.stringify(['www.federalregister.gov']), 'request host boundary');
  invariant(requestContract.maximum_attempts === 2, 'request attempt ceiling');
  invariant(requestContract.crawl_authorized === false, 'crawl boundary');
  invariant(requestContract.linked_object_fetch_authorized === false, 'linked-fetch boundary');
  invariant(requestContract.new_link_admission_authorized === false, 'link-admission boundary');
  invariant(requestContract.prior_capture?.final_url === CONSTANTS.priorFinalUrl, 'prior final url');
  invariant(requestContract.prior_capture?.body_sha256 === CONSTANTS.priorBodySha256, 'prior body sha');
  invariant(requestContract.external_contacts === 0 && requestContract.external_reviews === 0, 'external participation boundary');
  invariant(requestContract.outside_human_dependency === false, 'outside-human boundary');
  invariant(requestContract.publication_effect === 'none' && requestContract.adoption_effect === 'none' && requestContract.graph_effect === 'none', 'request authority boundary');

  invariant(summary.schema_version === 'ssc-rd05-same-object-api-capture-summary@1', 'summary schema');
  invariant(summary.object_id === CONSTANTS.objectId && summary.document_number === CONSTANTS.documentNumber, 'summary identity');
  invariant(summary.research_head === CONSTANTS.parentResearchHead, 'summary research head');
  invariant(summary.frozen_url === CONSTANTS.frozenUrl && summary.target_url === CONSTANTS.apiUrl, 'summary urls');
  invariant(summary.maximum_attempts === 2 && summary.attempts_executed === 1 && summary.selected_attempt === 1, 'summary attempts');
  invariant(summary.same_object_target_delivered === true, 'same-object target not delivered');
  invariant(summary.terminal_transport_state === 'official_api_same_object_delivered', 'terminal transport state');
  invariant(summary.exact_body_sha256 === sha256(bodyBuffer) && summary.exact_body_bytes === bodyBuffer.length, 'summary body custody');
  invariant(summary.linked_urls_fetched === 0 && summary.links_admitted === 0, 'summary link boundary');
  invariant(summary.frozen_denominator_changed === false, 'denominator changed');
  for (const key of ['recommendation_status_changed', 'agency_response_status_changed', 'adoption_or_rejection_status_changed', 'implementation_or_outcome_status_changed']) {
    invariant(summary[key] === false, `summary authority changed: ${key}`);
  }
  invariant(summary.external_contacts === 0 && summary.external_reviews === 0 && summary.outside_human_dependency === false, 'summary human boundary');
  invariant(summary.publication_effect === 'none' && summary.adoption_effect === 'none' && summary.graph_effect === 'none', 'summary effect boundary');

  invariant(receipt.schema_version === 'ssc-rd05-same-object-api-attempt-receipt@1', 'receipt schema');
  invariant(receipt.object_id === CONSTANTS.objectId && receipt.document_number === CONSTANTS.documentNumber, 'receipt identity');
  invariant(receipt.request_url === CONSTANTS.apiUrl && receipt.final_url === CONSTANTS.apiUrl, 'receipt url');
  invariant(receipt.curl_exit === 0 && receipt.http_status === 200 && receipt.redirects === 0, 'receipt transport');
  invariant(receipt.content_type === 'application/json; charset=utf-8', 'receipt content type');
  invariant(receipt.reported_download_bytes === bodyBuffer.length && receipt.observed_body_bytes === bodyBuffer.length, 'receipt body bytes');
  invariant(receipt.observed_body_sha256 === sha256(bodyBuffer), 'receipt body sha');
  invariant(receipt.observed_headers_bytes === headersBuffer.length && receipt.observed_headers_sha256 === sha256(headersBuffer), 'receipt header custody');
  invariant(receipt.json_parse_success === true && receipt.json_parse_error === null, 'receipt parse state');
  invariant(receipt.returned_document_number === CONSTANTS.documentNumber && receipt.same_object_document_match === true && receipt.target_delivered === true, 'receipt same-object binding');
  invariant(receipt.linked_urls_fetched === 0 && receipt.links_admitted === 0 && receipt.recommendation_or_disposition_inferred === false, 'receipt semantic boundary');

  invariant(body.document_number === CONSTANTS.documentNumber, 'body document number');
  invariant(body.title === 'Solicitation of Membership Nominations for the Advisory Committee on Excellence in Space (ACES)', 'body title');
  invariant(body.type === 'Notice' && body.subtype === null, 'body record class');
  invariant(body.action === 'Solicitation of membership nominations.', 'body action');
  invariant(body.publication_date === '2024-04-29', 'body publication date');
  invariant(body.comments_close_on === '2024-05-29', 'body nomination deadline');
  invariant(body.citation === '89 FR 33332' && body.volume === 89 && body.start_page === 33332 && body.end_page === 33333, 'body citation and pages');
  invariant(normalizeUrl(body.html_url) === normalizeUrl(CONSTANTS.frozenUrl), 'frozen locator and returned html url differ');
  invariant(body.json_url === 'https://www.federalregister.gov/api/v1/documents/2024-08630?publication_date=2024-04-29', 'body json locator');
  invariant(Array.isArray(body.agencies) && body.agencies.length === 2, 'body agency denominator');
  invariant(body.agencies[0]?.id === 54 && body.agencies[0]?.name === 'Commerce Department', 'Commerce agency identity');
  invariant(body.agencies[1]?.id === 361 && body.agencies[1]?.name === 'National Oceanic and Atmospheric Administration', 'NOAA agency identity');
  invariant(typeof body.abstract === 'string' && body.abstract.includes('seeking up to 25 individuals') && body.abstract.includes('submit advice and recommendations'), 'body abstract anchors');
  invariant(typeof body.dates === 'string' && body.dates.includes('May 29, 2024'), 'body date anchor');

  invariant(documentRecord.schema_version === 'ssc-rd05-federal-register-document-record@1', 'document record schema');
  invariant(documentRecord.object_id === CONSTANTS.objectId && documentRecord.same_object_document_number === CONSTANTS.documentNumber, 'document record identity');
  invariant(documentRecord.title === body.title && documentRecord.type === body.type && documentRecord.publication_date === body.publication_date && documentRecord.citation === body.citation, 'document record projection');
  invariant(documentRecord.exact_api_body_sha256 === sha256(bodyBuffer) && documentRecord.exact_api_body_bytes === bodyBuffer.length, 'document record body custody');
  invariant(Array.isArray(documentRecord.linked_urls) && documentRecord.linked_urls.length === 7, 'linked-url denominator');
  invariant(documentRecord.linked_urls.every((entry) => entry.fetched === false && entry.admitted === false), 'linked-url state');
  invariant(documentRecord.linked_urls_fetched === 0 && documentRecord.links_admitted === 0, 'document record link boundary');
  invariant(documentRecord.semantic_authority === 'same_object_source_recovery_only', 'document record semantic authority');
  invariant(documentRecord.recommendation_status_changed === false && documentRecord.disposition_status_changed === false, 'document record disposition boundary');
  invariant(documentRecord.publication_effect === 'none' && documentRecord.adoption_effect === 'none' && documentRecord.graph_effect === 'none', 'document record effects');

  const manifestRel = `${CONSTANTS.captureRoot}/manifest.json`;
  const summaryRel = `${CONSTANTS.captureRoot}/summary.json`;
  const requestContractRel = `${CONSTANTS.captureRoot}/request-contract.json`;
  const selectedRel = `${CONSTANTS.captureRoot}/selected-attempt.txt`;
  const attemptRel = `${CONSTANTS.captureRoot}/attempts/attempt-1`;

  return {
    schema_version: CONSTANTS.schemaVersion,
    wave_id: CONSTANTS.waveId,
    class_id: CONSTANTS.classId,
    issue: CONSTANTS.issue,
    as_of: '2026-08-03',
    status: 'same_object_api_recovery_complete_semantic_reconciliation_pending',
    source_product: {
      parent_research_head: CONSTANTS.parentResearchHead,
      workflow_run_id: CONSTANTS.sourceRunId,
      artifact_id: CONSTANTS.sourceArtifactId,
      artifact_sha256: CONSTANTS.sourceArtifactSha256,
      capture_root: CONSTANTS.captureRoot
    },
    counts: {
      frozen_object_denominator: CONSTANTS.frozenObjectDenominator,
      frozen_object_denominator_changed: 0,
      same_object_recoveries: 1,
      retained_representations: 2,
      exact_custody_files: manifestAudit.entryCount + 1,
      capture_manifest_entries: manifestAudit.entryCount,
      attempts_executed: 1,
      linked_urls_discovered: documentRecord.linked_urls.length,
      linked_urls_fetched: 0,
      links_admitted: 0,
      completed_recommendation_objects_added: 0,
      agency_response_objects_added: 0,
      adopted_or_rejected_objects_added: 0,
      implementation_or_outcome_objects_added: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0
    },
    recovery: {
      object_id: CONSTANTS.objectId,
      document_number: CONSTANTS.documentNumber,
      original_representation: {
        frozen_url: CONSTANTS.frozenUrl,
        final_url: CONSTANTS.priorFinalUrl,
        record_class: 'federal_register_access_interstitial',
        body_sha256: CONSTANTS.priorBodySha256,
        semantic_target_delivered: false
      },
      official_api_representation: {
        request_url: CONSTANTS.apiUrl,
        final_url: CONSTANTS.apiUrl,
        manifest: {
          path: manifestRel,
          bytes: manifestAudit.manifestBytes,
          sha256: manifestAudit.manifestSha256,
          entry_count: manifestAudit.entryCount,
          declared_bytes: manifestAudit.declaredBytes,
          entries_digest_sha256: manifestAudit.entriesDigestSha256
        },
        request_contract: {
          path: requestContractRel,
          sha256: sha256(fs.readFileSync(path.join(captureRoot, 'request-contract.json')))
        },
        selected_attempt: {
          path: selectedRel,
          value: 1
        },
        summary: {
          path: summaryRel,
          sha256: sha256(fs.readFileSync(path.join(captureRoot, 'summary.json')))
        },
        body: {
          path: `${attemptRel}/body.bin`,
          bytes: bodyBuffer.length,
          sha256: sha256(bodyBuffer),
          content_type: receipt.content_type
        },
        headers: {
          path: `${attemptRel}/headers.txt`,
          bytes: headersBuffer.length,
          sha256: sha256(headersBuffer)
        },
        receipt: {
          path: `${attemptRel}/receipt.json`,
          sha256: sha256(fs.readFileSync(path.join(attemptRoot, 'receipt.json'))),
          http_status: receipt.http_status,
          redirects: receipt.redirects,
          started_at: receipt.started_at,
          finished_at: receipt.finished_at
        },
        document_record: {
          path: `${attemptRel}/document-record.json`,
          sha256: sha256(fs.readFileSync(path.join(attemptRoot, 'document-record.json')))
        }
      },
      same_object_binding: {
        document_number_locator_match: CONSTANTS.frozenUrl.includes(`/${CONSTANTS.documentNumber}/`),
        api_document_number_match: body.document_number === CONSTANTS.documentNumber,
        frozen_url_html_url_match: normalizeUrl(body.html_url) === normalizeUrl(CONSTANTS.frozenUrl),
        relationship: 'same_federal_register_notice_alternative_official_representation'
      },
      official_record: {
        title: body.title,
        record_type: body.type,
        action: body.action,
        abstract: body.abstract,
        publication_date: body.publication_date,
        nomination_deadline: body.comments_close_on,
        dates_text: body.dates,
        citation: body.citation,
        volume: body.volume,
        start_page: body.start_page,
        end_page: body.end_page,
        agencies: body.agencies.map((agency) => ({
          id: agency.id,
          name: agency.name,
          raw_name: agency.raw_name,
          parent_id: agency.parent_id,
          url: agency.url,
          json_url: agency.json_url
        }))
      },
      linked_urls: documentRecord.linked_urls
    },
    semantic_adjudication: {
      source_access_gap_closed: true,
      record_class: 'federal_register_membership_solicitation_notice',
      recommendation_status: 'committee_formation_and_membership_solicitation_not_completed_recommendation',
      completed_recommendation_observed: false,
      agency_response_observed: false,
      adoption_or_rejection_observed: false,
      implementation_or_outcome_observed: false,
      object_successor_action_discharged: 'retrieve_same_object_via_federal_register_api',
      object_open_chain_can_close: true,
      semantic_classification_update_required: true,
      note: 'The notice solicits committee membership and describes a future advisory mandate. It is not a completed committee recommendation, agency response, disposition, implementation, or outcome.'
    },
    boundaries: {
      official_api_delivery_is_new_denominator_member: false,
      alternative_representation_is_independent_recommendation: false,
      committee_mandate_to_submit_future_advice_is_completed_recommendation: false,
      membership_solicitation_is_agency_response_to_recommendation: false,
      nomination_deadline_is_recommendation_disposition: false,
      linked_url_discovery_is_link_fetch: false,
      linked_url_discovery_is_denominator_admission: false,
      source_access_gap_closure_is_class_closure: false,
      external_participation_required: false,
      publication_authorized: false,
      adoption_authorized: false,
      graph_effect: 'none'
    },
    authority: {
      custody: 'exact_same_object_official_api_representation_complete',
      semantic_scope: 'source_recovery_and_record_class_only',
      denominator_authority: 'unchanged_frozen_58_object_denominator',
      recommendation_authority: 'none_added',
      response_disposition_authority: 'none_added',
      implementation_outcome_authority: 'none_added',
      external_contacts: 0,
      external_reviews: 0,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    },
    current_result: 'RD05-OBJ-051 same-object official API recovery is complete; its prior source-access uncertainty is resolved as a membership-solicitation notice, while all recommendation and disposition counts remain zero.'
  };
}

export function writeRecoveryIndex({
  captureRoot = CONSTANTS.captureRoot,
  outputPath = CONSTANTS.outputPath
} = {}) {
  const product = buildRecoveryIndex({ captureRoot });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(product, null, 2)}\n`);
  return product;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const product = writeRecoveryIndex();
  console.log(`build-rd05-same-object-api-recovery-index: ${product.counts.same_object_recoveries} same-object recovery; ${product.counts.exact_custody_files} custody files; denominator unchanged`);
}
