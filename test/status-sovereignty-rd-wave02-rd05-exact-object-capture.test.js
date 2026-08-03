import fs from 'node:fs';
import { validateExactObjectCaptureIndex } from '../tools/acquisition/status-sovereignty-rd-wave02-rd05/validate-exact-object-capture.mjs';

const captureRoot = process.env.RD05_CAPTURE_ROOT || 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition/source-custody/exact-object-capture-v1';
const outputPath = process.env.RD05_CAPTURE_INDEX || 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition/exact-object-capture-index.json';
const baseline = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
const clone = () => structuredClone(baseline);
const mutations = [
  (v) => { v.schema_version = 'wrong'; },
  (v) => { v.status = 'closed'; },
  (v) => { v.source_artifact.workflow_run += 1; },
  (v) => { v.source_artifact.artifact_id += 1; },
  (v) => { v.source_artifact.artifact_zip_sha256 = '0'.repeat(64); },
  (v) => { v.source_artifact.capture_manifest_entries -= 1; },
  (v) => { v.source_artifact.capture_manifest_combined_sha256 = '0'.repeat(64); },
  (v) => { v.counts.object_denominator -= 1; },
  (v) => { v.counts.aces_target_objects -= 1; },
  (v) => { v.counts.matched_nsb_controls += 1; },
  (v) => { v.counts.exact_parent_bodies_reused -= 1; },
  (v) => { v.counts.bounded_requested_objects -= 1; },
  (v) => { v.counts.resolved_objects -= 1; },
  (v) => { v.counts.http_success_objects -= 1; },
  (v) => { v.counts.total_request_attempts += 1; },
  (v) => { v.counts.new_official_links_not_admitted -= 1; },
  (v) => { v.counts.new_relevance_candidates_not_admitted -= 1; },
  (v) => { v.counts.completed_recommendations = 1; },
  (v) => { v.counts.adopted_outputs = 1; },
  (v) => { v.counts.closed_objects = 1; },
  (v) => { v.objects.pop(); },
  (v) => { v.objects[1].object_id = v.objects[0].object_id; },
  (v) => { v.objects[0].source_scope = 'matched_nsb_control'; },
  (v) => { v.objects[0].frozen_url = v.objects[1].frozen_url; },
  (v) => { v.objects[0].resolved = false; },
  (v) => { v.objects[0].body_sha256 = '0'.repeat(64); },
  (v) => { v.objects[0].semantic_protocol_state = 'complete'; },
  (v) => { v.objects[0].recommendation_disposition_authority_created = true; },
  (v) => { v.denominator_contract.newly_extracted_links_admitted = true; },
  (v) => { v.authority.external_contacts = 1; },
  (v) => { v.authority.outside_human_dependency = true; },
  (v) => { v.authority.graph_effect = 'created'; }
];

validateExactObjectCaptureIndex(baseline, captureRoot);
for (const [index, mutate] of mutations.entries()) {
  const candidate = clone();
  mutate(candidate);
  let rejected = false;
  try { validateExactObjectCaptureIndex(candidate, captureRoot); }
  catch { rejected = true; }
  if (!rejected) throw new Error(`mutation ${index + 1} was not rejected`);
}
console.log(`rd05-exact-object-capture.test: ${mutations.length} adversarial mutations PASS`);
