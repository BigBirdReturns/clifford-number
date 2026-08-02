#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(process.env.RD04_REPOSITORY_ROOT || process.cwd());
export const AUTHORITY_ARTIFACT = path.resolve(
  process.env.RD04_AUTHORITY_UNIT_ARTIFACT || '/tmp/rd04-authority-units'
);
export const OUTPUT = path.resolve(
  process.env.RD04_SOURCE_PLAN_OUTPUT || '/tmp/rd04-source-plan'
);
export const AUTHORITY_RECEIPT_PATH = path.join(
  ROOT,
  'data/intake/status-sovereignty-rd-wave02-rd04-version-history/authority-unit-receipt.json'
);
export const SEED_RECEIPT_PATH = path.join(
  ROOT,
  'data/intake/status-sovereignty-rd-wave02-rd04-version-history/seed-capture-receipt.json'
);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const writeJson = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
const ok = (condition, message) => { if (!condition) throw new Error(message); };

const CDSS = 'https://www.cdss.ca.gov';
const LEGINFO = 'https://leginfo.legislature.ca.gov';
const FNS = 'https://www.fns.usda.gov';
const GOVINFO = 'https://www.govinfo.gov';
const ECFR = 'https://www.ecfr.gov';
const USCODE = 'https://uscode.house.gov';

const MANUAL_LOCATORS = Object.freeze({
  'AUTH-CA-MPP-21-115': [
    `${CDSS}/Portals/9/Regs/Man/CFC/3CFCMAN.docx`
  ],
  'AUTH-CA-MPP-21-115.2': [
    `${CDSS}/Portals/9/Regs/Man/CFC/3CFCMAN.docx`
  ],
  'AUTH-CA-MPP-42-701.2': [
    `${CDSS}/Portals/9/Regs/Man/EAS/6EAS.docx`,
    `${CDSS}/Portals/9/Regs/Man/EAS/7EAS.docx`
  ],
  'AUTH-CA-MPP-63-407': [
    `${CDSS}/Portals/9/Regs/Man/Fsman/fsman04b.docx`
  ],
  'AUTH-CA-MPP-63-407.1': [
    `${CDSS}/Portals/9/Regs/Man/Fsman/fsman04b.docx`
  ],
  'AUTH-CA-MPP-63-407.21': [
    `${CDSS}/Portals/9/Regs/Man/Fsman/fsman04b.docx`
  ],
  'AUTH-CA-MPP-63-407.4': [
    `${CDSS}/Portals/9/Regs/Man/Fsman/fsman04b.docx`
  ],
  'AUTH-CA-MPP-63-407.5': [
    `${CDSS}/Portals/9/Regs/Man/Fsman/fsman04b.docx`
  ],
  'AUTH-CA-MPP-63-407.51': [
    `${CDSS}/Portals/9/Regs/Man/Fsman/fsman04b.docx`
  ],
  'AUTH-CA-MPP-63-408': [
    `${CDSS}/Portals/9/Regs/Man/Fsman/fsman04b.docx`
  ],
  'AUTH-CA-MPP-63-410': [
    `${CDSS}/Portals/9/Regs/Man/Fsman/fsman04b.docx`
  ],
  'AUTH-CA-MPP-63-410.22': [
    `${CDSS}/Portals/9/Regs/Man/Fsman/fsman04b.docx`
  ],
  'AUTH-CA-MPP-63-410.31': [
    `${CDSS}/Portals/9/Regs/Man/Fsman/fsman04b.docx`
  ],
  'AUTH-CA-MPP-63-410.32': [
    `${CDSS}/Portals/9/Regs/Man/Fsman/fsman04b.docx`
  ],
  'AUTH-CA-MPP-63-411.2': [
    `${CDSS}/Portals/9/Regs/Man/Fsman/fsman04b.docx`
  ],
  'AUTH-CA-MPP-63-503.442': [
    `${CDSS}/Portals/9/Regs/Man/Fsman/fsman06.docx`
  ]
});

const FEDERAL_GUIDANCE_LOCATORS = Object.freeze({
  'AUTH-USDA-FNS-HANDBOOK-310': `${FNS}/snap/qc/handbook310`,
  'AUTH-USDA-FNS-MEMO-OTHER-PUBLIC-ASSISTANCE-INFO':
    `${FNS}/snap/use-information-received-other-public`,
  'AUTH-USDA-FNS-MEMO-SECRETARY-ABAWD-WAIVERS':
    `${FNS}/snap/work-requirements/policies/secretary-authority`
});

const FEDERAL_STATUTE_LOCATORS = Object.freeze({
  'AUTH-25-USC-1603':
    `${USCODE}/view.xhtml?req=granuleid:USC-prelim-title25-section1603&num=0&edition=prelim`,
  'AUTH-25-USC-1679':
    `${USCODE}/view.xhtml?req=granuleid:USC-prelim-title25-section1679&num=0&edition=prelim`,
  'AUTH-7-USC-2015':
    `${USCODE}/view.xhtml?req=granuleid:USC-prelim-title7-section2015&num=0&edition=prelim`,
  'AUTH-US-FNA-2008':
    `${GOVINFO}/content/pkg/COMPS-10331/pdf/COMPS-10331.pdf`,
  'AUTH-US-FRA-2023':
    `${GOVINFO}/content/pkg/PLAW-118publ5/pdf/PLAW-118publ5.pdf`,
  'AUTH-US-IHCIA':
    `${GOVINFO}/content/pkg/COMPS-1406/pdf/COMPS-1406.pdf`,
  'AUTH-US-PRWORA-1996':
    `${GOVINFO}/content/pkg/COMPS-1793/pdf/COMPS-1793.pdf`,
  'AUTH-US-TRADE-ACT-1974':
    `${GOVINFO}/content/pkg/COMPS-10384/pdf/COMPS-10384.pdf`
});

const BILL_LOCATORS = Object.freeze({
  'AUTH-CA-AB-12':
    `${LEGINFO}/faces/billNavClient.xhtml?bill_id=200920100AB12`,
  'AUTH-CA-SB-1050':
    `${LEGINFO}/faces/billNavClient.xhtml?bill_id=201720180SB1050`
});

function expectedContent(url) {
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith('.pdf')) return 'pdf';
  if (pathname.endsWith('.docx')) return 'docx';
  return 'html';
}

function officialHost(url) {
  const host = new URL(url).hostname.toLowerCase();
  ok([
    'www.cdss.ca.gov',
    'leginfo.legislature.ca.gov',
    'www.fns.usda.gov',
    'www.govinfo.gov',
    'www.ecfr.gov',
    'uscode.house.gov'
  ].includes(host), `unapproved official host ${host}`);
  return host;
}

function locator(url, identityBasis, priority = 1) {
  return {
    priority,
    url,
    official_host: officialHost(url),
    expected_content_class: expectedContent(url),
    identity_basis: identityBasis,
    exact_url_frozen_before_fetch: true,
    outcome_selected: false
  };
}

function californiaLetterLocator(unit) {
  const reference = unit.reference_ids[0];
  const token = reference.replace('CA-ACL-', '');
  const year = 2000 + Number(token.slice(0, 2));
  return [locator(
    `${CDSS}/Portals/9/Additional-Resources/Letters-and-Notices/ACLs/${year}/${token}.pdf`,
    'exact_cdss_acl_identifier_and_year_path'
  )];
}

function californiaAcinLocator(unit) {
  const reference = unit.reference_ids[0];
  const token = reference.replace('CA-ACIN-', '');
  const yearToken = token.split('-').at(-1).slice(0, 2);
  const year = 2000 + Number(yearToken);
  const filename = token.replace(new RegExp(`-${yearToken}$`), `_${yearToken}`);
  return [locator(
    `${CDSS}/Portals/9/Additional-Resources/Letters-and-Notices/ACINs/${year}/${filename}.pdf`,
    'exact_cdss_acin_identifier_and_year_path'
  )];
}

function californiaStatuteLocator(unit) {
  const match = unit.authority_unit_id.match(/^AUTH-CA-(WIC|HSC)-(.+)$/);
  ok(match, `${unit.authority_unit_id}: malformed California statute unit`);
  const [, code, section] = match;
  return [locator(
    `${LEGINFO}/faces/codes_displaySection.xhtml?lawCode=${code}&sectionNum=${section}.`,
    'exact_california_code_and_root_section'
  )];
}

function federalRegulationLocator(unit) {
  if (unit.authority_unit_id === 'AUTH-45-CFR-164.502') {
    return [locator(
      `${ECFR}/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.502`,
      'exact_ecfr_title_part_subpart_and_section'
    )];
  }
  const match = unit.authority_unit_id.match(/^AUTH-7-CFR-(\d+(?:\.\d+)?)$/);
  ok(match, `${unit.authority_unit_id}: malformed Title 7 CFR unit`);
  const section = match[1];
  const part = section.split('.')[0];
  return [locator(
    `${ECFR}/current/title-7/subtitle-B/chapter-II/subchapter-C/part-${part}/section-${section}`,
    'exact_ecfr_title_part_and_section'
  )];
}

export function locatorsForUnit(unit) {
  switch (unit.authority_class) {
    case 'california_all_county_letter':
      return californiaLetterLocator(unit);
    case 'california_all_county_information_notice':
      return californiaAcinLocator(unit);
    case 'california_bill':
      ok(BILL_LOCATORS[unit.authority_unit_id], `${unit.authority_unit_id}: bill session unresolved`);
      return [locator(BILL_LOCATORS[unit.authority_unit_id], 'exact_bill_number_session_and_chapter_context')];
    case 'california_handbook':
      return [locator(
        `${CDSS}/Portals/9/Additional-Resources/Letters-and-Notices/ACLs/2019/19-93.pdf`,
        'handbook_version_2_0_is_attachment_to_exact_acl_19_93_identity'
      )];
    case 'california_manual_section':
      ok(MANUAL_LOCATORS[unit.authority_unit_id], `${unit.authority_unit_id}: manual volume unresolved`);
      return MANUAL_LOCATORS[unit.authority_unit_id].map((url, index) => locator(
        url,
        index === 0 ? 'exact_cdss_manual_volume_for_numbered_section' : 'predeclared_adjacent_manual_volume_fallback',
        index + 1
      ));
    case 'california_statute_section':
      return californiaStatuteLocator(unit);
    case 'federal_guidance_document':
      ok(FEDERAL_GUIDANCE_LOCATORS[unit.authority_unit_id], `${unit.authority_unit_id}: guidance route unresolved`);
      return [locator(
        FEDERAL_GUIDANCE_LOCATORS[unit.authority_unit_id],
        'exact_official_fns_title_route'
      )];
    case 'federal_regulation_section':
      return federalRegulationLocator(unit);
    case 'federal_statute':
      ok(FEDERAL_STATUTE_LOCATORS[unit.authority_unit_id], `${unit.authority_unit_id}: statute route unresolved`);
      return [locator(
        FEDERAL_STATUTE_LOCATORS[unit.authority_unit_id],
        unit.authority_unit_id.includes('-USC-')
          ? 'exact_official_us_code_title_and_section'
          : 'exact_govinfo_public_law_or_statute_compilation_identity'
      )];
    default:
      throw new Error(`${unit.authority_unit_id}: unsupported authority class ${unit.authority_class}`);
  }
}

function verifyInputs() {
  const authorityReceipt = readJson(AUTHORITY_RECEIPT_PATH);
  const seedReceipt = readJson(SEED_RECEIPT_PATH);
  const productPath = path.join(AUTHORITY_ARTIFACT, 'authority-units.json');
  const artifactReceiptPath = path.join(AUTHORITY_ARTIFACT, 'receipt.json');
  ok(fs.existsSync(productPath) && fs.existsSync(artifactReceiptPath), 'authority-unit artifact incomplete');
  const productBytes = fs.readFileSync(productPath);
  ok(productBytes.length === authorityReceipt.execution.product_bytes, 'authority product byte count changed');
  ok(sha256(productBytes) === authorityReceipt.execution.product_sha256, 'authority product digest changed');
  const product = JSON.parse(productBytes.toString('utf8'));
  ok(product.authority_units.length === 79, 'authority-unit denominator changed');
  ok(product.counts.candidate_reference_ids_mapped === 140, 'mapped reference denominator changed');
  ok(seedReceipt.source_terminal_ledger.length === 14, 'seed terminal ledger changed');
  ok(seedReceipt.counts.resolved_sources === 13 && seedReceipt.counts.unresolved_sources === 1, 'seed source state changed');
  return { authorityReceipt, seedReceipt, product };
}

function buildRoutes(targetUnits) {
  const byUrl = new Map();
  for (const target of targetUnits) {
    for (const candidate of target.locator_candidates) {
      const existing = byUrl.get(candidate.url) || {
        url: candidate.url,
        official_host: candidate.official_host,
        expected_content_class: candidate.expected_content_class,
        target_unit_ids: new Set(),
        priorities: new Set(),
        identity_bases: new Set()
      };
      ok(existing.official_host === candidate.official_host, `${candidate.url}: host conflict`);
      ok(existing.expected_content_class === candidate.expected_content_class, `${candidate.url}: content class conflict`);
      existing.target_unit_ids.add(target.execution_unit_id);
      existing.priorities.add(candidate.priority);
      existing.identity_bases.add(candidate.identity_basis);
      byUrl.set(candidate.url, existing);
    }
  }
  return [...byUrl.values()]
    .sort((a, b) => a.url.localeCompare(b.url))
    .map((route, index) => ({
      route_id: `RD04-ROUTE-${String(index + 1).padStart(3, '0')}`,
      url: route.url,
      official_host: route.official_host,
      expected_content_class: route.expected_content_class,
      target_unit_ids: [...route.target_unit_ids].sort(),
      priorities: [...route.priorities].sort((a, b) => a - b),
      identity_bases: [...route.identity_bases].sort()
    }));
}

export function buildPlan(authorityProduct, seedReceipt) {
  const candidateTargets = authorityProduct.authority_units.map((unit) => ({
    execution_unit_id: unit.authority_unit_id,
    unit_origin: 'cross_reference_candidate_authority_unit',
    authority_class: unit.authority_class,
    reference_ids: unit.reference_ids,
    locator_candidates: locatorsForUnit(unit),
    terminal_source_state: 'fixed_protocol_not_yet_executed',
    source_identity_adjudicated: false,
    version_edges_adjudicated: 0,
    class_effect: 'none'
  }));

  const seedRecoveryTarget = {
    execution_unit_id: 'SEED-FED-PL119-21',
    unit_origin: 'unresolved_seed_source_recovery',
    authority_class: 'federal_statute',
    reference_ids: ['US-PL-119-21', 'US-HR-1-119', 'US-OBBBA-2025'],
    locator_candidates: [locator(
      `${GOVINFO}/content/pkg/PLAW-119publ21/pdf/PLAW-119publ21.pdf`,
      'exact_public_law_number_identity_on_official_govinfo_pdf'
    )],
    terminal_source_state: 'fixed_protocol_not_yet_executed',
    source_identity_adjudicated: false,
    version_edges_adjudicated: 0,
    class_effect: 'none'
  };

  const targetUnits = [...candidateTargets, seedRecoveryTarget];
  const reusedSeedUnits = seedReceipt.source_terminal_ledger
    .filter((row) => row.terminal_state === 'http_success')
    .map((row) => ({
      execution_unit_id: `SEED-${row.source_id}`,
      unit_origin: 'reused_terminal_seed_source_receipt',
      source_id: row.source_id,
      source_workflow_run: seedReceipt.execution.workflow_run,
      source_artifact_id: seedReceipt.execution.artifact_id,
      terminal_state: row.terminal_state,
      attempts: row.attempts,
      http_status: row.http_status,
      body_bytes: row.body_bytes,
      body_sha256: row.body_sha256,
      source_identity_adjudicated: false,
      version_edges_adjudicated: 0,
      class_effect: 'none'
    }));

  const routes = buildRoutes(targetUnits);
  const locatorCount = targetUnits.reduce((sum, unit) => sum + unit.locator_candidates.length, 0);
  return {
    schema_version: 'ssc-rd-wave02-rd04-fixed-source-plan@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-04',
    class_id: 'RD-04-C01',
    issue: 789,
    as_of: '2026-08-02',
    authority_unit_parent: {
      workflow_run: 30768012480,
      artifact_id: 8839583867,
      product_sha256: 'dc513bb82a8a7faab70ce82fb13cea68fe8107b8aa679220a7ff994b95fe6fe4',
      candidate_authority_units: 79
    },
    protocol: {
      maximum_attempts_per_route: 2,
      maximum_locator_candidates_per_unit: 2,
      connect_timeout_seconds: 15,
      total_timeout_seconds: 60,
      follow_redirects: true,
      concurrent_routes: 8,
      fixed_before_fetch: true,
      retry_only_on_transport_non_200_or_empty_body: true,
      outcome_selected_retry: false,
      successful_fetch_is_source_identity_adjudication: false,
      source_failure_is_record_absence: false,
      source_failure_is_noncompliance: false
    },
    reused_seed_units: reusedSeedUnits,
    target_units: targetUnits,
    routes,
    counts: {
      execution_units: reusedSeedUnits.length + targetUnits.length,
      reused_seed_units: reusedSeedUnits.length,
      acquisition_target_units: targetUnits.length,
      candidate_authority_target_units: candidateTargets.length,
      unresolved_seed_recovery_target_units: 1,
      locator_candidates: locatorCount,
      unique_routes: routes.length,
      official_hosts: new Set(routes.map((route) => route.official_host)).size,
      target_units_with_two_locators: targetUnits.filter((unit) => unit.locator_candidates.length === 2).length,
      source_requests_executed: 0,
      source_requests_terminal: 0,
      source_identity_adjudications: 0,
      version_edges_adjudicated: 0,
      class_closed: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0,
      publication_effects: 0
    },
    current_result: {
      terminal_state: 'fixed_source_plan_frozen_execution_pending',
      plan_frozen_before_fetch: true,
      all_execution_units_represented: true,
      all_target_units_have_official_locator: true,
      source_capture_complete: false,
      source_identity_adjudication_complete: false,
      version_edge_adjudication_complete: false,
      class_closed: false,
      outside_human_dependency: false,
      project_blocking: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    boundaries: {
      locator_is_source_custody: false,
      successful_route_is_source_identity: false,
      shared_route_merges_authority_units: false,
      exact_url_is_controlling_authority: false,
      failed_route_is_record_absence: false,
      failed_route_is_noncompliance: false,
      current_page_is_historical_version: false,
      source_plan_changes_reviewed_disposition: false,
      graph_effect: 'none'
    }
  };
}

export function main() {
  const { product, seedReceipt } = verifyInputs();
  const plan = buildPlan(product, seedReceipt);
  ok(plan.counts.execution_units === 93, `execution units ${plan.counts.execution_units}`);
  ok(plan.counts.reused_seed_units === 13, `reused seed units ${plan.counts.reused_seed_units}`);
  ok(plan.counts.acquisition_target_units === 80, `target units ${plan.counts.acquisition_target_units}`);
  ok(plan.counts.candidate_authority_target_units === 79, 'candidate target denominator changed');
  ok(plan.counts.locator_candidates === 81, `locator candidates ${plan.counts.locator_candidates}`);
  ok(plan.counts.unique_routes === 68, `unique routes ${plan.counts.unique_routes}`);
  ok(plan.counts.official_hosts === 6, `official hosts ${plan.counts.official_hosts}`);
  ok(plan.counts.target_units_with_two_locators === 1, 'two-locator unit denominator changed');
  ok(new Set(plan.target_units.map((unit) => unit.execution_unit_id)).size === 80, 'duplicate target unit');
  ok(new Set(plan.routes.map((route) => route.route_id)).size === 68, 'duplicate route ID');
  for (const unit of plan.target_units) {
    ok(unit.locator_candidates.length >= 1 && unit.locator_candidates.length <= 2, `${unit.execution_unit_id}: locator count`);
    ok(unit.locator_candidates.every((candidate, index) => candidate.priority === index + 1), `${unit.execution_unit_id}: locator priorities`);
  }

  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  writeJson(path.join(OUTPUT, 'source-plan.json'), plan);
  const bytes = fs.readFileSync(path.join(OUTPUT, 'source-plan.json'));
  writeJson(path.join(OUTPUT, 'receipt.json'), {
    schema_version: 'ssc-rd-wave02-rd04-fixed-source-plan-receipt@1',
    product_path: 'source-plan.json',
    product_bytes: bytes.length,
    product_sha256: sha256(bytes),
    counts: plan.counts,
    terminal_state: plan.current_result.terminal_state,
    plan_frozen_before_fetch: true,
    class_closed: false,
    outside_human_dependency: false
  });

  console.log(
    `build-source-plan: ${plan.counts.execution_units} execution units, ` +
      `${plan.counts.acquisition_target_units} targets, ${plan.counts.locator_candidates} locators, ` +
      `${plan.counts.unique_routes} unique routes`
  );
  return plan;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    main();
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
