#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  buildStructuralParses,
  loadInputs,
  renderReport
} from './build-lake-allocator-war-structural-parses-wave-33.mjs';

const defaultRoot = process.cwd();
const full = (root, relative) => path.join(root, relative);
const readJson = (root, relative) => JSON.parse(fs.readFileSync(full(root, relative), 'utf8'));
const readJsonl = (root, relative) => fs.readFileSync(full(root, relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
};
const canonicalJson = value => JSON.stringify(canonical(value));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const unique = values => new Set(values).size === values.length;
const fail = (errors, message) => errors.push(message);
const countBy = (rows, key) => Object.fromEntries(
  [...new Set(rows.map(row => row[key]))].sort().map(value => [value, rows.filter(row => row[key] === value).length])
);

function requiredBasinPaths(policy) {
  return {
    'allocator-war-source': [
      'data/project/lake-allocator-war-structural-parses-wave-33-policy.json',
      policy.paths.parse_plan,
      policy.paths.parse_ledger,
      policy.paths.method,
      policy.paths.milestone
    ],
    'allocator-war-lake-actions': [policy.paths.projection],
    'allocator-war-reports': [policy.paths.report]
  };
}

function authorityInflated(row) {
  return row.complete_denominator !== false || row.evidence_adjudicated !== false || row.evidence_rows !== 0 ||
    row.estate_adopted !== false || row.finding_promoted !== false || row.graph_effect !== 'none' ||
    row.publication_status !== 'blocked';
}

export function validateArtifacts(state) {
  const {
    policy,
    plan,
    sourcePolicy,
    sourcePlan,
    sourceProjection,
    sourceRows,
    sourceRawByPath,
    parserFingerprint,
    parseRows,
    projection,
    reportText,
    wave21Policy,
    lakeIndexPolicy,
    basinRegistry,
    pkg,
    installerText,
    buildInstructions,
    readme,
    workflowText,
    repositoryFiles
  } = state;
  const errors = [];
  const expected = policy.expected_counts;

  if (policy.schema_version !== 'lake-allocator-war-structural-parses-wave-33-policy@1') fail(errors, 'Wave 33 policy schema drift');
  if (plan.schema_version !== 'lake-allocator-war-structural-parses-wave-33-plan@1') fail(errors, 'Wave 33 plan schema drift');
  if (sourcePolicy.schema_version !== policy.source_contract.required_policy_schema) fail(errors, 'Wave 33 source policy drift');
  if (sourcePlan.schema_version !== policy.source_contract.required_plan_schema) fail(errors, 'Wave 33 source plan drift');
  if (sourceProjection.schema_version !== policy.source_contract.required_projection_schema) fail(errors, 'Wave 33 source projection drift');
  if (projection.schema_version !== 'lake-allocator-war-structural-parses-wave-33@1') fail(errors, 'Wave 33 projection schema drift');
  if (projection.program_ref !== policy.program_ref || projection.wave_ref !== policy.wave_ref) fail(errors, 'Wave 33 projection identity drift');
  if (!same(projection.boundaries, policy.boundaries)) fail(errors, 'Wave 33 projection boundary drift');

  if (sourceProjection.counts.source_routes !== policy.source_contract.source_routes) fail(errors, 'Wave 33 source route denominator drift');
  if (sourceProjection.counts.source_tasks !== policy.source_contract.source_tasks) fail(errors, 'Wave 33 source task denominator drift');
  if (sourceProjection.counts.source_receipts !== policy.source_contract.source_receipts) fail(errors, 'Wave 33 source receipt denominator drift');
  if (sourceProjection.counts.source_receipt_uses !== policy.source_contract.source_receipt_uses) fail(errors, 'Wave 33 source receipt-use denominator drift');
  if (sourceProjection.counts.snapshot_rows !== policy.source_contract.snapshot_rows) fail(errors, 'Wave 33 source snapshot denominator drift');
  if (sourceProjection.counts.response_snapshot_files !== policy.source_contract.response_snapshot_files) fail(errors, 'Wave 33 source response-file denominator drift');
  if (sourceProjection.counts.response_snapshot_bytes !== policy.source_contract.response_snapshot_bytes) fail(errors, 'Wave 33 source response-byte denominator drift');
  if (!same(sourceProjection.counts.capture_states, policy.source_contract.capture_states)) fail(errors, 'Wave 33 source capture-state drift');

  const specs = plan.parse_specs ?? [];
  if (specs.length !== expected.parse_specs) fail(errors, 'Wave 33 parse-spec denominator drift');
  if (!unique(specs.map(row => row.parse_ref))) fail(errors, 'duplicate Wave 33 parse reference');
  if (!unique(specs.map(row => row.snapshot_ref))) fail(errors, 'duplicate Wave 33 snapshot specification');
  if (!unique(specs.map(row => row.source_ref))) fail(errors, 'duplicate Wave 33 source specification');
  if (Object.keys(plan.parser_profiles ?? {}).length !== expected.parser_profiles) fail(errors, 'Wave 33 parser-profile denominator drift');
  if (plan.parser_limits.html_parser_executes_scripts !== false || plan.parser_limits.html_parser_constructs_dom !== false || plan.parser_limits.semantic_value_classification !== false) {
    fail(errors, 'Wave 33 parser limit authority drift');
  }
  const sourceBySnapshot = new Map(sourceRows.map(row => [row.snapshot_ref, row]));
  if (sourceRows.length !== expected.parse_rows) fail(errors, 'Wave 33 source snapshot-row denominator drift');
  if (!same(specs.map(row => row.snapshot_ref), sourceRows.map(row => row.snapshot_ref))) fail(errors, 'Wave 33 source order or denominator drift');
  for (const spec of specs) {
    const source = sourceBySnapshot.get(spec.snapshot_ref);
    if (!source) {
      fail(errors, `${spec.parse_ref}: source snapshot absent`);
      continue;
    }
    if (spec.source_ref !== source.source_ref || spec.expected_capture_mode !== source.capture_mode ||
      spec.expected_format !== source.expected_format || spec.expected_capture_state !== source.capture_state) {
      fail(errors, `${spec.parse_ref}: source specification custody drift`);
    }
    const profile = plan.parser_profiles[spec.parser_profile];
    if (!profile) fail(errors, `${spec.parse_ref}: parser profile absent`);
    else if (profile.format !== spec.expected_format) fail(errors, `${spec.parse_ref}: parser profile format drift`);
  }

  if (parseRows.length !== expected.parse_rows) fail(errors, 'Wave 33 parse-row denominator drift');
  if (!unique(parseRows.map(row => row.parse_ref))) fail(errors, 'duplicate Wave 33 parse row');
  if (!same(parseRows.map(row => row.parse_ref), specs.map(row => row.parse_ref))) fail(errors, 'Wave 33 parse row order drift');
  const specByParse = new Map(specs.map(row => [row.parse_ref, row]));
  const allowedStates = new Set(policy.allowed_parse_states);
  for (const row of parseRows) {
    const spec = specByParse.get(row.parse_ref);
    const source = sourceBySnapshot.get(row.snapshot_ref);
    if (!spec || !source) {
      fail(errors, `${row.parse_ref}: parse source or specification absent`);
      continue;
    }
    if (row.schema_version !== 'lake-allocator-war-structural-parse-wave-33@1' || row.row_type !== 'bounded_source_structural_parse') fail(errors, `${row.parse_ref}: parse schema drift`);
    if (row.program_ref !== policy.program_ref || row.wave_ref !== policy.wave_ref) fail(errors, `${row.parse_ref}: parse identity drift`);
    if (row.snapshot_ref !== spec.snapshot_ref || row.source_ref !== spec.source_ref || row.parser_profile !== spec.parser_profile) fail(errors, `${row.parse_ref}: parse specification custody drift`);
    if (!allowedStates.has(row.parse_state)) fail(errors, `${row.parse_ref}: invalid parse state`);
    if (row.parser_implementation_path !== parserFingerprint.path || row.parser_implementation_sha256 !== parserFingerprint.sha256) fail(errors, `${row.parse_ref}: parser implementation custody drift`);
    if (row.source_snapshot_row_sha256 !== sha256(canonicalJson(source))) fail(errors, `${row.parse_ref}: source snapshot-row hash drift`);
    if (authorityInflated(row)) fail(errors, `${row.parse_ref}: parse authority inflation`);
    if (!same(row.blocked_promotions, policy.blocked_promotions)) fail(errors, `${row.parse_ref}: blocked-promotion drift`);

    if (row.parse_state === 'credential_boundary_preserved') {
      if (row.structure !== null || row.source_response_body_path !== null || row.source_response_body_bytes !== null || row.source_response_body_sha256 !== null) fail(errors, `${row.parse_ref}: credential boundary manufactured response`);
      if (row.credential_requirement !== source.credential_requirement || row.boundary_reason !== source.boundary_reason) fail(errors, `${row.parse_ref}: credential boundary custody drift`);
    } else {
      const raw = sourceRawByPath[source.response_body_path];
      if (!Buffer.isBuffer(raw)) fail(errors, `${row.parse_ref}: frozen response bytes absent`);
      else {
        if (row.source_response_body_path !== source.response_body_path) fail(errors, `${row.parse_ref}: response path drift`);
        if (row.source_response_body_bytes !== raw.length || row.source_response_body_bytes !== source.response_body_bytes) fail(errors, `${row.parse_ref}: response byte-count drift`);
        if (row.source_response_body_sha256 !== sha256(raw) || row.source_response_body_sha256 !== source.response_body_sha256) fail(errors, `${row.parse_ref}: response hash drift`);
      }
      if (!row.structure || !row.structure.parser_family) fail(errors, `${row.parse_ref}: structural summary absent`);
      if (row.source_expected_format === 'json') {
        if (row.parse_state !== 'parsed_json_structure') fail(errors, `${row.parse_ref}: JSON parse-state drift`);
        if (row.structure?.parser_family !== 'deterministic-json-recursive-v1') fail(errors, `${row.parse_ref}: JSON parser-family drift`);
        if (!row.structure?.root_type || !row.structure?.node_type_counts) fail(errors, `${row.parse_ref}: JSON structural counts absent`);
      } else {
        const expectedState = source.capture_state === 'captured_http_error_response' ? 'parsed_http_error_structure' : 'parsed_html_structure';
        if (row.parse_state !== expectedState) fail(errors, `${row.parse_ref}: HTML parse-state drift`);
        if (row.structure?.parser_family !== 'deterministic-html-token-count-v1') fail(errors, `${row.parse_ref}: HTML parser-family drift`);
        if (row.structure?.parser_constructs_dom !== false || row.structure?.parser_executes_scripts !== false) fail(errors, `${row.parse_ref}: HTML parser behavior drift`);
      }
    }
  }

  let deterministic = null;
  try {
    deterministic = buildStructuralParses({ policy, plan, sourcePolicy, sourcePlan, sourceProjection, sourceRows, sourceRawByPath, parserFingerprint });
  } catch (error) {
    fail(errors, `Wave 33 deterministic build failed: ${error.message}`);
  }
  if (deterministic) {
    if (!same(parseRows, deterministic.parseRows)) fail(errors, 'Wave 33 parse ledger differs from deterministic build');
    if (!same(projection, deterministic.projection)) fail(errors, 'Wave 33 projection differs from deterministic build');
    if (reportText !== renderReport(deterministic.projection)) fail(errors, 'Wave 33 report differs from deterministic build');
  }

  if (!same(projection.counts.parse_states, expected.parse_states)) fail(errors, 'Wave 33 parse-state projection drift');
  for (const key of ['source_routes','source_tasks','source_receipts','source_receipt_uses','parse_specs','parse_rows','parser_profiles','json_parse_rows','html_parse_rows','credential_boundary_rows','response_parse_rows','route_rows','task_rows','complete_denominators','evidence_rows','estate_adoptions','finding_promotions','graph_effects','publication_clearances']) {
    if (projection.counts[key] !== expected[key]) fail(errors, `Wave 33 projected count drift: ${key}`);
  }
  if (projection.counts.response_parse_bytes !== policy.source_contract.response_snapshot_bytes) fail(errors, 'Wave 33 projected response-byte drift');
  if (projection.routes.length !== expected.route_rows || projection.tasks.length !== expected.task_rows) fail(errors, 'Wave 33 route or task denominator drift');
  if (projection.tasks.reduce((sum, row) => sum + row.source_refs.length, 0) !== expected.source_receipt_uses) fail(errors, 'Wave 33 task parse-use denominator drift');
  for (const route of projection.routes) if (route.parse_refs.some(value => value === null)) fail(errors, `${route.route_ref}: missing route parse reference`);
  for (const task of projection.tasks) {
    if (task.parse_refs.length !== task.source_refs.length || task.parse_refs.some(value => value === null)) fail(errors, `${task.source_task_ref}: missing task parse reference`);
    if (task.complete_denominator !== false || task.evidence_adjudicated !== false || task.graph_effect !== 'none' || task.publication_status !== 'blocked') fail(errors, `${task.source_task_ref}: task parse authority inflation`);
  }
  if (projection.execution_contract?.network_requests_performed !== 0 || projection.execution_contract?.release_validation_refetches_network !== false) fail(errors, 'Wave 33 network boundary drift');
  if (projection.execution_contract?.parser_identity_hash_bound !== true || projection.execution_contract?.frozen_response_hashes_verified !== true) fail(errors, 'Wave 33 parser or byte custody contract absent');

  for (const key of [
    'structural_parse_is_evidence_row','structural_parse_closes_source_gap','json_array_length_is_complete_denominator',
    'json_key_is_institutional_semantics','html_link_count_is_docket_denominator','html_text_count_is_affected_population',
    'http_error_is_record_absence','credential_boundary_is_no_records','parser_success_authorizes_join',
    'shared_structure_is_relationship','parse_recurrence_is_prevalence','identity_created','relationship_created',
    'participation_created','active_claim_created','hop_created','evidence_adjudicated','finding_promoted','publication_cleared'
  ]) if (policy.boundaries[key] !== false) fail(errors, `${key}: Wave 33 authority inflation`);
  if (policy.boundaries.graph_effect !== 'none') fail(errors, 'Wave 33 graph boundary drift');

  const basinPaths = requiredBasinPaths(policy);
  for (const [basinId, paths] of Object.entries(basinPaths)) {
    const basin = wave21Policy.basin_contract.find(row => row.basin_id === basinId);
    if (!basin) {
      fail(errors, `${basinId}: Wave 21 basin absent`);
      continue;
    }
    const registryBasin = basinRegistry.basins.find(row => row.basin_id === basinId);
    if (!registryBasin || !same(registryBasin, basin)) fail(errors, `${basinId}: basin registry drift`);
    for (const relative of paths) {
      if (!basin.path_prefixes.includes(relative)) fail(errors, `${relative}: Wave 33 path prefix absent from ${basinId}`);
      if (!basin.authoritative_entrypoints.includes(relative)) fail(errors, `${relative}: Wave 33 entrypoint absent from ${basinId}`);
      if (!lakeIndexPolicy.authoritative_roots.includes(relative)) fail(errors, `${relative}: Wave 33 authoritative root absent`);
      if (!installerText.includes(relative)) fail(errors, `${relative}: Wave 33 installer registration absent`);
    }
  }
  for (const relative of [policy.paths.parse_ledger, policy.paths.projection, policy.paths.report]) {
    if (!wave21Policy.projection_contract.allowed_generated_paths.includes(relative)) fail(errors, `${relative}: Wave 33 generated path absent from Wave 21 contract`);
  }
  if (wave21Policy.boundaries.wave_33_structural_parse_is_evidence_row !== false || wave21Policy.boundaries.wave_33_parser_success_authorizes_join !== false ||
    wave21Policy.boundaries.wave_33_http_error_is_record_absence !== false || wave21Policy.boundaries.wave_33_credential_boundary_is_no_records !== false) {
    fail(errors, 'Wave 33 authority boundaries absent from Wave 21 policy');
  }

  const validateScript = 'node tools/validate-lake-allocator-war-structural-parses-wave-33.mjs && node test/lake-allocator-war-structural-parses-wave-33.test.js';
  if (pkg.scripts['build:lake-allocator-war-structural-parses-wave-33'] !== 'node tools/build-lake-allocator-war-structural-parses-wave-33.mjs') fail(errors, 'Wave 33 build script registration drift');
  if (pkg.scripts['validate:lake-allocator-war-structural-parses-wave-33'] !== validateScript) fail(errors, 'Wave 33 validator script registration drift');
  if (!pkg.scripts.check.includes('npm run validate:lake-allocator-war-structural-parses-wave-33')) fail(errors, 'Wave 33 absent from release gate');
  if (!buildInstructions.includes('3.33 **Allocator-war frozen source structural parses — Wave 33.**')) fail(errors, 'Wave 33 build instruction absent');
  if (!readme.includes('## Allocator-war frozen source structural parses Wave 33')) fail(errors, 'Wave 33 README surface absent');
  if (!workflowText.includes('Allocator-war frozen source structural parses Wave 33')) fail(errors, 'Wave 33 permanent workflow absent');

  if (repositoryFiles.includes(policy.transport_repair.retired_path)) fail(errors, `${policy.transport_repair.retired_path}: abandoned Wave 33 trigger survived`);
  for (const relative of repositoryFiles) {
    if (/^\.github\/tmp\/wave33-/.test(relative) || /temporary-wave33/.test(relative) || /run-wave33-.*materializer/.test(relative) || /wave33-.*carrier/.test(relative)) {
      fail(errors, `${relative}: temporary Wave 33 transport survived`);
    }
  }
  return errors;
}

export function loadState(root = defaultRoot) {
  const policy = readJson(root, 'data/project/lake-allocator-war-structural-parses-wave-33-policy.json');
  const plan = readJson(root, policy.paths.parse_plan);
  const sourcePolicy = readJson(root, policy.paths.source_policy);
  const sourcePlan = readJson(root, policy.paths.source_plan);
  const sourceProjection = readJson(root, policy.paths.source_projection);
  const sourceRows = readJsonl(root, policy.paths.source_snapshot_ledger);
  const sourceRawByPath = {};
  for (const row of sourceRows) if (row.response_body_path) sourceRawByPath[row.response_body_path] = fs.readFileSync(full(root, row.response_body_path));
  const implementationPath = 'tools/build-lake-allocator-war-structural-parses-wave-33.mjs';
  const parserFingerprint = { path: implementationPath, sha256: sha256(fs.readFileSync(full(root, implementationPath))) };
  const repositoryFiles = [];
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else repositoryFiles.push(path.relative(root, absolute).replaceAll('\\', '/'));
    }
  };
  walk(root);
  repositoryFiles.sort();
  return {
    policy,
    plan,
    sourcePolicy,
    sourcePlan,
    sourceProjection,
    sourceRows,
    sourceRawByPath,
    parserFingerprint,
    parseRows: readJsonl(root, policy.paths.parse_ledger),
    projection: readJson(root, policy.paths.projection),
    reportText: fs.readFileSync(full(root, policy.paths.report), 'utf8'),
    wave21Policy: readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json'),
    lakeIndexPolicy: readJson(root, 'data/project/lake-index-policy.json'),
    basinRegistry: readJson(root, 'data/project/lake-basin-registry.json'),
    pkg: readJson(root, 'package.json'),
    installerText: fs.readFileSync(full(root, 'tools/install-lake-allocator-war-wave-21.mjs'), 'utf8'),
    buildInstructions: fs.readFileSync(full(root, 'BUILD-INSTRUCTIONS.md'), 'utf8'),
    readme: fs.readFileSync(full(root, 'README.md'), 'utf8'),
    workflowText: fs.readFileSync(full(root, '.github/workflows/lake-allocator-war-structural-parses-wave-33.yml'), 'utf8'),
    repositoryFiles
  };
}

function ensureAncestry(root, checkpoint) {
  if (process.env.LAW33_SKIP_GIT === '1') return;
  const run = args => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  const hasCommit = ref => { try { run(['cat-file', '-e', `${ref}^{commit}`]); return true; } catch { return false; } };
  const isAncestor = (ancestor, target) => { try { run(['merge-base', '--is-ancestor', ancestor, target]); return true; } catch { return false; } };
  if (hasCommit(checkpoint) && isAncestor(checkpoint, 'HEAD')) return;
  const headRef = String(process.env.GITHUB_HEAD_REF ?? '').trim();
  if (process.env.GITHUB_ACTIONS === 'true' && headRef) {
    const remoteRef = `refs/remotes/origin/${headRef}`;
    try { run(['fetch', '--no-tags', '--prune', '--depth=1000000', 'origin', `+refs/heads/${headRef}:${remoteRef}`]); }
    catch { throw new Error(`Wave 33 ancestry recovery failed for ${headRef}`); }
    if (!hasCommit(checkpoint)) throw new Error('Wave 33 base checkpoint remains unavailable after history recovery');
    if (!isAncestor(checkpoint, remoteRef)) throw new Error('Wave 33 base checkpoint is not an ancestor of recovered head');
    return;
  }
  if (!hasCommit(checkpoint)) throw new Error('Wave 33 base checkpoint object is unavailable');
  throw new Error('Wave 33 base checkpoint is not an ancestor of HEAD');
}

export function validateRepository(root = defaultRoot) {
  const state = loadState(root);
  ensureAncestry(root, state.policy.base_checkpoint.commit);
  const errors = validateArtifacts(state);
  if (errors.length) {
    for (const error of errors) console.error(`- ${error}`);
    throw new Error(`Wave 33 validation failed with ${errors.length} error(s)`);
  }
  console.log('allocator-war frozen source structural parses Wave 33 validation passed');
  console.log('  routes / tasks / sources / parses: ' + state.projection.counts.source_routes + ' / ' + state.projection.counts.source_tasks + ' / ' + state.projection.counts.source_receipts + ' / ' + state.projection.counts.parse_rows);
  console.log('  JSON / HTML / boundaries: ' + state.projection.counts.json_parse_rows + ' / ' + state.projection.counts.html_parse_rows + ' / ' + state.projection.counts.credential_boundary_rows);
  console.log('  parse states: ' + JSON.stringify(state.projection.counts.parse_states));
  console.log('  evidence / adoption / findings / graph / publication: 0 / 0 / 0 / 0 / 0');
  return state.projection;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) validateRepository();
