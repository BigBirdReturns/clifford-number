#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const plan=read('data/project/m05-answerable-power-sprint-03-leg-07-source-ecology-v2.json');
const policy=read('data/project/m04g-source-ecology-v2-policy.json');
const report=read('reports/core-thesis/answerable-power/sprint-03-leg-07.json');

if(plan.schema_version!=='m05-answerable-power-sprint-03-leg-07@1')fail('plan schema drift');
if(policy.schema_version!=='m04g-source-ecology-v2-policy@1')fail('policy schema drift');
if(plan.leg_id!=='S03-L7'||plan.hydrology_program_id!=='M-04G')fail('leg or program drift');
if(plan.status!=='engineering_repair_and_regression_contract_frozen')fail('status drift');
if(policy.denominator.expected_routes!==96||policy.denominator.expected_basins!==12||policy.denominator.expected_routes_per_basin!==8)fail('denominator drift');
if(policy.denominator.allow_route_deletion!==false||policy.denominator.allow_direct_voice_bulk_polling!==false)fail('denominator or voice boundary weakened');
if(policy.health_contract.global_route_success_rate!==0.75||policy.health_contract.global_content_success_rate!==0.65||policy.health_contract.required_healthy_basins!==12)fail('health contract drift');
if(policy.global_tides.length<1||policy.global_tides[0].mode!=='globally_serialized')fail('global tide serialization missing');
if(policy.host_fallbacks.length<10)fail('fallback policy too thin');
if(!policy.failure_taxonomy.includes('unclassified'))fail('failure taxonomy incomplete');
if(plan.baseline.selected_routes!==96||plan.baseline.route_successes!==63||plan.baseline.content_successes!==60||plan.baseline.healthy_basins!==9)fail('baseline drift');
if(plan.repair_legs.length!==5)fail('repair-leg count drift');
if(plan.cross_domain_regression.length!==5)fail('domain regression count drift');
if(plan.regression_result_contract.minimum_domains!==3||plan.regression_result_contract.minimum_jurisdictions!==2)fail('works-standard floor drift');
if(plan.current_result.live_v2_orbit_observed!==false||plan.current_result.coverage_healthy!==false||plan.current_result.cross_domain_regression_completed!==false||plan.current_result.composed_answer_observed!==false||plan.current_result.works_standard_met!==false||plan.current_result.project_complete!==false)fail('open-state drift');
for(const [key,value] of Object.entries(policy.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`policy boundary ${key} must remain false`);
}
for(const [key,value] of Object.entries(plan.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`plan boundary ${key} must remain false`);
}
if(report.counts.routes!==96||report.counts.basins!==12)fail('discovered denominator drift');
if(report.counts.routes_per_basin.length!==1||report.counts.routes_per_basin[0]!==8)fail('routes-per-basin drift');
if(report.route_ids.length!==96||new Set(report.route_ids).size!==96)fail('route identity drift');
if(report.basin_denominator.some((row)=>row.route_ids.length!==8))fail('basin route count drift');
if(report.counts.regression_domains!==5||report.counts.repair_legs!==5)fail('report plan count drift');
if(report.fingerprint.length!==64||report.policy_fingerprint.length!==64)fail('invalid fingerprints');
console.log('validate-m05-answerable-power-sprint-03-leg-07: OK');
