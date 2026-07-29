#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const read = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(value, null, 2) + '\n';
const snapshotPath = 'data/project/lake-judgment-shadow-snapshot.json';
const ledgerPath = 'build/evidence-grounded-judgments.json';
const reportPath = 'reports/evidence-grounded-lake-decisions.md';

if (!fs.existsSync(full(snapshotPath))) {
  console.log('lake judgment snapshot absent; no augmentation performed');
  process.exit(0);
}
if (!fs.existsSync(full(ledgerPath))) throw new Error('build the judgment ledger before lake augmentation');

const snapshot = read(snapshotPath);
const ledger = read(ledgerPath);
const snapshotBytes = fs.readFileSync(full(snapshotPath));
const manifestRow = { path: snapshotPath, bytes: snapshotBytes.length, sha256: sha256(snapshotBytes) };
ledger.input_manifest = [...(ledger.input_manifest ?? []).filter(row => row.path !== snapshotPath), manifestRow]
  .sort((a, b) => a.path.localeCompare(b.path));
ledger.source_fingerprint_sha256 = sha256(ledger.input_manifest.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join(''));

const existing = new Set((ledger.decisions ?? []).map(row => row.decision_id));
const lakeDecisions = [];
for (const row of snapshot.decisions_supported_by_snapshot ?? []) {
  const decision = {
    decision_id: `JDG-BASIN-${row.subject_id}`,
    domain: 'lake_basin',
    subject_id: row.subject_id,
    judgment_level: 'J4',
    judgment: row.judgment,
    evidence_basis: {
      snapshot_id: snapshot.snapshot_id,
      source_branch: snapshot.source_branch,
      source_pull_request: snapshot.source_pull_request,
      source_fingerprint_sha256: snapshot.source_fingerprint_sha256,
      priority: row.priority,
      evidence_count: row.evidence_count,
      lake_counts: snapshot.counts
    },
    counterevidence: [
      'The source is an open-branch shadow snapshot, not merged corpus.',
      'Mechanical orphan and ownership classifications require semantic disposition.'
    ],
    uncertainties: [
      'Closed and deleted branches are not covered by this snapshot.',
      'A detected gap can represent important evidence, deliberate isolation, generated output, duplication, or obsolete material.',
      'The snapshot does not determine evidence truth or publication clearance.'
    ],
    action: row.action,
    reversibility: {
      mode: 'append_preserving_supersession',
      correction_route: 'regenerate_from_a_newer_lake_census_or_replace_with_the_merged_basin_waterline'
    },
    review_dependency: {
      required_to_decide: false,
      current_review_status: 'open_branch_shadow',
      effect: 'semantic_review_may_reorder_or_overturn_priority_but_does_not_block_reversible_repair'
    },
    publication_effect: 'none_internal_repair_priority',
    graph_effect: 'none'
  };
  lakeDecisions.push(decision);
  if (!existing.has(decision.decision_id)) ledger.decisions.push(decision);
}

ledger.decisions.sort((a, b) => `${a.domain}:${a.subject_id}`.localeCompare(`${b.domain}:${b.subject_id}`));
const byDomain = {};
const byLevel = {};
for (const decision of ledger.decisions) {
  byDomain[decision.domain] = (byDomain[decision.domain] ?? 0) + 1;
  byLevel[decision.judgment_level] = (byLevel[decision.judgment_level] ?? 0) + 1;
}
ledger.summary.decisions = ledger.decisions.length;
ledger.summary.by_domain = byDomain;
ledger.summary.by_level = byLevel;
ledger.summary.decisions_requiring_human_permission = ledger.decisions.filter(row => row.review_dependency?.required_to_decide !== false).length;
ledger.summary.lake_layer_present = true;
ledger.summary.lake_shadow_snapshot_present = true;
ledger.summary.lake_operational_decisions = lakeDecisions.length;
ledger.boundaries.open_branch_shadow_is_merged_corpus = false;
ledger.boundaries.lake_priority_proves_materiality = false;

const rows = lakeDecisions.map(row => `| ${row.evidence_basis.priority} | ${row.subject_id} | ${row.evidence_basis.evidence_count} | ${row.judgment} | ${row.action} |`).join('\n');
const report = `# Evidence-grounded lake decisions\n\nSnapshot: \`${snapshot.snapshot_id}\`  \nSource branch: \`${snapshot.source_branch}\`  \nSource fingerprint: \`${snapshot.source_fingerprint_sha256}\`\n\n## Decision\n\nThe lake census is an open-branch shadow, but its measured gaps are sufficient to choose reversible work. The project does not need an unspecified future reviewer to decide that 1,096 unowned evidence files, 8,540 broken source/projection joins, 770 unindexed evidence files, 193 concentrated core-thesis orphans, 23 uncatalogued cases, and 102 branch-only paths require ordered repair.\n\n| Priority | Basin or queue | Evidence count | Bounded judgment | Action |\n|---:|---|---:|---|---|\n${rows}\n\n## Current operating order\n\n1. Assign semantic program ownership and authoritative entrypoints.\n2. Repair source/projection identifier integrity by identifier family.\n3. Build core-thesis source-to-projection manifests before another narrative expansion.\n4. Attach every retained evidence file to an index, manifest, isolation record, or deletion disposition.\n5. Disposition the 23 internal case IDs absent from the public catalog.\n6. Reconcile every branch-only path as active, salvage, superseded, abandon, or merge.\n\n## Boundary\n\nThis snapshot is not merged corpus, semantic completeness, evidence truth, publication clearance, or a claim ranking. It is enough evidence to make a reversible operating decision.\n`;

fs.mkdirSync(path.dirname(full(ledgerPath)), { recursive: true });
fs.mkdirSync(path.dirname(full(reportPath)), { recursive: true });
fs.writeFileSync(full(ledgerPath), stable(ledger));
fs.writeFileSync(full(reportPath), report);
console.log(`augment-evidence-grounded-judgments-with-lake: ${lakeDecisions.length} lake decisions; ${ledger.summary.decisions_requiring_human_permission} human-permission gates`);
