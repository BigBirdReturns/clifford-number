import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadDocuments,
  validateDocuments
} from '../tools/validate-allocator-war-waterline.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectFailure(name, mutate) {
  const documents = clone(loadDocuments(root));
  mutate(documents);
  let failed = false;
  try {
    validateDocuments(documents, { rootDir: root, verifyManifest: false });
  } catch {
    failed = true;
  }
  if (!failed) throw new Error(`${name}: mutation was accepted`);
}

const baseline = validateDocuments(loadDocuments(root), { rootDir: root, verifyManifest: true });
if (baseline.observations !== 14) throw new Error('baseline observation count drifted');

const mutations = [
  ['duplicate observation assignment', (docs) => {
    docs.findings.finding_classes[1].observation_ids.push('SSC-OBS-0001');
  }],
  ['missing observation assignment', (docs) => {
    docs.findings.finding_classes[0].observation_ids =
      docs.findings.finding_classes[0].observation_ids.filter((id) => id !== 'SSC-OBS-0001');
  }],
  ['graph effect inflation', (docs) => {
    docs.routing.graph_effect = 'candidate';
  }],
  ['racial-order inflation', (docs) => {
    docs.findings.counts.racial_order_findings = 1;
  }],
  ['unknown estate route', (docs) => {
    docs.routing.consumer_routes[0].consumer_key = 'invented-estate';
  }],
  ['unknown observation route', (docs) => {
    docs.routing.consumer_routes[0].source_observation_ids.push('SSC-OBS-9999');
  }],
  ['silent acquisition closure', (docs) => {
    docs.acquisition.counts.closed = 1;
  }],
  ['route count drift', (docs) => {
    docs.routing.counts.consumer_routes = 13;
  }],
  ['second-party self-award', (docs) => {
    docs.review.counts.second_party_reviewed = 14;
  }],
  ['finding disposition rewrite', (docs) => {
    docs.wave.observations.find((row) => row.observation_id === 'SSC-OBS-0012').disposition =
      'partial_functional_convergence';
  }]
];

for (const [name, mutate] of mutations) expectFailure(name, mutate);

console.log(JSON.stringify({
  baseline,
  adversarial_mutations: mutations.length,
  result: 'pass'
}, null, 2));
