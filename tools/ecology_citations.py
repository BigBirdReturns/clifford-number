#!/usr/bin/env python3
"""Recover explicit legal citations from already-acquired public source text.
Connections retain quoted source context and do not assert legal effect or causation.
"""
import argparse,collections,json,pathlib,re,sqlite3,sys
import ecology_backlog as b
import ecology_sources as s
PATTERN=re.compile(r'\b(?:Public\s+Law|Pub\.?\s+L\.?(?:\s+No\.?)?)\s+(\d{1,3})\s*[–−-]\s*(\d{1,4})\b',re.I)
def citation_review(target,source_hash):
 if target=='102-123' and source_hash=='792c7c334881ba171dfe908b9b7d40662fb409ab1f6ce01a6b3271db4a64f3d7':
  return {'state':'source_context_conflict','reason':'The 1994 EPA source labels this identifier as a Treasury appropriations act, while the captured 1991 statute is a heritage-month designation. Preserve both records; do not promote or silently correct this citation.'}
 return {'state':'identifier_match_requires_context_review','reason':'The written identifier matches. Instrument applicability, section-level meaning and causal effect remain separate review questions.'}

def run(state,out):
 c=b.connect(state);s.ensure(c);out.mkdir(parents=True,exist_ok=True)
 c.execute('CREATE TABLE IF NOT EXISTS citation_occurrences(id TEXT PRIMARY KEY,source_document TEXT,namespace TEXT,target_id TEXT,position INTEGER,excerpt TEXT,source_hash TEXT,locator TEXT,review TEXT)')
 old=c.execute("SELECT value FROM metadata WHERE key='explicit_citation_watermark_v1'").fetchone();watermark=json.loads(old[0])if old else 0
 high=c.execute('SELECT coalesce(max(rowid),0)FROM documents').fetchone()[0];scanned=0;added=0;batch=[]
 for r in c.execute("SELECT rowid,id,kind,body,source_hash,locator FROM documents WHERE rowid>? AND rowid<=? AND origin='acquired' AND kind IN ('federal_register','federal_register_detail','document','statutory_instrument','govinfo_report_text')",(watermark,high)):
  scanned+=1
  for m in PATTERN.finditer(r['body']):
   target=m[1]+'-'+m[2];ident=b.sha((r['id']+'|publiclaw|'+target+'|'+str(m.start())).encode());excerpt=r['body'][max(0,m.start()-150):m.end()+250]
   batch.append((ident,r['id'],'us_public_law',target,m.start(),excerpt,r['source_hash'],r['locator'],'explicit_source_citation_not_legal_effect'))
 with c:
  for item in batch:
   changed=c.execute('INSERT OR IGNORE INTO citation_occurrences VALUES(?,?,?,?,?,?,?,?,?)',item).rowcount;added+=changed
   s.ref(c,item[1],item[2],item[3],item[7],item[6])
  c.execute('INSERT OR REPLACE INTO metadata VALUES(?,?)',('explicit_citation_watermark_v1',b.j(high)))
 laws={};ambiguous=set();missing_page=set()
 for r in c.execute("SELECT id,title,payload,record_date,source_hash,locator FROM documents WHERE origin='acquired' AND kind='statutory_instrument'"):
  x=json.loads(r['payload']);key=x.get('public_law_id')
  if x.get('identity_state')=='source_identifier_collision':ambiguous.add(key);continue
  if x.get('identity_state')=='source_citation_missing':missing_page.add(key);continue
  if x.get('identity_state')!='source_identifier_unique_within_volume':continue
  laws.setdefault(key,[]).append({'document_id':r['id'],'title':r['title'],'record_date':r['record_date'],'citation':x.get('citation'),'native_id':x.get('native_id'),'source_hash':r['source_hash'],'locator':r['locator']})
 links=[]
 for target,items in laws.items():
  if target in ambiguous:continue
  unique={x['native_id']for x in items}
  if len(unique)!=1:continue
  found=[]
  for r in c.execute("SELECT o.source_document,o.excerpt,o.source_hash,o.locator,d.title,d.record_date,d.kind FROM citation_occurrences o JOIN documents d ON d.id=o.source_document WHERE o.target_id=? AND d.kind!='statutory_instrument' LIMIT 100",(target,)):
   found.append(dict(r)|{'review':citation_review(target,r['source_hash'])})
  if found:links.append({'public_law_id':target,'statutory_source':items[0],'citing_observations':found,'connection_type':'source_context_conflict' if any(x['review']['state']=='source_context_conflict' for x in found) else 'candidate_explicit_citation_identifier_match','legal_effect_adjudicated':False,'causation_claimed':False})
 summary={'observed_at':b.utc(),'new_source_documents_scanned':scanned,'new_citation_occurrences':added,'total_citation_occurrences':c.execute('select count(*)from citation_occurrences').fetchone()[0],'unique_cited_law_ids':c.execute('select count(distinct target_id)from citation_occurrences').fetchone()[0],'cross_source_identifier_candidates':len(links),'context_conflict_candidates':sum(x['connection_type']=='source_context_conflict' for x in links),'verified_legal_connections':0,'ambiguous_statutory_ids_excluded':sorted(ambiguous),'source_citation_missing_excluded_ids':sorted(missing_page),'watermark':high,'accepted_actor_hops_created':0,'boundary':'Source text explicitly cites a law identifier. Connection does not establish applicability, implementation, money flow, intent or causal effect.'}
 (out/'CITATION-CONNECTIONS.json').write_text(json.dumps({'summary':summary,'connections':links},indent=2)+'\n');(out/'CITATION-SUMMARY.json').write_text(json.dumps(summary,indent=2)+'\n')
 lines=['# Explicit cross-source historical connections',summary['boundary'],'']
 for link in links[:30]:
  law=link['statutory_source'];lines.extend(['## Public Law '+link['public_law_id'],law['title'],'Review state: '+link['connection_type'],'Source date: '+str(law['record_date'])+' | '+str(law['citation'])])
  for x in link['citing_observations'][:3]:lines.extend(['Citing source: '+x['title'],'Source locator: '+x['locator'],'Source excerpt: '+x['excerpt'],'SHA256: '+x['source_hash']])
  lines.append('')
 (out/'HISTORICAL-CONNECTIONS.md').write_text('\n'.join(lines)+'\n');c.close();print(json.dumps(summary,indent=2));return summary
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--state',type=pathlib.Path,required=True);p.add_argument('--out',type=pathlib.Path,required=True);a=p.parse_args();run(a.state.resolve(),a.out.resolve())
