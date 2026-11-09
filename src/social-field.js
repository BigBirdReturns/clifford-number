export const SOCIAL_FIELD_SCHEMA = 'clifford-social-field@2';
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

// Ontology fill: used where no ledger accumulation applies (an organization,
// or any node drawn without a ledger). With a ledger, a person is filled by the
// class mix of its residue and a surface by its own class (see heat below).
export const ONTOLOGY_COLORS = Object.freeze({
  person: '#67b8ff',
  organization: '#b8c0cf',
  surface: '#f3bc4e'
});

// Heat: a printed, ledger-derived accumulation (docs/explorer.md rule 6).
//   class(surface) is read from surface_type (HEAT_CLASS_BY_SURFACE_TYPE);
//   weight(class): policy 1, appointment 1, procurement 2, capital 2;
//   heat(surface, t) = Σ over the surface's dated participation rows with
//     date ≤ t of weight(class) × (1 − 0.2)^(years from the row's date to t);
//   residue(object, t) = the same sum over the object's own dated rows, kept
//     per class. Undated rows contribute nothing and are listed as such.
// The row's date is its documented start (a year or month row starts on the
// first day of the period it names); years = days / 365.25. Nothing else (no
// degree, clustering, machine or factory score) enters the sum.
export const HEAT_CLASSES = Object.freeze(['policy', 'appointment', 'procurement', 'capital']);
export const HEAT_WEIGHTS = Object.freeze({ policy: 1, appointment: 1, procurement: 2, capital: 2 });
export const HEAT_DECAY_PER_YEAR = 0.2;
export const HEAT_DAYS_PER_YEAR = 365.25;
export const HEAT_CLASS_COLORS = Object.freeze({
  policy: '#3987e5',
  appointment: '#c98500',
  procurement: '#d95926',
  capital: '#199e70'
});
// A node whose rows give it no accumulation at t (all undated, or all later).
export const HEAT_NONE_COLOR = '#5b6577';
export const HEAT_FORMULA = 'heat = Σ touches weight(class) × 0.8^years; policy 1 · appointment 1 · procurement 2 · capital 2';
export const HEAT_CLASS_BY_SURFACE_TYPE = Object.freeze({
  policy_document_surface: 'policy',
  government_advisory_surface: 'policy',
  campaign_surface: 'policy',
  model_governance_surface: 'policy',
  category_formation_surface: 'policy',
  board_advisory_surface: 'appointment',
  directory_roster_surface: 'appointment',
  procurement_contract_surface: 'procurement',
  customer_vendor_surface: 'procurement',
  defence_industrial_surface: 'procurement',
  employment_investment_surface: 'capital',
  founder_officer_surface: 'capital',
  public_private_fund_surface: 'capital',
  laundering_chain_connector: 'capital'
});

export function heatClassForSurfaceType(surfaceType) {
  return HEAT_CLASS_BY_SURFACE_TYPE[surfaceType] ?? 'policy';
}

const ISO_DAY = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;
function heatRowDay(row) {
  if (Number.isFinite(row?.start_day)) return row.start_day;
  const match = ISO_DAY.exec(String(row?.time_start || '').trim());
  if (!match) return null;
  return Math.floor(Date.UTC(Number(match[1]), match[2] ? Number(match[2]) - 1 : 0, match[3] ? Number(match[3]) : 1) / 86_400_000);
}
function heatAtDay(at) {
  if (Number.isFinite(at)) return at;
  if (at instanceof Date) return Math.floor(at.getTime() / 86_400_000);
  const match = ISO_DAY.exec(String(at || '').trim());
  if (!match) return null;
  return Math.floor(Date.UTC(Number(match[1]), match[2] ? Number(match[2]) - 1 : 0, match[3] ? Number(match[3]) : 1) / 86_400_000);
}

// heat(rows, t): the one accumulation. rows are ledger rows (surface_type,
// start_day or time_start); t is a UTC day integer, an ISO date or a Date.
// Returns the total, the per-class split, every counted touch with its own
// arithmetic, the undated rows (contribute nothing) and the rows dated after t.
export function heat(rows, at) {
  const atDay = heatAtDay(at);
  const byClass = Object.fromEntries(HEAT_CLASSES.map(name => [name, 0]));
  const touches = [], undated = [], later = [];
  let total = 0;
  for (const row of rows ?? []) {
    const day = heatRowDay(row);
    if (day == null) { undated.push(row); continue; }
    if (atDay == null || day > atDay) { later.push(row); continue; }
    const heatClass = heatClassForSurfaceType(row.surface_type);
    const weight = HEAT_WEIGHTS[heatClass];
    const years = (atDay - day) / HEAT_DAYS_PER_YEAR;
    const decay = (1 - HEAT_DECAY_PER_YEAR) ** years;
    const contribution = weight * decay;
    byClass[heatClass] += contribution;
    total += contribution;
    touches.push({ row, row_id: row.row_id ?? null, date: dayIso(day), heat_class: heatClass, weight, years, decay, contribution });
  }
  touches.sort((a, b) => b.contribution - a.contribution || String(a.date).localeCompare(String(b.date)));
  return { at_day: atDay, at_date: dayIso(atDay), total, by_class: byClass, touches, undated, later };
}

function hexToRgb(hex) {
  const value = parseInt(String(hex).replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
// A residue's colour: the four class colours blended by their share of the
// total. No accumulation, no mix: HEAT_NONE_COLOR.
export function heatMixColor(byClass) {
  const total = HEAT_CLASSES.reduce((sum, name) => sum + (byClass?.[name] || 0), 0);
  if (!(total > 0)) return HEAT_NONE_COLOR;
  const rgb = [0, 0, 0];
  for (const name of HEAT_CLASSES) {
    const share = (byClass[name] || 0) / total;
    const [r, g, b] = hexToRgb(HEAT_CLASS_COLORS[name]);
    rgb[0] += r * share; rgb[1] += g * share; rgb[2] += b * share;
  }
  return `#${rgb.map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

const heatNumber = value => (Math.round(value * 100) / 100).toFixed(2).replace(/\.?0+$/, '') || '0';
// The printed denominator: "heat 4.2 = 3 touches at 2026-08-12: capital 2 ×
// 0.8^0.87 = 1.65 (2025-09-27) + …". Every term is a documented row.
export function heatBreakdownText(result, { noun = 'heat', limit = 12 } = {}) {
  const count = result?.touches?.length ?? 0;
  const head = `${noun} ${heatNumber(result?.total ?? 0)} = ${count} touch${count === 1 ? '' : 'es'}${result?.at_date ? ` at ${result.at_date}` : ''}`;
  const terms = (result?.touches ?? []).slice(0, limit)
    .map(touch => `${touch.heat_class} ${touch.weight} × 0.8^${touch.years.toFixed(2)} = ${heatNumber(touch.contribution)} (${touch.date})`);
  const more = count > limit ? ` + ${count - limit} more` : '';
  const notes = [];
  if (result?.undated?.length) notes.push(`${result.undated.length} undated row${result.undated.length === 1 ? ' contributes' : 's contribute'} nothing`);
  if (result?.later?.length) notes.push(`${result.later.length} row${result.later.length === 1 ? '' : 's'} dated after t not yet counted`);
  return `${head}${terms.length ? `: ${terms.join(' + ')}${more}` : ''}${notes.length ? ` · ${notes.join(' · ')}` : ''}`;
}

// The field's t: the end of the time window, or the end of the record when no
// window is set.
export function heatTimeForWindow(range, window = null) {
  const end = window?.endDay;
  if (!window?.unbounded && Number.isFinite(end)) return Math.round(end);
  return Number.isFinite(range?.last_day) ? range.last_day : null;
}

// Writes the accumulation channels onto the field's nodes at t. A canonical
// surface node carries heat (its own participation rows); every other node
// with ledger rows carries residue (its own rows), split per class. Nodes with
// no ledger row carry neither and keep their ontology fill.
export function applyFieldHeat(field, ledger, at) {
  if (!field?.nodes || !ledger?.rowsByNode) return field;
  const atDay = heatAtDay(at) ?? ledger.range?.last_day ?? null;
  for (const node of field.nodes) {
    const surfaceNode = String(node.id).startsWith('surface-');
    const rows = surfaceNode ? (ledger.rowsBySurfaceNode.get(node.id) ?? []) : (ledger.rowsByNode.get(node.id) ?? []);
    if (!rows.length) {
      node.heat = null;
      node.heat_kind = null;
      node.heat_value = 0;
      node.color = ONTOLOGY_COLORS[node.ontology];
      continue;
    }
    const result = heat(rows, atDay);
    node.heat = result;
    node.heat_kind = surfaceNode ? 'heat' : 'residue';
    node.heat_value = result.total;
    if (surfaceNode) {
      node.heat_class = heatClassForSurfaceType(rows[0].surface_type);
      node.color = HEAT_CLASS_COLORS[node.heat_class];
    } else if (node.ontology === 'person') {
      node.color = heatMixColor(result.by_class);
    } else {
      node.color = ONTOLOGY_COLORS[node.ontology];
    }
  }
  field.heat_at_day = atDay;
  field.metrics.max_heat_value = Math.max(0, ...field.nodes.map(node => node.heat_value || 0));
  return field;
}

// The tooltip's accumulation line, worded as the inspector words it.
export function nodeHeatLabel(node) {
  if (!node?.heat) return '';
  return `${node.heat_kind} ${heatNumber(node.heat.total)} from ${node.heat.touches.length} dated touch${node.heat.touches.length === 1 ? '' : 'es'}`;
}

const CLUSTER_ANCHORS = Object.freeze({
  dialog: [0.94, 0.12, 0.32],
  policy: [0.18, 0.86, 0.48],
  defense: [-0.82, 0.3, 0.48],
  capital: [-0.48, -0.8, 0.34],
  technology: [0.62, -0.42, -0.66],
  other: [-0.44, 0.2, -0.88],
  hop: [0, 0, 0]
});
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
export function nodeOntology(node) {
  if (isSurfaceNode(node)) return 'surface';
  if (node?.type === 'person') return 'person';
  return 'organization';
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
// Documented recurrence counts. memberCount is the number of distinct surfaces
// a node is a documented member of; pairCount is a count of shared named
// surfaces per pair. Pair counts are never drawn as a line: they feed only the
// per-node strongest_repeat count, which is displayed as a number. The ledger
// field (buildLedgerFieldModel) passes pairs=false: a roster of 800 names
// would otherwise build 320,000 pair keys that no channel of that view reads.
function buildReinforcement(model, { pairs = true } = {}) {
  const membersBySurface = buildSurfaceMemberships(model);
  const pairCount = new Map();
  const memberCount = new Map();
  for (const members of membersBySurface.values()) {
    const unique = [...new Set(members)].sort();
    for (const id of unique) memberCount.set(id, (memberCount.get(id) ?? 0) + 1);
    if (!pairs) continue;
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

// The ledger counts a node carries. A canonical surface node (id prefixed
// surface-) counts its participation rows; every other node counts the distinct
// surfaces its rows name. nodeLedgerSummary in the inspector keys the same way,
// so the number on the node is the number in the inspector.
export function ledgerCountsForNode(ledger, nodeId) {
  if (!ledger?.rowsByNode || !ledger?.rowsBySurfaceNode) return null;
  const canonicalSurface = String(nodeId).startsWith('surface-');
  const rows = canonicalSurface ? (ledger.rowsBySurfaceNode.get(nodeId) ?? []) : (ledger.rowsByNode.get(nodeId) ?? []);
  return {
    rows: rows.length,
    surfaces: new Set(rows.map(row => row.surface_id)).size,
    count_kind: canonicalSurface ? 'participants' : 'surfaces'
  };
}

// The one count a node's tooltip names, worded exactly as the inspector words
// it. "no ledger rows" is said only when the ledger has none for the node.
export function nodeCountLabel(node) {
  const count = node?.size_count ?? 0;
  const kind = node?.count_kind === 'participants' ? 'participant' : 'surface';
  const noRows = node?.ledger_row_count == null ? !count : node.ledger_row_count === 0;
  return `${count} documented ${kind}${count === 1 ? '' : 's'}${noRows ? ' · research context · no ledger rows' : ''}`;
}

export function buildSocialFieldModel(model, { radius = SOCIAL_FIELD_RADIUS, ledger = null, atDay = null, reinforcement: withPairs = true } = {}) {
  if (!model?.nodes || !model?.edges || !model?.nodeById) throw new TypeError('social field requires a network model');
  const adjacency = buildAdjacency(model);
  const reinforcement = buildReinforcement(model, { pairs: withPairs });

  const nodes = model.nodes.map(node => {
    const position = seededPoint(node, radius);
    const ontology = nodeOntology(node);
    // Arc-derived counts: what the drawn topology arcs say. They under-count
    // nodes whose rows the field cannot draw (the contained Dialog roster, the
    // privacy-guarded surface), so they size nothing when a ledger is present.
    const arcSurfaceCount = reinforcement.memberCount.get(node.id) ?? 0;
    const arcParticipantCount = ontology === 'surface' ? new Set(reinforcement.membersBySurface.get(node.id) ?? []).size : 0;
    const ledgerCounts = ledgerCountsForNode(ledger, node.id);
    const countKind = ledgerCounts ? ledgerCounts.count_kind : ontology === 'surface' ? 'participants' : 'surfaces';
    return {
      ...node,
      ...position,
      ontology,
      color: ONTOLOGY_COLORS[ontology],
      documented_degree: adjacency.get(node.id)?.size ?? 0,
      arc_surface_count: arcSurfaceCount,
      arc_participant_count: arcParticipantCount,
      ledger_row_count: ledgerCounts ? ledgerCounts.rows : null,
      ledger_surface_count: ledgerCounts ? ledgerCounts.surfaces : null,
      count_kind: countKind,
      count_source: ledgerCounts ? 'ledger' : 'arcs',
      // The one quantity that sizes a node: a documented count with a legend label,
      // never a composite score. With a ledger it is the ledger's count (the
      // inspector's number); without one, the drawn-arc count.
      size_count: ledgerCounts
        ? (countKind === 'participants' ? ledgerCounts.rows : ledgerCounts.surfaces)
        : (ontology === 'surface' ? arcParticipantCount : arcSurfaceCount),
      strongest_repeat: reinforcement.strongestByMember.get(node.id) ?? 0
    };
  });
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const links = model.edges.map((edge, index) => {
    const source = endpointId(edge.from ?? edge.source), target = endpointId(edge.to ?? edge.target);
    const topologyOnly = !!edge.topology || edge.type === 'topology';
    const linkKey = ecologyLinkKey(source, target);
    const rows = topologyOnly && ledger ? (ledger.rowsByLinkKey.get(linkKey) ?? []) : [];
    return {
      ...edge,
      id: edge.id ?? `field-link-${index}-${source}-${target}`,
      source,
      target,
      link_key: linkKey,
      evidence_weight: EVIDENCE_WEIGHT[edge.evidence_class] ?? EVIDENCE_WEIGHT.context,
      topology_only: topologyOnly,
      rows
    };
  });

  const field = {
    schema_version: SOCIAL_FIELD_SCHEMA,
    mode: model.mode,
    radius,
    nodes,
    nodeById,
    links,
    heat_formula: HEAT_FORMULA,
    metrics: {
      node_count: nodes.length,
      link_count: links.length,
      topology_link_count: links.filter(link => link.topology_only).length,
      surface_count: reinforcement.membersBySurface.size,
      pair_reinforcement_count: reinforcement.pairCount.size,
      max_size_count: Math.max(0, ...nodes.map(node => node.size_count))
    }
  };
  // Heat exists only with a ledger: it is a sum of ledger rows and nothing else.
  if (ledger) applyFieldHeat(field, ledger, atDay ?? ledger.range?.last_day ?? null);
  return field;
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

// The ledger field (the explorer's Field tab, docs/explorer.md "Field").
// Every actor, organization and bounded surface of build/surface-graph.json
// is a node, and every participation row is one edge from its participant to
// its surface: one mark per ledger row (rule 1). No edge joins two people or
// two organizations (rule 2); a roster's rows are its spokes to the one
// roster node, so no line joins two of its names (rule 3). graph.json plays
// no part in this model, and the model carries no score of any kind.
export const LEDGER_FIELD_SCHEMA = 'clifford-ledger-field@1';
export function buildLedgerFieldModel(surfaceGraph) {
  if (!surfaceGraph?.surfaces) throw new TypeError('ledger field requires a surface graph');
  const nodes = [];
  const nodeById = new Map();
  const add = node => {
    if (nodeById.has(node.id)) return nodeById.get(node.id);
    nodeById.set(node.id, node);
    nodes.push(node);
    return node;
  };
  for (const actor of surfaceGraph.actors ?? []) {
    add({ id: actor.id, label: actor.label || actor.id, type: 'person', kind: actor.kind || 'person', ledger_kind: 'actor', anchor: actor.anchor === true, listed: true });
  }
  for (const organization of surfaceGraph.organizations ?? []) {
    add({ id: organization.id, label: organization.label || organization.id, type: 'organization', kind: organization.kind || 'organization', ledger_kind: 'organization', listed: true });
  }
  for (const surface of surfaceGraph.surfaces) {
    add({
      id: `surface-${surface.surface_id}`,
      label: surface.surface_label || surface.surface_id,
      type: 'surface',
      kind: surface.surface_type || 'surface',
      ledger_kind: 'surface',
      surface_id: surface.surface_id,
      surface_type: surface.surface_type || null,
      hop_eligible: surface.hop_eligible === true,
      participant_count: (surface.participants ?? []).length,
      listed: true
    });
  }
  const edges = [];
  const counts = {
    actors: (surfaceGraph.actors ?? []).length,
    organizations: (surfaceGraph.organizations ?? []).length,
    surfaces: surfaceGraph.surfaces.length,
    rows: 0,
    actor_rows: 0,
    organization_rows: 0,
    // A row whose participant is not in the actors or organizations list still
    // gets a node (labelled by its id and flagged unlisted) so the row is drawn.
    unlisted_participants: 0,
    rows_without_participant: 0
  };
  // The ordinal counts every participant row in artifact order, the same
  // order buildFieldLedgerIndex uses for its row_id suffix, so edge row-N is
  // ledger row ::N.
  let ordinal = 0;
  for (const surface of surfaceGraph.surfaces) {
    const surfaceNodeId = `surface-${surface.surface_id}`;
    for (const participant of surface.participants ?? []) {
      const rowOrdinal = ordinal;
      ordinal += 1;
      counts.rows += 1;
      const participantId = participant.actor_id || participant.organization_id || null;
      if (!participantId) { counts.rows_without_participant += 1; continue; }
      const participantType = participant.participant_type || (participant.actor_id ? 'actor' : 'organization');
      if (!nodeById.has(participantId)) {
        counts.unlisted_participants += 1;
        add({ id: participantId, label: participantId, type: participantType === 'actor' ? 'person' : 'organization', kind: participantType === 'actor' ? 'person' : 'organization', ledger_kind: participantType, listed: false });
      }
      if (participantType === 'actor') counts.actor_rows += 1; else counts.organization_rows += 1;
      edges.push({
        id: `row-${rowOrdinal}`,
        from: participantId,
        to: surfaceNodeId,
        type: 'topology',
        topology: true,
        projection_layer: 'ledger_participation',
        evidence_class: participant.evidence_class || surface.evidence_class || 'open',
        participant_type: participantType,
        surface_id: surface.surface_id,
        row_ordinal: rowOrdinal
      });
    }
  }
  return {
    schema_version: LEDGER_FIELD_SCHEMA,
    mode: 'ledger',
    derived: true,
    visualization_only: true,
    graph_effect: 'none',
    nodes,
    edges,
    nodeById,
    defaultNode: null,
    counts
  };
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


export const ECOLOGY_EVENT_SCHEMA = 'clifford-ecology-events@1';
export const FIELD_LEDGER_SCHEMA = 'clifford-field-ledger@1';
const DENSE_EVENT_THRESHOLD = 36;
const DAY_MS = 86_400_000;
const ECOLOGY_EVIDENCE_WEIGHT = Object.freeze({
  official: 1,
  confirmed: .96,
  government_record: .94,
  primary_public: .9,
  reported: .64,
  judgment: .46,
  derived: .4,
  open: .32
});

export function ecologyLinkKey(a, b) {
  return [String(a || ''), String(b || '')].sort().join('||');
}

// 'YYYY-MM-DD' -> UTC day integer; 'YYYY-MM' and 'YYYY' widen to the first day
// (or, with end=true, the last day) of the period; empty -> null.
export function ecologyDay(value, end = false) {
  const text = String(value || '').trim();
  if (!text) return null;
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(text);
  if (!match) return null;
  const year = Number(match[1]), month = match[2] ? Number(match[2]) : null, day = match[3] ? Number(match[3]) : null;
  if (day) return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
  if (month) return Math.floor(Date.UTC(year, end ? month : month - 1, end ? 0 : 1) / DAY_MS);
  return Math.floor(Date.UTC(year, end ? 11 : 0, end ? 31 : 1) / DAY_MS);
}
export function dayIso(day) {
  return Number.isFinite(day) ? new Date(day * DAY_MS).toISOString().slice(0, 10) : null;
}
export function datePrecision(value) {
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return 'day';
  if (/^\d{4}-\d{2}$/.test(text)) return 'month';
  if (/^\d{4}$/.test(text)) return 'year';
  return 'none';
}
function ecologyChannel(participant, surface) {
  const participation = `${participant?.participation_type || ''} ${participant?.role || ''}`.toLowerCase();
  if (/invest|shareholder|capital|fund|instrument/.test(participation)) return 'capital';
  if (/procurement|buyer|supplier|contractor|framework|shortlist|downselect/.test(participation)) return 'procurement';
  if (/policy|government|civil service|adviser|official|public institution/.test(participation)) return 'policy';
  if (/director|board|officer|appointment|chair|governance/.test(participation)) return 'governance';
  if (/speaker|publication|forum|cohort|event|roster|directory|venue/.test(participation)) return 'forum';
  if (/customer|vendor|client|company|partner|employee|employment/.test(participation)) return 'commercial';
  const surfaceType = String(surface?.surface_type || '').toLowerCase();
  if (/procurement/.test(surfaceType)) return 'procurement';
  if (/policy|government/.test(surfaceType)) return 'policy';
  if (/board|founder|officer|governance/.test(surfaceType)) return 'governance';
  if (/employment|investment/.test(surfaceType)) return 'commercial';
  if (/roster|directory|campaign|category/.test(surfaceType)) return 'forum';
  return 'context';
}

function ecologyDateLabel(start, end) {
  if (!start && !end) return 'undated';
  if (!end || end === start) return start || end;
  return `${start || 'unknown'} to ${end}`;
}

function participantNodeId(participant) {
  return participant?.actor_id || participant?.organization_id || null;
}

function ecologyEvidenceWeight(value) {
  return ECOLOGY_EVIDENCE_WEIGHT[value] ?? ECOLOGY_EVIDENCE_WEIGHT.open;
}
// The dated window of one event, with the ledger row's end rule: a recorded
// start and no recorded end is open-ended (end_day null, "no end recorded"),
// never a single day.
function eventWindow(start, rawEnd) {
  const openEnded = start != null && rawEnd == null;
  const end = openEnded ? null : (rawEnd ?? start);
  const startDay = ecologyDay(start);
  return {
    time_start: start,
    time_end: end,
    time_label: openEnded ? `${start} → no end recorded` : ecologyDateLabel(start, end),
    start_day: startDay,
    end_day: openEnded ? null : (ecologyDay(end, true) ?? startDay),
    open_ended: openEnded
  };
}
export function buildEcologyEventModel(surfaceGraph, networkModel, { denseThreshold = DENSE_EVENT_THRESHOLD } = {}) {
  if (!surfaceGraph?.surfaces || !networkModel?.nodeById) throw new TypeError('ecology events require surface graph and network model');
  const events = [];
  const networkLinkKeys = new Set((networkModel.edges ?? []).map(edge => ecologyLinkKey(endpointId(edge.from ?? edge.source), endpointId(edge.to ?? edge.target))));
  let suppressedDenseParticipations = 0;
  let unresolvedLinks = 0;
  let eventSequence = 0;

  for (const surface of surfaceGraph.surfaces) {
    const surfaceNodeId = `surface-${surface.surface_id}`;
    const participants = surface.participants ?? [];
    const dense = surface.surface_type === 'directory_roster_surface' || participants.length > denseThreshold;
    if (dense) {
      suppressedDenseParticipations += participants.length;
      if (!networkModel.nodeById.has(surfaceNodeId)) { unresolvedLinks += 1; continue; }
      const start = surface.time_start || null;
      const window = eventWindow(start, surface.time_end === '' || surface.time_end == null ? null : surface.time_end);
      if (window.start_day == null) continue;
      events.push({
        id: `surface-activity:${surface.surface_id}:${eventSequence++}`,
        event_kind: 'surface_activity', channel: 'forum', direction: 'undirected_activity',
        target_node_id: surfaceNodeId, participant_node_id: null, surface_node_id: surfaceNodeId,
        link_key: null, aggregate_count: participants.length,
        surface_id: surface.surface_id, surface_label: surface.surface_label, surface_type: surface.surface_type,
        participation_type: 'dense_roster_contained', role: 'Bounded roster activation',
        ...window,
        evidence_class: surface.evidence_class || 'open', evidence_weight: ecologyEvidenceWeight(surface.evidence_class),
        receipt_ids: [...new Set(surface.receipt_ids ?? [])], weight: .14,
        dense_roster_contained: true
      });
      continue;
    }
    for (const participant of participants) {
      const nodeId = participantNodeId(participant);
      const linkKey = ecologyLinkKey(nodeId, surfaceNodeId);
      if (!nodeId || !networkModel.nodeById.has(nodeId) || !networkModel.nodeById.has(surfaceNodeId) || !networkLinkKeys.has(linkKey)) {
        unresolvedLinks += 1;
        continue;
      }
      const start = participant.time_start || surface.time_start || null;
      // The same end rule as the ledger row (buildFieldLedgerIndex): a row with
      // no recorded end is open-ended, and its pulse is in every later window.
      const rawEnd = participant.time_end === '' || participant.time_end == null
        ? (surface.time_end === '' || surface.time_end == null ? null : surface.time_end)
        : participant.time_end;
      const window = eventWindow(start, rawEnd);
      if (window.start_day == null) continue;
      const channel = ecologyChannel(participant, surface);
      const evidenceClass = participant.evidence_class || surface.evidence_class || 'open';
      events.push({
        id: `participation:${surface.surface_id}:${nodeId}:${participant.participation_type || 'participant'}:${eventSequence++}`,
        event_kind: 'participation', channel, direction: 'undirected_activity',
        target_node_id: surfaceNodeId, participant_node_id: nodeId, surface_node_id: surfaceNodeId,
        link_key: linkKey, aggregate_count: 1,
        surface_id: surface.surface_id, surface_label: surface.surface_label, surface_type: surface.surface_type,
        participation_type: participant.participation_type || 'participant', role: participant.role || 'Recorded participant',
        ...window,
        evidence_class: evidenceClass, evidence_weight: ecologyEvidenceWeight(evidenceClass),
        receipt_ids: [...new Set([...(surface.receipt_ids ?? []), ...(participant.receipt_ids ?? [])])],
        weight: channel === 'context' ? .3 : .7 + ecologyEvidenceWeight(evidenceClass) * .3,
        dense_roster_contained: false
      });
    }
  }

  events.sort((a, b) => a.start_day - b.start_day || (a.end_day ?? Infinity) - (b.end_day ?? Infinity) || a.id.localeCompare(b.id));
  const firstDay = events.length ? Math.min(...events.map(event => event.start_day)) : null;
  const lastDay = events.length ? Math.max(...events.map(event => event.end_day ?? event.start_day)) : null;
  const channelCounts = Object.fromEntries([...new Set(events.map(event => event.channel))]
    .sort().map(channel => [channel, events.filter(event => event.channel === channel).length]));
  return {
    schema_version: ECOLOGY_EVENT_SCHEMA,
    derived: true,
    visualization_only: true,
    canonical_for_clifford_number: false,
    graph_effect: 'none',
    interpretation: 'Events animate documented participation on existing actor-to-surface topology only. They create no actor-to-actor edge, hop, direction, causality, or finding.',
    events,
    range: {
      first_day: firstDay,
      last_day: lastDay,
      first_date: dayIso(firstDay),
      last_date: dayIso(lastDay)
    },
    counts: {
      events: events.length,
      dense_surface_events: events.filter(event => event.dense_roster_contained).length,
      suppressed_dense_participations: suppressedDenseParticipations,
      unresolved_links: unresolvedLinks,
      channels: channelCounts
    }
  };
}

// Every participation row of the ledger, keyed to the field. A row whose
// surface has no node in the research graph (the privacy guard suppressed it)
// is kept with on_field=false so lists can say "not drawn on the field" instead
// of omitting it. The index is the time source for the window: rows, not
// composite scores, decide what is inside or outside [from, to].
export function buildFieldLedgerIndex(surfaceGraph, networkModel) {
  if (!surfaceGraph?.surfaces || !networkModel?.nodeById) throw new TypeError('field ledger index requires surface graph and network model');
  const networkLinkKeys = new Set((networkModel.edges ?? []).map(edge => ecologyLinkKey(endpointId(edge.from ?? edge.source), endpointId(edge.to ?? edge.target))));
  const rows = [];
  const rowsByNode = new Map();
  const rowsBySurfaceNode = new Map();
  const rowsByLinkKey = new Map();
  const surfaceWindows = new Map();
  const push = (map, key, row) => { if (!map.has(key)) map.set(key, []); map.get(key).push(row); };
  const byTime = (a, b) => (a.start_day ?? Infinity) - (b.start_day ?? Infinity) || (a.end_day ?? Infinity) - (b.end_day ?? Infinity) || a.row_id.localeCompare(b.row_id);
  let ordinal = 0;
  for (const surface of surfaceGraph.surfaces) {
    const surfaceNodeId = `surface-${surface.surface_id}`;
    const surfaceOnField = networkModel.nodeById.has(surfaceNodeId);
    const dense = surface.surface_type === 'directory_roster_surface' || (surface.participants ?? []).length > DENSE_EVENT_THRESHOLD;
    const surfaceStart = ecologyDay(surface.time_start);
    const surfaceEndRaw = surface.time_end === '' || surface.time_end == null ? null : surface.time_end;
    surfaceWindows.set(surfaceNodeId, {
      surface_id: surface.surface_id,
      start_day: surfaceStart,
      end_day: surfaceEndRaw == null ? (surface.time_start ? null : surfaceStart) : ecologyDay(surfaceEndRaw, true) ?? surfaceStart,
      on_field: surfaceOnField
    });
    for (const participant of surface.participants ?? []) {
      const nodeId = participantNodeId(participant);
      if (!nodeId) continue;
      const participantType = participant.participant_type || (participant.actor_id ? 'actor' : 'organization');
      const linkKey = ecologyLinkKey(nodeId, surfaceNodeId);
      const timeStart = participant.time_start || surface.time_start || null;
      const rawEnd = participant.time_end === '' || participant.time_end == null
        ? (surface.time_end === '' || surface.time_end == null ? null : surface.time_end)
        : participant.time_end;
      const openEnded = timeStart != null && rawEnd == null;
      const startDay = ecologyDay(timeStart);
      const endDay = openEnded ? null : (ecologyDay(rawEnd, true) ?? startDay);
      const onField = surfaceOnField && networkModel.nodeById.has(nodeId) && networkLinkKeys.has(linkKey);
      const row = {
        row_id: `${surface.surface_id}::${participantType}::${nodeId}::${ordinal++}`,
        surface_id: surface.surface_id,
        surface_label: surface.surface_label,
        surface_type: surface.surface_type,
        hop_eligible: !!surface.hop_eligible,
        surface_node_id: surfaceNodeId,
        participant_type: participantType,
        node_id: nodeId,
        link_key: linkKey,
        role: participant.role || 'Recorded participant',
        participation_type: participant.participation_type || 'participant',
        time_start: timeStart,
        time_end: openEnded ? null : rawEnd,
        time_label: openEnded ? `${timeStart} → no end recorded` : ecologyDateLabel(timeStart, rawEnd),
        precision: datePrecision(timeStart),
        start_day: startDay,
        end_day: endDay,
        open_ended: openEnded,
        dated: startDay != null,
        evidence_class: participant.evidence_class || surface.evidence_class || 'open',
        receipt_ids: [...new Set([...(participant.receipt_ids ?? []), ...(surface.receipt_ids ?? [])])],
        on_field: onField,
        // privacy_guard: the graph has no node for this surface at all.
        // dense_roster_contained: the surface is drawn as one contained object, so this
        // row has no arc of its own. unresolved: anything else the graph did not carry.
        off_field_reason: onField ? null : !surfaceOnField ? 'privacy_guard' : dense ? 'dense_roster_contained' : 'unresolved'
      };
      rows.push(row);
      push(rowsByNode, nodeId, row);
      push(rowsBySurfaceNode, surfaceNodeId, row);
      push(rowsByLinkKey, linkKey, row);
    }
  }
  rows.sort(byTime);
  for (const list of [...rowsByNode.values(), ...rowsBySurfaceNode.values(), ...rowsByLinkKey.values()]) list.sort(byTime);
  const datedNodeIds = new Set();
  for (const row of rows) {
    if (!row.dated) continue;
    datedNodeIds.add(row.node_id);
    datedNodeIds.add(row.surface_node_id);
  }
  const startDays = rows.map(row => row.start_day).filter(Number.isFinite);
  const endDays = rows.map(row => row.end_day ?? row.start_day).filter(Number.isFinite);
  const firstDay = startDays.length ? Math.min(...startDays) : null;
  const lastDay = endDays.length ? Math.max(...endDays) : null;
  return {
    schema_version: FIELD_LEDGER_SCHEMA,
    derived: true,
    visualization_only: true,
    graph_effect: 'none',
    rows,
    rowsByNode,
    rowsBySurfaceNode,
    rowsByLinkKey,
    surfaceWindows,
    datedNodeIds,
    range: { first_day: firstDay, last_day: lastDay, first_date: dayIso(firstDay), last_date: dayIso(lastDay) },
    counts: {
      rows: rows.length,
      actor_rows: rows.filter(row => row.participant_type === 'actor').length,
      organization_rows: rows.filter(row => row.participant_type === 'organization').length,
      dated_rows: rows.filter(row => row.dated).length,
      undated_rows: rows.filter(row => !row.dated).length,
      open_ended_rows: rows.filter(row => row.open_ended).length,
      off_field_rows: rows.filter(row => !row.on_field).length,
      privacy_guard_rows: rows.filter(row => row.off_field_reason === 'privacy_guard').length,
      dense_contained_rows: rows.filter(row => row.off_field_reason === 'dense_roster_contained').length,
      unresolved_rows: rows.filter(row => row.off_field_reason === 'unresolved').length
    }
  };
}

// A window is [fromDay, toDay] in UTC day integers. null on either side means
// unbounded on that side; both null (or covering the whole range) is "all time".
export function normalizeEcologyWindow(range, window = null) {
  const first = range?.first_day, last = range?.last_day;
  const hasRange = Number.isFinite(first) && Number.isFinite(last);
  let from = Number.isFinite(window?.fromDay) ? Math.round(window.fromDay) : null;
  let to = Number.isFinite(window?.toDay) ? Math.round(window.toDay) : null;
  if (from != null && to != null && from > to) [from, to] = [to, from];
  if (hasRange) {
    if (from != null) from = Math.max(first, Math.min(last, from));
    if (to != null) to = Math.max(first, Math.min(last, to));
    if (from != null && from <= first) from = null;
    if (to != null && to >= last) to = null;
  }
  const unbounded = from == null && to == null;
  return {
    fromDay: from,
    toDay: to,
    unbounded,
    startDay: from ?? (hasRange ? first : -Infinity),
    endDay: to ?? (hasRange ? last : Infinity),
    first_day: hasRange ? first : null,
    last_day: hasRange ? last : null,
    days: hasRange ? last - first : null
  };
}
function asWindow(range, window) {
  return window && typeof window === 'object' && 'unbounded' in window ? window : normalizeEcologyWindow(range, window);
}

// An undated row is never time-sliced: the window cannot say anything about
// it, so it is never "outside" and never dims. Counts name it separately
// (rows_undated) instead of folding it into either side.
export function rowInWindow(row, window) {
  if (!window || window.unbounded) return true;
  const start = row?.start_day, end = row?.end_day ?? Infinity;
  if (!Number.isFinite(start)) return true;
  return start <= window.endDay && end >= window.startDay;
}

// "N of M rows in window" for a bounded window, "M rows" for all time. M is
// every row of the object. Undated rows are inside no window and outside none;
// a bounded window names them rather than counting them on either side.
export function windowCountPhrase(counts, window) {
  const total = counts?.rows_total ?? 0, inside = counts?.rows_in_window ?? 0, undated = counts?.rows_undated ?? 0;
  if (!window || window.unbounded) return `${total} row${total === 1 ? '' : 's'}`;
  const undatedNote = undated ? ` · ${undated} undated row${undated === 1 ? '' : 's'} never time-sliced` : '';
  return `${inside} of ${total} rows in window${undatedNote}`;
}

export function ecologyWindowLabel(range, window) {
  const normalized = asWindow(range, window);
  if (!Number.isFinite(normalized.startDay) || !Number.isFinite(normalized.endDay)) return 'No dated rows';
  const span = `${dayIso(normalized.startDay)} → ${dayIso(normalized.endDay)}`;
  return normalized.unbounded ? `${span} · all time` : span;
}

// The field's time factors for one window: which nodes carry a dated row at
// all, which rows (and so which actor-to-surface arcs) fall inside the window,
// and the honest denominator for the "N of M rows in window" header. Undated
// objects are never sliced: they are reported separately, never hidden.
export function fieldWindowFactors(index, window = null) {
  const normalized = asWindow(index?.range, window);
  const rows = index?.rows ?? [];
  const inWindowNodeIds = new Set();
  const inWindowLinkKeys = new Set();
  let inWindow = 0, undated = 0;
  for (const row of rows) {
    // An undated row lights nothing and dims nothing: it is counted apart.
    if (!Number.isFinite(row.start_day)) { undated += 1; continue; }
    if (!rowInWindow(row, normalized)) continue;
    inWindow += 1;
    inWindowNodeIds.add(row.node_id);
    inWindowNodeIds.add(row.surface_node_id);
    inWindowLinkKeys.add(row.link_key);
  }
  return {
    window: normalized,
    unbounded: normalized.unbounded,
    rows_total: rows.length,
    rows_in_window: inWindow,
    rows_undated: undated,
    datedNodeIds: index?.datedNodeIds ?? new Set(),
    inWindowNodeIds,
    inWindowLinkKeys
  };
}

export function nodeLedgerSummary(index, nodeId, window = null) {
  const rows = String(nodeId).startsWith('surface-')
    ? (index?.rowsBySurfaceNode.get(nodeId) ?? [])
    : (index?.rowsByNode.get(nodeId) ?? []);
  const normalized = asWindow(index?.range, window);
  const startDays = rows.map(row => row.start_day).filter(Number.isFinite);
  const endDays = rows.map(row => row.end_day ?? row.start_day).filter(Number.isFinite);
  return {
    node_id: nodeId,
    rows,
    rows_total: rows.length,
    rows_in_window: rows.filter(row => Number.isFinite(row.start_day) && rowInWindow(row, normalized)).length,
    rows_undated: rows.filter(row => !Number.isFinite(row.start_day)).length,
    surface_count: new Set(rows.map(row => row.surface_id)).size,
    first_day: startDays.length ? Math.min(...startDays) : null,
    last_day: endDays.length ? Math.max(...endDays) : null,
    open_ended: rows.some(row => row.open_ended),
    receipt_ids: [...new Set(rows.flatMap(row => row.receipt_ids))],
    off_field_rows: rows.filter(row => !row.on_field).length
  };
}

export function ecologyEventsForNode(eventModel, nodeId) {
  return (eventModel?.events ?? []).filter(event => event.participant_node_id === nodeId || event.surface_node_id === nodeId || event.target_node_id === nodeId);
}
export function ecologyPlayheadDay(eventModel, position = 0) {
  const first = eventModel?.range?.first_day, last = eventModel?.range?.last_day;
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  const t = Math.max(0, Math.min(1, Number(position) || 0));
  return first + (last - first) * t;
}

export function ecologyPlayheadLabel(eventModel, position = 0) {
  const day = ecologyPlayheadDay(eventModel, position);
  return day == null ? 'No dated activity' : dayIso(Math.round(day));
}

// A pulse exists only inside its row's window: no shoulder before or after the
// recorded dates. In the all-time state no window is set, so no pulse is drawn.
export function eventInWindow(event, window) {
  if (!window || window.unbounded) return false;
  // end_day null is an open-ended row: inside every window after its start.
  const start = event?.start_day, end = event?.end_day ?? Infinity;
  if (!Number.isFinite(start)) return false;
  return start <= window.endDay && end >= window.startDay;
}
export function activeEcologyEvents(eventModel, window = null) {
  let normalized;
  if (typeof window === 'number') {
    const day = ecologyPlayheadDay(eventModel, window);
    normalized = day == null ? null : { unbounded: false, startDay: Math.round(day), endDay: Math.round(day) };
  } else normalized = asWindow(eventModel?.range, window);
  if (!normalized) return [];
  return (eventModel?.events ?? []).filter(event => eventInWindow(event, normalized));
}
