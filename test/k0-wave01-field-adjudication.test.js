#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateFieldAdjudication } from '../tools/validate-k0-wave01-field-adjudication.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};
run(['tools/build-k0-wave01-field-adjudication.mjs']);
const baseline = validateFieldAdjudication({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/research/k0-wave01-field-adjudication.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0-wave01-field-'));
const write = (name, value) => {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  return path.relative(root, file).replaceAll('\\', '/');
};

const promoted = structuredClone(audit);
promoted.rows[0].included_event = true;
let result = validateFieldAdjudication({ root, auditPath: write('promoted.json', promoted) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(value => value.includes('evidence or publication laundering')));

const bridged = structuredClone(audit);
bridged.rows[0].provisional_ccd_chain_depth = 5;
result = validateFieldAdjudication({ root, auditPath: write('bridged.json', bridged) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(value => value.includes('chain depth expected')));

const settlement = structuredClone(audit);
settlement.boundaries.settlement_is_merits_finding = true;
result = validateFieldAdjudication({ root, auditPath: write('settlement.json', settlement) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(value => value.includes('audit boundary drift')));

const cbpDemotion = structuredClone(audit);
cbpDemotion.rows.find(row => row.record_id === 'K0-W01-R007').candidate_disposition = 'retained_candidate_only';
result = validateFieldAdjudication({ root, auditPath: write('cbp-demotion.json', cbpDemotion) });
assert.equal(result.ok, false);
assert.ok(result.failures.some(value => value.includes('disposition count drift') || value.includes('CBP disposition drift')));

const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/core-thesis/answerable-power/k0-wave01-field-adjudication.json'), 'utf8'));
assert.equal(report.counts.candidate_records_audited, 5);
assert.equal(report.counts.supported_for_human_review, 2);
assert.equal(report.counts.retained_candidate_only, 3);
assert.equal(report.current_result.included_events, 0);
assert.equal(report.current_result.publication_status, 'blocked');
assert.equal(report.current_result.graph_effect, 'none');
console.log('k0-wave01-field-adjudication.test: OK');
