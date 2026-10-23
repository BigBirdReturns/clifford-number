import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readJson } from '../tools/lib/ledger.mjs';
import {
  buildReservoir,
  computeDelta,
  openInquiry,
  parseWhere,
  renderOpenInquiry,
  validateInquiry,
  validateDecision,
  validateDisagreement,
  validateCanonical,
  SCHEMAS,
} from '../tools/lib/reservoir.mjs';

// 1. The build is deterministic and writes what the manifest says.
const first = buildReservoir();
const second = buildReservoir({ write: false });
assert.deepEqual(second.manifest, first.manifest, 'reservoir build must be deterministic');
assert.deepEqual(readJson('build/reservoir/manifest.json'), first.manifest);
assert.equal(first.manifest.schema_version, SCHEMAS.manifest);
assert.equal(first.manifest.not_evidence_date, true);
assert.equal(first.manifest.boundaries.graph_effect, 'none');
assert.equal(first.manifest.boundaries.conclusion_generated, false);

const compiled = fs.readFileSync('build/reservoir/inquiries.compiled.jsonl', 'utf8').trim().split('\n').map((line) => JSON.parse(line));
assert.equal(compiled.length, first.manifest.counts.total_inquiries);
assert.equal(first.manifest.counts.total_inquiries, first.manifest.counts.canonical_inquiries + first.manifest.counts.retrospective_inquiries + first.manifest.counts.main_derived_inquiries + first.manifest.counts.view_inquiries);

// Active locators must survive branch pruning, including nested explanation
// evidence. Historical branch names in source prose remain verbatim.
const releasePaths = new Set();
function checkLocatorRefs(value) {
  if (!value || typeof value !== 'object') return;
  if (value.kind === 'git_path') {
    assert.notEqual(value.ref, 'audit/clifford-operating-cut-20261012', 'active locator targets a deleted branch');
    if (value.ref === 'v2.1.0' && (!value.repo || value.repo === 'BigBirdReturns/clifford-number')) releasePaths.add(value.path.replace(/\/$/u, ''));
  }
  Object.values(value).forEach(checkLocatorRefs);
}
checkLocatorRefs(compiled);
assert.ok(releasePaths.size > 0);
const objectChecks = execFileSync('git', ['cat-file', '--batch-check'], {
  input: [...releasePaths].map(p => `v2.1.0:${p}`).join('\n') + '\n', encoding: 'utf8'
}).trim().split('\n');
assert.equal(objectChecks.length, releasePaths.size);
assert.ok(objectChecks.every(line => /^[0-9a-f]{40} (blob|tree) \d+$/u.test(line)), 'release locators resolve to existing files or directories');

// 2. The retrospective's 79 tiered trails circulate in, with provenance, and
//    its ratings stay attributed judgments: no disposition, no review chore,
//    no headline posing as the original prompt.
assert.equal(first.manifest.counts.retrospective_inquiries, 79);
assert.equal(first.manifest.sources.retrospective.commit, '8d275d4b5aef8c27ff4d624b6814cc024253af99');
const retro = compiled.filter((row) => row.derived && row.derived.source === 'retrospective-2026-10-12');
assert.deepEqual(first.manifest.counts.retrospective_assessments_by_tier, { 'tier A': 17, 'tier B': 25, 'tier C': 26, 'tier D': 11 });
assert.ok(retro.every((row) => row.dispositions.at(-1).state === 'held'), 'imported trails are held, whatever their tier');
assert.ok(retro.every((row) => row.next_examination === null), 'importing a trail creates no review chore');
assert.ok(retro.every((row) => !row.prompting_observation && row.prompting_observation_status === 'not_located_in_inputs'), 'a later headline is not the original prompt');
assert.ok(retro.every((row) => row.assessments.some((a) => a.assessment_id === `tier-${row.derived.tier}` && a.by.kind === 'retrospective_interpretation')), 'the tier is kept as an attributed assessment');
const letGo = retro.filter((row) => row.derived.tier === 'D');
assert.equal(letGo.length, 11);
assert.ok(letGo.every((row) => row.question.length > 0 && row.assessments[0].meaning === 'let it go'), 'a trail the retrospective let go keeps its question and the recommendation');
assert.ok(first.manifest.counts.without_prompting_observation >= 79, 'imported trails count as prompt not located');

// 3. Derived rows never carry the owner's words, and say what they derive from.
for (const row of compiled) {
  assert.equal(validateInquiry(row).length, 0, `compiled row ${row.inquiry_id} must validate`);
  if (row.derived) {
    assert.ok(['derived_from_record', 'retrospective_interpretation'].includes(row.question_origin.kind), row.inquiry_id);
  }
}
const canonicalRows = compiled.filter((row) => !row.derived);
assert.ok(canonicalRows.some((row) => row.prompting_observation && row.prompting_observation.origin.kind === 'human_words'), 'at least one canonical row keeps the owner\'s own words');

// 4. Main-side question records are circulated: game trails, hypotheses, M-04D frontier, hydrology lanes.
const sources = new Set(compiled.filter((row) => row.derived).map((row) => row.derived.source));
for (const expected of ['gametrails/data.json', 'cases/arcadia-field-autopsy/hypotheses.jsonl', 'data/project/m04d-adversarial-triage-ledger.json', 'data/project/m04g-evidence-hydrology-catchments.json', 'data/project/m04g-evidence-hydrology-fanout.json', 'data/project/m04g-global-circulation-fanout.json']) {
  assert.ok(sources.has(expected), `expected derived rows from ${expected}`);
}
assert.ok(first.manifest.counts.reconnections > 0, 'retrospective trails and main records share paths');
assert.ok(first.manifest.counts.hubs > 0, 'paths cited by many records are listed as hubs');
assert.ok(first.manifest.hubs.every((h) => h.inquiries.length > 10), 'a hub holds more than the pairwise limit');

// 4b. The checked-in disposition view circulates the Git ledger's issues and research-bearing pull requests.
assert.ok(first.manifest.sources.views.includes('data/reservoir/views/disposition-2026-10-12.view.jsonl'));
const disposition = compiled.filter((row) => row.derived && row.derived.source === 'data/reservoir/views/disposition-2026-10-12.view.jsonl');
assert.equal(disposition.filter((row) => row.derived.kind === 'github_issue_disposition').length, 599);
assert.equal(disposition.filter((row) => row.derived.kind === 'github_pull_request_disposition').length, 261);
assert.ok(disposition.every((row) => row.dispositions.at(-1).state === 'held' && row.next_examination === null));
assert.ok(disposition.filter((row) => row.derived.kind !== 'view_provenance').every((row) => row.locators.some((l) => l.kind === 'github_item')));
assert.equal(disposition.filter((row) => row.derived.kind === 'view_provenance').length, 1, 'the view carries one provenance row naming the native ledger');

// Regenerating the real ledgers must preserve the published snapshot after
// the working branch is pruned, including the provenance link and hashes.
const dispositionFile = 'data/reservoir/views/disposition-2026-10-12.view.jsonl';
const publishedView = fs.readFileSync(dispositionFile, 'utf8');
const publishedRows = publishedView.trim().split('\n').map((line) => JSON.parse(line));
const publishedLocators = publishedRows.flatMap((row) => row.locators);
assert.ok(publishedLocators.filter((l) => l.kind === 'git_path').every((l) => l.ref === 'v2.1.0'));
assert.ok(publishedRows[0].locators.some((l) => l.kind === 'url' && l.url === 'https://github.com/BigBirdReturns/clifford-number/tree/v2.1.0'));
assert.ok(publishedLocators.filter((l) => l.kind === 'git_branch').every((l) => l.branch === 'archive/retrospective-2026-10-12'));
assert.ok(publishedLocators.filter((l) => l.kind === 'git_path').every((l) => !/[\s*]/u.test(l.path)), 'ledger prose and wildcard groups must not become literal file links');
assert.ok(publishedLocators.some((l) => l.kind === 'text' && l.text === 'open on GitHub (no content moved)'));
assert.ok(publishedLocators.some((l) => l.kind === 'git_path' && l.path === 'docs/milestones/' && l.note.includes('docs/milestones/m04c-*.md (5 files)')), 'a grouped-file locator opens its folder and retains the exact ledger description');
assert.ok(publishedLocators.some((l) => l.kind === 'git_path' && l.path === 'retrospective/2026-10-12/github/issue-bodies.jsonl' && l.note.includes('verbatim copies:')));
const generatedViewDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reservoir-disposition-'));
try {
  const generatedView = path.join(generatedViewDir, 'disposition.view.jsonl');
  execFileSync(process.execPath, [
    'tools/reservoir-view-from-disposition.mjs',
    '--issues', 'retrospective/2026-10-12/disposition/issue-disposition.tsv',
    '--prs', 'retrospective/2026-10-12/disposition/pr-disposition.tsv',
    '--out', generatedView,
  ]);
  assert.equal(fs.readFileSync(generatedView, 'utf8'), publishedView, 'the generator default must reproduce the checked-in release view');
} finally {
  fs.rmSync(generatedViewDir, { recursive: true, force: true });
}

// 5. A disproved explanation must keep evidence against it; a narrowed one must say what narrowed it.
const base = JSON.parse(JSON.stringify(canonicalRows[0]));
base.competing_explanations = [{ explanation_id: 'x', text: 'guess', origin: { kind: 'agent_interpretation', author: 't' }, status: 'disproved', evidence_for: [], evidence_against: [] }];
assert.ok(validateInquiry(base).some((e) => e.includes('evidence_against')));
base.competing_explanations[0].status = 'narrowed';
assert.ok(validateInquiry(base).some((e) => e.includes('narrowed_by')));
base.competing_explanations[0].status = 'live';
assert.equal(validateInquiry(base).length, 0);

// 6. Prune decisions are human; disagreements start from the human's words.
const decision = readJson === null ? null : JSON.parse(fs.readFileSync('data/decisions/prune-decisions.jsonl', 'utf8').trim().split('\n')[0]);
assert.equal(validateDecision(decision).length, 0);
const agentDecision = { ...decision, decided_by: { kind: 'agent_interpretation', author: 'bot' } };
assert.ok(validateDecision(agentDecision).some((e) => e.includes('human_words')));
const disagreement = JSON.parse(fs.readFileSync('data/reservoir/disagreements.jsonl', 'utf8').trim().split('\n')[0]);
assert.equal(validateDisagreement(disagreement).length, 0);
const swapped = { ...disagreement, original_human_claim: { ...disagreement.original_human_claim, origin: { kind: 'agent_observation', author: 'bot' } } };
assert.ok(validateDisagreement(swapped).some((e) => e.includes('human_words')));

// 7. Related ids must resolve against the whole body, so a canonical inquiry can
//    return a result to a derived row; a dangling id fails the build.
const dangling = validateCanonical({ inquiries: [{ ...canonicalRows[0], related_inquiry_ids: ['nope'] }], decisions: [], disagreements: [] }, { knownInquiryIds: new Set() });
assert.ok(dangling.some((e) => e.includes('unknown inquiry nope')));
assert.equal(validateCanonical({ inquiries: [{ ...canonicalRows[0], related_inquiry_ids: ['nope'] }], decisions: [], disagreements: [] }).length, 0, 'structural validation alone does not resolve references');
const returned = compiled.find((row) => row.inquiry_id === 'inq-synthetic-audience-vendor-disclosures');
assert.ok(returned.related_inquiry_ids.includes('view:disposition-2026-10-12:issue-46'), 'a canonical inquiry relates to a view row');
assert.ok(returned.competing_explanations.some((e) => e.status === 'disproved' && e.evidence_against.length >= 2));
const openedReturned = openInquiry(first, 'inq-synthetic-audience-vendor-disclosures');
assert.ok(openedReturned.related.some((r) => r.id === 'clifford-number:view:disposition-2026-10-12:issue-46'));
const openedLedgerRow = openInquiry(first, 'view:disposition-2026-10-12:issue-46');
assert.ok(openedLedgerRow.incoming.some((r) => r.id === 'clifford-number:inq-synthetic-audience-vendor-disclosures'), 'opening the ledger row shows the result that returned to it');

// 8. Locator parsing for the retrospective's free-text "where" strings.
assert.deepEqual(parseWhere('BigBirdReturns/clifford-number#47 (issue, 3 passes)'), { kind: 'github_item', repo: 'BigBirdReturns/clifford-number', number: 47, note: 'issue, 3 passes' });
assert.deepEqual(parseWhere('branch diagnostic/electric-twin-2026-sh01-form-custody-v2 (36 files)'), { kind: 'git_branch', repo: 'BigBirdReturns/clifford-number', branch: 'diagnostic/electric-twin-2026-sh01-form-custody-v2', note: '36 files' });
assert.deepEqual(parseWhere('data/ledger/'), { kind: 'git_path', path: 'data/ledger/' });
assert.equal(parseWhere('somewhere in a conversation').kind, 'text');

// 8b. Opening an inquiry recovers its prompt, history, touches, connections and how to return a result.
const opened = openInquiry(first, 'inq-desktop-relay-slowdown-2026-10-12');
assert.equal(opened.prompting.status, 'recorded');
assert.equal(opened.prompting.origin.kind, 'human_words');
assert.ok(opened.explanations.some((e) => e.status === 'narrowed' && e.challenged_by.length > 0));
assert.ok(opened.related.some((r) => r.id === 'clifford-number:inq-estate-circulation-objective'));
assert.ok(opened.incoming.some((r) => r.id === 'clifford-number:inq-estate-circulation-objective'));
const openedRetro = openInquiry(first, retro[0].inquiry_id);
assert.equal(openedRetro.prompting.status, 'not_located_in_inputs');
assert.ok(openedRetro.assessments.length >= 1);
assert.ok(renderOpenInquiry(openedRetro).includes('attributed judgments'));
assert.equal(openInquiry(first, 'no-such-inquiry'), null);

// 8c. A delta between builds names changed inputs and inquiries instead of asking for everything again.
const rebuilt = buildReservoir();
assert.equal(rebuilt.delta.first_build, false);
assert.equal(rebuilt.delta.unchanged, true);
assert.equal(rebuilt.delta.previous_fingerprint, first.manifest.fingerprint);
assert.ok(first.manifest.inputs.some((i) => i.path === 'data/reservoir/inquiries.jsonl' && /^[0-9a-f]{64}$/u.test(i.sha256)));
const deltaFile = readJson('build/reservoir/delta.json');
assert.equal(deltaFile.current_fingerprint, rebuilt.manifest.fingerprint);
const fakePrev = { ...first.manifest, fingerprint: 'prev', inputs: first.manifest.inputs.map((i, n) => (n === 0 ? { ...i, sha256: 'x' } : i)), reconnections: [] };
const fakeRows = first.inquiries.slice(1).map((r, n) => (n === 0 ? { ...r, question: 'changed' } : r));
const simulated = computeDelta({ previousManifest: fakePrev, previousRows: fakeRows, manifest: first.manifest, rows: first.inquiries });
assert.deepEqual(simulated.inputs_changed, [first.manifest.inputs[0].path]);
assert.equal(simulated.inquiries_added.length, 1);
assert.equal(simulated.inquiries_changed.length, 1);
assert.equal(simulated.reconnections_added, first.manifest.reconnections.length);

// 9. Estate-wide join: another project's reservoir is indexed without being copied.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reservoir-join-'));
fs.mkdirSync(path.join(tmp, 'decisions'));
const other = {
  schema_version: SCHEMAS.inquiry,
  project: 'estate-tooling',
  inquiry_id: 'inq-relay-queue',
  recorded_at: '2026-10-12',
  question: 'Does the device agent serve one relay call at a time?',
  question_origin: { kind: 'agent_observation', author: 'test fixture' },
  competing_explanations: [],
  dispositions: [{ at: '2026-10-12', state: 'open', by: 'agent_observation', reason: 'fixture', evidence: [] }],
  locators: [{ kind: 'estate_path', host: 'octo-w01', path: 'D:\\Projects\\Tooling' }],
  related_inquiry_ids: ['clifford-number:inq-desktop-relay-slowdown-2026-10-12'],
  graph_effect: 'none',
  conclusion_generated: false,
};
fs.writeFileSync(path.join(tmp, 'inquiries.jsonl'), `${JSON.stringify(other)}\n`);
const joined = buildReservoir({ write: false, join: [tmp] });
assert.equal(joined.manifest.counts.projects, 2);
assert.equal(joined.manifest.counts.total_inquiries, first.manifest.counts.total_inquiries + 1);
assert.ok(joined.inquiries.some((row) => row.project === 'estate-tooling' && row.inquiry_id === 'inq-relay-queue'));
const badOther = { ...other, project: 'clifford-number' };
fs.writeFileSync(path.join(tmp, 'inquiries.jsonl'), `${JSON.stringify(badOther)}\n`);
assert.throws(() => buildReservoir({ write: false, join: [tmp] }), /must not use project clifford-number/);

// 10. Reconnection is scoped by repository: another project's identically
//     named file does not meet ours unless it names our repository.
const sameName = { ...other, inquiry_id: 'inq-same-name', locators: [{ kind: 'git_path', path: 'gametrails/data.json' }], related_inquiry_ids: [] };
fs.writeFileSync(path.join(tmp, 'inquiries.jsonl'), `${JSON.stringify(sameName)}\n`);
const meets = (built, id) => built.manifest.reconnections.some((p) => p.a === id || p.b === id) || built.manifest.hubs.some((h) => h.inquiries.includes(id));
const unscoped = buildReservoir({ write: false, join: [tmp] });
assert.ok(!meets(unscoped, 'estate-tooling:inq-same-name'), 'a bare path in another project does not reconnect, pairwise or at a hub');
const explicit = { ...sameName, locators: [{ kind: 'git_path', repo: 'BigBirdReturns/clifford-number', path: 'gametrails/data.json' }] };
fs.writeFileSync(path.join(tmp, 'inquiries.jsonl'), `${JSON.stringify(explicit)}\n`);
const scoped = buildReservoir({ write: false, join: [tmp] });
assert.ok(meets(scoped, 'estate-tooling:inq-same-name'), 'an explicit reference to our repository meets across projects, pairwise or at a hub');

// 11. A view exposes another project's native records as held inquiries without a ledger migration.
const viewPath = path.join(tmp, 'estate-view.jsonl');
fs.writeFileSync(viewPath, [
  JSON.stringify({ project: 'estate-tooling', record_id: 'peer-registry', text: 'Which host owns each estate resource, per estate_peer_registry.json?', locators: [{ kind: 'estate_path', host: 'octo-n01', path: 'D:\\Projects\\Tooling\\Estate\\main\\estate_peer_registry.json' }], as_of: '2026-09-09' }),
  JSON.stringify({ project: 'estate-tooling', record_id: 'teardown-status', question: 'Is W01 ready to power off?', text: 'ESTATE STATUS: HOLD', locators: [{ kind: 'estate_path', host: 'octo-w01', path: 'D:\\ESTATE-STATUS.txt' }], prompting: { text: 'READY markers must come from receipts, never by hand.', origin: { kind: 'human_relayed', author: 'D:\\README.md' } } }),
].join('\n') + '\n');
const viewed = buildReservoir({ write: false, views: [viewPath] });
assert.equal(viewed.manifest.counts.view_inquiries, first.manifest.counts.view_inquiries + 2);
assert.ok(viewed.manifest.projects.some((p) => p.project === 'estate-tooling'));
const viewRows = viewed.inquiries.filter((r) => r.derived && r.derived.kind === 'view_record');
assert.ok(viewRows.every((r) => r.dispositions.at(-1).state === 'held' && r.next_examination === null));
assert.equal(viewRows.find((r) => r.inquiry_id === 'view:peer-registry').prompting_observation_status, 'not_located_in_inputs');
assert.equal(viewRows.find((r) => r.inquiry_id === 'view:teardown-status').prompting_observation.origin.kind, 'human_relayed');
assert.ok(viewed.manifest.inputs.some((i) => i.path.endsWith('estate-view.jsonl')));
fs.writeFileSync(viewPath, `${JSON.stringify({ project: 'estate-tooling', record_id: 'bad', text: 'no locators', locators: [] })}\n`);
assert.throws(() => buildReservoir({ write: false, views: [viewPath] }), /at least one locator/);
fs.rmSync(tmp, { recursive: true, force: true });

console.log('reservoir.test: OK');
