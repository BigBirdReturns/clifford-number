#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Any

DATA = Path('data/intake/schoolhouse-usaspending-recipient-census-v1')
SOURCE = DATA / 'sealed-source-artifact.zip'
QUALIFICATION = DATA / 'sealed-qualification-artifact.zip'
CUSTODY = DATA / 'source-custody.json'
MANIFEST = DATA / 'product-manifest.json'
DOC = Path('docs/milestones/schoolhouse-usaspending-recipient-census-v1.md')
TOOL = Path('tools/validate-schoolhouse-usaspending-recipient-census-custody.py')
PATHS = [SOURCE, QUALIFICATION, CUSTODY, MANIFEST, DOC, TOOL]

PRODUCT_PARENT = '8a2f4538bdbcf9455f02e70c35a71cb39f805b18'
PRODUCT_PARENT_TREE = '11e4905a11c1638cfc26865124f9ce181ae0c134'
SOURCE_CANONICAL_PARENT = '8a2f4538bdbcf9455f02e70c35a71cb39f805b18'
CANONICAL_RDAP_MERGE = '32b818c9d37ff5e65629848aca84c8d30859387b'
SOURCE_SHA256 = 'b56408461a681a3f2b2388b33f08960abc9f81e6dade1b2b6efc64a9530eea2d'
SOURCE_BYTES = 40601
QUALIFICATION_SHA256 = 'c80b2283050cad46e72ad82266ec7852ed76723d9ed17e2faac3b7f5960f25cf'
QUALIFICATION_BYTES = 10855
SOURCE_MEMBERS = sorted([
    'RUNNER-OUTPUT.log', 'RUNNER_EXIT_CODE', 'SHA256SUMS', 'adjudication.json',
    'artifact-manifest.json', 'autocomplete-results.jsonl', 'candidates.jsonl',
    'recipient-index-results.jsonl', 'request-receipts.jsonl', 'route-policy.json',
    'summary.json',
])
QUALIFICATION_MEMBERS = sorted([
    'SHA256SUMS', 'qualification.json', 'qualification.log', 'release-check.log',
    'source-SHA256SUMS', 'source-artifact-manifest.json', 'source-summary.json',
])
FORBIDDEN_KEYS = {
    'duns', 'amount', 'address', 'address_line_1', 'address_line_2',
    'physical_address', 'mailing_address', 'person_name', 'points_of_contact',
    'phone', 'fax', 'email', 'award_description', 'transaction_description',
    'raw_json', 'cookies', 'credentials', 'tokens', 'private_support',
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical(value: Any) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + '\n').encode('utf-8')


def compact(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')


def jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def walk(value: Any) -> None:
    if isinstance(value, dict):
        assert FORBIDDEN_KEYS.isdisjoint({str(key).casefold() for key in value})
        for child in value.values():
            walk(child)
    elif isinstance(value, list):
        for child in value:
            walk(child)


def authority() -> dict[str, Any]:
    return {
        'promotes_to': 'no_candidate_promoted',
        'identities_admitted': 0,
        'relationships_admitted': 0,
        'federal_awards_admitted': 0,
        'funding_or_amount_admissions': 0,
        'negative_existence_claims': 0,
        'outside_human_dependency': False,
        'publication_effect': 'none',
        'adoption_effect': 'none',
        'graph_effect': 'none',
        'public_schoolhouse_legal_identity': 'unresolved',
    }


def counts() -> dict[str, Any]:
    return {
        'fixed_queries': 3,
        'fixed_routes': 6,
        'terminal_routes': 6,
        'terminal_route_states': {'terminal_public_json_parsed': 6},
        'total_request_attempts': 6,
        'autocomplete_rows': 200,
        'autocomplete_strict_name_matches': 0,
        'recipient_index_rows': 684,
        'recipient_index_strict_name_matches': 1,
        'strict_match_rows_with_public_uei': 0,
        'strict_match_rows_without_public_uei': 1,
        'federal_spending_recipient_name_candidates': 0,
        'candidate_ueis': [],
        'recipient_index_has_next_by_query': {
            'q1_school_dot_house': False,
            'q2_schoolhouse': False,
            'q3_school_house': False,
        },
    }


def retention() -> dict[str, int]:
    return {
        'duns_values': 0,
        'recipient_amount_values': 0,
        'addresses_retained': 0,
        'person_names_retained': 0,
        'points_of_contact_retained': 0,
        'phone_fax_email_values': 0,
        'award_or_transaction_narratives': 0,
        'raw_response_json': 0,
        'cookies_browser_state_credentials_or_tokens': 0,
        'private_support_material': 0,
    }


def custody() -> dict[str, Any]:
    return {
        'schema_version': 'schoolhouse-usaspending-recipient-census-custody@1',
        'state': 'terminal_bounded_usaspending_recipient_candidate_census',
        'issue': 1358,
        'product_parent_commit': PRODUCT_PARENT,
        'product_parent_tree': PRODUCT_PARENT_TREE,
        'source_canonical_parent_commit': SOURCE_CANONICAL_PARENT,
        'canonical_rdap_merge': CANONICAL_RDAP_MERGE,
        'source': {
            'pr': 1363,
            'head': '61fa1de957bdbe7ce0b1c6cd32947e825d690f31',
            'workflow_run': 31196898247,
            'workflow_conclusion': 'success',
            'artifact_id': 9001168026,
            'artifact_name': 'schoolhouse-usaspending-recipient-census-v1',
            'artifact_bytes': SOURCE_BYTES,
            'artifact_digest': 'sha256:' + SOURCE_SHA256,
            'release_check_run': 31196898385,
            'no_magic_human_run': 31196899313,
        },
        'qualification': {
            'pr': 1365,
            'head': '0b7a1f454216e7dd5586ad702f89f94140332b06',
            'workflow_run': 31198311051,
            'workflow_conclusion': 'success',
            'artifact_id': 9001773839,
            'artifact_name': 'schoolhouse-usaspending-recipient-census-qualification-v1',
            'artifact_bytes': QUALIFICATION_BYTES,
            'artifact_digest': 'sha256:' + QUALIFICATION_SHA256,
            'release_check_run': 31198311367,
            'no_magic_human_run': 31198310689,
            'source_requests': 0,
        },
        'counts': counts(),
        'retention': retention(),
        'authority': authority(),
        'interpretation': {
            'autocomplete_rows_cannot_be_candidates': True,
            'one_strict_name_match_without_public_uei_is_not_a_candidate': True,
            'recipient_name_match_is_not_target_identity': True,
            'recipient_index_presence_is_not_award_attribution_to_target': True,
            'zero_candidates_is_not_entity_or_award_absence': True,
            'no_candidate_authorizes_no_candidate_adjudication': True,
            'identical_source_retry_authorized': False,
        },
    }


def manifest() -> dict[str, Any]:
    return {
        'schema_version': 'schoolhouse-usaspending-recipient-census-product-manifest@1',
        'permanent_paths': [str(path) for path in PATHS],
        'permanent_path_count': 6,
        'sealed_source': {
            'path': str(SOURCE),
            'bytes': SOURCE_BYTES,
            'sha256': SOURCE_SHA256,
            'members': len(SOURCE_MEMBERS),
        },
        'sealed_qualification': {
            'path': str(QUALIFICATION),
            'bytes': QUALIFICATION_BYTES,
            'sha256': QUALIFICATION_SHA256,
            'members': len(QUALIFICATION_MEMBERS),
        },
        'terminal_result': counts(),
        'authority': authority(),
    }


def milestone() -> str:
    return f'''# School.House USAspending recipient census

The fixed Treasury USAspending census executed three recipient-autocomplete requests and three recipient-index requests for `School.House`, `Schoolhouse`, and `School House`. All six routes returned terminal public JSON in six total request attempts, and every recipient-index response reported `hasNext=false`.

```text
product parent: {PRODUCT_PARENT}
source workflow run / artifact: 31196898247 / 9001168026
source artifact SHA-256: {SOURCE_SHA256}
qualification workflow run / artifact: 31198311051 / 9001773839
qualification artifact SHA-256: {QUALIFICATION_SHA256}
fixed / terminal routes: 6 / 6
autocomplete rows / exact matches: 200 / 0
recipient-index rows / exact matches: 684 / 1
exact matches with / without public UEI: 0 / 1
UEI-backed recipient candidates: 0
identity / relationship admissions: 0 / 0
federal-award / funding admissions: 0 / 0
negative-existence claims: 0
outside-human dependency: false
publication / adoption / graph: none / none / none
public School.House legal identity: unresolved
```

The sole strict normalized-name match lacks a public UEI and is therefore not a `federal_spending_recipient_name_candidate`. A recipient-name match is not a School.House identity, federal-award, funding, ownership, governance, or control finding. Zero qualifying candidates is a bounded result for this fixed public recipient-index protocol, not evidence that no relevant entity or federal award exists. No candidate adjudication or identical USAspending replay is authorized absent a material endpoint, index-version, denominator, or canonical-predecessor change.
'''


def open_zip(root: Path, relative: Path, size: int, expected_digest: str, members: list[str]) -> Path:
    data = (root / relative).read_bytes()
    assert len(data) == size and digest(data) == expected_digest
    target = Path(tempfile.mkdtemp(prefix='schoolhouse-usaspending-custody-'))
    with zipfile.ZipFile(root / relative) as archive:
        assert archive.testzip() is None
        assert sorted(archive.namelist()) == members
        archive.extractall(target)
    return target


def validate_sums(directory: Path, rows: int, excluded: set[str] | None = None) -> None:
    excluded = excluded or {'SHA256SUMS'}
    lines = (directory / 'SHA256SUMS').read_text().splitlines()
    assert len(lines) == rows
    names: list[str] = []
    for line in lines:
        expected, name = line.split('  ', 1)
        assert '/' not in name and name not in excluded
        assert digest((directory / name).read_bytes()) == expected
        names.append(name)
    assert len(names) == len(set(names))


def validate_source(directory: Path) -> dict[str, Any]:
    assert (directory / 'RUNNER_EXIT_CODE').read_text().strip() == '0'
    validate_sums(directory, 10)
    source_manifest = json.loads((directory / 'artifact-manifest.json').read_text())
    source_summary = json.loads((directory / 'summary.json').read_text())
    source_adjudication = json.loads((directory / 'adjudication.json').read_text())
    policy = json.loads((directory / 'route-policy.json').read_text())
    requests = jsonl(directory / 'request-receipts.jsonl')
    autocomplete = jsonl(directory / 'autocomplete-results.jsonl')
    index = jsonl(directory / 'recipient-index-results.jsonl')
    candidates = jsonl(directory / 'candidates.jsonl')

    assert source_manifest['schema_version'] == 'schoolhouse-usaspending-recipient-census-artifact-manifest@1'
    assert source_manifest['issue'] == 1358 and source_manifest['canonical_parent'] == SOURCE_CANONICAL_PARENT
    assert len(source_manifest['members']) == 9
    for row in source_manifest['members']:
        assert row['name'] in SOURCE_MEMBERS and row['name'] not in {'SHA256SUMS', 'artifact-manifest.json'}
        data = (directory / row['name']).read_bytes()
        assert len(data) == row['bytes'] and digest(data) == row['sha256']
    assert digest(canonical(source_manifest['members'])) == source_manifest['combined_sha256'] == '3373f8ab62a4432f900f0d2f17dbc0790e239fe62d9a8feb18e8821e6c762884'

    assert source_summary['state'] == 'terminal_bounded_usaspending_recipient_candidate_census'
    assert source_summary['issue'] == 1358 and source_summary['canonical_parent'] == SOURCE_CANONICAL_PARENT
    assert source_summary['fixed_query_count'] == 3 and source_summary['fixed_route_count'] == source_summary['terminal_route_count'] == 6
    assert source_summary['terminal_route_state_counts'] == {'terminal_public_json_parsed': 6}
    assert source_summary['total_request_attempts'] == 6
    assert source_summary['autocomplete_returned_rows'] == len(autocomplete) == 200
    assert source_summary['autocomplete_strict_match_rows'] == 0
    assert source_summary['recipient_index_returned_rows'] == len(index) == 684
    assert source_summary['recipient_index_strict_match_rows'] == 1
    assert source_summary['federal_spending_recipient_name_candidate_rows'] == len(candidates) == 0
    assert source_summary['candidate_ueis'] == []
    assert source_summary['recipient_index_has_next_by_query'] == counts()['recipient_index_has_next_by_query']
    assert source_summary['retention'] == retention()
    assert source_summary['authority'] == {
        **authority(),
        'promotes_to': 'federal_spending_recipient_name_candidate_only',
    }
    assert source_summary['interpretation'] == {
        'autocomplete_rows_cannot_be_candidates': True,
        'identical_source_retry_authorized': False,
        'recipient_index_presence_is_not_award_attribution_to_target': True,
        'recipient_name_match_is_not_target_identity': True,
        'zero_candidates_is_not_entity_or_award_absence': True,
    }
    assert source_adjudication['state'] == source_summary['state']
    assert source_adjudication['candidate_rows'] == 0 and source_adjudication['successor_required'] is False
    assert source_adjudication['promotes_to'] == 'no_candidate_promoted'
    assert all(source_adjudication[key] == 0 for key in [
        'identity_admissions', 'relationship_admissions', 'federal_award_admissions',
        'funding_or_amount_admissions', 'negative_existence_claims',
    ])
    assert source_adjudication['outside_human_dependency'] is False
    assert [source_adjudication[key] for key in ['publication_effect', 'adoption_effect', 'graph_effect']] == ['none', 'none', 'none']
    assert policy['issue'] == 1358 and policy['canonical_parent'] == SOURCE_CANONICAL_PARENT
    assert policy['canonical_rdap_merge'] == CANONICAL_RDAP_MERGE
    assert all(value == 0 for value in policy['retention'].values())

    expected_routes = [
        'autocomplete_q1_school_dot_house', 'recipient_index_q1_school_dot_house',
        'autocomplete_q2_schoolhouse', 'recipient_index_q2_schoolhouse',
        'autocomplete_q3_school_house', 'recipient_index_q3_school_house',
    ]
    assert [row['route_id'] for row in requests] == expected_routes
    assert all(row['attempts'] == 1 and row['status_code'] == 200 and row['terminal_state'] == 'terminal_public_json_parsed' and row['error_class'] is None for row in requests)
    assert all(row['url'] == row['final_url'] for row in requests)
    expected_receipts = {
        'autocomplete_q1_school_dot_house': (248, '6d875e12098a54a9cde69b22d7bf824446a801477ddec75040ff6db8d70f8cc9', 0, 0),
        'recipient_index_q1_school_dot_house': (128, 'de16274141105d13fad23603c91b6b6f5b8c0c2c910fcd8b580ad775bdded54b', 0, 0),
        'autocomplete_q2_schoolhouse': (9997, '1296e33c2446c5f59d40f8155879044f562ded5710a6e267beb4101a6d9b4daf', 100, 0),
        'recipient_index_q2_schoolhouse': (71786, '4b41ef5ca13458783761ad661ed61fe2c24b7ff3c4bd0979388fec7095d015ce', 489, 1),
        'autocomplete_q3_school_house': (10303, '19c6c9a1d6ae603e8e933f0aaf7dcefe1ade10eace94e3ab9c5423c2c8561f3e', 100, 0),
        'recipient_index_q3_school_house': (28782, '285ff7c2e701af2f50b41a622201413354515ce7f1ade60b3fb50d9e0db48de2', 195, 0),
    }
    for row in requests:
        size, expected_hash, returned, matches = expected_receipts[row['route_id']]
        assert (row['response_bytes'], row['response_sha256'], row['returned_rows'], row['strict_match_rows']) == (size, expected_hash, returned, matches)
        if row['endpoint_class'] == 'recipient_index':
            assert row['has_next'] is False and row['candidate_rows'] == 0

    assert all(row['candidate'] is False and row['strict_name_match'] is False for row in autocomplete)
    strict = [row for row in index if row['strict_name_match']]
    assert len(strict) == 1
    strict_row = strict[0]
    assert strict_row['candidate'] is False and strict_row['normalized_name'] == 'schoolhouse'
    assert strict_row['query_id'] == 'q2_schoolhouse' and strict_row['query_text'] == 'Schoolhouse'
    assert strict_row['recipient_level'] == 'R' and strict_row['result_ordinal'] == 229
    assert isinstance(strict_row['recipient_name'], str) and strict_row['recipient_name']
    assert isinstance(strict_row['recipient_id'], str) and strict_row['recipient_id']
    assert strict_row['uei'] is None
    assert digest(compact(strict_row)) == '0a1b207d2a4360c1eb75c5f9e0cfacd7cc3ca2fba8b8aad07e0c01e37f0e5d9c'
    assert all(row['candidate'] is False for row in index)
    for value in [source_manifest, source_summary, source_adjudication, policy, requests, autocomplete, index, candidates]:
        walk(value)
    return {
        'summary': source_summary,
        'manifest': source_manifest,
        'sums': (directory / 'SHA256SUMS').read_bytes(),
    }


def validate_qualification(directory: Path, source: dict[str, Any]) -> dict[str, Any]:
    validate_sums(directory, 6)
    assert (directory / 'source-summary.json').read_bytes() == canonical(source['summary'])
    assert (directory / 'source-SHA256SUMS').read_bytes() == source['sums']
    assert json.loads((directory / 'source-artifact-manifest.json').read_text()) == source['manifest']
    qualification = json.loads((directory / 'qualification.json').read_text())
    assert qualification == {
        'adoption_effect': 'none',
        'autocomplete_rows': 200,
        'candidate_rows': 0,
        'candidate_ueis': [],
        'canonical_parent': SOURCE_CANONICAL_PARENT,
        'federal_award_admissions': 0,
        'fixed_routes': 6,
        'funding_or_amount_admissions': 0,
        'graph_effect': 'none',
        'identity_admissions': 0,
        'issue': 1358,
        'negative_existence_claims': 0,
        'outside_human_dependency': False,
        'publication_effect': 'none',
        'qualification': 'pass',
        'recipient_index_rows': 684,
        'recipient_index_strict_name_matches': 1,
        'schema_version': 'schoolhouse-usaspending-recipient-census-source-qualification@1',
        'source_artifact_bytes': SOURCE_BYTES,
        'source_artifact_id': 9001168026,
        'source_artifact_sha256': SOURCE_SHA256,
        'source_head': '61fa1de957bdbe7ce0b1c6cd32947e825d690f31',
        'source_requests_made_by_qualifier': 0,
        'source_workflow_run': 31196898247,
        'status': 'complete',
        'terminal_route_state_counts': {'terminal_public_json_parsed': 6},
        'terminal_routes': 6,
        'total_request_attempts': 6,
    }
    assert (directory / 'qualification.log').read_text() == 'schoolhouse_usaspending_source_qualification=pass routes=6 rows=684 strict_matches=1 candidates=0 source_requests=0\n'
    walk(qualification)
    return qualification


def write(root: Path) -> None:
    (root / CUSTODY).write_bytes(canonical(custody()))
    (root / MANIFEST).write_bytes(canonical(manifest()))
    (root / DOC).write_text(milestone())


def validate(root: Path) -> dict[str, Any]:
    assert json.loads((root / CUSTODY).read_text()) == custody()
    assert json.loads((root / MANIFEST).read_text()) == manifest()
    assert (root / DOC).read_text() == milestone()
    assert all((root / path).is_file() for path in PATHS)
    source_dir = open_zip(root, SOURCE, SOURCE_BYTES, SOURCE_SHA256, SOURCE_MEMBERS)
    qualification_dir = open_zip(root, QUALIFICATION, QUALIFICATION_BYTES, QUALIFICATION_SHA256, QUALIFICATION_MEMBERS)
    try:
        source = validate_source(source_dir)
        qualification = validate_qualification(qualification_dir, source)
        assert source['summary']['federal_spending_recipient_name_candidate_rows'] == 0
        assert qualification['candidate_rows'] == 0
        assert custody()['counts'] == counts()
        assert custody()['retention'] == retention()
        assert custody()['authority'] == authority()
        walk({'custody': custody(), 'manifest': manifest()})
        return {'routes': 6, 'rows': 684, 'strict_matches': 1, 'candidates': 0}
    finally:
        shutil.rmtree(source_dir, ignore_errors=True)
        shutil.rmtree(qualification_dir, ignore_errors=True)


def self_test(root: Path) -> int:
    validate(root)
    refused = 0

    def run_mutation(mutate) -> None:
        nonlocal refused
        with tempfile.TemporaryDirectory(prefix='schoolhouse-usaspending-fixture-') as temporary:
            fixture = Path(temporary)
            for relative in PATHS:
                target = fixture / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(root / relative, target)
            mutate(fixture)
            try:
                validate(fixture)
            except Exception:
                refused += 1
            else:
                raise AssertionError('adversarial mutation accepted')

    def flip(relative: Path):
        def mutate(fixture: Path) -> None:
            path = fixture / relative
            data = bytearray(path.read_bytes())
            data[min(100, len(data) - 1)] ^= 1
            path.write_bytes(data)
        return mutate

    def mutate_json(relative: Path, keys: list[str], value: Any):
        def mutate(fixture: Path) -> None:
            path = fixture / relative
            document = json.loads(path.read_text())
            cursor = document
            for key in keys[:-1]:
                cursor = cursor[key]
            cursor[keys[-1]] = value
            path.write_bytes(canonical(document))
        return mutate

    run_mutation(flip(SOURCE))
    run_mutation(flip(QUALIFICATION))
    run_mutation(mutate_json(CUSTODY, ['counts', 'federal_spending_recipient_name_candidates'], 1))
    run_mutation(mutate_json(MANIFEST, ['permanent_path_count'], 7))
    run_mutation(mutate_json(CUSTODY, ['authority', 'federal_awards_admitted'], 1))

    def mutate_doc(fixture: Path) -> None:
        path = fixture / DOC
        text = path.read_text()
        needle = 'is not a School.House identity, federal-award, funding, ownership, governance, or control finding'
        assert needle in text
        path.write_text(text.replace(needle, 'is the School.House identity and federal-award finding'))

    run_mutation(mutate_doc)
    assert refused == 6
    return refused


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    root = Path.cwd()
    if args.write:
        write(root)
    result = validate(root)
    if args.self_test:
        print(f'schoolhouse_usaspending_custody_adversarial_refusals={self_test(root)}')
    else:
        print(
            'schoolhouse_usaspending_custody=pass '
            f"routes={result['routes']} rows={result['rows']} "
            f"strict_matches={result['strict_matches']} candidates={result['candidates']}"
        )


if __name__ == '__main__':
    main()
