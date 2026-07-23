#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildEstateFrontierSurveys } from './build-estate-frontier-surveys.mjs';
import { readJson } from './lib/ledger.mjs';
const built = buildEstateFrontierSurveys({ write: false });
assert.deepEqual(readJson('build/estate-frontier/manifest.json'), built.manifest);
for (const descriptor of built.manifest.packets) assert.deepEqual(readJson(descriptor.path), built.packets.find(packet => packet.estate_id === descriptor.estate_id));
assert.equal(built.manifest.promotes_to, 'candidate_only');
assert.equal(built.manifest.graph_effect, 'none');
assert.equal(built.manifest.conclusion_generated, false);
console.log(`validate-estate-frontier-surveys: OK (${built.manifest.counts.estates} estates)`);
