#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildWave27, resultPathFor } from './build-lake-allocator-war-public-interest-downstream-wave-27.mjs';

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
  return {
    'allocator-war-source': [
      'data/project/lake-allocator-war-public-interest-downstream-wave-27-policy.json',
      policy.paths.method,
      policy.paths.milestone,
      resultPathFor('LAW21-EST-05', policy),
      resultPathFor('LAW21-EST-11', policy)
    ],
    'allocator-war-lake-actions': [policy.paths.execution_plan, policy.paths.projection],
    'allocator-war-reports': [policy.paths.report]
  };
}

function ancestryErrors(root, policy) {
  const errors = [];
  if (process.env.LAW27_SKIP_GIT === '1') return errors;
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
  if (!checkpointAvailable) fail(errors, checkpoint + ': Wave 27 base checkpoint unavailable after targeted history recovery');
  else if (!ancestrySatisfied) fail(errors, checkpoint + ': Wave 27 base checkpoint is not an ancestor');
  return errors;
}

export function validateArtifacts(state) {
  const {
    policy,
    wave26Projection,
    repairProjection,
    wave26Plan,
    publicRows,
    legislativeRows,
    executionPlan,
    projection,
    resultRowsByPath,
    rawInputs,
    graphDigestView,
    wave21Policy
  } = state;
  const errors = [];
  const expected = policy.expected_counts;
  const contract = policy.source_contract;

  if (policy.schema_version !== 'lake-allocator-war-public-interest-downstream-wave-27-policy@1') fail(errors, 'Wave 27 policy schema drift');
  if (wave26Projection.schema_version !== 'lake-allocator-war-targeted-closure-wave-26@1') fail(errors, 'Wave 27 source is not Wave 26 projection');
  if (repairProjection.schema_version !== 'lake-allocator-war-wave26-source-custody-repair@1') fail(errors, 'Wave 27 source repair projection schema drift');
  if (wave26Plan.schema_version !== 'lake-allocator-war-targeted-closure-wave-26-source-plan@1') fail(errors, 'Wave 27 Wave 26 source-plan schema drift');
  if (executionPlan.schema_version !== 'lake-allocator-war-public-interest-downstream-wave-27-source-plan@1') fail(errors, 'Wave 27 execution-plan schema drift');
  if (projection.schema_version !== 'lake-allocator-war-public-interest-downstream-wave-27@1') fail(errors, 'Wave 27 projection schema drift');
  if (projection.program_ref !== policy.program_ref || projection.wave_ref !== policy.wave_ref) fail(errors, 'Wave 27 program or wave drift');
  if (!same(projection.boundaries, policy.boundaries)) fail(errors, 'Wave 27 projected boundaries drift');
  if (policy.boundaries.graph_effect !== 'none') fail(errors, 'Wave 27 graph boundary drift');
  for (const key of [
    'public_interest_downstream_result_is_evidence_row',
    'formal_category_is_complete_affected_roster',
    'formal_consequence_authority_is_observed_use',
    'bounded_correction_control_is_systemwide_remedy_adequacy',
    'partial_is_complete',
    'blocked_legislative_task_may_receive_plan',
    'no_qualifying_gate_proves_no_future_gate',
    'research_sources_establish_public_interest_gate',
    'shared_source_is_relationship',
    'source_recurrence_is_prevalence',
    'reviewed_route_is_second_party_review',
    'unreviewed_route_may_promote_finding',
    'identity_created',
    'relationship_created',
    'participation_created',
    'active_claim_created',
    'hop_created',
    'evidence_adjudicated',
    'finding_promoted',
    'publication_cleared'
  ]) if (policy.boundaries[key] !== false) fail(errors, key + ': Wave 27 authority inflation');

  if (!same(repairProjection.public_interest_gate.source_refs, contract.institutional_source_refs)) fail(errors, 'Wave 27 repaired source set drift');
  if (repairProjection.public_interest_gate.prohibited_source_refs_present.length !== 0) fail(errors, 'Wave 27 prohibited research source retained by repaired gate');
  const gate = publicRows.find(row => row.closure_ref === contract.public_interest_gate_ref);
  if (!gate || gate.result_state !== 'complete') fail(errors, 'Wave 27 public-interest gate prerequisite absent');
  if (gate && !same(gate.source_refs, contract.institutional_source_refs)) fail(errors, 'Wave 27 gate ledger source custody drift');

  const eligible = publicRows.filter(row => contract.public_interest_eligible_refs.includes(row.closure_ref));
  const blocked = legislativeRows.filter(row => contract.legislative_blocked_refs.includes(row.closure_ref));
  if (eligible.length !== expected.eligible_tasks) fail(errors, 'Wave 27 eligible task count drift');
  if (blocked.length !== expected.preserved_blocked_tasks) fail(errors, 'Wave 27 blocked task count drift');
  if (!same(eligible.map(row => row.closure_ref).sort(), [...contract.public_interest_eligible_refs].sort())) fail(errors, 'Wave 27 eligible task set drift');
  if (!same(blocked.map(row => row.closure_ref).sort(), [...contract.legislative_blocked_refs].sort())) fail(errors, 'Wave 27 blocked task set drift');
  if (eligible.some(row => row.execution_state !== contract.eligible_source_state || row.executed_in_wave !== false || row.result_state !== null)) fail(errors, 'Wave 27 eligible source-state drift');
  if (blocked.some(row => row.execution_state !== contract.blocked_source_state || row.executed_in_wave !== false || row.result_state !== null)) fail(errors, 'Wave 27 blocked source-state drift');

  if (!unique(executionPlan.source_registry.map(row => row.source_ref))) fail(errors, 'duplicate Wave 27 source reference');
  if (!unique(executionPlan.task_plans.map(row => row.closure_ref))) fail(errors, 'duplicate Wave 27 task plan');
  if (!same(executionPlan.source_registry.map(row => row.source_ref), contract.institutional_source_refs)) fail(errors, 'Wave 27 source registry order or set drift');
  if (!same(executionPlan.task_plans.map(row => row.closure_ref).sort(), [...contract.public_interest_eligible_refs].sort())) fail(errors, 'Wave 27 plan task set drift');
  if (!same(executionPlan.preserved_blocked_refs, contract.legislative_blocked_refs)) fail(errors, 'Wave 27 preserved blocked set drift');
  if (executionPlan.task_plans.some(row => contract.legislative_blocked_refs.includes(row.closure_ref))) fail(errors, 'Wave 27 blocked task received plan');
  for (const plan of executionPlan.task_plans) {
    if (plan.result_state !== contract.result_state) fail(errors, plan.closure_ref + ': Wave 27 result state drift');
    if (!same(plan.source_refs, contract.institutional_source_refs)) fail(errors, plan.closure_ref + ': Wave 27 plan source custody drift');
    if (plan.source_refs.some(ref => contract.prohibited_gate_substitute_refs.includes(ref))) fail(errors, plan.closure_ref + ': research source used as institutional substitute');
    if (!plan.coverage_statement || !plan.negative_search_statement || !plan.correction_outcome) fail(errors, plan.closure_ref + ': incomplete Wave 27 acquisition plan');
    if (!plan.included_rows.length || !plan.unavailable_rows.length || !plan.refused_rows.length || !plan.correction_route.length) fail(errors, plan.closure_ref + ': incomplete Wave 27 result ledger content');
  }

  const expectedBuild = buildWave27(
    policy,
    wave26Projection,
    repairProjection,
    wave26Plan,
    publicRows,
    legislativeRows,
    rawInputs
  );
  if (!same(executionPlan, expectedBuild.executionPlan)) fail(errors, 'Wave 27 execution plan differs from deterministic build');
  if (!same(projection, expectedBuild.projection)) fail(errors, 'Wave 27 projection differs from deterministic build');
  for (const [relative, expectedRows] of Object.entries(expectedBuild.resultRowsByPath)) {
    if (!same(resultRowsByPath[relative], expectedRows)) fail(errors, relative + ': Wave 27 result ledger differs from deterministic build');
  }
  if (Object.keys(resultRowsByPath).length !== Object.keys(expectedBuild.resultRowsByPath).length) fail(errors, 'Wave 27 result-ledger path denominator drift');

  for (const [key, value] of Object.entries({
    source_queues: expected.source_queues,
    source_candidate_rows: expected.source_candidate_rows,
    eligible_tasks: expected.eligible_tasks,
    preserved_blocked_tasks: expected.preserved_blocked_tasks,
    execution_plans: expected.execution_plans,
    source_receipts: expected.source_receipts,
    source_receipt_uses: expected.source_receipt_uses,
    execution_ledgers: expected.execution_ledgers,
    queue_summary_rows: expected.queue_summary_rows,
    execution_result_rows: expected.execution_result_rows,
    execution_rows: expected.execution_rows,
    executed_tasks: expected.executed_tasks,
    partial_results: expected.partial_results,
    blocked_results: expected.blocked_results,
    complete_denominators: expected.complete_denominators,
    evidence_rows: expected.evidence_rows,
    finding_promotions: expected.finding_promotions,
    graph_effects: expected.graph_effects,
    publication_clearances: expected.publication_clearances
  })) if (projection.counts[key] !== value) fail(errors, key + ': Wave 27 count drift');

  const allResults = Object.values(resultRowsByPath).flat().filter(row => row.row_type === 'downstream_execution_result');
  const executed = allResults.filter(row => row.executed_in_wave);
  const preserved = allResults.filter(row => !row.executed_in_wave);
  if (executed.length !== expected.executed_tasks || executed.some(row => row.execution_state !== contract.executed_state || row.result_state !== 'partial')) fail(errors, 'Wave 27 executed-result state drift');
  if (preserved.length !== expected.preserved_blocked_tasks || preserved.some(row => row.execution_state !== contract.preserved_blocked_state || row.result_state !== null)) fail(errors, 'Wave 27 preserved-blocked state drift');
  for (const row of allResults) {
    if (row.complete_denominator !== false || row.evidence_adjudicated !== false || row.evidence_rows !== 0) fail(errors, row.closure_ref + ': Wave 27 evidence or denominator inflation');
    if (row.finding_promoted !== false || row.graph_effect !== 'none' || row.publication_status !== 'blocked') fail(errors, row.closure_ref + ': Wave 27 promotion drift');
  }

  if (!same(projection.graph_digests, graphDigestView)) fail(errors, 'Wave 27 graph digest drift');
  const required = requiredBasinPaths(policy);
  for (const [basinId, paths] of Object.entries(required)) {
    const basin = wave21Policy.basin_contract.find(row => row.basin_id === basinId);
    if (!basin) fail(errors, basinId + ': Wave 27 basin missing');
    for (const relative of paths) {
      if (!basin?.path_prefixes.includes(relative)) fail(errors, relative + ': Wave 27 basin path absent');
      if (!basin?.authoritative_entrypoints.includes(relative)) fail(errors, relative + ': Wave 27 authoritative entrypoint absent');
    }
  }
  for (const relative of [policy.paths.execution_plan, policy.paths.projection, resultPathFor('LAW21-EST-05', policy), resultPathFor('LAW21-EST-11', policy)]) {
    if (!wave21Policy.projection_contract.allowed_generated_paths.includes(relative)) fail(errors, relative + ': Wave 27 generated path not allowed');
  }
  return errors;
}

export function validateRepository(root = defaultRoot) {
  const policyPath = 'data/project/lake-allocator-war-public-interest-downstream-wave-27-policy.json';
  const policy = readJson(root, policyPath);
  const wave26ProjectionRaw = fs.readFileSync(full(root, policy.paths.source_wave26_projection), 'utf8');
  const repairProjectionRaw = fs.readFileSync(full(root, policy.paths.source_repair_projection), 'utf8');
  const wave26PlanRaw = fs.readFileSync(full(root, policy.paths.source_wave26_plan), 'utf8');
  const resultPaths = [resultPathFor('LAW21-EST-05', policy), resultPathFor('LAW21-EST-11', policy)];
  const resultRowsByPath = Object.fromEntries(resultPaths.map(relative => [relative, readJsonl(root, relative)]));
  const state = {
    policy,
    wave26Projection: JSON.parse(wave26ProjectionRaw),
    repairProjection: JSON.parse(repairProjectionRaw),
    wave26Plan: JSON.parse(wave26PlanRaw),
    publicRows: readJsonl(root, policy.paths.source_public_ledger),
    legislativeRows: readJsonl(root, policy.paths.source_legislative_ledger),
    executionPlan: readJson(root, policy.paths.execution_plan),
    projection: readJson(root, policy.paths.projection),
    resultRowsByPath,
    rawInputs: { wave26ProjectionRaw, repairProjectionRaw, wave26PlanRaw },
    graphDigestView: graphDigests(root),
    wave21Policy: readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json')
  };
  const errors = [...ancestryErrors(root, policy), ...validateArtifacts(state)];

  for (const relative of [policy.paths.report, policy.paths.method, policy.paths.milestone]) {
    if (!fs.existsSync(full(root, relative))) fail(errors, relative + ': required Wave 27 artifact absent');
  }
  if (fs.existsSync(full(root, policy.paths.report))) {
    const report = fs.readFileSync(full(root, policy.paths.report), 'utf8');
    if (!report.includes('eligible tasks executed:               2')) fail(errors, 'Wave 27 report executed count drift');
    if (!report.includes('complete denominators:                 0')) fail(errors, 'Wave 27 report denominator boundary drift');
    if (!report.includes('graph effects:                         0')) fail(errors, 'Wave 27 report graph boundary drift');
  }

  const lakePolicy = readJson(root, 'data/project/lake-index-policy.json');
  const requiredRoots = Object.values(requiredBasinPaths(policy)).flat();
  for (const relative of requiredRoots) if (!lakePolicy.authoritative_roots.includes(relative)) fail(errors, relative + ': missing Wave 27 authoritative root');

  const pkg = readJson(root, 'package.json');
  if (!pkg.scripts['build:lake-allocator-war-public-interest-downstream-wave-27']) fail(errors, 'Wave 27 builder script absent');
  if (!pkg.scripts['validate:lake-allocator-war-public-interest-downstream-wave-27']) fail(errors, 'Wave 27 validator script absent');
  if (!pkg.scripts.check.includes('validate:lake-allocator-war-public-interest-downstream-wave-27')) fail(errors, 'Wave 27 absent from complete release gate');

  for (const temporary of [
    '.github/tmp/wave27-public-interest-downstream-trigger.json',
    '.github/workflows/temporary-wave27-public-interest-downstream-materializer.yml',
    'tools/run-wave27-public-interest-downstream-materializer.sh'
  ]) if (fs.existsSync(full(root, temporary))) fail(errors, temporary + ': temporary Wave 27 transport retained');

  if (process.env.LAW27_SKIP_SHARDS !== '1') {
    const membershipPath = 'build/lake-index/basin-membership.jsonl';
    if (fs.existsSync(full(root, membershipPath))) {
      const membership = new Map(readJsonl(root, membershipPath).map(row => [row.path, row.basin_id]));
      for (const [basinId, paths] of Object.entries(requiredBasinPaths(policy))) {
        for (const relative of paths) if (membership.get(relative) !== basinId) fail(errors, relative + ': committed Wave 27 basin membership drift');
      }
    }
  }

  if (errors.length) throw new Error('allocator-war public-interest downstream Wave 27 validation failed:\n- ' + errors.join('\n- '));
  return {
    eligible: state.projection.counts.eligible_tasks,
    executed: state.projection.counts.executed_tasks,
    blocked: state.projection.counts.preserved_blocked_tasks,
    receipts: state.projection.counts.source_receipts,
    uses: state.projection.counts.source_receipt_uses
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = validateRepository();
  console.log('allocator-war public-interest downstream Wave 27 validation passed');
  console.log('  eligible / executed / blocked: ' + result.eligible + ' / ' + result.executed + ' / ' + result.blocked);
  console.log('  source receipts / uses: ' + result.receipts + ' / ' + result.uses);
  console.log('  complete denominators / evidence / findings / graph / publication: 0 / 0 / 0 / 0 / 0');
}
