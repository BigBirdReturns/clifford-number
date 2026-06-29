import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['tools/update-sweep.mjs'], { encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr);
const report = fs.readFileSync('docs/update-sweep.md', 'utf8');
assert.match(report, /# Update sweep/);
assert.match(report, /## Evidence classes/);
assert.match(report, /## Edge statuses/);

const manifest = JSON.parse(fs.readFileSync('cases.json', 'utf8'));
assert.ok(manifest.cases.some((item) => item.id === manifest.default_case_id));

console.log('Update sweep tests OK.');
