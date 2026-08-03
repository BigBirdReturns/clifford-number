#!/usr/bin/env python3
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

MAX_BODY_BYTES = 5 * 1024 * 1024
MAX_ATTEMPTS = 2
CONNECT_TIMEOUT_SECONDS = 15
TOTAL_TIMEOUT_SECONDS = 45
RETRYABLE_HTTP = {408, 425, 429}

LANES = {
    'rd02': {
        'class_id': 'RD-02-C04',
        'issue': 787,
        'matrix_path': 'data/intake/status-sovereignty-rd-wave02-rd02-license-leverage/field-matrix.json',
        'parent_path': 'data/intake/status-sovereignty-rd02-sbicct-state-transitions.json',
        'unit_key': 'rows',
        'unit_count': 18,
        'required_field_count': 10,
        'expected_source_count': 5,
    },
    'rd03': {
        'class_id': 'RD-03-C04',
        'issue': 788,
        'matrix_path': 'data/intake/status-sovereignty-rd-wave02-rd03-negotiated-terms/field-matrix.json',
        'parent_path': 'data/intake/status-sovereignty-rd03-osc-instrument-lifecycle.json',
        'unit_key': 'instruments',
        'unit_count': 5,
        'required_field_count': 14,
        'expected_source_count': 9,
    },
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def safe_name(value: str) -> str:
    return re.sub(r'[^A-Za-z0-9._-]+', '-', value).strip('-').lower()


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def read_json(path: Path):
    return json.loads(path.read_text())


def parse_write_out(text: str):
    lines = text.splitlines()
    while len(lines) < 5:
        lines.append('')
    try:
        status = int(lines[0])
    except ValueError:
        status = 0
    try:
        size_download = int(float(lines[3]))
    except ValueError:
        size_download = 0
    try:
        redirects = int(lines[4])
    except ValueError:
        redirects = 0
    return {
        'http_status': status,
        'final_url': lines[1],
        'content_type': lines[2],
        'size_download': size_download,
        'redirect_count': redirects,
    }


def capture_route(route, route_dir: Path):
    attempts = []
    for attempt_number in range(1, MAX_ATTEMPTS + 1):
        attempt_dir = route_dir / f'attempt-{attempt_number}'
        attempt_dir.mkdir(parents=True, exist_ok=True)
        body_path = attempt_dir / 'body.bin'
        headers_path = attempt_dir / 'headers.txt'
        stderr_path = attempt_dir / 'curl-stderr.txt'
        started_at = now_iso()
        command = [
            'curl', '--location', '--silent', '--show-error',
            '--connect-timeout', str(CONNECT_TIMEOUT_SECONDS),
            '--max-time', str(TOTAL_TIMEOUT_SECONDS),
            '--max-filesize', str(MAX_BODY_BYTES),
            '--dump-header', str(headers_path),
            '--output', str(body_path),
            '--user-agent', 'clifford-number-bounded-public-record-capture/1.0',
            '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n%{size_download}\n%{num_redirects}\n',
            route['url'],
        ]
        proc = subprocess.run(command, text=True, capture_output=True, check=False)
        stderr_path.write_text(proc.stderr)
        metadata = parse_write_out(proc.stdout)
        body_exists = body_path.exists()
        body_bytes = body_path.stat().st_size if body_exists else 0
        body_sha256 = sha256_file(body_path) if body_exists else None
        headers_bytes = headers_path.stat().st_size if headers_path.exists() else 0
        headers_sha256 = sha256_file(headers_path) if headers_path.exists() else None
        attempt = {
            'attempt': attempt_number,
            'started_at': started_at,
            'completed_at': now_iso(),
            'curl_exit': proc.returncode,
            **metadata,
            'body_bytes': body_bytes,
            'body_sha256': body_sha256,
            'headers_bytes': headers_bytes,
            'headers_sha256': headers_sha256,
            'stderr_sha256': sha256_file(stderr_path),
            'body_limit_bytes': MAX_BODY_BYTES,
            'connect_timeout_seconds': CONNECT_TIMEOUT_SECONDS,
            'total_timeout_seconds': TOTAL_TIMEOUT_SECONDS,
        }
        (attempt_dir / 'attempt.json').write_text(json.dumps(attempt, indent=2) + '\n')
        attempts.append(attempt)

        success = proc.returncode == 0 and 200 <= metadata['http_status'] <= 299
        retryable_status = metadata['http_status'] in RETRYABLE_HTTP or 500 <= metadata['http_status'] <= 599
        retryable = attempt_number < MAX_ATTEMPTS and (proc.returncode != 0 or retryable_status)
        if success or not retryable:
            break

    terminal = attempts[-1]
    if terminal['curl_exit'] == 0 and 200 <= terminal['http_status'] <= 299:
        terminal_state = 'transport_success'
    elif terminal['curl_exit'] != 0:
        terminal_state = 'bounded_transport_failure'
    else:
        terminal_state = 'bounded_http_non_success'
    receipt = {
        'source_id': route['source_id'],
        'publisher': route.get('publisher'),
        'title': route.get('title'),
        'source_class': route.get('source_class'),
        'requested_url': route['url'],
        'attempt_count': len(attempts),
        'terminal_state': terminal_state,
        'terminal_attempt': terminal,
        'supports': route.get('supports', []),
        'does_not_support': route.get('does_not_support', []),
        'semantic_claims_inherited_from_parent_record_only': True,
        'capture_does_not_expand_claim_scope': True,
    }
    (route_dir / 'source-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    return receipt


def build_manifest(out_root: Path):
    entries = []
    for path in sorted(p for p in out_root.rglob('*') if p.is_file() and p.name != 'manifest.json'):
        rel = path.relative_to(out_root).as_posix()
        entries.append({'path': rel, 'bytes': path.stat().st_size, 'sha256': sha256_file(path)})
    combined = sha256_bytes('\n'.join(f"{row['sha256']}  {row['path']}" for row in entries).encode())
    return entries, combined


def main():
    if len(sys.argv) != 4 or sys.argv[1] not in LANES:
        raise SystemExit('usage: fixed-capture.py <rd02|rd03> <repo-root> <output-root>')
    lane = sys.argv[1]
    repo_root = Path(sys.argv[2]).resolve()
    out_root = Path(sys.argv[3]).resolve()
    cfg = LANES[lane]
    matrix_path = repo_root / cfg['matrix_path']
    parent_path = repo_root / cfg['parent_path']
    matrix_bytes = matrix_path.read_bytes()
    parent_bytes = parent_path.read_bytes()
    matrix = json.loads(matrix_bytes)
    parent = json.loads(parent_bytes)

    if matrix['class_id'] != cfg['class_id'] or matrix['issue'] != cfg['issue']:
        raise SystemExit('matrix class custody changed')
    if matrix['parent']['path'] != cfg['parent_path']:
        raise SystemExit('matrix parent path changed')
    parent_sha256 = sha256_bytes(parent_bytes)
    if matrix['parent']['sha256'] != parent_sha256:
        raise SystemExit(f'parent byte digest mismatch: {parent_sha256}')
    units = matrix[cfg['unit_key']]
    if len(units) != cfg['unit_count']:
        raise SystemExit('unit denominator changed')
    if len(matrix['required_fields']) != cfg['required_field_count']:
        raise SystemExit('required-field denominator changed')
    if len(parent['sources']) != cfg['expected_source_count']:
        raise SystemExit('source denominator changed')
    if len({row['source_id'] for row in parent['sources']}) != cfg['expected_source_count']:
        raise SystemExit('duplicate source id')

    if out_root.exists():
        subprocess.run(['rm', '-rf', str(out_root)], check=True)
    out_root.mkdir(parents=True)
    (out_root / 'inputs').mkdir()
    (out_root / 'inputs' / 'field-matrix.json').write_bytes(matrix_bytes)
    (out_root / 'inputs' / 'parent-record.json').write_bytes(parent_bytes)

    protocol = {
        'schema_version': 'ssc-rd-wave02-bounded-fixed-source-protocol@1',
        'lane': lane.upper(),
        'class_id': cfg['class_id'],
        'issue': cfg['issue'],
        'captured_at': now_iso(),
        'unit_denominator': cfg['unit_count'],
        'required_fields_per_unit': cfg['required_field_count'],
        'required_field_denominator': cfg['unit_count'] * cfg['required_field_count'],
        'source_route_denominator': cfg['expected_source_count'],
        'maximum_attempts_per_route': MAX_ATTEMPTS,
        'maximum_response_body_bytes': MAX_BODY_BYTES,
        'connect_timeout_seconds': CONNECT_TIMEOUT_SECONDS,
        'total_timeout_seconds': TOTAL_TIMEOUT_SECONDS,
        'redirects': 'followed_and_recorded',
        'result_spawned_requests': 0,
        'linked_object_crawling': False,
        'denominator_widening_after_results': False,
        'external_contacts': 0,
        'external_reviews': 0,
        'outside_human_dependency': False,
    }
    (out_root / 'protocol.json').write_text(json.dumps(protocol, indent=2) + '\n')

    receipts = []
    routes_root = out_root / 'routes'
    routes_root.mkdir()
    for index, route in enumerate(parent['sources'], 1):
        route_dir = routes_root / f"{index:02d}-{safe_name(route['source_id'])}"
        route_dir.mkdir()
        receipts.append(capture_route(route, route_dir))

    counts = {
        'source_routes': len(receipts),
        'request_attempts': sum(row['attempt_count'] for row in receipts),
        'transport_successes': sum(row['terminal_state'] == 'transport_success' for row in receipts),
        'bounded_http_non_successes': sum(row['terminal_state'] == 'bounded_http_non_success' for row in receipts),
        'bounded_transport_failures': sum(row['terminal_state'] == 'bounded_transport_failure' for row in receipts),
    }
    index = {
        'schema_version': 'ssc-rd-wave02-bounded-fixed-source-capture-index@1',
        'lane': lane.upper(),
        'class_id': cfg['class_id'],
        'issue': cfg['issue'],
        'matrix_path': cfg['matrix_path'],
        'matrix_sha256': sha256_bytes(matrix_bytes),
        'parent_path': cfg['parent_path'],
        'parent_sha256': parent_sha256,
        'counts': counts,
        'routes': receipts,
        'authority': {
            'source_capture_only': True,
            'class_closed': False,
            'reviewed_disposition_changed': False,
            'external_contacts': 0,
            'external_reviews': 0,
            'outside_human_dependency': False,
            'publication_effect': 'none',
            'adoption_effect': 'none',
            'graph_effect': 'none',
        },
    }
    (out_root / 'capture-index.json').write_text(json.dumps(index, indent=2) + '\n')
    entries, combined = build_manifest(out_root)
    manifest = {
        'schema_version': 'ssc-rd-wave02-bounded-fixed-source-capture-manifest@1',
        'lane': lane.upper(),
        'class_id': cfg['class_id'],
        'issue': cfg['issue'],
        'entry_count': len(entries),
        'combined_sha256': combined,
        'entries': entries,
        'counts': counts,
        'outside_human_dependency': False,
        'external_contacts': 0,
        'external_reviews': 0,
        'publication_effect': 'none',
        'adoption_effect': 'none',
        'graph_effect': 'none',
    }
    (out_root / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main()
