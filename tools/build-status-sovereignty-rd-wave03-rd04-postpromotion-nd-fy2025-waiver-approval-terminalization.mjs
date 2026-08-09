import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROOT = process.env.RD04_ROOT ? path.resolve(process.env.RD04_ROOT) : process.cwd();
export const SLUG = 'status-sovereignty-rd-wave03-rd04-postpromotion-nd-fy2025-waiver-approval-terminalization';
export const OUTPUT_DIR = `data/intake/${SLUG}`;
export const SCHEMA_PATH = `schemas/${SLUG}.schema.json`;
export const MANIFEST_PATH = `${OUTPUT_DIR}/product-manifest.json`;
export const CANONICAL_PARENT = 'a592acea22c69a979f2a90c24a2bafb8c9445759';
export const CANONICAL_TREE = 'c7dbb1df10b409caa7893846a9e4b3e8d1392be0';
export const PREDECESSOR = Object.freeze({
  path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion/promoted-partial-field-matrix.json',
  bytes:485610,
  sha256:'663f93d84f168bf6ccdd92eaee0deb47b109f4280e7b25613853c2c1a6be2b63',
  gitBlob:'19357f8214ab2710bc5e75b3fae8c7fb09ff1654',
});
export const TARGET = Object.freeze({
  unitId:'US-STATE-ND', postalCode:'ND', stateName:'North Dakota',
  fieldId:'abawd_or_work_requirement_waiver_state_and_governing_period',
  rowFieldId:'field_and_row_terminal_state',
  beforeFieldSha256:'cbaabfa791f02aa4f17bc1b5b31e28775368b125a4b658cb216c22cd90a26dfe',
  beforeRowSha256:'6a4c7d204c6c99a89f3c121065860806668c5da850f44c67fe42b4dc84b1b5c3',
  beforeWholeRowSha256:'18f9b127b61e45edafb64c78bc8c387175fffdb351156ccf9154158ca467d2dd',
});
export const EVIDENCE = Object.freeze({
  routeId:'RD04-ND-CURRENT-WAIVER-FY2025-FNA-RESPONSE-001',
  requestedUrl:'https://fns-prod.azureedge.us/sites/default/files/resource-files/nd-abawd-response-fy2025.pdf',
  canonicalIndexUrl:'https://fns-prod.azureedge.us/snap/waivers/timelimit/2025-2029',
  canonicalIndexPageUpdated:'2026-07-22',
  contentType:'application/pdf', httpStatus:200, redirectsFollowed:0, physicalRequests:1,
  bodyBytes:306585,
  bodySha256:'dc8f7a9e03c79ce52e39a28dfee4d36b9afe768181c15ec02c44b9ccb27f3428',
  pageCount:5, pageSizePoints:[612,792], renderDpi:180, renderPixels:[1530,1980],
  renderSha256:[
    '701c470693b9dbf99ad588fde94c25d1545eff2750e06b7f730a391ee18dea71',
    '5e303d071358948c51af7dd952fefb3ebdf578a9aee876274e39e4064a221b96',
    'fd035d4c281f7122709d45eeba517ebb92e7d0a755045768bb43ce679ef1c1de',
    '7f854ae74dbbe1f277d9125ad52a5edacfe2de43150267fd85a99f5c98f9aa4e',
    'b8cf30e8a1ba067bc78021f920b491deb417df8f06afe6c1fdbc856344a88417',
  ],
  renderBytes:[395680,110283,364964,368320,138091],
  layoutTextBytes:10371, layoutTextSha256:'17e5fd01a44e968df49e118df3f2e3fa0d6be1402fa4389568492b536654e41b',
  flowTextBytes:7602, flowTextSha256:'de7a821fb9522e8e2f900cbf5b3e85cbd410cbf1c105aa5709a98ff0833a42b4',
  pdfinfoBytes:671, pdfinfoSha256:'2d679ad44b19ba49c587ff2541b12eb933ff8a785fe1d12666abe01699525e0c',
  documentTitle:'Supplemental Nutrition Assistance Program (SNAP) – North Dakota Request to Waive Able-Bodied Adults Without Dependents Time Limit – Initial – Partial Approval',
  letterDate:'2025-06-18', requestDate:'2025-06-04', requestType:'initial', action:'partial_approval',
  implementationDate:'2025-07-01', expirationDate:'2026-06-30',
  approvedAreas:['Rolette County','Turtle Mountain Reservation and Off-Reservation Trust Land'],
  deniedAreas:['Bottineau County','Towner County'],
  authority:'section 6(o) of the Food and Nutrition Act of 2008 and 7 CFR 273.24(f)',
});
export const OUTPUT_NAMES = Object.freeze([
  'terminalization-input-custody.json','terminalization-decisions.json','cell-transition-ledger.json',
  'promoted-partial-field-matrix.json','remaining-open-field-census.json','terminalization-summary.json','index.json','product-manifest.json',
]);
export const PERMANENT_PATHS = Object.freeze([
  `.github/workflows/${SLUG}.yml`,
  ...OUTPUT_NAMES.map(name=>`${OUTPUT_DIR}/${name}`),
  'docs/milestones/ssc-rd-wave03-rd04-postpromotion-nd-fy2025-waiver-approval-terminalization.md',
  SCHEMA_PATH,
  `test/${SLUG}.test.js`,
  `tools/build-${SLUG}.mjs`,
  `tools/validate-${SLUG}.mjs`,
]);
export const AUTHORITY = Object.freeze({
  reviewed_disposition_effect:'none', publication_effect:'none', adoption_effect:'none', graph_effect:'none',
  prevalence_effect:'none', discrimination_effect:'none', coordination_effect:'none', common_purpose_effect:'none',
  racial_order_effect:'none', complete_compact_effect:'none', cumulative_ledger_effect:'none', outside_human_dependency:false,
});
export const PROHIBITED = Object.freeze([
  'do_not_extend_the_approval_beyond_2026_06_30_without_a_later_exact_instrument',
  'do_not_treat_partial_approval_as_statewide_waiver_authority',
  'do_not_treat_denied_bottineau_or_towner_counties_as_approved',
  'do_not_infer_uniform_frontline_practice',
  'do_not_infer_person_level_outcome',
  'do_not_infer_national_prevalence',
  'do_not_infer_discrimination_or_racial_order',
  'do_not_infer_coordination_or_common_purpose',
  'do_not_infer_complete_compact',
  'do_not_close_rd04_c02',
]);

export function sha256Bytes(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
export function gitBlob(bytes){return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');}
export function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;}
export function canonicalSha(value){return sha256Bytes(Buffer.from(JSON.stringify(stable(value))));}
export function assert(condition,message){if(!condition)throw new Error(message);}
export function equal(actual,expected,message){assert(JSON.stringify(actual)===JSON.stringify(expected),`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);}
function readBoundJson(spec){const bytes=fs.readFileSync(path.join(ROOT,spec.path));assert(bytes.length===spec.bytes,`input byte count differs: ${spec.path}`);assert(sha256Bytes(bytes)===spec.sha256,`input sha256 differs: ${spec.path}`);assert(gitBlob(bytes)===spec.gitBlob,`input git blob differs: ${spec.path}`);return JSON.parse(bytes.toString('utf8'));}
function writeJson(relative,value){const target=path.join(ROOT,relative);fs.mkdirSync(path.dirname(target),{recursive:true});const text=`${JSON.stringify(value,null,2)}\n`;fs.writeFileSync(target,text);return {path:relative,bytes:Buffer.byteLength(text),sha256:sha256Bytes(Buffer.from(text)),git_blob:gitBlob(Buffer.from(text))};}
function findRow(matrix,unitId){const row=matrix.rows.find(r=>r.unit_id===unitId);assert(row,`row missing: ${unitId}`);return row;}
function findCell(row,fieldId){const cell=row.cells.find(c=>c.field_id===fieldId);assert(cell,`cell missing: ${row.unit_id}:${fieldId}`);return cell;}
function primitiveSchema(value){if(value===null)return {type:'null'};if(typeof value==='boolean')return {type:'boolean'};if(typeof value==='number')return Number.isInteger(value)?{type:'integer'}:{type:'number'};if(typeof value==='string'){if(/^[0-9a-f]{64}$/.test(value))return {type:'string',pattern:'^[0-9a-f]{64}$'};if(/^[0-9a-f]{40}$/.test(value))return {type:'string',pattern:'^[0-9a-f]{40}$'};return {type:'string'};}throw new Error(`unsupported primitive: ${typeof value}`);}
function shapeSchema(value){if(Array.isArray(value)){if(value.length===0)return {type:'array',maxItems:0};const schemas=value.map(shapeSchema);const first=JSON.stringify(schemas[0]);if(schemas.every(s=>JSON.stringify(s)===first))return {type:'array',minItems:value.length,maxItems:value.length,items:schemas[0]};return {type:'array',minItems:value.length,maxItems:value.length,prefixItems:schemas,items:false};}if(value&&typeof value==='object'){const keys=Object.keys(value);return {type:'object',required:keys,properties:Object.fromEntries(keys.map(k=>[k,shapeSchema(value[k])])),additionalProperties:false};}return primitiveSchema(value);}
function buildClosedSchema(objects){const variants=Object.values(objects).map(object=>{const schema=shapeSchema(object);schema.properties.schema_version={const:object.schema_version};return schema;});return {$schema:'https://json-schema.org/draft/2020-12/schema',$id:`https://bigbirdreturns.github.io/clifford-number/schemas/${SLUG}.schema.json`,title:'RD-04 North Dakota FY2025 waiver approval terminalization product',oneOf:variants};}
function loadEvidence(){
  const checks=[
    ['source.pdf',EVIDENCE.bodyBytes,EVIDENCE.bodySha256],
    ...EVIDENCE.renderSha256.map((sha,i)=>[`page-${i+1}.png`,EVIDENCE.renderBytes[i],sha]),
    ['source-layout.txt',EVIDENCE.layoutTextBytes,EVIDENCE.layoutTextSha256],
    ['source-flow.txt',EVIDENCE.flowTextBytes,EVIDENCE.flowTextSha256],
    ['pdfinfo.txt',EVIDENCE.pdfinfoBytes,EVIDENCE.pdfinfoSha256],
  ];
  const fixture=process.env.RD04_EVIDENCE_DIR?path.resolve(process.env.RD04_EVIDENCE_DIR):null;
  if(fixture){for(const [name,bytesExpected,sha] of checks){const bytes=fs.readFileSync(path.join(fixture,name));assert(bytes.length===bytesExpected,`evidence fixture bytes differ: ${name}`);assert(sha256Bytes(bytes)===sha,`evidence fixture digest differs: ${name}`);}return {pdf:fs.readFileSync(path.join(fixture,'source.pdf')),verification:{construction_fixture_verified:true,verified_files:checks.length,replay_source:'embedded_pdf'}};}
  const existing=path.join(ROOT,OUTPUT_DIR,'terminalization-input-custody.json');
  assert(fs.existsSync(existing),'RD04_EVIDENCE_DIR is required for first construction');
  const custody=JSON.parse(fs.readFileSync(existing,'utf8'));
  const pdf=Buffer.from(custody.source_custody.embedded_pdf.data_base64,'base64');
  assert(pdf.length===EVIDENCE.bodyBytes&&sha256Bytes(pdf)===EVIDENCE.bodySha256,'embedded source PDF differs');
  return {pdf,verification:{construction_fixture_verified:true,verified_files:checks.length,replay_source:'embedded_pdf'}};
}
function recalcMatrix(matrix) {
  const cells = matrix.rows.flatMap((row) => row.cells);
  const substantive = cells.filter((cell) => cell.field_ordinal >= 2 && cell.field_ordinal <= 7);
  const rowState = cells.filter((cell) => cell.field_id === 'field_and_row_terminal_state');
  const terminalUnits = matrix.rows
    .filter((row) => findCell(row, 'field_and_row_terminal_state').terminal)
    .map((row) => row.unit_id);

  Object.assign(matrix.counts, {
    units: matrix.rows.length,
    required_fields_per_unit: matrix.field_order.length,
    materialized_cells: cells.length,
    evidence_complete_cells: cells.filter((cell) => cell.state === 'evidence_complete').length,
    observed_cells: cells.filter((cell) => cell.state === 'observed').length,
    not_publicly_recovered_cells: cells.filter((cell) => cell.state === 'not_publicly_recovered').length,
    still_open_cells: cells.filter((cell) => !cell.terminal).length,
    terminal_cells: cells.filter((cell) => cell.terminal).length,
    terminal_substantive_cells: substantive.filter((cell) => cell.terminal).length,
    still_open_substantive_cells: substantive.filter((cell) => !cell.terminal).length,
    row_terminal_state_cells_terminal: rowState.filter((cell) => cell.terminal).length,
    row_terminal_state_cells_open: rowState.filter((cell) => !cell.terminal).length,
    terminal_units: terminalUnits.length,
    class_closed: false,
    postpromotion_nd_fy2025_waiver_approval_field_terminalizations: 1,
    postpromotion_nd_fy2025_waiver_approval_row_terminalizations: 0,
  });

  Object.assign(matrix.current_result, {
    terminal_cells: `${matrix.counts.terminal_cells}/450`,
    still_open_cells: `${matrix.counts.still_open_cells}/450`,
    terminal_substantive_cells: matrix.counts.terminal_substantive_cells,
    still_open_substantive_cells: matrix.counts.still_open_substantive_cells,
    row_terminal_state_cells_terminal: matrix.counts.row_terminal_state_cells_terminal,
    row_terminal_state_cells_open: matrix.counts.row_terminal_state_cells_open,
    terminal_units: terminalUnits.length,
    terminal_unit_ids: terminalUnits,
    field_matrix_terminal: false,
    class_state: 'still_open',
    class_closed: false,
    outside_human_dependency: false,
    reviewed_disposition_effect: 'none',
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    prevalence_effect: 'none',
    discrimination_effect: 'none',
    coordination_effect: 'none',
    common_purpose_effect: 'none',
    racial_order_effect: 'none',
    complete_compact_effect: 'none',
  });
}

function buildCensus(matrix) {
  const substantiveIds = matrix.field_order.filter((_, index) => index >= 1 && index <= 6);
  const ids = [...substantiveIds, 'field_and_row_terminal_state'];
  return {
    schema_version: 'ssc-rd04-wave03-postpromotion-nd-fy2025-waiver-approval-remaining-open-field-census@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    matrix_path: 'promoted-partial-field-matrix.json',
    counts: {
      states: 50,
      materialized_cells: matrix.counts.materialized_cells,
      terminal_cells: matrix.counts.terminal_cells,
      still_open_cells: matrix.counts.still_open_cells,
      substantive_fields_total: 300,
      substantive_fields_terminal: matrix.counts.terminal_substantive_cells,
      substantive_fields_still_open: matrix.counts.still_open_substantive_cells,
      row_terminal_state_cells_still_open: matrix.counts.row_terminal_state_cells_open,
      terminal_units: matrix.counts.terminal_units,
      class_closed: false,
    },
    field_census: ids.map((fieldId) => {
      const cells = matrix.rows.map((row) => findCell(row, fieldId));
      return {
        field_ordinal: cells[0].field_ordinal,
        field_id: fieldId,
        still_open_cells: cells.filter((cell) => !cell.terminal).length,
        evidence_complete_cells: cells.filter((cell) => cell.state === 'evidence_complete').length,
        observed_cells: cells.filter((cell) => cell.state === 'observed').length,
        not_publicly_recovered_cells: cells.filter((cell) => cell.state === 'not_publicly_recovered').length,
      };
    }),
    state_rows: matrix.rows.map((row) => ({
      unit_ordinal: row.unit_ordinal,
      unit_id: row.unit_id,
      postal_code: row.postal_code,
      state_name: row.state_name,
      terminal_fields: row.terminal_fields,
      open_fields: row.open_fields,
      still_open_field_ids: row.cells.filter((cell) => !cell.terminal).map((cell) => cell.field_id),
      row_state: row.row_state,
    })),
    authority_boundary: {
      matrix_updates: 1,
      field_terminalizations: 1,
      row_terminalizations: 0,
      row_state_mutations: 0,
      class_closed: false,
      ...AUTHORITY,
    },
  };
}

function manifestRows() {
  return PERMANENT_PATHS
    .filter((relative) => relative !== MANIFEST_PATH)
    .map((relative) => {
      const bytes = fs.readFileSync(path.join(ROOT, relative));
      return {
        path: relative,
        bytes: bytes.length,
        sha256: sha256Bytes(bytes),
        git_blob: gitBlob(bytes),
      };
    });
}

function provisionalManifest() {
  return {
    schema_version: 'ssc-rd04-wave03-postpromotion-nd-fy2025-waiver-approval-terminalization-manifest@1',
    permanent_path_count: 14,
    hashed_file_count: 13,
    permanent_paths: [...PERMANENT_PATHS],
    hashed_files: PERMANENT_PATHS
      .filter((relative) => relative !== MANIFEST_PATH)
      .map((relative) => ({
        path: relative,
        bytes: 0,
        sha256: '0'.repeat(64),
        git_blob: '0'.repeat(40),
      })),
    combined_sha256: '0'.repeat(64),
    authority_boundary: {
      source_requests: 0,
      new_source_admissions: 1,
      matrix_updates: 1,
      field_terminalizations: 1,
      row_terminalizations: 0,
      row_state_mutations: 0,
      class_closed: false,
      ...AUTHORITY,
    },
  };
}

export function buildProduct() {
  const evidence = loadEvidence();
  const predecessor = readBoundJson(PREDECESSOR);
  assert(predecessor.counts.materialized_cells === 450, 'predecessor materialized denominator differs');
  assert(predecessor.counts.terminal_cells === 227 && predecessor.counts.still_open_cells === 223, 'predecessor terminal denominator differs');
  assert(predecessor.counts.terminal_substantive_cells === 117 && predecessor.counts.still_open_substantive_cells === 183, 'predecessor substantive denominator differs');
  assert(predecessor.counts.terminal_units === 10 && predecessor.current_result.class_closed === false, 'predecessor row/class denominator differs');

  const matrix = structuredClone(predecessor);
  matrix.schema_version = 'ssc-rd04-wave03-postpromotion-nd-fy2025-waiver-approval-promoted-partial-field-matrix@1';
  const row = findRow(matrix, TARGET.unitId);
  const beforeWholeRow = structuredClone(row);
  const before = structuredClone(findCell(row, TARGET.fieldId));
  const rowStateBefore = structuredClone(findCell(row, TARGET.rowFieldId));
  assert(row.row_state === 'still_open' && row.terminal_fields === 7 && row.open_fields === 2, 'North Dakota predecessor row differs');
  assert(before.state === 'still_open' && !before.terminal && canonicalSha(before) === TARGET.beforeFieldSha256, 'North Dakota waiver cell differs');
  assert(rowStateBefore.state === 'still_open' && !rowStateBefore.terminal && canonicalSha(rowStateBefore) === TARGET.beforeRowSha256, 'North Dakota row-state cell differs');
  assert(canonicalSha(beforeWholeRow) === TARGET.beforeWholeRowSha256, 'North Dakota predecessor row hash differs');

  const pageReview = {
    review_id: 'RD04-ND-FY2025-WAIVER-RESPONSE-PAGE-COMPLETE-REVIEW-V1',
    review_type: 'request_free_page_complete_pdf_review',
    source_body_sha256: EVIDENCE.bodySha256,
    page_count: EVIDENCE.pageCount,
    pages_reviewed: [1, 2, 3, 4, 5],
    all_pages_reviewed: true,
    render: {
      dpi: EVIDENCE.renderDpi,
      pixels: EVIDENCE.renderPixels,
      pages: EVIDENCE.renderSha256.map((sha256, index) => ({page: index + 1, sha256})),
    },
    text_derivations: {
      layout_sha256: EVIDENCE.layoutTextSha256,
      flow_sha256: EVIDENCE.flowTextSha256,
    },
    observations: [
      {observation_code: 'north_dakota_request_date', page: 1, value: EVIDENCE.requestDate},
      {observation_code: 'federal_action_partial_approval', page: 1, value: true},
      {observation_code: 'approved_rolette_county', page: 1, value: true},
      {observation_code: 'approved_turtle_mountain_reservation_and_off_reservation_trust_land', page: 1, value: true},
      {observation_code: 'denied_bottineau_county', page: 1, value: true},
      {observation_code: 'denied_towner_county', page: 1, value: true},
      {observation_code: 'requested_period', page: 3, value: {start: EVIDENCE.implementationDate, end: EVIDENCE.expirationDate}},
      {observation_code: 'authority', page: 4, value: EVIDENCE.authority},
      {observation_code: 'implementation_date', page: 4, value: EVIDENCE.implementationDate},
      {observation_code: 'expiration_date', page: 4, value: EVIDENCE.expirationDate},
    ],
    anchors: [
      {page: 1, text: 'Initial – Partial Approval'},
      {page: 1, text: 'approving DHHS’ request to waive the time limit in Rolette County and Turtle Mountain Reservation and Off-Reservation Trust Land'},
      {page: 3, text: 'from July 1, 2025, to June 30, 2026'},
      {page: 4, text: '11. Implementation Date: July 1, 2025'},
      {page: 4, text: '12. Expiration Date: June 30, 2026'},
    ],
    review_outcome: 'exact_partial_approval_geography_and_governing_period_recovered',
  };

  const boundedFinding = {
    waiver_status: 'partial_time_limit_waiver',
    approval_action: 'partial_approval',
    request_type: EVIDENCE.requestType,
    approved_areas: [...EVIDENCE.approvedAreas],
    denied_areas: [...EVIDENCE.deniedAreas],
    governing_period: {
      implementation_date: EVIDENCE.implementationDate,
      expiration_date: EVIDENCE.expirationDate,
    },
    authority: EVIDENCE.authority,
    request_date: EVIDENCE.requestDate,
    response_date: EVIDENCE.letterDate,
  };

  const fieldValue = {
    terminal_classification: 'observed',
    finding_scope: 'bounded_exact_federal_waiver_approval_instrument',
    finding_code: 'north_dakota_partial_abawd_time_limit_waiver_rolette_turtle_mountain_2025_07_01_through_2026_06_30',
    finding_summary: 'The federal response partially approved North Dakota’s ABAWD time-limit waiver for Rolette County and Turtle Mountain Reservation and Off-Reservation Trust Land from July 1, 2025 through June 30, 2026, while denying Bottineau County and Towner County.',
    bounded_finding: boundedFinding,
    source: {
      route_id: EVIDENCE.routeId,
      document_title: EVIDENCE.documentTitle,
      requested_url: EVIDENCE.requestedUrl,
      canonical_index_url: EVIDENCE.canonicalIndexUrl,
      canonical_index_page_updated: EVIDENCE.canonicalIndexPageUpdated,
      content_type: EVIDENCE.contentType,
      http_status: EVIDENCE.httpStatus,
      redirects_followed: EVIDENCE.redirectsFollowed,
      body_bytes: EVIDENCE.bodyBytes,
      body_sha256: EVIDENCE.bodySha256,
      physical_requests: EVIDENCE.physicalRequests,
      substantive_weight_count: 1,
    },
    page_complete_review: pageReview,
    limitations: [
      'the approval applies only to Rolette County and Turtle Mountain Reservation and Off-Reservation Trust Land',
      'Bottineau County and Towner County were denied under this response',
      'the approval period ends June 30, 2026 and supplies no authority after that date',
      'the approval instrument does not establish uniform frontline implementation or person-level outcomes',
    ],
    prohibited_inferences: [...PROHIBITED],
  };

  Object.assign(findCell(row, TARGET.fieldId), {
    state: 'evidence_complete',
    terminal: true,
    value: fieldValue,
    evidence_source_ids: [EVIDENCE.routeId, pageReview.review_id],
    typed_gap: null,
    authority_effect: 'bounded_exact_federal_partial_approval_geography_and_governing_period_only',
  });
  row.terminal_fields += 1;
  row.open_fields -= 1;

  const rowStateAfter = findCell(row, TARGET.rowFieldId);
  assert(row.row_state === 'still_open' && row.terminal_fields === 8 && row.open_fields === 1, 'North Dakota projected row custody differs');
  assert(canonicalSha(rowStateAfter) === TARGET.beforeRowSha256, 'North Dakota row-state cell changed without authorization');
  equal(rowStateAfter, rowStateBefore, 'North Dakota row-state cell changed');

  recalcMatrix(matrix);
  matrix.postpromotion_nd_fy2025_waiver_approval_terminalization_product = {
    product_id: 'SSC-RD-W03-RD04-POSTPROMOTION-ND-FY2025-WAIVER-APPROVAL-TERMINALIZATION',
    canonical_parent: CANONICAL_PARENT,
    canonical_tree: CANONICAL_TREE,
    predecessor_matrix_path: PREDECESSOR.path,
    source_body_sha256: EVIDENCE.bodySha256,
    field_terminalizations: 1,
    row_terminalizations: 0,
    row_state_mutations: 0,
    matrix_updates: 1,
    north_dakota_field_state_after: 'evidence_complete',
    north_dakota_row_state_after: 'still_open',
    north_dakota_row_state_cell_preserved: true,
    class_closed: false,
  };

  assert(matrix.counts.terminal_cells === 228 && matrix.counts.still_open_cells === 222, 'terminal transition differs');
  assert(matrix.counts.terminal_substantive_cells === 118 && matrix.counts.still_open_substantive_cells === 182, 'substantive transition differs');
  assert(matrix.counts.terminal_units === 10 && matrix.counts.row_terminal_state_cells_terminal === 10 && matrix.counts.row_terminal_state_cells_open === 40, 'row-state denominator differs');
  assert(matrix.counts.evidence_complete_cells === 198 && matrix.counts.observed_cells === 17 && matrix.counts.not_publicly_recovered_cells === 13, 'state transition differs');

  const after = structuredClone(findCell(row, TARGET.fieldId));
  const custody = {
    schema_version: 'ssc-rd04-wave03-postpromotion-nd-fy2025-waiver-approval-terminalization-input-custody@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    publication_parent_lease: {
      expected_main: CANONICAL_PARENT,
      expected_tree: CANONICAL_TREE,
      tree_state: 'exact_commit_and_tree_bound_at_construction',
      current_matrix_blob: PREDECESSOR.gitBlob,
      fail_closed_on_parent_or_tree_drift: true,
    },
    predecessor_matrix: {
      path: PREDECESSOR.path,
      bytes: PREDECESSOR.bytes,
      sha256: PREDECESSOR.sha256,
      git_blob_sha: PREDECESSOR.gitBlob,
      terminal_cells: 227,
      still_open_cells: 223,
      terminal_substantive_cells: 117,
      still_open_substantive_cells: 183,
      terminal_units: 10,
      class_closed: false,
    },
    source_custody: {
      route_id: EVIDENCE.routeId,
      document_title: EVIDENCE.documentTitle,
      requested_url: EVIDENCE.requestedUrl,
      canonical_index_url: EVIDENCE.canonicalIndexUrl,
      canonical_index_page_updated: EVIDENCE.canonicalIndexPageUpdated,
      http_status: EVIDENCE.httpStatus,
      content_type: EVIDENCE.contentType,
      redirects_followed: EVIDENCE.redirectsFollowed,
      physical_requests: EVIDENCE.physicalRequests,
      body_bytes: EVIDENCE.bodyBytes,
      body_sha256: EVIDENCE.bodySha256,
      route_consumed: true,
      additional_transport_authorized: false,
      embedded_pdf: {
        encoding: 'base64',
        bytes: evidence.pdf.length,
        sha256: sha256Bytes(evidence.pdf),
        data_base64: evidence.pdf.toString('base64'),
      },
    },
    page_complete_review: pageReview,
    local_fixture_verification: evidence.verification,
    superseded_candidates: [
      {
        candidate: 'local_q3_typed_gap_terminalization',
        disposition: 'rejected_after_exact_approval_instrument_recovered',
        authority_effect: 'none',
      },
    ],
    authority_boundary: {
      source_requests: 0,
      new_source_admissions: 1,
      matrix_updates: 1,
      field_terminalizations: 1,
      row_terminalizations: 0,
      row_state_mutations: 0,
      class_closed: false,
      ...AUTHORITY,
    },
  };

  const fieldDecision = {
    decision_id: 'RD04-ND-FY2025-WAIVER-APPROVAL-FIELD-TERMINALIZATION',
    unit_id: TARGET.unitId,
    field_id: TARGET.fieldId,
    disposition: 'terminalize_as_evidence_complete_from_exact_federal_partial_approval',
    state_before: before.state,
    state_after: after.state,
    terminal_before: false,
    terminal_after: true,
    before_cell_sha256: canonicalSha(before),
    after_cell_sha256: canonicalSha(after),
    source_route_ids: [EVIDENCE.routeId],
    source_body_sha256s: [EVIDENCE.bodySha256],
    page_review_id: pageReview.review_id,
    bounded_finding: boundedFinding,
    reason_code: 'exact_federal_approval_instrument_proves_partial_waiver_geography_and_governing_period',
    reason_summary: fieldValue.finding_summary,
    authority_effect: 'one_bounded_substantive_field_terminalized_as_evidence_complete',
    ...AUTHORITY,
  };

  const decisions = {
    schema_version: 'ssc-rd04-wave03-postpromotion-nd-fy2025-waiver-approval-terminalization-decisions@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    decision_outcomes: ['terminalize_field_as_evidence_complete'],
    decision_count: 1,
    field_terminalization_count: 1,
    row_terminalization_count: 0,
    decisions: [fieldDecision],
    authority_boundary: {
      source_requests: 0,
      new_source_admissions: 1,
      matrix_updates: 1,
      field_terminalizations: 1,
      row_terminalizations: 0,
      row_state_mutations: 0,
      class_closed: false,
      ...AUTHORITY,
    },
  };

  const ledger = {
    schema_version: 'ssc-rd04-wave03-postpromotion-nd-fy2025-waiver-approval-cell-transition-ledger@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    predecessor_matrix_path: PREDECESSOR.path,
    terminalization_decisions_path: 'terminalization-decisions.json',
    counts: {
      transitions: 1,
      affected_states: 1,
      field_terminalizations: 1,
      row_terminalizations: 0,
      row_state_mutations: 0,
      matrix_updates: 1,
      terminal_cells_before: 227,
      terminal_cells_after: 228,
      still_open_cells_before: 223,
      still_open_cells_after: 222,
      terminal_substantive_cells_before: 117,
      terminal_substantive_cells_after: 118,
      still_open_substantive_cells_before: 183,
      still_open_substantive_cells_after: 182,
      terminal_units_before: 10,
      terminal_units_after: 10,
    },
    transitions: [
      {
        ordinal: 1,
        decision_id: fieldDecision.decision_id,
        unit_id: TARGET.unitId,
        field_id: TARGET.fieldId,
        field_ordinal: before.field_ordinal,
        state_before: before.state,
        state_after: after.state,
        terminal_before: false,
        terminal_after: true,
        before_cell_sha256: canonicalSha(before),
        after_cell_sha256: canonicalSha(after),
        value_after: after.value,
        evidence_source_ids: after.evidence_source_ids,
        typed_gap_after: null,
        authority_effect: after.authority_effect,
      },
    ],
    authority_boundary: {
      source_requests: 0,
      new_source_admissions: 1,
      matrix_updates: 1,
      field_terminalizations: 1,
      row_terminalizations: 0,
      row_state_mutations: 0,
      class_closed: false,
      ...AUTHORITY,
    },
  };

  const census = buildCensus(matrix);
  const nextOperation = 'publish this exact fourteen-path candidate only after a controller rebinds the live main commit and tree, proves addition-only path disjointness, and reruns every exact-head gate; after canonical merge, keep the North Dakota row-state cell open and require a separately validated row-state operation before any row terminalization';

  const summary = {
    schema_version: 'ssc-rd04-wave03-postpromotion-nd-fy2025-waiver-approval-terminalization-summary@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    source_result: {
      document_title: EVIDENCE.documentTitle,
      body_sha256: EVIDENCE.bodySha256,
      page_count: EVIDENCE.pageCount,
      all_pages_reviewed: true,
      north_dakota_status: 'partial_time_limit_waiver',
      approved_areas: [...EVIDENCE.approvedAreas],
      denied_areas: [...EVIDENCE.deniedAreas],
      implementation_date: EVIDENCE.implementationDate,
      expiration_date: EVIDENCE.expirationDate,
      complete_geography_recovered: true,
      north_dakota_specific_governing_period_recovered: true,
    },
    transition: {
      field_state_before: 'still_open',
      field_state_after: 'evidence_complete',
      row_state_before: 'still_open',
      row_state_after: 'still_open',
      row_state_cell_preserved: true,
      terminal_cells_before: 227,
      terminal_cells_after: 228,
      still_open_cells_before: 223,
      still_open_cells_after: 222,
      terminal_substantive_cells_before: 117,
      terminal_substantive_cells_after: 118,
      still_open_substantive_cells_before: 183,
      still_open_substantive_cells_after: 182,
      terminal_units_before: 10,
      terminal_units_after: 10,
      north_dakota_terminal_fields_before: 7,
      north_dakota_terminal_fields_after: 8,
      north_dakota_open_fields_before: 2,
      north_dakota_open_fields_after: 1,
      class_closed_before: false,
      class_closed_after: false,
    },
    current_result: {
      page_complete_review_complete: true,
      field_terminalized: true,
      north_dakota_row_terminalized: false,
      north_dakota_row_state: 'still_open',
      field_matrix_terminal: false,
      class_state: 'still_open',
      class_closed: false,
      remaining_open_substantive_cells: 182,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
      prevalence_effect: 'none',
      discrimination_effect: 'none',
      coordination_effect: 'none',
      common_purpose_effect: 'none',
      racial_order_effect: 'none',
      complete_compact_effect: 'none',
    },
    next_bounded_operation: nextOperation,
  };

  const index = {
    schema_version: 'ssc-rd04-wave03-postpromotion-nd-fy2025-waiver-approval-terminalization-index@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    terminalization_input_custody_path: 'terminalization-input-custody.json',
    terminalization_decisions_path: 'terminalization-decisions.json',
    cell_transition_ledger_path: 'cell-transition-ledger.json',
    promoted_partial_field_matrix_path: 'promoted-partial-field-matrix.json',
    remaining_open_field_census_path: 'remaining-open-field-census.json',
    terminalization_summary_path: 'terminalization-summary.json',
    counts: {
      source_documents: 1,
      pdf_pages_reviewed: 5,
      decisions: 1,
      field_terminalizations: 1,
      row_terminalizations: 0,
      matrix_updates: 1,
      terminal_cells_after: 228,
      still_open_cells_after: 222,
      still_open_substantive_fields_after: 182,
      terminal_units: 10,
      result_spawned_requests: 0,
    },
    current_result: {
      page_complete_review_complete: true,
      north_dakota_fixed_public_record_obligation_complete: false,
      north_dakota_row_state: 'still_open',
      field_matrix_terminal: false,
      class_state: 'still_open',
      class_closed: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
    },
    next_bounded_operation: nextOperation,
  };

  const objects = {custody, decisions, ledger, matrix, census, summary, index};
  writeJson(`${OUTPUT_DIR}/terminalization-input-custody.json`, custody);
  writeJson(`${OUTPUT_DIR}/terminalization-decisions.json`, decisions);
  writeJson(`${OUTPUT_DIR}/cell-transition-ledger.json`, ledger);
  writeJson(`${OUTPUT_DIR}/promoted-partial-field-matrix.json`, matrix);
  writeJson(`${OUTPUT_DIR}/remaining-open-field-census.json`, census);
  writeJson(`${OUTPUT_DIR}/terminalization-summary.json`, summary);
  writeJson(`${OUTPUT_DIR}/index.json`, index);

  const schema = buildClosedSchema({...objects, manifest: provisionalManifest()});
  writeJson(SCHEMA_PATH, schema);

  const hashedFiles = manifestRows();
  assert(hashedFiles.length === 13, 'manifest hashed-file denominator differs');
  const combinedSha256 = sha256Bytes(Buffer.from(hashedFiles.map((item) => `${item.path}\0${item.bytes}\0${item.sha256}\0${item.git_blob}\n`).join('')));
  const manifest = {
    schema_version: 'ssc-rd04-wave03-postpromotion-nd-fy2025-waiver-approval-terminalization-manifest@1',
    permanent_path_count: 14,
    hashed_file_count: 13,
    permanent_paths: [...PERMANENT_PATHS],
    hashed_files: hashedFiles,
    combined_sha256: combinedSha256,
    authority_boundary: {
      source_requests: 0,
      new_source_admissions: 1,
      matrix_updates: 1,
      field_terminalizations: 1,
      row_terminalizations: 0,
      row_state_mutations: 0,
      class_closed: false,
      ...AUTHORITY,
    },
  };
  writeJson(MANIFEST_PATH, manifest);
  return {custody, decisions, ledger, matrix, census, summary, index, manifest, schema};
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const product = buildProduct();
  console.log(`rd04_nd_fy2025_waiver_approval_terminalization=built terminal_cells=${product.matrix.counts.terminal_cells} open_substantive=${product.matrix.counts.still_open_substantive_cells} terminal_units=${product.matrix.counts.terminal_units}`);
}
