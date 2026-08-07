#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json,shutil,tempfile,zipfile
from pathlib import Path
D=Path('data/intake/schoolhouse-domain-rdap-census-v1');S=D/'sealed-source-artifact.zip';Q=D/'sealed-qualification-artifact.zip';C=D/'source-custody.json';M=D/'product-manifest.json';DOC=Path('docs/milestones/schoolhouse-domain-rdap-census-v1.md');TOOL=Path('tools/validate-schoolhouse-domain-rdap-census-custody.py');PATHS=[S,Q,C,M,DOC,TOOL]
P='681ae0d41bed04d068836ee9d746fe7701d234cb';T='9ee392609c4c6bcce2806f9b8a1e514333c1428e';SS='6df4bfb8a027a35e6fe6ae98bb072feb27646c39e4907152627554563c2e1e0a';QS='e8bb86533a80d03338fee006cff49a99b12065d77280173e67698f3172d82dc5'
SM=sorted(['RUNNER-CUSTODY','RUNNER-OUTPUT.log','RUNNER_EXIT_CODE','SHA256SUMS','artifact-manifest.json','rdap-domain.json','registrant-organization-candidates.jsonl','route-policy.json','route-receipts.jsonl','source-receipt.json','summary.json']);QM=sorted(['SHA256SUMS','artifact-manifest.json','corrected-rdap-domain.json','corrected-summary.json','qualification.json'])
A={'promotes_to':'candidate_only','identities_admitted':0,'relationships_admitted':0,'negative_existence_claims':0,'owner_or_operator_admissions':0,'outside_human_dependency':False,'publication_effect':'none','adoption_effect':'none','graph_effect':'none','public_schoolhouse_legal_identity':'unresolved'}
R={'registrant_person_name_values_retained':0,'address_rows_retained':0,'postal_code_rows_retained':0,'telephone_or_fax_values_retained':0,'email_values_retained':0,'contact_uri_values_retained':0,'raw_bootstrap_json_retained':False,'raw_rdap_json_retained':False,'browser_state_or_cookie_rows_retained':0,'private_support_rows':0}
def h(b):return hashlib.sha256(b).hexdigest()
def canon(v):return (json.dumps(v,indent=2,sort_keys=True,ensure_ascii=False)+'\n').encode()
def custody():return {'schema_version':'schoolhouse-domain-rdap-census-custody@1','state':'terminal_exact_domain_rdap_no_public_registrant_organization_candidate_semantic_correction','canonical_parent_commit':P,'canonical_parent_tree':T,'issue':1335,'source':{'pr':1336,'head':'2774e386f5603d89238e22e29d127fef4ae269a0','workflow_run':31151863299,'workflow_conclusion':'success','artifact_id':8983593982,'artifact_name':'schoolhouse-domain-rdap-census-v1','artifact_bytes':5698,'artifact_digest':'sha256:'+SS,'release_check_run':31151863163,'no_magic_human_run':31151863190},'qualification':{'pr':1338,'head':'2e839cb1051493a76028913608bb3a92791fd3d5','workflow_run':31152335987,'workflow_conclusion':'success','artifact_id':8983780025,'artifact_name':'schoolhouse-domain-rdap-census-qualification-v1','artifact_bytes':3754,'artifact_digest':'sha256:'+QS,'release_check_run':31152335955,'no_magic_human_run':31152335919},'counts':{'fixed_routes':2,'terminal_routes':2,'request_attempts':2,'response_bytes':78739,'domain_objects_exact':1,'registrant_entities':0,'public_registrant_organization_values':0,'domain_registrant_organization_candidates':0,'registrar_entities':1,'source_projection_defects':1,'semantic_corrections':1},'transport':{'iana_bootstrap_url':'https://data.iana.org/rdap/dns.json','selected_rdap_service_base':'https://rdap.identitydigital.services/rdap/','exact_domain_request_url':'https://rdap.identitydigital.services/rdap/domain/school.house','bootstrap_response_bytes':71095,'domain_response_bytes':7644},'terminal_observation':{'object_class_domain':True,'ldh_name_exact':True,'unicode_name_exact':True,'registrant_entity_count':0,'registrar_entity_count':1,'public_registrant_organization_values_retained':0,'domain_registrant_organization_candidate_rows':0,'redaction_present':True,'registrar_name_values':['NameCheap, Inc.'],'nameservers':['ns1.siteground.net','ns2.siteground.net'],'status_values':['client transfer prohibited'],'dnssec_delegation_signed':False},'retention':R,'authority':A,'interpretation':{'registrar_is_not_registrant_identity':True,'nameserver_or_domain_handle_is_not_registrant_identity':True,'redacted_or_absent_registrant_org_is_not_entity_absence':True,'zero_candidates_is_not_owner_or_legal_entity_absence':True,'no_registrant_entity_is_not_registrant_or_entity_absence':True,'identical_source_retry_authorized':False,'candidate_successor_authorized':False}}
def manifest():return {'schema_version':'schoolhouse-domain-rdap-census-product-manifest@1','permanent_paths':[str(x) for x in PATHS],'permanent_path_count':6,'sealed_source':{'path':str(S),'bytes':5698,'sha256':SS,'members':11,'internally_hashed_files':7},'sealed_qualification':{'path':str(Q),'bytes':3754,'sha256':QS,'members':5,'internally_hashed_files':4},'terminal_result':{'fixed_routes':2,'terminal_routes':2,'request_attempts':2,'response_bytes':78739,'domain_objects_exact':1,'registrant_entities':0,'public_registrant_organization_values':0,'domain_registrant_organization_candidates':0,'registrar_entities':1,'source_projection_defects':1,'semantic_corrections':1,'redaction_present':True},'authority':A}
def milestone():return '''# School.House exact-domain RDAP custody

The `.house` RDAP authority was resolved through the IANA DNS bootstrap object, then the registry service returned an HTTP 200 RDAP domain object for exactly `school.house`. The source run retained no raw response or contact material. A request-free qualifier authenticated the source artifact and corrected one privacy-minimized projection field: the conformance vector contains `redacted`, so `redaction_present` is `true`.

```text
fixed / terminal routes:                     2 / 2
request attempts / response bytes:       2 / 78,739
exact domain object:                         true
registrant entities:                            0
registrar entities:                             1
public registrant org values:                   0
registrant-organization candidates:             0
source projection defects / corrections:      1 / 1
identities / relationships admitted:          0 / 0
owner/operator admissions:                       0
negative-existence claims:                       0
outside-human dependency:                    false
publication / adoption / graph: none / none / none
public School.House legal identity:      unresolved
```

The registry object identifies `NameCheap, Inc.` only in the registrar role and lists `ns1.siteground.net` and `ns2.siteground.net` as nameservers. Those values are not registrant, owner, operator, governance, control, or legal-entity evidence. No public `registrant` entity or public registrant-organization value was present in the privacy-minimized response, but redaction or absence is not evidence that no registrant or legal entity exists.

No candidate successor and no identical source replay are authorized absent a material IANA bootstrap, provider condition, domain-object version, or canonical-predecessor change.
'''
def write(root):(root/C).parent.mkdir(parents=True,exist_ok=True);(root/DOC).parent.mkdir(parents=True,exist_ok=True);(root/C).write_bytes(canon(custody()));(root/M).write_bytes(canon(manifest()));(root/DOC).write_text(milestone())
def op(root,rel,size,digest,members):
 b=(root/rel).read_bytes();assert len(b)==size and h(b)==digest;t=Path(tempfile.mkdtemp(prefix='rdap-custody-'))
 with zipfile.ZipFile(root/rel) as z:assert z.testzip() is None and sorted(z.namelist())==members;z.extractall(t)
 return t
def sums(t,n):
 rows=(t/'SHA256SUMS').read_text().splitlines();assert len(rows)==n
 for row in rows:d,name=row.split('  ',1);assert '/' not in name and h((t/name).read_bytes())==d
def j(t,n):return json.loads((t/n).read_text())
def jl(t,n):return [json.loads(x) for x in (t/n).read_text().splitlines() if x.strip()]
def validate(root):
 assert j(root,C)==custody() and j(root,M)==manifest() and (root/DOC).read_text()==milestone();s=op(root,S,5698,SS,SM);q=op(root,Q,3754,QS,QM)
 try:
  assert (s/'RUNNER_EXIT_CODE').read_text().strip()=='0';sums(s,7);sums(q,4);assert (s/'registrant-organization-candidates.jsonl').read_bytes()==b''
  su=j(s,'summary.json');d=j(s,'rdap-domain.json');p=j(s,'route-policy.json');r=j(s,'source-receipt.json');am=j(s,'artifact-manifest.json');rr=jl(s,'route-receipts.jsonl');cs=j(q,'corrected-summary.json');cd=j(q,'corrected-rdap-domain.json');qq=j(q,'qualification.json');qm=j(q,'artifact-manifest.json')
  assert su['state']=='terminal_exact_domain_rdap_no_public_registrant_organization_candidate' and su['fixed_routes']==su['terminal_routes']==2 and su['request_attempts']==2 and su['object_class_domain'] and su['ldh_name_exact'] and su['registrant_entity_count']==su['public_registrant_organization_values_retained']==su['domain_registrant_organization_candidate_rows']==0 and su['redaction_present'] is False and su['retention']==R and su['authority']==A
  assert su['interpretation']=={'candidate_requires_separate_adjudication':True,'identical_source_retry_authorized':False,'nameserver_or_domain_handle_is_not_registrant_identity':True,'redacted_or_absent_registrant_org_is_not_entity_absence':True,'registrar_is_not_registrant_identity':True}
  assert d['domain']=='school.house' and d['object_class_name']=='domain' and d['object_class_domain'] and d['ldh_name_exact'] and d['unicode_name_exact'] and d['registrant_entity_count']==0 and d['registrar_entity_count']==1 and d['entity_role_counts']=={'abuse':1,'registrar':1} and d['registrar_name_values']==['NameCheap, Inc.'] and d['registrar_public_ids']==[{'identifier':'1068','type':'IANA Registrar ID'}] and d['nameservers']==['ns1.siteground.net','ns2.siteground.net'] and d['statuses']==['client transfer prohibited'] and d['secure_dns']['delegation_signed'] is False and 'redacted' in d['rdap_conformance'] and d['redaction_present'] is False
  assert all(d[k]==0 for k in ['registrant_person_name_values_retained','address_rows_retained','postal_code_rows_retained','telephone_or_fax_values_retained','email_values_retained','contact_uri_values_retained','private_support_rows','public_registrant_organization_values_retained','domain_registrant_organization_candidate_rows']) and d['raw_bootstrap_response_retained'] is False and d['raw_rdap_response_retained'] is False and d['registrant_contact_property_names_present']==d['registrant_vcard_property_names']==[]
  assert p['fixed_routes']==['https://data.iana.org/rdap/dns.json','<bootstrap-selected-https-base>/domain/school.house'] and p['maximum_attempts_per_route']==2 and p['maximum_total_requests']==4 and p['maximum_response_bytes_per_route']==5242880 and p['parallel_workers']==1 and p['methods']==['GET'] and p['query_submissions']==p['form_submissions']==p['result_spawned_requests']==0 and p['off_host_redirects_allowed'] is False and p['raw_responses_retained'] is False and p['authority']==A
  assert r['issue']==1335 and r['canonical_parent_commit']==P and r['canonical_parent_tree']==T and r['fixed_routes']==r['terminal_routes']==2 and r['request_attempts']==2 and r['response_bytes']==78739 and r['bootstrap_url']=='https://data.iana.org/rdap/dns.json' and r['selected_rdap_service_base']=='https://rdap.identitydigital.services/rdap/' and r['domain_request_url']=='https://rdap.identitydigital.services/rdap/domain/school.house' and r['retention']==R and r['authority']==A
  er={'iana_dns_rdap_bootstrap':('data.iana.org','https://data.iana.org/rdap/dns.json',71095,'fb297362ea4d0b627bd92fe18dc251a3af594fa60b0b7da58ff708181e3d7bb5'),'school_house_domain_rdap':('rdap.identitydigital.services','https://rdap.identitydigital.services/rdap/domain/school.house',7644,'28c5b660c03493f9edef960b28255576e675c9b0dddb5a7c7ba5bfd5ce6f1588')};assert len(rr)==2
  for x in rr:host,url,n,digest=er[x['route_id']];assert x['allowed_host']==host and x['request_url']==x['final_url']==url and x['method']=='GET' and x['attempt']==1 and x['status']==200 and x['state']=='http_success' and x['response_bytes']==n and x['response_sha256']==digest
  assert am['combined_sha256']=='57877b4678c40d0144adc6f2c61bcd692d5d230e4254c30b31d31ca2719a2f05' and len(am['files'])==6
  assert qq['status']=='complete' and qq['issue']==1335 and qq['canonical_parent_commit']==P and qq['canonical_parent_tree']==T and qq['source_workflow_run']==31151863299 and qq['source_head']=='2774e386f5603d89238e22e29d127fef4ae269a0' and qq['source_artifact_id']==8983593982 and qq['source_artifact_digest']=='sha256:'+SS and qq['source_artifact_combined_sha256']==am['combined_sha256'] and qq['fixed_routes']==qq['terminal_routes']==2 and qq['request_attempts']==2 and qq['response_bytes']==78739 and qq['object_class_domain'] and qq['ldh_name_exact'] and qq['unicode_name_exact'] and qq['registrant_entity_count']==qq['public_registrant_organization_values_retained']==qq['domain_registrant_organization_candidate_rows']==0 and qq['registrar_entity_count']==1 and qq['source_projection_defects']==1 and qq['adversarial_refusals']==6 and qq['retention']==R and qq['authority']==A
  assert qq['semantic_corrections']==[{'basis':'rdap_conformance_contains_redacted','field':'redaction_present','qualified_value':True,'source_reacquisition_required':False,'source_value':False}] and qq['interpretation']=={'identical_source_retry_authorized':False,'no_registrant_entity_is_not_registrant_or_entity_absence':True,'redacted_conformance_is_redaction_presence':True,'registrar_is_not_registrant_identity':True,'zero_candidates_is_not_owner_or_legal_entity_absence':True}
  es=dict(su);es['redaction_present']=True;es['state']='terminal_exact_domain_rdap_no_public_registrant_organization_candidate_semantic_correction';ed=dict(d);ed['redaction_present']=True;ed['state']=es['state'];assert cs==es and cd==ed and qm['combined_sha256']=='25ed595945328aa9b0a9cca099ba4d818b0cca9d13c9c08a56f8e0ae26efb3a8' and len(qm['files'])==3
  return {'routes':2,'requests':2,'candidates':0,'corrections':1}
 finally:shutil.rmtree(s,ignore_errors=True);shutil.rmtree(q,ignore_errors=True)
def copy(root,f):
 for rel in PATHS:dst=f/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/rel,dst)
def selftest(root):
 validate(root);refused=0
 def reject(mut):
  nonlocal refused
  with tempfile.TemporaryDirectory(prefix='rdap-fixture-') as td:
   f=Path(td);copy(root,f);mut(f)
   try:validate(f)
   except Exception:refused+=1
   else:raise AssertionError('mutation accepted')
 def flip(rel):
  def m(f):p=f/rel;b=bytearray(p.read_bytes());b[min(50,len(b)-1)]^=1;p.write_bytes(b)
  return m
 def mj(rel,keys,val):
  def m(f):
   p=f/rel;x=json.loads(p.read_text());y=x
   for k in keys[:-1]:y=y[k]
   y[keys[-1]]=val;p.write_bytes(canon(x))
  return m
 reject(flip(S));reject(flip(Q));reject(mj(C,['authority','identities_admitted'],1));reject(mj(C,['interpretation','candidate_successor_authorized'],True));reject(mj(M,['permanent_path_count'],7))
 def dm(f):p=f/DOC;p.write_text(p.read_text().replace('redaction or absence is not evidence that no registrant or legal entity exists','redaction or absence proves that no registrant or legal entity exists'))
 reject(dm);assert refused==6;return refused
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--write',action='store_true');ap.add_argument('--check',action='store_true');ap.add_argument('--self-test',action='store_true');x=ap.parse_args();root=Path.cwd()
 if x.write:write(root)
 v=validate(root)
 if x.self_test:print(f'schoolhouse_domain_rdap_custody_adversarial_refusals={selftest(root)}')
 else:print('schoolhouse_domain_rdap_custody=pass routes={routes} requests={requests} candidates={candidates} corrections={corrections}'.format(**v))
if __name__=='__main__':main()
