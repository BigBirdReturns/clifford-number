import os
"""Regression checks derived from actual captured records, not invented source facts."""
import importlib.util,json,sqlite3,tempfile,unittest,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('ecology_backlog',ROOT/'tools/ecology_backlog.py')
eb=importlib.util.module_from_spec(spec);spec.loader.exec_module(eb)
LIVE=Path(os.environ['CLIFFORD_ECOLOGY_STATE']).resolve() if os.environ.get('CLIFFORD_ECOLOGY_STATE') else next((p/'sessions/integrity-acquisition-20261102/ecology' for p in [ROOT.parent,ROOT.parent.parent] if (p/'sessions/integrity-acquisition-20261102/ecology').is_dir()),ROOT.parent/'sessions/integrity-acquisition-20261102/ecology')

class TestBacklog(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.state=Path(self.tmp.name);self.c=eb.connect(self.state)
        with self.c:self.c.execute('INSERT INTO metadata VALUES(?,?)',('cutoff',json.dumps('2026-11-02')))
    def tearDown(self):self.c.close();self.tmp.cleanup()
    def insert(self,**kwargs):
        d={'ident':'x','origin':'acquired','locator':'https://example.gov/source','source_hash':'0'*64,'position':'/0','kind':'test','estates':[],
           'title':'Native source test','body':'Preserved content','record_date':None,'review':'candidate_only','payload':{'graph_effect':'none'}}
        d.update(kwargs)
        with self.c:return eb.upsert_document(self.c,**d)
    def test_sql_column_boundary_real_function(self):
        self.assertEqual(self.insert(),1)
        self.assertEqual(self.c.execute('SELECT count(*) FROM documents').fetchone()[0],1)
        self.assertEqual(self.c.execute('SELECT count(*) FROM search').fetchone()[0],1)
    def test_reused_identity_does_not_duplicate(self):
        self.insert();self.assertEqual(self.insert(),0)
    def test_full_source_text_not_silently_truncated(self):
        text='preserved '*4000;self.insert(body=text)
        self.assertEqual(self.c.execute('SELECT body FROM documents').fetchone()[0],text)
    def test_search_keeps_native_review(self):
        self.insert()
        row=self.c.execute('SELECT d.review FROM search s JOIN documents d ON d.id=s.id WHERE search MATCH ?',('"Preserved"',)).fetchone()
        self.assertEqual(row[0],'candidate_only')
    def test_private_address_refused(self):
        with self.assertRaises(ValueError):eb.safe_url('http://127.0.0.1/')
    def test_credentials_in_url_refused(self):
        with self.assertRaises(ValueError):eb.safe_url('https://user:secret@example.com/')
    def test_file_protocol_refused(self):
        with self.assertRaises(ValueError):eb.safe_url('file:///etc/passwd')
    def test_html_removes_executable_content_from_text(self):
        p=eb.Text();p.feed('<p>Public record</p><script>erase everything</script><style>secret</style>')
        self.assertEqual(p.result(),'Public record')
    def test_task_is_reused(self):
        with self.c:
            x=eb.add_task(self.c,'policy','federal_register',{'term':'document','start':'1994-01-01','end':'1994-12-31'},['regulatory-markets-estate'])
            y=eb.add_task(self.c,'policy','federal_register',{'term':'document','start':'1994-01-01','end':'1994-12-31'},['regulatory-markets-estate'])
        self.assertEqual(x,y);self.assertEqual(self.c.execute('SELECT count(*) FROM tasks').fetchone()[0],1)
    def test_document_locator_reuse_across_keyword_queries(self):
        with self.c:
            a=eb.add_task(self.c,'sources','document',{'url':'https://example.gov/document/1','parent_capture':'a','title':'same'},['us-defense-estate'])
            b=eb.add_task(self.c,'sources','document',{'url':'https://example.gov/document/1','parent_capture':'b','title':'same'},['us-defense-estate'])
        self.assertEqual(a,b)
    def test_one_exhausted_query_never_completes_ecology(self):
        self.assertFalse(eb.report(self.state)['backlog_exhausted'])
    def test_actual_award_capture_replay_and_future_semantics(self):
        live=sqlite3.connect('file:'+str(LIVE/'ecology.sqlite')+'?mode=ro',uri=True);live.row_factory=sqlite3.Row
        source=live.execute("SELECT c.*,t.spec,t.estates,t.kind FROM captures c JOIN tasks t ON t.id=c.task_id WHERE t.kind='award' AND c.status=200 AND c.bytes>2000 LIMIT 1").fetchone()
        self.assertIsNotNone(source);raw=(LIVE/source['path']).read_bytes();self.assertEqual(eb.sha(raw),source['sha256'])
        task={'kind':source['kind'],'spec':source['spec'],'estates':source['estates']}
        payload=json.loads(raw);capture=dict(source)
        with self.c:first=eb.documents_from_capture(self.c,task,capture,payload);second=eb.documents_from_capture(self.c,task,capture,payload)
        self.assertGreater(first,0);self.assertEqual(second,0)
        self.assertEqual(self.c.execute("SELECT count(*) FROM documents WHERE review<>'candidate_only'").fetchone()[0],0)
        self.assertEqual(self.c.execute("SELECT count(*) FROM commitments WHERE state<>'announced_or_scheduled_not_observed_fulfilled'").fetchone()[0],0)
        live.close()
    def test_real_access_page_cannot_be_full_text(self):
        live=sqlite3.connect('file:'+str(LIVE/'ecology.sqlite')+'?mode=ro',uri=True);live.row_factory=sqlite3.Row
        x=live.execute("SELECT url,path FROM captures WHERE url LIKE 'https://unblock.federalregister.gov/%' LIMIT 1").fetchone()
        self.assertIsNotNone(x);raw=(LIVE/x['path']).read_bytes()
        self.assertTrue(eb.is_access_challenge(x['url'],raw));live.close()
    def test_official_detail_enqueues_only_published_machine_text(self):
        p=LIVE/'source-adapter-probes/federal-register-94-5437.json';raw=p.read_bytes();record=json.loads(raw)
        task={'kind':'federal_register_detail','spec':json.dumps({'document_number':record['document_number']}),'estates':json.dumps(['regulatory-markets-estate'])}
        capture={'url':'https://www.federalregister.gov/api/v1/documents/94-5437.json','sha256':eb.sha(raw),'at':eb.utc()}
        with self.c:n=eb.documents_from_capture(self.c,task,capture,{'results':[record]})
        self.assertEqual(n,1)
        nextrow=self.c.execute("SELECT kind,spec FROM tasks").fetchone()
        self.assertEqual(nextrow['kind'],'document');self.assertEqual(json.loads(nextrow['spec'])['url'],record['raw_text_url'])
        self.assertNotEqual(json.loads(nextrow['spec'])['url'],record['html_url'])
    def test_tamper_is_detected(self):
        raw=b'actual fixture bytes for hash-boundary mutation';h=eb.sha(raw);file='bodies/'+h+'.body';eb.atomic(self.state/file,raw)
        cap={'id':'t','task_id':'t','url':'https://example.gov','request':'{}','status':200,'path':file,'sha256':h,'bytes':len(raw),'at':eb.utc(),'error':None}
        with self.c:self.c.execute('INSERT INTO captures VALUES(:id,:task_id,:url,:request,:status,:path,:sha256,:bytes,:at,:error)',cap)
        self.assertEqual(eb.verify_state(self.state)['status'],'PASS');(self.state/file).write_bytes(raw+b'bad')
        self.assertEqual(eb.verify_state(self.state)['status'],'FAIL')

    def test_legacy_1991_issue_mods_is_issue_metadata_only(self):
        raw=b"""<mods xmlns="http://www.loc.gov/mods/v3"><originInfo><dateIssued>1991-01-02</dateIssued></originInfo><recordInfo><recordIdentifier>FR-1991-01-02</recordIdentifier></recordInfo><relatedItem><location><url displayLabel="PDF rendition">https://www.govinfo.gov/content/pkg/FR-1991-01-02/pdf/FR-1991-01-02.pdf</url></location></relatedItem><note>digitized issue, not individual document full text</note></mods>"""
        m=eb.parse_legacy_federal_register_mods(raw,'1991-01-02')
        self.assertEqual(m['native_id'],'FR-1991-01-02')
        self.assertEqual(m['content_state'],'official_issue_metadata_only_pdf_not_acquired_or_read')
        with self.assertRaises(ValueError):
            eb.parse_legacy_federal_register_mods(raw,'1991-01-03')
    def test_legacy_issue_work_is_oldest_first(self):
        with self.c:
            eb.seed_legacy_federal_register_issues(self.c)
        sql="SELECT json_extract(spec,'$.date') FROM tasks WHERE kind='federal_register_legacy_issue' ORDER BY pages,COALESCE(json_extract(spec,'$.start'),json_extract(spec,'$.record_date'),json_extract(spec,'$.date'),'0000'),updated,id LIMIT 2"
        days=[x[0] for x in self.c.execute(sql)]
        self.assertEqual(days,['1991-01-01','1991-01-02'])
    def test_1991_1993_legacy_seed_is_idempotent(self):
        with self.c:
            first=eb.seed_legacy_federal_register_issues(self.c)
            second=eb.seed_legacy_federal_register_issues(self.c)
        self.assertEqual(first,784);self.assertEqual(second,0)
        self.assertEqual(self.c.execute("SELECT count(*) FROM tasks WHERE kind='federal_register_legacy_issue'").fetchone()[0],784)
        self.assertEqual(self.c.execute("SELECT status FROM tasks WHERE kind='federal_register_legacy_issue' LIMIT 1").fetchone()[0],'ready')

if __name__=='__main__':unittest.main(verbosity=2)
