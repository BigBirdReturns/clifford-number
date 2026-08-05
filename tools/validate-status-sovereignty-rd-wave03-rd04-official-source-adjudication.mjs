#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  ROOT, DATA_DIR, REPLAY_RECEIPT_PATH, FEDERAL_CONTEXT_PATH, STATE_SOURCES_PATH,
  INDEX_PATH, MATRIX_PATH, NEXT_PROTOCOL_PATH, PRODUCT_MANIFEST_PATH, SCHEMA_PATH,
  PRODUCT_PATHS, SUCCESSOR_TRIGGER_PATH, FIELD_ORDER,
  validateStateSource, validateFederalSource, validateMatrixCell, validateNextRoute,
  derivePartialFieldMatrix, deriveNextSourceProtocol, deriveSourceAdjudicationIndex,
  deriveProductManifest, classifyChangedPathSurface, validateSuccessorTriggerText
} from './build-status-sovereignty-rd-wave03-rd04-official-source-adjudication.mjs';

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const readJsonl = (root, rel) => fs.readFileSync(abs(root, rel), 'utf8').trimEnd().split('\n').filter(Boolean).map((line) => JSON.parse(line));
const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const ok = (value, message) => { if (!value) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);
const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

export const EXPECTED_SOURCE_FILE_SHA256 = Object.freeze({
  [REPLAY_RECEIPT_PATH]: 'acdbc2b5e34c4dfc17aa10081425f31c3a8ff5eee0b731f389454870b58fbca2',
  [FEDERAL_CONTEXT_PATH]: 'cf17a8ae6269f91c89ed9074f81dc9dbed59efab58a1cfcc63cf1353b499515d',
  [STATE_SOURCES_PATH]: 'f64f5cdce5150a2a9056c2c40fc5a167bf5509fb5cfd142572cfb73b5fe54bb6'
});

export function validateSchemaContract(schema) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.$id === 'https://clifford-number.local/schemas/status-sovereignty-rd-wave03-rd04-official-source-adjudication.schema.json', 'schema ID changed');
  ok(schema?.type === 'object' && schema?.additionalProperties === false, 'schema closure changed');
  ok(schema?.properties?.schema_version?.const === 'ssc-rd04-wave03-official-source-adjudication-index@1', 'schema version changed');
  ok(schema?.properties?.counts?.properties?.scoped_source_decisions?.const === 54, 'schema source denominator changed');
  ok(schema?.properties?.counts?.properties?.terminal_field_cells?.const === 100, 'schema terminal-cell denominator changed');
  ok(schema?.properties?.counts?.properties?.still_open_field_cells?.const === 350, 'schema open-cell denominator changed');
  ok(schema?.properties?.counts?.properties?.next_fixed_routes?.const === 54, 'schema successor-route denominator changed');
  ok(schema?.properties?.current_result?.properties?.state_implementation_universe_complete?.const === false, 'schema implementation-universe boundary changed');
  ok(schema?.properties?.current_result?.properties?.class_closed?.const === false, 'schema class closure changed');
  return true;
}

export function validateReplayReceipt(receipt) {
  ok(receipt.schema_version === 'ssc-rd04-wave03-official-source-adjudication-replay-receipt@1', 'replay receipt schema changed');
  ok(receipt.canonical_candidate_adjudication_merge === '3c181d6b27a0a3d8663a763c21f95fc4502aa0f3', 'canonical candidate-adjudication merge changed');
  ok(receipt.trigger_pr === 1144 && receipt.workflow_run === 30982958542 && receipt.artifact_id === 8920892364, 'replay execution identity changed');
  ok(receipt.artifact_bytes === 825959, 'replay artifact byte count changed');
  ok(receipt.artifact_zip_sha256 === 'c0c7ffe98f37547580948e6b394eb518ce2e6e98b2c2de3fb1ee80c5656c31f8', 'replay artifact ZIP hash changed');
  same(receipt.counts, {
    fixed_routes: 54, terminal_routes: 54, http_200_routes: 54,
    federal_context_routes: 4, state_directory_routes: 50,
    unique_response_body_hashes: 54, result_spawned_requests: 0
  }, 'replay receipt counts changed');
  same(receipt.authority, {
    automatic_source_admission: false, automatic_field_classification: false,
    automatic_class_closure: false, outside_human_dependency: false,
    publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none'
  }, 'replay receipt authority changed');
  return true;
}

export function validateValue(root = ROOT) {
  for (const [rel, expected] of Object.entries(EXPECTED_SOURCE_FILE_SHA256)) {
    ok(sha(fs.readFileSync(abs(root, rel))) === expected, `${rel}: authored source file hash changed`);
  }
  const receipt = read(root, REPLAY_RECEIPT_PATH);
  validateReplayReceipt(receipt);

  const federalBundle = read(root, FEDERAL_CONTEXT_PATH);
  ok(federalBundle.schema_version === 'ssc-rd04-wave03-federal-context-source-adjudication@1', 'federal context schema changed');
  ok(Array.isArray(federalBundle.sources) && federalBundle.sources.length === 4, 'federal source denominator changed');
  federalBundle.sources.forEach((row, index) => validateFederalSource(row, index + 1));

  const stateSources = readJsonl(root, STATE_SOURCES_PATH);
  ok(stateSources.length === 50, 'state locator denominator changed');
  stateSources.forEach((row, index) => validateStateSource(row, index + 1));
  ok(new Set(stateSources.map((row) => row.unit_id)).size === 50, 'state unit identities are not unique');
  ok(new Set(stateSources.map((row) => row.body_sha256)).size === 50, 'state response bodies are not unique');
  ok(new Set(stateSources.map((row) => row.state_snap_website_host)).size === 50, 'state SNAP hosts are not unique');

  const matrix = read(root, MATRIX_PATH);
  const derivedMatrix = derivePartialFieldMatrix(stateSources);
  same(matrix, derivedMatrix, 'partial field matrix differs from deterministic derivation');
  ok(matrix.rows.length === 50 && matrix.counts.materialized_cells === 450, 'partial matrix denominator changed');
  ok(matrix.counts.terminal_cells === 100 && matrix.counts.still_open_cells === 350, 'partial matrix terminal accounting changed');
  for (let rowIndex = 0; rowIndex < matrix.rows.length; rowIndex += 1) {
    const row = matrix.rows[rowIndex];
    const source = stateSources[rowIndex];
    ok(row.row_state === 'still_open' && row.terminal_fields === 2 && row.open_fields === 7, `${source.postal_code}: row state changed`);
    row.cells.forEach((cell, fieldIndex) => validateMatrixCell(cell, source, FIELD_ORDER[fieldIndex], fieldIndex + 1));
  }

  const protocol = read(root, NEXT_PROTOCOL_PATH);
  const derivedProtocol = deriveNextSourceProtocol(federalBundle.sources, stateSources);
  same(protocol, derivedProtocol, 'next source protocol differs from deterministic derivation');
  ok(protocol.routes.length === 54, 'next source route denominator changed');
  protocol.routes.forEach((route, index) => validateNextRoute(route, index + 1));
  ok(new Set(protocol.routes.map((route) => route.route_id)).size === 54, 'next route IDs are not unique');
  ok(new Set(protocol.routes.map((route) => route.requested_url)).size === 54, 'next route URLs are not unique');

  const index = read(root, INDEX_PATH);
  const derivedIndex = deriveSourceAdjudicationIndex(root, federalBundle.sources, stateSources, derivedMatrix, derivedProtocol);
  same(index, derivedIndex, 'source-adjudication index differs from deterministic derivation');
  ok(index.counts.scoped_sources_admitted === 54 && index.counts.state_implementation_sources_admitted === 0, 'scoped admission boundary changed');
  ok(index.current_result.class_state === 'still_open' && index.current_result.class_closed === false, 'class state changed');

  const manifest = read(root, PRODUCT_MANIFEST_PATH);
  same(manifest, deriveProductManifest(root), 'product manifest differs from deterministic derivation');
  validateSchemaContract(read(root, SCHEMA_PATH));
  return true;
}

export function validateRepository(root = ROOT) {
  validateValue(root);
  for (const merge of [
    'b9d09c28bcaa0b00c699ff40e893df7b9675ff0f',
    '7f960c30b6c58c70e3a996d4239e363e50d848ef',
    '3c181d6b27a0a3d8663a763c21f95fc4502aa0f3'
  ]) execFileSync('git', ['merge-base', '--is-ancestor', merge, 'HEAD'], { cwd: root, stdio: 'ignore' });

  let comparisonRef = 'origin/main';
  try { git(root, ['rev-parse', comparisonRef]); }
  catch { comparisonRef = '3c181d6b27a0a3d8663a763c21f95fc4502aa0f3'; }
  const changed = git(root, ['diff', '--name-only', `${comparisonRef}...HEAD`]).split('\n').filter(Boolean);
  const surface = classifyChangedPathSurface(changed);
  if (surface === 'canonical_main') {
    ok(comparisonRef === 'origin/main', 'empty surface requires origin/main custody');
    ok(git(root, ['rev-parse', 'HEAD']) === git(root, ['rev-parse', 'origin/main']), 'canonical-main HEAD differs from origin/main');
  } else if (surface === 'permanent_product') {
    const statuses = git(root, ['diff', '--name-status', `${comparisonRef}...HEAD`]).split('\n').filter(Boolean);
    ok(statuses.length === PRODUCT_PATHS.length, 'permanent product path count changed');
    ok(statuses.every((line) => line.startsWith('A\t')), 'permanent product must be addition-only');
  } else if (surface === 'state_source_trigger') {
    ok(comparisonRef === 'origin/main', 'state-source trigger requires origin/main custody');
    for (const rel of PRODUCT_PATHS) {
      ok(git(root, ['rev-parse', `HEAD:${rel}`]) === git(root, ['rev-parse', `origin/main:${rel}`]), `${rel}: product byte changed in state-source trigger`);
    }
    validateSuccessorTriggerText(fs.readFileSync(abs(root, SUCCESSOR_TRIGGER_PATH), 'utf8'), root);
  }
  return true;
}

function run() {
  validateRepository(ROOT);
  console.log('RD-04 official source adjudication validated: 54 scoped source decisions, 100/450 terminal cells, 54 fixed successor routes, class still open');
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) run();
