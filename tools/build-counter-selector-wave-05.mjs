#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const modulePath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(modulePath), '..');
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));
const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const writeText = (rel, content) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const esc = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

export const releaseScope = [
  '.github/workflows/counter-selector-wave-05.yml',
  'data/project/counter-selector-wave-05-gap-resolution.json',
  'data/project/counter-selector-wave-05-source-registry.json',
  'schemas/counter-selector-post-review-gap.schema.json',
  'docs/methods/counter-selector-post-review-gap.md',
  'docs/milestones/counter-selector-wave-05.md',
  'tools/build-counter-selector-wave-05.mjs',
  'tools/validate-counter-selector-wave-05.mjs',
  'test/counter-selector-wave-05.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = fs.readFileSync(path.join(root, rel));
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-05-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W05-GAP-01',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_support_adjusted_surplus: false,
      manifest_proves_final_merits: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_person_ranking: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

function buildGapRecord(plan) {
  const common = {
    schema_version: 'counter-selector-post-review-gap@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W05-GAP-01',
    packet_id: plan.packet_id,
    candidate_id: plan.candidate_id,
    dimension_vector: structuredClone(plan.dimension_update),
    disposition: plan.disposition,
    field_test_eligible: false,
    operator_finding: false,
    promotion_generated: false,
    person_ranking_generated: false,
    public_identity_release_authorized: false,
    graph_effect: 'none'
  };
  if (plan.packet_id === 'CS-BLIND-0016') {
    return {
      ...common,
      lane_type: 'support_handoff_transfer_audit',
      blind_token: plan.blind_token,
      source_ids: [...plan.source_ids],
      support_ledger: structuredClone(plan.support_ledger),
      findings: structuredClone(plan.findings),
      next_acquisitions: [...plan.next_acquisitions]
    };
  }
  return {
    ...common,
    lane_type: 'correction_finality_audit',
    blind_token: plan.blind_token,
    source_ids: [...plan.source_ids],
    search_receipt_ids: [...plan.search_receipt_ids],
    chronology: structuredClone(plan.chronology),
    supersession: structuredClone(plan.supersession),
    findings: structuredClone(plan.mechanism_update),
    analysis_class: plan.analysis_class,
    next_acquisitions: [...plan.next_acquisitions]
  };
}

function buildSupersession(contract, sourceRegistry) {
  const plan = contract.lane_plans.find((row) => row.packet_id === 'CS-BLIND-0021');
  const order = sourceRegistry.sources.find((row) => row.source_id === 'CS-W05-S005');
  return {
    schema_version: 'counter-selector-append-only-supersession@1',
    supersession_id: 'CS-W05-SUP-01',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    target: {
      wave_id: 'CS-W04-B01',
      packet_id: plan.packet_id,
      prior_statement: plan.supersession.prior_statement,
      historical_file_rewritten: false
    },
    correction: {
      statement: plan.supersession.corrected_statement,
      correction_type: plan.supersession.correction_type,
      chronology: structuredClone(plan.chronology),
      decisive_source_id: order.source_id,
      decisive_source_title: order.title
    },
    authority_effect: {
      adverse_state_reinstated_under_external_stay: true,
      final_merits_established: false,
      durable_internal_repair_established: false,
      operator_finding_created: false,
      field_test_authorized: false,
      graph_effect: 'none'
    }
  };
}

export function buildCounterSelectorWave05() {
  const contract = readJson('data/project/counter-selector-wave-05-gap-resolution.json');
  const sources = readJson('data/project/counter-selector-wave-05-source-registry.json');
  const parent = readJson('data/project/counter-selector-blind-review-registry.json');
  if (parent.wave_id !== contract.parent_wave_id) throw new Error('Wave 04 parent mismatch');
  if (contract.parent_release_sha256 !== '4bfa22d8087becfa12549cd27c60441dbddd3e5047a4133d1fbec6c468e0e19d') {
    throw new Error('Wave 04 release digest mismatch');
  }
  const records = contract.lane_plans.map(buildGapRecord);
  const sourceIds = new Set(sources.sources.map((row) => row.source_id));
  const searchIds = new Set(sources.search_receipts.map((row) => row.search_receipt_id));
  for (const record of records) {
    for (const id of record.source_ids) if (!sourceIds.has(id)) throw new Error(`Missing source ${id}`);
    for (const id of record.search_receipt_ids || []) if (!searchIds.has(id)) throw new Error(`Missing search receipt ${id}`);
  }
  const registry = {
    schema_version: 'counter-selector-post-review-gap-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    status: 'two_post_review_lanes_audited_no_field_test_eligibility',
    parent_release_sha256: contract.parent_release_sha256,
    counts: {
      reviewed_packets_audited: records.length,
      official_sources: sources.sources.length,
      bounded_search_receipts: sources.search_receipts.length,
      support_ledgers_completed: records.filter((row) => row.support_ledger).length,
      chronology_supersessions: records.filter((row) => row.supersession).length,
      support_adjusted_surplus_findings: records.filter((row) => row.findings.support_adjusted_surplus_established).length,
      independent_handoff_receipts: records.filter((row) => row.findings.independent_handoff_receipt_located).length,
      cross_domain_transfer_artifacts: records.filter((row) => row.findings.cross_domain_transfer_artifact_located).length,
      public_final_merits_decisions_located: 0,
      durable_final_custody_states: 0,
      new_bounded_dimension_supports: 0,
      field_test_eligible_packets: 0,
      operator_findings: 0,
      promotions: 0,
      person_rankings: 0,
      public_identity_releases: 0,
      graph_effects: 0
    },
    records,
    next_action: 'Acquire original work and independent handoff artifacts for CS-BLIND-0016, and a public final disposition or durable post-finality custody record for CS-BLIND-0021. Do not launch a field test.',
    boundaries: structuredClone(contract.boundaries)
  };
  writeText('data/project/counter-selector-post-review-gap-registry.json', stableJson(registry));
  const supersession = buildSupersession(contract, sources);
  writeText('data/project/counter-selector-wave-05-supersession.json', stableJson(supersession));
  const manifest = computeReleaseManifest();
  writeText('data/project/counter-selector-wave-05-release-manifest.json', stableJson(manifest));
  const report = {
    schema_version: 'counter-selector-wave-05-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: registry.status,
    counts: registry.counts,
    records: records.map((record) => ({
      packet_id: record.packet_id,
      lane_type: record.lane_type,
      disposition: record.disposition,
      dimension_vector: record.dimension_vector,
      findings: record.findings,
      chronology: record.chronology || null,
      supersession: record.supersession || null,
      field_test_eligible: record.field_test_eligible,
      operator_finding: record.operator_finding,
      graph_effect: record.graph_effect
    })),
    supersession: {
      path: 'data/project/counter-selector-wave-05-supersession.json',
      supersession_id: supersession.supersession_id,
      prior_record_deleted: false
    },
    next_action: registry.next_action,
    boundaries: registry.boundaries,
    release_manifest: {
      path: 'data/project/counter-selector-wave-05-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  writeText('reports/core-thesis/counter-selector-wave-05/data.json', stableJson(report));
  const rows = records.map((record) => `<tr><td><code>${esc(record.packet_id)}</code></td><td>${esc(record.lane_type)}</td><td>${esc(record.disposition)}</td><td>${record.field_test_eligible ? 'yes' : 'no'}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 05</title><style>:root{background:#efede5;color:#171715;font-family:system-ui,sans-serif}body{max-width:1200px;margin:auto;padding:36px 22px 70px;line-height:1.5}h1{font-size:clamp(2.4rem,6vw,5rem);line-height:.95;letter-spacing:-.05em}.state{font-weight:900;color:#7a2b1e}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.card,table,.boundary{background:#fffdf8;border:1px solid #c9c1b3;border-radius:12px}.card{padding:16px}.card b{font-size:2.2rem;display:block}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:10px;text-align:left;border-bottom:1px solid #ded7ca;vertical-align:top}.boundary{padding:16px;border-left:7px solid #7a2b1e;white-space:pre-wrap}code{overflow-wrap:anywhere}</style></head><body><p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W05-GAP-01</strong></p><h1>Correction entered. Advancement refused.</h1><p class="state">2 LANES AUDITED · 1 CHRONOLOGY SUPERSESSION · 0 FIELD-TEST ELIGIBLE · GRAPH EFFECT NONE</p><div class="grid"><div class="card"><b>1</b>support ledger</div><div class="card"><b>0</b>surplus findings</div><div class="card"><b>0</b>handoff receipts</div><div class="card"><b>0</b>transfer artifacts</div><div class="card"><b>0</b>final merits</div></div><h2>Results</h2><table><thead><tr><th>Packet</th><th>Lane</th><th>Disposition</th><th>Field test</th></tr></thead><tbody>${rows}</tbody></table><h2>Model correction</h2><p>The agency declined voluntary correction, then asserted reinstatement in compliance with the MSPB stay. That later order supersedes an incomplete chronology without converting externally imposed correction into internal partnership repair.</p><h2>Authority ceiling</h2><div class="boundary">support ledger ≠ support-adjusted surplus\noffice continuity ≠ independent handoff\ncross-domain role ≠ transfer artifact\nstay ≠ final merits\nreinstatement under order ≠ internal repair\nsearch absence ≠ nonexistence\ngraph effect: none</div><p>Exact-byte release digest: <code>${manifest.combined_sha256}</code></p></body></html>`;
  writeText('reports/core-thesis/counter-selector-wave-05/index.html', html);
  console.log(`build-counter-selector-wave-05: ${records.length} lanes, ${sources.sources.length} sources, ${sources.search_receipts.length} search receipts, 1 supersession, 0 field tests`);
  return { contract, sources, parent, registry, supersession, manifest, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) buildCounterSelectorWave05();
