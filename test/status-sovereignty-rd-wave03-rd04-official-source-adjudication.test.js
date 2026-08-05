#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, FEDERAL_CONTEXT_PATH, STATE_SOURCES_PATH, INDEX_PATH, MATRIX_PATH, NEXT_PROTOCOL_PATH,
  PRODUCT_PATHS, SUCCESSOR_TRIGGER_PATH, FIELD_ORDER,
  validateStateSource, validateFederalSource, validateMatrixCell, validateNextRoute,
  derivePartialFieldMatrix, deriveNextSourceProtocol, classifyChangedPathSurface,
  expectedSuccessorTriggerText, validateSuccessorTriggerText
} from '../tools/build-status-sovereignty-rd-wave03-rd04-official-source-adjudication.mjs';
import {
  validateSchemaContract, validateReplayReceipt, validateValue
} from '../tools/validate-status-sovereignty-rd-wave03-rd04-official-source-adjudication.mjs';

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readJsonl = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').trimEnd().split('\n').filter(Boolean).map((line) => JSON.parse(line));
const clone = (value) => structuredClone(value);
const tests = [];
const refuses = (name, fn) => tests.push({ name, run: () => assert.throws(fn, undefined, name) });

const stateSources = readJsonl(STATE_SOURCES_PATH);
const federalBundle = read(FEDERAL_CONTEXT_PATH);
const matrix = read(MATRIX_PATH);
const protocol = read(NEXT_PROTOCOL_PATH);

assert.equal(stateSources.length, 50);
assert.equal(federalBundle.sources.length, 4);
assert.equal(matrix.rows.length, 50);
assert.equal(matrix.rows.flatMap((row) => row.cells).length, 450);
assert.equal(protocol.routes.length, 54);
assert.equal(PRODUCT_PATHS.length, 14);
stateSources.forEach((row, index) => assert.equal(validateStateSource(row, index + 1), true));
federalBundle.sources.forEach((row, index) => assert.equal(validateFederalSource(row, index + 1), true));
matrix.rows.forEach((row, rowIndex) => row.cells.forEach((cell, fieldIndex) => assert.equal(validateMatrixCell(cell, stateSources[rowIndex], FIELD_ORDER[fieldIndex], fieldIndex + 1), true)));
protocol.routes.forEach((route, index) => assert.equal(validateNextRoute(route, index + 1), true));
assert.deepEqual(derivePartialFieldMatrix(stateSources), matrix);
assert.deepEqual(deriveNextSourceProtocol(federalBundle.sources, stateSources), protocol);
assert.equal(validateSchemaContract(read('schemas/status-sovereignty-rd-wave03-rd04-official-source-adjudication.schema.json')), true);
assert.equal(validateReplayReceipt(read('data/intake/status-sovereignty-rd-wave03-rd04-official-source-adjudication/replay-execution-receipt.json')), true);
assert.equal(validateValue(ROOT), true);

for (let index = 0; index < stateSources.length; index += 1) {
  const ordinal = index + 1;
  refuses(`state ${ordinal} scoped admission mutation`, () => {
    const row = clone(stateSources[index]); row.source_admitted = false; validateStateSource(row, ordinal);
  });
  refuses(`state ${ordinal} body hash mutation`, () => {
    const row = clone(stateSources[index]); row.body_sha256 = 'changed'; validateStateSource(row, ordinal);
  });
  refuses(`state ${ordinal} allowed-host mutation`, () => {
    const row = clone(stateSources[index]); row.state_snap_allowed_final_host_suffix = 'example.com'; validateStateSource(row, ordinal);
  });
  refuses(`state ${ordinal} field-authority mutation`, () => {
    const row = clone(stateSources[index]); row.field_effects.operative_state_implementation_authority_and_version = 'evidence_complete'; validateStateSource(row, ordinal);
  });
}

for (let index = 0; index < federalBundle.sources.length; index += 1) {
  const ordinal = index + 1;
  refuses(`federal ${ordinal} scoped admission mutation`, () => {
    const row = clone(federalBundle.sources[index]); row.source_admitted = false; validateFederalSource(row, ordinal);
  });
  refuses(`federal ${ordinal} body hash mutation`, () => {
    const row = clone(federalBundle.sources[index]); row.body_sha256 = 'changed'; validateFederalSource(row, ordinal);
  });
  refuses(`federal ${ordinal} successor denominator mutation`, () => {
    const row = clone(federalBundle.sources[index]); row.successor_routes.push({}); validateFederalSource(row, ordinal);
  });
  refuses(`federal ${ordinal} field authority mutation`, () => {
    const row = clone(federalBundle.sources[index]); row.field_classification_effect = 'state_implementation'; validateFederalSource(row, ordinal);
  });
}

for (let rowIndex = 0; rowIndex < matrix.rows.length; rowIndex += 1) {
  for (let fieldIndex = 0; fieldIndex < FIELD_ORDER.length; fieldIndex += 1) {
    refuses(`matrix ${rowIndex + 1}/${fieldIndex + 1} state mutation`, () => {
      const cell = clone(matrix.rows[rowIndex].cells[fieldIndex]);
      cell.state = cell.state === 'evidence_complete' ? 'still_open' : 'evidence_complete';
      validateMatrixCell(cell, stateSources[rowIndex], FIELD_ORDER[fieldIndex], fieldIndex + 1);
    });
  }
}

for (let index = 0; index < protocol.routes.length; index += 1) {
  const ordinal = index + 1;
  refuses(`next route ${ordinal} attempt ceiling mutation`, () => {
    const route = clone(protocol.routes[index]); route.maximum_attempts = 2; validateNextRoute(route, ordinal);
  });
  refuses(`next route ${ordinal} automatic admission mutation`, () => {
    const route = clone(protocol.routes[index]); route.automatic_source_admission = true; validateNextRoute(route, ordinal);
  });
}

refuses('partial product surface', () => classifyChangedPathSurface(PRODUCT_PATHS.slice(0, -1)));
refuses('product plus trigger surface', () => classifyChangedPathSurface([...PRODUCT_PATHS, SUCCESSOR_TRIGGER_PATH]));
refuses('wrong trigger path', () => classifyChangedPathSurface(['.ssc-rd04-wave03-state-source-trigger/RUN']));
refuses('trigger plus extra path', () => classifyChangedPathSurface([SUCCESSOR_TRIGGER_PATH, 'README.md']));
refuses('single product path surface', () => classifyChangedPathSurface([PRODUCT_PATHS[0]]));
refuses('product missing workflow surface', () => classifyChangedPathSurface(PRODUCT_PATHS.filter((rel) => !rel.startsWith('.github/workflows/'))));
refuses('arbitrary path surface', () => classifyChangedPathSurface(['README.md']));

const expectedTrigger = expectedSuccessorTriggerText(ROOT);
assert.equal(validateSuccessorTriggerText(expectedTrigger, ROOT), true);
const triggerLines = expectedTrigger.trimEnd().split('\n');
for (let index = 0; index < triggerLines.length; index += 1) {
  refuses(`successor trigger line ${index + 1} mutation`, () => {
    const lines = [...triggerLines]; const [key] = lines[index].split('=', 1); lines[index] = `${key}=changed`;
    validateSuccessorTriggerText(`${lines.join('\n')}\n`, ROOT);
  });
}
refuses('successor trigger line removal', () => validateSuccessorTriggerText(`${triggerLines.slice(0, -1).join('\n')}\n`, ROOT));
refuses('successor trigger line reorder', () => {
  const lines = [...triggerLines]; [lines[0], lines[1]] = [lines[1], lines[0]]; validateSuccessorTriggerText(`${lines.join('\n')}\n`, ROOT);
});
refuses('successor trigger extra authority', () => validateSuccessorTriggerText(`${triggerLines.join('\n')}\nautomatic_publication=true\n`, ROOT));
refuses('successor trigger final newline removal', () => validateSuccessorTriggerText(expectedTrigger.trimEnd(), ROOT));

assert.equal(tests.length, 796, `adversarial refusal denominator changed: ${tests.length}`);
for (const test of tests) test.run();
console.log(`RD-04 official source adjudication adversarial suite passed: ${tests.length} refused mutations`);
