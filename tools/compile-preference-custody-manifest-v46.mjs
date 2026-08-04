import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceCustodyManifestV46,
  loadPreferenceCustodyV45SourceBundle,
  renderPreferenceCustodyManifestV46Markdown
} from './lib/preference-custody-manifest-v46.mjs';

if (!existsSync('build/research/preference-custody-laboratory-floor-v45.json')) execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v45.mjs'], { stdio: 'inherit' });
if (!existsSync('build/research/preference-linkage-interval-method-partition-replication-deployment-assurance.json')) execFileSync(process.execPath, ['tools/compile-preference-linkage-interval-method-partition-replication-deployment-assurance.mjs'], { stdio: 'inherit' });

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v46.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v46.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor-v46.md';
const load = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = load(manifestPath);
const baseBuild = load('build/research/preference-custody-laboratory-floor-v45.json');
const targetBuild = load('build/research/preference-linkage-interval-method-partition-replication-deployment-assurance.json');
const targetFixture = load(manifest.extension_control.source_fixture_path);
const baseSources = loadPreferenceCustodyV45SourceBundle(load);
const compiled = compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, baseSources);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceCustodyManifestV46Markdown(compiled));
console.log(`compiled ${compiled.manifest_id} -> ${jsonPath}, ${markdownPath}`);
