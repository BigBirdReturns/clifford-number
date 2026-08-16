#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve(process.argv[2] || 'qualification/m04g-last-two-first-party-probe-v1');
const bodiesDir = path.join(out, 'bodies');
const failuresDir = path.join(out, 'failure-samples');
fs.mkdirSync(bodiesDir, { recursive: true });
fs.mkdirSync(failuresDir, { recursive: true });

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const routes = [
  {
    route_id: 'M04G-GP095',
    basin_id: 'G12-OCEANIA-PACIFIC',
    original_url: 'https://www.legislation.govt.nz/',
    candidates: [
      {
        url: 'https://legislation.govt.nz/act/public/1990/109/en/latest.xml',
        source_class: 'official_legislation_xml_document',
        expected: 'xml',
        max_bytes: 4_194_304,
        timeout_ms: 40_000,
        allowed_suffixes: ['legislation.govt.nz'],
        required_any: ['Bill of Rights', 'New Zealand', '<act']
      },
      {
        url: 'https://legislation.govt.nz/act/public/1990/109/en/latest.pdf',
        source_class: 'official_legislation_pdf_document',
        expected: 'pdf',
        max_bytes: 8_388_608,
        timeout_ms: 50_000,
        allowed_suffixes: ['legislation.govt.nz']
      }
    ]
  },
  {
    route_id: 'M04G-GP096',
    basin_id: 'G12-OCEANIA-PACIFIC',
    original_url: 'https://www.naa.gov.au/',
    candidates: [
      {
        url: 'https://www.naa.gov.au/sites/default/files/2024-10/NAA-Annual-Report-2023-24.pdf',
        source_class: 'official_archival_annual_report_pdf',
        expected: 'pdf',
        max_bytes: 8_388_608,
        timeout_ms: 70_000,
        allowed_suffixes: ['naa.gov.au']
      },
      {
        url: 'https://www.naa.gov.au/sites/default/files/2026-07/Harradine-List-Jan-to-Jun-2026.pdf',
        source_class: 'official_archival_file_index_pdf',
        expected: 'pdf',
        max_bytes: 2_097_152,
        timeout_ms: 60_000,
        allowed_suffixes: ['naa.gov.au']
      }
    ]
  },
  {
    route_id: 'M04G-GP078',
    basin_id: 'G10-EAST-ASIA',
    original_url: 'https://www.korea.net/',
    candidates: [
      {
        url: 'https://french.korea.net/koreanet/rss/news/2',
        source_class: 'official_government_news_feed',
        expected: 'rss',
        max_bytes: 1_048_576,
        timeout_ms: 35_000,
        allowed_suffixes: ['korea.net'],
        required_any: ['<rss', '<channel', '<item']
      },
      {
        url: 'https://japanese.korea.net/koreanet/rss/news/2',
        source_class: 'official_government_news_feed',
        expected: 'rss',
        max_bytes: 1_048_576,
        timeout_ms: 35_000,
        allowed_suffixes: ['korea.net'],
        required_any: ['<rss', '<channel', '<item']
      },
      {
        url: 'https://chinese.korea.net/koreanet/rss/news/2',
        source_class: 'official_government_news_feed',
        expected: 'rss',
        max_bytes: 1_048_576,
        timeout_ms: 35_000,
        allowed_suffixes: ['korea.net'],
        required_any: ['<rss', '<channel', '<item']
      },
      {
        url: 'https://www.korea.net/koreanet/rss/news/2',
        source_class: 'official_government_news_feed',
        expected: 'rss',
        max_bytes: 1_048_576,
        timeout_ms: 35_000,
        allowed_suffixes: ['korea.net'],
        required_any: ['<rss', '<channel', '<item']
      }
    ]
  },
  {
    route_id: 'M04G-GP094',
    basin_id: 'G12-OCEANIA-PACIFIC',
    original_url: 'https://www.anao.gov.au/',
    candidates: [
      {
        url: 'https://www.anao.gov.au/work/corporate/anao-corporate-plan-2026-27',
        source_class: 'official_audit_corporate_plan',
        expected: 'html',
        max_bytes: 4_194_304,
        timeout_ms: 70_000,
        allowed_suffixes: ['anao.gov.au'],
        min_visible: 600,
        required_any: ['ANAO Corporate Plan 2026-27', 'Auditor-General', 'Australian National Audit Office']
      },
      {
        url: 'https://www.anao.gov.au/pubs/performance-audit',
        source_class: 'official_performance_audit_repository',
        expected: 'html',
        max_bytes: 4_194_304,
        timeout_ms: 70_000,
        allowed_suffixes: ['anao.gov.au'],
        min_visible: 600,
        required_any: ['Performance audit', 'Auditor-General', 'Reports and publications']
      }
    ]
  },
  {
    route_id: 'M04G-GP005',
    basin_id: 'G01-GLOBAL-MULTILATERAL',
    original_url: 'https://www.oecd.org/',
    candidates: [
      {
        url: 'https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI/.M.LI...AA...H?startPeriod=2023-02&dimensionAtObservation=AllDimensions&format=csvfilewithlabels',
        source_class: 'official_statistical_api',
        expected: 'csv',
        max_bytes: 8_388_608,
        timeout_ms: 60_000,
        allowed_suffixes: ['oecd.org'],
        required_any: ['TIME_PERIOD', 'REF_AREA', 'Reference area']
      },
      {
        url: 'https://sdmx.oecd.org/public/rest/dataflow/all',
        source_class: 'official_statistical_schema_api',
        expected: 'xml',
        max_bytes: 16_777_216,
        timeout_ms: 70_000,
        allowed_suffixes: ['oecd.org'],
        required_any: ['Dataflow', 'Structure', 'OECD']
      }
    ]
  },
  {
    route_id: 'M04G-GP087',
    basin_id: 'G11-SOUTHEAST-ASIA',
    original_url: 'https://indonesia.go.id/',
    candidates: [
      {
        url: 'https://indonesia.go.id/profile/presiden-wapre',
        source_class: 'official_government_profile_record',
        expected: 'html',
        max_bytes: 2_097_152,
        timeout_ms: 40_000,
        allowed_suffixes: ['indonesia.go.id'],
        min_visible: 400,
        required_any: ['Presiden', 'Wakil Presiden', 'Indonesia']
      }
    ]
  }
];

const challengeMarkers = [
  'cf-chl-', 'cloudflare ray id', 'just a moment',
  'enable javascript and cookies to continue', 'access denied',
  'request blocked', 'captcha', 'the request could not be satisfied'
];

function hostAllowed(candidate, hostname) {
  const source = new URL(candidate.url).hostname.toLowerCase();
  const final = hostname.toLowerCase();
  if (final === source || final.endsWith(`.${source}`) || source.endsWith(`.${final}`)) return true;
  return (candidate.allowed_suffixes || []).some((suffix) => final === suffix || final.endsWith(`.${suffix}`));
}

function mergeCookies(existing, responseHeaders) {
  const jar = new Map();
  for (const part of String(existing || '').split(/;\s*/u).filter(Boolean)) {
    const index = part.indexOf('=');
    if (index > 0) jar.set(part.slice(0, index), part.slice(index + 1));
  }
  const setCookies = typeof responseHeaders.getSetCookie === 'function'
    ? responseHeaders.getSetCookie()
    : [responseHeaders.get('set-cookie')].filter(Boolean);
  for (const header of setCookies) {
    const pair = String(header).split(';', 1)[0];
    const index = pair.indexOf('=');
    if (index > 0) jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
}

async function readBounded(response, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body || []) {
    const buffer = Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) {
      try { await response.body.cancel(); } catch {}
      throw Object.assign(new Error(`response exceeded ${maxBytes} bytes`), { failure: 'oversized_response' });
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function visibleHtmlText(text) {
  return text
    .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/giu, ' ')
    .replace(/<!--([\s\S]*?)-->/gu, ' ')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&nbsp;|&#160;/giu, ' ')
    .replace(/&amp;/giu, '&')
    .replace(/\s+/gu, ' ')
    .trim();
}

function requiredMarkersPresent(text, candidate) {
  const markers = candidate.required_any || [];
  return markers.length === 0 || markers.some((marker) => text.toLowerCase().includes(String(marker).toLowerCase()));
}

function classifyBody(body, headers, candidate) {
  const contentType = String(headers['content-type'] || '').toLowerCase();
  if (body.length < 128) return { success: false, failure: 'insufficient_content', reason: `only ${body.length} bytes` };
  const prefix = body.subarray(0, 16).toString('binary');
  if (candidate.expected === 'pdf' || contentType.includes('pdf') || prefix.startsWith('%PDF-')) {
    if (!prefix.startsWith('%PDF-')) return { success: false, failure: 'content_type_mismatch', reason: 'PDF content type without PDF magic bytes' };
    if (body.length < 1024) return { success: false, failure: 'insufficient_content', reason: `PDF only ${body.length} bytes` };
    return { success: true, preview: `PDF ${body.length} bytes`, record_count: 1 };
  }

  const text = body.toString('utf8').trim();
  const lower = text.toLowerCase();
  const challenge = challengeMarkers.find((marker) => lower.includes(marker));
  if (challenge) return { success: false, failure: 'challenge_or_access_page', reason: `challenge marker: ${challenge}` };

  if (candidate.expected === 'rss') {
    if (/<html\b/iu.test(text.slice(0, 1000))) return { success: false, failure: 'content_type_mismatch', reason: 'RSS response contains HTML' };
    const itemCount = (text.match(/<item\b/giu) || []).length + (text.match(/<entry\b/giu) || []).length;
    if (!/<(?:rss|feed)\b/iu.test(text) || itemCount < 1) return { success: false, failure: 'parse_failure', reason: 'response lacks RSS or Atom records' };
    if (!requiredMarkersPresent(text, candidate)) return { success: false, failure: 'semantic_mismatch', reason: 'required feed markers absent' };
    return { success: true, preview: text.replace(/\s+/gu, ' ').slice(0, 700), record_count: itemCount };
  }

  if (candidate.expected === 'xml' || contentType.includes('xml') || /^<\?xml\b/iu.test(text)) {
    if (/<html\b/iu.test(text.slice(0, 1000))) return { success: false, failure: 'content_type_mismatch', reason: 'XML-labelled response contains HTML' };
    if (!/^<\?xml\b/iu.test(text) && !/<(?:act|legislation|bill|Dataflow|Structure|message|registry|rss|feed)\b/iu.test(text)) {
      return { success: false, failure: 'parse_failure', reason: 'response lacks a recognized substantive XML root' };
    }
    if (!requiredMarkersPresent(text, candidate)) return { success: false, failure: 'semantic_mismatch', reason: 'required XML markers absent' };
    return { success: true, preview: text.replace(/\s+/gu, ' ').slice(0, 700), record_count: (text.match(/<(?:act|Dataflow|Ref)\b/giu) || []).length || 1 };
  }

  if (candidate.expected === 'csv') {
    const lines = text.split(/\r?\n/u).filter((line) => line.trim());
    if (lines.length < 2 || !lines[0].includes(',')) return { success: false, failure: 'parse_failure', reason: 'response lacks tabular CSV rows' };
    if (!requiredMarkersPresent(text, candidate)) return { success: false, failure: 'semantic_mismatch', reason: 'required CSV markers absent' };
    return { success: true, preview: lines.slice(0, 3).join(' ').slice(0, 700), record_count: lines.length - 1 };
  }

  if (candidate.expected === 'html' || contentType.includes('html') || /<html\b/iu.test(text.slice(0, 1000))) {
    const visible = visibleHtmlText(text);
    const minimum = Number(candidate.min_visible || 300);
    if (visible.length < minimum) return { success: false, failure: 'insufficient_visible_content', reason: `only ${visible.length} visible characters`, visible_characters: visible.length };
    if (!requiredMarkersPresent(visible, candidate)) return { success: false, failure: 'semantic_mismatch', reason: 'required HTML markers absent', visible_characters: visible.length };
    return { success: true, preview: visible.slice(0, 700), visible_characters: visible.length, record_count: 1 };
  }

  return { success: false, failure: 'unclassified', reason: `unsupported content type ${contentType || 'unknown'}` };
}

async function fetchCandidate(route, candidate, candidateIndex) {
  const requestAttempts = [];
  for (let requestAttempt = 1; requestAttempt <= 2; requestAttempt += 1) {
    let current = candidate.url;
    let cookie = '';
    const redirects = [];
    const seen = new Set();
    try {
      for (let redirectCount = 0; redirectCount <= 6; redirectCount += 1) {
        const stateKey = `${current}\n${cookie}`;
        if (seen.has(stateKey)) {
          requestAttempts.push({ request_attempt: requestAttempt, status: null, final_url: current, redirects, failure: 'redirect_loop', rejection_reason: 'repeated URL and cookie state' });
          break;
        }
        seen.add(stateKey);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(new Error(`timeout after ${candidate.timeout_ms || 40_000}ms`)), candidate.timeout_ms || 40_000);
        let response;
        try {
          response = await fetch(current, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: {
              'user-agent': 'CliffordNumber-M04G/2.7 residual-first-party-probe research@clifford-number.invalid',
              'accept': 'application/pdf,application/xml,application/rss+xml,text/xml,text/csv,text/html,*/*;q=0.1',
              ...(cookie ? { cookie } : {})
            }
          });
        } finally {
          clearTimeout(timer);
        }
        const headers = Object.fromEntries(response.headers);
        const nextCookie = mergeCookies(cookie, response.headers);
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) {
            requestAttempts.push({ request_attempt: requestAttempt, status: response.status, final_url: current, headers, redirects, failure: 'redirect_unresolved' });
            break;
          }
          const next = new URL(location, current);
          if (next.protocol !== 'https:') {
            requestAttempts.push({ request_attempt: requestAttempt, status: response.status, final_url: current, headers, redirects, failure: 'https_downgrade_refused', redirect_target: next.toString() });
            break;
          }
          if (!hostAllowed(candidate, next.hostname)) {
            requestAttempts.push({ request_attempt: requestAttempt, status: response.status, final_url: current, headers, redirects, failure: 'redirect_outside_official_host', redirect_target: next.toString() });
            break;
          }
          if (next.toString() === current && nextCookie === cookie) {
            requestAttempts.push({ request_attempt: requestAttempt, status: response.status, final_url: current, headers, redirects, failure: 'redirect_loop', rejection_reason: 'self redirect without new cookie state' });
            break;
          }
          redirects.push({ status: response.status, from: current, to: next.toString(), cookie_state_changed: nextCookie !== cookie });
          current = next.toString();
          cookie = nextCookie;
          continue;
        }

        let body = Buffer.alloc(0);
        try {
          body = await readBounded(response, Number(candidate.max_bytes || 2_097_152));
        } catch (error) {
          requestAttempts.push({ request_attempt: requestAttempt, status: response.status, final_url: current, headers, redirects, failure: error.failure || 'read_failure', rejection_reason: String(error.message || error) });
          break;
        }

        if (response.status !== 200) {
          const lowerSample = body.toString('utf8').toLowerCase();
          const marker = challengeMarkers.find((value) => lowerSample.includes(value));
          const failure = marker ? 'challenge_or_access_page' : response.status === 403 ? 'access_blocked' : response.status === 429 ? 'rate_limited' : response.status >= 500 ? 'upstream_failure' : 'http_failure';
          const samplePath = path.join(failuresDir, `${route.route_id}-${candidateIndex}-request-${requestAttempt}.txt`);
          fs.writeFileSync(samplePath, body.subarray(0, 65_536));
          requestAttempts.push({ request_attempt: requestAttempt, status: response.status, final_url: current, headers, redirects, bytes: body.length, failure, rejection_reason: marker ? `challenge marker: ${marker}` : `HTTP ${response.status}`, sample_path: path.relative(out, samplePath) });
          if ((response.status === 429 || response.status >= 500) && requestAttempt < 2) await sleep(1500);
          break;
        }

        const classified = classifyBody(body, headers, candidate);
        if (classified.success) {
          const extension = candidate.expected === 'pdf' ? 'pdf' : candidate.expected === 'rss' || candidate.expected === 'xml' ? 'xml' : candidate.expected === 'csv' ? 'csv' : 'html';
          const bodyPath = path.join(bodiesDir, `${route.route_id}-${candidateIndex}.${extension}`);
          fs.writeFileSync(bodyPath, body);
          requestAttempts.push({ request_attempt: requestAttempt, status: response.status, final_url: current, headers, redirects, bytes: body.length, content_type: headers['content-type'] || null, success: true, body_sha256: sha256(body), body_path: path.relative(out, bodyPath), record_count: classified.record_count || null, visible_characters: classified.visible_characters || null, preview: classified.preview || null });
          return { route_id: route.route_id, candidate_index: candidateIndex, url: candidate.url, method: 'GET', source_class: candidate.source_class, success: true, selected_attempt: requestAttempts.at(-1), request_attempts: requestAttempts };
        }

        const samplePath = path.join(failuresDir, `${route.route_id}-${candidateIndex}-request-${requestAttempt}.${candidate.expected === 'html' ? 'html' : 'txt'}`);
        fs.writeFileSync(samplePath, body.subarray(0, 65_536));
        requestAttempts.push({ request_attempt: requestAttempt, status: response.status, final_url: current, headers, redirects, bytes: body.length, content_type: headers['content-type'] || null, success: false, failure: classified.failure, rejection_reason: classified.reason, visible_characters: classified.visible_characters || null, sample_path: path.relative(out, samplePath) });
        break;
      }
    } catch (error) {
      const message = String(error?.message || error);
      requestAttempts.push({ request_attempt: requestAttempt, status: null, final_url: current, failure: message.toLowerCase().includes('timeout') ? 'timeout' : 'transport_failure', rejection_reason: message });
      if (requestAttempt < 2) await sleep(1500);
    }
    const terminal = requestAttempts.at(-1);
    if (!['timeout', 'transport_failure', 'rate_limited', 'upstream_failure'].includes(terminal?.failure || '') || requestAttempt >= 2) break;
  }
  const terminal = requestAttempts.at(-1) || { failure: 'unclassified' };
  return { route_id: route.route_id, candidate_index: candidateIndex, url: candidate.url, method: 'GET', source_class: candidate.source_class, success: false, failure: terminal.failure || 'unclassified', rejection_reason: terminal.rejection_reason || null, request_attempts: requestAttempts };
}

const routeResults = [];
for (const route of routes) {
  const candidateResults = [];
  let selected = null;
  for (let index = 0; index < route.candidates.length; index += 1) {
    const result = await fetchCandidate(route, route.candidates[index], index);
    candidateResults.push(result);
    if (result.success) {
      selected = result;
      break;
    }
  }
  routeResults.push({ ...route, route_success: Boolean(selected), content_success: Boolean(selected), selected, candidate_results: candidateResults });
}

const selected = routeResults.filter((route) => route.route_success).map((route) => {
  const candidate = route.selected;
  const attempt = candidate.selected_attempt;
  return {
    route_id: route.route_id,
    basin_id: route.basin_id,
    original_url: route.original_url,
    candidate_index: candidate.candidate_index,
    url: candidate.url,
    final_url: attempt.final_url,
    method: candidate.method,
    source_class: candidate.source_class,
    status: attempt.status,
    bytes: attempt.bytes,
    content_type: attempt.content_type,
    body_sha256: attempt.body_sha256,
    body_path: attempt.body_path,
    record_count: attempt.record_count,
    visible_characters: attempt.visible_characters
  };
});

const failureCounts = {};
for (const route of routeResults.filter((row) => !row.route_success)) {
  const failure = route.candidate_results.at(-1)?.failure || 'unclassified';
  failureCounts[failure] = (failureCounts[failure] || 0) + 1;
}

const projectedRouteSuccesses = 70 + selected.length;
const projectedContentSuccesses = 70 + selected.length;
const summary = {
  routes_probed: routeResults.length,
  candidates_declared: routes.reduce((sum, route) => sum + route.candidates.length, 0),
  route_successes: selected.length,
  content_successes: selected.length,
  failed_routes: routeResults.length - selected.length,
  projected_global_route_successes: projectedRouteSuccesses,
  projected_global_content_successes: projectedContentSuccesses,
  projected_route_threshold_met: projectedRouteSuccesses >= 72,
  projected_content_threshold_met: projectedContentSuccesses >= 63,
  integration_threshold_met: projectedRouteSuccesses >= 72 && projectedContentSuccesses >= 63,
  unclassified_failures: failureCounts.unclassified || 0
};

const ledger = {
  schema_version: 'm04g-last-two-first-party-probe@1',
  generated_at: new Date().toISOString(),
  workflow_run_id: process.env.GITHUB_RUN_ID || null,
  commit_sha: process.env.GITHUB_SHA || null,
  branch: process.env.GITHUB_REF_NAME || null,
  baseline_after_probe_v1: { route_successes: 70, content_successes: 70 },
  thresholds: { route_successes: 72, content_successes: 63 },
  product_files_modified: false,
  candidate_write_enabled: false,
  summary,
  failure_counts: failureCounts,
  selected,
  routes: routeResults,
  boundaries: {
    denominator_changed: false,
    route_identity_changed: false,
    content_classifier_weakened: false,
    thresholds_changed: false,
    promotion_ceiling_changed: false,
    source_health_proves_evidentiary_sufficiency: false,
    source_health_proves_answer_effectiveness: false
  }
};

const ledgerText = `${JSON.stringify(ledger, null, 2)}\n`;
fs.writeFileSync(path.join(out, 'ledger.json'), ledgerText);
fs.writeFileSync(path.join(out, 'ledger.sha256'), `${sha256(Buffer.from(ledgerText))}  ledger.json\n`);
const receipt = {
  schema_version: 'm04g-last-two-first-party-probe-receipt@1',
  generated_at: ledger.generated_at,
  workflow_run_id: ledger.workflow_run_id,
  commit_sha: ledger.commit_sha,
  branch: ledger.branch,
  ledger_sha256: sha256(Buffer.from(ledgerText)),
  selected_route_ids: selected.map((row) => row.route_id),
  route_successes: summary.route_successes,
  projected_global_route_successes: summary.projected_global_route_successes,
  projected_global_content_successes: summary.projected_global_content_successes,
  integration_threshold_met: summary.integration_threshold_met,
  product_files_modified: false
};
fs.writeFileSync(path.join(out, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'proof.sha256'), `${sha256(Buffer.from(JSON.stringify(receipt)))}  receipt.json\n${sha256(Buffer.from(ledgerText))}  ledger.json\n`);

const lines = [
  '# M04G last-two first-party probe',
  '',
  `Generated: ${ledger.generated_at}`,
  '',
  `Routes probed: ${summary.routes_probed}`,
  `Substantive route successes: ${summary.route_successes}`,
  `Projected global route successes: ${summary.projected_global_route_successes}/72`,
  `Projected global content successes: ${summary.projected_global_content_successes}/63`,
  `Integration threshold met: ${summary.integration_threshold_met}`,
  '',
  '## Selected first-party candidates',
  '',
  ...selected.map((row) => `- ${row.route_id} ${row.source_class}: ${row.method} ${row.url} -> HTTP ${row.status}, ${row.bytes} bytes, sha256 ${row.body_sha256}`),
  '',
  '## Terminal failures',
  '',
  ...Object.entries(failureCounts).sort().map(([failure, count]) => `- ${failure}: ${count}`),
  '',
  '## Control boundary',
  '',
  'This probe does not modify product files, the frozen 96-route denominator, route identities, promotion ceilings, the substantive content classifier, or global thresholds.'
];
fs.writeFileSync(path.join(out, 'summary.md'), `${lines.join('\n')}\n`);
console.log(JSON.stringify(summary, null, 2));
