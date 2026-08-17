#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const frontierPath=path.join(
  root,
  'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'
);
const frontier=JSON.parse(fs.readFileSync(frontierPath,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-frontier-guardrails-'));

const runValidator=(target=frontierPath)=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier-guardrails.mjs'],
  {
    cwd:root,
    encoding:'utf8',
    env:{
      ...process.env,
      M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH:target
    }
  }
);

const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}\n${baseRun.stderr}`);

let mutationIndex=0;
const expectFailure=(label,mutate)=>{
  mutationIndex+=1;
  const changed=clone(frontier);
  mutate(changed);
  const target=path.join(tempRoot,`${String(mutationIndex).padStart(2,'0')}-${label}.json`);
  fs.writeFileSync(target,`${JSON.stringify(changed,null,2)}\n`);
  const result=runValidator(target);
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};

expectFailure('guardrail-object-deletion',(row)=>{
  delete row.frontiers[0].route_guardrails;
});
expectFailure('guardrail-object-null',(row)=>{
  row.frontiers[1].route_guardrails=null;
});
for(let index=0;index<frontier.frontiers.length;index+=1){
  const key=Object.keys(frontier.frontiers[index].route_guardrails)[0];
  expectFailure(`frontier-${index+1}-guardrail-key-deletion`,(row)=>{
    delete row.frontiers[index].route_guardrails[key];
  });
}
expectFailure('guardrail-value-weakened',(row)=>{
  row.frontiers[2].route_guardrails.compliance_intention_is_completed_compliance=true;
});
expectFailure('guardrail-key-added',(row)=>{
  row.frontiers[3].route_guardrails.unfrozen_extra_guardrail=false;
});
expectFailure('guardrail-frontier-reordered',(row)=>{
  row.frontiers.reverse();
});

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier-guardrails.test: OK');
