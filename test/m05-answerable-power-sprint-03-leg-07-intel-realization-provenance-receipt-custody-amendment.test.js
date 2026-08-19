#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const validator=path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-receipt-custody-amendment.mjs');
const files={
  amendment:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-receipt-custody-amendment.json'),
  provenance:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-source-provenance-amendment.json'),
  provenanceValidator:path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-source-provenance-amendment.mjs'),
  custody:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-source-custody-amendment.json'),
  custodyValidator:path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-source-custody-amendment.mjs')
};
const raw=Object.fromEntries(Object.entries(files).map(([key,target])=>[key,fs.readFileSync(target,key.endsWith('Validator')?'utf8':undefined)]));
const amendment=JSON.parse(raw.amendment);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'m05-receipt-custody-'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const semantic=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const run=(env={})=>spawnSync(process.execPath,[validator],{cwd:root,env:{...process.env,...env},encoding:'utf8'});
const baseline=run();assert.equal(baseline.status,0,baseline.stderr||baseline.stdout);
assert.deepEqual(JSON.parse(baseline.stdout),{validator:'m05-intel-realization-provenance-receipt-custody-amendment',amended_stages:4,stages_requiring_origin_evidence_body_custody:4,stages_requiring_acquisition_receipt_body_custody:4,stages_requiring_response_header_canonicalization:4,observed_receipts:0,transaction_admissible:false,federal_cash_custody_admissible:false,public_account_booking_admissible:false,distribution_admissible:false,issue_345_may_close:false});
let index=0;const write=(label,content,ext='json')=>{const target=path.join(temp,`${++index}-${label}.${ext}`);fs.writeFileSync(target,content);return target};
const reject=(label,env,target)=>{const out=run({[env]:target});assert.notEqual(out.status,0,`${label} passed\n${out.stdout}\n${out.stderr}`)};
const mutate=(label,fn)=>{const changed=clone(amendment);fn(changed);reject(label,'M05_INTEL_REALIZATION_PROVENANCE_RECEIPT_CUSTODY_AMENDMENT_PATH',write(label,`${JSON.stringify(changed,null,2)}\n`))};
mutate('schema',x=>x.schema_version='broken@1');
mutate('base',x=>x.canonical_base.sha='0'.repeat(40));
mutate('binding',x=>x.bindings.realization_source_provenance_amendment.blob_sha='0'.repeat(40));
mutate('gap',x=>x.predecessor_gap.origin_evidence_body_custody_required=true);
mutate('stage-delete',x=>delete x.effective_stage_provenance_receipt_custody.distribution);
mutate('body-field-delete',x=>x.effective_stage_provenance_receipt_custody.public_account_booking.additional_required_fields=x.effective_stage_provenance_receipt_custody.public_account_booking.additional_required_fields.filter(v=>v!=='origin_evidence_body_sha256'));
mutate('redirect-weaken',x=>x.receipt_custody_rules.redirect_hop_required_fields.pop());
mutate('header-mode-delete',x=>x.receipt_custody_rules.allowed_response_header_capture_modes.pop());
mutate('duplicate-collapse',x=>x.receipt_custody_rules.response_header_canonicalization.join_or_collapse_duplicate_headers=true);
mutate('hash-only',x=>x.receipt_custody_rules.hash_without_body_or_custody_locator_is_admissible=true);
mutate('receipt-injection',x=>x.observed_receipts.push({stage:'transaction'}));
mutate('answer-overclaim',x=>x.observed_state.answer_change_authorized=true);
mutate('closure',x=>x.boundaries.issue_345_may_close=true);
mutate('checksum',x=>x.receipt_custody_amendment_sha256='0'.repeat(64));
mutate('coordinated',x=>{x.receipt_custody_rules.single_self_authored_body_may_prove_origin_and_acquisition=true;const copy=clone(x);delete copy.receipt_custody_amendment_sha256;x.receipt_custody_amendment_sha256=semantic(copy)});
reject('amendment-byte-rewrite','M05_INTEL_REALIZATION_PROVENANCE_RECEIPT_CUSTODY_AMENDMENT_PATH',write('amendment-byte-rewrite',`${JSON.stringify(amendment)}\n`));
reject('provenance-byte-rewrite','M05_INTEL_REALIZATION_SOURCE_PROVENANCE_AMENDMENT_PATH',write('provenance-byte-rewrite',`${JSON.stringify(JSON.parse(raw.provenance))}\n`));
reject('custody-byte-rewrite','M05_INTEL_REALIZATION_SOURCE_CUSTODY_AMENDMENT_PATH',write('custody-byte-rewrite',`${JSON.stringify(JSON.parse(raw.custody))}\n`));
reject('provenance-validator-byte-rewrite','M05_INTEL_REALIZATION_SOURCE_PROVENANCE_VALIDATOR_PATH',write('provenance-validator-byte-rewrite',`${raw.provenanceValidator}\n`,'mjs'));
reject('custody-validator-byte-rewrite','M05_INTEL_REALIZATION_SOURCE_CUSTODY_VALIDATOR_PATH',write('custody-validator-byte-rewrite',`${raw.custodyValidator}\n`,'mjs'));
fs.rmSync(temp,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-receipt-custody-amendment.test: OK');
