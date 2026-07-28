import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.WEBSITEIQ_BASE_URL || 'https://websiteiq.xyz';
const TARGET_URL = process.env.TARGET_URL || 'https://bigbirdreturns.github.io/clifford-number/';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'bigbirdreturns@proton.me';
const OUT_DIR = process.env.OUT_DIR || 'websiteiq-audit';
const MAX_POLLS = Number(process.env.MAX_POLLS || 120);
const POLL_MS = Number(process.env.POLL_MS || 5000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (/token|secret|authorization|email/i.test(key)) out[key] = '[REDACTED]';
    else out[key] = redact(item);
  }
  return out;
}

function first(obj, keys) {
  for (const key of keys) {
    if (obj && typeof obj[key] === 'string' && obj[key].trim()) return obj[key].trim();
  }
  return '';
}

function absoluteUrl(candidate) {
  if (!candidate) return '';
  return new URL(candidate, BASE).toString();
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    redirect: 'follow',
    ...options,
    headers: {
      'user-agent': 'BigBirdReturns-WebsiteIQ-Audit/1.0',
      accept: 'application/json, text/html;q=0.9, */*;q=0.8',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  return { response, text };
}

async function parseJsonResponse(url, options) {
  const { response, text } = await fetchText(url, options);
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { response, text, json };
}

await fs.mkdir(OUT_DIR, { recursive: true });

const intakeBody = {
  url: TARGET_URL,
  email: CONTACT_EMAIL,
  contactConsent: true,
};

console.log(`Submitting WebsiteIQ baseline audit for ${TARGET_URL}`);
const intake = await parseJsonResponse(`${BASE}/api/intake`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(intakeBody),
});

await fs.writeFile(
  path.join(OUT_DIR, 'intake-http.txt'),
  `status=${intake.response.status}\ncontent-type=${intake.response.headers.get('content-type') || ''}\n`,
);

if (!intake.response.ok || !intake.json) {
  await fs.writeFile(path.join(OUT_DIR, 'intake-error.txt'), intake.text);
  throw new Error(`WebsiteIQ intake failed with HTTP ${intake.response.status}: ${intake.text.slice(0, 800)}`);
}

await fs.writeFile(
  path.join(OUT_DIR, 'intake-redacted.json'),
  `${JSON.stringify(redact(intake.json), null, 2)}\n`,
);
console.log('WebsiteIQ intake accepted. Returned fields:', Object.keys(intake.json).sort().join(', '));

const requestId = first(intake.json, ['requestId', 'request_id', 'id', 'auditId', 'audit_id']);
const accessToken = first(intake.json, ['accessToken', 'access_token', 'token', 'reportToken', 'report_token']);
let statusUrl = absoluteUrl(first(intake.json, ['statusUrl', 'status_url', 'statusHref', 'status_href']));
let reportUrl = absoluteUrl(first(intake.json, ['reportUrl', 'report_url', 'reportHref', 'report_href']));

if (!statusUrl && requestId) {
  const u = new URL('/api/status', BASE);
  u.searchParams.set('requestId', requestId);
  if (accessToken) u.searchParams.set('token', accessToken);
  statusUrl = u.toString();
}
if (!reportUrl && requestId) {
  const u = new URL('/api/report', BASE);
  u.searchParams.set('requestId', requestId);
  if (accessToken) u.searchParams.set('token', accessToken);
  reportUrl = u.toString();
}

if (!statusUrl && !reportUrl) {
  throw new Error('WebsiteIQ intake returned neither a status URL nor a report URL. Inspect intake-redacted.json.');
}

const authHeaders = accessToken
  ? { authorization: `Bearer ${accessToken}`, 'x-access-token': accessToken }
  : {};

const snapshots = [];
let complete = false;
let terminalStatus = '';

for (let poll = 1; poll <= MAX_POLLS; poll += 1) {
  if (statusUrl) {
    const status = await parseJsonResponse(statusUrl, { headers: authHeaders });
    const statusValue = first(status.json || {}, ['status', 'state', 'phase', 'result']).toLowerCase();
    snapshots.push({
      poll,
      at: new Date().toISOString(),
      httpStatus: status.response.status,
      status: statusValue || null,
      body: status.json ? redact(status.json) : status.text.slice(0, 500),
    });

    if (status.json) {
      const nextReport = first(status.json, ['reportUrl', 'report_url', 'reportHref', 'report_href']);
      if (nextReport) reportUrl = absoluteUrl(nextReport);
    }

    if (['complete', 'completed', 'finished', 'success', 'succeeded', 'ready', 'done'].includes(statusValue)) {
      complete = true;
      terminalStatus = statusValue;
      break;
    }
    if (['failed', 'error', 'rejected', 'cancelled', 'canceled'].includes(statusValue)) {
      terminalStatus = statusValue;
      break;
    }
  }

  if (reportUrl) {
    const probe = await fetchText(reportUrl, { headers: authHeaders });
    const contentType = probe.response.headers.get('content-type') || '';
    const looksFinished = probe.response.ok
      && /text\/html/i.test(contentType)
      && !/audit running|report pending|processing request|no active request yet/i.test(probe.text)
      && probe.text.length > 1000;
    if (looksFinished) {
      complete = true;
      terminalStatus = 'report_ready';
      await fs.writeFile(path.join(OUT_DIR, 'report.html'), probe.text);
      break;
    }
  }

  if (poll < MAX_POLLS) await sleep(POLL_MS);
}

await fs.writeFile(
  path.join(OUT_DIR, 'status-snapshots.json'),
  `${JSON.stringify(snapshots, null, 2)}\n`,
);

if (!complete) {
  throw new Error(`WebsiteIQ audit did not complete. Terminal status: ${terminalStatus || 'timeout'}`);
}

if (!reportUrl) throw new Error('WebsiteIQ completed without returning a report URL.');

const reportPath = path.join(OUT_DIR, 'report.html');
try {
  await fs.access(reportPath);
} catch {
  const report = await fetchText(reportUrl, { headers: authHeaders });
  if (!report.response.ok) {
    throw new Error(`WebsiteIQ report fetch failed with HTTP ${report.response.status}`);
  }
  await fs.writeFile(reportPath, report.text);
}

await fs.writeFile(path.join(OUT_DIR, 'report-url.txt'), `${reportUrl}\n`);
await fs.writeFile(
  path.join(OUT_DIR, 'audit-metadata.json'),
  `${JSON.stringify({
    auditedUrl: TARGET_URL,
    submittedAt: new Date().toISOString(),
    terminalStatus,
    requestId: requestId || null,
    statusUrl: statusUrl ? '[TOKEN-BEARING URL RETAINED IN WORKFLOW ARTIFACT ONLY]' : null,
    reportUrlFile: 'report-url.txt',
    reportFile: 'report.html',
  }, null, 2)}\n`,
);

console.log(`WebsiteIQ audit complete: ${terminalStatus}`);
console.log(`Report saved to ${reportPath}`);
