#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolve=(name,fallback)=>path.resolve(root,process.env[name]||fallback);
const paths={
  correction:resolve('M05_CROSS_DOMAIN_SOURCE_CUSTODY_CORRECTION_PATH','data/project/m05-answerable-power-sprint-03-leg-07-cross-domain-source-custody-correction.json'),
  candidates:resolve('M05_CROSS_DOMAIN_OFFICIAL_RECEIPT_CANDIDATES_PATH','data/project/m05-cross-domain-official-receipt-candidates.json'),
  helper:resolve('M05_CROSS_DOMAIN_OFFICIAL_RECEIPT_HELPER_PATH','tools/lib/m05-cross-domain-official-receipt-candidates.mjs'),
  regressionValidator:resolve('M05_SOURCE_HEALTH_REGRESSION_VALIDATOR_PATH','tools/validate-m05-source-health-evidence-state-regression.mjs'),
  regressionTest:resolve('M05_SOURCE_HEALTH_REGRESSION_TEST_PATH','test/m05-source-health-evidence-state-regression.test.js'),
  provenance:resolve('M05_INTEL_SOURCE_PROVENANCE_MINIMUM_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-source-provenance-amendment.json')
};
const expectedBlobs={
  correction:'1c826798fe2310ddc033ed2665edbd2c9673d7e0',
  candidates:'1c17549a39b826853435d3726596bf41d0fc7de9',
  helper:'e111ab2a26f0dd79d427e8ff76e7847b516c45b2',
  regressionValidator:'c874137600a40ecd160993fc4e8f530353678679',
  regressionTest:'e79fcbc05f1d047876c8898fe71cffef3a18d61e',
  provenance:'893fbd3a2d50ccfd09a4d357b070af848f66b5d8'
};
const correctionSha='47d4d0ba0fef9a5ad3c699e04981ad1566fa4668c46f90bbc9815bd1fbc264e0';
const provenanceSha='4cdd9995e964073b830ab006b5f4a660009535b5420f0b6cb67bb4c4d94e1444';
const fail=message=>{throw new Error(message)};
const check=(condition,message)=>{if(!condition)fail(message)};
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const clone=value=>JSON.parse(JSON.stringify(value));
const semantic=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const gitBlob=body=>crypto.createHash('sha1').update(Buffer.from(`blob ${body.length}\0`)).update(body).digest('hex');
const raw=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,fs.readFileSync(target)]));
for(const [key,expected] of Object.entries(expectedBlobs))check(gitBlob(raw[key])===expected,`${key} Git object drift`);
const correction=JSON.parse(raw.correction);
const candidates=JSON.parse(raw.candidates);
const provenance=JSON.parse(raw.provenance);
for(const [value,field,expected,label] of [
  [correction,'correction_sha256',correctionSha,'correction'],
  [provenance,'provenance_amendment_sha256',provenanceSha,'provenance']
]){
  const copy=clone(value),declared=copy[field];
  delete copy[field];
  check(declared===expected&&semantic(copy)===expected,`${label} checksum drift`);
}
check(correction.schema_version==='m05-answerable-power-s03-l7-cross-domain-source-custody-correction@1','correction schema drift');
check(correction.object_class==='bounded_cross_domain_locator_only_custody_correction'&&correction.issue===345&&correction.status==='cross_domain_locator_only_custody_correction_frozen','correction identity drift');
check(same(correction.canonical_base,{branch:'main',sha:'9f6f700f18c4eb1fcbbbe67f41a23369c5a1db6b',tree_sha:'d205abcc8d41a41faa12b75d4570fc498e39f20e',preceding_pull_request:2184,preceding_merge_commit:'9f6f700f18c4eb1fcbbbe67f41a23369c5a1db6b'}),'canonical base drift');
const bindings=correction.bindings;
check(bindings.official_receipt_candidate_set.blob_sha===expectedBlobs.candidates,'candidate binding drift');
check(bindings.official_receipt_candidate_helper.blob_sha===expectedBlobs.helper,'helper binding drift');
check(bindings.source_health_regression_validator.blob_sha===expectedBlobs.regressionValidator,'regression validator binding drift');
check(bindings.source_health_regression_adversarial_test.blob_sha===expectedBlobs.regressionTest,'regression test binding drift');
check(bindings.intel_source_provenance_minimum.blob_sha===expectedBlobs.provenance&&bindings.intel_source_provenance_minimum.semantic_sha256===provenanceSha,'provenance binding drift');
check(candidates.schema_version==='m05-cross-domain-official-receipt-candidates@1'&&candidates.status==='candidate_repository_receipts'&&candidates.candidate_count===3,'candidate identity drift');
for(const token of ["source_addressed_receipt===true","parsed.protocol==='https:'",'OFFICIAL_RECEIPT_HOSTS'])check(raw.helper.toString().includes(token),`helper integration drift: ${token}`);
for(const token of ['m05-cross-domain-official-receipt-candidates.json','validateOfficialReceiptCandidates'])check(raw.regressionValidator.toString().includes(token),`regression validator drift: ${token}`);
for(const token of ['missing-source-locator','foreign-source-host','promotedOfficialContract'])check(raw.regressionTest.toString().includes(token),`regression test drift: ${token}`);
const sourceFields=['source_authority','source_authority_identifier','source_record_class','source_origin_url','source_origin_observed_at_utc','source_origin_content_type','source_origin_body_sha256','origin_verification_mode','origin_evidence_sha256','acquisition_method','acquisition_receipt_sha256','source_custody_mode','source_custody_locator','source_custody_body_sha256','repository_blob_sha_if_used'];
const acquisitionFields=['requested_url','resolved_url','redirect_chain','response_status','response_headers_sha256','observed_at_utc','content_type','body_length_bytes','source_origin_body_sha256'];
const correctionSourceFields=correction.required_source_custody.required_fields_per_source;
const provenanceSourceFields=provenance.effective_stage_source_provenance.transaction.required_fields;
const correctionAcquisitionFields=correction.required_source_custody.acquisition_receipt_required_fields;
const provenanceAcquisitionFields=provenance.provenance_rules.acquisition_receipt_required_fields;
for(const [actual,expected,label] of [
  [correctionSourceFields,sourceFields,'correction source fields'],
  [provenanceSourceFields,sourceFields,'provenance source fields'],
  [correctionAcquisitionFields,acquisitionFields,'correction acquisition fields'],
  [provenanceAcquisitionFields,acquisitionFields,'provenance acquisition fields']
]){
  check(Array.isArray(actual)&&actual.length===expected.length,`${label} denominator drift`);
  for(let index=0;index<expected.length;index+=1)check(actual[index]===expected[index],`${label} drift at ${index}: ${String(actual[index])}`);
}
const rows=[['M05-RC-ADMIN-AU-ROBODEBT','APC-ADMIN-01','AU',5],['M05-RC-COERCION-NL-SYRI','APC-COERCION-01','NL',3],['M05-RC-WORK-IT-FOODINHO','APC-WORK-01','IT',4]];
let sourceCount=0;
for(let index=0;index<rows.length;index+=1){
  const [receiptId,domainId,jurisdiction,count]=rows[index];
  const row=candidates.records[index],effective=correction.effective_candidate_receipt_state[index];
  check(row.receipt_id===receiptId&&row.domain_id===domainId&&row.jurisdiction===jurisdiction&&row.sources.length===count,`${receiptId} identity or denominator drift`);
  check(row.observation.evidence.source_addressed_receipt===true&&row.observation.evidence.promotion_authority===false&&row.observation.promotes_to==='none',`${receiptId} historical boundary drift`);
  for(const source of row.sources){
    sourceCount+=1;
    check(source.url.startsWith('https://')&&source.locator.length>0,`${receiptId} locator drift`);
    for(const field of sourceFields)check(!Object.hasOwn(source,field),`${receiptId} unexpectedly contains ${field}`);
  }
  check(effective.receipt_id===receiptId&&effective.source_records===count&&effective.locator_addressed_source_records===count&&effective.exact_body_custodied_source_records===0&&effective.official_origin_authenticated_source_records===0&&effective.acquisition_receipts===0&&effective.historical_source_addressed_receipt_flag===true&&effective.effective_source_addressed_receipt===false&&effective.candidate_body_custody_complete===false&&effective.candidate_official_origin_complete===false&&effective.claim_evidence_admissible===false&&effective.answer_effective===false,`${receiptId} effective state drift`);
}
check(sourceCount===12,'source denominator drift');
const gap=correction.predecessor_gap;
check(gap.source_records===12&&gap.historical_source_addressed_receipt_flags_true===3&&gap.source_body_sha256_fields_present===0&&gap.source_origin_body_sha256_fields_present===0&&gap.acquisition_receipt_sha256_fields_present===0&&gap.source_custody_body_sha256_fields_present===0&&gap.official_origin_authentication_fields_present===0&&gap.historical_source_addressed_receipt_flag_is_effective_without_custody===false,'predecessor gap drift');
const rules=correction.required_source_custody;
check(rules.hash_algorithm==='sha256'&&rules.hash_encoding==='lowercase_hex'&&rules.hash_length===64,'hash rule drift');
for(const key of ['origin_body_hash_must_equal_custody_body_hash','each_distinct_source_body_requires_independent_hash','each_distinct_source_body_requires_independent_acquisition_receipt','source_authority_must_match_official_origin_or_publication_chain','repository_blob_requires_official_origin_receipt'])check(rules[key]===true,`requirement weakened: ${key}`);
for(const key of ['locator_only_source_may_count_as_effective_receipt','https_hostname_alone_may_count_as_official_origin','quoted_locator_alone_may_count_as_substantive_body_custody','repository_content_status_may_count_as_claim_evidence'])check(rules[key]===false,`refusal weakened: ${key}`);
check(correction.observed_receipts.length===0,'unadjudicated receipt injected');
check(correction.observed_state.locator_addressed_candidates===3&&correction.observed_state.effective_source_addressed_candidates===0&&correction.observed_state.exact_body_custodied_source_records===0&&correction.observed_state.official_origin_authenticated_source_records===0&&correction.observed_state.claim_evidence_admissible===0&&correction.observed_state.effective_answers===0&&correction.observed_state.cross_domain_regression_completed===false&&correction.observed_state.answer_change_authorized===false,'observed state drift');
check(correction.expected_result.candidate_records===3&&correction.expected_result.source_records===12&&correction.expected_result.effective_source_addressed_candidates===0&&correction.expected_result.claim_evidence_admissible===0&&correction.expected_result.effective_answers===0&&correction.expected_result.cross_domain_regression_completed===false&&correction.expected_result.issue_345_may_close===false,'expected result drift');
for(const [key,value] of Object.entries(correction.guardrails))check(value===false,`guardrail weakened: ${key}`);
for(const [key,value] of Object.entries(correction.boundaries))check(key==='graph_effect'?value==='none':value===false,`boundary weakened: ${key}`);
console.log(JSON.stringify({validator:'m05-cross-domain-source-custody-correction',candidate_records:3,source_records:12,locator_addressed_source_records:12,effective_source_addressed_candidates:0,exact_body_custodied_source_records:0,official_origin_authenticated_source_records:0,claim_evidence_admissible:0,effective_answers:0,cross_domain_regression_completed:false,issue_345_may_close:false},null,2));
