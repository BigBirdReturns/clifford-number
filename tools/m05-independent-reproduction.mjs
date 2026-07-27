#!/usr/bin/env node
import fs from 'node:fs';

const TARGET_COMMIT='ce8f4194019cf75cc2b66436efbeebdfd43f9951';
const TARGET_HASH='9084e2fe8e4a951fd667c71b9be58475a1b8fc463ab25c885fd98891d39747ad';
const REQUIRED_COMMANDS=[
  'git rev-parse HEAD',
  'npm ci',
  'npm run release:check',
  'node tools/build-m05-answerable-power-sprint-05.mjs',
  'node tools/validate-m05-answerable-power-sprint-05.mjs',
  'node test/m05-answerable-power-sprint-05.test.js',
  'node test/m05-adoption-conformance.test.js',
  'git diff --exit-code'
];
const HEX=/^[0-9a-f]{64}$/;
const usage=()=>{console.error('usage: node tools/m05-independent-reproduction.mjs <receipt.json> [--as-of YYYY-MM-DD]');process.exit(64)};
const args=process.argv.slice(2); if(!args[0])usage();
let asOf=new Date(); const idx=args.indexOf('--as-of'); if(idx>=0){if(!args[idx+1])usage();asOf=new Date(args[idx+1]+'T23:59:59.999Z')}
if(Number.isNaN(asOf.getTime()))usage();
let r; try{r=JSON.parse(fs.readFileSync(args[0],'utf8'))}catch(error){console.error(error.message);process.exit(64)}
const errors=[]; const warnings=[];
const need=(value,label)=>{if(value===undefined||value===null||value==='')errors.push(`missing ${label}`);return value};
const date=(value,label)=>{const d=new Date(value);if(!value||Number.isNaN(d.getTime()))errors.push(`invalid ${label}`);return d};
const uri=(value,label)=>{if(typeof value!=='string'||value.length<8)errors.push(`invalid ${label}`)};
const hash=(value,label)=>{if(!HEX.test(value||''))errors.push(`invalid ${label}`)};
if(r.schema_version!=='apc-independent-reproduction-receipt@1')errors.push('schema_version mismatch');
if(!/^A1R-[A-Z0-9][A-Z0-9-]{7,63}$/.test(r.receipt_id||''))errors.push('invalid receipt_id');
const issued=date(r.issued_at,'issued_at'), expires=date(r.expires_at,'expires_at');
if(issued>asOf)errors.push('issued_at is in the future');
if(expires<=asOf)errors.push('receipt expired');
if(expires-issued>366*86400000)errors.push('receipt validity exceeds 366 days');
const ref=r.reference||{};
if(ref.repository_full_name!=='BigBirdReturns/clifford-number')errors.push('repository mismatch');
if(ref.commit_sha!==TARGET_COMMIT)errors.push('reference commit mismatch');
if(ref.release_manifest_path!=='data/project/m05-answerable-power-sprint-05-release-manifest.json')errors.push('release manifest path mismatch');
if(ref.combined_sha256!==TARGET_HASH)errors.push('reference bundle mismatch');
uri(ref.public_bundle_uri,'reference.public_bundle_uri');
const p=r.reproducer||{};
for(const key of ['name','identity_type','identity_evidence_uri','contact_uri','relationship_to_project','relationship_to_vendor','relationship_to_operator','relationship_to_adopter','funding_disclosure'])need(p[key],`reproducer.${key}`);
if(!['person','organization'].includes(p.identity_type))errors.push('invalid reproducer.identity_type');
uri(p.identity_evidence_uri,'reproducer.identity_evidence_uri'); uri(p.contact_uri,'reproducer.contact_uri');
if(p.conflicts_disclosed!==true)errors.push('conflicts not explicitly disclosed');
if(!Array.isArray(p.conflict_disclosures))errors.push('conflict_disclosures must be an array');
for(const key of ['repo_admin_or_maintainer','reference_contributor','vendor_or_operator','customer_or_adopter','same_legal_entity','bot_or_automated_agent'])if(p[key]!==false)errors.push(`disqualified reproducer: ${key}`);
const env=r.environment||{};
for(const key of ['os','architecture','node_version','npm_version','git_version','workspace_origin'])need(env[key],`environment.${key}`);
hash(env.dependency_lock_sha256,'environment.dependency_lock_sha256');
if(env.workspace_origin!=='independently_provisioned')errors.push('workspace was not independently provisioned');
if(!Array.isArray(env.network_sources)||env.network_sources.length===0)errors.push('network_sources missing');
const proc=r.procedure||{};
if(proc.protocol_version!=='M05-S06-PROTOCOL-1')errors.push('protocol_version mismatch');
const started=date(proc.started_at,'procedure.started_at'), completed=date(proc.completed_at,'procedure.completed_at');
if(completed<started)errors.push('procedure completed before it started');
if(completed>issued)errors.push('receipt issued before reproduction completed');
for(const [key,expected] of Object.entries({clean_room:true,fresh_checkout:true,prior_build_artifacts_reused:false,project_supplied_workspace:false,executed_by_project_ci:false}))if(proc[key]!==expected)errors.push(`invalid procedure.${key}`);
if(!Array.isArray(proc.deviations)||proc.deviations.length!==0)errors.push('deviations are not allowed for A1 structural eligibility');
if(!Array.isArray(proc.commands))errors.push('commands missing');
else{
  const ordered=[...proc.commands].sort((a,b)=>a.order-b.order);
  if(ordered.length!==REQUIRED_COMMANDS.length)errors.push('required command denominator mismatch');
  REQUIRED_COMMANDS.forEach((command,i)=>{const row=ordered[i]||{};if(row.order!==i+1||row.command!==command)errors.push(`required command ${i+1} mismatch`);if(row.exit_code!==0)errors.push(`command failed: ${command}`);date(row.started_at,`command ${i+1} started_at`);date(row.completed_at,`command ${i+1} completed_at`);hash(row.stdout_sha256,`command ${i+1} stdout_sha256`);hash(row.stderr_sha256,`command ${i+1} stderr_sha256`);});
}
const results=r.results||{};
if(results.checkout_commit_sha!==TARGET_COMMIT)errors.push('result checkout commit mismatch');
if(results.release_combined_sha256!==TARGET_HASH)errors.push('result bundle mismatch');
if(results.full_release_gate_exit_code!==0)errors.push('full release gate failed');
if(results.focused_checks_exit_code!==0)errors.push('focused checks failed');
if(results.deterministic_rebuild_clean!==true)errors.push('deterministic rebuild was not clean');
if(!Array.isArray(results.output_fingerprints)||results.output_fingerprints.length<2)errors.push('output_fingerprints incomplete');
else for(const [i,row] of results.output_fingerprints.entries()){need(row.path,`output_fingerprints[${i}].path`);hash(row.sha256,`output_fingerprints[${i}].sha256`);if(!Number.isInteger(row.bytes)||row.bytes<1)errors.push(`invalid output_fingerprints[${i}].bytes`);}
const custody=r.custody||{}; uri(custody.evidence_uri,'custody.evidence_uri');hash(custody.evidence_sha256,'custody.evidence_sha256');
for(const key of ['public_access','immutable_or_versioned','raw_logs_included','complete_failure_denominator'])if(custody[key]!==true)errors.push(`custody.${key} must be true`);
const retained=date(custody.retained_until,'custody.retained_until'); if(retained<expires)errors.push('evidence retention ends before receipt expiry'); if(retained-issued<400*86400000)errors.push('evidence retention is shorter than 400 days');
const sig=r.signature||{};need(sig.signatory_name,'signature.signatory_name');if(sig.signatory_name!==p.name)errors.push('signatory does not match reproducer');
if(!['digital_signature','notarized_statement','organizational_attestation'].includes(sig.signature_type))errors.push('invalid signature_type');
const signed=date(sig.signed_at,'signature.signed_at');if(signed<completed||signed>issued)errors.push('signature timing invalid');uri(sig.signed_statement_uri,'signature.signed_statement_uri');hash(sig.signed_statement_sha256,'signature.signed_statement_sha256');
const dec=r.declaration||{};for(const key of ['factual_accuracy','no_self_attestation','no_undisclosed_conflict','no_project_control','no_private_artifact_dependency'])if(dec[key]!==true)errors.push(`declaration.${key} must be true`);
if(errors.length===0)warnings.push('Structural eligibility does not establish actual independence, evidence truth, or A1 registry approval.');
const out={
  schema_version:'m05-independent-reproduction-validation@1',receipt_id:r.receipt_id||null,
  structurally_valid:errors.length===0,structurally_eligible_for_a1:errors.length===0,
  target_commit:TARGET_COMMIT,target_bundle_sha256:TARGET_HASH,errors,warnings,
  machine_verifiable_only:true,independence_determined:false,evidence_truth_determined:false,
  a1_observed:false,registry_mutated:false
};
console.log(JSON.stringify(out,null,2));process.exit(errors.length?2:0);
