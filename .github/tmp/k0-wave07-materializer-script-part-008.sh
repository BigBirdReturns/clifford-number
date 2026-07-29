html',
  'reports/core-thesis/answerable-power/k0.json',
  'test/k0-epistemic-admissibility.test.js',
  'test/k0-role-neutral-wave-07.test.js',
  'tools/build-k0-epistemic-admissibility.mjs',
  'tools/build-k0-role-neutral-wave-07.mjs',
  'tools/validate-k0-epistemic-admissibility.mjs',
  'tools/validate-k0-role-neutral-wave-06.mjs',
  'tools/validate-k0-role-neutral-wave-07.mjs',
}
transport = set(open('/tmp/k0-wave07-transport-paths', encoding='utf-8').read().splitlines())
actual = set(subprocess.check_output(['git','diff','--cached','--name-only'], text=True).splitlines())
expected = permanent | transport
assert actual == expected, f'path mismatch\nmissing={sorted(expected-actual)}\nextra={sorted(actual-expected)}'
assert len(permanent) == 22 and len(actual) == len(permanent) + len(transport)
assert not any(p.startswith('build/') or p.startswith('dist/') or p.startswith('.github/workf