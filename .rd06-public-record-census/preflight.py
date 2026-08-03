#!/usr/bin/env python3
import json
import pathlib
import urllib.parse

plan = json.loads(pathlib.Path('.rd06-public-record-census/plan.json').read_text())
matrix = json.loads(pathlib.Path(plan['field_matrix_path']).read_text())

assert plan['schema_version'] == 'ssc-rd06-wave02-public-record-census-plan@1'
assert plan['wave_id'] == 'SSC-RD-W02'
assert plan['class_id'] == 'RD-06-C01'
assert plan['issue'] == 791
assert plan['research_head'] == '54854462decbf3b93ab9dd36a35fd4da00981081'
assert plan['field_matrix_sha256'] == '4cc907e277d6e00171031f6fa0d77a0f3670d0b4fb8b59c74ce75f00c2daf091'
assert plan['protocol']['fixed_before_execution'] is True
assert plan['protocol']['maximum_attempts_per_route'] == 2
assert plan['protocol']['result_depth_per_bing_query'] == 10
assert plan['protocol']['result_spawned_requests_allowed'] is False
assert plan['protocol']['external_contacts'] == 0
assert plan['protocol']['external_reviews'] == 0
assert plan['protocol']['outside_human_dependency'] is False
assert plan['protocol']['denominator_widening_authorized'] is False
assert plan['protocol']['substantive_adjudication_authorized'] is False

assert len(plan['routes']) == 40
assert len({row['route_id'] for row in plan['routes']}) == 40
assert sum(row['route_kind'] == 'exact_get' for row in plan['routes']) == 10
assert sum(row['route_kind'] == 'bing_rss' for row in plan['routes']) == 30
for row in plan['routes']:
    assert row['max_attempts'] == 2
    assert row['clusters']
    parsed = urllib.parse.urlparse(row['url'])
    assert parsed.scheme == 'https'
    if row['route_kind'] == 'bing_rss':
        assert parsed.hostname == 'www.bing.com'
        assert 'format=rss' in parsed.query

assert matrix['schema_version'] == 'ssc-rd-wave02-rd06-offeror-universe-field-matrix@1'
assert matrix['class_id'] == 'RD-06-C01'
assert matrix['issue'] == 791
assert matrix['denominator_contract']['proposal_slots'] == 8
assert matrix['counts']['proposal_slots'] == 8
assert matrix['counts']['publicly_named_offerors'] == 3
assert matrix['counts']['unresolved_offeror_identities'] == 5
assert matrix['counts']['identity_and_disposition_terminal_slots'] == 3
assert matrix['counts']['fixed_protocol_completed_slots'] == 0
assert matrix['current_result']['fixed_protocol_complete'] is False
assert matrix['current_result']['class_closed'] is False
assert [row['slot_id'] for row in matrix['slots']] == plan['frozen_object_denominator']['slot_ids']
print('RD-06 fixed census: 40 routes, eight slots, five unresolved, exact research lease')
