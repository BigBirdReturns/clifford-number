#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  buildRequirementFanout,
  renderReport,
  resultPathFor
} from './build-lake-allocator-war-join-requirements-wave-35.mjs';

const defaultRoot = process.cwd();
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
};
const canonicalJson = value => JSON.stringify(canonical(value));
const same = (left, right) => canonicalJson(left) === canonicalJson(right);
const unique = values => new Set(values).size === values.length;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const countBy = (rows, key) => Object.fromEntries(
  [...new Set(rows.map(row => row[key]))]
    .sort()
    .map(value => [value, rows.filter(row => row[key] === value).length])
);

function full(root, relative) { return path.join(root, relative); }
function readJson(root, relative) { return JSON.parse(fs.readFileSync(full(root, relative), 'utf8')); }
function readJsonl(root, relative) { return fs.readFileSync(full(root, relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); }
function readText(root, relative) { return fs.readFileSync(full(root, relative), 'utf8'); }
function exists(root, relative) { return fs.existsSync(full(root, relative)); }

export function ensureAncestry(root, requiredCommit) {
  if (!fs.existsSync(path.join(root, '.git'))) {
    if (process.env.GITHUB_ACTIONS === 'true') throw new Error('Wave 35 ancestry cannot be checked without Git metadata');
    return 'not_checked_no_git_metadata';
  }

  const run = args => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  const hasCommit = ref => run(['cat-file', '-e', `${ref}^{commit}`]).status === 0;
  const isAncestor = (ancestor, target) => run(['merge-base', '--is-ancestor', ancestor, target]).status === 0;

  if (hasCommit(requiredCommit) && isAncestor(requiredCommit, 'HEAD')) return 'verified_ancestor';

  const headRef = String(process.env.GITHUB_HEAD_REF ?? '').trim();
  if (process.env.GITHUB_ACTIONS === 'true' && headRef) {
    const remoteRef = `refs/remotes/origin/${headRef}`;
    const recovered = run([
      'fetch',
      '--no-tags',
      '--prune',
      '--depth=1000000',
      'origin',
      `+refs/heads/${headRef}:${remoteRef}`
    ]);
    if (recovered.status !== 0) throw new Error(`Wave 35 ancestry recovery failed for ${headRef}`);
    if (!hasCommit(requiredCommit)) throw new Error(`Wave 35 base checkpoint remains unavailable after history recovery: ${requiredCommit}`);
    if (!isAncestor(requiredCommit, remoteRef)) throw new Error('Wave 35 base checkpoint is not an ancestor of recovered head');
    return 'verified_recovered_head_ancestor';
  }

  if (!hasCommit(requiredCommit)) {
    if (process.env.GITHUB_ACTIONS === 'true') throw new Error(`Wave 35 base checkpoint unavailable: ${requiredCommit}`);
    return 'not_checked_local_archive_missing_historical_commit';
  }
  throw new Error('Wave 35 base checkpoint is not an ancestor');
}

export function loadState(root = defaultRoot) {
  const policyPath = 'data/project/lake-allocator-war-join-requirements-wave-35-policy.json';
  const policy = readJson(root, policyPath);
  const sourcePolicy = readJson(root, policy.paths.source_policy);
  const sourceProjection = readJson(root, policy.paths.source_projection);
  const sourceJoinRaw = readText(root, policy.paths.source_join_ledger);
  const sourceJoinRows = sourceJoinRaw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const implementationPath = 'tools/build-lake-allocator-war-join-requirements-wave-35.mjs';
  const queueRowsByPath = {};
  const queueRawByPath = {};
  for (const join of sourceJoinRows) {
    const relative = resultPathFor(join.route_class, policy);
    queueRawByPath[relative] = readText(root, relative);
    queueRowsByPath[relative] = readJsonl(root, relative);
  }
  const temporaryPaths = [
    '.github/tmp/wave35-tree-export-trigger.json',
    '.github/tmp/wave35-materializer-trigger.json',
    '.github/workflows/temporary-wave35-tree-export.yml',
    '.github/workflows/temporary-wave35-materializer.yml',
    'tools/run-wave35-materializer.sh'
  ];
  return {
    root,
    policy,
    sourcePolicy,
    sourceProjection,
    sourceJoinRaw,
    sourceJoinRows,
    implementationFingerprint: {
      path: implementationPath,
      sha256: sha256(fs.readFileSync(full(root, implementationPath)))
    },
    queueRowsByPath,
    queueRawByPath,
    projection: readJson(root, policy.paths.projection),
    report: readText(root, policy.paths.report),
    wave21Policy: readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json'),
    lakeIndexPolicy: readJson(root, 'data/project/lake-index-policy.json'),
    basinRegistry: readJson(root, 'data/project/lake-basin-registry.json'),
    packageJson: readJson(root, 'package.json'),
    installer: readText(root, 'tools/install-lake-allocator-war-wave-21.mjs'),
    wave21Validator: readText(root, 'tools/validate-lake-allocator-war-wave-21.mjs'),
    workflow: readText(root, '.github/workflows/lake-allocator-war-join-requirements-wave-35.yml'),
    readme: readText(root, 'README.md'),
    buildInstructions: readText(root, 'BUILD-INSTRUCTIONS.md'),
    temporaryPathsPresent: temporaryPaths.filter(relative => exists(root, relative))
  };
}

function validateExpectedCounts(actual, expected, label) {
  for (const [key, value] of Object.entries(expected)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      assert(same(actual[key], value), `${label}.${key} count drift`);
    } else {
      assert(actual[key] === value, `${label}.${key} count drift: expected ${value}, observed ${actual[key]}`);
    }
  }
}

export function validateState(state, options = {}) {
  const { policy, sourcePolicy, sourceProjection, sourceJoinRows, sourceJoinRaw } = state;
  assert(policy.schema_version === 'lake-allocator-war-join-requirements-wave-35-policy@1', 'Wave 35 policy schema drift');
  assert(policy.program_ref === 'CN-LAKE-ALLOCATOR-WAR-W35' && policy.wave_ref === 'LAW-W35', 'Wave 35 identifiers drift');
  assert(sourcePolicy.schema_version === policy.source_contract.required_policy_schema, 'Wave 35 source policy schema drift');
  assert(sourceProjection.schema_version === policy.source_contract.required_projection_schema, 'Wave 35 source projection schema drift');

  assert(policy.access_lanes.length === 3, 'Wave 35 access-lane denominator drift');
  assert(unique(policy.access_lanes.map(row => row.lane_ref)), 'Wave 35 access-lane references must be unique');
  assert(unique(policy.access_lanes.map(row => row.lane_sequence)), 'Wave 35 access-lane sequences must be unique');
  assert(unique(policy.access_lanes.map(row => row.access_class)), 'Wave 35 access classes must be unique');
  const laneByClass = new Map(policy.access_lanes.map(row => [row.access_class, row]));
  assert(laneByClass.get('public_or_authorized_acquisition')?.execution_ready === true, 'Wave 35 public-or-authorized lane must be execution ready');
  assert(laneByClass.get('public_or_lawful_case_access')?.execution_ready === true, 'Wave 35 lawful-case lane must be execution ready');
  const protectedLane = laneByClass.get('authorized_lawful_access_only');
  assert(protectedLane?.execution_ready === false && protectedLane?.access_bounded === true && protectedLane?.protected_lawful_access_only === true, 'Wave 35 protected lane boundary drift');

  assert(sourceJoinRows.length === policy.source_contract.lawful_join_contracts, 'Wave 35 source join denominator drift');
  assert(sourceProjection.lawful_join_contracts.length === policy.source_contract.lawful_join_contracts, 'Wave 35 source projection join denominator drift');
  assert(unique(sourceJoinRows.map(row => row.join_ref)), 'Wave 35 source join references must be unique');
  assert(unique(sourceJoinRows.map(row => row.route_ref)), 'Wave 35 source route references must be unique');
  assert(unique(sourceJoinRows.map(row => row.join_sequence)), 'Wave 35 source join sequences must be unique');
  assert(same(sourceJoinRows.map(row => row.join_sequence).sort((a, b) => a - b), [1,2,3,4,5,6,7]), 'Wave 35 source join sequence drift');
  const sourceRequirements = sourceJoinRows.flatMap(row => row.missing_requirements.map((requirement, index) => ({ join: row, requirement, requirementSequence: index + 1 })));
  assert(sourceRequirements.length === policy.source_contract.missing_institutional_requirements, 'Wave 35 source requirement denominator drift');
  assert(unique(sourceRequirements.map(row => row.requirement.requirement_ref)), 'Wave 35 source requirement references must be unique');
  assert(sourceRequirements.every(row => row.requirement.satisfied === false), 'Wave 35 source requirement satisfaction inflation');
  assert(sourceRequirements.every(row => laneByClass.has(row.requirement.access_class)), 'Wave 35 source requirement access class outside lane contract');
  assert(sourceJoinRows.every(row => row.schema_version === policy.source_contract.required_join_row_schema && row.row_type === 'lawful_join_contract'), 'Wave 35 source join-row schema drift');
  assert(sourceJoinRows.every(row => row.join_authorized === false && row.joined_rows === 0 && row.complete_denominator === false), 'Wave 35 source join authority inflation');
  assert(countBy(sourceRequirements.map(row => row.requirement), 'access_class') && same(countBy(sourceRequirements.map(row => row.requirement), 'access_class'), policy.source_contract.requirement_access_classes), 'Wave 35 source access-class count drift');
  for (const key of ['authorized_joins','complete_denominators','evidence_rows','finding_promotions','graph_effects','publication_clearances']) {
    assert(sourceProjection.counts[key] === policy.source_contract[key], `Wave 35 source projection ${key} drift`);
  }

  const projectedByJoin = new Map(sourceProjection.lawful_join_contracts.map(row => [row.join_ref, row]));
  for (const join of sourceJoinRows) {
    const projected = projectedByJoin.get(join.join_ref);
    assert(projected, `${join.join_ref}: Wave 35 source projection join absent`);
    for (const key of ['join_sequence','route_ref','route_class','route_owner','join_state']) {
      assert(projected[key] === join[key], `${join.join_ref}: Wave 35 source projection ${key} drift`);
    }
    for (const key of ['source_refs','adapter_refs','candidate_key_classes','missing_requirements']) {
      assert(same(projected[key], join[key]), `${join.join_ref}: Wave 35 source projection ${key} drift`);
    }
  }

  const rebuilt = buildRequirementFanout({
    policy,
    sourcePolicy,
    sourceProjection,
    sourceJoinRows,
    sourceJoinRaw,
    implementationFingerprint: state.implementationFingerprint
  });
  assert(same(state.queueRowsByPath, rebuilt.resultRowsByPath), 'Wave 35 queue ledgers differ from deterministic reconstruction');
  assert(same(state.projection, rebuilt.projection), 'Wave 35 projection differs from deterministic reconstruction');
  assert(state.report === renderReport(rebuilt.projection), 'Wave 35 report differs from deterministic reconstruction');

  const queueRows = Object.values(state.queueRowsByPath).flat();
  const queueSummaries = queueRows.filter(row => row.row_type === 'lawful_join_requirement_queue');
  const taskRows = queueRows.filter(row => row.row_type === 'lawful_join_requirement_acquisition_task');
  assert(queueSummaries.length === 7, 'Wave 35 queue-summary denominator drift');
  assert(taskRows.length === 31, 'Wave 35 task-row denominator drift');
  assert(unique(queueSummaries.map(row => row.queue_ref)), 'Wave 35 queue references must be unique');
  assert(unique(taskRows.map(row => row.task_ref)), 'Wave 35 task references must be unique');
  assert(unique(taskRows.map(row => row.task_sequence)), 'Wave 35 task sequences must be unique');
  assert(same(taskRows.map(row => row.task_sequence).sort((a, b) => a - b), Array.from({ length: 31 }, (_, index) => index + 1)), 'Wave 35 task sequence drift');

  const joinByRef = new Map(sourceJoinRows.map(row => [row.join_ref, row]));
  const sourceRequirementByKey = new Map(sourceRequirements.map(row => [`${row.join.join_ref}#${row.requirement.requirement_ref}`, row]));
  assert(sourceRequirementByKey.size === taskRows.length, 'Wave 35 source requirement key denominator drift');
  const taskKeys = taskRows.map(row => `${row.source_join_ref}#${row.source_requirement_ref}`);
  assert(unique(taskKeys), 'Wave 35 source requirement mapped more than once');
  assert(taskKeys.every(key => sourceRequirementByKey.has(key)), 'Wave 35 task maps an unknown source requirement');
  assert([...sourceRequirementByKey.keys()].every(key => taskKeys.includes(key)), 'Wave 35 source requirement missing a task');

  for (const task of taskRows) {
    const source = sourceRequirementByKey.get(`${task.source_join_ref}#${task.source_requirement_ref}`);
    assert(source, `${task.task_ref}: source requirement absent`);
    const { join, requirement, requirementSequence } = source;
    const lane = laneByClass.get(requirement.access_class);
    assert(task.schema_version === 'lake-allocator-war-join-requirement-task-wave-35@1', `${task.task_ref}: task schema drift`);
    assert(task.program_ref === policy.program_ref && task.wave_ref === policy.wave_ref, `${task.task_ref}: task identity drift`);
    assert(task.queue_ref === `LAW35-Q${String(join.join_sequence).padStart(3, '0')}`, `${task.task_ref}: queue reference drift`);
    assert(task.queue_sequence === join.join_sequence && task.source_join_sequence === join.join_sequence, `${task.task_ref}: join sequence drift`);
    assert(task.source_route_ref === join.route_ref && task.source_route_class === join.route_class && task.source_route_owner === join.route_owner, `${task.task_ref}: route custody drift`);
    assert(task.source_join_state === join.join_state, `${task.task_ref}: source join-state drift`);
    assert(task.requirement_sequence === requirementSequence, `${task.task_ref}: source requirement order drift`);
    assert(task.access_class === requirement.access_class, `${task.task_ref}: access-class drift`);
    assert(task.execution_lane_ref === lane.lane_ref && task.execution_lane_sequence === lane.lane_sequence, `${task.task_ref}: access-lane custody drift`);
    assert(task.execution_state === lane.execution_state && task.execution_ready === lane.execution_ready && task.access_bounded === lane.access_bounded, `${task.task_ref}: execution-state drift`);
    assert(task.protected_lawful_access_only === lane.protected_lawful_access_only, `${task.task_ref}: protected-access drift`);
    assert(task.target_row === requirement.target_row && task.completion_test === requirement.completion_test && task.refused_substitution === requirement.refused_substitution, `${task.task_ref}: requirement text custody drift`);
    assert(same(task.source_refs, join.source_refs) && same(task.adapter_refs, join.adapter_refs) && same(task.candidate_key_classes, join.candidate_key_classes), `${task.task_ref}: source, adapter, or key inheritance drift`);
    assert(task.source_receipt_use_count === join.source_refs.length && task.schema_adapter_use_count === join.adapter_refs.length && task.candidate_key_class_use_count === join.candidate_key_classes.length, `${task.task_ref}: inherited-use count drift`);
    assert(task.source_join_row_sha256 === sha256(canonicalJson(join)), `${task.task_ref}: source join hash drift`);
    assert(task.source_requirement_sha256 === sha256(canonicalJson(requirement)), `${task.task_ref}: source requirement hash drift`);
    assert(task.task_state === (lane.access_bounded ? 'open_access_bounded_requirement' : 'open_execution_ready_requirement'), `${task.task_ref}: task-state drift`);
    assert(task.same_wave_acquisition_result === false && task.requirement_satisfied === false && task.task_admission_authorizes_join === false, `${task.task_ref}: same-wave or satisfaction inflation`);
    assert(task.join_authorized === false && task.joined_rows === 0 && task.complete_denominator === false, `${task.task_ref}: join authority inflation`);
    assert(task.evidence_adjudicated === false && task.evidence_rows === 0 && task.estate_adopted === false && task.finding_promoted === false, `${task.task_ref}: evidence or finding inflation`);
    assert(same(task.blocked_promotions, policy.blocked_promotions), `${task.task_ref}: blocked-promotion drift`);
    assert(task.graph_effect === 'none' && task.publication_status === 'blocked', `${task.task_ref}: graph or publication inflation`);
    if (task.access_class === 'authorized_lawful_access_only') {
      assert(task.execution_ready === false && task.access_bounded === true && task.protected_lawful_access_only === true, `${task.task_ref}: protected task publicly exposed`);
    } else {
      assert(task.execution_ready === true && task.access_bounded === false && task.protected_lawful_access_only === false, `${task.task_ref}: executable lane incorrectly bounded`);
    }
  }

  for (const queue of queueSummaries) {
    const join = joinByRef.get(queue.source_join_ref);
    assert(join, `${queue.queue_ref}: source join absent`);
    const tasks = taskRows.filter(row => row.queue_ref === queue.queue_ref);
    assert(queue.schema_version === 'lake-allocator-war-join-requirement-queue-wave-35@1', `${queue.queue_ref}: queue schema drift`);
    assert(queue.queue_ref === `LAW35-Q${String(join.join_sequence).padStart(3, '0')}` && queue.queue_sequence === join.join_sequence, `${queue.queue_ref}: queue identity drift`);
    assert(queue.source_route_ref === join.route_ref && queue.source_route_class === join.route_class && queue.source_route_owner === join.route_owner, `${queue.queue_ref}: queue route custody drift`);
    assert(queue.source_join_row_sha256 === sha256(canonicalJson(join)), `${queue.queue_ref}: queue source hash drift`);
    assert(same(queue.source_refs, join.source_refs) && same(queue.adapter_refs, join.adapter_refs) && same(queue.candidate_key_classes, join.candidate_key_classes), `${queue.queue_ref}: queue inherited-set drift`);
    assert(same(queue.requirement_refs, join.missing_requirements.map(row => row.requirement_ref)), `${queue.queue_ref}: queue requirement set drift`);
    assert(queue.task_count === tasks.length && queue.task_count === join.missing_requirements.length, `${queue.queue_ref}: queue task count drift`);
    assert(same(queue.requirement_access_classes, countBy(tasks, 'access_class')), `${queue.queue_ref}: queue access-class count drift`);
    assert(queue.execution_ready_tasks === tasks.filter(row => row.execution_ready).length && queue.access_bounded_tasks === tasks.filter(row => row.access_bounded).length, `${queue.queue_ref}: queue execution count drift`);
    assert(queue.same_wave_acquisition_result === false && queue.requirement_satisfied === false && queue.join_authorized === false && queue.complete_denominator === false, `${queue.queue_ref}: queue authority inflation`);
    assert(queue.graph_effect === 'none' && queue.publication_status === 'blocked', `${queue.queue_ref}: queue graph or publication inflation`);
  }

  for (const queue of state.projection.queues) {
    const raw = state.queueRawByPath[queue.result_path];
    const rows = state.queueRowsByPath[queue.result_path];
    assert(typeof raw === 'string' && Array.isArray(rows), `${queue.queue_ref}: queue ledger absent`);
    assert(queue.result_rows === rows.length, `${queue.queue_ref}: queue row count drift`);
    assert(queue.result_sha256 === sha256(raw), `${queue.queue_ref}: queue ledger hash drift`);
    assert(rows[0]?.queue_ref === queue.queue_ref && rows[0]?.row_type === 'lawful_join_requirement_queue', `${queue.queue_ref}: queue summary not first row`);
  }

  validateExpectedCounts(state.projection.counts, policy.expected_counts, 'Wave 35 projection');
  assert(same(state.projection.graph_digests, sourceProjection.graph_digests), 'Wave 35 graph digest mutation');
  assert(state.projection.generated_from.source_join_ledger_bytes === Buffer.byteLength(sourceJoinRaw), 'Wave 35 source ledger byte custody drift');
  assert(state.projection.generated_from.source_join_ledger_sha256 === sha256(sourceJoinRaw), 'Wave 35 source ledger hash custody drift');
  assert(state.projection.amortization_contract.one_build_emits_every_requirement === true && state.projection.amortization_contract.one_task_per_unsatisfied_requirement === true, 'Wave 35 amortization contract absent');
  assert(state.projection.amortization_contract.manual_per_task_dispatch_required === false, 'Wave 35 manual task dispatch reintroduced');
  assert(state.projection.execution_contract.network_requests_performed === 0, 'Wave 35 network request inflation');
  assert(state.projection.execution_contract.public_and_protected_lanes_separated === true && state.projection.execution_contract.protected_tasks_publicly_executable === false, 'Wave 35 access-lane separation drift');
  assert(state.projection.execution_contract.task_admission_executes_acquisition === false && state.projection.execution_contract.task_admission_authorizes_join === false, 'Wave 35 task authority inflation');
  assert(state.projection.execution_contract.authorized_join_created === false, 'Wave 35 authorized join inflation');
  assert(state.projection.tasks.length === taskRows.length, 'Wave 35 projected task denominator drift');
  const projectedTaskByRef = new Map(state.projection.tasks.map(row => [row.task_ref, row]));
  for (const task of taskRows) {
    const projected = projectedTaskByRef.get(task.task_ref);
    assert(projected, `${task.task_ref}: projected task absent`);
    for (const key of ['task_sequence','queue_ref','source_join_ref','source_requirement_ref','route_class','route_owner','access_class','execution_lane_ref','execution_state','execution_ready','access_bounded','protected_lawful_access_only','target_row','source_join_row_sha256','source_requirement_sha256','task_state']) {
      const expected = key === 'route_class' ? task.source_route_class : key === 'route_owner' ? task.source_route_owner : task[key];
      assert(same(projected[key], expected), `${task.task_ref}: projected ${key} drift`);
    }
    for (const key of ['source_refs','adapter_refs','candidate_key_classes']) assert(same(projected[key], task[key]), `${task.task_ref}: projected ${key} drift`);
  }

  const outputText = JSON.stringify({ queueRowsByPath: state.queueRowsByPath, projection: state.projection }) + state.report;
  assert(!outputText.includes('$.token'), 'Wave 35 sensitive token path leaked into outputs');
  for (const key of [
    'requirement_task_is_evidence_row',
    'task_admission_is_acquisition_result',
    'task_admission_satisfies_requirement',
    'task_admission_authorizes_join',
    'queue_completion_closes_denominator',
    'execution_ready_means_requirement_satisfied',
    'public_route_authorizes_protected_access',
    'public_aggregate_satisfies_protected_personnel',
    'candidate_key_proves_identity_or_relationship',
    'shared_source_set_proves_relationship',
    'task_recurrence_is_prevalence',
    'same_wave_acquisition_result_created',
    'identity_created',
    'relationship_created',
    'participation_created',
    'active_claim_created',
    'hop_created',
    'evidence_adjudicated',
    'finding_promoted',
    'publication_cleared'
  ]) assert(policy.boundaries[key] === false, `${key}: Wave 35 authority boundary drift`);
  assert(policy.boundaries.graph_effect === 'none', 'Wave 35 graph boundary drift');

  const queuePaths = sourceJoinRows.map(row => resultPathFor(row.route_class, policy));
  const sourceRoots = [
    'data/project/lake-allocator-war-join-requirements-wave-35-policy.json',
    ...queuePaths,
    policy.paths.method,
    policy.paths.milestone
  ];
  const actionRoots = [policy.paths.projection];
  const reportRoots = [policy.paths.report];
  for (const relative of [...sourceRoots, ...actionRoots, ...reportRoots]) {
    assert(state.lakeIndexPolicy.authoritative_roots.includes(relative), `Wave 35 authoritative root missing: ${relative}`);
  }
  const basinMap = new Map(state.wave21Policy.basin_contract.map(row => [row.basin_id, row]));
  for (const relative of sourceRoots) {
    assert(basinMap.get('allocator-war-source')?.path_prefixes.includes(relative), `Wave 35 source basin path missing: ${relative}`);
    assert(basinMap.get('allocator-war-source')?.authoritative_entrypoints.includes(relative), `Wave 35 source basin entrypoint missing: ${relative}`);
  }
  for (const relative of actionRoots) {
    assert(basinMap.get('allocator-war-lake-actions')?.path_prefixes.includes(relative), `Wave 35 action basin path missing: ${relative}`);
    assert(basinMap.get('allocator-war-lake-actions')?.authoritative_entrypoints.includes(relative), `Wave 35 action basin entrypoint missing: ${relative}`);
  }
  for (const relative of reportRoots) {
    assert(basinMap.get('allocator-war-reports')?.path_prefixes.includes(relative), `Wave 35 report basin path missing: ${relative}`);
    assert(basinMap.get('allocator-war-reports')?.authoritative_entrypoints.includes(relative), `Wave 35 report basin entrypoint missing: ${relative}`);
  }
  const registryMap = new Map(state.basinRegistry.basins.map(row => [row.basin_id, row]));
  for (const basinId of ['allocator-war-source','allocator-war-lake-actions','allocator-war-reports']) {
    assert(same(registryMap.get(basinId)?.path_prefixes ?? [], basinMap.get(basinId)?.path_prefixes ?? []), `Wave 35 basin registry path mismatch: ${basinId}`);
    assert(same(registryMap.get(basinId)?.authoritative_entrypoints ?? [], basinMap.get(basinId)?.authoritative_entrypoints ?? []), `Wave 35 basin registry entrypoint mismatch: ${basinId}`);
  }
  for (const relative of [...queuePaths, policy.paths.projection, policy.paths.report]) {
    assert(state.wave21Policy.projection_contract.allowed_generated_paths.includes(relative), `Wave 35 generated path not allowed: ${relative}`);
  }
  for (const key of [
    'wave_35_requirement_task_is_evidence_row',
    'wave_35_task_admission_authorizes_join',
    'wave_35_protected_task_is_publicly_executable',
    'wave_35_same_wave_acquisition_result_created'
  ]) assert(state.wave21Policy.boundaries[key] === false, `${key}: Wave 35 Wave 21 boundary absent`);
  assert(state.lakeIndexPolicy.boundaries.allocator_war_wave_35_requirement_task_is_evidence === false, 'Wave 35 lake-index boundary absent');
  assert(state.basinRegistry.boundaries.allocator_war_wave_35_task_is_join_authority === false, 'Wave 35 basin boundary absent');

  assert(state.packageJson.scripts['build:lake-allocator-war-join-requirements-wave-35'] === 'node tools/build-lake-allocator-war-join-requirements-wave-35.mjs', 'Wave 35 build script missing');
  assert(state.packageJson.scripts['validate:lake-allocator-war-join-requirements-wave-35'] === 'node tools/validate-lake-allocator-war-join-requirements-wave-35.mjs && node test/lake-allocator-war-join-requirements-wave-35.test.js', 'Wave 35 validate script missing');
  assert(state.packageJson.scripts['ci:lake-allocator-war-join-requirements-wave-35'] === 'npm run build:lake-allocator-war-join-requirements-wave-35 && npm run validate:lake-allocator-war-join-requirements-wave-35', 'Wave 35 CI script missing');
  assert(state.packageJson.scripts.check.includes('npm run validate:lake-allocator-war-schema-joins-wave-34 && npm run validate:lake-allocator-war-join-requirements-wave-35'), 'Wave 35 release ordering missing');
  assert(state.installer.includes('lake-allocator-war-join-requirements-wave-35-policy.json') && state.installer.includes('validate:lake-allocator-war-join-requirements-wave-35'), 'Wave 35 installer registration missing');
  assert(state.wave21Validator.includes('lake-allocator-war-join-requirements-wave-35-policy.json') && state.wave21Validator.includes('allocator-war-join-requirements-wave-35.json'), 'Wave 35 Wave 21 basin validation missing');
  assert(state.workflow.includes('Run complete repository release gate') && state.workflow.includes('Restore and prove the committed epoch'), 'Wave 35 permanent workflow incomplete');
  assert(state.readme.includes('## Allocator-war lawful join requirement fan-out Wave 35'), 'Wave 35 README marker missing');
  assert(state.buildInstructions.includes('3.35 **Allocator-war lawful join requirement fan-out — Wave 35.**'), 'Wave 35 build-instructions marker missing');
  assert(state.temporaryPathsPresent.length === 0, `Wave 35 temporary transport survives: ${state.temporaryPathsPresent.join(', ')}`);

  if (!options.skipAncestry) ensureAncestry(state.root, policy.base_checkpoint.commit);
  return {
    queues: state.projection.counts.join_queues,
    tasks: state.projection.counts.acquisition_tasks,
    ready: state.projection.counts.execution_ready_tasks,
    bounded: state.projection.counts.access_bounded_tasks,
    authorized_joins: state.projection.counts.authorized_joins,
    graph_effect: policy.boundaries.graph_effect
  };
}

export function runValidation(root = defaultRoot) {
  const state = loadState(root);
  const result = validateState(state);
  console.log('allocator-war lawful join requirement fan-out Wave 35 validation passed');
  console.log(`  source joins / requirements: ${state.projection.counts.source_join_contracts} / ${state.projection.counts.source_requirements}`);
  console.log(`  queues / tasks / ready / bounded: ${result.queues} / ${result.tasks} / ${result.ready} / ${result.bounded}`);
  console.log(`  receipt / adapter / key uses: ${state.projection.counts.source_receipt_uses} / ${state.projection.counts.schema_adapter_uses} / ${state.projection.counts.candidate_key_class_uses}`);
  console.log('  acquisition results / joins / evidence / findings / graph / publication: 0 / 0 / 0 / 0 / 0 / 0');
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) runValidation();
