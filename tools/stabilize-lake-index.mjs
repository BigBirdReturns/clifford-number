#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const indexPath = path.join(root, 'build/lake-index.json');
const objectPath = path.join(root, 'build/lake-object-index.json');
const gapsPath = path.join(root, 'build/lake-index-gaps.json');
const reportPath = path.join(root, 'reports/lake-index-census.md');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

const index = readJson(indexPath);
const objects = readJson(objectPath);
const gaps = readJson(gapsPath);
const fingerprintInput = [...index.files]
  .sort((a, b) => a.path.localeCompare(b.path))
  .map(file => `${file.path}\0${file.sha256}`)
  .join('\n') + '\n';
const fingerprint = crypto.createHash('sha256').update(fingerprintInput).digest('hex');

for (const target of [index.summary, objects, gaps]) {
  delete target.exact_head;
  delete target.exact_tree;
  target.source_fingerprint_sha256 = fingerprint;
}

writeJson(indexPath, index);
writeJson(objectPath, objects);
writeJson(gapsPath, gaps);

let report = fs.readFileSync(reportPath, 'utf8');
report = report.replace(/Exact head: `[^`]+`\s+Exact tree: `[^`]+`/m, `Source fingerprint: \`${fingerprint}\``);
if (!report.includes(`Source fingerprint: \`${fingerprint}\``)) {
  throw new Error('lake census report did not expose the stabilized source fingerprint');
}
fs.writeFileSync(reportPath, report);
console.log(`lake census stabilized: ${fingerprint}`);
