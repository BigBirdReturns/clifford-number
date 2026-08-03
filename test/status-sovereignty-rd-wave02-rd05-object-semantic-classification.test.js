import fs from 'node:fs';
import { validateSemanticClassification } from '../tools/acquisition/status-sovereignty-rd-wave02-rd05/validate-object-semantic-classification.mjs';

const outputPath = process.env.RD05_SEMANTIC_OUTPUT || 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition/object-semantic-classification.json';
const baseline = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
const clone = () => structuredClone(baseline);

const mutations = [
  (v) => { v.schema_version = 'wrong'; },
  (v) => { v.status = 'closed'; },
  (v) => { v.source_product.research_head = '0'.repeat(40); },
  (v) => { v.classification_contract.semantic_classification_does_not_expand_denominator = false; },
  (v) => { v.objects.pop(); },
  (v) => { v.objects[1].object_id = v.objects[0].object_id; },
  (v) => { v.objects[0].frozen_url = v.objects[1].frozen_url; },
  (v) => { v.objects[0].evidence.exact_body_sha256 = '0'.repeat(64); },
  (v) => { v.objects[0].record_class = 'completed_recommendation'; },
  (v) => { delete v.objects[0].fields.exact_source_locator_and_byte_custody; },
  (v) => { v.objects[0].fields.recommendation_state.value.completed_recommendation_observed = true; },
  (v) => { v.objects[0].fields.recommendation_state.value.status = 'completed_recommendation'; },
  (v) => { v.objects[3].fields.recommendation_state.value.completed_recommendation_observed = true; },
  (v) => { v.objects[28].fields.recommendation_state.terminal = true; },
  (v) => { v.objects[22].fields.agency_response_state.terminal = true; },
  (v) => { v.objects[51].source_scope = 'aces_target'; },
  (v) => { v.objects[44].fields.duplicate_supersession_or_archive_relationship.value.primary_object_id = 'RD05-OBJ-045'; },
  (v) => { v.objects.splice(44, 1); },
  (v) => { v.counts.open_recommendation_disposition_chains = 4; },
  (v) => { v.counts.completed_recommendation_objects = 1; },
  (v) => { v.counts.agency_response_objects = 1; },
  (v) => { v.counts.adopted_or_rejected_objects = 1; },
  (v) => { v.counts.implementation_or_outcome_objects = 1; },
  (v) => { v.counts.new_official_links_not_admitted = 494; },
  (v) => { v.successor_work_queues.nonadmitted_link_frontier.extraction_is_denominator_admission = true; },
  (v) => { v.successor_work_queues.object_actions[0].blocking = true; },
  (v) => { v.successor_work_queues.object_actions.pop(); },
  (v) => { v.successor_work_queues.object_actions.push({ object_id: 'RD05-OBJ-058', action_type: 'contact_human', cluster_id: 'x', blocking: true }); },
  (v) => { v.current_result.class_closed = true; },
  (v) => { v.current_result.recommendation_disposition_protocol_complete = true; },
  (v) => { v.current_result.complete_official_object_universe_frozen = true; },
  (v) => { v.current_result.project_blocking = true; },
  (v) => { v.authority.external_contacts = 1; },
  (v) => { v.authority.external_reviews = 1; },
  (v) => { v.authority.outside_human_dependency = true; },
  (v) => { v.authority.publication_effect = 'created'; },
  (v) => { v.authority.adoption_effect = 'created'; },
  (v) => { v.authority.graph_effect = 'created'; },
  (v) => { v.objects[0].fields.exact_source_locator_and_byte_custody.value.body_sha256 = '0'.repeat(64); },
  (v) => { v.objects[50].fields.exact_source_locator_and_byte_custody.value.final_url = v.objects[50].frozen_url; },
  (v) => { v.objects[0].fields.terminal_record_state.value.semantic_classification_complete = false; },
  (v) => { v.counts.record_class_counts.committee_member_profile = 16; }
];

validateSemanticClassification(baseline);
for (const [index, mutate] of mutations.entries()) {
  const candidate = clone();
  mutate(candidate);
  let rejected = false;
  try {
    validateSemanticClassification(candidate);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error(`mutation ${index + 1} was not rejected`);
}
console.log(`rd05-object-semantic-classification.test: ${mutations.length} adversarial mutations PASS`);
