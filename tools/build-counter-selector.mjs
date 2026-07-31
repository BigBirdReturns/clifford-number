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

export const candidateShardPaths = [
  'data/project/counter-selector-candidates/positive_candidate_operators.json',
  'data/project/counter-selector-candidates/false_positive_outsider_genius_candidates.json',
  'data/project/counter-selector-candidates/ordinary_specialists.json',
  'data/project/counter-selector-candidates/high_status_selected_operators.json',
  'data/project/counter-selector-candidates/repair_capable_partnerships.json',
  'data/project/counter-selector-candidates/brittle_or_failed_partnerships.json'
];

export const releaseScope = [
  '.github/workflows/counter-selector-wave-00.yml',
  'data/project/counter-selector-program.json',
  'data/project/counter-selector-wave-00-supersession.json',
  'data/project/counter-selector-candidate-registry.json',
  ...candidateShardPaths,
  'data/project/counter-selector-wave-01.json',
  'schemas/counter-selector-candidate.schema.json',
  'docs/methods/counter-selector.md',
  'docs/milestones/counter-selector-wave-01.md',
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
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W02-W01',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256,
    boundaries: {
      exact_bytes_prove_capability: false,
      manifest_proves_selector_validity: false,
      manifest_authorizes_person_ranking: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key];
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

export function loadCandidateRegistry() {
  const index = read('data/project/counter-selector-candidate-registry.json');
  const shards = index.candidate_files.map((rel) => ({ path: rel, ...read(rel) }));
  return {
    ...index,
    candidate_shards: shards,
    candidates: shards.flatMap((shard) => shard.candidates)
  };
}

export function buildCounterSelector() {
  const program = read('data/project/counter-selector-program.json');
  const registry = loadCandidateRegistry();
  const supersession = read('data/project/counter-selector-wave-00-supersession.json');
  const wave = read('data/project/counter-selector-wave-01.json');
  const schema = read('schemas/counter-selector-candidate.schema.json');
  const manifest = computeReleaseManifest();
  write('data/project/counter-selector-release-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);

  const classDefinitions = Object.fromEntries(
    program.denominator_contract.classes.map((row) => [row.class_id, row])
  );
  const classCounts = countBy(registry.candidates, 'denominator_class');
  const sourceWaveCounts = registry.candidates.reduce((acc, candidate) => {
    const route = candidate.source_routes[0];
    acc[route.path] = (acc[route.path] || 0) + 1;
    return acc;
  }, {});
  const sourceOutcomeCounts = registry.candidates.reduce((acc, candidate) => {
    const outcome = candidate.source_routes[0].source_outcome;
    acc[outcome] = (acc[outcome] || 0) + 1;
    return acc;
  }, {});

  const report = {
    schema_version: 'counter-selector-report@1',
    program_id: program.program_id,
    wave_id: wave.wave_id,
    as_of: program.as_of,
    title: program.title,
    status: program.status,
    authority: 'source_routed_intake_only',
    protocol_history: {
      preserved_path: supersession.supersedes.path,
      preserved_blob_sha: supersession.supersedes.blob_sha,
      supersession_id: supersession.record_id,
      successor_wave_id: supersession.successor.wave_id
    },
    governing_question: program.governing_question,
    counter_selector_rule: program.counter_selector_rule,
    counts: {
      operator_dimensions: program.operator_dimensions.length,
      review_stages: program.review_stages.length,
      denominator_classes: program.denominator_contract.classes.length,
      candidates: registry.candidates.length,
      unique_source_ids: new Set(registry.candidates.flatMap((candidate) => candidate.source_ids)).size,
      matched_controls: registry.candidates.filter((candidate) => candidate.matched_control.candidate_id).length,
      blind_first_reviews: registry.execution.blind_first_reviews_executed,
      bounded_tests: registry.execution.bounded_tests_executed,
      second_party_reviews: registry.execution.second_party_reviews_complete,
      promotions: registry.execution.promoted_candidates,
      person_rankings: wave.execution.person_rankings,
      graph_effects: registry.execution.graph_effects
    },
    classes: program.denominator_contract.classes.map((row) => ({
      ...row,
      current: classCounts[row.class_id] || 0
    })),
    dimensions: program.operator_dimensions,
    review_stages: program.review_stages,
    records: registry.candidates.map((candidate) => ({
      candidate_id: candidate.candidate_id,
      denominator_class: candidate.denominator_class,
      class_label: classDefinitions[candidate.denominator_class]?.label || candidate.denominator_class,
      candidate_type: candidate.candidate_type,
      public_label: candidate.public_label,
      domain: candidate.domain,
      jurisdiction: candidate.jurisdiction,
      matched_control: candidate.matched_control.candidate_id,
      source_id: candidate.source_ids[0],
      source_path: candidate.source_routes[0].path,
      source_outcome: candidate.source_routes[0].source_outcome,
      review_state: candidate.review_state,
      field_result: candidate.field_result,
      graph_effect: candidate.graph_effect
    })),
    source_wave_counts: sourceWaveCounts,
    source_outcome_counts: sourceOutcomeCounts,
    execution: registry.execution,
    next_action: registry.next_action,
    boundaries: {
      ...program.boundaries,
      ...wave.boundaries,
      publication_status: program.current_state.publication_status
    },
    release_manifest: {
      path: 'data/project/counter-selector-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write('reports/core-thesis/counter-selector/data.json', `${JSON.stringify(report, null, 2)}\n`);

  const classCards = report.classes.map((row) => `
    <article class="card"><b>${row.current}</b><span>${esc(row.label)}</span><small>${esc(row.purpose)}</small></article>`).join('');
  const dimensionRows = report.dimensions.map((row) => `
    <tr><td><code>${esc(row.id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.question)}</td><td><strong>not tested</strong></td></tr>`).join('');
  const recordRows = report.records.map((row) => `
    <tr><td><code>${esc(row.candidate_id)}</code></td><td>${esc(row.class_label)}</td><td>${esc(row.public_label)}</td><td>${esc(row.domain)}</td><td><code>${esc(row.source_id)}</code></td><td>${esc(row.source_outcome)}</td><td>${esc(row.review_state)}</td></tr>`).join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Counter-Selector · Clifford Number</title>
<style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{max-width:1540px;margin:0 auto;padding:40px 24px 72px;line-height:1.55}h1{font-size:clamp(2.5rem,6vw,5.5rem);line-height:.94;letter-spacing:-.055em;max-width:1100px;margin:.2em 0}h2{margin-top:3rem}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}.state{font-weight:900;color:#8c300d;letter-spacing:.04em}.lede{max-width:900px;font-size:1.2rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.card,table,.boundary{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:17px;display:grid;gap:5px}.card b{font-size:2.3rem;line-height:1}.card span{font-weight:750}.card small{color:#625d54}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;font-size:.92rem}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}.boundary{border-left:7px solid #7c2920;padding:18px;white-space:pre-wrap}.metrics{display:flex;gap:24px;flex-wrap:wrap}.metrics div{min-width:120px}.metrics b{display:block;font-size:2rem}.small{font-size:.88rem;color:#625d54}</style></head><body>
<p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W02-W01</strong></p>
<h1>Operational residue before biography</h1>
<p class="state">SOURCE-ROUTED INTAKE · NO PERSON RANKING · NO FIELD RESULT · GRAPH EFFECT NONE</p>
<p class="lede">${esc(program.counter_selector_rule)}</p>
<div class="metrics"><div><b>${report.counts.candidates}</b>source-routed objects</div><div><b>${report.counts.unique_source_ids}</b>unique K0 records</div><div><b>${report.counts.matched_controls}</b>matched controls</div><div><b>${report.counts.bounded_tests}</b>bounded tests</div><div><b>${report.counts.promotions}</b>promotions</div></div>
<h2>Balanced denominator</h2><div class="grid">${classCards}</div>
<h2>Eight operator dimensions</h2><table><thead><tr><th>ID</th><th>Dimension</th><th>Question</th><th>Current state</th></tr></thead><tbody>${dimensionRows}</tbody></table>
<h2>Thirty source-routed objects</h2><table><thead><tr><th>ID</th><th>Class</th><th>Public role-level label</th><th>Domain</th><th>K0 source</th><th>K0 outcome</th><th>Counter-Selector state</th></tr></thead><tbody>${recordRows}</tbody></table>
<h2>Next empirical gate</h2><p>${esc(registry.next_action)}</p>
<h2>Authority ceiling</h2><div class="boundary">K0 source route ≠ operator capability finding
class assignment ≠ disposition
positive trace ≠ selected operator
negative control ≠ false person
formal status ≠ competence
low legibility ≠ hidden genius
policy architecture ≠ observed repair
source-routed intake ≠ blind review
source-routed intake ≠ field test
exact bytes ≠ evidence truth</div>
<p class="small"><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/counter-selector/index.html', `${html}\n`);

  console.log(`build-counter-selector: ${report.counts.candidates} candidates, ${report.counts.unique_source_ids} unique sources, ${report.counts.bounded_tests} bounded tests`);
  return { program, registry, supersession, wave, schema, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildCounterSelector();
