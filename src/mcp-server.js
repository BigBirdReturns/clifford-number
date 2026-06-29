#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { findNode, pathToText, searchNodes, shortestPath, weakestEvidence } from './graph.js';
import { computePathScore, confidenceLabel } from './scoring.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const graph = loadGraph();

const serverInfo = {
  name: 'clifford-number',
  version: '0.1.0'
};

const tools = [
  {
    name: 'clifford_number',
    description: 'Compute the shortest evidenced path from a public graph node to the case target. Returns no adjacency claim when the name is absent.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Person, company, office, policy object, or forum name to look up.'
        },
        maxDepth: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          default: 12,
          description: 'Maximum path depth to search.'
        },
        includeTopology: {
          type: 'boolean',
          default: false,
          description: 'Include topology-only edges in pathfinding. Defaults to false so umbrella/co-presence edges do not shorten the Clifford Number.'
        }
      },
      required: ['query'],
      additionalProperties: false
    }
  },
  {
    name: 'search_clifford_nodes',
    description: 'Search public Clifford graph nodes by label, alias, type, description, or tag.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search text. Empty string returns the first nodes.' },
        limit: { type: 'integer', minimum: 1, maximum: 25, default: 8 }
      },
      required: ['query'],
      additionalProperties: false
    }
  },
  {
    name: 'get_clifford_node',
    description: 'Return a public graph node by name, alias, or ID.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Node label, alias, or ID.' }
      },
      required: ['query'],
      additionalProperties: false
    }
  },
  {
    name: 'get_clifford_case',
    description: 'Return metadata for the currently loaded Clifford case.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  }
];

function loadGraph() {
  if (process.env.CLIFFORD_GRAPH_PATH) {
    return readJson(path.resolve(process.env.CLIFFORD_GRAPH_PATH));
  }

  const manifestPath = process.env.CLIFFORD_CASES_MANIFEST
    ? path.resolve(process.env.CLIFFORD_CASES_MANIFEST)
    : path.resolve(repoRoot, 'cases.json');

  if (fs.existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    const caseId = process.env.CLIFFORD_CASE_ID ?? manifest.default_case_id;
    const selected = (manifest.cases ?? []).find((item) => item.id === caseId)
      ?? (manifest.cases ?? [])[0];
    if (selected?.data_path) {
      const graphPath = path.resolve(path.dirname(manifestPath), selected.data_path);
      const graph = readJson(graphPath);
      graph.case_id = selected.id;
      graph.case_title = selected.title;
      graph.case_description = selected.description;
      return graph;
    }
  }

  return readJson(path.resolve(repoRoot, 'graph.json'));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function receiptUrl(source) {
  if (source.receipt_url) return source.receipt_url;
  if (source.id === 'dialog-html-source') {
    return 'docs/clifford-number-master.md#part-3-dialog-public-directory-import-safe-subset';
  }
  return source.url;
}

function sourceFor(id) {
  const source = graph.sources?.find((source) => source.id === id) ?? { id };
  return { ...source, receipt_url: receiptUrl(source) };
}

function nodeSummary(node) {
  return {
    id: node.id,
    label: node.label,
    type: node.type,
    description: node.description,
    tags: node.tags ?? [],
    privacy: node.privacy
  };
}

function pathPayload(node, pathResult) {
  if (!pathResult) {
    return {
      query_node: nodeSummary(node),
      adjacent: false,
      target: graph.target_node_id,
      claim: `The public graph contains ${node.label}, but no evidenced path to the case target was found.`
    };
  }

  const score = computePathScore(pathResult);
  return {
    query_node: nodeSummary(node),
    adjacent: true,
    case_id: graph.case_id,
    case_title: graph.case_title ?? graph.title,
    target: graph.target_node_id,
    clifford_number: pathResult.number,
    path_text: pathToText(pathResult),
    confidence: confidenceLabel(score),
    score,
    weakest_evidence: weakestEvidence(pathResult),
    nodes: pathResult.nodes.map(nodeSummary),
    hops: pathResult.hops.map((hop, index) => ({
      index: index + 1,
      from: graph.nodes.find((node) => node.id === hop.from)?.label ?? hop.from,
      to: graph.nodes.find((node) => node.id === hop.to)?.label ?? hop.to,
      reversed: hop.reversed,
      edge: {
        id: hop.edge.id,
        type: hop.edge.type,
        claim: hop.edge.claim,
        evidence_class: hop.edge.evidence_class,
        status: hop.edge.status,
        notes: hop.edge.notes,
        sources: (hop.edge.source_ids ?? []).map(sourceFor)
      }
    }))
  };
}

function callTool(name, args = {}) {
  if (name === 'clifford_number') {
    const query = String(args.query ?? '').trim();
    if (!query) throw new Error('query is required');
    const node = findNode(graph, query);
    if (!node) {
      return {
        query,
        adjacent: false,
        claim: `No current public graph node matches “${query}”, so the tool cannot claim adjacency.`,
        suggestions: searchNodes(graph, query, 5).map(nodeSummary)
      };
    }
    return pathPayload(node, shortestPath(graph, node.id, graph.target_node_id, {
      maxDepth: args.maxDepth ?? 12,
      includeTopology: args.includeTopology === true
    }));
  }

  if (name === 'search_clifford_nodes') {
    const limit = Math.min(Math.max(Number(args.limit ?? 8), 1), 25);
    return {
      case_id: graph.case_id,
      query: String(args.query ?? ''),
      results: searchNodes(graph, args.query ?? '', limit).map(nodeSummary)
    };
  }

  if (name === 'get_clifford_node') {
    const query = String(args.query ?? '').trim();
    if (!query) throw new Error('query is required');
    const node = findNode(graph, query);
    return node
      ? { found: true, case_id: graph.case_id, node: nodeSummary(node) }
      : { found: false, query, claim: `No current public graph node matches “${query}”.` };
  }

  if (name === 'get_clifford_case') {
    return {
      case_id: graph.case_id,
      title: graph.case_title ?? graph.title,
      description: graph.case_description,
      target_node_id: graph.target_node_id,
      nodes: graph.nodes?.length ?? 0,
      edges: graph.edges?.length ?? 0,
      sources: graph.sources?.length ?? 0
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

function resultContent(payload) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

function handle(message) {
  if (message.method === 'initialize') {
    return {
      protocolVersion: message.params?.protocolVersion ?? '2024-11-05',
      capabilities: { tools: {} },
      serverInfo
    };
  }
  if (message.method === 'ping') return {};
  if (message.method === 'tools/list') return { tools };
  if (message.method === 'tools/call') {
    const { name, arguments: args } = message.params ?? {};
    return resultContent(callTool(name, args));
  }
  throw new Error(`Unsupported method: ${message.method}`);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function sendResult(id, result) {
  if (id === undefined || id === null) return;
  send({ jsonrpc: '2.0', id, result });
}

function sendError(id, error) {
  if (id === undefined || id === null) return;
  send({
    jsonrpc: '2.0',
    id,
    error: {
      code: -32000,
      message: error.message
    }
  });
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    let message;
    try {
      message = JSON.parse(line);
      sendResult(message.id, handle(message));
    } catch (error) {
      sendError(message?.id, error);
    }
  }
});
