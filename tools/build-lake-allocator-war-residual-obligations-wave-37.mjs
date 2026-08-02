#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_PATH = 'data/project/lake-allocator-war-residual-obligations-wave-37-policy.json';
const IMPLEMENTATION_PATH = 'tools/build-lake-allocator-war-residual-obligations-wave-37.mjs';

const full = (root, relative) => path.join(root, relative);
const readJson = (root, relative) => JSON.parse(fs.readFileSync(full(root, relative), 'utf8'));
const readJsonl = (root, relative) => fs.readFileSync(full(root, relative), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${relative}:${index + 1}: ${error.message}`); }
  });
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
};
const digestBytes = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const digestValue = value => digestBytes(Buffer.from(JSON.stringify(canonical(value))));
const digestFile = (root, relative) => digestBytes(fs.readFileSync(full(root, relative)));
const bytesFile = (root, relative) => fs.statSync(full(root, relative)).size;
const writeJson = (root, relative, value) => {
  const target = full(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};
const writeJsonl = (root, relative, rows) => {
  const target = full(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
};

function graphDigests(root) {
  return {
    participation_sha256: digestValue(readJsonl(root, 'data/ledger/participation.jsonl')),
    active_claims_sha256: digestValue(readJson(root, 'build/axm-identity.json').claims),
    hop_edges_sha256: digestValue(readJson(root, 'build/hop-graph.json').edges),
    rejected_hop_surfaces_sha256: digestValue(readJson(root, 'build/hop-graph.json').rejected_hop_surfaces),
    rejected_hop_pairs_sha256: digestValue(readJson(root, 'build/hop-graph.json').rejected_hop_pairs)
  };
}

function requireZeroAuthority(row, label) {
  const zeroFields = [
    'requirements_satisfied',
    'authorized_joins',
    'joined_rows',
    'complete_denominators',
    'evidence_rows',
    'estate_adoptions',
    'finding_promotions',
    'graph_effects',
    'publication_clearances'
  ];
  for (const key of zeroFields) {
    if (Number(row[key] ?? 0) !== 0) throw new Error(`${label}: ${key} must remain zero`);
  }
  for (const key of ['requirement_satisfied', 'join_authorized', 'complete_denominator', 'evidence_adjudicated', 'estate_adopted', 'finding_promoted']) {
    if (row[key] === true) throw new Error(`${label}: ${key} must remain false`);
  }
  if ((row.graph_effect ?? 'none') !== 'none') throw new Error(`${label}: graph effect must remain none`);
  if (row.publication_status && row.publication_status !== 'blocked') throw new Error(`${label}: publication status must remain blocked`);
}

function routePath(policy, contract) {
  return `${policy.paths.source_result_root}/${contract.route_class}.jsonl`;
}

function buildReport(projection) {
  const c = projection.counts;
  const lines = [
    '# Allocator-war residual institutional obligation adjudication Wave 37',
    '',
    '```text',
    `source route summaries / task results: ${c.source_route_summaries} / ${c.source_task_results}`,
    `route summaries / residual obligations: ${c.route_summaries} / ${c.residual_obligations}`,
    `component-observed / protected:          ${c.component_observed_obligations} / ${c.protected_access_obligations}`,
    `priority bands 1 / 2 / 3:                ${c.priority_band_1} / ${c.priority_band_2} / ${c.priority_band_3}`,
    `unclassified residual obligations:       ${c.unclassified_residual_obligations}`,
    `completion tests passed:                 ${c.completion_tests_passed}`,
    `requirements satisfied:                  ${c.requirements_satisfied}`,
    `authorized joins / joined rows:          ${c.authorized_joins} / ${c.joined_rows}`,
    `complete denominators / evidence rows:   ${c.complete_denominators} / ${c.evidence_rows}`,
    `findings / graph / publication:          ${c.finding_promotions} / ${c.graph_effects} / ${c.publication_clearances}`,
    '```',
    '',
    '| Route | Tasks | Components observed | Protected | Priority | Residual class |',
    '|---|---:|---:|---:|---:|---|'
  ];
  for (const row of projection.route_summaries) {
    lines.push(`| ${row.route_class} | ${row.task_count} | ${row.component_observed_tasks} | ${row.protected_access_tasks} | ${row.priority_band} | ${row.obligation_class} |`);
  }
  lines.push(
    '',
    'Wave 37 compares every permanent Wave 36 task result with its inherited completion test. Twenty-eight tasks retain official-record component custody and three retain protected lawful-access-only custody. Every completion test remains open because the observed components do not supply the complete institutional row named by the test.',
    '',
    'Priority bands order the next bounded acquisition work. They do not rank evidence strength, truth, harm, intent, or institutional importance. A record-holder response may be needed to obtain a source, but no outside reviewer or volunteer controls the internal classification of the residual obligation.',
    '',
    'The ledger preserves each exact completion gap and refused substitution. Component count, official provenance, repeated identifiers, docket presence, announced amounts, partial registers, and public workforce aggregates cannot be converted into requirement satisfaction or join authority.'
  );
  return `${lines.join('\n')}\n`;
}

export function constructArtifacts(root = defaultRoot) {
  const policy = readJson(root, POLICY_PATH);
  if (policy.schema_version !== 'lake-allocator-war-residual-obligations-wave-37-policy@1') {
    throw new Error('Wave 37 policy schema mismatch');
  }
  const sourcePolicy = readJson(root, policy.paths.source_policy);
  const sourceProjection = readJson(root, policy.paths.source_projection);
  if (sourcePolicy.schema_version !== policy.source_contract.required_policy_schema) throw new Error('Wave 36 policy schema drift');
  if (sourceProjection.schema_version !== policy.source_contract.required_projection_schema) throw new Error('Wave 36 projection schema drift');
  for (const [key, expected] of Object.entries({
    source_specs: policy.source_contract.source_specs,
    captures: policy.source_contract.captures,
    usable_official_records: policy.source_contract.usable_official_records,
    route_summaries: policy.source_contract.route_summaries,
    task_results: policy.source_contract.task_results,
    executed_public_or_lawful_tasks: policy.source_contract.executed_public_or_lawful_tasks,
    protected_tasks: policy.source_contract.protected_tasks,
    requirements_satisfied: 0,
    authorized_joins: 0,
    complete_denominators: 0,
    evidence_rows: 0
  })) {
    if (Number(sourceProjection.counts?.[key]) !== expected) throw new Error(`Wave 36 projection ${key} drift`);
  }

  const sourceFiles = [];
  const sourceRouteSummaries = [];
  const sourceTasks = [];
  const seenTaskRefs = new Set();
  for (const contract of policy.route_contracts) {
    const relative = routePath(policy, contract);
    const rows = readJsonl(root, relative);
    const summaries = rows.filter(row => row.row_type === 'public_acquisition_route_summary');
    const tasks = rows.filter(row => row.row_type === 'public_acquisition_task_result');
    if (summaries.length !== 1) throw new Error(`${relative}: expected one route summary`);
    const summary = summaries[0];
    if (summary.route_class !== contract.route_class) throw new Error(`${relative}: route summary class drift`);
    if (tasks.length !== summary.task_count) throw new Error(`${relative}: task count drift`);
    requireZeroAuthority(summary, `${relative}:summary`);
    sourceRouteSummaries.push(summary);
    for (const task of tasks) {
      if (task.route_class !== contract.route_class) throw new Error(`${task.source_task_ref}: route class drift`);
      if (seenTaskRefs.has(task.source_task_ref)) throw new Error(`${task.source_task_ref}: duplicate source task`);
      seenTaskRefs.add(task.source_task_ref);
      requireZeroAuthority(task, task.source_task_ref);
      sourceTasks.push({ task, contract, source_path: relative });
    }
    sourceFiles.push({
      path: relative,
      bytes: bytesFile(root, relative),
      sha256: digestFile(root, relative),
      route_class: contract.route_class,
      route_summary_rows: 1,
      task_rows: tasks.length
    });
  }
  if (sourceRouteSummaries.length !== policy.expected_counts.source_route_summaries) throw new Error('Wave 37 source route-summary denominator drift');
  if (sourceTasks.length !== policy.expected_counts.source_task_results) throw new Error('Wave 37 source task denominator drift');

  const obligations = sourceTasks.map(({ task, contract, source_path }) => {
    const protectedAccess = Boolean(task.protected_lawful_access_only);
    if (protectedAccess !== contract.protected_lawful_access_only) throw new Error(`${task.source_task_ref}: protected boundary drift`);
    const componentCount = Number(task.public_record_component_count ?? 0);
    if (protectedAccess) {
      if (task.executed_in_wave !== false || Number(task.network_requests_performed ?? 0) !== 0 || componentCount !== 0) {
        throw new Error(`${task.source_task_ref}: protected task acquired public components`);
      }
      if (task.result_state !== 'preserved_authorized_lawful_access_only') throw new Error(`${task.source_task_ref}: protected result-state drift`);
    } else {
      if (task.executed_in_wave !== true || componentCount < 1) throw new Error(`${task.source_task_ref}: executable task lacks component custody`);
      if (task.result_state !== 'source_backed_component_recovery') throw new Error(`${task.source_task_ref}: component result-state drift`);
    }
    if (!task.completion_test || !task.completion_gap || !task.refused_substitution) {
      throw new Error(`${task.source_task_ref}: incomplete inherited completion contract`);
    }
    return {
      schema_version: 'lake-allocator-war-residual-obligation-wave-37@1',
      row_type: 'residual_institutional_obligation',
      program_ref: policy.program_ref,
      wave_ref: policy.wave_ref,
      obligation_ref: `LAW37-${task.source_task_ref}`,
      obligation_sequence: task.source_task_sequence,
      priority_sequence: null,
      priority_band: contract.priority_band,
      source_result_ref: task.result_ref,
      source_result_sha256: digestValue(task),
      source_result_path: source_path,
      source_task_ref: task.source_task_ref,
      source_task_sequence: task.source_task_sequence,
      source_queue_ref: task.source_queue_ref,
      source_join_ref: task.source_join_ref,
      source_requirement_ref: task.source_requirement_ref,
      source_join_row_sha256: task.source_join_row_sha256,
      source_requirement_sha256: task.source_requirement_sha256,
      route_class: task.route_class,
      route_owner: task.route_owner,
      access_class: task.access_class,
      target_row: task.target_row,
      obligation_class: contract.obligation_class,
      next_access_route: contract.next_access_route,
      record_holder_response_may_be_required: contract.record_holder_response_may_be_required,
      protected_lawful_access_only: protectedAccess,
      component_custody_state: protectedAccess ? 'protected_access_not_attempted' : 'official_components_observed',
      adjudication_state: protectedAccess ? 'protected_access_obligation_preserved' : 'component_observed_completion_test_open',
      source_refs: [...(task.source_refs ?? [])],
      capture_refs: [...(task.capture_refs ?? [])],
      response_file_count: Number(task.response_file_count ?? 0),
      public_record_refs: [...(task.public_record_refs ?? [])],
      public_record_component_count: componentCount,
      public_record_component_hashes: [...(task.public_record_component_hashes ?? [])],
      completion_test: task.completion_test,
      completion_gap: task.completion_gap,
      refused_substitution: task.refused_substitution,
      completion_test_passed: false,
      residual_requirement_open: true,
      external_human_review_required_to_classify: false,
      magic_human_gate: false,
      reversible_internal_classification: true,
      priority_is_evidence_strength: false,
      requirement_satisfied: false,
      task_execution_authorizes_join: false,
      join_authorized: false,
      joined_rows: 0,
      complete_denominator: false,
      evidence_adjudicated: false,
      evidence_rows: 0,
      estate_adopted: false,
      finding_promoted: false,
      blocked_promotions: [...policy.blocked_promotions],
      graph_effect: 'none',
      publication_status: 'blocked'
    };
  });

  const priorityOrder = [...obligations].sort((a, b) => a.priority_band - b.priority_band
    || a.source_task_sequence - b.source_task_sequence
    || a.obligation_ref.localeCompare(b.obligation_ref));
  priorityOrder.forEach((row, index) => { row.priority_sequence = index + 1; });
  obligations.sort((a, b) => a.source_task_sequence - b.source_task_sequence);

  const routeSummaries = policy.route_contracts.map(contract => {
    const rows = obligations.filter(row => row.route_class === contract.route_class);
    return {
      schema_version: 'lake-allocator-war-residual-route-summary-wave-37@1',
      row_type: 'residual_obligation_route_summary',
      program_ref: policy.program_ref,
      wave_ref: policy.wave_ref,
      route_ref: `LAW37-Q${String(contract.route_sequence).padStart(3, '0')}`,
      route_sequence: contract.route_sequence,
      route_class: contract.route_class,
      route_owner: rows[0]?.route_owner ?? null,
      obligation_class: contract.obligation_class,
      next_access_route: contract.next_access_route,
      priority_band: contract.priority_band,
      record_holder_response_may_be_required: contract.record_holder_response_may_be_required,
      task_count: rows.length,
      component_observed_tasks: rows.filter(row => row.component_custody_state === 'official_components_observed').length,
      protected_access_tasks: rows.filter(row => row.protected_lawful_access_only).length,
      public_record_component_uses: rows.reduce((sum, row) => sum + row.public_record_component_count, 0),
      residual_obligations: rows.length,
      unclassified_residual_obligations: rows.filter(row => !row.obligation_class || !row.next_access_route).length,
      completion_tests_passed: 0,
      requirements_satisfied: 0,
      authorized_joins: 0,
      complete_denominators: 0,
      evidence_rows: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0,
      external_human_review_required_to_classify: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    };
  });

  const ledger = [];
  for (const contract of policy.route_contracts) {
    ledger.push(routeSummaries.find(row => row.route_class === contract.route_class));
    ledger.push(...obligations.filter(row => row.route_class === contract.route_class));
  }
  const counts = {
    source_route_summaries: sourceRouteSummaries.length,
    source_task_results: sourceTasks.length,
    route_summaries: routeSummaries.length,
    residual_obligations: obligations.length,
    component_observed_obligations: obligations.filter(row => row.component_custody_state === 'official_components_observed').length,
    protected_access_obligations: obligations.filter(row => row.protected_lawful_access_only).length,
    priority_band_1: obligations.filter(row => row.priority_band === 1).length,
    priority_band_2: obligations.filter(row => row.priority_band === 2).length,
    priority_band_3: obligations.filter(row => row.priority_band === 3).length,
    unclassified_residual_obligations: obligations.filter(row => !row.obligation_class || !row.next_access_route).length,
    completion_tests_passed: obligations.filter(row => row.completion_test_passed).length,
    requirements_satisfied: obligations.filter(row => row.requirement_satisfied).length,
    authorized_joins: obligations.filter(row => row.join_authorized).length,
    joined_rows: obligations.reduce((sum, row) => sum + row.joined_rows, 0),
    complete_denominators: obligations.filter(row => row.complete_denominator).length,
    evidence_rows: obligations.reduce((sum, row) => sum + row.evidence_rows, 0),
    estate_adoptions: obligations.filter(row => row.estate_adopted).length,
    finding_promotions: obligations.filter(row => row.finding_promoted).length,
    graph_effects: obligations.filter(row => row.graph_effect !== 'none').length,
    publication_clearances: obligations.filter(row => row.publication_status !== 'blocked').length
  };
  for (const [key, expected] of Object.entries(policy.expected_counts)) {
    if (counts[key] !== expected) throw new Error(`Wave 37 ${key} expected ${expected}, observed ${counts[key]}`);
  }

  const projection = {
    schema_version: 'lake-allocator-war-residual-obligations-wave-37@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    title: policy.title,
    authority: 'residual_obligation_classification_only',
    source_policy: POLICY_PATH,
    source_wave36_policy: policy.paths.source_policy,
    source_wave36_projection: policy.paths.source_projection,
    generated_from: {
      policy_sha256: digestFile(root, POLICY_PATH),
      source_policy_sha256: digestFile(root, policy.paths.source_policy),
      source_projection_sha256: digestFile(root, policy.paths.source_projection),
      builder_implementation_sha256: digestFile(root, IMPLEMENTATION_PATH),
      route_files: sourceFiles
    },
    counts,
    graph_digests: graphDigests(root),
    route_summaries: routeSummaries,
    residual_obligations: obligations,
    boundaries: { ...policy.boundaries }
  };
  const report = buildReport(projection);
  return { policy, projection, ledger, report };
}

export function writeArtifacts(root = defaultRoot) {
  const artifacts = constructArtifacts(root);
  writeJsonl(root, artifacts.policy.paths.ledger, artifacts.ledger);
  writeJson(root, artifacts.policy.paths.projection, artifacts.projection);
  fs.mkdirSync(path.dirname(full(root, artifacts.policy.paths.report)), { recursive: true });
  fs.writeFileSync(full(root, artifacts.policy.paths.report), artifacts.report);
  return artifacts;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const { projection } = writeArtifacts(defaultRoot);
  const c = projection.counts;
  console.log('allocator-war residual institutional obligations Wave 37 built');
  console.log(`  source route summaries / tasks: ${c.source_route_summaries} / ${c.source_task_results}`);
  console.log(`  route summaries / obligations: ${c.route_summaries} / ${c.residual_obligations}`);
  console.log(`  component observed / protected: ${c.component_observed_obligations} / ${c.protected_access_obligations}`);
  console.log(`  priority bands 1/2/3: ${c.priority_band_1}/${c.priority_band_2}/${c.priority_band_3}`);
  console.log(`  requirements / joins / evidence / findings / graph / publication: ${c.requirements_satisfied} / ${c.authorized_joins} / ${c.evidence_rows} / ${c.finding_promotions} / ${c.graph_effects} / ${c.publication_clearances}`);
}
