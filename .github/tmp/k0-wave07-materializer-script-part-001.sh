 'test/k0-role-neutral-wave-07.test.js',
  'tools/build-k0-epistemic-admissibility.mjs',
  'tools/build-k0-role-neutral-wave-07.mjs',
  'tools/validate-k0-epistemic-admissibility.mjs',
  'tools/validate-k0-role-neutral-wave-06.mjs',
  'tools/validate-k0-role-neutral-wave-07.mjs',
}
with tarfile.open('/tmp/k0-wave07-source.tar.gz', 'r:gz') as tf:
  actual = {m.name.removeprefix('./') for m in tf.getmembers() if m.isfile()}
  assert actual == expected, f'bundle path mismatch\nmissing={sorted(expected-actual)}\nextra={sorted(actual-expected)}'
  for member in tf.getmembers():
    name = member.name.removeprefix('./')
    assert name and not name.startswith('/') and '..' not in name.split('/'), name
print(f'exact source denominator: {len(actual)}')
PY
  tar -xzf /tmp/k0-wave07-source.tar.gz
}

run_focused() {
  node tools/build-k0-role-neutral-wave-06.mjs
  node tools/build-k0-role-neutral-w