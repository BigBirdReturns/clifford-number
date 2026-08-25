#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import process from 'node:process';
import {
  validateContract,
  validateReceipt
} from './lib/m05-answerable-power-sprint-03-leg-07-intel-post-gate-route-watch.mjs';

const DEFAULT_CONTRACT = 'data/project/m05-answerable-power-sprint-03-leg-07-intel-post-gate-route-watch-contract.json';
const EXPECTED_MONITOR_ROUTE_IDS = [
  'US-INTEL-REALIZATION-01',
  'US-INTEL-REALIZATION-02',
  'US-INTEL-REALIZATION-03',
  'US-INTEL-REALIZATION-04',
  'US-INTEL-REALIZATION-05'
];

function parseArgs(argv) {
  const args = { contract: DEFAULT_CONTRACT, receipt: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (!['--contract', '--receipt'].includes(token)) throw new Error(`Unknown argument: ${token}`);
    const value = argv[index + 1];
    index += 1;
    if (!value || value.startsWith('--')) throw new Error(`${token} requires a value`);
    if (token === '--contract') args.contract = value;
    if (token === '--receipt') args.receipt = value;
  }
  return args;
}

function usage() {
  return 'Usage: node tools/validate-m05-answerable-power-sprint-03-leg-07-intel-post-gate-route-watch.mjs [--contract <path>] [--receipt <path>]\n';
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function gitBlobSha1(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(header).update(bytes).digest('hex');
}

async function validateBindings(contract) {
  const parsed = new Map();
  for (const [name, binding] of Object.entries(contract.canonical_bindings)) {
    const bytes = await fs.readFile(binding.path);
    const actual = gitBlobSha1(bytes);
    assert(actual === binding.blob_sha, `canonical binding ${name} drift: expected ${binding.blob_sha}, found ${actual}`);
    if (binding.path.endsWith('.json')) parsed.set(name, JSON.parse(bytes.toString('utf8')));
  }
  return parsed;
}

function validateDateGateMonitor(contract, parsedBindings) {
  const monitor = parsedBindings.get('intel_date_gate_monitor');
  assert(monitor, 'intel date-gate monitor was not parsed');
  assert(monitor.schema_version === 'm05-answerable-power-s03-l7-intel-realization-date-gate-monitor@1', 'Intel date-gate monitor schema drift');
  assert(monitor.object_class === 'bounded_future_time_gated_monitor', 'Intel date-gate monitor class drift');
  assert(monitor.issue === 345, 'Intel date-gate monitor issue drift');
  assert(monitor.target?.frontier_id === 'M05-IF-VALUE-US-INTEL-REALIZATION', 'Intel frontier identity drift');
  assert(monitor.target?.ordinary_gate_utc === contract.time_gate.ordinary_gate_utc, 'Intel ordinary gate does not match monitor');
  assert(monitor.activation_policy?.scheduled_clock_check === true, 'Intel monitor no longer requires scheduled checking');
  assert(monitor.activation_policy?.scheduled_clock_check_cron_utc === contract.time_gate.scheduled_clock_check_cron_utc, 'Intel monitor schedule drift');
  assert(monitor.activation_policy?.passage_of_time_is_realization === false, 'Intel monitor treats elapsed time as realization');
  assert(monitor.activation_policy?.gate_open_is_sale === false, 'Intel monitor treats gate opening as a sale');
  assert(monitor.activation_policy?.gate_open_is_federal_receipt === false, 'Intel monitor treats gate opening as a federal receipt');
  assert(monitor.activation_policy?.gate_open_is_distribution === false, 'Intel monitor treats gate opening as distribution');
  assert(Array.isArray(monitor.official_routes) && monitor.official_routes.length === 5, 'Intel monitor route denominator drift');
  assert(JSON.stringify(monitor.official_routes.map((row) => row.route_id)) === JSON.stringify(EXPECTED_MONITOR_ROUTE_IDS), 'Intel monitor route identity or order drift');
  assert(JSON.stringify(contract.routes.map((row) => row.monitor_route_id)) === JSON.stringify(EXPECTED_MONITOR_ROUTE_IDS), 'contract does not cover the full monitor route denominator');
  for (let index = 0; index < contract.routes.length; index += 1) {
    const contractRoute = contract.routes[index];
    const monitorRoute = monitor.official_routes[index];
    assert(contractRoute.authority === monitorRoute.authority, `${contractRoute.route_id} authority does not match monitor route ${monitorRoute.route_id}`);
    assert(monitorRoute.qualifying_receipt_found === false, `${monitorRoute.route_id} unexpectedly declares a qualifying receipt`);
  }
  assert(monitor.required_event_chain?.qualifying_realization_receipt === false, 'monitor unexpectedly declares realization');
  assert(monitor.boundaries?.answer_changes_authorized === false, 'monitor authorizes answer changes');
  assert(monitor.boundaries?.promotion_changes_authorized === false, 'monitor authorizes promotion');
  assert(monitor.boundaries?.graph_effect === 'none', 'monitor creates graph effect');
  assert(monitor.boundaries?.issue_345_may_close === false, 'monitor permits issue closure');
}

function validateFiveDomainPreservation(contract, parsedBindings) {
  const existing = parsedBindings.get('five_domain_contract');
  assert(existing, 'five-domain contract was not parsed');
  assert(existing.schema_version === 'm05-answerable-power-s03-l7-five-domain-route-watch-contract@1', 'five-domain contract schema drift');
  assert(existing.denominator?.routes === 20, 'five-domain route denominator drift');
  assert(existing.denominator?.routes_per_lane === 4, 'five-domain lane denominator drift');
  assert(existing.intel_time_gate?.ordinary_gate_utc === contract.time_gate.ordinary_gate_utc, 'five-domain Intel gate drift');
  assert(existing.authority_boundaries?.answer_changes_authorized === false, 'five-domain watcher authorizes answer changes');
  assert(existing.authority_boundaries?.issue_345_may_close === false, 'five-domain watcher permits issue closure');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }
  const contract = await readJson(args.contract);
  validateContract(contract);
  const parsedBindings = await validateBindings(contract);
  validateDateGateMonitor(contract, parsedBindings);
  validateFiveDomainPreservation(contract, parsedBindings);
  if (args.receipt) {
    const receipt = await readJson(args.receipt);
    validateReceipt(receipt, contract);
  }
  process.stdout.write(`m05 Intel post-gate route-watch validation: OK${args.receipt ? ' (contract and receipt)' : ' (contract)'}\n`);
}

main().catch((error) => {
  process.stderr.write(`m05 Intel post-gate route-watch validation failed: ${error?.stack || error}\n`);
  process.exitCode = 1;
});
