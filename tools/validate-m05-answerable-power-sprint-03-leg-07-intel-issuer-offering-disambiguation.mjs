#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  INTEL_OFFERING_FRONTIER_ID as FRONTIER,
  INTEL_OFFERING_RECEIPT_ID as RECEIPT,
  INTEL_OFFERING_DOMAIN_ID as DOMAIN,
  INTEL_OFFERING_JURISDICTION as JURISDICTION,
  INTEL_OFFERING_ORDINARY_GATE as GATE,
  INTEL_OFFERING_SOURCE_IDS as SOURCE_IDS,
  INTEL_OFFERING_ROUTE_IDS as ROUTE_IDS,
  classifyIntelOfferingRecord,
  summarizeIntelIssuerOfferingDisambiguation as summarize
} from './lib/m05-answerable-power-sprint-03-leg-07-intel-issuer-offering-disambiguation.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolve=(name,fallback)=>path.resolve(root,process.env[name]||fallback);
const paths={
  acquisition:resolve('M05_INTEL_ISSUER_OFFERING_DISAMBIGUATION_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-issuer-offering-disambiguation.json'),
  monitor:resolve('M05_INTEL_REALIZATION_MONITOR_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-date-gate-monitor.json'),
  frontier:resolve('M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH','data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'),
  intel:resolve('M05_INTEL_RECEIPT_CANDIDATE_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json'),
  syri:resolve('M05_SYRI_SUBJECT_ACCESS_ACQUISITION_PATH','data/project/m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.json')
};
const raw=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,fs.readFileSync(p)]));
const data=Object.fromEntries(Object.entries(raw).map(([k,b])=>[k,JSON.parse(b.toString('utf8'))]));
const before=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,JSON.stringify(v)]));
const {acquisition:a,monitor,frontier,intel,syri}=data;
const fail=(m)=>{throw new Error(m)};
const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
const eq=(actual,expected,label)=>{if(!same(actual,expected))fail(`${label} drift`)};
const sha256=(v)=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const blob=(b)=>crypto.createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
const text=(v,n)=>typeof v==='string'&&v.trim().length>=n;

if(sha256(a)!=='b93c34411b7faff591a70c8e6c6c9e9053e2c3cb2f9d507a4dfd901f95a5e999')fail('adjudication semantic custody drift');
eq(
  [a.schema_version,a.object_class,a.program_id,a.sprint_id,a.leg_id,a.issue,a.as_of,a.status],
  ['m05-answerable-power-s03-l7-intel-issuer-offering-disambiguation@1','bounded_official_record_false_positive_adjudication','M-05','M05-SPRINT-03','S03-L7',345,'2026-08-18','intel_issuer_offering_disambiguation_frozen'],
  'identity'
);
if(!text(a.title,40)||!text(a.question,180))fail('title or question under-specified');
eq(a.canonical_base,{
  branch:'main',
  sha:'f798a6dea21431a9b225b157e3235929381aa085',
  tree_sha:'35c90d7419276af914fb22e2cccee49e01fe2c7c',
  latest_intel_date_gate_pull_request:2173
},'canonical base');

const bindings={
  date_gate_monitor:['monitor','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-date-gate-monitor.json','b4643f2131cf7ebb27e53765fec31f86447d6b8f','m05-answerable-power-s03-l7-intel-realization-date-gate-monitor@1',2173,'f798a6dea21431a9b225b157e3235929381aa085'],
  implementation_frontier:['frontier','data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json','34fa8d54c3a6ea9b993c3b650f4b737dcbbc756c','m05-answerable-power-s03-l7-five-domain-implementation-frontier@1',2162,'01e3f154ef8a86baa90a89dc250adb9c362ba9ee'],
  intel_receipt_candidate:['intel','data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json','ff88d6d3cd6ae021f7ecbbe596026b82f15ce58a','m05-answerable-power-s03-l7-intel-chips-equity-receipt-candidate@1',2156,'3e13165dcd033f4c0b7a983af7b8a613622a1896'],
  latest_controlled_acquisition:['syri','data/project/m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.json','58ac18ec5841982d8ffc1be75aee6269e5f40dc9','m05-answerable-power-s03-l7-syri-subject-access-public-record-acquisition@1',2171,'34dd125446f9b2fa7beadef16c8f68afacb09a61']
};
for(const [id,[key,p,schemaBlob,schema,pr,merge]] of Object.entries(bindings)){
  const b=a.bindings?.[id];
  if(!b)fail(`missing binding ${id}`);
  eq([b.path,b.blob_sha,b.schema_version,b.pull_request,b.merge_commit],[p,schemaBlob,schema,pr,merge],`${id} declaration`);
  if(blob(raw[key])!==schemaBlob)fail(`${id} Git object drift`);
  if(data[key].schema_version!==schema)fail(`${id} schema drift`);
}

eq(a.target,{
  frontier_id:FRONTIER,
  receipt_id:RECEIPT,
  domain_id:DOMAIN,
  jurisdiction:JURISDICTION,
  route_class:'future_time_gated_monitoring',
  ordinary_gate_utc:GATE,
  monitor_state:'waiting_for_gate',
  adjudication_class:'issuer_offering_false_positive_control'
},'target');
eq(
  [monitor.status,monitor.target?.ordinary_gate_utc,monitor.target?.monitor_state,monitor.target?.bilateral_exception_receipt_located],
  ['intel_realization_waiting_for_ordinary_gate',GATE,'waiting_for_gate',false],
  'monitor state'
);
for(const k of ['realization_supported','federal_receipt_supported','distribution_supported'])if(monitor.expected_result?.[k]!==false)fail(`monitor ${k} overclaim`);
if(monitor.boundaries?.issue_345_may_close!==false)fail('monitor issue closure drift');
eq(
  [intel.status,intel.receipt?.instrument_chain?.realized_sale_dividend_or_warrant_exercise,intel.receipt?.instrument_chain?.identified_federal_cash_receipt,intel.receipt?.instrument_chain?.transparent_public_or_affected_party_distribution],
  ['repository_content_candidate_frozen',false,false,false],
  'Intel candidate state'
);
if(syri.status!=='syri_subject_access_public_record_acquisition_frozen')fail('SyRI predecessor state drift');

const frontierRow=(frontier.frontiers||[]).find((r)=>r.frontier_id===FRONTIER);
if(!frontierRow)fail('Intel frontier missing');
eq([frontierRow.receipt_id,frontierRow.domain_id,frontierRow.jurisdiction,frontierRow.route_class],[RECEIPT,DOMAIN,JURISDICTION,'future_time_gated_monitoring'],'frontier identity');
const timing=(frontier.route_control_sources||[]).find((r)=>r.source_id==='US-INTEL-CHIPS-2026-RESALE-TIMING-PROSPECTUS');
if(!timing)fail('timing control missing');
eq(
  [timing.control_effect?.standard_sale_route_eligible_as_of,timing.control_effect?.exception_requires_bilateral_agreement,timing.control_effect?.registration_is_sale,timing.control_effect?.federal_cash_receipt_established,timing.control_effect?.public_distribution_established],
  ['2026-08-27',true,false,false,false],
  'timing control'
);

const p=a.acquisition_protocol||{};
eq(p.official_hosts,['www.sec.gov','www.intc.com','www.commerce.gov','fiscaldata.treasury.gov','www.usaspending.gov'],'protocol hosts');
eq(p.allowed_source_classes,['official_primary_record','source_native_primary_record'],'source classes');
if(p.executed_at!=='2026-08-18'||p.query_families?.length!==4||p.failed_and_nonqualifying_routes_preserved!==true)fail('protocol denominator drift');
for(const k of ['search_exhaustiveness_claimed','current_public_nonexistence_claimed','registration_counts_as_sale','issuer_offering_counts_as_commerce_disposition','issuer_proceeds_count_as_federal_receipt','option_exercise_counts_as_commerce_warrant_exercise','market_valuation_counts_as_realization','bounded_search_counts_as_distribution_nonexistence'])if(p[k]!==false)fail(`unsafe protocol ${k}`);

const sources=Array.isArray(a.source_records)?a.source_records:[];
eq(sources.map((r)=>r.source_id),SOURCE_IDS,'source identity');
const sourceHashes=['90bd0481dd2c4d0c949d16407342c8012c1526180ef414c78337dc859941f3ea','d49a394dd24696c7d899d706fcfa050774d023b5ae829f7fef122b9eb0ee7231','7a7972bcd105a1715001406f023faef38f3f9e232470ce07812fd685e84994cc','4cdceb66f39f6d574bcd10843f5aafbc0fa352ad25798ed16ae59c86a8784874'];
for(const [i,s] of sources.entries()){
  if(s.qualifies_as_commerce_realization_receipt!==false)fail(`${s.source_id} improperly qualifies`);
  if(!Array.isArray(s.locators)||s.locators.length!==3||s.locators.some((x)=>!text(x,90)))fail(`${s.source_id} locator drift`);
  const {source_sha256,...payload}=s;
  if(source_sha256!==sourceHashes[i]||sha256(payload)!==sourceHashes[i])fail(`${s.source_id} checksum drift`);
  let u; try{u=new URL(s.url)}catch{fail(`${s.source_id} URL invalid`)}
  if(u.protocol!=='https:'||!p.official_hosts.includes(u.hostname))fail(`${s.source_id} host drift`);
}
eq(
  [sources[0].published_at,sources[0].accession_number,sources[0].facts.ordinary_sale_not_before,sources[0].facts.bilateral_exception_possible,sources[0].facts.registration_is_sale],
  ['2026-01-23','0000050863-26-000027','2026-08-27',true,false],
  'Commerce sale gate'
);
eq(
  [sources[1].published_at,sources[1].accession_number,sources[1].facts.issuer,sources[1].facts.base_shares,sources[1].facts.option_shares,sources[1].facts.public_offering_price_usd,sources[1].facts.base_gross_proceeds_usd,sources[1].facts.base_net_proceeds_before_expenses_usd,sources[1].facts.full_option_net_proceeds_approx_usd,sources[1].facts.proceeds_recipient,sources[1].facts.commerce_selling_securityholder],
  ['2026-08-10','0001193125-26-345221','Intel Corporation',210526315,31578947,95,19999999925,19669999926,22620000000,'Intel Corporation',false],
  'issuer prospectus'
);
eq(
  [sources[2].published_at,sources[2].accession_number,sources[2].facts.underwriting_agreement_date,sources[2].facts.base_shares,sources[2].facts.option_shares,sources[2].facts.option_exercised_in_full,sources[2].facts.total_issuer_shares_subject_to_agreement,sources[2].facts.commerce_selling_securityholder,sources[2].facts.federal_cash_receipt_recorded,sources[2].facts.public_distribution_recorded],
  ['2026-08-12','0001193125-26-346806','2026-08-10',210526315,31578947,true,242105262,false,false,false],
  'issuer 8-K'
);
eq(
  [sources[3].published_at,sources[3].facts.reported_stake_value_usd,sources[3].facts.reported_net_gain_over_usd,sources[3].facts.sale_recorded,sources[3].facts.federal_cash_receipt_recorded,sources[3].facts.public_distribution_recorded],
  ['2026-01',22500000000,10000000000,false,false,false],
  'Commerce valuation'
);
if(classifyIntelOfferingRecord(sources[1])!=='issuer_primary_offering')fail('prospectus classification drift');
if(classifyIntelOfferingRecord(sources[2])!=='issuer_underwriting_and_option_exercise')fail('8-K classification drift');

const routes=Array.isArray(a.route_ledger)?a.route_ledger:[];
eq(routes.map((r)=>r.route_id),ROUTE_IDS,'route identity');
const routeHashes=['19a19f69d60bca524c0e83a1093f51441b0b5677be1d9b9aae1fb189c7fb4619','e920e1ca918343df6c9fa31a86bca7faee54d3088f85479d95458589d909eb9a','60a96a8c2bbb115c6d0a78f507b47cd3221b94961fc9057b1718077eb30b079e','c318540933900b1a9921ecc0e527b43f1f407e0756a8bc5baa365b546d83e6fb','b73fa52c08217b755f396fa7a3a96dcef6acbb56847ab795f33d7d5206ccaf26'];
eq(routes.map((r)=>r.host),p.official_hosts,'route hosts');
eq(routes.map((r)=>r.result_class),['substantive_nonqualifying_issuer_offering','substantive_nonqualifying_issuer_offering','valuation_only_without_exception_or_disposition_receipt','no_qualifying_federal_account_receipt_located','no_qualifying_distribution_receipt_located'],'route classes');
for(const [i,r] of routes.entries()){
  if(r.qualifying_receipt_found!==false||!text(r.surface,45)||!text(r.preserved_reason,90))fail(`${r.route_id} route boundary drift`);
  const {route_sha256,...payload}=r;
  if(route_sha256!==routeHashes[i]||sha256(payload)!==routeHashes[i])fail(`${r.route_id} checksum drift`);
}

eq(a.instrument_disambiguation,{
  issuer_offering_base_shares:210526315,
  issuer_offering_option_shares:31578947,
  issuer_offering_total_shares:242105262,
  issuer_offering_price_usd:95,
  issuer_base_gross_proceeds_usd:19999999925,
  issuer_base_net_proceeds_before_expenses_usd:19669999926,
  issuer_full_option_net_proceeds_approx_usd:22620000000,
  issuer_proceeds_recipient:'Intel Corporation',
  underwriter_option_exercised_in_full:true,
  offering_closing_confirmed_by_frozen_records:false,
  commerce_selling_securityholder_in_august_offering:false,
  commerce_bilateral_exception_record_located:false,
  commerce_disposition_record_located:false,
  federal_cash_receipt_record_located:false,
  public_account_booking_record_located:false,
  public_or_affected_party_distribution_record_located:false,
  dilution_effect_quantified:false
},'instrument');
if(a.instrument_disambiguation.issuer_offering_base_shares+a.instrument_disambiguation.issuer_offering_option_shares!==a.instrument_disambiguation.issuer_offering_total_shares)fail('share arithmetic drift');
if(a.instrument_disambiguation.issuer_offering_base_shares*a.instrument_disambiguation.issuer_offering_price_usd!==a.instrument_disambiguation.issuer_base_gross_proceeds_usd)fail('gross-proceeds arithmetic drift');

for(const [name,obj] of [['event chain',a.required_event_chain],['guardrails',a.guardrails]])for(const [k,v] of Object.entries(obj||{}))if(v!==false)fail(`${name} overclaim ${k}`);
const expected={
  official_source_records:4,
  executed_routes:5,
  substantive_nonqualifying_routes:3,
  bounded_search_routes_without_qualifier:2,
  issuer_offering_total_shares:242105262,
  qualifying_commerce_realization_receipts:0,
  commerce_disposition_supported:false,
  federal_receipt_supported:false,
  public_account_booking_supported:false,
  distribution_supported:false,
  answer_changes_authorized:false,
  effective_answers:0,
  qualifying_jurisdictions:0,
  cross_domain_regression_completed:false,
  graph_effect:'none',
  issue_345_may_close:false
};
eq(a.expected_result,expected,'expected result');
const s=summarize(a,monitor,frontier,intel);
eq(Object.fromEntries(Object.keys(expected).map((k)=>[k,s[k]])),expected,'computed result');
if(s.issuer_offering_sources!==2)fail('issuer source count drift');
for(const v of Object.values(s.predecessor_state).slice(1))if(v!==false)fail('predecessor overclaim');

eq(a.boundaries,{
  search_exhaustiveness_claimed:false,
  current_public_nonexistence_claimed:false,
  answer_changes_authorized:false,
  promotion_changes_authorized:false,
  graph_effect:'none',
  conclusion_generated:false,
  estate_completion_claimed:false,
  issue_345_may_close:false
},'terminal boundaries');

for(const [k,v] of Object.entries(data))if(JSON.stringify(v)!==before[k])fail(`${k} mutated`);
console.log(JSON.stringify({
  status:'intel_issuer_offering_disambiguation_valid',
  acquisition_sha256:'b93c34411b7faff591a70c8e6c6c9e9053e2c3cb2f9d507a4dfd901f95a5e999',
  source_records:s.official_source_records,
  executed_routes:s.executed_routes,
  issuer_offering_total_shares:s.issuer_offering_total_shares,
  commerce_disposition_supported:s.commerce_disposition_supported,
  federal_receipt_supported:s.federal_receipt_supported,
  distribution_supported:s.distribution_supported,
  issue_345_may_close:s.issue_345_may_close
},null,2));
