#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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

const v1=spawnSync(process.execPath,['.github/materializers/m04g-substantive-official-fallback-materializer-v1.mjs'],{cwd:root,stdio:'inherit'});
if(v1.status!==0)throw new Error(`v1 materializer failed with status ${v1.status}`);

const libraryPath='tools/lib/m04g-source-ecology-v2.mjs';
let library=read(libraryPath);

const fetchStart=library.indexOf('async function fetchWithRedirects(url,{method,timeoutMs,maxBytes,userAgent,allowedHostSuffixes=[]}){');
const fetchEnd=library.indexOf('\nfunction retryDelay(',fetchStart);
if(fetchStart<0||fetchEnd<0)throw new Error('Unable to locate post-v1 fetchWithRedirects');
const fetchWithRedirects=`function normalizeRequestHeaders(headers={}){
  return Object.fromEntries(Object.entries(headers||{}).map(([key,value])=>[String(key).toLowerCase(),String(value)]));
}

async function fetchWithRedirects(url,{method,timeoutMs,maxBytes,userAgent,allowedHostSuffixes=[],headers={},body}){
  let current=url;
  let requestMethod=String(method||'GET').toUpperCase();
  let requestBody=body;
  const requestHeaders={
    'user-agent':userAgent,
    'accept':'application/gzip,application/octet-stream,application/json,application/sparql-results+json,application/vnd.sdmx.data+csv,text/csv,text/html,application/xml,application/rss+xml,text/xml,text/plain,application/pdf,*/*;q=0.1',
    ...normalizeRequestHeaders(headers)
  };
  for(let redirectCount=0;redirectCount<=5;redirectCount++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(new Error(\`timeout after \${timeoutMs}ms\`)),timeoutMs);
    try{
      const response=await fetch(current,{method:requestMethod,body:['GET','HEAD'].includes(requestMethod)?undefined:requestBody,redirect:'manual',signal:controller.signal,headers:requestHeaders});
      if(response.status>=300&&response.status<400){
        const location=response.headers.get('location');
        if(!location)return {ok:false,status:response.status,final_url:current,redirect_unresolved:true,headers:Object.fromEntries(response.headers)};
        const next=new URL(location,current).toString();
        if(current.startsWith('https://')&&next.startsWith('http://'))return {ok:false,status:response.status,final_url:current,redirect_url:next,https_downgrade:true,headers:Object.fromEntries(response.headers)};
        if(allowedHostSuffixes.length&&!redirectHostAllowed(url,next,allowedHostSuffixes))return {ok:false,status:response.status,final_url:current,redirect_url:next,redirect_outside_allowed_host:true,headers:Object.fromEntries(response.headers)};
        if(response.status===303||((response.status===301||response.status===302)&&requestMethod==='POST')){
          requestMethod='GET';
          requestBody=undefined;
          delete requestHeaders['content-type'];
        }
        current=next;
        continue;
      }
      const responseHeaders=Object.fromEntries(response.headers);
      if(requestMethod==='HEAD')return {ok:response.ok,status:response.status,final_url:current,headers:responseHeaders,body:Buffer.alloc(0),metadata_only:true,final_method:requestMethod};
      let responseBody;
      try{responseBody=await readBounded(response,maxBytes)}catch(error){return {ok:false,status:response.status,final_url:current,headers:responseHeaders,error,oversized:Boolean(error.oversized),final_method:requestMethod}}
      return {ok:response.ok,status:response.status,final_url:current,headers:responseHeaders,body:responseBody,metadata_only:false,final_method:requestMethod};
    }catch(error){
      return {ok:false,status:null,final_url:current,headers:{},error,final_method:requestMethod};
    }finally{clearTimeout(timer)}
  }
  return {ok:false,status:310,final_url:current,headers:{},error:new Error('redirect limit exceeded'),redirect_unresolved:true,final_method:requestMethod};
}
`;
library=`${library.slice(0,fetchStart)}${fetchWithRedirects}${library.slice(fetchEnd)}`;

const executeStart=library.indexOf('async function executeCandidate(candidate,route,routeSpecific,policy,gate){');
const executeEnd=library.indexOf('\nasync function executeRoute(route,policy,gate){',executeStart);
if(executeStart<0||executeEnd<0)throw new Error('Unable to locate post-v1 executeCandidate');
const executeCandidate=`async function executeCandidate(candidate,route,routeSpecific,policy,gate){
  const candidateUrl=candidate.url;
  const method=(candidate.method||route.method||'GET').toUpperCase();
  const host=new URL(candidateUrl).hostname;
  const maxBytes=candidate.max_bytes||routeSpecific.max_bytes;
  const timeoutMs=candidate.timeout_ms||routeSpecific.timeout_ms;
  const requestBody=candidate.body_json?JSON.stringify(candidate.body_json):candidate.body;
  const requestBodySha256=requestBody?sha256(Buffer.from(String(requestBody))):null;
  const requestHeaderNames=Object.keys(candidate.headers||{}).map((value)=>String(value).toLowerCase()).sort();
  const attempts=method==='HEAD'?1:routeSpecific.attempts;
  const attemptLedger=[];
  for(let attempt=0;attempt<attempts;attempt++){
    const started_at=new Date().toISOString();
    const result=await gate.run(host,routeSpecific.minimum_interval_ms,()=>fetchWithRedirects(candidateUrl,{method,timeoutMs,maxBytes,userAgent:'CliffordNumber-M04G/2.2 (+https://github.com/BigBirdReturns/clifford-number)',allowedHostSuffixes:candidate.allowed_host_suffixes||[],headers:candidate.headers||{},body:requestBody}));
    const admission=result.ok&&method!=='HEAD'?classifyResponseBody(result.body,result.headers):null;
    const failure=result.ok?(method==='HEAD'||admission?.content_success?null:admission?.failure||'unclassified'):(result.https_downgrade?'https_downgrade_refused':classifyFailure(result));
    attemptLedger.push({attempt:attempt+1,url:candidateUrl,method,final_method:result.final_method||method,source_class:candidate.source_class||route.hydrology_class,started_at,status:result.status,final_url:result.final_url,failure,metadata_only:Boolean(result.metadata_only),bytes:result.body?.length||0,content_type:result.headers?.['content-type']||null,rejection_reason:admission?.reason||null,request_body_sha256:requestBodySha256,request_header_names:requestHeaderNames});
    if(result.ok&&(method==='HEAD'||admission?.content_success)){
      return {success:true,content_success:method!=='HEAD'&&Boolean(admission?.content_success),metadata_only:method==='HEAD'||Boolean(result.metadata_only),status:result.status,requested_url:candidateUrl,final_url:result.final_url,method,final_method:result.final_method||method,source_class:candidate.source_class||route.hydrology_class,headers:result.headers,bytes:result.body?.length||0,content_sha256:result.body?.length?sha256(result.body):null,summary:admission?.summary||summarizeBody(result.body),visible_characters:admission?.visible_characters||null,request_body_sha256:requestBodySha256,request_header_names:requestHeaderNames,attempts:attemptLedger};
    }
    if(result.ok)break;
    if(attempt<attempts-1&&shouldRetry(result))await sleep(retryDelay(policy,attempt,result));
    else break;
  }
  const last=attemptLedger.at(-1);
  return {success:false,content_success:false,metadata_only:false,status:last?.status||null,requested_url:candidateUrl,final_url:last?.final_url||candidateUrl,method,final_method:last?.final_method||method,source_class:candidate.source_class||route.hydrology_class,failure:last?.failure||'unclassified',rejection_reason:last?.rejection_reason||null,request_body_sha256:requestBodySha256,request_header_names:requestHeaderNames,attempts:attemptLedger};
}
`;
library=`${library.slice(0,executeStart)}${executeCandidate}${library.slice(executeEnd)}`;
write(libraryPath,library);

const policyPath='data/project/m04g-source-ecology-v2-policy.json';
const policy=JSON.parse(read(policyPath));
const additions=[
  {
    match:'oecd.org',
    fallbacks:[{
      url:'https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI/.M.LI...AA...H?startPeriod=2023-02&dimensionAtObservation=AllDimensions&format=csvfilewithlabels',
      method:'GET',source_class:'official_statistical_api',max_bytes:2097152,timeout_ms:60000,allowed_host_suffixes:['oecd.org'],
      headers:{accept:'application/vnd.sdmx.data+csv; version=2,text/csv;q=0.9,*/*;q=0.1'}
    }]
  },
  {match:'federalregister.gov',fallbacks:[{url:'https://www.federalregister.gov/api/v1/documents.json?per_page=5&order=newest',method:'GET',source_class:'official_rulemaking_api',max_bytes:524288,timeout_ms:30000,allowed_host_suffixes:['federalregister.gov']}]},
  {match:'regulations.gov',fallbacks:[{url:'https://api.regulations.gov/v4/documents?filter%5BsearchTerm%5D=artificial%20intelligence&page%5Bsize%5D=5&api_key=DEMO_KEY',method:'GET',source_class:'official_regulatory_api',max_bytes:1048576,timeout_ms:30000,allowed_host_suffixes:['regulations.gov']}]},
  {
    match:'usaspending.gov',
    fallbacks:[{
      url:'https://api.usaspending.gov/api/v2/search/spending_by_award/',method:'POST',source_class:'official_spending_api',max_bytes:2097152,timeout_ms:30000,allowed_host_suffixes:['usaspending.gov'],
      headers:{'content-type':'application/json'},
      body_json:{filters:{time_period:[{start_date:'2025-01-01',end_date:'2025-12-31'}],award_type_codes:['A','B','C','D']},fields:['Award ID','Recipient Name','Award Amount','Awarding Agency','Award Type'],page:1,limit:5,sort:'Award Amount',order:'desc',subawards:false}
    }]
  },
  {match:'iadb.org',fallbacks:[{url:'https://data.iadb.org/dataset/summary-dataset-water-and-sanitation-tariffs-in-latin-america',method:'GET',source_class:'official_open_data_record',max_bytes:2097152,timeout_ms:45000,allowed_host_suffixes:['iadb.org']}]},
  {
    match:'eur-lex.europa.eu',
    fallbacks:[{
      url:'https://publications.europa.eu/webapi/rdf/sparql',method:'POST',source_class:'official_eu_knowledge_graph_api',max_bytes:2097152,timeout_ms:30000,allowed_host_suffixes:['europa.eu'],
      headers:{'content-type':'application/x-www-form-urlencoded; charset=utf-8',accept:'application/sparql-results+json,application/json;q=0.9,*/*;q=0.1'},
      body:'query=SELECT%20%3Fs%20%3Fp%20%3Fo%20WHERE%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D%20LIMIT%2020&format=application%2Fsparql-results%2Bjson'
    }]
  },
  {
    match:'ted.europa.eu',
    fallbacks:[{
      url:'https://api.ted.europa.eu/v3/notices/search',method:'POST',source_class:'official_procurement_search_api',max_bytes:2097152,timeout_ms:30000,allowed_host_suffixes:['europa.eu'],
      headers:{'content-type':'application/json'},
      body_json:{query:'notice-type = (cn-standard)',fields:['publication-number'],page:1,limit:5,scope:'ALL',checkQuerySyntax:false,paginationMode:'PAGE_NUMBER'}
    }]
  },
  {match:'kmu.gov.ua',fallbacks:[{url:'https://www.kmu.gov.ua/',method:'GET',source_class:'official_portal_large_document',max_bytes:2097152,timeout_ms:45000,allowed_host_suffixes:['kmu.gov.ua']}]},
  {match:'prozorro.gov.ua',fallbacks:[{url:'https://public-api.prozorro.gov.ua/api/0/tenders?opt_fields=status,dateCreated,procuringEntity',method:'GET',source_class:'official_procurement_api',max_bytes:2097152,timeout_ms:30000,allowed_host_suffixes:['prozorro.gov.ua']}]},
  {match:'korea.net',fallbacks:[{url:'https://french.korea.net/koreanet/rss/news/2',method:'GET',source_class:'official_government_news_feed',max_bytes:1048576,timeout_ms:30000,allowed_host_suffixes:['korea.net'],headers:{accept:'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.1'}}]}
];
for(const entry of additions){
  if(policy.host_fallbacks.some((row)=>row.match===entry.match))throw new Error(`Fallback already exists for ${entry.match}`);
  policy.host_fallbacks.push(entry);
}
const govIl=policy.host_fallbacks.find((row)=>row.match==='gov.il');
if(!govIl)throw new Error('Missing existing gov.il fallback policy');
const govIlCandidate={url:'https://data.gov.il/api/3/action/package_search?q=government&rows=5',method:'GET',source_class:'official_open_data_catalog_api',max_bytes:1048576,timeout_ms:30000,allowed_host_suffixes:['gov.il']};
govIl.fallbacks=[govIlCandidate,...govIl.fallbacks.filter((row)=>row.url!==govIlCandidate.url)];
write(policyPath,`${JSON.stringify(policy,null,2)}\n`);

const testPath='test/m05-answerable-power-sprint-03-leg-07.test.js';
let test=read(testPath);
const marker='// M04G substantive official fallback v2 regression assertions';
if(test.includes(marker))throw new Error('v2 test assertions already present');
test+=`\n${marker}\n{
  const v2Fallbacks=new Map(policy.host_fallbacks.map((row)=>[row.match,row]));
  const expectedV2=new Map(${JSON.stringify([
    ['oecd.org',additions[0].fallbacks[0]],
    ['federalregister.gov',additions[1].fallbacks[0]],
    ['regulations.gov',additions[2].fallbacks[0]],
    ['usaspending.gov',additions[3].fallbacks[0]],
    ['iadb.org',additions[4].fallbacks[0]],
    ['eur-lex.europa.eu',additions[5].fallbacks[0]],
    ['ted.europa.eu',additions[6].fallbacks[0]],
    ['kmu.gov.ua',additions[7].fallbacks[0]],
    ['prozorro.gov.ua',additions[8].fallbacks[0]],
    ['korea.net',additions[9].fallbacks[0]],
    ['gov.il',govIlCandidate]
  ])});
  for(const [match,candidate] of expectedV2)assert.deepEqual(v2Fallbacks.get(match)?.fallbacks?.[0],candidate);
  assert.equal(new Set(policy.host_fallbacks.map((row)=>row.match)).size,policy.host_fallbacks.length);
  assert.equal(new Set([...expectedV2.values()].map((row)=>row.url)).size,expectedV2.size);
  assert.equal(expectedV2.get('usaspending.gov').method,'POST');
  assert.equal(expectedV2.get('ted.europa.eu').method,'POST');
  assert.equal(expectedV2.get('eur-lex.europa.eu').method,'POST');
  assert.equal(classifyResponseBody(Buffer.from('REF_AREA,TIME_PERIOD,OBS_VALUE\\nFRA,2025-01,100\\n'.repeat(10)),{'content-type':'application/vnd.sdmx.data+csv'}).content_success,true);
}\n`;
write(testPath,test);

console.log('m04g substantive official fallback v2 patch applied');
