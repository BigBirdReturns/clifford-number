#!/usr/bin/env python3
import hashlib,json,os,shutil,subprocess,traceback
from pathlib import Path
R=Path.cwd(); O=Path(os.environ['OUT']); W=Path('/tmp/rd04-nd-promoted-custody-repair'); P=W/'product'; S=W/'stage'
SRC='ae2f47acdaf962034ce21cb5bbdc0ffe0a3a8229'; SRCT='df289954c88d3bf12d0cc2695725926d67c454f5'; PAR='283c5993cb2ac0bff173c72aba70088c67b2ac3c'; PART='80a04c3d6a59816e9f7c99e585e077c92df42dbd'
CB=os.environ['CARRIER_BASE_SHA']; CH=os.environ['EVENT_HEAD_SHA']; SB='staging/ssc-rd04-nd-row-state-promoted-custody-repair-v1'
ROOT='data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation'; WF='.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.yml'; IN=f'{ROOT}/input-custody.json'; MF=f'{ROOT}/product-manifest.json'; B='tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs'; V='tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs'; T='test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.test.js'; SC='schemas/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.schema.json'; TWF='.tmp/rd04-nd-row-state-promoted-custody-repair/standing-workflow.yml'
OLD_SHA='d2ff4b4d711417b2319b1c26486127c4eba1366aa0e11abf1fd489dcd2b2ffe6'; OLD_BLOB='66a9a6d7003a39b1dca569895e0bc3513f004ca6'; NEW_SHA='9f9dc05a057396056771bb566c44e9c3779d8ef6b0d2c078f7ffff11d9c7e6cb'; NEW_BLOB='6ba11a6025021e9df8ac6535be8c42499654c233'; OLD_IN_SHA='14ad4e2a3716c480ed882bb63209b1e1ada7ed77b1594b8e439e597de3788fd1'; OLD_IN_BLOB='c14472c0d31a51879742c8ab98049e1ac8c47b27'; SC_N=14765; SC_SHA='2db941cfac2608bad4efeaa010bd1c28c1f0b97b89ac8e93053350a356df8388'; SC_BLOB='d41112bb621656bd41fcbfaa605e6cedbfeb04ca'
PATHS=[WF,f'{ROOT}/input-custody.json',f'{ROOT}/row-state-decision.json',f'{ROOT}/row-state-ledger.json',f'{ROOT}/promoted-partial-field-matrix.json',f'{ROOT}/remaining-open-field-census.json',f'{ROOT}/row-state-summary.json',f'{ROOT}/index.json',f'{ROOT}/product-manifest.json','docs/milestones/ssc-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.md',SC,T,B,V]
REPAIRED=[IN,MF,T,B]
def cmd(*a,cwd=R,env=None,ok=True):
 p=subprocess.run(a,cwd=cwd,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env=env)
 if ok and p.returncode: raise RuntimeError(f"command {p.returncode}: {' '.join(a)}\n{p.stdout}")
 return p.stdout
def g(*a,cwd=R): return cmd('git',*a,cwd=cwd).strip()
def sh(x): return hashlib.sha256(x).hexdigest()
def blob(x): return hashlib.sha1(f'blob {len(x)}\0'.encode()+x).hexdigest()
def jb(x): return (json.dumps(x,indent=2,ensure_ascii=False)+'\n').encode()
def rep(s,a,b,label):
 if s.count(a)!=1: raise AssertionError(f'{label} count={s.count(a)}')
 return s.replace(a,b)
def log(n,x): O.mkdir(parents=True,exist_ok=True); (O/n).write_text(x)
def source(path,dst): dst.parent.mkdir(parents=True,exist_ok=True); dst.write_bytes(cmd('git','show',f'{SRC}:{path}').encode())
def topology():
 assert g('rev-parse','HEAD')==CH and g('rev-parse','HEAD^')==CB
 assert g('rev-parse',f'{SRC}^{{tree}}')==SRCT and g('rev-parse',f'{SRC}^')==PAR and g('rev-parse',f'{PAR}^{{tree}}')==PART
 g('fetch','--quiet','--force','origin','+refs/heads/main:refs/remotes/origin/main'); assert g('rev-parse','refs/remotes/origin/main')==PAR
 assert sorted(g('diff','--name-only',PAR,SRC).splitlines())==sorted(PATHS); assert sorted(g('diff','--name-only','--diff-filter=A',PAR,SRC).splitlines())==sorted(PATHS); assert not g('diff','--name-only','--diff-filter=MDTCRUXB',PAR,SRC)
 assert g('rev-parse',f'{SRC}:{ROOT}/promoted-partial-field-matrix.json')==NEW_BLOB and g('rev-parse',f'{SRC}:{SC}')==SC_BLOB
def prepare():
 shutil.rmtree(W,ignore_errors=True); W.mkdir(); cmd('git','worktree','add','--detach',str(P),PAR)
 for p in PATHS: source(p,P/p)
def repair():
 f=P/IN; o=json.loads(f.read_text()); q=o['projection']; assert q['promoted_matrix_sha256']==OLD_SHA and q['promoted_matrix_git_blob']==OLD_BLOB; q['promoted_matrix_sha256']=NEW_SHA; q['promoted_matrix_git_blob']=NEW_BLOB; data=jb(o); f.write_bytes(data); ish=sh(data); ib=blob(data)
 bf=P/B; s=bf.read_text(); s=rep(s,f"INPUT_SHA: '{OLD_IN_SHA}'",f"INPUT_SHA: '{ish}'",'builder input sha'); s=rep(s,f"INPUT_BLOB: '{OLD_IN_BLOB}'",f"INPUT_BLOB: '{ib}'",'builder input blob'); a="  assert(same(input.predecessor_matrix, {path:C.PREDECESSOR_MATRIX_PATH,bytes:C.PREDECESSOR_MATRIX_BYTES,sha256:C.PREDECESSOR_MATRIX_SHA,git_blob_sha:C.PREDECESSOR_MATRIX_BLOB}), 'predecessor matrix custody mismatch');"; z=a+"\n  assert(input.projection.promoted_matrix_sha256 === C.PROMOTED_MATRIX_SHA, 'input projection promoted matrix SHA-256 mismatch');\n  assert(input.projection.promoted_matrix_git_blob === C.PROMOTED_MATRIX_BLOB, 'input projection promoted matrix Git blob mismatch');"; s=rep(s,a,z,'builder guards'); bf.write_text(s)
 tf=P/T; s=tf.read_text(); s=rep(s,"test('closed product contract rejects 47 adversarial mutations'","test('closed product contract rejects 49 adversarial mutations'",'test title'); a="    ['input predecessor identity drift',mutateJson(rel.input,o=>{o.predecessor_matrix.sha256='0'.repeat(64);})],"; z=a+"\n    ['input promoted matrix SHA-256 custody drift',mutateJson(rel.input,o=>{o.projection.promoted_matrix_sha256='0'.repeat(64);})],\n    ['input promoted matrix Git blob custody drift',mutateJson(rel.input,o=>{o.projection.promoted_matrix_git_blob='0'.repeat(40);})],"; s=rep(s,a,z,'test guards'); s=rep(s,'assert.equal(mutations.length,47);','assert.equal(mutations.length,49);','test count'); tf.write_text(s)
 sd=(P/SC).read_bytes(); assert len(sd)==SC_N and sh(sd)==SC_SHA and blob(sd)==SC_BLOB
 mf=P/MF; m=json.loads(mf.read_text()); assert len(m['hashed_files'])==13
 for r in m['hashed_files']:
  d=(P/r['path']).read_bytes(); r.update(bytes=len(d),sha256=sh(d),git_blob=blob(d))
 m['combined_sha256']=sh(''.join(sorted(f"{r['path']}\0{r['sha256']}\0{r['bytes']}\n" for r in m['hashed_files'])).encode()); md=jb(m); mf.write_bytes(md)
 return {'input_bytes':len(data),'input_sha256':ish,'input_git_blob':ib,'builder_bytes':bf.stat().st_size,'builder_sha256':sh(bf.read_bytes()),'builder_git_blob':blob(bf.read_bytes()),'test_bytes':tf.stat().st_size,'test_sha256':sh(tf.read_bytes()),'test_git_blob':blob(tf.read_bytes()),'manifest_bytes':len(md),'manifest_sha256':sh(md),'manifest_git_blob':blob(md),'manifest_combined_sha256':m['combined_sha256']}
def commit():
 cmd('git','add','--',*PATHS,cwd=P); e=os.environ.copy(); e.update(GIT_AUTHOR_NAME='BigBirdReturns',GIT_AUTHOR_EMAIL='bigbirdreturns@users.noreply.github.com',GIT_COMMITTER_NAME='BigBirdReturns',GIT_COMMITTER_EMAIL='bigbirdreturns@users.noreply.github.com'); cmd('git','commit','-m','Repair North Dakota promoted-matrix custody contract',cwd=P,env=e); c=g('rev-parse','HEAD',cwd=P); t=g('rev-parse','HEAD^{tree}',cwd=P); assert g('rev-parse','HEAD^',cwd=P)==PAR and sorted(g('diff','--name-only',PAR,c,cwd=P).splitlines())==sorted(PATHS) and sorted(g('diff','--name-only','--diff-filter=A',PAR,c,cwd=P).splitlines())==sorted(PATHS); return c,t
def qualify():
 log('builder-check.txt',cmd('node',B,'--check',cwd=P)); log('validator-stdout.txt',cmd('node',V,'--out',str(O/'validator.json'),cwd=P)); a=cmd('node','--test',T,cwd=P); log('adversarial.log',a); assert 'rejects 49 adversarial mutations' in a and 'fail 0' in a; log('workflow-yaml-parse.txt',cmd('ruby','-e',"require 'yaml'; YAML.load_file(ARGV.fetch(0)); puts 'yaml_ok'",WF,cwd=P)); log('release-check.log',cmd('npm','run','release:check',cwd=P)); cmd('git','reset','--hard','HEAD',cwd=P); cmd('git','clean','-fdx',cwd=P); assert not g('status','--porcelain',cwd=P); log('post-release-builder-check.txt',cmd('node',B,'--check',cwd=P)); log('post-release-validator.txt',cmd('node',V,'--out',str(O/'post-release-validator.json'),cwd=P)); a=cmd('node','--test',T,cwd=P); log('post-release-adversarial.log',a); assert 'rejects 49 adversarial mutations' in a and 'fail 0' in a; log('post-release-workflow-yaml-parse.txt',cmd('ruby','-e',"require 'yaml'; YAML.load_file(ARGV.fetch(0)); puts 'yaml_ok'",WF,cwd=P))
def records(c):
 out=[]
 for p in PATHS:
  d=cmd('git','show',f'{c}:{p}',cwd=P).encode(); out.append({'path':p,'bytes':len(d),'sha256':sh(d),'git_blob':blob(d)})
 return out
def stage(c):
 assert not g('ls-remote','--heads','origin',f'refs/heads/{SB}'); cmd('git','worktree','add','--detach',str(S),PAR); sp=[]
 for p in PATHS:
  d=TWF if p==WF else p; x=cmd('git','show',f'{c}:{p}',cwd=P).encode(); q=S/d; q.parent.mkdir(parents=True,exist_ok=True); q.write_bytes(x); sp.append(d)
 cmd('git','add','--',*sp,cwd=S); e=os.environ.copy(); e.update(GIT_AUTHOR_NAME='github-actions[bot]',GIT_AUTHOR_EMAIL='41898282+github-actions[bot]@users.noreply.github.com',GIT_COMMITTER_NAME='github-actions[bot]',GIT_COMMITTER_EMAIL='41898282+github-actions[bot]@users.noreply.github.com'); cmd('git','commit','-m','Stage qualified North Dakota promoted-matrix custody repair',cwd=S,env=e); c2=g('rev-parse','HEAD',cwd=S); t=g('rev-parse','HEAD^{tree}',cwd=S); assert g('rev-parse','HEAD^',cwd=S)==PAR and sorted(g('diff','--name-only',PAR,c2,cwd=S).splitlines())==sorted(sp); cmd('git','push','origin',f'{c2}:refs/heads/{SB}',cwd=S); assert g('ls-remote','--heads','origin',f'refs/heads/{SB}').split()[0]==c2; return c2,t,sp
def seal(c,t,c2,t2,sp,rp):
 rs=records(c); by={x['path']:x for x in rs}; x={'schema_version':'ssc-rd04-nd-row-state-promoted-custody-repair-materialization@1','state':'qualified_promoted_custody_repair_objects_staged','carrier':{'carrier_base':CB,'carrier_head':CH,'live_main':PAR},'canonical_parent':PAR,'canonical_parent_tree':PART,'source_product_head':SRC,'source_product_tree':SRCT,'product_commit_local':c,'product_tree':t,'permanent_paths':14,'added_paths':14,'modified_paths':0,'deleted_paths':0,'repaired_paths':REPAIRED,'repair':rp,'promoted_matrix':{'bytes':by[f'{ROOT}/promoted-partial-field-matrix.json']['bytes'],'sha256':NEW_SHA,'git_blob':NEW_BLOB},'schema':{'bytes':SC_N,'sha256':SC_SHA,'git_blob':SC_BLOB,'changed':False},'qualification':{'workflow_yaml_parse':'passed','builder':'passed','validator':'passed','promoted_custody_cross_checks':2,'adversarial_refusals':49,'release_check':'passed','post_release_replay':'passed'},'staging':{'branch':SB,'stage_commit':c2,'stage_tree':t2,'stage_paths':sp,'workflow_object_path':TWF,'workflow_git_blob':by[WF]['git_blob']},'file_records':rs,'transition':{'substantive_field_terminalizations':0,'matrix_updates':1,'row_state_mutations':1,'row_terminalizations':1,'terminal_cells':[228,229],'still_open_cells':[222,221],'terminal_units':[10,11],'north_dakota_row_state':['still_open','terminal_fixed_public_record_obligation_complete'],'class_closed':False},'outside_human_dependency':False}; O.mkdir(parents=True,exist_ok=True); (O/'materialization-receipt.json').write_bytes(jb(x)); (O/'SHA256SUMS').write_text(''.join(f'{sh(p.read_bytes())}  {p.name}\n' for p in sorted(O.iterdir()) if p.is_file() and p.name!='SHA256SUMS'))
def main():
 O.mkdir(parents=True,exist_ok=True); owned=None
 try: topology(); prepare(); rp=repair(); c,t=commit(); qualify(); c2,t2,sp=stage(c); owned=c2; seal(c,t,c2,t2,sp,rp); return 0
 except Exception:
  if owned:
   try:
    raw=g('ls-remote','--heads','origin',f'refs/heads/{SB}');
    if raw and raw.split()[0]==owned: cmd('git','push','origin',f':refs/heads/{SB}')
   except Exception: pass
  (O/'failure.txt').write_text(traceback.format_exc()); return 1
if __name__=='__main__': raise SystemExit(main())
