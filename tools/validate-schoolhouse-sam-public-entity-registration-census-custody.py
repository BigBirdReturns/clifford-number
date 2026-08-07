#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Callable

DATA = Path('data/intake/schoolhouse-sam-public-entity-registration-census-v1')
SOURCE = DATA / 'sealed-source-artifact.zip'
WRAPPER = DATA / 'sealed-wrapper-reconstruction-artifact.zip'
QUALIFICATION = DATA / 'sealed-qualification-artifact.zip'
CUSTODY = DATA / 'source-custody.json'
MANIFEST = DATA / 'product-manifest.json'
DOC = Path('docs/milestones/schoolhouse-sam-public-entity-registration-census-v1.md')
TOOL = Path('tools/validate-schoolhouse-sam-public-entity-registration-census-custody.py')
PATHS = [SOURCE, WRAPPER, QUALIFICATION, CUSTODY, MANIFEST, DOC, TOOL]

SOURCE_PARENT = 'd26cb838df12a877840ebe71eb9388d44b6ceaf9'
SOURCE_PARENT_TREE = 'af520dd75d4111d60f8a15c681e9d04d23c2f8f4'
PRODUCT_PARENT = '0a4091391e4c17c64683bd91f6a739a2a0a152fc'
PRODUCT_PARENT_TREE = 'a44489a4af8f1c5ef2ad735e9f7a2b7f49d5feb1'
SOURCE_SHA256 = 'b4084cfbb96d35e9d708dcad52b8c2de11f54d34f6e4abb73b91fe4d6089f538'
SOURCE_BYTES = 6352
WRAPPER_SHA256 = '0d1efabbff0040ceca9a6dd82f2d3b4d4801c34e6e3301b1e0b3f5b643bea47b'
WRAPPER_BYTES = 40387
QUALIFICATION_SHA256 = '483a7ede58e8f052a5ce4b85ed85d22a955783bafaaf333e574d8a1979b7b96c'
QUALIFICATION_BYTES = 6088
SOURCE_WORKFLOW_SHA256 = 'c508787106c9245605ed990b605deb05c806d1685ef50ce24b76e208a9619d1c'
REPAIRED_WORKFLOW_SHA256 = '8ee7ef9de15bb7cc2d7a8ce94d45451c98b524660b3f8620b06df859032d4f46'

SOURCE_MEMBERS = sorted([
    'RUNNER-OUTPUT.log',
    'RUNNER_EXIT_CODE',
    'SHA256SUMS',
    'adjudication.json',
    'artifact-manifest.json',
    'candidates.jsonl',
    'query-receipts.jsonl',
    'route-policy.json',
    'summary.json',
])
WRAPPER_MEMBERS = sorted([
    'SHA256SUMS',
    'execute.sh',
    'install.sh',
    'receipt.txt',
    'repaired-workflow.yml',
    'source-workflow.yml',
])
QUALIFICATION_MEMBERS = sorted([
    'SHA256SUMS',
    'qualification.json',
    'qualification.log',
    'source-SHA256SUMS',
    'source-adjudication.json',
    'source-artifact-manifest.json',
    'source-route-policy.json',
    'source-summary.json',
])


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical(value: Any) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + '\n').encode('utf-8')


def decode_jsonl(data: bytes) -> list[Any]:
    text = data.decode('utf-8')
    decoder = json.JSONDecoder()
    rows: list[Any] = []
    index = 0
    while True:
        while index < len(text) and text[index].isspace():
            index += 1
        if index == len(text):
            return rows
        row, index = decoder.raw_decode(text, index)
        rows.append(row)


def safe_zip_members(names: list[str]) -> None:
    assert len(names) == len(set(names))
    for name in names:
        assert name and '\\' not in name
        path = Path(name)
        assert not path.is_absolute()
        assert '..' not in path.parts
        assert not name.endswith('/')


def read_zip(root: Path, relative: Path, size: int, expected_digest: str, members: list[str]) -> dict[str, bytes]:
    path = root / relative
    data = path.read_bytes()
    assert len(data) == size
    assert digest(data) == expected_digest
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None
        names = archive.namelist()
        safe_zip_members(names)
        assert sorted(names) == members
        return {name: archive.read(name) for name in names}


def validate_sums(payload: dict[str, bytes], sums_name: str, expected_members: list[str], *, basenames: bool = False) -> None:
    rows = payload[sums_name].decode('utf-8').splitlines()
    assert len(rows) == len(expected_members)
    observed: list[str] = []
    for row in rows:
        expected, name = row.split('  ', 1)
        member = Path(name).name if basenames else name
        assert member in expected_members
        assert digest(payload[member]) == expected
        observed.append(member)
    assert sorted(observed) == sorted(expected_members)
    assert len(observed) == len(set(observed))


def terminal_result() -> dict[str, Any]:
    return {
        'fixed_queries': 3,
        'terminal_queries': 3,
        'terminal_query_states': {'bounded_public_search_controls_unavailable': 3},
        'browser_contexts_started': 1,
        'query_submissions': 0,
        'result_pages_visited': 0,
        'official_requests': 99,
        'same_host_json_responses': 9,
        'response_bytes_accounted': 2594925,
        'rendered_rows_inspected': 0,
        'blocked_off_host_requests': 3,
        'entity_detail_views': 0,
        'exact_name_rows_without_public_uei': 0,
        'retained_candidate_rows': 0,
        'unique_public_ueis': 0,
    }


def retention() -> dict[str, int]:
    return {
        'nonmatching_organization_names_retained': 0,
        'person_names_retained': 0,
        'addresses_or_location_values_retained': 0,
        'phone_fax_or_email_values_retained': 0,
        'points_of_contact_retained': 0,
        'officers_owners_principals_or_parent_entities_retained': 0,
        'financial_banking_eft_or_debt_information_retained': 0,
        'proceedings_exclusions_or_integrity_material_retained': 0,
        'complete_html_or_json_responses_retained': 0,
        'screenshots_retained': 0,
        'browser_profiles_cookies_credentials_or_tokens_retained': 0,
        'private_support_rows': 0,
    }


def source_authority() -> dict[str, Any]:
    return {
        'adoption_effect': 'none',
        'federal_award_or_funding_admissions': 0,
        'federal_registration_admissions': 0,
        'graph_effect': 'none',
        'identities_admitted': 0,
        'negative_existence_claims': 0,
        'operator_admissions': 0,
        'outside_human_dependency': False,
        'owner_admissions': 0,
        'publication_effect': 'none',
        'relationships_admitted': 0,
    }


def authority() -> dict[str, Any]:
    return {
        'promotes_to': 'no_candidate_promoted',
        'identities_admitted': 0,
        'relationships_admitted': 0,
        'negative_existence_claims': 0,
        'federal_registration_admissions': 0,
        'federal_award_or_funding_admissions': 0,
        'owner_admissions': 0,
        'operator_admissions': 0,
        'outside_human_dependency': False,
        'publication_effect': 'none',
        'adoption_effect': 'none',
        'graph_effect': 'none',
        'public_schoolhouse_legal_identity': 'unresolved',
    }


def expected_policy() -> dict[str, Any]:
    return {
        'authority': source_authority(),
        'bounds': {
            'account_creation_attempts': 0,
            'api_calls_using_api_key': 0,
            'captcha_or_waf_bypass_attempts': 0,
            'cookie_or_profile_export_or_replay_attempts': 0,
            'entity_detail_views': 0,
            'federal_role_or_cac_piv_attempts': 0,
            'fixed_entity_registration_submissions': 3,
            'fresh_anonymous_browser_contexts': 1,
            'login_attempts': 0,
            'maximum_query_phase_official_requests_per_query': 250,
            'maximum_query_phase_response_bytes_per_query': 67108864,
            'maximum_rendered_rows_per_query': 500,
            'maximum_rendered_rows_total': 1500,
            'maximum_result_pages_per_query': 5,
            'maximum_retained_candidates_total': 300,
            'outside_human_dependency': False,
            'parallel_workers': 1,
        },
        'candidate_rule': {
            'allowed_matched_fields': ['legal_business_name', 'dba_name', 'public_display_name'],
            'classification': 'sam_public_entity_registration_candidate',
            'identity_admission': False,
            'requires_exact_normalized_organization_name_key': 'schoolhouse',
            'requires_public_uei': True,
            'successor_exact_uei_adjudication_required': True,
        },
        'canonical_parent': SOURCE_PARENT,
        'canonical_parent_tree': SOURCE_PARENT_TREE,
        'issue': 1382,
        'official_surface': {
            'fixed_queries': [
                {'query_id': 'q1_school_dot_house', 'query_text': 'School.House'},
                {'query_id': 'q2_schoolhouse', 'query_text': 'Schoolhouse'},
                {'query_id': 'q3_school_house', 'query_text': 'School House'},
            ],
            'search_category': 'Entity Registrations',
            'target_normalized_key': 'schoolhouse',
            'url': 'https://sam.gov/entity-information',
        },
        'retention': {
            'browser_profiles_cookies_credentials_or_tokens': 0,
            'cities_states_countries_or_postal_codes': 0,
            'complete_html_or_json_responses': 0,
            'financial_banking_eft_or_debt_information': 0,
            'nonmatching_organization_names': 0,
            'officers_owners_principals_or_parent_entities': 0,
            'person_names': 0,
            'phone_fax_or_email_values': 0,
            'points_of_contact': 0,
            'private_support_material': 0,
            'proceedings_exclusions_or_integrity_material': 0,
            'screenshots': 0,
            'street_or_mailing_addresses': 0,
        },
        'schema_version': 'schoolhouse-sam-public-entity-registration-route-policy@1',
    }


def expected_summary() -> dict[str, Any]:
    return {
        'account_creation_attempts': 0,
        'addresses_or_location_values_retained': 0,
        'adoption_effect': 'none',
        'api_calls_using_api_key': 0,
        'blocked_off_host_requests': 3,
        'blocked_official_entity_detail_views': 0,
        'browser_contexts_started': 1,
        'browser_launch_error_class': None,
        'browser_profiles_cookies_credentials_or_tokens_retained': 0,
        'captcha_or_waf_bypass_attempts': 0,
        'complete_html_or_json_responses_retained': 0,
        'cookie_or_profile_export_or_replay_attempts': 0,
        'entity_detail_views': 0,
        'exact_name_rows_without_public_uei': 0,
        'federal_award_or_funding_admissions': 0,
        'federal_registration_admissions': 0,
        'federal_role_or_cac_piv_attempts': 0,
        'financial_banking_eft_or_debt_information_retained': 0,
        'fixed_queries': 3,
        'graph_effect': 'none',
        'identities_admitted': 0,
        'json_response_count': 9,
        'login_attempts': 0,
        'negative_existence_claims_created': 0,
        'nonmatching_organization_names_retained': 0,
        'officers_owners_principals_or_parent_entities_retained': 0,
        'official_request_count': 99,
        'operator_admissions': 0,
        'outside_human_dependency': False,
        'owner_admissions': 0,
        'person_names_retained': 0,
        'phone_fax_or_email_values_retained': 0,
        'points_of_contact_retained': 0,
        'private_support_rows': 0,
        'proceedings_exclusions_or_integrity_material_retained': 0,
        'public_schoolhouse_legal_identity': 'unresolved',
        'publication_effect': 'none',
        'query_submissions': 0,
        'relationships_admitted': 0,
        'rendered_rows_inspected': 0,
        'response_bytes_accounted': 2594925,
        'result_pages_visited': 0,
        'retained_candidate_rows': 0,
        'schema_version': 'schoolhouse-sam-public-entity-registration-census@1',
        'screenshots_retained': 0,
        'state': 'terminal_bounded_sam_public_entity_registration_candidate_census',
        'terminal_queries': 3,
        'terminal_query_state_counts': {'bounded_public_search_controls_unavailable': 3},
        'unique_public_ueis': 0,
    }


def expected_adjudication() -> dict[str, Any]:
    return {
        'adoption_effect': 'none',
        'candidate_rows': 0,
        'federal_award_or_funding_admitted': False,
        'federal_registration_admitted': False,
        'fiscal_sponsor_relationship_admitted': False,
        'governance_or_control_relationship_admitted': False,
        'graph_effect': 'none',
        'interpretation': {
            'candidate_requires_exact_uei_adjudication': True,
            'name_and_uei_candidate_is_not_target_identity': True,
            'opted_out_entities_are_outside_public_denominator': True,
            'public_search_unavailability_is_not_entity_absence': True,
            'sam_registration_display_is_not_federal_award': True,
            'zero_candidates_is_not_entity_absence': True,
        },
        'negative_existence_claim_created': False,
        'outside_human_dependency': False,
        'owner_or_operator_admitted': False,
        'promotes_to': 'no_candidate_promoted',
        'public_schoolhouse_identity_admitted': False,
        'public_schoolhouse_legal_identity': 'unresolved',
        'publication_effect': 'none',
        'related_party_relationship_admitted': False,
        'sam_entity_identity_admitted': False,
        'schema_version': 'schoolhouse-sam-public-entity-registration-adjudication@1',
        'state': 'terminal_bounded_sam_public_entity_registration_candidate_census',
    }


def expected_source_manifest() -> dict[str, Any]:
    return {
        'authority': source_authority(),
        'combined_sha256': '2074535603a4c415272aa197b7bd0b5563f4d3bfdf6cc47dbb500a84168115e2',
        'counts': {
            'candidate_rows': 0,
            'exact_name_rows_without_public_uei': 0,
            'query_receipts': 3,
            'unique_public_ueis': 0,
        },
        'files': [
            {'bytes': 1197, 'path': 'adjudication.json', 'sha256': 'b06a170dff159ac2e38989e10102c76e91ad724fd85da83757d57f53c220c098'},
            {'bytes': 0, 'path': 'candidates.jsonl', 'sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'},
            {'bytes': 5849, 'path': 'query-receipts.jsonl', 'sha256': '5f0c08d1344ab27a935905684094abcc945c636511a1df26d016179313ff6af9'},
            {'bytes': 2798, 'path': 'route-policy.json', 'sha256': 'e4591062e0fe831a8658b2c0cb8ccefe7903925c96dd9c27886a380e0cd8f31f'},
            {'bytes': 1955, 'path': 'summary.json', 'sha256': 'ff644f34bed20490c23e857ae5f58998b59206d3fece1ed63aed36825ae15af7'},
        ],
        'schema_version': 'schoolhouse-sam-public-entity-registration-artifact-manifest@1',
    }


def expected_qualification() -> dict[str, Any]:
    return {
        'authority': {
            **source_authority(),
            'public_schoolhouse_legal_identity': 'unresolved',
        },
        'privacy': retention(),
        'qualification': 'pass',
        'schema_version': 'schoolhouse-sam-public-entity-registration-census-qualification@1',
        'source': {
            'artifact_bytes': SOURCE_BYTES,
            'artifact_id': 9005696128,
            'artifact_sha256': SOURCE_SHA256,
            'head': '05a56dfd208380c5269c157d8726a85725b2a058',
            'pr': 1389,
            'program_exit_code': 0,
            'repaired_workflow_sha256': REPAIRED_WORKFLOW_SHA256,
            'source_requests_performed_by_qualifier': 0,
            'source_workflow_sha256': SOURCE_WORKFLOW_SHA256,
            'workflow_conclusion': 'failure',
            'workflow_run': 31208398663,
            'wrapper_artifact_bytes': WRAPPER_BYTES,
            'wrapper_artifact_id': 9005696502,
            'wrapper_artifact_sha256': WRAPPER_SHA256,
        },
        'terminal_result': {
            'browser_contexts_started': 1,
            'entity_detail_views': 0,
            'fixed_queries': 3,
            'official_requests': 99,
            'query_submissions': 0,
            'rendered_rows_inspected': 0,
            'response_bytes_accounted': 2594925,
            'retained_candidate_rows': 0,
            'terminal_queries': 3,
            'terminal_state_counts': {'bounded_public_search_controls_unavailable': 3},
            'unique_public_ueis': 0,
        },
        'validator_defect': {
            'class': 'context_insensitive_privacy_key_false_positive',
            'rejected_terminal_schema_key': 'state',
            'rejected_zero_retention_control_key': 'points_of_contact',
            'source_product_invalidated': False,
        },
    }


def custody() -> dict[str, Any]:
    return {
        'schema_version': 'schoolhouse-sam-public-entity-registration-census-custody@1',
        'state': 'terminal_bounded_sam_public_entity_registration_candidate_census',
        'issue': 1382,
        'product_parent_commit': PRODUCT_PARENT,
        'product_parent_tree': PRODUCT_PARENT_TREE,
        'source_canonical_parent_commit': SOURCE_PARENT,
        'source': {
            'pr': 1389,
            'head': '05a56dfd208380c5269c157d8726a85725b2a058',
            'workflow_run': 31208398663,
            'workflow_conclusion': 'failure',
            'program_exit_code': 0,
            'artifact_id': 9005696128,
            'artifact_name': 'schoolhouse-sam-public-entity-registration-census-v2',
            'artifact_bytes': SOURCE_BYTES,
            'artifact_digest': 'sha256:' + SOURCE_SHA256,
            'wrapper_artifact_id': 9005696502,
            'wrapper_artifact_name': 'schoolhouse-sam-public-entity-registration-census-v2-wrapper-receipt',
            'wrapper_artifact_bytes': WRAPPER_BYTES,
            'wrapper_artifact_digest': 'sha256:' + WRAPPER_SHA256,
            'release_check_run': 31208402677,
            'no_magic_human_run': 31208402452,
            'source_requests': 99,
        },
        'source_reconstruction': {
            'v1_carrier_pr': 1384,
            'v1_carrier_head': '61f69707e8425d2db62ded8631cf083e994757f4',
            'v1_workflow_path': '.github/workflows/temp-schoolhouse-sam-public-entity-registration-census-v1.yml',
            'v1_workflow_blob_sha1': '7447515d3010594d7be25719045fbee8585a6882',
            'v1_workflow_sha256': SOURCE_WORKFLOW_SHA256,
            'repaired_workflow_sha256': REPAIRED_WORKFLOW_SHA256,
            'scoping_replacements': 3,
            'embedded_python_programs_compiled': 2,
            'extracted_run_blocks': 2,
            'other_source_changes': 0,
        },
        'qualification': {
            'pr': 1390,
            'head': '642582f003af4d01474f35b0ad3a300d0733f2e5',
            'workflow_run': 31209050398,
            'workflow_conclusion': 'success',
            'artifact_id': 9006024017,
            'artifact_name': 'schoolhouse-sam-public-entity-registration-census-qualification-v1',
            'artifact_bytes': QUALIFICATION_BYTES,
            'artifact_digest': 'sha256:' + QUALIFICATION_SHA256,
            'release_check_run': 31209050912,
            'no_magic_human_run': 31209050486,
            'source_requests': 0,
        },
        'validator_defect': {
            'class': 'context_insensitive_privacy_key_false_positive',
            'source_program_completed': True,
            'source_program_exit_code': 0,
            'rejected_zero_retention_control_key': 'points_of_contact',
            'rejected_terminal_schema_key': 'state',
            'source_product_invalidated': False,
        },
        'terminal_result': terminal_result(),
        'retention': retention(),
        'authority': authority(),
        'interpretation': {
            'public_search_controls_unavailable_is_not_entity_absence': True,
            'zero_candidates_is_not_entity_absence': True,
            'name_and_public_uei_candidate_is_not_target_identity': True,
            'sam_registration_display_is_not_federal_award': True,
            'opted_out_entities_are_outside_public_denominator': True,
            'candidate_requires_exact_public_uei_adjudication': True,
            'generic_validator_false_positive_does_not_invalidate_source_custody': True,
            'identical_source_replay_authorized': False,
        },
    }


def manifest() -> dict[str, Any]:
    return {
        'schema_version': 'schoolhouse-sam-public-entity-registration-census-product-manifest@1',
        'permanent_paths': [str(path) for path in PATHS],
        'permanent_path_count': len(PATHS),
        'workflow_paths': 0,
        'sealed_source': {
            'path': str(SOURCE),
            'bytes': SOURCE_BYTES,
            'sha256': SOURCE_SHA256,
            'members': len(SOURCE_MEMBERS),
        },
        'sealed_wrapper_reconstruction': {
            'path': str(WRAPPER),
            'bytes': WRAPPER_BYTES,
            'sha256': WRAPPER_SHA256,
            'members': len(WRAPPER_MEMBERS),
        },
        'sealed_qualification': {
            'path': str(QUALIFICATION),
            'bytes': QUALIFICATION_BYTES,
            'sha256': QUALIFICATION_SHA256,
            'members': len(QUALIFICATION_MEMBERS),
        },
        'terminal_result': terminal_result(),
        'authority': authority(),
    }


def milestone() -> str:
    return f'''# School.House SAM.gov public entity-registration census

The bounded SAM.gov lane opened the anonymous public Entity Information surface for three fixed query texts: `School.House`, `Schoolhouse`, and `School House`. The interface exposed a query input but did not expose a selectable **Entity Registrations** category control in the fresh anonymous browser context. Each fixed route therefore terminated as `bounded_public_search_controls_unavailable` before a search submission.

```text
product parent: {PRODUCT_PARENT}
source PR / head: #1389 / 05a56dfd208380c5269c157d8726a85725b2a058
source workflow run / artifact: 31208398663 / 9005696128
source artifact SHA-256: {SOURCE_SHA256}
wrapper reconstruction artifact: 9005696502
wrapper artifact SHA-256: {WRAPPER_SHA256}
qualification PR / head: #1390 / 642582f003af4d01474f35b0ad3a300d0733f2e5
qualification workflow run / artifact: 31209050398 / 9006024017
qualification artifact SHA-256: {QUALIFICATION_SHA256}
fixed / terminal queries: 3 / 3
terminal state: bounded_public_search_controls_unavailable (3)
query submissions / result pages: 0 / 0
official requests / same-host JSON responses: 99 / 9
response bytes accounted: 2,594,925
rendered rows / candidate rows / public UEIs: 0 / 0 / 0
entity-detail views: 0
identity / relationship admissions: 0 / 0
federal-registration / award admissions: 0 / 0
owner / operator admissions: 0 / 0
negative-existence claims: 0
outside-human dependency: false
publication / adoption / graph: none / none / none
public School.House legal identity: unresolved
```

The source program itself completed with exit code `0`. Its hosted workflow was red only because a context-insensitive post-generation privacy walker rejected the product's required `state` schema key and the zero-retention control key `points_of_contact`. Independent request-free qualification authenticated the exact source and wrapper ZIPs, every internal checksum, exact schema allowlists, all three terminal receipts, zero retention counters, the empty candidate set, and the authority ceiling. The qualifier, complete repository release gate, and no-magic-human gate all passed on the exact qualifier head.

Search-control unavailability is a typed provider/interface boundary. It is not evidence that no SAM.gov registration, legal entity, federal award, owner, operator, or related organization exists. Zero retained candidates is likewise not an absence finding. No identical replay is authorized absent a material interface, provider, denominator, or canonical-predecessor change.
'''


def validate_source(payload: dict[str, bytes]) -> dict[str, Any]:
    assert payload['RUNNER_EXIT_CODE'] == b'0\n'
    validate_sums(
        payload,
        'SHA256SUMS',
        [
            'RUNNER_EXIT_CODE',
            'adjudication.json',
            'artifact-manifest.json',
            'candidates.jsonl',
            'query-receipts.jsonl',
            'route-policy.json',
            'summary.json',
        ],
    )
    policy = json.loads(payload['route-policy.json'])
    summary = json.loads(payload['summary.json'])
    adjudication = json.loads(payload['adjudication.json'])
    source_manifest = json.loads(payload['artifact-manifest.json'])
    candidates = decode_jsonl(payload['candidates.jsonl'])
    receipts = decode_jsonl(payload['query-receipts.jsonl'])

    assert policy == expected_policy()
    assert summary == expected_summary()
    assert adjudication == expected_adjudication()
    assert source_manifest == expected_source_manifest()
    assert candidates == []

    combined = hashlib.sha256()
    for row in source_manifest['files']:
        assert len(payload[row['path']]) == row['bytes']
        assert digest(payload[row['path']]) == row['sha256']
        combined.update(f"{row['sha256']}  {row['path']}\n".encode())
    assert combined.hexdigest() == source_manifest['combined_sha256']

    expected_queries = [
        ('q1_school_dot_house', 'School.House', '2026-08-07T18:46:25+00:00'),
        ('q2_schoolhouse', 'Schoolhouse', '2026-08-07T18:46:30+00:00'),
        ('q3_school_house', 'School House', '2026-08-07T18:46:34+00:00'),
    ]
    assert len(receipts) == 3
    expected_hashes = [
        {
            'bytes': 726,
            'sha256': '1a05a5e0e87d7cb446cbef04acd0ad172b2e29d3233c2c36263f11e8ff0c6108',
            'status': 200,
            'url_sha256': '178ce946294482f84143a13583a2e89f22aad59805858f0ae142f8e731cf741d',
        },
        {
            'bytes': 22234,
            'sha256': '4f52f1f5108f85e0bdd944f3c808b2281eb8ab303d1f118bcdfb155fcf4a0d53',
            'status': 200,
            'url_sha256': '66931ef61d13a137e26b164e61ce2c95d1188becc58fc273c05ab00c72b71472',
        },
        {
            'bytes': 726,
            'sha256': '1a05a5e0e87d7cb446cbef04acd0ad172b2e29d3233c2c36263f11e8ff0c6108',
            'status': 200,
            'url_sha256': '178ce946294482f84143a13583a2e89f22aad59805858f0ae142f8e731cf741d',
        },
    ]
    allowed_keys = {
        'account_creation_attempts', 'adoption_effect', 'api_key_requests',
        'blocked_entity_detail_views', 'blocked_off_host_hashes',
        'blocked_off_host_requests', 'body_text_bytes_hashed',
        'body_text_sha256_by_page', 'candidate_rows_observed',
        'captcha_or_waf_bypass_attempts', 'category_control_selected',
        'challenge_detected', 'cookie_or_profile_export_or_replay_attempts',
        'error_class', 'exact_name_rows_without_public_uei',
        'federal_role_or_cac_piv_attempts', 'final_url', 'graph_effect',
        'json_parse_error_count', 'json_response_bytes', 'json_response_count',
        'json_response_hashes', 'login_attempts', 'observed_at',
        'official_request_count', 'outside_human_dependency', 'page_title',
        'pages_visited', 'publication_effect', 'query_id', 'query_index',
        'query_input_found', 'query_submitted', 'query_text',
        'rendered_rows_inspected', 'response_bytes_accounted',
        'response_inspection_error_count', 'schema_version', 'search_category',
        'surface_url', 'terminal_state',
    }
    observed_times = []
    for index, row in enumerate(receipts):
        query_id, query_text, observed_at = expected_queries[index]
        assert set(row) == allowed_keys
        assert row['schema_version'] == 'schoolhouse-sam-public-entity-registration-query-receipt@1'
        assert row['query_index'] == index
        assert row['query_id'] == query_id
        assert row['query_text'] == query_text
        assert row['observed_at'] == observed_at
        observed_times.append(datetime.fromisoformat(observed_at))
        assert row['surface_url'] == row['final_url'] == 'https://sam.gov/entity-information'
        assert row['page_title'] == 'Entity Information | SAM.gov'
        assert row['search_category'] == 'Entity Registrations'
        assert row['query_input_found'] is True
        assert row['category_control_selected'] is False
        assert row['query_submitted'] is False
        assert row['terminal_state'] == 'bounded_public_search_controls_unavailable'
        assert row['error_class'] is None
        assert row['challenge_detected'] is False
        assert row['pages_visited'] == row['rendered_rows_inspected'] == 0
        assert row['body_text_bytes_hashed'] == 0
        assert row['body_text_sha256_by_page'] == []
        assert row['candidate_rows_observed'] == 0
        assert row['exact_name_rows_without_public_uei'] == 0
        assert row['official_request_count'] == 33
        assert row['response_bytes_accounted'] == 864975
        assert row['json_response_count'] == 3
        assert row['json_response_bytes'] == 23686
        assert row['json_parse_error_count'] == 0
        assert row['response_inspection_error_count'] == 0
        assert row['json_response_hashes'] == expected_hashes
        assert row['blocked_off_host_requests'] == 1
        assert row['blocked_off_host_hashes'] == ['a599aeb3c7c1dfa552a765a01f7f0a2ab9346a1eccadefd6bf7d0977b5eee259']
        assert row['blocked_entity_detail_views'] == 0
        for key in (
            'account_creation_attempts', 'api_key_requests', 'login_attempts',
            'federal_role_or_cac_piv_attempts', 'captcha_or_waf_bypass_attempts',
            'cookie_or_profile_export_or_replay_attempts',
        ):
            assert row[key] == 0
        assert row['outside_human_dependency'] is False
        assert [row[key] for key in ('publication_effect', 'adoption_effect', 'graph_effect')] == ['none', 'none', 'none']
    assert observed_times == sorted(observed_times)

    return {
        'policy': policy,
        'summary': summary,
        'adjudication': adjudication,
        'manifest': source_manifest,
        'receipts': receipts,
        'candidates': candidates,
    }


def validate_wrapper(payload: dict[str, bytes]) -> None:
    validate_sums(
        payload,
        'SHA256SUMS',
        ['source-workflow.yml', 'repaired-workflow.yml', 'install.sh', 'execute.sh', 'receipt.txt'],
        basenames=True,
    )
    assert digest(payload['source-workflow.yml']) == SOURCE_WORKFLOW_SHA256
    assert digest(payload['repaired-workflow.yml']) == REPAIRED_WORKFLOW_SHA256
    assert digest(payload['install.sh']) == '18dcc42394a4b1e89b1912a501c60a4007e43d66cc30ba889028db154b63e982'
    assert digest(payload['execute.sh']) == 'a645eec06e9a3bc17543b2d5024093ae4f690c48338378082833d4fd5c7ee1e1'
    assert digest(payload['receipt.txt']) == '595c8800ca0e6adb5bfd7d1d78bb6dc77449ef088965aea7dcd69a192518fa64'

    receipt = dict(
        line.split('=', 1)
        for line in payload['receipt.txt'].decode('utf-8').splitlines()
    )
    assert receipt == {
        'source_branch': 'agent/schoolhouse-sam-public-entity-registration-census-v1',
        'source_head': '61f69707e8425d2db62ded8631cf083e994757f4',
        'source_path': '.github/workflows/temp-schoolhouse-sam-public-entity-registration-census-v1.yml',
        'source_blob': '7447515d3010594d7be25719045fbee8585a6882',
        'source_sha256': SOURCE_WORKFLOW_SHA256,
        'repaired_sha256': REPAIRED_WORKFLOW_SHA256,
        'scoping_replacements': '3',
        'embedded_python_programs': '2',
        'extracted_run_blocks': '2',
    }

    source = payload['source-workflow.yml'].decode('utf-8')
    repaired = payload['repaired-workflow.yml'].decode('utf-8')
    assert source.count('schoolhouse-sam-public-entity-registration-census-v1') == 7
    assert source.count('nonlocal global_rows_inspected') == 2
    assert source.count('nonlocal blocked_official_detail_views') == 1
    assert source.count('nonlocal ') == 3
    expected = source.replace(
        'schoolhouse-sam-public-entity-registration-census-v1',
        'schoolhouse-sam-public-entity-registration-census-v2',
    ).replace(
        'nonlocal global_rows_inspected',
        'global global_rows_inspected',
    ).replace(
        'nonlocal blocked_official_detail_views',
        'global blocked_official_detail_views',
    )
    assert repaired == expected
    assert 'nonlocal ' not in repaired
    assert repaired.count('global global_rows_inspected') == 2
    assert repaired.count('global blocked_official_detail_views') == 1


def validate_qualification(payload: dict[str, bytes], source_payload: dict[str, bytes]) -> None:
    validate_sums(
        payload,
        'SHA256SUMS',
        [
            'qualification.json', 'qualification.log', 'source-SHA256SUMS',
            'source-adjudication.json', 'source-artifact-manifest.json',
            'source-route-policy.json', 'source-summary.json',
        ],
    )
    assert json.loads(payload['qualification.json']) == expected_qualification()
    assert payload['qualification.log'] == (
        b'schoolhouse_sam_public_entity_registration_census_qualification=pass\n'
        b'source_program_exit_code=0\n'
        b'terminal_queries=3\n'
        b'terminal_state=bounded_public_search_controls_unavailable\n'
        b'retained_candidate_rows=0\n'
        b'source_requests_performed_by_qualifier=0\n'
    )
    assert payload['source-SHA256SUMS'] == source_payload['SHA256SUMS']
    assert payload['source-adjudication.json'] == source_payload['adjudication.json']
    assert payload['source-artifact-manifest.json'] == source_payload['artifact-manifest.json']
    assert payload['source-route-policy.json'] == source_payload['route-policy.json']
    assert payload['source-summary.json'] == source_payload['summary.json']


def product_surface_paths(root: Path) -> list[str]:
    observed: list[str] = []
    data_root = root / DATA
    if data_root.exists():
        observed.extend(
            str(path.relative_to(root))
            for path in data_root.rglob('*')
            if path.is_file()
        )
    for relative in (DOC, TOOL):
        path = root / relative
        if path.is_file():
            observed.append(str(relative))
    return sorted(observed)


def validate_product(root: Path) -> None:
    observed_paths = product_surface_paths(root)
    expected_paths = sorted(str(path) for path in PATHS)
    assert observed_paths == expected_paths
    assert all(not path.startswith('.github/workflows/') for path in observed_paths)

    source_payload = read_zip(root, SOURCE, SOURCE_BYTES, SOURCE_SHA256, SOURCE_MEMBERS)
    wrapper_payload = read_zip(root, WRAPPER, WRAPPER_BYTES, WRAPPER_SHA256, WRAPPER_MEMBERS)
    qualification_payload = read_zip(
        root,
        QUALIFICATION,
        QUALIFICATION_BYTES,
        QUALIFICATION_SHA256,
        QUALIFICATION_MEMBERS,
    )

    validate_source(source_payload)
    validate_wrapper(wrapper_payload)
    validate_qualification(qualification_payload, source_payload)

    assert (root / CUSTODY).read_bytes() == canonical(custody())
    assert (root / MANIFEST).read_bytes() == canonical(manifest())
    assert (root / DOC).read_text(encoding='utf-8') == milestone()
    tool = root / TOOL
    assert tool.is_file()
    assert tool.read_text(encoding='utf-8').startswith('#!/usr/bin/env python3\n')


def copy_product(source_root: Path, target_root: Path) -> None:
    for relative in PATHS:
        source = source_root / relative
        target = target_root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def mutate_json(path: Path, operation: Callable[[dict[str, Any]], None]) -> None:
    value = json.loads(path.read_text())
    operation(value)
    path.write_bytes(canonical(value))


def self_test(root: Path) -> None:
    with tempfile.TemporaryDirectory(prefix='schoolhouse-sam-composable-') as directory:
        work = Path(directory)
        copy_product(root, work)
        unrelated = work / 'unrelated/repository-file.txt'
        unrelated.parent.mkdir(parents=True, exist_ok=True)
        unrelated.write_text('unrelated repository content\n')
        validate_product(work)
    print('schoolhouse_sam_repository_composability=pass')

    mutations: list[tuple[str, Callable[[Path], None]]] = [
        ('source_zip_byte', lambda work: (work / SOURCE).write_bytes((work / SOURCE).read_bytes()[:-1] + bytes([(work / SOURCE).read_bytes()[-1] ^ 1]))),
        ('wrapper_zip_byte', lambda work: (work / WRAPPER).write_bytes((work / WRAPPER).read_bytes()[:-1] + bytes([(work / WRAPPER).read_bytes()[-1] ^ 1]))),
        ('qualification_zip_byte', lambda work: (work / QUALIFICATION).write_bytes((work / QUALIFICATION).read_bytes()[:-1] + bytes([(work / QUALIFICATION).read_bytes()[-1] ^ 1]))),
        ('custody_parent', lambda work: mutate_json(work / CUSTODY, lambda value: value.__setitem__('product_parent_commit', '0' * 40))),
        ('custody_authority', lambda work: mutate_json(work / CUSTODY, lambda value: value['authority'].__setitem__('identities_admitted', 1))),
        ('custody_candidates', lambda work: mutate_json(work / CUSTODY, lambda value: value['terminal_result'].__setitem__('retained_candidate_rows', 1))),
        ('manifest_workflow', lambda work: mutate_json(work / MANIFEST, lambda value: value.__setitem__('workflow_paths', 1))),
        ('manifest_path_count', lambda work: mutate_json(work / MANIFEST, lambda value: value.__setitem__('permanent_path_count', 6))),
        ('milestone_append', lambda work: (work / DOC).write_text((work / DOC).read_text() + '\nmutated\n')),
        ('missing_wrapper', lambda work: (work / WRAPPER).unlink()),
    ]

    refused = 0
    for name, mutate in mutations:
        with tempfile.TemporaryDirectory(prefix=f'schoolhouse-sam-{name}-') as directory:
            work = Path(directory)
            copy_product(root, work)
            mutate(work)
            try:
                validate_product(work)
            except Exception:
                refused += 1
            else:
                raise AssertionError(f'adversarial mutation accepted: {name}')
    assert refused == len(mutations)
    print(f'schoolhouse_sam_census_adversarial_refusals={refused}')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path('.'))
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()

    root = args.root.resolve()
    validate_product(root)
    print('schoolhouse_sam_public_entity_registration_census_custody=pass')
    print('fixed_queries=3')
    print('terminal_queries=3')
    print('terminal_state=bounded_public_search_controls_unavailable')
    print('retained_candidate_rows=0')
    print('public_schoolhouse_legal_identity=unresolved')
    if args.self_test:
        self_test(root)


if __name__ == '__main__':
    main()
