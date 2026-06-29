import fs from 'node:fs';
import path from 'node:path';
import { assertPublicOnly, EVIDENCE_CLASSES, EDGE_STATUS } from './evidence.js';

function fail(errors, message) {
  errors.push(message);
}

export function validateGraph(graph, label = 'graph') {
  const errors = [];
  const ids = new Set();
  const sourceIds = new Set((graph.sources ?? []).map((source) => source.id));

  if (!graph || typeof graph !== 'object') fail(errors, `${label}: graph must be an object.`);
  if (!Array.isArray(graph.nodes)) fail(errors, `${label}: nodes must be an array.`);
  if (!Array.isArray(graph.edges)) fail(errors, `${label}: edges must be an array.`);
  if (!Array.isArray(graph.sources)) fail(errors, `${label}: sources must be an array.`);

  for (const node of graph.nodes ?? []) {
    if (!node.id) fail(errors, `${label}: node missing id.`);
    if (ids.has(node.id)) fail(errors, `${label}: duplicate node id: ${node.id}`);
    ids.add(node.id);
    if (!node.label) fail(errors, `${label}: node missing label: ${node.id}`);
    if (!node.type) fail(errors, `${label}: node missing type: ${node.id}`);
    try { assertPublicOnly(node); } catch (error) { fail(errors, `${label}: ${node.id}: ${error.message}`); }
  }

  for (const source of graph.sources ?? []) {
    if (!source.id) fail(errors, `${label}: source missing id.`);
    if (!source.label) fail(errors, `${label}: source missing label: ${source.id}`);
    if (!source.url) fail(errors, `${label}: source missing url: ${source.id}`);
  }

  for (const edge of graph.edges ?? []) {
    if (!edge.id) fail(errors, `${label}: edge missing id.`);
    if (!ids.has(edge.from)) fail(errors, `${label}: edge ${edge.id} has unknown from node: ${edge.from}`);
    if (!ids.has(edge.to)) fail(errors, `${label}: edge ${edge.id} has unknown to node: ${edge.to}`);
    if (!edge.claim) fail(errors, `${label}: edge missing claim: ${edge.id}`);
    if (!Object.hasOwn(EVIDENCE_CLASSES, edge.evidence_class)) fail(errors, `${label}: edge ${edge.id} has invalid evidence class: ${edge.evidence_class}`);
    if (!Object.hasOwn(EDGE_STATUS, edge.status)) fail(errors, `${label}: edge ${edge.id} has invalid status: ${edge.status}`);
    if (!Array.isArray(edge.source_ids) || edge.source_ids.length === 0) fail(errors, `${label}: edge ${edge.id} has no sources.`);
    if (edge.ui_weight !== undefined && (!Number.isInteger(edge.ui_weight) || edge.ui_weight < 1 || edge.ui_weight > 4)) {
      fail(errors, `${label}: edge ${edge.id} has invalid ui_weight: ${edge.ui_weight}`);
    }
    if (edge.topology === true && edge.ui_weight !== undefined && edge.ui_weight < 3) {
      fail(errors, `${label}: topology edge ${edge.id} must not be promoted above ui_weight 3.`);
    }
    for (const sourceId of edge.source_ids ?? []) {
      if (!sourceIds.has(sourceId)) fail(errors, `${label}: edge ${edge.id} references unknown source: ${sourceId}`);
    }
    try { assertPublicOnly(edge); } catch (error) { fail(errors, `${label}: ${edge.id}: ${error.message}`); }
  }

  if (!ids.has(graph.target_node_id)) fail(errors, `${label}: unknown target_node_id: ${graph.target_node_id}`);

  return errors;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function registeredGraphFiles() {
  const files = ['graph.json'];
  const manifestPath = 'cases.json';
  if (!fs.existsSync(manifestPath)) return files;
  const manifest = readJson(manifestPath);
  for (const entry of manifest.cases ?? []) {
    if (entry.data_path && !files.includes(entry.data_path)) files.push(entry.data_path);
  }
  return files;
}

const requestedFiles = process.argv.slice(2);
const files = requestedFiles.length ? requestedFiles : registeredGraphFiles();
let errors = [];

for (const file of files) {
  const graph = readJson(file);
  errors = errors.concat(validateGraph(graph, file));
  if (!requestedFiles.length && file === 'graph.json' && fs.existsSync('cases.json')) {
    const manifest = readJson('cases.json');
    const rootCase = (manifest.cases ?? []).find((entry) => entry.root_graph_path === 'graph.json');
    if (rootCase && rootCase.target_node_id && rootCase.target_node_id !== graph.target_node_id) {
      errors.push(`cases.json: ${rootCase.id} target_node_id does not match graph.json.`);
    }
  }
}

if (!requestedFiles.length && fs.existsSync('cases.json')) {
  const manifest = readJson('cases.json');
  const ids = new Set();
  for (const entry of manifest.cases ?? []) {
    if (!entry.id) errors.push('cases.json: case missing id.');
    if (ids.has(entry.id)) errors.push(`cases.json: duplicate case id: ${entry.id}`);
    ids.add(entry.id);
    if (!entry.title) errors.push(`cases.json: case missing title: ${entry.id}`);
    if (!entry.data_path) errors.push(`cases.json: case missing data_path: ${entry.id}`);
    if (entry.data_path && !fs.existsSync(entry.data_path)) errors.push(`cases.json: case data_path not found: ${entry.data_path}`);
  }
  if (manifest.default_case_id && !ids.has(manifest.default_case_id)) {
    errors.push(`cases.json: unknown default_case_id: ${manifest.default_case_id}`);
  }
}

for (const message of errors) console.error(`VALIDATION ERROR: ${message}`);
if (errors.length) process.exit(1);

const summary = files
  .map((file) => {
    const graph = readJson(file);
    return `${path.basename(file)}: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${graph.sources.length} sources`;
  })
  .join('; ');
console.log(`Graph OK: ${summary}.`);
