#!/usr/bin/env node
import { readJson, writeJson } from './lib/ledger.mjs';
import { MAP_SOURCE_PATH, MAP_VIEW_PATH, projectCrawlHealthMap } from './lib/crawl-health-map-projection.mjs';

const view = projectCrawlHealthMap(
  readJson(MAP_SOURCE_PATH), readJson('data/crawl/sources.json'), readJson('data/crawl/state.json'),
);
writeJson(MAP_VIEW_PATH, view);
console.log(`build-cross-corpus-map: ${view.crawl_health_projection.enabled_source_states.length} configured source states; no source mutation`);
