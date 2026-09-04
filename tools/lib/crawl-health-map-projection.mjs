import { createHash } from 'node:crypto';

export const MAP_SOURCE_PATH = 'data/research/clifford-cross-corpus-public-interest-map.json';
export const MAP_VIEW_PATH = 'build/cross-corpus-map/current.json';
const STATUS_TEXT = {
  ok: 'The recorded scan completed; this does not establish exhaustive coverage.',
  partial: 'Only part of the scan completed; missing coverage is not a negative result.',
  error: 'The scan failed; unavailable coverage is not evidence of absence.',
  not_run: 'No scan is recorded; this is not a zero-result search.',
  skipped_missing_credential: 'Acquisition did not run; this is not a zero result.',
};
const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const requireValue = (value, message) => {
  if (!value) throw new Error(`crawl-health projection: ${message}`);
};

// Project availability only. No observation, identity, claim, or graph is admitted.
// The editorial source is immutable input; validation never repairs a stale view.
export function projectCrawlHealthMap(sourceMap, crawlSources, crawlState) {
  requireValue(Array.isArray(sourceMap?.lanes), 'source map lanes are required');
  requireValue(Array.isArray(crawlSources?.sources), 'configured sources are required');
  requireValue(crawlState?.sources && typeof crawlState.sources === 'object'
    && !Array.isArray(crawlState.sources), 'recorded source state is required');
  requireValue(sourceMap.crawl_health_snapshot?.current_projection_path === MAP_VIEW_PATH,
    'editorial snapshot must identify its current projection');
  const selected = sourceMap.lanes.filter(lane => lane.lane_id === 'official-research-fanout');
  requireValue(selected.length === 1 && selected[0].counts, 'exactly one fanout lane is required');
  const identifiers = new Set();
  const enabled = [];
  for (const source of crawlSources.sources) {
    requireValue(typeof source.id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(source.id),
      'invalid configured source identifier');
    requireValue(!identifiers.has(source.id), `duplicate configured source ${source.id}`);
    identifiers.add(source.id);
    requireValue(source.enabled === undefined || typeof source.enabled === 'boolean',
      `invalid enabled flag for ${source.id}`);
    if (!source.enabled) continue;
    const state = crawlState.sources[source.id];
    requireValue(state === undefined || (state && typeof state === 'object' && !Array.isArray(state)),
      'invalid source state record');
    const status = state?.status ?? 'not_run';
    requireValue(typeof status === 'string' && Object.hasOwn(STATUS_TEXT, status), `unsupported status for ${source.id}`);
    for (const key of ['last_run_at', 'last_successful_at']) {
      requireValue(state?.[key] == null || (typeof state[key] === 'string'
        && Number.isFinite(Date.parse(state[key]))), `invalid ${key} for ${source.id}`);
    }
    enabled.push({
      source_id: source.id,
      status,
      last_run_at: state?.last_run_at ?? null,
      last_successful_at: state?.last_successful_at ?? null,
    });
  }
  enabled.sort((a, b) => a.source_id < b.source_id ? -1 : a.source_id > b.source_id ? 1 : 0);
  const gaps = enabled.filter(source => source.status !== 'ok');
  const projected = structuredClone(sourceMap);
  const lane = projected.lanes.find(row => row.lane_id === 'official-research-fanout');
  lane.counts.crawl_source_gaps = gaps.length;
  lane.crawl_source_gap_states = gaps.map(({ source_id, status }) => ({
    source_id, status, interpretation: STATUS_TEXT[status],
  }));
  lane.crawl_source_health_statement = `The current committed crawl records ${gaps.length} source gap(s)`
    + (gaps.length ? `: ${gaps.map(row => `${row.source_id} (${row.status})`).join(', ')}.` : '.')
    + ' These are availability states, not zero responsive records or evidence of absence.';
  projected.crawl_health_projection = {
    schema_version: 'crawl-health-map-projection@1',
    authority: 'committed_source_availability_only',
    graph_effect: 'none',
    conclusion_generated: false,
    editorial_snapshot_date: sourceMap.generated_at,
    inputs: {
      editorial_map: { path: MAP_SOURCE_PATH, json_sha256: fingerprint(sourceMap) },
      source_configuration: { path: 'data/crawl/sources.json', json_sha256: fingerprint(crawlSources) },
      recorded_state: { path: 'data/crawl/state.json', json_sha256: fingerprint(crawlState) },
    },
    enabled_source_states: enabled,
  };
  return projected;
}
