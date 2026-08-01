#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { selectLeadTask } from './build-lake-allocator-war-lead-acquisition-wave-23.mjs';

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
  [...new Set(rows.map(row => row[key]))].sort().map(value => [value, rows.filter(row => row[key] === value).length])
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

function requiredWave21BasinPaths(policy) {
  return {
    'allocator-war-source': [
      'data/project/lake-allocator-war-lead-acquisition-wave-23-policy.json',
      policy.paths.method,
      policy.paths.milestone
    ],
    'allocator-war-lake-actions': [policy.paths.projection],
    'allocator-war-reports': [policy.paths.report]
  };
}

export function validateArtifacts(state) {
  const { policy, sourceProjection, sourceRaw, projection, wave21Policy } = state;
  const errors = [];
  const expected = policy.expected_counts;

  if (policy.schema_version !== 'lake-allocator-war-lead-acquisition-wave-23-policy@1') fail(errors, 'Wave 23 policy schema drift');
  if (projection.schema_version !== 'lake-allocator-war-lead-acquisition-wave-23@1') fail(errors, 'Wave 23 projection schema drift');
  if (projection.program_ref !== policy.program_ref || projection.wave_ref !== policy.wave_ref) fail(errors, 'Wave 23 program or wave reference drift');
  if (sourceProjection.schema_version !== 'lake-allocator-war-estate-execution-wave-22@1') fail(errors, 'Wave 23 source is not the Wave 22 projection');
  if (!same(projection.boundaries, policy.boundaries)) fail(errors, 'Wave 23 boundary projection drift');
  if (policy.boundaries.graph_effect !== 'none' || policy.boundaries.publication_cleared !== false) fail(errors, 'Wave 23 graph or publication boundary drift');
  if (policy.selection_law.packets_per_queue !== 1 || policy.selection_law.tie_breaker !== 'lowest_source_task_sequence') fail(errors, 'Wave 23 selection law drift');
  if (policy.retrieval_contract.result_rows_created !== false) fail(errors, 'Wave 23 retrieval contract creates result rows');

  if (projection.generated_from?.source_projection_path !== policy.paths.source_projection) fail(errors, 'Wave 23 source projection path drift');
  if (projection.generated_from?.source_projection_bytes !== Buffer.byteLength(sourceRaw)) fail(errors, 'Wave 23 source projection byte count drift');
  if (projection.generated_from?.source_projection_sha256 !== digestBytes(sourceRaw)) fail(errors, 'Wave 23 source projection sha256 drift');

  const queues = sourceProjection.queues.slice().sort((a, b) => a.allocator_estate_feed_id.localeCompare(b.allocator_estate_feed_id));
  if (queues.length !== expected.estate_queues) fail(errors, 'Wave 23 source queue denominator drift');
  if (projection.packets.length !== expected.lead_packets) fail(errors, 'Wave 23 packet denominator drift');
  if (!unique(projection.packets.map(row => row.packet_ref))) fail(errors, 'duplicate Wave 23 packet reference');
  if (!unique(projection.packets.map(row => row.source_queue_ref))) fail(errors, 'duplicate Wave 23 source queue');

  const packetByQueue = new Map(projection.packets.map(row => [row.source_queue_ref, row]));
  for (const [index, queue] of queues.entries()) {
    const packet = packetByQueue.get(queue.allocator_estate_feed_id);
    if (!packet) {
      fail(errors, queue.allocator_estate_feed_id + ': lead packet absent');
      continue;
    }
    let selected;
    try {
      selected = selectLeadTask(queue, policy);
    } catch (error) {
      fail(errors, String(error.message ?? error));
      continue;
    }
    const expectedPacketRef = 'LAW23-' + queue.allocator_estate_feed_id;
    if (packet.packet_ref !== expectedPacketRef) fail(errors, expectedPacketRef + ': packet reference drift');
    if (packet.packet_sequence !== index + 1) fail(errors, expectedPacketRef + ': packet sequence drift');
    if (packet.source_task_ref !== selected.task_ref || packet.source_task_sequence !== selected.sequence) fail(errors, expectedPacketRef + ': selected source task drift');
    if (packet.consumer_key !== queue.consumer_key) fail(errors, expectedPacketRef + ': consumer drift');
    if (packet.queue_class !== queue.queue_class || packet.source_route_authority !== queue.source_route_authority) fail(errors, expectedPacketRef + ': queue authority drift');
    if (packet.task_authority !== selected.task_authority) fail(errors, expectedPacketRef + ': task authority drift');
    if (packet.selection_priority !== selected.priority_tier) fail(errors, expectedPacketRef + ': priority selection drift');
    if (packet.selection_rule !== 'highest_priority_then_lowest_source_task_sequence') fail(errors, expectedPacketRef + ': selection rule drift');
    for (const key of ['acquisition_target', 'required_output', 'closure_test']) {
      if (packet[key] !== selected[key]) fail(errors, expectedPacketRef + ': ' + key + ' drift');
    }
    if (!same(packet.allowed_results, selected.allowed_results)) fail(errors, expectedPacketRef + ': allowed result drift');
    for (const key of ['reviewed_source_finding_refs', 'reviewed_source_observation_refs', 'unreviewed_intake_observation_refs']) {
      if (!same(packet[key], queue[key])) fail(errors, expectedPacketRef + ': ' + key + ' drift');
    }
    if (!same(packet.source_families, policy.consumer_source_families[queue.consumer_key])) fail(errors, expectedPacketRef + ': source family drift');
    if (packet.query_seed !== queue.consumer_key + ' :: ' + selected.acquisition_target) fail(errors, expectedPacketRef + ': query seed drift');
    if (packet.result_ledger_path !== policy.paths.result_ledger_root + '/' + queue.allocator_estate_feed_id.toLowerCase() + '.jsonl') fail(errors, expectedPacketRef + ': result ledger path drift');
    if (packet.execution_state !== policy.retrieval_contract.execution_state) fail(errors, expectedPacketRef + ': execution state drift');
    if (packet.result_rows !== 0 || packet.evidence_adjudicated !== false) fail(errors, expectedPacketRef + ': unauthorized evidence result');
    if (packet.controls_and_refusals_required !== true || packet.finding_promoted !== false || packet.graph_effect !== 'none' || packet.publication_status !== 'blocked') fail(errors, expectedPacketRef + ': packet boundary drift');
    if (!same(packet.blocked_promotions, policy.blocked_promotions)) fail(errors, expectedPacketRef + ': blocked promotion drift');
    if (!same(packet.receipt_contract?.required_fields, policy.retrieval_contract.required_receipt_fields)) fail(errors, expectedPacketRef + ': receipt field contract drift');
    if (packet.receipt_contract?.exact_source_locator_required !== true || packet.receipt_contract?.source_bytes_or_stable_official_identifier_required !== true) fail(errors, expectedPacketRef + ': receipt custody drift');
    if (packet.search_protocol?.primary_source_required !== true || packet.search_protocol?.negative_search_required !== true || packet.search_protocol?.controls_nulls_refusals_and_failed_paths_required !== true || packet.search_protocol?.cross_estate_join_authorized !== false) fail(errors, expectedPacketRef + ': search protocol drift');
  }

  const selectedCounts = countBy(projection.packets, 'selection_priority');
  if (!same(projection.counts.selected_priorities, selectedCounts)) fail(errors, 'Wave 23 selected-priority count drift');
  if ((selectedCounts.P0 ?? 0) !== expected.selected_p0 || (selectedCounts.P1 ?? 0) !== expected.selected_p1 || (selectedCounts.P2 ?? 0) !== expected.selected_p2) fail(errors, 'Wave 23 expected priority denominator drift');
  if (!same(projection.counts.authority_classes, countBy(projection.packets, 'queue_class'))) fail(errors, 'Wave 23 authority class count drift');
  for (const key of ['estate_queues', 'lead_packets', 'reviewed_only_packets', 'split_authority_packets', 'unreviewed_only_packets', 'execution_ready_packets', 'evidence_rows', 'finding_promotions', 'graph_effects', 'publication_clearances']) {
    if (projection.counts[key] !== expected[key]) fail(errors, key + ': Wave 23 count drift');
  }

  const requiredBasins = requiredWave21BasinPaths(policy);
  for (const [basinRef, paths] of Object.entries(requiredBasins)) {
    const basin = wave21Policy.basin_contract.find(row => row.basin_id === basinRef);
    if (!basin) {
      fail(errors, basinRef + ': Wave 21 basin absent');
      continue;
    }
    for (const relative of paths) {
      if (!basin.path_prefixes.includes(relative)) fail(errors, relative + ': Wave 23 path absent from ' + basinRef);
      if (!basin.authoritative_entrypoints.includes(relative)) fail(errors, relative + ': Wave 23 authoritative entrypoint absent from ' + basinRef);
    }
  }
  if (!wave21Policy.projection_contract.allowed_generated_paths.includes(policy.paths.projection)) fail(errors, 'Wave 23 projection absent from Wave 21 generated-path contract');
  if (wave21Policy.boundaries.wave_23_lead_selection_is_evidence_acquisition !== false) fail(errors, 'Wave 23 selection boundary absent from Wave 21 policy');

  return errors;
}

export function validateRepository(root = defaultRoot) {
  const policyPath = 'data/project/lake-allocator-war-lead-acquisition-wave-23-policy.json';
  const policy = readJson(root, policyPath);
  const sourceRaw = fs.readFileSync(full(root, policy.paths.source_projection), 'utf8');
  const sourceProjection = JSON.parse(sourceRaw);
  const projection = readJson(root, policy.paths.projection);
  const wave21Policy = readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json');
  const errors = validateArtifacts({ policy, sourceProjection, sourceRaw, projection, wave21Policy });

  if (process.env.LAW23_SKIP_GIT !== '1') {
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
    const isShallowRepository = () => {
      try {
        return execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
          cwd: root,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        }).trim() === 'true';
      } catch {
        return false;
      }
    };

    const githubHeadRef = String(process.env.GITHUB_HEAD_REF ?? '').trim();
    const remoteHeadRef = githubHeadRef ? 'refs/remotes/origin/' + githubHeadRef : null;
    let ancestryTarget = 'HEAD';

    if (process.env.GITHUB_ACTIONS === 'true' && remoteHeadRef) {
      try {
        const fetchArgs = ['fetch', '--no-tags'];
        if (isShallowRepository()) fetchArgs.push('--unshallow');
        fetchArgs.push('origin', '+refs/heads/' + githubHeadRef + ':' + remoteHeadRef);
        quietGit(fetchArgs);
      } catch {
        // The availability and ancestry checks below record bounded recovery failure.
      }
      if (hasCommit(remoteHeadRef)) ancestryTarget = remoteHeadRef;
    }

    if (!hasCommit(baseCommit)) {
      fail(errors, 'Wave 23 base checkpoint unavailable after targeted full-history recovery');
    } else {
      try {
        quietGit(['merge-base', '--is-ancestor', baseCommit, ancestryTarget]);
      } catch {
        fail(errors, 'Wave 23 base checkpoint is not an ancestor');
      }
    }
  }

  for (const relative of [policy.paths.report, policy.paths.method, policy.paths.milestone]) {
    if (!fs.existsSync(full(root, relative))) fail(errors, relative + ': required Wave 23 artifact absent');
  }
  if (fs.existsSync(full(root, policy.paths.report))) {
    const report = fs.readFileSync(full(root, policy.paths.report), 'utf8');
    if (!report.includes('lead acquisition packets:   ' + policy.expected_counts.lead_packets)) fail(errors, 'Wave 23 report packet count drift');
    if (!report.includes('evidence rows:              0')) fail(errors, 'Wave 23 report evidence boundary drift');
    if (!report.includes('graph effects:              0')) fail(errors, 'Wave 23 report graph boundary drift');
  }

  if (!same(projection.graph_digests, graphDigests(root))) fail(errors, 'Wave 23 changed participation, active claims, hop edges, or rejected-hop controls');
  for (const packet of projection.packets) {
    if (fs.existsSync(full(root, packet.result_ledger_path))) fail(errors, packet.packet_ref + ': result ledger exists before acquisition execution');
  }

  const requiredRoots = [policyPath, policy.paths.projection, policy.paths.report, policy.paths.method, policy.paths.milestone];
  const lakePolicy = readJson(root, 'data/project/lake-index-policy.json');
  for (const relative of requiredRoots) if (!lakePolicy.authoritative_roots.includes(relative)) fail(errors, relative + ': missing Wave 23 authoritative root');

  const basinRegistry = readJson(root, 'data/project/lake-basin-registry.json');
  const registryByRef = new Map(basinRegistry.basins.map(row => [row.basin_id, row]));
  for (const basin of wave21Policy.basin_contract) {
    if (['allocator-war-source', 'allocator-war-lake-actions', 'allocator-war-reports'].includes(basin.basin_id) && !same(registryByRef.get(basin.basin_id), basin)) fail(errors, basin.basin_id + ': installed Wave 23 basin contract drift');
  }

  const pkg = readJson(root, 'package.json');
  if (!pkg.scripts['build:lake-allocator-war-lead-acquisition-wave-23']) fail(errors, 'Wave 23 builder script absent');
  if (!pkg.scripts['validate:lake-allocator-war-lead-acquisition-wave-23']) fail(errors, 'Wave 23 validator script absent');
  if (!pkg.scripts.check.includes('validate:lake-allocator-war-lead-acquisition-wave-23')) fail(errors, 'Wave 23 absent from complete release gate');

  const installerText = fs.readFileSync(full(root, 'tools/install-lake-allocator-war-wave-21.mjs'), 'utf8');
  const wave21ValidatorText = fs.readFileSync(full(root, 'tools/validate-lake-allocator-war-wave-21.mjs'), 'utf8');
  for (const relative of requiredRoots) {
    if (!installerText.includes(relative)) fail(errors, relative + ': Wave 21 installer does not preserve Wave 23 root');
    if (!wave21ValidatorText.includes(relative)) fail(errors, relative + ': Wave 21 validator does not preserve Wave 23 root');
  }

  if (process.env.LAW23_SKIP_SHARDS !== '1') {
    const membershipPath = 'build/lake-index/basin-membership.jsonl';
    if (fs.existsSync(full(root, membershipPath))) {
      const membership = readJsonl(root, membershipPath);
      const byPath = new Map(membership.map(row => [row.path, row]));
      for (const relative of [policyPath, policy.paths.method, policy.paths.milestone]) {
        if (byPath.get(relative)?.basin_id !== 'allocator-war-source') fail(errors, relative + ': wrong Wave 23 source basin');
      }
      if (byPath.get(policy.paths.projection)?.basin_id !== 'allocator-war-lake-actions') fail(errors, 'Wave 23 projection wrong basin');
      if (byPath.get(policy.paths.report)?.basin_id !== 'allocator-war-reports') fail(errors, 'Wave 23 report wrong basin');
    }
    const summaryPath = 'build/lake-index/summary.json';
    const gapsPath = 'build/lake-index/gap-summary.json';
    for (const relative of [summaryPath, gapsPath]) {
      if (!fs.existsSync(full(root, relative))) continue;
      const summary = readJson(root, relative);
      for (const key of ['unindexed_machine_ids_unadjudicated', 'source_ids_without_projection_unadjudicated', 'divergent_identifier_projections_unadjudicated']) {
        if (summary.counts?.[key] !== 0) fail(errors, key + ': Wave 23 reopened global residual');
      }
    }
  }

  for (const relative of [
    '.github/tmp/wave23-lead-acquisition-trigger.json',
    '.github/workflows/temporary-wave23-lead-acquisition-materializer.yml',
    'tools/run-wave23-lead-acquisition-materializer.sh'
  ]) {
    if (fs.existsSync(full(root, relative))) fail(errors, relative + ': temporary Wave 23 transport remains');
  }

  if (errors.length) throw new Error('allocator-war lead acquisition Wave 23 validation failed:\n- ' + errors.join('\n- '));
  return projection;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const projection = validateRepository();
  console.log('allocator-war lead acquisition Wave 23 validation passed');
  console.log('  estate queues / lead packets: ' + projection.counts.estate_queues + ' / ' + projection.counts.lead_packets);
  console.log('  selected priorities: ' + JSON.stringify(projection.counts.selected_priorities));
  console.log('  evidence / graph / publication: ' + projection.counts.evidence_rows + ' / 0 / 0');
}
