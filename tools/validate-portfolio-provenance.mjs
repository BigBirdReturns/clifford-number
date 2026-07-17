#!/usr/bin/env node
import fs from 'node:fs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const portfolio = read('data/research/portfolio-provenance.json');
const fa03 = read('test/audits/fa03-positive-control.json');
const panama = read('data/research/icij-panama-import-manifest.json');
const natsec = read('data/research/natsec100-award-control-manifest.json');
const fail = message => { throw new Error(message); };

if (portfolio.schema_version !== 'public-interest-portfolio-provenance@1' || portfolio.graph_effect !== 'none') fail('invalid portfolio contract');
if (!portfolio.framing.includes('deliberately curated') || !portfolio.framing.includes('not a random sample')) fail('portfolio curation must be explicit');
if (portfolio.corpora.length !== 5 || new Set(portfolio.corpora.map(row => row.corpus_id)).size !== 5) fail('portfolio corpus inventory mismatch');
const campaign = portfolio.corpora.find(row => row.corpus_id === 'presidential-campaign-business');
if (!campaign?.why_executed_first?.includes('tractability') || !campaign.why_executed_first.includes('not a targeting inference')) fail('execution-order provenance missing');
if (portfolio.review_contract.discovery_and_intake !== 'continue_without_second_party'
  || portfolio.review_contract.claim_level_publication !== 'requires_named_independent_human_review'
  || !portfolio.review_contract.anti_theater_rule) fail('review contract collapsed discovery and publication');
if (fa03.condition_a_held !== 5 || fa03.condition_b_passed !== 2) fail('FA-03 calibration drift');
if (panama.real_positive_control.gate.gate !== 'pass'
  || panama.real_positive_control.gate.candidate.core_version !== 'generic-crossing-core@2'
  || panama.coverage.panama_nodes_retained !== 559600
  || panama.coverage.panama_relationships_retained !== 674102) fail('Panama real-positive calibration drift');
if (natsec.source_native_real_positive.gate.gate !== 'pass'
  || natsec.source_native_real_positive.gate.candidate.core_version !== 'generic-crossing-core@2'
  || natsec.coverage.leads_queried !== 5
  || natsec.cross_corpus_join_status !== 'held_identity_unresolved') fail('NatSec100 source-positive calibration drift');
console.log('validate-portfolio-provenance: OK (5 curated corpora; FA-03 synthetic discrimination; 2 real source positives; cross-corpus identity held)');
