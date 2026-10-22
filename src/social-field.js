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

// Node fill names the ontology of the object (person, organization, bounded
// surface). It is a category, never a score: no composite "heat" drives any
// visual channel on the field.
export const ONTOLOGY_COLORS = Object.freeze({
  person: '#67b8ff',
  organization: '#b8c0cf',
  surface: '#f3bc4e'
});

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
// per-node strongest_repeat count, which is displayed as a number.
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

export function buildSocialFieldModel(model, { radius = SOCIAL_FIELD_RADIUS, ledger = null } = {}) {
  if (!model?.nodes || !model?.edges || !model?.nodeById) throw new TypeError('social field requires a network model');
  const adjacency = buildAdjacency(model);
  const reinforcement = buildReinforcement(model);

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

  return {
    schema_version: SOCIAL_FIELD_SCHEMA,
    mode: model.mode,
    radius,
    nodes,
    nodeById,
    links,
    metrics: {
      node_count: nodes.length,
      link_count: links.length,
      topology_link_count: links.filter(link => link.topology_only).length,
      surface_count: reinforcement.membersBySurface.size,
      pair_reinforcement_count: reinforcement.pairCount.size,
      max_size_count: Math.max(0, ...nodes.map(node => node.size_count))
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
      const start = surface.time_start || null, end = surface.time_end || start;
      const startDay = ecologyDay(start), endDay = ecologyDay(end, true) ?? startDay;
      if (startDay == null) continue;
      events.push({
        id: `surface-activity:${surface.surface_id}:${eventSequence++}`,
        event_kind: 'surface_activity', channel: 'forum', direction: 'undirected_activity',
        target_node_id: surfaceNodeId, participant_node_id: null, surface_node_id: surfaceNodeId,
        link_key: null, aggregate_count: participants.length,
        surface_id: surface.surface_id, surface_label: surface.surface_label, surface_type: surface.surface_type,
        participation_type: 'dense_roster_contained', role: 'Bounded roster activation',
        time_start: start, time_end: end, time_label: ecologyDateLabel(start, end), start_day: startDay, end_day: endDay,
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
      const end = participant.time_end || surface.time_end || start;
      const startDay = ecologyDay(start), endDay = ecologyDay(end, true) ?? startDay;
      if (startDay == null) continue;
      const channel = ecologyChannel(participant, surface);
      const evidenceClass = participant.evidence_class || surface.evidence_class || 'open';
      events.push({
        id: `participation:${surface.surface_id}:${nodeId}:${participant.participation_type || 'participant'}:${eventSequence++}`,
        event_kind: 'participation', channel, direction: 'undirected_activity',
        target_node_id: surfaceNodeId, participant_node_id: nodeId, surface_node_id: surfaceNodeId,
        link_key: linkKey, aggregate_count: 1,
        surface_id: surface.surface_id, surface_label: surface.surface_label, surface_type: surface.surface_type,
        participation_type: participant.participation_type || 'participant', role: participant.role || 'Recorded participant',
        time_start: start, time_end: end, time_label: ecologyDateLabel(start, end), start_day: startDay, end_day: endDay,
        evidence_class: evidenceClass, evidence_weight: ecologyEvidenceWeight(evidenceClass),
        receipt_ids: [...new Set([...(surface.receipt_ids ?? []), ...(participant.receipt_ids ?? [])])],
        weight: channel === 'context' ? .3 : .7 + ecologyEvidenceWeight(evidenceClass) * .3,
        dense_roster_contained: false
      });
    }
  }

  events.sort((a, b) => a.start_day - b.start_day || a.end_day - b.end_day || a.id.localeCompare(b.id));
  const firstDay = events.length ? Math.min(...events.map(event => event.start_day)) : null;
  const lastDay = events.length ? Math.max(...events.map(event => event.end_day)) : null;
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

export function rowInWindow(row, window) {
  if (!window || window.unbounded) return true;
  const start = row?.start_day, end = row?.end_day ?? Infinity;
  if (!Number.isFinite(start)) return false;
  return start <= window.endDay && end >= window.startDay;
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
  let inWindow = 0;
  for (const row of rows) {
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
    rows_in_window: rows.filter(row => rowInWindow(row, normalized)).length,
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
  const start = event?.start_day, end = event?.end_day;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
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
