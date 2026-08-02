#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

STATES = [
    ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),
    ('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('FL','Florida'),('GA','Georgia'),
    ('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),
    ('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),
    ('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),
    ('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),
    ('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),
    ('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),
    ('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),
    ('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming'),
]
TEMPLATES = {
    'Q1': '{state} SNAP manual policy version history official',
    'Q2': '{state} SNAP fair hearing continued benefits official',
    'Q3': '{state} SNAP sanction restoration counts official',
    'Q4': '{state} SNAP employment earnings food security evaluation official',
}
UA = 'Mozilla/5.0 (compatible; CliffordNumberResearch/1.0; +https://github.com/BigBirdReturns/clifford-number)'
A02_SOURCE_GLOB = 'data/intake/status-sovereignty-rd04-snap-source-availability-a02/sources-*.json'


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalized_domain(url: str) -> str:
    try:
        return (urllib.parse.urlsplit(url).hostname or '').lower().rstrip('.')
    except ValueError:
        return ''


def load_a02_catalogue(repo_root: Path) -> tuple[dict[str, list[str]], set[str]]:
    url_to_ids: dict[str, list[str]] = {}
    known_hosts: set[str] = set()
    for path in sorted(repo_root.glob(A02_SOURCE_GLOB)):
        payload = json.loads(path.read_text(encoding='utf-8'))
        for row in payload.get('rows', []):
            url = row.get('url')
            source_id = row.get('source_id')
            if not isinstance(url, str) or not isinstance(source_id, str):
                continue
            url_to_ids.setdefault(url, []).append(source_id)
            host = normalized_domain(url)
            if host:
                known_hosts.add(host)
    return url_to_ids, known_hosts


def classify_domain(host: str, known_hosts: set[str]) -> str:
    if not host:
        return 'invalid_or_missing_domain'
    if host in known_hosts:
        return 'provisional_official_a02_catalogue_domain'
    if host.endswith('.gov') or host == 'gov':
        return 'provisional_official_gov'
    if host.endswith('.mil') or host == 'mil':
        return 'provisional_official_mil'
    if host in {'usa.gov', 'www.usa.gov', 'congress.gov', 'www.congress.gov', 'govinfo.gov', 'www.govinfo.gov'}:
        return 'provisional_official_federal'
    if host.endswith('.us') and ('.state.' in host or host.startswith(('legis.', 'legislature.', 'courts.', 'court.'))):
        return 'provisional_official_state_us'
    return 'non_official_or_unresolved'


def parse_rss(data: bytes, known_hosts: set[str], url_to_ids: dict[str, list[str]], code: str, qid: str) -> list[dict]:
    root = ET.fromstring(data)
    rows: list[dict] = []
    for position, item in enumerate(root.findall('.//item')[:10], start=1):
        title = (item.findtext('title') or '').strip()
        url = (item.findtext('link') or '').strip()
        description = (item.findtext('description') or '').strip()
        host = normalized_domain(url)
        classification = classify_domain(host, known_hosts)
        eligible = classification.startswith('provisional_official')
        rows.append({
            'result_id': f'{code}-{qid}-R{position:02d}',
            'position': position,
            'title': title,
            'url': url,
            'description': description,
            'domain': host,
            'publisher_domain_classification': classification,
            'official_source_eligible': eligible,
            'a02_exact_url_match_source_ids': sorted(url_to_ids.get(url, [])),
            'disposition': 'eligible_official_route' if eligible else 'rejected_nonofficial_or_unresolved',
            'disposition_reason': (
                'official-domain rule or A02 catalogue-domain custody matched'
                if eligible else
                'official-domain rule and A02 catalogue-domain custody did not match'
            ),
        })
    return rows


def header_value(header_path: Path, name: str) -> str | None:
    if not header_path.exists():
        return None
    prefix = name.lower() + ':'
    values = []
    for line in header_path.read_text(encoding='utf-8', errors='replace').splitlines():
        if line.lower().startswith(prefix):
            values.append(line.split(':', 1)[1].strip())
    return values[-1] if values else None


def execute_query(repo_root: Path, output_root: Path, code: str, state_name: str, qid: str, query: str) -> dict:
    receipts = output_root / 'receipts'
    raw_dir = output_root / 'raw'
    headers_dir = output_root / 'headers'
    for directory in (receipts, raw_dir, headers_dir):
        directory.mkdir(parents=True, exist_ok=True)

    receipt_path = receipts / f'{code}-{qid}.json'
    if receipt_path.exists():
        return json.loads(receipt_path.read_text(encoding='utf-8'))

    url_to_ids, known_hosts = load_a02_catalogue(repo_root)
    request_url = 'https://www.bing.com/search?format=rss&q=' + urllib.parse.quote_plus(query)
    attempts: list[dict] = []
    results: list[dict] = []
    terminal_state = 'tool_failure_after_bounded_retry'

    for attempt in (1, 2):
        executed_at = utc_now()
        raw_path = raw_dir / f'{code}-{qid}-attempt-{attempt}.xml'
        headers_path = headers_dir / f'{code}-{qid}-attempt-{attempt}.txt'
        command = [
            'curl', '-L', '--silent', '--show-error', '--max-time', '30',
            '-A', UA,
            '-H', 'Accept: application/rss+xml, application/xml;q=0.9, */*;q=0.1',
            '-D', str(headers_path),
            '-w', '%{http_code}',
            '-o', str(raw_path),
            request_url,
        ]
        process = subprocess.run(command, capture_output=True, text=True, check=False)
        http_status = (process.stdout or '').strip() or None
        raw_bytes = raw_path.read_bytes() if raw_path.exists() else b''
        error: str | None = None
        parsed: list[dict] = []
        if process.returncode != 0:
            error = f'curl_exit_{process.returncode}: {(process.stderr or "").strip()}'
        elif http_status != '200':
            error = f'http_{http_status}'
        else:
            try:
                parsed = parse_rss(raw_bytes, known_hosts, url_to_ids, code, qid)
                if not parsed:
                    error = 'empty_rss_item_set'
            except Exception as exc:  # noqa: BLE001 - exact terminal receipt preserves parser class/message
                error = f'xml_parse_error:{type(exc).__name__}:{exc}'

        attempts.append({
            'attempt': attempt,
            'executed_at': executed_at,
            'http_status': http_status,
            'curl_exit': process.returncode,
            'content_type': header_value(headers_path, 'content-type'),
            'raw_path': str(raw_path.relative_to(output_root)) if raw_path.exists() else None,
            'headers_path': str(headers_path.relative_to(output_root)) if headers_path.exists() else None,
            'raw_bytes': len(raw_bytes),
            'raw_sha256': sha256(raw_bytes) if raw_bytes else None,
            'error': error,
        })

        if error is None:
            results = parsed
            terminal_state = (
                'official_result_recovered'
                if any(row['official_source_eligible'] for row in results)
                else 'no_official_result_in_returned_set'
            )
            break
        if attempt == 1:
            time.sleep(2.0)

    receipt = {
        'schema_version': 'ssc-rd04-a03-query-receipt@1',
        'issue': 687,
        'parent_a02_head': '2c8803a644ba23abc739136961121a8c8e3cb75d',
        'query_id': f'{code}-{qid}',
        'state_code': code,
        'state_name': state_name,
        'query_slot': qid,
        'exact_query': query,
        'search_surface': 'bing_web_search_rss',
        'request_url': request_url,
        'result_depth_cap': 10,
        'user_agent': UA,
        'timeout_seconds': 30,
        'retry_ceiling': 1,
        'attempt_count': len(attempts),
        'attempts': attempts,
        'terminal_state': terminal_state,
        'ordered_results': results,
        'selected_result_ids': [row['result_id'] for row in results if row['official_source_eligible']],
        'boundaries': {
            'search_result_is_source_truth': False,
            'search_order_is_authority': False,
            'no_official_result_is_record_absence': False,
            'official_domain_match_proves_substantive_support': False,
        },
    }
    receipt_path.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    return receipt


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo-root', type=Path, default=Path('.'))
    parser.add_argument('--output-root', type=Path, required=True)
    parser.add_argument('--start', type=int, required=True)
    parser.add_argument('--end', type=int, required=True)
    parser.add_argument('--delay', type=float, default=0.75)
    args = parser.parse_args()
    if not (0 <= args.start < args.end <= len(STATES)):
        raise SystemExit('invalid state slice')

    repo_root = args.repo_root.resolve()
    output_root = args.output_root.resolve()
    (output_root / 'logs').mkdir(parents=True, exist_ok=True)
    batch_rows = []
    for code, state_name in STATES[args.start:args.end]:
        for qid, template in TEMPLATES.items():
            query = template.format(state=state_name)
            receipt = execute_query(repo_root, output_root, code, state_name, qid, query)
            batch_rows.append({
                'query_id': receipt['query_id'],
                'terminal_state': receipt['terminal_state'],
                'attempt_count': receipt['attempt_count'],
                'results': len(receipt['ordered_results']),
                'official_results': len(receipt['selected_result_ids']),
            })
            time.sleep(args.delay)

    log_path = output_root / 'logs' / f'batch-{args.start:02d}-{args.end:02d}.json'
    log_path.write_text(json.dumps(batch_rows, indent=2) + '\n', encoding='utf-8')
    terminal_counts = {
        state: sum(1 for row in batch_rows if row['terminal_state'] == state)
        for state in sorted({row['terminal_state'] for row in batch_rows})
    }
    print(json.dumps({'batch': [args.start, args.end], 'receipts': len(batch_rows), 'terminal': terminal_counts}, sort_keys=True))


if __name__ == '__main__':
    main()
