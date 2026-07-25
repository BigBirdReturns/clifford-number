#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
execFileSync(process.execPath,[path.join(root,'tools/validate-m04f-federated-sensing-action.mjs')],{cwd:root,stdio:'pipe'});
const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const c=read('data/project/m04f-federated-sensing-action-census.json'); const d=read('data/project/m04f-federated-sensing-action-deep-systems.json'); const p=read('data/project/m04f-federated-sensing-action-perimeter.json'); const f=read('data/project/m04f-federated-sensing-action-fanout.json');
assert.equal(c.counts.total_candidates,47); assert.equal(c.counts.deep_systems,17); assert.equal(c.counts.perimeter_candidates,30); assert.equal(f.lanes.length,27);
assert.ok(d.systems.some(x=>x.system_id==='SYS-FLOCK-FEDERATED-LPR')); assert.ok(d.systems.some(x=>x.system_id==='SYS-CLEARVIEW-FACE-SEARCH')); assert.ok(p.candidates.some(x=>x.label.includes('Drone as First Responder'))); assert.ok(c.existing_lake_crosswalk.some(x=>x.lake_system_id==='SYS-ARMY-NGC2'));
assert.equal(c.boundaries.recurrence_proves_common_governance,false); assert.equal(c.boundaries.promotes_to,'candidate_only');
console.log('m04f-federated-sensing-action.test: OK');
