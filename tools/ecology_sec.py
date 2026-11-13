#!/usr/bin/env python3
"""SEC EDGAR quarterly master-index acquisition. Filing metadata, not filing text.

The source-native CIK and filing filename are query keys, not legal-owner,
beneficial-owner, control, money-flow, or actor-graph relationships.
One complete official quarterly index is the accepted initial real-source replay.
"""
from __future__ import annotations
import argparse, collections, datetime as dt, hashlib, json, pathlib, re
import ecology_backlog as base
import ecology_sources as src

EDGAR = "https://www.sec.gov/Archives/edgar/full-index/"
ROW = re.compile(r"edgar/data/([0-9]+)/([0-9]{10}-[0-9]{2}-[0-9]{6})[.]txt")
HEADER = "CIK|Company Name|Form Type|Date Filed|Filename"

def source_url(year,quarter):
    if not (1994 <= year <= 2100 and 1 <= quarter <= 4):
        raise ValueError("SEC quarterly index outside declared date or quarter scope")
    return f"{EDGAR}{year}/QTR{quarter}/master.idx"

def rows_from_source(raw,year,quarter):
    """Reject truncated/malformed index files instead of silently accepting a subset."""
    try: lines=raw.decode("latin1").splitlines()
    except UnicodeError as exc: raise ValueError("SEC index decode failure") from exc
    if not lines or "Master Index of EDGAR Dissemination Feed" not in "\n".join(lines[:8]):
        raise ValueError("SEC official master-index identity missing")
    if lines.count(HEADER)!=1:raise ValueError("Source index column header missing or duplicated")
    start=lines.index(HEADER)+1
    if start>=len(lines) or not lines[start].startswith("-"*30):
        raise ValueError("SEC index source delimiter missing")
    entries=[]; seen=set()
    for n,line in enumerate(lines[start+1:],start+2):
        if not line.strip():continue
        cells=line.split("|")
        if len(cells)!=5:raise ValueError(f"Malformed SEC row at source line {n}")
        cik,name,form,filing_date,filename=[x.strip() for x in cells]
        if not cik.isascii() or not cik.isdecimal() or not 1<=len(cik)<=10:
            raise ValueError(f"Invalid source CIK at line {n}")
        if not (name and form) or len(name)>500 or len(form)>70:
            raise ValueError(f"Missing SEC filer label/form at line {n}")
        try: date=dt.date.fromisoformat(filing_date)
        except ValueError as exc: raise ValueError(f"Invalid SEC filing date at line {n}") from exc
        if date.year!=year or (date.month-1)//3+1!=quarter:
            raise ValueError(f"SEC row outside declared calendar quarter at line {n}")
        match=ROW.fullmatch(filename)
        if not match or int(match[1])!=int(cik):
            raise ValueError(f"SEC filing filename/CIK mismatch at line {n}")
        if filename in seen:raise ValueError(f"Duplicate source-native filing path at line {n}")
        seen.add(filename)
        entries.append({
          "cik":"%010d"%int(cik),"source_cik":cik,"source_filer_label":name,
          "form":form,"date_filed":filing_date,"file_path":filename,
          "accession_from_filename":match[2],"source_line":n,
          "record_state":"SEC_quarterly_index_metadata_only_filing_text_not_captured",
          "historical_legal_identity_review":"not_performed",
          "financial_amount_state":"not_reported_in_index",
          "graph_effect":"none"
        })
    if not entries:raise ValueError("Official SEC master index contains no filing rows")
    return entries

def validate_capture(capture,receipt,year,quarter):
    receipt=json.loads(pathlib.Path(receipt).read_text())
    expected=source_url(year,quarter);raw=pathlib.Path(capture).read_bytes()
    if receipt.get("url")!=expected or receipt.get("final_url")!=expected or receipt.get("status")!=200:
        raise ValueError("SEC source receipt route/status mismatch")
    actual=hashlib.sha256(raw).hexdigest()
    if actual!=receipt.get("sha256") or len(raw)!=receipt.get("bytes"):
        raise ValueError("SEC source body hash or length mismatch")
    parsed=rows_from_source(raw,year,quarter)
    if receipt.get("filing_lines") not in (None,len(parsed)+1,len(parsed)):
        raise ValueError("SEC source count differs from original observation")
    return parsed,actual,expected,raw

def accept_source(capture,receipt,year,quarter,out):
    entries,h,url,raw=validate_capture(capture,receipt,year,quarter)
    p=pathlib.Path(out);p.mkdir(parents=True,exist_ok=True)
    data=p/f"SEC-{year}-Q{quarter}-FILINGS.jsonl"
    # This is source-level research output outside the public publication allowlist.
    with data.open("w",encoding="utf-8") as f:
        for x in entries:
            f.write(json.dumps(x,sort_keys=True,ensure_ascii=False)+"\n")
    summary={
      "status":"source_index_parsed_not_live_acquisition_index",
      "source_url":url,"source_sha256":h,"source_bytes":len(raw),
      "source_file":str(capture),"record_file":str(data),
      "filing_metadata_rows":len(entries),"distinct_cik_labels":len({x["cik"] for x in entries}),
      "forms":dict(collections.Counter(x["form"] for x in entries)),
      "earliest_filing":min(x["date_filed"] for x in entries),
      "latest_filing":max(x["date_filed"] for x in entries),
      "filing_bodies_captured":0,"source_quarters_accounted_for":1,
      "whole_sec_census_complete":False,"whole_ecology_complete":False,
      "interpretation":"One official 1994 filing-index quarter is source-complete at the index-row level. Filings themselves, financial amounts, corporate control and beneficial ownership are not established by these rows."
    }
    (p/f"SEC-{year}-Q{quarter}-ACCEPTANCE.json").write_text(json.dumps(summary,indent=2)+"\n")
    return summary

def ingest(state,capture,receipt,year,quarter):
    """Admit to existing FTS only under the original acquisition lock."""
    state=pathlib.Path(state)
    entries,h,url,raw=validate_capture(capture,receipt,year,quarter)
    if not pathlib.Path(capture).resolve().is_relative_to(state.resolve()):
        raise ValueError("Original SEC capture must remain in the existing state owner")
    with base.lock(state,"acquisition"):
        c=base.connect(state);src.ensure(c)
        tid=base.sha(f"SEC_quarterly_master|{year}|{quarter}".encode())
        prior=c.execute("SELECT status FROM tasks WHERE id=?",(tid,)).fetchone()
        if prior and prior["status"]!="source_index_captured_metadata_only":
            raise ValueError("Existing SEC task has an unresolved native disposition")
        with c:
            c.execute("""INSERT OR IGNORE INTO tasks(id,lane,kind,spec,estates,status,updated)
                       VALUES(?,?,?,?,?,?,?)""",
                (tid,"sources","sec_quarterly_master",base.j({"url":url,"year":year,"quarter":quarter}),"[]","source_index_captured_metadata_only",base.utc()))
            capid=base.sha((tid+"\n"+url).encode())
            c.execute("""INSERT OR IGNORE INTO captures(id,task_id,url,request,status,path,sha256,bytes,at,error)
                       VALUES(?,?,?,?,?,?,?,?,?,NULL)""",
                 (capid,tid,url,base.j({"url":url,"method":"GET"}),200,str(pathlib.Path(capture).resolve().relative_to(state.resolve())),h,len(raw),base.utc()))
            observed=0
            for e in entries:
                ident=base.sha(("sec_edgar_quarter_filing|"+e["file_path"]).encode())
                payload=e|{"source_index_url":url,"source_index_sha256":h,"source_index_year":year,"source_index_quarter":quarter,
                           "full_filing_body_captured":False,"related_entity_joins_adjudicated":False}
                observed+=base.upsert_document(c,ident=ident,origin="acquired",locator=url,source_hash=h,
                  position=e["file_path"],kind="sec_filing_index_metadata",estates=[],
                  title="SEC filing "+e["form"]+" "+e["cik"]+" "+e["date_filed"],
                  body=("Source filer label: "+e["source_filer_label"]+"; CIK "+e["cik"]+"; form "+e["form"]+"; filing date "+e["date_filed"]+"; index filename "+e["file_path"]),
                  record_date=e["date_filed"],review="source_index_metadata_unreviewed",payload=payload)
                src.ref(c,ident,"sec_cik",e["cik"],url,h,"source_index_filing_under_cik")
            c.execute("""INSERT OR IGNORE INTO bulk_assets
                 (id,task_id,path,sha256,bytes,source_url,source_class,native_rows,period_start,period_end,schema_json,quality_json,observed_at)
                 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                 ("sec:master:"+str(year)+":Q"+str(quarter),tid,str(pathlib.Path(capture).resolve().relative_to(state.resolve())),h,len(raw),
                  url,"official_SEC_EDGAR_quarterly_index",len(entries),f"{year}-{(quarter-1)*3+1:02d}-01",max(x["date_filed"] for x in entries),
                  base.j(["CIK","Company Name","Form Type","Date Filed","Filename"]),
                  base.j({"filing_bodies_captured":0,"identity": "source_native_cik_only","money":"not_in_source"}),base.utc()))
            c.execute("UPDATE tasks SET rows_seen=?,expected=?,updated=? WHERE id=?",(len(entries),len(entries),base.utc(),tid))
        n=c.execute("SELECT count(*) FROM documents").fetchone()[0]
        f=c.execute("SELECT count(*) FROM search").fetchone()[0]
        if n!=f:raise ValueError("SEC ingestion produced document/FTS mismatch")
        c.close()
        return {"status":"source_index_metadata_captured","task_id":tid,"records_examined":len(entries),
                "new_search_documents":observed,"documents":n,"fts":f,"source_sha256":h,"source_url":url,
                "source_complete_scope":"1994_Q1_SEC_EDGAR_master_index_rows_only",
                "financial_and_identity_reconciliation":"none","public_site_changed":False}

if __name__=="__main__":
    a=argparse.ArgumentParser();a.add_argument("--state",type=pathlib.Path,required=True)
    a.add_argument("--capture",type=pathlib.Path,required=True);a.add_argument("--receipt",type=pathlib.Path,required=True)
    a.add_argument("--year",type=int,required=True);a.add_argument("--quarter",type=int,required=True)
    a.add_argument("--out",type=pathlib.Path);a.add_argument("--ingest",action="store_true")
    z=a.parse_args()
    if z.ingest:
        print(json.dumps(ingest(z.state,z.capture,z.receipt,z.year,z.quarter),indent=2))
    else:
        if z.out is None:raise SystemExit("--out required without --ingest")
        print(json.dumps(accept_source(z.capture,z.receipt,z.year,z.quarter,z.out),indent=2))
