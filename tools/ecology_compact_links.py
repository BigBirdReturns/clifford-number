#!/usr/bin/env python3
"""Compact inverted source-reference and conference metadata cache on W03 NVMe.

All originals stay in Clifford's acquired public-source SQLite and accepted conference edition.
A cache pointer is not a reviewed link, person identity, event attendance, or money flow.
"""
from __future__ import annotations
import argparse, datetime as dt, hashlib, json, os, pathlib, re, sqlite3, statistics, time
PROJECT_HOME=pathlib.Path(os.environ.get('CLIFFORD_PROJECT_HOME','/mnt/w03data/Incoming/DataArray/Projects/Products/Clifford-Number'))
ROOT=pathlib.Path(os.environ.get('CLIFFORD_CROSSLINK_STATE',PROJECT_HOME/'sessions/performance-crosslinks-20261103'))
ORIGIN=pathlib.Path(os.environ.get('CLIFFORD_ECOLOGY_DB',PROJECT_HOME/'sessions/integrity-acquisition-20261102/ecology/ecology.sqlite'))
EVENTS=pathlib.Path(os.environ.get('CLIFFORD_CONFERENCE_DB',PROJECT_HOME/'sessions/conference-circuit-20261103/reports/conference-circuit-v8.sqlite'))
NVME=pathlib.Path(os.environ.get('CLIFFORD_HOT_INDEX_DIR','/srv/w03/nvme-work/jobs/clifford-performance-20261103'))
HOT=NVME/'compact-crosslinks-v2.sqlite'
OUT=ROOT/'reports'
sha=lambda b:hashlib.sha256(b).hexdigest()
now=lambda:dt.datetime.now(dt.timezone.utc).isoformat()
j=lambda o:json.dumps(o,ensure_ascii=False,separators=(',',':'),sort_keys=True)
SCHEMA=[
"CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY,value TEXT NOT NULL)",
"""CREATE TABLE IF NOT EXISTS refs (
kind TEXT NOT NULL,
source_rowid INTEGER NOT NULL,
original_id TEXT NOT NULL,
source_document TEXT NOT NULL,
namespace TEXT NOT NULL,
target_id TEXT NOT NULL,
PRIMARY KEY(kind,source_rowid)) WITHOUT ROWID""",
"CREATE INDEX IF NOT EXISTS refs_target ON refs(namespace,target_id,kind,source_document)",
"CREATE INDEX IF NOT EXISTS refs_reverse ON refs(source_document,kind,target_id)",
"""CREATE TABLE IF NOT EXISTS event_index (
record_id TEXT PRIMARY KEY,
kind TEXT NOT NULL,
title TEXT NOT NULL,
date_hint TEXT,
place_label TEXT,
place_granularity TEXT,
room_label TEXT,
source_sha256 TEXT,
source_url TEXT,
source_review TEXT NOT NULL,
payload_sha256 TEXT NOT NULL)""",
"CREATE INDEX IF NOT EXISTS event_day_place ON event_index(date_hint,place_label,kind)",
"CREATE INDEX IF NOT EXISTS event_source_hash ON event_index(source_sha256,kind)",
"""CREATE TABLE IF NOT EXISTS written_roles (
source_record_id TEXT NOT NULL,
source_label TEXT NOT NULL,
source_role TEXT,
source_affiliation TEXT,
source_locator TEXT,
record_basis TEXT NOT NULL,
PRIMARY KEY(source_record_id,source_label,source_role,source_affiliation)) WITHOUT ROWID""",
"CREATE INDEX IF NOT EXISTS written_name ON written_roles(source_label,source_record_id)"
]
def connect():
 NVME.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
 c=sqlite3.connect(str(HOT),timeout=90,uri=True);c.row_factory=sqlite3.Row
 c.execute('PRAGMA journal_mode=WAL');c.execute('PRAGMA synchronous=NORMAL')
 c.execute('PRAGMA cache_size=-131072');c.execute('PRAGMA mmap_size=536870912')
 c.execute('PRAGMA wal_autocheckpoint=10000')
 for q in SCHEMA:c.execute(q)
 with c:
  existing=c.execute("SELECT value FROM meta WHERE key='original_source'").fetchone()
  if existing and json.loads(existing[0])!=str(ORIGIN):raise RuntimeError('Changed source origin')
  c.execute('INSERT OR IGNORE INTO meta VALUES(?,?)',('original_source',j(str(ORIGIN))))
  c.execute('INSERT OR IGNORE INTO meta VALUES(?,?)',('schema',j('clifford/compact-source-links@2')))
 return c
def water(c,k):
 x=c.execute('SELECT value FROM meta WHERE key=?',('watermark:'+k,)).fetchone()
 return int(json.loads(x[0]))if x else 0
def mark(c,k,n):
 c.execute('INSERT OR REPLACE INTO meta VALUES(?,?)',('watermark:'+k,j(n)))
def attach(c):
 uri='file:'+str(ORIGIN)+'?mode=ro'
 c.execute('ATTACH DATABASE ? AS original',(uri,))
 # Source is attached read-only. The production SQLite store is never mutated here.
 # The attached source URI already enforces mode=ro; connection-wide query_only would also block our derived cache.
 return c
def fill(c,kind,table,fields,limit,batch,deadline):
 start=water(c,kind)
 highest=c.execute('SELECT coalesce(max(rowid),0) FROM original.'+table).fetchone()[0]
 cursor=start;total=0;began=time.perf_counter()
 if cursor>highest:raise RuntimeError('Source watermark regressed; original was reorganized')
 while cursor<highest and total<limit and time.monotonic()<deadline:
  stop=min(cursor+batch,highest)
  # Native C/SQLite insertion eliminates Python JSON materialization and repeated full scans.
  with c:
   if kind=='reference':
    cur=c.execute("""INSERT OR IGNORE INTO refs(kind,source_rowid,original_id,source_document,namespace,target_id)
      SELECT 'reference',rowid,id,source_document,target_namespace,target_id
      FROM original.record_references WHERE rowid>? AND rowid<=?
      AND id IS NOT NULL AND source_document IS NOT NULL AND target_namespace IS NOT NULL AND target_id IS NOT NULL""",(cursor,stop))
   else:
    cur=c.execute("""INSERT OR IGNORE INTO refs(kind,source_rowid,original_id,source_document,namespace,target_id)
      SELECT 'citation',rowid,id,source_document,namespace,target_id
      FROM original.citation_occurrences WHERE rowid>? AND rowid<=?
      AND id IS NOT NULL AND source_document IS NOT NULL AND namespace IS NOT NULL AND target_id IS NOT NULL""",(cursor,stop))
   mark(c,kind,stop)
  cursor=stop;total+=stop-cursor+batch if stop-cursor+batch>=0 else batch
  print('PROGRESS',j({'kind':kind,'source_high':highest,'watermark':cursor,'inserted':cur.rowcount,'elapsed':round(time.perf_counter()-began,2)}),flush=True)
 return {'kind':kind,'origin_table':table,'watermark_start':start,'watermark_end':cursor,
         'source_high':highest,'complete':cursor>=highest,'elapsed_seconds':round(time.perf_counter()-began,2)}
def event_place(payload):
 # Exact source fields only; no geocoding or inference that a city is a building.
 place=payload.get('place')
 if isinstance(place,str) and place.strip():
  return place.strip(),'source_place_string',None
 if isinstance(place,dict):
  venue=place.get('venue');room=place.get('room')
  if isinstance(venue,str) and venue.strip():
   return venue.strip(),'source_named_venue',room.strip() if isinstance(room,str) and room.strip() else None
 if isinstance(payload.get('venue'),str) and payload['venue'].strip():
  return payload['venue'].strip(),'source_named_venue',payload.get('room') if isinstance(payload.get('room'),str) else None
 return None,None,None
def import_events(c):
 e=sqlite3.connect('file:'+str(EVENTS)+'?mode=ro',uri=True,timeout=25);e.row_factory=sqlite3.Row
 num=0;role_count=0
 with c:
  for r in e.execute('SELECT id,kind,title,date_hint,source_sha256,source_url,review,payload FROM records ORDER BY rowid'):
   payload=json.loads(r['payload']);p,gran,room=event_place(payload)
   date=r['date_hint']
   if not isinstance(date,str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',date):date=None
   original=payload.get('original_pdf_sha256') or payload.get('source_pdf_sha256') or r['source_sha256']
   num+=c.execute('INSERT OR IGNORE INTO event_index VALUES(?,?,?,?,?,?,?,?,?,?,?)',
    (r['id'],r['kind'],r['title'],date,p,gran,room,original,r['source_url'],r['review'],sha(r['payload'].encode()))).rowcount
   candidates=[]
   if r['kind']=='published_meeting_index':
    for x in payload.get('participants',[]):
     if isinstance(x,dict) and x.get('name') and x.get('source_id'):
      candidates.append((x['name'],x.get('role'),x.get('affiliation'),x['source_id'],'published_source_listed_not_observed_attended'))
   if r['kind'] in ('official_role_exact_clock_room_v4_v6','official_parallel_panel_listed_role'):
    name=payload.get('written_name') or payload.get('printed_name')
    if isinstance(name,str) and name.strip():
     candidates.append((name,payload.get('program_role') or'programme_listed',None,
        r['source_url'] or'original_pdf_sha256:'+str(original),'original_program_label_not_attendance_or_identity'))
   for name,role,affil,locator,basis in candidates:
    if not name or len(str(name))>160:continue
    role_count+=c.execute('INSERT OR IGNORE INTO written_roles VALUES(?,?,?,?,?,?)',
       (r['id'],str(name).casefold().strip(),str(role or''),str(affil or''),str(locator or''),basis)).rowcount
 e.close()
 return {'source_records':c.execute('SELECT count(*) FROM event_index').fetchone()[0],'new_records':num,
   'written_role_labels_total':c.execute('SELECT count(*) FROM written_roles').fetchone()[0],
   'new_role_labels':role_count,'review_effect':'none'}
def digest_semantics(c):
 h=hashlib.sha256()
 for table,cols,order in [
  ('refs','kind,source_rowid,original_id,source_document,namespace,target_id','kind,source_rowid'),
  ('event_index','record_id,kind,title,date_hint,place_label,room_label,source_sha256,source_review,payload_sha256','record_id'),
  ('written_roles','source_record_id,source_label,source_role,source_affiliation,record_basis','source_record_id,source_label,source_role,source_affiliation')]:
  h.update(table.encode())
  for row in c.execute('SELECT '+cols+' FROM '+table+' ORDER BY '+order):
   h.update(j(tuple(row)).encode());h.update(b'\n')
 return h.hexdigest()
def snapshot(c):
 # Source is attached read-only; back up only main cache.
 wm1=water(c,'reference');wm2=water(c,'citation');src_sha=sha(EVENTS.read_bytes())[:12]
 dest=OUT/f'compact-links-r{wm1}-c{wm2}-e{src_sha}.sqlite'
 if dest.exists():
  x=sqlite3.connect('file:'+str(dest)+'?mode=ro',uri=True)
  try:
   if digest_semantics(x)!=digest_semantics(c):raise RuntimeError('Conflicting existing versioned snapshot')
  finally:x.close()
  return {'path':str(dest),'status':'reused_verified'}
 partial=dest.with_suffix('.part')
 if partial.exists():raise RuntimeError('Unknown staged backup; inspect before retry')
 b=sqlite3.connect(partial)
 try:c.backup(b,pages=4096,sleep=.06)
 finally:b.close()
 verify=sqlite3.connect('file:'+str(partial)+'?mode=ro',uri=True)
 try:
  integrity=verify.execute('PRAGMA integrity_check').fetchone()[0]
  semantic=digest_semantics(verify)
 finally:verify.close()
 if integrity!='ok' or semantic!=digest_semantics(c):
  raise RuntimeError('Backup semantic mismatch or integrity failure; preserve staged artifact')
 os.replace(partial,dest)
 return {'path':str(dest),'status':'new_verified','bytes':dest.stat().st_size,
  'file_sha256':sha(dest.read_bytes()),'semantic_sha256':semantic}
def bench(c):
 # Sidecar inverted queries can be compared to the exact originals, with separate source scopes.
 probe=c.execute("SELECT source_document FROM refs WHERE kind='reference' ORDER BY source_rowid DESC LIMIT 1").fetchone()
 citation=c.execute("SELECT target_id FROM refs WHERE kind='citation' ORDER BY source_rowid DESC LIMIT 1").fetchone()
 result=[]
 def timed(q,params,n):
  vals=[];last=None
  for i in range(n):
   begin=time.perf_counter();last=c.execute(q,params).fetchall();vals.append((time.perf_counter()-begin)*1000)
  return round(statistics.median(vals),3),len(last or[])
 if probe:
  source=probe[0]
  fast=timed('SELECT original_id FROM refs WHERE source_document=? LIMIT 20',(source,),5)
  slow=timed('SELECT id FROM original.record_references WHERE source_document=? LIMIT 20',(source,),2)
  result.append({'query':'reverse_source_document','source_id':source,'original_median_ms':slow[0],'nvme_median_ms':fast[0],
   'speedup_observed':round(slow[0]/max(fast[0],.001),1),'sample_result_count':slow[1]})
 if citation:
  target=citation[0]
  fast=timed("SELECT original_id FROM refs WHERE kind='citation' AND namespace='us_public_law' AND target_id=? LIMIT 20",(target,),5)
  slow=timed('SELECT id FROM original.citation_occurrences WHERE target_id=? LIMIT 20',(target,),2)
  result.append({'query':'reverse_public_law_citation','source_key':target,'original_median_ms':slow[0],'nvme_median_ms':fast[0],
   'speedup_observed':round(slow[0]/max(fast[0],.001),1),'sample_result_count':slow[1]})
 return result
def build(args):
 c=attach(connect())
 try:
  until=time.monotonic()+args.seconds
  parts=[];remaining=args.limit
  for kind,table in [('reference','record_references'),('citation','citation_occurrences')]:
   if remaining<=0:break
   r=fill(c,kind,table,None,remaining,args.chunk,until);parts.append(r)
   remaining-=r['watermark_end']-r['watermark_start']
  event=import_events(c)
  tests=bench(c)
  snapshot_result=snapshot(c)
  result={'schema':'clifford/compact-native-crosslinks@2','observed_at':now(),
    'source':str(ORIGIN),'conference_source':str(EVENTS),'hot':str(HOT),
    'source_native_scanned':parts,'event_metadata':event,
    'link_rows':c.execute('SELECT count(*) FROM refs').fetchone()[0],
    'source_native_keys':c.execute('SELECT count(distinct namespace||char(31)||target_id) FROM refs').fetchone()[0],
    'hot_index_bytes':HOT.stat().st_size,'snapshot':snapshot_result,'benchmark':tests,
    'source_fulltext_reduplicated_bytes':0,'new_human_attendance_claims':0,'new_actor_or_money_claims':0,
    'original_source_mutated':False,'public_release':False}
  (OUT/'COMPACT-LINKS-CURRENT.json').write_text(json.dumps(result,indent=2)+'\n')
  print('ACCEPTED',json.dumps(result,indent=2),flush=True)
 finally:c.close()
def lookup(args):
 c=attach(connect())
 try:
  rows=[dict(x)for x in c.execute('SELECT kind,original_id,source_document,namespace,target_id FROM refs WHERE namespace=? AND target_id=? ORDER BY kind,original_id LIMIT ?',(args.namespace,args.id,args.max_results))]
  print(json.dumps({'status':'source_reference_only','target_namespace':args.namespace,'source_key':args.id,'total_returned':len(rows),
    'records':rows,'identity_or_causality_adjudicated':False},indent=2))
 finally:c.close()
def main():
 p=argparse.ArgumentParser()
 p.add_argument('action',choices=['build','lookup'])
 p.add_argument('--limit',type=int,default=1500000)
 p.add_argument('--chunk',type=int,default=40000)
 p.add_argument('--seconds',type=int,default=600)
 p.add_argument('--namespace',default='us_public_law')
 p.add_argument('--id')
 p.add_argument('--max-results',type=int,default=50)
 a=p.parse_args()
 if a.action=='build':
  if not 1<=a.limit<=2500000 or not 1000<=a.chunk<=100000 or not 1<=a.seconds<=900:raise ValueError('Finite bounded read required')
  build(a)
 else:
  if not a.id or len(a.id)>250 or not 1<=a.max_results<=100:raise ValueError('Bounded target key required')
  lookup(a)
if __name__=='__main__':main()
