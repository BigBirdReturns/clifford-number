import { readFileSync } from 'node:fs';
import {
  validatePerformativeBuild,
  validatePerformativeFixture
} from './lib/performative-synthetic-constituency.mjs';

const fixturePath = process.argv[2] ?? 'data/research/performative-synthetic-constituencies/exposure-confounding.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/performative-synthetic-constituency-fixture.json';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePerformativeFixture(fixture).map(error => `fixture: ${error}`),
  ...validatePerformativeBuild(compiled).map(error => `build: ${error}`)
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('performative synthetic constituency fixture: PASS');
}
