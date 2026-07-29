#!/usr/bin/env node
import fs from 'node:fs';

const index = JSON.parse(fs.readFileSync('build/lake-index.json', 'utf8'));
const objects = JSON.parse(fs.readFileSync('build/lake-object-index.json', 'utf8'));
const gaps = JSON.parse(fs.readFileSync('build/lake-index-gaps.json', 'utf8'));
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const receipts = objects.receipts ?? [];
const tokenClasses = objects.receipt_token_classes ?? {};
const locators = tokenClasses.source_locators ?? [];
const hashes = tokenClasses.content_hashes ?? [];
const semantics = gaps.receipt_semantics ?? {};
const c = index.summary.counts;

assert(tokenClasses.schema_version === 'lake-receipt-token-classes@1', 'unexpected receipt-token schema');
assert(semantics.schema_version === 'lake-receipt-semantics@1', 'unexpected receipt-semantics schema');
assert(receipts.every(row => !/^https?:\/\//i.test(row.receipt_id)), 'URL locator remains classified as a receipt ID');
assert(receipts.every(row => !/^sha256:/i.test(row.receipt_id)), 'content hash remains classified as a receipt ID');
assert(locators.every(row => /^https?:\/\//i.test(row.locator)), 'non-URL token appears in locator class');
assert(hashes.every(row => /^sha256:[0-9a-f]{64}$/i.test(row.content_hash)), 'malformed content hash token');
assert(new Set(receipts.map(row => row.receipt_id)).size === receipts.length, 'duplicate canonical receipt ID');
assert(new Set(locators.map(row => row.locator)).size === locators.length, 'duplicate receipt locator token');
assert(new Set(hashes.map(row => row.content_hash)).size === hashes.length, 'duplicate receipt content hash token');

const undefinedRows = receipts.filter(row => row.referenced && !row.defined);
const unusedRows = receipts.filter(row => row.defined && !row.used);
assert(JSON.stringify(undefinedRows) === JSON.stringify(gaps.undefined_receipt_references), 'undefined receipt queue disagrees with semantic receipt rows');
assert(JSON.stringify(unusedRows) === JSON.stringify(gaps.unused_receipt_definitions), 'unused receipt queue disagrees with semantic receipt rows');
assert(c.receipt_ids === receipts.length, 'receipt count mismatch');
assert(c.undefined_receipt_references === undefinedRows.length, 'undefined receipt count mismatch');
assert(c.unused_receipt_definitions === unusedRows.length, 'unused receipt count mismatch');
assert(c.receipt_locator_tokens === locators.length, 'locator token count mismatch');
assert(c.receipt_content_hash_tokens === hashes.length, 'content-hash token count mismatch');
assert(c.inline_receipt_use_ids === receipts.filter(row => row.inline_used).length, 'inline receipt-use count mismatch');

assert(!undefinedRows.some(row => /^https?:\/\//i.test(row.receipt_id)), 'URL appears in undefined receipt queue');
assert(!undefinedRows.some(row => /^sha256:/i.test(row.receipt_id)), 'content hash appears in undefined receipt queue');
assert(locators.some(row => row.locator === 'https://8vc.com/team'), '8VC locator fixture is not classified as a locator');
assert(hashes.some(row => row.content_hash === 'sha256:a12f25c5073f9ef4ab8b74d6ec2f0c2e613602811605029284d47992d34aa6ed'), 'LinkedIn custody-hash fixture is not classified as a content hash');
assert(tokenClasses.boundaries.locator_is_receipt_identity === false, 'locator identity boundary missing');
assert(tokenClasses.boundaries.content_hash_is_receipt_identity === false, 'content-hash identity boundary missing');
assert(tokenClasses.boundaries.inline_receipt_object_is_unused_definition === false, 'inline-use boundary missing');
assert(semantics.boundaries.receipt_ids_field_is_semantically_uniform === false, 'field-uniformity boundary missing');
assert(index.summary.boundaries.receipt_field_semantics_fully_uniform === false, 'summary receipt-semantic boundary missing');

for (const file of index.files) {
  for (const field of [
    'canonical_receipt_definition_count',
    'canonical_receipt_reference_count',
    'inline_receipt_use_count',
    'receipt_locator_token_count',
    'receipt_content_hash_token_count'
  ]) {
    if (field in file) assert(Number.isInteger(file[field]) && file[field] >= 0, `${file.path}: invalid ${field}`);
  }
}

if (errors.length) {
  console.error(`lake receipt semantics validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('lake receipt semantics validation: OK');
console.log(`  canonical receipts: ${receipts.length}`);
console.log(`  locators: ${locators.length}`);
console.log(`  content hashes: ${hashes.length}`);
console.log(`  undefined canonical references: ${undefinedRows.length}`);
console.log(`  unused definitions: ${unusedRows.length}`);
