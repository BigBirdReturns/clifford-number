#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const stress=read('data/project/m05-answerable-power-sprint-03-leg-06-value-recovery-transfer.json');
const sources=read('data/intake/m05-answerable-power-sprint-03-leg-06-value-recovery-sources.json');
const report=read('reports/core-thesis/answerable-power/sprint-03-leg-06.json');

if(stress.schema_version!=='m05-answerable-power-sprint-03-leg-06-value-recovery-transfer@1')fail('schema drift');
if(stress.leg_id!=='S03-L6'||stress.constitution_under_test!=='APC-01'||stress.domain_adapter_id!=='APC-VALUE-01')fail('identity drift');
if(stress.status!=='bounded_transfer_test_frozen')fail('status drift');
if(sources.sources.length!==14)fail(`expected 14 sources, got ${sources.sources.length}`);
if(stress.systems.length!==7)fail(`expected seven systems, got ${stress.systems.length}`);
if(stress.r_level_tests.map((row)=>row.level).join(',')!=='R1,R2,R3,R4,R5,R6,R7')fail('R-level sequence drift');
if(stress.value_recovery_dimensions.length!==10)fail('value-dimension count drift');
if(stress.fault_lines.length!==12)fail('fault-line count drift');
if(stress.cross_system_controls.length!==8)fail('control count drift');
if(stress.propositions.length!==15)fail('proposition count drift');
const tarp=stress.propositions.find((row)=>row.proposition_id==='M05-S03-L6-P01');
if(!tarp||tarp.disposition!=='supported_for_human_review')fail('TARP positive control drift');
for(const id of ['M05-S03-L6-P05','M05-S03-L6-P10','M05-S03-L6-P12','M05-S03-L6-P13','M05-S03-L6-P14']){
  const row=stress.propositions.find((item)=>item.proposition_id===id);
  if(!row||row.disposition!=='bounded_non_link')fail(`${id} must remain bounded non-link`);
}
const transfer=stress.propositions.find((row)=>row.proposition_id==='M05-S03-L6-P15');
if(!transfer||transfer.disposition!=='retained_candidate_only')fail('cross-sector transfer must remain candidate-only');
if(stress.current_result.cross_sector_residual_right_architectures_observed!==true)fail('rights-architecture result drift');
if(stress.current_result.cross_sector_realized_public_return_observed!==false)fail('cross-sector realization must remain open');
if(stress.current_result.affected_party_distribution_observed!==false)fail('affected-party distribution must remain open');
if(stress.current_result.one_complete_cross_sector_transfer_observed!==false)fail('complete transfer must remain open');
if(stress.current_result.works_standard_met!==false)fail('works standard must remain unmet');
for(const [key,value] of Object.entries(stress.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`boundary ${key} must remain false`);
}
if(report.counts.sources!==14||report.counts.systems!==7||report.counts.r_levels!==7||report.counts.value_dimensions!==10||report.counts.fault_lines!==12||report.counts.cross_system_controls!==8||report.counts.propositions!==15)fail('report count drift');
if(report.fingerprint.length!==64)fail('invalid fingerprint');
console.log('validate-m05-answerable-power-sprint-03-leg-06: OK');
