// Explicit executable boundary to Clifford's existing Genesis-reconciled identity owner.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const {entityId,claimId}=await import(pathToFileURL(process.argv[2]).href);
const input=JSON.parse(fs.readFileSync(0,'utf8'));
if(!Array.isArray(input)||input.length>2000)throw Error('Bounded identity input required');
process.stdout.write(JSON.stringify(input.map(r=>{
  if(!['namespace','label','predicate','value'].every(k=>typeof r[k]==='string'))throw Error('Identity fields must be strings');
  const e=entityId(r.namespace,r.label);
  return {entity_id:e,claim_id:claimId(e,r.predicate,r.value,'literal')};
}))+'\n');
