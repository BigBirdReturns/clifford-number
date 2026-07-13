#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDisclosureSourceCoverage, validateFecBulkManifest } from './lib/disclosure-spine.mjs';

export function validateDisclosureSpine({
  root = process.cwd(),
  matrixFile = 'data/research/presidential-disclosure-source-coverage.json',
  bulkManifestFile = 'data/research/fec-bulk-oppexp-2004-manifest.json',
} = {}) {
  try {
    const matrix = JSON.parse(fs.readFileSync(path.join(root, matrixFile), 'utf8'));
    const bulkManifest = JSON.parse(fs.readFileSync(path.join(root, bulkManifestFile), 'utf8'));
    const errors = validateDisclosureSourceCoverage(matrix).map(message => ({
      code: 'invalid-disclosure-spine',
      file: matrixFile,
      message,
    }));
    errors.push(...validateFecBulkManifest(bulkManifest).map(message => ({
      code: 'invalid-fec-bulk-manifest',
      file: bulkManifestFile,
      message,
    })));
    return { ok: errors.length === 0, errors };
  } catch (error) {
    return { ok: false, errors: [{ code: 'unreadable-disclosure-spine', file: matrixFile, message: error.message }] };
  }
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const result = validateDisclosureSpine();
  if (!result.ok) {
    console.error(result.errors.map(error => `- [${error.code}] ${error.file}: ${error.message}`).join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Presidential disclosure source spine: OK');
  }
}
