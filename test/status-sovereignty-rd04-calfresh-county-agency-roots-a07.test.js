import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCountyAgencyRoots,
  countyRootPaths,
  parseCountyAgencyRoots,
  validateCountyAgencyRoots
} from '../tools/build-status-sovereignty-rd04-calfresh-county-agency-roots-a07.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const frozen = JSON.parse(fs.readFileSync(path.join(ROOT, countyRootPaths.frozenSourceLedger), 'utf8'));
const acquisition = JSON.parse(fs.readFileSync(path.join(ROOT, countyRootPaths.acquisitionLedger), 'utf8'));
const counties = frozen.county_census.ordered_counties;
const sourceReceipt = acquisition.sources.find((row) => row.source_id === 'CDSS-COUNTY-OFFICES');
if (!sourceReceipt) throw new Error('exact county-office receipt absent');
const sourceBodyRel = path.join(countyRootPaths.acquisitionRoot, sourceReceipt.body_path);
const sourceBytes = fs.readFileSync(path.join(ROOT, sourceBodyRel));

const exactFirst = parseCountyAgencyRoots({
  htmlBytes: sourceBytes,
  counties,
  sourceReceipt,
  sourceBodyPath: sourceBodyRel.split(path.sep).join('/')
});
const exactSecond = parseCountyAgencyRoots({
  htmlBytes: sourceBytes,
  counties,
  sourceReceipt,
  sourceBodyPath: sourceBodyRel.split(path.sep).join('/')
});
if (JSON.stringify(exactFirst) !== JSON.stringify(exactSecond)) throw new Error('exact county parse is nondeterministic');
if (exactFirst.denominator.parsed_counties !== 58 || exactFirst.denominator.unique_counties !== 58) {
  throw new Error('exact county denominator failed');
}
if (JSON.stringify(exactFirst.counties.map((row) => row.county)) !== JSON.stringify(counties)) {
  throw new Error('exact county order failed');
}
if (
  exactFirst.counts.exact_public_agency_roots
  + exactFirst.counts.multiple_public_root_candidates
  + exactFirst.counts.public_sections_without_agency_root
  !== 58
) throw new Error('exact county state partition failed');
if (exactFirst.counts.link_candidates < 58) throw new Error('exact county link-candidate preservation failed');
if (exactFirst.denominator.county_census_complete !== false) throw new Error('agency roots became a complete county census');
if (exactFirst.denominator.county_selection_authorized !== false) throw new Error('agency roots authorized county selection');
if (exactFirst.authority.agency_root_is_case_receipt !== false) throw new Error('agency root became a case receipt');
if (exactFirst.authority.missing_root_is_noncompliance !== false) throw new Error('missing root became noncompliance');

const syntheticHtml = Buffer.from(counties.map((county, index) => {
  if (index === 0) {
    return `<h2><strong>${county} County Social Services Agency</strong></h2><a href="https://one.example.gov/" title="${county} County Website">${county} County Website</a><a href="https://two.example.gov/" title="${county} County Website">${county} County Website</a>`;
  }
  if (index === 1) return `<h2><strong>${county} County Social Services Agency</strong></h2><p>No public root in this section.</p>`;
  return `<h2><strong>${county} County Social Services Agency</strong></h2><a href="https://${county.toLowerCase().replace(/[^a-z0-9]+/g, '')}.example.gov/" title="${county} County Website">${county} County Website</a>`;
}).join('\n'), 'utf8');
const synthetic = parseCountyAgencyRoots({
  htmlBytes: syntheticHtml,
  counties,
  sourceReceipt: {
    requested_url: 'https://www.cdss.ca.gov/county-offices',
    final_url: 'https://www.cdss.ca.gov/county-offices',
    http_status: 200,
    content_type: 'text/html',
    terminal_state: 'exact_response_preserved_pending_semantic_classification'
  },
  sourceBodyPath: 'synthetic/county-offices.html'
});
if (synthetic.counties[0].selection_state !== 'multiple_public_root_candidates') throw new Error('ambiguous synthetic roots were not preserved');
if (synthetic.counties[0].selected_agency_root_url !== null) throw new Error('ambiguous synthetic root was selected');
if (synthetic.counties[1].selection_state !== 'public_section_without_agency_root') throw new Error('absent synthetic root was not preserved');
if (synthetic.counties[1].source_unavailable_proves_noncompliance !== false) throw new Error('absent synthetic root became noncompliance');
if (!synthetic.counties.slice(2).every((row) => row.selection_state === 'exact_public_agency_root')) {
  throw new Error('unique synthetic roots did not resolve deterministically');
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'a07-county-roots-test-'));
for (const rel of [
  countyRootPaths.frozenSourceLedger,
  countyRootPaths.acquisitionLedger,
  countyRootPaths.schema
]) {
  const target = path.join(temp, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(ROOT, rel), target);
}
const tempBody = path.join(temp, sourceBodyRel);
fs.mkdirSync(path.dirname(tempBody), { recursive: true });
fs.copyFileSync(path.join(ROOT, sourceBodyRel), tempBody);
const built = buildCountyAgencyRoots(temp);
if (JSON.stringify(built) !== JSON.stringify(exactFirst)) throw new Error('exact builder and parser disagree');
const validation = validateCountyAgencyRoots(temp);
if (validation.length) throw new Error(`positive county-root validation failed:\n${validation.join('\n')}`);

const outputPath = path.join(temp, countyRootPaths.output);
const originalOutput = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
const mutations = [
  ['schema identity', (row) => { row.schema_version = 'bad'; }],
  ['county denominator', (row) => { row.denominator.parsed_counties = 57; }],
  ['county order', (row) => { row.counties.reverse(); }],
  ['root-state inflation', (row) => { row.counts.exact_public_agency_roots += 1; }],
  ['county census promotion', (row) => { row.denominator.county_census_complete = true; }],
  ['county selection promotion', (row) => { row.denominator.county_selection_authorized = true; }],
  ['case receipt inflation', (row) => { row.counts.exact_public_case_receipts = 1; }],
  ['implementation inflation', (row) => { row.counts.case_level_implementation_joins = 1; }],
  ['row follow-up promotion', (row) => { row.counties[0].county_follow_up_authorized = true; }],
  ['ambiguous selection laundering', (row) => { row.authority.ambiguous_root_authorizes_selection = true; }],
  ['missing-root laundering', (row) => { row.authority.missing_root_is_noncompliance = true; }],
  ['prevalence promotion', (row) => { row.authority.prevalence_supported = true; }],
  ['graph effect promotion', (row) => { row.authority.graph_effect = 'add'; }]
];
for (const [name, mutate] of mutations) {
  const changed = structuredClone(originalOutput);
  mutate(changed);
  fs.writeFileSync(outputPath, `${JSON.stringify(changed, null, 2)}\n`);
  const errors = validateCountyAgencyRoots(temp);
  if (!errors.some((error) => error.includes('deterministic county agency-root rebuild'))) {
    throw new Error(`${name} mutation was not refused: ${JSON.stringify(errors.slice(0, 20))}`);
  }
}
fs.writeFileSync(outputPath, `${JSON.stringify(originalOutput, null, 2)}\n`);

const originalSource = fs.readFileSync(tempBody);
fs.writeFileSync(tempBody, Buffer.concat([originalSource, Buffer.from('tamper')]));
let bodyRefused = false;
try {
  buildCountyAgencyRoots(temp);
} catch (error) {
  bodyRefused = error.message.includes('exact body custody mismatch');
}
if (!bodyRefused) throw new Error('county-office body tampering was not refused');

fs.rmSync(temp, { recursive: true, force: true });
console.log(`status-sovereignty-rd04-calfresh-county-agency-roots-a07.test: exact 58-county parse + synthetic ambiguity/absence + ${mutations.length + 1} adversarial controls PASS`);
