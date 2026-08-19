#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const paths={
  amendment:resolvePath(
    'M05_INTEL_REALIZATION_CONNECTION_AUTHENTICATION_CUSTODY_AMENDMENT_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.json'
  ),
  requestEnvelope:resolvePath(
    'M05_INTEL_REALIZATION_REQUEST_ENVELOPE_CUSTODY_AMENDMENT_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.json'
  ),
  requestEnvelopeValidator:resolvePath(
    'M05_INTEL_REALIZATION_REQUEST_ENVELOPE_CUSTODY_VALIDATOR_PATH',
    'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.mjs'
  ),
  requestEnvelopeTest:resolvePath(
    'M05_INTEL_REALIZATION_REQUEST_ENVELOPE_CUSTODY_TEST_PATH',
    'test/m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.test.js'
  ),
  requestEnvelopeWorkflow:resolvePath(
    'M05_INTEL_REALIZATION_REQUEST_ENVELOPE_CUSTODY_WORKFLOW_PATH',
    '.github/workflows/m05-intel-realization-request-envelope-custody-amendment.yml'
  )
};

const EXPECTED={
  amendmentBlob:'3dc1b9dd8510ad5903f7a1e39abfe051dd36831a',
  amendmentSemantic:'50a923f64324ddc23cf99d0c98dfec1b3707cd2db701b49c82f45faeafa4dda7',
  requestEnvelopeBlob:'30143e5db4f05a599e9ce6b35d832aaa5bb4e5c2',
  requestEnvelopeSemantic:'4a9dc47f54711fe64b5c58f54961a0433252a851f17d4d4c2f4813f0da09b77b',
  requestEnvelopeValidatorBlob:'ac7ab672625b8e048faa05150a4cadf05c04ace5',
  requestEnvelopeTestBlob:'5234572f72892f0dd04b922050d271085f8e2676',
  requestEnvelopeWorkflowBlob:'ebcd971653086e86313dcb6d5bacbee758d833de'
};

const readRaw=(target)=>fs.readFileSync(target);
const gitBlobSha=(buffer)=>crypto
  .createHash('sha1')
  .update(Buffer.from(`blob ${buffer.length}\0`,'utf8'))
  .update(buffer)
  .digest('hex');
const semanticHash=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clone=(value)=>JSON.parse(JSON.stringify(value));
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const fail=(message)=>{throw new Error(message)};

const raw=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,readRaw(target)]));
for(const [key,expected] of Object.entries({
  amendment:EXPECTED.amendmentBlob,
  requestEnvelope:EXPECTED.requestEnvelopeBlob,
  requestEnvelopeValidator:EXPECTED.requestEnvelopeValidatorBlob,
  requestEnvelopeTest:EXPECTED.requestEnvelopeTestBlob,
  requestEnvelopeWorkflow:EXPECTED.requestEnvelopeWorkflowBlob
})){
  if(gitBlobSha(raw[key])!==expected)fail(`${key} Git object drift`);
}

const amendment=JSON.parse(raw.amendment.toString('utf8'));
const requestEnvelope=JSON.parse(raw.requestEnvelope.toString('utf8'));
const amendmentSnapshot=JSON.stringify(amendment);
const predecessorSnapshot=JSON.stringify(requestEnvelope);

if(
  amendment.schema_version!=='m05-answerable-power-s03-l7-intel-realization-connection-authentication-custody-amendment@1'||
  amendment.object_class!=='bounded_admission_connection_authentication_custody_amendment'||
  amendment.program_id!=='M-05'||
  amendment.sprint_id!=='M05-SPRINT-03'||
  amendment.leg_id!=='S03-L7'||
  amendment.issue!==345||
  amendment.as_of!=='2026-08-19'||
  amendment.status!=='intel_realization_connection_authentication_custody_amendment_frozen'
)fail('amendment identity drift');

const expectedBase={
  branch:'main',
  sha:'5fe487cf10790abcb031213cd3c6d919c12d8dfd',
  tree_sha:'c6192b3b1b81dbb41b5e01512edd8e8eaa7c58e6',
  latest_intel_predecessor_pull_request:2191,
  latest_intel_predecessor_merge_commit:'c46e79492ba6642a288f472eb2b0fec865c97d14'
};
if(!same(amendment.canonical_base,expectedBase))fail('canonical base drift');

const expectedBindings={
  request_envelope_contract:{
    path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.json',
    blob_sha:EXPECTED.requestEnvelopeBlob,
    semantic_sha256:EXPECTED.requestEnvelopeSemantic,
    schema_version:'m05-answerable-power-s03-l7-intel-realization-request-envelope-custody-amendment@1',
    pull_request:2191,
    head_commit:'544ae52b42471b79517674b086c3ca610c83efc7',
    merge_commit:'c46e79492ba6642a288f472eb2b0fec865c97d14'
  },
  request_envelope_validator:{
    path:'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.mjs',
    blob_sha:EXPECTED.requestEnvelopeValidatorBlob,
    control_class:'independent_request_envelope_git_blob_and_semantic_checksum_validator',
    pull_request:2191,
    head_commit:'544ae52b42471b79517674b086c3ca610c83efc7',
    merge_commit:'c46e79492ba6642a288f472eb2b0fec865c97d14'
  },
  request_envelope_adversarial_test:{
    path:'test/m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.test.js',
    blob_sha:EXPECTED.requestEnvelopeTestBlob,
    control_class:'request_envelope_adversarial_mutation_suite',
    pull_request:2191,
    head_commit:'544ae52b42471b79517674b086c3ca610c83efc7',
    merge_commit:'c46e79492ba6642a288f472eb2b0fec865c97d14'
  },
  request_envelope_workflow:{
    path:'.github/workflows/m05-intel-realization-request-envelope-custody-amendment.yml',
    blob_sha:EXPECTED.requestEnvelopeWorkflowBlob,
    control_class:'read_only_request_envelope_qualification_workflow',
    pull_request:2191,
    head_commit:'544ae52b42471b79517674b086c3ca610c83efc7',
    merge_commit:'c46e79492ba6642a288f472eb2b0fec865c97d14'
  }
};
if(!same(amendment.bindings,expectedBindings))fail('predecessor binding drift');

if(
  requestEnvelope.schema_version!=='m05-answerable-power-s03-l7-intel-realization-request-envelope-custody-amendment@1'||
  requestEnvelope.status!=='intel_realization_request_envelope_custody_amendment_frozen'
)fail('request-envelope predecessor identity drift');
const requestEnvelopeCopy=clone(requestEnvelope);
const declaredRequestEnvelopeHash=requestEnvelopeCopy.contract_sha256;
delete requestEnvelopeCopy.contract_sha256;
if(
  declaredRequestEnvelopeHash!==EXPECTED.requestEnvelopeSemantic||
  semanticHash(requestEnvelopeCopy)!==EXPECTED.requestEnvelopeSemantic
)fail('request-envelope predecessor semantic drift');
for(const token of [EXPECTED.requestEnvelopeBlob,EXPECTED.requestEnvelopeSemantic]){
  if(!raw.requestEnvelopeValidator.toString('utf8').includes(token))fail(`request-envelope validator pin drift: ${token}`);
}

const expectedGap={
  gap_class:'exact_request_envelope_without_authenticated_network_peer_custody',
  exact_request_target_and_headers_preserved:true,
  dns_resolution_receipt_required:false,
  network_endpoint_receipt_required:false,
  proxy_chain_receipt_required:false,
  tls_peer_authentication_receipt_required:false,
  http2_or_http3_pseudo_header_reconciliation_required:false,
  connection_reuse_and_coalescing_receipt_required:false,
  redirect_hops_each_require_independent_connection_authentication:false,
  hostname_or_url_alone_authenticates_official_peer:false
};
if(!same(amendment.predecessor_gap,expectedGap))fail('predecessor gap drift');

const stages=['transaction','federal_cash_custody','public_account_booking','distribution'];
if(!same(amendment.stage_order,stages))fail('stage order drift');
const requiredStageFields=["connection_authentication_receipt_id","connection_authentication_observed_at_utc","dns_resolution_receipt_sha256","dns_resolution_custody_locator","network_endpoint_receipt_sha256","network_endpoint_custody_locator","proxy_chain_receipt_sha256","proxy_chain_custody_locator","tls_peer_receipt_sha256","tls_peer_custody_locator","application_protocol_receipt_sha256","application_protocol_custody_locator","connection_reuse_state","redirect_hop_connection_receipts","source_origin_authority_reconciliation","connection_authentication_receipt_sha256","connection_authentication_custody_locator","repository_blob_sha_if_used"];
for(const stageId of stages){
  const stage=amendment.effective_stage_connection_authentication?.[stageId];
  if(!stage)fail(`missing stage ${stageId}`);
  if(stage.requires_request_envelope_stage!==stageId)fail(`${stageId} predecessor-stage binding drift`);
  if(!same(stage.required_fields,requiredStageFields))fail(`${stageId} required fields drift`);
  if(stage.authenticated_network_peer_required!==true)fail(`${stageId} peer authentication weakened`);
  if(stage.request_envelope_must_reconcile_to_negotiated_protocol!==true)fail(`${stageId} request/protocol reconciliation weakened`);
  if(stage.redirect_hops_each_require_independent_receipt!==true)fail(`${stageId} redirect authentication weakened`);
  if(stage.connection_reuse_requires_authenticated_origin_mapping!==true)fail(`${stageId} connection reuse boundary weakened`);
  if(stage.hostname_url_or_ip_alone_qualifies!==false)fail(`${stageId} locator-only authentication enabled`);
  if(stage.missing_proxy_disclosure_qualifies!==false)fail(`${stageId} undisclosed proxy enabled`);
}

const rules=amendment.connection_authentication_rules||{};
if(rules.hash_algorithm!=='sha256'||rules.hash_encoding!=='lowercase_hex'||rules.hash_length!==64)fail('hash rules drift');
if(!same(rules.dns_receipt_required_fields,["query_name","query_type","query_class","resolver_identity","resolver_transport","response_rcode","cname_chain","answer_rrsets","dnssec_state","observed_at_utc","expires_at_utc","wire_response_sha256","wire_response_length_bytes","wire_response_custody_locator","canonical_response_sha256","canonical_response_custody_locator"]))fail('DNS receipt fields drift');
if(!same(rules.allowed_resolver_transports,['udp','tcp','dns_over_tls','dns_over_https','dns_over_quic','source_native_resolution_system']))fail('resolver transport denominator drift');
if(!same(rules.allowed_dnssec_states,['validated','insecure_with_authenticated_tls','indeterminate_with_authenticated_tls_and_explicit_reason','not_applicable_source_native_system']))fail('DNSSEC state denominator drift');
if(rules.dns_wire_response_and_canonical_projection_both_required!==true||rules.dns_canonicalization_version!=='dns_rrset_canonical_json_v1')fail('DNS representation drift');
if(!same(rules.dns_canonicalization_rules,{"encoding":"utf8","serialization":"compact_json","owner_names":"lowercase_fqdn_with_terminal_dot","rrset_order":"owner_type_class_then_canonical_rdata","rdata_representation":"type_specific_canonical_text","ttl_preserved_separately":true,"duplicate_rrs_preserved":true}))fail('DNS canonicalization drift');
if(!same(rules.network_endpoint_receipt_required_fields,["address_family","transport_protocol","remote_ip","remote_port","connection_started_at_utc","connection_established_at_utc","connection_closed_at_utc","socket_endpoint_observation_sha256","socket_endpoint_custody_locator"]))fail('network endpoint fields drift');
if(!same(rules.allowed_transport_protocols,['tcp','quic','source_native_transport']))fail('transport denominator drift');
if(!same(rules.proxy_receipt_required_fields,["proxy_mode","proxy_chain","target_authority","connect_or_tunnel_state","proxy_authentication_scope","proxy_chain_sha256","proxy_chain_custody_locator"]))fail('proxy receipt fields drift');
if(!same(rules.allowed_proxy_modes,['direct','http_forward_proxy','http_connect_tunnel','socks5','service_mesh_or_gateway','source_native_intermediary']))fail('proxy mode denominator drift');
if(rules.proxy_chain_must_preserve_every_intermediary!==true||rules.proxy_authentication_must_not_be_misclassified_as_origin_authentication!==true)fail('proxy boundary weakened');
if(!same(rules.tls_peer_receipt_required_fields,["server_name_indication","alpn_offered","alpn_negotiated","tls_version","cipher_suite","key_exchange_group","session_resumption_state","peer_certificate_chain","leaf_certificate_der_sha256","leaf_spki_sha256","subject_alternative_names","hostname_verification_input","hostname_verification_result","trust_store_identifier","trust_store_sha256","validation_policy_identifier","certificate_chain_validation_result","certificate_not_before_utc","certificate_not_after_utc","revocation_evidence_state","certificate_transparency_evidence_state","tls_transcript_sha256","tls_transcript_custody_locator"]))fail('TLS peer receipt fields drift');
if(!same(rules.certificate_chain_entry_required_fields,['position','der_sha256','der_length_bytes','der_custody_locator','subject','issuer','serial_number','not_before_utc','not_after_utc']))fail('certificate entry fields drift');
for(const key of ['hostname_verification_required','trust_store_and_validation_policy_custody_required','tls_transcript_or_source_native_peer_authentication_receipt_required']){
  if(rules[key]!==true)fail(`${key} weakened`);
}
for(const key of ['certificate_chain_without_validation_policy_qualifies','certificate_name_without_chain_validation_qualifies']){
  if(rules[key]!==false)fail(`${key} weakened`);
}
if(!same(rules.application_protocol_receipt_required_fields,["negotiated_http_version","http1_host_header_if_used","http2_or_http3_pseudo_headers_if_used","pseudo_header_projection_sha256","request_envelope_reconciliation_result","connection_coalescing_state","authenticated_origin_set","connection_reuse_predecessor_receipt_id","application_protocol_receipt_sha256","application_protocol_custody_locator"]))fail('application protocol fields drift');
if(!same(rules.http1_reconciliation_rules,{"host_header_must_equal_declared_authority":true,"request_target_form_must_equal_declared_request_target_form":true,"absolute_form_proxy_target_must_be_preserved":true}))fail('HTTP/1 reconciliation drift');
if(!same(rules.http2_http3_pseudo_header_rules,{"required_pseudo_headers":[":method",":scheme",":authority",":path"],"method_must_equal_declared_request_method":true,"scheme_must_equal_declared_request_scheme":true,"authority_must_equal_declared_request_authority":true,"path_must_equal_declared_path_and_query":true,"pseudo_header_order_and_values_must_be_preserved":true,"ordinary_headers_must_not_duplicate_pseudo_header_semantics":true}))fail('HTTP/2 or HTTP/3 pseudo-header drift');
if(!same(rules.allowed_connection_reuse_states,['new_connection','reused_same_origin','coalesced_authenticated_origins','source_native_session']))fail('connection reuse denominator drift');
for(const key of ['connection_coalescing_requires_certificate_and_origin_set_reconciliation','reused_connection_requires_predecessor_receipt_identifier']){
  if(rules[key]!==true)fail(`${key} weakened`);
}
if(!same(rules.redirect_hop_required_fields,['hop_index','request_envelope_receipt_id','connection_authentication_receipt_id','requested_url','resolved_url','response_status','location','observed_at_utc']))fail('redirect hop fields drift');
if(rules.redirect_hop_may_inherit_prior_peer_authentication!==false)fail('redirect inheritance enabled');
if(rules.source_origin_authority_must_reconcile_to_authenticated_peer_or_official_publication_chain!==true)fail('source authority reconciliation weakened');
for(const key of ['hostname_alone_authenticates_peer','ip_address_alone_authenticates_peer','dns_answer_alone_authenticates_peer','matching_body_hash_alone_authenticates_peer']){
  if(rules[key]!==false)fail(`${key} weakened`);
}

if(!Array.isArray(amendment.observed_receipts)||amendment.observed_receipts.length!==0)fail('unadjudicated receipt injected');
const expectedObserved={
  transaction_admissible:false,
  federal_cash_custody_admissible:false,
  public_account_booking_admissible:false,
  distribution_admissible:false,
  answer_change_authorized:false
};
if(!same(amendment.observed_state,expectedObserved))fail('observed state drift');
for(const [key,value] of Object.entries(amendment.guardrails||{})){
  if(value!==false)fail(`guardrail weakened: ${key}`);
}

const expectedResult={
  amended_stages:4,
  stages_requiring_dns_endpoint_proxy_tls_and_protocol_custody:4,
  stages_requiring_redirect_hop_authentication:4,
  observed_receipts:0,
  transaction_admissible:false,
  federal_cash_custody_admissible:false,
  public_account_booking_admissible:false,
  distribution_admissible:false,
  candidate_evidence_records:5,
  repository_promotions:5,
  advanced_answer_dimensions:1,
  effective_answers:0,
  qualifying_jurisdictions:0,
  answer_effectiveness:false,
  cross_domain_regression_completed:false,
  graph_effect:'none',
  issue_345_may_close:false
};
if(!same(amendment.expected_result,expectedResult))fail('expected result drift');
for(const [key,value] of Object.entries(amendment.boundaries||{})){
  if(key==='graph_effect'){
    if(value!=='none')fail('graph boundary drift');
  }else if(value!==false){
    fail(`unsafe terminal boundary: ${key}`);
  }
}

const amendmentCopy=clone(amendment);
const declaredAmendmentHash=amendmentCopy.connection_authentication_amendment_sha256;
delete amendmentCopy.connection_authentication_amendment_sha256;
if(
  declaredAmendmentHash!==EXPECTED.amendmentSemantic||
  semanticHash(amendmentCopy)!==EXPECTED.amendmentSemantic
)fail('amendment semantic checksum drift');

if(JSON.stringify(amendment)!==amendmentSnapshot)fail('validator mutated amendment');
if(JSON.stringify(requestEnvelope)!==predecessorSnapshot)fail('validator mutated predecessor');

console.log(JSON.stringify({
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
},null,2));
