import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const smoke = fs.readFileSync('tools/smoke-public-routes.mjs', 'utf8');
const pagesValidator = fs.readFileSync('tools/validate-pages.mjs', 'utf8');
const reporterValidator = fs.readFileSync('tools/validate-reporter-briefing-pages.mjs', 'utf8');
const reporterBrowser = fs.readFileSync('tools/verify-reporter-briefings-browser.cjs', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = packageJson.scripts;

// ---------------------------------------------------------------------------
// Workflow inventory contract. The repository keeps a handful of workflows;
// every one is either a release gate (pull_request / push to main), the Pages
// deploy, or a maintainer-dispatched tool. Nothing runs unattended on a
// schedule or in reaction to another workflow, and nothing merges or approves.
// ---------------------------------------------------------------------------
const workflowDir = '.github/workflows';
const stripComments = (text) => text.replace(/^[ \t]*#.*$/gm, '');
const workflows = Object.fromEntries(
  fs.readdirSync(workflowDir)
    .filter((name) => /\.ya?ml$/u.test(name))
    .map((name) => [name, fs.readFileSync(`${workflowDir}/${name}`, 'utf8')])
);

const contract = {
  'ci.yml': { triggers: ['pull_request', 'push', 'workflow_dispatch'], permissions: ['contents: read'] },
  'deploy.yml': { triggers: ['push', 'workflow_dispatch'], permissions: ['contents: read', 'id-token: write', 'pages: write'] },
  'update-sweep.yml': { triggers: ['workflow_dispatch'], permissions: ['contents: read'] },
  'crawl-official.yml': { triggers: ['workflow_dispatch'], permissions: ['contents: read'] },
  'crawl-industrial-exhaust.yml': { triggers: ['workflow_dispatch'], permissions: ['contents: read'] }
};
assert.deepEqual(Object.keys(workflows).sort(), Object.keys(contract).sort(), 'the workflow inventory is closed; add a contract row here to add a workflow');

const allowedNpm = new Set([
  'npm ci',
  'npm test',
  'npm run check',
  'npm run release:check',
  'npm run build:pages',
  'npm run compile',
  'npm run scout',
  'npm run crawl:audit',
  'npm run crawl:official',
  'npm run validate:crawl'
]);

for (const [name, source] of Object.entries(workflows)) {
  const code = stripComments(source);
  const row = contract[name];
  const triggerBlock = source.match(/^on:\n((?:(?: {2}.*|#.*)?\n)*)/m)?.[1] ?? '';
  const triggers = [...triggerBlock.matchAll(/^ {2}([a-z_]+):/gm)].map((match) => match[1]).sort();
  assert.deepEqual(triggers, row.triggers, `${name} triggers`);
  assert.doesNotMatch(code, /^\s*(?:schedule|workflow_run|workflow_call|pull_request_target|repository_dispatch):/m, `${name} must have no unattended or chained trigger`);

  const topPermissions = (source.match(/^permissions:\n((?: {2}.*\n)+)/m)?.[1] ?? '')
    .split('\n').map((line) => line.trim()).filter(Boolean).sort();
  assert.deepEqual(topPermissions, row.permissions, `${name} top-level permissions`);

  assert.doesNotMatch(code, /gh pr |gh workflow|gh run |\/merge\b|actions\/workflows|dispatches|--approve|[Aa]uto-?[Mm]erge/, `${name} must not merge, approve, auto-merge, or dispatch`);
  assert.doesNotMatch(code, /(?:^|\s)git push\b/, `${name} must not push from the workflow body`);

  for (const match of code.matchAll(/\bnpm (?:ci|test|run [A-Za-z0-9:_.-]+)/g)) {
    assert.ok(allowedNpm.has(match[0]), `${name} runs an npm command outside the allowed set: ${match[0]}`);
  }
  for (const match of code.matchAll(/(?:\.github\/scripts|tools|test)\/[A-Za-z0-9_./-]+\.(?:mjs|cjs|js|sh)/g)) {
    assert.ok(fs.existsSync(match[0]), `${name} references a missing file: ${match[0]}`);
  }
}

const ci = workflows['ci.yml'];
assert.match(ci, /^ {2}push:\n {4}branches: \[main\]\n/m, 'release checks must run on push to main');
assert.match(ci, /run: npm ci\n[\s\S]*run: npm run release:check\n/, 'release checks must install from the lockfile and run the release gate');

const workflow = workflows['deploy.yml'];
assert.match(workflow, /^ {2}push:\n {4}branches: \[main\]\n/m, 'deploy must run on push to main');
assert.match(workflow, /timeout-minutes: 45/);
assert.match(workflow, /node-version: '20'/, 'deploy must run on the Node major the package declares');
assert.ok(/"node": ">=20/.test(fs.readFileSync('package.json', 'utf8')), 'package engines must admit the workflow Node major');
const order = ['run: npm ci', 'run: npm run release:check', 'actions/upload-pages-artifact@v3', 'actions/deploy-pages@v4'].map((marker) => workflow.indexOf(marker));
assert.ok(order.every((index) => index >= 0) && order.every((index, i) => i === 0 || index > order[i - 1]), 'deploy must install, pass the release check, then upload and deploy');
assert.match(workflow, /path: dist\n/);

// The crawl workflows may open a pull request and nothing else; the helper
// behavior is exercised against fake git remotes and a fake GitHub CLI. Those
// fixtures run the real bash helpers, which need jq on PATH (CI on
// ubuntu-latest has it); where jq is missing the imported test skips them and
// says so, and the static workflow contract below still runs in full.
if (spawnSync('jq', ['--version'], { stdio: 'ignore' }).error) {
  console.log('deploy-workflow.test: jq not on PATH; the scheduled-crawl helper fixtures in scheduled-crawl-promotion.test.js are skipped here (CI has jq)');
}
await import('./scheduled-crawl-promotion.test.js');
await import('./scheduled-crawl-pr-identity.test.js');

// ---------------------------------------------------------------------------
// Browser driver, page validator and package contract.
// ---------------------------------------------------------------------------
assert.doesNotMatch(smoke, /^import\s+.*from ['"]playwright['"];?$/m);
assert.match(smoke, /await import\(['"]playwright['"]\)/);
assert.match(scripts['build:pages'], /build:estate-fanout && npm run validate:estate-fanout/);
assert.match(scripts.check, /build:artifact-manifest && npm run validate:artifact && npm run validate:pages/);
assert.match(pagesValidator, /const finalizationFiles = Object\.freeze/);
assert.match(pagesValidator, /if \(releaseFinalized\) validatePublicationArtifact/);
assert.match(pagesValidator, /pre-finalization pages/);
assert.match(packageJson.devDependencies.playwright, /^\d+\.\d+\.\d+$/u);
assert.match(reporterValidator, /Clifford-Number-explorer-standalone\.html/u);
assert.doesNotMatch(reporterValidator, /const standalone = read\('Clifford-Number-standalone\.html'\)/u);
assert.match(reporterBrowser, /127\.0\.0\.1:8080\/explorer\.html#case/u);
assert.match(reporterBrowser, /Clifford-Number-explorer-standalone\.html#case/u);
assert.doesNotMatch(reporterBrowser, /127\.0\.0\.1:8080\/#case/u);
assert.match(reporterBrowser, /#detail \.case-hero h1/u);
assert.match(app, /if \(document\.body\.dataset\.portableRelease\) return null;/u);
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
