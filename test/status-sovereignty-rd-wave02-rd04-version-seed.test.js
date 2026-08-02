#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  INPUT_PATH,
  validateSeedData
} from '../tools/acquisition/status-sovereignty-rd-wave02-rd04/validate-version-seed.mjs';

const base = JSON.parse(fs.readFileSync(path.join(ROOT, INPUT_PATH), 'utf8'));
const clone = () => structuredClone(base);
const fail = (message) => { throw new Error(message); };
const expectFailure = (name, mutate, pattern) => {
  const value = clone();
  mutate(value);
  try {
    validateSeedData(value);
    fail(`${name}: mutation unexpectedly passed`);
  } catch (error) {
    if (!pattern.test(error.message)) fail(`${name}: unexpected error ${error.message}`);
  }
};

validateSeedData(base);

const cases = [
  ['lane identity', (v) => { v.class_id = 'RD-04-C02'; }, /lane identity/],
  ['issue cutoff', (v) => { v.issue = 790; }, /issue or cutoff/],
  ['constitution parent', (v) => { v.parent.wave_constitution_merge = '0'.repeat(40); }, /constitution merge/],
  ['frozen base', (v) => { v.parent.frozen_execution_base = '0'.repeat(40); }, /frozen base/],
  ['A09 state', (v) => { v.parent.a09_terminal_state = 'changed'; }, /A09 result/],
  ['direct source path', (v) => { v.direct_california_source.body_path = '/tmp/body'; }, /body path/],
  ['direct source digest', (v) => { v.direct_california_source.body_sha256 = '0'.repeat(64); }, /digest/],
  ['direct denominator', (v) => { v.direct_california_source.expected_direct_instruments = 8; }, /denominator/],
  ['attempt ceiling', (v) => { v.capture_contract.maximum_attempts_per_source = 99; }, /attempt ceiling/],
  ['timeout contract', (v) => { v.capture_contract.total_timeout_seconds = 0; }, /timeout contract/],
  ['outcome retry', (v) => { v.capture_contract.outcome_selected_retry = true; }, /outcome-selected retry/],
  ['source authority', (v) => { v.capture_contract.failed_source_is_noncompliance = true; }, /authority escalated/],
  ['missing source', (v) => { v.sources.pop(); }, /fourteen seed sources/],
  ['source reorder', (v) => { [v.sources[0], v.sources[1]] = [v.sources[1], v.sources[0]]; }, /identity or order/],
  ['duplicate ID', (v) => { v.sources[1].source_id = v.sources[0].source_id; }, /source identity or order|duplicate source/],
  ['duplicate URL', (v) => { v.sources[1].url = v.sources[0].url; }, /duplicate source URL/],
  ['non-HTTPS', (v) => { v.sources[0].url = 'http://example.test'; }, /non-HTTPS/],
  ['content class', (v) => { v.sources[0].expected_content_class = 'unknown'; }, /content class/],
  ['source accounting', (v) => { v.counts.seed_sources = 15; }, /seed accounting/],
  ['invented receipt', (v) => { v.counts.exact_source_receipts = 1; }, /exact_source_receipts/],
  ['invented version edge', (v) => { v.counts.version_edges_adjudicated = 1; }, /version_edges_adjudicated/],
  ['premature universe', (v) => { v.current_result.candidate_universe_complete = true; }, /prematurely completed/],
  ['premature closure', (v) => { v.current_result.class_closed = true; }, /prematurely closed/],
  ['human dependency', (v) => { v.current_result.outside_human_dependency = true; }, /human or project dependency/],
  ['graph effect', (v) => { v.current_result.graph_effect = 'added'; }, /effect authority/],
  ['boundary weakening', (v) => { v.boundaries.failed_fetch_is_noncompliance = true; }, /failed_fetch_is_noncompliance/]
];

for (const [name, mutate, pattern] of cases) expectFailure(name, mutate, pattern);
console.log(`status-sovereignty-rd-wave02-rd04-version-seed.test: positive plus ${cases.length} adversarial mutations passed`);
