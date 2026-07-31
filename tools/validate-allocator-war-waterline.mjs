import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const paths = {
  findings: 'data/project/allocator-war-findings-waterline.json',
  lake: 'data/project/allocator-war-lake-intake.json',
  routing: 'data/project/allocator-war-estate-feed-registry.json',
  manifest: 'data/project/allocator-war-waterline-release-manifest.json',
  wave: 'data/research/status-sovereignty-wave-01.json',
  review: 'data/research/status-sovereignty-wave-01-maintainer-review.json',
  acquisition: 'data/research/status-sovereignty-wave-01-targeted-acquisition.json',
  alignment: 'data/project/estate-thesis-alignment.json',
  stories: 'data/project/m05-answerable-power-story-registry.json'
};

const readJson = (relativePath, rootDir = root) =>
  JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function unique(values) {
  return new Set(values).size === values.length;
}

function collectKeyValues(value, key, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeyValues(item, key, out);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [entryKey, entryValue] of Object.entries(value)) {
      if (entryKey === key) out.push(entryValue);
      collectKeyValues(entryValue, key, out);
    }
  }
  return out;
}

function exactSet(actual, expected, message) {
  const left = [...new Set(actual)].sort();
  const right = [...new Set(expected)].sort();
  assert(JSON.stringify(left) === JSON.stringify(right), `${message}: expected ${right.join(', ')}, saw ${left.join(', ')}`);
}

export function loadDocuments(rootDir = root) {
  return Object.fromEntries(
    Object.entries(paths).map(([key, relativePath]) => [key, readJson(relativePath, rootDir)])
  );
}

export function validateDocuments(documents, { rootDir = root, verifyManifest = true } = {}) {
  const {
    findings,
    lake,
    routing,
    manifest,
    wave,
    review,
    acquisition,
    alignment,
    stories
  } = documents;

  assert(findings.schema_version === 'allocator-war-findings-waterline@1', 'unexpected findings schema');
  assert(findings.waterline_id === 'AW-WL-01', 'unexpected waterline id');
  assert(findings.authority_tier === 'AT-2-derived-routing', 'unexpected findings authority tier');
  assert(findings.graph_effect === 'none', 'findings graph effect must be none');
  assert(findings.publication_status === 'blocked', 'findings publication must remain blocked');

  assert(lake.schema_version === 'allocator-war-lake-intake@1', 'unexpected lake intake schema');
  assert(lake.intake_id === 'AW-LAKE-01', 'unexpected lake intake id');
  assert(lake.waterline_id === findings.waterline_id, 'lake waterline id drifted');
  assert(lake.status === 'source_ready_pending_canonical_lake_projection', 'lake status drifted');
  assert(lake.graph_effect === 'none', 'lake graph effect must be none');

  assert(routing.schema_version === 'allocator-war-estate-feed-registry@1', 'unexpected routing schema');
  assert(routing.registry_id === 'AW-ROUTE-01', 'unexpected routing id');
  assert(routing.waterline_id === findings.waterline_id, 'routing waterline id drifted');
  assert(routing.graph_effect === 'none', 'routing graph effect must be none');

  assert(wave.hypothesis_id === 'SSC-H01' && wave.wave_id === 'SSC-W01', 'unexpected SSC parent wave');
  assert(review.review_id === 'SSC-W01-MR01', 'unexpected SSC maintainer review');
  assert(acquisition.acquisition_id === 'SSC-W01-TA01', 'unexpected SSC targeted acquisition');

  const observations = wave.observations ?? [];
  const observationIds = observations.map((row) => row.observation_id);
  assert(observations.length === 14, `expected 14 SSC observations, saw ${observations.length}`);
  assert(unique(observationIds), 'duplicate SSC observation id');
  exactSet(findings.observation_denominator, observationIds, 'findings observation denominator drifted');

  const reviewedIds = (review.reviewed_observations ?? []).map((row) => row.observation_id);
  exactSet(reviewedIds, observationIds, 'maintainer review denominator drifted');
  assert(review.counts?.maintainer_reviewed === 14, 'maintainer-reviewed count drifted');
  assert(review.counts?.second_party_reviewed === 0, 'second-party count must remain zero');
  assert(review.counts?.adjudicated === 0, 'adjudication count must remain zero');

  const expectedCounts = {
    source_records: wave.counts?.source_records,
    retained_observations: wave.counts?.observations,
    maintainer_reviewed_observations: review.counts?.maintainer_reviewed,
    second_party_reviewed_observations: review.counts?.second_party_reviewed,
    adjudicated_observations: review.counts?.adjudicated,
    partial_functional_convergence: review.counts?.partial_functional_convergence,
    effective_counterpower_controls: review.counts?.effective_counterpower_controls,
    ordinary_industrial_policy_controls: review.counts?.ordinary_industrial_policy_controls,
    requires_additional_acquisition: review.counts?.requires_additional_acquisition,
    capital_conversion_unsupported: review.counts?.capital_conversion_unsupported,
    supported_complete_compact: review.counts?.supported_bounded_compact,
    racial_order_findings: review.counts?.racial_order_findings,
    prevalence_findings: review.counts?.prevalence_findings,
    coordination_findings: review.counts?.coordination_findings,
    common_purpose_findings: review.counts?.common_purpose_findings,
    personal_hostility_findings: review.counts?.personal_hostility_findings,
    graph_effects: review.counts?.graph_effects,
    publication_clearances: review.counts?.publication_clearances
  };
  for (const [key, expected] of Object.entries(expectedCounts)) {
    assert(findings.counts?.[key] === expected, `${key} drifted: expected ${expected}, saw ${findings.counts?.[key]}`);
  }

  assert(acquisition.counts?.obligations === 3, 'targeted-acquisition obligation count drifted');
  assert(acquisition.counts?.partially_repaired_open === 3, 'all three acquisition obligations must remain partially repaired and open');
  assert(acquisition.counts?.closed === 0, 'targeted-acquisition obligations cannot be silently closed');

  const findingClasses = findings.finding_classes ?? [];
  assert(findingClasses.length === 6, `expected 6 finding classes, saw ${findingClasses.length}`);
  const findingIds = findingClasses.map((row) => row.finding_id);
  assert(unique(findingIds), 'duplicate allocator-war finding id');

  const assignedObservationIds = findingClasses.flatMap((row) => row.observation_ids ?? []);
  assert(assignedObservationIds.length === observationIds.length, 'each SSC observation must be assigned exactly once');
  assert(unique(assignedObservationIds), 'one SSC observation is assigned to more than one finding class');
  exactSet(assignedObservationIds, observationIds, 'finding-class denominator drifted');

  const dispositionByObservation = new Map(observations.map((row) => [row.observation_id, row.disposition]));
  const expectedClassDispositions = {
    'AW-F01': 'partial_functional_convergence',
    'AW-F02': 'partial_functional_convergence',
    'AW-C01': 'ordinary_patriotic_or_industrial_policy',
    'AW-C02': 'ordinary_patriotic_or_industrial_policy',
    'AW-O01': 'requires_additional_acquisition',
    'AW-R01': 'capital_conversion_unsupported'
  };
  for (const findingClass of findingClasses) {
    const expectedDisposition = expectedClassDispositions[findingClass.finding_id];
    assert(expectedDisposition, `${findingClass.finding_id}: unexpected finding class`);
    for (const observationId of findingClass.observation_ids) {
      assert(
        dispositionByObservation.get(observationId) === expectedDisposition,
        `${findingClass.finding_id}: ${observationId} must retain ${expectedDisposition}`
      );
    }
  }

  assert(findings.counts.supported_complete_compact === 0, 'complete compact finding cannot be promoted');
  for (const key of [
    'racial_order_findings',
    'prevalence_findings',
    'coordination_findings',
    'common_purpose_findings',
    'personal_hostility_findings',
    'graph_effects',
    'publication_clearances'
  ]) {
    assert(findings.counts[key] === 0, `${key} must remain zero`);
  }

  assert(lake.source_lineage?.hypothesis_id === 'SSC-H01', 'lake hypothesis lineage drifted');
  exactSet(lake.source_lineage?.observation_ids ?? [], observationIds, 'lake observation lineage drifted');
  exactSet(
    lake.source_lineage?.source_paths ?? [],
    findings.parent_custody?.paths ?? [],
    'lake source-path lineage drifted'
  );

  const lakeSourcePaths = (lake.source_objects ?? []).map((row) => row.path);
  exactSet(
    lakeSourcePaths,
    [
      'data/project/allocator-war-findings-waterline.json',
      'data/project/allocator-war-estate-feed-registry.json'
    ],
    'lake source object denominator drifted'
  );

  const estateIds = new Set((alignment.estates ?? []).map((row) => row.estate_id));
  const storyIds = new Set((stories.stories ?? []).map((row) => row.story_id));
  const allowedPrograms = new Set([
    'K0-epistemic-admissibility',
    'DCA-H01',
    'M-05-Answerable-Power',
    'POOF-Clifford-ecology',
    'counter-selector-v1',
    'core-thesis-C1-C7'
  ]);

  const routes = routing.consumer_routes ?? [];
  assert(routes.length === 14, `expected 14 consumer routes, saw ${routes.length}`);
  assert(unique(routes.map((row) => row.consumer_id)), 'duplicate consumer route id');
  assert(routing.counts?.consumer_routes === routes.length, 'consumer-route count drifted');
  assert(routing.counts?.estate_routes === routes.filter((row) => row.consumer_type === 'estate').length, 'estate-route count drifted');
  assert(routing.counts?.program_routes === routes.filter((row) => row.consumer_type === 'program').length, 'program-route count drifted');

  const validFindingIds = new Set([
    ...findingIds,
    ...(findings.cross_class_findings ?? []).map((row) => row.finding_id)
  ]);
  const routedObservationIds = new Set();
  for (const route of routes) {
    assert(route.consumer_id && route.consumer_key && route.consumer_type, 'incomplete consumer route');
    assert(route.source_observation_ids?.length, `${route.consumer_id}: observation routes required`);
    assert(route.source_finding_ids?.length, `${route.consumer_id}: finding routes required`);
    for (const observationId of route.source_observation_ids) {
      assert(observationIds.includes(observationId), `${route.consumer_id}: unknown observation ${observationId}`);
      routedObservationIds.add(observationId);
    }
    for (const findingId of route.source_finding_ids) {
      assert(validFindingIds.has(findingId), `${route.consumer_id}: unknown finding ${findingId}`);
    }
    if (route.consumer_type === 'estate') {
      assert(estateIds.has(route.consumer_key), `${route.consumer_id}: unknown estate ${route.consumer_key}`);
    } else if (route.consumer_type === 'program') {
      assert(allowedPrograms.has(route.consumer_key), `${route.consumer_id}: unknown program ${route.consumer_key}`);
    } else {
      throw new Error(`${route.consumer_id}: unsupported consumer type ${route.consumer_type}`);
    }
    for (const storyId of route.story_routes ?? []) {
      assert(storyIds.has(storyId), `${route.consumer_id}: unknown M-05 story ${storyId}`);
    }
  }
  exactSet([...routedObservationIds], observationIds, 'routing must cover all SSC observations');

  for (const document of [findings, lake, routing]) {
    for (const effect of collectKeyValues(document, 'graph_effect')) {
      assert(effect === 'none', `graph effect inflation detected: ${effect}`);
    }
  }

  for (const [key, value] of Object.entries(findings.boundaries ?? {})) {
    if (key === 'graph_effect') {
      assert(value === 'none', 'findings boundary graph effect must be none');
    } else {
      assert(value === false, `findings boundary ${key} must remain false`);
    }
  }
  for (const [key, value] of Object.entries(routing.boundaries ?? {})) {
    if (key === 'graph_effect') {
      assert(value === 'none', 'routing boundary graph effect must be none');
    } else {
      assert(value === false, `routing boundary ${key} must remain false`);
    }
  }

  if (verifyManifest) {
    assert(manifest.schema_version === 'allocator-war-waterline-release-manifest@1', 'unexpected release manifest schema');
    assert(manifest.waterline_id === findings.waterline_id, 'manifest waterline id drifted');
    assert(manifest.graph_effect === 'none', 'manifest graph effect must be none');
    assert(manifest.publication_status === 'blocked', 'manifest publication must remain blocked');
    const entries = manifest.files ?? [];
    assert(entries.length >= 8, 'release manifest file denominator is unexpectedly small');
    assert(unique(entries.map((row) => row.path)), 'duplicate release-manifest path');
    for (const entry of entries) {
      const absolutePath = path.join(rootDir, entry.path);
      assert(fs.existsSync(absolutePath), `manifest path missing: ${entry.path}`);
      const bytes = fs.readFileSync(absolutePath);
      assert(bytes.length === entry.bytes, `${entry.path}: byte count drifted`);
      assert(sha256(bytes) === entry.sha256, `${entry.path}: sha256 drifted`);
    }
    const combinedBytes = Buffer.from(
      entries.map((entry) => `${entry.path}\t${entry.bytes}\t${entry.sha256}`).join('\n') + '\n',
      'utf8'
    );
    assert(sha256(combinedBytes) === manifest.combined_sha256, 'release manifest combined sha256 drifted');
  }

  return {
    waterline_id: findings.waterline_id,
    observations: observationIds.length,
    finding_classes: findingClasses.length,
    consumer_routes: routes.length,
    estate_routes: routes.filter((row) => row.consumer_type === 'estate').length,
    program_routes: routes.filter((row) => row.consumer_type === 'program').length,
    graph_effect: 'none',
    publication_status: 'blocked'
  };
}

export function validateAllocatorWarWaterline(rootDir = root) {
  return validateDocuments(loadDocuments(rootDir), { rootDir, verifyManifest: true });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateAllocatorWarWaterline();
  console.log(JSON.stringify(result, null, 2));
}
