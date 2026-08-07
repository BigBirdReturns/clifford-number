import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const DATA = "data/intake/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol";
const PATHS = ["data/intake/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol/frontier-selection.json", "data/intake/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol/predecessor-custody.json", "data/intake/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol/official-locator-inventory.json", "data/intake/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol/route-query-contract.json", "data/intake/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol/route-discovery-protocol.json", "data/intake/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol/summary.json", "data/intake/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol/product-manifest.json", "docs/milestones/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol.md", "schemas/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol.schema.json", "test/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol.test.js", "tools/build-status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol.mjs", "tools/validate-status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol.mjs", "tools/acquisition/status-sovereignty-rd-wave03-rd04-next-frontier/plan-official-route-discovery.py"];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const unique = values => new Set(values).size === values.length;
const official = raw => {
  const host = new URL(raw).hostname.toLowerCase();
  return host.endsWith('.gov') || host.includes('.gov.') || host.endsWith('.us') || host === 'fns.usda.gov';
};
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');

export function loadObjects(root=process.cwd()) {
  const read = name => JSON.parse(fs.readFileSync(path.join(root, DATA, name), 'utf8'));
  return {
    selection: read('frontier-selection.json'), predecessor: read('predecessor-custody.json'),
    inventory: read('official-locator-inventory.json'), query: read('route-query-contract.json'),
    protocol: read('route-discovery-protocol.json'), summary: read('summary.json'),
  };
}

export function validateObjects(o) {
  const s=o.selection,p=o.predecessor,i=o.inventory,q=o.query,r=o.protocol,m=o.summary;
  assert(s.object_type==='frontier_selection','selection type');
  assert(s.canonical_rd04_merge==="a464dbbd96c365a7c040e17847486c5b3ba05c27",'canonical RD-04 merge');
  assert(s.state_denominator===50 && s.field_denominator_per_state===9,'matrix denominator');
  assert(s.terminal_cells_before===218 && s.open_cells_before===232,'cell denominator');
  assert(s.open_substantive_cells_before===192 && s.open_state_rows_before===40,'open denominator');
  assert(s.selected_state_count===s.selected_state_ids.length && s.selected_state_count>0,'selected state count');
  assert(unique(s.selected_state_ids) && unique(s.selected_field_ids),'selection uniqueness');
  assert(!s.selected_field_ids.includes('field_and_row_terminal_state'),'derivative exclusion');
  assert(s.selected_substantive_cell_count===s.selected_state_ids.length*s.selected_field_ids.length,'selected cell arithmetic');
  assert(s.derivative_row_state_cells_excluded===s.selected_state_ids.length,'derivative cell arithmetic');
  assert(s.class_closed===false && s.outside_human_dependency===false,'selection authority');
  assert(p.canonical_merge===s.canonical_rd04_merge && p.live_main_parent===s.live_main_parent,'predecessor binding');
  assert(p.rd04_successor_overlap_count===0,'successor overlap');
  assert(p.terminal_cells===218 && p.open_cells===232 && p.open_substantive_cells===192,'predecessor counts');
  assert(i.selected_state_ids.join('\0')===s.selected_state_ids.join('\0'),'inventory states');
  assert(i.selected_field_ids.join('\0')===s.selected_field_ids.join('\0'),'inventory fields');
  for (const state of s.selected_state_ids) {
    assert(Array.isArray(i.state_official_roots[state]) && i.state_official_roots[state].length>0 && i.state_official_roots[state].length<=2,'official roots');
    for (const root of i.state_official_roots[state]) assert(official(root),'nonofficial root');
    for (const field of s.selected_field_ids) {
      const cell=i.coverage[state][field]; assert(cell,'missing inventory cell');
      for (const url of [...cell.official_repository_urls,...cell.uncaptured_repository_urls]) assert(official(url),'nonofficial candidate URL');
    }
  }
  assert(q.maximum_official_roots_per_state===2 && q.maximum_discovery_requests_per_root===3,'request bounds');
  assert(q.maximum_candidate_urls_per_cell===12 && q.maximum_attempts_per_request===1,'candidate bounds');
  assert(q.result_spawned_source_fetches===0 && q.cross_host_redirects_allowed===false,'discovery boundaries');
  assert(q.automatic_source_admission===false && q.automatic_field_classification===false && q.outside_human_dependency===false,'query authority');
  assert(r.obligation_count===s.selected_substantive_cell_count && r.obligations.length===r.obligation_count,'obligation denominator');
  const expected=new Set(s.selected_state_ids.flatMap(state=>s.selected_field_ids.map(field=>`${state}\0${field}`)));
  const actual=new Set();
  for (const obligation of r.obligations) {
    const key=`${obligation.state_id}\0${obligation.field_id}`; assert(expected.has(key),'out-of-scope obligation'); assert(!actual.has(key),'duplicate obligation'); actual.add(key);
    assert(['fixed_repository_routes','bounded_official_route_discovery'].includes(obligation.mode),'obligation mode');
    assert(obligation.maximum_candidate_urls===12 && obligation.maximum_discovery_requests<=6,'obligation bounds');
    assert(obligation.automatic_source_admission===false && obligation.automatic_field_classification===false && obligation.terminalizes_field===false,'obligation authority');
    for (const url of obligation.official_roots) assert(official(url),'obligation root host');
    for (const url of obligation.repository_candidate_urls) assert(official(url),'obligation candidate host');
    if (obligation.mode==='fixed_repository_routes') assert(obligation.repository_candidate_urls.length>=2,'fixed route denominator');
  }
  assert(actual.size===expected.size,'obligation cross product');
  assert(r.source_requests_executed===0 && r.source_admissions===0 && r.field_mutations===0 && r.row_state_mutations===0,'protocol effects');
  assert(r.class_closed===false && r.cumulative_ledger_effect==='none' && r.outside_human_dependency===false,'protocol class authority');
  assert(r.publication_effect==='none' && r.adoption_effect==='none' && r.graph_effect==='none','protocol external effects');
  assert(m.protocol_obligations===r.obligation_count && m.selected_substantive_cell_count===s.selected_substantive_cell_count,'summary arithmetic');
  assert(m.source_requests_executed===0 && m.field_mutations===0 && m.class_closed===false && m.outside_human_dependency===false,'summary authority');
  return true;
}

export function validateProduct(root=process.cwd()) {
  const objects=loadObjects(root); validateObjects(objects);
  const manifest=JSON.parse(fs.readFileSync(path.join(root,DATA,'product-manifest.json'),'utf8'));
  assert(manifest.object_type==='product_manifest','manifest type');
  assert(manifest.permanent_path_count===PATHS.length,'manifest path count');
  assert(manifest.entries.length===PATHS.length-1,'manifest self exclusion');
  for (const entry of manifest.entries) {
    const data=fs.readFileSync(path.join(root,entry.path));
    assert(data.length===entry.bytes,`byte drift ${entry.path}`);
    assert(sha256(data)===entry.sha256,`hash drift ${entry.path}`);
  }
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  validateProduct();
  const s=loadObjects().summary;
  console.log(`rd04_next_frontier_protocol_validation=pass states=${s.selected_state_count} cells=${s.selected_substantive_cell_count} obligations=${s.protocol_obligations}`);
}
