#!/usr/bin/env python3
from __future__ import annotations
import copy,hashlib,json,os,pathlib,subprocess,sys
P=pathlib.Path
CAN='77aef3313e85e1fddc68805a9f22252ff147b4e8'
PROD='3b867f7a0b1ffe3687e8497ed9219a07d745b3b0'
ROOT=P('data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion')
BEFORE=P('data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion/promoted-partial-field-matrix.json')
CAND=P('data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-adjudication/promotion-candidate.json')
SOURCE=P('data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-adjudication/source-corpus.json')
PROTO=P('data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-validation/validated-candidate-protocol.json')
EXPECTED=[str(ROOT/x) for x in ['cell-promotion-ledger.json','product-manifest.json','promoted-partial-field-matrix.json','promotion-decision.json','promotion-input-custody.json','promotion-receipt.json','remaining-open-field-census.json','summary.json']]
sha=lambda b:hashlib.sha256(b).hexdigest()
canon=lambda v:json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
load=lambda p:json.loads(P(p).read_text())
def git(*a): return subprocess.check_output(['git',*a],text=True).strip()
assert git('rev-parse','HEAD')==PROD and git('rev-parse','HEAD^')==CAN
assert git('rev-list','--count',f'{CAN}..HEAD')=='1'
changed=sorted(git('diff','--name-only',CAN,'HEAD').splitlines())
added=sorted(git('diff','--name-only','--diff-filter=A',CAN,'HEAD').splitlines())
assert changed==added==sorted(EXPECTED)
assert not git('diff','--name-only','--diff-filter=MDTCRUXB',CAN,'HEAD')
manifest=load(ROOT/'product-manifest.json')
assert manifest['canonical_parent']==CAN and manifest['permanent_path_count']==8
assert manifest['addition_only'] is True and manifest['workflow_or_transport_paths']==0
assert manifest['semantic_counts']['cumulative_ledger_effect']=='none'
assert manifest['payload_combined_sha256']=='3baafad6bacbad2fcb8d322e2c74426286c79314a5f1cd556254f5b918906944'
rows=[]
for r in sorted(manifest['payload_files'],key=lambda x:x['path']):
 b=(ROOT/P(r['path']).name).read_bytes(); actual={'path':r['path'],'bytes':len(b),'sha256':sha(b)}
 assert actual==r; rows.append(actual)
pre=b''.join(r['path'].encode()+b'\0'+r['sha256'].encode()+b'\0'+str(r['bytes']).encode()+b'\n' for r in rows)
assert sha(pre)==manifest['payload_combined_sha256']
before_bytes=BEFORE.read_bytes(); after_bytes=(ROOT/'promoted-partial-field-matrix.json').read_bytes()
assert len(before_bytes)==485610 and sha(before_bytes)=='663f93d84f168bf6ccdd92eaee0deb47b109f4280e7b25613853c2c1a6be2b63'
assert len(after_bytes)==493362 and sha(after_bytes)=='54361c18446901945f36653f70dcc84002c87ede592163b9e5ef8ed7b25f0fdc'
before=json.loads(before_bytes); after=json.loads(after_bytes); cand=load(CAND); source=load(SOURCE); proto=load(PROTO)
required=cand['proposed_cell']['evidence_source_ids']; defined=[r['source_id'] for r in source['source_records']]
assert len(required)==len(set(required))==7 and set(required)==set(defined)
assert cand['proposed_cell_sha256']=='8700619932bd128250a308d5dcd7b1586a363ae3b78e4eb80c23bfb72c8a2e25'
assert sha(canon(cand['proposed_cell']))==cand['proposed_cell_sha256']
assert proto['separate_promotion_product_authorized'] is True and proto['maximum_field_terminalizations']==1 and proto['maximum_matrix_updates']==1
assert proto['row_state_transition_authorized'] is False and proto['maximum_row_state_mutations']==proto['maximum_row_terminalizations']==0
expected=copy.deepcopy(before); nd=next(r for r in expected['rows'] if r['unit_id']=='US-STATE-ND')
ti=next(i for i,c in enumerate(nd['cells']) if c['field_id']==cand['field_id'])
ri=next(i for i,c in enumerate(nd['cells']) if c['field_id']=='field_and_row_terminal_state')
rowstate=copy.deepcopy(nd['cells'][ri]); nd['cells'][ti]=copy.deepcopy(cand['proposed_cell']); nd['terminal_fields']=8; nd['open_fields']=1
for k,v in {'not_publicly_recovered_cells':14,'terminal_cells':228,'still_open_cells':222,'terminal_substantive_cells':118,'still_open_substantive_cells':182}.items(): expected['counts'][k]=v
expected_bytes=(json.dumps(expected,indent=2,ensure_ascii=False)+'\n').encode(); assert expected_bytes==after_bytes
assert nd['row_state']=='still_open' and nd['cells'][ri]==rowstate
assert sha(canon(nd['cells'][ri]))=='6a4c7d204c6c99a89f3c121065860806668c5da850f44c67fe42b4dc84b1b5c3'
assert sha(canon(nd['cells'][ti]))=='8700619932bd128250a308d5dcd7b1586a363ae3b78e4eb80c23bfb72c8a2e25'
def dif(a,b,p=''):
 if type(a)!=type(b): yield p; return
 if isinstance(a,dict):
  for k in sorted(set(a)|set(b)):
   q=f'{p}/{k}'
   if k not in a or k not in b: yield q
   else: yield from dif(a[k],b[k],q)
 elif isinstance(a,list):
  if len(a)!=len(b): yield p+'/length'
  for i,(x,y) in enumerate(zip(a,b)): yield from dif(x,y,f'{p}/{i}')
 elif a!=b: yield p
delta=list(dif(before,after)); ndx=next(i for i,r in enumerate(before['rows']) if r['unit_id']=='US-STATE-ND')
tix=next(i for i,c in enumerate(before['rows'][ndx]['cells']) if c['field_id']==cand['field_id'])
allowed={f'/counts/{k}' for k in ['not_publicly_recovered_cells','terminal_cells','still_open_cells','terminal_substantive_cells','still_open_substantive_cells']}
allowed|={f'/rows/{ndx}/terminal_fields',f'/rows/{ndx}/open_fields'}
assert all(p in allowed or p.startswith(f'/rows/{ndx}/cells/{tix}/') for p in delta),delta
assert len(before['rows'])==len(after['rows'])==50
for old,new in zip(before['rows'],after['rows']):
 if old['unit_id']!='US-STATE-ND': assert old==new
for i,(old,new) in enumerate(zip(before['rows'][ndx]['cells'],after['rows'][ndx]['cells'])):
 if i!=tix: assert old==new
cells=[c for r in after['rows'] for c in r['cells']]
subs={'operative_state_implementation_authority_and_version','implementation_effective_date_or_typed_gap','abawd_or_work_requirement_waiver_state_and_governing_period','discretionary_exemption_authority_and_reported_state_practice','fitness_for_work_or_eligibility_screening_rule','verification_evidence_and_staff_discretion_surface'}
sc=[c for c in cells if c['field_id'] in subs]
assert len(cells)==450 and len(sc)==300 and sum(c['terminal'] for c in cells)==228 and sum(c['terminal'] for c in sc)==118
receipt=load(ROOT/'promotion-receipt.json')
assert receipt['state']=='complete' and receipt['matrix_after_sha256']==sha(after_bytes)
assert receipt['field_terminalizations']==receipt['matrix_updates']==1 and receipt['row_state_mutations']==receipt['row_terminalizations']==0
assert receipt['class_closed'] is False and receipt['cumulative_ledger_effect']=='none' and receipt['outside_human_dependency'] is False
assert load(ROOT/'summary.json')['cumulative_ledger_effect']=='none'
out={'schema_version':'ssc-rd04-nd-current-gap-promotion-independent-validation@1','state':'qualified','canonical_parent':CAN,'product_commit':PROD,'product_tree':git('rev-parse','HEAD^{tree}'),'permanent_paths':8,'payload_combined_sha256':manifest['payload_combined_sha256'],'matrix_before_sha256':sha(before_bytes),'matrix_after_sha256':sha(after_bytes),'recursive_delta_paths':delta,'unaffected_rows':49,'row_state_cell_preserved':True,'field_terminalizations':1,'matrix_updates':1,'row_state_mutations':0,'row_terminalizations':0,'class_closed':False,'outside_human_dependency':False}
P(sys.argv[1]).write_text(json.dumps(out,indent=2,sort_keys=True)+'\n')
print(json.dumps(out,sort_keys=True))
