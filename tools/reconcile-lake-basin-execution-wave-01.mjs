#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const readJsonl = relative => fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const writeJson = (relative, value) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), JSON.stringify(value, null, 2) + '\n');
};

const initial = readJson('build/lake-actions/waterline.json');
const finalBasins = readJson('build/lake-index/basins.json');
const finalGaps = readJsonl('build/lake-index/basin-gaps.jsonl');
const finalMembership = readJsonl('build/lake-index/basin-membership.jsonl');
const coreIndex = readJson('build/core-thesis/index.json');
const policyReceipt = readJson('data/project/lake-basin-execution-wave-01.json');
const finalUnclassified = finalMembership.filter(row => row.basin_id === 'unclassified-current-tree');
const finalEvidence = finalMembership.filter(row => row.evidence_bearing);
const finalMissingEntrypoints = finalGaps.filter(row => row.gap_type === 'missing_authoritative_entrypoint');
const finalPublicBoundary = finalGaps.filter(row => row.gap_type === 'public_reachability_requires_authorization_review');
const finalSourceOrphans = finalGaps.filter(row => row.gap_type === 'source_record_without_authoritative_reachability');
const coreMissing = finalMissingEntrypoints.filter(row => row.basin_id === 'core-thesis-build-products');
const sourceFingerprint = sha256(Buffer.from([
  fs.readFileSync(full('build/lake-actions/waterline.json')),
  fs.readFileSync(full('build/lake-index/basins.json')),
  fs.readFileSync(full('build/lake-index/basin-gaps.jsonl')),
  fs.readFileSync(full('build/lake-index/basin-membership.jsonl')),
  fs.readFileSync(full('build/core-thesis/index.json')),
  fs.readFileSync(full('data/project/lake-basin-execution-wave-01.json'))
].map(buffer => sha256(buffer)).join('\n')));

const reconciliation = {
  schema_version: 'lake-basin-execution-wave-01-reconciliation@1',
  program_id: initial.program_id,
  source_fingerprint_sha256: sourceFingerprint,
  before: {
    unclassified_paths: initial.counts.current_unclassified_paths,
    missing_entrypoints: initial.counts.prior_missing_entrypoints,
    source_orphan_gaps: initial.counts.source_orphan_gaps_remaining,
    public_boundary_gaps: initial.counts.public_boundary_gaps_deferred_to_release_integrity,
    registry_basins: initial.counts.current_basin_count
  },
  after: {
    unclassified_paths: finalUnclassified.length,
    missing_entrypoints: finalMissingEntrypoints.length,
    core_thesis_missing_entrypoints: coreMissing.length,
    source_orphan_gaps: finalSourceOrphans.length,
    public_boundary_gaps: finalPublicBoundary.length,
    registry_basins: finalBasins.counts?.basin_count ?? null,
    evidence_files_with_registry_owner: finalEvidence.filter(row => row.owner_program_id).length,
    evidence_files_without_registry_owner: finalEvidence.filter(row => !row.owner_program_id).length,
    core_thesis_products_in_entrypoint: coreIndex.counts?.products ?? null
  },
  deltas: {
    unclassified_paths: finalUnclassified.length - initial.counts.current_unclassified_paths,
    missing_entrypoints: finalMissingEntrypoints.length - initial.counts.prior_missing_entrypoints,
    source_orphan_gaps: finalSourceOrphans.length - initial.counts.source_orphan_gaps_remaining,
    public_boundary_gaps: finalPublicBoundary.length - initial.counts.public_boundary_gaps_deferred_to_release_integrity,
    registry_basins: (finalBasins.counts?.basin_count ?? 0) - (initial.counts.current_basin_count ?? 0)
  },
  decisions: [
    {
      decision_id: 'LAKE-W01-RECONCILE-PATHS',
      judgment: finalUnclassified.length === 0
        ? 'current_tree_path_assignment_completed_for_the_wave_01_snapshot'
        : 'current_tree_path_assignment_still_has_residual_paths',
      action: finalUnclassified.length === 0
        ? 'monitor_future_paths_and_require_an_explicit_basin_or_exact_disposition'
        : 'add_exact_dispositions_for_the_remaining_paths',
      evidence_count: finalUnclassified.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_id: 'LAKE-W01-RECONCILE-CORE',
      judgment: coreMissing.length === 0
        ? 'core_thesis_authoritative_entrypoint_present'
        : 'core_thesis_entrypoint_still_missing',
      action: coreMissing.length === 0
        ? 'execute_identifier_and_source_lineage_repairs_from_the_new_entrypoint'
        : 'repair_the_core_thesis_entrypoint_before_more_narrative_expansion',
      evidence_count: coreIndex.counts?.products ?? 0,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_id: 'LAKE-W01-RECONCILE-PUBLICATION',
      judgment: 'public_reachability_conflicts_remain_a_material_publication_safety_dependency',
      action: 'stack_after_PR_382_then_recompute_against_the_status_aware_publication_allowlist',
      evidence_count: finalPublicBoundary.length,
      blocker: 'recursive_publication_on_current_main',
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    core_thesis_entrypoint_closed: coreMissing.length === 0,
    current_snapshot_path_assignment_closed: finalUnclassified.length === 0,
    every_evidence_file_has_registry_owner: finalEvidence.every(row => row.owner_program_id),
    identifier_repairs_complete: false,
    source_orphan_repairs_complete: false,
    public_boundary_recomputed_after_PR_382: false,
    semantic_lake_complete: false,
    evidence_truth_determined: false,
    decisions_requiring_human_permission: 0
  },
  source_migration_receipt: policyReceipt,
  boundaries: {
    path_assignment_is_semantic_completeness: false,
    registry_owner_proves_correct_ownership: false,
    entrypoint_proves_evidence_truth: false,
    graph_effect: 'none'
  }
};

writeJson('build/lake-actions/post-execution-reconciliation.json', reconciliation);
const report = `# Evidence Lake Basin Execution Wave 01 — Reconciliation\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Before and after\n\n| Measure | Before | After | Delta |\n|---|---:|---:|---:|\n| Unclassified current-tree paths | ${reconciliation.before.unclassified_paths} | ${reconciliation.after.unclassified_paths} | ${reconciliation.deltas.unclassified_paths} |\n| Missing authoritative entrypoints | ${reconciliation.before.missing_entrypoints} | ${reconciliation.after.missing_entrypoints} | ${reconciliation.deltas.missing_entrypoints} |\n| Source-orphan gaps | ${reconciliation.before.source_orphan_gaps} | ${reconciliation.after.source_orphan_gaps} | ${reconciliation.deltas.source_orphan_gaps} |\n| Public-boundary conflicts | ${reconciliation.before.public_boundary_gaps} | ${reconciliation.after.public_boundary_gaps} | ${reconciliation.deltas.public_boundary_gaps} |\n| Declared basins | ${reconciliation.before.registry_basins} | ${reconciliation.after.registry_basins} | ${reconciliation.deltas.registry_basins} |\n\n## Decisions\n\n- Current-tree path assignment: **${reconciliation.completion.current_snapshot_path_assignment_closed ? 'closed for this snapshot' : 'still open'}**.\n- Core-thesis entrypoint: **${reconciliation.completion.core_thesis_entrypoint_closed ? 'present and indexed' : 'still missing'}**.\n- Evidence files with a registry owner: **${reconciliation.after.evidence_files_with_registry_owner}/${finalEvidence.length}**.\n- Public-boundary conflicts: **${reconciliation.after.public_boundary_gaps} remain held by the concrete recursive-publication defect, not by missing human permission.**\n- Next action: execute priority-1 identifier projection repairs, then source-orphan lineage repairs.\n\n## Boundary\n\nClosing path assignment and an entrypoint does not make the lake semantically complete or the evidence true. It creates an addressable, reversible operating surface from which the next repair wave can proceed.\n`;
fs.writeFileSync(full('reports/lake-basin-execution-wave-01-reconciliation.md'), report);
console.log('reconcile-lake-basin-execution-wave-01: complete');
console.log(`  unclassified paths: ${reconciliation.before.unclassified_paths} -> ${reconciliation.after.unclassified_paths}`);
console.log(`  core missing entrypoints: ${coreMissing.length}`);
console.log(`  evidence registry owners: ${reconciliation.after.evidence_files_with_registry_owner}/${finalEvidence.length}`);
