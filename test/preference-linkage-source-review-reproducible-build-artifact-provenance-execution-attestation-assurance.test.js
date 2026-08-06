import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  compilePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture,
  EXPECTED_LINKAGE_SOURCE_REVIEW_REPRODUCIBLE_BUILD_ARTIFACT_PROVENANCE_EXECUTION_ATTESTATION_ASSURANCE_METRICS,
  preferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixtureSnapshot,
  validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceBuild,
  validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture
} from '../tools/lib/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs';
const load = path => JSON.parse(readFileSync(path, 'utf8'));
const clone = value => structuredClone(value);
const fixture = load('data/research/preference-custody/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.fixture.json');
const compiled = compilePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(fixture);
const buildPath = 'build/research/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.json';
const build = existsSync(buildPath) ? load(buildPath) : compiled;
assert.deepEqual(validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(fixture), []);
assert.deepEqual(validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceBuild(build, fixture), []);
assert.deepEqual(compiled, build);
assert.equal(preferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixtureSnapshot(fixture), '7ba91374f3d82f4202925c2b8dbde1a8b907e0f3940a31d8681d08e9fdd21fee');
assert.deepEqual(build.metrics, EXPECTED_LINKAGE_SOURCE_REVIEW_REPRODUCIBLE_BUILD_ARTIFACT_PROVENANCE_EXECUTION_ATTESTATION_ASSURANCE_METRICS);
assert.equal(build.world_count, 8); assert.equal(build.public_signature_count, 1); assert.equal(build.assurance_governance_signature_count, 8); assert.equal(build.complete_assurance_world_count, 1);
assert.equal(build.graph_effect, 'none'); assert.equal(build.counts_toward_thesis_evidence, false); assert.equal(build.classification.security_compromise_established, false);
const mutateLeaf = value => { if (typeof value === 'boolean') return !value; if (typeof value === 'number') return Number.isInteger(value) ? value + 1 : value + 0.01; if (typeof value === 'string') return `${value}__mutation`; if (value === null) return 'mutation'; throw new Error(`unsupported leaf ${typeof value}`); };
function leaves(value, path = []) { if (value === null || typeof value !== 'object') return [{ path, value }]; const output=[]; if (Array.isArray(value)) value.forEach((item,index)=>output.push(...leaves(item,[...path,index]))); else Object.entries(value).forEach(([key,item])=>output.push(...leaves(item,[...path,key]))); return output; }
function setAt(root,path,value) { let cursor=root; for (const key of path.slice(0,-1)) cursor=cursor[key]; cursor[path.at(-1)]=value; }
function fixtureRefused(candidate,label) { const errors=validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(candidate); assert.ok(errors.length>0,`${label} must be refused`); assert.throws(()=>compilePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(candidate), error => error instanceof Error && !(error instanceof TypeError), `${label} compile must refuse without TypeError`); }
function buildRefused(candidate,label) { const errors=validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceBuild(candidate,fixture); assert.ok(errors.length>0,`${label} must be refused`); }
let fixtureMutationCount=0;
for (const {path,value} of leaves(fixture)) { const candidate=clone(fixture); setAt(candidate,path,mutateLeaf(value)); fixtureRefused(candidate,`fixture leaf ${path.join('.')}`); fixtureMutationCount+=1; }
assert.ok(fixtureMutationCount>=850,`expected broad fixture mutation census, observed ${fixtureMutationCount}`);
const aggregate=clone(fixture); aggregate.worlds[1].source_review.source_scope_unbound_executions-=1; aggregate.worlds[2].build_reproducibility.build_recipe_toolchain_divergent_executions+=1; fixtureRefused(aggregate,'aggregate-preserving burden redistribution');
const partial=clone(fixture); partial.worlds[4].artifact_provenance.package_identity_bound=true; fixtureRefused(partial,'partial state mutation preserving coarse incompleteness');
const reordered=clone(fixture); [reordered.worlds[1],reordered.worlds[2]]=[reordered.worlds[2],reordered.worlds[1]]; fixtureRefused(reordered,'world reordering');
const extra=clone(fixture); extra.unapproved=true; fixtureRefused(extra,'extra top-level field');
const nested=clone(fixture); nested.worlds[0].source_review.unapproved=true; fixtureRefused(nested,'extra nested field');
const missing=clone(fixture); delete missing.worlds[0].source_review.repository_bound; fixtureRefused(missing,'missing nested field');
const duplicate=clone(fixture); duplicate.required_refusal_rules.push(duplicate.required_refusal_rules[0]); fixtureRefused(duplicate,'duplicated refusal rule');
const cyclic=clone(fixture); cyclic.self=cyclic; fixtureRefused(cyclic,'cyclic fixture');
const aliased=clone(fixture); aliased.worlds[1].source_review=aliased.worlds[0].source_review; fixtureRefused(aliased,'cross-world alias');
const nonCanonical=clone(fixture); Object.setPrototypeOf(nonCanonical.worlds[0],null); fixtureRefused(nonCanonical,'custom prototype');
const sparse=clone(fixture); delete sparse.worlds[3]; fixtureRefused(sparse,'sparse array');
const accessor=clone(fixture); Object.defineProperty(accessor.baseline,'approved_use',{enumerable:true,get(){return 'longitudinal_exposure_estimation';}}); fixtureRefused(accessor,'accessor');
const proxied=new Proxy(clone(fixture),{ownKeys(){throw new Error('opaque');}}); assert.doesNotThrow(()=>validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(proxied)); fixtureRefused(proxied,'proxy fixture');
const nestedProxy=clone(fixture); nestedProxy.baseline=new Proxy(nestedProxy.baseline,{get(target,property,receiver){if(property==='approved_use')throw new Error('opaque');return Reflect.get(target,property,receiver);}}); assert.doesNotThrow(()=>validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(nestedProxy)); fixtureRefused(nestedProxy,'nested proxy');
const lengthProxy=clone(fixture); lengthProxy.worlds=new Proxy(lengthProxy.worlds,{get(target,property,receiver){if(property==='length')throw new Error('opaque');return Reflect.get(target,property,receiver);}}); assert.doesNotThrow(()=>validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(lengthProxy)); fixtureRefused(lengthProxy,'array length proxy');
for (const malformed of [null,0,'invalid',false,[]]) { assert.doesNotThrow(()=>validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(malformed)); fixtureRefused(malformed,`malformed fixture ${String(malformed)}`); }
for (const field of ['baseline','interpretation_contract','expected_classification']) for (const replacement of [null,0]) { const candidate=clone(fixture); candidate[field]=replacement; assert.doesNotThrow(()=>validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(candidate)); fixtureRefused(candidate,`${field} ${replacement}`); }
for (const field of ['required_refusal_rules','worlds']) for (const replacement of [null,0]) { const candidate=clone(fixture); candidate[field]=replacement; assert.doesNotThrow(()=>validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(candidate)); fixtureRefused(candidate,`${field} ${replacement}`); }
const nullWorld=clone(fixture); nullWorld.worlds[0]=null; assert.doesNotThrow(()=>validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(nullWorld)); fixtureRefused(nullWorld,'null world');
for (const field of ["source_review","build_reproducibility","independent_reproduction","artifact_provenance","execution_attestation","governance","expected_flags"]) for (const replacement of [null,0]) { const candidate=clone(fixture); candidate.worlds[0][field]=replacement; assert.doesNotThrow(()=>validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(candidate)); fixtureRefused(candidate,`world ${field} ${replacement}`); }
const temp=mkdtempSync(join(tmpdir(),'pc51-null-fixture-'));
try { const nullPath=join(temp,'null.json'); const missingBuild=join(temp,'missing.json'); writeFileSync(nullPath,'null\n');
  const compileCli=spawnSync(process.execPath,['tools/compile-preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs',nullPath,join(temp,'out.json'),join(temp,'out.md')],{encoding:'utf8'}); assert.equal(compileCli.status,1); assert.match(`${compileCli.stdout}
${compileCli.stderr}`,/PC-51 fixture must be an object/); assert.doesNotMatch(`${compileCli.stdout}
${compileCli.stderr}`,/TypeError/);
  const validateCli=spawnSync(process.execPath,['tools/validate-preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs',nullPath,missingBuild],{encoding:'utf8'}); assert.equal(validateCli.status,1); assert.match(validateCli.stderr,/PC-51 fixture must be an object/); assert.doesNotMatch(`${validateCli.stdout}
${validateCli.stderr}`,/TypeError|ENOENT/);
} finally { rmSync(temp,{recursive:true,force:true}); }
let buildMutationCount=0; const buildLeaves=leaves(build); const stride=Math.max(1,Math.floor(buildLeaves.length/220));
for (let index=0;index<buildLeaves.length;index+=stride) { const {path,value}=buildLeaves[index]; const candidate=clone(build); setAt(candidate,path,mutateLeaf(value)); buildRefused(candidate,`build leaf ${path.join('.')}`); buildMutationCount+=1; }
assert.ok(buildMutationCount>=180,`expected broad build tamper coverage, observed ${buildMutationCount}`);
for (const field of ['worlds','required_refusal_rules','custody_chain','baseline','metrics','classification','interpretation_contract']) { const candidate=clone(build); candidate[field]=0; assert.doesNotThrow(()=>validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceBuild(candidate,fixture)); buildRefused(candidate,`scalar ${field}`); }
for (const malformed of [null,0,'invalid',false,[]]) { assert.doesNotThrow(()=>validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceBuild(malformed,fixture)); buildRefused(malformed,`malformed build ${String(malformed)}`); }
const buildAlias=clone(build); buildAlias.worlds[1].flags=buildAlias.worlds[0].flags; buildRefused(buildAlias,'aliased build flags');
const authority=clone(build); authority.worlds[0].governance.binding_public_authority=true; buildRefused(authority,'authority substitution');
console.log(`validated PC-51 standalone fixture with ${fixtureMutationCount} fixture mutations and ${buildMutationCount} build tamper checks`);
