#!/usr/bin/env python3
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
import pathlib
import subprocess
import time

root = pathlib.Path(os.environ['CENSUS_ROOT'])
plan = json.loads((root / 'plan.json').read_text())
user_agent = 'clifford-number-rd06-public-record-census/1.0 (+https://github.com/BigBirdReturns/clifford-number)'

def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def now():
    return dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z')

def capture(route):
    route_dir = root / 'routes' / route['route_id']
    route_dir.mkdir(parents=True, exist_ok=True)
    attempts = []
    selected = None
    for attempt_number in range(1, route['max_attempts'] + 1):
        attempt_dir = route_dir / f'attempt-{attempt_number}'
        attempt_dir.mkdir(parents=True, exist_ok=True)
        headers = attempt_dir / 'headers.txt'
        body = attempt_dir / 'body.bin'
        stderr = attempt_dir / 'curl-stderr.txt'
        meta = attempt_dir / 'curl-meta.txt'
        request_url = attempt_dir / 'request-url.txt'
        started_at = attempt_dir / 'started-at.txt'
        finished_at = attempt_dir / 'finished-at.txt'
        request_url.write_text(route['url'] + '\n')
        started = now()
        started_at.write_text(started + '\n')
        command = [
            'curl', '--location', '--silent', '--show-error', '--compressed',
            '--connect-timeout', '15', '--max-time', '60', '--max-filesize', '26214400',
            '--user-agent', user_agent,
            '--dump-header', str(headers), '--output', str(body),
            '--write-out', '%{url_effective}\n%{http_code}\n%{content_type}\n%{size_download}\n%{time_total}\n',
            route['url'],
        ]
        with stderr.open('wb') as err:
            proc = subprocess.run(command, stdout=subprocess.PIPE, stderr=err, check=False)
        meta.write_bytes(proc.stdout)
        finished = now()
        finished_at.write_text(finished + '\n')
        lines = proc.stdout.decode('utf-8', errors='replace').splitlines()
        while len(lines) < 5:
            lines.append('')
        try:
            status = int(lines[1])
        except ValueError:
            status = 0
        attempt = {
            'attempt': attempt_number,
            'started_at': started,
            'finished_at': finished,
            'curl_exit': proc.returncode,
            'request_url': route['url'],
            'final_url': lines[0],
            'http_status': status,
            'content_type': lines[2],
            'reported_download_bytes': lines[3],
            'time_total_seconds': lines[4],
            'headers_path': str(headers.relative_to(root)),
            'headers_bytes': headers.stat().st_size if headers.exists() else 0,
            'headers_sha256': digest(headers) if headers.exists() else None,
            'body_path': str(body.relative_to(root)),
            'body_bytes': body.stat().st_size if body.exists() else 0,
            'body_sha256': digest(body) if body.exists() else None,
            'stderr_path': str(stderr.relative_to(root)),
            'stderr_bytes': stderr.stat().st_size,
            'stderr_sha256': digest(stderr),
            'meta_path': str(meta.relative_to(root)),
            'meta_bytes': meta.stat().st_size,
            'meta_sha256': digest(meta),
        }
        attempts.append(attempt)
        transient = proc.returncode != 0 or status == 0 or status == 429 or status >= 500
        if not transient:
            selected = attempt_number
            break
        if attempt_number < route['max_attempts']:
            time.sleep(2)

    if selected is None:
        selected = attempts[-1]['attempt']
    chosen = attempts[selected - 1]
    if chosen['curl_exit'] == 0 and 200 <= chosen['http_status'] < 400:
        terminal_state = 'http_success'
    elif chosen['curl_exit'] == 0 and 400 <= chosen['http_status'] < 500 and chosen['http_status'] != 429:
        terminal_state = 'http_terminal_non_success'
    else:
        terminal_state = 'bounded_transport_exhausted'
    receipt = {
        'route_id': route['route_id'],
        'url': route['url'],
        'purpose': route['purpose'],
        'clusters': route['clusters'],
        'route_kind': route['route_kind'],
        'maximum_attempts': route['max_attempts'],
        'attempts': attempts,
        'selected_attempt': selected,
        'terminal_transport_state': terminal_state,
        'transport_terminal': True,
        'result_spawned_requests': 0,
        'external_contacts': 0,
        'external_reviews': 0,
    }
    (route_dir / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    return receipt

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    receipts = list(pool.map(capture, plan['routes']))
receipts.sort(key=lambda row: row['route_id'])
(root / 'route-results.json').write_text(json.dumps({
    'schema_version': 'ssc-rd06-wave02-public-record-route-results@1',
    'research_head': plan['research_head'],
    'route_count': len(receipts),
    'routes': receipts,
}, indent=2) + '\n')
print(f'captured {len(receipts)} fixed RD-06 routes')
