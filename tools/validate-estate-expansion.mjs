#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEstateExpansion } from './build-estate-expansion.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'data', 'intake', 'estate-expansion-01', 'manifest.json');
const committed = JSON.parse(fs.readFileSync(target, 'utf8'));
const rebuilt = buildEstateExpansion({ write: false });
assert.deepEqual(committed, rebuilt, 'committed estate-expansion manifest diverges from deterministic rebuild');
console.log(`validate-estate-expansion: OK — ${rebuilt.counts.first_ten_incomplete_layers_closed} first-pass closures, ${rebuilt.counts.second_cohort_estates} second-cohort estates`);
