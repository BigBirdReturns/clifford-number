#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPublicationArtifact } from './lib/publication-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'dist');
const result = buildPublicationArtifact({ root, destination });
console.log(`build-pages: ${result.manifest.counts.files} manifest-authorized files, ${result.manifest.counts.held_surfaces} held surfaces, ${result.manifest.combined_sha256}`);
