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

const libraryPath='tools/lib/m04g-source-ecology-v2.mjs';
let library=read(libraryPath);

library=replaceOnce(
  library,
  "export function classifyFailure({status,error,oversized,redirectUrl,redirect_unresolved}){\n",
  "export function classifyFailure({status,error,oversized,redirectUrl,redirect_unresolved,redirect_outside_allowed_host}){\n",
  'classifyFailure signature'
);
library=replaceOnce(
  library,
  "  if(oversized)return 'oversized_response';\n",
  "  if(oversized)return 'oversized_response';\n  if(redirect_outside_allowed_host)return 'redirect_outside_official_host';\n",
  'redirect outside official host classification'
);

const fetchSignature="async function fetchWithRedirects(url,{method,timeoutMs,maxBytes,userAgent}){\n";
const fetchReplacement=`function redirectHostAllowed(candidateUrl,redirectUrl,allowedHostSuffixes=[]){
  const source=new URL(candidateUrl).hostname.toLowerCase();
  const target=new URL(redirectUrl).hostname.toLowerCase();
  const suffixes=[source,...allowedHostSuffixes.map((value)=>String(value).toLowerCase())];
  return suffixes.some((suffix)=>target===suffix||target.endsWith(\`.\${suffix}\`)||suffix.endsWith(\`.\${target}\`));
}

async function fetchWithRedirects(url,{method,timeoutMs,maxBytes,userAgent,allowedHostSuffixes=[]}){
`;
library=replaceOnce(library,fetchSignature,fetchReplacement,'fetchWithRedirects signature');

library=replaceOnce(
  library,
  "        const next=new URL(location,current).toString();\n        if(current.startsWith('https://')&&next.startsWith('http://'))return {ok:false,status:response.status,final_url:current,redirect_url:next,https_downgrade:true,headers:Object.fromEntries(response.headers)};\n        current=next;\n",
  "        const next=new URL(location,current).toString();\n        if(current.startsWith('https://')&&next.startsWith('http://'))return {ok:false,status:response.status,final_url:current,redirect_url:next,https_downgrade:true,headers:Object.fromEntries(response.headers)};\n        if(allowedHostSuffixes.length&&!redirectHostAllowed(url,next,allowedHostSuffixes))return {ok:false,status:response.status,final_url:current,redirect_url:next,redirect_outside_allowed_host:true,headers:Object.fromEntries(response.headers)};\n        current=next;\n",
  'bounded fallback redirect'
);

const summarizeAnchor=`function summarizeBody(body){
  if(!body?.length)return null;
  const text=body.toString('utf8').replace(/\\s+/g,' ').trim();
  return text.slice(0,600);
}

`;
const classifier=`function summarizeBody(body){
  if(!body?.length)return null;
  const text=body.toString('utf8').replace(/\\s+/g,' ').trim();
  return text.slice(0,600);
}

const CHALLENGE_MARKERS=['cf-chl-','cloudflare ray id','just a moment','enable javascript and cookies to continue','request blocked','captcha','the request could not be satisfied'];
const HTML_ERROR_TITLES=/^\\s*(?:404|403|not found|page not found|error|access denied)\\b/iu;

function decodeHtmlEntities(value){
  return value
    .replace(/&nbsp;/giu,' ')
    .replace(/&amp;/giu,'&')
    .replace(/&lt;/giu,'<')
    .replace(/&gt;/giu,'>')
    .replace(/&quot;/giu,'"')
    .replace(/&#39;/giu,"'")
    .replace(/&#x([0-9a-f]+);/giu,(_,hex)=>String.fromCodePoint(Number.parseInt(hex,16)))
    .replace(/&#([0-9]+);/gu,(_,dec)=>String.fromCodePoint(Number.parseInt(dec,10)));
}

function visibleHtmlText(text){
  return decodeHtmlEntities(text
    .replace(/<(script|style|noscript|svg|template)\\b[^>]*>[\\s\\S]*?<\\/\\1>/giu,' ')
    .replace(/<!--([\\s\\S]*?)-->/gu,' ')
    .replace(/<[^>]+>/gu,' ')
    .replace(/\\s+/gu,' ')
    .trim());
}

function contentDecision(contentSuccess,failure=null,reason=null,summary=null,visibleCharacters=null){
  return {content_success:contentSuccess,failure,reason,summary,visible_characters:visibleCharacters};
}

export function classifyResponseBody(body,headers={}){
  const bytes=Buffer.isBuffer(body)?body:Buffer.from(body||'');
  const contentType=String(headers['content-type']||headers['Content-Type']||'').toLowerCase();
  if(bytes.length<128)return contentDecision(false,'insufficient_content',\`only \${bytes.length} bytes\`);
  const prefix=bytes.subarray(0,16).toString('binary');
  if(contentType.includes('pdf')||prefix.startsWith('%PDF-')){
    if(!prefix.startsWith('%PDF-'))return contentDecision(false,'content_type_mismatch','PDF content type without PDF magic bytes');
    if(bytes.length<1024)return contentDecision(false,'insufficient_content',\`PDF only \${bytes.length} bytes\`);
    return contentDecision(true,null,null,\`PDF \${bytes.length} bytes\`);
  }
  const text=bytes.toString('utf8').trim();
  const lower=text.toLowerCase();
  const challenge=CHALLENGE_MARKERS.find((marker)=>lower.includes(marker));
  if(challenge)return contentDecision(false,'challenge_or_access_page',\`challenge marker: \${challenge}\`);
  if(/^[\\[{]/u.test(text)){
    try{
      const parsed=JSON.parse(text);
      const populated=Array.isArray(parsed)?parsed.length>0:Boolean(parsed&&typeof parsed==='object'&&Object.keys(parsed).length>0);
      if(!populated)return contentDecision(false,'insufficient_content','empty JSON payload');
      return contentDecision(true,null,null,text.replace(/\\s+/gu,' ').slice(0,600));
    }catch{
      return contentDecision(false,'parse_failure','invalid JSON payload');
    }
  }
  if(contentType.includes('xml')||contentType.includes('rss')||/^<\\?xml\\b/iu.test(text)){
    if(/<html\\b/iu.test(text.slice(0,1000)))return contentDecision(false,'content_type_mismatch','XML-labelled response contains HTML');
    if(!/<(?:rss|feed|channel|DataRoot|Law|urlset|sitemapindex|article|document)\\b/iu.test(text))return contentDecision(false,'parse_failure','XML response lacks a recognized substantive root');
    return contentDecision(true,null,null,text.replace(/\\s+/gu,' ').slice(0,600));
  }
  if(contentType.includes('html')||/<html\\b/iu.test(text.slice(0,1000))){
    const title=(text.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/iu)?.[1]||'').replace(/<[^>]+>/gu,' ').replace(/\\s+/gu,' ').trim();
    if(HTML_ERROR_TITLES.test(title))return contentDecision(false,'not_found_content',\`HTML title indicates an error page: \${title}\`);
    const visible=visibleHtmlText(text);
    if(/<iframe\\b/iu.test(text)&&visible.length<300)return contentDecision(false,'embedded_document_shell',\`only \${visible.length} visible characters outside an embedded viewer\`,null,visible.length);
    if(/<div[^>]+id=["'](?:app|root)["'][^>]*>\\s*<\\/div>/iu.test(text)&&visible.length<300)return contentDecision(false,'client_rendered_shell',\`only \${visible.length} visible characters outside an empty application root\`,null,visible.length);
    if(visible.length<300)return contentDecision(false,'insufficient_visible_content',\`only \${visible.length} visible characters\`,null,visible.length);
    return contentDecision(true,null,null,visible.slice(0,600),visible.length);
  }
  if(text.length<300)return contentDecision(false,'insufficient_content',\`only \${text.length} decoded characters\`);
  return contentDecision(true,null,null,text.replace(/\\s+/gu,' ').slice(0,600));
}

`;
library=replaceOnce(library,summarizeAnchor,classifier,'content classifier insertion');

const executeStart=library.indexOf('async function executeCandidate(candidate,route,routeSpecific,policy,gate){');
const executeEnd=library.indexOf('\nasync function executeRoute(route,policy,gate){',executeStart);
if(executeStart<0||executeEnd<0)throw new Error('Unable to locate executeCandidate');
const executeCandidate=`async function executeCandidate(candidate,route,routeSpecific,policy,gate){
  const candidateUrl=candidate.url;
  const method=(candidate.method||route.method||'GET').toUpperCase();
  const host=new URL(candidateUrl).hostname;
  const maxBytes=candidate.max_bytes||routeSpecific.max_bytes;
  const timeoutMs=candidate.timeout_ms||routeSpecific.timeout_ms;
  const attempts=method==='HEAD'?1:routeSpecific.attempts;
  const attemptLedger=[];
  for(let attempt=0;attempt<attempts;attempt++){
    const started_at=new Date().toISOString();
    const result=await gate.run(host,routeSpecific.minimum_interval_ms,()=>fetchWithRedirects(candidateUrl,{method,timeoutMs,maxBytes,userAgent:'CliffordNumber-M04G/2.1 (+https://github.com/BigBirdReturns/clifford-number)',allowedHostSuffixes:candidate.allowed_host_suffixes||[]}));
    const admission=result.ok&&method!=='HEAD'?classifyResponseBody(result.body,result.headers):null;
    const failure=result.ok?(method==='HEAD'||admission?.content_success?null:admission?.failure||'unclassified'):(result.https_downgrade?'https_downgrade_refused':classifyFailure(result));
    attemptLedger.push({attempt:attempt+1,url:candidateUrl,method,source_class:candidate.source_class||route.hydrology_class,started_at,status:result.status,final_url:result.final_url,failure,metadata_only:Boolean(result.metadata_only),bytes:result.body?.length||0,content_type:result.headers?.['content-type']||null,rejection_reason:admission?.reason||null});
    if(result.ok&&(method==='HEAD'||admission?.content_success)){
      return {success:true,content_success:method!=='HEAD'&&Boolean(admission?.content_success),metadata_only:method==='HEAD'||Boolean(result.metadata_only),status:result.status,requested_url:candidateUrl,final_url:result.final_url,method,source_class:candidate.source_class||route.hydrology_class,headers:result.headers,bytes:result.body?.length||0,content_sha256:result.body?.length?sha256(result.body):null,summary:admission?.summary||summarizeBody(result.body),visible_characters:admission?.visible_characters||null,attempts:attemptLedger};
    }
    if(result.ok)break;
    if(attempt<attempts-1&&shouldRetry(result))await sleep(retryDelay(policy,attempt,result));
    else break;
  }
  const last=attemptLedger.at(-1);
  return {success:false,content_success:false,metadata_only:false,status:last?.status||null,requested_url:candidateUrl,final_url:last?.final_url||candidateUrl,method,source_class:candidate.source_class||route.hydrology_class,failure:last?.failure||'unclassified',rejection_reason:last?.rejection_reason||null,attempts:attemptLedger};
}
`;
library=`${library.slice(0,executeStart)}${executeCandidate}${library.slice(executeEnd)}`;
write(libraryPath,library);

const policyPath='data/project/m04g-source-ecology-v2-policy.json';
const policy=JSON.parse(read(policyPath));
const fallbacks=[
  {match:'congress.gov',fallbacks:[{url:'https://www.congress.gov/rss/most-viewed-bills.xml',method:'GET',source_class:'official_legislation_feed',max_bytes:524288,allowed_host_suffixes:['congress.gov']}]},
  {match:'mercosur.int',fallbacks:[{url:'https://www.mercosur.int/feed/',method:'GET',source_class:'official_feed',max_bytes:1048576,allowed_host_suffixes:['mercosur.int']}]},
  {match:'echr.coe.int',fallbacks:[{url:'https://hudoc.echr.coe.int/app/query/results?query=contentsitename%3AECHR&select=itemid%2Cdocname%2Cdocumentcollectionid2&sort=&start=0&length=10',method:'GET',source_class:'official_case_law_api',max_bytes:2097152,allowed_host_suffixes:['echr.coe.int']}]},
  {match:'u.ae',fallbacks:[{url:'https://u.ae/',method:'GET',source_class:'official_portal_large_document',max_bytes:2097152,allowed_host_suffixes:['u.ae']}]},
  {match:'e-gov.go.jp',fallbacks:[{url:'https://laws.e-gov.go.jp/api/1/lawdata/405AC0000000088',method:'GET',source_class:'official_law_api_document',max_bytes:4194304,allowed_host_suffixes:['e-gov.go.jp']}]},
  {match:'asean.org',fallbacks:[{url:'https://asean.org/feed/',method:'GET',source_class:'official_feed',max_bytes:1048576,allowed_host_suffixes:['asean.org']}]}
];
for(const entry of fallbacks){
  if(policy.host_fallbacks.some((row)=>row.match===entry.match))throw new Error(`Fallback already exists for ${entry.match}`);
  policy.host_fallbacks.push(entry);
}
const austlii=policy.host_fallbacks.find((row)=>row.match==='austlii.edu.au');
if(!austlii)throw new Error('Missing AustLII fallback policy');
const legislationFallback={url:'https://www.legislation.gov.au/',method:'GET',source_class:'official_legislation_repository_replacement',max_bytes:2097152,allowed_host_suffixes:['legislation.gov.au']};
austlii.fallbacks=[legislationFallback,...austlii.fallbacks.filter((row)=>row.url!==legislationFallback.url)];
for(const failure of ['challenge_or_access_page','embedded_document_shell','client_rendered_shell','insufficient_visible_content','not_found_content','insufficient_content','redirect_outside_official_host']){
  if(!policy.failure_taxonomy.includes(failure))policy.failure_taxonomy.splice(policy.failure_taxonomy.indexOf('unclassified'),0,failure);
}
write(policyPath,`${JSON.stringify(policy,null,2)}\n`);

const testPath='test/m05-answerable-power-sprint-03-leg-07.test.js';
let test=read(testPath);
test=replaceOnce(
  test,
  "import { buildGlobalTideRequest, classifyFailure, executionContractFailures, parseGdeltTocPayload, partitionRoutesByGlobalTides } from '../tools/lib/m04g-source-ecology-v2.mjs';",
  "import { buildGlobalTideRequest, classifyFailure, classifyResponseBody, executionContractFailures, parseGdeltTocPayload, partitionRoutesByGlobalTides } from '../tools/lib/m04g-source-ecology-v2.mjs';",
  'test import'
);
const policyAnchor=`const commonCrawlFallback=policy.host_fallbacks.find((row)=>row.match==='index.commoncrawl.org');
assert.deepEqual(commonCrawlFallback,{match:'index.commoncrawl.org',fallbacks:[{url:'https://index.commoncrawl.org/collinfo.json',method:'GET',source_class:'public_index_catalog',max_bytes:524288}]});
`;
const policyAssertions=`const commonCrawlFallback=policy.host_fallbacks.find((row)=>row.match==='index.commoncrawl.org');
assert.deepEqual(commonCrawlFallback,{match:'index.commoncrawl.org',fallbacks:[{url:'https://index.commoncrawl.org/collinfo.json',method:'GET',source_class:'public_index_catalog',max_bytes:524288}]});
const officialFallbacks=new Map(policy.host_fallbacks.map((row)=>[row.match,row]));
assert.deepEqual(officialFallbacks.get('congress.gov')?.fallbacks?.[0],{url:'https://www.congress.gov/rss/most-viewed-bills.xml',method:'GET',source_class:'official_legislation_feed',max_bytes:524288,allowed_host_suffixes:['congress.gov']});
assert.deepEqual(officialFallbacks.get('mercosur.int')?.fallbacks?.[0],{url:'https://www.mercosur.int/feed/',method:'GET',source_class:'official_feed',max_bytes:1048576,allowed_host_suffixes:['mercosur.int']});
assert.deepEqual(officialFallbacks.get('echr.coe.int')?.fallbacks?.[0],{url:'https://hudoc.echr.coe.int/app/query/results?query=contentsitename%3AECHR&select=itemid%2Cdocname%2Cdocumentcollectionid2&sort=&start=0&length=10',method:'GET',source_class:'official_case_law_api',max_bytes:2097152,allowed_host_suffixes:['echr.coe.int']});
assert.deepEqual(officialFallbacks.get('u.ae')?.fallbacks?.[0],{url:'https://u.ae/',method:'GET',source_class:'official_portal_large_document',max_bytes:2097152,allowed_host_suffixes:['u.ae']});
assert.deepEqual(officialFallbacks.get('e-gov.go.jp')?.fallbacks?.[0],{url:'https://laws.e-gov.go.jp/api/1/lawdata/405AC0000000088',method:'GET',source_class:'official_law_api_document',max_bytes:4194304,allowed_host_suffixes:['e-gov.go.jp']});
assert.deepEqual(officialFallbacks.get('asean.org')?.fallbacks?.[0],{url:'https://asean.org/feed/',method:'GET',source_class:'official_feed',max_bytes:1048576,allowed_host_suffixes:['asean.org']});
assert.deepEqual(officialFallbacks.get('austlii.edu.au')?.fallbacks?.[0],{url:'https://www.legislation.gov.au/',method:'GET',source_class:'official_legislation_repository_replacement',max_bytes:2097152,allowed_host_suffixes:['legislation.gov.au']});
for(const failure of ['challenge_or_access_page','embedded_document_shell','client_rendered_shell','insufficient_visible_content','not_found_content','insufficient_content','redirect_outside_official_host'])assert.ok(policy.failure_taxonomy.includes(failure));
`;
test=replaceOnce(test,policyAnchor,policyAssertions,'policy regression assertions');

const classifierAnchor="assert.equal(classifyFailure({status:403}),'access_blocked');\n";
const classifierAssertions=`assert.equal(classifyFailure({status:403}),'access_blocked');
assert.equal(classifyFailure({status:302,redirect_outside_allowed_host:true}),'redirect_outside_official_host');
const validPdf=Buffer.concat([Buffer.from('%PDF-1.7\\n'),Buffer.alloc(2048,65)]);
assert.equal(classifyResponseBody(validPdf,{'content-type':'application/pdf'}).content_success,true);
assert.equal(classifyResponseBody(Buffer.alloc(2048,65),{'content-type':'application/pdf'}).failure,'content_type_mismatch');
assert.equal(classifyResponseBody(Buffer.from(JSON.stringify({results:[{id:1,payload:'x'.repeat(200)}]})),{'content-type':'text/plain'}).content_success,true);
assert.equal(classifyResponseBody(Buffer.from('{}'),{'content-type':'application/json'}).failure,'insufficient_content');
assert.equal(classifyResponseBody(Buffer.from('<rss><channel><item>receipt</item></channel></rss>'.repeat(8)),{'content-type':'application/rss+xml'}).content_success,true);
assert.equal(classifyResponseBody(Buffer.from('<html><body>not XML</body></html>'.repeat(10)),{'content-type':'application/xml'}).failure,'content_type_mismatch');
assert.equal(classifyResponseBody(Buffer.from('<html><head><title>Just a moment</title></head><body>Enable JavaScript and cookies to continue.</body></html>'.repeat(4)),{'content-type':'text/html'}).failure,'challenge_or_access_page');
assert.equal(classifyResponseBody(Buffer.from('<html><head><title>Document</title></head><body><iframe src=\"viewer\"></iframe></body></html>'.repeat(4)),{'content-type':'text/html'}).failure,'embedded_document_shell');
assert.equal(classifyResponseBody(Buffer.from('<html><head><title>Application</title></head><body><div id=\"root\"></div></body></html>'.repeat(4)),{'content-type':'text/html'}).failure,'client_rendered_shell');
assert.equal(classifyResponseBody(Buffer.from(\`<html><head><title>Official record</title></head><body><main>\${'Substantive official publication record. '.repeat(20)}</main></body></html>\`),{'content-type':'text/html'}).content_success,true);
`;
test=replaceOnce(test,classifierAnchor,classifierAssertions,'content classifier regression assertions');
write(testPath,test);

console.log('m04g substantive official fallback patch applied');
