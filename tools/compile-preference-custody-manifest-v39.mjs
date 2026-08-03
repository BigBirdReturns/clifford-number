import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { compilePreferenceCustodyManifestV39, renderPreferenceCustodyManifestV39Markdown } from './lib/preference-custody-manifest-v39.mjs';
execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v38.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['tools/compile-preference-candidate-pair-blocking-recall-assurance.mjs'], { stdio: 'inherit' });
const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v39.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v39.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor-v39.md';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const baseBuild = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v38.json', 'utf8'));
const candidateBuild = JSON.parse(readFileSync('build/research/preference-candidate-pair-blocking-recall-assurance.json', 'utf8'));
const candidateFixture = JSON.parse(readFileSync(manifest.extension_control.source_fixture_path, 'utf8'));
const baseSources = {
  manifest: JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v38.json', 'utf8')),
  baseBuild: JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v37.json', 'utf8')),
  confidenceBuild: JSON.parse(readFileSync('build/research/preference-linkage-confidence-adjudication-assurance.json', 'utf8')),
  confidenceFixture: JSON.parse(readFileSync('data/research/preference-custody/linkage-confidence-adjudication-assurance.fixture.json', 'utf8'))
};
const compiled = compilePreferenceCustodyManifestV39(manifest, baseBuild, candidateBuild, candidateFixture, baseSources);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceCustodyManifestV39Markdown(compiled));
console.log(`compiled ${compiled.manifest_id} -> ${jsonPath}, ${markdownPath}`);
