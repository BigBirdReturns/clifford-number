#!/usr/bin/env node
// Turn the 12 October 2026 Git disposition ledger (where every pull request
// and issue lives now) into a reservoir view, without moving the ledger.
//
//   node tools/reservoir-view-from-disposition.mjs \
//     --issues <issue-disposition.tsv> [--prs <pr-disposition.tsv>] \
//     [--ref audit/clifford-operating-cut-20261012] [--out data/reservoir/views/disposition-2026-10-12.view.jsonl]
//
// Every issue becomes one view row: its title is the question-bearing text,
// its locators are the GitHub item and the path where its substance lives
// now (archive, head, or bundle). Pull requests become rows only when the
// ledger says they carry research content that is not on main
// (landed, archived, partly-archived, bundle-only, merged-elsewhere); the
// 604 merged-into-main and 1,204 no-research-content rows are counted in
// the provenance but not emitted, because their substance is already on
// main or they carried none. Nothing here is a claim, hop or graph edge.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const opt = { issues: null, prs: null, ref: 'audit/clifford-operating-cut-20261012', out: 'data/reservoir/views/disposition-2026-10-12.view.jsonl', project: 'clifford-number', repo: 'BigBirdReturns/clifford-number' };
for (let i = 0; i < args.length; i += 1) {
  const key = args[i].replace(/^--/u, '');
  if (!(key in opt)) {
    console.error(`unknown argument ${args[i]}`);
    process.exit(2);
  }
  opt[key] = args[++i];
}
if (!opt.issues) {
  console.error('usage: --issues <issue-disposition.tsv> [--prs <pr-disposition.tsv>] [--ref <branch>] [--out <file>]');
  process.exit(2);
}

export function parseTsv(text) {
  const lines = text.split(/\r?\n/u).filter((line) => line.length > 0);
  const header = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    return Object.fromEntries(header.map((name, i) => [name, cells[i] ?? '']));
  });
}

const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const issuesBuffer = fs.readFileSync(opt.issues);
const issues = parseTsv(issuesBuffer.toString('utf8'));
const prsBuffer = opt.prs ? fs.readFileSync(opt.prs) : null;
const prs = prsBuffer ? parseTsv(prsBuffer.toString('utf8')) : [];

const RESEARCH_DISPOSITIONS = new Set(['landed', 'archived', 'partly-archived', 'bundle-only', 'merged-elsewhere']);
const rows = [];
const ledgerLocator = (relativePath, note) => ({ kind: 'git_path', repo: opt.repo, ref: opt.ref, path: relativePath, ...(note ? { note } : {}) });

for (const issue of issues) {
  const number = Number(issue.number);
  const locators = [{ kind: 'github_item', repo: opt.repo, number, note: `issue, ${issue.state}${issue.closed_today === 'yes' ? ', closed 2026-10-12' : ''}` }];
  if (issue.substance_location) {
    for (const location of issue.substance_location.split(';').map((s) => s.trim()).filter(Boolean)) {
      locators.push(ledgerLocator(location, `substance_kind ${issue.substance_kind || 'unknown'}`));
    }
  }
  rows.push({
    project: opt.project,
    record_id: `disposition-2026-10-12:issue-${number}`,
    kind: 'github_issue_disposition',
    text: issue.title,
    locators,
    origin: { kind: 'derived_from_record', author: `retrospective/2026-10-12/disposition/issue-disposition.tsv on ${opt.ref}`, note: `created_by ${issue.created_by}; group ${issue.group || 'none'}; comments ${issue.comments}; cited paths ${issue.cited_paths} (on head ${issue.cited_on_head}, in archive ${issue.cited_in_archive}, unfound ${issue.cited_unfound}); ${issue.note || ''}`.trim() },
  });
}

const prCounts = {};
for (const pr of prs) {
  prCounts[pr.disposition] = (prCounts[pr.disposition] || 0) + 1;
  if (!RESEARCH_DISPOSITIONS.has(pr.disposition)) continue;
  const number = Number(pr.number);
  const locators = [{ kind: 'github_item', repo: opt.repo, number, note: `pull request, ${pr.state}, ${pr.disposition}; head ${pr.head_branch}` }];
  for (const location of (pr.archive_locations || '').split(';').map((s) => s.trim()).filter(Boolean)) {
    locators.push(ledgerLocator(location, 'archive location recorded by the ledger'));
  }
  if (pr.bundle_only_paths) {
    locators.push({ kind: 'git_branch', repo: opt.repo, branch: 'archive/retrospective-2026-10-12', note: `bundle-only paths recoverable from the all-refs bundle: ${pr.bundle_only_paths.slice(0, 400)}` });
  }
  rows.push({
    project: opt.project,
    record_id: `disposition-2026-10-12:pr-${number}`,
    kind: 'github_pull_request_disposition',
    text: pr.title,
    locators,
    origin: { kind: 'derived_from_record', author: `retrospective/2026-10-12/disposition/pr-disposition.tsv on ${opt.ref}`, note: `activity_class ${pr.activity_class}; files considered ${pr.files_considered}; landed ${pr.landed}; archived ${pr.archived}; bundle-only ${pr.bundle_only} (research ${pr.bundle_only_research}, code ${pr.bundle_only_code}); basis ${pr.basis}` },
  });
}

const provenance = {
  project: opt.project,
  record_id: 'disposition-2026-10-12:provenance',
  kind: 'view_provenance',
  text: `View over the 12 October 2026 disposition ledger: ${issues.length} issues and ${prs.length} pull requests read; ${rows.length} rows emitted. Pull requests by disposition: ${Object.entries(prCounts).sort().map(([k, v]) => `${k} ${v}`).join(', ') || 'not read'}. Only research-bearing dispositions are emitted for pull requests.`,
  locators: [
    { kind: 'git_branch', repo: opt.repo, branch: opt.ref, note: 'the ledger stays in its native custody on this branch' },
    ledgerLocator('retrospective/2026-10-12/disposition/issue-disposition.tsv', `sha256 ${sha(issuesBuffer)}`),
    ...(prsBuffer ? [ledgerLocator('retrospective/2026-10-12/disposition/pr-disposition.tsv', `sha256 ${sha(prsBuffer)}`)] : []),
    ledgerLocator('retrospective/2026-10-12/disposition/SUMMARY.md', 'how the ledger was computed'),
  ],
  origin: { kind: 'derived_from_record', author: 'tools/reservoir-view-from-disposition.mjs over the two ledgers' },
};

const out = path.resolve(opt.out);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${[provenance, ...rows].map((row) => JSON.stringify(row)).join('\n')}\n`);
console.log(`reservoir-view-from-disposition: ${rows.length} rows (${issues.length} issues, ${rows.length - issues.length} research-bearing pull requests of ${prs.length}) -> ${path.relative(process.cwd(), out)}`);
