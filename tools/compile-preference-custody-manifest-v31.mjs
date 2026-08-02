import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceCustodyManifestV31,
  renderPreferenceCustodyManifestV31Markdown
} from './lib/preference-custody-manifest-v31.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v30.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['tools/compile-preference-identity-boundary-assurance.mjs'], { stdio: 'inherit' });

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v31.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v31.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor-v31.md';

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const baseBuild = JSON.parse(
  readFileSync('build/research/preference-custody-laboratory-floor-v30.json', 'utf8')
);
const identityBuild = JSON.parse(
  readFileSync('build/research/preference-identity-boundary-assurance.json', 'utf8')
);

const compiled = compilePreferenceCustodyManifestV31(manifest, baseBuild, identityBuild);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceCustodyManifestV31Markdown(compiled));
console.log(`compiled ${compiled.manifest_id} -> ${jsonPath}, ${markdownPath}`);
