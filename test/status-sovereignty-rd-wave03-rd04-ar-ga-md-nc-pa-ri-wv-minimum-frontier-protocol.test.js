#!/usr/bin/env node
import {loadAuth,validateAuth,buildProducts,validateProducts,TARGET_STATES,TARGET_FIELDS} from '../tools/build-status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-minimum-frontier-protocol.mjs';
const clone=o=>structuredClone(o);let refused=0;const base=loadAuth();validateAuth(base);validateProducts(buildProducts(base));
function reject(mut,label){const a=clone(base);mut(a);let failed=false;try{validateAuth(a);validateProducts(buildProducts(a));}catch{failed=true;}if(!failed)throw new Error(`mutation admitted: ${label}`);refused++;}
for(let i=0;i<base.routes.length;i++){
  reject(a=>a.routes[i].route_id=a.routes[(i+1)%a.routes.length].route_id,`route ${i} duplicate id`);
  reject(a=>a.routes[i].route_ordinal+=1,`route ${i} ordinal`);
  reject(a=>a.routes[i].url=a.routes[i].url.replace('https:','http:'),`route ${i} http`);
  reject(a=>{a.routes[i].url='https://example.com/x';a.routes[i].expected_request_host='example.com';},`route ${i} host`);
  reject(a=>a.routes[i].maximum_attempts=2,`route ${i} attempts`);
  reject(a=>a.routes[i].maximum_body_bytes=1,`route ${i} body limit`);
  reject(a=>a.routes[i].automatic_source_admission=true,`route ${i} source admission`);
  reject(a=>a.routes[i].automatic_field_classification=true,`route ${i} field class`);
  reject(a=>a.routes[i].automatic_row_terminalization=true,`route ${i} row terminal`);
  reject(a=>a.routes[i].automatic_class_closure=true,`route ${i} class close`);
  reject(a=>a.routes[i].result_spawned_requests=1,`route ${i} spawned`);
  reject(a=>a.routes[i].target_cell_keys=['AR:not_a_field'],`route ${i} target`);
  reject(a=>a.routes.splice(i,1),`route ${i} removal`);
}
for(let i=0;i<base.target_cells.length;i++){
  reject(a=>a.target_cells[i].target_cell_id=a.target_cells[(i+1)%a.target_cells.length].target_cell_id,`cell ${i} duplicate id`);
  reject(a=>a.target_cells[i].target_cell_ordinal+=1,`cell ${i} ordinal`);
  reject(a=>a.target_cells[i].current_state_after_canonical_row_state_merge='observed',`cell ${i} state`);
  reject(a=>a.target_cells[i].current_typed_gap='event_absent',`cell ${i} typed gap`);
  reject(a=>a.target_cells[i].automatic_terminalization_authorized=true,`cell ${i} auto terminal`);
  reject(a=>a.target_cells[i].minimum_state_specific_routes=1,`cell ${i} route floor`);
  reject(a=>a.target_cells[i].field_id='not_a_field',`cell ${i} field`);
  reject(a=>a.target_cells[i].outside_human_dependency=true,`cell ${i} human`);
  reject(a=>a.target_cells[i].national_prevalence_effect='finding',`cell ${i} prevalence`);
  reject(a=>a.target_cells[i].reviewed_disposition_effect='changed',`cell ${i} disposition`);
  reject(a=>a.target_cells.splice(i,1),`cell ${i} removal`);
}
const globals=[
  a=>a.schema_version='bad',a=>a.protocol_id='bad',a=>a.issue=999,a=>a.prepared_at='2026-08-07',a=>a.publication_state='published',
  a=>a.predecessor_custody.canonical_main_at_authoring='0'.repeat(40),a=>a.predecessor_custody.source_pr=1,a=>a.predecessor_custody.product_commit='0'.repeat(40),a=>a.predecessor_custody.product_tree='0'.repeat(40),a=>a.predecessor_custody.merge_commit='0'.repeat(40),
  a=>a.predecessor_custody.summary_blob_sha='0'.repeat(40),a=>a.predecessor_custody.index_blob_sha='0'.repeat(40),a=>a.predecessor_custody.remaining_open_field_census_blob_sha='0'.repeat(40),a=>a.predecessor_custody.postmerge_proof_run=1,a=>a.predecessor_custody.postmerge_proof_artifact_sha256='0'.repeat(64),
  a=>a.predecessor_custody.terminal_cells=189,a=>a.predecessor_custody.still_open_substantive_cells=212,a=>a.predecessor_custody.class_closed=true,a=>a.predecessor_custody.cumulative_ledger_effect='changed',
  a=>a.selection_rule.frontier='broad',a=>a.selection_rule.minimum_open_substantive_cells_per_selected_row=4,a=>a.selection_rule.selected_substantive_cells=20,a=>a.selection_rule.selection_complete=false,a=>a.target_state_order.reverse(),
  a=>a.route_execution_contract.fixed_routes=29,a=>a.route_execution_contract.federal_interpretive_routes=3,a=>a.route_execution_contract.state_specific_routes=27,a=>a.route_execution_contract.state_specific_routes_per_state=3,a=>a.route_execution_contract.minimum_state_specific_routes_per_target_cell=1,a=>a.route_execution_contract.maximum_attempts_per_route=2,a=>a.route_execution_contract.maximum_parallel_workers=8,a=>a.route_execution_contract.maximum_body_bytes_per_route=1,a=>a.route_execution_contract.result_spawned_requests=1,a=>a.route_execution_contract.automatic_source_admission=true,a=>a.route_execution_contract.automatic_field_classification=true,a=>a.route_execution_contract.automatic_row_terminalization=true,a=>a.route_execution_contract.automatic_class_closure=true,
  a=>a.interpretation_constraints.pop(),a=>a.authority.outside_human_dependency=true,a=>a.authority.external_contacts=1,a=>a.authority.external_reviews=1,a=>a.authority.reviewed_disposition_changes=1,a=>a.authority.publication_effect='finding',a=>a.authority.graph_effect='finding',a=>a.authority.discrimination_effect='finding',a=>a.authority.coordination_effect='finding',a=>a.authority.complete_compact_effect='finding',a=>a.next_operation='close class now',
];
globals.forEach((m,i)=>reject(m,`global ${i}`));
for(const state of TARGET_STATES){reject(a=>{const i=a.routes.findIndex(r=>r.state_scope===state);a.routes[i].state_scope='FED';},`${state} route distribution`);}
for(const state of TARGET_STATES)for(const field of TARGET_FIELDS)reject(a=>{for(const r of a.routes)if(r.state_scope===state&&r.target_cell_keys.includes(`${state}:${field}`))r.target_cell_keys=r.target_cell_keys.filter(k=>k!==`${state}:${field}`);},`${state}:${field} state-specific route floor`);
console.log('rd04_mf7_minimum_frontier_adversarial=pass');console.log(`adversarial_mutations_refused=${refused}`);console.log('positive_fixed_routes=30');console.log('positive_target_states=7');console.log('positive_target_cells=21');console.log('class_closed=false');
