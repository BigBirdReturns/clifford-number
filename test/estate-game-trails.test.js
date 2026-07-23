import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildEstateGameTrails } from '../tools/build-estate-game-trails.mjs';
import { readJson } from '../tools/lib/ledger.mjs';

const first = buildEstateGameTrails();
const second = buildEstateGameTrails({ write: false });
assert.deepEqual(second, first, 'game-trail compilation must be deterministic');
assert.deepEqual(readJson('build/estate-game-trails/manifest.json'), first.manifest);
assert.equal(first.manifest.schema_version, 'estate-game-trail-manifest@2');
assert.deepEqual(first.manifest.counts, {
  estates: 24,
  existing_estates: 4,
  next_estates: 10,
  frontier_estates: 10,
  legacy_preserved_trails: 35,
  legacy_trail_estate_evaluations: 840,
  estate_source_route_trails: 155,
  estate_custody_trails: 94,
  estate_frontier_summary_trails: 24,
  total_compiled_trails: 308,
  exact_legacy_trail_pair_overlaps: 5,
  directed_estate_pairs_with_overlap: 302,
  unresolved_legacy_trails: 2,
  bounded_non_overlap_trails: 66,
  route_labels: 103,
  canonical_source_families: 91,
  route_uses: 155,
  custody_memberships: 94,
  frontier_surveys: 10,
  frontier_survey_route_uses: 68,
});
assert.deepEqual(first.manifest.legacy_source_counts, {
  arcadia: 10,
  clifford_thiel_trump_wrap_up: 3,
  cross_corpus_public_interest: 4,
  person_centered_defense: 18,
});
assert.equal(first.manifest.graph_effect, 'none');
assert.equal(first.manifest.conclusion_generated, false);
assert.equal(first.manifest.promotes_to, 'candidate_only');

const byLegacyId = new Map(first.legacyRuns.map(run => [run.trail_id, run]));
assert.equal(byLegacyId.get('trail-deed-chronology').first_target_estate_ids[0], 'real-property-title-debt-estate');
assert.equal(byLegacyId.get('trail-daia-formation').first_target_estate_ids[0], 'state-municipal-authority-estate');
assert.equal(byLegacyId.get('trail-eb5-wash-dates').first_target_estate_ids[0], 'labor-immigration-workforce-mobility-estate');
assert.equal(byLegacyId.get('trail-transcript-recovery').outcome_class, 'unresolved_boundary');
assert.deepEqual(byLegacyId.get('trail-transcript-recovery').first_target_estate_ids, []);
assert.equal(byLegacyId.get('trail-joe-lonsdale-validation').first_target_estate_ids[0], 'venture-capital-corporate-control-estate');
assert.equal(byLegacyId.get('policy-demand-to-defense-supplier-market').first_target_estate_ids[0], 'uk-state-market-estate');
assert.equal(byLegacyId.get('clifford-thiel-convening-context').outcome_class, 'typed_object_overlap');

for (const run of first.legacyRuns) {
  assert.equal(run.evaluations.length, 24);
  assert.equal(new Set(run.evaluations.map(row => row.estate_id)).size, 24);
  assert.ok(first.manifest.outcome_counts[run.outcome_class] > 0);
  assert.equal(run.graph_effect, 'none');
  assert.equal(run.conclusion_generated, false);
}
for (const run of [...first.sourceRouteRuns, ...first.custodyRuns, ...first.estateSummaries]) {
  assert.ok(run.outcome_class);
  assert.equal(run.graph_effect, 'none');
  assert.equal(run.conclusion_generated, false);
}
for (const summary of first.estateSummaries) {
  assert.ok(summary.outcome_class);
  assert.ok(summary.next_acquisition);
  assert.equal(summary.trail_family, 'estate_frontier_summary_trail');
}

const sourceRouteUses = new Set(first.sourceRouteRuns.map(run => `${run.origin_estate_id}:${run.route_id}`));
assert.equal(sourceRouteUses.size, 155, 'every current estate route use must emit one game trail');
const matrix = first.overlapMatrix;
assert.equal(matrix.rows.length, 24);
assert.ok(matrix.directed_overlap_pairs.some(row => row.origin_estate_id === 'local-development-estate' && row.target_estate_id === 'real-property-title-debt-estate' && row.typed_object_overlap > 0));
assert.ok(matrix.directed_overlap_pairs.some(row => row.origin_estate_id === 'ai-data-compute-infrastructure-estate' && row.shared_source_infrastructure > 0));
assert.ok(first.exactTrailPairs.some(pair => new Set([pair.trail_a, pair.trail_b]).has('trail-sally-donnelly-validation') && new Set([pair.trail_a, pair.trail_b]).has('trail-tony-demartino-validation')));
assert.ok(first.exactTrailPairs.some(pair => new Set([pair.trail_a, pair.trail_b]).has('clifford-thiel-convening-context') && new Set([pair.trail_a, pair.trail_b]).has('thiel-palantir-state-channel')));
assert.equal(first.frontierSurveys.length, 10);
assert.equal(first.publicData.frontier_surveys.length, 10);
assert.equal(first.publicData.frontier_surveys.every(survey => survey.preparation_state.raw_records_acquired === 0), true);
const milestone = readJson('data/milestones/estate-frontier-game-trails-v1.json');
assert.equal(milestone.status, 'completed');
assert.equal(milestone.counts.estates, first.manifest.counts.estates);
assert.equal(milestone.counts.frontier_surveys, first.manifest.counts.frontier_surveys);
assert.equal(milestone.counts.total_compiled_trails, first.manifest.counts.total_compiled_trails);
assert.equal(milestone.counts.legacy_trail_estate_evaluations, first.manifest.counts.legacy_trail_estate_evaluations);
assert.equal(milestone.counts.frontier_raw_records_acquired, 0);
assert.equal(milestone.waterline.current, first.manifest.waterline.current);
assert.equal(milestone.graph_effect, 'none');
assert.equal(milestone.conclusion_generated, false);
assert.equal(first.publicData.interpretation_contract.trail_counts_are_not_scores_or_rankings, true);
const apertureRuntime = fs.readFileSync('src/gametrail-aperture-runtime.js', 'utf8');
assert.match(apertureRuntime, /Declared bounded searches/);
assert.match(apertureRuntime, /target_domain/);
assert.doesNotMatch(JSON.stringify(first), /"(?:score|rank|ranking|verdict|finding|guilt_score|risk_score|probability_score)"\s*:/i);
console.log('estate-game-trails.test.js: OK');
