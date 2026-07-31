#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const write = (rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

export const releaseScope = [
  'package.json',
  '.github/workflows/project-stable-ground-sg07.yml',
  '.github/workflows/project-stable-ground-sg08.yml',
  '.github/workflows/status-sovereignty-compact.yml',
  '.github/workflows/status-sovereignty-wave-01.yml',
  '.github/workflows/status-sovereignty-wave-01-review.yml',
  '.github/workflows/status-sovereignty-wave-01-targeted-acquisition.yml',
  'data/project/project-stable-ground-governor.json',
  'data/project/project-stable-ground-current.json',
  'data/project/project-stable-ground-sg07.json',
  'data/project/project-stable-ground-sg07-release-manifest.json',
  'reports/core-thesis/stable-ground/sg07/checkpoint.json',
  'reports/core-thesis/stable-ground/sg07/index.html',
  'data/project/project-stable-ground-sg08.json',
  'data/project/status-sovereignty-compact.json',
  'data/project/status-sovereignty-fanout.json',
  'data/project/status-sovereignty-source-registry.json',
  'data/project/status-sovereignty-wave-01-release-manifest.json',
  'data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json',
  'data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json',
  'data/project/status-sovereignty-release-manifest.json',
  'data/research/status-sovereignty-wave-01-source-receipts.json',
  'data/research/status-sovereignty-wave-01.json',
  'data/research/status-sovereignty-wave-01-maintainer-review.json',
  'data/research/status-sovereignty-wave-01-targeted-acquisition-source-receipts.json',
  'data/research/status-sovereignty-wave-01-targeted-acquisition.json',
  'data/research/k0-role-neutral-denominator.json',
  'data/project/dca-h01-role-neutral-denominator.json',
  'data/project/poof-clifford-aperture.json',
  'data/project/poof-clifford-ecology-release-manifest.json',
  'data/project/m05-answerable-power-sprint-09-plan.json',
  'docs/milestones/m05-status-sovereignty-wave-01-targeted-acquisition.md',
  'docs/milestones/project-stable-ground-sg08.md',
  'schemas/status-sovereignty-targeted-acquisition.schema.json',
  'tools/build-project-stable-ground-sg08.mjs',
  'tools/validate-project-stable-ground-sg07.mjs',
  'tools/validate-project-stable-ground-sg08.mjs',
  'tools/build-status-sovereignty-wave-01-targeted-acquisition.mjs',
  'tools/validate-status-sovereignty-wave-01-targeted-acquisition.mjs',
  'tools/build-status-sovereignty-compact.mjs',
  'tools/validate-status-sovereignty-compact.mjs',
  'test/project-stable-ground-sg07.test.js',
  'test/project-stable-ground-sg08.test.js',
  'test/status-sovereignty-wave-01-targeted-acquisition.test.js',
  'test/status-sovereignty-compact.test.js'
];

export function computeSg08Manifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'project-stable-ground-sg08-release-manifest@1',
    checkpoint_id: 'SG-2026-07-30-08',
    as_of: '2026-07-30',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_complete_denominator: false,
      manifest_closes_acquisition_obligation: false,
      manifest_changes_reviewed_disposition: false,
      manifest_proves_complete_compact: false,
      manifest_proves_racial_order: false,
      manifest_proves_prevalence: false,
      manifest_proves_second_party_review: false,
      manifest_proves_adjudication: false,
      manifest_authorizes_publication: false,
      manifest_advances_adoption: false,
      graph_effect: 'none'
    }
  };
}

export function buildStableGroundSG08() {
  const checkpoint = read('data/project/project-stable-ground-sg08.json');
  const pointer = read('data/project/project-stable-ground-current.json');
  const governor = read('data/project/project-stable-ground-governor.json');
  const statusRelease = read('data/project/status-sovereignty-release-manifest.json');
  const targetRelease = read('data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json');
  const poofRelease = read('data/project/poof-clifford-ecology-release-manifest.json');
  const manifest = computeSg08Manifest();
  write('data/project/project-stable-ground-sg08-release-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);

  const snapshot = checkpoint.canonical_snapshot;
  const target = checkpoint.fanout_state.targeted_acquisition;
  const report = {
    schema_version: 'project-stable-ground-sg08-report@1',
    project_id: checkpoint.project_id,
    program_id: checkpoint.program_id,
    checkpoint_id: checkpoint.checkpoint_id,
    as_of: checkpoint.as_of,
    title: 'Stable-ground supersession 08 · SSC-W01 targeted acquisition',
    canonical_main: checkpoint.canonical_main,
    supersedes: checkpoint.supersedes,
    history: pointer.history,
    governor: {
      path: checkpoint.governor,
      schema_version: governor.schema_version,
      correction_mode: governor.checkpoint_contract.correction_mode
    },
    authority_change: checkpoint.authority_change,
    counts: {
      checkpoints_preserved: pointer.history.length,
      stable_propositions: checkpoint.preserved_stable_propositions.length,
      owner_lanes: checkpoint.fanout_state.owner_lanes.length,
      ssc_gates: snapshot.status_sovereignty.gates,
      ssc_dimensions: snapshot.status_sovereignty.dimensions,
      ssc_lanes: snapshot.status_sovereignty.fanout_lanes,
      ssc_executed_lanes: snapshot.status_sovereignty.executed_lanes,
      ssc_observations: snapshot.status_sovereignty.records_retained,
      maintainer_reviewed: snapshot.status_sovereignty.maintainer_reviewed,
      second_party_reviewed: snapshot.status_sovereignty.second_party_reviewed,
      adjudicated: snapshot.status_sovereignty.adjudicated,
      complete_compact_findings: snapshot.status_sovereignty.complete_compact_findings,
      targeted_acquisition_source_records: target.source_records,
      acquisition_obligations: target.obligations,
      partially_repaired_open: target.partially_repaired_open,
      closed_obligations: target.closed,
      reviewed_disposition_changes: target.reviewed_disposition_changes,
      k0_executed: snapshot.k0.query_templates_executed,
      k0_total: snapshot.k0.query_templates_total,
      dca_executed: snapshot.dca.query_templates_executed,
      adoption_level: snapshot.sprint_09.maximum_verified_adoption_level
    },
    canonical_snapshot: snapshot,
    fanout_state: checkpoint.fanout_state,
    build_order: checkpoint.build_order,
    drift_resolutions: checkpoint.drift_resolutions,
    change_control: checkpoint.change_control,
    boundaries: checkpoint.boundaries,
    targeted_acquisition_release: {
      path: 'data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json',
      combined_sha256: targetRelease.combined_sha256
    },
    status_release: {
      path: 'data/project/status-sovereignty-release-manifest.json',
      combined_sha256: statusRelease.combined_sha256
    },
    poof_release: {
      path: 'data/project/poof-clifford-ecology-release-manifest.json',
      combined_sha256: poofRelease.combined_sha256
    },
    release_manifest: {
      path: 'data/project/project-stable-ground-sg08-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('reports/core-thesis/stable-ground/sg08/checkpoint.json', `${JSON.stringify(report, null, 2)}\n`);

  const historyRows = pointer.history.map((row) => `<tr><td><code>${esc(row.checkpoint_id)}</code></td><td>${esc(row.status)}</td><td><code>${esc(row.merge_commit || row.trigger_commit || '')}</code></td></tr>`).join('');
  const obligationRows = [
    ['NatSec100', 'selected roster and published inputs recovered', 'candidate, rejection, FOCI, reproducibility, and downstream joins still open'],
    ['SBIC Critical Technologies', 'application, approval, cohort, named/withheld, and licensed states recovered', 'applicant identities, decisions, rights, performance, failure, and recovery still open'],
    ['Office of Strategic Capital', 'application/request/capacity aggregate and five named instrument states recovered', 'applicant, invitee, underwriting, complete terms, performance, and recovery still open']
  ].map(([name, recovered, open]) => `<tr><td>${esc(name)}</td><td>${esc(recovered)}</td><td>${esc(open)}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SG-08 · SSC-W01 targeted acquisition · Clifford Number</title><style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{max-width:1320px;margin:0 auto;padding:40px 24px 72px;line-height:1.55}h1{font-size:clamp(2rem,6vw,4.6rem);line-height:.94;margin:0 0 1rem}h2{margin-top:2.2rem}code{overflow-wrap:anywhere}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;padding:.65rem;border-bottom:1px solid #b7b0a1}.lede{font-size:1.2rem;max-width:78ch}.boundary{border:2px solid #181714;padding:1rem;margin:1.5rem 0;background:#f8f4ea}</style></head><body><p><code>${esc(checkpoint.checkpoint_id)}</code></p><h1>Targeted acquisition without manufactured closure</h1><p class="lede">Twelve official or first-party records partially repair three SSC-W01 denominator obligations. All three remain open. No reviewed disposition, second-party review state, adjudication, complete-compact finding, graph effect, or publication authority changes.</p><div class="boundary"><strong>Authority ceiling.</strong> Selected rosters, named instruments, and aggregate application counts are not complete candidate, rejection, underwriting, performance, failure, or recovery denominators.</div><h2>Frozen counts</h2><pre>${esc(JSON.stringify(report.counts, null, 2))}</pre><h2>Open obligations</h2><table><thead><tr><th>Lane</th><th>Recovered</th><th>Still required</th></tr></thead><tbody>${obligationRows}</tbody></table><h2>Checkpoint history</h2><table><thead><tr><th>Checkpoint</th><th>Status</th><th>Receipt</th></tr></thead><tbody>${historyRows}</tbody></table><h2>Exact custody</h2><p>Targeted acquisition: <code>${esc(targetRelease.combined_sha256)}</code></p><p>SSC-H01: <code>${esc(statusRelease.combined_sha256)}</code></p><p>POOF: <code>${esc(poofRelease.combined_sha256)}</code></p><p>SG-08: <code>${esc(manifest.combined_sha256)}</code></p></body></html>`;
  write('reports/core-thesis/stable-ground/sg08/index.html', html);
  console.log(`build-project-stable-ground-sg08: ${pointer.history.length} checkpoints, ${target.source_records} acquisition sources, ${target.partially_repaired_open} partially repaired, ${target.closed} closed, ${manifest.entries.length} release entries`);
  return { checkpoint, pointer, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildStableGroundSG08();
