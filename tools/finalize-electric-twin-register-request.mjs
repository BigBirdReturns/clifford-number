#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  DEFAULT_OUTPUT_ROOT,
  DEFAULT_PRIVATE_INPUT,
  finalizeRequestFiles,
} from './lib/electric-twin-register-request-core.mjs';
import { validateTrackedElectricTwinRequestPacket } from './validate-electric-twin-register-request-packet.mjs';

function parseArgs(argv) {
  const options = { inputPath: DEFAULT_PRIVATE_INPUT, outputDir: undefined, validateTracked: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input') {
      options.inputPath = argv[++index];
      assert.ok(options.inputPath, '--input requires a path');
    } else if (arg === '--output') {
      options.outputDir = argv[++index];
      assert.ok(options.outputDir, '--output requires a path');
    } else if (arg === '--validate-tracked') {
      options.validateTracked = true;
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
    '  node tools/finalize-electric-twin-register-request.mjs --validate-tracked',
    `  node tools/finalize-electric-twin-register-request.mjs --input ${DEFAULT_PRIVATE_INPUT} [--output ${DEFAULT_OUTPUT_ROOT}/<immutable-run-id>]`,
    '',
    'The tool only renders and hashes local source documents. It has no network, email, postal, or PDF capability.',
  ].join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.validateTracked) {
    console.log(JSON.stringify(validateTrackedElectricTwinRequestPacket()));
    return;
  }
  console.log(JSON.stringify(finalizeRequestFiles(options), null, 2));
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(`electric-twin request finalization refused: ${error.message}`);
    process.exitCode = 1;
  }
}
