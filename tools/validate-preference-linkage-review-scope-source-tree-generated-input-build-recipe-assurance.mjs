import { readFileSync } from 'node:fs';
import { validatePreferenceLinkageReviewScopeSourceTreeGeneratedInputBuildRecipeAssuranceFixture, validatePreferenceLinkageReviewScopeSourceTreeGeneratedInputBuildRecipeAssuranceBuild } from './lib/preference-linkage-review-scope-source-tree-generated-input-build-recipe-assurance.mjs';
const fixturePath=process.argv[2]??'data/research/preference-custody/preference-linkage-review-scope-source-tree-generated-input-build-recipe-assurance.fixture.json';
const buildPath=process.argv[3]??'build/research/preference-linkage-review-scope-source-tree-generated-input-build-recipe-assurance.json';
const fixture=JSON.parse(readFileSync(fixturePath,'utf8'));
const fixtureErrors=validatePreferenceLinkageReviewScopeSourceTreeGeneratedInputBuildRecipeAssuranceFixture(fixture);
if(fixtureErrors.length){console.error(fixtureErrors.map(error=>`- ${error}`).join('\n'));process.exit(1);}
let build;try{build=JSON.parse(readFileSync(buildPath,'utf8'));}catch(error){console.error(`- PC-52 build could not be read: ${error.message}`);process.exit(1);}
const errors=validatePreferenceLinkageReviewScopeSourceTreeGeneratedInputBuildRecipeAssuranceBuild(build,fixture);if(errors.length){console.error(errors.map(error=>`- ${error}`).join('\n'));process.exit(1);}
console.log(`validated ${build.fixture_id} from ${buildPath}`);
