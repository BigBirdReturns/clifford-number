#!/usr/bin/env python3
"""Historical source adapters using the existing ecology queue and custody."""
from __future__ import annotations
import datetime as dt,hashlib,json,re,time,urllib.parse,urllib.request
from pathlib import Path
import xml.etree.ElementTree as ET
import ecology_backlog as base
KINDS={'fpds_archive_manifest','fpds_archive_shard','statute_catalog','statute_volume_catalog','statute_volume','govinfo_sitemap','govinfo_report_metadata','govinfo_report_text','nsf_awards'}
MAX_BULK_BYTES=256*1024*1024
NS='{http://schemas.gpo.gov/xml/uslm}'
def ensure(c):
 c.executescript('''CREATE TABLE IF NOT EXISTS bulk_assets(id TEXT PRIMARY KEY,task_id TEXT,path TEXT,sha256 TEXT,bytes INTEGER,source_url TEXT,source_class TEXT,native_rows INTEGER,period_start TEXT,period_end TEXT,schema_json TEXT,quality_json TEXT,observed_at TEXT);
 CREATE TABLE IF NOT EXISTS record_references(id TEXT PRIMARY KEY,source_document TEXT,target_namespace TEXT,target_id TEXT,source_locator TEXT,source_hash TEXT,relation TEXT,review TEXT);
 CREATE INDEX IF NOT EXISTS reference_target ON record_references(target_namespace,target_id);
 CREATE TABLE IF NOT EXISTS acquisition_routes(id TEXT PRIMARY KEY,task_id TEXT,estate_id TEXT,parent_task TEXT,source_hash TEXT,reason TEXT);''')
def ref(c,doc,namespace,target,url,h,relation='explicit_source_citation'):
 key=base.sha((doc+'|'+namespace+'|'+target+'|'+relation).encode())
 c.execute('INSERT OR IGNORE INTO record_references VALUES(?,?,?,?,?,?,?,?)',(key,doc,namespace,target,url,h,relation,'source_reference_only_no_causal_inference'))
def bulk(state,tid,url,size,md5=None):
 reqtext=base.j({'url':url,'transfer':'bounded_bulk_v1','expected_bytes':size,'expected_md5':md5});key=base.sha((tid+'\n'+reqtext).encode());c=base.connect(state);prior=c.execute('SELECT * FROM captures WHERE id=?',(key,)).fetchone();c.close()
 if prior:
  if prior['error']or prior['status']!=200:raise ValueError('Retained bulk failure requires explicit retry disposition')
  p=Path(state)/prior['path']
  if not p.is_file()or p.stat().st_size!=prior['bytes']:raise ValueError('Retained bulk custody differs')
  return dict(prior),p
 if not isinstance(size,int)or not 0<size<=MAX_BULK_BYTES:raise ValueError('Bulk size outside admitted bound')
 base.safe_url(url);folder=Path(state)/'bulk';folder.mkdir(exist_ok=True);temp=folder/(key+'.partial')
 if temp.exists():raise ValueError('Interrupted transfer requires disposition before replay')
 sh=hashlib.sha256();md=hashlib.md5();n=0;first=b'';final=url;status=0;deadline=time.monotonic()+180
 try:
  request=urllib.request.Request(url,headers={'User-Agent':base.UA})
  with urllib.request.build_opener(base.SafeRedirect()).open(request,timeout=30)as response,temp.open('xb')as out:
   final=response.geturl();status=response.status
   while True:
    b=response.read(1024*1024)
    if not b:break
    if not first:first=b[:5000]
    n+=len(b)
    if n>size or time.monotonic()>deadline:raise ValueError('Bulk transfer exceeds declared size or time')
    out.write(b);sh.update(b);md.update(b)
  if n!=size:raise ValueError('Declared source length mismatch')
  if md5 and md.hexdigest()!=md5:raise ValueError('Declared source MD5 mismatch')
  if base.is_access_challenge(final,first)or b'Just a moment...'in first:raise ValueError('Access challenge is not source content')
  target=folder/(sh.hexdigest()+'.body')
  if target.exists():temp.unlink()
  else:temp.replace(target)
  cap=dict(id=key,task_id=tid,url=final,request=reqtext,status=status,path=str(target.relative_to(state)),sha256=sh.hexdigest(),bytes=n,at=base.utc(),error=None)
 except Exception as exc:
  cap=dict(id=key,task_id=tid,url=final,request=reqtext,status=status,path=str(temp.relative_to(state))if temp.exists()else None,sha256=sh.hexdigest()if n else None,bytes=n,at=base.utc(),error=str(exc)[:500]);c=base.connect(state)
  with c:c.execute('INSERT OR IGNORE INTO captures VALUES(:id,:task_id,:url,:request,:status,:path,:sha256,:bytes,:at,:error)',cap)
  c.close();raise
 c=base.connect(state)
 with c:c.execute('INSERT OR IGNORE INTO captures VALUES(:id,:task_id,:url,:request,:status,:path,:sha256,:bytes,:at,:error)',cap)
 c.close();return cap,target

def parquet_summary(path,period):
 import duckdb
 c=duckdb.connect();c.execute('SET threads=2');c.execute("SET memory_limit='768MB'")
 try:
  cols=[x[0]for x in c.execute('DESCRIBE SELECT * FROM read_parquet(?)',[str(path)]).fetchall()];field='content.relevantContractDates.signedDate'
  if field not in cols:raise ValueError('Source lacks signedDate')
  q='SELECT count(*),min(try_cast("'+field+'" AS TIMESTAMP)),max(try_cast("'+field+'" AS TIMESTAMP)),count(*) FILTER(WHERE try_cast("'+field+'" AS TIMESTAMP) IS NULL),count(*) FILTER(WHERE strftime(try_cast("'+field+'" AS TIMESTAMP),\'%Y%m\')<>?) FROM read_parquet(?)'
  r=c.execute(q,[period,str(path)]).fetchone()
  return {'rows':r[0],'signed_min':str(r[1])if r[1]else None,'signed_max':str(r[2])if r[2]else None,'undated_rows':r[3],'outside_filename_month':r[4],'columns':cols,'interpretation':'Author-transformed FPDS rows; historical population completeness unproven. UEI and parent fields may reflect later source updates. Action obligations differ from cumulative totals; no sum or historical legal-identity inference is made.'}
 finally:c.close()
def parse_statutes(path,volume):
 root=ET.parse(path).getroot()
 if root.tag!=NS+'statutesAtLarge':raise ValueError('Unexpected statutory root')
 meta=root.find(NS+'meta')
 if meta is None or meta.findtext(NS+'volume')!=str(volume):raise ValueError('Statutory volume identity mismatch')
 items=[];claimed_counts={}
 for ordinal,node in enumerate(root.iter(NS+'pLaw')):
  m=node.find(NS+'meta')
  if m is None:continue
  vals={x.tag.split('}')[-1]:' '.join(' '.join(x.itertext()).split())for x in m}
  if vals.get('publicPrivate')!='public':continue
  claimed=str(vals.get('congress',''))+'-'+str(vals.get('docNumber',''))
  if not re.fullmatch(r'\d{1,3}-\d+',claimed):raise ValueError('Missing source law number')
  citation=vals.get('citableAs')or None
  citation_state='source_citation_reported' if citation else 'source_citation_missing'
  # GPO's historical XML has authentic enacted laws with empty citableAs.
  # Retain their original full text, source metadata and physical volume/ordinal.
  # An absent page citation never becomes an invented page number or a legal join.
  date=vals.get('approvedDate')
  if date:dt.date.fromisoformat(date)
  # Source metadata contains conflicting law IDs in real volume105. Preserve physical
  # instrument custody and hold ambiguous legal identities, rather than dropping a law.
  ident=('STATUTE-'+str(volume)+':'+re.sub(r'[^A-Za-z0-9]+','-',citation).strip('-')+':'+str(ordinal)) if citation else ('STATUTE-'+str(volume)+':MISSING-SOURCE-CITATION:'+claimed+':'+str(ordinal))
  items.append({'native_id':ident,'public_law_id':claimed,'title':vals.get('title')or 'Public Law '+claimed,'record_date':date,'citation':citation,'citation_state':citation_state,'source_element':'pLaw','source_ordinal':ordinal,'body':' '.join(' '.join(node.itertext()).split()),'meta':vals})
  claimed_counts[claimed]=claimed_counts.get(claimed,0)+1
 for item in items:
  item['identity_state']='source_identifier_collision' if claimed_counts[item['public_law_id']]>1 else 'source_citation_missing' if item['citation_state']=='source_citation_missing' else 'source_identifier_unique_within_volume'
  yield item

def finish(c,t,status,added=0,rows=0,expected=None,error=None):
 c.execute('UPDATE tasks SET status=?,cursor=cursor+1,pages=pages+1,rows_seen=rows_seen+?,expected=?,error=?,updated=? WHERE id=?',(status,rows,expected,error,base.utc(),t['id']))
 return dict(id=t['id'],lane=t['lane'],kind=t['kind'],status=status,added=added,source_rows=rows,expected=expected)
def doc(c,t,cap,native,kind,title,body,date,payload):
 return base.upsert_document(c,ident=base.sha((kind+'|'+native+'|'+cap['sha256']).encode()),origin='acquired',locator=cap['url'],source_hash=cap['sha256'],position=native,kind=kind,estates=json.loads(t['estates']),title=title,body=body,record_date=date,review='source_record_unreviewed',payload=payload)

def nsf_page_decision(spec,task,metadata,rows):
 expected=metadata.get('totalCount')
 if type(expected)is not int or expected<0:raise ValueError('NSF source lacks a valid totalCount')
 if metadata.get('offset')!=task['cursor'] or metadata.get('rpp')!=25:raise ValueError('NSF page identity differs from requested offset/rpp')
 # Provider documentation caps per-query results at 3,000. A larger declared
 # count is a split signal, never an invitation to call truncated history complete.
 if expected>=3000 or task['rows_seen']+len(rows)>=3000:
  first=dt.date.fromisoformat(spec['start']);last=dt.date.fromisoformat(spec['end'])
  if first==last:return {'state':'bulk_adapter_required','expected':expected,'children':[],'reason':'Single-day NSF result population reaches documented query cap'}
  middle=first+dt.timedelta(days=(last-first).days//2)
  return {'state':'split_for_source_cap','expected':expected,'children':[(first.isoformat(),middle.isoformat()),((middle+dt.timedelta(days=1)).isoformat(),last.isoformat())],'reason':'NSF source result cap; child date windows retain missing population'}
 observed=task['rows_seen']+len(rows)
 if not rows and observed<expected:raise ValueError('NSF empty page before declared population exhausted')
 if observed>expected:raise ValueError('NSF observed rows exceed declared population')
 if len(rows)<25 and observed<expected:raise ValueError('NSF short page before declared population exhausted')
 return {'state':'partial' if observed<expected else 'query_exhausted','expected':expected,'children':[],'reason':None}

def handle(state,t,c):
 ensure(c);s=json.loads(t['spec']);k=t['kind'];est=json.loads(t['estates']);cutoff=json.loads(c.execute("SELECT value FROM metadata WHERE key='cutoff'").fetchone()[0]);added=0
 if k=='fpds_archive_shard':
  cap,p=bulk(state,t['id'],s['url'],s['bytes'],s['md5']);q=parquet_summary(p,s['period']);native='figshare:28057043:'+str(s['file_id']);small={a:b for a,b in q.items()if a!='columns'}
  with c:
   c.execute('INSERT OR IGNORE INTO bulk_assets VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',(native,t['id'],str(p.relative_to(state)),cap['sha256'],cap['bytes'],s['url'],'researcher_transformed_FPDS_CC0',q['rows'],s['record_date'],q['signed_max'],base.j(q['columns']),base.j(small),base.utc()))
   added=doc(c,t,cap,native,'historical_procurement_asset','FPDS source shard '+s['period'],base.j(small),s['record_date'],{'native_id':native,'source_class':'researcher_transformed_FPDS','row_count':q['rows'],'bulk_path':str(p.relative_to(state)),'source_metadata_sha256':s['manifest_sha256'],'license':'CC0','amount_scope':'action_obligation_vs_cumulative_contract_totals_unaggregated'})
   return finish(c,t,'bulk_captured_queryable',added,q['rows'],q['rows'])
 if k=='statute_volume':
  cap,p=bulk(state,t['id'],s['url'],s['bytes']);rows=list(parse_statutes(p,s['volume']))
  if not rows:raise ValueError('No public laws parsed from actual statutory source')
  with c:
   for x in rows:
    payload={a:b for a,b in x.items()if a!='body'};payload.update(source_volume=s['volume'],body_state='official_full_public_law_text_not_legal_interpretation')
    added+=doc(c,t,cap,x['native_id'],'statutory_instrument',x['title'],x['body'],x['record_date'],payload);did=base.sha(('statutory_instrument|'+x['native_id']+'|'+cap['sha256']).encode())
    ref(c,did,'us_public_law' if x['identity_state']=='source_identifier_unique_within_volume' else 'ambiguous_source_public_law',x['public_law_id'],cap['url'],cap['sha256'],'source_native_identity' if x['identity_state']=='source_identifier_unique_within_volume' else 'source_citation_missing' if x['identity_state']=='source_citation_missing' else 'source_asserted_identifier_collision')
    for m in re.finditer(r'(?:Public Law|Pub\.?\s*L\.?)\s+(\d{1,3})[–−-](\d+)',x['body']):
     target=m[1]+'-'+m[2]
     if target!=x['public_law_id']:ref(c,did,'us_public_law',target,cap['url'],cap['sha256'])
   return finish(c,t,'public_law_text_captured',added,len(rows),len(rows))
 url=s['url']
 if k=='nsf_awards':
  first=dt.date.fromisoformat(s['start']);last=dt.date.fromisoformat(s['end']);args={'dateStart':first.strftime('%m/%d/%Y'),'dateEnd':last.strftime('%m/%d/%Y'),'offset':str(t['cursor']),'rpp':'25'}
  url='https://api.nsf.gov/services/v1/awards.json?'+urllib.parse.urlencode(args)
 cap,raw=base.request_source(state,t['id'],url)
 if cap['status']!=200 or cap['error']:
  with c:return finish(c,t,'source_blocked',error=cap['error']or 'HTTP '+str(cap['status']))
 if k=='fpds_archive_manifest':
  d=json.loads(raw)
  if d.get('license',{}).get('name')!='CC0' or 'Federal Procurement'not in d.get('title',''):raise ValueError('Historical source identity/license differs')
  files=[f for f in d['files']if re.fullmatch(r'\d{6}\.parquet',f['name'])and s['first_month']<=f['name'][:6]<=s['last_month']]
  if not files:raise ValueError('Empty source file population')
  with c:
   for f in sorted(files,key=lambda f:f['name']):
    if urllib.parse.urlsplit(f['download_url']).hostname!='ndownloader.figshare.com':raise ValueError('Unexpected file host')
    month=f['name'][:6];base.add_task(c,'awards','fpds_archive_shard',{'url':f['download_url'],'file_id':f['id'],'period':month,'record_date':month[:4]+'-'+month[4:]+'-01','bytes':f['size'],'md5':f['computed_md5'],'manifest_sha256':cap['sha256'],'dataset_doi':d.get('doi')},est,'hf-')
   added=doc(c,t,cap,'figshare:28057043:v1','historical_procurement_catalog',d['title'],base.j({'months':len(files),'bytes':sum(f['size']for f in files),'license':d['license']}),None,{'source_class':'author_dataset_metadata','doi':d.get('doi'),'selected_months':len(files),'definition':'Declared file population, not all government contracts.'})
   return finish(c,t,'manifest_captured_children_queued',added,len(files),len(files))
 if k in ('statute_catalog','statute_volume_catalog'):
  d=json.loads(raw);files=d.get('files')
  if not isinstance(files,list):raise ValueError('Unexpected bulk catalog')
  selected=[]
  with c:
   for f in files:
    if k=='statute_catalog':
     name=str(f.get('name')or f.get('displayLabel')or '').strip('/')
     if not name.isdigit()or not 105<=int(name)<=int(cutoff[:4])-1886:continue
     v=int(name);u='https://www.govinfo.gov/bulkdata/json/STATUTE/'+name
     base.add_task(c,'policy','statute_volume_catalog',{'url':u,'volume':v,'record_date':str(v+1886)+'-01-01','year_mapping':'routing_estimate_not_source_date'},est,'sv-');selected.append(name)
    elif f.get('name')=='STATUTE-'+str(s['volume'])+'.xml':
     u=f.get('link');expected='https://www.govinfo.gov/bulkdata/STATUTE/'+str(s['volume'])+'/STATUTE-'+str(s['volume'])+'.xml'
     if u!=expected:raise ValueError('Statute source locator differs')
     base.add_task(c,'policy','statute_volume',{'url':u,'volume':s['volume'],'bytes':f['size'],'record_date':s['record_date'],'catalog_sha256':cap['sha256']},est,'st-');selected.append(u)
   added=doc(c,t,cap,url,'statutory_catalog','Statutory archive catalog '+str(s.get('volume','all')),base.j({'selected':selected,'scope':'source catalog; actual dates in laws'}),None,{'native_id':url,'selected_count':len(selected)})
   return finish(c,t,'catalog_captured_children_queued',added,len(selected),len(selected))
 if k=='govinfo_sitemap':
  root=ET.fromstring(raw);ns='{http://www.sitemaps.org/schemas/sitemap/0.9}';index=root.tag==ns+'sitemapindex'
  if root.tag not in (ns+'sitemapindex',ns+'urlset'):raise ValueError('Unexpected sitemap root')
  selected=[]
  with c:
   for elem in root.iter(ns+'loc'):
    u=elem.text or ''
    if index:
     m=re.fullmatch(r'https://www\.govinfo\.gov/sitemap/GAOREPORTS_(\d{4})_sitemap\.xml',u)
     if not m or not 1991<=int(m[1])<=int(cutoff[:4]):continue
     base.add_task(c,'sources','govinfo_sitemap',{'url':u,'record_date':m[1]+'-01-01','collection':'GAOREPORTS'},est,'gs-');selected.append(u)
    else:
     m=re.fullmatch(r'https://www\.govinfo\.gov/app/details/(GAOREPORTS-[A-Za-z0-9_.-]+)',u)
     if not m:continue
     native=m[1];meta='https://www.govinfo.gov/metadata/pkg/'+native+'/mods.xml';base.add_task(c,'sources','govinfo_report_metadata',{'url':meta,'native_id':native,'record_date':s.get('record_date'),'parent_sha256':cap['sha256']},est,'gm-');selected.append(native)
   added=doc(c,t,cap,url,'govinfo_source_inventory','GAO archival inventory '+str(s.get('record_date','')),base.j({'entries':selected,'scope':'GPO archival holdings; sitemap timestamps are not publication dates'}),None,{'native_id':url,'entries':len(selected),'source_state':'archive_not_complete_GAO_history'})
   return finish(c,t,'inventory_captured_children_queued',added,len(selected),len(selected))
 if k=='govinfo_report_metadata':
  root=ET.fromstring(raw);ns='{http://www.loc.gov/mods/v3}'
  if root.tag!=ns+'mods':raise ValueError('Unexpected MODS root')
  native=root.findtext('.//'+ns+'recordIdentifier');title=root.findtext('.//'+ns+'title');date=root.findtext('.//'+ns+'dateIssued')
  if native!=s['native_id']:raise ValueError('Package identity mismatch '+str(native))
  urls=[x.text for x in root.iter(ns+'url')if x.text and ('text'in x.get('displayLabel','').lower()or x.text.endswith('.htm'))]
  with c:
   added=doc(c,t,cap,native,'govinfo_report_metadata',title or native,base.j({'title':title,'date':date,'text_urls':urls}),date,{'native_id':native,'title':title,'record_date':date,'text_urls':urls})
   for u in urls:
    if u.startswith('https://www.govinfo.gov/content/pkg/'+native+'/html/'):base.add_task(c,'sources','govinfo_report_text',{'url':u,'native_id':native,'title':title,'record_date':date,'metadata_sha256':cap['sha256']},est,'gt-')
   return finish(c,t,'metadata_captured_text_pending',added,1,1)
 if k=='govinfo_report_text':
  parser=base.Text();parser.feed(raw.decode('utf-8',errors='replace'));text=parser.result()
  if len(text)<100 or any(x in text[:1500].lower()for x in ['access denied','verify you are human','request access']):raise ValueError('Unavailable report or access page')
  with c:
   added=doc(c,t,cap,s['native_id'],'govinfo_report_text',s.get('title')or s['native_id'],text,s.get('record_date'),{'native_id':s['native_id'],'metadata_sha256':s['metadata_sha256'],'body_state':'official_text_unreviewed'})
   return finish(c,t,'body_captured',added,1,1)
 if k=='nsf_awards':
  d=json.loads(raw).get('response',{});rows=d.get('award');meta=d.get('metadata',{})
  if not isinstance(rows,list)or len(rows)>25:raise ValueError('Unexpected NSF award page')
  decision=nsf_page_decision(s,t,meta,rows)
  if t['pages']and c.execute('SELECT 1 FROM captures WHERE task_id=? AND sha256=? AND id<>?',(t['id'],cap['sha256'],cap['id'])).fetchone():raise ValueError('Repeated NSF page')
  with c:
   for x in rows:
    native=x.get('id');date=dt.datetime.strptime(x['date'],'%m/%d/%Y').date().isoformat()
    if not native or not s['start']<=date<=s['end']:raise ValueError('NSF identity/date outside selection')
    safe={a:x.get(a)for a in ['id','title','date','startDate','expDate','awardeeName','awardee','awardeeStateCode','awardeeCountryCode','ueiNumber','parentUeiNumber','fundsObligatedAmt','estimatedTotalAmt','fundProgramName','abstractText','transType']}
    added+=doc(c,t,cap,str(native),'nsf_award',x.get('title')or native,base.j(safe),date,{'native_id':native,'source_record':safe,'amount_meaning':'source_obligation_not_payment','source_metadata':meta})
   for start,end in decision['children']:
    child={**s,'start':start,'end':end,'record_date':start}
    base.add_task(c,t['lane'],k,child,est,'ns-')
   offset=t['cursor']+len(rows);status=decision['state']
   c.execute('UPDATE tasks SET status=?,cursor=?,pages=pages+1,rows_seen=rows_seen+?,expected=?,error=?,updated=? WHERE id=?',(status,offset,len(rows),decision['expected'],decision['reason'],base.utc(),t['id']))
   return dict(id=t['id'],lane=t['lane'],kind=k,status=status,added=added,source_rows=len(rows),next_offset=offset,source_expected=decision['expected'],split_windows=decision['children'])
 raise ValueError('Unknown historical source adapter')
