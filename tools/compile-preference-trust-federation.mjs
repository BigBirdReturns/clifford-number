import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceTrustFederationFixture,
  renderPreferenceTrustFederationMarkdown
} from './lib/preference-trust-federation.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/trust-federation.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-trust-federation.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-trust-federation.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceTrustFederationFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceTrustFederationMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
