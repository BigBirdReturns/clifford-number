#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const reconciliation=read('data/project/m05-answerable-power-sprint-02-reconciliation.json');
const observation=read('data/project/m05-answerable-power-sprint-02-source-health-observation.json');
const report=read('reports/core-thesis/answerable-power/sprint-02-reconciliation.json');

if(reconciliation.schema_version!=='m05-answerable-power-sprint-02-reconciliation@2')fail('reconciliation schema drift');
if(reconciliation.state!=='sprint_02_reconciled_with_observed_source_health_shortfall')fail('reconciliation state drift');
if(reconciliation.legs.length!==7)fail(`expected seven legs, got ${reconciliation.legs.length}`);
if(new Set(reconciliation.legs.map((row)=>row.leg_id)).size!==7)fail('duplicate leg ids');
if(reconciliation.answer_library.map((row)=>row.level).join(',')!=='R1,R2,R3,R4,R5,R6,R7')fail('answer ladder drift');
if(!reconciliation.answer_library.every((row)=>row.observed===true))fail('every R1-R7 level must be observed somewhere');
if(reconciliation.cross_domain_assessment.one_combined_durable_answer_observed!==false)fail('combined answer must remain open');
if(reconciliation.cross_domain_assessment.works_standard_met!==false)fail('works standard must remain unmet');
if(reconciliation.cross_domain_assessment.current_disposition!=='retained_candidate_only')fail('cross-domain disposition drift');
const sourceLeg=reconciliation.legs.find((row)=>row.leg_id==='S02-L7');
if(!sourceLeg||sourceLeg.state!=='merged_observed_targets_missed')fail('source-health leg state drift');
if(sourceLeg.baseline.selected!==96||sourceLeg.baseline.content_succeeded!==53||sourceLeg.baseline.failed!==43)fail('source-health baseline drift');
if(observation.merge_sha!=='0f517f497eed8c8a9d7f1f83c5c0688a509ea41f')fail('observation merge SHA drift');
if(observation.run_id!==30218491874)fail('observation run id drift');
if(observation.proof_sha256!=='e7fdf2a37b6e920055295f272c276682953dd8570b7c002862979a85bb10f628')fail('proof digest drift');
if(observation.selected!==96||observation.route_succeeded!==63||observation.content_succeeded!==60||observation.metadata_only!==3||observation.failed!==33)fail('post-repair denominator drift');
if(observation.route_succeeded+observation.failed!==96)fail('route denominator mismatch');
if(observation.content_succeeded+observation.metadata_only+observation.failed!==96)fail('content denominator mismatch');
if(observation.healthy_basins!==9||observation.unhealthy_basins.join(',')!=='G07-MENA,G09-SOUTH-ASIA,G12-OCEANIA-PACIFIC')fail('basin health denominator drift');
if(observation.unclassified_failures!==0)fail('unclassified failures remain');
if(observation.state_separation.execution_complete!==true||observation.state_separation.coverage_healthy!==false||observation.state_separation.evidence_sufficient!==false)fail('state separation drift');
if(observation.acceptance_result.route_target_met!==false||observation.acceptance_result.content_target_met!==false||observation.acceptance_result.all_basins_healthy!==false)fail('missed targets must remain visible');
for(const [key,value] of Object.entries(reconciliation.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`boundary ${key} must remain false`);
}
for(const [key,value] of Object.entries(observation.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`observation boundary ${key} must remain false`);
}
if(report.counts.legs!==7||report.counts.answer_levels_observed!==7||report.counts.healthy_basins!==9)fail('report count drift');
if(report.terminal_state!=='sprint_02_reconciled_with_open_source_health_deficit')fail('terminal state drift');
console.log('validate-m05-answerable-power-sprint-02-reconciliation: OK');
