#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root, readJson, loadAll, uniq } from './lib/ledger.mjs';

const data = loadAll();
const surfaceGraph = readJson('build/surface-graph.json');
const hopGraph = readJson('build/hop-graph.json');
const scores = readJson('build/scores.json');
const migration = fs.existsSync(path.join(root, 'build/migration-summary.json')) ? readJson('build/migration-summary.json') : null;

const findings = [];
function add(type, priority, title, observed, action, refs = []) {
  findings.push({ id: `finding-${String(findings.length + 1).padStart(3, '0')}`, type, priority, title, observed, action, graph_effect: 'none', refs });
}

for (const org of scores.organizations.filter(o => o.surface_factory || o.surface_count >= 3)) {
  const hasSurfaces = org.surface_count > 0;
  add(
    'surface_factory',
    org.organization_id === 'electric-twin' ? 'high' : 'medium',
    hasSurfaces ? `${org.label} behaves as a surface factory` : `${org.label} is marked as a surface factory but has not been decomposed yet`,
    hasSurfaces
      ? `${org.label} appears across ${org.surface_count} surface(s): ${org.surfaces.join(', ')}. Secondary types: ${org.secondary_surface_types.join(', ') || 'none'}.`
      : `${org.label} is a known factory candidate in canonical data, but no bounded surfaces have been added to the ledger yet.`,
    'Review whether each surface is correctly bounded. Add missing customer, investor, board, filing, deployment, and procurement surfaces as separate rows rather than broad organization edges.',
    org.surfaces,
  );
}

for (const actor of scores.actors.filter(a => a.governance_replacement_score > 0 || a.recurrence_score > 0)) {
  add(
    'surface_type_recurrence',
    actor.actor_id === 'ben-warner' ? 'high' : 'medium',
    `${actor.label} shows recurring surface logic`,
    `${actor.label} has ${actor.surface_density} surfaces and secondary types ${actor.secondary_surface_types.join(', ')}. Governance replacement score: ${actor.governance_replacement_score}.`,
    'Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.',
    actor.surfaces,
  );
}

for (const [actorId, pathObj] of Object.entries(hopGraph.shortest_paths)) {
  if (actorId === 'matt-clifford') continue;
  if (pathObj.number === null) {
    const actor = data.actors.find(a => a.id === actorId);
    const actorScore = scores.actors.find(a => a.actor_id === actorId);
    if (actorScore?.surface_density > 0) {
      add(
        'island_with_surfaces',
        'medium',
        `${actor?.label ?? actorId} has surfaces but no Clifford path`,
        `${actor?.label ?? actorId} participates in ${actorScore.surface_density} surface(s), but no valid shared-surface path to Matt Clifford exists.`,
        'Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.',
        actorScore.surfaces,
      );
    }
  }
}

const broadNames = new Set(data.organizations.filter(o => o.broad_institution).map(o => o.label));
for (const surface of surfaceGraph.surfaces) {
  const broadParticipants = (surface.participants ?? []).filter(p => p.participant_type === 'organization').map(p => data.organizations.find(o => o.id === p.organization_id)).filter(o => o?.broad_institution);
  if (broadParticipants.length && surface.hop_eligible) {
    add(
      'broad_institution_guard',
      'high',
      `${surface.surface_label} contains broad institution context`,
      `Broad venues present: ${broadParticipants.map(o => o.label).join(', ')}. This is acceptable only because hops are generated from actor co-participation, not from the broad institution itself.`,
      'Verify this surface is tightly named and bounded. If it is merely an office or agency, mark it hop_eligible=false.',
      [surface.surface_id],
    );
  }
}

for (const chain of (scores.chains ?? [])) {
  add(
    'laundering_chain',
    'high',
    `${chain.chain_label} is a scored laundering chain with no Clifford hop`,
    `Chain spans ${chain.laundering_chain_score}/${chain.laundering_chain_max} stage categories (${chain.stage_categories.join(', ')}); machine_score ${chain.machine_score}; weakest evidence ${chain.evidence_class}. It does not create a Clifford hop.`,
    'Strengthen the weakest stage receipts (e.g. confirm procurement award IDs/amounts/dates) before any UI weight upgrade. Never convert a chain into a hop without a bounded shared-participation surface.',
    chain.surfaces,
  );
}

if (migration) {
  add(
    'migration_queue',
    'high',
    'Full master doc has been classified, not blindly migrated',
    `ingest-master classified ${migration.total_rows} typed rows. Buckets: ${JSON.stringify(migration.bucket_counts)}.`,
    'Review build/migration-review.md and promote rows into surfaces/participation ledgers only when boundedness is explicit.',
    ['build/migration-review.md'],
  );
}

const md = [
  '# Scout Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '> graph_effect: none. This is a research queue, not graph data.',
  '',
  `Findings: ${findings.length}`,
  '',
  ...findings.map(f => [
    `## ${f.id}: ${f.title}`,
    '',
    `- Type: ${f.type}`,
    `- Priority: ${f.priority}`,
    `- graph_effect: ${f.graph_effect}`,
    '',
    '**Observed**',
    '',
    f.observed,
    '',
    '**Required action**',
    '',
    f.action,
    '',
    f.refs?.length ? `Refs: ${f.refs.map(r => `\`${r}\``).join(', ')}` : '',
    '',
    '---',
    '',
  ].join('\n'))
].join('\n');

fs.writeFileSync(path.join(root, 'build/scout-report.md'), md + '\n');
fs.writeFileSync(path.join(root, 'build/scout-report.json'), JSON.stringify({ generated: new Date().toISOString(), graph_effect: 'none', findings }, null, 2) + '\n');
console.log(`scout-surfaces: ${findings.length} findings.`);
