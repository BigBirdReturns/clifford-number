#!/usr/bin/env python3
from __future__ import annotations
import argparse, concurrent.futures, hashlib, json, pathlib, subprocess
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[3]
PROTOCOL = ROOT / 'data/intake/status-sovereignty-rd-wave03-rd04-official-source-adjudication/next-source-protocol.json'

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def write_json(path: pathlib.Path, obj: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

def read_protocol() -> dict:
    return json.loads(PROTOCOL.read_text(encoding='utf-8'))

def host_allowed(host: str, suffix: str) -> bool:
    host = host.lower()
    suffix = suffix.lower()
    return host == suffix or host.endswith('.' + suffix)

def validate(protocol: dict) -> None:
    assert protocol['schema_version'] == 'ssc-rd04-wave03-state-source-protocol@1'
    assert protocol['execution_trigger_path'] == '.ssc-rd04-wave03-state-source-trigger/EXECUTE'
    assert protocol['denominator'] == {
        'federal_document_routes': 4,
        'state_agency_root_routes': 50,
        'fixed_routes': 54,
        'maximum_attempts_per_route': 1,
        'maximum_parallel_workers': 6,
        'result_spawned_requests': 0,
    }
    assert len(protocol['routes']) == 54
    route_ids: set[str] = set()
    urls: set[str] = set()
    for ordinal, route in enumerate(protocol['routes'], 1):
        assert route['route_ordinal'] == ordinal
        assert route['maximum_attempts'] == 1
        assert route['result_spawned_requests'] == 0
        assert route['automatic_source_admission'] is False
        assert route['automatic_field_classification'] is False
        assert route['automatic_class_closure'] is False
        host = (urlparse(route['requested_url']).hostname or '').lower()
        assert host_allowed(host, route['allowed_final_host_suffix'])
        if ordinal <= 4:
            assert route['scope'] == 'shared_federal'
            assert route['route_id'] == f'RD04-W03-NEXT-FED-{ordinal:03d}'
        else:
            state_ordinal = ordinal - 4
            assert route['scope'] == 'state'
            assert route['unit_ordinal'] == state_ordinal
            assert route['route_id'] == f'RD04-W03-NEXT-STATE-{state_ordinal:02d}'
        route_ids.add(route['route_id'])
        urls.add(route['requested_url'])
    assert len(route_ids) == 54
    assert len(urls) == 54

def execute_route(route: dict, out: pathlib.Path) -> dict:
    route_dir = out / 'routes' / route['route_id']
    route_dir.mkdir(parents=True, exist_ok=True)
    write_json(route_dir / 'request.json', route)
    headers = route_dir / 'headers.txt'
    body = route_dir / 'body.bin'
    stderr = route_dir / 'stderr.txt'
    fmt = json.dumps({
        'http_status': '%{http_code}',
        'final_url': '%{url_effective}',
        'content_type': '%{content_type}',
        'size_download': '%{size_download}',
        'num_redirects': '%{num_redirects}',
        'time_total': '%{time_total}',
    })
    cmd = [
        'curl', '--silent', '--show-error', '--location', '--max-time', '150', '--connect-timeout', '25',
        '--user-agent', 'clifford-number-evidence-capture/1.0', '--dump-header', str(headers),
        '--output', str(body), '--write-out', fmt, route['requested_url'],
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    stderr.write_text(proc.stderr, encoding='utf-8')
    try:
        meta = json.loads(proc.stdout or '{}')
    except json.JSONDecodeError:
        meta = {'raw_write_out': proc.stdout}
    write_json(route_dir / 'curl.json', {'exit_code': proc.returncode, 'metadata': meta})
    body_bytes = body.read_bytes() if body.exists() else b''
    header_bytes = headers.read_bytes() if headers.exists() else b''
    status = int(meta.get('http_status') or 0)
    final_url = meta.get('final_url') or ''
    final_host = (urlparse(final_url).hostname or '').lower()
    if proc.returncode != 0:
        state = 'terminal_transport_failure'
    elif len(body_bytes) > route['maximum_body_bytes']:
        state = 'terminal_body_too_large'
    elif not host_allowed(final_host, route['allowed_final_host_suffix']):
        state = 'terminal_disallowed_final_host'
    elif not (200 <= status < 300):
        state = 'terminal_http_non_success'
    else:
        state = 'http_success_pending_source_adjudication'
    receipt = {
        'route_id': route['route_id'],
        'route_ordinal': route['route_ordinal'],
        'scope': route['scope'],
        'state': state,
        'request_attempts': 1,
        'curl_exit_code': proc.returncode,
        'http_status': status,
        'final_url': final_url,
        'final_host': final_host,
        'content_type': meta.get('content_type') or '',
        'body_bytes': len(body_bytes),
        'body_sha256': sha(body_bytes),
        'headers_bytes': len(header_bytes),
        'headers_sha256': sha(header_bytes),
        'source_admitted': False,
        'field_classification_effect': 'none',
        'class_closed': False,
        'result_spawned_requests': 0,
    }
    if route['scope'] == 'state':
        receipt.update({
            'unit_ordinal': route['unit_ordinal'],
            'unit_id': route['unit_id'],
            'postal_code': route['postal_code'],
            'state_name': route['state_name'],
        })
    write_json(route_dir / 'receipt.json', receipt)
    return receipt

def build_manifest(out: pathlib.Path) -> None:
    entries = []
    for path in sorted(out.rglob('*')):
        if path.is_file() and path.name != 'manifest.json':
            data = path.read_bytes()
            entries.append({'path': str(path.relative_to(out)), 'bytes': len(data), 'sha256': sha(data)})
    combined = sha(''.join(f"{entry['path']}\t{entry['bytes']}\t{entry['sha256']}\n" for entry in entries).encode())
    write_json(out / 'manifest.json', {
        'schema_version': 'ssc-rd04-wave03-state-source-artifact-manifest@1',
        'entries': entries,
        'combined_sha256': combined,
    })

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--validate-only', action='store_true')
    parser.add_argument('--output', type=pathlib.Path)
    args = parser.parse_args()
    protocol = read_protocol()
    validate(protocol)
    if args.validate_only:
        print('RD-04 state-source protocol validated: 54 fixed routes, one attempt each, zero automatic source or field authority')
        return
    if not args.output:
        parser.error('--output is required unless --validate-only')
    out = args.output
    out.mkdir(parents=True, exist_ok=True)
    write_json(out / 'protocol.json', protocol)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        receipts = list(executor.map(lambda route: execute_route(route, out), protocol['routes']))
    receipts.sort(key=lambda row: row['route_ordinal'])
    states: dict[str, int] = {}
    for receipt in receipts:
        states[receipt['state']] = states.get(receipt['state'], 0) + 1
    write_json(out / 'route-results.json', {
        'schema_version': 'ssc-rd04-wave03-state-source-route-results@1',
        'routes': receipts,
    })
    summary = {
        'schema_version': 'ssc-rd04-wave03-state-source-summary@1',
        'fixed_routes': 54,
        'terminal_routes': len(receipts),
        'state_counts': states,
        'admitted_sources': 0,
        'field_classifications': 0,
        'class_closed': False,
        'result_spawned_requests': 0,
        'outside_human_dependency': False,
    }
    write_json(out / 'summary.json', summary)
    write_json(out / 'execution-receipt.json', {
        'schema_version': 'ssc-rd04-wave03-state-source-execution-receipt@1',
        'protocol_path': str(PROTOCOL.relative_to(ROOT)),
        'fixed_routes': 54,
        'terminal_routes': len(receipts),
        'state_counts': states,
        'automatic_source_admission': False,
        'automatic_field_classification': False,
        'automatic_class_closure': False,
        'outside_human_dependency': False,
        'publication_effect': 'none',
        'adoption_effect': 'none',
        'graph_effect': 'none',
    })
    build_manifest(out)
    print(json.dumps(summary, indent=2))

if __name__ == '__main__':
    main()
