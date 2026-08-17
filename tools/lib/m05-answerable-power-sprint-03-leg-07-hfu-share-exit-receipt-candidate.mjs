import crypto from 'node:crypto';
import {
  ANSWER_DIMENSIONS,
  EVIDENCE_BOOLEAN_GATES,
  evaluateObservation
} from './m05-source-health-evidence-state-regression.mjs';

export const HFU_SHARE_RECEIPT_ID='M05-RC-EXIT-UK-HFU-SHARE';
export const HFU_SHARE_DOMAIN_ID='APC-EXIT-01';
export const HFU_SHARE_JURISDICTION='UK';
export const HFU_SHARE_CANDIDATE_JSON_SHA256='254b694ac0fe881f611133bf4a54b2bded0486c8102ca338088668896f4b7f91';

export const HFU_SHARE_AUTHORIZED_CLAIM='Official records establish that MHCLG began building Share in summer 2024, migrated three years of operational data, delivered the service in September 2025, exited the former supplier contract, and continued operating and modifying Share through at least 17 August 2026; current guidance and grant conditions require councils to use Share for safeguarding, accommodation, and reporting workflows, while a public MHCLG repository at commit 120e42a871937c2f8f34d1f84c24cd194791551b provides runnable source, automated tests, MIT-licensed MHCLG code custody, and release history through version 2.10.0. The same bounded record identifies Made Tech support and London-hosted cloud infrastructure and does not establish independent end-to-end migration assurance, a Palantir deletion certificate or residual-copy inventory, supplier-free or cloud-independent operation, affected-party governance, or independently reconciled savings and service performance.';

export const HFU_SHARE_SOURCE_IDS=[
  'UK-HFU-NAO-DEPENDENCY-2023',
  'UK-HFU-MHCLG-DELIVERY-2026',
  'UK-HFU-SHARE-GUIDANCE-2025',
  'UK-HFU-SHARE-GRANT-2026',
  'UK-HFU-SHARE-PRIVACY-2025',
  'UK-HFU-SHARE-REPO-COMMIT-2026',
  'UK-HFU-SHARE-README-2026',
  'UK-HFU-SHARE-LICENCE-2026',
  'UK-HFU-SHARE-CHANGELOG-2026'
];

export const HFU_SHARE_SOURCE_HOSTS=[
  'www.nao.org.uk',
  'mhclgdigital.blog.gov.uk',
  'www.gov.uk',
  'github.com'
];

export const HFU_SHARE_EXTERNAL_REPOSITORY=Object.freeze({
  repository:'communitiesuk/hfu-share-webapp',
  default_branch:'main',
  archived:false,
  commit_sha:'120e42a871937c2f8f34d1f84c24cd194791551b',
  tree_sha:'1ab4a950ef11f8328037646902ff246fd9bad389',
  commit_date:'2026-08-17T12:41:09Z',
  commit_message:'fix: Remove old dedupe code (#108)',
  branch_protected:true,
  required_check:'Build & Test',
  readme_blob_sha:'1b406ddc2ecb3b131e206f670de1dfd39b2538ae',
  licence_blob_sha:'2236ec460c358565e4a6c4d3af133e4742961f64',
  changelog_blob_sha:'85a289b2b95d6a1324ec8d78c467d82b50f7235d'
});

export const HFU_SHARE_TRUE_CHAIN_FIELDS=[
  'former_supplier_identified',
  'public_controller_and_service_owner_identified',
  'in_house_replacement_built',
  'three_year_data_migration_officially_reported',
  'supplier_contract_exit_officially_reported',
  'continuing_operation_observed',
  'public_source_code_available',
  'public_code_ownership_and_licence_observed',
  'post_launch_modification_observed',
  'funding_workflow_dependency_observed',
  'made_tech_support_dependency_identified',
  'london_cloud_dependency_identified'
];

export const HFU_SHARE_FALSE_CHAIN_FIELDS=[
  'independent_end_to_end_migration_assurance',
  'residual_supplier_custody_reconciled',
  'former_supplier_deletion_certificate',
  'independent_cost_and_performance_reconciliation',
  'affected_party_post_exit_governance',
  'supplier_free_operation',
  'cloud_independent_operation'
];

export const HFU_SHARE_DEFICITS=[
  'promotion_authority',
  'composed_durable_answer',
  'dimension:independent_authority',
  'dimension:effective_remedy',
  'dimension:durability',
  'independent_end_to_end_migration_audit',
  'residual_supplier_custody_inventory',
  'former_supplier_deletion_certificate',
  'subject_level_continuity_correction_and_remedy',
  'independent_cost_and_performance_reconciliation',
  'affected_party_post_exit_governance',
  'successor_support_and_cloud_exit',
  'supplier_free_operation',
  'cloud_independent_operation'
];

export const HFU_SHARE_EXPECTED_DIMENSIONS=Object.freeze({
  pre_action_timing:true,
  evidence_access:true,
  independent_authority:false,
  effective_remedy:false,
  durability:false,
  practical_exit_or_governance:true
});

const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const text=(value,min=1)=>typeof value==='string'&&value.trim().length>=min;
const unique=(values)=>new Set(values).size===values.length;
const clone=(value)=>JSON.parse(JSON.stringify(value));
const digest=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function summarizeHfuShareExitReceiptCandidate(
  candidate,
  {intelCandidate,contract}
){
  const observation=candidate?.receipt?.observation||{};
  const hfu=evaluateObservation(observation,contract);
  const intelExpected=intelCandidate?.expected_state||{};
  return {
    existing_promoted_claims:intelExpected.existing_promoted_claims??null,
    existing_effective_answers:intelExpected.existing_effective_answers??null,
    existing_robodebt_pre_action_timing:
      intelExpected.existing_robodebt_pre_action_timing??null,
    existing_intel_repository_content_receipts:
      intelExpected.intel_source_addressed_candidates??null,
    hfu_source_addressed_candidates:
      observation?.evidence?.source_addressed_receipt===true&&
      Array.isArray(candidate?.receipt?.sources)&&
      candidate.receipt.sources.length>0?1:0,
    hfu_claim_evidence_admissible:hfu.claim_evidence_admissible?1:0,
    hfu_repository_promotion_allowed:hfu.repository_promotion_allowed?1:0,
    hfu_answer_effective:hfu.answer_effective,
    hfu_practical_exit_or_governance:
      observation?.answer?.dimensions?.practical_exit_or_governance===true,
    hfu_durability:observation?.answer?.dimensions?.durability===true,
    total_effective_answers:
      (intelExpected.existing_effective_answers||0)+
      (hfu.answer_effective&&hfu.repository_promotion_allowed?1:0),
    cross_domain_regression_completed:false,
    issue_345_may_close:false,
    hfu_evaluation:hfu
  };
}

export function validateHfuShareExitReceiptCandidate(
  candidate,
  {
    audit,
    exitPilot,
    sourceRegistry,
    intelCandidate,
    contract,
    dependencyBlobShas={}
  }
){
  const errors=[];
  const fail=(message)=>errors.push(message);
  const check=(condition,message)=>{if(!condition)fail(message);};

  check(
    candidate?.schema_version===
      'm05-answerable-power-s03-l7-hfu-share-exit-receipt-candidate@1',
    'HFU candidate schema drift'
  );
  check(
    candidate?.object_class==='bounded_public_platform_exit_operation_receipt_candidate',
    'HFU candidate object class drift'
  );
  check(
    candidate?.program_id==='M-05'&&
      candidate?.sprint_id==='M05-SPRINT-03'&&
      candidate?.leg_id==='S03-L7',
    'HFU candidate program binding drift'
  );
  check(candidate?.issue===345,'HFU candidate issue identity drift');
  check(candidate?.as_of==='2026-08-17','HFU candidate as-of drift');
  check(
    candidate?.status==='repository_content_candidate_frozen',
    'HFU candidate status drift'
  );
  check(
    digest(candidate)===HFU_SHARE_CANDIDATE_JSON_SHA256,
    'HFU candidate exact-object custody drift'
  );
  check(text(candidate?.title,50)&&text(candidate?.question,140),
    'HFU candidate title or question is under-specified');

  check(
    candidate?.canonical_base?.branch==='main'&&
      candidate?.canonical_base?.sha==='92c65737a5743a26ff61665e25508bfab478b875'&&
      candidate?.canonical_base?.tree_sha==='7055be17dd553ee687895afade770b86ae72df06',
    'HFU canonical base drift'
  );

  const expectedBindings={
    real_receipt_audit:[
      'data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json',
      '4dce5e6d28c427a8c5fff3953c44d0e1e5a1f99f'
    ],
    public_platform_exit_pilot:[
      'data/project/m05-answerable-power-sprint-03-leg-05-public-platform-exit.json',
      'e0002da8f65c46acd00a84251a6d141487daf8b8'
    ],
    sprint_01_source_registry:[
      'data/intake/m05-answerable-power-sprint-01-sources.json',
      'c933a61fa709584f80b175aba972f93a19a6d90f'
    ],
    evidence_state_contract:[
      'data/project/m05-source-health-evidence-state-regression.json',
      '72f7ce6c711e07c5f8c72355d2b2c491a4dc7a33'
    ],
    intel_repository_content_receipt:[
      'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json',
      'ff88d6d3cd6ae021f7ecbbe596026b82f15ce58a'
    ]
  };
  for(const [key,[path,sha]] of Object.entries(expectedBindings)){
    check(candidate?.bindings?.[key]?.path===path,`${key} path binding drift`);
    check(candidate?.bindings?.[key]?.blob_sha===sha,`${key} declared blob binding drift`);
    if(Object.prototype.hasOwnProperty.call(dependencyBlobShas,key)){
      check(dependencyBlobShas[key]===sha,`${key} live Git blob drift`);
    }
  }
  check(
    same(candidate?.bindings?.external_service_repository,HFU_SHARE_EXTERNAL_REPOSITORY),
    'HFU external service repository binding drift'
  );

  const receipt=candidate?.receipt||{};
  check(receipt.receipt_id===HFU_SHARE_RECEIPT_ID,'HFU receipt identity drift');
  check(receipt.domain_id===HFU_SHARE_DOMAIN_ID,'HFU domain identity drift');
  check(receipt.jurisdiction===HFU_SHARE_JURISDICTION,'HFU jurisdiction drift');
  check(text(receipt.title,50),'HFU receipt title is under-specified');

  const claim=receipt.claim_binding||{};
  for(const field of ['identity_scope','temporal_scope','predicate_scope','claim']){
    check(text(claim[field],180),`HFU claim binding ${field} is under-specified`);
  }
  check(claim.claim===HFU_SHARE_AUTHORIZED_CLAIM,'HFU exact claim widened or changed');

  const sources=Array.isArray(receipt.sources)?receipt.sources:[];
  check(sources.length===HFU_SHARE_SOURCE_IDS.length,'HFU source denominator drift');
  check(same(sources.map((row)=>row.source_id),HFU_SHARE_SOURCE_IDS),
    'HFU source identity or order drift');
  check(unique(sources.map((row)=>row.source_id)),'duplicate HFU source identifier');

  const allowedClasses=[
    'official_audit_record',
    'official_delivery_account',
    'official_operating_guidance',
    'official_statutory_funding_record',
    'official_privacy_notice',
    'source_native_primary_record'
  ];
  for(const source of sources){
    const prefix=source?.source_id||'missing-source';
    check(text(source?.authority,20),`${prefix} lacks authority`);
    check(allowedClasses.includes(source?.record_type),`${prefix} source class drift`);
    check(/^\d{4}-\d{2}-\d{2}$/.test(source?.published_at||''),
      `${prefix} publication date drift`);
    let parsed=null;
    try{parsed=new URL(source?.url)}catch{}
    check(Boolean(parsed),`${prefix} URL invalid`);
    if(parsed){
      check(parsed.protocol==='https:',`${prefix} must use HTTPS`);
      check(HFU_SHARE_SOURCE_HOSTS.includes(parsed.hostname),
        `${prefix} escaped the official or source-native host boundary`);
    }
    check(Array.isArray(source?.locator)&&source.locator.length>=2,
      `${prefix} lacks a substantive locator`);
    for(const locator of source?.locator||[]){
      check(text(locator,25),`${prefix} contains an under-specified locator`);
    }
    if(source.record_type==='source_native_primary_record'){
      check(source?.git_binding?.repository===HFU_SHARE_EXTERNAL_REPOSITORY.repository,
        `${prefix} repository identity drift`);
      check(source?.git_binding?.commit_sha===HFU_SHARE_EXTERNAL_REPOSITORY.commit_sha,
        `${prefix} commit binding drift`);
    }
  }

  const repoSource=sources.find((row)=>row.source_id==='UK-HFU-SHARE-REPO-COMMIT-2026');
  check(repoSource?.git_binding?.tree_sha===HFU_SHARE_EXTERNAL_REPOSITORY.tree_sha,
    'HFU external repository tree drift');
  const blobExpectations={
    'UK-HFU-SHARE-README-2026':HFU_SHARE_EXTERNAL_REPOSITORY.readme_blob_sha,
    'UK-HFU-SHARE-LICENCE-2026':HFU_SHARE_EXTERNAL_REPOSITORY.licence_blob_sha,
    'UK-HFU-SHARE-CHANGELOG-2026':HFU_SHARE_EXTERNAL_REPOSITORY.changelog_blob_sha
  };
  for(const [sourceId,blobSha] of Object.entries(blobExpectations)){
    check(
      sources.find((row)=>row.source_id===sourceId)?.git_binding?.blob_sha===blobSha,
      `${sourceId} blob binding drift`
    );
  }

  const chain=receipt.transition_chain||{};
  for(const field of HFU_SHARE_TRUE_CHAIN_FIELDS){
    check(chain[field]===true,`HFU transition chain ${field} drift`);
  }
  for(const field of HFU_SHARE_FALSE_CHAIN_FIELDS){
    check(chain[field]===false,`HFU transition chain ${field} must remain false`);
  }
  check(
    same(Object.keys(chain),[
      ...HFU_SHARE_TRUE_CHAIN_FIELDS,
      ...HFU_SHARE_FALSE_CHAIN_FIELDS
    ]),
    'HFU transition-chain identity or order drift'
  );

  const observation=receipt.observation||{};
  check(
    observation.domain_id===HFU_SHARE_DOMAIN_ID&&
      observation.jurisdiction===HFU_SHARE_JURISDICTION,
    'HFU observation identity drift'
  );
  check(
    observation.observation_class===
      'executed_public_platform_exit_with_operating_continuity_and_residual_dependencies',
    'HFU observation class drift'
  );
  check(observation.fixture_only===false,'HFU receipt escaped the real-record boundary');
  check(observation.promotes_to==='none','HFU receipt escaped the no-promotion boundary');
  for(const key of ['coverage_healthy','route_healthy','content_healthy']){
    check(observation.source_health?.[key]===true,`HFU source health ${key} drift`);
  }
  check(observation.evidence?.source_class==='source_native_primary_record',
    'HFU evidence source class drift');
  check(observation.evidence?.promotion_ceiling==='repository_content',
    'HFU evidence promotion ceiling drift');
  for(const gate of EVIDENCE_BOOLEAN_GATES){
    const expected=gate==='promotion_authority'?false:true;
    check(observation.evidence?.[gate]===expected,`HFU evidence gate ${gate} drift`);
  }

  const answer=observation.answer||{};
  check(answer.observed_domains===1&&answer.observed_jurisdictions===1,
    'HFU answer denominator drift');
  check(answer.observed_outcome===true,'HFU observed exit outcome missing');
  check(answer.composed_durable_answer===false,
    'HFU receipt improperly claims a composed durable answer');
  check(same(Object.keys(answer.dimensions||{}),ANSWER_DIMENSIONS),
    'HFU answer dimension identity or order drift');
  check(same(answer.dimensions,HFU_SHARE_EXPECTED_DIMENSIONS),
    'HFU answer dimension ledger drift');
  check(same(receipt.deficits,HFU_SHARE_DEFICITS),'HFU deficit ledger drift');

  for(const field of ['evidence_tier','venue','target','upside','downside','failure_mode']){
    check(text(receipt.assessment?.[field],field==='target'?60:100),
      `HFU assessment ${field} is under-specified`);
  }

  const evaluation=evaluateObservation(observation,contract);
  check(evaluation.claim_evidence_admissible===false,
    'HFU receipt promoted to claim evidence');
  check(evaluation.repository_promotion_allowed===false,
    'HFU receipt escaped repository content');
  check(evaluation.answer_effective===false,
    'HFU receipt promoted to answer effectiveness');
  check(
    observation.expected?.claim_evidence_admissible===false&&
      observation.expected?.answer_effective===false,
    'HFU observation expectation drift'
  );

  check(
    audit?.schema_version===
      'm05-answerable-power-s03-l7-real-receipt-admission-audit@1',
    'real-receipt audit schema drift'
  );
  const exitAudit=audit?.domain_audits?.find((row)=>row.domain_id===HFU_SHARE_DOMAIN_ID);
  check(Boolean(exitAudit),'APC-EXIT-01 audit binding missing');
  check(exitAudit?.pilot_ceiling==='R5_bounded_public_substitution_control',
    'APC-EXIT-01 pilot ceiling drift');
  check(exitAudit?.project_binding?.path===
      'data/project/m05-answerable-power-sprint-03-leg-05-public-platform-exit.json'&&
      exitAudit?.project_binding?.blob_sha==='e0002da8f65c46acd00a84251a6d141487daf8b8',
    'APC-EXIT-01 project binding drift');
  for(const field of [
    'claim_evidence_admissible',
    'answer_effective',
    'jurisdiction_contributes_to_answer',
    'pilot_promoted',
    'control_transfer_allowed'
  ]){
    check(exitAudit?.current_state?.[field]===false,
      `APC-EXIT-01 audit state ${field} drift`);
  }

  check(
    exitPilot?.schema_version===
      'm05-answerable-power-sprint-03-leg-05-public-platform-exit@1'&&
      exitPilot?.domain_adapter_id===HFU_SHARE_DOMAIN_ID,
    'public-platform-exit pilot binding drift'
  );
  const hfuSystem=exitPilot?.systems?.find((row)=>row.system_id==='EXIT-HFU-SHARE');
  check(Boolean(hfuSystem),'frozen HFU Share pilot system missing');
  check(hfuSystem?.highest_observed_level===
      'R5_bounded_public_substitution_and_operating_capacity',
    'frozen HFU Share pilot ceiling drift');

  check(
    sourceRegistry?.schema_version==='m05-answerable-power-sprint-source-registry@1',
    'Sprint 01 source registry schema drift'
  );
  const registryIds=['M05-SP01-SRC-011','M05-SP01-SRC-012','M05-SP01-SRC-013'];
  const registryRows=(sourceRegistry?.sources||[]).filter((row)=>registryIds.includes(row.source_id));
  check(same(registryRows.map((row)=>row.source_id),registryIds),
    'HFU frozen source-registry identity or order drift');
  check(
    registryRows.find((row)=>row.source_id==='M05-SP01-SRC-012')?.url===
      'https://mhclgdigital.blog.gov.uk/2026/04/09/from-emergency-to-sustainability-creating-share-homes-for-ukraine-data/',
    'HFU delivery source registry URL drift'
  );
  check(
    registryRows.find((row)=>row.source_id==='M05-SP01-SRC-013')?.url===
      'https://www.gov.uk/guidance/data-sharing-and-case-management-system-cms-homes-for-ukraine',
    'HFU operating guidance source registry URL drift'
  );

  check(
    intelCandidate?.schema_version===
      'm05-answerable-power-s03-l7-intel-chips-equity-receipt-candidate@1',
    'Intel predecessor receipt schema drift'
  );
  check(intelCandidate?.expected_state?.existing_promoted_claims===3,
    'existing promoted-claim count drift');
  check(intelCandidate?.expected_state?.existing_effective_answers===0,
    'existing effective-answer count drift');
  check(intelCandidate?.expected_state?.existing_robodebt_pre_action_timing===true,
    'existing Robodebt pre-action advancement drift');
  check(intelCandidate?.expected_state?.intel_source_addressed_candidates===1,
    'existing Intel repository-content receipt drift');

  check(
    contract?.schema_version==='m05-source-health-evidence-state-regression@1',
    'evidence-state contract schema drift'
  );

  const summary=summarizeHfuShareExitReceiptCandidate(candidate,{intelCandidate,contract});
  for(const [key,value] of Object.entries(candidate?.expected_state||{})){
    check(summary[key]===value,`HFU expected state ${key} drift`);
  }

  const boundaries=candidate?.boundaries||{};
  for(const key of [
    'changes_real_receipt_audit',
    'changes_public_platform_exit_pilot',
    'changes_sprint_01_source_registry',
    'changes_intel_repository_content_receipt',
    'inherits_prior_promotion_authority',
    'supplier_exit_is_complete_sovereignty',
    'public_code_is_supplier_free_operation',
    'reported_savings_are_independently_reconciled_value',
    'operating_guidance_is_affected_party_governance',
    'grant_dependency_is_answer_effectiveness',
    'hfu_claim_promoted',
    'answer_effectiveness_claimed',
    'cross_domain_regression_completed',
    'issue_345_may_close',
    'conclusion_generated',
    'project_complete'
  ]){
    check(boundaries[key]===false,`HFU boundary ${key} weakened`);
  }
  check(boundaries.promotes_to==='repository_content','HFU repository ceiling drift');
  check(boundaries.graph_effect==='none','HFU graph effect drift');

  return errors;
}

export function buildSyntheticPromotableHfuObservation(candidate){
  const observation=clone(candidate.receipt.observation);
  observation.promotes_to='candidate_evidence';
  observation.evidence.promotion_ceiling='claim_evidence';
  observation.evidence.promotion_authority=true;
  return observation;
}
