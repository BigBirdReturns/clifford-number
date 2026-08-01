#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  buildSnapshots,
  collectWave31Rows,
  resultPathFor
} from './build-lake-allocator-war-bounded-source-snapshots-wave-32.mjs';

const defaultRoot = process.cwd();
const full = (root, relative) => path.join(root, relative);
const readJson = (root, relative) => JSON.parse(fs.readFileSync(full(root, relative), 'utf8'));
const readJsonl = (root, relative) => fs.readFileSync(full(root, relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const digestBytes = value => crypto.createHash('sha256').update(value).digest('hex');
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

function expectedRawPath(spec, policy) {
  const extension = spec.expected_format === 'json' ? 'json' : spec.expected_format === 'html' ? 'html' : 'bin';
  return policy.paths.snapshot_root + '/' + spec.snapshot_ref.toLowerCase() + '.' + extension;
}

function requiredBasinPaths(policy) {
  return {
    'allocator-war-source': {
      prefixes: [
        'data/project/lake-allocator-war-bounded-source-snapshots-wave-32-policy.json',
        policy.paths.snapshot_plan,
        policy.paths.snapshot_ledger,
        policy.paths.snapshot_root + '/',
        policy.paths.route_result_root + '/',
        policy.paths.method,
        policy.paths.milestone
      ],
      entrypoints: [
        'data/project/lake-allocator-war-bounded-source-snapshots-wave-32-policy.json',
        policy.paths.snapshot_plan,
        policy.paths.snapshot_ledger,
        policy.paths.method,
        policy.paths.milestone
      ]
    },
    'allocator-war-lake-actions': { prefixes: [policy.paths.projection], entrypoints: [policy.paths.projection] },
    'allocator-war-reports': { prefixes: [policy.paths.report], entrypoints: [policy.paths.report] }
  };
}

export function validateArtifacts(state) {
  const {
    policy,
    snapshotPlan,
    sourcePlan,
    sourceProjection,
    sourceProjectionRaw,
    sourceRowsByPath,
    sourceRawByPath,
    snapshotRows,
    snapshotLedgerRaw,
    snapshotRawByPath,
    projection,
    resultRowsByPath,
    wave21Policy,
    lakeIndexPolicy,
    pkg,
    installerText,
    repositoryFiles
  } = state;
  const errors = [];
  const expected = policy.expected_counts;

  if (policy.schema_version !== 'lake-allocator-war-bounded-source-snapshots-wave-32-policy@1') fail(errors, 'Wave 32 policy schema drift');
  if (snapshotPlan.schema_version !== 'lake-allocator-war-bounded-source-snapshots-wave-32-plan@1') fail(errors, 'Wave 32 snapshot-plan schema drift');
  if (sourcePlan.schema_version !== policy.source_contract.required_source_plan_schema) fail(errors, 'Wave 32 source plan is not sealed Wave 31');
  if (sourceProjection.schema_version !== policy.source_contract.required_projection_schema) fail(errors, 'Wave 32 source projection is not sealed Wave 31');
  if (projection.schema_version !== 'lake-allocator-war-bounded-source-snapshots-wave-32@1') fail(errors, 'Wave 32 projection schema drift');
  if (projection.program_ref !== policy.program_ref || projection.wave_ref !== policy.wave_ref) fail(errors, 'Wave 32 program or wave drift');
  if (!same(projection.boundaries, policy.boundaries)) fail(errors, 'Wave 32 boundary drift');

  if (sourceProjection.counts.source_routes !== expected.source_routes) fail(errors, 'Wave 32 source route denominator drift');
  if (sourceProjection.counts.source_tasks !== expected.source_tasks) fail(errors, 'Wave 32 source task denominator drift');
  if (sourceProjection.counts.official_source_receipts !== expected.source_receipts) fail(errors, 'Wave 32 source receipt denominator drift');
  if (sourceProjection.counts.source_receipt_uses !== expected.source_receipt_uses) fail(errors, 'Wave 32 source use denominator drift');
  for (const key of ['complete_denominators', 'evidence_rows', 'estate_adoptions', 'finding_promotions', 'graph_effects', 'publication_clearances']) {
    if (sourceProjection.counts[key] !== policy.source_contract['required_' + key]) fail(errors, 'Wave 32 source authority drift: ' + key);
  }

  const specs = snapshotPlan.snapshot_specs ?? [];
  if (specs.length !== expected.snapshot_specs) fail(errors, 'Wave 32 snapshot-spec denominator drift');
  if (!unique(specs.map(row => row.snapshot_ref))) fail(errors, 'duplicate Wave 32 snapshot reference');
  if (!unique(specs.map(row => row.source_ref))) fail(errors, 'duplicate Wave 32 source reference');
  const sourceRefs = sourcePlan.sources.map(row => row.source_ref).sort();
  if (!same(specs.map(row => row.source_ref).sort(), sourceRefs)) fail(errors, 'Wave 32 snapshot plan does not preserve the nineteen-source denominator');
  if (specs.filter(row => row.capture_mode === 'public_http').length !== expected.public_http_specs) fail(errors, 'Wave 32 public HTTP denominator drift');
  if (specs.filter(row => row.capture_mode === 'credential_boundary').length !== expected.credential_boundary_specs) fail(errors, 'Wave 32 credential denominator drift');
  if (specs.filter(row => row.expected_format === 'json').length !== expected.json_specs) fail(errors, 'Wave 32 JSON denominator drift');
  if (specs.filter(row => row.expected_format === 'html').length !== expected.html_specs) fail(errors, 'Wave 32 HTML denominator drift');
  if ((snapshotPlan.required_success_snapshot_refs ?? []).length !== expected.required_success_specs) fail(errors, 'Wave 32 required-success denominator drift');
  if (!unique(snapshotPlan.required_success_snapshot_refs ?? [])) fail(errors, 'duplicate Wave 32 required-success reference');

  const sourceByRef = new Map(sourcePlan.sources.map(row => [row.source_ref, row]));
  for (const spec of specs) {
    const source = sourceByRef.get(spec.source_ref);
    if (!source) {
      fail(errors, spec.snapshot_ref + ': Wave 31 source receipt absent');
      continue;
    }
    for (const key of ['snapshot_ref', 'source_ref', 'source_title', 'publisher', 'source_locator', 'source_authority', 'source_observed_on', 'capture_mode', 'expected_format', 'request_purpose', 'coverage', 'limits']) {
      if (!spec[key]) fail(errors, spec.snapshot_ref + ': snapshot specification field absent: ' + key);
    }
    if (spec.source_title !== source.title || spec.publisher !== source.publisher || spec.source_locator !== source.url || spec.source_authority !== source.authority) {
      fail(errors, spec.snapshot_ref + ': Wave 31 source custody drift');
    }
    if (spec.capture_mode === 'public_http') {
      if (!spec.request || !['GET', 'POST'].includes(spec.request.method)) fail(errors, spec.snapshot_ref + ': public request absent or method invalid');
      if (!/^https:\/\//.test(spec.request?.url ?? '')) fail(errors, spec.snapshot_ref + ': request URL is not HTTPS');
      const headerKeys = Object.keys(spec.request?.headers ?? {}).map(key => key.toLowerCase());
      if (headerKeys.some(key => ['authorization', 'x-api-key', 'api-key', 'cookie'].includes(key))) fail(errors, spec.snapshot_ref + ': secret-bearing header committed');
      if (spec.expected_format === 'none') fail(errors, spec.snapshot_ref + ': public request has no expected format');
    } else if (spec.capture_mode === 'credential_boundary') {
      if (spec.request !== undefined) fail(errors, spec.snapshot_ref + ': credential boundary contains a request');
      if (!spec.credential_requirement || !spec.boundary_reason) fail(errors, spec.snapshot_ref + ': credential boundary fields absent');
      if (spec.expected_format !== 'none') fail(errors, spec.snapshot_ref + ': credential boundary format drift');
      if (spec.required_success !== false) fail(errors, spec.snapshot_ref + ': credential boundary marked required success');
    } else fail(errors, spec.snapshot_ref + ': capture mode invalid');
  }

  if (snapshotRows.length !== expected.snapshot_specs) fail(errors, 'Wave 32 snapshot ledger denominator drift');
  if (!unique(snapshotRows.map(row => row.snapshot_ref))) fail(errors, 'duplicate Wave 32 snapshot row');
  if (!unique(snapshotRows.map(row => row.source_ref))) fail(errors, 'duplicate Wave 32 source snapshot row');
  if (!same(snapshotRows.map(row => row.snapshot_ref), specs.map(row => row.snapshot_ref))) fail(errors, 'Wave 32 snapshot row order or denominator drift');
  const specBySnapshot = new Map(specs.map(row => [row.snapshot_ref, row]));
  const preserving = new Set(policy.response_preserving_capture_states);
  const allowed = new Set(policy.allowed_capture_states);
  for (const row of snapshotRows) {
    const spec = specBySnapshot.get(row.snapshot_ref);
    if (!spec) {
      fail(errors, row.snapshot_ref + ': snapshot specification absent');
      continue;
    }
    if (row.schema_version !== 'lake-allocator-war-source-snapshot-wave-32@1' || row.row_type !== 'bounded_source_snapshot') fail(errors, row.snapshot_ref + ': snapshot row schema drift');
    if (row.program_ref !== policy.program_ref || row.wave_ref !== policy.wave_ref) fail(errors, row.snapshot_ref + ': snapshot program or wave drift');
    if (row.source_ref !== spec.source_ref || row.capture_mode !== spec.capture_mode || row.expected_format !== spec.expected_format || row.required_success !== spec.required_success) fail(errors, row.snapshot_ref + ': snapshot specification custody drift');
    if (!allowed.has(row.capture_state)) fail(errors, row.snapshot_ref + ': invalid capture state');
    if (!row.observed_at || Number.isNaN(Date.parse(row.observed_at))) fail(errors, row.snapshot_ref + ': invalid observed timestamp');
    if (row.complete_denominator !== false || row.evidence_adjudicated !== false || row.graph_effect !== 'none' || row.publication_status !== 'blocked') fail(errors, row.snapshot_ref + ': snapshot authority inflation');
    if (row.request_purpose !== spec.request_purpose || row.coverage !== spec.coverage || row.limits !== spec.limits) fail(errors, row.snapshot_ref + ': snapshot coverage custody drift');

    if (spec.capture_mode === 'credential_boundary') {
      if (row.capture_state !== 'credential_boundary_preserved' || row.request !== null || row.attempts !== 0) fail(errors, row.snapshot_ref + ': credential boundary execution drift');
      if (row.credential_requirement !== spec.credential_requirement || row.boundary_reason !== spec.boundary_reason) fail(errors, row.snapshot_ref + ': credential boundary custody drift');
      if (row.response_body_path !== null || row.response_body_sha256 !== null || row.response_status !== null) fail(errors, row.snapshot_ref + ': credential boundary manufactured response');
    } else {
      if (!row.request || row.attempts < 1 || row.attempts > snapshotPlan.request_defaults.max_attempts) fail(errors, row.snapshot_ref + ': public request attempt drift');
      const body = spec.request.body === undefined ? null : canonicalJson(spec.request.body);
      const headers = canonical({ ...spec.request.headers, 'user-agent': snapshotPlan.request_defaults.user_agent });
      const fingerprint = digestBytes(canonicalJson({ method: spec.request.method, url: spec.request.url, headers, body }));
      if (row.request.method !== spec.request.method || row.request.url !== spec.request.url || !same(row.request.headers, headers) || row.request.body !== body) fail(errors, row.snapshot_ref + ': exact request custody drift');
      if (row.request.body_sha256 !== (body === null ? null : digestBytes(body))) fail(errors, row.snapshot_ref + ': request body hash drift');
      if (row.request.fingerprint_sha256 !== fingerprint) fail(errors, row.snapshot_ref + ': request fingerprint drift');
      const headerKeys = Object.keys(row.request.headers ?? {}).map(key => key.toLowerCase());
      if (headerKeys.some(key => ['authorization', 'x-api-key', 'api-key', 'cookie'].includes(key))) fail(errors, row.snapshot_ref + ': captured secret-bearing header');
    }

    if (preserving.has(row.capture_state)) {
      const expectedPath = expectedRawPath(spec, policy);
      if (row.response_body_path !== expectedPath) fail(errors, row.snapshot_ref + ': response body path drift');
      const raw = snapshotRawByPath[row.response_body_path];
      if (!Buffer.isBuffer(raw)) fail(errors, row.snapshot_ref + ': response body absent');
      else {
        if (row.response_body_bytes !== raw.length) fail(errors, row.snapshot_ref + ': response byte count drift');
        if (row.response_body_sha256 !== digestBytes(raw)) fail(errors, row.snapshot_ref + ': response hash drift');
      }
      if (typeof row.response_status !== 'number') fail(errors, row.snapshot_ref + ': response status absent');
    } else if (row.capture_state !== 'credential_boundary_preserved') {
      if (row.response_body_path !== null || row.response_body_sha256 !== null) fail(errors, row.snapshot_ref + ': non-response state contains body custody');
    }
  }

  for (const snapshotRef of snapshotPlan.required_success_snapshot_refs) {
    const row = snapshotRows.find(item => item.snapshot_ref === snapshotRef);
    if (!row || row.capture_state !== 'captured_json_response' || row.response_ok !== true || row.response_status < 200 || row.response_status >= 300) {
      fail(errors, snapshotRef + ': required JSON positive control not captured');
    }
    if (!row?.parsed_summary || row.parsed_summary.root_type === undefined) fail(errors, snapshotRef + ': required JSON summary absent');
  }

  let wave31 = { summaries: [], results: [] };
  try { wave31 = collectWave31Rows(sourceProjection, sourceRowsByPath); }
  catch (error) { fail(errors, 'Wave 32 source collection failed: ' + error.message); }
  if (wave31.results.length !== expected.source_tasks) fail(errors, 'Wave 32 did not preserve Wave 31 task denominator');
  for (const route of sourceProjection.routes) {
    const raw = sourceRawByPath[route.result_path];
    if (typeof raw !== 'string' || digestBytes(raw) !== route.result_sha256) fail(errors, route.result_path + ': Wave 31 source ledger hash drift');
  }

  let expectedBuild = null;
  try {
    expectedBuild = buildSnapshots(policy, snapshotPlan, sourcePlan, sourceProjection, sourceProjectionRaw, sourceRowsByPath, sourceRawByPath, snapshotRows, snapshotLedgerRaw, snapshotRawByPath);
  } catch (error) { fail(errors, 'Wave 32 deterministic build failed: ' + error.message); }
  if (expectedBuild) {
    if (!same(projection, expectedBuild.projection)) fail(errors, 'Wave 32 projection differs from deterministic build');
    if (Object.keys(resultRowsByPath).length !== Object.keys(expectedBuild.resultRowsByPath).length) fail(errors, 'Wave 32 route-ledger denominator drift');
    for (const [relative, rows] of Object.entries(expectedBuild.resultRowsByPath)) {
      if (!same(resultRowsByPath[relative], rows)) fail(errors, relative + ': Wave 32 route ledger differs from deterministic build');
    }
  }

  const allRows = Object.values(resultRowsByPath).flat();
  const summaries = allRows.filter(row => row.row_type === 'bounded_source_snapshot_route_summary');
  const results = allRows.filter(row => row.row_type === 'bounded_source_snapshot_task_result');
  if (summaries.length !== expected.route_summary_rows) fail(errors, 'Wave 32 route summary count drift');
  if (results.length !== expected.task_result_rows) fail(errors, 'Wave 32 task result count drift');
  if (allRows.length !== expected.execution_rows) fail(errors, 'Wave 32 execution row count drift');
  if (!unique(results.map(row => row.result_ref)) || !unique(results.map(row => row.source_task_ref))) fail(errors, 'duplicate Wave 32 task result');
  if (!same(results.map(row => row.source_task_ref).sort(), wave31.results.map(row => row.source_task_ref).sort())) fail(errors, 'Wave 32 task denominator differs from Wave 31');
  if (!same(countBy(results, 'result_state'), expected.task_result_states)) fail(errors, 'Wave 32 task-result state counts drift');
  for (const row of results) {
    if (row.complete_denominator !== false || row.evidence_adjudicated !== false || row.evidence_rows !== 0 || row.estate_adopted !== false || row.finding_promoted !== false || row.graph_effect !== 'none' || row.publication_status !== 'blocked') fail(errors, row.result_ref + ': task result authority inflation');
    const source = wave31.results.find(item => item.source_task_ref === row.source_task_ref);
    if (!source || row.result_state !== policy.state_mapping[source.result_state]) fail(errors, row.result_ref + ': result state mapping drift');
    if (!same(row.source_refs, source.source_refs)) fail(errors, row.result_ref + ': source references drift');
    if (row.source_refs.length !== row.snapshot_refs.length) fail(errors, row.result_ref + ': source-to-snapshot cardinality drift');
  }

  const scalarChecks = {
    source_routes: sourceProjection.routes.length,
    source_tasks: wave31.results.length,
    source_receipts: sourcePlan.sources.length,
    source_receipt_uses: sourceProjection.counts.source_receipt_uses,
    snapshot_specs: specs.length,
    public_http_specs: specs.filter(row => row.capture_mode === 'public_http').length,
    credential_boundary_specs: specs.filter(row => row.capture_mode === 'credential_boundary').length,
    json_specs: specs.filter(row => row.expected_format === 'json').length,
    html_specs: specs.filter(row => row.expected_format === 'html').length,
    required_success_specs: snapshotPlan.required_success_snapshot_refs.length,
    route_summary_rows: summaries.length,
    task_result_rows: results.length,
    execution_rows: allRows.length,
    complete_denominators: 0,
    evidence_rows: 0,
    estate_adoptions: 0,
    finding_promotions: 0,
    graph_effects: 0,
    publication_clearances: 0
  };
  for (const [key, value] of Object.entries(scalarChecks)) {
    if (projection.counts[key] !== value || expected[key] !== value) fail(errors, key + ': Wave 32 count drift');
  }
  if (projection.counts.snapshot_rows !== snapshotRows.length) fail(errors, 'Wave 32 projected snapshot-row count drift');
  if (projection.counts.required_success_captured !== expected.required_success_specs) fail(errors, 'Wave 32 required-success projection drift');
  if (!same(projection.counts.capture_states, countBy(snapshotRows, 'capture_state'))) fail(errors, 'Wave 32 capture-state projection drift');
  if (!same(projection.counts.task_result_states, expected.task_result_states)) fail(errors, 'Wave 32 projected task states drift');
  if (!same(projection.graph_digests, sourceProjection.graph_digests)) fail(errors, 'Wave 32 changed graph digests');
  if (projection.execution_contract?.manual_per_task_network_dispatch_required !== false) fail(errors, 'Wave 32 per-task network dispatch reintroduced');
  if (projection.execution_contract?.release_validation_refetches_network !== false) fail(errors, 'Wave 32 release refetch contract drift');
  if (projection.execution_contract?.credential_boundaries_preserved_without_secret_use !== true) fail(errors, 'Wave 32 credential boundary contract absent');

  for (const key of [
    'snapshot_result_is_evidence_row','snapshot_execution_is_estate_adoption','snapshot_execution_closes_source_gap',
    'snapshot_response_is_complete_denominator','http_success_is_substantive_finding','http_error_is_absence',
    'network_error_is_absence','credential_boundary_is_no_records','public_html_is_complete_register','api_count_is_row_denominator',
    'shared_snapshot_is_relationship','snapshot_recurrence_is_prevalence','identity_created','relationship_created',
    'participation_created','active_claim_created','hop_created','evidence_adjudicated','finding_promoted','publication_cleared'
  ]) if (policy.boundaries[key] !== false) fail(errors, key + ': Wave 32 authority inflation');
  if (policy.boundaries.graph_effect !== 'none') fail(errors, 'Wave 32 graph boundary drift');

  const requiredBasins = requiredBasinPaths(policy);
  for (const [basinId, contract] of Object.entries(requiredBasins)) {
    const basin = wave21Policy.basin_contract.find(row => row.basin_id === basinId);
    if (!basin) {
      fail(errors, basinId + ': Wave 21 basin absent');
      continue;
    }
    for (const relative of contract.prefixes) if (!basin.path_prefixes.includes(relative)) fail(errors, relative + ': Wave 32 path prefix absent from ' + basinId);
    for (const relative of contract.entrypoints) if (!basin.authoritative_entrypoints.includes(relative)) fail(errors, relative + ': Wave 32 entrypoint absent from ' + basinId);
  }
  const generatedPaths = [
    policy.paths.snapshot_ledger,
    policy.paths.projection,
    ...Object.keys(resultRowsByPath),
    ...specs.filter(row => row.capture_mode === 'public_http').map(row => expectedRawPath(row, policy))
  ];
  for (const relative of generatedPaths) {
    if (!wave21Policy.projection_contract.allowed_generated_paths.includes(relative)) fail(errors, relative + ': Wave 32 generated path absent from Wave 21 contract');
  }
  if (wave21Policy.boundaries.wave_32_snapshot_result_is_evidence_row !== false) fail(errors, 'Wave 32 evidence boundary absent from Wave 21 policy');
  if (wave21Policy.boundaries.wave_32_credential_boundary_is_no_records !== false) fail(errors, 'Wave 32 credential boundary absent from Wave 21 policy');

  const routePaths = sourceProjection.routes.map(route => resultPathFor(route.route_class, policy));
  const authoritativeRoots = [
    'data/project/lake-allocator-war-bounded-source-snapshots-wave-32-policy.json',
    policy.paths.snapshot_plan,
    policy.paths.snapshot_ledger,
    policy.paths.method,
    policy.paths.milestone,
    policy.paths.projection,
    policy.paths.report,
    ...routePaths
  ];
  for (const relative of authoritativeRoots) {
    if (!lakeIndexPolicy.authoritative_roots.includes(relative)) fail(errors, relative + ': Wave 32 authoritative root absent');
    if (!installerText.includes(relative)) fail(errors, relative + ': Wave 32 installer registration absent');
  }

  const validateScript = 'node tools/validate-lake-allocator-war-bounded-source-snapshots-wave-32.mjs && node test/lake-allocator-war-bounded-source-snapshots-wave-32.test.js';
  if (pkg.scripts['acquire:lake-allocator-war-bounded-source-snapshots-wave-32'] !== 'node tools/acquire-lake-allocator-war-bounded-source-snapshots-wave-32.mjs') fail(errors, 'Wave 32 acquisition script registration drift');
  if (pkg.scripts['build:lake-allocator-war-bounded-source-snapshots-wave-32'] !== 'node tools/build-lake-allocator-war-bounded-source-snapshots-wave-32.mjs') fail(errors, 'Wave 32 build script registration drift');
  if (pkg.scripts['validate:lake-allocator-war-bounded-source-snapshots-wave-32'] !== validateScript) fail(errors, 'Wave 32 validator registration drift');
  if (!pkg.scripts.check.includes('npm run validate:lake-allocator-war-bounded-source-snapshots-wave-32')) fail(errors, 'Wave 32 absent from release gate');

  for (const relative of repositoryFiles) {
    if (/^\.github\/tmp\/wave32-/.test(relative) || /temporary-wave32/.test(relative) || /run-wave32-.*materializer/.test(relative) || /wave32-.*carrier/.test(relative)) {
      fail(errors, relative + ': temporary Wave 32 transport survived');
    }
  }
  return errors;
}

export function loadState(root = defaultRoot) {
  const policy = readJson(root, 'data/project/lake-allocator-war-bounded-source-snapshots-wave-32-policy.json');
  const snapshotPlan = readJson(root, policy.paths.snapshot_plan);
  const sourcePlan = readJson(root, policy.paths.source_plan);
  const sourceProjectionRaw = fs.readFileSync(full(root, policy.paths.source_projection), 'utf8');
  const sourceProjection = JSON.parse(sourceProjectionRaw);
  const sourceRowsByPath = {};
  const sourceRawByPath = {};
  for (const route of sourceProjection.routes) {
    const raw = fs.readFileSync(full(root, route.result_path), 'utf8');
    sourceRawByPath[route.result_path] = raw;
    sourceRowsByPath[route.result_path] = raw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  }
  const snapshotLedgerRaw = fs.readFileSync(full(root, policy.paths.snapshot_ledger), 'utf8');
  const snapshotRows = snapshotLedgerRaw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const snapshotRawByPath = {};
  for (const row of snapshotRows) if (row.response_body_path) snapshotRawByPath[row.response_body_path] = fs.readFileSync(full(root, row.response_body_path));
  const projection = readJson(root, policy.paths.projection);
  const resultRowsByPath = Object.fromEntries(sourceProjection.routes.map(route => {
    const relative = resultPathFor(route.route_class, policy);
    return [relative, readJsonl(root, relative)];
  }));
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
    snapshotPlan,
    sourcePlan,
    sourceProjection,
    sourceProjectionRaw,
    sourceRowsByPath,
    sourceRawByPath,
    snapshotRows,
    snapshotLedgerRaw,
    snapshotRawByPath,
    projection,
    resultRowsByPath,
    wave21Policy: readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json'),
    lakeIndexPolicy: readJson(root, 'data/project/lake-index-policy.json'),
    pkg: readJson(root, 'package.json'),
    installerText: fs.readFileSync(full(root, 'tools/install-lake-allocator-war-wave-21.mjs'), 'utf8'),
    repositoryFiles
  };
}

function ensureAncestry(root, checkpoint) {
  if (process.env.LAW32_SKIP_GIT === '1') return;
  const run = args => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  const hasCommit = ref => { try { run(['cat-file', '-e', ref + '^{commit}']); return true; } catch { return false; } };
  const isAncestor = (ancestor, target) => { try { run(['merge-base', '--is-ancestor', ancestor, target]); return true; } catch { return false; } };
  if (hasCommit(checkpoint) && isAncestor(checkpoint, 'HEAD')) return;
  const headRef = String(process.env.GITHUB_HEAD_REF ?? '').trim();
  if (process.env.GITHUB_ACTIONS === 'true' && headRef) {
    const remoteRef = 'refs/remotes/origin/' + headRef;
    try { run(['fetch', '--no-tags', '--prune', '--depth=1000000', 'origin', '+refs/heads/' + headRef + ':' + remoteRef]); }
    catch { throw new Error('Wave 32 ancestry recovery failed for ' + headRef); }
    if (!hasCommit(checkpoint)) throw new Error('Wave 32 base checkpoint remains unavailable after history recovery');
    if (!isAncestor(checkpoint, remoteRef)) throw new Error('Wave 32 base checkpoint is not an ancestor of recovered head');
    return;
  }
  if (!hasCommit(checkpoint)) throw new Error('Wave 32 base checkpoint object is unavailable');
  throw new Error('Wave 32 base checkpoint is not an ancestor of HEAD');
}

export function validateRepository(root = defaultRoot) {
  const state = loadState(root);
  ensureAncestry(root, state.policy.base_checkpoint.commit);
  const errors = validateArtifacts(state);
  if (errors.length) {
    for (const error of errors) console.error('- ' + error);
    throw new Error('Wave 32 validation failed with ' + errors.length + ' error(s)');
  }
  console.log('allocator-war bounded source snapshots Wave 32 validation passed');
  console.log('  routes / tasks / sources / snapshots: ' + state.projection.counts.source_routes + ' / ' + state.projection.counts.source_tasks + ' / ' + state.projection.counts.source_receipts + ' / ' + state.projection.counts.snapshot_rows);
  console.log('  public / credential / response files: ' + state.projection.counts.public_http_specs + ' / ' + state.projection.counts.credential_boundary_specs + ' / ' + state.projection.counts.response_snapshot_files);
  console.log('  capture states: ' + JSON.stringify(state.projection.counts.capture_states));
  console.log('  task states: ' + JSON.stringify(state.projection.counts.task_result_states));
  console.log('  evidence / adoption / findings / graph / publication: 0 / 0 / 0 / 0 / 0');
  return state.projection;
}

if (import.meta.url === `file://${process.argv[1]}`) validateRepository();
