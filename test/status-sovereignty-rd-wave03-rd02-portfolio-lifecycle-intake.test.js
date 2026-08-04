#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, PACKAGE_PATH, SCHEMA_PATH, derivePackage } from '../tools/build-status-sovereignty-rd-wave03-rd02-portfolio-lifecycle-intake.mjs';
import { validatePackageData } from '../tools/validate-status-sovereignty-rd-wave03-rd02-portfolio-lifecycle-intake.mjs';
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const base = read(PACKAGE_PATH), schema = read(SCHEMA_PATH), expected = derivePackage(ROOT), clone = structuredClone;
const fail = (m) => { throw new Error(m); };
function expect(name, mutate, pattern, schemaMutation = false) {
  const value = clone(base), s = clone(schema);
  mutate(schemaMutation ? s : value);
  try { validatePackageData(value, s, expected); fail(`${name}: passed`); }
  catch (error) { if (!pattern.test(error.message)) fail(`${name}: ${error.message}`); }
}
validatePackageData(base, schema, expected);
const cases = [
 ['identity',v=>v.class_id='RD-02-C04',/identity/],['status',v=>v.status='executed',/status/],['closure',v=>v.closure_target='portfolio',/closure target/],
 ['contract path',v=>v.source_custody.field_matrix_contract_path='x',/contract custody/],['contract hash',v=>v.source_custody.field_matrix_contract_sha256='0'.repeat(64),/contract custody/],
 ['seed path',v=>v.source_custody.seed_path='x',/seed custody/],['seed hash',v=>v.source_custody.seed_sha256='0'.repeat(64),/seed custody/],
 ['parent matrix',v=>v.source_custody.parent_terminal_matrix_class_id='RD-02-C05',/parent matrix/],['parent receipt',v=>v.source_custody.parent_class_receipt_terminal_state='complete',/parent receipt/],
 ['parent reopened',v=>v.source_custody.parent_row_membership_reused_without_reopening=false,/row reuse/],['unit removed',v=>v.denominator.units.pop(),/18x10/],
 ['field removed',v=>v.denominator.required_fields.pop(),/18x10/],['unit count',v=>v.denominator.unit_count=17,/unit counts/],['public count',v=>v.denominator.publicly_named_units=18,/unit counts/],
 ['withheld count',v=>v.denominator.identity_withheld_units=0,/unit counts/],['cells',v=>v.denominator.required_cells=179,/cell denominator/],['materialized',v=>v.denominator.materialized_cells=1,/advanced/],
 ['terminal cells',v=>v.denominator.terminal_cells=1,/advanced/],['terminal units',v=>v.denominator.terminal_units=1,/advanced/],['closed',v=>v.denominator.class_closed=true,/advanced/],
 ['unit reorder',v=>{[v.denominator.units[0],v.denominator.units[1]]=[v.denominator.units[1],v.denominator.units[0]]},/unit order/],
 ['unit duplicate',v=>v.denominator.units[1].unit_id=v.denominator.units[0].unit_id,/duplicate unit/],['withheld guessed',v=>v.denominator.units[17].legal_vehicle='guessed',/withheld row/],
 ['route removed',v=>v.execution_contract.fixed_routes.pop(),/fixed route count/],['route order',v=>v.execution_contract.fixed_routes[0].ordinal=2,/route order/],
 ['route duplicate',v=>v.execution_contract.fixed_routes[1].route_id=v.execution_contract.fixed_routes[0].route_id,/duplicate route/],
 ['exact class',v=>v.execution_contract.fixed_routes[0].route_type='bing_rss_search',/exact route class|candidate boundary/],
 ['search class',v=>v.execution_contract.fixed_routes[6].route_type='exact_get',/exact route class|search route class|exact-source boundary/],
 ['method',v=>v.execution_contract.fixed_routes[0].method='POST',/request contract/],['attempt',v=>v.execution_contract.fixed_routes[0].maximum_attempts=2,/request contract/],
 ['search admitted',v=>v.execution_contract.fixed_routes[6].evidence_admission_authorized=true,/candidate boundary/],['result spawn',v=>v.execution_contract.result_spawned_requests=1,/result-dependent/],
 ['not fixed',v=>v.execution_contract.fixed_before_results=false,/result-dependent/],['global attempts',v=>v.execution_contract.maximum_attempts_per_route=2,/bounded execution/],
 ['timeout',v=>v.execution_contract.timeout_ms=1,/bounded execution/],['body',v=>v.execution_contract.maximum_body_bytes=1,/bounded execution/],['concurrency',v=>v.execution_contract.concurrency=9,/bounded execution/],
 ['auto follow',v=>v.execution_contract.automatic_candidate_followup_authorized=true,/automatic expansion/],['auto second',v=>v.execution_contract.automatic_second_pass_authorized=true,/automatic expansion/],
 ['search evidence',v=>v.candidate_law.search_result_is_evidence=true,/search result/],['official support',v=>v.candidate_law.official_domain_is_substantive_support=true,/domain promoted/],
 ['first party support',v=>v.candidate_law.first_party_domain_is_substantive_support=true,/domain promoted/],['lexical identity',v=>v.candidate_law.lexical_legal_vehicle_match_is_identity_resolution=true,/lexical or rank/],
 ['rank authority',v=>v.candidate_law.result_rank_is_authority=true,/lexical or rank/],['no successor',v=>v.candidate_law.candidate_url_followup_requires_separate_frozen_successor=false,/successor law/],
 ['weak admission',v=>v.candidate_law.candidate_admission_requires_page_level_identity_event_and_instrument_custody=false,/successor law/],
 ['terminal authorized',v=>v.next_stage.terminal_product_authorized_now=true,/terminal authority/],['closure authorized',v=>v.next_stage.class_closure_authorized_now=true,/terminal authority/],
 ['request count',v=>v.current_counts.request_attempts=1,/current counts/],['candidate count',v=>v.current_counts.candidate_rows=1,/current counts/],
 ['admitted count',v=>v.current_counts.admitted_evidence_sources=1,/current counts/],['contact count',v=>v.current_counts.external_contacts=1,/current counts/],
 ['program projection',v=>v.boundaries.program_projection_is_fund_investment=true,/program_projection/],['exit return',v=>v.boundaries.exit_is_positive_realized_return=true,/exit_is/],
 ['search truth',v=>v.boundaries.search_result_is_source_truth=true,/search_result/],['withheld participation',v=>v.boundaries.withheld_identity_is_nonparticipation=true,/withheld_identity/],
 ['graph effect',v=>v.boundaries.graph_effect='added',/graph_effect/]
];
for (const [n,m,p] of cases) expect(n,m,p);
const schemaCases=[['schema open',s=>s.additionalProperties=true,/schema root/,true],['required',s=>s.required.pop(),/required keys/,true],['property',s=>s.properties.extra={const:true},/schema properties/,true],['route bind',s=>s.properties.execution_contract.const.fixed_routes.pop(),/schema execution_contract binding/,true]];
for (const c of schemaCases) expect(...c);
console.log(`status-sovereignty-rd-wave03-rd02-portfolio-lifecycle-intake.test: positive plus ${cases.length + schemaCases.length} adversarial mutations passed`);
