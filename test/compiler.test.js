import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { buildAdjacency, shortestPath } from '../tools/lib/hops.mjs';

function run(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error(res.stdout);
    console.error(res.stderr);
  }
  assert.equal(res.status, 0, `${cmd} ${args.join(' ')} failed`);
  return res;
}

run(process.execPath, ['tools/compile.mjs']);
run(process.execPath, ['tools/validate-release.mjs']);
run(process.execPath, ['test/reported-hop-evidence-upgrades.test.js']);

const hop = JSON.parse(fs.readFileSync('build/hop-graph.json', 'utf8'));
const surface = JSON.parse(fs.readFileSync('build/surface-graph.json', 'utf8'));
const scores = JSON.parse(fs.readFileSync('build/scores.json', 'utf8'));
const migration = JSON.parse(fs.readFileSync('build/migration-summary.json', 'utf8'));
const receiptGraph = JSON.parse(fs.readFileSync('build/receipt-graph.json', 'utf8'));
const legacyGraph = JSON.parse(fs.readFileSync('graph.json', 'utf8'));
const ledgerReceipts = fs.readFileSync('data/ledger/receipts.jsonl', 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
assert.equal(legacyGraph.subtitle, 'Seven degrees of UK AI policy topology, with receipts.');

const actor = id => scores.actors.find(a => a.actor_id === id);
const org = id => scores.organizations.find(o => o.organization_id === id);
const surf = id => surface.surfaces.find(s => s.surface_id === id);
const receipt = id => ledgerReceipts.find(row => row.receipt_id === id);
const claim = id => receiptGraph.claims.find(row => row.claim_id === id);


// Dialog directory, role, and invitation boundary regression.
assert.equal(surf('dialog-society-membership'), undefined,
  'the mixed open-ended Dialog composite must be retired');
const dialogDirectory = surf('dialog-public-directory-exposure-2026-06-16');
const dialogLeadership = surf('dialog-leadership-role-observations-2026-06-16');
const dialogInvitation = surf('dialog-matt-clifford-invitation-nonattendance-2026-06-16');
assert.ok(dialogDirectory && dialogLeadership && dialogInvitation,
  'all three bounded Dialog propositions must compile');
assert.equal(dialogDirectory.hop_eligible, false);
assert.equal(dialogDirectory.hop_refusal_reason, 'dense_directory_listing_not_shared_participation');
assert.equal(dialogDirectory.time_start, '2026-06-16');
assert.equal(dialogDirectory.time_end, '2026-06-16');
const dialogDirectoryActors = dialogDirectory.participants
  .filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id);
assert.equal(dialogDirectoryActors.length, 112);
assert.ok(dialogDirectoryActors.includes('matt-clifford'));
assert.deepEqual(
  dialogLeadership.participants.filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id).sort(),
  ['auren-hoffman', 'peter-thiel', 'raffi-grinberg'],
);
assert.equal(dialogLeadership.hop_eligible, false);
assert.equal(dialogLeadership.hop_refusal_reason, 'reported_role_observations_not_shared_event');
assert.deepEqual(
  dialogInvitation.participants.filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id),
  ['matt-clifford'],
);
assert.equal(dialogInvitation.hop_eligible, false);
assert.equal(dialogInvitation.hop_refusal_reason, 'invitation_without_attendance_or_membership');
for (const dialogSurface of [dialogDirectory, dialogLeadership, dialogInvitation]) {
  assert.ok((hop.rejected_hop_surfaces ?? []).some(row =>
    row.surface_id === dialogSurface.surface_id
      && row.reason === dialogSurface.hop_refusal_reason));
  assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis =>
    basis.surface_id === dialogSurface.surface_id)));
}
const dialogBoundaryClaim = claim('dialog-matt-clifford-peter-thiel-boundary-2026-06-16');
assert.ok(dialogBoundaryClaim,
  'the Clifford/Thiel Dialog refusal must remain public');
assert.deepEqual([...dialogBoundaryClaim.actor_ids].sort(), ['matt-clifford', 'peter-thiel']);
assert.equal(receipt('dialog-human-layer'), undefined,
  'the local Dialog analysis note must not remain a live canonical receipt');
assert.equal(receipt('wired-dialog-leak').source_published_at, '2026-06-16');
assert.equal(receipt('wired-dialog-leak').matt_clifford_reported_invited, true);
assert.equal(receipt('wired-dialog-leak').matt_clifford_reported_never_attended, true);
assert.equal(receipt('wired-dialog-leak').archive.ref, 'sha256:5648e648af1db7c30a679adb918f5f2c5122e832ca57b3c612f219c380c652a6');
assert.equal(receipt('dialog-directory-extract').directory_listing_count, 112);
assert.equal(receipt('dialog-directory-extract').archive.ref, 'sha256:02bb38b250f66b6cc355176fd3d4d375bcb695b1a351bbc88ca0e37ac5200956');

// LocalGlobe organization-endpoint refusal regression.
const electricTwinNamedAngelRound = surf('electric-twin-seed-round-2026-02-11');
const electricTwinInstitutionalRound = surf(
  'electric-twin-seed-round-institutional-investors-2026-02-11',
);
assert.ok(electricTwinNamedAngelRound,
  'the named-angel Electric Twin seed-round surface must compile');
assert.equal(electricTwinNamedAngelRound.hop_eligible, true);
assert.deepEqual(
  electricTwinNamedAngelRound.participants
    .filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id)
    .sort(),
  ['cal-henderson', 'eric-salama', 'louis-mosley', 'marc-andreessen', 'tom-shinner'],
  'the hop-eligible round must contain only the five named natural-person investors',
);
assert.ok(electricTwinInstitutionalRound,
  'the institutional Electric Twin seed-round refusal surface must compile');
assert.equal(electricTwinInstitutionalRound.hop_eligible, false);
assert.equal(
  electricTwinInstitutionalRound.hop_refusal_reason,
  'organization_only_evidence',
);
assert.deepEqual(
  electricTwinInstitutionalRound.participants
    .filter(part => part.participant_type === 'organization')
    .map(part => part.organization_id)
    .sort(),
  ['atomico', 'electric-twin', 'localglobe', 'mercuri', 'samos'],
  'the refusal surface must preserve the issuer and four institutional investors',
);
const institutionalRoundParticipant = id =>
  electricTwinInstitutionalRound.participants.find(
    part => part.organization_id === id,
  );
for (const id of ['electric-twin', 'atomico', 'localglobe', 'mercuri', 'samos']) {
  assert.equal(institutionalRoundParticipant(id).evidence_class, 'primary_public',
    `${id} must retain first-party institutional evidence`);
}
assert.deepEqual(
  institutionalRoundParticipant('samos').receipt_ids,
  ['alex-cooper-linkedin-electric-twin-funding-2026-02-12'],
  'Samos must use the first-party founder receipt without creating an actor endpoint',
);
assert.deepEqual(
  electricTwinInstitutionalRound.participants
    .filter(part => part.participant_type === 'actor'),
  [],
  'organization-only evidence must not be rewritten as actor participation',
);
assert.ok((hop.rejected_hop_surfaces ?? []).some(
  row => row.surface_id === electricTwinInstitutionalRound.surface_id
    && row.reason === 'organization_only_evidence',
), 'the public graph must expose the organization-only refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(
  basis => basis.surface_id === electricTwinInstitutionalRound.surface_id,
)), 'the institutional surface must never become a hop basis');
assert.equal(
  hop.edges
    .flatMap(edge => edge.surfaces)
    .filter(basis => basis.surface_id === electricTwinNamedAngelRound.surface_id)
    .length,
  10,
  'five named angel investors must retain exactly ten pairwise hop bases',
);
assert.ok(!actor('saul-klein').surfaces.includes(electricTwinNamedAngelRound.surface_id),
  'Saul Klein must not be substituted for LocalGlobe on the named-angel round');
assert.ok(!actor('saul-klein').surfaces.includes(electricTwinInstitutionalRound.surface_id),
  'Saul Klein must not be projected onto the institutional refusal surface');
assert.deepEqual(
  actor('saul-klein').surfaces
    .filter(surfaceId => surfaceId.startsWith('faculty-science-'))
    .sort(),
  [
    'faculty-science-director-shareholder-overlap-2024-10-10',
    'faculty-science-officer-employee-overlap-2018-01-24',
  ],
  'the independently receipted Faculty surfaces must remain intact',
);
const localGlobeActorBoundaryClaim = claim(
  'electric-twin-localglobe-saul-klein-actor-boundary-2026-02-12',
);
assert.ok(localGlobeActorBoundaryClaim,
  'the person-substitution refusal must remain public and graph-inert');
assert.deepEqual(
  localGlobeActorBoundaryClaim.surface_ids,
  ['electric-twin-seed-round-institutional-investors-2026-02-11'],
);

// Centre for Human Progress formal officer surface and adviser-boundary regression.
const centreFormationSurface = surf('centre-human-progress-director-appointments-2025-08-05');
const centreActorIds = [
  'ben-warner',
  'dennis-snower',
  'michael-muthukrishna',
  'sonja-vogt',
  'stephanie-salgado-muthukrishna',
];
assert.ok(centreFormationSurface,
  'the Centre for Human Progress same-day director surface must compile');
assert.equal(centreFormationSurface.hop_eligible, true);
assert.equal(centreFormationSurface.evidence_class, 'official');
assert.equal(centreFormationSurface.time_start, '2025-08-05');
assert.equal(centreFormationSurface.time_end, '2025-08-05');
assert.deepEqual(
  centreFormationSurface.participants
    .filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id)
    .sort(),
  centreActorIds,
  'the complete five-person official director roster must remain intact',
);
assert.deepEqual(
  centreFormationSurface.participants
    .filter(part => part.participant_type === 'organization')
    .map(part => part.organization_id),
  ['centre-for-human-progress'],
);
assert.deepEqual(
  centreFormationSurface.receipt_ids,
  ['companies-house-centre-human-progress-directors-16630851'],
);
assert.equal(
  hop.edges
    .flatMap(edge => edge.surfaces)
    .filter(basis => basis.surface_id === centreFormationSurface.surface_id)
    .length,
  10,
  'five same-day director appointments must create exactly ten formal officer bases',
);
const centreBenMichaelEdge = hop.edges.find(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|') === 'ben-warner|michael-muthukrishna');
assert.ok(centreBenMichaelEdge,
  'Ben Warner and Michael Muthukrishna must connect on the official officer surface');
const centreBenMichaelBasis = centreBenMichaelEdge.surfaces.find(
  basis => basis.surface_id === centreFormationSurface.surface_id,
);
assert.ok(centreBenMichaelBasis);
assert.equal(centreBenMichaelBasis.evidence_class, 'official');
assert.equal(centreBenMichaelBasis.valid_from, '2025-08-05');
assert.equal(centreBenMichaelBasis.valid_until, '2025-08-05');
for (const actorId of centreActorIds) {
  assert.ok(actor(actorId)?.surfaces.includes(centreFormationSurface.surface_id),
    `${actorId} must retain the formal Centre officer surface`);
}
for (const actorId of [
  'dennis-snower',
  'sonja-vogt',
  'stephanie-salgado-muthukrishna',
]) {
  assert.deepEqual(actor(actorId)?.surfaces, [centreFormationSurface.surface_id],
    `${actorId} must not inherit an Electric Twin or validation surface`);
}

const muthukrishnaAdviserSurface = surf(
  'electric-twin-muthukrishna-science-adviser-observations-2024-2026',
);
assert.ok(muthukrishnaAdviserSurface,
  'the source-native Michael Muthukrishna adviser chronology must compile');
assert.equal(muthukrishnaAdviserSurface.hop_eligible, false);
assert.equal(
  muthukrishnaAdviserSurface.hop_refusal_reason,
  'single_actor_advisory_context_only',
);
assert.equal(muthukrishnaAdviserSurface.time_start, '2024-11-03');
assert.equal(muthukrishnaAdviserSurface.time_end, '2026-08-12');
assert.deepEqual(
  muthukrishnaAdviserSurface.participants
    .filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id),
  ['michael-muthukrishna'],
  'public adviser-role observations must not manufacture a second actor',
);
assert.deepEqual(
  muthukrishnaAdviserSurface.participants
    .filter(part => part.participant_type === 'organization')
    .map(part => part.organization_id),
  ['electric-twin'],
);
assert.ok(!muthukrishnaAdviserSurface.participants.some(part => part.actor_id === 'ben-warner'),
  'Centre co-directorship must not be copied onto the Electric Twin adviser chronology');
assert.ok((hop.rejected_hop_surfaces ?? []).some(row =>
  row.surface_id === muthukrishnaAdviserSurface.surface_id
    && row.reason === 'single_actor_advisory_context_only'),
  'the compiled graph must expose the single-actor adviser refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(
  basis => basis.surface_id === muthukrishnaAdviserSurface.surface_id,
)), 'the adviser chronology must never become a hop basis');

const centreOfficerReceipt = receipt('companies-house-centre-human-progress-directors-16630851');
assert.ok(centreOfficerReceipt, 'the official Centre officer receipt must exist');
assert.equal(centreOfficerReceipt.company_number, '16630851');
assert.equal(centreOfficerReceipt.event_date, '2025-08-05');
assert.equal(centreOfficerReceipt.active_officers_at_retrieval, 5);
assert.equal(centreOfficerReceipt.resigned_officers_at_retrieval, 0);
assert.deepEqual([...centreOfficerReceipt.director_actor_ids].sort(), centreActorIds);
assert.equal(
  centreOfficerReceipt.archive?.ref,
  'sha256:ca9783a742f55e58492546ca0d02be4bc8e9ac2a1fbb479d98cbf719688751f8',
);
const muthukrishnaAdviserReceipt = receipt(
  'electric-twin-lse-muthukrishna-adviser-observations-2024-2026',
);
assert.ok(muthukrishnaAdviserReceipt, 'the adviser chronology receipt must exist');
assert.equal(muthukrishnaAdviserReceipt.first_observed_at, '2024-11-03');
assert.equal(muthukrishnaAdviserReceipt.last_retrieved_at, '2026-08-12');
assert.equal(muthukrishnaAdviserReceipt.continuous_tenure_asserted, false);
assert.equal(muthukrishnaAdviserReceipt.validation_protocol_recovered, false);
assert.equal(
  muthukrishnaAdviserReceipt.archive?.ref,
  'sha256:26c4cde9ad87ea498b49068605bb63a6878b827c1a8c386bf7185c9950bf32b4',
);

const centreOfficerClaim = claim('centre-human-progress-five-director-appointments-2025-08-05');
assert.ok(centreOfficerClaim, 'the five-director official claim must remain public');
assert.deepEqual([...centreOfficerClaim.actor_ids].sort(), centreActorIds);
assert.deepEqual(centreOfficerClaim.surface_ids, [centreFormationSurface.surface_id]);
const muthukrishnaAdviserClaim = claim(
  'electric-twin-muthukrishna-adviser-role-observations-2024-2026',
);
assert.ok(muthukrishnaAdviserClaim,
  'the bounded adviser-role chronology must remain public and graph-inert');
assert.deepEqual(muthukrishnaAdviserClaim.actor_ids, ['michael-muthukrishna']);
assert.deepEqual(muthukrishnaAdviserClaim.surface_ids, [muthukrishnaAdviserSurface.surface_id]);


// Electric Twin accuracy-methodology authorship and independent-validation boundary.
const accuracyMethodologySurface = surf(
  'electric-twin-accuracy-methodology-publication-2026-02-11',
);
const accuracyAuthorIds = ['andrew-bailey-electric-twin', 'ben-warner'];
assert.ok(accuracyMethodologySurface,
  'the first-party Electric Twin accuracy-methodology article must compile');
assert.equal(accuracyMethodologySurface.hop_eligible, true);
assert.equal(accuracyMethodologySurface.evidence_class, 'primary_public');
assert.equal(accuracyMethodologySurface.time_start, '2026-02-11');
assert.equal(accuracyMethodologySurface.time_end, '2026-02-11');
assert.deepEqual(
  accuracyMethodologySurface.participants
    .filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id)
    .sort(),
  accuracyAuthorIds,
  'the publication surface must contain only the two named authors',
);
assert.deepEqual(
  accuracyMethodologySurface.participants
    .filter(part => part.participant_type === 'organization')
    .map(part => part.organization_id),
  ['electric-twin'],
);
assert.ok(!accuracyMethodologySurface.participants.some(
  part => part.actor_id === 'michael-muthukrishna',
), 'the LSE attribution must not manufacture Michael Muthukrishna study participation');
const accuracyAuthorEdge = hop.edges.find(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|')
    === 'andrew-bailey-electric-twin|ben-warner');
assert.ok(accuracyAuthorEdge,
  'Ben Warner and Andrew Bailey must connect through the named article authorship');
const accuracyAuthorBasis = accuracyAuthorEdge.surfaces.find(
  basis => basis.surface_id === accuracyMethodologySurface.surface_id,
);
assert.ok(accuracyAuthorBasis);
assert.equal(accuracyAuthorBasis.evidence_class, 'primary_public');
assert.equal(accuracyAuthorBasis.valid_from, '2026-02-11');
assert.equal(accuracyAuthorBasis.valid_until, '2026-02-11');
assert.equal(
  hop.edges.flatMap(edge => edge.surfaces)
    .filter(basis => basis.surface_id === accuracyMethodologySurface.surface_id).length,
  1,
  'two named authors must create exactly one publication basis',
);
assert.deepEqual(
  actor('andrew-bailey-electric-twin')?.surfaces,
  [accuracyMethodologySurface.surface_id],
  'the disambiguated Andrew Bailey actor must not inherit another surface',
);
assert.ok(!hop.edges.some(edge =>
  [edge.actor_a, edge.actor_b].includes('michael-muthukrishna')
  && edge.surfaces.some(basis => basis.surface_id === accuracyMethodologySurface.surface_id)
), 'the accuracy article must not create a Muthukrishna edge');

const accuracyMethodologyReceipt = receipt('electric-twin-accuracy-methodology-2026-02-11');
assert.ok(accuracyMethodologyReceipt,
  'the first-party accuracy-methodology receipt must exist');
assert.deepEqual(
  accuracyMethodologyReceipt.author_actor_ids,
  ['ben-warner', 'andrew-bailey-electric-twin'],
);
assert.equal(accuracyMethodologyReceipt.reported_one_minus_mae, 0.955);
assert.equal(accuracyMethodologyReceipt.reported_ndam, 0.92);
assert.equal(accuracyMethodologyReceipt.reported_persona_count, 11000);
assert.equal(accuracyMethodologyReceipt.external_validator_named_in_article, false);
assert.equal(accuracyMethodologyReceipt.independent_study_object_recovered, false);
assert.equal(
  accuracyMethodologyReceipt.archive?.ref,
  'sha256:0aeb99e82338eb5846182fecd804e6b73e6274c942b01aa49369221f028ad0f5',
);
const accuracyMethodologyClaim = claim(
  'electric-twin-accuracy-methodology-authors-2026-02-11',
);
assert.ok(accuracyMethodologyClaim);
assert.deepEqual([...accuracyMethodologyClaim.actor_ids].sort(), accuracyAuthorIds);
const independentValidationBoundaryClaim = claim(
  'electric-twin-independent-validation-publication-boundary-2026-02-11',
);
assert.ok(independentValidationBoundaryClaim,
  'the independent-validation participation boundary must remain public');
assert.deepEqual(independentValidationBoundaryClaim.actor_ids, ['michael-muthukrishna']);
assert.deepEqual(independentValidationBoundaryClaim.surface_ids, [accuracyMethodologySurface.surface_id]);

for (const retiredReceipt of [
  'warner-surface-audit-2026-06-29',
  'surface-architecture-spec-2026-06-29',
  'master-doc-v3',
  'times-case-electric-twin-2026',
  'businesscloud-electric-twin-founders',
  'companies-house-electric-twin',
  'guardian-faculty-sage',
]) {
  assert.equal(receipt(retiredReceipt), undefined,
    `${retiredReceipt} must remain retired after canonical-consumer audit`);
}
assert.ok(!ledgerReceipts.some(row => String(row.path ?? '').startsWith('/mnt/data/')),
  'canonical receipts must not point at AI-session scratch storage');
assert.ok(!ledgerReceipts.some(row => row.archive?.method === 'unrecoverable_local_paste'),
  'canonical receipts must not preserve unrecoverable local pastes as live evidence');
assert.equal(receiptGraph.receipts.length, ledgerReceipts.length,
  'compiled receipt graph must match the canonical receipt ledger');


assert.ok(!actor('ben-warner').surfaces.includes('electric-twin-newsuk-synthetic-audience'),
  'Ben Warner must not inherit the organization-only News UK deployment');
assert.ok(!actor('ben-warner').secondary_surface_types.includes('democratic_input_replacement'),
  'Ben Warner must not inherit a democratic-input classification from an organization-only category post');
const newsUkDeployment = surf('electric-twin-newsuk-synthetic-audience');
assert.ok(newsUkDeployment, 'the source-native News UK / Electric Twin deployment must compile');
assert.equal(newsUkDeployment.hop_eligible, false);
assert.equal(newsUkDeployment.hop_refusal_reason, 'organization_only_customer_vendor_deployment');
assert.equal(newsUkDeployment.time_start, '2026-04-27');
assert.equal(newsUkDeployment.time_end, '2026-04-27');
assert.deepEqual(newsUkDeployment.secondary_surface_types, ['model_governance_surface']);
assert.deepEqual(newsUkDeployment.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id), [],
  'the first-party launch records must not manufacture Ben Warner or another actor participant');
assert.deepEqual(newsUkDeployment.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id).sort(), ['electric-twin', 'news-uk']);
assert.deepEqual(newsUkDeployment.receipt_ids, ['newsuk-times-exploraition-launch-2026-04-27', 'electric-twin-times-exploraition-launch-2026-04-28']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row => row.surface_id === newsUkDeployment.surface_id && row.reason === 'organization_only_customer_vendor_deployment'),
  'compiled graph must expose the organization-only News UK refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === newsUkDeployment.surface_id)),
  'organization-only News UK deployment must never become a hop basis');
assert.equal(newsUkDeployment.participants.find(part => part.organization_id === 'news-uk').participation_type, 'client_product_operator_observation');
assert.equal(newsUkDeployment.participants.find(part => part.organization_id === 'electric-twin').participation_type, 'vendor_platform_provider_observation');
assert.equal(receipt('newsuk-times-exploraition-launch-2026-04-27').decision_support_not_replacement_claim, true);
assert.equal(receipt('electric-twin-times-exploraition-launch-2026-04-28').no_personal_data_claim, true);
assert.equal(receipt('sandhu-comment-newsuk-2026-06-29'), undefined,
  'the superseded lost News UK judgment receipt must be retired');
// News UK Times ExplorAItion exact launch-publication principals regression.
{
  const launchSurface = surf('newsuk-times-exploraition-launch-publication-principals-2026-04-27');
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
  assert.deepEqual(launchSurface.receipt_ids, ['newsuk-times-exploraition-launch-publication-principals-2026-04-27']);
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
    assert.deepEqual(basis.receipt_ids, ['newsuk-times-exploraition-launch-publication-principals-2026-04-27']);
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
  const launchReceipt = receipt('newsuk-times-exploraition-launch-publication-principals-2026-04-27');
  assert.ok(launchReceipt);
  assert.equal(launchReceipt.source_published_at, '2026-04-27');
  assert.equal(launchReceipt.event_date, '2026-04-27');
  assert.deepEqual([...launchReceipt.named_actor_ids].sort(), launchActorIds);
  assert.equal(launchReceipt.attributed_statement_count, 3);
  assert.equal(launchReceipt.publication_coappearance_only, true);
  assert.equal(launchReceipt.physical_coattendance_established, false);
  assert.equal(launchReceipt.shared_meeting_established, false);
  assert.equal(launchReceipt.complete_project_roster_established, false);
  assert.equal(launchReceipt.contract_terms_established, false);
  assert.equal(launchReceipt.continuing_joint_work_established, false);
  assert.equal(launchReceipt.archive.ref, 'sha256:302c2ab0a817973d7fd925e97f9c3ed39a8911ecfb05bc00e463d50ae99c8a87');
  for (const claimId of ['newsuk-times-exploraition-three-principal-launch-publication-2026-04-27', 'newsuk-times-exploraition-launch-publication-boundary-2026-04-27']) {
    const row = claim(claimId);
    assert.ok(row);
    assert.deepEqual([...row.actor_ids].sort(), launchActorIds);
    assert.deepEqual([...row.organization_ids].sort(), launchOrganizationIds);
    assert.deepEqual(row.surface_ids, ['newsuk-times-exploraition-launch-publication-principals-2026-04-27']);
    assert.deepEqual(row.receipt_ids, ['newsuk-times-exploraition-launch-publication-principals-2026-04-27']);
  }
  const topology = buildAdjacency(hop.edges);
  for (const actorId of ['caroline-tredget-news-uk', 'luke-costello-news-uk']) {
    assert.deepEqual(actor(actorId).surfaces, ['newsuk-times-exploraition-launch-publication-principals-2026-04-27']);
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
      `${actorId} must not receive a false contemporaneous route`,
    );
  }
}

const lebaraDeployment = surf('electric-twin-lebara-customer-use-2026-03-11');
assert.ok(lebaraDeployment,
  'the first-party Electric Twin / Lebara customer-use observation must compile');
assert.equal(lebaraDeployment.hop_eligible, false);
assert.equal(
  lebaraDeployment.hop_refusal_reason,
  'organization_only_customer_vendor_deployment',
);
assert.equal(lebaraDeployment.time_start, '2026-03-11');
assert.equal(lebaraDeployment.time_end, '2026-03-11');
assert.equal(lebaraDeployment.evidence_class, 'primary_public');
assert.deepEqual(lebaraDeployment.secondary_surface_types, ['model_governance_surface']);
assert.deepEqual(
  lebaraDeployment.participants
    .filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id),
  [],
  'the vendor-side Lebara observation must not manufacture an actor participant',
);
assert.deepEqual(
  lebaraDeployment.participants
    .filter(part => part.participant_type === 'organization')
    .map(part => part.organization_id)
    .sort(),
  ['electric-twin', 'lebara'],
  'the Lebara observation must preserve exactly the vendor and source-name client',
);
assert.equal(
  lebaraDeployment.participants.find(
    part => part.organization_id === 'electric-twin',
  ).participation_type,
  'vendor_platform_provider_observation',
);
assert.equal(
  lebaraDeployment.participants.find(
    part => part.organization_id === 'lebara',
  ).participation_type,
  'vendor_reported_client_user_observation',
);
assert.deepEqual(lebaraDeployment.receipt_ids, ['electric-twin-lebara-customer-use-2026-03-11']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row =>
  row.surface_id === lebaraDeployment.surface_id
    && row.reason === 'organization_only_customer_vendor_deployment'
), 'the compiled graph must expose the organization-only Lebara refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(
  basis => basis.surface_id === lebaraDeployment.surface_id,
)), 'organization-only Lebara customer use must never become a hop basis');
assert.ok(!actor('ben-warner').surfaces.includes(lebaraDeployment.surface_id),
  'Ben Warner must not inherit the organization-only Lebara customer use');
assert.ok(org('lebara')?.surfaces.includes(lebaraDeployment.surface_id),
  'Lebara must retain its source-name customer-use surface');
const lebaraReceiptRow = receipt('electric-twin-lebara-customer-use-2026-03-11');
assert.ok(lebaraReceiptRow, 'the first-party Lebara receipt must exist');
assert.equal(lebaraReceiptRow.source_published_at, '2026-03-11');
assert.equal(lebaraReceiptRow.event_date, '2026-03-11');
assert.equal(lebaraReceiptRow.client_side_confirmation_recovered, false);
assert.equal(lebaraReceiptRow.precise_legal_entity_resolved, false);
assert.deepEqual(lebaraReceiptRow.named_client_actor_ids, []);
assert.equal(lebaraReceiptRow.archive.ref, 'sha256:1fbffa9e72d9842f37bfd7bd9eb3c37f1432cf000bc3f04eb5cd579622cec09a');
const lebaraSourceClaim = claim('electric-twin-lebara-customer-use-2026-03-11');
assert.ok(lebaraSourceClaim,
  'the first-party Lebara customer-use claim must compile');
assert.deepEqual(lebaraSourceClaim.actor_ids, []);
assert.deepEqual(
  [...lebaraSourceClaim.organization_ids].sort(),
  ['electric-twin', 'lebara'],
);
assert.deepEqual(lebaraSourceClaim.receipt_ids, ['electric-twin-lebara-customer-use-2026-03-11']);

const capitalFilingSequence = surf('electric-twin-capital-allotment-observations-2026-01-13-2026-07-09');
assert.ok(capitalFilingSequence,
  'the official Electric Twin 2026 capital filing-history sequence must compile');
assert.equal(capitalFilingSequence.hop_eligible, false);
assert.equal(
  capitalFilingSequence.hop_refusal_reason,
  'issuer_only_capital_filing_sequence',
);
assert.equal(capitalFilingSequence.surface_type, 'employment_investment_surface');
assert.deepEqual(
  capitalFilingSequence.secondary_surface_types,
  ['surface_factory_capital_layer'],
);
assert.equal(capitalFilingSequence.time_start, '2026-01-13');
assert.equal(capitalFilingSequence.time_end, '2026-07-09');
assert.equal(capitalFilingSequence.evidence_class, 'official');
assert.deepEqual(
  capitalFilingSequence.participants
    .filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id),
  [],
  'issuer-only capital filing history must not manufacture actor participants',
);
assert.deepEqual(
  capitalFilingSequence.participants
    .filter(part => part.participant_type === 'organization')
    .map(part => part.organization_id),
  ['electric-twin'],
  'Electric Twin must be the sole organization on the 2026 capital sequence',
);
assert.equal(
  capitalFilingSequence.participants[0].participation_type,
  'issuer_capital_filing_sequence_observation',
);
assert.deepEqual(capitalFilingSequence.receipt_ids, ['companies-house-electric-twin-2026-capital-allotment-filing-history']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row =>
  row.surface_id === capitalFilingSequence.surface_id
    && row.reason === 'issuer_only_capital_filing_sequence'
), 'compiled graph must expose the issuer-only Electric Twin capital refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(
  basis => basis.surface_id === capitalFilingSequence.surface_id,
)), 'Electric Twin 2026 capital filing history must never become a hop basis');
assert.ok(!scores.actors.some(row => row.surfaces.includes(capitalFilingSequence.surface_id)),
  'an actor inherited the Electric Twin 2026 capital filing history');
assert.ok(org('electric-twin')?.surfaces.includes(capitalFilingSequence.surface_id),
  'Electric Twin organization score must retain the 2026 capital filing sequence');
const capitalReceiptRow = receipt('companies-house-electric-twin-2026-capital-allotment-filing-history');
assert.ok(capitalReceiptRow, 'Electric Twin 2026 capital receipt must exist');
assert.equal(capitalReceiptRow.company_number, '15173006');
assert.deepEqual(capitalReceiptRow.filing_observations, [
  { allotment_date: '2026-01-13', filed_at: '2026-01-27', resulting_total_nominal_capital_gbp: 3.658437 },
  { allotment_date: '2026-03-06', filed_at: '2026-04-14', resulting_total_nominal_capital_gbp: 3.661921 },
  { allotment_date: '2026-04-02', filed_at: '2026-04-14', resulting_total_nominal_capital_gbp: 3.667047 },
  { allotment_date: '2026-07-09', filed_at: '2026-07-15', resulting_total_nominal_capital_gbp: 3.672047 },
]);
assert.equal(capitalReceiptRow.sh01_forms_recovered, true);
assert.equal(capitalReceiptRow.sh01_forms_reproduced, false);
assert.equal(capitalReceiptRow.source_pdf_custody_recovered, true);
assert.equal(capitalReceiptRow.form_fields_extracted, true);
assert.equal(capitalReceiptRow.share_classes_recovered, true);
assert.equal(capitalReceiptRow.share_quantities_recovered, true);
assert.equal(capitalReceiptRow.paid_unpaid_fields_recovered, true);
assert.equal(capitalReceiptRow.consideration_terms_recovered, true);
assert.equal(capitalReceiptRow.aggregate_paid_amounts_are_derived, true);
assert.equal(capitalReceiptRow.class_rights_promoted, false);
assert.equal(capitalReceiptRow.allottees_identified, false);
assert.equal(capitalReceiptRow.beneficial_owners_identified, false);
assert.equal(capitalReceiptRow.investor_identities_identified, false);
assert.deepEqual(capitalReceiptRow.named_actor_ids, []);
assert.equal(capitalReceiptRow.underlying_allotment_period_start, '2025-11-21');
assert.deepEqual(
  capitalReceiptRow.form_observations.map(row => ({
    period: [row.allotment_period_start, row.allotment_period_end],
    filed_at: row.filed_at,
    source_filing_code: row.source_filing_code,
    share_class: row.allotted_share_class,
    shares_allotted: row.shares_allotted,
    nominal: row.nominal_value_per_share_gbp,
    paid: row.amount_paid_per_share_gbp,
    unpaid: row.amount_unpaid_per_share_gbp,
    consideration: row.consideration_basis,
    derived_paid: row.derived_aggregate_amount_paid_gbp,
    resulting_total_shares: row.resulting_statement_of_capital.total_shares,
  })),
  [
    { period: ['2025-11-21', '2026-01-13'], filed_at: '2026-01-27', source_filing_code: 'XEULYX00', share_class: 'SEED 2 PREFERRED', shares_allotted: 70138, nominal: '0.000001', paid: '9.27', unpaid: '0', consideration: 'cash_only_as_filed', derived_paid: '650179.26', resulting_total_shares: 3658437 },
    { period: ['2026-03-06', '2026-03-06'], filed_at: '2026-04-14', source_filing_code: 'XEZZWEZC', share_class: 'ORDINARY', shares_allotted: 3484, nominal: '0.000001', paid: '1.425', unpaid: '0', consideration: 'cash_only_as_filed', derived_paid: '4964.700', resulting_total_shares: 3661921 },
    { period: ['2026-04-02', '2026-04-02'], filed_at: '2026-04-14', source_filing_code: 'XEZZWKLD', share_class: 'ORDINARY', shares_allotted: 5126, nominal: '0.000001', paid: '1.425', unpaid: '0', consideration: 'cash_only_as_filed', derived_paid: '7304.550', resulting_total_shares: 3667047 },
    { period: ['2026-07-09', '2026-07-09'], filed_at: '2026-07-15', source_filing_code: 'XF6CYCQQ', share_class: 'ORDINARY', shares_allotted: 5000, nominal: '0.000001', paid: '1.425', unpaid: '0', consideration: 'cash_only_as_filed', derived_paid: '7125.000', resulting_total_shares: 3672047 },
  ],
);
assert.ok(capitalReceiptRow.form_observations.every(row =>
  /^[0-9a-f]{64}$/.test(row.source_pdf_sha256)
    && row.source_pdf_pages === 4
    && !Object.hasOwn(row, 'allottee')
    && !Object.hasOwn(row, 'investor_id')
));
assert.equal(capitalReceiptRow.archive.ref, 'sha256:82969688e8654a4cf48892e48d7a65155a8f927119499648325e219059da0964');
const capitalClaimRow = claim('electric-twin-2026-capital-allotment-filing-history');
assert.ok(capitalClaimRow, 'Electric Twin 2026 capital filing-history claim must compile');
assert.deepEqual(capitalClaimRow.actor_ids, []);
assert.deepEqual(capitalClaimRow.organization_ids, ['electric-twin']);
assert.deepEqual(capitalClaimRow.receipt_ids, ['companies-house-electric-twin-2026-capital-allotment-filing-history']);
assert.match(capitalClaimRow.limits, /arithmetic derivations/);
assert.match(capitalClaimRow.limits, /do not identify allottees/);

const gartnerCategoryObservation = surf('gartner-synthetic-population-category-2026');
assert.ok(gartnerCategoryObservation, 'the source-native Gartner category observation must compile');
assert.equal(gartnerCategoryObservation.hop_eligible, false);
assert.equal(gartnerCategoryObservation.hop_refusal_reason, 'organization_only_category_observation');
assert.equal(gartnerCategoryObservation.time_start, '2026-06-25');
assert.equal(gartnerCategoryObservation.time_end, '2026-06-25');
assert.deepEqual(gartnerCategoryObservation.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id), [],
  'the Electric Twin company post must not manufacture Ben Warner or another actor participant');
assert.deepEqual(gartnerCategoryObservation.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id).sort(), ['electric-twin', 'gartner']);
assert.deepEqual(gartnerCategoryObservation.receipt_ids, ['electric-twin-linkedin-gartner-category-2026-06-25']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row => row.surface_id === gartnerCategoryObservation.surface_id && row.reason === 'organization_only_category_observation'),
  'compiled graph must expose the organization-only Gartner category refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === gartnerCategoryObservation.surface_id)),
  'organization-only Gartner category context must never become a hop basis');
assert.equal(gartnerCategoryObservation.participants.find(part => part.organization_id === 'electric-twin').participation_type, 'company_reported_category_subject_observation');
assert.equal(gartnerCategoryObservation.participants.find(part => part.organization_id === 'gartner').participation_type, 'attributed_category_maker_context');
const gartnerCategoryReceipt = receipt('electric-twin-linkedin-gartner-category-2026-06-25');
assert.ok(gartnerCategoryReceipt, 'the recoverable Electric Twin Gartner-category receipt must exist');
assert.equal(gartnerCategoryReceipt.source_published_at, '2026-06-25');
assert.equal(gartnerCategoryReceipt.event_date, '2026-06-25');
assert.equal(gartnerCategoryReceipt.reported_companies_reviewed, 60);
assert.equal(gartnerCategoryReceipt.reported_companies_selected_to_watch, 33);
assert.equal(gartnerCategoryReceipt.reported_tier, 'scale_up');
assert.equal(gartnerCategoryReceipt.underlying_gartner_research_recovered, false);
assert.equal(gartnerCategoryReceipt.personal_author_identified, false);
assert.equal(receipt('warner-linkedin-gartner-2026-06-29'), undefined,
  'the superseded lost Ben Warner paste receipt must be retired');

const sourceNativeGartnerClaim = claim('electric-twin-reported-gartner-category-2026-06-25');
assert.ok(sourceNativeGartnerClaim,
  'canonical consumer repair must remove personal Gartner attribution');
assert.deepEqual(sourceNativeGartnerClaim.actor_ids, []);
assert.deepEqual(sourceNativeGartnerClaim.organization_ids.sort(), ['electric-twin', 'gartner']);
assert.deepEqual(sourceNativeGartnerClaim.receipt_ids, ['electric-twin-linkedin-gartner-category-2026-06-25']);
assert.equal(claim('warner-gartner-synthetic-populations-2026-06-29'), undefined,
  'the superseded personal Gartner claim must be retired');

const sourceNativeNewsUkClaim = claim('newsuk-times-exploraition-electric-twin-launch-2026-04-27');
assert.ok(sourceNativeNewsUkClaim, 'the first-party News UK deployment claim must compile');
assert.deepEqual(sourceNativeNewsUkClaim.actor_ids, []);
assert.deepEqual(sourceNativeNewsUkClaim.organization_ids.sort(), ['electric-twin', 'news-uk']);
assert.deepEqual(sourceNativeNewsUkClaim.receipt_ids, [
  'newsuk-times-exploraition-launch-2026-04-27',
  'electric-twin-times-exploraition-launch-2026-04-28',
]);
assert.equal(claim('electric-twin-newsuk-first-party-data-2026-06-29'), undefined,
  'the superseded user-judgment News UK claim must be retired');

const correctedWarnerChronology = claim('ben-warner-government-commercial-chronology-boundary-2026-08-11');
assert.ok(correctedWarnerChronology, 'the Ben Warner chronology boundary must remain visible');
assert.deepEqual(correctedWarnerChronology.receipt_ids, [
  'uk-covid-inquiry-ben-warner-decision-forward-planning-2020-03-13-16',
  'gov-sage-89-ben-warner-no10-2021-05-13',
]);
assert.deepEqual(correctedWarnerChronology.surface_ids, [
  'ben-warner-no10-digital-data-role-observation-2020-2021',
]);
assert.match(correctedWarnerChronology.text, /do not place him on the later News UK deployment or Gartner category surfaces/);

const correctedPolicyDeploymentChain = (scores.chains ?? [])
  .find(row => row.chain_id === 'policy-to-deployment-synthetic-population');
assert.ok(correctedPolicyDeploymentChain, 'the policy-to-deployment chain must remain compiled');
const correctedCommercialDeploymentStage = correctedPolicyDeploymentChain.stages
  .find(stage => stage.order === 4 && stage.stage_category === 'commercial_deployment');
assert.ok(correctedCommercialDeploymentStage, 'the commercial-deployment stage must remain compiled');
assert.equal(correctedCommercialDeploymentStage.organization_id, 'electric-twin');
assert.equal(correctedCommercialDeploymentStage.actor_id, null);
assert.deepEqual(correctedCommercialDeploymentStage.receipt_ids, [
  'newsuk-times-exploraition-launch-2026-04-27',
  'electric-twin-times-exploraition-launch-2026-04-28',
]);
assert.ok(!JSON.stringify(correctedPolicyDeploymentChain).includes('warner-linkedin-gartner-2026-06-29'));
assert.ok(!JSON.stringify(correctedPolicyDeploymentChain).includes('sandhu-comment-newsuk-2026-06-29'));

assert.ok(!actor('ben-warner').surfaces.includes(gartnerCategoryObservation.surface_id),
  'Ben Warner must not inherit the organization-only Gartner category observation');
assert.equal(surf('faculty-science-officer-employee-overlap-2018-01-24').hop_eligible, true);
assert.equal(surf('faculty-science-director-shareholder-overlap-2024-10-10').hop_eligible, true);
assert.equal(org('electric-twin').surface_factory, true);
assert.ok(actor('simon-case').surfaces.includes('simon-case-cabinet-secretary-2020-2024'));
assert.ok(actor('simon-case').surfaces.includes('electric-twin-ethics-board-2026'));
assert.ok(actor('simon-case').surfaces.includes('team-barrow-public-private-fund-2026'));

const ethicsBoardObservation = surf('electric-twin-ethics-board-2026');
assert.ok(ethicsBoardObservation, 'the source-native Simon Case ethics-board observation must compile');
assert.equal(ethicsBoardObservation.hop_eligible, false);
assert.equal(ethicsBoardObservation.hop_refusal_reason, 'single_actor_advisory_context_only');
assert.equal(ethicsBoardObservation.time_start, '2026-06-11');
assert.equal(ethicsBoardObservation.time_end, '2026-06-11');
assert.deepEqual(ethicsBoardObservation.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id), ['simon-case'], 'the official appointment record must not manufacture another actor participant');
assert.deepEqual(ethicsBoardObservation.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id), ['electric-twin']);
assert.deepEqual(ethicsBoardObservation.receipt_ids, ['civil-service-commission-simon-case-electric-twin-ethics-board-2026-06-11']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row => row.surface_id === ethicsBoardObservation.surface_id && row.reason === 'single_actor_advisory_context_only'), 'compiled graph must expose the single-actor ethics-board refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === ethicsBoardObservation.surface_id)), 'single-actor ethics-board context must never become a hop basis');
const ethicsBoardReceipt = receipt('civil-service-commission-simon-case-electric-twin-ethics-board-2026-06-11');
assert.ok(ethicsBoardReceipt, 'the official ethics-board receipt must exist');
assert.equal(ethicsBoardReceipt.source_published_at, '2026-06-11');
assert.equal(ethicsBoardReceipt.event_date, '2026-06-11');
assert.equal(ethicsBoardReceipt.former_service_last_day, '2025-03-31');
assert.equal(ethicsBoardReceipt.role_compensation, 'unpaid');
assert.equal(ethicsBoardReceipt.role_time_commitment, 'part_time');
assert.equal(ethicsBoardReceipt.government_contact_or_lobbying, false);
assert.ok(!ethicsBoardObservation.receipt_ids.includes('times-case-electric-twin-2026'), 'the corrected surface must not inherit the master-only Times reference');

const cabinetSecretaryTenure = surf('simon-case-cabinet-secretary-2020-2024');
assert.ok(cabinetSecretaryTenure, 'the source-native Simon Case Cabinet Secretary tenure must compile');
assert.equal(cabinetSecretaryTenure.hop_eligible, false);
assert.equal(cabinetSecretaryTenure.hop_refusal_reason, 'single_actor_government_role_context_only');
assert.equal(cabinetSecretaryTenure.time_start, '2020-09-09');
assert.equal(cabinetSecretaryTenure.time_end, '2024-12-15');
assert.deepEqual(cabinetSecretaryTenure.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id), ['simon-case'], 'the official tenure records must not manufacture another actor participant');
assert.deepEqual(cabinetSecretaryTenure.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id), ['cabinet-office']);
assert.deepEqual(cabinetSecretaryTenure.receipt_ids, ['gov-pm-simon-case-cabinet-secretary-appointment-2020-09-01', 'gov-simon-case-cabinet-secretary-tenure-end-2024-12-15']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row => row.surface_id === cabinetSecretaryTenure.surface_id && row.reason === 'single_actor_government_role_context_only'), 'compiled graph must expose the single-actor Cabinet Secretary refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === cabinetSecretaryTenure.surface_id)), 'single-actor Cabinet Secretary tenure must never become a hop basis');
const cabinetAppointmentReceipt = receipt('gov-pm-simon-case-cabinet-secretary-appointment-2020-09-01');
assert.ok(cabinetAppointmentReceipt, 'the official Cabinet Secretary appointment receipt must exist');
assert.equal(cabinetAppointmentReceipt.source_published_at, '2020-09-01');
assert.equal(cabinetAppointmentReceipt.event_date, '2020-09-09');
assert.equal(cabinetAppointmentReceipt.appointment_effective_at, '2020-09-09');
const cabinetTenureEndReceipt = receipt('gov-simon-case-cabinet-secretary-tenure-end-2024-12-15');
assert.ok(cabinetTenureEndReceipt, 'the official Cabinet Secretary tenure-end receipt must exist');
assert.equal(cabinetTenureEndReceipt.tenure_end, '2024-12-15');
assert.equal(cabinetTenureEndReceipt.successor_effective_at, '2024-12-16');
assert.ok(!cabinetSecretaryTenure.receipt_ids.includes('master-doc-v3'), 'the corrected tenure must not inherit the master proxy');

const teamBarrowObservation = surf('team-barrow-public-private-fund-2026');
assert.ok(teamBarrowObservation, 'the source-native Team Barrow governance observation must compile');
assert.equal(teamBarrowObservation.hop_eligible, false);
assert.equal(teamBarrowObservation.hop_refusal_reason, 'single_actor_partnership_governance_context_only');
assert.equal(teamBarrowObservation.time_start, '2025-02-10');
assert.equal(teamBarrowObservation.time_end, '2026-07-02');
assert.deepEqual(teamBarrowObservation.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id), ['simon-case'], 'the organization-level partnership must not manufacture another actor participant');
assert.deepEqual(teamBarrowObservation.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id).sort(), ['bae-systems', 'local-council', 'uk-government']);
assert.deepEqual(teamBarrowObservation.receipt_ids, ['gov-mhclg-simon-case-barrow-chair-2025-02-10', 'uk-parliament-plan-for-barrow-statement-2025-02-10', 'westmorland-team-barrow-chair-partnership-2025-02-10', 'civil-service-commission-simon-case-barrow-role-2026-07-02']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row => row.surface_id === teamBarrowObservation.surface_id && row.reason === 'single_actor_partnership_governance_context_only'), 'compiled graph must expose the Team Barrow partnership-governance refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === teamBarrowObservation.surface_id)), 'single-actor Team Barrow context must never become a hop basis');
const teamBarrowGovernment = teamBarrowObservation.participants.find(part => part.organization_id === 'uk-government');
assert.equal(teamBarrowGovernment.participation_type, 'public_funder_and_appointing_authority_observation');
assert.equal(teamBarrowGovernment.funding_amount_gbp, 200000000);
assert.equal(teamBarrowObservation.participants.find(part => part.organization_id === 'bae-systems').participation_type, 'industry_partner_observation');
assert.equal(teamBarrowObservation.participants.find(part => part.organization_id === 'local-council').participation_type, 'local_government_partner_observation');
assert.equal(receipt('gov-mhclg-simon-case-barrow-chair-2025-02-10').public_funding_amount_gbp, 200000000);
assert.equal(receipt('uk-parliament-plan-for-barrow-statement-2025-02-10').commons_statement_id, 'HCWS428');
assert.equal(receipt('uk-parliament-plan-for-barrow-statement-2025-02-10').lords_statement_id, 'HLWS424');
assert.deepEqual(receipt('westmorland-team-barrow-chair-partnership-2025-02-10').partnership_organizations, ['UK Government', 'Westmorland and Furness Council', 'BAE Systems']);
assert.equal(receipt('civil-service-commission-simon-case-barrow-role-2026-07-02').observed_active_through, '2026-07-02');
assert.equal(receipt('civil-service-commission-simon-case-barrow-role-2026-07-02').continues_to_represent_government, true);
assert.ok(!teamBarrowObservation.receipt_ids.includes('master-doc-v3'), 'the corrected Team Barrow observation must not inherit the master proxy');

const surfaceActorIds = new Set(surface.actors.map(a => a.id));
for (const node of legacyGraph.nodes.filter(n => n.type === 'person')) {
  assert.ok(surfaceActorIds.has(node.id), `${node.label} must be present in the surface app actor index`);
}
assert.ok(surfaceActorIds.has('alex-karp'), 'Alex Karp must be present through the legacy graph bridge, not a one-off ledger patch');
assert.match(surface.actors.find(a => a.id === 'alex-karp')?.description ?? '', /Palantir/, 'legacy bridged actors must carry descriptions for UI context');
const candidates = new Set((surface.candidates ?? []).map(c => c.id));
for (const id of ['candidate-palmer-luckey', 'candidate-jackson-moses', 'candidate-alex-miller', 'candidate-silicon-valley-defense-group']) {
  assert.ok(candidates.has(id), `${id} must be visible as a defense-industrial intake candidate`);
}

for (const edge of hop.edges) {
  for (const basis of edge.surfaces) {
    assert.ok(basis.surface_id, 'hop basis must name surface');
    assert.ok(basis.receipt_ids.length > 0, 'hop basis must carry receipts');
  }
}
assert.ok(migration.total_rows > 200, 'full master doc must be classified');

// Laundering-chain dimension: scored, high, and provably NOT a hop.
const chain = id => (scores.chains ?? []).find(c => c.chain_id === id);
const synthChain = chain('policy-to-deployment-synthetic-population');
assert.ok(synthChain, 'synthetic-population laundering chain must be scored');
assert.equal(synthChain.clifford_number, null, 'a laundering chain must not carry a Clifford Number');
assert.ok(synthChain.laundering_chain_score >= 4, 'synthetic-population chain must span >= 4 stage categories');
assert.equal(synthChain.connector_surfaces_all_non_hop, true, 'chain connector surfaces must be non-hop');
// Detachment 201 keeps organization-level program context separate from the exact named commissioning cohort.
const detachmentProgramContext = surf('detachment-201-program-context-2025');
assert.ok(detachmentProgramContext, 'Detachment 201 program context must compile');
assert.equal(detachmentProgramContext.hop_eligible, false);
assert.equal(detachmentProgramContext.hop_refusal_reason, 'organization_only_program_context');
assert.equal(detachmentProgramContext.time_start, '2025-06-13');
assert.deepEqual(
  detachmentProgramContext.participants
    .filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id),
  [],
  'the organization-level program context must not manufacture actor participants',
);
assert.deepEqual(
  detachmentProgramContext.participants
    .filter(part => part.participant_type === 'organization')
    .map(part => part.organization_id),
  ['us-army'],
  'the program context must preserve only the Army as the program institution',
);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row =>
  row.surface_id === detachmentProgramContext.surface_id
    && row.reason === 'organization_only_program_context'),
  'the public graph must expose the Detachment 201 program-context refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(
  basis => basis.surface_id === detachmentProgramContext.surface_id,
)), 'the program context must never become a hop basis');

const detachmentCommissioning = surf('detachment-201-commissioning-2025');
const detachmentCommissionedActors = [
  'andrew-bosworth',
  'bob-mcgrew',
  'kevin-weil',
  'shyam-sankar',
];
assert.ok(detachmentCommissioning, 'the exact Detachment 201 commissioning surface must compile');
assert.equal(detachmentCommissioning.hop_eligible, true);
assert.equal(detachmentCommissioning.surface_type, 'government_advisory_surface');
assert.equal(detachmentCommissioning.evidence_class, 'official');
assert.equal(detachmentCommissioning.time_start, '2025-06-13');
assert.equal(detachmentCommissioning.time_end, '2025-06-13');
assert.deepEqual(
  detachmentCommissioning.participants
    .filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id)
    .sort(),
  detachmentCommissionedActors,
  'the exact event must preserve the complete four-officer official roster',
);
assert.deepEqual(
  detachmentCommissioning.participants
    .filter(part => part.participant_type === 'organization')
    .map(part => part.organization_id),
  ['us-army'],
  'the exact event must preserve the Army as commissioning institution',
);
assert.deepEqual(detachmentCommissioning.receipt_ids, ['army-detachment-201']);
assert.equal(
  hop.edges
    .flatMap(edge => edge.surfaces)
    .filter(basis => basis.surface_id === detachmentCommissioning.surface_id)
    .length,
  6,
  'four commissioned officers must create exactly six same-day formal bases',
);
const detachmentSankarWeil = hop.edges.find(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|') === 'kevin-weil|shyam-sankar');
assert.ok(detachmentSankarWeil, 'Shyam Sankar and Kevin Weil must connect on the official commissioning event');
const detachmentSankarWeilBasis = detachmentSankarWeil.surfaces.find(
  basis => basis.surface_id === detachmentCommissioning.surface_id,
);
assert.equal(detachmentSankarWeilBasis?.evidence_class, 'official');
assert.equal(detachmentSankarWeilBasis?.valid_from, '2025-06-13');
assert.equal(detachmentSankarWeilBasis?.valid_until, '2025-06-13');
for (const actorId of detachmentCommissionedActors) {
  assert.ok(actor(actorId)?.surfaces.includes(detachmentCommissioning.surface_id),
    `${actorId} must retain the exact Detachment 201 commissioning surface`);
}
const detachmentReceipt = receipt('army-detachment-201');
assert.ok(detachmentReceipt, 'the exact official Detachment 201 receipt must exist');
assert.equal(detachmentReceipt.path,
  'receipts/topology/us-army-detachment-201-inaugural-commissioning-2025-06-13.md');
assert.equal(detachmentReceipt.event_date, '2025-06-13');
assert.equal(detachmentReceipt.named_cohort_size, 4);
assert.deepEqual([...detachmentReceipt.commissioned_actor_ids].sort(), detachmentCommissionedActors);
assert.equal(detachmentReceipt.procurement_award_established, false);
assert.equal(detachmentReceipt.continuous_joint_work_established, false);
assert.equal(
  detachmentReceipt.archive?.ref,
  'sha256:4744b11929e9fc0e3a280bf43830d6bb337a6cc342664824a6c69239dd87a0fe',
);
const detachmentClaim = claim('detachment-201-inaugural-four-officer-commissioning-2025-06-13');
assert.ok(detachmentClaim, 'the exact four-officer commissioning claim must remain public');
assert.deepEqual([...detachmentClaim.actor_ids].sort(), detachmentCommissionedActors);
assert.deepEqual(detachmentClaim.surface_ids, [detachmentCommissioning.surface_id]);
assert.equal(receipt('reuters-defense-procurement'), undefined,
  'the generic Reuters homepage proxy must remain retired after the official Detachment 201 repair');
const detachmentChainStage = synthChain.stages.find(stage =>
  stage.stage_category === 'military_advisory_integration');
assert.equal(detachmentChainStage?.surface_id, detachmentProgramContext.surface_id);
assert.deepEqual(detachmentChainStage?.receipt_ids, ['army-detachment-201']);

// Detachment 201 Cohort 2 is a separate exact commissioning act. The event
// contains the three commissioned officers and Daniel P. Driscoll under the
// distinct source-stated role of oath administrator.
const detachmentSecondCohort = surf('detachment-201-second-cohort-commissioning-2026-06-10');
const detachmentSecondCohortCommissionedActors = [
  'dane-knecht',
  'sam-pullara',
  'serkan-piantino',
];
const detachmentSecondCohortEventActors = [
  'dan-driscoll',
  ...detachmentSecondCohortCommissionedActors,
].sort();
const detachmentSecondCohortExpectedPairs = [
  'dan-driscoll|dane-knecht',
  'dan-driscoll|sam-pullara',
  'dan-driscoll|serkan-piantino',
  'dane-knecht|sam-pullara',
  'dane-knecht|serkan-piantino',
  'sam-pullara|serkan-piantino',
];
assert.ok(detachmentSecondCohort, 'the exact Detachment 201 Cohort 2 commissioning surface must compile');
assert.equal(detachmentSecondCohort.hop_eligible, true);
assert.equal(detachmentSecondCohort.surface_type, 'government_advisory_surface');
assert.equal(detachmentSecondCohort.evidence_class, 'official');
assert.equal(detachmentSecondCohort.time_start, '2026-06-10');
assert.equal(detachmentSecondCohort.time_end, '2026-06-10');
const detachmentSecondCohortParts = detachmentSecondCohort.participants;
assert.deepEqual(
  detachmentSecondCohortParts
    .filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id)
    .sort(),
  detachmentSecondCohortEventActors,
  'the event must preserve all four directly named natural-person participants',
);
assert.deepEqual(
  detachmentSecondCohortParts
    .filter(part => part.participation_type === 'commissioned_officer')
    .map(part => part.actor_id)
    .sort(),
  detachmentSecondCohortCommissionedActors,
  'the commissioned-officer subset must remain exactly the three-person Cohort 2 roster',
);
const detachmentSecondCohortOathAdministrator = detachmentSecondCohortParts.find(
  part => part.actor_id === 'dan-driscoll',
);
assert.equal(detachmentSecondCohortOathAdministrator?.participation_type, 'oath_administrator');
assert.deepEqual(
  detachmentSecondCohortParts
    .filter(part => part.participant_type === 'organization')
    .map(part => part.organization_id),
  ['us-army'],
  'the exact event must preserve only the Army as organization participant',
);
assert.deepEqual(detachmentSecondCohort.receipt_ids, ['army-detachment-201-second-cohort-2026-06-10']);
const detachmentSecondCohortBases = hop.edges
  .flatMap(edge => edge.surfaces)
  .filter(basis => basis.surface_id === detachmentSecondCohort.surface_id);
assert.equal(detachmentSecondCohortBases.length, 6,
  'four directly named event actors must create exactly six same-day formal bases');
const detachmentSecondCohortActualPairs = hop.edges
  .filter(edge => edge.surfaces.some(basis => basis.surface_id === detachmentSecondCohort.surface_id))
  .map(edge => [edge.actor_a, edge.actor_b].sort().join('|'))
  .sort();
assert.deepEqual(detachmentSecondCohortActualPairs, detachmentSecondCohortExpectedPairs);
for (const basis of detachmentSecondCohortBases) {
  assert.equal(basis.evidence_class, 'official');
  assert.equal(basis.valid_from, '2026-06-10');
  assert.equal(basis.valid_until, '2026-06-10');
}
for (const actorId of detachmentSecondCohortEventActors) {
  assert.ok(actor(actorId)?.surfaces.includes(detachmentSecondCohort.surface_id),
    `${actorId} must retain the exact Cohort 2 commissioning surface`);
}
for (const actorId of detachmentCommissionedActors) {
  assert.ok(!actor(actorId)?.surfaces.includes(detachmentSecondCohort.surface_id),
    `${actorId} must remain on the separate inaugural commissioning surface`);
}
for (const actorId of detachmentSecondCohortCommissionedActors) {
  assert.ok(!actor(actorId)?.surfaces.includes(detachmentCommissioning.surface_id),
    `${actorId} must not be projected backward onto the inaugural commissioning event`);
}
const detachmentSecondCohortReceipt = receipt('army-detachment-201-second-cohort-2026-06-10');
assert.ok(detachmentSecondCohortReceipt, 'the exact official Cohort 2 receipt must exist');
assert.equal(detachmentSecondCohortReceipt.path,
  'receipts/topology/us-army-detachment-201-second-cohort-commissioning-2026-06-10.md');
assert.equal(detachmentSecondCohortReceipt.event_date, '2026-06-10');
assert.equal(detachmentSecondCohortReceipt.named_cohort_size, 3);
assert.equal(detachmentSecondCohortReceipt.named_event_actor_size, 4);
assert.deepEqual(
  [...detachmentSecondCohortReceipt.commissioned_actor_ids].sort(),
  detachmentSecondCohortCommissionedActors,
);
assert.deepEqual(
  [...detachmentSecondCohortReceipt.ceremony_actor_ids].sort(),
  detachmentSecondCohortEventActors,
);
assert.equal(detachmentSecondCohortReceipt.oath_administrator_actor_id, 'dan-driscoll');
assert.equal(detachmentSecondCohortReceipt.oath_administrator_in_event_actor_set, true);
assert.equal(detachmentSecondCohortReceipt.oath_administrator_in_commissioned_cohort, false);
assert.equal(detachmentSecondCohortReceipt.first_cohort_project_allocation_established, false);
assert.equal(detachmentSecondCohortReceipt.second_cohort_specific_project_assignment_established, false);
assert.equal(detachmentSecondCohortReceipt.procurement_award_established, false);
assert.equal(detachmentSecondCohortReceipt.continuous_joint_work_established, false);
assert.equal(
  detachmentSecondCohortReceipt.archive?.ref,
  'sha256:030425b612ff083e35ef03bd05abba72670769c25f19664de38578dcf21de81d',
);
const detachmentSecondCohortClaim = claim(
  'detachment-201-cohort-2-commissioning-ceremony-2026-06-10',
);
assert.ok(detachmentSecondCohortClaim, 'the exact Cohort 2 commissioning claim must remain public');
assert.deepEqual([...detachmentSecondCohortClaim.actor_ids].sort(), detachmentSecondCohortEventActors);
assert.deepEqual(detachmentSecondCohortClaim.surface_ids, [detachmentSecondCohort.surface_id]);
// machine_score and surface_type_recurrence are real, separate dimensions.
assert.ok(actor('ben-warner').machine_score > 0, 'Ben Warner must have a machine_score');
assert.ok(Object.keys(actor('ben-warner').surface_type_recurrence).length > 0, 'Ben Warner must show surface-type recurrence');
assert.ok(actor('matt-clifford').laundering_chain_score >= 4, 'Matt Clifford must anchor the laundering chain');

// Temporal hop regression.
// Every dated hop basis carries a window; the graph declares a temporal rule.
assert.ok(hop.temporal_rule, 'hop graph must declare its temporal rule');
for (const edge of hop.edges) {
  assert.ok(typeof edge.temporal_status === 'string', 'edge must carry temporal_status');
  for (const basis of edge.surfaces) {
    assert.ok(typeof basis.temporal_status === 'string', 'basis must carry temporal_status');
    if (basis.temporal_status === 'dated') {
      // A dated basis has a concrete start; the end may be open (ongoing).
      assert.ok(basis.valid_from || basis.valid_until, `dated basis ${basis.surface_id} must have at least one concrete bound`);
    }
  }
}

// The Action Plan lifecycle is split so development cannot manufacture a Prime Minister hop.
const actionPlanDevelopment = surf('ai-opportunities-action-plan-development-2024-2025');
assert.ok(actionPlanDevelopment, 'the commission and development predecessor surface must be compiled');
assert.equal(actionPlanDevelopment.hop_eligible, false, 'development lifecycle must remain context only');
assert.deepEqual(actionPlanDevelopment.receipt_ids, [
  'gov-ai-opportunities-action-plan-terms-2024-07-26',
  'gov-ai-opportunities-action-plan'
]);
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === actionPlanDevelopment.surface_id)),
  'the development predecessor must never create an actor hop');
const developmentActors = actionPlanDevelopment.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id);
assert.deepEqual(developmentActors, ['matt-clifford']);

const termsReceipt = receipt('gov-ai-opportunities-action-plan-terms-2024-07-26');
assert.ok(termsReceipt, 'the exact dated commission receipt must exist');
assert.equal(termsReceipt.path, 'receipts/topology/gov-ai-opportunities-action-plan-terms-2024-07-26.md');
assert.equal(termsReceipt.source_published_at, '2024-07-26');
assert.equal(termsReceipt.event_date, '2024-07-26');
assert.equal(receipt('gov-ai-opportunities-action-plan').source_published_at, '2025-01-13');
assert.equal(receipt('gov-pm-ai-blueprint-2025').source_published_at, '2025-01-12');
assert.equal(receipt('gov-pm-ai-blueprint-2025').source_updated_at, '2025-01-13');
assert.equal(receipt('gov-pm-ai-blueprint-2025').event_date, '2025-01-13');

// The actor-to-actor answer rests only on the one-day publication and response surface.
const starmerClifford = hop.edges.find(e =>
  [e.actor_a, e.actor_b].sort().join('|') === 'keir-starmer|matt-clifford');
assert.ok(starmerClifford, 'Keir Starmer and Matt Clifford must connect through the dated Action Plan response');
const actionPlanBasis = starmerClifford.surfaces.find(s => s.surface_id === 'ai-opportunities-action-plan-2025');
assert.ok(actionPlanBasis, 'Starmer/Clifford must name the publication and response surface as the hop basis');
assert.equal(actionPlanBasis.surface_label, 'AI Opportunities Action Plan publication and government response, 13 January 2025');
assert.equal(actionPlanBasis.evidence_class, 'official');
assert.equal(actionPlanBasis.valid_from, '2025-01-13');
assert.equal(actionPlanBasis.valid_until, '2025-01-13');
assert.deepEqual(actionPlanBasis.receipt_ids, ['gov-ai-opportunities-action-plan', 'gov-pm-ai-blueprint-2025']);
const topology = buildAdjacency(hop.edges);

// The former multi-year Faculty aggregation depended on a lost scratch audit
// and an undated investor inference. It is replaced by two source-native,
// exact-date company surfaces: one repairs the Warner/Klein company basis and
// the other admits the previously blocked Clifford shareholding bridge.
assert.equal(surf('faculty-investor-employee-2015-2019'), undefined,
  'the unrecoverable 2015-2019 Faculty aggregation must be retired');
const faculty2018 = surf('faculty-science-officer-employee-overlap-2018-01-24');
assert.ok(faculty2018, 'the exact 2018 Faculty officer/employee surface must compile');
assert.equal(faculty2018.surface_label,
  'Faculty Science officer / employee overlap, 24 January 2018');
assert.equal(faculty2018.time_start, '2018-01-24');
assert.equal(faculty2018.time_end, '2018-01-24');
assert.equal(faculty2018.evidence_class, 'primary_public');
assert.deepEqual(faculty2018.receipt_ids, [
  'zebra-ben-warner-asi-commercial-principal-2018-01-24',
  'faculty-asi-data-science-legal-identity-08873131',
  'companies-house-faculty-science-officers-08873131',
]);
assert.deepEqual(
  faculty2018.participants.filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id).sort(),
  ['ben-warner', 'marc-warner', 'saul-klein'],
);
const benFacultyParticipation = faculty2018.participants.find(part => part.actor_id === 'ben-warner');
assert.deepEqual(benFacultyParticipation?.receipt_ids, [
  'zebra-ben-warner-asi-commercial-principal-2018-01-24',
  'faculty-asi-data-science-legal-identity-08873131',
], 'Ben Warner participation must carry both the dated role observation and the explicit brand-to-company join');
assert.ok(!faculty2018.receipt_ids.includes('warner-surface-audit-2026-06-29'),
  'the repaired Faculty surface must carry no lost scratch receipt');
assert.ok(!faculty2018.participants.some(part => part.actor_id === 'matt-clifford'),
  'the 2024 Clifford shareholding must not be backdated onto the 2018 company surface');
for (const pair of [
  ['ben-warner', 'marc-warner'],
  ['ben-warner', 'saul-klein'],
  ['marc-warner', 'saul-klein'],
]) {
  const edge = hop.edges.find(row => [row.actor_a, row.actor_b].sort().join('|') === [...pair].sort().join('|'));
  const basis = edge?.surfaces.find(row => row.surface_id === faculty2018.surface_id);
  assert.ok(basis, `${pair.join('/')} must carry the exact 2018 Faculty basis`);
  assert.equal(basis.valid_from, '2018-01-24');
  assert.equal(basis.valid_until, '2018-01-24');
  assert.equal(basis.temporal_status, 'dated');
  assert.equal(basis.evidence_class, 'primary_public');
  assert.deepEqual(basis.receipt_ids, faculty2018.receipt_ids);
}

const faculty2024 = surf('faculty-science-director-shareholder-overlap-2024-10-10');
assert.ok(faculty2024, 'the official Clifford-to-Faculty bridge must compile');
assert.equal(faculty2024.surface_label,
  'Faculty Science director / shareholder overlap, 10 October 2024');
assert.equal(faculty2024.time_start, '2024-10-10');
assert.equal(faculty2024.time_end, '2024-10-10');
assert.equal(faculty2024.evidence_class, 'official');
assert.deepEqual(faculty2024.receipt_ids, [
  'gov-dsit-matt-clifford-faculty-shareholding-2024-10-10',
  'companies-house-faculty-science-officers-08873131',
]);
assert.deepEqual(
  faculty2024.participants.filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id).sort(),
  ['marc-warner', 'matt-clifford', 'saul-klein'],
);
for (const actorId of ['marc-warner', 'saul-klein']) {
  const edge = hop.edges.find(row => [row.actor_a, row.actor_b].sort().join('|') === [actorId, 'matt-clifford'].sort().join('|'));
  const basis = edge?.surfaces.find(row => row.surface_id === faculty2024.surface_id);
  assert.ok(basis, `Matt Clifford and ${actorId} must carry the official Faculty bridge`);
  assert.equal(basis.valid_from, '2024-10-10');
  assert.equal(basis.valid_until, '2024-10-10');
  assert.equal(basis.temporal_status, 'dated');
  assert.equal(basis.evidence_class, 'official');
  assert.deepEqual(basis.receipt_ids, faculty2024.receipt_ids);
}
assert.equal(shortestPath(topology, 'marc-warner', 'matt-clifford', { asOf: '2024-10-09' }).number, null,
  'the shareholding declaration must not backdate the company hop');
assert.equal(shortestPath(topology, 'marc-warner', 'matt-clifford', { asOf: '2024-10-10' }).number, 1);
assert.equal(shortestPath(topology, 'marc-warner', 'matt-clifford', { asOf: '2024-10-11' }).number, null,
  'the one-day declaration observation must not become an open-ended shareholding interval');
assert.equal(shortestPath(topology, 'saul-klein', 'matt-clifford', { asOf: '2024-10-10' }).number, 1);
assert.equal(shortestPath(topology, 'ben-warner', 'matt-clifford').number, 2,
  'the all-time topology must now join Ben Warner to Clifford through a receipted Faculty director');
assert.equal(shortestPath(topology, 'ben-warner', 'matt-clifford', { asOf: '2024-10-10' }).number, null,
  'the all-time two-hop route must not masquerade as contemporaneous in 2024');

const facultyOfficerReceipt = receipt('companies-house-faculty-science-officers-08873131');
assert.equal(facultyOfficerReceipt.company_number, '08873131');
assert.equal(facultyOfficerReceipt.marc_warner_appointed_at, '2014-02-03');
assert.equal(facultyOfficerReceipt.saul_klein_appointed_at, '2016-04-21');
assert.equal(facultyOfficerReceipt.saul_klein_resigned_at, '2026-03-12');
const benFacultyReceipt = receipt('zebra-ben-warner-asi-commercial-principal-2018-01-24');
assert.equal(benFacultyReceipt.event_date, '2018-01-24');
assert.match(benFacultyReceipt.notes, /one-day role observation/i);
const facultyIdentityReceipt = receipt('faculty-asi-data-science-legal-identity-08873131');
assert.equal(facultyIdentityReceipt.brand_name, 'ASI Data Science');
assert.equal(facultyIdentityReceipt.successor_brand, 'Faculty');
assert.equal(facultyIdentityReceipt.legal_entity, 'Faculty Science Limited');
assert.equal(facultyIdentityReceipt.company_number, '08873131');
assert.equal(facultyIdentityReceipt.previous_legal_name, 'Advanced Skills Initiative Limited');
assert.match(facultyIdentityReceipt.notes, /without relying on a canonical alias/i);
const cliffordFacultyReceipt = receipt('gov-dsit-matt-clifford-faculty-shareholding-2024-10-10');
assert.equal(cliffordFacultyReceipt.event_date, '2024-10-10');
assert.equal(cliffordFacultyReceipt.divestment_confirmed_at, '2025-02-24');
assert.match(cliffordFacultyReceipt.notes, /one-day shareholding observation/i);


// Electric Twin legal formation is a one-day co-participation event, not an open-ended founder relationship.
assert.equal(surf('electric-twin-founder-2023'), undefined,
  'the legacy open-ended founder surface must be retired');
const electricTwinIncorporation = surf('electric-twin-incorporation-2023-09-28');
assert.ok(electricTwinIncorporation, 'the exact Electric Twin incorporation surface must compile');
assert.equal(electricTwinIncorporation.surface_label,
  'Electric Twin incorporation and initial-director surface, 28 September 2023');
assert.equal(electricTwinIncorporation.hop_eligible, true);
assert.equal(electricTwinIncorporation.time_start, '2023-09-28');
assert.equal(electricTwinIncorporation.time_end, '2023-09-28');
assert.deepEqual(electricTwinIncorporation.receipt_ids,
  ['companies-house-electric-twin-incorporation-2023-09-28']);
assert.deepEqual(
  electricTwinIncorporation.participants.filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id).sort(),
  ['alex-cooper', 'ben-warner']
);
const benAlexElectricTwin = hop.edges.find(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|') === 'alex-cooper|ben-warner');
assert.ok(benAlexElectricTwin, 'the two initial directors must share the dated incorporation surface');
const incorporationHopBasis = benAlexElectricTwin.surfaces.find(basis =>
  basis.surface_id === 'electric-twin-incorporation-2023-09-28');
assert.ok(incorporationHopBasis);
assert.equal(incorporationHopBasis.evidence_class, 'official');
assert.equal(incorporationHopBasis.valid_from, '2023-09-28');
assert.equal(incorporationHopBasis.valid_until, '2023-09-28');
assert.deepEqual(incorporationHopBasis.receipt_ids,
  ['companies-house-electric-twin-incorporation-2023-09-28']);
assert.equal(shortestPath(topology, 'ben-warner', 'alex-cooper', { asOf: '2023-09-27' }).number, null,
  'the incorporation record must not backdate initial-director adjacency');
assert.equal(shortestPath(topology, 'ben-warner', 'alex-cooper', { asOf: '2023-09-28' }).number, 1);
assert.equal(shortestPath(topology, 'ben-warner', 'alex-cooper', { asOf: '2023-09-29' }).number, null,
  'the incorporation event must not become an ongoing relationship');
for (const [surfaceId, actorId] of [
  ['electric-twin-ben-warner-director-tenure-2023-09-28', 'ben-warner'],
  ['electric-twin-alex-cooper-director-tenure-2023-09-28', 'alex-cooper'],
]) {
  const tenure = surf(surfaceId);
  assert.ok(tenure, `${surfaceId} must compile`);
  assert.equal(tenure.hop_eligible, false, `${surfaceId} must remain non-hop`);
  assert.equal(tenure.time_start, '2023-09-28');
  assert.equal(tenure.time_end, '2026-08-11');
  assert.deepEqual(tenure.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id),
    [actorId]);
  assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === surfaceId)),
    `${surfaceId} must never manufacture pairwise adjacency`);
}
const electricTwinIncorporationReceipt = receipt('companies-house-electric-twin-incorporation-2023-09-28');
assert.equal(electricTwinIncorporationReceipt.path,
  'receipts/topology/companies-house-electric-twin-incorporation-2023-09-28.md');
assert.equal(electricTwinIncorporationReceipt.evidence_class, 'official');
assert.equal(electricTwinIncorporationReceipt.event_date, '2023-09-28');
assert.equal(electricTwinIncorporationReceipt.retrieved_at, '2026-08-11');
assert.ok(actor('ben-warner').surfaces.includes('electric-twin-ben-warner-director-tenure-2023-09-28'));
assert.ok(actor('alex-cooper').surfaces.includes('electric-twin-alex-cooper-director-tenure-2023-09-28'));
assert.equal(shortestPath(topology, 'keir-starmer', 'matt-clifford', { asOf: '2025-01-13' }).number, 1);
assert.equal(shortestPath(topology, 'keir-starmer', 'matt-clifford', { asOf: '2025' }).number, 1);
assert.equal(
  shortestPath(topology, 'keir-starmer', 'matt-clifford', { asOf: '2025-01-12' }).number,
  null,
  'the source publication date is not the event date and must not create a 12 January path'
);
assert.equal(
  shortestPath(topology, 'keir-starmer', 'matt-clifford', { asOf: '2024' }).number,
  null,
  'the commission and development surface must not manufacture Starmer participation'
);

// The Electric Twin capital layer is a dated financing-announcement surface, not a 2023-2026 relationship span.
assert.equal(surf('electric-twin-funding-surface-2023-2026'), undefined,
  'the legacy multi-year funding surface must be retired');
const electricTwinSeed = surf('electric-twin-seed-round-2026-02-11');
assert.ok(electricTwinSeed, 'the source-native Electric Twin seed-round surface must compile');
assert.equal(electricTwinSeed.surface_label, 'Electric Twin $10m seed round named-angel record, 11 February 2026');
assert.equal(electricTwinSeed.hop_eligible, true);
assert.deepEqual(electricTwinSeed.receipt_ids, [
  'electric-twin-seed-round-announcement-2026-02-11',
  'alex-cooper-linkedin-electric-twin-funding-2026-02-12'
]);
assert.ok(!electricTwinSeed.receipt_ids.includes('master-doc-v3'),
  'the funding surface must no longer rest on the master-summary receipt');

const electricTwinSeedActors = electricTwinSeed.participants
  .filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id)
  .sort();
assert.deepEqual(electricTwinSeedActors, [
  'cal-henderson',
  'eric-salama',
  'louis-mosley',
  'marc-andreessen',
  'tom-shinner'
]);
const electricTwinSeedOrgs = electricTwinSeed.participants
  .filter(part => part.participant_type === 'organization')
  .map(part => part.organization_id)
  .sort();
assert.deepEqual(electricTwinSeedOrgs, ['electric-twin']);
const seedParticipant = id => electricTwinSeed.participants.find(part =>
  part.actor_id === id || part.organization_id === id);
for (const id of ['electric-twin', 'marc-andreessen', 'cal-henderson', 'eric-salama', 'tom-shinner', 'louis-mosley']) {
  assert.equal(seedParticipant(id).evidence_class, 'primary_public', `${id} must retain first-party evidence`);
}
for (const id of ['cal-henderson', 'eric-salama', 'tom-shinner', 'louis-mosley']) {
  assert.deepEqual(
    seedParticipant(id).receipt_ids,
    ['alex-cooper-linkedin-electric-twin-funding-2026-02-12'],
    `${id} must use the first-party founder receipt`,
  );
}

const electricTwinAnnouncementReceipt = receipt('electric-twin-seed-round-announcement-2026-02-11');
const alexCooperFundingReceipt = receipt('alex-cooper-linkedin-electric-twin-funding-2026-02-12');
assert.equal(electricTwinAnnouncementReceipt.path,
  'receipts/topology/electric-twin-seed-round-announcement-2026-02-11.md');
assert.equal(electricTwinAnnouncementReceipt.source_published_at, '2026-02-11');
assert.equal(electricTwinAnnouncementReceipt.event_date, '2026-02-11');
assert.ok(alexCooperFundingReceipt, 'the first-party founder funding receipt must exist');
assert.equal(alexCooperFundingReceipt.path,
  'receipts/topology/alex-cooper-linkedin-electric-twin-funding-2026-02-12.md');
assert.equal(alexCooperFundingReceipt.source_published_at, '2026-02-12');
assert.equal(alexCooperFundingReceipt.event_date, '2026-02-11',
  'the source date must remain separate from the announcement event date');
assert.equal(
  alexCooperFundingReceipt.archive.ref,
  'sha256:19d476ed9874693e3e8573d6fe5f5809920c7914b0024c14fc7e54c827ff2eab',
);
assert.equal(receipt('tech-eu-electric-twin-seed-round-2026-02-12'), undefined,
  'the superseded Tech.eu receipt must remain retired');

const andreessenSalama = hop.edges.find(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|') === 'eric-salama|marc-andreessen');
assert.ok(andreessenSalama, 'the first-party named angels must share the bounded announced round');
const electricTwinFundingBasis = andreessenSalama.surfaces.find(basis =>
  basis.surface_id === 'electric-twin-seed-round-2026-02-11');
assert.ok(electricTwinFundingBasis);
assert.equal(electricTwinFundingBasis.evidence_class, 'primary_public');
assert.equal(andreessenSalama.evidence_weight, 1.25);
assert.equal(electricTwinFundingBasis.valid_from, '2026-02-11');
assert.equal(electricTwinFundingBasis.valid_until, '2026-02-11');
assert.deepEqual(electricTwinFundingBasis.receipt_ids, [
  'electric-twin-seed-round-announcement-2026-02-11',
  'alex-cooper-linkedin-electric-twin-funding-2026-02-12'
]);
assert.equal(shortestPath(topology, 'marc-andreessen', 'eric-salama', { asOf: '2026-02-10' }).number, null,
  'the funding announcement must not backdate investor adjacency');
assert.equal(shortestPath(topology, 'marc-andreessen', 'eric-salama', { asOf: '2026-02-11' }).number, 1);
assert.equal(shortestPath(topology, 'marc-andreessen', 'eric-salama', { asOf: '2026-02-12' }).number, null,
  'a one-day announcement surface must not become an ongoing relationship');

const benBlumeAppointment = surf('electric-twin-ben-blume-director-appointment-2025-09-12');
assert.ok(benBlumeAppointment, 'the official Ben Blume officer appointment must compile separately');
assert.equal(benBlumeAppointment.hop_eligible, false);
assert.deepEqual(
  benBlumeAppointment.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id),
  ['ben-blume']
);
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === benBlumeAppointment.surface_id)),
  'a single-actor officer appointment must never manufacture pairwise adjacency');
const benBlumeReceipt = receipt('companies-house-electric-twin-ben-blume-director-2025-09-12');
assert.equal(benBlumeReceipt.event_date, '2025-09-12');
assert.equal(benBlumeReceipt.evidence_class, 'official');

// September 2025 corporate filings preserve governance rights and capital mechanics without inventing allottees.
const electricTwinGovernance = surf('electric-twin-seed2-governance-instrument-2025-09-12');
assert.ok(electricTwinGovernance, 'the September governance instrument must compile');
assert.equal(electricTwinGovernance.hop_eligible, false);
assert.equal(electricTwinGovernance.time_start, '2025-09-12');
assert.equal(electricTwinGovernance.time_end, '2025-09-12');
assert.deepEqual(
  electricTwinGovernance.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id).sort(),
  ['alex-cooper', 'ben-warner']
);
assert.deepEqual(
  electricTwinGovernance.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id).sort(),
  ['atomico', 'electric-twin', 'localglobe']
);
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === electricTwinGovernance.surface_id)),
  'the governance instrument must never create actor adjacency');

const electricTwinCapitalActions = surf('electric-twin-seed2-capital-actions-2025-09-16-2025-09-26');
assert.ok(electricTwinCapitalActions, 'the September capital-action sequence must compile');
assert.equal(electricTwinCapitalActions.hop_eligible, false);
assert.deepEqual(
  electricTwinCapitalActions.participants.map(part => part.organization_id ?? part.actor_id),
  ['electric-twin'],
  'unidentified allottees must not be manufactured as participants'
);
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === electricTwinCapitalActions.surface_id)),
  'issuer-only capital actions must never create actor adjacency');

const articlesReceipt = receipt('companies-house-electric-twin-articles-2025-09-12');
const resolutionsReceipt = receipt('companies-house-electric-twin-written-resolutions-2025-09-12');
const sh01Seed2Sixteen = receipt('companies-house-electric-twin-sh01-seed2-2025-09-16');
const sh01Seed2Seventeen = receipt('companies-house-electric-twin-sh01-seed2-2025-09-17');
const sh01Seed2TwentySix = receipt('companies-house-electric-twin-sh01-seed2-2025-09-26');
const sh08Seed1 = receipt('companies-house-electric-twin-sh08-seed1-2025-09-16');
const sh10Rights = receipt('companies-house-electric-twin-sh10-rights-2025-09-12');
for (const row of [articlesReceipt, resolutionsReceipt, sh01Seed2Sixteen, sh01Seed2Seventeen, sh01Seed2TwentySix, sh08Seed1, sh10Rights]) {
  assert.ok(row, 'every September filing must have a canonical receipt');
  assert.equal(row.evidence_class, 'official');
  assert.match(row.source_pdf_sha256, /^[0-9a-f]{64}$/);
  assert.equal(row.publisher, 'Companies House');
}
assert.equal(articlesReceipt.event_date, '2025-09-12');
assert.equal(articlesReceipt.source_published_at, '2025-09-23');
assert.equal(resolutionsReceipt.event_date, '2025-09-12');
assert.equal(sh01Seed2Sixteen.source_filing_code, 'XEBSKAZE');
assert.equal(sh01Seed2Seventeen.source_filing_code, 'XEBVCAMW');
assert.equal(sh01Seed2TwentySix.source_filing_code, 'XEC3EZXL');
assert.equal(sh08Seed1.event_date, '2025-09-16');
assert.equal(sh10Rights.event_date, '2025-09-12');

assert.ok(claim('electric-twin-seed2-board-rights-2025-09-12'));
assert.ok(claim('electric-twin-seed2-investor-rights-2025-09-12'));
assert.ok(claim('electric-twin-seed2-allotment-sequence-2025-09'));
const unidentifiedAllottees = claim('electric-twin-seed2-allottees-unidentified-2025-09');
assert.ok(unidentifiedAllottees);
assert.deepEqual(unidentifiedAllottees.actor_ids, []);
assert.deepEqual(unidentifiedAllottees.organization_ids, ['electric-twin']);
assert.ok(!unidentifiedAllottees.text.match(/Atomico|LocalGlobe|Mercuri|Samos|Andreessen|Henderson|Salama|Shinner|Mosley/),
  'the SH01 non-identification claim must not smuggle the announced roster into the filed allotments');

const benBlumeGovernanceParticipant = electricTwinGovernance.participants.find(part => part.actor_id === 'ben-blume');
assert.equal(benBlumeGovernanceParticipant, undefined,
  'the articles do not identify Ben Blume as an Atomico or LocalGlobe appointee');

// The previously undisclosed $4m pre-seed remains undated and has no promoted participant surface.
assert.ok(!surface.surfaces.some(row => /pre.?seed/i.test(row.surface_id)),
  'the undated pre-seed disclosure must not be promoted into a dated surface');

// The Strategic Defence Review lifecycle is split so commissioning authority cannot become year-long co-work.
const sdrDevelopment = surf('strategic-defence-review-development-2024-2025');
assert.ok(sdrDevelopment, 'the external-reviewer workstream must be compiled');
assert.equal(sdrDevelopment.hop_eligible, false, 'the review workstream must remain context only');
assert.deepEqual(sdrDevelopment.receipt_ids, ['gov-sdr-terms-of-reference', 'gov-sdr-2025-publication']);
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === sdrDevelopment.surface_id)),
  'the review workstream must never create actor adjacency');
assert.deepEqual(
  sdrDevelopment.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id).sort(),
  ['fiona-hill', 'george-robertson', 'john-healey', 'richard-barrons']
);

const sdrTermsReceipt = receipt('gov-sdr-terms-of-reference');
const sdrPublicationReceipt = receipt('gov-sdr-2025-publication');
assert.equal(sdrTermsReceipt.source_published_at, '2024-07-17');
assert.equal(sdrTermsReceipt.event_date, '2024-07-17');
assert.equal(sdrPublicationReceipt.source_published_at, '2025-06-02');
assert.equal(sdrPublicationReceipt.source_updated_at, '2025-07-08');
assert.equal(sdrPublicationReceipt.event_date, '2025-06-02');

const starmerBarrons = hop.edges.find(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|') === 'keir-starmer|richard-barrons');
assert.ok(starmerBarrons, 'Keir Starmer and Richard Barrons must connect on the bounded terms record');
const sdrTermsBasis = starmerBarrons.surfaces.find(basis => basis.surface_id === 'strategic-defence-review-2024-2025');
assert.ok(sdrTermsBasis, 'the Starmer/Barrons edge must name the terms-and-commission surface');
assert.equal(sdrTermsBasis.surface_label, 'Strategic Defence Review terms and commission, 17 July 2024');
assert.equal(sdrTermsBasis.evidence_class, 'official');
assert.equal(sdrTermsBasis.valid_from, '2024-07-17');
assert.equal(sdrTermsBasis.valid_until, '2024-07-17');
assert.deepEqual(sdrTermsBasis.receipt_ids, ['gov-sdr-terms-of-reference']);
const activeSdrTermsBasis = date => starmerBarrons.surfaces.filter(basis =>
  basis.surface_id === 'strategic-defence-review-2024-2025'
    && basis.valid_from <= date
    && basis.valid_until >= date);
assert.equal(activeSdrTermsBasis('2024-07-16').length, 0, 'the terms record must not backdate a direct hop to the launch date');
assert.equal(activeSdrTermsBasis('2024-07-17').length, 1, 'the terms record supports the direct hop only on its publication date');
assert.equal(activeSdrTermsBasis('2025-06-02').length, 0, 'final-report publication must not manufacture a later Prime Minister hop');
assert.equal(shortestPath(topology, 'keir-starmer', 'richard-barrons', { asOf: '2024-07-17' }).number, 1);

// Broad institutions are context, not actor-hop surfaces. The former No. 10
// office aggregation manufactured pairwise edges from reporting-line and
// roster inferences. It is replaced by a single-actor, source-native role
// observation with an explicit broad-institution refusal reason.
assert.equal(surf('no10-digital-data-advisory-2019-2021'), undefined, 'legacy broad No. 10 aggregation must be retired');
const no10Observation = surf('ben-warner-no10-digital-data-role-observation-2020-2021');
assert.ok(no10Observation, 'source-native Ben Warner No. 10 role observation must compile');
assert.equal(no10Observation.hop_eligible, false);
assert.equal(no10Observation.hop_refusal_reason, 'broad_institution_context_only');
assert.deepEqual(
  no10Observation.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id),
  ['ben-warner'],
  'No. 10 role observation must not import inferred colleagues as actor participants',
);
assert.deepEqual(
  no10Observation.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id),
  ['no-10'],
  'No. 10 may remain as broad institutional context only',
);
assert.deepEqual(no10Observation.receipt_ids, ['uk-covid-inquiry-ben-warner-decision-forward-planning-2020-03-13-16', 'gov-sage-89-ben-warner-no10-2021-05-13']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row =>
  row.surface_id === 'ben-warner-no10-digital-data-role-observation-2020-2021' && row.reason === 'broad_institution_context_only'),
  'compiled graph must expose the constitutional broad-institution refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === 'ben-warner-no10-digital-data-role-observation-2020-2021')),
  'single-actor No. 10 context must never become a hop basis');
for (const actorId of ['dominic-cummings', 'dan-rosenfield', 'laura-gilbert', 'ben-henshall']) {
  assert.ok(!no10Observation.participants.some(part => part.actor_id === actorId),
    `${actorId} must not survive as an inferred participant on the corrected No. 10 observation`);
}
const inquiryRoleReceipt = receipt('uk-covid-inquiry-ben-warner-decision-forward-planning-2020-03-13-16');
assert.equal(inquiryRoleReceipt.source_document_id, 'INQ000272142');
assert.equal(inquiryRoleReceipt.event_date_start, '2020-03-13');
assert.equal(inquiryRoleReceipt.event_date_end, '2020-03-16');
const sage89Receipt = receipt('gov-sage-89-ben-warner-no10-2021-05-13');
assert.equal(sage89Receipt.event_date, '2021-05-13');
assert.match(sage89Receipt.notes, /eighty-seven recorded attendees/i);
assert.equal(receipt('official-no10-ben-warner'), undefined,
  'master-document proxy receipt must be retired after source-native capture');
const voteLeave = surf('vote-leave-data-science-2016');
assert.ok(voteLeave, 'the Vote Leave / ASI organization-only surface must compile');
assert.equal(voteLeave.hop_eligible, false);
assert.equal(voteLeave.hop_refusal_reason, 'organization_only_evidence');
assert.deepEqual(
  voteLeave.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id),
  ['dominic-cummings'],
  'the parliamentary transcript must not manufacture Warner actor participation',
);
assert.deepEqual(
  voteLeave.participants.filter(part => part.participant_type === 'organization').map(part => part.organization_id),
  ['vote-leave'],
);
assert.deepEqual(voteLeave.receipt_ids, ['uk-parliament-wylie-vote-leave-asi-2018-03-27']);
assert.ok((hop.rejected_hop_surfaces ?? []).some(row =>
  row.surface_id === voteLeave.surface_id && row.reason === 'organization_only_evidence'),
  'compiled graph must expose the organization-only refusal');
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === voteLeave.surface_id)),
  'organization-only Vote Leave evidence must never become a hop basis');
for (const actorId of ['ben-warner', 'marc-warner']) {
  assert.ok(!voteLeave.participants.some(part => part.actor_id === actorId),
    `${actorId} must not survive as an inferred Vote Leave participant`);
  assert.ok(!actor(actorId).surfaces.includes(voteLeave.surface_id),
    `${actorId} score must not inherit the organization-only Vote Leave surface`);
}
for (const pair of [
  ['marc-warner', 'dominic-cummings'],
]) {
  assert.ok(!hop.edges.some(edge =>
    [edge.actor_a, edge.actor_b].sort().join('|') === [...pair].sort().join('|')),
    `${pair.join('/')} must have no direct edge after the organization-only correction`);
}
const voteLeaveReceipt = receipt('uk-parliament-wylie-vote-leave-asi-2018-03-27');
assert.ok(voteLeaveReceipt, 'the official Parliament transcript receipt must exist');
assert.equal(voteLeaveReceipt.source_document_id, 'HC 363');
assert.equal(voteLeaveReceipt.event_date, '2018-03-27');
assert.match(voteLeaveReceipt.notes, /organization-level service relationship/i);
assert.ok(!voteLeave.receipt_ids.includes('warner-surface-audit-2026-06-29'),
  'the corrected Vote Leave surface must carry no lost scratch receipt');


// Anduril UK deep-and-wide official topology regression.
const andurilUkLegal = org('anduril-industries-uk-ltd');
assert.ok(andurilUkLegal, 'exact Anduril UK legal entity must compile');
const andurilUkLegalSource = JSON.parse(fs.readFileSync('data/canonical/organizations.json', 'utf8')).organizations.find(row => row.id === 'anduril-industries-uk-ltd');
assert.equal(andurilUkLegalSource?.company_number, '12316056');

const andurilOfficerSurface = surf('anduril-uk-co-director-appointments-2024-07-31');
assert.ok(andurilOfficerSurface);
assert.equal(andurilOfficerSurface.hop_eligible, true);
assert.equal(andurilOfficerSurface.time_start, '2024-07-31');
assert.equal(andurilOfficerSurface.time_end, '2024-07-31');
assert.deepEqual(andurilOfficerSurface.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id).sort(), ['maury-shenk', 'rich-drake']);
const shenkDrakeEdge = hop.edges.find(edge => [edge.actor_a, edge.actor_b].sort().join('|') === 'maury-shenk|rich-drake');
assert.ok(shenkDrakeEdge?.surfaces.some(basis => basis.surface_id === andurilOfficerSurface.surface_id && basis.valid_from === '2024-07-31' && basis.valid_until === '2024-07-31'));

const talosNamedSurface = surf('anduril-talos-phase-3-named-principals-2023-11-02');
assert.ok(talosNamedSurface);
assert.equal(talosNamedSurface.hop_eligible, true);
assert.deepEqual(talosNamedSurface.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id).sort(), ['dan-sawyers', 'greg-kausner']);
const sawyersKausnerEdge = hop.edges.find(edge => [edge.actor_a, edge.actor_b].sort().join('|') === 'dan-sawyers|greg-kausner');
assert.ok(sawyersKausnerEdge?.surfaces.some(basis => basis.surface_id === talosNamedSurface.surface_id && basis.valid_from === '2023-11-02' && basis.valid_until === '2023-11-02'));

const ukraineNamedSurface = surf('anduril-ukraine-drone-deal-named-principals-2025-03-06');
assert.ok(ukraineNamedSurface);
assert.equal(ukraineNamedSurface.hop_eligible, true);
assert.deepEqual(ukraineNamedSurface.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id).sort(), ['john-healey', 'rich-drake']);
const drakeHealeyEdge = hop.edges.find(edge => [edge.actor_a, edge.actor_b].sort().join('|') === 'john-healey|rich-drake');
assert.ok(drakeHealeyEdge?.surfaces.some(basis => basis.surface_id === ukraineNamedSurface.surface_id && basis.valid_from === '2025-03-06' && basis.valid_until === '2025-03-06'));

const drakeCliffordRoute = shortestPath(topology, 'rich-drake', 'matt-clifford');
assert.equal(drakeCliffordRoute.number, 3);
assert.deepEqual(drakeCliffordRoute.actor_path, ['rich-drake', 'john-healey', 'keir-starmer', 'matt-clifford']);
for (const date of ['2024-07-17', '2025-01-13', '2025-03-06']) {
  assert.equal(shortestPath(topology, 'rich-drake', 'matt-clifford', { asOf: date }).number, null,
    'the cross-date Rich Drake to Matt Clifford route must not masquerade as contemporaneous');
}
const shenkCliffordRoute = shortestPath(topology, 'maury-shenk', 'matt-clifford');
assert.equal(shenkCliffordRoute.number, 4);
assert.deepEqual(shenkCliffordRoute.actor_path, ['maury-shenk', 'rich-drake', 'john-healey', 'keir-starmer', 'matt-clifford']);
assert.ok(!hop.edges.some(edge => [edge.actor_a, edge.actor_b].sort().join('|') === 'matt-clifford|rich-drake'),
  'the widened chronology must not manufacture a direct Clifford/Drake edge');

for (const [surfaceId, refusal] of [
  ['anduril-ai-fight-tonight-award-2021-07-31', 'organization_only_procurement_instrument'],
  ['anduril-talos-phase-2-award-2021-08-02', 'organization_only_procurement_instrument'],
  ['anduril-copci-border-force-contract-2022-06-21', 'organization_only_procurement_instrument'],
  ['anduril-project-entrelezar-award-2023-10-09', 'supplier_identity_reference_conflict'],
  ['anduril-ddad-framework-2026-01-09', 'organization_only_multi_supplier_framework'],
  ['anduril-project-nyx-seven-supplier-shortlist-2026-01-24', 'organization_only_competitive_shortlist'],
  ['anduril-project-nyx-four-supplier-downselect-2026-05-15', 'organization_only_competitive_shortlist'],
]) {
  const sourceSurface = surf(surfaceId);
  assert.ok(sourceSurface, `${surfaceId} must compile`);
  assert.equal(sourceSurface.hop_eligible, false);
  assert.equal(sourceSurface.hop_refusal_reason, refusal);
  assert.ok((hop.rejected_hop_surfaces ?? []).some(row => row.surface_id === surfaceId && row.reason === refusal));
  assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === surfaceId)));
}

const andurilCompanyReceipt = receipt('companies-house-anduril-industries-uk-12316056');
assert.equal(andurilCompanyReceipt.company_number, '12316056');
assert.equal(andurilCompanyReceipt.rich_drake_appointed_at, '2024-07-31');
assert.equal(andurilCompanyReceipt.maury_shenk_appointed_at, '2024-07-31');
assert.equal(andurilCompanyReceipt.archive.ref, 'sha256:6d2a1b4cdf9b7453d922756a92fb93e8fb8e1ae6ac2da656c8cb318669085eea');
const talos3Receipt = receipt('gov-mod-anduril-talos-phase-3-contract-2023-11-02');
assert.deepEqual([...talos3Receipt.named_actor_ids].sort(), ['dan-sawyers', 'greg-kausner']);
assert.equal(talos3Receipt.archive.ref, 'sha256:6660b2890c6756ad9016bf2d4b90d4a132a32f01c22a9ea1b55cc1c436da876a');
const ukraineReceipt = receipt('gov-mod-anduril-ukraine-drone-deal-2025-03-06');
assert.deepEqual([...ukraineReceipt.named_actor_ids].sort(), ['john-healey', 'rich-drake']);
assert.equal(ukraineReceipt.rich_drake_present_at_healey_visit_established, false);
assert.equal(ukraineReceipt.archive.ref, 'sha256:3665b9dfa78010a228068df32fae92a3c710e536d554ae2871b2b334f2fa86ca');
const entrelezarReceipt = receipt('contracts-finder-anduril-project-entrelezar-2023-10-09');
assert.equal(entrelezarReceipt.supplier_identity_resolved, false);
assert.equal(entrelezarReceipt.supplier_reference_company_number, '12316056');
assert.equal(entrelezarReceipt.archive.ref, 'sha256:79d95a713860977a55c76363b3b06abfe0e2f4c9f6139c5a1b3d923533ecf338');
assert.ok(claim('rich-drake-to-matt-clifford-three-hop-all-time-route-2026-08-12'));
assert.ok(claim('anduril-uk-official-procurement-chronology-2021-2026'));


// Atlantic Bastion official launch-publication regression.
{
  const surface = surf('atlantic-bastion-launch-publication-2025-12-08');
  assert.ok(surface, 'Atlantic Bastion launch surface must compile');
  assert.equal(surface.hop_eligible, true);
  assert.equal(surface.time_start, '2025-12-08');
  assert.equal(surface.time_end, '2025-12-08');
  assert.equal(surface.evidence_class, 'official');
  const actorIds = surface.participants
    .filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id)
    .sort();
  assert.deepEqual(actorIds, [
    'amelia-gould-helsing',
    'gwyn-jenkins',
    'john-healey',
    'rich-drake',
    'scott-jamieson-bae',
  ]);
  const pairKey = edge => [edge.actor_a, edge.actor_b].sort().join('|');
  const launchEdges = hop.edges.filter(edge =>
    edge.surfaces.some(basis => basis.surface_id === 'atlantic-bastion-launch-publication-2025-12-08'));
  assert.equal(launchEdges.length, 10, 'five named launch participants must compile to ten exact publication bases');
  const expectedPairs = [];
  for (let i = 0; i < actorIds.length; i++) {
    for (let j = i + 1; j < actorIds.length; j++) expectedPairs.push([actorIds[i], actorIds[j]].sort().join('|'));
  }
  assert.deepEqual(launchEdges.map(pairKey).sort(), expectedPairs.sort());
  const healeyDrake = hop.edges.find(edge => pairKey(edge) === 'john-healey|rich-drake');
  assert.ok(healeyDrake?.surfaces.some(basis =>
    basis.surface_id === 'atlantic-bastion-launch-publication-2025-12-08'
      && basis.valid_from === '2025-12-08'
      && basis.valid_until === '2025-12-08'));
  for (const actorId of ['gwyn-jenkins', 'scott-jamieson-bae', 'amelia-gould-helsing']) {
    assert.equal(shortestPath(topology, actorId, 'matt-clifford').number, 3,
      `${actorId} must have a three-hop all-time route to Matt Clifford`);
    assert.equal(shortestPath(topology, actorId, 'matt-clifford', { asOf: '2025-12-08' }).number, null,
      `${actorId} route must be refused as contemporaneous on the launch date`);
    assert.ok(!hop.edges.some(edge => pairKey(edge) === [actorId, 'matt-clifford'].sort().join('|')),
      `${actorId} must not receive a direct Matt Clifford edge`);
  }
  const context = surf('atlantic-bastion-industry-program-context-2025-12-08');
  assert.ok(context, 'Atlantic Bastion wider programme context must compile');
  assert.equal(context.hop_eligible, false);
  assert.equal(context.hop_refusal_reason, 'organization_only_multi_party_program_context');
  assert.equal(context.roster_entry_count, 20);
  assert.equal(context.proposal_count, 26);
  assert.ok((hop.rejected_hop_surfaces ?? []).some(row =>
    row.surface_id === 'atlantic-bastion-industry-program-context-2025-12-08'
      && row.reason === 'organization_only_multi_party_program_context'));
  assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === 'atlantic-bastion-industry-program-context-2025-12-08')));
  const sourceReceipt = receipt('gov-mod-atlantic-bastion-launch-2025-12-08');
  assert.equal(sourceReceipt.archive.ref, 'sha256:fbdc504cf86258811277a259578e9e217108bd5fc0033b82c0c5d242f93db059');
  assert.deepEqual([...sourceReceipt.named_actor_ids].sort(), actorIds);
  assert.equal(sourceReceipt.all_named_actors_same_physical_event_established, false);
  assert.equal(sourceReceipt.matt_clifford_named, false);
  assert.ok(claim('atlantic-bastion-named-launch-publication-cohort-2025-12-08'));
  assert.ok(claim('atlantic-bastion-industry-denominator-boundary-2025-12-08'));
  assert.ok(claim('matt-clifford-atlantic-bastion-boundary-2025-12-08'));
}


// Entrepreneur First official cofounder observation regression.
{
  const efSurface = surf('entrepreneur-first-cofounder-observation-2018-07-05');
  assert.ok(efSurface, 'Entrepreneur First cofounder observation must compile');
  assert.equal(efSurface.surface_type, 'founder_officer_surface');
  assert.equal(efSurface.hop_eligible, true);
  assert.equal(efSurface.evidence_class, 'official');
  assert.equal(efSurface.time_start, '2018-07-05');
  assert.equal(efSurface.time_end, '2018-07-05');
  const efActorIds = efSurface.participants
    .filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id)
    .sort();
  assert.deepEqual(efActorIds, ['alice-bentinck', 'matt-clifford']);
  assert.deepEqual(
    efSurface.participants
      .filter(part => part.participant_type === 'organization')
      .map(part => part.organization_id),
    ['entrepreneur-first'],
  );
  const efPairKey = ['alice-bentinck', 'matt-clifford'].sort().join('|');
  const efEdge = hop.edges.find(edge => [edge.actor_a, edge.actor_b].sort().join('|') === efPairKey);
  assert.ok(efEdge, 'official cofounder observation must create the Alice Bentinck–Matt Clifford edge');
  const efBases = efEdge.surfaces.filter(basis => basis.surface_id === 'entrepreneur-first-cofounder-observation-2018-07-05');
  assert.equal(efBases.length, 1, 'Entrepreneur First surface must create exactly one pair basis');
  assert.equal(efBases[0].evidence_class, 'official');
  assert.equal(efBases[0].valid_from, '2018-07-05');
  assert.equal(efBases[0].valid_until, '2018-07-05');
  assert.equal(shortestPath(topology, 'alice-bentinck', 'matt-clifford').number, 1);
  assert.equal(shortestPath(topology, 'alice-bentinck', 'matt-clifford', { asOf: '2018-07-04' }).number, null);
  assert.equal(shortestPath(topology, 'alice-bentinck', 'matt-clifford', { asOf: '2018-07-05' }).number, 1);
  assert.equal(shortestPath(topology, 'alice-bentinck', 'matt-clifford', { asOf: '2018-07-06' }).number, null);
  assert.ok(actor('alice-bentinck')?.surfaces.includes('entrepreneur-first-cofounder-observation-2018-07-05'));
  const efReceipt = receipt('gov-uk-france-ai-data-entrepreneur-first-cofounders-2018-07-05');
  assert.ok(efReceipt, 'official Entrepreneur First cofounder receipt must exist');
  assert.equal(efReceipt.archive.ref, 'sha256:61b789474e442854b3613ba017f05e5e6d46f417916ec35b75e05ee40165111e');
  assert.deepEqual([...efReceipt.named_actor_ids].sort(), ['alice-bentinck', 'matt-clifford']);
  assert.equal(efReceipt.reported_foundation_year, 2011);
  assert.equal(efReceipt.exact_foundation_date_established, false);
  assert.equal(efReceipt.continuous_shared_management_established, false);
  assert.equal(efReceipt.current_ownership_established, false);
  assert.ok(claim('entrepreneur-first-cofounders-official-observation-2018-07-05'));
}

console.log('compiler.test: OK');


// Matt Clifford × Anduril exact-event and procurement-boundary regression.
const andurilOrg = org('anduril-industries');
assert.ok(andurilOrg, 'Anduril Industries must exist as a source-scoped organization');
const cliffordSummitAppointment = surf('ai-safety-summit-representative-appointment-2023-08-10');
const andurilSummitRoundtable = surf('dsit-techuk-anduril-ai-safety-roundtable-2023-10-17');
const cliffordInvestorRoundtable = surf('dsit-matt-clifford-ai-investor-roundtable-2023-10-25');
const andurilTalosObservation = surf('anduril-talos-phase-3-contract-observation-2023-11-02');
for (const surfaceRow of [cliffordSummitAppointment, andurilSummitRoundtable, cliffordInvestorRoundtable, andurilTalosObservation]) {
  assert.ok(surfaceRow, 'every Clifford-Anduril boundary surface must compile');
  assert.equal(surfaceRow.hop_eligible, false, `${surfaceRow.surface_id} must remain graph inert`);
  assert.ok((hop.rejected_hop_surfaces ?? []).some(row => row.surface_id === surfaceRow.surface_id),
    `${surfaceRow.surface_id} refusal must remain public`);
  assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === surfaceRow.surface_id)),
    `${surfaceRow.surface_id} must never create actor adjacency`);
}
assert.equal(cliffordSummitAppointment.hop_refusal_reason, 'single_actor_appointment_context');
assert.equal(andurilSummitRoundtable.hop_refusal_reason, 'organization_only_multi_party_roundtable');
assert.equal(andurilSummitRoundtable.time_start, '2023-10-17');
assert.equal(andurilSummitRoundtable.time_end, '2023-10-17');
assert.equal(andurilSummitRoundtable.roster_entry_count, 16);
assert.deepEqual(andurilSummitRoundtable.participants.filter(p => p.participant_type === 'actor'), []);
assert.deepEqual(andurilSummitRoundtable.participants.filter(p => p.participant_type === 'organization').map(p => p.organization_id).sort(), ['anduril-industries','dsit']);
assert.equal(cliffordInvestorRoundtable.hop_refusal_reason, 'single_actor_multi_party_roundtable');
assert.equal(cliffordInvestorRoundtable.time_start, '2023-10-25');
assert.equal(cliffordInvestorRoundtable.time_end, '2023-10-25');
assert.equal(cliffordInvestorRoundtable.roster_entry_count, 9);
assert.deepEqual(cliffordInvestorRoundtable.participants.filter(p => p.participant_type === 'actor').map(p => p.actor_id), ['matt-clifford']);
assert.ok(!cliffordInvestorRoundtable.participants.some(p => p.organization_id === 'anduril-industries'));
assert.equal(andurilTalosObservation.hop_refusal_reason, 'organization_only_procurement_instrument');
assert.deepEqual(andurilTalosObservation.participants.filter(p => p.participant_type === 'actor'), []);
assert.deepEqual(andurilTalosObservation.participants.filter(p => p.participant_type === 'organization').map(p => p.organization_id).sort(), ['anduril-industries','mod']);
const andurilMeetingReceipt = receipt('gov-dsit-clifford-anduril-separate-summit-roundtables-2023-10-17-25');
const cliffordAppointmentReceipt = receipt('gov-matt-clifford-ai-safety-summit-representative-2023-08-10');
const andurilTalosReceipt = receipt('gov-mod-anduril-talos-phase-3-contract-2023-11-02');
assert.equal(andurilMeetingReceipt.same_recorded_event, false);
assert.equal(andurilMeetingReceipt.archive?.ref, 'sha256:6319116d831d2edd8356e3f9b73acb49399acddc5ff79632917429896fa04203');
assert.equal(cliffordAppointmentReceipt.anduril_named, false);
assert.equal(cliffordAppointmentReceipt.archive?.ref, 'sha256:3f49abb5313850e2e79477225c38ce34956c42ddec30519147e0a8fde331cfd2');
assert.equal(andurilTalosReceipt.matt_clifford_named, false);
assert.equal(andurilTalosReceipt.archive?.ref, 'sha256:6660b2890c6756ad9016bf2d4b90d4a132a32f01c22a9ea1b55cc1c436da876a');
const cliffordAndurilMeetingBoundary = claim('matt-clifford-anduril-separate-summit-events-boundary-2026-08-12');
const cliffordAndurilTalosBoundary = claim('matt-clifford-anduril-talos-procurement-boundary-2026-08-12');
assert.ok(cliffordAndurilMeetingBoundary, 'separate summit-event boundary must remain public');
assert.ok(cliffordAndurilTalosBoundary, 'TALOS procurement boundary must remain public');
assert.deepEqual(cliffordAndurilMeetingBoundary.actor_ids, ['matt-clifford']);
assert.ok(cliffordAndurilMeetingBoundary.organization_ids.includes('anduril-industries'));
assert.ok(!hop.edges.some(edge => [edge.actor_a, edge.actor_b].includes('matt-clifford')
  && edge.surfaces.some(basis => basis.surface_id.includes('anduril'))),
  'Anduril organization context must not manufacture a Matt Clifford actor edge');


// Frontier AI Taskforce External Advisory Board exact appointment regression.
{
  const frontierBoardSurface = surf('frontier-ai-taskforce-external-advisory-board-appointments-2023-09-07');
  const frontierBoardActors = ["matt-clifford","yoshua-bengio","anne-keast-butler","alex-van-someren","matt-collins-national-security","paul-christiano","helen-stokes-lampard"].sort();
  assert.ok(frontierBoardSurface, 'Frontier AI Taskforce board appointment surface must compile');
  assert.equal(frontierBoardSurface.hop_eligible, true);
  assert.equal(frontierBoardSurface.surface_type, 'board_advisory_surface');
  assert.equal(frontierBoardSurface.evidence_class, 'official');
  assert.equal(frontierBoardSurface.time_start, '2023-09-07');
  assert.equal(frontierBoardSurface.time_end, '2023-09-07');
  assert.equal(frontierBoardSurface.roster_entry_count, 7);
  const frontierBoardParts = frontierBoardSurface.participants;
  assert.deepEqual(
    frontierBoardParts.filter(part => part.participant_type === 'actor').map(part => part.actor_id).sort(),
    frontierBoardActors,
  );
  assert.deepEqual(
    frontierBoardParts.filter(part => part.participant_type === 'organization').map(part => part.organization_id).sort(),
    ['aisi', 'dsit'],
  );
  assert.equal(
    frontierBoardParts.find(part => part.actor_id === 'matt-clifford')?.participation_type,
    'external_advisory_board_vice_chair_appointment',
  );
  for (const actorId of frontierBoardActors.filter(id => id !== 'matt-clifford')) {
    assert.equal(
      frontierBoardParts.find(part => part.actor_id === actorId)?.participation_type,
      'external_advisory_board_member_appointment',
    );
  }
  const frontierPairKey = edge => [edge.actor_a, edge.actor_b].sort().join('|');
  const frontierBoardEdges = hop.edges.filter(edge =>
    edge.surfaces.some(basis => basis.surface_id === 'frontier-ai-taskforce-external-advisory-board-appointments-2023-09-07'));
  assert.equal(frontierBoardEdges.length, 21, 'seven board appointees must create exactly twenty-one appointment bases');
  const expectedFrontierPairs = [];
  for (let i = 0; i < frontierBoardActors.length; i++) {
    for (let j = i + 1; j < frontierBoardActors.length; j++) {
      expectedFrontierPairs.push([frontierBoardActors[i], frontierBoardActors[j]].sort().join('|'));
    }
  }
  assert.deepEqual(frontierBoardEdges.map(frontierPairKey).sort(), expectedFrontierPairs.sort());
  for (const edge of frontierBoardEdges) {
    const basis = edge.surfaces.find(row => row.surface_id === 'frontier-ai-taskforce-external-advisory-board-appointments-2023-09-07');
    assert.equal(basis.evidence_class, 'official');
    assert.equal(basis.valid_from, '2023-09-07');
    assert.equal(basis.valid_until, '2023-09-07');
  }
  for (const actorId of frontierBoardActors.filter(id => id !== 'matt-clifford')) {
    assert.equal(shortestPath(topology, actorId, 'matt-clifford').number, 1,
      actorId + ' must have one exact board-appointment hop to Matt Clifford');
  }
  assert.ok(!frontierBoardParts.some(part => ['ian-hogarth', 'yarin-gal', 'david-kreuger'].includes(part.actor_id)),
    'non-board roles named elsewhere in the announcement must not enter the board cohort');
  const frontierBoardReceipt = receipt('gov-frontier-ai-taskforce-external-advisory-board-2023-09-07');
  assert.ok(frontierBoardReceipt);
  assert.equal(frontierBoardReceipt.archive.ref, 'sha256:be863ec337a09a6f695bc5905a44cd811022ca3b15931bcaed74fbeec943576e');
  assert.deepEqual([...frontierBoardReceipt.board_member_actor_ids].sort(), frontierBoardActors);
  assert.equal(frontierBoardReceipt.board_member_count, 7);
  assert.equal(frontierBoardReceipt.vice_chair_actor_id, 'matt-clifford');
  assert.equal(frontierBoardReceipt.members_join_as_individuals, true);
  assert.equal(frontierBoardReceipt.active_contribution_to_all_meetings_stated, true);
  assert.equal(frontierBoardReceipt.first_meeting_date_established, false);
  assert.equal(frontierBoardReceipt.continuous_tenure_established, false);
  assert.equal(frontierBoardReceipt.employer_representation_established, false);
  assert.equal(frontierBoardReceipt.procurement_participation_established, false);
  const frontierBoardClaim = claim('frontier-ai-taskforce-external-advisory-board-cohort-2023-09-07');
  assert.ok(frontierBoardClaim);
  assert.deepEqual([...frontierBoardClaim.actor_ids].sort(), frontierBoardActors);
  assert.deepEqual(frontierBoardClaim.surface_ids, ['frontier-ai-taskforce-external-advisory-board-appointments-2023-09-07']);
}

// Electric Twin × Virgin exact MAD//Fest shared-stage regression.
{
  const madfestSurface = surf('electric-twin-virgin-madfest-session-2026-07-08');
  const madfestActorIds = ['ben-warner', 'james-tyrrell', 'michael-barber-virgin'].sort();
  const madfestOrganizationIds = ['electric-twin', 'virgin'].sort();
  assert.ok(madfestSurface, 'the exact Electric Twin / Virgin MAD//Fest session must compile');
  assert.equal(madfestSurface.surface_type, 'customer_vendor_surface');
  assert.deepEqual(
    [...madfestSurface.secondary_surface_types].sort(),
    ['category_formation_surface', 'model_governance_surface'],
  );
  assert.equal(madfestSurface.hop_eligible, true);
  assert.equal(madfestSurface.evidence_class, 'primary_public');
  assert.equal(madfestSurface.time_start, '2026-07-08');
  assert.equal(madfestSurface.time_end, '2026-07-08');
  assert.deepEqual(
    madfestSurface.participants
      .filter(part => part.participant_type === 'actor')
      .map(part => part.actor_id)
      .sort(),
    madfestActorIds,
  );
  assert.deepEqual(
    madfestSurface.participants
      .filter(part => part.participant_type === 'organization')
      .map(part => part.organization_id)
      .sort(),
    madfestOrganizationIds,
  );
  assert.deepEqual(madfestSurface.receipt_ids, ['madfest-electric-twin-virgin-session-2026-07-08']);

  const pairKeyMadfest = edge => [edge.actor_a, edge.actor_b].sort().join('|');
  const expectedMadfestPairs = [
    'ben-warner|james-tyrrell',
    'ben-warner|michael-barber-virgin',
    'james-tyrrell|michael-barber-virgin',
  ].sort();
  const madfestEdges = hop.edges.filter(edge =>
    edge.surfaces.some(basis =>
      basis.surface_id === 'electric-twin-virgin-madfest-session-2026-07-08'));
  assert.equal(madfestEdges.length, 3,
    'three confirmed speakers must create exactly three shared-session bases');
  assert.deepEqual(madfestEdges.map(pairKeyMadfest).sort(), expectedMadfestPairs);
  for (const edge of madfestEdges) {
    const basis = edge.surfaces.find(row =>
      row.surface_id === 'electric-twin-virgin-madfest-session-2026-07-08');
    assert.ok(basis);
    assert.equal(basis.evidence_class, 'primary_public');
    assert.equal(basis.valid_from, '2026-07-08');
    assert.equal(basis.valid_until, '2026-07-08');
    assert.deepEqual(basis.receipt_ids, ['madfest-electric-twin-virgin-session-2026-07-08']);
  }

  const madfestReceipt = receipt('madfest-electric-twin-virgin-session-2026-07-08');
  assert.ok(madfestReceipt);
  assert.equal(madfestReceipt.post_event_linkedin_activity_id, '7481323614089420800');
  assert.equal(madfestReceipt.pre_event_linkedin_activity_id, '7477684891963531264');
  assert.equal(madfestReceipt.shared_stage_confirmed, true);
  assert.equal(madfestReceipt.agenda_listing_alone_treated_as_attendance, false);
  assert.equal(madfestReceipt.virgin_identity_scope, 'source_name_only');
  assert.equal(madfestReceipt.virgin_legal_entity_resolved, false);
  assert.equal(madfestReceipt.contract_terms_established, false);
  assert.equal(
    madfestReceipt.archive?.ref,
    'sha256:5cbbcb8f7fa18c0c29e2f97dea26ebb1608b02a28463c1af5e48a7b6e5451c13',
  );

  const sourceOrganizations = JSON.parse(
    fs.readFileSync('data/canonical/organizations.json', 'utf8'),
  ).organizations;
  const virginSource = sourceOrganizations.find(row => row.id === 'virgin');
  assert.ok(virginSource);
  assert.equal(virginSource.identity_status, 'source_name_scope');
  assert.match(virginSource.notes, /does not resolve/i);

  const madfestTopology = buildAdjacency(hop.edges);
  for (const actorId of ['james-tyrrell', 'michael-barber-virgin']) {
    assert.equal(actor(actorId)?.clifford_number, 3,
      `${actorId} must inherit a three-hop all-time route through Ben Warner`);
    assert.deepEqual(
      shortestPath(madfestTopology, actorId, 'matt-clifford').actor_path,
      [actorId, 'ben-warner', 'marc-warner', 'matt-clifford'],
    );
    assert.equal(
      shortestPath(madfestTopology, actorId, 'matt-clifford', { asOf: '2026-07-08' }).number,
      null,
      `${actorId} must not receive a contemporaneous route from cross-date surfaces`,
    );
    assert.ok(!hop.edges.some(edge =>
      pairKeyMadfest(edge) === [actorId, 'matt-clifford'].sort().join('|')),
      `${actorId} must not receive an unsupported direct Matt Clifford edge`);
    assert.deepEqual(actor(actorId)?.surfaces, ['electric-twin-virgin-madfest-session-2026-07-08']);
  }

  assert.ok(claim('electric-twin-virgin-madfest-shared-stage-2026-07-08'));
  assert.ok(claim('electric-twin-virgin-madfest-identity-and-contract-boundary-2026-07-08'));
}


// Ben Warner / Dominic Cummings exact email-routing regression.
{
  const emailSurface = surf('ben-warner-cummings-shafi-contain-delay-email-2020-03-08');
  assert.ok(emailSurface, 'contain-to-delay email surface must compile');
  assert.equal(emailSurface.hop_eligible, true);
  assert.equal(emailSurface.time_start, '2020-03-08');
  assert.equal(emailSurface.time_end, '2020-03-08');
  assert.equal(emailSurface.evidence_class, 'official');
  const actorIds = emailSurface.participants
    .filter(part => part.participant_type === 'actor')
    .map(part => part.actor_id)
    .sort();
  assert.deepEqual(actorIds, ['ben-warner', 'dominic-cummings', 'imran-shafi']);
  const pairKey = edge => [edge.actor_a, edge.actor_b].sort().join('|');
  const emailEdges = hop.edges.filter(edge =>
    edge.surfaces.some(basis => basis.surface_id === 'ben-warner-cummings-shafi-contain-delay-email-2020-03-08'));
  assert.equal(emailEdges.length, 3, 'three named email actors must compile to three exact bases');
  assert.deepEqual(emailEdges.map(pairKey).sort(), [
    'ben-warner|dominic-cummings',
    'ben-warner|imran-shafi',
    'dominic-cummings|imran-shafi',
  ]);
  assert.ok(emailEdges.every(edge => edge.surfaces.some(basis =>
    basis.surface_id === 'ben-warner-cummings-shafi-contain-delay-email-2020-03-08'
      && basis.valid_from === '2020-03-08'
      && basis.valid_until === '2020-03-08'
      && basis.evidence_class === 'official')));
  assert.equal(shortestPath(topology, 'ben-warner', 'dominic-cummings', { asOf: '2020-03-07' }).number, null);
  assert.equal(shortestPath(topology, 'ben-warner', 'dominic-cummings', { asOf: '2020-03-08' }).number, 1);
  assert.equal(shortestPath(topology, 'ben-warner', 'dominic-cummings', { asOf: '2020-03-09' }).number, null);
  assert.equal(shortestPath(topology, 'dominic-cummings', 'matt-clifford').number, 3);
  assert.equal(shortestPath(topology, 'imran-shafi', 'matt-clifford').number, 3);
  assert.equal(shortestPath(topology, 'dominic-cummings', 'matt-clifford', { asOf: '2020-03-08' }).number, null);
  const voteLeave = surf('vote-leave-data-science-2016');
  assert.equal(voteLeave.hop_eligible, false);
  assert.equal(voteLeave.hop_refusal_reason, 'organization_only_evidence');
  assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === 'vote-leave-data-science-2016')));
  const sourceReceipt = receipt('uk-covid-inquiry-ben-warner-cummings-shafi-email-2020-03-08');
  assert.equal(sourceReceipt.document_id, 'INQ000195879');
  assert.equal(sourceReceipt.sender_actor_id, 'ben-warner');
  assert.deepEqual([...sourceReceipt.recipient_actor_ids].sort(), ['dominic-cummings', 'imran-shafi']);
  assert.equal(sourceReceipt.archive.ref, 'sha256:698acebeb0b95b957d518eba7569215062568040a70575e9203ddaff89683b77');
  assert.equal(sourceReceipt.catalogue_metadata_only, true);
  assert.equal(sourceReceipt.email_body_used_for_claims, false);
  assert.equal(sourceReceipt.policy_agreement_established, false);
  assert.ok(claim('ben-warner-cummings-shafi-contain-delay-email-2020-03-08'));
  assert.ok(claim('vote-leave-campaign-to-covid-email-boundary-2020-03-08'));
}
