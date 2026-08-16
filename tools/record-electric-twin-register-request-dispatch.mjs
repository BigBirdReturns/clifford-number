#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { recordDispatchCustody } from './lib/electric-twin-register-request-dispatch-core.mjs';

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--source-dir') {
      options.sourceDir = argv[++index];
      assert.ok(options.sourceDir, '--source-dir requires a path');
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
    '  node tools/record-electric-twin-register-request-dispatch.mjs \\',
    '    --source-dir build/source-acquisition/electric-twin-register-of-members/<immutable-run-id> \\',
    '    --input data/local/electric-twin-register-of-members-dispatch.json',
    '',
    'The tool verifies and copies evidence of an externally performed postal dispatch.',
    'It has no network, email, postal, delivery-confirmation, or deadline-calculation capability.',
  ].join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  console.log(JSON.stringify(recordDispatchCustody(options), null, 2));
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
