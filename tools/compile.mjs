#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const steps = [
  ['ingest-master', 'tools/ingest-master.mjs'],
  ['build-hop-graph', 'tools/build-hop-graph.mjs'],
  ['score-deniability', 'tools/score-deniability.mjs'],
  ['scout-surfaces', 'tools/scout-surfaces.mjs'],
];

for (const [name, script] of steps) {
  const res = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`compile failed at ${name}`);
    process.exit(res.status ?? 1);
  }
}
console.log('compile: done');
