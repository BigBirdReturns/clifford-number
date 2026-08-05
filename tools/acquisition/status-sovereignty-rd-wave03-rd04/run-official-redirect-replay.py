#!/usr/bin/env python3
from __future__ import annotations
import argparse, concurrent.futures, hashlib, json, os, pathlib, subprocess, sys, tempfile
from urllib.parse import urlparse

ROOT=pathlib.Path(__file__).resolve().parents[3]
PROTOCOL=ROOT/'data/intake/status-sovereignty-rd-wave03-rd04-candidate-adjudication/official-redirect-replay-protocol.json'

def sha(data:bytes)->str:return hashlib.sha256(data).hexdigest()
def write_json(path:pathlib.Path,obj)->None:path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
def read_protocol():return json.loads(PROTOCOL.read_text(encoding='utf-8'))

def validate(protocol):
    assert protocol['schema_version']=='ssc-rd04-wave03-official-redirect-replay-protocol@1'
    assert protocol['denominator']=={'source_routes':54,'replay_routes':54,'final_host':'www.fna.usda.gov','original_http_successes':54,'original_protocol_admissions':0}
    assert len(protocol['routes'])==54
    assert protocol['execution_contract']['maximum_attempts_per_route']==1
    assert protocol['execution_contract']['maximum_parallel_workers']==6
    assert protocol['execution_contract']['result_spawned_requests']==0
    source_ids=set(); replay_ids=set()
    for i,r in enumerate(protocol['routes'],1):
        assert r['replay_ordinal']==i
        assert r['replay_route_id']==f'RD04-W03-FNA-{i:03d}'
        assert r['allowed_final_host']=='www.fna.usda.gov'
        assert urlparse(r['raw_requested_url']).hostname=='www.fns.usda.gov'
        assert urlparse(r['transport_url']).hostname=='www.fna.usda.gov'
        assert urlparse(r['raw_requested_url']).path==urlparse(r['transport_url']).path
        assert r['maximum_attempts']==1 and r['result_spawned_requests']==0
        assert not r['automatic_source_admission'] and not r['automatic_field_classification'] and not r['automatic_class_closure']
        source_ids.add(r['source_route_id']); replay_ids.add(r['replay_route_id'])
    assert len(source_ids)==54 and len(replay_ids)==54

def execute_route(route,out):
    route_dir=out/'routes'/route['replay_route_id'];route_dir.mkdir(parents=True,exist_ok=True)
    write_json(route_dir/'request.json',route)
    headers=route_dir/'headers.txt';body=route_dir/'body.bin';stderr=route_dir/'stderr.txt'
    fmt=json.dumps({'http_status':'%{http_code}','final_url':'%{url_effective}','content_type':'%{content_type}','size_download':'%{size_download}','num_redirects':'%{num_redirects}','time_total':'%{time_total}'})
    cmd=['curl','--silent','--show-error','--location','--max-time','120','--connect-timeout','20','--user-agent','clifford-number-evidence-capture/1.0','--dump-header',str(headers),'--output',str(body),'--write-out',fmt,route['transport_url']]
    p=subprocess.run(cmd,capture_output=True,text=True)
    stderr.write_text(p.stderr,encoding='utf-8')
    meta={}
    try:meta=json.loads(p.stdout or '{}')
    except json.JSONDecodeError:meta={'raw_write_out':p.stdout}
    write_json(route_dir/'curl.json',{'exit_code':p.returncode,'metadata':meta})
    body_bytes=body.read_bytes() if body.exists() else b''; header_bytes=headers.read_bytes() if headers.exists() else b''
    status=int(meta.get('http_status') or 0);final_url=meta.get('final_url') or '';host=(urlparse(final_url).hostname or '').lower()
    if p.returncode!=0:state='terminal_transport_failure'
    elif len(body_bytes)>route['maximum_body_bytes']:state='terminal_body_too_large'
    elif host!=route['allowed_final_host']:state='terminal_disallowed_final_host'
    elif not (200<=status<300):state='terminal_http_non_success'
    else:state='http_success_pending_source_adjudication'
    receipt={
      'replay_route_id':route['replay_route_id'],'source_route_id':route['source_route_id'],'replay_ordinal':route['replay_ordinal'],
      'state':state,'request_attempts':1,'curl_exit_code':p.returncode,'http_status':status,'final_url':final_url,'final_host':host,
      'content_type':meta.get('content_type') or '','body_bytes':len(body_bytes),'body_sha256':sha(body_bytes),
      'headers_bytes':len(header_bytes),'headers_sha256':sha(header_bytes),'candidate_rows_are_admitted_sources':False,
      'source_admitted':False,'field_classification_effect':'none','class_closed':False,'result_spawned_requests':0
    }
    write_json(route_dir/'receipt.json',receipt);return receipt

def build_manifest(out):
    entries=[]
    for p in sorted(out.rglob('*')):
        if p.is_file() and p.name!='manifest.json':
            b=p.read_bytes();entries.append({'path':str(p.relative_to(out)),'bytes':len(b),'sha256':sha(b)})
    combined=sha((''.join(f"{e['path']}\t{e['bytes']}\t{e['sha256']}\n" for e in entries)).encode())
    write_json(out/'manifest.json',{'schema_version':'ssc-rd04-wave03-official-redirect-replay-artifact-manifest@1','entries':entries,'combined_sha256':combined})

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--validate-only',action='store_true');ap.add_argument('--output',type=pathlib.Path);args=ap.parse_args()
    protocol=read_protocol();validate(protocol)
    if args.validate_only:
        print('RD-04 official redirect replay validated: 54 fixed routes, exact final host www.fna.usda.gov, zero automatic admission');return
    if not args.output:ap.error('--output is required unless --validate-only')
    out=args.output;out.mkdir(parents=True,exist_ok=True);write_json(out/'protocol.json',protocol)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        receipts=list(ex.map(lambda r:execute_route(r,out),protocol['routes']))
    receipts.sort(key=lambda r:r['replay_ordinal'])
    states={}
    for r in receipts:states[r['state']]=states.get(r['state'],0)+1
    write_json(out/'route-results.json',{'schema_version':'ssc-rd04-wave03-official-redirect-replay-route-results@1','routes':receipts})
    summary={'schema_version':'ssc-rd04-wave03-official-redirect-replay-summary@1','fixed_routes':54,'terminal_routes':54,'state_counts':states,'http_success_pending_source_adjudication':states.get('http_success_pending_source_adjudication',0),'admitted_sources':0,'field_classifications':0,'class_closed':False,'result_spawned_requests':0,'outside_human_dependency':False}
    write_json(out/'summary.json',summary)
    write_json(out/'execution-receipt.json',{'schema_version':'ssc-rd04-wave03-official-redirect-replay-execution-receipt@1','protocol_path':str(PROTOCOL.relative_to(ROOT)),'fixed_routes':54,'terminal_routes':len(receipts),'state_counts':states,'automatic_source_admission':False,'automatic_field_classification':False,'automatic_class_closure':False,'outside_human_dependency':False,'publication_effect':'none','adoption_effect':'none','graph_effect':'none'})
    build_manifest(out);print(json.dumps(summary,indent=2))
if __name__=='__main__':main()
