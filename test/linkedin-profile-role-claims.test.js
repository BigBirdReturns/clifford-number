import { execFileSync } from 'node:child_process';

execFileSync(process.execPath, [
  'tools/extract-linkedin-profile-claims.mjs',
  '--self-test',
], { stdio: 'pipe' });

console.log('linkedin-profile-role-claims.test.js: OK');
