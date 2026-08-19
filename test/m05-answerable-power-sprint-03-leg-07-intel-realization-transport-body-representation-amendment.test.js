#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const validator=path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.mjs');
const files={
  amendment:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.json'),
  predecessor:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-receipt-custody-amendment.json'),
  predecessorValidator:path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-receipt-custody-amendment.mjs'),
  predecessorTest:path.join(root,'test/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-receipt-custody-amendment.test.js'),
  predecessorWorkflow:path.join(root,'.github/workflows/m05-intel-realization-provenance-receipt-custody-amendment.yml')
};
const raw=Object.fromEntries(Object.entries(files).map(([key,target])=>[key,fs.readFileSync(target,key.includes('Validator')||key.includes('Test')||key.includes('Workflow')?'utf8':undefined)]));
const amendment=JSON.parse(raw.amendment);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'m05-transport-body-'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const semantic=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const run=(env={})=>spawnSync(process.execPath,[validator],{cwd:root,env:{...process.env,...env},encoding:'utf8'});
const baseline=run();
assert.equal(baseline.status,0,baseline.stderr||baseline.stdout);
assert.deepEqual(JSON.parse(baseline.stdout),{
  validator:'m05-intel-realization-transport-body-representation-amendment',
  amended_stages:4,
  stages_requiring_transport_protocol:4,
  stages_requiring_body_hash_domain:4,
  stages_requiring_coding_chain:4,
  stages_requiring_decoding_chain_when_applied:4,
  observed_receipts:0,
  transaction_admissible:false,
  federal_cash_custody_admissible:false,
  public_account_booking_admissible:false,
  distribution_admissible:false,
  issue_345_may_close:false
});
let index=0;
const write=(label,content,extension='json')=>{
  const target=path.join(temp,`${String(++index).padStart(2,'0')}-${label}.${extension}`);
  fs.writeFileSync(target,content);
  return target;
};
const reject=(label,envName,target)=>{
  const result=run({[envName]:target});
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};
const mutate=(label,fn)=>{
  const changed=clone(amendment);
  fn(changed);
  reject(label,'M05_INTEL_REALIZATION_TRANSPORT_BODY_REPRESENTATION_AMENDMENT_PATH',write(label,`${JSON.stringify(changed,null,2)}\n`));
};
mutate('schema',row=>{row.schema_version='broken@1'});
mutate('base',row=>{row.canonical_base.sha='0'.repeat(40)});
mutate('validator-binding',row=>{row.bindings.provenance_receipt_custody_validator.blob_sha='0'.repeat(40)});
mutate('test-binding',row=>{row.bindings.provenance_receipt_custody_test.blob_sha='0'.repeat(40)});
mutate('workflow-binding',row=>{row.bindings.provenance_receipt_custody_workflow.blob_sha='0'.repeat(40)});
mutate('gap-erasure',row=>{row.predecessor_gap.body_hash_domain_required=true});
mutate('stage-binding',row=>{row.effective_stage_transport_body_representation.transaction.requires_receipt_custody_stage='distribution'});
mutate('domain-field-delete',row=>{row.effective_stage_transport_body_representation.public_account_booking.additional_required_fields=row.effective_stage_transport_body_representation.public_account_booking.additional_required_fields.filter(value=>value!=='body_hash_domain')});
mutate('protocol-denominator',row=>{row.transport_body_rules.allowed_transport_protocol_families.pop()});
mutate('body-domain-denominator',row=>{row.transport_body_rules.allowed_body_hash_domains.pop()});
mutate('coding-identity',row=>{row.transport_body_rules.coding_chain_identity_token='none'});
mutate('decoder-schema',row=>{row.transport_body_rules.decoder_chain_required_fields.pop()});
mutate('normalization-enabled',row=>{row.transport_body_rules.normalization_applied_must_be_false=false});
mutate('compressed-decoded-equivalence',row=>{row.transport_body_rules.compressed_and_decompressed_bodies_are_interchangeable=true});
mutate('receipt-injection',row=>{row.observed_receipts.push({stage:'transaction'})});
mutate('answer-overclaim',row=>{row.observed_state.answer_change_authorized=true});
mutate('closure',row=>{row.boundaries.issue_345_may_close=true});
mutate('checksum',row=>{row.transport_body_amendment_sha256='0'.repeat(64)});
mutate('coordinated-rewrite',row=>{
  row.transport_body_rules.one_digest_may_cover_multiple_representation_domains=true;
  const copy=clone(row);
  delete copy.transport_body_amendment_sha256;
  row.transport_body_amendment_sha256=semantic(copy);
});
reject('amendment-byte-rewrite','M05_INTEL_REALIZATION_TRANSPORT_BODY_REPRESENTATION_AMENDMENT_PATH',write('amendment-byte-rewrite',`${JSON.stringify(amendment)}\n`));
reject('predecessor-byte-rewrite','M05_INTEL_REALIZATION_PROVENANCE_RECEIPT_CUSTODY_AMENDMENT_PATH',write('predecessor-byte-rewrite',`${JSON.stringify(JSON.parse(raw.predecessor))}\n`));
reject('predecessor-validator-byte-rewrite','M05_INTEL_REALIZATION_PROVENANCE_RECEIPT_CUSTODY_VALIDATOR_PATH',write('predecessor-validator-byte-rewrite',`${raw.predecessorValidator}\n`,'mjs'));
reject('predecessor-test-byte-rewrite','M05_INTEL_REALIZATION_PROVENANCE_RECEIPT_CUSTODY_TEST_PATH',write('predecessor-test-byte-rewrite',`${raw.predecessorTest}\n`,'js'));
reject('predecessor-workflow-byte-rewrite','M05_INTEL_REALIZATION_PROVENANCE_RECEIPT_CUSTODY_WORKFLOW_PATH',write('predecessor-workflow-byte-rewrite',`${raw.predecessorWorkflow}\n`,'yml'));
fs.rmSync(temp,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.test: OK');
