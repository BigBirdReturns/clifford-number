#!/usr/bin/env python3
"""Offline read-only search of an exported Clifford ecology SQLite snapshot."""
import argparse,html,json,sqlite3,webbrowser
from pathlib import Path
from urllib.parse import quote,urlsplit


def search(database,query,limit=50):
    if not query.strip() or len(query)>300 or not 1<=limit<=100:raise ValueError('Search requires 1–300 characters and 1–100 results')
    expression=' AND '.join('"'+x.replace('"','""')+'"' for x in query.split())
    c=sqlite3.connect('file:'+quote(str(database.resolve()).replace('\\','/'),safe='/:')+'?mode=ro',uri=True)
    c.row_factory=sqlite3.Row
    rows=[dict(r) for r in c.execute('SELECT d.id,d.title,d.source_hash,d.locator,d.position,d.kind,d.record_date,d.review,substr(d.body,1,3000) AS excerpt FROM search s JOIN documents d ON d.id=s.id WHERE search MATCH ? ORDER BY bm25(search) LIMIT ?',(expression,limit))]
    total=c.execute('SELECT count(*) FROM documents').fetchone()[0];c.close();return {'query':query,'returned':len(rows),'index_entries':total,'limit':limit,'records':rows,'mode':'read_only_snapshot_search'}


def render(result,root):
    out=['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Clifford / Search results</title><style>body{background:#101b20;color:#dbe6df;font:15px/1.7 system-ui;max-width:1100px;margin:35px auto;padding:0 25px}h1{font:38px Georgia;color:#dabc8d}article{border-top:1px solid #3b5554;padding:20px 0}h2{font-size:19px}small{color:#9fbbb2}a{color:#c5d7ae}pre{font:12px/1.6 ui-monospace,Consolas;white-space:pre-wrap;overflow-wrap:anywhere;background:#16282d;padding:18px}code{color:#c9af85}</style><h1>Clifford Number / Source search</h1>']
    out.append('<p>Query: <b>'+html.escape(result['query'])+'</b> · '+str(result['returned'])+' returned from '+str(result['index_entries'])+' indexed entries. Entries include source observations and retained research records, not independently accepted findings.</p><a href="index.html">Backlog overview</a>')
    for r in result['records']:
        out.append('<article><h2>'+html.escape(str(r['title']))+'</h2><small>'+html.escape(str(r['record_date'] or 'Date unresolved')+' | '+r['kind']+' | '+r['review'])+'</small>')
        if urlsplit(r['locator']).scheme in ('http','https'):out.append('<p><a target="_blank" rel="noopener noreferrer" href="'+html.escape(r['locator'],quote=True)+'">Source endpoint ↗</a></p>')
        else:out.append('<p>Retained source: <code>'+html.escape(r['locator'])+'</code></p>')
        source=root/'data/bodies'/(r['source_hash']+'.body')
        if source.is_file():out.append('<p><a href="data/bodies/'+r['source_hash']+'.body">Exact captured source bytes</a> · row '+html.escape(r['position'])+'</p>')
        out.append('<pre>'+html.escape(r['excerpt'])+'</pre><small>Source SHA-256: '+html.escape(r['source_hash'])+'</small></article>')
    out.append('<p>Source dates, retrieval dates, announced commitments and observed outcomes are distinct. This view performs no network requests, legal-entity joins, review promotions or external actions.</p></html>')
    return ''.join(out)


def main():
    p=argparse.ArgumentParser();p.add_argument('--query');p.add_argument('--database',type=Path);p.add_argument('--json',action='store_true');p.add_argument('--limit',type=int,default=50);a=p.parse_args()
    root=Path(__file__).resolve().parent
    query=a.query or input('Search Clifford source records: ').strip()
    result=search(a.database or root/'data/ecology.sqlite',query,a.limit)
    if a.json:print(json.dumps(result,ensure_ascii=False,indent=2));return
    output=root/'search-results.html';output.write_text(render(result,root),encoding='utf-8');webbrowser.open(output.as_uri())
    print(str(result['returned'])+' results written to '+str(output))
if __name__=='__main__':main()
