#!/usr/bin/env python3
import copy
import hashlib
import io
import json
import pathlib
import re
import sys
import zipfile

FILES = {
    'sources.zip',
    'manifest.json',
    'assessment.json',
    'review.md',
    'verify.py',
    'SHA256SUMS',
}
SOURCE_INPUT_BINDINGS = (
    (
        'adjudication_summary_path',
        'adjudication_summary_sha256',
        'data/intake/natsec100-pathways/chunk1/roster-2025-identity-adjudication.json',
        'inputs/adjudication-summary.json',
    ),
    (
        'adjudication_rows_path',
        'adjudication_rows_sha256',
        'data/intake/natsec100-pathways/chunk1/roster-2025-identity-adjudication.jsonl',
        'inputs/adjudication-rows.jsonl',
    ),
    (
        'recovery_summary_path',
        'recovery_summary_sha256',
        'data/intake/natsec100-pathways/chunk1/roster-2025-official-visual-recovery.json',
        'inputs/recovery-summary.json',
    ),
    (
        'recovery_rows_path',
        'recovery_rows_sha256',
        'data/intake/natsec100-pathways/chunk1/roster-2025-official-visual-recovery.jsonl',
        'inputs/recovery-rows.jsonl',
    ),
)
HEX64 = re.compile(r'^[0-9a-f]{64}$')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def require(ok, message):
    if not ok:
        raise ValueError(message)


def normhost(value):
    return value.strip().lower().rstrip('.').removeprefix('www.')


def json_bytes(value):
    return (json.dumps(value, indent=2, sort_keys=True) + '\n').encode()


def capture_manifest_digest(entries):
    require(isinstance(entries, list) and entries, 'capture manifest entries missing')
    seen = set()
    material = []
    for row in entries:
        require(isinstance(row, dict), 'capture manifest entry malformed')
        name = row.get('path')
        digest = row.get('sha256')
        size = row.get('bytes')
        require(isinstance(name, str) and name and not name.startswith('/'), 'capture manifest path malformed')
        require('..' not in pathlib.PurePosixPath(name).parts, 'capture manifest path escapes root')
        require(name not in seen, 'capture manifest path duplicated')
        require(isinstance(digest, str) and HEX64.fullmatch(digest), 'capture manifest digest malformed')
        require(isinstance(size, int) and size >= 0, 'capture manifest byte count malformed')
        seen.add(name)
        material.append(f'{digest}  {name}\n')
    return sha(''.join(material).encode())


def check(manifest, assessment, archive, repo_inputs=None):
    require(
        manifest['schema_version'] == 'natsec100-2025-identity-source-custody@1',
        'manifest schema drift',
    )
    require(
        manifest['object_class'] == 'bounded_source_custody_without_case_receipt_or_identity_promotion',
        'object class drift',
    )
    d = manifest['denominator']
    require(
        d['official_2025_roster_rows'] == 100
        and d['deterministic_existing_registry_matches'] == 77,
        'source denominator drift',
    )
    require(
        d['adjudicated_identity_candidates'] == 23
        and d['evidence_routes'] == 26
        and d['unique_requested_urls'] == 26,
        'route denominator drift',
    )
    require(
        d['unique_final_hosts'] == 24
        and d['terminal_http_200_routes'] == 26
        and d['tls_verified_routes'] == 26,
        'transport denominator drift',
    )
    require(
        d['identity_content_coding_routes'] == 26
        and d['textual_content_routes'] == 26
        and d['redirected_routes'] == 1,
        'content denominator drift',
    )
    require(
        d['server_cookie_values_redacted'] == 14
        and d['captured_body_bytes'] == 8754182,
        'byte or redaction denominator drift',
    )
    require(
        d['case_receipts_admitted'] == 0 and d['identity_rows_promoted'] == 0,
        'admission denominator drift',
    )

    result = manifest['result']
    for key in (
        'source_custody_complete_for_all_adjudication_evidence',
        'all_routes_http_200',
        'all_final_hosts_within_declared_boundaries',
        'all_content_codings_identity_or_absent',
        'all_curl_tls_verification_results_zero',
        'all_final_hosts_have_verified_leaf_capture',
        'all_declared_support_markers_present',
    ):
        require(result[key] is True, 'custody result drift: ' + key)
    require(
        result['aetherflux_redirect_chain']
        == ['https://cowboyspace.com', 'https://www.cowboyspace.com/'],
        'redirect-chain drift',
    )
    require(
        result['legal_entity_successions_established'] == 0
        and result['case_receipt_admission'] == 'none'
        and result['identity_promotion'] == 'none',
        'identity authority drift',
    )
    for key in ('company_registry_effect', 'company_year_effect', 'graph_effect', 'actor_hop_effect'):
        require(result[key] == 'none', 'scope broadened: ' + key)

    redaction = manifest['redaction']
    require(
        redaction['source_bodies_changed'] is False
        and redaction['public_header_copies_changed'] is True,
        'redaction boundary drift',
    )
    require(
        redaction['redacted_header'] == 'Set-Cookie'
        and redaction['original_header_hashes_retained'] is True,
        'redaction declaration drift',
    )

    source_inputs = manifest['source_inputs']
    embedded_inputs = {}
    for path_key, digest_key, expected_path, archive_member in SOURCE_INPUT_BINDINGS:
        require(source_inputs[path_key] == expected_path, 'source input path drift: ' + path_key)
        data = archive[archive_member]
        require(sha(data) == source_inputs[digest_key], 'embedded source input digest drift: ' + archive_member)
        embedded_inputs[expected_path] = data
        if repo_inputs is not None:
            require(expected_path in repo_inputs, 'current repository input missing: ' + expected_path)
            require(data == repo_inputs[expected_path], 'current repository input diverges: ' + expected_path)

    capture_plan_bytes = archive['inputs/capture-plan.json']
    capture_manifest_bytes = archive['inputs/capture-manifest.json']
    require(
        sha(capture_plan_bytes) == source_inputs['capture_plan_sha256'],
        'capture plan digest drift',
    )
    require(
        sha(capture_manifest_bytes) == source_inputs['capture_manifest_sha256'],
        'capture manifest file digest drift',
    )
    capture_plan = json.loads(capture_plan_bytes)
    capture_manifest = json.loads(capture_manifest_bytes)
    require(
        capture_manifest_digest(capture_manifest['entries'])
        == capture_manifest['combined_sha256']
        == source_inputs['capture_manifest_combined_sha256'],
        'capture manifest combined digest drift',
    )
    capture_entries = {row['path']: row for row in capture_manifest['entries']}
    require(len(capture_entries) == len(capture_manifest['entries']), 'capture manifest duplicate path')
    require(
        capture_plan['base_commit'] == manifest['base_commit']
        and capture_plan['base_tree'] == manifest['base_tree'],
        'capture-plan Git lease drift',
    )
    require(
        capture_plan['evidence_routes'] == 26
        and len(capture_plan['routes']) == 26,
        'capture-plan route denominator drift',
    )
    require(
        capture_plan['boundaries']
        == {
            'actor_hop_effect': 'none',
            'company_registry_effect': 'none',
            'company_year_effect': 'none',
            'graph_effect': 'none',
            'identity_promotion': False,
            'source_receipt_admission': False,
        },
        'capture-plan authority drift',
    )
    plan_by_route = {row['route_id']: row for row in capture_plan['routes']}
    require(len(plan_by_route) == 26, 'capture-plan route identity drift')

    sources = manifest['sources']
    require(
        len(sources) == 26
        and len({row['route_id'] for row in sources}) == 26
        and len({row['requested_url'] for row in sources}) == 26,
        'source identity drift',
    )
    require(sum(row['body_bytes'] for row in sources) == d['captured_body_bytes'], 'source body byte sum drift')
    require(
        sum(row['server_cookie_redactions'] for row in sources)
        == d['server_cookie_values_redacted'],
        'cookie redaction sum drift',
    )
    require(
        len({normhost(row['final_host']) for row in sources}) == d['unique_final_hosts'],
        'final-host denominator drift',
    )

    expected = {
        'inputs/adjudication-summary.json',
        'inputs/adjudication-rows.jsonl',
        'inputs/recovery-summary.json',
        'inputs/recovery-rows.jsonl',
        'inputs/capture-plan.json',
        'inputs/capture-manifest.json',
    }
    expected.update(row['body_member'] for row in sources)
    expected.update(row['headers_member'] for row in sources)
    expected.update(row['transport_member'] for row in sources)
    expected.update(f"sources/{row['route_id']}.route.json" for row in sources)
    expected.update(row['tls_leaf_member'] for row in sources)
    require(set(archive) == expected, 'archive member denominator drift')

    adjudication_summary = json.loads(archive['inputs/adjudication-summary.json'])
    recovery_summary = json.loads(archive['inputs/recovery-summary.json'])
    adjudication = [
        json.loads(line)
        for line in archive['inputs/adjudication-rows.jsonl'].decode().splitlines()
        if line
    ]
    recovery = [
        json.loads(line)
        for line in archive['inputs/recovery-rows.jsonl'].decode().splitlines()
        if line
    ]
    require(
        adjudication_summary['denominator']['unresolved_source_rows'] == 23
        and recovery_summary['denominator']['expected_rows'] == 100,
        'embedded summary denominator drift',
    )
    require(len(adjudication) == 23 and len(recovery) == 100, 'embedded input denominator drift')
    by_rank = {row['source']['rank']: row for row in adjudication}
    require(len(by_rank) == 23, 'embedded adjudication rank identity drift')

    route_assessments = {row['route_id']: row for row in assessment['route_results']}
    rank_assessments = {row['rank']: row for row in assessment['rank_results']}
    require(
        len(route_assessments) == 26 and len(rank_assessments) == 23,
        'assessment denominator drift',
    )

    for source in sources:
        route_id = source['route_id']
        rank = source['rank']
        ordinal = source['evidence_ordinal']
        row = by_rank.get(rank)
        require(row is not None, 'source rank absent from adjudication')
        evidence = row['evidence'][ordinal - 1]
        require(
            source['requested_url'] == evidence['url']
            and source['source_class'] == evidence['source_class'],
            'source binding drift',
        )

        route_member = f'sources/{route_id}.route.json'
        route_bytes = archive[route_member]
        route = json.loads(route_bytes)
        require(route == plan_by_route.get(route_id), 'retained route diverges from capture plan')
        require(
            route['rank'] == rank
            and route['evidence_ordinal'] == ordinal
            and route['requested_url'] == source['requested_url'],
            'route input drift',
        )

        body = archive[source['body_member']]
        headers = archive[source['headers_member']]
        transport = json.loads(archive[source['transport_member']])
        require(
            len(body) == source['body_bytes']
            and sha(body) == source['body_sha256'] == transport['body_sha256'],
            'body custody drift',
        )
        require(
            sha(headers) == source['headers_sha256'] == transport['public_headers_sha256'],
            'public header custody drift',
        )
        require(
            transport['original_headers_sha256'] == source['original_headers_sha256'],
            'original header hash drift',
        )

        attempt = transport['attempt']
        body_capture = capture_entries[f'routes/{route_id}/attempt-{attempt}.body']
        header_capture = capture_entries[f'routes/{route_id}/attempt-{attempt}.headers']
        route_capture = capture_entries[f'routes/{route_id}/route.json']
        require(
            body_capture['sha256'] == source['body_sha256']
            and body_capture['bytes'] == source['body_bytes'],
            'retained body diverges from capture manifest',
        )
        require(
            header_capture['sha256'] == source['original_headers_sha256']
            and header_capture['bytes'] == transport['original_headers_bytes'],
            'original headers diverge from capture manifest',
        )
        require(
            route_capture['sha256'] == sha(route_bytes)
            and route_capture['bytes'] == len(route_bytes),
            'retained route diverges from capture manifest',
        )

        cookie_lines = [
            line
            for line in headers.decode('latin-1').splitlines()
            if line.lower().startswith('set-cookie:')
        ]
        require(
            len(cookie_lines)
            == source['server_cookie_redactions']
            == len(transport['server_cookie_redactions']),
            'cookie redaction count drift',
        )
        require(
            all(
                re.fullmatch(
                    r'Set-Cookie: \[redacted server-issued cookie; sha256=[0-9a-f]{64}\]',
                    line,
                    re.I,
                )
                for line in cookie_lines
            ),
            'cookie value leaked or marker malformed',
        )
        require(
            transport['curl_exit'] == 0
            and transport['curl_stderr'] == ''
            and transport['http_status'] == 200,
            'transport failure admitted',
        )
        require(
            transport['ssl_verify_result'] == 0
            and transport['final_host_allowed'] is True
            and transport['tls_capture_exit'] == 0,
            'TLS or host boundary drift',
        )
        require(
            normhost(transport['final_host'])
            in {normhost(value) for value in transport['allowed_final_hosts']},
            'final host outside boundary',
        )
        require(
            transport['content_encoding'].lower() in ('', 'identity')
            and transport['terminal_state'] == 'content_retrieved_textual',
            'content state drift',
        )
        require(
            transport['challenge_terms'] == [] and transport['attempt_count'] == 1,
            'challenge or retry denominator drift',
        )
        cert = archive[source['tls_leaf_member']]
        require(
            sha(cert) == source['tls_leaf_sha256'] == transport['tls_leaf_sha256'],
            'TLS leaf custody drift',
        )
        route_assessment = route_assessments[route_id]
        require(
            route_assessment['supports'] == evidence['supports']
            and route_assessment['source_class'] == evidence['source_class'],
            'semantic source binding drift',
        )
        lower = body.lower()
        for literal in route_assessment['required_case_insensitive_literals']:
            require(
                literal.encode().lower() in lower,
                f'missing support marker for {route_id}: {literal}',
            )

    redirected = [
        json.loads(archive[row['transport_member']])
        for row in sources
        if row['redirect_count'] > 0
    ]
    require(
        len(redirected) == 1 and redirected[0]['route_id'] == 'rank-054-evidence-01',
        'redirect route drift',
    )
    locations = [row['location'] for row in redirected[0]['redirect_chain'] if row['location']]
    require(locations == result['aetherflux_redirect_chain'], 'Aetherflux redirect locations drift')

    for row in rank_assessments.values():
        require(
            row['source_custody_complete'] is True
            and row['receipt_admission_state']
            == 'custodied_source_candidate_not_admitted_to_case_receipt_ledger',
            'rank custody or admission drift',
        )
        require(
            row['promotion_state'] == 'not_promoted' and row['graph_effect'] == 'none',
            'rank promotion drift',
        )
    require(
        assessment['counts']
        == {
            'exact_brand_domain_candidates_supported_at_custody_tier': 19,
            'existing_alias_website_updates_supported_at_custody_tier': 2,
            'successor_brand_candidates_supported_at_brand_domain_continuity_tier': 2,
            'legal_entity_successions_established': 0,
            'case_receipts_admitted': 0,
            'identity_rows_promoted': 0,
        },
        'assessment counts drift',
    )
    for key, value in assessment['boundaries'].items():
        if key.endswith('_effect'):
            require(value == 'none', 'assessment effect broadened: ' + key)
        else:
            require(value is False, 'assessment inference boundary broadened: ' + key)


def main():
    root = pathlib.Path(__file__).resolve().parent
    require({path.name for path in root.iterdir()} == FILES, 'packet file denominator drift')
    require(
        all((root / name).is_file() and not (root / name).is_symlink() for name in FILES),
        'packet member is not a regular file',
    )

    listed = {}
    for line in (root / 'SHA256SUMS').read_text().splitlines():
        digest, name = line.split('  ', 1)
        require(name not in listed and name in FILES and name != 'SHA256SUMS', 'invalid checksum row')
        require(HEX64.fullmatch(digest), 'packet checksum malformed')
        listed[name] = digest
    require(set(listed) == FILES - {'SHA256SUMS'}, 'checksum denominator drift')
    for name, digest in listed.items():
        require(sha((root / name).read_bytes()) == digest, 'file checksum mismatch: ' + name)

    manifest = json.loads((root / 'manifest.json').read_bytes())
    assessment_bytes = (root / 'assessment.json').read_bytes()
    assessment = json.loads(assessment_bytes)
    require(sha(assessment_bytes) == manifest['assessment']['sha256'], 'assessment digest drift')

    archive_bytes = (root / 'sources.zip').read_bytes()
    require(
        len(archive_bytes) == manifest['archive']['bytes']
        and sha(archive_bytes) == manifest['archive']['sha256'],
        'archive binding drift',
    )
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as zf:
        require(
            zf.testzip() is None and len(zf.infolist()) == manifest['archive']['members'],
            'ZIP integrity or count failure',
        )
        require(
            len(set(zf.namelist())) == len(zf.namelist())
            and all(
                not name.startswith('/') and '..' not in pathlib.PurePosixPath(name).parts
                for name in zf.namelist()
            ),
            'unsafe ZIP member',
        )
        archive = {name: zf.read(name) for name in zf.namelist()}

    repo_root = root.parents[1]
    repo_inputs = {}
    for _, _, expected_path, _ in SOURCE_INPUT_BINDINGS:
        candidate = repo_root / expected_path
        require(candidate.is_file() and not candidate.is_symlink(), 'repository input is not a regular file')
        require(candidate.resolve().is_relative_to(repo_root.resolve()), 'repository input escapes root')
        repo_inputs[expected_path] = candidate.read_bytes()

    check(manifest, assessment, archive, repo_inputs)

    negative = 0
    if '--self-test' in sys.argv:
        cases = []

        mutated_manifest = copy.deepcopy(manifest)
        mutated_manifest['denominator']['case_receipts_admitted'] = 1
        cases.append((mutated_manifest, assessment, archive, repo_inputs))

        mutated_manifest = copy.deepcopy(manifest)
        mutated_manifest['result']['identity_promotion'] = 'promoted'
        cases.append((mutated_manifest, assessment, archive, repo_inputs))

        mutated_assessment = copy.deepcopy(assessment)
        mutated_assessment['counts']['legal_entity_successions_established'] = 2
        cases.append((manifest, mutated_assessment, archive, repo_inputs))

        mutated_archive = copy.deepcopy(archive)
        key = manifest['sources'][0]['body_member']
        mutated_archive[key] += b' '
        cases.append((manifest, assessment, mutated_archive, repo_inputs))

        mutated_archive = copy.deepcopy(archive)
        key = manifest['sources'][0]['headers_member']
        mutated_archive[key] += b'\nSet-Cookie: leaked'
        cases.append((manifest, assessment, mutated_archive, repo_inputs))

        mutated_archive = copy.deepcopy(archive)
        key = manifest['sources'][0]['transport_member']
        transport = json.loads(mutated_archive[key])
        transport['final_host'] = 'attacker.invalid'
        mutated_archive[key] = json_bytes(transport)
        cases.append((manifest, assessment, mutated_archive, repo_inputs))

        mutated_archive = copy.deepcopy(archive)
        key = manifest['sources'][0]['body_member']
        mutated_archive[key] = re.sub(b'syntiant', b'changedx', mutated_archive[key], flags=re.I)
        mutated_manifest = copy.deepcopy(manifest)
        mutated_manifest['sources'][0]['body_sha256'] = sha(mutated_archive[key])
        mutated_manifest['sources'][0]['body_bytes'] = len(mutated_archive[key])
        transport_key = mutated_manifest['sources'][0]['transport_member']
        transport = json.loads(mutated_archive[transport_key])
        transport['body_sha256'] = sha(mutated_archive[key])
        transport['body_bytes'] = len(mutated_archive[key])
        mutated_archive[transport_key] = json_bytes(transport)
        cases.append((mutated_manifest, assessment, mutated_archive, repo_inputs))

        mutated_manifest = copy.deepcopy(manifest)
        mutated_manifest['result']['aetherflux_redirect_chain'] = []
        cases.append((mutated_manifest, assessment, archive, repo_inputs))

        mutated_assessment = copy.deepcopy(assessment)
        mutated_assessment['rank_results'][0]['source_custody_complete'] = False
        cases.append((manifest, mutated_assessment, archive, repo_inputs))

        mutated_archive = copy.deepcopy(archive)
        del mutated_archive[manifest['sources'][0]['tls_leaf_member']]
        cases.append((manifest, assessment, mutated_archive, repo_inputs))

        mutated_archive = copy.deepcopy(archive)
        mutated_archive['inputs/adjudication-rows.jsonl'] += b'\n'
        cases.append((manifest, assessment, mutated_archive, repo_inputs))

        mutated_repo_inputs = copy.deepcopy(repo_inputs)
        first_repo_path = SOURCE_INPUT_BINDINGS[0][2]
        mutated_repo_inputs[first_repo_path] += b' '
        cases.append((manifest, assessment, archive, mutated_repo_inputs))

        mutated_archive = copy.deepcopy(archive)
        mutated_manifest = copy.deepcopy(manifest)
        plan = json.loads(mutated_archive['inputs/capture-plan.json'])
        plan['routes'][0]['requested_url'] = 'https://attacker.invalid/substitute'
        plan_bytes = json_bytes(plan)
        mutated_archive['inputs/capture-plan.json'] = plan_bytes
        mutated_manifest['source_inputs']['capture_plan_sha256'] = sha(plan_bytes)
        capture = json.loads(mutated_archive['inputs/capture-manifest.json'])
        plan_entry = next(row for row in capture['entries'] if row['path'] == 'plan.json')
        plan_entry['bytes'] = len(plan_bytes)
        plan_entry['sha256'] = sha(plan_bytes)
        capture['combined_sha256'] = capture_manifest_digest(capture['entries'])
        capture_bytes = json_bytes(capture)
        mutated_archive['inputs/capture-manifest.json'] = capture_bytes
        mutated_manifest['source_inputs']['capture_manifest_sha256'] = sha(capture_bytes)
        mutated_manifest['source_inputs']['capture_manifest_combined_sha256'] = capture['combined_sha256']
        cases.append((mutated_manifest, assessment, mutated_archive, repo_inputs))

        mutated_archive = copy.deepcopy(archive)
        mutated_manifest = copy.deepcopy(manifest)
        capture = json.loads(mutated_archive['inputs/capture-manifest.json'])
        body_entry = next(
            row for row in capture['entries']
            if row['path'] == 'routes/rank-014-evidence-01/attempt-1.body'
        )
        body_entry['sha256'] = '0' * 64
        capture['combined_sha256'] = capture_manifest_digest(capture['entries'])
        capture_bytes = json_bytes(capture)
        mutated_archive['inputs/capture-manifest.json'] = capture_bytes
        mutated_manifest['source_inputs']['capture_manifest_sha256'] = sha(capture_bytes)
        mutated_manifest['source_inputs']['capture_manifest_combined_sha256'] = capture['combined_sha256']
        cases.append((mutated_manifest, assessment, mutated_archive, repo_inputs))

        for args in cases:
            try:
                check(*args)
            except (ValueError, KeyError, IndexError, json.JSONDecodeError, UnicodeDecodeError):
                negative += 1
            else:
                raise ValueError('negative mutation accepted')
        require(negative == 14, 'negative control count drift')

    print(
        json.dumps(
            {
                'verified': True,
                'adjudication_rows': 23,
                'source_routes': 26,
                'archive_members': manifest['archive']['members'],
                'captured_body_bytes': manifest['denominator']['captured_body_bytes'],
                'cookie_values_redacted': 14,
                'current_repository_inputs_bound': len(SOURCE_INPUT_BINDINGS),
                'capture_manifest_combined_sha256': manifest['source_inputs'][
                    'capture_manifest_combined_sha256'
                ],
                'rejected_negative_controls': negative,
                'case_receipt_admission': 'none',
                'identity_promotion': 'none',
            },
            sort_keys=True,
        )
    )


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print('VERIFICATION FAILED: ' + str(exc), file=sys.stderr)
        sys.exit(1)
