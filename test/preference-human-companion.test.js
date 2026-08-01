import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceHumanCompanion,
  renderPreferenceHumanCompanionMarkdown,
  validateHumanCompanionChain,
  validatePreferenceHumanCompanion,
  validatePreferenceHumanCompanionBuild
} from '../tools/lib/preference-human-companion.mjs';

const packet = JSON.parse(readFileSync('data/research/preference-custody/real-cases/newsuk-nucleus-human-companion.json', 'utf8'));
assert.deepEqual(validatePreferenceHumanCompanion(packet), []);

const compiled = compilePreferenceHumanCompanion(packet);
assert.deepEqual(validatePreferenceHumanCompanionBuild(compiled), []);
assert.equal(compiled.case_id, 'newsuk-nucleus-human-companion-v1');
assert.equal(compiled.status, 'parallel_human_companion_confirmed_matched_workflow_unresolved');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'bounded_parallel_human_infrastructure');
assert.equal(compiled.days_between_launches, 85);
assert.equal(compiled.receipt_count, 3);
assert.deepEqual(compiled.receipt_source_class_counts, {
  independent_trade_reporting: 1,
  publisher_primary_public: 2
});
assert.equal(compiled.classification_verdict.parallel_human_research_infrastructure_confirmed, true);
assert.equal(compiled.classification_verdict.organization_wide_full_replacement_counterevidence_present, true);
assert.equal(compiled.classification_verdict.same_workflow_hybrid_operation_supported, false);
assert.equal(compiled.classification_verdict.matched_human_synthetic_validation_supported, false);
assert.equal(compiled.classification_verdict.human_panel_confers_binding_public_authority, false);
assert.equal(compiled.classification_verdict.human_panel_proves_no_partial_substitution_anywhere, false);
assert.equal(compiled.classification_verdict.manipulative_intent_inferable, false);
assert.equal(compiled.negative_control_state, 'bounded_counterevidence_to_organization_wide_full_replacement');
assert.equal(compiled.matched_validation_state, 'not_established');
assert.equal(compiled.public_authority_state, 'not_established');
assert.deepEqual(validateHumanCompanionChain(compiled.custody_chain), []);
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);

const markdown = renderPreferenceHumanCompanionMarkdown(compiled);
assert.match(markdown, /News UK Nucleus human-companion admission/);
assert.match(markdown, /Launch interval: 85 days/);
assert.match(markdown, /Parallel direct-human research infrastructure confirmed: true/);
assert.match(markdown, /Organization-wide full-replacement counterevidence present: true/);
assert.match(markdown, /Matched human-synthetic validation supported: false/);
assert.match(markdown, /Human panel confers binding public authority: false/);

const prohibitedHeading = '## Prohibited inferences';
const prohibitedIndex = markdown.indexOf(prohibitedHeading);
assert.ok(prohibitedIndex >= 0, 'rendered companion packet must preserve the prohibited-inference ledger');
const publicationSurface = markdown.slice(0, prohibitedIndex);
const prohibitedSurface = markdown.slice(prohibitedIndex);
assert.doesNotMatch(publicationSurface, /Nucleus Panel validates Times ExplorAItion|every synthetic workflow retains a matched human step|human panel has veto authority/i);
assert.match(prohibitedSurface, /Do not infer that Nucleus Panel validates Times ExplorAItion/);
assert.match(prohibitedSurface, /Do not infer that every synthetic workflow retains a matched human step/);

const graphLeak = structuredClone(packet);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceHumanCompanion(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(packet);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceHumanCompanion(thesisLeak).some(error => /counts_toward_thesis_evidence/.test(error)));

const chronologyLeak = structuredClone(packet);
chronologyLeak.surfaces.human.public_launch_date = '2026-04-20';
assert.ok(validatePreferenceHumanCompanion(chronologyLeak).some(error => /launch after the synthetic surface/.test(error)));

const missingIndependent = structuredClone(packet);
missingIndependent.receipts = missingIndependent.receipts.filter(receipt => receipt.source_class !== 'independent_trade_reporting');
assert.ok(validatePreferenceHumanCompanion(missingIndependent).some(error => /missing human-companion receipt source class independent_trade_reporting/.test(error)));

const matchedValidationLeak = structuredClone(packet);
matchedValidationLeak.classification_verdict.matched_human_synthetic_validation_supported = true;
assert.ok(validatePreferenceHumanCompanion(matchedValidationLeak).some(error => /matched_human_synthetic_validation_supported/.test(error)));

const authorityLeak = structuredClone(packet);
authorityLeak.classification_verdict.human_panel_confers_binding_public_authority = true;
assert.ok(validatePreferenceHumanCompanion(authorityLeak).some(error => /human_panel_confers_binding_public_authority/.test(error)));

const noCounterevidenceLeak = structuredClone(packet);
noCounterevidenceLeak.classification_verdict.organization_wide_full_replacement_counterevidence_present = false;
assert.ok(validatePreferenceHumanCompanion(noCounterevidenceLeak).some(error => /organization_wide_full_replacement_counterevidence_present/.test(error)));

const universalNoSubstitutionLeak = structuredClone(packet);
universalNoSubstitutionLeak.classification_verdict.human_panel_proves_no_partial_substitution_anywhere = true;
assert.ok(validatePreferenceHumanCompanion(universalNoSubstitutionLeak).some(error => /human_panel_proves_no_partial_substitution_anywhere/.test(error)));

const intentLeak = structuredClone(packet);
intentLeak.classification_verdict.manipulative_intent_inferable = true;
assert.ok(validatePreferenceHumanCompanion(intentLeak).some(error => /manipulative_intent_inferable/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.custody_chain[1].payload.days_after_synthetic_launch = 84;
assert.ok(validatePreferenceHumanCompanionBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const strippedCaveat = structuredClone(packet);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceHumanCompanion(strippedCaveat).some(error => /copy_ready_caveat/.test(error)));

console.log('preference-human-companion.test.js: OK');
