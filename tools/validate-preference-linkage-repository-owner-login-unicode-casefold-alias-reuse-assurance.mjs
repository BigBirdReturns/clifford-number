import { readFileSync } from 'node:fs';
import { validateBuild, validateFixture } from './lib/preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.mjs';
const fixturePath=process.argv[2]??'data/research/preference-custody/preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.fixture.json'; const buildPath=process.argv[3]??'build/research/preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.json';
let fixture; try { fixture=JSON.parse(readFileSync(fixturePath,'utf8')); } catch(e) { console.error(`- PC-61 fixture could not be read: ${e.message}`); process.exit(1); }
const fixtureErrors=validateFixture(fixture); if (fixtureErrors.length) { console.error(fixtureErrors.map(x=>`- ${x}`).join('\n')); process.exit(1); }
let build; try { build=JSON.parse(readFileSync(buildPath,'utf8')); } catch(e) { console.error(`- PC-61 build could not be read: ${e.message}`); process.exit(1); }
const errors=validateBuild(build,fixture); if (errors.length) { console.error(errors.map(x=>`- ${x}`).join('\n')); process.exit(1); } console.log(`validated ${fixture.fixture_id}`);
