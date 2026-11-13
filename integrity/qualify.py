#!/usr/bin/env python3
"""Real-record acceptance and mutation tests; fixtures are derived copies only."""
from __future__ import annotations
import argparse,copy,hashlib,json,os,shutil,subprocess,sys,tempfile,time
from pathlib import Path
import workbench as W

def main():
 p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
 root=a.bundle.resolve();out=a.out.resolve();out.mkdir(parents=True,exist_ok=True);checks=[]
 def check(name,fn):
  try:
   detail=fn();checks.append({'check':name,'pass':True,'detail':detail})
  except Exception as e:checks.append({'check':name,'pass':False,'detail':type(e).__name__+': '+str(e)})
 def require(x,message):
  if not x:raise AssertionError(message)
 def refuses(fn):
  try:fn()
  except (ValueError,OSError,KeyError):return True
  raise AssertionError('Expected refusal')
 data=W.read_json(root/'data.json');runtime=root/'runtime'
 check('portable_manifest',lambda:W.verify(root))
 check('real_corpus_denominators',lambda:require({c:sum(r['collection']==c for r in data['records']) for c in set(r['collection'] for r in data['records'])}=={'Government awards':17,'Capital observations':17,'Portfolio listings':30,'Schoolhouse 2024 presenters':20,'Schoolhouse faculty snapshot':18,'Anduril case claims':21,'Source reconciliation':1},'Source census changed'))
 check('private_support_excluded',lambda:require(len(data['excluded'])==3 and not any('anduril-bundle-r3' in json.dumps(r) for r in data['records']),'Private or unresolved support leaked'))
 check('historical_neros_only',lambda:require(all(r['collection']=='Schoolhouse 2024 presenters' for r in W.query(root,'Neros')['records']),'Neros scope changed'))
 check('firestorm_four_real_records',lambda:require(W.query(root,'Firestorm')['matched']==4,'Unexpected Firestorm count'))
 check('cambium_identity_hold_survives',lambda:require(any(r['label']=='Cambium' and r['identity_state']=='held' for r in data['records']),'Identity hold lost'))
 check('null_outlay_never_zero',lambda:require(all(r['amounts'].get('outlay') is None for r in data['records'] if r['label']=='Hadrian' and r['collection']=='Government awards'),'Unknown payment changed'))
 check('raft_ceiling_not_obligation',lambda:require(any(r['label']=='Raft' and r['amounts'].get('ceiling')=='349000000' and r['amounts'].get('obligated') is None for r in data['records']),'Press ceiling collapsed'))
 check('xbow_disagreement_preserved',lambda:require(next(r for r in data['records'] if r['collection']=='Source reconciliation')['payload']['reconciliation']['obligation_delta']==8000000,'Conflict lost'))
 check('query_empty_refused',lambda:refuses(lambda:W.query(root,'')))
 check('query_size_refused',lambda:refuses(lambda:W.query(root,'x'*161)))
 check('query_return_budget_refused',lambda:refuses(lambda:W.query(root,'Anduril',21)))
 check('duplicate_json_refused',lambda:refuses(lambda:W.loads('{"x":1,"x":2}')))
 check('nonfinite_json_refused',lambda:refuses(lambda:W.loads('{"x":NaN}')))
 check('path_traversal_refused',lambda:refuses(lambda:W.local_path(root,'../secret')))
 def mutation(name,edit):
  dest=out/name;shutil.copytree(root,dest);edit(dest);return refuses(lambda:W.verify(dest))
 check('data_byte_tamper_refused',lambda:mutation('tamper-data',lambda d:(d/'data.json').write_bytes((d/'data.json').read_bytes()+b' ')))
 check('missing_excerpt_refused',lambda:mutation('missing-excerpt',lambda d:(d/data['records'][0]['fragment']['path']).unlink()))
 check('ui_byte_tamper_refused',lambda:mutation('tamper-ui',lambda d:(d/'index.html').write_text('<p>altered</p>')))
 def promote(d):
  v=W.read_json(d/'data.json');v['review_state']='approved';(d/'data.json').write_bytes(W.canonical(v));W.write_manifest(d)
 check('self_promoted_review_refused',lambda:mutation('self-promotion',promote))
 def invoke(request,store,base):
  f=base/'request.json';f.write_text(json.dumps(request));r=subprocess.run([sys.executable,'-B',str(runtime/'second_run/work.py'),'--request',str(f),'--store',str(store)],capture_output=True,text=True,timeout=30)
  value=json.loads(r.stdout);return r.returncode,value
 request={'tasks':[{'id':'awards','task_class':'evidence-inspect','source':str(root/'data.json'),'collection':'Government awards'},{'id':'capital','task_class':'evidence-inspect','source':str(root/'data.json'),'collection':'Capital observations'},{'id':'conflict','task_class':'evidence-inspect','source':str(root/'data.json'),'collection':'Source reconciliation'}]}
 store=out/'reuse-store';code,cold=invoke(request,store,out);(out/'cold.json').write_text(json.dumps(cold,indent=2))
 check('native_cantos_cold',lambda:require(code==0 and cold['summary']=={'executed':3,'reused':0,'held':0},str(cold)))
 code,warm=invoke(request,store,out);(out/'warm.json').write_text(json.dumps(warm,indent=2))
 check('native_cantos_checked_reuse',lambda:require(code==0 and warm['summary']=={'executed':0,'reused':3,'held':0},str(warm)))
 changed=copy.deepcopy(request);changed['tasks'][0]['collection']='Portfolio listings';code,change=invoke(changed,store,out);(out/'changed.json').write_text(json.dumps(change,indent=2))
 check('semantic_change_only_recomputes_requested_task',lambda:require(code==0 and change['summary']=={'executed':1,'reused':2,'held':0},str(change)))
 held=copy.deepcopy(request);held['tasks'][0]['collection']='not-a-collection';code,hold=invoke(held,store,out)
 check('one_invalid_task_preserves_independent_reuse',lambda:require(code==1 and hold['summary']=={'executed':0,'reused':2,'held':1},str(hold)))
 retained=Path(warm['tasks'][0]['result']);raw=retained.read_bytes();retained.write_bytes(raw.replace(b'"record_count":17',b'"record_count":18',1));code,bad=invoke(request,store,out)
 check('corrupt_cache_held_no_overwrite',lambda:require(bad['summary']['held']==1 and retained.read_bytes()!=raw,'Corrupt cache was accepted or silently repaired'))
 expected=W.sha((root/'data.json').read_bytes());machine=runtime/'clifford_machine.py'
 env=os.environ.copy();env['CLIFFORD_EVIDENCE_BUNDLE']=str(root);env['CLIFFORD_EVIDENCE_SHA256']=expected;env['PYTHONPATH']=str(runtime)
 messages=[{'request_id':'1','operation':'DESCRIBE'},{'request_id':'2','operation':'QUERY','query':'Firestorm','limit':5},{'request_id':'3','operation':'PUBLISH'},{'request_id':'4','operation':'QUERY','query':'Anduril','path':'/etc/passwd'},{'request_id':'5','operation':'RELEASE'}]
 r=subprocess.run([sys.executable,'-B',str(machine)],input=''.join(json.dumps(x)+'\n' for x in messages),env=env,capture_output=True,text=True,timeout=30);responses=[json.loads(x) for x in r.stdout.splitlines()];(out/'aperture.json').write_text(json.dumps(responses,indent=2))
 check('aperture_describe_pinned',lambda:require(responses[0]['ok'] and responses[0]['package_sha256']==expected,'Scope descriptor mismatch'))
 check('aperture_actual_records',lambda:require(responses[1]['ok'] and responses[1]['matched']==4,'Real record query failed'))
 check('aperture_publish_refused',lambda:require(responses[2]['ok'] is False,'Write operation admitted'))
 check('aperture_path_injection_refused',lambda:require(responses[3]['ok'] is False,'Caller path admitted'))
 check('aperture_released',lambda:require(responses[4].get('released') is True,'Machine did not release'))
 r=subprocess.run([sys.executable,'-B','-m','mary.evidence','--machine',str(machine),'--bundle',str(root),'--sha256',expected,'--query','Neros','--ledger',str(out/'mary-outcomes.jsonl')],env=env,capture_output=True,text=True,timeout=30)
 (out/'mary.json').write_text(r.stdout);mary=json.loads(r.stdout)
 check('mary_native_real_read',lambda:require(r.returncode==0 and mary['result']['matched']==1 and mary['ledger_verification']['status']=='pass','MARY read failed'))
 check('mary_retrieval_not_acceptance',lambda:require(mary['occurrence']['event']['outcome_state']=='retrieved_for_review' and mary['occurrence']['event']['human_review_granted'] is False,'Retrieval promoted to truth'))
 check('model_and_gpu_free_execution',lambda:require(all(x['model_calls']==0 and x['gpu_runs']==0 for x in cold['tasks']),'Unexpected inference or GPU work'))
 summary={'status':'pass' if all(x['pass'] for x in checks) else 'fail','passed':sum(x['pass'] for x in checks),'total':len(checks),'checks':checks,'source_edition':data['edition'],'scope':'Software and artifact interoperability over retained real records. No independent human claim review, public deployment, live-source refresh or Integrity.ai endpoint ingestion.'}
 (out/'ACCEPTANCE.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2));return 0 if summary['status']=='pass' else 1
if __name__=='__main__':raise SystemExit(main())
