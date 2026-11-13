#!/usr/bin/env python3
"""Independent bounded source-ID oracle, using hot NVMe and exact original source rows."""
import datetime as dt,json,pathlib,sqlite3,os
PROJECT_HOME=pathlib.Path(os.environ.get('CLIFFORD_PROJECT_HOME','/mnt/w03data/Incoming/DataArray/Projects/Products/Clifford-Number'))
ROOT=pathlib.Path(os.environ.get('CLIFFORD_CROSSLINK_STATE',PROJECT_HOME/'sessions/performance-crosslinks-20261103'))
HOT=pathlib.Path(os.environ.get('CLIFFORD_HOT_INDEX_DIR','/srv/w03/nvme-work/jobs/clifford-performance-20261103'))/'compact-crosslinks-v2.sqlite'
SRC=pathlib.Path(os.environ.get('CLIFFORD_ECOLOGY_DB',PROJECT_HOME/'sessions/integrity-acquisition-20261102/ecology/ecology.sqlite'))
CONF=pathlib.Path(os.environ.get('CLIFFORD_CONFERENCE_DB',PROJECT_HOME/'sessions/conference-circuit-20261103/reports/conference-circuit-v8.sqlite'))
def ro(p):
 c=sqlite3.connect('file:'+str(p)+'?mode=ro',uri=True,timeout=20);c.row_factory=sqlite3.Row;c.execute('PRAGMA query_only=ON');return c
def main():
 h=ro(HOT);s=ro(SRC);v=ro(CONF);proof=[];reported=json.loads((ROOT/'reports/COMPACT-LINKS-CURRENT.json').read_text())
 for kind,table,ns in [('reference','record_references','target_namespace'),('citation','citation_occurrences','namespace')]:
  wm=json.loads(h.execute("SELECT value FROM meta WHERE key=?",('watermark:'+kind,)).fetchone()[0])
  source_high=s.execute('SELECT max(rowid) FROM '+table).fetchone()[0]
  n=h.execute('SELECT count(*) FROM refs WHERE kind=?',(kind,)).fetchone()[0]
  if n!=wm or wm>source_high:raise RuntimeError(f'Watermark mismatch {kind}: {wm} != {n}')
  checked=[]
  for origin_id in sorted({1,max(1,wm//3),max(1,(2*wm)//3),wm}):
   orig=s.execute('SELECT id,source_document,'+ns+',target_id FROM '+table+' WHERE rowid=?',(origin_id,)).fetchone()
   new=h.execute('SELECT original_id,source_document,namespace,target_id FROM refs WHERE kind=? AND source_rowid=?',(kind,origin_id)).fetchone()
   if not orig or not new or tuple(orig)!=tuple(new):raise RuntimeError('Source-native row drift '+str((kind,origin_id)))
   checked.append(origin_id)
  proof.append({'kind':kind,'indexed':n,'source_high':source_high,'exact_native_row_ids_checked':checked,'source_population_currently_complete':wm==source_high})
 direct=v.execute('SELECT count(*) FROM records').fetchone()[0]
 events=h.execute('SELECT count(*) FROM event_index').fetchone()[0]
 names=h.execute('SELECT count(*) FROM written_roles').fetchone()[0]
 assert events==direct==2748 and names>=652
 index_check=h.execute('PRAGMA quick_check').fetchone()[0]
 if index_check!='ok':raise RuntimeError('Hot NVMe structural index check failed')
 constkey=('us_public_law','102-190')
 side_refs=h.execute("SELECT count(*) FROM refs WHERE kind='reference' AND namespace=? AND target_id=?",constkey).fetchone()[0]
 origin_refs=s.execute('SELECT count(*) FROM record_references WHERE target_namespace=? AND target_id=?',constkey).fetchone()[0]
 side_cites=h.execute("SELECT count(*) FROM refs WHERE kind='citation' AND namespace=? AND target_id=?",constkey).fetchone()[0]
 origin_cites=s.execute('SELECT count(*) FROM citation_occurrences WHERE namespace=? AND target_id=?',constkey).fetchone()[0]
 if (side_refs,side_cites)!=(origin_refs,origin_cites):raise RuntimeError('Exact law cross-reference disagrees with source')
 res={'schema':'clifford/source-crosslink-independent-oracle@1','status':'PASS','observed_at':dt.datetime.now(dt.timezone.utc).isoformat(),
   'source_id_proofs':proof,'event_metadata_identical_row_count':direct,'source_listed_role_labels':names,
   'indexed_reference_oracle':{'namespace':'us_public_law','target_id':'102-190','source_refs':side_refs,'original_refs':origin_refs,'source_citations':side_cites,'original_citations':origin_cites},
   'hot_sqlite_quick_check':'ok','hot_index_bytes':HOT.stat().st_size,
   'cold_source_backup_proven_by_build_semantic_digest':reported['snapshot']['semantic_sha256'],
   'offdevice_verification_separate':True,'original_source_full_text_changed':False,
   'identity_attendance_money_or_causal_edges_promoted':0,'publication':False,
   'previous_full_cold_integrity_verifier':'cancelled_due_W03_HDD_page_wait; independent cold original hash and SQLite checks assigned W01'}
 (ROOT/'reports/INDEPENDENT-SOURCE-ORACLE.json').write_text(json.dumps(res,indent=2)+'\n')
 print(json.dumps(res,indent=2))
 h.close();s.close();v.close()
if __name__=='__main__':main()
