#!/usr/bin/env python3
"""Extend the existing 24-estate queue, retaining date strata and route provenance.
Queries are discovery denominators, not assertions of relevance or actor identity.
"""
import json
from pathlib import Path
import ecology_backlog as base
TOPICS={
'dialog-estate':('govuk',['"ministerial meetings"','"business advisory"']),
'uk-defense-estate':('govuk',['"defence industrial"','"private finance initiative"']),
'us-defense-estate':('federal_register',['"other transactions"','"defense industrial base"']),
'local-development-estate':('federal_register',['"tax increment financing"','"transit oriented development"']),
 'transatlantic-defense-innovation-estate':('govuk',['"defence innovation"','"NATO" "innovation"']),
'uk-state-market-estate':('govuk',['"government outsourcing"','"digital government"']),
'us-executive-appointments-ethics-estate':('federal_register',['"conflict of interest"','"post-employment"']),
'us-legislative-political-finance-estate':('federal_register',['"campaign finance"','"lobbying disclosure"']),
'state-municipal-authority-estate':('federal_register',['"municipal authority"','"public benefit corporation"']),
'public-money-industrial-policy-estate':('federal_register',['"industrial policy"','"public private partnership"']),
'regulatory-markets-estate':('federal_register',['"regulatory reform"','"competition policy"']),
'venture-capital-corporate-control-estate':('federal_register',['"venture capital"','"corporate governance"']),
'offshore-beneficial-ownership-estate':('federal_register',['"beneficial ownership"','"shell company"']),
'public-interest-crossing-estate':('federal_register',['"inspector general"','"freedom of information"']),
'judicial-administrative-adjudication-estate':('federal_register',['"bid protest"','"administrative adjudication"']),
'professional-services-intermediaries-estate':('federal_register',['"management consulting"','"foreign agents registration"']),
'philanthropy-nonprofit-policy-estate':('federal_register',['"tax exempt organizations"','"private foundations"']),
'higher-education-research-commercialization-estate':('federal_register',['"technology transfer"','"university patent"']),
'ai-data-compute-infrastructure-estate':('federal_register',['"cloud computing"','"artificial intelligence"']),
'energy-utilities-critical-infrastructure-estate':('federal_register',['"electric utility"','"critical infrastructure"']),
'sanctions-export-controls-foreign-investment-estate':('federal_register',['"foreign investment"','"export controls"']),
'intellectual-property-standards-data-rights-estate':('federal_register',['"data rights"','"intellectual property"']),
'labor-immigration-workforce-mobility-estate':('federal_register',['"labor certification"','"worker adjustment"']),
'real-property-title-debt-estate':('federal_register',['"federal real property"','"lease financing"'])}
def seed(c,repo):
 flag='ecology_breadth_historical_source_v1'
 if c.execute('SELECT 1 FROM metadata WHERE key=?',(flag,)).fetchone():return {'reused':True}
 cutoff=json.loads(c.execute("SELECT value FROM metadata WHERE key='cutoff'").fetchone()[0]);year=int(cutoff[:4]);align=json.loads((Path(repo)/'data/project/estate-thesis-alignment.json').read_text());ids={e['estate_id']for e in align['estates']}
 if set(TOPICS)!=ids:raise ValueError('Expansion must address exactly the existing 24 estate identities')
 counts={};before=c.execute('SELECT count(*) FROM tasks').fetchone()[0]
 for eid,(provider,terms)in TOPICS.items():
  n=0
  for term in terms:
   for y in range(1991 if provider=='govuk' else 1994,year+1):
    spec={'term':term,'start':str(y)+'-01-01','end':min(str(y)+'-12-31',cutoff),'page_size':100 if provider=='govuk' else 1000}
    base.add_task(c,'policy',provider,spec,[eid],'u-'if provider=='govuk'else'p-');n+=1
  counts[eid]={'provider':provider,'query_strata':n,'scope':'source keyword/date discovery only','terms':terms}
 # Non-US estates retain their own public sources. US legal archives provide context, not automatic UK entity findings.
 us=[e for e in sorted(ids)if e not in ('uk-defense-estate','uk-state-market-estate','dialog-estate','transatlantic-defense-innovation-estate')]
 base.add_task(c,'awards','fpds_archive_manifest',{'url':'https://api.figshare.com/v2/articles/28057043','first_month':'000000','last_month':cutoff[:7].replace('-',''),'record_date':'1991-01-01'},['us-defense-estate','public-money-industrial-policy-estate','professional-services-intermediaries-estate','energy-utilities-critical-infrastructure-estate'],'ha-')
 base.add_task(c,'policy','statute_catalog',{'url':'https://www.govinfo.gov/bulkdata/json/STATUTE','record_date':'1991-01-01'},us,'sa-')
 base.add_task(c,'sources','govinfo_sitemap',{'url':'https://www.govinfo.gov/sitemap/GAOREPORTS_sitemap_index.xml','record_date':'1991-01-01','collection':'GAOREPORTS'},us,'ga-')
 for y in range(1991,year+1):
  base.add_task(c,'awards','nsf_awards',{'url':'https://api.nsf.gov/services/v1/awards.json','start':str(y)+'-01-01','end':min(str(y)+'-12-31',cutoff),'record_date':str(y)+'-01-01','selection':'all source awards in date strata; no PI targeting'},['higher-education-research-commercialization-estate','public-money-industrial-policy-estate'],'na-')
 after=c.execute('SELECT count(*) FROM tasks').fetchone()[0]
 result={'added_task_definitions':after-before,'estates':counts,'source_populations':['All source-declared FPDS author-archive monthly shards through cutoff, including predecessor context','GPO source-enumerated Statutes at Large volumes from105','GPO GAO archival sitemap holdings from1991','NSF official award-date strata1991 onward'],'route_mapping_is_finding':False,'whole_ecology_complete':False,'missing_families':'Source-specific SEC, company registry, ownership, campaign finance, procurement award IDs, state/local land and private decision records still need their own adapters; keyword discovery does not replace them.'}
 c.execute('INSERT INTO metadata VALUES(?,?)',(flag,base.j(result)));return result
