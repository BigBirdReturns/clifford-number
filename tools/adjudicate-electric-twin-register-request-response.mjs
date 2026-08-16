#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { recordResponseAdjudication } from './lib/electric-twin-register-request-response-adjudication-core.mjs';

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--response-dir') {
      options.responseDir = argv[++index];
      assert.ok(options.responseDir, '--response-dir requires a path');
    } else if (arg === '--input') {
      options.inputPath = argv[++index];
      assert.ok(options.inputPath, '--input requires a path');
    } else if (arg === '--help') {
      options.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function usage() {
  return [
    'Usage:',
    '  node tools/adjudicate-electric-twin-register-request-response.mjs \\',
    '    --response-dir build/source-acquisition/electric-twin-register-of-members/<run>/dispatch/<dispatch>/delivery/<delivery>/response/<response> \\',
    '    --input data/local/electric-twin-register-of-members-response-adjudication.json',
    '',
    'The tool re-verifies the complete private custody chain and records a source-addressed human review. It does not verify semantic correctness or authorize any canonical mutation.',
  ].join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  console.log(JSON.stringify(recordResponseAdjudication(options), null, 2));
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  }
}
