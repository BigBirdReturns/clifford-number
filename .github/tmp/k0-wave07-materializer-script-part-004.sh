pistemic-admissibility.mjs',
  'tools/validate-k0-role-neutral-wave-06.mjs',
  'tools/validate-k0-role-neutral-wave-07.mjs',
]
before = {p: hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in paths}
subprocess.run(['node','tools/build-k0-role-neutral-wave-06.mjs'], check=True)
subprocess.run(['node','tools/build-k0-role-neutral-wave-07.mjs'], check=True)
subprocess.run(['node','tools/build-k0-epistemic-admissibility.mjs'], check=True)
after = {p: hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in paths}
assert before == after, {p: (before[p], after[p]) for p in paths if before[p] != after[p]}
print(json.dumps({'deterministic': True, 'paths': len(paths)}, indent=2))
PY

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
rm .github/workflows/k0-role-neutral-wave-07.yml

python - <<'PY' > /tmp/k0-wave07-trans