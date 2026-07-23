#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readJsonl, root, writeJson } from './lib/ledger.mjs';

export const GAME_TRAIL_MANIFEST_SCHEMA = 'estate-game-trail-manifest@2';
export const LEGACY_RUN_SCHEMA = 'estate-legacy-game-trail-run@2';
export const SOURCE_ROUTE_RUN_SCHEMA = 'estate-source-route-game-trail@1';
export const CUSTODY_RUN_SCHEMA = 'estate-custody-game-trail@1';
export const ESTATE_SUMMARY_SCHEMA = 'estate-frontier-game-trail@1';

const REGISTRY_PATH = 'build/estates/index.json';
const ROUTE_REGISTRY_PATH = 'data/estates/source-route-registry.json';
const METHODOLOGY_PATH = 'data/gametrails/methodology.json';
const LEGACY_MAP_PATH = 'data/gametrails/legacy-seed-map.jsonl';
const AUTHORED_CHECKPOINTS_PATH = 'data/gametrails/authored-checkpoints.json';
const ARC_TRAILS_PATH = 'cases/arcadia-field-autopsy/trails.jsonl';
const DEFENSE_TRAILS_PATH = 'data/intake/person-centered-defense-routers/evidence-trails.jsonl';
const DEFENSE_FRONTIER_PATH = 'data/intake/person-centered-defense-routers/trail-frontier.jsonl';
const CROSS_CORPUS_PATH = 'data/research/clifford-cross-corpus-public-interest-map.json';
const COMPOSITE_PATH = 'data/research/clifford-thiel-trump-wrap-up.json';
const OUTPUT_DIR = 'build/estate-game-trails';
const PUBLIC_DIR = 'gametrails';
const PUBLIC_DATA = `${PUBLIC_DIR}/data.json`;
const COMPATIBILITY_DATA = 'estates/trails.json';
const HANDOFF_DIR = 'gametrail-handoffs';
const FRONTIER_SURVEY_MANIFEST_PATH = 'build/estate-frontier/manifest.json';
const FORBIDDEN = /^(?:score|rank|ranking|verdict|finding|guilt_score|risk_score|probability_score|publication_approval)$/i;
const OVERLAP_CLASSES = ['typed_object_overlap', 'shared_custody_overlap', 'shared_source_infrastructure'];

const stable = value => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
    : value;
const digest = (value, length = 20) => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex').slice(0, length);
const unique = values => [...new Set(values.filter(value => value !== null && value !== undefined && value !== ''))].sort();
const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function fail(message) { throw new Error(`estate-game-trails: ${message}`); }
function countBy(rows, key) {
  const values = unique(rows.map(row => row[key]));
  return Object.fromEntries(values.map(value => [value, rows.filter(row => row[key] === value).length]));
}
function walk(value, visit, pointer = '$') {
  if (Array.isArray(value)) return value.forEach((item, index) => walk(item, visit, `${pointer}[${index}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    visit(key, item, `${pointer}.${key}`);
    walk(item, visit, `${pointer}.${key}`);
  }
}
function assertBoundary(value, label) {
  walk(value, (key, item, pointer) => {
    if (FORBIDDEN.test(key)) fail(`${label} contains prohibited field ${pointer}`);
    if (key === 'graph_effect' && item !== 'none') fail(`${label} contains graph-active field ${pointer}`);
    if (key === 'conclusion_generated' && item !== false) fail(`${label} contains conclusion-generating field ${pointer}`);
  });
}
function objectKindFromMembershipKey(key) {
  return key.replace(/^(?:primary|related)_/, '').replace(/s$/, '');
}
function roleFromMembershipKey(key) {
  return key.startsWith('primary_') ? 'primary' : 'related';
}
function sourcePathForObjectKind(kind) {
  return {
    case: 'data/estates/case-map.jsonl',
    track: 'data/estates/track-map.jsonl',
    slice: 'data/estates/slice-map.jsonl',
  }[kind] ?? 'build/estates/index.json';
}
function tokenFromAnchor(anchor) {
  const text = String(anchor);
  const index = text.indexOf(':');
  return index > 0 ? { type: text.slice(0, index), id: text.slice(index + 1) } : { type: 'anchor', id: text };
}
function overlapClassForLegacyState(methodology, state) {
  if (state === 'origin_custody' || state === 'not_reached_under_declared_predicate') return null;
  return methodology.state_to_overlap_class[state] ?? null;
}

function loadLegacySources() {
  const arcadia = readJsonl(ARC_TRAILS_PATH).map(row => ({
    trail_id: row.trail_id,
    source_collection: 'arcadia',
    source_path: ARC_TRAILS_PATH,
    snapshot: row,
  }));
  const defenseFrontier = new Map(readJsonl(DEFENSE_FRONTIER_PATH).map(row => [row.frontier_id, row]));
  const defense = readJsonl(DEFENSE_TRAILS_PATH).map(row => {
    const personKey = row.trail_id.replace(/^trail-/, '').replace(/-(?:service|validation|vehicle|shared-company)$/, '');
    return {
      trail_id: row.trail_id,
      source_collection: 'person_centered_defense',
      source_path: DEFENSE_TRAILS_PATH,
      snapshot: row,
      frontier_snapshot: defenseFrontier.get(`frontier-${personKey}`) ?? null,
    };
  });
  const crossDocument = readJson(CROSS_CORPUS_PATH);
  const cross = (crossDocument.cross_lane_trails ?? []).map(row => ({
    trail_id: row.trail_id,
    source_collection: 'cross_corpus_public_interest',
    source_path: CROSS_CORPUS_PATH,
    snapshot: row,
  }));
  const compositeDocument = readJson(COMPOSITE_PATH);
  const composite = (compositeDocument.composite_trails ?? []).map(row => ({
    trail_id: row.trail_id,
    source_collection: 'clifford_thiel_trump_wrap_up',
    source_path: COMPOSITE_PATH,
    snapshot: row,
  }));
  const rows = [...arcadia, ...defense, ...cross, ...composite].sort((a, b) => a.trail_id.localeCompare(b.trail_id));
  if (new Set(rows.map(row => row.trail_id)).size !== rows.length) fail('legacy source trails contain duplicate IDs');
  return rows;
}

function compileRouteContext(registry, routeRegistry) {
  const routeByLabel = new Map();
  const routeById = new Map();
  for (const route of routeRegistry.routes ?? []) {
    if (routeByLabel.has(route.route_label)) fail(`duplicate source route label ${route.route_label}`);
    if (routeById.has(route.route_id)) fail(`duplicate source route ID ${route.route_id}`);
    routeByLabel.set(route.route_label, route);
    routeById.set(route.route_id, route);
  }
  const byEstate = new Map();
  const familyToEstates = new Map();
  const actualUsageByLabel = new Map();
  for (const estate of registry.estates) {
    const routes = estate.next_acquisition.source_routes.map(label => {
      const route = routeByLabel.get(label);
      if (!route) fail(`${estate.estate_id} references missing source route ${label}`);
      if (!actualUsageByLabel.has(label)) actualUsageByLabel.set(label, new Set());
      actualUsageByLabel.get(label).add(estate.estate_id);
      if (!familyToEstates.has(route.canonical_family_id)) familyToEstates.set(route.canonical_family_id, new Set());
      familyToEstates.get(route.canonical_family_id).add(estate.estate_id);
      return route;
    });
    byEstate.set(estate.estate_id, {
      routes,
      route_labels: routes.map(route => route.route_label),
      route_ids: routes.map(route => route.route_id),
      canonical_family_ids: unique(routes.map(route => route.canonical_family_id)),
    });
  }
  for (const route of routeRegistry.routes ?? []) {
    const expected = [...(actualUsageByLabel.get(route.route_label) ?? [])].sort();
    const declared = unique(route.used_by_estate_ids ?? []);
    if (JSON.stringify(expected) !== JSON.stringify(declared)) {
      fail(`${route.route_label} used_by_estate_ids diverged; expected [${expected.join(', ')}], saw [${declared.join(', ')}]`);
    }
  }
  const computedCounts = {
    route_labels: routeByLabel.size,
    canonical_families: new Set((routeRegistry.routes ?? []).map(route => route.canonical_family_id)).size,
    route_uses: [...byEstate.values()].reduce((sum, value) => sum + value.routes.length, 0),
  };
  for (const [key, value] of Object.entries(computedCounts)) {
    if (routeRegistry.counts?.[key] !== value) fail(`source route registry count ${key} drifted: ${routeRegistry.counts?.[key]} != ${value}`);
  }
  return { routeByLabel, routeById, byEstate, familyToEstates, computedCounts };
}

function generatedCheckpoints(mapping) {
  if (mapping.mapping_state === 'unresolved_boundary') return [];
  return mapping.candidate_overlap_estate_ids.map((estateId, index) => ({
    order: index + 1,
    estate_id: estateId,
    state: 'declared_domain_overlap',
    basis: mapping.mapping_note || `The typed ${String(mapping.anchor_kind).replaceAll('_', ' ')} surface is explicitly within the target estate scope.`,
    source_refs: [mapping.source_path],
    stop_eligible: true,
  }));
}

function compileLegacyRun({ source, mapping, authored, methodology, registry, routeContext }) {
  const estateById = new Map(registry.estates.map(estate => [estate.estate_id, estate]));
  if (!estateById.has(mapping.origin_estate_id)) fail(`${mapping.trail_id} has unknown origin estate ${mapping.origin_estate_id}`);
  const exactTokens = authored?.exact_tokens?.length
    ? authored.exact_tokens
    : (mapping.anchor_ids ?? []).map(tokenFromAnchor);
  const routeLabels = authored?.route_labels ?? [];
  const mappedRoutes = routeLabels.map(label => {
    const route = routeContext.routeByLabel.get(label);
    if (!route) fail(`${mapping.trail_id} references missing route ${label}`);
    return route;
  });
  const canonicalFamilyIds = unique(mappedRoutes.map(route => route.canonical_family_id));
  const checkpoints = [...(authored?.checkpoints ?? generatedCheckpoints(mapping))].sort((a, b) => a.order - b.order);
  let previousOrder = 0;
  const checkpointByEstate = new Map();
  for (const checkpoint of checkpoints) {
    if (!estateById.has(checkpoint.estate_id)) fail(`${mapping.trail_id} checkpoint references unknown estate ${checkpoint.estate_id}`);
    if (!methodology.legacy_states[checkpoint.state]) fail(`${mapping.trail_id} checkpoint state ${checkpoint.state} is not declared`);
    if (!Number.isInteger(checkpoint.order) || checkpoint.order <= previousOrder) fail(`${mapping.trail_id} checkpoint order is not strictly increasing`);
    if (checkpointByEstate.has(checkpoint.estate_id)) fail(`${mapping.trail_id} duplicates checkpoint estate ${checkpoint.estate_id}`);
    previousOrder = checkpoint.order;
    checkpointByEstate.set(checkpoint.estate_id, checkpoint);
  }
  const evaluations = registry.estates.map(estate => {
    const checkpoint = checkpointByEstate.get(estate.estate_id);
    const estateFamilies = routeContext.byEstate.get(estate.estate_id).canonical_family_ids;
    const sharedFamilies = canonicalFamilyIds.filter(family => estateFamilies.includes(family));
    let state = 'not_reached_under_declared_predicate';
    let basis = 'No authored predicate currently routes the trail to this estate.';
    let sourceRefs = [];
    let stopEligible = false;
    if (estate.estate_id === mapping.origin_estate_id) {
      state = 'origin_custody';
      basis = `The trail originates in ${estate.label}.`;
      sourceRefs = [source.source_path];
    } else if (checkpoint) {
      state = checkpoint.state;
      basis = checkpoint.basis;
      sourceRefs = checkpoint.source_refs ?? [source.source_path];
      stopEligible = Boolean(checkpoint.stop_eligible) && methodology.legacy_stop_states.includes(checkpoint.state);
    } else if (sharedFamilies.length) {
      state = 'shared_source_only';
      basis = `Shared acquisition infrastructure only: ${sharedFamilies.join(', ')}.`;
      sourceRefs = mappedRoutes.filter(route => sharedFamilies.includes(route.canonical_family_id)).map(route => route.gateway_url);
    }
    return {
      estate_id: estate.estate_id,
      estate_label: estate.label,
      estate_generation: estate.generation,
      state,
      overlap_class: overlapClassForLegacyState(methodology, state),
      basis,
      shared_canonical_family_ids: sharedFamilies,
      source_refs: unique(sourceRefs),
      stop_eligible: stopEligible,
      graph_effect: 'none',
    };
  }).sort((a, b) => a.estate_id.localeCompare(b.estate_id));

  const stopCheckpoints = checkpoints.filter(checkpoint => checkpoint.stop_eligible && methodology.legacy_stop_states.includes(checkpoint.state));
  const firstOrder = stopCheckpoints.length ? Math.min(...stopCheckpoints.map(checkpoint => checkpoint.order)) : null;
  const shortest = firstOrder === null ? [] : stopCheckpoints.filter(checkpoint => checkpoint.order === firstOrder);
  let terminalState = shortest[0]?.state ?? null;
  let outcomeClass = terminalState ? overlapClassForLegacyState(methodology, terminalState) : null;
  if (!outcomeClass && mapping.mapping_state === 'unresolved_boundary') {
    terminalState = 'frontier_unresolved';
    outcomeClass = 'unresolved_boundary';
  }
  if (!outcomeClass) {
    terminalState = 'frontier_unresolved';
    outcomeClass = 'unresolved_boundary';
  }
  const targetEstateIds = unique(shortest
    .filter(checkpoint => !(checkpoint.state === 'out_of_estate_scope' && checkpoint.estate_id === mapping.origin_estate_id))
    .map(checkpoint => checkpoint.estate_id));
  const anchorNodes = exactTokens.slice(0, 6).map(token => ({
    kind: token.type,
    id: token.id,
    label: token.id,
    edge_kind: 'typed_anchor',
  }));
  const path = [
    { kind: 'estate', id: mapping.origin_estate_id, label: estateById.get(mapping.origin_estate_id).label, edge_kind: 'origin' },
    { kind: 'legacy_trail', id: mapping.trail_id, label: mapping.trail_id, edge_kind: 'preserved_trail' },
    ...anchorNodes,
    ...targetEstateIds.map(id => ({ kind: 'estate', id, label: estateById.get(id).label, edge_kind: outcomeClass })),
  ];
  const runCore = {
    schema_version: LEGACY_RUN_SCHEMA,
    trail_id: mapping.trail_id,
    trail_family: 'legacy_preserved_trail',
    trail_kind: authored?.trail_kind ?? mapping.anchor_kind ?? source.source_collection,
    source_collection: source.source_collection,
    source_path: source.source_path,
    source_snapshot: source.snapshot,
    source_frontier_snapshot: source.frontier_snapshot ?? null,
    origin_estate_id: mapping.origin_estate_id,
    exact_tokens: exactTokens,
    route_labels: routeLabels,
    canonical_family_ids: canonicalFamilyIds,
    authored_checkpoints: checkpoints,
    mapping_state: mapping.mapping_state,
    outcome_class: outcomeClass,
    terminal_state: terminalState,
    first_overlap_depth: targetEstateIds.length ? 2 : null,
    first_target_estate_ids: targetEstateIds,
    first_target_estate_labels: targetEstateIds.map(id => estateById.get(id).label),
    first_overlap_basis: shortest.map(checkpoint => checkpoint.basis).join(' | ') || mapping.mapping_note || methodology.overlap_classes[outcomeClass],
    typed_path: path,
    evaluations,
    residual_fog: outcomeClass === 'unresolved_boundary'
      ? (mapping.mapping_note || 'The trail requires a source, identity, jurisdiction, or temporal upgrade before an overlap state can be assigned.')
      : estateById.get(mapping.origin_estate_id).dominant_fog,
    next_acquisition: estateById.get(mapping.origin_estate_id).next_acquisition.operation,
    caveat: methodology.overlap_classes[outcomeClass],
    promotes_to: 'candidate_only',
    graph_effect: 'none',
    conclusion_generated: false,
  };
  return { ...runCore, fingerprint: digest(runCore) };
}

function compileExactTrailPairs(legacyRuns, methodology) {
  const pairs = [];
  for (let left = 0; left < legacyRuns.length; left += 1) {
    const a = legacyRuns[left];
    const tokensA = new Map(a.exact_tokens
      .filter(token => methodology.exact_token_types.includes(token.type))
      .map(token => [`${token.type}:${token.id}`, token]));
    for (let right = left + 1; right < legacyRuns.length; right += 1) {
      const b = legacyRuns[right];
      const shared = b.exact_tokens.filter(token => tokensA.has(`${token.type}:${token.id}`));
      if (!shared.length) continue;
      const rowCore = {
        trail_a: a.trail_id,
        trail_b: b.trail_id,
        shared_tokens: shared,
        overlap_class: 'typed_object_overlap',
        caveat: 'The same typed identifier appears in two preserved trail packets. This does not transfer every participant, claim, or causal interpretation between them.',
        graph_effect: 'none',
      };
      pairs.push({ ...rowCore, fingerprint: digest(rowCore) });
    }
  }
  return pairs.sort((a, b) => a.trail_a.localeCompare(b.trail_a) || a.trail_b.localeCompare(b.trail_b));
}

function compileSourceRouteTrails(registry, routeContext, methodology) {
  const estateById = new Map(registry.estates.map(estate => [estate.estate_id, estate]));
  const rows = [];
  for (const estate of registry.estates) {
    const context = routeContext.byEstate.get(estate.estate_id);
    for (const route of context.routes) {
      const targets = unique([...(routeContext.familyToEstates.get(route.canonical_family_id) ?? [])].filter(id => id !== estate.estate_id));
      const outcomeClass = targets.length ? 'shared_source_infrastructure' : 'bounded_non_overlap';
      const runCore = {
        schema_version: SOURCE_ROUTE_RUN_SCHEMA,
        trail_id: `source-route:${estate.estate_id}:${route.route_id}`,
        trail_family: 'estate_source_route_trail',
        origin_estate_id: estate.estate_id,
        route_id: route.route_id,
        route_label: route.route_label,
        canonical_family_id: route.canonical_family_id,
        authority: route.authority,
        gateway_url: route.gateway_url,
        documentation_url: route.documentation_url,
        access_mode: route.access_mode,
        machine_readiness: route.machine_readiness,
        outcome_class: outcomeClass,
        terminal_state: targets.length ? 'first_shared_source_family' : 'no_second_estate_on_declared_source_family',
        first_overlap_depth: targets.length ? 1 : null,
        first_target_estate_ids: targets,
        first_target_estate_labels: targets.map(id => estateById.get(id).label),
        typed_path: [
          { kind: 'estate', id: estate.estate_id, label: estate.label, edge_kind: 'origin' },
          { kind: 'source_route', id: route.route_id, label: route.route_label, edge_kind: 'declares_route' },
          { kind: 'source_family', id: route.canonical_family_id, label: route.canonical_family_id, edge_kind: 'canonicalizes_to' },
          ...targets.map(id => ({ kind: 'estate', id, label: estateById.get(id).label, edge_kind: 'shared_source_infrastructure' })),
        ],
        source_refs: unique([route.gateway_url, route.documentation_url]),
        residual_fog: targets.length
          ? 'The shared source family identifies common acquisition infrastructure only; subject, identity, instrument, and date joins remain open.'
          : 'No other current estate declares this canonical family. The bounded registry result is not evidence of real-world non-overlap.',
        next_acquisition: estate.next_acquisition.operation,
        caveat: methodology.overlap_classes[outcomeClass],
        promotes_to: 'candidate_only',
        graph_effect: 'none',
        conclusion_generated: false,
      };
      rows.push({ ...runCore, fingerprint: digest(runCore) });
    }
  }
  return rows.sort((a, b) => a.origin_estate_id.localeCompare(b.origin_estate_id) || a.route_label.localeCompare(b.route_label));
}

function compileCustodyTrails(registry, methodology) {
  const estateById = new Map(registry.estates.map(estate => [estate.estate_id, estate]));
  const objects = new Map();
  for (const estate of registry.estates) {
    for (const [membershipKey, ids] of Object.entries(estate.membership ?? {})) {
      const objectKind = objectKindFromMembershipKey(membershipKey);
      const custodyRole = roleFromMembershipKey(membershipKey);
      for (const objectId of ids) {
        const key = `${objectKind}:${objectId}`;
        if (!objects.has(key)) objects.set(key, []);
        objects.get(key).push({ estate_id: estate.estate_id, membership_key: membershipKey, custody_role: custodyRole, object_kind: objectKind, object_id: objectId });
      }
    }
  }
  const rows = [];
  for (const memberships of objects.values()) {
    memberships.sort((a, b) => a.estate_id.localeCompare(b.estate_id));
    for (const membership of memberships) {
      const origin = estateById.get(membership.estate_id);
      const targets = memberships.filter(row => row.estate_id !== membership.estate_id);
      const targetIds = unique(targets.map(row => row.estate_id));
      const outcomeClass = targetIds.length ? 'shared_custody_overlap' : 'bounded_non_overlap';
      const runCore = {
        schema_version: CUSTODY_RUN_SCHEMA,
        trail_id: `custody:${membership.estate_id}:${membership.object_kind}:${slug(membership.object_id)}`,
        trail_family: 'estate_custody_trail',
        origin_estate_id: membership.estate_id,
        custody_role: membership.custody_role,
        object_kind: membership.object_kind,
        object_id: membership.object_id,
        outcome_class: outcomeClass,
        terminal_state: targetIds.length ? 'first_shared_canonical_custody_object' : 'no_second_estate_on_declared_custody_object',
        first_overlap_depth: targetIds.length ? 1 : null,
        first_target_estate_ids: targetIds,
        first_target_estate_labels: targetIds.map(id => estateById.get(id).label),
        target_roles: targets.map(row => ({ estate_id: row.estate_id, custody_role: row.custody_role })),
        typed_path: [
          { kind: 'estate', id: membership.estate_id, label: origin.label, edge_kind: membership.custody_role },
          { kind: membership.object_kind, id: membership.object_id, label: membership.object_id, edge_kind: 'holds_custody' },
          ...targetIds.map(id => ({ kind: 'estate', id, label: estateById.get(id).label, edge_kind: 'shared_custody_overlap' })),
        ],
        source_refs: [sourcePathForObjectKind(membership.object_kind), 'build/estates/index.json'],
        residual_fog: targetIds.length
          ? 'Shared custody records a deliberate crosswalk around the same canonical case, track, or slice. It does not establish coordination or a subject relationship.'
          : 'The custody object maps to one estate only in the current registry; this is not evidence of external absence.',
        next_acquisition: origin.next_acquisition.operation,
        caveat: methodology.overlap_classes[outcomeClass],
        promotes_to: 'candidate_only',
        graph_effect: 'none',
        conclusion_generated: false,
      };
      rows.push({ ...runCore, fingerprint: digest(runCore) });
    }
  }
  return rows.sort((a, b) => a.origin_estate_id.localeCompare(b.origin_estate_id) || a.object_kind.localeCompare(b.object_kind) || a.object_id.localeCompare(b.object_id));
}

function strongestOverlapClass(classes, methodology) {
  for (const overlapClass of methodology.precedence) {
    if (OVERLAP_CLASSES.includes(overlapClass) && classes.includes(overlapClass)) return overlapClass;
  }
  return null;
}

function compileEstateSummaries(registry, methodology, legacyRuns, sourceRouteRuns, custodyRuns) {
  const estateById = new Map(registry.estates.map(estate => [estate.estate_id, estate]));
  return registry.estates.map(estate => {
    const legacy = legacyRuns.filter(run => run.origin_estate_id === estate.estate_id);
    const source = sourceRouteRuns.filter(run => run.origin_estate_id === estate.estate_id);
    const custody = custodyRuns.filter(run => run.origin_estate_id === estate.estate_id);
    const all = [...legacy, ...custody, ...source];
    const overlapRuns = all.filter(run => OVERLAP_CLASSES.includes(run.outcome_class));
    const selectedClass = strongestOverlapClass(overlapRuns.map(run => run.outcome_class), methodology);
    const selectedRuns = selectedClass ? overlapRuns.filter(run => run.outcome_class === selectedClass) : [];
    const unresolvedRuns = legacy.filter(run => run.outcome_class === 'unresolved_boundary');
    const outcomeClass = selectedClass ?? (unresolvedRuns.length ? 'unresolved_boundary' : 'bounded_non_overlap');
    const targetIds = unique(selectedRuns.flatMap(run => run.first_target_estate_ids));
    const runCore = {
      schema_version: ESTATE_SUMMARY_SCHEMA,
      trail_id: `estate-frontier:${estate.estate_id}`,
      trail_family: 'estate_frontier_summary_trail',
      origin_estate_id: estate.estate_id,
      origin_estate_label: estate.label,
      generation: estate.generation,
      outcome_class: outcomeClass,
      terminal_state: selectedClass ? 'first_overlap_class_reached' : unresolvedRuns.length ? 'unresolved_frontier_retained' : 'bounded_registry_non_overlap',
      first_overlap_depth: targetIds.length ? 1 : null,
      first_target_estate_ids: targetIds,
      first_target_estate_labels: targetIds.map(id => estateById.get(id).label),
      first_trail_ids: selectedRuns.map(run => run.trail_id),
      family_counts: {
        legacy_preserved_trail: legacy.length,
        estate_source_route_trail: source.length,
        estate_custody_trail: custody.length,
      },
      outcome_counts: countBy(all, 'outcome_class'),
      unresolved_trail_ids: unresolvedRuns.map(run => run.trail_id),
      bounded_non_overlap_trail_ids: all.filter(run => run.outcome_class === 'bounded_non_overlap').map(run => run.trail_id),
      all_direct_target_estate_ids: unique(overlapRuns.flatMap(run => run.first_target_estate_ids)),
      typed_path: [
        { kind: 'estate', id: estate.estate_id, label: estate.label, edge_kind: 'origin' },
        { kind: 'overlap_class', id: outcomeClass, label: outcomeClass, edge_kind: 'first_class' },
        ...targetIds.map(id => ({ kind: 'estate', id, label: estateById.get(id).label, edge_kind: outcomeClass })),
      ],
      residual_fog: estate.dominant_fog,
      next_acquisition: estate.next_acquisition.operation,
      caveat: methodology.overlap_classes[outcomeClass],
      promotes_to: 'candidate_only',
      graph_effect: 'none',
      conclusion_generated: false,
    };
    return { ...runCore, fingerprint: digest(runCore) };
  }).sort((a, b) => a.origin_estate_id.localeCompare(b.origin_estate_id));
}

function compileOverlapMatrix(registry, methodology, legacyRuns, sourceRuns, custodyRuns) {
  const estateIds = registry.estates.map(estate => estate.estate_id);
  const byPair = new Map();
  const ensure = (origin, target) => {
    const key = `${origin}||${target}`;
    if (!byPair.has(key)) byPair.set(key, {
      origin_estate_id: origin,
      target_estate_id: target,
      typed_object_overlap: 0,
      shared_custody_overlap: 0,
      shared_source_infrastructure: 0,
      trail_ids: [],
      canonical_family_ids: [],
      custody_object_ids: [],
      exact_token_ids: [],
    });
    return byPair.get(key);
  };
  const add = (run, extras = {}) => {
    if (!OVERLAP_CLASSES.includes(run.outcome_class)) return;
    for (const target of run.first_target_estate_ids) {
      const cell = ensure(run.origin_estate_id, target);
      cell[run.outcome_class] += 1;
      cell.trail_ids.push(run.trail_id);
      if (extras.canonical_family_id) cell.canonical_family_ids.push(extras.canonical_family_id);
      if (extras.custody_object_id) cell.custody_object_ids.push(extras.custody_object_id);
      if (extras.exact_token_ids) cell.exact_token_ids.push(...extras.exact_token_ids);
    }
  };
  for (const run of legacyRuns) add(run, { exact_token_ids: run.exact_tokens.map(token => `${token.type}:${token.id}`) });
  for (const run of sourceRuns) add(run, { canonical_family_id: run.canonical_family_id });
  for (const run of custodyRuns) add(run, { custody_object_id: `${run.object_kind}:${run.object_id}` });

  const rows = estateIds.map(origin => ({
    origin_estate_id: origin,
    cells: Object.fromEntries(estateIds.map(target => {
      if (origin === target) return [target, { state: 'origin', strongest_class: null, counts: {}, trail_ids: [] }];
      const cell = ensure(origin, target);
      const classes = OVERLAP_CLASSES.filter(overlapClass => cell[overlapClass] > 0);
      const strongest = strongestOverlapClass(classes, methodology);
      return [target, {
        state: strongest ? 'overlap_reached' : 'not_reached_on_current_declared_trails',
        strongest_class: strongest,
        counts: Object.fromEntries(OVERLAP_CLASSES.map(overlapClass => [overlapClass, cell[overlapClass]])),
        trail_ids: unique(cell.trail_ids),
        canonical_family_ids: unique(cell.canonical_family_ids),
        custody_object_ids: unique(cell.custody_object_ids),
        exact_token_ids: unique(cell.exact_token_ids),
      }];
    })),
  }));
  const pairRows = [...byPair.values()]
    .filter(cell => OVERLAP_CLASSES.some(overlapClass => cell[overlapClass] > 0))
    .map(cell => ({
      ...cell,
      trail_ids: unique(cell.trail_ids),
      canonical_family_ids: unique(cell.canonical_family_ids),
      custody_object_ids: unique(cell.custody_object_ids),
      exact_token_ids: unique(cell.exact_token_ids),
      strongest_class: strongestOverlapClass(OVERLAP_CLASSES.filter(overlapClass => cell[overlapClass] > 0), methodology),
    }))
    .sort((a, b) => a.origin_estate_id.localeCompare(b.origin_estate_id) || a.target_estate_id.localeCompare(b.target_estate_id));
  const matrixCore = {
    schema_version: 'estate-game-trail-overlap-matrix@2',
    estate_ids: estateIds,
    rows,
    directed_overlap_pairs: pairRows,
    interpretation_contract: {
      cell_counts_are_trail_counts_not_scores: true,
      class_precedence_is_display_logic_not_importance: true,
      empty_cell_is_not_real_world_non_overlap: true,
      graph_effect: 'none',
      conclusion_generated: false,
    },
  };
  return { ...matrixCore, fingerprint: digest(matrixCore) };
}


function renderEstateHandoff(packet) {
  const summary = packet.frontier_summary;
  const targets = summary.first_target_estate_ids.length
    ? summary.first_target_estate_ids.map(id => `- \`${id}\``).join('\n')
    : '- No second estate on the selected first terminal class.';
  return `# M-02 game-trail lane: ${packet.estate_label}

> Survey and overlap pass complete. The estate remains open under residual fog. \`promotes_to: candidate_only\` · \`graph_effect: none\` · \`conclusion_generated: false\`.

- Estate: \`${packet.estate_id}\`
- Generation: \`${packet.generation}\`
- First terminal class: \`${summary.outcome_class}\`
- Legacy trails rerun from this estate: **${packet.counts.outgoing_legacy}**
- Source-route trails rerun: **${packet.counts.outgoing_source_routes}**
- Canonical-custody trails rerun: **${packet.counts.outgoing_custody}**
- Incoming overlap origins: **${packet.counts.incoming_overlap_origins}**
- Packet fingerprint: \`${packet.fingerprint}\`

## First target estates

${targets}

## Residual fog

\`${packet.dominant_fog}\`

## Next decisive acquisition

${packet.next_acquisition.operation}

Expected output: ${packet.next_acquisition.decisive_output}

## Scope boundary

${packet.boundary}

A typed overlap routes evidence review. Shared custody is a crosswalk. Shared source infrastructure is not subject adjacency. An empty matrix cell is not evidence of absence.
`;
}

function compileEstatePackets(registry, legacyRuns, sourceRuns, custodyRuns, summaries, matrix) {
  const incomingFor = estateId => matrix.directed_overlap_pairs.filter(row => row.target_estate_id === estateId);
  return registry.estates.map(estate => {
    const legacy = legacyRuns.filter(run => run.origin_estate_id === estate.estate_id);
    const source = sourceRuns.filter(run => run.origin_estate_id === estate.estate_id);
    const custody = custodyRuns.filter(run => run.origin_estate_id === estate.estate_id);
    const incoming = incomingFor(estate.estate_id);
    const packetCore = {
      schema_version: 'estate-game-trail-estate-packet@2',
      estate_id: estate.estate_id,
      estate_label: estate.label,
      generation: estate.generation,
      domain: estate.domain,
      scope: estate.scope,
      dominant_fog: estate.dominant_fog,
      next_acquisition: estate.next_acquisition,
      frontier_summary: summaries.find(run => run.origin_estate_id === estate.estate_id),
      outgoing_trail_ids: [...legacy, ...source, ...custody].map(run => run.trail_id),
      legacy_trail_ids: legacy.map(run => run.trail_id),
      source_route_trail_ids: source.map(run => run.trail_id),
      custody_trail_ids: custody.map(run => run.trail_id),
      incoming_overlap_origins: incoming.map(row => ({
        origin_estate_id: row.origin_estate_id,
        strongest_class: row.strongest_class,
        trail_ids: row.trail_ids,
      })),
      counts: {
        outgoing_legacy: legacy.length,
        outgoing_source_routes: source.length,
        outgoing_custody: custody.length,
        incoming_overlap_origins: incoming.length,
      },
      boundary: estate.boundary,
      promotes_to: 'candidate_only',
      graph_effect: 'none',
      conclusion_generated: false,
    };
    return { ...packetCore, fingerprint: digest(packetCore) };
  }).sort((a, b) => a.estate_id.localeCompare(b.estate_id));
}

export function buildEstateGameTrails({ write = true } = {}) {
  const registry = readJson(REGISTRY_PATH);
  const routeRegistry = readJson(ROUTE_REGISTRY_PATH);
  const methodology = readJson(METHODOLOGY_PATH);
  const frontierSurveyManifest = readJson(FRONTIER_SURVEY_MANIFEST_PATH);
  const frontierSurveys = frontierSurveyManifest.packets.map(packet => readJson(packet.path));
  const legacyMappings = readJsonl(LEGACY_MAP_PATH);
  const authoredDocument = readJson(AUTHORED_CHECKPOINTS_PATH);
  if (methodology.schema_version !== 'estate-gametrail-methodology@1') fail('methodology schema mismatch');
  if (methodology.promotes_to !== 'candidate_only' || methodology.graph_effect !== 'none' || methodology.conclusion_generated !== false) fail('methodology exceeds boundary');
  if (authoredDocument.schema_version !== 'estate-game-trail-map@1') fail('authored checkpoint schema mismatch');
  if (registry.estates.length !== 24) fail(`expected 24 estates, saw ${registry.estates.length}`);
  if (registry.counts?.frontier_estates !== 10) fail(`expected ten frontier estates, saw ${registry.counts?.frontier_estates}`);
  if (frontierSurveyManifest.schema_version !== 'estate-frontier-survey-manifest@1' || frontierSurveys.length !== 10) fail('frontier survey surface is incomplete');
  if (frontierSurveys.some(packet => packet.status !== 'surveyed_and_prepared' || packet.graph_effect !== 'none' || packet.conclusion_generated !== false)) fail('frontier survey surface exceeds boundary');
  const legacySources = loadLegacySources();
  const sourceById = new Map(legacySources.map(row => [row.trail_id, row]));
  const mappingById = new Map(legacyMappings.map(row => [row.trail_id, row]));
  const authoredById = new Map(authoredDocument.trails.map(row => [row.trail_id, row]));
  if (sourceById.size !== 35 || mappingById.size !== 35) fail(`expected 35 preserved legacy trails, saw sources=${sourceById.size}, mappings=${mappingById.size}`);
  const missingMappings = legacySources.filter(row => !mappingById.has(row.trail_id)).map(row => row.trail_id);
  const staleMappings = legacyMappings.filter(row => !sourceById.has(row.trail_id)).map(row => row.trail_id);
  if (missingMappings.length || staleMappings.length) fail(`legacy map coverage diverged; missing [${missingMappings.join(', ')}], stale [${staleMappings.join(', ')}]`);
  const unknownAuthored = authoredDocument.trails.filter(row => !sourceById.has(row.trail_id)).map(row => row.trail_id);
  if (unknownAuthored.length) fail(`authored checkpoints reference unknown trails [${unknownAuthored.join(', ')}]`);
  const routeContext = compileRouteContext(registry, routeRegistry);
  const legacyRuns = legacySources.map(source => compileLegacyRun({
    source,
    mapping: mappingById.get(source.trail_id),
    authored: authoredById.get(source.trail_id) ?? null,
    methodology,
    registry,
    routeContext,
  })).sort((a, b) => a.trail_id.localeCompare(b.trail_id));
  const sourceRouteRuns = compileSourceRouteTrails(registry, routeContext, methodology);
  const custodyRuns = compileCustodyTrails(registry, methodology);
  const estateSummaries = compileEstateSummaries(registry, methodology, legacyRuns, sourceRouteRuns, custodyRuns);
  const exactTrailPairs = compileExactTrailPairs(legacyRuns, methodology);
  const overlapMatrix = compileOverlapMatrix(registry, methodology, legacyRuns, sourceRouteRuns, custodyRuns);
  const estatePackets = compileEstatePackets(registry, legacyRuns, sourceRouteRuns, custodyRuns, estateSummaries, overlapMatrix);
  const allTrails = [...legacyRuns, ...sourceRouteRuns, ...custodyRuns, ...estateSummaries];
  const unresolvedRows = legacyRuns.filter(run => run.outcome_class === 'unresolved_boundary').map(run => ({
    trail_id: run.trail_id,
    origin_estate_id: run.origin_estate_id,
    residual_fog: run.residual_fog,
    next_acquisition: run.next_acquisition,
  }));
  const boundedNonOverlapRows = allTrails.filter(run => run.outcome_class === 'bounded_non_overlap').map(run => ({
    trail_id: run.trail_id,
    trail_family: run.trail_family,
    origin_estate_id: run.origin_estate_id,
    terminal_state: run.terminal_state,
    caveat: run.caveat,
  }));

  const manifestCore = {
    schema_version: GAME_TRAIL_MANIFEST_SCHEMA,
    as_of: registry.as_of,
    purpose: methodology.purpose,
    counts: {
      estates: registry.estates.length,
      existing_estates: registry.estates.filter(estate => estate.generation === 'existing').length,
      next_estates: registry.estates.filter(estate => estate.generation === 'next').length,
      frontier_estates: registry.estates.filter(estate => estate.generation === 'frontier').length,
      legacy_preserved_trails: legacyRuns.length,
      legacy_trail_estate_evaluations: legacyRuns.reduce((sum, run) => sum + run.evaluations.length, 0),
      estate_source_route_trails: sourceRouteRuns.length,
      estate_custody_trails: custodyRuns.length,
      estate_frontier_summary_trails: estateSummaries.length,
      total_compiled_trails: allTrails.length,
      exact_legacy_trail_pair_overlaps: exactTrailPairs.length,
      directed_estate_pairs_with_overlap: overlapMatrix.directed_overlap_pairs.length,
      unresolved_legacy_trails: unresolvedRows.length,
      bounded_non_overlap_trails: boundedNonOverlapRows.length,
      route_labels: routeContext.computedCounts.route_labels,
      canonical_source_families: routeContext.computedCounts.canonical_families,
      route_uses: routeContext.computedCounts.route_uses,
      custody_memberships: custodyRuns.length,
      frontier_surveys: frontierSurveys.length,
      frontier_survey_route_uses: frontierSurveyManifest.counts.source_route_uses,
    },
    family_counts: countBy(allTrails, 'trail_family'),
    outcome_counts: countBy(allTrails, 'outcome_class'),
    legacy_source_counts: countBy(legacyRuns, 'source_collection'),
    legacy_evaluation_counts: countBy(legacyRuns.flatMap(run => run.evaluations), 'state'),
    paths: {
      methodology: METHODOLOGY_PATH,
      legacy_seed_map: LEGACY_MAP_PATH,
      legacy_runs: `${OUTPUT_DIR}/legacy/`,
      source_route_runs: `${OUTPUT_DIR}/source-routes/`,
      custody_runs: `${OUTPUT_DIR}/custody/`,
      estate_packets: `${OUTPUT_DIR}/estates/`,
      overlap_matrix: `${OUTPUT_DIR}/overlap-matrix.json`,
      unresolved_ledger: `${OUTPUT_DIR}/unresolved.json`,
      bounded_non_overlap_ledger: `${OUTPUT_DIR}/bounded-non-overlap.json`,
      public_data: PUBLIC_DATA,
      estate_handoffs: `${HANDOFF_DIR}/`,
      frontier_surveys: FRONTIER_SURVEY_MANIFEST_PATH,
    },
    waterline: {
      current: 'surveyed_frontier_and_bounded_overlap_pass',
      next: 'execute_decisive_acquisitions_and_human_evidence_review',
      estate_completion_claimed: false,
    },
    boundaries: [
      'Every preserved game trail is rerun against all twenty-four estates, while every estate also emits source-route, custody, and frontier-summary trails.',
      'A typed overlap routes evidence review; it does not establish influence, coordination, control, causation, or wrongdoing.',
      'A shared source family is acquisition infrastructure, not subject adjacency.',
      'A bounded non-overlap applies only to the declared current surface and is not evidence of real-world absence.',
      'No trail self-promotes into a claim, graph edge, report conclusion, allegation, or publication state.',
    ],
    promotes_to: 'candidate_only',
    graph_effect: 'none',
    conclusion_generated: false,
  };
  const manifest = { ...manifestCore, fingerprint: digest(manifestCore) };
  const publicCore = {
    schema_version: 'estate-game-trail-public-data@2',
    as_of: registry.as_of,
    manifest,
    methodology,
    estates: registry.estates.map(estate => ({
      estate_id: estate.estate_id,
      estate_label: estate.label,
      generation: estate.generation,
      domain: estate.domain,
      scope: estate.scope,
      current_state: estate.current_state,
      dominant_fog: estate.dominant_fog,
      next_acquisition: estate.next_acquisition,
      membership: estate.membership,
    })),
    legacy_runs: legacyRuns,
    source_route_runs: sourceRouteRuns,
    custody_runs: custodyRuns,
    estate_summaries: estateSummaries,
    overlap_matrix: overlapMatrix,
    exact_trail_pairs: exactTrailPairs,
    unresolved_ledger: unresolvedRows,
    bounded_non_overlap_ledger: boundedNonOverlapRows,
    frontier_survey_manifest: frontierSurveyManifest,
    frontier_surveys: frontierSurveys,
    interpretation_contract: {
      typed_overlap_is_routing_not_relationship: true,
      shared_custody_is_crosswalk_not_coordination: true,
      shared_source_is_infrastructure_not_subject_adjacency: true,
      empty_matrix_cell_is_not_real_world_non_overlap: true,
      trail_counts_are_not_scores_or_rankings: true,
      graph_effect: 'none',
      conclusion_generated: false,
    },
  };
  const publicData = { ...publicCore, fingerprint: digest(publicCore) };
  const output = { manifest, frontierSurveyManifest, frontierSurveys, legacyRuns, sourceRouteRuns, custodyRuns, estateSummaries, exactTrailPairs, overlapMatrix, estatePackets, unresolvedRows, boundedNonOverlapRows, publicData };
  assertBoundary(output, 'compiled game trails');

  if (write) {
    fs.rmSync(path.join(root, OUTPUT_DIR), { recursive: true, force: true });
    for (const directory of ['legacy', 'source-routes', 'custody', 'estates']) fs.mkdirSync(path.join(root, OUTPUT_DIR, directory), { recursive: true });
    for (const run of legacyRuns) writeJson(`${OUTPUT_DIR}/legacy/${slug(run.trail_id)}.json`, run);
    for (const run of sourceRouteRuns) writeJson(`${OUTPUT_DIR}/source-routes/${slug(run.trail_id)}.json`, run);
    for (const run of custodyRuns) writeJson(`${OUTPUT_DIR}/custody/${slug(run.trail_id)}.json`, run);
    for (const packet of estatePackets) writeJson(`${OUTPUT_DIR}/estates/${packet.estate_id}.json`, packet);
    writeJson(`${OUTPUT_DIR}/manifest.json`, manifest);
    writeJson(`${OUTPUT_DIR}/overlap-matrix.json`, overlapMatrix);
    writeJson(`${OUTPUT_DIR}/exact-trail-pairs.json`, { schema_version: 'estate-game-trail-exact-pairs@1', pairs: exactTrailPairs, graph_effect: 'none', conclusion_generated: false });
    writeJson(`${OUTPUT_DIR}/unresolved.json`, { schema_version: 'estate-game-trail-unresolved@1', rows: unresolvedRows, graph_effect: 'none', conclusion_generated: false });
    writeJson(`${OUTPUT_DIR}/bounded-non-overlap.json`, { schema_version: 'estate-game-trail-bounded-non-overlap@1', rows: boundedNonOverlapRows, graph_effect: 'none', conclusion_generated: false });
    fs.mkdirSync(path.join(root, PUBLIC_DIR), { recursive: true });
    writeJson(PUBLIC_DATA, publicData);
    fs.mkdirSync(path.join(root, path.dirname(COMPATIBILITY_DATA)), { recursive: true });
    writeJson(COMPATIBILITY_DATA, publicData);
    fs.rmSync(path.join(root, HANDOFF_DIR), { recursive: true, force: true });
    fs.mkdirSync(path.join(root, HANDOFF_DIR), { recursive: true });
    for (const packet of estatePackets) fs.writeFileSync(path.join(root, HANDOFF_DIR, `${packet.estate_id}.md`), renderEstateHandoff(packet));
  }
  return output;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const built = buildEstateGameTrails();
  const counts = built.manifest.counts;
  console.log(`estate game trails: ${counts.legacy_preserved_trails} legacy + ${counts.estate_source_route_trails} route + ${counts.estate_custody_trails} custody + ${counts.estate_frontier_summary_trails} estate summaries = ${counts.total_compiled_trails}`);
}
