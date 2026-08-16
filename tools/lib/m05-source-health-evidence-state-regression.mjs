export const EVIDENCE_BOOLEAN_GATES=[
  'source_addressed_receipt',
  'exact_claim_binding',
  'identity_scope_bound',
  'temporal_scope_bound',
  'predicate_scope_bound',
  'substantive_content',
  'counterevidence_reviewed',
  'promotion_authority'
];

export const EVIDENCE_SUFFICIENCY_GUARDS=[
  'source_health_alone_is_sufficient',
  'official_host_alone_is_sufficient',
  'content_success_alone_is_sufficient'
];

export const ANSWER_DIMENSIONS=[
  'pre_action_timing',
  'evidence_access',
  'independent_authority',
  'effective_remedy',
  'durability',
  'practical_exit_or_governance'
];

export const ANSWER_SUFFICIENCY_GUARDS=[
  'formal_policy_alone_is_sufficient',
  'appeal_without_stay_is_sufficient',
  'human_in_loop_alone_is_sufficient',
  'vendor_replacement_without_operational_continuity_is_sufficient'
];

const isTrue=(value)=>value===true;

export function evaluateObservation(observation,contract){
  const evidence=observation?.evidence||{};
  const answer=observation?.answer||{};
  const evidenceContract=contract.evidence_admission_contract;
  const answerContract=contract.answer_effectiveness_contract;
  const evidenceFailures=[];

  if(!evidenceContract.allowed_source_classes.includes(evidence.source_class)){
    evidenceFailures.push(`source_class:${evidence.source_class||'missing'}`);
  }
  if(evidence.promotion_ceiling!==evidenceContract.required_promotion_ceiling){
    evidenceFailures.push(`promotion_ceiling:${evidence.promotion_ceiling||'missing'}`);
  }
  for(const gate of evidenceContract.required_boolean_gates){
    if(!isTrue(evidence[gate]))evidenceFailures.push(gate);
  }
  for(const guard of EVIDENCE_SUFFICIENCY_GUARDS){
    if(evidenceContract[guard]!==false)evidenceFailures.push(`contract_guard:${guard}`);
  }

  const claimEvidenceAdmissible=evidenceFailures.length===0;
  const answerFailures=[];
  if(!claimEvidenceAdmissible)answerFailures.push('claim_evidence_not_admissible');
  if((answer.observed_domains||0)<answerContract.minimum_observed_domains)answerFailures.push('minimum_observed_domains');
  if((answer.observed_jurisdictions||0)<answerContract.minimum_observed_jurisdictions)answerFailures.push('minimum_observed_jurisdictions');
  if(answerContract.observed_outcome_required&&!isTrue(answer.observed_outcome))answerFailures.push('observed_outcome');
  if(answerContract.composed_durable_answer_required&&!isTrue(answer.composed_durable_answer))answerFailures.push('composed_durable_answer');
  for(const dimension of answerContract.required_dimensions){
    if(!isTrue(answer.dimensions?.[dimension]))answerFailures.push(`dimension:${dimension}`);
  }
  for(const guard of ANSWER_SUFFICIENCY_GUARDS){
    if(answerContract[guard]!==false)answerFailures.push(`contract_guard:${guard}`);
  }

  const answerEffective=answerFailures.length===0;
  const repositoryPromotionAllowed=
    observation.fixture_only!==true&&
    observation.promotes_to==='candidate_evidence'&&
    claimEvidenceAdmissible;

  return {
    id:observation.domain_id||observation.control_id||'unidentified',
    claim_evidence_admissible:claimEvidenceAdmissible,
    answer_effective:answerEffective,
    repository_promotion_allowed:repositoryPromotionAllowed,
    evidence_failures:evidenceFailures,
    answer_failures:answerFailures
  };
}

export function evaluateRegression(contract){
  const domains=contract.domain_observations.map((row)=>evaluateObservation(row,contract));
  const controls=contract.controls.map((row)=>evaluateObservation(row,contract));
  const admissibleDomainEvidence=domains.filter((row)=>row.claim_evidence_admissible&&row.repository_promotion_allowed);
  const effectiveDomainAnswerEntries=domains
    .map((evaluation,index)=>({evaluation,observation:contract.domain_observations[index]}))
    .filter(({evaluation})=>evaluation.answer_effective&&evaluation.repository_promotion_allowed);
  const effectiveDomainAnswers=effectiveDomainAnswerEntries.map(({evaluation})=>evaluation);
  const effectiveJurisdictions=new Set(effectiveDomainAnswerEntries
    .map(({observation})=>observation.jurisdiction)
    .filter((value)=>value&&value!=='unassigned'));
  const sourceHealthHealthy=
    contract.source_health_receipt.observed.route_healthy===true&&
    contract.source_health_receipt.observed.content_healthy===true&&
    contract.source_health_receipt.observed.coverage_healthy===true&&
    contract.source_health_receipt.observed.unclassified_failures===0;

  return {
    source_health_healthy:sourceHealthHealthy,
    domain_observations_evaluated:domains.length,
    admissible_domain_evidence_records:admissibleDomainEvidence.length,
    effective_domain_answers:effectiveDomainAnswers.length,
    cross_domain_regression_completed:
      effectiveDomainAnswers.length>=contract.answer_effectiveness_contract.minimum_observed_domains&&
      effectiveJurisdictions.size>=contract.answer_effectiveness_contract.minimum_observed_jurisdictions,
    evidentiary_sufficiency:admissibleDomainEvidence.length>0,
    answer_effectiveness:effectiveDomainAnswers.length>0,
    domains,
    controls
  };
}
