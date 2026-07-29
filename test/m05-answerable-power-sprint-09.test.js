#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { computeReleaseManifest, releaseScope } from '../tools/build-m05-answerable-power-sprint-09.mjs';
import { loadSprint09Package, validateSprint09Package } from '../tools/validate-m05-answerable-power-sprint-09.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clone = (value) => structuredClone(value);
const documents = loadSprint09Package();
const expectedManifest = computeReleaseManifest();

assert.equal(releaseScope.length, 11);
assert.deepEqual(documents.manifest, expectedManifest);
assert.deepEqual(validateSprint09Package(documents, { expectedManifest }), []);
assert.equal(documents.plan.current_result.candidate_records, 26);
assert.equal(documents.candidateRegistry.records.length, 26);
assert.equal(documents.candidateRegistry.counts.jurisdictions, 3);
assert.equal(documents.fieldGate.field_sequence.length, 8);
assert.equal(documents.prospectus.eligible_shadow_modes.length, 4);
assert.equal(documents.prospectus.admission_predicates.length, 15);
assert.equal(documents.outreachLedger.entries.length, 0);
assert.equal(documents.outreachLedger.verified_state.maximum_verified_adoption_level, 'A0');
assert.equal(documents.outreachLedger.verified_state.real_person_pilot_authorized, false);

const negativeCases = [
  ['plan status drift', (d) => { d.plan.status = 'complete'; }],
  ['Sprint 08 dependency drift', (d) => { d.plan.dependencies.sprint_08_merge_commit = '0'.repeat(40); }],
  ['Question 4 issue drift', (d) => { d.plan.dependencies.question_4_issue = 999; }],
  ['stage removed', (d) => { d.fieldGate.field_sequence.pop(); }],
  ['stage duplicated', (d) => { d.fieldGate.field_sequence[1].stage_id = 'F0'; }],
  ['F0 not complete', (d) => { d.fieldGate.field_sequence[0].current_state = 'not_observed'; }],
  ['external effect claimed', (d) => { d.fieldGate.field_sequence[4].external_effect_observed = true; }],
  ['works denominator weakened', (d) => { d.fieldGate.works_standard.minimum_domains = 2; }],
  ['magic human permission gate', (d) => { d.fieldGate.magic_human_boundary.external_participation_required_for_internal_reasoning = true; }],
  ['candidate removed', (d) => { d.candidateRegistry.records.pop(); }],
  ['candidate duplicate', (d) => { d.candidateRegistry.records[1].candidate_id = d.candidateRegistry.records[0].candidate_id; }],
  ['candidate jurisdiction drift', (d) => { d.candidateRegistry.records[0].jurisdiction = 'US'; }],
  ['candidate promoted', (d) => { d.candidateRegistry.default_state.status = 'F4_prospectus_eligible'; }],
  ['candidate contacted', (d) => { d.candidateRegistry.default_state.contact_state = 'response_received'; }],
  ['candidate selected', (d) => { d.candidateRegistry.default_state.selected_for_field_topology = true; }],
  ['candidate adoption effect', (d) => { d.candidateRegistry.default_state.adoption_effect = 'A3'; }],
  ['candidate evidence removed', (d) => { d.candidateRegistry.records[0].evidence_uris = []; }],
  ['candidate gaps hidden', (d) => { d.candidateRegistry.records[0].material_gaps = ''; }],
  ['candidate count inflated', (d) => { d.candidateRegistry.counts.total_records = 27; }],
  ['shadow mode removed', (d) => { d.prospectus.eligible_shadow_modes.pop(); }],
  ['prohibited use removed', (d) => { d.prospectus.prohibited_uses.pop(); }],
  ['technical firewall weakened', (d) => { d.prospectus.technical_firewall_requirements.pop(); }],
  ['standing requirement removed', (d) => { d.prospectus.affected_party_standing_requirements.pop(); }],
  ['custody requirement removed', (d) => { d.prospectus.independent_custody_requirements.pop(); }],
  ['admission predicate removed', (d) => { d.prospectus.admission_predicates = d.prospectus.admission_predicates.filter((value) => value !== 'automatic_stop_authority'); }],
  ['outreach entry fabricated', (d) => { d.outreachLedger.entries.push({ candidate_id: 'F4-W01' }); }],
  ['contact count fabricated', (d) => { d.outreachLedger.counts.contacted = 1; }],
  ['A1 fabricated', (d) => { d.outreachLedger.verified_state.A1_registry_entries = 1; }],
  ['real-person pilot fabricated', (d) => { d.outreachLedger.verified_state.real_person_pilot_authorized = true; }],
  ['boundary promoted', (d) => { d.plan.boundaries.package_completion_proves_external_contact = true; }]
];

assert.equal(negativeCases.length, 30);
for (const [name, mutate] of negativeCases) {
  const altered = clone(documents);
  mutate(altered);
  const errors = validateSprint09Package(altered, { expectedManifest });
  assert.ok(errors.length > 0, `negative case passed: ${name}`);
}

const generatedPaths = [
  'data/project/m05-answerable-power-sprint-09-release-manifest.json',
  'reports/core-thesis/answerable-power/sprint-09.json',
  'reports/core-thesis/answerable-power/sprint-09.html'
];
const before = Object.fromEntries(generatedPaths.map((relativePath) => [relativePath, fs.readFileSync(path.join(root, relativePath))]));
execFileSync(process.execPath, ['tools/build-m05-answerable-power-sprint-09.mjs'], { cwd: root, stdio: 'pipe' });
for (const relativePath of generatedPaths) {
  const after = fs.readFileSync(path.join(root, relativePath));
  assert.deepEqual(after, before[relativePath], `${relativePath} is not deterministic`);
}

console.log('m05-answerable-power-sprint-09.test: OK (30 negative cases)');
