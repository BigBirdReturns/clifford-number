import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { compileFixture, renderMarkdown, validateBuild, validateFixture } from '../tools/lib/preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.mjs';
const path='data/research/preference-custody/preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.fixture.json';
const fixture=JSON.parse(readFileSync(path,'utf8'));
const clone=v=>structuredClone(v);
assert.deepEqual(validateFixture(fixture),[]);
const build=compileFixture(fixture); assert.deepEqual(validateBuild(build,fixture),[]);
mkdirSync('build/research',{recursive:true}); writeFileSync('build/research/preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.json',JSON.stringify(build,null,2)+'\n'); writeFileSync('build/research/preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.md',renderMarkdown(build));
let refusals=0; const refuse=(label,value,kind='fixture')=>{ const errors=kind==='fixture'?validateFixture(value):validateBuild(value,fixture); assert.ok(errors.length,`${label} should fail`); refusals++; };
for (const mutate of [
  f=>f.baseline.public_owner_login_status='owner_login_unknown',
  f=>f.worlds[1].login_identity.unicode_normalization_casefold_substitutions=99,
  f=>{f.worlds[1].login_identity.unicode_normalization_casefold_substitutions=90;f.worlds[2].login_identity.case_history_substitutions=100;},
  f=>f.worlds[2].description+=' altered',
  f=>f.worlds[3].alias_history.alias_registry_bound=true,
  f=>f.worlds[4].profile_location.profile_canonicalization_redirect_gaps=59,
  f=>f.worlds[5].api_location.api_version_identity_bound=true,
  f=>f.worlds[6].location_pair.profile_api_owner_id_pair_bound=true,
  f=>f.worlds[7].lineage.stale_login_location_decisions=99,
  f=>f.worlds[0].expected_flags.complete_profile_location=false,
  f=>f.required_refusal_rules.pop(),
  f=>f.expected_classification.ownership_established=true,
]) { const x=clone(fixture); mutate(x); refuse('fixture mutation',x); }
const negativeZero=clone(fixture); negativeZero.worlds[1].login_identity.unicode_normalization_casefold_substitutions=-0; refuse('negative zero',negativeZero);
const sparse=clone(fixture); sparse.worlds.length=9; delete sparse.worlds[8]; refuse('sparse array',sparse);
const named=clone(fixture); named.worlds.extra='x'; refuse('named array key',named);
const symbol=clone(fixture); symbol[Symbol('x')]=1; refuse('symbol key',symbol);
const accessor=clone(fixture); Object.defineProperty(accessor,'status',{get(){return 'synthetic_repository_owner_login_location_pair_control';},enumerable:true}); refuse('accessor',accessor);
const hidden=clone(fixture); Object.defineProperty(hidden,'hidden',{value:1,enumerable:false}); refuse('non-enumerable',hidden);
const custom=clone(fixture); Object.setPrototypeOf(custom,{}); refuse('custom prototype',custom);
const repeated=clone(fixture); repeated.worlds[1].login_identity=repeated.worlds[0].login_identity; refuse('repeated identity',repeated);
const cycle=clone(fixture); cycle.self=cycle; refuse('cycle',cycle);
const proxied=new Proxy(clone(fixture),{}); refuse('proxy',proxied);
const exotic=clone(fixture); exotic.baseline=new Map(); refuse('map',exotic);
const nan=clone(fixture); nan.worlds[1].login_identity.unicode_normalization_casefold_substitutions=NaN; refuse('nan',nan);
for (const mutate of [b=>b.metrics.worlds=9,b=>b.worlds[0].mechanism='changed',b=>b.custody_chain[1].event_sha256='0'.repeat(64),b=>b.graph_effect='present',b=>b.worlds.pop()]) { const x=clone(build); mutate(x); refuse('build mutation',x,'build'); }
const revised=clone(fixture); revised.captured_at='2026-08-10'; assert.ok(validateBuild(build,revised).length); refusals++;
assert.ok(refusals>=30);
console.log(`preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.test.js: OK (${refusals} adversarial refusals)`);
