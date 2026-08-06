#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, PATHS } from '../tools/build-status-sovereignty-rd-wave03-rd05-member-participation.mjs';
import { validateRD05 } from '../tools/validate-status-sovereignty-rd-wave03-rd05-member-participation.mjs';

const relevant = [
  'data/intake/status-sovereignty-rd-wave03-rd05-member-participation',
  'data/research/status-sovereignty-rd-wave03-rd05-member-participation',
  'data/project/ssc-residual-wave03/closures/RD-05-C02.json',
  'schemas/status-sovereignty-rd-wave03-rd05-member-participation.schema.json',
];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rd05-terminal-test-'));
for (const rel of relevant) fs.cpSync(path.join(ROOT, rel), path.join(temp, rel), { recursive: true });
let mutations = 0;
function expectFailure(rel, mutator) {
  const target = path.join(temp, rel);
  const original = fs.readFileSync(target, 'utf8');
  mutator(target, original);
  assert.throws(() => validateRD05(temp, { deterministic: false }));
  fs.writeFileSync(target, original);
  mutations += 1;
}
function mutateJson(rel, mutator) { expectFailure(rel, (target, original) => { const value = JSON.parse(original); mutator(value); fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`); }); }

assert.deepEqual(validateRD05(), { members: 17, terminal_fields: 170, observed_fields: 71, not_publicly_recovered_fields: 99, candidate_rows: 1351, official_body_observations: 25, class_closed: true });
const matrixRel = PATHS.matrix;
const matrix = JSON.parse(fs.readFileSync(path.join(temp, matrixRel), 'utf8'));
for (let memberIndex = 0; memberIndex < matrix.members.length; memberIndex += 1) {
  for (const fieldName of Object.keys(matrix.members[memberIndex].fields)) {
    mutateJson(matrixRel, value => { const field = value.members[memberIndex].fields[fieldName]; field.state = field.state === 'observed' ? 'not_publicly_recovered' : 'observed'; });
  }
}
for (const [rel, mutate] of [
  [PATHS.summary, value => { value.counts.observed_fields = 72; }],
  [PATHS.summary, value => { value.class_closed = false; }],
  [PATHS.classReceipt, value => { value.unresolved_limit.missing_records_are_not_event_absence = false; }],
  [PATHS.classReceipt, value => { value.authority.outside_human_dependency = true; }],
  [PATHS.closure, value => { value.residual_atlas_effect_if_promoted.open_after = 31; }],
  [PATHS.closure, value => { value.terminal_state = 'complete_participation_history'; }],
  [PATHS.sourceReceipt, value => { value.candidate_rows = 1350; }],
  [PATHS.sourceReceipt, value => { value.artifact_zip_sha256 = '0'.repeat(64); }],
  [PATHS.candidateIndex, value => { value.counts.selected_candidate_followups = 1; }],
  [PATHS.officialProtocol, value => { value.network_requests_authorized = 1; }],
  [PATHS.sourceManifest, value => { value.graph_effect = 'edge'; }],
]) mutateJson(rel, mutate);

const firstPart = JSON.parse(fs.readFileSync(path.join(temp, `${PATHS.candidateDir}/part-00.jsonl`), 'utf8').split('\n')[0]);
expectFailure(`${PATHS.candidateDir}/part-00.jsonl`, (target, original) => {
  const lines = original.split('\n'); const row = JSON.parse(lines[0]); row.selected_for_followup = true; lines[0] = JSON.stringify(row); fs.writeFileSync(target, lines.join('\n'));
});
expectFailure(PATHS.officialObservations, (target, original) => {
  const lines = original.split('\n'); const row = JSON.parse(lines[0]); row.body_sha256 = '0'.repeat(64); lines[0] = JSON.stringify(row); fs.writeFileSync(target, lines.join('\n'));
});
assert.equal(mutations, 183);
console.log(`RD-05 terminal adversarial mutations refused: ${mutations}`);
