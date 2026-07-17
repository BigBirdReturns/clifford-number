#!/usr/bin/env node
import fs from 'node:fs';

const overlap = JSON.parse(fs.readFileSync('data/research/oge-fec-overlap-manifest.json', 'utf8'));
const oge = JSON.parse(fs.readFileSync('data/research/oge-beneficial-interest-manifest.json', 'utf8'));
const fec = JSON.parse(fs.readFileSync('data/research/fec-payee-inventory-manifest.json', 'utf8'));
const sha = /^[a-f0-9]{64}$/;
const d = overlap.coverage?.denominator;
const x = overlap.coverage?.dispositions;
const rules = overlap.coverage?.candidate_pairs_by_rule;

if (overlap.schema_version !== 'oge-fec-payee-overlap-manifest@1' || overlap.graph_effect !== 'none') throw new Error('invalid overlap manifest contract');
if (overlap.inputs.oge_interests.sha256 !== oge.outputs.interests.sha256 || d.oge_input_lines !== oge.normalized_beneficial_interest_records) throw new Error('OGE overlap input does not match durable intake');
if (overlap.inputs.fec_payee_candidates.sha256 !== fec.outputs.candidates.sha256 || d.fec_input_lines !== fec.coverage.distinct_unresolved_payee_candidates) throw new Error('FEC overlap input does not match durable inventory');
if (x.interests_with_candidates + x.interests_without_candidates !== d.oge_valid_named_interests) throw new Error('interest overlap dispositions do not reconcile');
if (Object.values(rules).reduce((n, value) => n + value, 0) !== x.candidate_pairs_emitted) throw new Error('overlap candidate rule counts do not reconcile');
if (x.candidate_pairs_emitted < 1 || x.interests_without_candidates < 1) throw new Error('overlap output does not preserve both candidates and nulls');
for (const output of Object.values(overlap.outputs)) if (!sha.test(output.sha256) || output.bytes < 1) throw new Error(`invalid overlap output receipt: ${output.path}`);

console.log(`validate-oge-fec-overlap: OK (${x.candidate_pairs_emitted} unresolved lexical candidates across ${x.interests_with_candidates} interests)`);
