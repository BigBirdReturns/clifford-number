import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const CAPTURE_ROOT = process.env.RD05_CAPTURE_ROOT || 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition/source-custody/exact-object-capture-v1';
const OUTPUT_PATH = process.env.RD05_CAPTURE_INDEX || 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition/exact-object-capture-index.json';
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function listFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else out.push(path.relative(root, full).replaceAll('\\', '/'));
    }
  };
  walk(root);
  return out;
}

export function validateExactObjectCaptureIndex(index, captureRoot = CAPTURE_ROOT) {
  assert(index.schema_version === 'ssc-rd05-wave02-exact-object-capture-index@1', 'schema_version');
  assert(index.wave_id === 'SSC-RD-W02' && index.class_id === 'RD-05-C03' && index.issue === 790, 'identity');
  assert(index.status === 'exact_object_capture_complete_semantic_protocol_open', 'status');

  const input = readJson(path.join(captureRoot, 'input.json'));
  const manifest = readJson(path.join(captureRoot, 'manifest.json'));
  const links = readJson(path.join(captureRoot, 'new-official-links.json'));
  assert(input.schema_version === 'ssc-rd-wave02-rd05-official-object-candidate-universe@1', 'input schema');
  assert(input.objects.length === 58, 'input denominator');
  assert(manifest.schema_version === 'ssc-rd05-exact-object-capture-manifest@1', 'manifest schema');
  assert(manifest.entries.length === 322, 'manifest entry denominator');
  assert(manifest.combined_sha256 === '5b0900d85b55fb449b90defa1ea26435b0737d300f1e05cce9cc9c4546392f53', 'manifest combined digest');

  const actualFiles = listFiles(captureRoot).filter((p) => p !== 'manifest.json');
  assert(actualFiles.length === manifest.entries.length, 'capture file denominator');
  assert(JSON.stringify(actualFiles) === JSON.stringify(manifest.entries.map((e) => e.path).sort()), 'manifest path set');
  for (const entry of manifest.entries) {
    const bytes = fs.readFileSync(path.join(captureRoot, entry.path));
    assert(bytes.length === entry.bytes, `manifest bytes ${entry.path}`);
    assert(sha256(bytes) === entry.sha256, `manifest hash ${entry.path}`);
  }

  assert(index.source_artifact.workflow_run === 30774380817, 'artifact run');
  assert(index.source_artifact.artifact_id === 8841523906, 'artifact id');
  assert(index.source_artifact.artifact_name === 'ssc-rd05-exact-object-capture-v1', 'artifact name');
  assert(index.source_artifact.artifact_zip_sha256 === 'ec92f2ac48ec01588169a9aa96d5a02f1de41ba7474ce8aa8656cd390868d7ed', 'artifact digest');
  assert(index.source_artifact.capture_manifest_entries === 322, 'index manifest entries');
  assert(index.source_artifact.capture_manifest_combined_sha256 === manifest.combined_sha256, 'index manifest digest');

  const c = index.counts;
  assert(c.object_denominator === 58, 'count objects');
  assert(c.aces_target_objects === 51, 'count targets');
  assert(c.matched_nsb_controls === 7, 'count controls');
  assert(c.exact_parent_bodies_reused === 10, 'count reused');
  assert(c.bounded_requested_objects === 48, 'count requested');
  assert(c.resolved_objects === 58, 'count resolved');
  assert(c.http_success_objects === 48, 'count http success');
  assert(c.reused_terminal_objects === 10, 'count reused terminal');
  assert(c.total_request_attempts === 48, 'count attempts');
  assert(c.new_official_links_not_admitted === 495, 'count new links');
  assert(c.new_relevance_candidates_not_admitted === 76, 'count relevance links');
  assert(c.completed_recommendations === 0 && c.agency_responses === 0, 'recommendation inflation');
  assert(c.adopted_outputs === 0 && c.rejected_outputs === 0, 'disposition inflation');
  assert(c.implementation_or_outcomes === 0 && c.closed_objects === 0, 'closure inflation');

  assert(Array.isArray(index.objects) && index.objects.length === 58, 'index object denominator');
  const expectedIds = Array.from({ length: 58 }, (_, i) => `RD05-OBJ-${String(i + 1).padStart(3, '0')}`);
  assert(JSON.stringify(index.objects.map((o) => o.object_id)) === JSON.stringify(expectedIds), 'stable object ids');
  assert(new Set(index.objects.map((o) => o.frozen_url)).size === 58, 'unique frozen urls');

  const inputById = new Map(input.objects.map((o) => [o.object_id, o]));
  for (const object of index.objects) {
    const source = inputById.get(object.object_id);
    assert(source, `missing input ${object.object_id}`);
    assert(object.source_scope === source.source_scope, `scope ${object.object_id}`);
    assert(object.frozen_url === source.url, `url ${object.object_id}`);
    assert(object.resolved === true && object.exact_object_capture_complete === true, `resolved ${object.object_id}`);
    assert(object.semantic_protocol_state === 'pending_fixed_recommendation_to_disposition_protocol', `protocol state ${object.object_id}`);
    assert(object.recommendation_disposition_authority_created === false, `authority ${object.object_id}`);
    assert(object.terminal_record_state === 'still_open', `record state ${object.object_id}`);
    assert(['bounded_exact_request', 'reused_parent_exact_body'].includes(object.custody_mode), `custody mode ${object.object_id}`);
    assert(['http_success', 'exact_parent_body_reused'].includes(object.terminal_state), `terminal ${object.object_id}`);

    const receiptRelative = `objects/${object.object_id}/receipt.json`;
    const receiptDoc = readJson(path.join(captureRoot, receiptRelative));
    const receipt = receiptDoc.receipt;
    assert(object.attempts === receipt.attempts.length, `attempts ${object.object_id}`);
    assert(object.final_url === receipt.final_url, `final url ${object.object_id}`);
    assert(object.content_type === receipt.content_type, `content type ${object.object_id}`);
    assert(object.body_bytes === receipt.body_bytes && object.body_sha256 === receipt.body_sha256, `body receipt ${object.object_id}`);
    assert(object.headers_bytes === receipt.headers_bytes && object.headers_sha256 === receipt.headers_sha256, `headers receipt ${object.object_id}`);
    assert(object.extracted_official_links === receiptDoc.extracted_official_links, `links ${object.object_id}`);

    const bodyRelative = receipt.body_path;
    const headersRelative = receipt.headers_path;
    assert(object.body_path === `${captureRoot}/${bodyRelative}`, `body path ${object.object_id}`);
    assert(object.headers_path === `${captureRoot}/${headersRelative}`, `headers path ${object.object_id}`);
    const body = fs.readFileSync(path.join(captureRoot, bodyRelative));
    const headers = fs.readFileSync(path.join(captureRoot, headersRelative));
    assert(body.length === object.body_bytes && sha256(body) === object.body_sha256, `body bytes ${object.object_id}`);
    assert(headers.length === object.headers_bytes && sha256(headers) === object.headers_sha256, `header bytes ${object.object_id}`);
  }

  assert(index.denominator_contract.candidate_membership_frozen_before_exact_capture === true, 'freeze before capture');
  assert(index.denominator_contract.candidate_membership_frozen_before_semantic_disposition === true, 'freeze before disposition');
  assert(index.denominator_contract.silent_object_removal_allowed === false, 'silent removal');
  assert(index.denominator_contract.newly_extracted_links_admitted === false, 'link admission');
  assert(index.denominator_contract.complete_official_object_universe_claimed === false, 'universe inflation');
  assert(links.extraction_is_denominator_admission === false, 'source link admission');
  assert(links.new_official_links.length === 495 && links.new_relevance_candidates.length === 76, 'source frontier counts');
  assert(index.new_link_frontier.extraction_is_denominator_admission === false, 'index frontier admission');
  assert(index.new_link_frontier.new_official_links === 495 && index.new_link_frontier.new_relevance_candidates === 76, 'index frontier counts');
  assert(index.next_protocol.object_rows_requiring_semantic_protocol === 58, 'protocol denominator');
  assert(index.next_protocol.fixed_protocol_required === true && index.next_protocol.class_closed === false, 'protocol closure');

  const a = index.authority;
  assert(a.exact_byte_custody_complete === true, 'byte custody');
  assert(a.recommendation_disposition_protocol_complete === false, 'protocol inflation');
  assert(a.complete_official_object_universe_frozen === false, 'universe closure inflation');
  assert(a.class_closed === false, 'class closure inflation');
  assert(a.external_contacts === 0 && a.external_reviews === 0 && a.outside_human_dependency === false, 'outside-human boundary');
  assert(a.publication_effect === 'none' && a.adoption_effect === 'none' && a.graph_effect === 'none', 'effect boundary');
  return true;
}

const self = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (self) {
  const index = readJson(OUTPUT_PATH);
  validateExactObjectCaptureIndex(index);
  console.log('validate-rd05-exact-object-capture: PASS — 58 exact objects, 322 custody entries, semantic protocol open');
}
