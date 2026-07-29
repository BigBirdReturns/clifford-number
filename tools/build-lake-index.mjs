#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const policyPath = path.join(root, 'data/project/lake-index-policy.json');
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const excluded = new Set(policy.excluded_paths ?? []);
const textExtensions = new Set(policy.tracked_extensions ?? []);
const statusKeys = new Set(policy.status_keys ?? []);
const evidencePrefixes = policy.evidence_prefixes ?? [];
const indexTokens = policy.index_name_tokens ?? [];

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function trackedFiles() {
  const raw = execFileSync('git', ['ls-files', '-z'], { cwd: root });
  return raw.toString('utf8').split('\0').filter(Boolean).filter(file => !excluded.has(file)).sort();
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizePath(value) {
  return String(value ?? '').replaceAll('\\', '/').replace(/^\.\//, '').replace(/^\/+/, '');
}

function roleOf(file) {
  if (file.startsWith('data/ledger/')) return 'canonical_ledger';
  if (file.startsWith('data/canonical/')) return 'canonical_registry';
  if (file.startsWith('data/research/')) return 'research_record';
  if (file.startsWith('data/project/')) return 'project_governance';
  if (file.startsWith('data/intake/')) return 'intake';
  if (file.startsWith('data/local/')) return 'private_local';
  if (file.startsWith('receipts/')) return 'receipt_artifact';
  if (file.startsWith('cases/')) return 'case_source';
  if (file.startsWith('reports/')) return 'report_product';
  if (file.startsWith('briefs/')) return 'briefing_product';
  if (file.startsWith('build/')) return 'generated_artifact';
  if (file.startsWith('estates/')) return 'estate_projection';
  if (file.startsWith('gametrails/')) return 'gametrail_projection';
  if (file.startsWith('legacy/')) return 'legacy_artifact';
  if (file.startsWith('contributions/')) return 'contribution_surface';
  if (file.startsWith('docs/')) return 'documentation';
  if (file.startsWith('tools/')) return 'tooling';
  if (file.startsWith('test/')) return 'test';
  if (file.startsWith('.github/workflows/')) return 'workflow';
  if (file.startsWith('.github/')) return 'github_meta';
  return 'repository_root';
}

function isEvidenceBearing(file, role) {
  if (!evidencePrefixes.some(prefix => file.startsWith(prefix))) return false;
  return !['tooling', 'test', 'workflow', 'github_meta'].includes(role);
}

function isIndexFile(file) {
  const name = path.basename(file).toLowerCase();
  return indexTokens.some(token => {
    const re = new RegExp(`(^|[-_.])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([-_.]|$)`);
    return re.test(name);
  });
}

function isTextFile(file, bytes) {
  const ext = path.extname(file).toLowerCase();
  return bytes <= policy.max_text_bytes && textExtensions.has(ext);
}

function idLike(value) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 240
    && /^[A-Za-z0-9][A-Za-z0-9._:@/+-]*$/.test(value);
}

function pathCandidateFromString(raw, sourceFile, trackedSet) {
  if (typeof raw !== 'string') return null;
  let value = raw.trim().replace(/^['"`(<\[]+|['"`)>\],.;:]+$/g, '');
  if (!value || /^https?:\/\//i.test(value) || /^mailto:/i.test(value) || value.includes('${')) return null;
  value = value.split('#')[0].split('?')[0];
  const direct = normalizePath(value);
  if (trackedSet.has(direct)) return direct;
  if (value.startsWith('./') || value.startsWith('../')) {
    const relative = normalizePath(path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), value)));
    if (trackedSet.has(relative)) return relative;
  }
  return null;
}

function extractTextPathTokens(text) {
  const results = new Set();
  const re = /(?:^|[\s'"`(\[])([A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@{}$+*-]+)+\.(?:jsonl?|md|html?|mjs|js|css|csv|tsv|txt|ya?ml|xml|svg|pdf|png|jpg|jpeg|webp))(?:$|[\s'"`)\],;:])/gmi;
  for (const match of text.matchAll(re)) results.add(match[1]);
  return [...results];
}

function walkJson(value, pointer, state) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkJson(item, `${pointer}/${index}`, state));
    return;
  }
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string') state.strings.push(value);
    return;
  }

  const objectIds = [];
  for (const [key, item] of Object.entries(value)) {
    const itemPointer = `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;
    if ((key === 'id' || key.endsWith('_id')) && idLike(item)) {
      const record = { key, value: item, pointer: itemPointer };
      state.ids.push(record);
      objectIds.push(record);
    }
    if (key.endsWith('_ids') && Array.isArray(item)) {
      for (let index = 0; index < item.length; index += 1) {
        if (idLike(item[index])) state.idReferences.push({ key, value: item[index], pointer: `${itemPointer}/${index}` });
      }
    }
    if (statusKeys.has(key) && ['string', 'number', 'boolean'].includes(typeof item)) {
      state.statuses.push({ key, value: item, pointer: itemPointer });
    }
    if (key === 'receipt_id' && idLike(item)) state.receiptDefinitions.push(item);
    if (key === 'receipt_ids' && Array.isArray(item)) {
      for (const receiptId of item) if (idLike(receiptId)) state.receiptReferences.push(receiptId);
    }
    if (key === 'program_id' && idLike(item)) state.programIds.push(item);
    if (key === 'case_id' && idLike(item)) state.caseIds.push(item);
    if (key === 'report_id' && idLike(item)) state.reportIds.push(item);
    if (key === 'schema_version' && typeof item === 'string') state.schemaVersions.push(item);
    walkJson(item, itemPointer, state);
  }

  if (objectIds.length) {
    const objectHash = sha256(Buffer.from(stable(value), 'utf8'));
    for (const objectId of objectIds) {
      state.objectOccurrences.push({ ...objectId, object_hash: objectHash });
    }
  }
}

function parseFile(file, trackedSet) {
  const full = path.join(root, file);
  const bytes = fs.readFileSync(full);
  const role = roleOf(file);
  const record = {
    path: file,
    bytes: bytes.length,
    sha256: sha256(bytes),
    extension: path.extname(file).toLowerCase(),
    role,
    generated: ['generated_artifact', 'estate_projection', 'gametrail_projection', 'briefing_product'].includes(role),
    evidence_bearing: isEvidenceBearing(file, role),
    index_file: isIndexFile(file),
    parse_status: 'not_text',
    schema_versions: [],
    program_ids: [],
    case_ids: [],
    report_ids: [],
    ids: [],
    id_references: [],
    statuses: [],
    receipt_definitions: [],
    receipt_references: [],
    outgoing_refs: [],
    missing_path_tokens: [],
    object_occurrences: []
  };

  if (!isTextFile(file, bytes.length)) return record;
  const text = bytes.toString('utf8');
  record.parse_status = 'text';
  const state = {
    strings: [], ids: [], idReferences: [], statuses: [], receiptDefinitions: [],
    receiptReferences: [], programIds: [], caseIds: [], reportIds: [], schemaVersions: [], objectOccurrences: []
  };

  try {
    if (record.extension === '.json') {
      walkJson(JSON.parse(text), '', state);
      record.parse_status = 'json';
    } else if (record.extension === '.jsonl') {
      const lines = text.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#'));
      lines.forEach((line, index) => walkJson(JSON.parse(line), `/line-${index + 1}`, state));
      record.parse_status = 'jsonl';
    }
  } catch (error) {
    record.parse_status = 'parse_error';
    record.parse_error = error.message;
  }

  const pathTokens = new Set(extractTextPathTokens(text));
  for (const stringValue of state.strings) pathTokens.add(stringValue);
  const outgoing = new Set();
  const missing = new Set();
  for (const token of pathTokens) {
    const resolved = pathCandidateFromString(token, file, trackedSet);
    if (resolved && resolved !== file) outgoing.add(resolved);
    else if (typeof token === 'string'
      && token.includes('/')
      && /\.(?:jsonl?|md|html?|mjs|js|css|csv|tsv|txt|ya?ml|xml|svg|pdf)$/i.test(token)
      && !/^https?:\/\//i.test(token)
      && !token.includes('${')
      && !token.includes('*')) {
      const normalized = normalizePath(token.split('#')[0].split('?')[0]);
      if (evidencePrefixes.some(prefix => normalized.startsWith(prefix)) && !trackedSet.has(normalized)) missing.add(normalized);
    }
  }

  record.schema_versions = [...new Set(state.schemaVersions)].sort();
  record.program_ids = [...new Set(state.programIds)].sort();
  record.case_ids = [...new Set(state.caseIds)].sort();
  record.report_ids = [...new Set(state.reportIds)].sort();
  record.ids = state.ids;
  record.id_references = state.idReferences;
  record.statuses = state.statuses;
  record.receipt_definitions = [...new Set(state.receiptDefinitions)].sort();
  record.receipt_references = [...new Set(state.receiptReferences)].sort();
  record.outgoing_refs = [...outgoing].sort();
  record.missing_path_tokens = [...missing].sort();
  record.object_occurrences = state.objectOccurrences;
  return record;
}

function reachableFrom(roots, adjacency) {
  const seen = new Set();
  const queue = roots.filter(rootPath => adjacency.has(rootPath));
  for (const rootPath of queue) seen.add(rootPath);
  while (queue.length) {
    const current = queue.shift();
    for (const next of adjacency.get(current) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

function loadOpenPrShadow() {
  const file = path.join(root, 'data/project/lake-open-pr-shadow.json');
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return null; }
}

const files = trackedFiles();
const trackedSet = new Set(files);
const records = files.map(file => parseFile(file, trackedSet));
const byPath = new Map(records.map(record => [record.path, record]));
const adjacency = new Map(records.map(record => [record.path, record.outgoing_refs]));
const incoming = new Map(records.map(record => [record.path, []]));
for (const record of records) {
  for (const target of record.outgoing_refs) incoming.get(target)?.push(record.path);
}
for (const refs of incoming.values()) refs.sort();

const authoritativeRoots = (policy.authoritative_roots ?? []).filter(file => trackedSet.has(file));
const publicRoots = (policy.public_roots ?? []).filter(file => trackedSet.has(file));
const indexRoots = records.filter(record => record.index_file).map(record => record.path);
const authoritativeReach = reachableFrom(authoritativeRoots, adjacency);
const publicReach = reachableFrom(publicRoots, adjacency);
const indexReach = reachableFrom(indexRoots, adjacency);

for (const record of records) {
  const incomingRefs = incoming.get(record.path) ?? [];
  record.incoming_refs = incomingRefs;
  record.incoming_index_refs = incomingRefs.filter(source => byPath.get(source)?.index_file);
  record.authoritative_reachable = authoritativeReach.has(record.path);
  record.index_reachable = indexReach.has(record.path);
  record.public_reachable = publicReach.has(record.path);
  record.exact_orphan = !record.index_file && !authoritativeRoots.includes(record.path) && incomingRefs.length === 0;
  record.ownership_state = record.program_ids.length ? 'declared_program_id'
    : record.incoming_refs.some(source => (byPath.get(source)?.program_ids.length ?? 0) > 0) ? 'referenced_by_program_file'
      : 'no_program_owner_detected';
}

const idMap = new Map();
for (const record of records) {
  for (const occurrence of record.object_occurrences) {
    const compound = `${occurrence.key}:${occurrence.value}`;
    if (!idMap.has(compound)) idMap.set(compound, { id_key: occurrence.key, id_value: occurrence.value, occurrences: [] });
    idMap.get(compound).occurrences.push({ path: record.path, pointer: occurrence.pointer, object_hash: occurrence.object_hash, role: record.role, index_file: record.index_file, generated: record.generated });
  }
}
const objects = [...idMap.values()].map(item => {
  const hashes = [...new Set(item.occurrences.map(occurrence => occurrence.object_hash))];
  const indexed = item.occurrences.some(occurrence => occurrence.index_file);
  const sourceOccurrence = item.occurrences.some(occurrence => !occurrence.generated && !['documentation', 'report_product', 'briefing_product'].includes(occurrence.role));
  const projectionOccurrence = item.occurrences.some(occurrence => occurrence.generated || ['report_product', 'briefing_product', 'estate_projection', 'gametrail_projection'].includes(occurrence.role));
  return {
    ...item,
    occurrence_count: item.occurrences.length,
    distinct_object_hashes: hashes.length,
    divergent_projections: hashes.length > 1,
    indexed,
    source_occurrence: sourceOccurrence,
    projection_occurrence: projectionOccurrence,
    source_without_projection: sourceOccurrence && !projectionOccurrence,
    projection_without_source: projectionOccurrence && !sourceOccurrence
  };
}).sort((a, b) => `${a.id_key}:${a.id_value}`.localeCompare(`${b.id_key}:${b.id_value}`));

const receiptDefinitions = new Map();
const receiptReferences = new Map();
for (const record of records) {
  for (const receiptId of record.receipt_definitions) {
    if (!receiptDefinitions.has(receiptId)) receiptDefinitions.set(receiptId, []);
    receiptDefinitions.get(receiptId).push(record.path);
  }
  for (const receiptId of record.receipt_references) {
    if (!receiptReferences.has(receiptId)) receiptReferences.set(receiptId, []);
    receiptReferences.get(receiptId).push(record.path);
  }
}
const allReceiptIds = [...new Set([...receiptDefinitions.keys(), ...receiptReferences.keys()])].sort();
const receipts = allReceiptIds.map(receiptId => ({
  receipt_id: receiptId,
  definition_paths: [...new Set(receiptDefinitions.get(receiptId) ?? [])].sort(),
  reference_paths: [...new Set(receiptReferences.get(receiptId) ?? [])].sort(),
  defined: receiptDefinitions.has(receiptId),
  referenced: receiptReferences.has(receiptId)
}));

const programMap = new Map();
const caseMap = new Map();
const reportMap = new Map();
for (const record of records) {
  for (const programId of record.program_ids) {
    if (!programMap.has(programId)) programMap.set(programId, []);
    programMap.get(programId).push(record.path);
  }
  for (const caseId of record.case_ids) {
    if (!caseMap.has(caseId)) caseMap.set(caseId, []);
    caseMap.get(caseId).push(record.path);
  }
  for (const reportId of record.report_ids) {
    if (!reportMap.has(reportId)) reportMap.set(reportId, []);
    reportMap.get(reportId).push(record.path);
  }
}

const publicCatalog = byPath.get('build/public-catalog.json');
const publicCaseIds = new Set((publicCatalog?.ids ?? []).filter(item => item.key === 'case_id').map(item => item.value));
const caseIndex = [...caseMap].map(([caseId, paths]) => ({ case_id: caseId, paths: [...new Set(paths)].sort(), public_catalogued: publicCaseIds.has(caseId) })).sort((a, b) => a.case_id.localeCompare(b.case_id));
const programs = [...programMap].map(([programId, paths]) => ({ program_id: programId, paths: [...new Set(paths)].sort(), file_count: new Set(paths).size })).sort((a, b) => a.program_id.localeCompare(b.program_id));
const reports = [...reportMap].map(([reportId, paths]) => ({ report_id: reportId, paths: [...new Set(paths)].sort(), file_count: new Set(paths).size })).sort((a, b) => a.report_id.localeCompare(b.report_id));

const evidenceRecords = records.filter(record => record.evidence_bearing);
const parseErrors = records.filter(record => record.parse_status === 'parse_error');
const openPrShadow = loadOpenPrShadow();
const summary = {
  schema_version: 'lake-index-summary@1',
  census_id: policy.census_id,
  exact_head: git('rev-parse', 'HEAD'),
  exact_tree: git('rev-parse', 'HEAD^{tree}'),
  counts: {
    tracked_files_indexed: records.length,
    evidence_bearing_files: evidenceRecords.length,
    text_or_structured_files_parsed: records.filter(record => record.parse_status !== 'not_text').length,
    parse_errors: parseErrors.length,
    index_files: indexRoots.length,
    authoritative_roots_present: authoritativeRoots.length,
    authoritative_reachable_evidence_files: evidenceRecords.filter(record => record.authoritative_reachable).length,
    index_reachable_evidence_files: evidenceRecords.filter(record => record.index_reachable).length,
    public_reachable_evidence_files: evidenceRecords.filter(record => record.public_reachable).length,
    exact_orphan_evidence_files: evidenceRecords.filter(record => record.exact_orphan).length,
    no_program_owner_detected: evidenceRecords.filter(record => record.ownership_state === 'no_program_owner_detected').length,
    distinct_machine_ids: objects.length,
    unindexed_machine_ids: objects.filter(object => !object.indexed).length,
    divergent_identifier_projections: objects.filter(object => object.divergent_projections).length,
    source_ids_without_projection: objects.filter(object => object.source_without_projection).length,
    projection_ids_without_source: objects.filter(object => object.projection_without_source).length,
    receipt_ids: receipts.length,
    undefined_receipt_references: receipts.filter(receipt => receipt.referenced && !receipt.defined).length,
    unused_receipt_definitions: receipts.filter(receipt => receipt.defined && !receipt.referenced).length,
    program_ids: programs.length,
    case_ids: caseIndex.length,
    case_ids_not_in_public_catalog: caseIndex.filter(item => !item.public_catalogued).length,
    report_ids: reports.length,
    missing_repo_path_tokens: new Set(records.flatMap(record => record.missing_path_tokens)).size,
    open_pull_requests_observed: openPrShadow?.counts?.open_pull_requests ?? 0,
    open_pr_changed_paths_observed: openPrShadow?.counts?.changed_paths ?? 0,
    open_pr_branch_only_paths_observed: openPrShadow?.counts?.branch_only_paths ?? 0
  },
  boundaries: {
    current_tracked_path_census_complete: true,
    current_tree_reference_extraction_best_effort: true,
    current_tree_semantic_index_complete: false,
    historical_git_object_index_complete: false,
    open_pull_request_content_semantically_indexed: false,
    source_truth_determined: false,
    publication_cleared: false,
    common_purpose_conclusion_generated: false
  }
};

const fileOutput = records.map(record => ({
  path: record.path,
  bytes: record.bytes,
  sha256: record.sha256,
  extension: record.extension,
  role: record.role,
  generated: record.generated,
  evidence_bearing: record.evidence_bearing,
  index_file: record.index_file,
  parse_status: record.parse_status,
  parse_error: record.parse_error ?? null,
  schema_versions: record.schema_versions,
  program_ids: record.program_ids,
  case_ids: record.case_ids,
  report_ids: record.report_ids,
  machine_id_count: record.ids.length,
  machine_id_reference_count: record.id_references.length,
  status_values: record.statuses,
  receipt_definition_count: record.receipt_definitions.length,
  receipt_reference_count: record.receipt_references.length,
  outgoing_refs: record.outgoing_refs,
  incoming_refs: record.incoming_refs,
  incoming_index_refs: record.incoming_index_refs,
  authoritative_reachable: record.authoritative_reachable,
  index_reachable: record.index_reachable,
  public_reachable: record.public_reachable,
  exact_orphan: record.exact_orphan,
  ownership_state: record.ownership_state,
  missing_path_tokens: record.missing_path_tokens
}));

const gaps = {
  schema_version: 'lake-index-gaps@1',
  census_id: policy.census_id,
  exact_head: summary.exact_head,
  exact_tree: summary.exact_tree,
  exact_orphan_evidence_paths: evidenceRecords.filter(record => record.exact_orphan).map(record => record.path),
  evidence_paths_not_authoritatively_reachable: evidenceRecords.filter(record => !record.authoritative_reachable).map(record => record.path),
  evidence_paths_not_index_reachable: evidenceRecords.filter(record => !record.index_reachable).map(record => record.path),
  evidence_paths_not_public_reachable: evidenceRecords.filter(record => !record.public_reachable).map(record => record.path),
  evidence_paths_without_program_owner: evidenceRecords.filter(record => record.ownership_state === 'no_program_owner_detected').map(record => record.path),
  parse_errors: parseErrors.map(record => ({ path: record.path, error: record.parse_error })),
  unindexed_machine_ids: objects.filter(object => !object.indexed).map(object => ({ id_key: object.id_key, id_value: object.id_value, paths: [...new Set(object.occurrences.map(occurrence => occurrence.path))].sort() })),
  divergent_identifier_projections: objects.filter(object => object.divergent_projections),
  source_ids_without_projection: objects.filter(object => object.source_without_projection).map(object => ({ id_key: object.id_key, id_value: object.id_value, paths: [...new Set(object.occurrences.map(occurrence => occurrence.path))].sort() })),
  projection_ids_without_source: objects.filter(object => object.projection_without_source).map(object => ({ id_key: object.id_key, id_value: object.id_value, paths: [...new Set(object.occurrences.map(occurrence => occurrence.path))].sort() })),
  undefined_receipt_references: receipts.filter(receipt => receipt.referenced && !receipt.defined),
  unused_receipt_definitions: receipts.filter(receipt => receipt.defined && !receipt.referenced),
  case_ids_not_in_public_catalog: caseIndex.filter(item => !item.public_catalogued),
  missing_repo_path_tokens: [...new Set(records.flatMap(record => record.missing_path_tokens))].sort(),
  open_pull_request_shadow: openPrShadow
};

const objectIndex = {
  schema_version: 'lake-object-index@1',
  census_id: policy.census_id,
  exact_head: summary.exact_head,
  exact_tree: summary.exact_tree,
  objects,
  receipts,
  programs,
  cases: caseIndex,
  reports
};

const fullIndex = {
  schema_version: 'lake-index@1',
  census_id: policy.census_id,
  built_by: 'tools/build-lake-index.mjs',
  summary,
  authoritative_roots: authoritativeRoots,
  public_roots: publicRoots,
  index_roots: indexRoots,
  files: fileOutput
};

function writeJson(relativePath, value) {
  const full = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(value, null, 2) + '\n');
}

function percentage(numerator, denominator) {
  return denominator ? `${(numerator / denominator * 100).toFixed(1)}%` : 'n/a';
}

const c = summary.counts;
const markdown = `# Lake index census\n\nExact head: \`${summary.exact_head}\`  \nExact tree: \`${summary.exact_tree}\`\n\n## The six waterlines\n\n| Waterline | Count | Share of evidence files |\n|---|---:|---:|\n| Tracked evidence-bearing files physically present | ${c.evidence_bearing_files} | 100.0% |\n| Reachable from declared authoritative roots | ${c.authoritative_reachable_evidence_files} | ${percentage(c.authoritative_reachable_evidence_files, c.evidence_bearing_files)} |\n| Reachable from any detected index or manifest | ${c.index_reachable_evidence_files} | ${percentage(c.index_reachable_evidence_files, c.evidence_bearing_files)} |\n| Reachable from current public entry roots | ${c.public_reachable_evidence_files} | ${percentage(c.public_reachable_evidence_files, c.evidence_bearing_files)} |\n| Exact orphan evidence files with no inbound repository reference | ${c.exact_orphan_evidence_files} | ${percentage(c.exact_orphan_evidence_files, c.evidence_bearing_files)} |\n| Evidence files with no detected program owner | ${c.no_program_owner_detected} | ${percentage(c.no_program_owner_detected, c.evidence_bearing_files)} |\n\n## Object and receipt census\n\n\`\`\`text\ndistinct machine-addressable IDs:       ${c.distinct_machine_ids}\nunindexed machine-addressable IDs:      ${c.unindexed_machine_ids}\ndivergent identifier projections:       ${c.divergent_identifier_projections}\nsource IDs without a projection:         ${c.source_ids_without_projection}\nprojection IDs without a source object:  ${c.projection_ids_without_source}\nreceipt IDs:                             ${c.receipt_ids}\nundefined receipt references:            ${c.undefined_receipt_references}\nunused receipt definitions:              ${c.unused_receipt_definitions}\nprogram IDs:                             ${c.program_ids}\ncase IDs:                                ${c.case_ids}\ncase IDs absent from public catalog:      ${c.case_ids_not_in_public_catalog}\nreport IDs:                              ${c.report_ids}\n\`\`\`\n\n## Branch-shadow census\n\n\`\`\`text\nopen pull requests observed:              ${c.open_pull_requests_observed}\nchanged paths across open pull requests:  ${c.open_pr_changed_paths_observed}\nbranch-only paths observed:               ${c.open_pr_branch_only_paths_observed}\n\`\`\`\n\nOpen-PR paths are a shadow inventory only. They are not merged corpus, evidence truth, or publication state.\n\n## Interpretation\n\nThis census proves only that every currently tracked path in scope has a deterministic metadata row and that machine-readable references were extracted under the checked-in policy. It does **not** prove that the lake is semantically complete, that every object has been correctly classified, that historical Git objects are indexed, that open-branch content has been adjudicated, or that any claim is true or publication-cleared.\n\nThe actionable gap queues are in \`build/lake-index-gaps.json\`; the complete path inventory is in \`build/lake-index.json\`; and identifier, receipt, program, case, and report projections are in \`build/lake-object-index.json\`.\n`;

writeJson('build/lake-index.json', fullIndex);
writeJson('build/lake-object-index.json', objectIndex);
writeJson('build/lake-index-gaps.json', gaps);
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/lake-index-census.md'), markdown);

console.log('lake index census built');
console.log(`  tracked files: ${c.tracked_files_indexed}`);
console.log(`  evidence-bearing files: ${c.evidence_bearing_files}`);
console.log(`  exact orphan evidence files: ${c.exact_orphan_evidence_files}`);
console.log(`  machine IDs: ${c.distinct_machine_ids}`);
console.log(`  unindexed machine IDs: ${c.unindexed_machine_ids}`);
console.log(`  undefined receipt references: ${c.undefined_receipt_references}`);
