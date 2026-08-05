import { readFileSync } from 'node:fs';
import {
  loadPreferenceCustodyV46SourceBundle,
  validatePreferenceCustodyManifestV47,
  validatePreferenceCustodyManifestV47Build
} from './lib/preference-custody-manifest-v47.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v47.json';
const buildPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v47.json';
const load = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = load(manifestPath);
const build = load(buildPath);
const baseBuild = load('build/research/preference-custody-laboratory-floor-v46.json');
const targetBuild = load('build/research/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.json');
const targetFixture = load(manifest.extension_control.source_fixture_path);
const baseSources = loadPreferenceCustodyV46SourceBundle(load);
const errors = [
  ...validatePreferenceCustodyManifestV47(manifest),
  ...validatePreferenceCustodyManifestV47Build(build, manifest, baseBuild, targetBuild, targetFixture, baseSources)
];
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('validated Preference Custody laboratory floor v47');
