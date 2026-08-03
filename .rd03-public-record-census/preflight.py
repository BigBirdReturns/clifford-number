#!/usr/bin/env python3
import hashlib
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
PLAN_PATH = ROOT / '.rd03-public-record-census' / 'plan.json'
plan = json.loads(PLAN_PATH.read_text())

def git(*args, binary=False):
    proc = subprocess.run(['git', *args], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if proc.returncode != 0:
        raise AssertionError(f"git {' '.join(args)} failed: {proc.stderr.decode(errors='replace')}")
    return proc.stdout if binary else proc.stdout.decode().strip()

assert plan['schema_version'] == 'ssc-rd03-wave02-public-record-census-plan@1'
assert plan['wave_id'] == 'SSC-RD-W02'
assert plan['class_id'] == 'RD-03-C04'
assert plan['issue'] == 788
assert plan['research_branch'] == 'agent/ssc-rd-wave02-rd03-negotiated-terms'
assert plan['research_head'] == 'e70aec0f6809c77e198e0c4ee80f6bcadb6bbdc4'
assert plan['field_matrix_path'] == 'data/intake/status-sovereignty-rd-wave02-rd03-negotiated-terms/field-matrix.json'
assert plan['field_matrix_sha256'] == '0d7924097f22816757891e70546d67c2bdfe685468e977b6d95406c108ddfa4a'
assert plan['field_matrix_blob_sha'] == '1ee428a1fc43365fd6987c5dbfe362a6338ec1e4'
assert plan['parent_sha256'] == '3bd111cc56eb5046ed5ba2aa8a8dfdecaec9d37bbb273e6c75b695e6ae1e05a0'
assert plan['seed_input_manifest_sha256'] == '12da3be1a750276357c93530f7390b6925d4f556184e9654dc87339346f46a59'

expected_ids = [
    'OSC-MP-MATERIALS-150M',
    'OSC-VULCAN-620M',
    'OSC-REELEMENT-80M',
    'OSC-PHOENIX-500M',
    'OSC-ENERGY-FUELS-725M',
]
denominator = plan['frozen_object_denominator']
assert denominator == {
    'instruments': 5,
    'instrument_ids': expected_ids,
    'executed_and_disbursed': 1,
    'conditional_pre_close': 4,
}

protocol = plan['protocol']
assert protocol['fixed_before_execution'] is True
assert protocol['maximum_attempts_per_route'] == 2
assert protocol['result_depth_per_bing_query'] == 10
assert protocol['result_spawned_requests_allowed'] is False
assert protocol['external_contacts'] == 0
assert protocol['external_reviews'] == 0
assert protocol['outside_human_dependency'] is False
assert protocol['denominator_widening_authorized'] is False
assert protocol['substantive_adjudication_authorized'] is False

routes = plan['routes']
assert len(routes) == 30
assert [row['route_id'] for row in routes] == [f'RD03-CENSUS-R{i:03d}' for i in range(1, 31)]
assert len({row['route_id'] for row in routes}) == 30
assert len({row['url'] for row in routes}) == 30
assert sum(row['route_kind'] == 'exact_get' for row in routes) == 15
assert sum(row['route_kind'] == 'bing_rss' for row in routes) == 15
assert all(row['max_attempts'] == 2 for row in routes)
assert all(row['instrument_ids'] and set(row['instrument_ids']).issubset(expected_ids) for row in routes)
assert all(row['clusters'] for row in routes)
assert all(row['url'].startswith('https://') for row in routes)
assert all((row.get('query') is None) == (row['route_kind'] == 'exact_get') for row in routes)

expected_parent_sources = {
    'SSC-RD03-S001','SSC-RD03-S002','SSC-RD03-S003','SSC-RD03-S004','SSC-RD03-S005',
    'SSC-RD03-S006','SSC-RD03-S007','SSC-RD03-S008','SSC-RD03-S009',
}
observed_parent_sources = {row['source_id'] for row in routes if row.get('source_id')}
assert observed_parent_sources == expected_parent_sources
assert all(sum(route.get('source_id') == source_id for route in routes) == 1 for source_id in expected_parent_sources)

observed_remote = git('ls-remote', '--heads', 'origin', f"refs/heads/{plan['research_branch']}")
assert observed_remote.split('\t')[0] == plan['research_head']
assert git('rev-parse', f"{plan['research_head']}:{plan['field_matrix_path']}") == plan['field_matrix_blob_sha']

matrix_bytes = git('show', f"{plan['research_head']}:{plan['field_matrix_path']}", binary=True)
assert hashlib.sha256(matrix_bytes).hexdigest() == plan['field_matrix_sha256']
matrix = json.loads(matrix_bytes)
assert matrix['schema_version'] == 'ssc-rd-wave02-rd03-negotiated-terms-field-matrix@1'
assert matrix['class_id'] == 'RD-03-C04'
assert matrix['issue'] == 788
assert matrix['denominator_contract']['instrument_ids'] == expected_ids
assert len(matrix['instruments']) == 5
assert len(matrix['required_fields']) == 14
assert matrix['counts']['fixed_protocol_completed_instruments'] == 0
assert matrix['counts']['closed_instruments'] == 0
assert matrix['current_result']['fixed_protocol_complete'] is False
assert matrix['current_result']['class_closed'] is False
assert matrix['boundaries']['outside_human_dependency'] is False

parent_bytes = git('show', f"{plan['research_head']}:{plan['parent_path']}", binary=True)
assert hashlib.sha256(parent_bytes).hexdigest() == plan['parent_sha256']
parent = json.loads(parent_bytes)
assert parent['execution_id'] == 'SSC-RD03-OSC-01'
assert [row['instrument_id'] for row in parent['instruments']] == expected_ids
assert parent['counts']['named_instruments'] == 5
assert parent['counts']['executed_loans'] == 1
assert parent['counts']['conditional_pre_close_commitments'] == 4
assert {row['source_id'] for row in parent['sources']} == expected_parent_sources

seed = json.loads(git('show', f"{plan['research_head']}:{plan['seed_path']}"))
assert seed['class_id'] == 'RD-03-C04'
assert seed['child_issue'] == 788
assert seed['input_manifest']['combined_sha256'] == plan['seed_input_manifest_sha256']

print('RD-03 census preflight: PASS — 5 instruments, 30 fixed routes, exact research lease')
