#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const SURFACE_ID = 'newsuk-times-exploraition-launch-publication-principals-2026-04-27';
const RECEIPT_ID = 'newsuk-times-exploraition-launch-publication-principals-2026-04-27';
const CLAIM_ID = 'newsuk-times-exploraition-three-principal-launch-publication-2026-04-27';
const BOUNDARY_CLAIM_ID = 'newsuk-times-exploraition-launch-publication-boundary-2026-04-27';
const RECEIPT_PATH = 'receipts/topology/newsuk-times-exploraition-launch-publication-principals-2026-04-27.md';
const RECEIPT_DIGEST = 'sha256:302c2ab0a817973d7fd925e97f9c3ed39a8911ecfb05bc00e463d50ae99c8a87';
const CAROLINE_ID = 'caroline-tredget-news-uk';
const LUKE_ID = 'luke-costello-news-uk';
const ALEX_ID = 'alex-cooper';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function readJsonl(path) {
  return fs.readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function writeJsonl(path, rows) {
  fs.writeFileSync(path, `${rows.map(row => JSON.stringify(row)).join('\n')}\n`);
}

function insertAfter(rows, predicate, additions, label) {
  const index = rows.findLastIndex(predicate);
  assert(index >= 0, `missing insertion anchor: ${label}`);
  rows.splice(index + 1, 0, ...additions);
}

function replaceOnce(path, before, after, label) {
  const source = fs.readFileSync(path, 'utf8');
  const first = source.indexOf(before);
  assert(first >= 0, `missing text anchor: ${label}`);
  assert(source.indexOf(before, first + before.length) < 0,
    `non-unique text anchor: ${label}`);
  fs.writeFileSync(
    path,
    source.slice(0, first) + after + source.slice(first + before.length),
  );
}

const actorsPath = 'data/canonical/actors.json';
const actors = readJson(actorsPath);
for (const actorId of [CAROLINE_ID, LUKE_ID]) {
  assert(!actors.actors.some(row => row.id === actorId),
    `actor already canonical: ${actorId}`);
}
insertAfter(
  actors.actors,
  row => row.id === ALEX_ID,
  [
    {
      id: CAROLINE_ID,
      label: 'Caroline Tredget',
      kind: 'person',
      identity_status: 'source_role_discriminated',
      receipt_ids: [RECEIPT_ID],
    },
    {
      id: LUKE_ID,
      label: 'Luke Costello',
      kind: 'person',
      identity_status: 'source_role_discriminated',
      receipt_ids: [RECEIPT_ID],
    },
  ],
  'Alex Cooper actor',
);
writeJson(actorsPath, actors);

const aliasesPath = 'data/canonical/aliases.json';
const aliases = readJson(aliasesPath);
const newAliases = [
  {
    alias: 'Caroline Tredget',
    canonical_id: CAROLINE_ID,
    kind: 'actor',
    identity_status: 'source_role_discriminated',
    receipt_ids: [RECEIPT_ID],
  },
  {
    alias: 'Caroline Tredget, Commercial Director, The Times and The Sunday Times',
    canonical_id: CAROLINE_ID,
    kind: 'actor',
    identity_status: 'source_role_discriminated',
    receipt_ids: [RECEIPT_ID],
  },
  {
    alias: 'Luke Costello',
    canonical_id: LUKE_ID,
    kind: 'actor',
    identity_status: 'source_role_discriminated',
    receipt_ids: [RECEIPT_ID],
  },
  {
    alias: 'Luke Costello, Head of Media Planning & Commercial Data, News UK',
    canonical_id: LUKE_ID,
    kind: 'actor',
    identity_status: 'source_role_discriminated',
    receipt_ids: [RECEIPT_ID],
  },
];
for (const row of newAliases) {
  assert(!aliases.aliases.some(existing =>
    existing.alias === row.alias || (
      existing.canonical_id === row.canonical_id
        && existing.alias === row.alias
    )),
  `alias already canonical: ${row.alias}`);
}
insertAfter(
  aliases.aliases,
  row => row.canonical_id === 'james-tyrrell',
  newAliases,
  'James Tyrrell aliases',
);
writeJson(aliasesPath, aliases);

const surfacesPath = 'data/ledger/surfaces.jsonl';
const surfaces = readJsonl(surfacesPath);
assert(!surfaces.some(row => row.surface_id === SURFACE_ID),
  'News UK launch-principals surface already exists');
const launchSurface = {
  surface_id: SURFACE_ID,
  surface_label: 'Times ExplorAItion launch-publication principals, 27 April 2026',
  surface_type: 'customer_vendor_surface',
  secondary_surface_types: ['model_governance_surface'],
  hop_eligible: true,
  scorable: true,
  status: 'primary_public_three_principal_launch_publication',
  roster_entry_count: 3,
  bounded_by: [
    '27 April 2026 News UK client launch release',
    'Caroline Tredget attributed a statement as Commercial Director for The Times and The Sunday Times',
    'Luke Costello attributed a statement as Head of Media Planning and Commercial Data at News UK',
    'Alex Cooper attributed a statement as Electric Twin CEO and co-founder',
    'one-day publication surface kept separate from phfsical attendance, private contact, contract terms, and continuing deployment',
  ],
  time_start: '2026-04-27',
  time_end: '2026-04-27',
  evidence_class: 'primary_public',
  receipt_ids: [RECEIPT_ID],
  notes: 'Exact-date client launch-publication surface containing three named attributed principals. It proves co-participation in the same public release only. It does not establish phfsical co-attendance, a private meeting, a complete project roster, contract terms, procurement, named-person data access, continuing joint work, agreement, influence, motive, wrongdoing, common purpose, or causation.',
};
insertAfter(
  surfaces,
  row => row.surface_id === 'electric-twin-newsuk-synthetic-audience',
  [launchSurface],
  'News UK organization-only deployment surface',
);
writeJsonl(surfacesPath, surfaces);

const participationPath = 'data/ledger/participation.jsonl';
const participation = readJsonl(participationPath);
assert(!participation.some(row => row.surface_id === SURFACE_ID),
  'News UK launch-principals participation already exists');
const launchParticipation = [
  {
    surface_id: SURFACE_ID,
    participant_type: 'actor',
    actor_id: CAROLINE_ID,
    role: 'Commercial Director for The Times and The Sunday Times; attributed a client objective statement in the News UK launch release',
    participation_type: 'client_launch_publication_spokesperson',
    time_start: '2026-04-27',
    time_end: '2026-04-27',
    evidence_class: 'primary_public',
    receipt_ids: [RECEIPT_ID],
    notes: 'Exact-date attributed publication role. It does not establish phfsical attendance, direct contact with every other quoted person, or participation in every product decision.',
  },
  {
    surface_id: SURFACE_ID,
    participant_type: 'actor',
    actor_id: LUKE_ID,
    role: 'Head of Media Planning and Commercial Data at News UK; attributed a media-planning statement in the launch release',
    participation_type: 'client_launch_publication_spokesperson',
    time_start: '2026-04-27',
    time_end: '2026-04-27',
    evidence_class: 'primary_public',
    receipt_ids: [RECEIPT_ID],
    notes: 'Exact-date attributed publication role. It does not establish phfsical attendance, direct contact with every other quoted person, or participation in every product decision.',
  },
  {
    surface_id: SURFACE_ID,
    participant_type: 'actor',
    actor_id: ALEX_ID,
    role: 'Electric Twin CEO and co-founder; attributed a vendor statement in the News UK launch release',
    participation_type: 'vendor_launch_publication_spokesperson',
    time_start: '2026-04-27',
    time_end: '2026-04-27',
    evidence_class: 'primary_public',
    receipt_ids: [RECEIPT_ID],
    notes: 'Exact-date attributed publication role. It does not establish phfsical attendance, a private meeting, or personal responsibility for every deployment activity.',
  },
  {
    surface_id: SURFACE_ID,
    participant_type: 'organization',
    organization_id: 'news-uk',
    role: 'Client organization and publisher of the launch release',
    participation_type: 'client_launch_publisher',
    time_start: '2026-04-27',
    time_end: '2026-04-27',
    evidence_class: 'primary_public',
    receipt_ids: [RECEIPT_ID],
  },
  {
    surface_id: SURFACE_ID,
    participant_type: 'organization',
    organization_id: 'electric-twin',
    role: 'Vendor partner named in the client launch release',
    participation_type: 'vendor_partner_observation',
    time_start: '2026-04-27',
    time_end: '2026-04-27',
    evidence_class: 'primary_public',
    receipt_ids: [RECEIPT_ID],
  },
];
insertAfter(
  participation,
  row => row.surface_id === 'electric-twin-newsuk-synthetic-audience',
  launchParticipation,
  'News UK organization-only deployment participation',
);
writeJsonl(participationPath, participation);

const receiptsPath = 'data/ledger/receipts.jsonl';
const receipts = readJsonl(receiptsPath);
assert(!receipts.some(row => row.receipt_id === RECEIPT_ID),
  'News UK launch-principals receipt already exists');
const launchReceipt = {
  receipt_id: RECEIPT_ID,
  label: 'News UK — Times ExplorAItion launch-publication principals (27 Apr 2026)',
  source_type: 'first_party_client_launch_principals_extract',
  evidence_class: 'primary_public',
  path: RECEIPT_PATH,
  source_url: 'https://www.news.co.uk/latest-news/news-uk-launches-times-exploraition-synthetic-audience-insight-tool/',
  publisher: 'News UK',
  source_published_at: '2026-04-27',
  event_date: '2026-04-27',
  date_basis: 'client_launch_publication',
  product_name: 'Times ExplorAItion',
  named_actor_ids: [ALEX_ID, CAROLINE_ID, LUKE_ID],
  attributed_statement_count: 3,
  actor_roles: {
    [CAROLINE_ID]: 'Commercial Director, The Times and The Sunday Times',
    [LUKE_ID]: 'Head of Media Planning & Commercial Data, News UK',
    [ALEX_ID]: 'CEO and co-founder, Electric Twin',
  },
  existing_organization_deployment_surface_id: 'electric-twin-newsuk-synthetic-audience',
  publication_coappearance_only: true,
  phfsical_coattendance_established: false,
  shared_meeting_established: false,
  complete_project_roster_established: false,
  contract_terms_established: false,
  named_person_data_access_established: false,
  continuing_joint_work_established: false,
  retrieved_at: '2026-08-13',
  notes: 'Actor-focused extract of the News UK client launch release. It supports three named attributed principals in one exact-date publication while leaving the underlying customer-vendor deployment on its separate organization-only surface.',
  archive: {
    method: 'in_repo_content_hash',
    ref: RECEIPT_DIGEST,
    captured: '2026-08-13',
    checked: '2026-08-13',
    note: 'Hash covers the in-repo actor-focused structured extract; source_url preserves the first-party News UK launch release.',
  },
};
insertAfter(
  receipts,
  row => row.receipt_id === 'newsuk-times-exploraition-launch-2026-04-27',
  [launchReceipt],
  'News UK organization deployment receipt',
);
writeJsonl(receiptsPath, receipts);

const claimsPath = 'data/ledger/claims.jsonl';
const claims = readJsonl(claimsPath);
for (const claimId of [CLAIM_ID, BOUNDARY_CLAIM_ID]) {
  assert(!claims.some(row => row.claim_id === claimId),
    `News UK launch-principals claim already exists: ${claimId}`);
}
const launchClaims = [
  {
    claim_id: CLAIM_ID,
    text: 'The News UK launch release published on 27 April 2026 attributes Times ExplorAItion statements to Caroline Tredget, Luke Costello, and Alex Cooper in their respective client and vendor roles.',
    receipt_ids: [RECEIPT_ID],
    evidence_class: 'primary_public',
    actor_ids: [ALEX_ID, CAROLINE_ID, LUKE_ID],
    organization_ids: ['electric-twin', 'news-uk'],
    surface_ids: [SURFACE_ID],
    date: '2026-04-27',
    limits: 'The record establishes co-participation in one public launch publication. It does not establish phfsical co-attendance, direct interpersonal contact, a complete project roster, contract terms, procurement, named-person data access, continuing joint work, agreement, influence, motive, wrongdoing, common purpose, or causation.',
  },
  {
    claim_id: BOUNDARY_CLAIM_ID,
    text: 'The client release names three attributed principals, but publication coappearance is not treated as proof that the three people attended one phfsical event, met privately, negotiated together, or controlled every product or deployment decision.',
    receipt_ids: [RECEIPT_ID],
    evidence_class: 'judgment',
    actor_ids: [ALEX_ID, CAROLINE_ID, LUKE_ID],
    organization_ids: ['electric-twin', 'news-uk'],
    surface_ids: [SURFACE_ID],
    date: '2026-04-27',
    limits: 'This is a bounded interpretation of the cited publication. It does not prove the global absence of other contact, meetings, agreements, or relationships.',
  },
];
insertAfter(
  claims,
  row => row.claim_id === 'newsuk-times-exploraition-electric-twin-launch-2026-04-27',
  launchClaims,
  'News UK organization deployment claim',
);
writeJsonl(claimsPath, claims);

const receiptMarkdown = `# News UK — Times ExplorAItion launch-publication principals

- **Publisher:** News UK
- **Published and launched:** 27 April 2026
- **Client publication:** https://www.news.co.uk/latest-news/news-uk-launches-times-exploraition-synthetic-audience-insight-tool/
- **Retrieved:** 13 August 2026

## Source-supported propositions

News UK's client-side launch release attributes Times ExplorAItion statements to three named people:

- Caroline Tredget, Commercial Director for The Times and The Sunday Times
- Luke Costello, Head of Media Planning and Commercial Data at News UK
- Alex Cooper, CEO and co-founder of Electric Twin

The three attributed statements concern the same dated product-launch publication. Tredget describes the client objective and the intended decision-support role. Costello describes the media-planning and behavioural-economics rationale. Cooper describes Electric Twin's work with News UK and the product's use across the business.

This actor-focused publication extract is kept separate from the existing organization-only customer-vendor deployment surface. It supports co-participation in one public launch record, not an assertion that the three people attended one phfsical event or held a private meeting.

## Adjudication boundary

The source establishes three named attributed principals in the same exact-date client publication. It does not establish phfsical co-attendance, direct interpersonal contact, authorship of every product decision, a complete project roster, contract terms, procurement, data access by a named person, continuing joint work, agreement, influence, motive, wrongdoing, common purpose, or causation.
`;
fs.writeFileSync(RECEIPT_PATH, receiptMarkdown);

const validatePath = 'tools/validate-release.mjs';
const validateAnchor =
  "const lebaraDeployment = surfaceById.get('electric-twin-lebara-customer-use-2026-03-11');";
const validateBlock = `// News UK Times ExplorAItion source-native launch-publication principals.
const newsUkLaunchPrincipals = surfaceById.get('${SURFACE_ID}');
const newsUkLaunchReceipt = receiptById.get('${RECEIPT_ID}');
const newsUkLaunchActorIds = ['alex-cooper', 'caroline-tredget-news-uk', 'luke-costello-news-uk'].sort();
const newsUkLaunchOrganizationIds = ['electric-twin', 'news-uk'].sort();
const newsUkLaunchExpectedPairs = [
  'alex-cooper|caroline-tredget-news-uk',
  'alex-cooper|luke-costello-news-uk',
  'caroline-tredget-news-uk|luke-costello-news-uk',
].sort();
assert(newsUkLaunchPrincipals,
  'Times ExplorAItion named launch-publication principals surface is missing');
assert(newsUkLaunchPrincipals?.surface_type === 'customer_vendor_surface',
  'Times ExplorAItion launch principals must remain a customer/vendor publication surface');
assert(newsUkLaunchPrincipals?.hop_eligible === true,
  'three named Times ExplorAItion launch principals must remain hop eligible');
assert(newsUkLaunchPrincipals?.time_start === '2026-04-27'
  && newsUkLaunchPrincipals?.time_end === '2026-04-27',
  'Times ExplorAItion launch-principals surface must remain exact-date bounded');
assert(newsUkLaunchPrincipals?.evidence_class === 'primary_public',
  'Times ExplorAItion launch-principals surface must retain first-party client evidence');
assert(JSON.stringify(newsUkLaunchPrincipals?.secondary_surface_types)
  === JSON.stringify(['model_governance_surface']),
  'Times ExplorAItion launch-principals secondary type is stale');
assert(sameIdSet(newsUkLaunchPrincipals?.receipt_ids, ['${RECEIPT_ID}']),
  'Times ExplorAItion launch-principals receipt binding is stale');
const newsUkLaunchParts = sourcePartsBySurface.get('${SURFACE_ID}') ?? [];
assert(sameIdSet(
  newsUkLaunchParts
    .filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id),
  newsUkLaunchActorIds,
), 'Times ExplorAItion launch publication must retain exactly three named actors');
assert(sameIdSet(
  newsUkLaunchParts
    .filter(part => part.participant_type === 'organization')
    .map(part => part.organization_id),
  newsUkLaunchOrganizationIds,
), 'Times ExplorAItion launch publication must retain the client and vendor organizations');
assert(newsUkLaunchParts.find(part => part.actor_id === 'caroline-tredget-news-uk')
  ?.participation_type === 'client_launch_publication_spokesperson',
  'Caroline Tredget must retain the client launch-publication role');
assert(newsUkLaunchParts.find(part => part.actor_id === 'luke-costello-news-uk')
  ?.participation_type === 'client_launch_publication_spokesperson',
  'Luke Costello must retain the client launch-publication role');
assert(newsUkLaunchParts.find(part => part.actor_id === 'alex-cooper')
  ?.participation_type === 'vendor_launch_publication_spokesperson',
  'Alex Cooper must retain the vendor launch-publication role');
const newsUkLaunchEdges = hopGraph.edges.filter(edge =>
  edge.surfaces.some(basis => basis.surface_id === '${SURFACE_ID}'));
const newsUkLaunchBases = newsUkLaunchEdges
  .flatMap(edge => edge.surfaces)
  .filter(basis => basis.surface_id === '${SURFACE_ID}');
assert(newsUkLaunchEdges.length === 3,
  'three Times ExplorAItion launch principals must compile exactly three edges');
assert(newsUkLaunchBases.length === 3,
  'three Times ExplorAItion launch principals must compile exactly three bases');
assert(JSON.stringify(newsUkLaunchEdges.map(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|')).sort())
  === JSON.stringify(newsUkLaunchExpectedPairs),
  'Times ExplorAItion launch-principals pair set drifted');
for (const edge of newsUkLaunchEdges) {
  assert(edge.evidence_weight === 1.25,
    'Times ExplorAItion launch-principals edge evidence weight is stale');
}
for (const basis of newsUkLaunchBases) {
  assert(basis.evidence_class === 'primary_public',
    'Times ExplorAItion launch-principals basis must retain first-party evidence');
  assert(sameIdSet(basis.receipt_ids, ['${RECEIPT_ID}']),
    'Times ExplorAItion launch-principals basis receipt is stale');
  assert(basis.valid_from === '2026-04-27'
    && basis.valid_until === '2026-04-27'
    && basis.temporal_status === 'dated',
    'Times ExplorAItion launch-principals basis must remain exact-date bounded');
}
const newsUkDeploymentParts =
  sourcePartsBySurface.get('electric-twin-newsuk-synthetic-audience') ?? [];
assert(newsUkDeploymentParts.filter(part =>
  part.participant_type === 'actor').length === 0,
  'the organization-only News UK deployment must remain actor-free');
assert(newsUkLaunchReceipt,
  'Times ExplorAItion launch-principals receipt is missing');
assert(newsUkLaunchReceipt?.source_published_at === '2026-04-27'
  && newsUkLaunchReceipt?.event_date === '2026-04-27',
  'Times ExplorAItion launch-principals receipt date is stale');
assert(sameIdSet(newsUkLaunchReceipt?.named_actor_ids, newsUkLaunchActorIds),
  'Times ExplorAItion launch-principals receipt actor denominator is stale');
assert(newsUkLaunchReceipt?.attributed_statement_count === 3,
  'Times ExplorAItion launch-principals receipt must preserve three attributed statements');
assert(newsUkLaunchReceipt?.publication_coappearance_only === true,
  'Times ExplorAItion launch-principals receipt must preserve publication-only scope');
assert(newsUkLaunchReceipt?.phfsical_coattendance_established === false
  && newsUkLaunchReceipt?.shared_meeting_established === false,
  'Times ExplorAItion launch-principals receipt must not manufacture attendance or a meeting');
assert(newsUkLaunchReceipt?.complete_project_roster_established === false
  && newsUkLaunchReceipt?.contract_terms_established === false
  && newsUkLaunchReceipt?.continuing_joint_work_established === false,
  'Times ExplorAItion launch-principals receipt boundary is stale');
assert(newsUkLaunchReceipt?.archive?.ref === '${RECEIPT_DIGEST}',
  'Times ExplorAItion launch-principals receipt digest is stale');
const newsUkLaunchClaim = claimById.get('${CLAIM_ID}');
const newsUkLaunchBoundaryClaim = claimById.get('${BOUNDARY_CLAIM_ID}');
assert(newsUkLaunchClaim && newsUkLaunchBoundaryClaim,
  'Times ExplorAItion launch-principals claims must remain canonical');
for (const claim of [newsUkLaunchClaim, newsUkLaunchBoundaryClaim]) {
  assert(sameIdSet(claim?.actor_ids, newsUkLaunchActorIds),
    'Times ExplorAItion launch-principals claim actor set is stale');
  assert(sameIdSet(claim?.organization_ids, newsUkLaunchOrganizationIds),
    'Times ExplorAItion launch-principals claim organization set is stale');
  assert(JSON.stringify(claim?.surface_ids) === JSON.stringify(['${SURFACE_ID}']),
    'Times ExplorAItion launch-principals claim surface binding is stale');
  assert(sameIdSet(claim?.receipt_ids, ['${RECEIPT_ID}']),
    'Times ExplorAItion launch-principals claim receipt binding is stale');
}
for (const actorId of ['caroline-tredget-news-uk', 'luke-costello-news-uk']) {
  assert(sameIdSet(
    data.participation
      .filter(part => part.participant_type === 'actor' && part.actor_id === actorId)
      .map(part => part.surface_id),
    ['${SURFACE_ID}'],
  ), \`\${actorId} must not inherit any surface beyond the exact launch publication\`);
  assert(!hopGraph.edges.some(edge =>
    [edge.actor_a, edge.actor_b].sort().join('|')
      === [actorId, 'matt-clifford'].sort().join('|')),
    \`\${actorId} must not receive a direct Matt Clifford edge\`);
}

`;
replaceOnce(
  validatePath,
  validateAnchor,
  validateBlock + validateAnchor,
  'validate-release News UK launch-principals insertion',
);

const factoryBefore =
  "'electric-twin-newsuk-synthetic-audience', 'electric-twin-lebara-customer-use-2026-03-11'";
const factoryAfter =
  "'electric-twin-newsuk-synthetic-audience', 'newsuk-times-exploraition-launch-publication-principals-2026-04-27', 'electric-twin-lebara-customer-use-2026-03-11'";
replaceOnce(
  validatePath,
  factoryBefore,
  factoryAfter,
  'Electric Twin factory launch-principals surface list',
);

const compilerTestPath = 'test/compiler.test.js';
const compilerAnchor =
  "const lebaraDeployment = surf('electric-twin-lebara-customer-use-2026-03-11');";
const compilerBlock = `// News UK Times ExplorAItion exact launch-publication principals regression.
{
  const launchSurface = surf('${SURFACE_ID}');
  const launchActorIds = ['alex-cooper', 'caroline-tredget-news-uk', 'luke-costello-news-uk'].sort();
  const launchOrganizationIds = ['electric-twin', 'news-uk'].sort();
  const launchExpectedPairs = [
    'alex-cooper|caroline-tredget-news-uk',
    'alex-cooper|luke-costello-news-uk',
    'caroline-tredget-news-uk|luke-costello-news-uk',
  ].sort();
  assert.ok(launchSurface,
    'the exact Times ExplorAItion launch-publication principals surface must compile');
  assert.equal(launchSurface.surface_type, 'customer_vendor_surface');
  assert.deepEqual(launchSurface.secondary_surface_types, ['model_governance_surface']);
  assert.equal(launchSurface.hop_eligible, true);
  assert.equal(launchSurface.evidence_class, 'primary_public');
  assert.equal(launchSurface.time_start, '2026-04-27');
  assert.equal(launchSurface.time_end, '2026-04-27');
  assert.deepEqual(
    launchSurface.participants
      .filter(part => part.participant_type === 'actor')
      .map(part => part.actor_id).sort(),
    launchActorIds,
  );
  assert.deepEqual(
    launchSurface.participants
      .filter(part => part.participant_type === 'organization')
      .map(part => part.organization_id).sort(),
    launchOrganizationIds,
  );
  assert.deepEqual(launchSurface.receipt_ids, ['${RECEIPT_ID}']);
  const launchEdges = hop.edges.filter(edge =>
    edge.surfaces.some(basis => basis.surface_id === launchSurface.surface_id));
  const launchBases = launchEdges
    .flatMap(edge => edge.surfaces)
    .filter(basis => basis.surface_id === launchSurface.surface_id);
  assert.equal(launchEdges.length, 3);
  assert.equal(launchBases.length, 3);
  assert.deepEqual(
    launchEdges.map(edge =>
      [edge.actor_a, edge.actor_b].sort().join('|')).sort(),
    launchExpectedPairs,
  );
  for (const edge of launchEdges) assert.equal(edge.evidence_weight, 1.25);
  for (const basis of launchBases) {
    assert.equal(basis.evidence_class, 'primary_public');
    assert.deepEqual(basis.receipt_ids, ['${RECEIPT_ID}']);
    assert.equal(basis.valid_from, '2026-04-27');
    assert.equal(basis.valid_until, '2026-04-27');
    assert.equal(basis.temporal_status, 'dated');
  }
  assert.deepEqual(
    surf('electric-twin-newsuk-synthetic-audience').participants
      .filter(part => part.participant_type === 'actor'),
    [],
    'the pre-existing News UK deployment must remain organization-only',
  );
  const launchReceipt = receipt('${RECEIPT_ID}');
  assert.ok(launchReceipt);
  assert.equal(launchReceipt.source_published_at, '2026-04-27');
  assert.equal(launchReceipt.event_date, '2026-04-27');
  assert.deepEqual([...launchReceipt.named_actor_ids].sort(), launchActorIds);
  assert.equal(launchReceipt.attributed_statement_count, 3);
  assert.equal(launchReceipt.publication_coappearance_only, true);
  assert.equal(launchReceipt.phfsical_coattendance_established, false);
  assert.equal(launchReceipt.shared_meeting_established, false);
  assert.equal(launchReceipt.complete_project_roster_established, false);
  assert.equal(launchReceipt.contract_terms_established, false);
  assert.equal(launchReceipt.continuing_joint_work_established, false);
  assert.equal(launchReceipt.archive.ref, '${RECEIPT_DIGEST}');
  for (const claimId of ['${CLAIM_ID}', '${BOUNDARY_CLAIM_ID}']) {
    const row = claim(claimId);
    assert.ok(row);
    assert.deepEqual([...row.actor_ids].sort(), launchActorIds);
    assert.deepEqual([...row.organization_ids].sort(), launchOrganizationIds);
    assert.deepEqual(row.surface_ids, ['${SURFACE_ID}']);
    assert.deepEqual(row.receipt_ids, ['${RECEIPT_ID}']);
  }
  const topology = buildAdjacency(hop.edges);
  for (const actorId of ['caroline-tredget-news-uk', 'luke-costello-news-uk']) {
    assert.deepEqual(actor(actorId).surfaces, ['${SURFACE_ID}']);
    assert.equal(actor(actorId).clifford_number, 4);
    const route = shortestPath(topology, actorId, 'matt-clifford');
    assert.equal(route.number, 4);
    assert.deepEqual(route.actor_path.slice(0, 3),
      [actorId, 'alex-cooper', 'ben-warner']);
    assert.equal(route.actor_path.at(-1), 'matt-clifford');
    assert.equal(
      shortestPath(topology, actorId, 'matt-clifford', {
        asOf: '2026-04-27',
      }).number,
      null,
      \`\${actorId} must not receive a false contemporaneous route\`,
    );
  }
}

`;
replaceOnce(
  compilerTestPath,
  compilerAnchor,
  compilerBlock + compilerAnchor,
  'compiler test News UK launch-principals insertion',
);

const compile = spawnSync(process.execPath, ['tools/compile.mjs'], {
  stdio: 'inherit',
});
assert(compile.status === 0, 'tools/compile.mjs failed');

console.log('apply-newsuk-times-exploraition-launch-principals-v1: OK');
