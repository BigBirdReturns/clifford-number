#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const validator=path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.mjs');
const paths={
  amendment:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.json'),
  requestEnvelope:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.json'),
  requestEnvelopeValidator:path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.mjs'),
  requestEnvelopeTest:path.join(root,'test/m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.test.js'),
  requestEnvelopeWorkflow:path.join(root,'.github/workflows/m05-intel-realization-request-envelope-custody-amendment.yml')
};
const source=Object.fromEntries(Object.entries(paths).map(([key,target])=>[
  key,
  fs.readFileSync(target,key==='amendment'||key==='requestEnvelope'?'utf8':undefined)
]));
const amendment=JSON.parse(source.amendment);
const clone=(value)=>JSON.parse(JSON.stringify(value));
const semanticHash=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-intel-connection-auth-'));
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
const expectAmendmentFailure=(label,mutate)=>{
  const changed=clone(amendment);
  mutate(changed);
  expectFailure(
    label,
    'M05_INTEL_REALIZATION_CONNECTION_AUTHENTICATION_CUSTODY_AMENDMENT_PATH',
    writeRaw(label,`${JSON.stringify(changed,null,2)}\n`)
  );
};

const baseline=runValidator();
assert.equal(baseline.status,0,baseline.stderr||baseline.stdout);
assert.deepEqual(JSON.parse(baseline.stdout),{
  validator:'m05-intel-realization-connection-authentication-custody-amendment',
  amended_stages:4,
  stages_requiring_dns_endpoint_proxy_tls_and_protocol_custody:4,
  stages_requiring_redirect_hop_authentication:4,
  observed_receipts:0,
  transaction_admissible:false,
  federal_cash_custody_admissible:false,
  public_account_booking_admissible:false,
  distribution_admissible:false,
  issue_345_may_close:false
});

expectAmendmentFailure('schema-drift',(row)=>{row.schema_version='broken@1'});
expectAmendmentFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectAmendmentFailure('predecessor-binding-substitution',(row)=>{row.bindings.request_envelope_contract.blob_sha='0'.repeat(40)});
expectAmendmentFailure('predecessor-gap-erasure',(row)=>{row.predecessor_gap.dns_resolution_receipt_required=true});
expectAmendmentFailure('stage-deletion',(row)=>{delete row.effective_stage_connection_authentication.distribution});
expectAmendmentFailure('stage-field-deletion',(row)=>{
  row.effective_stage_connection_authentication.public_account_booking.required_fields=
    row.effective_stage_connection_authentication.public_account_booking.required_fields.filter(
      (field)=>field!=='tls_peer_receipt_sha256'
    );
});
expectAmendmentFailure('dns-wire-custody-deletion',(row)=>{
  row.connection_authentication_rules.dns_receipt_required_fields=
    row.connection_authentication_rules.dns_receipt_required_fields.filter(
      (field)=>field!=='wire_response_custody_locator'
    );
});
expectAmendmentFailure('dns-canonicalization-weakening',(row)=>{
  row.connection_authentication_rules.dns_canonicalization_rules.duplicate_rrs_preserved=false;
});
expectAmendmentFailure('endpoint-identity-deletion',(row)=>{
  row.connection_authentication_rules.network_endpoint_receipt_required_fields=
    row.connection_authentication_rules.network_endpoint_receipt_required_fields.filter(
      (field)=>field!=='remote_ip'
    );
});
expectAmendmentFailure('proxy-omission',(row)=>{
  row.effective_stage_connection_authentication.transaction.missing_proxy_disclosure_qualifies=true;
});
expectAmendmentFailure('proxy-origin-confusion',(row)=>{
  row.connection_authentication_rules.proxy_authentication_must_not_be_misclassified_as_origin_authentication=false;
});
expectAmendmentFailure('sni-deletion',(row)=>{
  row.connection_authentication_rules.tls_peer_receipt_required_fields=
    row.connection_authentication_rules.tls_peer_receipt_required_fields.filter(
      (field)=>field!=='server_name_indication'
    );
});
expectAmendmentFailure('trust-policy-weakening',(row)=>{
  row.connection_authentication_rules.trust_store_and_validation_policy_custody_required=false;
});
expectAmendmentFailure('certificate-presence-overclaim',(row)=>{
  row.connection_authentication_rules.certificate_name_without_chain_validation_qualifies=true;
});
expectAmendmentFailure('pseudo-header-method-weakening',(row)=>{
  row.connection_authentication_rules.http2_http3_pseudo_header_rules.method_must_equal_declared_request_method=false;
});
expectAmendmentFailure('pseudo-header-authority-weakening',(row)=>{
  row.connection_authentication_rules.http2_http3_pseudo_header_rules.authority_must_equal_declared_request_authority=false;
});
expectAmendmentFailure('connection-coalescing-weakening',(row)=>{
  row.connection_authentication_rules.connection_coalescing_requires_certificate_and_origin_set_reconciliation=false;
});
expectAmendmentFailure('connection-reuse-predecessor-deletion',(row)=>{
  row.connection_authentication_rules.reused_connection_requires_predecessor_receipt_identifier=false;
});
expectAmendmentFailure('redirect-auth-inheritance',(row)=>{
  row.connection_authentication_rules.redirect_hop_may_inherit_prior_peer_authentication=true;
});
expectAmendmentFailure('hostname-authentication-overclaim',(row)=>{
  row.connection_authentication_rules.hostname_alone_authenticates_peer=true;
});
expectAmendmentFailure('receipt-injection',(row)=>{row.observed_receipts.push({stage:'transaction'})});
expectAmendmentFailure('answer-overclaim',(row)=>{row.observed_state.answer_change_authorized=true});
expectAmendmentFailure('guardrail-weakening',(row)=>{row.guardrails.request_envelope_is_network_peer_authentication=true});
expectAmendmentFailure('issue-closure',(row)=>{row.boundaries.issue_345_may_close=true});
expectAmendmentFailure('checksum-rewrite',(row)=>{row.connection_authentication_amendment_sha256='0'.repeat(64)});
expectAmendmentFailure('coordinated-content-checksum-rewrite',(row)=>{
  row.connection_authentication_rules.hostname_alone_authenticates_peer=true;
  const copy=clone(row);
  delete copy.connection_authentication_amendment_sha256;
  row.connection_authentication_amendment_sha256=semanticHash(copy);
});

const semanticEquivalentAmendment=`${JSON.stringify(amendment)}\n`;
assert.deepEqual(JSON.parse(semanticEquivalentAmendment),amendment);
expectFailure(
  'semantic-equivalent-amendment-byte-rewrite',
  'M05_INTEL_REALIZATION_CONNECTION_AUTHENTICATION_CUSTODY_AMENDMENT_PATH',
  writeRaw('semantic-equivalent-amendment-byte-rewrite',semanticEquivalentAmendment)
);

expectFailure(
  'request-envelope-byte-rewrite',
  'M05_INTEL_REALIZATION_REQUEST_ENVELOPE_CUSTODY_AMENDMENT_PATH',
  writeRaw('request-envelope-byte-rewrite',`${JSON.stringify(JSON.parse(source.requestEnvelope))}\n`)
);
expectFailure(
  'request-envelope-validator-byte-rewrite',
  'M05_INTEL_REALIZATION_REQUEST_ENVELOPE_CUSTODY_VALIDATOR_PATH',
  writeRaw('request-envelope-validator-byte-rewrite',Buffer.concat([
    Buffer.isBuffer(source.requestEnvelopeValidator)?source.requestEnvelopeValidator:Buffer.from(source.requestEnvelopeValidator),
    Buffer.from('\n')
  ]),'mjs')
);
expectFailure(
  'request-envelope-test-byte-rewrite',
  'M05_INTEL_REALIZATION_REQUEST_ENVELOPE_CUSTODY_TEST_PATH',
  writeRaw('request-envelope-test-byte-rewrite',Buffer.concat([
    Buffer.isBuffer(source.requestEnvelopeTest)?source.requestEnvelopeTest:Buffer.from(source.requestEnvelopeTest),
    Buffer.from('\n')
  ]),'js')
);
expectFailure(
  'request-envelope-workflow-byte-rewrite',
  'M05_INTEL_REALIZATION_REQUEST_ENVELOPE_CUSTODY_WORKFLOW_PATH',
  writeRaw('request-envelope-workflow-byte-rewrite',Buffer.concat([
    Buffer.isBuffer(source.requestEnvelopeWorkflow)?source.requestEnvelopeWorkflow:Buffer.from(source.requestEnvelopeWorkflow),
    Buffer.from('\n')
  ]),'yml')
);

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.test: OK');
