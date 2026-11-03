import os
import copy,json,pathlib,sys,tempfile,unittest,xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
import ecology_backlog as b,ecology_sources as s,ecology_expansion_plan as plan,ecology_reconcile as rec
LIVE=pathlib.Path(os.environ['CLIFFORD_ECOLOGY_STATE']).resolve() if os.environ.get('CLIFFORD_ECOLOGY_STATE') else next((p/'sessions/integrity-acquisition-20261102/ecology' for p in [ROOT.parent,ROOT.parent.parent] if (p/'sessions/integrity-acquisition-20261102/ecology').is_dir()),ROOT.parent/'sessions/integrity-acquisition-20261102/ecology')
FIX=LIVE/'expansion-canary'
class Expansion(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.state=pathlib.Path(self.tmp.name);self.c=b.connect(self.state)
 def tearDown(self):self.c.close();self.tmp.cleanup()
 def test_task_union_preserves_both_estates(self):
  spec={'url':'https://www.govinfo.gov/example'}
  with self.c:
   a=b.add_task(self.c,'sources','document',spec,['estate-a'],'t-');z=b.add_task(self.c,'sources','document',spec,['estate-b'],'t-')
  self.assertEqual(a,z);self.assertEqual(json.loads(self.c.execute('select estates from tasks').fetchone()[0]),['estate-a','estate-b']);self.assertEqual(self.c.execute('select count(*)from tasks').fetchone()[0],1)
 def test_document_union_does_not_duplicate_fts(self):
  kw=dict(ident='x',origin='acquired',locator='https://source.test/document',source_hash='a'*64,position='1',kind='document',title='Actual reference',body='source text',record_date='1991-01-01',review='candidate_only',payload={})
  with self.c:
   self.assertEqual(b.upsert_document(self.c,estates=['a'],**kw),1);self.assertEqual(b.upsert_document(self.c,estates=['b'],**kw),0)
  row=self.c.execute('select * from documents').fetchone();self.assertEqual(json.loads(row['estates']),['a','b']);self.assertEqual(row['review'],'candidate_only');self.assertEqual(self.c.execute('select count(*)from search').fetchone()[0],1)
 def test_breadth_exact24_and_idempotent(self):
  with self.c:
   self.c.execute('insert into metadata values(?,?)',('cutoff',b.j('2026-11-02')));one=plan.seed(self.c,ROOT);n=self.c.execute('select count(*)from tasks').fetchone()[0];two=plan.seed(self.c,ROOT)
  self.assertEqual(len(one['estates']),24);self.assertGreater(n,1500);self.assertEqual(two,{'reused':True});self.assertEqual(n,self.c.execute('select count(*)from tasks').fetchone()[0]);self.assertFalse(one['whole_ecology_complete'])
 def test_plan_has_no_private_index_or_scheduler(self):
  text=(ROOT/'tools/ecology_expansion_plan.py').read_text();self.assertNotIn('index_retained(',text);self.assertNotIn('subprocess',text);self.assertNotIn('cron',text)
 def test_bulk_oversize_refused_before_request(self):
  with self.assertRaises(ValueError):s.bulk(self.state,'x','https://example.org/data',s.MAX_BULK_BYTES+1)
 def test_bulk_partial_never_promoted(self):
  self.assertIn('Interrupted transfer requires disposition',(ROOT/'tools/ecology_sources.py').read_text())
 def test_actual_1991_statutes(self):
  rows=list(s.parse_statutes(FIX/'STATUTE-105.xml',105));self.assertEqual(len(rows),243);self.assertEqual(len({x['native_id']for x in rows}),243);self.assertTrue(all(x['record_date'].startswith('1991-')for x in rows))
  law=next(x for x in rows if x['public_law_id']=='102-190');self.assertEqual(law['record_date'],'1991-12-05');self.assertEqual(law['citation'],'105 Stat. 1290');self.assertGreater(len(law['body']),100000)
 def test_actual_source_identifier_conflict_is_preserved(self):
  rows=[x for x in s.parse_statutes(FIX/'STATUTE-105.xml',105)if x['identity_state']=='source_identifier_collision'];self.assertEqual(len(rows),2);self.assertEqual({x['public_law_id']for x in rows},{'102-238'});self.assertEqual(len({x['citation']for x in rows}),2);self.assertEqual(len({x['native_id']for x in rows}),2)
 def test_missing_source_statute_page_retained_without_invented_citation(self):
  source=self.state/'realistic.xml'
  ns=s.NS
  root=ET.Element(ns+'statutesAtLarge');meta=ET.SubElement(root,ns+'meta');ET.SubElement(meta,ns+'volume').text='125'
  for number,citation in [('1',None),('2','125 Stat. 14')]:
   law=ET.SubElement(root,ns+'pLaw');m=ET.SubElement(law,ns+'meta')
   for tag,val in [('publicPrivate','public'),('congress','112'),('docNumber',number),('approvedDate','2011-01-31'),('title','Public Law 112-'+number),('citableAs',citation)]:
    if val is not None:ET.SubElement(m,ns+tag).text=val
   ET.SubElement(law,ns+'section').text='Authentic full body in the source'
  ET.ElementTree(root).write(source,encoding='utf-8',xml_declaration=True)
  rows=list(s.parse_statutes(source,125));self.assertEqual(len(rows),2)
  self.assertIsNone(rows[0]['citation']);self.assertEqual(rows[0]['citation_state'],'source_citation_missing')
  self.assertEqual(rows[0]['identity_state'],'source_citation_missing')
  self.assertIn('MISSING-SOURCE-CITATION:112-1:',rows[0]['native_id'])
  self.assertEqual(rows[0]['meta']['docNumber'],'1');self.assertIn('Authentic full body',rows[0]['body'])
  self.assertEqual(rows[1]['citation'],'125 Stat. 14');self.assertEqual(rows[1]['identity_state'],'source_identifier_unique_within_volume')
  self.assertEqual(len({r['native_id']for r in rows}),2)
 def test_missing_citation_never_implicitly_accepted_as_unique_identity(self):
  source=self.state/'duplicate.xml';ns=s.NS
  root=ET.Element(ns+'statutesAtLarge');meta=ET.SubElement(root,ns+'meta');ET.SubElement(meta,ns+'volume').text='125'
  for citation in [None,'125 Stat. 14']:
   law=ET.SubElement(root,ns+'pLaw');m=ET.SubElement(law,ns+'meta')
   for tag,val in [('publicPrivate','public'),('congress','112'),('docNumber','1'),('approvedDate','2011-01-31'),('citableAs',citation)]:
    if val is not None:ET.SubElement(m,ns+tag).text=val
  ET.ElementTree(root).write(source,encoding='utf-8')
  rows=list(s.parse_statutes(source,125))
  self.assertEqual([r['identity_state']for r in rows],['source_identifier_collision']*2)
  self.assertNotEqual(rows[0]['native_id'],rows[1]['native_id'])
 def test_citation_linkage_excludes_source_missing_page(self):
  text=(ROOT/'tools/ecology_citations.py').read_text()
  self.assertIn("x.get('identity_state')=='source_citation_missing'",text)
  self.assertIn("'source_citation_missing_excluded_ids':sorted(missing_page)",text)
 def test_wrong_statutory_volume_rejected(self):
  with self.assertRaises(ValueError):list(s.parse_statutes(FIX/'STATUTE-105.xml',106))
 def test_actual_parquet_dates_and_scope(self):
  q=s.parquet_summary(FIX/'199101.parquet','199101');self.assertEqual(q['rows'],31);self.assertEqual(q['outside_filename_month'],0);self.assertEqual(q['undated_rows'],0);self.assertIn('later source updates',q['interpretation'])
 def test_wrong_parquet_month_visible(self):self.assertEqual(s.parquet_summary(FIX/'199101.parquet','200001')['outside_filename_month'],31)
 def test_reference_namespaces_preserved(self):
  s.ensure(self.c)
  with self.c:s.ref(self.c,'one','us_public_law','102-238','https://source.test','h');s.ref(self.c,'two','ambiguous_source_public_law','102-238','https://source.test','h','source_asserted_identifier_collision')
  self.assertEqual(self.c.execute('select count(distinct target_namespace)from record_references').fetchone()[0],2)
 def test_query_strings_not_silently_merged(self):self.assertNotEqual(rec.urlkey('https://source.test/q?id=1'),rec.urlkey('https://source.test/q?id=2'))
 def test_non_web_source_locator_not_reinterpreted(self):self.assertIsNone(rec.urlkey('file:///private/evidence'))
 def test_existing_public_ledger_scope_is_explicit(self):
  text=(ROOT/'tools/ecology_reconcile.py').read_text();self.assertNotIn('rglob(',text);self.assertNotIn('index_retained(',text);self.assertIn("origin='acquired'",text)
if __name__=='__main__':unittest.main()
