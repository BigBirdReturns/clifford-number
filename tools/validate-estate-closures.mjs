#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { buildEstateClosures } from './build-estate-closures.mjs';
import { readJson, root } from './lib/ledger.mjs';

const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };

const first = buildEstateClosures({ write: false });
const second = buildEstateClosures({ write: false });
check(JSON.stringify(first) === JSON.stringify(second), 'closure compiler is not deterministic');

const { manifest, packets, apertureData } = first;
check(manifest.schema_version === 'estate-closure-manifest@1', 'manifest schema mismatch');
check(manifest.counts.estates === 14, `expected 14 estates, saw ${manifest.counts.estates}`);
check(manifest.counts.tasks === 143, `expected 143 tasks, saw ${manifest.counts.tasks}`);
check(manifest.counts.route_uses === 87, `expected 87 source-route uses, saw ${manifest.counts.route_uses}`);
check(manifest.counts.route_labels === 66, `expected 66 route labels, saw ${manifest.counts.route_labels}`);
check(manifest.counts.canonical_route_families === 54, `expected 54 canonical route families, saw ${manifest.counts.canonical_route_families}`);
check(manifest.counts.surface_complete_tasks === 14, 'exactly fourteen candidate packets must be surface complete');
check(manifest.counts.partially_searched_tasks === 129, 'exactly 129 upstream tasks must remain partially searched');
check(manifest.counts.unavailable_after_search_tasks === 0, 'compiled closure should not claim unavailable-after-search without an acquisition ledger');
check(manifest.graph_effect === 'none' && manifest.conclusion_generated === false, 'manifest exceeds non-inference boundary');
check(manifest.waterline.estate_completion_claimed === false, 'manifest claims estate completion');

const taskIds = new Set();
const routeRegistry = readJson('data/estates/source-route-registry.json');
const routeLabels = new Set(routeRegistry.routes.map(route => route.route_label));
check(manifest.source_registry_scope === 'closed_m01_estates_only', 'source registry scope is not isolated to M-01');
check(manifest.route_registry_scope === 'closed_m01_routes_only', 'route registry scope is not isolated to M-01');
check(apertureData.registry?.scope === 'closed_m01_estates_only', 'aperture registry scope is not isolated to M-01');
check(apertureData.registry?.counts?.estates === 14, 'aperture registry count leaked beyond M-01');
check(apertureData.registry?.counts?.frontier_estates === 0, 'frontier estates leaked into the M-01 registry projection');
const stable = value => Array.isArray(value)
  ? value.map(stable)
  : (!value || typeof value !== 'object')
    ? value
    : Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
const closedRouteDigest = crypto.createHash('sha256').update(JSON.stringify(stable(apertureData.routes))).digest('hex');
check(manifest.route_registry_sha256 === closedRouteDigest, 'closed M-01 route projection digest drifted');
for (const packet of packets) {
  check(packet.pass_status === 'bounded_pass_complete', `${packet.estate_id}: pass status mismatch`);
  check(packet.estate_status === 'open_residual_fog', `${packet.estate_id}: estate state must remain open`);
  check(packet.promotes_to === 'candidate_only', `${packet.estate_id}: unsafe promotion state`);
  check(packet.graph_effect === 'none' && packet.conclusion_generated === false, `${packet.estate_id}: unsafe boundary`);
  check(packet.issue?.number >= 85 && packet.issue?.number <= 98, `${packet.estate_id}: issue mapping missing`);
  check(packet.tasks.length === packet.task_counts.total, `${packet.estate_id}: task count mismatch`);
  check((packet.source_routes ?? []).every(route =>
    (route.used_by_estate_ids ?? []).every(estateId => packets.some(candidate => candidate.estate_id === estateId))),
  `${packet.estate_id}: shared route leaked an estate outside the M-01 closure set`);
  const localIds = new Set(packet.tasks.map(task => task.task_id));
  const candidates = packet.tasks.filter(task => task.task_kind === 'candidate_packet');
  check(candidates.length === 1, `${packet.estate_id}: expected one candidate packet`);
  check(candidates[0]?.closure_state === 'surface_complete', `${packet.estate_id}: candidate packet is not surface complete`);
  for (const task of packet.tasks) {
    check(!taskIds.has(task.task_id), `duplicate task id ${task.task_id}`);
    taskIds.add(task.task_id);
    check(task.task_state === 'closed_bounded', `${task.task_id}: task is not closed bounded`);
    check(task.candidate_status === 'intake_only', `${task.task_id}: unsafe candidate state`);
    check(task.promotes_to === 'candidate_only', `${task.task_id}: unsafe promotion`);
    check(task.graph_effect === 'none' && task.conclusion_generated === false, `${task.task_id}: unsafe inference boundary`);
    check(Boolean(task.resolution) && Boolean(task.residual_fog) && Boolean(task.next_transition), `${task.task_id}: incomplete closure record`);
    check((task.dependencies ?? []).every(id => localIds.has(id)), `${task.task_id}: unresolved dependency`);
    if (task.task_kind === 'source_acquisition') {
      const originalLabel = task.refs.find(ref => routeLabels.has(ref));
      check(Boolean(originalLabel), `${task.task_id}: route label does not resolve`);
      check(Boolean(task.evidence?.route_id), `${task.task_id}: route evidence missing`);
    }
    if (task.task_kind !== 'candidate_packet') check(task.closure_state === 'partially_searched', `${task.task_id}: upstream task claims completion`);
  }
  check(candidates[0]?.dependencies.length === packet.tasks.length - 1, `${packet.estate_id}: candidate packet does not depend on every upstream task`);
}
check(taskIds.size === 143, `expected 143 unique tasks, saw ${taskIds.size}`);

check(apertureData.schema_version === 'estate-aperture-data@1', 'aperture data schema mismatch');
check(apertureData.estates.length === 14, 'aperture does not include every estate');
check(apertureData.routes.length === 66, 'aperture route count mismatch');
check(apertureData.corridors.length === 34, `expected 34 shared-source corridors, saw ${apertureData.corridors.length}`);
check(apertureData.corridors.every(row => row.graph_effect === 'none'), 'shared-source corridors exceed the graph boundary');
check(apertureData.interpretation_contract.graph_effect === 'none', 'aperture graph effect is unsafe');
check(apertureData.interpretation_contract.closure_is_not_estate_completion === true, 'aperture completion boundary missing');


const milestone = readJson('data/milestones/estate-aperture-v1.json');
check(milestone.schema_version === 'clifford-milestone@1', 'milestone schema mismatch');
check(milestone.status === 'completed', 'milestone is not marked completed');
check(milestone.counts.estates === manifest.counts.estates, 'milestone estate count drifted');
check(milestone.counts.tasks === manifest.counts.tasks, 'milestone task count drifted');
check(milestone.counts.source_route_uses === manifest.counts.route_uses, 'milestone route-use count drifted');
check(milestone.counts.shared_source_corridors === apertureData.corridors.length, 'milestone corridor count drifted');
check(milestone.waterline.estate_completion_claimed === false, 'milestone claims estate completion');
check(milestone.graph_effect === 'none' && milestone.conclusion_generated === false, 'milestone exceeds non-inference boundary');
const milestoneDoc = path.join(root, 'docs', 'milestones', 'estate-aperture-v1.md');
check(fs.existsSync(milestoneDoc), 'milestone document missing');
if (fs.existsSync(milestoneDoc)) check(/A task is complete when the declared bounded operation/i.test(fs.readFileSync(milestoneDoc, 'utf8')), 'milestone acceptance boundary missing');

const committedManifest = readJson('build/estate-closures/manifest.json');
check(JSON.stringify(committedManifest) === JSON.stringify(manifest), 'committed closure manifest drifted from compiler');
const committedData = readJson('estates/data.json');
check(JSON.stringify(committedData) === JSON.stringify(apertureData), 'committed estate aperture data drifted from compiler');
for (const packet of packets) {
  const committed = readJson(`build/estate-closures/${packet.estate_id}.json`);
  check(JSON.stringify(committed) === JSON.stringify(packet), `${packet.estate_id}: committed packet drifted`);
  const handoff = path.join(root, 'issue-handoffs', `${String(packet.issue.number).padStart(2, '0')}-${packet.estate_id}.md`);
  check(fs.existsSync(handoff), `${packet.estate_id}: issue handoff missing`);
  if (fs.existsSync(handoff)) {
    const body = fs.readFileSync(handoff, 'utf8');
    check(/closes the currently declared acquisition pass/i.test(body), `${packet.estate_id}: handoff boundary missing`);
    check(/graph_effect: none/i.test(body), `${packet.estate_id}: handoff graph boundary missing`);
  }
}

if (errors.length) {
  console.error('validate-estate-closures failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`validate-estate-closures: OK (${packets.length} estates, ${taskIds.size} tasks, ${manifest.counts.route_uses} route uses)`);
