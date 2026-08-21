#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(name,fallback)=>path.resolve(ROOT,process.env[name]||fallback);
const PATHS={
  repair:resolvePath('M05_INTEL_STAGE_STACK_POSTMERGE_REPAIR_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-postmerge-repair.json'),
  policy:resolvePath('M05_INTEL_STAGE_RECEIPT_CONTROL_STACK_AMENDMENT_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.json'),
  liveContract:resolvePath('M05_INTEL_STAGE_RECEIPT_LIVE_REGISTRY_CONTRACT_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-live-registry-contract.json'),
  liveRegistry:resolvePath('M05_INTEL_STAGE_RECEIPT_LIVE_REGISTRY_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-registry.json'),
  legacyRegistry:resolvePath('M05_INTEL_STAGE_RECEIPT_REGISTRY_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-registry.json'),
  pc:resolvePath('M05_INTEL_PROVENANCE_OBJECT_CUSTODY_CONTRACT_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody-contract.json'),
  pv:resolvePath('M05_INTEL_PROVENANCE_OBJECT_CUSTODY_VALIDATOR_PATH','tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody.mjs'),
  pt:resolvePath('M05_INTEL_PROVENANCE_OBJECT_CUSTODY_TEST_PATH','test/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody.test.js'),
  pw:resolvePath('M05_INTEL_PROVENANCE_OBJECT_CUSTODY_WORKFLOW_PATH','.github/workflows/m05-intel-realization-provenance-object-custody.yml'),
  cc:resolvePath('M05_INTEL_CONNECTION_AUTHENTICATION_CONTRACT_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.json'),
  cv:resolvePath('M05_INTEL_CONNECTION_AUTHENTICATION_VALIDATOR_PATH','tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.mjs'),
  ct:resolvePath('M05_INTEL_CONNECTION_AUTHENTICATION_TEST_PATH','test/m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.test.js'),
  cw:resolvePath('M05_INTEL_CONNECTION_AUTHENTICATION_WORKFLOW_PATH','.github/workflows/m05-intel-realization-connection-authentication-custody-amendment.yml'),
  oc:resolvePath('M05_INTEL_OBSERVATION_TIME_CONTRACT_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.json'),
  ov:resolvePath('M05_INTEL_OBSERVATION_TIME_VALIDATOR_PATH','tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.mjs'),
  ot:resolvePath('M05_INTEL_OBSERVATION_TIME_TEST_PATH','test/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.test.js'),
  ow:resolvePath('M05_INTEL_OBSERVATION_TIME_WORKFLOW_PATH','.github/workflows/m05-intel-realization-observation-time-custody-amendment.yml'),
  tc:resolvePath('M05_INTEL_TEMPORAL_RECONCILIATION_CONTRACT_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.json'),
  tv:resolvePath('M05_INTEL_TEMPORAL_RECONCILIATION_VALIDATOR_PATH','tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.mjs'),
  tt:resolvePath('M05_INTEL_TEMPORAL_RECONCILIATION_TEST_PATH','test/m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.test.js'),
  tw:resolvePath('M05_INTEL_TEMPORAL_RECONCILIATION_WORKFLOW_PATH','.github/workflows/m05-intel-realization-temporal-reconciliation-admission-amendment.yml')
};

const EXPECTED={
  repairBlob:'14decc6ed12383ca7395551c025edac06c446c5c',
  repairSemantic:'3d70718a3c458189dae7f724c128301813eae885f968226fa738b1564bd29651',
  policyBlob:'c874948a3d3c0f17c4cb350b26bc12e17f29213e',
  policySemantic:'dfaa4d53cc18ebda3f2afb150e7c3f41894b4a1e47af650852859381a66ae63f',
  liveContractBlob:'f805af9dfb997114ba4bc8d357c5838ae90ce961',
  liveContractSemantic:'95936ed4d6220a62d4f433fa317efc225f0c3e9eab92a22015bff6826ceb1ee3',
  legacyRegistryBlob:'e8ff7438814f79309964b75805d5f945bd0bcbd8',
  pcBlob:'d1dfb261ff027b624a1da25feb49bbc492fe8a4c',
  pcSemantic:'b775a0253219f33fd5fc04ff79088a178577ea264ee7fa6af38a717d99c8ec74',
  pvBlob:'09fd1fb7a89840ae5f5189b6c50b5f45fdbdfd14',
  ptBlob:'5be7e14be813accb0dcc8607e87ec9ececb9d0d3',
  pwBlob:'fd0c462e959b9285ed56f62c85c0c55aadb87b7f',
  ccBlob:'3dc1b9dd8510ad5903f7a1e39abfe051dd36831a',
  ccSemantic:'50a923f64324ddc23cf99d0c98dfec1b3707cd2db701b49c82f45faeafa4dda7',
  cvBlob:'3dba5e6bcfef164489d630ee3cd5ccaee89ea83f',
  ctBlob:'a9490d8c2eb4aeaf62a318e98a80311d8145ca4e',
  cwBlob:'06574978462f8fc8473667e6961a3e994033faef',
  ocBlob:'817f2b571c5f5feb755c6ac97226567630de5c38',
  ocSemantic:'5a334376ca80ce4171f127bc7b357a179cdb824b92a411685b1c55df91a423e9',
  ovBlob:'e5c2afe704f1589816c6c242ba096430aac38d91',
  otBlob:'e04c076b0a764b77053db504b94606f3ced44c98',
  owBlob:'d77e5a1a6a0bc2b22801d15850da5de177795641',
  tcBlob:'6ea434ab5101e6a0ce0fc1f924eccc5d5225bbf7',
  tcSemantic:'5a0830c77da3b443a8aff7a121fde3b051fc526a72fa5d48f14870a3d4a145c8',
  tvBlob:'af66f5e21b77f7ce6c3a592f2362e49474b26eff',
  ttBlob:'3ea3704fa4e73d48f746f89f9521d1117b8bbe7e',
  twBlob:'35cfbdceaf5267f0290890606c5d3e21446e8fc2'
};

const STAGES=['transaction','federal_cash_custody','public_account_booking','distribution'];
const bodySha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const gitBlobSha=buffer=>crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`,'utf8')).update(buffer).digest('hex');
const semanticSha=value=>bodySha(Buffer.from(JSON.stringify(value),'utf8'));
const clone=value=>JSON.parse(JSON.stringify(value));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=message=>{throw new Error(message)};
const object=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const text=(value,min=1)=>typeof value==='string'&&value.trim().length>=min&&!value.includes('\0');
const sha1=value=>typeof value==='string'&&/^[0-9a-f]{40}$/.test(value);
const sha256=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const nonnegativeInteger=value=>Number.isInteger(value)&&value>=0;
const positiveInteger=value=>Number.isInteger(value)&&value>0;
const requireTrue=(value,label)=>{if(value!==true)fail(`${label} must be true`)};
const requireFalse=(value,label)=>{if(value!==false)fail(`${label} must be false`)};
const requireFields=(value,fields,label)=>{
  if(!object(value))fail(`${label} must be an object`);
  for(const field of fields)if(!Object.hasOwn(value,field))fail(`${label} missing ${field}`);
};
const requireExactKeys=(value,keys,label)=>{
  requireFields(value,keys,label);
  const actual=Object.keys(value).sort();
  const expected=[...keys].sort();
  if(!same(actual,expected))fail(`${label} field denominator drift`);
};
const parseJson=(buffer,label)=>{
  try{return JSON.parse(buffer.toString('utf8'))}
  catch(error){fail(`${label} invalid JSON: ${error.message}`)}
};
const checkSemantic=(value,field,expected,label)=>{
  const copy=clone(value),declared=copy[field];
  delete copy[field];
  if(declared!==expected)fail(`${label} declared semantic checksum drift`);
  if(semanticSha(copy)!==expected)fail(`${label} semantic checksum drift`);
};
const httpsUrl=value=>{
  if(!text(value,8))return false;
  try{return new URL(value).protocol==='https:'}catch{return false}
};
const normalizeHost=value=>typeof value==='string'?value.trim().toLowerCase().replace(/\.$/,''):null;
const authorityIdentity=value=>{
  if(!text(value))return null;
  try{
    const parsed=new URL(`https://${value}`),host=normalizeHost(parsed.hostname),port=Number(parsed.port||443);
    return host&&Number.isInteger(port)&&port>0&&port<=65535?{host,port,key:`${host}:${port}`}:null;
  }catch{return null}
};
const originIdentity=value=>{
  if(!httpsUrl(value))return null;
  try{
    const parsed=new URL(value),host=normalizeHost(parsed.hostname),port=Number(parsed.port||443);
    return host&&Number.isInteger(port)&&port>0&&port<=65535?{host,port,key:`${host}:${port}`}:null;
  }catch{return null}
};
const authorityHost=value=>authorityIdentity(value)?.host??null;
const originHost=value=>originIdentity(value)?.host??null;
const sanMatches=(host,san)=>{
  const normalized=normalizeHost(san);
  if(!host||!normalized)return false;
  if(normalized===host)return true;
  if(!normalized.startsWith('*.'))return false;
  const suffix=normalized.slice(1);
  return host.endsWith(suffix)&&host.slice(0,-suffix.length).length>0&&!host.slice(0,-suffix.length).includes('.');
};
const NS_PER_SECOND=1_000_000_000n;
const secondsToNanoseconds=value=>{
  if(!finite(value))return null;
  const scaled=Math.round(value*1e9);
  if(!Number.isSafeInteger(scaled))fail('seconds value exceeds nanosecond precision bound');
  return BigInt(scaled);
};
const nanosecondsToSeconds=value=>Number(value)/1e9;
const nearlyEqual=(left,right,tolerance=1e-9)=>finite(left)&&finite(right)&&Math.abs(left-right)<=tolerance;

export const parseUtc=value=>{
  if(typeof value!=='string')return null;
  const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$/.exec(value);
  if(!match)return null;
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
  const hour=Number(match[4]),minute=Number(match[5]),second=Number(match[6]);
  if(year<1970||month<1||month>12||day<1||hour>23||minute>59||second>59)return null;
  const days=new Date(Date.UTC(year,month,0)).getUTCDate();
  if(day>days)return null;
  const wholeSecondMillis=Date.UTC(year,month-1,day,hour,minute,second,0);
  if(!Number.isFinite(wholeSecondMillis))return null;
  const fractionalNanoseconds=BigInt((match[7]||'').padEnd(9,'0')||'0');
  return BigInt(wholeSecondMillis)*1_000_000n+fractionalNanoseconds;
};
const requireUtc=(value,label)=>{
  const parsed=parseUtc(value);
  if(parsed===null)fail(`${label} must be calendar-valid RFC3339 UTC`);
  return parsed;
};

const requireTextArray=(value,label,{nonempty=false}={})=>{
  if(!Array.isArray(value)||(nonempty&&value.length===0)||value.some(item=>!text(item)))fail(`${label} must be ${nonempty?'a nonempty ':''}array of nonempty strings`);
};
const requireTypedArray=(value,label,predicate,{nonempty=false}={})=>{
  if(!Array.isArray(value)||(nonempty&&value.length===0)||value.some((item,index)=>!predicate(item,index)))fail(`${label} contains an invalid entry`);
};
const requireBindingIdentity=(binding,label,loaded,relative)=>{
  requireFields(binding,['path','blob_sha','body_sha256','content_type','schema_version'],label);
  if(binding.path!==relative||binding.blob_sha!==loaded.blob||binding.body_sha256!==loaded.body||!text(binding.content_type,3)||!text(binding.schema_version))fail(`${label} does not cross-bind exact outer receipt bytes`);
};

const inside=(root,target)=>target===root||target.startsWith(`${root}${path.sep}`);
const ensureAbsoluteNoSymlinkComponents=(target,label)=>{
  const absolute=path.resolve(target),parsed=path.parse(absolute);
  let current=parsed.root;
  for(const segment of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    current=path.join(current,segment);
    if(!fs.existsSync(current))fail(`${label} missing: ${absolute}`);
    if(fs.lstatSync(current).isSymbolicLink())fail(`${label} contains symlink ancestor: ${absolute}`);
  }
};
const realRoot=(root,label='receipt root')=>{
  const absolute=path.resolve(root);
  ensureAbsoluteNoSymlinkComponents(absolute,label);
  const stat=fs.lstatSync(absolute);
  if(stat.isSymbolicLink()||!stat.isDirectory())fail(`${label} must be a non-symlink directory`);
  return fs.realpathSync(absolute);
};
const ensureNoSymlinkComponents=(base,relative,label)=>{
  let current=base;
  for(const segment of relative.split('/')){
    current=path.join(current,segment);
    if(!fs.existsSync(current))fail(`${label} missing: ${relative}`);
    const stat=fs.lstatSync(current);
    if(stat.isSymbolicLink())fail(`${label} contains symlink component: ${relative}`);
  }
};
const safeRepositoryFile=(receiptRoot,relative,{prefix,label,excludePrefix=null})=>{
  if(!text(relative)||relative.includes('\\')||path.posix.normalize(relative)!==relative||relative.startsWith('/')||relative.split('/').includes('..'))fail(`${label} unsafe repository path`);
  if(!relative.startsWith(prefix))fail(`${label} outside declared prefix ${prefix}`);
  if(excludePrefix&&relative.startsWith(excludePrefix))fail(`${label} may not use control-stack prefix`);
  ensureNoSymlinkComponents(receiptRoot,relative,label);
  const target=path.resolve(receiptRoot,...relative.split('/'));
  const prefixRoot=path.resolve(receiptRoot,...prefix.split('/').filter(Boolean));
  const receiptReal=realRoot(receiptRoot);
  const targetReal=fs.realpathSync(target);
  const prefixReal=fs.realpathSync(prefixRoot);
  if(!inside(receiptReal,targetReal)||!inside(prefixReal,targetReal))fail(`${label} realpath escapes declared prefix`);
  const stat=fs.lstatSync(target);
  if(stat.isSymbolicLink()||!stat.isFile())fail(`${label} must be a regular file`);
  return target;
};
const listStackFiles=(receiptRoot,stackRoot,stackPrefix)=>{
  if(!fs.existsSync(stackRoot))return[];
  const rootReal=realRoot(receiptRoot,'receipt repository root');
  const stackReal=realRoot(stackRoot,'control-stack root');
  if(!inside(rootReal,stackReal))fail('control-stack root escapes receipt root');
  const stackRelative=path.relative(path.resolve(receiptRoot),path.resolve(stackRoot));
  if(stackRelative.startsWith('..')||path.isAbsolute(stackRelative))fail('control-stack root escapes receipt root');
  ensureNoSymlinkComponents(path.resolve(receiptRoot),stackRelative.split(path.sep).join('/'),'control-stack root');
  const out=[];
  const walk=directory=>{
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
      const target=path.join(directory,entry.name);
      const stat=fs.lstatSync(target);
      if(stat.isSymbolicLink())fail('symlinked control-stack receipt');
      if(stat.isDirectory())walk(target);
      else if(stat.isFile()){
        if(!entry.name.endsWith('.json'))fail('non-JSON file in control-stack receipt root');
        const relative=path.relative(receiptRoot,target).split(path.sep).join('/');
        if(!relative.startsWith(stackPrefix))fail('control-stack file outside declared prefix');
        out.push({target,relative});
      }else fail('unsupported control-stack filesystem object');
    }
  };
  walk(stackRoot);
  return out.sort((a,b)=>a.relative.localeCompare(b.relative));
};
const loadExact=(receiptRoot,relative,options)=>{
  const target=safeRepositoryFile(receiptRoot,relative,options);
  const buffer=fs.readFileSync(target);
  return{target,buffer,blob:gitBlobSha(buffer),body:bodySha(buffer)};
};
const verifyRawDigestFile=(receiptRoot,relative,digest,label,prefix,excludePrefix,claimObject=null)=>{
  if(!sha256(digest))fail(`${label} digest invalid`);
  const loaded=loadExact(receiptRoot,relative,{prefix,label,excludePrefix});
  if(loaded.body!==digest)fail(`${label} body checksum drift`);
  if(claimObject)claimObject(relative,loaded.blob,loaded.body,label);
  return loaded;
};
const verifyJsonDigestFile=(receiptRoot,relative,digest,label,prefix,excludePrefix,claimObject=null)=>{
  const loaded=verifyRawDigestFile(receiptRoot,relative,digest,label,prefix,excludePrefix,claimObject);
  return{...loaded,value:parseJson(loaded.buffer,label)};
};
const nonemptyArray=(value,label)=>{
  if(!Array.isArray(value)||value.length===0)fail(`${label} must be a nonempty array`);
};

const validateRawBinding=(binding,label,ctx,expectedContentType=null)=>{
  requireFields(binding,['path','blob_sha','body_sha256','content_type'],label);
  if(!sha1(binding.blob_sha)||!sha256(binding.body_sha256)||!text(binding.content_type,3))fail(`${label} binding identity invalid`);
  if(expectedContentType&&binding.content_type!==expectedContentType)fail(`${label} content type drift`);
  const loaded=loadExact(ctx.receiptRoot,binding.path,{prefix:ctx.sourcePrefix,label,excludePrefix:ctx.stackPrefix});
  if(loaded.blob!==binding.blob_sha||loaded.body!==binding.body_sha256)fail(`${label} exact-byte custody drift`);
  ctx.claimObject(binding.path,binding.blob_sha,binding.body_sha256,label);
  return loaded;
};
const validateJsonBinding=(binding,label,ctx,schemaVersion,objectClass)=>{
  requireFields(binding,['path','blob_sha','body_sha256','schema_version'],label);
  if(!sha1(binding.blob_sha)||!sha256(binding.body_sha256)||binding.schema_version!==schemaVersion)fail(`${label} binding identity invalid`);
  const loaded=loadExact(ctx.receiptRoot,binding.path,{prefix:ctx.sourcePrefix,label,excludePrefix:ctx.stackPrefix});
  if(loaded.blob!==binding.blob_sha||loaded.body!==binding.body_sha256)fail(`${label} exact-byte custody drift`);
  const value=parseJson(loaded.buffer,label);
  if(value.schema_version!==schemaVersion||value.object_class!==objectClass)fail(`${label} schema or object-class drift`);
  ctx.claimObject(binding.path,binding.blob_sha,binding.body_sha256,label);
  return{...loaded,value};
};
const validateEvidenceItem=(item,label,ctx)=>{
  requireFields(item,['evidence_role','source_url','source_locator','body_binding'],label);
  if(!text(item.evidence_role)||!httpsUrl(item.source_url)||!text(item.source_locator))fail(`${label} identity invalid`);
  validateRawBinding(item.body_binding,`${label} body`,ctx);
};
const validateProvenance=(receipt,stage,ctx)=>{
  requireFields(receipt,ctx.pc.stage_receipt_required_fields,'provenance source receipt');
  for(const field of ['receipt_id','event_chain_id','stage','source_authority','authority_identifier_scheme','source_authority_identifier','source_record_identifier','source_record_class'])if(!text(receipt[field]))fail(`provenance ${field} invalid`);
  if(stage==='transaction'){
    if(receipt.predecessor_stage_receipt_id!==null)fail('transaction provenance predecessor must be null');
  }else if(!text(receipt.predecessor_stage_receipt_id))fail('later-stage provenance predecessor must be nonempty');
  for(const field of ['source_origin_body_sha256','source_custody_body_sha256','origin_evidence_sha256','acquisition_receipt_sha256'])if(!sha256(receipt[field]))fail(`provenance ${field} invalid`);
  if(receipt.source_origin_body_sha256!==receipt.source_custody_body_sha256)fail('provenance origin/custody checksum mismatch');
  if(!ctx.pc.source_identity_rules.allowed_source_record_classes.includes(receipt.source_record_class))fail('provenance source record class invalid');
  requireTrue(receipt.provenance_object_custody_complete,'provenance_object_custody_complete');
  requireTrue(receipt.stage_admissible,'provenance stage_admissible');

  const sourceBody=validateRawBinding(receipt.source_body_custody,'source body custody',ctx);
  if(sourceBody.body!==receipt.source_origin_body_sha256)fail('source body checksum does not match provenance receipt');

  const authorityRule=ctx.pc.provenance_object_bindings.authority_resolution_receipt;
  const authority=validateJsonBinding(receipt.authority_resolution_receipt,'authority-resolution receipt',ctx,authorityRule.schema_version,authorityRule.object_class);
  requireFields(authority.value,authorityRule.required_fields,'authority-resolution receipt');
  if(authority.value.source_authority!==receipt.source_authority||authority.value.authority_identifier_scheme!==receipt.authority_identifier_scheme||authority.value.source_authority_identifier!==receipt.source_authority_identifier)fail('authority-resolution identity mismatch');
  if(!authorityRule.allowed_identifier_schemes.includes(authority.value.authority_identifier_scheme)||!authorityRule.allowed_verification_methods.includes(authority.value.verification_method))fail('authority-resolution method invalid');
  requireTextArray(authority.value.official_origin_hosts,'official origin hosts',{nonempty:true});
  requireTextArray(authority.value.official_record_system_identifiers,'official record-system identifiers',{nonempty:true});
  nonemptyArray(authority.value.evidence_items,'authority evidence items');
  requireUtc(authority.value.observed_at_utc,'authority observed_at_utc');
  authority.value.evidence_items.forEach((item,index)=>validateEvidenceItem(item,`authority evidence item ${index}`,ctx));

  const originRule=ctx.pc.provenance_object_bindings.origin_evidence_receipt;
  const origin=validateJsonBinding(receipt.origin_evidence_receipt,'origin-evidence receipt',ctx,originRule.schema_version,originRule.object_class);
  requireFields(origin.value,originRule.required_fields,'origin-evidence receipt');
  for(const field of ['source_authority','authority_identifier_scheme','source_authority_identifier','source_record_identifier','source_record_class'])if(origin.value[field]!==receipt[field])fail(`origin-evidence ${field} mismatch`);
  if(!httpsUrl(origin.value.source_origin_url)||!text(origin.value.source_origin_content_type)||origin.value.source_origin_body_sha256!==receipt.source_origin_body_sha256)fail('origin-evidence source identity invalid');
  const sourceOriginObserved=requireUtc(origin.value.source_origin_observed_at_utc,'origin source observation time');
  ctx.expectedRoleTimes.set('source_origin_observation',sourceOriginObserved);
  if(!originRule.allowed_origin_verification_modes.includes(origin.value.origin_verification_mode))fail('origin verification mode invalid');
  if(origin.value.authority_resolution_receipt_body_sha256!==authority.body)fail('origin/authority cross-binding drift');
  nonemptyArray(origin.value.origin_evidence_items,'origin evidence items');
  origin.value.origin_evidence_items.forEach((item,index)=>validateEvidenceItem(item,`origin evidence item ${index}`,ctx));

  const acquisitionRule=ctx.pc.provenance_object_bindings.acquisition_receipt;
  const acquisition=validateJsonBinding(receipt.acquisition_receipt,'acquisition receipt',ctx,acquisitionRule.schema_version,acquisitionRule.object_class);
  requireFields(acquisition.value,acquisitionRule.required_fields,'acquisition receipt');
  if(!httpsUrl(acquisition.value.requested_url)||!httpsUrl(acquisition.value.resolved_url)||!Array.isArray(acquisition.value.redirect_chain))fail('acquisition URL or redirect-chain invalid');
  for(const [index,hop] of acquisition.value.redirect_chain.entries()){
    requireFields(hop,['requested_url','resolved_url','response_status','location','observed_at_utc'],`acquisition redirect hop ${index}`);
    if(!httpsUrl(hop.requested_url)||!httpsUrl(hop.resolved_url)||!Number.isInteger(hop.response_status)||hop.response_status<300||hop.response_status>399||!text(hop.location))fail(`acquisition redirect hop ${index} invalid`);
    requireUtc(hop.observed_at_utc,`acquisition redirect hop ${index} observed_at_utc`);
  }
  if(!Number.isInteger(acquisition.value.response_status)||acquisition.value.response_status<100||acquisition.value.response_status>599)fail('acquisition response status invalid');
  if(!acquisitionRule.allowed_request_methods.includes(acquisition.value.request_method)||acquisition.value.request_contains_credentials!==false)fail('acquisition request not anonymous GET');
  requireUtc(acquisition.value.observed_at_utc,'acquisition observed_at_utc');
  if(!text(acquisition.value.content_type)||!nonnegativeInteger(acquisition.value.body_length_bytes)||acquisition.value.source_origin_body_sha256!==receipt.source_origin_body_sha256)fail('acquisition body identity invalid');
  if(acquisition.value.body_length_bytes!==sourceBody.buffer.length||acquisition.value.content_type!==receipt.source_body_custody.content_type||acquisition.value.resolved_url!==origin.value.source_origin_url)fail('acquisition body length, content type, or resolved origin mismatch');
  if(!acquisitionRule.allowed_acquisition_methods.includes(acquisition.value.acquisition_method)||!text(acquisition.value.acquisition_tool)||!text(acquisition.value.acquisition_tool_version))fail('acquisition method/tool invalid');
  if(acquisition.value.authority_resolution_receipt_body_sha256!==authority.body||acquisition.value.origin_evidence_receipt_body_sha256!==origin.body)fail('acquisition provenance cross-binding drift');
  validateRawBinding(acquisition.value.request_headers_custody,'request headers custody',ctx,acquisitionRule.request_headers_content_type);
  validateRawBinding(acquisition.value.response_headers_custody,'response headers custody',ctx,acquisitionRule.response_headers_content_type);
  validateRawBinding(acquisition.value.tls_peer_certificate_custody,'TLS certificate custody',ctx,acquisitionRule.tls_peer_certificate_content_type);
  if(receipt.origin_evidence_sha256!==origin.body||receipt.acquisition_receipt_sha256!==acquisition.body)fail('provenance nested receipt digest mismatch');
  ctx.provenanceReceipt=receipt;
};

const requirePass=value=>value===true||value==='pass'||value==='valid'||value==='validated';
const validateConnection=(receipt,stage,ctx)=>{
  const rule=ctx.cc.effective_stage_connection_authentication[stage];
  requireFields(receipt,rule.required_fields,'connection source receipt');
  if(receipt.connection_authentication_receipt_id!==receipt.receipt_id||!text(receipt.receipt_id)||!text(receipt.event_chain_id))fail('connection receipt identity mismatch');
  const connectionObserved=requireUtc(receipt.connection_authentication_observed_at_utc,'connection observed_at_utc');
  if(!ctx.cc.connection_authentication_rules.allowed_connection_reuse_states.includes(receipt.connection_reuse_state))fail('connection reuse state invalid');
  if(!Array.isArray(receipt.redirect_hop_connection_receipts))fail('redirect-hop receipts must be an array');
  if(!object(receipt.source_origin_authority_reconciliation)||receipt.source_origin_authority_reconciliation.result!=='pass')fail('source-origin authority reconciliation must pass');
  if(receipt.repository_blob_sha_if_used!==null&&receipt.repository_blob_sha_if_used!==undefined&&!sha1(receipt.repository_blob_sha_if_used))fail('connection repository blob invalid');
  requireTrue(receipt.connection_authentication_complete,'connection_authentication_complete');

  const sourcePrefix=ctx.sourcePrefix,stackPrefix=ctx.stackPrefix,root=ctx.receiptRoot;
  const dns=verifyJsonDigestFile(root,receipt.dns_resolution_custody_locator,receipt.dns_resolution_receipt_sha256,'DNS receipt',sourcePrefix,stackPrefix,ctx.claimObject).value;
  const cr=ctx.cc.connection_authentication_rules;
  requireFields(dns,cr.dns_receipt_required_fields,'DNS receipt');
  for(const field of ['query_name','query_type','query_class','resolver_identity','resolver_transport','dnssec_state'])if(!text(dns[field]))fail(`DNS ${field} invalid`);
  if(!(text(dns.response_rcode)||Number.isInteger(dns.response_rcode)))fail('DNS response_rcode invalid');
  requireTextArray(dns.cname_chain,'DNS CNAME chain');
  requireTypedArray(dns.answer_rrsets,'DNS answer RRsets',item=>text(item)||(object(item)&&Object.keys(item).length>0&&Object.values(item).every(value=>value!==null&&value!==undefined)),{nonempty:true});
  if(!cr.allowed_resolver_transports.includes(dns.resolver_transport)||!cr.allowed_dnssec_states.includes(dns.dnssec_state))fail('DNS typed semantics invalid');
  const dnsObserved=requireUtc(dns.observed_at_utc,'DNS observed_at_utc'),dnsExpiry=requireUtc(dns.expires_at_utc,'DNS expires_at_utc');
  if(dnsExpiry<=dnsObserved)fail('DNS expiry must follow observation');
  ctx.expectedRoleTimes.set('dns_observation',dnsObserved);
  ctx.expectedRoleTimes.set('dns_expiry',dnsExpiry);
  const wire=verifyRawDigestFile(root,dns.wire_response_custody_locator,dns.wire_response_sha256,'DNS wire response',sourcePrefix,stackPrefix,ctx.claimObject);
  if(!positiveInteger(dns.wire_response_length_bytes)||wire.buffer.length!==dns.wire_response_length_bytes)fail('DNS wire length mismatch');
  verifyRawDigestFile(root,dns.canonical_response_custody_locator,dns.canonical_response_sha256,'DNS canonical response',sourcePrefix,stackPrefix,ctx.claimObject);

  const endpoint=verifyJsonDigestFile(root,receipt.network_endpoint_custody_locator,receipt.network_endpoint_receipt_sha256,'network endpoint receipt',sourcePrefix,stackPrefix,ctx.claimObject).value;
  requireFields(endpoint,cr.network_endpoint_receipt_required_fields,'network endpoint receipt');
  if(!text(endpoint.address_family)||!cr.allowed_transport_protocols.includes(endpoint.transport_protocol)||!text(endpoint.remote_ip)||!positiveInteger(endpoint.remote_port)||endpoint.remote_port>65535)fail('network endpoint identity invalid');
  const started=requireUtc(endpoint.connection_started_at_utc,'connection start'),established=requireUtc(endpoint.connection_established_at_utc,'connection established'),closed=requireUtc(endpoint.connection_closed_at_utc,'connection closed');
  if(established<started||closed<established)fail('connection chronology invalid');
  ctx.expectedRoleTimes.set('connection_started',started);
  ctx.expectedRoleTimes.set('connection_established',established);
  ctx.expectedRoleTimes.set('connection_closed',closed);
  verifyRawDigestFile(root,endpoint.socket_endpoint_custody_locator,endpoint.socket_endpoint_observation_sha256,'socket endpoint observation',sourcePrefix,stackPrefix,ctx.claimObject);

  const proxy=verifyJsonDigestFile(root,receipt.proxy_chain_custody_locator,receipt.proxy_chain_receipt_sha256,'proxy-chain receipt',sourcePrefix,stackPrefix,ctx.claimObject).value;
  requireFields(proxy,cr.proxy_receipt_required_fields,'proxy-chain receipt');
  if(!cr.allowed_proxy_modes.includes(proxy.proxy_mode)||!Array.isArray(proxy.proxy_chain)||!text(proxy.target_authority)||!text(proxy.connect_or_tunnel_state)||!text(proxy.proxy_authentication_scope))fail('proxy-chain semantics invalid');
  requireTypedArray(proxy.proxy_chain,'proxy-chain intermediaries',item=>object(item)&&Object.keys(item).length>0&&Object.values(item).every(value=>value!==null&&value!==undefined));
  if(proxy.proxy_mode==='direct'&&(proxy.proxy_chain.length!==0||proxy.proxy_authentication_scope!=='none'))fail('direct proxy mode must have an empty chain and no proxy authentication');
  if(proxy.proxy_mode!=='direct'&&proxy.proxy_chain.length===0)fail('non-direct proxy mode must preserve at least one intermediary');
  verifyRawDigestFile(root,proxy.proxy_chain_custody_locator,proxy.proxy_chain_sha256,'proxy-chain evidence',sourcePrefix,stackPrefix,ctx.claimObject);

  const tls=verifyJsonDigestFile(root,receipt.tls_peer_custody_locator,receipt.tls_peer_receipt_sha256,'TLS peer receipt',sourcePrefix,stackPrefix,ctx.claimObject).value;
  requireFields(tls,cr.tls_peer_receipt_required_fields,'TLS peer receipt');
  if(!text(tls.server_name_indication)||!text(tls.alpn_negotiated)||!text(tls.tls_version)||!text(tls.cipher_suite)||!text(tls.key_exchange_group)||!text(tls.session_resumption_state))fail('TLS negotiation semantics invalid');
  requireTextArray(tls.alpn_offered,'TLS ALPN offers',{nonempty:true});
  nonemptyArray(tls.peer_certificate_chain,'TLS peer certificate chain');
  requireTextArray(tls.subject_alternative_names,'TLS subject alternative names',{nonempty:true});
  if(!sha256(tls.leaf_certificate_der_sha256)||!sha256(tls.leaf_spki_sha256)||!text(tls.hostname_verification_input)||!requirePass(tls.hostname_verification_result))fail('TLS hostname/certificate identity invalid');
  if(!text(tls.trust_store_identifier)||!sha256(tls.trust_store_sha256)||!text(tls.validation_policy_identifier)||!requirePass(tls.certificate_chain_validation_result))fail('TLS trust validation invalid');
  const notBefore=requireUtc(tls.certificate_not_before_utc,'certificate not-before'),notAfter=requireUtc(tls.certificate_not_after_utc,'certificate not-after');
  if(notAfter<=notBefore)fail('certificate validity interval invalid');
  if(!ctx.repair.connection_receipt_hardening.allowed_revocation_evidence_states.includes(tls.revocation_evidence_state)||!ctx.repair.connection_receipt_hardening.allowed_certificate_transparency_evidence_states.includes(tls.certificate_transparency_evidence_state))fail('TLS revocation or CT evidence non-pass');
  for(const role of ['tls_validation','certificate_validity_check','revocation_evidence_observation','certificate_transparency_evidence_observation'])ctx.expectedRoleTimes.set(role,connectionObserved);
  for(const [index,certificate] of tls.peer_certificate_chain.entries()){
    requireFields(certificate,cr.certificate_chain_entry_required_fields,`certificate ${index}`);
    if(certificate.position!==index||!sha256(certificate.der_sha256)||!positiveInteger(certificate.der_length_bytes)||!text(certificate.subject)||!text(certificate.issuer)||!text(certificate.serial_number))fail(`certificate ${index} identity invalid`);
    const certNotBefore=requireUtc(certificate.not_before_utc,`certificate ${index} not-before`);
    const certNotAfter=requireUtc(certificate.not_after_utc,`certificate ${index} not-after`);
    if(certNotAfter<=certNotBefore)fail(`certificate ${index} validity interval invalid`);
    const der=verifyRawDigestFile(root,certificate.der_custody_locator,certificate.der_sha256,`certificate ${index} DER`,sourcePrefix,stackPrefix,ctx.claimObject);
    if(der.buffer.length!==certificate.der_length_bytes)fail(`certificate ${index} DER length mismatch`);
  }
  const leaf=tls.peer_certificate_chain[0];
  if(leaf.der_sha256!==tls.leaf_certificate_der_sha256||leaf.not_before_utc!==tls.certificate_not_before_utc||leaf.not_after_utc!==tls.certificate_not_after_utc)fail('TLS leaf certificate cross-binding drift');
  verifyRawDigestFile(root,tls.tls_transcript_custody_locator,tls.tls_transcript_sha256,'TLS transcript',sourcePrefix,stackPrefix,ctx.claimObject);

  const protocol=verifyJsonDigestFile(root,receipt.application_protocol_custody_locator,receipt.application_protocol_receipt_sha256,'application-protocol receipt',sourcePrefix,stackPrefix,ctx.claimObject).value;
  requireFields(protocol,cr.application_protocol_receipt_required_fields,'application-protocol receipt');
  if(!text(protocol.negotiated_http_version)||!sha256(protocol.pseudo_header_projection_sha256)||!requirePass(protocol.request_envelope_reconciliation_result)||!text(protocol.connection_coalescing_state)||!sha256(protocol.application_protocol_receipt_sha256)||!text(protocol.application_protocol_custody_locator))fail('application-protocol semantics invalid');
  requireTypedArray(protocol.authenticated_origin_set,'authenticated origin set',httpsUrl,{nonempty:true});
  const lowerVersion=protocol.negotiated_http_version.toLowerCase();
  let applicationAuthorityValue=null;
  if(lowerVersion==='h2'||lowerVersion==='h3'||lowerVersion.includes('http/2')||lowerVersion.includes('http/3')){
    requireExactKeys(protocol.http2_or_http3_pseudo_headers_if_used,[':method',':scheme',':authority',':path'],'HTTP/2 or HTTP/3 pseudo headers');
    for(const field of [':method',':scheme',':authority',':path'])if(!text(protocol.http2_or_http3_pseudo_headers_if_used[field]))fail(`pseudo header ${field} invalid`);
    if(protocol.http2_or_http3_pseudo_headers_if_used[':scheme'].toLowerCase()!=='https')fail('HTTP/2 or HTTP/3 scheme must be https');
    applicationAuthorityValue=protocol.http2_or_http3_pseudo_headers_if_used[':authority'];
    if(protocol.http1_host_header_if_used!==null)fail('HTTP/2 or HTTP/3 receipt may not use an HTTP/1 Host field');
  }else if(lowerVersion.includes('http/1')){
    if(!text(protocol.http1_host_header_if_used)||protocol.http2_or_http3_pseudo_headers_if_used!==null)fail('HTTP/1 protocol fields invalid');
    applicationAuthorityValue=protocol.http1_host_header_if_used;
  }else fail('unsupported negotiated HTTP version');
  const applicationAuthority=authorityIdentity(applicationAuthorityValue),proxyAuthority=authorityIdentity(proxy.target_authority);
  if(!applicationAuthority||!proxyAuthority)fail('application authority invalid');
  const tlsSni=normalizeHost(tls.server_name_indication),verificationHost=normalizeHost(tls.hostname_verification_input);
  if(applicationAuthority.host!==tlsSni||applicationAuthority.host!==verificationHost||applicationAuthority.key!==proxyAuthority.key||applicationAuthority.port!==endpoint.remote_port)fail('application authority does not match authenticated TLS, endpoint, or proxy target');
  if(!tls.subject_alternative_names.some(san=>sanMatches(applicationAuthority.host,san)))fail('application authority absent from certificate SANs');
  if(!protocol.authenticated_origin_set.some(origin=>originIdentity(origin)?.key===applicationAuthority.key))fail('application authority absent from authenticated origin set');
  verifyRawDigestFile(root,protocol.application_protocol_custody_locator,protocol.application_protocol_receipt_sha256,'application-protocol evidence',sourcePrefix,stackPrefix,ctx.claimObject);
  if(protocol.connection_coalescing_state!==receipt.connection_reuse_state)fail('application-protocol connection-reuse state mismatch');
  if(receipt.connection_reuse_state==='new_connection'){
    if(protocol.connection_reuse_predecessor_receipt_id!==null)fail('new connection may not name a reuse predecessor');
  }else if(!text(protocol.connection_reuse_predecessor_receipt_id))fail('reused or coalesced connection requires a predecessor receipt');

  verifyRawDigestFile(root,receipt.connection_authentication_custody_locator,receipt.connection_authentication_receipt_sha256,'connection-authentication summary',sourcePrefix,stackPrefix,ctx.claimObject);
  const hopIds=new Set();
  for(const [index,hop] of receipt.redirect_hop_connection_receipts.entries()){
    requireFields(hop,cr.redirect_hop_required_fields,`redirect hop ${index}`);
    if(hop.hop_index!==index||!text(hop.request_envelope_receipt_id)||!text(hop.connection_authentication_receipt_id)||!httpsUrl(hop.requested_url)||!httpsUrl(hop.resolved_url)||!Number.isInteger(hop.response_status)||hop.response_status<300||hop.response_status>399||!text(hop.location))fail(`redirect hop ${index} invalid`);
    if(hopIds.has(hop.connection_authentication_receipt_id))fail('redirect hop connection receipt identifier reused');
    hopIds.add(hop.connection_authentication_receipt_id);
    requireUtc(hop.observed_at_utc,`redirect hop ${index} observed_at_utc`);
  }
};

const validateClockSourceProfile=(clock,clockClass,ctx)=>{
  const profile=ctx.oc.clock_source_profile_rules[clockClass];
  if(!profile)fail('unknown clock-source profile');
  requireFields(clock,profile.required_fields,'clock-source receipt');
  const root=ctx.receiptRoot,prefix=ctx.sourcePrefix,exclude=ctx.stackPrefix;
  if(clockClass==='authenticated_nts_ntp_clock'){
    if(!text(clock.server_identity)||!sha256(clock.nts_cookie_or_session_receipt_sha256)||!positiveInteger(clock.stratum)||clock.stratum>16||!finite(clock.root_delay_seconds)||clock.root_delay_seconds<0||!finite(clock.root_dispersion_seconds)||clock.root_dispersion_seconds<0||!text(clock.reference_identifier)||!finite(clock.offset_seconds)||!finite(clock.round_trip_delay_seconds)||clock.round_trip_delay_seconds<0||!finite(clock.poll_interval_seconds)||clock.poll_interval_seconds<=0||!sha256(clock.sample_set_sha256))fail('authenticated NTS/NTP clock profile invalid');
    requireUtc(clock.reference_time_utc,'clock reference_time_utc');
  }else if(clockClass==='trusted_hardware_clock_attestation'){
    if(!text(clock.device_identifier)||!text(clock.firmware_or_tcb_identifier)||!text(clock.attestation_format)||!sha256(clock.attestation_body_sha256)||!text(clock.attestation_custody_locator)||!finite(clock.secure_clock_counter)||clock.secure_clock_counter<0||!(text(clock.counter_epoch_binding)||object(clock.counter_epoch_binding)))fail('hardware clock attestation profile invalid');
    verifyRawDigestFile(root,clock.attestation_custody_locator,clock.attestation_body_sha256,'hardware clock attestation',prefix,exclude,ctx.claimObject);
  }else if(clockClass==='source_native_signed_timestamp'){
    if(!text(clock.source_record_identifier)||!text(clock.signed_timestamp_field_locator)||!sha256(clock.signature_or_digest_manifest_sha256)||!requirePass(clock.signature_validation_result)||!finite(clock.source_timestamp_resolution_seconds)||clock.source_timestamp_resolution_seconds<=0)fail('source-native signed timestamp profile invalid');
  }else if(clockClass==='rfc3161_trusted_timestamp_authority'){
    if(!text(clock.tsa_authority_identifier)||!sha256(clock.message_imprint_sha256)||!sha256(clock.timestamp_token_sha256)||!text(clock.timestamp_token_custody_locator)||!text(clock.policy_oid)||!text(clock.serial_number)||!requirePass(clock.certificate_path_validation_result))fail('RFC 3161 clock profile invalid');
    requireUtc(clock.generation_time_utc,'RFC 3161 generation_time_utc');
    verifyRawDigestFile(root,clock.timestamp_token_custody_locator,clock.timestamp_token_sha256,'RFC 3161 timestamp token',prefix,exclude,ctx.claimObject);
  }else if(clockClass==='dual_independent_authenticated_clocks'){
    if(!sha256(clock.clock_a_receipt_sha256)||!sha256(clock.clock_b_receipt_sha256)||!text(clock.clock_a_authority_identifier)||!text(clock.clock_b_authority_identifier)||clock.clock_a_authority_identifier===clock.clock_b_authority_identifier||!finite(clock.maximum_allowed_disagreement_seconds)||clock.maximum_allowed_disagreement_seconds<0||!finite(clock.observed_disagreement_seconds)||clock.observed_disagreement_seconds<0||clock.observed_disagreement_seconds>clock.maximum_allowed_disagreement_seconds)fail('dual authenticated clock profile invalid');
  }
  return profile;
};

const validateObservation=(receipt,stage,ctx)=>{
  const rule=ctx.oc.effective_stage_observation_time_custody[stage];
  requireFields(receipt,rule.required_fields,'observation-time source receipt');
  for(const field of ['observation_time_receipt_id','receipt_id','event_chain_id','clock_source_class','clock_source_identifier','clock_source_authority','clock_source_authority_identifier','synchronization_state','monotonic_clock_identifier','freshness_policy_identifier'])if(!text(receipt[field]))fail(`observation ${field} invalid`);
  if(receipt.observation_time_receipt_id!==receipt.receipt_id)fail('observation receipt identifier mismatch');
  for(const field of ['observation_time_observed_at_utc','synchronization_observed_at_utc','wall_clock_start_utc','wall_clock_end_utc','freshness_evaluation_observed_at_utc'])requireUtc(receipt[field],`observation ${field}`);
  const outerFreshnessEvaluation=requireUtc(receipt.freshness_evaluation_observed_at_utc,'outer freshness evaluation time');
  ctx.expectedRoleTimes.set('freshness_evaluation',outerFreshnessEvaluation);
  if(receipt.holdover_started_at_utc!==null&&receipt.holdover_started_at_utc!==undefined)requireUtc(receipt.holdover_started_at_utc,'holdover_started_at_utc');
  if(!ctx.oc.time_receipt_contract.allowed_clock_source_classes.includes(receipt.clock_source_class)||!ctx.oc.time_receipt_contract.allowed_synchronization_states.includes(receipt.synchronization_state))fail('observation clock source or synchronization state invalid');
  if(!finite(receipt.clock_resolution_seconds)||receipt.clock_resolution_seconds<=0||!finite(receipt.clock_offset_seconds)||!finite(receipt.clock_uncertainty_seconds)||receipt.clock_uncertainty_seconds<=0||!finite(receipt.clock_drift_bound_ppm)||receipt.clock_drift_bound_ppm<0)fail('observation clock numeric bounds invalid');
  ctx.clockOffsetNanoseconds=secondsToNanoseconds(receipt.clock_offset_seconds);
  ctx.clockUncertaintyNanoseconds=secondsToNanoseconds(receipt.clock_uncertainty_seconds);
  if(!finite(receipt.monotonic_sample_start)||!finite(receipt.monotonic_sample_end)||receipt.monotonic_sample_end<receipt.monotonic_sample_start)fail('observation monotonic interval invalid');
  if(!Array.isArray(receipt.clock_adjustment_events))fail('clock adjustment events must be an array');
  if(!ctx.oc.time_receipt_contract.allowed_leap_second_states.includes(receipt.leap_second_state)||receipt.leap_second_state==='unknown'||!ctx.oc.time_receipt_contract.allowed_leap_smear_policies.includes(receipt.leap_smear_policy))fail('observation leap state or smear policy invalid');
  if(receipt.freshness_result!=='pass'||!object(receipt.temporal_order_reconciliation)||receipt.temporal_order_reconciliation.result!=='pass')fail('observation freshness or temporal reconciliation non-pass');
  if(receipt.clock_source_repository_blob_sha_if_used!==null&&receipt.clock_source_repository_blob_sha_if_used!==undefined&&!sha1(receipt.clock_source_repository_blob_sha_if_used))fail('clock-source repository blob invalid');
  if(receipt.time_receipt_repository_blob_sha_if_used!==null&&receipt.time_receipt_repository_blob_sha_if_used!==undefined&&!sha1(receipt.time_receipt_repository_blob_sha_if_used))fail('time-receipt repository blob invalid');
  requireTrue(receipt.observation_time_custody_complete,'observation_time_custody_complete');

  const root=ctx.receiptRoot,prefix=ctx.sourcePrefix,exclude=ctx.stackPrefix;
  const wallStart=requireUtc(receipt.wall_clock_start_utc,'observation wall-clock start'),wallEnd=requireUtc(receipt.wall_clock_end_utc,'observation wall-clock end');
  if(wallEnd<wallStart)fail('observation wall-clock interval inverted');
  const clockLoaded=verifyJsonDigestFile(root,receipt.clock_source_custody_locator,receipt.clock_source_receipt_sha256,'clock-source receipt',prefix,exclude,ctx.claimObject);
  const clock=clockLoaded.value;
  validateClockSourceProfile(clock,receipt.clock_source_class,ctx);
  const syncLoaded=verifyJsonDigestFile(root,receipt.synchronization_custody_locator,receipt.synchronization_receipt_sha256,'synchronization receipt',prefix,exclude,ctx.claimObject);
  const sync=syncLoaded.value;
  requireFields(sync,ctx.repair.observation_receipt_hardening.synchronization_receipt_required_fields,'synchronization receipt');
  if(sync.synchronization_state!==receipt.synchronization_state||sync.observed_at_utc!==receipt.synchronization_observed_at_utc||sync.offset_seconds!==receipt.clock_offset_seconds||sync.uncertainty_seconds!==receipt.clock_uncertainty_seconds||!requirePass(sync.result)||!finite(sync.offset_seconds)||!finite(sync.uncertainty_seconds)||sync.uncertainty_seconds<=0||!sha256(sync.evidence_sha256)||!text(sync.evidence_custody_locator))fail('synchronization receipt non-pass, untyped, or mismatched');
  requireUtc(sync.observed_at_utc,'synchronization receipt observed_at_utc');
  verifyRawDigestFile(root,sync.evidence_custody_locator,sync.evidence_sha256,'synchronization evidence',prefix,exclude,ctx.claimObject);
  const mappingLoaded=verifyJsonDigestFile(root,receipt.wall_to_monotonic_mapping_custody_locator,receipt.wall_to_monotonic_mapping_sha256,'wall-to-monotonic mapping',prefix,exclude,ctx.claimObject);
  const mapping=mappingLoaded.value;
  requireFields(mapping,ctx.oc.monotonic_mapping_rules.mapping_required_fields,'wall-to-monotonic mapping');
  if(!text(mapping.mapping_version)||mapping.monotonic_clock_identifier!==receipt.monotonic_clock_identifier||mapping.monotonic_sample_start!==receipt.monotonic_sample_start||mapping.monotonic_sample_end!==receipt.monotonic_sample_end||mapping.wall_clock_start_utc!==receipt.wall_clock_start_utc||mapping.wall_clock_end_utc!==receipt.wall_clock_end_utc||!finite(mapping.offset_seconds)||!finite(mapping.uncertainty_seconds)||mapping.uncertainty_seconds<=0||!sha256(mapping.mapping_body_sha256)||!text(mapping.mapping_custody_locator))fail('wall-to-monotonic mapping mismatch or untyped evidence');
  verifyRawDigestFile(root,mapping.mapping_custody_locator,mapping.mapping_body_sha256,'wall-to-monotonic mapping evidence',prefix,exclude,ctx.claimObject);
  for(const [index,event] of receipt.clock_adjustment_events.entries()){
    requireFields(event,ctx.oc.clock_adjustment_event_rules.required_fields,`clock adjustment event ${index}`);
    if(!text(event.event_id)||!ctx.oc.clock_adjustment_event_rules.allowed_event_types.includes(event.event_type)||!finite(event.magnitude_seconds)||!finite(event.pre_event_offset_seconds)||!finite(event.post_event_offset_seconds)||!sha256(event.evidence_sha256)||!text(event.evidence_custody_locator))fail(`clock adjustment event ${index} invalid`);
    requireUtc(event.observed_at_utc,`clock adjustment event ${index} observed_at_utc`);
    verifyRawDigestFile(root,event.evidence_custody_locator,event.evidence_sha256,`clock adjustment event ${index} evidence`,prefix,exclude,ctx.claimObject);
  }
  const timeLoaded=verifyJsonDigestFile(root,receipt.time_receipt_custody_locator,receipt.time_receipt_sha256,'trusted-time receipt',prefix,exclude,ctx.claimObject);
  const time=timeLoaded.value;
  requireFields(time,ctx.oc.time_receipt_contract.required_fields,'trusted-time receipt');
  if(time.schema_version!==ctx.oc.time_receipt_contract.schema_version||time.object_class!==ctx.oc.time_receipt_contract.object_class||time.receipt_id!==receipt.receipt_id||time.event_chain_id!==receipt.event_chain_id||time.stage!==stage||time.clock_source_class!==receipt.clock_source_class||time.clock_source_identifier!==receipt.clock_source_identifier||time.clock_source_authority!==receipt.clock_source_authority||time.clock_source_authority_identifier!==receipt.clock_source_authority_identifier||time.synchronization_state!==receipt.synchronization_state||time.monotonic_clock_identifier!==receipt.monotonic_clock_identifier||time.monotonic_sample_start!==receipt.monotonic_sample_start||time.monotonic_sample_end!==receipt.monotonic_sample_end||time.wall_clock_start_utc!==receipt.wall_clock_start_utc||time.wall_clock_end_utc!==receipt.wall_clock_end_utc||time.leap_second_state!==receipt.leap_second_state||time.leap_smear_policy!==receipt.leap_smear_policy||time.holdover_started_at_utc!==receipt.holdover_started_at_utc||time.observed_at_utc!==receipt.observation_time_observed_at_utc)fail('trusted-time receipt identity or outer-field mismatch');
  for(const field of ['clock_resolution_seconds','clock_offset_seconds','clock_uncertainty_seconds','clock_drift_bound_ppm'])if(time[field]!==receipt[field])fail(`trusted-time receipt ${field} mismatch`);
  if(!Array.isArray(time.clock_adjustment_events)||!same(time.clock_adjustment_events,receipt.clock_adjustment_events)||!Array.isArray(time.source_observation_bindings)||!Array.isArray(time.freshness_evaluations)||!object(time.temporal_order_reconciliation)||time.temporal_order_reconciliation.result!=='pass')fail('trusted-time receipt nested array or temporal state invalid');
  requireUtc(time.observed_at_utc,'trusted-time receipt observed_at_utc');
  const requiredTimeRoles=ctx.oc.temporal_reconciliation_rules.required_time_roles;
  if(time.source_observation_bindings.length!==requiredTimeRoles.length)fail('trusted-time source-observation role denominator drift');
  for(const [index,binding] of time.source_observation_bindings.entries()){
    requireFields(binding,ctx.repair.observation_receipt_hardening.source_observation_binding_required_fields,`source-observation binding ${index}`);
    if(!requiredTimeRoles.includes(binding.role)||ctx.sourceObservationByRole.has(binding.role)||!text(binding.receipt_id)||!sha256(binding.body_sha256)||!text(binding.custody_locator))fail(`source-observation binding ${index} invalid or duplicated`);
    const observed=requireUtc(binding.observed_at_utc,`source-observation binding ${index} observed_at_utc`);
    const expected=ctx.expectedRoleTimes.get(binding.role);
    if(expected!==undefined&&observed!==expected)fail(`source-observation binding ${binding.role} contradicts the bound source receipt`);
    const evidence=verifyRawDigestFile(root,binding.custody_locator,binding.body_sha256,`source-observation binding ${index} evidence`,prefix,exclude,ctx.claimObject);
    ctx.claimReceiptId(binding.receipt_id,`source-observation ${binding.role} receipt id`);
    ctx.sourceObservationByRole.set(binding.role,{...binding,observed,blob_sha:evidence.blob});
  }
  if(!same([...ctx.sourceObservationByRole.keys()].sort(),[...requiredTimeRoles].sort()))fail('trusted-time source-observation role denominator drift');
  requireBindingIdentity(time.clock_source_receipt_binding,'trusted-time clock-source binding',clockLoaded,receipt.clock_source_custody_locator);
  requireBindingIdentity(time.synchronization_receipt_binding,'trusted-time synchronization binding',syncLoaded,receipt.synchronization_custody_locator);
  requireBindingIdentity(time.wall_to_monotonic_mapping_binding,'trusted-time mapping binding',mappingLoaded,receipt.wall_to_monotonic_mapping_custody_locator);
  const freshnessLoaded=verifyJsonDigestFile(root,receipt.freshness_policy_custody_locator,receipt.freshness_policy_sha256,'freshness policy',prefix,exclude,ctx.claimObject);
  const freshness=freshnessLoaded.value;
  requireFields(freshness,ctx.oc.freshness_policy_rules.policy_required_fields,'freshness policy');
  if(freshness.policy_id!==receipt.freshness_policy_identifier||!text(freshness.policy_version)||!text(freshness.time_role)||!finite(freshness.maximum_age_seconds)||freshness.maximum_age_seconds<0||!text(freshness.reference_time_role)||freshness.uncertainty_treatment!=='interval_bounds'||!text(freshness.failure_action)||!sha256(freshness.policy_body_sha256)||!text(freshness.policy_custody_locator))fail('freshness policy identity or typed semantics invalid');
  verifyRawDigestFile(root,freshness.policy_custody_locator,freshness.policy_body_sha256,'freshness policy evidence',prefix,exclude,ctx.claimObject);
  requireBindingIdentity(time.freshness_policy_binding,'trusted-time freshness-policy binding',freshnessLoaded,receipt.freshness_policy_custody_locator);
  if(time.freshness_evaluations.length===0)fail('trusted-time receipt requires at least one freshness evaluation');
  let matchedOuterEvaluation=false;
  for(const [index,evaluation] of time.freshness_evaluations.entries()){
    requireFields(evaluation,ctx.oc.freshness_policy_rules.evaluation_required_fields,`freshness evaluation ${index}`);
    if(evaluation.policy_id!==freshness.policy_id||!text(evaluation.subject_receipt_id)||!text(evaluation.reference_receipt_id)||!object(evaluation.subject_interval)||!object(evaluation.reference_interval)||!finite(evaluation.computed_age_lower_bound_seconds)||!finite(evaluation.computed_age_upper_bound_seconds)||evaluation.computed_age_upper_bound_seconds<evaluation.computed_age_lower_bound_seconds||evaluation.result!=='pass'||!sha256(evaluation.evaluation_body_sha256)||!text(evaluation.evaluation_custody_locator))fail(`freshness evaluation ${index} invalid`);
    const subjectLower=requireUtc(evaluation.subject_interval.lower_bound_utc,`freshness evaluation ${index} subject lower bound`);
    const subjectUpper=requireUtc(evaluation.subject_interval.upper_bound_utc,`freshness evaluation ${index} subject upper bound`);
    const referenceLower=requireUtc(evaluation.reference_interval.lower_bound_utc,`freshness evaluation ${index} reference lower bound`);
    const referenceUpper=requireUtc(evaluation.reference_interval.upper_bound_utc,`freshness evaluation ${index} reference upper bound`);
    if(subjectUpper<subjectLower||referenceUpper<referenceLower)fail(`freshness evaluation ${index} interval inverted`);
    const subjectBinding=ctx.sourceObservationByRole.get(freshness.time_role),referenceBinding=ctx.sourceObservationByRole.get(freshness.reference_time_role);
    if(!subjectBinding||!referenceBinding||evaluation.subject_receipt_id!==subjectBinding.receipt_id||evaluation.reference_receipt_id!==referenceBinding.receipt_id)fail(`freshness evaluation ${index} does not bind the policy roles to source-observation receipts`);
    const subjectCenter=subjectBinding.observed+ctx.clockOffsetNanoseconds,referenceCenter=referenceBinding.observed+ctx.clockOffsetNanoseconds;
    if(subjectLower!==subjectCenter-ctx.clockUncertaintyNanoseconds||subjectUpper!==subjectCenter+ctx.clockUncertaintyNanoseconds||referenceLower!==referenceCenter-ctx.clockUncertaintyNanoseconds||referenceUpper!==referenceCenter+ctx.clockUncertaintyNanoseconds)fail(`freshness evaluation ${index} intervals do not reproduce the bound observation-time receipts`);
    const computedLower=nanosecondsToSeconds(referenceLower-subjectUpper);
    const computedUpper=nanosecondsToSeconds(referenceUpper-subjectLower);
    if(!nearlyEqual(evaluation.computed_age_lower_bound_seconds,computedLower)||!nearlyEqual(evaluation.computed_age_upper_bound_seconds,computedUpper))fail(`freshness evaluation ${index} age bounds do not recompute`);
    if(computedLower<0||computedUpper>freshness.maximum_age_seconds)fail(`freshness evaluation ${index} violates the bound maximum-age policy`);
    const evaluated=requireUtc(evaluation.evaluated_at_utc,`freshness evaluation ${index} evaluated_at_utc`);
    if(evaluated!==outerFreshnessEvaluation||evaluated<referenceLower||evaluated>referenceUpper)fail(`freshness evaluation ${index} time does not bind the outer trusted-time receipt`);
    matchedOuterEvaluation=true;
    verifyRawDigestFile(root,evaluation.evaluation_custody_locator,evaluation.evaluation_body_sha256,`freshness evaluation ${index} evidence`,prefix,exclude,ctx.claimObject);
  }
  if(!matchedOuterEvaluation)fail('outer freshness evaluation time is not represented in the trusted-time receipt');
};

const validateTemporal=(receipt,stage,ctx)=>{
  requireFields(receipt,ctx.repair.source_receipt_hardening.temporal_source_required_fields,'temporal-reconciliation source receipt');
  if(receipt.temporal_reconciliation_result!=='pass'||!object(receipt.temporal_order_reconciliation)||receipt.temporal_order_reconciliation.result!=='pass')fail('temporal-reconciliation result must pass');
  if(!text(receipt.temporal_reconciliation_policy_identifier)||!sha256(receipt.temporal_reconciliation_policy_sha256)||!text(receipt.temporal_reconciliation_policy_custody_locator))fail('temporal policy binding invalid');
  const evaluated=requireUtc(receipt.temporal_reconciliation_evaluated_at_utc,'temporal reconciliation evaluated_at_utc');
  nonemptyArray(receipt.temporal_intervals,'temporal intervals');
  const requiredRoles=ctx.oc.temporal_reconciliation_rules.required_time_roles;
  if(ctx.sourceObservationByRole.size!==requiredRoles.length)fail('temporal reconciliation lacks the complete bound source-observation denominator');
  const intervalFields=ctx.repair.temporal_receipt_hardening.temporal_interval_required_fields;
  const intervals=new Map();
  let maximumUpper=null;
  for(const [index,interval] of receipt.temporal_intervals.entries()){
    requireExactKeys(interval,intervalFields,`temporal interval ${index}`);
    if(!requiredRoles.includes(interval.role)||intervals.has(interval.role))fail(`temporal interval ${index} role invalid or duplicated`);
    if(!text(interval.receipt_id)||!sha256(interval.body_sha256)||!text(interval.custody_locator))fail(`temporal interval ${index} source binding invalid`);
    const source=ctx.sourceObservationByRole.get(interval.role);
    if(!source||interval.receipt_id!==source.receipt_id||interval.body_sha256!==source.body_sha256||interval.custody_locator!==source.custody_locator)fail(`temporal interval ${index} does not bind the trusted source-observation receipt`);
    const lower=requireUtc(interval.lower_bound_utc,`temporal interval ${index} lower bound`),upper=requireUtc(interval.upper_bound_utc,`temporal interval ${index} upper bound`);
    if(upper<lower)fail(`temporal interval ${index} bounds inverted`);
    const corrected=source.observed+ctx.clockOffsetNanoseconds;
    const expectedLower=corrected-ctx.clockUncertaintyNanoseconds,expectedUpper=corrected+ctx.clockUncertaintyNanoseconds;
    if(lower!==expectedLower||upper!==expectedUpper)fail(`temporal interval ${index} does not reproduce the bound observation-time uncertainty interval`);
    intervals.set(interval.role,{lower,upper,source});
    if(maximumUpper===null||upper>maximumUpper)maximumUpper=upper;
  }
  if(!same([...intervals.keys()].sort(),[...requiredRoles].sort()))fail('temporal interval role denominator drift');
  if(evaluated<maximumUpper)fail('temporal reconciliation evaluated before an interval completed');
  const definitelyBefore=(left,right)=>left.upper<right.lower;
  if(definitelyBefore(intervals.get('request_sent'),intervals.get('connection_established')))fail('request definitely predates connection establishment');
  if(definitelyBefore(intervals.get('response_headers_received'),intervals.get('request_sent')))fail('response headers definitely predate request');
  if(definitelyBefore(intervals.get('response_body_completed'),intervals.get('response_headers_received')))fail('response body definitely predates response headers');
  if(definitelyBefore(intervals.get('connection_closed'),intervals.get('response_body_completed')))fail('connection close definitely predates response body completion');
  if(definitelyBefore(intervals.get('dns_expiry'),intervals.get('request_sent')))fail('DNS answer definitely expired before request');
  const policy=verifyJsonDigestFile(ctx.receiptRoot,receipt.temporal_reconciliation_policy_custody_locator,receipt.temporal_reconciliation_policy_sha256,'temporal-reconciliation policy',ctx.sourcePrefix,ctx.stackPrefix,ctx.claimObject).value;
  if(policy.temporal_reconciliation_policy_identifier!==receipt.temporal_reconciliation_policy_identifier||policy.result!=='pass')fail('temporal-reconciliation policy non-pass or mismatched');
  requireTrue(receipt.temporal_reconciliation_complete,'temporal_reconciliation_complete');
};

export function validateStageStack(input){
  const {raw,repair,policy,liveContract,liveRegistry,legacyRegistry,pc,cc,oc,tc,receiptRoot,stackRoot}=input;
  const sourcePrefix=repair.source_receipt_hardening.source_receipt_path_prefix;
  const stackPrefix=repair.source_receipt_hardening.control_stack_receipt_path_prefix;
  const globalReceiptIds=new Set(),globalObjectPaths=new Set(),globalObjectBlobs=new Set(),globalObjectBodies=new Set();
  const claimUnique=(set,value,label)=>{if(set.has(value))fail(`${label} reused across control stacks`);set.add(value)};
  const ctx={
    repair,pc,cc,oc,tc,receiptRoot,sourcePrefix,stackPrefix,
    claimObject:(relative,blobValue,bodyValue,label)=>{
      claimUnique(globalObjectPaths,relative,`${label} path`);
      claimUnique(globalObjectBlobs,blobValue,`${label} blob`);
      claimUnique(globalObjectBodies,bodyValue,`${label} body digest`);
    },
    claimReceiptId:(receiptId,label)=>claimUnique(globalReceiptIds,receiptId,label)
  };

  if(repair.schema_version!=='m05-answerable-power-s03-l7-intel-realization-stage-receipt-control-stack-postmerge-repair@1'||repair.status!=='intel_realization_stage_receipt_control_stack_postmerge_repair_frozen')fail('repair identity drift');
  if(repair.canonical_base?.sha!=='9fa0827e2b9cbf6e105469b48128c58f1a30d532'||repair.predecessor?.pull_request!==2203)fail('repair canonical base or predecessor drift');
  if(repair.predecessor?.policy?.blob_sha!==EXPECTED.policyBlob||repair.predecessor?.live_registry_contract?.blob_sha!==EXPECTED.liveContractBlob)fail('repair predecessor binding drift');

  if(policy.schema_version!=='m05-answerable-power-s03-l7-intel-realization-stage-receipt-control-stack-amendment@1'||policy.status!=='intel_realization_stage_receipt_control_stack_amendment_frozen')fail('policy identity drift');
  if(liveContract.schema_version!=='m05-answerable-power-s03-l7-intel-realization-stage-receipt-live-registry-contract@1'||liveContract.status!=='intel_realization_stage_receipt_live_registry_contract_frozen'||!same(liveContract.stage_order,STAGES))fail('live contract identity drift');
  if(liveContract.policy_binding?.blob_sha!==EXPECTED.policyBlob||liveContract.legacy_registry_baseline?.blob_sha!==EXPECTED.legacyRegistryBlob)fail('live contract binding drift');
  if(legacyRegistry.schema_version!=='m05-answerable-power-s03-l7-intel-realization-stage-receipt-registry@1'||legacyRegistry.receipts?.length!==0)fail('legacy registry drift');

  if(liveRegistry.schema_version!==liveContract.live_registry.schema_version||liveRegistry.object_class!=='bounded_intel_realization_live_stage_receipt_control_stack_registry'||liveRegistry.program_id!=='M-05'||liveRegistry.sprint_id!=='M05-SPRINT-03'||liveRegistry.leg_id!=='S03-L7'||liveRegistry.issue!==345||liveRegistry.status!=='intel_realization_live_control_stack_registry_waiting_for_ordinary_gate'||!same(liveRegistry.stage_order,STAGES)||liveRegistry.ordinary_gate_utc!==liveContract.ordinary_gate_utc)fail('live registry identity drift');
  const expectedPolicyBinding={path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-live-registry-contract.json',schema_version:'m05-answerable-power-s03-l7-intel-realization-stage-receipt-live-registry-contract@1',semantic_sha256:EXPECTED.liveContractSemantic};
  const expectedLegacyBinding={path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-registry.json',blob_sha:EXPECTED.legacyRegistryBlob,schema_version:'m05-answerable-power-s03-l7-intel-realization-stage-receipt-registry@1',bytes_remain_frozen:true};
  if(!same(liveRegistry.policy_binding,expectedPolicyBinding)||!same(liveRegistry.legacy_registry_binding,expectedLegacyBinding))fail('live registry binding drift');
  if(typeof liveRegistry.as_of!=='string'||parseUtc(`${liveRegistry.as_of}T00:00:00Z`)===null)fail('live registry as_of drift');
  if(!Array.isArray(liveRegistry.receipts))fail('live registry receipts must be an array');
  const gate=requireUtc(liveContract.ordinary_gate_utc,'ordinary gate');

  const entryFields=[...liveContract.registry_entry_contract.required_fields,...repair.registry_entry_hardening.additional_required_fields];
  const entries=new Map(),eventStages=new Map(),stackIds=new Set(),entryPaths=new Set(),entryBlobs=new Set(),entryBodies=new Set();
  for(const entry of liveRegistry.receipts){
    requireFields(entry,entryFields,'registry entry');
    for(const field of ['registry_receipt_id','event_chain_id','control_stack_receipt_id','control_stack_receipt_path'])if(!text(entry[field]))fail(`registry entry ${field} invalid`);
    if(!STAGES.includes(entry.stage)||!sha1(entry.control_stack_receipt_blob_sha)||!sha256(entry.control_stack_receipt_body_sha256))fail('registry entry stage or stack digest invalid');
    const registered=requireUtc(entry.registered_at_utc,'registry registered_at_utc');
    if(registered<gate)fail('registry receipt before ordinary gate');
    if(entry.stage==='transaction'){
      if(entry.predecessor_registry_receipt_id!==null)fail('transaction predecessor must be null');
    }else if(!text(entry.predecessor_registry_receipt_id))fail('later-stage predecessor must be nonempty');
    if(entries.has(entry.registry_receipt_id))fail('duplicate registry receipt id');
    if(stackIds.has(entry.control_stack_receipt_id))fail('duplicate registry control-stack receipt id');
    if(entryPaths.has(entry.control_stack_receipt_path)||entryBlobs.has(entry.control_stack_receipt_blob_sha)||entryBodies.has(entry.control_stack_receipt_body_sha256))fail('duplicate registry exact-stack binding');
    const key=`${entry.event_chain_id}\0${entry.stage}`;
    if(eventStages.has(key))fail('duplicate registry event-stage');
    entries.set(entry.registry_receipt_id,entry);
    eventStages.set(key,entry);
    stackIds.add(entry.control_stack_receipt_id);
    entryPaths.add(entry.control_stack_receipt_path);
    entryBlobs.add(entry.control_stack_receipt_blob_sha);
    entryBodies.add(entry.control_stack_receipt_body_sha256);
  }

  const stackFiles=listStackFiles(receiptRoot,stackRoot,stackPrefix);
  const stacks=new Map(),stackEventStages=new Set();
  for(const {target,relative} of stackFiles){
    const buffer=fs.readFileSync(target),value=parseJson(buffer,'control-stack receipt');
    requireFields(value,liveContract.control_stack_receipt_contract.required_fields,'control-stack receipt');
    if(value.schema_version!==liveContract.control_stack_receipt_contract.schema_version||value.object_class!==liveContract.control_stack_receipt_contract.object_class)fail('control-stack receipt identity drift');
    for(const field of ['control_stack_receipt_id','registry_receipt_id','event_chain_id'])if(!text(value[field]))fail(`control-stack ${field} invalid`);
    if(!STAGES.includes(value.stage))fail('control-stack stage invalid');
    requireUtc(value.observed_at_utc,'control-stack observed_at_utc');
    const key=`${value.event_chain_id}\0${value.stage}`;
    if(stacks.has(value.control_stack_receipt_id)||stackEventStages.has(key))fail('duplicate control-stack receipt identity');
    stacks.set(value.control_stack_receipt_id,{value,buffer,relative,blob:gitBlobSha(buffer),body:bodySha(buffer)});
    stackEventStages.add(key);
  }
  if(entries.size!==stacks.size)fail('registry/control-stack cardinality mismatch');

  const roles=[
    ['provenance_stage_receipt_binding','provenance_object_custody',validateProvenance],
    ['connection_authentication_receipt_binding','connection_authentication',validateConnection],
    ['observation_time_receipt_binding','observation_time_custody',validateObservation],
    ['temporal_reconciliation_receipt_binding','temporal_reconciliation_admission',validateTemporal]
  ];
  const validated=[];
  for(const entry of entries.values()){
    const record=stacks.get(entry.control_stack_receipt_id);
    if(!record)fail('orphan registry entry');
    const stack=record.value;
    if(entry.control_stack_receipt_path!==record.relative||entry.control_stack_receipt_blob_sha!==record.blob||entry.control_stack_receipt_body_sha256!==record.body)fail('registry exact control-stack byte binding drift');
    if(stack.registry_receipt_id!==entry.registry_receipt_id||stack.event_chain_id!==entry.event_chain_id||stack.stage!==entry.stage)fail('registry/control-stack identity mismatch');
    if(requireUtc(entry.registered_at_utc,'registry registered_at_utc')<requireUtc(stack.observed_at_utc,'control-stack observed_at_utc'))fail('registry entry predates the bound control-stack receipt');
    if(stack.temporal_reconciliation_result!=='pass')fail('control-stack temporal result non-pass');
    requireTrue(stack.all_bindings_valid,'all_bindings_valid');
    requireTrue(stack.full_control_stack_complete,'full_control_stack_complete');
    requireTrue(stack.stage_admissible,'stage_admissible');

    const stackCtx={...ctx,expectedRoleTimes:new Map(),sourceObservationByRole:new Map(),roleSources:{},connectionEvidence:{}};
    const localPaths=new Set(),localBlobs=new Set(),localBodies=new Set(),localIds=new Set();
    for(const [field,role,roleValidator] of roles){
      const binding=stack[field];
      requireFields(binding,liveContract.control_stack_receipt_contract.binding_required_fields,`${role} binding`);
      for(const name of ['path','schema_version','receipt_id','event_chain_id','stage'])if(!text(binding[name]))fail(`${role} ${name} invalid`);
      if(!sha1(binding.blob_sha)||!sha256(binding.body_sha256)||binding.event_chain_id!==stack.event_chain_id||binding.stage!==stack.stage)fail(`${role} binding identity or chain/stage mismatch`);
      if(localPaths.has(binding.path)||localBlobs.has(binding.blob_sha)||localBodies.has(binding.body_sha256)||localIds.has(binding.receipt_id))fail('one source object fills multiple control roles');
      localPaths.add(binding.path);localBlobs.add(binding.blob_sha);localBodies.add(binding.body_sha256);localIds.add(binding.receipt_id);
      stackCtx.claimReceiptId(binding.receipt_id,'source receipt id');
      const loaded=loadExact(receiptRoot,binding.path,{prefix:sourcePrefix,label:`${role} source receipt`,excludePrefix:stackPrefix});
      if(loaded.blob!==binding.blob_sha||loaded.body!==binding.body_sha256)fail(`${role} source custody drift`);
      stackCtx.claimObject(binding.path,binding.blob_sha,binding.body_sha256,`${role} source receipt`);
      const source=parseJson(loaded.buffer,`${role} source receipt`);
      requireFields(source,liveContract.source_receipt_overlay_fields.required_fields,`${role} source overlay`);
      if(source.schema_version!==binding.schema_version||source.receipt_id!==binding.receipt_id||source.event_chain_id!==binding.event_chain_id||source.stage!==binding.stage||source.control_role!==role||source.control_result!=='pass')fail(`${role} source identity or result drift`);
      stackCtx.roleSources[role]=source;
      roleValidator(source,stack.stage,stackCtx);
    }
    validated.push({entry,stack,context:stackCtx});
  }
  for(const id of stacks.keys())if(![...entries.values()].some(entry=>entry.control_stack_receipt_id===id))fail('orphan control-stack receipt');

  const predecessorStage={federal_cash_custody:'transaction',public_account_booking:'federal_cash_custody',distribution:'public_account_booking'};
  const validatedByRegistryId=new Map(validated.map(item=>[item.entry.registry_receipt_id,item]));
  for(const current of validated){
    const {entry,context}=current;
    const provenance=context.roleSources.provenance_object_custody;
    if(entry.stage==='transaction'){
      if(provenance.predecessor_stage_receipt_id!==null)fail('transaction provenance predecessor must be null');
      continue;
    }
    const priorEntry=entries.get(entry.predecessor_registry_receipt_id);
    const prior=validatedByRegistryId.get(entry.predecessor_registry_receipt_id);
    if(!priorEntry||!prior||priorEntry.event_chain_id!==entry.event_chain_id||priorEntry.stage!==predecessorStage[entry.stage])fail('later stage missing immediate predecessor in same event chain');
    const priorProvenance=prior.context.roleSources.provenance_object_custody;
    if(provenance.predecessor_stage_receipt_id!==priorProvenance.receipt_id)fail('provenance predecessor does not match prior stage receipt in event chain');
  }

  const stageState=Object.fromEntries(STAGES.map(stage=>[stage,validated.some(({entry})=>entry.stage===stage)]));
  const derived={
    registered_stage_receipts:entries.size,
    registered_control_stack_receipts:stacks.size,
    fully_bound_control_stack_receipts:validated.length,
    passing_temporal_reconciliations:validated.length,
    transaction_admissible:stageState.transaction,
    federal_cash_custody_admissible:stageState.federal_cash_custody,
    public_account_booking_admissible:stageState.public_account_booking,
    distribution_admissible:stageState.distribution,
    answer_change_authorized:false
  };
  if(!same(liveRegistry.observed_state,derived))fail('live registry observed-state drift');
  const boundaryFields=repair.boundary_hardening.required_live_registry_boundary_fields;
  requireExactKeys(liveRegistry.boundaries,boundaryFields,'live registry boundaries');
  for(const field of boundaryFields){
    if(field==='graph_effect'){
      if(liveRegistry.boundaries[field]!=='none')fail('live registry graph effect drift');
    }else requireFalse(liveRegistry.boundaries[field],`live registry boundary ${field}`);
  }
  return{
    validator:'m05-intel-stage-receipt-control-stack-postmerge-repair',
    ...derived,
    issue_345_may_close:false
  };
}

const readRuntime=()=>{
  const immutableKeys=['repair','policy','liveContract','legacyRegistry','pc','pv','pt','pw','cc','cv','ct','cw','oc','ov','ot','ow','tc','tv','tt','tw'];
  const raw={};
  for(const key of [...immutableKeys,'liveRegistry'])raw[key]=fs.readFileSync(PATHS[key]);
  const expectedBlobs={
    repair:EXPECTED.repairBlob,policy:EXPECTED.policyBlob,liveContract:EXPECTED.liveContractBlob,legacyRegistry:EXPECTED.legacyRegistryBlob,
    pc:EXPECTED.pcBlob,pv:EXPECTED.pvBlob,pt:EXPECTED.ptBlob,pw:EXPECTED.pwBlob,
    cc:EXPECTED.ccBlob,cv:EXPECTED.cvBlob,ct:EXPECTED.ctBlob,cw:EXPECTED.cwBlob,
    oc:EXPECTED.ocBlob,ov:EXPECTED.ovBlob,ot:EXPECTED.otBlob,ow:EXPECTED.owBlob,
    tc:EXPECTED.tcBlob,tv:EXPECTED.tvBlob,tt:EXPECTED.ttBlob,tw:EXPECTED.twBlob
  };
  for(const [key,expected] of Object.entries(expectedBlobs))if(gitBlobSha(raw[key])!==expected)fail(`${key} Git object drift`);
  const repair=parseJson(raw.repair,'repair contract'),policy=parseJson(raw.policy,'policy'),liveContract=parseJson(raw.liveContract,'live contract'),liveRegistry=parseJson(raw.liveRegistry,'live registry'),legacyRegistry=parseJson(raw.legacyRegistry,'legacy registry'),pc=parseJson(raw.pc,'provenance contract'),cc=parseJson(raw.cc,'connection contract'),oc=parseJson(raw.oc,'observation contract'),tc=parseJson(raw.tc,'temporal contract');
  checkSemantic(repair,'stage_receipt_control_stack_postmerge_repair_sha256',EXPECTED.repairSemantic,'repair contract');
  checkSemantic(policy,'stage_receipt_control_stack_amendment_sha256',EXPECTED.policySemantic,'policy');
  checkSemantic(liveContract,'live_registry_contract_sha256',EXPECTED.liveContractSemantic,'live contract');
  checkSemantic(pc,'contract_sha256',EXPECTED.pcSemantic,'provenance contract');
  checkSemantic(cc,'connection_authentication_amendment_sha256',EXPECTED.ccSemantic,'connection contract');
  checkSemantic(oc,'observation_time_amendment_sha256',EXPECTED.ocSemantic,'observation contract');
  checkSemantic(tc,'temporal_reconciliation_admission_amendment_sha256',EXPECTED.tcSemantic,'temporal contract');
  const receiptRoot=path.resolve(process.env.M05_INTEL_RECEIPT_REPOSITORY_ROOT||ROOT);
  const stackRoot=path.resolve(process.env.M05_INTEL_CONTROL_STACK_RECEIPT_ROOT||path.join(receiptRoot,'receipts/m05/intel-realization/control-stack'));
  return{raw,repair,policy,liveContract,liveRegistry,legacyRegistry,pc,cc,oc,tc,receiptRoot,stackRoot};
};

export const main=()=>{
  const result=validateStageStack(readRuntime());
  process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
};

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main();
