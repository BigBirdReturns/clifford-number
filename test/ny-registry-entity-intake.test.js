import assert from 'node:assert/strict';
import { activeEntityUrl, filingHistoryUrl, buildRegistryIntake } from '../tools/lib/ny-registry-entity-intake.mjs';

assert.match(activeEntityUrl(['O\'BRIEN TEST LLC']).toString(), /O%27%27BRIEN/);
assert.match(filingHistoryUrl([123]).toString(), /corpid_num/);

const embedded = [{ embedded_candidate_id: 'embedded:1', match: { normalized_fec_payee_name: 'TRUMP TEST LLC' } }];
const active = [{ dos_id: '123', current_entity_name: 'TRUMP TEST LLC', entity_type: 'DOMESTIC LIMITED LIABILITY COMPANY' }];
const filings = [{ corpid_num: '123', documenttype: 'ARTICLES OF ORGANIZATION' }];
const rows = buildRegistryIntake(active, filings, embedded);
assert.equal(rows.length, 1);
assert.equal(rows[0].registry_node_id, 'ny-dos:123');
assert.equal(rows[0].registry_entity_status, 'official_identifier_observed');
assert.match(rows[0].fec_payee_link_status, /^provisional_/);
assert.equal(rows[0].graph_effect, 'none');

console.log('ny-registry-entity-intake.test.js: OK');
