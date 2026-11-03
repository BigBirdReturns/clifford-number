"""Real official 1995-1996 source-cycle acceptance. Requires local source custody, read-only."""
import hashlib,json,os,pathlib,sys,tempfile,unittest,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
import ecology_fec as fec
import ecology_fec_reciprocal as reciprocal
STATE=pathlib.Path(os.environ["CLIFFORD_ECOLOGY_STATE"])
CAP=STATE/"expansion-canary"/"fec-1996"
EXPECTED={"committee":11075,"transaction":312193}
EXPECTED_SHA={"committee":"4678cf5ca9a78fc4fa3560abdf511a262a43eaee9d0d5a90d025162f28eaee28","transaction":"26cf201ea3a66e79e1aaf50b8c97e24b2119a23227ccf1f728fc946338180c0d"}
class RealOfficialFEC1996(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.original={}
  for kind in EXPECTED:
   fn,member,width=fec.source_spec(kind,1996)
   rec=CAP/("SOURCE-RECEIPT.json" if kind=="committee" else "OTHER-TRANSACTIONS-SOURCE-RECEIPT.json")
   cls.original[kind]=fec.read_zip(CAP/fn,rec,kind,1996)
   x=json.loads(rec.read_text())
   assert x["source_rows"]==EXPECTED[kind]
   assert x["sha256"]==EXPECTED_SHA[kind]==hashlib.sha256((CAP/fn).read_bytes()).hexdigest()
 def test_exact_original_source_rows_and_nonduplicated_ids(self):
  for kind,expected in EXPECTED.items():
   src=self.original[kind][0]
   rows=fec.committee_rows(src,1996) if kind=="committee" else fec.transaction_rows(src,1996)
   ids=set()
   for r in rows:
    identifier=r["committee_id"] if kind=="committee" else r["native_sub_id"]
    self.assertNotIn(identifier,ids);ids.add(identifier)
    self.assertEqual(r["graph_effect"],"none")
    self.assertTrue(r["source_line_sha256"])
    self.assertTrue(r["source_row"]>0)
    self.assertFalse(any(k in r for k in ["treasurer","address","employer","occupation","donor_name"]))
   self.assertEqual(len(ids),expected,kind)
 def test_reported_transaction_date_problem_is_never_scheduled_commitment(self):
  counts={}
  for r in fec.transaction_rows(self.original["transaction"][0],1996):
   k=r["source_date_quality"];counts[k]=counts.get(k,0)+1
   self.assertEqual(r["amount_kind"],"FEC_reported_transaction_amount_not_independent_payment")
   self.assertFalse(r["amendment_deduplicated"])
  self.assertEqual(counts["source_date_in_declared_cycle"],311430)
  self.assertEqual(counts["source_date_outside_declared_election_cycle"],733)
  self.assertEqual(counts["source_date_absent"],29)
  self.assertEqual(counts["source_future_date_anomaly_not_anticipated_event"],1)
 def test_source_boundary_mutation_rejected(self):
  for kind in EXPECTED:
   fn,_,_=fec.source_spec(kind,1996)
   rec=CAP/("SOURCE-RECEIPT.json" if kind=="committee" else "OTHER-TRANSACTIONS-SOURCE-RECEIPT.json")
   data=json.loads(rec.read_text())
   for key,value in [("sha256","0"*64),("http_status",403),("url","https://unapproved.example/"+fn),("bytes",2)]:
    with self.subTest(kind=kind,field=key),tempfile.TemporaryDirectory() as d:
     x=dict(data);x[key]=value;tmp=pathlib.Path(d)/"bad.json";tmp.write_text(json.dumps(x))
     with self.assertRaises(ValueError):fec.read_zip(CAP/fn,tmp,kind,1996)
 def test_1996_original_source_reciprocal_replay(self):
  with tempfile.TemporaryDirectory() as d:
   out=pathlib.Path(d)/"report.json";r=reciprocal.reconcile(CAP,out,1996)
   self.assertEqual(r["source_cycle"],"1995-1996")
   self.assertTrue(out.is_file())
   self.assertFalse(r["public_release"])
   self.assertEqual(r["review_state"],"unreviewed_research_candidates")
   self.assertEqual({k:v["matching_source_key_groups"] for k,v in r["counts"].items()},{"affiliated_transfer":899,"nonaffiliated_contribution":1100,"in_kind_registered_filer":144})
   for e in r["examples"]:
    self.assertEqual(e["graph_effect"],"none")
    self.assertFalse(e["independent_review"])
    self.assertTrue(e["outgoing_source_records"][0]["source_line_sha256"])
    self.assertTrue(e["incoming_source_records"][0]["source_line_sha256"])
if __name__=="__main__":unittest.main(verbosity=2)
