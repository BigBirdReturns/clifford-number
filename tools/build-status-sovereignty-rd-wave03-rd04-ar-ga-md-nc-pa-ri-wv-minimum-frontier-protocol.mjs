#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const DATA_REL='data/intake/status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-minimum-frontier-protocol';
export const DATA_DIR=path.join(ROOT,DATA_REL);
export const SOURCE='authored-protocol.json';
export const PROTOCOL_ID='SSC-RD04-W03-AR-GA-MD-NC-PA-RI-WV-MINIMUM-FRONTIER-V1';
export const ROUTE_PREFIX='RD04-W03-MF7';
export const TARGET_STATES=['AR','GA','MD','NC','PA','RI','WV'];
export const TARGET_FIELDS=['operative_state_implementation_authority_and_version','abawd_or_work_requirement_waiver_state_and_governing_period','verification_evidence_and_staff_discretion_surface'];
export const EFFECTS=['publication_effect','adoption_effect','graph_effect','national_prevalence_effect','discrimination_effect','coordination_effect','common_purpose_effect','racial_order_effect','complete_compact_effect'];
export const PREDECESSOR={
  canonical_main:'9d9f9522fbc2909611033370044e9748a29b3cf7',
  source_pr:1258,
  product_commit:'ec8a45f4acd2c8f1c1b6a40837fb46373f7670a4',
  product_tree:'104a107946636f86a3a56dec8f243063a80329b9',
  merge_commit:'9d9f9522fbc2909611033370044e9748a29b3cf7',
  summary_path:'data/intake/status-sovereignty-rd-wave03-rd04-ca-sd-wa-row-state-adjudication/summary.json',
  summary_blob_sha:'7c2e6e211be1d344f7b92405a948152a53c1750f',
  index_path:'data/intake/status-sovereignty-rd-wave03-rd04-ca-sd-wa-row-state-adjudication/index.json',
  index_blob_sha:'c54c5d11ee4de17d29fdc7724124a5a3a7e08c03',
  census_path:'data/intake/status-sovereignty-rd-wave03-rd04-ca-sd-wa-row-state-adjudication/remaining-open-field-census.json',
  census_blob_sha:'1cc10361ff09f1e591db27551baa924544b94d28',
};
export const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
export const gitBlobSha=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
export const stable=o=>JSON.stringify(o,null,2)+'\n';
const must=(c,m)=>{if(!c)throw new Error(m);};
const noneEffects=o=>EFFECTS.every(k=>o[k]==='none');
export function loadAuth(){return JSON.parse(fs.readFileSync(path.join(DATA_DIR,SOURCE),'utf8'));}
export function validateAuth(a){
  must(a.schema_version==='ssc-rd04-wave03-mf7-minimum-frontier-protocol-authored@1','schema');
  must(a.protocol_id===PROTOCOL_ID&&a.wave_id==='SSC-RD-W03'&&a.lane_id==='RD-04'&&a.class_id==='RD-04-C02'&&a.issue===1017,'identity');
  must(a.prepared_at==='2026-08-06'&&a.publication_state==='locally_qualified_unpublished','authoring state');
  const p=a.predecessor_custody;
  must(p.canonical_main_at_authoring===PREDECESSOR.canonical_main&&p.source_pr===1258&&p.product_commit===PREDECESSOR.product_commit&&p.product_tree===PREDECESSOR.product_tree&&p.merge_commit===PREDECESSOR.merge_commit,'predecessor identity');
  must(p.permanent_paths===14&&p.summary_path===PREDECESSOR.summary_path&&p.summary_blob_sha===PREDECESSOR.summary_blob_sha&&p.index_path===PREDECESSOR.index_path&&p.index_blob_sha===PREDECESSOR.index_blob_sha,'predecessor product custody');
  must(p.remaining_open_field_census_path===PREDECESSOR.census_path&&p.remaining_open_field_census_blob_sha===PREDECESSOR.census_blob_sha,'predecessor census custody');
  must(p.postmerge_proof_run===31085245043&&p.postmerge_proof_artifact===8961127883&&p.postmerge_proof_artifact_sha256==='025cffce2a20c137654b0d3446f579c76b0587d048b0b26027834d4eea594339','postmerge proof');
  must(p.terminal_cells===190&&p.still_open_cells===260&&p.terminal_substantive_cells===87&&p.still_open_substantive_cells===213&&p.terminal_units===3&&p.open_units===47&&!p.class_closed&&p.cumulative_ledger_effect==='none','predecessor arithmetic');
  must(a.selection_rule.frontier==='minimum_open_substantive_cells_per_open_state_row'&&a.selection_rule.minimum_open_substantive_cells_per_selected_row===3&&a.selection_rule.selected_state_rows===7&&a.selection_rule.selected_substantive_cells===21&&a.selection_rule.excluded_derivative_row_state_cells===7&&a.selection_rule.selection_complete===true,'selection rule');
  must(JSON.stringify(a.target_state_order)===JSON.stringify(TARGET_STATES)&&JSON.stringify(a.selection_rule.selected_states)===JSON.stringify(TARGET_STATES),'state order');
  must(a.target_cells.length===21&&a.routes.length===30,'denominators');
  const cellIds=new Set(),keys=new Set();
  for(let i=0;i<a.target_cells.length;i++){
    const c=a.target_cells[i];
    must(c.target_cell_ordinal===i+1&&c.target_cell_id===`${ROUTE_PREFIX}-CELL-${String(i+1).padStart(3,'0')}`,'cell sequence');
    must(!cellIds.has(c.target_cell_id),'cell id uniqueness');cellIds.add(c.target_cell_id);
    must(TARGET_STATES.includes(c.postal_code)&&c.unit_id===`US-STATE-${c.postal_code}`&&TARGET_FIELDS.includes(c.field_id),'cell identity');
    const key=`${c.postal_code}:${c.field_id}`;must(!keys.has(key),'cell key uniqueness');keys.add(key);
    must(c.current_state_after_canonical_row_state_merge==='still_open'&&c.current_typed_gap==='no_admitted_state_implementation_source_yet','cell predecessor state');
    must(c.acquisition_obligation.length>80&&c.minimum_state_specific_routes===2&&c.permitted_terminal_states.length===6&&!c.automatic_terminalization_authorized,'cell contract');
    must(!c.outside_human_dependency&&c.reviewed_disposition_effect==='none'&&noneEffects(c),'cell authority');
  }
  for(const state of TARGET_STATES)must([...keys].filter(k=>k.startsWith(`${state}:`)).length===3,`${state} target count`);
  const x=a.route_execution_contract;
  must(x.fixed_routes===30&&x.federal_interpretive_routes===2&&x.state_specific_routes===28&&x.state_specific_routes_per_state===4&&x.minimum_state_specific_routes_per_target_cell===2,'route denominators');
  must(x.maximum_attempts_per_route===1&&x.maximum_parallel_workers===4&&x.maximum_body_bytes_per_route===33554432&&x.redirect_policy==='follow_then_type_final_host'&&x.result_spawned_requests===0,'execution contract');
  must(!x.automatic_source_admission&&!x.automatic_field_classification&&!x.automatic_row_terminalization&&!x.automatic_class_closure,'automatic authority');
  const allowed=new Set(x.allowed_final_hosts),routeIds=new Set(),urls=new Set();
  for(let i=0;i<a.routes.length;i++){
    const r=a.routes[i];
    must(r.route_ordinal===i+1&&r.route_id===`${ROUTE_PREFIX}-${String(i+1).padStart(3,'0')}`,'route sequence');
    must(!routeIds.has(r.route_id)&&!urls.has(r.url),'route uniqueness');routeIds.add(r.route_id);urls.add(r.url);
    const u=new URL(r.url);must(u.protocol==='https:'&&r.request_method==='GET'&&r.expected_request_host===u.hostname.toLowerCase()&&allowed.has(r.expected_request_host),'route URL');
    must(r.maximum_attempts===1&&r.maximum_body_bytes===33554432&&r.result_spawned_requests===0,'route limits');
    must(r.target_cell_keys.length>0&&r.target_cell_keys.every(k=>keys.has(k)),'route targets');
    must(r.selection_purpose.length>40&&r.known_context.length>70&&r.known_context_authority==='pre_execution_context_only','route rationale');
    must(!r.automatic_source_admission&&!r.automatic_field_classification&&!r.automatic_row_terminalization&&!r.automatic_class_closure&&!r.outside_human_dependency&&noneEffects(r),'route authority');
  }
  must(a.routes.filter(r=>r.state_scope==='FED').length===2,'federal routes');
  for(const state of TARGET_STATES){
    must(a.routes.filter(r=>r.state_scope===state).length===4,`${state} route count`);
    for(const field of TARGET_FIELDS){
      const key=`${state}:${field}`;
      must(a.routes.filter(r=>r.state_scope===state&&r.target_cell_keys.includes(key)).length>=2,`${key}: state-specific route floor`);
    }
  }
  must(a.interpretation_constraints.length===12&&new Set(a.interpretation_constraints.map(x=>x.constraint_id)).size===12,'constraints');
  must(a.authority.outside_human_dependency===false&&a.authority.external_contacts===0&&a.authority.external_reviews===0&&a.authority.reviewed_disposition_changes===0&&noneEffects(a.authority),'authority');
  must(a.next_operation.includes(PREDECESSOR.merge_commit)&&a.next_operation.includes('one-file never-merge trigger'),'next operation');
  return true;
}
function countsBy(arr,key){const o={};for(const x of arr)o[x[key]]=(o[x[key]]||0)+1;return Object.fromEntries(Object.entries(o).sort());}
export function buildProducts(a){validateAuth(a);
  const routeLedger={schema_version:'ssc-rd04-wave03-mf7-minimum-frontier-route-ledger@1',protocol_id:a.protocol_id,wave_id:a.wave_id,lane_id:a.lane_id,class_id:a.class_id,issue:a.issue,counts:{fixed_routes:30,federal_interpretive_routes:2,state_specific_routes:28,state_scope_counts:countsBy(a.routes,'state_scope'),route_category_counts:countsBy(a.routes,'route_category'),result_spawned_requests:0},execution_contract:a.route_execution_contract,routes:a.routes,current_result:{requests_executed:0,sources_admitted:0,fields_classified:0,rows_terminalized:0,class_closed:false,outside_human_dependency:false}};
  const fieldCounts=countsBy(a.target_cells,'field_id');
  const targetLedger={schema_version:'ssc-rd04-wave03-mf7-minimum-frontier-target-cell-ledger@1',protocol_id:a.protocol_id,wave_id:a.wave_id,lane_id:a.lane_id,class_id:a.class_id,issue:a.issue,predecessor_custody:a.predecessor_custody,selection_rule:a.selection_rule,counts:{states:7,target_cells:21,target_cells_terminal:0,target_cells_still_open:21,target_field_counts:fieldCounts,terminal_cells_before_protocol:190,still_open_cells_before_protocol:260,terminal_substantive_cells_before_protocol:87,still_open_substantive_cells_before_protocol:213,terminal_units_before_protocol:3,open_units_before_protocol:47,class_closed:false},state_order:a.target_state_order,target_cells:a.target_cells,current_result:{protocol_complete:true,acquisition_complete:false,field_matrix_changed:false,class_closed:false,outside_human_dependency:false}};
  const constraints={schema_version:'ssc-rd04-wave03-mf7-minimum-frontier-constraints@1',protocol_id:a.protocol_id,wave_id:a.wave_id,lane_id:a.lane_id,class_id:a.class_id,issue:a.issue,constraint_count:a.interpretation_constraints.length,constraints:a.interpretation_constraints,authority:a.authority};
  const receipt={schema_version:'ssc-rd04-wave03-mf7-minimum-frontier-execution-receipt-template@1',protocol_id:a.protocol_id,wave_id:a.wave_id,lane_id:a.lane_id,class_id:a.class_id,issue:a.issue,expected:{fixed_routes:30,terminal_routes:30,maximum_attempts_per_route:1,result_spawned_requests:0,automatic_source_admissions:0,automatic_field_classifications:0,automatic_row_terminalizations:0,automatic_class_closures:0},execution:{workflow_run:null,artifact_id:null,artifact_zip_sha256:null,started_at:null,completed_at:null,terminal_routes:null,http_success_pending_separate_adjudication:null,http_non_success:null,disallowed_final_host:null,transport_failure:null,body_limit_exceeded:null},authority:a.authority};
  const index={schema_version:'ssc-rd04-wave03-mf7-minimum-frontier-index@1',protocol_id:a.protocol_id,wave_id:a.wave_id,lane_id:a.lane_id,class_id:a.class_id,issue:a.issue,authored_protocol_path:SOURCE,route_ledger_path:'route-ledger.json',target_cell_ledger_path:'target-cell-ledger.json',constraints_path:'source-interpretation-constraints.json',execution_receipt_template_path:'execution-receipt-template.json',product_manifest_path:'product-manifest.json',predecessor_summary_path:a.predecessor_custody.summary_path,predecessor_summary_blob_sha:a.predecessor_custody.summary_blob_sha,predecessor_index_path:a.predecessor_custody.index_path,predecessor_index_blob_sha:a.predecessor_custody.index_blob_sha,predecessor_remaining_open_field_census_path:a.predecessor_custody.remaining_open_field_census_path,predecessor_remaining_open_field_census_blob_sha:a.predecessor_custody.remaining_open_field_census_blob_sha,counts:{fixed_routes:30,target_states:7,target_cells:21,target_cells_still_open:21,terminal_cells_before_protocol:190,still_open_cells_before_protocol:260,still_open_substantive_cells_before_protocol:213,result_spawned_requests:0},current_result:{protocol_frozen:true,requests_executed:0,field_matrix_changed:false,row_state_changed:false,class_state:'still_open',class_closed:false,cumulative_ledger_effect:'none',publication_state:a.publication_state,outside_human_dependency:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none',national_prevalence_effect:'none',discrimination_effect:'none',coordination_effect:'none',common_purpose_effect:'none',racial_order_effect:'none',complete_compact_effect:'none'},next_operation:a.next_operation};
  const partial={'route-ledger.json':routeLedger,'target-cell-ledger.json':targetLedger,'source-interpretation-constraints.json':constraints,'execution-receipt-template.json':receipt,'index.json':index};
  const entries=[];for(const name of [SOURCE,...Object.keys(partial)]){const b=Buffer.from(name===SOURCE?stable(a):stable(partial[name]));entries.push({path:name,bytes:b.length,sha256:sha256(b)});}const combined=sha256(Buffer.from(entries.map(e=>`${e.path}\0${e.sha256}\n`).join('')));
  const manifest={schema_version:'ssc-rd04-wave03-mf7-minimum-frontier-product-manifest@1',protocol_id:a.protocol_id,wave_id:a.wave_id,lane_id:a.lane_id,class_id:a.class_id,issue:a.issue,permanent_data_files:7,manifest_entries:entries.length,entries,file_set_combined_sha256:combined,result_spawned_requests:0,field_matrix_changed:false,row_state_changed:false,class_closed:false,outside_human_dependency:false};
  return {...partial,'product-manifest.json':manifest};
}
export function validateProducts(p){
  must(Object.keys(p).length===6,'derived product count');
  must(p['route-ledger.json'].counts.fixed_routes===30&&p['route-ledger.json'].counts.state_specific_routes===28,'route counts');
  must(p['target-cell-ledger.json'].counts.states===7&&p['target-cell-ledger.json'].counts.target_cells===21&&p['target-cell-ledger.json'].counts.target_cells_still_open===21,'target counts');
  must(Object.values(p['target-cell-ledger.json'].counts.target_field_counts).every(n=>n===7),'field counts');
  must(p['source-interpretation-constraints.json'].constraint_count===12,'constraint count');
  must(!p['index.json'].current_result.class_closed&&p['index.json'].current_result.cumulative_ledger_effect==='none','class authority');
  must(p['product-manifest.json'].manifest_entries===6&&p['product-manifest.json'].permanent_data_files===7,'manifest');
  return true;
}
export function writeProducts(p){for(const [name,obj] of Object.entries(p))fs.writeFileSync(path.join(DATA_DIR,name),stable(obj));}
export function checkProducts(p){for(const [name,obj] of Object.entries(p)){const expected=stable(obj),file=path.join(DATA_DIR,name);must(fs.existsSync(file),`${name}: missing`);must(fs.readFileSync(file,'utf8')===expected,`${name}: drift`);}return true;}
if(import.meta.url===`file://${process.argv[1]}`){const mode=process.argv[2]||'--check';const a=loadAuth();const p=buildProducts(a);validateProducts(p);if(mode==='--write')writeProducts(p);else if(mode==='--check')checkProducts(p);else throw new Error('usage: --write|--check');console.log('rd04_mf7_minimum_frontier_builder=pass');console.log('fixed_routes=30');console.log('target_states=7');console.log('target_cells=21');console.log('terminal_cells_before_protocol=190/450');console.log('still_open_substantive_cells_before_protocol=213');console.log('class_closed=false');}
