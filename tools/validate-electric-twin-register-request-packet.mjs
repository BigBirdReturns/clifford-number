#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACQUISITION_ID,
  EXAMPLE_INPUT_PATH,
  PACKET_ROOT,
  PRIVATE_INPUT_SCHEMA,
  REQUIRED_TEMPLATE_HEADINGS,
  REQUIRED_TEMPLATE_TOKENS,
  TEMPLATE_PATH,
  validatePrivateInput,
} from './lib/electric-twin-register-request-core.mjs';

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readUtf8(filePath));
}

function parseJsonl(filePath) {
  return readUtf8(filePath).split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
}

function assertNoNetworkSurface(filePath, allowedImports) {
  const source = readUtf8(filePath);
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/gu)].map((match) => match[1]);
  assert.ok(imports.length > 0, `${filePath} must declare imports explicitly`);
  assert.ok(imports.every((specifier) => allowedImports.has(specifier)), `${filePath} imports an unapproved module`);
  assert.equal(/\bimport\s*\(/u.test(source), false, `${filePath} must not use dynamic import`);
  const forbiddenGlobalFetch = ['globalThis', '.fetch', '('].join('');
  const forbiddenEnvironmentRead = ['process', '.env'].join('');
  assert.equal(source.includes(forbiddenGlobalFetch), false, `${filePath} must not call global fetch`);
  assert.equal(source.includes(forbiddenEnvironmentRead), false, `${filePath} must not read requester data from environment variables`);
}

export function validateTrackedElectricTwinRequestPacket() {
  const request = readJson(`${PACKET_ROOT}/request.json`);
  const custody = readJson(`${PACKET_ROOT}/custody-manifest.json`);
  const adjudication = readJson(`${PACKET_ROOT}/adjudication-rules.json`);
  const example = readJson(EXAMPLE_INPUT_PATH);
  const ledger = parseJsonl(`${PACKET_ROOT}/response-ledger.jsonl`);
  const template = readUtf8(TEMPLATE_PATH);
  const readme = readUtf8(`${PACKET_ROOT}/README.md`);
  const gitignore = readUtf8('.gitignore');

  assert.equal(request.acquisition_id, ACQUISITION_ID);
  assert.equal(custody.acquisition_id, ACQUISITION_ID);
  assert.equal(adjudication.acquisition_id, ACQUISITION_ID);
  assert.equal(example.acquisition_id, ACQUISITION_ID);
  assert.equal(request.status, 'prepared_not_sent');
  assert.equal(custody.status, 'prepared_not_sent');
  assert.equal(request.graph_effect, 'none');
  assert.equal(request.counts_toward_thesis_evidence, false);
  assert.ok(Object.values(request.authority_state).every((value) => value === false));
  assert.ok(Object.values(custody.dispatch_preconditions).every((value) => value === false));
  assert.deepEqual(custody.current_artifacts, []);
  assert.equal(custody.current_response_state, 'none');
  assert.equal(adjudication.current_canonical_state.sh01_allottees_unidentified, true);
  assert.equal(adjudication.current_canonical_state.beneficial_owners_unidentified, true);
  assert.equal(adjudication.current_canonical_state.actor_hop_delta, 'none');
  assert.ok(ledger.length >= 1, 'response ledger must contain the prepared event');
  assert.equal(ledger.at(-1).status, 'prepared_not_sent');
  assert.equal(ledger.at(-1).dispatch_authorized, false);
  assert.equal(ledger.at(-1).route_executed, false);
  assert.equal(ledger.at(-1).response_received, false);
  assert.deepEqual(ledger.at(-1).canonical_effect, {
    allottee_delta: 'none',
    beneficial_owner_delta: 'none',
    rights_exercise_delta: 'none',
    actor_hop_delta: 'none',
  });

  for (const token of REQUIRED_TEMPLATE_TOKENS) assert.ok(template.includes(token));
  for (const heading of REQUIRED_TEMPLATE_HEADINGS) assert.ok(template.includes(heading));
  assert.match(template, /No follow-up, public escalation, or source-subject contact is authorized/u);
  assert.match(readme, /tools\/finalize-electric-twin-register-request\.mjs/u);
  assert.match(readme, /does not render a PDF/u);
  assert.match(gitignore, /^data\/local\/$/mu);
  assert.match(gitignore, /^build\/source-acquisition\/$/mu);

  assert.equal(example.schema_version, PRIVATE_INPUT_SCHEMA);
  assert.equal(example.authorization.finalization_authorized, false);
  assert.equal(example.authorization.statutory_dispatch_authorized, false);
  assert.equal(example.authorization.voluntary_dispatch_authorized, false);
  assert.throws(() => validatePrivateInput(example), /placeholder|finalization_authorized/u);

  assertNoNetworkSurface('tools/lib/electric-twin-register-request-core.mjs', new Set([
    'node:assert/strict', 'node:crypto', 'node:fs', 'node:path',
  ]));
  assertNoNetworkSurface('tools/finalize-electric-twin-register-request.mjs', new Set([
    'node:assert/strict', 'node:path', 'node:url',
    './lib/electric-twin-register-request-core.mjs',
    './validate-electric-twin-register-request-packet.mjs',
  ]));

  return {
    acquisition_id: ACQUISITION_ID,
    status: request.status,
    authority: 'not_authorized',
    messages_sent: false,
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) console.log(JSON.stringify(validateTrackedElectricTwinRequestPacket()));
