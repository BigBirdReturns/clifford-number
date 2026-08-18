#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const paths={
  acquisition:resolvePath('M05_INTEL_BILATERAL_EXCEPTION_ACQUISITION_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-bilateral-exception-acquisition.json'),
  historical:resolvePath('M05_INTEL_PRE_ELIGIBILITY_MONITOR_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-pre-eligibility-realization-monitor.json'),
  monitor:resolvePath('M05_INTEL_REALIZATION_MONITOR_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-date-gate-monitor.json'),
  frontier:resolvePath('M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH','data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'),
  syri:resolvePath('M05_SYRI_SUBJECT_ACCESS_ACQUISITION_PATH','data/project/m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.json')
};
const EXPECTED_ACQUISITION_SHA256='2ac2b88f14187c3bd3f9ab7ee82ee0f23ac5eb0802a14c17cbf8f731a5f9f2b7';
const readRaw=(target)=>fs.readFileSync(target);
const gitBlobSha=(buffer)=>crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`,'utf8')).update(buffer).digest('hex');
const semanticHash=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clone=(value)=>JSON.parse(JSON.stringify(value));
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const fail=(message)=>{throw new Error(message)};
const raw=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,readRaw(target)]));
const data=Object.fromEntries(Object.entries(raw).map(([key,buffer])=>[key,JSON.parse(buffer.toString('utf8'))]));
const {acquisition,historical,monitor,frontier,syri}=data;

if(acquisition.schema_version!=='m05-answerable-power-s03-l7-intel-bilateral-exception-acquisition@1')fail('acquisition schema drift');
if(acquisition.object_class!=='bounded_pre_gate_official_record_acquisition_result')fail('acquisition object class drift');
if(acquisition.program_id!=='M-05'||acquisition.sprint_id!=='M05-SPRINT-03'||acquisition.leg_id!=='S03-L7')fail('acquisition program binding drift');
if(acquisition.issue!==345||acquisition.as_of!=='2026-08-18'||acquisition.status!=='intel_bilateral_exception_acquisition_frozen')fail('acquisition identity drift');

const expectedBase={branch:'main',sha:'f798a6dea21431a9b225b157e3235929381aa085',tree_sha:'35c90d7419276af914fb22e2cccee49e01fe2c7c',preceding_pull_request:2173,preceding_merge_commit:'f798a6dea21431a9b225b157e3235929381aa085'};
if(!same(acquisition.canonical_base,expectedBase))fail('canonical base drift');

const bindingDefinitions={
  historical_pre_eligibility_record:{dataKey:'historical',path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-pre-eligibility-realization-monitor.json',blob:'a9ccf7b4da436868dfae449daabf8d0fa98e1db6',schema:'m05-answerable-power-s03-l7-intel-pre-eligibility-realization-monitor@1'},
  date_gate_monitor:{dataKey:'monitor',path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-date-gate-monitor.json',blob:'b4643f2131cf7ebb27e53765fec31f86447d6b8f',schema:'m05-answerable-power-s03-l7-intel-realization-date-gate-monitor@1'},
  implementation_frontier:{dataKey:'frontier',path:'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json',blob:'34fa8d54c3a6ea9b993c3b650f4b737dcbbc756c',schema:'m05-answerable-power-s03-l7-five-domain-implementation-frontier@1'},
  latest_controlled_acquisition:{dataKey:'syri',path:'data/project/m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.json',blob:'58ac18ec5841982d8ffc1be75aee6269e5f40dc9',schema:'m05-answerable-power-s03-l7-syri-subject-access-public-record-acquisition@1'}
};
for(const [bindingId,definition] of Object.entries(bindingDefinitions)){
  const binding=acquisition.bindings?.[bindingId];
  if(!binding)fail(`missing binding ${bindingId}`);
  if(binding.path!==definition.path||binding.blob_sha!==definition.blob||binding.schema_version!==definition.schema)fail(`${bindingId} declared binding drift`);
  if(gitBlobSha(raw[definition.dataKey])!==definition.blob)fail(`${bindingId} Git object drift`);
  if(data[definition.dataKey].schema_version!==definition.schema)fail(`${bindingId} schema drift`);
}
if(acquisition.bindings.historical_pre_eligibility_record.observed_at!=='2026-08-17'||acquisition.bindings.historical_pre_eligibility_record.custody_class!=='previously_unmerged_supporting_object')fail('historical custody binding drift');
if(acquisition.bindings.date_gate_monitor.pull_request!==2173||acquisition.bindings.date_gate_monitor.merge_commit!==expectedBase.sha)fail('date-gate publication drift');
if(acquisition.bindings.implementation_frontier.pull_request!==2162||acquisition.bindings.implementation_frontier.merge_commit!=='01e3f154ef8a86baa90a89dc250adb9c362ba9ee')fail('frontier publication drift');
if(acquisition.bindings.latest_controlled_acquisition.pull_request!==2171||acquisition.bindings.latest_controlled_acquisition.merge_commit!=='34dd125446f9b2fa7beadef16c8f68afacb09a61')fail('controlled-acquisition publication drift');

const expectedTarget={frontier_id:'M05-IF-VALUE-US-INTEL-REALIZATION',receipt_id:'M05-RC-VALUE-US-INTEL-CHIPS-EQUITY',domain_id:'APC-VALUE-01',jurisdiction:'US',route_class:'bounded_early_exception_acquisition',ordinary_gate_utc:'2026-08-27T00:00:00Z',observed_at:'2026-08-18',calendar_days_before_ordinary_gate:9};
if(!same(acquisition.target,expectedTarget))fail('target drift');
if((Date.parse(expectedTarget.ordinary_gate_utc)-Date.parse(`${expectedTarget.observed_at}T00:00:00Z`))/86400000!==9)fail('calendar gate drift');

const expectedPolicy={exception_route_active:true,ordinary_route_active:false,earlier_activation_requires_source_addressed_bilateral_agreement:true,allowed_source_classes:['source_native_primary_record','official_primary_record'],official_hosts:['www.sec.gov','www.intc.com','www.commerce.gov'],search_exhaustiveness_claimed:false,current_public_nonexistence_claimed:false,downstream_fiscal_routes_deferred_without_upstream_transaction:true,registration_counts_as_sale:false,escrow_release_counts_as_federal_cash_receipt:false,mark_to_market_value_counts_as_realized_return:false,government_ownership_counts_as_public_distribution:false,elapsed_time_counts_as_transaction:false,automatic_answer_change_allowed:false,automatic_issue_closure_allowed:false};
if(!same(acquisition.acquisition_policy,expectedPolicy))fail('acquisition policy drift');

if(historical.status!=='intel_pre_eligibility_realization_monitor_frozen'||historical.as_of!=='2026-08-17')fail('historical record identity drift');
const historicalSourceIds=['US-INTEL-CHIPS-2026-RESALE-TIMING-PROSPECTUS','US-INTEL-CHIPS-Q2-2026-10Q','US-COMMERCE-INTEL-VALUATION-CLAIM'];
const historicalRouteIds=['US-INTEL-MON-01','US-INTEL-MON-02','US-INTEL-MON-03','US-INTEL-MON-04','US-INTEL-MON-05','US-INTEL-MON-06'];
if(!same((historical.source_records||[]).map((row)=>row.source_id),historicalSourceIds))fail('historical source denominator drift');
if(!same((historical.route_ledger||[]).map((row)=>row.route_id),historicalRouteIds))fail('historical route denominator drift');
for(const source of historical.source_records||[]){
  const copy=clone(source),declared=copy.source_sha256;delete copy.source_sha256;
  if(semanticHash(copy)!==declared||source.qualifies_as_realization_receipt!==false)fail(`${source.source_id} historical source drift`);
}
for(const route of historical.route_ledger||[]){
  const copy=clone(route),declared=copy.route_sha256;delete copy.route_sha256;
  if(semanticHash(copy)!==declared||route.qualifying_receipt_found!==false)fail(`${route.route_id} historical route drift`);
}
if(historical.expected_result?.source_records!==3||historical.expected_result?.routes_executed!==6||historical.expected_result?.routes_with_qualifying_receipt!==0||historical.expected_result?.effective_answers!==0||historical.expected_result?.cross_domain_regression_completed!==false||historical.expected_result?.issue_345_may_close!==false)fail('historical expected result drift');

if(monitor.status!=='intel_realization_waiting_for_ordinary_gate'||monitor.as_of!=='2026-08-17')fail('date-gate monitor identity drift');
if(monitor.target?.ordinary_gate_utc!=='2026-08-27T00:00:00Z'||monitor.target?.monitor_state!=='waiting_for_gate'||monitor.target?.ordinary_route_open_as_of_record!==false||monitor.target?.bilateral_exception_receipt_located!==false)fail('date-gate monitor target drift');
if(monitor.bindings?.latest_controlled_acquisition?.blob_sha!=='58ac18ec5841982d8ffc1be75aee6269e5f40dc9')fail('date-gate predecessor drift');
if(monitor.expected_result?.realization_supported!==false||monitor.expected_result?.federal_receipt_supported!==false||monitor.expected_result?.distribution_supported!==false||monitor.expected_result?.effective_answers!==0||monitor.expected_result?.cross_domain_regression_completed!==false||monitor.expected_result?.issue_345_may_close!==false)fail('date-gate expected result drift');

const frontierRow=(frontier.frontiers||[]).find((row)=>row.frontier_id===expectedTarget.frontier_id);
if(!frontierRow)fail('Intel frontier missing');
if(frontierRow.receipt_id!==expectedTarget.receipt_id||frontierRow.domain_id!==expectedTarget.domain_id||frontierRow.jurisdiction!==expectedTarget.jurisdiction)fail('Intel frontier identity drift');
if(frontierRow.time_gate?.standard_sale_route_currently_eligible!==false||frontierRow.time_gate?.exception_agreement_observed!==false)fail('Intel frontier time-gate drift');
if(syri.status!=='syri_subject_access_public_record_acquisition_frozen'||syri.boundaries?.issue_345_may_close!==false)fail('SyRI predecessor drift');

const expectedCustody={source_records_carried_forward:3,route_records_carried_forward:6,new_source_records:0,source_ids:historicalSourceIds,route_ids:historicalRouteIds,historical_record_promotes_current_state:false};
if(!same(acquisition.historical_record_custody,expectedCustody))fail('historical custody ledger drift');

const expectedRouteIds=['US-INTEL-EXC-01','US-INTEL-EXC-02','US-INTEL-EXC-03'];
const expectedHosts=['www.sec.gov','www.intc.com','www.commerce.gov'];
const routes=Array.isArray(acquisition.recheck_routes)?acquisition.recheck_routes:[];
if(!same(routes.map((row)=>row.route_id),expectedRouteIds))fail('recheck route denominator drift');
if(!same(routes.map((row)=>row.host),expectedHosts))fail('recheck host denominator drift');
for(const route of routes){
  const copy=clone(route),declared=copy.route_sha256;delete copy.route_sha256;
  if(semanticHash(copy)!==declared)fail(`${route.route_id} recheck route hash drift`);
  if(route.result_class!=='no_qualifying_event_located_in_bounded_search'||route.qualifying_receipt_found!==false||route.search_exhaustiveness_claimed!==false)fail(`${route.route_id} recheck route promotion drift`);
  if(!expectedPolicy.official_hosts.includes(route.host))fail(`${route.route_id} host substitution`);
}

const expectedObserved={ordinary_sale_window_open:false,bilateral_exception_publicly_evidenced:false,completed_sale_or_transfer_observed:false,dividend_to_commerce_observed:false,warrant_exercise_observed:false,identified_federal_cash_receipt:false,public_account_booking_observed:false,transparent_public_or_affected_party_distribution:false,qualifying_early_realization_receipt_found:false};
if(!same(acquisition.observed_state,expectedObserved))fail('observed state drift');

const deficits=['composed_durable_answer','dimension:independent_authority','dimension:effective_remedy','dimension:durability','dimension:practical_exit_or_governance','realized_sale_dividend_or_warrant_exercise','identified_federal_cash_receipt','public_account_booking','transparent_public_or_affected_party_distribution'];
const expectedFinding={finding_class:'bounded_early_exception_recheck_no_qualifying_event',recheck_routes_executed:3,recheck_routes_with_qualifying_receipt:0,source_records_carried_forward:3,new_source_records:0,date_gate_preserved:true,deficits_closed:[],deficits_preserved:deficits,answer_changes_authorized:false,repository_effect:'bounded_acquisition_nonfinding_only',next_ordinary_acquisition_not_before:'2026-08-27'};
if(!same(acquisition.finding,expectedFinding))fail('finding drift');

const expectedBoundaries={claims_bilateral_exception:false,claims_completed_sale_or_transfer:false,claims_dividend:false,claims_warrant_exercise:false,claims_federal_cash_receipt:false,claims_public_account_booking:false,claims_public_or_affected_party_distribution:false,claims_answer_effectiveness:false,claims_cross_domain_completion:false,graph_effect:'none',conclusion_generated:false,project_complete:false,issue_345_may_close:false};
if(!same(acquisition.boundaries,expectedBoundaries))fail('boundary drift');

const expectedResult={historical_source_records:3,historical_route_records:6,recheck_routes_executed:3,new_source_records:0,qualifying_early_realization_receipts:0,ordinary_route_active:false,bilateral_exception_publicly_evidenced:false,completed_sale_or_transfer_observed:false,identified_federal_cash_receipt:false,public_account_booking_observed:false,transparent_public_or_affected_party_distribution:false,candidate_evidence_records:5,repository_promotions:5,advanced_answer_dimensions:1,effective_answers:0,qualifying_jurisdictions:0,answer_effectiveness:false,cross_domain_regression_completed:false,graph_effect:'none',issue_345_may_close:false};
if(!same(acquisition.expected_result,expectedResult))fail('expected result drift');

const acquisitionCopy=clone(acquisition),declaredAcquisitionHash=acquisitionCopy.acquisition_sha256;delete acquisitionCopy.acquisition_sha256;
if(declaredAcquisitionHash!==EXPECTED_ACQUISITION_SHA256)fail('acquisition declared checksum drift');
if(semanticHash(acquisitionCopy)!==EXPECTED_ACQUISITION_SHA256)fail('acquisition checksum drift');

console.log(JSON.stringify({validator:'m05-intel-bilateral-exception-acquisition',historical_sources:3,historical_routes:6,recheck_routes:3,qualifying_receipts:0,ordinary_gate:'2026-08-27T00:00:00Z',effective_answers:0,issue_345_may_close:false},null,2));
