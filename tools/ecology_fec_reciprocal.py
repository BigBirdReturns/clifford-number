#!/usr/bin/env python3
"""Match reciprocal original FEC committee reports by IDs, date and exact amount.

Candidate matching reports are not a unique bank payment or an accepted
influence relationship. Never sum mirrored or amended entries as cash flows.
"""
from __future__ import annotations
import argparse,collections,hashlib,json,pathlib
import ecology_fec as fec
import ecology_backlog as base

RECIPROCAL_TYPES={
 'affiliated_transfer':('24G','18G'),
 'nonaffiliated_contribution':('24K','18K'),
 'in_kind_registered_filer':('24Z','15Z')
}
def reconcile(capture_dir,output):
 cap=pathlib.Path(capture_dir);out=pathlib.Path(output);out.parent.mkdir(parents=True,exist_ok=True)
 cm_bytes,cm_url,cm_h,_=fec.read_zip(cap/'cm92.zip',cap/'SOURCE-RECEIPT.json','committee')
 tx_bytes,tx_url,tx_h,_=fec.read_zip(cap/'oth92.zip',cap/'OTHER-TRANSACTIONS-SOURCE-RECEIPT.json','transaction')
 cm={r['committee_id']:r['source_committee_label'] for r in fec.committee_rows(cm_bytes)}
 matches={t:(collections.defaultdict(list),collections.defaultdict(list)) for t in RECIPROCAL_TYPES}
 for r in fec.transaction_rows(tx_bytes):
  other=r['source_other_id'];kind=r['source_transaction_type']
  if r['source_other_id_namespace']!='fec_committee' or not r['reported_date']:continue
  for group,(outcode,incode) in RECIPROCAL_TYPES.items():
   if kind==outcode:
    key=(r['source_filer_committee_id'],other,r['reported_date'],r['amount_reported_exact'])
    matches[group][0][key].append(r)
   elif kind==incode:
    key=(other,r['source_filer_committee_id'],r['reported_date'],r['amount_reported_exact'])
    matches[group][1][key].append(r)
 results=[]
 counts={}
 for group,(outs,ins) in matches.items():
  keys=sorted(outs.keys() & ins.keys(),key=lambda k:(k[2],k[0],k[1],k[3]))
  counts[group]={'matching_source_key_groups':len(keys),'outgoing_report_rows_on_keys':sum(len(outs[k]) for k in keys),
                 'incoming_report_rows_on_keys':sum(len(ins[k]) for k in keys)}
  for k in keys[:30]:
   def summary(rows):
    return [{'sub_id':r['native_sub_id'],'source_row':r['source_row'],'source_line_sha256':r['source_line_sha256'],
             'type':r['source_transaction_type'],'amendment':r['source_amendment_indicator']} for r in rows[:6]]
   a,b,date,money=k
   results.append({'class':group,'from_committee_id':a,'from_1992_source_name':cm.get(a),
     'to_committee_id':b,'to_1992_source_name':cm.get(b),'source_date':date,
     'amount_source_reported':money,'currency':'USD',
     'outgoing_report_count':len(outs[k]),'incoming_report_count':len(ins[k]),
     'outgoing_source_records':summary(outs[k]),'incoming_source_records':summary(ins[k]),
     'source_url':tx_url,'source_archive_sha256':tx_h,'committee_master_url':cm_url,
     'committee_master_sha256':cm_h,'record_state':'matching_source_native_reciprocal_reports_not_adjudicated_one_payment',
     'economic_event_count':'unresolved_amendments_and_duplicate_reporting',
     'graph_effect':'none','independent_review':False})
 report={'schema':'clifford/fec-reciprocal-source-candidates@1','source_cycle':'1991-1992',
   'official_type_definitions':'https://www.fec.gov/campaign-finance-data/transaction-type-code-descriptions/',
   'sources':{'committees':{'url':cm_url,'sha256':cm_h},'transaction':{'url':tx_url,'sha256':tx_h}},
   'counts':counts,'examples':results,'sample_limit_per_type':30,
   'evidence_limit':'Source-native IDs, matched reporting dates and dollar amounts establish filing-report correspondence only. Amendments and mirrored entries can double count an economic transaction. No bank settlement, actual outlay, independent control, causation, allegation or consolidated money total is established.',
   'public_release':False,'review_state':'unreviewed_research_candidates'}
 out.write_text(json.dumps(report,indent=2)+'\n')
 return report
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--capture-dir',type=pathlib.Path,required=True);p.add_argument('--out',type=pathlib.Path,required=True)
 a=p.parse_args();x=reconcile(a.capture_dir,a.out)
 print(json.dumps({'out':str(a.out),'counts':x['counts'],'example_count':len(x['examples']),'sample':x['examples'][:2]},indent=2))
