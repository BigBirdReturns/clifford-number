#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildImplementationQueues, resultPathFor } from './build-lake-allocator-war-public-interest-implementation-wave-28.mjs';

const defaultRoot = process.cwd();
const full = (root, relative) => path.join(root, relative);
const readJson = (root, relative) => JSON.parse(fs.readFileSync(full(root, relative), 'utf8'));
const readJsonl = (root, relative) => fs.readFileSync(full(root, relative), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));
const digestBytes = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
};
const digest = value => digestBytes(JSON.stringify(stable(value)));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const unique = values => new Set(values).size === values.length;
const fail = (errors, message) => errors.push(message);
const countBy = (rows, key) => Object.fromEntries(
  [...new Set(rows.map(row => row[key]))]
    .sort()
    .map(value => [value, rows.filter(row => row[key] === value).length])
);

function graphDigests(root) {
  return {
    participation_sha256: digest(readJsonl(root, 'data/ledger/participation.jsonl')),
    active_claims_sha256: digest(readJson(root, 'build/axm-identity.json').claims),
    hop_edges_sha256: digest(readJson(root, 'build/hop-graph.json').edges),
    rejected_hop_surfaces_sha256: digest(readJson(root, 'build/hop-graph.json').rejected_hop_surfaces),
    rejected_hop_pairs_sha256: digest(readJson(root, 'build/hop-graph.json').rejected_hop_pairs)
  };
}

function requiredBasinPaths(policy) {
  const resultPaths = policy.queues
    .slice()
    .sort((a, b) => a.queue_sequence - b.queue_sequence)
    .map(queue => resultPathFor(queue.queue_ref, policy));
  return {
    'allocator-war-source': [
      'data/project/lake-allocator-war-public-interest-implementation-wave-28-policy.json',
      policy.paths.method,
      policy.paths.milestone,
      ...resultPaths
    ],
    'allocator-war-lake-actions': [policy.paths.projection],
    'allocator-war-reports': [policy.paths.report]
  };
}

export function validateArtifacts(state) {
  const {
    policy,
    sourceProjection,
    sourceRows,
    estateRows,
    projection,
    resultRowsByPath,
    rawInputs,
    wave21Policy,
    graphDigestView
  } = state;
  const errors = [];
  const expected = policy.expected_counts;
  const contract = policy.source_contract;

  if (policy.schema_version !== 'lake-allocator-war-public-interest-implementation-wave-28-policy@1') fail(errors, 'Wave 28 policy schema drift');
  if (sourceProjection.schema_version !== 'lake-allocator-war-public-interest-downstream-wave-27@1') fail(errors, 'Wave 28 source is not Wave 27');
  if (projection.schema_version !== 'lake-allocator-war-public-interest-implementation-wave-28@1') fail(errors, 'Wave 28 projection schema drift');
  if (projection.program_ref !== policy.program_ref || projection.wave_ref !== policy.wave_ref) fail(errors, 'Wave 28 program or wave drift');
  if (!same(projection.boundaries, policy.boundaries)) fail(errors, 'Wave 28 projected boundaries drift');
  if (policy.execution_law.queue_admission_is_estate_adoption !== false || policy.execution_law.queue_admission_is_evidence !== false) fail(errors, 'Wave 28 queue authority inflation');
  if (policy.execution_law.task_may_close_source_partial !== false) fail(errors, 'Wave 28 synthetic source closure enabled');
  for (const key of [
    'implementation_task_is_evidence_row',
    'queue_admission_is_estate_adoption',
    'queue_admission_closes_source_partial',
    'formal_scope_is_complete_affected_roster',
    'formal_authority_is_observed_use',
    'bounded_control_is_systemwide_remedy_adequacy',
    'shared_source_is_relationship',
    'source_recurrence_is_prevalence',
    'unreviewed_route_may_promote_finding',
    'identity_created',
    'relationship_created',
    'participation_created',
    'active_claim_created',
    'hop_created',
    'evidence_adjudicated',
    'finding_promoted',
    'publication_cleared'
  ]) if (policy.boundaries[key] !== false) fail(errors, key + ': Wave 28 authority inflation');
  if (policy.boundaries.graph_effect !== 'none') fail(errors, 'Wave 28 graph boundary drift');

  const sourceResultRows = sourceRows.filter(row => row.row_type === 'downstream_execution_result');
  const requiredSourceRows = sourceResultRows.filter(row => contract.required_partial_closure_refs.includes(row.closure_ref));
  if (!same(requiredSourceRows.map(row => row.closure_ref).sort(), [...contract.required_partial_closure_refs].sort())) fail(errors, 'Wave 28 source partial set drift');
  if (requiredSourceRows.length !== expected.source_partial_results) fail(errors, 'Wave 28 source partial count drift');
  for (const row of requiredSourceRows) {
    if (row.result_state !== contract.required_result_state) fail(errors, row.closure_ref + ': Wave 28 source result is not partial');
    if (row.complete_denominator !== contract.required_complete_denominator) fail(errors, row.closure_ref + ': Wave 28 source denominator state drift');
    if (!same(row.source_refs, contract.required_institutional_source_refs)) fail(errors, row.closure_ref + ': Wave 28 inherited institutional source set drift');
    if (row.evidence_adjudicated !== false || row.evidence_rows !== 0 || row.finding_promoted !== false || row.graph_effect !== 'none' || row.publication_status !== 'blocked') {
      fail(errors, row.closure_ref + ': Wave 28 source authority inflation');
    }
  }

  const estateByConsumer = new Map(estateRows.map(row => [row.consumer_key, row]));
  if (!unique(policy.queues.map(row => row.queue_ref))) fail(errors, 'duplicate Wave 28 queue reference');
  if (!unique(policy.queues.map(row => row.consumer_key))) fail(errors, 'duplicate Wave 28 estate consumer');
  if (policy.queues.length !== expected.consumer_queues) fail(errors, 'Wave 28 policy queue count drift');
  const policyTasks = policy.queues.flatMap(queue => queue.tasks.map(task => ({ ...task, queue_ref: queue.queue_ref, consumer_key: queue.consumer_key })));
  if (!unique(policyTasks.map(row => row.task_ref))) fail(errors, 'duplicate Wave 28 task reference');
  if (policyTasks.length !== expected.closure_tasks) fail(errors, 'Wave 28 policy task count drift');
  for (const queue of policy.queues) {
    if (!estateByConsumer.has(queue.consumer_key)) fail(errors, queue.queue_ref + ': unknown estate consumer');
    if (queue.source_route_authority !== contract.source_authority) fail(errors, queue.queue_ref + ': Wave 28 route authority drift');
    if (!unique(queue.tasks.map(row => row.task_sequence))) fail(errors, queue.queue_ref + ': duplicate task sequence');
    for (const task of queue.tasks) {
      if (!task.closure_target || !Array.isArray(task.required_receipts) || task.required_receipts.length === 0) fail(errors, task.task_ref + ': incomplete Wave 28 task contract');
      if (!task.source_closure_refs.length || task.source_closure_refs.some(ref => !contract.required_partial_closure_refs.includes(ref))) fail(errors, task.task_ref + ': invalid Wave 28 source partial reference');
    }
  }
  if (!same(countBy(policyTasks, 'priority_tier'), expected.priority_tiers)) fail(errors, 'Wave 28 policy priority denominator drift');
  if (!same(countBy(policyTasks, 'task_class'), expected.task_classes)) fail(errors, 'Wave 28 policy task-class denominator drift');

  let expectedBuild = null;
  try {
    expectedBuild = buildImplementationQueues(policy, sourceProjection, sourceRows, estateRows, rawInputs);
  } catch (error) {
    fail(errors, 'Wave 28 deterministic build failed: ' + error.message);
  }
  if (expectedBuild) {
    if (!same(projection, expectedBuild.projection)) fail(errors, 'Wave 28 projection differs from deterministic build');
    for (const [relative, expectedRows] of Object.entries(expectedBuild.resultRowsByPath)) {
      if (!same(resultRowsByPath[relative], expectedRows)) fail(errors, relative + ': Wave 28 result ledger differs from deterministic build');
    }
    if (Object.keys(resultRowsByPath).length !== Object.keys(expectedBuild.resultRowsByPath).length) fail(errors, 'Wave 28 result-ledger path denominator drift');
  }

  const projectedByQueue = new Map(projection.queues.map(row => [row.queue_ref, row]));
  if (!unique(projection.queues.map(row => row.queue_ref))) fail(errors, 'duplicate projected Wave 28 queue');
  const allRows = [];
  const summaries = [];
  const tasks = [];
  for (const queue of policy.queues) {
    const relative = resultPathFor(queue.queue_ref, policy);
    const rows = resultRowsByPath[relative];
    if (!rows) {
      fail(errors, relative + ': Wave 28 ledger absent');
      continue;
    }
    const summary = rows.find(row => row.row_type === 'implementation_closure_queue');
    const taskRows = rows.filter(row => row.row_type === 'implementation_closure_task').sort((a, b) => a.task_sequence - b.task_sequence);
    if (!summary) fail(errors, queue.queue_ref + ': Wave 28 queue summary absent');
    summaries.push(summary);
    tasks.push(...taskRows);
    allRows.push(...rows);
    const projected = projectedByQueue.get(queue.queue_ref);
    if (!projected) {
      fail(errors, queue.queue_ref + ': projected Wave 28 queue absent');
      continue;
    }
    const raw = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
    if (projected.result_path !== relative || projected.result_rows !== rows.length || projected.result_sha256 !== digestBytes(raw)) fail(errors, queue.queue_ref + ': Wave 28 ledger custody drift');
    if (taskRows.length !== queue.tasks.length) fail(errors, queue.queue_ref + ': Wave 28 task row denominator drift');
    if (!same(taskRows.map(row => row.task_ref), queue.tasks.slice().sort((a, b) => a.task_sequence - b.task_sequence).map(row => row.task_ref))) fail(errors, queue.queue_ref + ': Wave 28 task ordering drift');
    for (const row of taskRows) {
      if (row.execution_state !== policy.execution_law.task_state) fail(errors, row.task_ref + ': Wave 28 task not ready');
      if (row.task_authority !== contract.source_authority || row.source_route_authority !== contract.source_authority) fail(errors, row.task_ref + ': Wave 28 task authority drift');
      if (!same(row.inherited_source_refs, contract.required_institutional_source_refs)) fail(errors, row.task_ref + ': Wave 28 inherited source custody drift');
      if (row.complete_denominator !== false || row.evidence_adjudicated !== false || row.evidence_rows !== 0 || row.estate_adopted !== false) fail(errors, row.task_ref + ': Wave 28 denominator, evidence, or adoption inflation');
      if (!same(row.blocked_promotions, policy.blocked_promotions)) fail(errors, row.task_ref + ': Wave 28 blocked promotions drift');
      if (row.finding_promoted !== false || row.graph_effect !== 'none' || row.publication_status !== 'blocked') fail(errors, row.task_ref + ': Wave 28 authority boundary drift');
    }
  }

  const scalarChecks = {
    source_partial_results: requiredSourceRows.length,
    consumer_queues: projection.queues.length,
    closure_tasks: tasks.length,
    queue_summary_rows: summaries.length,
    closure_task_rows: tasks.length,
    execution_rows: allRows.length,
    ready_tasks: tasks.filter(row => row.execution_state === policy.execution_law.task_state).length,
    complete_denominators: 0,
    evidence_rows: 0,
    finding_promotions: 0,
    graph_effects: 0,
    publication_clearances: 0
  };
  for (const [key, value] of Object.entries(scalarChecks)) if (projection.counts[key] !== value || expected[key] !== value) fail(errors, key + ': Wave 28 count drift');
  if (!same(projection.counts.priority_tiers, expected.priority_tiers) || !same(countBy(tasks, 'priority_tier'), expected.priority_tiers)) fail(errors, 'Wave 28 projected priority denominator drift');
  if (!same(projection.counts.task_classes, expected.task_classes) || !same(countBy(tasks, 'task_class'), expected.task_classes)) fail(errors, 'Wave 28 projected task-class denominator drift');
  if (!same(projection.graph_digests, graphDigestView)) fail(errors, 'Wave 28 changed participation, claims, hop edges, or rejected-hop controls');

  const requiredPaths = requiredBasinPaths(policy);
  for (const [basinId, paths] of Object.entries(requiredPaths)) {
    const basin = wave21Policy.basin_contract.find(row => row.basin_id === basinId);
    if (!basin) {
      fail(errors, basinId + ': Wave 21 basin absent');
      continue;
    }
    for (const relative of paths) {
      if (!basin.path_prefixes.includes(relative)) fail(errors, relative + ': Wave 28 path absent from ' + basinId);
      if (!basin.authoritative_entrypoints.includes(relative)) fail(errors, relative + ': Wave 28 authoritative entrypoint absent from ' + basinId);
    }
  }
  for (const relative of [policy.paths.projection, ...Object.keys(resultRowsByPath)]) {
    if (!wave21Policy.projection_contract.allowed_generated_paths.includes(relative)) fail(errors, relative + ': Wave 28 generated path absent from contract');
  }
  if (wave21Policy.boundaries.wave_28_implementation_task_is_evidence_row !== false) fail(errors, 'Wave 28 evidence boundary absent from Wave 21 policy');
  if (wave21Policy.boundaries.wave_28_queue_admission_is_estate_adoption !== false) fail(errors, 'Wave 28 estate-adoption boundary absent from Wave 21 policy');

  return errors;
}

export function validateRepository(root = defaultRoot) {
  const policyPath = 'data/project/lake-allocator-war-public-interest-implementation-wave-28-policy.json';
  const policyRaw = fs.readFileSync(full(root, policyPath), 'utf8');
  const policy = JSON.parse(policyRaw);
  const sourceProjectionRaw = fs.readFileSync(full(root, policy.paths.source_projection), 'utf8');
  const sourceLedgerRaw = fs.readFileSync(full(root, policy.paths.source_public_ledger), 'utf8');
  const estateRegistryRaw = fs.readFileSync(full(root, policy.paths.estate_registry), 'utf8');
  const sourceProjection = JSON.parse(sourceProjectionRaw);
  const sourceRows = sourceLedgerRaw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const estateRows = estateRegistryRaw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const projection = readJson(root, policy.paths.projection);
  const resultRowsByPath = Object.fromEntries(policy.queues.map(queue => {
    const relative = resultPathFor(queue.queue_ref, policy);
    return [relative, readJsonl(root, relative)];
  }));
  const wave21Policy = readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json');
  const errors = validateArtifacts({
    policy,
    sourceProjection,
    sourceRows,
    estateRows,
    projection,
    resultRowsByPath,
    rawInputs: {
      policy: policyRaw,
      sourceProjection: sourceProjectionRaw,
      sourceLedger: sourceLedgerRaw,
      estateRegistry: estateRegistryRaw
    },
    wave21Policy,
    graphDigestView: graphDigests(root)
  });

  if (process.env.LAW28_SKIP_GIT !== '1') {
    const checkpoint = policy.base_checkpoint.commit;
    const quietGit = args => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    const hasCommit = commitish => {
      try { quietGit(['cat-file', '-e', commitish + '^{commit}']); return true; } catch { return false; }
    };
    const isAncestor = (ancestor, target) => {
      try { quietGit(['merge-base', '--is-ancestor', ancestor, target]); return true; } catch { return false; }
    };
    const githubHeadRef = String(process.env.GITHUB_HEAD_REF ?? '').trim();
    const remoteHeadRef = githubHeadRef ? 'refs/remotes/origin/' + githubHeadRef : null;
    let ancestryTarget = 'HEAD';
    let checkpointAvailable = hasCommit(checkpoint);
    let ancestrySatisfied = checkpointAvailable && isAncestor(checkpoint, ancestryTarget);
    if (!ancestrySatisfied && process.env.GITHUB_ACTIONS === 'true' && remoteHeadRef) {
      try {
        quietGit(['fetch', '--no-tags', '--depth=1000000', 'origin', '+refs/heads/' + githubHeadRef + ':' + remoteHeadRef]);
      } catch {
        // The unchanged ancestry predicate is evaluated again below.
      }
      if (hasCommit(remoteHeadRef)) ancestryTarget = remoteHeadRef;
      checkpointAvailable = hasCommit(checkpoint);
      ancestrySatisfied = checkpointAvailable && isAncestor(checkpoint, ancestryTarget);
    }
    if (!checkpointAvailable) fail(errors, 'Wave 28 base checkpoint unavailable after targeted history recovery');
    else if (!ancestrySatisfied) fail(errors, 'Wave 28 base checkpoint is not an ancestor');
  }

  for (const relative of [policy.paths.report, policy.paths.method, policy.paths.milestone]) {
    if (!fs.existsSync(full(root, relative))) fail(errors, relative + ': required Wave 28 artifact absent');
  }
  if (fs.existsSync(full(root, policy.paths.report))) {
    const report = fs.readFileSync(full(root, policy.paths.report), 'utf8');
    if (!report.includes('closure tasks:                      ' + policy.expected_counts.closure_tasks)) fail(errors, 'Wave 28 report task count drift');
    if (!report.includes('complete denominators:              0')) fail(errors, 'Wave 28 report denominator boundary drift');
    if (!report.includes('graph effects:                      0')) fail(errors, 'Wave 28 report graph boundary drift');
  }

  const lakePolicy = readJson(root, 'data/project/lake-index-policy.json');
  const requiredRoots = Object.values(requiredBasinPaths(policy)).flat();
  for (const relative of requiredRoots) if (!lakePolicy.authoritative_roots.includes(relative)) fail(errors, relative + ': missing Wave 28 authoritative root');

  const basinRegistry = readJson(root, 'data/project/lake-basin-registry.json');
  const registryByRef = new Map(basinRegistry.basins.map(row => [row.basin_id, row]));
  for (const basin of wave21Policy.basin_contract) {
    if (['allocator-war-source', 'allocator-war-lake-actions', 'allocator-war-reports'].includes(basin.basin_id) && !same(registryByRef.get(basin.basin_id), basin)) {
      fail(errors, basin.basin_id + ': installed Wave 28 basin contract drift');
    }
  }

  const pkg = readJson(root, 'package.json');
  if (!pkg.scripts['build:lake-allocator-war-public-interest-implementation-wave-28']) fail(errors, 'Wave 28 builder script absent');
  if (!pkg.scripts['validate:lake-allocator-war-public-interest-implementation-wave-28']) fail(errors, 'Wave 28 validator script absent');
  if (!pkg.scripts.check.includes('validate:lake-allocator-war-public-interest-implementation-wave-28')) fail(errors, 'Wave 28 absent from complete release gate');

  for (const temporary of [
    '.github/tmp/wave28-public-interest-implementation-trigger.json',
    '.github/workflows/temporary-wave28-public-interest-implementation-materializer.yml',
    'tools/run-wave28-public-interest-implementation-materializer.sh'
  ]) if (fs.existsSync(full(root, temporary))) fail(errors, temporary + ': temporary Wave 28 transport retained');

  if (process.env.LAW28_SKIP_SHARDS !== '1') {
    const membershipPath = 'build/lake-index/basin-membership.jsonl';
    if (fs.existsSync(full(root, membershipPath))) {
      const membership = readJsonl(root, membershipPath);
      const byPath = new Map(membership.map(row => [row.path, row]));
      const required = requiredBasinPaths(policy);
      for (const relative of required['allocator-war-source']) if (byPath.get(relative)?.basin_id !== 'allocator-war-source') fail(errors, relative + ': wrong Wave 28 source basin');
      for (const relative of required['allocator-war-lake-actions']) if (byPath.get(relative)?.basin_id !== 'allocator-war-lake-actions') fail(errors, relative + ': wrong Wave 28 action basin');
      for (const relative of required['allocator-war-reports']) if (byPath.get(relative)?.basin_id !== 'allocator-war-reports') fail(errors, relative + ': wrong Wave 28 report basin');
    }
  }

  if (errors.length) throw new Error('allocator-war public-interest implementation Wave 28 validation failed:\n- ' + errors.join('\n- '));
  return {
    partials: projection.counts.source_partial_results,
    queues: projection.counts.consumer_queues,
    tasks: projection.counts.closure_tasks,
    priorities: projection.counts.priority_tiers
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = validateRepository(defaultRoot);
  console.log('allocator-war public-interest implementation Wave 28 validation passed');
  console.log('  partials / queues / tasks: ' + result.partials + ' / ' + result.queues + ' / ' + result.tasks);
  console.log('  priorities: ' + JSON.stringify(result.priorities));
  console.log('  evidence / findings / graph / publication: 0 / 0 / 0 / 0');
}
