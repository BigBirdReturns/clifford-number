#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const steps = [
  ['ingest-master', 'tools/ingest-master.mjs'],
  ['build-hop-graph', 'tools/build-hop-graph.mjs'],
  ['score-deniability', 'tools/score-deniability.mjs'],
  ['scout-surfaces', 'tools/scout-surfaces.mjs'],
  ['compile-cases', 'tools/compile-cases.mjs'],
  ['compile-reporter-briefings', 'tools/compile-reporter-briefings.mjs'],
  ['build-public-catalog', 'tools/build-public-catalog.mjs'],
  ['build-report-frontier', 'tools/build-report-frontier.mjs'],
  ['render-report-frontier', 'tools/render-report-frontier.mjs'],
  ['build-next-ten-estates', 'tools/build-next-ten-estates.mjs'],
  ['build-estate-expansion', 'tools/build-estate-expansion.mjs'],
  ['build-estates', 'tools/build-estates.mjs'],
  ['build-estate-fanout', 'tools/build-estate-fanout.mjs'],
  ['build-estate-closures', 'tools/build-estate-closures.mjs'],
  ['render-estate-aperture', 'tools/render-estate-aperture.mjs'],
];

for (const [name, script] of steps) {
  const res = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`compile failed at ${name}`);
    process.exit(res.status ?? 1);
  }
}
console.log('compile: done');
