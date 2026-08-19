#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const validator=path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody.mjs');
const contractPath=path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody-contract.json');
const registryPath=path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-registry.json');
const provenancePath=path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-source-provenance-amendment.json');
const provenanceValidatorPath=path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-source-provenance-amendment.mjs');
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-intel-provenance-object-custody-'));

const contract=JSON.parse(fs.readFileSync(contractPath,'utf8'));
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
const provenance=JSON.parse(fs.readFileSync(provenancePath,'utf8'));
const provenanceValidator=fs.readFileSync(provenanceValidatorPath,'utf8');
const clone=(value)=>JSON.parse(JSON.stringify(value));
const bodySha=(buffer)=>crypto.createHash('sha256').update(buffer).digest('hex');
const gitBlobSha=(buffer)=>crypto
  .createHash('sha1')
  .update(Buffer.from(`blob ${buffer.length}\0`,'utf8'))
  .update(buffer)
  .digest('hex');
const runValidator=(env={})=>spawnSync(process.execPath,[validator],{
  cwd:root,
  env:{...process.env,...env},
  encoding:'utf8'
});
const writeJson=(target,value)=>{
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,`${JSON.stringify(value,null,2)}\n`);
};
const expectFailure=(label,env={})=>{
  const result=runValidator(env);
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};
const expectSuccess=(label,env={})=>{
  const result=runValidator(env);
  assert.equal(result.status,0,`${label} failed\n${result.stdout}\n${result.stderr}`);
  return JSON.parse(result.stdout);
};

const baseline=expectSuccess('baseline');
assert.deepEqual(baseline,{
  validator:'m05-intel-realization-provenance-object-custody',
  ordinary_gate_utc:'2026-08-27T00:00:00Z',
  controlled_stages:4,
  registered_stage_receipts:0,
  retrievable_provenance_objects:0,
  transaction_admissible:false,
  federal_cash_custody_admissible:false,
  public_account_booking_admissible:false,
  distribution_admissible:false,
  issue_345_may_close:false
});

let mutationIndex=0;
const mutationPath=(label,extension='json')=>{
  mutationIndex+=1;
  return path.join(tempRoot,'mutations',`${String(mutationIndex).padStart(2,'0')}-${label}.${extension}`);
};
const contractFailure=(label,mutate)=>{
  const changed=clone(contract);
  mutate(changed);
  const target=mutationPath(label);
  writeJson(target,changed);
  expectFailure(label,{M05_INTEL_REALIZATION_PROVENANCE_OBJECT_CUSTODY_CONTRACT_PATH:target});
};
const registryFailure=(label,mutate,extraEnv={})=>{
  const changed=clone(registry);
  mutate(changed);
  const target=mutationPath(label);
  writeJson(target,changed);
  expectFailure(label,{
    M05_INTEL_REALIZATION_STAGE_RECEIPT_REGISTRY_PATH:target,
    ...extraEnv
  });
};

contractFailure('contract-schema-drift',(row)=>{row.schema_version='m05-broken@1'});
contractFailure('contract-canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
contractFailure('contract-predecessor-binding-substitution',(row)=>{row.bindings.source_provenance_amendment.blob_sha='0'.repeat(40)});
contractFailure('predecessor-gap-erasure',(row)=>{row.predecessor_gap.origin_evidence_retrievable_object_required=true});
contractFailure('source-body-binding-deletion',(row)=>{delete row.provenance_object_bindings.source_body_custody});
contractFailure('authority-resolution-weakening',(row)=>{row.provenance_object_bindings.authority_resolution_receipt.self_declaration_alone_qualifies=true});
contractFailure('path-prefix-weakening',(row)=>{row.receipt_registry.receipt_object_path_prefix='receipts/'});
contractFailure('registry-entry-is-admission',(row)=>{row.guardrails.registry_entry_is_stage_admission=true});
contractFailure('contract-issue-closure',(row)=>{row.boundaries.issue_345_may_close=true});
contractFailure('contract-checksum-rewrite',(row)=>{row.contract_sha256='0'.repeat(64)});

const compactContract=`${JSON.stringify(contract)}\n`;
assert.deepEqual(JSON.parse(compactContract),contract);
const compactContractPath=mutationPath('semantic-equivalent-contract-byte-rewrite');
fs.writeFileSync(compactContractPath,compactContract);
expectFailure('semantic-equivalent-contract-byte-rewrite',{
  M05_INTEL_REALIZATION_PROVENANCE_OBJECT_CUSTODY_CONTRACT_PATH:compactContractPath
});

const compactProvenance=`${JSON.stringify(provenance)}\n`;
assert.deepEqual(JSON.parse(compactProvenance),provenance);
const compactProvenancePath=mutationPath('semantic-equivalent-provenance-byte-rewrite');
fs.writeFileSync(compactProvenancePath,compactProvenance);
expectFailure('semantic-equivalent-provenance-byte-rewrite',{
  M05_INTEL_REALIZATION_SOURCE_PROVENANCE_AMENDMENT_PATH:compactProvenancePath
});

const changedPredecessorValidatorPath=mutationPath('predecessor-validator-byte-rewrite','mjs');
fs.writeFileSync(changedPredecessorValidatorPath,`${provenanceValidator}\n`);
expectFailure('predecessor-validator-byte-rewrite',{
  M05_INTEL_REALIZATION_SOURCE_PROVENANCE_VALIDATOR_PATH:changedPredecessorValidatorPath
});

registryFailure('registry-schema-drift',(row)=>{row.schema_version='m05-broken@1'});
registryFailure('registry-contract-binding-substitution',(row)=>{row.contract_binding.blob_sha='0'.repeat(40)});
registryFailure('registry-gate-drift',(row)=>{row.ordinary_gate_utc='2026-08-18T00:00:00Z'});
registryFailure('registry-receipt-injection-without-objects',(row)=>{
  row.status='intel_realization_stage_receipt_registry_custody_only';
  row.receipts.push({receipt_id:'M05-INCOMPLETE'});
});
registryFailure('registry-observed-state-inflation',(row)=>{row.observed_state.registered_stage_receipts=1});
registryFailure('registry-issue-closure',(row)=>{row.boundaries.issue_345_may_close=true});

const receiptPrefix='receipts/m05/intel-realization/sample';
const sourceRelative=`${receiptPrefix}/source-body.html`;
const sourcePath=path.join(tempRoot,sourceRelative);
const sourceBytes=Buffer.from('<!doctype html><title>Official Intel transaction record sample</title>\n','utf8');
fs.mkdirSync(path.dirname(sourcePath),{recursive:true});
fs.writeFileSync(sourcePath,sourceBytes);
const rawBinding=(relative,buffer,contentType)=>({
  path:relative,
  blob_sha:gitBlobSha(buffer),
  body_sha256:bodySha(buffer),
  content_type:contentType
});
const jsonBinding=(relative,value)=>{
  const target=path.join(tempRoot,relative);
  writeJson(target,value);
  const buffer=fs.readFileSync(target);
  return {
    path:relative,
    blob_sha:gitBlobSha(buffer),
    body_sha256:bodySha(buffer),
    schema_version:value.schema_version
  };
};
const sourceBinding=rawBinding(sourceRelative,sourceBytes,'text/html');
const requestHeadersRelative=`${receiptPrefix}/request-headers.txt`;
const requestHeadersBytes=Buffer.from('GET /Archives/edgar/data/50863/000005086326000027/a01232026424b7.htm HTTP/1.1\nhost: www.sec.gov\naccept: text/html\n','utf8');
const requestHeadersPath=path.join(tempRoot,requestHeadersRelative);
fs.writeFileSync(requestHeadersPath,requestHeadersBytes);
const requestHeadersBinding=rawBinding(requestHeadersRelative,requestHeadersBytes,'application/http-request-headers');
const responseHeadersRelative=`${receiptPrefix}/response-headers.txt`;
const responseHeadersBytes=Buffer.from('HTTP/1.1 200 OK\ncontent-type: text/html\n','utf8');
const responseHeadersPath=path.join(tempRoot,responseHeadersRelative);
fs.writeFileSync(responseHeadersPath,responseHeadersBytes);
const responseHeadersBinding=rawBinding(responseHeadersRelative,responseHeadersBytes,'application/http-response-headers');
const tlsRelative=`${receiptPrefix}/tls-peer-certificate.pem`;
const tlsBytes=Buffer.from('-----BEGIN CERTIFICATE-----\nSAMPLE\n-----END CERTIFICATE-----\n','utf8');
const tlsPath=path.join(tempRoot,tlsRelative);
fs.writeFileSync(tlsPath,tlsBytes);
const tlsBinding=rawBinding(tlsRelative,tlsBytes,'application/pem-certificate-chain');

const sourceAuthority='United States Securities and Exchange Commission';
const authorityScheme='sec_cik_and_edgar_filing_system';
const authorityIdentifier='SEC-CIK-0000050863';
const recordIdentifier='EDGAR-0000050863-26-000027';
const sourceUrl='https://www.sec.gov/Archives/edgar/data/50863/000005086326000027/a01232026424b7.htm';

const authorityValue={
  schema_version:'m05-answerable-power-s03-l7-intel-authority-resolution-receipt@1',
  object_class:'source_authority_resolution_receipt',
  source_authority:sourceAuthority,
  authority_identifier_scheme:authorityScheme,
  source_authority_identifier:authorityIdentifier,
  verification_method:'official_filing_system',
  official_origin_hosts:['www.sec.gov'],
  official_record_system_identifiers:['EDGAR-CIK-50863'],
  evidence_items:[{
    evidence_role:'authority_and_record_system',
    source_url:sourceUrl,
    source_locator:'EDGAR issuer and filing record',
    body_binding:sourceBinding
  }],
  observed_at_utc:'2026-08-27T00:01:00Z'
};
const authorityRelative=`${receiptPrefix}/authority-resolution.json`;
const authorityBinding=jsonBinding(authorityRelative,authorityValue);

const originValue={
  schema_version:'m05-answerable-power-s03-l7-intel-origin-evidence-receipt@1',
  object_class:'source_origin_evidence_receipt',
  source_authority:sourceAuthority,
  authority_identifier_scheme:authorityScheme,
  source_authority_identifier:authorityIdentifier,
  source_record_identifier:recordIdentifier,
  source_record_class:'source_native_primary_record',
  source_origin_url:sourceUrl,
  source_origin_observed_at_utc:'2026-08-27T00:01:00Z',
  source_origin_content_type:'text/html',
  source_origin_body_sha256:sourceBinding.body_sha256,
  origin_verification_mode:'official_https_retrieval_with_transport_receipt',
  authority_resolution_receipt_body_sha256:authorityBinding.body_sha256,
  origin_evidence_items:[{
    evidence_role:'source_native_record_body',
    source_url:sourceUrl,
    source_locator:'Exact source-native filing body',
    body_binding:sourceBinding
  }]
};
const originRelative=`${receiptPrefix}/origin-evidence.json`;
const originBinding=jsonBinding(originRelative,originValue);

const acquisitionValue={
  schema_version:'m05-answerable-power-s03-l7-intel-acquisition-receipt@1',
  object_class:'source_acquisition_receipt',
  requested_url:sourceUrl,
  resolved_url:sourceUrl,
  redirect_chain:[],
  response_status:200,
  request_method:'GET',
  request_headers_custody:requestHeadersBinding,
  response_headers_custody:responseHeadersBinding,
  tls_peer_certificate_custody:tlsBinding,
  request_contains_credentials:false,
  observed_at_utc:'2026-08-27T00:01:00Z',
  content_type:'text/html',
  body_length_bytes:sourceBytes.length,
  source_origin_body_sha256:sourceBinding.body_sha256,
  acquisition_method:'source_native_filing_system',
  acquisition_tool:'m05-official-source-fetch',
  acquisition_tool_version:'1.0.0',
  authority_resolution_receipt_body_sha256:authorityBinding.body_sha256,
  origin_evidence_receipt_body_sha256:originBinding.body_sha256
};
const acquisitionRelative=`${receiptPrefix}/acquisition.json`;
const acquisitionBinding=jsonBinding(acquisitionRelative,acquisitionValue);

const sampleReceipt={
  receipt_id:'M05-INTEL-PROVENANCE-SAMPLE-001',
  event_chain_id:'M05-INTEL-EVENT-SAMPLE-001',
  stage:'transaction',
  predecessor_stage_receipt_id:null,
  source_authority:sourceAuthority,
  authority_identifier_scheme:authorityScheme,
  source_authority_identifier:authorityIdentifier,
  source_record_identifier:recordIdentifier,
  source_record_class:'source_native_primary_record',
  source_origin_body_sha256:sourceBinding.body_sha256,
  source_custody_body_sha256:sourceBinding.body_sha256,
  origin_evidence_sha256:originBinding.body_sha256,
  acquisition_receipt_sha256:acquisitionBinding.body_sha256,
  source_body_custody:sourceBinding,
  authority_resolution_receipt:authorityBinding,
  origin_evidence_receipt:originBinding,
  acquisition_receipt:acquisitionBinding,
  provenance_object_custody_complete:true,
  stage_admissible:false
};
const sampleRegistry=clone(registry);
sampleRegistry.as_of='2026-08-27';
sampleRegistry.status='intel_realization_stage_receipt_registry_custody_only';
sampleRegistry.receipts=[sampleReceipt];
sampleRegistry.observed_state={
  registered_stage_receipts:1,
  retrievable_provenance_objects:7,
  transaction_admissible:false,
  federal_cash_custody_admissible:false,
  public_account_booking_admissible:false,
  distribution_admissible:false,
  answer_change_authorized:false
};
const sampleRegistryPath=path.join(tempRoot,'sample-registry.json');
writeJson(sampleRegistryPath,sampleRegistry);
const sampleEnv={
  M05_INTEL_REALIZATION_STAGE_RECEIPT_REGISTRY_PATH:sampleRegistryPath,
  M05_INTEL_REALIZATION_RECEIPT_ROOT:tempRoot
};
const sampleSummary=expectSuccess('complete retrievable provenance sample',sampleEnv);
assert.equal(sampleSummary.registered_stage_receipts,1);
assert.equal(sampleSummary.retrievable_provenance_objects,7);
assert.equal(sampleSummary.transaction_admissible,false);

const missingObjectRegistry=clone(sampleRegistry);
missingObjectRegistry.receipts[0].authority_resolution_receipt.path=`${receiptPrefix}/missing-authority.json`;
const missingObjectRegistryPath=mutationPath('missing-authority-object');
writeJson(missingObjectRegistryPath,missingObjectRegistry);
expectFailure('missing-authority-object',{
  M05_INTEL_REALIZATION_STAGE_RECEIPT_REGISTRY_PATH:missingObjectRegistryPath,
  M05_INTEL_REALIZATION_RECEIPT_ROOT:tempRoot
});

const traversalRegistry=clone(sampleRegistry);
traversalRegistry.receipts[0].source_body_custody.path='receipts/m05/intel-realization/../../escape.html';
const traversalRegistryPath=mutationPath('receipt-path-traversal');
writeJson(traversalRegistryPath,traversalRegistry);
expectFailure('receipt-path-traversal',{
  M05_INTEL_REALIZATION_STAGE_RECEIPT_REGISTRY_PATH:traversalRegistryPath,
  M05_INTEL_REALIZATION_RECEIPT_ROOT:tempRoot
});

const digestOnlyRegistry=clone(sampleRegistry);
delete digestOnlyRegistry.receipts[0].origin_evidence_receipt.path;
const digestOnlyRegistryPath=mutationPath('digest-without-object-path');
writeJson(digestOnlyRegistryPath,digestOnlyRegistry);
expectFailure('digest-without-object-path',{
  M05_INTEL_REALIZATION_STAGE_RECEIPT_REGISTRY_PATH:digestOnlyRegistryPath,
  M05_INTEL_REALIZATION_RECEIPT_ROOT:tempRoot
});

const authorityMismatchRegistry=clone(sampleRegistry);
authorityMismatchRegistry.receipts[0].source_authority_identifier='SEC-CIK-OTHER';
const authorityMismatchRegistryPath=mutationPath('authority-identity-mismatch');
writeJson(authorityMismatchRegistryPath,authorityMismatchRegistry);
expectFailure('authority-identity-mismatch',{
  M05_INTEL_REALIZATION_STAGE_RECEIPT_REGISTRY_PATH:authorityMismatchRegistryPath,
  M05_INTEL_REALIZATION_RECEIPT_ROOT:tempRoot
});

const originMismatchRegistry=clone(sampleRegistry);
originMismatchRegistry.receipts[0].source_custody_body_sha256='0'.repeat(64);
const originMismatchRegistryPath=mutationPath('origin-custody-body-mismatch');
writeJson(originMismatchRegistryPath,originMismatchRegistry);
expectFailure('origin-custody-body-mismatch',{
  M05_INTEL_REALIZATION_STAGE_RECEIPT_REGISTRY_PATH:originMismatchRegistryPath,
  M05_INTEL_REALIZATION_RECEIPT_ROOT:tempRoot
});

const admissionRegistry=clone(sampleRegistry);
admissionRegistry.receipts[0].stage_admissible=true;
admissionRegistry.observed_state.transaction_admissible=true;
const admissionRegistryPath=mutationPath('custody-self-authorizes-stage');
writeJson(admissionRegistryPath,admissionRegistry);
expectFailure('custody-self-authorizes-stage',{
  M05_INTEL_REALIZATION_STAGE_RECEIPT_REGISTRY_PATH:admissionRegistryPath,
  M05_INTEL_REALIZATION_RECEIPT_ROOT:tempRoot
});

const duplicateRegistry=clone(sampleRegistry);
duplicateRegistry.receipts.push(clone(sampleReceipt));
duplicateRegistry.observed_state.registered_stage_receipts=2;
const duplicateRegistryPath=mutationPath('duplicate-receipt');
writeJson(duplicateRegistryPath,duplicateRegistry);
expectFailure('duplicate-receipt',{
  M05_INTEL_REALIZATION_STAGE_RECEIPT_REGISTRY_PATH:duplicateRegistryPath,
  M05_INTEL_REALIZATION_RECEIPT_ROOT:tempRoot
});

const coordinatedRoot=path.join(tempRoot,'coordinated');
const coordinatedPrefix='receipts/m05/intel-realization/coordinated';
const coordinatedSourceRelative=`${coordinatedPrefix}/source-body.html`;
const coordinatedSourcePath=path.join(coordinatedRoot,coordinatedSourceRelative);
fs.mkdirSync(path.dirname(coordinatedSourcePath),{recursive:true});
fs.writeFileSync(coordinatedSourcePath,sourceBytes);
const coordinatedSourceBinding=rawBinding(coordinatedSourceRelative,sourceBytes,'text/html');
const coordinatedRequestRelative=`${coordinatedPrefix}/request-headers.txt`;
const coordinatedRequestPath=path.join(coordinatedRoot,coordinatedRequestRelative);
fs.writeFileSync(coordinatedRequestPath,requestHeadersBytes);
const coordinatedRequestBinding=rawBinding(coordinatedRequestRelative,requestHeadersBytes,'application/http-request-headers');
const coordinatedResponseRelative=`${coordinatedPrefix}/response-headers.txt`;
const coordinatedResponsePath=path.join(coordinatedRoot,coordinatedResponseRelative);
fs.writeFileSync(coordinatedResponsePath,responseHeadersBytes);
const coordinatedResponseBinding=rawBinding(coordinatedResponseRelative,responseHeadersBytes,'application/http-response-headers');
const coordinatedTlsRelative=`${coordinatedPrefix}/tls-peer-certificate.pem`;
const coordinatedTlsPath=path.join(coordinatedRoot,coordinatedTlsRelative);
fs.writeFileSync(coordinatedTlsPath,tlsBytes);
const coordinatedTlsBinding=rawBinding(coordinatedTlsRelative,tlsBytes,'application/pem-certificate-chain');
const coordinatedAuthority=clone(authorityValue);
coordinatedAuthority.verification_method='self_declaration';
coordinatedAuthority.evidence_items[0].body_binding=coordinatedSourceBinding;
const coordinatedAuthorityBinding=(()=>{
  const relative=`${coordinatedPrefix}/authority-resolution.json`;
  const target=path.join(coordinatedRoot,relative);
  writeJson(target,coordinatedAuthority);
  const buffer=fs.readFileSync(target);
  return {path:relative,blob_sha:gitBlobSha(buffer),body_sha256:bodySha(buffer),schema_version:coordinatedAuthority.schema_version};
})();
const coordinatedOrigin=clone(originValue);
coordinatedOrigin.authority_resolution_receipt_body_sha256=coordinatedAuthorityBinding.body_sha256;
coordinatedOrigin.origin_evidence_items[0].body_binding=coordinatedSourceBinding;
const coordinatedOriginBinding=(()=>{
  const relative=`${coordinatedPrefix}/origin-evidence.json`;
  const target=path.join(coordinatedRoot,relative);
  writeJson(target,coordinatedOrigin);
  const buffer=fs.readFileSync(target);
  return {path:relative,blob_sha:gitBlobSha(buffer),body_sha256:bodySha(buffer),schema_version:coordinatedOrigin.schema_version};
})();
const coordinatedAcquisition=clone(acquisitionValue);
coordinatedAcquisition.request_headers_custody=coordinatedRequestBinding;
coordinatedAcquisition.response_headers_custody=coordinatedResponseBinding;
coordinatedAcquisition.tls_peer_certificate_custody=coordinatedTlsBinding;
coordinatedAcquisition.authority_resolution_receipt_body_sha256=coordinatedAuthorityBinding.body_sha256;
coordinatedAcquisition.origin_evidence_receipt_body_sha256=coordinatedOriginBinding.body_sha256;
const coordinatedAcquisitionBinding=(()=>{
  const relative=`${coordinatedPrefix}/acquisition.json`;
  const target=path.join(coordinatedRoot,relative);
  writeJson(target,coordinatedAcquisition);
  const buffer=fs.readFileSync(target);
  return {path:relative,blob_sha:gitBlobSha(buffer),body_sha256:bodySha(buffer),schema_version:coordinatedAcquisition.schema_version};
})();
const coordinatedRegistry=clone(sampleRegistry);
coordinatedRegistry.receipts[0].source_body_custody=coordinatedSourceBinding;
coordinatedRegistry.receipts[0].authority_resolution_receipt=coordinatedAuthorityBinding;
coordinatedRegistry.receipts[0].origin_evidence_receipt=coordinatedOriginBinding;
coordinatedRegistry.receipts[0].acquisition_receipt=coordinatedAcquisitionBinding;
coordinatedRegistry.receipts[0].origin_evidence_sha256=coordinatedOriginBinding.body_sha256;
coordinatedRegistry.receipts[0].acquisition_receipt_sha256=coordinatedAcquisitionBinding.body_sha256;
const coordinatedRegistryPath=path.join(coordinatedRoot,'coordinated-registry.json');
writeJson(coordinatedRegistryPath,coordinatedRegistry);
expectFailure('coordinated-self-declared-authority-rewrite',{
  M05_INTEL_REALIZATION_STAGE_RECEIPT_REGISTRY_PATH:coordinatedRegistryPath,
  M05_INTEL_REALIZATION_RECEIPT_ROOT:coordinatedRoot
});

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody.test: OK');
