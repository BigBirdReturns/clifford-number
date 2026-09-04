#!/usr/bin/env python3
"""Verify this frozen readback packet locally, without network access or extraction."""
import copy, hashlib, html, io, json, pathlib, re, sys, zipfile
import xml.etree.ElementTree as ET

FILES = {'sources.zip','manifest.json','projection.json','review.md','verify.py','SHA256SUMS'}
SOURCE_IDS = {'sec-submissions','sec-npx-directory','sec-npx-complete-submission','issuer-filings-index','issuer-npx-cover','issuer-npx-votes','issuer-news-index','issuer-conference-notice','issuer-offering-8k-prebaseline-control','issuer-offering-prospectus-prebaseline-control'}
sha = lambda b: hashlib.sha256(b).hexdigest()

def require(ok, message):
    if not ok:
        raise ValueError(message)

def check(manifest, projection, archive):
    require(manifest['object_class']=='bounded_primary_source_readback_without_stage_admission','wrong object class')
    require(manifest['base_commit']=='06ecd1d0e3aecc9910342920a7a78699fc706128','base lease drift')
    require(manifest['base_tree']=='43603d3ecbf438a6062d8264b988ff504820b95f','base tree drift')
    window=manifest['window']
    require(window['filing_or_publication_date_from_inclusive']=='2026-08-17' and window['filing_or_publication_date_to_inclusive']=='2026-09-04','window drift')
    require(window['observation_is_intraday'] is True and window['end_of_day_completeness_claimed'] is False,'temporal overclaim')
    result=manifest['result']
    for key in ['global_nonoccurrence_asserted','holder_filings_outside_intel_cik_censused','commerce_or_treasury_transaction_records_censused','conference_replay_reviewed','all_five_watcher_routes_reexecuted','frozen_five_route_denominator_changed','frozen_96_route_contract_satisfied','answer_changes_authorized','issue_345_may_close']:
        require(result[key] is False,'authority or scope drift: '+key)
    require(result['new_federal_realization_candidates']==0 and result['new_stage_registry_entries']==0 and result['stage_admission']=='none' and result['graph_effect']=='none','stage or graph promotion')
    sources=manifest['sources']
    require(len(sources)==10 and {s['source_id'] for s in sources}==SOURCE_IDS,'source denominator drift')
    expected={s[k] for s in sources for k in ['receipt_member','body_member']}
    require(len(expected)==20 and set(archive)==expected,'archive member denominator drift')
    for source in sources:
        body=archive[source['body_member']]; rb=archive[source['receipt_member']]; receipt=json.loads(rb)
        require(sha(rb)==source['receipt_sha256'],'receipt checksum mismatch')
        require(sha(body)==source['body_sha256']==receipt['body_sha256'],'source body checksum mismatch')
        require(len(body)==source['body_bytes']==receipt['body_bytes'],'body length mismatch')
        require(receipt['source_url']==receipt['final_url']==source['source_url'],'address drift')
        require(receipt['status_code']==200,'unsuccessful captured source')
        require(receipt['request_headers']['Accept-Encoding']=='identity','request content coding drift')
        require(not any(k.lower()=='content-encoding' and v.lower() not in ('','identity') for k,v in receipt['response_headers']),'unhandled content coding')
    submissions=json.loads(archive['sec-submissions.json']); f=submissions['filings']['recent']
    require(submissions['cik']=='0000050863' and submissions['name']=='INTEL CORP','issuer identity mismatch')
    require(all(len(v)==1001 for v in f.values()),'submissions array mismatch')
    columns=['accessionNumber','filingDate','reportDate','acceptanceDateTime','form','primaryDocument','primaryDocDescription']
    selected=[{k:f[k][i] for k in columns} for i in range(1001) if '2026-08-17'<=f['filingDate'][i]<='2026-09-04']
    require(selected==projection['selected_filings'] and len(selected)==1,'filing projection mismatch')
    require(selected[0]['accessionNumber']=='0000050863-26-000179' and selected[0]['form']=='N-PX','unexpected in-window filing')
    require(projection['sec_recent_entries']==1001 and projection['sec_recent_oldest_date']==min(f['filingDate']) and projection['sec_recent_newest_date']==max(f['filingDate']),'filing coverage mismatch')
    require(projection['historical_chunks']==submissions['filings']['files'],'historical chunk projection mismatch')
    require(all(x['filingTo']<'2026-08-17' for x in submissions['filings']['files']),'older submissions need inspection')
    text=archive['sec-npx-complete-submission.body'].decode('utf-8')
    require(re.search(r'ACCESSION NUMBER:\s+0000050863-26-000179',text) is not None,'accession mismatch')
    docs=re.findall(r'<DOCUMENT>(.*?)</DOCUMENT>',text,re.S); require(len(docs)==2,'submission document count')
    roots={}
    for doc in docs:
        name=re.search(r'<FILENAME>([^\r\n]+)',doc).group(1)
        require(name not in roots,'duplicate embedded document')
        roots[name]=ET.fromstring(re.search(r'<XML>\s*(.*?)\s*</XML>',doc,re.S).group(1))
    require(list(roots)==projection['npx']['document_names']==['primary_doc.xml','proxyvotetable.xml'],'document selection drift')
    ns={'n':'http://www.sec.gov/edgar/npx'}; cover=roots['primary_doc.xml']
    for key,xpath in [('reporting_person','.//n:reportingPerson/n:name'),('report_period_end','.//n:periodOfReport'),('report_type','.//n:reportType')]:
        require(cover.find(xpath,ns).text==projection['npx'][key],'N-PX cover projection mismatch')
    rows=[]
    for v in roots['proxyvotetable.xml']:
        d={e.tag.rsplit('}',1)[-1]:(e.text or '').strip() for e in v.iter() if len(e)==0}
        rows.append({k:d.get(k) for k in ['issuerName','cusip','meetingDate','sharesVoted','howVoted','otherManager','categoryType']})
    require(rows==projection['npx']['vote_rows'] and len(rows)==4,'vote projection mismatch')
    require({r['issuerName'] for r in rows}=={'Joby Aviation, Inc.','Mobileye Global Inc.'},'voted securities changed')
    articles=re.findall(r'<article\b[^>]*>(.*?)</article>',archive['issuer-news-index.body'].decode('utf-8'),re.S); news=[]
    for a in articles:
        dt=re.search(r'<time\b[^>]*datetime="([^"]+)"',a); link=re.search(r'<div class="media-title">\s*<a href="([^"]+)">\s*(.*?)</a>',a,re.S)
        if dt and link: news.append({'publisher_local_datetime':dt.group(1),'url':html.unescape(link.group(1)),'title':html.unescape(re.sub(r'\s+',' ',link.group(2)).strip())})
    require(len(news)==projection['issuer_news_page_entries']==12,'news page denominator drift')
    require([r['publisher_local_datetime'] for r in news]==projection['issuer_news_page_dates'],'news dates mismatch')
    wanted=[r for r in news if '2026-08-17'<=r['publisher_local_datetime'][:10]<='2026-09-04']
    require(wanted==projection['selected_news'] and len(wanted)==1,'news selection mismatch')
    require(result['in_window_sec_filings_reviewed']==len(selected) and result['in_window_issuer_news_items_reviewed']==len(wanted),'review counts mismatch')
    require(b'fireside chat' in archive['issuer-conference-notice.body'],'notice content mismatch')
    def clean(body): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',body.decode('utf-8'))))
    eight=clean(archive['issuer-offering-8k-prebaseline-control.body']); prospectus=clean(archive['issuer-offering-prospectus-prebaseline-control.body'])
    require('210,526,315' in eight and '31,578,947' in eight and 'exercised the option in full' in eight,'offering control mismatch')
    require('Proceeds, before expenses, to Intel Corporation' in prospectus,'proceeds recipient not supported')

def main():
    root=pathlib.Path(__file__).resolve().parent
    require({p.name for p in root.iterdir()}==FILES,'unexpected or missing packet files')
    listed={}
    for line in (root/'SHA256SUMS').read_text(encoding='utf-8').splitlines():
        digest,name=line.split('  ',1); require(name not in listed and name in FILES and name!='SHA256SUMS','invalid checksum entry'); listed[name]=digest
    require(set(listed)==FILES-{'SHA256SUMS'},'checksum denominator drift')
    for name,digest in listed.items(): require(sha((root/name).read_bytes())==digest,'file checksum mismatch: '+name)
    manifest=json.loads((root/'manifest.json').read_bytes()); pb=(root/'projection.json').read_bytes(); projection=json.loads(pb); ab=(root/'sources.zip').read_bytes()
    require(sha(pb)==manifest['projection_sha256'],'projection digest mismatch')
    require(sha(ab)==manifest['archive']['sha256'] and len(ab)==manifest['archive']['bytes'],'archive digest mismatch')
    with zipfile.ZipFile(io.BytesIO(ab)) as z:
        require(len(z.infolist())==20 and len(set(z.namelist()))==20 and z.testzip() is None,'ZIP integrity or uniqueness failure')
        require(all('/' not in n and '\\' not in n and n not in ('.','..') for n in z.namelist()),'unsafe archive path')
        archive={n:z.read(n) for n in z.namelist()}
    check(manifest,projection,archive)
    negative=0
    if '--self-test' in sys.argv:
        cases=[]
        a=copy.deepcopy(archive); a['sec-submissions.json']+=b' '; cases.append((manifest,projection,a))
        a=copy.deepcopy(archive); a['unexpected.body']=b'x'; cases.append((manifest,projection,a))
        q=copy.deepcopy(projection); q['selected_filings']=[]; cases.append((manifest,q,archive))
        q=copy.deepcopy(projection); q['npx']['report_period_end']='09/04/2026'; cases.append((manifest,q,archive))
        m=copy.deepcopy(manifest); m['result']['global_nonoccurrence_asserted']=True; cases.append((m,projection,archive))
        m=copy.deepcopy(manifest); m['result']['new_stage_registry_entries']=1; cases.append((m,projection,archive))
        m=copy.deepcopy(manifest); m['window']['end_of_day_completeness_claimed']=True; cases.append((m,projection,archive))
        q=copy.deepcopy(projection); q['selected_news']=[]; cases.append((manifest,q,archive))
        for args in cases:
            try: check(*args)
            except (ValueError,KeyError): negative+=1
            else: raise ValueError('negative control was accepted')
        require(negative==8,'negative control count drift')
    print(json.dumps({'verified':True,'captured_bodies':10,'archive_members':20,'in_window_filings':1,'in_window_news_items':1,'rejected_negative_controls':negative,'stage_admission':'none'}))

if __name__=='__main__':
    try: main()
    except Exception as error:
        print('VERIFICATION FAILED: '+str(error),file=sys.stderr); sys.exit(1)
