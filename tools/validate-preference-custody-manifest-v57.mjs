import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadPreferenceCustodyV56SourceBundle, validatePreferenceCustodyManifestV57, validatePreferenceCustodyManifestV57Build } from './lib/preference-custody-manifest-v57.mjs';
const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v57.json';
const buildPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v57.json';
const load = path => JSON.parse(readFileSync(path, 'utf8'));
let manifest;
try { manifest = load(manifestPath); } catch (error) { console.error(`- Preference Custody v57 manifest could not be read: ${error.message}`); process.exit(1); }
const manifestErrors = validatePreferenceCustodyManifestV57(manifest);
if (manifestErrors.length) { console.error(manifestErrors.map(error => `- ${error}`).join('\n')); process.exit(1); }
if (!existsSync('build/research/preference-custody-laboratory-floor-v56.json')) execFileSync(process.execPath, ['test/preference-custody-manifest-v56.test.js'], { stdio: 'inherit' });
if (!existsSync('build/research/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.json')) execFileSync(process.execPath, ['tools/compile-preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.mjs'], { stdio: 'inherit' });
let build;
try { build = load(buildPath); } catch (error) { console.error(`- Preference Custody v57 build could not be read: ${error.message}`); process.exit(1); }
const baseBuild = load('build/research/preference-custody-laboratory-floor-v56.json');
const targetBuild = load('build/research/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.json');
const targetFixture = load(manifest.extension_control.source_fixture_path);
const baseSources = loadPreferenceCustodyV56SourceBundle(load);
const errors = validatePreferenceCustodyManifestV57Build(build, manifest, baseBuild, targetBuild, targetFixture, baseSources);
if (errors.length) { console.error(errors.map(error => `- ${error}`).join('\n')); process.exit(1); }
console.log(`validated ${manifest.manifest_id} from ${buildPath}`);
