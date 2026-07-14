#!/usr/bin/env node
import fs from 'node:fs';

const screen = JSON.parse(fs.readFileSync('data/research/oge-fec-temporal-screen-manifest.json', 'utf8'));
const overlap = JSON.parse(fs.readFileSync('data/research/oge-fec-overlap-manifest.json', 'utf8'));
if (screen.schema_version !== 'oge-fec-temporal-screen-manifest@1' || screen.graph_effect !== 'none') throw new Error('invalid temporal screen contract');
if (screen.input.sha256 !== overlap.outputs.candidates.sha256) throw new Error('temporal screen input does not match durable overlap candidates');
if (Object.values(screen.dispositions).reduce((n, value) => n + value, 0) !== screen.candidate_pairs_screened) throw new Error('temporal dispositions do not reconcile');
if (screen.candidate_pairs_screened !== overlap.coverage.dispositions.candidate_pairs_emitted) throw new Error('temporal screen did not consume every lexical candidate');
if (screen.identity_review_queue !== screen.dispositions.overlapping) throw new Error('identity-review queue count mismatch');
if (screen.crossing_matches !== 0) throw new Error('temporal screening cannot create crossings');
console.log(`validate-oge-fec-temporal-screen: OK (${screen.candidate_pairs_screened} screened; ${screen.identity_review_queue} eligible for identity review)`);
