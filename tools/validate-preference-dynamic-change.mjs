import { readFileSync } from 'node:fs';
import {
  validatePreferenceDynamicChangeBuild,
  validatePreferenceDynamicChangeFixture
} from './lib/preference-dynamic-change.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/dynamic-change.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-dynamic-change.json';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceDynamicChangeFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceDynamicChangeBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Dynamic preference change, composition, and measurement custody: PASS');
}
