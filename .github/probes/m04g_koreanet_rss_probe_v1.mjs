#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const out=path.resolve(process.argv[2]||'qualification');
fs.mkdirSync(out,{recursive:true});
const url='https://www.korea.net/koreanet/rss/news/2';
const started_at=new Date().toISOString();
const sha256=(value)=>crypto.createHash('sha256').update(value).digest('hex');

async function readBounded(response,maxBytes){
  const chunks=[];
  let total=0;
  for await(const chunk of response.body||[]){
    const buffer=Buffer.from(chunk);
    total+=buffer.length;
    if(total>maxBytes){
      try{await response.body.cancel()}catch{}
      throw new Error(`response exceeded ${maxBytes} bytes`);
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

let current=url;
const redirects=[];
let result;
try{
  for(let count=0;count<=5;count++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(new Error('timeout after 20000ms')),20000);
    let response;
    try{
      response=await fetch(current,{
        redirect:'manual',
        signal:controller.signal,
        headers:{
          'user-agent':'CliffordNumber-M04G/2.3 Korea.net RSS probe (+https://github.com/BigBirdReturns/clifford-number)',
          'accept':'application/rss+xml,application/xml,text/xml,*/*;q=0.1'
        }
      });
    }finally{clearTimeout(timer)}
    const headers=Object.fromEntries(response.headers);
    if(response.status>=300&&response.status<400){
      const location=response.headers.get('location');
      if(!location){result={success:false,failure:'redirect_unresolved',status:response.status,final_url:current,headers,redirects};break;}
      const next=new URL(location,current);
      if(next.protocol!=='https:'){result={success:false,failure:'https_downgrade_refused',status:response.status,final_url:current,redirect_target:next.toString(),headers,redirects};break;}
      if(!(next.hostname==='korea.net'||next.hostname.endsWith('.korea.net'))){result={success:false,failure:'redirect_outside_official_host',status:response.status,final_url:current,redirect_target:next.toString(),headers,redirects};break;}
      redirects.push({status:response.status,from:current,to:next.toString()});
      current=next.toString();
      continue;
    }
    if(response.status!==200){result={success:false,failure:response.status===403?'access_blocked':response.status===429?'rate_limited':response.status>=500?'upstream_failure':'http_failure',status:response.status,final_url:current,headers,redirects};break;}
    const body=await readBounded(response,1048576);
    const text=body.toString('utf8').trim();
    const lower=text.toLowerCase();
    const challenge=['cf-chl-','cloudflare ray id','just a moment','enable javascript and cookies to continue','access denied','captcha'].find((marker)=>lower.includes(marker));
    const contentType=String(response.headers.get('content-type')||'');
    const hasRss=/<rss\b/i.test(text)&&/<channel\b/i.test(text)&&/<item\b/i.test(text);
    const hasFeed=/<feed\b/i.test(text)&&/<entry\b/i.test(text);
    const success=body.length>=256&&!challenge&&(hasRss||hasFeed);
    const bodyPath=path.join(out,'koreanet-news-focus.xml');
    fs.writeFileSync(bodyPath,body);
    result={
      success,
      failure:success?null:challenge?'challenge_or_access_page':'parse_failure',
      rejection_reason:success?null:challenge?`challenge marker: ${challenge}`:'response lacks RSS/Atom channel and item records',
      status:response.status,
      final_url:current,
      headers,
      redirects,
      content_type:contentType,
      bytes:body.length,
      body_sha256:sha256(body),
      body_path:path.basename(bodyPath),
      rss_detected:hasRss,
      atom_detected:hasFeed,
      item_count:(text.match(/<item\b/gi)||[]).length,
      entry_count:(text.match(/<entry\b/gi)||[]).length,
      text_preview:text.replace(/\s+/g,' ').slice(0,500)
    };
    break;
  }
  if(!result)result={success:false,failure:'redirect_limit_exceeded',status:null,final_url:current,redirects};
}catch(error){
  result={success:false,failure:String(error?.message||'').toLowerCase().includes('timeout')?'timeout':'transport_failure',status:null,final_url:current,redirects,error:String(error?.message||error)};
}

const ledger={
  schema_version:'m04g-koreanet-rss-probe@1',
  generated_at:new Date().toISOString(),
  started_at,
  workflow_run_id:process.env.GITHUB_RUN_ID||null,
  commit_sha:process.env.GITHUB_SHA||null,
  branch:process.env.GITHUB_REF_NAME||null,
  route_id:'M04G-GP078',
  basin_id:'G10-EAST-ASIA',
  original_url:'https://www.korea.net/',
  candidate_url:url,
  source_class:'official_government_news_feed',
  product_files_modified:false,
  candidate_write_enabled:false,
  result,
  candidate_authorized:Boolean(result.success),
  candidate_authorization_reasons:result.success?[]:[result.failure||'unknown_failure'],
  boundaries:{
    denominator_changed:false,
    route_identity_changed:false,
    promotion_ceiling_changed:false,
    source_health_proves_evidentiary_sufficiency:false,
    source_health_proves_answer_effectiveness:false
  }
};
fs.writeFileSync(path.join(out,'ledger.json'),JSON.stringify(ledger,null,2)+'\n');
fs.writeFileSync(path.join(out,'ledger.sha256'),`${sha256(Buffer.from(JSON.stringify(ledger)))}  ledger.json\n`);
console.log(JSON.stringify({candidate_authorized:ledger.candidate_authorized,status:result.status,bytes:result.bytes||0,item_count:result.item_count||0,body_sha256:result.body_sha256||null},null,2));
