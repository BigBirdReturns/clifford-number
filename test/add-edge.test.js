import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clifford-add-edge-'));
const graphPath = path.join(dir, 'graph.json');
fs.writeFileSync(graphPath, JSON.stringify({
  target_node_id: 'grantor',
  nodes: [{ id: 'grantor', label: 'Grantor', type: 'nonprofit' }],
  sources: [{ id: 's', label: 'Source', url: 'https://example.com' }],
  edges: []
}, null, 2));

execFileSync('node', [
  'tools/add-edge.mjs',
  graphPath,
  '--from', 'grantor',
  '--to', 'recipient-org',
  '--to-label', 'Recipient Org',
  '--to-type', 'organization',
  '--type', 'granted-to',
  '--claim', 'Grantor reported a grant to Recipient Org.',
  '--source', 's',
  '--evidence', 'primary_public',
  '--status', 'reported'
], { cwd: new URL('..', import.meta.url).pathname });

const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
assert.ok(graph.nodes.some((node) => node.id === 'recipient-org' && node.label === 'Recipient Org'));
assert.ok(graph.edges.some((edge) => edge.from === 'grantor' && edge.to === 'recipient-org' && edge.type === 'granted-to'));
console.log('Add-edge tests OK.');
