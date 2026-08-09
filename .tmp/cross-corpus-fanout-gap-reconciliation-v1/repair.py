#!/usr/bin/env python3
import hashlib
import json
import os
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
MAP_PATH = ROOT / os.environ['MAP_PATH']
STATE_PATH = ROOT / os.environ['STATE_PATH']
SOURCES_PATH = ROOT / os.environ['SOURCES_PATH']


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode()
    return hashlib.sha1(header + data).hexdigest()


def load_bound(path: Path, expected_blob: str):
    data = path.read_bytes()
    actual = git_blob_sha(data)
    if actual != expected_blob:
        raise AssertionError(f"blob mismatch for {path}: {actual} != {expected_blob}")
    return json.loads(data), data


map_obj, map_before = load_bound(MAP_PATH, os.environ['MAP_BLOB'])
state, _ = load_bound(STATE_PATH, os.environ['STATE_BLOB'])
sources, _ = load_bound(SOURCES_PATH, os.environ['SOURCES_BLOB'])

assert map_obj['schema_version'] == 'clifford-cross-corpus-public-interest-map@1'
assert map_obj['scope'] == 'Repository evidence only; no new external acquisition.'
assert map_obj['generated_at'] == '2026-07-14'

source_by_id = {row['id']: row for row in sources['sources'] if row.get('enabled')}
gaps = []
for source_id in sorted(source_by_id):
    status = state.get('sources', {}).get(source_id, {}).get('status', 'not_run')
    if status != 'ok':
        gaps.append((source_id, status, state['sources'].get(source_id, {})))

assert [(source_id, status) for source_id, status, _ in gaps] == [
    ('federal-register', 'partial'),
    ('sam-opportunities', 'skipped_missing_credential'),
]
assert len(gaps[0][2].get('errors', [])) == 1
assert '503' in gaps[0][2]['errors'][0]
assert gaps[0][2].get('records_seen') == 9
assert gaps[1][2].get('credential_env') == 'SAM_API_KEY'

lanes = [row for row in map_obj['lanes'] if row.get('lane_id') == 'official-research-fanout']
assert len(lanes) == 1
lane = lanes[0]
assert lane['counts']['crawl_source_gaps'] == 1
assert lane['crawl_source_gap_states'] == [{
    'source_id': 'sam-opportunities',
    'status': 'skipped_missing_credential',
    'interpretation': 'Acquisition did not run; this is not a zero result.'
}]
assert 'current committed crawl exposes one source gap' in lane['what_the_data_shows']
assert 'Federal Register source returned to ok' in lane['what_the_data_shows']

map_obj['generated_at'] = '2026-08-09'
lane['counts']['crawl_source_gaps'] = 2
lane['crawl_source_gap_states'] = [
    {
        'source_id': 'federal-register',
        'status': 'partial',
        'interpretation': 'Nine records were observed in the August 1 through August 9 window, while one query returned HTTP 503. This is partial coverage, not a zero result or evidence of absence.'
    },
    {
        'source_id': 'sam-opportunities',
        'status': 'skipped_missing_credential',
        'interpretation': 'Acquisition did not run because SAM_API_KEY was unavailable; this is not a zero result.'
    }
]
lane['what_the_data_shows'] = (
    'The repository generated at least 316 inspectable research tasks; the live target branch may contain more as official-record intake advances. '
    'Batch count varies with the configured batch size and is presentation geometry, not a research-data count. Rejections, failed routes, source gaps, '
    'and inferred scout findings remain part of the discovery map rather than disappearing from it. The current committed crawl exposes two source gaps. '
    'SAM.gov did not execute because its credential is unavailable. The Federal Register source observed nine records in the August 1 through August 9, 2026 '
    'window but remained partial because one bounded query returned HTTP 503. These states are acquisition and coverage gaps, not zero results or evidence of absence.'
)

map_after = (json.dumps(map_obj, indent=2, ensure_ascii=False) + '\n').encode()
MAP_PATH.write_bytes(map_after)

report = {
    'schema_version': 'cross-corpus-fanout-gap-reconciliation-build@1',
    'state': 'complete',
    'map_path': os.environ['MAP_PATH'],
    'map_before_bytes': len(map_before),
    'map_before_sha256': sha256_bytes(map_before),
    'map_before_git_blob': git_blob_sha(map_before),
    'map_after_bytes': len(map_after),
    'map_after_sha256': sha256_bytes(map_after),
    'map_after_git_blob': git_blob_sha(map_after),
    'generated_at_before': '2026-07-14',
    'generated_at_after': '2026-08-09',
    'crawl_source_gaps_before': 1,
    'crawl_source_gaps_after': 2,
    'current_gap_states': [
        {'source_id': source_id, 'status': status, 'error_count': len(record.get('errors', []))}
        for source_id, status, record in gaps
    ],
    'data_paths_changed': 1,
    'source_requests': 0,
    'graph_effect': 'none',
    'publication_effect': 'none',
    'outside_human_dependency': False,
}
print(json.dumps(report, indent=2, sort_keys=True))
