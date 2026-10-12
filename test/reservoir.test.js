import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readJson } from '../tools/lib/ledger.mjs';
import {
  buildReservoir,
  parseWhere,
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
assert.equal(first.manifest.counts.total_inquiries, first.manifest.counts.canonical_inquiries + first.manifest.counts.retrospective_inquiries + first.manifest.counts.main_derived_inquiries);

// 2. The retrospective's 79 tiered trails circulate in, with provenance.
assert.equal(first.manifest.counts.retrospective_inquiries, 79);
assert.equal(first.manifest.sources.retrospective.commit, '8d275d4b5aef8c27ff4d624b6814cc024253af99');
const tiers = compiled.filter((row) => row.derived && row.derived.source === 'retrospective-2026-10-12').reduce((acc, row) => ({ ...acc, [row.derived.tier]: (acc[row.derived.tier] || 0) + 1 }), {});
assert.deepEqual(tiers, { A: 17, B: 25, C: 26, D: 11 });
const retired = compiled.filter((row) => row.derived && row.derived.tier === 'D');
assert.ok(retired.every((row) => row.dispositions.at(-1).state === 'retired'), 'tier D trails are retired, not erased');
assert.ok(retired.every((row) => row.question.length > 0), 'a retired trail keeps its question');

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

// 7. Related ids must resolve, across projects with the project:id form.
const dangling = validateCanonical({ inquiries: [{ ...canonicalRows[0], related_inquiry_ids: ['nope'] }], decisions: [], disagreements: [] });
assert.ok(dangling.some((e) => e.includes('unknown inquiry nope')));

// 8. Locator parsing for the retrospective's free-text "where" strings.
assert.deepEqual(parseWhere('BigBirdReturns/clifford-number#47 (issue, 3 passes)'), { kind: 'github_item', repo: 'BigBirdReturns/clifford-number', number: 47, note: 'issue, 3 passes' });
assert.deepEqual(parseWhere('branch diagnostic/electric-twin-2026-sh01-form-custody-v2 (36 files)'), { kind: 'git_branch', repo: 'BigBirdReturns/clifford-number', branch: 'diagnostic/electric-twin-2026-sh01-form-custody-v2', note: '36 files' });
assert.deepEqual(parseWhere('data/ledger/'), { kind: 'git_path', path: 'data/ledger/' });
assert.equal(parseWhere('somewhere in a conversation').kind, 'text');

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
fs.rmSync(tmp, { recursive: true, force: true });

console.log('reservoir.test: OK');
