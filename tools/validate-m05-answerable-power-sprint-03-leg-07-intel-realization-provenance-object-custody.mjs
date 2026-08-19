#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const receiptRoot=path.resolve(process.env.M05_INTEL_REALIZATION_RECEIPT_ROOT||root);
const paths={
  contract:resolvePath(
    'M05_INTEL_REALIZATION_PROVENANCE_OBJECT_CUSTODY_CONTRACT_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody-contract.json'
  ),
  registry:resolvePath(
    'M05_INTEL_REALIZATION_STAGE_RECEIPT_REGISTRY_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-registry.json'
  ),
  provenance:resolvePath(
    'M05_INTEL_REALIZATION_SOURCE_PROVENANCE_AMENDMENT_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-source-provenance-amendment.json'
  ),
  provenanceValidator:resolvePath(
    'M05_INTEL_REALIZATION_SOURCE_PROVENANCE_VALIDATOR_PATH',
    'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-source-provenance-amendment.mjs'
  )
};

const EXPECTED_CONTRACT_BLOB_SHA='d1dfb261ff027b624a1da25feb49bbc492fe8a4c';
const EXPECTED_CONTRACT_SHA256='b775a0253219f33fd5fc04ff79088a178577ea264ee7fa6af38a717d99c8ec74';
const EXPECTED_PROVENANCE_BLOB_SHA='893fbd3a2d50ccfd09a4d357b070af848f66b5d8';
const EXPECTED_PROVENANCE_SHA256='4cdd9995e964073b830ab006b5f4a660009535b5420f0b6cb67bb4c4d94e1444';
const EXPECTED_PROVENANCE_VALIDATOR_BLOB_SHA='4439f12738ab2ab92bc1c4a9a8068bff82284f6e';

const readRaw=(target)=>fs.readFileSync(target);
const gitBlobSha=(buffer)=>crypto
  .createHash('sha1')
  .update(Buffer.from(`blob ${buffer.length}\0`,'utf8'))
  .update(buffer)
  .digest('hex');
const bodySha=(buffer)=>crypto.createHash('sha256').update(buffer).digest('hex');
const semanticHash=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clone=(value)=>JSON.parse(JSON.stringify(value));
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const fail=(message)=>{throw new Error(message)};
const object=(value)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const text=(value,min=1)=>typeof value==='string'&&value.trim().length>=min;
const sha1=(value)=>typeof value==='string'&&/^[0-9a-f]{40}$/.test(value);
const sha256=(value)=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const utc=(value)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value);
const httpsUrl=(value)=>{
  if(!text(value,8))return false;
  try{return new URL(value).protocol==='https:'}catch{return false}
};
const containsAll=(values,required)=>Array.isArray(values)&&required.every((value)=>values.includes(value));
const parseJson=(buffer,label)=>{
  try{return JSON.parse(buffer.toString('utf8'))}
  catch(error){fail(`${label} is not valid JSON: ${error.message}`)}
};

const raw={
  contract:readRaw(paths.contract),
  registry:readRaw(paths.registry),
  provenance:readRaw(paths.provenance),
  provenanceValidator:readRaw(paths.provenanceValidator)
};
if(gitBlobSha(raw.contract)!==EXPECTED_CONTRACT_BLOB_SHA)fail('provenance-object custody contract Git object drift');
if(gitBlobSha(raw.provenance)!==EXPECTED_PROVENANCE_BLOB_SHA)fail('source-provenance amendment Git object drift');
if(gitBlobSha(raw.provenanceValidator)!==EXPECTED_PROVENANCE_VALIDATOR_BLOB_SHA)fail('source-provenance validator Git object drift');

const contract=parseJson(raw.contract,'provenance-object custody contract');
const registry=parseJson(raw.registry,'stage-receipt registry');
const provenance=parseJson(raw.provenance,'source-provenance amendment');
const snapshots={
  contract:JSON.stringify(contract),
  registry:JSON.stringify(registry),
  provenance:JSON.stringify(provenance)
};

if(contract.schema_version!=='m05-answerable-power-s03-l7-intel-realization-provenance-object-custody-contract@1')fail('contract schema drift');
if(contract.object_class!=='bounded_retrievable_provenance_object_custody_contract')fail('contract object class drift');
if(contract.program_id!=='M-05'||contract.sprint_id!=='M05-SPRINT-03'||contract.leg_id!=='S03-L7')fail('contract program binding drift');
if(contract.issue!==345||contract.as_of!=='2026-08-18'||contract.status!=='intel_realization_provenance_object_custody_contract_frozen')fail('contract identity drift');

const expectedBase={
  branch:'main',
  sha:'9f6f700f18c4eb1fcbbbe67f41a23369c5a1db6b',
  tree_sha:'d205abcc8d41a41faa12b75d4570fc498e39f20e',
  preceding_pull_request:2184,
  preceding_merge_commit:'9f6f700f18c4eb1fcbbbe67f41a23369c5a1db6b'
};
if(!same(contract.canonical_base,expectedBase))fail('contract canonical base drift');

const expectedBindings={
  source_provenance_amendment:{
    path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-source-provenance-amendment.json',
    blob_sha:EXPECTED_PROVENANCE_BLOB_SHA,
    semantic_sha256:EXPECTED_PROVENANCE_SHA256,
    schema_version:'m05-answerable-power-s03-l7-intel-realization-source-provenance-amendment@1',
    pull_request:2184,
    merge_commit:'9f6f700f18c4eb1fcbbbe67f41a23369c5a1db6b'
  },
  source_provenance_validator:{
    path:'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-source-provenance-amendment.mjs',
    blob_sha:EXPECTED_PROVENANCE_VALIDATOR_BLOB_SHA,
    control_class:'independent_source_provenance_git_blob_and_semantic_checksum_validator',
    pull_request:2184,
    merge_commit:'9f6f700f18c4eb1fcbbbe67f41a23369c5a1db6b'
  }
};
if(!same(contract.bindings,expectedBindings))fail('contract predecessor binding drift');

if(provenance.schema_version!=='m05-answerable-power-s03-l7-intel-realization-source-provenance-amendment@1')fail('source-provenance predecessor schema drift');
if(provenance.status!=='intel_realization_source_provenance_amendment_frozen')fail('source-provenance predecessor status drift');
const provenanceCopy=clone(provenance);
const declaredProvenanceHash=provenanceCopy.provenance_amendment_sha256;
delete provenanceCopy.provenance_amendment_sha256;
if(declaredProvenanceHash!==EXPECTED_PROVENANCE_SHA256)fail('source-provenance predecessor declared checksum drift');
if(semanticHash(provenanceCopy)!==EXPECTED_PROVENANCE_SHA256)fail('source-provenance predecessor semantic checksum drift');
const provenanceValidatorText=raw.provenanceValidator.toString('utf8');
for(const token of [EXPECTED_PROVENANCE_BLOB_SHA,EXPECTED_PROVENANCE_SHA256,'Git object drift']){
  if(!provenanceValidatorText.includes(token))fail(`source-provenance validator control drift: ${token}`);
}

const expectedStages=['transaction','federal_cash_custody','public_account_booking','distribution'];
if(!same(contract.stage_order,expectedStages))fail('contract stage order drift');
if(!same(registry.stage_order,expectedStages))fail('registry stage order drift');

const predecessorFields=[
  'source_authority_identifier',
  'origin_evidence_sha256',
  'acquisition_receipt_sha256'
];
const newlyRequiredObjects=[
  'source_body_custody',
  'authority_resolution_receipt',
  'origin_evidence_receipt',
  'acquisition_receipt'
];
for(const stageId of expectedStages){
  const predecessorStage=provenance.effective_stage_source_provenance?.[stageId];
  if(!predecessorStage)fail(`missing source-provenance predecessor stage ${stageId}`);
  if(!containsAll(predecessorStage.required_fields,predecessorFields))fail(`${stageId} predecessor digest surface drift`);
  if(newlyRequiredObjects.some((field)=>predecessorStage.required_fields.includes(field)))fail(`${stageId} predecessor gap unexpectedly closed`);
}
const expectedGap={
  gap_class:'digest_only_provenance_object_custody',
  origin_evidence_sha256_required:true,
  origin_evidence_retrievable_object_required:false,
  acquisition_receipt_sha256_required:true,
  acquisition_receipt_retrievable_object_required:false,
  source_authority_identifier_required:true,
  authority_identifier_scheme_required:false,
  authority_resolution_receipt_required:false,
  digest_alone_is_retrievable_custody:false,
  self_declared_authority_identifier_is_verified_authority:false
};
if(!same(contract.predecessor_gap,expectedGap))fail('predecessor gap classification drift');

const expectedRegistryControl={
  path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-registry.json',
  schema_version:'m05-answerable-power-s03-l7-intel-realization-stage-receipt-registry@1',
  receipt_object_path_prefix:'receipts/m05/intel-realization/',
  receipt_objects_must_be_repository_files:true,
  receipt_object_paths_must_not_escape_repository_root:true,
  duplicate_receipt_ids_allowed:false,
  duplicate_event_stage_pairs_allowed:false,
  symlinked_receipt_objects_allowed:false
};
if(!same(contract.receipt_registry,expectedRegistryControl))fail('receipt registry control drift');

const requiredReceiptFields=[
  'receipt_id','event_chain_id','stage','predecessor_stage_receipt_id','source_authority',
  'authority_identifier_scheme','source_authority_identifier',
  'source_record_identifier','source_record_class','source_origin_body_sha256',
  'source_custody_body_sha256','origin_evidence_sha256',
  'acquisition_receipt_sha256','source_body_custody',
  'authority_resolution_receipt','origin_evidence_receipt',
  'acquisition_receipt','provenance_object_custody_complete',
  'stage_admissible'
];
if(!same(contract.stage_receipt_required_fields,requiredReceiptFields))fail('stage receipt field denominator drift');

const objectRules=contract.provenance_object_bindings||{};
const rawBindingFields=['path','blob_sha','body_sha256','content_type'];
const jsonBindingFields=['path','blob_sha','body_sha256','schema_version'];
if(!same(objectRules.source_body_custody?.binding_required_fields,rawBindingFields))fail('source-body binding contract drift');
for(const objectId of ['authority_resolution_receipt','origin_evidence_receipt','acquisition_receipt']){
  if(!same(objectRules[objectId]?.binding_required_fields,jsonBindingFields))fail(`${objectId} binding contract drift`);
}
if(objectRules.authority_resolution_receipt?.self_declaration_alone_qualifies!==false)fail('authority self-declaration guardrail weakened');
if(objectRules.authority_resolution_receipt?.official_looking_hostname_alone_qualifies!==false)fail('authority hostname guardrail weakened');
if(objectRules.acquisition_receipt?.self_declared_digest_without_retrievable_receipt_qualifies!==false)fail('acquisition digest-only guardrail weakened');
if(objectRules.acquisition_receipt?.screenshot_or_ocr_alone_qualifies!==false)fail('acquisition screenshot guardrail weakened');

const contractCopy=clone(contract);
const declaredContractHash=contractCopy.contract_sha256;
delete contractCopy.contract_sha256;
if(declaredContractHash!==EXPECTED_CONTRACT_SHA256)fail('contract declared checksum drift');
if(semanticHash(contractCopy)!==EXPECTED_CONTRACT_SHA256)fail('contract semantic checksum drift');

if(registry.schema_version!=='m05-answerable-power-s03-l7-intel-realization-stage-receipt-registry@1')fail('registry schema drift');
if(registry.object_class!=='bounded_intel_realization_stage_receipt_registry')fail('registry object class drift');
if(registry.program_id!=='M-05'||registry.sprint_id!=='M05-SPRINT-03'||registry.leg_id!=='S03-L7'||registry.issue!==345)fail('registry program binding drift');
if(!/^\d{4}-\d{2}-\d{2}$/.test(registry.as_of))fail('registry as-of drift');
if(registry.ordinary_gate_utc!=='2026-08-27T00:00:00Z')fail('registry ordinary gate drift');
const expectedContractBinding={
  path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody-contract.json',
  blob_sha:EXPECTED_CONTRACT_BLOB_SHA,
  semantic_sha256:EXPECTED_CONTRACT_SHA256,
  schema_version:'m05-answerable-power-s03-l7-intel-realization-provenance-object-custody-contract@1'
};
if(!same(registry.contract_binding,expectedContractBinding))fail('registry contract binding drift');
if(!Array.isArray(registry.receipts))fail('registry receipts must be an array');

const allowedReceiptPrefix='receipts/m05/intel-realization/';
const allowedReceiptRoot=path.resolve(receiptRoot,allowedReceiptPrefix);
const resolveReceiptPath=(relative,label)=>{
  if(!text(relative,allowedReceiptPrefix.length+1))fail(`${label} path missing`);
  if(relative.includes('\\')||relative.startsWith('/')||!relative.startsWith(allowedReceiptPrefix))fail(`${label} path outside controlled prefix`);
  const target=path.resolve(receiptRoot,relative);
  if(target===allowedReceiptRoot||!target.startsWith(`${allowedReceiptRoot}${path.sep}`))fail(`${label} path escapes controlled root`);
  return target;
};
const loadRawBinding=(binding,label)=>{
  if(!object(binding)||!same(Object.keys(binding).sort(),[...rawBindingFields].sort()))fail(`${label} raw binding shape drift`);
  if(!sha1(binding.blob_sha)||!sha256(binding.body_sha256)||!text(binding.content_type,3))fail(`${label} raw binding identity invalid`);
  const target=resolveReceiptPath(binding.path,label);
  if(!fs.lstatSync(target).isFile())fail(`${label} must be a regular repository file`);
  const buffer=readRaw(target);
  if(gitBlobSha(buffer)!==binding.blob_sha)fail(`${label} Git object drift`);
  if(bodySha(buffer)!==binding.body_sha256)fail(`${label} body checksum drift`);
  return {binding,target,buffer};
};
const loadJsonBinding=(binding,label,expectedSchema,expectedClass)=>{
  if(!object(binding)||!same(Object.keys(binding).sort(),[...jsonBindingFields].sort()))fail(`${label} JSON binding shape drift`);
  if(!sha1(binding.blob_sha)||!sha256(binding.body_sha256)||binding.schema_version!==expectedSchema)fail(`${label} JSON binding identity invalid`);
  const target=resolveReceiptPath(binding.path,label);
  if(!fs.lstatSync(target).isFile())fail(`${label} must be a regular repository file`);
  const buffer=readRaw(target);
  if(gitBlobSha(buffer)!==binding.blob_sha)fail(`${label} Git object drift`);
  if(bodySha(buffer)!==binding.body_sha256)fail(`${label} body checksum drift`);
  const value=parseJson(buffer,label);
  if(value.schema_version!==expectedSchema||value.object_class!==expectedClass)fail(`${label} schema or object class drift`);
  return {binding,target,buffer,value};
};
const requireFields=(value,fields,label)=>{
  if(!object(value)||!fields.every((field)=>Object.hasOwn(value,field)))fail(`${label} required fields incomplete`);
};

const allowedSchemes=objectRules.authority_resolution_receipt.allowed_identifier_schemes;
const allowedAuthorityVerificationMethods=objectRules.authority_resolution_receipt.allowed_verification_methods;
const allowedOriginVerificationModes=objectRules.origin_evidence_receipt.allowed_origin_verification_modes;
const allowedAcquisitionMethods=objectRules.acquisition_receipt.allowed_acquisition_methods;
const allowedSourceRecordClasses=contract.source_identity_rules?.allowed_source_record_classes||[];

const receiptIds=new Set();
const eventStagePairs=new Set();
const objectPathDigests=new Map();
const retrievableObjectPaths=new Set();
const validatedReceipts=[];

const registerBinding=(binding,label)=>{
  const existing=objectPathDigests.get(binding.body_sha256);
  if(existing&&existing!==binding.path)fail(`${label} reuses one digest for multiple object paths`);
  objectPathDigests.set(binding.body_sha256,binding.path);
  retrievableObjectPaths.add(binding.path);
};

for(const [index,receipt] of registry.receipts.entries()){
  const label=`registry receipt ${index}`;
  requireFields(receipt,requiredReceiptFields,label);
  if(!text(receipt.receipt_id,12)||receiptIds.has(receipt.receipt_id))fail(`${label} duplicate or invalid receipt_id`);
  receiptIds.add(receipt.receipt_id);
  if(!text(receipt.event_chain_id,12)||!expectedStages.includes(receipt.stage))fail(`${label} event-chain or stage invalid`);
  const eventStageKey=`${receipt.event_chain_id}:${receipt.stage}`;
  if(eventStagePairs.has(eventStageKey))fail(`${label} duplicate event-stage pair`);
  eventStagePairs.add(eventStageKey);
  if(!text(receipt.source_authority,5)||!allowedSchemes.includes(receipt.authority_identifier_scheme)||!text(receipt.source_authority_identifier,5)||!text(receipt.source_record_identifier,5)||!allowedSourceRecordClasses.includes(receipt.source_record_class))fail(`${label} authority or record identity invalid`);
  for(const field of ['source_origin_body_sha256','source_custody_body_sha256','origin_evidence_sha256','acquisition_receipt_sha256']){
    if(!sha256(receipt[field]))fail(`${label} ${field} invalid`);
  }
  if(receipt.source_origin_body_sha256!==receipt.source_custody_body_sha256)fail(`${label} origin and custody body mismatch`);
  if(receipt.provenance_object_custody_complete!==true)fail(`${label} incomplete provenance-object custody cannot enter registry`);
  if(receipt.stage_admissible!==false)fail(`${label} provenance custody cannot self-authorize stage admission`);

  const sourceBody=loadRawBinding(receipt.source_body_custody,`${label} source body`);
  registerBinding(receipt.source_body_custody,`${label} source body`);
  if(sourceBody.binding.body_sha256!==receipt.source_origin_body_sha256)fail(`${label} source-body binding does not match origin digest`);

  const authorityRule=objectRules.authority_resolution_receipt;
  const authority=loadJsonBinding(
    receipt.authority_resolution_receipt,
    `${label} authority resolution`,
    authorityRule.schema_version,
    authorityRule.object_class
  );
  registerBinding(receipt.authority_resolution_receipt,`${label} authority resolution`);
  requireFields(authority.value,authorityRule.required_fields,`${label} authority resolution`);
  if(authority.value.source_authority!==receipt.source_authority||authority.value.authority_identifier_scheme!==receipt.authority_identifier_scheme||authority.value.source_authority_identifier!==receipt.source_authority_identifier)fail(`${label} authority resolution identity mismatch`);
  if(!allowedAuthorityVerificationMethods.includes(authority.value.verification_method))fail(`${label} authority verification method invalid`);
  if(!Array.isArray(authority.value.official_origin_hosts)||authority.value.official_origin_hosts.length===0||authority.value.official_origin_hosts.some((host)=>!text(host,4)))fail(`${label} official-origin host denominator invalid`);
  if(!Array.isArray(authority.value.official_record_system_identifiers)||authority.value.official_record_system_identifiers.length===0||authority.value.official_record_system_identifiers.some((id)=>!text(id,3)))fail(`${label} official record-system denominator invalid`);
  if(!utc(authority.value.observed_at_utc))fail(`${label} authority observation time invalid`);
  if(!Array.isArray(authority.value.evidence_items)||authority.value.evidence_items.length===0)fail(`${label} authority evidence missing`);
  for(const [evidenceIndex,item] of authority.value.evidence_items.entries()){
    const itemLabel=`${label} authority evidence ${evidenceIndex}`;
    requireFields(item,authorityRule.evidence_item_required_fields,itemLabel);
    if(!text(item.evidence_role,3)||!httpsUrl(item.source_url)||!text(item.source_locator,3))fail(`${itemLabel} source address invalid`);
    const evidenceBody=loadRawBinding(item.body_binding,`${itemLabel} body`);
    registerBinding(item.body_binding,`${itemLabel} body`);
    void evidenceBody;
  }

  const originRule=objectRules.origin_evidence_receipt;
  const origin=loadJsonBinding(
    receipt.origin_evidence_receipt,
    `${label} origin evidence`,
    originRule.schema_version,
    originRule.object_class
  );
  registerBinding(receipt.origin_evidence_receipt,`${label} origin evidence`);
  requireFields(origin.value,originRule.required_fields,`${label} origin evidence`);
  if(origin.value.source_authority!==receipt.source_authority||origin.value.authority_identifier_scheme!==receipt.authority_identifier_scheme||origin.value.source_authority_identifier!==receipt.source_authority_identifier||origin.value.source_record_identifier!==receipt.source_record_identifier||origin.value.source_record_class!==receipt.source_record_class)fail(`${label} origin-evidence identity mismatch`);
  if(!httpsUrl(origin.value.source_origin_url)||!utc(origin.value.source_origin_observed_at_utc)||!text(origin.value.source_origin_content_type,3)||!sha256(origin.value.source_origin_body_sha256))fail(`${label} origin-evidence source identity invalid`);
  if(origin.value.source_origin_body_sha256!==receipt.source_origin_body_sha256)fail(`${label} origin-evidence body mismatch`);
  if(origin.value.source_origin_content_type!==sourceBody.binding.content_type)fail(`${label} origin-evidence content type mismatch`);
  if(!allowedOriginVerificationModes.includes(origin.value.origin_verification_mode))fail(`${label} origin verification mode invalid`);
  if(origin.value.authority_resolution_receipt_body_sha256!==authority.binding.body_sha256)fail(`${label} origin evidence does not bind authority receipt`);
  if(!Array.isArray(origin.value.origin_evidence_items)||origin.value.origin_evidence_items.length===0)fail(`${label} origin evidence item denominator invalid`);
  for(const [evidenceIndex,item] of origin.value.origin_evidence_items.entries()){
    const itemLabel=`${label} origin evidence item ${evidenceIndex}`;
    requireFields(item,originRule.origin_evidence_item_required_fields,itemLabel);
    if(!text(item.evidence_role,3)||!httpsUrl(item.source_url)||!text(item.source_locator,3))fail(`${itemLabel} source address invalid`);
    loadRawBinding(item.body_binding,`${itemLabel} body`);
    registerBinding(item.body_binding,`${itemLabel} body`);
  }

  const acquisitionRule=objectRules.acquisition_receipt;
  const acquisition=loadJsonBinding(
    receipt.acquisition_receipt,
    `${label} acquisition receipt`,
    acquisitionRule.schema_version,
    acquisitionRule.object_class
  );
  registerBinding(receipt.acquisition_receipt,`${label} acquisition receipt`);
  requireFields(acquisition.value,acquisitionRule.required_fields,`${label} acquisition receipt`);
  if(!httpsUrl(acquisition.value.requested_url)||!httpsUrl(acquisition.value.resolved_url))fail(`${label} acquisition URL invalid`);
  if(!Array.isArray(acquisition.value.redirect_chain)||acquisition.value.redirect_chain.some((url)=>!httpsUrl(url)))fail(`${label} acquisition redirect chain invalid`);
  if(!Number.isInteger(acquisition.value.response_status)||acquisition.value.response_status<200||acquisition.value.response_status>=400)fail(`${label} acquisition response status invalid`);
  for(const field of ['source_origin_body_sha256','authority_resolution_receipt_body_sha256','origin_evidence_receipt_body_sha256']){
    if(!sha256(acquisition.value[field]))fail(`${label} acquisition ${field} invalid`);
  }
  if(!acquisitionRule.allowed_request_methods.includes(acquisition.value.request_method)||acquisition.value.request_contains_credentials!==false)fail(`${label} acquisition request boundary invalid`);
  const requestHeaders=loadRawBinding(acquisition.value.request_headers_custody,`${label} request headers`);
  const responseHeaders=loadRawBinding(acquisition.value.response_headers_custody,`${label} response headers`);
  const tlsPeer=loadRawBinding(acquisition.value.tls_peer_certificate_custody,`${label} TLS peer certificate`);
  for(const [binding,bindingLabel,contentType] of [
    [requestHeaders.binding,`${label} request headers`,acquisitionRule.request_headers_content_type],
    [responseHeaders.binding,`${label} response headers`,acquisitionRule.response_headers_content_type],
    [tlsPeer.binding,`${label} TLS peer certificate`,acquisitionRule.tls_peer_certificate_content_type]
  ]){
    registerBinding(binding,bindingLabel);
    if(binding.content_type!==contentType)fail(`${bindingLabel} content type drift`);
  }
  if(!utc(acquisition.value.observed_at_utc)||!text(acquisition.value.content_type,3)||!Number.isInteger(acquisition.value.body_length_bytes)||acquisition.value.body_length_bytes<1)fail(`${label} acquisition body metadata invalid`);
  if(!allowedAcquisitionMethods.includes(acquisition.value.acquisition_method)||!text(acquisition.value.acquisition_tool,2)||!text(acquisition.value.acquisition_tool_version,1))fail(`${label} acquisition method or tool invalid`);
  if(acquisition.value.source_origin_body_sha256!==receipt.source_origin_body_sha256)fail(`${label} acquisition origin-body mismatch`);
  if(acquisition.value.content_type!==sourceBody.binding.content_type)fail(`${label} acquisition content type mismatch`);
  if(acquisition.value.body_length_bytes!==sourceBody.buffer.length)fail(`${label} acquisition body length mismatch`);
  if(acquisition.value.authority_resolution_receipt_body_sha256!==authority.binding.body_sha256)fail(`${label} acquisition does not bind authority receipt`);
  if(acquisition.value.origin_evidence_receipt_body_sha256!==origin.binding.body_sha256)fail(`${label} acquisition does not bind origin-evidence receipt`);
  if(origin.binding.body_sha256!==receipt.origin_evidence_sha256)fail(`${label} registry origin-evidence digest mismatch`);
  if(acquisition.binding.body_sha256!==receipt.acquisition_receipt_sha256)fail(`${label} registry acquisition-receipt digest mismatch`);

  validatedReceipts.push({receipt,authority,origin,acquisition,sourceBody});
}

const receiptById=new Map(validatedReceipts.map((entry)=>[entry.receipt.receipt_id,entry.receipt]));
for(const {receipt} of validatedReceipts){
  const stageIndex=expectedStages.indexOf(receipt.stage);
  if(stageIndex===0){
    if(receipt.predecessor_stage_receipt_id!==null)fail(`${receipt.receipt_id} transaction receipt must not declare a predecessor stage receipt`);
    continue;
  }
  if(!text(receipt.predecessor_stage_receipt_id,12))fail(`${receipt.receipt_id} later-stage receipt predecessor missing`);
  const predecessor=receiptById.get(receipt.predecessor_stage_receipt_id);
  if(!predecessor)fail(`${receipt.receipt_id} predecessor stage receipt not registered`);
  if(predecessor.event_chain_id!==receipt.event_chain_id||predecessor.stage!==expectedStages[stageIndex-1])fail(`${receipt.receipt_id} predecessor stage or event-chain mismatch`);
}
const receiptCount=validatedReceipts.length;
const retrievableObjectCount=retrievableObjectPaths.size;
const expectedStatus=receiptCount===0
  ?'intel_realization_stage_receipt_registry_waiting_for_ordinary_gate'
  :'intel_realization_stage_receipt_registry_custody_only';
if(registry.status!==expectedStatus)fail('registry status does not match receipt denominator');

const expectedObserved={
  registered_stage_receipts:receiptCount,
  retrievable_provenance_objects:retrievableObjectCount,
  transaction_admissible:false,
  federal_cash_custody_admissible:false,
  public_account_booking_admissible:false,
  distribution_admissible:false,
  answer_change_authorized:false
};
if(!same(registry.observed_state,expectedObserved))fail('registry observed state drift');
for(const [key,value] of Object.entries(registry.boundaries||{})){
  if(key==='graph_effect'){
    if(value!=='none')fail('registry graph boundary drift');
  }else if(value!==false){
    fail(`unsafe registry boundary: ${key}`);
  }
}
for(const [key,value] of Object.entries(contract.guardrails||{})){
  if(value!==false)fail(`contract guardrail weakened: ${key}`);
}
for(const [key,value] of Object.entries(contract.boundaries||{})){
  if(key==='graph_effect'){
    if(value!=='none')fail('contract graph boundary drift');
  }else if(value!==false){
    fail(`unsafe contract boundary: ${key}`);
  }
}
if(receiptCount===0){
  const expectedCurrent={
    registered_stage_receipts:0,
    retrievable_authority_resolution_receipts:0,
    retrievable_origin_evidence_receipts:0,
    retrievable_acquisition_receipts:0,
    transaction_admissible:false,
    federal_cash_custody_admissible:false,
    public_account_booking_admissible:false,
    distribution_admissible:false,
    answer_change_authorized:false
  };
  if(!same(contract.current_state,expectedCurrent))fail('contract current state drift');
  if(contract.expected_result?.registered_stage_receipts!==0||contract.expected_result?.retrievable_provenance_objects!==0||contract.expected_result?.issue_345_may_close!==false)fail('contract expected result drift');
}

if(JSON.stringify(contract)!==snapshots.contract)fail('validator mutated contract');
if(JSON.stringify(registry)!==snapshots.registry)fail('validator mutated registry');
if(JSON.stringify(provenance)!==snapshots.provenance)fail('validator mutated predecessor provenance amendment');

console.log(JSON.stringify({
  validator:'m05-intel-realization-provenance-object-custody',
  ordinary_gate_utc:registry.ordinary_gate_utc,
  controlled_stages:expectedStages.length,
  registered_stage_receipts:receiptCount,
  retrievable_provenance_objects:retrievableObjectCount,
  transaction_admissible:false,
  federal_cash_custody_admissible:false,
  public_account_booking_admissible:false,
  distribution_admissible:false,
  issue_345_may_close:false
},null,2));
