#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const wave16Active = fs.existsSync('data/project/lake-local-canonical-resolution-registry-wave-16.jsonl')
  && fs.existsSync('data/project/lake-subject-object-registry-wave-16.jsonl');

const steps = [
  ['ingest-master', 'tools/ingest-master.mjs'],
  ['build-hop-graph', 'tools/build-hop-graph.mjs'],
  ['score-deniability', 'tools/score-deniability.mjs'],
  ['scout-surfaces', 'tools/scout-surfaces.mjs'],
  ['compile-cases', 'tools/compile-cases.mjs'],
  ...(wave16Active ? [['project-subject-objects-cases-wave-16', 'tools/project-lake-subject-objects-wave-16.mjs', '--target=cases']] : []),
  ['compile-reporter-briefings', 'tools/compile-reporter-briefings.mjs'],
  ['build-public-catalog', 'tools/build-public-catalog.mjs'],
  ...(wave16Active ? [['project-subject-objects-catalog-wave-16', 'tools/project-lake-subject-objects-wave-16.mjs', '--target=catalog']] : []),
  ['build-canonical-subject-projection-wave-13', 'tools/build-lake-canonical-subject-projection-wave-13.mjs'],
  ...(!wave16Active ? [
    ['build-exact-canonical-subject-wave-14', 'tools/build-lake-exact-canonical-subject-wave-14.mjs'],
    ['finalize-exact-canonical-subject-wave-14', 'tools/finalize-lake-exact-canonical-subject-wave-14.mjs'],
    ['build-unresolved-subject-adjudication-wave-15', 'tools/build-lake-unresolved-subject-adjudication-wave-15.mjs']
  ] : [
    ['build-subject-integration-wave-16', 'tools/build-lake-subject-integration-wave-16.mjs']
  ]),
  ['build-report-frontier', 'tools/build-report-frontier.mjs'],
  ['render-report-frontier', 'tools/render-report-frontier.mjs'],
  ['build-next-ten-estates', 'tools/build-next-ten-estates.mjs'],
  ['build-estate-expansion', 'tools/build-estate-expansion.mjs'],
  ['build-estates', 'tools/build-estates.mjs'],
  ['build-estate-frontier-surveys', 'tools/build-estate-frontier-surveys.mjs'],
  ['build-estate-game-trails', 'tools/build-estate-game-trails.mjs'],
  ['build-core-thesis', 'tools/build-core-thesis.mjs'],
  ['build-estate-lens-audit', 'tools/build-estate-lens-audit.mjs'],
  ['build-security-state-organism', 'tools/build-security-state-organism.mjs'],
  ['build-estate-fanout', 'tools/build-estate-fanout.mjs'],
  ['build-estate-closures', 'tools/build-estate-closures.mjs'],
  ['render-estate-aperture', 'tools/render-estate-aperture.mjs'],
  ['render-gametrail-aperture', 'tools/render-gametrail-aperture.mjs'],
];

for (const [name, script, ...args] of steps) {
  const res = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`compile failed at ${name}`);
    process.exit(res.status ?? 1);
  }
}
console.log(`compile: done (${wave16Active ? 'Wave 16 live integration' : 'Wave 14/15 historical build path'})`);
