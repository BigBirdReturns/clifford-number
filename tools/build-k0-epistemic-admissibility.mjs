#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const bytes = rel => fs.readFileSync(path.join(root, rel));
const write = (rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
};
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(value, null, 2) + '\n';

export const releaseScope = [
  'data/intake/k0-epistemic-admissibility-source.txt',
  'data/intake/k0-ceiling-conversion-seed-events.json',
  'data/project/k0-epistemic-admissibility-methodology.json',
  'data/project/k0-existing-ecosystem-wiring.json',
  'schemas/k0-ceiling-conversion-event.schema.json',
  'docs/methods/k0-epistemic-admissibility.md',
  'docs/milestones/m05-k0-epistemic-admissibility.md',
  'tools/build-k0-epistemic-admissibility.mjs',
  'tools/validate-k0-epistemic-admissibility.mjs',
  'test/k0-epistemic-admissibility.test.js'
];

export function computeK0ReleaseManifest() {
  const entries = releaseScope.map(rel => {
    const data = bytes(rel);
    return { path: rel, sha256: sha256(data), bytes: data.length };
  });
  return {
    schema_version: 'k0-epistemic-admissibility-release-manifest@1',
    program_id: 'M-05',
    layer_id: 'K0',
    as_of: '2026-07-27',
    hash_mode: 'sha256_exact_utf8_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_event_truth: false,
      manifest_proves_source_availability: false,
      manifest_proves_selection_neutrality: false,
      manifest_creates_graph_effect: false
    }
  };
}

const method = read('data/project/k0-epistemic-admissibility-methodology.json');
const seeds = read('data/intake/k0-ceiling-conversion-seed-events.json');
const wiring = read('data/project/k0-existing-ecosystem-wiring.json');
const registry = read('data/project/m05-answerable-power-story-registry.json');
const fanout = read('data/project/m05-answerable-power-fanout.json');
const selection = read('data/canonical/corpus-selection.json');
const coverage = read('data/research/corpus-coverage.json');
const reviews = read('data/research/selection-adversarial-reviews.json');
const manifest = computeK0ReleaseManifest();
const roleCounts = seeds.events.reduce((acc, row) => ((acc[row.corpus_role] = (acc[row.corpus_role] || 0) + 1), acc), {});
const ccdCounts = seeds.events.reduce((acc, row) => ((acc[row.ccd_depth] = (acc[row.ccd_depth] || 0) + 1), acc), {});
const uniqueExternalUrls = new Set(seeds.events.flatMap(row => row.sources || []).map(row => row.url).filter(url => /^https?:/.test(url)));
const selectionLane = selection.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
const coverageRow = coverage.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
const review = reviews.reviews.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');

const report = {
  schema_version: 'k0-epistemic-admissibility-report@1',
  program_id: 'M-05',
  layer_id: 'K0',
  title: method.title,
  status: 'structural_integration_complete_source_truth_unreviewed',
  as_of: method.as_of,
  source: {
    path: method.source_path,
    sha256: method.source_sha256,
    reference_count: seeds.source_reference_count,
    status: 'source_provided_analysis_not_independently_reverified'
  },
  counts: {
    top_ten_people: seeds.seed_people_count,
    normalized_seed_events: seeds.events.length,
    seed_positive_fixtures: roleCounts.seed_positive_fixture || 0,
    seed_boundary_fixtures: roleCounts.seed_boundary_fixture || 0,
    seed_strategic_boundary_fixtures: roleCounts.seed_strategic_boundary_fixture || 0,
    ccd_depths: ccdCounts,
    unique_external_urls_in_events: uniqueExternalUrls.size,
    natural_k0_fixtures: wiring.natural_k0_fixture_count,
    clean_first_class_estate_routes: wiring.clean_first_class_estate_route_count,
    shared_media_publication_taxonomy_gaps: wiring.shared_media_publication_taxonomy_gap_count,
    canonical_actor_footholds: wiring.canonical_actor_count,
    exact_pairwise_chains: wiring.exact_pairwise_chain_count,
    common_purpose_network_edges: wiring.justified_common_purpose_network_edges_among_top_ten,
    m05_stories: registry.stories.length,
    m05_lanes: fanout.lanes.length
  },
  method: {
    unit_of_analysis: method.unit_of_analysis,
    core_path: method.core_path,
    failure_species: method.failure_species,
    explanation_mutation_types: method.explanation_mutation_types,
    ccd: method.ceiling_conversion_depth,
    final_control_question: method.final_control_question
  },
  ecosystem_wiring: wiring,
  selection: {
    lane: selectionLane,
    coverage: coverageRow,
    review
  },
  seed_events: seeds.events,
  current_result: {
    source_preserved_exactly: sha256(bytes(method.source_path)) === method.source_sha256,
    structural_event_protocol_complete: true,
    m05_story_installed: registry.stories.some(row => row.story_id === 'M05-S14'),
    m05_lane_installed: fanout.lanes.some(row => row.lane_id === 'A17'),
    central_selection_lane_installed: Boolean(selectionLane),
    source_receipt_audit_complete: false,
    role_neutral_universe_executed: false,
    independent_second_party_review_complete: false,
    evidence_truth_determined: false,
    graph_effect: 'none',
    works_standard_met: false,
    project_complete: false
  },
  release_manifest: {
    path: 'data/project/k0-epistemic-admissibility-release-manifest.json',
    combined_sha256: manifest.combined_sha256
  },
  boundaries: method.boundaries
};

write('data/project/k0-epistemic-admissibility-release-manifest.json', stable(manifest));
write('reports/core-thesis/answerable-power/k0.json', stable(report));

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
const eventRows = seeds.events.map(row => `<tr><td><code>${esc(row.event_id)}</code></td><td>${esc(row.seed_person)}</td><td>${esc(row.event_name)}</td><td>${esc(row.ccd_depth)}</td><td>${esc(row.review_status)}</td></tr>`).join('');
const wiringRows = wiring.rows.map(row => `<tr><td>${esc(row.rank)}</td><td>${esc(row.person)}</td><td>${esc(row.fit)}</td><td>${esc(row.natural_join)}</td><td>${esc(row.do_not_join)}</td></tr>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>K0 · Epistemic admissibility</title><style>body{font:16px/1.55 system-ui;max-width:1450px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05 · K0</b></p><h1>${esc(method.title)}</h1><p class="state">GRAPH-INERT FIXTURES · SOURCE TRUTH NOT DETERMINED · PUBLICATION BLOCKED</p><p>${esc(method.definition)}</p><div class="metrics"><div class="metric"><b>${report.counts.top_ten_people}</b>source people</div><div class="metric"><b>${report.counts.normalized_seed_events}</b>event fixtures</div><div class="metric"><b>${report.counts.natural_k0_fixtures}</b>natural mechanism routes</div><div class="metric"><b>${report.counts.common_purpose_network_edges}</b>network edges</div><div class="metric"><b>${report.counts.shared_media_publication_taxonomy_gaps}</b>taxonomy gaps</div></div><h2>Core path</h2><pre class="box">${esc(method.core_path.join('\n→ '))}</pre><h2>Seed events</h2><table><tr><th>ID</th><th>Seed person</th><th>Event</th><th>CCD</th><th>Review state</th></tr>${eventRows}</table><h2>Ecosystem wiring</h2><table><tr><th>Rank</th><th>Person</th><th>Fit</th><th>Natural join</th><th>Do not join</th></tr>${wiringRows}</table><h2>Selection boundary</h2><pre class="box boundary">${esc(JSON.stringify({ status: selectionLane.status, review_status: review.status, publication_status: review.publication_status, gaps: coverageRow.known_gaps }, null, 2))}</pre><h2>Current result</h2><pre class="box">${esc(JSON.stringify(report.current_result, null, 2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
write('reports/core-thesis/answerable-power/k0.html', html + '\n');
console.log(`build-k0-epistemic-admissibility: ${seeds.seed_people_count} people, ${seeds.events.length} events, ${wiring.justified_common_purpose_network_edges_among_top_ten} network edges`);
