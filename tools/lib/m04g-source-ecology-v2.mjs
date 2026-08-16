import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const URL_KEYS=['url','primary_url','request_url','endpoint','href'];
const ID_KEYS=['poll_id','route_id','source_route_id','source_id','id'];
const BASIN_KEYS=['basin_id','geographic_basin_id','region_id','basin','region'];
const CLASS_KEYS=['hydrology_class','source_class','route_class','evidence_class','class'];

export const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
export const sha256=(value)=>crypto.createHash('sha256').update(value).digest('hex');

const isObject=(value)=>value&&typeof value==='object'&&!Array.isArray(value);
const readJson=(file)=>JSON.parse(fs.readFileSync(file,'utf8'));

export function walkFiles(root, predicate=(file)=>file.endsWith('.json')){
  const files=[];
  const visit=(dir)=>{
    if(!fs.existsSync(dir))return;
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const full=path.join(dir,entry.name);
      if(entry.isDirectory())visit(full);
      else if(predicate(full))files.push(full);
    }
  };
  visit(root);
  return files.sort();
}

function firstString(object, keys){
  for(const key of keys){
    const value=object?.[key];
    if(typeof value==='string'&&value.trim())return value.trim();
  }
  return null;
}

function findUrl(object, depth=0){
  if(!isObject(object)||depth>3)return null;
  const direct=firstString(object,URL_KEYS);
  if(direct&&/^https?:\/\//i.test(direct))return direct;
  for(const key of ['request','poll','target','source','endpoint','locator']){
    const nested=object[key];
    const found=findUrl(nested,depth+1);
    if(found)return found;
  }
  return null;
}

function inferBasin(object, fallbackText=''){
  const direct=firstString(object,BASIN_KEYS);
  if(direct)return direct;
  const text=`${fallbackText} ${JSON.stringify(object)}`;
  const match=text.match(/\bG(0[1-9]|1[0-2])(?:[-_A-Z]|\b)/i);
  return match?`G${match[1]}`:null;
}

function inferClass(object){
  const direct=firstString(object,CLASS_KEYS);
  if(direct)return direct;
  const text=JSON.stringify(object).toLowerCase();
  if(text.includes('freshwater'))return 'freshwater';
  if(text.includes('ocean'))return 'ocean_discovery';
  if(text.includes('aquifer')||text.includes('archive'))return 'archival_aquifer';
  if(text.includes('direct_voice'))return 'direct_voice';
  if(text.includes('official'))return 'freshwater';
  return 'unclassified';
}

function normalizeMethod(value){
  const method=String(value||'GET').toUpperCase();
  return method==='HEAD'?'HEAD':'GET';
}

function candidateRoute(object, context){
  if(!isObject(object))return null;
  const url=findUrl(object);
  if(!url)return null;
  const id=firstString(object,ID_KEYS)||`AUTO-${sha256(`${context.file}:${context.arrayPath}:${context.index}:${url}`).slice(0,16)}`;
  const basin=inferBasin(object,`${context.file} ${context.arrayPath}`);
  const hydrologyClass=inferClass(object);
  const maxBytes=Number(object.max_bytes||object.maxBytes||object.response_limit_bytes||0)||null;
  const timeoutMs=Number(object.timeout_ms||object.timeoutMs||0)||null;
  const enabled=object.enabled!==false&&object.poll_enabled!==false&&object.automated!==false;
  return {
    route_id:id,
    basin_id:basin,
    hydrology_class:hydrologyClass,
    url,
    method:normalizeMethod(object.method||object.http_method),
    max_bytes:maxBytes,
    timeout_ms:timeoutMs,
    enabled,
    source_file:context.file,
    source_array_path:context.arrayPath,
    raw:object
  };
}

function collectArrays(value, file, cursor='$', result=[]){
  if(Array.isArray(value)){
    const routes=value.map((item,index)=>candidateRoute(item,{file,arrayPath:cursor,index})).filter(Boolean);
    if(routes.length)result.push({file,arrayPath:cursor,arrayLength:value.length,routes});
    value.forEach((item,index)=>collectArrays(item,file,`${cursor}[${index}]`,result));
  }else if(isObject(value)){
    for(const [key,item] of Object.entries(value))collectArrays(item,file,`${cursor}.${key}`,result);
  }
  return result;
}

function scoreArray(candidate){
  const pathText=`${candidate.file} ${candidate.arrayPath}`.toLowerCase();
  let score=0;
  if(candidate.arrayLength===96)score+=10000;
  score-=Math.abs(candidate.arrayLength-96)*20;
  if(/poll|allowlist|public/.test(pathText))score+=500;
  if(/m04g|global|circulation|hydrology/.test(pathText))score+=300;
  const basinCount=new Set(candidate.routes.map((row)=>row.basin_id).filter(Boolean)).size;
  score+=basinCount*40;
  const enabledCount=candidate.routes.filter((row)=>row.enabled).length;
  score+=enabledCount;
  return score;
}

export function discoverFrozenRoutes(root,{expectedRoutes=96,expectedBasins=12,expectedPerBasin=8}={}){
  const files=walkFiles(path.join(root,'data'),(file)=>file.endsWith('.json')&&/m04g|hydrolog|circulation/i.test(file));
  const candidates=[];
  for(const file of files){
    let json;
    try{json=readJson(file)}catch{continue}
    candidates.push(...collectArrays(json,path.relative(root,file)));
  }
  candidates.sort((a,b)=>scoreArray(b)-scoreArray(a));
  let selected=candidates.find((row)=>row.arrayLength===expectedRoutes&&row.routes.length===expectedRoutes);
  if(!selected){
    const grouped=new Map();
    for(const candidate of candidates.filter((row)=>row.arrayLength===expectedPerBasin&&row.routes.length===expectedPerBasin)){
      const key=candidate.file;
      if(!grouped.has(key))grouped.set(key,[]);
      grouped.get(key).push(candidate);
    }
    for(const [file,rows] of grouped){
      const basinRows=rows.filter((row)=>new Set(row.routes.map((route)=>route.basin_id).filter(Boolean)).size===1);
      const basins=new Set(basinRows.flatMap((row)=>row.routes.map((route)=>route.basin_id).filter(Boolean)));
      if(basinRows.length>=expectedBasins&&basins.size>=expectedBasins){
        const routes=basinRows.slice(0,expectedBasins).flatMap((row)=>row.routes);
        if(routes.length===expectedRoutes){selected={file,arrayPath:'combined-basin-arrays',arrayLength:expectedRoutes,routes};break}
      }
    }
  }
  if(!selected){
    const best=candidates[0];
    throw new Error(`Unable to discover frozen ${expectedRoutes}-route denominator; best candidate ${best?`${best.file}:${best.arrayPath} (${best.routes.length}/${best.arrayLength})`:'none'}`);
  }
  const routes=selected.routes.filter((row)=>row.enabled);
  if(routes.length!==expectedRoutes)throw new Error(`Frozen denominator drift: expected ${expectedRoutes} enabled routes, found ${routes.length}`);
  const ids=new Set(routes.map((row)=>row.route_id));
  if(ids.size!==expectedRoutes)throw new Error(`Route identity collision: ${ids.size}/${expectedRoutes} unique IDs`);
  const basins=new Map();
  for(const route of routes){
    if(!route.basin_id)throw new Error(`Missing basin for ${route.route_id}`);
    if(!basins.has(route.basin_id))basins.set(route.basin_id,[]);
    basins.get(route.basin_id).push(route);
  }
  if(basins.size!==expectedBasins)throw new Error(`Basin denominator drift: expected ${expectedBasins}, found ${basins.size}`);
  for(const [basin,rows] of basins){
    if(rows.length!==expectedPerBasin)throw new Error(`Basin ${basin} has ${rows.length} routes; expected ${expectedPerBasin}`);
  }
  return {
    registry_file:selected.file,
    registry_path:selected.arrayPath,
    routes:routes.sort((a,b)=>a.basin_id.localeCompare(b.basin_id)||a.route_id.localeCompare(b.route_id)),
    basins:[...basins].sort(([a],[b])=>a.localeCompare(b)).map(([basin_id,rows])=>({basin_id,route_ids:rows.map((row)=>row.route_id).sort()}))
  };
}

function hostMatches(host, match){
  return host.toLowerCase().includes(String(match).toLowerCase());
}

export function routePolicy(route, policy){
  const host=new URL(route.url).hostname;
  const hostPolicy=policy.host_policies.find((row)=>hostMatches(host,row.match))||{};
  const fallbackPolicy=policy.host_fallbacks.find((row)=>hostMatches(host,row.match));
  return {
    host,
    attempts:hostPolicy.attempts||policy.execution.attempts,
    timeout_ms:route.timeout_ms||hostPolicy.timeout_ms||policy.execution.default_timeout_ms,
    max_bytes:route.max_bytes||policy.execution.default_max_bytes,
    minimum_interval_ms:hostPolicy.minimum_interval_ms||policy.execution.default_host_interval_ms,
    max_concurrency:hostPolicy.max_concurrency||policy.execution.default_host_concurrency,
    fallbacks:fallbackPolicy?.fallbacks||[],
    manual_aquifer_after_failure:Boolean(fallbackPolicy?.manual_aquifer_after_failure)
  };
}

export function classifyFailure({status,error,oversized,redirectUrl,redirect_unresolved}){
  const message=String(error?.message||error||'').toLowerCase();
  const code=String(error?.cause?.code||error?.code||'').toUpperCase();
  if(oversized)return 'oversized_response';
  if(status===429)return 'rate_limited';
  if(status===401)return 'authentication_required';
  if(status===403)return 'access_blocked';
  if(status>=500)return 'upstream_failure';
  if(redirect_unresolved||redirectUrl||(status>=300&&status<400))return 'redirect_unresolved';
  if(code==='ENOTFOUND'||code==='EAI_AGAIN'||message.includes('getaddrinfo'))return 'dns_failure';
  if(code.includes('CERT')||message.includes('certificate')||message.includes('tls'))return 'tls_failure';
  if(message.includes('abort')||message.includes('timeout'))return 'timeout';
  if(message.includes('redirect'))return 'redirect_unresolved';
  if(message.includes('fetch failed')||message.includes('socket')||message.includes('connect'))return 'transport_failure';
  return 'unclassified';
}

export function executionContractFailures(summary){
  const failures=[];
  if(summary?.execution_complete!==true)failures.push('the frozen 96-route orbit did not complete');
  if(summary?.unclassified_failures!==0)failures.push(`${summary?.unclassified_failures??'unknown'} failures were not classified`);
  return failures;
}


function routeMatchesGlobalTide(route,tide){
  const match=String(tide?.match||'').trim().toLowerCase();
  if(!match)return false;
  return `${route.route_id} ${route.url}`.toLowerCase().includes(match);
}

export function partitionRoutesByGlobalTides(routes,policy){
  const assigned=new Map();
  const tides=[];
  for(const tide of policy.global_tides||[]){
    if(tide.mode!=='globally_serialized')continue;
    const matched=routes.filter((route)=>routeMatchesGlobalTide(route,tide));
    if(!matched.length)continue;
    const duplicate=matched.find((route)=>assigned.has(route.route_id));
    if(duplicate)throw new Error(`Global tide overlap for ${duplicate.route_id}: ${assigned.get(duplicate.route_id)} and ${tide.tide_id}`);
    const expectedRoutes=Number(tide.expected_routes||matched.length);
    if(matched.length!==expectedRoutes)throw new Error(`Global tide ${tide.tide_id} matched ${matched.length} routes; expected ${expectedRoutes}`);
    const basins=new Set(matched.map((route)=>route.basin_id));
    const expectedBasins=Number(tide.expected_basins||basins.size);
    if(basins.size!==expectedBasins)throw new Error(`Global tide ${tide.tide_id} matched ${basins.size} basins; expected ${expectedBasins}`);
    if(tide.route_results_back_to_original_basins!==true)throw new Error(`Global tide ${tide.tide_id} must route results back to the original basins`);
    if(tide.fallback_to_original_routes!==false)throw new Error(`Global tide ${tide.tide_id} must explicitly refuse basin-specific fallback requests`);
    const ceiling=String(tide.promotion_ceiling||'locator_only');
    for(const route of matched){
      if(route.raw?.promotion_ceiling!==ceiling)throw new Error(`Global tide ${tide.tide_id} would change the promotion ceiling for ${route.route_id}`);
      assigned.set(route.route_id,tide.tide_id);
    }
    tides.push({tide,routes:matched});
  }
  return {
    tides,
    ordinary_routes:routes.filter((route)=>!assigned.has(route.route_id)),
    route_assignments:Object.fromEntries([...assigned].sort(([a],[b])=>a.localeCompare(b)))
  };
}

const pad2=(value)=>String(value).padStart(2,'0');

export function buildGlobalTideRequest(tide,nowMs=Date.now()){
  const format=String(tide.record_format||'');
  if(format==='json_catalog'){
    const url=String(tide.url||'');
    if(!/^https:\/\//u.test(url))throw new Error(`Global tide ${tide.tide_id} requires an HTTPS catalog URL`);
    return {tide_id:tide.tide_id,target_minute_utc:null,target_age_seconds:null,heartbeat_minutes:null,publication_guard_minutes:null,heartbeat_offset_minutes:null,timestamp:null,url,method:'GET'};
  }
  if(format!=='jsonl_gzip')throw new Error(`Unsupported global tide format for ${tide.tide_id}: ${format}`);
  const template=String(tide.url_template||'');
  if(!template.includes('{timestamp}'))throw new Error(`Global tide ${tide.tide_id} URL template must contain {timestamp}`);
  const heartbeatMinutes=Number(tide.heartbeat_minutes||0);
  const publicationGuardMinutes=Number(tide.publication_guard_minutes||0);
  const heartbeatOffsetMinutes=Number(tide.heartbeat_offset_minutes||0);
  if(!Number.isInteger(heartbeatMinutes)||heartbeatMinutes<=0)throw new Error(`Global tide ${tide.tide_id} has an invalid heartbeat_minutes value`);
  if(!Number.isInteger(publicationGuardMinutes)||publicationGuardMinutes<heartbeatMinutes)throw new Error(`Global tide ${tide.tide_id} publication_guard_minutes must cover at least one heartbeat`);
  if(!Number.isInteger(heartbeatOffsetMinutes)||heartbeatOffsetMinutes<0||heartbeatOffsetMinutes>=heartbeatMinutes)throw new Error(`Global tide ${tide.tide_id} has an invalid heartbeat_offset_minutes value`);
  const clock=Number(nowMs);
  if(!Number.isFinite(clock))throw new Error(`Global tide ${tide.tide_id} received an invalid clock value`);
  const heartbeatMs=heartbeatMinutes*60_000;
  const guardedMs=clock-publicationGuardMinutes*60_000;
  const heartbeatStartMs=Math.floor(guardedMs/heartbeatMs)*heartbeatMs;
  const target=new Date(heartbeatStartMs+heartbeatOffsetMinutes*60_000);
  target.setUTCSeconds(0,0);
  const timestamp=`${target.getUTCFullYear()}${pad2(target.getUTCMonth()+1)}${pad2(target.getUTCDate())}${pad2(target.getUTCHours())}${pad2(target.getUTCMinutes())}00`;
  return {tide_id:tide.tide_id,target_minute_utc:target.toISOString(),target_age_seconds:Math.floor((clock-target.getTime())/1000),heartbeat_minutes:heartbeatMinutes,publication_guard_minutes:publicationGuardMinutes,heartbeat_offset_minutes:heartbeatOffsetMinutes,timestamp,url:template.replace('{timestamp}',timestamp),method:'GET'};
}

function globalTideError(message,failure='parse_failure'){
  const error=new Error(message);
  error.failure=failure;
  return error;
}

export function parseGdeltTocPayload(compressed,tide){
  if(!Buffer.isBuffer(compressed)||!compressed.length)throw globalTideError('GDELT global tide returned no compressed content');
  const maxDecompressedBytes=Number(tide.max_decompressed_bytes||67_108_864);
  let decompressed;
  try{
    decompressed=zlib.gunzipSync(compressed,{maxOutputLength:maxDecompressedBytes});
  }catch(error){
    const failure=String(error?.code||'').includes('BUFFER_TOO_LARGE')?'oversized_response':'parse_failure';
    throw globalTideError(`GDELT global tide GZIP decode failed: ${error?.message||error}`,failure);
  }
  const lines=decompressed.toString('utf8').split(/\r?\n/u).filter(Boolean);
  let records;
  try{records=lines.map((line)=>JSON.parse(line))}
  catch(error){throw globalTideError(`GDELT global tide JSONL parse failed: ${error?.message||error}`)}
  const validRecords=records.filter((record)=>Number.isInteger(record?.ID)&&record.ID>0&&typeof record?.date==='string'&&typeof record?.url==='string'&&/^https?:\/\//iu.test(record.url));
  const minimumRecords=Number(tide.minimum_locator_records||1);
  if(validRecords.length<minimumRecords)throw globalTideError(`GDELT global tide contained ${validRecords.length} valid locator records; required ${minimumRecords}`);
  if(validRecords.length!==records.length)throw globalTideError(`GDELT global tide contained ${validRecords.length}/${records.length} valid locator records`);
  return {
    compressed_sha256:sha256(compressed),
    decompressed,
    decompressed_sha256:sha256(decompressed),
    records:validRecords
  };
}

export function parseCommonCrawlCatalogPayload(content,tide){
  if(!Buffer.isBuffer(content)||!content.length)throw globalTideError('Common Crawl global tide returned no catalog content');
  let records;
  try{records=JSON.parse(content.toString('utf8'))}catch(error){throw globalTideError(`Common Crawl catalog parse failed: ${error?.message||error}`)}
  const minimumRecords=Number(tide.minimum_locator_records||1);
  if(!Array.isArray(records)||records.length<minimumRecords)throw globalTideError(`Common Crawl catalog contained ${Array.isArray(records)?records.length:0} records; required ${minimumRecords}`);
  const valid=records.filter((record)=>typeof record?.id==='string'&&record.id&&[record['cdx-api'],record['timegate-api'],record.index].some((value)=>typeof value==='string'&&/^https?:\/\//u.test(value)));
  if(valid.length!==records.length)throw globalTideError(`Common Crawl catalog contained ${valid.length}/${records.length} valid records`);
  const normalized=Buffer.from(JSON.stringify(valid,null,2)+'\n','utf8');
  return {compressed_sha256:sha256(content),decompressed:normalized,decompressed_sha256:sha256(normalized),records:valid};
}
function parseGlobalTidePayload(content,tide){return tide.record_format==='json_catalog'?parseCommonCrawlCatalogPayload(content,tide):parseGdeltTocPayload(content,tide);}
function summarizeGlobalTideRecord(record){
  if(Number.isInteger(record?.ID))return {ID:record.ID,date:record.date,lang:record.lang||null,title:record.title||null,url:record.url};
  return {id:record?.id||null,name:record?.name||null,index:record?.index||null,cdx_api:record?.['cdx-api']||null,timegate_api:record?.['timegate-api']||null};
}

function globalTideFileStem(tideId){
  return String(tideId).toLowerCase().replace(/[^a-z0-9]+/gu,'-').replace(/^-|-$/gu,'');
}

async function executeGlobalTide(assignment,policy,gate,nowMs){
  const {tide,routes}=assignment;
  const request=buildGlobalTideRequest(tide,nowMs);
  const host=new URL(request.url).hostname;
  const timeoutMs=Number(tide.timeout_ms||policy.execution.default_timeout_ms);
  const maxCompressedBytes=Number(tide.max_compressed_bytes||policy.execution.default_max_bytes);
  const minimumIntervalMs=Number(tide.minimum_interval_ms||policy.execution.default_host_interval_ms);
  const started_at=new Date().toISOString();
  const transport=await gate.run(host,minimumIntervalMs,()=>fetchWithRedirects(request.url,{method:'GET',timeoutMs,maxBytes:maxCompressedBytes,userAgent:'CliffordNumber-M04G-Global-Tide/1.0 (+https://github.com/BigBirdReturns/clifford-number)'}));
  let parsed=null;
  let failure=null;
  let parseError=null;
  if(!transport.ok)failure=transport.https_downgrade?'https_downgrade_refused':(transport.status===404?'upstream_failure':classifyFailure(transport));
  else{
    try{parsed=parseGlobalTidePayload(transport.body,tide)}
    catch(error){failure=error.failure||'parse_failure';parseError=String(error?.message||error)}
  }
  const success=Boolean(transport.ok&&parsed);
  const stem=globalTideFileStem(tide.tide_id);
  const artifactFiles=tide.record_format==='json_catalog'?{compressed:`m04g-source-ecology-v2-${stem}-catalog.json`,decompressed:`m04g-source-ecology-v2-${stem}-catalog.normalized.json`}:{compressed:`m04g-source-ecology-v2-${stem}.json.gz`,decompressed:`m04g-source-ecology-v2-${stem}.json`};
  const attempt={attempt:1,url:request.url,method:'GET',started_at,status:transport.status,final_url:transport.final_url,failure,metadata_only:false,bytes:transport.body?.length||0,global_tide_id:tide.tide_id};
  const summary=parsed?JSON.stringify(parsed.records.slice(0,3).map(summarizeGlobalTideRecord)).slice(0,600):null;
  const shared={
    success,
    content_success:success,
    metadata_only:false,
    status:transport.status,
    requested_url:request.url,
    final_url:transport.final_url,
    method:'GET',
    headers:transport.headers,
    bytes:transport.body?.length||0,
    content_sha256:parsed?.compressed_sha256||null,
    decompressed_bytes:parsed?.decompressed.length||0,
    decompressed_sha256:parsed?.decompressed_sha256||null,
    locator_record_count:parsed?.records.length||0,
    summary,
    failure,
    parse_error:parseError,
    attempts:[attempt],
    global_tide_id:tide.tide_id,
    global_tide_target_minute_utc:request.target_minute_utc,
    global_tide_target_age_seconds:request.target_age_seconds,
    global_tide_heartbeat_minutes:request.heartbeat_minutes,
    global_tide_publication_guard_minutes:request.publication_guard_minutes,
    global_tide_heartbeat_offset_minutes:request.heartbeat_offset_minutes,
    global_tide_artifacts:artifactFiles
  };
  const observations=routes.map((route)=>{
    const result={...shared,original_query:new URL(route.url).searchParams.get('query'),deterministic_routing_key:`${route.basin_id}:${route.route_id}`};
    if(success){
      return {route_id:route.route_id,basin_id:route.basin_id,hydrology_class:route.hydrology_class,original_url:route.url,route_success:true,content_success:true,metadata_only:false,fallback_used:false,selected_candidate:0,global_tide_used:true,global_tide_id:tide.tide_id,result,candidate_results:[result]};
    }
    return {route_id:route.route_id,basin_id:route.basin_id,hydrology_class:route.hydrology_class,original_url:route.url,route_success:false,content_success:false,metadata_only:false,fallback_used:false,global_tide_used:true,global_tide_id:tide.tide_id,failure:failure||'unclassified',candidate_results:[result]};
  });
  const receipt={
    tide_id:tide.tide_id,
    mode:tide.mode,
    match:tide.match,
    network_request_count:1,
    fallback_route_request_count:0,
    route_ids:routes.map((route)=>route.route_id),
    basin_ids:routes.map((route)=>route.basin_id),
    target_minute_utc:request.target_minute_utc,
    target_age_seconds:request.target_age_seconds,
    heartbeat_minutes:request.heartbeat_minutes,
    publication_guard_minutes:request.publication_guard_minutes,
    heartbeat_offset_minutes:request.heartbeat_offset_minutes,
    requested_url:request.url,
    status:transport.status,
    final_url:transport.final_url,
    headers:transport.headers,
    compressed_bytes:transport.body?.length||0,
    compressed_sha256:parsed?.compressed_sha256||null,
    decompressed_bytes:parsed?.decompressed.length||0,
    decompressed_sha256:parsed?.decompressed_sha256||null,
    locator_record_count:parsed?.records.length||0,
    route_successes:observations.filter((row)=>row.route_success).length,
    content_successes:observations.filter((row)=>row.content_success).length,
    success,
    failure,
    parse_error:parseError,
    artifacts:artifactFiles
  };
  return {observations,receipt,compressed:parsed?transport.body:Buffer.alloc(0),decompressed:parsed?.decompressed||Buffer.alloc(0)};
}

async function executeGlobalTides(assignments,policy,gate,nowMs){
  const observations=[];
  const receipts=[];
  const artifacts=[];
  for(const assignment of assignments){
    const result=await executeGlobalTide(assignment,policy,gate,nowMs);
    observations.push(...result.observations);
    receipts.push(result.receipt);
    artifacts.push({receipt:result.receipt,compressed:result.compressed,decompressed:result.decompressed});
  }
  return {observations,receipts,artifacts};
}

class HostGate{
  constructor(){this.chains=new Map();this.lastStart=new Map()}
  async run(host,minimumIntervalMs,operation){
    const prior=this.chains.get(host)||Promise.resolve();
    let release;
    const next=new Promise((resolve)=>{release=resolve});
    this.chains.set(host,prior.then(()=>next));
    await prior;
    try{
      const last=this.lastStart.get(host)||0;
      const wait=Math.max(0,minimumIntervalMs-(Date.now()-last));
      if(wait)await sleep(wait);
      this.lastStart.set(host,Date.now());
      return await operation();
    }finally{
      release();
      if(this.chains.get(host)===next)this.chains.delete(host);
    }
  }
}

async function readBounded(response,maxBytes){
  if(!response.body)return Buffer.alloc(0);
  const chunks=[];
  let total=0;
  for await(const chunk of response.body){
    const buffer=Buffer.from(chunk);
    total+=buffer.length;
    if(total>maxBytes){
      try{await response.body.cancel()}catch{}
      const error=new Error(`response exceeded ${maxBytes} bytes`);
      error.oversized=true;
      throw error;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

async function fetchWithRedirects(url,{method,timeoutMs,maxBytes,userAgent}){
  let current=url;
  for(let redirectCount=0;redirectCount<=5;redirectCount++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(new Error(`timeout after ${timeoutMs}ms`)),timeoutMs);
    try{
      const response=await fetch(current,{method,redirect:'manual',signal:controller.signal,headers:{'user-agent':userAgent,'accept':'application/gzip,application/octet-stream,text/html,application/json,application/xml,text/xml,text/plain,application/pdf,*/*;q=0.1'}});
      if(response.status>=300&&response.status<400){
        const location=response.headers.get('location');
        if(!location)return {ok:false,status:response.status,final_url:current,redirect_unresolved:true,headers:Object.fromEntries(response.headers)};
        const next=new URL(location,current).toString();
        if(current.startsWith('https://')&&next.startsWith('http://'))return {ok:false,status:response.status,final_url:current,redirect_url:next,https_downgrade:true,headers:Object.fromEntries(response.headers)};
        current=next;
        continue;
      }
      const headers=Object.fromEntries(response.headers);
      if(method==='HEAD')return {ok:response.ok,status:response.status,final_url:current,headers,body:Buffer.alloc(0),metadata_only:true};
      let body;
      try{body=await readBounded(response,maxBytes)}catch(error){return {ok:false,status:response.status,final_url:current,headers,error,oversized:Boolean(error.oversized)}}
      return {ok:response.ok,status:response.status,final_url:current,headers,body,metadata_only:false};
    }catch(error){
      return {ok:false,status:null,final_url:current,headers:{},error};
    }finally{clearTimeout(timer)}
  }
  return {ok:false,status:310,final_url:current,headers:{},error:new Error('redirect limit exceeded'),redirect_unresolved:true};
}

function retryDelay(policy,attempt,result){
  const retryAfter=result.headers?.['retry-after'];
  if(retryAfter&&policy.respect_retry_after!==false){
    const seconds=Number(retryAfter);
    if(Number.isFinite(seconds))return Math.min(seconds*1000,60000);
    const date=Date.parse(retryAfter);
    if(Number.isFinite(date))return Math.max(0,Math.min(date-Date.now(),60000));
  }
  return policy.execution.retry_backoff_ms[Math.min(attempt,policy.execution.retry_backoff_ms.length-1)]||5000;
}

function shouldRetry(result){
  return result.status===429||result.status>=500||!result.status||result.oversized===false&&classifyFailure(result)==='timeout';
}

function summarizeBody(body){
  if(!body?.length)return null;
  const text=body.toString('utf8').replace(/\s+/g,' ').trim();
  return text.slice(0,600);
}

async function executeCandidate(candidate,route,routeSpecific,policy,gate){
  const candidateUrl=candidate.url;
  const method=(candidate.method||route.method||'GET').toUpperCase();
  const host=new URL(candidateUrl).hostname;
  const maxBytes=candidate.max_bytes||routeSpecific.max_bytes;
  const timeoutMs=candidate.timeout_ms||routeSpecific.timeout_ms;
  const attempts=method==='HEAD'?1:routeSpecific.attempts;
  const attemptLedger=[];
  for(let attempt=0;attempt<attempts;attempt++){
    const started_at=new Date().toISOString();
    const result=await gate.run(host,routeSpecific.minimum_interval_ms,()=>fetchWithRedirects(candidateUrl,{method,timeoutMs,maxBytes,userAgent:'CliffordNumber-M04G/2.0 (+https://github.com/BigBirdReturns/clifford-number)'}));
    const failure=result.ok?null:(result.https_downgrade?'https_downgrade_refused':classifyFailure(result));
    attemptLedger.push({attempt:attempt+1,url:candidateUrl,method,started_at,status:result.status,final_url:result.final_url,failure,metadata_only:Boolean(result.metadata_only),bytes:result.body?.length||0});
    if(result.ok){
      return {success:true,content_success:method!=='HEAD'&&(result.body?.length||0)>0,metadata_only:method==='HEAD'||Boolean(result.metadata_only),status:result.status,requested_url:candidateUrl,final_url:result.final_url,method,headers:result.headers,bytes:result.body?.length||0,content_sha256:result.body?.length?sha256(result.body):null,summary:summarizeBody(result.body),attempts:attemptLedger};
    }
    if(attempt<attempts-1&&shouldRetry(result))await sleep(retryDelay(policy,attempt,result));
    else break;
  }
  const last=attemptLedger.at(-1);
  return {success:false,content_success:false,metadata_only:false,status:last?.status||null,requested_url:candidateUrl,final_url:last?.final_url||candidateUrl,method,failure:last?.failure||'unclassified',attempts:attemptLedger};
}

async function executeRoute(route,policy,gate){
  const specific=routePolicy(route,policy);
  const candidates=[{url:route.url,method:route.method,source_class:route.hydrology_class},...specific.fallbacks];
  const candidateResults=[];
  for(let index=0;index<candidates.length;index++){
    const candidate=candidates[index];
    const result=await executeCandidate(candidate,route,specific,policy,gate);
    candidateResults.push(result);
    if(result.success){
      return {
        route_id:route.route_id,
        basin_id:route.basin_id,
        hydrology_class:route.hydrology_class,
        original_url:route.url,
        route_success:true,
        content_success:result.content_success,
        metadata_only:result.metadata_only,
        fallback_used:index>0,
        selected_candidate:index,
        result,
        candidate_results:candidateResults
      };
    }
  }
  return {
    route_id:route.route_id,
    basin_id:route.basin_id,
    hydrology_class:route.hydrology_class,
    original_url:route.url,
    route_success:false,
    content_success:false,
    metadata_only:false,
    fallback_used:false,
    manual_aquifer_after_failure:specific.manual_aquifer_after_failure,
    failure:candidateResults.at(-1)?.failure||'unclassified',
    candidate_results:candidateResults
  };
}

async function mapLimit(items,limit,fn){
  const results=new Array(items.length);
  let cursor=0;
  const workers=Array.from({length:Math.min(limit,items.length)},async()=>{
    while(true){
      const index=cursor++;
      if(index>=items.length)return;
      results[index]=await fn(items[index],index);
    }
  });
  await Promise.all(workers);
  return results;
}

function isFreshwater(row){
  const value=String(row.hydrology_class||'').toLowerCase();
  return value.includes('freshwater')||value.includes('official')||value.includes('primary');
}
function isDiscoveryOrArchive(row){
  const value=String(row.hydrology_class||'').toLowerCase();
  return value.includes('ocean')||value.includes('discover')||value.includes('archive')||value.includes('aquifer');
}

export async function runSourceEcologyOrbit(root,policy,{outputDir,live=true,nowMs=Date.now()}={}){
  const discovery=discoverFrozenRoutes(root,{expectedRoutes:policy.denominator.expected_routes,expectedBasins:policy.denominator.expected_basins,expectedPerBasin:policy.denominator.expected_routes_per_basin});
  if(!live)return {discovery,policy};
  const gate=new HostGate();
  const partition=partitionRoutesByGlobalTides(discovery.routes,policy);
  const globalTideResult=await executeGlobalTides(partition.tides,policy,gate,nowMs);
  const ordinaryObservations=await mapLimit(partition.ordinary_routes,policy.execution.global_concurrency,(route)=>executeRoute(route,policy,gate));
  const observationMap=new Map([...globalTideResult.observations,...ordinaryObservations].map((row)=>[row.route_id,row]));
  const observations=discovery.routes.map((route)=>observationMap.get(route.route_id));
  if(observations.some((row)=>!row))throw new Error('Global tide partition did not return one observation for every frozen route');
  const byBasin=[];
  for(const basin of discovery.basins){
    const rows=observations.filter((row)=>row.basin_id===basin.basin_id);
    const routeSuccesses=rows.filter((row)=>row.route_success).length;
    const contentSuccesses=rows.filter((row)=>row.content_success).length;
    const freshwaterContent=rows.some((row)=>row.content_success&&isFreshwater(row));
    const discoveryOrArchiveContent=rows.some((row)=>row.content_success&&isDiscoveryOrArchive(row));
    const routeRate=routeSuccesses/rows.length;
    const contentRate=contentSuccesses/rows.length;
    const healthy=routeRate>=policy.health_contract.per_basin_route_success_rate&&contentRate>=policy.health_contract.per_basin_content_success_rate&&(!policy.health_contract.require_freshwater_content_per_basin||freshwaterContent)&&(!policy.health_contract.require_discovery_or_archive_content_per_basin||discoveryOrArchiveContent);
    byBasin.push({basin_id:basin.basin_id,selected:rows.length,route_successes:routeSuccesses,content_successes:contentSuccesses,metadata_only:rows.filter((row)=>row.metadata_only).length,failed:rows.filter((row)=>!row.route_success).length,route_success_rate:routeRate,content_success_rate:contentRate,freshwater_content:freshwaterContent,discovery_or_archive_content:discoveryOrArchiveContent,healthy});
  }
  const routeSuccesses=observations.filter((row)=>row.route_success).length;
  const contentSuccesses=observations.filter((row)=>row.content_success).length;
  const metadataOnly=observations.filter((row)=>row.metadata_only).length;
  const failures=observations.filter((row)=>!row.route_success);
  const failureCounts=failures.reduce((acc,row)=>{const key=row.failure||'unclassified';acc[key]=(acc[key]||0)+1;return acc},{});
  const summary={
    selected:observations.length,
    route_successes:routeSuccesses,
    content_successes:contentSuccesses,
    metadata_only:metadataOnly,
    failed:failures.length,
    route_success_rate:routeSuccesses/observations.length,
    content_success_rate:contentSuccesses/observations.length,
    healthy_basins:byBasin.filter((row)=>row.healthy).length,
    unclassified_failures:failureCounts.unclassified||0,
    execution_complete:observations.length===policy.denominator.expected_routes,
    route_healthy:routeSuccesses/observations.length>=policy.health_contract.global_route_success_rate,
    content_healthy:contentSuccesses/observations.length>=policy.health_contract.global_content_success_rate,
    coverage_healthy:false,
    evidentiary_sufficiency:false,
    answer_effectiveness:false
  };
  summary.coverage_healthy=summary.execution_complete&&summary.route_healthy&&summary.content_healthy&&summary.healthy_basins>=policy.health_contract.required_healthy_basins&&summary.unclassified_failures===0;
  const receiptCore={schema_version:'m04g-source-ecology-v2-orbit@1',generated_at:new Date().toISOString(),registry_file:discovery.registry_file,registry_path:discovery.registry_path,policy_sha256:sha256(JSON.stringify(policy)),route_ids:discovery.routes.map((row)=>row.route_id),summary,by_basin:byBasin,failure_counts:failureCounts,global_tides:globalTideResult.receipts};
  const receipt={...receiptCore,proof_sha256:sha256(JSON.stringify(receiptCore))};
  if(outputDir){
    fs.mkdirSync(outputDir,{recursive:true});
    fs.writeFileSync(path.join(outputDir,'m04g-source-ecology-v2-observations.json'),JSON.stringify(observations,null,2)+'\n');
    fs.writeFileSync(path.join(outputDir,'m04g-source-ecology-v2-failures.json'),JSON.stringify(failures,null,2)+'\n');
    fs.writeFileSync(path.join(outputDir,'m04g-source-ecology-v2-basin-health.json'),JSON.stringify(byBasin,null,2)+'\n');
    fs.writeFileSync(path.join(outputDir,'m04g-source-ecology-v2-global-tides.json'),JSON.stringify(globalTideResult.receipts,null,2)+'\n');
    for(const artifact of globalTideResult.artifacts){
      if(artifact.compressed.length)fs.writeFileSync(path.join(outputDir,artifact.receipt.artifacts.compressed),artifact.compressed);
      if(artifact.decompressed.length)fs.writeFileSync(path.join(outputDir,artifact.receipt.artifacts.decompressed),artifact.decompressed);
    }
    fs.writeFileSync(path.join(outputDir,'m04g-source-ecology-v2-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
    fs.writeFileSync(path.join(outputDir,'m04g-source-ecology-v2-proof.sha256'),`${receipt.proof_sha256}  m04g-source-ecology-v2-receipt.json\n`);
  }
  return {discovery,observations,failures,byBasin,summary,receipt,global_tides:globalTideResult.receipts};
}
