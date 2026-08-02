#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_PATH = 'data/project/lake-allocator-war-public-acquisition-wave-36-policy.json';
const PLAN_PATH = 'data/project/lake-allocator-war-public-acquisition-wave-36-plan.json';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const stableJson = value => JSON.stringify(stable(value));
const full = (root, relative) => path.join(root, relative);
const readJson = (root, relative) => JSON.parse(fs.readFileSync(full(root, relative), 'utf8'));
const readJsonl = (root, relative) => fs.readFileSync(full(root, relative), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const fail = (errors, message) => errors.push(message);
const unique = rows => new Set(rows).size === rows.length;
const countBy = (rows, key) => Object.fromEntries([...new Set(rows.map(row => row[key]))].sort().map(value => [value, rows.filter(row => row[key] === value).length]));
const ROUTES = [
  'internal-authority-and-inventory', 'public-award-and-contract-denominators', 'published-enforcement-and-action-registers',
  'correction-dockets-and-outcomes', 'protected-personnel-records', 'affected-comparator-and-distributional-joins',
  'financial-recovery-and-continuity'
];

function requestDescriptor(spec, defaults) {
  const method = String(spec.request?.method ?? 'GET').toUpperCase();
  const headers = Object.fromEntries(Object.entries({ accept: '*/*', 'user-agent': defaults.user_agent, ...(spec.request?.headers ?? {}) })
    .map(([key, value]) => [String(key).toLowerCase(), String(value)]).sort(([a], [b]) => a.localeCompare(b)));
  const body = spec.request?.body === null || spec.request?.body === undefined ? null : (typeof spec.request.body === 'string' ? spec.request.body : stableJson(spec.request.body));
  if (body !== null && !headers['content-type']) headers['content-type'] = 'application/json';
  const descriptor = { method, url: spec.request.url, headers, body };
  return { ...descriptor, body_sha256: body === null ? null : sha256(Buffer.from(body)), fingerprint_sha256: sha256(Buffer.from(stableJson(descriptor))) };
}

function usable(capture) {
  return Boolean(capture.response_ok && capture.response_body_path && capture.response_body_sha256 && capture.marker_audit?.passed && !['captured_marker_mismatch','response_refused_too_large'].includes(capture.capture_state));
}

function markerPassed(spec, capture, bytes) {
  const groups = spec.marker_groups ?? [];
  if (!groups.length || capture.observed_format === 'pdf' || capture.observed_format === 'binary') return true;
  const text = bytes.toString('utf8').toLowerCase();
  return groups.every(group => group.some(marker => text.includes(String(marker).toLowerCase())));
}

function loadWave35Tasks(root, policy) {
  const files = fs.readdirSync(full(root, policy.paths.source_task_root)).filter(name => name.endsWith('.jsonl')).sort();
  return files.flatMap(name => readJsonl(root, `${policy.paths.source_task_root}/${name}`)).filter(row => row.row_type === 'lawful_join_requirement_acquisition_task').sort((a, b) => a.task_sequence - b.task_sequence);
}

export function validateRepository(root = defaultRoot) {
  const errors = [];
  const policy = readJson(root, POLICY_PATH);
  const plan = readJson(root, PLAN_PATH);
  if (policy.schema_version !== 'lake-allocator-war-public-acquisition-wave-36-policy@1') fail(errors, 'policy schema mismatch');
  if (plan.schema_version !== 'lake-allocator-war-public-acquisition-wave-36-plan@1') fail(errors, 'plan schema mismatch');
  if (policy.program_ref !== 'CN-LAKE-ALLOCATOR-WAR-W36' || plan.program_ref !== policy.program_ref) fail(errors, 'program reference drift');
  if (policy.wave_ref !== 'LAW-W36' || plan.wave_ref !== policy.wave_ref) fail(errors, 'wave reference drift');
  const expectedPolicyCounts = {
    source_specs: 50, transparent_text_relay_sources: 3, task_results: 31, route_summaries: 7, execution_ready_tasks: 28, protected_tasks: 3,
    requirements_satisfied: 0, authorized_joins: 0, joined_rows: 0, complete_denominators: 0,
    evidence_rows: 0, estate_adoptions: 0, finding_promotions: 0, graph_effects: 0, publication_clearances: 0
  };
  for (const [key, expected] of Object.entries(expectedPolicyCounts)) if (policy.expected_counts[key] !== expected) fail(errors, `policy expected count drift ${key}`);
  const expectedBoundaries = {
    capture_is_evidence: false,
    official_record_component_satisfies_requirement: false,
    public_record_completes_no_action_denominator: false,
    public_record_authorizes_protected_access: false,
    award_name_resolves_legal_entity: false,
    announced_amount_is_realized_payment: false,
    docket_presence_is_practical_correction: false,
    recurrence_is_prevalence_or_coordination: false,
    graph_effect: 'none'
  };
  for (const [key, expected] of Object.entries(expectedBoundaries)) {
    if (policy.boundaries[key] !== expected) fail(errors, `policy boundary drift ${key}`);
    if (plan.boundaries[key] !== expected) fail(errors, `plan boundary drift ${key}`);
  }
  for (const [key, expected] of Object.entries({ requirement_satisfied: false, authorized_join: false, joined_rows: 0, complete_denominator: false, evidence_adjudicated: false, finding_promoted: false, publication_cleared: false })) if (policy.boundaries[key] !== expected) fail(errors, `policy authority boundary drift ${key}`);
  const expectedPlanCounts = { source_specs: 50, transparent_text_relay_sources: 3, task_plans: 31, execution_ready_tasks: 28, protected_tasks: 3, required_success_sources: 22, network_request_specs: 50 };
  for (const [key, expected] of Object.entries(expectedPlanCounts)) if (plan.counts[key] !== expected) fail(errors, `plan count drift ${key}`);
  if (plan.request_defaults.concurrency !== 6 || plan.request_defaults.max_attempts !== 2 || plan.request_defaults.max_response_bytes !== 6291456) fail(errors, 'request-default execution ceiling drift');
  if (policy.base_checkpoint.commit !== '4e6f046eeb08ef38a85287ba09e64906c52571c6') fail(errors, 'Wave 35 merge checkpoint drift');
  const sourcePolicy = readJson(root, policy.paths.source_policy);
  const sourceProjection = readJson(root, policy.paths.source_projection);
  if (sourcePolicy.schema_version !== policy.source_contract.required_policy_schema) fail(errors, 'source policy schema mismatch');
  if (sourceProjection.schema_version !== policy.source_contract.required_projection_schema) fail(errors, 'source projection schema mismatch');
  const tasks = loadWave35Tasks(root, policy);
  if (tasks.length !== 31) fail(errors, `source task count ${tasks.length}`);
  if (tasks.filter(row => row.execution_ready).length !== 28) fail(errors, 'execution-ready denominator drift');
  if (tasks.filter(row => row.protected_lawful_access_only).length !== 3) fail(errors, 'protected task denominator drift');

  if (plan.source_specs.length !== policy.expected_counts.source_specs) fail(errors, 'source-spec count mismatch');
  if (plan.task_plans.length !== 31) fail(errors, 'task-plan count mismatch');
  if (!unique(plan.source_specs.map(row => row.source_ref))) fail(errors, 'duplicate source_ref');
  if (!unique(plan.source_specs.map(row => row.capture_ref))) fail(errors, 'duplicate capture_ref');
  if (!unique(plan.source_specs.map(row => row.capture_sequence))) fail(errors, 'duplicate capture_sequence');
  if (!unique(plan.source_specs.map(row => row.storage_path))) fail(errors, 'duplicate storage_path');
  if (!unique(plan.task_plans.map(row => row.task_ref))) fail(errors, 'duplicate task plan');
  const specBySource = new Map(plan.source_specs.map(row => [row.source_ref, row]));
  const relaySourceRefs = new Set(['LAW24-S023','LAW36-S046','LAW36-S047']);
  if (plan.source_specs.filter(row => row.transport_mode === 'transparent_text_relay_of_official_pdf').length !== 3) fail(errors, 'transparent relay denominator drift');
  const taskByRef = new Map(tasks.map(row => [row.task_ref, row]));
  const taskPlanByRef = new Map(plan.task_plans.map(row => [row.task_ref, row]));
  for (let i = 0; i < plan.source_specs.length; i += 1) {
    const spec = plan.source_specs[i];
    if (spec.capture_sequence !== i + 1 || spec.capture_ref !== `LAW36-C${String(i + 1).padStart(3, '0')}`) fail(errors, `${spec.source_ref}: capture order drift`);
    if (!/^https:\/\//.test(spec.request?.url ?? '')) fail(errors, `${spec.source_ref}: non-HTTPS request`);
    if (!['GET','POST'].includes(spec.request?.method)) fail(errors, `${spec.source_ref}: unsupported method`);
    if (spec.required_success !== plan.required_success_source_refs.includes(spec.source_ref)) fail(errors, `${spec.source_ref}: required-success registry drift`);
    if (spec.represented_value?.status?.includes('payment') && spec.source_ref !== 'LAW29-S009') fail(errors, `${spec.source_ref}: represented payment wording unexpected`);
    const isRelay = relaySourceRefs.has(spec.source_ref);
    if ((spec.transport_mode === 'transparent_text_relay_of_official_pdf') !== isRelay) fail(errors, `${spec.source_ref}: transparent relay registry drift`);
    if (isRelay) {
      if (!/^https:\/\/www\.gao\.gov\/assets\/.+\.pdf$/.test(spec.official_origin_url ?? '') || spec.source_locator !== spec.official_origin_url) fail(errors, `${spec.source_ref}: official GAO origin drift`);
      if (!/^https:\/\/r\.jina\.ai\/http:\/\/www\.gao\.gov\/assets\/.+\.pdf$/.test(spec.request.url) || spec.transport_locator !== 'https://r.jina.ai/') fail(errors, `${spec.source_ref}: transparent relay locator drift`);
      if (spec.expected_format !== 'text' || !spec.storage_path.endsWith('.txt')) fail(errors, `${spec.source_ref}: transparent relay format drift`);
    } else if ((spec.transport_mode ?? 'direct_official_http') !== 'direct_official_http' || (spec.official_origin_url ?? spec.source_locator) !== spec.source_locator) fail(errors, `${spec.source_ref}: direct transport drift`);
  }
  for (const task of tasks) {
    const taskPlan = taskPlanByRef.get(task.task_ref);
    if (!taskPlan) { fail(errors, `${task.task_ref}: plan missing`); continue; }
    if (taskPlan.task_sequence !== task.task_sequence) fail(errors, `${task.task_ref}: task sequence drift`);
    if (taskPlan.protected_lawful_access_only !== task.protected_lawful_access_only) fail(errors, `${task.task_ref}: protected state drift`);
    if (taskPlan.protected_lawful_access_only && taskPlan.source_refs.length) fail(errors, `${task.task_ref}: protected task has public source requests`);
    if (!taskPlan.protected_lawful_access_only && !taskPlan.source_refs.length) fail(errors, `${task.task_ref}: executable task lacks sources`);
    for (const ref of taskPlan.source_refs) if (!specBySource.has(ref)) fail(errors, `${task.task_ref}: unknown source ${ref}`);
    if (!taskPlan.completion_gap || taskPlan.result_ceiling !== 'source_components_only_requirement_not_satisfied') fail(errors, `${task.task_ref}: completion ceiling missing`);
  }

  const captures = readJsonl(root, policy.paths.capture_ledger).sort((a, b) => a.capture_sequence - b.capture_sequence);
  if (captures.length !== plan.source_specs.length) fail(errors, `capture count ${captures.length}`);
  if (!unique(captures.map(row => row.source_ref)) || !unique(captures.map(row => row.capture_ref))) fail(errors, 'duplicate capture identity');
  const captureBySource = new Map(captures.map(row => [row.source_ref, row]));
  for (const spec of plan.source_specs) {
    const capture = captureBySource.get(spec.source_ref);
    if (!capture) { fail(errors, `${spec.source_ref}: capture missing`); continue; }
    if (capture.capture_ref !== spec.capture_ref || capture.capture_sequence !== spec.capture_sequence) fail(errors, `${spec.source_ref}: capture identity drift`);
    const request = requestDescriptor(spec, plan.request_defaults);
    if (stableJson(capture.request) !== stableJson(request)) fail(errors, `${spec.source_ref}: request fingerprint drift`);
    if (capture.required_success !== spec.required_success) fail(errors, `${spec.source_ref}: required state drift`);
    if (capture.transport_mode !== spec.transport_mode || capture.official_origin_url !== spec.official_origin_url || capture.transport_locator !== (spec.transport_locator ?? null)) fail(errors, `${spec.source_ref}: transport custody drift`);
    const expectedCaptureAuthority = spec.transport_mode === 'transparent_text_relay_of_official_pdf' ? 'frozen_transparent_text_render_of_official_pdf_acquisition_only' : 'frozen_official_source_response_acquisition_only';
    if (capture.capture_authority !== expectedCaptureAuthority) fail(errors, `${spec.source_ref}: capture transport authority drift`);
    if (capture.response_body_path) {
      if (!fs.existsSync(full(root, capture.response_body_path))) fail(errors, `${spec.source_ref}: body file missing`);
      else {
        const bytes = fs.readFileSync(full(root, capture.response_body_path));
        if (bytes.length !== capture.response_body_bytes) fail(errors, `${spec.source_ref}: body byte count drift`);
        if (sha256(bytes) !== capture.response_body_sha256) fail(errors, `${spec.source_ref}: body hash drift`);
        if (!markerPassed(spec, capture, bytes)) fail(errors, `${spec.source_ref}: marker audit false positive`);
      }
    } else if (capture.response_body_sha256 || capture.response_body_bytes) fail(errors, `${spec.source_ref}: absent body has hash/bytes`);
    if (spec.required_success && !usable(capture)) fail(errors, `${spec.source_ref}: required capture unusable (${capture.capture_state})`);
    for (const field of ['requirement_satisfied','authorized_join','complete_denominator','evidence_adjudicated']) if (capture[field] !== false) fail(errors, `${spec.source_ref}: capture authority inflation ${field}`);
    if (capture.graph_effect !== 'none' || capture.publication_status !== 'blocked') fail(errors, `${spec.source_ref}: capture graph/publication inflation`);
  }

  const records = readJsonl(root, policy.paths.record_ledger).sort((a, b) => a.record_sequence - b.record_sequence);
  const usableCaptures = captures.filter(usable);
  if (records.length !== usableCaptures.length) fail(errors, `record/capture mismatch ${records.length}/${usableCaptures.length}`);
  if (!unique(records.map(row => row.record_ref)) || !unique(records.map(row => row.source_ref))) fail(errors, 'duplicate record identity');
  const recordBySource = new Map(records.map(row => [row.source_ref, row]));
  const reverseTasks = new Map(plan.source_specs.map(row => [row.source_ref, []]));
  for (const taskPlan of plan.task_plans) for (const sourceRef of taskPlan.source_refs) reverseTasks.get(sourceRef).push(taskPlan.task_ref);
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const capture = captureBySource.get(record.source_ref);
    const spec = specBySource.get(record.source_ref);
    if (!capture || !spec || !usable(capture)) fail(errors, `${record.record_ref}: record lacks usable capture`);
    if (record.record_sequence !== i + 1 || record.record_ref !== `LAW36-R${String(i + 1).padStart(3, '0')}`) fail(errors, `${record.record_ref}: record order drift`);
    if (record.response_body_sha256 !== capture.response_body_sha256 || record.response_body_path !== capture.response_body_path) fail(errors, `${record.record_ref}: response custody drift`);
    if (record.transport_mode !== capture.transport_mode || record.official_origin_url !== capture.official_origin_url || record.transport_locator !== capture.transport_locator) fail(errors, `${record.record_ref}: transport custody drift`);
    const expectedComponentAuthority = capture.transport_mode === 'transparent_text_relay_of_official_pdf' ? 'official_record_text_render_component_acquisition_only' : 'official_record_component_acquisition_only';
    if (record.component_authority !== expectedComponentAuthority) fail(errors, `${record.record_ref}: component transport authority drift`);
    if (stableJson(record.task_refs) !== stableJson(reverseTasks.get(record.source_ref))) fail(errors, `${record.record_ref}: task map drift`);
    for (const [field, expected] of [['requirement_satisfied',false],['authorized_join',false],['joined_rows',0],['complete_denominator',false],['evidence_adjudicated',false],['evidence_rows',0],['estate_adopted',false],['finding_promoted',false]]) if (record[field] !== expected) fail(errors, `${record.record_ref}: authority inflation ${field}`);
    if (record.graph_effect !== 'none' || record.publication_status !== 'blocked') fail(errors, `${record.record_ref}: graph/publication inflation`);
  }

  const allResults = [];
  const summaries = [];
  for (let routeIndex = 0; routeIndex < ROUTES.length; routeIndex += 1) {
    const route = ROUTES[routeIndex];
    const relative = `${policy.paths.result_root}/${route}.jsonl`;
    const rows = readJsonl(root, relative);
    if (!rows.length || rows[0].row_type !== 'public_acquisition_route_summary') { fail(errors, `${route}: route summary missing`); continue; }
    const summary = rows[0]; const results = rows.slice(1);
    summaries.push(summary); allResults.push(...results);
    const expectedTasks = tasks.filter(task => task.source_route_class === route || task.route_class === route);
    if (results.length !== expectedTasks.length || summary.task_count !== expectedTasks.length) fail(errors, `${route}: task count mismatch`);
    if (summary.route_sequence !== routeIndex + 1 || summary.route_class !== route) fail(errors, `${route}: route identity drift`);
    if (stableJson(summary.result_states) !== stableJson(countBy(results, 'result_state'))) fail(errors, `${route}: result-state summary drift`);
    if (summary.executed_tasks !== results.filter(row => row.executed_in_wave).length || summary.protected_tasks !== results.filter(row => row.protected_lawful_access_only).length) fail(errors, `${route}: execution summary drift`);
    for (const zero of ['requirements_satisfied','authorized_joins','complete_denominators','evidence_rows','finding_promotions','graph_effects','publication_clearances']) if (summary[zero] !== 0) fail(errors, `${route}: summary inflated ${zero}`);
  }
  if (allResults.length !== 31 || !unique(allResults.map(row => row.source_task_ref))) fail(errors, `task result denominator ${allResults.length}`);
  const resultByTask = new Map(allResults.map(row => [row.source_task_ref, row]));
  for (const task of tasks) {
    const result = resultByTask.get(task.task_ref); const taskPlan = taskPlanByRef.get(task.task_ref);
    if (!result) { fail(errors, `${task.task_ref}: result missing`); continue; }
    if (result.result_sequence !== task.task_sequence || result.route_class !== task.source_route_class) fail(errors, `${task.task_ref}: result identity drift`);
    if (stableJson(result.source_refs) !== stableJson(taskPlan.source_refs)) fail(errors, `${task.task_ref}: source map drift`);
    const expectedRecords = taskPlan.source_refs.map(ref => recordBySource.get(ref)).filter(Boolean).map(row => row.record_ref);
    if (stableJson(result.public_record_refs) !== stableJson(expectedRecords)) fail(errors, `${task.task_ref}: record map drift`);
    if (result.public_record_component_count !== expectedRecords.length) fail(errors, `${task.task_ref}: component count drift`);
    if (task.protected_lawful_access_only) {
      if (result.result_state !== 'preserved_authorized_lawful_access_only' || result.executed_in_wave || result.network_requests_performed !== 0) fail(errors, `${task.task_ref}: protected execution leak`);
    } else {
      const expectedState = expectedRecords.length ? 'source_backed_component_recovery' : 'bounded_public_acquisition_unavailable';
      if (result.result_state !== expectedState || !result.executed_in_wave || result.network_requests_performed !== taskPlan.source_refs.length) fail(errors, `${task.task_ref}: execution state drift`);
    }
    if (result.completion_gap !== taskPlan.completion_gap || result.refused_substitution !== task.refused_substitution) fail(errors, `${task.task_ref}: completion/refusal drift`);
    for (const [field, expected] of [['requirement_satisfied',false],['task_execution_authorizes_join',false],['join_authorized',false],['complete_denominator',false],['evidence_adjudicated',false],['finding_promoted',false]]) if (result[field] !== expected) fail(errors, `${task.task_ref}: result authority inflation ${field}`);
    if (result.joined_rows !== 0 || result.evidence_rows !== 0 || result.graph_effect !== 'none' || result.publication_status !== 'blocked') fail(errors, `${task.task_ref}: result graph/publication inflation`);
  }

  const projection = readJson(root, policy.paths.projection);
  if (projection.schema_version !== 'lake-allocator-war-public-acquisition-wave-36@1') fail(errors, 'projection schema mismatch');
  if (projection.counts.source_specs !== plan.source_specs.length || projection.counts.captures !== captures.length || projection.counts.usable_official_records !== records.length || projection.counts.transparent_text_relay_sources !== 3) fail(errors, 'projection source counts drift');
  if (projection.counts.route_summaries !== 7 || projection.counts.task_results !== 31 || projection.counts.executed_public_or_lawful_tasks !== 28 || projection.counts.protected_tasks !== 3) fail(errors, 'projection task counts drift');
  for (const zero of ['requirements_satisfied','authorized_joins','complete_denominators','evidence_rows','finding_promotions','graph_effects','publication_clearances']) if (projection.counts[zero] !== 0) fail(errors, `projection inflated ${zero}`);
  if (projection.authority !== 'official_record_component_and_transparent_text_render_acquisition_only') fail(errors, 'projection transport authority drift');
  if (projection.graph_effect !== 'none' || projection.publication_status !== 'blocked') fail(errors, 'projection authority inflation');
  if (!fs.existsSync(full(root, policy.paths.report))) fail(errors, 'report missing');
  else { const report = fs.readFileSync(full(root, policy.paths.report), 'utf8'); if (!report.includes('requirements satisfied:                0') || !report.includes('transparent text renders:                3')) fail(errors, 'report missing bounded transport waterline'); }

  const lakePolicy = readJson(root, 'data/project/lake-index-policy.json');
  const permanentPaths = [POLICY_PATH, PLAN_PATH, policy.paths.capture_ledger, policy.paths.record_ledger, policy.paths.projection, policy.paths.report, policy.paths.method, policy.paths.milestone,
    ...ROUTES.map(route => `${policy.paths.result_root}/${route}.jsonl`), ...captures.filter(row => row.response_body_path).map(row => row.response_body_path)];
  for (const relative of permanentPaths) if (!lakePolicy.authoritative_roots.includes(relative)) fail(errors, `${relative}: missing authoritative root`);
  if (lakePolicy.boundaries?.allocator_war_wave_36_official_record_component_is_requirement !== false) fail(errors, 'lake policy Wave 36 component boundary missing');
  const basin = readJson(root, 'data/project/lake-basin-registry.json');
  if (basin.boundaries?.allocator_war_wave_36_capture_authorizes_join !== false) fail(errors, 'basin Wave 36 join boundary missing');
  const pkg = readJson(root, 'package.json');
  for (const key of ['acquire:lake-allocator-war-public-acquisition-wave-36','build:lake-allocator-war-public-acquisition-wave-36','validate:lake-allocator-war-public-acquisition-wave-36','ci:lake-allocator-war-public-acquisition-wave-36']) if (!pkg.scripts[key]) fail(errors, `package script missing ${key}`);
  if (!pkg.scripts.check.includes('validate:lake-allocator-war-public-acquisition-wave-36')) fail(errors, 'Wave 36 absent from complete release gate');
  for (const temporary of ['.github/tmp/wave36-materialize-trigger.json','.github/workflows/temporary-wave36-materializer.yml','tools/run-wave36-materializer.sh']) if (fs.existsSync(full(root, temporary))) fail(errors, `${temporary}: temporary transport retained`);

  if (errors.length) throw new Error(`allocator-war official-record public acquisition Wave 36 validation failed:\n- ${errors.join('\n- ')}`);
  return { sourceSpecs: plan.source_specs.length, captures: captures.length, records: records.length, results: allResults.length, executed: allResults.filter(row => row.executed_in_wave).length, protected: allResults.filter(row => row.protected_lawful_access_only).length };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = validateRepository(defaultRoot);
  console.log('allocator-war official-record public acquisition Wave 36 validation passed');
  console.log(`  source specs / captures / records: ${result.sourceSpecs} / ${result.captures} / ${result.records}`);
  console.log(`  task results / executed / protected: ${result.results} / ${result.executed} / ${result.protected}`);
  console.log('  requirements / joins / evidence / findings / graph / publication: 0 / 0 / 0 / 0 / 0 / 0');
}
