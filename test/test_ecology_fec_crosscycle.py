"""Independent source-body reproduction of cross-cycle FEC committee continuity."""
import hashlib,json,os,pathlib,sys,tempfile,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'tools'))
import ecology_fec_crosscycle as cc
STATE=pathlib.Path(os.environ['CLIFFORD_ECOLOGY_STATE'])
class OriginalCrossCycle(unittest.TestCase):
 def test_exact_source_replay_and_identity_only(self):
  with tempfile.TemporaryDirectory() as d:
   result=cc.derive(STATE,d)
   self.assertEqual([x['cycle'] for x in result['source_populations']],[1992,1994,1996])
   self.assertEqual([x['rows'] for x in result['source_populations']],[10759,10815,11075])
   file=pathlib.Path(result['artifact'])
   self.assertEqual(hashlib.sha256(file.read_bytes()).hexdigest(),result['artifact_sha256'])
   self.assertFalse(result['public_release'])
   self.assertTrue(result['no_graph_promotion'])
   self.assertEqual(result['counts']['continued_id_total'],result['verified_repeated_source_identifiers'])
   counts=0;seen=set()
   for line in file.read_text().splitlines():
    x=json.loads(line);counts+=1
    self.assertNotIn(x['source_native_committee_id'],seen);seen.add(x['source_native_committee_id'])
    self.assertTrue(len(x['cycles'])>=2)
    self.assertTrue(all(m['committee_id']==x['source_native_committee_id'] for m in x['cycle_records']))
    self.assertTrue(all(m['source_archive_sha256'] and m['source_line_sha256'] and m['source_url'] for m in x['cycle_records']))
    self.assertFalse(x['independent_review']);self.assertFalse(x['payment_or_money_flow_join'])
    self.assertEqual(x['graph_effect'],'none')
    self.assertFalse(any(k in x for k in ('donor','treasurer','address','employer','occupation','ownership_verified')))
   self.assertEqual(counts,result['verified_repeated_source_identifiers'])
   self.assertEqual(counts,10401)
   self.assertEqual(result['counts']['label_varied'],821)
   self.assertEqual(result['counts']['years_1992,1994,1996'],6765)
   self.assertGreater(result['counts']['label_varied'],0)
 def test_past_and_future_cycle_are_not_invented(self):
  self.assertEqual(cc.CYCLES,(1992,1994,1996))
  self.assertTrue(all(y%2==0 for y in cc.CYCLES))
if __name__=='__main__':unittest.main(verbosity=2)
