#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReleaseManifest } from './build-dca-h01.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');

export function validateDca() {
  const hypothesis = read('data/project/dca-h01-field-hypothesis.json');
  const crosswalk = read('data/project/dca-h01-crosswalk.json');
  const denominator = read('data/project/dca-h01-role-neutral-denominator.json');
  const schema = read('schemas/dca-field-record.schema.json');
  const manifest = read('data/project/dca-h01-release-manifest.json');
  const report = read('reports/core-thesis/distributed-counterpower-aversion/data.json');
  const html = readText('reports/core-thesis/distributed-counterpower-aversion/index.html');

  assert.equal(hypothesis.schema_version, 'dca-field-hypothesis@1');
  assert.equal(hypothesis.hypothesis_id, 'DCA-H01');
  assert.equal(hypothesis.authority_tier, 'AT-2');
  assert.equal(hypothesis.base_checkpoint.merge_commit, 'c810cc741b23062b7eb3d026a46404e138e93eda');
  assert.equal(hypothesis.mechanisms.length, 5);
  assert.equal(new Set(hypothesis.mechanisms.map((row) => row.mechanism_id)).size, 5);
  assert.equal(hypothesis.controls.length, 12);
  assert.equal(hypothesis.falsifiers.length, 10);
  assert.equal(hypothesis.current_state.canonical_field_hypothesis_object, true);
  assert.equal(hypothesis.current_state.prevalence_denominator_executed, false);
  assert.equal(hypothesis.current_state.prevalence_finding_generated, false);
  assert.equal(hypothesis.current_state.coordination_finding_generated, false);
  assert.equal(hypothesis.current_state.common_purpose_finding_generated, false);
  assert.equal(hypothesis.current_state.graph_effect, 'none');
  assert.equal(hypothesis.boundaries.same_mechanism_proves_communication, false);
  assert.equal(hypothesis.boundaries.field_hypothesis_creates_actor_edge, false);
  assert.equal(hypothesis.boundaries.field_hypothesis_advances_adoption, false);
  assert.equal(hypothesis.boundaries.graph_effect, 'none');

  assert.equal(crosswalk.layers.length, 12);
  assert.deepEqual(crosswalk.layers.map((row) => row.order), [...Array(12).keys()]);
  assert.equal(crosswalk.layers.at(-1).layer_id, 'DCA-H01');
  assert.equal(crosswalk.layers.find((row) => row.layer_id === 'POOF').status, 'branch_projection_not_main');
  assert.equal(crosswalk.boundaries.graph_effect, 'none');

  assert.equal(denominator.strata.length, 12);
  assert.equal(denominator.frozen_query_templates.length, 12);
  assert.equal(new Set(denominator.frozen_query_templates.map((row) => row.query_id)).size, 12);
  assert.equal(denominator.records.length, 0);
  assert.equal(denominator.execution.started, false);
  assert.equal(denominator.execution.query_templates_executed, 0);
  assert.equal(denominator.boundaries.fixtures_are_denominator, false);
  assert.equal(denominator.boundaries.query_hit_is_recurrence, false);
  assert.equal(denominator.boundaries.graph_effect, 'none');

  assert.equal(schema.properties.hypothesis_id.const, 'DCA-H01');
  assert.equal(schema.properties.graph_effect.const, 'none');
  assert.equal(schema.additionalProperties, false);
  for (const field of hypothesis.field_record_required_fields) assert(schema.required.includes(field), `schema missing required field ${field}`);

  const recomputed = computeReleaseManifest();
  assert.deepEqual(manifest, recomputed);
  assert.equal(report.release_manifest.combined_sha256, manifest.combined_sha256);
  assert.equal(report.counts.mechanisms, 5);
  assert.equal(report.counts.denominator_strata, 12);
  assert.equal(report.counts.query_templates, 12);
  assert.equal(report.counts.execution_records, 0);
  assert(html.includes('DCA-H01 · NO PREVALENCE FINDING · GRAPH EFFECT NONE'));
  assert(html.includes(manifest.combined_sha256));
  assert.equal(manifest.combined_sha256.length, 64);
  assert.equal(sha(JSON.stringify(report.current_state)), sha(JSON.stringify(hypothesis.current_state)));

  console.log('validate-dca-h01: PASS');
  return true;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) validateDca();
