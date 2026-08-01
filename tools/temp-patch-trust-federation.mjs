import { readFileSync, writeFileSync } from 'node:fs';

const repairs = [
  {
    path: 'tools/lib/preference-trust-federation.mjs',
    before: "  if (state?.replay_state === 'blocked' && state?.implementation_state !== 'blocked') errors.push(`world ${worldId} organization ${orgId} blocked replay must preserve blocked implementation`);",
    after: "  if (state?.replay_state === 'blocked' && state?.contractual_authority !== false && state?.implementation_state !== 'blocked') errors.push(`world ${worldId} organization ${orgId} blocked replay under retained contractual authority must preserve blocked implementation`);",
    label: 'blocked-replay validation'
  },
  {
    path: 'test/preference-trust-federation.test.js',
    before: "assert.throws(() => compilePreferenceTrustFederationFixture(authorityLaundering), /contractual_authority_gap_present mismatch/);",
    after: "assert.throws(() => compilePreferenceTrustFederationFixture(authorityLaundering), /blocked replay under retained contractual authority must preserve blocked implementation|contractual_authority_gap_present mismatch/);",
    label: 'authority-laundering refusal expectation'
  }
];

for (const repair of repairs) {
  const source = readFileSync(repair.path, 'utf8');
  if (!source.includes(repair.before)) {
    throw new Error(`expected ${repair.label} source text not found in ${repair.path}`);
  }
  if (source.includes(repair.after)) {
    throw new Error(`${repair.label} already applied in ${repair.path}`);
  }
  const patched = source.replace(repair.before, repair.after);
  if (patched === source || patched.split(repair.after).length !== 2) {
    throw new Error(`${repair.label} replacement was not exact in ${repair.path}`);
  }
  writeFileSync(repair.path, patched);
  console.log(`patched ${repair.label}`);
}
