import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const CAPTURE_ROOT = process.env.RD05_CAPTURE_ROOT || 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition/source-custody/exact-object-capture-v1';
const OUTPUT_PATH = process.env.RD05_CAPTURE_INDEX || 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition/exact-object-capture-index.json';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

export function buildExactObjectCaptureIndex(captureRoot = CAPTURE_ROOT) {
  const input = readJson(path.join(captureRoot, 'input.json'));
  const manifest = readJson(path.join(captureRoot, 'manifest.json'));
  const links = readJson(path.join(captureRoot, 'new-official-links.json'));

  const objects = input.objects.map((sourceObject) => {
    const receiptRelative = `objects/${sourceObject.object_id}/receipt.json`;
    const receiptDocument = readJson(path.join(captureRoot, receiptRelative));
    const receipt = receiptDocument.receipt;
    return {
      object_id: sourceObject.object_id,
      source_scope: sourceObject.source_scope,
      frozen_url: sourceObject.url,
      seed_source_ids: sourceObject.seed_source_ids,
      discovered_from_source_ids: sourceObject.discovered_from_source_ids,
      receipt_path: `${captureRoot}/${receiptRelative}`,
      custody_mode: receipt.custody_mode,
      attempts: receipt.attempts.length,
      terminal_state: receipt.terminal_state,
      resolved: receipt.resolved,
      final_url: receipt.final_url,
      content_type: receipt.content_type,
      body_path: `${captureRoot}/${receipt.body_path}`,
      body_bytes: receipt.body_bytes,
      body_sha256: receipt.body_sha256,
      headers_path: `${captureRoot}/${receipt.headers_path}`,
      headers_bytes: receipt.headers_bytes,
      headers_sha256: receipt.headers_sha256,
      extracted_official_links: receiptDocument.extracted_official_links,
      exact_object_capture_complete: receipt.resolved === true,
      semantic_protocol_state: 'pending_fixed_recommendation_to_disposition_protocol',
      recommendation_disposition_authority_created: false,
      terminal_record_state: 'still_open'
    };
  });

  const counts = {
    object_denominator: objects.length,
    aces_target_objects: objects.filter((o) => o.source_scope === 'aces_target').length,
    matched_nsb_controls: objects.filter((o) => o.source_scope === 'matched_nsb_control').length,
    exact_parent_bodies_reused: objects.filter((o) => o.custody_mode === 'reused_parent_exact_body').length,
    bounded_requested_objects: objects.filter((o) => o.custody_mode === 'bounded_exact_request').length,
    resolved_objects: objects.filter((o) => o.resolved).length,
    http_success_objects: objects.filter((o) => o.terminal_state === 'http_success').length,
    reused_terminal_objects: objects.filter((o) => o.terminal_state === 'exact_parent_body_reused').length,
    total_request_attempts: objects.reduce((sum, o) => sum + o.attempts, 0),
    new_official_links_not_admitted: links.new_official_links.length,
    new_relevance_candidates_not_admitted: links.new_relevance_candidates.length,
    completed_recommendations: 0,
    agency_responses: 0,
    adopted_outputs: 0,
    rejected_outputs: 0,
    implementation_or_outcomes: 0,
    closed_objects: 0
  };

  return {
    schema_version: 'ssc-rd05-wave02-exact-object-capture-index@1',
    wave_id: 'SSC-RD-W02',
    class_id: 'RD-05-C03',
    issue: 790,
    as_of: '2026-08-03',
    status: 'exact_object_capture_complete_semantic_protocol_open',
    source_artifact: {
      workflow_run: 30774380817,
      artifact_id: 8841523906,
      artifact_name: 'ssc-rd05-exact-object-capture-v1',
      artifact_zip_sha256: 'ec92f2ac48ec01588169a9aa96d5a02f1de41ba7474ce8aa8656cd390868d7ed',
      capture_manifest_schema: manifest.schema_version,
      capture_manifest_entries: manifest.entries.length,
      capture_manifest_combined_sha256: manifest.combined_sha256,
      capture_root: captureRoot
    },
    denominator_contract: {
      candidate_universe_schema: input.schema_version,
      candidate_membership_frozen_before_exact_capture: true,
      candidate_membership_frozen_before_semantic_disposition: true,
      silent_object_removal_allowed: false,
      newly_extracted_links_admitted: false,
      complete_official_object_universe_claimed: false
    },
    counts,
    objects,
    new_link_frontier: {
      schema_version: links.schema_version,
      extraction_is_denominator_admission: links.extraction_is_denominator_admission,
      new_official_links: links.new_official_links.length,
      new_relevance_candidates: links.new_relevance_candidates.length,
      source_path: `${captureRoot}/new-official-links.json`,
      disposition: 'retained_as_nonadmitted_successor_frontier'
    },
    next_protocol: {
      required_fields: input.required_fields,
      object_rows_requiring_semantic_protocol: objects.length,
      fixed_protocol_required: true,
      class_closed: false,
      next_action: 'classify_each_frozen_object_and_execute_recommendation_response_disposition_protocol'
    },
    authority: {
      exact_byte_custody_complete: true,
      recommendation_disposition_protocol_complete: false,
      complete_official_object_universe_frozen: false,
      class_closed: false,
      external_contacts: 0,
      external_reviews: 0,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    }
  };
}

const result = buildExactObjectCaptureIndex();
fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
console.log(`build-rd05-exact-object-capture-index: ${result.counts.resolved_objects}/${result.counts.object_denominator} exact objects resolved; semantic protocol open`);
