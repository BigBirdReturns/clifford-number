import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceCustodyManifestV48,
  loadPreferenceCustodyV47SourceBundle,
  renderPreferenceCustodyManifestV48Markdown,
  validatePreferenceCustodyManifestV48
} from './lib/preference-custody-manifest-v48.mjs';

if (!existsSync('build/research/preference-custody-laboratory-floor-v47.json')) {
  execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v47.mjs'], { stdio: 'inherit' });
}
if (!existsSync('build/research/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.json')) {
  execFileSync(process.execPath, ['tools/compile-preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.mjs'], { stdio: 'inherit' });
}

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v48.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v48.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor-v48.md';
const load = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = load(manifestPath);
const manifestErrors = validatePreferenceCustodyManifestV48(manifest);
if (manifestErrors.length) {
  console.error(manifestErrors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
const baseBuild = load('build/research/preference-custody-laboratory-floor-v47.json');
const targetBuild = load('build/research/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.json');
const targetFixture = load(manifest.extension_control.source_fixture_path);
const baseSources = loadPreferenceCustodyV47SourceBundle(load);
const compiled = compilePreferenceCustodyManifestV48(manifest, baseBuild, targetBuild, targetFixture, baseSources);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceCustodyManifestV48Markdown(compiled));
console.log(`compiled ${compiled.manifest_id} -> ${jsonPath}, ${markdownPath}`);
