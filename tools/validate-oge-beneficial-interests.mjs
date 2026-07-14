#!/usr/bin/env node
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('data/research/oge-beneficial-interest-manifest.json', 'utf8'));
const locators = JSON.parse(fs.readFileSync('data/research/oge-disclosure-locators.json', 'utf8'));
const sha = /^[a-f0-9]{64}$/;

if (manifest.schema_version !== 'oge-beneficial-interest-manifest@1') throw new Error('unexpected OGE interest manifest schema');
if (manifest.graph_effect !== 'none') throw new Error('OGE interest intake must remain non-graphing');
if (manifest.documents_expected !== locators.totals.documents_downloaded_and_hashed) throw new Error('OGE document denominator mismatch');
if (manifest.documents_completed !== manifest.documents_expected || manifest.documents_failed !== 0) throw new Error('OGE document acquisition is incomplete');
if (manifest.normalized_beneficial_interest_records < 1) throw new Error('OGE normalized interest intake is empty');
if (Object.values(manifest.summary_by_person).reduce((n, row) => n + row.records, 0) !== manifest.normalized_beneficial_interest_records) throw new Error('OGE person totals do not reconcile');
if (Object.values(manifest.summary_by_person).reduce((n, row) => n + row.documents, 0) !== manifest.documents_completed) throw new Error('OGE document totals do not reconcile');
if (manifest.normalization_rejections !== manifest.privacy_rejections + manifest.parse_rejections) throw new Error('OGE rejection totals do not reconcile');
const quality = manifest.extraction_quality;
if (quality.transaction_dates_strictly_parsed + quality.transaction_dates_ocr_ambiguous !== quality.transaction_rows) throw new Error('OGE transaction date quality counts do not reconcile');
if (quality.transaction_types_strictly_parsed + quality.transaction_types_ocr_ambiguous !== quality.transaction_rows) throw new Error('OGE transaction type quality counts do not reconcile');
if (quality.transaction_dates_ocr_ambiguous < 1 || quality.transaction_types_ocr_ambiguous < 1) throw new Error('OGE OCR ambiguity was not preserved');
for (const output of Object.values(manifest.outputs)) if (!sha.test(output.sha256) || output.bytes < 0) throw new Error(`invalid output receipt for ${output.path}`);
if (manifest.outputs.interests.bytes < 1 || manifest.outputs.documents.bytes < 1) throw new Error('OGE durable output receipts are empty');
if (manifest.verification_status !== 'machine_proposed_unverified') throw new Error('OGE intake cannot claim verification');

console.log(`validate-oge-beneficial-interests: OK (${manifest.documents_completed} documents, ${manifest.normalized_beneficial_interest_records} intake rows, ${manifest.normalization_rejections} normalization rejections)`);
