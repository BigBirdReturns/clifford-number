#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const out=path.resolve(process.argv[2]||'qualification');
const bodies=path.join(out,'bodies');
fs.mkdirSync(bodies,{recursive:true});
const sha256=(value)=>crypto.createHash('sha256').update(value).digest('hex');

const routes=[
  {route_id:'M04G-GP051',basin_id:'G07-MENA',original_url:'https://www.unescwa.org/',candidates:[
    {url:'https://docs.un.org/en/E/ESCWA/EDID/2015/3',source_class:'official_un_document_record',max_bytes:524288},
    {url:'https://docs.un.org/en/E/ESCWA/EDID/2015/3/download',source_class:'official_un_document_download_record',max_bytes:524288}]},
  {route_id:'M04G-GP056',basin_id:'G07-MENA',original_url:'https://www.unescwa.org/publications',candidates:[
    {url:'https://docs.un.org/en/E/ESCWA/CL3.SEP/2023/4',source_class:'official_un_document_record',max_bytes:524288},
    {url:'https://docs.un.org/en/E/ESCWA/CL3.SEP/2023/4/download',source_class:'official_un_document_download_record',max_bytes:524288}]},
  {route_id:'M04G-GP054',basin_id:'G07-MENA',original_url:'https://u.ae/',candidates:[
    {url:'https://u.ae/',source_class:'official_portal_large_document',max_bytes:2097152},
    {url:'https://u.ae/en/information-and-services',source_class:'official_services_repository',max_bytes:2097152}]},
  {route_id:'M04G-GP046',basin_id:'G06-EASTERN-EUROPE-EURASIA',original_url:'https://www.kmu.gov.ua/',candidates:[
    {url:'https://www.kmu.gov.ua/',source_class:'official_portal_large_document',max_bytes:2097152},
    {url:'https://www.kmu.gov.ua/news',source_class:'official_news_repository',max_bytes:2097152}]},
  {route_id:'M04G-GP013',basin_id:'G02-NORTH-AMERICA',original_url:'https://www.congress.gov/',candidates:[
    {url:'https://www.congress.gov/rss/most-viewed-bills.xml',source_class:'official_legislation_feed',max_bytes:524288},
    {url:'https://www.congress.gov/rss/committee-schedule.xml',source_class:'official_committee_feed',max_bytes:524288}]},
  {route_id:'M04G-GP015',basin_id:'G02-NORTH-AMERICA',original_url:'https://www.sec.gov/',candidates:[
    {url:'https://www.sec.gov/files/company_tickers.json',source_class:'official_regulatory_dataset',max_bytes:2097152},
    {url:'https://www.sec.gov/Archives/edgar/usgaap.rss.xml',source_class:'official_regulatory_feed',max_bytes:524288}]},
  {route_id:'M04G-GP005',basin_id:'G01-GLOBAL-MULTILATERAL',original_url:'https://www.oecd.org/',candidates:[
    {url:'https://www.oecd.org/sitemap.xml',source_class:'official_sitemap',max_bytes:4194304},
    {url:'https://www.oecd.org/en/sitemap.xml',source_class:'official_sitemap',max_bytes:4194304}]},
  {route_id:'M04G-GP078',basin_id:'G10-EAST-ASIA',original_url:'https://www.korea.net/',candidates:[
    {url:'https://www.korea.net/main.do',source_class:'official_portal_canonical_entry',max_bytes:2097152},
    {url:'https://www.korea.net/NewsFocus/policies',source_class:'official_policy_repository',max_bytes:2097152}]},
  {route_id:'M04G-GP083',basin_id:'G11-SOUTHEAST-ASIA',original_url:'https://asean.org/',candidates:[
    {url:'https://asean.org/feed/',source_class:'official_feed',max_bytes:1048576},
    {url:'https://asean.org/category/news/feed/',source_class:'official_news_feed',max_bytes:1048576}]},
  {route_id:'M04G-GP060',basin_id:'G08-SUB-SAHARAN-AFRICA',original_url:'https://www.afdb.org/',candidates:[
    {url:'https://www.afdb.org/en/rss.xml',source_class:'official_feed',max_bytes:1048576},
    {url:'https://www.afdb.org/en/news-and-events/rss',source_class:'official_news_feed',max_bytes:1048576}]},
  {route_id:'M04G-GP063',basin_id:'G08-SUB-SAHARAN-AFRICA',original_url:'https://www.kenyalaw.org/',candidates:[
    {url:'https://new.kenyalaw.org/',source_class:'official_legal_repository_replacement',max_bytes:2097152},
    {url:'https://new.kenyalaw.org/judgments/',source_class:'official_judgment_repository',max_bytes:2097152}]},
  {route_id:'M04G-GP075',basin_id:'G10-EAST-ASIA',original_url:'https://www.e-gov.go.jp/',candidates:[
    {url:'https://elaws.e-gov.go.jp/',source_class:'official_law_repository',max_bytes:2097152},
    {url:'https://laws.e-gov.go.jp/',source_class:'official_law_repository',max_bytes:2097152}]}
];

const challengeMarkers=['cf-chl-','cloudflare ray id','just a moment','enable javascript and cookies to continue','access denied','request blocked','captcha','the request could not be satisfied'];
const allowedHost=(candidate,hostname)=>{
  const source=new URL(candidate.url).hostname.toLowerCase();
  const final=hostname.toLowerCase();
  return final===source||final.endsWith(`.${source}`)||source.endsWith(`.${final}`);
};

async function readBounded(response,maxBytes){
  if(!response.body)return Buffer.alloc(0);
  const chunks=[];let total=0;
  for await(const chunk of response.body){
    const buffer=Buffer.from(chunk);total+=buffer.length;
    if(total>maxBytes){try{await response.body.cancel()}catch{};throw Object.assign(new Error(`response exceeded ${maxBytes} bytes`),{failure:'oversized_response'});}
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function classifyBody(body,contentType){
  if(body.length<128)return {success:false,failure:'insufficient_content',reason:`only ${body.length} bytes`};
  const text=body.toString('utf8').replace(/\s+/g,' ').trim();
  const lower=text.toLowerCase();
  const marker=challengeMarkers.find((value)=>lower.includes(value));
  if(marker)return {success:false,failure:'challenge_or_access_page',reason:`challenge marker: ${marker}`};
  if(/text\/html/i.test(contentType)){
    if(/<title[^>]*>\s*(?:404|not found|page not found|error)/i.test(text))return {success:false,failure:'not_found_content',reason:'HTML title indicates an error page'};
    if(!/<(?:html|body|main|article|section|title)\b/i.test(text))return {success:false,failure:'parse_failure',reason:'HTML response lacks structural markup'};
  }
  return {success:true,failure:null,reason:null,text_preview:text.slice(0,500)};
}

async function probe(route,candidate,index){
  let current=candidate.url;const redirects=[];const started_at=new Date().toISOString();
  try{
    for(let count=0;count<=5;count++){
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(new Error('timeout after 20000ms')),20000);
      let response;
      try{response=await fetch(current,{redirect:'manual',signal:controller.signal,headers:{'user-agent':'CliffordNumber-M04G/2.1 official-fallback-census (+https://github.com/BigBirdReturns/clifford-number)',accept:'application/json,application/xml,text/xml,application/rss+xml,text/html,application/pdf,text/plain,*/*;q=0.1'}})}finally{clearTimeout(timer)}
      const headers=Object.fromEntries(response.headers);
      if(response.status>=300&&response.status<400){
        const location=response.headers.get('location');
        if(!location)return {...candidate,candidate_index:index,started_at,status:response.status,final_url:current,headers,redirects,success:false,failure:'redirect_unresolved'};
        const next=new URL(location,current);
        if(next.protocol!=='https:')return {...candidate,candidate_index:index,started_at,status:response.status,final_url:current,headers,redirects,success:false,failure:'https_downgrade_refused'};
        if(!allowedHost(candidate,next.hostname))return {...candidate,candidate_index:index,started_at,status:response.status,final_url:current,headers,redirects,success:false,failure:'redirect_outside_official_host',redirect_target:next.toString()};
        redirects.push({status:response.status,from:current,to:next.toString()});current=next.toString();continue;
      }
      if(response.status!==200)return {...candidate,candidate_index:index,started_at,status:response.status,final_url:current,headers,redirects,success:false,failure:response.status===403?'access_blocked':response.status===429?'rate_limited':response.status>=500?'upstream_failure':'http_failure'};
      let body;
      try{body=await readBounded(response,Number(candidate.max_bytes||1048576))}catch(error){return {...candidate,candidate_index:index,started_at,status:response.status,final_url:current,headers,redirects,success:false,failure:error.failure||'read_failure',error:error.message}}
      const content_type=String(response.headers.get('content-type')||'').toLowerCase();
      const decision=classifyBody(body,content_type);const body_sha256=sha256(body);
      const ext=content_type.includes('json')?'json':content_type.includes('xml')||content_type.includes('rss')?'xml':content_type.includes('pdf')?'pdf':'html';
      const bodyPath=path.join(bodies,`${route.route_id}-${index}.${ext}`);fs.writeFileSync(bodyPath,body);
      return {...candidate,candidate_index:index,started_at,status:response.status,final_url:current,headers,redirects,bytes:body.length,content_type,body_sha256,body_path:path.relative(out,bodyPath),success:decision.success,failure:decision.failure,rejection_reason:decision.reason,text_preview:decision.text_preview||null};
    }
    return {...candidate,candidate_index:index,started_at,final_url:current,redirects,success:false,failure:'redirect_limit_exceeded'};
  }catch(error){const message=String(error?.message||error).toLowerCase();return {...candidate,candidate_index:index,started_at,final_url:current,redirects,success:false,failure:message.includes('timeout')||message.includes('abort')?'timeout':message.includes('getaddrinfo')?'dns_failure':'transport_failure',error:String(error?.message||error)}}
}

const results=[];
for(const route of routes){
  const attempts=[];let selected=null;
  for(let index=0;index<route.candidates.length;index++){const result=await probe(route,route.candidates[index],index);attempts.push(result);if(result.success){selected=result;break}}
  results.push({route_id:route.route_id,basin_id:route.basin_id,original_url:route.original_url,success:Boolean(selected),selected,attempts});
}
const selected=results.filter((row)=>row.success).map((row)=>({route_id:row.route_id,basin_id:row.basin_id,url:row.selected.url,final_url:row.selected.final_url,source_class:row.selected.source_class,bytes:row.selected.bytes,content_type:row.selected.content_type,body_sha256:row.selected.body_sha256,body_path:row.selected.body_path}));
const mena=selected.filter((row)=>row.basin_id==='G07-MENA').length;
const uniqueUrls=new Set(selected.map((row)=>row.final_url)).size;const uniqueHashes=new Set(selected.map((row)=>row.body_sha256)).size;
const reasons=[];if(selected.length<6)reasons.push(`only ${selected.length} routes recovered; six required`);if(mena<1)reasons.push('no MENA route recovered');if(uniqueUrls!==selected.length)reasons.push('selected final URLs are not distinct');if(uniqueHashes!==selected.length)reasons.push('selected response hashes are not distinct');
const core={schema_version:'m04g-official-fallback-census@1',generated_at:new Date().toISOString(),workflow_run_id:process.env.GITHUB_RUN_ID||null,commit_sha:process.env.GITHUB_SHA||null,branch:process.env.GITHUB_REF_NAME||null,product_files_modified:false,candidate_write_enabled:false,requirements:{minimum_distinct_route_successes:6,minimum_mena_successes:1,distinct_selected_final_urls:true,distinct_selected_body_hashes:true,challenge_or_access_pages_rejected:true,https_downgrades_refused:true},summary:{routes_probed:routes.length,route_successes:selected.length,mena_successes:mena,unique_final_urls:uniqueUrls,unique_body_hashes:uniqueHashes,candidate_authorized:reasons.length===0,candidate_authorization_reasons:reasons},selected,routes:results};
const ledger={...core,proof_sha256:sha256(JSON.stringify(core))};
fs.writeFileSync(path.join(out,'ledger.json'),`${JSON.stringify(ledger,null,2)}\n`);
const lines=['# M-04G official fallback census v1','',`- Routes probed: ${routes.length}`,`- Route successes: ${selected.length}`,`- MENA successes: ${mena}`,`- Candidate authorized: ${reasons.length===0}`,`- Proof SHA-256: ${ledger.proof_sha256}`,'',...selected.map((row)=>`- \`${row.route_id}\`: \`${row.final_url}\` (${row.bytes} bytes, \`${row.body_sha256}\`)`)];if(reasons.length)lines.push('',...reasons.map((reason)=>`- Refusal: ${reason}`));
fs.writeFileSync(path.join(out,'summary.md'),`${lines.join('\n')}\n`);console.log(JSON.stringify(ledger.summary,null,2));
