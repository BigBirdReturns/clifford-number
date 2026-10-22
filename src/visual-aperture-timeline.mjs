// Ledger timeline: the pure derived model behind the Visual Aperture's
// 'timeline' mode and the entity pages' single-lane mini timelines.
//
// Everything here is derived client-side from build/surface-graph.json and
// build/hop-graph.json. No DOM, no fetch, no scores. The honest-display rules
// this module encodes:
//   - every mark is exactly one ledger row (a participation row, or in the
//     surface-type view one surface row);
//   - a hop basis is rendered ONLY as a (day, surface) column whose segments
//     touch the lanes of that surface's participants, never as a line between
//     two people; hop-graph temporal_envelope is never read;
//   - a dense roster surface (>= DENSE_ACTOR_ROWS actor rows) is one contained
//     object with a count, never per-person marks;
//   - undated rows are never placed on the axis or sliced by a window;
//   - evidence class and receipt ids stay attached to every mark and column.
// One-line import on purpose: tools/build-standalone.mjs strips import lines with a single-line regex.
import { dayIndex, humanLabel, isoFromDayIndex, meetsEvidenceFloor, normalizeEvidence } from './visual-aperture-core.mjs';

export const TIMELINE_MODEL_SCHEMA = 'clifford-timeline-model@1';
// density_policy.max_hop_actor_count (19) + 1: the same threshold app.js uses
// for standing refusals. Today it selects exactly the Dialog public directory.
export const DENSE_ACTOR_ROWS = 20;
export const TIMELINE_MAX_LANES = 12;
export const TIMELINE_CLUSTER_SLOTS = 6;
export const TIMELINE_DOMAIN_PADDING_DAYS = 30;
export const TIMELINE_BY = Object.freeze(['actor', 'organization', 'type']);
export const TIMELINE_HOP_FILTERS = Object.freeze(['all', 'hop', 'context']);
export const TIMELINE_LANE_ORDERS = Object.freeze(['first_day', 'surface_count']);

// Geometry presets shared by the runtime and the tests (design 1 primary_view_spec).
export const TIMELINE_DESKTOP_METRICS = Object.freeze({
  labelWidth: 180, laneHeight: 28, markHeight: 10, markWidth: 4, slotOffset: 5, clusterGap: 5, blockHeight: 32, padding: 4
});
export const TIMELINE_PHONE_METRICS = Object.freeze({
  labelWidth: 72, laneHeight: 24, markHeight: 8, markWidth: 3, slotOffset: 3, clusterGap: 4, blockHeight: 28, padding: 4
});

const STRIP_LABELS = Object.freeze({
  actor: ['People documented on one surface', 'Other people'],
  organization: ['Organizations documented on one surface', 'Other organizations'],
  type: ['Other surface types', 'Other surface types'],
  surface: ['Other surfaces', 'Other surfaces']
});

const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const uniqueList = values => [...new Set((values ?? []).filter(Boolean))];
const increment = (counts, key, by = 1) => { counts[key] = (counts[key] ?? 0) + by; };

export function timelineDay(value, end = false) {
  return dayIndex(value, end);
}

function valuePrecision(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (/^\d{4}$/.test(text)) return 'year';
  if (/^\d{4}-\d{2}$/.test(text)) return 'month';
  return 'day';
}

export function rowPrecision(start, end) {
  const startPrecision = valuePrecision(start);
  if (!startPrecision || dayIndex(start) == null) return 'undated';
  const endText = String(end ?? '').trim();
  if (!endText) return 'open';
  const endPrecision = valuePrecision(end);
  const rank = { year: 0, month: 1, day: 2 };
  return rank[endPrecision] < rank[startPrecision] ? endPrecision : startPrecision;
}

function rowKind(precision, startDay, endDay) {
  if (precision === 'undated' || startDay == null) return 'undated';
  if (precision === 'open') return 'open';
  if (precision === 'year') return 'year';
  if (endDay != null && endDay > startDay) return 'span';
  return 'day';
}

// Shared shape for every placeable object (participation row or surface row).
function placeRow(base, timeStart, timeEnd) {
  const precision = rowPrecision(timeStart, timeEnd);
  const startDay = precision === 'undated' ? null : dayIndex(timeStart);
  let endDay = precision === 'open' || precision === 'undated' ? null : dayIndex(timeEnd, true);
  if (endDay != null && startDay != null && endDay < startDay) endDay = startDay;
  return {
    ...base,
    time_start: timeStart ?? null,
    time_end: timeEnd ?? null,
    precision,
    start_day: startDay,
    end_day: endDay,
    kind: rowKind(precision, startDay, endDay)
  };
}

function emptyLane(kind, id, label) {
  return {
    kind, id, label,
    rows: [],
    surface_ids: new Set(),
    row_count: 0,
    surface_count: 0,
    hop_eligible_surface_count: 0,
    first_day: null,
    last_day: null,
    first_day_index: null,
    last_day_index: null,
    has_open_end: false,
    has_undated: false,
    evidence_counts: {},
    type_counts: {},
    kind_counts: {},
    co_organization_counts: {},
    co_actor_counts: {},
    hop_basis_count: 0,
    hop_partner_ids: [],
    dense_memberships: []
  };
}

function finishLane(lane, hopEligibleSurfaces) {
  lane.row_count = lane.rows.length;
  lane.surface_count = lane.surface_ids.size;
  lane.hop_eligible_surface_count = [...lane.surface_ids].filter(id => hopEligibleSurfaces.has(id)).length;
  let first = null, last = null;
  for (const row of lane.rows) {
    if (row.start_day == null) { lane.has_undated = true; continue; }
    if (first == null || row.start_day < first) first = row.start_day;
    if (row.kind === 'open') lane.has_open_end = true;
    const end = row.end_day ?? row.start_day;
    if (last == null || end > last) last = end;
  }
  lane.first_day_index = first;
  lane.first_day = isoFromDayIndex(first);
  lane.last_day_index = lane.has_open_end ? null : last;
  lane.last_day = lane.has_open_end ? null : isoFromDayIndex(last);
  lane.last_documented_day = isoFromDayIndex(last);
  lane.hop_partner_ids = uniqueList(lane.hop_partner_ids).sort(compareText);
  lane.dense_memberships = uniqueList(lane.dense_memberships).sort(compareText);
  lane.rows.sort((a, b) => (a.start_day ?? Infinity) - (b.start_day ?? Infinity) || compareText(a.surface_id, b.surface_id) || compareText(a.key, b.key));
  return lane;
}

export function buildTimelineModel(surfaceGraph, hopGraph) {
  const surfaces = surfaceGraph?.surfaces ?? [];
  const actorLabels = new Map((surfaceGraph?.actors ?? []).map(actor => [actor.id, actor.label || actor.id]));
  const organizationLabels = new Map((surfaceGraph?.organizations ?? []).map(org => [org.id, org.label || org.id]));
  const surfaceById = new Map(surfaces.map(surface => [surface.surface_id, surface]));

  // Refusal reasons: the ledger's own hop_refusal_reason wins; the compiler's
  // generic 'surface_not_hop_eligible' is kept but marked as not recorded.
  const refusalReasons = new Map();
  for (const rejected of hopGraph?.rejected_hop_surfaces ?? []) {
    const own = surfaceById.get(rejected.surface_id)?.hop_refusal_reason;
    const reason = own || rejected.reason || null;
    refusalReasons.set(rejected.surface_id, { reason, reason_recorded: Boolean(own || (rejected.reason && rejected.reason !== 'surface_not_hop_eligible')) });
  }
  for (const surface of surfaces) {
    if (surface.hop_eligible || refusalReasons.has(surface.surface_id)) continue;
    refusalReasons.set(surface.surface_id, { reason: surface.hop_refusal_reason || null, reason_recorded: Boolean(surface.hop_refusal_reason) });
  }

  // Hop bases: one per hopGraph.edges[].surfaces[] entry. temporal_envelope is never read.
  const hopBases = [];
  for (const edge of hopGraph?.edges ?? []) {
    for (const basis of edge.surfaces ?? []) {
      const surface = surfaceById.get(basis.surface_id);
      const day = dayIndex(basis.valid_from);
      hopBases.push({
        actor_a: edge.actor_a,
        actor_b: edge.actor_b,
        surface_id: basis.surface_id,
        surface_label: basis.surface_label || surface?.surface_label || basis.surface_id,
        surface_type: basis.surface_type || surface?.surface_type || null,
        day,
        end_day: dayIndex(basis.valid_until, true) ?? day,
        iso_day: isoFromDayIndex(day),
        evidence_class: normalizeEvidence(basis.evidence_class),
        receipt_ids: uniqueList(basis.receipt_ids),
        actor_a_role: basis.actor_a_role ?? null,
        actor_b_role: basis.actor_b_role ?? null,
        temporal_status: basis.temporal_status ?? (day == null ? 'undated' : 'dated')
      });
    }
  }
  const hopDays = new Map();
  for (const basis of hopBases) {
    if (basis.day == null) continue;
    const key = `${basis.day}|${basis.surface_id}`;
    if (!hopDays.has(key)) {
      hopDays.set(key, {
        key, day: basis.day, iso_day: basis.iso_day, surface_id: basis.surface_id, surface_label: basis.surface_label,
        surface_type: basis.surface_type, basis_count: 0, actor_ids: new Set(), evidence_counts: {}, evidence_class: null, receipt_ids: [], bases: []
      });
    }
    const hopDay = hopDays.get(key);
    hopDay.basis_count += 1;
    hopDay.actor_ids.add(basis.actor_a);
    hopDay.actor_ids.add(basis.actor_b);
    increment(hopDay.evidence_counts, basis.evidence_class);
    hopDay.receipt_ids = uniqueList([...hopDay.receipt_ids, ...basis.receipt_ids]);
    hopDay.bases.push(basis);
  }
  for (const hopDay of hopDays.values()) {
    hopDay.evidence_class = Object.entries(hopDay.evidence_counts).sort((a, b) => b[1] - a[1] || compareText(a[0], b[0]))[0]?.[0] ?? 'open';
  }
  const hopBasesBySurface = new Map();
  for (const basis of hopBases) {
    if (!hopBasesBySurface.has(basis.surface_id)) hopBasesBySurface.set(basis.surface_id, []);
    hopBasesBySurface.get(basis.surface_id).push(basis);
  }

  const rows = [];
  const rowsByKey = new Map();
  const surfaceRows = new Map();
  const hopEligibleSurfaces = new Set(surfaces.filter(surface => surface.hop_eligible === true).map(surface => surface.surface_id));
  const counts = {
    rows: 0, actor_rows: 0, organization_rows: 0,
    kinds: { day: 0, span: 0, year: 0, open: 0, undated: 0 },
    actor_kinds: { day: 0, span: 0, year: 0, open: 0, undated: 0 },
    organization_kinds: { day: 0, span: 0, year: 0, open: 0, undated: 0 },
    hop_bases: hopBases.length, hop_days: 0, hop_day_surfaces: hopDays.size,
    hop_bases_by_year: {},
    dense_surfaces: 0, dense_rows: 0, surfaces: surfaces.length,
    surfaces_without_evidence_class: surfaces.filter(surface => !surface.evidence_class).length,
    refusal_reasons: refusalReasons.size,
    refusal_reasons_unrecorded: [...refusalReasons.values()].filter(entry => !entry.reason_recorded).length,
    duplicate_keys: 0
  };
  counts.hop_days = new Set([...hopDays.values()].map(hopDay => hopDay.day)).size;
  for (const basis of hopBases) {
    if (basis.iso_day) increment(counts.hop_bases_by_year, basis.iso_day.slice(0, 4));
  }

  const denseSurfaceIds = new Set();
  for (const surface of surfaces) {
    const actorRows = (surface.participants ?? []).filter(participant => participant.participant_type === 'actor' && participant.actor_id);
    if (actorRows.length >= DENSE_ACTOR_ROWS) denseSurfaceIds.add(surface.surface_id);
  }

  for (const surface of surfaces) {
    const participants = surface.participants ?? [];
    const actorIds = participants.filter(p => p.participant_type === 'actor' && p.actor_id).map(p => p.actor_id);
    const organizationIds = participants.filter(p => p.participant_type === 'organization' && p.organization_id).map(p => p.organization_id);
    const refusal = refusalReasons.get(surface.surface_id) ?? null;
    const list = [];
    for (const participant of participants) {
      const participantType = participant.participant_type === 'organization' ? 'organization' : 'actor';
      const entityId = participantType === 'actor' ? participant.actor_id : participant.organization_id;
      if (!entityId) continue;
      let key = `${surface.surface_id}::${participantType}::${entityId}`;
      if (rowsByKey.has(key)) {
        counts.duplicate_keys += 1;
        let suffix = 2;
        while (rowsByKey.has(`${key}::${suffix}`)) suffix += 1;
        key = `${key}::${suffix}`;
      }
      const row = placeRow({
        key,
        surface_id: surface.surface_id,
        surface_label: surface.surface_label || surface.surface_id,
        surface_type: surface.surface_type || null,
        secondary_surface_types: [...(surface.secondary_surface_types ?? [])],
        surface_hop_eligible: surface.hop_eligible === true,
        hop_refusal_reason: surface.hop_eligible === true ? null : (refusal?.reason ?? null),
        reason_recorded: surface.hop_eligible === true ? true : Boolean(refusal?.reason_recorded),
        participant_type: participantType,
        entity_id: entityId,
        entity_label: (participantType === 'actor' ? actorLabels : organizationLabels).get(entityId) || entityId,
        role: participant.role ?? null,
        participation_type: participant.participation_type ?? null,
        evidence_class: normalizeEvidence(participant.evidence_class),
        evidence_recorded: Boolean(participant.evidence_class),
        participant_receipt_ids: uniqueList(participant.receipt_ids),
        surface_receipt_ids: uniqueList(surface.receipt_ids),
        receipt_ids: uniqueList([...(surface.receipt_ids ?? []), ...(participant.receipt_ids ?? [])]),
        co_actor_ids: actorIds.filter(id => !(participantType === 'actor' && id === entityId)),
        co_organization_ids: organizationIds.filter(id => !(participantType === 'organization' && id === entityId)),
        dense: denseSurfaceIds.has(surface.surface_id),
        notes: participant.notes ?? null
      }, participant.time_start, participant.time_end);
      const bases = participantType === 'actor'
        ? (hopBasesBySurface.get(surface.surface_id) ?? []).filter(basis => (basis.actor_a === entityId || basis.actor_b === entityId)
          && (basis.day == null || row.start_day == null || (basis.day >= row.start_day && basis.day <= (row.end_day ?? Infinity))))
        : [];
      row.hop_basis_count = bases.length;
      row.hop_partner_ids = uniqueList(bases.map(basis => (basis.actor_a === entityId ? basis.actor_b : basis.actor_a))).sort(compareText);
      rows.push(row);
      rowsByKey.set(row.key, row);
      list.push(row);
      counts.rows += 1;
      counts.kinds[row.kind] += 1;
      if (participantType === 'actor') { counts.actor_rows += 1; counts.actor_kinds[row.kind] += 1; }
      else { counts.organization_rows += 1; counts.organization_kinds[row.kind] += 1; }
    }
    surfaceRows.set(surface.surface_id, list);
  }

  // Lanes: actor, organization, surface type (surfaces as marks) and surface (rows per surface).
  const lanes = { actor: new Map(), organization: new Map(), type: new Map(), surface: new Map() };
  const laneFor = (kind, id, label) => {
    if (!lanes[kind].has(id)) lanes[kind].set(id, emptyLane(kind, id, label));
    return lanes[kind].get(id);
  };
  for (const row of rows) {
    const lane = laneFor(row.participant_type, row.entity_id, row.entity_label);
    lane.rows.push(row);
    lane.surface_ids.add(row.surface_id);
    increment(lane.evidence_counts, row.evidence_class);
    increment(lane.type_counts, row.surface_type ?? 'unknown');
    increment(lane.kind_counts, row.kind);
    if (row.participant_type === 'actor') {
      for (const orgId of row.co_organization_ids) increment(lane.co_organization_counts, orgId);
      lane.hop_basis_count += row.hop_basis_count;
      lane.hop_partner_ids.push(...row.hop_partner_ids);
    } else {
      for (const actorId of row.co_actor_ids) increment(lane.co_actor_counts, actorId);
    }
    if (row.dense) lane.dense_memberships.push(row.surface_id);
    const surfaceLane = laneFor('surface', row.surface_id, row.surface_label);
    surfaceLane.rows.push(row);
    surfaceLane.surface_ids.add(row.surface_id);
    increment(surfaceLane.evidence_counts, row.evidence_class);
    increment(surfaceLane.type_counts, row.surface_type ?? 'unknown');
    increment(surfaceLane.kind_counts, row.kind);
    if (row.participant_type === 'actor') increment(surfaceLane.co_actor_counts, row.entity_id);
    else increment(surfaceLane.co_organization_counts, row.entity_id);
  }
  const surfaceMarks = [];
  for (const surface of surfaces) {
    const actorCount = (surface.participants ?? []).filter(p => p.participant_type === 'actor' && p.actor_id).length;
    const organizationCount = (surface.participants ?? []).filter(p => p.participant_type === 'organization' && p.organization_id).length;
    const refusal = refusalReasons.get(surface.surface_id) ?? null;
    const mark = placeRow({
      key: `surface::${surface.surface_id}`,
      surface_id: surface.surface_id,
      surface_label: surface.surface_label || surface.surface_id,
      surface_type: surface.surface_type || null,
      secondary_surface_types: [...(surface.secondary_surface_types ?? [])],
      surface_hop_eligible: surface.hop_eligible === true,
      hop_refusal_reason: surface.hop_eligible === true ? null : (refusal?.reason ?? null),
      reason_recorded: surface.hop_eligible === true ? true : Boolean(refusal?.reason_recorded),
      participant_type: 'surface',
      entity_id: surface.surface_type || 'unknown',
      entity_label: humanLabel(surface.surface_type || 'unknown'),
      role: null,
      participation_type: null,
      evidence_class: surface.evidence_class ? normalizeEvidence(surface.evidence_class) : null,
      evidence_recorded: Boolean(surface.evidence_class),
      participant_receipt_ids: [],
      surface_receipt_ids: uniqueList(surface.receipt_ids),
      receipt_ids: uniqueList(surface.receipt_ids),
      co_actor_ids: [],
      co_organization_ids: [],
      actor_count: actorCount,
      organization_count: organizationCount,
      row_count: actorCount + organizationCount,
      dense: denseSurfaceIds.has(surface.surface_id),
      hop_basis_count: (hopBasesBySurface.get(surface.surface_id) ?? []).length,
      hop_partner_ids: [],
      notes: surface.notes ?? null
    }, surface.time_start, surface.time_end);
    surfaceMarks.push(mark);
    const lane = laneFor('type', mark.entity_id, mark.entity_label);
    lane.rows.push(mark);
    lane.surface_ids.add(surface.surface_id);
    increment(lane.evidence_counts, mark.evidence_class ?? 'not_recorded');
    increment(lane.type_counts, mark.entity_id);
    increment(lane.kind_counts, mark.kind);
    lane.hop_basis_count += mark.hop_basis_count;
    if (mark.dense) lane.dense_memberships.push(surface.surface_id);
    // Make sure every surface has a surface lane even with zero participants.
    const surfaceLane = laneFor('surface', surface.surface_id, mark.surface_label);
    surfaceLane.surface_ids.add(surface.surface_id);
  }
  for (const kind of Object.keys(lanes)) for (const lane of lanes[kind].values()) finishLane(lane, hopEligibleSurfaces);

  // Dense roster objects.
  const dense = [];
  for (const surfaceId of denseSurfaceIds) {
    const surface = surfaceById.get(surfaceId);
    const list = surfaceRows.get(surfaceId) ?? [];
    const actorRows = list.filter(row => row.participant_type === 'actor');
    const evidenceCounts = {};
    for (const row of list) increment(evidenceCounts, row.evidence_class);
    const elsewhere = actorRows
      .map(row => ({ actor_id: row.entity_id, actor_label: row.entity_label, other_surface_count: (lanes.actor.get(row.entity_id)?.surface_count ?? 1) - 1 }))
      .filter(entry => entry.other_surface_count > 0)
      .sort((a, b) => b.other_surface_count - a.other_surface_count || compareText(a.actor_label, b.actor_label));
    const placed = placeRow({}, surface.time_start, surface.time_end);
    dense.push({
      key: `dense::${surfaceId}`,
      surface_id: surfaceId,
      surface_label: surface.surface_label || surfaceId,
      surface_type: surface.surface_type || null,
      day: placed.start_day,
      end_day: placed.end_day ?? placed.start_day,
      iso_day: isoFromDayIndex(placed.start_day),
      precision: placed.precision,
      kind: placed.kind,
      listed_count: actorRows.length,
      organization_count: list.length - actorRows.length,
      row_count: list.length,
      member_keys: list.map(row => row.key),
      evidence_counts: evidenceCounts,
      evidence_class: surface.evidence_class ? normalizeEvidence(surface.evidence_class) : null,
      hop_eligible: surface.hop_eligible === true,
      refusal_reason: refusalReasons.get(surfaceId)?.reason ?? null,
      reason_recorded: Boolean(refusalReasons.get(surfaceId)?.reason_recorded),
      receipt_ids: uniqueList(surface.receipt_ids),
      elsewhere,
      nowhere_else_count: actorRows.length - elsewhere.length
    });
    counts.dense_surfaces += 1;
    counts.dense_rows += list.length;
  }
  dense.sort((a, b) => (a.day ?? Infinity) - (b.day ?? Infinity) || compareText(a.surface_id, b.surface_id));

  // Range over placed rows (participation rows); surfaces with no rows still widen it.
  let first = null, last = null;
  const startDays = new Set();
  for (const row of [...rows, ...surfaceMarks]) {
    if (row.start_day == null) continue;
    if (row.participant_type !== 'surface') startDays.add(row.start_day);
    if (first == null || row.start_day < first) first = row.start_day;
    const end = row.end_day ?? row.start_day;
    if (last == null || end > last) last = end;
  }
  const yearsWithRows = [...new Set(rows.filter(row => row.start_day != null).map(row => isoFromDayIndex(row.start_day).slice(0, 4)))].sort(compareText);

  return {
    schema_version: TIMELINE_MODEL_SCHEMA,
    derived: true,
    visualization_only: true,
    graph_effect: 'none',
    rows,
    rowsByKey,
    surfaceMarks,
    surfaceRows,
    lanes,
    hopBases,
    hopDays,
    refusalReasons,
    dense,
    denseSurfaceIds,
    range: {
      first_day: isoFromDayIndex(first),
      last_day: isoFromDayIndex(last),
      first_day_index: first,
      last_day_index: last,
      distinct_start_days: startDays.size,
      years_with_rows: yearsWithRows
    },
    counts
  };
}

function laneComparator(order) {
  if (order === 'surface_count') {
    return (a, b) => b.surface_count - a.surface_count || (a.first_day_index ?? Infinity) - (b.first_day_index ?? Infinity) || compareText(a.label, b.label);
  }
  return (a, b) => (a.first_day_index ?? Infinity) - (b.first_day_index ?? Infinity) || compareText(a.label, b.label);
}

// Named lanes, the strip (every other row of that kind) and the dense blocks.
export function defaultTimelineLanes(model, by = 'actor', { laneIds = [], order = 'first_day', maxLanes = TIMELINE_MAX_LANES } = {}) {
  const kind = model?.lanes?.[by] ? by : 'actor';
  const laneMap = model.lanes[kind];
  const requested = uniqueList(Array.isArray(laneIds) ? laneIds : String(laneIds || '').split(',').map(value => value.trim()));
  const pinned = requested.length > 0;
  let named;
  if (pinned) {
    named = requested.map(id => laneMap.get(id)).filter(Boolean).slice(0, Math.max(1, maxLanes));
  } else if (kind === 'type' || kind === 'surface') {
    named = [...laneMap.values()].sort(laneComparator(order));
  } else {
    named = [...laneMap.values()].filter(lane => lane.surface_count >= 2).sort(laneComparator(order));
  }
  const namedIds = new Set(named.map(lane => lane.id));
  const blocks = kind === 'actor' ? model.dense : [];
  const blockSurfaceIds = new Set(blocks.map(block => block.surface_id));
  const stripRows = [];
  const stripEntities = new Set();
  const singleSurfaceOnly = !pinned;
  for (const lane of laneMap.values()) {
    if (namedIds.has(lane.id)) continue;
    for (const row of lane.rows) {
      // Dense rows belong to the block unless the entity has its own lane.
      if (kind === 'actor' && blockSurfaceIds.has(row.surface_id)) continue;
      if (singleSurfaceOnly && kind !== 'type' && kind !== 'surface' && lane.surface_count !== 1) continue;
      stripRows.push(row);
      stripEntities.add(lane.id);
    }
  }
  stripRows.sort((a, b) => (a.start_day ?? Infinity) - (b.start_day ?? Infinity) || compareText(a.surface_id, b.surface_id) || compareText(a.key, b.key));
  return {
    by: kind,
    pinned,
    lanes: named,
    strip: {
      id: `strip:${kind}`,
      kind: 'strip',
      label: STRIP_LABELS[kind][singleSurfaceOnly ? 0 : 1],
      single_surface_only: singleSurfaceOnly,
      rows: stripRows,
      row_count: stripRows.length,
      entity_count: stripEntities.size,
      entity_ids: [...stripEntities].sort(compareText)
    },
    blocks
  };
}

// The latest January 1 such that the rows starting on or after it are at least
// 85% (plot >= 560px) or 70% (narrower) of all dated rows; to = last day + 30.
export function defaultTimelineDomain(model, plotWidth = 690, { threshold = null } = {}) {
  const share = threshold ?? (Number(plotWidth) >= 560 ? 0.85 : 0.7);
  const dated = model.rows.filter(row => row.start_day != null);
  const first = model.range.first_day_index;
  const lastIndex = model.range.last_day_index;
  const toDay = lastIndex == null ? null : lastIndex + TIMELINE_DOMAIN_PADDING_DAYS;
  if (first == null || toDay == null || !dated.length) {
    return { from: null, to: null, from_day: null, to_day: null, auto: true, share: 0, threshold: share };
  }
  const firstYear = Number(isoFromDayIndex(first).slice(0, 4));
  const lastYear = Number(isoFromDayIndex(lastIndex).slice(0, 4));
  let chosen = { day: first, share: 1 };
  for (let year = firstYear; year <= lastYear; year += 1) {
    const candidate = dayIndex(String(year));
    const covered = dated.filter(row => row.start_day >= candidate).length / dated.length;
    if (covered >= share) chosen = { day: candidate, share: covered };
  }
  return {
    from: isoFromDayIndex(chosen.day),
    to: isoFromDayIndex(toDay),
    from_day: chosen.day,
    to_day: toDay,
    auto: true,
    share: Math.round(chosen.share * 1000) / 1000,
    threshold: share
  };
}

export function resolveTimelineDomain(model, { from = '', to = '', plotWidth = 690 } = {}) {
  let fromDay = dayIndex(from);
  let toDay = dayIndex(to, true);
  if (fromDay == null || toDay == null) {
    const auto = defaultTimelineDomain(model, plotWidth);
    if (fromDay == null) fromDay = auto.from_day;
    if (toDay == null) toDay = auto.to_day;
    if (fromDay == null || toDay == null) return { from: null, to: null, from_day: null, to_day: null, auto: true };
    if (fromDay > toDay) [fromDay, toDay] = [toDay, fromDay];
    return { from: isoFromDayIndex(fromDay), to: isoFromDayIndex(toDay), from_day: fromDay, to_day: toDay, auto: !(dayIndex(from) != null && dayIndex(to, true) != null) };
  }
  if (fromDay > toDay) [fromDay, toDay] = [toDay, fromDay];
  if (fromDay === toDay) toDay = fromDay + 1;
  return { from: isoFromDayIndex(fromDay), to: isoFromDayIndex(toDay), from_day: fromDay, to_day: toDay, auto: false };
}

export function filterTimelineRows(rows, { evidenceFloor = 'open', hop = 'all' } = {}) {
  const hopFilter = TIMELINE_HOP_FILTERS.includes(hop) ? hop : 'all';
  return (rows ?? []).filter(row => {
    if (!meetsEvidenceFloor(row.evidence_class ?? 'open', evidenceFloor)) return false;
    if (hopFilter === 'all') return true;
    return (hopFilter === 'hop') === Boolean(row.surface_hop_eligible);
  });
}

// Window [from, to] (SPEC fix e): rows are marked in or out, never removed;
// undated rows are never sliced and always count as in the window.
export function rowInWindow(row, windowFromDay, windowToDay) {
  if (windowFromDay == null && windowToDay == null) return true;
  if (row.start_day == null) return true;
  const start = row.start_day;
  const end = row.kind === 'open' ? Infinity : (row.end_day ?? row.start_day);
  if (windowFromDay != null && end < windowFromDay) return false;
  if (windowToDay != null && start > windowToDay) return false;
  return true;
}

export function resolveTimelineWindow({ from = '', to = '' } = {}) {
  let fromDay = dayIndex(from);
  let toDay = dayIndex(to, true);
  if (fromDay != null && toDay != null && fromDay > toDay) [fromDay, toDay] = [toDay, fromDay];
  return { from: isoFromDayIndex(fromDay), to: isoFromDayIndex(toDay), from_day: fromDay, to_day: toDay, active: fromDay != null || toDay != null };
}

function axisTicks(fromDay, toDay, x, plotWidth) {
  const ticks = [];
  const days = Math.max(1, toDay - fromDay);
  const pxPerDay = plotWidth / days;
  const fromIso = isoFromDayIndex(fromDay), toIso = isoFromDayIndex(toDay);
  const firstYear = Number(fromIso.slice(0, 4)), lastYear = Number(toIso.slice(0, 4));
  const monthPitch = pxPerDay * 30.4;
  for (let year = firstYear; year <= lastYear + 1; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const day = dayIndex(`${year}-${String(month).padStart(2, '0')}`);
      if (day < fromDay || day > toDay) continue;
      if (month === 1) ticks.push({ kind: 'year', day, iso: isoFromDayIndex(day), x: x(day), label: String(year) });
      else if (monthPitch >= 24) ticks.push({ kind: 'month', day, iso: isoFromDayIndex(day), x: x(day), label: monthPitch >= 40 ? isoFromDayIndex(day).slice(5, 7) : '' });
    }
  }
  return ticks;
}

// Pure geometry for one plot width. Every mark carries its row key, evidence
// class, hop eligibility, receipt ids and surface id.
export function layoutTimeline(model, options = {}) {
  const {
    by = 'actor',
    laneIds = [],
    order = 'first_day',
    maxLanes = TIMELINE_MAX_LANES,
    domainFrom = '',
    domainTo = '',
    windowFrom = '',
    windowTo = '',
    evidenceFloor = 'open',
    hop = 'all',
    plotWidth = 690,
    includeStrip = true,
    includeBlocks = true,
    includeColumns = true,
    maxSlots = TIMELINE_CLUSTER_SLOTS,
    overviewFrom = '',
    overviewTo = ''
  } = options;
  const metrics = { ...TIMELINE_DESKTOP_METRICS, ...options };
  const { labelWidth, laneHeight, markHeight, markWidth, slotOffset, clusterGap, blockHeight, padding } = metrics;
  const width = Math.max(1, Number(plotWidth) || 1);
  const grouping = defaultTimelineLanes(model, by, { laneIds, order, maxLanes });
  const kind = grouping.by;
  const domain = resolveTimelineDomain(model, { from: domainFrom, to: domainTo, plotWidth: width });
  const timeWindow = resolveTimelineWindow({ from: windowFrom, to: windowTo });
  const plotLeft = labelWidth + padding;
  const domainDays = domain.from_day == null ? 1 : Math.max(1, domain.to_day - domain.from_day);
  const pxPerDay = width / domainDays;
  const x = day => plotLeft + ((day - domain.from_day) / domainDays) * width;

  const hidden = { filtered: [], pre_domain: [], post_domain: [], undated: [] };
  const laneSpecs = [];
  for (const lane of grouping.lanes) laneSpecs.push({ id: lane.id, kind: 'entity', entity: lane, label: lane.label, rows: lane.rows });
  if (includeStrip && grouping.strip.rows.length) {
    laneSpecs.push({ id: grouping.strip.id, kind: 'strip', entity: null, label: grouping.strip.label, rows: grouping.strip.rows, strip: grouping.strip });
  }
  const blockSpecs = includeBlocks ? grouping.blocks.map(block => ({ id: `block:${block.surface_id}`, kind: 'block', entity: null, label: block.surface_label, rows: [], block })) : [];

  // Pass 1: decide which rows are drawn and collect same-day surface offsets.
  const placedByLane = new Map();
  const surfacesByDay = new Map();
  const noteDay = (day, surfaceId) => {
    if (!surfacesByDay.has(day)) surfacesByDay.set(day, new Set());
    surfacesByDay.get(day).add(surfaceId);
  };
  for (const spec of laneSpecs) {
    const kept = filterTimelineRows(spec.rows, { evidenceFloor, hop });
    const keptKeys = new Set(kept.map(row => row.key));
    for (const row of spec.rows) if (!keptKeys.has(row.key)) hidden.filtered.push(row.key);
    const placed = [];
    for (const row of kept) {
      if (row.start_day == null) { hidden.undated.push(row.key); continue; }
      if (domain.from_day == null) { hidden.undated.push(row.key); continue; }
      if (row.start_day < domain.from_day) { hidden.pre_domain.push(row.key); continue; }
      if (row.start_day > domain.to_day) { hidden.post_domain.push(row.key); continue; }
      placed.push(row);
      noteDay(row.start_day, row.surface_id);
    }
    placedByLane.set(spec.id, placed);
  }
  const blocksDrawn = blockSpecs.filter(spec => {
    const block = spec.block;
    if (block.day == null || domain.from_day == null) return false;
    if (block.day < domain.from_day || block.day > domain.to_day) return false;
    if (hop === 'hop' && !block.hop_eligible) return false;
    if (hop === 'context' && block.hop_eligible) return false;
    noteDay(block.day, block.surface_id);
    return true;
  });
  const surfaceOffset = (day, surfaceId) => {
    const list = [...(surfacesByDay.get(day) ?? [])].sort(compareText);
    const index = list.indexOf(surfaceId);
    return Math.max(0, index) * slotOffset;
  };

  // Pass 2: clusters, slots, lane heights, marks.
  const lanes = [];
  const marks = [];
  const clusters = [];
  const aggregates = [];
  let y = 0;
  let maxNamedStack = 0, maxStripStack = 0;
  for (const spec of laneSpecs) {
    const placed = placedByLane.get(spec.id) ?? [];
    const sorted = [...placed].sort((a, b) => a.start_day - b.start_day || compareText(a.surface_id, b.surface_id) || compareText(a.key, b.key));
    const laneClusters = [];
    // Marks stack when they share a day or would otherwise sit closer than the
    // cluster gap once the same-day surface offset is applied (so a +5px second
    // surface never overlaps a tick a few days later at phone widths).
    for (const row of sorted) {
      const drawnX = x(row.start_day) + surfaceOffset(row.start_day, row.surface_id);
      const current = laneClusters[laneClusters.length - 1];
      if (current && (row.start_day === current.day_to || drawnX - current.lastX < clusterGap)) {
        current.rows.push(row);
        current.lastX = Math.max(current.lastX, drawnX);
        current.day_to = row.start_day;
      } else {
        laneClusters.push({ rows: [row], firstX: drawnX, lastX: drawnX, day_from: row.start_day, day_to: row.start_day });
      }
    }
    const stack = laneClusters.reduce((max, cluster) => Math.max(max, Math.min(cluster.rows.length, maxSlots)), 0);
    if (spec.kind === 'entity') maxNamedStack = Math.max(maxNamedStack, stack);
    else maxStripStack = Math.max(maxStripStack, stack);
    const height = Math.max(laneHeight, 8 + markHeight * stack);
    const lane = {
      id: spec.id,
      kind: spec.kind,
      by: kind,
      entity_id: spec.entity?.id ?? null,
      label: spec.label,
      y,
      height,
      stack,
      row_count: spec.rows.length,
      drawn_count: 0,
      surface_ids: spec.entity ? [...spec.entity.surface_ids].sort(compareText) : uniqueList(placed.map(row => row.surface_id)).sort(compareText),
      entity_count: spec.strip?.entity_count ?? (spec.entity ? 1 : 0),
      hop_eligible_surface_count: spec.entity?.hop_eligible_surface_count ?? 0,
      first_day: spec.entity?.first_day ?? null,
      last_day: spec.entity?.last_day ?? null,
      has_open_end: spec.entity?.has_open_end ?? false,
      mark_keys: []
    };
    lanes.push(lane);
    laneClusters.forEach((cluster, clusterIndex) => {
      const size = cluster.rows.length;
      const visibleCount = size > maxSlots ? maxSlots - 1 : size;
      const stackHeight = Math.min(size, maxSlots) * markHeight;
      const top = y + (height - stackHeight) / 2;
      const clusterId = `${spec.id}#${clusterIndex}`;
      const clusterRecord = { id: clusterId, laneId: spec.id, day_from: cluster.day_from, day_to: cluster.day_to, size, mark_keys: [], hidden_keys: [], x: cluster.firstX };
      cluster.rows.forEach((row, index) => {
        if (index >= visibleCount) { clusterRecord.hidden_keys.push(row.key); return; }
        const offset = surfaceOffset(row.start_day, row.surface_id);
        const startX = x(row.start_day) + offset;
        let w = markWidth;
        let clippedEnd = false;
        if (row.kind === 'open') {
          w = Math.max(markWidth, x(domain.to_day) - x(row.start_day));
          clippedEnd = true;
        } else if (row.kind === 'span' || row.kind === 'year') {
          const endDay = row.end_day ?? row.start_day;
          const visibleEnd = Math.min(endDay, domain.to_day);
          clippedEnd = endDay > domain.to_day;
          w = Math.max(markWidth, x(visibleEnd) - x(row.start_day));
        }
        const mark = {
          key: row.key,
          laneId: spec.id,
          clusterId,
          slot: index,
          stack: Math.min(size, maxSlots),
          x: startX,
          w,
          y: top + index * markHeight,
          h: markHeight,
          surface_offset: offset,
          kind: row.kind,
          precision: row.precision,
          start_day: row.start_day,
          end_day: row.end_day,
          iso_start: isoFromDayIndex(row.start_day),
          iso_end: row.end_day == null ? null : isoFromDayIndex(row.end_day),
          time_start: row.time_start,
          time_end: row.time_end,
          clipped_end: clippedEnd,
          participant_type: row.participant_type,
          entity_id: row.entity_id,
          entity_label: row.entity_label,
          surface_id: row.surface_id,
          surface_label: row.surface_label,
          surface_type: row.surface_type,
          role: row.role,
          participation_type: row.participation_type,
          evidence_class: row.evidence_class,
          evidence_recorded: row.evidence_recorded,
          hop_eligible: row.surface_hop_eligible,
          hop_refusal_reason: row.hop_refusal_reason,
          reason_recorded: row.reason_recorded,
          hop_basis_count: row.hop_basis_count,
          receipt_ids: row.receipt_ids,
          dense: row.dense,
          in_window: rowInWindow(row, timeWindow.from_day, timeWindow.to_day)
        };
        marks.push(mark);
        lane.mark_keys.push(row.key);
        clusterRecord.mark_keys.push(row.key);
      });
      if (clusterRecord.hidden_keys.length) {
        const first = cluster.rows[visibleCount];
        aggregates.push({
          key: `aggregate::${clusterId}`,
          laneId: spec.id,
          clusterId,
          slot: maxSlots - 1,
          x: x(first.start_day) + surfaceOffset(first.start_day, first.surface_id),
          w: markWidth,
          y: top + (maxSlots - 1) * markHeight,
          h: markHeight,
          count: clusterRecord.hidden_keys.length,
          hidden_keys: clusterRecord.hidden_keys,
          receipt_ids: uniqueList(cluster.rows.slice(visibleCount).flatMap(row => row.receipt_ids)),
          surface_ids: uniqueList(cluster.rows.slice(visibleCount).map(row => row.surface_id))
        });
      }
      clusters.push(clusterRecord);
    });
    lane.drawn_count = lane.mark_keys.length;
    y += height;
  }

  // Blocks: one contained object per dense surface, in its own lane.
  const blocks = [];
  for (const spec of blocksDrawn) {
    const block = spec.block;
    const laneY = y;
    const startX = x(block.day) + surfaceOffset(block.day, block.surface_id);
    const w = Math.max(markWidth, x(Math.min(block.end_day ?? block.day, domain.to_day)) - x(block.day));
    lanes.push({
      id: spec.id, kind: 'block', by: kind, entity_id: null, label: block.surface_label, y: laneY, height: blockHeight, stack: 1,
      row_count: block.row_count, drawn_count: 1, surface_ids: [block.surface_id], entity_count: block.listed_count,
      hop_eligible_surface_count: 0, first_day: block.iso_day, last_day: isoFromDayIndex(block.end_day), has_open_end: false, mark_keys: [block.key]
    });
    blocks.push({
      key: block.key,
      laneId: spec.id,
      surface_id: block.surface_id,
      surface_label: block.surface_label,
      surface_type: block.surface_type,
      day: block.day,
      iso_day: block.iso_day,
      end_day: block.end_day,
      x: startX,
      w,
      y: laneY + 2,
      h: blockHeight - 4,
      listed_count: block.listed_count,
      organization_count: block.organization_count,
      row_count: block.row_count,
      member_keys: block.member_keys,
      evidence_counts: block.evidence_counts,
      evidence_class: block.evidence_class,
      hop_eligible: false,
      refusal_reason: block.refusal_reason,
      reason_recorded: block.reason_recorded,
      receipt_ids: block.receipt_ids,
      elsewhere: block.elsewhere,
      nowhere_else_count: block.nowhere_else_count,
      in_window: rowInWindow({ start_day: block.day, end_day: block.end_day, kind: block.kind }, timeWindow.from_day, timeWindow.to_day)
    });
    y += blockHeight;
  }
  const height = y;

  // Columns (actor grouping only): one per (day, surface) hop object inside the
  // domain; segments touch only lanes that hold a drawn mark of that surface
  // containing the day (SPEC fix b). Nothing connects two people directly.
  const columns = [];
  if (includeColumns && kind === 'actor' && domain.from_day != null && hop !== 'context') {
    const marksBySurface = new Map();
    for (const mark of marks) {
      if (!marksBySurface.has(mark.surface_id)) marksBySurface.set(mark.surface_id, []);
      marksBySurface.get(mark.surface_id).push(mark);
    }
    const hopDays = [...model.hopDays.values()].sort((a, b) => a.day - b.day || compareText(a.surface_id, b.surface_id));
    for (const hopDay of hopDays) {
      if (hopDay.day < domain.from_day || hopDay.day > domain.to_day) continue;
      const bases = hopDay.bases.filter(basis => meetsEvidenceFloor(basis.evidence_class, evidenceFloor));
      if (!bases.length) continue;
      const touching = (marksBySurface.get(hopDay.surface_id) ?? [])
        .filter(mark => mark.start_day <= hopDay.day && (mark.kind === 'open' || (mark.end_day ?? mark.start_day) >= hopDay.day));
      if (!touching.length) continue;
      const byLane = new Map();
      for (const mark of touching) {
        if (!byLane.has(mark.laneId)) byLane.set(mark.laneId, []);
        byLane.get(mark.laneId).push(mark);
      }
      const segments = [...byLane.entries()].map(([laneId, laneMarks]) => ({
        laneId,
        entity_ids: uniqueList(laneMarks.map(mark => mark.entity_id)).sort(compareText),
        y1: Math.min(...laneMarks.map(mark => mark.y)),
        y2: Math.max(...laneMarks.map(mark => mark.y + mark.h)),
        mark_keys: laneMarks.map(mark => mark.key)
      })).sort((a, b) => a.y1 - b.y1);
      columns.push({
        key: `column::${hopDay.iso_day}::${hopDay.surface_id}`,
        hop_day_key: hopDay.key,
        surface_id: hopDay.surface_id,
        surface_label: hopDay.surface_label,
        surface_type: hopDay.surface_type,
        day: hopDay.day,
        iso_day: hopDay.iso_day,
        x: x(hopDay.day) + surfaceOffset(hopDay.day, hopDay.surface_id),
        w: markWidth,
        basis_count: bases.length,
        actor_ids: [...hopDay.actor_ids].sort(compareText),
        visible_actor_ids: uniqueList(touching.map(mark => mark.entity_id)).sort(compareText),
        pairs: bases.map(basis => ({ actor_a: basis.actor_a, actor_b: basis.actor_b, actor_a_role: basis.actor_a_role, actor_b_role: basis.actor_b_role, evidence_class: basis.evidence_class, receipt_ids: basis.receipt_ids })),
        evidence_class: hopDay.evidence_class,
        hop_eligible: true,
        receipt_ids: uniqueList(bases.flatMap(basis => basis.receipt_ids)),
        mark_keys: touching.map(mark => mark.key),
        segments,
        in_window: rowInWindow({ start_day: hopDay.day, end_day: hopDay.day, kind: 'day' }, timeWindow.from_day, timeWindow.to_day)
      });
    }
  }

  // Overview strip over the whole record: row starts, hop days, dense days.
  const overviewFromDay = dayIndex(overviewFrom) ?? model.range.first_day_index;
  const overviewToDay = dayIndex(overviewTo, true) ?? (model.range.last_day_index == null ? null : model.range.last_day_index + TIMELINE_DOMAIN_PADDING_DAYS);
  const overviewDays = overviewFromDay == null || overviewToDay == null ? 1 : Math.max(1, overviewToDay - overviewFromDay);
  const overviewX = day => plotLeft + ((day - overviewFromDay) / overviewDays) * width;
  const overviewTicks = [];
  if (overviewFromDay != null) {
    for (const row of model.rows) if (row.start_day != null) overviewTicks.push({ kind: 'row', day: row.start_day, x: overviewX(row.start_day), key: row.key });
    for (const hopDay of model.hopDays.values()) overviewTicks.push({ kind: 'hop', day: hopDay.day, x: overviewX(hopDay.day), key: hopDay.key, surface_id: hopDay.surface_id });
    for (const block of model.dense) if (block.day != null) overviewTicks.push({ kind: 'dense', day: block.day, x: overviewX(block.day), key: block.key, surface_id: block.surface_id });
  }
  const overview = {
    from_day: overviewFromDay,
    to_day: overviewToDay,
    from: isoFromDayIndex(overviewFromDay),
    to: isoFromDayIndex(overviewToDay),
    ticks: overviewTicks,
    window: domain.from_day == null ? null : { x1: overviewX(domain.from_day), x2: overviewX(domain.to_day) }
  };

  const drawnRowCount = marks.length + aggregates.reduce((sum, aggregate) => sum + aggregate.count, 0) + blocks.reduce((sum, block) => sum + block.row_count, 0);
  const inWindowMarks = marks.filter(mark => mark.in_window).length + blocks.filter(block => block.in_window).reduce((sum, block) => sum + block.row_count, 0);
  const counts = {
    total_rows: model.rows.length,
    lanes: lanes.length,
    named_lanes: grouping.lanes.length,
    strip_rows: grouping.strip.row_count,
    strip_entities: grouping.strip.entity_count,
    marks: marks.length,
    aggregates: aggregates.length,
    aggregated_rows: aggregates.reduce((sum, aggregate) => sum + aggregate.count, 0),
    blocks: blocks.length,
    block_rows: blocks.reduce((sum, block) => sum + block.row_count, 0),
    columns: columns.length,
    drawn: marks.length + blocks.length + aggregates.length,
    rows_in_view: drawnRowCount,
    in_window: timeWindow.active ? inWindowMarks : drawnRowCount,
    filtered: hidden.filtered.length,
    pre_domain: hidden.pre_domain.length,
    post_domain: hidden.post_domain.length,
    undated: hidden.undated.length,
    max_named_stack: maxNamedStack,
    max_strip_stack: maxStripStack
  };

  return {
    schema_version: TIMELINE_MODEL_SCHEMA,
    by: kind,
    pinned: grouping.pinned,
    domain,
    window: timeWindow,
    filters: { evidenceFloor, hop: TIMELINE_HOP_FILTERS.includes(hop) ? hop : 'all' },
    metrics: { labelWidth, laneHeight, markHeight, markWidth, slotOffset, clusterGap, blockHeight, padding },
    width: labelWidth + padding * 2 + width,
    height,
    plotLeft,
    plotWidth: width,
    pxPerDay,
    lanes,
    marks,
    clusters,
    aggregates,
    columns,
    blocks,
    axisTicks: domain.from_day == null ? [] : axisTicks(domain.from_day, domain.to_day, x, width),
    overview,
    hidden,
    counts
  };
}

// The lane plus its rows sorted by start day (entity pages, search lines).
export function entityTimelineSummary(model, kind, id) {
  const lane = model?.lanes?.[kind]?.get(id);
  if (!lane) return null;
  const rows = [...lane.rows];
  const dated = rows.filter(row => row.start_day != null);
  const undated = rows.filter(row => row.start_day == null);
  const surfaceIds = [...lane.surface_ids].sort(compareText);
  return {
    kind,
    id,
    label: lane.label,
    lane,
    rows,
    dated_rows: dated,
    undated_rows: undated,
    row_count: lane.row_count,
    surface_count: lane.surface_count,
    hop_eligible_surface_count: lane.hop_eligible_surface_count,
    context_surface_count: lane.surface_count - lane.hop_eligible_surface_count,
    first_day: lane.first_day,
    last_day: lane.last_day,
    last_documented_day: lane.last_documented_day,
    has_open_end: lane.has_open_end,
    evidence_counts: lane.evidence_counts,
    type_counts: lane.type_counts,
    kind_counts: lane.kind_counts,
    co_organization_counts: lane.co_organization_counts,
    co_actor_counts: lane.co_actor_counts,
    hop_basis_count: lane.hop_basis_count,
    hop_partner_ids: lane.hop_partner_ids,
    dense_memberships: lane.dense_memberships,
    surface_ids: surfaceIds,
    receipt_ids: uniqueList(rows.flatMap(row => row.receipt_ids)).sort(compareText)
  };
}

// One lane for one actor, organization, surface type or surface: the entity
// pages' mini timeline. Same layout function, strip/blocks/columns off, full range.
export function entityLaneLayout(model, kind, id, options = {}) {
  const from = options.domainFrom || model.range.first_day || '';
  const to = options.domainTo || (model.range.last_day_index == null ? '' : isoFromDayIndex(model.range.last_day_index + TIMELINE_DOMAIN_PADDING_DAYS));
  return layoutTimeline(model, {
    ...options,
    by: kind,
    laneIds: [id],
    includeStrip: false,
    includeBlocks: false,
    includeColumns: false,
    domainFrom: from,
    domainTo: to
  });
}
