#!/usr/bin/env node
import { finalizePublicationArtifact } from './lib/publication-allowlist.mjs';
try {
  const result = finalizePublicationArtifact();
  console.log(`finalize-release-artifact: ${result.manifest.payload.file_count} payload files, ${result.manifest.payload.total_bytes} bytes, payload ${result.manifest.payload.sha256}, manifest ${result.manifest_sha256}`);
} catch (error) {
  console.error(`finalize-release-artifact: ${error.message}`);
  process.exitCode = 1;
}
