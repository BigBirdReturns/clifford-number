#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function resolve(value) {
  return path.isAbsolute(value) ? value : path.join(root, value);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(file, rows) {
  fs.writeFileSync(file, `${rows.map(row => JSON.stringify(row)).join('\n')}\n`);
}

function required(condition, message) {
  if (!condition) throw new Error(message);
}

const selectionFile = resolve(option('selection', 'data/intake/linkedin-targeted-review/selection.json'));
const capturesFile = resolve(option('captures', 'data/local/linkedin-profile-captures.jsonl'));
const claimsFile = resolve(option('claims', 'data/local/linkedin-profile-role-claims.jsonl'));
const crossingsFile = resolve(option('crossings', 'data/local/linkedin-role-crossing-candidates.jsonl'));
const outputDir = resolve(option('output', 'data/intake/linkedin-targeted-review'));

const selection = readJson(selectionFile);
const captureRows = readJsonl(capturesFile);
const claimRows = readJsonl(claimsFile);
const crossingRows = readJsonl(crossingsFile);
const selectedIds = new Set(selection.capture_ids);
const captureIndex = new Map(captureRows.map(row => [row.capture_id, row]));
const order = new Map(selection.capture_ids.map((id, index) => [id, index]));

for (const captureId of selectedIds) required(captureIndex.has(captureId), `selected capture not found: ${captureId}`);

const selectedCaptures = selection.capture_ids.map(captureId => captureIndex.get(captureId));
const selectedClaims = claimRows
  .filter(row => selectedIds.has(row.capture_id))
  .sort((a, b) => order.get(a.capture_id) - order.get(b.capture_id) || a.claim_id.localeCompare(b.claim_id));
const selectedClaimIds = new Set(selectedClaims.map(row => row.claim_id));
const selectedCrossings = crossingRows
  .filter(row => selectedClaimIds.has(row.public_role?.claim_id) && selectedClaimIds.has(row.private_role?.claim_id))
  .sort((a, b) => a.candidate_id.localeCompare(b.candidate_id));

const capturesProjection = selectedCaptures.map(row => ({
  schema_version: 'linkedin-profile-capture-review-projection@1',
  capture_id: row.capture_id,
  series_id: row.series_id,
  observed_at: row.observed_at,
  observed_at_source: row.observed_at_source,
  subject: row.subject,
  source_receipt: {
    sha256: row.provenance.source_sha256,
    byte_length: row.provenance.byte_length,
    page_count: row.provenance.page_count,
    pdf_creation_date_raw: row.provenance.pdf_creation_date_raw,
  },
  source_availability: 'original_private_local_artifact_not_embedded',
  evidence_state: 'observed',
  verification_status: row.verification_status,
  publication_status: 'review_projection',
  graph_effect: 'none',
  scope: 'This row proves only that the identified private PDF artifact was indexed with this metadata. The PDF is not embedded in the projection.',
}));

const claimsProjection = selectedClaims.map(row => ({
  schema_version: 'linkedin-profile-role-claim-review-projection@1',
  claim_id: row.claim_id,
  capture_id: row.capture_id,
  series_id: row.series_id,
  observed_at: row.observed_at,
  subject: row.subject,
  predicate: row.predicate,
  object: row.object,
  role_title: row.role_title,
  stated_interval: row.stated_interval,
  evidence_state: row.evidence_state,
  verification_status: row.verification_status,
  source_receipt: {
    sha256: row.provenance.source_sha256,
    source_page: row.provenance.source_page,
  },
  receipt_eligibility: row.receipt_eligibility,
  publication_status: 'review_projection',
  graph_effect: 'none',
  scope: row.claim_scope,
}));

const claimById = new Map(claimsProjection.map(row => [row.claim_id, row]));
const crossingsProjection = selectedCrossings.map(row => ({
  ...row,
  schema_version: 'linkedin-role-crossing-review-projection@1',
  source_capture_ids: [
    claimById.get(row.public_role.claim_id).capture_id,
    claimById.get(row.private_role.claim_id).capture_id,
  ],
  publication_status: 'review_projection',
  graph_effect: 'none',
}));

const duplicateGroups = new Map();
for (const row of claimsProjection) {
  const key = JSON.stringify([
    row.capture_id,
    row.subject.profile_url,
    row.object.label,
    row.role_title,
    row.stated_interval.start_raw,
    row.stated_interval.end_raw,
  ]);
  if (!duplicateGroups.has(key)) duplicateGroups.set(key, []);
  duplicateGroups.get(key).push(row.claim_id);
}

const warnings = [];
for (const [key, claimIds] of duplicateGroups) {
  if (claimIds.length < 2) continue;
  const [captureId, profileUrl, organization, roleTitle, startRaw, endRaw] = JSON.parse(key);
  warnings.push({
    schema_version: 'linkedin-targeted-review-warning@1',
    warning_type: 'exact_machine_role_duplicate',
    capture_id: captureId,
    profile_url: profileUrl,
    organization,
    role_title: roleTitle,
    stated_interval: { start_raw: startRaw, end_raw: endRaw },
    claim_ids: claimIds,
    disposition: 'preserved_for_review_not_counted_as_independent_evidence',
    graph_effect: 'none',
  });
}

for (const row of claimsProjection) {
  if (/^(?:[A-Z][a-z]+\s+)?\d{4}\s*-\s*(?:[A-Z][a-z]+\s+)?\d{4}/.test(row.object.label)) {
    warnings.push({
      schema_version: 'linkedin-targeted-review-warning@1',
      warning_type: 'probable_layout_shift_into_organization',
      capture_id: row.capture_id,
      claim_id: row.claim_id,
      observed_organization_value: row.object.label,
      disposition: 'requires_source_or_independent_public_review',
      graph_effect: 'none',
    });
  }
}

const crossingProfiles = new Set(crossingsProjection.map(row => row.subject.profile_url));
for (const capture of capturesProjection) {
  if (crossingProfiles.has(capture.subject.profile_url)) continue;
  warnings.push({
    schema_version: 'linkedin-targeted-review-warning@1',
    warning_type: 'zero_machine_crossings_for_selected_profile',
    capture_id: capture.capture_id,
    profile_url: capture.subject.profile_url,
    disposition: 'zero_is_detector_output_not_a_finding_of_no_crossing',
    graph_effect: 'none',
  });
}

const visualNotes = selection.visual_review_notes.map((note, index) => ({
  schema_version: 'linkedin-targeted-visual-review-note@1',
  note_id: `livis_${String(index + 1).padStart(3, '0')}`,
  ...note,
  reviewer_type: 'model_visual_spot_check',
  evidence_state: 'observed',
  verification_status: 'single_review_pass',
  publication_status: 'review_projection',
  graph_effect: 'none',
  limitation: 'A visual spot check is not an independent verification of the underlying biographical claim.',
}));

const coverageGaps = selection.coverage_gaps.map((gap, index) => ({
  schema_version: 'linkedin-targeted-acquisition-gap@1',
  gap_id: `ligap_${String(index + 1).padStart(3, '0')}`,
  subject: {
    entity_type: 'person',
    label: gap.name,
    ...(gap.profile_url ? { profile_url: gap.profile_url } : {}),
  },
  ...(gap.search_hint ? { search_hint: gap.search_hint } : {}),
  acquisition_status: gap.acquisition_status,
  source_basis: 'researcher_reported_targeted_acquisition_outcome',
  verification_status: 'recorded_not_independently_verified',
  evidence_state: 'coverage_gap',
  publication_status: 'review_projection',
  graph_effect: 'none',
  interpretation: 'This records an acquisition gap, not evidence that no profile or relevant public record exists.',
}));

warnings.sort((a, b) => `${a.capture_id}:${a.warning_type}:${a.claim_id ?? ''}`.localeCompare(`${b.capture_id}:${b.warning_type}:${b.claim_id ?? ''}`));

const manifest = {
  schema_version: 'linkedin-targeted-review-projection@1',
  projection_id: selection.projection_id,
  projection_timestamp: selection.projection_timestamp,
  purpose: selection.purpose,
  counts: {
    captures: capturesProjection.length,
    displayed_subject_labels: new Set(capturesProjection.map(row => row.subject.label)).size,
    profile_urls: new Set(capturesProjection.map(row => row.subject.profile_url)).size,
    role_claims: claimsProjection.length,
    crossing_candidates: crossingsProjection.length,
    visual_review_notes: visualNotes.length,
    review_warnings: warnings.length,
    acquisition_coverage_gaps: coverageGaps.length,
  },
  source_snapshot_hashes: {
    private_capture_manifest_sha256: sha256(capturesFile),
    private_role_claims_sha256: sha256(claimsFile),
    private_crossing_candidates_sha256: sha256(crossingsFile),
  },
  files: {
    captures: 'captures.jsonl',
    role_claims: 'role-claims.jsonl',
    crossing_candidates: 'crossing-candidates.jsonl',
    visual_review_notes: 'visual-review-notes.jsonl',
    review_warnings: 'review-warnings.jsonl',
    acquisition_coverage_gaps: 'coverage-gaps.jsonl',
  },
  portability: {
    included: ['displayed name', 'public profile URL', 'capture timestamp', 'PDF SHA-256 and size', 'page count', 'page-addressed role tuples', 'machine crossing candidates', 'review warnings', 'bounded visual-review notes'],
    excluded: ['PDF bytes', 'full profile narrative', 'email addresses', 'phone numbers', 'street addresses', 'skills', 'private account activity'],
    independent_source_verification_without_pdf: false,
    map_and_extraction_review_without_pdf: true,
  },
  evidence_limit: 'The projection preserves timestamped self-claims and machine analysis. It does not independently establish identity, employment, ownership, influence, coordination, causation, or wrongdoing.',
  publication_status: 'review_projection',
  graph_effect: 'none',
};

fs.mkdirSync(outputDir, { recursive: true });
writeJson(path.join(outputDir, 'manifest.json'), manifest);
writeJsonl(path.join(outputDir, 'captures.jsonl'), capturesProjection);
writeJsonl(path.join(outputDir, 'role-claims.jsonl'), claimsProjection);
writeJsonl(path.join(outputDir, 'crossing-candidates.jsonl'), crossingsProjection);
writeJsonl(path.join(outputDir, 'visual-review-notes.jsonl'), visualNotes);
writeJsonl(path.join(outputDir, 'review-warnings.jsonl'), warnings);
writeJsonl(path.join(outputDir, 'coverage-gaps.jsonl'), coverageGaps);

console.log(`LinkedIn targeted review projection: ${capturesProjection.length} captures, ${claimsProjection.length} role claims, ${crossingsProjection.length} crossing candidates`);
console.log(`  ${visualNotes.length} visual notes; ${warnings.length} explicit review warnings; ${coverageGaps.length} acquisition gaps`);
console.log(`  output: ${outputDir}`);
