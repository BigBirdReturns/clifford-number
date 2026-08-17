#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  summarizeHfuShareExitReceiptCandidate,
  validateHfuShareExitReceiptCandidate
} from './lib/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');

const PATHS={
  candidate:'data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json',
  audit:'data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json',
  exitPilot:'data/project/m05-answerable-power-sprint-03-leg-05-public-platform-exit.json',
  sourceRegistry:'data/intake/m05-answerable-power-sprint-01-sources.json',
  intelCandidate:'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json',
  contract:'data/project/m05-source-health-evidence-state-regression.json'
};

const read=(relative)=>{
  const absolute=path.join(ROOT,relative);
  const bytes=fs.readFileSync(absolute);
  return {bytes,json:JSON.parse(bytes.toString('utf8'))};
};

const gitBlobSha=(bytes)=>{
  const header=Buffer.from(`blob ${bytes.length}\0`,'utf8');
  return crypto.createHash('sha1').update(header).update(bytes).digest('hex');
};

const sha256=(bytes)=>crypto.createHash('sha256').update(bytes).digest('hex');

const candidateFile=read(PATHS.candidate);
const auditFile=read(PATHS.audit);
const exitPilotFile=read(PATHS.exitPilot);
const sourceRegistryFile=read(PATHS.sourceRegistry);
const intelFile=read(PATHS.intelCandidate);
const contractFile=read(PATHS.contract);

const dependencyBlobShas={
  real_receipt_audit:gitBlobSha(auditFile.bytes),
  public_platform_exit_pilot:gitBlobSha(exitPilotFile.bytes),
  sprint_01_source_registry:gitBlobSha(sourceRegistryFile.bytes),
  intel_repository_content_receipt:gitBlobSha(intelFile.bytes),
  evidence_state_contract:gitBlobSha(contractFile.bytes)
};

const errors=validateHfuShareExitReceiptCandidate(candidateFile.json,{
  audit:auditFile.json,
  exitPilot:exitPilotFile.json,
  sourceRegistry:sourceRegistryFile.json,
  intelCandidate:intelFile.json,
  contract:contractFile.json,
  dependencyBlobShas
});

if(errors.length){
  console.error(`HFU Share exit receipt validation failed with ${errors.length} error(s):`);
  for(const error of errors)console.error(`- ${error}`);
  process.exit(1);
}

const summary=summarizeHfuShareExitReceiptCandidate(candidateFile.json,{
  intelCandidate:intelFile.json,
  contract:contractFile.json
});

console.log(JSON.stringify({
  status:'validated',
  candidate_path:PATHS.candidate,
  candidate_git_blob_sha:gitBlobSha(candidateFile.bytes),
  candidate_sha256:sha256(candidateFile.bytes),
  source_records:candidateFile.json.receipt.sources.length,
  external_repository_commit:
    candidateFile.json.bindings.external_service_repository.commit_sha,
  summary
},null,2));
