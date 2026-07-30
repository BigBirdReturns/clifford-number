#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePublicationArtifact } from './lib/publication-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = validatePublicationArtifact({ root, destination: path.join(root, 'dist') });
if (!result.ok) {
  console.error(`validate-publication-plan failed with ${result.failures.length} error(s):\n${result.failures.map(item => `- ${item}`).join('\n')}`);
  process.exit(1);
}
console.log(`validate-publication-plan: OK (${result.manifest.counts.files} files, ${result.manifest.combined_sha256})`);
