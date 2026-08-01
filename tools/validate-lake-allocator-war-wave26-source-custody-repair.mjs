#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildRepairReceipt } from './build-lake-allocator-war-wave26-source-custody-repair.mjs';

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
const fail = (errors, message) => errors.push(message);

function graphDigests(root) {
  return {
    participation_sha256: digest(readJsonl(root, 'data/ledger/participation.jsonl')),
    active_claims_sha256: digest(readJson(root, 'build/axm-identity.json').claims),
    hop_edges_sha256: digest(readJson(root, 'build/hop-graph.json').edges),
    rejected_hop_surfaces_sha256: digest(readJson(root, 'build/hop-graph.json').rejected_hop_surfaces),
    rejected_hop_pairs_sha256: digest(readJson(root, 'build/hop-graph.json').rejected_hop_pairs)
  };
}

function ancestryErrors(root, policy) {
  const errors = [];
  if (process.env.LAW26_SC_SKIP_GIT === '1') return errors;
  const checkpoint = policy.base_checkpoint.commit;
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
  let checkpointAvailable = hasCommit(checkpoint);
  let ancestrySatisfied = checkpointAvailable && isAncestor(checkpoint, ancestryTarget);
  if (!ancestrySatisfied && process.env.GITHUB_ACTIONS === 'true' && remoteHeadRef) {
    try {
      quietGit(['fetch', '--no-tags', '--depth=1000000', 'origin', '+refs/heads/' + githubHeadRef + ':' + remoteHeadRef]);
    } catch {
      // Bounded recovery failure is reported below.
    }
    if (hasCommit(remoteHeadRef)) ancestryTarget = remoteHeadRef;
    checkpointAvailable = hasCommit(checkpoint);
    ancestrySatisfied = checkpointAvailable && isAncestor(checkpoint, ancestryTarget);
  }
  if (!checkpointAvailable) fail(errors, checkpoint + ': repair base checkpoint unavailable after targeted history recovery');
  else if (!ancestrySatisfied) fail(errors, checkpoint + ': repair base checkpoint is not an ancestor');
  return errors;
}

export function validateArtifacts(state) {
  const {
    policy,
    sourcePlan,
    sourcePlanRaw,
    sourceProjection,
    sourceProjectionRaw,
    publicRows,
    legislativeRows,
    repairProjection,
    graphDigestView
  } = state;
  const errors = [];
  const expected = policy.expected_counts;

  if (policy.schema_version !== 'lake-allocator-war-wave26-source-custody-repair-policy@1') fail(errors, 'repair policy schema drift');
  if (policy.boundaries.graph_effect !== 'none') fail(errors, 'repair policy graph effect drift');
  for (const key of [
    'research_sources_establish_public_interest_gate',
    'source_custody_repair_changes_result_state',
    'source_custody_repair_closes_downstream_denominator',
    'source_custody_repair_is_evidence_adjudication',
    'source_custody_repair_creates_prevalence',
    'source_custody_repair_creates_coordination',
    'source_custody_repair_creates_common_purpose',
    'identity_created',
    'relationship_created',
    'participation_created',
    'active_claim_created',
    'hop_created',
    'evidence_adjudicated',
    'finding_promoted',
    'publication_cleared'
  ]) if (policy.boundaries[key] !== false) fail(errors, key + ': repair authority inflation');

  const publicGate = sourcePlan.task_plans.find(row => row.closure_ref === policy.public_interest_gate.closure_ref);
  const legislativeGate = sourcePlan.task_plans.find(row => row.closure_ref === policy.legislative_no_gate.closure_ref);
  if (!publicGate) fail(errors, 'public-interest gate plan absent');
  if (!legislativeGate) fail(errors, 'legislative no-gate plan absent');
  if (publicGate && publicGate.result_state !== policy.public_interest_gate.result_state) fail(errors, 'public-interest gate result drift');
  if (legislativeGate && legislativeGate.result_state !== policy.legislative_no_gate.result_state) fail(errors, 'legislative no-gate result drift');
  if (publicGate && !same(publicGate.source_refs, policy.public_interest_gate.required_source_refs)) fail(errors, 'public-interest gate exact source set drift');
  if (legislativeGate && !same(legislativeGate.source_refs, policy.legislative_no_gate.required_source_refs)) fail(errors, 'legislative no-gate exact source set drift');
  if (publicGate && publicGate.source_refs.some(ref => policy.public_interest_gate.prohibited_source_refs.includes(ref))) fail(errors, 'research source attached to public-interest institutional gate');
  if (sourcePlan.custody_contract?.research_sources_establish_public_interest_gate !== false) fail(errors, 'source-plan custody contract allows research gate proof');
  if (!same(sourcePlan.custody_contract?.public_interest_gate_source_refs, policy.public_interest_gate.required_source_refs)) fail(errors, 'source-plan public-interest custody contract drift');
  if (!same(sourcePlan.custody_contract?.legislative_no_gate_source_refs, policy.legislative_no_gate.required_source_refs)) fail(errors, 'source-plan legislative custody contract drift');

  const publicResult = publicRows.find(row => row.closure_ref === policy.public_interest_gate.closure_ref);
  const legislativeResult = legislativeRows.find(row => row.closure_ref === policy.legislative_no_gate.closure_ref);
  if (!publicResult) fail(errors, 'public-interest result row absent');
  if (!legislativeResult) fail(errors, 'legislative no-gate result row absent');
  if (publicResult && !same(publicResult.source_refs, policy.public_interest_gate.required_source_refs)) fail(errors, 'public-interest result ledger source drift');
  if (legislativeResult && !same(legislativeResult.source_refs, policy.legislative_no_gate.required_source_refs)) fail(errors, 'legislative result ledger source drift');
  if (publicResult && publicResult.source_receipt_count !== expected.public_interest_gate_sources) fail(errors, 'public-interest source receipt count drift');
  if (legislativeResult && legislativeResult.source_receipt_count !== expected.legislative_no_gate_sources) fail(errors, 'legislative source receipt count drift');
  for (const row of [publicResult, legislativeResult].filter(Boolean)) {
    if (row.complete_denominator !== false || row.evidence_adjudicated !== false || row.evidence_rows !== 0) fail(errors, row.closure_ref + ': result authority inflation');
    if (row.finding_promoted !== false || row.graph_effect !== 'none' || row.publication_status !== 'blocked') fail(errors, row.closure_ref + ': result promotion drift');
  }

  const publicDownstream = publicRows.filter(row => row.row_type === 'closure_execution_result' && row.execution_state === policy.public_interest_gate.expected_downstream_state);
  const legislativeDownstream = legislativeRows.filter(row => row.row_type === 'closure_execution_result' && row.execution_state === policy.legislative_no_gate.expected_downstream_state);
  if (publicDownstream.length !== expected.public_interest_unblocked_tasks) fail(errors, 'public-interest downstream count drift');
  if (legislativeDownstream.length !== expected.legislative_blocked_tasks) fail(errors, 'legislative downstream count drift');
  if (publicDownstream.some(row => row.executed_in_wave !== false || row.result_state !== null)) fail(errors, 'public-interest downstream same-wave execution');
  if (legislativeDownstream.some(row => row.executed_in_wave !== false || row.result_state !== null)) fail(errors, 'legislative downstream synthetic execution');

  const resultStates = Object.fromEntries(
    [...new Set(sourcePlan.task_plans.map(row => row.result_state))]
      .sort()
      .map(value => [value, sourcePlan.task_plans.filter(row => row.result_state === value).length])
  );
  const expectedStates = {
    complete: expected.result_complete,
    no_qualifying_gate: expected.result_no_qualifying_gate,
    partial: expected.result_partial,
    unavailable_after_search: expected.result_unavailable_after_search
  };
  if (!same(resultStates, expectedStates)) fail(errors, 'Wave 26 result-state denominator drift');
  if (sourcePlan.counts.source_tasks !== expected.source_tasks) fail(errors, 'source task count drift');
  if (sourcePlan.counts.ready_task_plans !== expected.ready_task_plans) fail(errors, 'ready task-plan count drift');
  if (sourcePlan.counts.blocked_tasks_without_plans !== expected.blocked_tasks_without_plans) fail(errors, 'blocked task count drift');

  const expectedRepair = buildRepairReceipt(
    policy,
    sourcePlan,
    sourceProjection,
    publicRows,
    legislativeRows,
    sourcePlanRaw,
    sourceProjectionRaw
  );
  if (!same(repairProjection, expectedRepair)) fail(errors, 'repair projection differs from deterministic build');
  if (!same(repairProjection.graph_digests, graphDigestView)) fail(errors, 'repair graph digest drift');
  if (repairProjection.counts.complete_denominators !== expected.complete_denominators) fail(errors, 'complete denominator inflation');
  if (repairProjection.counts.evidence_rows !== expected.evidence_rows) fail(errors, 'evidence row inflation');
  if (repairProjection.counts.finding_promotions !== expected.finding_promotions) fail(errors, 'finding promotion inflation');
  if (repairProjection.counts.graph_effects !== expected.graph_effects) fail(errors, 'graph effect inflation');
  if (repairProjection.counts.publication_clearances !== expected.publication_clearances) fail(errors, 'publication clearance inflation');

  return errors;
}

export function validateRepository(root = defaultRoot) {
  const policyPath = 'data/project/lake-allocator-war-wave26-source-custody-repair-policy.json';
  const policy = readJson(root, policyPath);
  const sourcePlanRaw = fs.readFileSync(full(root, policy.paths.wave26_source_plan), 'utf8');
  const sourceProjectionRaw = fs.readFileSync(full(root, policy.paths.wave26_projection), 'utf8');
  const state = {
    policy,
    sourcePlan: JSON.parse(sourcePlanRaw),
    sourcePlanRaw,
    sourceProjection: JSON.parse(sourceProjectionRaw),
    sourceProjectionRaw,
    publicRows: readJsonl(root, policy.paths.public_interest_ledger),
    legislativeRows: readJsonl(root, policy.paths.legislative_finance_ledger),
    repairProjection: readJson(root, policy.paths.projection),
    graphDigestView: graphDigests(root)
  };
  const errors = [...ancestryErrors(root, policy), ...validateArtifacts(state)];

  const lakePolicy = readJson(root, 'data/project/lake-index-policy.json');
  const requiredRoots = [
    policyPath,
    policy.paths.projection,
    policy.paths.report,
    policy.paths.method,
    policy.paths.milestone
  ];
  for (const relative of requiredRoots) if (!lakePolicy.authoritative_roots.includes(relative)) fail(errors, relative + ': missing authoritative root');

  const wave21 = readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json');
  const expectedBasin = new Map([
    [policyPath, 'allocator-war-source'],
    [policy.paths.method, 'allocator-war-source'],
    [policy.paths.milestone, 'allocator-war-source'],
    [policy.paths.projection, 'allocator-war-lake-actions'],
    [policy.paths.report, 'allocator-war-reports']
  ]);
  for (const [relative, basinId] of expectedBasin) {
    const basin = wave21.basin_contract.find(row => row.basin_id === basinId);
    if (!basin?.path_prefixes.includes(relative)) fail(errors, relative + ': Wave 21 basin path absent');
    if (!basin?.authoritative_entrypoints.includes(relative)) fail(errors, relative + ': Wave 21 authoritative entrypoint absent');
  }
  for (const relative of [policy.paths.projection]) {
    if (!wave21.projection_contract.allowed_generated_paths.includes(relative)) fail(errors, relative + ': generated path not allowed');
  }

  const pkg = readJson(root, 'package.json');
  const script = 'validate:lake-allocator-war-wave26-source-custody-repair';
  if (!pkg.scripts[script]) fail(errors, 'repair validator package script absent');
  if (!pkg.scripts.check.includes(script)) fail(errors, 'repair validator absent from complete release gate');

  const membershipPath = 'build/lake-index/basin-membership.jsonl';
  if (fs.existsSync(full(root, membershipPath))) {
    const membership = new Map(readJsonl(root, membershipPath).map(row => [row.path, row.basin_id]));
    for (const [relative, basinId] of expectedBasin) if (membership.get(relative) !== basinId) fail(errors, relative + ': committed basin membership drift');
  }

  for (const temporary of [
    '.github/tmp/wave26-source-custody-repair-trigger.json',
    '.github/workflows/temporary-wave26-source-custody-repair-materializer.yml',
    'tools/run-wave26-source-custody-repair-materializer.sh'
  ]) if (fs.existsSync(full(root, temporary))) fail(errors, temporary + ': temporary transport retained');

  if (errors.length) throw new Error('allocator-war Wave 26 source-custody repair validation failed:\n- ' + errors.join('\n- '));
  return {
    public_interest_gate_sources: policy.public_interest_gate.required_source_refs.length,
    legislative_no_gate_sources: policy.legislative_no_gate.required_source_refs.length,
    public_interest_unblocked_tasks: policy.public_interest_gate.expected_downstream_tasks,
    legislative_blocked_tasks: policy.legislative_no_gate.expected_downstream_tasks
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = validateRepository();
  console.log('allocator-war Wave 26 source-custody repair validation passed');
  console.log('  public-interest / legislative sources: ' + result.public_interest_gate_sources + ' / ' + result.legislative_no_gate_sources);
  console.log('  downstream unblocked / blocked: ' + result.public_interest_unblocked_tasks + ' / ' + result.legislative_blocked_tasks);
  console.log('  evidence / findings / graph / publication: 0 / 0 / 0 / 0');
}
