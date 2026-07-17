#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { root } from './lib/ledger.mjs';
import { temporalRelation } from './lib/temporal-interval.mjs';

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const resolve = location => path.isAbsolute(location) ? location : path.join(root, location);
const input = resolve(value('input', 'data/local/linkedin-profile-role-claims.jsonl'));
const output = resolve(value('output', 'data/local/linkedin-role-crossing-candidates.jsonl'));
const summaryOutput = resolve(value('summary', 'data/local/linkedin-role-crossing-summary.json'));
const clean = inputValue => String(inputValue ?? '').replace(/\s+/g, ' ').trim();
const normalized = inputValue => clean(inputValue).normalize('NFKC').toLocaleLowerCase('en-US');

if (!fs.existsSync(input)) throw new Error(`LinkedIn role-claim input not found: ${input}`);
const roles = fs.readFileSync(input, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const publicPattern = new RegExp([
  '\\bu\\.?s\\.? (army|navy|air force|marine corps|coast guard|space force)\\b',
  '\\bunited states (army|navy|air force|marine corps|department|government)\\b',
  '\\bdepartment of (defense|defence|state|commerce|energy|homeland security|transportation)\\b',
  '\\boffice of the secretary of defense\\b',
  '\\boffice of (congressman|congresswoman|representative|senator)\\b',
  '\\bdefense technology security administration\\b',
  '\\bthe pentagon\\b',
  '\\bu\\.?s\\.? navy reserve\\b',
  '\\bembassy of [a-z][a-z .-]+\\b',
  '\\bnaval (sea systems command|special warfare|postgraduate school|research laboratory|air systems command)\\b',
  '\\bair force special operations command\\b',
  '\\b(darpa|nasa|white house|national security council|senate|house of representatives|congress)\\b',
  '\\bministry of defen[cs]e\\b',
  '\\barmed forces\\b',
  '\\bgovernment\\b',
].join('|'), 'i');
const excludedPrivatePattern = /\b(university|college|school|academy|self employed|family operations)\b/i;
const malformedOrganizationPattern = /^(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\s+-/i;

const bySubject = new Map();
for (const role of roles) {
  const key = role.series_id ?? normalized(role.subject?.profile_url ?? role.subject?.label);
  if (!bySubject.has(key)) bySubject.set(key, []);
  bySubject.get(key).push(role);
}

const dedupe = new Set();
const candidates = [];
for (const subjectRoles of bySubject.values()) {
  const publicRoles = subjectRoles.filter(role => (
    clean(role.role_title)
    && publicPattern.test(clean(role.object?.label))
  ));
  const privateRoles = subjectRoles.filter(role => {
    const organization = clean(role.object?.label);
    return clean(role.role_title)
      && organization
      && !publicPattern.test(organization)
      && !excludedPrivatePattern.test(organization)
      && !malformedOrganizationPattern.test(organization);
  });
  for (const publicRole of publicRoles) {
    for (const privateRole of privateRoles) {
      if (normalized(publicRole.object?.label) === normalized(privateRole.object?.label)) continue;
      const key = [
        publicRole.series_id,
        normalized(publicRole.object?.label),
        normalized(publicRole.role_title),
        normalized(privateRole.object?.label),
        normalized(privateRole.role_title),
      ].join('\0');
      if (dedupe.has(key)) continue;
      dedupe.add(key);
      const publicInterval = publicRole.stated_interval ?? {};
      const privateInterval = privateRole.stated_interval ?? {};
      let temporalState = temporalRelation(publicInterval, privateInterval);
      if (publicInterval.end && privateInterval.start && publicInterval.end < privateInterval.start) {
        temporalState = 'public_to_private_sequence';
      } else if (
        publicRole.capture_id === privateRole.capture_id
        && publicInterval.open_ended
        && privateInterval.open_ended
      ) {
        temporalState = 'observed_dual_hat_at_capture';
      }
      candidates.push({
        schema_version: 'linkedin-role-crossing-candidate@1',
        candidate_id: `licross_${crypto.createHash('sha256').update(key).digest('hex').slice(0, 24)}`,
        subject: publicRole.subject,
        public_role: {
          organization: publicRole.object?.label,
          title: publicRole.role_title,
          stated_interval: publicInterval,
          claim_id: publicRole.claim_id,
        },
        private_role: {
          organization: privateRole.object?.label,
          title: privateRole.role_title,
          stated_interval: privateInterval,
          claim_id: privateRole.claim_id,
        },
        temporal_state: temporalState,
        evidence_state: 'inferred',
        source_basis: 'two_self_claimed_role_tuples_from_preserved_linkedin_profile_pdf',
        receipt_roles_satisfied: ['self_claimed_public_role', 'self_claimed_private_role'],
        verification_status: 'machine_proposed_pending_review',
        graph_effect: 'none',
        forbidden_inferences: [
          'crossing_proves_influence',
          'crossing_proves_procurement_role',
          'crossing_proves_coordination',
          'crossing_proves_wrongdoing',
        ],
      });
    }
  }
}

candidates.sort((a, b) => a.candidate_id.localeCompare(b.candidate_id));
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${candidates.map(row => JSON.stringify(row)).join('\n')}${candidates.length ? '\n' : ''}`);
const summary = {
  schema_version: 'linkedin-role-crossing-summary@1',
  generated_at: new Date().toISOString(),
  source_role_claims: roles.length,
  profile_series: bySubject.size,
  candidate_crossings: candidates.length,
  subjects_with_candidates: new Set(candidates.map(row => row.subject?.profile_url ?? row.subject?.label)).size,
  temporal_states: candidates.reduce((counts, row) => ({
    ...counts,
    [row.temporal_state]: (counts[row.temporal_state] ?? 0) + 1,
  }), {}),
  graph_effect: 'none',
  interpretation: 'Candidate crossings are derived from two timestamped self-claimed LinkedIn role tuples. They preserve discovery leads and do not establish influence, procurement responsibility, coordination, or wrongdoing.',
};
fs.writeFileSync(summaryOutput, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`LinkedIn role crossing candidates: ${candidates.length} across ${summary.subjects_with_candidates} subject(s)`);
console.log(`  temporal states: ${JSON.stringify(summary.temporal_states)}`);
console.log(`  private output: ${path.relative(root, output)}`);
