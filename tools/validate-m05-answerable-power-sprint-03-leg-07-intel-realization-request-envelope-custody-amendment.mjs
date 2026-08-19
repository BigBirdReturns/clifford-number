#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const paths={
  contract:resolvePath(
    'M05_INTEL_REALIZATION_REQUEST_ENVELOPE_CUSTODY_AMENDMENT_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.json'
  ),
  transport:resolvePath(
    'M05_INTEL_REALIZATION_TRANSPORT_BODY_REPRESENTATION_AMENDMENT_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.json'
  ),
  transportValidator:resolvePath(
    'M05_INTEL_REALIZATION_TRANSPORT_BODY_REPRESENTATION_VALIDATOR_PATH',
    'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.mjs'
  ),
  transportTest:resolvePath(
    'M05_INTEL_REALIZATION_TRANSPORT_BODY_REPRESENTATION_TEST_PATH',
    'test/m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.test.js'
  ),
  transportWorkflow:resolvePath(
    'M05_INTEL_REALIZATION_TRANSPORT_BODY_REPRESENTATION_WORKFLOW_PATH',
    '.github/workflows/m05-intel-realization-transport-body-representation-amendment.yml'
  )
};

const EXPECTED_CONTRACT_BLOB_SHA='30143e5db4f05a599e9ce6b35d832aaa5bb4e5c2';
const EXPECTED_CONTRACT_SHA256='4a9dc47f54711fe64b5c58f54961a0433252a851f17d4d4c2f4813f0da09b77b';
const EXPECTED_TRANSPORT_SHA256='f089e5d2e599832dbabb3a0cd592f09554bb4b9b435e7f862fbf8e1a0d9cfe84';
const EXPECTED_PREDECESSOR_BLOBS={
  transport:'571e665bfa47eceddf4b12efd53bebe488a61e43',
  transportValidator:'91819b0d44cd2aa070b88ddf46cccb7c285dde03',
  transportTest:'75bc7dd5fe491d954c994629bbfbd89480fcabfe',
  transportWorkflow:'b26572b1d8a4879c518db7a45c7ef133f68bbf5a'
};

const fail=(message)=>{throw new Error(message)};
const readRaw=(target)=>fs.readFileSync(target);
const gitBlobSha=(buffer)=>crypto
  .createHash('sha1')
  .update(Buffer.from(`blob ${buffer.length}\0`,'utf8'))
  .update(buffer)
  .digest('hex');
const semanticHash=(value)=>crypto
  .createHash('sha256')
  .update(JSON.stringify(value))
  .digest('hex');
const clone=(value)=>JSON.parse(JSON.stringify(value));
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const containsAll=(values,required)=>Array.isArray(values)&&required.every((value)=>values.includes(value));

const raw=Object.fromEntries(
  Object.entries(paths).map(([key,target])=>[key,readRaw(target)])
);
if(gitBlobSha(raw.contract)!==EXPECTED_CONTRACT_BLOB_SHA)fail('request-envelope contract Git object drift');
for(const [key,expected] of Object.entries(EXPECTED_PREDECESSOR_BLOBS)){
  if(gitBlobSha(raw[key])!==expected)fail(`${key} predecessor Git object drift`);
}

const contractText=raw.contract.toString('utf8');
const contract=JSON.parse(contractText);
if(contractText!==`${JSON.stringify(contract,null,2)}\n`)fail('request-envelope contract serialization drift');
const contractCopy=clone(contract);
const declaredContractHash=contractCopy.contract_sha256;
delete contractCopy.contract_sha256;
if(
  declaredContractHash!==EXPECTED_CONTRACT_SHA256||
  semanticHash(contractCopy)!==EXPECTED_CONTRACT_SHA256
)fail('request-envelope contract semantic checksum drift');

const transport=JSON.parse(raw.transport.toString('utf8'));
if(transport.schema_version!=='m05-answerable-power-s03-l7-intel-realization-transport-body-representation-amendment@1')fail('transport predecessor schema drift');
if(transport.status!=='intel_realization_transport_body_representation_amendment_frozen')fail('transport predecessor status drift');
const transportCopy=clone(transport);
const declaredTransportHash=transportCopy.transport_body_amendment_sha256;
delete transportCopy.transport_body_amendment_sha256;
if(
  declaredTransportHash!==EXPECTED_TRANSPORT_SHA256||
  semanticHash(transportCopy)!==EXPECTED_TRANSPORT_SHA256
)fail('transport predecessor semantic checksum drift');

if(
  contract.schema_version!=='m05-answerable-power-s03-l7-intel-realization-request-envelope-custody-amendment@1'||
  contract.object_class!=='bounded_admission_request_envelope_custody_amendment'||
  contract.program_id!=='M-05'||
  contract.sprint_id!=='M05-SPRINT-03'||
  contract.leg_id!=='S03-L7'||
  contract.issue!==345||
  contract.as_of!=='2026-08-18'||
  contract.status!=='intel_realization_request_envelope_custody_amendment_frozen'
)fail('request-envelope identity drift');

if(!same(contract.canonical_base,{
  branch:'main',
  sha:'88b4d9cefa8b5fc22f646b13bba1e7956bb23f7a',
  tree_sha:'cc6e754963b99a86b94e67a3f9fbf54dc26da44d',
  preceding_pull_request:2188,
  preceding_merge_commit:'7e4228dd97168bbd2d3df14261bf85a54e758034'
}))fail('request-envelope canonical base drift');

const bindings=contract.bindings||{};
if(
  bindings.transport_body_representation_amendment?.path!=='data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.json'||
  bindings.transport_body_representation_amendment?.blob_sha!==EXPECTED_PREDECESSOR_BLOBS.transport||
  bindings.transport_body_representation_amendment?.semantic_sha256!==EXPECTED_TRANSPORT_SHA256||
  bindings.transport_body_representation_amendment?.schema_version!=='m05-answerable-power-s03-l7-intel-realization-transport-body-representation-amendment@1'||
  bindings.transport_body_representation_validator?.path!=='tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.mjs'||
  bindings.transport_body_representation_validator?.blob_sha!==EXPECTED_PREDECESSOR_BLOBS.transportValidator||
  bindings.transport_body_representation_test?.path!=='test/m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-representation-amendment.test.js'||
  bindings.transport_body_representation_test?.blob_sha!==EXPECTED_PREDECESSOR_BLOBS.transportTest||
  bindings.transport_body_representation_workflow?.path!=='.github/workflows/m05-intel-realization-transport-body-representation-amendment.yml'||
  bindings.transport_body_representation_workflow?.blob_sha!==EXPECTED_PREDECESSOR_BLOBS.transportWorkflow
)fail('request-envelope predecessor binding drift');

const stages=['transaction','federal_cash_custody','public_account_booking','distribution'];
if(!same(contract.stage_order,stages))fail('request-envelope stage order drift');
if(!same(contract.request_envelope_profile?.applies_to_stages,stages))fail('request-envelope stage application drift');
const requiredFields=[
  'request_envelope_body_sha256',
  'request_envelope_custody_locator',
  'request_target_body_sha256',
  'request_target_custody_locator',
  'request_headers_body_sha256',
  'request_headers_custody_locator',
  'range_reassembly_manifest_body_sha256_if_used',
  'range_reassembly_manifest_custody_locator_if_used',
  'vary_key_reconciliation_body_sha256',
  'vary_key_reconciliation_custody_locator',
  'effective_request_envelope_sha256'
];
if(!containsAll(contract.request_envelope_profile?.required_fields,requiredFields))fail('request-envelope body custody fields incomplete');
for(const key of [
  'request_envelope_body_sha256_must_hash_exact_envelope_bytes',
  'request_target_and_header_objects_must_be_retrievable',
  'network_emitted_request_headers_must_be_complete',
  'vary_selected_request_values_must_be_bound',
  'anonymous_public_retrieval_required'
]){
  if(contract.request_envelope_profile?.[key]!==true)fail(`${key} weakened`);
}
for(const key of [
  'same_url_without_request_envelope_qualifies',
  'request_header_digest_without_header_body_qualifies',
  'range_without_complete_reassembly_receipt_qualifies',
  'vary_digest_without_reconciliation_body_qualifies'
]){
  if(contract.request_envelope_profile?.[key]!==false)fail(`${key} weakened`);
}

const rules=contract.request_envelope_rules||{};
if(
  rules.hash_algorithm!=='sha256'||
  rules.hash_encoding!=='lowercase_hex'||
  rules.hash_length!==64||
  !same(rules.allowed_request_methods,['GET','POST'])||
  !same(rules.allowed_request_target_forms,['origin_form','absolute_form'])
)fail('request-envelope rule denominator drift');
if(
  rules.request_target?.hash_domain!=='exact_network_request_target_octets'||
  rules.request_target?.preserve_percent_encoding!==true||
  rules.request_target?.preserve_query_pair_order!==true||
  rules.request_target?.normalization_before_hash_admissible!==false||
  rules.request_target?.body_and_custody_locator_required!==true
)fail('request-target custody drift');
if(
  rules.request_headers?.canonicalization_version!=='canonical_request_header_pairs_v1'||
  rules.request_headers?.capture_after_client_library_header_synthesis!==true||
  rules.request_headers?.network_pair_order_preserved!==true||
  rules.request_headers?.duplicate_headers_preserved_as_separate_pairs!==true||
  rules.request_headers?.duplicate_headers_joined_or_collapsed!==false||
  rules.request_headers?.body_and_custody_locator_required!==true||
  rules.request_headers?.hidden_client_defaults_admissible!==false
)fail('request-header custody drift');
if(
  rules.request_body?.get_body_must_be_absent!==true||
  rules.request_body?.post_body_requires_exact_hash_length_and_custody!==true
)fail('request-body custody drift');
if(
  !same(rules.privacy_and_scope?.allowed_credential_scope_classes,['none'])||
  !same(rules.privacy_and_scope?.allowed_cookie_scope_classes,['none'])||
  rules.privacy_and_scope?.authorization_material_retained_must_be_false!==true||
  rules.privacy_and_scope?.cookie_values_retained_must_be_false!==true||
  rules.privacy_and_scope?.credential_or_cookie_dependent_response_is_publicly_reproducible!==false
)fail('request privacy or scope drift');
if(
  rules.conditional_and_range?.not_modified_without_source_body_cannot_qualify!==true||
  rules.conditional_and_range?.range_response_requires_complete_ordered_reassembly_manifest!==true||
  rules.conditional_and_range?.reassembly_manifest_body_and_custody_locator_required!==true
)fail('conditional or range custody drift');
if(
  rules.vary?.vary_star_disallows_public_reproducibility!==true||
  rules.vary?.each_vary_header_must_resolve_to_exact_request_values!==true||
  rules.vary?.reconciliation_binds_header_values_and_request_body_digest!==true||
  rules.vary?.reconciliation_body_and_custody_locator_required!==true
)fail('Vary reconciliation drift');

if(!Array.isArray(contract.observed_receipts)||contract.observed_receipts.length!==0)fail('unadjudicated request-envelope receipt injected');
for(const [key,value] of Object.entries(contract.observed_state||{})){
  if(value!==false)fail(`observed-state overclaim: ${key}`);
}
for(const [key,value] of Object.entries(contract.guardrails||{})){
  if(value!==false)fail(`request-envelope guardrail weakened: ${key}`);
}
for(const [key,value] of Object.entries(contract.boundaries||{})){
  if(key==='graph_effect'){
    if(value!=='none')fail('request-envelope graph boundary drift');
  }else if(value!==false){
    fail(`unsafe request-envelope boundary: ${key}`);
  }
}
const result=contract.expected_result||{};
if(
  result.amended_stages!==4||
  result.stages_requiring_exact_request_envelope!==4||
  result.stages_requiring_network_header_custody!==4||
  result.stages_requiring_vary_reconciliation!==4||
  result.observed_receipts!==0||
  result.candidate_evidence_records!==5||
  result.repository_promotions!==5||
  result.advanced_answer_dimensions!==1||
  result.effective_answers!==0||
  result.qualifying_jurisdictions!==0||
  result.graph_effect!=='none'
)fail('request-envelope result denominator drift');
for(const key of [
  'transaction_admissible',
  'federal_cash_custody_admissible',
  'public_account_booking_admissible',
  'distribution_admissible',
  'answer_effectiveness',
  'cross_domain_regression_completed',
  'issue_345_may_close'
]){
  if(result[key]!==false)fail(`request-envelope overclaim: ${key}`);
}

console.log(JSON.stringify({
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
},null,2));
