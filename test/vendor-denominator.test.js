import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compileVendorDenominator,
  renderVendorDenominatorMarkdown,
  validateVendorDenominator
} from '../tools/lib/vendor-denominator.mjs';

const actual = JSON.parse(readFileSync('data/research/denominators/synthetic-population-vendors.json', 'utf8'));
assert.deepEqual(validateVendorDenominator(actual), []);
const compiled = compileVendorDenominator(actual);
assert.equal(compiled.status, 'blocked_not_frozen');
assert.equal(compiled.usable_as_denominator, false);
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.counts.public_recovery_candidates_transcribed, 14);
assert.equal(compiled.counts.latest_issue_reported_recovery_count, 15);
assert.equal(compiled.counts.public_recoveries_not_yet_transcribed, 1);
assert.equal(compiled.counts.source_document_membership_confirmed, 0);
assert.equal(compiled.counts.denominator_members_frozen, 0);
assert.deepEqual(compiled.thesis_consumption.allowed_relations, ['coverage', 'context']);
assert.equal(compiled.thesis_consumption.evidence_bearing_relation_allowed, false);
assert.match(renderVendorDenominatorMarkdown(compiled), /biased public recovery set, not the denominator/i);
assert.doesNotMatch(renderVendorDenominatorMarkdown(compiled), /42\.4%|coverage ratio/i);

const duplicate = structuredClone(actual);
duplicate.public_recovery_candidates.push(structuredClone(duplicate.public_recovery_candidates[0]));
duplicate.recovery_state.transcribed_candidate_count += 1;
duplicate.recovery_state.latest_issue_reported_recovery_count += 1;
assert.ok(validateVendorDenominator(duplicate).some(error => /duplicate public recovery candidates/.test(error)));

const falseConfirmation = structuredClone(actual);
falseConfirmation.public_recovery_candidates[0].source_document_membership_confirmed = true;
assert.ok(validateVendorDenominator(falseConfirmation).some(error => /cannot be source-confirmed/.test(error)));

const falseTier = structuredClone(actual);
falseTier.public_recovery_candidates[3].tier_confirmed = true;
assert.ok(validateVendorDenominator(falseTier).some(error => /cannot carry a confirmed tier/.test(error)));

const ratio = structuredClone(actual);
ratio.recovery_state.coverage_ratio = 14 / 33;
assert.ok(validateVendorDenominator(ratio).some(error => /coverage ratios are forbidden/.test(error)));

const thesisLeak = structuredClone(actual);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validateVendorDenominator(thesisLeak).some(error => /must not count as thesis evidence/.test(error)));

const prematureFreeze = structuredClone(actual);
prematureFreeze.status = 'frozen_human_reviewed';
prematureFreeze.usable_as_denominator = true;
prematureFreeze.promotion_gate.current_gate_passed = true;
assert.ok(validateVendorDenominator(prematureFreeze).some(error => /promotion gate state|usable_as_denominator|incomplete denominator/.test(error)));

const partialMembers = structuredClone(actual);
partialMembers.denominator_members = [{
  vendor_id: 'stravito',
  label: 'Stravito',
  source_span: 'page 1',
  tier_label: 'front_runner',
  human_review_status: 'accepted'
}];
assert.ok(validateVendorDenominator(partialMembers).some(error => /partial source-document transcriptions belong in recovery candidates/.test(error)));

const badCounts = structuredClone(actual);
badCounts.source_document.reported_universe.startups_to_watch = 14;
assert.ok(validateVendorDenominator(badCounts).some(error => /reported source-universe counts/.test(error)));

const overstatedCandidate = structuredClone(actual);
overstatedCandidate.public_recovery_candidates[8].claim_state = 'source_document_confirmed';
overstatedCandidate.public_recovery_candidates[8].source_document_membership_confirmed = true;
overstatedCandidate.public_recovery_candidates[8].tier_confirmed = true;
assert.ok(validateVendorDenominator(overstatedCandidate).some(error => /requires a source span/.test(error)));

console.log('vendor-denominator.test.js: OK');
