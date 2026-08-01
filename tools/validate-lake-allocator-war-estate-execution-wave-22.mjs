#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { priorityFor } from './build-lake-allocator-war-estate-execution-wave-22.mjs';

const defaultRoot = process.cwd();
const full = (root, relative) => path.join(root, relative);
const readJson = (root, relative) => JSON.parse(fs.readFileSync(full(root, relative), 'utf8'));
const readJsonl = (root, relative) => fs.readFileSync(full(root, relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const digestBytes = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
};
const digest = value => digestBytes(JSON.stringify(stable(value)));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const unique = values => new Set(values).size === values.length;
function fail(errors, message) { errors.push(message); }
function countBy(rows, key) {
  return Object.fromEntries(
    [...new Set(rows.map(row => row[key]))].sort().map(value => [value, rows.filter(row => row[key] === value).length])
  );
}
function graphDigests(root) {
  return {
    participation_sha256: digest(readJsonl(root, 'data/ledger/participation.jsonl')),
    active_claims_sha256: digest(readJson(root, 'build/axm-identity.json').claims),
    hop_edges_sha256: digest(readJson(root, 'build/hop-graph.json').edges),
    rejected_hop_surfaces_sha256: digest(readJson(root, 'build/hop-graph.json').rejected_hop_surfaces),
    rejected_hop_pairs_sha256: digest(readJson(root, 'build/hop-graph.json').rejected_hop_pairs)
  };
}
function walk(value, visit, pointer = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visit, pointer + '[' + index + ']'));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    visit(key, item, pointer + '.' + key);
    walk(item, visit, pointer + '.' + key);
  }
}
function requiredWave21BasinPaths(policy) {
  return {
    'allocator-war-source': [
      'data/project/lake-allocator-war-estate-execution-wave-22-policy.json',
      policy.paths.method,
      policy.paths.milestone
    ],
    'allocator-war-lake-actions': [policy.paths.projection],
    'allocator-war-reports': [policy.paths.report]
  };
}
function authorityCounts(sourceRows, policy) {
  const queues = sourceRows.map(row => ({
    queue_class: policy.authority_law[row.route_authority]?.queue_class ?? 'unknown'
  }));
  return countBy(queues, 'queue_class');
}

export function validateArtifacts(state) {
  const { policy, sourceRows, sourceRaw, projection, wave21Policy } = state;
  const errors = [];
  const expected = policy.expected_counts;

  if (policy.schema_version !== 'lake-allocator-war-estate-execution-wave-22-policy@1') fail(errors, 'policy schema drift');
  if (projection.schema_version !== 'lake-allocator-war-estate-execution-wave-22@1') fail(errors, 'projection schema drift');
  if (projection.program_ref !== policy.program_ref || projection.wave_ref !== policy.wave_ref) fail(errors, 'program or wave reference drift');
  if (policy.boundaries.graph_effect !== 'none' || projection.boundaries?.graph_effect !== 'none') fail(errors, 'graph boundary drift');
  if (policy.boundaries.publication_cleared !== false) fail(errors, 'publication boundary drift');
  if (sourceRows.length !== expected.estate_queues) fail(errors, 'source estate queue denominator drift');
  if (!unique(sourceRows.map(row => row.allocator_estate_feed_id))) fail(errors, 'duplicate source estate feed');
  if (sourceRows.reduce((sum, row) => sum + row.next_acquisition.length, 0) !== expected.acquisition_tasks) fail(errors, 'source acquisition task denominator drift');

  const recognizedAuthorities = new Set(Object.keys(policy.authority_law));
  if (sourceRows.some(row => !recognizedAuthorities.has(row.route_authority))) fail(errors, 'unknown source route authority');
  if (sourceRows.some(row => row.controls_and_refusals_required !== true || row.finding_promoted !== false || row.graph_effect !== 'none')) {
    fail(errors, 'source route boundary drift');
  }
  for (const row of sourceRows.filter(row => row.route_authority === 'unreviewed_wave_02_acquisition_only')) {
    if (row.reviewed_source_finding_refs.length || row.reviewed_source_observation_refs.length) fail(errors, row.allocator_estate_feed_id + ': unreviewed route carries reviewed authority');
    if (!row.unreviewed_intake_observation_refs.length) fail(errors, row.allocator_estate_feed_id + ': unreviewed route lacks intake source');
  }

  if (projection.generated_from?.source_registry_path !== policy.paths.source_estate_registry) fail(errors, 'source registry path drift');
  if (projection.generated_from?.source_registry_bytes !== Buffer.byteLength(sourceRaw)) fail(errors, 'source registry byte count drift');
  if (projection.generated_from?.source_registry_sha256 !== digestBytes(sourceRaw)) fail(errors, 'source registry sha256 drift');
  if (projection.queues.length !== expected.estate_queues) fail(errors, 'projection queue count drift');
  if (!unique(projection.queues.map(row => row.allocator_estate_feed_id))) fail(errors, 'duplicate projected estate feed');

  const sourceByFeed = new Map(sourceRows.map(row => [row.allocator_estate_feed_id, row]));
  const taskRefs = [];
  const projectedTasks = [];
  for (const queue of projection.queues) {
    const source = sourceByFeed.get(queue.allocator_estate_feed_id);
    if (!source) {
      fail(errors, queue.allocator_estate_feed_id + ': projected queue has no source');
      continue;
    }
    const authority = policy.authority_law[source.route_authority];
    if (!authority) {
      fail(errors, queue.allocator_estate_feed_id + ': unknown queue authority');
      continue;
    }
    if (queue.consumer_key !== source.consumer_key) fail(errors, queue.allocator_estate_feed_id + ': consumer drift');
    if (queue.source_route_authority !== source.route_authority) fail(errors, queue.allocator_estate_feed_id + ': source authority drift');
    if (queue.queue_class !== authority.queue_class || queue.task_authority !== authority.task_authority) fail(errors, queue.allocator_estate_feed_id + ': queue authority classification drift');
    if (queue.consumer_question !== source.consumer_question) fail(errors, queue.allocator_estate_feed_id + ': consumer question drift');
    for (const key of ['reviewed_source_finding_refs', 'reviewed_source_observation_refs', 'unreviewed_intake_observation_refs', 'supplies']) {
      if (!same(queue[key], source[key])) fail(errors, queue.allocator_estate_feed_id + ': ' + key + ' drift');
    }
    if (queue.controls_and_refusals_required !== true || queue.finding_promoted !== false || queue.graph_effect !== 'none' || queue.publication_status !== 'blocked') {
      fail(errors, queue.allocator_estate_feed_id + ': queue boundary drift');
    }
    if (queue.task_count !== source.next_acquisition.length || queue.tasks.length !== source.next_acquisition.length) fail(errors, queue.allocator_estate_feed_id + ': task count drift');

    queue.tasks.forEach((task, index) => {
      projectedTasks.push(task);
      taskRefs.push(task.task_ref);
      const expectedRef = queue.allocator_estate_feed_id + '/T' + String(index + 1).padStart(2, '0');
      const expectedTarget = source.next_acquisition[index];
      const priority = priorityFor(expectedTarget, policy);
      if (task.task_ref !== expectedRef) fail(errors, expectedRef + ': task reference drift');
      if (task.sequence !== index + 1) fail(errors, expectedRef + ': task sequence drift');
      if (task.acquisition_target !== expectedTarget) fail(errors, expectedRef + ': acquisition target drift');
      if (task.priority_tier !== priority) fail(errors, expectedRef + ': priority drift');
      if (task.task_authority !== authority.task_authority) fail(errors, expectedRef + ': task authority drift');
      if (task.required_output !== policy.priority_law.outputs[priority] + ' Target: ' + expectedTarget) fail(errors, expectedRef + ': required output drift');
      if (task.closure_test !== policy.priority_law.closure_tests[priority]) fail(errors, expectedRef + ': closure test drift');
      if (!same(task.allowed_results, policy.task_contract.allowed_results)) fail(errors, expectedRef + ': allowed results drift');
      if (!same(task.blocked_promotions, policy.task_contract.blocked_promotions)) fail(errors, expectedRef + ': blocked promotions drift');
      if (task.controls_and_refusals_required !== true || task.finding_promoted !== false || task.graph_effect !== 'none' || task.publication_status !== 'blocked') {
        fail(errors, expectedRef + ': task boundary drift');
      }
    });
  }
  if (!unique(taskRefs)) fail(errors, 'duplicate task reference');
  if (projectedTasks.length !== expected.acquisition_tasks) fail(errors, 'projected task denominator drift');

  const expectedAuthorityCounts = authorityCounts(sourceRows, policy);
  if (!same(projection.counts.authority_classes, expectedAuthorityCounts)) fail(errors, 'authority class count drift');
  if (!same(projection.counts.priority_tiers, countBy(projectedTasks, 'priority_tier'))) fail(errors, 'priority tier count drift');
  if (projection.counts.estate_queues !== expected.estate_queues || projection.counts.acquisition_tasks !== expected.acquisition_tasks) fail(errors, 'projection denominator count drift');
  for (const key of ['reviewed_only_queues', 'split_authority_queues', 'unreviewed_only_queues', 'finding_promotions', 'graph_effects', 'publication_clearances']) {
    if (projection.counts[key] !== expected[key]) fail(errors, key + ' count drift');
  }

  walk(projection, (key, _value, pointer) => {
    if (/_id$/i.test(key) && key !== 'allocator_estate_feed_id') fail(errors, pointer + ': unauthorized new machine identifier key');
  });

  const requiredBasins = requiredWave21BasinPaths(policy);
  for (const [basinRef, paths] of Object.entries(requiredBasins)) {
    const basin = wave21Policy.basin_contract.find(row => row.basin_id === basinRef);
    if (!basin) {
      fail(errors, basinRef + ': Wave 21 basin absent');
      continue;
    }
    for (const relative of paths) {
      if (!basin.path_prefixes.includes(relative)) fail(errors, relative + ': Wave 22 path absent from ' + basinRef);
      if (!basin.authoritative_entrypoints.includes(relative)) fail(errors, relative + ': Wave 22 authoritative entrypoint absent from ' + basinRef);
    }
  }
  if (!wave21Policy.projection_contract.allowed_generated_paths.includes(policy.paths.projection)) fail(errors, 'Wave 22 projection absent from Wave 21 generated-path contract');
  if (wave21Policy.boundaries.wave_21_basin_paths_are_exact !== true) fail(errors, 'Wave 21 exact basin boundary drift');

  return errors;
}

export function validateRepository(root = defaultRoot) {
  const policyPath = 'data/project/lake-allocator-war-estate-execution-wave-22-policy.json';
  const policy = readJson(root, policyPath);
  const sourceRaw = fs.readFileSync(full(root, policy.paths.source_estate_registry), 'utf8');
  const sourceRows = sourceRaw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const projection = readJson(root, policy.paths.projection);
  const wave21Policy = readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json');
  const errors = validateArtifacts({ policy, sourceRows, sourceRaw, projection, wave21Policy });

  if (process.env.LAW22_SKIP_GIT !== '1') {
    const baseCommit = policy.base_checkpoint.commit;
    const quietGit = args => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    const hasCommit = commitish => {
      try {
        quietGit(['cat-file', '-e', commitish + '^{commit}']);
        return true;
      } catch {
        return false;
      }
    };
    const isAncestor = (ancestor, target) => {
      try {
        quietGit(['merge-base', '--is-ancestor', ancestor, target]);
        return true;
      } catch {
        return false;
      }
    };

    const githubHeadRef = String(process.env.GITHUB_HEAD_REF ?? '').trim();
    const remoteHeadRef = githubHeadRef ? 'refs/remotes/origin/' + githubHeadRef : null;
    let ancestryTarget = 'HEAD';
    let baseAvailable = hasCommit(baseCommit);
    let ancestrySatisfied = baseAvailable && isAncestor(baseCommit, ancestryTarget);

    if (!ancestrySatisfied && process.env.GITHUB_ACTIONS === 'true' && remoteHeadRef) {
      try {
        quietGit([
          'fetch',
          '--no-tags',
          '--depth=1000000',
          'origin',
          '+refs/heads/' + githubHeadRef + ':' + remoteHeadRef
        ]);
      } catch {
        // The availability and ancestry checks below record bounded recovery failure.
      }
      if (hasCommit(remoteHeadRef)) ancestryTarget = remoteHeadRef;
      baseAvailable = hasCommit(baseCommit);
      ancestrySatisfied = baseAvailable && isAncestor(baseCommit, ancestryTarget);
    }

    if (!baseAvailable) {
      fail(errors, 'Wave 22 base checkpoint unavailable after targeted deep-history recovery');
    } else if (!ancestrySatisfied) {
      fail(errors, 'Wave 22 base checkpoint is not an ancestor');
    }
  }

  for (const relative of [policy.paths.report, policy.paths.method, policy.paths.milestone]) {
    if (!fs.existsSync(full(root, relative))) fail(errors, relative + ': required Wave 22 artifact absent');
  }
  if (fs.existsSync(full(root, policy.paths.report))) {
    const report = fs.readFileSync(full(root, policy.paths.report), 'utf8');
    if (!report.includes('acquisition tasks:          ' + policy.expected_counts.acquisition_tasks)) fail(errors, 'Wave 22 report task count drift');
    if (!report.includes('graph effects:              0')) fail(errors, 'Wave 22 report graph boundary drift');
  }

  if (!same(projection.graph_digests, graphDigests(root))) fail(errors, 'Wave 22 changed participation, active claims, hop edges, or rejected-hop controls');

  const requiredRoots = [
    policyPath,
    policy.paths.projection,
    policy.paths.report,
    policy.paths.method,
    policy.paths.milestone
  ];
  const lakePolicy = readJson(root, 'data/project/lake-index-policy.json');
  for (const relative of requiredRoots) if (!lakePolicy.authoritative_roots.includes(relative)) fail(errors, relative + ': missing authoritative root');

  const basinRegistry = readJson(root, 'data/project/lake-basin-registry.json');
  const registryByRef = new Map(basinRegistry.basins.map(row => [row.basin_id, row]));
  for (const basin of wave21Policy.basin_contract) {
    if (['allocator-war-source', 'allocator-war-lake-actions', 'allocator-war-reports'].includes(basin.basin_id) && !same(registryByRef.get(basin.basin_id), basin)) {
      fail(errors, basin.basin_id + ': installed basin contract drift');
    }
  }

  const pkg = readJson(root, 'package.json');
  if (!pkg.scripts['build:lake-allocator-war-estate-execution-wave-22']) fail(errors, 'Wave 22 builder script absent');
  if (!pkg.scripts['validate:lake-allocator-war-estate-execution-wave-22']) fail(errors, 'Wave 22 validator script absent');
  if (!pkg.scripts.check.includes('validate:lake-allocator-war-estate-execution-wave-22')) fail(errors, 'Wave 22 absent from complete release gate');

  const installerText = fs.readFileSync(full(root, 'tools/install-lake-allocator-war-wave-21.mjs'), 'utf8');
  const wave21ValidatorText = fs.readFileSync(full(root, 'tools/validate-lake-allocator-war-wave-21.mjs'), 'utf8');
  for (const relative of requiredRoots) {
    if (!installerText.includes(relative)) fail(errors, relative + ': Wave 21 installer does not preserve Wave 22 root');
    if (!wave21ValidatorText.includes(relative)) fail(errors, relative + ': Wave 21 validator does not preserve Wave 22 root');
  }

  if (process.env.LAW22_SKIP_SHARDS !== '1') {
    const membershipPath = 'build/lake-index/basin-membership.jsonl';
    const objectIndexPath = 'build/lake-object-index.json';
    const summaryPath = 'build/lake-index/summary.json';
    const gapsPath = 'build/lake-index/gap-summary.json';
    if (fs.existsSync(full(root, membershipPath))) {
      const membership = readJsonl(root, membershipPath);
      const byPath = new Map(membership.map(row => [row.path, row]));
      for (const relative of [policyPath, policy.paths.method, policy.paths.milestone]) {
        if (byPath.get(relative)?.basin_id !== 'allocator-war-source') fail(errors, relative + ': wrong Wave 22 source basin');
      }
      if (byPath.get(policy.paths.projection)?.basin_id !== 'allocator-war-lake-actions') fail(errors, 'Wave 22 projection wrong basin');
      if (byPath.get(policy.paths.report)?.basin_id !== 'allocator-war-reports') fail(errors, 'Wave 22 report wrong basin');
    }
    if (fs.existsSync(full(root, objectIndexPath))) {
      const objects = readJson(root, objectIndexPath).objects ?? [];
      const byCompound = new Map(objects.map(row => [row.id_key + ':' + row.id_value, row]));
      for (const row of sourceRows) {
        const object = byCompound.get('allocator_estate_feed_id:' + row.allocator_estate_feed_id);
        if (!object) {
          fail(errors, row.allocator_estate_feed_id + ': lake object absent');
          continue;
        }
        if (!(object.occurrences ?? []).some(item => item.path === policy.paths.projection && item.generated === true)) fail(errors, row.allocator_estate_feed_id + ': Wave 22 projection occurrence absent');
        if (object.divergent_projections_unadjudicated) fail(errors, row.allocator_estate_feed_id + ': Wave 22 typed projection remains unadjudicated');
      }
    }
    if (fs.existsSync(full(root, summaryPath))) {
      const summary = readJson(root, summaryPath);
      for (const key of ['unindexed_machine_ids_unadjudicated', 'source_ids_without_projection_unadjudicated', 'divergent_identifier_projections_unadjudicated']) {
        if (summary.counts?.[key] !== 0) fail(errors, key + ': global residual reopened');
      }
    }
    if (fs.existsSync(full(root, gapsPath))) {
      const gaps = readJson(root, gapsPath);
      for (const key of ['unindexed_machine_ids_unadjudicated', 'source_ids_without_projection_unadjudicated', 'divergent_identifier_projections_unadjudicated']) {
        if (gaps.counts?.[key] !== 0) fail(errors, key + ': sharded residual reopened');
      }
    }
  }

  for (const temporary of [
    '.github/tmp/lake-allocator-war-estate-execution-wave-22-trigger.json',
    '.github/workflows/temporary-lake-allocator-war-estate-execution-wave-22-materializer.yml',
    'tools/materialize-lake-allocator-war-estate-execution-wave-22.mjs'
  ]) if (fs.existsSync(full(root, temporary))) fail(errors, temporary + ': temporary transport retained');

  if (errors.length) throw new Error('allocator-war estate execution Wave 22 validation failed:\n- ' + errors.join('\n- '));
  return {
    queues: projection.counts.estate_queues,
    tasks: projection.counts.acquisition_tasks,
    priorities: projection.counts.priority_tiers,
    authority: projection.counts.authority_classes
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = validateRepository(defaultRoot);
  console.log('allocator-war estate execution Wave 22 validation passed');
  console.log('  estate queues / acquisition tasks: ' + result.queues + ' / ' + result.tasks);
  console.log('  authority classes: ' + JSON.stringify(result.authority));
  console.log('  priority tiers: ' + JSON.stringify(result.priorities));
  console.log('  graph/publication findings: 0/0');
}
