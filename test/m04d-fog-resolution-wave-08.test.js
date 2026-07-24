#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const wave = JSON.parse(fs.readFileSync('data/intake/m04d-fog-resolution-wave-08.json', 'utf8'));

assert.equal(wave.schema_version, 'm04d-fog-resolution-wave@1');
assert.equal(wave.wave_id, 'M04D-FR-W08');
assert.deepEqual(wave.parent_waves, ['M04D-FR-W01', 'M04D-FR-W02', 'M04D-FR-W03', 'M04D-FR-W04', 'M04D-FR-W05', 'M04D-FR-W06', 'M04D-FR-W07']);
assert.equal(wave.records.length, 8);
assert.equal(new Set(wave.records.map((x) => x.record_id)).size, 8);

const terminal = new Set(wave.method.terminal_states);
for (const record of wave.records) {
  assert.ok(record.record_id);
  assert.ok(record.lane);
  assert.ok(record.proposition);
  assert.ok(record.observation);
  assert.ok(record.supports.length);
  assert.ok(record.does_not_support.length);
  assert.ok(terminal.has(record.disposition), record.record_id);
  assert.ok(record.evidence_ceiling);
  assert.ok(record.next_decisive_acquisition);
  assert.ok(record.falsifier);
  for (const source of record.sources) {
    assert.ok(source.publisher);
    assert.ok(source.title);
    assert.match(source.url, /^https:\/\//);
    assert.ok(source.source_type);
    assert.ok(source.locator_state);
  }
}

const byId = new Map(wave.records.map((x) => [x.record_id, x]));
assert.equal(byId.get('M04D-FR-064').evidence_ceiling, 'exact_external_Erebor_Series_B_investment');
assert.equal(byId.get('M04D-FR-065').evidence_ceiling, 'public_gate_then_private_financing_chronology');
assert.equal(byId.get('M04D-FR-066').disposition, 'bounded_non_link');
assert.equal(byId.get('M04D-FR-067').evidence_ceiling, 'ordinary_co_portfolio_alternative');
assert.equal(byId.get('M04D-FR-068').disposition, 'requires_additional_acquisition');
assert.equal(byId.get('M04D-FR-069').disposition, 'requires_additional_acquisition');
assert.equal(byId.get('M04D-FR-070').disposition, 'requires_additional_acquisition');
assert.equal(byId.get('M04D-FR-071').disposition, 'retained_candidate_only');

assert.equal(wave.triage_burndown.Fundrise_Erebor_Series_B_transaction, 'supported_for_human_review');
assert.equal(wave.triage_burndown.exclusive_currently_named_network_capital, 'bounded_non_link');
assert.equal(wave.triage_burndown.Fundrise_Erebor_specific_governance_rights, 'requires_additional_acquisition');
assert.equal(wave.triage_burndown.Silent_portfolio_transaction_vehicle_and_rights, 'requires_additional_acquisition');
assert.equal(wave.triage_burndown.Erebor_ecosystem_banking_traffic, 'requires_additional_acquisition');
assert.equal(wave.triage_burndown.system_wide_capital_banking_reproduction, 'retained_candidate_only');

assert.equal(wave.boundaries.promotes_to, 'candidate_only');
assert.equal(wave.boundaries.graph_effect, 'none');
assert.equal(wave.boundaries.conclusion_generated, false);
assert.equal(wave.boundaries.estate_completion_claimed, false);
assert.equal(wave.boundaries.security_ownership_proves_control, false);
assert.equal(wave.boundaries.co_portfolio_holding_proves_coordination, false);
assert.equal(wave.boundaries.post_opening_financing_proves_favoritism, false);
assert.equal(wave.boundaries.first_party_portfolio_claim_proves_transaction_rights, false);
assert.equal(wave.boundaries.capital_investment_proves_banking_traffic, false);

const supported = wave.records.filter((record) => record.disposition === 'supported_for_human_review').length;
const additional = wave.records.filter((record) => record.disposition === 'requires_additional_acquisition').length;
const nonLinks = wave.records.filter((record) => record.disposition === 'bounded_non_link').length;
const retained = wave.records.filter((record) => record.disposition === 'retained_candidate_only').length;
assert.equal(supported, 3);
assert.equal(additional, 3);
assert.equal(nonLinks, 1);
assert.equal(retained, 1);

const fundriseRecords = wave.records.filter((record) => record.sources.some((source) => source.url.includes('/edgar/data/1867090/')));
assert.equal(fundriseRecords.length, 5);

console.log('m04d-fog-resolution-wave-08.test: ok');
