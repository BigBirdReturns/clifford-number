port-paths
import glob
patterns = {
  '.github/tmp/k0-wave07-source-part-*.b64': 5,
  '.github/tmp/k0-wave07-exact-*.b64': 3,
  '.github/tmp/k0-wave07-rebuild-part-*.b64': 2,
  '.github/tmp/k0-wave07-blob-part-*.b64': 45,
  '.github/tmp/k0-wave07-materializer-script-part-*.sh': 10,
}
paths = []
for pattern, expected in patterns.items():
  matches = sorted(glob.glob(pattern))
  assert len(matches) == expected, f'{pattern}: expected {expected}, got {len(matches)}'
  paths.extend(matches)
assert len(paths) == len(set(paths))
print('\n'.join(sorted(paths)))
PY
xargs -d '\n' git rm -- < /tmp/k0-wave07-transport-paths

git add \
  data/project/k0-epistemic-admissibility-methodology.json \
  data/project/k0-epistemic-admissibility-release-manifest.json \
  data/project/k0-role-neutral-wave-06-release-manifest.json \
  data/project/k0-role-neutral-wave-07-release-manifest.json \
  data/research/