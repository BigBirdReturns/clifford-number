#!/usr/bin/env node
/**
 * scout-graph.mjs — THE SCOUT (analyst)
 *
 * Reads graph.json and the master doc. Attacks the graph.
 * Writes candidate findings to findings/scout-inbox/.
 * NEVER writes to graph.json. NEVER edits the master doc.
 * graph_effect is always "none".
 *
 * Passes:
 *   1. island     — nodes with no path to the target
 *   2. alias      — nodes whose labels/ids look like the same actor
 *   3. corridor   — known institutional corridors that are partially mapped
 *   4. near-miss  — A→B and B→C in the graph but no A→C path
 *   5. questions  — open questions per island cluster
 *
 * Usage:
 *   node tools/scout-graph.mjs
 *   npm run scout
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shortestPath, buildAdjacency, indexGraph, normalizeText } from '../src/graph.js';

const __dir      = path.dirname(fileURLToPath(import.meta.url));
const root       = path.resolve(__dir, '..');
const graphPath  = path.join(root, 'graph.json');
const inboxPath  = path.join(root, 'findings/scout-inbox');
const corridorPath = path.join(root, 'data/scout/corridors.json');

const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
const { nodesById } = indexGraph(graph);
const adjacency = buildAdjacency(graph, { directed: false, includeTopology: false });

const date     = new Date().toISOString().slice(0, 10);
const findings = [];

// ── utility ───────────────────────────────────────────────────────────────────

function hasCliffordPath(nodeId) {
  try {
    return shortestPath(graph, nodeId) !== null;
  } catch {
    return false;
  }
}

function neighbors(nodeId) {
  return (adjacency.get(nodeId) ?? []).map(h => h.to);
}

function edgesFor(nodeId) {
  return graph.edges.filter(e => e.from === nodeId || e.to === nodeId);
}

function finding(type, actors, pattern, why, action) {
  findings.push({
    id:                     `finding-${date}-${String(findings.length + 1).padStart(3, '0')}`,
    status:                 'candidate',
    finding_type:           type,
    actors,
    observed_pattern:       pattern,
    why_it_matters:         why,
    required_human_action:  action,
    graph_effect:           'none',
  });
}

// ── pass 1: island detection ──────────────────────────────────────────────────

const islands = graph.nodes.filter(n => !hasCliffordPath(n.id));

// Group islands by shared neighbors
const islandGroups = new Map();
for (const island of islands) {
  const ns = neighbors(island.id).sort().join(',');
  const key = ns || '__isolated__';
  if (!islandGroups.has(key)) islandGroups.set(key, []);
  islandGroups.get(key).push(island);
}

for (const [neighborKey, group] of islandGroups) {
  const labels = group.map(n => n.label);
  const sharedNeighborLabels = neighborKey === '__isolated__'
    ? []
    : neighborKey.split(',').map(id => nodesById.get(id)?.label ?? id);

  const hasSharedNeighbors = sharedNeighborLabels.length > 0;

  finding(
    'island_cluster',
    labels,
    `${labels.length === 1 ? `Node "${labels[0]}"` : `${labels.length} nodes (${labels.slice(0,3).join(', ')}${labels.length > 3 ? '…' : ''})`} ${hasSharedNeighbors ? `share neighbors [${sharedNeighborLabels.slice(0,4).join(', ')}] but have` : 'have'} no path to the Clifford target.`,
    hasSharedNeighbors
      ? `These nodes are connected to each other but the cluster has no explicit ledger edge into the Clifford spine. The missing bridge is not inferred — it needs an explicit sourced row in the master doc.`
      : `This node is completely isolated. It has no edges at all. It may be a stub created by the compiler from a table row whose subject or object was a section header rather than an entity name.`,
    hasSharedNeighbors
      ? `Check whether any of [${sharedNeighborLabels.slice(0,4).join(', ')}] has an explicit sourced relationship to DSIT, ARIA, Dialog, Matt Clifford, or another spine node. If yes, add that row to the master doc. If no, flag as an island pending further research.`
      : `Review master doc for this entity. If it is a real node, add an explicit sourced edge connecting it to the spine. If it is a compilation artifact, add it to the entities canonical list with a note.`,
  );
}

// ── pass 2: alias detection ───────────────────────────────────────────────────

const normalised = graph.nodes.map(n => ({
  node: n,
  norm: normalizeText(n.label),
}));

const aliasGroups = new Map();
for (const { node, norm } of normalised) {
  // Find other nodes whose normalised label is a substring match
  for (const { node: other, norm: otherNorm } of normalised) {
    if (node.id === other.id) continue;
    if (norm.length < 4 || otherNorm.length < 4) continue;
    if (norm === otherNorm || otherNorm.includes(norm) || norm.includes(otherNorm)) {
      const key = [node.id, other.id].sort().join('||');
      if (!aliasGroups.has(key)) {
        aliasGroups.set(key, { a: node, b: other });
      }
    }
  }
}

for (const { a, b } of aliasGroups.values()) {
  finding(
    'alias_collision',
    [a.label, b.label],
    `"${a.label}" (id: ${a.id}) and "${b.label}" (id: ${b.id}) may refer to the same actor. Their normalised labels overlap.`,
    `If these are the same entity, all edges pointing to the longer/variant id are invisible when searching for the canonical name. The Clifford Number for one may be different from the other purely as a compilation artifact.`,
    `Confirm whether these are the same entity. If yes, add an alias entry in data/canonical/aliases.yml and ensure all edges use the canonical id. If no, add a note clarifying the distinction.`,
  );
}

// ── pass 3: corridor detection ────────────────────────────────────────────────

const CORRIDORS = fs.existsSync(corridorPath)
  ? JSON.parse(fs.readFileSync(corridorPath, 'utf8'))
  : [
      { name: 'Dialog', seeds: ['dialog', 'peter-thiel', 'auren-hoffman'] },
      { name: 'ARIA / DSIT', seeds: ['aria', 'dsit', 'aria-advanced-research-and-invention-agency'] },
      { name: 'No. 10 / Cabinet Office', seeds: ['cabinet-office', 'no-10', '10-downing-street-data-science-unit-10ds'] },
      { name: 'Electric Twin / No. 10 alumni', seeds: ['electric-twin', 'ben-warner', 'alex-cooper', 'simon-case'] },
    ];

for (const corridor of CORRIDORS) {
  const presentNodes = corridor.seeds
    .map(id => nodesById.get(id))
    .filter(Boolean);

  if (presentNodes.length === 0) continue;

  const connected  = presentNodes.filter(n => hasCliffordPath(n.id));
  const unconnected = presentNodes.filter(n => !hasCliffordPath(n.id));

  if (unconnected.length > 0 && connected.length > 0) {
    finding(
      'institutional_corridor',
      [...connected.map(n => n.label), ...unconnected.map(n => n.label)],
      `Corridor "${corridor.name}": ${connected.length} node(s) have Clifford paths (${connected.map(n => n.label).join(', ')}), but ${unconnected.length} node(s) do not (${unconnected.map(n => n.label).join(', ')}).`,
      `These nodes share the same institutional corridor. The unconnected ones are probably not true islands — the missing edge likely exists in your research but has not been added to the master doc yet.`,
      `Check the master doc for an explicit sourced row connecting [${unconnected.map(n => n.label).join(', ')}] to any of the connected members of this corridor. If that row exists, the compiler may have failed to parse it. If not, add the sourced edge.`,
    );
  } else if (unconnected.length > 0 && connected.length === 0) {
    finding(
      'institutional_corridor',
      unconnected.map(n => n.label),
      `Corridor "${corridor.name}": ALL ${unconnected.length} known seed nodes are islands with no Clifford path.`,
      `Either the whole corridor is not yet connected to the spine, or the spine edges exist in the master doc but were not compiled (check compile-report.md).`,
      `Review compile-report.md to confirm these nodes were created and their edges were compiled. If compiled, add an explicit spine connection from one corridor member to DSIT, ARIA, Dialog, or Matt Clifford.`,
    );
  }
}

// ── pass 4: near-miss ─────────────────────────────────────────────────────────
// A → B exists, B → C exists, but A → C has no path through spine.
// Only flag if A is an island and C is connected.

const islandIds = new Set(islands.map(n => n.id));

for (const island of islands.slice(0, 100)) { // cap to avoid O(n³)
  for (const neighborId of neighbors(island.id)) {
    if (hasCliffordPath(neighborId)) {
      const neighborNode = nodesById.get(neighborId);
      finding(
        'near_miss',
        [island.label, neighborNode?.label ?? neighborId],
        `"${island.label}" has a direct edge to "${neighborNode?.label ?? neighborId}", which has a Clifford path. But "${island.label}" has no path itself.`,
        `This is the most common compilation gap: the island is one explicit sourced row away from connecting. The edge from the island to its connected neighbor exists, but the BFS cannot traverse it because the island's own sub-graph does not connect back.`,
        `Verify the edge between "${island.label}" and "${neighborNode?.label ?? neighborId}" is correctly compiled (check compile-report.md). If it is, the issue is that the edge direction or node id mismatch is preventing traversal. Check that the node ids on both ends of that edge match the canonical ids in graph.json.`,
      );
      break; // one near-miss finding per island is enough
    }
  }
}

// ── pass 5: open questions per island cluster ─────────────────────────────────

if (islands.length > 0) {
  const sampleIslands = islands.slice(0, 20).map(n => n.label);
  finding(
    'source_gap',
    sampleIslands,
    `${islands.length} total island nodes. Sample: ${sampleIslands.slice(0, 5).join(', ')}${sampleIslands.length > 5 ? '…' : ''}.`,
    `For each island, the question is not just "how does this connect" but "what kind of edge would this be": personnel, policy, funding, governance, advisory, or access? The type of edge determines what source is needed.`,
    [
      `For each island cluster, answer:`,
      `1. Is this a personnel edge (same unit, same org, same role sequence)?`,
      `2. Is this a policy edge (same document, same recommendation, same adoption layer)?`,
      `3. Is this a funding edge (capital relationship, grant, procurement)?`,
      `4. Is this a governance edge (board, advisory, oversight)?`,
      `5. Is this an access edge (Dialog, event, programme, informal)?`,
      `6. Does this hop create a public path, or only explain a functional corridor?`,
      `Only add the edge when you have a sourced row that states the relationship you actually mean.`,
    ].join('\n'),
  );
}

// ── write findings ────────────────────────────────────────────────────────────

fs.mkdirSync(inboxPath, { recursive: true });

const outPath = path.join(inboxPath, `${date}-scout-run.md`);

const md = [
  `# Scout Run — ${date}`,
  ``,
  `**graph.json:** ${graph.nodes.length} nodes, ${graph.edges.length} edges`,
  `**Islands:** ${islands.length} nodes with no Clifford path`,
  `**Findings:** ${findings.length}`,
  ``,
  `> graph_effect: none — this file is a research queue, not graph data.`,
  `> Only the master doc decides what enters the graph.`,
  ``,
  `---`,
  ``,
  ...findings.map((f, i) => [
    `## Finding ${String(i + 1).padStart(3, '0')} — ${f.finding_type}`,
    ``,
    `**ID:** \`${f.id}\``,
    `**Status:** ${f.status}`,
    `**graph_effect:** ${f.graph_effect}`,
    ``,
    `**Actors:**`,
    f.actors.map(a => `- ${a}`).join('\n'),
    ``,
    `**Observed pattern:**`,
    f.observed_pattern,
    ``,
    `**Why it matters:**`,
    f.why_it_matters,
    ``,
    `**Required human action:**`,
    f.required_human_action,
    ``,
    `---`,
    ``,
  ].join('\n')),
].join('\n');

fs.writeFileSync(outPath, md);

// Also write a machine-readable version for tooling
const jsonPath = path.join(inboxPath, `${date}-scout-run.json`);
fs.writeFileSync(jsonPath, JSON.stringify({ generated: new Date().toISOString(), graph_effect: 'none', findings }, null, 2) + '\n');

console.log(`scout: ${findings.length} findings → ${outPath}`);
console.log(`  islands: ${islands.length}`);
console.log(`  alias collisions: ${[...aliasGroups.values()].length}`);
console.log(`  corridor gaps: ${findings.filter(f => f.finding_type === 'institutional_corridor').length}`);
console.log(`  near-misses: ${findings.filter(f => f.finding_type === 'near_miss').length}`);
