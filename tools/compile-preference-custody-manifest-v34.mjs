import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
    import { dirname, join } from 'node:path';
    import { tmpdir } from 'node:os';
    import { spawnSync } from 'node:child_process';
    import { compilePreferencePopulationCoverageTurnoverAssuranceFixture } from './lib/preference-population-coverage-turnover-assurance.mjs';
    import { compilePreferenceCustodyManifestV34, renderPreferenceCustodyManifestV34Markdown } from './lib/preference-custody-manifest-v34.mjs';

    const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v34.json';
    const jsonPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v34.json';
    const markdownPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor-v34.md';
    const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
    const directory = mkdtempSync(join(tmpdir(), 'preference-v34-base-'));
    const baseJson = join(directory, 'v33.json');
    const baseMarkdown = join(directory, 'v33.md');
    const result = spawnSync(process.execPath, ['tools/compile-preference-custody-manifest-v33.mjs', 'data/research/preference-custody/control-manifest-v33.json', baseJson, baseMarkdown], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'v33 compilation failed');
    const baseBuild = readJson(baseJson);
    const coverageBuild = compilePreferencePopulationCoverageTurnoverAssuranceFixture(readJson('data/research/preference-custody/population-coverage-turnover-assurance.fixture.json'));
    const compiled = compilePreferenceCustodyManifestV34(readJson(manifestPath), baseBuild, coverageBuild);
    mkdirSync(dirname(jsonPath), { recursive: true });
    mkdirSync(dirname(markdownPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(compiled, null, 2)}
`);
    writeFileSync(markdownPath, renderPreferenceCustodyManifestV34Markdown(compiled));
    console.log(`compiled ${compiled.manifest_id} -> ${jsonPath}, ${markdownPath}`);
