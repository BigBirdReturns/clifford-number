#!/usr/bin/env node
import fs from 'node:fs';
import { assertPublicOnly } from '../src/evidence.js';

const [input, output = 'data/dialog-public-directory.generated.json'] = process.argv.slice(2);
if (!input) {
  console.error('Usage: node tools/import-dialog-public-directory.mjs path/to/dialog.json [output.json]');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
const allowed = [];

for (const item of raw.public_directory ?? []) {
  const record = {
    name: item.name,
    title: item.title,
    status: 'public-directory-listing'
  };
  assertPublicOnly(record);
  allowed.push(record);
}

fs.mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify({ generated: new Date().toISOString(), records: allowed }, null, 2)}\n`);
console.log(`Wrote ${allowed.length} public-directory records to ${output}.`);
console.log('Private fields were not imported. This script only reads public_directory name/title records.');
