import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  compilePreferenceCustodyManifestV56,
  loadPreferenceCustodyV55SourceBundle,
  preferenceCustodyManifestV56Snapshot,
  validatePreferenceCustodyManifestV56,
  validatePreferenceCustodyManifestV56Build
} from '../tools/lib/preference-custody-manifest-v56.mjs';
const load = path => JSON.parse(readFileSync(path, 'utf8'));
const clone = value => structuredClone(value);
if (!existsSync('build/research/preference-custody-laboratory-floor-v55.json')) execFileSync(process.execPath, ['test/preference-custody-manifest-v55.test.js'], { stdio: 'inherit' });
if (!existsSync('build/research/preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.json')) execFileSync(process.execPath, ['tools/compile-preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.mjs'], { stdio: 'inherit' });
const manifest = load('data/research/preference-custody/control-manifest-v56.json');
const baseBuild = load('build/research/preference-custody-laboratory-floor-v55.json');
const targetBuild = load('build/research/preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.json');
const targetFixture = load(manifest.extension_control.source_fixture_path);
const baseSources = loadPreferenceCustodyV55SourceBundle(load);
const compiled = compilePreferenceCustodyManifestV56(manifest, baseBuild, targetBuild, targetFixture, baseSources);
mkdirSync('build/research', { recursive: true });
writeFileSync('build/research/preference-custody-laboratory-floor-v56.json', JSON.stringify(compiled, null, 2) + '\n');
const build = load('build/research/preference-custody-laboratory-floor-v56.json');
assert.deepEqual(validatePreferenceCustodyManifestV56(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV56Build(build, manifest, baseBuild, targetBuild, targetFixture, baseSources), []);
assert.deepEqual(compiled, build);
assert.equal(preferenceCustodyManifestV56Snapshot(manifest), "fd950ca6771faf7a42fa39015c3627cfadcb19f7422286709718ea88c45f545d");
assert.equal(build.control_count, 58); assert.equal(build.composition.base_control_count, 57); assert.equal(build.composition.added_promotion_requirement_count, 58); assert.equal(build.promotion_boundary.promotion_requirement_count, 2406); assert.equal(build.controls.at(-1).control_id, 'PC-58'); assert.deepEqual(build.controls.slice(0, 57), baseBuild.controls);
assert.ok(build.open_frontiers.includes("linkage_interval_repository_owner_login_canonical_profile_api_location_account_type_state_and_suspension_governance")); assert.ok(build.open_frontiers.includes("linkage_interval_owner_rename_event_predecessor_successor_timestamp_redirect_repository_owner_pair_and_transfer_continuity_governance")); assert.ok(build.open_frontiers.includes("linkage_interval_repository_numeric_node_id_transfer_event_predecessor_successor_timestamp_redirect_and_namespace_governance")); assert.ok(build.open_frontiers.includes("linkage_interval_repository_canonical_url_visibility_fork_parent_source_network_and_redirect_governance")); assert.ok(build.open_frontiers.includes("linkage_interval_default_branch_tag_release_review_time_commit_ref_object_reachability_and_asset_identity_governance")); assert.ok(!build.open_frontiers.includes("linkage_interval_repository_owner_login_immutable_owner_id_account_state_and_owner_rename_governance"));
const mutateLeaf = value => { if (typeof value === 'boolean') return !value; if (typeof value === 'number') return Number.isInteger(value) ? value + 1 : value + 0.01; if (typeof value === 'string') return `${value}__mutation`; if (value === null) return 'mutation'; throw new Error(`unsupported leaf ${typeof value}`); };
function leaves(value, path = []) { if (value === null || typeof value !== 'object') return [{path,value}]; const out=[]; if (Array.isArray(value)) value.forEach((item,index)=>out.push(...leaves(item,[...path,index]))); else Object.entries(value).forEach(([key,item])=>out.push(...leaves(item,[...path,key]))); return out; }
function setAt(root,path,value) { let target=root; for (const key of path.slice(0,-1)) target=target[key]; target[path.at(-1)]=value; }
const manifestRefused = (candidate,label)=>assert.ok(validatePreferenceCustodyManifestV56(candidate).length>0,label);
const buildRefused = (candidate,label,sources=baseSources)=>assert.ok(validatePreferenceCustodyManifestV56Build(candidate,manifest,baseBuild,targetBuild,targetFixture,sources).length>0,label);
let manifestMutationCount=0; for (const {path,value} of leaves(manifest)) { const candidate=clone(manifest); setAt(candidate,path,mutateLeaf(value)); manifestRefused(candidate,`manifest leaf ${path.join('.')}`); manifestMutationCount+=1; } assert.ok(manifestMutationCount>=105,`expected broad manifest mutation census, observed ${manifestMutationCount}`);
let buildMutationCount=0; const buildLeaves=leaves(build); const stride=Math.max(1,Math.ceil(buildLeaves.length/26)); for (let index=0;index<buildLeaves.length;index+=stride) { const {path,value}=buildLeaves[index]; const candidate=clone(build); setAt(candidate,path,mutateLeaf(value)); buildRefused(candidate,`build leaf ${path.join('.')}`); buildMutationCount+=1; } assert.ok(buildMutationCount>=20,`expected bounded full-stack build tamper coverage, observed ${buildMutationCount}`);
for (const malformed of [null,0,'invalid',false,[]]) { assert.doesNotThrow(()=>validatePreferenceCustodyManifestV56(malformed)); manifestRefused(malformed,`malformed manifest ${String(malformed)}`); }
for (const field of ['base_floor','extension_control','identification_requirement','frontier_transition','interpretation_contract']) for (const replacement of [null,0]) { const candidate=clone(manifest); candidate[field]=replacement; assert.doesNotThrow(()=>validatePreferenceCustodyManifestV56(candidate)); manifestRefused(candidate,`malformed ${field}`); }
const aliasSources=clone(baseSources); aliasSources.targetFixture=targetFixture; assert.ok(validatePreferenceCustodyManifestV56Build(build,manifest,baseBuild,targetBuild,targetFixture,aliasSources).length>0,'cross-root alias must be refused');
const manifestAlias=clone(manifest); const manifestAliasTargetFixture=clone(targetFixture); manifestAlias.extension_control.required_refusal_rules=manifestAliasTargetFixture.required_refusal_rules; assert.ok(validatePreferenceCustodyManifestV56Build(clone(build),manifestAlias,clone(baseBuild),clone(targetBuild),manifestAliasTargetFixture,clone(baseSources)).length>0,'manifest-to-runtime alias must be refused'); assert.throws(()=>compilePreferenceCustodyManifestV56(manifestAlias,clone(baseBuild),clone(targetBuild),manifestAliasTargetFixture,clone(baseSources)),/cycle or repeated object identity/);
const deepExtra=clone(baseSources); deepExtra.baseSources.manifest.unapproved=true; assert.ok(validatePreferenceCustodyManifestV56Build(build,manifest,baseBuild,targetBuild,targetFixture,deepExtra).length>0,'deep source key must be refused');
const postdated=clone(baseSources); postdated.targetFixture.captured_at='2026-08-09'; assert.ok(validatePreferenceCustodyManifestV56Build(build,manifest,baseBuild,targetBuild,targetFixture,postdated).length>0,'postdated source must be refused');
function exoticRecord(source,make) { const exotic=make(); Object.setPrototypeOf(exotic,Object.prototype); Object.assign(exotic,source); return exotic; }
const exoticManifest=clone(manifest); exoticManifest.base_floor=exoticRecord(exoticManifest.base_floor,()=>new Date(0)); manifestRefused(exoticManifest,'Date-backed manifest record with reset prototype');
const exoticSource=clone(baseSources); exoticSource.targetBuild.worlds[0].flags=exoticRecord(exoticSource.targetBuild.worlds[0].flags,()=>new Map()); assert.ok(validatePreferenceCustodyManifestV56Build(build,manifest,baseBuild,targetBuild,targetFixture,exoticSource).length>0,'Map-backed transitive source must be refused');
const namedManifest=clone(manifest); namedManifest.real_case_requirements_added.unapproved=true; manifestRefused(namedManifest,'named manifest array property');
const hugeSparseManifest=clone(manifest); hugeSparseManifest.real_case_requirements_added.length=2**32-1; manifestRefused(hugeSparseManifest,'huge sparse manifest array');
const namedSource=clone(baseSources); namedSource.targetBuild.worlds.unapproved=true; assert.ok(validatePreferenceCustodyManifestV56Build(build,manifest,baseBuild,targetBuild,targetFixture,namedSource).length>0,'named transitive source array property must be refused');
const negativeZeroBuild=clone(build); negativeZeroBuild.controls.at(-1).metrics.owner_login_profile_api_substitutions=-0; buildRefused(negativeZeroBuild,'negative-zero floor build');
const temp=mkdtempSync(join(tmpdir(),'pc58-v56-null-manifest-')); try { const nullPath=join(temp,'null.json'); writeFileSync(nullPath,'null\n'); const compileCli=spawnSync(process.execPath,['tools/compile-preference-custody-manifest-v56.mjs',nullPath,join(temp,'out.json'),join(temp,'out.md')],{encoding:'utf8'}); assert.equal(compileCli.status,1); assert.match(`${compileCli.stdout}\n${compileCli.stderr}`,/Preference Custody v56 manifest must be an object/); const validateCli=spawnSync(process.execPath,['tools/validate-preference-custody-manifest-v56.mjs',nullPath,join(temp,'missing.json')],{encoding:'utf8'}); assert.equal(validateCli.status,1); assert.match(`${validateCli.stdout}\n${validateCli.stderr}`,/Preference Custody v56 manifest must be an object/); assert.doesNotMatch(`${validateCli.stdout}\n${validateCli.stderr}`,/ENOENT|TypeError/); } finally { rmSync(temp,{recursive:true,force:true}); }
console.log(`validated Preference Custody floor v56 with ${manifestMutationCount} manifest mutations and ${buildMutationCount} build tamper checks`);
