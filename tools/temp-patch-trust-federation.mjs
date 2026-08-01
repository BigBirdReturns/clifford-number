import { readFileSync, writeFileSync } from 'node:fs';

const path = 'tools/lib/preference-trust-federation.mjs';
const source = readFileSync(path, 'utf8');
const before = "  if (state?.replay_state === 'blocked' && state?.implementation_state !== 'blocked') errors.push(`world ${worldId} organization ${orgId} blocked replay must preserve blocked implementation`);";
const after = "  if (state?.replay_state === 'blocked' && state?.contractual_authority !== false && state?.implementation_state !== 'blocked') errors.push(`world ${worldId} organization ${orgId} blocked replay under retained contractual authority must preserve blocked implementation`);";

if (!source.includes(before)) {
  throw new Error('expected trust-federation validator line not found');
}
if (source.includes(after)) {
  throw new Error('trust-federation validator repair already applied');
}

const patched = source.replace(before, after);
if (patched === source || patched.split(after).length !== 2) {
  throw new Error('trust-federation validator replacement was not exact');
}
writeFileSync(path, patched);
console.log('patched blocked-replay validation to preserve the contractual-authority-gap world');
