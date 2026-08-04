#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
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
EXECUTION_PATH = BASE / 'disclosure-leaf-execution-receipt.json'
PROTOCOL_PATH = BASE / 'manager-lineage-replay-protocol.json'
SOURCE_PATH = ROOT / 'data/research/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/sources/stifel-am-forward-2024-final-approval.json'
MATRIX_PATH = BASE / 'field-matrix-contract.json'


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def allowed_host(host: str, suffix: str) -> bool:
    normalized_host = host.lower().rstrip('.')
    normalized_suffix = suffix.lower().rstrip('.')
    return normalized_host == normalized_suffix or normalized_host.endswith('.' + normalized_suffix)


def build_manifest(output: Path) -> dict:
    entries: list[dict] = []
    for file_path in sorted(path for path in output.rglob('*') if path.is_file() and path.name != 'manifest.json'):
        data = file_path.read_bytes()
        entries.append({
            'path': file_path.relative_to(output).as_posix(),
            'bytes': len(data),
            'sha256': sha256_bytes(data),
        })
    combined = ''.join(f"{row['sha256']}  {row['path']}\n" for row in entries).encode('utf-8')
    manifest = {
        'schema_version': 'ssc-rd02-wave03-manager-lineage-replay-manifest@1',
        'entry_count': len(entries),
        'combined_sha256': sha256_bytes(combined),
        'entries': entries,
    }
    write_json(output / 'manifest.json', manifest)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    output = Path(args.output).resolve()
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    execution = json.loads(EXECUTION_PATH.read_text(encoding='utf-8'))
    protocol = json.loads(PROTOCOL_PATH.read_text(encoding='utf-8'))
    source = json.loads(SOURCE_PATH.read_text(encoding='utf-8'))
    matrix = json.loads(MATRIX_PATH.read_text(encoding='utf-8'))

    if protocol['denominator']['fixed_replay_routes'] != 1 or len(protocol['routes']) != 1:
        raise RuntimeError('one-route replay denominator violated')
    if protocol['denominator']['successful_routes_replayed'] != 0:
        raise RuntimeError('successful route replay prohibited')
    if execution['route_outcomes'][1]['http_request_sent'] is not False:
        raise RuntimeError('replay requires original route to have failed before HTTP transport')
    if source['source_disposition']['admitted_source'] is not True:
        raise RuntimeError('successful 2024 source receipt missing')

    route = protocol['routes'][0]
    raw_candidate_url = route['candidate_url']
    transport_url = route['transport_url']
    if urllib.parse.unquote(transport_url) != raw_candidate_url:
        raise RuntimeError('transport URL does not decode to raw candidate identity')
    if ' ' in transport_url or '%20' not in transport_url:
        raise RuntimeError('transport URL encoding contract violated')

    inputs = output / 'inputs'
    inputs.mkdir()
    shutil.copy2(EXECUTION_PATH, inputs / 'disclosure-leaf-execution-receipt.json')
    shutil.copy2(PROTOCOL_PATH, inputs / 'manager-lineage-replay-protocol.json')
    shutil.copy2(SOURCE_PATH, inputs / 'stifel-am-forward-2024-final-approval.json')
    shutil.copy2(MATRIX_PATH, inputs / 'field-matrix-contract.json')

    write_json(output / 'plan.json', {
        'schema_version': 'ssc-rd02-wave03-manager-lineage-replay-plan@1',
        'wave_id': 'SSC-RD-W03',
        'lane_id': 'RD-02',
        'class_id': 'RD-02-C05',
        'unit_ordinal': 15,
        'legal_vehicle': matrix['units'][14]['legal_vehicle'],
        'original_failed_route_id': route['replays_route_id'],
        'replay_route': route,
        'successful_routes_replayed': 0,
        'result_spawned_requests': 0,
    })

    route_dir = output / 'routes' / route['route_id']
    route_dir.mkdir(parents=True)
    write_json(route_dir / 'request.json', route)
    headers = route_dir / 'headers.txt'
    body = route_dir / 'body.pdf'
    stderr = route_dir / 'stderr.txt'
    curl_json = route_dir / 'curl.json'
    writeout = (
        '{"http_status":%{http_code},"final_url":"%{url_effective}",'
        '"content_type":"%{content_type}","size_download":%{size_download},'
        '"num_redirects":%{num_redirects},"time_total":%{time_total}}'
    )
    command = [
        'curl', '--location', '--silent', '--show-error', '--compressed',
        '--connect-timeout', str(protocol['execution_contract']['connect_timeout_seconds']),
        '--max-time', str(protocol['execution_contract']['total_timeout_seconds']),
        '--retry', '0',
        '--max-filesize', str(route['maximum_response_body_bytes']),
        '--dump-header', str(headers),
        '--output', str(body),
        '--write-out', writeout,
        '--user-agent', 'clifford-number-rd02-wave03-manager-lineage-replay/1.0',
        transport_url,
    ]
    completed = subprocess.run(command, text=True, capture_output=True, check=False)
    stderr.write_text(completed.stderr, encoding='utf-8')
    metadata: dict = {}
    if completed.stdout.strip():
        try:
            metadata = json.loads(completed.stdout)
        except json.JSONDecodeError:
            metadata = {'parse_error': completed.stdout}
    write_json(curl_json, {'exit_code': completed.returncode, 'metadata': metadata})

    body_bytes = body.read_bytes() if body.exists() else b''
    header_bytes = headers.read_bytes() if headers.exists() else b''
    final_url = str(metadata.get('final_url') or transport_url)
    final_host = (urllib.parse.urlparse(final_url).hostname or '').lower()
    final_host_allowed = allowed_host(final_host, route['allowed_final_host_suffix'])
    http_status = int(metadata.get('http_status') or 0)
    content_type = str(metadata.get('content_type') or '')
    is_pdf_magic = body_bytes.startswith(b'%PDF-')

    if completed.returncode != 0:
        terminal_state = 'terminal_transport_failure'
    elif http_status != 200:
        terminal_state = 'terminal_http_non_success'
    elif not final_host_allowed:
        terminal_state = 'terminal_disallowed_final_host'
    elif not is_pdf_magic:
        terminal_state = 'terminal_non_pdf_body'
    else:
        terminal_state = 'http_success_pdf_captured_text_inspection_pending'

    receipt = {
        'schema_version': 'ssc-rd02-wave03-manager-lineage-replay-route-receipt@1',
        'route_id': route['route_id'],
        'replays_route_id': route['replays_route_id'],
        'candidate_ordinal': route['candidate_ordinal'],
        'candidate_id': route['candidate_id'],
        'unit_ordinal': route['unit_ordinal'],
        'candidate_url': raw_candidate_url,
        'transport_url': transport_url,
        'curl_exit': completed.returncode,
        'http_status': http_status,
        'final_url': final_url,
        'final_host': final_host,
        'final_host_allowed': final_host_allowed,
        'content_type': content_type,
        'body_bytes': len(body_bytes),
        'body_sha256': sha256_bytes(body_bytes),
        'headers_sha256': sha256_bytes(header_bytes),
        'stderr_sha256': sha256_bytes(completed.stderr.encode('utf-8')),
        'is_pdf_magic': is_pdf_magic,
        'pdf_text_inspection_pending': bool(is_pdf_magic),
        'terminal_route_state': terminal_state,
        'admitted_source': False,
        'observation_admitted': False,
        'field_closed': False,
        'lifecycle_event_observed': False,
        'result_spawned_requests': 0,
    }
    write_json(route_dir / 'receipt.json', receipt)
    write_json(output / 'route-results.json', {
        'schema_version': 'ssc-rd02-wave03-manager-lineage-replay-route-results@1',
        'routes': [receipt],
    })

    summary = {
        'schema_version': 'ssc-rd02-wave03-manager-lineage-replay-summary@1',
        'wave_id': 'SSC-RD-W03',
        'lane_id': 'RD-02',
        'class_id': 'RD-02-C05',
        'issue': 1015,
        'terminal_capture_state': 'manager_lineage_failed_route_replay_executed_text_adjudication_pending',
        'counts': {
            'original_successful_routes_replayed': 0,
            'fixed_replay_routes': 1,
            'replay_attempts': 1,
            'terminal_replay_routes': 1,
            'pdf_bodies_captured': int(is_pdf_magic),
            'pdf_text_inspections_pending': int(is_pdf_magic),
            'admitted_sources': 0,
            'observations_admitted': 0,
            'fields_closed': 0,
            'lifecycle_events_observed': 0,
            'result_spawned_requests': 0,
            'external_contacts': 0,
            'external_reviews': 0,
        },
        'current_result': {
            'replay_execution_complete': True,
            'pdf_text_adjudication_complete': False,
            'field_matrix_terminal': False,
            'class_state': 'still_open',
            'class_closed': False,
            'outside_human_dependency': False,
            'project_blocking': False,
            'publication_effect': 'none',
            'adoption_effect': 'none',
            'graph_effect': 'none',
        },
        'next_bounded_operation': (
            'render and inspect the exact replay PDF, then separately adjudicate '
            'North Atlantic manager lineage, Stifel affiliation, antecedent SBIC '
            'commitment, and every forbidden lifecycle promotion'
        ),
    }
    write_json(output / 'summary.json', summary)
    write_json(output / 'execution-receipt.json', {
        'schema_version': 'ssc-rd02-wave03-manager-lineage-replay-execution@1',
        'workflow_run': int(os.getenv('GITHUB_RUN_ID', '0')),
        'workflow_attempt': int(os.getenv('GITHUB_RUN_ATTEMPT', '0')),
        'head': os.getenv('GITHUB_SHA', ''),
        'protocol_sha256': sha256_bytes(PROTOCOL_PATH.read_bytes()),
        'replay_attempts': 1,
        'terminal_replay_routes': 1,
        'captured_pdf_bodies': int(is_pdf_magic),
        'successful_routes_replayed': 0,
        'admitted_sources': 0,
        'observations_admitted': 0,
        'fields_closed': 0,
        'result_spawned_requests': 0,
        'class_closed': False,
        'publication_effect': 'none',
        'adoption_effect': 'none',
        'graph_effect': 'none',
    })
    build_manifest(output)

    if receipt['result_spawned_requests'] != 0 or receipt['admitted_source'] or receipt['observation_admitted'] or receipt['field_closed'] or receipt['lifecycle_event_observed']:
        raise RuntimeError('replay capture authority violation')

    print(json.dumps(summary, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
