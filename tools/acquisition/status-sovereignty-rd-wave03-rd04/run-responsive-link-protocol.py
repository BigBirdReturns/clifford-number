#!/usr/bin/env python3
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import pathlib
import subprocess
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[3]
PROTOCOL = ROOT / 'data/intake/status-sovereignty-rd-wave03-rd04-state-source-adjudication/selected-followup-protocol.json'
CURRENT_CLASS_CATEGORIES = {
    'authority_rules',
    'policy_manual',
    'screening_verification',
    'work_requirement',
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_json(path: pathlib.Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def read_protocol() -> dict:
    return json.loads(PROTOCOL.read_text(encoding='utf-8'))


def host_allowed(host: str, suffix: str) -> bool:
    normalized_host = host.lower().rstrip('.')
    normalized_suffix = suffix.lower().rstrip('.')
    return normalized_host == normalized_suffix or normalized_host.endswith('.' + normalized_suffix)


def validate(protocol: dict) -> None:
    assert protocol['schema_version'] == 'ssc-rd04-wave03-responsive-link-followup-protocol@2'
    assert protocol['wave_id'] == 'SSC-RD-W03'
    assert protocol['lane_id'] == 'RD-04'
    assert protocol['class_id'] == 'RD-04-C02'
    assert protocol['issue'] == 1017
    assert protocol['execution_trigger_path'] == '.ssc-rd04-wave03-responsive-link-trigger/EXECUTE'
    assert protocol['selection_contract'] == {
        'frozen_before_followup_execution': True,
        'current_class_required_field_categories': [
            'authority_rules',
            'policy_manual',
            'screening_verification',
            'work_requirement',
        ],
        'appeal_hearing_candidates_preserved_but_deferred': 17,
        'deferred_candidates_are_silently_dropped': False,
        'selected_link_is_candidate_only_until_separate_response_adjudication': True,
    }
    assert protocol['denominator'] == {
        'candidate_rows': 329,
        'selected_followup_routes': 62,
        'states_represented': 30,
        'deferred_out_of_class_candidates': 17,
        'maximum_attempts_per_route': 1,
        'maximum_parallel_workers': 6,
        'result_spawned_requests': 0,
    }
    assert len(protocol['routes']) == 62
    assert protocol['boundaries']['appeal_or_hearing_route_is_current_rd04_c02_field'] is False
    assert protocol['boundaries']['landing_page_term_hit_is_field_classification'] is False
    assert protocol['boundaries']['selected_link_is_admitted_source'] is False
    assert protocol['boundaries']['http_success_is_source_admission'] is False
    assert protocol['boundaries']['federal_rule_is_state_implementation'] is False
    assert protocol['boundaries']['one_state_result_is_national_prevalence'] is False
    assert protocol['boundaries']['outside_human_dependency'] is False
    assert protocol['boundaries']['publication_effect'] == 'none'
    assert protocol['boundaries']['adoption_effect'] == 'none'
    assert protocol['boundaries']['graph_effect'] == 'none'

    candidate_ids: set[str] = set()
    route_ids: set[str] = set()
    state_ids: set[str] = set()
    for ordinal, route in enumerate(protocol['routes'], 1):
        assert route['route_ordinal'] == ordinal
        assert route['route_id'] == f'RD04-W03-LINK-{ordinal:03d}'
        assert route['scope'] == 'state'
        assert route['unit_id'] == f"US-STATE-{route['postal_code']}"
        assert route['selection_category'] in CURRENT_CLASS_CATEGORIES
        assert route['selection_category'] != 'appeal_hearing'
        assert len(route['candidate_id']) == 64
        assert int(route['candidate_id'], 16) >= 0
        assert len(route['parent_body_sha256']) == 64
        assert int(route['parent_body_sha256'], 16) >= 0
        requested = urlparse(route['requested_url'])
        requested_host = (requested.hostname or '').lower()
        assert requested.scheme in {'http', 'https'}
        assert requested_host == route['allowed_final_host_suffix']
        assert route['maximum_attempts'] == 1
        assert route['maximum_body_bytes'] in {16777216, 52428800, 104857600}
        assert route['result_spawned_requests'] == 0
        assert not route['automatic_source_admission']
        assert not route['automatic_field_classification']
        assert not route['automatic_class_closure']
        assert route['candidate_id'] not in candidate_ids
        assert route['route_id'] not in route_ids
        candidate_ids.add(route['candidate_id'])
        route_ids.add(route['route_id'])
        state_ids.add(route['unit_id'])
    assert len(candidate_ids) == 62
    assert len(route_ids) == 62
    assert len(state_ids) == 30


def execute_route(route: dict, output: pathlib.Path) -> dict:
    route_dir = output / 'routes' / route['route_id']
    route_dir.mkdir(parents=True, exist_ok=True)
    write_json(route_dir / 'request.json', route)
    headers = route_dir / 'headers.txt'
    body = route_dir / 'body.bin'
    stderr = route_dir / 'stderr.txt'
    write_out = json.dumps({
        'http_status': '%{http_code}',
        'final_url': '%{url_effective}',
        'content_type': '%{content_type}',
        'size_download': '%{size_download}',
        'num_redirects': '%{num_redirects}',
        'time_total': '%{time_total}',
    })
    command = [
        'curl', '--silent', '--show-error', '--location',
        '--max-time', '150', '--connect-timeout', '25',
        '--user-agent', 'clifford-number-evidence-capture/1.0',
        '--dump-header', str(headers), '--output', str(body),
        '--write-out', write_out, route['requested_url'],
    ]
    process = subprocess.run(command, capture_output=True, text=True)
    stderr.write_text(process.stderr, encoding='utf-8')
    try:
        metadata = json.loads(process.stdout or '{}')
    except json.JSONDecodeError:
        metadata = {'raw_write_out': process.stdout}
    write_json(route_dir / 'curl.json', {'exit_code': process.returncode, 'metadata': metadata})

    body_bytes = body.read_bytes() if body.exists() else b''
    header_bytes = headers.read_bytes() if headers.exists() else b''
    status = int(metadata.get('http_status') or 0)
    final_url = metadata.get('final_url') or ''
    final_host = (urlparse(final_url).hostname or '').lower()
    if process.returncode != 0:
        state = 'terminal_transport_failure'
    elif len(body_bytes) > route['maximum_body_bytes']:
        state = 'terminal_body_too_large'
    elif not host_allowed(final_host, route['allowed_final_host_suffix']):
        state = 'terminal_disallowed_final_host'
    elif not 200 <= status < 300:
        state = 'terminal_http_non_success'
    else:
        state = 'http_success_pending_source_adjudication'

    receipt = {
        'route_ordinal': route['route_ordinal'],
        'route_id': route['route_id'],
        'candidate_id': route['candidate_id'],
        'parent_route_id': route['parent_route_id'],
        'parent_body_sha256': route['parent_body_sha256'],
        'unit_ordinal': route['unit_ordinal'],
        'unit_id': route['unit_id'],
        'postal_code': route['postal_code'],
        'state_name': route['state_name'],
        'selection_category': route['selection_category'],
        'state': state,
        'request_attempts': 1,
        'curl_exit_code': process.returncode,
        'http_status': status,
        'final_url': final_url,
        'final_host': final_host,
        'content_type': metadata.get('content_type') or '',
        'body_bytes': len(body_bytes),
        'body_sha256': sha(body_bytes),
        'headers_bytes': len(header_bytes),
        'headers_sha256': sha(header_bytes),
        'source_admitted': False,
        'field_classification_effect': 'none',
        'class_closed': False,
        'result_spawned_requests': 0,
    }
    write_json(route_dir / 'receipt.json', receipt)
    return receipt


def build_manifest(output: pathlib.Path) -> None:
    entries: list[dict] = []
    for path in sorted(output.rglob('*')):
        if path.is_file() and path.name != 'manifest.json':
            data = path.read_bytes()
            entries.append({
                'path': str(path.relative_to(output)),
                'bytes': len(data),
                'sha256': sha(data),
            })
    combined = sha(''.join(
        f"{entry['path']}\t{entry['bytes']}\t{entry['sha256']}\n"
        for entry in entries
    ).encode())
    write_json(output / 'manifest.json', {
        'schema_version': 'ssc-rd04-wave03-responsive-link-artifact-manifest@2',
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
        print('RD-04 responsive-link protocol validated: 62 current-class routes across 30 states, 17 appeal/hearing candidates deferred, zero automatic authority')
        return
    if not args.output:
        parser.error('--output is required unless --validate-only')

    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    write_json(output / 'protocol.json', protocol)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        receipts = list(executor.map(lambda route: execute_route(route, output), protocol['routes']))
    receipts.sort(key=lambda row: row['route_ordinal'])

    state_counts: dict[str, int] = {}
    for receipt in receipts:
        state_counts[receipt['state']] = state_counts.get(receipt['state'], 0) + 1
    write_json(output / 'route-results.json', {
        'schema_version': 'ssc-rd04-wave03-responsive-link-route-results@2',
        'routes': receipts,
    })
    summary = {
        'schema_version': 'ssc-rd04-wave03-responsive-link-summary@2',
        'fixed_routes': 62,
        'terminal_routes': len(receipts),
        'states_represented': 30,
        'deferred_out_of_class_candidates': 17,
        'state_counts': state_counts,
        'admitted_sources': 0,
        'field_classifications': 0,
        'class_closed': False,
        'result_spawned_requests': 0,
        'outside_human_dependency': False,
    }
    write_json(output / 'summary.json', summary)
    write_json(output / 'execution-receipt.json', {
        'schema_version': 'ssc-rd04-wave03-responsive-link-execution-receipt@2',
        'protocol_path': str(PROTOCOL.relative_to(ROOT)),
        'fixed_routes': 62,
        'terminal_routes': len(receipts),
        'states_represented': 30,
        'deferred_out_of_class_candidates': 17,
        'state_counts': state_counts,
        'automatic_source_admission': False,
        'automatic_field_classification': False,
        'automatic_class_closure': False,
        'outside_human_dependency': False,
        'publication_effect': 'none',
        'adoption_effect': 'none',
        'graph_effect': 'none',
    })
    build_manifest(output)
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
