import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
const smoke = fs.readFileSync('tools/smoke-public-routes.mjs', 'utf8');
const count = (haystack, needle) => haystack.split(needle).length - 1;

assert.match(workflow, /timeout-minutes: 45/);
assert.equal(count(workflow, 'node tools\/smoke-public-routes\.mjs'.replaceAll('\\/', '/')), 2, 'local and deployed artifacts must use the same browser driver');
assert.match(workflow, /--base-url http:\/\/127\.0\.0\.1:8080\//);
assert.match(workflow, /--base-url "\$base_url"/);
assert.equal(count(workflow, 'CLIFFORD_CHROME="$chrome"'), 2);
assert.doesNotMatch(workflow, /--dump-dom/);
assert.doesNotMatch(workflow, /virtual-time-budget/);
assert.match(workflow, /dist\/deployment-sha\.txt/);
assert.match(workflow, /release-artifact-manifest\.json/);
assert.match(workflow, /m\.source\?\.commit!==process\.env\.GITHUB_SHA/);
for (const route of [
  '#desk/keir-starmer/matt-clifford/2025',
  '#desk/demet-mutlu/matt-clifford',
  '#desk/keir-starmer/matt-clifford/2020',
  '#surface/dialog-public-directory-exposure-2026-06-16'
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
