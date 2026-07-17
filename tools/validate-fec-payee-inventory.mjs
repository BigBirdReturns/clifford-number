#!/usr/bin/env node
import fs from 'node:fs';

const inventory = JSON.parse(fs.readFileSync('data/research/fec-payee-inventory-manifest.json', 'utf8'));
const cohort = JSON.parse(fs.readFileSync('data/research/fec-bulk-oppexp-cohort-manifest.json', 'utf8'));
const sha = /^[a-f0-9]{64}$/;

if (inventory.schema_version !== 'fec-payee-inventory-manifest@1') throw new Error('unexpected payee inventory schema');
if (inventory.graph_effect !== 'none') throw new Error('payee inventory must remain non-graphing');
if (inventory.coverage.inventory_records_written !== cohort.totals.total_matched_reported_rows) throw new Error('payee inventory/FEC cohort row count mismatch');
if (inventory.coverage.input_lines !== cohort.totals.total_matched_reported_rows) throw new Error('payee inventory did not consume every matched FEC row');
if (inventory.coverage.distinct_unresolved_payee_candidates < 1) throw new Error('payee candidate inventory is empty');
if (inventory.coverage.cycles_observed.length !== cohort.totals.cycles_scanned.length) throw new Error('payee inventory cycle coverage mismatch');
if (inventory.coverage.address_status_rows.unavailable_by_upstream_privacy_projection !== cohort.totals.total_matched_reported_rows) throw new Error('address projection gap is not explicit for every row');
if (inventory.outputs.dispositions.bytes !== 0 || inventory.outputs.dispositions.sha256 !== 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') throw new Error('unexpected payee disposition output');
for (const input of inventory.inputs) if (!sha.test(input.sha256)) throw new Error(`invalid input hash for ${input.path}`);
for (const output of Object.values(inventory.outputs)) if (!sha.test(output.sha256)) throw new Error(`invalid output hash for ${output.path}`);
if (!inventory.interpretation.some(line => /does not resolve a legal entity/i.test(line))) throw new Error('missing unresolved-candidate caveat');

console.log(`validate-fec-payee-inventory: OK (${inventory.coverage.inventory_records_written} records, ${inventory.coverage.distinct_unresolved_payee_candidates} unresolved candidates)`);
