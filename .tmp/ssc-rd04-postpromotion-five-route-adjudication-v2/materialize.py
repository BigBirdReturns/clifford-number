from __future__ import annotations

import base64
import copy
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tarfile
import traceback
from pathlib import Path, PurePosixPath
from typing import Any

import yaml
from jsonschema import Draft202012Validator

REPO = os.environ['GITHUB_REPOSITORY']
PRODUCT_PARENT = '91b386df809079884825b19a6b5d864b6e739172'
PRODUCT_PARENT_TREE = '7825098153b33c15418c973d1d04ff22eb50e015'
STAGING_BRANCH = 'staging/ssc-rd04-postpromotion-five-route-adjudication-ordinary-v1'
ARCHIVE_BYTES = 24972
ARCHIVE_SHA256 = '376ddae3369833e11c64aa6a6aacbeab91300c0162c72301cbf1d387ac3548e0'
WORKFLOW_PATH = '.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.yml'
WORKFLOW_BLOB = '6e85ed36416821131bbd5ddc9ee3b579a25859d6'
MANIFEST_REL = 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/product-manifest.json'
MANIFEST_BLOB = '35b45ee0946fa0fe344d2ec8b3fffbb0e0607d1b'
DATA_ROOT = Path('data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication')
SCHEMA_REL = 'schemas/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.schema.json'
BUILDER_REL = 'tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.mjs'
VALIDATOR_REL = 'tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.mjs'
TEST_REL = 'test/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.test.js'
CHUNK_DIR = Path('.tmp/ssc-rd04-postpromotion-five-route-adjudication-v1')
OUT = Path('/tmp/ssc-rd04-postpromotion-five-route-adjudication-materializer-v2')
PRODUCT = OUT / 'product'
FULL_WT = Path('/tmp/ssc-rd04-postpromotion-five-route-adjudication-full-v2')
STAGING_WT = Path('/tmp/ssc-rd04-postpromotion-five-route-adjudication-staging-v2')

CHUNKS = [
    ('chunk-00.b64', 5000, '160e09448b4b9320c43f51d6f5e253f4d49ac7120eeca865082e251847bb7304'),
    ('chunk-01.b64', 5000, 'c4c29e127cedd6bdbb62259f20ef9a4d5f1f651d7c372522439751b9353eda0c'),
    ('chunk-02.b64', 5000, 'ab2e21989347ab0af2d3195384e5f50dd92c183165ace8b7570ea126d869c5c1'),
    ('chunk-03.b64', 5000, '366a1c6554e1ad3c51c96cd65ec1af867a5e20eb87a40c997fa08612ffc25ec0'),
    ('chunk-04.b64', 5000, '7b8761d0801b15c1e5445fe6940078ed1437361a8dc30277a82fd1f240ef2ec9'),
    ('chunk-05.b64', 5000, '5c9433351969f979f5597cb38163f66f76d6d08df515fa9b0aa55875fb39f1d5'),
    ('chunk-06.b64', 3296, 'adc4ccd38c71c481b1d31add83401b216b781e2e5e8ab9e5ccc81718e9454da7'),
]

OBJECT_NAMES = [
    'capture-custody.json',
    'source-adjudications.json',
    'field-adjudications.json',
    'pdf-review-receipts.json',
    'promotion-candidate-protocol.json',
    'selected-followup-protocol.json',
    'index.json',
    'product-manifest.json',
]

LOG_PATH = OUT / 'materializer.log'
CURRENT_GATE = 'bootstrap'


def emit(message: str) -> None:
    text = str(message)
    print(text, flush=True)
    with LOG_PATH.open('a', encoding='utf-8') as handle:
        handle.write(text + '\n')


def set_gate(name: str) -> None:
    global CURRENT_GATE
    CURRENT_GATE = name
    (OUT / 'current-gate.txt').write_text(name + '\n', encoding='utf-8')
    emit(f'gate={name}')


def run(cmd: list[str], *, cwd: Path | None = None, check: bool = True, env: dict[str, str] | None = None) -> str:
    shown = ' '.join(cmd)
    emit(f'$ {shown}')
    process = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=env,
    )
    if process.stdout:
        for line in process.stdout.rstrip().splitlines():
            emit(line)
    if check and process.returncode != 0:
        raise RuntimeError(f'command failed ({process.returncode}): {shown}')
    return process.stdout or ''


def git(*args: str, cwd: Path | None = None, check: bool = True) -> str:
    return run(['git', *args], cwd=cwd, check=check).strip()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def git_blob(path: Path) -> str:
    return git('hash-object', str(path))


def copy_paths(source: Path, destination: Path, paths: list[str]) -> None:
    for relative in paths:
        src = source / relative
        dst = destination / relative
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)


def write_status(*, state: str, authority: str, error: str | None = None) -> dict[str, Any]:
    def read_optional(name: str) -> str | None:
        path = OUT / name
        return path.read_text(encoding='utf-8').strip() if path.exists() else None

    remote_staging = ''
    try:
        remote_staging = git('ls-remote', '--heads', 'origin', f'refs/heads/{STAGING_BRANCH}', check=False).split('\t')[0].strip()
    except Exception:
        remote_staging = ''
    value: dict[str, Any] = {
        'schema_version': 'ssc-rd04-postpromotion-five-route-adjudication-materializer-status@2',
        'qualification_state': state,
        'authority': authority,
        'failed_or_final_gate': CURRENT_GATE,
        'error': error,
        'product_parent': PRODUCT_PARENT,
        'product_parent_tree': PRODUCT_PARENT_TREE,
        'live_main': read_optional('live-main.txt'),
        'full_head': read_optional('full-head.txt'),
        'full_tree': read_optional('full-tree.txt'),
        'staging_branch': STAGING_BRANCH,
        'staging_head': read_optional('staging-head.txt'),
        'staging_tree': read_optional('staging-tree.txt'),
        'remote_staging_head': remote_staging or None,
        'product_archive_sha256': ARCHIVE_SHA256,
        'permanent_path_count': 14,
        'ordinary_path_count': 13,
        'transport_attempts_observed': 10,
        'unique_body_identities': 5,
        'narrow_source_admissions': 4,
        'field_decisions': 6,
        'promotion_candidates': 4,
        'held_fields': 2,
        'followup_routes': 2,
        'source_requests_executed_by_adjudication': 0,
        'field_classifications_created': 0,
        'field_terminalizations_created': 0,
        'matrix_updates': 0,
        'row_state_mutations': 0,
        'class_closed': False,
        'cumulative_ledger_effect': 'none',
        'outside_human_dependency': False,
        'publication_effect': 'none',
        'adoption_effect': 'none',
        'graph_effect': 'none',
    }
    (OUT / 'status.json').write_text(json.dumps(value, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    return value


def comment_issue(status: dict[str, Any]) -> None:
    if status['qualification_state'] == 'success':
        body = f"""RD-04 postpromotion five-route adjudication materialization completed.

```text
product_parent: {status['product_parent']}
product_parent_tree: {status['product_parent_tree']}
full_head: {status['full_head']}
full_tree: {status['full_tree']}
staging_branch: {status['staging_branch']}
staging_head: {status['staging_head']}
staging_tree: {status['staging_tree']}
permanent_paths: {status['permanent_path_count']}
ordinary_paths: {status['ordinary_path_count']}
transport_attempts_observed: {status['transport_attempts_observed']}
unique_bodies: {status['unique_body_identities']}
narrow_source_admissions: {status['narrow_source_admissions']}
field_decisions: {status['field_decisions']}
promotion_candidates: {status['promotion_candidates']}
held_fields: {status['held_fields']}
followup_routes: {status['followup_routes']}
source_requests_by_adjudication: {status['source_requests_executed_by_adjudication']}
field_terminalizations: {status['field_terminalizations_created']}
matrix_updates: {status['matrix_updates']}
row_state_mutations: {status['row_state_mutations']}
class_closed: {str(status['class_closed']).lower()}
```

The complete fourteen-path product passed YAML parsing, deterministic construction, eight-object recursive schema validation, sixteen nested and top-level mutation refusals, sixty-two adjudication refusals, no-magic-human, the complete release gate, and clean replay. The thirteen non-workflow blobs are published only as ordinary staging custody. No route was requested, no matrix cell or row was changed, and no class or cumulative-ledger authority was created.

The control question is whether the repository object channel composes these exact thirteen blobs with permanent workflow blob `{WORKFLOW_BLOB}` into the independently qualified full tree before opening the permanent PR."""
    else:
        body = f"""RD-04 postpromotion five-route adjudication materialization failed closed.

```text
failed_gate: {status['failed_or_final_gate']}
error: {status.get('error')}
product_parent: {status['product_parent']}
full_head: {status.get('full_head')}
staging_head: {status.get('staging_head')}
remote_staging_head: {status.get('remote_staging_head')}
source_requests_by_adjudication: {status['source_requests_executed_by_adjudication']}
matrix_updates: {status['matrix_updates']}
row_state_mutations: {status['row_state_mutations']}
class_closed: {str(status['class_closed']).lower()}
```

No permanent product, source expansion, field terminalization, matrix update, row mutation, class closure, cumulative-ledger change, publication, adoption, or graph authority is represented. The control question remains the exact failed gate above."""
    comment_path = OUT / 'issue-comment.md'
    comment_path.write_text(body + '\n', encoding='utf-8')
    env = os.environ.copy()
    run(['gh', 'issue', 'comment', '1017', '--repo', REPO, '--body-file', str(comment_path)], check=False, env=env)


def create_checksums() -> None:
    rows: list[str] = []
    for path in sorted(OUT.rglob('*')):
        if not path.is_file() or path.name == 'SHA256SUMS' or PRODUCT in path.parents:
            continue
        rows.append(f'{sha256_file(path)}  {path.relative_to(OUT)}')
    (OUT / 'SHA256SUMS').write_text('\n'.join(rows) + '\n', encoding='utf-8')


def validate_schema_tree(root: Path) -> None:
    schema = json.loads((root / SCHEMA_REL).read_text(encoding='utf-8'))
    validator = Draft202012Validator(schema)
    refusals = 0
    for name in OBJECT_NAMES:
        value = json.loads((root / DATA_ROOT / name).read_text(encoding='utf-8'))
        errors = sorted(validator.iter_errors(value), key=lambda error: list(error.path))
        if errors:
            raise RuntimeError(f'{name}: {errors[0].message} at {list(errors[0].path)}')
        top = copy.deepcopy(value)
        top['unreviewed_authority'] = True
        if not list(validator.iter_errors(top)):
            raise RuntimeError(f'{name} accepted top-level unknown key')
        refusals += 1
        nested = copy.deepcopy(value)
        target: dict[str, Any] | None = None
        stack: list[Any] = [nested]
        while stack and target is None:
            current = stack.pop()
            if isinstance(current, dict):
                for child in current.values():
                    if isinstance(child, dict):
                        target = child
                        break
                    if isinstance(child, list):
                        stack.append(child)
            elif isinstance(current, list):
                stack.extend(current)
        if target is None:
            raise RuntimeError(f'{name} lacks nested object')
        target['unreviewed_authority'] = True
        if not list(validator.iter_errors(nested)):
            raise RuntimeError(f'{name} accepted nested unknown key')
        refusals += 1
    emit(f'recursively_exact_schema_validation=pass objects={len(OBJECT_NAMES)} mutation_refusals={refusals}')


def qualify_full_tree(root: Path) -> None:
    set_gate('qualify-full-fourteen-path-candidate')
    parsed = yaml.safe_load((root / WORKFLOW_PATH).read_text(encoding='utf-8'))
    if not isinstance(parsed, dict):
        raise RuntimeError('workflow YAML did not parse to an object')
    for relative in (BUILDER_REL, VALIDATOR_REL, TEST_REL):
        run(['node', '--check', relative], cwd=root)
    run(['node', BUILDER_REL], cwd=root)
    run(['git', 'diff', '--exit-code', '--', str(DATA_ROOT)], cwd=root)
    validate_schema_tree(root)
    validation = run(['node', VALIDATOR_REL], cwd=root)
    (OUT / 'validation.json').write_text(validation, encoding='utf-8')
    adversarial = run(['node', TEST_REL], cwd=root)
    (OUT / 'adversarial.json').write_text(adversarial, encoding='utf-8')
    run(['node', 'tools/validate-no-magic-human-gate.mjs'], cwd=root)
    run(['node', 'test/no-magic-human-gate.test.js'], cwd=root)
    run(['npm', 'run', 'release:check'], cwd=root)
    run(['git', 'reset', '--hard', 'HEAD'], cwd=root)
    run(['git', 'clean', '-fdx'], cwd=root)
    run(['node', BUILDER_REL, '--write'], cwd=root)
    run(['node', BUILDER_REL], cwd=root)
    validation_replay = run(['node', VALIDATOR_REL], cwd=root)
    (OUT / 'validation-replay.json').write_text(validation_replay, encoding='utf-8')
    adversarial_replay = run(['node', TEST_REL], cwd=root)
    (OUT / 'adversarial-replay.json').write_text(adversarial_replay, encoding='utf-8')
    run(['node', 'tools/validate-no-magic-human-gate.mjs'], cwd=root)
    run(['git', 'diff', '--check'], cwd=root)
    run(['git', 'diff', '--exit-code'], cwd=root)
    status = run(['git', 'status', '--porcelain=v1', '--untracked-files=all'], cwd=root)
    if status.strip():
        raise RuntimeError(f'dirty tree after replay:\n{status}')


def main() -> None:
    for path in (OUT, FULL_WT, STAGING_WT):
        shutil.rmtree(path, ignore_errors=True)
    OUT.mkdir(parents=True)
    PRODUCT.mkdir(parents=True)
    LOG_PATH.write_text('', encoding='utf-8')

    set_gate('authenticate-seven-archive-chunks')
    actual = sorted(path.name for path in CHUNK_DIR.glob('chunk-*.b64'))
    expected = [name for name, _, _ in CHUNKS]
    if actual != expected:
        raise RuntimeError(f'chunk denominator mismatch: {actual}')
    encoded = bytearray()
    chunk_receipts = []
    for name, expected_bytes, expected_sha in CHUNKS:
        path = CHUNK_DIR / name
        data = path.read_bytes()
        observed_sha = hashlib.sha256(data).hexdigest()
        if len(data) != expected_bytes or observed_sha != expected_sha:
            raise RuntimeError(f'chunk identity mismatch: {name}')
        encoded.extend(data)
        chunk_receipts.append({'name': name, 'bytes': len(data), 'sha256': observed_sha})
    (OUT / 'chunk-ledger.json').write_text(json.dumps(chunk_receipts, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    archive = base64.b64decode(bytes(encoded), validate=True)
    archive_path = OUT / 'product.tar.xz'
    archive_path.write_bytes(archive)
    if len(archive) != ARCHIVE_BYTES or hashlib.sha256(archive).hexdigest() != ARCHIVE_SHA256:
        raise RuntimeError('product archive identity mismatch')

    set_gate('extract-and-verify-fourteen-path-archive')
    with tarfile.open(archive_path, mode='r:xz') as bundle:
        members = [member for member in bundle.getmembers() if member.isfile()]
        normalized: list[str] = []
        for member in members:
            row = member.name
            if not row.startswith('./'):
                raise RuntimeError(f'non-relative archive path: {row}')
            relative = row[2:]
            pure = PurePosixPath(relative)
            if pure.is_absolute() or '..' in pure.parts or relative.startswith('.tmp/') or '.trigger' in pure.parts:
                raise RuntimeError(f'unsafe archive path: {relative}')
            normalized.append(relative)
        if len(normalized) != 14 or len(set(normalized)) != 14:
            raise RuntimeError(f'archive path denominator mismatch: {len(normalized)}')
        bundle.extractall(PRODUCT)
    archive_paths = sorted(normalized)
    (OUT / 'archive-paths.txt').write_text('\n'.join(archive_paths) + '\n', encoding='utf-8')

    set_gate('verify-product-manifest-and-identities')
    manifest_path = PRODUCT / MANIFEST_REL
    if git_blob(manifest_path) != MANIFEST_BLOB:
        raise RuntimeError('product manifest blob mismatch')
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    permanent_paths = sorted(manifest['permanent_paths'])
    actual_paths = sorted(str(path.relative_to(PRODUCT)) for path in PRODUCT.rglob('*') if path.is_file())
    if manifest['permanent_path_count'] != 14 or permanent_paths != archive_paths or actual_paths != permanent_paths:
        raise RuntimeError('manifest, archive, and extracted path sets differ')
    rows = manifest['hashed_files']
    if manifest['hashed_file_count'] != 13 or len(rows) != 13:
        raise RuntimeError('manifest hash denominator mismatch')
    for row in rows:
        path = PRODUCT / row['path']
        if len(path.read_bytes()) != row['bytes'] or sha256_file(path) != row['sha256'] or git_blob(path) != row['git_blob']:
            raise RuntimeError(f'manifest identity mismatch: {row["path"]}')
    if git_blob(PRODUCT / WORKFLOW_PATH) != WORKFLOW_BLOB:
        raise RuntimeError('permanent workflow blob mismatch')
    ordinary_paths = [path for path in permanent_paths if path != WORKFLOW_PATH]
    if len(ordinary_paths) != 13:
        raise RuntimeError('ordinary path denominator mismatch')
    (OUT / 'expected-paths.txt').write_text('\n'.join(permanent_paths) + '\n', encoding='utf-8')
    (OUT / 'ordinary-paths.txt').write_text('\n'.join(ordinary_paths) + '\n', encoding='utf-8')

    set_gate('bind-canonical-parent-and-main-lease')
    git('fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main')
    live_main = git('rev-parse', 'origin/main')
    (OUT / 'live-main.txt').write_text(live_main + '\n', encoding='utf-8')
    if live_main != PRODUCT_PARENT:
        raise RuntimeError(f'live main advanced: {live_main}')
    if git('rev-parse', f'{PRODUCT_PARENT}^{{tree}}') != PRODUCT_PARENT_TREE:
        raise RuntimeError('product parent tree mismatch')

    set_gate('construct-full-fourteen-path-candidate')
    git('worktree', 'add', '--detach', str(FULL_WT), PRODUCT_PARENT)
    copy_paths(PRODUCT, FULL_WT, permanent_paths)
    git('add', '--all', cwd=FULL_WT)
    changed = sorted(filter(None, git('diff', '--cached', '--name-only', '--diff-filter=ACDMRTUXB', cwd=FULL_WT).splitlines()))
    added = sorted(filter(None, git('diff', '--cached', '--name-only', '--diff-filter=A', cwd=FULL_WT).splitlines()))
    if changed != permanent_paths or added != permanent_paths:
        raise RuntimeError('full candidate is not exact fourteen-path addition-only product')
    git('diff', '--cached', '--check', cwd=FULL_WT)
    git('config', 'user.name', 'BigBirdReturns', cwd=FULL_WT)
    git('config', 'user.email', 'actions@users.noreply.github.com', cwd=FULL_WT)
    git('commit', '-m', 'Adjudicate RD-04 postpromotion five-route capture', cwd=FULL_WT)
    full_head = git('rev-parse', 'HEAD', cwd=FULL_WT)
    full_tree = git('rev-parse', 'HEAD^{tree}', cwd=FULL_WT)
    (OUT / 'full-head.txt').write_text(full_head + '\n', encoding='utf-8')
    (OUT / 'full-tree.txt').write_text(full_tree + '\n', encoding='utf-8')
    if git('rev-parse', 'HEAD^', cwd=FULL_WT) != PRODUCT_PARENT:
        raise RuntimeError('full candidate parent mismatch')
    if int(git('rev-list', '--count', f'{PRODUCT_PARENT}..HEAD', cwd=FULL_WT)) != 1:
        raise RuntimeError('full candidate commit denominator mismatch')
    if git('rev-parse', f'HEAD:{WORKFLOW_PATH}', cwd=FULL_WT) != WORKFLOW_BLOB:
        raise RuntimeError('full candidate workflow blob mismatch')
    if git('rev-parse', f'HEAD:{MANIFEST_REL}', cwd=FULL_WT) != MANIFEST_BLOB:
        raise RuntimeError('full candidate manifest blob mismatch')

    qualify_full_tree(FULL_WT)

    set_gate('construct-thirteen-path-ordinary-staging')
    git('worktree', 'add', '--detach', str(STAGING_WT), PRODUCT_PARENT)
    copy_paths(PRODUCT, STAGING_WT, ordinary_paths)
    git('add', '--all', cwd=STAGING_WT)
    changed = sorted(filter(None, git('diff', '--cached', '--name-only', '--diff-filter=ACDMRTUXB', cwd=STAGING_WT).splitlines()))
    added = sorted(filter(None, git('diff', '--cached', '--name-only', '--diff-filter=A', cwd=STAGING_WT).splitlines()))
    if changed != ordinary_paths or added != ordinary_paths:
        raise RuntimeError('ordinary staging is not exact thirteen-path addition-only product')
    git('diff', '--cached', '--check', cwd=STAGING_WT)
    git('config', 'user.name', 'BigBirdReturns', cwd=STAGING_WT)
    git('config', 'user.email', 'actions@users.noreply.github.com', cwd=STAGING_WT)
    git('commit', '-m', 'Stage ordinary RD-04 postpromotion five-route adjudication blobs', cwd=STAGING_WT)
    local_staging_head = git('rev-parse', 'HEAD', cwd=STAGING_WT)
    local_staging_tree = git('rev-parse', 'HEAD^{tree}', cwd=STAGING_WT)
    if git('rev-parse', 'HEAD^', cwd=STAGING_WT) != PRODUCT_PARENT:
        raise RuntimeError('staging parent mismatch')
    for relative in ordinary_paths:
        if git('rev-parse', f'HEAD:{relative}', cwd=FULL_WT) != git('rev-parse', f'HEAD:{relative}', cwd=STAGING_WT):
            raise RuntimeError(f'full/staging blob mismatch: {relative}')

    set_gate('publish-or-reconcile-ordinary-staging-ref')
    git('fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main')
    if git('rev-parse', 'origin/main') != PRODUCT_PARENT:
        raise RuntimeError('main lease changed before staging publication')
    remote_line = git('ls-remote', '--heads', 'origin', f'refs/heads/{STAGING_BRANCH}', check=False)
    if remote_line:
        remote_head = remote_line.split()[0]
        git('fetch', '--no-tags', 'origin', f'+refs/heads/{STAGING_BRANCH}:refs/remotes/origin/{STAGING_BRANCH}')
        if git('rev-parse', f'{remote_head}^') != PRODUCT_PARENT:
            raise RuntimeError('existing staging ref has wrong parent')
        remote_changed = sorted(filter(None, git('diff', '--name-only', '--diff-filter=ACDMRTUXB', PRODUCT_PARENT, remote_head).splitlines()))
        remote_added = sorted(filter(None, git('diff', '--name-only', '--diff-filter=A', PRODUCT_PARENT, remote_head).splitlines()))
        if remote_changed != ordinary_paths or remote_added != ordinary_paths:
            raise RuntimeError('existing staging ref has wrong path denominator')
        for relative in ordinary_paths:
            if git('rev-parse', f'{remote_head}:{relative}') != git('rev-parse', f'{local_staging_head}:{relative}', cwd=STAGING_WT):
                raise RuntimeError(f'existing staging blob mismatch: {relative}')
        staging_head = remote_head
        staging_tree = git('rev-parse', f'{remote_head}^{{tree}}')
        emit(f'existing staging ref reconciled: {remote_head}')
    else:
        git('push', 'origin', f'HEAD:refs/heads/{STAGING_BRANCH}', cwd=STAGING_WT)
        staging_head = git('ls-remote', '--heads', 'origin', f'refs/heads/{STAGING_BRANCH}').split()[0]
        if staging_head != local_staging_head:
            raise RuntimeError('published staging head mismatch')
        staging_tree = local_staging_tree
    (OUT / 'staging-head.txt').write_text(staging_head + '\n', encoding='utf-8')
    (OUT / 'staging-tree.txt').write_text(staging_tree + '\n', encoding='utf-8')

    set_gate('seal-qualified-product-custody')
    qualified_archive = OUT / 'qualified-product.tar.xz'
    shutil.copy2(archive_path, qualified_archive)
    (OUT / 'qualified-product.tar.xz.sha256').write_text(f'{sha256_file(qualified_archive)}  qualified-product.tar.xz\n', encoding='utf-8')
    (OUT / 'full-tree-rows.txt').write_text(git('ls-tree', '-r', full_head, '--', *permanent_paths) + '\n', encoding='utf-8')
    (OUT / 'staging-tree-rows.txt').write_text(git('ls-tree', '-r', staging_head, '--', *ordinary_paths) + '\n', encoding='utf-8')
    set_gate('complete')
    status = write_status(state='success', authority='ordinary_staging_custody_only')
    create_checksums()
    comment_issue(status)


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        try:
            emit(traceback.format_exc())
            status = write_status(state='failure', authority='none', error=str(exc))
            create_checksums()
            comment_issue(status)
        except Exception:
            traceback.print_exc()
        sys.exit(1)
