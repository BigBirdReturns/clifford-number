import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DATA = "data/intake/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol";
const read = name => JSON.parse(fs.readFileSync(path.join(ROOT, DATA, name), 'utf8'));
const stable = value => JSON.stringify(value, null, 2) + '\n';

export function buildObjects() {
  const selection = read('frontier-selection.json');
  const predecessor = read('predecessor-custody.json');
  const inventory = read('official-locator-inventory.json');
  const query = read('route-query-contract.json');
  const obligations = [];
  let fixedRouteCells = 0;
  let discoveryCells = 0;
  for (const stateId of selection.selected_state_ids) {
    for (const fieldId of selection.selected_field_ids) {
      const cell = inventory.coverage[stateId][fieldId];
      const exact = [...new Set(cell.uncaptured_repository_urls)].sort().slice(0, query.maximum_candidate_urls_per_cell);
      const mode = exact.length >= 2 ? 'fixed_repository_routes' : 'bounded_official_route_discovery';
      if (mode === 'fixed_repository_routes') fixedRouteCells += 1; else discoveryCells += 1;
      obligations.push({
        obligation_id: `rd04-route-${stateId.slice(-2).toLowerCase()}-${fieldId}`,
        state_id: stateId,
        field_id: fieldId,
        mode,
        official_roots: inventory.state_official_roots[stateId],
        repository_candidate_urls: exact,
        query_terms: query.field_query_terms[fieldId],
        maximum_candidate_urls: query.maximum_candidate_urls_per_cell,
        maximum_discovery_requests: query.maximum_official_roots_per_state * query.maximum_discovery_requests_per_root,
        automatic_source_admission: false,
        automatic_field_classification: false,
        terminalizes_field: false,
      });
    }
  }
  const protocol = {
    object_type: 'route_discovery_protocol',
    schema_version: 'ssc-rd04-next-frontier-route-discovery-protocol@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-04', class_id: 'RD-04-C02', issue: 1017,
    selected_state_ids: selection.selected_state_ids,
    selected_field_ids: selection.selected_field_ids,
    selected_substantive_cell_count: selection.selected_substantive_cell_count,
    obligations,
    obligation_count: obligations.length,
    fixed_repository_route_cells: fixedRouteCells,
    bounded_official_route_discovery_cells: discoveryCells,
    maximum_total_discovery_requests: obligations.reduce((sum, item) => sum + item.maximum_discovery_requests, 0),
    maximum_total_candidate_urls: obligations.reduce((sum, item) => sum + item.maximum_candidate_urls, 0),
    source_requests_executed: 0,
    source_admissions: 0,
    field_mutations: 0,
    row_state_mutations: 0,
    class_closed: false,
    cumulative_ledger_effect: 'none',
    outside_human_dependency: false,
    publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none',
  };
  const summary = {
    object_type: 'summary',
    schema_version: 'ssc-rd04-next-frontier-route-discovery-protocol@1',
    canonical_rd04_merge: selection.canonical_rd04_merge,
    live_main_parent: selection.live_main_parent,
    selected_state_count: selection.selected_state_count,
    selected_field_count: selection.selected_field_ids.length,
    selected_substantive_cell_count: selection.selected_substantive_cell_count,
    derivative_row_state_cells_excluded: selection.derivative_row_state_cells_excluded,
    protocol_obligations: protocol.obligation_count,
    fixed_repository_route_cells: fixedRouteCells,
    bounded_official_route_discovery_cells: discoveryCells,
    source_requests_executed: 0,
    source_admissions: 0,
    field_mutations: 0,
    row_state_mutations: 0,
    terminal_cells_before: predecessor.terminal_cells,
    open_substantive_cells_before: predecessor.open_substantive_cells,
    class_closed: false,
    outside_human_dependency: false,
    cumulative_ledger_effect: 'none', publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none',
  };
  return {protocol, summary};
}

export function writeObjects() {
  const {protocol, summary} = buildObjects();
  fs.writeFileSync(path.join(ROOT, DATA, 'route-discovery-protocol.json'), stable(protocol));
  fs.writeFileSync(path.join(ROOT, DATA, 'summary.json'), stable(summary));
}

export function checkObjects() {
  const {protocol, summary} = buildObjects();
  for (const [name, value] of [['route-discovery-protocol.json', protocol], ['summary.json', summary]]) {
    const actual = fs.readFileSync(path.join(ROOT, DATA, name), 'utf8');
    const expected = stable(value);
    if (actual !== expected) throw new Error(`${name} is not deterministic`);
  }
}

const mode = process.argv[2] || '--check';
if (mode === '--write') writeObjects();
else if (mode === '--check') checkObjects();
else throw new Error(`unknown mode: ${mode}`);
console.log(`rd04_next_frontier_protocol_build=${mode === '--write' ? 'written' : 'clean'}`);
