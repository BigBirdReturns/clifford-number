#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const h='a'.repeat(64);
const commands=[
  'git rev-parse HEAD','npm ci','npm run release:check','node tools/build-m05-answerable-power-sprint-05.mjs',
  'node tools/validate-m05-answerable-power-sprint-05.mjs','node test/m05-answerable-power-sprint-05.test.js',
  'node test/m05-adoption-conformance.test.js','git diff --exit-code'
].map((command,i)=>({order:i+1,command,exit_code:0,started_at:`2026-07-26T0${i}:00:00Z`,completed_at:`2026-07-26T0${i}:01:00Z`,stdout_sha256:h,stderr_sha256:h}));
const valid=()=>({
  schema_version:'apc-independent-reproduction-receipt@1',receipt_id:'A1R-EXAMPLE-001',issued_at:'2026-07-27T10:00:00Z',expires_at:'2027-07-27T10:00:00Z',
  reference:{repository_full_name:'BigBirdReturns/clifford-number',commit_sha:'ce8f4194019cf75cc2b66436efbeebdfd43f9951',release_manifest_path:'data/project/m05-answerable-power-sprint-05-release-manifest.json',combined_sha256:'9084e2fe8e4a951fd667c71b9be58475a1b8fc463ab25c885fd98891d39747ad',public_bundle_uri:'https://example.org/bundle'},
  reproducer:{name:'Independent Lab',identity_type:'organization',identity_evidence_uri:'https://example.org/identity',contact_uri:'https://example.org/contact',relationship_to_project:'none',relationship_to_vendor:'none',relationship_to_operator:'none',relationship_to_adopter:'none',funding_disclosure:'self-funded',conflicts_disclosed:true,conflict_disclosures:[],repo_admin_or_maintainer:false,reference_contributor:false,vendor_or_operator:false,customer_or_adopter:false,same_legal_entity:false,bot_or_automated_agent:false},
  environment:{os:'Linux',architecture:'x86_64',node_version:'24.0.0',npm_version:'11.0.0',git_version:'2.50.0',dependency_lock_sha256:h,workspace_origin:'independently_provisioned',network_sources:['https://github.com','https://registry.npmjs.org']},
  procedure:{protocol_version:'M05-S06-PROTOCOL-1',started_at:'2026-07-26T00:00:00Z',completed_at:'2026-07-26T09:00:00Z',clean_room:true,fresh_checkout:true,prior_build_artifacts_reused:false,project_supplied_workspace:false,executed_by_project_ci:false,commands,deviations:[]},
  results:{checkout_commit_sha:'ce8f4194019cf75cc2b66436efbeebdfd43f9951',release_combined_sha256:'9084e2fe8e4a951fd667c71b9be58475a1b8fc463ab25c885fd98891d39747ad',full_release_gate_exit_code:0,focused_checks_exit_code:0,deterministic_rebuild_clean:true,output_fingerprints:[{path:'reports/core-thesis/answerable-power/sprint-05.json',sha256:h,bytes:100},{path:'data/project/m05-answerable-power-sprint-05-release-manifest.json',sha256:h,bytes:100}]},
  custody:{evidence_uri:'https://example.org/evidence',evidence_sha256:h,public_access:true,immutable_or_versioned:true,retained_until:'2027-09-01T00:00:00Z',raw_logs_included:true,complete_failure_denominator:true},
  signature:{signatory_name:'Independent Lab',signature_type:'organizational_attestation',signed_at:'2026-07-27T09:00:00Z',signed_statement_uri:'https://example.org/signature',signed_statement_sha256:h},
  declaration:{factual_accuracy:true,no_self_attestation:true,no_undisclosed_conflict:true,no_project_control:true,no_private_artifact_dependency:true}
});
const run=(receipt)=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'m05-s06-'));const file=path.join(dir,'receipt.json');fs.writeFileSync(file,JSON.stringify(receipt));const result=spawnSync(process.execPath,['tools/m05-independent-reproduction.mjs',file,'--as-of','2026-07-27'],{cwd:root,encoding:'utf8'});let output={};try{output=JSON.parse(result.stdout)}catch{}return {...result,output}};
const ok=run(valid());assert.equal(ok.status,0);assert.equal(ok.output.structurally_eligible_for_a1,true);assert.equal(ok.output.a1_observed,false);assert.equal(ok.output.independence_determined,false);assert.equal(ok.output.registry_mutated,false);
const cases=[
  ['maintainer',(r)=>r.reproducer.repo_admin_or_maintainer=true],
  ['reference contributor',(r)=>r.reproducer.reference_contributor=true],
  ['project CI',(r)=>r.procedure.executed_by_project_ci=true],
  ['wrong commit',(r)=>r.reference.commit_sha='b'.repeat(40)],
  ['wrong bundle',(r)=>r.reference.combined_sha256='b'.repeat(64)],
  ['expired',(r)=>r.expires_at='2026-07-26T00:00:00Z'],
  ['future issued',(r)=>r.issued_at='2026-07-28T00:00:00Z'],
  ['missing command',(r)=>r.procedure.commands.pop()],
  ['failed command',(r)=>r.procedure.commands[2].exit_code=1],
  ['dirty rebuild',(r)=>r.results.deterministic_rebuild_clean=false],
  ['deviation',(r)=>r.procedure.deviations.push('used supplied cache')],
  ['private evidence',(r)=>r.custody.public_access=false],
  ['short retention',(r)=>r.custody.retained_until='2027-07-27T10:00:00Z'],
  ['conflicts undisclosed',(r)=>r.reproducer.conflicts_disclosed=false],
  ['signatory mismatch',(r)=>r.signature.signatory_name='Other'],
  ['adopter',(r)=>r.reproducer.customer_or_adopter=true]
];
for(const [name,mutate] of cases){const r=valid();mutate(r);const result=run(r);assert.equal(result.status,2,name);assert.equal(result.output.structurally_eligible_for_a1,false,name);assert.equal(result.output.a1_observed,false,name);}
console.log(`m05-independent-reproduction.test: OK (${cases.length} negative controls)`);
