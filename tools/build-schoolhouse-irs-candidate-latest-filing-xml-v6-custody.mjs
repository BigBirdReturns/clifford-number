#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validator = path.join(repoRoot, 'tools/validate-schoolhouse-irs-candidate-latest-filing-xml-v6-custody.mjs');
const result = spawnSync(process.execPath, [validator], {cwd: repoRoot, stdio: 'inherit'});
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`schoolhouse_irs_candidate_latest_filing_xml_v6_builder=${process.argv.includes('--write') ? 'write' : 'check'} source_layer=sealed_acquisition_v5 authored_layer=fresh_v6`);
