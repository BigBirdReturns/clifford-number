from __future__ import annotations

import hashlib
import json
import os
import py_compile
import subprocess
import sys
import time
import traceback
from pathlib import Path
from typing import Any

REPOSITORY = os.environ.get('GITHUB_REPOSITORY', 'BigBirdReturns/clifford-number')
OWNER = REPOSITORY.split('/', 1)[0]
SURVEY_BRANCH = 'agent/ssc-rd04-next-frontier-survey-v1'
PROOF_BRANCH = 'agent/ssc-rd04-next-frontier-protocol-postmerge-proof-v1'
PRODUCT_BRANCH = 'agent/ssc-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol-v1'
MATERIALIZER_PATH = '.transport/ssc-rd04-next-frontier-protocol-v1/materialize.py'
MERGE_PATH = '.transport/ssc-rd04-next-frontier-protocol-v1/merge_controller.py'
PROOF_PATH = '.transport/ssc-rd04-next-frontier-protocol-postmerge-proof-v2.py'
OUT = Path('/tmp/ssc-rd04-next-frontier-protocol-orchestrator-v5')


def run(args: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(args, text=True, capture_output=True, env=os.environ.copy())
    with (OUT / 'orchestrator.log').open('a', encoding='utf-8') as fh:
        fh.write('$ ' + ' '.join(args) + '\n')
        fh.write(result.stdout)
        fh.write(result.stderr)
        fh.write(f'[exit {result.returncode}]\n')
    if check and result.returncode:
        raise RuntimeError(f'command failed ({result.returncode}): {args!r}')
    return result


def git(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run(['git', *args], check=check)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_exact(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label} repair site count {count}, expected 1')
    return text.replace(old, new)


def recover_sources() -> dict[str, Any]:
    git('fetch', '--force', 'origin',
        f'+refs/heads/{SURVEY_BRANCH}:refs/remotes/origin/{SURVEY_BRANCH}',
        f'+refs/heads/{PROOF_BRANCH}:refs/remotes/origin/{PROOF_BRANCH}',
        '+refs/heads/main:refs/remotes/origin/main')
    source_paths = {
        'materializer': (SURVEY_BRANCH, MATERIALIZER_PATH),
        'merge_controller': (SURVEY_BRANCH, MERGE_PATH),
        'proof_controller': (PROOF_BRANCH, PROOF_PATH),
    }
    receipt: dict[str, Any] = {'schema_version': 'ssc-rd04-next-frontier-protocol-runtime-repair@5', 'sources': {}, 'repairs': []}
    for name, (branch, path) in source_paths.items():
        target = OUT / f'{name}-source.py'
        target.write_text(git('show', f'origin/{branch}:{path}').stdout, encoding='utf-8')
        receipt['sources'][name] = {'branch': branch, 'path': path, 'bytes': target.stat().st_size, 'sha256': sha256(target)}

    material = (OUT / 'materializer-source.py').read_text()
    material = replace_exact(
        material,
        "'open_pairs': sorted({'state_id': state, 'field_id': field} for state, field in pairs),",
        "'open_pairs': [{'state_id': state, 'field_id': field} for state, field in sorted(pairs)],",
        'open-pair serialization',
    )
    material = replace_exact(
        material,
        """        remote = git('ls-remote','--heads','origin',f'refs/heads/{PRODUCT_BRANCH}',cwd=WT).stdout.strip()
        if remote:
            old = remote.split()[0]
            if old != live_main:
                raise RuntimeError(f'product branch lease drift: {old} != {live_main}')
            push = ['git','push','origin',f'HEAD:refs/heads/{PRODUCT_BRANCH}',f'--force-with-lease=refs/heads/{PRODUCT_BRANCH}:{old}']
        else:
            push = ['git','push','origin',f'HEAD:refs/heads/{PRODUCT_BRANCH}']
        run(push,cwd=WT)
""",
        """        remote = git('ls-remote','--heads','origin',f'refs/heads/{PRODUCT_BRANCH}',cwd=WT).stdout.strip()
        if remote:
            old = remote.split()[0]
            if old == product_head:
                push = None
            else:
                admissible_old = old == live_main
                if not admissible_old:
                    old_parent_result = git('rev-parse',f'{old}^',cwd=WT,check=False)
                    if old_parent_result.returncode == 0:
                        old_parent = old_parent_result.stdout.strip()
                        old_names = git('diff','--name-status',old_parent,old,cwd=WT,check=False)
                        old_lines = [line for line in old_names.stdout.splitlines() if line]
                        old_paths = sorted(line.split('\\t',1)[1] for line in old_lines if '\\t' in line)
                        expected_paths = sorted(PERMANENT_PATHS)
                        ancestry = git('merge-base','--is-ancestor',old_parent,live_main,cwd=WT,check=False).returncode == 0
                        successor_paths = set(git('diff','--name-only',old_parent,live_main,cwd=WT,check=False).stdout.splitlines())
                        overlap = successor_paths.intersection(expected_paths)
                        admissible_old = ancestry and len(old_lines)==len(expected_paths) and all(line.startswith('A\\t') for line in old_lines) and old_paths==expected_paths and not overlap
                if not admissible_old:
                    raise RuntimeError(f'product branch lease drift: {old} is neither live main nor an exact disjoint predecessor product')
                push = ['git','push','origin',f'HEAD:refs/heads/{PRODUCT_BRANCH}',f'--force-with-lease=refs/heads/{PRODUCT_BRANCH}:{old}']
        else:
            push = ['git','push','origin',f'HEAD:refs/heads/{PRODUCT_BRANCH}']
        if push is not None:
            run(push,cwd=WT)
""",
        'idempotent product branch lease',
    )
    (OUT / 'materializer-v5.py').write_text(material, encoding='utf-8')

    merge = (OUT / 'merge_controller-source.py').read_text()
    merge = replace_exact(
        merge,
        """        git('fetch', '--force', 'origin', 'main', PRODUCT_BRANCH)
        product_head = git('rev-parse', 'FETCH_HEAD').stdout.strip()
        product_parent = git('rev-parse', f'{product_head}^').stdout.strip()
        product_tree = git('rev-parse', f'{product_head}^{{tree}}').stdout.strip()
        live_main = git('rev-parse', 'origin/main').stdout.strip()
""",
        """        git('fetch', '--force', 'origin', '+refs/heads/main:refs/remotes/origin/main', f'+refs/heads/{PRODUCT_BRANCH}:refs/remotes/origin/{PRODUCT_BRANCH}')
        product_head = git('rev-parse', f'origin/{PRODUCT_BRANCH}').stdout.strip()
        product_parent = git('rev-parse', f'{product_head}^').stdout.strip()
        product_tree = git('rev-parse', f'{product_head}^{{tree}}').stdout.strip()
        live_main = git('rev-parse', 'origin/main').stdout.strip()
""",
        'initial merge ref resolution',
    )
    merge = replace_exact(
        merge,
        """        git('fetch', '--force', 'origin', 'main', PRODUCT_BRANCH)
        if git('rev-parse', 'origin/main').stdout.strip() != live_main:
            raise RuntimeError('main moved during qualification')
        if git('rev-parse', 'FETCH_HEAD').stdout.strip() != product_head:
            raise RuntimeError('product branch moved during qualification')
""",
        """        git('fetch', '--force', 'origin', '+refs/heads/main:refs/remotes/origin/main', f'+refs/heads/{PRODUCT_BRANCH}:refs/remotes/origin/{PRODUCT_BRANCH}')
        if git('rev-parse', 'origin/main').stdout.strip() != live_main:
            raise RuntimeError('main moved during qualification')
        if git('rev-parse', f'origin/{PRODUCT_BRANCH}').stdout.strip() != product_head:
            raise RuntimeError('product branch moved during qualification')
""",
        'merge lease ref resolution',
    )
    (OUT / 'merge-controller-v5.py').write_text(merge, encoding='utf-8')

    proof = (OUT / 'proof_controller-source.py').read_text()
    proof = replace_exact(
        proof,
        """        git('fetch', '--force', 'origin', 'main', PRODUCT_BRANCH)
        live_main = git('rev-parse', 'origin/main').stdout.strip()
        product_head = git('rev-parse', 'FETCH_HEAD').stdout.strip()
""",
        """        git('fetch', '--force', 'origin', '+refs/heads/main:refs/remotes/origin/main', f'+refs/heads/{PRODUCT_BRANCH}:refs/remotes/origin/{PRODUCT_BRANCH}')
        live_main = git('rev-parse', 'origin/main').stdout.strip()
        product_head = git('rev-parse', f'origin/{PRODUCT_BRANCH}').stdout.strip()
""",
        'proof ref resolution',
    )
    (OUT / 'proof-controller-v5.py').write_text(proof, encoding='utf-8')

    for name in ('materializer-v5.py', 'merge-controller-v5.py', 'proof-controller-v5.py'):
        py_compile.compile(str(OUT / name), doraise=True)
    receipt['repairs'] = [
        'serialize_open_pairs_by_sorted_tuple',
        'idempotent_disjoint_product_branch_lease',
        'explicit_initial_merge_remote_tracking_ref',
        'explicit_merge_lease_remote_tracking_ref',
        'explicit_proof_remote_tracking_ref',
    ]
    receipt['repair_count'] = len(receipt['repairs'])
    receipt['outputs'] = {name: {'bytes': (OUT / name).stat().st_size, 'sha256': sha256(OUT / name)} for name in ('materializer-v5.py', 'merge-controller-v5.py', 'proof-controller-v5.py')}
    receipt['semantic_scope'] = 'transport_serialization_and_ref_resolution_only'
    receipt['source_requests_executed'] = 0
    receipt['field_mutations'] = 0
    receipt['outside_human_dependency'] = False
    (OUT / 'runtime-repair.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    return receipt


def wait_for_pr() -> dict[str, Any]:
    for _ in range(180):
        rows = json.loads(run(['gh', 'api', f'repos/{REPOSITORY}/pulls?state=open&head={OWNER}:{PRODUCT_BRANCH}&per_page=100']).stdout)
        if len(rows) == 1:
            return rows[0]
        if len(rows) > 1:
            raise RuntimeError(f'duplicate open product PRs: {len(rows)}')
        time.sleep(5)
    raise RuntimeError('timed out awaiting connector-created product PR')


def report(success: bool, receipt: dict[str, Any]) -> None:
    body = OUT / 'issue-comment.md'
    if success:
        proof = receipt['proof']
        body.write_text(
            'RD-04 next-frontier protocol orchestrator v5 completed successfully.\n\n'
            '```text\n'
            + '\n'.join([
                f"pull_request: {proof['pull_request']}",
                f"canonical_parent: {proof['canonical_parent']}",
                f"product_head: {proof['product_head']}",
                f"product_tree: {proof['product_tree']}",
                f"canonical_merge: {proof['canonical_merge']}",
                f"canonical_merge_tree: {proof['canonical_merge_tree']}",
                f"live_main_at_proof: {proof['live_main_at_proof']}",
                f"permanent_paths: {proof['permanent_path_count']}",
                f"selected_states: {' '.join(proof['selected_state_ids'])}",
                f"selected_fields: {' '.join(proof['selected_field_ids'])}",
                f"selected_substantive_cells: {proof['selected_substantive_cell_count']}",
                f"protocol_obligations: {proof['protocol_obligations']}",
                f"fixed_repository_route_cells: {proof['fixed_repository_route_cells']}",
                f"bounded_official_route_discovery_cells: {proof['bounded_official_route_discovery_cells']}",
                f"closed_schema_objects: {proof['closed_schema_objects']}",
                f"adversarial_refusals: {proof['adversarial_refusals']}",
                'complete_release_gate: pass',
                'clean_deterministic_replay: pass',
                'source_requests_executed: 0',
                'source_admissions: 0',
                'field_mutations: 0',
                'row_state_mutations: 0',
                'class_closed: false',
                'outside_human_dependency: false',
                f"runtime_repairs: {receipt['runtime_repair']['repair_count']}",
                f"orchestrator_receipt_sha256: {sha256(OUT / 'orchestrator-receipt.json')}",
            ])
            + '\n```\n\nThe exact workflow-free product was reconstructed or rebound over live main, merged under an unambiguous product ref, and independently proven before cleanup. RD-04-C02 and the cumulative ledger remain open; the bounded route-discovery acquisition is the next authorized transaction.\n',
            encoding='utf-8',
        )
    else:
        tail = (OUT / 'orchestrator.log').read_text(encoding='utf-8', errors='replace')[-20000:] if (OUT / 'orchestrator.log').exists() else receipt.get('traceback', '')
        body.write_text('RD-04 next-frontier protocol orchestrator v5 failed closed.\n\n```text\n' + tail + '\n```\n\nNo unverified merge, cleanup, acquisition, or additional authority is represented.\n', encoding='utf-8')
    run(['gh', 'issue', 'comment', '1017', '--repo', REPOSITORY, '--body-file', str(body)], check=False)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'orchestrator.log').write_text('', encoding='utf-8')
    receipt: dict[str, Any] = {'schema_version': 'ssc-rd04-next-frontier-protocol-orchestrator@5', 'status': 'running'}
    try:
        repair = recover_sources()
        run([sys.executable, str(OUT / 'materializer-v5.py')])
        material_path = Path('/tmp/ssc-rd04-next-frontier-protocol-v1/materialization-receipt.json')
        material = json.loads(material_path.read_text())
        if material.get('status') != 'complete':
            raise RuntimeError('materializer did not reach complete')
        pr = wait_for_pr()
        if pr.get('head', {}).get('sha') != material['product_head']:
            raise RuntimeError('open PR head does not equal materialized product')
        run([sys.executable, str(OUT / 'merge-controller-v5.py')])
        merge_path = Path('/tmp/ssc-rd04-next-frontier-protocol-merge-v2/merge-receipt.json')
        merge = json.loads(merge_path.read_text())
        if merge.get('status') != 'complete':
            raise RuntimeError('merge controller did not reach complete')
        run([sys.executable, str(OUT / 'proof-controller-v5.py')])
        proof_path = Path('/tmp/ssc-rd04-next-frontier-protocol-postmerge-proof-v2/postmerge-receipt.json')
        proof = json.loads(proof_path.read_text())
        if proof.get('status') != 'complete':
            raise RuntimeError('proof controller did not reach complete')
        if not (material['product_head'] == merge['product_head'] == proof['product_head']):
            raise RuntimeError('product head identity drift across phases')
        if not (material['product_tree'] == merge['product_tree'] == proof['product_tree']):
            raise RuntimeError('product tree identity drift across phases')
        if merge['canonical_merge'] != proof['canonical_merge']:
            raise RuntimeError('canonical merge identity drift across phases')
        receipt.update({
            'status': 'complete',
            'runtime_repair': repair,
            'materialization': material,
            'merge': merge,
            'proof': proof,
            'materialization_receipt_sha256': sha256(material_path),
            'merge_receipt_sha256': sha256(merge_path),
            'proof_receipt_sha256': sha256(proof_path),
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
        (OUT / 'orchestrator-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
        report(True, receipt)
        return 0
    except Exception as exc:
        receipt.update({'status': 'failed_closed', 'error': repr(exc), 'traceback': traceback.format_exc()})
        (OUT / 'orchestrator-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
        report(False, receipt)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
