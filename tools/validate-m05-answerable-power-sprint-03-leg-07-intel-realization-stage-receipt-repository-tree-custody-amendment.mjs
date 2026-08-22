#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CONTRACT_PATH=path.join(ROOT,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-repository-tree-custody-amendment.json');
const LIVE_REGISTRY_PATH=path.join(ROOT,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-registry.json');
const PREDECESSOR_VALIDATOR=path.join(ROOT,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.mjs');
const VALIDATOR_RELATIVE='tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-repository-tree-custody-amendment.mjs';

const EXPECTED={
  contractBlob:'c5bbabaf13d61d2cee4095d5e88bed83664010ab',
  contractSemantic:'77859aae9af48d5d8781ecdd3ab2c9eb0ca66313aea33f94444de893560e3871',
  predecessor:{
    repair_contract:'14decc6ed12383ca7395551c025edac06c446c5c',
    validator:'f011ce212a5b94a8d2557b8a88f12f30740b010e',
    adversarial_test:'159574dfe4cd3b86fddb8ff597ad7010b300f5b9',
    focused_workflow:'a97748f0a84c7f5a020b5c6e59aa471fcb5cd0de'
  }
};

const fail=message=>{throw new Error(message)};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=value=>typeof value==='string'&&value.length>0;
const sha1=value=>typeof value==='string'&&/^[0-9a-f]{40}$/.test(value);
const sha256=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const clone=value=>JSON.parse(JSON.stringify(value));
const bodySha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const gitBlobSha=buffer=>crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');
const parseJson=(buffer,label)=>{try{return JSON.parse(buffer)}catch{fail(`${label} invalid JSON`)}};
const requireExactKeys=(value,fields,label)=>{
  if(!object(value))fail(`${label} must be an object`);
  const actual=Object.keys(value).sort(),expected=[...fields].sort();
  if(!same(actual,expected))fail(`${label} field denominator drift`);
};
const checkSemantic=(value,field,expected,label)=>{
  const copy=clone(value),declared=copy[field];
  delete copy[field];
  const computed=bodySha(Buffer.from(JSON.stringify(copy),'utf8'));
  if(declared!==expected||computed!==expected)fail(`${label} semantic checksum drift`);
};

const sanitizedGitEnvironment=()=>{
  const env={...process.env};
  const exactKeys=[
    'GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_COMMON_DIR','GIT_NAMESPACE','GIT_PREFIX','GIT_SHALLOW_FILE','GIT_CONFIG_PARAMETERS',
    'GIT_CONFIG','GIT_CONFIG_GLOBAL','GIT_CONFIG_SYSTEM','GIT_CONFIG_COUNT','GIT_QUARANTINE_PATH',
    'GIT_CEILING_DIRECTORIES','GIT_DISCOVERY_ACROSS_FILESYSTEM','GIT_NO_LAZY_FETCH'
  ];
  for(const key of exactKeys)delete env[key];
  for(const key of Object.keys(env))if(/^GIT_CONFIG_(?:KEY|VALUE)_\d+$/.test(key))delete env[key];
  env.GIT_CONFIG_NOSYSTEM='1';
  env.GIT_CONFIG_GLOBAL=os.devNull;
  env.GIT_CONFIG_SYSTEM=os.devNull;
  env.GIT_NO_LAZY_FETCH='1';
  env.GIT_TERMINAL_PROMPT='0';
  env.GIT_NO_REPLACE_OBJECTS='1';
  env.GIT_LITERAL_PATHSPECS='1';
  env.GIT_OPTIONAL_LOCKS='0';
  env.GIT_PAGER='cat';
  env.LC_ALL='C';
  return env;
};
const runGit=(repositoryRoot,args,label,{binary=false,allowExitCodes=[0]}={})=>{
  const result=spawnSync('git',['-C',repositoryRoot,...args],{
    cwd:repositoryRoot,
    env:sanitizedGitEnvironment(),
    encoding:binary?null:'utf8',
    maxBuffer:64*1024*1024
  });
  if(result.error)fail(`${label}: ${result.error.message}`);
  if(!allowExitCodes.includes(result.status)){
    const stderr=Buffer.isBuffer(result.stderr)?result.stderr.toString('utf8'):String(result.stderr||'');
    fail(`${label}: git exited ${result.status}${stderr.trim()?` (${stderr.trim()})`:''}`);
  }
  return result;
};
const gitText=(repositoryRoot,args,label)=>runGit(repositoryRoot,args,label).stdout.trim();
const gitBuffer=(repositoryRoot,args,label)=>runGit(repositoryRoot,args,label,{binary:true}).stdout;

const normalizedRepositoryPath=(value,label)=>{
  if(!text(value)||value.includes('\\')||value.startsWith('/')||value.includes('\0')||path.posix.normalize(value)!==value||value.split('/').includes('..'))fail(`${label} is not a canonical repository path`);
  return value;
};
const normalizePrefix=(value,label)=>{
  normalizedRepositoryPath(value,label);
  if(!value.endsWith('/'))fail(`${label} must end with /`);
  return value;
};
const inside=(root,target)=>target===root||target.startsWith(`${root}${path.sep}`);
const assertNoSymlinkAncestors=(target,label)=>{
  const absolute=path.resolve(target),parsed=path.parse(absolute);
  let current=parsed.root;
  for(const segment of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    current=path.join(current,segment);
    if(!fs.existsSync(current))fail(`${label} missing: ${absolute}`);
    if(fs.lstatSync(current).isSymbolicLink())fail(`${label} contains a symlink component: ${absolute}`);
  }
};
const canonicalRepositoryRoot=repositoryRoot=>{
  const requested=path.resolve(repositoryRoot);
  assertNoSymlinkAncestors(requested,'repository root');
  const actual=path.resolve(gitText(requested,['rev-parse','--show-toplevel'],'resolve Git worktree root'));
  const requestedReal=fs.realpathSync(requested),actualReal=fs.realpathSync(actual);
  if(requestedReal!==actualReal)fail('receipt repository root must equal the Git worktree root');
  return actualReal;
};
const rejectGitMetadataOverrideFile=(target,label)=>{
  let stat;
  try{stat=fs.lstatSync(target)}catch(error){if(error?.code==='ENOENT')return;throw error}
  if(stat.isSymbolicLink()||!stat.isFile())fail(`${label} must not be a symlink or non-file object`);
  if(stat.size>0)fail(`${label} is not allowed for repository-tree custody validation`);
};
const isExternalObjectProviderConfig=name=>{
  if(name==='extensions.partialclone')return true;
  if(!name.startsWith('remote.'))return false;
  return name.endsWith('.promisor')||name.endsWith('.partialclonefilter');
};
const validateGitRepositoryIntegrity=root=>{
  const objectFormat=gitText(root,['rev-parse','--show-object-format'],'resolve Git object format');
  if(objectFormat!=='sha1')fail('repository-tree custody requires the SHA-1 Git object format');
  const shallow=gitText(root,['rev-parse','--is-shallow-repository'],'inspect shallow repository state');
  if(shallow!=='false')fail('repository-tree custody requires complete Git history');
  const effectiveConfigBuffer=gitBuffer(root,['config','-z','--includes','--show-scope','--show-origin','--name-only','--list'],'inspect effective Git configuration');
  const effectiveConfigFields=effectiveConfigBuffer.toString('utf8').split('\0');
  if(effectiveConfigFields.at(-1)==='')effectiveConfigFields.pop();
  if(effectiveConfigFields.length%3!==0)fail('effective Git configuration record denominator drift');
  const effectiveConfigNames=[];
  for(let index=2;index<effectiveConfigFields.length;index+=3)effectiveConfigNames.push(effectiveConfigFields[index].toLowerCase());
  if(effectiveConfigNames.some(isExternalObjectProviderConfig))fail('partial-clone and promisor object retrieval are not allowed');
  const replaceRefs=gitText(root,['for-each-ref','--format=%(refname)','refs/replace/'],'inspect Git replacement refs');
  if(replaceRefs)fail('Git replacement refs are not allowed');
  const commonDirRaw=gitText(root,['rev-parse','--git-common-dir'],'resolve Git common directory');
  const commonDir=path.isAbsolute(commonDirRaw)?path.resolve(commonDirRaw):path.resolve(root,commonDirRaw);
  assertNoSymlinkAncestors(commonDir,'Git common directory');
  rejectGitMetadataOverrideFile(path.join(commonDir,'info/grafts'),'Git grafts file');
  rejectGitMetadataOverrideFile(path.join(commonDir,'objects/info/alternates'),'Git object alternates file');
  rejectGitMetadataOverrideFile(path.join(commonDir,'objects/info/http-alternates'),'Git HTTP object alternates file');
  return gitText(root,['rev-parse','HEAD^{commit}'],'resolve validation HEAD');
};

const splitNulRecords=buffer=>{
  const records=[];
  let start=0;
  for(let index=0;index<buffer.length;index+=1){
    if(buffer[index]!==0)continue;
    if(index>start)records.push(buffer.subarray(start,index));
    start=index+1;
  }
  if(start!==buffer.length)fail('unterminated git ls-tree record');
  return records;
};
const parseTreeEntries=buffer=>{
  const entries=[];
  for(const record of splitNulRecords(buffer)){
    const tab=record.indexOf(9);
    if(tab<0)fail('malformed git ls-tree record');
    const metadata=record.subarray(0,tab).toString('ascii').split(' '),pathBytes=record.subarray(tab+1);
    if(metadata.length!==3)fail('malformed git ls-tree metadata');
    const repositoryPath=pathBytes.toString('utf8');
    if(!Buffer.from(repositoryPath,'utf8').equals(pathBytes))fail('receipt tree path is not strict UTF-8');
    const [mode,type,objectSha]=metadata;
    entries.push({mode,type,object_sha:objectSha,path:normalizedRepositoryPath(repositoryPath,'tree entry path')});
  }
  return entries.sort((left,right)=>Buffer.from(left.path,'utf8').compare(Buffer.from(right.path,'utf8')));
};
export const repositoryPathSetDigest=entries=>{
  const ordered=[...entries].sort((left,right)=>Buffer.from(left.path,'utf8').compare(Buffer.from(right.path,'utf8')));
  const chunks=[];
  for(const entry of ordered){
    for(const value of [entry.mode,entry.type,entry.object_sha,entry.path])chunks.push(Buffer.from(value,'utf8'),Buffer.from([0]));
  }
  return bodySha(Buffer.concat(chunks));
};
const readTreeEntries=(repositoryRoot,commitSha,namespace)=>{
  const result=runGit(repositoryRoot,['ls-tree','-r','-z','--full-tree',commitSha,'--',namespace],'read bound receipt tree',{binary:true});
  return parseTreeEntries(result.stdout);
};
const exactPathEntry=(repositoryRoot,commitSha,relative,label)=>{
  const canonical=normalizedRepositoryPath(relative,`${label} path`);
  const entries=readTreeEntries(repositoryRoot,commitSha,canonical);
  if(entries.length===0)return null;
  if(entries.length!==1||entries[0].path!==canonical)fail(`${label} is not an exact committed path at ${commitSha}`);
  return entries[0];
};
const assertCommittedFile=({repositoryRoot,commitSha,relative,label,expectedBlob=null,requireWorktreeMatch=true})=>{
  const canonical=normalizedRepositoryPath(relative,`${label} path`);
  const entry=exactPathEntry(repositoryRoot,commitSha,canonical,label);
  if(!entry)fail(`${label} is not an exact committed path at ${commitSha}`);
  if(entry.mode!=='100644'||entry.type!=='blob'||!sha1(entry.object_sha))fail(`${label} must be a committed regular 100644 blob`);
  if(expectedBlob&&entry.object_sha!==expectedBlob)fail(`${label} committed Git object drift`);
  const objectBytes=gitBuffer(repositoryRoot,['cat-file','blob',entry.object_sha],`read ${label} committed object`);
  if(!requireWorktreeMatch)return{...entry,bytes:objectBytes};
  const absolute=path.join(repositoryRoot,...canonical.split('/'));
  if(!fs.existsSync(absolute))fail(`${label} is missing from the worktree`);
  assertNoSymlinkAncestors(absolute,label);
  const stat=fs.lstatSync(absolute);
  if(stat.isSymbolicLink()||!stat.isFile())fail(`${label} must be a non-symlink regular file`);
  const bytes=fs.readFileSync(absolute),computedBlob=gitBlobSha(bytes);
  if(computedBlob!==entry.object_sha)fail(`${label} worktree bytes differ from the committed path object`);
  if(!bytes.equals(objectBytes))fail(`${label} worktree bytes differ from committed object bytes`);
  return{...entry,bytes};
};
const walkNamespace=(repositoryRoot,namespace)=>{
  const prefix=normalizePrefix(namespace,'receipt namespace');
  const namespaceRoot=path.resolve(repositoryRoot,...prefix.split('/').filter(Boolean));
  if(!inside(repositoryRoot,namespaceRoot))fail('receipt namespace escapes repository root');
  let namespaceStat;
  try{namespaceStat=fs.lstatSync(namespaceRoot)}catch(error){if(error?.code==='ENOENT')return[];throw error}
  if(namespaceStat.isSymbolicLink())fail('receipt namespace root may not be a symlink');
  if(!namespaceStat.isDirectory())fail('receipt namespace root must be a directory');
  assertNoSymlinkAncestors(namespaceRoot,'receipt namespace root');
  const files=[];
  const walk=directory=>{
    for(const directoryEntry of fs.readdirSync(directory,{withFileTypes:true})){
      const absolute=path.join(directory,directoryEntry.name),stat=fs.lstatSync(absolute);
      if(stat.isSymbolicLink())fail('receipt namespace contains a symlink');
      if(stat.isDirectory())walk(absolute);
      else if(stat.isFile()){
        const relative=path.relative(repositoryRoot,absolute).split(path.sep).join('/');
        normalizedRepositoryPath(relative,'worktree receipt path');
        files.push({path:relative,absolute});
      }else fail('receipt namespace contains a non-regular filesystem object');
    }
  };
  walk(namespaceRoot);
  return files.sort((left,right)=>Buffer.from(left.path).compare(Buffer.from(right.path)));
};

const commitParents=(root,commit,label)=>{
  const tokens=gitText(root,['rev-list','--parents','-n','1',commit],label).split(/\s+/).filter(Boolean);
  if(tokens[0]!==commit)fail(`${label}: commit identity drift`);
  return tokens.slice(1);
};
const resolveUniqueRegistryDeclarationCommit=({repositoryRoot,currentHead,liveRegistryPath,currentRegistryBlob})=>{
  const history=gitText(
    repositoryRoot,
    ['rev-list','--full-history','--topo-order',currentHead,'--',liveRegistryPath],
    'trace full live-registry declaration history'
  ).split(/\r?\n/).filter(Boolean);
  const introductions=[];
  for(const commit of history){
    const entry=exactPathEntry(repositoryRoot,commit,liveRegistryPath,'historical live registry');
    if(!entry||entry.object_sha!==currentRegistryBlob)continue;
    const parents=commitParents(repositoryRoot,commit,'resolve historical live-registry parents');
    let inherited=false;
    for(const parent of parents){
      const parentEntry=exactPathEntry(repositoryRoot,parent,liveRegistryPath,'historical live-registry parent');
      if(parentEntry?.object_sha===currentRegistryBlob){inherited=true;break}
    }
    if(!inherited)introductions.push(commit);
  }
  if(introductions.length!==1)fail(`current live-registry bytes require one unique declaration commit; found ${introductions.length}`);
  const declarationCommit=introductions[0];
  if(commitParents(repositoryRoot,declarationCommit,'resolve unique registry declaration parents').length===0)fail('registry declaration commit must have a parent');
  return declarationCommit;
};

const bindingFields=[
  'repository_commit_sha',
  'repository_tree_sha',
  'receipt_namespace',
  'control_stack_prefix',
  'path_set_sha256',
  'custody_commit_precedes_registry_commit'
];

export const deriveRepositorySnapshotBinding=({contract,repositoryRoot,repositoryCommitSha})=>{
  const root=canonicalRepositoryRoot(repositoryRoot);
  validateGitRepositoryIntegrity(root);
  if(!sha1(repositoryCommitSha))fail('repository custody commit SHA invalid');
  runGit(root,['cat-file','-e',`${repositoryCommitSha}^{commit}`],'resolve repository custody commit');
  const repositoryTreeSha=gitText(root,['rev-parse',`${repositoryCommitSha}^{tree}`],'resolve repository custody tree');
  const namespace=contract.repository_snapshot_contract.receipt_namespace;
  const entries=readTreeEntries(root,repositoryCommitSha,namespace);
  return{
    repository_commit_sha:repositoryCommitSha,
    repository_tree_sha:repositoryTreeSha,
    receipt_namespace:namespace,
    control_stack_prefix:contract.repository_snapshot_contract.control_stack_prefix,
    path_set_sha256:repositoryPathSetDigest(entries),
    custody_commit_precedes_registry_commit:true
  };
};

export function validateRepositoryTreeCustody({contract,liveRegistry,repositoryRoot}){
  if(!object(contract)||contract.schema_version!=='m05-answerable-power-s03-l7-intel-realization-stage-receipt-repository-tree-custody-amendment@1'||contract.status!=='intel_realization_stage_receipt_repository_tree_custody_amendment_frozen')fail('repository-tree custody contract identity drift');
  if(!object(liveRegistry)||!Array.isArray(liveRegistry.receipts))fail('live registry receipts missing');
  const root=canonicalRepositoryRoot(repositoryRoot);
  const currentHead=validateGitRepositoryIntegrity(root);
  const currentHeadTree=gitText(root,['rev-parse',`${currentHead}^{tree}`],'resolve validation HEAD tree');
  const namespace=normalizePrefix(contract.repository_snapshot_contract.receipt_namespace,'contract receipt namespace');
  const controlStackPrefix=normalizePrefix(contract.repository_snapshot_contract.control_stack_prefix,'contract control-stack prefix');
  if(!controlStackPrefix.startsWith(namespace))fail('control-stack prefix escapes receipt namespace');
  if(!Object.hasOwn(liveRegistry,contract.registry_overlay.field))fail('live registry missing repository_snapshot_binding');
  const indexState=runGit(root,['diff','--cached','--quiet','--',namespace],'inspect receipt namespace index state',{allowExitCodes:[0,1]});
  if(indexState.status!==0)fail('receipt namespace index differs from the validation head');
  const currentFiles=walkNamespace(root,namespace);
  const validationHeadEntries=readTreeEntries(root,currentHead,namespace);

  if(liveRegistry.receipts.length===0){
    if(liveRegistry.repository_snapshot_binding!==null)fail('empty live registry must carry a null repository snapshot binding');
    if(currentFiles.length!==0||validationHeadEntries.length!==0)fail('empty live registry may not coexist with worktree or committed receipt-namespace files');
    return{
      validation_head:currentHead,
      validation_head_tree:currentHeadTree,
      repository_snapshot_bound:false,
      repository_snapshot_commit:null,
      repository_snapshot_tree:null,
      registry_declaration_commit:null,
      receipt_namespace_files:0,
      receipt_namespace_path_set_sha256:repositoryPathSetDigest([])
    };
  }

  const binding=liveRegistry.repository_snapshot_binding;
  requireExactKeys(binding,bindingFields,'repository snapshot binding');
  if(!sha1(binding.repository_commit_sha)||!sha1(binding.repository_tree_sha)||!sha256(binding.path_set_sha256)||binding.custody_commit_precedes_registry_commit!==true)fail('repository snapshot binding identity invalid');
  if(binding.receipt_namespace!==namespace||binding.control_stack_prefix!==controlStackPrefix)fail('repository snapshot namespace drift');
  runGit(root,['cat-file','-e',`${binding.repository_commit_sha}^{commit}`],'resolve bound custody commit');
  if(binding.repository_commit_sha===currentHead)fail('custody commit must strictly precede the registry validation head');
  const ancestry=runGit(root,['merge-base','--is-ancestor',binding.repository_commit_sha,currentHead],'verify custody ancestry',{allowExitCodes:[0,1]});
  if(ancestry.status!==0)fail('custody commit is not an ancestor of the registry validation head');
  const actualTree=gitText(root,['rev-parse',`${binding.repository_commit_sha}^{tree}`],'resolve bound custody tree');
  if(actualTree!==binding.repository_tree_sha)fail('repository snapshot tree drift');
  const custodyParents=commitParents(root,binding.repository_commit_sha,'resolve custody commit parents');
  if(custodyParents.length===0)fail('custody commit must have a parent whose live-registry bytes it preserves');
  const liveRegistryPath=normalizedRepositoryPath(contract.repository_snapshot_contract.live_registry_path,'contract live-registry path');
  const custodyRegistry=assertCommittedFile({repositoryRoot:root,commitSha:binding.repository_commit_sha,relative:liveRegistryPath,label:'custody-commit live registry',requireWorktreeMatch:false});
  const parentRegistry=assertCommittedFile({repositoryRoot:root,commitSha:custodyParents[0],relative:liveRegistryPath,label:'custody-parent live registry',requireWorktreeMatch:false});
  if(custodyRegistry.object_sha!==parentRegistry.object_sha)fail('custody commit changed the live registry instead of preserving it');

  const validationRegistry=assertCommittedFile({repositoryRoot:root,commitSha:currentHead,relative:liveRegistryPath,label:'validation-head live registry'});
  const committedRegistry=parseJson(validationRegistry.bytes,'validation-head live registry');
  if(!same(committedRegistry,liveRegistry))fail('live registry argument differs from the validation-head committed registry');
  const registryDeclarationCommit=resolveUniqueRegistryDeclarationCommit({
    repositoryRoot:root,
    currentHead,
    liveRegistryPath,
    currentRegistryBlob:validationRegistry.object_sha
  });
  if(binding.repository_commit_sha===registryDeclarationCommit)fail('custody commit must strictly precede the unique registry declaration commit');
  const declarationAncestry=runGit(
    root,
    ['merge-base','--is-ancestor',binding.repository_commit_sha,registryDeclarationCommit],
    'verify custody precedes unique registry declaration commit',
    {allowExitCodes:[0,1]}
  );
  if(declarationAncestry.status!==0)fail('custody commit is not an ancestor of the unique registry declaration commit');

  const treeEntries=readTreeEntries(root,binding.repository_commit_sha,namespace);
  if(treeEntries.length===0)fail('nonempty live registry requires a nonempty committed receipt snapshot');
  const seenPaths=new Set();
  for(const entry of treeEntries){
    if(entry.mode!==contract.repository_snapshot_contract.required_tree_entry_mode||entry.type!==contract.repository_snapshot_contract.required_tree_entry_type||!sha1(entry.object_sha))fail(`receipt tree entry ${entry.path} is not a regular 100644 blob`);
    if(!entry.path.startsWith(namespace)||seenPaths.has(entry.path))fail('receipt tree path denominator drift');
    seenPaths.add(entry.path);
  }
  const pathSetSha=repositoryPathSetDigest(treeEntries);
  if(pathSetSha!==binding.path_set_sha256)fail('repository snapshot path-set digest drift');
  if(!same(treeEntries,validationHeadEntries))fail('validation HEAD receipt tree differs from the bound custody snapshot');
  const treePaths=treeEntries.map(entry=>entry.path),worktreePaths=currentFiles.map(entry=>entry.path);
  if(!same(treePaths,worktreePaths))fail('checked-out receipt namespace differs from the committed custody snapshot');

  const worktreeByPath=new Map(currentFiles.map(file=>[file.path,file.absolute]));
  for(const entry of treeEntries){
    const worktreeBytes=fs.readFileSync(worktreeByPath.get(entry.path));
    if(gitBlobSha(worktreeBytes)!==entry.object_sha)fail(`working-tree receipt bytes drift from committed blob: ${entry.path}`);
    const objectBytes=gitBuffer(root,['cat-file','blob',entry.object_sha],`read committed receipt object ${entry.path}`);
    if(!worktreeBytes.equals(objectBytes))fail(`working-tree receipt bytes differ from Git object bytes: ${entry.path}`);
  }

  return{
    validation_head:currentHead,
    validation_head_tree:currentHeadTree,
    repository_snapshot_bound:true,
    repository_snapshot_commit:binding.repository_commit_sha,
    repository_snapshot_tree:binding.repository_tree_sha,
    registry_declaration_commit:registryDeclarationCommit,
    receipt_namespace_files:treeEntries.length,
    receipt_namespace_path_set_sha256:pathSetSha
  };
}

const validateContractAndPredecessors=(root,currentHead)=>{
  const contractRelative=path.relative(ROOT,CONTRACT_PATH).split(path.sep).join('/');
  const contractRecord=assertCommittedFile({repositoryRoot:root,commitSha:currentHead,relative:contractRelative,label:'repository-tree custody contract',expectedBlob:EXPECTED.contractBlob});
  const contract=parseJson(contractRecord.bytes,'repository-tree custody contract');
  checkSemantic(contract,'repository_tree_custody_amendment_sha256',EXPECTED.contractSemantic,'repository-tree custody contract');
  if(contract.repository_snapshot_contract.live_registry_path!==path.relative(ROOT,LIVE_REGISTRY_PATH).split(path.sep).join('/'))fail('repository-tree custody live-registry path drift');
  for(const relative of contract.changed_path_denominator)assertCommittedFile({repositoryRoot:root,commitSha:currentHead,relative,label:`successor control ${relative}`});
  if(!contract.changed_path_denominator.includes(VALIDATOR_RELATIVE))fail('successor changed-path denominator omits its validator');
  const workflowBinding=contract.workflow_trigger_contract;
  if(!object(workflowBinding)||workflowBinding.focused_workflow_path!=='.github/workflows/m05-intel-realization-stage-receipt-repository-tree-custody-amendment.yml'||workflowBinding.focused_workflow_git_blob_sha1!=='dc5bf79d77ad15d0ea9692d0b24a6636e6e93b15')fail('successor focused-workflow binding drift');
  assertCommittedFile({repositoryRoot:root,commitSha:currentHead,relative:workflowBinding.focused_workflow_path,label:'successor focused workflow',expectedBlob:workflowBinding.focused_workflow_git_blob_sha1});
  const bindings=contract.predecessor_control_stack_binding;
  for(const [name,expectedBlob] of Object.entries(EXPECTED.predecessor)){
    const binding=bindings[name];
    if(!object(binding)||binding.git_blob_sha1!==expectedBlob||!text(binding.path))fail(`${name} predecessor binding drift`);
    assertCommittedFile({repositoryRoot:root,commitSha:currentHead,relative:binding.path,label:`${name} predecessor`,expectedBlob});
  }
  return contract;
};

const runPredecessorValidator=()=>{
  const env=sanitizedGitEnvironment();
  for(const key of Object.keys(env))if(key.startsWith('M05_INTEL_'))delete env[key];
  env.M05_INTEL_RECEIPT_REPOSITORY_ROOT=ROOT;
  env.M05_INTEL_CONTROL_STACK_RECEIPT_ROOT=path.join(ROOT,'receipts/m05/intel-realization/control-stack');
  const result=spawnSync(process.execPath,[PREDECESSOR_VALIDATOR],{
    cwd:ROOT,
    env,
    encoding:'utf8',
    maxBuffer:64*1024*1024
  });
  if(result.error)fail(`predecessor validator failed to start: ${result.error.message}`);
  if(result.status!==0)fail(`predecessor validator failed: ${(result.stderr||result.stdout||'').trim()}`);
  try{return JSON.parse(result.stdout)}catch{fail('predecessor validator returned invalid JSON')}
};

export const main=()=>{
  const root=canonicalRepositoryRoot(ROOT);
  const currentHead=validateGitRepositoryIntegrity(root);
  const contract=validateContractAndPredecessors(root,currentHead);
  const liveRegistryRelative=path.relative(ROOT,LIVE_REGISTRY_PATH).split(path.sep).join('/');
  const liveRegistryRecord=assertCommittedFile({repositoryRoot:root,commitSha:currentHead,relative:liveRegistryRelative,label:'live registry'});
  const liveRegistryBytes=liveRegistryRecord.bytes;
  const liveRegistry=parseJson(liveRegistryBytes,'live registry');
  const snapshotBefore=validateRepositoryTreeCustody({contract,liveRegistry,repositoryRoot:ROOT});
  const predecessor=runPredecessorValidator();
  if(!liveRegistryBytes.equals(fs.readFileSync(LIVE_REGISTRY_PATH)))fail('live registry bytes changed during predecessor replay');
  const snapshotAfter=validateRepositoryTreeCustody({contract,liveRegistry,repositoryRoot:ROOT});
  if(!same(snapshotBefore,snapshotAfter))fail('repository snapshot changed during predecessor replay');
  const result={
    validator:'m05-intel-stage-receipt-repository-tree-custody-amendment',
    ...snapshotAfter,
    registered_stage_receipts:predecessor.registered_stage_receipts,
    transaction_admissible:predecessor.transaction_admissible,
    federal_cash_custody_admissible:predecessor.federal_cash_custody_admissible,
    public_account_booking_admissible:predecessor.public_account_booking_admissible,
    distribution_admissible:predecessor.distribution_admissible,
    answer_change_authorized:false,
    graph_effect:'none',
    issue_345_may_close:false
  };
  process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
  return result;
};

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main();
