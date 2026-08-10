#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadModel, validateModel } from '../tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion.mjs';

const base = loadModel(process.cwd());
validateModel(base);
const clone = value => structuredClone(value);
let refusals = 0;
function reject(name, mutate) {
  const m = clone(base);
  m.repoRoot = base.repoRoot; m.root = base.root;
  mutate(m);
  assert.throws(() => validateModel(m), undefined, name);
  refusals += 1;
}
reject('terminal count inflation', m => m.matrix.counts.terminal_cells = 229);
reject('open count deflation', m => m.matrix.counts.still_open_cells = 221);
reject('unit terminalization', m => m.matrix.counts.terminal_units = 11);
reject('class closure', m => m.matrix.counts.class_closed = true);
reject('row transition', m => m.matrix.rows.find(r=>r.unit_id==='US-STATE-ND').row_state = 'terminal');
reject('row field count', m => m.matrix.rows.find(r=>r.unit_id==='US-STATE-ND').open_fields = 0);
reject('target state widening', m => m.matrix.rows.find(r=>r.unit_id==='US-STATE-ND').cells.find(c=>c.field_ordinal===4).state = 'evidence_complete');
reject('target terminal rollback', m => m.matrix.rows.find(r=>r.unit_id==='US-STATE-ND').cells.find(c=>c.field_ordinal===4).terminal = false);
reject('row-state mutation', m => m.matrix.rows.find(r=>r.unit_id==='US-STATE-ND').cells.find(c=>c.field_ordinal===9).typed_gap = 'one_open_field');
reject('source set truncation', m => m.decision.evidence_source_ids.pop());
reject('missing class refusal', m => m.decision.prohibited_inferences = m.decision.prohibited_inferences.filter(x=>x!=='do_not_close_rd04_c02'));
reject('matrix update inflation', m => m.ledger.matrix_update_count = 2);
reject('row mutation authority', m => m.summary.row_state_mutations = 1);
reject('network request authority', m => m.summary.authority_boundary.source_requests = 1);
reject('source admission authority', m => m.input.authority_boundary.source_admissions = 1);
reject('cumulative ledger effect', m => m.ledger.authority_boundary.cumulative_ledger_effect = 'changed');
reject('publication effect', m => m.decision.authority_boundary.publication_effect = 'claimed');
reject('graph effect', m => m.summary.authority_boundary.graph_effect = 'edge_created');
reject('open census shrink', m => m.census.open_cell_count = 221);
reject('manifest path denominator', m => m.manifest.permanent_path_count = 13);
console.log(JSON.stringify({state:'adversarial_refusals_complete',refusals}, null, 2));
