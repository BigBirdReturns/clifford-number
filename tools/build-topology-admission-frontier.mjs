#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll, readJson, writeJson } from './lib/ledger.mjs';

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
    const compiledPairKeys = basisPairsBySurface.get(surface.surface_id) ?? new Set();
    const missingPairKeys = expectedPairs
      .map(row => row.pair_key)
      .filter(key => !compiledPairKeys.has(key));
    const compiledBasisCount = basisCountBySurface.get(surface.surface_id) ?? 0;
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
      compiled_basis_count: compiledBasisCount,
      missing_actor_pair_keys: missingPairKeys,
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
        errors.push(`hop-eligible surface ${surface.surface_id} is missing compiled pair basis ${missingPairKey}`);
      }
      continue;
    }

    if (compiledBasisCount > 0) {
      errors.push(`non-hop surface ${surface.surface_id} supplies ${compiledBasisCount} compiled hop basis row(s)`);
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
      admitted_surface_rule: 'Every hop-eligible surface must contain at least two independently receipted actor participants and compile every actor pair as a surface basis.',
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
      compiled_basis_rows: admittedSurfaces.reduce(
        (sum, row) => sum + row.compiled_basis_count,
        0,
      ),
      actor_hop_edges: (hopGraph.edges ?? []).length,
      rejected_hop_surfaces: (hopGraph.rejected_hop_surfaces ?? []).length,
      rejected_hop_pairs: (hopGraph.rejected_hop_pairs ?? []).length,
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
      + `${report.counts.multi_actor_nonhop_without_refusal} ungoverned multi-actor, `
      + `${report.counts.actor_hop_edges} actor-hop edges`,
  );
}
