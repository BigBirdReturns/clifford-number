import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceAgendaFixture,
  renderPreferenceAgendaMarkdown,
  validateAgendaChain,
  validatePreferenceAgendaBuild,
  validatePreferenceAgendaFixture
} from '../tools/lib/preference-agenda.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/agenda-formation.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceAgendaFixture(fixture), []);

const compiled = compilePreferenceAgendaFixture(fixture);
assert.deepEqual(validatePreferenceAgendaBuild(compiled), []);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.metrics.distinct_preliminary_headline_signatures, 1);
assert.equal(compiled.metrics.distinct_final_option_set_signatures, 2);
assert.equal(compiled.metrics.distinct_agenda_resolution_signatures, 4);
assert.equal(compiled.metrics.institutionally_controlled_agenda_worlds, 2);
assert.equal(compiled.metrics.public_agenda_authority_worlds, 2);
assert.equal(compiled.metrics.binding_collective_option_generation_worlds, 1);
assert.equal(compiled.metrics.binding_objective_rejection_worlds, 1);
assert.equal(compiled.metrics.preliminary_A_share, 0.8);
assert.equal(compiled.metrics.latent_C_first_choice_share, 0.8);
assert.equal(compiled.metrics.objective_reject_share, 0.6);
assert.equal(compiled.metrics.winner_changed_by_binding_amendment, true);

for (const world of compiled.worlds) {
  assert.equal(world.preliminary_headline.counts.A, 800);
  assert.equal(world.preliminary_headline.counts.B, 200);
  assert.equal(world.preliminary_headline.winner, 'A');
  assert.deepEqual(validateAgendaChain(world.custody_chain), []);
}

const fixed = compiled.worlds.find(world => world.world_id === 'fixed-agenda-commissioner-selection');
assert.deepEqual(fixed.resolution.final_option_set, ['A', 'B']);
assert.equal(fixed.resolution.final_winner, 'A');
assert.equal(fixed.resolution.public_agenda_authority_exercised, false);

const advisory = compiled.worlds.find(world => world.world_id === 'advisory-collective-proposal-ignored');
assert.equal(advisory.proposal_support.total, 800);
assert.deepEqual(advisory.proposal_support.by_group, { alpha: 400, beta: 400 });
assert.equal(advisory.resolution.agenda_amended, false);
assert.equal(advisory.resolution.final_winner, 'A');
assert.equal(advisory.resolution.public_agenda_authority_exercised, false);

const amended = compiled.worlds.find(world => world.world_id === 'binding-collective-amendment-adds-c');
assert.equal(amended.rule_evaluation.proposal_rule_passed, true);
assert.equal(amended.resolution.agenda_amended, true);
assert.deepEqual(amended.resolution.final_option_set, ['A', 'B', 'C', 'NONE']);
assert.deepEqual(amended.final_ballot, { A: 100, B: 0, C: 800, NONE: 100 });
assert.equal(amended.resolution.final_winner, 'C');
assert.equal(amended.resolution.public_agenda_authority_exercised, true);

const rejected = compiled.worlds.find(world => world.world_id === 'binding-objective-challenge-rejects-frame');
assert.equal(rejected.objective_disposition.accept, 400);
assert.equal(rejected.objective_disposition.reject, 600);
assert.equal(rejected.rule_evaluation.objective_rule_passed, true);
assert.equal(rejected.resolution.objective_rejected, true);
assert.equal(rejected.resolution.final_winner, null);
assert.equal(rejected.resolution.implementation_state, 'blocked_by_binding_objective_rejection');
assert.equal(rejected.resolution.public_agenda_authority_exercised, true);

const markdown = renderPreferenceAgendaMarkdown(compiled);
assert.match(markdown, /agenda formation and collective option generation/i);
assert.match(markdown, /C first-choice share.*80\.00%/i);
assert.match(markdown, /Binding collective option generation changes the outcome: true/);
assert.match(markdown, /Synthetic prediction can exercise agenda rights: false/);
assert.doesNotMatch(markdown, /Electric Twin suppressed|News UK suppressed|manipulated the public/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceAgendaFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceAgendaFixture(thesisLeak).some(error => /must not count toward thesis evidence/.test(error)));

const duplicateRanking = structuredClone(fixture);
duplicateRanking.cohorts[0].ranking = ['C', 'A', 'B', 'B'];
assert.ok(validatePreferenceAgendaFixture(duplicateRanking).some(error => /ranking must contain every option exactly once/.test(error)));

const advisoryAuthorityLeak = structuredClone(fixture);
advisoryAuthorityLeak.worlds[1].agenda_instrument.rights.agenda_amendment = true;
assert.ok(validatePreferenceAgendaFixture(advisoryAuthorityLeak).some(error => /advisory agenda must permit proposal without binding amendment/.test(error)));

const bindingRightsLeak = structuredClone(fixture);
bindingRightsLeak.worlds[2].agenda_instrument.rights.appeal_and_remedy = false;
assert.ok(validatePreferenceAgendaFixture(bindingRightsLeak).some(error => /binding agenda requires proposal, coalition, amendment, challenge, appeal, and remedy rights/.test(error)));

const missingRule = structuredClone(fixture);
missingRule.required_refusal_rules = [];
assert.ok(validatePreferenceAgendaFixture(missingRule).some(error => /required refusal rule missing/.test(error)));

const tampered = structuredClone(compiled.worlds[2].custody_chain);
tampered[6].payload.resolution.final_winner = 'A';
assert.ok(validateAgendaChain(tampered).some(error => /hash mismatch/.test(error)));

console.log('preference-agenda.test.js: OK');
