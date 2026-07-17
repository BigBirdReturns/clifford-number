import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'clifford-linkedin-'));
const output = path.join(fixture, 'attention.jsonl');

fs.writeFileSync(path.join(fixture, 'Reactions.csv'), [
  'Date,Type,Link,Email Address',
  '2026-06-02,LIKE,https://www.linkedin.com/posts/example-1,private@example.test',
  '2023-01-01,INSIGHTFUL,https://www.linkedin.com/posts/too-old,private@example.test',
].join('\n'));
fs.writeFileSync(path.join(fixture, 'Saved_Items.csv'), [
  'Saved Date,URL,Title',
  '2025-05-04,https://www.linkedin.com/posts/example-2,"A saved, bounded post"',
].join('\n'));
fs.writeFileSync(path.join(fixture, 'Comments.csv'), [
  'Date,Link,Message',
  '2025-04-03,https://www.linkedin.com/posts/example-3,"A quoted, comment"',
  '2025-04-04,https://www.linkedin.com/posts/example-4,A literal "quote" in an unquoted comment',
  '2025-04-05,https://www.linkedin.com/posts/example-5,"A multiline\ncomment with a "bare" quote"',
  '2025-04-06,https://www.linkedin.com/posts/example-6,"A backslash \\"quote\\""',
].join('\n'));
fs.writeFileSync(path.join(fixture, 'Search Queries.csv'), [
  'Time,Search Query',
  '2025-03-02,project linchpin',
].join('\n'));
fs.writeFileSync(path.join(fixture, 'Shares.csv'), [
  'Date,ShareLink,ShareCommentary,SharedUrl',
  '2025-05-01,https://www.linkedin.com/posts/example-share,Context,https://example.test/source',
].join('\n'));
fs.writeFileSync(path.join(fixture, 'Member_Follows.csv'), [
  'Date,Status,FullName',
  '2025-04-01,Followed,Example Person',
].join('\n'));
fs.writeFileSync(path.join(fixture, 'Company Follows.csv'), [
  'Organization,Followed On',
  'Example Organization,2025-03-01',
].join('\n'));
fs.writeFileSync(path.join(fixture, 'Votes.csv'), [
  'Date,Link,OptionText',
  '2025-02-01,https://www.linkedin.com/posts/example-vote,Option A',
].join('\n'));
fs.writeFileSync(path.join(fixture, 'Saved_Items.csv'), [
  'savedItem,CreatedTime',
  'https://www.linkedin.com/posts/example-saved-variant,2025-01-01',
].join('\n'));

execFileSync(process.execPath, [
  'tools/import-linkedin-attention.mjs',
  '--input', fixture,
  '--since', '2024-07-13',
  '--as-of', '2026-07-13',
  '--output', output,
], { cwd: root, stdio: 'pipe' });

const rows = fs.readFileSync(output, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
assert.equal(rows.length, 11);
assert.deepEqual(
  new Set(rows.map(row => row.category)),
  new Set(['reactions', 'saved_items', 'comments', 'search_queries', 'shares', 'member_follows', 'company_follows', 'votes']),
);
assert.ok(rows.some(row => row.url === 'https://www.linkedin.com/posts/example-share'));
assert.ok(rows.some(row => row.activity_summary === 'Example Person'));
assert.ok(rows.some(row => row.activity_summary === 'Example Organization'));
assert.ok(rows.some(row => row.activity_summary === 'Option A'));
assert.ok(rows.some(row => row.activity_summary === 'A literal "quote" in an unquoted comment'));
assert.ok(rows.some(row => row.activity_summary === 'A multiline comment with a "bare" quote'));
assert.ok(rows.some(row => row.activity_summary === 'A backslash "quote"'));
assert.ok(rows.every(row => row.graph_effect === 'none'));
assert.ok(rows.every(row => row.evidence_state === 'observed'));
assert.ok(rows.every(row => row.publication_status === 'private_intake'));
assert.ok(rows.every(row => row.provenance.source_sha256.length === 64));
assert.ok(!fs.readFileSync(output, 'utf8').includes('private@example.test'), 'unselected private fields must not leak');
assert.ok(!fs.readFileSync(output, 'utf8').includes('too-old'), 'rows outside the requested window must be excluded');

fs.rmSync(fixture, { recursive: true, force: true });
console.log('linkedin-attention.test.js: OK');
