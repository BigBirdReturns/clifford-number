#!/usr/bin/env python3
"""Verify retained bytes and deterministic search projections, not legal conclusions."""
import copy, datetime, hashlib, html, io, json, pathlib, re, sys, zipfile
FILES={'manifest.json','projection.json','review.md','verify.py','sources.zip','SHA256SUMS'}
DOMAIN='http_payload_octets_before_content_decoding'
sha=lambda b:hashlib.sha256(b).hexdigest()
plain=lambda b:re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',b.decode('utf-8')))).strip()
def require(value,message):
    if not value: raise ValueError(message)
def check_query(query,start,end,count):
    require(query['timed_out'] is False and query['_shards']['failed']==0,'incomplete search execution')
    require(query['hits']['total']=={'value':count,'relation':'eq'},'total is not exact')
    require(len(query['hits']['hits'])==count and len({h['_id'] for h in query['hits']['hits']})==count,'search rows missing or duplicated')
    q=query['query']; require(q['from']==0 and q['size']==100,'pagination changed')
    expected={'must':[{'match_phrase':{'doc_text':'Intel'}},{'match_phrase':{'doc_text':'Department of Commerce'}}],'must_not':[],'should':[],'filter':[{'range':{'file_date':{'gte':start,'lte':end}}}]}
    require(q['query']=={'bool':expected},'terms, dates, CIK or form constraints changed')
def validate(m,p,a):
    require(m['object_class']=='bounded_holder_disclosure_coverage_and_keyword_screen','wrong object')
    require(m['authoring_base']=='0fc2fa718a8a2a49c22d7923f7cce2ee6ec8aa05','authoring base changed')
    require(m['preserved_stage_registry_blob']=='e8ff7438814f79309964b75805d5f945bd0bcbd8','registry binding changed')
    b=m['boundaries']; require(b['new_stage_receipts']==0 and b['new_realization_candidates_from_reviewed_matches']==0 and b['graph_effect']=='none','promotion asserted')
    require(all(v is False for k,v in b.items() if k not in {'new_stage_receipts','new_realization_candidates_from_reviewed_matches','graph_effect'}),'authority or coverage overclaim')
    sources=m['sources']; require(len(sources)==20 and len({s['source_id'] for s in sources})==20,'source count')
    expected={s[k] for s in sources for k in ('body_member','receipt_member')} | {f['member'] for f in m['initial_capture_failures']}
    require(len(expected)==44 and set(a)==expected,'archive membership changed')
    require(len(m['initial_capture_failures'])==4,'failure count changed')
    require(sum(s['body_bytes'] for s in sources)==m['body_bytes'],'total byte count')
    require(sum(s['status_code']==200 for s in sources)==m['http_successes']==18,'success count')
    require(sum(s['status_code']==403 for s in sources)==m['http_failures']==2,'failure count')
    for s in sources:
        raw=a[s['receipt_member']]; r=json.loads(raw); body=a[s['body_member']]
        require(sha(raw)==s['receipt_sha256'],'receipt checksum')
        require(sha(body)==s['body_sha256']==r['body_sha256'] and len(body)==s['body_bytes']==r['body_bytes'],'body mismatch')
        require(r['source_url']==r['final_url']==s['url'] and r['status_code']==s['status_code'],'source addressing or status')
        require(r['body_hash_domain']==s['body_hash_domain']==DOMAIN,'body domain')
        require(r['content_decoding_applied'] is False and r['normalization_applied'] is False,'body transformation')
        require(r['request_headers']['Accept-Encoding']=='identity' and r['redirect_policy']=='refuse','request capture policy')
        for field,header in [('derived_content_coding_chain','content-encoding'),('derived_transfer_coding_chain','transfer-encoding')]:
            values=[x.strip().lower() for k,v in r['response_headers'] if k.lower()==header for x in v.split(',')] or ['identity']
            require(s[field]==values,'coding interpretation drift')
        require(s['derived_content_coding_chain']==['identity'],'unhandled content encoding')
        require(s['started_at']==r['started_at'] and s['completed_at']==r['completed_at'],'timestamp mismatch')
        require(datetime.datetime.fromisoformat(r['started_at'])<=datetime.datetime.fromisoformat(r['completed_at']),'reversed acquisition time')
    for f in m['initial_capture_failures']:
        require(sha(a[f['member']])==f['sha256'] and json.loads(a[f['member']])==f['record'],'failure custody')
        require(f['record']['status']=='capture_failed' and f['record']['reason']=='body limit','initial failure classification')
    q=json.loads(a['sec-allfilers-intel-commerce-window-p1.body']); check_query(q,'2026-08-17','2026-09-04',12)
    c=json.loads(a['sec-query-known-positive-control.body']); check_query(c,'2026-01-23','2026-01-23',6)
    require('0000050863-26-000027:a01232026424b7.htm' in [h['_id'] for h in c['hits']['hits']],'known positive missing')
    require(p['query_executed']==q['query'] and p['query_total']==q['hits']['total'] and p['query_returned']==12,'query projection')
    require(p['positive_control_ids']==[h['_id'] for h in c['hits']['hits']],'control projection')
    require(len(p['documents'])==12,'document projection denominator')
    for i,(h,row) in enumerate(zip(q['hits']['hits'],p['documents']),1):
        require(row['result_id']==h['_id'] and row['date']==h['_source']['file_date'] and row['form']==h['_source']['form'] and row['filers']==h['_source']['display_names'],'hit metadata')
        require(row['source_id']==f'hit-{i:02d}'+('-expanded32' if i in (4,5,10,11) else ''),'capture selection')
        text=plain(a[row['source_id']+'.body']); matches=list(re.finditer(r'\bIntel\b|Department\s+of\s+Commerce',text,re.I))
        contexts=[{'term':v.group(),'start':max(0,v.start()-180),'end':min(len(text),v.end()+360),'text':text[max(0,v.start()-180):v.end()+360]} for v in matches]
        require(row['contexts']==contexts and row['match_count']==len(matches) and row['normalized_text_characters']==len(text),'context projection')
    require(p['matching_contexts']==sum(row['match_count'] for row in p['documents']),'context total')
    require('Company stock registry' in plain(a['sec-holder-basis-proxy-20260324.body']),'holder information basis missing')
    law=plain(a['exchange-act-3c-current.body'])
    require('Text contains those laws in effect on September 3, 2026' in law and '(c) Application to governmental departments or agencies' in law,'statute scope or vintage')
    require(m['acquisition']['financial_report_pdf_acquired'] is False and m['acquisition']['report_pdf_reviewed'] is False,'403 promoted to report evidence')
def main():
    root=pathlib.Path(__file__).resolve().parent
    require({f.name for f in root.iterdir()}==FILES,'packet file membership')
    sums={}
    for line in (root/'SHA256SUMS').read_text().splitlines():
        digest,name=line.split('  ',1); require(name not in sums,'duplicate checksum'); sums[name]=digest
    require(set(sums)==FILES-{'SHA256SUMS'},'checksum membership')
    for name,digest in sums.items(): require(sha((root/name).read_bytes())==digest,'file checksum: '+name)
    m=json.loads((root/'manifest.json').read_bytes()); pb=(root/'projection.json').read_bytes(); p=json.loads(pb); zb=(root/'sources.zip').read_bytes()
    require(sha(pb)==m['projection_sha256'] and sha(zb)==m['archive']['sha256'] and len(zb)==m['archive']['bytes'],'outer custody')
    with zipfile.ZipFile(io.BytesIO(zb)) as z:
        require(len(z.infolist())==44 and len(set(z.namelist()))==44 and m['archive']['members']==44,'archive denominator')
        require(sum(i.file_size for i in z.infolist())<128*1024*1024,'archive expansion limit')
        require(all('/' not in n and '\\' not in n and n not in ('.','..') for n in z.namelist()),'unsafe archive path')
        require(z.testzip() is None,'ZIP integrity'); a={n:z.read(n) for n in z.namelist()}
    validate(m,p,a); negative=0
    if '--self-test' in sys.argv:
        cases=[]
        aa=a.copy(); aa['exchange-act-3c-current.body']+=b' '; cases.append((m,p,aa))
        pp=copy.deepcopy(p); pp['documents']=[]; cases.append((m,pp,a))
        mm=copy.deepcopy(m); mm['boundaries']['government_nonoccurrence_proven']=True; cases.append((mm,p,a))
        pp=copy.deepcopy(p); pp['documents'][0]['contexts'][0]['text']='unsupported'; cases.append((m,pp,a))
        mm=copy.deepcopy(m); mm['sources'][0]['derived_content_coding_chain']=[]; cases.append((mm,p,a))
        mm=copy.deepcopy(m); aa=a.copy(); s=mm['sources'][0]; r=json.loads(aa[s['receipt_member']]); r['body_hash_domain']='http_representation_octets_before_content_decoding'; s['body_hash_domain']=r['body_hash_domain']; raw=json.dumps(r).encode(); aa[s['receipt_member']]=raw; s['receipt_sha256']=sha(raw); cases.append((mm,p,aa))
        mm=copy.deepcopy(m); aa=a.copy(); s=next(x for x in mm['sources'] if x['source_id']=='sec-allfilers-intel-commerce-window-p1'); q=json.loads(aa[s['body_member']]); q['query']['query']['bool']['filter'].append({'term':{'ciks':'0000050863'}}); raw=json.dumps(q).encode(); mm['body_bytes']+=len(raw)-s['body_bytes']; s['body_bytes']=len(raw); s['body_sha256']=sha(raw); aa[s['body_member']]=raw; r=json.loads(aa[s['receipt_member']]); r['body_bytes']=len(raw); r['body_sha256']=sha(raw); rr=json.dumps(r).encode(); aa[s['receipt_member']]=rr; s['receipt_sha256']=sha(rr); cases.append((mm,p,aa))
        for args in cases:
            try: validate(*args)
            except (ValueError,KeyError,IndexError): negative+=1
            else: raise ValueError('negative test accepted')
        require(negative==7,'negative-test denominator')
    require(set(sys.argv[1:])<= {'--self-test'},'unknown argument')
    print(json.dumps({'verified':True,'sources':len(m['sources']),'archive_members':len(a),'all_filer_document_hits':len(p['documents']),'matching_contexts':p['matching_contexts'],'negative_tests_rejected':negative,'stage_admission':'none'}))
if __name__=='__main__':
    try: main()
    except Exception as error:
        print('VERIFICATION FAILED: '+str(error),file=sys.stderr); sys.exit(1)
