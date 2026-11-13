"""Independent public FEC 1997–1998 original-source two-family acceptance tests."""
import collections,hashlib,json,os,pathlib,sys,tempfile,unittest,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import ecology_fec as fec
import ecology_fec_crosscycle as cross
STATE=pathlib.Path(os.environ['CLIFFORD_ECOLOGY_STATE'])
CAP=STATE/'expansion-canary'/'fec-1998'
EXPECTED={'committee':9976,'transaction':291205}
SHA={'committee':'d72c70a4aa1a7dd56e6337066c118be3a00aecd20ff138cc3f2fbe9ba08d5446','transaction':'b8210c2e9c938923ff30a837519b6b4061dd5dd9ad9c3dcad4b6db1b6887fb1f'}
class Original1998(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.original={}
  for kind in EXPECTED:
   fn,member,width=fec.source_spec(kind,1998)
   receipt=CAP/('SOURCE-RECEIPT.json' if kind=='committee' else 'OTHER-TRANSACTIONS-SOURCE-RECEIPT.json')
   rec=json.loads(receipt.read_text());data=(CAP/fn).read_bytes()
   assert hashlib.sha256(data).hexdigest()==SHA[kind]==rec['sha256']
   assert rec['source_rows']==EXPECTED[kind]
   assert rec['final_url'].endswith('/1998/'+fn)
   with zipfile.ZipFile(CAP/fn) as z:
    assert len(z.infolist())==1 and z.infolist()[0].filename==member
    raw=z.read(member)
    assert len(raw.splitlines())==EXPECTED[kind]
    assert all(len(line.split(b'|'))==width for line in raw.splitlines())
   cls.original[kind]=fec.read_zip(CAP/fn,receipt,kind,1998)
 def test_original_ids_and_sensitive_fields_excluded(self):
  for kind,expected in EXPECTED.items():
   seen=set()
   rows=fec.committee_rows(self.original[kind][0],1998) if kind=='committee' else fec.transaction_rows(self.original[kind][0],1998)
   for x in rows:
    ident=x['committee_id'] if kind=='committee' else x['native_sub_id']
    self.assertNotIn(ident,seen);seen.add(ident)
    self.assertTrue(x['source_row']>0 and x['source_line_sha256'] and x['graph_effect']=='none')
    self.assertFalse(any(key in x for key in ('donor','treasurer','address','employer','occupation','memo_text','contributor_name')))
   self.assertEqual(len(seen),expected)
 def test_source_report_date_not_event_or_payment(self):
  flags=collections.Counter()
  for x in fec.transaction_rows(self.original['transaction'][0],1998):
   flags[x['source_date_quality']]+=1
   self.assertEqual(x['amount_kind'],'FEC_reported_transaction_amount_not_independent_payment')
   self.assertFalse(x['amendment_deduplicated'])
  self.assertEqual(flags,{'source_date_in_declared_cycle':290554,'source_date_outside_declared_election_cycle':602,'source_future_date_anomaly_not_anticipated_event':1,'source_date_absent':48})
 def test_exact_1996_1998_committee_id_continuity(self):
  with tempfile.TemporaryDirectory() as d:
   result=cross.derive(STATE,d,cycles=(1996,1998))
   self.assertEqual(result['verified_repeated_source_identifiers'],8290)
   self.assertEqual(result['counts']['label_varied'],472)
   self.assertEqual([x['rows'] for x in result['source_populations']],[11075,9976])
   rows=[json.loads(s) for s in pathlib.Path(result['artifact']).read_text().splitlines()]
   self.assertEqual(len(rows),8290)
   self.assertEqual(len({x['source_native_committee_id'] for x in rows}),8290)
   for x in rows:
    self.assertEqual(x['cycles'],[1996,1998])
    self.assertTrue(all(m['committee_id']==x['source_native_committee_id'] for m in x['cycle_records']))
    self.assertTrue(all(m['source_archive_sha256'] and m['source_line_sha256'] and m['source_url'] for m in x['cycle_records']))
    self.assertFalse(x['independent_review'] or x['payment_or_money_flow_join'])
    self.assertEqual(x['graph_effect'],'none')
 def test_corrupted_original_receipt_is_rejected(self):
  for kind in EXPECTED:
   fn,_,_=fec.source_spec(kind,1998)
   rec=CAP/('SOURCE-RECEIPT.json' if kind=='committee' else 'OTHER-TRANSACTIONS-SOURCE-RECEIPT.json')
   raw=json.loads(rec.read_text())
   for field,value in [('sha256','0'*64),('http_status',403),('url','https://invalid.example/'+fn),('bytes',2)]:
    with self.subTest(kind=kind,field=field),tempfile.TemporaryDirectory() as d:
     variant=dict(raw);variant[field]=value;p=pathlib.Path(d)/'receipt.json';p.write_text(json.dumps(variant))
     with self.assertRaises(ValueError):fec.read_zip(CAP/fn,p,kind,1998)
 def test_source_year_scope_is_explicit(self):
  self.assertEqual(fec.EXPECTED_SOURCE_ROWS[1998],EXPECTED)
  for year in (1990,2000):
   with self.assertRaises(ValueError):fec.source_spec('committee',year)
  with self.assertRaises(ValueError):cross.derive(STATE,'/tmp/unused-not-written',cycles=(1998,1996))
if __name__=='__main__':unittest.main(verbosity=2)
