#!/usr/bin/env python3
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit('usage: ssc-rd06-fourth-closure-export-v2.py <repo> <output>')

root = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2]).resolve()

PATHS = [
    'data/project/ssc-residual-wave02/closures/RD-06-C01.json',
    'data/research/status-sovereignty-rd-wave02-rd06-offeror-universe/class-receipt.json',
    'data/research/status-sovereignty-rd-wave02-rd06-offeror-universe/manifest.json',
    'docs/milestones/ssc-rd-wave02-rd06-offeror-universe.md',
    'test/status-sovereignty-rd-wave02-rd06-offeror-universe.test.js',
    'tools/build-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs',
    'tools/validate-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs',
]


def run(*args: str, capture: bool = False) -> str:
    proc = subprocess.run(
        list(args), cwd=root, text=True, capture_output=capture, check=False
    )
    if proc.returncode != 0:
        if capture:
            sys.stderr.write(proc.stdout)
            sys.stderr.write(proc.stderr)
        raise SystemExit(f"command failed ({proc.returncode}): {' '.join(args)}")
    return proc.stdout.strip() if capture else ''


def replace_exact(rel: str, old: str, new: str, count: int = 1) -> None:
    path = root / rel
    text = path.read_text()
    observed = text.count(old)
    if observed != count:
        raise SystemExit(f'{rel}: expected {count} occurrences, observed {observed}: {old!r}')
    path.write_text(text.replace(old, new))

research_head = run('git', 'rev-parse', 'HEAD', capture=True)
remote_research = run(
    'bash', '-lc',
    "git ls-remote --heads origin refs/heads/agent/ssc-rd-wave02-rd06-offeror-universe | cut -f1",
    capture=True,
)
if remote_research != research_head:
    raise SystemExit(f'RD-06 lease changed: local {research_head}, remote {remote_research}')

run('git', 'fetch', '--no-tags', 'origin', 'main')
main_head = run('git', 'rev-parse', 'FETCH_HEAD', capture=True)
for rel in [
    'data/research/status-sovereignty-residual-denominator-wave-02-current.json',
    'data/project/ssc-residual-wave02/closures/RD-01-C03.json',
    'data/project/ssc-residual-wave02/closures/RD-04-C01.json',
    'data/project/ssc-residual-wave02/closures/RD-05-C03.json',
]:
    local_blob = run('git', 'rev-parse', f'HEAD:{rel}', capture=True)
    main_blob = run('git', 'rev-parse', f'FETCH_HEAD:{rel}', capture=True)
    if local_blob != main_blob:
        raise SystemExit(f'current-ledger custody differs at {rel}')

current = json.loads((root / 'data/research/status-sovereignty-residual-denominator-wave-02-current.json').read_text())
assert current['counts']['canonical_residual_classes'] == 42
assert current['counts']['closed_residual_classes'] == 3
assert current['counts']['open_residual_classes'] == 39
assert current['current_result']['closed_class_ids'] == ['RD-04-C01', 'RD-05-C03', 'RD-01-C03']
assert 'RD-06-C01' in current['current_result']['open_selected_class_ids']

old_key = 'residual_atlas_effect_if_promoted_after_rd04_and_rd05'
new_key = 'residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01'

builder = 'tools/build-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs'
replace_exact(builder, old_key, new_key, 3)
replace_exact(
    builder,
    "      canonical_classes: 42,\n      open_before: 40,\n      closed_before: 2,\n      open_after: 39,\n      closed_after: 3",
    "      canonical_classes: 42,\n      open_before: 39,\n      closed_before: 3,\n      open_after: 38,\n      closed_after: 4",
)

validator = 'tools/validate-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs'
replace_exact(validator, old_key, new_key, 3)
replace_exact(
    validator,
    "{ canonical_classes: 42, open_before: 40, closed_before: 2, open_after: 39, closed_after: 3 }",
    "{ canonical_classes: 42, open_before: 39, closed_before: 3, open_after: 38, closed_after: 4 }",
)
replace_exact(
    validator,
    "current?.counts?.closed_residual_classes === 2 && current?.counts?.open_residual_classes === 40",
    "current?.counts?.closed_residual_classes === 3 && current?.counts?.open_residual_classes === 39",
)
replace_exact(
    validator,
    "['RD-04-C01','RD-05-C03']",
    "['RD-04-C01','RD-05-C03','RD-01-C03']",
)

suite = 'test/status-sovereignty-rd-wave02-rd06-offeror-universe.test.js'
replace_exact(suite, old_key, new_key)

milestone = 'docs/milestones/ssc-rd-wave02-rd06-offeror-universe.md'
replace_exact(
    milestone,
    'atlas before promotion:\n40 open / 2 closed\n\natlas after promotion:\n39 open / 3 closed',
    'atlas before promotion:\n39 open / 3 closed\n\natlas after promotion:\n38 open / 4 closed',
)

run('node', builder, '--write')
run('node', validator)
run('node', suite)
run('node', 'tools/validate-no-magic-human-gate.mjs')
run('git', 'diff', '--check')

observed = sorted(filter(None, run('git', 'diff', '--name-only', capture=True).splitlines()))
if observed != sorted(PATHS):
    raise SystemExit(f'unexpected changed paths before qualification: {observed}')

run('git', 'add', '--', *PATHS)
staged = sorted(filter(None, run('git', 'diff', '--cached', '--name-only', capture=True).splitlines()))
if staged != sorted(PATHS):
    raise SystemExit(f'unexpected staged paths: {staged}')

run('npm', 'run', 'release:check')
run('git', 'restore', '--worktree', '--', '.')
run('git', 'clean', '-fdx')
run('git', 'diff', '--exit-code')
run('node', builder, '--check')
run('node', validator)
run('node', suite)
run('node', 'tools/validate-no-magic-human-gate.mjs')
run('git', 'diff', '--exit-code')

remote_research_after = run(
    'bash', '-lc',
    "git ls-remote --heads origin refs/heads/agent/ssc-rd-wave02-rd06-offeror-universe | cut -f1",
    capture=True,
)
if remote_research_after != research_head:
    raise SystemExit('RD-06 moved during qualification')
run('git', 'fetch', '--no-tags', 'origin', 'main')
main_after = run('git', 'rev-parse', 'FETCH_HEAD', capture=True)
if main_after != main_head:
    raise SystemExit(f'main moved during qualification: {main_head} -> {main_after}')

if out.exists():
    shutil.rmtree(out)
out.mkdir(parents=True)
entries = []
for rel in sorted(PATHS):
    src = root / rel
    dst = out / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    data = dst.read_bytes()
    entries.append({'path': rel, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})

combined = hashlib.sha256(
    '\n'.join(f"{row['sha256']}  {row['path']}" for row in entries).encode()
).hexdigest()
closure = json.loads((root / PATHS[0]).read_text())
receipt = json.loads((root / PATHS[1]).read_text())
manifest = {
    'schema_version': 'ssc-rd06-wave02-fourth-closure-export@2',
    'research_head': research_head,
    'main_head': main_head,
    'entry_count': len(entries),
    'combined_sha256': combined,
    'atlas_before': {'open': 39, 'closed': 3},
    'atlas_after': {'open': 38, 'closed': 4},
    'terminal_state': receipt['terminal_state'],
    'class_closed': receipt['class_closed'],
    'proposal_slots': receipt['counts']['proposal_slots'],
    'terminal_slots': receipt['counts']['identity_and_disposition_terminal_slots'],
    'product_manifest_sha256': closure['product']['manifest_combined_sha256'],
    'outside_human_dependency': False,
    'external_contacts': 0,
    'external_reviews': 0,
    'publication_effect': 'none',
    'adoption_effect': 'none',
    'graph_effect': 'none',
    'entries': entries,
}
(out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest, indent=2))
