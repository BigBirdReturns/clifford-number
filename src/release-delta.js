/** Pure, deterministic diff engine for the atlas release-delta ladder step
 * (docs/atlas-representation-ladder.md, Implementation sequence step 6,
 * "Stable geography" and "Visual encoding" sections).
 *
 * Diffs two build/atlas-projection.json artifacts (see
 * tools/build-atlas-projection.mjs for the exact shape they are built in)
 * and reports only genuine corpus changes: additions, closures, window
 * changes, population changes, evidence-composition upgrades/decay, and
 * hop-eligibility (graph_effect) changes.
 *
 * Stable-geography rule: seededPosition() x/y fields (present on regions
 * and machines) are never read anywhere in this module. A layout rerun
 * must never manufacture a reported change; only identity + substance is
 * diffed (presence, windows, populations, evidence composition,
 * graph_effect, receipt sets).
 *
 * Style-matched to src/ui-utils.js: pure functions, no DOM, no Date.now(),
 * no Math.random(), inputs are read but never mutated. */

// ---- evidence ranking -----------------------------------------------------
//
// Strongest first; lower index = stronger evidence. This exact order is not
// invented here -- it is the order already used across the repo:
//   - tools/build-atlas-projection.mjs EVIDENCE_CLASSES, the enumeration
//     order used to build every evidence_composition.by_class map this
//     module reads.
//   - tools/lib/ledger.mjs evidenceWeight(): official=1, primary_public=1.25,
//     reported=2, derived=3, judgment=4, open=5 (strictly increasing --
//     same relative order).
//   - app.js EVIDENCE_RANK: official/government_record=1, primary_public=2,
//     reported=3, derived=4, judgment=5, open=6 (same relative order; its
//     two extra classes, confirmed/government_record, never appear in
//     atlas-projection.json evidence_composition.by_class, which is fixed
//     to exactly these six EVIDENCE_CLASSES).
const EVIDENCE_ORDER = ['official', 'primary_public', 'reported', 'derived', 'judgment', 'open'];

// Graph-effect dominance priority, most-connected first. Mirrors
// tools/build-atlas-projection.mjs GRAPH_EFFECTS + dominantGraphEffect().
const GRAPH_EFFECT_ORDER = ['hop-eligible', 'context-only', 'scout-only', 'none'];

const OBJECT_TYPE_ORDER = ['region', 'machine', 'surface', 'actor', 'corridor', 'metric'];

const KIND_ORDER = [
  'added',
  'removed',
  'window-changed',
  'population-changed',
  'evidence-upgraded',
  'evidence-decayed',
  'graph-effect-changed',
];

// ---- small deterministic helpers ------------------------------------------

function sortedUnion(a, b) {
  return [...new Set([...a, ...b])].sort();
}

function keyBy(list, idKey) {
  const map = new Map();
  for (const item of list ?? []) map.set(item[idKey], item);
  return map;
}

function idSet(list, idKey) {
  return new Set((list ?? []).map(item => item[idKey]));
}

function evidenceRank(evidenceClass) {
  const i = EVIDENCE_ORDER.indexOf(evidenceClass);
  return i === -1 ? null : i;
}

// Population-weighted average evidence rank over a by_class breakdown.
// Returns null when the breakdown carries no population at all (there is
// nothing to rank), rather than fabricating a rank.
function weightedEvidenceRank(byClass) {
  let population = 0;
  let weighted = 0;
  EVIDENCE_ORDER.forEach((cls, rank) => {
    const count = byClass?.[cls] ?? 0;
    population += count;
    weighted += rank * count;
  });
  return population === 0 ? null : weighted / population;
}

// Human-readable list of which evidence classes moved, e.g. "official 3->2,
// open 0->1". Only classes whose count actually changed are listed.
function classShiftDetail(beforeByClass, afterByClass) {
  const moves = [];
  for (const cls of EVIDENCE_ORDER) {
    const before = beforeByClass?.[cls] ?? 0;
    const after = afterByClass?.[cls] ?? 0;
    if (before !== after) moves.push(`${cls} ${before}->${after}`);
  }
  return moves.join(', ');
}

// Compares two evidence_composition-shaped objects ({population, by_class,
// source_ids}) and returns { kind, detail } if the population-weighted
// evidence strength shifted, or null if it did not (including when both
// sides carry no evidence at all -- that is a non-event, not a decay).
function evidenceCompositionShift(beforeComposition, afterComposition) {
  const beforeRank = beforeComposition ? weightedEvidenceRank(beforeComposition.by_class) : null;
  const afterRank = afterComposition ? weightedEvidenceRank(afterComposition.by_class) : null;
  if (beforeRank === null && afterRank === null) return null;
  const detail = classShiftDetail(beforeComposition?.by_class, afterComposition?.by_class);
  if (beforeRank === null) return { kind: 'evidence-upgraded', detail: detail || 'evidence present where none existed before' };
  if (afterRank === null) return { kind: 'evidence-decayed', detail: detail || 'all evidence lost' };
  if (afterRank < beforeRank) return { kind: 'evidence-upgraded', detail };
  if (afterRank > beforeRank) return { kind: 'evidence-decayed', detail };
  return null;
}

// Compares two single evidence_class strings (corridors carry one class,
// not a composition). Returns null when either side is unranked -- an
// unrecognized class is never guessed at a direction.
function singleEvidenceShift(beforeClass, afterClass) {
  if (beforeClass === afterClass) return null;
  const beforeRank = evidenceRank(beforeClass);
  const afterRank = evidenceRank(afterClass);
  if (beforeRank === null || afterRank === null) return null;
  const detail = `${beforeClass ?? 'none'}->${afterClass ?? 'none'}`;
  if (afterRank < beforeRank) return { kind: 'evidence-upgraded', detail };
  if (afterRank > beforeRank) return { kind: 'evidence-decayed', detail };
  return null;
}

function dominantGraphEffectOf(counts) {
  for (const effect of GRAPH_EFFECT_ORDER) {
    if ((counts?.[effect] ?? 0) > 0) return effect;
  }
  return 'none';
}

function makeChange(kind, objectType, id, label, before, after, detail) {
  return { kind, objectType, id, label: label ?? id, before, after, detail };
}

// ---- per-object-type comparators ------------------------------------------
// Each comparator ignores position/layout entirely (regions and machines
// are the only records that carry a seeded x/y position, and neither
// comparator below reads a `.position` field anywhere).

function summarizeRegionOrMachine(rec) {
  if (!rec) return null;
  return {
    surface_count: rec.surface_count?.count ?? 0,
    denominator: rec.surface_count?.denominator ?? 0,
    participant_population: rec.evidence_composition?.population ?? 0,
    dominant_graph_effect: dominantGraphEffectOf(rec.graph_effect_composition),
  };
}

function compareRegionOrMachine(objectType, id, label, before, after, changes) {
  if (!before) {
    changes.push(makeChange('added', objectType, id, label, null, summarizeRegionOrMachine(after),
      `${objectType} appears in current, absent from baseline`));
    return;
  }
  if (!after) {
    changes.push(makeChange('removed', objectType, id, label, summarizeRegionOrMachine(before), null,
      `${objectType} present in baseline, absent from current`));
    return;
  }

  const beforeSurfaces = before.surface_count?.count ?? 0;
  const afterSurfaces = after.surface_count?.count ?? 0;
  const beforeParticipants = before.evidence_composition?.population ?? 0;
  const afterParticipants = after.evidence_composition?.population ?? 0;
  if (beforeSurfaces !== afterSurfaces || beforeParticipants !== afterParticipants) {
    const parts = [];
    if (beforeSurfaces !== afterSurfaces) parts.push(`surface_count ${beforeSurfaces}->${afterSurfaces} of ${after.surface_count?.denominator ?? 0}`);
    if (beforeParticipants !== afterParticipants) parts.push(`participant population ${beforeParticipants}->${afterParticipants}`);
    changes.push(makeChange('population-changed', objectType, id, label,
      { surface_count: beforeSurfaces, participant_population: beforeParticipants },
      { surface_count: afterSurfaces, participant_population: afterParticipants },
      parts.join('; ')));
  }

  const shift = evidenceCompositionShift(before.evidence_composition, after.evidence_composition);
  if (shift) {
    changes.push(makeChange(shift.kind, objectType, id, label,
      before.evidence_composition?.by_class ?? null, after.evidence_composition?.by_class ?? null, shift.detail));
  }

  const beforeDominant = dominantGraphEffectOf(before.graph_effect_composition);
  const afterDominant = dominantGraphEffectOf(after.graph_effect_composition);
  if (beforeDominant !== afterDominant) {
    changes.push(makeChange('graph-effect-changed', objectType, id, label, beforeDominant, afterDominant,
      `dominant graph_effect ${beforeDominant}->${afterDominant}`));
  }
}

function summarizeSurface(rec) {
  if (!rec) return null;
  return {
    status: rec.status ?? null,
    graph_effect: rec.graph_effect ?? null,
    window: rec.window ?? null,
    distinct_actor_count: rec.distinct_actor_count ?? 0,
    participant_population: rec.evidence_composition?.population ?? 0,
  };
}

function compareSurface(objectType, id, label, before, after, changes) {
  if (!before) {
    changes.push(makeChange('added', objectType, id, label, null, summarizeSurface(after),
      'surface appears in current, absent from baseline'));
    return;
  }
  if (!after) {
    changes.push(makeChange('removed', objectType, id, label, summarizeSurface(before), null,
      'surface present in baseline, absent from current (closure)'));
    return;
  }

  const beforeWindow = before.window ?? {};
  const afterWindow = after.window ?? {};
  if (beforeWindow.time_start !== afterWindow.time_start || beforeWindow.time_end !== afterWindow.time_end) {
    changes.push(makeChange('window-changed', objectType, id, label, beforeWindow, afterWindow,
      `window ${beforeWindow.time_start ?? '?'}..${beforeWindow.time_end ?? '?'} -> ${afterWindow.time_start ?? '?'}..${afterWindow.time_end ?? '?'}`));
  }

  const beforePop = before.evidence_composition?.population ?? 0;
  const afterPop = after.evidence_composition?.population ?? 0;
  const beforeActors = before.distinct_actor_count ?? 0;
  const afterActors = after.distinct_actor_count ?? 0;
  if (beforePop !== afterPop || beforeActors !== afterActors) {
    const parts = [];
    if (beforePop !== afterPop) parts.push(`participant population ${beforePop}->${afterPop}`);
    if (beforeActors !== afterActors) parts.push(`distinct_actor_count ${beforeActors}->${afterActors}`);
    changes.push(makeChange('population-changed', objectType, id, label,
      { participant_population: beforePop, distinct_actor_count: beforeActors },
      { participant_population: afterPop, distinct_actor_count: afterActors },
      parts.join('; ')));
  }

  const shift = evidenceCompositionShift(before.evidence_composition, after.evidence_composition);
  if (shift) {
    changes.push(makeChange(shift.kind, objectType, id, label,
      before.evidence_composition?.by_class ?? null, after.evidence_composition?.by_class ?? null, shift.detail));
  }

  if (before.graph_effect !== after.graph_effect) {
    changes.push(makeChange('graph-effect-changed', objectType, id, label, before.graph_effect ?? null, after.graph_effect ?? null,
      `graph_effect ${before.graph_effect}->${after.graph_effect}`));
  }
}

function summarizeActor(rec) {
  if (!rec) return null;
  return { surface_count: rec.surface_count ?? 0, graph_effect: rec.graph_effect ?? null };
}

// actor_brackets carry no evidence_composition of their own (only
// receipt_ids and a graph_effect_composition derived from the surfaces they
// participate in) -- there is no per-actor evidence breakdown in this
// schema, so evidence-upgraded/evidence-decayed is never emitted for
// actors. This is a documented limitation, not a silent gap: it is never
// invented from graph_effect_composition, which measures hop-eligibility,
// not evidentiary strength.
function compareActor(objectType, id, label, before, after, changes) {
  if (!before) {
    changes.push(makeChange('added', objectType, id, label, null, summarizeActor(after),
      'actor appears in current, absent from baseline'));
    return;
  }
  if (!after) {
    changes.push(makeChange('removed', objectType, id, label, summarizeActor(before), null,
      'actor present in baseline, absent from current'));
    return;
  }

  const beforeCount = before.surface_count ?? 0;
  const afterCount = after.surface_count ?? 0;
  if (beforeCount !== afterCount) {
    changes.push(makeChange('population-changed', objectType, id, label, { surface_count: beforeCount }, { surface_count: afterCount },
      `surface_count ${beforeCount}->${afterCount}`));
  }

  if (before.graph_effect !== after.graph_effect) {
    changes.push(makeChange('graph-effect-changed', objectType, id, label, before.graph_effect ?? null, after.graph_effect ?? null,
      `graph_effect ${before.graph_effect}->${after.graph_effect}`));
  }
}

function summarizeCorridor(rec) {
  if (!rec) return null;
  return {
    chain_length: rec.chain_length ?? 0,
    surface_count: (rec.surface_ids ?? []).length,
    evidence_class: rec.evidence_class ?? null,
    graph_effect: rec.graph_effect ?? null,
  };
}

function compareCorridor(objectType, id, label, before, after, changes) {
  if (!before) {
    changes.push(makeChange('added', objectType, id, label, null, summarizeCorridor(after),
      'corridor appears in current, absent from baseline'));
    return;
  }
  if (!after) {
    changes.push(makeChange('removed', objectType, id, label, summarizeCorridor(before), null,
      'corridor present in baseline, absent from current'));
    return;
  }

  const beforeStages = before.chain_length ?? 0;
  const afterStages = after.chain_length ?? 0;
  const beforeSurfaces = (before.surface_ids ?? []).length;
  const afterSurfaces = (after.surface_ids ?? []).length;
  if (beforeStages !== afterStages || beforeSurfaces !== afterSurfaces) {
    const parts = [];
    if (beforeStages !== afterStages) parts.push(`chain_length ${beforeStages}->${afterStages}`);
    if (beforeSurfaces !== afterSurfaces) parts.push(`stage surfaces ${beforeSurfaces}->${afterSurfaces}`);
    changes.push(makeChange('population-changed', objectType, id, label,
      { chain_length: beforeStages, surface_count: beforeSurfaces },
      { chain_length: afterStages, surface_count: afterSurfaces },
      parts.join('; ')));
  }

  const shift = singleEvidenceShift(before.evidence_class ?? null, after.evidence_class ?? null);
  if (shift) {
    changes.push(makeChange(shift.kind, objectType, id, label, before.evidence_class ?? null, after.evidence_class ?? null, shift.detail));
  }

  // Structural corridors are constitutionally always graph_effect "none"
  // (enforced by tools/build-atlas-projection.mjs); compared generically
  // here anyway so this never silently drifts if that constraint changes.
  if (before.graph_effect !== after.graph_effect) {
    changes.push(makeChange('graph-effect-changed', objectType, id, label, before.graph_effect ?? null, after.graph_effect ?? null,
      `graph_effect ${before.graph_effect}->${after.graph_effect}`));
  }
}

// aggregate_metrics is an object keyed by metric name, not an array, and
// its values come in two shapes: countMetric ({metric, count, denominator,
// source_ids}) for every entry except corpus_evidence_composition, which is
// an evidence_composition shape ({population, by_class, source_ids}).
function summarizeMetricValue(value) {
  if (!value) return null;
  if ('by_class' in value) return { population: value.population ?? 0 };
  return { count: value.count ?? 0, denominator: value.denominator ?? 0 };
}

function compareMetric(id, before, after, changes) {
  const objectType = 'metric';
  const label = after?.metric ?? before?.metric ?? id;
  if (!before) {
    changes.push(makeChange('added', objectType, id, label, null, summarizeMetricValue(after),
      'aggregate metric appears in current, absent from baseline'));
    return;
  }
  if (!after) {
    changes.push(makeChange('removed', objectType, id, label, summarizeMetricValue(before), null,
      'aggregate metric present in baseline, absent from current'));
    return;
  }

  const isComposition = 'by_class' in after || 'by_class' in before;
  if (isComposition) {
    const beforePop = before.population ?? 0;
    const afterPop = after.population ?? 0;
    if (beforePop !== afterPop) {
      changes.push(makeChange('population-changed', objectType, id, label, { population: beforePop }, { population: afterPop },
        `population ${beforePop}->${afterPop}`));
    }
    const shift = evidenceCompositionShift(before, after);
    if (shift) {
      changes.push(makeChange(shift.kind, objectType, id, label, before.by_class ?? null, after.by_class ?? null, shift.detail));
    }
  } else {
    const beforeCount = before.count ?? 0;
    const afterCount = after.count ?? 0;
    const beforeDenominator = before.denominator ?? 0;
    const afterDenominator = after.denominator ?? 0;
    if (beforeCount !== afterCount || beforeDenominator !== afterDenominator) {
      const parts = [];
      if (beforeCount !== afterCount) parts.push(`count ${beforeCount}->${afterCount}`);
      if (beforeDenominator !== afterDenominator) parts.push(`denominator ${beforeDenominator}->${afterDenominator}`);
      changes.push(makeChange('population-changed', objectType, id, label,
        { count: beforeCount, denominator: beforeDenominator }, { count: afterCount, denominator: afterDenominator },
        parts.join('; ')));
    }
  }
}

// ---- collection-level driver -----------------------------------------------

function diffCollection(currentList, baselineList, idKey, labelOf, objectType, comparator, changes) {
  const currentById = keyBy(currentList, idKey);
  const baselineById = keyBy(baselineList, idKey);
  const ids = sortedUnion([...currentById.keys()], [...baselineById.keys()]);
  for (const id of ids) {
    const before = baselineById.get(id);
    const after = currentById.get(id);
    const label = (after && labelOf(after)) ?? (before && labelOf(before)) ?? id;
    comparator(objectType, id, label, before, after, changes);
  }
}

function diffMetrics(currentMetrics, baselineMetrics, changes) {
  const current = currentMetrics ?? {};
  const baseline = baselineMetrics ?? {};
  const keys = sortedUnion(Object.keys(current), Object.keys(baseline));
  for (const key of keys) compareMetric(key, baseline[key], current[key], changes);
}

function compareChanges(a, b) {
  const typeDelta = OBJECT_TYPE_ORDER.indexOf(a.objectType) - OBJECT_TYPE_ORDER.indexOf(b.objectType);
  if (typeDelta !== 0) return typeDelta;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
}

// Total objects compared per objectType (union of ids present in either
// side), used by summarizeDelta() to name an honest denominator without
// re-reading the source artifacts.
function countDenominators(current, baseline) {
  const cur = current ?? {};
  const base = baseline ?? {};
  return {
    region: sortedUnion([...idSet(cur.regions, 'case_id')], [...idSet(base.regions, 'case_id')]).length,
    machine: sortedUnion([...idSet(cur.machines, 'organization_id')], [...idSet(base.machines, 'organization_id')]).length,
    surface: sortedUnion([...idSet(cur.surface_nodes, 'surface_id')], [...idSet(base.surface_nodes, 'surface_id')]).length,
    actor: sortedUnion([...idSet(cur.actor_brackets, 'actor_id')], [...idSet(base.actor_brackets, 'actor_id')]).length,
    corridor: sortedUnion([...idSet(cur.corridors, 'chain_id')], [...idSet(base.corridors, 'chain_id')]).length,
    metric: sortedUnion(Object.keys(cur.aggregate_metrics ?? {}), Object.keys(base.aggregate_metrics ?? {})).length,
  };
}

// ---- public API -------------------------------------------------------------

/**
 * Diff two build/atlas-projection.json artifacts.
 *
 * @param {object} current  The newer projection artifact.
 * @param {object|null|undefined} baseline  The prior release's projection
 *   artifact, or null/undefined if none exists yet.
 * @returns {{baselineAbsent: boolean, generatedFrom: {currentScheme: object|null, baselineScheme: object|null}, denominators: object, changes: Array}}
 *
 * HONESTY: when baseline is null/undefined there is no prior release to
 * diff against. This returns baselineAbsent:true and an empty changes
 * array -- it never fabricates "everything added". The UI decides later
 * what (if anything) to animate on a first release; this function only
 * ever reports true differences.
 */
export function releaseDelta(current, baseline) {
  const currentScheme = current?.scheme ?? null;

  if (baseline === null || baseline === undefined) {
    return {
      baselineAbsent: true,
      generatedFrom: { currentScheme, baselineScheme: null },
      denominators: countDenominators(current, null),
      changes: [],
    };
  }

  const baselineScheme = baseline?.scheme ?? null;
  const changes = [];

  diffCollection(current?.regions, baseline?.regions, 'case_id', r => r.label, 'region', compareRegionOrMachine, changes);
  diffCollection(current?.machines, baseline?.machines, 'organization_id', m => m.label, 'machine', compareRegionOrMachine, changes);
  diffCollection(current?.surface_nodes, baseline?.surface_nodes, 'surface_id', s => s.label, 'surface', compareSurface, changes);
  diffCollection(current?.actor_brackets, baseline?.actor_brackets, 'actor_id', a => a.label, 'actor', compareActor, changes);
  diffCollection(current?.corridors, baseline?.corridors, 'chain_id', c => c.label, 'corridor', compareCorridor, changes);
  diffMetrics(current?.aggregate_metrics, baseline?.aggregate_metrics, changes);

  changes.sort(compareChanges);

  return {
    baselineAbsent: false,
    generatedFrom: { currentScheme, baselineScheme },
    denominators: countDenominators(current, baseline),
    changes,
  };
}

/**
 * Honest aggregate counts over a releaseDelta() result, suitable for a
 * release-strip display. Every count names its denominator (the total
 * number of objects of that objectType that were actually compared, from
 * delta.denominators -- never recomputed by guessing).
 *
 * @param {ReturnType<typeof releaseDelta>} delta
 */
export function summarizeDelta(delta) {
  const denominators = delta?.denominators ?? {};
  const totalObjectsCompared = OBJECT_TYPE_ORDER.reduce((sum, ot) => sum + (denominators[ot] ?? 0), 0);

  const byKind = {};
  for (const kind of KIND_ORDER) byKind[kind] = { count: 0, denominator: totalObjectsCompared };

  const byObjectType = {};
  for (const ot of OBJECT_TYPE_ORDER) {
    byObjectType[ot] = {
      denominator: denominators[ot] ?? 0,
      total: 0,
      byKind: Object.fromEntries(KIND_ORDER.map(k => [k, 0])),
    };
  }

  for (const change of delta?.changes ?? []) {
    if (byKind[change.kind]) byKind[change.kind].count += 1;
    const bucket = byObjectType[change.objectType];
    if (bucket) {
      bucket.total += 1;
      if (bucket.byKind[change.kind] !== undefined) bucket.byKind[change.kind] += 1;
    }
  }

  return {
    baselineAbsent: Boolean(delta?.baselineAbsent),
    totalChanges: delta?.changes?.length ?? 0,
    totalObjectsCompared,
    byKind,
    byObjectType,
  };
}
