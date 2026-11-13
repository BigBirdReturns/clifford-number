#!/usr/bin/env python3
"""Read retained historical FPDS source rows without claiming accepted entity joins."""
import argparse,json,pathlib,sqlite3
FIELDS={
 'award_agency':['content.ID.ContractID.agencyID.#text','content.contractID.ID.agencyID.#text','content.contractID.ID.agencyID'],
 'piid':['content.ID.ContractID.PIID','content.contractID.ID.PIID'],
 'modification':['content.ID.ContractID.modNumber','content.contractID.ID.modNumber'],
 'referenced_agency':['content.ID.referencedID.agencyID.#text','content.contractID.referencedID.agencyID.#text','content.ID.referencedID.agencyID'],
 'referenced_piid':['content.ID.referencedID.PIID','content.contractID.referencedID.PIID'],
 'signed_date':['content.relevantContractDates.signedDate'],
 'vendor_label':['content.vendor.vendorSiteDetails.entityIdentifiers.vendorUEIInformation.UEILegalBusinessName','content.vendor.vendorHeader.vendorName'],
 'uei':['content.vendor.vendorSiteDetails.entityIdentifiers.vendorUEIInformation.UEI'],
 'parent_uei':['content.vendor.vendorSiteDetails.entityIdentifiers.vendorUEIInformation.ultimateParentUEI'],
 'parent_label':['content.vendor.vendorSiteDetails.entityIdentifiers.vendorUEIInformation.ultimateParentUEIName'],
 'action_obligated_amount':['content.dollarValues.obligatedAmount'],
 'cumulative_contract_obligated_amount':['content.totalDollarValues.totalObligatedAmount'],
 'requirement':['content.contractData.descriptionOfContractRequirement']}
def query(state,term,start,end,limit):
 import duckdb
 sql=sqlite3.connect('file:'+str(state/'ecology.sqlite')+'?mode=ro',uri=True);sql.row_factory=sqlite3.Row
 rows=sql.execute('SELECT * FROM bulk_assets WHERE period_start>=? AND period_start<=? ORDER BY period_start',(start,end)).fetchall();sql.close()
 if not rows:return {'status':'no_retained_assets_for_range','population_complete':False,'records':[]}
 files=[str(state/r['path'])for r in rows];byfile={str(state/r['path']):dict(r)for r in rows};c=duckdb.connect();c.execute('SET threads=2');c.execute("SET memory_limit='768MB'")
 try:
  names={x[0]for x in c.execute('DESCRIBE SELECT * FROM read_parquet(?,union_by_name=true,filename=true)',[files]).fetchall()}
  select=[]
  for alias,candidates in FIELDS.items():
   options=['cast("'+n.replace('"','""')+'" as varchar)'for n in candidates if n in names]
   expression='coalesce('+','.join(options)+')'if len(options)>1 else options[0]if options else 'NULL'
   select.append(expression+' AS "'+alias+'"')
  where='strpos(lower(coalesce(vendor_label,\'\')||\' \'||coalesce(parent_label,\'\')||\' \'||coalesce(piid,\'\')||\' \'||coalesce(requirement,\'\')),lower(?))>0'
  statement='WITH source AS(SELECT '+','.join(select)+',filename FROM read_parquet(?,union_by_name=true,filename=true)) SELECT * FROM source WHERE '+where+' AND try_cast(signed_date AS DATE)>=try_cast(? AS DATE) AND try_cast(signed_date AS DATE)<=try_cast(? AS DATE) LIMIT ?'
  cur=c.execute(statement,[files,term,start,end,limit]);cols=[x[0]for x in cur.description];found=[]
  for values in cur.fetchall():
   row=dict(zip(cols,values));asset=byfile[row.pop('filename')];row['source_sha256']=asset['sha256'];row['source_url']=asset['source_url'];row['source_asset_id']=asset['id'];row['source_class']=asset['source_class'];row['row_identity_scope']='Source row; agency/PIID/modification/reference fields retained separately. No PIID-only global merge.';row['historical_identity']='UEI/parent fields may reflect retrospective updates; historical ownership not established';found.append(row)
  return {'status':'retained_source_query','selected_asset_count':len(files),'retained_source_rows_in_selected_assets':sum(r['native_rows']for r in rows),'returned':len(found),'limit':limit,'truncated_or_more_possible':len(found)==limit,'population_complete':False,'amounts_summed':False,'records':found}
 finally:c.close()
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--state',type=pathlib.Path,required=True);p.add_argument('--query',required=True);p.add_argument('--start',default='1991-01-01');p.add_argument('--end',default='2007-09-30');p.add_argument('--limit',type=int,default=25);a=p.parse_args()
 if not 1<=a.limit<=200:raise SystemExit('limit must be 1..200')
 print(json.dumps(query(a.state.resolve(),a.query,a.start,a.end,a.limit),indent=2,default=str))
