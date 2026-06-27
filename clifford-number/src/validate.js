import fs from 'node:fs';
import { assertPublicOnly, EVIDENCE_CLASSES, EDGE_STATUS } from './evidence.js';

const file = process.argv[2] ?? 'graph.json';
const graph = JSON.parse(fs.readFileSync(file, 'utf8'));
const ids = new Set();
const sourceIds = new Set((graph.sources ?? []).map((source) => source.id));
let errors = 0;

function fail(message) {
  errors += 1;
  console.error(`VALIDATION ERROR: ${message}`);
}

for (const node of graph.nodes ?? []) {
  if (!node.id) fail('Node missing id.');
  if (ids.has(node.id)) fail(`Duplicate node id: ${node.id}`);
  ids.add(node.id);
  if (!node.label) fail(`Node missing label: ${node.id}`);
  if (!node.type) fail(`Node missing type: ${node.id}`);
  try { assertPublicOnly(node); } catch (error) { fail(`${node.id}: ${error.message}`); }
}

for (const source of graph.sources ?? []) {
  if (!source.id) fail('Source missing id.');
  if (!source.label) fail(`Source missing label: ${source.id}`);
  if (!source.url) fail(`Source missing url: ${source.id}`);
}

for (const edge of graph.edges ?? []) {
  if (!edge.id) fail('Edge missing id.');
  if (!ids.has(edge.from)) fail(`Edge ${edge.id} has unknown from node: ${edge.from}`);
  if (!ids.has(edge.to)) fail(`Edge ${edge.id} has unknown to node: ${edge.to}`);
  if (!edge.claim) fail(`Edge missing claim: ${edge.id}`);
  if (!Object.hasOwn(EVIDENCE_CLASSES, edge.evidence_class)) fail(`Edge ${edge.id} has invalid evidence class: ${edge.evidence_class}`);
  if (!Object.hasOwn(EDGE_STATUS, edge.status)) fail(`Edge ${edge.id} has invalid status: ${edge.status}`);
  if (!Array.isArray(edge.source_ids) || edge.source_ids.length === 0) fail(`Edge ${edge.id} has no sources.`);
  for (const sourceId of edge.source_ids ?? []) {
    if (!sourceIds.has(sourceId)) fail(`Edge ${edge.id} references unknown source: ${sourceId}`);
  }
  try { assertPublicOnly(edge); } catch (error) { fail(`${edge.id}: ${error.message}`); }
}

if (!ids.has(graph.target_node_id)) fail(`Unknown target_node_id: ${graph.target_node_id}`);

if (errors) process.exit(1);
console.log(`Graph OK: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${graph.sources.length} sources.`);
