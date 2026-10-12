"""Offline check of two reviewed source records, not an admission engine.
Run: python verify.py [packet-directory] [--self-test]
Python standard library only; no network access or archive extraction.
"""
from pathlib import Path
from html.parser import HTMLParser
import argparse, copy, hashlib, io, json, re, sys, zipfile

HASHES = {
 "SEC-RESALE-424B7":"cb391e8d7943a230132d27f1bc3d1cc9f6509ba0d29a8c8ceeb00406fbc9cb08",
 "SEC-APRIL-DEBT-8K":"6f286e9c7e77f20323c56beb9f98a5e500930fdcb80821d3f55693fc2213f6c0"}
URLS = {
 "SEC-RESALE-424B7":"https://www.sec.gov/Archives/edgar/data/50863/000005086326000027/a01232026424b7.htm",
 "SEC-APRIL-DEBT-8K":"https://www.sec.gov/Archives/edgar/data/50863/000119312526197845/d143782d8k.htm"}
BOUNDARIES = dict.fromkeys([
 "stage_admission", "government_disposition_established", "government_cash_receipt_established",
 "public_proceeds_booking_established", "distribution_established", "issue_345_may_close",
 "shared_registration_is_same_transaction", "absence_is_universal_nonoccurrence"], False)

def require(ok, message):
 if not ok:
  raise ValueError(message)

def sha(data):
 return hashlib.sha256(data).hexdigest()

class Text(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.parts=[]
 def handle_data(self, value):
  self.parts.append(value)

def text(body):
 p=Text()
 p.feed(body.decode('utf-8',errors='strict'))
 return re.sub(r'\s+',' ',' '.join(p.parts)).strip()

def derive(files):
 g=text(files['SEC-RESALE-424B7/response-0.body'])
 d=text(files['SEC-APRIL-DEBT-8K/response-0.body'])
 gr=re.search(r'Registration No\.\s*(333-\d+)',g)
 dr=re.search(r'File No\.\s*(333-\d+)',d)
 require(gr and dr,'Missing registration locator')
 require('United States Department of Commerce' in g,'Missing government holder')
 require('We will not receive any proceeds from the sale' in g,'Missing issuer nonreceipt clause')
 require('does not necessarily mean that the selling securityholder' in g,'Missing non-sale limitation')
 require('August 27, 2026' in g,'Missing eligibility date')
 event=d[d.index('Item 8.01 Other Events.'):d.index('Item 9.01')]
 require('On April 30, 2026, Intel Corporation' in event,'Missing debt issuer/date')
 require('Senior Notes due' in event,'Missing debt security class')
 amounts=[int(n.replace(',','')) for n in re.findall(r'\$([\d,]+)\s+aggregate principal amount',event)]
 require(amounts==[1000000000,1000000000,2250000000,1750000000,500000000],'Debt principals changed')
 require('net proceeds from the offering are approximately $6.47 billion' in event,'Missing proceeds amount')
 require('before expenses but after deducting the underwriting discounts' in event,'Missing proceeds basis')
 return {
  'schema':'m05-intel-shared-shelf-projection@1',
  'government_registration_number':gr.group(1), 'debt_registration_number':dr.group(1),
  'same_registration':gr.group(1)==dr.group(1),
  'government_record_date':'2026-01-23', 'government_record_class':'resale_registration_supplement',
  'government_selling_securityholder':'United States Department of Commerce',
  'ordinary_eligibility_date':'2026-08-27',
  'debt_record_date':'2026-04-30', 'debt_record_class':'issuer_senior_notes_issuance',
  'debt_issuer':'Intel Corporation', 'debt_security':'senior notes',
  'debt_principal_amounts_usd':amounts, 'debt_aggregate_principal_usd':sum(amounts),
  'debt_approximate_net_proceeds_usd':6470000000,
  'debt_proceeds_basis':'after underwriting discounts, before expenses',
  'same_transaction':False, 'unique_event_key':False, 'common_cash_recipient_inferred':False,
  'boundaries':BOUNDARIES}

def verify(m,p,files):
 require(m['schema']=='m05-intel-shared-shelf-manifest@1','Manifest schema changed')
 require(m['boundaries']==BOUNDARIES,'Authority boundary changed')
 require(len(m['sources'])==2 and {r['source_id'] for r in m['sources']}==set(HASHES),'Source denominator changed')
 names={'acquisition-program-government.py','acquisition-program-debt.py','publication-redactions.json'}
 redactions=json.loads(files['publication-redactions.json'])
 for row in m['sources']:
  key=row['source_id']
  names.update(key+'/'+n for n in ['response-0.body','acquisition.json','tls-peer-0.der'])
  body=files[key+'/response-0.body']; rb=files[key+'/acquisition.json']; r=json.loads(rb)
  require(sha(body)==HASHES[key]==row['body_sha256'],'Source hash mismatch')
  require(len(body)==row['body_length_bytes']==r['body']['body_length_bytes'],'Source length mismatch')
  require(sha(rb)==row['acquisition_receipt_sha256'],'Receipt hash mismatch')
  require(r['requested_url']==r['resolved_url']==URLS[key],'Source URL mismatch')
  require(r['complete'] is True and r['response_status']==200,'Unsuccessful acquisition')
  require(r['tls_verification_enabled'] is True and r['request_contains_credentials'] is False,'Acquisition policy changed')
  require(len(r['hops'])==1,'Unexpected redirects')
  h=r['hops'][0]; headers={k.lower():v for k,v in h['response_headers']}
  require(h['url']==URLS[key] and h['response_status']==200,'Hop mismatch')
  require(h['body']['body_sha256']==r['body']['body_sha256']==sha(body),'Receipt/body binding mismatch')
  require(headers.get('content-encoding','identity').lower()=='identity','Unexpected content coding')
  require(row['byte_domain']=='http_payload_octets_before_content_decoding','Unsupported byte domain')
  require(row['content_coding']=='identity' and row['content_decoding_applied'] is False,'Decoding interpretation changed')
  require(row['normalization_applied'] is False,'Source normalization claimed')
  require(row['transfer_coding']==headers.get('transfer-encoding','none'),'Transfer coding mismatch')
  if 'content-length' in headers:
   require(int(headers['content-length'])==len(body),'HTTP length mismatch')
  cert=files[key+'/tls-peer-0.der']
  require(sha(cert)==row['tls_peer_certificate_sha256']==h['tls_peer_certificate']['body_sha256'],'Certificate mismatch')
  hidden=[v for k,v in h['response_headers'] if k.lower() in {'set-cookie','cookie','authorization','proxy-authorization'}]
  require(all(re.fullmatch(r'\[redacted sha256:[0-9a-f]{64}\]',v) for v in hidden),'Unredacted sensitive header')
  rr=redactions[key]
  require(len(hidden)==row['redacted_response_header_values']==rr['redacted_header_count'],'Redaction count mismatch')
  require(rr['original_acquisition_receipt_sha256']==row['original_acquisition_receipt_sha256'],'Original receipt binding changed')
  require(rr['published_acquisition_receipt_sha256']==sha(rb),'Public receipt binding changed')
 require(set(files)==names,'Archive member denominator changed')
 require(derive(files)==p,'Projection does not reproduce')

def tests(m,p,files):
 mutations=[
 ('missing body',lambda a,b,c:c.pop('SEC-APRIL-DEBT-8K/response-0.body')),
 ('changed body',lambda a,b,c:c.update({'SEC-APRIL-DEBT-8K/response-0.body':b'changed'})),
 ('extra member',lambda a,b,c:c.update({'extra':b'x'})),
 ('missing source',lambda a,b,c:a['sources'].pop()),
 ('unsupported byte domain',lambda a,b,c:a['sources'][0].update(byte_domain='decoded_text')),
 ('content decoding',lambda a,b,c:a['sources'][0].update(content_decoding_applied=True)),
 ('source normalization',lambda a,b,c:a['sources'][0].update(normalization_applied=True)),
 ('transfer coding',lambda a,b,c:a['sources'][0].update(transfer_coding='invented')),
 ('stage promotion',lambda a,b,c:a['boundaries'].update(stage_admission=True)),
 ('registration as event key',lambda a,b,c:b.update(unique_event_key=True)),
 ('common cash recipient',lambda a,b,c:b.update(common_cash_recipient_inferred=True)),
 ('Commerce as debt issuer',lambda a,b,c:b.update(debt_issuer='United States Department of Commerce')),
 ('debt as common stock',lambda a,b,c:b.update(debt_security='common stock')),
 ('incorrect principal sum',lambda a,b,c:b.update(debt_aggregate_principal_usd=6500000001)),
 ('net relabeled gross',lambda a,b,c:b.update(debt_proceeds_basis='gross')),
 ('two records same transaction',lambda a,b,c:b.update(same_transaction=True))]
 passed=[]
 for label,edit in mutations:
  a,b,c=copy.deepcopy(m),copy.deepcopy(p),files.copy(); edit(a,b,c)
  try:
   verify(a,b,c)
  except (ValueError,KeyError,UnicodeError):
   passed.append(label)
  else:
   raise ValueError('Accepted mutation: '+label)
 return passed

def main():
 ap=argparse.ArgumentParser(description=__doc__)
 ap.add_argument('directory',nargs='?',type=Path,default=Path(__file__).resolve().parent)
 ap.add_argument('--self-test',action='store_true'); args=ap.parse_args(); path=args.directory
 expected={'manifest.json','projection.json','review.md','sources.zip','verify.py'}; seen=set()
 for line in (path/'SHA256SUMS').read_text().splitlines():
  digest,name=line.split('  ',1)
  require(name in expected and name not in seen,'Unexpected checksum member')
  require(sha((path/name).read_bytes())==digest,'File checksum mismatch: '+name); seen.add(name)
 require(seen==expected,'Incomplete checksum denominator')
 m=json.loads((path/'manifest.json').read_bytes()); p=json.loads((path/'projection.json').read_bytes())
 archive=(path/'sources.zip').read_bytes()
 require(sha(archive)==m['source_archive_sha256'],'Archive hash mismatch')
 with zipfile.ZipFile(io.BytesIO(archive)) as z:
  require(len(z.infolist())==9 and sum(i.file_size for i in z.infolist())<2000000,'Archive size/member bound failed')
  require(z.testzip() is None and len(set(z.namelist()))==9,'ZIP integrity/uniqueness failed')
  files={n:z.read(n) for n in z.namelist()}
 verify(m,p,files); passed=tests(m,p,files) if args.self_test else []
 print(json.dumps({'status':'passed','source_bodies':2,'source_body_bytes':sum(len(files[k+'/response-0.body']) for k in HASHES),'archive_members':9,'rejection_tests_passed':len(passed),'tests':passed,'stage_admission':False},indent=2))

if __name__=='__main__':
 try:
  main()
 except (ValueError,KeyError,OSError,zipfile.BadZipFile) as e:
  print('Verification failed: '+str(e),file=sys.stderr); sys.exit(1)
