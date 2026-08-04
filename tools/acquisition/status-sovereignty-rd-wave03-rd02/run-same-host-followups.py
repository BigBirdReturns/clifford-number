#!/usr/bin/env python3
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import html.parser
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.parse

ROOT = Path(__file__).resolve().parents[3]
if not (ROOT / 'package.json').is_file():
    raise RuntimeError(f'repository root resolution failed: {ROOT}')
BASE = ROOT / 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle'
ADJUDICATION_PATH = BASE / 'same-host-link-adjudication.json'
PROTOCOL_PATH = BASE / 'same-host-followup-protocol.json'
MATRIX_PATH = BASE / 'field-matrix-contract.json'

class LinkParser(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[tuple[str, str]] = []
        self._href: str | None = None
        self._text: list[str] = []
    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == 'a':
            self._href = dict(attrs).get('href')
            self._text = []
    def handle_data(self, data: str) -> None:
        if self._href is not None:
            self._text.append(data)
    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == 'a' and self._href is not None:
            self.links.append((self._href, ' '.join(' '.join(self._text).split())))
            self._href = None
            self._text = []

def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

def allowed_host(host: str, suffix: str) -> bool:
    host = host.lower().rstrip('.')
    suffix = suffix.lower().rstrip('.')
    return host == suffix or host.endswith('.' + suffix)

def execute_route(route: dict, output: Path) -> dict:
    route_dir = output / 'routes' / route['route_id']
    route_dir.mkdir(parents=True, exist_ok=False)
    write_json(route_dir / 'request.json', route)
    headers = route_dir / 'headers.txt'
    body = route_dir / 'body.bin'
    stderr = route_dir / 'stderr.txt'
    curl_json = route_dir / 'curl.json'
    writeout = '{"http_status":%{http_code},"final_url":"%{url_effective}","content_type":"%{content_type}","size_download":%{size_download},"num_redirects":%{num_redirects},"time_total":%{time_total}}'
    command = [
        'curl', '--location', '--silent', '--show-error', '--compressed',
        '--connect-timeout', '15', '--max-time', '90', '--retry', '0',
        '--max-filesize', str(route['maximum_response_body_bytes']),
        '--dump-header', str(headers), '--output', str(body), '--write-out', writeout,
        '--user-agent', 'clifford-number-rd02-wave03-same-host-followup/1.0', route['requested_url'],
    ]
    completed = subprocess.run(command, text=True, capture_output=True, check=False)
    stderr.write_text(completed.stderr, encoding='utf-8')
    metadata = {}
    if completed.stdout.strip():
        try: metadata = json.loads(completed.stdout)
        except json.JSONDecodeError: metadata = {'parse_error': completed.stdout}
    write_json(curl_json, {'exit_code': completed.returncode, 'metadata': metadata})
    body_bytes = body.read_bytes() if body.exists() else b''
    header_bytes = headers.read_bytes() if headers.exists() else b''
    final_url = str(metadata.get('final_url') or route['requested_url'])
    final_host = (urllib.parse.urlparse(final_url).hostname or '').lower()
    host_ok = allowed_host(final_host, route['allowed_final_host_suffix'])
    status = int(metadata.get('http_status') or 0)
    content_type = str(metadata.get('content_type') or '')
    is_pdf = body_bytes.startswith(b'%PDF-')
    is_html = 'html' in content_type.lower() or body_bytes.lstrip().lower().startswith((b'<!doctype html', b'<html'))
    links: list[dict] = []
    text = ''
    parse_error = None
    if is_html:
        text = body_bytes.decode('utf-8', errors='replace')
        parser = LinkParser()
        try: parser.feed(text)
        except Exception as exc: parse_error = f'{type(exc).__name__}: {exc}'
        seen = set()
        for href, anchor in parser.links:
            resolved = urllib.parse.urljoin(final_url, href)
            parsed = urllib.parse.urlparse(resolved)
            if parsed.scheme not in {'http','https'} or not allowed_host(parsed.hostname or '', route['allowed_final_host_suffix']):
                continue
            normalized = urllib.parse.urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), parsed.path or '/', '', parsed.query, ''))
            if normalized in seen or normalized == urllib.parse.urldefrag(final_url)[0]:
                continue
            seen.add(normalized)
            links.append({'url': normalized, 'anchor_text': anchor, 'candidate_only': True, 'admitted_source': False, 'result_spawned_requests': 0})
    lower = text.casefold()
    exact_vehicle = 'stifel north atlantic am-forward, lp'.casefold() in lower or 'stifel north atlantic am-forward'.casefold() in lower
    if completed.returncode != 0:
        terminal = 'terminal_transport_failure'
    elif status != 200:
        terminal = 'terminal_http_non_success'
    elif not host_ok:
        terminal = 'terminal_disallowed_final_host'
    elif route['route_type'] == 'pdf_disclosure_get' and is_pdf:
        terminal = 'http_success_pdf_captured_text_inspection_pending'
    elif route['route_type'] == 'html_disclosure_index_get' and is_html:
        terminal = 'http_success_html_parsed'
    else:
        terminal = 'terminal_unexpected_content_type'
    receipt = {
        'schema_version': 'ssc-rd02-wave03-same-host-followup-route-receipt@1',
        'route_id': route['route_id'], 'link_candidate_ordinal': route['link_candidate_ordinal'], 'unit_ordinal': route['unit_ordinal'],
        'requested_url': route['requested_url'], 'curl_exit': completed.returncode, 'http_status': status,
        'final_url': final_url, 'final_host': final_host, 'final_host_allowed': host_ok, 'content_type': content_type,
        'body_bytes': len(body_bytes), 'body_sha256': sha256_bytes(body_bytes), 'headers_sha256': sha256_bytes(header_bytes),
        'is_pdf_magic': is_pdf, 'is_html': is_html, 'html_parse_error': parse_error,
        'exact_legal_vehicle_text_present': exact_vehicle if is_html else False,
        'pdf_text_inspection_pending': bool(is_pdf), 'same_host_link_candidates': len(links),
        'terminal_route_state': terminal, 'admitted_source': False, 'lifecycle_event_observed': False, 'result_spawned_requests': 0,
    }
    write_json(route_dir / 'same-host-links.json', {'route_id': route['route_id'], 'candidate_urls': links, 'result_spawned_requests': 0})
    write_json(route_dir / 'receipt.json', receipt)
    return receipt

def build_manifest(output: Path) -> dict:
    entries=[]
    for path in sorted(p for p in output.rglob('*') if p.is_file() and p.name != 'manifest.json'):
        data=path.read_bytes(); entries.append({'path':path.relative_to(output).as_posix(),'bytes':len(data),'sha256':sha256_bytes(data)})
    combined=''.join(f"{row['sha256']}  {row['path']}\n" for row in entries).encode()
    manifest={'schema_version':'ssc-rd02-wave03-same-host-followup-manifest@1','entry_count':len(entries),'combined_sha256':sha256_bytes(combined),'entries':entries}
    write_json(output/'manifest.json',manifest); return manifest

def main() -> int:
    parser=argparse.ArgumentParser(); parser.add_argument('--output',required=True); args=parser.parse_args()
    output=Path(args.output).resolve()
    if output.exists(): shutil.rmtree(output)
    output.mkdir(parents=True)
    adjudication=json.loads(ADJUDICATION_PATH.read_text())
    protocol=json.loads(PROTOCOL_PATH.read_text())
    matrix=json.loads(MATRIX_PATH.read_text())
    inputs=output/'inputs'; inputs.mkdir()
    shutil.copy2(ADJUDICATION_PATH,inputs/'same-host-link-adjudication.json')
    shutil.copy2(PROTOCOL_PATH,inputs/'same-host-followup-protocol.json')
    shutil.copy2(MATRIX_PATH,inputs/'field-matrix-contract.json')
    write_json(output/'plan.json',{'schema_version':'ssc-rd02-wave03-same-host-followup-plan@1','class_id':'RD-02-C05','legal_vehicle':matrix['units'][14]['legal_vehicle'],'routes':protocol['routes'],'result_spawned_requests':0})
    with concurrent.futures.ThreadPoolExecutor(max_workers=protocol['execution_contract']['maximum_parallel_workers']) as pool:
        receipts=list(pool.map(lambda route: execute_route(route,output),protocol['routes']))
    receipts.sort(key=lambda row:row['route_id'])
    write_json(output/'route-results.json',{'schema_version':'ssc-rd02-wave03-same-host-followup-route-results@1','routes':receipts})
    link_candidates=[]
    for receipt in receipts:
        payload=json.loads((output/'routes'/receipt['route_id']/'same-host-links.json').read_text())
        for row in payload['candidate_urls']:
            link_candidates.append({'source_route_id':receipt['route_id'],'unit_ordinal':15,**row})
    dedup={}
    for row in link_candidates:
        dedup.setdefault(row['url'],row)
    links=list(dedup.values())
    write_json(output/'same-host-link-candidates.json',{'schema_version':'ssc-rd02-wave03-disclosure-link-candidates@1','candidate_urls':links,'counts':{'candidate_urls':len(links),'admitted_sources':0,'result_spawned_requests':0},'boundaries':{'candidate_is_source':False,'candidate_is_lifecycle_event':False,'graph_effect':'none'}})
    states={}
    for row in receipts: states[row['terminal_route_state']]=states.get(row['terminal_route_state'],0)+1
    summary={'schema_version':'ssc-rd02-wave03-same-host-followup-summary@1','wave_id':'SSC-RD-W03','lane_id':'RD-02','class_id':'RD-02-C05','issue':1015,'terminal_capture_state':'fixed_disclosure_followups_executed_page_adjudication_pending','counts':{'fixed_routes':5,'route_attempts':5,'terminal_routes':len(receipts),'route_state_counts':states,'exact_legal_vehicle_html_matches':sum(bool(x['exact_legal_vehicle_text_present']) for x in receipts),'pdf_text_inspections_pending':sum(bool(x['pdf_text_inspection_pending']) for x in receipts),'same_host_link_candidates':len(links),'admitted_sources':0,'lifecycle_events_observed':0,'result_spawned_requests':0,'external_contacts':0,'external_reviews':0},'current_result':{'followup_execution_complete':True,'page_content_adjudication_complete':False,'field_matrix_terminal':False,'class_state':'still_open','class_closed':False,'outside_human_dependency':False,'project_blocking':False,'publication_effect':'none','adoption_effect':'none','graph_effect':'none'},'next_bounded_operation':'inspect any recovered PDF and terminally adjudicate the captured disclosure surfaces and frozen same-host candidates'}
    write_json(output/'summary.json',summary)
    write_json(output/'execution-receipt.json',{'schema_version':'ssc-rd02-wave03-same-host-followup-execution@1','workflow_run':int(os.getenv('GITHUB_RUN_ID','0')),'workflow_attempt':int(os.getenv('GITHUB_RUN_ATTEMPT','0')),'head':os.getenv('GITHUB_SHA',''),'protocol_sha256':sha256_bytes(PROTOCOL_PATH.read_bytes()),'fixed_routes':5,'terminal_routes':len(receipts),'same_host_link_candidates':len(links),'admitted_sources':0,'result_spawned_requests':0,'class_closed':False,'publication_effect':'none','adoption_effect':'none','graph_effect':'none'})
    build_manifest(output)
    if len(receipts)!=5 or any(x['result_spawned_requests']!=0 or x['admitted_source'] or x['lifecycle_event_observed'] for x in receipts):
        raise RuntimeError('capture authority or denominator violation')
    print(json.dumps(summary,indent=2)); return 0
if __name__=='__main__': sys.exit(main())
