import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceRealCase,
  renderPreferenceRealCaseMarkdown,
  validatePreferenceRealCase,
  validatePreferenceRealCaseBuild
} from '../tools/lib/preference-real-case.mjs';

const packet = JSON.parse(readFileSync('data/research/preference-custody/real-cases/times-exploraition-admission.json', 'utf8'));
assert.deepEqual(validatePreferenceRealCase(packet), []);

const compiled = compilePreferenceRealCase(packet);
assert.deepEqual(validatePreferenceRealCaseBuild(compiled), []);
assert.equal(compiled.case_id, 'times-exploraition-public-admission-v1');
assert.equal(compiled.status, 'bounded_deployment_admitted_effect_unresolved');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'bounded_deployment_and_workflow_receipts');
assert.equal(compiled.receipt_count, 6);
assert.equal(compiled.control_admission_count, 9);
assert.equal(compiled.controls_fully_supported, 0);
assert.equal(compiled.controls_partial, 3);
assert.equal(compiled.controls_unresolved_or_not_established, 6);
assert.equal(compiled.total_missing_evidence_fields, 44);
assert.deepEqual(compiled.control_state_counts, {
  not_established: 2,
  partial: 3,
  unresolved: 4
});
assert.equal(compiled.admission_verdict.deployment_confirmed, true);
assert.equal(compiled.admission_verdict.screening_and_acceleration_supported, true);
assert.equal(compiled.admission_verdict.supplementation_supported, true);
assert.equal(compiled.admission_verdict.bounded_partial_substitution_vendor_claimed, true);
assert.equal(compiled.admission_verdict.full_replacement_demonstrated, false);
assert.equal(compiled.admission_verdict.performative_effect_supported, false);
assert.equal(compiled.admission_verdict.preference_change_supported, false);
assert.equal(compiled.admission_verdict.public_authorization_supported, false);
assert.equal(compiled.admission_verdict.current_validation_continuity_supported, false);
assert.equal(compiled.performative_path.performative_effect, 'not_established');
assert.equal(compiled.performative_path.preference_change, 'not_established');
assert.equal(compiled.promotion_gate.current_gate_passed, false);

const pc7 = compiled.control_admission.find(item => item.control_id === 'PC-07');
assert.equal(pc7.state, 'partial');
assert.ok(pc7.supported.includes('synthetic input informed framing naming branding or prioritisation in vendor-attributed workflows'));
const pc9 = compiled.control_admission.find(item => item.control_id === 'PC-09');
assert.equal(pc9.state, 'partial');
assert.ok(pc9.missing.includes('deployment-specific runtime identity'));

const markdown = renderPreferenceRealCaseMarkdown(compiled);
assert.match(markdown, /Times ExplorAItion preference-custody admission/);
assert.match(markdown, /Deployment confirmed: true/);
assert.match(markdown, /Screening and acceleration supported: true/);
assert.match(markdown, /Bounded partial substitution vendor-claimed: true/);
assert.match(markdown, /Full replacement demonstrated: false/);
assert.match(markdown, /Performative effect supported: false/);
assert.match(markdown, /Current validation continuity supported: false/);
assert.doesNotMatch(markdown, /changed audience preferences|manipulated the audience|publicly authorized the deployment|independently reproduced 92 percent/i);

const graphLeak = structuredClone(packet);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceRealCase(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(packet);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceRealCase(thesisLeak).some(error => /must remain false/.test(error)));

const fullReplacementLeak = structuredClone(packet);
fullReplacementLeak.workflow_classification.full_replacement = 'supported';
assert.ok(validatePreferenceRealCase(fullReplacementLeak).some(error => /full replacement must remain not_demonstrated/.test(error)));

const effectLeak = structuredClone(packet);
effectLeak.performative_path.performative_effect = 'supported';
assert.ok(validatePreferenceRealCase(effectLeak).some(error => /performative effect must remain not_established/.test(error)));

const preferenceLeak = structuredClone(packet);
preferenceLeak.admission_verdict.preference_change_supported = true;
assert.ok(validatePreferenceRealCase(preferenceLeak).some(error => /preference_change_supported must remain false/.test(error)));

const authorizationLeak = structuredClone(packet);
authorizationLeak.admission_verdict.public_authorization_supported = true;
assert.ok(validatePreferenceRealCase(authorizationLeak).some(error => /public_authorization_supported must remain false/.test(error)));

const validationLeak = structuredClone(packet);
validationLeak.admission_verdict.current_validation_continuity_supported = true;
assert.ok(validatePreferenceRealCase(validationLeak).some(error => /current_validation_continuity_supported must remain false/.test(error)));

const controlPromotionLeak = structuredClone(packet);
controlPromotionLeak.control_admission[0].state = 'supported';
controlPromotionLeak.control_admission[0].missing = [];
assert.ok(validatePreferenceRealCase(controlPromotionLeak).some(error => /no preference-custody control is fully supported/.test(error)));

const receiptClassLeak = structuredClone(packet);
receiptClassLeak.receipts = receiptClassLeak.receipts.filter(receipt => receipt.source_class !== 'independent_trade_reporting');
assert.ok(validatePreferenceRealCase(receiptClassLeak).some(error => /missing receipt source class independent_trade_reporting/.test(error)));

const gateLeak = structuredClone(packet);
gateLeak.promotion_gate.current_gate_passed = true;
assert.ok(validatePreferenceRealCase(gateLeak).some(error => /promotion_gate.current_gate_passed must remain false/.test(error)));

console.log('preference-real-case.test.js: OK');
