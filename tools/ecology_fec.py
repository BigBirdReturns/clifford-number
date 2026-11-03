#!/usr/bin/env python3
"""FEC historical committee roster and transaction source-native instrument adapter.

Original official ZIP bodies remain in the owner-private ecology source custody.
Derived records omit individual names, addresses, employers and occupations.
A filed transaction is a reported row, not a paid balance, independent finding,
unique economic event across amendments, corporate parent or causal graph edge.
"""
from __future__ import annotations
import argparse, collections, datetime as dt, decimal, hashlib, io, json, pathlib, re, urllib.parse, zipfile
import ecology_backlog as base
import ecology_sources as sources

FEC='https://www.fec.gov/files/bulk-downloads/1992/'
S3='cg-519a459a-0ea3-42c2-b7bc-fa1143481f74.s3-us-gov-west-1.amazonaws.com'
KIND={'committee':('cm92.zip','cm.txt',15),'transaction':('oth92.zip','itoth.txt',21)}
SUPPORTED_CYCLES={1992,1994}
EXPECTED_SOURCE_ROWS={1992:{'committee':10759,'transaction':273009},
                      1994:{'committee':10815,'transaction':272852}}
def source_spec(kind,year):
 if year not in SUPPORTED_CYCLES or kind not in KIND:raise ValueError('Unsupported cycle or FEC source kind')
 original,member,width=KIND[kind]
 return original.replace('92.zip',str(year)[-2:]+'.zip'),member,width
COMMITTEE=re.compile(r'C[0-9]{8}\Z')
CANDIDATE=re.compile(r'[HSP][A-Z0-9]{8}\Z')
TRANSACTION_SUBID=re.compile(r'[0-9]{1,22}\Z')
AMOUNT=re.compile(r'-?[0-9]+(?:\.[0-9]{1,2})?\Z')
SOURCE_RIGHTS={
 'official_file_description':'https://www.fec.gov/campaign-finance-data/committee-master-file-description/',
 'official_transaction_description':'https://www.fec.gov/campaign-finance-data/any-transaction-one-committee-another-file-description/',
 'rights_notice':'https://www.fec.gov/updates/sale-or-use-contributor-information/',
 'individual_contributor_personal_fields_indexed':False,
 'no_solicitation_or_commercial_individual_contributor_use':True,
 'public_redistribution_authorized_by_this_adapter':False,
}
def sha(data):return hashlib.sha256(data).hexdigest()

def read_zip(capture,receipt,kind,year=1992):
 filename,member,fields=source_spec(kind,year)
 p=pathlib.Path(capture);r=json.loads(pathlib.Path(receipt).read_text())
 raw=p.read_bytes()
 url=f'https://www.fec.gov/files/bulk-downloads/{year}/'+filename;declared=r.get('source',r.get('url'))
 if declared!=url or r.get('http_status')!=200 or len(raw)!=r.get('bytes') or sha(raw)!=r.get('sha256'):
  raise ValueError('official FEC capture/route/status/hash mismatch')
 final=urllib.parse.urlsplit(r.get('final_url',''))
 if final.scheme!='https' or final.hostname not in ('www.fec.gov',S3) or not final.path.endswith('/'+str(year)+'/'+filename):
  raise ValueError('unapproved FEC source redirect')
 if len(raw)>25000000:raise ValueError('FEC ZIP exceeds original source boundary')
 try:
  with zipfile.ZipFile(io.BytesIO(raw)) as z:
   info=z.infolist()
   if len(info)!=1 or info[0].filename!=member or info[0].is_dir() or info[0].file_size>75000000:
    raise ValueError('FEC member not exact expected single file')
   data=z.read(info[0])
   if len(data)!=info[0].file_size:raise ValueError('FEC decompressed member size mismatch')
 except (zipfile.BadZipFile,RuntimeError) as exc:raise ValueError('invalid FEC source ZIP') from exc
 return data,url,sha(raw),r

def iter_cells(data,fields):
 for n,raw in enumerate(data.splitlines(),1):
  if not raw.strip():raise ValueError(f'empty record inside FEC source at line {n}')
  cells=raw.decode('latin1').split('|')
  if len(cells)!=fields:raise ValueError(f'wrong FEC field count on line {n}')
  yield n,cells,sha(raw)

def committee_rows(data,year=1992):
 seen=set()
 for n,c,h in iter_cells(data,15):
  id,label=c[0],c[1]
  if not COMMITTEE.fullmatch(id) or id in seen or not label.strip():raise ValueError(f'bad/duplicate FEC committee ID or label line {n}')
  seen.add(id)
  candidate=c[14]
  if candidate and not CANDIDATE.fullmatch(candidate):raise ValueError(f'invalid source candidate identifier line {n}')
  yield {
   'committee_id':id,'source_committee_label':label,'cycle':f'{year-1}-{year}',
   'committee_type_code':c[9],'designation_code':c[8],'party_affiliation_code':c[10],
   'filing_frequency_code':c[11],'organization_category_code':c[12],
   'source_connected_organization_label':c[13] or None,
   'source_candidate_id':candidate or None,'source_row':n,'source_line_sha256':h,
   'source_state':'FEC_registered_committee_master_source_row_only',
   'source_connected_organization_relation':'unreviewed_source_label_not_legal_parent',
   'source_candidate_link_review':'not_performed',
   'graph_effect':'none','financial_amount_state':'not_in_committee_master'}
  # Treasurer, home/street, location and ZIP are intentionally not projected.

def parse_reported_date(s,year=1992):
 if not s:return None,'source_date_absent'
 if not re.fullmatch(r'[0-9]{8}',s):return None,'source_date_unparseable'
 try:parsed=dt.datetime.strptime(s,'%m%d%Y').date()
 except ValueError:return None,'source_calendar_date_invalid'
 if parsed.year>2026:return None,'source_future_date_anomaly_not_anticipated_event'
 if parsed.year<year-1 or parsed.year>year:return parsed.isoformat(),'source_date_outside_declared_election_cycle'
 return parsed.isoformat(),'source_date_in_declared_cycle'

def transaction_rows(data,year=1992):
 seen=set()
 for n,c,h in iter_cells(data,21):
  filer,other,subid=c[0],c[15],c[20]
  if not COMMITTEE.fullmatch(filer) or not TRANSACTION_SUBID.fullmatch(subid) or subid in seen:
   raise ValueError(f'invalid committee/duplicate FEC native row id on line {n}')
  seen.add(subid)
  if other and not (COMMITTEE.fullmatch(other) or CANDIDATE.fullmatch(other)):
   raise ValueError(f'invalid source secondary ID on line {n}')
  if not AMOUNT.fullmatch(c[14]):raise ValueError(f'invalid source transaction amount on line {n}')
  amount=decimal.Decimal(c[14])
  date,quality=parse_reported_date(c[13],year);kind=c[5]
  if not kind or len(kind)>3:raise ValueError(f'invalid transaction type on line {n}')
  # FEC transaction types 24K and 24G have explicit disbursement direction.
  # Others stay unclassified, so reported reverse-facing rows are not doubled.
  side='filer_outgoing_reported' if kind in ('24K','24G') else 'unclassified_reported_row'
  yield {
   'native_sub_id':subid,'cycle':f'{year-1}-{year}','source_filer_committee_id':filer,
   'source_other_id':other or None,
   'source_other_id_namespace':'fec_committee' if COMMITTEE.fullmatch(other) else 'fec_candidate' if CANDIDATE.fullmatch(other) else None,
   'source_amendment_indicator':c[1] or None,
   'source_report_type':c[2] or None,
   'source_election_indicator':c[3] or None,
   'source_image_num':c[4] or None,
   'source_transaction_type':kind,
   'source_transaction_date_raw':c[13] or None,'reported_date':date,
   'source_date_quality':quality,'amount_reported_exact':str(amount),
   'amount_kind':'FEC_reported_transaction_amount_not_independent_payment',
   'source_transaction_direction':side,
   'memo_code':c[18] or None,
   'source_row':n,'source_line_sha256':h,
   'amendment_deduplicated':False,'aggregate_or_net_amount_claimed':False,
   'source_filing_review':'not_performed','graph_effect':'none'}
  # SOURCE NAME/address/employer/occupation and memo text are not indexed or exported.

def accept_source(capture_dir,out,year=1992):
 source_spec('committee',year)
 cap=pathlib.Path(capture_dir);dest=pathlib.Path(out);dest.mkdir(parents=True,exist_ok=True)
 result={'schema':f'clifford/fec-historical-{year}-source@1','period':f'{year-1}-{year}','qualified_at':base.utc(),
         'source_rights':SOURCE_RIGHTS,'source_rows':{},'sources':{},'excluded_personal_fields':['NAME','CITY','STATE','ZIP_CODE','EMPLOYER','OCCUPATION','TRES_NM','CMTE_ST1','CMTE_ST2','CMTE_CITY','CMTE_ST','CMTE_ZIP'],
         'source_complete_scope':f'the two exact official {year} FEC ZIP member files only','all_elections_or_review_complete':False}
 for kind in KIND:
  fn=source_spec(kind,year)[0]
  receipt=cap/('SOURCE-RECEIPT.json' if kind=='committee' else 'OTHER-TRANSACTIONS-SOURCE-RECEIPT.json')
  body,url,h,_=read_zip(cap/fn,receipt,kind,year)
  records=committee_rows(body,year) if kind=='committee' else transaction_rows(body,year)
  outpath=dest/(f'FEC-{year}-COMMITTEES.jsonl' if kind=='committee' else f'FEC-{year}-TRANSACTIONS.jsonl')
  count=0;outside=0;related=0;future=0
  with outpath.open('w',encoding='utf-8') as f:
   for row in records:
    row=row|{'source_url':url,'source_sha256':h,'source_kind':kind,'source_rights_reference':SOURCE_RIGHTS['rights_notice'],
             'interpretation_contract':'FEC source-native filing row, not unique payment, legal parent, factual review or graph relationship; individual contributor fields withheld'}
    count+=1;outside+=int(row.get('source_date_quality')=='source_date_outside_declared_election_cycle')
    future+=int(row.get('source_date_quality')=='source_future_date_anomaly_not_anticipated_event')
    related+=int(row.get('source_other_id_namespace')=='fec_committee')
    f.write(base.j(row)+'\n')
  result['source_rows'][kind]=count
  result['sources'][kind]={'url':url,'source_sha256':h,'zip_bytes':(cap/fn).stat().st_size,
      'archive_member':KIND[kind][1],'derived_jsonl':str(outpath),
      'derived_sha256':sha(outpath.read_bytes()),'source_dates_outside_election_cycle':outside,
      'future_date_anomalies':future,'other_committee_reference_rows':related}
 if result['source_rows']!=EXPECTED_SOURCE_ROWS[year]:
  raise ValueError('observed FEC archival source population count changed; investigate before acceptance')
 result['status']='source_parsed_and_qualified_not_production_adopted'
 result['financial_state']='recorded amounts per original FEC row, no aggregate net/payment outcome'
 result['identity_state']='source native committee/candidate identifier only'
 (dest/f'FEC-{year}-ACCEPTANCE.json').write_text(json.dumps(result,indent=2)+'\n')
 return result

def ingest(state,capture_dir,year=1992):
 source_spec('committee',year)
 """Adopt official source rows only after the existing three-lane owner is terminal."""
 state=pathlib.Path(state);cap=pathlib.Path(capture_dir)
 if not cap.resolve().is_relative_to(state.resolve()):
  raise ValueError('Official FEC source captures must remain within existing ecology state custody')
 validated={}
 for kind in KIND:
  fn=source_spec(kind,year)[0]
  receipt=cap/('SOURCE-RECEIPT.json' if kind=='committee' else 'OTHER-TRANSACTIONS-SOURCE-RECEIPT.json')
  body,url,h,_=read_zip(cap/fn,receipt,kind,year)
  validated[kind]=(body,url,h,fn)
 with base.lock(state,'acquisition'):
  c=base.connect(state);sources.ensure(c)
  counts={};added={}
  for kind,(body,url,h,fn) in validated.items():
   tid=base.sha(f'FEC|{year}|{kind}|{url}'.encode())
   old=c.execute('SELECT status FROM tasks WHERE id=?',(tid,)).fetchone()
   if old and old[0]!='source_bulk_metadata_recorded':
    raise ValueError('Existing FEC task has differing source disposition')
   with c:
    c.execute("""INSERT OR IGNORE INTO tasks(id,lane,kind,spec,estates,status,updated)
              VALUES(?,?,?,?,?,?,?)""",(tid,'sources',f'fec_{kind}_{year}',base.j({'url':url,'cycle':year}),'[]','source_bulk_metadata_recorded',base.utc()))
    capid=base.sha((f'FEC|{year}|'+kind+'|'+h).encode())
    rel=str((cap/fn).resolve().relative_to(state.resolve()))
    c.execute("""INSERT OR IGNORE INTO captures(id,task_id,url,request,status,path,sha256,bytes,at,error)
              VALUES(?,?,?,?,?,?,?,?,?,NULL)""",(capid,tid,url,base.j({'method':'GET','bulk_zip':True}),200,rel,h,(cap/fn).stat().st_size,base.utc()))
    rows=committee_rows(body,year) if kind=='committee' else transaction_rows(body,year)
    count=0;inserted=0
    for row in rows:
     count+=1
     key=row['committee_id'] if kind=='committee' else row['native_sub_id']
     ident=base.sha(f'FEC_{year}_{kind}|{key}'.encode())
     full=row|{'source_url':url,'source_sha256':h,'source_cycle':year,
                 'individual_personal_fields_projected':False}
     if kind=='committee':
      title=f'FEC {year} committee '+row['committee_id']
      text=f'FEC {year} committee '+row['committee_id']+' '+row['source_committee_label']+'; registered source organization label '+str(row['source_connected_organization_label'] or '')
      recorddate=None;review='fec_committee_master_metadata_unreviewed'
     else:
      title=f'FEC {year} reported transaction '+row['native_sub_id']
      text='Filer committee '+row['source_filer_committee_id']+'; secondary ID '+str(row['source_other_id'] or '')+'; source type '+row['source_transaction_type']+'; recorded amount '+row['amount_reported_exact']+' USD; source date '+str(row['source_transaction_date_raw'])
      recorddate=row['reported_date'];review='fec_transaction_row_amendment_unreconciled'
     inserted+=base.upsert_document(c,ident=ident,origin='acquired',locator=url,source_hash=h,
       position=str(row['source_row']),kind=('fec_committee_master' if kind=='committee' else 'fec_reported_transaction'),
       estates=[],title=title,body=text,record_date=recorddate,review=review,payload=full)
     ns='fec_committee'
     if kind=='committee':
      sources.ref(c,ident,ns,row['committee_id'],url,h,'source_registered_committee')
      if row['source_candidate_id']:sources.ref(c,ident,'fec_candidate',row['source_candidate_id'],url,h,'source_named_candidate_id_only')
     else:
      sources.ref(c,ident,ns,row['source_filer_committee_id'],url,h,'source_reported_filer')
      if row['source_other_id']:
       sources.ref(c,ident,row['source_other_id_namespace'],row['source_other_id'],url,h,'source_reported_secondary_id')
    c.execute("""INSERT OR IGNORE INTO bulk_assets
      (id,task_id,path,sha256,bytes,source_url,source_class,native_rows,period_start,period_end,schema_json,quality_json,observed_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
      (f'fec:{year}:'+kind,tid,rel,h,(cap/fn).stat().st_size,url,f'official_FEC_{year}_'+kind,count,
       f'{year-1}-01-01',f'{year}-12-31',base.j({'archive_member':KIND[kind][1],'columns':KIND[kind][2]}),
       base.j({'reported_rows_not_money_aggregates':True,'rights':SOURCE_RIGHTS,'source_dates_may_be_outside_cycle':True}),base.utc()))
    c.execute('UPDATE tasks SET rows_seen=?,expected=?,updated=? WHERE id=?',(count,count,base.utc(),tid))
    counts[kind]=count;added[kind]=inserted
  n=c.execute('SELECT COUNT(*) FROM documents').fetchone()[0]
  f=c.execute('SELECT COUNT(*) FROM search').fetchone()[0]
  c.close()
  if n!=f:raise ValueError('FEC production ingestion resulted in document/FTS mismatch')
  return {'status':'source_native_FEC_rows_searchable_without_factual_review','source_rows':counts,
          'new_documents':added,'documents':n,'fts':f,'public_site_changed':False,
          'review_state':'source_only_no_relationship_or_payment_promotion'}

if __name__=='__main__':
 ap=argparse.ArgumentParser()
 ap.add_argument('--capture-dir',type=pathlib.Path,required=True)
 ap.add_argument('--out',type=pathlib.Path)
 ap.add_argument('--state',type=pathlib.Path)
 ap.add_argument('--ingest',action='store_true')
 ap.add_argument('--year',type=int,default=1992,choices=sorted(SUPPORTED_CYCLES))
 a=ap.parse_args()
 if a.ingest:
  if not a.state:ap.error('--ingest requires --state')
  print(json.dumps(ingest(a.state,a.capture_dir,a.year),indent=2))
 else:
  if not a.out:ap.error('--out required')
  print(json.dumps(accept_source(a.capture_dir,a.out,a.year),indent=2))
