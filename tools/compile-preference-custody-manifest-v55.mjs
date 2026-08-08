import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  compilePreferenceCustodyManifestV55,
  loadPreferenceCustodyV54SourceBundle,
  renderPreferenceCustodyManifestV55Markdown,
  validatePreferenceCustodyManifestV55
} from './lib/preference-custody-manifest-v55.mjs';
const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v55.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v55.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor-v55.md';
const load = path => JSON.parse(readFileSync(path, 'utf8'));
let manifest;
try { manifest = load(manifestPath); } catch (error) { console.error(`- Preference Custody v55 manifest could not be read: ${error.message}`); process.exit(1); }
const manifestErrors = validatePreferenceCustodyManifestV55(manifest);
if (manifestErrors.length) { console.error(manifestErrors.map(error => `- ${error}`).join('\n')); process.exit(1); }
if (!existsSync('build/research/preference-custody-laboratory-floor-v54.json')) execFileSync(process.execPath, ['test/preference-custody-manifest-v54.test.js'], { stdio: 'inherit' });
if (!existsSync('build/research/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.json')) execFileSync(process.execPath, ['tools/compile-preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs'], { stdio: 'inherit' });
const baseBuild = load('build/research/preference-custody-laboratory-floor-v54.json');
const targetBuild = load('build/research/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.json');
const targetFixture = load(manifest.extension_control.source_fixture_path);
const baseSources = loadPreferenceCustodyV54SourceBundle(load);
let build;
try { build = compilePreferenceCustodyManifestV55(manifest, baseBuild, targetBuild, targetFixture, baseSources); } catch (error) { console.error(`- Preference Custody v55 deterministic compile failed: ${error.message}`); process.exit(1); }
mkdirSync(dirname(jsonPath), { recursive: true }); mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(build, null, 2) + '\n'); writeFileSync(markdownPath, renderPreferenceCustodyManifestV55Markdown(build));
console.log(`compiled ${manifest.manifest_id} -> ${jsonPath}, ${markdownPath}`);
