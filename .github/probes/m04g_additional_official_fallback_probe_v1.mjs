#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const out=path.resolve(process.argv[2]||'qualification');
const bodies=path.join(out,'bodies');
fs.mkdirSync(bodies,{recursive:true});
const sha256=(value)=>crypto.createHash('sha256').update(value).digest('hex');

const routes=[
  {route_id:'M04G-GP096',basin_id:'G12-OCEANIA-PACIFIC',original_url:'https://www.naa.gov.au/',candidates:[
    {url:'https://www.naa.gov.au/sitemap.xml',source_class:'official_sitemap',max_bytes:8388608},
    {url:'https://www.naa.gov.au/about-us/media-and-publications/media-releases',source_class:'official_media_repository',max_bytes:4194304}]},
  {route_id:'M04G-GP094',basin_id:'G12-OCEANIA-PACIFIC',original_url:'https://www.anao.gov.au/',candidates:[
    {url:'https://www.anao.gov.au/sitemap.xml',source_class:'official_sitemap',max_bytes:8388608},
    {url:'https://www.anao.gov.au/work',source_class:'official_audit_repository',max_bytes:4194304}]},
  {route_id:'M04G-GP092',basin_id:'G12-OCEANIA-PACIFIC',original_url:'https://www.austlii.edu.au/',candidates:[
    {url:'https://www.legislation.gov.au/',source_class:'official_legislation_repository_replacement',max_bytes:4194304,allowed_suffixes:['legislation.gov.au']},
    {url:'https://www.judgments.fedcourt.gov.au/',source_class:'official_judgment_repository_replacement',max_bytes:4194304,allowed_suffixes:['fedcourt.gov.au']}]},
  {route_id:'M04G-GP030',basin_id:'G04-EU-CONTINENTAL',original_url:'https://www.edps.europa.eu/',candidates:[
    {url:'https://www.edps.europa.eu/press-publications/publications_en',source_class:'official_publication_repository',max_bytes:4194304},
    {url:'https://www.edps.europa.eu/press-publications/press-news_en',source_class:'official_news_repository',max_bytes:4194304}]},
  {route_id:'M04G-GP044',basin_id:'G06-EASTERN-EUROPE-EURASIA',original_url:'https://www.echr.coe.int/',candidates:[
    {url:'https://hudoc.echr.coe.int/app/query/results?query=contentsitename%3AECHR&select=itemid%2Cdocname%2Cdocumentcollectionid2&sort=&start=0&length=10',source_class:'official_case_law_api',max_bytes:4194304,allowed_suffixes:['echr.coe.int']},
    {url:'https://hudoc.echr.coe.int/eng',source_class:'official_case_law_repository',max_bytes:4194304,allowed_suffixes:['echr.coe.int']}]},
  {route_id:'M04G-GP084',basin_id:'G11-SOUTHEAST-ASIA',original_url:'https://sso.agc.gov.sg/',candidates:[
    {url:'https://sso.agc.gov.sg/Act/CONST1963',source_class:'official_constitution_record',max_bytes:4194304},
    {url:'https://sso.agc.gov.sg/Act/ITA1947',source_class:'official_legislation_record',max_bytes:4194304}]},
  {route_id:'M04G-GP020',basin_id:'G03-LATIN-AMERICA-CARIBBEAN',original_url:'https://www.iadb.org/',candidates:[
    {url:'https://www.iadb.org/en/news',source_class:'official_news_repository',max_bytes:4194304},
    {url:'https://www.iadb.org/en/publications',source_class:'official_publication_repository',max_bytes:4194304}]},
  {route_id:'M04G-GP021',basin_id:'G03-LATIN-AMERICA-CARIBBEAN',original_url:'https://www.mercosur.int/',candidates:[
    {url:'https://www.mercosur.int/feed/',source_class:'official_feed',max_bytes:2097152},
    {url:'https://www.mercosur.int/en/feed/',source_class:'official_feed',max_bytes:2097152}]},
  {route_id:'M04G-GP077',basin_id:'G10-EAST-ASIA',original_url:'https://www.gov-online.go.jp/',candidates:[
    {url:'https://www.gov-online.go.jp/rss/',source_class:'official_feed_directory',max_bytes:4194304},
    {url:'https://www.gov-online.go.jp/data_room/publication/',source_class:'official_publication_repository',max_bytes:4194304}]},
  {route_id:'M04G-GP012',basin_id:'G02-NORTH-AMERICA',original_url:'https://www.regulations.gov/',candidates:[
    {url:'https://api.regulations.gov/v4/documents?filter%5BsearchTerm%5D=artificial%20intelligence&page%5Bsize%5D=5&api_key=DEMO_KEY',source_class:'official_regulatory_api',max_bytes:2097152,allowed_suffixes:['regulations.gov']}]},
  {route_id:'M04G-GP015',basin_id:'G02-NORTH-AMERICA',original_url:'https://www.sec.gov/',candidates:[
    {url:'https://data.sec.gov/submissions/CIK0000320193.json',source_class:'official_disclosure_api',max_bytes:4194304,allowed_suffixes:['sec.gov']},
    {url:'https://www.sec.gov/files/company_tickers.json',source_class:'official_ticker_dataset',max_bytes:4194304,allowed_suffixes:['sec.gov']}]}
];

const challengeMarkers=['cf-chl-','cloudflare ray id','just a moment','enable javascript and cookies to continue','access denied','request blocked','captcha','the request could not be satisfied'];

function hostAllowed(candidate,hostname){
  const source=new URL(candidate.url).hostname.toLowerCase();
  const final=hostname.toLowerCase();
  if(final===source||final.endsWith(`.${source}`)||source.endsWith(`.${final}`))return true;
  return (candidate.allowed_suffixes||[]).some((suffix)=>final===suffix||final.endsWith(`.${suffix}`));
}

async function readBounded(response,maxBytes){
  const chunks=[];let total=0;
  for await(const chunk of response.body||[]){
    const buffer=Buffer.from(chunk);total+=buffer.length;
    if(total>maxBytes){try{await response.body.cancel()}catch{};throw Object.assign(new Error(`response exceeded ${maxBytes} bytes`),{failure:'oversized_response'});}
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function visibleHtmlText(text){
  return text.replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<!--([\s\S]*?)-->/g,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
}

function classifyBody(body,contentType){
  if(body.length<128)return {success:false,failure:'insufficient_content',reason:`only ${body.length} bytes`};
  const text=body.toString('utf8').trim();
  const lower=text.toLowerCase();
  const marker=challengeMarkers.find((value)=>lower.includes(value));
  if(marker)return {success:false,failure:'challenge_or_access_page',reason:`challenge marker: ${marker}`};
  const type=String(contentType||'').toLowerCase();
  if(type.includes('json')||/^[\[{]/.test(text)){
    try{const parsed=JSON.parse(text);const count=Array.isArray(parsed)?parsed.length:Object.keys(parsed||{}).length;return count?{success:true,preview:text.slice(0,500)}:{success:false,failure:'insufficient_content',reason:'empty JSON'};}catch{return {success:false,failure:'parse_failure',reason:'invalid JSON'};}
  }
  if(type.includes('xml')||type.includes('rss')||/^<\?xml\b/i.test(text)){
    if(/<html\b/i.test(text.slice(0,1000)))return {success:false,failure:'content_type_mismatch',reason:'XML-labelled HTML'};
    if(!/<(?:rss|feed|urlset|sitemapindex|channel|entry|item|DataRoot|Law)\b/i.test(text))return {success:false,failure:'parse_failure',reason:'unrecognized XML root'};
    return {success:true,preview:text.replace(/\s+/g,' ').slice(0,500)};
  }
  if(type.includes('html')||/<html\b/i.test(text.slice(0,1000))){
    const visible=visibleHtmlText(text);
    if(visible.length<300)return {success:false,failure:'insufficient_visible_content',reason:`only ${visible.length} visible characters`};
    return {success:true,preview:visible.slice(0,500),visible_characters:visible.length};
  }
  return text.length>=300?{success:true,preview:text.replace(/\s+/g,' ').slice(0,500)}:{success:false,failure:'insufficient_content',reason:`only ${text.length} decoded characters`};
}

async function probe(route,candidate,index){
  let current=candidate.url;const redirects=[];const started_at=new Date().toISOString();
  try{
    for(let count=0;count<=5;count++){
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(new Error('timeout after 25000ms')),25000);
      let response;
      try{response=await fetch(current,{redirect:'manual',signal:controller.signal,headers:{'user-agent':'CliffordNumber-M04G/2.4 official fallback probe research@clifford-number.invalid','accept':'application/json,application/xml,text/xml,application/rss+xml,text/html,text/plain,*/*;q=0.1'}})}finally{clearTimeout(timer)}
      const headers=Object.fromEntries(response.headers);
      if(response.status>=300&&response.status<400){
        const location=response.headers.get('location');
        if(!location)return {...candidate,candidate_index:index,started_at,status:response.status,final_url:current,headers,redirects,success:false,failure:'redirect_unresolved'};
        const next=new URL(location,current);
        if(next.protocol!=='https:')return {...candidate,candidate_index:index,started_at,status:response.status,final_url:current,headers,redirects,success:false,failure:'https_downgrade_refused'};
        if(next.toString()===current)return {...candidate,candidate_index:index,started_at,status:response.status,final_url:current,headers,redirects,success:false,failure:'redirect_loop'};
        if(!hostAllowed(candidate,next.hostname))return {...candidate,candidate_index:index,started_at,status:response.status,final_url:current,headers,redirects,success:false,failure:'redirect_outside_official_host',redirect_target:next.toString()};
        redirects.push({status:response.status,from:current,to:next.toString()});current=next.toString();continue;
      }
      if(response.status!==200)return {...candidate,candidate_index:index,started_at,status:response.status,final_url:current,headers,redirects,success:false,failure:response.status===403?'access_blocked':response.status===429?'rate_limited':response.status>=500?'upstream_failure':'http_failure'};
      let body;
      try{body=await readBounded(response,Number(candidate.max_bytes||2097152))}catch(error){return {...candidate,candidate_index:index,started_at,status:response.status,final_url:current,headers,redirects,success:false,failure:error.failure||'read_failure',error:error.message};}
      const content_type=String(response.headers.get('content-type')||'');
      const classified=classifyBody(body,content_type);
      const extension=content_type.includes('json')?'json':content_type.includes('xml')||content_type.includes('rss')?'xml':'html';
      const bodyPath=path.join(bodies,`${route.route_id}-${index}.${extension}`);fs.writeFileSync(bodyPath,body);
      return {...candidate,candidate_index:index,started_at,status:response.status,final_url:current,headers,redirects,bytes:body.length,content_type,body_sha256:sha256(body),body_path:path.relative(out,bodyPath),success:classified.success,failure:classified.failure||null,rejection_reason:classified.reason||null,text_preview:classified.preview||null,visible_characters:classified.visible_characters||null};
    }
    return {...candidate,candidate_index:index,started_at,status:null,final_url:current,redirects,success:false,failure:'redirect_limit_exceeded'};
  }catch(error){return {...candidate,candidate_index:index,started_at,status:null,final_url:current,redirects,success:false,failure:String(error?.message||'').includes('timeout')?'timeout':'transport_failure',error:String(error?.message||error)};}
}

const results=[];
for(const route of routes){
  const attempts=[];let selected=null;
  for(let index=0;index<route.candidates.length;index++){
    const attempt=await probe(route,route.candidates[index],index);attempts.push(attempt);
    if(attempt.success){selected=attempt;break;}
  }
  results.push({...route,success:Boolean(selected),selected,attempts});
}
const selected=results.filter((row)=>row.success).map((row)=>({route_id:row.route_id,basin_id:row.basin_id,url:row.selected.url,final_url:row.selected.final_url,source_class:row.selected.source_class,bytes:row.selected.bytes,content_type:row.selected.content_type,body_sha256:row.selected.body_sha256,body_path:row.selected.body_path}));
const ledger={schema_version:'m04g-additional-official-fallback-probe@1',generated_at:new Date().toISOString(),workflow_run_id:process.env.GITHUB_RUN_ID||null,commit_sha:process.env.GITHUB_SHA||null,branch:process.env.GITHUB_REF_NAME||null,product_files_modified:false,candidate_write_enabled:false,summary:{routes_probed:results.length,route_successes:selected.length,candidate_authorized:selected.length>=1},selected,routes:results,boundaries:{denominator_changed:false,route_identity_changed:false,thresholds_changed:false,source_health_proves_evidentiary_sufficiency:false,source_health_proves_answer_effectiveness:false}};
fs.writeFileSync(path.join(out,'ledger.json'),JSON.stringify(ledger,null,2)+'\n');
fs.writeFileSync(path.join(out,'ledger.sha256'),`${sha256(Buffer.from(JSON.stringify(ledger)))}  ledger.json\n`);
console.log(JSON.stringify(ledger.summary,null,2));
