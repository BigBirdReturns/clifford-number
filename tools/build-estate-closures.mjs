#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { readJson, root, writeJson } from './lib/ledger.mjs';

export const ESTATE_CLOSURE_SCHEMA_VERSION = 'estate-closure-packet@1';
export const ESTATE_TASK_CLOSURE_SCHEMA_VERSION = 'estate-task-closure@1';
export const ESTATE_CLOSURE_MANIFEST_SCHEMA_VERSION = 'estate-closure-manifest@1';
export const ESTATE_APERTURE_DATA_SCHEMA_VERSION = 'estate-aperture-data@1';

const FANOUT_MANIFEST = 'build/estate-fanout/manifest.json';
const ESTATE_REGISTRY = 'build/estates/index.json';
const ROUTE_REGISTRY = 'data/estates/source-route-registry.json';
const CLOSURE_METHODOLOGY = 'data/estates/closure-methodology.json';
const ISSUE_MAP = 'data/estates/issue-map.json';
const OUTPUT_DIR = 'build/estate-closures';
const APERTURE_DATA = 'estates/data.json';
const HANDOFF_DIR = 'issue-handoffs';
const FIXED_CLOSED_AT = '2026-07-22T23:59:59Z';
const FORBIDDEN_KEYS = /^(?:guilt_score|corruption_score|motive_score|influence_score|risk_score|probability_score|ranking|rank|score|verdict|finding|claim_status|publication_approval)$/i;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}

function digest(value, length = 20) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex').slice(0, length);
}

function fullDigest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function unique(values) {
  return [...new Set(values.filter(value => value !== undefined && value !== null && String(value).trim()))];
}

function countBy(rows, key) {
  return Object.fromEntries([...new Set(rows.map(row => row[key]))].sort().map(value => [value, rows.filter(row => row[key] === value).length]));
}


function buildRouteCorridors(routes) {
  const pairs = new Map();
  for (const route of routes) {
    const estates = [...new Set(route.used_by_estate_ids ?? [])].sort();
    for (let left = 0; left < estates.length; left += 1) {
      for (let right = left + 1; right < estates.length; right += 1) {
        const key = `${estates[left]}||${estates[right]}`;
        if (!pairs.has(key)) pairs.set(key, { from_estate_id: estates[left], to_estate_id: estates[right], route_ids: [], canonical_family_ids: [] });
        const row = pairs.get(key);
        row.route_ids.push(route.route_id);
        row.canonical_family_ids.push(route.canonical_family_id);
      }
    }
  }
  return [...pairs.values()].map(row => ({
    ...row,
    route_ids: [...new Set(row.route_ids)].sort(),
    canonical_family_ids: [...new Set(row.canonical_family_ids)].sort(),
    shared_route_count: new Set(row.route_ids).size,
    shared_family_count: new Set(row.canonical_family_ids).size,
    graph_effect: 'none',
  })).sort((a, b) => b.shared_family_count - a.shared_family_count || a.from_estate_id.localeCompare(b.from_estate_id) || a.to_estate_id.localeCompare(b.to_estate_id));
}

function walk(value, visit, pointer = '$') {
  if (Array.isArray(value)) return value.forEach((item, index) => walk(item, visit, `${pointer}[${index}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    visit(key, item, `${pointer}.${key}`);
    walk(item, visit, `${pointer}.${key}`);
  }
}

function baseRefs(estate) {
  return unique([
    ESTATE_REGISTRY,
    estate.estate_id,
    ...(estate.asset_refs ?? []).map(asset => asset.kind === 'path' ? asset.path : asset.ref),
    ...(estate.membership?.primary_tracks ?? []).map(trackId => `data/research-tracks/${trackId}/harness.json`),
  ]);
}

function commonClosure(task, estate, methodology) {
  return {
    schema_version: ESTATE_TASK_CLOSURE_SCHEMA_VERSION,
    task_id: task.task_id,
    estate_id: task.estate_id,
    task_kind: task.task_kind,
    title: task.title,
    priority: task.priority,
    requested_action: task.requested_action,
    required_outputs: task.required_outputs,
    stopping_rule: task.stopping_rule,
    allowed_results: task.allowed_results,
    forbidden_inferences: task.forbidden_inferences,
    task_state: methodology.task_state,
    closure_state: task.task_kind === 'candidate_packet' ? 'surface_complete' : 'partially_searched',
    dependencies: task.dependency_task_ids ?? [],
    closed_at: FIXED_CLOSED_AT,
    closed_by: 'deterministic_bounded_pass',
    candidate_status: 'intake_only',
    promotes_to: methodology.promotes_to,
    graph_effect: 'none',
    conclusion_generated: false,
    verification_status: 'machine_compiled_requires_human_evidence_review',
    boundary: estate.boundary,
  };
}

function closeTask(task, estate, routeByLabel, methodology) {
  const common = commonClosure(task, estate, methodology);
  const refs = baseRefs(estate);
  let addition;

  if (task.task_kind === 'denominator_freeze') {
    const c = estate.custody_counts;
    addition = {
      resolution: `Current custody is frozen for this pass: ${c.primary_cases} primary cases, ${c.primary_tracks} primary tracks, ${c.primary_slices} primary slices, ${c.primary_case_claims} case claims, ${c.primary_case_receipts} case receipt references, and ${c.primary_slice_records} slice records. Inclusion remains bounded by the estate definition and as-of date.`,
      residual_fog: `The macro-estate denominator remains incomplete under dominant fog ${estate.dominant_fog}; ordinary, unsuccessful, nonparticipant, and explicit-null controls are not yet complete across the whole estate.`,
      next_transition: 'Extend the frozen universe only through explicit inclusion rules, stable identifiers, dated source families, and retained null/control rows.',
      refs,
      evidence: { custody_counts: estate.custody_counts, membership: estate.membership },
    };
  } else if (task.task_kind === 'source_acquisition') {
    const route = routeByLabel.get(task.source_route);
    if (!route) throw new Error(`estate closures: source task ${task.task_id} has no route registry row for ${task.source_route}`);
    addition = {
      resolution: `The official or primary-public route is registered at ${route.gateway_url} under canonical family ${route.canonical_family_id}. Access mode is ${route.access_mode}; authentication is ${route.authentication}; repository readiness is ${route.machine_readiness}.`,
      residual_fog: route.residual_fog,
      next_transition: 'Execute the bounded estate query, preserve source bytes or stable identifiers, reconcile the declared window and nulls, and attach receipt-ready provenance.',
      refs: unique([...refs, task.source_route, route.gateway_url, route.documentation_url, ...(route.repo_refs ?? [])]),
      evidence: {
        route_id: route.route_id,
        canonical_family_id: route.canonical_family_id,
        authority: route.authority,
        access_mode: route.access_mode,
        authentication: route.authentication,
        machine_readiness: route.machine_readiness,
        locator_state: route.locator_state,
        record_acquisition_state: route.record_acquisition_state,
      },
    };
  } else if (task.task_kind === 'identity_resolution') {
    addition = {
      resolution: `The identity stage is closed for this pass with a reversible join contract across ${estate.next_acquisition.source_routes.length} declared source routes. Accepted, ambiguous, and rejected identities remain separate; no name-, brand-, address-, or logo-only match is promoted.`,
      residual_fog: `Estate-wide legal identity remains incomplete under dominant fog ${estate.dominant_fog}; every unresolved or rejected join remains visible for later human evidence review.`,
      next_transition: 'Resolve proposed joins with independent official identifiers, retain ambiguity and rejection, and preserve reversible provenance before any case-ledger promotion.',
      refs: unique([...refs, ROUTE_REGISTRY, 'data/canonical/', 'data/ledger/']),
      evidence: { join_states: ['accepted', 'ambiguous', 'rejected'], forced_merges_allowed: false },
    };
  } else if (task.task_kind === 'temporal_and_null_controls') {
    addition = {
      resolution: 'The temporal/control stage is closed for this pass with a typed date model and required null classes: event, decision, filing, execution, award, obligation, outlay, performance, publication, retrieval, unsuccessful, withdrawn, denied, nonparticipant, and no-match.',
      residual_fog: 'Estate-wide event order and comparator/null coverage remain incomplete until source-route records and resolved identities are joined.',
      next_transition: 'Build decision-window tables without collapsing date roles; retain unresolved order and every unsuccessful or no-match path.',
      refs: unique([...refs, 'docs/methodology.md', 'docs/evidence-model.md']),
      evidence: {
        date_roles: ['event', 'decision', 'filing', 'execution', 'award', 'obligation', 'outlay', 'performance', 'publication', 'retrieval'],
        null_roles: ['unsuccessful', 'withdrawn', 'denied', 'nonparticipant', 'nonrecipient', 'no_match'],
      },
    };
  } else if (task.task_kind === 'candidate_packet') {
    const upstream = task.dependency_task_ids ?? [];
    addition = {
      resolution: `The candidate-only handoff for ${estate.label} is assembled from every upstream closure record, the complete source-route locator registry, current custody counts, residual fog, dependencies, and named next transitions.`,
      residual_fog: `The estate itself remains open. Its decisive output is still: ${estate.next_acquisition.decisive_output}`,
      next_transition: 'Human evidence review may promote individually receipted observations into typed case ledgers; this packet cannot self-promote.',
      refs: unique([...refs, `${OUTPUT_DIR}/${estate.estate_id}.json`, ROUTE_REGISTRY]),
      evidence: { upstream_task_ids: upstream, handoff_complete: true, estate_complete: false },
    };
  } else {
    throw new Error(`estate closures: unsupported task kind ${task.task_kind}`);
  }

  const closure = { ...common, ...addition };
  closure.fingerprint = digest(closure);
  return closure;
}

function renderIssueHandoff(packet, milestoneId = 'estate-aperture-v1') {
  const counts = packet.task_counts;
  return [
    `# Bounded estate pass closed: ${packet.estate_label}`,
    '',
    `Milestone: \`${milestoneId}\``,
    '',
    '> This closes the currently declared acquisition pass, not the estate or its evidentiary universe.',
    '',
    `- Tasks closed to bounded state: **${counts.total}**`,
    `- Candidate-only handoff complete: **yes**`,
    `- Upstream tasks still partial by design: **${counts.partially_searched}**`,
    `- Estate state: **${packet.estate_status.replaceAll('_', ' ')}**`,
    `- Dominant residual fog: \`${packet.dominant_fog}\``,
    `- Packet fingerprint: \`${packet.fingerprint}\``,
    '',
    '**What is now in custody**',
    '',
    `- ${packet.custody_counts.primary_case_claims} primary-case claims`,
    `- ${packet.custody_counts.primary_case_receipts} primary-case receipt references`,
    `- ${packet.custody_counts.primary_slice_records} primary-slice records`,
    `- ${packet.source_routes.length} declared source routes with stable locators and residual-fog descriptions`,
    '',
    '**Next lawful transition**',
    '',
    packet.tasks.find(task => task.task_kind === 'candidate_packet')?.next_transition ?? 'Human evidence review.',
    '',
    '**Boundary**',
    '',
    packet.boundary,
    '',
    '`promotes_to: candidate_only` · `graph_effect: none` · `conclusion_generated: false`',
    '',
  ].join('\n');
}

export function buildEstateClosures({ write = true } = {}) {
  const fanoutManifest = readJson(FANOUT_MANIFEST);
  const estateRegistry = readJson(ESTATE_REGISTRY);
  const routeRegistry = readJson(ROUTE_REGISTRY);
  const methodology = readJson(CLOSURE_METHODOLOGY);
  const issueMap = readJson(ISSUE_MAP);

  const closedEstateIds = new Set((fanoutManifest.packets ?? []).map(packet => packet.estate_id));
  const closedEstates = estateRegistry.estates.filter(estate => closedEstateIds.has(estate.estate_id));
  const projectRoute = route => {
    const usedByEstateIds = (route.used_by_estate_ids ?? []).filter(estateId => closedEstateIds.has(estateId));
    return {
      ...route,
      used_by_estate_ids: usedByEstateIds,
      use_count: usedByEstateIds.length,
    };
  };
  const projectedRoutes = routeRegistry.routes.map(projectRoute);
  const estateById = new Map(closedEstates.map(estate => [estate.estate_id, estate]));
  const routeByLabel = new Map(projectedRoutes.map(route => [route.route_label, route]));
  const issueByEstate = new Map(issueMap.issues.map(issue => [issue.estate_id, issue]));

  const packets = [];
  for (const descriptor of fanoutManifest.packets ?? []) {
    const fanout = readJson(descriptor.json_path);
    const estate = estateById.get(fanout.estate_id);
    if (!estate) throw new Error(`estate closures: fanout references missing estate ${fanout.estate_id}`);
    const issue = issueByEstate.get(estate.estate_id);
    if (!issue) throw new Error(`estate closures: missing issue map for ${estate.estate_id}`);
    const routes = fanout.source_routes.map(label => {
      const route = routeByLabel.get(label);
      if (!route) throw new Error(`estate closures: missing route registry row for ${label}`);
      return route;
    });
    const tasks = fanout.tasks.map(task => closeTask(task, estate, routeByLabel, methodology));
    const taskCounts = {
      total: tasks.length,
      surface_complete: tasks.filter(task => task.closure_state === 'surface_complete').length,
      partially_searched: tasks.filter(task => task.closure_state === 'partially_searched').length,
      unavailable_after_search: tasks.filter(task => task.closure_state === 'unavailable_after_search').length,
    };
    const packet = {
      schema_version: ESTATE_CLOSURE_SCHEMA_VERSION,
      estate_id: estate.estate_id,
      estate_label: estate.label,
      generation: estate.generation,
      domain: estate.domain,
      jurisdictions: estate.jurisdictions,
      scope: estate.scope,
      dominant_fog: estate.dominant_fog,
      operation: estate.next_acquisition.operation,
      decisive_output: estate.next_acquisition.decisive_output,
      issue: { number: issue.issue_number, url: issue.issue_url },
      pass_status: 'bounded_pass_complete',
      estate_status: 'open_residual_fog',
      task_counts: taskCounts,
      custody_counts: estate.custody_counts,
      membership: estate.membership,
      source_routes: routes,
      tasks,
      candidate_handoff_task_id: tasks.find(task => task.task_kind === 'candidate_packet')?.task_id ?? null,
      boundary: estate.boundary,
      promotes_to: 'candidate_only',
      graph_effect: 'none',
      conclusion_generated: false,
    };
    packet.fingerprint = digest(packet);
    packets.push(packet);
  }
  packets.sort((a, b) => a.estate_id.localeCompare(b.estate_id));

  const allTasks = packets.flatMap(packet => packet.tasks);
  const sourceTasks = allTasks.filter(task => task.task_kind === 'source_acquisition');
  const closedRouteLabels = new Set(packets.flatMap(packet => packet.source_routes.map(route => route.route_label)));
  const closedRoutes = projectedRoutes.filter(route => closedRouteLabels.has(route.route_label));
  const closedRegistryCounts = {
    estates: closedEstates.length,
    existing_estates: closedEstates.filter(estate => estate.generation === 'existing').length,
    next_estates: closedEstates.filter(estate => estate.generation === 'next').length,
    frontier_estates: 0,
    mapped_cases: new Set(closedEstates.flatMap(estate => estate.membership?.primary_cases ?? [])).size,
    mapped_tracks: new Set(closedEstates.flatMap(estate => estate.membership?.primary_tracks ?? [])).size,
    mapped_slices: new Set(closedEstates.flatMap(estate => estate.membership?.primary_slices ?? [])).size,
    primary_case_claims: closedEstates.reduce((sum, estate) => sum + (estate.custody_counts?.primary_case_claims ?? 0), 0),
    primary_case_receipts: closedEstates.reduce((sum, estate) => sum + (estate.custody_counts?.primary_case_receipts ?? 0), 0),
    slice_records: closedEstates.reduce((sum, estate) => sum + (estate.custody_counts?.primary_slice_records ?? 0), 0),
    completion_records: closedEstates.reduce((sum, estate) => sum + (estate.custody_counts?.primary_slice_completion_records ?? 0), 0),
  };
  const frontierDominantFogs = new Set(
    estateRegistry.estates
      .filter(estate => estate.generation === 'frontier')
      .map(estate => estate.dominant_fog),
  );
  const closedFogVocabulary = Object.fromEntries(
    Object.entries(estateRegistry.fog_vocabulary ?? {})
      .filter(([key]) => !frontierDominantFogs.has(key)),
  );
  const closedRegistryBoundaries = (estateRegistry.boundaries ?? [])
    .filter(boundary => !/frontier estate/i.test(boundary));
  const manifest = {
    schema_version: ESTATE_CLOSURE_MANIFEST_SCHEMA_VERSION,
    as_of: methodology.as_of,
    generated_at: FIXED_CLOSED_AT,
    purpose: 'Close the currently declared macro-estate fan-out pass to bounded, reviewable task results and expose the remaining waterline without claiming factual estate completion.',
    source_fanout_fingerprint: fanoutManifest.fingerprint,
    source_registry_scope: 'closed_m01_estates_only',
    source_registry_fingerprint: fullDigest(closedEstates),
    route_registry_scope: 'closed_m01_routes_only',
    route_registry_sha256: fullDigest(closedRoutes),
    counts: {
      estates: packets.length,
      issues: packets.length,
      tasks: allTasks.length,
      surface_complete_tasks: allTasks.filter(task => task.closure_state === 'surface_complete').length,
      partially_searched_tasks: allTasks.filter(task => task.closure_state === 'partially_searched').length,
      unavailable_after_search_tasks: allTasks.filter(task => task.closure_state === 'unavailable_after_search').length,
      route_labels: closedRoutes.length,
      canonical_route_families: new Set(closedRoutes.map(route => route.canonical_family_id)).size,
      route_uses: sourceTasks.length,
    },
    counts_by_task_kind: countBy(allTasks, 'task_kind'),
    counts_by_machine_readiness: countBy(sourceTasks.map(task => ({ machine_readiness: task.evidence.machine_readiness })), 'machine_readiness'),
    packets: packets.map(packet => ({
      estate_id: packet.estate_id,
      estate_label: packet.estate_label,
      issue_number: packet.issue.number,
      task_count: packet.task_counts.total,
      fingerprint: packet.fingerprint,
      path: `${OUTPUT_DIR}/${packet.estate_id}.json`,
    })),
    waterline: {
      current: 'bounded_candidate_handoff',
      next: 'human_evidence_review',
      estate_completion_claimed: false,
    },
    boundaries: [
      methodology.pass_completion_law,
      methodology.candidate_packet_law,
      'A portal is not a record. A record is not a resolved identity. Sequence is not causation.',
      'Operational dependency and visual prominence do not rank estates, people, institutions, risk, importance, influence, or wrongdoing.',
    ],
    promotes_to: 'candidate_only',
    graph_effect: 'none',
    conclusion_generated: false,
  };
  manifest.fingerprint = digest(manifest);

  const corridors = buildRouteCorridors(closedRoutes);
  const apertureData = {
    schema_version: ESTATE_APERTURE_DATA_SCHEMA_VERSION,
    as_of: methodology.as_of,
    manifest,
    registry: {
      scope: 'closed_m01_estates_only',
      counts: closedRegistryCounts,
      fog_vocabulary: closedFogVocabulary,
      boundaries: closedRegistryBoundaries,
    },
    estates: packets,
    routes: closedRoutes,
    corridors,
    interpretation_contract: {
      graph_effect: 'none',
      candidate_only: true,
      closure_is_not_estate_completion: true,
      caveat: 'Operational dependency is not evidence. Visual prominence is not importance, suspicion, influence, wrongdoing, or causation. A complete handoff is not an approved publication.',
    },
  };
  apertureData.fingerprint = digest(apertureData);

  walk({ manifest, packets, apertureData }, (key, value, pointer) => {
    if (FORBIDDEN_KEYS.test(key)) throw new Error(`estate closures: prohibited field ${pointer}`);
    if (key === 'graph_effect' && value !== 'none') throw new Error(`estate closures: graph-active field ${pointer}`);
    if (key === 'conclusion_generated' && value !== false) throw new Error(`estate closures: conclusion-generating field ${pointer}`);
  });

  if (write) {
    fs.rmSync(path.join(root, OUTPUT_DIR), { recursive: true, force: true });
    fs.mkdirSync(path.join(root, OUTPUT_DIR), { recursive: true });
    for (const packet of packets) writeJson(`${OUTPUT_DIR}/${packet.estate_id}.json`, packet);
    writeJson(`${OUTPUT_DIR}/manifest.json`, manifest);
    writeJson(APERTURE_DATA, apertureData);
    fs.rmSync(path.join(root, HANDOFF_DIR), { recursive: true, force: true });
    fs.mkdirSync(path.join(root, HANDOFF_DIR), { recursive: true });
    for (const packet of packets) {
      const issue = String(packet.issue.number).padStart(2, '0');
      fs.writeFileSync(path.join(root, HANDOFF_DIR, `${issue}-${packet.estate_id}.md`), renderIssueHandoff(packet));
    }
  }
  return { manifest, packets, apertureData };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const built = buildEstateClosures();
  console.log(`estate closures: ${built.manifest.counts.estates} estates, ${built.manifest.counts.tasks} tasks, ${built.manifest.counts.surface_complete_tasks} candidate handoffs`);
}
