#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll, readJson, writeJson } from './lib/ledger.mjs';
import { windowOf } from './lib/temporal.mjs';

const TEMPORAL_REFUSAL_REASONS = new Set([
  'no_temporal_overlap',
  'no_temporal_overlap_with_surface_window',
]);

function uniqueSorted(values = []) {
  return [...new Set(values.filter(Boolean))].sort();
}

function pairKey(left, right) {
  return [left, right].sort().join('|');
}

function actorPairs(actorIds) {
  const ids = uniqueSorted(actorIds);
  const pairs = [];
  for (let left = 0; left < ids.length; left += 1) {
    for (let right = left + 1; right < ids.length; right += 1) {
      pairs.push({
        actor_a: ids[left],
        actor_b: ids[right],
        pair_key: pairKey(ids[left], ids[right]),
      });
    }
  }
  return pairs;
}

function surfaceParticipants(participation, surfaceId, participantType) {
  return participation.filter(row =>
    row.surface_id === surfaceId && row.participant_type === participantType);
}


function sameWindow(left = {}, right = {}) {
  return (left.valid_from ?? null) === (right.valid_from ?? null)
    && (left.valid_until ?? null) === (right.valid_until ?? null)
    && Boolean(left.dated) === Boolean(right.dated);
}

function sameReceiptSet(left = [], right = []) {
  return JSON.stringify(uniqueSorted(left)) === JSON.stringify(uniqueSorted(right));
}

function exactParticipationErrors({
  participation,
  basis,
  surfaceId,
  endpointPair,
  endpointName,
  actorId,
}) {
  const errors = [];
  const exact = basis[`${endpointName}_participation`];
  if (!exact || typeof exact !== 'object') {
    errors.push(
      `hop edge ${endpointPair} basis ${surfaceId} is missing exact ${endpointName}_participation`,
    );
    return errors;
  }
  if (exact.actor_id !== actorId) {
    errors.push(
      `hop edge ${endpointPair} basis ${surfaceId} exact ${endpointName} actor mismatch: ${exact.actor_id}`,
    );
  }
  const exactReceiptIds = uniqueSorted(exact.receipt_ids ?? []);
  if (!exactReceiptIds.length) {
    errors.push(
      `hop edge ${endpointPair} basis ${surfaceId} exact ${endpointName} participation has no receipt_ids`,
    );
  }
  const matches = surfaceParticipants(participation, surfaceId, 'actor')
    .filter(row => row.actor_id === actorId)
    .filter(row =>
      (row.role ?? null) === (exact.role ?? null)
      && (row.participation_type ?? null) === (exact.participation_type ?? null)
      && (row.evidence_class ?? null) === (exact.evidence_class ?? null)
      && sameWindow(windowOf(row), exact.window)
      && sameReceiptSet(row.receipt_ids ?? [], exactReceiptIds));
  if (matches.length !== 1) {
    errors.push(
      `hop edge ${endpointPair} basis ${surfaceId} exact ${endpointName} participation matched ${matches.length} canonical rows`,
    );
  }
  const basisReceiptIds = new Set(basis.receipt_ids ?? []);
  for (const receiptId of exactReceiptIds) {
    if (!basisReceiptIds.has(receiptId)) {
      errors.push(
        `hop edge ${endpointPair} basis ${surfaceId} omits exact ${endpointName} receipt ${receiptId}`,
      );
    }
  }
  return errors;
}

export function analyzeTopologyAdmissionFrontier({
  actors = [],
  organizations = [],
  surfaces = [],
  participation = [],
  hopGraph = {},
  generated = new Date().toISOString(),
} = {}) {
  const errors = [];
  const actorIds = new Set(actors.map(row => row.id));
  const organizationIds = new Set(organizations.map(row => row.id));
  const surfaceById = new Map(surfaces.map(row => [row.surface_id, row]));
  const basisPairsBySurface = new Map();
  const basisCountBySurface = new Map();
  const temporalPairKeysBySurface = new Map();
  const temporalPairRowsBySurface = new Map();

  for (const edge of hopGraph.edges ?? []) {
    const endpointPair = pairKey(edge.actor_a, edge.actor_b);
    if (!edge.actor_a || !edge.actor_b || edge.actor_a === edge.actor_b) {
      errors.push(`invalid hop edge endpoints: ${JSON.stringify({ actor_a: edge.actor_a, actor_b: edge.actor_b })}`);
    }
    for (const endpoint of [edge.actor_a, edge.actor_b]) {
      if (organizationIds.has(endpoint)) {
        errors.push(`hop edge ${endpointPair} uses organization endpoint ${endpoint}`);
      }
      if (!actorIds.has(endpoint)) {
        errors.push(`hop edge ${endpointPair} uses unknown actor endpoint ${endpoint}`);
      }
    }

    for (const basis of edge.surfaces ?? []) {
      const surface = surfaceById.get(basis.surface_id);
      if (!surface) {
        errors.push(`hop edge ${endpointPair} references missing surface ${basis.surface_id}`);
        continue;
      }
      if (surface.hop_eligible !== true) {
        errors.push(`hop edge ${endpointPair} uses non-hop surface ${basis.surface_id}`);
      }
      if (!(basis.receipt_ids ?? []).length) {
        errors.push(`hop edge ${endpointPair} basis ${basis.surface_id} has no receipt_ids`);
      }

      errors.push(...exactParticipationErrors({
        participation,
        basis,
        surfaceId: basis.surface_id,
        endpointPair,
        endpointName: 'actor_a',
        actorId: edge.actor_a,
      }));
      errors.push(...exactParticipationErrors({
        participation,
        basis,
        surfaceId: basis.surface_id,
        endpointPair,
        endpointName: 'actor_b',
        actorId: edge.actor_b,
      }));

      const surfaceActorIds = new Set(surfaceParticipants(
        participation,
        basis.surface_id,
        'actor',
      ).map(row => row.actor_id));
      for (const endpoint of [edge.actor_a, edge.actor_b]) {
        if (!surfaceActorIds.has(endpoint)) {
          errors.push(`hop edge ${endpointPair} basis ${basis.surface_id} lacks actor participation for ${endpoint}`);
        }
      }

      if (!basisPairsBySurface.has(basis.surface_id)) {
        basisPairsBySurface.set(basis.surface_id, new Set());
      }
      basisPairsBySurface.get(basis.surface_id).add(endpointPair);
      basisCountBySurface.set(
        basis.surface_id,
        (basisCountBySurface.get(basis.surface_id) ?? 0) + 1,
      );
    }
  }

  for (const rejected of hopGraph.rejected_hop_pairs ?? []) {
    const endpointPair = pairKey(rejected.actor_a, rejected.actor_b);
    const surface = surfaceById.get(rejected.surface_id);
    if (!rejected.actor_a || !rejected.actor_b || rejected.actor_a === rejected.actor_b) {
      errors.push(`invalid temporal refusal endpoints: ${JSON.stringify({ actor_a: rejected.actor_a, actor_b: rejected.actor_b })}`);
    }
    for (const endpoint of [rejected.actor_a, rejected.actor_b]) {
      if (organizationIds.has(endpoint)) {
        errors.push(`temporal refusal ${endpointPair} uses organization endpoint ${endpoint}`);
      }
      if (!actorIds.has(endpoint)) {
        errors.push(`temporal refusal ${endpointPair} uses unknown actor endpoint ${endpoint}`);
      }
    }
    if (!surface) {
      errors.push(`temporal refusal ${endpointPair} references missing surface ${rejected.surface_id}`);
      continue;
    }
    if (surface.hop_eligible !== true) {
      errors.push(`temporal refusal ${endpointPair} uses non-hop surface ${rejected.surface_id}`);
    }
    if (!TEMPORAL_REFUSAL_REASONS.has(rejected.reason)) {
      errors.push(`temporal refusal ${endpointPair} on ${rejected.surface_id} has unsupported reason ${rejected.reason}`);
    }
    if (!(rejected.receipt_ids ?? []).length) {
      errors.push(`temporal refusal ${endpointPair} on ${rejected.surface_id} has no receipt_ids`);
    }
    const surfaceActorIds = new Set(surfaceParticipants(
      participation,
      rejected.surface_id,
      'actor',
    ).map(row => row.actor_id));
    for (const endpoint of [rejected.actor_a, rejected.actor_b]) {
      if (!surfaceActorIds.has(endpoint)) {
        errors.push(`temporal refusal ${endpointPair} on ${rejected.surface_id} lacks actor participation for ${endpoint}`);
      }
    }
    if (!temporalPairKeysBySurface.has(rejected.surface_id)) {
      temporalPairKeysBySurface.set(rejected.surface_id, new Set());
      temporalPairRowsBySurface.set(rejected.surface_id, []);
    }
    temporalPairKeysBySurface.get(rejected.surface_id).add(endpointPair);
    temporalPairRowsBySurface.get(rejected.surface_id).push({
      actor_a: rejected.actor_a,
      actor_b: rejected.actor_b,
      pair_key: endpointPair,
      reason: rejected.reason,
      receipt_ids: uniqueSorted(rejected.receipt_ids ?? []),
      publication_status: rejected.publication_status ?? null,
      actor_a_window: rejected.actor_a_window ?? null,
      actor_b_window: rejected.actor_b_window ?? null,
      surface_window: rejected.surface_window ?? null,
    });
  }

  const admittedSurfaces = [];
  const refusedSurfaces = [];
  const contextOnlySurfaces = [];
  const ungovernedMultiActorSurfaces = [];

  for (const surface of surfaces) {
    const actorRows = surfaceParticipants(participation, surface.surface_id, 'actor');
    const organizationRows = surfaceParticipants(
      participation,
      surface.surface_id,
      'organization',
    );
    const surfaceActorIds = uniqueSorted(actorRows.map(row => row.actor_id));
    const surfaceOrganizationIds = uniqueSorted(
      organizationRows.map(row => row.organization_id),
    );
    const expectedPairs = actorPairs(surfaceActorIds);
    const expectedPairKeys = new Set(expectedPairs.map(row => row.pair_key));
    const compiledPairKeys = basisPairsBySurface.get(surface.surface_id) ?? new Set();
    const temporalPairKeys = temporalPairKeysBySurface.get(surface.surface_id) ?? new Set();
    const coveredPairKeys = new Set([...compiledPairKeys, ...temporalPairKeys]);
    const missingPairKeys = expectedPairs
      .map(row => row.pair_key)
      .filter(key => !coveredPairKeys.has(key));
    const compiledBasisCount = basisCountBySurface.get(surface.surface_id) ?? 0;
    const temporalRefusals = [
      ...(temporalPairRowsBySurface.get(surface.surface_id) ?? []),
    ].sort((left, right) => left.pair_key.localeCompare(right.pair_key));
    for (const key of compiledPairKeys) {
      if (!expectedPairKeys.has(key)) {
        errors.push(`surface ${surface.surface_id} has unexpected compiled pair basis ${key}`);
      }
    }
    for (const key of temporalPairKeys) {
      if (!expectedPairKeys.has(key)) {
        errors.push(`surface ${surface.surface_id} has unexpected temporal refusal ${key}`);
      }
    }
    const row = {
      surface_id: surface.surface_id,
      surface_label: surface.surface_label,
      surface_type: surface.surface_type,
      hop_eligible: surface.hop_eligible,
      hop_refusal_reason: surface.hop_refusal_reason ?? null,
      actor_ids: surfaceActorIds,
      organization_ids: surfaceOrganizationIds,
      actor_count: surfaceActorIds.length,
      organization_count: surfaceOrganizationIds.length,
      expected_actor_pair_count: expectedPairs.length,
      compiled_actor_pair_count: compiledPairKeys.size,
      temporally_refused_actor_pair_count: temporalPairKeys.size,
      covered_actor_pair_count: expectedPairs
        .filter(pair => coveredPairKeys.has(pair.pair_key)).length,
      compiled_basis_count: compiledBasisCount,
      missing_actor_pair_keys: missingPairKeys,
      temporal_refusals: temporalRefusals,
      receipt_ids: uniqueSorted(surface.receipt_ids ?? []),
      evidence_class: surface.evidence_class ?? null,
      time_start: surface.time_start ?? null,
      time_end: surface.time_end ?? null,
    };

    if (surface.hop_eligible === true) {
      admittedSurfaces.push(row);
      if (surface.hop_refusal_reason) {
        errors.push(`hop-eligible surface ${surface.surface_id} also declares hop_refusal_reason`);
      }
      if (surfaceActorIds.length < 2) {
        errors.push(`hop-eligible surface ${surface.surface_id} has fewer than two distinct actor participants`);
      }
      if (!(surface.receipt_ids ?? []).length) {
        errors.push(`hop-eligible surface ${surface.surface_id} has no surface receipt_ids`);
      }
      for (const actorId of surfaceActorIds) {
        const actorParticipationRows = actorRows.filter(row => row.actor_id === actorId);
        if (!actorParticipationRows.some(part => (part.receipt_ids ?? []).length > 0)) {
          errors.push(`hop-eligible surface ${surface.surface_id} actor ${actorId} has no receipted participation row`);
        }
      }
      for (const missingPairKey of missingPairKeys) {
        errors.push(`hop-eligible surface ${surface.surface_id} is missing compiled or temporally refused pair ${missingPairKey}`);
      }
      continue;
    }

    if (compiledBasisCount > 0) {
      errors.push(`non-hop surface ${surface.surface_id} supplies ${compiledBasisCount} compiled hop basis row(s)`);
    }
    if (temporalRefusals.length > 0) {
      errors.push(`non-hop surface ${surface.surface_id} supplies ${temporalRefusals.length} temporal pair refusal row(s)`);
    }

    if (surface.hop_refusal_reason) {
      refusedSurfaces.push(row);
      continue;
    }

    if (surfaceActorIds.length >= 2) {
      ungovernedMultiActorSurfaces.push(row);
      errors.push(`surface ${surface.surface_id} is non-hop with ${surfaceActorIds.length} distinct actor participants but has no hop_refusal_reason`);
      continue;
    }

    contextOnlySurfaces.push({
      ...row,
      context_class: surfaceActorIds.length === 1
        ? 'singleton_actor_context_without_explicit_refusal'
        : 'zero_actor_context_without_explicit_refusal',
    });
  }

  admittedSurfaces.sort((left, right) => left.surface_id.localeCompare(right.surface_id));
  refusedSurfaces.sort((left, right) => left.surface_id.localeCompare(right.surface_id));
  contextOnlySurfaces.sort((left, right) => left.surface_id.localeCompare(right.surface_id));
  ungovernedMultiActorSurfaces.sort((left, right) =>
    left.surface_id.localeCompare(right.surface_id));

  const report = {
    schema_version: 'clifford-topology-admission-frontier@1',
    generated,
    graph_effect: 'audit_only',
    rules: {
      actor_endpoint_rule: 'Only canonical actors may occupy actor_a or actor_b.',
      admitted_surface_rule: 'Every hop-eligible surface must contain at least two independently receipted actor participants and cover every actor pair with either a compiled basis or an explicit receipted temporal refusal.',
      refusal_rule: 'Every non-hop surface with two or more distinct actor participants must publish a non-empty hop_refusal_reason.',
      organization_rule: 'Organization participation is preserved as context and cannot satisfy an actor endpoint or actor-pair denominator.',
    },
    counts: {
      surfaces: surfaces.length,
      admitted_surfaces: admittedSurfaces.length,
      refused_surfaces: refusedSurfaces.length,
      context_only_surfaces_without_explicit_refusal: contextOnlySurfaces.length,
      multi_actor_nonhop_without_refusal: ungovernedMultiActorSurfaces.length,
      expected_actor_pair_bases: admittedSurfaces.reduce(
        (sum, row) => sum + row.expected_actor_pair_count,
        0,
      ),
      compiled_actor_pair_bases: admittedSurfaces.reduce(
        (sum, row) => sum + row.compiled_actor_pair_count,
        0,
      ),
      temporally_refused_actor_pairs: admittedSurfaces.reduce(
        (sum, row) => sum + row.temporally_refused_actor_pair_count,
        0,
      ),
      covered_actor_pair_bases: admittedSurfaces.reduce(
        (sum, row) => sum + row.covered_actor_pair_count,
        0,
      ),
      missing_actor_pair_bases: admittedSurfaces.reduce(
        (sum, row) => sum + row.missing_actor_pair_keys.length,
        0,
      ),
      compiled_basis_rows: admittedSurfaces.reduce(
        (sum, row) => sum + row.compiled_basis_count,
        0,
      ),
      actor_hop_edges: (hopGraph.edges ?? []).length,
      rejected_hop_surfaces: (hopGraph.rejected_hop_surfaces ?? []).length,
      rejected_hop_pair_rows: (hopGraph.rejected_hop_pairs ?? []).length,
      errors: errors.length,
    },
    admitted_surfaces: admittedSurfaces,
    refused_surfaces: refusedSurfaces,
    context_only_surfaces_without_explicit_refusal: contextOnlySurfaces,
    multi_actor_nonhop_without_refusal: ungovernedMultiActorSurfaces,
    errors: [...errors].sort(),
  };

  return { report, errors: report.errors };
}

export function buildTopologyAdmissionFrontier() {
  const data = loadAll();
  const hopGraph = readJson('build/hop-graph.json');
  const result = analyzeTopologyAdmissionFrontier({
    actors: data.actors,
    organizations: data.organizations,
    surfaces: data.surfaces,
    participation: data.participation,
    hopGraph,
  });
  writeJson('build/topology-admission-frontier.json', result.report);
  return result;
}

const invokedAsScript = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsScript) {
  const { report, errors } = buildTopologyAdmissionFrontier();
  if (errors.length) {
    console.error(`topology admission frontier: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(
    `topology admission frontier: ${report.counts.admitted_surfaces} admitted, `
      + `${report.counts.refused_surfaces} refused, `
      + `${report.counts.temporally_refused_actor_pairs} temporal pair refusals, `
      + `${report.counts.multi_actor_nonhop_without_refusal} ungoverned multi-actor, `
      + `${report.counts.actor_hop_edges} actor-hop edges`,
  );
}
