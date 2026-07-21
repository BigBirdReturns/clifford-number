import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compileThesisBundle,
  renderThesisMarkdown,
  validateThesisBundle
} from '../tools/lib/thesis.mjs';

const proposition = {
  proposition_id: 'P1',
  chapter_id: 'chapter-1',
  statement: 'A bounded structural proposition may be tested.',
  kind: 'structural_descriptive',
  required_case_ids: ['case-a'],
  minimum_distinct_cases: 1,
  minimum_source_families: 1,
  requires_counterevidence: true,
  denominator_requirements: ['freeze the comparator before interpreting results'],
  falsifiers: ['the pattern disappears under the frozen comparator'],
  alternative_explanations: ['ordinary market behaviour'],
  forbidden_inferences: ['recurrence proves coordination'],
  current_disposition: 'open'
};

const synthesis = {
  proposition_id: 'P2',
  chapter_id: 'chapter-2',
  statement: 'A cross-case synthesis may be attempted only after its inputs clear their own gates.',
  kind: 'cross_case_synthesis',
  required_case_ids: [],
  required_proposition_ids: ['P1'],
  minimum_eligible_propositions: 1,
  minimum_distinct_workstreams: 1,
  minimum_source_families: 1,
  requires_counterevidence: true,
  denominator_requirements: ['compile contributing cases independently'],
  falsifiers: ['recurrence disappears under ordinary controls'],
  alternative_explanations: ['parallel adoption'],
  forbidden_inferences: ['recurrence proves coordination'],
  current_disposition: 'open'
};

const manifest = {
  schema_version: 'clifford-thesis@1',
  thesis_id: 'fixture-thesis',
  title: 'Fixture thesis',
  research_question: 'Does the bounded fixture proposition survive its declared tests?',
  working_thesis: 'This is a provisional fixture proposition, not a finding.',
  publication_status: 'blocked_pending_review',
  graph_effect: 'none',
  machine_synthesis_ceiling: 'eligible_for_human_synthesis',
  case_index: [
    { case_id: 'case-a', issue: 1, workstream: 'fixture', title: 'Fixture case', status: 'contract_only' }
  ],
  propositions: [proposition, synthesis],
  chapters: [
    { chapter_id: 'chapter-1', title: 'Fixture chapter', proposition_ids: ['P1'] },
    { chapter_id: 'chapter-2', title: 'Fixture synthesis', proposition_ids: ['P2'] }
  ],
  interpretation_contract: {
    copy_ready_caveat: 'This fixture is a working research assembly, not a verdict.'
  }
};

const emptyEvidence = {
  schema_version: 'clifford-thesis-evidence@1',
  thesis_id: 'fixture-thesis',
  packets: [],
  known_gaps: [],
  graph_effect: 'none'
};

const emptyReviews = {
  schema_version: 'clifford-thesis-review@1',
  thesis_id: 'fixture-thesis',
  reviews: [],
  required_reviews: [],
  graph_effect: 'none'
};

assert.deepEqual(validateThesisBundle({ manifest, evidence: emptyEvidence, reviews: emptyReviews, receiptIds: new Set() }), []);
const emptyBuild = compileThesisBundle({ manifest, evidence: emptyEvidence, reviews: emptyReviews, generatedAt: '2026-01-01T00:00:00Z' });
assert.equal(emptyBuild.status, 'assembly_open_no_evidence_packets');
assert.equal(emptyBuild.conclusion_generated, false);
assert.equal(emptyBuild.bottom_line_generated, false);
assert.ok(emptyBuild.propositions.every(item => item.machine_disposition === 'open_no_evidence_packets'));
assert.doesNotMatch(renderThesisMarkdown(emptyBuild), /the thesis is proved|the thesis is supported/i);

const supportWithoutReceipt = {
  ...emptyEvidence,
  packets: [{
    packet_id: 'packet-1', proposition_id: 'P1', case_id: 'case-a', relation: 'supports',
    summary: 'Fixture support.', source_paths: ['fixture.json'], receipt_ids: [],
    source_families: ['official fixture'], review_status: 'human_reviewed', graph_effect: 'none'
  }]
};
assert.ok(validateThesisBundle({ manifest, evidence: supportWithoutReceipt, reviews: emptyReviews, receiptIds: new Set() })
  .some(error => /requires receipt IDs/.test(error)));

const acceptedReviews = {
  ...emptyReviews,
  reviews: [{
    review_id: 'selection-review-1', review_kind: 'selection', status: 'accepted_with_revisions',
    independent: true, reviewer_id: 'reviewer-b', author_id: 'author-a', graph_effect: 'none'
  }]
};

const reviewedEvidence = {
  ...emptyEvidence,
  packets: [
    {
      packet_id: 'support-1', proposition_id: 'P1', case_id: 'case-a', relation: 'supports',
      summary: 'A receipted fixture observation supports the bounded proposition.',
      source_paths: ['fixture-support.json'], source_families: ['official fixture'],
      receipt_ids: ['receipt-support'], review_status: 'human_reviewed', graph_effect: 'none'
    },
    {
      packet_id: 'null-1', proposition_id: 'P1', case_id: 'case-a', relation: 'null_result',
      summary: 'The declared comparator query returned no responsive fixture row in the bounded source.',
      query_scope: 'fixture comparator, 2026-01-01', source_status: 'complete_fixture',
      source_paths: ['fixture-null.json'], source_families: ['official fixture'],
      receipt_ids: [], review_status: 'human_reviewed', graph_effect: 'none'
    }
  ]
};

assert.deepEqual(validateThesisBundle({
  manifest,
  evidence: reviewedEvidence,
  reviews: acceptedReviews,
  receiptIds: new Set(['receipt-support'])
}), []);
const eligibleBuild = compileThesisBundle({ manifest, evidence: reviewedEvidence, reviews: acceptedReviews, generatedAt: '2026-01-01T00:00:00Z' });
assert.equal(eligibleBuild.propositions.find(item => item.proposition_id === 'P1').machine_disposition, 'eligible_for_human_synthesis');
assert.equal(eligibleBuild.propositions.find(item => item.proposition_id === 'P2').machine_disposition, 'eligible_for_human_synthesis');
assert.ok(eligibleBuild.propositions.every(item => !/supported|proved/.test(item.machine_disposition)));

const contradictionBuild = compileThesisBundle({
  manifest,
  reviews: acceptedReviews,
  generatedAt: '2026-01-01T00:00:00Z',
  evidence: {
    ...reviewedEvidence,
    packets: [...reviewedEvidence.packets, {
      packet_id: 'contradiction-1', proposition_id: 'P1', case_id: 'case-a', relation: 'contradicts',
      summary: 'A reviewed fixture observation contradicts the proposition.',
      source_paths: ['fixture-contradiction.json'], source_families: ['independent fixture'],
      receipt_ids: ['receipt-contradiction'], review_status: 'independently_reviewed', graph_effect: 'none'
    }]
  }
});
assert.equal(contradictionBuild.propositions.find(item => item.proposition_id === 'P1').machine_disposition, 'contested_pending_human_synthesis');
assert.equal(contradictionBuild.status, 'contested_research_assembly');

const selfReview = {
  ...emptyReviews,
  reviews: [{
    review_id: 'bad-review', review_kind: 'selection', status: 'accepted', independent: true,
    reviewer_id: 'same-person', author_id: 'same-person', graph_effect: 'none'
  }]
};
assert.ok(validateThesisBundle({ manifest, evidence: emptyEvidence, reviews: selfReview })
  .some(error => /self-review/.test(error)));

const overstatedNull = {
  ...emptyEvidence,
  packets: [{
    packet_id: 'bad-null', proposition_id: 'P1', case_id: 'case-a', relation: 'null_result',
    summary: 'This proves absence and no relationship exists.', query_scope: 'fixture', source_status: 'complete_fixture', graph_effect: 'none'
  }]
};
assert.ok(validateThesisBundle({ manifest, evidence: overstatedNull, reviews: emptyReviews })
  .some(error => /overstates/.test(error)));

const actualManifest = JSON.parse(readFileSync('data/research/theses/synthetic-population-infrastructure.json', 'utf8'));
const actualEvidence = JSON.parse(readFileSync('data/research/thesis-evidence/synthetic-population-infrastructure.json', 'utf8'));
const actualReviews = JSON.parse(readFileSync('data/research/thesis-reviews/synthetic-population-infrastructure.json', 'utf8'));
assert.deepEqual(validateThesisBundle({ actual: true, manifest: actualManifest, evidence: actualEvidence, reviews: actualReviews }), []);
const actualBuild = compileThesisBundle({ manifest: actualManifest, evidence: actualEvidence, reviews: actualReviews, generatedAt: '2026-07-21T00:00:00Z' });
assert.equal(actualBuild.counts.case_contracts, 18);
assert.equal(actualBuild.counts.propositions, 6);
assert.equal(actualBuild.counts.evidence_packets, 0);
assert.equal(actualBuild.status, 'assembly_open_no_evidence_packets');
assert.ok(actualBuild.propositions.every(item => item.machine_disposition === 'open_no_evidence_packets'));

console.log('thesis-assembly.test.js: OK');
