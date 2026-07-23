#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root } from './lib/ledger.mjs';

export const ESTATE_FANOUT_MANIFEST_SCHEMA = 'estate-fanout-manifest@1';
export const ESTATE_FANOUT_PACKET_SCHEMA = 'estate-fanout-packet@1';
export const ESTATE_FANOUT_TASK_SCHEMA = 'estate-fanout-task@1';

const REGISTRY_PATH = 'build/estates/index.json';
const METHODOLOGY_PATH = 'data/estates/fanout-methodology.json';
const OUTPUT_DIRECTORY = 'build/estate-fanout';
const CLOSED_PASS_GENERATIONS = new Set(['existing', 'next']);

const readJson = location => JSON.parse(fs.readFileSync(path.join(root, location), 'utf8'));
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const slug = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));

function fail(message) {
  throw new Error(`estate-fanout: ${message}`);
}

function validateInputs(registry, methodology) {
  if (registry.schema_version !== 'compiled-estate-registry@1') fail('compiled estate registry is missing or incompatible');
  if (registry.graph_effect !== 'none' || registry.conclusion_generated !== false) fail('estate registry exceeds its inference boundary');
  if (!Array.isArray(registry.estates) || registry.estates.length === 0) fail('estate registry has no estates');
  if (methodology.schema_version !== 'estate-fanout-methodology@1') fail('fan-out methodology is missing or incompatible');
  if (methodology.graph_effect !== 'none' || methodology.conclusion_generated !== false || methodology.promotes_to !== 'candidate_only') {
    fail('fan-out methodology exceeds the candidate-only boundary');
  }
  const requiredKinds = ['denominator_freeze', 'source_acquisition', 'identity_resolution', 'temporal_and_null_controls', 'candidate_packet'];
  for (const kind of requiredKinds) {
    const definition = methodology.task_kinds?.[kind];
    if (!definition || !['high', 'medium', 'low'].includes(definition.priority)) fail(`methodology lacks valid task kind ${kind}`);
    if (!Array.isArray(definition.required_outputs) || definition.required_outputs.length === 0) fail(`${kind} lacks required outputs`);
    if (!clean(definition.stopping_rule)) fail(`${kind} lacks a stopping rule`);
  }
  if (!Array.isArray(methodology.allowed_results) || methodology.allowed_results.length === 0) fail('methodology lacks allowed results');
  if (!Array.isArray(methodology.forbidden_inferences) || methodology.forbidden_inferences.length === 0) fail('methodology lacks forbidden inferences');
}

function taskBase({ estate, methodology, taskKind, taskId, title, requestedAction, dependencies = [], sourceRoute = null }) {
  const definition = methodology.task_kinds[taskKind];
  const core = {
    schema_version: ESTATE_FANOUT_TASK_SCHEMA,
    task_id: taskId,
    estate_id: estate.estate_id,
    estate_label: estate.label,
    estate_generation: estate.generation,
    estate_domain: estate.domain,
    task_kind: taskKind,
    priority: definition.priority,
    title: clean(title),
    observed: clean(
      `The macro-estate registry defines ${estate.label} as a ${estate.generation} durable corpus with dominant fog ${estate.dominant_fog}. `
      + `This task is a bounded acquisition instruction for the declared estate scope, not a finding about any person, organization, transaction, decision, or outcome.`
    ),
    requested_action: clean(requestedAction),
    dependency_task_ids: [...dependencies],
    required_outputs: clone(definition.required_outputs),
    stopping_rule: definition.stopping_rule,
    allowed_results: clone(methodology.allowed_results),
    forbidden_inferences: clone(methodology.forbidden_inferences),
    operation: estate.next_acquisition.operation,
    decisive_output: estate.next_acquisition.decisive_output,
    dominant_fog: estate.dominant_fog,
    fog: clone(estate.fog),
    boundary: estate.boundary,
    refs: [REGISTRY_PATH, estate.estate_id, ...(estate.asset_refs ?? []).map(item => item.path || item.ref).filter(Boolean)],
    bounded: true,
    candidate_status: 'intake_only',
    causal_status: 'not_established',
    publication_status: 'internal_intake',
    evidence_layer: 'investigative_hypothesis',
    evidence_state: 'inferred',
    discovery_status: 'preserved_intake',
    certainty_grade: 'machine_derived_unverified',
    source_availability: 'unknown',
    promotes_to: 'candidate_only',
    graph_effect: 'none',
    conclusion_generated: false,
    verification_status: 'machine_proposed_unverified'
  };
  if (sourceRoute) {
    core.source_route = sourceRoute;
    core.refs.push(sourceRoute);
  }
  return { ...core, fingerprint: hash(core).slice(0, 20) };
}

function compileEstatePacket(estate, methodology) {
  if (!estate.next_acquisition || !clean(estate.next_acquisition.operation) || !clean(estate.next_acquisition.decisive_output)) {
    fail(`${estate.estate_id} lacks an executable next acquisition`);
  }
  const routes = estate.next_acquisition.source_routes ?? [];
  if (!Array.isArray(routes) || routes.length === 0) fail(`${estate.estate_id} lacks source routes`);
  const routeSlugs = routes.map(slug);
  if (routeSlugs.some(value => !value) || new Set(routeSlugs).size !== routeSlugs.length) {
    fail(`${estate.estate_id} has empty or colliding source-route slugs`);
  }

  const denominatorId = `estate:${estate.estate_id}:denominator-freeze`;
  const routeIds = routes.map(route => `estate:${estate.estate_id}:source:${slug(route)}`);
  const identityId = `estate:${estate.estate_id}:identity-resolution`;
  const temporalId = `estate:${estate.estate_id}:temporal-null-controls`;
  const candidateId = `estate:${estate.estate_id}:candidate-packet`;

  const denominator = taskBase({
    estate,
    methodology,
    taskKind: 'denominator_freeze',
    taskId: denominatorId,
    title: `${estate.label}: freeze the corpus and control denominators`,
    requestedAction: `Freeze the complete bounded universe for ${estate.scope} before interpreting recurrence or absence. Declare inclusion and exclusion rules, jurisdictions, time windows, source families, stable identifiers, as-of date, ordinary and unsuccessful controls, explicit null rows, and a reproducible snapshot fingerprint. Preserve partial and unavailable coverage rather than completing the universe by inference.`
  });

  const sourceTasks = routes.map((route, index) => taskBase({
    estate,
    methodology,
    taskKind: 'source_acquisition',
    taskId: routeIds[index],
    title: `${estate.label}: acquire ${route}`,
    requestedAction: `Acquire the bounded official or primary-public ${route} source family needed to ${estate.next_acquisition.operation}. Preserve the exact query or locator, source bytes or stable record identifier, retrieval timestamp, record and event dates, jurisdiction and coverage window, record identifiers, duplicates, nulls, access failures, and receipt-ready provenance. A source route is not the underlying fact, and a failed route is not evidence of absence.`,
    dependencies: [],
    sourceRoute: route
  }));

  const sharedDependencies = [denominatorId, ...routeIds];
  const identity = taskBase({
    estate,
    methodology,
    taskKind: 'identity_resolution',
    taskId: identityId,
    title: `${estate.label}: resolve identities and reversible joins`,
    requestedAction: `After the denominator and source packets exist, independently resolve every relevant person, organization, legal entity, vehicle, property, award, contract, filing, and instrument using the strongest available official identifiers. Produce accepted, ambiguous, and rejected joins with reversible provenance. Preserve name-only, brand-only, address-only, and logo-only matches outside promotion.`,
    dependencies: sharedDependencies
  });

  const temporal = taskBase({
    estate,
    methodology,
    taskKind: 'temporal_and_null_controls',
    taskId: temporalId,
    title: `${estate.label}: normalize decision windows and null controls`,
    requestedAction: `Normalize event, appointment, filing, instrument-execution, award-ceiling, obligation, outlay, performance, publication, and retrieval dates without collapsing them. Build the decision-window table and preserve unsuccessful, denied, withdrawn, nonparticipant, nonrecipient, and no-match controls. Sequence and adjacency remain non-causal unless a source explicitly states otherwise.`,
    dependencies: sharedDependencies
  });

  const priorIds = [denominatorId, ...routeIds, identityId, temporalId];
  const candidate = taskBase({
    estate,
    methodology,
    taskKind: 'candidate_packet',
    taskId: candidateId,
    title: `${estate.label}: assemble the candidate-only estate handoff`,
    requestedAction: `After every upstream task is closed to a bounded result, assemble a candidate-only handoff containing the source inventory, coverage and fog matrix, identity crosswalk, temporal table, contradictions, nulls, unsuccessful paths, access failures, and named residual acquisitions. The target output is ${estate.next_acquisition.decisive_output}. Stop before creating a canonical claim, graph edge, causal conclusion, allegation, structured-report approval, or publication approval.`,
    dependencies: priorIds
  });

  const tasks = [denominator, ...sourceTasks, identity, temporal, candidate];
  const packetCore = {
    schema_version: ESTATE_FANOUT_PACKET_SCHEMA,
    estate_id: estate.estate_id,
    estate_label: estate.label,
    generation: estate.generation,
    domain: estate.domain,
    jurisdictions: clone(estate.jurisdictions),
    scope: estate.scope,
    current_state: estate.current_state,
    dominant_fog: estate.dominant_fog,
    fog: clone(estate.fog),
    operation: estate.next_acquisition.operation,
    decisive_output: estate.next_acquisition.decisive_output,
    source_routes: clone(routes),
    boundary: estate.boundary,
    lane: `estate-${estate.estate_id}`,
    issue_title: `[estate fan-out] ${estate.label}`,
    task_count: tasks.length,
    task_sequence: tasks.map(item => item.task_id),
    graph_effect: 'none',
    conclusion_generated: false,
    promotes_to: 'candidate_only',
    tasks
  };
  return { ...packetCore, fingerprint: hash(packetCore).slice(0, 20) };
}

function renderPacket(packet, methodology) {
  const taskSections = packet.tasks.flatMap(task => [
    `## ${task.title}`,
    '',
    `- Task: \`${task.task_id}\``,
    `- Kind: \`${task.task_kind}\``,
    `- Operational priority: \`${task.priority}\``,
    `- Dependencies: ${task.dependency_task_ids.length ? task.dependency_task_ids.map(id => `\`${id}\``).join(', ') : 'none'}`,
    task.source_route ? `- Source route: ${task.source_route}` : null,
    `- Fingerprint: \`${task.fingerprint}\``,
    '',
    '**Bounded action**',
    '',
    task.requested_action,
    '',
    '**Required outputs**',
    '',
    ...task.required_outputs.map(output => `- ${output}`),
    '',
    '**Stopping rule**',
    '',
    task.stopping_rule,
    '',
    '---',
    ''
  ].filter(value => value !== null));

  return [
    `# Estate fan-out: ${packet.estate_label}`,
    '',
    '> Machine-proposed and unverified. `promotes_to: candidate_only`. `graph_effect: none`. `conclusion_generated: false`.',
    '',
    `- Estate: \`${packet.estate_id}\``,
    `- Generation: \`${packet.generation}\``,
    `- Domain: ${packet.domain}`,
    `- Jurisdictions: ${packet.jurisdictions.join('; ')}`,
    `- Current state: \`${packet.current_state}\``,
    `- Dominant fog: \`${packet.dominant_fog}\``,
    `- Parallel lane: \`${packet.lane}\``,
    `- Packet fingerprint: \`${packet.fingerprint}\``,
    '',
    '**Estate scope**',
    '',
    packet.scope,
    '',
    '**Current acquisition target**',
    '',
    `Operation: ${packet.operation}`,
    '',
    `Decisive output: ${packet.decisive_output}`,
    '',
    '**Inference boundary**',
    '',
    packet.boundary,
    '',
    `Within this lane, work follows: ${methodology.lane_policy.ordering.map(value => `\`${value}\``).join(' → ')}. All estate lanes may run concurrently.`,
    '',
    ...taskSections,
    '<!-- estate-fanout-fingerprint:' + packet.fingerprint + ' -->',
    ''
  ].join('\n');
}

export function compileEstateFanout() {
  const registry = readJson(REGISTRY_PATH);
  const methodology = readJson(METHODOLOGY_PATH);
  validateInputs(registry, methodology);
  const packets = [...registry.estates]
    .filter(estate => CLOSED_PASS_GENERATIONS.has(estate.generation))
    .sort((a, b) => a.estate_id.localeCompare(b.estate_id))
    .map(estate => compileEstatePacket(estate, methodology));

  const descriptors = packets.map(packet => ({
    estate_id: packet.estate_id,
    issue_title: packet.issue_title,
    lane: packet.lane,
    task_count: packet.task_count,
    fingerprint: packet.fingerprint,
    json_path: `${OUTPUT_DIRECTORY}/${packet.estate_id}.json`,
    markdown_path: `${OUTPUT_DIRECTORY}/${packet.estate_id}.md`
  }));
  const allTasks = packets.flatMap(packet => packet.tasks);
  const manifestCore = {
    schema_version: ESTATE_FANOUT_MANIFEST_SCHEMA,
    as_of: registry.as_of,
    methodology_path: METHODOLOGY_PATH,
    registry_path: REGISTRY_PATH,
    methodology_sha256: hash(methodology),
    registry_sha256: hash(registry),
    graph_effect: 'none',
    conclusion_generated: false,
    promotes_to: 'candidate_only',
    counts: {
      estates: packets.length,
      existing_estates: packets.filter(packet => packet.generation === 'existing').length,
      next_estates: packets.filter(packet => packet.generation === 'next').length,
      frontier_estates_excluded: registry.estates.filter(estate => estate.generation === 'frontier').length,
      tasks: allTasks.length,
      denominator_tasks: allTasks.filter(task => task.task_kind === 'denominator_freeze').length,
      source_acquisition_tasks: allTasks.filter(task => task.task_kind === 'source_acquisition').length,
      identity_resolution_tasks: allTasks.filter(task => task.task_kind === 'identity_resolution').length,
      temporal_and_null_control_tasks: allTasks.filter(task => task.task_kind === 'temporal_and_null_controls').length,
      candidate_packet_tasks: allTasks.filter(task => task.task_kind === 'candidate_packet').length
    },
    packets: descriptors,
    matrix: {
      include: descriptors.map(({ estate_id, issue_title, markdown_path, fingerprint }) => ({
        estate_id,
        issue_title,
        markdown_path,
        fingerprint
      }))
    },
    boundaries: [
      methodology.lane_policy.boundary,
      'A fan-out task is a bounded research instruction, not a canonical claim or finding.',
      'A complete source route or denominator does not complete an estate.',
      'Promotion remains a separate human-reviewed transition.'
    ]
  };
  const manifest = { ...manifestCore, fingerprint: hash(manifestCore).slice(0, 20) };
  return { registry, methodology, packets, manifest };
}

export function buildEstateFanout({ write = true } = {}) {
  const compiled = compileEstateFanout();
  if (write) {
    const output = path.join(root, OUTPUT_DIRECTORY);
    fs.rmSync(output, { recursive: true, force: true });
    fs.mkdirSync(output, { recursive: true });
    for (const packet of compiled.packets) {
      fs.writeFileSync(path.join(output, `${packet.estate_id}.json`), `${JSON.stringify(packet, null, 2)}\n`);
      fs.writeFileSync(path.join(output, `${packet.estate_id}.md`), renderPacket(packet, compiled.methodology));
    }
    fs.writeFileSync(path.join(output, 'manifest.json'), `${JSON.stringify(compiled.manifest, null, 2)}\n`);
  }
  return compiled;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  const { manifest } = buildEstateFanout();
  console.log(`estate fan-out: ${manifest.counts.estates} estate lane(s), ${manifest.counts.tasks} bounded task(s), ${manifest.counts.source_acquisition_tasks} source route(s)`);
}
