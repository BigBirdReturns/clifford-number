#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const args = new Set(process.argv.slice(2));
const mode = args.has('--apply') || process.env.M04B_DISPATCH_MODE === 'apply' ? 'apply' : 'dry-run';
const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY || process.env.M04B_REPOSITORY;
if (!repository) throw new Error('GITHUB_REPOSITORY or M04B_REPOSITORY is required');
if (mode === 'apply' && !token) throw new Error('GITHUB_TOKEN is required in apply mode');
const [owner, repo] = repository.split('/');
if (!owner || !repo) throw new Error(`invalid repository: ${repository}`);

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const plan = read('build/core-thesis/security-state-organism/issue-plan.json');
const work = read('data/project/security-state-work-packages.json');
const evidence = read('data/intake/security-state-organism-evidence-intake.json');
const manifest = read('build/core-thesis/security-state-organism/manifest.json');
const packageById = new Map(work.packages.map((x) => [x.package_id, x]));
const evidenceById = new Map(evidence.records.map((x) => [x.evidence_id, x]));
const api = 'https://api.github.com';
const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: token ? `Bearer ${token}` : undefined,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'clifford-number-m04b-integrity',
};
for (const key of Object.keys(headers)) if (headers[key] === undefined) delete headers[key];
const call = async (method, url, body) => {
  const response = await fetch(`${api}${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${url} ${response.status}: ${text.slice(0, 1000)}`);
  return text ? JSON.parse(text) : null;
};
const pages = async (url) => {
  const output = [];
  for (let page = 1; ; page += 1) {
    const rows = await call('GET', `${url}${url.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    output.push(...rows);
    if (rows.length < 100) return output;
  }
};
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const packetLink = (id) => `https://github.com/${repository}/blob/main/build/core-thesis/security-state-organism/packets/${encodeURIComponent(id)}.md`;
const programLink = `https://github.com/${repository}/blob/main/docs/security-state-organism-program.md`;
const atlasLink = `https://github.com/${repository}/blob/main/reports/core-thesis/security-state-organism/index.html`;

function issueBody(group) {
  const packets = group.package_ids.map((id) => packageById.get(id)).filter(Boolean);
  const evidenceIds = [...new Set(packets.flatMap((x) => x.evidence_record_ids))].sort();
  const evidenceLines = evidenceIds.map((id) => {
    const row = evidenceById.get(id);
    return `- [\`${id}\`](${row.source_url}) — ${row.source_title} · \`${row.evidence_status}\`; does not support: ${row.does_not_support.join('; ')}`;
  });
  return `<!-- m04b-organism:${group.issue_id}:v2 -->
# ${group.title}

${group.purpose}

## Assigned proof packets

${packets.map((x) => `- [\`${x.package_id}\`](${packetLink(x.package_id)}) — ${x.title} · \`${x.priority}\` · routing \`${x.routing.status}\` · synthetic assignment \`${x.routing.synthetic_assignment}\``).join('\n')}

## Source-bounded intake already attached

${evidenceLines.length ? evidenceLines.join('\n') : '- None. This lane begins at acquisition, identity, denominator, or methodological scope.'}

## Closure law

This lane closes only after every packet receives a source-explicit terminal state. Packet count, deterministic publication, shared capital, shared personnel, common customers, products, theaters, chronology, or vocabulary cannot assign organism membership, intent, coordination, coercion, extraction, control, or wrongdoing.

- [Program](${programLink})
- [Atlas](${atlasLink})
- Source fingerprint: \`${manifest.source_fingerprint}\`

\`\`\`text
promotes_to: candidate_only
graph_effect: none
conclusion_generated: false
estate_completion_claimed: false
synthetic_assignment: false
\`\`\``;
}

function estateBody(handoff) {
  const packet = packageById.get(handoff.package_id);
  const evidenceLines = packet.evidence_record_ids.map((id) => {
    const row = evidenceById.get(id);
    return `- [\`${id}\`](${row.source_url}) — ${row.source_title} · supports only: ${row.supports.join('; ')}`;
  });
  return `<!-- m04b-estate-handoff:${handoff.estate_id}:v2 -->
## M-04B integrity-repaired organism-proof handoff

- Package: [\`${packet.package_id}\`](${packetLink(packet.package_id)})
- Priority: \`${packet.priority}\` — ${packet.priority_basis}
- Routing: \`${packet.routing.status}\`
- Synthetic assignment: \`${packet.routing.synthetic_assignment}\`
- Selected entities: ${packet.entity_ids.length ? packet.entity_ids.map((x) => `\`${x}\``).join(', ') : 'none selected'}
- Selected organs: ${packet.organ_ids.length ? packet.organ_ids.map((x) => `\`${x}\``).join(', ') : 'none selected'}
- Selected lineage stages: ${packet.lineage_stage_ids.length ? packet.lineage_stage_ids.map((x) => `\`${x}\``).join(', ') : 'unresolved'}
- Selected theaters: ${packet.theater_ids.length ? packet.theater_ids.map((x) => `\`${x}\``).join(', ') : 'unresolved'}

**Proof question:** ${packet.proof_question}

**Falsifier:** ${packet.falsifier}

### Attached source-bounded intake

${evidenceLines.length ? evidenceLines.join('\n') : '- None yet.'}

The estate must produce an exact organ, transition, two-sided transfer, affected-population consequence, counterpower result, falsifier, bounded non-link, or named additional acquisition. Empty target fields remain unresolved; they are not backfilled for coverage.

\`\`\`text
promotes_to: candidate_only
graph_effect: none
conclusion_generated: false
estate_completion_claimed: false
synthetic_assignment: false
\`\`\``;
}

const receipt = {
  schema_version: 'm04b-dispatch-receipt@2',
  repository,
  mode,
  source_fingerprint: manifest.source_fingerprint,
  issue_plan_digest: digest(JSON.stringify(plan)),
  planned: { issues: plan.issues.length, estate_handoffs: plan.estate_handoffs.length },
  created: [],
  updated: [],
  reopened: [],
  unchanged: [],
  estate_comments_created: [],
  estate_comments_updated: [],
  estate_comments_unchanged: [],
  boundaries: work.boundaries,
};

if (mode === 'apply') {
  const issues = await pages(`/repos/${owner}/${repo}/issues?state=all`);
  for (const group of plan.issues) {
    const marker = `<!-- m04b-organism:${group.issue_id}:v2 -->`;
    const body = issueBody(group);
    let existing = issues.find((x) => !x.pull_request && String(x.body ?? '').includes(marker));
    if (!existing) {
      existing = await call('POST', `/repos/${owner}/${repo}/issues`, { title: group.title, body, labels: ['research'] });
      issues.push(existing);
      receipt.created.push(existing.number);
      continue;
    }
    const patch = {};
    if (existing.title !== group.title) patch.title = group.title;
    if (existing.body !== body) patch.body = body;
    if (existing.state !== 'open') { patch.state = 'open'; receipt.reopened.push(existing.number); }
    const labels = new Set((existing.labels ?? []).map((x) => typeof x === 'string' ? x : x.name));
    if (!labels.has('research')) patch.labels = [...labels, 'research'];
    if (Object.keys(patch).length) {
      await call('PATCH', `/repos/${owner}/${repo}/issues/${existing.number}`, patch);
      receipt.updated.push(existing.number);
    } else receipt.unchanged.push(existing.number);
  }
  for (const handoff of plan.estate_handoffs) {
    const marker = `<!-- m04b-estate-handoff:${handoff.estate_id}:v2 -->`;
    const body = estateBody(handoff);
    const comments = await pages(`/repos/${owner}/${repo}/issues/${handoff.issue_number}/comments?`);
    const existing = comments.find((x) => String(x.body ?? '').includes(marker));
    if (!existing) {
      await call('POST', `/repos/${owner}/${repo}/issues/${handoff.issue_number}/comments`, { body });
      receipt.estate_comments_created.push(handoff.issue_number);
    } else if (existing.body !== body) {
      await call('PATCH', `/repos/${owner}/${repo}/issues/comments/${existing.id}`, { body });
      receipt.estate_comments_updated.push(handoff.issue_number);
    } else receipt.estate_comments_unchanged.push(handoff.issue_number);
  }
}

fs.mkdirSync('build/core-thesis/security-state-organism', { recursive: true });
fs.writeFileSync('build/core-thesis/security-state-organism/dispatch-receipt.json', `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
