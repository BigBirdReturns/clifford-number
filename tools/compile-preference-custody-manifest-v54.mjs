import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  compilePreferenceCustodyManifestV54,
  loadPreferenceCustodyV53SourceBundle,
  renderPreferenceCustodyManifestV54Markdown,
  validatePreferenceCustodyManifestV54
} from './lib/preference-custody-manifest-v54.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v54.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v54.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor-v54.md';
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

const baseBuild = load('build/research/preference-custody-laboratory-floor-v53.json');
const targetBuild = load('build/research/preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.json');
const targetFixture = load(manifest.extension_control.source_fixture_path);
const baseSources = loadPreferenceCustodyV53SourceBundle(load);

let build;
try {
  build = compilePreferenceCustodyManifestV54(
    manifest,
    baseBuild,
    targetBuild,
    targetFixture,
    baseSources
  );
} catch (error) {
  console.error(`- Preference Custody v54 deterministic compile failed: ${error.message}`);
  process.exit(1);
}

mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(build, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceCustodyManifestV54Markdown(build));
console.log(`compiled ${manifest.manifest_id} -> ${jsonPath}, ${markdownPath}`);
