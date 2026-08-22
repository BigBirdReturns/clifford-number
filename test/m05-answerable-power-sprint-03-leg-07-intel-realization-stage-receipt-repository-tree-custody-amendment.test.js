#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  deriveRepositorySnapshotBinding,
  repositoryPathSetDigest,
  validateRepositoryTreeCustody
} from '../tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-repository-tree-custody-amendment.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CONTRACT_PATH=path.join(ROOT,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-repository-tree-custody-amendment.json');
const LIVE_REGISTRY_PATH=path.join(ROOT,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-registry.json');
const WORKFLOW_PATH=path.join(ROOT,'.github/workflows/m05-intel-realization-stage-receipt-repository-tree-custody-amendment.yml');
const VALIDATOR_PATH=path.join(ROOT,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-repository-tree-custody-amendment.mjs');
const contract=JSON.parse(fs.readFileSync(CONTRACT_PATH,'utf8'));
const FIXTURE_REGISTRY_PATH=contract.repository_snapshot_contract.live_registry_path;
const clone=value=>JSON.parse(JSON.stringify(value));
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const gitEnv=()=>{
  const env={...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_TERMINAL_PROMPT:'0'};
  for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES','GIT_COMMON_DIR','GIT_NAMESPACE'])delete env[key];
  return env;
};
const git=(root,args,{binary=false,allow=[0],input=undefined}={})=>{
  const result=spawnSync('git',['-C',root,...args],{
    env:gitEnv(),
    encoding:binary?null:'utf8',
    input,
    maxBuffer:16*1024*1024
  });
  assert.ok(!result.error,result.error?.message);
  assert.ok(allow.includes(result.status),`${args.join(' ')} failed: ${Buffer.isBuffer(result.stderr)?result.stderr.toString('utf8'):result.stderr}`);
  return result;
};
const write=(root,relative,content)=>{
  const absolute=path.join(root,...relative.split('/'));
  fs.mkdirSync(path.dirname(absolute),{recursive:true});
  fs.writeFileSync(absolute,content);
  return absolute;
};
const commitAll=(root,message)=>{
  git(root,['add','-A']);
  git(root,['commit','-q','-m',message]);
  return git(root,['rev-parse','HEAD']).stdout.trim();
};
const initRepository=()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'m05-repository-tree-custody-'));
  git(root,['init','-q']);
  git(root,['config','user.name','M-05 test']);
  git(root,['config','user.email','m05-test@example.invalid']);
  write(root,'README.md','fixture\n');
  write(root,FIXTURE_REGISTRY_PATH,`${JSON.stringify({receipts:[],repository_snapshot_binding:null},null,2)}\n`);
  commitAll(root,'baseline');
  return root;
};
const emptyRegistry=()=>({receipts:[],repository_snapshot_binding:null});
const createReceiptFiles=(root,{executable=false,symlink=false}={})=>{
  const sourcePath='receipts/m05/intel-realization/source/source.bin';
  const stackPath='receipts/m05/intel-realization/control-stack/stack.json';
  if(symlink){
    write(root,'outside.bin','outside\n');
    const absolute=path.join(root,...sourcePath.split('/'));
    fs.mkdirSync(path.dirname(absolute),{recursive:true});
    fs.symlinkSync(path.join(root,'outside.bin'),absolute);
  }else write(root,sourcePath,'source body\n');
  write(root,stackPath,'{"stack":true}\n');
  git(root,['add','-A']);
  if(executable)git(root,['update-index','--chmod=+x',sourcePath]);
  return{sourcePath,stackPath};
};
const createBoundFixture=({executable=false,symlink=false,custodyRegistryMutation=false}={})=>{
  const root=initRepository();
  const paths=createReceiptFiles(root,{executable,symlink});
  if(custodyRegistryMutation){
    write(root,FIXTURE_REGISTRY_PATH,`${JSON.stringify({receipts:[],repository_snapshot_binding:null,custody_mutation:true},null,2)}\n`);
    git(root,['add','--',FIXTURE_REGISTRY_PATH]);
  }
  git(root,['commit','-q','-m','receipt custody snapshot']);
  const custodyCommit=git(root,['rev-parse','HEAD']).stdout.trim();
  const binding=deriveRepositorySnapshotBinding({contract,repositoryRoot:root,repositoryCommitSha:custodyCommit});
  const registry={receipts:[{registry_receipt_id:'registry-1'}],repository_snapshot_binding:binding};
  write(root,FIXTURE_REGISTRY_PATH,`${JSON.stringify(registry,null,2)}\n`);
  const registryCommit=commitAll(root,'registry declaration');
  return{root,...paths,custodyCommit,registryCommit,registry};
};
const createSiblingDeclarationFixture=()=>{
  const root=initRepository();
  const baseline=git(root,['rev-parse','HEAD']).stdout.trim();
  git(root,['switch','-q','-c','custody-side']);
  const paths=createReceiptFiles(root);
  git(root,['commit','-q','-m','receipt custody snapshot']);
  const custodyCommit=git(root,['rev-parse','HEAD']).stdout.trim();
  const binding=deriveRepositorySnapshotBinding({contract,repositoryRoot:root,repositoryCommitSha:custodyCommit});
  const registry={receipts:[{registry_receipt_id:'registry-1'}],repository_snapshot_binding:binding};
  git(root,['switch','-q','-c','registry-side',baseline]);
  write(root,FIXTURE_REGISTRY_PATH,`${JSON.stringify(registry,null,2)}\n`);
  const registryCommit=commitAll(root,'sibling registry declaration');
  git(root,['switch','-q','custody-side']);
  git(root,['merge','-q','--no-ff','registry-side','-m','merge sibling registry declaration']);
  return{root,...paths,custodyCommit,registryCommit,registry};
};
const dispose=fixture=>fs.rmSync(fixture.root,{recursive:true,force:true});
const expectFailure=(fixture,mutate,label)=>{
  const registry=clone(fixture.registry);
  mutate({fixture,registry});
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:registry,repositoryRoot:fixture.root}),undefined,label);
};
const hashObject=(root,content,name)=>{
  const file=write(root,`.objects/${name}`,content);
  return git(root,['hash-object','-w',file]).stdout.trim();
};

assert.equal(contract.schema_version,'m05-answerable-power-s03-l7-intel-realization-stage-receipt-repository-tree-custody-amendment@1');
assert.equal(contract.status,'intel_realization_stage_receipt_repository_tree_custody_amendment_frozen');
const semanticCopy=clone(contract),declaredSemantic=semanticCopy.repository_tree_custody_amendment_sha256;
delete semanticCopy.repository_tree_custody_amendment_sha256;
assert.equal(declaredSemantic,sha(Buffer.from(JSON.stringify(semanticCopy),'utf8')));
assert.equal(declaredSemantic,'77859aae9af48d5d8781ecdd3ab2c9eb0ca66313aea33f94444de893560e3871');
assert.equal(contract.predecessor_control_stack_binding.repair_contract.git_blob_sha1,'14decc6ed12383ca7395551c025edac06c446c5c');
assert.equal(contract.predecessor_control_stack_binding.validator.git_blob_sha1,'f011ce212a5b94a8d2557b8a88f12f30740b010e');
assert.equal(contract.predecessor_control_stack_binding.adversarial_test.git_blob_sha1,'159574dfe4cd3b86fddb8ff597ad7010b300f5b9');
assert.equal(contract.predecessor_control_stack_binding.focused_workflow.git_blob_sha1,'a97748f0a84c7f5a020b5c6e59aa471fcb5cd0de');
assert.equal(contract.workflow_trigger_contract.focused_workflow_git_blob_sha1,'dc5bf79d77ad15d0ea9692d0b24a6636e6e93b15');
assert.equal(repositoryPathSetDigest([]),sha(Buffer.alloc(0)));
assert.notEqual(
  repositoryPathSetDigest([{mode:'100644',type:'blob',object_sha:'1'.repeat(40),path:'receipts/m05/intel-realization/source/a\nb'}]),
  repositoryPathSetDigest([{mode:'100644',type:'blob',object_sha:'1'.repeat(40),path:'receipts/m05/intel-realization/source/a'},{mode:'100644',type:'blob',object_sha:'2'.repeat(40),path:'b'}])
);
const baselineRegistry=JSON.parse(fs.readFileSync(LIVE_REGISTRY_PATH,'utf8'));
assert.equal(baselineRegistry.receipts.length,0);
assert.ok(Object.hasOwn(baselineRegistry,'repository_snapshot_binding'));
assert.equal(baselineRegistry.repository_snapshot_binding,null);
const validatorSource=fs.readFileSync(VALIDATOR_PATH,'utf8');
for(const required of [
  'GIT_NO_REPLACE_OBJECTS','ls-tree','cat-file','merge-base','--is-shallow-repository',
  'objects/info/alternates','info/grafts','validation HEAD receipt tree differs',
  'custody commit changed the live registry','partial-clone and promisor object retrieval are not allowed',
  '--full-history','current live-registry bytes require one unique declaration commit',
  'custody commit is not an ancestor of the unique registry declaration commit',
  "'GIT_CONFIG','GIT_CONFIG_GLOBAL'",'env.GIT_CONFIG_GLOBAL=os.devNull','env.GIT_CONFIG_SYSTEM=os.devNull',"env.GIT_NO_LAZY_FETCH='1'",
  "['config','-z','--includes','--show-scope','--show-origin','--name-only','--list']",
  "name.startsWith('remote.')","name.endsWith('.promisor')","name.endsWith('.partialclonefilter')",
  'effective Git configuration record denominator drift'
])assert.ok(validatorSource.includes(required),`validator missing ${required}`);
if(fs.existsSync(WORKFLOW_PATH)){
  const workflowSource=fs.readFileSync(WORKFLOW_PATH,'utf8');
  for(const required of contract.changed_path_denominator)assert.ok(workflowSource.includes(`'${required}'`),`workflow missing ${required}`);
  for(const required of ['receipts/m05/intel-realization/**','fetch-depth: 0','persist-credentials: false','npm run release:check','git diff --exit-code'])assert.ok(workflowSource.includes(required),`workflow missing control ${required}`);
}

{
  const root=initRepository();
  const result=validateRepositoryTreeCustody({contract,liveRegistry:emptyRegistry(),repositoryRoot:root});
  assert.equal(result.repository_snapshot_bound,false);
  assert.equal(result.registry_declaration_commit,null);
  assert.equal(result.receipt_namespace_files,0);
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:{receipts:[]},repositoryRoot:root}));
  write(root,'receipts/m05/intel-realization/source/unregistered.bin','unregistered\n');
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:emptyRegistry(),repositoryRoot:root}));
  commitAll(root,'committed receipt without registry');
  fs.rmSync(path.join(root,'receipts/m05/intel-realization/source/unregistered.bin'));
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:emptyRegistry(),repositoryRoot:root}),undefined,'committed receipt hidden from worktree');
  fs.rmSync(root,{recursive:true,force:true});
}

{
  const fixture=createBoundFixture();
  const result=validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root});
  assert.equal(result.repository_snapshot_bound,true);
  assert.equal(result.repository_snapshot_commit,fixture.custodyCommit);
  assert.equal(result.registry_declaration_commit,fixture.registryCommit);
  assert.match(result.validation_head_tree,/^[0-9a-f]{40}$/);
  assert.equal(result.receipt_namespace_files,2);

  expectFailure(fixture,({registry})=>{delete registry.repository_snapshot_binding},'missing snapshot binding');
  expectFailure(fixture,({registry})=>{registry.repository_snapshot_binding=null},'null nonempty snapshot binding');
  expectFailure(fixture,({registry})=>{registry.repository_snapshot_binding.repository_tree_sha='0'.repeat(40)},'tree substitution');
  expectFailure(fixture,({registry})=>{registry.repository_snapshot_binding.path_set_sha256='0'.repeat(64)},'path-set substitution');
  expectFailure(fixture,({registry})=>{registry.repository_snapshot_binding.receipt_namespace='receipts/m05/other/'},'namespace substitution');
  expectFailure(fixture,({registry})=>{registry.repository_snapshot_binding.control_stack_prefix='receipts/m05/intel-realization/other/'},'stack-prefix substitution');
  expectFailure(fixture,({registry})=>{registry.repository_snapshot_binding.custody_commit_precedes_registry_commit=false},'relationship weakening');

  write(fixture.root,'receipts/m05/intel-realization/source/untracked.bin','untracked\n');
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'untracked file');
  fs.rmSync(path.join(fixture.root,'receipts/m05/intel-realization/source/untracked.bin'));

  write(fixture.root,fixture.sourcePath,'working tree rewrite\n');
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'working-tree rewrite');
  git(fixture.root,['restore','--',fixture.sourcePath]);

  write(fixture.root,'receipts/m05/intel-realization/source/index-only.bin','index only\n');
  git(fixture.root,['add','receipts/m05/intel-realization/source/index-only.bin']);
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'index-only file');
  git(fixture.root,['reset','-q','HEAD','--','receipts/m05/intel-realization/source/index-only.bin']);
  fs.rmSync(path.join(fixture.root,'receipts/m05/intel-realization/source/index-only.bin'));

  write(fixture.root,'receipts/m05/intel-realization/source/intent.bin','intent\n');
  git(fixture.root,['add','-N','receipts/m05/intel-realization/source/intent.bin']);
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'intent-to-add file');
  git(fixture.root,['reset','-q','HEAD','--','receipts/m05/intel-realization/source/intent.bin']);
  fs.rmSync(path.join(fixture.root,'receipts/m05/intel-realization/source/intent.bin'));

  const stage1=hashObject(fixture.root,'base\n','stage-1');
  const stage2=hashObject(fixture.root,'ours\n','stage-2');
  const stage3=hashObject(fixture.root,'theirs\n','stage-3');
  const indexInfo=`100644 ${stage1} 1\t${fixture.sourcePath}\n100644 ${stage2} 2\t${fixture.sourcePath}\n100644 ${stage3} 3\t${fixture.sourcePath}\n`;
  git(fixture.root,['update-index','--index-info'],{input:indexInfo});
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'unmerged index');
  git(fixture.root,['reset','--hard','-q','HEAD']);
  fs.rmSync(path.join(fixture.root,'.objects'),{recursive:true,force:true});

  fs.rmSync(path.join(fixture.root,...fixture.sourcePath.split('/')));
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'missing committed file');
  git(fixture.root,['restore','--',fixture.sourcePath]);

  const detachedBytes=Buffer.from('detached object\n');
  const detachedPath=write(fixture.root,'detached-object.tmp',detachedBytes);
  const detachedSha=git(fixture.root,['hash-object','-w',detachedPath]).stdout.trim();
  assert.match(detachedSha,/^[0-9a-f]{40}$/);
  fs.rmSync(detachedPath);
  write(fixture.root,'receipts/m05/intel-realization/source/detached.bin',detachedBytes);
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'detached unreferenced object');
  fs.rmSync(path.join(fixture.root,'receipts/m05/intel-realization/source/detached.bin'));

  const originalSource=fs.readFileSync(path.join(fixture.root,...fixture.sourcePath.split('/')));
  write(fixture.root,fixture.sourcePath,'committed receipt rewrite\n');
  commitAll(fixture.root,'rewrite receipt after custody snapshot');
  fs.writeFileSync(path.join(fixture.root,...fixture.sourcePath.split('/')),originalSource);
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'validation HEAD receipt tree drift hidden by worktree rewrite');
  git(fixture.root,['reset','--hard','-q','HEAD~1']);

  const priorObjectDirectory=process.env.GIT_OBJECT_DIRECTORY;
  process.env.GIT_OBJECT_DIRECTORY=path.join(fixture.root,'does-not-exist');
  assert.equal(validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}).repository_snapshot_bound,true);
  if(priorObjectDirectory===undefined)delete process.env.GIT_OBJECT_DIRECTORY;else process.env.GIT_OBJECT_DIRECTORY=priorObjectDirectory;

  const currentHead=git(fixture.root,['rev-parse','HEAD']).stdout.trim();
  const currentBinding=deriveRepositorySnapshotBinding({contract,repositoryRoot:fixture.root,repositoryCommitSha:currentHead});
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:{...fixture.registry,repository_snapshot_binding:currentBinding},repositoryRoot:fixture.root}),undefined,'self-referential current-head binding');

  const custodyTree=git(fixture.root,['rev-parse',`${fixture.custodyCommit}^{tree}`]).stdout.trim();
  const rogueCommit=git(fixture.root,['commit-tree',custodyTree,'-m','unrelated custody commit']).stdout.trim();
  const rogueBinding=deriveRepositorySnapshotBinding({contract,repositoryRoot:fixture.root,repositoryCommitSha:rogueCommit});
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:{...fixture.registry,repository_snapshot_binding:rogueBinding},repositoryRoot:fixture.root}),undefined,'unrelated commit');
  dispose(fixture);
}

{
  const fixture=createSiblingDeclarationFixture();
  assert.throws(
    ()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),
    /custody commit is not an ancestor of the unique registry declaration commit/,
    'sibling-branch declaration must not satisfy the later-registry-commit protocol'
  );
  dispose(fixture);
}

{
  const fixture=createBoundFixture();
  const originalRegistryBytes=fs.readFileSync(path.join(fixture.root,...FIXTURE_REGISTRY_PATH.split('/')));
  write(fixture.root,FIXTURE_REGISTRY_PATH,`${JSON.stringify({...fixture.registry,temporary_revision:true},null,2)}\n`);
  commitAll(fixture.root,'temporary registry revision');
  fs.writeFileSync(path.join(fixture.root,...FIXTURE_REGISTRY_PATH.split('/')),originalRegistryBytes);
  commitAll(fixture.root,'reintroduce prior registry bytes');
  assert.throws(
    ()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),
    /current live-registry bytes require one unique declaration commit; found 2/,
    'ambiguous repeated declaration bytes must fail closed'
  );
  dispose(fixture);
}

if(process.platform!=='win32'){
  const root=initRepository();
  const namespaceRoot=path.join(root,'receipts/m05/intel-realization');
  fs.mkdirSync(path.dirname(namespaceRoot),{recursive:true});
  fs.symlinkSync(path.join(root,'missing-receipt-target'),namespaceRoot,'dir');
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:emptyRegistry(),repositoryRoot:root}),undefined,'dangling receipt namespace symlink');
  fs.rmSync(root,{recursive:true,force:true});
}

{
  const fixture=createBoundFixture({custodyRegistryMutation:true});
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'custody commit changed live registry');
  dispose(fixture);
}

{
  const fixture=createBoundFixture();
  const receiptRoot=path.join(fixture.root,'receipts'),realRoot=path.join(fixture.root,'real-receipts');
  fs.renameSync(receiptRoot,realRoot);
  fs.symlinkSync(realRoot,receiptRoot,'dir');
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'receipt namespace ancestor symlink');
  dispose(fixture);
}

{
  const fixture=createBoundFixture();
  const baseline=git(fixture.root,['rev-list','--max-parents=0','HEAD']).stdout.trim();
  git(fixture.root,['replace',fixture.custodyCommit,baseline]);
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'replace ref');
  dispose(fixture);
}

{
  const fixture=createBoundFixture();
  const commonDir=git(fixture.root,['rev-parse','--git-common-dir']).stdout.trim();
  const rootCommit=git(fixture.root,['rev-list','--max-parents=0','HEAD']).stdout.trim();
  fs.writeFileSync(path.join(fixture.root,commonDir,'shallow'),`${rootCommit}\n`);
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'shallow repository');
  dispose(fixture);
}

{
  const fixture=createBoundFixture();
  git(fixture.root,['config','remote.origin.promisor','true']);
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'local-scope promisor repository');
  dispose(fixture);
}

{
  const fixture=createBoundFixture();
  git(fixture.root,['config','remote.origin.promisor','true']);
  const explicitConfig=path.join(fixture.root,'caller-explicit.gitconfig');
  fs.writeFileSync(explicitConfig,'[user]\n\tname = masked caller\n');
  const priorExplicitConfig=process.env.GIT_CONFIG;
  process.env.GIT_CONFIG=explicitConfig;
  try{
    const masked=git(fixture.root,['config','--get','remote.origin.promisor'],{allow:[0,1]});
    assert.equal(masked.status,1,'caller GIT_CONFIG must mask repository config for the unsanitized control command');
    assert.throws(
      ()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),
      /partial-clone and promisor object retrieval are not allowed/,
      'caller GIT_CONFIG may not mask a repository promisor setting'
    );
  }finally{
    if(priorExplicitConfig===undefined)delete process.env.GIT_CONFIG;else process.env.GIT_CONFIG=priorExplicitConfig;
  }
  dispose(fixture);
}

for(const [separator,suffix,label] of [
  ['\u2028','promisor','U+2028 line separator'],
  ['\u2029','partialCloneFilter','U+2029 paragraph separator']
]){
  const fixture=createBoundFixture();
  const key=`remote.${separator}.${suffix}`;
  git(fixture.root,['config',key,'true']);
  assert.equal(git(fixture.root,['config','--get',key]).stdout.trim(),'true');
  assert.throws(
    ()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),
    /partial-clone and promisor object retrieval are not allowed/,
    `${label} remote subsection may not evade promisor detection`
  );
  dispose(fixture);
}

{
  const fixture=createBoundFixture();
  git(fixture.root,['config','extensions.worktreeConfig','true']);
  git(fixture.root,['config','--worktree','remote.origin.promisor','true']);
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'worktree-scope promisor repository');
  dispose(fixture);
}

{
  const fixture=createBoundFixture();
  const globalConfig=path.join(fixture.root,'caller-global.gitconfig');
  fs.writeFileSync(globalConfig,'[extensions]\n\tpartialClone = origin\n[remote "origin"]\n\tpromisor = true\n');
  const priorGlobalConfig=process.env.GIT_CONFIG_GLOBAL;
  process.env.GIT_CONFIG_GLOBAL=globalConfig;
  try{
    assert.equal(git(fixture.root,['config','--global','--get','remote.origin.promisor']).stdout.trim(),'true');
    assert.equal(validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}).repository_snapshot_bound,true);
  }finally{
    if(priorGlobalConfig===undefined)delete process.env.GIT_CONFIG_GLOBAL;else process.env.GIT_CONFIG_GLOBAL=priorGlobalConfig;
  }
  dispose(fixture);
}

{
  const fixture=createBoundFixture();
  const commonDir=git(fixture.root,['rev-parse','--git-common-dir']).stdout.trim();
  const alternates=path.join(fixture.root,commonDir,'objects/info/alternates');
  fs.mkdirSync(path.dirname(alternates),{recursive:true});
  fs.writeFileSync(alternates,'/tmp/nonexistent-object-store\n');
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'object alternates');
  dispose(fixture);
}

{
  const fixture=createBoundFixture({executable:true});
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'executable tree entry');
  dispose(fixture);
}

if(process.platform!=='win32'){
  const fixture=createBoundFixture({symlink:true});
  assert.throws(()=>validateRepositoryTreeCustody({contract,liveRegistry:fixture.registry,repositoryRoot:fixture.root}),undefined,'symlink tree entry');
  dispose(fixture);
}

process.stdout.write('m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-repository-tree-custody-amendment.test: OK\n');
