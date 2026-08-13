#!/usr/bin/env python3
from pathlib import Path

path = Path('tools/temp-materialize-topology-frontier.py')
text = path.read_text(encoding='utf-8')
old = """def inherited_payload(name):
    parent = subprocess.check_output(['git', 'show', f'HEAD^:{WORKFLOW}'], text=True)
    match = re.search(rf'^\\s*{name}:\\s*(\\S+)\\s*$', parent, re.MULTILINE)
    if not match:
        raise SystemExit(f'missing inherited payload {name}')
    return gzip.decompress(base64.b64decode(match.group(1)))
"""
new = """def inherited_payload(name):
    commits = subprocess.check_output(
        ['git', 'rev-list', '--first-parent', 'HEAD'],
        text=True,
    ).splitlines()
    for commit in commits:
        try:
            source = subprocess.check_output(
                ['git', 'show', f'{commit}:{WORKFLOW}'],
                text=True,
                stderr=subprocess.DEVNULL,
            )
        except subprocess.CalledProcessError:
            continue
        match = re.search(rf'^\\s*{name}:\\s*(\\S+)\\s*$', source, re.MULTILINE)
        if match:
            return gzip.decompress(base64.b64decode(match.group(1)))
    raise SystemExit(f'missing inherited payload {name} in first-parent ancestry')
"""
count = text.count(old)
if count != 1:
    raise SystemExit(f'payload function denominator mismatch: {count}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
