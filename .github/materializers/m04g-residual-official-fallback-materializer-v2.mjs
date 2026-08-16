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
  "  const fallbackPolicy=policy.host_fallbacks.find((row)=>hostMatches(host,row.match));\n",
  "  const fallbackPolicy=policy.host_fallbacks.find((row)=>hostMatches(host,row.match)&&(!Array.isArray(row.route_ids)||row.route_ids.includes(route.route_id)));\n",
  "route-bound fallback selection"
);
library=replaceOnce(
  library,
  "  const text=bytes.toString('utf8').trim();\n  const lower=text.toLowerCase();\n  const challenge=CHALLENGE_MARKERS.find((marker)=>lower.includes(marker));\n  if(challenge)return contentDecision(false,'challenge_or_access_page',`challenge marker: ${challenge}`);\n  if(/^[\\[{]/u.test(text)){\n",
  "  const text=bytes.toString('utf8').trim();\n  const htmlCandidate=contentType.includes('html')||(!contentType.includes('xml')&&/<html\\b/iu.test(text.slice(0,1000)));\n  if(!htmlCandidate){\n    const lower=text.toLowerCase();\n    const challenge=CHALLENGE_MARKERS.find((marker)=>lower.includes(marker));\n    if(challenge)return contentDecision(false,'challenge_or_access_page',`challenge marker: ${challenge}`);\n  }\n  if(/^[\\[{]/u.test(text)){\n",
  "HTML-aware challenge classification"
);
library=replaceOnce(
  library,
  "  if(contentType.includes('xml')||contentType.includes('rss')||/^<\\?xml\\b/iu.test(text)){\n",
  "  if(!htmlCandidate&&(contentType.includes('xml')||contentType.includes('rss')||/^<\\?xml\\b/iu.test(text))){\n",
  "XML classifier guard"
);
library=replaceOnce(
  library,
  "    if(!/<(?:rss|feed|channel|DataRoot|Law|urlset|sitemapindex|article|document)\\b/iu.test(text))return contentDecision(false,'parse_failure','XML response lacks a recognized substantive root');\n",
  "    if(!/<(?:rss|feed|channel|DataRoot|Law|NOTICE|urlset|sitemapindex|article|document)\\b/iu.test(text))return contentDecision(false,'parse_failure','XML response lacks a recognized substantive root');\n",
  "EUR-Lex NOTICE root admission"
);
library=replaceOnce(
  library,
  "  if(contentType.includes('html')||/<html\\b/iu.test(text.slice(0,1000))){\n",
  "  if(htmlCandidate){\n",
  "HTML classifier guard"
);
library=replaceOnce(
  library,
  "    const visible=visibleHtmlText(text);\n    if(/<iframe\\b/iu.test(text)&&visible.length<300)return contentDecision(false,'embedded_document_shell',`only ${visible.length} visible characters outside an embedded viewer`,null,visible.length);\n",
  "    const visible=visibleHtmlText(text);\n    const visibleChallenge=CHALLENGE_MARKERS.find((marker)=>`${title} ${visible}`.toLowerCase().includes(marker));\n    if(visibleChallenge)return contentDecision(false,'challenge_or_access_page',`visible challenge marker: ${visibleChallenge}`);\n    if(/<iframe\\b/iu.test(text)&&visible.length<300)return contentDecision(false,'embedded_document_shell',`only ${visible.length} visible characters outside an embedded viewer`,null,visible.length);\n",
  "visible-text challenge classification"
);
write(libraryPath,library);

const policyPath='data/project/m04g-source-ecology-v2-policy.json';
const policy=JSON.parse(read(policyPath));
const routeFallbacks=[
  {
    match:'oecd.org',
    route_ids:['M04G-GP005'],
    fallbacks:[{
      url:'https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI/.M.LI...AA...H?startPeriod=2025-01&dimensionAtObservation=AllDimensions&format=csvfilewithlabels',
      method:'GET',
      source_class:'official_oecd_sdmx_data',
      max_bytes:524288,
      timeout_ms:30000,
      allowed_host_suffixes:['oecd.org']
    }]
  },
  {
    match:'federalregister.gov',
    route_ids:['M04G-GP011'],
    fallbacks:[{
      url:'https://www.federalregister.gov/api/v1/documents.json?per_page=10&order=newest',
      method:'GET',
      source_class:'official_federal_register_api',
      max_bytes:524288,
      allowed_host_suffixes:['federalregister.gov']
    }]
  },
  {
    match:'regulations.gov',
    route_ids:['M04G-GP012'],
    fallbacks:[{
      url:'https://api.regulations.gov/v4/documents?filter%5BsearchTerm%5D=artificial%20intelligence&page%5Bsize%5D=5&api_key=DEMO_KEY',
      method:'GET',
      source_class:'official_regulatory_api',
      max_bytes:524288,
      allowed_host_suffixes:['regulations.gov']
    }]
  },
  {
    match:'usaspending.gov',
    route_ids:['M04G-GP014'],
    fallbacks:[{
      url:'https://api.usaspending.gov/api/v2/references/toptier_agencies/',
      method:'GET',
      source_class:'official_usaspending_api',
      max_bytes:524288,
      allowed_host_suffixes:['usaspending.gov']
    }]
  },
  {
    match:'eur-lex.europa.eu',
    route_ids:['M04G-GP027'],
    fallbacks:[{
      url:'https://eur-lex.europa.eu/legal-content/EN/TXT/XML/?uri=CELEX:32016R0679',
      method:'GET',
      source_class:'official_eur_lex_document_xml',
      max_bytes:2097152,
      timeout_ms:30000,
      allowed_host_suffixes:['europa.eu']
    }]
  },
  {
    match:'ec.europa.eu',
    route_ids:['M04G-GP032'],
    fallbacks:[{
      url:'https://commission.europa.eu/about/service-standards-and-principles/transparency/how-access-commission-documents_en',
      method:'GET',
      source_class:'official_commission_document_access_repository',
      max_bytes:2097152,
      timeout_ms:30000,
      allowed_host_suffixes:['europa.eu']
    }]
  },
  {
    match:'prozorro.gov.ua',
    route_ids:['M04G-GP047'],
    fallbacks:[{
      url:'https://public-api.prozorro.gov.ua/api/0/tenders?opt_fields=status,dateCreated,public_modified',
      method:'GET',
      source_class:'official_prozorro_public_api',
      max_bytes:524288,
      timeout_ms:30000,
      allowed_host_suffixes:['prozorro.gov.ua']
    }]
  },
  {
    match:'unescwa.org',
    route_ids:['M04G-GP051'],
    fallbacks:[{
      url:'https://documents.un.org/api/symbol/access?s=E%2FESCWA%2FEDID%2F2015%2F3&l=en&t=pdf',
      method:'GET',
      source_class:'official_un_document_pdf',
      max_bytes:12582912,
      timeout_ms:45000,
      allowed_host_suffixes:['un.org']
    }]
  },
  {
    match:'unescwa.org',
    route_ids:['M04G-GP056'],
    fallbacks:[{
      url:'https://documents.un.org/api/symbol/access?s=E%2FESCWA%2FCL3.SEP%2F2023%2F4&l=en&t=pdf',
      method:'GET',
      source_class:'official_un_document_pdf',
      max_bytes:12582912,
      timeout_ms:45000,
      allowed_host_suffixes:['un.org']
    }]
  },
  {
    match:'tenders.gov.au',
    route_ids:['M04G-GP093'],
    fallbacks:[{
      url:'https://www.data.gov.au/data/api/3/action/package_show?id=historical-australian-government-contract-data',
      method:'GET',
      source_class:'official_austender_procurement_dataset_api',
      max_bytes:524288,
      timeout_ms:30000,
      allowed_host_suffixes:['data.gov.au']
    }]
  }
];

const routeIds=routeFallbacks.flatMap((row)=>row.route_ids);
if(routeIds.length!==10||new Set(routeIds).size!==10)throw new Error('Residual fallback route identity collision');
for(const routeId of routeIds){
  if(policy.host_fallbacks.some((row)=>Array.isArray(row.route_ids)&&row.route_ids.includes(routeId)))throw new Error(`Route-bound fallback already exists for ${routeId}`);
}
policy.host_fallbacks=[...routeFallbacks,...policy.host_fallbacks];
write(policyPath,`${JSON.stringify(policy,null,2)}\n`);


const testPath='test/m05-answerable-power-sprint-03-leg-07.test.js';
let test=read(testPath);
const testAnchor="console.log('m05-answerable-power-sprint-03-leg-07.test: OK');";
const testReplacement="const routeBoundFallbacks=new Map(\n  policy.host_fallbacks\n    .filter((row)=>Array.isArray(row.route_ids))\n    .flatMap((row)=>row.route_ids.map((routeId)=>[routeId,row.fallbacks[0]]))\n);\nassert.equal(routeBoundFallbacks.size,10);\nassert.deepEqual(routeBoundFallbacks.get('M04G-GP005'),{\n  url:'https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI/.M.LI...AA...H?startPeriod=2025-01&dimensionAtObservation=AllDimensions&format=csvfilewithlabels',\n  method:'GET',source_class:'official_oecd_sdmx_data',max_bytes:524288,timeout_ms:30000,allowed_host_suffixes:['oecd.org']\n});\nassert.deepEqual(routeBoundFallbacks.get('M04G-GP011'),{\n  url:'https://www.federalregister.gov/api/v1/documents.json?per_page=10&order=newest',\n  method:'GET',source_class:'official_federal_register_api',max_bytes:524288,allowed_host_suffixes:['federalregister.gov']\n});\nassert.deepEqual(routeBoundFallbacks.get('M04G-GP012'),{\n  url:'https://api.regulations.gov/v4/documents?filter%5BsearchTerm%5D=artificial%20intelligence&page%5Bsize%5D=5&api_key=DEMO_KEY',\n  method:'GET',source_class:'official_regulatory_api',max_bytes:524288,allowed_host_suffixes:['regulations.gov']\n});\nassert.deepEqual(routeBoundFallbacks.get('M04G-GP014'),{\n  url:'https://api.usaspending.gov/api/v2/references/toptier_agencies/',\n  method:'GET',source_class:'official_usaspending_api',max_bytes:524288,allowed_host_suffixes:['usaspending.gov']\n});\nassert.deepEqual(routeBoundFallbacks.get('M04G-GP027'),{\n  url:'https://eur-lex.europa.eu/legal-content/EN/TXT/XML/?uri=CELEX:32016R0679',\n  method:'GET',source_class:'official_eur_lex_document_xml',max_bytes:2097152,timeout_ms:30000,allowed_host_suffixes:['europa.eu']\n});\nassert.deepEqual(routeBoundFallbacks.get('M04G-GP032'),{\n  url:'https://commission.europa.eu/about/service-standards-and-principles/transparency/how-access-commission-documents_en',\n  method:'GET',source_class:'official_commission_document_access_repository',max_bytes:2097152,timeout_ms:30000,allowed_host_suffixes:['europa.eu']\n});\nassert.deepEqual(routeBoundFallbacks.get('M04G-GP047'),{\n  url:'https://public-api.prozorro.gov.ua/api/0/tenders?opt_fields=status,dateCreated,public_modified',\n  method:'GET',source_class:'official_prozorro_public_api',max_bytes:524288,timeout_ms:30000,allowed_host_suffixes:['prozorro.gov.ua']\n});\nassert.deepEqual(routeBoundFallbacks.get('M04G-GP051'),{\n  url:'https://documents.un.org/api/symbol/access?s=E%2FESCWA%2FEDID%2F2015%2F3&l=en&t=pdf',\n  method:'GET',source_class:'official_un_document_pdf',max_bytes:12582912,timeout_ms:45000,allowed_host_suffixes:['un.org']\n});\nassert.deepEqual(routeBoundFallbacks.get('M04G-GP056'),{\n  url:'https://documents.un.org/api/symbol/access?s=E%2FESCWA%2FCL3.SEP%2F2023%2F4&l=en&t=pdf',\n  method:'GET',source_class:'official_un_document_pdf',max_bytes:12582912,timeout_ms:45000,allowed_host_suffixes:['un.org']\n});\nassert.deepEqual(routeBoundFallbacks.get('M04G-GP093'),{\n  url:'https://www.data.gov.au/data/api/3/action/package_show?id=historical-australian-government-contract-data',\n  method:'GET',source_class:'official_austender_procurement_dataset_api',max_bytes:524288,timeout_ms:30000,allowed_host_suffixes:['data.gov.au']\n});\nconst eurLexNotice=Buffer.from(`<?xml version=\"1.0\" encoding=\"UTF-8\"?><NOTICE><WORK><TITLE>${'Official regulation record. '.repeat(20)}</TITLE></WORK></NOTICE>`);\nassert.equal(classifyResponseBody(eurLexNotice,{'content-type':'text/xml; charset=utf-8'}).content_success,true);\nconst xmlPrologHtml=Buffer.from(`<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE html><html><head><title>National Archives</title></head><body><main>${'Official archival catalogue record. '.repeat(20)}</main></body></html>`);\nassert.equal(classifyResponseBody(xmlPrologHtml,{'content-type':'text/html; charset=utf-8'}).content_success,true);\nconst hiddenChallengeMarker=Buffer.from(`<html><head><title>Government Electronic Business System</title><script>const diagnostic='request blocked';</script></head><body><main>${'Official procurement opportunity record. '.repeat(20)}</main></body></html>`);\nassert.equal(classifyResponseBody(hiddenChallengeMarker,{'content-type':'text/html; charset=utf-8'}).content_success,true);\nconsole.log('m05-answerable-power-sprint-03-leg-07.test: OK');";
test=replaceOnce(test,testAnchor,testReplacement,'residual fallback regression assertions');
write(testPath,test);

console.log('m04g residual official fallback patch applied');
