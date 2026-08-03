#!/usr/bin/env python3
import hashlib
import json
import os
import pathlib

root = pathlib.Path(os.environ['CENSUS_ROOT'])
plan = json.loads((root / 'plan.json').read_text())
results = json.loads((root / 'route-results.json').read_text())
candidates = json.loads((root / 'candidate-index.json').read_text())
official = json.loads((root / 'official-candidate-urls.json').read_text())
restriction = json.loads((root / 'restriction-ledger.json').read_text())
slots = json.loads((root / 'slot-terminal-ledger.json').read_text())
summary = json.loads((root / 'summary.json').read_text())
manifest = json.loads((root / 'manifest.json').read_text())

assert len(plan['routes']) == 40
assert results['route_count'] == 40
assert len(results['routes']) == 40
assert {row['route_id'] for row in results['routes']} == {row['route_id'] for row in plan['routes']}
for row in results['routes']:
    assert row['transport_terminal'] is True
    assert 1 <= len(row['attempts']) <= 2
    assert row['result_spawned_requests'] == 0
    assert row['external_contacts'] == 0
    assert row['external_reviews'] == 0
    selected = row['attempts'][row['selected_attempt'] - 1]
    for key in ['headers_path', 'body_path', 'stderr_path', 'meta_path']:
        assert (root / selected[key]).exists()

assert candidates['authority']['candidate_hit_is_offeror_identity'] is False
assert candidates['authority']['search_result_is_denominator_admission'] is False
assert candidates['authority']['result_spawned_requests'] == 0
assert official['admitted_into_offeror_denominator'] == 0
assert official['followup_requests_executed'] == 0
assert slots['proposal_slots'] == 8
assert len(slots['slots']) == 8
assert slots['named_slots'] == 3 and slots['unresolved_slots'] == 5
assert slots['transport_census_complete'] is True
assert slots['substantive_adjudication_complete'] is False
assert slots['class_closed'] is False
assert all(row['transport_protocol_terminal'] for row in slots['slots'])
assert restriction['five_unnamed_slots_are_proven_nonexistent'] is False
assert restriction['restriction_is_nonresponsiveness_or_withdrawal'] is False
assert restriction['substantive_identity_adjudication_complete'] is False
assert summary['fixed_routes'] == 40
assert summary['exact_get_routes'] == 10
assert summary['bing_rss_routes'] == 30
assert summary['transport_census_complete'] is True
assert summary['substantive_adjudication_complete'] is False
assert summary['unresolved_slots_terminally_classified'] == 0
assert summary['class_closed'] is False
assert summary['result_spawned_requests'] == 0
assert summary['external_contacts'] == 0
assert summary['external_reviews'] == 0
assert summary['outside_human_dependency'] is False
for key in ['technical_superiority_finding','favoritism_finding','foreclosure_finding','coordination_finding','common_purpose_finding']:
    assert summary[key] is False
for key in ['publication_effect','adoption_effect','graph_effect']:
    assert summary[key] == 'none'

def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

assert manifest['entry_count'] == len(manifest['entries'])
assert len({row['path'] for row in manifest['entries']}) == manifest['entry_count']
for row in manifest['entries']:
    path = root / row['path']
    assert path.is_file()
    assert path.stat().st_size == row['bytes']
    assert digest(path) == row['sha256']
combined = hashlib.sha256('\n'.join(f"{row['sha256']}  {row['path']}" for row in manifest['entries']).encode()).hexdigest()
assert combined == manifest['combined_sha256']
print(f"validated RD-06 fixed census: 40 routes, {manifest['entry_count']} exact files, manifest {combined}")
