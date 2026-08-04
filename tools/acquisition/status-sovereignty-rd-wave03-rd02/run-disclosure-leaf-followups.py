#!/usr/bin/env python3
from __future__ import annotations

import argparse
import concurrent.futures
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
ADJUDICATION_PATH = BASE / 'disclosure-leaf-adjudication.json'
PROTOCOL_PATH = BASE / 'disclosure-leaf-followup-protocol.json'
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


def execute_route(route: dict, output: Path) -> dict:
    route_dir = output / 'routes' / route['route_id']
    route_dir.mkdir(parents=True, exist_ok=False)
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
        'curl',
        '--location',
        '--silent',
        '--show-error',
        '--compressed',
        '--connect-timeout',
        str(route.get('connect_timeout_seconds', 15)),
        '--max-time',
        str(route.get('total_timeout_seconds', 90)),
        '--retry',
        '0',
        '--max-filesize',
        str(route['maximum_response_body_bytes']),
        '--dump-header',
        str(headers),
        '--output',
        str(body),
        '--write-out',
        writeout,
        '--user-agent',
        'clifford-number-rd02-wave03-disclosure-leaf/1.0',
        route['requested_url'],
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
    final_url = str(metadata.get('final_url') or route['requested_url'])
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
        'schema_version': 'ssc-rd02-wave03-disclosure-leaf-route-receipt@1',
        'route_id': route['route_id'],
        'candidate_ordinal': route['candidate_ordinal'],
        'candidate_id': route['candidate_id'],
        'source_route_id': route['source_route_id'],
        'unit_ordinal': route['unit_ordinal'],
        'requested_url': route['requested_url'],
        'route_type': route['route_type'],
        'curl_exit': completed.returncode,
        'http_status': http_status,
        'final_url': final_url,
        'final_host': final_host,
        'final_host_allowed': final_host_allowed,
        'content_type': content_type,
        'body_bytes': len(body_bytes),
        'body_sha256': sha256_bytes(body_bytes),
        'headers_sha256': sha256_bytes(header_bytes),
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
    return receipt


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
        'schema_version': 'ssc-rd02-wave03-disclosure-leaf-manifest@1',
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

    adjudication = json.loads(ADJUDICATION_PATH.read_text(encoding='utf-8'))
    protocol = json.loads(PROTOCOL_PATH.read_text(encoding='utf-8'))
    matrix = json.loads(MATRIX_PATH.read_text(encoding='utf-8'))

    inputs = output / 'inputs'
    inputs.mkdir()
    shutil.copy2(ADJUDICATION_PATH, inputs / 'disclosure-leaf-adjudication.json')
    shutil.copy2(PROTOCOL_PATH, inputs / 'disclosure-leaf-followup-protocol.json')
    shutil.copy2(MATRIX_PATH, inputs / 'field-matrix-contract.json')

    write_json(output / 'plan.json', {
        'schema_version': 'ssc-rd02-wave03-disclosure-leaf-plan@1',
        'wave_id': 'SSC-RD-W03',
        'lane_id': 'RD-02',
        'class_id': 'RD-02-C05',
        'unit_ordinal': 15,
        'legal_vehicle': matrix['units'][14]['legal_vehicle'],
        'captured_candidate_denominator': adjudication['denominator']['captured_candidate_urls'],
        'terminal_without_request': adjudication['denominator']['terminal_without_request_urls'],
        'routes': protocol['routes'],
        'result_spawned_requests': 0,
    })

    with concurrent.futures.ThreadPoolExecutor(
        max_workers=protocol['execution_contract']['maximum_parallel_workers']
    ) as pool:
        receipts = list(pool.map(lambda route: execute_route(route, output), protocol['routes']))
    receipts.sort(key=lambda row: row['route_id'])

    write_json(output / 'route-results.json', {
        'schema_version': 'ssc-rd02-wave03-disclosure-leaf-route-results@1',
        'routes': receipts,
    })

    states: dict[str, int] = {}
    for receipt in receipts:
        states[receipt['terminal_route_state']] = states.get(receipt['terminal_route_state'], 0) + 1

    summary = {
        'schema_version': 'ssc-rd02-wave03-disclosure-leaf-summary@1',
        'wave_id': 'SSC-RD-W03',
        'lane_id': 'RD-02',
        'class_id': 'RD-02-C05',
        'issue': 1015,
        'terminal_capture_state': 'two_disclosure_leaf_pdfs_executed_text_adjudication_pending',
        'counts': {
            'captured_candidate_denominator': 457,
            'terminal_without_request': 455,
            'fixed_routes': 2,
            'route_attempts': 2,
            'terminal_routes': len(receipts),
            'route_state_counts': states,
            'pdf_bodies_captured': sum(bool(row['is_pdf_magic']) for row in receipts),
            'pdf_text_inspections_pending': sum(bool(row['pdf_text_inspection_pending']) for row in receipts),
            'admitted_sources': 0,
            'observations_admitted': 0,
            'fields_closed': 0,
            'lifecycle_events_observed': 0,
            'result_spawned_requests': 0,
            'external_contacts': 0,
            'external_reviews': 0,
        },
        'current_result': {
            'followup_execution_complete': len(receipts) == 2,
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
            'render and inspect both exact PDF bodies, then separately adjudicate '
            'vehicle identity, license, leverage eligibility, private commitments, '
            'manager lineage, and every forbidden lifecycle promotion'
        ),
    }
    write_json(output / 'summary.json', summary)

    write_json(output / 'execution-receipt.json', {
        'schema_version': 'ssc-rd02-wave03-disclosure-leaf-execution@1',
        'workflow_run': int(os.getenv('GITHUB_RUN_ID', '0')),
        'workflow_attempt': int(os.getenv('GITHUB_RUN_ATTEMPT', '0')),
        'head': os.getenv('GITHUB_SHA', ''),
        'adjudication_sha256': sha256_bytes(ADJUDICATION_PATH.read_bytes()),
        'protocol_sha256': sha256_bytes(PROTOCOL_PATH.read_bytes()),
        'fixed_routes': 2,
        'terminal_routes': len(receipts),
        'captured_pdf_bodies': sum(bool(row['is_pdf_magic']) for row in receipts),
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

    if len(receipts) != 2:
        raise RuntimeError('two-route denominator violation')
    if any(
        row['admitted_source']
        or row['observation_admitted']
        or row['field_closed']
        or row['lifecycle_event_observed']
        or row['result_spawned_requests'] != 0
        for row in receipts
    ):
        raise RuntimeError('capture authority violation')

    print(json.dumps(summary, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
