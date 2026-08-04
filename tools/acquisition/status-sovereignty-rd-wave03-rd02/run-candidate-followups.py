#!/usr/bin/env python3
import argparse
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parents[4]
ADJUDICATION_INDEX_PATH = ROOT / 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/candidate-adjudication/index.json'
PROTOCOL_PATH = ROOT / 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/candidate-followup-protocol.json'
MATRIX_PATH = ROOT / 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/field-matrix-contract.json'
EXPECTED_ADJUDICATION_INDEX_SHA256 = 'd6f5ff837956d176a41834b3a2b00a722eb92743ae4c761f44a9d2f2ece5eaf3'
EXPECTED_ADJUDICATION_SHARD_COMBINED_SHA256 = 'd94d7a24923b5894b6a91bd9773ba595ffe71c31b086f18a37fcaf5654e10942'
EXPECTED_ROUTE_LEDGER_SHA256 = '727f226d913a5f53677f6b32dbe47e76d9affe06fe6394e57d655f719350c01c'
LIFECYCLE_TERMS = ('portfolio', 'invest', 'companies', 'company', 'fund', 'sbic', 'exit', 'return', 'repay', 'leverage', 'write-off', 'default')


def check(condition, message):
    if not condition:
        raise RuntimeError(message)


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def sha256_bytes(value):
    return hashlib.sha256(value).hexdigest()


def sha256_file(path):
    return sha256_bytes(path.read_bytes())


def load_adjudication():
    index = read_json(ADJUDICATION_INDEX_PATH)
    check(sha256_file(ADJUDICATION_INDEX_PATH) == EXPECTED_ADJUDICATION_INDEX_SHA256, 'candidate adjudication index digest drift')
    check(len(index['shards']) == 7, 'candidate adjudication shard denominator drift')
    rows = []
    bindings = []
    for position, binding in enumerate(index['shards'], 1):
        check(binding['shard_ordinal'] == position, 'candidate adjudication shard order drift')
        shard_path = ROOT / binding['path']
        check(sha256_file(shard_path) == binding['sha256'], f'candidate adjudication shard {position} digest drift')
        shard = read_json(shard_path)
        check(shard['shard_ordinal'] == position and len(shard['candidate_urls']) == binding['candidate_urls'], f'candidate adjudication shard {position} identity drift')
        rows.extend(shard['candidate_urls'])
        bindings.append(f"{binding['path']}\t{binding['sha256']}")
    check(sha256_bytes('\n'.join(bindings).encode()) == EXPECTED_ADJUDICATION_SHARD_COMBINED_SHA256, 'candidate adjudication shard-set digest drift')
    return {**index, 'candidate_urls': rows}


def normalize(value):
    return re.sub(r'[^a-z0-9]+', ' ', value.lower()).strip()


def git(*args):
    result = subprocess.run(['git', *args], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    check(result.returncode == 0, f"git {' '.join(args)}: {result.stderr.strip()}")
    return result.stdout.strip()


def route_ledger(protocol):
    header = 'route_id\tcandidate_ordinal\tunit_ordinal\trequested_url\tallowed_final_host_suffix\n'
    return header + ''.join(
        f"{row['route_id']}\t{row['candidate_ordinal']}\t{row['unit_ordinal']}\t{row['requested_url']}\t{row['allowed_final_host_suffix']}\n"
        for row in protocol['routes']
    )


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.text = []
        self.links = []
        self.current_href = None
        self.current_text = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == 'a':
            values = dict(attrs)
            self.current_href = values.get('href')
            self.current_text = []

    def handle_data(self, data):
        self.text.append(data)
        if self.current_href is not None:
            self.current_text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == 'a' and self.current_href is not None:
            self.links.append((self.current_href, ' '.join(self.current_text)))
            self.current_href = None
            self.current_text = []


def allowed_host(host, suffix):
    host = (host or '').lower().rstrip('.')
    suffix = suffix.lower().rstrip('.')
    return host == suffix or host.endswith('.' + suffix)


def capture_route(output, protocol, matrix_by_unit, route):
    route_root = output / 'routes' / route['route_id']
    attempt = route_root / 'attempt-1'
    attempt.mkdir(parents=True)
    body = attempt / 'body.bin'
    headers = attempt / 'headers.txt'
    stderr = attempt / 'curl-stderr.txt'
    request_url = route['requested_url']
    (attempt / 'request-url.txt').write_text(request_url + '\n')
    command = [
        'curl', '--location', '--silent', '--show-error', '--connect-timeout', '15', '--max-time', '60',
        '--max-filesize', '10485760', '--retry', '0', '--user-agent', 'clifford-number-evidence-capture/1.0',
        '--dump-header', str(headers), '--output', str(body),
        '--write-out', '%{http_code}\t%{url_effective}\t%{content_type}\t%{size_download}\t%{num_redirects}', request_url
    ]
    result = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stderr.write_text(result.stderr)
    (attempt / 'curl-exit.txt').write_text(str(result.returncode) + '\n')
    (attempt / 'curl-meta.txt').write_text(result.stdout + '\n')
    parts = result.stdout.split('\t')
    status = int(parts[0]) if parts and parts[0].isdigit() else 0
    final_url = parts[1] if len(parts) > 1 else None
    content_type = parts[2] if len(parts) > 2 else None
    final_host = urlparse(final_url or request_url).hostname or ''
    host_allowed = allowed_host(final_host, route['allowed_final_host_suffix'])
    parsed = False
    text = ''
    links = []
    parse_error = None
    if result.returncode == 0 and status == 200 and body.exists() and 'html' in (content_type or '').lower():
        try:
            parser = PageParser()
            parser.feed(body.read_text(encoding='utf-8', errors='replace'))
            text = ' '.join(' '.join(parser.text).split())
            links = parser.links
            parsed = True
        except Exception as error:  # terminally typed below
            parse_error = f'{type(error).__name__}: {error}'
    vehicle = matrix_by_unit[route['unit_ordinal']]
    normalized_text = normalize(text)
    vehicle_present = normalize(vehicle) in normalized_text if text else False
    manager_phrase = 'moonshots capital' if route['unit_ordinal'] == 1 else 'stifel'
    manager_present = manager_phrase in normalized_text if text else False
    term_hits = sorted({term for term in LIFECYCLE_TERMS if term in normalized_text})
    same_host_candidates = []
    seen = set()
    for href, anchor in links:
        absolute = urljoin(final_url or request_url, href)
        parsed_url = urlparse(absolute)
        if parsed_url.scheme not in ('http', 'https') or not allowed_host(parsed_url.hostname, route['allowed_final_host_suffix']):
            continue
        signal = normalize(absolute + ' ' + anchor)
        hits = sorted({term for term in LIFECYCLE_TERMS if term in signal})
        if not hits or absolute in seen:
            continue
        seen.add(absolute)
        same_host_candidates.append({
            'source_route_id': route['route_id'],
            'unit_ordinal': route['unit_ordinal'],
            'url': absolute,
            'domain': (parsed_url.hostname or '').lower(),
            'anchor_text': ' '.join(anchor.split())[:1000],
            'signal_terms': hits,
            'candidate_only': True,
            'admitted_source': False,
            'result_spawned_requests': 0,
        })
    if result.returncode != 0:
        state = 'terminal_transport_failure'
    elif status != 200:
        state = 'terminal_http_non_success'
    elif not host_allowed:
        state = 'terminal_disallowed_final_host'
    elif parsed:
        state = 'http_success_html_parsed'
    elif parse_error:
        state = 'http_success_html_parse_failed'
    else:
        state = 'http_success_non_html'
    receipt = {
        'schema_version': 'ssc-rd02-wave03-candidate-followup-route-receipt@1',
        'route_id': route['route_id'],
        'candidate_ordinal': route['candidate_ordinal'],
        'candidate_id': route['candidate_id'],
        'unit_ordinal': route['unit_ordinal'],
        'requested_url': request_url,
        'curl_exit': result.returncode,
        'http_status': status,
        'final_url': final_url,
        'final_host': final_host,
        'final_host_allowed': host_allowed,
        'content_type': content_type,
        'body_bytes': body.stat().st_size if body.exists() else 0,
        'body_sha256': sha256_file(body) if body.exists() else None,
        'headers_sha256': sha256_file(headers) if headers.exists() else None,
        'parse_error': parse_error,
        'exact_legal_vehicle_text_present': vehicle_present,
        'manager_name_text_present': manager_present,
        'lifecycle_term_hits': term_hits,
        'same_host_link_candidates': len(same_host_candidates),
        'terminal_route_state': state,
        'admitted_source': False,
        'lifecycle_event_observed': False,
        'result_spawned_requests': 0,
    }
    write_json(route_root / 'receipt.json', receipt)
    return receipt, same_host_candidates


def build_manifest(output):
    entries = []
    for file_path in sorted(path for path in output.rglob('*') if path.is_file() and path.name != 'manifest.json'):
        entries.append({'path': str(file_path.relative_to(output)), 'bytes': file_path.stat().st_size, 'sha256': sha256_file(file_path)})
    combined = '\n'.join(f"{row['path']}\t{row['bytes']}\t{row['sha256']}" for row in entries)
    return {'schema_version': 'ssc-rd02-wave03-candidate-followup-manifest@1', 'entry_count': len(entries), 'combined_sha256': sha256_bytes(combined.encode()), 'entries': entries}


def execute(output):
    adjudication = load_adjudication()
    protocol = read_json(PROTOCOL_PATH)
    matrix = read_json(MATRIX_PATH)
    check(len(protocol['routes']) == 10, 'followup route denominator drift')
    ledger = route_ledger(protocol)
    check(len(ledger.encode()) == 789 and sha256_bytes(ledger.encode()) == EXPECTED_ROUTE_LEDGER_SHA256, 'followup route-ledger drift')
    check(git('merge-base', '--is-ancestor', '44d4544b23dc24db24a4a7c61939396ada0b5fd5', 'HEAD') == '', 'parent protocol merge not ancestor')
    selected = [row for row in adjudication['candidate_urls'] if row['followup_route_id'] is not None]
    check([row['url'] for row in selected] == [row['requested_url'] for row in protocol['routes']], 'followup candidate binding drift')
    matrix_by_unit = {row['unit_ordinal']: row.get('legal_vehicle') or row.get('withheld_state_label') for row in matrix['units']}
    output.mkdir(parents=True, exist_ok=False)
    inputs = output / 'inputs'
    inputs.mkdir()
    for source in (ADJUDICATION_INDEX_PATH, PROTOCOL_PATH, MATRIX_PATH):
        (inputs / source.name).write_bytes(source.read_bytes())
    shard_inputs = inputs / 'candidate-adjudication'
    shard_inputs.mkdir()
    for binding in adjudication['shards']:
        source = ROOT / binding['path']
        (shard_inputs / source.name).write_bytes(source.read_bytes())
    (output / 'routes.tsv').write_text(ledger)
    write_json(output / 'plan.json', {
        'schema_version': 'ssc-rd02-wave03-candidate-followup-plan@1',
        'unique_candidate_urls': 210,
        'terminally_adjudicated_candidate_urls': 210,
        'fixed_followup_routes': 10,
        'withheld_row_routes': 0,
        'maximum_attempts_per_route': 1,
        'maximum_response_body_bytes': 10485760,
        'maximum_parallel_workers': 4,
        'result_spawned_requests': 0,
        'candidate_urls_admitted': 0,
        'class_state': 'still_open',
        'class_closed': False,
    })
    results = []
    link_rows = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(capture_route, output, protocol, matrix_by_unit, route): route for route in protocol['routes']}
        for future in concurrent.futures.as_completed(futures):
            receipt, links = future.result()
            results.append(receipt)
            link_rows.extend(links)
    results.sort(key=lambda row: row['route_id'])
    state_counts = {}
    for row in results:
        state_counts[row['terminal_route_state']] = state_counts.get(row['terminal_route_state'], 0) + 1
    unique_links = {}
    for row in link_rows:
        current = unique_links.setdefault(row['url'], {**row, 'source_route_ids': set(), 'unit_ordinals': set(), 'signal_terms': set()})
        current['source_route_ids'].add(row['source_route_id'])
        current['unit_ordinals'].add(row['unit_ordinal'])
        current['signal_terms'].update(row['signal_terms'])
    link_candidates = []
    for ordinal, url in enumerate(sorted(unique_links), 1):
        row = unique_links[url]
        link_candidates.append({
            'candidate_ordinal': ordinal,
            'url': url,
            'domain': row['domain'],
            'source_route_ids': sorted(row['source_route_ids']),
            'unit_ordinals': sorted(row['unit_ordinals']),
            'anchor_text': row['anchor_text'],
            'signal_terms': sorted(row['signal_terms']),
            'candidate_only': True,
            'admitted_source': False,
            'result_spawned_requests': 0,
        })
    write_json(output / 'route-results.json', {'schema_version': 'ssc-rd02-wave03-candidate-followup-results@1', 'routes': results, 'counts': {'fixed_routes': 10, 'terminal_routes': len(results), 'route_state_counts': dict(sorted(state_counts.items()))}})
    write_json(output / 'same-host-link-candidates.json', {
        'schema_version': 'ssc-rd02-wave03-same-host-link-candidates@1',
        'candidate_urls': link_candidates,
        'counts': {'candidate_urls': len(link_candidates), 'admitted_sources': 0, 'result_spawned_requests': 0},
        'boundaries': {'link_candidate_is_admitted_source': False, 'link_candidate_is_lifecycle_event': False, 'graph_effect': 'none'}
    })
    summary = {
        'schema_version': 'ssc-rd02-wave03-candidate-followup-summary@1',
        'wave_id': 'SSC-RD-W03', 'lane_id': 'RD-02', 'class_id': 'RD-02-C05', 'issue': 1015,
        'terminal_capture_state': 'fixed_candidate_followups_executed_link_adjudication_pending',
        'counts': {
            'unique_search_candidate_urls': 210,
            'terminally_adjudicated_search_candidate_urls': 210,
            'fixed_followup_routes': 10,
            'route_attempts': len(results),
            'terminal_routes': len(results),
            'route_state_counts': dict(sorted(state_counts.items())),
            'exact_legal_vehicle_text_matches': sum(row['exact_legal_vehicle_text_present'] for row in results),
            'manager_name_text_matches': sum(row['manager_name_text_present'] for row in results),
            'same_host_link_candidates': len(link_candidates),
            'admitted_sources': 0,
            'lifecycle_events_observed': 0,
            'withheld_row_routes': 0,
            'result_spawned_requests': 0,
            'external_contacts': 0,
            'external_reviews': 0,
        },
        'current_result': {
            'candidate_followup_execution_complete': True,
            'same_host_link_adjudication_complete': False,
            'field_matrix_terminal': False,
            'class_state': 'still_open',
            'class_closed': False,
            'outside_human_dependency': False,
            'project_blocking': False,
            'capital_conversion_finding': False,
            'favoritism_finding': False,
            'extraction_finding': False,
            'coordination_finding': False,
            'common_purpose_finding': False,
            'complete_compact_finding': False,
            'publication_effect': 'none', 'adoption_effect': 'none', 'graph_effect': 'none'
        },
        'next_bounded_operation': 'adjudicate the frozen same-host lifecycle-link census and freeze any exact relevant page routes'
    }
    write_json(output / 'summary.json', summary)
    write_json(output / 'execution-receipt.json', {
        'schema_version': 'ssc-rd02-wave03-candidate-followup-execution@1',
        'workflow_run': int(os.environ.get('GITHUB_RUN_ID', '0')),
        'workflow_attempt': int(os.environ.get('GITHUB_RUN_ATTEMPT', '0')),
        'head': git('rev-parse', 'HEAD'),
        'adjudication_index_sha256': sha256_file(ADJUDICATION_INDEX_PATH),
        'adjudication_shard_combined_sha256': EXPECTED_ADJUDICATION_SHARD_COMBINED_SHA256,
        'protocol_sha256': sha256_file(PROTOCOL_PATH),
        'route_ledger_sha256': EXPECTED_ROUTE_LEDGER_SHA256,
        'fixed_routes': 10,
        'terminal_routes': len(results),
        'same_host_link_candidates': len(link_candidates),
        'admitted_sources': 0,
        'withheld_row_routes': 0,
        'result_spawned_requests': 0,
        'class_closed': False,
        'publication_effect': 'none', 'adoption_effect': 'none', 'graph_effect': 'none'
    })
    manifest = build_manifest(output)
    write_json(output / 'manifest.json', manifest)
    result = {
        'fixed_routes': 10,
        'terminal_routes': len(results),
        'route_state_counts': dict(sorted(state_counts.items())),
        'exact_legal_vehicle_text_matches': summary['counts']['exact_legal_vehicle_text_matches'],
        'manager_name_text_matches': summary['counts']['manager_name_text_matches'],
        'same_host_link_candidates': len(link_candidates),
        'admitted_sources': 0,
        'class_state': 'still_open',
        'class_closed': False,
        'manifest_entries': manifest['entry_count'],
        'manifest_combined_sha256': manifest['combined_sha256'],
    }
    print(json.dumps(result, indent=2))
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    check(not output.exists(), f'output already exists: {output}')
    execute(output)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'run-candidate-followups: {error}', file=sys.stderr)
        raise SystemExit(1)
