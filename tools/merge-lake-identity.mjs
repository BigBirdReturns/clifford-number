#!/usr/bin/env node
// Merges the archived evidence-lake identity registries onto the canonical
// registries (WP4). Registry growth only; see tools/lib/lake-identity-merge.mjs.
//
//   node tools/merge-lake-identity.mjs          write the merge (idempotent)
//   node tools/merge-lake-identity.mjs --plan   print the plan, write nothing
//   --include-legacy-bridged                    also add archive rows main still
//                                               serves through the legacy bridge
//                                               (only with a profile and
//                                               participation; see the library)
//
// The compiler and the validators then consume the grown registries as usual:
//   npm run compile && npm run validate:lake-identity
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';
import {
  MANIFEST_FILE, MAP_FILE, MENTIONS_FILE, REGISTRY_FILES, RESOLUTIONS_FILE,
  applyRegistryPlan, buildManifest, buildMentionRows, buildResolutionRows,
  loadArchive, loadMain, planRegistryMerge, serializeJson, serializeJsonl, syncMapInventory,
} from './lib/lake-identity-merge.mjs';

const planOnly = process.argv.includes('--plan');
const includeLegacyBridged = process.argv.includes('--include-legacy-bridged');
const main = loadMain(root);
const archive = loadArchive(root);
const plan = planRegistryMerge({ main, archive, includeLegacyBridged });
const registries = applyRegistryPlan(main, plan);

const { rows: resolutionRows, pending: pendingResolutions } = buildResolutionRows({ archive, registries, conflicts: plan.conflicts });
const mentionRows = buildMentionRows({ archive, registries, resolutionRows });

const summary = {
  to_add: { actors: plan.add.actors.length, organizations: plan.add.organizations.length, aliases: plan.add.aliases.length },
  main_wins_not_added: plan.conflicts.map(row => `${row.registry}:${row.id} (${row.reason})`),
  shared_rows_that_differ: {
    actors: plan.shared.actors.length, organizations: plan.shared.organizations.length, aliases: plan.shared.aliases.length,
  },
  resolution_rows: resolutionRows.length,
  resolution_rows_pending: pendingResolutions.length,
  unresolved_mention_rows: mentionRows.length,
};
console.log(JSON.stringify(summary, null, 2));
if (planOnly) process.exit(0);

function write(file, text) {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
}

const additions = plan.add.actors.length + plan.add.organizations.length + plan.add.aliases.length;
if (additions) {
  const wrapper = { actors: 'actors', organizations: 'organizations', aliases: 'aliases' };
  for (const [name, key] of Object.entries(wrapper)) {
    if (!plan.add[name].length) continue;
    const current = JSON.parse(fs.readFileSync(path.join(root, REGISTRY_FILES[name]), 'utf8'));
    current[key] = registries[name];
    write(REGISTRY_FILES[name], serializeJson(current));
  }
}

if (additions) {
  const mapText = fs.readFileSync(path.join(root, MAP_FILE), 'utf8');
  write(MAP_FILE, syncMapInventory(mapText, {
    actors: registries.actors.length,
    organizations: registries.organizations.length,
    addedActors: plan.add.actors.length,
    addedOrganizations: plan.add.organizations.length,
  }));
}

write(RESOLUTIONS_FILE, serializeJsonl(resolutionRows));
write(MENTIONS_FILE, serializeJsonl(mentionRows));

// The manifest records what this run added and what the base looked like, so
// it is written once. A re-run after the merge has nothing to add and must not
// erase that record.
const manifestPath = path.join(root, MANIFEST_FILE);
if (additions || !fs.existsSync(manifestPath)) {
  write(MANIFEST_FILE, serializeJson(buildManifest({ main, archive, plan, registries, resolutionRows, pendingResolutions, mentionRows })));
  console.log(`wrote ${MANIFEST_FILE}`);
} else {
  console.log(`${MANIFEST_FILE} kept: nothing left to add`);
}
console.log(`actors ${registries.actors.length}, organizations ${registries.organizations.length}, aliases ${registries.aliases.length}`);
