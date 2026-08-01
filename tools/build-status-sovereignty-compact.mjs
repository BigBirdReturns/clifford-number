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
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

export const releaseScope = [
  '.github/workflows/status-sovereignty-compact.yml',
  '.github/workflows/status-sovereignty-wave-01.yml',
  '.github/workflows/status-sovereignty-wave-01-review.yml',
  '.github/workflows/status-sovereignty-wave-01-targeted-acquisition.yml',
  '.github/workflows/status-sovereignty-wave-02-intake.yml',
  '.github/workflows/status-sovereignty-wave-02-review.yml',
  'data/intake/status-sovereignty-compact-source.md',
  'data/project/status-sovereignty-compact.json',
  'data/project/status-sovereignty-fanout.json',
  'data/project/status-sovereignty-source-registry.json',
  'data/project/status-sovereignty-wave-01-release-manifest.json',
  'data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json',
  'data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json',
  'data/research/status-sovereignty-wave-01-source-receipts.json',
  'data/research/status-sovereignty-wave-01.json',
  'data/research/status-sovereignty-wave-01-maintainer-review.json',
  'data/research/status-sovereignty-wave-01-targeted-acquisition-source-receipts.json',
  'data/research/status-sovereignty-wave-01-targeted-acquisition.json',
  'data/intake/status-sovereignty-wave-02-source-denominator.json',
  'data/intake/status-sovereignty-wave-02-candidate-observations.json',
  'data/project/status-sovereignty-wave-02-intake-release-manifest.json',
  'data/research/status-sovereignty-wave-02.json',
  'data/research/status-sovereignty-wave-02-maintainer-review.json',
  'data/project/status-sovereignty-wave-02-maintainer-review-release-manifest.json',
  'schemas/status-sovereignty-observation.schema.json',
  'schemas/status-sovereignty-targeted-acquisition.schema.json',
  'docs/methods/status-sovereignty-compact.md',
  'docs/milestones/m05-status-sovereignty-fanout.md',
  'docs/milestones/m05-status-sovereignty-wave-01.md',
  'docs/milestones/m05-status-sovereignty-wave-01-review.md',
  'docs/milestones/m05-status-sovereignty-wave-01-targeted-acquisition.md',
  'docs/milestones/m05-status-sovereignty-wave-02-intake.md',
  'docs/milestones/m05-status-sovereignty-wave-02-review.md',
  'tools/build-status-sovereignty-wave-01.mjs',
  'tools/validate-status-sovereignty-wave-01.mjs',
  'test/status-sovereignty-wave-01.test.js',
  'tools/build-status-sovereignty-wave-01-review.mjs',
  'tools/validate-status-sovereignty-wave-01-review.mjs',
  'test/status-sovereignty-wave-01-review.test.js',
  'tools/build-status-sovereignty-wave-01-targeted-acquisition.mjs',
  'tools/validate-status-sovereignty-wave-01-targeted-acquisition.mjs',
  'test/status-sovereignty-wave-01-targeted-acquisition.test.js',
  'tools/build-status-sovereignty-wave-02-intake.mjs',
  'tools/validate-status-sovereignty-wave-02-intake.mjs',
  'test/status-sovereignty-wave-02-intake.test.js',
  'tools/build-status-sovereignty-wave-02-review.mjs',
  'tools/validate-status-sovereignty-wave-02-review.mjs',
  'test/status-sovereignty-wave-02-review.test.js',
  'tools/build-status-sovereignty-compact.mjs',
  'tools/validate-status-sovereignty-compact.mjs',
  'test/status-sovereignty-compact.test.js',
  'data/project/core-thesis.json',
  'tools/build-core-thesis.mjs',
  'tools/validate-core-thesis.mjs',
  'test/core-thesis.test.js',
  'data/project/dca-h01-field-hypothesis.json',
  'data/project/m05-answerable-power-story-registry.json',
  'data/project/m05-answerable-power-fanout.json',
  'data/project/security-state-organism-program.json',
  'tools/build-pages.mjs',
  'tools/validate-pages.mjs',
  'package.json'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'status-sovereignty-release-manifest@1',
    hypothesis_id: 'SSC-H01',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_hypothesis: false,
      manifest_proves_prevalence: false,
      manifest_proves_racial_order: false,
      manifest_proves_complete_compact: false,
      manifest_authorizes_graph_edge: false,
      manifest_authorizes_publication: false,
      graph_effect: 'none'
    }
  };
}

export function buildStatusSovereignty() {
  const hypothesis = read('data/project/status-sovereignty-compact.json');
  const fanout = read('data/project/status-sovereignty-fanout.json');
  const sources = read('data/project/status-sovereignty-source-registry.json');
  const wave = read('data/research/status-sovereignty-wave-01.json');
  const waveSources = read('data/research/status-sovereignty-wave-01-source-receipts.json');
  const waveRelease = read('data/project/status-sovereignty-wave-01-release-manifest.json');
  const review = read('data/research/status-sovereignty-wave-01-maintainer-review.json');
  const reviewRelease = read('data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json');
  const acquisition = read('data/research/status-sovereignty-wave-01-targeted-acquisition.json');
  const acquisitionSources = read('data/research/status-sovereignty-wave-01-targeted-acquisition-source-receipts.json');
  const acquisitionRelease = read('data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json');
  const wave02 = read('data/research/status-sovereignty-wave-02.json');
  const wave02Sources = read('data/intake/status-sovereignty-wave-02-source-denominator.json');
  const wave02Review = read('data/research/status-sovereignty-wave-02-maintainer-review.json');
  const wave02IntakeRelease = read('data/project/status-sovereignty-wave-02-intake-release-manifest.json');
  const wave02ReviewRelease = read('data/project/status-sovereignty-wave-02-maintainer-review-release-manifest.json');
  const manifest = computeReleaseManifest();
  write('data/project/status-sovereignty-release-manifest.json', stable(manifest));

  const executedLanes = fanout.lanes.filter((row) => row.execution.started);
  const report = {
    schema_version: 'status-sovereignty-report@1',
    hypothesis_id: hypothesis.hypothesis_id,
    program_id: hypothesis.program_id,
    as_of: hypothesis.as_of,
    title: hypothesis.title,
    status: hypothesis.status,
    authority_tier: hypothesis.authority_tier,
    publication_status: hypothesis.current_state.publication_status,
    working_proposition: hypothesis.working_proposition,
    negative_constitution: hypothesis.negative_constitution,
    counts: {
      gates: hypothesis.four_gate_discriminator.length,
      dimensions: hypothesis.dimensions.length,
      causal_stages: hypothesis.causal_sequence.length,
      fanout_lanes: fanout.lanes.length,
      issue_groups: fanout.issue_groups.length,
      source_provided_external_references: sources.external_references.length,
      repository_sources: sources.repository_sources.length,
      field_source_records: sources.counts.field_source_records,
      waves_executed: hypothesis.current_state.waves_executed,
      executed_lanes: executedLanes.length,
      retained_observations: fanout.lanes.reduce((sum, row) => sum + row.execution.records_retained, 0),
      complete_compact_findings: hypothesis.current_state.complete_compact_findings,
      maintainer_reviewed_observations: hypothesis.current_state.maintainer_reviewed_observations,
      second_party_reviewed_observations: hypothesis.current_state.second_party_reviewed_observations,
      adjudicated_observations: hypothesis.current_state.adjudicated_observations,
      targeted_acquisition_supplements: hypothesis.current_state.targeted_acquisition_supplements,
      targeted_acquisition_source_records: hypothesis.current_state.targeted_acquisition_source_records,
      open_acquisition_obligations: hypothesis.current_state.open_acquisition_obligations,
      wave_01_open_acquisition_obligations: hypothesis.current_state.wave_01_open_acquisition_obligations,
      wave_02_open_acquisition_obligations: hypothesis.current_state.wave_02_open_acquisition_obligations,
      partially_repaired_acquisition_obligations: hypothesis.current_state.partially_repaired_acquisition_obligations,
      closed_acquisition_obligations: hypothesis.current_state.closed_acquisition_obligations,
      alternatives: hypothesis.alternative_explanations.length,
      falsifiers: hypothesis.falsifiers.length,
      forbidden_inferences: hypothesis.forbidden_inferences.length
    },
    racial_order_hypothesis: hypothesis.racial_order_hypothesis,
    patriotism_discriminator: hypothesis.patriotism_discriminator,
    four_gate_discriminator: hypothesis.four_gate_discriminator,
    causal_sequence: hypothesis.causal_sequence,
    dimensions: hypothesis.dimensions,
    fanout: fanout.lanes,
    field_waves: hypothesis.field_waves,
    wave_01: {
      path: 'data/research/status-sovereignty-wave-01.json',
      source_receipts_path: wave.source_receipts_path,
      status: wave.status,
      counts: wave.counts,
      lane_counts: wave.lane_counts,
      disposition_counts: wave.disposition_counts,
      current_result: wave.current_result,
      release_manifest: {
        path: 'data/project/status-sovereignty-wave-01-release-manifest.json',
        combined_sha256: waveRelease.combined_sha256
      }
    },
    maintainer_review: {
      path: 'data/research/status-sovereignty-wave-01-maintainer-review.json',
      review_id: review.review_id,
      status: review.status,
      counts: review.counts,
      current_result: review.current_result,
      release_manifest: { path: 'data/project/status-sovereignty-wave-01-maintainer-review-release-manifest.json', combined_sha256: reviewRelease.combined_sha256 }
    },
    wave_02: {
      path: 'data/research/status-sovereignty-wave-02.json',
      source_receipts_path: 'data/intake/status-sovereignty-wave-02-source-denominator.json',
      status: wave02.status, counts: wave02.counts, lane_counts: wave02.lane_counts, disposition_counts: wave02.disposition_counts, current_result: wave02.current_result,
      intake_release_manifest: { path: 'data/project/status-sovereignty-wave-02-intake-release-manifest.json', combined_sha256: wave02IntakeRelease.combined_sha256 },
      review_release_manifest: { path: 'data/project/status-sovereignty-wave-02-maintainer-review-release-manifest.json', combined_sha256: wave02ReviewRelease.combined_sha256 }
    },
    wave_02_maintainer_review: {
      path: 'data/research/status-sovereignty-wave-02-maintainer-review.json', review_id: wave02Review.review_id, status: wave02Review.status, counts: wave02Review.counts, current_result: wave02Review.current_result,
      release_manifest: { path: 'data/project/status-sovereignty-wave-02-maintainer-review-release-manifest.json', combined_sha256: wave02ReviewRelease.combined_sha256 }
    },
    targeted_acquisition: {
      path: 'data/research/status-sovereignty-wave-01-targeted-acquisition.json',
      source_receipts_path: 'data/research/status-sovereignty-wave-01-targeted-acquisition-source-receipts.json',
      acquisition_id: acquisition.acquisition_id,
      status: acquisition.status,
      counts: acquisition.counts,
      obligations: acquisition.obligations,
      current_result: acquisition.current_result,
      release_manifest: { path: 'data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json', combined_sha256: acquisitionRelease.combined_sha256 }
    },
    source_registry: {
      source_document: sources.source_document,
      external_references: sources.external_references,
      repository_sources: sources.repository_sources,
      field_source_receipts: sources.field_source_receipts,
      field_sources: [...waveSources.records, ...wave02Sources.records],
      targeted_acquisition_sources: acquisitionSources.records,
      wave_02_sources: wave02Sources.records,
      counts: sources.counts
    },
    alternative_explanations: hypothesis.alternative_explanations,
    falsifiers: hypothesis.falsifiers,
    forbidden_inferences: hypothesis.forbidden_inferences,
    current_state: hypothesis.current_state,
    boundaries: hypothesis.boundaries,
    release_manifest: {
      path: 'data/project/status-sovereignty-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('build/core-thesis/status-sovereignty/manifest.json', stable(manifest));
  write('build/core-thesis/status-sovereignty/data.json', stable(report));
  write('reports/core-thesis/status-sovereignty/data.json', stable(report));

  const gateRows = hypothesis.four_gate_discriminator.map((row) => `<tr><td><code>${esc(row.gate_id)}</code></td><td><strong>${esc(row.name)}</strong><br>${esc(row.question)}</td><td>${esc(row.required_record)}</td><td>${esc(row.forbidden_inference)}</td></tr>`).join('');
  const dimensionRows = hypothesis.dimensions.map((row) => `<tr><td><code>${esc(row.dimension_id)}</code></td><td>${esc(row.label)}</td><td>${esc(row.question)}</td><td>${esc(row.required_observation)}</td></tr>`).join('');
  const laneRows = fanout.lanes.map((row) => `<tr><td><code>${esc(row.lane_id)}</code><br>${row.issue_numbers.map((n) => `<a href="https://github.com/BigBirdReturns/clifford-number/issues/${n}">#${n}</a>`).join(' ')}</td><td>${esc(row.title)}</td><td>${esc(row.question)}</td><td>${esc(row.selection_unit)}</td><td>${row.execution.started ? `${row.execution.records_retained} retained` : 'not executed'}</td></tr>`).join('');
  const sourceRows = sources.external_references.map((row) => `<tr><td><code>${esc(row.source_id)}</code></td><td><a href="${esc(row.url)}">${esc(row.title)}</a><br>${esc(row.publisher)}</td><td>${esc(row.source_class)}</td><td>${esc(row.custody)}</td></tr>`).join('');
  const fieldSourceRows = [...waveSources.records, ...wave02Sources.records].map((row) => `<tr><td><code>${esc(row.source_id)}</code></td><td><a href="${esc(row.url)}">${esc(row.title)}</a><br>${esc(row.publisher)}</td><td>${esc(row.source_class)}</td><td>${esc(row.retrieval.status)}; exact source bytes not preserved</td></tr>`).join('');
  const waveRows = [...wave.observations, ...wave02.observations].map((row) => `<tr><td><code>${esc(row.observation_id)}</code><br><code>${esc(row.lane_id)}</code></td><td>${esc(row.disposition)}</td><td>${esc(row.working_interpretation)}</td><td>${esc(row.review_state)}</td></tr>`).join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC-H01 · Clifford Number</title>
<style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{max-width:1500px;margin:0 auto;padding:40px 24px 72px;line-height:1.55}h1{font-size:clamp(2.2rem,5vw,4.8rem);line-height:.98;letter-spacing:-.045em;max-width:1120px}h2{margin-top:2.6rem}code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#1c1b18;color:#f6f1e6;padding:18px;border-radius:12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem;line-height:1.1}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}.state{font-weight:800;color:#8c300d}.boundary{border-left:6px solid #7c2920}.small{font-size:.9rem;color:#625d54}a{color:#6b2b16}</style></head><body>
<p><strong>CLIFFORD NUMBER · M-05 · AT-2 FIELD HYPOTHESIS</strong></p><h1>Status-for-sovereignty compact</h1><p class="state">SSC-H01 · TWO WAVES MAINTAINER REVIEWED 22/22 · SECOND-PARTY 0 · COMPLETE-COMPACT FINDINGS 0 · NO RACIAL-ORDER FINDING · GRAPH EFFECT NONE · PUBLICATION BLOCKED</p>
<p>${esc(hypothesis.working_proposition)}</p><h2>Negative constitution under test</h2><pre>${esc(hypothesis.negative_constitution)}</pre>
<div class="grid"><div class="card"><b>${report.counts.gates}</b>gates</div><div class="card"><b>${report.counts.dimensions}</b>dimensions</div><div class="card"><b>${report.counts.fanout_lanes}</b>fanout lanes</div><div class="card"><b>${report.counts.issue_groups}</b>issue groups</div><div class="card"><b>${report.counts.field_source_records}</b>field sources</div><div class="card"><b>${report.counts.executed_lanes}/16</b>executed lanes</div><div class="card"><b>${report.counts.retained_observations}</b>reviewed observations</div><div class="card"><b>${report.counts.complete_compact_findings}</b>complete compact</div><div class="card"><b>${report.counts.partially_repaired_acquisition_obligations}/${report.counts.open_acquisition_obligations}</b>denominators partially repaired</div></div>
<h2>Two-wave result</h2><p><a href="./wave-01/index.html">Wave 01</a> · <a href="./wave-02-review/index.html">Wave 02 review</a></p><table><thead><tr><th>Observation</th><th>Disposition</th><th>Interpretation ceiling</th><th>Review</th></tr></thead><tbody>${waveRows}</tbody></table>
<h2>Targeted acquisition</h2><p><a href="./wave-01-targeted-acquisition/index.html">Open the NatSec100, SBICCT, and OSC denominator repair</a></p><pre>${esc(JSON.stringify(acquisition.current_result,null,2))}</pre><h2>Patriotism discriminator</h2><pre>${esc(JSON.stringify(hypothesis.patriotism_discriminator, null, 2))}</pre>
<h2>Four-gate discriminator</h2><table><thead><tr><th>Gate</th><th>Question</th><th>Required record</th><th>Forbidden inference</th></tr></thead><tbody>${gateRows}</tbody></table>
<h2>Causal sequence</h2><pre>${esc(hypothesis.causal_sequence.join('\n→ '))}</pre>
<h2>Ten dimensions</h2><table><thead><tr><th>ID</th><th>Dimension</th><th>Question</th><th>Required observation</th></tr></thead><tbody>${dimensionRows}</tbody></table>
<h2>Sixteen-lane fanout</h2><table><thead><tr><th>Lane</th><th>Title</th><th>Question</th><th>Selection unit</th><th>Execution</th></tr></thead><tbody>${laneRows}</tbody></table>
<h2>Source-provided external references</h2><p class="small">These references are preserved from the supplied synthesis and remain unretrieved by the canonical source registry.</p><table><thead><tr><th>ID</th><th>Source</th><th>Class</th><th>Custody</th></tr></thead><tbody>${sourceRows}</tbody></table>
<h2>Wave 01 and Wave 02 reviewed source records</h2><p class="small">Normalized fact records were reviewed against these official or first-party pages. Exact source bytes were not preserved, and field-source review is not maintainer or second-party adjudication.</p><table><thead><tr><th>ID</th><th>Source</th><th>Class</th><th>Custody</th></tr></thead><tbody>${fieldSourceRows}</tbody></table>
<h2>Current state</h2><pre>${esc(JSON.stringify(hypothesis.current_state, null, 2))}</pre><h2>Boundary</h2><pre class="boundary">${esc(JSON.stringify(hypothesis.boundaries, null, 2))}</pre><p class="small"><code>Wave 01 release SHA-256: ${waveRelease.combined_sha256}</code></p><p class="small"><code>Wave 02 review SHA-256: ${wave02ReviewRelease.combined_sha256}</code></p><p class="small"><code>SSC release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/status-sovereignty/index.html', `${html}\n`);
  console.log(`build-status-sovereignty-compact: ${report.counts.gates} gates, ${report.counts.dimensions} dimensions, ${report.counts.executed_lanes}/16 lanes, ${report.counts.retained_observations} observations, ${report.counts.complete_compact_findings} complete compact`);
  return { hypothesis, fanout, sources, wave, waveSources, waveRelease, wave02, wave02Sources, wave02Review, wave02IntakeRelease, wave02ReviewRelease, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildStatusSovereignty();
