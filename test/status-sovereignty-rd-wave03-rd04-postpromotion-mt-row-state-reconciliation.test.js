import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { C, buildProduct } from '../tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.mjs';
import { EXPECTED_PERMANENT_PATHS, EXPECTED_HASHED_PATHS, validateProduct } from '../tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.mjs';

const ROOT=process.cwd();
const rel={input:`${C.ROOT}/input-custody.json`,decision:`${C.ROOT}/row-state-decision.json`,ledger:`${C.ROOT}/row-state-ledger.json`,matrix:`${C.ROOT}/promoted-partial-field-matrix.json`,census:`${C.ROOT}/remaining-open-field-census.json`,summary:`${C.ROOT}/row-state-summary.json`,index:`${C.ROOT}/index.json`,manifest:`${C.ROOT}/product-manifest.json`,predecessor:C.PREDECESSOR_MATRIX_PATH,workflow:'.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.yml',docs:'docs/milestones/ssc-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.md',schema:'schemas/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.schema.json',test:'test/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.test.js',builder:'tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.mjs',validator:'tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.mjs'};
const bytes=p=>fs.readFileSync(path.join(ROOT,p));
const json=p=>JSON.parse(bytes(p));
const encode=o=>Buffer.from(`${JSON.stringify(o,null,2)}\n`);
const mutateJson=(p,fn)=>{const o=json(p);fn(o);return new Map([[p,encode(o)]]);};
const expectRefusal=(label,overrides)=>assert.throws(()=>validateProduct(ROOT,overrides),undefined,label);

test('deterministic builder reproduces all five derived files',()=>{const product=buildProduct(ROOT);for(const [name,built] of Object.entries(product))assert.deepEqual(bytes(`${C.ROOT}/${name}`),built,name);});
test('standing qualification workflow parses as YAML',()=>{const parsed=spawnSync('ruby',['-e',"require 'yaml'; YAML.load_file(ARGV.fetch(0)); puts 'yaml_ok'",path.join(ROOT,rel.workflow)],{encoding:'utf8'});assert.equal(parsed.status,0,parsed.stderr||parsed.stdout);assert.match(parsed.stdout,/yaml_ok/);});
test('raw product commit object is reconstructed and hashed',()=>{const w=bytes(rel.workflow).toString();assert.match(w,/git cat-file commit \"\$PRODUCT_COMMIT\"/);assert.match(w,/git hash-object -t commit --stdin < \"\$EXPECTED_COMMIT_OBJECT\"/);assert.match(w,/cmp \"\$EXPECTED_COMMIT_OBJECT\" \"\$ACTUAL_COMMIT_OBJECT\"/);assert.doesNotMatch(w,/--format='%[ac]I'/);assert.doesNotMatch(w,/--format='%B' \"\$PRODUCT_COMMIT\"/);});
test('exact product validates',()=>{const receipt=validateProduct(ROOT);assert.equal(receipt.state,'qualified_exact_montana_row_state_reconciliation');assert.equal(receipt.terminal_cells,230);assert.equal(receipt.terminal_units,12);assert.equal(receipt.class_closed,false);});
test('closed product refuses forty bounded mutations',()=>{
  const mutations=[
    ['predecessor byte drift',new Map([[rel.predecessor,Buffer.concat([bytes(rel.predecessor),Buffer.from(' ')])]])],
    ['predecessor Montana row drift',mutateJson(rel.predecessor,m=>{m.rows.find(r=>r.unit_id==='US-STATE-MT').row_state='terminal_fixed_public_record_obligation_complete';})],
    ['predecessor Montana substantive drift',mutateJson(rel.predecessor,m=>{m.rows.find(r=>r.unit_id==='US-STATE-MT').cells[0].value.state_name='Montana altered';})],
    ['predecessor non-target drift',mutateJson(rel.predecessor,m=>{m.rows.find(r=>r.unit_id==='US-STATE-AL').state_name='Alabama altered';})],
    ['input parent drift',mutateJson(rel.input,o=>{o.canonical_parent='0'.repeat(40);})],
    ['input matrix drift',mutateJson(rel.input,o=>{o.predecessor_matrix.sha256='0'.repeat(64);})],
    ['input validation drift',mutateJson(rel.input,o=>{o.admitted_validation.product_commit='0'.repeat(40);})],
    ['input control drift',mutateJson(rel.input,o=>{o.standing_control_repairs.first_parent_edge_census.merge_commit='0'.repeat(40);})],
    ['input evidence omission',mutateJson(rel.input,o=>{o.terminal_evidence_cells.pop();})],
    ['input class closure',mutateJson(rel.input,o=>{o.authority_boundary.class_closed=true;})],
    ['decision row drift',mutateJson(rel.decision,o=>{o.current_row_sha256='0'.repeat(64);})],
    ['decision cell drift',mutateJson(rel.decision,o=>{o.proposed_row_state_cell.state='observed';})],
    ['decision extra cell key',mutateJson(rel.decision,o=>{o.proposed_row_state_cell.unreviewed=true;})],
    ['decision inference removed',mutateJson(rel.decision,o=>{o.prohibited_inferences.pop();})],
    ['decision substantive terminalization',mutateJson(rel.decision,o=>{o.transition_effects.field_terminalizations=1;})],
    ['decision second matrix update',mutateJson(rel.decision,o=>{o.transition_effects.matrix_updates=2;})],
    ['decision class closure',mutateJson(rel.decision,o=>{o.authority_boundary.class_closed=true;})],
    ['ledger second row mutation',mutateJson(rel.ledger,o=>{o.row_state_mutation_count=2;})],
    ['ledger substantive field mutation',mutateJson(rel.ledger,o=>{o.substantive_field_terminalization_count=1;})],
    ['ledger source request',mutateJson(rel.ledger,o=>{o.transition.source_requests=1;})],
    ['matrix second row changed',mutateJson(rel.matrix,m=>{m.rows.find(r=>r.unit_id==='US-STATE-AL').state_name='Alabama altered';})],
    ['matrix Montana substantive changed',mutateJson(rel.matrix,m=>{m.rows.find(r=>r.unit_id==='US-STATE-MT').cells[0].value.state_name='Montana altered';})],
    ['matrix row reopened',mutateJson(rel.matrix,m=>{m.rows.find(r=>r.unit_id==='US-STATE-MT').row_state='still_open';})],
    ['matrix class closed',mutateJson(rel.matrix,m=>{m.counts.class_closed=true;m.current_result.class_closed=true;})],
    ['matrix substantive count changed',mutateJson(rel.matrix,m=>{m.counts.terminal_substantive_cells=119;})],
    ['census count drift',mutateJson(rel.census,o=>{o.open_cell_count=219;})],
    ['census restores Montana',mutateJson(rel.census,o=>{o.open_cells.push({unit_id:'US-STATE-MT'});})],
    ['summary terminal unit drift',mutateJson(rel.summary,o=>{o.counts.terminal_units=13;})],
    ['summary class closure',mutateJson(rel.summary,o=>{o.class_closed=true;})],
    ['index substantive terminalization',mutateJson(rel.index,o=>{o.counts.substantive_field_terminalizations=1;})],
    ['manifest path omitted',mutateJson(rel.manifest,o=>{o.permanent_paths.pop();o.permanent_path_count=13;})],
    ['manifest hash omitted',mutateJson(rel.manifest,o=>{o.hashed_files.pop();o.hashed_file_count=12;})],
    ['manifest authority widened',mutateJson(rel.manifest,o=>{o.authority_boundary.source_requests=1;})],
    ['workflow byte drift',new Map([[rel.workflow,Buffer.concat([bytes(rel.workflow),Buffer.from('\n# altered\n')])]])],
    ['docs byte drift',new Map([[rel.docs,Buffer.concat([bytes(rel.docs),Buffer.from('\naltered\n')])]])],
    ['schema byte drift',new Map([[rel.schema,Buffer.concat([bytes(rel.schema),Buffer.from(' ')])]])],
    ['test byte drift',new Map([[rel.test,Buffer.concat([bytes(rel.test),Buffer.from('\n// altered\n')])]])],
    ['builder byte drift',new Map([[rel.builder,Buffer.concat([bytes(rel.builder),Buffer.from('\n// altered\n')])]])],
    ['validator byte drift',new Map([[rel.validator,Buffer.concat([bytes(rel.validator),Buffer.from('\n// altered\n')])]])],
    ['manifest byte drift',new Map([[rel.manifest,Buffer.concat([bytes(rel.manifest),Buffer.from(' ')])]])],
  ];
  assert.equal(mutations.length,40);for(const [label,overrides] of mutations)expectRefusal(label,overrides);assert.equal(EXPECTED_PERMANENT_PATHS.length,14);assert.equal(EXPECTED_HASHED_PATHS.length,13);
});
