#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const MATRIX_PATH='data/intake/status-sovereignty-rd-wave02-rd02-license-leverage/field-matrix.json';
export const PARENT_PATH='data/intake/status-sovereignty-rd02-sbicct-state-transitions.json';
export const SEED_PATH='data/project/ssc-residual-wave02/seeds/RD-02-C04.json';
export const CONSTITUTION_PATH='data/research/status-sovereignty-residual-denominator-wave-02-constitution.json';
export const CURRENT_LEDGER_PATH='data/research/status-sovereignty-residual-denominator-wave-02-current.json';
export const CAPTURE_ROOT='data/intake/status-sovereignty-rd-wave02-rd02-license-leverage/source-custody/fixed-source-capture-v1';
export const EXECUTION_RECEIPT_PATH='data/intake/status-sovereignty-rd-wave02-rd02-license-leverage/fixed-source-capture-execution-receipt.json';
export const PRODUCT_ROOT='data/research/status-sovereignty-rd-wave02-rd02-license-leverage';
export const CLOSURE_PATH='data/project/ssc-residual-wave02/closures/RD-02-C04.json';
export const CLASS_LABEL='fund-level Green Light, license, leverage commitment, draw, fee, covenant, and amendment chronology';
export const SEED_LABEL='Green Light, license, leverage commitment, draw, fee, covenant, and amendment chronology';
export const LABEL_RECONCILIATION='constitution_adds_fund-level_qualifier_while_seed_label_is_retained_exact';
export const TERMINAL_STATE='bounded_source_unavailable';
export const SOURCE_HEAD='c78d243ee3d5c5c9b6c09e4b620bd3192b5e25a1';
export const MATRIX_SHA256='f5fbd295998740a1f27f06581c6539d681fe30e8c18a029254eeea7cddb8ffbc';
export const PARENT_SHA256='c856caa5406ae49e150b2151848273b01e400edd14019eda468d9b0fd7a2c446';
export const CAPTURE_ARTIFACT_SHA256='63e1fc4bea63b2d00b8fbbe4b8f585edd2e76a3c380445305c2a7997cf166a67';
export const CAPTURE_MANIFEST_SHA256='7ad0486832b496d3fa8242cf4ea927e9a45ff3add7005eb5736ec01aec6f977f';
export const REQUIRED_FIELDS=['legal_vehicle_or_withheld_state_label','initial_state_and_date','later_license_state_and_date','leveraged_or_non_leveraged_license_state','public_leverage_commitment_amount_and_date','actual_sba_guaranteed_leverage_draw_amount_and_date','fee_and_pricing_terms','covenants_and_remedies','amendments_waivers_suspension_surrender_or_termination','source_identities_and_exact_custody'];
const abs=(root,rel)=>path.join(root,rel),readBytes=(root,rel)=>fs.readFileSync(abs(root,rel)),read=(root,rel)=>JSON.parse(readBytes(root,rel).toString('utf8'));
const sha256=(value)=>crypto.createHash('sha256').update(value).digest('hex'),encode=(value)=>Buffer.from(`${JSON.stringify(value,null,2)}\n`,'utf8');
const ok=(c,m)=>{if(!c)throw new Error(m);},same=(a,b,m)=>ok(JSON.stringify(a)===JSON.stringify(b),m);
const routeMap={'SSC-RD02-S001':'01-ssc-rd02-s001','SSC-RD02-S002':'02-ssc-rd02-s002','SSC-RD02-S003':'03-ssc-rd02-s003','SSC-RD02-S004':'04-ssc-rd02-s004','SSC-RD02-S005':'05-ssc-rd02-s005'};
const routeIds=(ids)=>ids.filter((id)=>routeMap[id]).map((id)=>routeMap[id]);
const field=(state,value,source_ids,capture_route_ids,note)=>({state,value,source_ids:[...new Set(source_ids)],capture_route_ids:[...new Set(capture_route_ids)],note,fixed_protocol_complete:true,terminal_for_class_closure:true});
const unavailable=(routes,note,value=null,sources=[])=>field('source_unavailable_after_fixed_protocol',value,sources,routes,note);

function terminalFrom(root=ROOT){
  const matrix=read(root,MATRIX_PATH),parent=read(root,PARENT_PATH),seed=read(root,SEED_PATH),constitution=read(root,CONSTITUTION_PATH),capture=read(root,`${CAPTURE_ROOT}/manifest.json`),execution=read(root,EXECUTION_RECEIPT_PATH);
  ok(sha256(readBytes(root,MATRIX_PATH))===MATRIX_SHA256,'matrix bytes changed');
  ok(sha256(readBytes(root,PARENT_PATH))===PARENT_SHA256,'parent bytes changed');
  ok(matrix.class_id==='RD-02-C04'&&matrix.issue===787&&matrix.rows.length===18,'matrix identity changed');
  same(matrix.required_fields,REQUIRED_FIELDS,'required fields changed');
  ok(parent.execution_id==='SSC-RD02-SBICCT-01'&&parent.cohort_rows.length===18&&parent.sources.length===5,'parent denominator changed');
  ok(seed.closure_target===SEED_LABEL&&seed.input_manifest.combined_sha256==='657fdf875e175150daaa8d213ea7fd1f4baa5eaa82f03aad4d070bd1e0331b7c','seed custody changed');
  const attempt=constitution.lane_attempts.find((row)=>row.class_id==='RD-02-C04');
  ok(attempt?.issue===787&&attempt?.exact_label===CLASS_LABEL,'constitution changed');
  ok(capture.entry_count===29&&capture.combined_sha256===CAPTURE_MANIFEST_SHA256,'capture manifest changed');
  ok(execution.artifact_zip_sha256===CAPTURE_ARTIFACT_SHA256&&execution.capture_manifest_combined_sha256===CAPTURE_MANIFEST_SHA256,'execution receipt changed');
  const allRoutes=['01-ssc-rd02-s001','02-ssc-rd02-s002','03-ssc-rd02-s003','04-ssc-rd02-s004','05-ssc-rd02-s005'];
  const rows=parent.cohort_rows.map((sourceRow,index)=>{
    const row=sourceRow.row,name=sourceRow.legal_vehicle,withheld=row===18;
    const legal=withheld?field('identity_withheld_under_policy',{withheld_state_label:name,identity_publicly_disclosed:false},['SSC-RD02-S002','SSC-RD02-S003'],routeIds(['SSC-RD02-S002','SSC-RD02-S003']),'The eighteenth cohort identity remains withheld under the source policy; the row is retained rather than silently removed.'):field('observed',{legal_vehicle:name,identity_publicly_disclosed:true},['SSC-RD02-S002','SSC-RD02-S003'],routeIds(['SSC-RD02-S002','SSC-RD02-S003']),'Exact legal-vehicle label retained from the immutable first-cohort denominator.');
    const initial=field('observed',{state:sourceRow.initial_state_as_of_2025_01_17,as_of:'2025-01-17',exact_state_change_date:null},['SSC-RD02-S002','SSC-RD02-S003'],routeIds(['SSC-RD02-S002','SSC-RD02-S003']),'The official first-cohort checkpoint fixes the state as of January 17, 2025; it is not an exact underlying approval or license-effective date.');
    let later;
    if(withheld)later=field('identity_withheld_under_policy',null,['SSC-RD02-S002','SSC-RD02-S003','SSC-RD02-S005'],routeIds(['SSC-RD02-S002','SSC-RD02-S003','SSC-RD02-S005']),'The withheld identity cannot be exact-name matched to a later directory state; nonappearance is not a nonlicensure finding.');
    else if(sourceRow.later_license_state==='licensed_directory_observed')later=field('observed',{state:sourceRow.later_license_state,directory_vintage_year:sourceRow.directory_vintage_year,exact_license_effective_date:null},['SSC-RD02-S005'],routeIds(['SSC-RD02-S005']),'An exact-name later directory entry is observed. The directory vintage is retained without inventing an exact license-effective date.');
    else if(sourceRow.later_license_state==='licensed_in_first_cohort')later=field('observed',{state:sourceRow.later_license_state,as_of:'2025-01-17',exact_license_effective_date:null},['SSC-RD02-S002','SSC-RD02-S003'],routeIds(['SSC-RD02-S002','SSC-RD02-S003']),'The first-cohort checkpoint identifies the fund as licensed as of January 17, 2025; the exact license-effective date remains unavailable.');
    else later=unavailable(allRoutes,'No exact later license disposition was recovered after the fixed five-route protocol. Nonappearance is not proof of nonlicensure, withdrawal, rejection, or abandonment.');
    const fields={
      legal_vehicle_or_withheld_state_label:legal,
      initial_state_and_date:initial,
      later_license_state_and_date:later,
      leveraged_or_non_leveraged_license_state:unavailable(allRoutes,'The program record allows leveraged or non-leveraged licenses and states a maximum eligibility ceiling, but no fund-specific leveraged/non-leveraged election was recovered.',{program_maximum_sba_guaranteed_leverage_eligibility_usd:175000000,non_leveraged_license_possible:true,fund_specific_license_leverage_state:null},['SSC-RD02-S004']),
      public_leverage_commitment_amount_and_date:unavailable(allRoutes,'Program eligibility is not a fund-specific leverage commitment. No exact fund commitment amount or date was recovered.'),
      actual_sba_guaranteed_leverage_draw_amount_and_date:unavailable(allRoutes,'License, eligibility, and commitment are not an actual SBA-guaranteed leverage draw. No exact fund draw amount or date was recovered.'),
      fee_and_pricing_terms:unavailable(allRoutes,'No exact fund-level fee, debenture pricing, interest, discount, or other cost-of-capital schedule was recovered. Generic program terms are not substituted.'),
      covenants_and_remedies:unavailable(allRoutes,'No exact fund-level covenant, reporting, inspection, default, cure, acceleration, or remedy schedule was recovered.'),
      amendments_waivers_suspension_surrender_or_termination:unavailable(allRoutes,'No exact fund-level amendment, waiver, suspension, surrender, termination, transfer, or successor chronology was recovered. Silence is not event absence.'),
      source_identities_and_exact_custody:field('observed',{source_matrix_head:SOURCE_HEAD,field_matrix_path:MATRIX_PATH,field_matrix_sha256:MATRIX_SHA256,parent_path:PARENT_PATH,parent_sha256:PARENT_SHA256,seed_path:SEED_PATH,seed_input_manifest_sha256:'657fdf875e175150daaa8d213ea7fd1f4baa5eaa82f03aad4d070bd1e0331b7c',capture_root:CAPTURE_ROOT,capture_manifest_combined_sha256:CAPTURE_MANIFEST_SHA256,capture_artifact_sha256:CAPTURE_ARTIFACT_SHA256,fixed_route_ids:allRoutes},parent.sources.map((s)=>s.source_id),allRoutes,'Exact source-set, matrix, parent, artifact, route, and manifest custody is retained without expanding any source claim.')
    };
    same(Object.keys(fields),REQUIRED_FIELDS,`${row}: field order changed`);
    const counts={observed_fields:Object.values(fields).filter((v)=>v.state==='observed').length,identity_withheld_under_policy_fields:Object.values(fields).filter((v)=>v.state==='identity_withheld_under_policy').length,source_unavailable_after_fixed_protocol_fields:Object.values(fields).filter((v)=>v.state==='source_unavailable_after_fixed_protocol').length};
    return {row,legal_vehicle:withheld?null:name,identity_state:withheld?'identity_withheld_under_policy':'publicly_named',fields,row_result:{fixed_protocol_executed:true,terminal_fields:10,required_fields:10,row_closed:true,terminal_state:counts.source_unavailable_after_fixed_protocol_fields?TERMINAL_STATE:'evidence_complete'}};
  });
  const stateCounts={observed_fields:0,identity_withheld_under_policy_fields:0,source_unavailable_after_fixed_protocol_fields:0};
  for(const row of rows)for(const value of Object.values(row.fields))stateCounts[`${value.state}_fields`]++;
  same(stateCounts,{observed_fields:67,identity_withheld_under_policy_fields:2,source_unavailable_after_fixed_protocol_fields:111},'field-state counts changed');
  const counts={cohort_rows:18,publicly_named_rows:17,withheld_rows:1,required_fields_per_row:10,required_fields:180,...stateCounts,terminal_fields:180,initial_green_light_or_withheld_rows:11,initial_licensed_rows:7,later_exact_name_directory_license_transitions:7,license_state_rows_observed:14,fixed_source_routes:5,request_attempts:5,transport_successes:4,bounded_http_non_successes:1,bounded_transport_failures:0,fund_specific_leverage_commitments_observed:0,actual_leverage_draws_observed:0,fund_specific_fee_schedules_observed:0,fund_specific_covenant_schedules_observed:0,fund_specific_amendment_events_observed:0,external_contacts:0,external_reviews:0};
  const boundaries={green_light_is_license:false,license_is_leverage_commitment:false,program_eligibility_is_fund_commitment:false,commitment_is_draw:false,draw_is_portfolio_investment:false,directory_nonappearance_is_nonlicensure:false,source_unavailability_is_event_absence:false,source_unavailability_is_noncompliance:false,withheld_identity_is_nonparticipation:false,class_closure_is_complete_compact:false,capital_conversion_finding:false,favoritism_finding:false,extraction_finding:false,coordination_finding:false,common_purpose_finding:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none'};
  const current_result={terminal_state:TERMINAL_STATE,fixed_protocol_complete:true,class_closed:true,complete_fund_level_chronology_observed:false,all_eighteen_rows_preserved:true,seven_later_license_transitions_preserved:true,fund_specific_leverage_commitment_observed:false,actual_leverage_draw_observed:false,fund_specific_fee_covenant_or_amendment_stack_observed:false,capital_conversion_finding:false,favoritism_finding:false,extraction_finding:false,coordination_finding:false,common_purpose_finding:false,reviewed_disposition_changed:false,outside_human_dependency:false,project_blocking:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none'};
  return {schema_version:'ssc-rd-wave02-rd02-license-leverage-terminal-matrix@1',wave_id:'SSC-RD-W02',lane_id:'RD-02',class_id:'RD-02-C04',issue:787,class_label:CLASS_LABEL,status:'eighteen_row_license_and_leverage_chronology_terminal_bounded_source_unavailable',as_of:'2026-08-03',source_product:{source_matrix_head:SOURCE_HEAD,field_matrix_path:MATRIX_PATH,field_matrix_sha256:MATRIX_SHA256,parent_path:PARENT_PATH,parent_sha256:PARENT_SHA256,capture_root:CAPTURE_ROOT,capture_artifact_sha256:CAPTURE_ARTIFACT_SHA256,capture_manifest_combined_sha256:CAPTURE_MANIFEST_SHA256,seed_closure_target:SEED_LABEL,constitutional_class_label:CLASS_LABEL,seed_label_exact_match:false,seed_label_reconciliation:LABEL_RECONCILIATION},required_fields:REQUIRED_FIELDS,rows,counts,current_result,boundaries};
}

export function deriveProduct(root=ROOT){
  const terminal=terminalFrom(root),authority={outside_human_dependency:false,external_contacts:0,external_reviews:0,reviewed_disposition_changed:false,complete_compact_finding:false,capital_conversion_finding:false,favoritism_finding:false,extraction_finding:false,coordination_finding:false,common_purpose_finding:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none'};
  const receipt={schema_version:'ssc-rd-wave02-rd02-license-leverage-class-receipt@1',wave_id:'SSC-RD-W02',lane_id:'RD-02',class_id:'RD-02-C04',issue:787,class_label:CLASS_LABEL,terminal_state:TERMINAL_STATE,class_closed:true,label_custody:{constitutional_class_label:CLASS_LABEL,seed_closure_target:SEED_LABEL,labels_exact_match:false,reconciliation:LABEL_RECONCILIATION},counts:terminal.counts,residual_atlas_effect_if_promoted_after_rd04_rd05_rd01_rd06_and_rd03:{canonical_classes:42,open_before:37,closed_before:5,open_after:36,closed_after:6},current_result:terminal.current_result,boundaries:terminal.boundaries,authority};
  const summary={schema_version:'ssc-rd-wave02-rd02-license-leverage-summary@1',wave_id:'SSC-RD-W02',lane_id:'RD-02',class_id:'RD-02-C04',issue:787,class_label:CLASS_LABEL,terminal_state:TERMINAL_STATE,counts:terminal.counts,current_result:terminal.current_result,boundaries:terminal.boundaries,authority};
  const entries=[['class-receipt.json',receipt],['summary.json',summary],['terminal-field-matrix.json',terminal]].map(([p,v])=>{const b=encode(v);return{path:p,bytes:b.length,sha256:sha256(b)}});
  const combined_sha256=sha256(Buffer.from(entries.map((e)=>`${e.path}\0${e.bytes}\0${e.sha256}\n`).join(''),'utf8'));
  const manifest={schema_version:'ssc-rd-wave02-rd02-license-leverage-manifest@1',entries,combined_sha256};
  const closure={schema_version:'ssc-residual-denominator-wave02-class-closure-reference@1',wave_issue:785,child_issue:787,source_pr:802,class_id:'RD-02-C04',lane_id:'RD-02',exact_label:CLASS_LABEL,terminal_state:TERMINAL_STATE,class_closed:true,label_custody:receipt.label_custody,residual_atlas_effect_if_promoted_after_rd04_rd05_rd01_rd06_and_rd03:receipt.residual_atlas_effect_if_promoted_after_rd04_rd05_rd01_rd06_and_rd03,product:{class_receipt_path:`${PRODUCT_ROOT}/class-receipt.json`,terminal_field_matrix_path:`${PRODUCT_ROOT}/terminal-field-matrix.json`,summary_path:`${PRODUCT_ROOT}/summary.json`,manifest_path:`${PRODUCT_ROOT}/manifest.json`,manifest_combined_sha256:combined_sha256},execution:{workflow_run:30863653791,job_id:91850755921,artifact_id:8875282216,artifact_zip_sha256:CAPTURE_ARTIFACT_SHA256,manifest_entry_count:29,capture_manifest_combined_sha256:CAPTURE_MANIFEST_SHA256,execution_receipt_path:EXECUTION_RECEIPT_PATH},authority};
  return{terminal,receipt,summary,manifest,closure};
}
function write(root,rel,value){fs.mkdirSync(path.dirname(abs(root,rel)),{recursive:true});fs.writeFileSync(abs(root,rel),encode(value));}
export function writeProduct(root=ROOT){const p=deriveProduct(root);write(root,`${PRODUCT_ROOT}/terminal-field-matrix.json`,p.terminal);write(root,`${PRODUCT_ROOT}/class-receipt.json`,p.receipt);write(root,`${PRODUCT_ROOT}/summary.json`,p.summary);write(root,`${PRODUCT_ROOT}/manifest.json`,p.manifest);write(root,CLOSURE_PATH,p.closure);return p;}
export function checkProduct(root=ROOT){const p=deriveProduct(root);same(read(root,`${PRODUCT_ROOT}/terminal-field-matrix.json`),p.terminal,'terminal product drift');same(read(root,`${PRODUCT_ROOT}/class-receipt.json`),p.receipt,'class receipt drift');same(read(root,`${PRODUCT_ROOT}/summary.json`),p.summary,'summary drift');same(read(root,`${PRODUCT_ROOT}/manifest.json`),p.manifest,'manifest drift');same(read(root,CLOSURE_PATH),p.closure,'closure drift');return p;}
const mode=process.argv[2]||'--write';if(mode==='--write'){writeProduct(ROOT);console.log('wrote RD-02 terminal product');}else if(mode==='--check'){const p=checkProduct(ROOT);console.log(`RD-02 terminal product: ${p.terminal.counts.terminal_fields}/180 terminal; ${p.terminal.counts.source_unavailable_after_fixed_protocol_fields} source unavailable`);}else throw new Error(`unknown mode ${mode}`);
