import { readFileSync } from 'node:fs';
import { validatePreferenceCustodyManifestV39, validatePreferenceCustodyManifestV39Build } from './lib/preference-custody-manifest-v39.mjs';
const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v39.json';
const buildPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v39.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const baseBuild = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v38.json', 'utf8'));
const candidateBuild = JSON.parse(readFileSync('build/research/preference-candidate-pair-blocking-recall-assurance.json', 'utf8'));
const candidateFixture = JSON.parse(readFileSync(manifest.extension_control.source_fixture_path, 'utf8'));
const baseSources = {
  manifest: JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v38.json', 'utf8')),
  baseBuild: JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v37.json', 'utf8')),
  confidenceBuild: JSON.parse(readFileSync('build/research/preference-linkage-confidence-adjudication-assurance.json', 'utf8')),
  confidenceFixture: JSON.parse(readFileSync('data/research/preference-custody/linkage-confidence-adjudication-assurance.fixture.json', 'utf8'))
};
const errors = [...validatePreferenceCustodyManifestV39(manifest), ...validatePreferenceCustodyManifestV39Build(build, manifest, baseBuild, candidateBuild, candidateFixture, baseSources)];
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('validated Preference Custody laboratory floor v39');
