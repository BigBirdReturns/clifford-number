// Hop derivation and traversal.
//
// Temporal rule: a hop basis exists only for the window where both
// participations and the surface overlap. Two actors who touched the same
// surface in disjoint windows never shared the bounded context, so that
// surface creates no hop between them (recorded in rejected_hop_pairs).
//
// An undated participation cannot be placed in time. Bases involving one are
// kept for all-time topology but never support a time-sliced (asOf) claim.
import { combinations, uniq, evidenceWeight } from './ledger.mjs';
import { windowOf, intersect, intersectAll, overlapsPeriod, UNBOUNDED } from './temporal.mjs';
import { assessHopDensity } from './density.mjs';

export function weakestEvidence(classes) {
  const vals = classes.filter(Boolean);
  if (!vals.length) return 'reported';
  return vals.sort((a, b) => evidenceWeight(b) - evidenceWeight(a))[0];
}

function basisTemporalStatus(aDated, bDated, surfaceDated) {
  if (aDated && bDated) return 'dated';
  if (aDated || bDated) return 'partially_dated';
  return surfaceDated ? 'surface_window_only' : 'undated';
}

// Only fully dated bases can support a time-sliced claim: with an undated
// participant there is no receipt placing that person on the surface at any
// particular moment.
export function basisSupportsTimeSlice(basis) {
  return basis.temporal_status === 'dated';
}

export function basisWindow(basis) {
  return { valid_from: basis.valid_from ?? null, valid_until: basis.valid_until ?? null, dated: basis.temporal_status !== 'undated' };
}

export function receiptSupportsPublishedWindow(receipt) {
  if (!receipt || ['judgment', 'derived', 'open'].includes(receipt.evidence_class)) return false;
  if (receipt.archive?.method === 'unrecoverable_local_paste') return false;
  return /^https?:\/\//.test(String(receipt.path ?? ''))
    || Boolean(receipt.archive?.ref)
    || receipt.archive?.method === 'in_repo_content_hash';
}

function participantWindowIsReverifiable(participant, receiptById) {
  return (participant.receipt_ids ?? []).some(receiptId => receiptSupportsPublishedWindow(receiptById.get(receiptId)));
}

export function deriveHopEdges({ surfaces, participationBySurface, broadOrgIds, densityPolicy, receiptById = new Map() }) {
  const hopEdgeMap = new Map();
  const rejectedHopSurfaces = [];
  const rejectedHopPairs = [];

  for (const surface of surfaces) {
    const participants = participationBySurface.get(surface.surface_id) ?? [];
    const actorParts = participants.filter(p => p.participant_type === 'actor');
    const orgParts = participants.filter(p => p.participant_type === 'organization');

    if (!surface.hop_eligible) {
      rejectedHopSurfaces.push({ surface_id: surface.surface_id, reason: surface.hop_refusal_reason ?? 'surface_not_hop_eligible' });
      continue;
    }
    const density = assessHopDensity(surface, participants, densityPolicy);
    if (density.exceeds_limit) {
      rejectedHopSurfaces.push({
        surface_id: surface.surface_id,
        reason: 'density_limit_exceeded',
        actor_count: density.actor_count,
        max_hop_actor_count: density.max_hop_actor_count,
      });
      continue;
    }
    // Count actor identities, not participation rows: one actor may have
    // several legitimate stints on the same surface.
    const actorCount = density.actor_count;
    // Broad institutions can be participants in receipts, but never create actor hops by themselves.
    const onlyBroadOrgContext = actorCount < 2 && orgParts.some(p => broadOrgIds.has(p.organization_id));
    if (onlyBroadOrgContext) {
      rejectedHopSurfaces.push({ surface_id: surface.surface_id, reason: 'broad_institution_context_only' });
      continue;
    }
    if (actorCount < 2) {
      rejectedHopSurfaces.push({ surface_id: surface.surface_id, reason: 'fewer_than_two_actor_participants' });
      continue;
    }

    const surfaceWin = windowOf(surface);

    for (const [a, b] of combinations(actorParts)) {
      // Multiple stints for one actor are separate temporal rows, not two
      // participants. Never turn their cartesian pairing into a self-hop or a
      // rejected self-pair. Pair each stint only with a different actor.
      if (a.actor_id === b.actor_id) continue;
      const ids = [a.actor_id, b.actor_id].sort();
      const aWin = windowOf(a);
      const bWin = windowOf(b);
      const overlap = intersectAll([
        surfaceWin.dated ? surfaceWin : UNBOUNDED,
        aWin.dated ? aWin : UNBOUNDED,
        bWin.dated ? bWin : UNBOUNDED,
      ]);
      if (overlap === null) {
        const actorAPart = ids[0] === a.actor_id ? a : b;
        const actorBPart = ids[1] === b.actor_id ? b : a;
        const actorAWindow = ids[0] === a.actor_id ? aWin : bWin;
        const actorBWindow = ids[1] === b.actor_id ? bWin : aWin;
        const actorAReceiptIds = uniq(actorAPart.receipt_ids ?? []);
        const actorBReceiptIds = uniq(actorBPart.receipt_ids ?? []);
        const surfaceReceiptIds = uniq(surface.receipt_ids ?? []);
        const actorAWindowReverifiable = participantWindowIsReverifiable(actorAPart, receiptById);
        const actorBWindowReverifiable = participantWindowIsReverifiable(actorBPart, receiptById);
        const publicationStatus = actorAWindowReverifiable && actorBWindowReverifiable ? 'verified' : 'review_required';
        rejectedHopPairs.push({
          surface_id: surface.surface_id,
          actor_a: ids[0],
          actor_b: ids[1],
          reason: aWin.dated && bWin.dated && intersect(aWin, bWin) === null
            ? 'no_temporal_overlap'
            : 'no_temporal_overlap_with_surface_window',
          actor_a_window: actorAWindow,
          actor_b_window: actorBWindow,
          surface_window: surfaceWin,
          actor_a_receipt_ids: actorAReceiptIds,
          actor_b_receipt_ids: actorBReceiptIds,
          surface_receipt_ids: surfaceReceiptIds,
          receipt_ids: uniq([...surfaceReceiptIds, ...actorAReceiptIds, ...actorBReceiptIds]),
          evidence_class: weakestEvidence([surface.evidence_class, actorAPart.evidence_class, actorBPart.evidence_class]),
          actor_a_window_reverifiable: actorAWindowReverifiable,
          actor_b_window_reverifiable: actorBWindowReverifiable,
          publication_status: publicationStatus,
          publication_reason: publicationStatus === 'verified'
            ? 'both_actor_windows_have_reverifiable_receipts'
            : 'actor_window_receipts_not_publicly_reverifiable',
        });
        continue;
      }

      const key = `${ids[0]}||${ids[1]}`;
      if (!hopEdgeMap.has(key)) {
        hopEdgeMap.set(key, {
          actor_a: ids[0],
          actor_b: ids[1],
          surfaces: [],
          evidence_weight: Infinity,
        });
      }
      const edge = hopEdgeMap.get(key);
      const receipts = uniq([...(surface.receipt_ids ?? []), ...(a.receipt_ids ?? []), ...(b.receipt_ids ?? [])]);
      edge.surfaces.push({
        surface_id: surface.surface_id,
        surface_label: surface.surface_label,
        surface_type: surface.surface_type,
        secondary_surface_types: surface.secondary_surface_types ?? [],
        actor_a_role: ids[0] === a.actor_id ? a.role : b.role,
        actor_b_role: ids[1] === b.actor_id ? b.role : a.role,
        evidence_class: weakestEvidence([surface.evidence_class, a.evidence_class, b.evidence_class]),
        receipt_ids: receipts,
        valid_from: overlap.valid_from,
        valid_until: overlap.valid_until,
        temporal_status: basisTemporalStatus(aWin.dated, bWin.dated, surfaceWin.dated),
      });
      const ew = evidenceWeight(weakestEvidence([surface.evidence_class, a.evidence_class, b.evidence_class]));
      edge.evidence_weight = Math.min(edge.evidence_weight, ew);
    }
  }

  const edges = [];
  for (const edge of hopEdgeMap.values()) {
    edge.surface_count = edge.surfaces.length;
    edge.temporal_envelope = edgeEnvelope(edge.surfaces);
    edge.temporal_status = edge.surfaces.every(basisSupportsTimeSlice) ? 'dated'
      : edge.surfaces.some(basisSupportsTimeSlice) ? 'mixed'
      : 'undated';
    edges.push(edge);
  }
  edges.sort((a, b) => `${a.actor_a}-${a.actor_b}`.localeCompare(`${b.actor_a}-${b.actor_b}`));
  return { edges, rejectedHopSurfaces, rejectedHopPairs };
}

// Envelope over the windows of time-placeable bases: the earliest evidence of
// shared context to the latest (null = open end on either side).
function edgeEnvelope(bases) {
  const windowed = bases.filter(b => b.temporal_status !== 'undated');
  if (!windowed.length) return null;
  let from = windowed[0].valid_from;
  let until = windowed[0].valid_until;
  for (const b of windowed.slice(1)) {
    if (from !== null) from = b.valid_from === null ? null : (b.valid_from < from ? b.valid_from : from);
    if (until !== null) until = b.valid_until === null ? null : (b.valid_until > until ? b.valid_until : until);
  }
  return { valid_from: from, valid_until: until };
}

export function buildAdjacency(edges) {
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.actor_a)) adj.set(e.actor_a, []);
    if (!adj.has(e.actor_b)) adj.set(e.actor_b, []);
    adj.get(e.actor_a).push({ to: e.actor_b, edge: e });
    adj.get(e.actor_b).push({ to: e.actor_a, edge: e });
  }
  return adj;
}

// asOf ("2020", "2020-03", "2020-03-14") restricts traversal to bases that
// are fully dated and overlap that period; the hop's shared_surfaces then
// list only the bases that support the time-sliced claim.
function traversableBases(edge, asOf) {
  if (!asOf) return edge.surfaces;
  return edge.surfaces.filter(b => basisSupportsTimeSlice(b) && overlapsPeriod(basisWindow(b), asOf));
}

export function shortestPath(adjacency, start, target, { asOf = null } = {}) {
  if (start === target) return { number: 0, actor_path: [target], hops: [] };
  const q = [{ actor: start, actor_path: [start], hops: [] }];
  const seen = new Set([start]);
  while (q.length) {
    const cur = q.shift();
    for (const next of adjacency.get(cur.actor) ?? []) {
      if (seen.has(next.to)) continue;
      const bases = traversableBases(next.edge, asOf);
      if (!bases.length) continue;
      const actor_path = [...cur.actor_path, next.to];
      const hops = [...cur.hops, {
        from: cur.actor,
        to: next.to,
        shared_surfaces: bases,
      }];
      if (next.to === target) return { number: actor_path.length - 1, actor_path, hops };
      seen.add(next.to);
      q.push({ actor: next.to, actor_path, hops });
    }
  }
  return { number: null, actor_path: [], hops: [] };
}
