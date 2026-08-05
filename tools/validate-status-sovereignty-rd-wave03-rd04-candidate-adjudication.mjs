#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  ROOT, DATA_DIR, SOURCE_RECEIPT_PATH, REPLAY_PROTOCOL_PATH, INDEX_PATH, PRODUCT_MANIFEST_PATH,
  SHARD_PATHS, RESPONSIVE_TERMS, deriveIndex, deriveProductManifest, validateCandidateRow, validateReplayRoute
} from './build-status-sovereignty-rd-wave03-rd04-candidate-adjudication.mjs';

export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave03-rd04-candidate-adjudication.schema.json';
const abs=(root,rel)=>path.join(root,rel);
const read=(root,rel)=>JSON.parse(fs.readFileSync(abs(root,rel),'utf8'));
const ok=(v,m)=>{if(!v) throw new Error(m)};
const same=(a,b,m)=>ok(JSON.stringify(a)===JSON.stringify(b),m);

export function validateSchemaContract(schema) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema','schema dialect changed');
  ok(schema?.$id === 'https://clifford-number.local/schemas/status-sovereignty-rd-wave03-rd04-candidate-adjudication.schema.json','schema ID changed');
  ok(schema?.type === 'object' && schema?.additionalProperties === false,'schema closure changed');
  ok(schema?.properties?.schema_version?.const === 'ssc-rd04-wave03-candidate-adjudication-index@1','schema version changed');
  ok(schema?.properties?.counts?.properties?.candidate_rows?.const === 1500,'schema candidate denominator changed');
  ok(schema?.properties?.counts?.properties?.responsive_term_candidates?.const === 0,'schema responsive count changed');
  ok(schema?.properties?.current_result?.properties?.official_redirect_replay_routes?.const === 54,'schema replay denominator changed');
  ok(schema?.properties?.current_result?.properties?.class_closed?.const === false,'schema class closure changed');
  return true;
}

export function validateValue(root=ROOT) {
  const source=read(root,SOURCE_RECEIPT_PATH);
  ok(source.schema_version==='ssc-rd04-wave03-source-census-execution-receipt@1','source receipt schema changed');
  ok(source.artifact_id===8918943097 && source.workflow_run===30977759590,'source execution custody changed');
  ok(source.artifact_zip_sha256==='1852f324ec72c6f84642a5185579318cf7428ca28ee55f83caac1979b8b5ff63','artifact hash changed');
  ok(source.candidate_index_sha256==='93ddb1e52e741c1e177565dd90b026dc06e7357459204dfd8ba10af6d5e875ff','candidate-index hash changed');
  ok(source.route_results_sha256==='bf0b0588348ef5ffef4fc943de7a5a43af8dc681566b4099fddd9409f9f12f21','route-results hash changed');
  same(source.counts,{state_rows:50,required_cells:450,fixed_routes:204,terminal_routes:204,disallowed_final_host_routes:54,rss_candidate_routes:150,candidate_rows:1500,unique_candidate_urls:500,admitted_sources:0,field_classifications:0,result_spawned_requests:0},'source counts changed');
  ok(source.authority.outside_human_dependency===false && source.authority.class_closed===false,'source authority changed');

  const replay=read(root,REPLAY_PROTOCOL_PATH);
  ok(replay.schema_version==='ssc-rd04-wave03-official-redirect-replay-protocol@1','replay schema changed');
  same(replay.denominator,{source_routes:54,replay_routes:54,final_host:'www.fna.usda.gov',original_http_successes:54,original_protocol_admissions:0},'replay denominator changed');
  ok(replay.execution_contract.maximum_attempts_per_route===1 && replay.execution_contract.maximum_parallel_workers===6,'replay execution ceiling changed');
  ok(replay.execution_contract.result_spawned_requests===0,'replay spawned requests changed');
  replay.routes.forEach((route,index)=>validateReplayRoute(route,index+1));

  const index=read(root,INDEX_PATH);
  const derived=deriveIndex(root);
  same(index,derived,'candidate adjudication differs from deterministic derivation');
  same(index.classification_contract.responsive_terms,[...RESPONSIVE_TERMS],'responsive terms changed');
  ok(index.counts.candidate_rows===1500 && index.counts.terminal_candidate_rows===1500,'candidate terminalization changed');
  ok(index.counts.responsive_term_candidates===0 && index.counts.selected_followups===0,'candidate followup authority changed');
  ok(index.counts.official_domain_nonresponsive_without_snap_scope===164,'official-domain disposition changed');
  ok(index.counts.nonofficial_nonresponsive_without_snap_scope===1336,'nonofficial disposition changed');
  ok(index.current_result.class_state==='still_open' && index.current_result.class_closed===false,'class state changed');
  ok(index.current_result.outside_human_dependency===false,'outside-human dependency changed');

  const manifest=read(root,PRODUCT_MANIFEST_PATH);
  same(manifest,deriveProductManifest(root,derived),'product manifest differs from deterministic derivation');
  const schema=read(root,SCHEMA_PATH); validateSchemaContract(schema);
  return true;
}

export function validateRepository(root=ROOT) {
  validateValue(root);
  const requiredMerges=['b9d09c28bcaa0b00c699ff40e893df7b9675ff0f','7f960c30b6c58c70e3a996d4239e363e50d848ef'];
  for(const merge of requiredMerges) execFileSync('git',['merge-base','--is-ancestor',merge,'HEAD'],{cwd:root,stdio:'ignore'});
  return true;
}

function run(){validateRepository(ROOT);console.log('RD-04 candidate adjudication validated: 1500 terminal candidates, 0 selected candidate followups, 54 exact official redirect replays, class still open');}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url) run();
