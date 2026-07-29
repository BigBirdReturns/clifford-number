#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const registryPath = path.join(root, 'data/project/lake-basin-registry.json');
const filesPath = path.join(root, 'build/lake-index/files.jsonl');
const outDir = path.join(root, 'build/lake-index');
const reportPath = path.join(root, 'reports/lake-basin-index.md');

const outputPaths = [
  'build/lake-index/basins.json',
  'build/lake-index/basin-membership.jsonl',
  'build/lake-index/basin-gaps.jsonl',
  'build/lake-index/basin-manifest.json',
  'reports/lake-basin-index.md',
];
const selfPaths = new Set(outputPaths);

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function readJsonl(full) {
  if (!fs.existsSync(full)) throw new Error(`missing required lake census shard: ${path.relative(root, full)}`);
  return fs.readFileSync(full, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${path.relative(root, full)}:${index + 1}: ${error.message}`); }
  });
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeJson(relative, value) {
  const full = path.join(root, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, stableJson(value));
}

function writeJsonl(relative, rows) {
  const full = path.join(root, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}

function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function sha256File(relative) {
  return sha256Bytes(fs.readFileSync(path.join(root, relative)));
}

function normalizePath(value) {
  return String(value ?? '').replaceAll('\\', '/').replace(/^\.\//, '');
}

function prefixMatches(file, prefix) {
  const normalized = normalizePath(prefix);
  return normalized.endsWith('/') ? file.startsWith(normalized) : file === normalized;
}

function bool(value) {
  return value === true;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function evidenceBearing(row) {
  return bool(row.evidence_bearing) || bool(row.is_evidence_bearing) || array(row.roles).some(role =>
    ['evidence', 'receipt', 'claim', 'research', 'case', 'report', 'source'].some(token => String(role).includes(token)));
}

function indexReachable(row) {
  return bool(row.index_reachable)
    || bool(row.reachable_from_index)
    || bool(row.reachability?.index)
    || bool(row.reachability?.any_index);
}

function publicReachable(row) {
  return bool(row.public_reachable)
    || bool(row.reachable_from_public)
    || bool(row.reachability?.public)
    || bool(row.reachability?.public_runtime);
}

function exactOrphan(row) {
  if (bool(row.exact_orphan)) return true;
  if (row.orphan_class === 'exact_orphan') return true;
  const refs = Number(row.reference_count ?? row.references_in ?? array(row.referenced_by).length ?? 0);
  return evidenceBearing(row) && refs === 0 && !indexReachable(row);
}

function ownerIds(row) {
  return [...new Set([
    ...array(row.program_owner_ids),
    ...array(row.owner_program_ids),
    ...array(row.program_owners),
    ...(typeof row.program_owner_id === 'string' ? [row.program_owner_id] : []),
  ].filter(Boolean))].sort();
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortObject(value[key])]));
}

const registry = readJson('data/project/lake-basin-registry.json');
if (registry.schema_version !== 'lake-basin-registry@1') throw new Error('unsupported lake basin registry schema');
const basinIds = new Set();
for (const basin of registry.basins ?? []) {
  if (!basin.basin_id || basinIds.has(basin.basin_id)) throw new Error(`missing or duplicate basin_id: ${basin.basin_id}`);
  basinIds.add(basin.basin_id);
}
if (!registry.default_basin?.basin_id || basinIds.has(registry.default_basin.basin_id)) throw new Error('default basin must have a unique basin_id');

const declaredBasins = [...registry.basins].map((basin, order) => ({
  ...basin,
  declaration_order: order,
  normalized_prefixes: array(basin.path_prefixes).map(normalizePath).sort((a, b) => b.length - a.length || a.localeCompare(b)),
}));

function matchBasin(file) {
  const candidates = [];
  for (const basin of declaredBasins) {
    for (const prefix of basin.normalized_prefixes) {
      if (prefixMatches(file, prefix)) candidates.push({ basin, prefix });
    }
  }
  candidates.sort((a, b) => b.prefix.length - a.prefix.length
    || a.basin.declaration_order - b.basin.declaration_order
    || a.basin.basin_id.localeCompare(b.basin.basin_id));
  return candidates[0] ?? { basin: registry.default_basin, prefix: null };
}

const sourceRows = readJsonl(filesPath)
  .map(row => ({ ...row, path: normalizePath(row.path) }))
  .filter(row => row.path && !selfPaths.has(row.path))
  .sort((a, b) => a.path.localeCompare(b.path));
const trackedPathSet = new Set(sourceRows.map(row => row.path));
const allKnownBasinIds = new Set([...basinIds, registry.default_basin.basin_id]);
const membership = [];
const gaps = [];

for (const basin of declaredBasins) {
  for (const sourceId of array(basin.source_basin_ids)) {
    if (!allKnownBasinIds.has(sourceId)) {
      gaps.push({
        gap_id: `invalid-source-basin:${basin.basin_id}:${sourceId}`,
        gap_type: 'invalid_source_basin_reference',
        basin_id: basin.basin_id,
        path: null,
        severity: 'blocking',
        detail: `Declared source basin ${sourceId} is not present in the registry.`,
      });
    }
  }
}

const clearlyNonPublic = new Set([
  'blocked',
  'blocked_pending_classification',
  'internal_or_explicitly_authorized',
]);

for (const row of sourceRows) {
  const { basin, prefix } = matchBasin(row.path);
  const currentOwners = ownerIds(row);
  const assignedOwner = basin.owner_program_id ?? null;
  const member = {
    path: row.path,
    basin_id: basin.basin_id,
    matched_prefix: prefix,
    semantic_role: basin.semantic_role,
    owner_program_id: assignedOwner,
    ownership_status: basin.ownership_status,
    current_detected_owner_ids: currentOwners,
    ownership_added_by_registry: Boolean(assignedOwner && !currentOwners.includes(assignedOwner)),
    authoritative_entrypoints: array(basin.authoritative_entrypoints),
    source_basin_ids: array(basin.source_basin_ids),
    publication_disposition: basin.publication_disposition,
    retention_disposition: basin.retention_disposition,
    evidence_bearing: evidenceBearing(row),
    current_index_reachable: indexReachable(row),
    current_public_reachable: publicReachable(row),
    exact_orphan: exactOrphan(row),
    source_sha256: row.sha256 ?? null,
    source_bytes: Number.isFinite(row.bytes) ? row.bytes : null,
  };
  membership.push(member);

  if (basin.basin_id === registry.default_basin.basin_id) {
    gaps.push({
      gap_id: `unclassified:${row.path}`,
      gap_type: 'unclassified_path',
      basin_id: basin.basin_id,
      path: row.path,
      severity: member.evidence_bearing ? 'blocking' : 'review',
      detail: 'No declared semantic basin matched this current-tree path.',
    });
  }
  if (member.evidence_bearing && member.exact_orphan && ['canonical_registry', 'canonical_ledger', 'research_source', 'research_program_source', 'case_source', 'receipt_artifact', 'estate_source'].includes(member.semantic_role)) {
    gaps.push({
      gap_id: `source-orphan:${row.path}`,
      gap_type: 'source_record_without_authoritative_reachability',
      basin_id: basin.basin_id,
      path: row.path,
      severity: 'blocking',
      detail: 'Evidence-bearing source record remains an exact orphan in the underlying lake census.',
    });
  }
  if (member.current_public_reachable && clearlyNonPublic.has(member.publication_disposition)) {
    gaps.push({
      gap_id: `public-boundary:${row.path}`,
      gap_type: 'public_reachability_requires_authorization_review',
      basin_id: basin.basin_id,
      path: row.path,
      severity: 'blocking',
      detail: `Current public reachability conflicts with basin disposition ${member.publication_disposition} unless an explicit publication manifest authorizes the exact artifact.`,
    });
  }
}

const summaryByBasin = new Map();
for (const basin of [...declaredBasins, { ...registry.default_basin, normalized_prefixes: [], declaration_order: declaredBasins.length }]) {
  summaryByBasin.set(basin.basin_id, {
    basin_id: basin.basin_id,
    label: basin.label,
    semantic_role: basin.semantic_role,
    owner_program_id: basin.owner_program_id ?? null,
    ownership_status: basin.ownership_status,
    path_prefixes: array(basin.path_prefixes),
    authoritative_entrypoints: array(basin.authoritative_entrypoints),
    source_basin_ids: array(basin.source_basin_ids),
    publication_disposition: basin.publication_disposition,
    retention_disposition: basin.retention_disposition,
    counts: {
      files: 0,
      evidence_bearing: 0,
      index_reachable: 0,
      public_reachable: 0,
      exact_orphans: 0,
      previously_unowned: 0,
      registry_owner_added: 0,
    },
    entrypoint_state: [],
  });
}
for (const member of membership) {
  const summary = summaryByBasin.get(member.basin_id);
  summary.counts.files += 1;
  if (member.evidence_bearing) summary.counts.evidence_bearing += 1;
  if (member.current_index_reachable) summary.counts.index_reachable += 1;
  if (member.current_public_reachable) summary.counts.public_reachable += 1;
  if (member.exact_orphan) summary.counts.exact_orphans += 1;
  if (member.current_detected_owner_ids.length === 0) summary.counts.previously_unowned += 1;
  if (member.ownership_added_by_registry) summary.counts.registry_owner_added += 1;
}
for (const summary of summaryByBasin.values()) {
  summary.entrypoint_state = summary.authoritative_entrypoints.map(entrypoint => ({
    path: entrypoint,
    present_in_census_snapshot: trackedPathSet.has(entrypoint),
  }));
  for (const state of summary.entrypoint_state.filter(item => !item.present_in_census_snapshot)) {
    gaps.push({
      gap_id: `missing-entrypoint:${summary.basin_id}:${state.path}`,
      gap_type: 'missing_authoritative_entrypoint',
      basin_id: summary.basin_id,
      path: state.path,
      severity: summary.counts.evidence_bearing > 0 ? 'blocking' : 'review',
      detail: 'Declared authoritative basin entrypoint is absent from the current lake census snapshot.',
    });
  }
  summary.entrypoint_complete = summary.entrypoint_state.every(item => item.present_in_census_snapshot);
}

membership.sort((a, b) => a.path.localeCompare(b.path));
gaps.sort((a, b) => a.gap_type.localeCompare(b.gap_type) || String(a.basin_id).localeCompare(String(b.basin_id)) || String(a.path).localeCompare(String(b.path)));
const basinSummaries = [...summaryByBasin.values()].sort((a, b) => b.counts.evidence_bearing - a.counts.evidence_bearing || b.counts.files - a.counts.files || a.basin_id.localeCompare(b.basin_id));
const evidenceMembers = membership.filter(row => row.evidence_bearing);
const sourceFingerprint = sha256Bytes(Buffer.concat([
  fs.readFileSync(filesPath),
  Buffer.from('\n'),
  fs.readFileSync(registryPath),
]));
const gapCounts = {};
for (const gap of gaps) gapCounts[gap.gap_type] = (gapCounts[gap.gap_type] ?? 0) + 1;

const basinIndex = {
  schema_version: 'lake-basin-index@1',
  registry_id: registry.registry_id,
  source_fingerprint: sourceFingerprint,
  source_census_path: 'build/lake-index/files.jsonl',
  counts: {
    source_rows: sourceRows.length,
    basin_count: basinSummaries.length,
    classified_without_default: membership.filter(row => row.basin_id !== registry.default_basin.basin_id).length,
    unclassified_paths: membership.filter(row => row.basin_id === registry.default_basin.basin_id).length,
    evidence_bearing_files: evidenceMembers.length,
    evidence_files_with_registry_owner: evidenceMembers.filter(row => row.owner_program_id).length,
    evidence_files_previously_unowned: evidenceMembers.filter(row => row.current_detected_owner_ids.length === 0).length,
    exact_orphan_evidence_files: evidenceMembers.filter(row => row.exact_orphan).length,
    gap_rows: gaps.length,
    gap_type_counts: sortObject(gapCounts),
  },
  completion: {
    current_tree_path_assignment_complete: membership.every(row => row.basin_id !== registry.default_basin.basin_id),
    current_tree_semantic_index_complete: false,
    historical_git_objects_indexed: false,
    open_pull_request_shadow_merged: false,
    independent_semantic_review_complete: false,
  },
  basins: basinSummaries,
  boundaries: registry.boundaries,
};

writeJson('build/lake-index/basins.json', basinIndex);
writeJsonl('build/lake-index/basin-membership.jsonl', membership);
writeJsonl('build/lake-index/basin-gaps.jsonl', gaps);

const tableRows = basinSummaries.map(basin => `| ${basin.basin_id} | ${basin.semantic_role} | ${basin.counts.files} | ${basin.counts.evidence_bearing} | ${basin.counts.index_reachable} | ${basin.counts.exact_orphans} | ${basin.counts.previously_unowned} | ${basin.entrypoint_complete ? 'yes' : 'no'} |`).join('\n');
const gapRows = Object.entries(gapCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([type, count]) => `| ${type} | ${count} |`).join('\n');
const report = `# Evidence Lake Basin Index\n\nThis report partitions the current tracked lake census into declared semantic basins. It distinguishes canonical sources, research sources, intake, receipts, generated projections, reports, governance history, tooling, and public runtime. Basin assignment is an indexing obligation, not evidence truth or publication clearance.\n\n## Current assignment\n\n\`\`\`text\nsource rows:                         ${basinIndex.counts.source_rows}\nsemantic basins:                    ${basinIndex.counts.basin_count}\nclassified without default:         ${basinIndex.counts.classified_without_default}\nunclassified paths:                 ${basinIndex.counts.unclassified_paths}\nevidence-bearing files:             ${basinIndex.counts.evidence_bearing_files}\nevidence files with registry owner: ${basinIndex.counts.evidence_files_with_registry_owner}\nevidence files previously unowned:  ${basinIndex.counts.evidence_files_previously_unowned}\nexact orphan evidence files:        ${basinIndex.counts.exact_orphan_evidence_files}\ngap rows:                           ${basinIndex.counts.gap_rows}\n\`\`\`\n\n## Basin waterline\n\n| Basin | Role | Files | Evidence | Index reachable | Exact orphans | Previously unowned | Entrypoints present |\n|---|---|---:|---:|---:|---:|---:|---|\n${tableRows}\n\n## Gap classes\n\n| Gap type | Count |\n|---|---:|\n${gapRows || '| none | 0 |'}\n\n## Honest terminal state\n\n\`\`\`text\ncurrent-tree path assignment complete: ${basinIndex.completion.current_tree_path_assignment_complete}\ncurrent-tree semantic index complete:   ${basinIndex.completion.current_tree_semantic_index_complete}\nhistorical Git objects indexed:         ${basinIndex.completion.historical_git_objects_indexed}\nopen-PR shadow merged into corpus:       ${basinIndex.completion.open_pull_request_shadow_merged}\nindependent semantic review complete:    ${basinIndex.completion.independent_semantic_review_complete}\n\`\`\`\n\nThe registry intentionally preserves missing entrypoints, source-orphan gaps, public-boundary conflicts, and unclassified paths. Generated products remain projections of declared source basins rather than independent evidence.\n`;
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, report);

const manifestEntries = outputPaths.filter(relative => relative !== 'build/lake-index/basin-manifest.json').map(relative => {
  const full = path.join(root, relative);
  return { path: relative, bytes: fs.statSync(full).size, sha256: sha256File(relative) };
}).sort((a, b) => a.path.localeCompare(b.path));
const manifest = {
  schema_version: 'lake-basin-index-manifest@1',
  registry_id: registry.registry_id,
  source_fingerprint: sourceFingerprint,
  hash_mode: 'sha256_exact_bytes',
  self_included: false,
  entries: manifestEntries,
  combined_sha256: sha256Bytes(Buffer.from(manifestEntries.map(entry => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join(''))),
  boundaries: registry.boundaries,
};
writeJson('build/lake-index/basin-manifest.json', manifest);
console.log(`lake basin index: ${membership.length} paths, ${basinSummaries.length} basins, ${gaps.length} gaps`);
