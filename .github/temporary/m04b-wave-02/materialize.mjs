#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`); };
const writeText = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, v.endsWith('\n') ? v : `${v}\n`); };
const carrier = '.github/temporary/m04b-wave-02';
const payloadPath = path.join(carrier, 'payload.json.gz.b64');
if (!fs.existsSync(payloadPath)) throw new Error('missing wave 02 payload');
const payload = JSON.parse(zlib.gunzipSync(Buffer.from(fs.readFileSync(payloadPath, 'utf8').trim(), 'base64')).toString('utf8'));

const evidencePath = 'data/intake/security-state-organism-evidence-intake.json';
const workPath = 'data/project/security-state-work-packages.json';
const routesPath = 'data/intake/security-state-organism-source-routes.json';
const evidence = read(evidencePath);
const work = read(workPath);
const routes = read(routesPath);

if (evidence.records.length !== payload.baseline_evidence_count) throw new Error(`expected ${payload.baseline_evidence_count} baseline evidence records, found ${evidence.records.length}`);
if (routes.routes.length !== payload.baseline_route_count) throw new Error(`expected ${payload.baseline_route_count} baseline routes, found ${routes.routes.length}`);
const existingEvidence = new Set(evidence.records.map((x) => x.evidence_id));
for (const record of payload.records) {
  if (existingEvidence.has(record.evidence_id)) throw new Error(`duplicate evidence id ${record.evidence_id}`);
  if (record.acquisition_wave !== payload.wave_id) throw new Error(`${record.evidence_id}: wave mismatch`);
  if (!record.supports?.length || !record.does_not_support?.length || !record.next_acquisition) throw new Error(`${record.evidence_id}: incomplete evidence boundary`);
}

const routeById = new Map(routes.routes.map((x) => [x.route_id, x]));
if (routeById.has(payload.new_route.route_id)) throw new Error(`route already exists ${payload.new_route.route_id}`);
routes.routes.push(payload.new_route);
routeById.set(payload.new_route.route_id, payload.new_route);
for (const patch of payload.locators) {
  const route = routeById.get(patch.route_id);
  if (!route) throw new Error(`unknown route ${patch.route_id}`);
  let locator = route.locators.find((x) => x.url === patch.url);
  if (!locator) {
    locator = { url: patch.url, scope: 'exact_source_record', verification_state: patch.verification_state, evidence_ids: [] };
    route.locators.push(locator);
  }
  locator.scope = 'exact_source_record';
  locator.verification_state = patch.verification_state;
  locator.evidence_ids = [...new Set([...(locator.evidence_ids ?? []), ...patch.evidence_ids])].sort();
  route.locator_status = 'source_bounded_locator';
  if (patch.primary_url) route.url = patch.primary_url;
  route.acquisition_query = null;
}
routes.routes.sort((a, b) => a.route_id.localeCompare(b.route_id));

const packageById = new Map(work.packages.map((x) => [x.package_id, x]));
for (const record of payload.records) {
  if (!routeById.has(record.source_route_id)) throw new Error(`${record.evidence_id}: unknown source route ${record.source_route_id}`);
  for (const packageId of record.packet_ids) {
    const packet = packageById.get(packageId);
    if (!packet) throw new Error(`${record.evidence_id}: unknown packet ${packageId}`);
    packet.evidence_record_ids = [...new Set([...packet.evidence_record_ids, record.evidence_id])].sort();
    packet.source_route_ids = [...new Set([...packet.source_route_ids, record.source_route_id])].sort();
  }
  evidence.records.push(record);
}

const count = (key) => Object.fromEntries([...evidence.records.reduce((m, row) => m.set(row[key], (m.get(row[key]) ?? 0) + 1), new Map())].sort(([a], [b]) => a.localeCompare(b)));
evidence.counts = { records: evidence.records.length, by_source_type: count('source_type'), by_evidence_status: count('evidence_status') };
if (evidence.records.length !== payload.target_evidence_count) throw new Error('evidence count drift');
if (routes.routes.length !== payload.target_route_count) throw new Error('route count drift');
const stateKey = { source_bounded_locator: 'source_bounded_locators', candidate_system_locator: 'candidate_system_locators', candidate_first_party_locator: 'candidate_first_party_locators', unresolved_locator: 'unresolved_locators' };
routes.counts = { routes: routes.routes.length, source_bounded_locators: 0, candidate_system_locators: 0, candidate_first_party_locators: 0, unresolved_locators: 0 };
for (const route of routes.routes) {
  const key = stateKey[route.locator_status];
  if (!key) throw new Error(`unknown locator status ${route.route_id}:${route.locator_status}`);
  routes.counts[key] += 1;
}

writeJson(evidencePath, evidence);
writeJson(workPath, work);
writeJson(routesPath, routes);

let validator = fs.readFileSync('tools/validate-security-state-organism.mjs', 'utf8')
  .replace("if (routes.routes.length !== 82) fail('82 source routes required');", "if (routes.routes.length !== 83) fail('83 source routes required');")
  .replace("if (evidence.records.length !== 17) fail('17 source-bounded evidence records required');", "if (evidence.records.length !== 24) fail('24 source-bounded evidence records required');")
  .replace('manifest.counts.evidence_records !== 17', 'manifest.counts.evidence_records !== 24')
  .replace('publicData.evidence.length !== 17 || publicData.routes.length !== 82', 'publicData.evidence.length !== 24 || publicData.routes.length !== 83');
if (!validator.includes("evidence.records.length !== 24") || !validator.includes("routes.routes.length !== 83")) throw new Error('validator count patch failed');
writeText('tools/validate-security-state-organism.mjs', validator);

let test = fs.readFileSync('test/security-state-organism.test.js', 'utf8')
  .replace('assert.equal(routes.routes.length, 82);', 'assert.equal(routes.routes.length, 83);')
  .replace('assert.equal(evidence.records.length, 17);', 'assert.equal(evidence.records.length, 24);');
const marker = "console.log('security-state-organism.test: ok');";
const extra = `const wave2Ids = new Set(['M04B-EV-018','M04B-EV-019','M04B-EV-020','M04B-EV-021','M04B-EV-022','M04B-EV-023','M04B-EV-024']);\nassert.equal(evidence.records.filter((x) => wave2Ids.has(x.evidence_id)).length, 7);\nfor (const id of wave2Ids) { const record = evidenceById.get(id); assert.ok(record, id); assert.equal(record.acquisition_wave, 'M04B-W02', id); assert.equal(record.boundaries.graph_effect, 'none', id); assert.equal(record.boundaries.conclusion_generated, false, id); }\nconst armyRoute = routes.routes.find((x) => x.route_id === 'US-ARMY-NGC2');\nassert.ok(armyRoute);\nassert.equal(armyRoute.locator_status, 'source_bounded_locator');\nassert.ok(armyRoute.locators.some((x) => x.evidence_ids.includes('M04B-EV-021')));\nassert.ok(routes.routes.find((x) => x.route_id === 'ANDURIL-OFFICIAL').locators.some((x) => x.evidence_ids.includes('M04B-EV-020')));\nassert.ok(routes.routes.find((x) => x.route_id === 'PALANTIR-OFFICIAL').locators.some((x) => x.evidence_ids.includes('M04B-EV-023')));\nassert.ok(work.packages.find((x) => x.package_id === 'BRG-09').evidence_record_ids.includes('M04B-EV-021'));\nassert.ok(work.packages.find((x) => x.package_id === 'TST-T4-coordination').source_route_ids.includes('US-ARMY-NGC2'));\n`;
if (!test.includes('const wave2Ids = new Set')) test = test.replace(marker, `${extra}${marker}`);
if (!test.includes('assert.equal(evidence.records.length, 24);') || !test.includes('assert.equal(routes.routes.length, 83);')) throw new Error('test count patch failed');
writeText('test/security-state-organism.test.js', test);

writeText('docs/milestones/m04b-decisive-acquisition-wave-02.md', payload.milestone);
const receipt = {
  schema_version: 'm04b-decisive-acquisition-wave@1',
  wave_id: payload.wave_id,
  as_of: payload.as_of,
  records_added: payload.records.map((x) => x.evidence_id),
  source_routes_added: [payload.new_route.route_id],
  source_routes_touched: [...new Set([...payload.records.map((x) => x.source_route_id), ...payload.locators.map((x) => x.route_id)])].sort(),
  packet_backlinks_added: payload.records.reduce((n, x) => n + x.packet_ids.length, 0),
  packet_route_backlinks_added: payload.records.reduce((n, x) => n + x.packet_ids.length, 0),
  boundaries: evidence.boundaries,
};
receipt.content_fingerprint = crypto.createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
writeJson('data/intake/security-state-organism-decisive-acquisition-wave-02.json', receipt);
console.log(JSON.stringify({ ok: true, wave_id: payload.wave_id, evidence_records: evidence.records.length, routes: routes.routes.length, records_added: payload.records.length, packet_backlinks_added: receipt.packet_backlinks_added, route_counts: routes.counts, content_fingerprint: receipt.content_fingerprint }, null, 2));
