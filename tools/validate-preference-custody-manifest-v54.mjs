import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  loadPreferenceCustodyV53SourceBundle,
  validatePreferenceCustodyManifestV54,
  validatePreferenceCustodyManifestV54Build
} from './lib/preference-custody-manifest-v54.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v54.json';
const buildPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v54.json';
const load = path => JSON.parse(readFileSync(path, 'utf8'));

let manifest;
try {
  manifest = load(manifestPath);
} catch (error) {
  console.error(`- Preference Custody v54 manifest could not be read: ${error.message}`);
  process.exit(1);
}

const manifestErrors = validatePreferenceCustodyManifestV54(manifest);
if (manifestErrors.length) {
  console.error(manifestErrors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}

if (!existsSync('build/research/preference-custody-laboratory-floor-v53.json')) {
  execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v53.mjs'], { stdio: 'inherit' });
}
if (!existsSync('build/research/preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.json')) {
  execFileSync(process.execPath, ['tools/compile-preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.mjs'], { stdio: 'inherit' });
}

let build;
try {
  build = load(buildPath);
} catch (error) {
  console.error(`- Preference Custody v54 build could not be read: ${error.message}`);
  process.exit(1);
}

const baseBuild = load('build/research/preference-custody-laboratory-floor-v53.json');
const targetBuild = load('build/research/preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.json');
const targetFixture = load(manifest.extension_control.source_fixture_path);
const baseSources = loadPreferenceCustodyV53SourceBundle(load);
const errors = validatePreferenceCustodyManifestV54Build(
  build,
  manifest,
  baseBuild,
  targetBuild,
  targetFixture,
  baseSources
);
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`validated ${build.manifest_id} from ${buildPath}`);
