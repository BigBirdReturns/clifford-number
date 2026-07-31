#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReleaseManifest } from './build-counter-selector.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');

export function validateCounterSelector() {
  const program = read('data/project/counter-selector-program.json');
  const wave = read('data/project/counter-selector-wave-00.json');
  const schema = read('schemas/counter-selector-candidate.schema.json');
  const manifest = read('data/project/counter-selector-release-manifest.json');
  const report = read('reports/core-thesis/counter-selector/data.json');
  const html = readText('reports/core-thesis/counter-selector/index.html');

  assert.equal(program.schema_version, 'counter-selector-program@1');
  assert.equal(program.program_id, 'CS-P01');
  assert.equal(program.authority_tier, 'AT-2');
  assert.equal(program.base_state.parent_field_hypothesis, 'DCA-H01');
  assert.equal(program.base_state.adjacent_hypothesis, 'SSC-H01');
  assert.equal(program.operational_residues.length, 8);
  assert.equal(new Set(program.operational_residues.map((row) => row.residue_id)).size, 8);
  assert.equal(program.review_stages.length, 8);
  assert.equal(program.evidence_vector.length, 10);
  assert.equal(program.false_positive_controls.length, 8);
  assert.equal(program.positive_controls.length, 6);
  assert.equal(program.falsifiers.length, 10);
  assert.equal(program.scoring_contract.aggregate_score_generated, false);
  assert.equal(program.scoring_contract.rank_order_generated, false);
  assert.equal(program.scoring_contract.universal_intelligence_inference, false);
  assert.equal(program.privacy_and_fairness.protected_characteristics_used_for_scoring, false);
  assert.equal(program.privacy_and_fairness.ai_use_used_as_positive_or_negative_signal, false);
  assert.equal(program.privacy_and_fairness.public_person_ranking_authorized, false);
  assert.equal(program.current_state.candidate_records, 0);
  assert.equal(program.current_state.person_ranking_generated, false);
  assert.equal(program.current_state.graph_effect, 'none');
  assert.equal(program.current_state.publication_status, 'staged_nonpublic');
  assert.equal(program.boundaries.low_status_proves_hidden_capability, false);
  assert.equal(program.boundaries.rejection_proves_selector_bias, false);
  assert.equal(program.boundaries.program_becomes_new_recognition_monopoly, false);
  assert.equal(program.boundaries.graph_effect, 'none');

  assert.equal(wave.schema_version, 'counter-selector-wave@1');
  assert.equal(wave.wave_id, 'CS-W00');
  assert.equal(wave.search_lanes.length, 10);
  assert.equal(new Set(wave.search_lanes.map((row) => row.lane_id)).size, 10);
  assert.equal(wave.candidate_records.length, 0);
  assert.equal(wave.execution.started, false);
  assert.equal(wave.execution.lanes_executed, 0);
  assert.equal(wave.comparison_design.blind_first_review, true);
  assert.equal(wave.comparison_design.aggregate_rank_forbidden, true);
  assert.equal(wave.boundaries.search_lane_is_candidate, false);
  assert.equal(wave.boundaries.selection_is_universal_merit_finding, false);
  assert.equal(wave.boundaries.graph_effect, 'none');

  assert.equal(schema.properties.program_id.const, 'CS-P01');
  assert.equal(schema.properties.graph_effect.const, 'none');
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.operational_residues.minItems, 8);
  assert.equal(schema.properties.operational_residues.maxItems, 8);
  assert.equal(schema.properties.evidence_vector.minProperties, 10);

  const recomputed = computeReleaseManifest();
  assert.deepEqual(manifest, recomputed);
  assert.equal(report.release_manifest.combined_sha256, manifest.combined_sha256);
  assert.equal(report.counts.operational_residues, 8);
  assert.equal(report.counts.review_stages, 8);
  assert.equal(report.counts.search_lanes, 10);
  assert.equal(report.counts.candidate_records, 0);
  assert(html.includes('ZERO CANDIDATE RECORDS · NO PERSON RANKING · GRAPH EFFECT NONE'));
  assert(html.includes(manifest.combined_sha256));
  assert.equal(manifest.combined_sha256.length, 64);
  assert.equal(sha(JSON.stringify(report.current_state)), sha(JSON.stringify(program.current_state)));

  console.log('validate-counter-selector: PASS');
  return true;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) validateCounterSelector();
