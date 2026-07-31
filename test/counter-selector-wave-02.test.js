#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCounterSelectorCandidates } from '../tools/build-counter-selector-wave-02.mjs';
import { collectArtifactReadinessErrors } from '../tools/validate-counter-selector-wave-02.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const clone = (value) => structuredClone(value);

const contract0 = read('data/project/counter-selector-wave-02-artifact-readiness.json');
const parentManifest0 = read('data/project/counter-selector-release-manifest.json');
const candidateRegistry0 = read('data/project/counter-selector-candidate-registry.json');
const candidates0 = loadCounterSelectorCandidates(candidateRegistry0);
const readiness0 = read('data/project/counter-selector-artifact-readiness-registry.json');
const queue0 = read('data/project/counter-selector-artifact-acquisition-queue.json');
const schema0 = read('schemas/counter-selector-artifact-readiness.schema.json');

function expectMutation(name, mutate, code) {
  const contract = clone(contract0);
  const parentManifest = clone(parentManifest0);
  const candidates = clone(candidates0);
  const readiness = clone(readiness0);
  const queue = clone(queue0);
  const schema = clone(schema0);
  mutate({ contract, parentManifest, candidates, readiness, queue, schema });
  const errors = collectArtifactReadinessErrors(
    contract,
    parentManifest,
    candidates,
    readiness,
    queue,
    schema
  );
  assert(
    errors.some((error) => error.startsWith(`${code}:`)),
    `${name}: expected ${code}; received ${errors.join(', ')}`
  );
}

const mutations = [
  ['parent release custody cannot drift', ({ contract }) => { contract.parent_release_sha256 = '0'.repeat(64); }, 'PARENT_DIGEST'],
  ['source route cannot become artifact', ({ contract }) => { contract.boundaries.source_route_is_artifact = true; }, 'CONTRACT_BOUNDARY'],
  ['missing artifact cannot become negative capability evidence', ({ contract }) => { contract.boundaries.missing_artifact_is_negative_capability_evidence = true; }, 'CONTRACT_BOUNDARY'],
  ['source candidate cannot be pre-scored', ({ candidates }) => { candidates[0].support_adjusted_surplus = 'bounded_observation'; }, 'SOURCE_PREMATURE'],
  ['source candidate cannot claim field result', ({ candidates }) => { candidates[0].field_result = 'observed'; }, 'SOURCE_PREMATURE'],
  ['source record cannot count twice', ({ candidates }) => { candidates[1].source_ids = [...candidates[0].source_ids]; }, 'SOURCE_RECORD_DUP'],
  ['readiness object cannot claim qualifying artifact', ({ readiness }) => { readiness.records[0].qualifying_artifact_present = true; }, 'ARTIFACT_PREMATURE'],
  ['readiness object cannot create blind packet', ({ readiness }) => { readiness.records[0].blind_packet_ready = true; }, 'ARTIFACT_PREMATURE'],
  ['class rule controls readiness disposition', ({ readiness }) => { readiness.records[0].artifact_readiness_state = 'artifact_ready_for_blind_packet'; }, 'READINESS_STATE'],
  ['artifact requirements cannot disappear', ({ readiness }) => { readiness.records[0].artifact_requirements = []; }, 'REQUIREMENTS'],
  ['public identity release remains forbidden', ({ readiness }) => { readiness.records[0].privacy.public_identity_release_authorized = true; }, 'PRIVACY'],
  ['graph effect remains none', ({ readiness }) => { readiness.records[0].graph_effect = 'actor_edge'; }, 'GRAPH_EFFECT'],
  ['matched control must exist', ({ readiness }) => { readiness.records[0].matched_control_id = 'CS-C9999'; }, 'MATCHED_CONTROL'],
  ['five batches must remain present', ({ queue }) => { queue.batches.pop(); }, 'BATCH_COUNT'],
  ['each batch remains class-balanced', ({ queue }) => { queue.batches[0].candidates[1].denominator_class = queue.batches[0].candidates[0].denominator_class; }, 'BATCH_CLASS'],
  ['each candidate enters one batch', ({ queue }) => { queue.batches[1].candidates[0].candidate_id = queue.batches[0].candidates[0].candidate_id; }, 'BATCH_COVERAGE'],
  ['queue cannot claim a field test', ({ queue }) => { queue.execution.field_tests_executed = 1; }, 'QUEUE_EXECUTION'],
  ['queue cannot authorize contact', ({ queue }) => { queue.boundaries.acquisition_queue_authorizes_contact = true; }, 'QUEUE_BOUNDARY'],
  ['schema cannot permit a graph effect', ({ schema }) => { delete schema.properties.graph_effect.const; }, 'SCHEMA_BOUNDARY'],
  ['schema cannot permit premature artifact readiness', ({ schema }) => { delete schema.properties.qualifying_artifact_present.const; }, 'SCHEMA_BOUNDARY']
];

for (const [name, mutate, code] of mutations) expectMutation(name, mutate, code);
const baseline = collectArtifactReadinessErrors(
  contract0,
  parentManifest0,
  candidates0,
  readiness0,
  queue0,
  schema0
);
assert.deepEqual(baseline, [], baseline.join('\n'));
console.log(`counter-selector-wave-02.test: PASS (${mutations.length} adversarial mutations)`);
