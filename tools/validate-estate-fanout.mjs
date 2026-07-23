#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { compileEstateFanout } from './build-estate-fanout.mjs';
import { root } from './lib/ledger.mjs';

const OUTPUT_DIRECTORY = 'build/estate-fanout';
const readJson = location => JSON.parse(fs.readFileSync(path.join(root, location), 'utf8'));
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const equal = (actual, expected, message) => {
  try { assert.deepEqual(actual, expected); } catch { errors.push(message); }
};
const forbiddenKeys = /^(?:guilt_score|corruption_score|motive_score|influence_score|risk_score|probability_score|ranking|rank|score|verdict|finding|claim_status|publication_approval)$/i;

function walk(value, pointer = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${pointer}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    check(!forbiddenKeys.test(key), `${pointer}.${key}: prohibited field`);
    if (key === 'graph_effect') check(item === 'none', `${pointer}.${key}: graph effect must remain none`);
    if (key === 'conclusion_generated') check(item === false, `${pointer}.${key}: conclusion generation must remain false`);
    if (key === 'promotes_to') check(item === 'candidate_only', `${pointer}.${key}: promotion boundary must remain candidate_only`);
    walk(item, `${pointer}.${key}`);
  }
}

const expected = compileEstateFanout();
const manifestPath = `${OUTPUT_DIRECTORY}/manifest.json`;
check(fs.existsSync(path.join(root, manifestPath)), 'manifest is missing; run tools/build-estate-fanout.mjs');
const manifest = fs.existsSync(path.join(root, manifestPath)) ? readJson(manifestPath) : null;
if (manifest) equal(manifest, expected.manifest, 'manifest diverges from deterministic compilation');

check(expected.registry.estates.length === 14, 'expected fourteen macro estates');
check(expected.manifest.counts.existing_estates === 4, 'expected four existing estates');
check(expected.manifest.counts.next_estates === 10, 'expected ten next estates');
check(expected.manifest.packets.length === expected.registry.estates.length, 'one packet per estate is required');
check(expected.manifest.matrix.include.length === expected.registry.estates.length, 'matrix must include every estate exactly once');
check(new Set(expected.manifest.matrix.include.map(item => item.estate_id)).size === expected.registry.estates.length, 'matrix duplicates an estate');

const taskIds = new Set();
let sourceTaskCount = 0;
for (const expectedPacket of expected.packets) {
  const packetPath = `${OUTPUT_DIRECTORY}/${expectedPacket.estate_id}.json`;
  const markdownPath = `${OUTPUT_DIRECTORY}/${expectedPacket.estate_id}.md`;
  check(fs.existsSync(path.join(root, packetPath)), `${expectedPacket.estate_id}: packet JSON is missing`);
  check(fs.existsSync(path.join(root, markdownPath)), `${expectedPacket.estate_id}: packet Markdown is missing`);
  if (fs.existsSync(path.join(root, packetPath))) equal(readJson(packetPath), expectedPacket, `${expectedPacket.estate_id}: packet diverges from deterministic compilation`);

  check(expectedPacket.graph_effect === 'none', `${expectedPacket.estate_id}: packet graph effect changed`);
  check(expectedPacket.conclusion_generated === false, `${expectedPacket.estate_id}: packet generated a conclusion`);
  check(expectedPacket.promotes_to === 'candidate_only', `${expectedPacket.estate_id}: packet exceeded candidate-only status`);
  check(expectedPacket.issue_title === `[estate fan-out] ${expectedPacket.estate_label}`, `${expectedPacket.estate_id}: unstable issue title`);
  check(expectedPacket.lane === `estate-${expectedPacket.estate_id}`, `${expectedPacket.estate_id}: unstable lane`);
  check(expectedPacket.task_count === expectedPacket.tasks.length, `${expectedPacket.estate_id}: task count mismatch`);
  check(expectedPacket.task_count === expectedPacket.source_routes.length + 4, `${expectedPacket.estate_id}: packet must contain four shared tasks plus one task per source route`);

  const byKind = new Map();
  const byId = new Map(expectedPacket.tasks.map(task => [task.task_id, task]));
  for (const task of expectedPacket.tasks) {
    if (!byKind.has(task.task_kind)) byKind.set(task.task_kind, []);
    byKind.get(task.task_kind).push(task);
    check(!taskIds.has(task.task_id), `${task.task_id}: duplicate task ID`);
    taskIds.add(task.task_id);
    check(task.schema_version === 'estate-fanout-task@1', `${task.task_id}: task schema mismatch`);
    check(task.estate_id === expectedPacket.estate_id, `${task.task_id}: estate identity drifted`);
    check(task.graph_effect === 'none', `${task.task_id}: task graph effect changed`);
    check(task.conclusion_generated === false, `${task.task_id}: task generated a conclusion`);
    check(task.promotes_to === 'candidate_only', `${task.task_id}: task exceeded candidate-only status`);
    check(task.candidate_status === 'intake_only', `${task.task_id}: task self-promoted`);
    check(task.causal_status === 'not_established', `${task.task_id}: task asserted causation`);
    check(task.publication_status === 'internal_intake', `${task.task_id}: task escaped internal intake`);
    check(task.verification_status === 'machine_proposed_unverified', `${task.task_id}: unsafe verification state`);
    check(task.evidence_layer === 'investigative_hypothesis', `${task.task_id}: unsafe evidence layer`);
    check(task.evidence_state === 'inferred', `${task.task_id}: unsafe evidence state`);
    check(task.discovery_status === 'preserved_intake', `${task.task_id}: unsafe discovery state`);
    check(task.certainty_grade === 'machine_derived_unverified', `${task.task_id}: unsafe certainty state`);
    check(task.bounded === true, `${task.task_id}: task is not bounded`);
    check(Array.isArray(task.required_outputs) && task.required_outputs.length > 0, `${task.task_id}: required outputs missing`);
    check(Array.isArray(task.allowed_results) && task.allowed_results.length > 0, `${task.task_id}: allowed results missing`);
    check(Array.isArray(task.forbidden_inferences) && task.forbidden_inferences.length > 0, `${task.task_id}: inference firewall missing`);
    check(typeof task.requested_action === 'string' && task.requested_action.length > 40, `${task.task_id}: bounded action missing`);
    check(typeof task.stopping_rule === 'string' && task.stopping_rule.length > 40, `${task.task_id}: stopping rule missing`);
    for (const dependencyId of task.dependency_task_ids) check(byId.has(dependencyId), `${task.task_id}: missing dependency ${dependencyId}`);
  }

  check((byKind.get('denominator_freeze') ?? []).length === 1, `${expectedPacket.estate_id}: denominator task count must be one`);
  check((byKind.get('source_acquisition') ?? []).length === expectedPacket.source_routes.length, `${expectedPacket.estate_id}: source-route task count mismatch`);
  check((byKind.get('identity_resolution') ?? []).length === 1, `${expectedPacket.estate_id}: identity task count must be one`);
  check((byKind.get('temporal_and_null_controls') ?? []).length === 1, `${expectedPacket.estate_id}: temporal/null task count must be one`);
  check((byKind.get('candidate_packet') ?? []).length === 1, `${expectedPacket.estate_id}: candidate-packet task count must be one`);

  const sourceTasks = byKind.get('source_acquisition') ?? [];
  sourceTaskCount += sourceTasks.length;
  equal(sourceTasks.map(task => task.source_route), expectedPacket.source_routes, `${expectedPacket.estate_id}: source routes drifted`);
  check(sourceTasks.every(task => task.dependency_task_ids.length === 0), `${expectedPacket.estate_id}: source routes should run in parallel`);

  const denominator = byKind.get('denominator_freeze')?.[0];
  const identity = byKind.get('identity_resolution')?.[0];
  const temporal = byKind.get('temporal_and_null_controls')?.[0];
  const candidate = byKind.get('candidate_packet')?.[0];
  const sharedDependencies = [denominator.task_id, ...sourceTasks.map(task => task.task_id)];
  equal(identity.dependency_task_ids, sharedDependencies, `${expectedPacket.estate_id}: identity dependencies drifted`);
  equal(temporal.dependency_task_ids, sharedDependencies, `${expectedPacket.estate_id}: temporal dependencies drifted`);
  equal(candidate.dependency_task_ids, [...sharedDependencies, identity.task_id, temporal.task_id], `${expectedPacket.estate_id}: candidate dependencies drifted`);

  const sequenceIndex = new Map(expectedPacket.task_sequence.map((taskId, index) => [taskId, index]));
  for (const task of expectedPacket.tasks) {
    for (const dependencyId of task.dependency_task_ids) {
      check(sequenceIndex.get(dependencyId) < sequenceIndex.get(task.task_id), `${task.task_id}: dependency order is cyclic or reversed`);
    }
  }

  if (fs.existsSync(path.join(root, markdownPath))) {
    const markdown = fs.readFileSync(path.join(root, markdownPath), 'utf8');
    check(markdown.includes(`<!-- estate-fanout-fingerprint:${expectedPacket.fingerprint} -->`), `${expectedPacket.estate_id}: Markdown fingerprint missing`);
    check(markdown.includes('candidate_only'), `${expectedPacket.estate_id}: Markdown promotion boundary missing`);
    check(markdown.includes('graph_effect: none'), `${expectedPacket.estate_id}: Markdown graph boundary missing`);
  }
}

check(expected.manifest.counts.tasks === taskIds.size, 'manifest task total mismatch');
check(expected.manifest.counts.source_acquisition_tasks === sourceTaskCount, 'manifest source-route total mismatch');
check(expected.manifest.counts.denominator_tasks === expected.registry.estates.length, 'one denominator task per estate is required');
check(expected.manifest.counts.identity_resolution_tasks === expected.registry.estates.length, 'one identity task per estate is required');
check(expected.manifest.counts.temporal_and_null_control_tasks === expected.registry.estates.length, 'one temporal/null task per estate is required');
check(expected.manifest.counts.candidate_packet_tasks === expected.registry.estates.length, 'one candidate packet per estate is required');
walk(expected.manifest);
walk(expected.packets);

if (errors.length) {
  console.error('validate-estate-fanout failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`validate-estate-fanout: OK (${expected.manifest.counts.estates} estate lanes, ${expected.manifest.counts.tasks} tasks, ${sourceTaskCount} source routes)`);
