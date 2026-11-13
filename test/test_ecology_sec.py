#!/usr/bin/env python3
"""Real-source SEC 1994 Q1 acceptance, no fabricated success fixtures."""
import hashlib,json,os,pathlib,sys,tempfile,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/"tools"))
import ecology_sec as sec
STATE=pathlib.Path(os.environ["CLIFFORD_ECOLOGY_STATE"])
CAP=STATE/"expansion-canary"/"sec-1994-Q1-master.body"
REC=STATE/"expansion-canary"/"sec-1994-Q1-master-receipt.json"
SHA="c8c9bc2f3b12617d908c0c5460917769d6301771921e25ff57984672db0a9013"

class OfficialSECSource(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.raw=CAP.read_bytes()
  assert hashlib.sha256(cls.raw).hexdigest()==SHA
  cls.rows,cls.h,cls.url,cls.real=sec.validate_capture(CAP,REC,1994,1)
 def test_source_population_exact(self):
  self.assertEqual(self.h,SHA)
  self.assertEqual(len(self.rows),20879)
  self.assertEqual(len({r["file_path"] for r in self.rows}),20879)
  self.assertTrue(all(r["date_filed"].startswith("1994-") for r in self.rows))
  self.assertEqual(self.url, "https://www.sec.gov/Archives/edgar/full-index/1994/QTR1/master.idx")
  self.assertTrue(all(r["graph_effect"]=="none" for r in self.rows))
  self.assertTrue(all(r["record_state"].endswith("filing_text_not_captured") for r in self.rows))
 def test_real_source_provenance_and_export(self):
  with tempfile.TemporaryDirectory() as tmp:
   result=sec.accept_source(CAP,REC,1994,1,tmp)
   self.assertEqual(result["filing_metadata_rows"],20879)
   self.assertEqual(result["filing_bodies_captured"],0)
   self.assertEqual(result["source_sha256"],SHA)
   p=pathlib.Path(result["record_file"])
   with p.open() as f:
    self.assertEqual(sum(1 for _ in f),20879)
   with p.open() as f:
    first=json.loads(f.readline())
   self.assertEqual(first["file_path"],"edgar/data/100030/0000950152-94-000075.txt")
   self.assertEqual(first["cik"],"0000100030")
 def test_reject_source_identity_and_source_schema_mutations(self):
  raw=self.raw
  samples=[
   ("missing_master_label",raw.replace(b"Master Index of EDGAR Dissemination Feed",b"Not the official source",1)),
   ("missing_header",raw.replace(b"CIK|Company Name|Form Type|Date Filed|Filename",b"wrong|head|form|date|path",1)),
   ("duplicate_header",raw.replace(b"CIK|Company Name|Form Type|Date Filed|Filename",b"CIK|Company Name|Form Type|Date Filed|Filename\nCIK|Company Name|Form Type|Date Filed|Filename",1)),
   ("CIK_mismatch",raw.replace(b"edgar/data/100030/",b"edgar/data/100031/",1)),
   ("wrong_quarter",raw.replace(b"1994-02-07",b"1994-05-07",1)),
   ("invalid_calendar_date",raw.replace(b"1994-02-07",b"1994-02-30",1)),
   ("unsafe_file_path",raw.replace(b"edgar/data/100030/0000950152-94-000075.txt",b"../../etc/passwd",1)),
   ("duplicate_filing",raw+b"\n100030|TRW INC|SC 13G/A|1994-02-07|edgar/data/100030/0000950152-94-000075.txt\n"),
   ("truncated_nonempty",raw[:2500]),
   ("empty_source",b"")
  ]
  for name,body in samples:
   with self.subTest(name=name),self.assertRaises(ValueError):
    sec.rows_from_source(body,1994,1)
 def test_reject_wrong_claimed_period(self):
  with self.assertRaises(ValueError):sec.rows_from_source(self.raw,1994,2)
 def test_reject_receipt_hash_and_final_route_changes(self):
  orig=json.loads(REC.read_text())
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);forged=root/"receipt.json"
   for key,sub in [("sha256","0"*64),("url","https://thirdparty.example/master.idx"),("final_url","https://thirdparty.example/master.idx"),("status",403),("bytes",1)]:
    altered=dict(orig);altered[key]=sub;forged.write_text(json.dumps(altered))
    with self.subTest(field=key),self.assertRaises(ValueError):
     sec.validate_capture(CAP,forged,1994,1)
 def test_historical_filing_and_money_boundaries(self):
  r=self.rows[0]
  self.assertEqual(r["financial_amount_state"],"not_reported_in_index")
  self.assertEqual(r["historical_legal_identity_review"],"not_performed")
  self.assertNotIn("beneficial_owner",r)
  self.assertNotIn("payment",r)

if __name__=="__main__":
 unittest.main(verbosity=2)
