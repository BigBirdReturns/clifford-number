#!/usr/bin/env node
import fs from 'node:fs';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) {
      args._.push(item);
      continue;
    }
    const key = item.slice(2);
    const value = argv[i + 1]?.startsWith('--') ? true : argv[++i];
    args[key] = value;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const file = args._[0] ?? 'graph.json';
const graph = JSON.parse(fs.readFileSync(file, 'utf8'));

const required = ['from', 'from-label', 'from-type', 'to', 'type', 'claim', 'source', 'evidence', 'status'];
for (const key of required) {
  if (!args[key]) {
    console.error(`Missing --${key}`);
    process.exit(1);
  }
}

if (!graph.nodes.some((node) => node.id === args.from)) {
  graph.nodes.push({
    id: args.from,
    label: args['from-label'],
    type: args['from-type'],
    description: args['from-description'] ?? '',
    aliases: [],
    tags: [],
    privacy: 'public-role-only'
  });
}

if (!graph.nodes.some((node) => node.id === args.to)) {
  console.error(`Unknown --to node: ${args.to}`);
  process.exit(1);
}

const id = args.id ?? `e-${args.from}-to-${args.to}-${args.type}`.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
if (graph.edges.some((edge) => edge.id === id)) {
  console.error(`Edge id already exists: ${id}`);
  process.exit(1);
}

graph.edges.push({
  id,
  from: args.from,
  to: args.to,
  type: args.type,
  claim: args.claim,
  source_ids: String(args.source).split(',').map((item) => item.trim()).filter(Boolean),
  evidence_class: args.evidence,
  status: args.status,
  weight: Number(args.weight ?? 1),
  notes: args.notes ?? ''
});

fs.writeFileSync(file, `${JSON.stringify(graph, null, 2)}\n`);
console.log(`Added edge ${id} to ${file}`);
