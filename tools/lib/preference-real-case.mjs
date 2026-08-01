export const PREFERENCE_REAL_CASE_SCHEMA_VERSION = 'preference-custody-real-case@1';
export const PREFERENCE_REAL_CASE_BUILD_SCHEMA_VERSION = 'preference-custody-real-case-build@1';

const REQUIRED_CONTROL_IDS = ['PC-01', 'PC-02', 'PC-03', 'PC-04', 'PC-05', 'PC-06', 'PC-07', 'PC-08', 'PC-09'];
const ALLOWED_CONTROL_STATES = new Set(['supported', 'partial', 'unresolved', 'not_established', 'not_applicable']);
const REQUIRED_RECEIPT_CLASSES = new Set([
  'publisher_primary_public',
  'vendor_primary_public',
  'independent_trade_reporting',
  'repository_derived_analysis'
]);

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set(array(values).map(value => text(value)).filter(Boolean))];
}

function sorted(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function sameMembers(left, right) {
  return JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
}

function countBy(values, key) {
  const counts = {};
  for (const value of values) {
    const label = text(value?.[key]) || 'unknown';
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function requireFalse(value, label, errors) {
  if (value !== false) errors.push(`${label} must remain false`);
}

function requireTrue(value, label, errors) {
  if (value !== true) errors.push(`${label} must remain true`);
}

export function validatePreferenceRealCase(packet) {
  const errors = [];
  const receipts = array(packet?.receipts);
  const admissions = array(packet?.control_admission);
  const verdict = object(packet?.admission_verdict);
  const gate = object(packet?.promotion_gate);

  if (packet?.schema_version !== PREFERENCE_REAL_CASE_SCHEMA_VERSION) errors.push('preference real-case schema mismatch');
  if (!text(packet?.case_id)) errors.push('case_id is required');
  if (packet?.status !== 'real_case_admission_incomplete') errors.push('real-case status must remain real_case_admission_incomplete');
  if (packet?.classification !== 'reciprocal_deployment_and_workflow_receipt') errors.push('real-case classification mismatch');
  if (packet?.graph_effect !== 'none') errors.push('real-case graph_effect must remain none');
  requireFalse(packet?.counts_toward_thesis_evidence, 'counts_toward_thesis_evidence', errors);
  if (!text(packet?.publication_status) || !packet.publication_status.startsWith('blocked_')) errors.push('publication status must remain blocked');

  const deployment = object(packet?.deployment);
  for (const key of ['publisher', 'product', 'platform_context', 'vendor', 'public_launch_date', 'deployment_state', 'decision_authority']) {
    if (!text(deployment[key])) errors.push(`deployment.${key} is required`);
  }
  if (deployment.deployment_state !== 'reciprocally_confirmed_publisher_and_vendor') errors.push('deployment must preserve reciprocal confirmation');
  requireFalse(deployment.automated_decision_authority_described, 'automated_decision_authority_described', errors);

  if (receipts.length < 6) errors.push('real-case packet requires at least six receipts');
  const receiptIds = receipts.map(receipt => text(receipt?.receipt_id));
  if (unique(receiptIds).length !== receipts.length) errors.push('receipt IDs must be unique');
  for (const receipt of receipts) {
    const id = text(receipt?.receipt_id) || '(missing receipt ID)';
    if (!text(receipt?.receipt_id) || !text(receipt?.url) || !text(receipt?.issue_receipt)) errors.push(`receipt ${id} requires identity URL and issue receipt`);
    if (!REQUIRED_RECEIPT_CLASSES.has(receipt?.source_class)) errors.push(`receipt ${id} has invalid source class ${receipt?.source_class}`);
    if (!array(receipt?.supports).length) errors.push(`receipt ${id} must declare bounded support`);
  }
  for (const requiredClass of REQUIRED_RECEIPT_CLASSES) {
    if (!receipts.some(receipt => receipt.source_class === requiredClass)) errors.push(`missing receipt source class ${requiredClass}`);
  }

  const observations = object(packet?.bounded_observations);
  requireTrue(observations.deployment_reciprocally_confirmed, 'deployment_reciprocally_confirmed', errors);
  requireTrue(observations.publisher_describes_decision_support, 'publisher_describes_decision_support', errors);
  requireTrue(observations.publisher_says_human_and_performance_evidence_continue, 'publisher_says_human_and_performance_evidence_continue', errors);
  requireFalse(observations.publisher_side_protocol_publicly_recovered, 'publisher_side_protocol_publicly_recovered', errors);
  requireFalse(observations.complete_option_and_rejected_alternative_set_publicly_recovered, 'complete_option_and_rejected_alternative_set_publicly_recovered', errors);
  requireFalse(observations.real_exposure_assignment_publicly_recovered, 'real_exposure_assignment_publicly_recovered', errors);
  requireFalse(observations.post_launch_outcome_and_feedback_reuse_publicly_recovered, 'post_launch_outcome_and_feedback_reuse_publicly_recovered', errors);
  requireFalse(observations.binding_affected_public_authority_instrument_publicly_recovered, 'binding_affected_public_authority_instrument_publicly_recovered', errors);
  requireFalse(observations.runtime_metric_policy_version_ledger_publicly_recovered, 'runtime_metric_policy_version_ledger_publicly_recovered', errors);
  if (!array(observations.publisher_confirmed_use_cases).length) errors.push('publisher-confirmed use cases are required');
  if (!array(observations.vendor_attributed_internal_use_cases).length) errors.push('vendor-attributed internal use cases are required');
  if (!array(observations.vendor_attributed_input_classes).length) errors.push('vendor-attributed input classes are required');

  const workflow = object(packet?.workflow_classification);
  if (workflow.screening_and_acceleration !== 'supported') errors.push('screening and acceleration must remain supported');
  if (workflow.supplementation !== 'supported') errors.push('supplementation must remain supported');
  if (workflow.bounded_partial_substitution !== 'vendor_claimed_for_parenting_channel_qualitative_work') errors.push('bounded partial substitution attribution mismatch');
  if (workflow.full_replacement !== 'not_demonstrated') errors.push('full replacement must remain not_demonstrated');
  if (workflow.organization_wide_substitution !== 'not_demonstrated') errors.push('organization-wide substitution must remain not_demonstrated');
  if (workflow.automated_decision_authority !== 'not_described') errors.push('automated decision authority must remain not_described');

  if (!sameMembers(admissions.map(item => item.control_id), REQUIRED_CONTROL_IDS)) errors.push('control admission must contain exactly PC-01 through PC-09');
  const admissionClasses = admissions.map(item => text(item?.failure_class));
  if (unique(admissionClasses).length !== admissions.length) errors.push('control admission failure classes must be unique');
  for (const admission of admissions) {
    const id = text(admission?.control_id) || '(missing control ID)';
    if (!ALLOWED_CONTROL_STATES.has(admission?.state)) errors.push(`control ${id} has invalid admission state ${admission?.state}`);
    if (!array(admission?.missing).length && admission?.state !== 'supported') errors.push(`control ${id} unresolved or partial admission requires missing evidence`);
    if (!text(admission?.allowed_conclusion)) errors.push(`control ${id} requires an allowed conclusion`);
  }
  if (admissions.some(admission => admission.state === 'supported')) errors.push('no preference-custody control is fully supported by the current public packet');

  const path = object(packet?.performative_path);
  if (path.synthetic_output_informed_candidate_intervention !== 'partial_supported') errors.push('performative path must preserve partial synthetic-to-intervention support');
  if (path.real_population_exposed !== 'unresolved') errors.push('real population exposure must remain unresolved');
  if (path.post_intervention_outcome_observed !== 'unresolved') errors.push('post-intervention outcome must remain unresolved');
  if (path.outcome_reused_for_validation_or_model_update !== 'unresolved') errors.push('feedback reuse must remain unresolved');
  if (path.counterfactual_preserved !== 'unresolved') errors.push('counterfactual state must remain unresolved');
  if (path.performative_effect !== 'not_established') errors.push('performative effect must remain not_established');
  if (path.preference_change !== 'not_established') errors.push('preference change must remain not_established');

  requireTrue(verdict.deployment_confirmed, 'admission_verdict.deployment_confirmed', errors);
  requireTrue(verdict.screening_and_acceleration_supported, 'admission_verdict.screening_and_acceleration_supported', errors);
  requireTrue(verdict.supplementation_supported, 'admission_verdict.supplementation_supported', errors);
  requireTrue(verdict.bounded_partial_substitution_vendor_claimed, 'admission_verdict.bounded_partial_substitution_vendor_claimed', errors);
  for (const key of [
    'full_replacement_demonstrated',
    'performative_path_complete',
    'performative_effect_supported',
    'preference_change_supported',
    'public_authorization_supported',
    'collective_agreement_supported',
    'current_validation_continuity_supported',
    'manipulative_intent_inferable',
    'real_world_causal_effect_claimed'
  ]) {
    requireFalse(verdict[key], `admission_verdict.${key}`, errors);
  }

  requireFalse(gate.current_gate_passed, 'promotion_gate.current_gate_passed', errors);
  if (unique(gate.required_next_evidence).length < 10) errors.push('promotion gate next-evidence list is incomplete');
  if (gate.promotion_authority !== 'human_review_plus_repository_gates') errors.push('promotion authority mismatch');
  if (!array(packet?.prohibited_inferences).length) errors.push('prohibited inferences are required');
  if (!text(packet?.interpretation_contract?.contract_id)) errors.push('interpretation contract ID is required');
  if (!text(packet?.interpretation_contract?.what_this_is)) errors.push('interpretation contract what_this_is is required');
  if (!text(packet?.interpretation_contract?.what_this_is_not)) errors.push('interpretation contract what_this_is_not is required');
  if (!text(packet?.interpretation_contract?.copy_ready_caveat)) errors.push('copy-ready caveat is required');
  return errors;
}

export function compilePreferenceRealCase(packet) {
  const errors = validatePreferenceRealCase(packet);
  if (errors.length) throw new Error(`invalid preference real-case packet:\n- ${errors.join('\n- ')}`);

  const admissions = packet.control_admission.map(admission => ({
    control_id: admission.control_id,
    failure_class: admission.failure_class,
    state: admission.state,
    supported_count: array(admission.supported).length,
    missing_count: array(admission.missing).length,
    supported: admission.supported,
    missing: admission.missing,
    allowed_conclusion: admission.allowed_conclusion
  }));
  const allowedPublicationClaims = [
    'Times ExplorAItion is reciprocally confirmed by publisher and vendor public materials.',
    'The public workflow record supports screening, acceleration, and supplementation uses.',
    'Electric Twin attributes one bounded compression of qualitative fieldwork to the parenting-channel workflow while stating that other inputs remained.',
    'Full replacement, organization-wide substitution, automated decision authority, performative effect, preference change, public authorization, collective agreement, and current validation continuity are not established by the present public packet.'
  ];

  return {
    schema_version: PREFERENCE_REAL_CASE_BUILD_SCHEMA_VERSION,
    case_id: packet.case_id,
    issue: packet.issue,
    captured_at: packet.captured_at,
    status: 'bounded_deployment_admitted_effect_unresolved',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'bounded_deployment_and_workflow_receipts',
    publication_status: packet.publication_status,
    deployment: packet.deployment,
    receipt_count: packet.receipts.length,
    receipt_source_class_counts: countBy(packet.receipts, 'source_class'),
    receipts: packet.receipts,
    bounded_observations: packet.bounded_observations,
    workflow_classification: packet.workflow_classification,
    control_admission_count: admissions.length,
    control_state_counts: countBy(admissions, 'state'),
    controls_fully_supported: admissions.filter(admission => admission.state === 'supported').length,
    controls_partial: admissions.filter(admission => admission.state === 'partial').length,
    controls_unresolved_or_not_established: admissions.filter(admission => ['unresolved', 'not_established'].includes(admission.state)).length,
    total_missing_evidence_fields: admissions.reduce((total, admission) => total + admission.missing_count, 0),
    control_admission: admissions,
    performative_path: packet.performative_path,
    admission_verdict: packet.admission_verdict,
    promotion_gate: packet.promotion_gate,
    allowed_publication_claims: allowedPublicationClaims,
    prohibited_inferences: packet.prohibited_inferences,
    interpretation_contract: packet.interpretation_contract
  };
}

export function validatePreferenceRealCaseBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_REAL_CASE_BUILD_SCHEMA_VERSION) errors.push('preference real-case build schema mismatch');
  if (compiled?.status !== 'bounded_deployment_admitted_effect_unresolved') errors.push('compiled real-case status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'bounded_deployment_and_workflow_receipts') errors.push('compiled real-world evidence state mismatch');
  if (!(compiled?.receipt_count >= 6)) errors.push('compiled packet must preserve at least six receipts');
  if (compiled?.control_admission_count !== 9) errors.push('compiled packet must preserve nine control admissions');
  if (compiled?.controls_fully_supported !== 0) errors.push('current packet cannot fully support any control');
  if (compiled?.controls_partial !== 3) errors.push('current packet must preserve three partial controls');
  if (compiled?.controls_unresolved_or_not_established !== 6) errors.push('current packet must preserve six unresolved or not-established controls');
  if (!(compiled?.total_missing_evidence_fields >= 40)) errors.push('compiled packet must preserve the missing-evidence burden');
  requireTrue(compiled?.admission_verdict?.deployment_confirmed, 'compiled deployment_confirmed', errors);
  requireTrue(compiled?.admission_verdict?.screening_and_acceleration_supported, 'compiled screening_and_acceleration_supported', errors);
  requireTrue(compiled?.admission_verdict?.supplementation_supported, 'compiled supplementation_supported', errors);
  requireTrue(compiled?.admission_verdict?.bounded_partial_substitution_vendor_claimed, 'compiled bounded_partial_substitution_vendor_claimed', errors);
  for (const key of [
    'full_replacement_demonstrated',
    'performative_path_complete',
    'performative_effect_supported',
    'preference_change_supported',
    'public_authorization_supported',
    'collective_agreement_supported',
    'current_validation_continuity_supported',
    'manipulative_intent_inferable',
    'real_world_causal_effect_claimed'
  ]) {
    requireFalse(compiled?.admission_verdict?.[key], `compiled admission_verdict.${key}`, errors);
  }
  if (compiled?.performative_path?.performative_effect !== 'not_established') errors.push('compiled performative effect must remain not_established');
  if (compiled?.performative_path?.preference_change !== 'not_established') errors.push('compiled preference change must remain not_established');
  requireFalse(compiled?.promotion_gate?.current_gate_passed, 'compiled promotion_gate.current_gate_passed', errors);
  if (!array(compiled?.allowed_publication_claims).length) errors.push('compiled allowed publication claims are required');
  if (!array(compiled?.prohibited_inferences).length) errors.push('compiled prohibited inferences are required');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled caveat is required');
  return errors;
}

export function renderPreferenceRealCaseMarkdown(compiled) {
  const lines = [
    '# Times ExplorAItion preference-custody admission',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Real-world evidence state:** ${compiled.real_world_evidence_state}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Deployment',
    '',
    `- Publisher: ${compiled.deployment.publisher}`,
    `- Product: ${compiled.deployment.product}`,
    `- Vendor: ${compiled.deployment.vendor}`,
    `- Public launch: ${compiled.deployment.public_launch_date}`,
    `- Deployment state: ${compiled.deployment.deployment_state}`,
    `- Decision authority: ${compiled.deployment.decision_authority}`,
    '',
    '## Bounded workflow classification',
    '',
    `- Screening and acceleration: ${compiled.workflow_classification.screening_and_acceleration}`,
    `- Supplementation: ${compiled.workflow_classification.supplementation}`,
    `- Bounded partial substitution: ${compiled.workflow_classification.bounded_partial_substitution}`,
    `- Full replacement: ${compiled.workflow_classification.full_replacement}`,
    `- Organization-wide substitution: ${compiled.workflow_classification.organization_wide_substitution}`,
    `- Automated decision authority: ${compiled.workflow_classification.automated_decision_authority}`,
    '',
    '## Nine-control admission',
    ''
  ];
  for (const admission of compiled.control_admission) {
    lines.push(`### ${admission.control_id}: ${admission.failure_class}`, '');
    lines.push(`- State: ${admission.state}`);
    lines.push(`- Supported observations: ${admission.supported_count}`);
    lines.push(`- Missing evidence fields: ${admission.missing_count}`);
    lines.push(`- Allowed conclusion: ${admission.allowed_conclusion}`, '');
  }
  lines.push(
    '## Performative path',
    '',
    `- Synthetic output informed a candidate intervention: ${compiled.performative_path.synthetic_output_informed_candidate_intervention}`,
    `- Real population exposure: ${compiled.performative_path.real_population_exposed}`,
    `- Post-intervention outcome: ${compiled.performative_path.post_intervention_outcome_observed}`,
    `- Feedback reuse: ${compiled.performative_path.outcome_reused_for_validation_or_model_update}`,
    `- Counterfactual: ${compiled.performative_path.counterfactual_preserved}`,
    `- Performative effect: ${compiled.performative_path.performative_effect}`,
    `- Preference change: ${compiled.performative_path.preference_change}`,
    '',
    '## Admission verdict',
    '',
    `- Deployment confirmed: ${compiled.admission_verdict.deployment_confirmed}`,
    `- Screening and acceleration supported: ${compiled.admission_verdict.screening_and_acceleration_supported}`,
    `- Supplementation supported: ${compiled.admission_verdict.supplementation_supported}`,
    `- Bounded partial substitution vendor-claimed: ${compiled.admission_verdict.bounded_partial_substitution_vendor_claimed}`,
    `- Full replacement demonstrated: ${compiled.admission_verdict.full_replacement_demonstrated}`,
    `- Performative effect supported: ${compiled.admission_verdict.performative_effect_supported}`,
    `- Preference change supported: ${compiled.admission_verdict.preference_change_supported}`,
    `- Public authorization supported: ${compiled.admission_verdict.public_authorization_supported}`,
    `- Current validation continuity supported: ${compiled.admission_verdict.current_validation_continuity_supported}`,
    '',
    '## Allowed publication claims',
    ''
  );
  for (const claim of compiled.allowed_publication_claims) lines.push(`- ${claim}`);
  lines.push('', '## Required next evidence', '');
  for (const item of compiled.promotion_gate.required_next_evidence) lines.push(`- ${item}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
