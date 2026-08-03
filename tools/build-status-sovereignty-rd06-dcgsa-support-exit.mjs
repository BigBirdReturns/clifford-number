#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const readJson = (rel) => JSON.parse(readBytes(rel).toString('utf8'));
const write = (rel, value) => { const target = path.join(root, rel); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]));

function walk(rel) {
  const absolute = path.join(root, rel);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = path.posix.join(rel, entry.name);
    return entry.isDirectory() ? walk(child) : [child];
  });
}

export function locateDcgsaSupportSource() {
  const candidates = [...walk('data/intake'), ...walk('data/research')]
    .filter((rel) => rel.endsWith('.json'))
    .map((rel) => { try { return { rel, value: readJson(rel) }; } catch { return null; } })
    .filter(Boolean);
  const byIssue = candidates.find(({ value }) => value?.issue === 622);
  if (byIssue) return byIssue.rel;
  const byName = candidates.find(({ rel }) => /rd06|dcgsa.*support|dcgs-a.*support|dcgsa.*exit/i.test(rel));
  if (!byName) throw new Error('RD-06 DCGS-A support source ledger not found');
  return byName.rel;
}

function locateMilestone() {
  const candidates = walk('docs/milestones').filter((rel) => /rd06|dcgsa.*support|dcgs-a.*support|dcgsa.*exit/i.test(rel));
  if (!candidates.length) throw new Error('RD-06 DCGS-A milestone not found');
  return candidates.sort()[0];
}

export function sourceScope() {
  return [
    '.github/workflows/status-sovereignty-rd06-dcgsa-support-exit.yml',
    locateDcgsaSupportSource(),
    'schemas/status-sovereignty-rd06-dcgsa-support-exit.schema.json',
    locateMilestone(),
    'tools/build-status-sovereignty-rd06-dcgsa-support-exit.mjs',
    'tools/validate-status-sovereignty-rd06-dcgsa-support-exit.mjs',
    'test/status-sovereignty-rd06-dcgsa-support-exit.test.js'
  ];
}

export function computeDcgsaSupportManifest() {
  const entries = sourceScope().map((rel) => { const bytes = readBytes(rel); return { path: rel, sha256: sha256(bytes), bytes: bytes.length }; });
  return {
    schema_version: 'status-sovereignty-rd06-dcgsa-support-exit-release-manifest@1',
    execution_id: 'SSC-RD06-DCGSA-SUPPORT-EXIT-01',
    hypothesis_id: 'SSC-H01',
    as_of: '2026-08-01',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_complete_offeror_or_support_denominator: false,
      manifest_proves_comparative_effectiveness_or_technical_superiority: false,
      manifest_proves_foreclosure_exclusivity_or_dependency: false,
      manifest_changes_reviewed_disposition: false,
      manifest_proves_coordination_common_purpose_or_complete_compact: false,
      manifest_authorizes_publication: false,
      graph_effect: 'none'
    }
  };
}

export function buildDcgsaSupportExit() {
  const sourcePath = locateDcgsaSupportSource();
  const source = readJson(sourcePath);
  const text = JSON.stringify(source);
  for (const token of ['Palantir', 'Raytheon', 'General Dynamics']) {
    if (!text.includes(token)) throw new Error(`DCGS-A source missing ${token}`);
  }
  const sourceRecords = Array.isArray(source.sources) ? source.sources.length : 1;
  const manifest = computeDcgsaSupportManifest();
  const report = {
    schema_version: 'status-sovereignty-rd06-dcgsa-support-exit@1',
    execution_id: 'SSC-RD06-DCGSA-SUPPORT-EXIT-01',
    hypothesis_id: 'SSC-H01',
    issue: 622,
    parent_issue: 615,
    lane_id: 'SSC-F13',
    authority: 'source_acquisition_only_not_review_or_adjudication',
    source_ledger_path: sourcePath,
    counts: {
      source_records: sourceRecords,
      later_proposals_received: 8,
      publicly_named_offerors: 3,
      unresolved_offeror_identities: 5,
      awardees: 2,
      named_rejected_offerors: 1,
      live_demonstration_tasks: 32,
      approximate_performance_requirements: 70,
      external_judicial_corrections: 1,
      fielded_systems_fy2021: 879,
      fielded_maneuver_battalions: 402,
      published_operational_test_result_sets: 0,
      complete_support_differentials: 0,
      complete_data_rights_records: 0,
      complete_substitution_or_exit_records: 0,
      reviewed_disposition_changes: 0,
      complete_compact_findings: 0,
      graph_effects: 0,
      publication_effects: 0
    },
    identification_floor: {
      observed_winner_is_latent_preferred_option: false,
      unoffered_or_undersupported_alternative_is_rejected: false,
      operational_fit_identifies_mechanism: false,
      public_support_proves_improper_favoritism: false,
      later_success_proves_intrinsic_superiority: false
    },
    current_result: {
      terminal_state: 'partial_option_universe_and_continuity_recovered_foreclosure_unresolved',
      external_correction_control_retained: true,
      later_competition_control_retained: true,
      support_asymmetry_finding: false,
      counterfactual_foreclosure_finding: false,
      technical_superiority_finding: false,
      favoritism_finding: false,
      unavoidable_dependency_finding: false,
      coordination_finding: false,
      common_purpose_finding: false,
      complete_compact_finding: false,
      graph_effect: 'none',
      publication_effect: 'none'
    },
    boundaries: {
      protest_denial_proves_complete_or_fair_option_set: false,
      award_proves_technical_superiority: false,
      fielding_scale_proves_comparative_effectiveness: false,
      continued_support_proves_exclusivity: false,
      integration_cost_proves_unavoidable_dependency: false,
      judicial_correction_proves_later_option_set_fairness: false,
      palantir_involvement_proves_common_purpose: false,
      graph_effect: 'none'
    },
    release_manifest: {
      path: 'data/project/status-sovereignty-rd06-dcgsa-support-exit-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };

  write('data/project/status-sovereignty-rd06-dcgsa-support-exit-release-manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/rd06-dcgsa-support-exit/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/rd06-dcgsa-support-exit/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/rd06-dcgsa-support-exit/data.json', stable(report));

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC RD-06 · DCGS-A support and exit</title><style>:root{color-scheme:light;background:#eeeae0;color:#171612;font-family:system-ui,sans-serif}body{max-width:1400px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2rem,5vw,4.5rem);line-height:1;letter-spacing:-.04em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.card,.boundary{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem}code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.state{font-weight:800;color:#7b2f16}.boundary{border-left:6px solid #7c2920;padding:18px}</style></head><body><p><strong>CLIFFORD NUMBER · SSC-H01 · RD-06 · ACQUISITION ONLY</strong></p><h1>DCGS-A option set, support, performance, substitution, and exit</h1><p class="state">EIGHT PROPOSALS · FIVE OFFEROR IDENTITIES UNRESOLVED · EXTERNAL CORRECTION RETAINED · OPERATIONAL TEST RESULTS, SUPPORT DIFFERENTIALS, DATA RIGHTS, SUBSTITUTION, AND EXIT OPEN · GRAPH EFFECT NONE</p><div class="grid"><div class="card"><b>8</b>later proposals</div><div class="card"><b>3</b>named offerors</div><div class="card"><b>5</b>unresolved offerors</div><div class="card"><b>32</b>demonstration tasks</div><div class="card"><b>879</b>systems fielded</div><div class="card"><b>0</b>complete exit records</div></div><h2>Current result</h2><pre>${esc(JSON.stringify(report.current_result, null, 2))}</pre><h2>Identification floor</h2><pre class="boundary">${esc(JSON.stringify(report.identification_floor, null, 2))}</pre><h2>Authority boundary</h2><pre class="boundary">${esc(JSON.stringify(report.boundaries, null, 2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/rd06-dcgsa-support-exit/index.html', `${html}\n`);
  console.log(`build-status-sovereignty-rd06-dcgsa-support-exit: 8 proposals, 5 identities unresolved, 0 complete exit records`);
  return { source, sourcePath, manifest, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildDcgsaSupportExit();
