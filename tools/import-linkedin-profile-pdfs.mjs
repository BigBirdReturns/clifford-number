#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const helper = path.join(here, 'import-linkedin-profile-pdfs.py');
const bundled = path.join(
  os.homedir(),
  '.cache',
  'codex-runtimes',
  'codex-primary-runtime',
  'dependencies',
  'python',
  process.platform === 'win32' ? 'python.exe' : 'bin/python3',
);
const candidates = [
  process.env.PYTHON,
  bundled,
  process.platform === 'win32' ? 'py' : null,
  'python3',
  'python',
].filter(Boolean);

let lastFailure = null;
for (const executable of candidates) {
  if (path.isAbsolute(executable) && !fs.existsSync(executable)) continue;
  const prefix = executable === 'py' ? ['-3'] : [];
  const result = spawnSync(executable, [...prefix, helper, ...process.argv.slice(2)], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  if (!result.error) process.exit(result.status ?? 1);
  if (result.error.code !== 'ENOENT') {
    lastFailure = result.error;
    break;
  }
  lastFailure = result.error;
}

console.error('A Python 3 runtime with pypdf is required for LinkedIn profile-PDF intake.');
console.error('Set PYTHON to the interpreter path, then install pypdf in that environment.');
if (lastFailure) console.error(lastFailure.message);
process.exit(1);
