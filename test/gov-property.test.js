import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeName, classifyAwardAgainstEntity, awardIdentityDisposition, summarizeSymmetricRun } from '../tools/lib/gov-property-awards.mjs';
import { validateGovProperty } from '../tools/validate-gov-property.mjs';

// --- classification discipline ---
assert.equal(classifyAwardAgainstEntity('TRUMP PLAZA LLC', 'TRUMP PLAZA LLC').relation, 'exact_normalized_name_candidate');
// the live TRUMPF trap: substring/prefix collision must be a rejected false positive, never the entity
assert.equal(classifyAwardAgainstEntity('TRUMPF INC', 'THE TRUMP CORPORATION').relation, 'substring_only_false_positive');
assert.equal(classifyAwardAgainstEntity('TRUMPF MEDICAL SYSTEMS INC', 'TRUMP CPS LLC').relation, 'substring_only_false_positive');
assert.equal(classifyAwardAgainstEntity('MICROSOFT CORP', 'TRUMP PLAZA LLC').relation, 'unrelated');
// core-name match after suffix strip is still only a candidate
assert.equal(classifyAwardAgainstEntity('TRUMP PLAZA INC', 'TRUMP PLAZA LLC').relation, 'core_name_candidate');
// a name match can never resolve identity here
assert.equal(awardIdentityDisposition('exact_normalized_name_candidate'), 'name_candidate_unresolved');
assert.equal(awardIdentityDisposition('core_name_candidate'), 'name_candidate_unresolved');
assert.equal(awardIdentityDisposition('substring_only_false_positive'), 'rejected_false_positive');

const s = summarizeSymmetricRun([
  { person_id: 'donald-trump', entities_queried: 2, entity_results: [{ awards_observed: 3, disposition_counts: { name_candidate_unresolved: 2, rejected_false_positive: 1 } }] },
  { person_id: 'joe-biden', entities_queried: 0, entity_results: [] },
]);
assert.equal(s.resolved_cross_source_identities, 0);
assert.equal(s.crossing_matches, 0);
assert.equal(s.name_candidate_unresolved, 2);
assert.equal(s.rejected_false_positives, 1);
assert.deepEqual(s.members_without_resolved_entities, ['joe-biden']);

// --- checked-in artifacts validate clean ---
const rd = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const manifest = rd('data/research/government-to-property-manifest.json');
const cohort = rd('data/research/cohort-disclosed-business-entities.json');
const v1 = rd('data/research/campaign-to-business-v1-result.json');
assert.deepEqual(validateGovProperty(manifest, cohort, v1), [], 'gov-property artifacts must validate');

// symmetric: all 8 present; only members with resolved entities were substantively queried.
assert.equal(manifest.members.length, 8);
assert.equal(manifest.summary.crossing_matches, 0);
assert.equal(manifest.source_scope_probe.trump_recipient_universe.all_false_positive, true);

// v1 frozen and honestly scoped
assert.equal(v1.status, 'frozen_v1_source_limited');
assert.match(JSON.stringify(v1.why_no_crossing), /current OGE/i);
assert.match(v1.not_a_claim, /not.*no relationship/i);

console.log('gov-property.test.js: OK');
