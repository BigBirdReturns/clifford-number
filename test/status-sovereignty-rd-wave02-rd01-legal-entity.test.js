#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  LANE_ROOT,
  ARTIFACT_INDEX_PATH,
  PRODUCT_ROOT,
  CLOSURE_PATH,
  MANIFEST_PATH,
  CLASS_RECEIPT_PATH,
  SUMMARY_PATH,
  SCHEMA_PATH
} from '../tools/build-status-sovereignty-rd-wave02-rd01-legal-entity.mjs';
import {
  validateRd01Closure,
  validateRd01Shape
} from '../tools/validate-status-sovereignty-rd-wave02-rd01-legal-entity.mjs';

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const values = {
  scaffold: read(`${LANE_ROOT}/roster-scaffold.json`),
  artifactIndex: read(ARTIFACT_INDEX_PATH),
  protocol: read(`${PRODUCT_ROOT}/protocol.json`),
  failedUniverse: read(`${PRODUCT_ROOT}/failed-route-universe.json`),
  routeIndex: read(`${PRODUCT_ROOT}/final-route-state-index.json`),
  candidateIndex: read(`${PRODUCT_ROOT}/candidate-index.json`),
  terminal: read(`${PRODUCT_ROOT}/terminal-classification.json`),
  comparison: read(`${PRODUCT_ROOT}/comparison.json`),
  summary: read(SUMMARY_PATH),
  classReceipt: read(CLASS_RECEIPT_PATH),
  manifest: read(MANIFEST_PATH),
  closure: read(CLOSURE_PATH),
  schema: read(SCHEMA_PATH)
};

validateRd01Closure(ROOT);
const clone = (value) => structuredClone(value);
const mutations = [
  ['scaffold row removed', (v) => { v.scaffold.rows.pop(); }],
  ['scaffold duplicate row', (v) => { v.scaffold.rows[1].row_id = v.scaffold.rows[0].row_id; }],
  ['artifact research head', (v) => { v.artifactIndex.research_head = '0'.repeat(40); }],
  ['artifact boundary row count', (v) => { v.artifactIndex.protocol_boundary.frozen_rows = 101; }],
  ['artifact stage1 routes', (v) => { v.artifactIndex.protocol_boundary.stage1_fixed_routes = 204; }],
  ['artifact stage2 routes', (v) => { v.artifactIndex.protocol_boundary.stage2_fixed_routes = 611; }],
  ['artifact replay routes', (v) => { v.artifactIndex.protocol_boundary.failed_route_replay_routes = 113; }],
  ['artifact third pass enabled', (v) => { v.artifactIndex.protocol_boundary.automatic_third_pass_authorized = true; }],
  ['artifact removed', (v) => { v.artifactIndex.artifacts.pop(); }],
  ['artifact id changed', (v) => { v.artifactIndex.artifacts[2].artifact_id = 1; }],
  ['artifact outside human', (v) => { v.artifactIndex.authority.outside_human_dependency = true; }],
  ['protocol replay denominator', (v) => { v.protocol.replay_contract.replay_routes = 115; }],
  ['protocol recursion', (v) => { v.protocol.replay_contract.result_spawned_requests = 1; }],
  ['protocol third pass', (v) => { v.protocol.replay_contract.automatic_third_pass_authorized = true; }],
  ['protocol external contact', (v) => { v.protocol.authority.external_contacts = 1; }],
  ['failed route count', (v) => { v.failedUniverse.routes = 113; }],
  ['failed route unfrozen', (v) => { v.failedUniverse.frozen_before_requests = false; }],
  ['failed route recursion', (v) => { v.failedUniverse.result_spawned_requests = 1; }],
  ['failed route key removed', (v) => { v.failedUniverse.route_keys.pop(); }],
  ['failed route duplicate', (v) => { v.failedUniverse.route_keys[1] = v.failedUniverse.route_keys[0]; }],
  ['final route denominator', (v) => { v.routeIndex.fixed_routes = 611; }],
  ['final replay denominator', (v) => { v.routeIndex.replayed_routes = 113; }],
  ['final original success count', (v) => { v.routeIndex.route_state_counts.http_success = 497; }],
  ['final replay success count', (v) => { v.routeIndex.route_state_counts.http_success_after_fixed_replay = 113; }],
  ['final route removed', (v) => { v.routeIndex.routes.pop(); }],
  ['final route duplicate', (v) => { v.routeIndex.routes[1].row_id = v.routeIndex.routes[0].row_id; v.routeIndex.routes[1].award_group = v.routeIndex.routes[0].award_group; }],
  ['final route non-success', (v) => { v.routeIndex.routes[0].final_terminal_state = 'transport_failure_after_fixed_replay'; }],
  ['candidate row count', (v) => { v.candidateIndex.rows = 101; }],
  ['candidate replay count', (v) => { v.candidateIndex.fixed_replay_routes = 113; }],
  ['candidate third pass', (v) => { v.candidateIndex.automatic_third_pass_authorized = true; }],
  ['candidate row removed', (v) => { v.candidateIndex.candidate_rows.pop(); }],
  ['candidate duplicate row', (v) => { v.candidateIndex.candidate_rows[1].row_id = v.candidateIndex.candidate_rows[0].row_id; }],
  ['terminal replay count', (v) => { v.terminal.fixed_replay_routes = 113; }],
  ['terminal third pass', (v) => { v.terminal.automatic_third_pass_authorized = true; }],
  ['terminal row removed', (v) => { v.terminal.rows.pop(); }],
  ['terminal duplicate row', (v) => { v.terminal.rows[1].row_id = v.terminal.rows[0].row_id; }],
  ['terminal exact overcount', (v) => { v.terminal.rows.find((row) => row.terminal_row_state === 'identity_ambiguous').terminal_row_state = 'exact_legal_entity_resolved'; }],
  ['terminal row reopened', (v) => { v.terminal.rows[0].row_closed = false; }],
  ['terminal protocol incomplete', (v) => { v.terminal.rows[0].fixed_protocol_complete = false; }],
  ['resolved entity removed', (v) => { v.terminal.rows.find((row) => row.terminal_row_state === 'exact_legal_entity_resolved').resolved_legal_entity = null; }],
  ['resolved jurisdiction removed', (v) => { v.terminal.rows.find((row) => row.terminal_row_state === 'exact_legal_entity_resolved').entity_jurisdiction = null; }],
  ['resolved identifier removed', (v) => { v.terminal.rows.find((row) => row.terminal_row_state === 'exact_legal_entity_resolved').entity_identifier_and_authoritative_source = null; }],
  ['unresolved entity invented', (v) => { v.terminal.rows.find((row) => row.terminal_row_state === 'identity_ambiguous').resolved_legal_entity = 'INVENTED LLC'; }],
  ['comparison changed rows', (v) => { v.comparison.changed_rows = 7; }],
  ['comparison detail removed', (v) => { v.comparison.changed_row_details.pop(); }],
  ['comparison changed identity', (v) => { v.comparison.changed_row_details[0].row_id = 'BAD'; }],
  ['summary terminal state', (v) => { v.summary.terminal_state = 'evidence_complete'; }],
  ['summary class reopened', (v) => { v.summary.class_closed = false; }],
  ['summary row count', (v) => { v.summary.counts.frozen_rows = 101; }],
  ['summary route count', (v) => { v.summary.counts.fixed_stage2_routes = 611; }],
  ['summary replay count', (v) => { v.summary.counts.fixed_replay_routes = 113; }],
  ['summary resolved count', (v) => { v.summary.counts.legal_entities_resolved = 47; }],
  ['summary ambiguity count', (v) => { v.summary.counts.identity_ambiguous = 43; }],
  ['summary unavailable count', (v) => { v.summary.counts.identity_source_unavailable = 9; }],
  ['summary changed row count', (v) => { v.summary.counts.changed_rows_after_replay = 7; }],
  ['summary outside human', (v) => { v.summary.authority.outside_human_dependency = true; }],
  ['summary third pass', (v) => { v.summary.authority.automatic_third_pass_authorized = true; }],
  ['summary common control', (v) => { v.summary.authority.common_control_finding = true; }],
  ['class label changed', (v) => { v.classReceipt.class_label = 'brand resolution'; }],
  ['class receipt reopened', (v) => { v.classReceipt.class_closed = false; }],
  ['class receipt resolved count', (v) => { v.classReceipt.counts.legal_entities_resolved = 49; }],
  ['class receipt route count', (v) => { v.classReceipt.counts.final_http_success_routes = 611; }],
  ['class receipt third pass', (v) => { v.classReceipt.unresolved_limit.automatic_third_pass_authorized = true; }],
  ['class receipt common control', (v) => { v.classReceipt.authority.common_control_finding = true; }],
  ['manifest entry removed', (v) => { v.manifest.entries.pop(); }],
  ['manifest order changed', (v) => { v.manifest.entries.reverse(); }],
  ['manifest digest malformed', (v) => { v.manifest.combined_sha256 = 'bad'; }],
  ['closure identity changed', (v) => { v.closure.class_id = 'RD-01-C04'; }],
  ['closure reopened', (v) => { v.closure.class_closed = false; }],
  ['closure manifest changed', (v) => { v.closure.product.manifest_combined_sha256 = '0'.repeat(64); }],
  ['closure atlas changed', (v) => { v.closure.residual_atlas_effect_if_promoted_after_rd04_rd05.open_after = 40; }],
  ['closure graph effect', (v) => { v.closure.authority.graph_effect = 'graph_changed'; }],
  ['schema root opened', (v) => { v.schema.additionalProperties = true; }],
  ['schema version changed', (v) => { v.schema.properties.schema_version.const = 'bad'; }],
  ['schema class changed', (v) => { v.schema.properties.class_id.const = 'RD-01-C04'; }],
  ['schema row count changed', (v) => { v.schema.properties.counts.properties.frozen_rows.const = 101; }],
  ['schema route count changed', (v) => { v.schema.properties.counts.properties.final_http_success_routes.const = 611; }]
];

for (const [name, mutate] of mutations) {
  const candidate = clone(values);
  mutate(candidate);
  assert.throws(() => validateRd01Shape(candidate), undefined, name);
}

console.log(`RD-01 terminal closure adversarial suite: ${mutations.length} mutations refused`);
