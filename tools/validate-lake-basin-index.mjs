#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const errors = [];
const issue = message => errors.push(message);

function readJson(relative) {
  try { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
  catch (error) { issue(`${relative}: ${error.message}`); return null; }
}
function readJsonl(relative) {
  try {
    return fs.readFileSync(path.join(root, relative), 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
      try { return JSON.parse(line); }
      catch (error) { issue(`${relative}:${index + 1}: ${error.message}`); return null; }
    }).filter(Boolean);
  } catch (error) { issue(`${relative}: ${error.message}`); return []; }
}
function sha256File(relative) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
}
function sameSet(left = [], right = []) {
  return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());
}

const registry = readJson('data/project/lake-basin-registry.json');
const index = readJson('build/lake-index/basins.json');
const membership = readJsonl('build/lake-index/basin-membership.jsonl');
const gaps = readJsonl('build/lake-index/basin-gaps.jsonl');
const manifest = readJson('build/lake-index/basin-manifest.json');
const sourceRows = readJsonl('build/lake-index/files.jsonl');
const report = fs.existsSync(path.join(root, 'reports/lake-basin-index.md'))
  ? fs.readFileSync(path.join(root, 'reports/lake-basin-index.md'), 'utf8') : '';

if (registry?.schema_version !== 'lake-basin-registry@1') issue('registry schema must be lake-basin-registry@1');
if (index?.schema_version !== 'lake-basin-index@1') issue('index schema must be lake-basin-index@1');
if (manifest?.schema_version !== 'lake-basin-index-manifest@1') issue('manifest schema must be lake-basin-index-manifest@1');
if (index?.registry_id !== registry?.registry_id || manifest?.registry_id !== registry?.registry_id) issue('registry identifiers disagree');
if (index?.source_fingerprint !== manifest?.source_fingerprint) issue('index and manifest source fingerprints disagree');

const basinIds = new Set();
for (const basin of registry?.basins ?? []) {
  if (!basin.basin_id || basinIds.has(basin.basin_id)) issue(`missing or duplicate basin ${basin.basin_id}`);
  basinIds.add(basin.basin_id);
  if (!Array.isArray(basin.path_prefixes) || basin.path_prefixes.length === 0) issue(`${basin.basin_id}: path_prefixes required`);
  if (!basin.semantic_role || !basin.ownership_status || !basin.publication_disposition || !basin.retention_disposition) issue(`${basin.basin_id}: incomplete semantic disposition`);
  if (['generated_projection', 'report_projection', 'public_projection'].includes(basin.semantic_role)
    && (!Array.isArray(basin.source_basin_ids) || basin.source_basin_ids.length === 0)) issue(`${basin.basin_id}: projection basin requires source_basin_ids`);
}
const defaultId = registry?.default_basin?.basin_id;
if (!defaultId || basinIds.has(defaultId)) issue('default basin missing or duplicates a declared basin');
const allIds = new Set([...basinIds, defaultId].filter(Boolean));
for (const basin of registry?.basins ?? []) {
  for (const sourceId of basin.source_basin_ids ?? []) if (!allIds.has(sourceId)) issue(`${basin.basin_id}: unknown source basin ${sourceId}`);
}

const selfPaths = new Set([
  'build/lake-index/basins.json',
  'build/lake-index/basin-membership.jsonl',
  'build/lake-index/basin-gaps.jsonl',
  'build/lake-index/basin-manifest.json',
  'reports/lake-basin-index.md',
]);
const expectedSourcePaths = sourceRows.map(row => String(row.path ?? '').replaceAll('\\', '/')).filter(Boolean).filter(file => !selfPaths.has(file)).sort();
const membershipPaths = membership.map(row => row.path).sort();
if (JSON.stringify(expectedSourcePaths) !== JSON.stringify(membershipPaths)) issue('basin membership must contain exactly one row per source census path, excluding basin outputs');
if (new Set(membershipPaths).size !== membershipPaths.length) issue('basin membership contains duplicate paths');

for (const row of membership) {
  if (!allIds.has(row.basin_id)) issue(`${row.path}: unknown basin ${row.basin_id}`);
  const basin = row.basin_id === defaultId ? registry.default_basin : (registry.basins ?? []).find(item => item.basin_id === row.basin_id);
  if (!basin) continue;
  if (row.semantic_role !== basin.semantic_role
    || row.owner_program_id !== (basin.owner_program_id ?? null)
    || row.publication_disposition !== basin.publication_disposition
    || row.retention_disposition !== basin.retention_disposition) issue(`${row.path}: membership disposition disagrees with registry`);
  if (row.semantic_role === 'intake_only' && row.publication_disposition !== 'blocked') issue(`${row.path}: intake must remain publication-blocked`);
  if (row.semantic_role === 'crawler_state' && row.publication_disposition !== 'blocked') issue(`${row.path}: crawler state must remain publication-blocked`);
  if (row.evidence_bearing && !row.owner_program_id && row.basin_id !== defaultId) issue(`${row.path}: classified evidence file lacks accountable owner program`);
}

const summaryById = new Map((index?.basins ?? []).map(row => [row.basin_id, row]));
if (summaryById.size !== allIds.size) issue('basin summary must include every declared and default basin exactly once');
for (const id of allIds) if (!summaryById.has(id)) issue(`missing basin summary ${id}`);
for (const summary of summaryById.values()) {
  const rows = membership.filter(row => row.basin_id === summary.basin_id);
  const expected = {
    files: rows.length,
    evidence_bearing: rows.filter(row => row.evidence_bearing).length,
    index_reachable: rows.filter(row => row.current_index_reachable).length,
    public_reachable: rows.filter(row => row.current_public_reachable).length,
    exact_orphans: rows.filter(row => row.exact_orphan).length,
    previously_unowned: rows.filter(row => row.current_detected_owner_ids.length === 0).length,
    registry_owner_added: rows.filter(row => row.ownership_added_by_registry).length,
  };
  for (const [key, value] of Object.entries(expected)) if (summary.counts?.[key] !== value) issue(`${summary.basin_id}: ${key} count drift (${summary.counts?.[key]} != ${value})`);
  if (!sameSet(summary.source_basin_ids, (summary.basin_id === defaultId ? registry.default_basin : registry.basins.find(item => item.basin_id === summary.basin_id))?.source_basin_ids ?? [])) issue(`${summary.basin_id}: source basin linkage drift`);
}

if (index?.counts?.source_rows !== membership.length) issue('source row count must equal basin membership count');
if (index?.counts?.gap_rows !== gaps.length) issue('gap count must equal basin gap rows');
if (index?.completion?.current_tree_semantic_index_complete !== false) issue('basin assignment must not claim current-tree semantic completion');
if (index?.completion?.historical_git_objects_indexed !== false) issue('historical Git-object indexing must remain false');
if (index?.completion?.open_pull_request_shadow_merged !== false) issue('open PR shadow must remain outside merged corpus');
if (index?.completion?.independent_semantic_review_complete !== false) issue('maintainer basin assignment must not claim independent semantic review');
if ((registry?.boundaries ?? {}).complete_current_tree_assignment_is_complete_lake_knowledge !== false) issue('registry must deny that current-tree assignment equals complete lake knowledge');
if ((registry?.boundaries ?? {}).generated_projection_is_independent_evidence !== false) issue('registry must deny generated products are independent evidence');

const gapIds = gaps.map(row => row.gap_id);
if (new Set(gapIds).size !== gapIds.length) issue('basin gap IDs must be unique');
if (!gaps.some(row => row.gap_type === 'missing_authoritative_entrypoint')) issue('the first basin pass must preserve missing authoritative entrypoint gaps');
if (!gaps.some(row => row.gap_type === 'source_record_without_authoritative_reachability')) issue('the first basin pass must preserve source-orphan gaps');

const requiredManifestPaths = [
  'build/lake-index/basins.json',
  'build/lake-index/basin-membership.jsonl',
  'build/lake-index/basin-gaps.jsonl',
  'reports/lake-basin-index.md',
].sort();
const manifestPaths = (manifest?.entries ?? []).map(entry => entry.path).sort();
if (JSON.stringify(requiredManifestPaths) !== JSON.stringify(manifestPaths)) issue('basin manifest paths disagree with required outputs');
for (const entry of manifest?.entries ?? []) {
  const full = path.join(root, entry.path);
  if (!fs.existsSync(full)) { issue(`manifest entry missing: ${entry.path}`); continue; }
  const stat = fs.statSync(full);
  if (entry.bytes !== stat.size) issue(`${entry.path}: manifest byte count drift`);
  if (entry.sha256 !== sha256File(entry.path)) issue(`${entry.path}: manifest hash drift`);
}
const combined = crypto.createHash('sha256').update(Buffer.from((manifest?.entries ?? []).map(entry => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join(''))).digest('hex');
if (manifest?.combined_sha256 !== combined) issue('basin manifest combined hash drift');
if (!report.includes('current-tree semantic index complete:   false') || !report.includes('historical Git objects indexed:         false')) issue('reader report must preserve incomplete-lake boundaries');

if (errors.length) {
  console.error(`lake basin validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`lake basin validation: OK (${membership.length} paths, ${summaryById.size} basins, ${gaps.length} gaps)`);
