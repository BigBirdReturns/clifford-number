#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const graph = JSON.parse(fs.readFileSync(path.join(root, 'graph.json'), 'utf8'));
const watchlist = JSON.parse(fs.readFileSync(path.join(root, 'data/update-watchlist.json'), 'utf8'));
const sourceIds = new Set((graph.sources ?? []).map((source) => source.id));
const staleWatch = (watchlist.watchlist ?? []).filter((item) => !sourceIds.has(item.id));
const edges = graph.edges ?? [];
const byClass = countBy(edges, 'evidence_class');
const byStatus = countBy(edges, 'status');
const missingNotes = edges.filter((edge) => ['derived', 'judgment', 'open', 'listed', 'registered'].includes(edge.evidence_class) || ['listed', 'registered', 'derived'].includes(edge.status)).filter((edge) => !edge.notes);
const sourceUse = new Map();
for (const edge of edges) for (const sourceId of edge.source_ids ?? []) sourceUse.set(sourceId, (sourceUse.get(sourceId) ?? 0) + 1);
const unusedSources = (graph.sources ?? []).filter((source) => !sourceUse.has(source.id));

const lines = [
  '# Update sweep',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Graph inventory',
  '',
  `- Nodes: ${graph.nodes?.length ?? 0}`,
  `- Edges: ${edges.length}`,
  `- Sources: ${graph.sources?.length ?? 0}`,
  '',
  '## Evidence classes',
  '',
  ...table(byClass),
  '',
  '## Edge statuses',
  '',
  ...table(byStatus),
  '',
  '## Watchlist entries not yet modeled as sources',
  '',
  ...(staleWatch.length ? staleWatch.map((item) => `- ${item.label}: ${item.reason} (${item.url})`) : ['- None.']),
  '',
  '## Edges needing stronger notes',
  '',
  ...(missingNotes.length ? missingNotes.slice(0, 50).map((edge) => `- ${edge.id}: ${edge.evidence_class}/${edge.status}`) : ['- None.']),
  '',
  '## Unused source records',
  '',
  ...(unusedSources.length ? unusedSources.map((source) => `- ${source.id}: ${source.label}`) : ['- None.'])
];
fs.writeFileSync(path.join(root, 'docs/update-sweep.md'), `${lines.join('\n')}\n`);
console.log('Wrote docs/update-sweep.md');

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] ?? 'unknown';
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}
function table(counts) {
  return ['| Value | Count |', '|---|---:|', ...Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([key, value]) => `| ${key} | ${value} |`)];
}
