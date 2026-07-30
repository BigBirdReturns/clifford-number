#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'build/lake-index/objects.jsonl');
const compatibilityView = path.join(root, 'build/lake-object-index.json');

assert.ok(fs.existsSync(source), 'authoritative Wave 18 object shard is missing');
assert.ok(!fs.existsSync(compatibilityView), 'retired object monolith unexpectedly exists');

const objects = fs.readFileSync(source, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));

fs.mkdirSync(path.dirname(compatibilityView), { recursive: true });
fs.writeFileSync(compatibilityView, `${JSON.stringify({
  schema_version: 'wave-19-authoritative-object-view@1',
  source: 'build/lake-index/objects.jsonl',
  objects
})}\n`);

try {
  await import('./build-lake-generator-contracts-wave-19.mjs');
} finally {
  fs.rmSync(compatibilityView, { force: true });
}

assert.ok(!fs.existsSync(compatibilityView), 'ephemeral Wave 19 object view was not removed');
