#!/usr/bin/env python3
import hashlib
import json
import os
import pathlib

root = pathlib.Path(os.environ['CENSUS_ROOT'])
plan = json.loads((root / 'plan.json').read_text())
results = json.loads((root / 'route-results.json').read_text())
candidate = json.loads((root / 'candidate-index.json').read_text())
candidate_urls = json.loads((root / 'candidate-url-ledger.json').read_text())
route_index = json.loads((root / 'route-index.json').read_text())
evidence = json.loads((root / 'term-evidence-index.json').read_text())
instrument_ledger = json.loads((root / 'instrument-protocol-ledger.json').read_text())
summary = json.loads((root / 'summary.json').read_text())
manifest = json.loads((root / 'manifest.json').read_text())

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

assert plan['schema_version'] == 'ssc-rd03-wave02-public-record-census-plan@1'
assert plan['research_head'] == 'e70aec0f6809c77e198e0c4ee80f6bcadb6bbdc4'
assert len(plan['routes']) == 30
assert sum(row['route_kind'] == 'exact_get' for row in plan['routes']) == 15
assert sum(row['route_kind'] == 'bing_rss' for row in plan['routes']) == 15

assert results['schema_version'] == 'ssc-rd03-wave02-public-record-route-results@1'
assert results['research_head'] == plan['research_head']
assert results['route_count'] == 30
assert len(results['routes']) == 30
assert [row['route_id'] for row in results['routes']] == [row['route_id'] for row in plan['routes']]

allowed_states = {'http_success', 'http_terminal_non_success', 'bounded_transport_exhausted'}
plan_by_id = {row['route_id']: row for row in plan['routes']}
attempt_count = 0
for receipt in results['routes']:
    route = plan_by_id[receipt['route_id']]
    assert receipt['url'] == route['url']
    assert receipt['purpose'] == route['purpose']
    assert receipt['instrument_ids'] == route['instrument_ids']
    assert receipt['clusters'] == route['clusters']
    assert receipt['route_kind'] == route['route_kind']
    assert receipt['source_id'] == route.get('source_id')
    assert receipt['maximum_attempts'] == 2
    assert 1 <= len(receipt['attempts']) <= 2
    assert 1 <= receipt['selected_attempt'] <= len(receipt['attempts'])
    assert receipt['terminal_transport_state'] in allowed_states
    assert receipt['transport_terminal'] is True
    assert receipt['result_spawned_requests'] == 0
    assert receipt['external_contacts'] == 0
    assert receipt['external_reviews'] == 0
    attempt_count += len(receipt['attempts'])
    for attempt in receipt['attempts']:
        for prefix in ('headers', 'body', 'stderr', 'meta'):
            rel = attempt[f'{prefix}_path']
            path = root / rel
            assert path.exists(), rel
            assert path.stat().st_size == attempt[f'{prefix}_bytes'], rel
            assert digest(path) == attempt[f'{prefix}_sha256'], rel
        assert attempt['request_url'] == route['url']
        assert isinstance(attempt['http_status'], int)
        assert attempt['attempt'] in (1, 2)

assert 30 <= attempt_count <= 60

assert candidate['schema_version'] == 'ssc-rd03-wave02-public-record-candidate-index@1'
assert candidate['candidate_rows'] == len(candidate['rows'])
assert candidate['candidate_rows'] <= 150
assert candidate['unique_candidate_urls'] == len({row['url'] for row in candidate['rows'] if row['url']})
assert candidate['official_candidate_urls'] == len({row['url'] for row in candidate['rows'] if row['url'] and row['official_host_candidate']})
assert candidate['first_party_candidate_urls'] == len({row['url'] for row in candidate['rows'] if row['url'] and row['first_party_candidate']})
assert candidate['authority'] == {
    'candidate_hit_is_governing_instrument': False,
    'search_result_is_term_evidence': False,
    'result_spawned_requests': 0,
    'substantive_adjudication_complete': False,
}
assert all(row['source_admitted'] is False and row['result_spawned_request'] is False for row in candidate['rows'])

assert candidate_urls['schema_version'] == 'ssc-rd03-wave02-candidate-url-ledger@1'
assert candidate_urls['official_count'] == len(candidate_urls['official_urls'])
assert candidate_urls['first_party_count'] == len(candidate_urls['first_party_urls'])
assert len(candidate_urls['official_urls']) == len(set(candidate_urls['official_urls']))
assert len(candidate_urls['first_party_urls']) == len(set(candidate_urls['first_party_urls']))
assert candidate_urls['admitted_sources'] == 0
assert candidate_urls['followup_requests_executed'] == 0

assert route_index['schema_version'] == 'ssc-rd03-wave02-public-record-route-index@1'
assert len(route_index['routes']) == 30
assert [row['route_id'] for row in route_index['routes']] == [row['route_id'] for row in plan['routes']]
assert all(row['result_spawned_requests'] == 0 for row in route_index['routes'])

assert evidence['schema_version'] == 'ssc-rd03-wave02-term-evidence-index@1'
assert len(evidence['exact_routes']) == 15
assert [row['route_id'] for row in evidence['exact_routes']] == [row['route_id'] for row in plan['routes'] if row['route_kind'] == 'exact_get']
assert evidence['authority'] == {
    'marker_is_adjudicated_term': False,
    'text_match_is_complete_agreement': False,
    'announcement_is_executed_instrument': False,
    'substantive_adjudication_complete': False,
}
for row in evidence['exact_routes']:
    assert row['substantive_term_adjudication'] == 'not_performed_by_transport_census'
    assert set(row['markers']) == set(evidence['marker_vocabulary'])
    assert all(isinstance(value, bool) for value in row['markers'].values())
    text_path = root / row['normalized_text_path']
    assert text_path.exists()
    assert len(text_path.read_text(errors='replace').strip()) == row['normalized_text_characters']

assert instrument_ledger['schema_version'] == 'ssc-rd03-wave02-instrument-protocol-ledger@1'
assert instrument_ledger['instrument_count'] == 5
assert len(instrument_ledger['instruments']) == 5
assert [row['instrument_id'] for row in instrument_ledger['instruments']] == plan['frozen_object_denominator']['instrument_ids']
assert instrument_ledger['transport_census_complete'] is True
assert instrument_ledger['substantive_adjudication_complete'] is False
assert instrument_ledger['class_closed'] is False
for row in instrument_ledger['instruments']:
    expected = [route['route_id'] for route in plan['routes'] if row['instrument_id'] in route['instrument_ids']]
    assert row['fixed_route_ids'] == expected
    assert row['fixed_protocol_complete'] is True
    assert row['transport_terminal'] is True
    assert row['substantive_negotiated_term_adjudication'] == 'pending'
    assert row['instrument_closed_by_this_census'] is False
    assert set(row['marker_routes']).issubset(set(evidence['marker_vocabulary']))
    assert all(set(route_ids).issubset(set(row['exact_route_ids'])) for route_ids in row['marker_routes'].values())

assert summary['schema_version'] == 'ssc-rd03-wave02-public-record-census-summary@1'
assert summary['research_head'] == plan['research_head']
assert summary['instruments'] == 5
assert summary['executed_and_disbursed_parent_states'] == 1
assert summary['conditional_pre_close_parent_states'] == 4
assert summary['fixed_routes'] == 30
assert summary['exact_get_routes'] == 15
assert summary['bing_rss_routes'] == 15
assert summary['route_attempts'] == attempt_count
assert sum(summary['terminal_transport_states'].values()) == 30
assert set(summary['terminal_transport_states']).issubset(allowed_states)
assert summary['candidate_rows'] == candidate['candidate_rows']
assert summary['unique_candidate_urls'] == candidate['unique_candidate_urls']
assert summary['official_candidate_urls'] == candidate['official_candidate_urls']
assert summary['first_party_candidate_urls'] == candidate['first_party_candidate_urls']
assert summary['result_spawned_requests'] == 0
assert summary['transport_census_complete'] is True
assert summary['substantive_adjudication_complete'] is False
assert summary['terminally_classified_instruments'] == 0
assert summary['class_closed'] is False
assert summary['external_contacts'] == 0
assert summary['external_reviews'] == 0
assert summary['outside_human_dependency'] is False
for key in ('favoritism_finding','extraction_finding','public_recovery_finding','coordination_finding','common_purpose_finding'):
    assert summary[key] is False
for key in ('publication_effect','adoption_effect','graph_effect'):
    assert summary[key] == 'none'

assert manifest['schema_version'] == 'ssc-rd03-wave02-public-record-census-manifest@1'
assert manifest['entry_count'] == len(manifest['entries'])
assert manifest['entry_count'] >= 260
paths = [row['path'] for row in manifest['entries']]
assert len(paths) == len(set(paths))
required_top = {
    'plan.json','route-results.json','candidate-index.json','candidate-url-ledger.json',
    'route-index.json','term-evidence-index.json','instrument-protocol-ledger.json','summary.json',
}
assert required_top.issubset(paths)
for row in manifest['entries']:
    rel = pathlib.PurePosixPath(row['path'])
    assert not rel.is_absolute() and '..' not in rel.parts
    path = root / row['path']
    assert path.exists()
    assert path.stat().st_size == row['bytes']
    assert digest(path) == row['sha256']
combined = hashlib.sha256('\n'.join(f"{row['sha256']}  {row['path']}" for row in manifest['entries']).encode()).hexdigest()
assert combined == manifest['combined_sha256']

print(
    'RD-03 public-record census: PASS — '
    f"30 routes, {attempt_count} attempts, "
    f"{candidate['candidate_rows']} candidates, {manifest['entry_count']} manifest entries"
)
