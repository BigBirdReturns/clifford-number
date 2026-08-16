#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const write=(rel,value)=>fs.writeFileSync(path.join(root,rel),value);
const replaceOnce=(text,needle,replacement,label)=>{
  const first=text.indexOf(needle);
  if(first<0)throw new Error(`Missing patch anchor: ${label}`);
  if(text.indexOf(needle,first+needle.length)>=0)throw new Error(`Ambiguous patch anchor: ${label}`);
  return `${text.slice(0,first)}${replacement}${text.slice(first+needle.length)}`;
};

const policyPath='data/project/m04g-source-ecology-v2-policy.json';
const policy=JSON.parse(read(policyPath));
const thresholdClosures=[
  {
    match:'sec.gov',
    route_ids:['M04G-GP015'],
    fallbacks:[{
      url:'https://data.sec.gov/submissions/CIK0000320193.json',
      method:'GET',
      source_class:'official_disclosure_api',
      max_bytes:524288,
      timeout_ms:30000,
      allowed_host_suffixes:['sec.gov']
    }]
  },
  {
    match:'kmu.gov.ua',
    route_ids:['M04G-GP046'],
    fallbacks:[{
      url:'https://www.kmu.gov.ua/',
      method:'GET',
      source_class:'official_ukraine_cabinet_large_document',
      max_bytes:2097152,
      timeout_ms:30000,
      allowed_host_suffixes:['kmu.gov.ua']
    }]
  }
];

const routeIds=thresholdClosures.flatMap((row)=>row.route_ids);
if(routeIds.length!==2||new Set(routeIds).size!==2)throw new Error('Threshold closure route identity collision');
for(const routeId of routeIds){
  if(policy.host_fallbacks.some((row)=>Array.isArray(row.route_ids)&&row.route_ids.includes(routeId)))throw new Error(`Route-bound fallback already exists for ${routeId}`);
}
policy.host_fallbacks=[...thresholdClosures,...policy.host_fallbacks];
write(policyPath,`${JSON.stringify(policy,null,2)}\n`);

const testPath='test/m05-answerable-power-sprint-03-leg-07.test.js';
let test=read(testPath);
test=replaceOnce(
  test,
  'assert.equal(routeBoundFallbacks.size,10);',
  'assert.equal(routeBoundFallbacks.size,12);',
  'route-bound fallback count'
);
test=replaceOnce(
  test,
  "assert.deepEqual(routeBoundFallbacks.get('M04G-GP027'),{",
  "assert.deepEqual(routeBoundFallbacks.get('M04G-GP015'),{\n  url:'https://data.sec.gov/submissions/CIK0000320193.json',\n  method:'GET',source_class:'official_disclosure_api',max_bytes:524288,timeout_ms:30000,allowed_host_suffixes:['sec.gov']\n});\nassert.deepEqual(routeBoundFallbacks.get('M04G-GP027'),{",
  'SEC disclosure fallback assertion'
);
test=replaceOnce(
  test,
  "assert.deepEqual(routeBoundFallbacks.get('M04G-GP047'),{",
  "assert.deepEqual(routeBoundFallbacks.get('M04G-GP046'),{\n  url:'https://www.kmu.gov.ua/',\n  method:'GET',source_class:'official_ukraine_cabinet_large_document',max_bytes:2097152,timeout_ms:30000,allowed_host_suffixes:['kmu.gov.ua']\n});\nassert.deepEqual(routeBoundFallbacks.get('M04G-GP047'),{",
  'Ukraine Cabinet high-ceiling fallback assertion'
);
write(testPath,test);

console.log('m04g threshold closure patch applied');
