#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const index = JSON.parse(fs.readFileSync(path.join(root, 'build/lake-index.json'), 'utf8'));
const objects = JSON.parse(fs.readFileSync(path.join(root, 'build/lake-object-index.json'), 'utf8'));
const gaps = JSON.parse(fs.readFileSync(path.join(root, 'build/lake-index-gaps.json'), 'utf8'));
const shadow = gaps.open_pull_request_shadow ?? null;

function clusterOf(file) {
  const parts = file.split('/');
  if (parts[0] === 'data') return parts.slice(0, Math.min(2, parts.length)).join('/');
  if (['build', 'reports', 'receipts', 'docs', 'cases', 'legacy', 'contributions'].includes(parts[0])) {
    return parts.slice(0, Math.min(2, parts.length)).join('/');
  }
  return parts[0];
}

function tally(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function roleRows(files) {
  const roles = new Map();
  for (const file of files) {
    if (!roles.has(file.role)) roles.set(file.role, []);
    roles.get(file.role).push(file);
  }
  return [...roles].map(([role, rows]) => ({
    role,
    files: rows.length,
    authoritative_reachable: rows.filter(file => file.authoritative_reachable).length,
    index_reachable: rows.filter(file => file.index_reachable).length,
    public_reachable: rows.filter(file => file.public_reachable).length,
    exact_orphans: rows.filter(file => file.exact_orphan).length,
    no_program_owner: rows.filter(file => file.ownership_state === 'no_program_owner_detected').length
  })).sort((a, b) => b.files - a.files || a.role.localeCompare(b.role));
}

function idKeyCounts(rows) {
  return tally(rows, row => row.id_key).map(row => ({ id_key: row.key, count: row.count }));
}

const evidence = index.files.filter(file => file.evidence_bearing);
const exactOrphans = evidence.filter(file => file.exact_orphan);
const unowned = evidence.filter(file => file.ownership_state === 'no_program_owner_detected');
const notIndexed = evidence.filter(file => !file.index_reachable);
const notAuthoritative = evidence.filter(file => !file.authoritative_reachable);
const notPublic = evidence.filter(file => !file.public_reachable);
const branchOnlyFiles = (shadow?.pull_requests ?? []).flatMap(pr => pr.files
  .filter(file => file.branch_only_path)
  .map(file => ({ ...file, pr_number: pr.number, pr_title: pr.title, head_ref: pr.head_ref, head_sha: pr.head_sha })));

const roleSummary = roleRows(evidence);
const clusterSummary = [...new Set(evidence.map(file => clusterOf(file)))].map(cluster => {
  const rows = evidence.filter(file => clusterOf(file) === cluster);
  return {
    cluster,
    files: rows.length,
    authoritative_reachable: rows.filter(file => file.authoritative_reachable).length,
    index_reachable: rows.filter(file => file.index_reachable).length,
    public_reachable: rows.filter(file => file.public_reachable).length,
    exact_orphans: rows.filter(file => file.exact_orphan).length,
    no_program_owner: rows.filter(file => file.ownership_state === 'no_program_owner_detected').length
  };
}).sort((a, b) => b.files - a.files || a.cluster.localeCompare(b.cluster));

const caseGaps = gaps.case_ids_not_in_public_catalog ?? [];
const priorityQueues = {
  p0_integrity_breaks: {
    description: 'References or projections that cannot currently close against a defined source object.',
    counts: {
      parse_errors: gaps.parse_errors.length,
      undefined_receipt_references: gaps.undefined_receipt_references.length,
      projection_ids_without_source: gaps.projection_ids_without_source.length,
      missing_repo_path_tokens: gaps.missing_repo_path_tokens.length
    }
  },
  p1_exact_orphan_sources: {
    description: 'Evidence-bearing paths with no inbound repository reference; absence of an inbound reference is not a judgment of irrelevance.',
    count: exactOrphans.length,
    by_role: tally(exactOrphans, file => file.role),
    by_cluster: tally(exactOrphans, file => clusterOf(file))
  },
  p2_unowned_evidence: {
    description: 'Evidence-bearing paths without a detected program ID or reference from a program-bearing file.',
    count: unowned.length,
    by_role: tally(unowned, file => file.role),
    by_cluster: tally(unowned, file => clusterOf(file))
  },
  p3_index_and_publication_gaps: {
    description: 'Known paths that remain outside an index, authoritative root, public entry surface, or current public case catalog.',
    counts: {
      not_index_reachable: notIndexed.length,
      not_authoritative_reachable: notAuthoritative.length,
      not_public_reachable: notPublic.length,
      case_ids_not_in_public_catalog: caseGaps.length
    }
  },
  p4_branch_shadow: {
    description: 'Open-pull-request paths absent from the current main tree; these require active, superseded, abandoned, or merged dispositions.',
    counts: {
      open_pull_requests: shadow?.counts?.open_pull_requests ?? 0,
      branch_only_paths: shadow?.counts?.branch_only_paths ?? 0,
      branch_only_evidence_paths: shadow?.counts?.branch_only_evidence_paths ?? 0
    },
    by_pr: tally(branchOnlyFiles, file => `#${file.pr_number} ${file.pr_title}`),
    by_cluster: tally(branchOnlyFiles, file => clusterOf(file.path))
  },
  p5_history_and_semantics: {
    description: 'Current-tree path indexing cannot answer historical Git reachability, identity equivalence, evidentiary truth, or semantic ownership.',
    boundaries: index.summary.boundaries
  }
};

const summary = {
  schema_version: 'lake-index-gap-summary@1',
  census_id: index.census_id,
  source_fingerprint_sha256: index.summary.source_fingerprint_sha256,
  counts: index.summary.counts,
  by_role: roleSummary,
  by_cluster: clusterSummary,
  machine_id_gap_classes: {
    unindexed_by_id_key: idKeyCounts(gaps.unindexed_machine_ids),
    divergent_by_id_key: idKeyCounts(gaps.divergent_identifier_projections),
    source_without_projection_by_id_key: idKeyCounts(gaps.source_ids_without_projection),
    projection_without_source_by_id_key: idKeyCounts(gaps.projection_ids_without_source)
  },
  receipt_gap_samples: {
    undefined_references: gaps.undefined_receipt_references.slice(0, 100),
    unused_definitions: gaps.unused_receipt_definitions.slice(0, 100)
  },
  case_ids_not_in_public_catalog: caseGaps,
  priority_queues: priorityQueues,
  top_exact_orphan_paths: exactOrphans.slice(0, 200).map(file => file.path),
  top_unowned_paths: unowned.slice(0, 200).map(file => file.path),
  branch_only_paths: branchOnlyFiles.slice(0, 300),
  boundaries: {
    summary_exhausts_gap_ledger: false,
    priority_class_proves_materiality: false,
    exact_orphan_proves_irrelevance: false,
    public_gap_requires_publication: false,
    branch_shadow_proves_merge_value: false
  }
};

function pct(n, d) {
  return d ? `${(n / d * 100).toFixed(1)}%` : 'n/a';
}

const topRoles = roleSummary.slice(0, 12).map(row => `| ${row.role} | ${row.files} | ${row.index_reachable} | ${row.exact_orphans} | ${row.no_program_owner} |`).join('\n');
const topClusters = clusterSummary.slice(0, 15).map(row => `| ${row.cluster} | ${row.files} | ${row.index_reachable} | ${row.exact_orphans} | ${row.no_program_owner} |`).join('\n');
const orphanClusters = priorityQueues.p1_exact_orphan_sources.by_cluster.slice(0, 15).map(row => `| ${row.key} | ${row.count} |`).join('\n');
const branchPrs = priorityQueues.p4_branch_shadow.by_pr.slice(0, 20).map(row => `| ${row.key} | ${row.count} |`).join('\n');

const markdown = `# Lake index gap summary\n\nSource fingerprint: \`${summary.source_fingerprint_sha256}\`\n\n## Finding\n\nThe current Git tree is physically censused, but the evidence lake is not semantically indexed or known. Of ${evidence.length} evidence-bearing files, ${notIndexed.length} (${pct(notIndexed.length, evidence.length)}) are not reachable from any detected index, ${exactOrphans.length} (${pct(exactOrphans.length, evidence.length)}) have no inbound repository reference, and ${unowned.length} (${pct(unowned.length, evidence.length)}) have no detected program owner.\n\n## By evidence role\n\n| Role | Files | Index-reachable | Exact orphans | No program owner |\n|---|---:|---:|---:|---:|\n${topRoles}\n\n## By repository cluster\n\n| Cluster | Files | Index-reachable | Exact orphans | No program owner |\n|---|---:|---:|---:|---:|\n${topClusters}\n\n## First repair queues\n\n### P0 — integrity breaks\n\n\`\`\`text\nparse errors:                   ${gaps.parse_errors.length}\nundefined receipt references:   ${gaps.undefined_receipt_references.length}\nprojection IDs without source:  ${gaps.projection_ids_without_source.length}\nmissing repository path tokens: ${gaps.missing_repo_path_tokens.length}\n\`\`\`\n\n### P1 — exact orphan evidence\n\n| Cluster | Orphan paths |\n|---|---:|\n${orphanClusters}\n\n### P2 — unowned evidence\n\n${unowned.length} evidence-bearing files have no detected program owner. Ownership here means a declared program ID or an inbound reference from a program-bearing file; it does not mean that every unowned file is erroneous.\n\n### P3 — index and publication gaps\n\n\`\`\`text\nnot reachable from any detected index: ${notIndexed.length}\nnot reachable from authoritative roots: ${notAuthoritative.length}\nnot reachable from public roots: ${notPublic.length}\ncase IDs absent from public catalog: ${caseGaps.length}\n\`\`\`\n\n### P4 — open branch shadow\n\n| Open PR | Branch-only paths |\n|---|---:|\n${branchPrs || '| None observed | 0 |'}\n\n### P5 — history and semantics\n\nThe current census does not index closed branches, abandoned refs, deleted paths, prior object versions, or the full commit history. It also does not resolve whether repeated identifiers denote the same entity or whether a mechanically detected owner is the correct semantic owner.\n\n## Boundary\n\nPriority is an indexing and integrity queue, not a claim ranking. An orphan can be important, duplicative, obsolete, generated, or intentionally isolated. Each requires a disposition rather than automatic promotion or deletion.\n`;

fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'build/lake-index-gap-summary.json'), JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'reports/lake-index-gap-summary.md'), markdown);
console.log('lake index gap summary built');
console.log(`  not index reachable: ${notIndexed.length}`);
console.log(`  exact orphans: ${exactOrphans.length}`);
console.log(`  unowned: ${unowned.length}`);
