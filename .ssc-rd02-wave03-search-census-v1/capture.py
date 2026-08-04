#!/usr/bin/env python3
import copy, datetime as dt, hashlib, json, os, pathlib, subprocess, sys, urllib.parse
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT=pathlib.Path(sys.argv[1]).resolve()
OUT=pathlib.Path(sys.argv[2]).resolve()
HEAD="431f94963c369f982d262e96ed378806862539aa"
MATRIX="data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/field-matrix-contract.json"
SEED="data/project/ssc-residual-wave03/seeds/RD-02-C05.json"
MATRIX_BLOB="a042514e71920ab8549d8b5ebfe1f78e59b679dc"
SEED_BLOB="33571874afe10cf389de65bbf6426bdb297932b7"
MAX_BODY=2097152
SPECS=[
 {"code":"portfolio","terms":"(portfolio OR investment OR invested OR backing OR backed OR follow-on OR \"follow on\")"},
 {"code":"disposition","terms":"(exit OR exited OR acquisition OR acquired OR IPO OR write-off OR writeoff OR default OR cure OR loss)"},
 {"code":"recovery","terms":"(return OR distribution OR repayment OR repaid OR debenture OR leverage OR SBA OR recovery)"},
]

def sh(*args):
 r=subprocess.run(args,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 if r.returncode: raise RuntimeError(f"{' '.join(args)}: {r.stderr}")
 return r.stdout.strip()
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def dump(path,obj):
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
def stamp(): return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00","Z")
def check(cond,msg):
 if not cond: raise RuntimeError(msg)

check(sh("git","-C",str(ROOT),"rev-parse","HEAD")==HEAD,"target head drift")
check(sh("git","-C",str(ROOT),"hash-object",MATRIX)==MATRIX_BLOB,"matrix blob drift")
check(sh("git","-C",str(ROOT),"hash-object",SEED)==SEED_BLOB,"seed blob drift")
matrix=json.loads((ROOT/MATRIX).read_text())
seed=json.loads((ROOT/SEED).read_text())
units=matrix["units"]
check(matrix["class_id"]=="RD-02-C05" and matrix["issue"]==1015,"matrix identity")
check(matrix["class_state"]=="still_open" and matrix["class_closed"] is False,"matrix premature closure")
check(len(units)==18 and [u["row"] for u in units]==list(range(1,19)),"unit denominator")
named=[u for u in units if u["identity_state"]=="publicly_named"]
withheld=[u for u in units if u["identity_state"]=="identity_withheld_under_policy"]
check(len(named)==17 and len(withheld)==1 and withheld[0]["row"]==18,"17+1 identity denominator")
check(seed["class_id"]=="RD-02-C05" and seed["class_state"]=="still_open","seed identity")

routes=[]
for u in named:
 for spec in SPECS:
  q=f'"{u["legal_vehicle"]}" {spec["terms"]}'
  routes.append({
   "route_id":f'RD02-W03-R{u["row"]:02d}-{spec["code"].upper()}',
   "row":u["row"],"legal_vehicle":u["legal_vehicle"],"query_class":spec["code"],
   "query":q,
   "url":"https://www.bing.com/search?format=rss&q="+urllib.parse.quote(q,safe=""),
   "maximum_attempts":1,"maximum_body_bytes":MAX_BODY,
   "candidate_rows_are_admitted_sources":False,"result_spawned_requests":0
  })
check(len(routes)==51 and len({r["route_id"] for r in routes})==51,"route denominator")

protocol={
 "schema_version":"ssc-rd02-wave03-portfolio-lifecycle-search-census-protocol@1",
 "wave_id":"SSC-RD-W03","lane_id":"RD-02","class_id":"RD-02-C05","issue":1015,
 "authority":"fixed_search_census_candidate_custody_not_terminal_class_receipt",
 "target_head":HEAD,
 "inputs":{"matrix_path":MATRIX,"matrix_blob":MATRIX_BLOB,"seed_path":SEED,"seed_blob":SEED_BLOB},
 "denominator":{"cohort_rows":18,"named_rows":17,"withheld_rows":1,"query_classes":3,"fixed_routes":51,"withheld_routes":0},
 "query_specs":SPECS,"routes":routes,
 "withheld_boundary":{"row":18,"identity_guessing":False,"manager_substitution":False,"network_routes":0},
 "execution":{"frozen_before_requests":True,"maximum_attempts_per_route":1,"result_spawned_requests":0,
              "candidate_admission_without_followup_receipt":False,"search_silence_is_event_absence":False,
              "search_result_is_lifecycle_event":False,"automatic_class_closure":False},
 "authority_boundaries":{"outside_human_dependency":False,"external_contacts":0,"external_reviews":0,
  "reviewed_disposition_changed":False,"capital_conversion_finding":False,"favoritism_finding":False,
  "extraction_finding":False,"coordination_finding":False,"common_purpose_finding":False,
  "complete_compact_finding":False,"publication_effect":"none","adoption_effect":"none","graph_effect":"none"},
 "current_result":{"protocol_frozen":True,"requests_executed":False,"candidate_urls_admitted":0,
                   "class_state":"still_open","class_closed":False}
}
def validate(p):
 check(p["schema_version"]==protocol["schema_version"],"schema")
 check(p["wave_id"]=="SSC-RD-W03" and p["class_id"]=="RD-02-C05" and p["issue"]==1015,"identity")
 check(p["target_head"]==HEAD and p["inputs"]==protocol["inputs"],"bindings")
 check(p["denominator"]==protocol["denominator"],"denominator")
 check(p["query_specs"]==SPECS and p["routes"]==routes,"routes")
 check(p["withheld_boundary"]==protocol["withheld_boundary"],"withheld")
 check(p["execution"]==protocol["execution"],"execution")
 check(p["authority_boundaries"]==protocol["authority_boundaries"],"authority")
 check(p["current_result"]==protocol["current_result"],"result")
validate(protocol)
mutations=[
 ("head",lambda p:p.__setitem__("target_head","0"*40)),
 ("cohort",lambda p:p["denominator"].__setitem__("cohort_rows",17)),
 ("named",lambda p:p["denominator"].__setitem__("named_rows",18)),
 ("withheld",lambda p:p["denominator"].__setitem__("withheld_routes",1)),
 ("drop route",lambda p:p["routes"].pop()),
 ("duplicate route",lambda p:p["routes"].__setitem__(1,copy.deepcopy(p["routes"][0]))),
 ("reorder",lambda p:p["routes"].reverse()),
 ("row substitution",lambda p:p["routes"][0].__setitem__("row",18)),
 ("name substitution",lambda p:p["routes"][0].__setitem__("legal_vehicle","invented")),
 ("query substitution",lambda p:p["routes"][0].__setitem__("query","invented")),
 ("URL substitution",lambda p:p["routes"][0].__setitem__("url","https://example.com")),
 ("second attempt",lambda p:p["routes"][0].__setitem__("maximum_attempts",2)),
 ("admission",lambda p:p["routes"][0].__setitem__("candidate_rows_are_admitted_sources",True)),
 ("spawn",lambda p:p["execution"].__setitem__("result_spawned_requests",1)),
 ("silence absence",lambda p:p["execution"].__setitem__("search_silence_is_event_absence",True)),
 ("auto closure",lambda p:p["execution"].__setitem__("automatic_class_closure",True)),
 ("human gate",lambda p:p["authority_boundaries"].__setitem__("outside_human_dependency",True)),
 ("contact",lambda p:p["authority_boundaries"].__setitem__("external_contacts",1)),
 ("favoritism",lambda p:p["authority_boundaries"].__setitem__("favoritism_finding",True)),
 ("extraction",lambda p:p["authority_boundaries"].__setitem__("extraction_finding",True)),
 ("coordination",lambda p:p["authority_boundaries"].__setitem__("coordination_finding",True)),
 ("common purpose",lambda p:p["authority_boundaries"].__setitem__("common_purpose_finding",True)),
 ("compact",lambda p:p["authority_boundaries"].__setitem__("complete_compact_finding",True)),
 ("graph",lambda p:p["authority_boundaries"].__setitem__("graph_effect","changed")),
 ("premature closure",lambda p:p["current_result"].__setitem__("class_closed",True)),
]
refused=[]
for name,mut in mutations:
 c=copy.deepcopy(protocol); mut(c)
 try: validate(c)
 except Exception: refused.append(name)
 else: raise RuntimeError(f"mutation passed: {name}")
OUT.mkdir(parents=True,exist_ok=True)
dump(OUT/"protocol.json",protocol)
dump(OUT/"adversarial-receipt.json",{"schema_version":"ssc-rd02-wave03-search-census-adversarial@1",
 "mutations_attempted":len(mutations),"mutations_refused":len(refused),"refused":refused})
dump(OUT/"input-bindings.json",{"target_head":HEAD,"matrix_path":MATRIX,"matrix_blob":MATRIX_BLOB,
 "matrix_sha256":sha(ROOT/MATRIX),"seed_path":SEED,"seed_blob":SEED_BLOB,"seed_sha256":sha(ROOT/SEED)})
dump(OUT/"plan.json",{"schema_version":"ssc-rd02-wave03-search-census-plan@1","frozen_before_requests":True,
 "cohort_rows":18,"named_rows":17,"withheld_rows":1,"fixed_routes":51,"maximum_workers":6,
 "maximum_attempts_per_route":1,"maximum_body_bytes":MAX_BODY,"result_spawned_requests":0,
 "class_state":"still_open","class_closed":False})
with (OUT/"routes.tsv").open("w") as f:
 f.write("route_id\trow\tquery_class\tlegal_vehicle\turl\n")
 for r in routes:f.write(f'{r["route_id"]}\t{r["row"]}\t{r["query_class"]}\t{r["legal_vehicle"]}\t{r["url"]}\n')

def parse_rss(path):
 try:
  root=ET.fromstring(path.read_bytes()); rows=[]
  for i,item in enumerate(root.findall(".//item"),1):
   get=lambda tag: ((item.find(tag).text or "").strip() if item.find(tag) is not None and item.find(tag).text else "")
   url=get("link")
   if url:
    rows.append({"ordinal":i,"title":get("title"),"url":url,
     "domain":(urllib.parse.urlparse(url).hostname or "").lower(),
     "description":get("description")[:4000],"published":get("pubDate"),
     "candidate_only":True,"admitted_source":False})
  return rows,None
 except Exception as e:return [],f"{type(e).__name__}: {e}"

def capture(r):
 d=OUT/"routes"/r["route_id"]/"attempt-1"; d.mkdir(parents=True)
 body=d/"body.bin"; headers=d/"headers.txt"; start=stamp()
 (d/"request-url.txt").write_text(r["url"]+"\n");(d/"query.txt").write_text(r["query"]+"\n");(d/"started-at.txt").write_text(start+"\n")
 cmd=["curl","--location","--silent","--show-error","--connect-timeout","15","--max-time","45",
      "--max-filesize",str(MAX_BODY),"--retry","0","--user-agent","clifford-number-evidence-capture/1.0",
      "--dump-header",str(headers),"--output",str(body),
      "--write-out","%{http_code}\t%{url_effective}\t%{content_type}\t%{size_download}",r["url"]]
 p=subprocess.run(cmd,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 (d/"curl-exit.txt").write_text(str(p.returncode)+"\n");(d/"curl-meta.txt").write_text(p.stdout+"\n")
 (d/"curl-stderr.txt").write_text(p.stderr);(d/"finished-at.txt").write_text(stamp()+"\n")
 parts=p.stdout.split("\t",3); status=int(parts[0]) if parts and parts[0].isdigit() else 0
 candidates,err=(parse_rss(body) if p.returncode==0 and status==200 and body.exists() else ([],None))
 state=("http_success_rss_parsed" if p.returncode==0 and status==200 and err is None else
        "http_success_rss_parse_failed" if p.returncode==0 and status==200 else
        "terminal_http_non_success" if p.returncode==0 else "terminal_transport_failure")
 receipt={"schema_version":"ssc-rd02-wave03-search-route-receipt@1","route_id":r["route_id"],
  "row":r["row"],"legal_vehicle":r["legal_vehicle"],"query_class":r["query_class"],
  "curl_exit":p.returncode,"http_status":status,"final_url":parts[1] if len(parts)>1 else None,
  "content_type":parts[2] if len(parts)>2 else None,"body_bytes":body.stat().st_size if body.exists() else 0,
  "body_sha256":sha(body) if body.exists() else None,"headers_sha256":sha(headers) if headers.exists() else None,
  "candidate_rows":len(candidates),"parse_error":err,"terminal_route_state":state,
  "candidate_rows_are_admitted_sources":False,"result_spawned_requests":0}
 dump(OUT/"routes"/r["route_id"]/"receipt.json",receipt)
 return r,receipt,candidates

results=[]; candidates=[]
with ThreadPoolExecutor(max_workers=6) as ex:
 future={ex.submit(capture,r):r for r in routes}
 for f in as_completed(future):
  r,receipt,rows=f.result();results.append(receipt)
  candidates.extend({"route_id":r["route_id"],"row":r["row"],"legal_vehicle":r["legal_vehicle"],
                     "query_class":r["query_class"],**row} for row in rows)
results.sort(key=lambda x:x["route_id"]);candidates.sort(key=lambda x:(x["route_id"],x["ordinal"]))
states={}
for r in results:states[r["terminal_route_state"]]=states.get(r["terminal_route_state"],0)+1
domains={}
for c in candidates:domains[c["domain"]]=domains.get(c["domain"],0)+1
unique=len({c["url"] for c in candidates})
official=sum(1 for c in candidates if c["domain"].endswith(".gov"))
dump(OUT/"route-results.json",{"schema_version":"ssc-rd02-wave03-search-route-results@1","routes":results,
 "counts":{"fixed_routes":51,"route_attempts":len(results),"terminal_routes":len(results),"state_counts":states}})
dump(OUT/"candidate-index.json",{"schema_version":"ssc-rd02-wave03-search-candidate-index@1","candidate_rows":candidates,
 "counts":{"candidate_rows":len(candidates),"unique_candidate_urls":unique,"official_domain_candidate_rows":official,
           "candidate_urls_admitted":0,"result_spawned_requests":0},"domain_counts":dict(sorted(domains.items())),
 "boundaries":{"candidate_is_admitted_source":False,"candidate_is_lifecycle_event":False,
               "search_silence_is_event_absence":False,"graph_effect":"none"}})
dump(OUT/"summary.json",{"schema_version":"ssc-rd02-wave03-search-census-summary@1","wave_id":"SSC-RD-W03",
 "lane_id":"RD-02","class_id":"RD-02-C05","issue":1015,
 "terminal_capture_state":"fixed_search_census_executed_candidate_adjudication_pending",
 "counts":{"cohort_rows":18,"named_rows":17,"withheld_rows":1,"fixed_routes":51,
           "route_attempts":len(results),"terminal_routes":len(results),"route_state_counts":states,
           "candidate_rows":len(candidates),"unique_candidate_urls":unique,
           "official_domain_candidate_rows":official,"candidate_urls_admitted":0,
           "result_spawned_requests":0,"external_contacts":0,"external_reviews":0},
 "current_result":{"fixed_protocol_executed":True,"candidate_adjudication_complete":False,
   "followup_protocol_frozen":False,"field_matrix_terminal":False,"class_state":"still_open","class_closed":False,
   "outside_human_dependency":False,"project_blocking":False,"capital_conversion_finding":False,
   "favoritism_finding":False,"extraction_finding":False,"coordination_finding":False,
   "common_purpose_finding":False,"complete_compact_finding":False,
   "publication_effect":"none","adoption_effect":"none","graph_effect":"none"},
 "next_bounded_operation":"adjudicate the frozen candidate URL census and freeze exact first-party or official follow-up routes"})
dump(OUT/"execution-receipt.json",{"schema_version":"ssc-rd02-wave03-search-census-execution@1",
 "workflow_run":int(os.environ.get("GITHUB_RUN_ID","0")),"workflow_attempt":int(os.environ.get("GITHUB_RUN_ATTEMPT","0")),
 "target_head":HEAD,"protocol_sha256":sha(OUT/"protocol.json"),"plan_sha256":sha(OUT/"plan.json"),
 "routes_tsv_sha256":sha(OUT/"routes.tsv"),"adversarial_mutations_refused":len(refused),
 "fixed_routes":51,"candidate_rows":len(candidates),"unique_candidate_urls":unique,
 "candidate_urls_admitted":0,"result_spawned_requests":0,"outside_human_dependency":False,
 "external_contacts":0,"external_reviews":0,"publication_effect":"none","adoption_effect":"none","graph_effect":"none"})
entries=[]
for p in sorted(x for x in OUT.rglob("*") if x.is_file() and x.name!="manifest.json"):
 entries.append({"path":str(p.relative_to(OUT)),"bytes":p.stat().st_size,"sha256":sha(p)})
combined=hashlib.sha256("\n".join(f'{e["path"]}\t{e["bytes"]}\t{e["sha256"]}' for e in entries).encode()).hexdigest()
dump(OUT/"manifest.json",{"schema_version":"ssc-rd02-wave03-search-census-manifest@1",
 "entry_count":len(entries),"combined_sha256":combined,"entries":entries})
print(json.dumps({"fixed_routes":51,"route_states":states,"candidate_rows":len(candidates),
 "unique_candidate_urls":unique,"official_domain_candidate_rows":official,
 "mutations_refused":len(refused),"manifest_combined_sha256":combined},indent=2))
