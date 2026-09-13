import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
const smoke = fs.readFileSync('tools/smoke-public-routes.mjs', 'utf8');
const pagesValidator = fs.readFileSync('tools/validate-pages.mjs', 'utf8');
const scripts = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;
const count = (haystack, needle) => haystack.split(needle).length - 1;

assert.match(workflow, /timeout-minutes: 45/);
assert.equal(count(workflow, 'node tools\/smoke-public-routes\.mjs'.replaceAll('\\/', '/')), 2, 'local and deployed artifacts must use the same browser driver');
assert.match(workflow, /--base-url http:\/\/127\.0\.0\.1:8080\//);
assert.match(workflow, /--base-url "\$base_url"/);
assert.equal(count(workflow, 'CLIFFORD_CHROME="$chrome"'), 2);
assert.doesNotMatch(workflow, /--dump-dom/);
assert.doesNotMatch(workflow, /virtual-time-budget/);
assert.doesNotMatch(smoke, /^import\s+.*from ['"]playwright['"];?$/m);
assert.match(smoke, /await import\(['"]playwright['"]\)/);
assert.match(scripts['build:pages'], /build:estate-fanout && npm run validate:estate-fanout/);
assert.match(scripts.check, /build:artifact-manifest && npm run validate:artifact && npm run validate:pages/);
assert.match(pagesValidator, /const finalizationFiles = Object\.freeze/);
assert.match(pagesValidator, /if \(releaseFinalized\) validatePublicationArtifact/);
assert.match(pagesValidator, /pre-finalization pages/);
assert.match(workflow, /dist\/deployment-sha\.txt/);
assert.match(workflow, /release-artifact-manifest\.json/);
assert.match(workflow, /m\.source\?\.commit!==process\.env\.GITHUB_SHA/);
for (const route of [
  'explorer.html#desk/keir-starmer/matt-clifford/2025',
  'explorer.html#desk/demet-mutlu/matt-clifford',
  'explorer.html#desk/keir-starmer/matt-clifford/2020',
  'explorer.html#surface/dialog-public-directory-exposure-2026-06-16'
]) assert.ok(smoke.includes(route), `browser driver missing ${route}`);
for (const phrase of [
  'Documented: 1 step as of 2025',
  'No documented connection',
  'Not documented for 2020',
  'The 112-name roster is dense and semantically insufficient for pairwise topology.'
]) assert.ok(smoke.includes(phrase), `browser driver missing ${phrase}`);
assert.match(smoke, /setDefaultNavigationTimeout/);
assert.match(smoke, /horizontal overflow/);
assert.match(smoke, /keyboard focus did not enter the interface/);
assert.match(smoke, /reduced-motion contract not active/);
assert.match(smoke, /undeclared external requests/);
assert.match(smoke, /page\.goBack\(\)/);
assert.match(smoke, /page\.goForward\(\)/);

console.log('deploy-workflow.test: OK');
