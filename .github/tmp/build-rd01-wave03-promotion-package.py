#!/usr/bin/env python3
from __future__ import annotations

import json
import textwrap
from pathlib import Path
import sys

if len(sys.argv) != 3:
    raise SystemExit('usage: build-rd01-wave03-promotion-package.py SPEC_JSON OUT_ROOT')

spec_path = Path(sys.argv[1])
out_root = Path(sys.argv[2])
spec = json.loads(spec_path.read_text())

required_counts = {
    'canonical_residual_classes': 42,
    'prior_closed': 6,
    'prior_open': 36,
    'promoted_this_wave': 1,
    'current_closed': 7,
    'current_open': 35,
    'wave03_selected': 6,
    'wave03_terminal': 1,
    'wave03_open_selected': 5,
}
if spec.get('schema_version') != 'ssc-rd-wave03-rd01-promotion-spec@1':
    raise SystemExit('unexpected promotion spec schema')
if spec.get('counts') != required_counts:
    raise SystemExit(f'unexpected promotion counts: {spec.get("counts")}')
if spec.get('terminal_state') != 'bounded_source_unavailable':
    raise SystemExit('unexpected terminal state')
if spec.get('wave03_terminal_class_ids') != ['RD-01-C06']:
    raise SystemExit('unexpected promoted class')
if len(spec.get('canonical_class_order', [])) != 42:
    raise SystemExit('canonical class order is not 42')
if len(spec.get('current_closed_class_ids', [])) != 7 or len(spec.get('current_open_class_ids', [])) != 35:
    raise SystemExit('current 7/35 partition absent')

source_manifest = {
    'schema_version': 'status-sovereignty-residual-denominator-wave-03-current-source@1',
    'ledger_id': 'SSC-RD-W03-CURRENT',
    'as_of': spec['as_of'],
    'status': 'one_terminal_promotion_from_six_closure_parent',
    'lineage': spec['lineage'],
    'sources': spec['sources'],
    'canonical_class_order': spec['canonical_class_order'],
    'prior_closed_class_ids': spec['prior_closed_class_ids'],
    'prior_open_class_ids': spec['prior_open_class_ids'],
    'wave03_selected_class_ids': spec['wave03_selected_class_ids'],
    'wave03_terminal_class_ids': spec['wave03_terminal_class_ids'],
    'wave03_open_selected_class_ids': spec['wave03_open_selected_class_ids'],
    'current_closed_class_ids': spec['current_closed_class_ids'],
    'current_open_class_ids': spec['current_open_class_ids'],
    'counts': spec['counts'],
    'terminal_state': spec['terminal_state'],
    'authority': spec['authority'],
    'claim_boundary': [
        'A terminal class receipt closes only its declared public-record obligation.',
        'A source-unavailable cell is not proof that a private correction, appeal, override, or reconsideration did not occur.',
        'An annual methodology change is not a correction of a prior edition.',
        'A future-edition eligibility statement is not a current-edition reranking or reversal.',
        'Seven closed residual classes do not complete the forty-two-class residual denominator.',
        'One Wave-03 terminal attempt does not make the other five selected attempts terminal.',
        'Cumulative promotion does not create selector accuracy, technical superiority, coordination, common purpose, publication, adoption, or graph authority.',
    ],
}

paths = {
    'source': 'data/research/status-sovereignty-residual-denominator-wave-03-current-source.json',
    'ledger': 'data/research/status-sovereignty-residual-denominator-wave-03-current.json',
    'release': 'data/project/ssc-residual-wave03/current-release-manifest.json',
    'schema': 'schemas/status-sovereignty-residual-denominator-wave-03-current.schema.json',
    'builder': 'tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs',
    'validator': 'tools/validate-status-sovereignty-residual-denominator-wave-03-current.mjs',
    'test': 'test/status-sovereignty-residual-denominator-wave-03-current.test.js',
    'milestone': 'docs/milestones/ssc-residual-denominator-wave-03-current.md',
    'workflow': '.github/workflows/status-sovereignty-residual-denominator-wave-03-current.yml',
}

for path in paths.values():
    (out_root / path).parent.mkdir(parents=True, exist_ok=True)

(out_root / paths['source']).write_text(json.dumps(source_manifest, indent=2) + '\n')

builder = r'''#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_PATH = 'data/research/status-sovereignty-residual-denominator-wave-03-current-source.json';
export const LEDGER_PATH = 'data/research/status-sovereignty-residual-denominator-wave-03-current.json';
export const RELEASE_PATH = 'data/project/ssc-residual-wave03/current-release-manifest.json';
export const SCHEMA_PATH = 'schemas/status-sovereignty-residual-denominator-wave-03-current.schema.json';
export const BUILDER_PATH = 'tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs';
export const VALIDATOR_PATH = 'tools/validate-status-sovereignty-residual-denominator-wave-03-current.mjs';
export const TEST_PATH = 'test/status-sovereignty-residual-denominator-wave-03-current.test.js';
export const MILESTONE_PATH = 'docs/milestones/ssc-residual-denominator-wave-03-current.md';
export const WORKFLOW_PATH = '.github/workflows/status-sovereignty-residual-denominator-wave-03-current.yml';

const RELEASE_ENTRIES = [SOURCE_PATH, LEDGER_PATH, SCHEMA_PATH, BUILDER_PATH, VALIDATOR_PATH, TEST_PATH, MILESTONE_PATH, WORKFLOW_PATH].sort();
const CLASS_RE = /^RD-0[1-6]-C\d{2}$/;
const EXACT_COUNTS = Object.freeze({
  canonical_residual_classes: 42,
  prior_closed: 6,
  prior_open: 36,
  promoted_this_wave: 1,
  current_closed: 7,
  current_open: 35,
  wave03_selected: 6,
  wave03_terminal: 1,
  wave03_open_selected: 5,
});
const EXACT_AUTHORITY = Object.freeze({
  outside_human_dependency: false,
  external_contacts: 0,
  external_reviews: 0,
  reviewed_disposition_changes: 0,
  complete_compact_findings: 0,
  racial_order_findings: 0,
  prevalence_findings: 0,
  coordination_findings: 0,
  common_purpose_findings: 0,
  publication_effect: 'none',
  adoption_effect: 'none',
  graph_effect: 'none',
});

function abs(rel) { return path.join(ROOT, rel); }
function readJson(rel) { return JSON.parse(fs.readFileSync(abs(rel), 'utf8')); }
export function sha256Bytes(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
export function sha256File(rel) { return sha256Bytes(fs.readFileSync(abs(rel))); }
function jsonText(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function unique(values) { return new Set(values).size === values.length; }
function exactSet(a, b) { return a.length === b.length && a.every((value) => b.includes(value)); }
function assert(condition, message) { if (!condition) throw new Error(message); }

export function readAndValidateSource() {
  const source = readJson(SOURCE_PATH);
  assert(source.schema_version === 'status-sovereignty-residual-denominator-wave-03-current-source@1', 'source schema');
  assert(source.ledger_id === 'SSC-RD-W03-CURRENT', 'ledger id');
  assert(source.as_of === '2026-08-04', 'as_of');
  assert(source.status === 'one_terminal_promotion_from_six_closure_parent', 'source status');
  assert(same(source.counts, EXACT_COUNTS), 'exact counts');
  assert(source.terminal_state === 'bounded_source_unavailable', 'terminal state');
  assert(same(source.authority, EXACT_AUTHORITY), 'authority ceiling');
  const canonical = source.canonical_class_order;
  const priorClosed = source.prior_closed_class_ids;
  const priorOpen = source.prior_open_class_ids;
  const selected = source.wave03_selected_class_ids;
  const terminal = source.wave03_terminal_class_ids;
  const selectedOpen = source.wave03_open_selected_class_ids;
  const currentClosed = source.current_closed_class_ids;
  const currentOpen = source.current_open_class_ids;
  for (const [name, values, length] of [
    ['canonical', canonical, 42], ['prior closed', priorClosed, 6], ['prior open', priorOpen, 36],
    ['selected', selected, 6], ['terminal', terminal, 1], ['selected open', selectedOpen, 5],
    ['current closed', currentClosed, 7], ['current open', currentOpen, 35],
  ]) {
    assert(Array.isArray(values) && values.length === length, `${name} length`);
    assert(values.every((value) => CLASS_RE.test(value)), `${name} class id`);
    assert(unique(values), `${name} unique`);
  }
  assert(exactSet(canonical, [...priorClosed, ...priorOpen]), 'prior partition');
  assert(priorClosed.every((id) => !priorOpen.includes(id)), 'prior disjoint');
  assert(terminal.length === 1 && terminal[0] === 'RD-01-C06', 'terminal class exact');
  assert(selected.includes('RD-01-C06'), 'selected contains promoted class');
  assert(exactSet(selected, [...terminal, ...selectedOpen]), 'selected partition');
  assert(exactSet(currentClosed, [...priorClosed, 'RD-01-C06']), 'current closed successor');
  assert(exactSet(canonical, [...currentClosed, ...currentOpen]), 'current partition');
  assert(currentClosed.every((id) => !currentOpen.includes(id)), 'current disjoint');
  assert(source.lineage.postmerge_marker === 'ssc-rd01-wave03-postmerge-proved', 'postmerge marker');
  for (const key of ['current_main', 'rd01_merge_sha', 'rd01_product_head']) {
    assert(/^[0-9a-f]{40}$/.test(source.lineage[key]), `lineage ${key}`);
  }
  const sourceRecords = [source.sources.prior_ledger, source.sources.wave03_constitution, source.sources.rd01_terminal_receipt, ...source.sources.rd01_terminal_sources];
  for (const record of sourceRecords) {
    assert(record && typeof record.path === 'string' && /^[0-9a-f]{64}$/.test(record.sha256), 'source record shape');
    assert(fs.existsSync(abs(record.path)), `source exists: ${record.path}`);
    assert(sha256File(record.path) === record.sha256, `source hash: ${record.path}`);
  }
  assert(source.claim_boundary.length === 7, 'claim boundary count');
  return source;
}

export function buildLedger() {
  const source = readAndValidateSource();
  return {
    schema_version: 'status-sovereignty-residual-denominator-wave-03-current@1',
    ledger_id: source.ledger_id,
    wave_id: 'SSC-RD-W03',
    as_of: source.as_of,
    status: 'in_progress',
    source_manifest_path: SOURCE_PATH,
    lineage: source.lineage,
    parent_state: {
      source_path: source.sources.prior_ledger.path,
      source_sha256: source.sources.prior_ledger.sha256,
      closed_class_ids: source.prior_closed_class_ids,
      open_class_ids: source.prior_open_class_ids,
      closed_residual_classes: source.counts.prior_closed,
      open_residual_classes: source.counts.prior_open,
    },
    wave03_state: {
      constitution_path: source.sources.wave03_constitution.path,
      constitution_sha256: source.sources.wave03_constitution.sha256,
      selected_class_ids: source.wave03_selected_class_ids,
      terminal_class_ids: source.wave03_terminal_class_ids,
      open_selected_class_ids: source.wave03_open_selected_class_ids,
      selected_attempts: source.counts.wave03_selected,
      terminal_receipts: source.counts.wave03_terminal,
      open_selected_attempts: source.counts.wave03_open_selected,
      all_selected_attempts_terminal: false,
    },
    current_state: {
      canonical_class_order: source.canonical_class_order,
      closed_class_ids: source.current_closed_class_ids,
      open_class_ids: source.current_open_class_ids,
      canonical_residual_classes: source.counts.canonical_residual_classes,
      closed_residual_classes: source.counts.current_closed,
      open_residual_classes: source.counts.current_open,
      promoted_this_wave: source.counts.promoted_this_wave,
      residual_denominator_complete: false,
    },
    promotions: [{
      ordinal: 1,
      class_id: 'RD-01-C06',
      terminal_state: source.terminal_state,
      merge_sha: source.lineage.rd01_merge_sha,
      product_head: source.lineage.rd01_product_head,
      receipt_path: source.sources.rd01_terminal_receipt.path,
      receipt_sha256: source.sources.rd01_terminal_receipt.sha256,
      class_closed: true,
      cumulative_effect: 'six_closed_thirty_six_open_to_seven_closed_thirty_five_open',
    }],
    authority: source.authority,
    claim_boundary: source.claim_boundary,
  };
}

export function buildReleaseManifest(ledgerText = jsonText(buildLedger())) {
  const entries = RELEASE_ENTRIES.map((rel) => {
    const bytes = rel === LEDGER_PATH ? Buffer.from(ledgerText) : fs.readFileSync(abs(rel));
    return { path: rel, sha256: sha256Bytes(bytes), bytes: bytes.length };
  });
  const releaseSha256 = sha256Bytes(Buffer.from(entries.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.bytes}`).join('\n')));
  return {
    schema_version: 'status-sovereignty-residual-denominator-wave-03-current-release@1',
    release_id: 'SSC-RD-W03-CURRENT-7-35',
    as_of: '2026-08-04',
    entry_count: entries.length,
    entries,
    release_sha256: releaseSha256,
  };
}

export function buildOutputs() {
  const ledger = buildLedger();
  const ledgerText = jsonText(ledger);
  const release = buildReleaseManifest(ledgerText);
  return { ledger, ledgerText, release, releaseText: jsonText(release) };
}

function main() {
  const mode = process.argv[2] || '--check';
  const outputs = buildOutputs();
  if (mode === '--write') {
    fs.mkdirSync(path.dirname(abs(LEDGER_PATH)), { recursive: true });
    fs.mkdirSync(path.dirname(abs(RELEASE_PATH)), { recursive: true });
    fs.writeFileSync(abs(LEDGER_PATH), outputs.ledgerText);
    fs.writeFileSync(abs(RELEASE_PATH), outputs.releaseText);
    console.log(`wrote ${LEDGER_PATH} and ${RELEASE_PATH}`);
    return;
  }
  if (mode !== '--check') throw new Error(`unknown mode: ${mode}`);
  assert(fs.readFileSync(abs(LEDGER_PATH), 'utf8') === outputs.ledgerText, 'ledger drift');
  assert(fs.readFileSync(abs(RELEASE_PATH), 'utf8') === outputs.releaseText, 'release drift');
  console.log('RD-01 Wave-03 cumulative ledger build: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
'''
(out_root / paths['builder']).write_text(builder)

validator = r'''#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildOutputs, LEDGER_PATH, RELEASE_PATH, SCHEMA_PATH, SOURCE_PATH, readAndValidateSource } from './build-status-sovereignty-residual-denominator-wave-03-current.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const abs = (rel) => path.join(ROOT, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), 'utf8'));
const exactKeys = (object, keys, label) => assert.deepEqual(Object.keys(object).sort(), [...keys].sort(), `${label} keys`);

function walk(value, visit, pathParts = []) {
  visit(value, pathParts);
  if (Array.isArray(value)) value.forEach((item, index) => walk(item, visit, [...pathParts, String(index)]));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => walk(item, visit, [...pathParts, key]));
}

function sourceContainsReceiptFacts(source) {
  let classId = false;
  let terminal = false;
  let closed = false;
  walk(source, (value, parts) => {
    const key = parts.at(-1) || '';
    if (['class_id', 'residual_class_id'].includes(key) && value === 'RD-01-C06') classId = true;
    if (['terminal_state', 'class_terminal_state'].includes(key) && value === 'bounded_source_unavailable') terminal = true;
    if ((key === 'class_closed' || key === 'closed') && value === true) closed = true;
  });
  return classId && terminal && closed;
}

export function validateLedgerObject(actual, options = {}) {
  const { verifySources = true, verifyGit = true } = options;
  const expected = buildOutputs().ledger;
  assert.deepEqual(actual, expected, 'ledger must equal deterministic build');
  exactKeys(actual, ['schema_version','ledger_id','wave_id','as_of','status','source_manifest_path','lineage','parent_state','wave03_state','current_state','promotions','authority','claim_boundary'], 'root');
  exactKeys(actual.parent_state, ['source_path','source_sha256','closed_class_ids','open_class_ids','closed_residual_classes','open_residual_classes'], 'parent_state');
  exactKeys(actual.wave03_state, ['constitution_path','constitution_sha256','selected_class_ids','terminal_class_ids','open_selected_class_ids','selected_attempts','terminal_receipts','open_selected_attempts','all_selected_attempts_terminal'], 'wave03_state');
  exactKeys(actual.current_state, ['canonical_class_order','closed_class_ids','open_class_ids','canonical_residual_classes','closed_residual_classes','open_residual_classes','promoted_this_wave','residual_denominator_complete'], 'current_state');
  assert.equal(actual.current_state.closed_residual_classes, 7);
  assert.equal(actual.current_state.open_residual_classes, 35);
  assert.equal(actual.wave03_state.terminal_receipts, 1);
  assert.equal(actual.wave03_state.open_selected_attempts, 5);
  assert.equal(actual.wave03_state.all_selected_attempts_terminal, false);
  assert.equal(actual.current_state.residual_denominator_complete, false);
  assert.deepEqual(actual.wave03_state.terminal_class_ids, ['RD-01-C06']);
  assert.equal(actual.promotions.length, 1);
  assert.equal(actual.promotions[0].class_id, 'RD-01-C06');
  assert.equal(actual.promotions[0].terminal_state, 'bounded_source_unavailable');
  assert.equal(actual.promotions[0].class_closed, true);
  assert.deepEqual(actual.authority, {
    outside_human_dependency: false, external_contacts: 0, external_reviews: 0,
    reviewed_disposition_changes: 0, complete_compact_findings: 0, racial_order_findings: 0,
    prevalence_findings: 0, coordination_findings: 0, common_purpose_findings: 0,
    publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none',
  });
  if (verifySources) {
    const source = readAndValidateSource();
    const receipt = readJson(source.sources.rd01_terminal_receipt.path);
    assert.equal(sourceContainsReceiptFacts(receipt), true, 'terminal receipt facts');
    const release = readJson(RELEASE_PATH);
    assert.deepEqual(release, buildOutputs().release, 'release manifest deterministic');
    assert.equal(release.entry_count, 8);
    assert.match(release.release_sha256, /^[0-9a-f]{64}$/);
    const schema = readJson(SCHEMA_PATH);
    assert.equal(schema.$id, 'https://clifford-number.example/schemas/status-sovereignty-residual-denominator-wave-03-current.schema.json');
    assert.equal(schema.additionalProperties, false);
  }
  if (verifyGit && fs.existsSync(path.join(ROOT, '.git'))) {
    const source = readJson(SOURCE_PATH);
    execFileSync('git', ['merge-base', '--is-ancestor', source.lineage.rd01_merge_sha, 'HEAD'], { cwd: ROOT, stdio: 'pipe' });
    execFileSync('git', ['cat-file', '-e', `${source.lineage.rd01_product_head}^{commit}`], { cwd: ROOT, stdio: 'pipe' });
  }
  return true;
}

function main() {
  const actual = readJson(LEDGER_PATH);
  validateLedgerObject(actual);
  console.log('RD-01 Wave-03 cumulative ledger validation: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
'''
(out_root / paths['validator']).write_text(validator)

schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    '$id': 'https://clifford-number.example/schemas/status-sovereignty-residual-denominator-wave-03-current.schema.json',
    'title': 'SSC residual-denominator Wave 03 current cumulative ledger',
    'type': 'object',
    'additionalProperties': False,
    'required': ['schema_version','ledger_id','wave_id','as_of','status','source_manifest_path','lineage','parent_state','wave03_state','current_state','promotions','authority','claim_boundary'],
    'properties': {
        'schema_version': {'const': 'status-sovereignty-residual-denominator-wave-03-current@1'},
        'ledger_id': {'const': 'SSC-RD-W03-CURRENT'},
        'wave_id': {'const': 'SSC-RD-W03'},
        'as_of': {'const': '2026-08-04'},
        'status': {'const': 'in_progress'},
        'source_manifest_path': {'const': paths['source']},
        'lineage': {'type': 'object'},
        'parent_state': {'type': 'object'},
        'wave03_state': {'type': 'object'},
        'current_state': {'type': 'object'},
        'promotions': {'type': 'array', 'minItems': 1, 'maxItems': 1},
        'authority': {'type': 'object'},
        'claim_boundary': {'type': 'array', 'minItems': 7, 'maxItems': 7, 'items': {'type': 'string'}},
    },
}
(out_root / paths['schema']).write_text(json.dumps(schema, indent=2) + '\n')

test = r'''#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEDGER_PATH } from '../tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs';
import { validateLedgerObject } from '../tools/validate-status-sovereignty-residual-denominator-wave-03-current.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canonical = JSON.parse(fs.readFileSync(path.join(ROOT, LEDGER_PATH), 'utf8'));
const clone = () => structuredClone(canonical);
const mutations = [];
const add = (name, mutate) => mutations.push({ name, mutate });

add('schema version', (x) => { x.schema_version += '-tampered'; });
add('ledger id', (x) => { x.ledger_id = 'OTHER'; });
add('wave id', (x) => { x.wave_id = 'SSC-RD-W04'; });
add('as of', (x) => { x.as_of = '2026-08-05'; });
add('status complete', (x) => { x.status = 'complete'; });
add('source manifest path', (x) => { x.source_manifest_path = 'other.json'; });
add('merge sha', (x) => { x.lineage.rd01_merge_sha = '0'.repeat(40); });
add('product head', (x) => { x.lineage.rd01_product_head = '1'.repeat(40); });
add('marker', (x) => { x.lineage.postmerge_marker = 'other'; });
add('prior closed count', (x) => { x.parent_state.closed_residual_classes = 5; });
add('prior open count', (x) => { x.parent_state.open_residual_classes = 37; });
add('selected attempts', (x) => { x.wave03_state.selected_attempts = 5; });
add('terminal receipts', (x) => { x.wave03_state.terminal_receipts = 2; });
add('open selected attempts', (x) => { x.wave03_state.open_selected_attempts = 4; });
add('all selected terminal', (x) => { x.wave03_state.all_selected_attempts_terminal = true; });
add('canonical count', (x) => { x.current_state.canonical_residual_classes = 41; });
add('closed count', (x) => { x.current_state.closed_residual_classes = 8; });
add('open count', (x) => { x.current_state.open_residual_classes = 34; });
add('promoted count', (x) => { x.current_state.promoted_this_wave = 2; });
add('denominator complete', (x) => { x.current_state.residual_denominator_complete = true; });
add('promotion class', (x) => { x.promotions[0].class_id = 'RD-02-C05'; });
add('promotion state', (x) => { x.promotions[0].terminal_state = 'evidence_complete'; });
add('promotion open', (x) => { x.promotions[0].class_closed = false; });
add('promotion ordinal', (x) => { x.promotions[0].ordinal = 2; });
add('promotion effect', (x) => { x.promotions[0].cumulative_effect = 'complete'; });
add('receipt path', (x) => { x.promotions[0].receipt_path = 'other.json'; });
add('receipt hash', (x) => { x.promotions[0].receipt_sha256 = '0'.repeat(64); });
add('outside human', (x) => { x.authority.outside_human_dependency = true; });
for (const key of ['external_contacts','external_reviews','reviewed_disposition_changes','complete_compact_findings','racial_order_findings','prevalence_findings','coordination_findings','common_purpose_findings']) {
  add(`authority ${key}`, (x) => { x.authority[key] = 1; });
}
for (const key of ['publication_effect','adoption_effect','graph_effect']) {
  add(`effect ${key}`, (x) => { x.authority[key] = 'some'; });
}
for (const [key, target] of [
  ['prior closed', ['parent_state','closed_class_ids']],
  ['prior open', ['parent_state','open_class_ids']],
  ['selected', ['wave03_state','selected_class_ids']],
  ['terminal', ['wave03_state','terminal_class_ids']],
  ['selected open', ['wave03_state','open_selected_class_ids']],
  ['canonical', ['current_state','canonical_class_order']],
  ['current closed', ['current_state','closed_class_ids']],
  ['current open', ['current_state','open_class_ids']],
]) {
  add(`${key} remove`, (x) => { x[target[0]][target[1]].pop(); });
  add(`${key} duplicate`, (x) => { x[target[0]][target[1]][0] = x[target[0]][target[1]][1]; });
  add(`${key} reorder`, (x) => { x[target[0]][target[1]].reverse(); });
}
for (const key of ['schema_version','lineage','parent_state','wave03_state','current_state','promotions','authority','claim_boundary']) {
  add(`delete ${key}`, (x) => { delete x[key]; });
}
add('extra root key', (x) => { x.unapproved = true; });
add('claim boundary remove', (x) => { x.claim_boundary.pop(); });
add('claim boundary rewrite', (x) => { x.claim_boundary[0] = 'closure proves everything'; });

validateLedgerObject(canonical, { verifySources: true, verifyGit: true });
let refused = 0;
for (const { name, mutate } of mutations) {
  const candidate = clone();
  mutate(candidate);
  assert.throws(() => validateLedgerObject(candidate, { verifySources: false, verifyGit: false }), undefined, name);
  refused += 1;
}
assert.ok(refused >= 70, `expected at least 70 refusals, received ${refused}`);
console.log(`RD-01 Wave-03 cumulative adversarial mutations: ${refused} PASS`);
'''
(out_root / paths['test']).write_text(test)

merge_sha = spec['lineage']['rd01_merge_sha']
head_sha = spec['lineage']['rd01_product_head']
prior_path = spec['sources']['prior_ledger']['path']
receipt_path = spec['sources']['rd01_terminal_receipt']['path']
release_rows = 8
milestone = f'''# SSC residual-denominator Wave 03 current ledger — RD-01-C06 promotion

This successor ledger promotes the already canonical `RD-01-C06` terminal receipt without rewriting the historical six-closure Wave-02 state.

```text
RD-01 canonical merge:       {merge_sha}
RD-01 permanent head:        {head_sha}
prior cumulative source:     {prior_path}
RD-01 terminal receipt:      {receipt_path}
canonical residual classes:  42
closed before / after:        6 / 7
open before / after:         36 / 35
Wave-03 selected attempts:     6
Wave-03 terminal receipts:     1
Wave-03 selected still open:   5
residual denominator complete: false
```

The promoted terminal state is `bounded_source_unavailable`. It closes only the declared public-record correction, appeal, and re-evaluation obligation for the 2024–2026 NatSec100 editions. It does not establish selector accuracy, technical superiority, absence of private records, coordination, common purpose, publication, adoption, or graph authority.

The prior six-closure ledger remains immutable. This object is a Wave-03 successor that binds the prior source by SHA-256, the Wave-03 constitution by SHA-256, the canonical RD-01 merge and product head, and every terminal source used by the receipt.

The deterministic package contains nine permanent paths: eight release-manifest entries plus the release manifest itself. All workflows are read-only, and cumulative promotion remains independent from the five still-open Wave-03 selected attempts.
'''
(out_root / paths['milestone']).write_text(milestone)

workflow = '''name: SSC residual-denominator Wave 03 current ledger

on:
  pull_request:
    paths:
      - 'data/research/status-sovereignty-residual-denominator-wave-03-current-source.json'
      - 'data/research/status-sovereignty-residual-denominator-wave-03-current.json'
      - 'data/project/ssc-residual-wave03/current-release-manifest.json'
      - 'schemas/status-sovereignty-residual-denominator-wave-03-current.schema.json'
      - 'tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs'
      - 'tools/validate-status-sovereignty-residual-denominator-wave-03-current.mjs'
      - 'test/status-sovereignty-residual-denominator-wave-03-current.test.js'
      - 'docs/milestones/ssc-residual-denominator-wave-03-current.md'
      - '.github/workflows/status-sovereignty-residual-denominator-wave-03-current.yml'
  push:
    branches: [main]
    paths:
      - 'data/research/status-sovereignty-residual-denominator-wave-03-current-source.json'
      - 'data/research/status-sovereignty-residual-denominator-wave-03-current.json'
      - 'data/project/ssc-residual-wave03/current-release-manifest.json'
      - 'schemas/status-sovereignty-residual-denominator-wave-03-current.schema.json'
      - 'tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs'
      - 'tools/validate-status-sovereignty-residual-denominator-wave-03-current.mjs'
      - 'test/status-sovereignty-residual-denominator-wave-03-current.test.js'
      - 'docs/milestones/ssc-residual-denominator-wave-03-current.md'
      - '.github/workflows/status-sovereignty-residual-denominator-wave-03-current.yml'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 120
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - name: Build, validate, and refuse cumulative shortcuts
        run: |
          set -Eeuo pipefail
          node tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs --check
          node tools/validate-status-sovereignty-residual-denominator-wave-03-current.mjs
          node test/status-sovereignty-residual-denominator-wave-03-current.test.js
          node tools/validate-no-magic-human-gate.mjs
          node test/no-magic-human-gate.test.js
          git diff --exit-code
      - name: Run complete repository release gate
        run: npm run release:check
      - name: Deterministically replay current ledger
        run: |
          set -Eeuo pipefail
          git restore --worktree -- .
          node tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs --write
          node tools/validate-status-sovereignty-residual-denominator-wave-03-current.mjs
          node test/status-sovereignty-residual-denominator-wave-03-current.test.js
          node tools/validate-no-magic-human-gate.mjs
          git diff --exit-code
          test -z "$(git status --porcelain=v1 --untracked-files=all)"
      - uses: actions/upload-artifact@v4
        with:
          name: ssc-residual-denominator-wave-03-current
          path: |
            data/research/status-sovereignty-residual-denominator-wave-03-current-source.json
            data/research/status-sovereignty-residual-denominator-wave-03-current.json
            data/project/ssc-residual-wave03/current-release-manifest.json
            docs/milestones/ssc-residual-denominator-wave-03-current.md
          if-no-files-found: error
          retention-days: 90
'''
(out_root / paths['workflow']).write_text(workflow)

# Generate deterministic products after every authored file exists.
sys.path.insert(0, str(out_root))
# The Node builder is the authority for the generated JSON; generation occurs in the materializer.

print(json.dumps({'paths': paths, 'nonworkflow_paths': [p for p in paths.values() if p != paths['workflow']], 'workflow_path': paths['workflow']}, indent=2))
