#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const validator=path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-source-custody-amendment.mjs');
const amendmentPath=path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-source-custody-amendment.json');
const contractPath=path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-accounting-admission-contract.json');
const predecessorValidatorPath=path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-accounting-admission-contract.mjs');
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-intel-source-custody-'));

const amendment=JSON.parse(fs.readFileSync(amendmentPath,'utf8'));
const contract=JSON.parse(fs.readFileSync(contractPath,'utf8'));
const predecessorValidator=fs.readFileSync(predecessorValidatorPath,'utf8');
const clone=(value)=>JSON.parse(JSON.stringify(value));
const semanticHash=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const runValidator=(env={})=>spawnSync(process.execPath,[validator],{
  cwd:root,
  env:{...process.env,...env},
  encoding:'utf8'
});

const baseline=runValidator();
assert.equal(baseline.status,0,baseline.stderr||baseline.stdout);
const summary=JSON.parse(baseline.stdout);
assert.equal(summary.validator,'m05-intel-realization-source-custody-amendment');
assert.equal(summary.amended_stages,4);
assert.equal(summary.stages_requiring_exact_body_hash,4);
assert.equal(summary.downstream_stages_newly_requiring_source_body_sha256,3);
assert.equal(summary.observed_receipts,0);
assert.equal(summary.transaction_admissible,false);
assert.equal(summary.federal_cash_custody_admissible,false);
assert.equal(summary.public_account_booking_admissible,false);
assert.equal(summary.distribution_admissible,false);
assert.equal(summary.issue_345_may_close,false);

let mutationIndex=0;
const writeRawMutation=(content,label,extension='json')=>{
  mutationIndex+=1;
  const target=path.join(tempRoot,`${String(mutationIndex).padStart(2,'0')}-${label}.${extension}`);
  fs.writeFileSync(target,content);
  return target;
};
const writeJsonMutation=(value,label)=>writeRawMutation(`${JSON.stringify(value,null,2)}\n`,label);
const expectInputFailure=(label,envName,target)=>{
  const result=runValidator({[envName]:target});
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};
const expectAmendmentFailure=(label,mutate)=>{
  const changed=clone(amendment);
  mutate(changed);
  expectInputFailure(
    label,
    'M05_INTEL_REALIZATION_SOURCE_CUSTODY_AMENDMENT_PATH',
    writeJsonMutation(changed,label)
  );
};

expectAmendmentFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectAmendmentFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectAmendmentFailure('contract-binding-substitution',(row)=>{row.bindings.realization_accounting_admission_contract.blob_sha='0'.repeat(40)});
expectAmendmentFailure('validator-binding-substitution',(row)=>{row.bindings.realization_accounting_contract_validator.blob_sha='0'.repeat(40)});
expectAmendmentFailure('predecessor-gap-erasure',(row)=>{row.predecessor_gap.federal_cash_custody_requires_source_body_sha256=true});
expectAmendmentFailure('stage-deletion',(row)=>{delete row.effective_stage_source_custody.distribution});
expectAmendmentFailure('source-body-field-deletion',(row)=>{
  row.effective_stage_source_custody.public_account_booking.additional_required_fields=
    row.effective_stage_source_custody.public_account_booking.additional_required_fields.filter((key)=>key!=='source_body_sha256');
});
expectAmendmentFailure('transaction-inheritance-drift',(row)=>{row.effective_stage_source_custody.transaction.source_body_sha256_inherited_from_predecessor=false});
expectAmendmentFailure('url-only-qualification',(row)=>{row.effective_stage_source_custody.federal_cash_custody.source_url_and_locator_only_qualifies=true});
expectAmendmentFailure('unarchived-source-qualification',(row)=>{row.effective_stage_source_custody.distribution.unhashed_or_unarchived_source_qualifies=true});
expectAmendmentFailure('hash-algorithm-drift',(row)=>{row.custody_rules.hash_algorithm='sha1'});
expectAmendmentFailure('custody-mode-deletion',(row)=>{row.custody_rules.allowed_custody_modes.pop()});
expectAmendmentFailure('mutable-live-url-admission',(row)=>{row.custody_rules.mutable_live_url_without_hashed_body_is_admissible=true});
expectAmendmentFailure('single-hash-multiple-bodies',(row)=>{row.custody_rules.multiple_source_bodies_each_require_independent_hash=false});
expectAmendmentFailure('receipt-injection',(row)=>{row.observed_receipts.push({stage:'transaction'})});
expectAmendmentFailure('answer-overclaim',(row)=>{row.observed_state.answer_change_authorized=true});
expectAmendmentFailure('guardrail-weakening',(row)=>{row.guardrails.content_hash_without_custody_locator_is_complete=true});
expectAmendmentFailure('expected-stage-inflation',(row)=>{row.expected_result.amended_stages=5});
expectAmendmentFailure('issue-closure',(row)=>{row.boundaries.issue_345_may_close=true});
expectAmendmentFailure('checksum-rewrite',(row)=>{row.amendment_sha256='0'.repeat(64)});
expectAmendmentFailure('coordinated-content-checksum-rewrite',(row)=>{
  row.custody_rules.hash_scope='normalized_source_text';
  const copy=clone(row);
  delete copy.amendment_sha256;
  row.amendment_sha256=semanticHash(copy);
});

const semanticEquivalentAmendment=`${JSON.stringify(amendment)}\n`;
assert.deepEqual(JSON.parse(semanticEquivalentAmendment),amendment);
expectInputFailure(
  'semantic-equivalent-amendment-byte-rewrite',
  'M05_INTEL_REALIZATION_SOURCE_CUSTODY_AMENDMENT_PATH',
  writeRawMutation(semanticEquivalentAmendment,'semantic-equivalent-amendment-byte-rewrite')
);

const semanticEquivalentContract=`${JSON.stringify(contract)}\n`;
assert.deepEqual(JSON.parse(semanticEquivalentContract),contract);
expectInputFailure(
  'semantic-equivalent-contract-byte-rewrite',
  'M05_INTEL_REALIZATION_ACCOUNTING_ADMISSION_CONTRACT_PATH',
  writeRawMutation(semanticEquivalentContract,'semantic-equivalent-contract-byte-rewrite')
);

expectInputFailure(
  'predecessor-validator-byte-rewrite',
  'M05_INTEL_REALIZATION_ACCOUNTING_ADMISSION_VALIDATOR_PATH',
  writeRawMutation(`${predecessorValidator}\n`,'predecessor-validator-byte-rewrite','mjs')
);

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-intel-realization-source-custody-amendment.test: OK');
