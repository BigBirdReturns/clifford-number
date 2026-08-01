import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePerformativeFixture,
  renderPerformativeFixtureMarkdown
} from './lib/performative-synthetic-constituency.mjs';

const sourcePath = process.argv[2] ?? 'data/research/performative-synthetic-constituencies/exposure-confounding.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/performative-synthetic-constituency-fixture.json';
const markdownPath = process.argv[4] ?? 'build/research/performative-synthetic-constituency-fixture.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePerformativeFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPerformativeFixtureMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
