import assert from 'node:assert/strict';
import fs from 'node:fs';

const portfolio = JSON.parse(fs.readFileSync('data/research/portfolio-provenance.json', 'utf8'));
assert.equal(portfolio.corpora.length, 5);
assert.match(portfolio.framing, /deliberately curated/i);
assert.match(portfolio.framing, /not a random sample/i);
assert.match(portfolio.corpora.find(row => row.corpus_id === 'presidential-campaign-business').why_executed_first, /tractability/i);
assert.equal(portfolio.review_contract.discovery_and_intake, 'continue_without_second_party');
assert.equal(portfolio.review_contract.machine_candidate_publication, 'not_permitted');
assert.match(portfolio.review_contract.anti_theater_rule, /must not be narrated as completed rigor/i);
assert.equal(portfolio.calibration.fa03.status, 'synthetic_evidence_discrimination_control');
assert.equal(portfolio.calibration.icij_panama.status, 'real_public_dataset_reported_relation_positive');
assert.equal(portfolio.calibration.natsec100_awards.status, 'real_official_source_edge_positive_cross_corpus_join_held');
assert.equal(portfolio.graph_effect, 'none');
console.log('portfolio-provenance.test.js: OK');
