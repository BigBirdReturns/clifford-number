export function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function indexGraph(graph) {
  const nodesById = new Map();
  const sourcesById = new Map();
  const edgesById = new Map();

  for (const node of graph.nodes ?? []) nodesById.set(node.id, node);
  for (const source of graph.sources ?? []) sourcesById.set(source.id, source);
  for (const edge of graph.edges ?? []) edgesById.set(edge.id, edge);

  return { nodesById, sourcesById, edgesById };
}

export function buildAdjacency(graph, options = {}) {
  const { directed = false } = options;
  const adjacency = new Map();

  function add(from, to, edge, reversed = false) {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push({ from, to, edge, reversed });
  }

  for (const edge of graph.edges ?? []) {
    add(edge.from, edge.to, edge, false);
    if (!directed) add(edge.to, edge.from, edge, true);
  }

  return adjacency;
}

export function findNode(graph, query) {
  const q = normalizeText(query);
  if (!q) return null;

  const exact = (graph.nodes ?? []).find((node) => {
    const labels = [node.id, node.label, ...(node.aliases ?? [])].map(normalizeText);
    return labels.includes(q);
  });
  if (exact) return exact;

  const candidates = searchNodes(graph, query, 1);
  return candidates[0] ?? null;
}

export function searchNodes(graph, query, limit = 12) {
  const q = normalizeText(query);
  if (!q) return [...(graph.nodes ?? [])].slice(0, limit);
  const terms = q.split(' ').filter(Boolean);

  return [...(graph.nodes ?? [])]
    .map((node) => {
      const haystack = normalizeText([
        node.id,
        node.label,
        node.type,
        node.description,
        ...(node.aliases ?? []),
        ...(node.tags ?? [])
      ].join(' '));
      let score = 0;
      if (normalizeText(node.id) === q || normalizeText(node.label) === q) score += 100;
      if (haystack.includes(q)) score += 40;
      for (const term of terms) {
        if (haystack.includes(term)) score += 10;
      }
      return { node, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.node.label.localeCompare(b.node.label))
    .slice(0, limit)
    .map((item) => item.node);
}

export function shortestPath(graph, startId, targetId = graph.target_node_id, options = {}) {
  const { directed = false, maxDepth = 12 } = options;
  const { nodesById } = indexGraph(graph);
  if (!nodesById.has(startId)) throw new Error(`Unknown start node: ${startId}`);
  if (!nodesById.has(targetId)) throw new Error(`Unknown target node: ${targetId}`);
  if (startId === targetId) return { number: 0, nodes: [nodesById.get(startId)], hops: [] };

  const adjacency = buildAdjacency(graph, { directed });
  const queue = [{ id: startId, path: [] }];
  const seen = new Set([startId]);

  while (queue.length) {
    const current = queue.shift();
    if (current.path.length >= maxDepth) continue;
    for (const hop of adjacency.get(current.id) ?? []) {
      if (seen.has(hop.to)) continue;
      const nextPath = [...current.path, hop];
      if (hop.to === targetId) return materializePath(nextPath, nodesById);
      seen.add(hop.to);
      queue.push({ id: hop.to, path: nextPath });
    }
  }

  return null;
}

export function materializePath(hops, nodesById) {
  if (!hops.length) return null;
  const nodes = [nodesById.get(hops[0].from)];
  for (const hop of hops) nodes.push(nodesById.get(hop.to));
  return { number: hops.length, nodes, hops };
}

export function pathToText(path) {
  if (!path) return 'No path found.';
  return path.nodes.map((node) => node.label).join(' -> ');
}

export function classRank(evidenceClass) {
  const ranks = { confirmed: 1, primary_public: 1, reported: 2, derived: 3, judgment: 4, open: 5 };
  return ranks[evidenceClass] ?? 9;
}

export function weakestEvidence(path) {
  if (!path || !path.hops.length) return 'confirmed';
  return path.hops
    .map((hop) => hop.edge.evidence_class)
    .sort((a, b) => classRank(b) - classRank(a))[0];
}
