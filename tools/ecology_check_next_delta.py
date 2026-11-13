#!/usr/bin/env python3
"""Cheap, deterministic source-version/watermark check; no scan, no source mutation, no model call."""
import datetime as dt,hashlib,json,pathlib,sqlite3,os
PROJECT_HOME=pathlib.Path(os.environ.get('CLIFFORD_PROJECT_HOME','/mnt/w03data/Incoming/DataArray/Projects/Products/Clifford-Number'))
ROOT=pathlib.Path(os.environ.get('CLIFFORD_CROSSLINK_STATE',PROJECT_HOME/'sessions/performance-crosslinks-20261103'))
SRC=pathlib.Path(os.environ.get('CLIFFORD_ECOLOGY_DB',PROJECT_HOME/'sessions/integrity-acquisition-20261102/ecology/ecology.sqlite'))
EVENTS=pathlib.Path(os.environ.get('CLIFFORD_CONFERENCE_DB',PROJECT_HOME/'sessions/conference-circuit-20261103/reports/conference-circuit-v8.sqlite'))
HOT=pathlib.Path(os.environ.get('CLIFFORD_HOT_INDEX_DIR','/srv/w03/nvme-work/jobs/clifford-performance-20261103'))/'compact-crosslinks-v2.sqlite'
def ro(p):
 c=sqlite3.connect('file:'+str(p)+'?mode=ro',uri=True,timeout=20);c.execute('PRAGMA query_only=ON');return c
def main():
 h=ro(HOT);src=ro(SRC)
 for_source=[]
 for k,t in [('reference','record_references'),('citation','citation_occurrences')]:
  wm=int(json.loads(h.execute("SELECT value FROM meta WHERE key=?",('watermark:'+k,)).fetchone()[0]))
  current=src.execute('SELECT max(rowid) FROM '+t).fetchone()[0] or 0
  if current<wm:raise RuntimeError('Source rowid population regressed')
  # Existing natural ID at the last indexed source row must remain identical.
  stored=h.execute('SELECT original_id FROM refs WHERE kind=? AND source_rowid=?',(k,wm)).fetchone()
  source=src.execute('SELECT id FROM '+t+' WHERE rowid=?',(wm,)).fetchone()
  if wm and (not stored or not source or stored[0]!=source[0]):raise RuntimeError('Native source ID mutation/rowid rewrite hold')
  for_source.append({'source_family':k,'indexed_through_rowid':wm,'source_high_rowid':current,'new_source_rows':current-wm})
 last=json.loads((ROOT/'reports/COMPACT-LINKS-CURRENT.json').read_text())
 old_event_sha=last['snapshot']['path'].rsplit('-e',1)[-1].replace('.sqlite','')
 current_sha=hashlib.sha256(EVENTS.read_bytes()).hexdigest()[:12]
 event_changed=old_event_sha!=current_sha
 needs_links=any(r['new_source_rows']>0 for r in for_source)
 mode='EVENT_SOURCE_VERSION_CHANGED_REQUIRES_REVIEW' if event_changed else 'NEW_SOURCE_LINK_ROWS_READY' if needs_links else 'UNCHANGED_NO_REBUILD'
 r={'schema':'clifford/compact-crosslinks-next-delta@1','observed_at':dt.datetime.now(dt.timezone.utc).isoformat(),
 'disposition':mode,'source_families':for_source,'original_conference_hash_prefix':old_event_sha,
 'current_conference_hash_prefix':current_sha,'conference_version_changed':event_changed,
 'launch_incremental_links':needs_links and not event_changed,'source_full_body_scan':False,
 'accepted_actor_attendance_or_money_links':0,'original_source_writes':False}
 (ROOT/'reports/NEXT-DELTA.json').write_text(json.dumps(r,indent=2)+'\n')
 print(json.dumps(r,indent=2))
 h.close();src.close()
if __name__=='__main__':main()
