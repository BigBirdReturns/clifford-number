import {
  ANSWER_DIMENSIONS,
  EVIDENCE_BOOLEAN_GATES,
  evaluateObservation
} from './m05-source-health-evidence-state-regression.mjs';
import {
  summarizeClaimEvidencePromotionAdjudication
} from './m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.mjs';

export const INTEL_CHIPS_RECEIPT_ID='M05-RC-VALUE-US-INTEL-CHIPS-EQUITY';
export const INTEL_CHIPS_DOMAIN_ID='APC-VALUE-01';
export const INTEL_CHIPS_JURISDICTION='US';

export const INTEL_CHIPS_AUTHORIZED_CLAIM='The official record establishes that the United States Department of Commerce exchanged $8.8698 billion of accelerated CHIPS and Secure Enclave disbursement authority for an executed Intel common-stock, escrowed-share, and conditional-warrant package; closing issued 274,583,000 shares and a warrant for up to 240,516,150 shares, and later Secure Enclave payments released 13 million escrowed shares by 27 June 2026, while no sale, dividend, warrant exercise, realized federal cash receipt, or public or affected-party distribution is observed in the bounded record.';

export const INTEL_CHIPS_SOURCE_IDS=[
  'US-INTEL-CHIPS-AGREEMENT-8K',
  'US-INTEL-CHIPS-EXECUTED-AGREEMENT',
  'US-INTEL-CHIPS-CLOSING-8K',
  'US-INTEL-CHIPS-RESALE-REGISTRATION',
  'US-INTEL-CHIPS-Q3-2025-10Q',
  'US-INTEL-CHIPS-2025-10K',
  'US-COMMERCE-INTEL-VALUATION-CLAIM',
  'US-INTEL-CHIPS-Q2-2026-10Q'
];

export const INTEL_CHIPS_SOURCE_HOSTS=['www.sec.gov','www.commerce.gov'];

export const INTEL_CHIPS_DEFICITS=[
  'promotion_authority',
  'composed_durable_answer',
  'dimension:independent_authority',
  'dimension:effective_remedy',
  'dimension:durability',
  'dimension:practical_exit_or_governance',
  'realized_sale_dividend_or_warrant_exercise',
  'identified_federal_cash_receipt',
  'transparent_public_or_affected_party_distribution'
];

const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const text=(value,min=1)=>typeof value==='string'&&value.trim().length>=min;
const unique=(values)=>new Set(values).size===values.length;
const clone=(value)=>JSON.parse(JSON.stringify(value));

export function summarizeIntelChipsEquityReceiptCandidate(
  candidate,
  {audit,promotion,packet,contract}
){
  const existing=summarizeClaimEvidencePromotionAdjudication(packet,promotion,contract);
  const observation=candidate?.receipt?.observation||{};
  const intel=evaluateObservation(observation,contract);
  return {
    existing_promoted_claims:existing.repository_promotion_allowed,
    existing_effective_answers:existing.effective_answers,
    intel_source_addressed_candidates:
      observation?.evidence?.source_addressed_receipt===true&&
      Array.isArray(candidate?.receipt?.sources)&&
      candidate.receipt.sources.length>0?1:0,
    intel_claim_evidence_admissible:intel.claim_evidence_admissible?1:0,
    intel_repository_promotion_allowed:intel.repository_promotion_allowed?1:0,
    intel_answer_effective:intel.answer_effective,
    total_effective_answers:existing.effective_answers+
      (intel.answer_effective&&intel.repository_promotion_allowed?1:0),
    cross_domain_regression_completed:existing.cross_domain_regression_completed,
    issue_345_may_close:false,
    intel_evaluation:intel,
    existing_summary:existing,
    audit_value_state:clone(
      audit?.domain_audits?.find((row)=>row.domain_id===INTEL_CHIPS_DOMAIN_ID)?.current_state||{}
    )
  };
}

export function validateIntelChipsEquityReceiptCandidate(
  candidate,
  {audit,promotion,packet,contract,valuePilot,valueSources}
){
  const errors=[];
  const fail=(message)=>errors.push(message);
  const check=(condition,message)=>{if(!condition)fail(message);};

  check(
    candidate?.schema_version===
      'm05-answerable-power-s03-l7-intel-chips-equity-receipt-candidate@1',
    'Intel candidate schema drift'
  );
  check(
    candidate?.object_class==='bounded_public_equity_operation_receipt_candidate',
    'Intel candidate object class drift'
  );
  check(
    candidate?.program_id==='M-05'&&
      candidate?.sprint_id==='M05-SPRINT-03'&&
      candidate?.leg_id==='S03-L7',
    'Intel candidate program binding drift'
  );
  check(candidate?.issue===345,'Intel candidate issue identity drift');
  check(candidate?.as_of==='2026-08-17','Intel candidate as-of drift');
  check(
    candidate?.status==='repository_content_candidate_frozen',
    'Intel candidate status drift'
  );
  check(
    text(candidate?.title,40)&&text(candidate?.question,120),
    'Intel candidate title or question is under-specified'
  );

  const receipt=candidate?.receipt||{};
  check(receipt.receipt_id===INTEL_CHIPS_RECEIPT_ID,'Intel receipt identity drift');
  check(receipt.domain_id===INTEL_CHIPS_DOMAIN_ID,'Intel domain identity drift');
  check(receipt.jurisdiction===INTEL_CHIPS_JURISDICTION,'Intel jurisdiction drift');
  check(text(receipt.title,40),'Intel receipt title is under-specified');

  const binding=receipt.claim_binding||{};
  for(const field of ['identity_scope','temporal_scope','predicate_scope','claim']){
    check(text(binding[field],150),`Intel claim binding ${field} is under-specified`);
  }
  check(
    binding.claim===INTEL_CHIPS_AUTHORIZED_CLAIM,
    'Intel exact claim widened or changed'
  );

  const sources=Array.isArray(receipt.sources)?receipt.sources:[];
  check(sources.length===INTEL_CHIPS_SOURCE_IDS.length,'Intel source denominator drift');
  check(
    same(sources.map((row)=>row.source_id),INTEL_CHIPS_SOURCE_IDS),
    'Intel source identity or order drift'
  );
  check(unique(sources.map((row)=>row.source_id)),'duplicate Intel source identifier');
  for(const source of sources){
    const prefix=source?.source_id||'missing-source';
    check(text(source?.authority,20),`${prefix} lacks authority`);
    check(
      ['source_native_primary_record','official_primary_record'].includes(source?.record_type),
      `${prefix} source class drift`
    );
    check(
      /^\d{4}-\d{2}-\d{2}$/.test(source?.published_at||''),
      `${prefix} publication date drift`
    );
    let parsed=null;
    try{parsed=new URL(source?.url)}catch{}
    check(Boolean(parsed),`${prefix} URL invalid`);
    if(parsed){
      check(parsed.protocol==='https:',`${prefix} must use HTTPS`);
      check(
        INTEL_CHIPS_SOURCE_HOSTS.includes(parsed.hostname),
        `${prefix} escaped the official host boundary`
      );
    }
    check(
      Array.isArray(source?.locator)&&source.locator.length>=2,
      `${prefix} lacks a substantive locator`
    );
    for(const locator of source?.locator||[]){
      check(text(locator,20),`${prefix} contains an under-specified locator`);
    }
  }

  const chain=receipt.instrument_chain||{};
  for(const field of [
    'public_contribution_named',
    'recipient_legal_entity_named',
    'executed_residual_right',
    'common_shares_issued',
    'performance_linked_escrow_operated',
    'conditional_warrant_issued',
    'resale_registration_effective'
  ]){
    check(chain[field]===true,`Intel instrument chain ${field} drift`);
  }
  for(const field of [
    'realized_sale_dividend_or_warrant_exercise',
    'identified_federal_cash_receipt',
    'transparent_public_or_affected_party_distribution'
  ]){
    check(chain[field]===false,`Intel instrument chain ${field} must remain false`);
  }

  const observation=receipt.observation||{};
  check(
    observation.domain_id===INTEL_CHIPS_DOMAIN_ID&&
      observation.jurisdiction===INTEL_CHIPS_JURISDICTION,
    'Intel observation identity drift'
  );
  check(
    observation.observation_class===
      'executed_public_equity_and_escrow_operation_without_realization_or_distribution',
    'Intel observation class drift'
  );
  check(observation.fixture_only===false,'Intel receipt escaped the real-record boundary');
  check(observation.promotes_to==='none','Intel receipt escaped the no-promotion boundary');
  for(const key of ['coverage_healthy','route_healthy','content_healthy']){
    check(observation.source_health?.[key]===true,`Intel source health ${key} drift`);
  }
  check(
    observation.evidence?.source_class==='source_native_primary_record',
    'Intel evidence source class drift'
  );
  check(
    observation.evidence?.promotion_ceiling==='repository_content',
    'Intel evidence promotion ceiling drift'
  );
  for(const gate of EVIDENCE_BOOLEAN_GATES){
    const expected=gate==='promotion_authority'?false:true;
    check(observation.evidence?.[gate]===expected,`Intel evidence gate ${gate} drift`);
  }

  const answer=observation.answer||{};
  check(
    answer.observed_domains===1&&answer.observed_jurisdictions===1,
    'Intel answer denominator drift'
  );
  check(answer.observed_outcome===true,'Intel operated instrument outcome missing');
  check(
    answer.composed_durable_answer===false,
    'Intel receipt improperly claims a composed durable answer'
  );
  check(
    same(Object.keys(answer.dimensions||{}),ANSWER_DIMENSIONS),
    'Intel answer dimension identity or order drift'
  );
  const expectedDimensions={
    pre_action_timing:true,
    evidence_access:true,
    independent_authority:false,
    effective_remedy:false,
    durability:false,
    practical_exit_or_governance:false
  };
  check(
    same(answer.dimensions,expectedDimensions),
    'Intel answer dimension ledger drift'
  );
  check(
    same(receipt.deficits,INTEL_CHIPS_DEFICITS),
    'Intel deficit ledger drift'
  );
  for(const field of ['evidence_tier','venue','target','upside','downside','failure_mode']){
    check(
      text(receipt.assessment?.[field],field==='target'?40:80),
      `Intel assessment ${field} is under-specified`
    );
  }

  const intel=evaluateObservation(observation,contract);
  check(intel.claim_evidence_admissible===false,'Intel receipt promoted to claim evidence');
  check(intel.repository_promotion_allowed===false,'Intel receipt escaped repository content');
  check(intel.answer_effective===false,'Intel receipt promoted to answer effectiveness');
  check(
    observation.expected?.claim_evidence_admissible===false&&
      observation.expected?.answer_effective===false,
    'Intel expectation drift'
  );

  const valueAudit=audit?.domain_audits?.find((row)=>row.domain_id===INTEL_CHIPS_DOMAIN_ID);
  check(Boolean(valueAudit),'APC-VALUE-01 audit binding missing');
  check(valueAudit?.pilot_ceiling==='R7_architecture_transfer_candidate_with_TARP_control',
    'APC-VALUE-01 pilot ceiling drift');
  for(const field of [
    'claim_evidence_admissible',
    'answer_effective',
    'jurisdiction_contributes_to_answer',
    'pilot_promoted',
    'control_transfer_allowed'
  ]){
    check(valueAudit?.current_state?.[field]===false,`APC-VALUE-01 audit state ${field} drift`);
  }
  check(
    valuePilot?.schema_version===
      'm05-answerable-power-sprint-03-leg-06-value-recovery-transfer@1'&&
      valuePilot?.domain_adapter_id===INTEL_CHIPS_DOMAIN_ID,
    'value-recovery pilot binding drift'
  );
  check(
    valueSources?.schema_version==='m05-answerable-power-sprint-03-leg-06-sources@1',
    'value-recovery source registry binding drift'
  );
  check(
    !valuePilot?.systems?.some((row)=>row.system_id==='VALUE-INTEL-CHIPS-EQUITY'),
    'Intel receipt silently rewrote the frozen value-recovery pilot'
  );

  const existing=summarizeClaimEvidencePromotionAdjudication(packet,promotion,contract);
  check(existing.audited_domains===5,'existing promotion five-domain denominator drift');
  check(existing.repository_promotion_allowed===3,'existing promotion count drift');
  check(existing.effective_answers===0,'existing effective-answer state drift');
  check(existing.answer_effectiveness===false,'existing answer effectiveness drift');
  check(
    existing.cross_domain_regression_completed===false,
    'existing cross-domain regression state drift'
  );

  const summary=summarizeIntelChipsEquityReceiptCandidate(
    candidate,
    {audit,promotion,packet,contract}
  );
  for(const [key,value] of Object.entries(candidate?.expected_state||{})){
    check(summary[key]===value,`Intel expected state ${key} drift`);
  }

  const boundaries=candidate?.boundaries||{};
  for(const key of [
    'changes_original_official_receipt_packet',
    'changes_existing_claim_promotion_adjudication',
    'inherits_prior_promotion_authority',
    'market_value_is_realized_return',
    'share_issuance_is_public_distribution',
    'resale_registration_is_completed_sale',
    'escrow_release_is_federal_cash_realization',
    'government_stake_is_affected_party_distribution',
    'intel_claim_promoted',
    'answer_effectiveness_claimed',
    'cross_domain_regression_completed',
    'issue_345_may_close',
    'conclusion_generated',
    'project_complete'
  ]){
    check(boundaries[key]===false,`Intel boundary ${key} weakened`);
  }
  check(boundaries.promotes_to==='repository_content','Intel repository ceiling drift');
  check(boundaries.graph_effect==='none','Intel graph effect drift');

  return errors;
}
