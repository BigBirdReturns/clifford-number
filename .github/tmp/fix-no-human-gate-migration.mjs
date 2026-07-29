#!/usr/bin/env node
import fs from 'node:fs';

const target = '.github/tmp/apply-no-human-gate-migration.mjs';
const source = fs.readFileSync(target, 'utf8');
const before = '${arcadiaCompilation.manifest.counts.unsequenced_claims}';
const after = '\\${arcadiaCompilation.manifest.counts.unsequenced_claims}';
const occurrences = source.split(before).length - 1;
if (occurrences !== 2) throw new Error(`expected two unescaped Arcadia interpolation tokens, found ${occurrences}`);
fs.writeFileSync(target, source.replaceAll(before, after));
console.log('fixed two migration-carrier interpolation tokens');
