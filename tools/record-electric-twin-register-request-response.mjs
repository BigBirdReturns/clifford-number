#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { recordResponseCustody } from './lib/electric-twin-register-request-response-core.mjs';

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--delivery-dir') {
      options.deliveryDir = argv[++index];
      assert.ok(options.deliveryDir, '--delivery-dir requires a path');
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
    '  node tools/record-electric-twin-register-request-response.mjs \\',
    '    --delivery-dir build/source-acquisition/electric-twin-register-of-members/<run>/dispatch/<dispatch>/delivery/<delivery> \\',
    '    --input data/local/electric-twin-register-of-members-response.json',
    '',
    'The tool preserves original response bytes and unverified disposition metadata. It has no network, email, postal, carrier-query, or messaging capability and does not adjudicate legal compliance or allottee identity.',
  ].join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  console.log(JSON.stringify(recordResponseCustody(options), null, 2));
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
