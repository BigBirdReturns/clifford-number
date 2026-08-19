#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const validator=path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.mjs');
const paths={
  contract:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.json'),
  transport:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.json'),
  transportValidator:path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.mjs'),
  transportTest:path.join(root,'test/m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.test.js'),
  transportWorkflow:path.join(root,'.github/workflows/m05-intel-realization-transport-body-representation-amendment.yml')
};
const envNames={
  contract:'M05_INTEL_REALIZATION_REQUEST_ENVELOPE_CUSTODY_AMENDMENT_PATH',
  transport:'M05_INTEL_REALIZATION_TRANSPORT_BODY_REPRESENTATION_AMENDMENT_PATH',
  transportValidator:'M05_INTEL_REALIZATION_TRANSPORT_BODY_REPRESENTATION_VALIDATOR_PATH',
  transportTest:'M05_INTEL_REALIZATION_TRANSPORT_BODY_REPRESENTATION_TEST_PATH',
  transportWorkflow:'M05_INTEL_REALIZATION_TRANSPORT_BODY_REPRESENTATION_WORKFLOW_PATH'
};
const raw=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,fs.readFileSync(target)]));
const contract=JSON.parse(raw.contract.toString('utf8'));
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-intel-request-envelope-'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const semanticHash=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const runValidator=(env={})=>spawnSync(process.execPath,[validator],{
  cwd:root,
  env:{...process.env,...env},
  encoding:'utf8'
});
const writeRaw=(label,content,extension='json')=>{
  const target=path.join(tempRoot,`${label}.${extension}`);
  fs.writeFileSync(target,content);
  return target;
};
const expectFailure=(label,envName,target)=>{
  const result=runValidator({[envName]:target});
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};
const mutateContract=(label,mutate,rewriteChecksum=false)=>{
  const changed=clone(contract);
  mutate(changed);
  if(rewriteChecksum){
    const copy=clone(changed);
    delete copy.contract_sha256;
    changed.contract_sha256=semanticHash(copy);
  }
  expectFailure(label,envNames.contract,writeRaw(label,`${JSON.stringify(changed,null,2)}\n`));
};

const baseline=runValidator();
assert.equal(baseline.status,0,baseline.stderr||baseline.stdout);
assert.deepEqual(JSON.parse(baseline.stdout),{
  validator:'m05-intel-realization-request-envelope-custody-amendment',
  amended_stages:4,
  stages_requiring_exact_request_envelope:4,
  stages_requiring_network_header_custody:4,
  stages_requiring_vary_reconciliation:4,
  observed_receipts:0,
  transaction_admissible:false,
  federal_cash_custody_admissible:false,
  public_account_booking_admissible:false,
  distribution_admissible:false,
  issue_345_may_close:false
});

mutateContract('schema-drift',(row)=>{row.schema_version='broken@1'});
mutateContract('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
mutateContract('predecessor-path-drift',(row)=>{row.bindings.transport_body_representation_amendment.path='wrong.json'});
mutateContract('predecessor-blob-substitution',(row)=>{row.bindings.transport_body_representation_amendment.blob_sha='0'.repeat(40)});
mutateContract('request-target-body-deletion',(row)=>{
  row.request_envelope_profile.required_fields=
    row.request_envelope_profile.required_fields.filter((key)=>key!=='request_target_body_sha256');
});
mutateContract('request-header-custody-deletion',(row)=>{
  row.request_envelope_profile.required_fields=
    row.request_envelope_profile.required_fields.filter((key)=>key!=='request_headers_custody_locator');
});
mutateContract('vary-body-custody-deletion',(row)=>{
  row.request_envelope_profile.required_fields=
    row.request_envelope_profile.required_fields.filter((key)=>key!=='vary_key_reconciliation_body_sha256');
});
mutateContract('target-normalization',(row)=>{row.request_envelope_rules.request_target.normalization_before_hash_admissible=true});
mutateContract('hidden-client-defaults',(row)=>{row.request_envelope_rules.request_headers.hidden_client_defaults_admissible=true});
mutateContract('duplicate-header-collapse',(row)=>{row.request_envelope_rules.request_headers.duplicate_headers_joined_or_collapsed=true});
mutateContract('credential-scope-expansion',(row)=>{row.request_envelope_rules.privacy_and_scope.allowed_credential_scope_classes.push('session_token')});
mutateContract('cookie-scope-expansion',(row)=>{row.request_envelope_rules.privacy_and_scope.allowed_cookie_scope_classes.push('session_cookie')});
mutateContract('not-modified-qualification',(row)=>{row.request_envelope_rules.conditional_and_range.not_modified_without_source_body_cannot_qualify=false});
mutateContract('range-manifest-weakening',(row)=>{row.request_envelope_rules.conditional_and_range.reassembly_manifest_body_and_custody_locator_required=false});
mutateContract('vary-star-reproducibility',(row)=>{row.request_envelope_rules.vary.vary_star_disallows_public_reproducibility=false});
mutateContract('receipt-injection',(row)=>{row.observed_receipts.push({stage:'transaction'})});
mutateContract('answer-overclaim',(row)=>{row.observed_state.answer_change_authorized=true});
mutateContract('issue-closure',(row)=>{row.boundaries.issue_345_may_close=true});
mutateContract('checksum-rewrite',(row)=>{row.contract_sha256='0'.repeat(64)});
mutateContract(
  'coordinated-content-checksum-rewrite',
  (row)=>{row.request_envelope_rules.vary.reconciliation_body_and_custody_locator_required=false},
  true
);

const compactContract=`${JSON.stringify(contract)}\n`;
assert.deepEqual(JSON.parse(compactContract),contract);
expectFailure('semantic-equivalent-byte-rewrite',envNames.contract,writeRaw('semantic-equivalent-byte-rewrite',compactContract));
const crlfContract=raw.contract.toString('utf8').replaceAll('\n','\r\n');
expectFailure('line-ending-rewrite',envNames.contract,writeRaw('line-ending-rewrite',crlfContract));

for(const [key,extension] of [
  ['transport','json'],
  ['transportValidator','mjs'],
  ['transportTest','js'],
  ['transportWorkflow','yml']
]){
  expectFailure(
    `${key}-byte-rewrite`,
    envNames[key],
    writeRaw(`${key}-byte-rewrite`,Buffer.concat([raw[key],Buffer.from('\n')]),extension)
  );
}

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.test: OK');
