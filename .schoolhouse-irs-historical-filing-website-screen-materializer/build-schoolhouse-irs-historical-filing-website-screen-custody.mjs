import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const DATA_DIR = 'data/intake/schoolhouse-irs-historical-filing-website-screen-v1';
export const ARCHIVE_PATH = `${DATA_DIR}/sealed-acquisition-artifact.zip`;
export const CUSTODY_PATH = `${DATA_DIR}/source-custody.json`;
export const MANIFEST_PATH = `${DATA_DIR}/product-manifest.json`;
export const SUMS_PATH = `${DATA_DIR}/SHA256SUMS`;
export const DOC_PATH = 'docs/milestones/schoolhouse-irs-historical-filing-website-screen-v1.md';
export const BUILD_PATH = 'tools/build-schoolhouse-irs-historical-filing-website-screen-custody.mjs';
export const VALIDATE_PATH = 'tools/validate-schoolhouse-irs-historical-filing-website-screen-custody.mjs';
export const TEST_PATH = 'tools/test-schoolhouse-irs-historical-filing-website-screen-custody.mjs';

export const CANONICAL_PARENT = 'a464dbbd96c365a7c040e17847486c5b3ba05c27';
export const CANONICAL_PARENT_TREE = 'e4a8b0072fcdd8ca575f6c0d279f035277110163';
export const ACQUISITION_PR = 1318;
export const ACQUISITION_HEAD = '51bfc901846627c2ac8a31e401bd704f8958c3be';
export const ACQUISITION_WORKFLOW_RUN = 31137021052;
export const ACQUISITION_ARTIFACT_ID = 8978343039;
export const ACQUISITION_ARTIFACT_NAME = 'schoolhouse-irs-historical-filing-website-screen-v1';
export const ACQUISITION_ARTIFACT_ZIP_BYTES = 91926;
export const ACQUISITION_ARTIFACT_SHA256 = '3a9a39b3a7ee14a2c9ac58578c7e542338a02a5dcf415cc411c29d31f1dc6fd3';

export const PERMANENT_PATHS = Object.freeze([
  ARCHIVE_PATH,
  CUSTODY_PATH,
  MANIFEST_PATH,
  SUMS_PATH,
  DOC_PATH,
  BUILD_PATH,
  TEST_PATH,
  VALIDATE_PATH,
]);

export const INNER_FILES = Object.freeze([
  'RUNNER-OUTPUT.log',
  'RUNNER_EXIT_CODE',
  'SHA256SUMS',
  'adjudication.json',
  'artifact-manifest.json',
  'range-receipts.jsonl',
  'route-policy.json',
  'selection.jsonl',
  'source-receipt.json',
  'summary.json',
  'xml-results.jsonl',
]);

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function unzipArchive(repoRoot) {
  const archive = path.join(repoRoot, ARCHIVE_PATH);
  const bytes = await readFile(archive);
  assert.equal(bytes.length, ACQUISITION_ARTIFACT_ZIP_BYTES, 'sealed archive byte count');
  assert.equal(sha256(bytes), ACQUISITION_ARTIFACT_SHA256, 'sealed archive SHA-256');
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'schoolhouse-historical-website-'));
  const result = spawnSync('unzip', ['-q', archive, '-d', temporary], { encoding: 'utf8' });
  if (result.status !== 0) {
    await rm(temporary, { recursive: true, force: true });
    throw new Error(`unzip failed: ${result.stderr || result.stdout}`);
  }
  return temporary;
}

async function readJson(root, name) {
  return JSON.parse(await readFile(path.join(root, name), 'utf8'));
}

async function readJsonl(root, name) {
  const text = await readFile(path.join(root, name), 'utf8');
  return text.trimEnd().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

export async function readSealedArtifact(repoRoot = process.cwd()) {
  const extracted = await unzipArchive(repoRoot);
  try {
    const namesResult = spawnSync('find', [extracted, '-maxdepth', '1', '-type', 'f', '-printf', '%f\n'], { encoding: 'utf8' });
    assert.equal(namesResult.status, 0, 'find extracted members');
    const names = namesResult.stdout.trimEnd().split('\n').filter(Boolean).sort();
    assert.deepEqual(names, [...INNER_FILES].sort(), 'sealed archive member set');

    const exitCode = (await readFile(path.join(extracted, 'RUNNER_EXIT_CODE'), 'utf8')).trim();
    assert.equal(exitCode, '0', 'acquisition runner exit code');

    const sums = (await readFile(path.join(extracted, 'SHA256SUMS'), 'utf8')).trimEnd().split('\n').map((line) => {
      const match = line.match(/^([0-9a-f]{64})  ([^/]+)$/);
      assert(match, `malformed inner checksum row: ${line}`);
      return [match[2], match[1]];
    });
    assert.equal(sums.length, 8, 'inner checksum denominator');
    for (const [name, expected] of sums) {
      assert(INNER_FILES.includes(name), `unexpected inner checksum member ${name}`);
      const actual = sha256(await readFile(path.join(extracted, name)));
      assert.equal(actual, expected, `${name} inner checksum`);
    }

    const [summary, receipt, policy, adjudication, artifactManifest, selection, results, ranges] = await Promise.all([
      readJson(extracted, 'summary.json'),
      readJson(extracted, 'source-receipt.json'),
      readJson(extracted, 'route-policy.json'),
      readJson(extracted, 'adjudication.json'),
      readJson(extracted, 'artifact-manifest.json'),
      readJsonl(extracted, 'selection.jsonl'),
      readJsonl(extracted, 'xml-results.jsonl'),
      readJsonl(extracted, 'range-receipts.jsonl'),
    ]);
    return { extracted, sums, summary, receipt, policy, adjudication, artifactManifest, selection, results, ranges };
  } catch (error) {
    await rm(extracted, { recursive: true, force: true });
    throw error;
  }
}

export async function deriveProduct(repoRoot = process.cwd()) {
  const sealed = await readSealedArtifact(repoRoot);
  try {
    const { summary, receipt, selection, results, ranges } = sealed;
    const sourceCustody = {
      schema_version: 'schoolhouse-irs-historical-filing-website-custody@1',
      state: summary.state,
      canonical_parent_commit: CANONICAL_PARENT,
      canonical_parent_tree: CANONICAL_PARENT_TREE,
      acquisition_pr: ACQUISITION_PR,
      acquisition_head: ACQUISITION_HEAD,
      acquisition_workflow_run_id: ACQUISITION_WORKFLOW_RUN,
      acquisition_artifact_id: ACQUISITION_ARTIFACT_ID,
      acquisition_artifact_name: ACQUISITION_ARTIFACT_NAME,
      acquisition_artifact_zip_bytes: ACQUISITION_ARTIFACT_ZIP_BYTES,
      acquisition_artifact_digest: `sha256:${ACQUISITION_ARTIFACT_SHA256}`,
      acquisition_artifact_zip_sha256: ACQUISITION_ARTIFACT_SHA256,
      locator_workflow_run_id: receipt.locator_workflow_run_id,
      locator_artifact_id: receipt.locator_artifact_id,
      locator_artifact_digest: receipt.locator_artifact_digest,
      selection_rule: receipt.selection_derivation,
      exact_historical_locator_rows: summary.historical_exact_locator_rows,
      historical_unique_candidate_eins: summary.historical_unique_candidate_eins,
      historical_archive_count: summary.historical_archive_count,
      latest_exact_object_rows_excluded: summary.latest_exact_object_rows_excluded,
      screened_official_xml_rows: summary.screened_official_xml_rows,
      terminal_state_counts: summary.terminal_state_counts,
      range_request_attempts: summary.range_request_attempts,
      range_response_bytes: summary.range_response_bytes,
      xml_bytes_screened: summary.xml_bytes_screened,
      xml_elements_screened: summary.xml_elements_screened,
      xml_text_characters_screened: summary.xml_text_characters_screened,
      filer_ein_match_rows: summary.filer_ein_match_rows,
      candidate_legal_name_alignment_rows: summary.candidate_legal_name_alignment_rows,
      website_field_present_rows: summary.website_field_present_rows,
      website_field_nonempty_rows: summary.website_field_nonempty_rows,
      exact_school_house_website_host_rows: summary.school_house_exact_website_host_rows,
      identifier_grade_candidate_rows: summary.identifier_grade_candidate_rows,
      archive_member_count: INNER_FILES.length,
      acquisition_checksum_rows: sealed.sums.length,
      selection_row_count: selection.length,
      result_row_count: results.length,
      range_receipt_row_count: ranges.length,
      retention: {
        observed_organization_name_values_retained: summary.observed_organization_name_values_retained,
        observed_website_values_retained: summary.observed_website_values_retained,
        officer_or_person_name_values_retained: summary.officer_or_person_name_values_retained,
        street_address_rows_retained: summary.street_address_rows_retained,
        contact_detail_rows_retained: summary.contact_detail_rows_retained,
        preparer_rows_retained: summary.preparer_rows_retained,
        private_support_rows: summary.private_support_rows,
        raw_xml_retained: summary.raw_xml_retained,
        raw_archive_retained: summary.raw_archive_retained,
        raw_central_directory_retained: summary.raw_central_directory_retained,
        raw_term_text_retained: summary.raw_term_text_retained,
      },
      authority: {
        promotes_to: summary.promotes_to,
        identities_admitted: summary.identities_admitted,
        relationships_admitted: summary.relationships_admitted,
        negative_existence_claims_created: summary.negative_existence_claims_created,
        outside_human_dependency: summary.outside_human_dependency,
        publication_effect: summary.publication_effect,
        adoption_effect: summary.adoption_effect,
        graph_effect: summary.graph_effect,
        public_schoolhouse_legal_identity: 'unresolved',
      },
      interpretation: {
        zero_exact_host_rows_is_bounded_screen_result_not_global_absence: true,
        historical_screen_does_not_identify_public_schoolhouse_entity: true,
        website_field_presence_without_exact_host_is_not_identity: true,
        candidate_name_alignment_without_exact_host_is_not_identity: true,
        no_identifier_grade_candidate_requires_no_identity_adjudication: true,
        identical_source_retry_authorized: false,
      },
    };

    const productManifest = {
      schema_version: 'schoolhouse-irs-historical-filing-website-product-manifest@1',
      product_shape: 'sealed_artifact_plus_deterministic_custody',
      permanent_paths: [...PERMANENT_PATHS],
      permanent_path_count: PERMANENT_PATHS.length,
      sealed_archive: {
        path: ARCHIVE_PATH,
        bytes: ACQUISITION_ARTIFACT_ZIP_BYTES,
        sha256: ACQUISITION_ARTIFACT_SHA256,
        member_count: INNER_FILES.length,
        members: [...INNER_FILES],
      },
      source_result: {
        state: summary.state,
        historical_exact_locator_rows: summary.historical_exact_locator_rows,
        screened_official_xml_rows: summary.screened_official_xml_rows,
        website_field_present_rows: summary.website_field_present_rows,
        exact_school_house_website_host_rows: summary.school_house_exact_website_host_rows,
        identifier_grade_candidate_rows: summary.identifier_grade_candidate_rows,
      },
      authority: sourceCustody.authority,
    };

    const milestone = `# School.House historical Form 990 website-field screen\n\n` +
`## Terminal result\n\n` +
`The sealed historical Form 990 XML website-field screen reached terminal custody over every one of the **${summary.historical_exact_locator_rows}** exact historical member locators. It found **${summary.website_field_present_rows}** filings with an official website field and **${summary.identifier_grade_candidate_rows}** rows satisfying the required EIN + legal-name + exact \`school.house\` conjunction.\n\n` +
`\`\`\`text\n` +
`canonical parent:                    ${CANONICAL_PARENT}\n` +
`canonical parent tree:               ${CANONICAL_PARENT_TREE}\n` +
`acquisition PR / head:               #${ACQUISITION_PR} / ${ACQUISITION_HEAD}\n` +
`workflow run / artifact:             ${ACQUISITION_WORKFLOW_RUN} / ${ACQUISITION_ARTIFACT_ID}\n` +
`artifact SHA-256:                    ${ACQUISITION_ARTIFACT_SHA256}\n` +
`historical exact locator rows:       ${summary.historical_exact_locator_rows}\n` +
`unique candidate EINs:               ${summary.historical_unique_candidate_eins}\n` +
`historical archive routes:           ${summary.historical_archive_count}\n` +
`screened official XML rows:          ${summary.screened_official_xml_rows}\n` +
`website-field-present rows:          ${summary.website_field_present_rows}\n` +
`candidate legal-name alignments:     ${summary.candidate_legal_name_alignment_rows}\n` +
`exact school.house host rows:         ${summary.school_house_exact_website_host_rows}\n` +
`identifier-grade candidate rows:      ${summary.identifier_grade_candidate_rows}\n` +
`range requests / response bytes:     ${summary.range_request_attempts} / ${summary.range_response_bytes.toLocaleString('en-US')}\n` +
`\`\`\`\n\n` +
`## Identifier rule\n\n` +
`A filing could become only an identifier-grade **candidate** when its filer EIN matched the candidate EIN, its filing-header legal name aligned with the sealed filing-index name, and an official website field normalized exactly to \`school.house\` (with \`www.school.house\` canonicalized to the same host). Near matches, subdomains, suffix domains, generic text, email addresses, credentials, non-HTTP schemes, path text, schedule presence, and person-name overlap were refused.\n\n` +
`## Privacy boundary\n\n` +
`No observed organization-name value, observed website value, officer or person name, street address, contact detail, preparer value, private support, raw XML, archive, central directory, or matched free text is retained. Only sealed identifiers, request and integrity custody, website-field schema element names, and boolean conjunction results survive.\n\n` +
`## Authority boundary\n\n` +
`\`\`\`text\n` +
`identities admitted:                  ${summary.identities_admitted}\n` +
`relationships admitted:               ${summary.relationships_admitted}\n` +
`negative-existence claims:             ${summary.negative_existence_claims_created}\n` +
`outside-human dependency:              ${summary.outside_human_dependency}\n` +
`publication / adoption / graph:        ${summary.publication_effect} / ${summary.adoption_effect} / ${summary.graph_effect}\n` +
`public School.House legal identity:    unresolved\n` +
`\`\`\`\n\n` +
`Zero exact-host conjunctions is a bounded result for this fixed 180-object historical corpus. It is not evidence that the public School.House lacks a legal entity, fiscal sponsor, differently named organization, unlocated filing, or other public identifier. The issue's stopping rule is satisfied, and no identical source retry is authorized absent a material provider or denominator change.\n`;

    return { sourceCustody, productManifest, milestone, sealed };
  } catch (error) {
    await rm(sealed.extracted, { recursive: true, force: true });
    throw error;
  }
}

async function expectedSums(repoRoot, generated) {
  const entries = [
    [ARCHIVE_PATH, await readFile(path.join(repoRoot, ARCHIVE_PATH))],
    [CUSTODY_PATH, Buffer.from(jsonText(generated.sourceCustody))],
    [MANIFEST_PATH, Buffer.from(jsonText(generated.productManifest))],
    [DOC_PATH, Buffer.from(generated.milestone)],
    [BUILD_PATH, await readFile(path.join(repoRoot, BUILD_PATH))],
    [TEST_PATH, await readFile(path.join(repoRoot, TEST_PATH))],
    [VALIDATE_PATH, await readFile(path.join(repoRoot, VALIDATE_PATH))],
  ];
  return `${entries.map(([rel, bytes]) => `${sha256(bytes)}  ${rel}`).join('\n')}\n`;
}

export async function applyProduct({ repoRoot = process.cwd(), write = false } = {}) {
  const generated = await deriveProduct(repoRoot);
  try {
    const outputs = [
      [CUSTODY_PATH, jsonText(generated.sourceCustody)],
      [MANIFEST_PATH, jsonText(generated.productManifest)],
      [DOC_PATH, generated.milestone],
    ];
    for (const [rel, expected] of outputs) {
      const target = path.join(repoRoot, rel);
      if (write) await writeFile(target, expected, 'utf8');
      else assert.equal(await readFile(target, 'utf8'), expected, `${rel} deterministic drift`);
    }
    const sums = await expectedSums(repoRoot, generated);
    if (write) await writeFile(path.join(repoRoot, SUMS_PATH), sums, 'utf8');
    else assert.equal(await readFile(path.join(repoRoot, SUMS_PATH), 'utf8'), sums, `${SUMS_PATH} deterministic drift`);
    return generated;
  } finally {
    await rm(generated.sealed.extracted, { recursive: true, force: true });
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  assert(!(args.has('--write') && args.has('--check')), 'choose --write or --check');
  const write = args.has('--write');
  await applyProduct({ write });
  console.log(`historical_website_custody_builder=${write ? 'wrote' : 'clean'}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
