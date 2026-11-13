#!/usr/bin/env python3
"""Reconcile identifiers and provenance already present in the public-source ecology.
Reads the existing acquisition database plus explicitly named public ledgers. Never
walks/indexes the retained filesystem or promotes actor/causal graph relationships.
"""
from __future__ import annotations
import argparse,collections,datetime,hashlib,json,pathlib,re,sqlite3,urllib.parse
ROOT=pathlib.Path(__file__).resolve().parents[1]
def digest(x):return hashlib.sha256(x.encode()).hexdigest()
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def urlkey(s):
 try:
  p=urllib.parse.urlsplit(s)
  if p.scheme not in ('http','https'):return None
  return urllib.parse.urlunsplit((p.scheme.lower(),p.netloc.lower(),p.path.rstrip('/') or '/',p.query,''))
 except ValueError:return None
def j(x):return json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def jsonl(p):
 return [json.loads(s)for s in p.read_text().splitlines()if s.strip()]
def build(repo,state,out):
 out.mkdir(parents=True,exist_ok=True);db=state/'ecology.sqlite'
 c=sqlite3.connect('file:'+str(db)+'?mode=ro',uri=True,timeout=90);c.row_factory=sqlite3.Row;c.execute('BEGIN')
 maximum=c.execute('select coalesce(max(rowid),0) from documents').fetchone()[0]
 tasks={r['id']:{**dict(r),'spec':json.loads(r['spec']),'estates':json.loads(r['estates'])}for r in c.execute('select id,kind,spec,estates,status from tasks')}
 capture_tasks=collections.defaultdict(set)
 for r in c.execute('select sha256,task_id from captures where status=200 and error is null and sha256 is not null'):capture_tasks[r['sha256']].add(r['task_id'])
 groups={};recipients={};label_ueis=collections.defaultdict(set);kindcounts=collections.Counter();rows=0
 for r in c.execute("select id,locator,source_hash,position,kind,estates,title,record_date,payload from documents where origin='acquired' and rowid<=?",(maximum,)):
  rows+=1;kindcounts[r['kind']]+=1;payload=json.loads(r['payload']);record=payload.get('source_record',{})
  namespace=None;native=None
  if r['kind']=='award':
   native=record.get('generated_internal_id');namespace='usaspending_award' if native else None
   uei=record.get('Recipient UEI');label=payload.get('queried_roster_label')
   if uei and re.fullmatch('[A-Z0-9]{12}',uei):
    if label:label_ueis[label].add(uei)
    group=recipients.setdefault(uei,{'uei':uei,'recipient_labels':set(),'query_labels':set(),'award_ids':set(),'document_ids':set(),'dates':set()})
    group['recipient_labels'].add(record.get('Recipient Name',''));group['query_labels'].add(label or '');group['award_ids'].add(native or r['id']);group['document_ids'].add(r['id']);group['dates'].add(r['record_date'] or '')
  elif r['kind']in ('federal_register','federal_register_detail'):
   native=record.get('document_number');namespace='federal_register_document' if native else None
  elif r['kind']=='nsf_award':
   native=payload.get('native_id')or record.get('id');namespace='nsf_award' if native else None
  elif r['kind']=='statutory_instrument':
   native=payload.get('native_id');namespace='us_statute_instrument' if native else None
  elif r['kind']=='govinfo_report_metadata':
   native=payload.get('native_id');namespace='govinfo_package' if native else None
  if not namespace:continue
  key=namespace+':'+str(native)
  g=groups.setdefault(key,{'key':key,'namespace':namespace,'native_id':str(native),'title':r['title'],'document_ids':set(),'record_dates':set(),'estate_routes':set(),'source_hashes':set(),'query_tasks':set(),'queries':set(),'observations':[],'stored_estates':set()})
  g['document_ids'].add(r['id']);g['record_dates'].add(r['record_date'] or '');g['source_hashes'].add(r['source_hash']);g['stored_estates'].update(json.loads(r['estates']));g['estate_routes'].update(json.loads(r['estates']))
  for tid in capture_tasks.get(r['source_hash'],[]):
   t=tasks.get(tid)
   if t:
    g['estate_routes'].update(t['estates']);g['query_tasks'].add(tid)
    if t['spec'].get('term'):g['queries'].add(t['spec']['term'])
  g['observations'].append({'document_id':r['id'],'source_hash':r['source_hash'],'locator':r['locator'],'position':r['position'],'kind':r['kind'],'record_date':r['record_date']})
 c.rollback();c.close()
 # Namespaced identity and original source rows survive. Grouping does not sum amounts or merge firms.
 native_rows=[];cross=[]
 for key,g in sorted(groups.items()):
  row={k:sorted(v)if isinstance(v,set)else v for k,v in g.items()}
  row['connection_type']='same_source_native_record';row['assertion']='These captured observations carry the same source-native identifier; semantic or legal entity equivalence beyond that identifier is unadjudicated.';row['canonical_graph_effect']='none'
  native_rows.append(row)
  if len(g['estate_routes'])>1:
   cross.append({'key':key,'title':g['title'],'estate_routes':sorted(g['estate_routes']),'queries':sorted(g['queries']),'observation_count':len(g['document_ids']),'record_dates':sorted(g['record_dates']),'source_hashes':sorted(g['source_hashes']),'recovered_route_count':len(g['estate_routes']-g['stored_estates']),'connection_type':'shared_source_record_across_research_routes','graph_effect':'none'})
 recipient_rows=[]
 for u,g in sorted(recipients.items()):
  recipient_rows.append({k:sorted(v)if isinstance(v,set)else v for k,v in g.items()}|{'connection_type':'same_source_recipient_UEI','interpretation':'Identifier co-reference in source data, not acceptance of the queried roster company, historical legal status, ownership, influence or wrongdoing.'})
 # Only the specifically named, public canonical ledgers; no broad private/retained corpus indexing.
 paths=['data/ledger/claims.jsonl','data/ledger/surfaces.jsonl','data/ledger/participation.jsonl','data/ledger/receipts.jsonl','data/ledger/chains.jsonl']
 ledgers={p:jsonl(repo/p)for p in paths};fingerprints={p:hashlib.sha256((repo/p).read_bytes()).hexdigest()for p in paths}
 receipts={r['receipt_id']:r for r in ledgers['data/ledger/receipts.jsonl']};surfaces={r['surface_id']:r for r in ledgers['data/ledger/surfaces.jsonl']};claims=ledgers['data/ledger/claims.jsonl'];links=[];broken=[]
 def add(source,predicate,target,provenance,status):links.append({'source':source,'predicate':predicate,'target':target,'source_locator':provenance,'source_status':status,'graph_effect':'none','meaning':'Explicit reference already present in the named canonical ledger; no new factual relationship asserted.'})
 for i,x in enumerate(claims,1):
  ref=f'data/ledger/claims.jsonl:{i}';node='claim:'+x['claim_id']
  for rid in x.get('receipt_ids',[]):
   if rid not in receipts:broken.append({'at':ref,'missing_receipt':rid})
   else:add(node,'supported_by','receipt:'+rid,ref,x.get('evidence_class'))
  for surface in x.get('surface_ids',[]):
   if surface not in surfaces:broken.append({'at':ref,'missing_surface':surface})
   else:add(node,'about_surface','surface:'+surface,ref,x.get('evidence_class'))
 for i,x in enumerate(ledgers['data/ledger/participation.jsonl'],1):
  ref=f'data/ledger/participation.jsonl:{i}';entity=x.get('actor_id')or x.get('organization_id');surface=x['surface_id']
  add('participation:'+str(i),'refers_to_entity',str(x['participant_type'])+':'+str(entity),ref,x.get('evidence_class'))
  add('participation:'+str(i),'recorded_on','surface:'+surface,ref,x.get('participation_type'))
  for rid in x.get('receipt_ids',[]):add('participation:'+str(i),'supported_by','receipt:'+rid,ref,x.get('evidence_class'))
 # Shared-source URLs connect receipt custody, not people. Preserve precise query strings.
 urls=collections.defaultdict(list)
 for rid,r in receipts.items():
  u=urlkey(r.get('source_url')or r.get('url')or '')
  if u:urls[u].append(rid)
 shared=[]
 for u,ids in urls.items():
  if len(ids)>1:shared.append({'url':u,'receipt_ids':sorted(ids),'connection_type':'shared_source_locator','graph_effect':'none'})
 # Accepted corpus record references can be traced to exact archived citations without inferring a new hop.
 missing_route=sum(x['recovered_route_count']for x in cross)
 summary={'schema':'clifford/ecology-reconciliation@1','observed_at':stamp(),'source_rowid_watermark':maximum,'acquired_rows_examined':rows,'record_kinds':dict(kindcounts),'native_record_groups':len(native_rows),'repeated_native_record_groups':sum(len(g['document_ids'])>1 for g in native_rows),'cross_estate_native_records':len(cross),'recovered_estate_route_assignments':missing_route,'source_UEI_groups':len(recipient_rows),'ambiguous_roster_queries':sum(len(v)>1 for v in label_ueis.values()),'canonical_explicit_reference_links':len(links),'canonical_broken_references':len(broken),'shared_receipt_locators':len(shared),'retained_files_read':paths,'canonical_input_sha256':fingerprints,'new_actor_hops':0,'causal_claims_created':0,'complete':False,'boundary':'Source identity and custody connections, not new accepted actor, control or causal graph edges.'}
 for filename,data in [('native-record-groups.jsonl',native_rows),('cross-estate-records.jsonl',cross),('recipient-identifier-groups.jsonl',recipient_rows),('explicit-ledger-links.jsonl',links),('shared-receipt-sources.jsonl',shared),('broken-references.jsonl',broken),('roster-name-collisions.jsonl',[{'query_label':k,'distinct_uei_count':len(v),'source_ueis':sorted(v),'identity_state':'unresolved_name_collision'}for k,v in sorted(label_ueis.items())if len(v)>1])]:
  (out/filename).write_text(''.join(j(x)+'\n'for x in data))
 (out/'RECONCILIATION.json').write_text(json.dumps(summary,indent=2)+'\n')
 # Actionable, immediately readable findings, not another interface.
 text=['# Existing evidence connections recovered',f'Observed: {summary["observed_at"]}',summary['boundary'],'',f'{len(cross)} source-native records appear across more than one research estate; {missing_route} route assignments were recoverable from the original source captures but absent from the stored document estate list.','',f'{summary["ambiguous_roster_queries"]} roster-name queries returned multiple source UEIs; those candidates remain unresolved. No monetary total is summed across repeated observations.','\n## Cross-estate examples']
 for x in sorted(cross,key=lambda x:(-x['recovered_route_count'],-len(x['estate_routes']),x['key']))[:20]:text += [f'### {x["key"]}',x['title'],'Research routes: '+', '.join(x['estate_routes']),'Source queries: '+', '.join(x['queries']),'Source hashes: '+', '.join(x['source_hashes']), '']
 text+=['## Remaining work','The exact source identifiers establish reusable lookup connections. Legal identity, historical ownership, causal chains and missing decision instruments remain separate research tasks. See JSONL observations for original locators and source hashes.']
 (out/'FINDINGS.md').write_text('\n'.join(text)+'\n');print(json.dumps(summary,indent=2));return summary
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--repo',type=pathlib.Path,default=ROOT);p.add_argument('--state',type=pathlib.Path,required=True);p.add_argument('--out',type=pathlib.Path,required=True);a=p.parse_args();build(a.repo.resolve(),a.state.resolve(),a.out.resolve())
