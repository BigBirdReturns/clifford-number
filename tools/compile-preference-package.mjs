import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferencePackageFixture,
  renderPreferencePackageMarkdown
} from './lib/preference-package.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/package-bargaining.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-package-bargaining.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-package-bargaining.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferencePackageFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferencePackageMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
