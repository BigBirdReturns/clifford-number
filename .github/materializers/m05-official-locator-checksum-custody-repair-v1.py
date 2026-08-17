#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CANDIDATE_PATH = ROOT / "data/project/m05-cross-domain-official-receipt-candidates.json"
HELPER_PATH = ROOT / "tools/lib/m05-cross-domain-official-receipt-candidates.mjs"
VALIDATOR_PATH = ROOT / "tools/validate-m05-source-health-evidence-state-regression.mjs"
TEST_PATH = ROOT / "test/m05-source-health-evidence-state-regression.test.js"

AUDIT_PATH = "data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json"
AUDIT_MERGE = "cc20bf5720ccb22036351e7aa009590cc6dc6081"
REQUIRED_FIELDS = [
    "subject_identity",
    "decision_system",
    "decision_time",
    "consequence_predicate",
    "source_addressed_primary_record",
    "independent_authority",
    "observed_outcome",
    "remedy",
    "durability",
    "practical_exit_or_governance",
]

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)

packet = json.loads(CANDIDATE_PATH.read_text(encoding="utf-8"))
packet["object_class"] = "bounded_cross_domain_official_record_locator_candidate_set"
packet["status"] = "candidate_repository_locators"
packet["title"] = "Cross-domain official record locator candidates"
packet["question"] = (
    "Which official primary or adjudicative records can be located and claim-scoped across "
    "three answerable-power domains and three jurisdictions while withholding the "
    "source-addressed receipt gate until exact content bytes and SHA-256 custody are recorded?"
)
packet["admission_audit_binding"] = {
    "path": AUDIT_PATH,
    "merge_pull_request": 2152,
    "merge_commit": AUDIT_MERGE,
    "required_real_receipt_fields": REQUIRED_FIELDS,
    "source_addressed_primary_record_requires_checksum": True,
}
for row in packet["records"]:
    for source in row["sources"]:
        source["content_receipt"] = {
            "state": "locator_only_no_checksum",
            "bytes": None,
            "sha256": None,
        }
    row["observation"]["evidence"]["source_addressed_receipt"] = False
    if "source_addressed_receipt" not in row["deficits"]:
        row["deficits"].insert(0, "source_addressed_receipt")
    row["assessment"]["evidence_tier"] = (
        f"{row['assessment']['evidence_tier']}; official locator and claim scope reviewed, "
        "exact content checksum custody absent"
    )

packet["expected_state"] = {
    "official_locator_candidates": 3,
    "source_addressed_candidates": 0,
    "checksum_bound_primary_records": 0,
    "candidate_jurisdictions": 3,
    "claim_evidence_admissible": 0,
    "effective_answers": 0,
    "cross_domain_regression_completed": False,
}
packet["boundaries"]["locator_candidate_is_source_addressed_receipt"] = False
CANDIDATE_PATH.write_text(json.dumps(packet, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

helper = r"""import {
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

export const OFFICIAL_RECEIPT_AUDIT_PATH=
  'data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json';
export const OFFICIAL_RECEIPT_AUDIT_MERGE=
  'cc20bf5720ccb22036351e7aa009590cc6dc6081';
export const OFFICIAL_RECEIPT_REQUIRED_REAL_FIELDS=[
  'subject_identity',
  'decision_system',
  'decision_time',
  'consequence_predicate',
  'source_addressed_primary_record',
  'independent_authority',
  'observed_outcome',
  'remedy',
  'durability',
  'practical_exit_or_governance'
];

const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const text=(value,min=1)=>typeof value==='string'&&value.trim().length>=min;
const unique=(values)=>new Set(values).size===values.length;
const sort=(values)=>[...values].sort();
const sha256=(value)=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);

export function sourceHasChecksumBoundReceipt(source){
  const receipt=source?.content_receipt||{};
  return receipt.state==='checksum_bound'
    &&Number.isSafeInteger(receipt.bytes)
    &&receipt.bytes>0
    &&sha256(receipt.sha256);
}

export function recordHasChecksumBoundPrimaryRecord(row){
  return Array.isArray(row?.sources)
    &&row.sources.length>0
    &&row.sources.every(sourceHasChecksumBoundReceipt);
}

function recordHasOfficialLocators(row){
  return Array.isArray(row?.sources)
    &&row.sources.length>0
    &&row.sources.every((source)=>
      text(source?.url,12)
      &&Array.isArray(source?.locator)
      &&source.locator.length>0
    );
}

export function summarizeOfficialReceiptCandidates(packet,contract){
  const records=Array.isArray(packet?.records)?packet.records:[];
  const evaluations=records.map((row)=>evaluateObservation(row.observation,contract));
  const effectiveEntries=records
    .map((row,index)=>({row,evaluation:evaluations[index]}))
    .filter(({evaluation})=>evaluation.answer_effective&&evaluation.repository_promotion_allowed);
  const effectiveJurisdictions=new Set(effectiveEntries
    .map(({row})=>row.jurisdiction)
    .filter((value)=>text(value)));
  const officialLocatorCandidates=records.filter(recordHasOfficialLocators).length;
  const checksumBoundPrimaryRecords=records
    .filter(recordHasChecksumBoundPrimaryRecord).length;
  const sourceAddressedCandidates=records.filter((row)=>
    row?.observation?.evidence?.source_addressed_receipt===true
    &&recordHasChecksumBoundPrimaryRecord(row)
  ).length;
  const candidateJurisdictions=new Set(records
    .map((row)=>row.jurisdiction)
    .filter((value)=>text(value))).size;
  const claimEvidenceAdmissible=evaluations
    .filter((row)=>row.claim_evidence_admissible&&row.repository_promotion_allowed).length;
  const effectiveAnswers=effectiveEntries.length;
  return {
    official_locator_candidates:officialLocatorCandidates,
    source_addressed_candidates:sourceAddressedCandidates,
    checksum_bound_primary_records:checksumBoundPrimaryRecords,
    candidate_jurisdictions:candidateJurisdictions,
    claim_evidence_admissible:claimEvidenceAdmissible,
    effective_answers:effectiveAnswers,
    cross_domain_regression_completed:
      effectiveAnswers>=contract.answer_effectiveness_contract.minimum_observed_domains
      &&effectiveJurisdictions.size>=contract.answer_effectiveness_contract.minimum_observed_jurisdictions
  };
}

export function validateOfficialReceiptCandidates(packet,contract,audit){
  const errors=[];
  const fail=(message)=>errors.push(message);
  const check=(condition,message)=>{if(!condition)fail(message);};

  check(packet?.schema_version==='m05-cross-domain-official-receipt-candidates@1','candidate schema drift');
  check(packet?.object_class==='bounded_cross_domain_official_record_locator_candidate_set','candidate object class drift');
  check(packet?.program_id==='M-05'&&packet?.sprint_id==='M05-SPRINT-03','candidate program binding drift');
  check(packet?.issue===345,'candidate issue identity drift');
  check(packet?.as_of==='2026-08-16','candidate as-of drift');
  check(packet?.status==='candidate_repository_locators','candidate status drift');
  check(text(packet?.title,20)&&text(packet?.question,80),'candidate title or question is under-specified');

  const gate=packet?.canonical_gate||{};
  check(gate.path==='data/project/m05-source-health-evidence-state-regression.json','canonical gate path drift');
  check(gate.merge_pull_request===2150,'canonical gate pull request drift');
  check(gate.merge_commit==='cb528c25deef376995123e1c6a35455568b90ec3','canonical gate merge commit drift');
  check(gate.product_head==='16df7e9c4182489f23569aec431159806c62223a','canonical gate product head drift');
  check(gate.minimum_domains===3&&gate.minimum_jurisdictions===2,'canonical gate denominator drift');

  check(audit?.schema_version==='m05-answerable-power-s03-l7-real-receipt-admission-audit@1','real-receipt audit is unavailable or incompatible');
  const auditBinding=packet?.admission_audit_binding||{};
  check(auditBinding.path===OFFICIAL_RECEIPT_AUDIT_PATH,'admission audit path drift');
  check(auditBinding.merge_pull_request===2152,'admission audit pull request drift');
  check(auditBinding.merge_commit===OFFICIAL_RECEIPT_AUDIT_MERGE,'admission audit merge commit drift');
  check(same(auditBinding.required_real_receipt_fields,OFFICIAL_RECEIPT_REQUIRED_REAL_FIELDS),'admission audit field binding drift');
  check(same(auditBinding.required_real_receipt_fields,audit?.required_real_receipt_fields),'candidate and audit required-field contracts diverged');
  check(auditBinding.source_addressed_primary_record_requires_checksum===true,'source-addressed checksum requirement weakened');
  check((audit?.real_receipt_field_meanings?.source_addressed_primary_record||'').includes('checksum'),'audit source-addressed primary-record meaning lost checksum custody');

  check(packet?.candidate_count===3,'candidate count drift');
  check(same(packet?.jurisdictions,OFFICIAL_RECEIPT_JURISDICTIONS),'candidate jurisdiction denominator drift');
  check(same(packet?.domain_ids,OFFICIAL_RECEIPT_DOMAINS),'candidate domain denominator drift');

  const records=Array.isArray(packet?.records)?packet.records:[];
  check(records.length===OFFICIAL_RECEIPT_IDS.length,'candidate record denominator drift');
  const receiptIds=records.map((row)=>row?.receipt_id);
  const sourceIds=[];
  check(same(receiptIds,OFFICIAL_RECEIPT_IDS),'candidate receipt identity or order drift');
  check(unique(receiptIds),'duplicate candidate receipt identifier');

  const auditRows=new Map((audit?.domain_audits||[]).map((row)=>[row.domain_id,row]));

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

    const auditRow=auditRows.get(domainId);
    check(Boolean(auditRow),`${prefix} lacks a canonical audit domain binding`);
    check(auditRow?.source_observation_id===domainId,`${prefix} audit observation binding drift`);
    for(const field of [
      'claim_evidence_admissible',
      'answer_effective',
      'jurisdiction_contributes_to_answer',
      'pilot_promoted',
      'control_transfer_allowed'
    ]){
      check(auditRow?.current_state?.[field]===false,`${prefix} audit state ${field} escaped the frozen boundary`);
    }
    check(Array.isArray(auditRow?.missing_evidence_receipts)&&auditRow.missing_evidence_receipts.length>0,`${prefix} audit missing-evidence ledger disappeared`);
    check(Array.isArray(auditRow?.missing_answer_dimensions)&&auditRow.missing_answer_dimensions.length>0,`${prefix} audit missing-answer ledger disappeared`);

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

      const contentReceipt=source?.content_receipt||{};
      check(same(Object.keys(contentReceipt),['state','bytes','sha256']),`${prefix} source ${source?.source_id||'missing'} content-receipt field drift`);
      check(contentReceipt.state==='locator_only_no_checksum',`${prefix} source ${source?.source_id||'missing'} escaped the locator-only custody boundary`);
      check(contentReceipt.bytes===null&&contentReceipt.sha256===null,`${prefix} source ${source?.source_id||'missing'} carries partial or unverified checksum custody`);
      check(sourceHasChecksumBoundReceipt(source)===false,`${prefix} source ${source?.source_id||'missing'} unexpectedly became checksum-bound`);
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
      const expected=!['source_addressed_receipt','promotion_authority'].includes(gateName);
      check(evidence[gateName]===expected,`${prefix} evidence gate ${gateName} drift`);
    }
    check(recordHasChecksumBoundPrimaryRecord(row)===false,`${prefix} unexpectedly contains a checksum-bound primary record`);
    check(evidence.source_addressed_receipt===recordHasChecksumBoundPrimaryRecord(row),`${prefix} source-addressed receipt claimed without complete checksum custody`);

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
      'source_addressed_receipt',
      'promotion_authority',
      'composed_durable_answer',
      ...expectedGaps.map((dimension)=>`dimension:${dimension}`)
    ];
    check(same(sort(row.deficits||[]),sort(expectedDeficits)),`${prefix} deficit ledger drift`);

    const assessment=row.assessment||{};
    for(const field of ['evidence_tier','venue','target','upside','downside','failure_mode']){
      check(text(assessment[field],field==='target'?10:30),`${prefix} assessment ${field} is under-specified`);
    }
    check(assessment.evidence_tier.includes('checksum custody absent'),`${prefix} assessment obscures the checksum-custody deficit`);

    const evaluated=evaluateObservation(observation,contract);
    check(evaluated.claim_evidence_admissible===false,`${prefix} candidate promoted to claim evidence`);
    check(evaluated.answer_effective===false,`${prefix} candidate promoted to answer effectiveness`);
    check(evaluated.repository_promotion_allowed===false,`${prefix} candidate escaped repository promotion boundary`);
    check(evaluated.evidence_failures.includes('source_addressed_receipt'),`${prefix} evaluator lost the source-addressed receipt failure`);
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
    'sprint03_advances',
    'locator_candidate_is_source_addressed_receipt'
  ]){
    check(boundaries[key]===false,`candidate boundary ${key} weakened`);
  }
  check(boundaries.promotes_to==='repository_content','candidate repository ceiling drift');
  check(boundaries.graph_effect==='none','candidate graph effect drift');

  return errors;
}
"""
HELPER_PATH.write_text(helper, encoding="utf-8")

validator = VALIDATOR_PATH.read_text(encoding="utf-8")
validator = replace_once(
    validator,
    "} from './lib/m05-source-health-evidence-state-regression.mjs';\n",
    "} from './lib/m05-source-health-evidence-state-regression.mjs';\n"
    "import {\n"
    "  summarizeOfficialReceiptCandidates,\n"
    "  validateOfficialReceiptCandidates\n"
    "} from './lib/m05-cross-domain-official-receipt-candidates.mjs';\n",
    "validator helper import",
)
validator = replace_once(
    validator,
    "const audit=read(process.env.M05_REAL_RECEIPT_AUDIT_PATH||'data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json');\n",
    "const audit=read(process.env.M05_REAL_RECEIPT_AUDIT_PATH||'data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json');\n"
    "const officialCandidates=read(process.env.M05_OFFICIAL_RECEIPT_CANDIDATES_PATH||'data/project/m05-cross-domain-official-receipt-candidates.json');\n",
    "validator candidate read",
)
candidate_validation = r"""
const officialCandidateErrors=validateOfficialReceiptCandidates(officialCandidates,contract,audit);
if(officialCandidateErrors.length){
  fail(`official receipt candidate validation failed:\n- ${officialCandidateErrors.join('\n- ')}`);
}
const officialCandidateSummary=summarizeOfficialReceiptCandidates(officialCandidates,contract);
if(!same(officialCandidateSummary,officialCandidates.expected_state))fail('official receipt candidate expected-state drift');
if(officialCandidateSummary.official_locator_candidates!==3||officialCandidateSummary.candidate_jurisdictions!==3)fail('official locator candidate denominator drift');
if(officialCandidateSummary.source_addressed_candidates!==0||officialCandidateSummary.checksum_bound_primary_records!==0)fail('unchecksummed official locators escaped the source-addressed receipt boundary');
if(officialCandidateSummary.claim_evidence_admissible!==0||officialCandidateSummary.effective_answers!==0||officialCandidateSummary.cross_domain_regression_completed!==false)fail('official locator candidates escaped the repository-content boundary');

"""
validator = replace_once(
    validator,
    "console.log('validate-m05-source-health-evidence-state-regression: OK (5 source-health observations and 5 canonical pilot bindings remain below claim admission; the synthetic complete receipt remains discriminating; issue #345 remains open)');",
    candidate_validation
    + "console.log('validate-m05-source-health-evidence-state-regression: OK (5 source-health observations, 5 canonical pilot bindings, and 3 official locator candidates remain below claim admission; checksum custody is required before source-addressed receipt status; issue #345 remains open)');",
    "validator final integration",
)
VALIDATOR_PATH.write_text(validator, encoding="utf-8")

test = TEST_PATH.read_text(encoding="utf-8")
test = replace_once(
    test,
    "} from '../tools/lib/m05-source-health-evidence-state-regression.mjs';\n",
    "} from '../tools/lib/m05-source-health-evidence-state-regression.mjs';\n"
    "import {\n"
    "  OFFICIAL_RECEIPT_DIMENSION_GAPS,\n"
    "  OFFICIAL_RECEIPT_IDS,\n"
    "  recordHasChecksumBoundPrimaryRecord,\n"
    "  sourceHasChecksumBoundReceipt,\n"
    "  summarizeOfficialReceiptCandidates,\n"
    "  validateOfficialReceiptCandidates\n"
    "} from '../tools/lib/m05-cross-domain-official-receipt-candidates.mjs';\n",
    "test helper import",
)
test = replace_once(
    test,
    "const audit=JSON.parse(fs.readFileSync(path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json'),'utf8'));\n",
    "const audit=JSON.parse(fs.readFileSync(path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json'),'utf8'));\n"
    "const officialCandidates=JSON.parse(fs.readFileSync(path.join(root,'data/project/m05-cross-domain-official-receipt-candidates.json'),'utf8'));\n",
    "test candidate read",
)
old_runner = """const runValidator=(auditPath)=>spawnSync(process.execPath,['tools/validate-m05-source-health-evidence-state-regression.mjs'],{
  cwd:root,
  encoding:'utf8',
  env:auditPath?{...process.env,M05_REAL_RECEIPT_AUDIT_PATH:auditPath}:process.env
});"""
new_runner = """const runValidator=(auditPath,candidatePath)=>{
  const env={...process.env};
  if(auditPath)env.M05_REAL_RECEIPT_AUDIT_PATH=auditPath;
  if(candidatePath)env.M05_OFFICIAL_RECEIPT_CANDIDATES_PATH=candidatePath;
  return spawnSync(process.execPath,['tools/validate-m05-source-health-evidence-state-regression.mjs'],{
    cwd:root,
    encoding:'utf8',
    env
  });
};"""
test = replace_once(test, old_runner, new_runner, "test validator runner")

candidate_tests = r"""
assert.deepEqual(validateOfficialReceiptCandidates(officialCandidates,contract,audit),[]);
assert.deepEqual(summarizeOfficialReceiptCandidates(officialCandidates,contract),officialCandidates.expected_state);
assert.deepEqual(officialCandidates.records.map((row)=>row.receipt_id),OFFICIAL_RECEIPT_IDS);

for(const row of officialCandidates.records){
  const evaluation=evaluateObservation(row.observation,contract);
  assert.equal(recordHasChecksumBoundPrimaryRecord(row),false,`${row.receipt_id} must remain without checksum-bound primary-record custody`);
  assert.equal(evaluation.claim_evidence_admissible,false,`${row.receipt_id} must remain below claim evidence`);
  assert.equal(evaluation.answer_effective,false,`${row.receipt_id} must remain below answer effectiveness`);
  assert.equal(evaluation.repository_promotion_allowed,false,`${row.receipt_id} must remain repository content`);
  assert.ok(evaluation.evidence_failures.includes('source_addressed_receipt'),`${row.receipt_id} must fail the source-addressed receipt gate`);
  const observedGaps=ANSWER_DIMENSIONS.filter((dimension)=>row.observation.answer.dimensions[dimension]===false);
  assert.deepEqual(observedGaps,OFFICIAL_RECEIPT_DIMENSION_GAPS[row.receipt_id],`${row.receipt_id} dimension-gap ledger drift`);

  const authorityOnly=structuredClone(row.observation);
  authorityOnly.evidence.promotion_authority=true;
  assert.equal(evaluateObservation(authorityOnly,contract).claim_evidence_admissible,false,`${row.receipt_id} must not promote while checksum custody and the claim-evidence ceiling remain absent`);

  const ceilingAndAuthority=structuredClone(row.observation);
  ceilingAndAuthority.evidence.promotion_authority=true;
  ceilingAndAuthority.evidence.promotion_ceiling='claim_evidence';
  ceilingAndAuthority.promotes_to='candidate_evidence';
  const unchecksummedEvaluation=evaluateObservation(ceilingAndAuthority,contract);
  assert.equal(unchecksummedEvaluation.claim_evidence_admissible,false,`${row.receipt_id} must not promote without a source-addressed receipt`);
  assert.ok(unchecksummedEvaluation.evidence_failures.includes('source_addressed_receipt'));

  const syntheticChecksumBound=structuredClone(ceilingAndAuthority);
  syntheticChecksumBound.evidence.source_addressed_receipt=true;
  const syntheticEvaluation=evaluateObservation(syntheticChecksumBound,contract);
  assert.equal(syntheticEvaluation.claim_evidence_admissible,true,`${row.receipt_id} complete synthetic evidence gates should remain discriminating`);
  assert.equal(syntheticEvaluation.answer_effective,false,`${row.receipt_id} unresolved answer dimensions must still fail closed`);
  assert.equal(syntheticEvaluation.repository_promotion_allowed,true,`${row.receipt_id} synthetic complete receipt should reach only candidate evidence`);

  const syntheticSource=structuredClone(row.sources[0]);
  syntheticSource.content_receipt={
    state:'checksum_bound',
    bytes:123,
    sha256:'a'.repeat(64)
  };
  assert.equal(sourceHasChecksumBoundReceipt(syntheticSource),true);
}

const expectCandidateFailure=(label,mutate,pattern)=>{
  const mutation=structuredClone(officialCandidates);
  mutate(mutation);
  const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'m05-official-locator-candidates-'));
  const tempPath=path.join(tempDir,'candidates.json');
  try{
    fs.writeFileSync(tempPath,`${JSON.stringify(mutation,null,2)}\n`,'utf8');
    const result=runValidator(undefined,tempPath);
    assert.notEqual(result.status,0,`${label} mutation must fail the validator`);
    assert.match(`${result.stdout}\n${result.stderr}`,pattern,`${label} mutation must fail for the expected reason`);
  }finally{
    fs.rmSync(tempDir,{recursive:true,force:true});
  }
};

expectCandidateFailure('insecure URL',(row)=>{
  row.records[0].sources[0].url=row.records[0].sources[0].url.replace('https://','http://');
},/must use HTTPS/u);
expectCandidateFailure('foreign host',(row)=>{
  row.records[1].sources[0].url='https://example.com/syri';
},/outside the official host boundary/u);
expectCandidateFailure('missing locator',(row)=>{
  row.records[2].sources[0].locator=[];
},/lacks a locator/u);
expectCandidateFailure('duplicate source',(row)=>{
  row.records[2].sources[0].source_id=row.records[1].sources[0].source_id;
},/duplicate official source identifier/u);
expectCandidateFailure('false source-addressed flag',(row)=>{
  row.records[0].observation.evidence.source_addressed_receipt=true;
  row.records[0].deficits=row.records[0].deficits.filter((value)=>value!=='source_addressed_receipt');
},/source-addressed receipt claimed without complete checksum custody/u);
expectCandidateFailure('partial checksum custody',(row)=>{
  row.records[0].sources[0].content_receipt={state:'checksum_bound',bytes:123,sha256:null};
},/escaped the locator-only custody boundary|partial or unverified checksum custody/u);
expectCandidateFailure('audit merge binding',(row)=>{
  row.admission_audit_binding.merge_commit='0'.repeat(40);
},/admission audit merge commit drift/u);
expectCandidateFailure('checksum boundary weakening',(row)=>{
  row.admission_audit_binding.source_addressed_primary_record_requires_checksum=false;
},/source-addressed checksum requirement weakened/u);
expectCandidateFailure('false issue closure',(row)=>{
  row.boundaries.issue_345_closes=true;
},/candidate boundary issue_345_closes weakened/u);

const promotedOfficialContract=structuredClone(contract);
promotedOfficialContract.domain_observations=officialCandidates.records.map((row)=>{
  const observation=structuredClone(row.observation);
  observation.evidence.source_addressed_receipt=true;
  observation.evidence.promotion_authority=true;
  observation.evidence.promotion_ceiling='claim_evidence';
  observation.promotes_to='candidate_evidence';
  return observation;
});
promoted=evaluateRegression(promotedOfficialContract);
assert.equal(promoted.admissible_domain_evidence_records,3);
assert.equal(promoted.effective_domain_answers,0);
assert.equal(promoted.cross_domain_regression_completed,false,'three synthetic checksum-bound claim records with unresolved answer deficits must not complete the regression');

"""
old_console = "console.log(`m05-source-health-evidence-state-regression.test: OK (${EVIDENCE_BOOLEAN_GATES.length} evidence-gate mutations; ${EVIDENCE_SUFFICIENCY_GUARDS.length+ANSWER_SUFFICIENCY_GUARDS.length} fail-closed contract guards; ${ANSWER_DIMENSIONS.length} answer-dimension mutations; 3 completion-path regressions; 5 bound pilot audits; 16 real-receipt audit mutations)`);"
new_console = candidate_tests + "console.log(`m05-source-health-evidence-state-regression.test: OK (${EVIDENCE_BOOLEAN_GATES.length} evidence-gate mutations; ${EVIDENCE_SUFFICIENCY_GUARDS.length+ANSWER_SUFFICIENCY_GUARDS.length} fail-closed contract guards; ${ANSWER_DIMENSIONS.length} answer-dimension mutations; 3 completion-path regressions; 5 bound pilot audits; 16 real-receipt audit mutations; ${OFFICIAL_RECEIPT_IDS.length} official locator candidates with 9 custody and boundary attacks)`);"
test = replace_once(test, old_console, new_console, "test candidate integration")
TEST_PATH.write_text(test, encoding="utf-8")

print("materialized checksum-custody and audit integration repair")
