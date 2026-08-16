#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  recordResponseSecondPartyReview,
} from './lib/electric-twin-register-request-response-second-party-review-core.mjs';

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--adjudication-dir') {
      options.adjudicationDir = argv[++index];
      assert.ok(options.adjudicationDir, '--adjudication-dir requires a path');
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
    '  node tools/second-party-review-electric-twin-register-request-response.mjs \\',
    '    --adjudication-dir build/source-acquisition/electric-twin-register-of-members/<run>/dispatch/<dispatch>/delivery/<delivery>/response/<response>/adjudication/<first-review> \\',
    '    --input data/local/electric-twin-register-of-members-response-second-party-review.json',
    '',
    'The tool re-verifies the full private custody chain and records an independent review of every first-review finding. It does not verify reviewer independence or authorize canonical mutation.',
  ].join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  console.log(JSON.stringify(recordResponseSecondPartyReview(options), null, 2));
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
