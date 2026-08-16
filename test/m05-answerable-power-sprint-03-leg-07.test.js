#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildGlobalTideRequest, classifyFailure, executionContractFailures, parseCommonCrawlCatalogPayload, parseGdeltTocPayload, partitionRoutesByGlobalTides } from '../tools/lib/m04g-source-ecology-v2.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(args)=>{const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(result.status!==0){console.error(result.stdout);console.error(result.stderr);throw new Error(`${args.join(' ')} failed`)}return result.stdout};
run(['tools/build-m05-answerable-power-sprint-03-leg-07.mjs']);
run(['tools/validate-m05-answerable-power-sprint-03-leg-07.mjs']);
run(['tools/run-m04g-source-ecology-v2.mjs','--discover-only','--output-dir','build/m04g-source-ecology-v2-test']);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/core-thesis/answerable-power/sprint-03-leg-07.json'),'utf8'));
const policy=JSON.parse(fs.readFileSync(path.join(root,'data/project/m04g-source-ecology-v2-policy.json'),'utf8'));
const discovery=JSON.parse(fs.readFileSync(path.join(root,'build/m04g-source-ecology-v2-test/m04g-source-ecology-v2-discovery.json'),'utf8'));
assert.equal(report.counts.routes,96);
assert.equal(report.counts.basins,12);
assert.deepEqual(report.counts.routes_per_basin,[8]);
assert.equal(report.counts.repair_legs,5);
assert.equal(report.counts.regression_domains,5);
assert.equal(discovery.routes.length,96);
assert.equal(discovery.basins.length,12);
const commonCrawlHostPolicy=policy.host_policies.find((row)=>row.match==='index.commoncrawl.org');
assert.deepEqual(commonCrawlHostPolicy,{match:'index.commoncrawl.org',max_concurrency:1,minimum_interval_ms:1500,timeout_ms:30000,attempts:1});
const commonCrawlFallback=policy.host_fallbacks.find((row)=>row.match==='index.commoncrawl.org');
assert.deepEqual(commonCrawlFallback,{match:'index.commoncrawl.org',fallbacks:[{url:'https://index.commoncrawl.org/collinfo.json',method:'GET',source_class:'public_index_catalog',max_bytes:524288}]});
const gdeltTide=policy.global_tides.find((row)=>row.tide_id==='GDELT-GLOBAL-SERIAL');
assert.deepEqual(gdeltTide,{
  tide_id:'GDELT-GLOBAL-SERIAL',
  match:'gdelt',
  mode:'globally_serialized',
  expected_routes:12,
  expected_basins:12,
  max_concurrency:1,
  minimum_interval_ms:6500,
  timeout_ms:30000,
  heartbeat_minutes:15,
  publication_guard_minutes:15,
  heartbeat_offset_minutes:1,
  url_template:'https://storage.googleapis.com/data.gdeltproject.org/gdeltv5/weblegacy/ngrams/{timestamp}.toc.json.gz',
  record_format:'jsonl_gzip',
  minimum_locator_records:1,
  max_compressed_bytes:16777216,
  max_decompressed_bytes:67108864,
  deduplicate_identical_requests:true,
  route_results_back_to_original_basins:true,
  fallback_to_original_routes:false,
  promotion_ceiling:'locator_only'
});

const commonCrawlTide=policy.global_tides.find((row)=>row.tide_id==='COMMON-CRAWL-GLOBAL-SERIAL');
assert.deepEqual(commonCrawlTide,{
  "tide_id": "COMMON-CRAWL-GLOBAL-SERIAL",
  "match": "index.commoncrawl.org",
  "mode": "globally_serialized",
  "expected_routes": 12,
  "expected_basins": 12,
  "max_concurrency": 1,
  "minimum_interval_ms": 1500,
  "timeout_ms": 30000,
  "url": "https://index.commoncrawl.org/collinfo.json",
  "record_format": "json_catalog",
  "minimum_locator_records": 1,
  "max_compressed_bytes": 524288,
  "max_decompressed_bytes": 2097152,
  "deduplicate_identical_requests": true,
  "route_results_back_to_original_basins": true,
  "fallback_to_original_routes": false,
  "promotion_ceiling": "locator_only"
});
const commonCrawlRequest=buildGlobalTideRequest(commonCrawlTide,Date.parse('2026-08-16T04:24:48Z'));
assert.equal(commonCrawlRequest.url,'https://index.commoncrawl.org/collinfo.json');
assert.equal(commonCrawlRequest.target_minute_utc,null);
const catalogFixture=Buffer.from(JSON.stringify([{id:'CC-MAIN-2026-30',name:'July 2026 Index','cdx-api':'https://index.commoncrawl.org/CC-MAIN-2026-30-index','timegate-api':'https://index.commoncrawl.org/CC-MAIN-2026-30','index':'https://data.commoncrawl.org/cc-index/table/cc-main/warc/cdx=CC-MAIN-2026-30'}]));
const parsedCatalog=parseCommonCrawlCatalogPayload(catalogFixture,commonCrawlTide);
assert.equal(parsedCatalog.records.length,1);
assert.equal(parsedCatalog.records[0].id,'CC-MAIN-2026-30');

const tidePartition=partitionRoutesByGlobalTides(discovery.routes,policy);
assert.equal(tidePartition.tides.length,2);
const gdeltAssignment=tidePartition.tides.find((row)=>row.tide.tide_id==='GDELT-GLOBAL-SERIAL');
const commonCrawlAssignment=tidePartition.tides.find((row)=>row.tide.tide_id==='COMMON-CRAWL-GLOBAL-SERIAL');
assert.equal(gdeltAssignment.routes.length,12);
assert.equal(commonCrawlAssignment.routes.length,12);
assert.equal(new Set(gdeltAssignment.routes.map((row)=>row.basin_id)).size,12);
assert.equal(new Set(commonCrawlAssignment.routes.map((row)=>row.basin_id)).size,12);
assert.equal(tidePartition.ordinary_routes.length,72);
assert.equal(Object.keys(tidePartition.route_assignments).length,24);
const fixedTideRequest=buildGlobalTideRequest(gdeltTide,Date.parse('2026-08-16T04:24:48Z'));
assert.equal(fixedTideRequest.target_minute_utc,'2026-08-16T04:01:00.000Z');
assert.equal(fixedTideRequest.target_age_seconds,1428);
assert.equal(fixedTideRequest.heartbeat_minutes,15);
assert.equal(fixedTideRequest.publication_guard_minutes,15);
assert.equal(fixedTideRequest.heartbeat_offset_minutes,1);
assert.equal(fixedTideRequest.url,'https://storage.googleapis.com/data.gdeltproject.org/gdeltv5/weblegacy/ngrams/20260816040100.toc.json.gz');
const fixtureRecords=[
  {ID:1,date:'2026-08-16T03:46:00.000Z',lang:'en',title:'Fixture one',url:'https://example.test/one'},
  {ID:2,date:'2026-08-16T03:46:00.000Z',lang:'fr',title:'Fixture two',url:'https://example.test/two'}
];
const fixtureCompressed=zlib.gzipSync(Buffer.from(`${fixtureRecords.map((row)=>JSON.stringify(row)).join('\n')}\n`,'utf8'));
const parsedFixture=parseGdeltTocPayload(fixtureCompressed,gdeltTide);
assert.equal(parsedFixture.records.length,2);
assert.deepEqual(parsedFixture.records,fixtureRecords);
assert.equal(parsedFixture.decompressed.toString('utf8'),`${fixtureRecords.map((row)=>JSON.stringify(row)).join('\n')}\n`);
assert.throws(()=>parseGdeltTocPayload(zlib.gzipSync(Buffer.from('{"ID":1,"date":"2026-08-16T03:46:00.000Z","url":"not-a-url"}\n')),gdeltTide),/valid locator records/u);
assert.ok(discovery.routes.some((row)=>/gdelt/i.test(row.url)||/gdelt/i.test(row.route_id)));
assert.equal(classifyFailure({status:307,redirect_unresolved:true}),'redirect_unresolved');
assert.equal(classifyFailure({status:307}),'redirect_unresolved');
assert.equal(classifyFailure({status:310,error:new Error('redirect limit exceeded')}),'redirect_unresolved');
assert.equal(classifyFailure({status:403}),'access_blocked');
assert.equal(classifyFailure({status:429}),'rate_limited');
assert.deepEqual(executionContractFailures({execution_complete:true,unclassified_failures:0,coverage_healthy:false}),[]);
assert.deepEqual(executionContractFailures({execution_complete:true,unclassified_failures:0,coverage_healthy:true}),[]);
assert.deepEqual(executionContractFailures({execution_complete:false,unclassified_failures:0}),['the frozen 96-route orbit did not complete']);
assert.deepEqual(executionContractFailures({execution_complete:true,unclassified_failures:2}),['2 failures were not classified']);
assert.equal(report.current_result.live_v2_orbit_observed,false);
assert.equal(report.current_result.coverage_healthy,false);
assert.equal(report.current_result.composed_answer_observed,false);
assert.equal(report.current_result.works_standard_met,false);
assert.equal(report.boundaries.source_health_proves_evidentiary_sufficiency,false);
assert.equal(report.boundaries.source_health_proves_answer_effectiveness,false);

const officialFallbackCensusRepairs=[
  {
    "match": "u.ae",
    "fallbacks": [
      {
        "url": "https://u.ae/",
        "method": "GET",
        "source_class": "official_portal_large_document",
        "max_bytes": 2097152
      }
    ]
  },
  {
    "match": "congress.gov",
    "fallbacks": [
      {
        "url": "https://www.congress.gov/rss/most-viewed-bills.xml",
        "method": "GET",
        "source_class": "official_legislation_feed",
        "max_bytes": 524288
      }
    ]
  },
  {
    "match": "asean.org",
    "fallbacks": [
      {
        "url": "https://asean.org/feed/",
        "method": "GET",
        "source_class": "official_feed",
        "max_bytes": 1048576
      }
    ]
  },
  {
    "match": "kenyalaw.org",
    "fallbacks": [
      {
        "url": "https://new.kenyalaw.org/",
        "method": "GET",
        "source_class": "official_legal_repository_replacement",
        "max_bytes": 2097152
      }
    ]
  },
  {
    "match": "echr.coe.int",
    "fallbacks": [
      {
        "url": "https://hudoc.echr.coe.int/app/query/results?query=contentsitename%3AECHR&select=itemid%2Cdocname%2Cdocumentcollectionid2&sort=&start=0&length=10",
        "method": "GET",
        "source_class": "official_case_law_api",
        "max_bytes": 2097152
      }
    ]
  },
  {
    "match": "mercosur.int",
    "fallbacks": [
      {
        "url": "https://www.mercosur.int/feed/",
        "method": "GET",
        "source_class": "official_feed",
        "max_bytes": 1048576
      }
    ]
  },
  {
    "match": "regulations.gov",
    "fallbacks": [
      {
        "url": "https://api.regulations.gov/v4/documents?filter%5BsearchTerm%5D=artificial%20intelligence&page%5Bsize%5D=5&api_key=DEMO_KEY",
        "method": "GET",
        "source_class": "official_regulatory_api",
        "max_bytes": 2097152
      }
    ]
  },
  {
    "match": "austlii.edu.au",
    "fallbacks": [
      {
        "url": "https://www.legislation.gov.au/",
        "method": "GET",
        "source_class": "official_legislation_repository_replacement",
        "max_bytes": 2097152
      }
    ]
  }
];
assert.ok(officialFallbackCensusRepairs.length>=6);
assert.ok(officialFallbackCensusRepairs.some((row)=>row.match==='u.ae'));
assert.equal(officialFallbackCensusRepairs.some((row)=>row.match==='unescwa.org'),false);
for(const expectedFallback of officialFallbackCensusRepairs){
  assert.deepEqual(policy.host_fallbacks.find((row)=>row.match===expectedFallback.match),expectedFallback);
}

console.log('m05-answerable-power-sprint-03-leg-07.test: OK');
