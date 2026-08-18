#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const validator=path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-cross-domain-source-custody-correction.mjs');
const paths={
  correction:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-cross-domain-source-custody-correction.json'),
  candidates:path.join(root,'data/project/m05-cross-domain-official-receipt-candidates.json'),
  candidateHelper:path.join(root,'tools/lib/m05-cross-domain-official-receipt-candidates.mjs'),
  regressionValidator:path.join(root,'tools/validate-m05-source-health-evidence-state-regression.mjs'),
  regressionTest:path.join(root,'test/m05-source-health-evidence-state-regression.test.js'),
  provenanceMinimum:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-source-provenance-amendment.json')
};
const correction=JSON.parse(fs.readFileSync(paths.correction,'utf8'));
const candidates=JSON.parse(fs.readFileSync(paths.candidates,'utf8'));
const rawText={
  candidateHelper:fs.readFileSync(paths.candidateHelper,'utf8'),
  regressionValidator:fs.readFileSync(paths.regressionValidator,'utf8'),
  regressionTest:fs.readFileSync(paths.regressionTest,'utf8')
};
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-cross-domain-custody-'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const semanticHash=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const runValidator=(env={})=>spawnSync(process.execPath,[validator],{
  cwd:root,
  env:{...process.env,...env},
  encoding:'utf8'
});
const writeRaw=(label,content,extension='json')=>{
  const target=path.join(tempRoot,`${label}.${extension}`);
  fs.writeFileSync(target,content);
  return target;
};
const expectFailure=(label,envName,target)=>{
  const result=runValidator({[envName]:target});
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};
const expectCorrectionFailure=(label,mutate)=>{
  const changed=clone(correction);
  mutate(changed);
  expectFailure(
    label,
    'M05_CROSS_DOMAIN_SOURCE_CUSTODY_CORRECTION_PATH',
    writeRaw(label,`${JSON.stringify(changed,null,2)}\n`)
  );
};

const baseline=runValidator();
assert.equal(baseline.status,0,baseline.stderr||baseline.stdout);
assert.deepEqual(JSON.parse(baseline.stdout),{
  validator:'m05-cross-domain-source-custody-correction',
  candidate_records:3,
  source_records:12,
  locator_addressed_source_records:12,
  effective_source_addressed_candidates:0,
  exact_body_custodied_source_records:0,
  official_origin_authenticated_source_records:0,
  claim_evidence_admissible:0,
  effective_answers:0,
  cross_domain_regression_completed:false,
  issue_345_may_close:false
});

expectCorrectionFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectCorrectionFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectCorrectionFailure('candidate-binding-substitution',(row)=>{row.bindings.official_receipt_candidate_set.blob_sha='0'.repeat(40)});
expectCorrectionFailure('helper-binding-substitution',(row)=>{row.bindings.official_receipt_candidate_helper.blob_sha='0'.repeat(40)});
expectCorrectionFailure('gap-erasure',(row)=>{row.predecessor_gap.source_body_sha256_fields_present=12});
expectCorrectionFailure('effective-receipt-overclaim',(row)=>{row.effective_candidate_receipt_state[0].effective_source_addressed_receipt=true});
expectCorrectionFailure('body-custody-overclaim',(row)=>{row.effective_candidate_receipt_state[1].exact_body_custodied_source_records=3});
expectCorrectionFailure('origin-overclaim',(row)=>{row.effective_candidate_receipt_state[2].candidate_official_origin_complete=true});
expectCorrectionFailure('source-field-deletion',(row)=>{
  row.required_source_custody.required_fields_per_source=
    row.required_source_custody.required_fields_per_source.filter((field)=>field!=='source_origin_body_sha256');
});
expectCorrectionFailure('acquisition-field-deletion',(row)=>{
  row.required_source_custody.acquisition_receipt_required_fields=
    row.required_source_custody.acquisition_receipt_required_fields.filter((field)=>field!=='response_headers_sha256');
});
expectCorrectionFailure('hostname-admission',(row)=>{row.required_source_custody.https_hostname_alone_may_count_as_official_origin=true});
expectCorrectionFailure('locator-admission',(row)=>{row.required_source_custody.locator_only_source_may_count_as_effective_receipt=true});
expectCorrectionFailure('receipt-injection',(row)=>{row.observed_receipts.push({receipt_id:'synthetic'})});
expectCorrectionFailure('answer-overclaim',(row)=>{row.observed_state.answer_change_authorized=true});
expectCorrectionFailure('guardrail-weakening',(row)=>{row.guardrails.official_hostname_is_publisher_authentication=true});
expectCorrectionFailure('issue-closure',(row)=>{row.boundaries.issue_345_may_close=true});
expectCorrectionFailure('checksum-rewrite',(row)=>{row.correction_sha256='0'.repeat(64)});
expectCorrectionFailure('coordinated-content-checksum-rewrite',(row)=>{
  row.required_source_custody.locator_only_source_may_count_as_effective_receipt=true;
  const copy=clone(row);
  delete copy.correction_sha256;
  row.correction_sha256=semanticHash(copy);
});

const semanticEquivalentCorrection=`${JSON.stringify(correction)}\n`;
assert.deepEqual(JSON.parse(semanticEquivalentCorrection),correction);
expectFailure(
  'semantic-equivalent-correction-byte-rewrite',
  'M05_CROSS_DOMAIN_SOURCE_CUSTODY_CORRECTION_PATH',
  writeRaw('semantic-equivalent-correction-byte-rewrite',semanticEquivalentCorrection)
);

const candidateWithInventedHash=clone(candidates);
candidateWithInventedHash.records[0].sources[0].source_origin_body_sha256='0'.repeat(64);
expectFailure(
  'candidate-invented-body-hash',
  'M05_CROSS_DOMAIN_OFFICIAL_RECEIPT_CANDIDATES_PATH',
  writeRaw('candidate-invented-body-hash',`${JSON.stringify(candidateWithInventedHash,null,2)}\n`)
);
expectFailure(
  'semantic-equivalent-candidate-byte-rewrite',
  'M05_CROSS_DOMAIN_OFFICIAL_RECEIPT_CANDIDATES_PATH',
  writeRaw('semantic-equivalent-candidate-byte-rewrite',`${JSON.stringify(candidates)}\n`)
);
expectFailure(
  'candidate-helper-byte-rewrite',
  'M05_CROSS_DOMAIN_OFFICIAL_RECEIPT_HELPER_PATH',
  writeRaw('candidate-helper-byte-rewrite',`${rawText.candidateHelper}\n`,'mjs')
);
expectFailure(
  'regression-validator-byte-rewrite',
  'M05_SOURCE_HEALTH_REGRESSION_VALIDATOR_PATH',
  writeRaw('regression-validator-byte-rewrite',`${rawText.regressionValidator}\n`,'mjs')
);
expectFailure(
  'regression-test-byte-rewrite',
  'M05_SOURCE_HEALTH_REGRESSION_TEST_PATH',
  writeRaw('regression-test-byte-rewrite',`${rawText.regressionTest}\n`,'js')
);

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-cross-domain-source-custody-correction.test: OK');
