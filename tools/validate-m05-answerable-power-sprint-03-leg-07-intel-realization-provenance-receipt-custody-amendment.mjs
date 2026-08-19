#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pick=(env,fallback)=>path.resolve(root,process.env[env]||fallback);
const paths={
  amendment:pick('M05_INTEL_REALIZATION_PROVENANCE_RECEIPT_CUSTODY_AMENDMENT_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-receipt-custody-amendment.json'),
  provenance:pick('M05_INTEL_REALIZATION_SOURCE_PROVENANCE_AMENDMENT_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-source-provenance-amendment.json'),
  provenanceValidator:pick('M05_INTEL_REALIZATION_SOURCE_PROVENANCE_VALIDATOR_PATH','tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-source-provenance-amendment.mjs'),
  custody:pick('M05_INTEL_REALIZATION_SOURCE_CUSTODY_AMENDMENT_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-source-custody-amendment.json'),
  custodyValidator:pick('M05_INTEL_REALIZATION_SOURCE_CUSTODY_VALIDATOR_PATH','tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-source-custody-amendment.mjs')
};
const expected={
  amendmentBlob:'be72fcdba15362b5007bea51c8e5b13e2d8cf724',
  amendmentSemantic:'56b0eff561abacaea30ff58c97a23094178f2812fccb75ed49ae874cb2b42646',
  provenanceBlob:'893fbd3a2d50ccfd09a4d357b070af848f66b5d8',
  provenanceSemantic:'4cdd9995e964073b830ab006b5f4a660009535b5420f0b6cb67bb4c4d94e1444',
  provenanceValidatorBlob:'4439f12738ab2ab92bc1c4a9a8068bff82284f6e',
  custodyBlob:'592a2056e9682e410938f5007b27396b85424b5b',
  custodySemantic:'50083404a4380378faa0e3bf01368b8dcf5b88992a12c368ab1ad1caf9f88adc',
  custodyValidatorBlob:'80971d4085a88f791c9fda42776e244f8179306c'
};
const fail=(message)=>{throw new Error(message)};
const clone=(value)=>JSON.parse(JSON.stringify(value));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sha1=(buffer)=>crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');
const sha256=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const raw=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,fs.readFileSync(target)]));
for(const [key,want] of Object.entries({
  amendment:expected.amendmentBlob,
  provenance:expected.provenanceBlob,
  provenanceValidator:expected.provenanceValidatorBlob,
  custody:expected.custodyBlob,
  custodyValidator:expected.custodyValidatorBlob
}))if(sha1(raw[key])!==want)fail(`${key} Git object drift`);
const amendment=JSON.parse(raw.amendment);
const provenance=JSON.parse(raw.provenance);
const custody=JSON.parse(raw.custody);
const snapshots=[JSON.stringify(amendment),JSON.stringify(provenance),JSON.stringify(custody)];
const semantic=(value,field,want)=>{const copy=clone(value);const declared=copy[field];delete copy[field];if(declared!==want||sha256(copy)!==want)fail(`${field} drift`)};
semantic(amendment,'receipt_custody_amendment_sha256',expected.amendmentSemantic);
semantic(provenance,'provenance_amendment_sha256',expected.provenanceSemantic);
semantic(custody,'amendment_sha256',expected.custodySemantic);
if(amendment.schema_version!=='m05-answerable-power-s03-l7-intel-realization-provenance-receipt-custody-amendment@1'||amendment.object_class!=='bounded_admission_provenance_receipt_body_custody_amendment'||amendment.issue!==345||amendment.status!=='intel_realization_provenance_receipt_custody_amendment_frozen')fail('identity drift');
if(!same(amendment.canonical_base,{branch:'main',sha:'9f6f700f18c4eb1fcbbbe67f41a23369c5a1db6b',tree_sha:'d205abcc8d41a41faa12b75d4570fc498e39f20e',preceding_pull_request:2184,preceding_merge_commit:'9f6f700f18c4eb1fcbbbe67f41a23369c5a1db6b'}))fail('base drift');
const bindings=amendment.bindings||{};
if(bindings.realization_source_provenance_amendment?.blob_sha!==expected.provenanceBlob||bindings.realization_source_provenance_amendment?.semantic_sha256!==expected.provenanceSemantic||bindings.realization_source_provenance_validator?.blob_sha!==expected.provenanceValidatorBlob||bindings.realization_source_custody_amendment?.blob_sha!==expected.custodyBlob||bindings.realization_source_custody_amendment?.semantic_sha256!==expected.custodySemantic||bindings.realization_source_custody_validator?.blob_sha!==expected.custodyValidatorBlob)fail('binding drift');
if(provenance.status!=='intel_realization_source_provenance_amendment_frozen'||custody.status!=='intel_realization_source_custody_amendment_frozen')fail('predecessor identity drift');
for(const token of [expected.provenanceBlob,expected.provenanceSemantic,expected.custodyBlob,expected.custodySemantic])if(!raw.provenanceValidator.toString().includes(token)&&!raw.custodyValidator.toString().includes(token))fail(`predecessor pin drift: ${token}`);
const stageIds=['transaction','federal_cash_custody','public_account_booking','distribution'];
const fields=['origin_evidence_record_identifier','origin_evidence_record_class','origin_evidence_observed_at_utc','origin_evidence_content_type','origin_evidence_body_sha256','origin_evidence_custody_mode','origin_evidence_custody_locator','origin_evidence_repository_blob_sha_if_used','acquisition_receipt_record_identifier','acquisition_receipt_schema_version','acquisition_receipt_observed_at_utc','acquisition_receipt_content_type','acquisition_receipt_body_sha256','acquisition_receipt_custody_mode','acquisition_receipt_custody_locator','acquisition_receipt_repository_blob_sha_if_used','response_header_capture_mode','response_header_canonicalization_version'];
for(const id of stageIds){
  const predecessor=provenance.effective_stage_source_provenance?.[id];
  const stage=amendment.effective_stage_provenance_receipt_custody?.[id];
  if(!predecessor?.required_fields?.includes('origin_evidence_sha256')||!predecessor.required_fields.includes('acquisition_receipt_sha256'))fail(`${id} predecessor digest drift`);
  if(predecessor.required_fields.includes('origin_evidence_body_sha256')||predecessor.required_fields.includes('acquisition_receipt_body_sha256'))fail(`${id} predecessor gap erased`);
  if(!same(stage?.additional_required_fields,fields)||stage.requires_provenance_stage!==id)fail(`${id} field drift`);
  for(const key of ['origin_evidence_body_sha256_must_equal_predecessor_origin_evidence_sha256','acquisition_receipt_body_sha256_must_equal_predecessor_acquisition_receipt_sha256','hash_and_retrievable_custody_both_required'])if(stage[key]!==true)fail(`${id} ${key} weakened`);
  for(const key of ['self_declared_hash_only_qualifies','single_self_authored_body_may_authenticate_both_origin_and_acquisition'])if(stage[key]!==false)fail(`${id} ${key} weakened`);
}
const rules=amendment.receipt_custody_rules||{};
if(rules.hash_algorithm!=='sha256'||rules.hash_encoding!=='lowercase_hex'||rules.hash_length!==64)fail('hash rules drift');
if(!same(rules.acquisition_receipt_body_required_fields,['schema_version','receipt_id','source_authority_identifier','source_record_identifier','origin_verification_mode','acquisition_method','requested_url','resolved_url','redirect_chain','response_status','response_header_capture_mode','response_header_canonicalization_version','response_headers_sha256','observed_at_utc','content_type','body_length_bytes','source_origin_body_sha256']))fail('receipt schema drift');
if(!same(rules.redirect_hop_required_fields,['request_url','response_status','location','observed_at_utc']))fail('redirect schema drift');
if(!same(rules.allowed_response_header_capture_modes,['raw_header_block_bytes','canonical_header_pairs_v1']))fail('header modes drift');
if(!same(rules.response_header_canonicalization,{version:'canonical_header_pairs_v1',representation:'ordered_array_of_lowercase_name_and_trimmed_value_pairs',lowercase_header_names:true,trim_optional_whitespace:true,preserve_network_pair_order:true,preserve_duplicate_headers_as_separate_pairs:true,join_or_collapse_duplicate_headers:false,serialize_as_utf8_json_without_insignificant_whitespace:true,hash_scope:'canonical_serialized_header_pairs',raw_header_block_hash_scope:'exact_response_header_block_bytes'}))fail('header canonicalization drift');
for(const key of ['origin_evidence_sha256_must_hash_exact_evidence_body_bytes','acquisition_receipt_sha256_must_hash_exact_receipt_body_bytes','custody_locator_must_retrieve_hashed_body','repository_blob_sha_required_when_repository_custody_used','origin_evidence_must_support_selected_verification_mode','receipt_body_must_reconcile_to_source_origin_body','each_redirect_hop_must_be_source_addressed','multiple_receipt_bodies_each_require_independent_hash'])if(rules[key]!==true)fail(`${key} weakened`);
for(const key of ['hash_without_body_or_custody_locator_is_admissible','self_declared_receipt_without_independent_custody_is_admissible','single_self_authored_body_may_prove_origin_and_acquisition','header_digest_without_capture_mode_and_version_is_admissible'])if(rules[key]!==false)fail(`${key} weakened`);
if(!Array.isArray(amendment.observed_receipts)||amendment.observed_receipts.length!==0)fail('receipt injected');
if(!same(amendment.observed_state,{transaction_admissible:false,federal_cash_custody_admissible:false,public_account_booking_admissible:false,distribution_admissible:false,answer_change_authorized:false}))fail('observed state drift');
for(const [key,value] of Object.entries(amendment.guardrails||{}))if(value!==false)fail(`${key} guardrail weakened`);
for(const [key,value] of Object.entries(amendment.boundaries||{}))if(key==='graph_effect'?value!=='none':value!==false)fail(`${key} boundary weakened`);
const result=amendment.expected_result||{};
if(result.amended_stages!==4||result.stages_requiring_origin_evidence_body_custody!==4||result.stages_requiring_acquisition_receipt_body_custody!==4||result.stages_requiring_response_header_canonicalization!==4||result.observed_receipts!==0||result.candidate_evidence_records!==5||result.repository_promotions!==5||result.advanced_answer_dimensions!==1||result.effective_answers!==0||result.qualifying_jurisdictions!==0||result.graph_effect!=='none')fail('result denominator drift');
for(const key of ['transaction_admissible','federal_cash_custody_admissible','public_account_booking_admissible','distribution_admissible','answer_effectiveness','cross_domain_regression_completed','issue_345_may_close'])if(result[key]!==false)fail(`${key} overclaim`);
if(JSON.stringify(amendment)!==snapshots[0]||JSON.stringify(provenance)!==snapshots[1]||JSON.stringify(custody)!==snapshots[2])fail('validator mutation');
console.log(JSON.stringify({validator:'m05-intel-realization-provenance-receipt-custody-amendment',amended_stages:4,stages_requiring_origin_evidence_body_custody:4,stages_requiring_acquisition_receipt_body_custody:4,stages_requiring_response_header_canonicalization:4,observed_receipts:0,transaction_admissible:false,federal_cash_custody_admissible:false,public_account_booking_admissible:false,distribution_admissible:false,issue_345_may_close:false},null,2));
