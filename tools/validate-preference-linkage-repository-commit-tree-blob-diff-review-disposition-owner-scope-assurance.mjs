import { readFileSync } from 'node:fs';
import { validatePreferenceLinkageRepositoryCommitTreeBlobDiffReviewDispositionOwnerScopeAssuranceFixture, validatePreferenceLinkageRepositoryCommitTreeBlobDiffReviewDispositionOwnerScopeAssuranceBuild } from './lib/preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.mjs';
const fixturePath=process.argv[2]??'data/research/preference-custody/preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.fixture.json';
const buildPath=process.argv[3]??'build/research/preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.json';
const fixture=JSON.parse(readFileSync(fixturePath,'utf8'));
const fixtureErrors=validatePreferenceLinkageRepositoryCommitTreeBlobDiffReviewDispositionOwnerScopeAssuranceFixture(fixture);if(fixtureErrors.length){console.error(fixtureErrors.map(error=>`- ${error}`).join('\n'));process.exit(1);}
let build;try{build=JSON.parse(readFileSync(buildPath,'utf8'));}catch(error){console.error(`- PC-53 build could not be read: ${error.message}`);process.exit(1);}
const errors=validatePreferenceLinkageRepositoryCommitTreeBlobDiffReviewDispositionOwnerScopeAssuranceBuild(build,fixture);if(errors.length){console.error(errors.map(error=>`- ${error}`).join('\n'));process.exit(1);}
console.log(`validated ${build.fixture_id} from ${buildPath}`);
