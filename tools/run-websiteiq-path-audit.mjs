import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://websiteiq.xyz';
const target = new URL(process.env.TARGET_URL || 'https://bigbirdreturns.github.io/clifford-number/');
const email = process.env.CONTACT_EMAIL || 'bigbirdreturns@proton.me';
const out = process.env.OUT_DIR || 'websiteiq-path-audit';
const maxPolls = Number(process.env.MAX_POLLS || 120);
const pollMs = Number(process.env.POLL_MS || 5000);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await fs.mkdir(out, { recursive: true });

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    /token|secret|authorization|email|statusurl|reporturl|progressurl/i.test(key) ? '[REDACTED]' : redact(item),
  ]));
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    redirect: 'follow',
    ...options,
    headers: {
      'user-agent': 'BigBirdReturns-WebsiteIQ-Path-Audit/1.0',
      accept: 'application/json, text/html;q=0.9, */*;q=0.8',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { response, text, json };
}

const landingPath = `${target.pathname || '/'}${target.search || ''}`;
const intakeBody = {
  url: target.origin,
  landingPath,
  email,
  contactConsent: true,
};

const intake = await request(`${BASE}/api/intake`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(intakeBody),
});

await fs.writeFile(path.join(out, 'request-redacted.json'), `${JSON.stringify({
  url: target.origin,
  landingPath,
  email: '[REDACTED]',
  contactConsent: true,
}, null, 2)}\n`);
await fs.writeFile(path.join(out, 'intake-http.txt'), `status=${intake.response.status}\ncontent-type=${intake.response.headers.get('content-type') || ''}\n`);
await fs.writeFile(path.join(out, 'intake-redacted.json'), `${JSON.stringify(intake.json ? redact(intake.json) : { body: intake.text }, null, 2)}\n`);

if (!intake.response.ok || !intake.json) {
  await fs.writeFile(path.join(out, 'terminal.json'), `${JSON.stringify({
    outcome: 'intake_refused',
    httpStatus: intake.response.status,
    target: target.toString(),
    origin: target.origin,
    landingPath,
  }, null, 2)}\n`);
  throw new Error(`WebsiteIQ corrected intake refused with HTTP ${intake.response.status}: ${intake.text.slice(0, 1000)}`);
}

const statusUrl = intake.json.statusUrl || intake.json.status_url;
let reportUrl = intake.json.reportUrl || intake.json.report_url || intake.json.progressUrl;
if (!statusUrl || !reportUrl) throw new Error('WebsiteIQ response omitted status or report URL.');

const snapshots = [];
let ready = false;
for (let poll = 1; poll <= maxPolls; poll += 1) {
  const status = await request(statusUrl);
  const state = String(status.json?.status || status.json?.state || '').toLowerCase();
  snapshots.push({ poll, at: new Date().toISOString(), httpStatus: status.response.status, state, body: status.json ? redact(status.json) : status.text.slice(0, 500) });
  if (status.json?.reportUrl) reportUrl = status.json.reportUrl;
  if (['ready', 'complete', 'completed', 'finished', 'success', 'succeeded', 'done'].includes(state)) {
    ready = true;
    break;
  }
  if (['failed', 'error', 'rejected', 'cancelled', 'canceled'].includes(state)) break;
  if (poll < maxPolls) await sleep(pollMs);
}
await fs.writeFile(path.join(out, 'status-snapshots.json'), `${JSON.stringify(snapshots, null, 2)}\n`);
if (!ready) throw new Error('WebsiteIQ corrected audit did not reach ready state.');

const report = await request(reportUrl);
if (!report.response.ok || report.text.length < 1000) throw new Error(`WebsiteIQ report fetch failed: HTTP ${report.response.status}`);
await fs.writeFile(path.join(out, 'report.html'), report.text);
await fs.writeFile(path.join(out, 'terminal.json'), `${JSON.stringify({
  outcome: 'report_ready',
  target: target.toString(),
  submittedOrigin: target.origin,
  submittedLandingPath: landingPath,
  requestId: intake.json.id || null,
  completedAt: new Date().toISOString(),
  reportFile: 'report.html',
}, null, 2)}\n`);
console.log(`WebsiteIQ path audit ready for ${target.toString()}`);
