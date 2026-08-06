#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,DATA_REL,DATA_DIR,TARGET_STATES,TARGET_FIELDS,PREDECESSOR,loadAuth,validateAuth,buildProducts,validateProducts,checkProducts,sha256,gitBlobSha} from './build-status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-minimum-frontier-protocol.mjs';
const must=(c,m)=>{if(!c)throw new Error(m);};
const permanentPaths=[
  '.github/workflows/status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-minimum-frontier-protocol.yml',
  `${DATA_REL}/authored-protocol.json`,`${DATA_REL}/route-ledger.json`,`${DATA_REL}/target-cell-ledger.json`,`${DATA_REL}/source-interpretation-constraints.json`,`${DATA_REL}/execution-receipt-template.json`,`${DATA_REL}/index.json`,`${DATA_REL}/product-manifest.json`,
  'docs/milestones/ssc-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-minimum-frontier-protocol.md',
  'schemas/status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-minimum-frontier-protocol.schema.json',
  'test/status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-minimum-frontier-protocol.test.js',
  'tools/build-status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-minimum-frontier-protocol.mjs',
  'tools/validate-status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-minimum-frontier-protocol.mjs',
  'tools/acquisition/status-sovereignty-rd-wave03-rd04/run-ar-ga-md-nc-pa-ri-wv-minimum-frontier-protocol.py',
];
const a=loadAuth();validateAuth(a);const products=buildProducts(a);validateProducts(products);checkProducts(products);
must(permanentPaths.length===14&&new Set(permanentPaths).size===14,'exact 14 paths');
for(const rel of permanentPaths){must(fs.existsSync(path.join(ROOT,rel)),`${rel}: missing`);must(!/(^|\/)(tmp|transport|carrier|materializer|trigger|archive|chunk|shard)(\/|$)/.test(rel),`${rel}: transport`);}
const schema=JSON.parse(fs.readFileSync(path.join(ROOT,'schemas/status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-minimum-frontier-protocol.schema.json'),'utf8'));
must(schema.$schema==='https://json-schema.org/draft/2020-12/schema'&&schema.oneOf.length===7,'closed 7-object schema family');
must(new Set(schema.oneOf.map(x=>x.properties.schema_version.const)).size===7,'schema versions');for(const branch of schema.oneOf)must(branch.type==='object'&&branch.additionalProperties===false,'closed schema');
const manifest=products['product-manifest.json'];must(manifest.entries.length===6,'manifest entries');for(const entry of manifest.entries){const b=fs.readFileSync(path.join(DATA_DIR,entry.path));must(b.length===entry.bytes&&sha256(b)===entry.sha256,`${entry.path}: manifest`);}
function readBound(rel,expectedBlob){const b=fs.readFileSync(path.join(ROOT,rel));must(gitBlobSha(b)===expectedBlob,`${rel}: Git blob identity`);return JSON.parse(b);}
const predecessorSummary=readBound(PREDECESSOR.summary_path,PREDECESSOR.summary_blob_sha);
const predecessorIndex=readBound(PREDECESSOR.index_path,PREDECESSOR.index_blob_sha);
const census=readBound(PREDECESSOR.census_path,PREDECESSOR.census_blob_sha);
must(predecessorSummary.transition.terminal_cells_after===190&&predecessorSummary.transition.still_open_cells_after===260&&predecessorSummary.transition.terminal_substantive_cells_after===87&&predecessorSummary.transition.still_open_substantive_cells_after===213&&predecessorSummary.transition.terminal_units_after===3&&predecessorSummary.transition.open_units_after===47,'summary arithmetic');
must(JSON.stringify(predecessorSummary.transition.target_rows)===JSON.stringify(['CA','SD','WA'])&&!predecessorSummary.class_closed&&predecessorSummary.cumulative_ledger_effect==='none','summary authority');
must(predecessorIndex.counts.terminal_cells_after===190&&predecessorIndex.counts.still_open_substantive_cells_after===213&&predecessorIndex.counts.open_units_after===47&&!predecessorIndex.counts.class_closed,'index arithmetic');
must(predecessorIndex.current_result.class_state==='still_open'&&!predecessorIndex.current_result.class_closed&&predecessorIndex.current_result.cumulative_ledger_effect==='none'&&!predecessorIndex.current_result.outside_human_dependency,'index authority');
must(census.counts.units===50&&census.counts.required_cells===450&&census.counts.terminal_cells===190&&census.counts.still_open_cells===260&&census.counts.substantive_cells===300&&census.counts.terminal_substantive_cells===87&&census.counts.still_open_substantive_cells===213&&census.counts.terminal_units===3&&census.counts.open_units===47&&!census.counts.class_closed,'census arithmetic');
const selected=census.open_cells.filter(c=>TARGET_STATES.includes(c.postal_code));must(selected.length===28,'selected seven-state open-cell denominator');
for(const state of TARGET_STATES){const rows=selected.filter(c=>c.postal_code===state);must(rows.length===4,`${state}: four open cells`);const fields=rows.map(c=>c.field_id).sort();must(JSON.stringify(fields)===JSON.stringify([...TARGET_FIELDS,'field_and_row_terminal_state'].sort()),`${state}: exact minimum frontier`);}
const targetLedger=products['target-cell-ledger.json'];for(const cell of targetLedger.target_cells){const matches=selected.filter(c=>c.postal_code===cell.postal_code&&c.field_id===cell.field_id);must(matches.length===1,`${cell.target_cell_id}: predecessor census binding`);must(matches[0].typed_gap===cell.current_typed_gap&&matches[0].authority_effect==='none',`${cell.target_cell_id}: typed gap`);}
const routeLedger=products['route-ledger.json'];must(routeLedger.counts.fixed_routes===30&&routeLedger.counts.federal_interpretive_routes===2&&routeLedger.counts.state_specific_routes===28,'route ledger');for(const state of TARGET_STATES)must(routeLedger.counts.state_scope_counts[state]===4,`${state}: route distribution`);
const index=products['index.json'];must(index.counts.target_states===7&&index.counts.target_cells===21&&index.counts.still_open_substantive_cells_before_protocol===213,'index counts');must(!index.current_result.field_matrix_changed&&!index.current_result.row_state_changed&&!index.current_result.class_closed&&index.current_result.cumulative_ledger_effect==='none'&&!index.current_result.outside_human_dependency,'product authority');
console.log('rd04_mf7_minimum_frontier_validation=pass');console.log('permanent_paths=14');console.log('fixed_routes=30');console.log('federal_interpretive_routes=2');console.log('state_specific_routes=28');console.log('target_states=7');console.log('target_cells=21');console.log('predecessor_terminal_cells=190/450');console.log('predecessor_still_open_substantive_cells=213');console.log('class_closed=false');console.log('outside_human_dependency=false');
