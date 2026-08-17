#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  summarizeImplementationGapProbeLedger
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ledgerPath=path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.json');
const packetPath=path.join(root,'data/project/m05-cross-domain-official-receipt-candidates.json');
const adjudicationPath=path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json');
const contractPath=path.join(root,'data/project/m05-source-health-evidence-state-regression.json');
const validator='tools/validate-m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.mjs';
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>structuredClone(value);
const ledger=read(ledgerPath);
const packet=read(packetPath);
const adjudication=read(adjudicationPath);
const contract=read(contractPath);

const execute=(env={})=>spawnSync(process.execPath,[validator],{
  cwd:root,
  encoding:'utf8',
  env:{...process.env,...env}
});
const baseline=execute();
if(baseline.status!==0){
  console.error(baseline.stdout);
  console.error(baseline.stderr);
  throw new Error('implementation-gap validator failed');
}

const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-gap-ledger-'));
const writeTemp=(name,value)=>{
  const target=path.join(tempRoot,`${name}.json`);
  fs.writeFileSync(target,`${JSON.stringify(value,null,2)}\n`);
  return target;
};
const assertRefused=(name,mutate,expected)=>{
  const candidate=clone(ledger);
  mutate(candidate);
  const result=execute({M05_IMPLEMENTATION_GAP_LEDGER_PATH:writeTemp(name,candidate)});
  assert.notEqual(result.status,0,`${name} mutation must be refused`);
  assert.match(`${result.stdout}\n${result.stderr}`,expected,`${name} refusal must identify the failed boundary`);
};

assertRefused('probe-identity',(value)=>{value.probes[1].probe_id=value.probes[0].probe_id},/probe identity or order drift/u);
assertRefused('close-deficit',(value)=>{value.probes[0].probe_result.deficits_closed.push('dimension:pre_action_timing')},/improperly closes a deficit/u);
assertRefused('erase-preserved-deficit',(value)=>{value.probes[2].probe_result.deficits_preserved.pop()},/does not preserve every target deficit/u);
assertRefused('target-deficit-drift',(value)=>{value.probes[1].target_deficits.pop()},/target deficit drift/u);
assertRefused('insecure-source',(value)=>{value.probes[0].source_records[0].url=value.probes[0].source_records[0].url.replace('https:','http:')},/transport is not HTTPS/u);
assertRefused('foreign-host',(value)=>{value.probes[1].source_records[0].url='https://example.test/kst-33579-3.html'},/escaped the receipt host boundary/u);
assertRefused('same-host-url-substitution',(value)=>{value.probes[1].source_records[0].url='https://zoek.officielebekendmakingen.nl/another-official-page.html'},/exact source-record binding drift/u);
assertRefused('locator-substitution',(value)=>{value.probes[2].source_records[0].locator=['This replacement locator is long enough to pass the generic length check but is not the frozen locator.']},/exact source-record binding drift/u);
assertRefused('missing-locator',(value)=>{value.probes[2].source_records[0].locator=[]},/locator is missing or under-specified/u);
assertRefused('answer-authorization',(value)=>{value.probes[0].probe_result.answer_changes_authorized=true},/authorizes a state change/u);
assertRefused('promotion-authorization',(value)=>{value.probes[1].probe_result.promotion_changes_authorized=true},/authorizes a state change/u);
assertRefused('repository-effect',(value)=>{value.probes[2].probe_result.repository_effect='candidate_evidence'},/repository effect drift/u);
assertRefused('false-compliance-finding',(value)=>{value.probes[2].probe_result.finding_class='verified_durable_compliance'},/finding classification drift/u);
assertRefused('observed-state-inflation',(value)=>{value.probes[0].observed_state.automatic_stay_before_recovery=true},/observed-state drift/u);
assertRefused('issue-comment-drift',(value)=>{value.probes[1].issue_comment_id=0},/issue-comment binding drift/u);
assertRefused('false-issue-closure',(value)=>{value.boundaries.issue_345_may_close=true},/boundary issue_345_may_close weakened/u);
assertRefused('false-expected-answer',(value)=>{value.expected_result.effective_answers=1},/expected probe-ledger result drift/u);

const custodyMutations=[
  {
    name:'packet-custody',
    env:'M05_OFFICIAL_RECEIPT_PACKET_PATH',
    value:()=>{const next=clone(packet);next.records[0].title+=' changed';return next},
    expected:/source packet Git object drift/u
  },
  {
    name:'adjudication-custody',
    env:'M05_CLAIM_PROMOTION_ADJUDICATION_PATH',
    value:()=>{const next=clone(adjudication);next.adjudications[0].answer_changes_authorized=true;return next},
    expected:/claim-promotion Git object drift/u
  },
  {
    name:'contract-custody',
    env:'M05_EVIDENCE_STATE_CONTRACT_PATH',
    value:()=>{const next=clone(contract);next.answer_effectiveness_contract.minimum_observed_domains=2;return next},
    expected:/evidence-state Git object drift/u
  }
];
for(const mutation of custodyMutations){
  const result=execute({[mutation.env]:writeTemp(mutation.name,mutation.value())});
  assert.notEqual(result.status,0,`${mutation.name} mutation must be refused`);
  assert.match(`${result.stdout}\n${result.stderr}`,mutation.expected);
}

const summary=summarizeImplementationGapProbeLedger(packet,adjudication,contract,ledger);
assert.equal(summary.probe_records,3);
assert.equal(summary.source_records,12);
assert.equal(summary.deficit_entries_examined,8);
assert.equal(summary.deficit_entries_closed,0);
assert.equal(summary.deficit_entries_preserved,8);
assert.equal(summary.claim_evidence_admissible,3);
assert.equal(summary.repository_promotion_allowed,3);
assert.equal(summary.effective_answers,0);
assert.equal(summary.qualifying_jurisdictions,0);
assert.equal(summary.answer_effectiveness,false);
assert.equal(summary.cross_domain_regression_completed,false);
assert.equal(summary.issue_345_may_close,false);
assert.ok(summary.probes.every((row)=>row.evaluation.claim_evidence_admissible===true));
assert.ok(summary.probes.every((row)=>row.evaluation.answer_effective===false));
assert.ok(summary.probes.every((row)=>row.deficits_closed.length===0));

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.test: OK (17 ledger mutations; 3 custody mutations; 3 promoted claims; 0 effective answers)');
