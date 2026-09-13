/** Pure, browser-safe route projections over the compiled hop graph
 * (`build/hop-graph.json`). No DOM, no Node built-ins; its only import is
 * the canonical evidence ranking (`src/evidence-rank.js`), so it can be
 * loaded straight into the browser and unit-tested with plain `node:test`.
 *
 * CONSTITUTIONAL CONSTRAINT (BUILD-INSTRUCTIONS.md Section 1 /
 * docs/atlas-representation-ladder.md "Route (tactical)"): the minimum-hop
 * route is the Clifford Number and is canonical. Every other projection here
 * is explicitly secondary, never changes a hop count, never invents a hop,
 * and never mutates its input. `shortestRoute` alone gets `kind: 'clifford'`;
 * everything else gets `kind: 'secondary'` and a `projection` label.
 *
 * All functions read a parsed `build/hop-graph.json` object (`hopGraph`,
 * called `hops` in the public signatures to match the design doc): an object
 * with an `edges` array (each `{ actor_a, actor_b, surfaces: [...] }`, where
 * a `surfaces` entry — a "basis" — is one bounded surface supporting that
 * actor pair's hop) and a `rejected_hop_pairs` array (disjoint-window
 * rejections, recorded by the compiler instead of a hop). Field names below
 * (`actor_a_role`, `evidence_class`, `temporal_status`, `valid_from`, ...)
 * are the exact keys the compiler (tools/lib/hops.mjs) writes; nothing here
 * invents a field the compiler does not already produce.
 *
 * Determinism: every traversal is a plain BFS over a graph built fresh from
 * the input on each call, with an explicit lexicographic tie-break (see
 * `bfsLexicalShortestPath`). No Date.now, no Math.random, no reliance on
 * object/array iteration order of the input.
 */

// ---------------------------------------------------------------------------
// Evidence ranking — the canonical shared ordering (src/evidence-rank.js):
// lower number = stronger evidence; aliases (confirmed, government_record,
// context) resolve to their canonical class; unknown classes rank weakest.
import { evidenceRank } from './evidence-rank.js';

// "Official/confirmed government record" (per the design doc) is the
// canonical rank-0 tier: official plus its aliases (confirmed,
// government_record). Only 'official' is present in the current ledger; the
// rank test keeps officialOnlyRoute correct if an aliased basis is ever
// ingested.
function isOfficialTier(evidenceClass) {
  return evidenceRank(evidenceClass) === 0;
}

// ---------------------------------------------------------------------------
// Temporal widening — ported verbatim in behavior from tools/lib/temporal.mjs
// (periodStart/periodEnd/intersect/overlapsPeriod). That file has no Node
// dependency itself, but this module stays import-free by design, so the
// handful of pure functions it needs are duplicated here rather than
// imported from tools/.

const YEAR_RE = /^\d{4}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function lastDayOfMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseTemporalValue(value) {
  const v = String(value).trim();
  let precision;
  if (YEAR_RE.test(v)) precision = 'year';
  else if (MONTH_RE.test(v)) precision = 'month';
  else if (DAY_RE.test(v)) precision = 'day';
  else throw new Error(`unparseable temporal value: ${JSON.stringify(value)}`);

  const [year, month, day] = v.split('-').map(Number);
  if (year === 0) throw new Error(`unparseable temporal value: ${JSON.stringify(value)} (year 0000 is invalid)`);
  if (precision !== 'year' && (month < 1 || month > 12)) {
    throw new Error(`unparseable temporal value: ${JSON.stringify(value)} (month must be 01..12)`);
  }
  if (precision === 'day') {
    const maxDay = lastDayOfMonth(year, month);
    if (day < 1 || day > maxDay) {
      throw new Error(`unparseable temporal value: ${JSON.stringify(value)} (day must be 01..${String(maxDay).padStart(2, '0')})`);
    }
  }
  return { v, precision, year, month, day };
}

function periodStart(value) {
  if (value === null || value === undefined || value === '') return null;
  const { v, precision } = parseTemporalValue(value);
  if (precision === 'year') return `${v}-01-01`;
  if (precision === 'month') return `${v}-01`;
  return v;
}

function periodEnd(value) {
  if (value === null || value === undefined || value === '') return null;
  const { v, precision, year, month } = parseTemporalValue(value);
  if (precision === 'year') return `${v}-12-31`;
  if (precision === 'month') return `${v}-${String(lastDayOfMonth(year, month)).padStart(2, '0')}`;
  return v;
}

// Null treated as -inf / +inf, same as tools/lib/temporal.mjs#intersect.
function intersects(a, b) {
  const from = a.valid_from === null ? b.valid_from
    : b.valid_from === null ? a.valid_from
    : (a.valid_from > b.valid_from ? a.valid_from : b.valid_from);
  const until = a.valid_until === null ? b.valid_until
    : b.valid_until === null ? a.valid_until
    : (a.valid_until < b.valid_until ? a.valid_until : b.valid_until);
  return !(from !== null && until !== null && from > until);
}

// Does a basis window overlap the query period ("2020", "2020-03",
// "2020-03-14")? The period is widened to its full extent first, exactly as
// the compiler's --as-of does.
function overlapsPeriod(basis, period) {
  const window = { valid_from: basis.valid_from ?? null, valid_until: basis.valid_until ?? null };
  const q = { valid_from: periodStart(period), valid_until: periodEnd(period) };
  if (q.valid_from === null && q.valid_until === null) return true;
  return intersects(window, q);
}

// ---------------------------------------------------------------------------
// Small pure helpers shared by every projection.

function pairKey(a, b) {
  return [a, b].sort().join('||');
}

function indexEdgesByPair(edges) {
  const byPair = new Map();
  for (const edge of edges) byPair.set(pairKey(edge.actor_a, edge.actor_b), edge);
  return byPair;
}

// Surface labels are always present on accepted-hop bases (edges[].surfaces
// entries), but never on a rejected_hop_pairs record. When the same
// surface_id produced an accepted hop for a *different* actor pair, its
// label is recoverable from there; blockedSegments uses this index rather
// than inventing a label for a surface it cannot see a label for.
function buildSurfaceLabelIndex(edges) {
  const index = new Map();
  for (const edge of edges) {
    for (const basis of edge.surfaces ?? []) {
      if (basis.surface_label !== undefined && !index.has(basis.surface_id)) {
        index.set(basis.surface_id, basis.surface_label);
      }
    }
  }
  return index;
}

/** Build an undirected adjacency map from a set of edges, keeping only edges
 * that have at least one basis passing `basisFilter`. Neighbor lists are
 * sorted ascending so downstream BFS tie-breaks are deterministic. */
function buildAdjacency(edges, basisFilter) {
  const adjacency = new Map();
  const add = (a, b) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    adjacency.get(a).push(b);
  };
  for (const edge of edges) {
    const bases = (edge.surfaces ?? []).filter(basisFilter);
    if (!bases.length) continue;
    add(edge.actor_a, edge.actor_b);
    add(edge.actor_b, edge.actor_a);
  }
  for (const neighbors of adjacency.values()) neighbors.sort();
  return adjacency;
}

/** Lexicographically-smallest shortest path in an unweighted undirected
 * graph: BFS distances-to-target computed once, then a greedy forward walk
 * from `fromId` always choosing the smallest-id neighbor that stays on a
 * shortest path. This is the standard technique for a deterministic minimal
 * path (distinct from plain FIFO BFS, which does not by itself guarantee
 * the lexicographically smallest path under ties). Returns an array of
 * actor ids, or null if unreachable. */
function bfsLexicalShortestPath(adjacency, fromId, toId) {
  if (fromId === toId) return [fromId];
  const distanceToTarget = new Map([[toId, 0]]);
  const queue = [toId];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!distanceToTarget.has(neighbor)) {
        distanceToTarget.set(neighbor, distanceToTarget.get(current) + 1);
        queue.push(neighbor);
      }
    }
  }
  if (!distanceToTarget.has(fromId)) return null;

  const path = [fromId];
  let current = fromId;
  while (current !== toId) {
    const candidates = (adjacency.get(current) ?? [])
      .filter(n => distanceToTarget.has(n) && distanceToTarget.get(n) === distanceToTarget.get(current) - 1)
      .sort();
    current = candidates[0];
    path.push(current);
  }
  return path;
}

/** Reduce a basis to the shape a route step (or an allBases entry) exposes.
 * `pathFrom` is the actor id this step travels *from*, used only to decide
 * which of the basis's actor_a_role/actor_b_role is "roles.a" — the basis
 * itself is never mutated. */
function projectBasis(basis, edge, pathFrom) {
  const fromIsActorA = edge.actor_a === pathFrom;
  return {
    surfaceId: basis.surface_id,
    surfaceLabel: basis.surface_label ?? null,
    evidenceClass: basis.evidence_class,
    receiptIds: [...(basis.receipt_ids ?? [])],
    window: {
      validFrom: basis.valid_from ?? null,
      validUntil: basis.valid_until ?? null,
      dated: basis.temporal_status !== 'undated',
    },
    temporalPrecision: basis.temporal_status,
    supportsTimeSlice: basis.temporal_status === 'dated',
    roles: {
      a: (fromIsActorA ? basis.actor_a_role : basis.actor_b_role) ?? null,
      b: (fromIsActorA ? basis.actor_b_role : basis.actor_a_role) ?? null,
    },
  };
}

/** Pick every basis on `edge` that passes `basisFilter`, sorted strongest
 * evidence first (surface_id as a deterministic secondary key). Returns
 * null when nothing on the edge qualifies. */
function qualifyingBases(edge, basisFilter) {
  const bases = (edge.surfaces ?? []).filter(basisFilter);
  if (!bases.length) return null;
  return [...bases].sort((a, b) => {
    const byRank = evidenceRank(a.evidence_class) - evidenceRank(b.evidence_class);
    return byRank !== 0 ? byRank : String(a.surface_id).localeCompare(String(b.surface_id));
  });
}

/** Build one route step for the hop `pathFrom -> pathTo`, restricted to
 * bases passing `basisFilter`. The strongest qualifying basis is flattened
 * onto the step; every qualifying basis (strongest first) is kept in
 * `allBases`. Returns null if no basis on this edge qualifies (should not
 * happen for an edge the adjacency graph already filtered the same way). */
function buildStep(edge, pathFrom, pathTo, basisFilter) {
  const sorted = qualifyingBases(edge, basisFilter);
  if (!sorted) return null;
  const allBases = sorted.map(basis => projectBasis(basis, edge, pathFrom));
  const [primary, ...rest] = allBases;
  return { actorA: pathFrom, actorB: pathTo, ...primary, allBases: [primary, ...rest] };
}

/** Run a plain minimum-hop, lexicographically tie-broken traversal over
 * `edges`, keeping only bases that pass `basisFilter`. Shared by
 * shortestRoute / bestDatedRoute / officialOnlyRoute / asOfRoute — they
 * differ only in `basisFilter`. */
function traverse(edges, fromId, toId, basisFilter) {
  const byPair = indexEdgesByPair(edges);
  const adjacency = buildAdjacency(edges, basisFilter);
  const path = bfsLexicalShortestPath(adjacency, fromId, toId);
  if (!path) return null;
  const steps = [];
  for (let i = 0; i < path.length - 1; i++) {
    const edge = byPair.get(pairKey(path[i], path[i + 1]));
    const step = buildStep(edge, path[i], path[i + 1], basisFilter);
    if (!step) return null; // defensive: adjacency and steps must agree
    steps.push(step);
  }
  return { hopCount: path.length - 1, steps };
}

function edgesOf(hops) {
  return hops?.edges ?? [];
}

// ---------------------------------------------------------------------------
// Exports

/** The canonical minimum-hop route — the Clifford Number itself. Ties among
 * equally-short paths are broken by taking the lexicographically smallest
 * actor path. Returns `{ kind: 'clifford', canonical: true, hopCount,
 * steps }`, or null if the two actors do not connect. */
export function shortestRoute(hops, fromId, toId) {
  const result = traverse(edgesOf(hops), fromId, toId, () => true);
  if (!result) return null;
  return { kind: 'clifford', canonical: true, hopCount: result.hopCount, steps: result.steps };
}

/** Secondary projection: the route that maximizes the *weakest* evidence
 * class along the path (a maximin / "widest path" search), which may use
 * more hops than the Clifford Number. Never redefines hop counts — this is
 * a different path through the same graph, not a reinterpretation of any
 * single hop. Determinism: among paths achieving the best possible floor,
 * the fewest-hop, lexicographically smallest path wins. */
export function strongestEvidenceRoute(hops, fromId, toId) {
  const edges = edgesOf(hops);
  if (fromId === toId) {
    return { kind: 'secondary', canonical: false, projection: 'strongest-evidence', hopCount: 0, steps: [] };
  }

  const edgeBestRank = new Map();
  for (const edge of edges) {
    const bases = edge.surfaces ?? [];
    if (!bases.length) continue;
    let best = Infinity;
    for (const basis of bases) best = Math.min(best, evidenceRank(basis.evidence_class));
    edgeBestRank.set(pairKey(edge.actor_a, edge.actor_b), best);
  }

  // Try thresholds strongest-first: the first threshold at which fromId and
  // toId become connected is the maximin floor (standard max-bottleneck-path
  // argument — no path can exist using only strictly stronger edges, or a
  // smaller threshold would already have connected them).
  const thresholds = [...new Set(edgeBestRank.values())].sort((a, b) => a - b);
  for (const threshold of thresholds) {
    const allowedEdges = edges.filter(edge => (edgeBestRank.get(pairKey(edge.actor_a, edge.actor_b)) ?? Infinity) <= threshold);
    const result = traverse(allowedEdges, fromId, toId, () => true);
    if (result) {
      return { kind: 'secondary', canonical: false, projection: 'strongest-evidence', hopCount: result.hopCount, steps: result.steps };
    }
  }
  return null;
}

/** Secondary projection: minimum-hop route restricted to fully dated bases
 * (temporal_status === 'dated') — the same shortest-path search as
 * shortestRoute, over a graph that never uses a partially- or undated
 * basis. */
export function bestDatedRoute(hops, fromId, toId) {
  const result = traverse(edgesOf(hops), fromId, toId, basis => basis.temporal_status === 'dated');
  if (!result) return null;
  return { kind: 'secondary', canonical: false, projection: 'best-dated', hopCount: result.hopCount, steps: result.steps };
}

/** Secondary projection: minimum-hop route restricted to bases whose
 * evidence class is the official/confirmed-government-record tier
 * (isOfficialTier — canonical rank 0). Never downgrades to a weaker basis when no
 * official-only path exists — returns null instead. */
export function officialOnlyRoute(hops, fromId, toId) {
  const result = traverse(edgesOf(hops), fromId, toId, basis => isOfficialTier(basis.evidence_class));
  if (!result) return null;
  return { kind: 'secondary', canonical: false, projection: 'official-only', hopCount: result.hopCount, steps: result.steps };
}

/** Secondary projection: minimum-hop route restricted to fully dated bases
 * whose window intersects `period` ("YYYY" | "YYYY-MM" | "YYYY-MM-DD"),
 * widened to the full period exactly as the compiler's --as-of does. An
 * undated or partially-dated basis never supports a time slice, even though
 * it remains part of the all-time topology used by shortestRoute. */
export function asOfRoute(hops, fromId, toId, period) {
  const result = traverse(
    edgesOf(hops), fromId, toId,
    basis => basis.temporal_status === 'dated' && overlapsPeriod(basis, period)
  );
  if (!result) return null;
  return { kind: 'secondary', canonical: false, projection: 'as-of', period, hopCount: result.hopCount, steps: result.steps };
}

/** The rejected hop pairs relevant to `fromId` (and `toId`, if given): two
 * participation intervals that approached a shared surface and did not
 * overlap, so the compiler recorded no hop (rejected_hop_pairs). When
 * `toId` is given, only the pair directly between those two actors is
 * returned (oriented actorA === fromId); otherwise every rejected pair
 * touching `fromId` is returned, in ledger order. */
export function blockedSegments(hops, fromId, toId) {
  const rejected = hops?.rejected_hop_pairs ?? [];
  const labelIndex = buildSurfaceLabelIndex(edgesOf(hops));
  const hasTarget = toId !== undefined && toId !== null;

  const relevant = rejected.filter(pair => (
    hasTarget
      ? (pair.actor_a === fromId && pair.actor_b === toId) || (pair.actor_a === toId && pair.actor_b === fromId)
      : pair.actor_a === fromId || pair.actor_b === fromId
  ));

  return relevant.map(pair => {
    const fromIsActorA = hasTarget ? pair.actor_a === fromId : true;
    const [aId, aWindow, bId, bWindow] = fromIsActorA
      ? [pair.actor_a, pair.actor_a_window, pair.actor_b, pair.actor_b_window]
      : [pair.actor_b, pair.actor_b_window, pair.actor_a, pair.actor_a_window];
    return {
      surfaceId: pair.surface_id,
      surfaceLabel: labelIndex.get(pair.surface_id) ?? null,
      actorA: { id: aId, window: toBlockedWindow(aWindow) },
      actorB: { id: bId, window: toBlockedWindow(bWindow) },
      reason: pair.reason,
    };
  });
}

function toBlockedWindow(window) {
  return {
    validFrom: window?.valid_from ?? null,
    validUntil: window?.valid_until ?? null,
    dated: Boolean(window?.dated),
  };
}

/** Convenience: every projection above, keyed by projection name, with the
 * canonical route always first and flagged `canonical: true`. `options.asOf`
 * (a period string), if given, additionally includes the as-of projection
 * for that period. */
export function routeProjections(hops, fromId, toId, options = {}) {
  const clifford = shortestRoute(hops, fromId, toId);
  const result = {
    clifford,
    strongestEvidence: strongestEvidenceRoute(hops, fromId, toId),
    bestDated: bestDatedRoute(hops, fromId, toId),
    officialOnly: officialOnlyRoute(hops, fromId, toId),
  };
  if (options.asOf) {
    result.asOf = asOfRoute(hops, fromId, toId, options.asOf);
  }
  result.blocked = blockedSegments(hops, fromId, toId);
  return result;
}
