#!/usr/bin/env python3
"""Retained Clifford records -> portable local review desk. No promotion or scoring."""
from __future__ import annotations
import argparse,base64,csv,hashlib,json,os,re,subprocess,sys
from datetime import datetime,timezone
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlparse
HERE=Path(__file__).resolve().parent
SCHEMA='clifford/evidence-desk@1'
LIMIT=16*1024*1024
BOUNDARY=('Retained public-source research for local review. Source assertions, company claims, official records, identity holds and review requirements remain distinct. No new canonical relationship, ethics score, independent human review, current contract status, public release or Integrity.ai ingestion is established.')
def canonical(x):return json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode('utf-8')
def sha(x):return hashlib.sha256(x).hexdigest()
def no_duplicates(pairs):
 out={}
 for k,v in pairs:
  if k in out:raise ValueError('Duplicate JSON field: '+k)
  out[k]=v
 return out
def loads(x):return json.loads(x,object_pairs_hook=no_duplicates,parse_constant=lambda t:(_ for _ in ()).throw(ValueError('Nonfinite number: '+t)))
def read_json(p):
 p=Path(p)
 if p.stat().st_size>LIMIT:raise ValueError('Oversized input: '+p.name)
 return loads(p.read_bytes())
def public_url(x):
 if not isinstance(x,str):return None
 p=urlparse(x)
 return x if p.scheme in ('http','https') and p.netloc and not p.username and not p.password else None
def local_path(root,name):
 rel=Path(name)
 if rel.is_absolute() or '..' in rel.parts:raise ValueError('Unsafe package member')
 candidate=root/rel
 if candidate.is_symlink():raise ValueError('Symlink package member')
 path=candidate.resolve()
 if not path.is_relative_to(root.resolve()):raise ValueError('Package member escaped root')
 return path
class Sources:
 def __init__(self,repo):self.repo=Path(repo).resolve();self.files={}
 def raw(self,name):
  p=local_path(self.repo,name);raw=p.read_bytes()
  if len(raw)>LIMIT:raise ValueError('Oversized source: '+name)
  self.files[name]={'path':name,'sha256':sha(raw),'bytes':len(raw)};return raw
 def json(self,name):return loads(self.raw(name))
 def rows(self,name):
  rows=[];offset=0
  for n,line in enumerate(self.raw(name).splitlines(keepends=True),1):
   if line.strip():rows.append((loads(line),{'line':n,'byte_start':offset,'byte_end':offset+len(line),'excerpt_sha256':sha(line)}))
   offset+=len(line)
  return rows
def build(repo,output,source_ref=None):
 repo,output=Path(repo).resolve(),Path(output).resolve()
 if output.exists():raise ValueError('Output exists; retain it and select a new edition directory')
 src=Sources(repo);records=[];fragments={};exclusions=[]
 cp=subprocess.run(['git','-C',str(repo),'rev-parse',source_ref or 'HEAD'],capture_output=True,text=True)
 revision=cp.stdout.strip()
 if cp.returncode or not re.fullmatch('[0-9a-f]{40}',revision):raise ValueError('Full source Git revision required')
 base_url='https://github.com/BigBirdReturns/clifford-number/blob/'+revision+'/'
 router='data/intake/person-centered-defense-routers/';bvvc='data/intake/bvvc-defense-capital/';case='cases/anduril-access-ownership/'
 def receipt_map(paths):
  out={}
  for p in paths:
   for row,_ in src.rows(p):
    rid=row.get('receipt_id')
    if rid:
     if rid in out and out[rid]!=row:raise ValueError('Conflicting receipt id: '+rid)
     out[rid]=row
  return out
 rr=receipt_map([router+'receipts.jsonl'])
 br=receipt_map([str(p.relative_to(repo)) for p in sorted((repo/bvvc).glob('source-inventory-*.jsonl'))])
 cr=receipt_map([case+'receipts.jsonl'])
 def add(collection,native_id,label,predicate,raw,path,loc,as_of,evidence,status,receipts,limits,amounts=None):
  rid='record_'+sha(canonical([collection,str(native_id)]))[:32]
  if any(r['id']==rid for r in records):raise ValueError('Duplicate source record id')
  sources=[]
  for r in receipts:
   url=public_url(r.get('url') or r.get('locator_url') or r.get('source_url'))
   if url:sources.append({'id':r.get('receipt_id'),'url':url,'evidence_class':r.get('evidence_class') or r.get('source_type'),'retrieved_at':r.get('retrieved_at') or r.get('accessed_date'),'archive_reference':r.get('archive'),'source_content_sha256':r.get('content_sha256'),'limits':r.get('limits') or r.get('limitations') or r.get('notes') or r.get('note')})
  direct=public_url(raw.get('source_url'))
  if direct and not any(s['url']==direct for s in sources):sources.append({'id':None,'url':direct,'evidence_class':evidence,'retrieved_at':as_of,'source_content_sha256':None,'limits':'Retained locator; not fetched by this build.'})
  fragment=canonical(raw)+b'\n';fp='evidence/'+rid+'.json';fragments[fp]=fragment
  records.append({'id':rid,'native_id':str(native_id),'collection':collection,'label':str(label),'predicate':predicate,'source_as_of':as_of,'evidence_class':evidence,'native_status':status,'review_state':'requires_independent_review','identity_state':raw.get('identity_state') or raw.get('legal_entity_state') or 'source_scoped_only','amounts':amounts or {},'source':{'path':path,'git_revision':revision,'file_sha256':src.files[path]['sha256'],**loc,'url':base_url+path+('#L'+str(loc['line']) if 'line' in loc else '')},'receipts':sources,'fragment':{'path':fp,'sha256':sha(fragment),'format':'canonical_research_row_excerpt'},'limits':limits,'graph_effect':'none','publication_state':'local_review_only','payload':raw})
 def money(v):return None if v is None else format(Decimal(str(v)),'f')
 path=router+'government-awards.jsonl';date=src.json(router+'sources/government-awards.json').get('retrieved_at')
 for r,loc in src.rows(path):
  add('Government awards',r['award_id'],r['org'],'source_reports_government_award',r,path,loc,date,r.get('evidence_state'),r.get('discovery_admission_state'),[rr.get(i,{}) for i in r.get('receipt_ids',[])],'Point-in-time, per-award research. Ceiling, obligation and outlay are distinct. Unknown outlay is not zero. This is not company revenue, total government business, proof of performance or a currently active contract. Retained identity holds remain held.',{'currency':'USD','ceiling':money(r.get('contract_ceiling_usd')),'obligated':money(r.get('obligated_usd')),'outlay':money(r.get('outlay_usd'))})
 path=bvvc+'transactions.jsonl'
 for r,loc in src.rows(path):
  a=r.get('announced_round_amount') or {}
  add('Capital observations',r['transaction_id'],r.get('company_label') or r['company_id'],'source_reports_financing_or_investment',r,path,loc,r.get('as_of'),r.get('evidence_class'),r.get('promotes_to'),[br.get(i,{}) for i in r.get('receipt_ids',[])],'Announced round size is not the amount invested by BVVC. Equity, security terms, board rights, closing instruments and transaction-to-vehicle identity require separate evidence.',{'currency':a.get('currency'),'announced_round':money(a.get('value'))})
 for part in ('01','02','03'):
  path=bvvc+'portfolio-current-'+part+'.jsonl'
  for r,loc in src.rows(path):
   add('Portfolio listings',r['organization_id'],r['label'],'listed_on_portfolio_page',r,path,loc,r.get('as_of'),'primary_public_listing',r.get('promotes_to'),[br.get(i,{}) for i in r.get('receipt_ids',[])],'Dated public portfolio label. No equity percentage, current holding, board right, specific vehicle, government customer or operational control is inferred.')
 path=bvvc+'schoolhouse.json';school=src.json(path)
 for group,rows,ids,pointer in [('Schoolhouse 2024 presenters',school['demo_day_2024']['companies'],school['demo_day_2024']['receipt_ids'],'/demo_day_2024/companies/'),('Schoolhouse faculty snapshot',school['faculty_surface']['rows'],[school['faculty_surface']['receipt_id']],'/faculty_surface/rows/')]:
  for i,r in enumerate(rows):add(group,str(i)+':'+r['label'],r['label'],'source_lists_participant_or_faculty',r,path,{'json_pointer':pointer+str(i)},school.get('as_of'),'primary_public_listing',school.get('promotes_to'),[br.get(k,{}) for k in ids],'Historical roster or faculty snapshot, not the November 2026 assembly. Listing establishes no attendance, investment, customer status, endorsement, pairwise contact or coordination.')
 path=case+'claims.jsonl'
 for r,loc in src.rows(path):
  refs=[cr.get(k,{}) for k in r.get('receipt_ids',[])]
  if not refs or any(not public_url(s.get('url') or s.get('locator_url')) for s in refs):exclusions.append({'native_id':r['claim_id'],'reason':'Private or unresolved supporting locator; excluded from portable review.'});continue
  add('Anduril case claims',r['claim_id'],'Anduril / '+r['subject_id'],r['predicate'],r,path,loc,'2026-07-21',r.get('evidence_class'),r.get('claim_status'),refs,r.get('qualification') or 'Native status retained. Overall case remains review-required; this build grants no independent review or causal conclusion.')
 xr=receipt_map(['data/intake/natsec100-pathways/chunk1/receipts.jsonl'])
 path='data/research/natsec100-x-bow-award-adjudication.json';r=src.json(path)
 add('Source reconciliation',r['contract']['piid'],'X-Bow Systems','conflicting_source_values_retained',r,path,{'json_pointer':''},r.get('as_of'),'official_source_reconciliation',r.get('status'),[xr[k] for k in ['R017','R018','R019']],'Retained announcement and USAspending values differ; retained transactions contain one initial action. Cause remains unresolved. No fraud finding, later-modification explanation, current balance or publication approval is inferred.')
 inputs=[{'namespace':'clifford:source-record:'+r['collection'],'label':r['native_id'],'predicate':r['predicate'],'value':canonical(r['payload']).decode()} for r in records]
 cp=subprocess.run(['node',str(HERE/'identity.mjs'),str(repo/'tools/lib/axm-id.mjs')],input=canonical(inputs),capture_output=True,timeout=30)
 if cp.returncode:raise ValueError('Native AXM identity failed: '+cp.stderr.decode(errors='replace'))
 ids=loads(cp.stdout)
 if len(ids)!=len(records):raise ValueError('AXM identity output count mismatch')
 for r,ident in zip(records,ids):r['axm']={**ident,'scope':'Source-record identity; not cross-source legal resolution or a signed shard.'}
 identity_bytes=src.raw('tools/lib/axm-id.mjs')
 for path,meta in src.files.items():
  if sha((repo/path).read_bytes())!=meta['sha256']:raise ValueError('Source changed during build: '+path)
  committed=subprocess.run(['git','-C',str(repo),'show',revision+':'+path],capture_output=True)
  if committed.returncode or sha(committed.stdout)!=meta['sha256']:raise ValueError('Source differs from the pinned Git revision: '+path)
 data={'schema':SCHEMA,'edition':sha(canonical(records)),'compiled_at':datetime.now(timezone.utc).isoformat(),'source_revision':revision,'source_snapshots':sorted(src.files.values(),key=lambda x:x['path']),'boundary':BOUNDARY,'identity_owner':{'path':'tools/lib/axm-id.mjs','sha256':sha(identity_bytes)},'review_state':'requires_independent_review','publication_state':'local_review_only','records':records,'excluded':exclusions,'consumer':{'name':'Integrity.ai','interchange':'Review inbox; not a validated production registry','scoring_performed':False,'endpoint_ingestion_tested':False,'human_review_granted':False}}
 output.mkdir(parents=True)
 for name,body in fragments.items():
  p=output/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(body)
 (output/'data.json').write_bytes(canonical(data)+b'\n');exports=output/'exports';exports.mkdir()
 with (exports/'review-inbox.jsonl').open('wb') as f:
  for r in records:f.write(canonical({'id':r['id'],'entity_ref':r['axm']['entity_id'],'summary':r['payload'].get('plain') or r['predicate']+': '+r['label'],'sources':[p['url'] for p in r['receipts']],'source_record':r['source'],'date':r['source_as_of'],'native_evidence_class':r['evidence_class'],'native_status':r['native_status'],'identity_state':r['identity_state'],'review_state':r['review_state'],'dimension':None,'polarity':None,'weight':None,'registry_status':None,'amounts':r['amounts'],'limits':r['limits'],'graph_effect':'none'})+b'\n')
 with (exports/'records.csv').open('w',newline='',encoding='utf-8') as f:
  w=csv.writer(f);w.writerow(['record_id','collection','label','predicate','source_as_of','evidence_class','native_status','identity_state','currency','ceiling','obligated','outlay','announced_round','source_record_url','review_state','limits'])
  for r in records:
   cells=[r['id'],r['collection'],r['label'],r['predicate'],r['source_as_of'],r['evidence_class'],r['native_status'],r['identity_state']]+[r['amounts'].get(k) for k in ('currency','ceiling','obligated','outlay','announced_round')]+[r['source']['url'],r['review_state'],r['limits']]
   w.writerow([("'"+str(x)) if str(x or '').startswith(('=','+','-','@','\t','\r')) else x for x in cells])
 embedded=canonical(data).decode().replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
 export_bytes={name:base64.b64encode((exports/file).read_bytes()).decode('ascii') for name,file in [('inbox','review-inbox.jsonl'),('csv','records.csv')]}
 (output/'index.html').write_text((HERE/'desk.html').read_text().replace('/*EVIDENCE_DATA*/',embedded).replace('/*EXPORT_B64*/',json.dumps(export_bytes)),encoding='utf-8')
 runtime=output/'runtime';runtime.mkdir();(runtime/'workbench.py').write_bytes(Path(__file__).read_bytes())
 (output/'OPEN EVIDENCE DESK.cmd').write_text('@echo off\r\nstart "" "%~dp0index.html"\r\n')
 (output/'VERIFY.cmd').write_text('@echo off\r\ncd /d "%~dp0"\r\npython runtime\\workbench.py verify --bundle .\r\npause\r\n')
 (output/'README.txt').write_text('CLIFFORD NUMBER | EVIDENCE DESK\n\nOpen index.html directly. No account, network, model or API key required.\n\nVerify: python runtime/workbench.py verify --bundle .\nQuery: python runtime/workbench.py query --bundle . --query Firestorm\n\n'+BOUNDARY+'\n\nRetained snapshots, not refreshed web data. Checksums check bytes, not publisher identity, source truth or independent review. Intake has not been promoted for public publication.\n')
 write_manifest(output);verify(output)
 return {'output':str(output),'records':len(records),'collections':{c:sum(r['collection']==c for r in records) for c in sorted({r['collection'] for r in records})},'excluded':len(exclusions),'edition':data['edition']}
def write_manifest(root):
 root=Path(root).resolve();files={}
 for p in sorted(root.rglob('*')):
  if p.is_file() and p.name!='MANIFEST.json':files[str(p.relative_to(root))]={'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size}
 (root/'MANIFEST.json').write_bytes(canonical({'schema':'clifford/portable-files@1','integrity_only':True,'publisher_signature':None,'files':files,'boundary':'Byte inventory, not a signature, license grant or approval of source assertions.'})+b'\n')
def verify(root):
 root=Path(root).resolve();manifest=read_json(root/'MANIFEST.json')
 if manifest.get('schema')!='clifford/portable-files@1' or not manifest.get('files'):raise ValueError('Unsupported or empty manifest')
 if not {'data.json','index.html','exports/review-inbox.jsonl','exports/records.csv'}.issubset(manifest['files']):raise ValueError('Required file inventory is incomplete')
 if len(manifest['files'])>4096:raise ValueError('Too many package members')
 total=0
 for name,spec in manifest['files'].items():
  if type(spec.get('bytes')) is not int or not 0<=spec['bytes']<=LIMIT or not re.fullmatch('[0-9a-f]{64}',str(spec.get('sha256',''))):raise ValueError('Invalid bounded member metadata')
  total+=spec['bytes']
  if total>64*1024*1024:raise ValueError('Package byte budget exceeded')
  p=local_path(root,name)
  if not p.is_file() or p.stat().st_size!=spec['bytes'] or sha(p.read_bytes())!=spec['sha256']:raise ValueError('Package bytes failed: '+name)
 data=read_json(root/'data.json')
 if data.get('schema')!=SCHEMA or data.get('publication_state')!='local_review_only':raise ValueError('Unsupported package or publication status')
 if data.get('review_state')!='requires_independent_review':raise ValueError('Compiler cannot grant independent review')
 if sha(canonical(data['records']))!=data['edition']:raise ValueError('Edition digest mismatch')
 seen=set()
 for r in data['records']:
  if r['id'] in seen:raise ValueError('Duplicate record id')
  seen.add(r['id'])
  if r.get('graph_effect')!='none' or r.get('review_state')!='requires_independent_review':raise ValueError('Unpermitted promotion')
  if not r.get('limits') or not r.get('source') or not r.get('fragment'):raise ValueError('Missing boundary')
  if not public_url(r['source']['url']):raise ValueError('Invalid source locator')
  for receipt in r['receipts']:
   if not public_url(receipt['url']):raise ValueError('Invalid receipt URL')
  if r['fragment']['path'] not in manifest['files']:raise ValueError('Excerpt missing from file inventory')
  fragment=local_path(root,r['fragment']['path']).read_bytes()
  if sha(fragment)!=r['fragment']['sha256'] or loads(fragment)!=r['payload']:raise ValueError('Fragment mismatch')
  for k,v in r['amounts'].items():
   if k=='currency' or v is None:continue
   if not isinstance(v,str) or not Decimal(v).is_finite():raise ValueError('Invalid decimal amount')
  if not re.fullmatch('e1_[a-z2-7]{52}',r['axm']['entity_id']) or not re.fullmatch('c1_[a-z2-7]{52}',r['axm']['claim_id']):raise ValueError('Invalid AXM shape')
 return {'status':'pass','records':len(seen),'edition':data['edition'],'files':len(manifest['files']),'human_review_granted':False,'publisher_authenticated':False,'source_truth_verified':False}
def query(root,text,limit=12):
 verify(root)
 if not isinstance(text,str) or not 1<=len(text.strip())<=160:raise ValueError('Query must contain 1 to 160 characters')
 if type(limit)is not int or not 1<=limit<=20:raise ValueError('Limit must be 1 to 20')
 data=read_json(Path(root)/'data.json');terms=text.casefold().split()
 found=[r for r in data['records'] if all(t in canonical(r).decode().casefold() for t in terms)]
 return {'query':text,'matched':len(found),'returned':min(len(found),limit),'records':found[:limit],'edition':data['edition'],'boundary':BOUNDARY,'retrieval_only':True,'current_status_assessed':False}
def aperture(root,expected,budget=24):
 sys.stdout.reconfigure(encoding='utf-8');sys.stderr.reconfigure(encoding='utf-8')
 root=Path(root).resolve();verify(root)
 if sha((root/'data.json').read_bytes())!=expected:raise ValueError('Pinned package hash differs')
 used=0
 while True:
  line=sys.stdin.buffer.readline(4097)
  if not line:break
  request_id=None
  used+=1
  if len(line)>4096 or used>budget:
   print(json.dumps({'request_id':None,'ok':False,'error':'Request byte or call budget exhausted'}),flush=True);break
  try:
   msg=loads(line);request_id=msg.get('request_id');op=msg.get('operation')
   if not isinstance(request_id,str) or len(request_id)>80:raise ValueError('Invalid request identity')
   if set(msg)-{'request_id','operation','query','limit'}:raise ValueError('Unsupported request fields')
   if sha((root/'data.json').read_bytes())!=expected:raise ValueError('Pinned evidence changed')
   if op=='RELEASE':print(json.dumps({'request_id':request_id,'ok':True,'released':True}),flush=True);break
   if op=='DESCRIBE':response={'machine_id':'clifford-evidence-aperture','operations':['DESCRIBE','QUERY','RELEASE'],'authority':'read_only','package_sha256':expected,'boundary':BOUNDARY}
   elif op=='QUERY':response=query(root,msg.get('query'),msg.get('limit',12))
   else:raise ValueError('Only read-only DESCRIBE, QUERY and RELEASE are admitted')
   print(json.dumps({'request_id':request_id,'ok':True,**response},ensure_ascii=False),flush=True)
  except Exception as exc:print(json.dumps({'request_id':request_id,'ok':False,'error':str(exc)}),flush=True)
def main():
 sys.stdout.reconfigure(encoding='utf-8');sys.stderr.reconfigure(encoding='utf-8')
 p=argparse.ArgumentParser(description=__doc__);s=p.add_subparsers(dest='command',required=True)
 b=s.add_parser('build');b.add_argument('--repo',type=Path,default=HERE.parent);b.add_argument('--out',type=Path,required=True);b.add_argument('--source-ref')
 v=s.add_parser('verify');v.add_argument('--bundle',type=Path,required=True)
 q=s.add_parser('query');q.add_argument('--bundle',type=Path,required=True);q.add_argument('--query',required=True);q.add_argument('--limit',type=int,default=12)
 a=s.add_parser('aperture');a.add_argument('--bundle',type=Path,required=True);a.add_argument('--sha256',required=True);a.add_argument('--budget',type=int,default=24)
 args=p.parse_args()
 try:
  if args.command=='build':result=build(args.repo,args.out,args.source_ref)
  elif args.command=='verify':result=verify(args.bundle)
  elif args.command=='query':result=query(args.bundle,args.query,args.limit)
  else:
   if not 1<=args.budget<=64:raise ValueError('Budget must be 1 to 64')
   aperture(args.bundle,args.sha256,args.budget);return 0
  print(json.dumps(result,ensure_ascii=False,indent=2));return 0
 except (OSError,ValueError,KeyError,TypeError,subprocess.SubprocessError) as exc:print(json.dumps({'status':'failed','error':str(exc)}),file=sys.stderr);return 1
if __name__=='__main__':raise SystemExit(main())
