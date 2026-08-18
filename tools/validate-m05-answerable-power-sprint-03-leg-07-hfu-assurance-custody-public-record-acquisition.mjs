#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {summarizeHfuAssuranceCustodyAcquisition} from './lib/m05-answerable-power-sprint-03-leg-07-hfu-assurance-custody-public-record-acquisition.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(name,fallback)=>path.resolve(root,process.env[name]||fallback);
const paths={
  acquisition:resolvePath('M05_HFU_ASSURANCE_CUSTODY_ACQUISITION_PATH','data/project/m05-answerable-power-sprint-03-leg-07-hfu-assurance-custody-public-record-acquisition.json'),
  frontier:resolvePath('M05_IMPLEMENTATION_FRONTIER_PATH','data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'),
  hfuCandidate:resolvePath('M05_HFU_RECEIPT_CANDIDATE_PATH','data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json'),
  foodinhoAcquisition:resolvePath('M05_FOODINHO_ACQUISITION_PATH','data/project/m05-answerable-power-sprint-03-leg-07-foodinho-compliance-public-record-acquisition.json')
};
const readRaw=(target)=>fs.readFileSync(target);
const raw=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,readRaw(target)]));
const data=Object.fromEntries(Object.entries(raw).map(([key,buffer])=>[key,JSON.parse(buffer.toString('utf8'))]));
const {acquisition,frontier,hfuCandidate,foodinhoAcquisition}=data;
const gitBlobSha=(buffer)=>crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');
const sha256Json=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=(message)=>{throw new Error(message)};

if(acquisition.schema_version!=='m05-answerable-power-s03-l7-hfu-assurance-custody-public-record-acquisition@1')fail('schema drift');
if(acquisition.object_class!=='bounded_public_record_acquisition_result'||acquisition.program_id!=='M-05'||acquisition.sprint_id!=='M05-SPRINT-03'||acquisition.leg_id!=='S03-L7'||acquisition.issue!==345)fail('identity drift');
if(acquisition.as_of!=='2026-08-17'||acquisition.status!=='hfu_assurance_custody_public_record_acquisition_frozen')fail('status drift');

const sectionHashes={
  "acquisition_protocol":"f409d5e5f3c0830de50634af62f54005feb1776f39d0f666d19853299613ef76",
  "observed_state":"4d4f4eea3a26c1265aa1518c5985596b4f8ddff5dd6b40b627d831c2991279b3",
  "finding":"e056f9d835b6420c0c6307f0548c928577d2f2844d39ace32c14b742674f4bf2",
  "expected_result":"e503893dbb3fc14a4b7db437c5a91a7e309d370a9f58ac0a871aa7077404f58f",
  "route_guardrails":"11158a46d76d5241ec39e83bddbb71b5f099b9b3944da87549c0178ee08ac239",
  "boundaries":"d2dbc90bae3298a89900c0f88cf00c66fb107d20f2b4c5b344c572910bd2dd5c",
  "assessment":"b3d2bb2d668746f4b68bdac1d093ff8e1c2173329cd3907f4b29f33892e73f70",
  "target":"b668946185629774949c4634ac3df7ef9384adae33c49663b06d8676261b7268",
  "canonical_base":"1ee5bf245695a4485b5881a004c5adc44a8fac55840801571178d1cc458f2ef0",
  "bindings":"455f8301181556c71ad05fbe132b60b6547e0171fcde40ffe0480daad0f071b3"
};
for(const [section,expected] of Object.entries(sectionHashes)){
  if(sha256Json(acquisition[section])!==expected)fail(`${section} custody drift`);
}

const bindingDefs={
  implementation_frontier:['frontier','34fa8d54c3a6ea9b993c3b650f4b737dcbbc756c','m05-answerable-power-s03-l7-five-domain-implementation-frontier@1'],
  hfu_receipt_candidate:['hfuCandidate','8d864b004f3319dae39a5b74b746581d42d768d1','m05-answerable-power-s03-l7-hfu-share-exit-receipt-candidate@1'],
  foodinho_acquisition_result:['foodinhoAcquisition','37179268d1aa05e0e8836ed1b9cd5866f6424fbf','m05-answerable-power-s03-l7-foodinho-compliance-public-record-acquisition@1']
};
for(const [id,[dataKey,blob,schema]] of Object.entries(bindingDefs)){
  const binding=acquisition.bindings?.[id];
  if(!binding||binding.blob_sha!==blob||gitBlobSha(raw[dataKey])!==blob)fail(`${id} blob drift`);
  if(binding.schema_version!==schema||data[dataKey].schema_version!==schema)fail(`${id} schema drift`);
}

const sourceIds=["UK-HFU-MHCLG-DELIVERY-2026","UK-HFU-MIGRATION-SURVEY-2025","UK-HFU-SYSTEM-CHANGE-SURVEY-2025","UK-HFU-SHARE-PRIVACY-2025","UK-HFU-ICO-LBBD-AUDIT-2025","UK-HFU-SERVICE-NAMING-2026"];
const sourceHashes={
  "UK-HFU-MHCLG-DELIVERY-2026":"62e9270144e50442d3ebc39e512fef94617feef212acb2e2b6eb539ac66c485d",
  "UK-HFU-MIGRATION-SURVEY-2025":"21f210518a4a8c9675d57e912ae911b8facbe88c9e304ecfe87cdec51d72cef1",
  "UK-HFU-SYSTEM-CHANGE-SURVEY-2025":"ec987bfcbcb61bb1a4ac8646a55b7e162317fd9fc415f4c8f1ae436cb311a1b6",
  "UK-HFU-SHARE-PRIVACY-2025":"c247e33fc2df6590ddd48cb12e9c69645314c76410a0d0153d78190c6659e7a7",
  "UK-HFU-ICO-LBBD-AUDIT-2025":"a63939ca5ffa80bcc8ed7383651d4efbe288e162cbd00d83ff677b444e2a7bc8",
  "UK-HFU-SERVICE-NAMING-2026":"b3c631598aab0ef4033b7a96cd41c596de1871c9ebc180d43f5080946f881977"
};
const sources=Array.isArray(acquisition.source_records)?acquisition.source_records:[];
if(!same(sources.map((row)=>row.source_id),sourceIds))fail('source denominator drift');
const knownSources=new Set(sourceIds);
for(const source of sources){
  if(source.qualifies_as_assurance_or_custody_receipt!==false)fail(`${source.source_id} qualification drift`);
  if(sha256Json(source)!==sourceHashes[source.source_id])fail(`${source.source_id} custody drift`);
  const url=new URL(source.url);
  if(url.protocol!=='https:'||!acquisition.acquisition_protocol.official_hosts.includes(url.hostname))fail(`${source.source_id} host drift`);
}

const routeIds=["UK-HFU-ACQ-01","UK-HFU-ACQ-02","UK-HFU-ACQ-03","UK-HFU-ACQ-04","UK-HFU-ACQ-05","UK-HFU-ACQ-06","UK-HFU-ACQ-07","UK-HFU-ACQ-08"];
const routeHashes={
  "UK-HFU-ACQ-01":"9508e0db3c23f9d9108ade0fd638e6a951107263af07c41a28f9f00e49740d43",
  "UK-HFU-ACQ-02":"b897828b40a64c9e5e6f8fc0c46279bceefe00ef0c67d1e62a74c95615d52247",
  "UK-HFU-ACQ-03":"70af9f22341d4a6c696dffd1b92895cb91dfdc14e053aae451e14e8584d62407",
  "UK-HFU-ACQ-04":"630467f9c7ad33463aa05562d39c60ac5e0babcaec4f87e2e1af9fb08a1eda5e",
  "UK-HFU-ACQ-05":"6cc5a4d6dd89c13cd28461ee8c2d32d61a5ddb065637d308a43f2ef50e7a7712",
  "UK-HFU-ACQ-06":"65a8cdbece070e528556834740f50abd3063da533f983627f17dc14ba1ce2bbc",
  "UK-HFU-ACQ-07":"4488e5dde8cbc7c64300782d0d4a0714fda72ef6dbb3fd22ffadfda7151b5173",
  "UK-HFU-ACQ-08":"c4da3ba506e34c2508753834e778488a3d7e643486e596d88e2159030f47ebd2"
};
const routes=Array.isArray(acquisition.route_ledger)?acquisition.route_ledger:[];
if(!same(routes.map((row)=>row.route_id),routeIds))fail('route denominator drift');
for(const route of routes){
  if(route.qualifying_receipt_found!==false)fail(`${route.route_id} qualification drift`);
  if((route.observed_source_ids||[]).some((id)=>!knownSources.has(id)))fail(`${route.route_id} source join drift`);
  if(sha256Json(route)!==routeHashes[route.route_id])fail(`${route.route_id} custody drift`);
}

const frontierRow=(frontier.frontiers||[]).find((row)=>row.frontier_id==='M05-IF-EXIT-UK-HFU-ASSURANCE-CUSTODY');
if(!frontierRow||frontierRow.route_class!=='active_public_record_acquisition'||frontierRow.answer_changes_authorized!==false)fail('frontier routing drift');
if(!same(frontierRow.current_dimension_state,{independent_authority:false,effective_remedy:false,durability:false,practical_exit_or_governance:true,composed_durable_answer:false}))fail('frontier dimension drift');
if(!same([...frontierRow.preserved_deficits].sort(),[...acquisition.finding.deficits_preserved].sort()))fail('frontier deficit drift');

const transition=hfuCandidate?.receipt?.transition_chain||{};
for(const key of ['independent_end_to_end_migration_assurance','residual_supplier_custody_reconciled','former_supplier_deletion_certificate','independent_cost_and_performance_reconciliation','affected_party_post_exit_governance','supplier_free_operation','cloud_independent_operation']){
  if(transition[key]!==false)fail(`source transition promoted: ${key}`);
}
const observation=hfuCandidate?.receipt?.observation;
if(observation?.answer?.dimensions?.independent_authority!==false||observation?.answer?.dimensions?.effective_remedy!==false||observation?.answer?.dimensions?.durability!==false||observation?.answer?.dimensions?.practical_exit_or_governance!==true||observation?.answer?.composed_durable_answer!==false)fail('HFU source answer drift');
if(foodinhoAcquisition.expected_result?.advanced_answer_dimensions!==1||foodinhoAcquisition.expected_result?.effective_answers!==0||foodinhoAcquisition.expected_result?.cross_domain_regression_completed!==false)fail('prior acquisition state drift');

const summary=summarizeHfuAssuranceCustodyAcquisition({frontier,hfuCandidate,foodinhoAcquisition,acquisition});
const computed={source_records:summary.source_records,new_source_records:summary.new_source_records,qualifying_assurance_or_custody_receipts:summary.qualifying_assurance_or_custody_receipts,routes_executed:summary.routes_executed,routes_with_substantive_content:summary.routes_with_substantive_content,routes_with_qualifying_receipt:summary.routes_with_qualifying_receipt,hfu_independent_authority:summary.hfu_independent_authority,hfu_effective_remedy:summary.hfu_effective_remedy,hfu_durability:summary.hfu_durability,hfu_practical_exit_or_governance:summary.hfu_practical_exit_or_governance,deficits_closed:summary.deficits_closed,deficits_preserved:summary.deficits_preserved,candidate_evidence_records:summary.candidate_evidence_records,repository_promotion_allowed:summary.repository_promotion_allowed,advanced_answer_dimensions:summary.advanced_answer_dimensions,effective_answers:summary.effective_answers,qualifying_jurisdictions:summary.qualifying_jurisdictions,answer_effectiveness:summary.answer_effectiveness,cross_domain_regression_completed:summary.cross_domain_regression_completed,issue_345_may_close:false};
if(!same(computed,acquisition.expected_result))fail('expected result drift');
console.log(JSON.stringify({validator:'m05-answerable-power-s03-l7-hfu-assurance-custody-public-record-acquisition',...computed},null,2));
