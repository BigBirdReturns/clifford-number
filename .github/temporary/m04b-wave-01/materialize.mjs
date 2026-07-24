#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`); };
const writeText = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, v.endsWith('\n') ? v : `${v}\n`); };
const carrier = '.github/temporary/m04b-wave-01';
const payloadPath = path.join(carrier, 'payload.json.gz.b64');
if (!fs.existsSync(payloadPath)) throw new Error('missing wave payload');
const payload = JSON.parse(zlib.gunzipSync(Buffer.from(fs.readFileSync(payloadPath, 'utf8').trim(), 'base64')).toString('utf8'));
const evidencePath = 'data/intake/security-state-organism-evidence-intake.json';
const workPath = 'data/project/security-state-work-packages.json';
const routesPath = 'data/intake/security-state-organism-source-routes.json';
const evidence = read(evidencePath);
const work = read(workPath);
const routes = read(routesPath);
if (evidence.records.length !== 9) throw new Error(`expected 9 baseline evidence records, found ${evidence.records.length}`);
const existing = new Set(evidence.records.map((x) => x.evidence_id));
for (const record of payload.records) if (existing.has(record.evidence_id)) throw new Error(`duplicate evidence id ${record.evidence_id}`);
evidence.records.push(...payload.records);
const count = (key) => Object.fromEntries([...evidence.records.reduce((m, row) => m.set(row[key], (m.get(row[key]) ?? 0) + 1), new Map())].sort(([a], [b]) => a.localeCompare(b)));
evidence.counts = { records: evidence.records.length, by_source_type: count('source_type'), by_evidence_status: count('evidence_status') };
if (evidence.records.length !== payload.target_evidence_count) throw new Error('evidence count drift');
const packageById = new Map(work.packages.map((x) => [x.package_id, x]));
for (const record of payload.records) for (const packageId of record.packet_ids) {
  const packet = packageById.get(packageId);
  if (!packet) throw new Error(`${record.evidence_id}: unknown packet ${packageId}`);
  packet.evidence_record_ids = [...new Set([...packet.evidence_record_ids, record.evidence_id])].sort();
}
const routeById = new Map(routes.routes.map((x) => [x.route_id, x]));
for (const patch of payload.locators) {
  const route = routeById.get(patch.route_id);
  if (!route) throw new Error(`unknown route ${patch.route_id}`);
  let locator = route.locators.find((x) => x.url === patch.url);
  if (!locator) { locator = { url: patch.url, scope: 'exact_source_record', verification_state: patch.verification_state, evidence_ids: [] }; route.locators.push(locator); }
  locator.scope = 'exact_source_record';
  locator.verification_state = patch.verification_state;
  locator.evidence_ids = [...new Set([...(locator.evidence_ids ?? []), ...patch.evidence_ids])].sort();
  route.locator_status = 'source_bounded_locator';
}
const stateKey = { source_bounded_locator: 'source_bounded_locators', candidate_system_locator: 'candidate_system_locators', candidate_first_party_locator: 'candidate_first_party_locators', unresolved_locator: 'unresolved_locators' };
routes.counts = { routes: routes.routes.length, source_bounded_locators: 0, candidate_system_locators: 0, candidate_first_party_locators: 0, unresolved_locators: 0 };
for (const route of routes.routes) routes.counts[stateKey[route.locator_status]] += 1;
writeJson(evidencePath, evidence);
writeJson(workPath, work);
writeJson(routesPath, routes);
let validator = fs.readFileSync('tools/validate-security-state-organism.mjs', 'utf8')
  .replace("if (evidence.records.length !== 9) fail('9 source-bounded evidence records required');", "if (evidence.records.length !== 17) fail('17 source-bounded evidence records required');")
  .replace('manifest.counts.evidence_records !== 9', 'manifest.counts.evidence_records !== 17')
  .replace('publicData.evidence.length !== 9', 'publicData.evidence.length !== 17');
if (!validator.includes("evidence.records.length !== 17")) throw new Error('validator count patch failed');
writeText('tools/validate-security-state-organism.mjs', validator);
let test = fs.readFileSync('test/security-state-organism.test.js', 'utf8').replace('assert.equal(evidence.records.length, 9);', 'assert.equal(evidence.records.length, 17);');
const marker = "console.log('security-state-organism.test: ok');";
const extra = `const waveIds = new Set(['M04B-EV-010','M04B-EV-011','M04B-EV-012','M04B-EV-013','M04B-EV-014','M04B-EV-015','M04B-EV-016','M04B-EV-017']);\nassert.equal(evidence.records.filter((x) => waveIds.has(x.evidence_id)).length, 8);\nfor (const id of waveIds) { const record = evidenceById.get(id); assert.ok(record, id); assert.equal(record.acquisition_wave, 'M04B-W01', id); assert.equal(record.boundaries.graph_effect, 'none', id); assert.equal(record.boundaries.conclusion_generated, false, id); }\nassert.ok(routes.routes.find((x) => x.route_id === 'EREBOR-OCC').locators.some((x) => x.evidence_ids.includes('M04B-EV-011')));\nassert.ok(routes.routes.find((x) => x.route_id === 'US-IAPD').locators.some((x) => x.evidence_ids.includes('M04B-EV-015')));\nassert.ok(routes.routes.find((x) => x.route_id === 'US-SEC-FORM-D').locators.some((x) => x.evidence_ids.includes('M04B-EV-016')));\n`;
if (!test.includes('const waveIds = new Set')) test = test.replace(marker, `${extra}${marker}`);
if (!test.includes('assert.equal(evidence.records.length, 17);')) throw new Error('test count patch failed');
writeText('test/security-state-organism.test.js', test);
writeText('docs/milestones/m04b-decisive-acquisition-wave-01.md', payload.milestone);
const receipt = { schema_version: 'm04b-decisive-acquisition-wave@1', wave_id: payload.wave_id, as_of: payload.as_of, records_added: payload.records.map((x) => x.evidence_id), source_routes_touched: [...new Set(payload.locators.map((x) => x.route_id))].sort(), packet_backlinks_added: payload.records.reduce((n, x) => n + x.packet_ids.length, 0), boundaries: evidence.boundaries };
receipt.content_fingerprint = crypto.createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
writeJson('data/intake/security-state-organism-decisive-acquisition-wave-01.json', receipt);
console.log(JSON.stringify({ ok: true, evidence_records: evidence.records.length, records_added: payload.records.length, packet_backlinks_added: receipt.packet_backlinks_added, content_fingerprint: receipt.content_fingerprint }, null, 2));
