#!/usr/bin/env python3
from __future__ import annotations
import copy,hashlib,json,os,pathlib,subprocess

ROOT=pathlib.Path.cwd()
VROOT=ROOT/os.environ['VALIDATION_ROOT']
MATRIX=ROOT/os.environ['MATRIX_PATH']

def load(path): return json.loads(path.read_text(encoding='utf-8'))
def canon(value): return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def sha(data): return hashlib.sha256(data).hexdigest()
def blob(data): return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
AUTH_KEYS=sorted(['source_requests','route_executions','source_admissions','field_terminalizations','matrix_updates','row_state_mutations','row_terminalizations','class_closed','cumulative_ledger_effect','publication_effect','adoption_effect','graph_effect','outside_human_dependency'])
def authority(value):
    assert sorted(value)==AUTH_KEYS
    assert value['source_requests']==value['route_executions']==value['source_admissions']==0
    assert value['field_terminalizations']==value['matrix_updates']==value['row_state_mutations']==value['row_terminalizations']==0
    assert value['class_closed'] is False and value['cumulative_ledger_effect']=='none'
    assert value['publication_effect']==value['adoption_effect']==value['graph_effect']=='none'
    assert value['outside_human_dependency'] is False

raw=MATRIX.read_bytes()
assert len(raw)==495400 and sha(raw)=='1878270c1c34d1a96b28eb0ee26eff5b1b3b6c8d74a56026c293544c7925d824' and blob(raw)=='c25a1ad8fdfe82f70f1ff71e61da6796be94c737'
matrix=json.loads(raw)
expected_before={
 'materialized_cells':450,'terminal_cells':228,'still_open_cells':222,
 'terminal_substantive_cells':118,'still_open_substantive_cells':182,
 'evidence_complete_cells':197,'observed_cells':17,'not_publicly_recovered_cells':14,
 'row_terminal_state_cells_terminal':10,'row_terminal_state_cells_open':40,
 'terminal_units':10,'class_closed':False}
for key,value in expected_before.items(): assert matrix['counts'][key]==value
nd=next(row for row in matrix['rows'] if row['unit_id']=='US-STATE-ND')
assert sha(canon(nd))=='0f3ba29ee5c7354249f89c96fc38c21b55341fc9fdad9b5919ecdb9243c4929e'
assert (nd['row_state'],nd['terminal_fields'],nd['open_fields'])==('still_open',8,1)
fields=['canonical_state_identity', 'operative_state_implementation_authority_and_version', 'implementation_effective_date_or_typed_gap', 'abawd_or_work_requirement_waiver_state_and_governing_period', 'discretionary_exemption_authority_and_reported_state_practice', 'fitness_for_work_or_eligibility_screening_rule', 'verification_evidence_and_staff_discretion_surface', 'source_identities_and_exact_custody']
assert [cell['field_id'] for cell in nd['cells'][:8]]==fields
assert all(cell['terminal'] for cell in nd['cells'][:8])
assert [cell['state'] for cell in nd['cells'][:8]].count('evidence_complete')==7
assert [cell['state'] for cell in nd['cells'][:8]].count('not_publicly_recovered')==1
current=nd['cells'][8]
assert current['field_id']=='field_and_row_terminal_state'
assert sha(canon(current))=='6a4c7d204c6c99a89f3c121065860806668c5da850f44c67fe42b4dc84b1b5c3'
assert current=={'field_ordinal':9,'field_id':'field_and_row_terminal_state','state':'still_open','terminal':False,'value':None,'evidence_source_ids':[],'typed_gap':'row_remains_open_because_2_required_cells_are_unresolved','authority_effect':'none'}

custody=load(VROOT/'current-row-custody.json')
validation=load(VROOT/'row-state-validation.json')
protocol=load(VROOT/'validated-row-state-protocol.json')
summary=load(VROOT/'summary.json')
manifest=load(VROOT/'product-manifest.json')
for obj in [custody,validation,protocol,summary,manifest]: authority(obj['authority_boundary'])
assert custody['north_dakota']['row_sha256']=='0f3ba29ee5c7354249f89c96fc38c21b55341fc9fdad9b5919ecdb9243c4929e'
assert custody['north_dakota']['row_state_cell_sha256']=='6a4c7d204c6c99a89f3c121065860806668c5da850f44c67fe42b4dc84b1b5c3'
assert custody['north_dakota']['all_eight_substantive_fields_terminal'] is True
proposed=validation['proposed_row_state_cell']
assert sorted(proposed)==sorted(['field_ordinal','field_id','state','terminal','value','evidence_source_ids','typed_gap','authority_effect'])
assert proposed['field_ordinal']==9 and proposed['field_id']=='field_and_row_terminal_state'
assert proposed['state']=='evidence_complete' and proposed['terminal'] is True and proposed['typed_gap'] is None
assert proposed['evidence_source_ids']==['RD04-ND-ROW-STATE-RECONCILIATION-V1']
assert proposed['authority_effect']=='row_level_fixed_public_record_obligation_terminal_only'
value=proposed['value']
assert value['terminal_classification']=='terminal_fixed_public_record_obligation_complete'
assert value['row_scope']=='fixed_public_record_obligation_for_one_state'
assert value['completed_evidence_fields']==8 and value['terminal_evidence_field_ids']==fields
assert value['terminal_evidence_state_counts']=={'evidence_complete':7,'observed':0,'not_publicly_recovered':1}
assert value['predecessor_row_canonical_sha256']=='0f3ba29ee5c7354249f89c96fc38c21b55341fc9fdad9b5919ecdb9243c4929e'
assert value['completion_rule']=='all_eight_declared_state_evidence_fields_are_terminal_under_exact_source_or_typed_gap_custody'
assert value['class_effect']==value['cumulative_ledger_effect']=='none'
assert len(value['limitations'])==4 and len(value['prohibited_inferences'])==9
assert 'do_not_close_rd04_c02_or_wave03_from_eleven_terminal_rows' in value['prohibited_inferences']
assert sha(canon(proposed))=='f0c6fe75d1720c1a6cf8b90fd44b96bc96fcb0656fc70808c5439d514d30217c'

projected=copy.deepcopy(matrix)
after=next(row for row in projected['rows'] if row['unit_id']=='US-STATE-ND')
after['row_state']='terminal'; after['terminal_fields']=9; after['open_fields']=0; after['cells'][8]=copy.deepcopy(proposed)
counts=projected['counts']
counts.update({
 'evidence_complete_cells':198,'still_open_cells':221,'terminal_cells':229,
 'row_terminal_state_cells_terminal':11,'row_terminal_state_cells_open':39,'terminal_units':11,
 'postpromotion_nd_current_public_record_gap_row_state_candidate_cells':1,
 'newly_terminalized_postpromotion_nd_current_public_record_gap_row_state_cells':1})
projected_raw=(json.dumps(projected,indent=2,ensure_ascii=False)+'\n').encode()
assert len(projected_raw)==498007
assert sha(projected_raw)=='ba02d60698de8ac1fdb64cad216bbbf7412687ade49c56a6604fafe804924c0a' and blob(projected_raw)=='c8554fd331060be3b234debc21f68e6950823c4d'
assert sha(canon(after))=='82ab2d57298f6f80f5ec8c20dd3194988ca24a0d57ace533d580d83b4b5111fd'
assert all(a==b for a,b in zip([r for r in matrix['rows'] if r['unit_id']!='US-STATE-ND'],[r for r in projected['rows'] if r['unit_id']!='US-STATE-ND']))
assert sha(b''.join(canon(r)+b'\n' for r in matrix['rows'] if r['unit_id']!='US-STATE-ND'))=='e9507cce90ced2d303b6d464968c4eeed630f2f058ba4302980c34f32f3e1105'

assert validation['validation_result']=={'state': 'validated_exact_current_row_state', 'all_eight_substantive_fields_terminal': True, 'remaining_open_cell_count': 1, 'remaining_open_field_id': 'field_and_row_terminal_state', 'row_state_transition_mechanically_admissible': True, 'separate_promotion_product_authorized': True, 'promotion_executed_here': False}
assert validation['proposed_row_state_cell_sha256']=='f0c6fe75d1720c1a6cf8b90fd44b96bc96fcb0656fc70808c5439d514d30217c'
assert validation['projected_row']=={'row_sha256': '82ab2d57298f6f80f5ec8c20dd3194988ca24a0d57ace533d580d83b4b5111fd', 'row_state': 'terminal', 'terminal_fields': 9, 'open_fields': 0}
assert validation['projected_matrix']['sha256']=='ba02d60698de8ac1fdb64cad216bbbf7412687ade49c56a6604fafe804924c0a'
assert validation['projected_effects']=={'field_terminalizations': 0, 'matrix_updates': 1, 'row_state_mutations': 1, 'row_terminalizations': 1, 'class_closed': False, 'cumulative_ledger_effect': 'none', 'publication_effect': 'none', 'adoption_effect': 'none', 'graph_effect': 'none', 'outside_human_dependency': False}
assert protocol['validation_state']=='validated_exact_current_row_state'
assert protocol['canonical_validation_merge_required_before_promotion'] is True
assert protocol['separate_promotion_product_authorized'] is True
assert (protocol['maximum_field_terminalizations'],protocol['maximum_matrix_updates'],protocol['maximum_row_state_mutations'],protocol['maximum_row_terminalizations'])==(0,1,1,1)
assert protocol['class_closure_authorized'] is False and protocol['promotion_executed_here'] is False
assert summary['state']=='validated_exact_current_row_state_requires_separate_promotion' and summary['promotion_executed_here'] is False

paths=[os.environ['WORKFLOW_PATH'],os.environ['VALIDATION_ROOT']+'/current-row-custody.json',os.environ['VALIDATION_ROOT']+'/row-state-validation.json',os.environ['VALIDATION_ROOT']+'/validated-row-state-protocol.json',os.environ['VALIDATION_ROOT']+'/summary.json',os.environ['VALIDATION_ROOT']+'/product-manifest.json',os.environ['VALIDATOR_PATH']]
assert manifest['permanent_path_count']==7 and manifest['permanent_paths']==paths and manifest['addition_only'] is True
assert manifest['qualification_workflow']=={'path':os.environ['WORKFLOW_PATH']}
script=(ROOT/os.environ['VALIDATOR_PATH']).read_bytes()
assert manifest['validator_script']=={'path':os.environ['VALIDATOR_PATH'],'bytes':len(script),'sha256':sha(script),'git_blob':blob(script)}
payload=[]
assert len(manifest['payload_files'])==4
for rec in manifest['payload_files']:
    data=(ROOT/rec['path']).read_bytes()
    assert rec=={'path':rec['path'],'bytes':len(data),'sha256':sha(data),'git_blob':blob(data)}
    payload.append(f"{rec['path']}\0{rec['sha256']}\0{rec['bytes']}\n")
assert sha(''.join(sorted(payload)).encode())==manifest['payload_combined_sha256']

receipt={
 'schema_version':'ssc-rd04-nd-row-state-reconciliation-hosted-validation@1',
 'state':'validated_exact_current_row_state_requires_separate_promotion',
 'canonical_parent':'4eaa66d7a0f025e0c4ec797e9925634a22d9e49e','head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
 'current_row_sha256':'0f3ba29ee5c7354249f89c96fc38c21b55341fc9fdad9b5919ecdb9243c4929e','current_row_state_cell_sha256':'6a4c7d204c6c99a89f3c121065860806668c5da850f44c67fe42b4dc84b1b5c3',
 'proposed_row_state_cell_sha256':'f0c6fe75d1720c1a6cf8b90fd44b96bc96fcb0656fc70808c5439d514d30217c','projected_row_sha256':'82ab2d57298f6f80f5ec8c20dd3194988ca24a0d57ace533d580d83b4b5111fd',
 'projected_matrix_sha256':'ba02d60698de8ac1fdb64cad216bbbf7412687ade49c56a6604fafe804924c0a','validated_candidates':1,'rejected_candidates':0,
 'promotion_executed_here':False,'projected_matrix_updates':1,'projected_row_state_mutations':1,'projected_row_terminalizations':1,
 'field_terminalizations':0,'matrix_updates':0,'row_state_mutations':0,'row_terminalizations':0,
 'class_closed':False,'outside_human_dependency':False}
print(json.dumps(receipt,indent=2,sort_keys=True))
