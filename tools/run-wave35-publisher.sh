#!/usr/bin/env bash
set -euo pipefail

target='tools/run-wave35-materializer.sh'
python - "$target" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()

def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, observed {count}')
    text = text.replace(old, new, 1)

replace_once(
    "runner='tools/run-wave35-materializer.sh'\ntemporary_workflow='.github/workflows/temporary-wave35-materializer.yml'\n",
    "runner='tools/run-wave35-materializer.sh'\npublisher='tools/run-wave35-publisher.sh'\ntemporary_workflow='.github/workflows/temporary-wave35-materializer.yml'\npermanent_workflow='.github/workflows/lake-allocator-war-join-requirements-wave-35.yml'\n",
    'publisher variables',
)
replace_once(
    "  'tools/run-wave35-materializer.sh'\n)\nexpected_final_paths=(\n",
    "  'tools/run-wave35-materializer.sh'\n  'tools/run-wave35-publisher.sh'\n)\nexpected_final_paths=(\n",
    'transport allowlist',
)
replace_once(
    'git merge-base --is-ancestor "$base_head" HEAD || {\n',
    'initial_head="$(git rev-parse HEAD)"\ngit merge-base --is-ancestor "$base_head" HEAD || {\n',
    'initial head capture',
)
replace_once(
    'rm -f "${parts[@]}" "$runner"\n',
    'rm -f "${parts[@]}" "$runner" "$publisher"\n',
    'transport retirement',
)
replace_once(
    '''# Refuse publication over a descendant or sibling head.\ngit fetch origin "$branch"\nremote_head="$(git rev-parse FETCH_HEAD)"\nparent_head="$(git rev-parse HEAD^)"\n[[ "$remote_head" == "$parent_head" ]] || {\n  echo "Wave 35 stale-head refusal: remote=$remote_head parent=$parent_head" >&2\n  exit 1\n}\ngit push origin "HEAD:$branch"\necho "Wave 35 permanent checkpoint published: $(git rev-parse HEAD)"\n''',
    '''# Refuse publication over a descendant or sibling head. The validated sealed\n# tree contains the permanent workflow, but the Actions token cannot publish\n# workflow changes. Publish the identical tree minus that one entry as a\n# single child of the exact remote head; the GitHub app restores the verified\n# workflow blob immediately afterward.\ngit fetch origin "$branch"\nremote_head="$(git rev-parse FETCH_HEAD)"\n[[ "$remote_head" == "$initial_head" ]] || {\n  echo "Wave 35 stale-head refusal: remote=$remote_head initial=$initial_head" >&2\n  exit 1\n}\n\ngit read-tree "$sealed_tree"\ngit update-index --force-remove "$permanent_workflow"\npublish_tree="$(git write-tree)"\nmapfile -t omitted_paths < <(git diff-tree --no-commit-id --name-only -r "$publish_tree" "$sealed_tree" | sort)\n[[ "${omitted_paths[*]}" == "$permanent_workflow" ]] || {\n  printf 'Wave 35 workflow split drift\\nexpected omitted path:\\n%s\\nactual omitted paths:\\n%s\\n' "$permanent_workflow" "${omitted_paths[*]}" >&2\n  exit 1\n}\nworkflow_blob="$(git rev-parse "$sealed_tree:$permanent_workflow")"\npublish_commit="$(printf '%s\\n\\n%s\\n' \\\n  'Fan out allocator-war lawful join requirements Wave 35' \\\n  'Permanent workflow restored by the GitHub app after workflow-free publication.' | \\\n  git commit-tree "$publish_tree" -p "$remote_head")"\ngit reset --hard "$publish_commit"\ngit diff --check "$remote_head" "$publish_commit"\ngit push origin "HEAD:$branch"\necho "Wave 35 workflow-free checkpoint published: $(git rev-parse HEAD)"\necho "Wave 35 sealed full tree: $sealed_tree"\necho "Wave 35 permanent workflow blob: $workflow_blob"\n''',
    'publication split',
)
path.write_text(text)
PY

bash -n "$target"
exec bash "$target"
