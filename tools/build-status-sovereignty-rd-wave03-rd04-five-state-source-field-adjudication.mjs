#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_REL = 'data/intake/status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-source-field-adjudication';
export const DATA_DIR = path.join(ROOT, DATA_REL);
export const INPUT_HASHES = Object.freeze({
  "capture-custody.json": "4b62f1a251694996aed981c793609909f782d6e17c6d17cff42550bb993333e4",
  "source-adjudications.json": "84bdc0a364b937ec221b9ca8c8cf1741154f07b07f739f72fa3e6530482d21a9",
  "field-adjudications.json": "970435624b358361faf0b921ca9e5adbfced970bc0ee29780f00520602c20c19",
  "pdf-review-receipts.json": "ef09e6f58de4acb8826f47af8e2d1dbbc75c771a62f3a8bc30fa65891e8281f5",
  "selected-followup-protocol.json": "a27c057b36de0155463b2872b0e610500db2d7abca08de886e4661c8fc233834"
});
export const FIELD_IDS = Object.freeze(["abawd_or_work_requirement_waiver_state_and_governing_period", "implementation_effective_date_or_typed_gap", "operative_state_implementation_authority_and_version", "verification_evidence_and_staff_discretion_surface"]);
export const STATE_ORDER = Object.freeze(['FL','MT','ND','OR','WI']);
const AUTHORITY = Object.freeze({"automatic_source_admission": false, "automatic_field_classification": false, "automatic_row_terminalization": false, "automatic_class_closure": false, "outside_human_dependency": false, "reviewed_disposition_changes": 0, "publication_effect": "none", "adoption_effect": "none", "graph_effect": "none", "national_prevalence_effect": "none", "discrimination_effect": "none", "racial_order_effect": "none", "coordination_effect": "none", "common_purpose_effect": "none", "complete_compact_effect": "none"});
const DATA_FILES = Object.freeze(['capture-custody.json','source-adjudications.json','field-adjudications.json','pdf-review-receipts.json','promotion-candidate-protocol.json','selected-followup-protocol.json','index.json']);

export const sha256=(value)=>crypto.createHash('sha256').update(value).digest('hex');
export const stable=(value)=>`${JSON.stringify(value,null,2)}\n`;
const abs=(root,rel)=>path.join(root,DATA_REL,rel);
const readBytes=(root,rel,overrides=new Map())=>overrides.has(rel)?Buffer.from(overrides.get(rel)):fs.readFileSync(abs(root,rel));
const readJson=(root,rel,overrides=new Map())=>JSON.parse(readBytes(root,rel,overrides).toString('utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const exactKeys=(value,keys,label)=>{assert(value&&typeof value==='object'&&!Array.isArray(value),`${label}: object required`);assert(JSON.stringify(Object.keys(value).sort())===JSON.stringify([...keys].sort()),`${label}: key set changed`);};
const countBy=(rows,key)=>Object.fromEntries([...rows.reduce((m,r)=>m.set(r[key],(m.get(r[key])??0)+1),new Map())].sort(([a],[b])=>a.localeCompare(b)));

export function loadInputs(root=ROOT,overrides=new Map()){
 for(const [rel,expected] of Object.entries(INPUT_HASHES))assert(sha256(readBytes(root,rel,overrides))===expected,`${rel}: exact SHA-256 mismatch`);
 return {custody:readJson(root,'capture-custody.json',overrides),sources:readJson(root,'source-adjudications.json',overrides),fields:readJson(root,'field-adjudications.json',overrides),pdf:readJson(root,'pdf-review-receipts.json',overrides),followup:readJson(root,'selected-followup-protocol.json',overrides)};
}

export function validateInputs(inputs){
 const {custody,sources,fields,pdf,followup}=inputs;
 assert(custody.schema_version==='ssc-rd04-wave03-five-state-route-discovery-capture-custody@1','custody schema');
 assert(custody.artifact_id===9002226845&&custody.artifact_zip_sha256==='0ddb75c966d20bf9d05385adce6960b06b8c96c3696aed55bafabc853f9e2b63','artifact custody');
 assert(custody.artifact_manifest_entries===60&&custody.artifact_manifest_combined_sha256==='5c850c7e4dc0644204a8cda60b9a540a0851e1e428ad2069373a56ef4db84358','manifest custody');
 assert(custody.capture_counts.requests===27&&custody.capture_counts.candidate_rows===110,'capture denominator');
 assert(custody.capture_counts.source_admissions===0&&custody.capture_counts.field_classifications===0&&custody.capture_counts.row_state_mutations===0,'capture authority');
 assert(JSON.stringify(custody.authority_boundary)===JSON.stringify(AUTHORITY),'custody authority boundary');

 assert(sources.schema_version==='ssc-rd04-wave03-five-state-source-adjudications@1','sources schema');
 assert(Array.isArray(sources.decisions)&&sources.decisions.length===27,'27 request decisions required');
 assert(new Set(sources.decisions.map(r=>r.request_id)).size===27,'request IDs unique');
 assert(sources.decisions.filter(r=>r.terminal_state==='http_success').length===25,'25 HTTP successes required');
 assert(sources.decisions.filter(r=>r.terminal_state==='cross_host_redirect_refused').length===1,'one cross-host refusal required');
 assert(sources.decisions.filter(r=>r.terminal_state==='http_non_success').length===1,'one HTTP non-success required');
 assert(sources.decisions.filter(r=>r.source_admitted_for_narrow_scope).length===25,'25 narrow source admissions required');
 assert(sources.decisions.filter(r=>r.field_review_selected).length===10,'10 field-review sources required');
 for(const [i,r] of sources.decisions.entries()){
  exactKeys(r,['request_ordinal','request_id','requested_url','final_url','surface','terminal_state','http_status','content_type','body_path_in_capture_artifact','body_bytes','body_sha256','redirect_chain','error','document_title','visible_text_characters','visible_word_count','source_class','source_admitted_for_narrow_scope','field_review_selected','candidate_fields_for_offline_review','field_classification_effect','row_state_effect','class_closed','result_spawned_requests','outside_human_dependency','publication_effect','adoption_effect','graph_effect'],`source ${i+1}`);
  assert(r.request_ordinal===i+1,'source ordinal');
  assert(r.field_classification_effect==='none'&&r.row_state_effect==='none'&&!r.class_closed&&r.result_spawned_requests===0&&!r.outside_human_dependency,'source authority');
  assert(r.publication_effect==='none'&&r.adoption_effect==='none'&&r.graph_effect==='none','source effects');
  assert(r.candidate_fields_for_offline_review.every(f=>FIELD_IDS.includes(f)),'source candidate field');
  assert(r.source_admitted_for_narrow_scope===(r.terminal_state==='http_success'),'source admission/transport state');
  assert(!r.field_review_selected||r.source_admitted_for_narrow_scope,'field review requires source');
  if(r.body_sha256!==null)assert(/^[0-9a-f]{64}$/.test(r.body_sha256),'body hash');
 }
 assert(JSON.stringify(sources.authority_boundary)===JSON.stringify(AUTHORITY),'sources authority boundary');

 assert(fields.schema_version==='ssc-rd04-wave03-five-state-field-adjudications@1','fields schema');
 assert(JSON.stringify(fields.frontier.selected_states)===JSON.stringify(STATE_ORDER),'state order');
 assert(JSON.stringify(fields.frontier.selected_field_ids)===JSON.stringify(FIELD_IDS),'field order');
 assert(fields.frontier.cell_count===20&&fields.frontier.terminal_cells_before===218&&fields.frontier.open_substantive_cells_before===192,'frontier counts');
 assert(Array.isArray(fields.decisions)&&fields.decisions.length===20,'20 field decisions required');
 assert(new Set(fields.decisions.map(r=>r.decision_id)).size===20,'field decision IDs unique');
 assert(new Set(fields.decisions.map(r=>`${r.postal_code}:${r.field_id}`)).size===20,'cell keys unique');
 const expectedCells=STATE_ORDER.flatMap(s=>FIELD_IDS.map(f=>`${s}:${f}`));
 assert(JSON.stringify(fields.decisions.map(r=>`${r.postal_code}:${r.field_id}`))===JSON.stringify(expectedCells),'cell order changed');
 const dispositions=countBy(fields.decisions,'disposition');
 assert(JSON.stringify(dispositions)===JSON.stringify({'evidence_complete_bounded_finding':4,'no_relevant_support_hold_open':5,'partial_support_hold_open':9,'temporal_or_scope_ambiguity_hold_open':2}),'field disposition counts');
 assert(fields.decisions.filter(r=>r.promotion_candidate).length===4,'promotion candidate count');
 for(const r of fields.decisions){
  assert(FIELD_IDS.includes(r.field_id)&&STATE_ORDER.includes(r.postal_code),'field identity');
  assert(r.unit_id===`US-STATE-${r.postal_code}`,'unit identity');
  assert(r.promotion_candidate===(r.disposition==='evidence_complete_bounded_finding'),'promotion/disposition binding');
  assert((r.bounded_finding!==null)===r.promotion_candidate,'bounded finding binding');
  assert(r.field_classification_effect==='none'&&r.substantive_field_terminalizations===0&&r.row_state_effect==='none'&&!r.class_closed,'field authority');
  assert(r.result_spawned_requests===0&&!r.outside_human_dependency,'field requests/human');
  assert(r.publication_effect==='none'&&r.adoption_effect==='none'&&r.graph_effect==='none','field effects');
  assert(Array.isArray(r.prohibited_inferences)&&r.prohibited_inferences.length===7,'prohibited inferences');
 }
 assert(JSON.stringify(fields.authority_boundary)===JSON.stringify(AUTHORITY),'fields authority boundary');

 assert(pdf.schema_version==='ssc-rd04-wave03-five-state-pdf-review-receipts@1'&&pdf.reviews.length===5,'PDF review receipts');
 assert(new Set(pdf.reviews.map(r=>`${r.request_id}:${r.page_number}`)).size===5,'PDF review identity');
 for(const r of pdf.reviews){assert(/^[0-9a-f]{64}$/.test(r.pdf_body_sha256)&&/^[0-9a-f]{64}$/.test(r.rendered_png_sha256),'PDF hashes');assert(r.rendered_png_bytes>0,'PDF render bytes');}
 assert(pdf.field_classification_effect==='none'&&!pdf.outside_human_dependency,'PDF authority');

 assert(followup.schema_version==='ssc-rd04-wave03-five-state-selected-followup-protocol@1','followup schema');
 assert(followup.route_count===11&&followup.routes.length===11,'11 follow-up routes required');
 assert(new Set(followup.routes.map(r=>r.route_id)).size===11&&new Set(followup.routes.map(r=>r.requested_url)).size===11,'followup uniqueness');
 for(const [i,r] of followup.routes.entries()){assert(r.route_ordinal===i+1,'followup ordinal');assert(r.maximum_attempts===1&&r.maximum_redirects===4&&r.maximum_body_bytes===16777216,'followup ceilings');assert(!r.cross_host_redirects_allowed&&r.result_spawned_requests===0&&!r.automatic_source_admission&&!r.automatic_field_classification&&!r.automatic_row_terminalization&&!r.automatic_class_closure,'followup authority');assert(r.target_field_ids.every(f=>FIELD_IDS.includes(f)),'followup target field');}
 assert(followup.execution_ceiling.maximum_total_requests===11&&followup.execution_ceiling.result_spawned_requests===0,'followup total ceiling');
 assert(JSON.stringify(followup.authority_boundary)===JSON.stringify(AUTHORITY),'followup authority boundary');
 return inputs;
}

export function derivePromotion(inputs){
 validateInputs(inputs);
 const candidates=inputs.fields.decisions.filter(r=>r.promotion_candidate).map((r,i)=>({
  promotion_ordinal:i+1,promotion_candidate_id:`RD04-NF-PC-${String(i+1).padStart(2,'0')}`,unit_id:r.unit_id,postal_code:r.postal_code,state_name:r.state_name,field_id:r.field_id,
  disposition:r.disposition,bounded_finding:r.bounded_finding,source_request_ids:r.source_request_ids,evidence_locators:r.evidence_locators,
  required_predecessor_cell_state:'still_open',candidate_only:true,matrix_update_authority:false,field_terminalization_authority:false,row_state_authority:false,class_closure_authority:false,
  outside_human_dependency:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none'
 }));
 return {schema_version:'ssc-rd04-wave03-five-state-promotion-candidate-protocol@1',wave_id:'SSC-RD-W03',lane_id:'RD-04',class_id:'RD-04-C02',issue:1017,predecessor_terminal_cells:218,predecessor_open_substantive_cells:192,candidate_count:candidates.length,candidates,current_result:{matrix_updates:0,field_terminalizations:0,row_state_mutations:0,class_closed:false,cumulative_ledger_effect:'none',outside_human_dependency:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none'}};
}

export function deriveIndex(inputs){
 validateInputs(inputs);const promotion=derivePromotion(inputs);const dispositions=countBy(inputs.fields.decisions,'disposition');const sourceClasses=countBy(inputs.sources.decisions,'source_class');
 return {schema_version:'ssc-rd04-wave03-five-state-source-field-adjudication-index@1',wave_id:'SSC-RD-W03',lane_id:'RD-04',class_id:'RD-04-C02',issue:1017,
  capture_artifact_id:inputs.custody.artifact_id,capture_artifact_zip_sha256:inputs.custody.artifact_zip_sha256,capture_manifest_combined_sha256:inputs.custody.artifact_manifest_combined_sha256,
  selected_states:STATE_ORDER,selected_field_ids:FIELD_IDS,
  counts:{capture_requests:27,http_successes:25,http_non_successes:1,cross_host_redirect_refusals:1,source_decisions:27,narrow_source_admissions:25,field_review_sources:10,field_adjudications:20,...Object.fromEntries(Object.entries(dispositions).map(([k,v])=>[k,v])),promotion_candidates:promotion.candidate_count,selected_followup_routes:inputs.followup.route_count,result_spawned_requests:0,matrix_updates:0,field_terminalizations:0,row_state_mutations:0,terminal_cells_after:218,open_substantive_cells_after:192},
  source_class_counts:sourceClasses,current_result:{offline_source_adjudication_complete:true,offline_field_adjudication_complete:true,promotion_candidates_frozen_without_promotion:true,followup_routes_frozen_without_execution:true,field_matrix_changed:false,class_state:'still_open',class_closed:false,cumulative_ledger_effect:'none',outside_human_dependency:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none',national_prevalence_effect:'none',discrimination_effect:'none',racial_order_effect:'none',coordination_effect:'none',common_purpose_effect:'none',complete_compact_effect:'none'},
  next_bounded_operation:'independently validate the four promotion candidates against the exact current matrix and execute the eleven-route fixed follow-up protocol through a never-merge capture lane'
 };
}

export function deriveManifest(root=ROOT){const entries=DATA_FILES.map(rel=>{const b=fs.readFileSync(abs(root,rel));return{path:rel,bytes:b.length,sha256:sha256(b)}});const combined=sha256(Buffer.from(entries.map(e=>`${e.path}\0${e.sha256}\n`).join('')));return{schema_version:'ssc-rd04-wave03-five-state-source-field-adjudication-product-manifest@1',entries,combined_sha256:combined};}

export function validateProduct(root=ROOT,overrides=new Map()){const inputs=loadInputs(root,overrides);validateInputs(inputs);const promotion=derivePromotion(inputs);const index=deriveIndex(inputs);if(overrides.size===0){assert(stable(readJson(root,'promotion-candidate-protocol.json'))===stable(promotion),'promotion protocol differs from derivation');assert(stable(readJson(root,'index.json'))===stable(index),'index differs from derivation');const manifest=deriveManifest(root);assert(stable(readJson(root,'product-manifest.json'))===stable(manifest),'product manifest differs from derivation');}return{inputs,promotion,index};}

function write(root,rel,value){fs.mkdirSync(path.dirname(abs(root,rel)),{recursive:true});fs.writeFileSync(abs(root,rel),stable(value));}
function run(){const writeMode=process.argv.includes('--write');const inputs=loadInputs(ROOT);validateInputs(inputs);const promotion=derivePromotion(inputs);const index=deriveIndex(inputs);if(writeMode){write(ROOT,'promotion-candidate-protocol.json',promotion);write(ROOT,'index.json',index);write(ROOT,'product-manifest.json',deriveManifest(ROOT));}validateProduct(ROOT);console.log(`rd04_five_state_source_field_adjudication=pass sources=${inputs.sources.decisions.length} fields=${inputs.fields.decisions.length} promotions=${promotion.candidate_count} followups=${inputs.followup.route_count}`);}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)run();
