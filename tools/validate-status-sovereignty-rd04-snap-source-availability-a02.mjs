#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT,loadData,outputPaths } from './lib/status-sovereignty-rd04-snap-source-availability-a02-io.mjs';
import { checkCore } from './lib/status-sovereignty-rd04-snap-source-availability-a02-core-checks.mjs';
import { checkEvidence } from './lib/status-sovereignty-rd04-snap-source-availability-a02-evidence-checks.mjs';
export function loadContext(root=ROOT){const c=loadData(root),p=outputPaths();return{...c,manifest:JSON.parse(fs.readFileSync(path.join(root,p.manifest),'utf8')),buildManifest:JSON.parse(fs.readFileSync(path.join(root,p.buildManifest),'utf8')),buildSummary:JSON.parse(fs.readFileSync(path.join(root,p.buildSummary),'utf8')),reportSummary:JSON.parse(fs.readFileSync(path.join(root,p.reportSummary),'utf8')),html:fs.readFileSync(path.join(root,p.html),'utf8')};}
export function validateContext(c=loadContext(),options={}){const errors=[];checkCore(c,errors);checkEvidence(c,errors,options);return errors;}
function main(){const errors=validateContext();if(errors.length){console.error(`validate-status-sovereignty-rd04-snap-source-availability-a02: ${errors.length} error(s)`);for(const e of errors)console.error(`- ${e}`);process.exit(1);}console.log('validate-status-sovereignty-rd04-snap-source-availability-a02: 50/50 states PASS; five-way tie preserved; 0 closures');}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
