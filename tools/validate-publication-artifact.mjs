#!/usr/bin/env node
import { validatePublicationArtifact } from './lib/publication-allowlist.mjs';
try {
  const result = validatePublicationArtifact();
  console.log(`validate-publication-artifact: PASS (${result.manifest.payload.file_count} payload files, payload ${result.manifest.payload.sha256}, manifest ${result.manifest_sha256})`);
} catch (error) {
  console.error(`validate-publication-artifact: ${error.message}`);
  process.exitCode = 1;
}
