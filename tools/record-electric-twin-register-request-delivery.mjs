#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { recordDeliveryCustody } from './lib/electric-twin-register-request-delivery-core.mjs';

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dispatch-dir') {
      options.dispatchDir = argv[++index];
      assert.ok(options.dispatchDir, '--dispatch-dir requires a path');
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
    '  node tools/record-electric-twin-register-request-delivery.mjs \\',
    '    --dispatch-dir build/source-acquisition/electric-twin-register-of-members/<immutable-run-id>/dispatch/<dispatch-event> \\',
    '    --input data/local/electric-twin-register-of-members-delivery.json',
    '',
    'The tool preserves delivery evidence and calculates an operational five-working-day checkpoint.',
    'It has no network, email, postal, carrier-authentication, or legal-adjudication capability.',
  ].join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  console.log(JSON.stringify(recordDeliveryCustody(options), null, 2));
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
