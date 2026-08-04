#!/usr/bin/env node
import assert from 'node:assert/strict';
import { FIELD_IDS, FIELD_TERMINAL_STATES, SEARCH_TERMS, INSTRUMENTS } from '../tools/build-status-sovereignty-rd-wave03-rd03-lifecycle-recovery-intake.mjs';
import { readBundle, validatePackage, validatePackageShape, validateSchemaShape } from '../tools/validate-status-sovereignty-rd-wave03-rd03-lifecycle-recovery-intake.mjs';

const clone = (value) => structuredClone(value);
validatePackage();
const bundle = readBundle();

const mutations = [
 ['schema version',v=>v.schema_version='bad'],['wave',v=>v.wave_id='OTHER'],['lane',v=>v.lane_id='RD-02'],['class',v=>v.class_id='RD-03-C04'],['issue',v=>v.issue=788],
 ['cutoff',v=>v.as_of='2026-08-03'],['authority',v=>v.authority='empirical'],['constitution',v=>v.source_custody.constitution_merge='0'.repeat(40)],
 ['frozen base',v=>v.source_custody.frozen_execution_base='0'.repeat(40)],['parent promotion',v=>v.source_custody.parent_promotion_merge='0'.repeat(40)],
 ['parent reopened',v=>v.source_custody.parent_receipt_reopened_or_double_counted=true],['instrument count',v=>v.denominator.instrument_count=4],
 ['executed split',v=>v.denominator.executed_and_cash_disbursed_parent_units=2],['conditional split',v=>v.denominator.conditional_pre_close_parent_units=3],
 ['fields per row',v=>v.denominator.required_fields_per_instrument=10],['field slots',v=>v.denominator.required_field_slots=54],
 ['source count denominator',v=>v.denominator.source_count_is_unit_denominator=true],['substitution',v=>v.denominator.later_announcement_may_substitute_instrument=true],
 ['complete cohort',v=>v.denominator.five_instruments_are_complete_osc_cohort=true],['field removed',v=>v.required_fields.pop()],
 ['field order',v=>v.required_fields.reverse()],['field id',v=>v.required_fields[0].field_id='other'],['question',v=>v.required_fields[0].question='short'],
 ['field states',v=>v.required_fields[0].permitted_terminal_states.push('zero')],['instrument removed',v=>v.instruments.pop()],
 ['instrument order',v=>v.instruments.reverse()],['instrument id',v=>v.instruments[0].unit_id='other'],['parent state',v=>v.instruments[0].inherited_parent_state='conditional_pre_close'],
 ['instrument source',v=>v.instruments[0].parent_source_ids=[]],['instrument fields',v=>v.instruments[0].required_field_ids=FIELD_IDS.slice(1)],
 ['instrument executed',v=>v.instruments[0].protocol_state='executed'],['instrument terminal',v=>v.instruments[0].terminal_fields=1],['instrument closed',v=>v.instruments[0].row_closed=true],
 ['route removed',v=>v.routes.pop()],['route order',v=>v.routes.reverse()],['duplicate route id',v=>v.routes[1].route_id=v.routes[0].route_id],
 ['duplicate route url',v=>v.routes[1].request_url=v.routes[0].request_url],['exact route type',v=>v.routes[0].route_type='fixed_candidate_query_bing_rss'],
 ['exact admission',v=>v.routes[0].admission_state='candidate_census_only_not_admitted_source'],['exact attempt',v=>v.routes[0].maximum_attempts=2],
 ['exact followup',v=>v.routes[0].automatic_result_followups=1],['query type',v=>v.routes[18].route_type='exact_predeclared_get'],
 ['query term',v=>v.routes[18].search_term=SEARCH_TERMS[1]],['query admitted',v=>v.routes[18].admission_state='predeclared_official_or_regulatory_source'],
 ['query followup',v=>v.routes[18].automatic_result_followups=1],['transport attempts',v=>v.transport_contract.maximum_attempts_per_route=2],
 ['transport timeout',v=>v.transport_contract.timeout_ms=1],['transport size',v=>v.transport_contract.maximum_body_bytes=1],['transport concurrency',v=>v.transport_contract.concurrency=20],
 ['result spawned',v=>v.transport_contract.result_spawned_requests=1],['second pass',v=>v.transport_contract.automatic_second_pass_authorized=true],
 ['external contact',v=>v.transport_contract.external_contacts=1],['outside human',v=>v.transport_contract.outside_human_dependency=true],
 ['admission rule removed',v=>v.admission_rules.pop()],['terminal rule removed',v=>v.terminal_rules.pop()],['count instruments',v=>v.counts.instruments=4],
 ['count fields',v=>v.counts.required_field_slots=54],['count routes',v=>v.counts.fixed_routes=42],['count exact',v=>v.counts.exact_predeclared_routes=17],
 ['count queries',v=>v.counts.candidate_census_routes=24],['acquisition started',v=>v.counts.acquisition_attempts=1],['terminal fields',v=>v.counts.terminal_fields=1],
 ['terminal rows',v=>v.counts.terminal_instruments=1],['candidate admitted',v=>v.counts.admitted_candidate_sources=1],['current state',v=>v.current_result.terminal_state='terminal'],
 ['protocol executed',v=>v.current_result.fixed_protocol_executed=true],['class closed',v=>v.current_result.class_closed=true],['lifecycle complete',v=>v.current_result.complete_lifecycle_chronology_observed=true],
 ['recovery found',v=>v.current_result.public_recovery_observed=true],['favoritism',v=>v.current_result.favoritism_finding=true],['extraction',v=>v.current_result.extraction_finding=true],
 ['coordination',v=>v.current_result.coordination_finding=true],['common purpose',v=>v.current_result.common_purpose_finding=true],['reviewed disposition',v=>v.current_result.reviewed_disposition_changed=true],
 ['publication',v=>v.current_result.publication_effect='published'],['graph',v=>v.current_result.graph_effect='added'],['commitment collapse',v=>v.boundaries.conditional_commitment_is_financial_close=true],
 ['close collapse',v=>v.boundaries.financial_close_is_cash_disbursement=true],['draw collapse',v=>v.boundaries.executed_loan_is_full_draw=true],
 ['interest collapse',v=>v.boundaries.scheduled_interest_is_observed_payment=true],['default collapse',v=>v.boundaries.outstanding_obligation_is_default=true],
 ['repayment collapse',v=>v.boundaries.maturity_term_is_repayment=true],['recovery collapse',v=>v.boundaries.companion_public_right_is_loan_recovery=true],
 ['candidate collapse',v=>v.boundaries.candidate_query_result_is_admitted_source=true],['absence collapse',v=>v.boundaries.no_public_record_is_event_absence=true],
 ['cohort collapse',v=>v.boundaries.five_named_instruments_are_complete_osc_cohort=true],['intake closes class',v=>v.boundaries.intake_protocol_is_class_closure=true],
 ['extra root',v=>v.unreviewed=true]
];
let refused=0;
for (const [name,mutate] of mutations) {
 const value=clone(bundle.package); mutate(value);
 assert.throws(()=>validatePackageShape(value,bundle.schema,bundle.seed,bundle.constitution,bundle.parent,bundle.matrixContract,bundle.parentMatrix,bundle.parentReceipt,bundle.parentClosure),undefined,name);
 refused++;
}
const schemaMutations=[
 ['schema open',s=>s.additionalProperties=true],['schema fields',s=>s.properties.required_fields.maxItems=12],['schema instruments',s=>s.properties.instruments.minItems=4],
 ['schema routes',s=>s.properties.routes.maxItems=44],['schema field count',s=>s.properties.counts.properties.required_field_slots.const=54],
 ['schema route count',s=>s.properties.counts.properties.fixed_routes.const=42],['schema acquisition',s=>s.properties.counts.properties.acquisition_attempts.const=1],
 ['schema closed',s=>s.properties.current_result.properties.class_closed.const=true],['schema candidate',s=>s.properties.boundaries.properties.candidate_query_result_is_admitted_source.const=true]
];
for (const [name,mutate] of schemaMutations) { const value=clone(bundle.schema); mutate(value); assert.throws(()=>validateSchemaShape(value),undefined,name); refused++; }
assert.deepEqual(bundle.package.required_fields.map(row=>row.field_id),FIELD_IDS);
assert.deepEqual(bundle.package.required_fields[0].permitted_terminal_states,FIELD_TERMINAL_STATES);
assert.deepEqual(bundle.package.instruments.map(row=>row.unit_id),INSTRUMENTS.map(row=>row.unit_id));
console.log(`RD-03 Wave-03 intake adversarial suite: ${refused} mutations refused`);
