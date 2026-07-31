from pathlib import Path
import json,hashlib,os
R=Path('.')
def W(p,s):
 p=R/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf-8')
def J(p,o):W(p,json.dumps(o,indent=2,ensure_ascii=False)+'\n')
wave='CS-W07-B02';batch='CS-AQ-B02';day='2026-07-31'
C={'batch_objects':6,'denominator_classes':6,'official_source_packets':13,'qualifying_acquisitions':4,'partial_acquisitions':2,'identity_minimized_packets':4,'person_attributable_packets':2,'system_mechanism_packets':2,'blind_reviews_executed':0,'field_tests_executed':0,'operator_findings':0,'promotions':0,'person_rankings':0,'public_identity_releases':0,'graph_effects':0,'adversarial_mutations':30}
def S(i,c,cl,t,u,s,l,loc='bounded official extract'):
 return {'source_id':f'CS-W07-S{i:03}','candidate_id':c,'source_class':cl,'title':t,'url':u,'locator':loc,'supports':s,'limits':l}
src=[
S(1,'CS-C0002','official_special_counsel_release','CBP helicopter-safety retaliation settlement','https://www.osc.gov/news/2024-11-14/osc-obtains-six-figure-settlement-for-cbp-whistleblower-who-faced-retaliation-for-disclosing-helicopter-safety-issues/',['credible retaliation evidence','confirmed fleet and crash-report facts','institutional exclusion and settlement'],['not original safety work','settlement is not final merits']),
S(2,'CS-C0007','official_inspector_general_disposition','AmeriCorps complaint dismissed for lack of evidence','https://www.oversight.gov/reports/americorps-dismisses-whistleblower-complaint-due-lack-evidence-0',['non-substantiation disposition','no relief ordered'],['original complaint missing','complete merits file missing','absence of evidence is not affirmative disproof']),
S(3,'CS-C0012','official_agency_history','Remembering Columbia and Her Crew','https://www.nasa.gov/history/20-years-ago-remembering-columbia-and-her-crew/',['engineers requested high-resolution imagery','management declined before re-entry'],['retrospective history','does not prove rescue or repair would succeed']),
S(4,'CS-C0012','official_accident_report','Columbia Accident Investigation Board Report, Volume I','https://www.nasa.gov/history/columbia-accident-investigation-board-report/',['imagery requests and management termination','uncertainty compression and foam-risk normalization'],['system reconstruction','does not isolate one operator'],'Volume I, Chapter 6'),
S(5,'CS-C0012','official_accident_report_extract','CAIB organizational causes and recommendations','https://www.nasa.gov/history/columbia-accident-investigation-board-report/',['barriers inhibited dissent and information flow','failed request chronology preserved'],['recommendation is not implementation','collective work is not one person'],'Volume I, Chapters 7–8'),
S(6,'CS-C0017','official_accountability_report','WMATA Inspector General independence and effectiveness','https://files.gao.gov/reports/GAO-25-107104/index.html',['critical compliance report preceded anticipated termination and resignation','annual renewal and missing removal rules weakened independence'],['no formal termination order','complete board rationale missing']),
S(7,'CS-C0017','official_accountability_report_pdf','GAO-25-107104 report bytes','https://www.gao.gov/assets/gao-25-107104.pdf',['source-addressable report custody','independence criteria and documentary basis'],['later reconstruction','underlying WMATA report not separately retained'])]
