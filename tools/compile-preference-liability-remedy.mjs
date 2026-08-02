import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceLiabilityRemedyFixture,
  renderPreferenceLiabilityRemedyMarkdown
} from './lib/preference-liability-remedy.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/liability-remedy.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-liability-remedy.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-liability-remedy.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceLiabilityRemedyFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceLiabilityRemedyMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
