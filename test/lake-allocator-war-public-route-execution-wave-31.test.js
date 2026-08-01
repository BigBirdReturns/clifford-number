#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  loadState,
  validateArtifacts
} from '../tools/validate-lake-allocator-war-public-route-execution-wave-31.mjs';

process.env.LAW31_SKIP_GIT = '1';

const baseline = loadState();
const baselineErrors = validateArtifacts(baseline);
assert.deepEqual(baselineErrors, [], 'sealed Wave 31 baseline must validate');

const clone = value => structuredClone(value);
const mutations = [];
const add = (name, mutate) => mutations.push({ name, mutate });

add('policy schema drift', s => { s.policy.schema_version = 'broken'; });
add('source-plan schema drift', s => { s.sourcePlan.schema_version = 'broken'; });
add('projection schema drift', s => { s.projection.schema_version = 'broken'; });
add('program reference drift', s => { s.projection.program_ref = 'OTHER'; });
add('duplicate route reference', s => { s.policy.route_plans[1].route_ref = s.policy.route_plans[0].route_ref; });
add('route denominator shrink', s => { s.policy.route_plans.pop(); });
add('public-route denominator drift', s => { s.policy.route_plans[1].public_execution = false; });
add('duplicate source receipt', s => { s.sourcePlan.sources[1].source_ref = s.sourcePlan.sources[0].source_ref; });
add('non-HTTPS source URL', s => { s.sourcePlan.sources[0].url = 'http://example.test'; });
add('source field deletion', s => { delete s.sourcePlan.sources[0].coverage; });
add('route source-set deletion', s => { s.sourcePlan.route_source_sets.pop(); });
add('route source-set custody drift', s => { s.sourcePlan.route_source_sets[1].route_ref = 'LAW30-R99'; });
add('route source references drift', s => { s.sourcePlan.route_source_sets[1].source_refs = []; });
add('public route without sources', s => { s.policy.route_plans[1].source_refs = []; });
add('protected route receives sources', s => { s.policy.route_plans[0].source_refs = ['LAW31-S001']; });
add('unknown route source reference', s => { s.policy.route_plans[1].source_refs[0] = 'LAW31-S999'; });
add('route coverage deletion', s => { delete s.policy.route_plans[1].coverage_statement; });
add('route remaining limits deletion', s => { s.policy.route_plans[1].remaining_limits = []; });
add('source route count drift', s => { s.sourceProjection.routes.pop(); });
add('source route ledger missing', s => { delete s.sourceRowsByPath[s.sourceProjection.routes[0].result_path]; });
add('source route ledger hash drift', s => { const p = s.sourceProjection.routes[0].result_path; s.sourceRawByPath[p] += '\n'; });
add('projection deterministic drift', s => { s.projection.counts.executed_public_tasks += 1; });
add('ledger path denominator drift', s => { delete s.resultRowsByPath[Object.keys(s.resultRowsByPath)[0]]; });
add('ledger row deterministic drift', s => { const p = Object.keys(s.resultRowsByPath)[0]; s.resultRowsByPath[p][0].source_task_count += 1; });
add('duplicate result reference', s => { const rows = Object.values(s.resultRowsByPath).flat().filter(r => r.row_type === 'public_route_execution_result'); rows[1].result_ref = rows[0].result_ref; });
add('duplicate source-task result', s => { const rows = Object.values(s.resultRowsByPath).flat().filter(r => r.row_type === 'public_route_execution_result'); rows[1].source_task_ref = rows[0].source_task_ref; });
add('result-state inflation', s => { const rows = Object.values(s.resultRowsByPath).flat().filter(r => r.row_type === 'public_route_execution_result'); rows[0].result_state = 'complete'; });
add('public execution state drift', s => { const row = Object.values(s.resultRowsByPath).flat().find(r => r.row_type === 'public_route_execution_result' && r.public_execution); row.executed_in_wave = false; });
add('protected result receives sources', s => { const row = Object.values(s.resultRowsByPath).flat().find(r => r.row_type === 'public_route_execution_result' && !r.public_execution); row.source_refs = ['LAW31-S001']; row.source_receipt_count = 1; });
add('source receipt count drift', s => { const row = Object.values(s.resultRowsByPath).flat().find(r => r.row_type === 'public_route_execution_result' && r.public_execution); row.source_receipt_count += 1; });
add('coverage statement deletion', s => { const row = Object.values(s.resultRowsByPath).flat().find(r => r.row_type === 'public_route_execution_result'); row.coverage_statement = ''; });
add('remaining-row deletion', s => { const row = Object.values(s.resultRowsByPath).flat().find(r => r.row_type === 'public_route_execution_result'); row.remaining_rows = []; });
add('refusal ledger deletion', s => { const row = Object.values(s.resultRowsByPath).flat().find(r => r.row_type === 'public_route_execution_result'); row.refused_substitutions = []; });
add('correction route deletion', s => { const row = Object.values(s.resultRowsByPath).flat().find(r => r.row_type === 'public_route_execution_result'); row.correction_route = []; });
add('complete denominator inflation', s => { const row = Object.values(s.resultRowsByPath).flat().find(r => r.row_type === 'public_route_execution_result'); row.complete_denominator = true; });
add('evidence row inflation', s => { const row = Object.values(s.resultRowsByPath).flat().find(r => r.row_type === 'public_route_execution_result'); row.evidence_rows = 1; });
add('estate adoption inflation', s => { const row = Object.values(s.resultRowsByPath).flat().find(r => r.row_type === 'public_route_execution_result'); row.estate_adopted = true; });
add('finding promotion inflation', s => { const row = Object.values(s.resultRowsByPath).flat().find(r => r.row_type === 'public_route_execution_result'); row.finding_promoted = true; });
add('graph effect inflation', s => { const row = Object.values(s.resultRowsByPath).flat().find(r => r.row_type === 'public_route_execution_result'); row.graph_effect = 'created'; });
add('publication clearance inflation', s => { const row = Object.values(s.resultRowsByPath).flat().find(r => r.row_type === 'public_route_execution_result'); row.publication_status = 'cleared'; });
add('blocked promotion drift', s => { const row = Object.values(s.resultRowsByPath).flat().find(r => r.row_type === 'public_route_execution_result'); row.blocked_promotions = []; });
add('summary executed count drift', s => { const row = Object.values(s.resultRowsByPath).flat().find(r => r.row_type === 'public_route_execution_summary'); row.executed_task_count += 1; });
add('source use count drift', s => { s.projection.source_receipts[0].source_receipt_uses += 1; });
add('graph digest drift', s => { s.projection.graph_digests.participation_sha256 = '0'.repeat(64); });
add('manual dispatch reintroduced', s => { s.projection.execution_contract.manual_per_task_dispatch_required = true; });
add('protected preservation removed', s => { s.projection.execution_contract.protected_tasks_preserved = false; });
add('authority boundary inflation', s => { s.policy.boundaries.public_route_result_is_evidence_row = true; });
add('Wave 31 basin path removed', s => { const basin = s.wave21Policy.basin_contract.find(r => r.basin_id === 'allocator-war-source'); basin.path_prefixes = basin.path_prefixes.filter(p => p !== s.policy.paths.source_plan); });
add('Wave 31 generated path removed', s => { s.wave21Policy.projection_contract.allowed_generated_paths = s.wave21Policy.projection_contract.allowed_generated_paths.filter(p => p !== s.policy.paths.projection); });
add('Wave 31 global evidence boundary removed', s => { delete s.wave21Policy.boundaries.wave_31_public_route_result_is_evidence_row; });
add('Wave 31 authoritative root removed', s => { s.lakeIndexPolicy.authoritative_roots = s.lakeIndexPolicy.authoritative_roots.filter(p => p !== s.policy.paths.projection); });
add('Wave 31 installer registration removed', s => { s.installerText = s.installerText.replace(s.policy.paths.projection, 'missing-wave31-projection'); });
add('Wave 31 package validator removed', s => { delete s.pkg.scripts['validate:lake-allocator-war-public-route-execution-wave-31']; });
add('Wave 31 release gate removed', s => { s.pkg.scripts.check = s.pkg.scripts.check.replace(' && npm run validate:lake-allocator-war-public-route-execution-wave-31', ''); });

for (const { name, mutate } of mutations) {
  const state = clone(baseline);
  mutate(state);
  const errors = validateArtifacts(state);
  assert.ok(errors.length > 0, `${name}: mutation was not rejected`);
}

console.log(`allocator-war public-route execution Wave 31 adversarial mutations passed: ${mutations.length}`);
