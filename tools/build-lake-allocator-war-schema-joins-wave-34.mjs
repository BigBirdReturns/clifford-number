#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const full = relative => path.join(root, relative);
const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const readJsonl = relative => fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const writeJson = (relative, value) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), JSON.stringify(value, null, 2) + '\n');
};
const writeJsonl = (relative, rows) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), rows.map(row => JSON.stringify(row)).join('\n') + '\n');
};
const writeText = (relative, value) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), value);
};
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
};
const canonicalJson = value => JSON.stringify(canonical(value));
const countBy = (rows, key) => Object.fromEntries(
  [...new Set(rows.map(row => row[key]))].sort().map(value => [value, rows.filter(row => row[key] === value).length])
);

function getPath(value, dottedPath) {
  const segments = dottedPath.split('.');
  let current = value;
  for (const segment of segments) {
    if (!segment) continue;
    if (current === null || current === undefined || typeof current !== 'object' || !(segment in current)) {
      return { found: false, value: undefined };
    }
    current = current[segment];
  }
  return { found: true, value: current };
}

function jsonTerminalKey(jsonPath) {
  const normalized = jsonPath.replace(/\[\]/g, '');
  const parts = normalized.replace(/^\$\.?/, '').split('.').filter(Boolean);
  return parts.at(-1) ?? null;
}

function observedMapping(parseRow, mapping) {
  const structure = parseRow.structure;
  switch (mapping.mapping_basis ?? mapping.handle_basis) {
    case 'json_key': {
      if (parseRow.parse_state !== 'parsed_json_structure' || !structure) return false;
      const key = jsonTerminalKey(mapping.source_path);
      return Boolean(key && Object.prototype.hasOwnProperty.call(structure.key_occurrences ?? {}, key));
    }
    case 'json_array': {
      if (parseRow.parse_state !== 'parsed_json_structure' || !structure) return false;
      return (structure.candidate_arrays ?? []).some(row => row.path === mapping.source_path && row.state === 'array_observed');
    }
    case 'structural_metric':
      return getPath(parseRow, mapping.source_path).found;
    case 'http_status':
      return Number.isInteger(parseRow.source_response_status);
    case 'access_boundary':
      return parseRow.parse_state === 'credential_boundary_preserved' && getPath(parseRow, mapping.source_path).found;
    default:
      return false;
  }
}

function routeUseIndex(sourceProjection) {
  const routeRefsBySource = new Map();
  const taskRefsBySource = new Map();
  for (const route of sourceProjection.routes) {
    for (const sourceRef of route.source_refs) {
      if (!routeRefsBySource.has(sourceRef)) routeRefsBySource.set(sourceRef, new Set());
      routeRefsBySource.get(sourceRef).add(route.route_ref);
    }
  }
  for (const task of sourceProjection.tasks) {
    for (const sourceRef of task.source_refs) {
      if (!taskRefsBySource.has(sourceRef)) taskRefsBySource.set(sourceRef, new Set());
      taskRefsBySource.get(sourceRef).add(task.source_task_ref);
    }
  }
  return { routeRefsBySource, taskRefsBySource };
}

function authorityBoundary(policy) {
  return {
    mapping_authority: 'source_schema_and_join_requirements_only',
    join_authorized: false,
    joined_rows: 0,
    complete_denominator: false,
    evidence_adjudicated: false,
    evidence_rows: 0,
    estate_adopted: false,
    finding_promoted: false,
    blocked_promotions: policy.blocked_promotions,
    graph_effect: 'none',
    publication_status: 'blocked'
  };
}

export function buildSchemaAndJoins(inputs) {
  const { policy, plan, sourcePolicy, sourcePlan, sourceProjection, sourceRows, wave21Receipt, implementationFingerprint } = inputs;
  const parseByRef = new Map(sourceRows.map(row => [row.parse_ref, row]));
  const parseBySource = new Map(sourceRows.map(row => [row.source_ref, row]));
  const { routeRefsBySource, taskRefsBySource } = routeUseIndex(sourceProjection);

  const adapterRows = plan.adapters.map(spec => {
    const parseRow = parseByRef.get(spec.parse_ref);
    if (!parseRow) throw new Error(`${spec.adapter_ref}: source parse absent`);
    if (parseRow.source_ref !== spec.source_ref) throw new Error(`${spec.adapter_ref}: source reference drift`);
    for (const mapping of spec.field_mappings) {
      if (!observedMapping(parseRow, mapping)) throw new Error(`${spec.adapter_ref}: unobserved field mapping ${mapping.source_path}`);
    }
    for (const handle of spec.structural_handles) {
      if (!observedMapping(parseRow, handle)) throw new Error(`${spec.adapter_ref}: unobserved structural handle ${handle.source_path}`);
    }
    for (const exclusion of spec.sensitive_exclusions) {
      const key = jsonTerminalKey(exclusion.source_path);
      if (parseRow.parse_state !== 'parsed_json_structure' || !key || !Object.prototype.hasOwnProperty.call(parseRow.structure?.key_occurrences ?? {}, key)) {
        throw new Error(`${spec.adapter_ref}: sensitive exclusion not structurally observed`);
      }
      if (exclusion.projected !== false || exclusion.join_authority !== false) throw new Error(`${spec.adapter_ref}: sensitive exclusion authority drift`);
    }
    const mappedPaths = new Set(spec.field_mappings.map(row => row.source_path));
    const handlePaths = new Set(spec.structural_handles.map(row => row.source_path));
    for (const exclusion of spec.sensitive_exclusions) {
      if (mappedPaths.has(exclusion.source_path) || handlePaths.has(exclusion.source_path)) {
        throw new Error(`${spec.adapter_ref}: sensitive exclusion reused as mapped surface`);
      }
    }
    return {
      schema_version: 'lake-allocator-war-schema-adapter-wave-34@1',
      row_type: 'source_schema_adapter',
      program_ref: policy.program_ref,
      wave_ref: policy.wave_ref,
      adapter_ref: spec.adapter_ref,
      adapter_sequence: spec.adapter_sequence,
      adapter_profile: spec.adapter_profile,
      parse_ref: parseRow.parse_ref,
      snapshot_ref: parseRow.snapshot_ref,
      source_ref: parseRow.source_ref,
      source_title: parseRow.source_title,
      publisher: parseRow.publisher,
      parser_profile: parseRow.parser_profile,
      parse_state: parseRow.parse_state,
      source_parse_row_sha256: sha256(canonicalJson(parseRow)),
      adapter_spec_sha256: sha256(canonicalJson(spec)),
      field_mappings: spec.field_mappings,
      structural_handles: spec.structural_handles,
      sensitive_exclusions: spec.sensitive_exclusions,
      route_refs: [...(routeRefsBySource.get(spec.source_ref) ?? [])].sort(),
      task_refs: [...(taskRefsBySource.get(spec.source_ref) ?? [])].sort(),
      route_use_count: routeRefsBySource.get(spec.source_ref)?.size ?? 0,
      task_use_count: taskRefsBySource.get(spec.source_ref)?.size ?? 0,
      mapping_state: spec.mapping_state,
      limits: spec.limits,
      ...authorityBoundary(policy)
    };
  });

  const adapterBySource = new Map(adapterRows.map(row => [row.source_ref, row]));
  const routeByRef = new Map(sourceProjection.routes.map(row => [row.route_ref, row]));
  const joinRows = plan.join_contracts.map(spec => {
    const route = routeByRef.get(spec.route_ref);
    if (!route) throw new Error(`${spec.join_ref}: source route absent`);
    if (route.route_class !== spec.route_class || route.route_owner !== spec.route_owner) throw new Error(`${spec.join_ref}: route custody drift`);
    if (route.source_refs.length > 0 && canonicalJson([...route.source_refs].sort()) !== canonicalJson([...spec.source_refs].sort())) {
      throw new Error(`${spec.join_ref}: public route source set drift`);
    }
    const adapterRefs = spec.source_refs.map(sourceRef => {
      const adapter = adapterBySource.get(sourceRef);
      if (!adapter) throw new Error(`${spec.join_ref}: adapter absent for ${sourceRef}`);
      return adapter.adapter_ref;
    });
    if (spec.join_authorized !== false || spec.joined_rows !== 0 || spec.complete_denominator !== false) {
      throw new Error(`${spec.join_ref}: source plan attempts join promotion`);
    }
    if (spec.missing_requirements.some(row => row.satisfied !== false)) throw new Error(`${spec.join_ref}: requirement satisfaction drift`);
    return {
      schema_version: 'lake-allocator-war-lawful-join-contract-wave-34@1',
      row_type: 'lawful_join_contract',
      program_ref: policy.program_ref,
      wave_ref: policy.wave_ref,
      join_ref: spec.join_ref,
      join_sequence: spec.join_sequence,
      route_ref: spec.route_ref,
      route_class: spec.route_class,
      route_owner: spec.route_owner,
      title: spec.title,
      route_public_execution: route.public_execution,
      source_refs: spec.source_refs,
      adapter_refs: adapterRefs,
      candidate_key_classes: spec.candidate_key_classes,
      missing_requirements: spec.missing_requirements,
      requirement_access_classes: countBy(spec.missing_requirements, 'access_class'),
      join_state: spec.join_state,
      refusal_rule: spec.refusal_rule,
      join_spec_sha256: sha256(canonicalJson(spec)),
      ...authorityBoundary(policy)
    };
  });

  const sourceUseCount = sourceProjection.tasks.reduce((sum, row) => sum + row.source_refs.length, 0);
  const requirementRows = joinRows.flatMap(row => row.missing_requirements);
  const projection = {
    schema_version: 'lake-allocator-war-schema-joins-wave-34@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    generated_from: {
      policy_path: 'data/project/lake-allocator-war-schema-joins-wave-34-policy.json',
      policy_sha256: sha256(JSON.stringify(policy, null, 2) + '\n'),
      plan_path: policy.paths.schema_join_plan,
      plan_sha256: sha256(JSON.stringify(plan, null, 2) + '\n'),
      source_policy_path: policy.paths.source_policy,
      source_policy_sha256: sha256(JSON.stringify(sourcePolicy, null, 2) + '\n'),
      source_plan_path: policy.paths.source_plan,
      source_plan_sha256: sha256(JSON.stringify(sourcePlan, null, 2) + '\n'),
      source_projection_path: policy.paths.source_projection,
      source_projection_sha256: sha256(JSON.stringify(sourceProjection, null, 2) + '\n'),
      source_parse_ledger_path: policy.paths.source_parse_ledger,
      builder_implementation_path: implementationFingerprint.path,
      builder_implementation_sha256: implementationFingerprint.sha256
    },
    counts: {
      source_routes: sourceProjection.counts.source_routes,
      source_tasks: sourceProjection.counts.source_tasks,
      source_receipts: sourceProjection.counts.source_receipts,
      source_receipt_uses: sourceUseCount,
      schema_adapters: adapterRows.length,
      adapter_profiles: new Set(adapterRows.map(row => row.adapter_profile)).size,
      declared_field_mappings: adapterRows.reduce((sum, row) => sum + row.field_mappings.length, 0),
      structural_handles: adapterRows.reduce((sum, row) => sum + row.structural_handles.length, 0),
      sensitive_exclusions: adapterRows.reduce((sum, row) => sum + row.sensitive_exclusions.length, 0),
      adapter_states: countBy(adapterRows, 'mapping_state'),
      lawful_join_contracts: joinRows.length,
      candidate_key_classes: joinRows.reduce((sum, row) => sum + row.candidate_key_classes.length, 0),
      missing_institutional_requirements: requirementRows.length,
      requirement_access_classes: countBy(requirementRows, 'access_class'),
      authorized_joins: 0,
      joined_rows: 0,
      complete_denominators: 0,
      evidence_rows: 0,
      estate_adoptions: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    },
    graph_digests: wave21Receipt.graph_digests,
    schema_adapters: adapterRows.map(row => ({
      adapter_ref: row.adapter_ref,
      adapter_sequence: row.adapter_sequence,
      adapter_profile: row.adapter_profile,
      parse_ref: row.parse_ref,
      source_ref: row.source_ref,
      parse_state: row.parse_state,
      field_mapping_count: row.field_mappings.length,
      structural_handle_count: row.structural_handles.length,
      sensitive_exclusion_count: row.sensitive_exclusions.length,
      route_refs: row.route_refs,
      task_use_count: row.task_use_count,
      join_authorized: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    })),
    lawful_join_contracts: joinRows.map(row => ({
      join_ref: row.join_ref,
      join_sequence: row.join_sequence,
      route_ref: row.route_ref,
      route_class: row.route_class,
      route_owner: row.route_owner,
      source_refs: row.source_refs,
      adapter_refs: row.adapter_refs,
      candidate_key_classes: row.candidate_key_classes,
      missing_requirements: row.missing_requirements,
      requirement_access_classes: row.requirement_access_classes,
      join_state: row.join_state,
      join_authorized: false,
      joined_rows: 0,
      complete_denominator: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    })),
    execution_contract: {
      one_adapter_per_source_parse: true,
      network_requests_performed: 0,
      source_parse_rows_reused: true,
      structurally_observed_mapping_required: true,
      sensitive_exclusions_applied_before_projection: true,
      candidate_keys_authorize_join: false,
      all_join_requirements_unsatisfied: true,
      protected_personnel_public_substitution: false,
      authorized_join_created: false
    },
    boundaries: policy.boundaries
  };

  return { adapterRows, joinRows, projection };
}

export function renderReport(projection) {
  const lines = [
    '# Allocator-war source schemas and lawful joins Wave 34',
    '',
    '```text',
    `source routes / tasks:                  ${projection.counts.source_routes} / ${projection.counts.source_tasks}`,
    `source receipts / uses:                 ${projection.counts.source_receipts} / ${projection.counts.source_receipt_uses}`,
    `schema adapters / profiles:             ${projection.counts.schema_adapters} / ${projection.counts.adapter_profiles}`,
    `declared field mappings:                ${projection.counts.declared_field_mappings}`,
    `structural handles:                     ${projection.counts.structural_handles}`,
    `sensitive exclusions:                   ${projection.counts.sensitive_exclusions}`,
    `lawful join contracts:                  ${projection.counts.lawful_join_contracts}`,
    `candidate key classes:                  ${projection.counts.candidate_key_classes}`,
    `missing institutional requirements:     ${projection.counts.missing_institutional_requirements}`,
    `requirement access classes:             ${JSON.stringify(projection.counts.requirement_access_classes)}`,
    'authorized joins / joined rows:         0 / 0',
    'complete denominators:                  0',
    'evidence rows:                          0',
    'estate adoptions:                       0',
    'finding promotions:                     0',
    'graph effects:                          0',
    'publication clearances:                 0',
    '```',
    '',
    '| Adapter | Parse | Source | Profile | Mappings | Handles | Exclusions | Route uses | Task uses |',
    '|---|---|---|---|---:|---:|---:|---:|---:|'
  ];
  for (const row of projection.schema_adapters) {
    lines.push(`| ${row.adapter_ref} | ${row.parse_ref} | ${row.source_ref} | ${row.adapter_profile} | ${row.field_mapping_count} | ${row.structural_handle_count} | ${row.sensitive_exclusion_count} | ${row.route_refs.length} | ${row.task_use_count} |`);
  }
  lines.push('', '| Join | Route class | Candidate keys | Missing requirements | Access classes | State |', '|---|---|---:|---:|---|---|');
  for (const row of projection.lawful_join_contracts) {
    lines.push(`| ${row.join_ref} | ${row.route_class} | ${row.candidate_key_classes.length} | ${row.missing_requirements.length} | ${JSON.stringify(row.requirement_access_classes)} | ${row.join_state} |`);
  }
  lines.push(
    '',
    'Wave 34 maps only source shapes already frozen by Wave 33. It performs no network request, excludes the observed Grants.gov token before projection, and preserves HTTP errors and credentialed systems as access outcomes.',
    '',
    'A source field or candidate identifier may support later reconciliation. It does not authorize a join, complete an institutional denominator, prove identity or relationship, adjudicate evidence, promote a finding, alter the graph, or clear publication.',
    ''
  );
  return lines.join('\n');
}

export function loadInputs() {
  const policyPath = 'data/project/lake-allocator-war-schema-joins-wave-34-policy.json';
  const policy = readJson(policyPath);
  const plan = readJson(policy.paths.schema_join_plan);
  const sourcePolicy = readJson(policy.paths.source_policy);
  const sourcePlan = readJson(policy.paths.source_plan);
  const sourceProjection = readJson(policy.paths.source_projection);
  const sourceRows = readJsonl(policy.paths.source_parse_ledger);
  const wave21Receipt = readJson('data/project/lake-allocator-war-wave-21.json');
  const implementationPath = 'tools/build-lake-allocator-war-schema-joins-wave-34.mjs';
  const implementationFingerprint = { path: implementationPath, sha256: sha256(fs.readFileSync(full(implementationPath))) };
  return { policy, plan, sourcePolicy, sourcePlan, sourceProjection, sourceRows, wave21Receipt, implementationFingerprint };
}

export function runBuild() {
  const inputs = loadInputs();
  const { adapterRows, joinRows, projection } = buildSchemaAndJoins(inputs);
  writeJsonl(inputs.policy.paths.adapter_ledger, adapterRows);
  writeJsonl(inputs.policy.paths.join_ledger, joinRows);
  writeJson(inputs.policy.paths.projection, projection);
  writeText(inputs.policy.paths.report, renderReport(projection));
  return projection;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const projection = runBuild();
  console.log('allocator-war source schemas and lawful joins Wave 34 built');
  console.log(`  routes / tasks / sources / adapters: ${projection.counts.source_routes} / ${projection.counts.source_tasks} / ${projection.counts.source_receipts} / ${projection.counts.schema_adapters}`);
  console.log(`  mappings / handles / exclusions: ${projection.counts.declared_field_mappings} / ${projection.counts.structural_handles} / ${projection.counts.sensitive_exclusions}`);
  console.log(`  joins / keys / missing requirements: ${projection.counts.lawful_join_contracts} / ${projection.counts.candidate_key_classes} / ${projection.counts.missing_institutional_requirements}`);
  console.log('  authorized joins / evidence / findings / graph / publication: 0 / 0 / 0 / 0 / 0');
}
