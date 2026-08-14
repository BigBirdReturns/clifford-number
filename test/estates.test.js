import assert from 'node:assert/strict';
import { buildEstates, COMPILED_ESTATE_REGISTRY_SCHEMA_VERSION } from '../tools/build-estates.mjs';
import { readJson } from '../tools/lib/ledger.mjs';

const first = buildEstates();
const second = buildEstates({ write: false });
assert.deepEqual(second, first, 'estate registry must compile deterministically');
assert.deepEqual(readJson('build/estates/index.json'), first, 'committed/generated estate index must match the compiler');

assert.equal(first.schema_version, COMPILED_ESTATE_REGISTRY_SCHEMA_VERSION);
assert.equal(first.graph_effect, 'none');
assert.equal(first.conclusion_generated, false);
assert.deepEqual(first.counts, {
  estates: 24,
  existing_estates: 4,
  next_estates: 10,
  frontier_estates: 10,
  mapped_cases: 4,
  mapped_tracks: 10,
  mapped_slices: 20,
  primary_case_claims: 336,
  primary_case_receipts: 181,
  slice_records: 793,
  completion_records: 169
});

const byId = new Map(first.estates.map(item => [item.estate_id, item]));
for (const id of ['dialog-estate', 'uk-defense-estate', 'us-defense-estate', 'local-development-estate']) {
  assert.equal(byId.get(id)?.generation, 'existing', `${id} must remain an existing estate`);
}
for (const id of [
  'transatlantic-defense-innovation-estate',
  'uk-state-market-estate',
  'us-executive-appointments-ethics-estate',
  'us-legislative-political-finance-estate',
  'state-municipal-authority-estate',
  'public-money-industrial-policy-estate',
  'regulatory-markets-estate',
  'venture-capital-corporate-control-estate',
  'offshore-beneficial-ownership-estate',
  'public-interest-crossing-estate'
]) assert.equal(byId.get(id)?.generation, 'next', `${id} must be in the next estate generation`);

for (const id of [
  'judicial-administrative-adjudication-estate',
  'professional-services-intermediaries-estate',
  'philanthropy-nonprofit-policy-estate',
  'higher-education-research-commercialization-estate',
  'ai-data-compute-infrastructure-estate',
  'energy-utilities-critical-infrastructure-estate',
  'sanctions-export-controls-foreign-investment-estate',
  'intellectual-property-standards-data-rights-estate',
  'labor-immigration-workforce-mobility-estate',
  'real-property-title-debt-estate'
]) assert.equal(byId.get(id)?.generation, 'frontier', `${id} must be in the frontier estate generation`);

assert.deepEqual(byId.get('dialog-estate').membership.primary_cases, ['uk-ai-policy']);
assert.deepEqual(new Set(byId.get('us-defense-estate').membership.primary_cases), new Set(['anduril-access-ownership', 'field-autopsy-03']));
assert.deepEqual(byId.get('local-development-estate').membership.primary_cases, ['arcadia-field-autopsy']);
assert.equal(byId.get('local-development-estate').custody_counts.primary_slices, 8);
assert.equal(byId.get('transatlantic-defense-innovation-estate').custody_counts.primary_slices, 2);
assert.equal(byId.get('us-executive-appointments-ethics-estate').custody_counts.primary_slices, 2);
assert.equal(byId.get('us-legislative-political-finance-estate').custody_counts.primary_slices, 2);
assert.equal(byId.get('state-municipal-authority-estate').custody_counts.primary_slices, 2);
assert.equal(byId.get('public-money-industrial-policy-estate').custody_counts.primary_slices, 2);
assert.equal(byId.get('regulatory-markets-estate').custody_counts.primary_slices, 2);

const estateIds = new Set(first.estates.map(item => item.estate_id));
for (const slice of first.crosswalks.slices) {
  assert.ok(estateIds.has(slice.primary_estate_id));
  assert.ok(!estateIds.has(slice.slice_id), `${slice.slice_id} must remain a slice, not a macro estate`);
}
assert.equal(first.crosswalks.slices.length, 20);
assert.equal(new Set(first.crosswalks.slices.map(item => item.slice_id)).size, 20);
assert.equal(new Set(first.crosswalks.cases.map(item => item.case_id)).size, 4);
assert.equal(new Set(first.crosswalks.tracks.map(item => item.track_id)).size, 10);

assert.match(first.definition, /durable domain corpus/i);
assert.match(first.legacy_translation.compatibility_rule, /estate slices/i);
assert.ok(first.boundaries.some(item => /not a single project, cohort, city, company, track, or report/i.test(item)));

const serialized = JSON.stringify(first);
assert.doesNotMatch(serialized, /"(?:guilt_score|corruption_score|motive_score|influence_score|risk_score|probability_score|ranking|rank|score|verdict|finding|claim_status|publication_approval)"\s*:/i);
for (const estate of first.estates) {
  assert.equal(estate.graph_effect, 'none');
  assert.equal(estate.conclusion_generated, false);
  assert.ok(estate.asset_refs.length > 0);
  assert.ok(estate.next_acquisition.source_routes.length > 0);
}

console.log('estates.test.js: OK');
