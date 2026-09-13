import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
const smoke = fs.readFileSync('tools/smoke-public-routes.mjs', 'utf8');
const pagesValidator = fs.readFileSync('tools/validate-pages.mjs', 'utf8');
const reporterValidator = fs.readFileSync('tools/validate-reporter-briefing-pages.mjs', 'utf8');
const reporterBrowser = fs.readFileSync('tools/verify-reporter-briefings-browser.cjs', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = packageJson.scripts;
const workflowSources = fs.readdirSync('.github/workflows')
  .filter(name => /\.ya?ml$/u.test(name))
  .map(name => fs.readFileSync(`.github/workflows/${name}`, 'utf8'))
  .join('\n');
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
assert.match(packageJson.devDependencies.playwright, /^\d+\.\d+\.\d+$/u);
assert.doesNotMatch(workflowSources, /playwright@1\.55\.0|expected playwright 1\.55\.0/u);
for (const name of [
  'estate-closure-aperture.yml',
  'estate-frontier-game-trails.yml',
  'poof-clifford-ecology.yml',
  'reporter-briefings.yml',
  'visual-aperture-scale.yml'
]) {
  const source = fs.readFileSync(`.github/workflows/${name}`, 'utf8');
  assert.match(source, /npm ci/u, `${name} must install from the lockfile`);
  assert.match(source, /devDependencies\.playwright/u, `${name} must verify the declared Playwright version`);
}
assert.match(reporterValidator, /Clifford-Number-explorer-standalone\.html/u);
assert.doesNotMatch(reporterValidator, /const standalone = read\('Clifford-Number-standalone\.html'\)/u);
assert.match(reporterBrowser, /127\.0\.0\.1:8080\/explorer\.html#case/u);
assert.match(reporterBrowser, /Clifford-Number-explorer-standalone\.html#case/u);
assert.doesNotMatch(reporterBrowser, /127\.0\.0\.1:8080\/#case/u);
assert.match(reporterBrowser, /#detail \.case-hero h1/u);
assert.match(app, /if \(document\.body\.dataset\.portableRelease\) return null;/u);
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
