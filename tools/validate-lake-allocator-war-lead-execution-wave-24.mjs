#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ledgerPathFor } from './build-lake-allocator-war-lead-execution-wave-24.mjs';

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

function expectedLedgerPaths(sourceProjection, policy) {
  return sourceProjection.packets
    .slice()
    .sort((a, b) => a.packet_sequence - b.packet_sequence)
    .map(packet => ledgerPathFor(packet, policy));
}

function requiredWave21BasinPaths(policy, sourceProjection) {
  return {
    'allocator-war-source': [
      'data/project/lake-allocator-war-lead-execution-wave-24-policy.json',
      policy.paths.source_plan,
      policy.paths.method,
      policy.paths.milestone,
      ...expectedLedgerPaths(sourceProjection, policy)
    ],
    'allocator-war-lake-actions': [policy.paths.projection],
    'allocator-war-reports': [policy.paths.report]
  };
}

export function validateArtifacts(state) {
  const {
    policy,
    sourcePlan,
    sourcePlanRaw,
    sourceProjection,
    sourceProjectionRaw,
    projection,
    ledgerRowsByPath,
    ledgerRawByPath,
    wave21Policy
  } = state;
  const errors = [];
  const expected = policy.expected_counts;

  if (policy.schema_version !== 'lake-allocator-war-lead-execution-wave-24-policy@1') fail(errors, 'Wave 24 policy schema drift');
  if (sourcePlan.schema_version !== 'lake-allocator-war-lead-execution-wave-24-source-plan@1') fail(errors, 'Wave 24 source plan schema drift');
  if (sourceProjection.schema_version !== 'lake-allocator-war-lead-acquisition-wave-23@1') fail(errors, 'Wave 24 source is not the Wave 23 projection');
  if (projection.schema_version !== 'lake-allocator-war-lead-execution-wave-24@1') fail(errors, 'Wave 24 projection schema drift');
  if (projection.program_ref !== policy.program_ref || projection.wave_ref !== policy.wave_ref) fail(errors, 'Wave 24 program or wave reference drift');
  if (!same(projection.boundaries, policy.boundaries)) fail(errors, 'Wave 24 boundary projection drift');
  if (policy.boundaries.graph_effect !== 'none' || policy.boundaries.publication_cleared !== false) fail(errors, 'Wave 24 graph or publication boundary drift');
  if (policy.execution_contract.evidence_adjudication_performed !== false) fail(errors, 'Wave 24 execution contract performs evidence adjudication');
  if (policy.execution_contract.complete_denominator_required_for_evidence_review !== true) fail(errors, 'Wave 24 complete-denominator review gate drift');

  if (projection.generated_from?.source_plan_path !== policy.paths.source_plan) fail(errors, 'Wave 24 source-plan path drift');
  if (projection.generated_from?.source_plan_bytes !== Buffer.byteLength(sourcePlanRaw)) fail(errors, 'Wave 24 source-plan byte count drift');
  if (projection.generated_from?.source_plan_sha256 !== digestBytes(sourcePlanRaw)) fail(errors, 'Wave 24 source-plan sha256 drift');
  if (projection.generated_from?.source_projection_path !== policy.paths.source_projection) fail(errors, 'Wave 24 source-projection path drift');
  if (projection.generated_from?.source_projection_bytes !== Buffer.byteLength(sourceProjectionRaw)) fail(errors, 'Wave 24 source-projection byte count drift');
  if (projection.generated_from?.source_projection_sha256 !== digestBytes(sourceProjectionRaw)) fail(errors, 'Wave 24 source-projection sha256 drift');

  if (!Array.isArray(sourcePlan.source_registry) || sourcePlan.source_registry.length !== expected.unique_source_receipts) {
    fail(errors, 'Wave 24 unique source-receipt denominator drift');
  }
  if (!Array.isArray(sourcePlan.packet_plans) || sourcePlan.packet_plans.length !== expected.source_packets) {
    fail(errors, 'Wave 24 packet-plan denominator drift');
  }
  if (!unique(sourcePlan.source_registry.map(row => row.id))) fail(errors, 'duplicate Wave 24 source reference');
  if (!unique(sourcePlan.source_registry.map(row => row.stable_identifier))) fail(errors, 'duplicate Wave 24 stable source identifier');
  if (!unique(sourcePlan.packet_plans.map(row => row.packet_ref))) fail(errors, 'duplicate Wave 24 packet plan');

  const sourceStatusCounts = countBy(sourcePlan.source_registry, 'retrieval_status');
  for (const key of ['verified', 'verified_redirected', 'blocked_403_reused_reviewed_locator', 'fetch_error_reused_reviewed_locator']) {
    if ((sourceStatusCounts[key] ?? 0) !== expected[key]) fail(errors, key + ': Wave 24 source-registry status drift');
  }
  const allowedStatuses = new Set([
    'verified',
    'verified_redirected',
    'blocked_403_reused_reviewed_locator',
    'fetch_error_reused_reviewed_locator'
  ]);
  for (const source of sourcePlan.source_registry) {
    for (const key of policy.execution_contract.required_source_fields) {
      const sourceKey = key === 'source_ref' ? 'id' : key;
      if (!(sourceKey in source)) fail(errors, source.id + ': missing source field ' + key);
    }
    if (!allowedStatuses.has(source.retrieval_status)) fail(errors, source.id + ': unauthorized retrieval status');
    if (!Array.isArray(source.custody_refs) || source.custody_refs.length === 0) fail(errors, source.id + ': custody references absent');
    if (!source.stable_identifier) fail(errors, source.id + ': stable identifier absent');
  }

  const sourceByRef = new Map(sourcePlan.source_registry.map(row => [row.id, row]));
  const sourceUseCount = sourcePlan.packet_plans.reduce((sum, row) => sum + row.source_refs.length, 0);
  if (sourceUseCount !== expected.source_receipt_uses) fail(errors, 'Wave 24 source-use denominator drift');
  const dispositionCounts = countBy(sourcePlan.packet_plans, 'acquisition_disposition');
  for (const key of ['partial_source_recovery', 'bounded_public_record_recovered_gate_unspecified']) {
    if ((dispositionCounts[key] ?? 0) !== expected[key]) fail(errors, key + ': Wave 24 packet disposition drift');
  }
  const allowedDispositions = new Set(policy.execution_contract.allowed_acquisition_dispositions);
  for (const plan of sourcePlan.packet_plans) {
    if (!allowedDispositions.has(plan.acquisition_disposition)) fail(errors, plan.packet_ref + ': unauthorized acquisition disposition');
    if (!unique(plan.source_refs)) fail(errors, plan.packet_ref + ': duplicate source reference within packet');
    for (const sourceRef of plan.source_refs) if (!sourceByRef.has(sourceRef)) fail(errors, plan.packet_ref + ': unknown source reference ' + sourceRef);
    for (const key of ['bounded_window', 'acquisition_disposition', 'institutional_gate_state', 'coverage_statement', 'included_rows', 'excluded_rows', 'null_rows', 'unavailable_rows', 'refused_rows', 'negative_search_statement', 'correction_route', 'correction_outcome']) {
      if (!(key in plan)) fail(errors, plan.packet_ref + ': missing packet-plan field ' + key);
    }
    for (const key of ['included_rows', 'excluded_rows', 'null_rows', 'unavailable_rows', 'refused_rows', 'correction_route']) {
      if (!Array.isArray(plan[key])) fail(errors, plan.packet_ref + ': ' + key + ' is not an array');
    }
    const law = policy.disposition_law[plan.acquisition_disposition];
    if (!law) {
      fail(errors, plan.packet_ref + ': disposition law absent');
    } else if (plan.acquisition_disposition === 'bounded_public_record_recovered_gate_unspecified') {
      if (plan.institutional_gate_state !== law.required_gate_state) fail(errors, plan.packet_ref + ': gate-unspecified state drift');
    } else if (plan.institutional_gate_state === 'no_bounded_institutional_gate_identified') {
      fail(errors, plan.packet_ref + ': partial recovery cannot use gate-unspecified state');
    }
  }

  const packets = sourceProjection.packets.slice().sort((a, b) => a.packet_sequence - b.packet_sequence);
  if (packets.length !== expected.source_packets) fail(errors, 'Wave 24 source packet denominator drift');
  const packetByRef = new Map(packets.map(row => [row.packet_ref, row]));
  const planByRef = new Map(sourcePlan.packet_plans.map(row => [row.packet_ref, row]));
  if (projection.executions.length !== expected.acquisition_ledgers) fail(errors, 'Wave 24 execution denominator drift');
  if (!unique(projection.executions.map(row => row.packet_ref))) fail(errors, 'duplicate Wave 24 execution packet');
  const executionByRef = new Map(projection.executions.map(row => [row.packet_ref, row]));
  const allSourceRows = [];
  const allPacketRows = [];

  for (const packet of packets) {
    const plan = planByRef.get(packet.packet_ref);
    const execution = executionByRef.get(packet.packet_ref);
    if (!plan) {
      fail(errors, packet.packet_ref + ': source plan absent');
      continue;
    }
    if (!execution) {
      fail(errors, packet.packet_ref + ': execution absent');
      continue;
    }
    const ledgerPath = ledgerPathFor(packet, policy);
    const rows = ledgerRowsByPath[ledgerPath];
    const raw = ledgerRawByPath[ledgerPath];
    if (!Array.isArray(rows)) {
      fail(errors, packet.packet_ref + ': acquisition ledger absent');
      continue;
    }
    if (typeof raw !== 'string') fail(errors, packet.packet_ref + ': acquisition ledger raw bytes absent');
    if (rows.length !== plan.source_refs.length + 1) fail(errors, packet.packet_ref + ': ledger row count drift');
    const packetRow = rows[0];
    const sourceRows = rows.slice(1);
    allPacketRows.push(packetRow);
    allSourceRows.push(...sourceRows);

    if (packetRow.schema_version !== policy.execution_contract.packet_summary_schema || packetRow.row_type !== 'packet_execution') fail(errors, packet.packet_ref + ': packet row schema drift');
    for (const key of ['packet_ref', 'packet_sequence', 'source_queue_ref', 'source_task_ref', 'source_task_sequence', 'consumer_key', 'queue_class', 'source_route_authority', 'task_authority', 'selection_priority', 'acquisition_target', 'required_output', 'closure_test']) {
      if (packetRow[key] !== packet[key]) fail(errors, packet.packet_ref + ': packet row ' + key + ' drift');
    }
    if (!same(packetRow.allowed_results, packet.allowed_results)) fail(errors, packet.packet_ref + ': allowed-result custody drift');
    for (const key of ['reviewed_source_finding_refs', 'reviewed_source_observation_refs', 'unreviewed_intake_observation_refs']) {
      if (!same(packetRow[key], packet[key])) fail(errors, packet.packet_ref + ': packet authority reference drift: ' + key);
    }
    for (const key of ['bounded_window', 'included_rows', 'excluded_rows', 'null_rows', 'unavailable_rows', 'refused_rows', 'correction_route', 'source_refs']) {
      if (!same(packetRow[key], key === 'source_refs' ? plan.source_refs : plan[key])) fail(errors, packet.packet_ref + ': packet plan custody drift: ' + key);
    }
    for (const key of ['acquisition_disposition', 'institutional_gate_state', 'coverage_statement', 'negative_search_statement', 'correction_outcome']) {
      if (packetRow[key] !== plan[key]) fail(errors, packet.packet_ref + ': packet plan field drift: ' + key);
    }
    if (packetRow.source_receipt_rows !== plan.source_refs.length) fail(errors, packet.packet_ref + ': packet source-row denominator drift');
    if (packetRow.complete_denominator !== false || packetRow.evidence_adjudicated !== false || packetRow.evidence_rows !== 0) fail(errors, packet.packet_ref + ': packet evidence inflation');
    if (packetRow.execution_state !== policy.execution_contract.execution_state) fail(errors, packet.packet_ref + ': packet execution-state drift');
    if (packetRow.controls_and_refusals_required !== true || packetRow.finding_promoted !== false || packetRow.graph_effect !== 'none' || packetRow.publication_status !== 'blocked') fail(errors, packet.packet_ref + ': packet boundary drift');
    if (!same(packetRow.blocked_promotions, policy.blocked_promotions)) fail(errors, packet.packet_ref + ': blocked-promotion drift');

    for (const [index, sourceRow] of sourceRows.entries()) {
      const sourceRef = plan.source_refs[index];
      const source = sourceByRef.get(sourceRef);
      if (!source) {
        fail(errors, packet.packet_ref + ': source plan reference absent during ledger validation: ' + sourceRef);
        continue;
      }
      if (sourceRow.schema_version !== policy.execution_contract.source_receipt_schema || sourceRow.row_type !== 'source_receipt') fail(errors, packet.packet_ref + ': source row schema drift');
      if (sourceRow.packet_ref !== packet.packet_ref || sourceRow.source_queue_ref !== packet.source_queue_ref || sourceRow.receipt_sequence !== index + 1) fail(errors, packet.packet_ref + ': source row ordering drift');
      if (sourceRow.source_ref !== sourceRef) fail(errors, packet.packet_ref + ': source reference order drift');
      for (const key of ['source_locator', 'resolved_locator', 'stable_identifier', 'issuing_body', 'source_type', 'jurisdiction', 'issued_at', 'retrieved_at', 'retrieval_status', 'custody_refs']) {
        if (!same(sourceRow[key], source[key])) fail(errors, packet.packet_ref + ': source custody drift: ' + sourceRef + ' ' + key);
      }
      if (sourceRow.content_sha256_or_stable_official_identifier !== source.stable_identifier) fail(errors, packet.packet_ref + ': source stable-identifier custody drift');
      if (sourceRow.source_bytes_preserved !== false || sourceRow.complete_denominator !== false || sourceRow.acquisition_recorded !== true || sourceRow.evidence_adjudicated !== false || sourceRow.evidence_rows !== 0) fail(errors, packet.packet_ref + ': source row evidence boundary drift');
      if (sourceRow.finding_promoted !== false || sourceRow.graph_effect !== 'none' || sourceRow.publication_status !== 'blocked') fail(errors, packet.packet_ref + ': source row promotion boundary drift');
    }

    if (execution.ledger_path !== ledgerPath || execution.ledger_rows !== rows.length || execution.source_receipt_rows !== plan.source_refs.length) fail(errors, packet.packet_ref + ': execution ledger summary drift');
    if (execution.ledger_sha256 !== digestBytes(raw)) fail(errors, packet.packet_ref + ': ledger sha256 drift');
    for (const key of ['packet_ref', 'packet_sequence', 'source_queue_ref', 'source_task_ref', 'consumer_key', 'queue_class', 'source_route_authority', 'task_authority', 'selection_priority', 'acquisition_target']) {
      if (execution[key] !== packet[key]) fail(errors, packet.packet_ref + ': execution packet custody drift: ' + key);
    }
    for (const key of ['acquisition_disposition', 'institutional_gate_state', 'bounded_window', 'coverage_statement', 'source_refs']) {
      if (!same(execution[key], plan[key])) fail(errors, packet.packet_ref + ': execution plan custody drift: ' + key);
    }
    if (execution.complete_denominator !== false || execution.execution_state !== policy.execution_contract.execution_state || execution.evidence_adjudicated !== false || execution.evidence_rows !== 0 || execution.finding_promoted !== false || execution.graph_effect !== 'none' || execution.publication_status !== 'blocked') fail(errors, packet.packet_ref + ': execution boundary drift');
  }

  for (const plan of sourcePlan.packet_plans) if (!packetByRef.has(plan.packet_ref)) fail(errors, plan.packet_ref + ': plan has no Wave 23 packet');
  if (allPacketRows.length !== expected.packet_summary_rows) fail(errors, 'Wave 24 packet-summary row count drift');
  if (allSourceRows.length !== expected.source_receipt_rows) fail(errors, 'Wave 24 source-receipt row count drift');

  const actualCounts = {
    source_packets: packets.length,
    acquisition_ledgers: projection.executions.length,
    unique_source_receipts: sourcePlan.source_registry.length,
    source_receipt_uses: allSourceRows.length,
    packet_summary_rows: allPacketRows.length,
    source_receipt_rows: allSourceRows.length,
    acquisition_rows: allPacketRows.length + allSourceRows.length,
    complete_denominators: projection.executions.filter(row => row.complete_denominator === true).length,
    evidence_rows: 0,
    finding_promotions: 0,
    graph_effects: 0,
    publication_clearances: 0
  };
  for (const [key, value] of Object.entries(actualCounts)) {
    if (projection.counts[key] !== value) fail(errors, key + ': Wave 24 projection count drift');
    if (expected[key] !== value) fail(errors, key + ': Wave 24 policy count drift');
  }
  if (!same(projection.counts.acquisition_dispositions, countBy(projection.executions, 'acquisition_disposition'))) fail(errors, 'Wave 24 projection disposition-count drift');
  if (!same(projection.counts.source_registry_retrieval_statuses, sourceStatusCounts)) fail(errors, 'Wave 24 source-registry status-count projection drift');
  if (!same(projection.counts.source_use_retrieval_statuses, countBy(allSourceRows, 'retrieval_status'))) fail(errors, 'Wave 24 source-use status-count projection drift');

  for (const key of ['unique_source_receipts', 'packet_plans', 'evidence_rows', 'finding_promotions', 'graph_effects', 'publication_clearances']) {
    const expectedValue = key === 'packet_plans' ? expected.source_packets : expected[key];
    if (sourcePlan.counts?.[key] !== expectedValue) fail(errors, key + ': Wave 24 source-plan count drift');
  }
  if (sourcePlan.counts?.source_references !== expected.source_receipt_uses) fail(errors, 'Wave 24 source-plan reference count drift');
  for (const key of ['partial_source_recovery', 'bounded_public_record_recovered_gate_unspecified', 'verified', 'verified_redirected', 'blocked_403_reused_reviewed_locator', 'fetch_error_reused_reviewed_locator']) {
    if (sourcePlan.counts?.[key] !== expected[key]) fail(errors, key + ': Wave 24 source-plan expected count drift');
  }
  if (sourcePlan.boundaries?.acquisition_record_is_evidence_row !== false || sourcePlan.boundaries?.acquisition_disposition_is_evidence_result !== false || sourcePlan.boundaries?.finding_promoted !== false || sourcePlan.boundaries?.graph_effect !== 'none' || sourcePlan.boundaries?.publication_cleared !== false) fail(errors, 'Wave 24 source-plan boundary drift');

  const requiredBasins = requiredWave21BasinPaths(policy, sourceProjection);
  for (const [basinRef, paths] of Object.entries(requiredBasins)) {
    const basin = wave21Policy.basin_contract.find(row => row.basin_id === basinRef);
    if (!basin) {
      fail(errors, basinRef + ': Wave 21 basin absent');
      continue;
    }
    for (const relative of paths) {
      if (!basin.path_prefixes.includes(relative)) fail(errors, relative + ': Wave 24 path absent from ' + basinRef);
      if (!basin.authoritative_entrypoints.includes(relative)) fail(errors, relative + ': Wave 24 authoritative entrypoint absent from ' + basinRef);
    }
  }
  for (const relative of [policy.paths.projection, ...expectedLedgerPaths(sourceProjection, policy)]) {
    if (!wave21Policy.projection_contract.allowed_generated_paths.includes(relative)) fail(errors, relative + ': Wave 24 generated path absent from Wave 21 projection contract');
  }
  if (wave21Policy.boundaries.wave_24_acquisition_record_is_evidence_row !== false) fail(errors, 'Wave 24 acquisition boundary absent from Wave 21 policy');
  if (wave21Policy.boundaries.wave_24_gate_unspecified_is_institutional_gate !== false) fail(errors, 'Wave 24 gate-unspecified boundary absent from Wave 21 policy');

  return errors;
}

export function validateRepository(root = defaultRoot) {
  const policyPath = 'data/project/lake-allocator-war-lead-execution-wave-24-policy.json';
  const policy = readJson(root, policyPath);
  const sourcePlanRaw = fs.readFileSync(full(root, policy.paths.source_plan), 'utf8');
  const sourceProjectionRaw = fs.readFileSync(full(root, policy.paths.source_projection), 'utf8');
  const sourcePlan = JSON.parse(sourcePlanRaw);
  const sourceProjection = JSON.parse(sourceProjectionRaw);
  const projection = readJson(root, policy.paths.projection);
  const ledgerRowsByPath = {};
  const ledgerRawByPath = {};
  for (const execution of projection.executions ?? []) {
    if (!fs.existsSync(full(root, execution.ledger_path))) continue;
    ledgerRawByPath[execution.ledger_path] = fs.readFileSync(full(root, execution.ledger_path), 'utf8');
    ledgerRowsByPath[execution.ledger_path] = readJsonl(root, execution.ledger_path);
  }
  const wave21Policy = readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json');
  const errors = validateArtifacts({
    policy,
    sourcePlan,
    sourcePlanRaw,
    sourceProjection,
    sourceProjectionRaw,
    projection,
    ledgerRowsByPath,
    ledgerRawByPath,
    wave21Policy
  });

  if (process.env.LAW24_SKIP_GIT !== '1') {
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
        // The availability and ancestry checks below retain the bounded recovery failure.
      }
      if (hasCommit(remoteHeadRef)) ancestryTarget = remoteHeadRef;
      baseAvailable = hasCommit(baseCommit);
      ancestrySatisfied = baseAvailable && isAncestor(baseCommit, ancestryTarget);
    }
    if (!baseAvailable) {
      fail(errors, 'Wave 24 base checkpoint unavailable after targeted deep-history recovery');
    } else if (!ancestrySatisfied) {
      fail(errors, 'Wave 24 base checkpoint is not an ancestor');
    }
  }

  for (const relative of [policy.paths.report, policy.paths.method, policy.paths.milestone]) {
    if (!fs.existsSync(full(root, relative))) fail(errors, relative + ': required Wave 24 artifact absent');
  }
  if (fs.existsSync(full(root, policy.paths.report))) {
    const report = fs.readFileSync(full(root, policy.paths.report), 'utf8');
    if (!report.includes('acquisition ledgers:        ' + policy.expected_counts.acquisition_ledgers)) fail(errors, 'Wave 24 report ledger count drift');
    if (!report.includes('acquisition rows:           ' + policy.expected_counts.acquisition_rows)) fail(errors, 'Wave 24 report acquisition-row count drift');
    if (!report.includes('complete denominators:      0')) fail(errors, 'Wave 24 report denominator boundary drift');
    if (!report.includes('evidence rows:              0')) fail(errors, 'Wave 24 report evidence boundary drift');
    if (!report.includes('graph effects:              0')) fail(errors, 'Wave 24 report graph boundary drift');
  }

  if (!same(projection.graph_digests, graphDigests(root))) fail(errors, 'Wave 24 changed participation, active claims, hop edges, or rejected-hop controls');

  const requiredRoots = [
    policyPath,
    policy.paths.source_plan,
    policy.paths.projection,
    policy.paths.report,
    policy.paths.method,
    policy.paths.milestone,
    ...expectedLedgerPaths(sourceProjection, policy)
  ];
  const lakePolicy = readJson(root, 'data/project/lake-index-policy.json');
  for (const relative of requiredRoots) if (!lakePolicy.authoritative_roots.includes(relative)) fail(errors, relative + ': missing Wave 24 authoritative root');

  const basinRegistry = readJson(root, 'data/project/lake-basin-registry.json');
  const registryByRef = new Map(basinRegistry.basins.map(row => [row.basin_id, row]));
  for (const basin of wave21Policy.basin_contract) {
    if (['allocator-war-source', 'allocator-war-lake-actions', 'allocator-war-reports'].includes(basin.basin_id) && !same(registryByRef.get(basin.basin_id), basin)) fail(errors, basin.basin_id + ': installed Wave 24 basin contract drift');
  }

  const pkg = readJson(root, 'package.json');
  if (!pkg.scripts['build:lake-allocator-war-lead-execution-wave-24']) fail(errors, 'Wave 24 builder script absent');
  if (!pkg.scripts['validate:lake-allocator-war-lead-execution-wave-24']) fail(errors, 'Wave 24 validator script absent');
  if (!pkg.scripts.check.includes('validate:lake-allocator-war-lead-execution-wave-24')) fail(errors, 'Wave 24 absent from complete release gate');

  const installerText = fs.readFileSync(full(root, 'tools/install-lake-allocator-war-wave-21.mjs'), 'utf8');
  const wave21ValidatorText = fs.readFileSync(full(root, 'tools/validate-lake-allocator-war-wave-21.mjs'), 'utf8');
  for (const relative of requiredRoots) {
    if (!installerText.includes(relative)) fail(errors, relative + ': Wave 21 installer does not preserve Wave 24 root');
    if (!wave21ValidatorText.includes(relative)) fail(errors, relative + ': Wave 21 validator does not preserve Wave 24 root');
  }

  if (process.env.LAW24_SKIP_SHARDS !== '1') {
    const membershipPath = 'build/lake-index/basin-membership.jsonl';
    const summaryPath = 'build/lake-index/summary.json';
    const gapsPath = 'build/lake-index/gap-summary.json';
    if (fs.existsSync(full(root, membershipPath))) {
      const membership = readJsonl(root, membershipPath);
      const byPath = new Map(membership.map(row => [row.path, row]));
      for (const relative of [policyPath, policy.paths.source_plan, policy.paths.method, policy.paths.milestone, ...expectedLedgerPaths(sourceProjection, policy)]) {
        if (byPath.get(relative)?.basin_id !== 'allocator-war-source') fail(errors, relative + ': wrong Wave 24 source basin');
      }
      if (byPath.get(policy.paths.projection)?.basin_id !== 'allocator-war-lake-actions') fail(errors, 'Wave 24 projection wrong basin');
      if (byPath.get(policy.paths.report)?.basin_id !== 'allocator-war-reports') fail(errors, 'Wave 24 report wrong basin');
    }
    for (const relative of [summaryPath, gapsPath]) {
      if (!fs.existsSync(full(root, relative))) continue;
      const summary = readJson(root, relative);
      for (const key of ['unindexed_machine_ids_unadjudicated', 'source_ids_without_projection_unadjudicated', 'divergent_identifier_projections_unadjudicated']) {
        if (summary.counts?.[key] !== 0) fail(errors, relative + ': ' + key + ' reopened');
      }
    }
  }

  for (const temporary of [
    '.github/tmp/wave24-lead-execution-trigger.json',
    '.github/workflows/temporary-wave24-lead-execution-materializer.yml',
    'tools/run-wave24-lead-execution-materializer.sh'
  ]) if (fs.existsSync(full(root, temporary))) fail(errors, temporary + ': temporary transport retained');

  if (errors.length) throw new Error('allocator-war lead execution Wave 24 validation failed:\n- ' + errors.join('\n- '));
  return {
    source_packets: projection.counts.source_packets,
    ledgers: projection.counts.acquisition_ledgers,
    source_receipts: projection.counts.unique_source_receipts,
    source_uses: projection.counts.source_receipt_uses,
    acquisition_rows: projection.counts.acquisition_rows
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = validateRepository(defaultRoot);
  console.log('allocator-war lead execution Wave 24 validation passed');
  console.log(
    '  packets / ledgers / source receipts / uses: ' +
    result.source_packets + ' / ' + result.ledgers + ' / ' +
    result.source_receipts + ' / ' + result.source_uses
  );
  console.log('  acquisition rows / complete denominators / evidence: ' + result.acquisition_rows + ' / 0 / 0');
  console.log('  findings / graph / publication: 0 / 0 / 0');
}
