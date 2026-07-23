#!/usr/bin/env node
import { buildEstateGameTrails } from './build-estate-game-trails.mjs';
try {
  const built = buildEstateGameTrails({ write: false });
  const counts = built.manifest.counts;
  console.log(`validate-estate-game-trails: OK (${counts.total_compiled_trails} trails across ${counts.estates} estates; ${counts.legacy_trail_estate_evaluations} legacy evaluations)`);
} catch (error) {
  console.error(`validate-estate-game-trails failed: ${error.message}`);
  process.exit(1);
}
