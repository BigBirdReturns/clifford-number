#!/usr/bin/env python3
from __future__ import annotations
import copy, hashlib, json, os, pathlib, subprocess, sys
ROOT=pathlib.Path.cwd()
PRODUCT_ROOT=ROOT/os.environ['PRODUCT_ROOT']
MATRIX=ROOT/os.environ['MATRIX_PATH']
VALIDATION_ROOT=ROOT/os.environ['VALIDATION_ROOT']

def load(path): return json.loads(path.read_text(encoding='utf-8'))
def canon(value): return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def jbytes(value): return (json.dumps(value,indent=2,ensure_ascii=False)+'\n').encode()
def sha(data): return hashlib.sha256(data).hexdigest()
def blob(data): return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
AUTH={'source_requests':0,'route_executions':0,'source_admissions':0,'field_terminalizations':0,'matrix_updates':0,'row_state_mutations':0,'row_terminalizations':0,'class_closed':False,'cumulative_ledger_effect':'none','publication_effect':'none','adoption_effect':'none','graph_effect':'none','outside_human_dependency':False}
PARENT='de81b27c48b0ffec0db37b55e1b6eb9b58290524'; PARENT_TREE='919775a3acbc19ff5a70de98409c02e2960f91f9'; PRODUCT='fa956db549bc5b023b1885dea03d2f4ebc404f46'
RAW_ID=(498047,'9f85cbff7eba6d66f84508d262c408d580e1d55e95568d3265f10d1c1fa416ad','4911d717a072493f80a3631598799070f08f2a91')
REC_ID=(498068,'00eccb409909c07bb66a6ef5dd20b35215ed4da047cd6a4f581576d1056d7037','0da5d8d7a730836da60c86c0fb2f55f18c8af26d')
POINTERS=['/current_result/terminal_cells','/current_result/still_open_cells','/current_result/row_terminal_state_cells_terminal','/current_result/row_terminal_state_cells_open','/current_result/terminal_units','/current_result/terminal_unit_ids']
TERMINAL_IDS=['US-STATE-AR','US-STATE-CA','US-STATE-GA','US-STATE-MD','US-STATE-NC','US-STATE-ND','US-STATE-PA','US-STATE-RI','US-STATE-SD','US-STATE-WA','US-STATE-WV']

def exact_keys(value, keys): assert isinstance(value,dict) and set(value)==set(keys)
def authority(value): assert value==AUTH and set(value)==set(AUTH)
def diff_paths(a,b,p=''):
    out=[]
    if type(a)!=type(b): return [p or '/']
    if isinstance(a,dict):
        for k in sorted(set(a)|set(b)):
            q=f'{p}/{k}'
            if k not in a or k not in b: out.append(q)
            else: out.extend(diff_paths(a[k],b[k],q))
    elif isinstance(a,list):
        if a!=b: out.append(p or '/')
    elif a!=b: out.append(p or '/')
    return out

def projections(matrix, proposed):
    raw=copy.deepcopy(matrix)
    nd=next(r for r in raw['rows'] if r['unit_id']=='US-STATE-ND')
    nd['row_state']='terminal_fixed_public_record_obligation_complete'; nd['terminal_fields']=9; nd['open_fields']=0; nd['cells'][8]=copy.deepcopy(proposed)
    raw['counts'].update({'evidence_complete_cells':198,'still_open_cells':221,'terminal_cells':229,'row_terminal_state_cells_terminal':11,'row_terminal_state_cells_open':39,'terminal_units':11,'postpromotion_nd_current_public_record_gap_row_state_candidate_cells':1,'newly_terminalized_postpromotion_nd_current_public_record_gap_row_state_cells':1})
    reconciled=copy.deepcopy(raw)
    reconciled['current_result'].update({'terminal_cells':'229/450','still_open_cells':'221/450','row_terminal_state_cells_terminal':11,'row_terminal_state_cells_open':39,'terminal_units':11,'terminal_unit_ids':TERMINAL_IDS})
    return raw,reconciled

def validate(matrix=None,custody=None,reconciliation=None,protocol=None,summary=None,manifest=None):
    matrix=matrix or load(MATRIX); custody=custody or load(PRODUCT_ROOT/'current-validation-custody.json'); reconciliation=reconciliation or load(PRODUCT_ROOT/'projection-reconciliation.json'); protocol=protocol or load(PRODUCT_ROOT/'validated-promotion-protocol.json'); summary=summary or load(PRODUCT_ROOT/'summary.json'); manifest=manifest or load(PRODUCT_ROOT/'product-manifest.json')
    matrix_bytes=MATRIX.read_bytes(); assert (len(matrix_bytes),sha(matrix_bytes),blob(matrix_bytes))==(495400,'1878270c1c34d1a96b28eb0ee26eff5b1b3b6c8d74a56026c293544c7925d824','c25a1ad8fdfe82f70f1ff71e61da6796be94c737')
    validation_path=VALIDATION_ROOT/'row-state-validation.json'; protocol_path=VALIDATION_ROOT/'validated-row-state-protocol.json'
    vb=validation_path.read_bytes(); pb=protocol_path.read_bytes(); assert (len(vb),sha(vb),blob(vb))==(6155,'49a971348085602bc01c5a1b2d9d1032207e060e4b364690a75c3d3e1d3a198d','6c10c4a87d3fd178f326667a9d8ef8e59bf65c5c'); assert (len(pb),sha(pb),blob(pb))==(2443,'a10aafa8b542dc93c917a0fa2c66337828ffe9e6067bcff20bf8f5e239300256','915cc884848126a8ec49b774c541ab5bebfff5f4')
    validation=json.loads(vb); prior_protocol=json.loads(pb); proposed=validation['proposed_row_state_cell']
    assert sha(canon(proposed))=='f0c6fe75d1720c1a6cf8b90fd44b96bc96fcb0656fc70808c5439d514d30217c'; assert prior_protocol['target']['projected_matrix_sha256']=='9f85cbff7eba6d66f84508d262c408d580e1d55e95568d3265f10d1c1fa416ad'
    assert matrix['counts']['terminal_cells']==228 and matrix['counts']['still_open_cells']==222 and matrix['counts']['terminal_units']==10 and matrix['counts']['class_closed'] is False
    nd0=next(r for r in matrix['rows'] if r['unit_id']=='US-STATE-ND'); assert sha(canon(nd0))=='0f3ba29ee5c7354249f89c96fc38c21b55341fc9fdad9b5919ecdb9243c4929e' and sha(canon(nd0['cells'][8]))=='6a4c7d204c6c99a89f3c121065860806668c5da850f44c67fe42b4dc84b1b5c3'
    raw,rec=projections(matrix,proposed); rawb=jbytes(raw); recb=jbytes(rec); assert (len(rawb),sha(rawb),blob(rawb))==RAW_ID; assert (len(recb),sha(recb),blob(recb))==REC_ID
    nd=next(r for r in rec['rows'] if r['unit_id']=='US-STATE-ND'); assert sha(canon(nd))=='f75ac04e5c8fc53304e897d918ee80057c580e2b8bbeeca979e9f92312f96f4b'
    non=[r for r in rec['rows'] if r['unit_id']!='US-STATE-ND']; assert sha(b''.join(canon(r)+b'\n' for r in non))=='e9507cce90ced2d303b6d464968c4eeed630f2f058ba4302980c34f32f3e1105'
    assert sorted(diff_paths(raw,rec))==sorted(POINTERS)
    assert raw['current_result']['terminal_cells']=='228/450' and raw['current_result']['terminal_units']==10 and 'US-STATE-ND' not in raw['current_result']['terminal_unit_ids']
    assert rec['counts']['terminal_cells']==229 and rec['current_result']['terminal_cells']=='229/450' and rec['counts']['terminal_units']==rec['current_result']['terminal_units']==11 and rec['current_result']['terminal_unit_ids']==TERMINAL_IDS
    assert rec['counts']['terminal_substantive_cells']==118 and rec['counts']['still_open_substantive_cells']==182 and rec['counts']['class_closed'] is False and rec['current_result']['class_closed'] is False
    for obj in [custody,reconciliation,protocol,summary,manifest]: authority(obj['authority_boundary'])
    assert custody['canonical_validation_merge']==PARENT and custody['canonical_validation_tree']==PARENT_TREE and custody['validation_product']['commit']==PRODUCT and custody['validation_product']['artifact_id']==9050575596
    assert reconciliation['canonical_validation_projection']=={'bytes':498047,'sha256':RAW_ID[1],'git_blob':RAW_ID[2],'row_cell_and_counts_projection_valid':True,'current_result_consistent':False}
    assert reconciliation['target']=={'unit_id':'US-STATE-ND','field_id':'field_and_row_terminal_state','current_cell_sha256':'6a4c7d204c6c99a89f3c121065860806668c5da850f44c67fe42b4dc84b1b5c3','proposed_cell_sha256':'f0c6fe75d1720c1a6cf8b90fd44b96bc96fcb0656fc70808c5439d514d30217c','current_row_sha256':'0f3ba29ee5c7354249f89c96fc38c21b55341fc9fdad9b5919ecdb9243c4929e','projected_row_sha256':'f75ac04e5c8fc53304e897d918ee80057c580e2b8bbeeca979e9f92312f96f4b'}
    assert reconciliation['unchanged_custody']=={'proposed_row_state_cell_sha256':'f0c6fe75d1720c1a6cf8b90fd44b96bc96fcb0656fc70808c5439d514d30217c','projected_north_dakota_row_sha256':'f75ac04e5c8fc53304e897d918ee80057c580e2b8bbeeca979e9f92312f96f4b','forty_nine_non_target_rows_sha256':'e9507cce90ced2d303b6d464968c4eeed630f2f058ba4302980c34f32f3e1105','terminal_substantive_cells':118,'still_open_substantive_cells':182}
    assert reconciliation['observed_inconsistency']['stale_json_pointers']==POINTERS and reconciliation['reconciled_semantic_projection']['sha256']==REC_ID[1] and reconciliation['reconciled_semantic_projection']['git_blob']==REC_ID[2]
    assert reconciliation['later_promotion_envelope']['rows_counts_and_current_result_must_equal_reconciled_semantic_projection'] is True and reconciliation['later_promotion_envelope']['final_promoted_matrix_identity_must_be_bound_by_the_separate_product'] is True
    assert protocol['canonical_validation_merge']==PARENT and protocol['validation_product_commit']==PRODUCT and protocol['required_semantic_projection']=={'bytes':REC_ID[0],'sha256':REC_ID[1],'git_blob':REC_ID[2]} and protocol['promotion_executed_here'] is False and protocol['separate_promotion_product_authorized'] is True
    assert protocol['maximum_field_terminalizations']==0 and protocol['maximum_matrix_updates']==1 and protocol['maximum_row_state_mutations']==1 and protocol['maximum_row_terminalizations']==1 and protocol['class_closure_authorized'] is False and protocol['source_requests_authorized']==0 and protocol['route_executions_authorized']==0 and protocol['cumulative_ledger_effect_authorized'] is False
    assert summary['canonical_validation_projection']['current_result_consistent'] is False and summary['reconciled_semantic_projection']['current_result_consistent'] is True and summary['promotion_executed_here'] is False
    expected=['.github/workflows/status-sovereignty-rd-wave03-rd04-nd-row-state-projection-reconciliation-v1.yml',f'{os.environ["PRODUCT_ROOT"]}/current-validation-custody.json',f'{os.environ["PRODUCT_ROOT"]}/projection-reconciliation.json',f'{os.environ["PRODUCT_ROOT"]}/validated-promotion-protocol.json',f'{os.environ["PRODUCT_ROOT"]}/summary.json',f'{os.environ["PRODUCT_ROOT"]}/product-manifest.json','tools/validate-status-sovereignty-rd-wave03-rd04-nd-row-state-projection-reconciliation-v1.py']
    assert manifest['permanent_path_count']==7 and manifest['hashed_file_count']==6 and manifest['permanent_paths']==expected and manifest['self_describing_manifest_excluded_from_combined_payload'] is True
    exact_keys(manifest,{'schema_version','permanent_path_count','hashed_file_count','self_describing_manifest_excluded_from_combined_payload','permanent_paths','hashed_files','combined_sha256','authority_boundary'})
    assert [x['path'] for x in manifest['hashed_files']]==[p for p in expected if not p.endswith('/product-manifest.json')]
    rows=[]
    for recm in manifest['hashed_files']:
        exact_keys(recm,{'path','bytes','sha256','git_blob'}); data=(ROOT/recm['path']).read_bytes(); assert recm=={'path':recm['path'],'bytes':len(data),'sha256':sha(data),'git_blob':blob(data)}; rows.append(f"{recm['path']}\0{recm['sha256']}\0{recm['bytes']}\n")
    assert sha(''.join(sorted(rows)).encode())==manifest['combined_sha256']
    return {'raw':raw,'reconciled':rec}

def adversarial():
    base_matrix=load(MATRIX); base_c=load(PRODUCT_ROOT/'current-validation-custody.json'); base_r=load(PRODUCT_ROOT/'projection-reconciliation.json'); base_p=load(PRODUCT_ROOT/'validated-promotion-protocol.json'); base_s=load(PRODUCT_ROOT/'summary.json'); base_m=load(PRODUCT_ROOT/'product-manifest.json')
    cases=[]
    def reject(name,mut):
        vals=[copy.deepcopy(base_matrix),copy.deepcopy(base_c),copy.deepcopy(base_r),copy.deepcopy(base_p),copy.deepcopy(base_s),copy.deepcopy(base_m)]; mut(*vals)
        try: validate(*vals)
        except (AssertionError,KeyError,TypeError,ValueError): cases.append(name); return
        raise AssertionError('accepted adversarial case '+name)
    reject('canonical raw projection admitted as final semantic projection',lambda m,c,r,p,s,man:r['reconciled_semantic_projection'].update({'bytes':RAW_ID[0],'sha256':RAW_ID[1],'git_blob':RAW_ID[2]}))
    reject('stale terminal result retained',lambda m,c,r,p,s,man:r['observed_inconsistency']['stale_json_pointers'].pop())
    reject('north dakota terminal id omitted',lambda m,c,r,p,s,man:p['required_semantic_projection'].update({'sha256':RAW_ID[1]}))
    reject('proposed cell identity changed',lambda m,c,r,p,s,man:r['target'].update({'proposed_cell_sha256':'0'*64}))
    reject('projected row identity changed',lambda m,c,r,p,s,man:r['target'].update({'projected_row_sha256':'0'*64}))
    reject('non target row custody changed',lambda m,c,r,p,s,man:r['unchanged_custody'].update({'forty_nine_non_target_rows_sha256':'0'*64}))
    reject('substantive count widened',lambda m,c,r,p,s,man:r['unchanged_custody'].update({'terminal_substantive_cells':119}))
    reject('field terminalization authorized',lambda m,c,r,p,s,man:p.update({'maximum_field_terminalizations':1}))
    reject('class closure authorized',lambda m,c,r,p,s,man:p.update({'class_closure_authorized':True}))
    reject('source request authorized',lambda m,c,r,p,s,man:p.update({'source_requests_authorized':1}))
    reject('executed matrix effect claimed',lambda m,c,r,p,s,man:r['authority_boundary'].update({'matrix_updates':1}))
    reject('outside human dependency claimed',lambda m,c,r,p,s,man:s['authority_boundary'].update({'outside_human_dependency':True}))
    reject('manifest path duplicated',lambda m,c,r,p,s,man:man['permanent_paths'].__setitem__(-1,man['permanent_paths'][0]))
    reject('manifest root widened',lambda m,c,r,p,s,man:man.update({'extra':True}))
    assert len(cases)==14
    print(json.dumps({'schema_version':'ssc-rd04-nd-row-state-projection-reconciliation-adversarial@1','refusals':len(cases),'cases':cases},indent=2,sort_keys=True))

if __name__=='__main__':
    if '--adversarial' in sys.argv: adversarial()
    else:
        validate()
        receipt={'schema_version':'ssc-rd04-nd-row-state-projection-reconciliation-hosted-validation@1','state':'validated_reconciled_semantic_projection_requires_separate_promotion','canonical_validation_merge':PARENT,'head':os.environ.get('PRODUCT_HEAD') or subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'canonical_validation_projection_sha256':RAW_ID[1],'reconciled_semantic_projection_sha256':REC_ID[1],'reconciled_semantic_projection_git_blob':REC_ID[2],'proposed_row_state_cell_sha256':'f0c6fe75d1720c1a6cf8b90fd44b96bc96fcb0656fc70808c5439d514d30217c','projected_row_sha256':'f75ac04e5c8fc53304e897d918ee80057c580e2b8bbeeca979e9f92312f96f4b','validated_reconciliations':1,'rejected_reconciliations':0,'promotion_executed_here':False,'field_terminalizations':0,'matrix_updates':0,'row_state_mutations':0,'row_terminalizations':0,'class_closed':False,'outside_human_dependency':False}
        print(json.dumps(receipt,indent=2,sort_keys=True))
