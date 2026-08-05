#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  deriveProduct,
  loadInputs,
  validateInputs,
} from '../tools/build-status-sovereignty-rd-wave03-rd04-responsive-link-source-adjudication.mjs';

function clone(value) {
  return structuredClone(value);
}
function mustRefuse(name, mutate) {
  const inputs = clone(BASE);
  mutate(inputs);
  assert.throws(() => validateInputs(inputs), undefined, name);
  refusals += 1;
}

const BASE = loadInputs();
validateInputs(clone(BASE));
const derived = deriveProduct(clone(BASE));
assert.equal(JSON.parse(derived['index.json']).counts.sources_admitted_for_any_bounded_scope, 58);
assert.equal(JSON.parse(derived['index.json']).counts.offline_field_review_sources, 36);
assert.equal(JSON.parse(derived['index.json']).counts.substantive_field_terminalizations, 0);

let refusals = 0;
for (let i = 0; i < 62; i += 1) {
  const routeName = `route-${String(i + 1).padStart(2, '0')}`;
  const mutations = [
    ['route-id', (x) => { x.decisions.decisions[i].route_id += '-tampered'; }],
    ['ordinal', (x) => { x.decisions.decisions[i].route_ordinal += 1; }],
    ['postal-code', (x) => { x.decisions.decisions[i].postal_code = 'ZZ'; }],
    ['capture-state', (x) => { x.decisions.decisions[i].capture_state = 'tampered_state'; }],
    ['body-sha', (x) => { x.decisions.decisions[i].body_sha256 = '0'.repeat(64); }],
    ['body-bytes', (x) => { x.decisions.decisions[i].body_bytes += 1; }],
    ['content-type', (x) => { x.decisions.decisions[i].content_type = 'application/octet-stream'; }],
    ['title', (x) => { x.decisions.decisions[i].document_title = ''; }],
    ['source-class', (x) => { x.decisions.decisions[i].source_class = 'tampered_class'; }],
    ['source-scope', (x) => { x.decisions.decisions[i].source_scope = ''; }],
    ['source-admission', (x) => { x.decisions.decisions[i].source_admitted = !x.decisions.decisions[i].source_admitted; }],
    ['field-review', (x) => { x.decisions.decisions[i].field_review_selected = !x.decisions.decisions[i].field_review_selected; }],
    ['withheld-fields', (x) => { x.decisions.decisions[i].not_admitted_for = []; }],
    ['field-effect', (x) => { x.decisions.decisions[i].field_classification_effect = 'evidence_complete'; }],
    ['terminalization', (x) => { x.decisions.decisions[i].substantive_field_terminalizations = 1; }],
    ['spawned-request', (x) => { x.decisions.decisions[i].result_spawned_requests = 1; }],
    ['outside-human', (x) => { x.decisions.decisions[i].outside_human_dependency = true; }],
    ['publication-effect', (x) => { x.decisions.decisions[i].publication_effect = 'changed'; }],
  ];
  for (const [suffix, mutate] of mutations) mustRefuse(`${routeName}-${suffix}`, mutate);
}

const globals = [
  ['remove-decision', (x) => { x.decisions.decisions.pop(); }],
  ['duplicate-decision-id', (x) => { x.decisions.decisions[1].route_id = x.decisions.decisions[0].route_id; }],
  ['custody-zip-bytes', (x) => { x.custody.artifact_zip_bytes += 1; }],
  ['capture-source-admission', (x) => { x.routeResults.routes[0].source_admitted = true; }],
  ['capture-order', (x) => { [x.routeResults.routes[0], x.routeResults.routes[1]] = [x.routeResults.routes[1], x.routeResults.routes[0]]; }],
  ['protocol-order', (x) => { [x.protocol.routes[0], x.protocol.routes[1]] = [x.protocol.routes[1], x.protocol.routes[0]]; }],
  ['predecessor-terminal-cells', (x) => { x.predecessorIndex.counts.terminal_field_cells_after = 101; }],
  ['execution-route-count', (x) => { x.executionReceipt.fixed_routes = 61; }],
  ['decision-schema', (x) => { x.decisions.schema_version = 'tampered'; }],
  ['route-result-schema', (x) => { x.routeResults.schema_version = 'tampered'; }],
];
for (const [name, mutate] of globals) mustRefuse(name, mutate);

assert.equal(refusals, 1126);
console.log('responsive_link_source_adjudication_tests=pass');
console.log(`adversarial_mutations_refused=${refusals}`);
console.log('source_admissions=58');
console.log('offline_field_review_sources=36');
console.log('substantive_field_terminalizations=0');
console.log('class_closed=false');
