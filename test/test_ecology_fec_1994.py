#!/usr/bin/env python3
"""Source-native acceptance and adversarial boundaries for official FEC 1993-1994 files."""
import hashlib,json,os,pathlib,sys,tempfile,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'tools'))
import ecology_fec as fec
import ecology_fec_reciprocal as reciprocal
STATE=pathlib.Path(os.environ['CLIFFORD_ECOLOGY_STATE'])
CAP=STATE/'expansion-canary'/'fec-1994'
EXPECTED={'committee':('4126c9e24301a1b0b08ead4bcfb9a275e90e099cf0e475c902828435a166ddbf',10815),
          'transaction':('d8a77ab4cb1b4eb13d74b4556d6b4362c962893184e582c0381300728949ba05',272852)}
class RealOfficialFEC1994(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.rows={}
  for kind,(expected_sha,expected_count) in EXPECTED.items():
   filename=fec.source_spec(kind,1994)[0]
   receipt=CAP/('SOURCE-RECEIPT.json' if kind=='committee' else 'OTHER-TRANSACTIONS-SOURCE-RECEIPT.json')
   data,url,h,meta=fec.read_zip(CAP/filename,receipt,kind,1994)
   assert h==expected_sha
   cls.rows[kind]=list(fec.committee_rows(data,1994) if kind=='committee' else fec.transaction_rows(data,1994))
   assert len(cls.rows[kind])==expected_count
 def test_exact_original_source_cardinalities_and_identifiers(self):
  for kind,(_,count) in EXPECTED.items():
   self.assertEqual(len(self.rows[kind]),count)
   id_field='committee_id' if kind=='committee' else 'native_sub_id'
   self.assertEqual(len(set(r[id_field] for r in self.rows[kind])),count)
   self.assertTrue(all(r['cycle']=='1993-1994' for r in self.rows[kind]))
 def test_declared_cycle_and_out_of_cycle_dates(self):
  rows=self.rows['transaction']
  self.assertGreater(sum(r['source_date_quality']=='source_date_in_declared_cycle' for r in rows),0)
  self.assertGreater(sum(r['source_date_quality']=='source_date_outside_declared_election_cycle' for r in rows),0)
  self.assertEqual(fec.parse_reported_date('01151994',1994),('1994-01-15','source_date_in_declared_cycle'))
  self.assertEqual(fec.parse_reported_date('01151994',1992),('1994-01-15','source_date_outside_declared_election_cycle'))
  self.assertTrue(all(r['reported_date'] is None for r in rows if r['source_date_quality']=='source_future_date_anomaly_not_anticipated_event'))
 def test_money_identity_and_rights_remain_typed(self):
  self.assertTrue(all(r['amount_kind']=='FEC_reported_transaction_amount_not_independent_payment' for r in self.rows['transaction'][:300]))
  self.assertTrue(all(r['graph_effect']=='none' for r in self.rows['transaction'][:300]+self.rows['committee'][:50]))
  self.assertTrue(all(r['source_connected_organization_relation']=='unreviewed_source_label_not_legal_parent' for r in self.rows['committee'][:300]))
  self.assertFalse(fec.SOURCE_RIGHTS['individual_contributor_personal_fields_indexed'])
  self.assertFalse(fec.SOURCE_RIGHTS['public_redistribution_authorized_by_this_adapter'])
  self.assertTrue(all('source_line_sha256' in r for r in self.rows['transaction'][:100]))
 def test_original_archive_provenance_and_mutation_refusals(self):
  for kind in EXPECTED:
   filename=fec.source_spec(kind,1994)[0]
   receipt=CAP/('SOURCE-RECEIPT.json' if kind=='committee' else 'OTHER-TRANSACTIONS-SOURCE-RECEIPT.json')
   x=json.loads(receipt.read_text())
   self.assertEqual(x['sha256'],hashlib.sha256((CAP/filename).read_bytes()).hexdigest())
   with tempfile.TemporaryDirectory() as td:
    for name,value in [('sha256','0'*64),('http_status',403),('final_url','https://attacker.example/1994/'+filename),('url','https://www.fec.gov/files/bulk-downloads/1992/'+filename)]:
     y=x|{name:value};tmp=pathlib.Path(td)/'mutated.json';tmp.write_text(json.dumps(y))
     with self.subTest(kind=kind,field=name),self.assertRaises(ValueError):
      fec.read_zip(CAP/filename,tmp,kind,1994)
 def test_original_reciprocal_reports_have_source_hashes_and_no_payment_promotion(self):
  with tempfile.TemporaryDirectory() as tmp:
   report=reciprocal.reconcile(CAP,pathlib.Path(tmp)/'groups.json',1994)
   totals={k:v['matching_source_key_groups'] for k,v in report['counts'].items()}
   self.assertEqual(totals,{'affiliated_transfer':610,'nonaffiliated_contribution':469,'in_kind_registered_filer':22})
   self.assertEqual(report['source_cycle'],'1993-1994')
   self.assertEqual(report['sources']['transaction']['sha256'],EXPECTED['transaction'][0])
   first=report['examples'][0]
   self.assertEqual(first['record_state'],'matching_source_native_reciprocal_reports_not_adjudicated_one_payment')
   self.assertEqual(first['graph_effect'],'none')
   self.assertFalse(first['independent_review'])
   self.assertTrue(first['outgoing_source_records'][0]['source_line_sha256'])
   self.assertTrue(first['incoming_source_records'][0]['source_line_sha256'])
 def test_year_identity_not_silently_merged(self):
  self.assertNotEqual(fec.source_spec('committee',1992)[0],fec.source_spec('committee',1994)[0])
  self.assertEqual(fec.source_spec('committee',1996)[0],'cm96.zip')
  with self.assertRaises(ValueError):fec.source_spec('committee',1998)
  with self.assertRaises(ValueError):fec.source_spec('people',1994)
if __name__=='__main__':unittest.main(verbosity=2)
