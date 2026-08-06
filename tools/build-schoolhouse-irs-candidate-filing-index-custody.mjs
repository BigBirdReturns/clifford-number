#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(process.execPath, [path.join(repoRoot, 'tools/validate-schoolhouse-irs-candidate-filing-index-custody.mjs')], {cwd:repoRoot,stdio:'inherit'});
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`schoolhouse_irs_candidate_filing_index_builder=${process.argv.includes('--write') ? 'write' : 'check'} source_layer=sealed`);
