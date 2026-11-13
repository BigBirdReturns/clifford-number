#!/usr/bin/env python3
"""Compile bounded, source-backed research crossings directly from indexed native keys.
No entity disambiguation, actual attendance, common-purpose or legal effect inferred.
"""
import argparse,datetime as dt,hashlib,json,os,pathlib,sqlite3,time
PROJECT_HOME=pathlib.Path(os.environ.get('CLIFFORD_PROJECT_HOME','/mnt/w03data/Incoming/DataArray/Projects/Products/Clifford-Number'))
STATE=pathlib.Path(os.environ.get('CLIFFORD_CROSSLINK_STATE',PROJECT_HOME/'sessions/performance-crosslinks-20261103'))
HOT=pathlib.Path(os.environ.get('CLIFFORD_HOT_INDEX_DIR','/srv/w03/nvme-work/jobs/clifford-performance-20261103'))/'compact-crosslinks-v2.sqlite'
def top(c,query,params=()):
 return [dict(zip([x[0] for x in cur.description],row)) for cur in [c.execute(query,params)] for row in cur.fetchall()]
def main():
 a=argparse.ArgumentParser();a.add_argument('--limit',type=int,default=30);args=a.parse_args()
 if not 1<=args.limit<=100:raise ValueError('Bounded candidate limit required')
 c=sqlite3.connect('file:'+str(HOT)+'?mode=ro',uri=True,timeout=45);c.row_factory=sqlite3.Row;c.execute('PRAGMA query_only=ON')
 start=time.perf_counter()
 source_keys=top(c,'''SELECT namespace,target_id,count(*) observation_rows,count(DISTINCT source_document) separate_document_identifiers
   FROM refs GROUP BY namespace,target_id HAVING count(DISTINCT source_document)>1
   ORDER BY separate_document_identifiers DESC,observation_rows DESC LIMIT ?''',(args.limit,))
 roles=top(c,'''SELECT source_label AS exact_printed_label,count(DISTINCT source_record_id) distinct_program_record_ids,
   group_concat(DISTINCT source_role) original_role_labels
   FROM written_roles GROUP BY source_label HAVING count(DISTINCT source_record_id)>1
   ORDER BY distinct_program_record_ids DESC,source_label LIMIT ?''',(args.limit,))
 places=top(c,'''SELECT date_hint,place_label,place_granularity,count(*) original_program_or_event_rows
   FROM event_index
   WHERE date_hint IS NOT NULL AND place_label IS NOT NULL AND place_granularity='source_named_venue'
   GROUP BY date_hint,place_label,place_granularity HAVING count(*)>1
   ORDER BY original_program_or_event_rows DESC,date_hint,place_label LIMIT ?''',(args.limit,))
 related=top(c,'''SELECT kind,source_sha256,count(*) original_source_rows FROM event_index
    WHERE source_sha256 IS NOT NULL GROUP BY kind,source_sha256 HAVING count(*)>1
    ORDER BY original_source_rows DESC,kind LIMIT ?''',(args.limit,))
 elapsed=(time.perf_counter()-start)*1000
 result={'schema':'clifford/fast-crossing-projections@1','observed_at':dt.datetime.now(dt.timezone.utc).isoformat(),
   'source_db':str(HOT),'source_native_identifier_recurrences':source_keys,
   'exact_printed_role_label_recurrences':roles,'same_declared_named_venue_day_program_rows':places,
   'shared_original_source_fingerprint_groups':related,
   'query_time_ms_all_four':round(elapsed,3),
   'limits':{'per_section':args.limit,'source_key_not_entity_identity':True,
     'printed_name_not_verified_same_person':True,'programme_listed_not_attended':True,
     'named_venue_and_calendar_not_proof_of_contact':True,'no_automatic_financial_or_causal_attribution':True},
   'graph_effect':'none','public_site_modified':False}
 out=STATE/'reports/FAST-CROSSING-PIVOTS.json'
 out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
 print(json.dumps({'schema':result['schema'],'at':result['observed_at'],'elapsed_ms':result['query_time_ms_all_four'],
   'native_recurrent_source_keys':len(source_keys),'repeated_printed_labels':len(roles),'named_venue_date_groups':len(places),
   'shared_source_fingerprint_groups':len(related),'output':str(out),'graph_effect':'none'},indent=2))
 c.close()
if __name__=='__main__':main()
