#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  summarizeIntelChipsEquityReceiptCandidate,
  validateIntelChipsEquityReceiptCandidate
} from './lib/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const readRaw=(target)=>fs.readFileSync(target);
const readJson=(target)=>JSON.parse(readRaw(target).toString('utf8'));
const gitBlobSha=(buffer)=>crypto
  .createHash('sha1')
  .update(Buffer.from(`blob ${buffer.length}\0`,'utf8'))
  .update(buffer)
  .digest('hex');
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const fail=(message)=>{throw new Error(message)};

const candidatePath=resolvePath(
  'M05_INTEL_CHIPS_EQUITY_CANDIDATE_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json'
);
const auditPath=resolvePath(
  'M05_REAL_RECEIPT_AUDIT_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json'
);
const promotionPath=resolvePath(
  'M05_CLAIM_PROMOTION_ADJUDICATION_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json'
);
const implementationGapLedgerPath=resolvePath(
  'M05_IMPLEMENTATION_GAP_LEDGER_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.json'
);
const robodebtReceiptPath=resolvePath(
  'M05_ROBODEBT_PRE_ACTION_RECEIPT_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json'
);
const packetPath=resolvePath(
  'M05_OFFICIAL_RECEIPT_PACKET_PATH',
  'data/project/m05-cross-domain-official-receipt-candidates.json'
);
const contractPath=resolvePath(
  'M05_EVIDENCE_STATE_CONTRACT_PATH',
  'data/project/m05-source-health-evidence-state-regression.json'
);
const valuePilotPath=resolvePath(
  'M05_VALUE_RECOVERY_PILOT_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-06-value-recovery-transfer.json'
);
const valueSourcesPath=resolvePath(
  'M05_VALUE_RECOVERY_SOURCE_REGISTRY_PATH',
  'data/intake/m05-answerable-power-sprint-03-leg-06-value-recovery-sources.json'
);

const candidateRaw=readRaw(candidatePath);
const candidate=JSON.parse(candidateRaw.toString('utf8'));
const auditRaw=readRaw(auditPath);
const audit=JSON.parse(auditRaw.toString('utf8'));
const promotionRaw=readRaw(promotionPath);
const promotion=JSON.parse(promotionRaw.toString('utf8'));
const implementationGapLedgerRaw=readRaw(implementationGapLedgerPath);
const implementationGapLedger=JSON.parse(implementationGapLedgerRaw.toString('utf8'));
const robodebtReceiptRaw=readRaw(robodebtReceiptPath);
const robodebtReceipt=JSON.parse(robodebtReceiptRaw.toString('utf8'));
const packetRaw=readRaw(packetPath);
const packet=JSON.parse(packetRaw.toString('utf8'));
const contractRaw=readRaw(contractPath);
const contract=JSON.parse(contractRaw.toString('utf8'));
const valuePilotRaw=readRaw(valuePilotPath);
const valuePilot=JSON.parse(valuePilotRaw.toString('utf8'));
const valueSourcesRaw=readRaw(valueSourcesPath);
const valueSources=JSON.parse(valueSourcesRaw.toString('utf8'));

if(candidateRaw.toString('utf8')!==`${JSON.stringify(candidate,null,2)}\n`){
  fail('Intel candidate must use canonical two-space JSON serialization');
}

if(candidate.canonical_base?.branch!=='main')fail('Intel canonical branch drift');
if(candidate.canonical_base?.sha!=='3e9132f1628fe96989b931f56a302bf69907ef99'){
  fail('Intel canonical base drift');
}
if(candidate.canonical_base?.tree_sha!=='7f2706edbc084b01b07d6abb3cf7fc9d413880c4'){
  fail('Intel canonical tree drift');
}
if(candidate.canonical_base?.claim_promotion_pull_request!==2153){
  fail('Intel canonical promotion pull-request binding drift');
}
if(candidate.canonical_base?.implementation_gap_pull_request!==2154){
  fail('Intel canonical implementation-gap pull-request binding drift');
}
if(candidate.canonical_base?.robodebt_pre_action_pull_request!==2155){
  fail('Intel canonical Robodebt pull-request binding drift');
}

const expectedBindings={
  real_receipt_audit:{
    path:'data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json',
    blob_sha:'4dce5e6d28c427a8c5fff3953c44d0e1e5a1f99f',
    schema_version:'m05-answerable-power-s03-l7-real-receipt-admission-audit@1',
    pull_request:2152,
    merge_commit:'cc20bf5720ccb22036351e7aa009590cc6dc6081'
  },
  claim_promotion_adjudication:{
    path:'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json',
    blob_sha:'e64f24fb74094b99e717c2cd03af8e0620d23f15',
    schema_version:'m05-answerable-power-s03-l7-claim-evidence-promotion-adjudication@1',
    pull_request:2153,
    merge_commit:'49d1f3617132248484647eca4ddfa4fa49db40fb'
  },
  implementation_gap_ledger:{
    path:'data/project/m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.json',
    blob_sha:'ec0f9e68804c54ad487eb08a8ec8691bbd4db2bf',
    schema_version:'m05-answerable-power-s03-l7-implementation-gap-probe-ledger@1',
    pull_request:2154,
    merge_commit:'1933ce675fe0a5965218ca13cdf12050ea3162c4'
  },
  robodebt_pre_action_receipt:{
    path:'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json',
    blob_sha:'a31d7ea7a1432a169de31035c153210b8975e217',
    schema_version:'m05-answerable-power-s03-l7-robodebt-pre-action-implementation-receipt@1',
    pull_request:2155,
    merge_commit:'3e9132f1628fe96989b931f56a302bf69907ef99'
  },
  official_receipt_packet:{
    path:'data/project/m05-cross-domain-official-receipt-candidates.json',
    blob_sha:'1c17549a39b826853435d3726596bf41d0fc7de9',
    schema_version:'m05-cross-domain-official-receipt-candidates@1',
    pull_request:2151,
    merge_commit:'204fb917a6fcef3d3a6fcf09186bf9c2de7ed2f0'
  },
  evidence_state_contract:{
    path:'data/project/m05-source-health-evidence-state-regression.json',
    blob_sha:'72f7ce6c711e07c5f8c72355d2b2c491a4dc7a33',
    schema_version:'m05-source-health-evidence-state-regression@1'
  },
  value_recovery_pilot:{
    path:'data/project/m05-answerable-power-sprint-03-leg-06-value-recovery-transfer.json',
    blob_sha:'4cbe648c7d5b03e020e7f87aff7b9f4f3f11a076',
    schema_version:'m05-answerable-power-sprint-03-leg-06-value-recovery-transfer@1',
    merge_commit:'960c51d11b3210d2b1083fce6a49c5ad5fc6ca86'
  },
  value_recovery_source_registry:{
    path:'data/intake/m05-answerable-power-sprint-03-leg-06-value-recovery-sources.json',
    blob_sha:'bfa45646f49c9903fa5de77c57c5eb54b28dc30c',
    schema_version:'m05-answerable-power-sprint-03-leg-06-sources@1'
  }
};
if(!same(candidate.bindings,expectedBindings))fail('Intel source-custody binding drift');

const boundObjects=[
  ['real_receipt_audit',auditRaw,audit],
  ['claim_promotion_adjudication',promotionRaw,promotion],
  ['implementation_gap_ledger',implementationGapLedgerRaw,implementationGapLedger],
  ['robodebt_pre_action_receipt',robodebtReceiptRaw,robodebtReceipt],
  ['official_receipt_packet',packetRaw,packet],
  ['evidence_state_contract',contractRaw,contract],
  ['value_recovery_pilot',valuePilotRaw,valuePilot],
  ['value_recovery_source_registry',valueSourcesRaw,valueSources]
];
for(const [key,raw,parsed] of boundObjects){
  const binding=candidate.bindings[key];
  if(gitBlobSha(raw)!==binding.blob_sha)fail(`${key} Git object drift`);
  if(parsed.schema_version!==binding.schema_version)fail(`${key} schema binding drift`);
}

const before={
  audit:JSON.stringify(audit),
  promotion:JSON.stringify(promotion),
  implementationGapLedger:JSON.stringify(implementationGapLedger),
  robodebtReceipt:JSON.stringify(robodebtReceipt),
  packet:JSON.stringify(packet),
  contract:JSON.stringify(contract),
  valuePilot:JSON.stringify(valuePilot),
  valueSources:JSON.stringify(valueSources)
};

const errors=validateIntelChipsEquityReceiptCandidate(
  candidate,
  {
    audit,
    promotion,
    packet,
    contract,
    valuePilot,
    valueSources,
    implementationGapLedger,
    robodebtReceipt
  }
);
if(errors.length>0){
  fail(`Intel candidate validation failed:\n- ${errors.join('\n- ')}`);
}
const summary=summarizeIntelChipsEquityReceiptCandidate(
  candidate,
  {audit,promotion,packet,contract,robodebtReceipt}
);

if(JSON.stringify(audit)!==before.audit)fail('Intel validation mutated the audit');
if(JSON.stringify(promotion)!==before.promotion)fail('Intel validation mutated the promotion adjudication');
if(JSON.stringify(implementationGapLedger)!==before.implementationGapLedger){
  fail('Intel validation mutated the implementation-gap ledger');
}
if(JSON.stringify(robodebtReceipt)!==before.robodebtReceipt){
  fail('Intel validation mutated the Robodebt pre-action receipt');
}
if(JSON.stringify(packet)!==before.packet)fail('Intel validation mutated the official receipt packet');
if(JSON.stringify(contract)!==before.contract)fail('Intel validation mutated the evidence-state contract');
if(JSON.stringify(valuePilot)!==before.valuePilot)fail('Intel validation mutated the value-recovery pilot');
if(JSON.stringify(valueSources)!==before.valueSources)fail('Intel validation mutated the value-recovery source registry');

const computed={
  existing_promoted_claims:summary.existing_promoted_claims,
  existing_effective_answers:summary.existing_effective_answers,
  existing_advanced_answer_dimensions:summary.existing_advanced_answer_dimensions,
  existing_robodebt_pre_action_timing:summary.existing_robodebt_pre_action_timing,
  intel_source_addressed_candidates:summary.intel_source_addressed_candidates,
  intel_claim_evidence_admissible:summary.intel_claim_evidence_admissible,
  intel_repository_promotion_allowed:summary.intel_repository_promotion_allowed,
  intel_answer_effective:summary.intel_answer_effective,
  total_effective_answers:summary.total_effective_answers,
  cross_domain_regression_completed:summary.cross_domain_regression_completed,
  issue_345_may_close:summary.issue_345_may_close
};
if(!same(computed,candidate.expected_state))fail('Intel expected state drift');

console.log(JSON.stringify({
  validator:'m05-answerable-power-s03-l7-intel-chips-equity-receipt-candidate',
  receipt_id:candidate.receipt.receipt_id,
  domain_id:candidate.receipt.domain_id,
  jurisdiction:candidate.receipt.jurisdiction,
  sources:candidate.receipt.sources.length,
  registered_common_shares:candidate.receipt.instrument_quantities.resale_registered_common_shares,
  cumulative_escrow_releases_approx:
    candidate.receipt.instrument_quantities.escrowed_shares_released_cumulative_approx,
  ...computed
},null,2));
