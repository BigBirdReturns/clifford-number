#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { loadCases } from './lib/ledger.mjs';

function run(name, script, extraArgs = []) {
  const res = spawnSync(process.execPath, [script, ...extraArgs], { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`compile failed at ${name}`);
    process.exit(res.status ?? 1);
  }
}

// Master-doc ingestion feeds the UK default case's migration artifacts only.
run('ingest-master', 'tools/ingest-master.mjs');

// Build the hop graph for every case (default first). Each case owns its
// ledger; the default case additionally mirrors to the legacy top-level paths.
const { defaultId, cases } = loadCases();
for (const c of cases) {
  run(`build-hop-graph:${c.id}`, 'tools/build-hop-graph.mjs', ['--case', c.id]);
}

// Scoring and scouting are default-case-only for now (they read the top-level
// build artifacts and UK-specific inputs). Other cases compile to hop graphs
// only until the scoring/scout layer is made case-aware.
console.log(`compile: scoring and scout run for the default case (${defaultId}) only for now.`);
run('score-deniability', 'tools/score-deniability.mjs');
run('scout-surfaces', 'tools/scout-surfaces.mjs');

console.log('compile: done');
