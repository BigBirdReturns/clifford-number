#!/usr/bin/env python3
"""Source-native FEC committee ID continuities across verified 1992, 1994, 1996 masters.

These are repeated *filer identifiers*, not proof of ultimate owners, payments,
unique economic relationships, human attendance, influence or wrongdoing.
Only public committee IDs/labels are projected; original sensitive fields stay in custody.
"""
from __future__ import annotations
import argparse,collections,hashlib,json,pathlib
import ecology_fec as fec

CYCLES=(1992,1994,1996)
def derive(state,out,cycles=CYCLES):
 cycles=tuple(cycles)
 if not cycles or cycles!=tuple(sorted(set(cycles))) or any(y not in fec.SUPPORTED_CYCLES for y in cycles):
  raise ValueError('Crosscycle input years must be sorted, supported, unique official FEC cycles')
 state=pathlib.Path(state);out=pathlib.Path(out)
 out.mkdir(parents=True,exist_ok=True)
 records=collections.defaultdict(list);source_summaries=[]
 for year in cycles:
  cap=state/'expansion-canary'/f'fec-{year}'
  archive=cap/fec.source_spec('committee',year)[0]
  receipt=cap/'SOURCE-RECEIPT.json'
  body,url,h,meta=fec.read_zip(archive,receipt,'committee',year)
  count=0
  for row in fec.committee_rows(body,year):
   count+=1
   records[row['committee_id']].append({
      'cycle':f'{year-1}-{year}',
      'source_cycle_year':year,
      'committee_id':row['committee_id'],
      'source_label':row['source_committee_label'],
      'source_url':url,
      'source_archive_sha256':h,
      'source_row':row['source_row'],
      'source_line_sha256':row['source_line_sha256'],
      'source_basis':'original_official_FEC_committee_master_row'
    })
  assert count==fec.EXPECTED_SOURCE_ROWS[year]['committee'],f'FEC {year} source count changed'
  source_summaries.append({'cycle':year,'rows':count,'url':url,'sha256':h})
 rows=[];counts=collections.Counter()
 for key,members in sorted(records.items()):
  if len(members)<2:continue
  years=tuple(m['source_cycle_year'] for m in members)
  if len(set(years))!=len(members):raise ValueError('Duplicate original committee ID in a year')
  changed=len(set(m['source_label'].strip() for m in members))>1
  counts['continued_id_total']+=1
  counts['label_varied' if changed else 'label_exact_repeated']+=1
  counts['years_'+','.join(map(str,years))]+=1
  rows.append({
    'schema':'clifford/fec-committee-source-native-continuity@1',
    'id':'fec:committee:'+key,
    'namespace':'fec_committee','source_native_committee_id':key,
    'cycles':list(years),'cycle_records':members,
    'source_identity_basis':'same_official_FEC_committee_ID_across_source_cycles',
    'source_label_state':'source_label_variation_unreviewed' if changed else 'label_exact_repeated',
    'legal_organization_and_control_review':'not_performed',
    'reported_filing_continuity_only':True,
    'payment_or_money_flow_join':False,
    'person_attendance_or_communication_join':False,
    'graph_effect':'none','independent_review':False,'public_release':False,
    'interpretation_contract':'Repeated FEC committee identifier across official masters; organization control, amended transactions, beneficial ownership and money flows remain separate evidence questions.'
  })
 path=out/f'FEC-{min(cycles)}-{max(cycles)}-COMMITTEE-CONTINUITIES.jsonl'
 with path.open('w') as f:
  for row in rows:f.write(json.dumps(row,sort_keys=True,ensure_ascii=False)+'\n')
 summary={
 'schema':'clifford/fec-crosscycle-committee-source-reconciliation@1',
 'source_populations':source_summaries,
 'counts':dict(counts),'source_unique_identifiers':len(records),
 'verified_repeated_source_identifiers':len(rows),
 'artifact':str(path),'artifact_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
 'no_independent_review':True,'no_graph_promotion':True,'no_payment_inference':True,
 'source_rights':fec.SOURCE_RIGHTS,
 'reported_names_only_not_legal_entity_join':True,'public_release':False
 }
 (out/f'FEC-{min(cycles)}-{max(cycles)}-CONTINUITY-SUMMARY.json').write_text(json.dumps(summary,indent=2)+'\n')
 return summary
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--state',required=True);p.add_argument('--out',required=True)
 p.add_argument('--through',type=int,choices=(1996,1998),default=1996)
 a=p.parse_args();print(json.dumps(derive(a.state,a.out,cycles=tuple(y for y in sorted(fec.SUPPORTED_CYCLES) if y<=a.through)),indent=2))
