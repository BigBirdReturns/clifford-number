#!/usr/bin/env python3
"""Clifford's finite ecology backfill executor and retained-corpus search.

Existing estate definitions, source-route registry and source ledgers own scope.
This program owns resumable acquisition cursors and a rebuildable search index,
not a second scheduler, graph, claim authority or publication gate.
"""
from __future__ import annotations
import argparse, concurrent.futures, contextlib, datetime as dt, hashlib, html
import ipaddress, json, os, re, socket, sqlite3, subprocess, sys, threading, time
import urllib.error, urllib.parse, urllib.request
from pathlib import Path
from html.parser import HTMLParser
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = 'clifford/ecology-backfill@1'
MAX_BYTES = 8 * 1024 * 1024
UA = 'CliffordNumber-PublicResearch/1.0 (bigbirdreturns@proton.me)'
BOUNDARY = ('Owner-local research. Search observations and indexed records are not accepted legal-entity joins, '
            'independently reviewed facts, or public findings. Search completion applies only to its frozen '
            'provider, query and date range. Source access failures and pre-source eras remain gaps.')


def utc(): return dt.datetime.now(dt.timezone.utc).isoformat()
def j(x): return json.dumps(x, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)
def sha(x): return hashlib.sha256(x).hexdigest()
def load(p): return json.loads(Path(p).read_text(encoding='utf-8'))
def jl(p):
    with Path(p).open(encoding='utf-8') as f:
        for n, line in enumerate(f, 1):
            if line.strip(): yield n, json.loads(line)
def atomic(path, data):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.tmp-' + str(os.getpid()) + '-' + str(threading.get_ident()))
    tmp.write_bytes(data if isinstance(data, bytes) else data.encode('utf-8')); os.replace(tmp, path)
def date(value):
    parsed = dt.date.fromisoformat(value)
    if parsed.isoformat() != value: raise ValueError('Exact ISO calendar date required')
    return value


def connect(state):
    Path(state).mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(Path(state) / 'ecology.sqlite', timeout=90)
    c.row_factory = sqlite3.Row
    c.execute('PRAGMA busy_timeout=90000'); c.execute('PRAGMA journal_mode=WAL')
    c.executescript('''
    CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS estates(id TEXT PRIMARY KEY,label TEXT,definition TEXT,phases TEXT);
    CREATE TABLE IF NOT EXISTS source_gaps(id TEXT PRIMARY KEY,estates TEXT,start TEXT,end TEXT,reason TEXT,route TEXT,status TEXT);
    CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,lane TEXT,kind TEXT,spec TEXT,estates TEXT,status TEXT DEFAULT 'ready',cursor INTEGER DEFAULT 1,pages INTEGER DEFAULT 0,rows_seen INTEGER DEFAULT 0,expected INTEGER,error TEXT,attempts INTEGER DEFAULT 0,updated TEXT,started TEXT);
    CREATE TABLE IF NOT EXISTS captures(id TEXT PRIMARY KEY,task_id TEXT,url TEXT,request TEXT,status INTEGER,path TEXT,sha256 TEXT,bytes INTEGER,at TEXT,error TEXT);
    CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,origin TEXT,locator TEXT,source_hash TEXT,position TEXT,kind TEXT,estates TEXT,title TEXT,body TEXT,record_date TEXT,review TEXT,payload TEXT);
    CREATE TABLE IF NOT EXISTS commitments(id TEXT PRIMARY KEY,document_id TEXT,kind TEXT,due TEXT,source_date TEXT,observed_at TEXT,state TEXT);
    CREATE TABLE IF NOT EXISTS files(path TEXT PRIMARY KEY,sha256 TEXT,bytes INTEGER,rows INTEGER,status TEXT,error TEXT,at TEXT);
    CREATE TABLE IF NOT EXISTS runlog(id TEXT PRIMARY KEY,started TEXT,ended TEXT,status TEXT,summary TEXT);
    CREATE INDEX IF NOT EXISTS task_ready ON tasks(lane,status,updated,id);
    CREATE INDEX IF NOT EXISTS tasks_ready_priority_v1 ON tasks(lane,pages,COALESCE(json_extract(spec,'$.start'),json_extract(spec,'$.record_date'),json_extract(spec,'$.date'),'0000'),updated,id) WHERE status IN ('ready','partial');
    CREATE INDEX IF NOT EXISTS doc_origin ON documents(origin);
    CREATE INDEX IF NOT EXISTS commit_due ON commitments(due);
    CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(id UNINDEXED,title,body,tokenize='unicode61');
    '''); c.commit(); return c


@contextlib.contextmanager
def lock(state, name):
    import fcntl
    p = Path(state) / (name + '.lock'); p.parent.mkdir(parents=True, exist_ok=True)
    f = p.open('a+')
    try:
        fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        f.close(); raise RuntimeError('Existing ' + name + ' owner is running; recover it rather than duplicate')
    try:
        f.seek(0); f.truncate(); f.write(j({'pid':os.getpid(), 'started':utc()})); f.flush(); yield
    finally: fcntl.flock(f, fcntl.LOCK_UN); f.close()


class Text(HTMLParser):
    def __init__(self): super().__init__(); self.parts=[]; self.skip=0
    def handle_starttag(self, tag, attrs):
        if tag in ('script','style','noscript'): self.skip += 1
    def handle_endtag(self, tag):
        if tag in ('script','style','noscript') and self.skip: self.skip -= 1
    def handle_data(self, data):
        if not self.skip: self.parts.append(data)
    def result(self): return re.sub(r'\s+', ' ', ' '.join(self.parts)).strip()


def safe_url(url):
    p=urllib.parse.urlsplit(url)
    if p.scheme not in ('http','https') or not p.hostname or p.username or p.password: raise ValueError('Nonpublic URL shape')
    if p.port not in (None,80,443): raise ValueError('Nonstandard source port')
    for item in socket.getaddrinfo(p.hostname,p.port or (443 if p.scheme=='https' else 80),type=socket.SOCK_STREAM):
        if not ipaddress.ip_address(item[4][0]).is_global: raise ValueError('Nonpublic network destination refused')
    return url


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        safe_url(newurl)
        return super().redirect_request(req,fp,code,msg,headers,newurl)


def is_access_challenge(url, raw):
    return ('unblock.federalregister.gov' in urllib.parse.urlsplit(url).netloc
            or b'Federal Register :: Request Access' in raw[:1000])


def request_source(state, task_id, url, body=None):
    """Idempotent source capture: exact response reused for the same frozen request."""
    reqtext=j({'url':url,'body':body}); key=sha((task_id+'\n'+reqtext).encode())
    c=connect(state); prior=c.execute('SELECT * FROM captures WHERE id=?',(key,)).fetchone(); c.close()
    if prior:
        if prior['path']:
            raw=(Path(state)/prior['path']).read_bytes()
            if sha(raw)!=prior['sha256']: raise ValueError('Retained source capture corrupted')
            return dict(prior),raw
        return dict(prior),b''
    safe_url(url)
    req=urllib.request.Request(url,data=j(body).encode() if body is not None else None,
        headers={'User-Agent':UA,'Accept':'application/json,text/html,application/xml,text/plain,*/*','Content-Type':'application/json'})
    error=None; status=0; raw=b''; final=url
    try:
        with urllib.request.build_opener(SafeRedirect()).open(req,timeout=22) as r:
            status=r.status; final=r.geturl()
            declared=r.headers.get('Content-Length')
            if declared and int(declared)>MAX_BYTES: raise ValueError('Source body exceeds 8 MiB, bulk adapter required')
            raw=r.read(MAX_BYTES+1)
            if len(raw)>MAX_BYTES: raise ValueError('Source body exceeded 8 MiB, bulk adapter required')
    except urllib.error.HTTPError as e:
        status=e.code; raw=e.read(65536); error='HTTP '+str(status)
    except Exception as e: error=str(e)[:500]
    if is_access_challenge(final,raw):
        error='Source access challenge; HTML corpus unavailable through this route. No bypass attempted.'
    hashed=sha(raw) if raw else None; relative='bodies/'+hashed+'.body' if raw else None
    if relative:
        dest=Path(state)/relative
        if not dest.exists(): atomic(dest,raw)
    capture={'id':key,'task_id':task_id,'url':final,'request':reqtext,'status':status,'path':relative,
             'sha256':hashed,'bytes':len(raw),'at':utc(),'error':error}
    c=connect(state)
    with c: c.execute('INSERT OR IGNORE INTO captures VALUES(:id,:task_id,:url,:request,:status,:path,:sha256,:bytes,:at,:error)',capture)
    c.close();return capture,raw


def upsert_document(c, *, ident, origin, locator, source_hash, position, kind, estates, title, body, record_date, review, payload):
    prior=c.execute('SELECT estates FROM documents WHERE id=?',(ident,)).fetchone()
    if prior:
        merged=sorted(set(json.loads(prior['estates']))|set(estates))
        if merged!=json.loads(prior['estates']):
            c.execute('UPDATE documents SET estates=? WHERE id=?',(j(merged),ident))
        return 0
    title=str(title or kind)[:500]; body=str(body)
    c.execute('INSERT INTO documents VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
              (ident,origin,locator,source_hash,str(position),kind,j(estates),title,body,record_date,review,j(payload)))
    c.execute('INSERT INTO search(id,title,body) VALUES(?,?,?)',(ident,title,body));return 1


def add_task(c, lane, kind, spec, estates, priority=''):
    identity_spec={'url':spec['url']} if kind=='document' else spec
    core=j({'lane':lane,'kind':kind,'spec':identity_spec}); ident=priority+sha(core.encode())[:24]
    prior=c.execute('SELECT estates FROM tasks WHERE id=?',(ident,)).fetchone()
    if prior:
        merged=sorted(set(json.loads(prior['estates']))|set(estates))
        if merged!=json.loads(prior['estates']):
            c.execute('UPDATE tasks SET estates=? WHERE id=?',(j(merged),ident))
    else:
        c.execute('INSERT INTO tasks(id,lane,kind,spec,estates,updated) VALUES(?,?,?,?,?,?)',
            (ident,lane,kind,j(spec),j(sorted(set(estates))),'1991-01-01T00:00:00+00:00'))
    return ident


def initialize(repo,state,cutoff):
    cutoff=date(cutoff);c=connect(state)
    old=c.execute("SELECT value FROM metadata WHERE key='cutoff'").fetchone()
    if old:
        if json.loads(old[0])!=cutoff: raise ValueError('Frozen backlog already has another cutoff; retain it and drain before advancing')
        c.close();return report(state)
    reg=load(repo/'data/estates/source-route-registry.json')
    align=load(repo/'data/project/estate-thesis-alignment.json')
    assert len(align['estates'])==24
    inputs=['data/estates/source-route-registry.json','data/project/estate-thesis-alignment.json',
            'data/project/core-thesis.json','data/research/integrity-roster-selection-20261102.json',
            'data/intake/natsec100-pathways/chunk1/companies.jsonl']
    fingerprints={p:sha((repo/p).read_bytes()) for p in inputs}
    with c:
        for e in align['estates']:
            definition=load(repo/'data/estates/definitions'/ (e['estate_id']+'.json'))
            c.execute('INSERT OR REPLACE INTO estates VALUES(?,?,?,?)',(e['estate_id'],definition['label'],j(definition),j(e['phase_ids'])))
        for k,v in {'schema':SCHEMA,'cutoff':cutoff,'horizon_start':'1991-01-01','repo':str(repo),'input_hashes':fingerprints,
                    'boundary':BOUNDARY,'source_phase_policy':'Source coverage floors are gaps, never silently substituted for 1991.','initialized_at':utc()}.items():
            c.execute('INSERT INTO metadata VALUES(?,?)',(k,j(v)))
        # Source locators are existing estate work, not a newly selected scandal list.
        by_url={}
        for r in reg['routes']:
            url=r.get('gateway_url')
            if not url:continue
            d=by_url.setdefault(url,{'url':url,'route_ids':[],'estates':[]})
            d['route_ids'].append(r['route_id']);d['estates']+=r['used_by_estate_ids']
        for entry in by_url.values():add_task(c,'sources','route',{'url':entry['url'],'route_ids':entry['route_ids']},entry['estates'],'s-')
        # Full roster union, no founder/ideology/adverse-outcome selection.
        names={}
        selected=load(repo/'data/research/integrity-roster-selection-20261102.json')
        for cohort in selected['cohorts']:
            for m in cohort['members']:
                key=m['label'].strip().casefold();x=names.setdefault(key,{'label':m['label'],'refs':[]})
                x['refs'].append({'path':'data/research/integrity-roster-selection-20261102.json','cohort':cohort['id'],'id':m['id'],'state':m['source_status']})
        for line,m in jl(repo/'data/intake/natsec100-pathways/chunk1/companies.jsonl'):
            label=m['canonical_name'];x=names.setdefault(label.strip().casefold(),{'label':label,'refs':[]})
            x['refs'].append({'path':'data/intake/natsec100-pathways/chunk1/companies.jsonl','line':line,'company_id':m['company_id'],'receipt_ids':m.get('receipt_ids',[])})
        award_estates=['us-defense-estate','public-money-industrial-policy-estate','venture-capital-corporate-control-estate','transatlantic-defense-innovation-estate']
        for n in names.values():add_task(c,'awards','award',{'label':n['label'],'selection_refs':n['refs'],'start':'2007-10-01','end':cutoff},award_estates,'a-')
        c.execute('INSERT OR REPLACE INTO source_gaps VALUES(?,?,?,?,?,?,?)',('usaspending-pre2008',j(award_estates),'1991-01-01','2007-09-30',
            'Observed API 422: start_date cannot be earlier than 2007-10-01. Historical archives/legacy extracts remain required.','fpds-archives / NARA','archive_adapter_required'))
        # Source-specific official policy search strata. All years and named terms use identical rules.
        fr_topics={
         'regulatory-markets-estate':['"government procurement"','"public private partnership"'],
         'sanctions-export-controls-foreign-investment-estate':['"export controls"','"foreign investment"'],
         'intellectual-property-standards-data-rights-estate':['"data rights"','"technical data"'],
         'us-defense-estate':['"defense procurement"']}
        for eid,terms in fr_topics.items():
            c.execute('INSERT OR REPLACE INTO source_gaps VALUES(?,?,?,?,?,?,?)',('federal-register-pre1994-'+eid,j([eid]),'1991-01-01','1993-12-31',
             'FederalRegister.gov searchable collection begins 1994; earlier government archives remain required.','Federal Register / GovInfo historical archives','archive_adapter_required'))
            for term in terms:
                for year in range(1994,int(cutoff[:4])+1):
                    add_task(c,'policy','federal_register',{'term':term,'start':str(year)+'-01-01','end':min(str(year)+'-12-31',cutoff),'page_size':1000},[eid],'p-')
        for eid,term in [('uk-defense-estate','"defence procurement"'),('uk-state-market-estate','"artificial intelligence"')]:
            for year in range(1991,int(cutoff[:4])+1):
                add_task(c,'policy','govuk',{'term':term,'start':str(year)+'-01-01','end':min(str(year)+'-12-31',cutoff),'page_size':100},[eid],'u-')
        c.execute('INSERT INTO metadata VALUES(?,?)',('cohort_counts',j({'natsec_labels':196,'schoolhouse_labels':35,'distinct_label_queries':len(names),
                     'source_routes':len(reg['routes']),'unique_source_gateways':len(by_url),'estates':24})))
    declaration={'schema':SCHEMA,'as_of':cutoff,'horizon':'1991 through present; future commitments are separately observed dates, not outcomes',
      'inputs':fingerprints,'selection':'Every existing registry source locator, every retained source-roster company label, every declared policy-query yearly stratum.',
      'comparison':'Identical query, pagination and error rules within each source family. Roster source identities remain unresolved. Exact labels only; no inferred affiliates.',
      'source_limits':'Gateway fetched is not source corpus acquired. Topic metadata acquired is not full text read. Publication still requires existing independent review.',
      'privacy':'Owner-local; no credentials, restricted access, private-person scoring, or public redistribution.',
      'review_state':'pending_independent_review','graph_effect':'none','estate_completion_claimed':False,
      'terms':fr_topics,'cutoff':cutoff,'created_at':utc()}
    atomic(Path(state)/'selection-contract.json',json.dumps(declaration,indent=2)+'\n');c.close();return report(state)


def seed_legacy_federal_register_issues(c):
    # Official GPO issue-level MODS records extend the policy chronology into 1991-1993.
    # This is not an article corpus, full-text review, or inference of topic relevance.
    flag=c.execute("SELECT value FROM metadata WHERE key='govinfo_1991_1993_issue_seed_v1'").fetchone()
    if flag: return 0
    estates=['regulatory-markets-estate','sanctions-export-controls-foreign-investment-estate',
             'intellectual-property-standards-data-rights-estate','us-defense-estate']
    day=dt.date(1991,1,1); end=dt.date(1993,12,31); n=0
    while day<=end:
        if day.weekday()<5:
            day_s=day.isoformat(); label='FR-'+day_s
            url='https://www.govinfo.gov/metadata/granule/'+label+'/'+label+'/mods.xml'
            add_task(c,'sources','federal_register_legacy_issue',
                     {'url':url,'date':day_s,'source_family':'govinfo_digitized_issue_MODS'},
                     estates,'h-')
            n+=1
        day+=dt.timedelta(days=1)
    c.execute('INSERT INTO metadata(key,value) VALUES(?,?)',
              ('govinfo_1991_1993_issue_seed_v1',j({'issue_date_candidates':n,'window':'1991-01-01..1993-12-31',
               'source':'GPO GovInfo MODS issue-level metadata, not article text',
               'publication_state':'owner_local_candidate_only'})))
    for eid in estates:
        c.execute("UPDATE source_gaps SET reason=?,route=?,status=? WHERE id=?",
          ('1991-1993 GPO digitized issue metadata locators are now being checked oldest-first; '
           'issue-level metadata does not supply underlying document full text, article relevance or a full 1991-1993 corpus.',
           'GovInfo historic Federal Register issue-level MODS and PDF archives',
           'issue_metadata_adapter_active_article_text_gap',
           'federal-register-pre1994-'+eid))
    return n


def parse_legacy_federal_register_mods(raw, expected):
    ns='{http://www.loc.gov/mods/v3}'
    root=ET.fromstring(raw)
    if root.tag!=ns+'mods': raise ValueError('GovInfo MODS XML root mismatch')
    observed=root.findtext('.//'+ns+'dateIssued')
    native=root.findtext('.//'+ns+'recordIdentifier')
    expected_native='FR-'+expected
    if observed!=expected or native!=expected_native:
        raise ValueError('GovInfo archive issue/date identity mismatch: '+str(observed)+' '+str(native))
    urls=[el.text for el in root.iter(ns+'url') if el.get('displayLabel')=='PDF rendition' and el.text]
    pdf=urls[0] if urls else None
    if pdf and (urllib.parse.urlsplit(pdf).hostname!='www.govinfo.gov'
                or not pdf.startswith('https://www.govinfo.gov/content/pkg/'+expected_native+'/pdf/')):
        raise ValueError('GovInfo archive PDF link outside expected native issue')
    volume=root.findtext('.//'+ns+'volume')
    issue=root.findtext('.//'+ns+'issue')
    extent=root.findtext('.//'+ns+'extent')
    return {'native_id':native,'date':observed,'volume':volume,'issue':issue,
            'extent_source_native':extent,'pdf':pdf,
            'content_state':'official_issue_metadata_only_pdf_not_acquired_or_read'}


def documents_from_capture(c, task, capture, payload):
    spec=json.loads(task['spec']);estates=json.loads(task['estates']);kind=task['kind'];new=0
    rows=payload.get('results',[])
    cutoff=json.loads(c.execute("SELECT value FROM metadata WHERE key='cutoff'").fetchone()[0])
    for i,r in enumerate(rows):
        native=(r.get('generated_internal_id') or r.get('internal_id') or (str(r.get('Award ID'))+'|'+str(r.get('Recipient UEI')))) if kind=='award' else r.get('document_number') or r.get('link') or sha(j(r).encode())
        ident=sha((kind+'|'+str(native)+'|'+capture['sha256']).encode())
        if kind=='award':
            title=str(r.get('Recipient Name',''))+' / '+str(r.get('Award ID',''))
            stamp=r.get('Start Date');due=r.get('End Date');dtype='period_of_performance_end'
            extra={'queried_roster_label':spec['label'],'identity_state':'unresolved_roster_to_recipient','amount_meaning':'source_native_Award_Amount_not_payment_or_ceiling','source_record':r}
        else:
            title=r.get('title','');stamp=r.get('publication_date') or r.get('public_timestamp');due=r.get('effective_on') or r.get('comments_close_on');dtype='effective_or_comment_date'
            extra={'query':spec.get('term') or spec.get('document_number'),'relevance':'source_document_detail_unreviewed' if kind=='federal_register_detail' else 'source_search_candidate_not_independent_topic_review','source_record':r}
        new+=upsert_document(c,ident=ident,origin='acquired',locator=capture['url'],source_hash=capture['sha256'],position='/results/'+str(i),
            kind=kind,estates=estates,title=title,body=j(extra),record_date=stamp,review='candidate_only',payload=extra)
        if isinstance(due,str) and re.match(r'^\d{4}-\d{2}-\d{2}',due) and due[:10]>cutoff:
            cid=sha((ident+'|'+dtype+'|'+due).encode())
            c.execute('INSERT OR IGNORE INTO commitments VALUES(?,?,?,?,?,?,?)',(cid,ident,dtype,due[:10],stamp,capture['at'],'announced_or_scheduled_not_observed_fulfilled'))
        if kind=='federal_register' and r.get('document_number'):
            add_task(c,'sources','federal_register_detail',{'document_number':r['document_number'],'record_date':stamp},estates,'d-')
        elif kind=='federal_register_detail':
            url=r.get('raw_text_url') or r.get('full_text_xml_url')
            if url:add_task(c,'sources','document',{'url':url,'document_number':r.get('document_number'),'parent_capture':capture['sha256'],'title':title,'record_date':stamp},estates,'t-')
    return new


def normalize_source_results(kind,payload):
    # Actual public FR empty-query response omits results entirely. Count zero
    # is valid only for this exact provider/query, never a whole-corpus finding.
    if kind=='federal_register' and isinstance(payload,dict) and type(payload.get('count'))is int and payload['count']==0 and 'results' not in payload:
        return {**payload,'results':[]}
    return payload


def step(state,lane):
    c=connect(state)
    with c:
        c.execute('BEGIN IMMEDIATE')
        task=c.execute("SELECT * FROM tasks WHERE lane=? AND status IN ('ready','partial') ORDER BY pages,COALESCE(json_extract(spec,'$.start'),json_extract(spec,'$.record_date'),json_extract(spec,'$.date'),'0000'),updated,id LIMIT 1",(lane,)).fetchone()
        if not task:return None
        task=dict(task);c.execute("UPDATE tasks SET status='running',started=? WHERE id=?",(utc(),task['id']))
    spec=json.loads(task['spec']);page=task['cursor'];kind=task['kind'];url='';body=None
    try:
        import ecology_sources
        if kind in ecology_sources.KINDS:
            return ecology_sources.handle(state,task,c)
        if kind=='award':
            url='https://api.usaspending.gov/api/v2/search/spending_by_award/'
            body={'filters':{'award_type_codes':['A','B','C','D'],'recipient_search_text':[spec['label']],
                  'time_period':[{'start_date':spec['start'],'end_date':spec['end']}]},
                  'fields':['Award ID','Recipient Name','Recipient UEI','Award Amount','Awarding Agency','Start Date','End Date','Description','Award Type'],
                  'limit':100,'page':page,'sort':'Award Amount','order':'desc'}
        elif kind=='federal_register':
            query=[('per_page',str(spec['page_size'])),('page',str(page)),('order','oldest'),('conditions[publication_date][gte]',spec['start']),
                   ('conditions[publication_date][lte]',spec['end']),('conditions[term]',spec['term'])]
            url='https://www.federalregister.gov/api/v1/documents.json?'+urllib.parse.urlencode(query)
        elif kind=='govuk':
            query={'q':spec['term'],'count':spec['page_size'],'start':(page-1)*spec['page_size'],'order':'public_timestamp',
                'filter_public_timestamp':'from:'+spec['start']+',to:'+spec['end']}
            url='https://www.gov.uk/api/search.json?'+urllib.parse.urlencode(query)
        elif kind=='federal_register_detail':
            url='https://www.federalregister.gov/api/v1/documents/'+urllib.parse.quote(spec['document_number'],safe='')+'.json'
        else:url=spec['url']
        capture,raw=request_source(state,task['id'],url,body)
        if kind=='federal_register_legacy_issue' and capture['status']==404:
            with c:c.execute("UPDATE tasks SET status='archive_no_issue_at_exact_locator',error=?,attempts=attempts+1,updated=? WHERE id=?",
                ('Official locator returned 404; publication/existence not inferred',utc(),task['id']))
            return {'id':task['id'],'lane':lane,'status':'archive_no_issue_at_exact_locator','bytes':len(raw)}
        if kind=='federal_register_legacy_issue' and (capture['url'].rstrip('/').endswith('/error') or raw.lstrip().lower().startswith(b'<!doctype html')):
            with c:c.execute("UPDATE tasks SET status='source_blocked',error=?,attempts=attempts+1,updated=? WHERE id=?",
                ('GovInfo archive locator returned HTML error page, not MODS metadata',utc(),task['id']))
            return {'id':task['id'],'lane':lane,'status':'source_blocked','bytes':len(raw)}
        if capture['status']!=200 or capture['error']:
            with c:c.execute("UPDATE tasks SET status='source_blocked',attempts=attempts+1,error=?,updated=? WHERE id=?",(capture['error'] or 'HTTP '+str(capture['status']),utc(),task['id']))
            return {'id':task['id'],'lane':lane,'status':'source_blocked','error':capture['error'],'bytes':len(raw)}
        if kind=='federal_register_legacy_issue':
            meta=parse_legacy_federal_register_mods(raw,spec['date'])
            body=j({'source_native_issue_metadata':meta,'selection':'1991-1993 official weekday issue-date probe; no article/topic inference',
                    'retrieval_source':capture['url'],'original_sha256':capture['sha256']})
            ident=sha(('govinfo-fr-legacy-issue|'+meta['native_id']+'|'+capture['sha256']).encode())
            with c:
                added=upsert_document(c,ident=ident,origin='acquired',locator=capture['url'],
                   source_hash=capture['sha256'],position='MODS issue',kind='federal_register_legacy_issue_metadata',
                   estates=json.loads(task['estates']),title='Federal Register issue '+meta['native_id'],
                   body=body,record_date=meta['date'],review='source_issue_metadata_only',payload=meta)
                c.execute("UPDATE tasks SET status='issue_metadata_captured_article_text_gap',pages=pages+1,rows_seen=rows_seen+1,updated=? WHERE id=?",
                          (utc(),task['id']))
            return {'id':task['id'],'lane':lane,'kind':kind,'status':'issue_metadata_captured_article_text_gap','added':added,'bytes':len(raw)}
        if kind in ('route','document'):
            text=raw.decode('utf-8',errors='replace');parser=Text();parser.feed(text[:MAX_BYTES]);plain=parser.result()
            if kind=='document' and any(x in plain[:3000].lower() for x in ['verify you are human','enable javascript and cookies to continue','access denied','request access','captcha (bot test)']):
                with c:c.execute("UPDATE tasks SET status='source_blocked',error='Source returned access challenge; no bypass attempted',updated=? WHERE id=?",(utc(),task['id']))
                return {'id':task['id'],'lane':lane,'status':'source_blocked','error':'access_challenge','bytes':len(raw)}
            if kind=='document' and spec.get('document_number') and spec['document_number'].casefold() not in text.casefold():
                raise ValueError('Document body does not contain its source-native document number')
            if not plain:plain=text[:16000]
            title=spec.get('title') or ', '.join(spec.get('route_ids',[])) or spec['url']
            ident=sha((task['id']+'|'+capture['sha256']).encode())
            with c:
                added=upsert_document(c,ident=ident,origin='acquired',locator=url,source_hash=capture['sha256'],position='body',kind=kind,
                    estates=json.loads(task['estates']),title=title,body=plain,record_date=spec.get('record_date'),review='source_gateway_only' if kind=='route' else 'unreviewed_full_text',
                    payload={'source':capture['url'],'scope':'gateway_not_corpus' if kind=='route' else 'body_requires_source_specific_parsing','original_sha256':capture['sha256']})
                c.execute("UPDATE tasks SET status=?,pages=pages+1,rows_seen=rows_seen+1,updated=? WHERE id=?",('gateway_captured_adapter_needed' if kind=='route' else 'body_captured',utc(),task['id']))
            return {'id':task['id'],'lane':lane,'status':'gateway_captured_adapter_needed' if kind=='route' else 'body_captured','added':added,'bytes':len(raw)}
        payload=normalize_source_results(kind,json.loads(raw))
        if kind=='federal_register_detail':
            if payload.get('document_number')!=spec['document_number']:raise ValueError('Official document detail identity mismatch')
            payload={'results':[payload],'detail_complete':True}
        if not isinstance(payload.get('results'),list):raise ValueError('Unexpected source result schema')
        rows=len(payload['results']);expected=None
        if kind=='govuk':
            for record in payload['results']:
                stamp=record.get('public_timestamp')
                if not isinstance(stamp,str) or not spec['start']<=stamp[:10]<=spec['end']:
                    raise ValueError('GOV.UK returned an undated or out-of-window record; date filtering must be repaired')
        if kind=='federal_register_detail':
            more=False;expected=1
        elif kind=='award':
            metadata=payload.get('page_metadata',{})
            if metadata.get('page')!=page or type(metadata.get('hasNext')) is not bool:raise ValueError('Missing source pagination proof')
            more=metadata['hasNext']
        elif kind=='federal_register':
            expected=payload.get('count')
            if not isinstance(expected,int):raise ValueError('Missing declared result count')
            more=bool(payload.get('next_page_url'))
            if not more and task['rows_seen']+rows<expected:
                # FR caps pages. Subdivide the date window instead of calling its capped response complete.
                start=dt.date.fromisoformat(spec['start']);end=dt.date.fromisoformat(spec['end'])
                if (end-start).days>0:
                    midpoint=start+dt.timedelta(days=(end-start).days//2)
                    with c:
                        for first,last in [(start,midpoint),(midpoint+dt.timedelta(days=1),end)]:
                            sub={**spec,'start':first.isoformat(),'end':last.isoformat()};add_task(c,lane,kind,sub,json.loads(task['estates']),'p-')
                        c.execute("UPDATE tasks SET status='split_for_source_cap',expected=?,error=?,updated=? WHERE id=?",(expected,'Result cap reached; child windows retain missing history',utc(),task['id']))
                    return {'id':task['id'],'status':'split_for_source_cap','expected':expected}
                raise ValueError('Single-day source cap: requires bulk/archive adapter')
        else:
            expected=payload.get('total')
            if not isinstance(expected,int):raise ValueError('Missing GOV.UK result count')
            more=task['rows_seen']+rows<expected
        if more and rows==0:raise ValueError('Source reports more pages but returned no rows')
        # Detect an ignored/looping page before advancing its cursor.
        if page>1 and c.execute('SELECT 1 FROM captures WHERE task_id=? AND sha256=? AND id<>?',(task['id'],capture['sha256'],capture['id'])).fetchone():
            raise ValueError('Repeated source page; cursor would not make progress')
        with c:
            added=documents_from_capture(c,task,capture,payload)
            c.execute('UPDATE tasks SET status=?,cursor=cursor+1,pages=pages+1,rows_seen=rows_seen+?,expected=?,error=NULL,updated=? WHERE id=?',
                      ('partial' if more else 'query_exhausted',rows,expected,utc(),task['id']))
        return {'id':task['id'],'lane':lane,'kind':kind,'status':'partial' if more else 'query_exhausted','source_rows':rows,'added':added,'page':page,'bytes':len(raw)}
    except Exception as e:
        with c:c.execute("UPDATE tasks SET status='repair_required',attempts=attempts+1,error=?,updated=? WHERE id=?",(str(e)[:700],utc(),task['id']))
        return {'id':task['id'],'lane':lane,'status':'repair_required','error':str(e)[:500]}
    finally:c.close()


def cycle(state,seconds=720,requests=450,lanes=('sources','awards','policy')):
    # A fixed resource quantum, not a campaign stopping condition. Next invocation resumes cursors.
    with lock(state,'acquisition'):
        c=connect(state)
        import ecology_sources,ecology_expansion_plan
        ecology_sources.ensure(c)
        with c:
            seed_legacy_federal_register_issues(c)
            expansion=ecology_expansion_plan.seed(c,ROOT)
            if not expansion.get('reused'): print(j({'historical_expansion':expansion}),flush=True)
            c.execute("UPDATE tasks SET status='partial' WHERE status='running'")
        c.close()
        start=time.monotonic();deadline=start+seconds;budget=threading.Lock();used=0;results=[]
        rid='run-'+dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S')+'-'+str(os.getpid())
        c=connect(state)
        with c:c.execute('INSERT INTO runlog VALUES(?,?,?,?,?)',(rid,utc(),None,'running','{}'))
        c.close()
        def worker(lane):
            nonlocal used
            out=[]; recurring={}
            while time.monotonic()<deadline:
                with budget:
                    if used>=requests:break
                    used+=1
                item=step(state,lane)
                if item is None:break
                out.append(item)
                if item.get('status')=='repair_required':
                    signature=item.get('error','')
                    recurring[signature]=recurring.get(signature,0)+1
                    if recurring[signature]>=3:
                        print(j({'lane':lane,'stopped_repeated_internal_failure':signature}),flush=True);break
                if len(out)%10==0: print(j({'lane':lane,'steps':len(out),'last':item}),flush=True)
                time.sleep(.25)
            return out
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(3,len(lanes))) as pool:
            for future in concurrent.futures.as_completed([pool.submit(worker,l) for l in lanes]):results.extend(future.result())
        summary={'run_id':rid,'steps':len(results),'requests_budget':requests,'seconds':round(time.monotonic()-start,2),
                 'added':sum(x.get('added',0) for x in results),'source_rows':sum(x.get('source_rows',0) for x in results),
                 'blockers':sum(x['status'] in ('repair_required','source_blocked') for x in results)}
        atomic(Path(state)/'runs'/ (rid+'.json'),json.dumps({'summary':summary,'results':results},indent=2)+'\n')
        c=connect(state)
        with c:c.execute('UPDATE runlog SET ended=?,status=?,summary=? WHERE id=?',(utc(),'completed',j(summary),rid))
        c.close();report(state);return summary


def estate_paths(repo):
    mapping=[]
    for p in (repo/'data/estates/definitions').glob('*.json'):
        d=load(p)
        for ref in d.get('asset_refs',[]):
            rp=ref.get('path')
            if not rp:continue
            # case/manifest/harness references own their containing corpus, except shared global registries.
            if rp.startswith(('cases/','data/intake/','data/research-tracks/')):rp=str(Path(rp).parent)
            mapping.append((rp,d['estate_id']))
    return mapping


def index_retained(repo,state):
    with lock(state,'index'):
        c=connect(state);mappings=estate_paths(repo)
        paths=subprocess.check_output(['git','-C',str(repo),'ls-files','-z']).decode().split('\0')
        approved=set(load(repo/'data/project/publication-allowlist.json')['paths'])
        choices=[p for p in paths if p in approved and p.startswith(('data/','cases/','receipts/','archive/','docs/','build/','reports/')) and Path(p).suffix in ('.json','.jsonl','.md','.txt','.csv') and 'arcadia' not in p.lower()]
        counts={'scope':'existing_publication_allowlist_only_excluding_private_support','files_seen':len(choices),'files_indexed':0,'reused':0,'rows_added':0,'held_files':0,'excluded_private_support':0}
        for relative in choices:
            p=repo/relative
            if not p.is_file():continue
            if 'linkedin' in relative.lower() or '/private' in relative.lower():
                counts['excluded_private_support']+=1;continue
            if p.stat().st_size>32*1024*1024:
                with c:c.execute('INSERT OR REPLACE INTO files VALUES(?,?,?,?,?,?,?)',(relative,None,p.stat().st_size,0,'bulk_adapter_required','File exceeds 32 MiB per-file parser budget',utc()))
                counts['held_files']+=1;continue
            raw=p.read_bytes();h=sha(raw)
            old=c.execute('SELECT sha256,status FROM files WHERE path=?',(relative,)).fetchone()
            if old and old['sha256']==h and old['status']=='indexed':counts['reused']+=1;continue
            estates=sorted(set(e for prefix,e in mappings if relative==prefix or relative.startswith(prefix.rstrip('/')+'/')))
            text=raw.decode('utf-8',errors='replace');items=[]
            try:
                if p.suffix=='.jsonl':items=[(str(n),json.loads(line)) for n,line in enumerate(text.splitlines(),1) if line.strip()]
                elif p.suffix=='.json':
                    d=json.loads(text)
                    if isinstance(d,list):items=[('/'+str(i),x) for i,x in enumerate(d)]
                    elif isinstance(d,dict):
                        items=[('/',{k:v for k,v in d.items() if not isinstance(v,(list,dict))})]
                        for key,value in d.items():
                            if isinstance(value,list) and len(value):items.extend(('/'+key+'/'+str(i),x) for i,x in enumerate(value))
                            elif isinstance(value,dict):items.append(('/'+key,value))
                    else:items=[('/',d)]
                else:items=[('text',text)]
                added=0
                with c:
                    for position,value in items:
                        if isinstance(value,dict):
                            title=value.get('label') or value.get('title') or value.get('name') or value.get('canonical_name') or value.get('plain') or value.get('claim_id') or relative
                            stamp=next((value[k] for k in ('event_date','valid_from','time_start','publication_date','date') if isinstance(value.get(k),str)),None)
                            review=value.get('verification_status') or value.get('claim_status') or value.get('status') or 'retained_unreviewed'
                        else:title=relative;stamp=None;review='retained_unreviewed'
                        body=value if isinstance(value,str) else j(value)
                        ident=sha((relative+'|'+h+'|'+position).encode())
                        added+=upsert_document(c,ident=ident,origin='retained',locator=relative,source_hash=h,position=position,kind='retained_'+p.suffix[1:],estates=estates,
                            title=title,body=body,record_date=stamp,review=str(review),payload={'source_file':relative,'sha256':h,'position':position,'full_original_resides_at':str(p)})
                    c.execute('INSERT OR REPLACE INTO files VALUES(?,?,?,?,?,?,?)',(relative,h,len(raw),len(items),'indexed',None,utc()))
                counts['files_indexed']+=1;counts['rows_added']+=added
            except Exception as e:
                with c:c.execute('INSERT OR REPLACE INTO files VALUES(?,?,?,?,?,?,?)',(relative,h,len(raw),0,'parse_repair_required',str(e)[:500],utc()))
                counts['held_files']+=1
            if counts['files_indexed'] and counts['files_indexed']%200==0:print(j(counts),flush=True)
        c.close();atomic(Path(state)/'retained-index-result.json',json.dumps(counts,indent=2)+'\n');report(state);return counts


def report(state):
    c=connect(state)
    metadata={x['key']:json.loads(x['value']) for x in c.execute('SELECT * FROM metadata')}
    tasks=[dict(x) for x in c.execute('SELECT id,lane,kind,estates,status,cursor,pages,rows_seen,expected,error FROM tasks')]
    counts={}
    for t in tasks:counts[t['status']]=counts.get(t['status'],0)+1
    estates=[]
    for e in c.execute('SELECT * FROM estates ORDER BY id'):
        assigned=[t for t in tasks if e['id'] in json.loads(t['estates'])]
        status={}
        for t in assigned:status[t['status']]=status.get(t['status'],0)+1
        docs=c.execute('SELECT count(*) FROM documents WHERE estates LIKE ?',('%"'+e['id']+'"%',)).fetchone()[0]
        estates.append({'id':e['id'],'label':e['label'],'phases':json.loads(e['phases']),'tasks':len(assigned),'task_states':status,'indexed_records':docs,'estate_complete':False})
    summary={'schema':SCHEMA,'built_at':utc(),'horizon_start':metadata.get('horizon_start'),'cutoff':metadata.get('cutoff'),
        'estates':estates,'cohort_counts':metadata.get('cohort_counts'),'task_states':counts,
        'source_captures':c.execute('SELECT count(*) FROM captures').fetchone()[0],
        'source_bytes':c.execute('SELECT coalesce(sum(bytes),0) FROM captures').fetchone()[0],
        'indexed_records':c.execute('SELECT count(*) FROM documents').fetchone()[0],
        'new_source_records':c.execute("SELECT count(*) FROM documents WHERE origin='acquired'").fetchone()[0],
        'retained_records':c.execute("SELECT count(*) FROM documents WHERE origin='retained'").fetchone()[0],
        'future_dated_observations':c.execute('SELECT count(*) FROM commitments').fetchone()[0],
        'retained_files':c.execute("SELECT count(*) FROM files WHERE status='indexed'").fetchone()[0],
        'file_holds':[dict(x) for x in c.execute("SELECT path,status,error FROM files WHERE status<>'indexed'")],
        'source_gaps':[dict(x) for x in c.execute('SELECT * FROM source_gaps')],
        'recent_runs':[dict(x) for x in c.execute('SELECT * FROM runlog ORDER BY started DESC LIMIT 5')],
        'backlog_exhausted':False,'public_site_changed':False,'boundary':BOUNDARY}
    # No universal completion verdict: gateway tasks require adapters and topic searches require review.
    sample=[dict(x) for x in c.execute('SELECT id,title,locator,record_date,kind,review FROM documents ORDER BY rowid DESC LIMIT 150')]
    c.close();atomic(Path(state)/'STATUS.json',json.dumps(summary,indent=2)+'\n')
    cards=''.join('<tr><td>'+html.escape(x['label'])+'</td><td>'+str(x['indexed_records'])+'</td><td>'+str(x['task_states'].get('ready',0)+x['task_states'].get('partial',0)+x['task_states'].get('running',0))+'</td><td>'+str(x['task_states'].get('query_exhausted',0))+'</td><td>'+str(x['task_states'].get('source_blocked',0)+x['task_states'].get('repair_required',0))+'</td></tr>' for x in estates)
    encoded=json.dumps({'rows':sample,'tasks':tasks},ensure_ascii=False).replace('<','\\u003c')
    page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Clifford / Ecology Backlog</title><style>
    :root{color-scheme:dark}*{box-sizing:border-box}main,main>*{min-width:0;max-width:100%}p,td,th,summary,footer{overflow-wrap:anywhere}body{margin:0;background:#0c171d;color:#e7e8df;font:14px/1.6 system-ui}main{max-width:1300px;margin:auto;padding:35px 5vw}h1{font:48px/1.1 Georgia;margin:15px 0;color:#dfc19a}h2{font:29px Georgia}p{color:#b0c1bd}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}.stats div{border:1px solid #344a4b;padding:18px}.stats b{display:block;font:34px Georgia;color:#dfc19a}small{color:#91ada7}table{border-collapse:collapse;width:100%;margin:28px 0}td,th{padding:10px;border-bottom:1px solid #314645;text-align:left}input,select{padding:10px;background:#183036;color:#eee;border:1px solid #45605f;min-width:200px}li{padding:9px 0;overflow-wrap:anywhere}a{color:#c3dcc9}code{color:#d5bb8b}details{border:1px solid #314645;padding:14px;margin:20px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px}footer{color:#94aaa5;font-size:11px}@media(max-width:700px){.stats{grid-template-columns:repeat(2,1fr)}h1{font-size:34px}table{font-size:10px}td,th{padding:6px}}</style><main><small>CLIFFORD NUMBER / 24-ESTATE HISTORICAL ACQUISITION</small><h1>Drain the backlog.<br>Preserve the record.</h1><p>1991 onward. Existing corpus recovery, historical source acquisition and future-dated commitments have separate acceptance. The counters below measure captured work, not universal completeness.</p>'''
    page+='<div class="stats">'+''.join('<div><b>'+str(value)+'</b><small>'+label+'</small></div>' for label,value in [('Indexed records',summary['indexed_records']),('Source captures',summary['source_captures']),('New-source records',summary['new_source_records']),('Future-dated records',summary['future_dated_observations'])])+'</div>'
    page+='<p>Snapshot '+html.escape(summary['built_at'])+' · '+html.escape(j(counts))+'</p><table><thead><tr><th>Research estate</th><th>Indexed</th><th>Queued / active</th><th>Queries exhausted</th><th>Source / adapter holds</th></tr></thead><tbody>'+cards+'</tbody></table><h2>Recent indexed records</h2><p>This portable view shows the latest 150 records. The complete local SQLite FTS index is searchable with the adjacent command launcher or the native search command.</p><input id="q" placeholder="Filter visible records" aria-label="Filter visible records"><ul id="records"></ul><details><summary>Source and chronology gaps</summary><pre>'+html.escape(json.dumps(summary['source_gaps'],indent=2))+'</pre></details><details><summary>Task state and extraction holds</summary><pre id="tasks"></pre></details><footer>'+html.escape(BOUNDARY)+'</footer></main><script>const D='+encoded+';const $=x=>document.getElementById(x);function show(){const q=$("q").value.toLowerCase();$("records").replaceChildren();for(const r of D.rows.filter(x=>JSON.stringify(x).toLowerCase().includes(q))){const li=document.createElement("li");li.textContent=r.title+" | "+r.kind+" | "+(r.record_date||"date not resolved")+" | "+r.locator;$("records").append(li)}}$("q").addEventListener("input",show);$("tasks").textContent=JSON.stringify(D.tasks,null,2);show()</script></html>'
    atomic(Path(state)/'index.html',page);return {k:v for k,v in summary.items() if k not in ('estates','source_gaps','recent_runs','file_holds')}


def verify_state(state):
    c=connect(state);issues=[];checked=0
    integrity=c.execute('PRAGMA integrity_check').fetchone()[0]
    if integrity!='ok':issues.append(integrity)
    for x in c.execute('SELECT * FROM captures WHERE path IS NOT NULL'):
        p=(Path(state)/x['path']).resolve()
        if not p.is_relative_to(Path(state).resolve()) or not p.is_file() or p.stat().st_size!=x['bytes'] or sha(p.read_bytes())!=x['sha256']:
            issues.append('capture '+x['id'])
        checked+=1
    docs=c.execute('SELECT count(*) FROM documents').fetchone()[0];fts=c.execute('SELECT count(*) FROM search').fetchone()[0]
    if docs!=fts:issues.append('FTS/document count mismatch')
    future=c.execute('SELECT count(*) FROM commitments WHERE state<>?',('announced_or_scheduled_not_observed_fulfilled',)).fetchone()[0]
    if future:issues.append('Future observations promoted')
    c.close();result={'status':'PASS' if not issues else 'FAIL','checked_captures':checked,'documents':docs,'fts_rows':fts,'issues':issues,'source_truth_validated':False,'human_review_granted':False}
    atomic(Path(state)/'VERIFICATION.json',json.dumps(result,indent=2)+'\n');return result


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('command',choices=['init','cycle','index','status','verify','search']);p.add_argument('--repo',type=Path,default=ROOT);p.add_argument('--state',type=Path,required=True)
    p.add_argument('--cutoff',default='2026-11-02');p.add_argument('--seconds',type=int,default=720);p.add_argument('--requests',type=int,default=450);p.add_argument('--lanes',default='sources,awards,policy');p.add_argument('--query');p.add_argument('--limit',type=int,default=25);a=p.parse_args()
    state=a.state.resolve();repo=a.repo.resolve()
    if a.command=='init':result=initialize(repo,state,a.cutoff)
    elif a.command=='cycle':
        if not 1<=a.seconds<=3600 or not 1<=a.requests<=3000:raise ValueError('Finite work quantum required')
        lanes=tuple(a.lanes.split(','))
        if not lanes or len(lanes)>3 or any(x not in ('sources','awards','policy') for x in lanes):raise ValueError('Unknown lane')
        result=cycle(state,a.seconds,a.requests,lanes)
    elif a.command=='index':result=index_retained(repo,state)
    elif a.command=='verify':result=verify_state(state)
    elif a.command=='search':
        if not a.query or len(a.query)>300 or not 1<=a.limit<=100:raise ValueError('Bounded query required')
        c=connect(state);expression=' AND '.join('"'+t.replace('"','""')+'"' for t in a.query.split())
        result=[dict(x) for x in c.execute('SELECT d.id,d.title,d.locator,d.position,d.kind,d.record_date,d.review,substr(d.body,1,1200) AS excerpt FROM search s JOIN documents d ON d.id=s.id WHERE search MATCH ? ORDER BY bm25(search) LIMIT ?',(expression,a.limit))];c.close()
    else:result=report(state)
    print(json.dumps(result,ensure_ascii=False,indent=2))
    if isinstance(result,dict) and result.get('status')=='FAIL':return 1
    return 0
if __name__=='__main__':
    try:raise SystemExit(main())
    except Exception as exc:print(j({'status':'failed','error':type(exc).__name__+': '+str(exc)}),file=sys.stderr);raise SystemExit(1)
