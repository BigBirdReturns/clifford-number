#!/usr/bin/env python3
from __future__ import annotations
import argparse, concurrent.futures, datetime as dt, hashlib, json, pathlib, urllib.error, urllib.request
from urllib.parse import urlparse
ROOT=pathlib.Path(__file__).resolve().parents[3]
DATA=ROOT/'data/intake/status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-minimum-frontier-protocol'
PROTOCOL=DATA/'route-ledger.json'
def dump(o): return json.dumps(o,indent=2,sort_keys=True,ensure_ascii=False)+'\n'
def sha(b): return hashlib.sha256(b).hexdigest()
def load(): return json.loads(PROTOCOL.read_text())
def validate(p):
 assert p['schema_version']=='ssc-rd04-wave03-mf7-minimum-frontier-route-ledger@1'
 assert p['counts']['fixed_routes']==30 and p['counts']['federal_interpretive_routes']==2 and p['counts']['state_specific_routes']==28 and len(p['routes'])==30
 x=p['execution_contract']; assert x['maximum_attempts_per_route']==1 and x['maximum_parallel_workers']==4 and x['result_spawned_requests']==0
 assert not x['automatic_source_admission'] and not x['automatic_field_classification'] and not x['automatic_row_terminalization'] and not x['automatic_class_closure']
 allowed=set(x['allowed_final_hosts']); ids=set(); urls=set()
 for n,r in enumerate(p['routes'],1):
  assert r['route_ordinal']==n and r['route_id']==f'RD04-W03-MF7-{n:03d}'
  assert r['route_id'] not in ids and r['url'] not in urls; ids.add(r['route_id']); urls.add(r['url'])
  u=urlparse(r['url']); assert u.scheme=='https' and (u.hostname or '').lower() in allowed and r['expected_request_host']==(u.hostname or '').lower()
  assert r['maximum_attempts']==1 and r['maximum_body_bytes']==33554432 and r['result_spawned_requests']==0
  assert not r['automatic_source_admission'] and not r['automatic_field_classification'] and not r['automatic_row_terminalization'] and not r['automatic_class_closure']
 return p
class BoundRedirect(urllib.request.HTTPRedirectHandler):
 def __init__(self,allowed): self.allowed=allowed
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  host=(urlparse(newurl).hostname or '').lower()
  if host not in self.allowed: raise RuntimeError(f'disallowed redirect host: {host}')
  return super().redirect_request(req,fp,code,msg,headers,newurl)
def capture(route,allowed,out):
 rid=route['route_id']; d=out/'routes'/rid; d.mkdir(parents=True,exist_ok=True)
 request={'route_id':rid,'url':route['url'],'method':'GET','maximum_attempts':1,'result_spawned_requests':0}; (d/'request.json').write_text(dump(request))
 start=dt.datetime.now(dt.timezone.utc).isoformat(); state='terminal_transport_failure'; status=None; final_url=None; body=b''; headers={}; error=None
 try:
  opener=urllib.request.build_opener(BoundRedirect(allowed)); req=urllib.request.Request(route['url'],headers={'User-Agent':'SSC-RD04-W03-MF7-bounded-capture/1.0','Accept':'*/*'})
  with opener.open(req,timeout=45) as resp:
   status=getattr(resp,'status',None); final_url=resp.geturl(); headers=dict(resp.headers.items()); body=resp.read(route['maximum_body_bytes']+1)
  host=(urlparse(final_url).hostname or '').lower()
  if host not in allowed: state='terminal_disallowed_final_host'
  elif len(body)>route['maximum_body_bytes']: state='terminal_body_limit_exceeded'; body=body[:route['maximum_body_bytes']]
  elif status is not None and 200<=status<300: state='http_success_pending_separate_adjudication'
  else: state='terminal_http_non_success'
 except urllib.error.HTTPError as e:
  status=e.code; final_url=e.geturl(); headers=dict(e.headers.items()) if e.headers else {}; body=e.read(route['maximum_body_bytes']); state='terminal_http_non_success'; error=str(e)
 except Exception as e: error=f'{type(e).__name__}: {e}'
 (d/'body.bin').write_bytes(body); header_text=dump(headers); (d/'headers.json').write_text(header_text)
 receipt={'route_id':rid,'route_ordinal':route['route_ordinal'],'state_scope':route['state_scope'],'route_category':route['route_category'],'target_cell_keys':route['target_cell_keys'],'state':state,'request_attempts':1,'started_at':start,'completed_at':dt.datetime.now(dt.timezone.utc).isoformat(),'http_status':status,'final_url':final_url,'final_host':(urlparse(final_url).hostname or '').lower() if final_url else None,'body_bytes':len(body),'body_sha256':sha(body),'headers_sha256':sha(header_text.encode()),'error':error,'source_admitted':False,'field_classification_effect':'none','row_terminalization_effect':'none','class_closure_effect':'none','result_spawned_requests':0,'outside_human_dependency':False}; (d/'receipt.json').write_text(dump(receipt)); return receipt
def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--validate-only',action='store_true'); ap.add_argument('--output'); args=ap.parse_args(); p=validate(load())
 if args.validate_only:
  print('rd04_mf7_minimum_frontier_protocol_validation=pass'); print('fixed_routes=30'); print('target_states=7'); print('target_cells=21'); print('result_spawned_requests=0'); return
 if not args.output: ap.error('--output required unless --validate-only')
 out=pathlib.Path(args.output); out.mkdir(parents=True,exist_ok=True); allowed=set(p['execution_contract']['allowed_final_hosts']); started=dt.datetime.now(dt.timezone.utc).isoformat()
 with concurrent.futures.ThreadPoolExecutor(max_workers=p['execution_contract']['maximum_parallel_workers']) as ex: results=list(ex.map(lambda r:capture(r,allowed,out),p['routes']))
 results.sort(key=lambda x:x['route_ordinal']); (out/'route-results.json').write_text(dump({'schema_version':'ssc-rd04-wave03-mf7-minimum-frontier-route-results@1','protocol_id':p['protocol_id'],'routes':results}))
 states=['http_success_pending_separate_adjudication','terminal_http_non_success','terminal_disallowed_final_host','terminal_transport_failure','terminal_body_limit_exceeded']; counts={k:sum(1 for r in results if r['state']==k) for k in states}
 receipt={'schema_version':'ssc-rd04-wave03-mf7-minimum-frontier-execution-receipt@1','protocol_id':p['protocol_id'],'fixed_routes':30,'terminal_routes':30,'started_at':started,'completed_at':dt.datetime.now(dt.timezone.utc).isoformat(),'state_counts':counts,'source_admissions':0,'field_classifications':0,'row_terminalizations':0,'class_closures':0,'result_spawned_requests':0,'outside_human_dependency':False}; (out/'execution-receipt.json').write_text(dump(receipt))
 entries=[]
 for f in sorted(x for x in out.rglob('*') if x.is_file() and x.name!='manifest.json'):
  b=f.read_bytes(); entries.append({'path':str(f.relative_to(out)),'bytes':len(b),'sha256':sha(b)})
 combined=sha(''.join(f"{e['path']}\0{e['sha256']}\n" for e in entries).encode()); (out/'manifest.json').write_text(dump({'schema_version':'ssc-rd04-wave03-mf7-minimum-frontier-capture-manifest@1','entries':entries,'combined_sha256':combined}))
 print(dump(receipt),end='')
if __name__=='__main__': main()
