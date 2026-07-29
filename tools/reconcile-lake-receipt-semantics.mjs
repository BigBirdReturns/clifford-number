#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const policy = JSON.parse(fs.readFileSync(path.join(root, 'data/project/lake-index-policy.json'), 'utf8'));
const indexPath = path.join(root, 'build/lake-index.json');
const objectPath = path.join(root, 'build/lake-object-index.json');
const gapsPath = path.join(root, 'build/lake-index-gaps.json');
const reportPath = path.join(root, 'reports/lake-index-census.md');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const objects = JSON.parse(fs.readFileSync(objectPath, 'utf8'));
const gaps = JSON.parse(fs.readFileSync(gapsPath, 'utf8'));
const excluded = new Set(policy.excluded_paths ?? []);

function trackedFiles() {
  const raw = execFileSync('git', ['ls-files', '-z'], { cwd: root });
  return raw.toString('utf8').split('\0').filter(Boolean).filter(file => !excluded.has(file)).sort();
}

function classify(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const token = value.trim();
  if (/^https?:\/\//i.test(token)) return { kind: 'source_locator', token };
  if (/^sha256:[0-9a-f]{64}$/i.test(token)) return { kind: 'content_hash', token: token.toLowerCase() };
  return { kind: 'canonical_receipt_id', token };
}

function add(map, key, file) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(file);
}

function fileState() {
  return {
    definitions: new Set(),
    references: new Set(),
    inlineUses: new Set(),
    locators: new Set(),
    hashes: new Set()
  };
}

const definitions = new Map();
const references = new Map();
const inlineUses = new Map();
const locators = new Map();
const hashes = new Map();
const perFile = new Map();
const parseErrors = [];

function recordClassified(classified, file, state, mode) {
  if (!classified) return;
  if (classified.kind === 'source_locator') {
    add(locators, classified.token, file);
    state.locators.add(classified.token);
    return;
  }
  if (classified.kind === 'content_hash') {
    add(hashes, classified.token, file);
    state.hashes.add(classified.token);
    return;
  }
  if (mode === 'definition') {
    add(definitions, classified.token, file);
    state.definitions.add(classified.token);
  } else if (mode === 'inline_use') {
    add(inlineUses, classified.token, file);
    state.inlineUses.add(classified.token);
  } else {
    add(references, classified.token, file);
    state.references.add(classified.token);
  }
}

function walk(value, file, state, parentKey = null) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, file, state, parentKey);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (key === 'receipt_id') {
      const classified = classify(item);
      recordClassified(classified, file, state, 'definition');
      if (parentKey === 'receipts' && classified?.kind === 'canonical_receipt_id') {
        recordClassified(classified, file, state, 'inline_use');
      }
    }
    if (key === 'receipt_ids' && Array.isArray(item)) {
      for (const token of item) recordClassified(classify(token), file, state, 'reference');
    }
    walk(item, file, state, key);
  }
}

for (const file of trackedFiles()) {
  if (!/\.jsonl?$/i.test(file)) continue;
  const state = fileState();
  perFile.set(file, state);
  try {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    if (file.endsWith('.jsonl')) {
      for (const [index, line] of text.split(/\r?\n/).entries()) {
        if (!line.trim() || line.trim().startsWith('#')) continue;
        try { walk(JSON.parse(line), file, state); }
        catch (error) { parseErrors.push({ path: file, line: index + 1, error: error.message }); }
      }
    } else {
      walk(JSON.parse(text), file, state);
    }
  } catch (error) {
    parseErrors.push({ path: file, line: null, error: error.message });
  }
}

const canonicalIds = [...new Set([...definitions.keys(), ...references.keys(), ...inlineUses.keys()])].sort();
const receiptRows = canonicalIds.map(receiptId => {
  const definitionPaths = [...(definitions.get(receiptId) ?? [])].sort();
  const referencePaths = [...(references.get(receiptId) ?? [])].sort();
  const inlineUsePaths = [...(inlineUses.get(receiptId) ?? [])].sort();
  return {
    receipt_id: receiptId,
    definition_paths: definitionPaths,
    reference_paths: referencePaths,
    inline_use_paths: inlineUsePaths,
    defined: definitionPaths.length > 0,
    referenced: referencePaths.length > 0,
    inline_used: inlineUsePaths.length > 0,
    used: referencePaths.length > 0 || inlineUsePaths.length > 0
  };
});
const locatorRows = [...locators].map(([token, paths]) => ({ locator: token, paths: [...paths].sort() })).sort((a, b) => a.locator.localeCompare(b.locator));
const hashRows = [...hashes].map(([token, paths]) => ({ content_hash: token, paths: [...paths].sort() })).sort((a, b) => a.content_hash.localeCompare(b.content_hash));
const undefinedRows = receiptRows.filter(row => row.referenced && !row.defined);
const unusedRows = receiptRows.filter(row => row.defined && !row.used);

objects.receipts = receiptRows;
objects.receipt_token_classes = {
  schema_version: 'lake-receipt-token-classes@1',
  source_locators: locatorRows,
  content_hashes: hashRows,
  boundaries: {
    locator_is_receipt_identity: false,
    content_hash_is_receipt_identity: false,
    inline_receipt_object_is_unused_definition: false
  }
};
gaps.undefined_receipt_references = undefinedRows;
gaps.unused_receipt_definitions = unusedRows;
gaps.receipt_semantics = {
  schema_version: 'lake-receipt-semantics@1',
  canonical_receipt_ids: receiptRows.length,
  source_locator_tokens: locatorRows.length,
  content_hash_tokens: hashRows.length,
  inline_receipt_use_ids: receiptRows.filter(row => row.inline_used).length,
  parse_errors: parseErrors,
  boundaries: {
    receipt_ids_field_is_semantically_uniform: false,
    url_token_is_missing_receipt: false,
    sha256_token_is_missing_receipt: false,
    inline_receipt_object_requires_external_reference: false
  }
};

index.summary.counts.receipt_ids = receiptRows.length;
index.summary.counts.undefined_receipt_references = undefinedRows.length;
index.summary.counts.unused_receipt_definitions = unusedRows.length;
index.summary.counts.receipt_locator_tokens = locatorRows.length;
index.summary.counts.receipt_content_hash_tokens = hashRows.length;
index.summary.counts.inline_receipt_use_ids = receiptRows.filter(row => row.inline_used).length;
index.summary.boundaries.receipt_field_semantics_fully_uniform = false;

const fileByPath = new Map(index.files.map(file => [file.path, file]));
for (const [file, state] of perFile) {
  const target = fileByPath.get(file);
  if (!target) continue;
  delete target.receipt_definition_count;
  delete target.receipt_reference_count;
  target.canonical_receipt_definition_count = state.definitions.size;
  target.canonical_receipt_reference_count = state.references.size;
  target.inline_receipt_use_count = state.inlineUses.size;
  target.receipt_locator_token_count = state.locators.size;
  target.receipt_content_hash_token_count = state.hashes.size;
}

fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
fs.writeFileSync(objectPath, JSON.stringify(objects, null, 2) + '\n');
fs.writeFileSync(gapsPath, JSON.stringify(gaps, null, 2) + '\n');

let report = fs.readFileSync(reportPath, 'utf8');
report = report.replace(
  /receipt IDs:\s+\d+\nundefined receipt references:\s+\d+\nunused receipt definitions:\s+\d+/,
  `receipt IDs:                             ${receiptRows.length}\nundefined receipt references:            ${undefinedRows.length}\nunused receipt definitions:              ${unusedRows.length}\nreceipt locator tokens:                   ${locatorRows.length}\nreceipt content-hash tokens:              ${hashRows.length}\ninline receipt-use IDs:                   ${receiptRows.filter(row => row.inline_used).length}`
);
fs.writeFileSync(reportPath, report);

console.log('lake receipt semantics reconciled');
console.log(`  canonical receipt IDs: ${receiptRows.length}`);
console.log(`  source locator tokens: ${locatorRows.length}`);
console.log(`  content hash tokens: ${hashRows.length}`);
console.log(`  undefined canonical references: ${undefinedRows.length}`);
console.log(`  unused definitions: ${unusedRows.length}`);
