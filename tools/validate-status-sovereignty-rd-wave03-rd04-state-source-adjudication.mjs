#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  ROOT,
  EXECUTION_RECEIPT_PATH,
  ROUTE_ADJUDICATIONS_PATH,
  STATE_OBSERVATIONS_PATH,
  LINK_CANDIDATES_PATH,
  FOLLOWUP_PROTOCOL_PATH,
  INDEX_PATH,
  PRODUCT_MANIFEST_PATH,
  SCHEMA_PATH,
  PERMANENT_PATHS,
  SUCCESSOR_TRIGGER_PATH,
  validateExecutionReceipt,
  validateAuthoredRows,
  deriveFollowupProtocol,
  deriveIndex,
  deriveProductManifest,
  validateFollowupRoute,
  classifyChangedPathSurface,
  validateSuccessorTriggerText,
} from './build-status-sovereignty-rd-wave03-rd04-state-source-adjudication.mjs';

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const ok = (value, message) => { if (!value) throw new Error(message); };
const stable = (value) => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const same = (left, right, message) => ok(stable(left) === stable(right), message);
const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

export const EXPECTED_AUTHORED_SHA256 = Object.freeze({
  [EXECUTION_RECEIPT_PATH]: 'b5236c145015616f0c88764e8c4a60d6a17b4b3062bc6c068f8f185eaac999fe',
  [ROUTE_ADJUDICATIONS_PATH]: '6297660a3119de8d2d3ae5e7c7d87d48eee7228f79f42c857c7eaa4dfa8e692e',
  [STATE_OBSERVATIONS_PATH]: '76872478c6f38ba0e3f447a75491b9ee4e8b07a6ae21b5b47904578222e1dc81',
  [LINK_CANDIDATES_PATH]: '11175ac28b0991c98e7c5fa3b01a27d7bd9b1b684047ac97a4a4cb3f49d3b8e0',
});

export function validateSchemaContract(schema) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.$id === 'https://clifford-number.local/schemas/status-sovereignty-rd-wave03-rd04-state-source-adjudication.schema.json', 'schema ID changed');
  ok(schema?.type === 'object' && schema?.additionalProperties === false, 'schema closure changed');
  ok(schema?.properties?.schema_version?.const === 'ssc-rd04-wave03-state-source-adjudication-index@2', 'schema version changed');
  ok(schema?.properties?.counts?.properties?.routes_adjudicated?.const === 54, 'schema route denominator changed');
  ok(schema?.properties?.counts?.properties?.state_landing_page_context_sources_admitted?.const === 36, 'schema admission denominator changed');
  ok(schema?.properties?.counts?.properties?.state_http_success_nonresponsive_or_script_only_surfaces?.const === 2, 'schema nonresponsive-success denominator changed');
  ok(schema?.properties?.counts?.properties?.responsive_link_candidates?.const === 329, 'schema candidate denominator changed');
  ok(schema?.properties?.counts?.properties?.selected_followup_routes?.const === 62, 'schema followup denominator changed');
  ok(schema?.properties?.counts?.properties?.deferred_out_of_class_candidates?.const === 17, 'schema deferred denominator changed');
  ok(schema?.properties?.counts?.properties?.terminal_field_cells_after?.const === 100, 'schema terminal-cell denominator changed');
  ok(schema?.properties?.counts?.properties?.still_open_field_cells?.const === 350, 'schema open-cell denominator changed');
  ok(schema?.properties?.current_result?.properties?.class_closed?.const === false, 'schema class closure changed');
  return true;
}

export function validateValue(root = ROOT) {
  for (const [rel, expected] of Object.entries(EXPECTED_AUTHORED_SHA256)) {
    ok(sha(fs.readFileSync(abs(root, rel))) === expected, `${rel}: authored extraction hash changed`);
  }
  validateExecutionReceipt(read(root, EXECUTION_RECEIPT_PATH));
  const { candidates, selected } = validateAuthoredRows(root);

  const protocol = read(root, FOLLOWUP_PROTOCOL_PATH);
  const derivedProtocol = deriveFollowupProtocol(candidates);
  same(protocol, derivedProtocol, 'followup protocol differs from deterministic derivation');
  ok(protocol.routes.length === 62, 'followup route denominator changed');
  protocol.routes.forEach((route, index) => validateFollowupRoute(route, index + 1, selected[index]));
  ok(protocol.denominator.states_represented === 30, 'followup state denominator changed');
  ok(protocol.denominator.deferred_out_of_class_candidates === 17, 'deferred candidate accounting changed');
  ok(protocol.boundaries.appeal_or_hearing_route_is_current_rd04_c02_field === false, 'appeal/hearing scope boundary changed');
  ok(protocol.boundaries.one_state_result_is_national_prevalence === false, 'prevalence boundary changed');

  same(read(root, INDEX_PATH), deriveIndex(root), 'index differs from deterministic derivation');
  same(read(root, PRODUCT_MANIFEST_PATH), deriveProductManifest(root), 'product manifest differs from deterministic derivation');
  validateSchemaContract(read(root, SCHEMA_PATH));
  return true;
}

function hasGitRepository(root) {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function validateRepository(root = ROOT) {
  validateValue(root);
  if (!hasGitRepository(root)) return true;

  for (const merge of [
    '3c181d6b27a0a3d8663a763c21f95fc4502aa0f3',
    '854d3fec35e57c0a0f0d06448146c99e5053dacf',
  ]) execFileSync('git', ['merge-base', '--is-ancestor', merge, 'HEAD'], { cwd: root, stdio: 'ignore' });

  let comparisonRef = 'origin/main';
  try { git(root, ['rev-parse', comparisonRef]); }
  catch { comparisonRef = '854d3fec35e57c0a0f0d06448146c99e5053dacf'; }
  const changed = git(root, ['diff', '--name-only', `${comparisonRef}...HEAD`]).split('\n').filter(Boolean);
  const surface = classifyChangedPathSurface(changed);
  if (surface === 'canonical_main') {
    ok(comparisonRef === 'origin/main', 'empty surface requires origin/main custody');
    ok(git(root, ['rev-parse', 'HEAD']) === git(root, ['rev-parse', 'origin/main']), 'canonical-main HEAD differs from origin/main');
  } else if (surface === 'permanent_product') {
    const statuses = git(root, ['diff', '--name-status', `${comparisonRef}...HEAD`]).split('\n').filter(Boolean);
    ok(statuses.length === PERMANENT_PATHS.length, 'permanent product path count changed');
    ok(statuses.every((line) => line.startsWith('A\t')), 'permanent product must be addition-only');
  } else if (surface === 'responsive_link_trigger') {
    ok(comparisonRef === 'origin/main', 'responsive-link trigger requires origin/main custody');
    for (const rel of PERMANENT_PATHS) {
      ok(git(root, ['rev-parse', `HEAD:${rel}`]) === git(root, ['rev-parse', `origin/main:${rel}`]), `${rel}: permanent product byte changed in trigger`);
    }
    validateSuccessorTriggerText(fs.readFileSync(abs(root, SUCCESSOR_TRIGGER_PATH), 'utf8'), root);
  }
  return true;
}

function run() {
  validateRepository(ROOT);
  console.log('RD-04 state-source adjudication validated: 54 terminal source dispositions, 36 responsive context admissions, 2 HTTP-success content gaps, 329 candidates preserved, 17 appeal/hearing candidates deferred, 62 current-class followups, matrix still 100/450 terminal');
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) run();
