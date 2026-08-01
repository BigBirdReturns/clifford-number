import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceCustodyManifest,
  renderPreferenceCustodyManifestMarkdown
} from './lib/preference-custody-manifest.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor.md';

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const buildsByPath = Object.fromEntries(manifest.controls.map(control => [
  control.build_artifact_path,
  JSON.parse(readFileSync(control.build_artifact_path, 'utf8'))
]));
const compiled = compilePreferenceCustodyManifest(manifest, buildsByPath);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceCustodyManifestMarkdown(compiled));
console.log(`compiled ${compiled.manifest_id} -> ${jsonPath}, ${markdownPath}`);
