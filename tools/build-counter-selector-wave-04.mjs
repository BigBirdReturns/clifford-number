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
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

export const releaseScope = [
  '.github/workflows/counter-selector-wave-04.yml',
  'data/project/counter-selector-wave-04-blind-review.json',
  'data/project/counter-selector-blind-review-registry.json',
  'data/project/counter-selector-review-disagreement-ledger.json',
  'schemas/counter-selector-blind-review.schema.json',
  'docs/methods/counter-selector-blind-review.md',
  'docs/milestones/counter-selector-wave-04.md',
  'tools/build-counter-selector-wave-04.mjs',
  'tools/validate-counter-selector-wave-04.mjs',
  'test/counter-selector-wave-04.test.js'
];

function publicReviewInput(packet, allowedFields) {
  return Object.fromEntries(allowedFields.map((field) => [field, structuredClone(packet[field])]));
}

function buildPassRecord(packet, plan, passContract) {
  const input = publicReviewInput(packet, [
    'packet_id', 'blind_token', 'review_authority', 'task', 'requirements',
    'bounded_chronology', 'observable_transition', 'counterevidence', 'falsifier'
  ]);
  const source = plan[passContract.reviewer_role];
  const numeric = packet.packet_id.replace('CS-BLIND-', '');
  const suffix = passContract.pass_id.endsWith('A') ? 'A' : 'B';
  const common = {
    schema_version: 'counter-selector-blind-review-pass@1',
    program_id: 'counter-selector-v1',
    wave_id: 'CS-W04-B01',
    review_id: `CS-RV-${numeric}-${suffix}`,
    pass_id: passContract.pass_id,
    reviewer_role: passContract.reviewer_role,
    separation: passContract.separation,
    independence_class: 'procedural_same_system_not_external',
    packet_id: packet.packet_id,
    blind_token: packet.blind_token,
    input_fields: Object.keys(input),
    input_digest: sha256(stableJson(input)),
    identity_cues_available: false,
    candidate_mapping_available: false,
    denominator_class_available: false,
    source_route_available: false,
    external_independence_claimed: false,
    operator_finding: false,
    field_test_authorized: false,
    promotion_generated: false,
    person_ranking_generated: false,
    public_identity_release_authorized: false,
    graph_effect: 'none'
  };
  if (passContract.reviewer_role === 'artifact_validity') {
    return {
      ...common,
      packet_validity: source.packet_validity,
      strengths: [...source.strengths],
      limits: [...source.limits],
      provisional_dimension_support: [...source.provisional_dimension_support],
      conclusion: source.conclusion
    };
  }
  return {
    ...common,
    ordinary_explanations: [...source.ordinary_explanations],
    unresolved: [...source.unresolved],
    conclusion: source.conclusion
  };
}

function buildDisagreements(contract) {
  const first = contract.packet_review_plans.find((plan) => plan.packet_id === 'CS-BLIND-0016');
  const second = contract.packet_review_plans.find((plan) => plan.packet_id === 'CS-BLIND-0021');
  return [
    {
      disagreement_id: 'CS-DG-0001',
      packet_id: first.packet_id,
      issue: 'scope_of_supported_dimensions',
      artifact_validity_position: 'The bounded decision residue supports governed capacity and epistemic restraint.',
      adversarial_position: 'Formal authority, substantial support, later reconstruction, and missing handoff receipts prevent broader operator inference.',
      resolution: 'Retain exactly two bounded supports; leave support-adjusted surplus, transfer, exception handling, custody, elasticity, and non-zero-sum orientation untested or insufficiently receipted.',
      authority_effect: 'narrows_dimension_vector_without_negative_finding',
      unresolved_disagreement_preserved: true,
      graph_effect: 'none'
    },
    {
      disagreement_id: 'CS-DG-0002',
      packet_id: second.packet_id,
      issue: 'unit_of_analysis_and_class',
      artifact_validity_position: 'The packet demonstrates a real contradiction-to-correction sequence.',
      adversarial_position: 'The correction was externally imposed and does not establish repair-capable partnership behavior.',
      resolution: 'Retain the correction-mechanism finding, refuse partnership capacity, and append a recommendation for correction_mechanism_control without rewriting the historical class.',
      authority_effect: 'mechanism_retained_partnership_inference_refused',
      unresolved_disagreement_preserved: true,
      class_reassignment_recommendation: structuredClone(second.class_reassignment_recommendation),
      graph_effect: 'none'
    }
  ];
}

function buildReviewRegistry(contract, parentRegistry) {
  const passContracts = Object.fromEntries(contract.review_passes.map((row) => [row.reviewer_role, row]));
  const packetById = new Map(parentRegistry.packets.map((packet) => [packet.packet_id, packet]));
  const privateMapByPacket = new Map(parentRegistry.private_map.map((row) => [row.packet_id, row]));
  const packetReviews = contract.packet_review_plans.map((plan) => {
    const packet = packetById.get(plan.packet_id);
    if (!packet) throw new Error(`Missing blind packet ${plan.packet_id}`);
    const reviewPasses = [
      buildPassRecord(packet, plan, passContracts.artifact_validity),
      buildPassRecord(packet, plan, passContracts.adversarial_countermodel)
    ];
    const result = {
      schema_version: 'counter-selector-blind-review@1',
      program_id: contract.program_id,
      wave_id: contract.wave_id,
      packet_id: plan.packet_id,
      blind_token: plan.blind_token,
      review_passes: reviewPasses,
      convergence: reviewPasses[0].input_digest === reviewPasses[1].input_digest
        ? 'same_public_input_independent_question_sets'
        : 'invalid_input_divergence',
      dimension_vector: structuredClone(plan.dimension_vector),
      synthesis: plan.synthesis,
      disposition: plan.disposition,
      field_test_eligible: false,
      operator_finding: false,
      promotion_generated: false,
      person_ranking_generated: false,
      public_identity_release_authorized: false,
      next_acquisitions: [...plan.next_acquisitions],
      graph_effect: 'none'
    };
    if (plan.mechanism_observations) result.mechanism_observations = structuredClone(plan.mechanism_observations);
    if (plan.class_reassignment_recommendation) {
      result.class_reassignment_recommendation = structuredClone(plan.class_reassignment_recommendation);
    }
    return result;
  });

  const boundedSupports = packetReviews.flatMap((review) => Object.values(review.dimension_vector))
    .filter((state) => state === 'bounded_support').length;
  const disagreements = buildDisagreements(contract);
  return {
    schema_version: 'counter-selector-blind-review-registry@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    status: 'two_internal_blind_reviews_complete_external_independence_not_claimed',
    parent_release_sha256: contract.parent_release_sha256,
    counts: {
      identity_minimized_packets_reviewed: packetReviews.length,
      procedurally_separated_review_passes: packetReviews.reduce((count, review) => count + review.review_passes.length, 0),
      external_independent_reviews: 0,
      bounded_dimension_supports: boundedSupports,
      disagreements_preserved: disagreements.length,
      class_reassignment_recommendations: packetReviews.filter((review) => review.class_reassignment_recommendation).length,
      field_test_eligible_packets: 0,
      operator_findings: 0,
      promotions: 0,
      person_rankings: 0,
      public_identity_releases: 0,
      graph_effects: 0
    },
    reviewer_independence: structuredClone(contract.reviewer_independence),
    review_input_contract: {
      allowed_fields: [...contract.review_input_fields],
      prohibited_cues: [...contract.review_prohibitions],
      private_map_available_during_passes: false
    },
    packet_reviews: packetReviews,
    post_review_custody_map: parentRegistry.private_map.map((row) => ({
      ...structuredClone(row),
      available_to_review_passes: false,
      restored_phase: 'post_review_synthesis_only'
    })),
    next_action: 'Acquire the missing support, handoff, transfer, final-merits, and durability receipts. Do not launch a field test from these reviews.',
    boundaries: {
      procedural_separation_is_external_independence: false,
      blind_review_is_operator_selection: false,
      bounded_support_is_general_capability: false,
      mechanism_finding_is_person_finding: false,
      review_authorizes_contact: false,
      review_authorizes_field_test: false,
      public_identity_release_authorized: false,
      aggregate_rank_generated: false,
      graph_effect: 'none'
    }
  };
}

function buildDisagreementLedger(contract, reviewRegistry) {
  const disagreements = buildDisagreements(contract);
  return {
    schema_version: 'counter-selector-review-disagreement-ledger@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    status: 'two_disagreements_preserved_and_bounded',
    counts: {
      disagreements: disagreements.length,
      scope_disagreements: disagreements.filter((row) => row.issue === 'scope_of_supported_dimensions').length,
      unit_of_analysis_disagreements: disagreements.filter((row) => row.issue === 'unit_of_analysis_and_class').length,
      class_reassignment_recommendations: disagreements.filter((row) => row.class_reassignment_recommendation).length,
      historical_class_rewrites: 0,
      graph_effects: 0
    },
    disagreements,
    packet_dispositions: reviewRegistry.packet_reviews.map((review) => ({
      packet_id: review.packet_id,
      synthesis: review.synthesis,
      disposition: review.disposition,
      field_test_eligible: review.field_test_eligible,
      operator_finding: review.operator_finding,
      graph_effect: review.graph_effect
    })),
    boundaries: {
      disagreement_is_failure: false,
      resolution_erases_countermodel: false,
      class_recommendation_rewrites_history: false,
      disagreement_authorizes_field_test: false,
      graph_effect: 'none'
    }
  };
}

function computeReleaseManifest(contract, generatedTexts) {
  const entries = releaseScope.map((rel) => {
    const content = generatedTexts[rel] ?? readText(rel);
    const bytes = Buffer.from(content, 'utf8');
    return { path: rel, sha256: sha256(bytes), bytes: bytes.length };
  });
  return {
    schema_version: 'counter-selector-wave-04-release-manifest@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_review_quality: false,
      manifest_proves_external_independence: false,
      manifest_proves_operator_capacity: false,
      manifest_authorizes_field_test: false,
      manifest_authorizes_person_ranking: false,
      manifest_authorizes_graph_edge: false,
      graph_effect: 'none'
    }
  };
}

function buildReport(contract, reviewRegistry, disagreementLedger, manifest) {
  return {
    schema_version: 'counter-selector-wave-04-report@1',
    program_id: contract.program_id,
    wave_id: contract.wave_id,
    as_of: contract.as_of,
    title: contract.title,
    status: reviewRegistry.status,
    parent_release_sha256: contract.parent_release_sha256,
    counts: {
      ...reviewRegistry.counts,
      adversarial_mutations: 26
    },
    independence: reviewRegistry.reviewer_independence,
    packet_results: reviewRegistry.packet_reviews.map((review) => ({
      packet_id: review.packet_id,
      blind_token: review.blind_token,
      review_passes: review.review_passes.map((pass) => ({
        review_id: pass.review_id,
        reviewer_role: pass.reviewer_role,
        conclusion: pass.conclusion,
        external_independence_claimed: pass.external_independence_claimed
      })),
      dimension_vector: review.dimension_vector,
      mechanism_observations: review.mechanism_observations ?? null,
      synthesis: review.synthesis,
      disposition: review.disposition,
      class_reassignment_recommendation: review.class_reassignment_recommendation ?? null,
      field_test_eligible: review.field_test_eligible,
      operator_finding: review.operator_finding,
      graph_effect: review.graph_effect
    })),
    disagreements: disagreementLedger.disagreements.map((row) => ({
      disagreement_id: row.disagreement_id,
      packet_id: row.packet_id,
      issue: row.issue,
      resolution: row.resolution,
      authority_effect: row.authority_effect
    })),
    next_action: reviewRegistry.next_action,
    boundaries: {
      ...contract.boundaries,
      ...reviewRegistry.boundaries,
      ...disagreementLedger.boundaries
    },
    release_manifest: {
      path: 'data/project/counter-selector-wave-04-release-manifest.json',
      combined_sha256: manifest.combined_sha256
    }
  };
}

function buildHtml(report) {
  const resultRows = report.packet_results.map((result) => {
    const supports = Object.entries(result.dimension_vector)
      .filter(([, state]) => state === 'bounded_support')
      .map(([dimension]) => dimension.replaceAll('_', ' '));
    return `<tr><td><code>${escapeHtml(result.packet_id)}</code></td><td>${escapeHtml(result.synthesis)}</td><td>${supports.length ? escapeHtml(supports.join(', ')) : 'none'}</td><td>${escapeHtml(result.disposition)}</td><td>no</td></tr>`;
  }).join('');
  const disagreementRows = report.disagreements.map((row) =>
    `<tr><td><code>${escapeHtml(row.disagreement_id)}</code></td><td><code>${escapeHtml(row.packet_id)}</code></td><td>${escapeHtml(row.issue)}</td><td>${escapeHtml(row.resolution)}</td></tr>`
  ).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Counter-Selector Wave 04 · Blind review</title>
<style>:root{color-scheme:light;background:#eeeae0;color:#181714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{max-width:1450px;margin:0 auto;padding:40px 24px 72px;line-height:1.55}h1{font-size:clamp(2.5rem,6vw,5.2rem);line-height:.96;letter-spacing:-.05em;max-width:1120px}.state{font-weight:900;color:#84300f}.lede{max-width:980px;font-size:1.18rem}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.card,table,.boundary{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.card{padding:17px;display:grid;gap:5px}.card b{font-size:2.2rem;line-height:1}.card span{font-weight:700}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;font-size:.9rem;margin:1rem 0 2rem}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}tr:last-child td{border-bottom:0}.boundary{border-left:7px solid #7c2920;padding:18px;white-space:pre-wrap}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}</style></head><body>
<p><strong>CLIFFORD NUMBER · COUNTER-SELECTOR · CS-W04-B01</strong></p>
<h1>The machine fought the packet</h1>
<p class="state">2 PACKETS REVIEWED · 4 SEPARATED PASSES · EXTERNAL INDEPENDENCE NOT CLAIMED · 0 FIELD TESTS</p>
<p class="lede">Two identity-minimized packets were subjected to artifact-validity and adversarial-countermodel passes. Disagreement was retained and authority narrowed rather than averaged into a score.</p>
<div class="metrics"><article class="card"><b>${report.counts.identity_minimized_packets_reviewed}</b><span>packets reviewed</span></article><article class="card"><b>${report.counts.procedurally_separated_review_passes}</b><span>review passes</span></article><article class="card"><b>${report.counts.bounded_dimension_supports}</b><span>bounded supports</span></article><article class="card"><b>${report.counts.disagreements_preserved}</b><span>disagreements retained</span></article><article class="card"><b>0</b><span>field-test eligible</span></article></div>
<h2>Packet synthesis</h2><table><thead><tr><th>Packet</th><th>Synthesis</th><th>Bounded support</th><th>Disposition</th><th>Field test</th></tr></thead><tbody>${resultRows}</tbody></table>
<h2>Disagreement ledger</h2><table><thead><tr><th>ID</th><th>Packet</th><th>Issue</th><th>Resolution</th></tr></thead><tbody>${disagreementRows}</tbody></table>
<h2>Authority ceiling</h2><div class="boundary">procedural separation ≠ external independence
bounded support ≠ operator finding
correction mechanism ≠ repair-capable partnership
review result ≠ contact authority
review result ≠ field-test authority
no promotion · no ranking · no identity release · graph effect none</div>
<p><strong>Next:</strong> ${escapeHtml(report.next_action)}</p>
</body></html>\n`;
}

export function buildCounterSelectorWave04() {
  const contract = readJson('data/project/counter-selector-wave-04-blind-review.json');
  const parentManifest = readJson('data/project/counter-selector-wave-03-release-manifest.json');
  const parentRegistry = readJson('data/project/counter-selector-blind-packet-registry.json');
  if (parentManifest.combined_sha256 !== contract.parent_release_sha256) {
    throw new Error('Wave 03 parent release digest does not match Wave 04 contract.');
  }
  if (parentRegistry.counts.packets_ready !== 2 || parentRegistry.packets.length !== 2) {
    throw new Error('Wave 04 requires exactly two identity-minimized parent packets.');
  }

  const reviewRegistry = buildReviewRegistry(contract, parentRegistry);
  const disagreementLedger = buildDisagreementLedger(contract, reviewRegistry);
  const generatedTexts = {
    'data/project/counter-selector-blind-review-registry.json': stableJson(reviewRegistry),
    'data/project/counter-selector-review-disagreement-ledger.json': stableJson(disagreementLedger)
  };
  const manifest = computeReleaseManifest(contract, generatedTexts);
  const report = buildReport(contract, reviewRegistry, disagreementLedger, manifest);
  const html = buildHtml(report);

  writeText('data/project/counter-selector-blind-review-registry.json', generatedTexts['data/project/counter-selector-blind-review-registry.json']);
  writeText('data/project/counter-selector-review-disagreement-ledger.json', generatedTexts['data/project/counter-selector-review-disagreement-ledger.json']);
  writeText('data/project/counter-selector-wave-04-release-manifest.json', stableJson(manifest));
  writeText('reports/core-thesis/counter-selector-wave-04/data.json', stableJson(report));
  writeText('reports/core-thesis/counter-selector-wave-04/index.html', html);

  console.log(
    `build-counter-selector-wave-04: ${reviewRegistry.counts.identity_minimized_packets_reviewed} packets, ` +
    `${reviewRegistry.counts.procedurally_separated_review_passes} passes, ` +
    `${reviewRegistry.counts.bounded_dimension_supports} bounded supports, ` +
    `${reviewRegistry.counts.field_test_eligible_packets} field-test eligible`
  );
  return { reviewRegistry, disagreementLedger, manifest, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) buildCounterSelectorWave04();
