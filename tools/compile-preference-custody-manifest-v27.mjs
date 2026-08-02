import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceCustodyManifestV27,
  renderPreferenceCustodyManifestV27Markdown
} from './lib/preference-custody-manifest-v27.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v26.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['tools/compile-preference-identity-boundary-assurance.mjs'], { stdio: 'inherit' });

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v27.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v27.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor-v27.md';

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const baseBuild = JSON.parse(
  readFileSync('build/research/preference-custody-laboratory-floor-v26.json', 'utf8')
);
const identityBuild = JSON.parse(
  readFileSync('build/research/preference-identity-boundary-assurance.json', 'utf8')
);

const compiled = compilePreferenceCustodyManifestV27(manifest, baseBuild, identityBuild);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceCustodyManifestV27Markdown(compiled));
console.log(`compiled ${compiled.manifest_id} -> ${jsonPath}, ${markdownPath}`);
