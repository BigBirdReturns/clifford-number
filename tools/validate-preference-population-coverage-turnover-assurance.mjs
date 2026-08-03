import { readFileSync } from 'node:fs';
    import { validatePreferencePopulationCoverageTurnoverAssuranceBuild } from './lib/preference-population-coverage-turnover-assurance.mjs';

    const path = process.argv[2] ?? 'build/research/preference-population-coverage-turnover-assurance.json';
    const errors = validatePreferencePopulationCoverageTurnoverAssuranceBuild(JSON.parse(readFileSync(path, 'utf8')));
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exit(1);
    }
    console.log('preference population-coverage turnover assurance validation: PASS');
