import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'clifford-linkedin-crossings-'));
const input = path.join(fixture, 'roles.jsonl');
const output = path.join(fixture, 'crossings.jsonl');
const summary = path.join(fixture, 'summary.json');
const base = {
  schema_version: 'linkedin-profile-role-claim@1',
  series_id: 'series-1',
  subject: { label: 'Example Person', profile_url: 'https://www.linkedin.com/in/example' },
  object: { entity_type: 'organization' },
};
const rows = [
  { ...base, claim_id: 'public-1', capture_id: 'capture-1', object: { ...base.object, label: 'United States Department of Defense' }, role_title: 'Program Manager', stated_interval: { start: '2018-01-01', end: '2020-12-31', open_ended: false } },
  { ...base, claim_id: 'private-1', capture_id: 'capture-1', object: { ...base.object, label: 'Example Defense Systems' }, role_title: 'Vice President', stated_interval: { start: '2021-01-01', end: null, open_ended: true } },
  { ...base, claim_id: 'public-2', capture_id: 'capture-1', object: { ...base.object, label: 'Office of Congressman Example' }, role_title: 'Staff Member', stated_interval: { start: '2016-01-01', end: '2017-01-01', open_ended: false } },
  { ...base, claim_id: 'public-3', capture_id: 'capture-1', object: { ...base.object, label: 'Defense Technology Security Administration (DTSA)' }, role_title: 'Deputy Director', stated_interval: { start: '2019-01-01', end: '2020-12-31', open_ended: false } },
  { ...base, claim_id: 'malformed-1', capture_id: 'capture-1', object: { ...base.object, label: 'August 2014 - July 2016 (2 years)' }, role_title: 'Director of Operations', stated_interval: { start: '2014-01-01', end: '2016-12-31', open_ended: false } },
];
fs.writeFileSync(input, `${rows.map(row => JSON.stringify(row)).join('\n')}\n`);
execFileSync(process.execPath, ['tools/build-linkedin-role-crossings.mjs', '--input', input, '--output', output, '--summary', summary], { stdio: 'pipe' });
const candidates = fs.readFileSync(output, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
assert.equal(candidates.length, 3);
assert.ok(candidates.every(candidate => candidate.temporal_state === 'public_to_private_sequence'));
assert.ok(candidates.every(candidate => candidate.receipt_roles_satisfied.join(',') === 'self_claimed_public_role,self_claimed_private_role'));
assert.ok(candidates.every(candidate => candidate.graph_effect === 'none'));
assert.ok(candidates.every(candidate => candidate.forbidden_inferences.includes('crossing_proves_wrongdoing')));
assert.ok(!candidates.some(candidate => candidate.private_role.organization.startsWith('August 2014')));
fs.rmSync(fixture, { recursive: true, force: true });
console.log('linkedin-role-crossings.test.js: OK');
