#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const publicationPlanPath = 'data/project/publication-plan.json';
export const publicationManifestName = 'publication-manifest.json';
const textExtensions = new Set(['.html', '.css', '.js', '.mjs', '.json', '.md', '.svg', '.txt', '.xml']);
const allowedEntryStatuses = new Set(['public']);
const allowedHeldStatuses = new Set(['staged_nonpublic', 'retired_public_route_product', 'internal_compatibility_only', 'blocked', 'private']);

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => `${JSON.stringify(value, null, 2)}\n`;
const posix = value => value.replaceAll('\\', '/');

function readJson(root, relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function normalizeRepositoryPath(value, label = 'path') {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label}: expected a non-empty repository-relative path`);
  if (value.includes('\\')) throw new Error(`${label}: backslashes are not permitted`);
  if (value.startsWith('/') || /^[A-Za-z]:/.test(value)) throw new Error(`${label}: absolute paths are not permitted`);
  const clean = path.posix.normalize(value.replace(/^\.\//, ''));
  if (!clean || clean === '.' || clean === '..' || clean.startsWith('../') || clean.includes('/../')) throw new Error(`${label}: path traversal is not permitted`);
  return clean;
}

function isUnder(relative, prefix) {
  const cleanPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
  return relative === prefix.replace(/\/$/, '') || relative.startsWith(cleanPrefix);
}

function localReference(raw) {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) return null;
  const withoutFragment = value.split('#')[0].split('?')[0];
  if (!withoutFragment) return null;
  try { return decodeURIComponent(withoutFragment); }
  catch { throw new Error(`invalid percent-encoding in local reference: ${value}`); }
}

function extractReferences(relative, source) {
  const extension = path.posix.extname(relative).toLowerCase();
  const values = [];
  if (extension === '.html') {
    for (const pattern of [/\b(?:src|href)=["']([^"']+)["']/gi, /\bsrcset=["']([^"']+)["']/gi]) {
      let match;
      while ((match = pattern.exec(source))) {
        if (pattern.source.includes('srcset')) {
          for (const candidate of match[1].split(',')) values.push(candidate.trim().split(/\s+/)[0]);
        } else values.push(match[1]);
      }
    }
  } else if (extension === '.css') {
    for (const pattern of [/url\(\s*["']?([^"')]+)["']?\s*\)/gi, /@import\s+["']([^"']+)["']/gi]) {
      let match;
      while ((match = pattern.exec(source))) values.push(match[1]);
    }
  } else if (extension === '.js' || extension === '.mjs') {
    for (const pattern of [
      /\b(?:import|export)\s+(?:[^'\"]*?\s+from\s+)?["']([^"']+)["']/g,
      /\bimport\(\s*["']([^"']+)["']\s*\)/g,
      /\b(?:fetch|loadJson)\(\s*["']([^"']+)["']/g,
      /\bnew URL\(\s*["']([^"']+)["']/g,
    ]) {
      let match;
      while ((match = pattern.exec(source))) values.push(match[1]);
    }
  }
  return values;
}

function resolveReference(root, fromRelative, raw) {
  const reference = localReference(raw);
  if (!reference) return null;
  const joined = reference.startsWith('/')
    ? normalizeRepositoryPath(reference.slice(1), `${fromRelative} reference`)
    : normalizeRepositoryPath(path.posix.join(path.posix.dirname(fromRelative), reference), `${fromRelative} reference`);
  const absolute = path.join(root, joined);
  if (fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()) {
    const index = path.posix.join(joined, 'index.html');
    if (fs.existsSync(path.join(root, index))) return index;
  }
  return joined;
}

function getNested(record, dotted) {
  let value = record;
  for (const key of dotted.split('.')) value = value?.[key];
  return value;
}

function listFiles(root) {
  const files = [];
  if (!fs.existsSync(root)) return files;
  const visit = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile()) files.push(posix(path.relative(root, target)));
    }
  };
  visit(root);
  return files.sort();
}

function gitHead(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

export function loadPublicationPlan(root = moduleRoot) {
  return readJson(root, publicationPlanPath);
}

export function validatePublicationPlan(plan, { root = moduleRoot } = {}) {
  const failures = [];
  const fail = message => failures.push(message);
  if (plan?.schema_version !== 'clifford-publication-plan@1') fail('unexpected publication-plan schema');
  if (plan?.status !== 'active_status_aware_positive_allowlist') fail('publication plan is not active');
  if (plan?.default_decision !== 'exclude') fail('publication plan must default to exclude');
  const entryPaths = new Set();
  for (const [index, entry] of (plan?.entries || []).entries()) {
    let relative;
    try { relative = normalizeRepositoryPath(entry.path, `entries[${index}].path`); }
    catch (error) { fail(error.message); continue; }
    if (entryPaths.has(relative)) fail(`duplicate publication entry: ${relative}`);
    entryPaths.add(relative);
    if (entry.kind !== 'file') fail(`${relative}: only exact file entries are permitted`);
    if (!allowedEntryStatuses.has(entry.status)) fail(`${relative}: unsupported public status ${entry.status}`);
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) fail(`${relative}: public source file is missing`);
  }
  const heldPaths = new Set();
  for (const [index, entry] of (plan?.held_surfaces || []).entries()) {
    let relative;
    try { relative = normalizeRepositoryPath(entry.path, `held_surfaces[${index}].path`); }
    catch (error) { fail(error.message); continue; }
    if (heldPaths.has(relative)) fail(`duplicate held surface: ${relative}`);
    heldPaths.add(relative);
    if (!allowedHeldStatuses.has(entry.status)) fail(`${relative}: unsupported held status ${entry.status}`);
    if (entry.may_publish_to_github_pages !== false) fail(`${relative}: held surface must explicitly refuse GitHub Pages publication`);
    if (entry.graph_effect !== 'none') fail(`${relative}: held surface cannot create graph authority`);
    if ([...entryPaths].some(item => item === relative || isUnder(item, relative))) fail(`${relative}: held surface overlaps a public entry`);
  }
  for (const [index, value] of (plan?.allowed_dependency_prefixes || []).entries()) {
    try {
      const clean = normalizeRepositoryPath(value, `allowed_dependency_prefixes[${index}]`);
      if (!value.endsWith('/')) fail(`${clean}: dependency prefix must end in /`);
    } catch (error) { fail(error.message); }
  }
  for (const [index, value] of (plan?.generated_outputs || []).entries()) {
    try { normalizeRepositoryPath(value, `generated_outputs[${index}]`); }
    catch (error) { fail(error.message); }
  }
  for (const [index, value] of (plan?.forbidden_dist_paths || []).entries()) {
    try { normalizeRepositoryPath(value, `forbidden_dist_paths[${index}]`); }
    catch (error) { fail(error.message); }
  }
  for (const [index, value] of (plan?.forbidden_dist_prefixes || []).entries()) {
    try {
      const clean = normalizeRepositoryPath(value, `forbidden_dist_prefixes[${index}]`);
      if (!value.endsWith('/')) fail(`${clean}: forbidden prefix must end in /`);
    } catch (error) { fail(error.message); }
  }
  const guardKeys = new Set();
  for (const guard of plan?.catalog_guards || []) {
    let relative;
    try { relative = normalizeRepositoryPath(guard.path, 'catalog guard path'); }
    catch (error) { fail(error.message); continue; }
    const key = `${relative}::${guard.collection}`;
    if (guardKeys.has(key)) fail(`duplicate catalog guard ${key}`);
    guardKeys.add(key);
    if (!entryPaths.has(relative)) fail(`${key}: guarded catalog must be an explicit public entry`);
    if (!Array.isArray(guard.allowed_statuses) || !guard.allowed_statuses.length) fail(`${key}: allowed_statuses required`);
    if (guard.failure_mode !== 'fail_closed') fail(`${key}: catalog guard must fail closed`);
  }
  if (plan?.boundaries?.recursive_repository_copy_allowed !== false) fail('recursive repository publication is enabled');
  if (plan?.boundaries?.unclassified_dependency_allowed !== false) fail('unclassified dependencies are enabled');
  if (plan?.boundaries?.held_surface_is_deployed !== false) fail('held surface is represented as deployed');
  if (plan?.boundaries?.generic_edge_graph_is_public_route_product !== false) fail('generic edge graph is represented as public');
  if (plan?.boundaries?.graph_effect !== 'none') fail('publication plan graph effect drift');
  return { ok: failures.length === 0, failures };
}

function catalogPaths(root, plan) {
  const paths = [];
  for (const guard of plan.catalog_guards || []) {
    const catalog = readJson(root, guard.path);
    const rows = catalog[guard.collection];
    if (!Array.isArray(rows)) throw new Error(`${guard.path}#${guard.collection}: expected an array`);
    for (const record of rows) {
      const status = record?.[guard.status_field];
      if (!guard.allowed_statuses.includes(status)) {
        throw new Error(`${guard.path}#${guard.collection}:${record?.case_id || record?.track_id || 'unknown'} has non-public status ${status}`);
      }
      for (const key of guard.href_keys || []) {
        const value = record?.[key];
        if (value) paths.push(normalizeRepositoryPath(value, `${guard.collection}.${key}`));
      }
      for (const key of guard.nested_href_keys || []) {
        const value = getNested(record, key);
        if (value) paths.push(normalizeRepositoryPath(value, `${guard.collection}.${key}`));
      }
    }
  }
  return paths;
}

function allowedDependency(relative, explicit, plan) {
  if (explicit.has(relative)) return true;
  return (plan.allowed_dependency_prefixes || []).some(prefix => isUnder(relative, prefix));
}

export function resolvePublicSourcePaths({ root = moduleRoot, plan = loadPublicationPlan(root) } = {}) {
  const validation = validatePublicationPlan(plan, { root });
  if (!validation.ok) throw new Error(`publication plan invalid:\n${validation.failures.map(item => `- ${item}`).join('\n')}`);
  const explicit = new Set(plan.entries.filter(entry => entry.status === plan.public_status).map(entry => normalizeRepositoryPath(entry.path)));
  const queue = [...explicit, ...catalogPaths(root, plan)];
  const included = new Set();
  while (queue.length) {
    const relative = normalizeRepositoryPath(queue.shift());
    if (included.has(relative)) continue;
    if (!allowedDependency(relative, explicit, plan)) throw new Error(`${relative}: local dependency is not classified by the publication plan`);
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) throw new Error(`${relative}: classified public dependency is missing`);
    if ((plan.forbidden_dist_paths || []).includes(relative) || (plan.forbidden_dist_prefixes || []).some(prefix => isUnder(relative, prefix))) {
      throw new Error(`${relative}: classified dependency crosses a forbidden public boundary`);
    }
    included.add(relative);
    const extension = path.extname(relative).toLowerCase();
    if (!textExtensions.has(extension)) continue;
    const source = fs.readFileSync(absolute, 'utf8');
    for (const raw of extractReferences(relative, source)) {
      const dependency = resolveReference(root, relative, raw);
      if (!dependency) continue;
      const dependencyAbsolute = path.join(root, dependency);
      if (!fs.existsSync(dependencyAbsolute)) throw new Error(`${relative}: local dependency does not exist: ${raw} -> ${dependency}`);
      if (fs.statSync(dependencyAbsolute).isFile()) queue.push(dependency);
    }
  }
  return [...included].sort();
}

function copyFile(root, destination, relative) {
  const source = path.join(root, relative);
  const target = path.join(destination, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function computeManifest({ root, destination, plan, sourcePaths }) {
  const sourceSet = new Set(sourcePaths);
  const generatedSet = new Set(plan.generated_outputs || []);
  const files = listFiles(destination).filter(relative => relative !== publicationManifestName);
  const extras = files.filter(relative => relative !== '.nojekyll' && !sourceSet.has(relative) && !generatedSet.has(relative));
  if (extras.length) throw new Error(`dist contains unclassified files: ${extras.join(', ')}`);
  const missingSource = sourcePaths.filter(relative => !files.includes(relative));
  if (missingSource.length) throw new Error(`dist is missing classified public files: ${missingSource.join(', ')}`);
  for (const relative of files) {
    if ((plan.forbidden_dist_paths || []).includes(relative) || (plan.forbidden_dist_prefixes || []).some(prefix => isUnder(relative, prefix))) {
      throw new Error(`${relative}: forbidden path entered the public artifact`);
    }
  }
  for (const held of plan.held_surfaces || []) {
    const heldPath = normalizeRepositoryPath(held.path);
    if (files.some(relative => relative === heldPath || isUnder(relative, heldPath))) throw new Error(`${heldPath}: held surface entered the public artifact`);
  }
  const entries = files.map(relative => {
    const bytes = fs.readFileSync(path.join(destination, relative));
    return {
      path: relative,
      sha256: sha256(bytes),
      bytes: bytes.length,
      source: sourceSet.has(relative) ? relative : null,
      publication_status: sourceSet.has(relative) ? 'public' : 'generated_public_output',
    };
  });
  const planBytes = fs.readFileSync(path.join(root, publicationPlanPath));
  return {
    schema_version: 'clifford-publication-manifest@1',
    publication_id: plan.publication_id,
    as_of: plan.as_of,
    source_commit: gitHead(root),
    plan_path: publicationPlanPath,
    plan_sha256: sha256(planBytes),
    default_decision: plan.default_decision,
    entries,
    counts: {
      files: entries.length,
      source_files: entries.filter(entry => entry.source).length,
      generated_files: entries.filter(entry => !entry.source).length,
      held_surfaces: (plan.held_surfaces || []).length,
    },
    combined_sha256: sha256(entries.map(entry => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join('')),
    held_surfaces: plan.held_surfaces,
    boundaries: {
      recursive_repository_copy_allowed: false,
      unclassified_file_in_artifact: false,
      held_surface_is_deployed: false,
      generic_edge_graph_is_public_route_product: false,
      manifest_proves_substantive_truth: false,
      graph_effect: 'none',
    },
  };
}

export function refreshPublicationManifest({ root = moduleRoot, destination = path.join(root, 'dist') } = {}) {
  const plan = loadPublicationPlan(root);
  const sourcePaths = resolvePublicSourcePaths({ root, plan });
  const manifest = computeManifest({ root, destination, plan, sourcePaths });
  fs.writeFileSync(path.join(destination, publicationManifestName), stable(manifest));
  return manifest;
}

export function buildPublicationArtifact({ root = moduleRoot, destination = path.join(root, 'dist') } = {}) {
  const plan = loadPublicationPlan(root);
  const sourcePaths = resolvePublicSourcePaths({ root, plan });
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  for (const relative of sourcePaths) copyFile(root, destination, relative);
  fs.writeFileSync(path.join(destination, '.nojekyll'), '');
  const manifest = refreshPublicationManifest({ root, destination });
  return { plan, sourcePaths, manifest };
}

export function validatePublicationArtifact({ root = moduleRoot, destination = path.join(root, 'dist') } = {}) {
  const failures = [];
  const fail = message => failures.push(message);
  let plan;
  let sourcePaths;
  let expected;
  let committed;
  try {
    plan = loadPublicationPlan(root);
    const validation = validatePublicationPlan(plan, { root });
    failures.push(...validation.failures);
    sourcePaths = resolvePublicSourcePaths({ root, plan });
    expected = computeManifest({ root, destination, plan, sourcePaths });
    committed = readJson(destination, publicationManifestName);
  } catch (error) {
    fail(error.message);
    return { ok: false, failures };
  }
  if (JSON.stringify(expected) !== JSON.stringify(committed)) fail('publication manifest does not match the exact artifact');
  if (fs.existsSync(path.join(destination, 'graph.json'))) fail('retired generic edge graph is public');
  if (fs.existsSync(path.join(destination, 'legacy'))) fail('legacy edge models are public');
  if (fs.existsSync(path.join(destination, 'reports', 'core-thesis', 'poof-clifford-ecology'))) fail('staged POOF aperture is deployed through GitHub Pages');
  const builder = fs.readFileSync(path.join(root, 'tools', 'build-pages.mjs'), 'utf8');
  if (/cpSync|copyTree|for\s*\(\s*const\s+dir\s+of/.test(builder)) fail('Pages builder contains recursive corpus-copy machinery');
  return { ok: failures.length === 0, failures, manifest: committed };
}
