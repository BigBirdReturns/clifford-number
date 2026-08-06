import { readFileSync } from 'node:fs';
import {
  loadPreferenceCustodyV47SourceBundle,
  validatePreferenceCustodyManifestV48,
  validatePreferenceCustodyManifestV48Build
} from './lib/preference-custody-manifest-v48.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v48.json';
const buildPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v48.json';
const load = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = load(manifestPath);
const manifestErrors = validatePreferenceCustodyManifestV48(manifest);
if (manifestErrors.length) {
  console.error(manifestErrors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
const build = load(buildPath);
const baseBuild = load('build/research/preference-custody-laboratory-floor-v47.json');
const targetBuild = load('build/research/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.json');
const targetFixture = load(manifest.extension_control.source_fixture_path);
const baseSources = loadPreferenceCustodyV47SourceBundle(load);
const errors = validatePreferenceCustodyManifestV48Build(build, manifest, baseBuild, targetBuild, targetFixture, baseSources);
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('validated Preference Custody laboratory floor v48');
