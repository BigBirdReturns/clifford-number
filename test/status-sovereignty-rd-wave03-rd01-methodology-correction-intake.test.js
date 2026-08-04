#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  EDITIONS,
  FIELD_IDS,
  SEARCH_TERMS
} from '../tools/build-status-sovereignty-rd-wave03-rd01-methodology-correction-intake.mjs';
import {
  readBundle,
  validatePackage,
  validatePackageShape
} from '../tools/validate-status-sovereignty-rd-wave03-rd01-methodology-correction-intake.mjs';

const clone = (value) => structuredClone(value);
validatePackage();
const bundle = readBundle();

const packageMutations = [
  ['schema version', (v) => { v.schema_version = 'bad'; }],
  ['wave id', (v) => { v.wave_id = 'OTHER'; }],
  ['class id', (v) => { v.class_id = 'RD-01-C03'; }],
  ['issue', (v) => { v.issue = 786; }],
  ['cutoff', (v) => { v.as_of = '2026-08-03'; }],
  ['authority', (v) => { v.authority = 'empirical'; }],
  ['constitution merge', (v) => { v.source_custody.constitution_merge = '0'.repeat(40); }],
  ['frozen base', (v) => { v.source_custody.frozen_execution_base = '0'.repeat(40); }],
  ['seed commit', (v) => { v.source_custody.seed_binding_commit = '0'.repeat(40); }],
  ['parent blob', (v) => { v.source_custody.parent_blob_sha = '0'.repeat(40); }],
  ['prior receipt reopened', (v) => { v.source_custody.prior_receipt_reopened_or_double_counted = true; }],
  ['edition denominator', (v) => { v.denominator.edition_count = 2; }],
  ['edition order', (v) => { v.denominator.ordered_editions.reverse(); }],
  ['field slots', (v) => { v.denominator.required_field_slots = 23; }],
  ['source count denominator', (v) => { v.denominator.source_count_is_unit_denominator = true; }],
  ['historical rewrite', (v) => { v.denominator.later_edition_may_rewrite_earlier_edition = true; }],
  ['field removed', (v) => { v.required_fields.pop(); }],
  ['field order', (v) => { v.required_fields.reverse(); }],
  ['field id', (v) => { v.required_fields[0].field_id = 'other'; }],
  ['field question weakened', (v) => { v.required_fields[0].question = 'short'; }],
  ['field terminal states', (v) => { v.required_fields[0].permitted_terminal_states.push('zero'); }],
  ['edition removed', (v) => { v.editions.pop(); }],
  ['edition order changed', (v) => { v.editions.reverse(); }],
  ['edition source changed', (v) => { v.editions[0].source_id = 'SSC-RD01-S001'; }],
  ['edition url changed', (v) => { v.editions[0].exact_url = 'https://example.com'; }],
  ['edition baseline changed', (v) => { v.editions[0].parent_baseline.direct_contracting_input = true; }],
  ['edition fields changed', (v) => { v.editions[0].required_field_ids = FIELD_IDS.slice(1); }],
  ['edition executed', (v) => { v.editions[0].protocol_state = 'executed'; }],
  ['edition terminal field', (v) => { v.editions[0].terminal_fields = 1; }],
  ['edition closed', (v) => { v.editions[0].row_closed = true; }],
  ['route removed', (v) => { v.routes.pop(); }],
  ['duplicate route id', (v) => { v.routes[1].route_id = v.routes[0].route_id; }],
  ['duplicate route url', (v) => { v.routes[1].request_url = v.routes[0].request_url; }],
  ['direct route order', (v) => { [v.routes[0],v.routes[1]] = [v.routes[1],v.routes[0]]; }],
  ['direct route type', (v) => { v.routes[0].route_type = 'query'; }],
  ['direct route admission', (v) => { v.routes[0].admission_state = 'candidate'; }],
  ['direct route followup', (v) => { v.routes[0].automatic_result_followups = 1; }],
  ['query route id', (v) => { v.routes[3].route_id = 'wrong'; }],
  ['query edition', (v) => { v.routes[3].edition = 2025; }],
  ['query term', (v) => { v.routes[3].search_term = SEARCH_TERMS[1]; }],
  ['query url', (v) => { v.routes[3].request_url = 'https://www.bing.com/search?format=rss&q=wrong'; }],
  ['query admitted', (v) => { v.routes[3].admission_state = 'predeclared_first_party_source'; }],
  ['query followup', (v) => { v.routes[3].automatic_result_followups = 1; }],
  ['transport attempts', (v) => { v.transport_contract.maximum_attempts_per_route = 2; }],
  ['transport timeout', (v) => { v.transport_contract.timeout_ms = 1; }],
  ['transport concurrency', (v) => { v.transport_contract.concurrency = 20; }],
  ['result spawned', (v) => { v.transport_contract.result_spawned_requests = 1; }],
  ['external contact', (v) => { v.transport_contract.external_contacts = 1; }],
  ['second pass', (v) => { v.transport_contract.automatic_second_pass_authorized = true; }],
  ['admission rule removed', (v) => { v.admission_rules.pop(); }],
  ['terminal rule removed', (v) => { v.terminal_rules.pop(); }],
  ['counts field slots', (v) => { v.counts.required_field_slots = 23; }],
  ['counts route count', (v) => { v.counts.fixed_routes = 29; }],
  ['acquisition started', (v) => { v.counts.acquisition_attempts = 1; }],
  ['terminal fields added', (v) => { v.counts.terminal_fields = 1; }],
  ['candidate admitted', (v) => { v.counts.admitted_candidate_sources = 1; }],
  ['result class closed', (v) => { v.current_result.class_closed = true; }],
  ['result protocol executed', (v) => { v.current_result.fixed_protocol_executed = true; }],
  ['selector accuracy', (v) => { v.current_result.selector_accuracy_finding = true; }],
  ['technical superiority', (v) => { v.current_result.technical_superiority_finding = true; }],
  ['outside human', (v) => { v.current_result.outside_human_dependency = true; }],
  ['publication effect', (v) => { v.current_result.publication_effect = 'published'; }],
  ['methodology collapse', (v) => { v.boundaries.methodology_change_is_correction = true; }],
  ['edition collapse', (v) => { v.boundaries.new_edition_is_prior_edition_reevaluation = true; }],
  ['absence collapse', (v) => { v.boundaries.no_public_appeal_route_is_no_appeal_or_challenge = true; }],
  ['candidate source collapse', (v) => { v.boundaries.candidate_query_result_is_admitted_source = true; }],
  ['intake closes class', (v) => { v.boundaries.intake_protocol_is_class_closure = true; }],
  ['extra root property', (v) => { v.unreviewed = true; }]
];

for (const [name, mutate] of packageMutations) {
  const value = clone(bundle.package);
  mutate(value);
  assert.throws(
    () => validatePackageShape(value, bundle.schema, bundle.seed, bundle.constitution, bundle.parent, bundle.matrixContract),
    undefined,
    name
  );
}

const schemaMutations = [
  ['schema opened', (s) => { s.additionalProperties = true; }],
  ['schema field denominator', (s) => { s.properties.required_fields.maxItems = 9; }],
  ['schema edition denominator', (s) => { s.properties.editions.minItems = 2; }],
  ['schema route denominator', (s) => { s.properties.routes.maxItems = 31; }],
  ['schema field count', (s) => { s.properties.counts.properties.required_field_slots.const = 23; }],
  ['schema route count', (s) => { s.properties.counts.properties.fixed_routes.const = 29; }]
];
for (const [name, mutate] of schemaMutations) {
  const schema = clone(bundle.schema);
  mutate(schema);
  assert.throws(
    () => validatePackageShape(bundle.package, schema, bundle.seed, bundle.constitution, bundle.parent, bundle.matrixContract),
    undefined,
    name
  );
}

const custodyMutations = [
  ['seed class', 'seed', (v) => { v.class_id = 'RD-01-C03'; }],
  ['seed frozen base', 'seed', (v) => { v.frozen_execution_base = '0'.repeat(40); }],
  ['seed closed', 'seed', (v) => { v.class_closed = true; }],
  ['constitution frozen base', 'constitution', (v) => { v.parent_custody.frozen_execution_base = '0'.repeat(40); }],
  ['constitution label', 'constitution', (v) => { v.lane_attempts[0].exact_label = 'other'; }],
  ['constitution denominator', 'constitution', (v) => { v.lane_attempts[0].initial_unit_count = 4; }],
  ['parent edition removed', 'parent', (v) => { v.edition_controls.pop(); }],
  ['parent edition order', 'parent', (v) => { v.edition_controls.reverse(); }],
  ['parent source order', 'parent', (v) => { v.sources.reverse(); }],
  ['parent source url', 'parent', (v) => { v.sources[0].url = 'https://example.com'; }],
  ['matrix unit order', 'matrixContract', (v) => { v.units.reverse(); }],
  ['matrix field removed', 'matrixContract', (v) => { v.required_fields.pop(); }],
  ['matrix cell count', 'matrixContract', (v) => { v.expansion_contract.required_cells = 21; }]
];
for (const [name, key, mutate] of custodyMutations) {
  const input = clone(bundle[key]);
  mutate(input);
  const args = {
    seed: bundle.seed,
    constitution: bundle.constitution,
    parent: bundle.parent,
    matrixContract: bundle.matrixContract,
    [key]: input
  };
  assert.throws(
    () => validatePackageShape(bundle.package, bundle.schema, args.seed, args.constitution, args.parent, args.matrixContract),
    undefined,
    name
  );
}

assert.deepEqual(bundle.package.denominator.ordered_editions, EDITIONS);
assert.equal(bundle.package.routes.length, 3 + (EDITIONS.length * SEARCH_TERMS.length));
console.log(`RD-01 Wave-03 intake adversarial suite: ${packageMutations.length + schemaMutations.length + custodyMutations.length} mutations refused`);
