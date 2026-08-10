import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { C, buildProduct } from '../tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs';
import { EXPECTED_PERMANENT_PATHS, EXPECTED_HASHED_PATHS, validateProduct } from '../tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs';

const ROOT=process.cwd();
const MANIFEST=`${C.ROOT}/product-manifest.json`;
const rel={
  input:`${C.ROOT}/input-custody.json`,decision:`${C.ROOT}/row-state-decision.json`,ledger:`${C.ROOT}/row-state-ledger.json`,
  matrix:`${C.ROOT}/promoted-partial-field-matrix.json`,census:`${C.ROOT}/remaining-open-field-census.json`,summary:`${C.ROOT}/row-state-summary.json`,index:`${C.ROOT}/index.json`,manifest:MANIFEST,
  predecessor:C.PREDECESSOR_MATRIX_PATH,
  workflow:'.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.yml',
  docs:'docs/milestones/ssc-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.md',
  schema:'schemas/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.schema.json',
  test:'test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.test.js',
  builder:'tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs',
  validator:'tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs',
};
const bytes=p=>fs.readFileSync(path.join(ROOT,p));
const json=p=>JSON.parse(bytes(p));
const encode=o=>Buffer.from(`${JSON.stringify(o,null,2)}\n`);
const mutateJson=(p,fn)=>{const o=json(p);fn(o);return new Map([[p,encode(o)]]);};
const mergeMaps=(...maps)=>new Map(maps.flatMap(m=>[...m]));
const recomputeCombined=m=>{const rows=m.hashed_files.map(r=>`${r.path}\0${r.sha256}\0${r.bytes}\n`).sort();m.combined_sha256=crypto.createHash('sha256').update(rows.join('')).digest('hex');};
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
const blob=data=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${data.length}\0`),data])).digest('hex');
const mutateSchema=fn=>{const schema=json(rel.schema);fn(schema);const schemaBytes=encode(schema);const manifest=json(rel.manifest);const rec=manifest.hashed_files.find(r=>r.path===rel.schema);rec.bytes=schemaBytes.length;rec.sha256=digest(schemaBytes);rec.git_blob=blob(schemaBytes);recomputeCombined(manifest);return new Map([[rel.schema,schemaBytes],[rel.manifest,encode(manifest)]]);};
const mutateWorkflow=fn=>{const current=bytes(rel.workflow).toString('utf8');const changed=Buffer.from(fn(current));const manifest=json(rel.manifest);const rec=manifest.hashed_files.find(r=>r.path===rel.workflow);rec.bytes=changed.length;rec.sha256=digest(changed);rec.git_blob=blob(changed);recomputeCombined(manifest);return new Map([[rel.workflow,changed],[rel.manifest,encode(manifest)]]);};
const expectRefusal=(label,overrides)=>assert.throws(()=>validateProduct(ROOT,overrides),undefined,label);

function mutatePromoted(fn){return mutateJson(rel.matrix,fn);}
function mutateManifest(fn){return mutateJson(rel.manifest,m=>{fn(m);recomputeCombined(m);});}

test('deterministic builder reproduces all five derived files',()=>{
  const product=buildProduct(ROOT);
  for(const [name,built] of Object.entries(product))assert.deepEqual(bytes(`${C.ROOT}/${name}`),built,name);
});

test('exact product validates',()=>{
  const receipt=validateProduct(ROOT);
  assert.equal(receipt.state,'qualified_exact_north_dakota_row_state_reconciliation');
  assert.equal(receipt.terminal_cells,229);
  assert.equal(receipt.terminal_units,11);
  assert.equal(receipt.class_closed,false);
});

test('closed product contract rejects 47 adversarial mutations',()=>{
  const mutations=[
    ['predecessor matrix byte drift',new Map([[rel.predecessor,Buffer.concat([bytes(rel.predecessor),Buffer.from(' ')])]])],
    ['predecessor ND row state drift',mutateJson(rel.predecessor,m=>{m.rows.find(r=>r.unit_id==='US-STATE-ND').row_state='terminal_fixed_public_record_obligation_complete';})],
    ['predecessor substantive target drift',mutateJson(rel.predecessor,m=>{m.rows.find(r=>r.unit_id==='US-STATE-ND').cells.find(c=>c.field_id==='abawd_or_work_requirement_waiver_state_and_governing_period').state='evidence_complete';})],
    ['predecessor non-target row drift',mutateJson(rel.predecessor,m=>{m.rows.find(r=>r.unit_id==='US-STATE-AL').state_name='Alabama altered';})],
    ['input canonical parent drift',mutateJson(rel.input,o=>{o.canonical_parent='0'.repeat(40);})],
    ['input predecessor identity drift',mutateJson(rel.input,o=>{o.predecessor_matrix.sha256='0'.repeat(64);})],
    ['input prior artifact drift',mutateJson(rel.input,o=>{o.prior_candidate_validation.artifact_id=1;})],
    ['input authorizes substantive reapplication',mutateJson(rel.input,o=>{o.prior_candidate_validation.current_rebind.substantive_cell_reapplication_authorized=true;})],
    ['input terminal evidence omission',mutateJson(rel.input,o=>{o.terminal_evidence_cells.pop();})],
    ['input extra authority key',mutateJson(rel.input,o=>{o.authority_boundary.unreviewed='yes';})],
    ['decision current row drift',mutateJson(rel.decision,o=>{o.current_row_sha256='0'.repeat(64);})],
    ['decision proposed cell drift',mutateJson(rel.decision,o=>{o.proposed_row_state_cell.state='observed';})],
    ['decision proposed cell extra key',mutateJson(rel.decision,o=>{o.proposed_row_state_cell.unreviewed=true;})],
    ['decision value extra key',mutateJson(rel.decision,o=>{o.proposed_row_state_cell.value.unreviewed=true;})],
    ['decision prohibited inference removed',mutateJson(rel.decision,o=>{o.prohibited_inferences.pop();})],
    ['decision field terminalization widened',mutateJson(rel.decision,o=>{o.transition_effects.field_terminalizations=1;})],
    ['decision matrix update widened',mutateJson(rel.decision,o=>{o.transition_effects.matrix_updates=2;})],
    ['decision class closed',mutateJson(rel.decision,o=>{o.authority_boundary.class_closed=true;})],
    ['ledger second row mutation',mutateJson(rel.ledger,o=>{o.row_state_mutation_count=2;})],
    ['ledger substantive field mutation',mutateJson(rel.ledger,o=>{o.substantive_field_terminalization_count=1;})],
    ['ledger source request',mutateJson(rel.ledger,o=>{o.transition.source_requests=1;})],
    ['promoted matrix second row changed',mutatePromoted(m=>{m.rows.find(r=>r.unit_id==='US-STATE-AL').state_name='Alabama altered';})],
    ['promoted matrix ND substantive cell changed',mutatePromoted(m=>{m.rows.find(r=>r.unit_id==='US-STATE-ND').cells[0].value.state_name='North Dakota altered';})],
    ['promoted matrix row state reopened',mutatePromoted(m=>{m.rows.find(r=>r.unit_id==='US-STATE-ND').row_state='still_open';})],
    ['promoted matrix class closed',mutatePromoted(m=>{m.counts.class_closed=true;m.current_result.class_closed=true;})],
    ['promoted matrix substantive count changed',mutatePromoted(m=>{m.counts.terminal_substantive_cells=119;})],
    ['census open count drift',mutateJson(rel.census,o=>{o.open_cell_count=220;})],
    ['summary terminal units drift',mutateJson(rel.summary,o=>{o.counts.terminal_units=12;})],
    ['index substantive terminalization drift',mutateJson(rel.index,o=>{o.counts.substantive_field_terminalizations=1;})],
    ['manifest permanent path omitted',mutateManifest(m=>{m.permanent_paths.pop();m.permanent_path_count=13;})],
    ['manifest permanent path duplicated',mutateManifest(m=>{m.permanent_paths[13]=m.permanent_paths[12];})],
    ['manifest hashed file omitted',mutateManifest(m=>{m.hashed_files.pop();m.hashed_file_count=12;})],
    ['manifest hashed file duplicated',mutateManifest(m=>{m.hashed_files[12]=structuredClone(m.hashed_files[11]);})],
    ['manifest root extra key',mutateManifest(m=>{m.unreviewed=true;})],
    ['manifest authority extra key',mutateManifest(m=>{m.authority_boundary.unreviewed=true;})],
    ['workflow physical printf split with recomputed manifest',mutateWorkflow(text=>{
      const corrected=`          printf '%s\\n' "$EXPECTED" > "$OUT/product-paths.txt"`;
      const broken=`          printf '%s
' "$EXPECTED" > "$OUT/product-paths.txt"`;
      assert.equal(text.split(corrected).length,2);
      return text.replace(corrected,broken);
    })],
    ['workflow byte drift',new Map([[rel.workflow,Buffer.concat([bytes(rel.workflow),Buffer.from('\n# altered\n')])]])],
    ['schema candidate V1 regression',mutateSchema(s=>{s.$defs.rowStateDecision.properties.candidate_id.const='RD04-ND-EXACT-CURRENT-ROW-STATE-RECONCILIATION-CANDIDATE-V1';})],
    ['schema root version regression',mutateSchema(s=>{s.properties.schema_version.const='ssc-rd04-nd-row-state-reconciliation-schema@1';})],
    ['schema product parent regression',mutateSchema(s=>{s.properties.product_contract.properties.canonical_parent.const='789c800d00a6d4924cb69d2ce33d336ab315972f';})],
    ['schema input parent regression',mutateSchema(s=>{s.$defs.inputCustody.properties.canonical_parent.const='789c800d00a6d4924cb69d2ce33d336ab315972f';})],
    ['schema input parent tree regression',mutateSchema(s=>{s.$defs.inputCustody.properties.canonical_parent_tree.const='fef73cc4267070c8cc7fb7c1dc15481477391d62';})],
    ['schema promoted matrix regression',mutateSchema(s=>{s.properties.product_contract.properties.matrix_transition.properties.promoted_sha256.const='d2ff4b4d711417b2319b1c26486127c4eba1366aa0e11abf1fd489dcd2b2ffe6';})],
    ['schema manifest version regression',mutateSchema(s=>{s.$defs.productManifest.properties.schema_version.const='ssc-rd04-nd-row-state-reconciliation-manifest@1';})],
    ['schema observed evidence-state omission',mutateSchema(s=>{const counts=s.$defs.rowStateValue.properties.terminal_evidence_state_counts;counts.required=counts.required.filter(key=>key!=='observed');delete counts.properties.observed;})],
    ['schema byte drift',new Map([[rel.schema,Buffer.concat([bytes(rel.schema),Buffer.from(' ')])]])],
    ['validator byte drift',new Map([[rel.validator,Buffer.concat([bytes(rel.validator),Buffer.from('\n// altered\n')])]])],
  ];
  assert.equal(mutations.length,47);
  for(const [label,overrides] of mutations)expectRefusal(label,overrides);
  assert.deepEqual(EXPECTED_PERMANENT_PATHS.length,14);
  assert.deepEqual(EXPECTED_HASHED_PATHS.length,13);
});
