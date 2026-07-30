import assert from 'node:assert/strict';
import { buildCoreThesis } from '../tools/build-core-thesis.mjs';

const data = buildCoreThesis({ write: false });
const { thesis, alignment, manifest } = data;

assert.equal(thesis.schema_version, 'clifford-core-thesis@1');
assert.equal(thesis.status, 'working_thesis');
assert.equal(thesis.graph_effect, 'none');
assert.equal(thesis.conclusion_generated, false);
assert.equal(thesis.machine_synthesis_ceiling, 'eligible_for_human_synthesis');

assert.equal(thesis.historical_phases.length, 5);
assert.equal(thesis.conversion_stages.length, 7);
assert.equal(thesis.intentionality_levels.length, 6);
assert.equal(thesis.archetypes.length, 10);
assert.equal(thesis.report_contracts.length, 9);
assert.equal(thesis.visualization_contracts.length, 7);
assert.equal(thesis.field_hypothesis_bridges.length, 2);
assert.deepEqual(thesis.field_hypothesis_bridges.map((row) => row.hypothesis_id), ['DCA-H01', 'SSC-H01']);
assert(thesis.field_hypothesis_bridges.every((row) => row.graph_effect === 'none'));
assert.equal(alignment.estates.length, 24);

assert.deepEqual(manifest.counts, {
  phases: 5,
  conversion_stages: 7,
  intentionality_levels: 6,
  archetypes: 10,
  report_contracts: 9,
  visualization_contracts: 7,
  field_hypothesis_bridges: 2,
  estates: 24
});
assert.equal(manifest.graph_effect, 'none');
assert.equal(manifest.conclusion_generated, false);
assert.match(manifest.fingerprint, /^[a-f0-9]{20}$/);

const estateIds = new Set(alignment.estates.map((row) => row.estate_id));
for (const required of [
  'dialog-estate',
  'uk-defense-estate',
  'us-defense-estate',
  'local-development-estate',
  'venture-capital-corporate-control-estate',
  'ai-data-compute-infrastructure-estate',
  'intellectual-property-standards-data-rights-estate',
  'judicial-administrative-adjudication-estate'
]) {
  assert(estateIds.has(required), `missing estate alignment: ${required}`);
}

for (const row of alignment.estates) {
  assert(row.phase_ids.length > 0, `${row.estate_id}: no phases`);
  assert(row.primary_conversion_stages.length > 0, `${row.estate_id}: no conversion stages`);
  assert(row.archetype_ids.length > 0, `${row.estate_id}: no archetypes`);
  assert(row.priority_questions.length > 0, `${row.estate_id}: no priority questions`);
  assert(row.decisive_record_families.length > 0, `${row.estate_id}: no decisive records`);
  assert(row.report_type_ids.length > 0, `${row.estate_id}: no reports`);
  assert(row.falsification_question, `${row.estate_id}: no falsification question`);
}

assert(thesis.falsifiers.length >= 5);
assert(thesis.alternative_explanations.length >= 5);
assert(thesis.forbidden_inferences.length >= 8);
assert.match(thesis.interpretation_contract.copy_ready_caveat, /research program, not a verdict/i);

console.log('core thesis contract passed');
