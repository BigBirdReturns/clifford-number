#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  ROOT,
  RECEIPT_PATH,
  ADJUDICATION_INDEX_PATH,
  loadCandidateAdjudication,
  FOLLOWUP_PATH,
  SCHEMA_PATH,
  validateExecutionReceipt,
  validateCandidateAdjudication,
  validateFollowupProtocol,
  validateSchemaContract
} from '../tools/validate-status-sovereignty-rd-wave03-rd02-candidate-adjudication.mjs';

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const clone = (value) => structuredClone(value);
const receipt = read(RECEIPT_PATH);
const adjudication = loadCandidateAdjudication(ROOT);
const followup = read(FOLLOWUP_PATH);
const schema = read(SCHEMA_PATH);
assert.equal(validateExecutionReceipt(receipt), true);
assert.equal(validateCandidateAdjudication(adjudication), true);
assert.equal(validateFollowupProtocol(followup, adjudication), true);
assert.equal(validateSchemaContract(schema), true);

const adjudicationMutations = [
  ['schema version', (v) => { v.schema_version += '-drift'; }],
  ['wave', (v) => { v.wave_id = 'SSC-RD-W04'; }],
  ['lane', (v) => { v.lane_id = 'RD-03'; }],
  ['class', (v) => { v.class_id = 'RD-02-C04'; }],
  ['issue', (v) => { v.issue = 1014; }],
  ['authority', (v) => { v.authority = 'source_admission'; }],
  ['source run', (v) => { v.source_custody.workflow_run += 1; }],
  ['artifact ID', (v) => { v.source_custody.artifact_id += 1; }],
  ['receipt digest', (v) => { v.source_custody.execution_receipt_sha256 = '0'.repeat(64); }],
  ['artifact digest', (v) => { v.source_custody.artifact_zip_sha256 = '0'.repeat(64); }],
  ['candidate index digest', (v) => { v.source_custody.candidate_index_sha256 = '0'.repeat(64); }],
  ['candidate rows', (v) => { v.adjudication_contract.candidate_rows = 479; }],
  ['unique denominator', (v) => { v.adjudication_contract.unique_candidate_urls = 209; }],
  ['allow silent removal', (v) => { v.adjudication_contract.silent_candidate_removal_allowed = true; }],
  ['allow search admission', (v) => { v.adjudication_contract.candidate_admission_by_search_result_allowed = true; }],
  ['allow widening', (v) => { v.adjudication_contract.outcome_based_denominator_widening_allowed = true; }],
  ['selection rule', (v) => { v.adjudication_contract.followup_selection_rule = 'all_candidates'; }],
  ['remove candidate', (v) => { v.candidate_urls.pop(); }],
  ['duplicate candidate', (v) => { v.candidate_urls[1] = clone(v.candidate_urls[0]); }],
  ['candidate order', (v) => { [v.candidate_urls[0], v.candidate_urls[1]] = [v.candidate_urls[1], v.candidate_urls[0]]; }],
  ['candidate ordinal', (v) => { v.candidate_urls[0].candidate_ordinal = 2; }],
  ['candidate ID', (v) => { v.candidate_urls[0].candidate_id = '0'.repeat(64); }],
  ['candidate URL', (v) => { v.candidate_urls[0].url = 'https://example.com/'; }],
  ['candidate domain', (v) => { v.candidate_urls[0].domain = 'example.com'; }],
  ['candidate occurrence', (v) => { v.candidate_urls[0].occurrences = 0; }],
  ['withheld unit', (v) => { v.candidate_urls[0].unit_ordinals = [18]; }],
  ['unit reorder', (v) => { const row = v.candidate_urls.find((x) => x.unit_ordinals.length > 1); row.unit_ordinals.reverse(); }],
  ['invalid query class', (v) => { v.candidate_urls[0].query_classes = ['other']; }],
  ['query order', (v) => { const row = v.candidate_urls.find((x) => x.query_classes.length > 1); row.query_classes.reverse(); }],
  ['candidate classification', (v) => { v.candidate_urls[0].classification = 'exact_manager_site_candidate'; }],
  ['candidate route assigned', (v) => { v.candidate_urls[0].followup_route_id = 'RD02-W03-CF999'; }],
  ['candidate admitted', (v) => { v.candidate_urls[0].admitted_source = true; }],
  ['candidate event', (v) => { v.candidate_urls[0].lifecycle_event_observed = true; }],
  ['candidate field effect', (v) => { v.candidate_urls[0].field_effect = 'observed'; }],
  ['candidate class effect', (v) => { v.candidate_urls[0].class_effect = 'closed'; }],
  ['manager count', (v) => { v.counts.exact_manager_site_candidates = 2; }],
  ['parent count', (v) => { v.counts.name_aligned_parent_organization_candidates = 8; }],
  ['official count', (v) => { v.counts.official_domain_lexical_collisions = 3; }],
  ['nonresponsive count', (v) => { v.counts.nonresponsive_lexical_collisions_or_generic_results = 197; }],
  ['followup count', (v) => { v.counts.fixed_followup_routes = 9; }],
  ['admission count', (v) => { v.counts.candidate_urls_admitted = 1; }],
  ['event count', (v) => { v.counts.lifecycle_events_observed = 1; }],
  ['withheld count', (v) => { v.counts.withheld_row_candidates = 1; }],
  ['external contact', (v) => { v.counts.external_contacts = 1; }],
  ['external review', (v) => { v.counts.external_reviews = 1; }],
  ['adjudication incomplete', (v) => { v.current_result.candidate_adjudication_complete = false; }],
  ['followup unfrozen', (v) => { v.current_result.followup_protocol_frozen = false; }],
  ['future execution', (v) => { v.current_result.followup_execution_complete = true; }],
  ['field terminal', (v) => { v.current_result.field_matrix_terminal = true; }],
  ['class closed', (v) => { v.current_result.class_closed = true; }],
  ['human gate', (v) => { v.current_result.outside_human_dependency = true; }],
  ['project block', (v) => { v.current_result.project_blocking = true; }],
  ['capital finding', (v) => { v.current_result.capital_conversion_finding = true; }],
  ['favoritism finding', (v) => { v.current_result.favoritism_finding = true; }],
  ['coordination finding', (v) => { v.current_result.coordination_finding = true; }],
  ['graph effect', (v) => { v.current_result.graph_effect = 'added'; }],
  ['manager admission boundary', (v) => { v.boundaries.exact_manager_candidate_is_admitted_source = true; }],
  ['parent evidence boundary', (v) => { v.boundaries.name_aligned_parent_surface_is_fund_specific_evidence = true; }],
  ['official collision boundary', (v) => { v.boundaries.official_domain_collision_is_official_fund_record = true; }],
  ['absence boundary', (v) => { v.boundaries.nonresponsive_candidate_is_event_absence = true; }],
  ['route event boundary', (v) => { v.boundaries.candidate_followup_route_is_lifecycle_event = true; }],
  ['withheld inference boundary', (v) => { v.boundaries.withheld_identity_inferred = true; }]
];

const followupMutations = [
  ['followup schema', (v) => { v.schema_version += '-drift'; }],
  ['followup authority', (v) => { v.authority = 'admitted_sources'; }],
  ['parent merge', (v) => { v.source_custody.protocol_merge = '0'.repeat(40); }],
  ['adjudication digest', (v) => { v.source_custody.candidate_adjudication_index_sha256 = '0'.repeat(64); }],
  ['artifact ID', (v) => { v.source_custody.candidate_index_artifact_id += 1; }],
  ['source denominator', (v) => { v.denominator.unique_candidate_urls = 209; }],
  ['terminal denominator', (v) => { v.denominator.terminally_adjudicated_candidate_urls = 209; }],
  ['route denominator', (v) => { v.denominator.fixed_followup_routes = 9; }],
  ['unit one routes', (v) => { v.denominator.unit_01_routes = 2; }],
  ['unit fifteen routes', (v) => { v.denominator.unit_15_routes = 8; }],
  ['withheld route', (v) => { v.denominator.withheld_row_routes = 1; }],
  ['ledger bytes', (v) => { v.denominator.route_ledger_bytes += 1; }],
  ['ledger digest', (v) => { v.denominator.route_ledger_sha256 = '0'.repeat(64); }],
  ['remove route', (v) => { v.routes.pop(); }],
  ['reorder routes', (v) => { v.routes.reverse(); }],
  ['route ID', (v) => { v.routes[0].route_id = 'RD02-W03-CF999'; }],
  ['candidate binding', (v) => { v.routes[0].candidate_id = '0'.repeat(64); }],
  ['route URL', (v) => { v.routes[0].requested_url = 'https://example.com/'; }],
  ['route unit', (v) => { v.routes[0].unit_ordinal = 18; }],
  ['route type', (v) => { v.routes[0].route_type = 'search'; }],
  ['route attempts', (v) => { v.routes[0].maximum_attempts = 2; }],
  ['route admission', (v) => { v.routes[0].candidate_is_admitted_source = true; }],
  ['route spawn', (v) => { v.routes[0].result_spawned_requests = 1; }],
  ['body limit', (v) => { v.execution_contract.maximum_response_body_bytes = 1; }],
  ['worker count', (v) => { v.execution_contract.maximum_parallel_workers = 10; }],
  ['spawn requests', (v) => { v.execution_contract.result_spawned_requests = 1; }],
  ['automatic admission', (v) => { v.execution_contract.candidate_admission_without_separate_adjudication = true; }],
  ['automatic closure', (v) => { v.execution_contract.automatic_class_closure = true; }],
  ['pre-execution attempt', (v) => { v.current_counts.route_attempts = 1; }],
  ['pre-execution admission', (v) => { v.current_counts.admitted_sources = 1; }],
  ['human dependency', (v) => { v.authority_boundaries.outside_human_dependency = true; }],
  ['external review', (v) => { v.authority_boundaries.external_reviews = 1; }],
  ['publication effect', (v) => { v.authority_boundaries.publication_effect = 'published'; }]
];

const schemaMutations = [
  ['schema dialect', (v) => { v.$schema = 'other'; }],
  ['schema ID', (v) => { v.$id = 'other'; }],
  ['schema reopen', (v) => { v.additionalProperties = true; }],
  ['schema version', (v) => { v.properties.schema_version.const += '-drift'; }],
  ['schema min', (v) => { v.properties.shards.minItems = 6; }],
  ['schema max', (v) => { v.properties.shards.maxItems = 8; }],
  ['schema rows', (v) => { v.properties.counts.properties.candidate_rows.const = 479; }],
  ['schema followups', (v) => { v.properties.counts.properties.fixed_followup_routes.const = 9; }],
  ['candidate reopen', (v) => { v.$defs.candidate.additionalProperties = true; }]
];

let refused = 0;
for (const [label, mutate] of adjudicationMutations) {
  const candidate = clone(adjudication);
  mutate(candidate);
  assert.throws(() => validateCandidateAdjudication(candidate), undefined, label);
  refused += 1;
}
for (const [label, mutate] of followupMutations) {
  const candidate = clone(followup);
  mutate(candidate);
  assert.throws(() => validateFollowupProtocol(candidate, adjudication), undefined, label);
  refused += 1;
}
for (const [label, mutate] of schemaMutations) {
  const candidate = clone(schema);
  mutate(candidate);
  assert.throws(() => validateSchemaContract(candidate), undefined, label);
  refused += 1;
}
console.log(`RD-02 Wave-03 candidate-adjudication adversarial suite: ${refused} mutations refused`);
