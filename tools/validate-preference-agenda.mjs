import { readFileSync } from 'node:fs';
import {
  validatePreferenceAgendaBuild,
  validatePreferenceAgendaFixture
} from './lib/preference-agenda.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/agenda-formation.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-agenda-formation.json';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceAgendaFixture(fixture).map(error => `fixture: ${error}`),
  ...validatePreferenceAgendaBuild(compiled).map(error => `build: ${error}`)
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('preference agenda formation fixture: PASS');
}
