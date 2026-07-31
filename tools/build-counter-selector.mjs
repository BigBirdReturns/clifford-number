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

export const releaseScope = [
  '.github/workflows/counter-selector.yml',
  'data/project/counter-selector-program.json',
  'data/project/counter-selector-wave-00.json',
  'schemas/counter-selector-candidate.schema.json',
  'docs/methods/counter-selector.md',
  'docs/milestones/counter-selector-wave-00.md',
  'tools/build-counter-selector.mjs',
  'tools/validate-counter-selector.mjs',
  'test/counter-selector.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return {
      path: rel,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length
    };
  });
  const combined_sha256 = crypto
    .createHash('sha256')
    .update(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join(''))
    .digest('hex');
  return {
    schema_version: 'counter-selector-release-manifest@1',
    program_id: 'CS-P01',
    wave_id: 'CS-W00',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256,
    boundaries: {
      exact_bytes_prove_candidate_quality: false,
      manifest_authorizes_person_ranking: false,
      manifest_authorizes_identity_release: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

export function buildCounterSelector() {
  const program = read('data/project/counter-selector-program.json');
  const wave = read('data/project/counter-selector-wave-00.json');
  const schema = read('schemas/counter-selector-candidate.schema.json');
  const manifest = computeReleaseManifest();

  write(
    'data/project/counter-selector-release-manifest.json',
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  const report = {
    schema_version: 'counter-selector-report@1',
    program_id: program.program_id,
    wave_id: wave.wave_id,
    as_of: program.as_of,
    title: program.title,
    status: program.status,
    authority_tier: program.authority_tier,
    purpose: program.purpose,
    working_proposition: program.working_proposition,
    counter_selector_rule: program.counter_selector_rule,
    counts: {
      operational_residues: program.operational_residues.length,
      review_stages: program.review_stages.length,
      evidence_dimensions: program.evidence_vector.length,
      false_positive_controls: program.false_positive_controls.length,
      positive_controls: program.positive_controls.length,
      falsifiers: program.falsifiers.length,
      search_lanes: wave.search_lanes.length,
      candidate_records: wave.candidate_records.length,
      schema_required_fields: schema.required.length
    },
    operational_residues: program.operational_residues,
    review_stages: program.review_stages,
    scoring_contract: program.scoring_contract,
    false_positive_controls: program.false_positive_controls,
    positive_controls: program.positive_controls,
    search_lanes: wave.search_lanes,
    comparison_design: wave.comparison_design,
    execution: wave.execution,
    privacy_and_fairness: program.privacy_and_fairness,
    current_state: program.current_state,
    boundaries: program.boundaries,
    wave_boundaries: wave.boundaries,
    falsifiers: program.falsifiers,
    release_manifest: {
      path: 'data/project/counter-selector-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };

  write(
    'reports/core-thesis/counter-selector/data.json',
    `${JSON.stringify(report, null, 2)}\n`
  );

  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[c]));

  const residueRows = program.operational_residues
    .map((row) => `<tr><td><code>${esc(row.residue_id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.question)}</td><td>${esc(row.forbidden_shortcut)}</td></tr>`)
    .join('');
  const stageRows = program.review_stages
    .map((row) => `<tr><td><code>${esc(row.stage_id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.required)}</td><td>${esc(row.output)}</td></tr>`)
    .join('');
  const laneRows = wave.search_lanes
    .map((row) => `<tr><td><code>${esc(row.lane_id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.target_trace)}</td><td>${esc(row.minimum_receipt)}</td></tr>`)
    .join('');
  const falsePositiveRows = program.false_positive_controls
    .map((row) => `<tr><td><code>${esc(row.control_id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.failure_signal)}</td></tr>`)
    .join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Counter-Selector · Clifford Number</title>
<style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{max-width:1500px;margin:0 auto;padding:40px 24px 72px;line-height:1.55}h1{font-size:clamp(2.2rem,5vw,4.7rem);line-height:.98;letter-spacing:-.045em;max-width:1100px}h2{margin-top:2.6rem}code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#1c1b18;color:#f6f1e6;padding:18px;border-radius:12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2rem;line-height:1.1}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}.state{font-weight:800;color:#8c300d}.boundary{border-left:6px solid #7c2920}.small{font-size:.9rem;color:#625d54}</style></head><body>
<p><strong>CLIFFORD NUMBER · CS-P01 · AT-2 CANDIDATE PROTOCOL</strong></p>
<h1>Counter-Selector</h1>
<p class="state">CS-W00 · ZERO CANDIDATE RECORDS · NO PERSON RANKING · GRAPH EFFECT NONE</p>
<p>${esc(program.purpose)}</p>
<h2>Governing rule</h2><pre>${esc(program.counter_selector_rule)}</pre>
<div class="grid">
<div class="card"><b>${report.counts.operational_residues}</b>operational residues</div>
<div class="card"><b>${report.counts.review_stages}</b>review stages</div>
<div class="card"><b>${report.counts.search_lanes}</b>search lanes</div>
<div class="card"><b>${report.counts.false_positive_controls}</b>false-positive controls</div>
<div class="card"><b>${report.counts.positive_controls}</b>positive controls</div>
<div class="card"><b>0</b>candidate records</div>
</div>
<h2>Operational residues</h2>
<table><thead><tr><th>ID</th><th>Residue</th><th>Question</th><th>Forbidden shortcut</th></tr></thead><tbody>${residueRows}</tbody></table>
<h2>Review stages</h2>
<table><thead><tr><th>ID</th><th>Stage</th><th>Required</th><th>Output</th></tr></thead><tbody>${stageRows}</tbody></table>
<h2>Wave 00 search lanes</h2>
<table><thead><tr><th>ID</th><th>Lane</th><th>Target trace</th><th>Minimum receipt</th></tr></thead><tbody>${laneRows}</tbody></table>
<h2>False-positive controls</h2>
<table><thead><tr><th>ID</th><th>Control</th><th>Failure signal</th></tr></thead><tbody>${falsePositiveRows}</tbody></table>
<h2>Current state</h2><pre>${esc(JSON.stringify(program.current_state, null, 2))}</pre>
<h2>Boundary</h2><pre class="boundary">${esc(JSON.stringify(program.boundaries, null, 2))}</pre>
<p class="small"><code>release SHA-256: ${manifest.combined_sha256}</code></p>
</body></html>`;

  write('reports/core-thesis/counter-selector/index.html', `${html}\n`);

  console.log(
    `build-counter-selector: ${report.counts.operational_residues} residues, ` +
    `${report.counts.search_lanes} lanes, ${report.counts.candidate_records} records`
  );
  return { program, wave, schema, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildCounterSelector();
