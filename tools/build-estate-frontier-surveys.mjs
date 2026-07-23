#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { readJson, root, writeJson } from './lib/ledger.mjs';

export const ESTATE_FRONTIER_SURVEY_MANIFEST_SCHEMA = 'estate-frontier-survey-manifest@1';
export const COMPILED_ESTATE_FRONTIER_SURVEY_SCHEMA = 'compiled-estate-frontier-survey@1';

const REGISTRY_PATH = 'build/estates/index.json';
const ROUTE_REGISTRY_PATH = 'data/estates/source-route-registry.json';
const SURVEY_DIR = 'data/estates/surveys';
const OUTPUT_DIR = 'build/estate-frontier';
const FORBIDDEN_KEYS = /^(?:guilt_score|corruption_score|motive_score|influence_score|risk_score|probability_score|ranking|rank|score|verdict|finding|claim_status|publication_approval)$/i;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function digest(value, length = 20) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex').slice(0, length);
}
function walk(value, visit, pointer = '$') {
  if (Array.isArray(value)) return value.forEach((item, index) => walk(item, visit, `${pointer}[${index}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    visit(key, item, `${pointer}.${key}`);
    walk(item, visit, `${pointer}.${key}`);
  }
}
function fail(message) { throw new Error(`estate-frontier-surveys: ${message}`); }

export function buildEstateFrontierSurveys({ write = true } = {}) {
  const registry = readJson(REGISTRY_PATH);
  const routeRegistry = readJson(ROUTE_REGISTRY_PATH);
  const frontierEstates = registry.estates.filter(estate => estate.generation === 'frontier').sort((a, b) => a.estate_id.localeCompare(b.estate_id));
  if (frontierEstates.length !== 10) fail(`expected ten frontier estates, saw ${frontierEstates.length}`);
  const estateIds = new Set(registry.estates.map(estate => estate.estate_id));
  const routeByLabel = new Map(routeRegistry.routes.map(route => [route.route_label, route]));
  const packets = [];

  for (const estate of frontierEstates) {
    const surveyPath = `${SURVEY_DIR}/${estate.estate_id}.json`;
    if (!fs.existsSync(path.join(root, surveyPath))) fail(`${estate.estate_id} lacks ${surveyPath}`);
    const survey = readJson(surveyPath);
    if (survey.schema_version !== 'estate-frontier-survey@1') fail(`${estate.estate_id} survey schema diverged`);
    if (survey.estate_id !== estate.estate_id || survey.estate_label !== estate.label) fail(`${estate.estate_id} survey identity diverged`);
    if (survey.status !== 'surveyed_and_prepared' || survey.survey_basis !== 'official_source_surface_review') fail(`${estate.estate_id} is not surveyed and prepared`);
    if (survey.promotes_to !== 'candidate_only' || survey.graph_effect !== 'none' || survey.conclusion_generated !== false) fail(`${estate.estate_id} exceeds the survey boundary`);
    const denominator = survey.denominator_contract;
    for (const field of ['unit', 'inclusion_rule', 'exclusion_rule', 'time_window']) if (!String(denominator?.[field] ?? '').trim()) fail(`${estate.estate_id} denominator lacks ${field}`);
    if (!Array.isArray(denominator.jurisdictions) || !denominator.jurisdictions.length) fail(`${estate.estate_id} denominator lacks jurisdictions`);
    if (!Array.isArray(denominator.required_null_controls) || denominator.required_null_controls.length < 3) fail(`${estate.estate_id} lacks bounded null controls`);
    if (!Array.isArray(survey.source_route_plan) || survey.source_route_plan.length !== estate.next_acquisition.source_routes.length) fail(`${estate.estate_id} source route count diverged`);
    const labels = survey.source_route_plan.map(route => route.route_label);
    if (JSON.stringify(labels) !== JSON.stringify(estate.next_acquisition.source_routes)) fail(`${estate.estate_id} route order diverged from definition`);
    const routes = labels.map(label => {
      const route = routeByLabel.get(label);
      if (!route) fail(`${estate.estate_id} references missing route ${label}`);
      if (!(route.used_by_estate_ids ?? []).includes(estate.estate_id)) fail(`${label} does not declare ${estate.estate_id} usage`);
      return route;
    });
    if (!Array.isArray(survey.overlap_hypotheses) || survey.overlap_hypotheses.length < 3) fail(`${estate.estate_id} lacks overlap hypotheses`);
    for (const overlap of survey.overlap_hypotheses) {
      if (!estateIds.has(overlap.estate_id) || overlap.estate_id === estate.estate_id) fail(`${estate.estate_id} has invalid overlap target ${overlap.estate_id}`);
      if (overlap.state !== 'candidate_only' || !/exact typed overlap|bounded non-overlap|explicit unresolved frontier/i.test(overlap.stop_when ?? '')) fail(`${estate.estate_id} overlap hypothesis exceeds bounded search law`);
    }
    const prep = survey.preparation_state;
    if (prep.source_routes_declared !== routes.length || prep.denominator_declared !== true || prep.null_controls_declared !== true
      || prep.identity_contract_declared !== true || prep.temporal_contract_declared !== true || prep.raw_records_acquired !== 0) {
      fail(`${estate.estate_id} preparation state is inconsistent`);
    }
    const packetCore = {
      schema_version: COMPILED_ESTATE_FRONTIER_SURVEY_SCHEMA,
      estate_id: estate.estate_id,
      estate_label: estate.label,
      domain: estate.domain,
      jurisdictions: estate.jurisdictions,
      scope: estate.scope,
      status: survey.status,
      why_new_estate: survey.why_new_estate,
      denominator_contract: denominator,
      source_routes: routes,
      overlap_hypotheses: survey.overlap_hypotheses,
      dominant_fog: estate.dominant_fog,
      fog: estate.fog,
      decisive_output: survey.decisive_output,
      next_acquisition: survey.next_acquisition,
      preparation_state: prep,
      boundaries: survey.boundaries,
      promotes_to: 'candidate_only',
      graph_effect: 'none',
      conclusion_generated: false,
    };
    packets.push({ ...packetCore, fingerprint: digest(packetCore) });
  }

  const routeUses = packets.flatMap(packet => packet.source_routes.map(route => ({ estate_id: packet.estate_id, route_label: route.route_label, canonical_family_id: route.canonical_family_id })));
  const uniqueRoutes = new Set(routeUses.map(item => item.route_label));
  const uniqueFamilies = new Set(routeUses.map(item => item.canonical_family_id));
  const manifestCore = {
    schema_version: ESTATE_FRONTIER_SURVEY_MANIFEST_SCHEMA,
    as_of: registry.as_of,
    purpose: 'Survey and prepare ten additional durable macro estates with denominator law, official source routes, identity/temporal requirements, null controls, and candidate-only overlap hypotheses.',
    counts: {
      estates: packets.length,
      source_route_uses: routeUses.length,
      unique_route_labels: uniqueRoutes.size,
      canonical_source_families: uniqueFamilies.size,
      raw_records_acquired: packets.reduce((total, packet) => total + packet.preparation_state.raw_records_acquired, 0),
      overlap_hypotheses: packets.reduce((total, packet) => total + packet.overlap_hypotheses.length, 0),
    },
    packets: packets.map(packet => ({ estate_id: packet.estate_id, fingerprint: packet.fingerprint, path: `${OUTPUT_DIR}/${packet.estate_id}.json` })),
    waterline: { current: 'surveyed_and_prepared', next: 'bounded_source_acquisition', estate_completion_claimed: false },
    boundaries: [
      'Survey preparation identifies source systems and denominator law; it does not acquire every record.',
      'Overlap hypotheses are bounded search routes, not findings or relationships.',
      'No frontier estate is complete, case-bearing, graph-active, or publication-approved.',
    ],
    promotes_to: 'candidate_only', graph_effect: 'none', conclusion_generated: false,
  };
  const manifest = { ...manifestCore, fingerprint: digest(manifestCore) };
  walk({ manifest, packets }, (key, value, pointer) => {
    if (FORBIDDEN_KEYS.test(key)) fail(`prohibited field ${pointer}`);
    if (key === 'graph_effect' && value !== 'none') fail(`graph-active field ${pointer}`);
    if (key === 'conclusion_generated' && value !== false) fail(`conclusion field ${pointer}`);
  });
  if (write) {
    fs.rmSync(path.join(root, OUTPUT_DIR), { recursive: true, force: true });
    fs.mkdirSync(path.join(root, OUTPUT_DIR), { recursive: true });
    for (const packet of packets) writeJson(`${OUTPUT_DIR}/${packet.estate_id}.json`, packet);
    writeJson(`${OUTPUT_DIR}/manifest.json`, manifest);
  }
  return { manifest, packets };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const built = buildEstateFrontierSurveys();
  console.log(`estate frontier surveys: ${built.manifest.counts.estates} estates, ${built.manifest.counts.source_route_uses} route uses, ${built.manifest.counts.raw_records_acquired} promoted records`);
}
