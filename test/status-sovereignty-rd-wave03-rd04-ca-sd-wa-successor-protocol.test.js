#!/usr/bin/env node
import {loadAuth,validateAuth,buildProducts,validateProducts} from '../tools/build-status-sovereignty-rd-wave03-rd04-ca-sd-wa-successor-protocol.mjs';
const clone=o=>structuredClone(o);let refused=0;function reject(mut,label){const a=clone(base);mut(a);let ok=false;try{validateAuth(a);buildProducts(a);}catch{ok=true;}if(!ok)throw new Error(`mutation admitted: ${label}`);refused++;}
const base=loadAuth();validateAuth(base);validateProducts(buildProducts(base));
for(let i=0;i<base.routes.length;i++){
 reject(a=>a.routes[i].route_id=a.routes[(i+1)%a.routes.length].route_id,`route ${i} duplicate id`);
 reject(a=>a.routes[i].route_ordinal+=1,`route ${i} ordinal`);
 reject(a=>a.routes[i].url=a.routes[i].url.replace('https:','http:'),`route ${i} http`);
 reject(a=>{a.routes[i].url='https://example.com/x';a.routes[i].expected_request_host='example.com';},`route ${i} host`);
 reject(a=>a.routes[i].maximum_attempts=2,`route ${i} attempts`);
 reject(a=>a.routes[i].automatic_source_admission=true,`route ${i} source admission`);
 reject(a=>a.routes[i].automatic_field_classification=true,`route ${i} field class`);
 reject(a=>a.routes[i].automatic_row_terminalization=true,`route ${i} row terminal`);
 reject(a=>a.routes[i].automatic_class_closure=true,`route ${i} class close`);
 reject(a=>a.routes[i].result_spawned_requests=1,`route ${i} spawned`);
 reject(a=>a.routes[i].target_cell_keys=['CA:not_a_field'],`route ${i} target`);
 reject(a=>a.routes.splice(i,1),`route ${i} removal`);
}
for(let i=0;i<base.target_cells.length;i++){
 reject(a=>a.target_cells[i].target_cell_id=a.target_cells[(i+1)%a.target_cells.length].target_cell_id,`cell ${i} duplicate`);
 reject(a=>a.target_cells[i].target_cell_ordinal+=1,`cell ${i} ordinal`);
 reject(a=>a.target_cells[i].current_state_after_canonical_promotion='observed',`cell ${i} state`);
 reject(a=>a.target_cells[i].terminal=true,`cell ${i} terminal`);
 reject(a=>a.target_cells[i].automatic_terminalization_authorized=true,`cell ${i} auto`);
 reject(a=>a.target_cells[i].field_id='not_a_field',`cell ${i} field`);
 reject(a=>a.target_cells[i].outside_human_dependency=true,`cell ${i} human`);
 reject(a=>a.target_cells[i].national_prevalence_effect='finding',`cell ${i} prevalence`);
 reject(a=>a.target_cells[i].reviewed_disposition_effect='changed',`cell ${i} disposition`);
 reject(a=>a.target_cells.splice(i,1),`cell ${i} removal`);
}
const globals=[
 a=>a.schema_version='bad',a=>a.protocol_id='bad',a=>a.issue=999,a=>a.publication_state='published',a=>a.predecessor_custody.field_adjudication_merge='0'.repeat(40),a=>a.predecessor_custody.field_promotion_state='locally_qualified_unpublished',a=>a.predecessor_custody.field_promotion_source_pr=999,a=>a.predecessor_custody.field_promotion_product_commit='0'.repeat(40),a=>a.predecessor_custody.field_promotion_product_tree='0'.repeat(40),a=>a.predecessor_custody.field_promotion_merge='0'.repeat(40),a=>a.predecessor_custody.field_promotion_manifest_combined_sha256='0'.repeat(64),a=>a.predecessor_custody.field_promotion_matrix_sha256='0'.repeat(64),a=>a.predecessor_custody.field_promotion_standing_workflow_blob='0'.repeat(40),a=>a.predecessor_custody.field_promotion_exact_head_run=1,a=>a.predecessor_custody.field_promotion_exact_head_artifact_sha256='0'.repeat(64),a=>a.predecessor_custody.terminal_cells_after_promotion=132,a=>a.predecessor_custody.still_open_cells_after_promotion=318,a=>a.target_state_order.reverse(),a=>a.route_execution_contract.fixed_routes=29,a=>a.route_execution_contract.maximum_attempts_per_route=2,a=>a.route_execution_contract.maximum_parallel_workers=5,a=>a.route_execution_contract.result_spawned_requests=1,a=>a.route_execution_contract.automatic_source_admission=true,a=>a.route_execution_contract.automatic_field_classification=true,a=>a.route_execution_contract.automatic_row_terminalization=true,a=>a.route_execution_contract.automatic_class_closure=true,a=>a.interpretation_constraints.pop(),a=>a.authority.outside_human_dependency=true,a=>a.authority.external_contacts=1,a=>a.authority.external_reviews=1,a=>a.authority.reviewed_disposition_changes=1,a=>a.authority.publication_effect='finding',a=>a.authority.graph_effect='finding',a=>a.authority.discrimination_effect='finding',a=>a.authority.coordination_effect='finding',a=>a.authority.complete_compact_effect='finding'];
globals.forEach((m,i)=>reject(m,`global ${i}`));
console.log('rd04_ca_sd_wa_successor_adversarial=pass');console.log(`adversarial_mutations_refused=${refused}`);console.log('positive_fixed_routes=30');console.log('positive_target_cells=9');console.log('class_closed=false');
