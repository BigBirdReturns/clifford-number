import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  compilePreferenceCustodyManifestV56,
  loadPreferenceCustodyV55SourceBundle,
  renderPreferenceCustodyManifestV56Markdown,
  validatePreferenceCustodyManifestV56
} from './lib/preference-custody-manifest-v56.mjs';
const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v56.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v56.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor-v56.md';
const load = path => JSON.parse(readFileSync(path, 'utf8'));
let manifest;
try { manifest = load(manifestPath); } catch (error) { console.error(`- Preference Custody v56 manifest could not be read: ${error.message}`); process.exit(1); }
const manifestErrors = validatePreferenceCustodyManifestV56(manifest);
if (manifestErrors.length) { console.error(manifestErrors.map(error => `- ${error}`).join('\n')); process.exit(1); }
if (!existsSync('build/research/preference-custody-laboratory-floor-v55.json')) execFileSync(process.execPath, ['test/preference-custody-manifest-v55.test.js'], { stdio: 'inherit' });
if (!existsSync('build/research/preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.json')) execFileSync(process.execPath, ['tools/compile-preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.mjs'], { stdio: 'inherit' });
const baseBuild = load('build/research/preference-custody-laboratory-floor-v55.json');
const targetBuild = load('build/research/preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.json');
const targetFixture = load(manifest.extension_control.source_fixture_path);
const baseSources = loadPreferenceCustodyV55SourceBundle(load);
let build;
try { build = compilePreferenceCustodyManifestV56(manifest, baseBuild, targetBuild, targetFixture, baseSources); } catch (error) { console.error(`- Preference Custody v56 deterministic compile failed: ${error.message}`); process.exit(1); }
mkdirSync(dirname(jsonPath), { recursive: true }); mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(build, null, 2) + '\n'); writeFileSync(markdownPath, renderPreferenceCustodyManifestV56Markdown(build));
console.log(`compiled ${manifest.manifest_id} -> ${jsonPath}, ${markdownPath}`);
