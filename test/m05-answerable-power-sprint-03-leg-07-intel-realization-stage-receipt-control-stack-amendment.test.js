#!/usr/bin/env node
import assert from'node:assert/strict';
import crypto from'node:crypto';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{spawnSync}from'node:child_process';
import{fileURLToPath}from'node:url';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const V=path.join(R,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.mjs');
const P=path.join(R,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.json');
const L=path.join(R,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-live-registry-contract.json');
const G=path.join(R,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-registry.json');
const PC=JSON.parse(fs.readFileSync(path.join(R,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody-contract.json')));
const CC=JSON.parse(fs.readFileSync(path.join(R,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.json')));
const OC=JSON.parse(fs.readFileSync(path.join(R,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.json')));
const policy=JSON.parse(fs.readFileSync(P)),live=JSON.parse(fs.readFileSync(L)),baseRegistry=JSON.parse(fs.readFileSync(G));
const cp=o=>JSON.parse(JSON.stringify(o)),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),blob=b=>crypto.createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex'),sem=o=>sha(Buffer.from(JSON.stringify(o)));
assert.equal(blob(fs.readFileSync(P)),'c874948a3d3c0f17c4cb350b26bc12e17f29213e');assert.equal(blob(fs.readFileSync(L)),'f805af9dfb997114ba4bc8d357c5838ae90ce961');assert.equal(blob(fs.readFileSync(V)),'7ab39e10a6e842c0ced292c2a73475e10c0fa1c2');
for(const[o,f,e]of[[policy,'stage_receipt_control_stack_amendment_sha256','dfaa4d53cc18ebda3f2afb150e7c3f41894b4a1e47af650852859381a66ae63f'],[live,'live_registry_contract_sha256','95936ed4d6220a62d4f433fa317efc225f0c3e9eab92a22015bff6826ceb1ee3']]){const x=cp(o),d=x[f];delete x[f];assert.equal(d,e);assert.equal(sem(x),e)}
const run=env=>spawnSync(process.execPath,[V],{cwd:R,env:{...process.env,...env},encoding:'utf8'});
const baseline=run({});assert.equal(baseline.status,0,baseline.stderr||baseline.stdout);assert.deepEqual(JSON.parse(baseline.stdout),{validator:'m05-intel-stage-receipt-control-stack-amendment',registered_stage_receipts:0,registered_control_stack_receipts:0,fully_bound_control_stack_receipts:0,passing_temporal_reconciliations:0,transaction_admissible:false,federal_cash_custody_admissible:false,public_account_booking_admissible:false,distribution_admissible:false,answer_change_authorized:false,issue_345_may_close:false});
const required=(obj,fields)=>{for(const f of fields)if(!Object.hasOwn(obj,f))obj[f]=null;return obj};
const makeFixture=(opts={})=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'m05-live-stack-')),sourceDir=path.join(root,'receipts/m05/intel-realization/source'),stackDir=path.join(root,'receipts/m05/intel-realization/control-stack');fs.mkdirSync(sourceDir,{recursive:true});fs.mkdirSync(stackDir,{recursive:true});
 const event='intel-event-fixture',stage=opts.stage||'transaction';
 const write=(name,obj)=>{const abs=path.join(sourceDir,name),bytes=Buffer.from(`${JSON.stringify(obj,null,2)}\n`);fs.writeFileSync(abs,bytes);return{path:path.relative(root,abs).split(path.sep).join('/'),blob_sha:blob(bytes),body_sha256:sha(bytes),schema_version:obj.schema_version,receipt_id:obj.receipt_id,event_chain_id:obj.event_chain_id,stage:obj.stage}};
 const base=(role,id)=>({schema_version:`fixture-${role}@1`,object_class:'fixture_stage_control_receipt',receipt_id:id,event_chain_id:event,stage,control_role:role,control_result:'pass',observed_at_utc:'2026-08-27T00:00:01Z'});
 const prov=required(base('provenance_object_custody','prov-1'),PC.stage_receipt_required_fields);Object.assign(prov,{provenance_object_custody_complete:true,stage_admissible:true});
 const conn=required(base('connection_authentication','conn-1'),CC.effective_stage_connection_authentication[stage].required_fields);Object.assign(conn,{connection_authentication_receipt_id:'conn-1',connection_authentication_complete:true});
 const obs=required(base('observation_time_custody','time-1'),OC.effective_stage_observation_time_custody[stage].required_fields);Object.assign(obs,{observation_time_receipt_id:'time-1',freshness_result:'pass',temporal_order_reconciliation:{result:'pass'},observation_time_custody_complete:true});
 const temp=base('temporal_reconciliation_admission','temp-1');Object.assign(temp,{temporal_reconciliation_result:opts.temporalResult||'pass',temporal_order_reconciliation:{result:opts.temporalResult||'pass'},temporal_reconciliation_complete:true});
 const bindings={p:write('provenance.json',prov),c:write('connection.json',conn),o:write('observation.json',obs),t:write('temporal.json',temp)};
 if(opts.eventMismatch){const q=JSON.parse(fs.readFileSync(path.join(root,bindings.c.path)));q.event_chain_id='wrong-event';bindings.c=write('connection.json',q)}
 const stack={schema_version:'m05-answerable-power-s03-l7-intel-realization-stage-control-stack-receipt@1',object_class:'intel_realization_stage_control_stack_receipt',control_stack_receipt_id:'stack-1',registry_receipt_id:'registry-1',event_chain_id:event,stage,provenance_stage_receipt_binding:bindings.p,connection_authentication_receipt_binding:opts.reuseRole?bindings.p:bindings.c,observation_time_receipt_binding:bindings.o,temporal_reconciliation_receipt_binding:bindings.t,temporal_reconciliation_result:opts.temporalResult||'pass',all_bindings_valid:true,full_control_stack_complete:true,stage_admissible:true,observed_at_utc:'2026-08-27T00:00:02Z'};
 const stackPath=path.join(stackDir,'stack-1.json');fs.writeFileSync(stackPath,`${JSON.stringify(stack,null,2)}\n`);
 const registry=cp(baseRegistry);registry.receipts=opts.orphanStack?[]:[{registry_receipt_id:'registry-1',event_chain_id:event,stage,predecessor_registry_receipt_id:stage==='transaction'?null:(opts.predecessor||null),control_stack_receipt_id:'stack-1',registered_at_utc:opts.preGate?'2026-08-26T23:59:59Z':'2026-08-27T00:00:03Z'}];
 if(opts.missingStack)fs.unlinkSync(stackPath);const n=registry.receipts.length,m=fs.existsSync(stackPath)?1:0,valid=n&&m&&!opts.temporalResult&&!opts.eventMismatch&&!opts.reuseRole&&!opts.preGate?1:0;registry.observed_state={registered_stage_receipts:n,registered_control_stack_receipts:m,fully_bound_control_stack_receipts:valid,passing_temporal_reconciliations:valid,transaction_admissible:valid===1&&stage==='transaction',federal_cash_custody_admissible:valid===1&&stage==='federal_cash_custody',public_account_booking_admissible:valid===1&&stage==='public_account_booking',distribution_admissible:valid===1&&stage==='distribution',answer_change_authorized:false};
 const registryPath=path.join(root,'live-registry.json');fs.writeFileSync(registryPath,`${JSON.stringify(registry,null,2)}\n`);return{root,registryPath,stackDir};
};
const invoke=f=>run({M05_INTEL_STAGE_RECEIPT_LIVE_REGISTRY_PATH:f.registryPath,M05_INTEL_RECEIPT_REPOSITORY_ROOT:f.root,M05_INTEL_CONTROL_STACK_RECEIPT_ROOT:f.stackDir});
const positive=makeFixture();const ok=invoke(positive);assert.equal(ok.status,0,ok.stderr||ok.stdout);assert.deepEqual(JSON.parse(ok.stdout),{validator:'m05-intel-stage-receipt-control-stack-amendment',registered_stage_receipts:1,registered_control_stack_receipts:1,fully_bound_control_stack_receipts:1,passing_temporal_reconciliations:1,transaction_admissible:true,federal_cash_custody_admissible:false,public_account_booking_admissible:false,distribution_admissible:false,answer_change_authorized:false,issue_345_may_close:false});fs.rmSync(positive.root,{recursive:true,force:true});
for(const opts of[{temporalResult:'indeterminate'},{eventMismatch:true},{reuseRole:true},{missingStack:true},{orphanStack:true},{preGate:true},{stage:'federal_cash_custody'}]){const f=makeFixture(opts),r=invoke(f);assert.notEqual(r.status,0,`negative fixture passed: ${JSON.stringify(opts)}`);fs.rmSync(f.root,{recursive:true,force:true})}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'m05-live-contract-')),rewrite=path.join(tmp,'contract.json');fs.writeFileSync(rewrite,`${JSON.stringify(live)}\n`);const drift=run({M05_INTEL_STAGE_RECEIPT_LIVE_REGISTRY_CONTRACT_PATH:rewrite});assert.notEqual(drift.status,0,'semantic-equivalent live-contract rewrite passed');fs.rmSync(tmp,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.test: OK');
