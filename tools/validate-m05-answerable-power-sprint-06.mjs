#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const sha=(buffer)=>crypto.createHash('sha256').update(buffer).digest('hex');
const plan=read('data/project/m05-answerable-power-sprint-06-plan.json');
const protocol=read('data/project/m05-answerable-power-sprint-06-protocol.json');
const schema=read('data/project/m05-answerable-power-sprint-06-receipt-schema.json');
const registry=read('data/project/m05-answerable-power-sprint-06-registry.json');
const release=read('data/project/m05-answerable-power-sprint-06-release-manifest.json');
const report=read('reports/core-thesis/answerable-power/sprint-06.json');
if(plan.schema_version!=='m05-answerable-power-sprint-06-plan@1')fail('plan schema drift');
if(plan.status!=='protocol_complete_no_external_reproduction_receipt')fail('plan status drift');
if(plan.basis.audited_sprint_05_commit!=='ce8f4194019cf75cc2b66436efbeebdfd43f9951'||plan.basis.sprint_05_combined_sha256!=='9084e2fe8e4a951fd667c71b9be58475a1b8fc463ab25c885fd98891d39747ad')fail('reference capsule drift');
if(plan.intake_stages.length!==5||plan.leg_registry.length!==7)fail('denominator drift');
if(plan.current_result.external_receipts_received!==0||plan.current_result.a1_observed!==false||plan.current_result.maximum_verified_adoption_level!=='A0')fail('A1 self-promotion');
if(protocol.required_command_sequence.length!==8)fail('command denominator drift');
if(protocol.reference_capsule.mutable_ref_allowed!==false)fail('mutable ref admitted');
if(protocol.adjudication_contract.cli_can_mutate_registry!==false||protocol.adjudication_contract.project_maintainer_may_unilaterally_award_a1!==false)fail('self-certification boundary drift');
if(schema.properties.reference.properties.commit_sha.const!=='ce8f4194019cf75cc2b66436efbeebdfd43f9951'||schema.properties.reference.properties.combined_sha256.const!=='9084e2fe8e4a951fd667c71b9be58475a1b8fc463ab25c885fd98891d39747ad')fail('schema reference drift');
if(registry.entries.length!==0||registry.counts.approved_for_a1!==0||registry.reconciliation.current_verified_adoption_level!=='A0')fail('registry self-promotion');
for(const row of release.entries){const bytes=fs.readFileSync(path.join(root,row.path));if(row.bytes!==bytes.length||row.sha256!==sha(bytes))fail(`release drift: ${row.path}`);}
const combined=sha(Buffer.from(release.entries.map((row)=>`${row.path}\0${row.sha256}\0${row.bytes}\n`).join(''),'utf8'));
if(combined!==release.combined_sha256)fail('combined release hash drift');
if(report.release_manifest.combined_sha256!==combined||report.counts.registry_entries!==0||report.current_result.a1_observed!==false)fail('report drift');
for(const [key,value] of Object.entries(plan.boundaries)){if(['promotes_to','graph_effect'].includes(key))continue;if(typeof value==='boolean'&&value!==false)fail(`boundary ${key} must remain false`);}
const issue=fs.readFileSync(path.join(root,'.github/ISSUE_TEMPLATE/apc-independent-reproduction.yml'),'utf8');
if(!issue.includes('ce8f4194019cf75cc2b66436efbeebdfd43f9951')||!issue.includes('9084e2fe8e4a951fd667c71b9be58475a1b8fc463ab25c885fd98891d39747ad')||!issue.includes('does not award A1'))fail('intake template drift');
console.log('validate-m05-answerable-power-sprint-06: OK');
