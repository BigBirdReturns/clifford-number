import { readFileSync } from 'node:fs';
    import { validatePreferenceCustodyManifestV34Build } from './lib/preference-custody-manifest-v34.mjs';

    const path = process.argv[2] ?? 'build/research/preference-custody-laboratory-floor-v34.json';
    const errors = validatePreferenceCustodyManifestV34Build(JSON.parse(readFileSync(path, 'utf8')));
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exit(1);
    }
    console.log('preference custody v34 validation: PASS');
