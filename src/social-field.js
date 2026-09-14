export const SOCIAL_FIELD_SCHEMA = 'clifford-social-field@1';
export const SOCIAL_FIELD_RADIUS = 190;

const EVIDENCE_WEIGHT = Object.freeze({
  official: 1,
  confirmed: 0.96,
  primary_public: 0.9,
  reported: 0.64,
  judgment: 0.46,
  derived: 0.4,
  context: 0.34
});

const SURFACE_TYPES = new Set([
  'surface', 'private-forum', 'procurement-surface', 'policy',
  'infrastructure-policy', 'government-program'
]);

const CLUSTER_ANCHORS = Object.freeze({
  dialog: [0.94, 0.12, 0.32],
  policy: [0.18, 0.86, 0.48],
  defense: [-0.82, 0.3, 0.48],
  capital: [-0.48, -0.8, 0.34],
  technology: [0.62, -0.42, -0.66],
  other: [-0.44, 0.2, -0.88],
  hop: [0, 0, 0]
});
const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const endpointId = value => typeof value === 'object' && value ? value.id : value;

function stableHash(value) {
  let hash = 2166136261;
  for (const ch of String(value)) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function unit(vector) {
  const [x, y, z] = vector;
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function jitterVector(id) {
  const h1 = stableHash(`${id}:x`) / 0xffffffff;
  const h2 = stableHash(`${id}:y`) / 0xffffffff;
  const z = h1 * 2 - 1;
  const angle = h2 * Math.PI * 2;
  const radial = Math.sqrt(Math.max(0, 1 - z * z));
  return [Math.cos(angle) * radial, Math.sin(angle) * radial, z];
}

export function isSurfaceNode(node) {
  return SURFACE_TYPES.has(node?.type) || String(node?.id || '').startsWith('surface-');
}
function buildAdjacency(model) {
  const adjacency = new Map(model.nodes.map(node => [node.id, new Set()]));
  for (const edge of model.edges) {
    const from = endpointId(edge.from ?? edge.source);
    const to = endpointId(edge.to ?? edge.target);
    if (!adjacency.has(from) || !adjacency.has(to) || from === to) continue;
    adjacency.get(from).add(to);
    adjacency.get(to).add(from);
  }
  return adjacency;
}

function localClustering(id, adjacency) {
  const neighbors = [...(adjacency.get(id) ?? [])];
  if (neighbors.length < 2) return 0;
  let joined = 0;
  for (let i = 0; i < neighbors.length; i += 1) {
    for (let j = i + 1; j < neighbors.length; j += 1) {
      if (adjacency.get(neighbors[i])?.has(neighbors[j])) joined += 1;
    }
  }
  return joined / ((neighbors.length * (neighbors.length - 1)) / 2);
}

function buildSurfaceMemberships(model) {
  const membersBySurface = new Map();
  for (const edge of model.edges) {
    if (!edge.topology && edge.type !== 'topology') continue;
    const from = endpointId(edge.from ?? edge.source);
    const to = endpointId(edge.to ?? edge.target);
    const fromNode = model.nodeById.get(from), toNode = model.nodeById.get(to);
    const surfaceId = isSurfaceNode(toNode) ? to : isSurfaceNode(fromNode) ? from : null;
    const memberId = surfaceId === to ? from : surfaceId === from ? to : null;
    if (!surfaceId || !memberId) continue;
    if (!membersBySurface.has(surfaceId)) membersBySurface.set(surfaceId, []);
    membersBySurface.get(surfaceId).push(memberId);
  }
  return membersBySurface;
}
function buildReinforcement(model) {
  const membersBySurface = buildSurfaceMemberships(model);
  const pairCount = new Map();
  const memberCount = new Map();
  for (const members of membersBySurface.values()) {
    const unique = [...new Set(members)].sort();
    for (const id of unique) memberCount.set(id, (memberCount.get(id) ?? 0) + 1);
    for (let i = 0; i < unique.length; i += 1) {
      for (let j = i + 1; j < unique.length; j += 1) {
        const key = `${unique[i]}||${unique[j]}`;
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
      }
    }
  }
  const strongestByMember = new Map();
  for (const [pair, count] of pairCount) {
    const [a, b] = pair.split('||');
    strongestByMember.set(a, Math.max(strongestByMember.get(a) ?? 0, count));
    strongestByMember.set(b, Math.max(strongestByMember.get(b) ?? 0, count));
  }
  return { membersBySurface, pairCount, memberCount, strongestByMember };
}

function evidenceWeightForNode(id, model) {
  let total = 0, count = 0;
  for (const edge of model.edges) {
    const from = endpointId(edge.from ?? edge.source), to = endpointId(edge.to ?? edge.target);
    if (from !== id && to !== id) continue;
    total += EVIDENCE_WEIGHT[edge.evidence_class] ?? EVIDENCE_WEIGHT.context;
    count += 1;
  }
  return count ? total / count : 0;
}

function heatColor(heat) {
  const stops = [[0, [67, 83, 112]], [.45, [122, 104, 132]], [.72, [222, 132, 63]], [1, [255, 76, 31]]];
  const value = clamp01(heat);
  let lo = stops[0], hi = stops.at(-1);
  for (let i = 1; i < stops.length; i += 1) {
    if (value <= stops[i][0]) { lo = stops[i - 1]; hi = stops[i]; break; }
  }
  const t = (value - lo[0]) / Math.max(.0001, hi[0] - lo[0]);
  const rgb = lo[1].map((channel, index) => Math.round(channel + (hi[1][index] - channel) * t));
  return `#${rgb.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
}

function seededPoint(node, radius) {
  const anchorRaw = CLUSTER_ANCHORS[node.cluster] ?? CLUSTER_ANCHORS.other;
  const jitter = jitterVector(node.id);
  let direction;
  if (node.cluster === 'hop') direction = jitter;
  else {
    const anchor = unit(anchorRaw);
    direction = unit([
      anchor[0] * .78 + jitter[0] * .42,
      anchor[1] * .78 + jitter[1] * .42,
      anchor[2] * .78 + jitter[2] * .42
    ]);
  }
  const radialJitter = ((stableHash(`${node.id}:r`) % 1000) / 1000 - .5) * radius * .08;
  const r = radius + radialJitter;
  return { x: direction[0] * r, y: direction[1] * r, z: direction[2] * r };
}

export function buildSocialFieldModel(model, { radius = SOCIAL_FIELD_RADIUS } = {}) {
  if (!model?.nodes || !model?.edges || !model?.nodeById) throw new TypeError('social field requires a network model');
  const adjacency = buildAdjacency(model);
  const reinforcement = buildReinforcement(model);
  const maxDegree = Math.max(1, ...model.nodes.map(node => adjacency.get(node.id)?.size ?? 0));
  const maxSurfaceCount = Math.max(1, ...reinforcement.memberCount.values(), 1);
  const maxRepeat = Math.max(1, ...reinforcement.strongestByMember.values(), 1);

  const rawById = new Map();
  for (const node of model.nodes) {
    const degree = adjacency.get(node.id)?.size ?? 0;
    const degreeScore = Math.log1p(degree) / Math.log1p(maxDegree);
    const clustering = localClustering(node.id, adjacency);
    const surfaceScore = (reinforcement.memberCount.get(node.id) ?? 0) / maxSurfaceCount;
    const repeatScore = (reinforcement.strongestByMember.get(node.id) ?? 0) / maxRepeat;
    const evidenceScore = evidenceWeightForNode(node.id, model);
    let raw = degreeScore * .24 + clustering * .22 + surfaceScore * .25 + repeatScore * .19 + evidenceScore * .1;
    if (isSurfaceNode(node)) {
      const participantCount = reinforcement.membersBySurface.get(node.id)?.length ?? degree;
      raw = Math.min(1.4, raw * .72 + Math.log1p(participantCount) / Math.log1p(20) * .34);
    }
    rawById.set(node.id, raw);
  }

  const maxRaw = Math.max(.0001, ...rawById.values());
  const nodes = model.nodes.map(node => {
    const heat = clamp01((rawById.get(node.id) ?? 0) / maxRaw);
    const position = seededPoint(node, radius);
    return {
      ...node,
      ...position,
      heat,
      heat_color: heatColor(heat),
      documented_degree: adjacency.get(node.id)?.size ?? 0,
      surface_count: reinforcement.memberCount.get(node.id) ?? 0,
      strongest_repeat: reinforcement.strongestByMember.get(node.id) ?? 0,
      clustering: localClustering(node.id, adjacency)
    };
  });
  const fieldNodeById = new Map(nodes.map(node => [node.id, node]));
  const links = model.edges.map((edge, index) => {
    const source = endpointId(edge.from ?? edge.source), target = endpointId(edge.to ?? edge.target);
    const sourceHeat = fieldNodeById.get(source)?.heat ?? 0, targetHeat = fieldNodeById.get(target)?.heat ?? 0;
    return {
      ...edge,
      id: edge.id ?? `field-link-${index}-${source}-${target}`,
      source,
      target,
      heat: clamp01((sourceHeat + targetHeat) / 2),
      evidence_weight: EVIDENCE_WEIGHT[edge.evidence_class] ?? EVIDENCE_WEIGHT.context,
      topology_only: !!edge.topology || edge.type === 'topology'
    };
  });

  const hottest = [...nodes]
    .sort((a, b) => b.heat - a.heat || a.label.localeCompare(b.label))
    .slice(0, 12)
    .map(node => ({ id: node.id, label: node.label, heat: node.heat }));
  return {
    schema_version: SOCIAL_FIELD_SCHEMA,
    mode: model.mode,
    radius,
    nodes,
    links,
    hottest,
    metrics: {
      node_count: nodes.length,
      link_count: links.length,
      topology_link_count: links.filter(link => link.topology_only).length,
      surface_count: reinforcement.membersBySurface.size,
      pair_reinforcement_count: reinforcement.pairCount.size
    }
  };
}

export function socialFieldNeighbors(field, nodeId) {
  const neighbors = new Set([nodeId]);
  for (const link of field?.links ?? []) {
    const source = endpointId(link.source), target = endpointId(link.target);
    if (source === nodeId) neighbors.add(target);
    if (target === nodeId) neighbors.add(source);
  }
  return neighbors;
}

export function socialFieldClusterAnchor(cluster, radius = SOCIAL_FIELD_RADIUS) {
  const anchor = CLUSTER_ANCHORS[cluster] ?? CLUSTER_ANCHORS.other;
  if (cluster === 'hop') return null;
  const [x, y, z] = unit(anchor);
  return { x: x * radius, y: y * radius, z: z * radius };
}
export function socialFieldClusterForNode(node) {
  const text = String([node?.id, node?.type, ...(node?.tags ?? [])].join(' ')).toLowerCase();
  if (text.includes('dialog') || text.includes('private-forum')) return 'dialog';
  if (text.includes('government') || text.includes('policy') || text.includes('uk-ai') || text.includes('public-sector')) return 'policy';
  if (text.includes('defen') || text.includes('military') || text.includes('army') || text.includes('palantir')) return 'defense';
  if (text.includes('capital') || text.includes('fund') || text.includes('venture') || text.includes('invest')) return 'capital';
  if (text.includes('company') || text.includes('technology') || text.includes('frontier-ai') || text.includes('data')) return 'technology';
  return 'other';
}

export function buildResearchNetworkModel(graph) {
  const sourceNodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const degree = new Map(sourceNodes.map(node => [node.id, 0]));
  const adjacency = new Map(sourceNodes.map(node => [node.id, new Set()]));
  for (const edge of edges) {
    const from = endpointId(edge.from ?? edge.source), to = endpointId(edge.to ?? edge.target);
    if (!degree.has(from) || !degree.has(to)) continue;
    degree.set(from, degree.get(from) + 1); degree.set(to, degree.get(to) + 1);
    adjacency.get(from).add(to); adjacency.get(to).add(from);
  }
  const nodes = sourceNodes.map(node => {
    let cluster = socialFieldClusterForNode(node);
    if (cluster !== 'dialog' && adjacency.get(node.id)?.has('dialog')) cluster = 'dialog';
    return { ...node, degree: degree.get(node.id) ?? 0, cluster, aggregateGroup: cluster };
  });
  return {
    mode: 'research',
    nodes,
    edges: edges.map((edge, index) => ({ ...edge, id: edge.id ?? `research-${index}-${edge.from}-${edge.to}` })),
    nodeById: new Map(nodes.map(node => [node.id, node])),
    defaultNode: nodes.some(node => node.id === 'dialog') ? 'dialog' : nodes[0]?.id ?? null
  };
}
