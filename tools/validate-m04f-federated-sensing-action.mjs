#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const errors=[]; const check=(v,m)=>{if(!v) errors.push(m)};
const census=read('data/project/m04f-federated-sensing-action-census.json');
const deep=read('data/project/m04f-federated-sensing-action-deep-systems.json');
const perimeter=read('data/project/m04f-federated-sensing-action-perimeter.json');
const fanout=read('data/project/m04f-federated-sensing-action-fanout.json');
const sources=read('data/intake/m04f-federated-sensing-action-sources.json');
check(census.schema==='m04f-federated-sensing-action-census@1','census schema');
check(deep.schema==='m04f-federated-sensing-action-deep-systems@1','deep schema'); check(perimeter.schema==='m04f-federated-sensing-action-perimeter@1','perimeter schema'); check(fanout.schema==='m04f-federated-sensing-action-fanout@1','fanout schema');
check(sources.schema==='m04f-federated-sensing-action-sources@1','sources schema');
const unique=(rows,key,label)=>check(new Set(rows.map(x=>x[key])).size===rows.length,`duplicate ${label}`);
unique(deep.systems,'system_id','deep system'); unique(perimeter.candidates,'candidate_id','perimeter candidate'); unique(sources.sources,'source_id','source'); unique(fanout.lanes,'lane_id','lane');
check(census.counts.deep_systems===17,'deep-system count'); check(census.counts.perimeter_candidates===30,'perimeter count'); check(census.counts.total_candidates===47,'candidate total'); check(census.counts.source_locators===36,'source count'); check(census.counts.acquisition_lanes===27,'lane count'); check(census.counts.existing_lake_crosswalk===13,'crosswalk count');
const sourceIds=new Set(sources.sources.map(x=>x.source_id));
for(const source of sources.sources){check(/^https:\/\//.test(source.url||''),`${source.source_id} URL`); check(source.publisher&&source.title&&source.source_type,`${source.source_id} metadata`)}
for(const row of deep.systems){check(row.source_ids.length>0,`${row.system_id} sources`); for(const id of row.source_ids) check(sourceIds.has(id),`${row.system_id} source ${id}`); check(row.record_count>=4,`${row.system_id} record depth`); check(row.lane_id,`${row.system_id} lane`); check(row.forbidden_inference,`${row.system_id} forbidden inference`)}
for(const row of perimeter.candidates){check(row.source_routes.length>0,`${row.candidate_id} route`); check(row.next_decisive_acquisition&&row.forbidden_inference,`${row.candidate_id} contract`)}
for(const row of census.existing_lake_crosswalk){check(row.lake_system_id&&row.relationship&&row.non_equivalence,`crosswalk ${row.lake_system_id}`)}
const profiles=new Map(fanout.profiles.map(x=>[x.profile_id,x]));
for(const lane of fanout.lanes){const contract=lane.profile_id?profiles.get(lane.profile_id):lane; check(contract&&contract.question&&contract.required_objects?.length&&contract.falsifier&&contract.stopping_rule,`${lane.lane_id} contract`); check(lane.terminal_states?.includes('bounded_non_link')&&lane.terminal_states?.includes('requires_additional_acquisition'),`${lane.lane_id} terminal states`)}
for(const boundary of [census.boundaries,deep.boundaries,perimeter.boundaries,fanout.boundaries]) check(boundary.promotes_to==='candidate_only'&&boundary.graph_effect==='none'&&boundary.conclusion_generated===false&&boundary.estate_completion_claimed===false,'boundary exceeded');
for(const key of ['similar_shape_proves_integration','federation_proves_centralized_database','alert_proves_identification_or_action','human_review_proves_meaningful_veto','customer_ownership_proves_complete_custody','recurrence_proves_common_governance','product_claim_proves_deployment']) check(census.boundaries[key]===false,`missing non-inference ${key}`);
if(errors.length){console.error('validate-federated-sensing-action failed:'); for(const e of errors) console.error(`- ${e}`); process.exit(1)}
console.log(`validate-federated-sensing-action: OK (${census.counts.total_candidates} candidates, ${census.counts.deep_systems} deep systems, ${census.counts.source_locators} sources, ${fanout.lanes.length} lanes)`);
