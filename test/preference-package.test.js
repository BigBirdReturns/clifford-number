import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferencePackageFixture,
  renderPreferencePackageMarkdown,
  validatePackageChain,
  validatePreferencePackageBuild,
  validatePreferencePackageFixture
} from '../tools/lib/preference-package.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/package-bargaining.fixture.json', 'utf8'));
assert.deepEqual(validatePreferencePackageFixture(fixture), []);

const compiled = compilePreferencePackageFixture(fixture);
assert.deepEqual(validatePreferencePackageBuild(compiled), []);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.deepEqual(compiled.expected_component_poll, {
  X: 600,
  Y: 600,
  ALPHA_GUARD: 400,
  BETA_GUARD: 400,
  REVIEW: 1000
});
assert.equal(compiled.metrics.distinct_component_poll_signatures, 1);
assert.equal(compiled.metrics.distinct_package_signatures, 3);
assert.equal(compiled.metrics.distinct_package_support_signatures, 3);
assert.equal(compiled.metrics.marginal_majority_package_support_share, 0.2);
assert.equal(compiled.metrics.protected_package_support_share, 1);
assert.equal(compiled.metrics.package_support_gap, 0.8);
assert.equal(compiled.metrics.high_support_nonagreement_worlds, 2);
assert.equal(compiled.metrics.binding_collective_agreement_worlds, 1);
assert.equal(compiled.metrics.binding_impasse_worlds, 1);
assert.equal(compiled.metrics.institutionally_approved_without_collective_agreement_worlds, 2);
assert.equal(compiled.metrics.synthetic_candidate_worlds, 1);
assert.equal(compiled.metrics.maximum_one_sided_group_ratification_gap, 0.8);

for (const world of compiled.worlds) assert.deepEqual(validatePackageChain(world.custody_chain), []);

const marginal = compiled.worlds.find(world => world.world_id === 'marginal-majority-bundle');
assert.deepEqual(marginal.package_terms, ['X', 'Y', 'REVIEW']);
assert.deepEqual(marginal.support.by_group, { alpha: 100, beta: 100 });
assert.equal(marginal.support.share, 0.2);
assert.equal(marginal.resolution.institutional_approval, true);
assert.equal(marginal.resolution.collective_agreement, false);
assert.equal(marginal.resolution.implementation_state, 'institutionally_selected_without_package_agreement');

const synthetic = compiled.worlds.find(world => world.world_id === 'synthetic-protected-candidate');
assert.equal(synthetic.support.share, 1);
assert.equal(synthetic.resolution.institutional_approval, false);
assert.equal(synthetic.resolution.collective_agreement, false);
assert.equal(synthetic.resolution.implementation_state, 'candidate_only_without_collective_agreement');

const advisory = compiled.worlds.find(world => world.world_id === 'advisory-protected-package');
assert.equal(advisory.support.share, 1);
assert.equal(advisory.resolution.institutional_approval, true);
assert.equal(advisory.resolution.collective_agreement, false);
assert.equal(advisory.resolution.implementation_state, 'institutionally_approved_without_collective_agreement');

const ratified = compiled.worlds.find(world => world.world_id === 'binding-ratified-protected-package');
assert.deepEqual(ratified.support.group_shares, { alpha: 1, beta: 1 });
assert.equal(ratified.rule_evaluation.formal_bargaining_complete, true);
assert.equal(ratified.rule_evaluation.group_ratification_passed, true);
assert.equal(ratified.resolution.collective_agreement, true);
assert.equal(ratified.resolution.binding_impasse, false);
assert.equal(ratified.resolution.implementation_state, 'authorized_by_ratified_collective_agreement');

const impasse = compiled.worlds.find(world => world.world_id === 'binding-one-sided-counteroffer-impasse');
assert.deepEqual(impasse.support.by_group, { alpha: 500, beta: 100 });
assert.deepEqual(impasse.support.group_shares, { alpha: 1, beta: 0.2 });
assert.equal(impasse.rule_evaluation.reciprocal_concessions_present, false);
assert.equal(impasse.rule_evaluation.group_ratification_passed, false);
assert.equal(impasse.resolution.collective_agreement, false);
assert.equal(impasse.resolution.binding_impasse, true);
assert.equal(impasse.resolution.implementation_state, 'blocked_by_binding_bargaining_impasse');

const markdown = renderPreferencePackageMarkdown(compiled);
assert.match(markdown, /negotiated package formation and collective bargaining/i);
assert.match(markdown, /Marginal-majority package support share|marginal-majority/i);
assert.match(markdown, /Binding ratification creates collective agreement: true/);
assert.match(markdown, /Bargaining impasse is missing preference data: false/);
assert.doesNotMatch(markdown, /Electric Twin imposed|News UK imposed|manipulated the public/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferencePackageFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferencePackageFixture(thesisLeak).some(error => /must not count toward thesis evidence/.test(error)));

const duplicateTerm = structuredClone(fixture);
duplicateTerm.terms.push('X');
assert.ok(validatePreferencePackageFixture(duplicateTerm).some(error => /unique IDs/.test(error)));

const invalidCohortTerm = structuredClone(fixture);
invalidCohortTerm.cohorts[0].component_support.push('UNKNOWN');
assert.ok(validatePreferencePackageFixture(invalidCohortTerm).some(error => /supports unknown term/.test(error)));

const nonbindingMandateLeak = structuredClone(fixture);
nonbindingMandateLeak.worlds[2].bargaining_instrument.representative_mandates = true;
assert.ok(validatePreferencePackageFixture(nonbindingMandateLeak).some(error => /nonbinding package process cannot claim mandates/.test(error)));

const bindingRightsLeak = structuredClone(fixture);
bindingRightsLeak.worlds[3].bargaining_instrument.reopen_clause = false;
assert.ok(validatePreferencePackageFixture(bindingRightsLeak).some(error => /requires enforceable obligations, reopen, appeal, and remedy/.test(error)));

const missingRules = structuredClone(fixture);
missingRules.required_refusal_rules = [];
assert.ok(validatePreferencePackageFixture(missingRules).some(error => /required refusal rule missing/.test(error)));

const tampered = structuredClone(compiled.worlds[3].custody_chain);
tampered[5].payload.support.total = 999;
assert.ok(validatePackageChain(tampered).some(error => /hash mismatch/.test(error)));

console.log('preference-package.test.js: OK');
