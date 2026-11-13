#!/usr/bin/env python3
"""Original 1991-1992 Federal Election Commission source tests and adversarial refusals."""
from __future__ import annotations
import hashlib,json,os,pathlib,sys,tempfile,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'tools'))
import ecology_fec as fec
import ecology_fec_reciprocal as reciprocal
STATE=pathlib.Path(os.environ['CLIFFORD_ECOLOGY_STATE'])
CAP=STATE/'expansion-canary'/'fec-1992'
EXPECTED={'committee':('2bf601f6c0eaff1a2f0a9eecace85b9278df946c0b8e5bf7b453908db0664309',10759),
          'transaction':('51564325e13fb3defe148ea66d80e4d361ec0cc0d257efaa46efb15f5bb60041',273009)}
class RealOfficialFEC1992(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.raw={};cls.rows={}
  for kind,(filename,_,_) in fec.KIND.items():
   r=CAP/('SOURCE-RECEIPT.json' if kind=='committee' else 'OTHER-TRANSACTIONS-SOURCE-RECEIPT.json')
   content,url,h,receipt=fec.read_zip(CAP/filename,r,kind)
   cls.raw[kind]=content
   cls.rows[kind]=list(fec.committee_rows(content) if kind=='committee' else fec.transaction_rows(content))
   assert h==EXPECTED[kind][0]
 def test_whole_declared_original_archive(self):
  for kind in EXPECTED:
   self.assertEqual(len(self.rows[kind]),EXPECTED[kind][1])
   self.assertEqual(len(set(r['committee_id' if kind=='committee' else 'native_sub_id'] for r in self.rows[kind])),EXPECTED[kind][1])
  self.assertEqual(self.rows['committee'][0]['committee_id'],'C00000000')
  self.assertEqual(self.rows['transaction'][0]['source_filer_committee_id'],'C00165720')
  self.assertEqual(self.rows['transaction'][0]['source_other_id'],'C00250480')
  self.assertEqual(self.rows['transaction'][0]['amount_reported_exact'],'2000')
 def test_source_native_identity_and_money_boundary(self):
  cmap={r['committee_id']:r for r in self.rows['committee']}
  first=self.rows['transaction'][0]
  self.assertIn(first['source_filer_committee_id'],cmap)
  self.assertIn(first['source_other_id'],cmap)
  self.assertEqual(first['source_transaction_type'],'24K')
  self.assertEqual(first['source_transaction_direction'],'filer_outgoing_reported')
  self.assertEqual(first['reported_date'],'1991-03-13')
  self.assertEqual(cmap['C00165720']['source_committee_label'],'CALIFORNIANS FOR SENATOR PETE WILSON')
  self.assertEqual(cmap['C00250480']['source_committee_label'],'U S SENATOR JOHN SEYMOUR COMMITTEE')
  self.assertFalse(first['amendment_deduplicated'])
  self.assertFalse(first['aggregate_or_net_amount_claimed'])
  self.assertEqual(first['amount_kind'],'FEC_reported_transaction_amount_not_independent_payment')
 def test_source_anomalies_are_preserved(self):
  rows=self.rows['transaction'];quality={r['source_date_quality'] for r in rows}
  self.assertIn('source_date_outside_declared_election_cycle',quality)
  self.assertIn('source_future_date_anomaly_not_anticipated_event',quality)
  self.assertTrue(all(r['reported_date'] is None for r in rows if r['source_date_quality']=='source_future_date_anomaly_not_anticipated_event'))
  self.assertTrue(any(r['source_amendment_indicator']=='A' for r in rows))
  self.assertTrue(any(r['source_other_id_namespace']=='fec_candidate' for r in rows))
 def test_no_sensitive_personal_or_fake_relationship_fields(self):
  secret={'name','address','city','state','zip','zip_code','employer','occupation','treasurer','personal_donor_name','payment','beneficial_owner','control','influence','causal_connection'}
  for r in self.rows['committee'][:50]+self.rows['transaction'][:500]:
   self.assertFalse(secret.intersection(set(r)))
   self.assertEqual(r['graph_effect'],'none')
  self.assertFalse(fec.SOURCE_RIGHTS['individual_contributor_personal_fields_indexed'])
  self.assertFalse(fec.SOURCE_RIGHTS['public_redistribution_authorized_by_this_adapter'])
 def test_exact_real_source_parsing_and_export(self):
  with tempfile.TemporaryDirectory() as root:
   result=fec.accept_source(CAP,root)
   self.assertEqual(result['source_rows'],{'committee':10759,'transaction':273009})
   self.assertEqual(result['status'],'source_parsed_and_qualified_not_production_adopted')
   for kind,info in result['sources'].items():
    out=pathlib.Path(info['derived_jsonl'])
    self.assertEqual(hashlib.sha256(out.read_bytes()).hexdigest(),info['derived_sha256'])
   with (pathlib.Path(root)/'FEC-1992-TRANSACTIONS.jsonl').open() as f:raw=f.readline()
   self.assertNotIn('SAN DIEGO',raw)
   first=json.loads(raw)
   self.assertEqual(first['source_sha256'],EXPECTED['transaction'][0])
   self.assertEqual(first['source_url'],fec.FEC+'oth92.zip')
   self.assertEqual(first['source_rights_reference'],fec.SOURCE_RIGHTS['rights_notice'])
   self.assertIn('not unique payment',first['interpretation_contract'])
 def test_original_source_reciprocal_reports_are_candidates(self):
  with tempfile.TemporaryDirectory() as root:
   report=reciprocal.reconcile(CAP,pathlib.Path(root)/'reconciliation.json')
   self.assertEqual(report['counts']['affiliated_transfer']['matching_source_key_groups'],632)
   self.assertEqual(report['counts']['nonaffiliated_contribution']['matching_source_key_groups'],517)
   self.assertEqual(report['counts']['in_kind_registered_filer']['matching_source_key_groups'],78)
   item=report['examples'][0]
   self.assertEqual(item['record_state'],'matching_source_native_reciprocal_reports_not_adjudicated_one_payment')
   self.assertEqual(item['graph_effect'],'none')
   self.assertFalse(item['independent_review'])
   self.assertTrue(item['outgoing_source_records'][0]['source_line_sha256'])
   self.assertTrue(item['incoming_source_records'][0]['source_line_sha256'])
 def test_reject_wrong_receipt_hash_and_route(self):
  for kind in EXPECTED:
   filename=fec.KIND[kind][0]
   p=CAP/('SOURCE-RECEIPT.json' if kind=='committee' else 'OTHER-TRANSACTIONS-SOURCE-RECEIPT.json')
   orig=json.loads(p.read_text())
   with tempfile.TemporaryDirectory() as tmp:
    for key,value in [('sha256','0'*64),('http_status',403),('final_url','https://unapproved.example/bulk-downloads/1992/'+filename),('bytes',17)]:
     altered=dict(orig);altered[key]=value;dest=pathlib.Path(tmp)/'altered.json';dest.write_text(json.dumps(altered))
     with self.subTest(kind=kind,field=key),self.assertRaises(ValueError):
      fec.read_zip(CAP/filename,dest,kind)
 def test_reject_actual_schema_and_duplicate_mutations(self):
  cm=self.raw['committee'];oth=self.raw['transaction']
  changes=[
    (fec.committee_rows,cm.replace(b'C00000000|',b'X00000000|',1),'malformed FEC committee ID'),
    (fec.committee_rows,cm.replace(b'COPE COMMITTEE|LOWELL',b'COPE COMMITTEELOWELL',1),'wrong columns'),
    (fec.committee_rows,cm+cm.splitlines()[0]+b'\n','duplicate committee ID'),
    (fec.transaction_rows,oth.replace(b'C00165720|',b'X00165720|',1),'malformed filer ID'),
    (fec.transaction_rows,oth.replace(b'|2000|C00250480|',b'|not-money|C00250480|',1),'non-number money'),
    (fec.transaction_rows,oth+oth.splitlines()[0]+b'\n','duplicate source SUB_ID'),
    (fec.transaction_rows,oth.replace(b'|C00250480|',b'|http://bad.example|',1),'non-namespaced party')
  ]
  for parse,mutated,name in changes:
   with self.subTest(name=name),self.assertRaises(ValueError):list(parse(mutated))
if __name__=='__main__':unittest.main(verbosity=2)
