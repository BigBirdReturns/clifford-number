#!/usr/bin/env node
import { buildEstates } from './build-estates.mjs';

try {
  const output = buildEstates({ write: false });
  console.log(`validate-estates: OK (${output.counts.estates} macro estates, ${output.counts.mapped_slices} slices, ${output.counts.mapped_cases} cases, ${output.counts.mapped_tracks} tracks)`);
} catch (error) {
  console.error(`validate-estates failed: ${error.message}`);
  process.exit(1);
}
