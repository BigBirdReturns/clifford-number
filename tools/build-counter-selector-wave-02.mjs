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

export const releaseScope = [
  '.github/workflows/counter-selector-wave-02.yml',
  'data/project/counter-selector-wave-02-artifact-readiness.json',
  'data/project/counter-selector-artifact-readiness-registry.json',
  'data/project/counter-selector-artifact-acquisition-queue.json',
  'schemas/counter-selector-artifact-readiness.schema.json',
  'docs/methods/counter-selector-artifact-readiness.md',
  'docs/milestones/counter-selector-wave-02.md',
  'tools/build-counter-selector-wave-02.mjs',
  'tools/validate-counter-selector-wave-02.mjs',
  'test/counter-selector-wave-02.test.js'
];

export function computeReleaseManifest() {
  const entries = releaseScope.map((rel) => {
    const bytes = readBytes(rel);
    return {
      path: rel,
      sha256: sha256(bytes),
      bytes: bytes.length
    };
  });
  const combined_sha256 = sha256(
    entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')
  );
  return {
    schema_version: 'counter-selector-wave-02-release-manifest@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W02-W02',
    as_of: '2026-07-31',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256,
    boundaries: {
      exact_bytes_prove_artifact_quality: false,
      artifact_readiness_proves_operator_capacity: false,
      manifest_authorizes_blind_review: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key];
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

export function loadCounterSelectorCandidates(registry) {
  return registry.candidate_files.flatMap((rel) => {
    const shard = read(rel);
    return shard.candidates;
  });
}

export function buildCounterSelectorWave02() {
  const contract = read('data/project/counter-selector-wave-02-artifact-readiness.json');
  const parentManifest = read('data/project/counter-selector-release-manifest.json');
  const candidateRegistry = read('data/project/counter-selector-candidate-registry.json');
  const candidates = loadCounterSelectorCandidates(candidateRegistry)
    .sort((a, b) => a.candidate_id.localeCompare(b.candidate_id));
  const classRules = Object.fromEntries(contract.class_rules.map((row) => [row.class_id, row]));
  const classOrder = contract.class_rules.map((row) => row.class_id);
  const byClass = Object.fromEntries(classOrder.map((classId) => [
    classId,
    candidates.filter((candidate) => candidate.denominator_class === classId)
      .sort((a, b) => a.candidate_id.localeCompare(b.candidate_id))
  ]));

  const batches = Array.from({ length: contract.acquisition_batch_contract.batch_count }, (_, index) => {
    const ordinal = index + 1;
    return {
      batch_id: `CS-AQ-B${String(ordinal).padStart(2, '0')}`,
      ordinal,
      class_balanced: true,
      creates_priority_or_merit: false,
      candidate_ids: classOrder.map((classId) => byClass[classId][index]?.candidate_id).filter(Boolean)
    };
  });
  const batchByCandidate = new Map();
  for (const batch of batches) {
    for (const candidateId of batch.candidate_ids) batchByCandidate.set(candidateId, batch);
  }

  const records = candidates.map((candidate) => {
    const rule = classRules[candidate.denominator_class];
    const route = candidate.source_routes[0];
    const batch = batchByCandidate.get(candidate.candidate_id);
    const numericId = candidate.candidate_id.replace('CS-C', '');
    return {
      schema_version: 'counter-selector-artifact-readiness@1',
      program_id: contract.program_id,
      wave_id: contract.wave_id,
      candidate_id: candidate.candidate_id,
      blind_token: `CS-BP${numericId}`,
      candidate_type: candidate.candidate_type,
      denominator_class: candidate.denominator_class,
      public_label: candidate.public_label,
      source_family: route.family_id,
      source_path: route.path,
      source_record_id: route.record_id,
      source_outcome: route.source_outcome,
      source_route_digest: sha256(JSON.stringify({
        family_id: route.family_id,
        path: route.path,
        record_id: route.record_id,
        source_outcome: route.source_outcome
      })),
      observed_artifact_refs: [...candidate.observed_artifacts],
      observed_artifact_ref_class: 'source_route_identifier_only',
      qualifying_artifact_present: false,
      artifact_readiness_state: rule.readiness_state,
      blind_packet_ready: false,
      artifact_requirements: [...rule.artifact_requirements],
      identity_minimization_plan: {
        remove_before_blind_review: [...contract.identity_minimization.remove_before_blind_review],
        retain_for_review: [...contract.identity_minimization.retain_for_review],
        blind_packet_created: false
      },
      matched_control_id: candidate.matched_control.candidate_id,
      acquisition: {
        batch_id: batch.batch_id,
        batch_ordinal: batch.ordinal,
        required_before_blind_review: true,
        next_action: rule.next_action
      },
      review_state: 'artifact_acquisition_required',
      privacy: {
        private_evidence_used: false,
        public_identity_release_authorized: false,
        consent_required_before_field_test: true
      },
      graph_effect: 'none'
    };
  });

  const readinessCounts = countBy(records, 'artifact_readiness_state');
  const classCounts = countBy(records, 'denominator_class');
  const readinessRegistry = {
    schema_version: 'counter-selector-artifact-readiness-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    status: 'audit_complete_artifact_acquisition_open',
    parent_release_sha256: contract.parent_release_sha256,
    audit_unit: contract.audit_unit,
    counts: {
      source_routed_objects_audited: records.length,
      qualifying_artifacts_present: records.filter((row) => row.qualifying_artifact_present).length,
      blind_packets_ready: records.filter((row) => row.blind_packet_ready).length,
      artifact_acquisition_required: records.filter((row) => row.review_state === 'artifact_acquisition_required').length,
      privacy_or_consent_blocked: records.filter((row) => row.artifact_readiness_state === 'privacy_or_consent_blocked').length,
      bounded_non_links: records.filter((row) => row.artifact_readiness_state === 'bounded_non_link').length,
      graph_effects: records.filter((row) => row.graph_effect !== 'none').length
    },
    class_counts: classCounts,
    readiness_counts: readinessCounts,
    records,
    next_action: 'Acquire one qualifying artifact for every object, then construct identity-minimized blind packets without importing class, status, or source-route cues.',
    boundaries: {
      source_route_is_artifact: false,
      no_artifact_is_negative_capability_evidence: false,
      audit_is_blind_review: false,
      audit_is_field_test: false,
      publication_cleared: false,
      graph_effect: 'none'
    }
  };
  write(
    'data/project/counter-selector-artifact-readiness-registry.json',
    `${JSON.stringify(readinessRegistry, null, 2)}\n`
  );

  const acquisitionQueue = {
    schema_version: 'counter-selector-artifact-acquisition-queue@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    status: 'five_balanced_batches_open',
    parent_release_sha256: contract.parent_release_sha256,
    batch_contract: contract.acquisition_batch_contract,
    batches: batches.map((batch) => ({
      ...batch,
      candidates: batch.candidate_ids.map((candidateId) => {
        const record = records.find((row) => row.candidate_id === candidateId);
        return {
          candidate_id: record.candidate_id,
          blind_token: record.blind_token,
          denominator_class: record.denominator_class,
          public_label: record.public_label,
          source_path: record.source_path,
          source_record_id: record.source_record_id,
          artifact_readiness_state: record.artifact_readiness_state,
          matched_control_id: record.matched_control_id,
          artifact_requirements: record.artifact_requirements,
          next_action: record.acquisition.next_action,
          acquisition_state: 'open'
        };
      })
    })),
    execution: {
      batches_total: batches.length,
      batches_started: 0,
      objects_total: records.length,
      objects_with_qualifying_artifact: 0,
      blind_packets_created: 0,
      blind_reviews_executed: 0,
      field_tests_executed: 0,
      graph_effects: 0
    },
    boundaries: {
      batch_order_creates_priority_or_merit: false,
      source_route_is_artifact: false,
      acquisition_queue_is_blind_review: false,
      acquisition_queue_authorizes_contact: false,
      acquisition_queue_authorizes_field_test: false,
      graph_effect: 'none'
    }
  };
  write(
    'data/project/counter-selector-artifact-acquisition-queue.json',
    `${JSON.stringify(acquisitionQueue, null, 2)}\n`
  );

  const manifest = computeReleaseManifest();
  write(
    'data/project/counter-selector-wave-02-release-manifest.json',
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  const report = {
    schema_version: 'counter-selector-wave-02-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: readinessRegistry.status,
    parent_release_sha256: contract.parent_release_sha256,
    counts: readinessRegistry.counts,
    class_counts: readinessRegistry.class_counts,
    readiness_counts: readinessRegistry.readiness_counts,
    qualifying_artifact_contract: contract.qualifying_artifact_contract,
    batches: acquisitionQueue.batches.map((batch) => ({
      batch_id: batch.batch_id,
      ordinal: batch.ordinal,
      class_balanced: batch.class_balanced,
      candidate_ids: batch.candidate_ids
    })),
    records: records.map((record) => ({
      candidate_id: record.candidate_id,
      blind_token: record.blind_token,
      denominator_class: record.denominator_class,
      public_label: record.public_label,
      source_record_id: record.source_record_id,
      artifact_readiness_state: record.artifact_readiness_state,
      blind_packet_ready: record.blind_packet_ready,
      batch_id: record.acquisition.batch_id,
      matched_control_id: record.matched_control_id,
      review_state: record.review_state,
      graph_effect: record.graph_effect
    })),
    next_action: readinessRegistry.next_action,
    boundaries: {
      ...contract.boundaries,
      ...readinessRegistry.boundaries,
      ...acquisitionQueue.boundaries
    },
    release_manifest: {
      path: 'data/project/counter-selector-wave-02-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
  write(
    'reports/core-thesis/counter-selector-wave-02/data.json',
    `${JSON.stringify(report, null, 2)}\n`
  );

  const readinessCards = Object.entries(readinessCounts).map(([state, count]) => `
    <article class="card"><b>${count}</b><span>${esc(state.replaceAll('_', ' '))}</span></article>`).join('');
  const batchRows = acquisitionQueue.batches.map((batch) => `
    <tr><td><code>${esc(batch.batch_id)}</code></td><td>${batch.candidates.length}</td><td>${batch.candidates.map((row) => `<code>${esc(row.candidate_id)}</code>`).join(' ')}</td><td>one object per class</td></tr>`).join('');
  const recordRows = records.map((record) => `
    <tr><td><code>${esc(record.candidate_id)}</code></td><td><code>${esc(record.blind_token)}</code></td><td>${esc(record.denominator_class)}</td><td>${esc(record.public_label)}</td><td>${esc(record.artifact_readiness_state)}</td><td><code>${esc(record.acquisition.batch_id)}</code></td></tr>`).join('');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 02 · Artifact readiness</title>
<style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{max-width:1540px;margin:0 auto;padding:40px 24px 72px;line-height:1.55}h1{font-size:clamp(2.5rem,6vw,5.4rem);line-height:.95;letter-spacing:-.05em;max-width:1100px}h2{margin-top:3rem}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}.state{font-weight:900;color:#8c300d;letter-spacing:.03em}.lede{max-width:950px;font-size:1.18rem}.metrics,.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.card,table,.boundary{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:17px;display:grid;gap:5px}.card b{font-size:2.3rem;line-height:1}.card span{font-weight:700}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;font-size:.9rem}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}.boundary{border-left:7px solid #7c2920;padding:18px;white-space:pre-wrap}.small{font-size:.88rem;color:#625d54}</style></head><body>
<p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W02-W02</strong></p>
<h1>Source routes are not artifacts</h1>
<p class="state">30 OBJECTS AUDITED · 0 BLIND PACKETS READY · 0 FIELD TESTS · GRAPH EFFECT NONE</p>
<p class="lede">The Wave 01 denominator contains source-routed intake objects, not the bounded work products required for blind-first operator review. Wave 02 freezes that distinction and converts every missing artifact into an exact acquisition route.</p>
<div class="metrics"><article class="card"><b>${records.length}</b><span>objects audited</span></article><article class="card"><b>0</b><span>qualifying artifacts</span></article><article class="card"><b>0</b><span>blind packets ready</span></article><article class="card"><b>${batches.length}</b><span>balanced acquisition batches</span></article></div>
<h2>Readiness disposition</h2><div class="grid">${readinessCards}</div>
<h2>Why the gate remains closed</h2><div class="boundary">K0 source route ≠ operator work artifact
source summary ≠ blind packet
policy architecture ≠ observed repair
negative control ≠ false person
missing artifact ≠ negative capability evidence
artifact readiness ≠ operator score
acquisition queue ≠ permission to contact or test</div>
<h2>Balanced acquisition batches</h2><table><thead><tr><th>Batch</th><th>Objects</th><th>Candidate IDs</th><th>Balance rule</th></tr></thead><tbody>${batchRows}</tbody></table>
<h2>Artifact-readiness registry</h2><table><thead><tr><th>Candidate</th><th>Blind token</th><th>Sampling class</th><th>Current public routing label</th><th>Readiness</th><th>Batch</th></tr></thead><tbody>${recordRows}</tbody></table>
<h2>Next state transition</h2><p>${esc(readinessRegistry.next_action)}</p>
<p class="small"><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
  write('reports/core-thesis/counter-selector-wave-02/index.html', `${html}\n`);

  console.log(
    `build-counter-selector-wave-02: ${records.length} audited, ` +
    `${readinessRegistry.counts.qualifying_artifacts_present} qualifying artifacts, ` +
    `${readinessRegistry.counts.blind_packets_ready} blind packets, ${batches.length} batches`
  );
  return { contract, parentManifest, candidateRegistry, candidates, readinessRegistry, acquisitionQueue, manifest, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildCounterSelectorWave02();
