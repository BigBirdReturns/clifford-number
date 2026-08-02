#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildSchemaAndJoins, renderReport } from './build-lake-allocator-war-schema-joins-wave-34.mjs';

const defaultRoot = process.cwd();
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
};
const canonicalJson = value => JSON.stringify(canonical(value));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const countBy = (rows, key) => Object.fromEntries(
  [...new Set(rows.map(row => row[key]))].sort().map(value => [value, rows.filter(row => row[key] === value).length])
);
const unique = rows => new Set(rows).size === rows.length;

function full(root, relative) { return path.join(root, relative); }
function readJson(root, relative) { return JSON.parse(fs.readFileSync(full(root, relative), 'utf8')); }
function readJsonl(root, relative) { return fs.readFileSync(full(root, relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); }
function readText(root, relative) { return fs.readFileSync(full(root, relative), 'utf8'); }
function exists(root, relative) { return fs.existsSync(full(root, relative)); }

export function ensureAncestry(root, requiredCommit) {
  if (!fs.existsSync(path.join(root, '.git'))) {
    if (process.env.GITHUB_ACTIONS === 'true') throw new Error('Wave 34 ancestry cannot be checked without Git metadata');
    return 'not_checked_no_git_metadata';
  }
  const available = spawnSync('git', ['cat-file', '-e', `${requiredCommit}^{commit}`], { cwd: root, encoding: 'utf8' });
  if (available.status !== 0) {
    if (process.env.GITHUB_ACTIONS === 'true') throw new Error(`Wave 34 base checkpoint unavailable: ${requiredCommit}`);
    return 'not_checked_local_archive_missing_historical_commit';
  }
  const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', requiredCommit, 'HEAD'], { cwd: root, encoding: 'utf8' });
  if (ancestor.status !== 0) throw new Error('Wave 34 base checkpoint is not an ancestor');
  return 'verified_ancestor';
}

export function loadState(root = defaultRoot) {
  const policyPath = 'data/project/lake-allocator-war-schema-joins-wave-34-policy.json';
  const policy = readJson(root, policyPath);
  const plan = readJson(root, policy.paths.schema_join_plan);
  const sourcePolicy = readJson(root, policy.paths.source_policy);
  const sourcePlan = readJson(root, policy.paths.source_plan);
  const sourceProjection = readJson(root, policy.paths.source_projection);
  const sourceRows = readJsonl(root, policy.paths.source_parse_ledger);
  const wave21Receipt = readJson(root, 'data/project/lake-allocator-war-wave-21.json');
  const implementationPath = 'tools/build-lake-allocator-war-schema-joins-wave-34.mjs';
  return {
    root,
    policy,
    plan,
    sourcePolicy,
    sourcePlan,
    sourceProjection,
    sourceRows,
    wave21Receipt,
    implementationFingerprint: { path: implementationPath, sha256: sha256(fs.readFileSync(full(root, implementationPath))) },
    adapterRows: readJsonl(root, policy.paths.adapter_ledger),
    joinRows: readJsonl(root, policy.paths.join_ledger),
    projection: readJson(root, policy.paths.projection),
    report: readText(root, policy.paths.report),
    wave21Policy: readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json'),
    lakeIndexPolicy: readJson(root, 'data/project/lake-index-policy.json'),
    basinRegistry: readJson(root, 'data/project/lake-basin-registry.json'),
    packageJson: readJson(root, 'package.json'),
    installer: readText(root, 'tools/install-lake-allocator-war-wave-21.mjs'),
    wave21Validator: readText(root, 'tools/validate-lake-allocator-war-wave-21.mjs'),
    workflow: readText(root, '.github/workflows/lake-allocator-war-schema-joins-wave-34.yml'),
    readme: readText(root, 'README.md'),
    buildInstructions: readText(root, 'BUILD-INSTRUCTIONS.md'),
    temporaryTriggerPresent: exists(root, '.github/tmp/wave34-tree-export-trigger.json')
  };
}

function validateExpectedCounts(actual, expected, label) {
  for (const [key, value] of Object.entries(expected)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      assert(canonicalJson(actual[key]) === canonicalJson(value), `${label}.${key} count drift`);
    } else {
      assert(actual[key] === value, `${label}.${key} count drift: expected ${value}, observed ${actual[key]}`);
    }
  }
}

export function validateState(state, options = {}) {
  const { policy, plan, sourcePolicy, sourcePlan, sourceProjection, sourceRows, wave21Receipt } = state;
  assert(policy.schema_version === 'lake-allocator-war-schema-joins-wave-34-policy@1', 'Wave 34 policy schema drift');
  assert(plan.schema_version === 'lake-allocator-war-schema-joins-wave-34-plan@1', 'Wave 34 plan schema drift');
  assert(policy.program_ref === 'CN-LAKE-ALLOCATOR-WAR-W34' && policy.wave_ref === 'LAW-W34', 'Wave 34 identifiers drift');
  assert(sourcePolicy.schema_version === policy.source_contract.required_policy_schema, 'Wave 33 policy contract drift');
  assert(sourcePlan.schema_version === policy.source_contract.required_plan_schema, 'Wave 33 plan contract drift');
  assert(sourceProjection.schema_version === policy.source_contract.required_projection_schema, 'Wave 33 projection contract drift');
  assert(sourceProjection.counts.source_routes === 7 && sourceProjection.counts.source_tasks === 38, 'Wave 33 route/task denominator drift');
  assert(sourceProjection.counts.source_receipts === 19 && sourceProjection.counts.source_receipt_uses === 153, 'Wave 33 source denominator drift');
  assert(sourceRows.length === 19, 'Wave 33 parse-row denominator drift');
  assert(sourceProjection.execution_contract.network_requests_performed === 0, 'Wave 33 network-request boundary drift');

  assert(plan.adapters.length === 19, 'Wave 34 adapter denominator drift');
  assert(plan.join_contracts.length === 7, 'Wave 34 join denominator drift');
  assert(unique(plan.adapters.map(row => row.adapter_ref)), 'Wave 34 adapter references must be unique');
  assert(unique(plan.adapters.map(row => row.adapter_profile)), 'Wave 34 adapter profiles must be source-specific and unique');
  assert(unique(plan.adapters.map(row => row.parse_ref)), 'Wave 34 parses must be adapted exactly once');
  assert(unique(plan.adapters.map(row => row.source_ref)), 'Wave 34 sources must be adapted exactly once');
  assert(canonicalJson([...plan.adapters.map(row => row.parse_ref)].sort()) === canonicalJson([...sourceRows.map(row => row.parse_ref)].sort()), 'Wave 34 does not cover the complete Wave 33 parse denominator');
  assert(unique(plan.join_contracts.map(row => row.join_ref)), 'Wave 34 join references must be unique');
  assert(unique(plan.join_contracts.map(row => row.route_ref)), 'Wave 34 route joins must be one per route');
  assert(canonicalJson([...plan.join_contracts.map(row => row.route_ref)].sort()) === canonicalJson([...sourceProjection.routes.map(row => row.route_ref)].sort()), 'Wave 34 join contracts do not cover every route exactly once');

  const mappingRows = plan.adapters.flatMap(row => row.field_mappings);
  const handleRows = plan.adapters.flatMap(row => row.structural_handles);
  const exclusionRows = plan.adapters.flatMap(row => row.sensitive_exclusions);
  const keyRows = plan.join_contracts.flatMap(row => row.candidate_key_classes);
  const requirementRows = plan.join_contracts.flatMap(row => row.missing_requirements);
  assert(unique(mappingRows.map(row => row.mapping_ref)), 'Wave 34 mapping references must be unique');
  assert(unique(handleRows.map(row => row.handle_ref)), 'Wave 34 handle references must be unique');
  assert(unique(exclusionRows.map(row => row.exclusion_ref)), 'Wave 34 exclusion references must be unique');
  assert(unique(requirementRows.map(row => row.requirement_ref)), 'Wave 34 requirement references must be unique');
  assert(mappingRows.every(row => policy.allowed_mapping_bases.includes(row.mapping_basis)), 'Wave 34 mapping basis outside allowlist');
  assert(handleRows.every(row => policy.allowed_mapping_bases.includes(row.handle_basis)), 'Wave 34 handle basis outside allowlist');
  assert(requirementRows.every(row => policy.allowed_requirement_access_classes.includes(row.access_class)), 'Wave 34 requirement access class outside allowlist');
  assert(mappingRows.every(row => row.join_authority === false), 'Wave 34 mapping cannot carry join authority');
  assert(handleRows.every(row => row.join_authority === false), 'Wave 34 structural handle cannot carry join authority');
  assert(requirementRows.every(row => row.satisfied === false), 'Wave 34 requirements must remain unsatisfied');
  assert(plan.join_contracts.every(row => row.join_authorized === false && row.joined_rows === 0 && row.complete_denominator === false), 'Wave 34 source plan cannot authorize joins');
  assert(exclusionRows.length === 1 && exclusionRows[0].source_path === '$.token', 'Wave 34 must preserve exactly one Grants.gov token exclusion');
  assert(exclusionRows[0].projected === false && exclusionRows[0].join_authority === false, 'Wave 34 token exclusion authority drift');
  assert(!mappingRows.some(row => row.source_path === '$.token') && !handleRows.some(row => row.source_path === '$.token'), 'Wave 34 token exclusion reused as mapping or handle');
  assert(!keyRows.some(row => /token/i.test(row)), 'Wave 34 sensitive token leaked into candidate key classes');

  const rebuilt = buildSchemaAndJoins({ policy, plan, sourcePolicy, sourcePlan, sourceProjection, sourceRows, wave21Receipt, implementationFingerprint: state.implementationFingerprint });
  assert(canonicalJson(state.adapterRows) === canonicalJson(rebuilt.adapterRows), 'Wave 34 adapter ledger differs from deterministic reconstruction');
  assert(canonicalJson(state.joinRows) === canonicalJson(rebuilt.joinRows), 'Wave 34 join ledger differs from deterministic reconstruction');
  assert(canonicalJson(state.projection) === canonicalJson(rebuilt.projection), 'Wave 34 projection differs from deterministic reconstruction');
  assert(state.report === renderReport(rebuilt.projection), 'Wave 34 report differs from deterministic reconstruction');

  validateExpectedCounts(state.projection.counts, policy.expected_counts, 'Wave 34 projection');
  assert(canonicalJson(plan.counts) === canonicalJson(policy.expected_counts), 'Wave 34 plan count contract drift');
  assert(canonicalJson(state.projection.graph_digests) === canonicalJson(wave21Receipt.graph_digests), 'Wave 34 graph digest mutation');
  assert(state.projection.execution_contract.one_adapter_per_source_parse === true, 'Wave 34 one-adapter contract missing');
  assert(state.projection.execution_contract.network_requests_performed === 0, 'Wave 34 network request inflation');
  assert(state.projection.execution_contract.candidate_keys_authorize_join === false, 'Wave 34 candidate-key authority inflation');
  assert(state.projection.execution_contract.authorized_join_created === false, 'Wave 34 join authority inflation');
  assert(state.projection.lawful_join_contracts.every(row => row.join_authorized === false && row.joined_rows === 0 && row.complete_denominator === false), 'Wave 34 projection contains an authorized join');
  assert(state.adapterRows.every(row => row.graph_effect === 'none' && row.publication_status === 'blocked'), 'Wave 34 adapter authority boundary drift');
  assert(state.joinRows.every(row => row.graph_effect === 'none' && row.publication_status === 'blocked'), 'Wave 34 join authority boundary drift');

  const projectionText = JSON.stringify(state.projection);
  const reportText = state.report;
  assert(!projectionText.includes('$.token') && !projectionText.includes('"token"'), 'Wave 34 token leaked into projection');
  assert(!reportText.includes('$.token'), 'Wave 34 token leaked into report');
  assert(policy.boundaries.sensitive_token_projected === false, 'Wave 34 token boundary drift');
  assert(policy.boundaries.graph_effect === 'none' && policy.boundaries.evidence_adjudicated === false && policy.boundaries.finding_promoted === false && policy.boundaries.publication_cleared === false, 'Wave 34 authority boundary drift');

  const sourceRoots = [
    'data/project/lake-allocator-war-schema-joins-wave-34-policy.json',
    'data/project/lake-allocator-war-schema-joins-wave-34-plan.json',
    'data/acquisition/lake-allocator-war-wave-34/schema-adapter-ledger.jsonl',
    'data/acquisition/lake-allocator-war-wave-34/lawful-join-contract-ledger.jsonl',
    'docs/methods/lake-allocator-war-schema-joins-wave-34.md',
    'docs/milestones/lake-allocator-war-schema-joins-wave-34.md'
  ];
  const actionRoots = ['build/lake-actions/allocator-war-schema-joins-wave-34.json'];
  const reportRoots = ['reports/lake-allocator-war-schema-joins-wave-34.md'];
  for (const relative of [...sourceRoots, ...actionRoots, ...reportRoots]) {
    assert(state.lakeIndexPolicy.authoritative_roots.includes(relative), `Wave 34 authoritative root missing: ${relative}`);
  }
  const basinMap = new Map(state.wave21Policy.basin_contract.map(row => [row.basin_id, row]));
  for (const relative of sourceRoots) assert(basinMap.get('allocator-war-source')?.path_prefixes.includes(relative), `Wave 34 source basin path missing: ${relative}`);
  for (const relative of actionRoots) assert(basinMap.get('allocator-war-lake-actions')?.path_prefixes.includes(relative), `Wave 34 action basin path missing: ${relative}`);
  for (const relative of reportRoots) assert(basinMap.get('allocator-war-reports')?.path_prefixes.includes(relative), `Wave 34 report basin path missing: ${relative}`);
  const registryMap = new Map(state.basinRegistry.basins.map(row => [row.basin_id, row]));
  for (const basinId of ['allocator-war-source','allocator-war-lake-actions','allocator-war-reports']) {
    assert(canonicalJson(registryMap.get(basinId)?.path_prefixes ?? []) === canonicalJson(basinMap.get(basinId)?.path_prefixes ?? []), `Wave 34 basin registry mismatch: ${basinId}`);
    assert(canonicalJson(registryMap.get(basinId)?.authoritative_entrypoints ?? []) === canonicalJson(basinMap.get(basinId)?.authoritative_entrypoints ?? []), `Wave 34 basin entrypoint mismatch: ${basinId}`);
  }
  for (const relative of [policy.paths.adapter_ledger, policy.paths.join_ledger, policy.paths.projection, policy.paths.report]) {
    assert(state.wave21Policy.projection_contract.allowed_generated_paths.includes(relative), `Wave 34 generated path not allowed: ${relative}`);
  }

  assert(state.packageJson.scripts['build:lake-allocator-war-schema-joins-wave-34'] === 'node tools/build-lake-allocator-war-schema-joins-wave-34.mjs', 'Wave 34 build script missing');
  assert(state.packageJson.scripts['validate:lake-allocator-war-schema-joins-wave-34'] === 'node tools/validate-lake-allocator-war-schema-joins-wave-34.mjs && node test/lake-allocator-war-schema-joins-wave-34.test.js', 'Wave 34 validate script missing');
  assert(state.packageJson.scripts.check.includes('npm run validate:lake-allocator-war-structural-parses-wave-33 && npm run validate:lake-allocator-war-schema-joins-wave-34'), 'Wave 34 release ordering missing');
  assert(state.installer.includes('lake-allocator-war-schema-joins-wave-34-policy.json') && state.installer.includes('validate:lake-allocator-war-schema-joins-wave-34'), 'Wave 34 installer registration missing');
  assert(state.wave21Validator.includes('lake-allocator-war-schema-joins-wave-34-policy.json') && state.wave21Validator.includes('allocator-war-schema-joins-wave-34.json'), 'Wave 34 Wave 21 basin validation missing');
  assert(state.workflow.includes('Run complete repository release gate') && state.workflow.includes('Restore and prove the committed epoch'), 'Wave 34 permanent workflow incomplete');
  assert(state.readme.includes('## Allocator-war source schemas and lawful joins Wave 34'), 'Wave 34 README marker missing');
  assert(state.buildInstructions.includes('3.34 **Allocator-war source schemas and lawful joins — Wave 34.**'), 'Wave 34 build-instructions marker missing');
  assert(state.temporaryTriggerPresent === false, 'Wave 34 temporary export trigger survives');

  if (!options.skipAncestry) ensureAncestry(state.root, policy.base_checkpoint.commit);
  return {
    adapters: state.projection.counts.schema_adapters,
    joins: state.projection.counts.lawful_join_contracts,
    requirements: state.projection.counts.missing_institutional_requirements,
    authorized_joins: state.projection.counts.authorized_joins,
    graph_effect: policy.boundaries.graph_effect
  };
}

export function runValidation(root = defaultRoot) {
  const state = loadState(root);
  const result = validateState(state);
  console.log('allocator-war source schemas and lawful joins Wave 34 validation passed');
  console.log(`  adapters / profiles / field mappings: ${state.projection.counts.schema_adapters} / ${state.projection.counts.adapter_profiles} / ${state.projection.counts.declared_field_mappings}`);
  console.log(`  structural handles / sensitive exclusions: ${state.projection.counts.structural_handles} / ${state.projection.counts.sensitive_exclusions}`);
  console.log(`  joins / keys / missing requirements: ${result.joins} / ${state.projection.counts.candidate_key_classes} / ${result.requirements}`);
  console.log('  authorized joins / evidence / findings / graph / publication: 0 / 0 / 0 / 0 / 0');
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) runValidation();
