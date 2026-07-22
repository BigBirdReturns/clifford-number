import assert from 'node:assert/strict';
import { buildReportFrontier, REPORT_FRONTIER_SCHEMA_VERSION } from '../tools/build-report-frontier.mjs';
import { readJson } from '../tools/lib/ledger.mjs';

const frontier = buildReportFrontier();
const emitted = readJson('build/report-frontier.json');
assert.deepEqual(emitted, frontier, 'the report frontier must be deterministic');
assert.deepEqual(buildReportFrontier(), frontier, 'a second build must not change the frontier');

assert.equal(frontier.schema_version, REPORT_FRONTIER_SCHEMA_VERSION);
assert.equal(frontier.graph_effect, 'none');
assert.equal(frontier.conclusion_generated, false);
assert.deepEqual(frontier.transition_order, [
  'intake_or_projection',
  'case_ledger',
  'structured_report',
  'independent_review',
  'approved_publication'
]);
assert.equal(frontier.waterline.stage, 'structured_report');
assert.equal(frontier.waterline.next_transition, 'independent_review');
assert.match(frontier.waterline.definition, /not a quality score or ranking/i);
assert.equal(frontier.totals.cases, frontier.cases.length);
assert.equal(frontier.totals.structured_reports, 2);
assert.equal(frontier.totals.approved_publications, 0);
assert.equal(frontier.totals.reports_awaiting_independent_review, 2);
assert.equal(frontier.totals.case_trails, 10);
assert.equal(frontier.totals.intake_trails, 18);
assert.equal(frontier.totals.report_linked_trails, 9);

const byCase = new Map(frontier.cases.map(item => [item.case_id, item]));
const anduril = byCase.get('anduril-access-ownership');
assert.ok(anduril);
assert.equal(anduril.case_state, 'case_ledger');
assert.equal(anduril.current_stage, 'structured_report');
assert.equal(anduril.next_transition, 'independent_review');
assert.equal(anduril.source_trails_linked_to_report, 0);
assert.ok(anduril.blockers.includes('independent_reviewer_missing'));

const arcadia = byCase.get('arcadia-field-autopsy');
assert.ok(arcadia);
assert.equal(arcadia.case_state, 'case_ledger');
assert.equal(arcadia.current_stage, 'structured_report');
assert.equal(arcadia.next_transition, 'independent_review');
assert.equal(arcadia.trails, 10);
assert.equal(arcadia.source_trails_linked_to_report, 9);
assert.ok(arcadia.blockers.includes('independent_reviewer_missing'));
assert.ok(arcadia.blockers.some(reason => /qualifications_inherited_from_case_boundary/.test(reason)));

const swarmForge = byCase.get('field-autopsy-03');
assert.ok(swarmForge);
assert.equal(swarmForge.case_state, 'case_ledger');
assert.equal(swarmForge.current_stage, 'case_ledger');
assert.equal(swarmForge.next_transition, 'evidence_upgrade');
assert.ok(swarmForge.blockers.includes('no_verified_claims'));

const ukAi = byCase.get('uk-ai-policy');
assert.ok(ukAi);
assert.equal(ukAi.case_state, 'legacy_projection');
assert.equal(ukAi.current_stage, 'intake_or_projection');
assert.equal(ukAi.next_transition, 'case_ledger_migration');
assert.ok(ukAi.blockers.includes('canonical_case_ledger_missing'));

const byProgram = new Map(frontier.trail_programs.map(item => [item.program_id, item]));
const arcadiaTrails = byProgram.get('case:arcadia-field-autopsy');
assert.ok(arcadiaTrails);
assert.equal(arcadiaTrails.totals.trails, 10);
assert.equal(arcadiaTrails.totals.linked_to_report_workplan, 9);
assert.equal(arcadiaTrails.totals.non_terminal, 10);
assert.equal(arcadiaTrails.trails.find(item => item.trail_id === 'trail-transcript-recovery').linked_to_report_workplan, false);
assert.ok(arcadiaTrails.trails.filter(item => item.linked_to_report_workplan).every(item => item.next_transition === 'execute_or_close_bounded_search'));

const routerTrails = byProgram.get('intake:person-centered-defense-routers');
assert.ok(routerTrails);
assert.equal(routerTrails.current_stage, 'intake_or_projection');
assert.equal(routerTrails.next_transition, 'case_ledger_promotion');
assert.equal(routerTrails.totals.trails, 18);
assert.equal(routerTrails.totals.frontier_rows, 17);
assert.equal(routerTrails.totals.linked_to_report_workplan, 0);
assert.ok(routerTrails.blockers.includes('not_in_case_ledger'));

for (const item of frontier.cases) assert.equal(item.graph_effect, 'none');
for (const program of frontier.trail_programs) assert.equal(program.graph_effect, 'none');
assert.doesNotMatch(JSON.stringify(frontier), /"(?:guilt|corruption|motive|influence|risk|probability)_score"/i);
assert.doesNotMatch(JSON.stringify(frontier), /"ranking"\s*:/i);

console.log('report-frontier: OK');
