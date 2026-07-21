#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import {
  computeCorridors,
  denseSurfaces,
  diagnosePathFilters,
  groupDenseSurface,
  selectBudgetedParticipants,
  shortestFilteredPath,
  summarizeClusters,
  surfaceTypeGroups
} from '../src/visual-aperture-core.mjs';
import {
  buildVisualApertureScaleFixture,
  summarizeVisualApertureScaleFixture,
  syntheticActorId
} from './visual-aperture-scale-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(root, 'build', 'metrics');
const jsonPath = path.join(outputDirectory, 'visual-aperture-scale.json');
const markdownPath = path.join(outputDirectory, 'visual-aperture-scale.md');

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  if (!sorted.length) return 0;
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

function round(value) {
  return Number(Number(value).toFixed(3));
}

function benchmark(name, operation, describe, { warmups = 1, iterations = 7 } = {}) {
  let result;
  for (let index = 0; index < warmups; index += 1) result = operation();
  const samples = [];
  for (let index = 0; index < iterations; index += 1) {
    const start = performance.now();
    result = operation();
    samples.push(performance.now() - start);
  }
  return {
    name,
    iterations,
    median_ms: round(percentile(samples, 0.5)),
    p95_ms: round(percentile(samples, 0.95)),
    minimum_ms: round(Math.min(...samples)),
    maximum_ms: round(Math.max(...samples)),
    output: describe(result)
  };
}

function scenarioMeasurement(definition) {
  const fixture = buildVisualApertureScaleFixture(definition);
  const summary = summarizeVisualApertureScaleFixture(fixture);
  const dense = fixture.surfaceGraph.surfaces.find(surface => surface.surface_id === fixture.dense_surface_id);
  const labels = new Map(fixture.surfaceGraph.actors.map(actor => [actor.id, actor.label]));
  const pinnedIds = new Set([0, 1, 2, 3].map(syntheticActorId));
  const targetActor = syntheticActorId(definition.hopEdgeCount);
  const family = 'policy';
  const timings = [
    benchmark(
      'summarize_clusters',
      () => summarizeClusters(fixture.surfaceGraph),
      result => ({ families: result.length, surfaces: result.reduce((sum, item) => sum + item.surfaceCount, 0) })
    ),
    benchmark(
      'compute_corridors',
      () => computeCorridors(fixture.surfaceGraph),
      result => ({ corridors: result.length, maximum_family_pairs: fixture.expected.maximum_family_pairs })
    ),
    benchmark(
      'surface_type_groups',
      () => surfaceTypeGroups(fixture.surfaceGraph, family),
      result => ({ family, groups: result.length, surfaces: result.reduce((sum, item) => sum + item.surfaceCount, 0) })
    ),
    benchmark(
      'dense_surface_ordering',
      () => denseSurfaces(fixture.surfaceGraph, { minimumActors: 2 }),
      result => ({ surfaces: result.length, largest_actor_count: result[0]?.actorCount ?? 0 })
    ),
    benchmark(
      'dense_role_grouping',
      () => groupDenseSurface(dense),
      result => ({ groups: result.length, participants: result.reduce((sum, item) => sum + item.count, 0) })
    ),
    benchmark(
      'bracket_budget_selection',
      () => selectBudgetedParticipants(dense, { budget: 36, pinnedIds, labels }),
      result => ({ visible: result.visible.length, hidden_by_budget: result.hiddenByBudget, total_actors: result.totalActors })
    ),
    benchmark(
      'filtered_shortest_path',
      () => shortestFilteredPath(fixture.hopGraph, syntheticActorId(0), targetActor, { asOf: '2024', evidenceFloor: 'official' }),
      result => ({ steps: result?.number ?? null, actors: result?.actorPath?.length ?? 0 })
    ),
    benchmark(
      'blocked_route_diagnostics',
      () => diagnosePathFilters(fixture.hopGraph, { asOf: '2035', evidenceFloor: 'official' }),
      result => ({ total_edges: result.totalEdges, traversable_edges: result.traversableEdges, time_blocked_bases: result.timeBlockedBases })
    )
  ];
  return {
    id: definition.id,
    fixture: summary,
    expected: fixture.expected,
    route_probe: { from: syntheticActorId(0), to: targetActor },
    timings
  };
}

const definitions = [
  { id: 'representative', actorCount: 1000, surfaceCount: 250, denseRosterSize: 500, hopEdgeCount: 200, participantsPerSurface: 8 },
  { id: 'adversarial', actorCount: 5000, surfaceCount: 1200, denseRosterSize: 5000, hopEdgeCount: 1000, participantsPerSurface: 8 }
];

const mapOverviewSource = fs.readFileSync(path.join(root, 'src', 'visual-aperture-part-5.js'), 'utf8');
const result = {
  schema_version: 'clifford-visual-aperture-scale-baseline@1',
  status: 'measurement_only_no_budget_enforced',
  generated_at: new Date().toISOString(),
  graph_effect: 'none',
  conclusion_generated: false,
  environment: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    cpu_model: os.cpus()[0]?.model ?? null,
    logical_cpus: os.cpus().length,
    total_memory_bytes: os.totalmem()
  },
  source_observations: {
    map_evidence_overview_serializes_all_participants: /rows:\s*participants\.map\(/.test(mapOverviewSource),
    interpretation: 'This is a source-level observation of the current baseline. The browser workflow records the actual row count and interaction cost.'
  },
  scenarios: definitions.map(scenarioMeasurement),
  interpretation_contract: {
    what_this_is: 'Environment-specific baseline timing and output-cardinality measurements for deterministic synthetic compiled artifacts.',
    what_this_is_not: 'A universal performance guarantee, a real-person dataset, a graph finding, or evidence that Phase 4 scale hardening is complete.',
    next_action: 'Use the recorded baseline to declare budgets and implement bounded rendering, indexes, caching, and failure-state behavior in a separate Phase 4b change.'
  }
};

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);

const lines = [
  '# Visual aperture scale baseline',
  '',
  `Generated: ${result.generated_at}`,
  '',
  '> Environment-specific measurement only. No Phase 4 performance budget is enforced by this file.',
  '',
  `Map evidence overview serializes all participants: ${result.source_observations.map_evidence_overview_serializes_all_participants}`,
  ''
];
for (const scenario of result.scenarios) {
  lines.push(
    `## ${scenario.id}`,
    '',
    `- Actors: ${scenario.fixture.actors}`,
    `- Bounded surfaces: ${scenario.fixture.surfaces}`,
    `- Participation rows: ${scenario.fixture.participations}`,
    `- Dense roster actors: ${scenario.fixture.dense_roster_actors}`,
    `- Hop edges: ${scenario.fixture.hop_edges}`,
    '',
    '| Operation | Median ms | p95 ms | Output |',
    '|---|---:|---:|---|'
  );
  for (const timing of scenario.timings) {
    lines.push(`| ${timing.name} | ${timing.median_ms} | ${timing.p95_ms} | \`${JSON.stringify(timing.output)}\` |`);
  }
  lines.push('');
}
lines.push(
  '## Boundary',
  '',
  result.interpretation_contract.what_this_is_not,
  '',
  `Next: ${result.interpretation_contract.next_action}`,
  ''
);
fs.writeFileSync(markdownPath, `${lines.join('\n')}\n`);

console.log(`measure-visual-aperture-scale: wrote ${path.relative(root, jsonPath)} and ${path.relative(root, markdownPath)}`);
