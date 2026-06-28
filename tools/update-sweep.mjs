#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { findNode, normalizeText } from '../src/graph.js';

const args = new Set(process.argv.slice(2));
const root = process.cwd();
const graphPath = path.join(root, 'graph.json');
const docsPath = path.join(root, 'docs/clifford-number-master.md');
const watchlistPath = path.join(root, 'data/update-watchlist.json');
const reportPath = path.join(root, 'docs/update-sweep.md');

const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
const masterDoc = fs.existsSync(docsPath) ? fs.readFileSync(docsPath, 'utf8') : '';
const watchlist = fs.existsSync(watchlistPath)
  ? JSON.parse(fs.readFileSync(watchlistPath, 'utf8'))
  : { candidates: [] };

const nodesById = new Map((graph.nodes ?? []).map((node) => [node.id, node]));
const personTypes = new Set(['person']);
const expansionNodeTypes = new Set([
  'company',
  'data-company',
  'frontier-ai-company',
  'ai-lab',
  'private-forum',
  'venture-firm',
  'government-agency'
]);

function parseDirectoryRows() {
  return masterDoc
    .split('\n')
    .map((line) => line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/))
    .filter((match) => match && Number(match[1]) >= 1 && Number(match[1]) <= 113)
    .map((match) => ({ number: Number(match[1]), name: match[2].trim(), detail: match[3].trim() }));
}

function parseNeedsReviewRows() {
  const rows = [];
  let inNeedsReview = false;
  for (const line of masterDoc.split('\n')) {
    if (line.includes('Rows 114–116 and 123')) inNeedsReview = true;
    if (inNeedsReview && line.startsWith('## Part 4:')) break;
    const match = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/);
    if (inNeedsReview && match && Number(match[1]) > 113) {
      rows.push({ number: Number(match[1]), name: match[2].trim(), issue: match[3].trim() });
    }
  }
  return rows;
}

function findExactNode(graph, query) {
  const normalized = normalizeText(query);
  return (graph.nodes ?? []).find((node) => [node.id, node.label, ...(node.aliases ?? [])].map(normalizeText).includes(normalized)) ?? null;
}

function hasPersonEdge(nodeId) {
  return (graph.edges ?? []).some((edge) => {
    if (edge.from !== nodeId && edge.to !== nodeId) return false;
    const otherId = edge.from === nodeId ? edge.to : edge.from;
    return personTypes.has(nodesById.get(otherId)?.type);
  });
}

const directoryRows = parseDirectoryRows();
const directoryMissing = directoryRows.filter((row) => !findExactNode(graph, row.name));
const needs_review = parseNeedsReviewRows().map((row) => ({
  ...row,
  in_graph: Boolean(findExactNode(graph, row.name))
}));
const watchlistResults = (watchlist.candidates ?? []).map((candidate) => {
  const node = findExactNode(graph, candidate.name);
  const connection = candidate.expected_connection ? findExactNode(graph, candidate.expected_connection) : null;
  return {
    ...candidate,
    in_graph: Boolean(node),
    node_id: node?.id ?? null,
    expected_connection_in_graph: Boolean(connection),
    expected_connection_id: connection?.id ?? null
  };
});
const disconnectedExpansionNodes = (graph.nodes ?? [])
  .filter((node) => expansionNodeTypes.has(node.type))
  .filter((node) => !hasPersonEdge(node.id))
  .map((node) => ({ id: node.id, label: node.label, type: node.type }));

const report = {
  generated: new Date().toISOString(),
  graph: {
    nodes: graph.nodes?.length ?? 0,
    edges: graph.edges?.length ?? 0,
    sources: graph.sources?.length ?? 0
  },
  directory_rows_checked: directoryRows.length,
  directory_missing: directoryMissing,
  needs_review,
  watchlist: watchlistResults,
  disconnected_expansion_nodes: disconnectedExpansionNodes
};

function markdown(report) {
  const missingWatchlist = report.watchlist.filter((item) => !item.in_graph);
  return `# Update Sweep Report\n\nGenerated: ${report.generated}\n\n## Graph snapshot\n\n- Nodes: ${report.graph.nodes}\n- Edges: ${report.graph.edges}\n- Sources: ${report.graph.sources}\n\n## Directory import coverage\n\nChecked ${report.directory_rows_checked} Dialog directory rows from \`docs/clifford-number-master.md\`.\n\n${report.directory_missing.length ? report.directory_missing.map((row) => `- Missing row ${row.number}: ${row.name}`).join('\n') : '- No missing rows from the 113-row Dialog directory section.'}\n\n## Needs-review rows\n\n${report.needs_review.length ? report.needs_review.map((row) => `- Row ${row.number}: ${row.name} — ${row.issue} — ${row.in_graph ? 'already in graph' : 'not imported'}`).join('\n') : '- No needs-review rows found.'}\n\n## Watchlist candidates\n\n${report.watchlist.length ? report.watchlist.map((item) => `- ${item.name} → ${item.expected_connection}: ${item.in_graph ? `in graph as \`${item.node_id}\`` : 'missing'}; source hint: ${item.source_hint}`).join('\n') : '- No watchlist candidates configured.'}\n\n## Missing watchlist candidates\n\n${missingWatchlist.length ? missingWatchlist.map((item) => `- ${item.name} (${item.expected_connection})`).join('\n') : '- No missing watchlist candidates.'}\n\n## Expansion nodes with no person edge\n\nThese are public organizational/forum/company nodes that may deserve a human public-role sweep. This is a queue, not an import instruction.\n\n${report.disconnected_expansion_nodes.length ? report.disconnected_expansion_nodes.map((node) => `- ${node.label} (\`${node.id}\`, ${node.type})`).join('\n') : '- None.'}\n`;
}

if (!args.has('--check-only')) {
  fs.writeFileSync(reportPath, markdown(report));
}

if (args.has('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Update sweep: ${report.graph.nodes} nodes, ${report.directory_missing.length} missing directory rows, ${report.watchlist.filter((item) => !item.in_graph).length} missing watchlist candidates.`);
  if (!args.has('--check-only')) console.log(`Wrote ${reportPath}.`);
}
