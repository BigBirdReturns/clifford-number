import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildTimestamp, readBuildClock } from './build-clock.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PUBLICATION_POLICY_SCHEMA = 'clifford-publication-allowlist@1';
export const PUBLICATION_POLICY_PATH = 'data/project/publication-allowlist.json';
export const ARTIFACT_MANIFEST_SCHEMA = 'clifford-release-artifact-manifest@1';
export const ARTIFACT_MANIFEST_PATH = 'release-artifact-manifest.json';
export const DEPLOYMENT_SHA_PATH = 'deployment-sha.txt';

const lexical = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

export function isSafePublicationPath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\\') || value.includes('\0')) return false;
  if (path.posix.isAbsolute(value) || value.endsWith('/')) return false;
  if (path.posix.normalize(value) !== value) return false;
  const parts = value.split('/');
  return !parts.some(part => part === '' || part === '.' || part === '..');
}

export function matchesHeldRule(relativePath, rule) {
  if (!rule || typeof rule.value !== 'string') return false;
  if (rule.kind === 'exact') return relativePath === rule.value;
  if (rule.kind === 'prefix') return relativePath.startsWith(rule.value);
  if (rule.kind === 'substring') return relativePath.toLowerCase().includes(rule.value.toLowerCase());
  throw new Error(`unsupported publication held rule ${JSON.stringify(rule.kind)}`);
}

export function validatePublicationPolicy(policy) {
  if (!policy || policy.schema_version !== PUBLICATION_POLICY_SCHEMA) {
    throw new Error(`publication policy must use ${PUBLICATION_POLICY_SCHEMA}`);
  }
  if (!Array.isArray(policy.paths) || policy.paths.length === 0) throw new Error('publication policy paths must be nonempty');
  const sorted = [...policy.paths].sort(lexical);
  if (JSON.stringify(sorted) !== JSON.stringify(policy.paths)) throw new Error('publication policy paths must be lexically sorted');
  if (new Set(policy.paths).size !== policy.paths.length) throw new Error('publication policy paths must be unique');
  for (const relativePath of policy.paths) {
    if (!isSafePublicationPath(relativePath)) throw new Error(`unsafe publication path ${JSON.stringify(relativePath)}`);
  }
  const generated = policy.generated_paths ?? {};
  for (const [relativePath, producer] of Object.entries(generated)) {
    if (!policy.paths.includes(relativePath)) throw new Error(`generated path is not allowlisted: ${relativePath}`);
    if (typeof producer !== 'string' || !producer) throw new Error(`generated path lacks a producer: ${relativePath}`);
  }
  const overrides = policy.source_overrides ?? {};
  for (const [target, source] of Object.entries(overrides)) {
    if (!policy.paths.includes(target)) throw new Error(`source override target is not allowlisted: ${target}`);
    if (!isSafePublicationPath(source)) throw new Error(`unsafe publication source override: ${source}`);
  }
  const heldExact = policy.held_exact_paths ?? [];
  const heldRules = policy.held_rules ?? [];
  for (const relativePath of policy.paths) {
    if (heldExact.includes(relativePath)) throw new Error(`held path is allowlisted: ${relativePath}`);
    for (const rule of heldRules) {
      if (matchesHeldRule(relativePath, rule)) throw new Error(`held rule ${rule.kind}:${rule.value} matches allowlisted path ${relativePath}`);
    }
  }
  for (const required of [PUBLICATION_POLICY_PATH, ARTIFACT_MANIFEST_PATH, DEPLOYMENT_SHA_PATH, '.nojekyll']) {
    if (!policy.paths.includes(required)) throw new Error(`publication policy is missing required path ${required}`);
  }
  const budgets = policy.performance_budgets;
  for (const key of ['max_files', 'max_total_bytes', 'max_single_file_bytes', 'max_initial_shell_bytes', 'max_standalone_bytes']) {
    if (!Number.isSafeInteger(budgets?.[key]) || budgets[key] <= 0) throw new Error(`invalid publication budget ${key}`);
  }
  if (!Array.isArray(budgets.initial_shell_paths) || budgets.initial_shell_paths.length === 0) {
    throw new Error('publication budget initial_shell_paths must be nonempty');
  }
  return policy;
}

export function readPublicationPolicy({ root = defaultRoot } = {}) {
  const bytes = fs.readFileSync(path.join(root, PUBLICATION_POLICY_PATH));
  const policy = validatePublicationPolicy(JSON.parse(bytes.toString('utf8')));
  return { policy, bytes, sha256: sha256(bytes) };
}

export function listArtifactFiles(destination) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`publication artifact contains symlink: ${path.relative(destination, absolute)}`);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) files.push(path.relative(destination, absolute).split(path.sep).join('/'));
      else throw new Error(`publication artifact contains unsupported entry: ${path.relative(destination, absolute)}`);
    }
  }
  if (!fs.existsSync(destination)) throw new Error(`publication artifact is missing: ${destination}`);
  visit(destination);
  return files.sort(lexical);
}

export function validateArtifactPathSet(policy, actualPaths, { manifestMayBeMissing = false } = {}) {
  const expected = policy.paths.filter(relativePath => !(manifestMayBeMissing && relativePath === ARTIFACT_MANIFEST_PATH));
  const actual = [...actualPaths].sort(lexical);
  const missing = expected.filter(relativePath => !actual.includes(relativePath));
  const extra = actual.filter(relativePath => !expected.includes(relativePath));
  if (missing.length || extra.length) {
    throw new Error(`publication artifact path drift; missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`);
  }
  return { expected: expected.length, actual: actual.length };
}

export function computeArtifactEntries(destination, relativePaths) {
  return [...relativePaths].sort(lexical).map(relativePath => {
    const bytes = fs.readFileSync(path.join(destination, ...relativePath.split('/')));
    return { path: relativePath, bytes: bytes.length, sha256: sha256(bytes) };
  });
}

export function computePayloadDigest(entries) {
  const inventory = entries.map(entry => `${entry.sha256}  ${entry.bytes}  ${entry.path}\n`).join('');
  return sha256(Buffer.from(inventory, 'utf8'));
}

function scanArtifactText(destination, entries) {
  const forbidden = [
    ['Windows project path', /(?:^|[^A-Za-z0-9])(?:[A-Za-z]:[\\/]Projects[\\/])/u],
    ['Estate home path', /\/home\/octo(?:\/|\b)/u],
    ['private key material', /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/u],
    ['GitHub token', /(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]{20,}/u]
  ];
  for (const entry of entries) {
    if (entry.bytes > 16 * 1024 * 1024) continue;
    const bytes = fs.readFileSync(path.join(destination, ...entry.path.split('/')));
    if (bytes.includes(0)) continue;
    const text = bytes.toString('utf8');
    for (const [label, pattern] of forbidden) {
      if (pattern.test(text)) throw new Error(`publication artifact exposes ${label} in ${entry.path}`);
    }
  }
}

function enforceBudgets(policy, entries) {
  const budgets = policy.performance_budgets;
  const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  const largest = entries.reduce((best, entry) => entry.bytes > best.bytes ? entry : best, { path: '', bytes: 0 });
  const byPath = new Map(entries.map(entry => [entry.path, entry]));
  const initialShellBytes = budgets.initial_shell_paths.reduce((sum, relativePath) => {
    const entry = byPath.get(relativePath);
    if (!entry) throw new Error(`initial-shell budget path is missing: ${relativePath}`);
    return sum + entry.bytes;
  }, 0);
  const standaloneBytes = entries.filter(entry => /(?:^|\/)Clifford-.*-standalone\.html$/u.test(entry.path) || entry.path === 'Clifford-Number-standalone.html')
    .reduce((max, entry) => Math.max(max, entry.bytes), 0);
  if (entries.length > budgets.max_files) throw new Error(`publication file budget exceeded: ${entries.length} > ${budgets.max_files}`);
  if (totalBytes > budgets.max_total_bytes) throw new Error(`publication byte budget exceeded: ${totalBytes} > ${budgets.max_total_bytes}`);
  if (largest.bytes > budgets.max_single_file_bytes) throw new Error(`single-file budget exceeded by ${largest.path}: ${largest.bytes} > ${budgets.max_single_file_bytes}`);
  if (initialShellBytes > budgets.max_initial_shell_bytes) throw new Error(`initial-shell budget exceeded: ${initialShellBytes} > ${budgets.max_initial_shell_bytes}`);
  if (standaloneBytes > budgets.max_standalone_bytes) throw new Error(`standalone budget exceeded: ${standaloneBytes} > ${budgets.max_standalone_bytes}`);
  return { files: entries.length, total_bytes: totalBytes, largest_file: largest, initial_shell_bytes: initialShellBytes, largest_standalone_bytes: standaloneBytes };
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function finalizePublicationArtifact({ root = defaultRoot, destination = path.join(root, 'dist') } = {}) {
  const trackedDrift = git(root, ['status', '--porcelain=v1', '--untracked-files=no']);
  if (trackedDrift) throw new Error(`refusing to bind artifact from tracked working-tree drift:\n${trackedDrift}`);
  const { policy, sha256: policySha256 } = readPublicationPolicy({ root });
  const sourceCommit = git(root, ['rev-parse', 'HEAD^{commit}']);
  const sourceTree = git(root, ['rev-parse', 'HEAD^{tree}']);
  if (!/^[0-9a-f]{40}$/u.test(sourceCommit) || !/^[0-9a-f]{40}$/u.test(sourceTree)) throw new Error('cannot resolve exact source identity');
  fs.writeFileSync(path.join(destination, DEPLOYMENT_SHA_PATH), `${sourceCommit}\n`);
  fs.rmSync(path.join(destination, ARTIFACT_MANIFEST_PATH), { force: true });
  const actual = listArtifactFiles(destination);
  validateArtifactPathSet(policy, actual, { manifestMayBeMissing: true });
  const entries = computeArtifactEntries(destination, actual);
  scanArtifactText(destination, entries);
  const observedBudgets = enforceBudgets(policy, entries);
  const clock = readBuildClock({ root });
  const packageVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  const manifest = {
    schema_version: ARTIFACT_MANIFEST_SCHEMA,
    product: 'Clifford Number',
    version: packageVersion,
    generated: buildTimestamp({ clock, env: {} }),
    source: { repository: 'BigBirdReturns/clifford-number', commit: sourceCommit, tree: sourceTree },
    build_clock: { path: 'data/project/build-clock.json', timestamp: clock.timestamp, source_date_epoch: clock.source_date_epoch, not_evidence_date: true },
    publication_allowlist: { path: PUBLICATION_POLICY_PATH, sha256: policySha256, path_count: policy.paths.length },
    payload: {
      manifest_self_included: false,
      file_count: entries.length,
      total_bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
      sha256: computePayloadDigest(entries)
    },
    performance: observedBudgets,
    files: entries,
    interpretation_contract: {
      what_this_is: 'The exact content inventory for the tested Clifford Number static release artifact.',
      what_this_is_not: 'A claim that every repository object is published, externally reviewed, independently adjudicated, current beyond its own dated receipts, or free of declared research frontiers.'
    }
  };
  fs.writeFileSync(path.join(destination, ARTIFACT_MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
  return validatePublicationArtifact({ root, destination });
}

export function validatePublicationArtifact({ root = defaultRoot, destination = path.join(root, 'dist') } = {}) {
  const { policy, sha256: policySha256 } = readPublicationPolicy({ root });
  const actual = listArtifactFiles(destination);
  validateArtifactPathSet(policy, actual);
  const manifest = JSON.parse(fs.readFileSync(path.join(destination, ARTIFACT_MANIFEST_PATH), 'utf8'));
  if (manifest.schema_version !== ARTIFACT_MANIFEST_SCHEMA) throw new Error(`artifact manifest must use ${ARTIFACT_MANIFEST_SCHEMA}`);
  const sourceCommit = git(root, ['rev-parse', 'HEAD^{commit}']);
  const sourceTree = git(root, ['rev-parse', 'HEAD^{tree}']);
  if (manifest.source?.commit !== sourceCommit || manifest.source?.tree !== sourceTree) throw new Error('artifact manifest source identity does not match checked-out revision');
  if (fs.readFileSync(path.join(destination, DEPLOYMENT_SHA_PATH), 'utf8').trim() !== sourceCommit) throw new Error('deployment-sha.txt is not bound to the source commit');
  if (manifest.publication_allowlist?.sha256 !== policySha256 || manifest.publication_allowlist?.path_count !== policy.paths.length) throw new Error('artifact manifest publication allowlist identity drift');
  const payloadPaths = actual.filter(relativePath => relativePath !== ARTIFACT_MANIFEST_PATH);
  const entries = computeArtifactEntries(destination, payloadPaths);
  if (JSON.stringify(entries) !== JSON.stringify(manifest.files)) throw new Error('artifact manifest file inventory or digest drift');
  const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  if (manifest.payload?.file_count !== entries.length || manifest.payload?.total_bytes !== totalBytes || manifest.payload?.sha256 !== computePayloadDigest(entries)) throw new Error('artifact manifest payload summary drift');
  scanArtifactText(destination, entries);
  const observedBudgets = enforceBudgets(policy, entries);
  if (JSON.stringify(observedBudgets) !== JSON.stringify(manifest.performance)) throw new Error('artifact manifest performance observation drift');
  return { manifest, policy, observedBudgets, manifest_sha256: sha256(fs.readFileSync(path.join(destination, ARTIFACT_MANIFEST_PATH))) };
}
