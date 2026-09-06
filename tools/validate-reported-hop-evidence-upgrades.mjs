#!/usr/bin/env node
import { readJson, readJsonl } from './lib/ledger.mjs';
import { evaluateReportedHopEvidenceUpgrades } from './lib/reported-hop-evidence-upgrades.mjs';

const result = evaluateReportedHopEvidenceUpgrades({
  actors: readJson('data/canonical/actors.json').actors,
  contract: readJson('data/research/reported-hop-evidence-upgrades.json'),
  hopGraph: readJson('build/hop-graph.json'),
  participation: readJsonl('data/ledger/participation.jsonl'),
  surfaces: readJsonl('data/ledger/surfaces.jsonl'),
});

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
}

if (result.errors.length) {
  if (!process.argv.includes('--json')) {
    console.error(`validate-reported-hop-evidence-upgrades: ${result.errors.length} FAILURE(S)`);
    for (const error of result.errors) console.error(`  ${error.code}: ${error.detail}`);
  }
  process.exit(1);
}
if (!process.argv.includes('--json')) {
  const global = result.global;
  const anchor = result.anchor_components;
  const boundary = result.reported_ledger_boundary;
  console.log(
    'validate-reported-hop-evidence-upgrades: OK '
    + `(${global.basis_count} accepted bases: `
    + `${global.evidence_counts.official ?? 0} official, `
    + `${global.evidence_counts.primary_public ?? 0} primary_public, `
    + `${global.reported_basis_count} reported; `
    + `${global.disposition_count} failed-upgrade dispositions)`,
  );
  console.log(
    `  anchor components: ${result.anchor_actor_ids.length} declared anchor(s), `
    + `${anchor.actor_count} actors, ${anchor.edge_count} edges, `
    + `${anchor.basis_count} bases, ${anchor.reported_basis_count} reported`,
  );
  console.log(
    `  non-hop boundary: ${boundary.reported_participation_rows} reported participation rows `
    + `across ${boundary.reported_participation_surface_ids.length} surface(s); `
    + `${boundary.non_hop_surface_ids.length} surface IDs carrying reported ledger evidence remain outside accepted hops`,
  );
}
