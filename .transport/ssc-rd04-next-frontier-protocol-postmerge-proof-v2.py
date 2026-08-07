from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import textwrap
import traceback
from pathlib import Path
from typing import Any

REPOSITORY = os.environ.get('GITHUB_REPOSITORY', 'BigBirdReturns/clifford-number')
OWNER = REPOSITORY.split('/', 1)[0]
PRODUCT_BRANCH = 'agent/ssc-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol-v1'
SLUG = 'status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol'
DATA_DIR = f'data/intake/{SLUG}'
OUT = Path('/tmp/ssc-rd04-next-frontier-protocol-postmerge-proof-v2')
WT = Path('/tmp/ssc-rd04-next-frontier-protocol-postmerge-proof-v2-worktree')
EXPECTED_PATHS = sorted([
    f'{DATA_DIR}/frontier-selection.json',
    f'{DATA_DIR}/official-locator-inventory.json',
    f'{DATA_DIR}/predecessor-custody.json',
    f'{DATA_DIR}/product-manifest.json',
    f'{DATA_DIR}/route-discovery-protocol.json',
    f'{DATA_DIR}/route-query-contract.json',
    f'{DATA_DIR}/summary.json',
    f'docs/milestones/{SLUG}.md',
    f'schemas/{SLUG}.schema.json',
    f'test/{SLUG}.test.js',
    'tools/acquisition/status-sovereignty-rd-wave03-rd04-next-frontier/plan-official-route-discovery.py',
    f'tools/build-{SLUG}.mjs',
    f'tools/validate-{SLUG}.mjs',
])
RELATED_REFS = [
    'agent/ssc-rd04-next-frontier-survey-v1',
    'agent/ssc-rd04-next-frontier-protocol-recovery-v3',
    'agent/ssc-rd04-next-frontier-protocol-orchestrator-v4',
    PRODUCT_BRANCH,
]


def run(args: list[str], cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(args, cwd=str(cwd) if cwd else None, text=True, capture_output=True, env=os.environ.copy())
    with (OUT / 'run.log').open('a', encoding='utf-8') as fh:
        fh.write('$ ' + ' '.join(args) + '\n')
        fh.write(result.stdout)
        fh.write(result.stderr)
        fh.write(f'[exit {result.returncode}]\n')
    if check and result.returncode:
        raise RuntimeError(f'command failed ({result.returncode}): {args!r}')
    return result


def git(*args: str, cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run(['git', *args], cwd=cwd, check=check)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def issue_comment(success: bool, receipt: dict[str, Any]) -> None:
    body = OUT / 'issue-comment.md'
    if success:
        reset_count = len((OUT / 'reset-refs.txt').read_text().splitlines()) if (OUT / 'reset-refs.txt').exists() else 0
        body.write_text(textwrap.dedent(f"""\
            Canonical RD-04 next-frontier route-discovery protocol post-merge proof v2 completed successfully.

            ```text
            pull_request: {receipt['pull_request']}
            canonical_parent: {receipt['canonical_parent']}
            product_head: {receipt['product_head']}
            product_tree: {receipt['product_tree']}
            canonical_merge: {receipt['canonical_merge']}
            canonical_merge_tree: {receipt['canonical_merge_tree']}
            live_main_at_proof: {receipt['live_main_at_proof']}
            permanent_paths: {receipt['permanent_path_count']}
            live_successor_overlap_count: {receipt['live_successor_overlap_count']}
            selected_states: {' '.join(receipt['selected_state_ids'])}
            selected_fields: {' '.join(receipt['selected_field_ids'])}
            selected_substantive_cells: {receipt['selected_substantive_cell_count']}
            protocol_obligations: {receipt['protocol_obligations']}
            fixed_repository_route_cells: {receipt['fixed_repository_route_cells']}
            bounded_official_route_discovery_cells: {receipt['bounded_official_route_discovery_cells']}
            closed_schema_objects: {receipt['closed_schema_objects']}
            adversarial_refusals: {receipt['adversarial_refusals']}
            complete_release_gate: pass
            clean_deterministic_replay: pass
            source_requests_executed: 0
            source_admissions: 0
            field_mutations: 0
            row_state_mutations: 0
            class_closed: false
            outside_human_dependency: false
            reset_refs: {reset_count}
            receipt_sha256: {sha256(OUT / 'postmerge-receipt.json')}
            ```

            The merge is canonical, workflow-free, and protocol-only. Known execution refs were neutralized after proof, and the read-only export PR was closed unmerged. RD-04-C02 and the cumulative ledger remain open; the next authorized transaction is the bounded route-discovery acquisition.
        """), encoding='utf-8')
    else:
        tail = (OUT / 'run.log').read_text(encoding='utf-8', errors='replace')[-18000:] if (OUT / 'run.log').exists() else receipt.get('traceback', '')
        body.write_text('Canonical RD-04 next-frontier protocol post-merge proof v2 failed closed.\n\n```text\n' + tail + '\n```\n\nNo cleanup, acquisition, or additional authority is represented.\n', encoding='utf-8')
    run(['gh', 'issue', 'comment', '1017', '--repo', REPOSITORY, '--body-file', str(body)], check=False)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'run.log').write_text('', encoding='utf-8')
    receipt: dict[str, Any] = {'schema_version': 'ssc-rd04-next-frontier-protocol-postmerge-proof@2', 'status': 'running'}
    try:
        git('fetch', '--force', 'origin', 'main', PRODUCT_BRANCH)
        live_main = git('rev-parse', 'origin/main').stdout.strip()
        product_head = git('rev-parse', 'FETCH_HEAD').stdout.strip()
        closed = json.loads(run(['gh', 'api', f'repos/{REPOSITORY}/pulls?state=closed&head={OWNER}:{PRODUCT_BRANCH}&per_page=100']).stdout)
        merged = [row for row in closed if row.get('merged_at') and row.get('head', {}).get('sha') == product_head]
        if len(merged) != 1:
            raise RuntimeError(f'expected one merged product PR for exact head, found {len(merged)}')
        pr = merged[0]
        pr_number = int(pr['number'])
        merge_sha = pr['merge_commit_sha']
        product_parent = git('rev-parse', f'{product_head}^').stdout.strip()
        product_tree = git('rev-parse', f'{product_head}^{{tree}}').stdout.strip()
        merge_tree = git('rev-parse', f'{merge_sha}^{{tree}}').stdout.strip()
        parents = git('show', '-s', '--format=%P', merge_sha).stdout.strip().split()
        if parents != [product_parent, product_head]:
            raise RuntimeError(f'merge parents drift: {parents}')
        if merge_tree != product_tree:
            raise RuntimeError('merge tree differs from product tree')
        git('diff', '--exit-code', product_head, merge_sha)
        git('merge-base', '--is-ancestor', merge_sha, live_main)

        name_status = git('diff', '--name-status', product_parent, merge_sha).stdout.splitlines()
        if len(name_status) != 13 or any(not line.startswith('A\t') for line in name_status):
            raise RuntimeError(f'canonical path topology mismatch: {name_status}')
        actual_paths = sorted(line.split('\t', 1)[1] for line in name_status)
        if actual_paths != EXPECTED_PATHS:
            raise RuntimeError(f'canonical path mismatch: {actual_paths}')
        if any(re.search(r'(^|/)(\.transport|\.trigger)(/|$)|(^|/)\.github/workflows/', path) for path in actual_paths):
            raise RuntimeError('transport or workflow path in canonical product')
        (OUT / 'actual-paths.txt').write_text('\n'.join(actual_paths) + '\n', encoding='utf-8')

        successor_paths: list[str] = []
        if live_main != merge_sha:
            successor_paths = git('diff', '--name-only', merge_sha, live_main).stdout.splitlines()
        overlap = sorted(set(successor_paths).intersection(actual_paths))
        if overlap:
            raise RuntimeError(f'live successor overlap: {overlap}')
        (OUT / 'live-successor-paths.txt').write_text('\n'.join(sorted(successor_paths)) + ('\n' if successor_paths else ''), encoding='utf-8')

        if WT.exists():
            shutil.rmtree(WT)
        git('worktree', 'add', '--detach', str(WT), merge_sha)
        run(['node', '--check', f'tools/build-{SLUG}.mjs'], cwd=WT)
        run(['node', '--check', f'tools/validate-{SLUG}.mjs'], cwd=WT)
        run(['node', '--check', f'test/{SLUG}.test.js'], cwd=WT)
        run(['python', '-m', 'py_compile', 'tools/acquisition/status-sovereignty-rd-wave03-rd04-next-frontier/plan-official-route-discovery.py'], cwd=WT)
        run(['node', f'tools/build-{SLUG}.mjs', '--check'], cwd=WT)
        run(['node', f'tools/validate-{SLUG}.mjs'], cwd=WT)

        import jsonschema
        schema = json.loads((WT / f'schemas/{SLUG}.schema.json').read_text())
        validator = jsonschema.Draft202012Validator(schema)
        data_dir = WT / DATA_DIR
        data_names = ['frontier-selection.json','predecessor-custody.json','official-locator-inventory.json','route-query-contract.json','route-discovery-protocol.json','summary.json']
        for name in data_names:
            validator.validate(json.loads((data_dir / name).read_text()))

        adversarial = run(['node', f'test/{SLUG}.test.js'], cwd=WT)
        match = re.search(r'adversarial_refusals=(\d+)', adversarial.stdout)
        if not match:
            raise RuntimeError('missing adversarial refusal count')
        adversarial_refusals = int(match.group(1))
        run(['python', 'tools/acquisition/status-sovereignty-rd-wave03-rd04-next-frontier/plan-official-route-discovery.py', '--json'], cwd=WT)
        run(['node', 'tools/validate-no-magic-human-gate.mjs'], cwd=WT)
        git('diff', '--check', cwd=WT)
        git('diff', '--exit-code', cwd=WT)
        if git('status', '--porcelain=v1', '--untracked-files=all', cwd=WT).stdout.strip():
            raise RuntimeError('dirty canonical checkout before release gate')
        run(['npm', 'run', 'release:check'], cwd=WT)
        git('reset', '--hard', 'HEAD', cwd=WT)
        git('clean', '-fdx', cwd=WT)
        run(['node', f'tools/build-{SLUG}.mjs', '--write'], cwd=WT)
        run(['node', f'tools/build-{SLUG}.mjs', '--check'], cwd=WT)
        run(['node', f'tools/validate-{SLUG}.mjs'], cwd=WT)
        run(['node', f'test/{SLUG}.test.js'], cwd=WT)
        run(['node', 'tools/validate-no-magic-human-gate.mjs'], cwd=WT)
        git('diff', '--check', cwd=WT)
        git('diff', '--exit-code', cwd=WT)
        if git('status', '--porcelain=v1', '--untracked-files=all', cwd=WT).stdout.strip():
            raise RuntimeError('dirty canonical clean replay')

        selection = json.loads((data_dir / 'frontier-selection.json').read_text())
        summary = json.loads((data_dir / 'summary.json').read_text())
        receipt.update({
            'status': 'complete',
            'pull_request': pr_number,
            'canonical_parent': product_parent,
            'product_head': product_head,
            'product_tree': product_tree,
            'canonical_merge': merge_sha,
            'canonical_merge_tree': merge_tree,
            'live_main_at_proof': live_main,
            'permanent_paths': actual_paths,
            'permanent_path_count': 13,
            'live_successor_overlap_count': 0,
            'selected_state_ids': selection['selected_state_ids'],
            'selected_field_ids': selection['selected_field_ids'],
            'selected_substantive_cell_count': selection['selected_substantive_cell_count'],
            'protocol_obligations': summary['protocol_obligations'],
            'fixed_repository_route_cells': summary['fixed_repository_route_cells'],
            'bounded_official_route_discovery_cells': summary['bounded_official_route_discovery_cells'],
            'closed_schema_objects': 6,
            'adversarial_refusals': adversarial_refusals,
            'focused_validation': 'pass',
            'no_magic_human': 'pass',
            'complete_release_gate': 'pass',
            'clean_deterministic_replay': 'pass',
            'source_requests_executed': 0,
            'source_admissions': 0,
            'field_mutations': 0,
            'row_state_mutations': 0,
            'class_closed': False,
            'outside_human_dependency': False,
            'cumulative_ledger_effect': 'none',
            'publication_effect': 'none',
            'adoption_effect': 'none',
            'graph_effect': 'none',
        })
        (OUT / 'postmerge-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')

        # Cleanup only after the canonical receipt is complete on disk.
        (OUT / 'reset-refs.txt').write_text('', encoding='utf-8')
        for ref in RELATED_REFS:
            remote = git('ls-remote', '--heads', 'origin', f'refs/heads/{ref}').stdout.strip()
            if not remote:
                continue
            old = remote.split()[0]
            run(['git', 'push', 'origin', f'{live_main}:refs/heads/{ref}', f'--force-with-lease=refs/heads/{ref}:{old}'])
            with (OUT / 'reset-refs.txt').open('a', encoding='utf-8') as fh:
                fh.write(f'{ref} {old} -> {live_main}\n')
        run(['gh', 'pr', 'close', '1317', '--repo', REPOSITORY, '--comment', 'Closed without merge after canonical next-frontier protocol publication and independent post-merge proof. This export lane remains read-only and has no separate evidentiary or product authority.'], check=False)

        issue_comment(True, receipt)
        return 0
    except Exception as exc:
        receipt.update({'status': 'failed_closed', 'error': repr(exc), 'traceback': traceback.format_exc()})
        (OUT / 'postmerge-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
        issue_comment(False, receipt)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
