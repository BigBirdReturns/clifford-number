#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(__filename), '..');

export const countyRootPaths = Object.freeze({
  frozenSourceLedger: 'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/source-custody/source-ledger.json',
  acquisitionLedger: 'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/source-custody/a07-official-source-acquisition/source-acquisition-ledger.json',
  acquisitionRoot: 'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/source-custody/a07-official-source-acquisition',
  output: 'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/county-agency-roots.json',
  schema: 'schemas/status-sovereignty-rd04-calfresh-county-agency-roots-a07.schema.json'
});

const OUTPUT_SCHEMA = 'ssc-rd04-a07-county-agency-roots@1';
const SOURCE_ID = 'CDSS-COUNTY-OFFICES';
const SOURCE_PAGE_URL = 'https://www.cdss.ca.gov/Benefits-Services/Cash-Assistance/CalWORKS/County-Offices';
const EXACT_ROOT_STATE = 'exact_public_agency_root';
const AMBIGUOUS_ROOT_STATE = 'multiple_public_root_candidates';
const ABSENT_ROOT_STATE = 'public_section_without_agency_root';
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const toPosix = (value) => value.split(path.sep).join('/');

function decodeEntities(value) {
  return String(value)
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, digits) => String.fromCodePoint(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_, digits) => String.fromCodePoint(Number.parseInt(digits, 16)));
}

function textContent(html) {
  return decodeEntities(String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

function attributeValue(attributes, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const quoted = attributes.match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'));
  if (quoted) return decodeEntities(quoted[2]);
  const unquoted = attributes.match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*([^\\s>]+)`, 'i'));
  return unquoted ? decodeEntities(unquoted[1]) : null;
}

function normalizeWhitespace(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countyHeadingMatch(headingText, counties) {
  const normalized = normalizeWhitespace(headingText);
  const matches = counties.filter((county) => {
    const name = escapeRegex(county);
    return new RegExp(`(?:^|\\b)${name}\\s+County(?:\\b|$)`, 'i').test(normalized)
      || new RegExp(`(?:^|\\b)County\\s+of\\s+${name}(?:\\b|$)`, 'i').test(normalized);
  });
  return matches.length === 1 ? matches[0] : null;
}

function byteOffset(text, characterOffset) {
  return Buffer.byteLength(text.slice(0, characterOffset), 'utf8');
}

function normalizeUrl(rawHref, baseUrl) {
  try {
    const url = new URL(rawHref, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

function scoreCandidate({ county, anchorText, title, resolvedUrl, sourceHost }) {
  const label = normalizeWhitespace(`${anchorText} ${title ?? ''}`).toLowerCase();
  const countyLabel = county.toLowerCase();
  const host = new URL(resolvedUrl).hostname.toLowerCase();
  let score = 0;
  if (label.includes(`${countyLabel} county website`)) score += 8;
  if (label.includes('county website')) score += 6;
  if (label.includes('official website')) score += 5;
  if (label.includes('website')) score += 4;
  if (host !== sourceHost) score += 2;
  const compactCounty = countyLabel.replace(/[^a-z0-9]/g, '');
  const compactHost = host.replace(/[^a-z0-9]/g, '');
  if (compactCounty.length >= 4 && compactHost.includes(compactCounty)) score += 2;
  if (/facebook|instagram|twitter|x\.com|youtube|linkedin/.test(host)) score -= 8;
  if (/google\.|bing\.|maps\./.test(host)) score -= 6;
  return score;
}

function extractAnchors(sectionHtml, sectionCharacterStart, wholeHtml, county, baseUrl) {
  const sourceHost = new URL(baseUrl).hostname.toLowerCase();
  const anchors = [];
  const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of sectionHtml.matchAll(pattern)) {
    const attributes = match[1] ?? '';
    const hrefRaw = attributeValue(attributes, 'href');
    if (!hrefRaw || hrefRaw.startsWith('#') || /^(?:mailto|tel|javascript):/i.test(hrefRaw)) continue;
    const resolvedUrl = normalizeUrl(hrefRaw, baseUrl);
    if (!resolvedUrl) continue;
    const anchorText = normalizeWhitespace(textContent(match[2] ?? ''));
    const title = attributeValue(attributes, 'title');
    const score = scoreCandidate({
      county,
      anchorText,
      title,
      resolvedUrl,
      sourceHost
    });
    const characterStart = sectionCharacterStart + match.index;
    const characterEnd = characterStart + match[0].length;
    anchors.push({
      href_raw: hrefRaw,
      resolved_url: resolvedUrl,
      host: new URL(resolvedUrl).hostname.toLowerCase(),
      anchor_text: anchorText,
      title,
      score,
      source_start_byte: byteOffset(wholeHtml, characterStart),
      source_end_byte: byteOffset(wholeHtml, characterEnd),
      anchor_html_sha256: sha256(Buffer.from(match[0], 'utf8'))
    });
  }
  return anchors;
}

function selectAgencyRoot(county, candidates, baseUrl) {
  const sourceHost = new URL(baseUrl).hostname.toLowerCase();
  const external = candidates.filter((candidate) => candidate.host !== sourceHost && candidate.score >= 2);
  const pool = external.length ? external : candidates.filter((candidate) => candidate.score >= 4);
  if (!pool.length) {
    return {
      state: ABSENT_ROOT_STATE,
      selected: null,
      competing: []
    };
  }
  const maxScore = Math.max(...pool.map((candidate) => candidate.score));
  const leaders = pool.filter((candidate) => candidate.score === maxScore);
  const uniqueUrls = [...new Set(leaders.map((candidate) => candidate.resolved_url))];
  if (uniqueUrls.length === 1) {
    return {
      state: EXACT_ROOT_STATE,
      selected: leaders.find((candidate) => candidate.resolved_url === uniqueUrls[0]),
      competing: leaders
    };
  }
  return {
    state: AMBIGUOUS_ROOT_STATE,
    selected: null,
    competing: leaders
  };
}

export function parseCountyAgencyRoots({ htmlBytes, counties, sourceReceipt, sourceBodyPath }) {
  if (!Buffer.isBuffer(htmlBytes)) throw new Error('htmlBytes must be a Buffer');
  if (!Array.isArray(counties) || counties.length !== 58 || new Set(counties).size !== 58) {
    throw new Error(`expected 58 unique frozen counties, observed ${counties?.length ?? 0}`);
  }
  const html = htmlBytes.toString('utf8');
  const headings = [];
  const headingPattern = /<h2\b[^>]*>[\s\S]*?<\/h2>/gi;
  for (const match of html.matchAll(headingPattern)) {
    const headingText = normalizeWhitespace(textContent(match[0]));
    const county = countyHeadingMatch(headingText, counties);
    if (!county) continue;
    headings.push({
      county,
      headingText,
      headingHtml: match[0],
      characterStart: match.index,
      characterEnd: match.index + match[0].length
    });
  }
  if (headings.length !== 58) {
    throw new Error(`expected 58 county headings, observed ${headings.length}: ${headings.map((row) => row.county).join(', ')}`);
  }
  const observedCounties = headings.map((row) => row.county);
  if (new Set(observedCounties).size !== 58) throw new Error('duplicate county heading detected');
  if (JSON.stringify(observedCounties) !== JSON.stringify(counties)) {
    throw new Error(`county heading order differs from frozen denominator: ${JSON.stringify(observedCounties)}`);
  }

  const rows = [];
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const sectionCharacterStart = heading.characterStart;
    const sectionCharacterEnd = headings[index + 1]?.characterStart ?? html.length;
    const sectionHtml = html.slice(sectionCharacterStart, sectionCharacterEnd);
    const candidates = extractAnchors(
      sectionHtml,
      sectionCharacterStart,
      html,
      heading.county,
      sourceReceipt.final_url ?? SOURCE_PAGE_URL
    );
    const selection = selectAgencyRoot(
      heading.county,
      candidates,
      sourceReceipt.final_url ?? SOURCE_PAGE_URL
    );
    const sectionStartByte = byteOffset(html, sectionCharacterStart);
    const sectionEndByte = byteOffset(html, sectionCharacterEnd);
    const sectionBytes = htmlBytes.subarray(sectionStartByte, sectionEndByte);
    rows.push({
      ordinal: index + 1,
      county: heading.county,
      agency_heading: heading.headingText,
      heading_html_sha256: sha256(Buffer.from(heading.headingHtml, 'utf8')),
      section_start_byte: sectionStartByte,
      section_end_byte: sectionEndByte,
      section_bytes: sectionBytes.length,
      section_sha256: sha256(sectionBytes),
      link_candidates: candidates,
      selection_state: selection.state,
      selected_agency_root_url: selection.selected?.resolved_url ?? null,
      selected_candidate_score: selection.selected?.score ?? null,
      competing_top_urls: [...new Set(selection.competing.map((candidate) => candidate.resolved_url))],
      county_follow_up_authorized: false,
      county_census_complete: false,
      case_level_receipt_observed: false,
      implementation_observed: false,
      source_unavailable_proves_noncompliance: false
    });
  }

  const stateCounts = {};
  for (const row of rows) stateCounts[row.selection_state] = (stateCounts[row.selection_state] ?? 0) + 1;
  const candidateLinks = rows.reduce((sum, row) => sum + row.link_candidates.length, 0);
  return {
    schema_version: OUTPUT_SCHEMA,
    execution_id: 'SSC-RD04-SNAP-A07',
    issue: 741,
    as_of: '2026-08-02',
    title: 'California county official agency-root denominator from exact CDSS custody',
    source: {
      source_id: SOURCE_ID,
      acquisition_ledger_path: countyRootPaths.acquisitionLedger,
      body_path: sourceBodyPath,
      requested_url: sourceReceipt.requested_url,
      final_url: sourceReceipt.final_url,
      http_status: sourceReceipt.http_status,
      content_type: sourceReceipt.content_type,
      body_bytes: htmlBytes.length,
      body_sha256: sha256(htmlBytes),
      terminal_state: sourceReceipt.terminal_state
    },
    denominator: {
      expected_counties: 58,
      parsed_counties: rows.length,
      processing_order: 'alphabetical_county_name',
      exact_order_match: true,
      unique_counties: new Set(rows.map((row) => row.county)).size,
      agency_root_rows_materialized: rows.length,
      county_census_complete: false,
      county_selection_authorized: false
    },
    counts: {
      exact_public_agency_roots: stateCounts[EXACT_ROOT_STATE] ?? 0,
      multiple_public_root_candidates: stateCounts[AMBIGUOUS_ROOT_STATE] ?? 0,
      public_sections_without_agency_root: stateCounts[ABSENT_ROOT_STATE] ?? 0,
      link_candidates: candidateLinks,
      counties_censused: 0,
      exact_public_case_receipts: 0,
      case_level_implementation_joins: 0,
      complete_restorations_observed: 0,
      remedy_timeliness_observed: 0
    },
    counties: rows,
    authority: {
      agency_root_is_case_receipt: false,
      agency_root_is_compliance_record: false,
      agency_root_is_implementation_receipt: false,
      missing_root_is_source_unavailable: false,
      missing_root_is_noncompliance: false,
      ambiguous_root_authorizes_selection: false,
      county_follow_up_authorized: false,
      county_census_complete: false,
      prevalence_supported: false,
      racial_order_supported: false,
      coordination_supported: false,
      common_purpose_supported: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };
}

export function buildCountyAgencyRoots(root = DEFAULT_ROOT, outputRel = countyRootPaths.output) {
  const frozen = readJson(root, countyRootPaths.frozenSourceLedger);
  const acquisition = readJson(root, countyRootPaths.acquisitionLedger);
  const counties = frozen.county_census?.ordered_counties;
  const matches = (acquisition.sources ?? []).filter((source) => source.source_id === SOURCE_ID);
  if (matches.length !== 1) throw new Error(`expected one ${SOURCE_ID} receipt, observed ${matches.length}`);
  const receipt = matches[0];
  if (receipt.terminal_state !== 'exact_response_preserved_pending_semantic_classification') {
    throw new Error(`${SOURCE_ID} is not exact successful custody: ${receipt.terminal_state}`);
  }
  if (receipt.http_status !== 200 || receipt.body_bytes !== 50202 || !receipt.body_sha256) {
    throw new Error(`${SOURCE_ID} exact receipt mismatch`);
  }
  const bodyPath = path.join(root, countyRootPaths.acquisitionRoot, receipt.body_path);
  const htmlBytes = fs.readFileSync(bodyPath);
  if (htmlBytes.length !== receipt.body_bytes || sha256(htmlBytes) !== receipt.body_sha256) {
    throw new Error(`${SOURCE_ID} exact body custody mismatch`);
  }
  const output = parseCountyAgencyRoots({
    htmlBytes,
    counties,
    sourceReceipt: receipt,
    sourceBodyPath: toPosix(path.join(countyRootPaths.acquisitionRoot, receipt.body_path))
  });
  const outputPath = path.join(root, outputRel);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, stable(output));
  return output;
}

export function validateCountyAgencyRoots(root = DEFAULT_ROOT, outputRel = countyRootPaths.output) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => {
    if (!condition) errors.push(label);
  };
  const outputPath = path.join(root, outputRel);
  if (!fs.existsSync(outputPath)) return [`county agency-root output missing: ${outputRel}`];
  let output;
  try {
    output = readJson(root, outputRel);
  } catch (error) {
    return [`county agency-root parse failure: ${error.message}`];
  }
  let rebuilt;
  try {
    const tempRel = `${outputRel}.validation.tmp`;
    rebuilt = buildCountyAgencyRoots(root, tempRel);
    fs.rmSync(path.join(root, tempRel), { force: true });
  } catch (error) {
    return [`county agency-root rebuild failure: ${error.message}`];
  }
  eq(JSON.stringify(output), JSON.stringify(rebuilt), 'deterministic county agency-root rebuild');
  eq(output.schema_version, OUTPUT_SCHEMA, 'county-root schema');
  eq(output.execution_id, 'SSC-RD04-SNAP-A07', 'county-root execution');
  eq(output.issue, 741, 'county-root issue');
  eq(output.source?.source_id, SOURCE_ID, 'county-root source identity');
  eq(output.source?.http_status, 200, 'county-root source status');
  eq(output.source?.body_bytes, 50202, 'county-root source bytes');
  eq(output.denominator?.expected_counties, 58, 'county-root expected denominator');
  eq(output.denominator?.parsed_counties, 58, 'county-root parsed denominator');
  eq(output.denominator?.unique_counties, 58, 'county-root unique denominator');
  eq(output.denominator?.agency_root_rows_materialized, 58, 'county-root materialized rows');
  eq(output.denominator?.exact_order_match, true, 'county-root order match');
  eq(output.denominator?.county_census_complete, false, 'county-root census boundary');
  eq(output.denominator?.county_selection_authorized, false, 'county-root selection boundary');
  eq(output.counties?.length, 58, 'county-root row denominator');
  eq(
    output.counts?.exact_public_agency_roots
      + output.counts?.multiple_public_root_candidates
      + output.counts?.public_sections_without_agency_root,
    58,
    'county-root state partition'
  );
  eq(output.counts?.counties_censused, 0, 'county-root census count');
  eq(output.counts?.exact_public_case_receipts, 0, 'county-root case receipt count');
  eq(output.counts?.case_level_implementation_joins, 0, 'county-root join count');
  const ordinals = output.counties?.map((row) => row.ordinal) ?? [];
  check(JSON.stringify(ordinals) === JSON.stringify(Array.from({ length: 58 }, (_, index) => index + 1)), 'county-root ordinal sequence');
  for (const row of output.counties ?? []) {
    check(typeof row.agency_heading === 'string' && row.agency_heading.length > row.county.length, `agency heading ${row.county}`);
    check(row.section_start_byte < row.section_end_byte, `section range ${row.county}`);
    eq(row.section_end_byte - row.section_start_byte, row.section_bytes, `section bytes ${row.county}`);
    check(/^[0-9a-f]{64}$/.test(row.section_sha256), `section hash ${row.county}`);
    check([EXACT_ROOT_STATE, AMBIGUOUS_ROOT_STATE, ABSENT_ROOT_STATE].includes(row.selection_state), `selection state ${row.county}`);
    if (row.selection_state === EXACT_ROOT_STATE) {
      check(typeof row.selected_agency_root_url === 'string' && /^https?:\/\//.test(row.selected_agency_root_url), `selected root ${row.county}`);
    } else {
      eq(row.selected_agency_root_url, null, `unselected root ${row.county}`);
    }
    eq(row.county_follow_up_authorized, false, `county follow-up ${row.county}`);
    eq(row.county_census_complete, false, `county census ${row.county}`);
    eq(row.case_level_receipt_observed, false, `county case receipt ${row.county}`);
    eq(row.implementation_observed, false, `county implementation ${row.county}`);
    eq(row.source_unavailable_proves_noncompliance, false, `county noncompliance boundary ${row.county}`);
  }
  for (const key of [
    'agency_root_is_case_receipt',
    'agency_root_is_compliance_record',
    'agency_root_is_implementation_receipt',
    'missing_root_is_source_unavailable',
    'missing_root_is_noncompliance',
    'ambiguous_root_authorizes_selection',
    'county_follow_up_authorized',
    'county_census_complete',
    'prevalence_supported',
    'racial_order_supported',
    'coordination_supported',
    'common_purpose_supported'
  ]) eq(output.authority?.[key], false, `county-root authority ${key}`);
  for (const key of ['graph_effect', 'publication_effect', 'adoption_effect']) {
    eq(output.authority?.[key], 'none', `county-root effect ${key}`);
  }
  return errors;
}

function main() {
  const command = process.argv[2] ?? 'help';
  const root = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_ROOT;
  if (command === 'build') {
    const output = buildCountyAgencyRoots(root);
    console.log(JSON.stringify({
      counties: output.denominator.parsed_counties,
      exact_roots: output.counts.exact_public_agency_roots,
      ambiguous: output.counts.multiple_public_root_candidates,
      absent: output.counts.public_sections_without_agency_root,
      candidates: output.counts.link_candidates,
      follow_up_authorized: false
    }, null, 2));
    return;
  }
  if (command === 'validate') {
    const errors = validateCountyAgencyRoots(root);
    if (errors.length) {
      console.error(`validate-status-sovereignty-rd04-calfresh-county-agency-roots-a07: ${errors.length} error(s)`);
      for (const error of errors) console.error(`- ${error}`);
      process.exit(1);
    }
    console.log('validate-status-sovereignty-rd04-calfresh-county-agency-roots-a07: PASS — 58 rows materialized, 0 counties censused, 0 follow-up authority');
    return;
  }
  console.error('usage: node tools/build-status-sovereignty-rd04-calfresh-county-agency-roots-a07.mjs <build|validate> [ROOT]');
  process.exit(command === 'help' ? 0 : 1);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (invoked) {
  try {
    main();
  } catch (error) {
    console.error(`build-status-sovereignty-rd04-calfresh-county-agency-roots-a07: ${error.message}`);
    process.exit(1);
  }
}
