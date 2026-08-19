#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const amendmentPath=path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.json');
const validator=path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.mjs');
const amendment=JSON.parse(fs.readFileSync(amendmentPath,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const semanticHash=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validateOnly=(row)=>{
  if(row.schema_version!=='m05-answerable-power-s03-l7-intel-realization-temporal-reconciliation-admission-amendment@1')throw Error('schema drift');
  if(row.predecessor?.contract?.blob_sha!=='817f2b571c5f5feb755c6ac97226567630de5c38')throw Error('predecessor contract drift');
  for(const stage of ['transaction','federal_cash_custody','public_account_booking','distribution']){
    const rule=row.effective_stage_temporal_reconciliation?.[stage];
    if(!rule||rule.required_field!=='temporal_order_reconciliation')throw Error(`${stage} binding drift`);
    if(rule.temporal_reconciliation_result_must_be_pass!==true)throw Error(`${stage} pass requirement weakened`);
    if(rule.failed_result_qualifies!==false||rule.indeterminate_result_qualifies!==false||rule.omitted_result_qualifies!==false||rule.definite_contradiction_qualifies!==false)throw Error(`${stage} non-pass admission`);
  }
  if(row.cross_object_rules?.successor_rule_controls_stage_admission!==true)throw Error('successor authority drift');
  if(row.cross_object_rules?.temporal_reconciliation_admission_is_empirical_stage_receipt!==false)throw Error('empirical promotion');
  if(!Array.isArray(row.observed_receipts)||row.observed_receipts.length!==0)throw Error('receipt injection');
  if(row.observed_state?.answer_change_authorized!==false||row.boundaries?.issue_345_may_close!==false)throw Error('terminal overclaim');
  const copy=clone(row);const declared=copy.temporal_reconciliation_admission_amendment_sha256;delete copy.temporal_reconciliation_admission_amendment_sha256;
  if(declared!=='5a0830c77da3b443a8aff7a121fde3b051fc526a72fa5d48f14870a3d4a145c8'||semanticHash(copy)!==declared)throw Error('semantic drift');
};
validateOnly(amendment);
const cases=[
  ['stage-delete',r=>delete r.effective_stage_temporal_reconciliation.distribution],
  ['pass-weaken',r=>r.effective_stage_temporal_reconciliation.transaction.temporal_reconciliation_result_must_be_pass=false],
  ['indeterminate-admit',r=>r.effective_stage_temporal_reconciliation.transaction.indeterminate_result_qualifies=true],
  ['failed-admit',r=>r.effective_stage_temporal_reconciliation.transaction.failed_result_qualifies=true],
  ['omitted-admit',r=>r.effective_stage_temporal_reconciliation.transaction.omitted_result_qualifies=true],
  ['field-remove',r=>r.effective_stage_temporal_reconciliation.transaction.required_field=''],
  ['predecessor-substitute',r=>r.predecessor.contract.blob_sha='0'.repeat(40)],
  ['receipt-inject',r=>r.observed_receipts.push({stage:'transaction'})],
  ['answer-overclaim',r=>r.observed_state.answer_change_authorized=true],
  ['closure-overclaim',r=>r.boundaries.issue_345_may_close=true],
  ['checksum-rewrite',r=>r.temporal_reconciliation_admission_amendment_sha256='0'.repeat(64)],
  ['coordinated-rewrite',r=>{r.effective_stage_temporal_reconciliation.transaction.indeterminate_result_qualifies=true;const c=clone(r);delete c.temporal_reconciliation_admission_amendment_sha256;r.temporal_reconciliation_admission_amendment_sha256=semanticHash(c)}]
];
for(const [label,mutate] of cases){const changed=clone(amendment);mutate(changed);assert.throws(()=>validateOnly(changed),undefined,label)}
const predecessors=['data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.json','tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.mjs','test/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.test.js','.github/workflows/m05-intel-realization-observation-time-custody-amendment.yml'];
if(predecessors.every(p=>fs.existsSync(path.join(root,p)))){
  const baseline=spawnSync(process.execPath,[validator],{cwd:root,encoding:'utf8'});assert.equal(baseline.status,0,baseline.stderr||baseline.stdout);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'m05-temporal-reconciliation-'));
  const rewritten=path.join(temp,'amendment.json');fs.writeFileSync(rewritten,`${JSON.stringify(amendment)}
`);
  const result=spawnSync(process.execPath,[validator],{cwd:root,env:{...process.env,M05_INTEL_TEMPORAL_RECONCILIATION_ADMISSION_AMENDMENT_PATH:rewritten},encoding:'utf8'});
  assert.notEqual(result.status,0,'semantic-equivalent byte rewrite unexpectedly passed');fs.rmSync(temp,{recursive:true,force:true});
}
console.log('m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.test: OK');
