import { readFileSync } from 'node:fs';
import { validatePreferenceCustodyManifestV38, validatePreferenceCustodyManifestV38Build } from './lib/preference-custody-manifest-v38.mjs';
const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v38.json';
const buildPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v38.json';
const baseBuildPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor-v37.json';
const confidenceBuildPath = process.argv[5] ?? 'build/research/preference-linkage-confidence-adjudication-assurance.json';
const confidenceFixturePath = process.argv[6] ?? 'data/research/preference-custody/linkage-confidence-adjudication-assurance.fixture.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const baseBuild = JSON.parse(readFileSync(baseBuildPath, 'utf8'));
const confidenceBuild = JSON.parse(readFileSync(confidenceBuildPath, 'utf8'));
const confidenceFixture = JSON.parse(readFileSync(confidenceFixturePath, 'utf8'));
const errors = [
  ...validatePreferenceCustodyManifestV38(manifest),
  ...validatePreferenceCustodyManifestV38Build(build, manifest, baseBuild, confidenceBuild, confidenceFixture)
];
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('validated Preference Custody laboratory floor v38');
