#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ROOT,
  SEED_PATH,
  MATRIX_PATH,
  PROTOCOL_PATH,
  MANIFEST_PATH,
  SCHEMA_PATH
} from '../tools/build-status-sovereignty-rd-wave03-rd04-state-implementation-intake.mjs';
import {
  FIRST_PASS_PATH,
  REMEDY_PATH,
  PARENT_RECEIPT_PATH,
  PARENT_CLOSURE_PATH,
  validateSchemaContract,
  validateImmutableSources,
  validateValue,
  validateManifest,
  validateBundle
} from '../tools/validate-status-sovereignty-rd-wave03-rd04-state-implementation-intake.mjs';

const read = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const write = (root, rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};
const copy = (sourceRoot, targetRoot, rel) => {
  const target = path.join(targetRoot, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(sourceRoot, rel), target);
};
const clone = (value) => structuredClone(value);

const base = {
  protocol: read(ROOT, PROTOCOL_PATH),
  schema: read(ROOT, SCHEMA_PATH),
  manifest: read(ROOT, MANIFEST_PATH)
};

const tests = [];
function protocolMutation(name, mutate) {
  tests.push({
    name,
    async run() {
      const specimen = clone(base.protocol);
      mutate(specimen);
      await assert.rejects(() => validateValue(specimen, ROOT), undefined, name);
    }
  });
}
function schemaMutation(name, mutate) {
  tests.push({
    name,
    async run() {
      const specimen = clone(base.schema);
      mutate(specimen);
      assert.throws(() => validateSchemaContract(specimen), undefined, name);
    }
  });
}
function manifestMutation(name, mutate) {
  tests.push({
    name,
    async run() {
      const specimen = clone(base.manifest);
      mutate(specimen);
      assert.throws(() => validateManifest(specimen, ROOT), undefined, name);
    }
  });
}

for (const [key, replacement] of Object.entries({
  schema_version: 'ssc-rd-wave03-rd04-state-implementation-source-census-protocol@2',
  wave_id: 'SSC-RD-W04',
  lane_id: 'RD-05',
  class_id: 'RD-04-C03',
  issue: 9999,
  as_of: '2026-08-06',
  title: 'changed',
  authority: 'state_implementation_observed'
})) protocolMutation(`top-level ${key} mutation`, (value) => { value[key] = replacement; });

for (const key of Object.keys(base.protocol.source_custody)) {
  protocolMutation(`source custody ${key} mutation`, (value) => {
    const current = value.source_custody[key];
    value.source_custody[key] = typeof current === 'number' ? current + 1 : `${current}-changed`;
  });
}
for (const key of Object.keys(base.protocol.denominator)) {
  protocolMutation(`denominator ${key} mutation`, (value) => { value.denominator[key] += 1; });
}
for (const key of Object.keys(base.protocol.inherited_source_custody)) {
  protocolMutation(`inherited custody ${key} mutation`, (value) => {
    const current = value.inherited_source_custody[key];
    value.inherited_source_custody[key] = typeof current === 'boolean' ? !current : current + 1;
  });
}
for (let index = 0; index < base.protocol.query_specs.length; index += 1) {
  for (const key of ['query_class', 'order', 'terms']) {
    protocolMutation(`query spec ${index} ${key} mutation`, (value) => {
      const current = value.query_specs[index][key];
      value.query_specs[index][key] = typeof current === 'number' ? current + 1 : `${current}-changed`;
    });
  }
}
for (const key of Object.keys(base.protocol.route_derivation)) {
  protocolMutation(`route derivation ${key} mutation`, (value) => {
    const current = value.route_derivation[key];
    if (Array.isArray(current)) current.reverse();
    else if (typeof current === 'boolean') value.route_derivation[key] = !current;
    else if (typeof current === 'number') value.route_derivation[key] = current + 1;
    else value.route_derivation[key] = `${current}-changed`;
  });
}

for (let index = 0; index < base.protocol.routes.length; index += 1) {
  protocolMutation(`route ${index + 1} identity mutation`, (value) => { value.routes[index].route_id += '-changed'; });
}
for (let index = 0; index < base.protocol.routes.length; index += 10) {
  protocolMutation(`route ${index + 1} attempt mutation`, (value) => { value.routes[index].maximum_attempts = 2; });
  protocolMutation(`route ${index + 1} candidate-admission mutation`, (value) => { value.routes[index].candidate_rows_are_admitted_sources = true; });
  protocolMutation(`route ${index + 1} spawned-request mutation`, (value) => { value.routes[index].result_spawned_requests = 1; });
  protocolMutation(`route ${index + 1} host mutation`, (value) => { value.routes[index].allowed_final_host_suffix = 'example.com'; });
}
for (let ordinal = 1; ordinal <= 50; ordinal += 1) {
  const candidateIndex = 4 + (ordinal - 1) * 4 + 1;
  protocolMutation(`state ${ordinal} candidate ceiling mutation`, (value) => { value.routes[candidateIndex].maximum_candidate_rows = 11; });
}
protocolMutation('route removal', (value) => { value.routes.pop(); });
protocolMutation('route reorder', (value) => { [value.routes[4], value.routes[5]] = [value.routes[5], value.routes[4]]; });
protocolMutation('route duplicate', (value) => { value.routes[5] = clone(value.routes[4]); });
protocolMutation('district route insertion', (value) => { value.routes[4].postal_code = 'DC'; });
protocolMutation('state identity substitution', (value) => { value.routes[4].unit_id = 'US-STATE-AK'; });
protocolMutation('federal-to-state implementation promotion', (value) => { value.execution_contract.federal_rule_is_state_implementation = true; });
protocolMutation('waiver-authority promotion', (value) => { value.execution_contract.waiver_authority_is_requested_approved_or_current_waiver = true; });
protocolMutation('exemption-use promotion', (value) => { value.execution_contract.exemption_authority_is_observed_use = true; });
protocolMutation('screening-uniformity promotion', (value) => { value.execution_contract.screening_rule_is_uniform_staff_practice = true; });
protocolMutation('missing-record absence promotion', (value) => { value.execution_contract.missing_state_record_is_no_policy_or_practice = true; });

for (const key of Object.keys(base.protocol.execution_contract)) {
  protocolMutation(`execution contract ${key} mutation`, (value) => {
    const current = value.execution_contract[key];
    value.execution_contract[key] = typeof current === 'boolean' ? !current : typeof current === 'number' ? current + 1 : `${current}-changed`;
  });
}
for (const key of Object.keys(base.protocol.output_contract)) {
  protocolMutation(`output contract ${key} mutation`, (value) => {
    const current = value.output_contract[key];
    value.output_contract[key] = typeof current === 'boolean' ? !current : current + 1;
  });
}
for (const key of Object.keys(base.protocol.current_result)) {
  protocolMutation(`current result ${key} mutation`, (value) => {
    const current = value.current_result[key];
    value.current_result[key] = typeof current === 'boolean' ? !current : typeof current === 'number' ? current + 1 : `${current}-changed`;
  });
}
for (const key of Object.keys(base.protocol.authority_boundaries)) {
  protocolMutation(`authority boundary ${key} mutation`, (value) => {
    const current = value.authority_boundaries[key];
    value.authority_boundaries[key] = typeof current === 'boolean' ? !current : typeof current === 'number' ? current + 1 : `${current}-changed`;
  });
}
protocolMutation('top-level extra property', (value) => { value.extra = true; });
protocolMutation('source custody extra property', (value) => { value.source_custody.extra = true; });
protocolMutation('route extra property', (value) => { value.routes[0].extra = true; });

schemaMutation('schema dialect mutation', (value) => { value.$schema = 'https://json-schema.org/draft/2019-09/schema'; });
schemaMutation('schema ID mutation', (value) => { value.$id += '.changed'; });
schemaMutation('schema top-level openness', (value) => { value.additionalProperties = true; });
schemaMutation('schema top-level required removal', (value) => { value.required.pop(); });
schemaMutation('schema authority mutation', (value) => { value.properties.authority.const = 'changed'; });
schemaMutation('schema source custody openness', (value) => { value.properties.source_custody.additionalProperties = true; });
schemaMutation('schema source custody required removal', (value) => { value.properties.source_custody.required.pop(); });
schemaMutation('schema current main mutation', (value) => { value.properties.source_custody.properties.current_main_at_design.const = '0'.repeat(40); });
schemaMutation('schema matrix blob mutation', (value) => { value.properties.source_custody.properties.matrix_git_blob.const = '1'.repeat(40); });
schemaMutation('schema state denominator mutation', (value) => { value.properties.denominator.properties.state_rows.const = 49; });
schemaMutation('schema cell denominator mutation', (value) => { value.properties.denominator.properties.required_cells.const = 449; });
schemaMutation('schema route minimum mutation', (value) => { value.properties.routes.minItems = 203; });
schemaMutation('schema route maximum mutation', (value) => { value.properties.routes.maxItems = 205; });
schemaMutation('schema route openness', (value) => { value.properties.routes.items.additionalProperties = true; });
schemaMutation('schema route required removal', (value) => { value.properties.routes.items.required.pop(); });
schemaMutation('schema attempt ceiling mutation', (value) => { value.properties.routes.items.properties.maximum_attempts.const = 2; });
schemaMutation('schema candidate ceiling mutation', (value) => { value.properties.routes.items.properties.maximum_candidate_rows.const = 11; });
schemaMutation('schema host enum mutation', (value) => { value.properties.routes.items.properties.allowed_final_host_suffix.enum.push('example.com'); });
schemaMutation('schema candidate admission mutation', (value) => { value.properties.routes.items.properties.candidate_rows_are_admitted_sources.const = true; });
schemaMutation('schema spawned-request mutation', (value) => { value.properties.routes.items.properties.result_spawned_requests.const = 1; });
schemaMutation('schema execution openness', (value) => { value.properties.execution_contract.additionalProperties = true; });
schemaMutation('schema worker ceiling mutation', (value) => { value.properties.execution_contract.properties.maximum_parallel_workers.const = 9; });
schemaMutation('schema automatic class closure mutation', (value) => { value.properties.execution_contract.properties.automatic_class_closure.const = true; });
schemaMutation('schema output receipt mutation', (value) => { value.properties.output_contract.properties.route_receipts.const = 203; });
schemaMutation('schema class-state mutation', (value) => { value.properties.current_result.properties.class_state.const = 'closed'; });
schemaMutation('schema prevalence mutation', (value) => { value.properties.authority_boundaries.properties.national_prevalence_finding.const = true; });
schemaMutation('schema graph effect mutation', (value) => { value.properties.authority_boundaries.properties.graph_effect.const = 'created'; });

manifestMutation('manifest schema mutation', (value) => { value.schema_version = 'changed'; });
manifestMutation('manifest count mutation', (value) => { value.entry_count = 9; });
manifestMutation('manifest combined digest mutation', (value) => { value.combined_sha256 = '0'.repeat(64); });
manifestMutation('manifest row removal', (value) => { value.entries.pop(); });
manifestMutation('manifest row reorder', (value) => { value.entries.reverse(); });
manifestMutation('manifest path mutation', (value) => { value.entries[0].path = 'tmp/carrier'; });
manifestMutation('manifest byte mutation', (value) => { value.entries[0].bytes += 1; });
manifestMutation('manifest digest mutation', (value) => { value.entries[0].sha256 = '1'.repeat(64); });
manifestMutation('manifest duplicate path', (value) => { value.entries[1].path = value.entries[0].path; });
manifestMutation('manifest extra property', (value) => { value.extra = true; });

const sourcePaths = [SEED_PATH, MATRIX_PATH, FIRST_PASS_PATH, REMEDY_PATH, PARENT_RECEIPT_PATH, PARENT_CLOSURE_PATH];
function sourceMutation(name, rel, mutate) {
  tests.push({
    name,
    async run() {
      const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-rd04-intake-source-'));
      try {
        for (const source of sourcePaths) copy(ROOT, temp, source);
        const specimen = read(temp, rel);
        mutate(specimen);
        write(temp, rel, specimen);
        assert.throws(() => validateImmutableSources(temp), undefined, name);
      } finally {
        fs.rmSync(temp, { recursive: true, force: true });
      }
    }
  });
}
sourceMutation('seed class closure mutation', SEED_PATH, (value) => { value.class_closed = true; });
sourceMutation('seed state denominator mutation', SEED_PATH, (value) => { value.denominator_contract.unit_count = 49; });
sourceMutation('matrix state removal', MATRIX_PATH, (value) => { value.units.pop(); });
sourceMutation('matrix district insertion', MATRIX_PATH, (value) => { value.units[0].postal_code = 'DC'; });
sourceMutation('first-pass source removal', FIRST_PASS_PATH, (value) => { value.sources.pop(); });
sourceMutation('first-pass prevalence mutation', FIRST_PASS_PATH, (value) => { value.current_result.prevalence_finding = true; });
sourceMutation('bounded remedy deep-score mutation', REMEDY_PATH, (value) => { value.selection_audit.states_deep_scored = 50; });
sourceMutation('bounded remedy completion mutation', REMEDY_PATH, (value) => { value.selection_audit.selection_gate_complete = true; });
sourceMutation('parent receipt source denominator mutation', PARENT_RECEIPT_PATH, (value) => { value.counts.exact_source_identities = 96; });
sourceMutation('parent receipt reopening mutation', PARENT_RECEIPT_PATH, (value) => { value.class_closed = false; });
sourceMutation('parent closure PR mutation', PARENT_CLOSURE_PATH, (value) => { value.source_pr = 999; });
sourceMutation('parent closure state mutation', PARENT_CLOSURE_PATH, (value) => { value.terminal_state = 'evidence_complete'; });

await validateBundle(base, ROOT, { git: false });
let refused = 0;
for (const test of tests) {
  try {
    await test.run();
    refused += 1;
  } catch (error) {
    error.message = `${test.name}: ${error.message}`;
    throw error;
  }
}
if (refused !== tests.length) throw new Error(`adversarial refusals ${refused}/${tests.length}`);
if (tests.length < 400) throw new Error(`adversarial denominator too small: ${tests.length}`);
console.log(`RD-04 Wave-03 intake adversarial suite: ${refused} mutations refused; 50 states / 450 cells / 204 routes preserved`);
