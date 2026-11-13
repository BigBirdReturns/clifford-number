import pathlib,sys,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
import ecology_sources as s,ecology_citations as c
class SourceCapAndCitationReview(unittest.TestCase):
 def setUp(self):self.spec={'start':'1991-01-01','end':'1991-12-31'};self.task={'cursor':1,'rows_seen':0}
 def decide(self,total,rows=25,offset=1):return s.nsf_page_decision(self.spec,self.task,{'totalCount':total,'offset':offset,'rpp':25},[{}]*rows)
 def test_actual_ten_thousand_count_splits(self):
  d=self.decide(10000);self.assertEqual(d['state'],'split_for_source_cap');self.assertEqual(d['children'],[('1991-01-01','1991-07-02'),('1991-07-03','1991-12-31')])
 def test_single_day_cap_is_hold(self):
  self.spec['end']=self.spec['start'];self.assertEqual(self.decide(10000)['state'],'bulk_adapter_required')
 def test_source_count_exactly_boundary_is_not_claimed_exhaustive(self):self.assertEqual(self.decide(3000)['state'],'split_for_source_cap')
 def test_exact_declared_population_terminal(self):self.assertEqual(self.decide(25)['state'],'query_exhausted')
 def test_pending_source_rows_continue(self):self.assertEqual(self.decide(50)['state'],'partial')
 def test_wrong_page_identity_rejected(self):
  with self.assertRaises(ValueError):self.decide(50,offset=26)
 def test_early_empty_page_rejected(self):
  with self.assertRaises(ValueError):self.decide(50,rows=0)
 def test_truncated_short_page_rejected(self):
  with self.assertRaises(ValueError):self.decide(50,rows=3)
 def test_missing_source_count_rejected(self):
  with self.assertRaises(ValueError):s.nsf_page_decision(self.spec,self.task,{'offset':1,'rpp':25},[])
 def test_false_citation_is_source_bound_conflict(self):
  x=c.citation_review('102-123','792c7c334881ba171dfe908b9b7d40662fb409ab1f6ce01a6b3271db4a64f3d7');self.assertEqual(x['state'],'source_context_conflict');self.assertIn('heritage',x['reason'])
 def test_identifier_match_is_not_accepted_relationship(self):self.assertEqual(c.citation_review('102-190','sourcehash')['state'],'identifier_match_requires_context_review')
 def test_conflict_not_generalized_to_unseen_sources(self):self.assertEqual(c.citation_review('102-123','another-source')['state'],'identifier_match_requires_context_review')
class ActualFederalRegisterEmpty(unittest.TestCase):
 def test_actual_zero_result_shape(self):
  import ecology_backlog as b
  self.assertEqual(b.normalize_source_results('federal_register',{'description':'specific query','count':0}),{'description':'specific query','count':0,'results':[]})
 def test_unknown_positive_shape_not_reclassified(self):
  import ecology_backlog as b
  x={'count':12};self.assertEqual(b.normalize_source_results('federal_register',x),x)
 def test_other_provider_not_reclassified(self):
  import ecology_backlog as b
  x={'count':0};self.assertEqual(b.normalize_source_results('award',x),x)
 def test_boolean_not_source_count(self):
  import ecology_backlog as b
  x={'count':False};self.assertEqual(b.normalize_source_results('federal_register',x),x)

if __name__=='__main__':unittest.main()
