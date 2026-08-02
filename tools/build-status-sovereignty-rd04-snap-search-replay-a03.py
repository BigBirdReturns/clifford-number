#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import html
import json
import shutil
import sys
import urllib.parse
from collections import Counter
from pathlib import Path
from typing import Any

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
ALLOWED_TERMINALS = {
    'official_result_recovered',
    'official_route_recovered_page_blocked',
    'no_official_result_in_returned_set',
    'tool_failure_after_bounded_retry',
}
PARENT_HEAD = '2c8803a644ba23abc739136961121a8c8e3cb75d'
DATA_REL = Path('data/intake/status-sovereignty-rd04-snap-search-replay-a03')
MANIFEST_REL = Path('data/project/status-sovereignty-rd04-snap-search-replay-a03-release-manifest.json')
BUILD_REL = Path('build/core-thesis/status-sovereignty/rd04-snap-search-replay-a03')
REPORT_REL = Path('reports/core-thesis/status-sovereignty/rd04-snap-search-replay-a03')
READONLY_WORKFLOW_REL = Path('.github/workflows/status-sovereignty-rd04-snap-search-replay-a03.yml')
ACQUIRE_REL = Path('tools/acquire-status-sovereignty-rd04-snap-search-replay-a03.py')
BUILD_SCRIPT_REL = Path('tools/build-status-sovereignty-rd04-snap-search-replay-a03.py')
A02_SOURCE_GLOB = 'data/intake/status-sovereignty-rd04-snap-source-availability-a02/sources-*.json'
A02_SUMMARY_REL = Path('build/core-thesis/status-sovereignty/rd04-snap-source-availability-a02/summary.json')


def stable(value: Any) -> str:
    return json.dumps(value, indent=2, ensure_ascii=False, sort_keys=False) + '\n'


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fail(message: str) -> None:
    raise ValueError(message)


def expected_query(code: str, state_name: str, qid: str) -> str:
    del code
    return TEMPLATES[qid].format(state=state_name)


def expected_url(query: str) -> str:
    return 'https://www.bing.com/search?format=rss&q=' + urllib.parse.quote_plus(query)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding='utf-8'))


def load_a02(repo_root: Path) -> tuple[dict[str, list[str]], set[str], dict[str, Any]]:
    url_to_ids: dict[str, list[str]] = {}
    all_ids: set[str] = set()
    for path in sorted(repo_root.glob(A02_SOURCE_GLOB)):
        payload = load_json(path)
        for row in payload.get('rows', []):
            source_id = row.get('source_id')
            url = row.get('url')
            if isinstance(source_id, str):
                all_ids.add(source_id)
            if isinstance(source_id, str) and isinstance(url, str):
                url_to_ids.setdefault(url, []).append(source_id)
    return url_to_ids, all_ids, load_json(repo_root / A02_SUMMARY_REL)


def copy_collected(collected: Path, output: Path) -> None:
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    for name in ('receipts', 'raw', 'headers', 'logs'):
        source = collected / name
        if not source.is_dir():
            fail(f'collected artifact missing {name}/')
        shutil.copytree(source, output / name)


def validate_and_derive(repo_root: Path, data_root: Path) -> dict[str, Any]:
    expected_ids = [f'{code}-{qid}' for code, _ in STATES for qid in TEMPLATES]
    receipt_paths = sorted((data_root / 'receipts').glob('*.json'))
    observed_ids = [path.stem for path in receipt_paths]
    if observed_ids != sorted(expected_ids):
        missing = sorted(set(expected_ids) - set(observed_ids))
        extra = sorted(set(observed_ids) - set(expected_ids))
        fail(f'exact 200-receipt set mismatch; missing={missing}; extra={extra}')

    url_to_a02_ids, a02_ids, a02_summary = load_a02(repo_root)
    state_lookup = dict(STATES)
    receipts: list[dict[str, Any]] = []
    all_result_ids: set[str] = set()
    returned_a02_ids: set[str] = set()
    new_official_by_url: dict[str, dict[str, Any]] = {}
    terminal_counts: Counter[str] = Counter()
    attempt_counts: Counter[int] = Counter()

    for path in receipt_paths:
        receipt = load_json(path)
        query_id = receipt.get('query_id')
        if query_id != path.stem:
            fail(f'{path.name}: query_id/path mismatch')
        if receipt.get('schema_version') != 'ssc-rd04-a03-query-receipt@1':
            fail(f'{query_id}: schema version changed')
        if receipt.get('issue') != 687 or receipt.get('parent_a02_head') != PARENT_HEAD:
            fail(f'{query_id}: parent custody mismatch')
        code = receipt.get('state_code')
        state_name = receipt.get('state_name')
        qid = receipt.get('query_slot')
        if state_lookup.get(code) != state_name or qid not in TEMPLATES:
            fail(f'{query_id}: state/query identity mismatch')
        query = expected_query(code, state_name, qid)
        if receipt.get('exact_query') != query or receipt.get('request_url') != expected_url(query):
            fail(f'{query_id}: exact query or request URL drift')
        if receipt.get('search_surface') != 'bing_web_search_rss' or receipt.get('result_depth_cap') != 10:
            fail(f'{query_id}: search surface or result depth drift')
        if receipt.get('timeout_seconds') != 30 or receipt.get('retry_ceiling') != 1:
            fail(f'{query_id}: timeout/retry contract drift')
        attempts = receipt.get('attempts')
        if not isinstance(attempts, list) or len(attempts) not in (1, 2) or receipt.get('attempt_count') != len(attempts):
            fail(f'{query_id}: attempt count invalid')
        for index, attempt in enumerate(attempts, start=1):
            if attempt.get('attempt') != index:
                fail(f'{query_id}: attempt sequence invalid')
            raw_rel = attempt.get('raw_path')
            headers_rel = attempt.get('headers_path')
            if raw_rel:
                raw_path = data_root / raw_rel
                if not raw_path.is_file():
                    fail(f'{query_id}: raw file missing {raw_rel}')
                raw = raw_path.read_bytes()
                if attempt.get('raw_bytes') != len(raw):
                    fail(f'{query_id}: raw byte count mismatch')
                expected_hash = sha256_bytes(raw) if raw else None
                if attempt.get('raw_sha256') != expected_hash:
                    fail(f'{query_id}: raw SHA-256 mismatch')
            if headers_rel and not (data_root / headers_rel).is_file():
                fail(f'{query_id}: headers file missing {headers_rel}')
        terminal = receipt.get('terminal_state')
        if terminal not in ALLOWED_TERMINALS:
            fail(f'{query_id}: untyped terminal state {terminal}')
        results = receipt.get('ordered_results')
        if not isinstance(results, list) or len(results) > 10:
            fail(f'{query_id}: ordered result depth invalid')
        if [row.get('position') for row in results] != list(range(1, len(results) + 1)):
            fail(f'{query_id}: ordered result positions invalid')
        selected = []
        for row in results:
            result_id = row.get('result_id')
            expected_result_id = f'{query_id}-R{row["position"]:02d}'
            if result_id != expected_result_id or result_id in all_result_ids:
                fail(f'{query_id}: result identity invalid or duplicate')
            all_result_ids.add(result_id)
            eligible = row.get('official_source_eligible') is True
            if eligible:
                selected.append(result_id)
                matched_ids = row.get('a02_exact_url_match_source_ids') or url_to_a02_ids.get(row.get('url'), [])
                if sorted(matched_ids) != sorted(row.get('a02_exact_url_match_source_ids') or []):
                    fail(f'{result_id}: A02 match custody mismatch')
                returned_a02_ids.update(matched_ids)
                if not matched_ids:
                    new_official_by_url.setdefault(row.get('url') or '', {
                        'url': row.get('url'),
                        'domain': row.get('domain'),
                        'first_result_id': result_id,
                        'queries': [],
                        'boundary': 'official-domain route candidate; substantive support not adjudicated',
                    })['queries'].append(query_id)
        if selected != receipt.get('selected_result_ids'):
            fail(f'{query_id}: selected result identity drift')
        if terminal == 'official_result_recovered' and not selected:
            fail(f'{query_id}: official terminal lacks selected route')
        if terminal == 'no_official_result_in_returned_set' and selected:
            fail(f'{query_id}: no-official terminal carries selected route')
        boundaries = receipt.get('boundaries') or {}
        if any(boundaries.get(key) is not False for key in (
            'search_result_is_source_truth',
            'search_order_is_authority',
            'no_official_result_is_record_absence',
            'official_domain_match_proves_substantive_support',
        )):
            fail(f'{query_id}: authority boundary escalated')
        terminal_counts[terminal] += 1
        attempt_counts[len(attempts)] += 1
        receipts.append(receipt)

    matrix = []
    by_id = {receipt['query_id']: receipt for receipt in receipts}
    for code, state_name in STATES:
        query_rows = []
        for qid in TEMPLATES:
            receipt = by_id[f'{code}-{qid}']
            query_rows.append({
                'query_id': receipt['query_id'],
                'query_slot': qid,
                'terminal_state': receipt['terminal_state'],
                'attempt_count': receipt['attempt_count'],
                'returned_results': len(receipt['ordered_results']),
                'eligible_official_results': len(receipt['selected_result_ids']),
            })
        matrix.append({
            'state_code': code,
            'state_name': state_name,
            'terminal_receipts': 4,
            'all_four_terminal': True,
            'queries': query_rows,
        })

    missing_a02_ids = sorted(a02_ids - returned_a02_ids)
    new_candidates = sorted(new_official_by_url.values(), key=lambda row: (row['url'] or ''))
    for row in new_candidates:
        row['queries'] = sorted(set(row['queries']))

    delta = {
        'schema_version': 'ssc-rd04-a03-a02-delta@1',
        'issue': 687,
        'parent_a02_head': PARENT_HEAD,
        'a02_source_records': len(a02_ids),
        'a02_exact_url_matched_source_ids': sorted(returned_a02_ids),
        'a02_exact_url_matched_source_count': len(returned_a02_ids),
        'a02_source_ids_not_returned_by_frozen_replay': missing_a02_ids,
        'a02_source_not_returned_is_record_absence': False,
        'new_official_domain_route_candidates': new_candidates,
        'new_candidate_count': len(new_candidates),
        'score_recomputation_state': 'blocked_pending_source_content_adjudication',
        'automatic_score_changes_authorized': 0,
        'boundaries': {
            'search_result_is_source_truth': False,
            'official_domain_route_is_substantive_support': False,
            'catalogue_source_not_returned_is_source_rejection': False,
            'retrieval_delta_is_policy_quality_delta': False,
        },
    }

    core = {
        'schema_version': 'ssc-rd04-a03-search-replay-core@1',
        'execution_id': 'SSC-RD04-SNAP-A03',
        'issue': 687,
        'parent_a02_head': PARENT_HEAD,
        'search_surface': 'bing_web_search_rss',
        'states': 50,
        'queries_per_state': 4,
        'terminal_query_receipts': len(receipts),
        'states_with_four_of_four_terminal_receipts': sum(1 for row in matrix if row['all_four_terminal']),
        'silent_query_omissions': 0,
        'untyped_retries': 0,
        'unresolved_result_ids': 0,
        'terminal_state_counts': dict(sorted(terminal_counts.items())),
        'attempt_count_distribution': {str(key): value for key, value in sorted(attempt_counts.items())},
        'ordered_result_count': len(all_result_ids),
        'official_result_route_count': sum(len(receipt['selected_result_ids']) for receipt in receipts),
        'query_replay_complete': len(receipts) == 200,
        'content_adjudication_complete': False,
        'score_rows_recomputed': 0,
        'selection_gate_complete': False,
        'final_selected_state': None,
        'terminal_state': 'requires_additional_acquisition',
        'authority': {
            'residual_class_closures': 0,
            'reviewed_disposition_changes': 0,
            'complete_compact_findings': 0,
            'racial_order_findings': 0,
            'prevalence_findings': 0,
            'coordination_findings': 0,
            'common_purpose_findings': 0,
            'graph_effect': 'none',
            'publication_effect': 'none',
        },
        'boundaries': {
            'query_replay_completion_is_source_truth': False,
            'query_replay_completion_is_selection_gate_completion': False,
            'official_domain_match_is_substantive_support': False,
            'no_official_result_is_record_absence': False,
            'search_order_is_authority': False,
        },
    }

    summary = {
        'schema_version': 'ssc-rd04-a03-search-replay-summary@1',
        'execution_id': core['execution_id'],
        'issue': 687,
        'parent_a02_head': PARENT_HEAD,
        'query_replay': {
            'terminal_receipts': core['terminal_query_receipts'],
            'required_receipts': 200,
            'states_complete': core['states_with_four_of_four_terminal_receipts'],
            'required_states': 50,
            'terminal_state_counts': core['terminal_state_counts'],
            'ordered_result_count': core['ordered_result_count'],
            'official_result_route_count': core['official_result_route_count'],
        },
        'a02_provisional_frontier': a02_summary['selection_result'],
        'delta': {
            'a02_exact_url_matched_source_count': delta['a02_exact_url_matched_source_count'],
            'new_official_domain_route_candidate_count': delta['new_candidate_count'],
            'score_recomputation_state': delta['score_recomputation_state'],
        },
        'current_result': {
            'query_replay_complete': core['query_replay_complete'],
            'content_adjudication_complete': False,
            'selection_gate_complete': False,
            'terminal_state': 'requires_additional_acquisition',
        },
        'authority': core['authority'],
        'boundaries': core['boundaries'],
    }
    return {'core': core, 'matrix': matrix, 'delta': delta, 'summary': summary}


def source_manifest_paths(repo_root: Path, data_root: Path) -> list[Path]:
    paths = [READONLY_WORKFLOW_REL, ACQUIRE_REL, BUILD_SCRIPT_REL]
    for directory in ('receipts', 'raw', 'headers', 'logs'):
        paths.extend(path.relative_to(repo_root) for path in sorted((data_root / directory).glob('*')) if path.is_file())
    return paths


def build_manifest(repo_root: Path, data_root: Path) -> dict[str, Any]:
    entries = []
    for relative in source_manifest_paths(repo_root, data_root):
        data = (repo_root / relative).read_bytes()
        entries.append({'path': str(relative), 'sha256': sha256_bytes(data), 'bytes': len(data)})
    combined = sha256_bytes(''.join(f"{row['path']}\0{row['sha256']}\0{row['bytes']}\n" for row in entries).encode())
    return {
        'schema_version': 'ssc-rd04-a03-release-manifest@1',
        'execution_id': 'SSC-RD04-SNAP-A03',
        'issue': 687,
        'parent_a02_head': PARENT_HEAD,
        'hash_mode': 'sha256_exact_bytes',
        'scope_ordered': True,
        'self_included': False,
        'entries': entries,
        'combined_sha256': combined,
        'boundaries': {
            'exact_bytes_prove_source_truth': False,
            'manifest_proves_content_adjudication': False,
            'manifest_proves_selection_gate_completion': False,
            'manifest_closes_residual_class': False,
            'manifest_changes_reviewed_disposition': False,
            'manifest_authorizes_graph_effect': False,
            'manifest_authorizes_publication': False,
        },
    }


def html_report(summary: dict[str, Any], manifest: dict[str, Any]) -> str:
    terminal_rows = ''.join(
        f'<tr><td><code>{html.escape(state)}</code></td><td>{count}</td></tr>'
        for state, count in summary['query_replay']['terminal_state_counts'].items()
    )
    return (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta name="robots" content="noindex,nofollow">'
        '<title>SSC RD-04 A03 search replay</title>'
        '<style>:root{background:#eeeae0;color:#181714;font-family:system-ui,sans-serif}'
        'body{max-width:1050px;margin:auto;padding:40px 24px 72px;line-height:1.5}'
        'h1{font-size:clamp(2rem,5vw,4rem);line-height:1}.state{font-weight:800;color:#8c300d}'
        'table,.boundary{width:100%;background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}'
        'th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left}.boundary{padding:18px;box-sizing:border-box}'
        '</style></head><body>'
        '<p><b>CLIFFORD NUMBER · SSC-H01 · SEARCH-REPLAY CUSTODY</b></p>'
        '<h1>Two hundred frozen SNAP queries have terminal receipts</h1>'
        f'<p class="state">{summary["query_replay"]["terminal_receipts"]}/200 QUERY RECEIPTS · '
        f'{summary["query_replay"]["states_complete"]}/50 STATES · CONTENT ADJUDICATION OPEN · '
        'SELECTION GATE OPEN · 0 RESIDUAL CLOSURES · GRAPH NONE · PUBLICATION NONE</p>'
        '<p>The replay preserves returned result order and official-domain route classification. It does not turn search results into source truth or complete the eight-dimension selection without source-content adjudication.</p>'
        '<h2>Terminal query states</h2><table><thead><tr><th>State</th><th>Queries</th></tr></thead><tbody>'
        f'{terminal_rows}</tbody></table>'
        '<h2>Authority boundary</h2>'
        f'<pre class="boundary">{html.escape(json.dumps(summary["boundaries"], indent=2))}</pre>'
        f'<p><code>release SHA-256: {manifest["combined_sha256"]}</code></p>'
        '</body></html>\n'
    )


def expected_outputs(repo_root: Path, data_root: Path) -> dict[Path, str]:
    derived = validate_and_derive(repo_root, data_root)
    manifest = build_manifest(repo_root, data_root)
    summary = dict(derived['summary'])
    summary['release_manifest'] = {'path': str(MANIFEST_REL), 'combined_sha256': manifest['combined_sha256']}
    return {
        DATA_REL / 'core.json': stable(derived['core']),
        DATA_REL / 'execution-matrix.json': stable(derived['matrix']),
        DATA_REL / 'source-delta.json': stable(derived['delta']),
        MANIFEST_REL: stable(manifest),
        BUILD_REL / 'summary.json': stable(summary),
        REPORT_REL / 'summary.json': stable(summary),
        REPORT_REL / 'index.html': html_report(summary, manifest),
    }


def materialize(repo_root: Path, collected: Path) -> None:
    data_root = repo_root / DATA_REL
    copy_collected(collected, data_root)
    for relative, content in expected_outputs(repo_root, data_root).items():
        target = repo_root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding='utf-8')
    print('build-status-sovereignty-rd04-snap-search-replay-a03: 200/200 query receipts; content adjudication open')


def check(repo_root: Path) -> None:
    data_root = repo_root / DATA_REL
    outputs = expected_outputs(repo_root, data_root)
    drift = []
    for relative, expected in outputs.items():
        target = repo_root / relative
        if not target.is_file():
            drift.append(f'{relative}: missing')
        elif target.read_text(encoding='utf-8') != expected:
            drift.append(f'{relative}: generated bytes stale')
    if drift:
        raise ValueError('; '.join(drift))
    print('validate-status-sovereignty-rd04-snap-search-replay-a03: 200/200 receipts PASS; selection gate remains open')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo-root', type=Path, default=Path('.'))
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--materialize', action='store_true')
    mode.add_argument('--check', action='store_true')
    parser.add_argument('--collected', type=Path)
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()
    try:
        if args.materialize:
            if args.collected is None:
                fail('--collected is required with --materialize')
            materialize(repo_root, args.collected.resolve())
        else:
            check(repo_root)
    except Exception as exc:  # noqa: BLE001 - fail closed with exact diagnostic
        print(f'status-sovereignty-rd04-snap-search-replay-a03: {exc}', file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == '__main__':
    main()
