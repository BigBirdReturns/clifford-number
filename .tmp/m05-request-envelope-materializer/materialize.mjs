#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const BASE_COMMIT='7e4228dd97168bbd2d3df14261bf85a54e758034';
const BASE_TREE='135bd1e3ea54fb5f269c748e0227677cf6a3be96';
const PRODUCT_BRANCH='agent/m05-s03-l7-intel-realization-request-envelope-custody-v1';
const PRE={
  amendment:{
    path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-hash-domain-amendment.json',
    blob:'571e665bfa47eceddf4b12efd53bebe488a61e43',
    semantic:'f089e5d2e599832dbabb3a0cd592f09554bb4b9b435e7f862fbf8e1a0d9cfe84',
    pull_request:2188,
    merge_commit:'7e4228dd97168bbd2d3df14261bf85a54e758034'
  },
  validator:{
    path:'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-hash-domain-amendment.mjs',
    blob:'91819b0d44cd2aa070b88ddf46cccb7c285dde03'
  },
  test:{
    path:'test/m05-answerable-power-sprint-03-leg-07-intel-realization-transport-body-hash-domain-amendment.test.js',
    blob:'75bc7dd5fe491d954c994629bbfbd89480fcabfe'
  },
  workflow:{
    path:'.github/workflows/m05-intel-realization-transport-body-hash-domain-amendment.yml',
    blob:'b26572b1d8a4879c518db7a45c7ef133f68bbf5a'
  }
};
const OUT={
  amendment:'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.json',
  validator:'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.mjs',
  test:'test/m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.test.js',
  workflow:'.github/workflows/m05-intel-realization-request-envelope-custody-amendment.yml'
};
const STAGES=['transaction','federal_cash_custody','public_account_booking','distribution'];
const FIELDS=[
  'request_envelope_record_identifier','request_envelope_schema_version','request_envelope_body_sha256',
  'request_method','request_target_form','request_target_sha256','request_target_length_bytes',
  'request_header_capture_mode','request_header_canonicalization_version','request_headers_sha256','request_headers_length_bytes',
  'request_body_present','request_body_hash_domain','request_body_sha256','request_body_length_bytes',
  'request_body_custody_mode','request_body_custody_locator','credential_scope_class','cookie_scope_class',
  'authorization_header_retained','cookie_header_retained','conditional_request_state','range_request_state',
  'range_complete_reassembly_required_if_used','response_vary_header_names','response_vary_star',
  'vary_reconciliation_sha256','effective_request_envelope_sha256'
];
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const gitBlob=buffer=>crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');
const clone=value=>JSON.parse(JSON.stringify(value));
const write=(target,content)=>{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content)};
const run=(command,args,options={})=>execFileSync(command,args,{cwd:ROOT,stdio:'inherit',...options});
const capture=(command,args)=>execFileSync(command,args,{cwd:ROOT,encoding:'utf8'}).trim();

const stageMap=Object.fromEntries(STAGES.map(stage=>[stage,{
  requires_contract_stage:stage,
  required_fields:FIELDS,
  exact_request_envelope_required:true,
  request_target_and_headers_must_be_hash_addressed:true,
  content_negotiation_headers_must_be_preserved:true,
  conditional_and_range_state_must_be_preserved:true,
  credential_and_cookie_scope_must_be_publicly_reproducible:true,
  response_vary_must_reconcile_to_request_envelope:true,
  same_url_without_same_request_envelope_qualifies:false
}]));
const contract={
  schema_version:'m05-answerable-power-s03-l7-intel-realization-request-envelope-custody-amendment@1',
  object_class:'bounded_admission_request_envelope_custody_amendment',
  program_id:'M-05',sprint_id:'M05-SPRINT-03',leg_id:'S03-L7',issue:345,as_of:'2026-08-18',
  status:'intel_realization_request_envelope_custody_amendment_frozen',
  title:'Intel realization exact request-envelope and response-variation custody amendment',
  question:'Which exact request target, request-header, request-body, credential-scope, conditional, range, and response-Vary fields must be preserved before an officially sourced Intel realization receipt may be reproduced and admitted?',
  canonical_base:{branch:'main',sha:BASE_COMMIT,tree_sha:BASE_TREE,preceding_pull_request:2188,preceding_merge_commit:BASE_COMMIT},
  bindings:{
    transport_body_hash_domain_amendment:{path:PRE.amendment.path,blob_sha:PRE.amendment.blob,semantic_sha256:PRE.amendment.semantic,pull_request:2188,merge_commit:BASE_COMMIT},
    transport_body_hash_domain_validator:{path:PRE.validator.path,blob_sha:PRE.validator.blob,control_class:'independent_transport_body_hash_domain_git_object_and_semantic_validator',pull_request:2188,merge_commit:BASE_COMMIT},
    transport_body_hash_domain_test:{path:PRE.test.path,blob_sha:PRE.test.blob,pull_request:2188,merge_commit:BASE_COMMIT},
    transport_body_hash_domain_workflow:{path:PRE.workflow.path,blob_sha:PRE.workflow.blob,pull_request:2188,merge_commit:BASE_COMMIT}
  },
  predecessor_gap:{
    gap_class:'exact_response_body_custody_without_exact_request_selection_envelope',
    exact_transport_body_hash_domains_required:true,
    request_method_required:false,
    exact_request_target_required:false,
    request_header_body_custody_required:false,
    content_negotiation_state_required:false,
    conditional_request_state_required:false,
    range_request_state_required:false,
    credential_and_cookie_scope_required:false,
    response_vary_reconciliation_required:false,
    same_url_alone_establishes_same_representation:false
  },
  effective_stage_request_envelope_custody:stageMap,
  request_envelope_rules:{
    request_envelope_schema_version:'m05-source-request-envelope@1',
    hash_algorithm:'sha256',hash_encoding:'lowercase_hex',hash_length:64,
    request_target_hash_domain:'exact_request_target_octets_after_uri_construction_before_transport',
    allowed_request_methods:['GET','POST'],
    allowed_request_target_forms:['origin_form','absolute_form'],
    allowed_request_header_capture_modes:['raw_http1_request_header_block_bytes','canonical_request_header_pairs_v1_after_protocol_decode'],
    canonical_request_header_pairs_v1:{
      encoding:'utf8',serialization:'compact_json_array_of_ordered_name_value_pairs',
      header_name:'lowercase_ascii',header_value:'trim_optional_whitespace_preserve_internal_octets',
      duplicate_fields:'preserve_each_field_and_network_occurrence_order',
      forbidden_transformations:['join_duplicate_fields','sort_fields','drop_content_negotiation_fields','normalize_user_agent']
    },
    content_negotiation_header_names:['accept','accept-encoding','accept-language','user-agent'],
    conditional_header_names:['if-match','if-none-match','if-modified-since','if-unmodified-since','if-range'],
    range_header_name:'range',
    allowed_request_body_hash_domains:['no_request_body','exact_request_payload_octets','official_api_request_serialization_octets'],
    allowed_request_body_custody_modes:['not_applicable','source_native_request_receipt','repository_blob','dual_source_and_repository_custody'],
    allowed_credential_scope_classes:['none','public_anonymous'],
    allowed_cookie_scope_classes:['none'],
    forbidden_sensitive_header_names:['authorization','proxy-authorization','cookie','set-cookie'],
    authorization_header_must_not_be_retained:true,
    cookie_header_must_not_be_retained:true,
    request_target_must_include_exact_query_octets:true,
    redirect_followups_each_require_distinct_request_envelope:true,
    conditional_request_headers_must_be_captured_when_present:true,
    range_request_headers_must_be_captured_when_present:true,
    partial_response_requires_complete_reassembly_receipt:true,
    response_vary_header_names_required:true,
    vary_star_disallows_public_reproducibility:true,
    vary_reconciliation_required:true,
    request_envelope_hash_must_bind_all_required_fields:true,
    same_url_alone_is_same_request_envelope:false
  },
  observed_receipts:[],
  observed_state:{transaction_admissible:false,federal_cash_custody_admissible:false,public_account_booking_admissible:false,distribution_admissible:false,answer_change_authorized:false},
  guardrails:{
    same_url_is_same_representation:false,default_headers_are_reproducible_request_custody:false,
    user_agent_omission_is_harmless:false,accept_encoding_omission_is_harmless:false,
    private_credential_scope_is_publicly_reproducible:false,cookie_state_is_publicly_reproducible:false,
    partial_range_body_is_complete_official_record:false,vary_star_is_publicly_reproducible:false,
    request_envelope_amendment_is_empirical_receipt:false,request_envelope_amendment_is_answer_effectiveness:false
  },
  expected_result:{
    amended_stages:4,stages_requiring_exact_request_envelope:4,stages_requiring_network_header_custody:4,
    stages_requiring_vary_reconciliation:4,observed_receipts:0,transaction_admissible:false,
    federal_cash_custody_admissible:false,public_account_booking_admissible:false,distribution_admissible:false,
    candidate_evidence_records:5,repository_promotions:5,advanced_answer_dimensions:1,effective_answers:0,
    qualifying_jurisdictions:0,answer_effectiveness:false,cross_domain_regression_completed:false,
    graph_effect:'none',issue_345_may_close:false
  },
  boundaries:{
    changes_predecessor_bytes:false,creates_new_empirical_receipt:false,claims_intel_transaction:false,
    claims_federal_cash_receipt:false,claims_public_account_booking:false,claims_public_or_affected_party_distribution:false,
    claims_answer_effectiveness:false,claims_cross_domain_completion:false,graph_effect:'none',conclusion_generated:false,
    project_complete:false,issue_345_may_close:false
  }
};
const semanticCopy=clone(contract);
contract.request_envelope_amendment_sha256=sha256(JSON.stringify(semanticCopy));
const contractText=`${JSON.stringify(contract,null,2)}\n`;
const contractBlob=gitBlob(Buffer.from(contractText));
const contractSemantic=contract.request_envelope_amendment_sha256;

let validator=String.raw`#!/usr/bin/env node
import crypto from 'node:crypto';import fs from 'node:fs';import path from 'node:path';import{fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),rp=(e,d)=>path.resolve(root,process.env[e]||d),P={a:rp('M05_INTEL_REQUEST_ENVELOPE_AMENDMENT_PATH','__OUT_AMENDMENT__'),p:rp('M05_INTEL_TRANSPORT_BODY_AMENDMENT_PATH','__PRE_AMENDMENT__'),v:rp('M05_INTEL_TRANSPORT_BODY_VALIDATOR_PATH','__PRE_VALIDATOR__'),t:rp('M05_INTEL_TRANSPORT_BODY_TEST_PATH','__PRE_TEST__'),w:rp('M05_INTEL_TRANSPORT_BODY_WORKFLOW_PATH','__PRE_WORKFLOW__')},E={a:'__CONTRACT_BLOB__',ah:'__CONTRACT_SHA__',p:'__PRE_AMENDMENT_BLOB__',ph:'__PRE_AMENDMENT_SHA__',v:'__PRE_VALIDATOR_BLOB__',t:'__PRE_TEST_BLOB__',w:'__PRE_WORKFLOW_BLOB__'};
const raw=Object.fromEntries(Object.entries(P).map(([k,x])=>[k,fs.readFileSync(x)])),blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex'),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex'),clone=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),fail=m=>{throw Error(m)},ok=(x,m)=>{if(!x)fail(m)};
for(const[k,v]of Object.entries(E).filter(([k])=>!k.endsWith('h')))ok(blob(raw[k])===v,k+' Git object drift');
const A=JSON.parse(raw.a),R=JSON.parse(raw.p),copy=clone(A),declared=copy.request_envelope_amendment_sha256;delete copy.request_envelope_amendment_sha256;ok(declared===E.ah&&hash(copy)===E.ah,'amendment checksum drift');ok(Object.values(R).includes(E.ph),'predecessor semantic binding drift');
ok(A.schema_version==='m05-answerable-power-s03-l7-intel-realization-request-envelope-custody-amendment@1'&&A.object_class==='bounded_admission_request_envelope_custody_amendment'&&A.program_id==='M-05'&&A.sprint_id==='M05-SPRINT-03'&&A.leg_id==='S03-L7'&&A.issue===345&&A.as_of==='2026-08-18'&&A.status==='intel_realization_request_envelope_custody_amendment_frozen','identity drift');
ok(same(A.canonical_base,{branch:'main',sha:'__BASE_COMMIT__',tree_sha:'__BASE_TREE__',preceding_pull_request:2188,preceding_merge_commit:'__BASE_COMMIT__'}),'base drift');
const B=A.bindings||{};ok(B.transport_body_hash_domain_amendment?.path===P.p.slice(root.length+1)&&B.transport_body_hash_domain_amendment?.blob_sha===E.p&&B.transport_body_hash_domain_amendment?.semantic_sha256===E.ph&&B.transport_body_hash_domain_amendment?.pull_request===2188&&B.transport_body_hash_domain_validator?.blob_sha===E.v&&B.transport_body_hash_domain_test?.blob_sha===E.t&&B.transport_body_hash_domain_workflow?.blob_sha===E.w,'binding drift');
ok(R.issue===345&&Array.isArray(R.observed_receipts)&&R.observed_receipts.length===0,'predecessor state drift');
ok(same(A.predecessor_gap,{gap_class:'exact_response_body_custody_without_exact_request_selection_envelope',exact_transport_body_hash_domains_required:true,request_method_required:false,exact_request_target_required:false,request_header_body_custody_required:false,content_negotiation_state_required:false,conditional_request_state_required:false,range_request_state_required:false,credential_and_cookie_scope_required:false,response_vary_reconciliation_required:false,same_url_alone_establishes_same_representation:false}),'gap drift');
const stages=['transaction','federal_cash_custody','public_account_booking','distribution'],fields=__FIELDS__;
for(const s of stages){const x=A.effective_stage_request_envelope_custody?.[s];ok(x&&x.requires_contract_stage===s&&same(x.required_fields,fields)&&x.exact_request_envelope_required===true&&x.request_target_and_headers_must_be_hash_addressed===true&&x.content_negotiation_headers_must_be_preserved===true&&x.conditional_and_range_state_must_be_preserved===true&&x.credential_and_cookie_scope_must_be_publicly_reproducible===true&&x.response_vary_must_reconcile_to_request_envelope===true&&x.same_url_without_same_request_envelope_qualifies===false,s+' stage drift')}
const Q=A.request_envelope_rules||{};ok(Q.request_envelope_schema_version==='m05-source-request-envelope@1'&&Q.hash_algorithm==='sha256'&&Q.hash_encoding==='lowercase_hex'&&Q.hash_length===64,'hash rules drift');ok(same(Q.allowed_request_methods,['GET','POST'])&&same(Q.allowed_request_target_forms,['origin_form','absolute_form']),'method or target form drift');ok(same(Q.allowed_request_header_capture_modes,['raw_http1_request_header_block_bytes','canonical_request_header_pairs_v1_after_protocol_decode']),'header capture drift');ok(same(Q.content_negotiation_header_names,['accept','accept-encoding','accept-language','user-agent'])&&same(Q.conditional_header_names,['if-match','if-none-match','if-modified-since','if-unmodified-since','if-range'])&&Q.range_header_name==='range','request header denominator drift');ok(same(Q.allowed_credential_scope_classes,['none','public_anonymous'])&&same(Q.allowed_cookie_scope_classes,['none'])&&same(Q.forbidden_sensitive_header_names,['authorization','proxy-authorization','cookie','set-cookie']),'privacy scope drift');
for(const k of['authorization_header_must_not_be_retained','cookie_header_must_not_be_retained','request_target_must_include_exact_query_octets','redirect_followups_each_require_distinct_request_envelope','conditional_request_headers_must_be_captured_when_present','range_request_headers_must_be_captured_when_present','partial_response_requires_complete_reassembly_receipt','response_vary_header_names_required','vary_star_disallows_public_reproducibility','vary_reconciliation_required','request_envelope_hash_must_bind_all_required_fields'])ok(Q[k]===true,k+' weakened');ok(Q.same_url_alone_is_same_request_envelope===false,'same URL overclaim');
ok(Array.isArray(A.observed_receipts)&&A.observed_receipts.length===0,'receipt injected');ok(same(A.observed_state,{transaction_admissible:false,federal_cash_custody_admissible:false,public_account_booking_admissible:false,distribution_admissible:false,answer_change_authorized:false}),'observed state drift');for(const[k,v]of Object.entries(A.guardrails||{}))ok(v===false,k+' guardrail weakened');for(const[k,v]of Object.entries(A.boundaries||{}))ok(k==='graph_effect'?v==='none':v===false,k+' boundary weakened');const X=A.expected_result||{};ok(X.amended_stages===4&&X.stages_requiring_exact_request_envelope===4&&X.stages_requiring_network_header_custody===4&&X.stages_requiring_vary_reconciliation===4&&X.observed_receipts===0&&X.candidate_evidence_records===5&&X.repository_promotions===5&&X.advanced_answer_dimensions===1&&X.effective_answers===0&&X.qualifying_jurisdictions===0&&X.graph_effect==='none','result denominator drift');for(const k of['transaction_admissible','federal_cash_custody_admissible','public_account_booking_admissible','distribution_admissible','answer_effectiveness','cross_domain_regression_completed','issue_345_may_close'])ok(X[k]===false,k+' overclaim');
console.log(JSON.stringify({validator:'m05-intel-realization-request-envelope-custody-amendment',amended_stages:4,stages_requiring_exact_request_envelope:4,stages_requiring_network_header_custody:4,stages_requiring_vary_reconciliation:4,observed_receipts:0,transaction_admissible:false,federal_cash_custody_admissible:false,public_account_booking_admissible:false,distribution_admissible:false,issue_345_may_close:false},null,2));
`;
validator=validator
  .replaceAll('__OUT_AMENDMENT__',OUT.amendment).replaceAll('__PRE_AMENDMENT__',PRE.amendment.path)
  .replaceAll('__PRE_VALIDATOR__',PRE.validator.path).replaceAll('__PRE_TEST__',PRE.test.path).replaceAll('__PRE_WORKFLOW__',PRE.workflow.path)
  .replaceAll('__CONTRACT_BLOB__',contractBlob).replaceAll('__CONTRACT_SHA__',contractSemantic)
  .replaceAll('__PRE_AMENDMENT_BLOB__',PRE.amendment.blob).replaceAll('__PRE_AMENDMENT_SHA__',PRE.amendment.semantic)
  .replaceAll('__PRE_VALIDATOR_BLOB__',PRE.validator.blob).replaceAll('__PRE_TEST_BLOB__',PRE.test.blob).replaceAll('__PRE_WORKFLOW_BLOB__',PRE.workflow.blob)
  .replaceAll('__BASE_COMMIT__',BASE_COMMIT).replaceAll('__BASE_TREE__',BASE_TREE).replaceAll('__FIELDS__',JSON.stringify(FIELDS));

const test=String.raw`#!/usr/bin/env node
import assert from 'node:assert/strict';import crypto from 'node:crypto';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import{spawnSync}from'node:child_process';import{fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),validator=path.join(root,'__OUT_VALIDATOR__'),contractPath=path.join(root,'__OUT_AMENDMENT__'),prePath=path.join(root,'__PRE_AMENDMENT__'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'m05-request-envelope-')),contract=JSON.parse(fs.readFileSync(contractPath,'utf8')),pre=JSON.parse(fs.readFileSync(prePath,'utf8')),clone=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex'),run=(env={})=>spawnSync(process.execPath,[validator],{cwd:root,env:{...process.env,...env},encoding:'utf8'}),write=(name,value)=>{const target=path.join(tmp,name+'.json');fs.writeFileSync(target,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');return target},bad=(name,env,target)=>{const r=run({[env]:target});assert.notEqual(r.status,0,name+' unexpectedly passed\n'+r.stdout+'\n'+r.stderr)},mut=(name,fn)=>{const x=clone(contract);fn(x);bad(name,'M05_INTEL_REQUEST_ENVELOPE_AMENDMENT_PATH',write(name,x))};
const base=run();assert.equal(base.status,0,base.stderr||base.stdout);assert.deepEqual(JSON.parse(base.stdout),{validator:'m05-intel-realization-request-envelope-custody-amendment',amended_stages:4,stages_requiring_exact_request_envelope:4,stages_requiring_network_header_custody:4,stages_requiring_vary_reconciliation:4,observed_receipts:0,transaction_admissible:false,federal_cash_custody_admissible:false,public_account_booking_admissible:false,distribution_admissible:false,issue_345_may_close:false});
mut('schema',x=>x.schema_version='broken@1');mut('base',x=>x.canonical_base.sha='0'.repeat(40));mut('binding',x=>x.bindings.transport_body_hash_domain_amendment.blob_sha='0'.repeat(40));mut('gap',x=>x.predecessor_gap.request_method_required=true);mut('stage-delete',x=>delete x.effective_stage_request_envelope_custody.distribution);mut('target-field-delete',x=>x.effective_stage_request_envelope_custody.transaction.required_fields=x.effective_stage_request_envelope_custody.transaction.required_fields.filter(v=>v!=='request_target_sha256'));mut('accept-delete',x=>x.request_envelope_rules.content_negotiation_header_names=x.request_envelope_rules.content_negotiation_header_names.filter(v=>v!=='accept'));mut('credential-scope',x=>x.request_envelope_rules.allowed_credential_scope_classes.push('private_authenticated'));mut('retain-authorization',x=>x.request_envelope_rules.authorization_header_must_not_be_retained=false);mut('vary-star',x=>x.request_envelope_rules.vary_star_disallows_public_reproducibility=false);mut('range',x=>x.request_envelope_rules.partial_response_requires_complete_reassembly_receipt=false);mut('receipt',x=>x.observed_receipts.push({stage:'transaction'}));mut('answer',x=>x.observed_state.answer_change_authorized=true);mut('closure',x=>x.boundaries.issue_345_may_close=true);mut('checksum',x=>x.request_envelope_amendment_sha256='0'.repeat(64));mut('coordinated',x=>{x.request_envelope_rules.same_url_alone_is_same_request_envelope=true;const y=clone(x);delete y.request_envelope_amendment_sha256;x.request_envelope_amendment_sha256=hash(y)});
bad('semantic-equivalent-contract-bytes','M05_INTEL_REQUEST_ENVELOPE_AMENDMENT_PATH',write('semantic-equivalent-contract-bytes',JSON.stringify(contract)+'\n'));bad('semantic-equivalent-predecessor-bytes','M05_INTEL_TRANSPORT_BODY_AMENDMENT_PATH',write('semantic-equivalent-predecessor-bytes',JSON.stringify(pre)+'\n'));
fs.rmSync(tmp,{recursive:true,force:true});console.log('m05-answerable-power-sprint-03-leg-07-intel-realization-request-envelope-custody-amendment.test: OK');
`.replaceAll('__OUT_VALIDATOR__',OUT.validator).replaceAll('__OUT_AMENDMENT__',OUT.amendment).replaceAll('__PRE_AMENDMENT__',PRE.amendment.path);

const workflow=[
  'name: M-05 Intel realization request envelope custody amendment','',
  'on:','  pull_request:','    branches: [main]','    paths:',
  `      - '${OUT.amendment}'`,`      - '${OUT.validator}'`,`      - '${OUT.test}'`,`      - '${OUT.workflow}'`,
  `      - '${PRE.amendment.path}'`,`      - '${PRE.validator.path}'`,`      - '${PRE.test.path}'`,`      - '${PRE.workflow.path}'`,
  '  push:','    branches: [main]','    paths:',
  `      - '${OUT.amendment}'`,`      - '${OUT.validator}'`,`      - '${OUT.test}'`,`      - '${OUT.workflow}'`,
  '  workflow_dispatch:','',
  'permissions:','  contents: read','',
  'concurrency:','  group: m05-intel-request-envelope-${{ github.workflow }}-${{ github.ref }}','  cancel-in-progress: false','',
  'jobs:','  validate:','    runs-on: ubuntu-latest','    timeout-minutes: 30','    steps:',
  '      - uses: actions/checkout@v4','        with:','          fetch-depth: 0','          persist-credentials: false',
  '      - uses: actions/setup-node@v4','        with:','          node-version: 24',
  '      - name: Validate request-envelope custody','        run: |',
  `          node --check ${OUT.validator}`,`          node --check ${OUT.test}`,
  `          node ${PRE.validator.path}`,`          node ${PRE.test.path}`,
  `          node ${OUT.validator}`,`          node ${OUT.test}`,
  '      - name: Run complete repository release gate','        run: npm run release:check',
  '      - name: Prove deterministic focused state','        run: |',
  '          git restore --staged --worktree .',`          node ${PRE.validator.path}`,`          node ${OUT.validator}`,`          node ${OUT.test}`,'          git diff --exit-code',''
].join('\n');

const product=new Map([[OUT.amendment,contractText],[OUT.validator,validator],[OUT.test,test],[OUT.workflow,workflow]]);
for(const [file,content]of product)write(path.join(ROOT,file),content);
run(process.execPath,['--check',OUT.validator]);run(process.execPath,['--check',OUT.test]);run(process.execPath,[OUT.validator]);run(process.execPath,[OUT.test]);
run('git',['fetch','origin','main',PRODUCT_BRANCH]);
const live=capture('git',['rev-parse','origin/main']);if(live!==BASE_COMMIT)throw Error('canonical main advanced: '+live);
const remoteProduct=capture('git',['ls-remote','--heads','origin','refs/heads/'+PRODUCT_BRANCH]).split(/\s+/)[0]||'';if(remoteProduct&&remoteProduct!==BASE_COMMIT)throw Error('product branch lease drift: '+remoteProduct);
run('git',['config','user.name','BigBirdReturns']);run('git',['config','user.email','bigbirdreturns@proton.me']);run('git',['switch','-C',PRODUCT_BRANCH,'origin/main']);
for(const [file,content]of product)write(path.join(ROOT,file),content);
run('git',['add',...product.keys()]);run('git',['commit','-m','[M-05 S03-L7] Require exact request-envelope custody','-m','Bind every Intel realization-stage receipt to the exact request selection envelope, public credential scope, conditional and range state, and response Vary reconciliation without changing any empirical or answer state.']);
const changed=capture('git',['diff','--name-only','origin/main..HEAD']).split('\n').filter(Boolean).sort();const expected=[...product.keys()].sort();if(JSON.stringify(changed)!==JSON.stringify(expected))throw Error('permanent path denominator drift: '+JSON.stringify(changed));
const remote=`https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`;run('git',['remote','set-url','origin',remote]);run('git',['push','origin','HEAD:refs/heads/'+PRODUCT_BRANCH,'--force-with-lease=refs/heads/'+PRODUCT_BRANCH+':'+BASE_COMMIT]);
const head=capture('git',['rev-parse','HEAD']),tree=capture('git',['rev-parse','HEAD^{tree}']);console.log(JSON.stringify({base:BASE_COMMIT,head,tree,contract_blob:contractBlob,contract_semantic_sha256:contractSemantic,files:Object.fromEntries([...product].map(([file,content])=>[file,{git_blob_sha:gitBlob(Buffer.from(content)),sha256:sha256(content),bytes:Buffer.byteLength(content)}]))},null,2));
