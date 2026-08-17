import {
  ANSWER_DIMENSIONS,
  EVIDENCE_BOOLEAN_GATES,
  evaluateObservation
} from './m05-source-health-evidence-state-regression.mjs';

export const OFFICIAL_RECEIPT_IDS=[
  'M05-RC-ADMIN-AU-ROBODEBT',
  'M05-RC-COERCION-NL-SYRI',
  'M05-RC-WORK-IT-FOODINHO'
];

export const OFFICIAL_RECEIPT_DOMAINS=[
  'APC-ADMIN-01',
  'APC-COERCION-01',
  'APC-WORK-01'
];

export const OFFICIAL_RECEIPT_JURISDICTIONS=['AU','NL','IT'];

export const OFFICIAL_RECEIPT_HOSTS={
  'M05-RC-ADMIN-AU-ROBODEBT':[
    'robodebt.royalcommission.gov.au',
    'ministers.finance.gov.au',
    'www.ag.gov.au',
    'www.servicesaustralia.gov.au',
    'ministers.ag.gov.au'
  ],
  'M05-RC-COERCION-NL-SYRI':[
    'www.rechtspraak.nl',
    'www.rijksoverheid.nl',
    'zoek.officielebekendmakingen.nl'
  ],
  'M05-RC-WORK-IT-FOODINHO':[
    'www.garanteprivacy.it',
    'garanteprivacy.it'
  ]
};

export const OFFICIAL_RECEIPT_MINIMUM_SOURCES={
  'M05-RC-ADMIN-AU-ROBODEBT':5,
  'M05-RC-COERCION-NL-SYRI':3,
  'M05-RC-WORK-IT-FOODINHO':4
};

export const OFFICIAL_RECEIPT_SOURCE_CLASSES={
  'M05-RC-ADMIN-AU-ROBODEBT':'official_primary_record',
  'M05-RC-COERCION-NL-SYRI':'official_adjudicative_record',
  'M05-RC-WORK-IT-FOODINHO':'official_adjudicative_record'
};

export const OFFICIAL_RECEIPT_DIMENSION_GAPS={
  'M05-RC-ADMIN-AU-ROBODEBT':['pre_action_timing','durability'],
  'M05-RC-COERCION-NL-SYRI':['evidence_access'],
  'M05-RC-WORK-IT-FOODINHO':['pre_action_timing','durability']
};

const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const text=(value,min=1)=>typeof value==='string'&&value.trim().length>=min;
const unique=(values)=>new Set(values).size===values.length;
const sort=(values)=>[...values].sort();

export function summarizeOfficialReceiptCandidates(packet,contract){
  const records=Array.isArray(packet?.records)?packet.records:[];
  const evaluations=records.map((row)=>evaluateObservation(row.observation,contract));
  const effectiveEntries=records
    .map((row,index)=>({row,evaluation:evaluations[index]}))
    .filter(({evaluation})=>evaluation.answer_effective&&evaluation.repository_promotion_allowed);
  const effectiveJurisdictions=new Set(effectiveEntries
    .map(({row})=>row.jurisdiction)
    .filter((value)=>text(value)));
  const sourceAddressedCandidates=records.filter((row)=>
    row?.observation?.evidence?.source_addressed_receipt===true&&
    Array.isArray(row.sources)&&row.sources.length>0
  ).length;
  const candidateJurisdictions=new Set(records
    .map((row)=>row.jurisdiction)
    .filter((value)=>text(value))).size;
  const claimEvidenceAdmissible=evaluations
    .filter((row)=>row.claim_evidence_admissible&&row.repository_promotion_allowed).length;
  const effectiveAnswers=effectiveEntries.length;
  return {
    source_addressed_candidates:sourceAddressedCandidates,
    candidate_jurisdictions:candidateJurisdictions,
    claim_evidence_admissible:claimEvidenceAdmissible,
    effective_answers:effectiveAnswers,
    cross_domain_regression_completed:
      effectiveAnswers>=contract.answer_effectiveness_contract.minimum_observed_domains&&
      effectiveJurisdictions.size>=contract.answer_effectiveness_contract.minimum_observed_jurisdictions
  };
}

export function validateOfficialReceiptCandidates(packet,contract){
  const errors=[];
  const fail=(message)=>errors.push(message);
  const check=(condition,message)=>{if(!condition)fail(message);};

  check(packet?.schema_version==='m05-cross-domain-official-receipt-candidates@1','candidate schema drift');
  check(packet?.object_class==='bounded_cross_domain_official_receipt_candidate_set','candidate object class drift');
  check(packet?.program_id==='M-05'&&packet?.sprint_id==='M05-SPRINT-03','candidate program binding drift');
  check(packet?.issue===345,'candidate issue identity drift');
  check(packet?.as_of==='2026-08-16','candidate as-of drift');
  check(packet?.status==='candidate_repository_receipts','candidate status drift');
  check(text(packet?.title,20)&&text(packet?.question,80),'candidate title or question is under-specified');

  const gate=packet?.canonical_gate||{};
  check(gate.path==='data/project/m05-source-health-evidence-state-regression.json','canonical gate path drift');
  check(gate.merge_pull_request===2150,'canonical gate pull request drift');
  check(gate.merge_commit==='cb528c25deef376995123e1c6a35455568b90ec3','canonical gate merge commit drift');
  check(gate.product_head==='16df7e9c4182489f23569aec431159806c62223a','canonical gate product head drift');
  check(gate.minimum_domains===3&&gate.minimum_jurisdictions===2,'canonical gate denominator drift');

  check(packet?.candidate_count===3,'candidate count drift');
  check(same(packet?.jurisdictions,OFFICIAL_RECEIPT_JURISDICTIONS),'candidate jurisdiction denominator drift');
  check(same(packet?.domain_ids,OFFICIAL_RECEIPT_DOMAINS),'candidate domain denominator drift');

  const records=Array.isArray(packet?.records)?packet.records:[];
  check(records.length===OFFICIAL_RECEIPT_IDS.length,'candidate record denominator drift');
  const receiptIds=records.map((row)=>row?.receipt_id);
  const sourceIds=[];
  check(same(receiptIds,OFFICIAL_RECEIPT_IDS),'candidate receipt identity or order drift');
  check(unique(receiptIds),'duplicate candidate receipt identifier');

  for(let index=0;index<records.length;index+=1){
    const row=records[index]||{};
    const receiptId=OFFICIAL_RECEIPT_IDS[index];
    const domainId=OFFICIAL_RECEIPT_DOMAINS[index];
    const jurisdiction=OFFICIAL_RECEIPT_JURISDICTIONS[index];
    const prefix=receiptId||`record-${index}`;

    check(row.receipt_id===receiptId,`${prefix} receipt identity drift`);
    check(row.domain_id===domainId,`${prefix} domain identity drift`);
    check(row.jurisdiction===jurisdiction,`${prefix} jurisdiction drift`);
    check(text(row.title,30),`${prefix} title is under-specified`);

    const binding=row.claim_binding||{};
    for(const field of ['identity_scope','temporal_scope','predicate_scope','claim']){
      check(text(binding[field],100),`${prefix} claim binding ${field} is under-specified`);
    }

    const sources=Array.isArray(row.sources)?row.sources:[];
    check(sources.length>=OFFICIAL_RECEIPT_MINIMUM_SOURCES[receiptId],`${prefix} source denominator is incomplete`);
    check(sources.some((source)=>source?.record_type===OFFICIAL_RECEIPT_SOURCE_CLASSES[receiptId]),`${prefix} lacks a source matching the candidate evidence class`);
    for(const source of sources){
      sourceIds.push(source?.source_id);
      check(text(source?.source_id,8),`${prefix} contains an invalid source identifier`);
      check(text(source?.authority,8),`${prefix} source ${source?.source_id||'missing'} lacks authority`);
      check(['official_primary_record','official_adjudicative_record'].includes(source?.record_type),`${prefix} source ${source?.source_id||'missing'} has an invalid record type`);
      check(/^\d{4}-\d{2}-\d{2}$/.test(source?.published_at||''),`${prefix} source ${source?.source_id||'missing'} has an invalid publication date`);
      let parsed=null;
      try{parsed=new URL(source?.url)}catch{}
      check(Boolean(parsed),`${prefix} source ${source?.source_id||'missing'} has an invalid URL`);
      if(parsed){
        check(parsed.protocol==='https:',`${prefix} source ${source.source_id} must use HTTPS`);
        check(OFFICIAL_RECEIPT_HOSTS[receiptId].includes(parsed.hostname),`${prefix} source ${source.source_id} is outside the official host boundary`);
      }
      check(Array.isArray(source?.locator)&&source.locator.length>0,`${prefix} source ${source?.source_id||'missing'} lacks a locator`);
      for(const locator of source?.locator||[]){
        check(text(locator,8),`${prefix} source ${source?.source_id||'missing'} contains an under-specified locator`);
      }
    }

    const observation=row.observation||{};
    check(observation.domain_id===domainId&&observation.jurisdiction===jurisdiction,`${prefix} observation identity drift`);
    check(text(observation.observation_class,30),`${prefix} observation class is under-specified`);
    check(observation.fixture_only===false,`${prefix} escaped the real-candidate boundary`);
    check(observation.promotes_to==='none',`${prefix} escaped the no-promotion boundary`);
    for(const key of ['coverage_healthy','route_healthy','content_healthy']){
      check(observation.source_health?.[key]===true,`${prefix} source-health receipt ${key} drift`);
    }

    const evidence=observation.evidence||{};
    check(evidence.source_class===OFFICIAL_RECEIPT_SOURCE_CLASSES[receiptId],`${prefix} evidence source class drift`);
    check(evidence.promotion_ceiling==='repository_content',`${prefix} evidence promotion ceiling drift`);
    for(const gateName of EVIDENCE_BOOLEAN_GATES){
      const expected=gateName==='promotion_authority'?false:true;
      check(evidence[gateName]===expected,`${prefix} evidence gate ${gateName} drift`);
    }

    const answer=observation.answer||{};
    check(answer.observed_domains===3&&answer.observed_jurisdictions===3,`${prefix} answer denominator drift`);
    check(answer.observed_outcome===true,`${prefix} lacks an observed official outcome`);
    check(answer.composed_durable_answer===false,`${prefix} improperly claims a composed durable answer`);
    const expectedGaps=OFFICIAL_RECEIPT_DIMENSION_GAPS[receiptId];
    const dimensionKeys=Object.keys(answer.dimensions||{});
    check(same(dimensionKeys,ANSWER_DIMENSIONS),`${prefix} answer dimension identity or order drift`);
    for(const dimension of ANSWER_DIMENSIONS){
      check(answer.dimensions?.[dimension]===!expectedGaps.includes(dimension),`${prefix} answer dimension ${dimension} drift`);
    }

    const expectedDeficits=[
      'promotion_authority',
      'composed_durable_answer',
      ...expectedGaps.map((dimension)=>`dimension:${dimension}`)
    ];
    check(same(sort(row.deficits||[]),sort(expectedDeficits)),`${prefix} deficit ledger drift`);

    const assessment=row.assessment||{};
    for(const field of ['evidence_tier','venue','target','upside','downside','failure_mode']){
      check(text(assessment[field],field==='target'?10:30),`${prefix} assessment ${field} is under-specified`);
    }

    const evaluated=evaluateObservation(observation,contract);
    check(evaluated.claim_evidence_admissible===false,`${prefix} candidate promoted to claim evidence`);
    check(evaluated.answer_effective===false,`${prefix} candidate promoted to answer effectiveness`);
    check(evaluated.repository_promotion_allowed===false,`${prefix} candidate escaped repository promotion boundary`);
    check(observation.expected?.claim_evidence_admissible===false&&observation.expected?.answer_effective===false,`${prefix} expectation drift`);
  }

  check(unique(sourceIds),'duplicate official source identifier');

  const summary=summarizeOfficialReceiptCandidates(packet,contract);
  for(const [key,value] of Object.entries(packet?.expected_state||{})){
    check(summary[key]===value,`candidate expected state ${key} drift`);
  }

  const boundaries=packet?.boundaries||{};
  for(const key of [
    'candidate_receipt_is_claim_evidence',
    'official_record_alone_is_promotion_authority',
    'observed_order_proves_implementation',
    'observed_cessation_proves_general_solution',
    'issue_345_closes',
    'sprint03_advances'
  ]){
    check(boundaries[key]===false,`candidate boundary ${key} weakened`);
  }
  check(boundaries.promotes_to==='repository_content','candidate repository ceiling drift');
  check(boundaries.graph_effect==='none','candidate graph effect drift');

  return errors;
}
