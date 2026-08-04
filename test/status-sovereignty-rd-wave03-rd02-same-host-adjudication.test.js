#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBundle } from '../tools/validate-status-sovereignty-rd-wave03-rd02-same-host-adjudication.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle';
const base = {
  receipt: JSON.parse(fs.readFileSync(path.join(ROOT, BASE, 'candidate-followup-execution-receipt.json'), 'utf8')),
  adjudication: JSON.parse(fs.readFileSync(path.join(ROOT, BASE, 'same-host-link-adjudication.json'), 'utf8')),
  protocol: JSON.parse(fs.readFileSync(path.join(ROOT, BASE, 'same-host-followup-protocol.json'), 'utf8')),
};
const clone = () => structuredClone(base);
const mutations = [
  (x) => { x.receipt.artifact_id += 1; },
  (x) => { x.receipt.artifact_zip_sha256 = '0'.repeat(64); },
  (x) => { x.receipt.artifact_manifest.entries -= 1; },
  (x) => { x.receipt.route_outcomes.pop(); },
  (x) => { x.receipt.route_outcomes[0].route_id = 'wrong'; },
  (x) => { x.receipt.route_outcomes[0].admitted_source = true; },
  (x) => { x.receipt.route_outcomes[0].lifecycle_event_observed = true; },
  (x) => { x.receipt.route_outcomes[0].result_spawned_requests = 1; },
  (x) => { x.receipt.counts.route_attempts = 9; },
  (x) => { x.receipt.counts.same_host_link_candidates = 10; },
  (x) => { x.receipt.unapproved = true; },
  (x) => { x.adjudication.source_custody.same_host_candidate_file_sha256 = 'f'.repeat(64); },
  (x) => { x.adjudication.frozen_unit.legal_vehicle = 'Stifel'; },
  (x) => { x.adjudication.denominator.same_host_candidate_urls = 10; },
  (x) => { x.adjudication.denominator.followup_eligible_urls = 6; },
  (x) => { x.adjudication.denominator.silent_urls = 1; },
  (x) => { x.adjudication.records.pop(); },
  (x) => { x.adjudication.records[0].candidate_ordinal = 2; },
  (x) => { x.adjudication.records[0].url += '?changed=1'; },
  (x) => { x.adjudication.records[0].candidate_id = '0'.repeat(64); },
  (x) => { x.adjudication.records[0].followup_eligible = true; },
  (x) => { x.adjudication.records[4].followup_eligible = false; },
  (x) => { x.adjudication.records[4].admitted_source = true; },
  (x) => { x.adjudication.records[4].lifecycle_event_observed = true; },
  (x) => { x.adjudication.records[4].result_spawned_requests = 1; },
  (x) => { x.adjudication.current_result.class_state = 'closed'; },
  (x) => { x.adjudication.current_result.class_closed = true; },
  (x) => { x.adjudication.current_result.admitted_sources = 1; },
  (x) => { x.adjudication.unapproved = true; },
  (x) => { x.protocol.source_custody.artifact_zip_sha256 = 'a'.repeat(64); },
  (x) => { x.protocol.denominator.fixed_followup_routes = 4; },
  (x) => { x.protocol.denominator.route_ledger_bytes += 1; },
  (x) => { x.protocol.denominator.route_ledger_sha256 = 'b'.repeat(64); },
  (x) => { x.protocol.routes.pop(); },
  (x) => { x.protocol.routes[0].route_id = 'wrong'; },
  (x) => { x.protocol.routes[0].link_candidate_ordinal = 4; },
  (x) => { x.protocol.routes[0].requested_url = 'https://example.com/'; },
  (x) => { x.protocol.routes[0].unit_ordinal = 1; },
  (x) => { x.protocol.routes[0].maximum_attempts = 2; },
  (x) => { x.protocol.routes[0].maximum_response_body_bytes = 10485760; },
  (x) => { x.protocol.routes[0].candidate_is_admitted_source = true; },
  (x) => { x.protocol.routes[0].result_spawned_requests = 1; },
  (x) => { x.protocol.routes[1].route_type = 'pdf_disclosure_get'; },
  (x) => { x.protocol.execution_contract.routes_frozen_before_requests = false; },
  (x) => { x.protocol.execution_contract.result_spawned_requests = 1; },
  (x) => { x.protocol.execution_contract.automatic_field_closure = true; },
  (x) => { x.protocol.execution_contract.automatic_class_closure = true; },
  (x) => { x.protocol.current_counts.route_attempts = 1; },
  (x) => { x.protocol.current_counts.class_closed = true; },
  (x) => { x.protocol.authority_boundaries.outside_human_dependency = true; },
  (x) => { x.protocol.authority_boundaries.external_contacts = 1; },
  (x) => { x.protocol.authority_boundaries.graph_effect = 'created'; },
  (x) => { x.protocol.unapproved = true; },
];
let refused = 0;
for (const mutate of mutations) {
  const specimen = clone();
  mutate(specimen);
  try { validateBundle(specimen); } catch { refused += 1; }
}
if (refused !== mutations.length) throw new Error(`adversarial refusals ${refused}/${mutations.length}`);
validateBundle(base);
console.log(`RD-02 same-host adjudication adversarial suite: ${refused} PASS`);
