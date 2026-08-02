import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_PATH,SELECTION_PATH,PARENT_PATH,MANIFEST_PATH,BUILD_ROOT,REPORT_ROOT,SOURCE_SHARDS,STATE_SHARDS,SCHEMAS,releaseScope } from './status-sovereignty-rd04-snap-source-availability-a02-constants.mjs';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
export const readJson=(root,rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
export const stable=value=>`${JSON.stringify(value,null,2)}\n`;
export const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
export const write=(root,rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value);};
export const blobSha1=bytes=>crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
export function loadData(root=ROOT){
 const core=readJson(root,CORE_PATH),selection=readJson(root,SELECTION_PATH),parent=readJson(root,PARENT_PATH);
 const sourceShards=SOURCE_SHARDS.map(p=>readJson(root,p)),stateShards=STATE_SHARDS.map(p=>readJson(root,p));
 return {root,core,selection,parent,sourceShards,stateShards,sources:sourceShards.flatMap(s=>s.rows),states:stateShards.flatMap(s=>s.rows),schemas:Object.fromEntries(Object.entries(SCHEMAS).map(([k,p])=>[k,readJson(root,p)]))};
}
export function computeManifest(root=ROOT){
 const entries=releaseScope.map(rel=>{const bytes=fs.readFileSync(path.join(root,rel));return{path:rel,sha256:sha256(bytes),bytes:bytes.length};});
 return {schema_version:'status-sovereignty-rd04-snap-source-availability-a02-release-manifest@3',execution_id:'SSC-RD04-SNAP-A02',hypothesis_id:'SSC-H01',issue:666,as_of:'2026-08-01',hash_mode:'sha256_exact_bytes',scope_ordered:true,self_included:false,entries,combined_sha256:sha256(entries.map(r=>`${r.path}\0${r.sha256}\0${r.bytes}\n`).join('')),boundaries:{exact_bytes_prove_source_truth:false,manifest_proves_search_execution:false,manifest_proves_completed_selection_gate:false,manifest_proves_policy_quality:false,manifest_proves_effective_counterpower:false,manifest_closes_residual_class:false,manifest_changes_reviewed_disposition:false,manifest_authorizes_graph_effect:false,manifest_authorizes_publication:false,graph_effect:'none'}};
}
export function buildSummary(data,manifest){
 const distribution={};for(const row of data.states)distribution[row.total_score]=(distribution[row.total_score]||0)+1;
 const topSet=data.selection.provisional_highest_coverage_set;
 return {
  schema_version:'status-sovereignty-rd04-snap-source-availability-a02-summary@3',execution_id:data.core.execution_id,issue:data.core.issue,as_of:data.core.as_of,title:data.core.title,authority:data.core.authority,
  counts:data.core.counts,
  search_custody:{protocol_declared:data.core.selection_contract.fixed_search_protocol_declared,search_slots_declared:data.core.selection_contract.fixed_search_slots_declared,execution_receipts_preserved:data.core.counts.fixed_search_execution_receipts_preserved,per_state_query_result_logs_preserved:data.core.counts.per_state_query_result_logs_preserved,independent_reproduction_complete:data.core.selection_contract.independent_fixed_search_reproduction_complete},
  selection_result:{status:data.selection.selection_status,selection_gate_complete:data.selection.selection_gate_complete,provisional_highest_score:data.selection.maximum_score,provisional_highest_coverage_set:topSet,final_selected_state:data.selection.final_selected_state,unique_highest_state:data.selection.unique_highest_state,california_in_provisional_highest_coverage_set:topSet.includes('CA'),california_uniquely_highest:data.selection.california_uniquely_highest,computed_rejected_count:data.selection.rejected_shortlist.length,rejected_shortlist_path:SELECTION_PATH},
  dimension_coverage:data.core.dimension_coverage,score_distribution:Object.fromEntries(Object.entries(distribution).sort((a,b)=>Number(b[0])-Number(a[0]))),
  provisional_tied_rows:data.states.filter(r=>topSet.includes(r.state)).map(r=>({state:r.state,state_name:r.state_name,total_score:r.total_score,dimension_scores:r.dimension_scores})),
  source_paths:{core:CORE_PATH,selection:SELECTION_PATH,source_shards:SOURCE_SHARDS,state_shards:STATE_SHARDS},current_result:data.core.current_result,boundaries:data.core.boundaries,release_manifest:{path:MANIFEST_PATH,combined_sha256:manifest.combined_sha256}
 };
}
export function outputPaths(){return {manifest:MANIFEST_PATH,buildManifest:`${BUILD_ROOT}/manifest.json`,buildSummary:`${BUILD_ROOT}/summary.json`,reportSummary:`${REPORT_ROOT}/summary.json`,html:`${REPORT_ROOT}/index.html`};}
